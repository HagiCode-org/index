import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredFields = [
  'id',
  'title',
  'description',
  'path',
  'category',
  'sourceRepo',
  'lastUpdated',
  'status',
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const publicRoot = path.join(projectRoot, 'public');
const catalogFile = path.join(publicRoot, 'index-catalog.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolvePublicPath(sitePath) {
  return path.join(publicRoot, sitePath.replace(/^\//, ''));
}

const raw = await readFile(catalogFile, 'utf8');
const catalog = JSON.parse(raw);

assert(typeof catalog.version === 'string' && catalog.version.length > 0, 'Catalog version is required.');
assert(typeof catalog.generatedAt === 'string' && catalog.generatedAt.length > 0, 'Catalog generatedAt is required.');
assert(Array.isArray(catalog.entries), 'Catalog entries must be an array.');

for (const [index, entry] of catalog.entries.entries()) {
  assert(entry && typeof entry === 'object', `Entry ${index} must be an object.`);

  for (const field of requiredFields) {
    assert(typeof entry[field] === 'string' && entry[field].trim().length > 0, `Entry ${index} is missing field ${field}.`);
  }

  assert(entry.path.startsWith('/'), `Entry ${entry.id} path must start with /.`);
  assert(entry.path.endsWith('.json'), `Entry ${entry.id} path must point to a JSON asset.`);

  await access(resolvePublicPath(entry.path));
  JSON.parse(await readFile(resolvePublicPath(entry.path), 'utf8'));

  if (entry.readmePath) {
    assert(typeof entry.readmePath === 'string', `Entry ${entry.id} readmePath must be a string.`);
    await access(resolvePublicPath(entry.readmePath));
  }
}

console.log(`Validated ${catalog.entries.length} catalog entries.`);
