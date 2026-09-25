import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual, promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { MANAGED_SOURCE_REGISTRY } from './sync-r2-index.mjs';

const git = promisify(execFile);
const defaultProjectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = 'src/data/public';
const catalogPath = `${sourceRoot}/index-catalog.json`;
const managedEntryIds = new Set(MANAGED_SOURCE_REGISTRY.map((source) => source.catalogEntryId));
const indexPaths = MANAGED_SOURCE_REGISTRY.map(
  (source) => `${sourceRoot}${source.targetPath}`,
);
const managedPaths = [...indexPaths, catalogPath];

function parseJson(raw, location) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${location}.`, { cause: error });
  }
}

function withoutField(value, field) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const { [field]: ignored, ...rest } = value;
  return rest;
}

function comparable(value, relativePath) {
  if (relativePath !== catalogPath) {
    return withoutField(value, 'updatedAt');
  }

  const catalog = withoutField(value, 'generatedAt');
  if (catalog === null || typeof catalog !== 'object' || Array.isArray(catalog) || !Array.isArray(catalog.entries)) {
    return catalog;
  }

  return {
    ...catalog,
    entries: catalog.entries.map((entry) =>
      entry !== null && typeof entry === 'object' && managedEntryIds.has(entry.id)
        ? withoutField(entry, 'lastUpdated')
        : entry),
  };
}

async function readPrior(projectRoot, relativePath) {
  const { stdout: listed } = await git('git', ['ls-tree', '--name-only', 'HEAD', '--', relativePath], {
    cwd: projectRoot,
  });
  if (!listed) {
    return undefined;
  }

  const { stdout } = await git('git', ['show', `HEAD:${relativePath}`], {
    cwd: projectRoot,
    maxBuffer: 64 * 1024 * 1024,
  });
  return parseJson(stdout, `HEAD:${relativePath}`);
}

export async function hasSubstantiveManagedDiff(projectRoot = defaultProjectRoot) {
  let changed = false;

  for (const relativePath of managedPaths) {
    const current = parseJson(
      await readFile(path.join(projectRoot, relativePath), 'utf8'),
      relativePath,
    );
    const prior = await readPrior(projectRoot, relativePath);
    if (prior === undefined) {
      changed = true;
    } else if (!isDeepStrictEqual(comparable(current, relativePath), comparable(prior, relativePath))) {
      changed = true;
    }
  }

  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(`changed=${await hasSubstantiveManagedDiff()}`);
  } catch (error) {
    console.error('[error] Failed to compare managed JSON snapshots:', error);
    process.exitCode = 1;
  }
}
