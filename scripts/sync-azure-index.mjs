import { constants as fsConstants } from 'node:fs';
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = path.resolve(scriptDir, '..');
const catalogRelativePath = path.join('public', 'index-catalog.json');

export const EXIT_CODES = Object.freeze({
  SUCCESS: 0,
  MISSING_METADATA: 10,
  DOWNLOAD_FAILED: 11,
  INVALID_JSON: 12,
  PUBLISH_FAILED: 13,
});

export const MANAGED_SOURCE_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'server',
    envVar: 'SERVER_INDEX_SYNC_URL',
    targetPath: '/server/index.json',
    catalogEntryId: 'server-packages',
    catalog: Object.freeze({
      title: 'HagiCode Server Packages',
      description: '镜像发布 HagiCode Server 的 index.json 稳定入口。',
      category: 'packages',
      sourceRepo: 'repos/hagicode-core',
      status: 'published',
      sourceUrl: 'https://github.com/HagiCode-org/site/tree/main/repos/hagicode-core',
    }),
  }),
  Object.freeze({
    id: 'desktop',
    envVar: 'DESKTOP_INDEX_SYNC_URL',
    targetPath: '/desktop/index.json',
    catalogEntryId: 'desktop-packages',
    catalog: Object.freeze({
      title: 'HagiCode Desktop Packages',
      description: '镜像发布 HagiCode Desktop 的 index.json 稳定入口。',
      category: 'packages',
      sourceRepo: 'repos/hagicode-desktop',
      status: 'published',
      sourceUrl: 'https://github.com/HagiCode-org/site/tree/main/repos/hagicode-desktop',
    }),
  }),
]);

const managedEntryIds = new Set(MANAGED_SOURCE_REGISTRY.map((source) => source.catalogEntryId));
const headFallbackStatusCodes = new Set([400, 403, 405, 501]);

class SyncError extends Error {
  constructor(exitCode, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'SyncError';
    this.exitCode = exitCode;
    this.details = options.details ?? null;
  }
}

const defaultFileOps = {
  mkdtemp,
  mkdir,
  writeFile,
  rename,
  rm,
};

function stableStringify(value) {
  return JSON.stringify(value);
}

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function createLogger(logger = console) {
  return {
    info(message) {
      logger.log(message);
    },
    warn(message) {
      if (typeof logger.warn === 'function') {
        logger.warn(message);
        return;
      }

      logger.log(message);
    },
    error(message) {
      if (typeof logger.error === 'function') {
        logger.error(message);
        return;
      }

      logger.log(message);
    },
  };
}

async function exists(targetPath) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveSourceRegistry(env) {
  return MANAGED_SOURCE_REGISTRY.map((source) => {
    const remoteUrl = env[source.envVar];

    if (!remoteUrl) {
      throw new SyncError(
        EXIT_CODES.MISSING_METADATA,
        `Missing required environment variable ${source.envVar} for managed source "${source.id}".`,
      );
    }

    const requiredCatalogFields = ['title', 'description', 'category', 'sourceRepo', 'status'];

    for (const field of requiredCatalogFields) {
      if (typeof source.catalog[field] !== 'string' || source.catalog[field].trim().length === 0) {
        throw new SyncError(
          EXIT_CODES.MISSING_METADATA,
          `Managed source "${source.id}" is missing catalog field "${field}".`,
        );
      }
    }

    return {
      ...source,
      remoteUrl,
      relativeTargetFile: path.join('public', source.targetPath.replace(/^\//, '')),
    };
  });
}

function normalizeJsonContent(raw, sourceId) {
  try {
    return stableStringify(JSON.parse(raw));
  } catch (error) {
    throw new SyncError(
      EXIT_CODES.INVALID_JSON,
      `Received invalid JSON for managed source "${sourceId}".`,
      { cause: error },
    );
  }
}

async function readCatalog(projectRoot) {
  const raw = await readFile(path.join(projectRoot, 'public', 'index-catalog.json'), 'utf8');

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      throw new Error('Catalog entries must be an array.');
    }

    return {
      catalog: parsed,
      raw: stableStringify(parsed),
    };
  } catch (error) {
    throw new SyncError(EXIT_CODES.INVALID_JSON, 'The managed catalog file is not valid JSON.', {
      cause: error,
    });
  }
}

async function loadLocalAsset(projectRoot, relativeTargetFile) {
  const targetFile = path.join(projectRoot, relativeTargetFile);
  const present = await exists(targetFile);

  if (!present) {
    return {
      targetFile,
      exists: false,
      raw: null,
      normalized: null,
    };
  }

  const raw = await readFile(targetFile, 'utf8');

  return {
    targetFile,
    exists: true,
    raw,
    normalized: normalizeJsonContent(raw, relativeTargetFile),
  };
}

async function probeRemoteMetadata(source, fetchImpl, logger) {
  try {
    const response = await fetchImpl(source.remoteUrl, {
      method: 'HEAD',
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (headFallbackStatusCodes.has(response.status)) {
        logger.warn(
          `[warn] ${source.id}: HEAD probe returned ${response.status}, falling back to full download.`,
        );

        return {
          lastModified: null,
          etag: null,
          usedHeadFallback: true,
        };
      }

      throw new SyncError(
        EXIT_CODES.DOWNLOAD_FAILED,
        `HEAD probe failed for managed source "${source.id}" with status ${response.status}.`,
      );
    }

    return {
      lastModified: toIsoTimestamp(response.headers.get('last-modified')),
      etag: response.headers.get('etag'),
      usedHeadFallback: false,
    };
  } catch (error) {
    if (error instanceof SyncError) {
      throw error;
    }

    logger.warn(`[warn] ${source.id}: HEAD probe failed, falling back to full download.`);

    return {
      lastModified: null,
      etag: null,
      usedHeadFallback: true,
    };
  }
}

async function downloadRemoteIndex(source, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(source.remoteUrl, {
      headers: {
        accept: 'application/json',
      },
    });
  } catch (error) {
    throw new SyncError(
      EXIT_CODES.DOWNLOAD_FAILED,
      `Failed to download managed source "${source.id}".`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new SyncError(
      EXIT_CODES.DOWNLOAD_FAILED,
      `Managed source "${source.id}" download failed with status ${response.status}.`,
    );
  }

  const raw = await response.text();
  const normalized = normalizeJsonContent(raw, source.id);

  return {
    raw,
    normalized,
    lastModified: toIsoTimestamp(response.headers.get('last-modified')),
    etag: response.headers.get('etag'),
  };
}

function buildManagedCatalogEntry(source, existingEntry, lastUpdated) {
  return {
    ...existingEntry,
    id: source.catalogEntryId,
    title: source.catalog.title,
    description: source.catalog.description,
    path: source.targetPath,
    category: source.catalog.category,
    sourceRepo: source.catalog.sourceRepo,
    lastUpdated,
    status: source.catalog.status,
    ...(source.catalog.sourceUrl ? { sourceUrl: source.catalog.sourceUrl } : {}),
  };
}

function upsertManagedEntries(entries, managedEntries) {
  const nextEntries = [];
  const appendedIds = new Set();

  for (const entry of entries) {
    if (!managedEntryIds.has(entry.id)) {
      nextEntries.push(entry);
      continue;
    }

    const replacement = managedEntries.get(entry.id);

    if (!replacement) {
      nextEntries.push(entry);
      continue;
    }

    nextEntries.push(replacement);
    appendedIds.add(entry.id);
  }

  for (const source of MANAGED_SOURCE_REGISTRY) {
    if (appendedIds.has(source.catalogEntryId)) {
      continue;
    }

    const replacement = managedEntries.get(source.catalogEntryId);

    if (replacement) {
      nextEntries.push(replacement);
      appendedIds.add(source.catalogEntryId);
    }
  }

  return nextEntries;
}

export async function publishManagedFiles(projectRoot, stagedFiles, fileOps = defaultFileOps) {
  if (stagedFiles.length === 0) {
    return;
  }

  const transactionRoot = await fileOps.mkdtemp(path.join(os.tmpdir(), 'index-sync-'));
  const stagedDir = path.join(transactionRoot, 'stage');
  const backupDir = path.join(transactionRoot, 'backup');
  const rollbackQueue = [];

  try {
    for (const file of stagedFiles) {
      const stagePath = path.join(stagedDir, file.relativePath);
      await fileOps.mkdir(path.dirname(stagePath), { recursive: true });
      await fileOps.writeFile(stagePath, file.content, 'utf8');
      file.stagePath = stagePath;
    }

    // Keep backups until every promotion succeeds, then remove the transaction directory.
    for (const file of stagedFiles) {
      const destinationPath = path.join(projectRoot, file.relativePath);
      const backupPath = path.join(backupDir, file.relativePath);
      const destinationExists = await exists(destinationPath);

      await fileOps.mkdir(path.dirname(destinationPath), { recursive: true });

      if (destinationExists) {
        await fileOps.mkdir(path.dirname(backupPath), { recursive: true });
        await fileOps.rename(destinationPath, backupPath);
      }

      rollbackQueue.push({
        destinationPath,
        backupPath,
        destinationExists,
      });

      await fileOps.rename(file.stagePath, destinationPath);
    }
  } catch (error) {
    for (const rollback of rollbackQueue.reverse()) {
      const destinationExists = await exists(rollback.destinationPath);
      const backupExists = await exists(rollback.backupPath);

      if (destinationExists) {
        await fileOps.rm(rollback.destinationPath, { force: true });
      }

      if (rollback.destinationExists && backupExists) {
        await fileOps.mkdir(path.dirname(rollback.destinationPath), { recursive: true });
        await fileOps.rename(rollback.backupPath, rollback.destinationPath);
      }
    }

    throw new SyncError(EXIT_CODES.PUBLISH_FAILED, 'Atomic publish failed and was rolled back.', {
      cause: error,
    });
  } finally {
    await fileOps.rm(transactionRoot, { recursive: true, force: true });
  }
}

export async function syncManagedIndexes(options = {}) {
  const projectRoot = options.projectRoot ?? defaultProjectRoot;
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? new Date();
  const logger = createLogger(options.logger);

  if (typeof fetchImpl !== 'function') {
    throw new SyncError(EXIT_CODES.MISSING_METADATA, 'A fetch implementation is required.');
  }

  const sources = resolveSourceRegistry(env);
  const { catalog, raw: catalogRaw } = await readCatalog(projectRoot);
  const managedEntries = new Map(
    catalog.entries
      .filter((entry) => managedEntryIds.has(entry.id))
      .map((entry) => [entry.id, entry]),
  );

  const plannedFiles = [];
  const nextManagedEntries = new Map();
  const changedSources = [];
  const unchangedSources = [];

  for (const source of sources) {
    const currentEntry = managedEntries.get(source.catalogEntryId);
    const localAsset = await loadLocalAsset(projectRoot, source.relativeTargetFile);
    const probe = await probeRemoteMetadata(source, fetchImpl, logger);

    if (probe.lastModified && currentEntry?.lastUpdated === probe.lastModified && localAsset.exists) {
      logger.info(`[skip] ${source.id}: metadata unchanged at ${probe.lastModified}.`);
      nextManagedEntries.set(
        source.catalogEntryId,
        buildManagedCatalogEntry(source, currentEntry, currentEntry.lastUpdated),
      );
      unchangedSources.push(source.id);
      continue;
    }

    const remote = await downloadRemoteIndex(source, fetchImpl);
    const snapshotTime = probe.lastModified ?? remote.lastModified ?? now.toISOString();
    const contentChanged = !localAsset.exists || localAsset.normalized !== remote.normalized;
    const metadataChanged = currentEntry?.lastUpdated !== snapshotTime;
    const nextEntry = buildManagedCatalogEntry(source, currentEntry, snapshotTime);

    nextManagedEntries.set(source.catalogEntryId, nextEntry);

    if (contentChanged) {
      plannedFiles.push({
        relativePath: source.relativeTargetFile,
        content: remote.normalized,
      });
    }

    if (contentChanged || metadataChanged || !currentEntry) {
      changedSources.push(source.id);
      logger.info(
        `[sync] ${source.id}: queued update (${contentChanged ? 'content' : 'metadata-only'} change).`,
      );
      continue;
    }

    unchangedSources.push(source.id);
    logger.info(`[skip] ${source.id}: downloaded snapshot matches local mirror.`);
  }

  for (const source of sources) {
    if (!nextManagedEntries.has(source.catalogEntryId)) {
      const currentEntry = managedEntries.get(source.catalogEntryId);
      const fallbackUpdatedAt = currentEntry?.lastUpdated ?? now.toISOString();
      nextManagedEntries.set(
        source.catalogEntryId,
        buildManagedCatalogEntry(source, currentEntry, fallbackUpdatedAt),
      );
    }
  }

  const nextCatalog = {
    ...catalog,
    generatedAt: changedSources.length > 0 ? now.toISOString() : catalog.generatedAt,
    entries: upsertManagedEntries(catalog.entries, nextManagedEntries),
  };
  const nextCatalogRaw = stableStringify(nextCatalog);

  if (nextCatalogRaw !== catalogRaw) {
    plannedFiles.push({
      relativePath: catalogRelativePath,
      content: nextCatalogRaw,
    });
  }

  if (plannedFiles.length === 0) {
    logger.info('[done] No managed index changes detected.');

    return {
      code: EXIT_CODES.SUCCESS,
      outcome: 'no-change',
      changedSources,
      unchangedSources,
      wroteFiles: [],
    };
  }

  await publishManagedFiles(projectRoot, plannedFiles, options.fileOps);

  logger.info(`[done] Published managed index updates for: ${changedSources.join(', ')}.`);

  return {
    code: EXIT_CODES.SUCCESS,
    outcome: 'changed',
    changedSources,
    unchangedSources,
    wroteFiles: plannedFiles.map((file) => file.relativePath),
  };
}

export async function runCli() {
  try {
    const result = await syncManagedIndexes();
    process.exitCode = result.code;
  } catch (error) {
    if (error instanceof SyncError) {
      console.error(`[error] ${error.message}`);
      process.exitCode = error.exitCode;
      return;
    }

    console.error('[error] Unexpected sync failure.');
    console.error(error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
