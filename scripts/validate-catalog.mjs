import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { loadActivityMetrics } from './update-activity-metrics.mjs';
import {
  buildCharacterTemplateLibrary,
  coreDungeonScriptKeys,
  loadAgentPresetLibrary,
} from './build-agent-preset-library.mjs';

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

const routeMappedJsonPaths = [
  '/index-catalog.json',
  '/activity-metrics.json',
  '/live-broadcast.json',
  '/server/index.json',
  '/desktop/index.json',
];

const expectedHistoryPaths = new Map([
  ['server-packages', '/server/history/'],
  ['desktop-packages', '/desktop/history/'],
]);
const activityEntryId = 'activity-metrics';
const agentTemplatesEntryId = 'agent-templates';
const characterTemplatesEntryId = 'character-templates';
const supportedCharacterTemplateModes = ['curated', 'universal'];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const routeSourceRoot = path.join(projectRoot, 'src', 'data', 'public');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolvePublishedRoot(input = process.env.INDEX_BUILD_ROOT ?? 'dist') {
  return path.resolve(projectRoot, input);
}

function getCliOption(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function resolveSourcePath(sitePath) {
  return path.join(routeSourceRoot, sitePath.replace(/^\//, ''));
}

function resolvePublishedPath(sitePath, publishedRoot) {
  return path.join(publishedRoot, sitePath.replace(/^\//, ''));
}

function resolvePagePath(sitePath) {
  const normalizedPath = sitePath.replace(/^\//, '').replace(/\/$/, '');
  return path.join(projectRoot, 'src', 'pages', `${normalizedPath}.astro`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function assertPublishedRoute(sitePath, publishedRoot) {
  const sourceFile = resolveSourcePath(sitePath);
  const publishedFile = resolvePublishedPath(sitePath, publishedRoot);
  const sourceValue = await readJson(sourceFile);

  await access(publishedFile);
  const publishedRaw = await readFile(publishedFile, 'utf8');
  const publishedValue = JSON.parse(publishedRaw);

  assert(
    isDeepStrictEqual(publishedValue, sourceValue),
    `Published JSON drift detected for ${sitePath}.`,
  );
  assert(
    publishedRaw === JSON.stringify(publishedValue),
    `${sitePath} must be published as stable minified JSON.`,
  );

  return publishedValue;
}

function validateLiveBroadcastContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Live broadcast payload must be an object.');
  assert(payload.version === '1.0.0', 'Live broadcast payload version must be 1.0.0.');
  assert(typeof payload.updatedAt === 'string' && payload.updatedAt.length > 0, 'Live broadcast payload updatedAt is required.');

  assert(payload.timezone && typeof payload.timezone === 'object', 'Live broadcast timezone must be an object.');
  assert(payload.timezone.iana === 'Asia/Shanghai', 'Live broadcast timezone must stay on Asia/Shanghai.');
  assert(payload.timezone.utcOffsetMinutes === 480, 'Live broadcast timezone offset must stay on UTC+8.');

  assert(payload.schedule && typeof payload.schedule === 'object', 'Live broadcast schedule must be an object.');
  assert(Array.isArray(payload.schedule.activeWeekdays), 'Live broadcast activeWeekdays must be an array.');
  assert(Array.isArray(payload.schedule.excludedWeekdays), 'Live broadcast excludedWeekdays must be an array.');
  assert(payload.schedule.previewStartTime === '18:00', 'Live broadcast previewStartTime must stay 18:00.');
  assert(payload.schedule.startTime === '20:00', 'Live broadcast startTime must stay 20:00.');
  assert(payload.schedule.endTime === '21:00', 'Live broadcast endTime must stay 21:00.');
  assert(payload.schedule.activeWeekdays.includes(0), 'Live broadcast must include Sunday.');
  assert(payload.schedule.activeWeekdays.includes(6), 'Live broadcast must include Saturday.');
  assert(payload.schedule.excludedWeekdays.length === 1 && payload.schedule.excludedWeekdays[0] === 4, 'Live broadcast must exclude Thursday only.');

  assert(payload.qrCode && typeof payload.qrCode === 'object', 'Live broadcast qrCode must be an object.');
  assert(!('imageUrl' in payload.qrCode), 'Live broadcast qrCode must not publish imageUrl; each site hosts its own QR asset path.');
  assert(Number.isInteger(payload.qrCode.width) && payload.qrCode.width > 0, 'Live broadcast qrCode width must be a positive integer.');
  assert(Number.isInteger(payload.qrCode.height) && payload.qrCode.height > 0, 'Live broadcast qrCode height must be a positive integer.');

  assert(payload.locales && typeof payload.locales === 'object', 'Live broadcast locales must be an object.');

  for (const locale of ['zh-CN', 'en']) {
    const bundle = payload.locales[locale];
    assert(bundle && typeof bundle === 'object', `Live broadcast locale ${locale} must be an object.`);
    for (const field of ['eyebrow', 'title', 'description']) {
      assert(typeof bundle[field] === 'string' && bundle[field].trim().length > 0, `Live broadcast locale ${locale} ${field} is required.`);
    }
    for (const state of ['upcoming', 'live', 'offline']) {
      assert(typeof bundle.status?.[state] === 'string' && bundle.status[state].trim().length > 0, `Live broadcast locale ${locale} status ${state} is required.`);
      assert(typeof bundle.stateCopy?.[state] === 'string' && bundle.stateCopy[state].trim().length > 0, `Live broadcast locale ${locale} stateCopy ${state} is required.`);
    }
    for (const field of ['preview', 'live', 'cta']) {
      assert(typeof bundle.reminder?.[field] === 'string' && bundle.reminder[field].trim().length > 0, `Live broadcast locale ${locale} reminder ${field} is required.`);
    }
    for (const field of ['beijingLabel', 'localLabel', 'nextLabel', 'thursdayNote']) {
      assert(typeof bundle.time?.[field] === 'string' && bundle.time[field].trim().length > 0, `Live broadcast locale ${locale} time ${field} is required.`);
    }
  }
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

function validateTemplateTagGroups(value, fieldName) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${fieldName} must be an object.`);

  for (const key of ['languages', 'domains', 'roles']) {
    const entries = value[key];
    assert(Array.isArray(entries), `${fieldName}.${key} must be an array.`);
    assert(entries.every((entry) => typeof entry === 'string'), `${fieldName}.${key} entries must be strings.`);
  }
}

function validateStringArray(value, fieldName, { minLength = 0 } = {}) {
  assert(Array.isArray(value), `${fieldName} must be an array.`);
  assert(value.length >= minLength, `${fieldName} must contain at least ${minLength} entries.`);
  assert(
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0),
    `${fieldName} entries must be non-empty strings.`,
  );
  assert(new Set(value).size === value.length, `${fieldName} entries must be unique.`);
}

function validateDungeonBindings(value, fieldName) {
  assert(Array.isArray(value), `${fieldName} must be an array.`);

  const seenScriptKeys = new Set();
  let previousPriority = -1;

  value.forEach((binding, index) => {
    assert(binding && typeof binding === 'object' && !Array.isArray(binding), `${fieldName}[${index}] must be an object.`);
    assert(
      typeof binding.scriptKey === 'string' && binding.scriptKey.trim().length > 0,
      `${fieldName}[${index}].scriptKey is required.`,
    );
    assert(
      coreDungeonScriptKeys.includes(binding.scriptKey),
      `${fieldName}[${index}].scriptKey ${binding.scriptKey} is not supported.`,
    );
    assert(
      !seenScriptKeys.has(binding.scriptKey),
      `${fieldName} must not contain duplicate scriptKey ${binding.scriptKey}.`,
    );
    seenScriptKeys.add(binding.scriptKey);
    validateStringArray(binding.matchedTags, `${fieldName}[${index}].matchedTags`, { minLength: 1 });
    validateStringArray(binding.matchedTagGroups, `${fieldName}[${index}].matchedTagGroups`, { minLength: 1 });
    assert(
      Number.isInteger(binding.priority) && binding.priority >= 0,
      `${fieldName}[${index}].priority must be a non-negative integer.`,
    );
    assert(binding.priority >= previousPriority, `${fieldName} must keep stable priority ordering.`);
    previousPriority = binding.priority;
  });
}

function validateCharacterTemplateModeAndScope(templateMode, applyScope, fieldName) {
  assert(
    typeof templateMode === 'string' && supportedCharacterTemplateModes.includes(templateMode),
    `${fieldName}.templateMode must be one of ${supportedCharacterTemplateModes.join(', ')}.`,
  );
  validateStringArray(applyScope, `${fieldName}.applyScope`, { minLength: 1 });
  assert(
    applyScope.every((entry) => ['soul', 'trait'].includes(entry)),
    `${fieldName}.applyScope entries must be soul or trait.`,
  );

  if (templateMode === 'curated') {
    assert(
      isDeepStrictEqual(applyScope, ['soul', 'trait']),
      `${fieldName}.applyScope must be ["soul", "trait"] for curated templates.`,
    );
    return;
  }

  assert(
    isDeepStrictEqual(applyScope, ['soul']),
    `${fieldName}.applyScope must be ["soul"] for universal templates.`,
  );
}

async function validateAgentTemplateManifest(entry, publishedRoot) {
  assert(entry.path === '/agent-templates/index.json', 'Agent templates entry path must be /agent-templates/index.json.');

  const manifest = JSON.parse(await readFile(resolvePublishedPath(entry.path, publishedRoot), 'utf8'));
  assert(Array.isArray(manifest.types), 'Agent templates manifest must define a types array.');

  for (const [index, typeEntry] of manifest.types.entries()) {
    assert(typeEntry && typeof typeEntry === 'object', `Agent template type ${index} must be an object.`);
    assert(typeof typeEntry.templateType === 'string' && typeEntry.templateType.trim().length > 0, `Agent template type ${index} templateType is required.`);
    assert(typeof typeEntry.path === 'string' && typeEntry.path.startsWith('/agent-templates/'), `Agent template type ${index} path must stay within /agent-templates/.`);

    const typeIndexPath = resolvePublishedPath(typeEntry.path, publishedRoot);
    await access(typeIndexPath);
    const typeIndex = JSON.parse(await readFile(typeIndexPath, 'utf8'));

    assert(typeIndex.templateType === typeEntry.templateType, `Agent template type ${index} templateType must match its index payload.`);
    assert(Array.isArray(typeIndex.templates), `Agent template type ${typeEntry.templateType} templates must be an array.`);
    validateTemplateTagGroups(typeIndex.availableTagGroups, `Agent template type ${typeEntry.templateType} availableTagGroups`);

    for (const [templateIndex, template] of typeIndex.templates.entries()) {
      assert(typeof template.path === 'string' && template.path.startsWith(`/agent-templates/${typeEntry.templateType}/templates/`), `Agent template ${typeEntry.templateType}[${templateIndex}] path must match the public template directory.`);
      validateTemplateTagGroups(template.tagGroups, `Agent template ${typeEntry.templateType}[${templateIndex}] tagGroups`);
      await access(resolvePublishedPath(template.path, publishedRoot));
      JSON.parse(await readFile(resolvePublishedPath(template.path, publishedRoot), 'utf8'));
    }
  }
}

async function validateCharacterTemplateManifest(entry, publishedRoot) {
  assert(entry.path === '/character-templates/index.json', 'Character templates entry path must be /character-templates/index.json.');

  const manifest = JSON.parse(await readFile(resolvePublishedPath(entry.path, publishedRoot), 'utf8'));
  assert(Array.isArray(manifest.templates), 'Character templates manifest must define a templates array.');
  validateTemplateTagGroups(manifest.availableTagGroups, 'Character templates availableTagGroups');

  const soulIndex = JSON.parse(await readFile(resolvePublishedPath('/agent-templates/soul/index.json', publishedRoot), 'utf8'));
  const traitIndex = JSON.parse(await readFile(resolvePublishedPath('/agent-templates/trait/index.json', publishedRoot), 'utf8'));
  const publishedSoulIds = new Set((soulIndex.templates ?? []).map((template) => template.id));
  const publishedTraitIds = new Set((traitIndex.templates ?? []).map((template) => template.id));
  const libraryData = await loadAgentPresetLibrary(projectRoot);
  const expectedLibrary = buildCharacterTemplateLibrary({
    libraryData,
    soulIndex,
    traitIndex,
  });
  const expectedSummaries = new Map(expectedLibrary.manifest.templates.map((template) => [template.id, template]));
  const expectedDetails = new Map(expectedLibrary.details.map((detail) => [detail.id, detail]));

  assert(
    isDeepStrictEqual(manifest, expectedLibrary.manifest),
    'Character template manifest must match the generated library output.',
  );

  for (const [index, summary] of manifest.templates.entries()) {
    assert(summary && typeof summary === 'object', `Character template ${index} must be an object.`);
    assert(typeof summary.id === 'string' && summary.id.trim().length > 0, `Character template ${index} id is required.`);
    assert(typeof summary.name === 'string' && summary.name.trim().length > 0, `Character template ${summary.id} name is required.`);
    assert(typeof summary.summary === 'string' && summary.summary.trim().length > 0, `Character template ${summary.id} summary is required.`);
    assert(typeof summary.templateVersion === 'string' && summary.templateVersion.trim().length > 0, `Character template ${summary.id} templateVersion is required.`);
    assert(
      typeof summary.path === 'string' && summary.path.startsWith('/character-templates/templates/'),
      `Character template ${summary.id} path must stay within /character-templates/templates/.`,
    );
    validateCharacterTemplateModeAndScope(summary.templateMode, summary.applyScope, `Character template ${summary.id}`);
    validateStringArray(summary.tags, `Character template ${summary.id} tags`, { minLength: 1 });
    validateStringArray(summary.scenes, `Character template ${summary.id} scenes`, { minLength: 1 });
    validateTemplateTagGroups(summary.tagGroups, `Character template ${summary.id} tagGroups`);
    validateDungeonBindings(summary.dungeonBindings ?? [], `Character template ${summary.id} dungeonBindings`);
    assert(
      isDeepStrictEqual(summary, expectedSummaries.get(summary.id)),
      `Character template ${summary.id} summary must match the generated library output.`,
    );

    const detailPath = resolvePublishedPath(summary.path, publishedRoot);
    await access(detailPath);
    const detail = JSON.parse(await readFile(detailPath, 'utf8'));

    assert(detail.id === summary.id, `Character template ${summary.id} detail id must match its summary.`);
    assert(detail.path === summary.path, `Character template ${summary.id} detail path must match its summary.`);
    assert(detail.templateVersion === summary.templateVersion, `Character template ${summary.id} detail templateVersion must match its summary.`);
    assert(detail.templateMode === summary.templateMode, `Character template ${summary.id} detail templateMode must match its summary.`);
    assert(
      isDeepStrictEqual(detail.applyScope, summary.applyScope),
      `Character template ${summary.id} detail applyScope must match its summary.`,
    );
    validateStringArray(detail.soulTemplateIds, `Character template ${summary.id} soulTemplateIds`, { minLength: 1 });
    validateStringArray(detail.traitTemplateIds, `Character template ${summary.id} traitTemplateIds`, {
      minLength: detail.templateMode === 'curated' ? 1 : 0,
    });
    validateDungeonBindings(detail.dungeonBindings ?? [], `Character template ${summary.id} detail dungeonBindings`);
    validateCharacterTemplateModeAndScope(detail.templateMode, detail.applyScope, `Character template ${summary.id} detail`);
    assert(detail.soulSelection && typeof detail.soulSelection === 'object', `Character template ${summary.id} detail soulSelection is required.`);
    assert(
      detail.soulSelection.personalityId === detail.soulTemplateIds[0],
      `Character template ${summary.id} personality SOUL must be the first soulTemplateIds entry.`,
    );
    assert(
      detail.soulSelection.languageStyleId === detail.soulTemplateIds[1],
      `Character template ${summary.id} language-style SOUL must be the second soulTemplateIds entry.`,
    );

    for (const soulTemplateId of detail.soulTemplateIds) {
      assert(
        publishedSoulIds.has(soulTemplateId),
        `Character template ${summary.id} references unknown soul template ${soulTemplateId}.`,
      );
    }

    for (const traitTemplateId of detail.traitTemplateIds) {
      assert(
        publishedTraitIds.has(traitTemplateId),
        `Character template ${summary.id} references unknown trait template ${traitTemplateId}.`,
      );
    }

    if (detail.templateMode === 'universal') {
      assert(
        detail.traitTemplateIds.length === 0,
        `Character template ${summary.id} templateMode universal must not control Trait templates.`,
      );
    }

    assert(
      isDeepStrictEqual(detail, expectedDetails.get(summary.id)),
      `Character template ${summary.id} detail must match the generated library output.`,
    );
  }
}

export async function validateCatalog({ publishedRoot = resolvePublishedRoot() } = {}) {
  await access(publishedRoot);

  const publishedCatalog = await assertPublishedRoute('/index-catalog.json', publishedRoot);
  await assertPublishedRoute('/activity-metrics.json', publishedRoot);
  validateLiveBroadcastContract(await assertPublishedRoute('/live-broadcast.json', publishedRoot));
  await assertPublishedRoute('/server/index.json', publishedRoot);
  await assertPublishedRoute('/desktop/index.json', publishedRoot);

  const catalog = publishedCatalog;
  const activityMetricsAsset = await loadActivityMetrics(resolveSourcePath('/activity-metrics.json'));

  assert(typeof catalog.version === 'string' && catalog.version.length > 0, 'Catalog version is required.');
  assert(typeof catalog.generatedAt === 'string' && catalog.generatedAt.length > 0, 'Catalog generatedAt is required.');
  assert(Array.isArray(catalog.entries), 'Catalog entries must be an array.');
  assert(activityMetricsAsset, 'Activity metrics asset is required.');

  let sawActivityEntry = false;
  let sawAgentTemplatesEntry = false;
  let sawCharacterTemplatesEntry = false;

  for (const [index, entry] of catalog.entries.entries()) {
    assert(entry && typeof entry === 'object', `Entry ${index} must be an object.`);

    for (const field of requiredFields) {
      assert(typeof entry[field] === 'string' && entry[field].trim().length > 0, `Entry ${index} is missing field ${field}.`);
    }

    assert(entry.path.startsWith('/'), `Entry ${entry.id} path must start with /.`);
    assert(entry.path.endsWith('.json'), `Entry ${entry.id} path must point to a JSON asset.`);

    await access(resolvePublishedPath(entry.path, publishedRoot));
    JSON.parse(await readFile(resolvePublishedPath(entry.path, publishedRoot), 'utf8'));

    if (entry.readmePath) {
      assert(typeof entry.readmePath === 'string', `Entry ${entry.id} readmePath must be a string.`);
      await access(resolvePublishedPath(entry.readmePath, publishedRoot));
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
      const summary = validateActivitySummary(entry.activityMetrics, `Entry ${entry.id} activityMetrics`);

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
      await validateAgentTemplateManifest(entry, publishedRoot);
    }

    if (entry.id === characterTemplatesEntryId) {
      sawCharacterTemplatesEntry = true;
      await validateCharacterTemplateManifest(entry, publishedRoot);
    }
  }

  assert(sawActivityEntry, 'Catalog must include an activity-metrics entry.');
  assert(sawAgentTemplatesEntry, 'Catalog must include an agent-templates entry.');
  assert(sawCharacterTemplatesEntry, 'Catalog must include a character-templates entry.');

  console.log(`Validated ${catalog.entries.length} catalog entries and ${routeMappedJsonPaths.length} route-mapped JSON assets.`);
}

const publishedRootArg = getCliOption('--published-root');
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  validateCatalog({ publishedRoot: resolvePublishedRoot(publishedRootArg ?? undefined) }).catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
