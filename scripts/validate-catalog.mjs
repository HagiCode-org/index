import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadActivityMetrics } from './update-activity-metrics.mjs';

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

const expectedHistoryPaths = new Map([
  ['server-packages', '/server/history/'],
  ['desktop-packages', '/desktop/history/'],
]);
const activityEntryId = 'activity-metrics';
const agentTemplatesEntryId = 'agent-templates';

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

function resolvePagePath(sitePath) {
  const normalizedPath = sitePath.replace(/^\//, '').replace(/\/$/, '');
  return path.join(projectRoot, 'src', 'pages', `${normalizedPath}.astro`);
}

function validateActivitySummary(value, fieldName) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${fieldName} must be an object.`);
  assert(
    Number.isInteger(value.activeUsers) && value.activeUsers >= 0,
    `${fieldName}.activeUsers must be a non-negative integer.`,
  );
  assert(
    Number.isInteger(value.activeSessions) && value.activeSessions >= 0,
    `${fieldName}.activeSessions must be a non-negative integer.`,
  );
  assert(
    typeof value.dateRange === 'string' && value.dateRange.trim().length > 0,
    `${fieldName}.dateRange must be a non-empty string.`,
  );

  return {
    activeUsers: value.activeUsers,
    activeSessions: value.activeSessions,
    dateRange: value.dateRange,
  };
}

function validateAgentTemplateTagGroups(value, fieldName) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${fieldName} must be an object.`);

  for (const key of ['languages', 'domains', 'roles']) {
    const entries = value[key];
    assert(Array.isArray(entries), `${fieldName}.${key} must be an array.`);
    assert(entries.every((entry) => typeof entry === 'string'), `${fieldName}.${key} entries must be strings.`);
  }
}

async function validateAgentTemplateManifest(entry) {
  assert(entry.path === '/agent-templates/index.json', 'Agent templates entry path must be /agent-templates/index.json.');

  const manifest = JSON.parse(await readFile(resolvePublicPath(entry.path), 'utf8'));
  assert(Array.isArray(manifest.types), 'Agent templates manifest must define a types array.');

  for (const [index, typeEntry] of manifest.types.entries()) {
    assert(typeEntry && typeof typeEntry === 'object', `Agent template type ${index} must be an object.`);
    assert(typeof typeEntry.templateType === 'string' && typeEntry.templateType.trim().length > 0, `Agent template type ${index} templateType is required.`);
    assert(typeof typeEntry.path === 'string' && typeEntry.path.startsWith('/agent-templates/'), `Agent template type ${index} path must stay within /agent-templates/.`);

    const typeIndexPath = resolvePublicPath(typeEntry.path);
    await access(typeIndexPath);
    const typeIndex = JSON.parse(await readFile(typeIndexPath, 'utf8'));

    assert(typeIndex.templateType === typeEntry.templateType, `Agent template type ${index} templateType must match its index payload.`);
    assert(Array.isArray(typeIndex.templates), `Agent template type ${typeEntry.templateType} templates must be an array.`);
    validateAgentTemplateTagGroups(typeIndex.availableTagGroups, `Agent template type ${typeEntry.templateType} availableTagGroups`);

    for (const [templateIndex, template] of typeIndex.templates.entries()) {
      assert(typeof template.path === 'string' && template.path.startsWith(`/agent-templates/${typeEntry.templateType}/templates/`), `Agent template ${typeEntry.templateType}[${templateIndex}] path must match the public template directory.`);
      validateAgentTemplateTagGroups(template.tagGroups, `Agent template ${typeEntry.templateType}[${templateIndex}] tagGroups`);
      await access(resolvePublicPath(template.path));
      JSON.parse(await readFile(resolvePublicPath(template.path), 'utf8'));
    }
  }
}

const raw = await readFile(catalogFile, 'utf8');
const catalog = JSON.parse(raw);
const activityMetricsAsset = await loadActivityMetrics(resolvePublicPath('/activity-metrics.json'));

assert(typeof catalog.version === 'string' && catalog.version.length > 0, 'Catalog version is required.');
assert(typeof catalog.generatedAt === 'string' && catalog.generatedAt.length > 0, 'Catalog generatedAt is required.');
assert(Array.isArray(catalog.entries), 'Catalog entries must be an array.');
assert(activityMetricsAsset, 'Activity metrics asset is required.');

let sawActivityEntry = false;
let sawAgentTemplatesEntry = false;

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

  if (entry.activityMetrics !== undefined) {
    validateActivitySummary(entry.activityMetrics, `Entry ${entry.id} activityMetrics`);
  }

  if (entry.historyPagePath !== undefined) {
    assert(typeof entry.historyPagePath === 'string', `Entry ${entry.id} historyPagePath must be a string.`);
    assert(entry.category === 'packages', `Entry ${entry.id} historyPagePath is only allowed for package entries.`);
    assert(entry.historyPagePath.startsWith('/'), `Entry ${entry.id} historyPagePath must start with /.`);
    assert(entry.historyPagePath.endsWith('/'), `Entry ${entry.id} historyPagePath must end with /.`);
    assert(!entry.historyPagePath.endsWith('.json'), `Entry ${entry.id} historyPagePath must point to a page route.`);
    await access(resolvePagePath(entry.historyPagePath));

    const expectedPath = expectedHistoryPaths.get(entry.id);
    if (expectedPath) {
      assert(
        entry.historyPagePath === expectedPath,
        `Entry ${entry.id} historyPagePath must be ${expectedPath}.`,
      );
    }
  }

  if (entry.id === activityEntryId) {
    sawActivityEntry = true;
    assert(entry.path === '/activity-metrics.json', 'Activity metrics entry path must be /activity-metrics.json.');
    const summary = validateActivitySummary(
      entry.activityMetrics,
      `Entry ${entry.id} activityMetrics`,
    );

    assert(
      entry.lastUpdated === activityMetricsAsset.lastUpdated,
      'Activity metrics entry lastUpdated must match /activity-metrics.json.',
    );
    assert(
      summary.activeUsers === activityMetricsAsset.clarity.activeUsers,
      'Activity metrics entry activeUsers must match /activity-metrics.json.',
    );
    assert(
      summary.activeSessions === activityMetricsAsset.clarity.activeSessions,
      'Activity metrics entry activeSessions must match /activity-metrics.json.',
    );
    assert(
      summary.dateRange === activityMetricsAsset.clarity.dateRange,
      'Activity metrics entry dateRange must match /activity-metrics.json.',
    );
  }

  if (entry.id === agentTemplatesEntryId) {
    sawAgentTemplatesEntry = true;
    await validateAgentTemplateManifest(entry);
  }
}

assert(sawActivityEntry, 'Catalog must include an activity-metrics entry.');
assert(sawAgentTemplatesEntry, 'Catalog must include an agent-templates entry.');

console.log(`Validated ${catalog.entries.length} catalog entries.`);
