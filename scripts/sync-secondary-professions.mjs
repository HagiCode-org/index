import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = path.resolve(scriptDir, '..');
const defaultSourceFile = path.join(defaultProjectRoot, 'src', 'data', 'secondary-professions.catalog.json');
const defaultPublishedFile = path.join(defaultProjectRoot, 'public', 'secondary-professions', 'index.json');
const defaultCatalogFile = path.join(defaultProjectRoot, 'public', 'index-catalog.json');
const defaultBackendFallbackFile = path.resolve(defaultProjectRoot, '..', 'hagicode-core', 'src', 'PCode.Web', 'Assets', 'secondary-professions.index.json');
const publishedPath = '/secondary-professions/index.json';
const catalogEntryId = 'secondary-professions';

const catalogEntryTemplate = Object.freeze({
  id: catalogEntryId,
  title: 'Secondary Profession Catalog',
  description: '镜像发布系统默认副职业目录的稳定 JSON 入口。',
  path: publishedPath,
  category: 'catalogs',
  sourceRepo: 'repos/index',
  status: 'published',
  sourceUrl: 'https://github.com/HagiCode-org/site/tree/main/repos/index/public/secondary-professions',
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeString(value, fieldName, { optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) {
      return null;
    }

    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  assert(typeof value === 'string', `${fieldName} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (optional) {
      return null;
    }

    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return trimmed;
}

function normalizeStringArray(value, fieldName) {
  if (value == null) {
    return [];
  }

  assert(Array.isArray(value), `${fieldName} must be an array.`);
  const normalized = value.map((entry, index) => normalizeString(entry, `${fieldName}[${index}]`));
  assert(new Set(normalized).size === normalized.length, `${fieldName} entries must be unique.`);
  return normalized;
}

function normalizeDefaultParameters(value, fieldName) {
  if (value == null) {
    return {};
  }

  assert(value && typeof value === 'object' && !Array.isArray(value), `${fieldName} must be an object.`);
  const normalized = {};
  for (const [key, itemValue] of Object.entries(value)) {
    const normalizedKey = normalizeString(key, `${fieldName} key`);
    if (itemValue == null) {
      normalized[normalizedKey] = null;
      continue;
    }

    assert(typeof itemValue === 'string', `${fieldName}.${normalizedKey} must be a string or null.`);
    normalized[normalizedKey] = itemValue.trim();
  }

  return normalized;
}

function normalizeFieldConstraints(value, fieldName) {
  if (value == null) {
    return [];
  }

  assert(Array.isArray(value), `${fieldName} must be an array.`);
  const keys = new Set();
  return value.map((item, index) => {
    assert(item && typeof item === 'object' && !Array.isArray(item), `${fieldName}[${index}] must be an object.`);
    const key = normalizeString(item.key, `${fieldName}[${index}].key`);
    assert(!keys.has(key.toLowerCase()), `${fieldName}[${index}].key must be unique.`);
    keys.add(key.toLowerCase());
    return {
      key,
      isRequired: Boolean(item.isRequired),
      isReadOnly: Boolean(item.isReadOnly),
      description: normalizeString(item.description, `${fieldName}[${index}].description`, { optional: true }),
    };
  });
}

function normalizeItem(item, index) {
  assert(item && typeof item === 'object' && !Array.isArray(item), `items[${index}] must be an object.`);
  const compatiblePrimaryFamilies = normalizeStringArray(item.compatiblePrimaryFamilies, `items[${index}].compatiblePrimaryFamilies`);
  const primaryProfessionId = normalizeString(item.primaryProfessionId, `items[${index}].primaryProfessionId`, { optional: true });

  assert(primaryProfessionId || compatiblePrimaryFamilies.length > 0, `items[${index}] must declare primaryProfessionId or compatiblePrimaryFamilies.`);
  assert(Number.isInteger(item.sortOrder), `items[${index}].sortOrder must be an integer.`);
  assert(typeof item.supportsImage === 'boolean', `items[${index}].supportsImage must be a boolean.`);

  return {
    id: normalizeString(item.id, `items[${index}].id`),
    name: normalizeString(item.name, `items[${index}].name`),
    family: normalizeString(item.family, `items[${index}].family`),
    primaryProfessionId,
    summary: normalizeString(item.summary, `items[${index}].summary`, { optional: true }),
    icon: normalizeString(item.icon, `items[${index}].icon`, { optional: true }),
    sourceLabel: normalizeString(item.sourceLabel, `items[${index}].sourceLabel`),
    sortOrder: item.sortOrder,
    supportsImage: item.supportsImage,
    compatiblePrimaryFamilies,
    defaultParameters: normalizeDefaultParameters(item.defaultParameters, `items[${index}].defaultParameters`),
    fieldConstraints: normalizeFieldConstraints(item.fieldConstraints, `items[${index}].fieldConstraints`),
  };
}

function normalizeSourceCatalog(data) {
  assert(data && typeof data === 'object' && !Array.isArray(data), 'Secondary profession source catalog must be an object.');
  const version = normalizeString(data.version, 'version');
  const publishedAt = normalizeString(data.publishedAt, 'publishedAt');
  assert(Number.isFinite(Date.parse(publishedAt)), 'publishedAt must be an ISO-8601 timestamp.');
  assert(Array.isArray(data.items), 'items must be an array.');

  const items = data.items.map((item, index) => normalizeItem(item, index));
  const ids = new Set();
  for (const item of items) {
    const normalizedId = item.id.toLowerCase();
    assert(!ids.has(normalizedId), `Duplicate secondary profession id '${item.id}'.`);
    ids.add(normalizedId);
  }

  return {
    version,
    publishedAt: new Date(publishedAt).toISOString(),
    title: normalizeString(data.title, 'title', { optional: true }) ?? 'Secondary Profession Catalog',
    description: normalizeString(data.description, 'description', { optional: true }) ?? 'Stable secondary profession catalog.',
    items,
  };
}

function upsertCatalogEntry(catalog, publishedCatalog) {
  assert(catalog && typeof catalog === 'object' && Array.isArray(catalog.entries), 'index-catalog.json must expose an entries array.');
  const nextEntry = {
    ...catalogEntryTemplate,
    lastUpdated: publishedCatalog.publishedAt,
  };
  const entries = [...catalog.entries];
  const existingIndex = entries.findIndex((entry) => entry?.id === catalogEntryId);
  if (existingIndex >= 0) {
    entries[existingIndex] = {
      ...entries[existingIndex],
      ...nextEntry,
    };
  } else {
    entries.push(nextEntry);
  }

  return {
    ...catalog,
    entries,
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function ensureMatches(filePath, expectedContent, label) {
  const actualContent = await readFile(filePath, 'utf8');
  assert(actualContent === expectedContent, `${label} is out of sync: ${filePath}`);
}

export async function syncSecondaryProfessions({
  sourceFile = defaultSourceFile,
  publishedFile = defaultPublishedFile,
  catalogFile = defaultCatalogFile,
  backendFallbackFile = defaultBackendFallbackFile,
  check = false,
} = {}) {
  const sourceCatalog = normalizeSourceCatalog(await readJson(sourceFile));
  const publishedContent = stableJson(sourceCatalog);
  const catalog = upsertCatalogEntry(await readJson(catalogFile), sourceCatalog);
  const catalogContent = stableJson(catalog);

  if (check) {
    await ensureMatches(publishedFile, publishedContent, 'Published secondary profession catalog');
    await ensureMatches(backendFallbackFile, publishedContent, 'Bundled secondary profession fallback snapshot');
    await ensureMatches(catalogFile, catalogContent, 'Index catalog');
    return {
      outcome: 'checked',
      version: sourceCatalog.version,
      publishedAt: sourceCatalog.publishedAt,
      itemCount: sourceCatalog.items.length,
    };
  }

  await mkdir(path.dirname(publishedFile), { recursive: true });
  await mkdir(path.dirname(backendFallbackFile), { recursive: true });
  await writeFile(publishedFile, publishedContent, 'utf8');
  await writeFile(backendFallbackFile, publishedContent, 'utf8');
  await writeFile(catalogFile, catalogContent, 'utf8');

  return {
    outcome: 'synced',
    version: sourceCatalog.version,
    publishedAt: sourceCatalog.publishedAt,
    itemCount: sourceCatalog.items.length,
  };
}

async function main() {
  const check = process.argv.includes('--check');
  const result = await syncSecondaryProfessions({ check });
  process.stdout.write(`${check ? 'Verified' : 'Synced'} secondary profession catalog (${result.itemCount} items, version ${result.version}).\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
