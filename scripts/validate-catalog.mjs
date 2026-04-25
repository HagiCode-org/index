import { access, readFile, readdir } from 'node:fs/promises';
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

const fileBackedRouteMappedJsonPaths = [
  '/index-catalog.json',
  '/sites.json',
  '/activity-metrics.json',
  '/design.json',
  '/live-broadcast.json',
  '/legal-documents.json',
  '/promote.json',
  '/promote_content.json',
  '/server/index.json',
  '/desktop/index.json',
  '/steam/index.json',
];
const generatedRouteMappedJsonPaths = ['/about.json'];
const routeMappedJsonPaths = [
  ...fileBackedRouteMappedJsonPaths,
  ...generatedRouteMappedJsonPaths,
];
const requiredAboutEntryIds = [
  'youtube',
  'steam',
  'bilibili',
  'xiaohongshu',
  'douyin-account',
  'douyin-qr',
  'qq-group',
  'feishu-group',
  'discord',
  'wechat-account',
];
const aboutRegionPriorities = ['china-first', 'international-first'];
const aboutSourcePathFragments = ['/about/', 'src/assets/about/'];
const aboutRawFilenamePattern = /(?:^|\/)(?:douyin\.png|feishu\.png|wechat_account\.jpg|wechat-account\.jpg)$/i;

const expectedHistoryPaths = new Map([
  ['server-packages', '/server/history/'],
  ['desktop-packages', '/desktop/history/'],
]);
const activityEntryId = 'activity-metrics';
const aboutEntryId = 'about';
const designEntryId = 'design-theme-catalog';
const agentTemplatesEntryId = 'agent-templates';
const characterTemplatesEntryId = 'character-templates';
const promotionFlagsEntryId = 'promotion-flags';
const promotionContentEntryId = 'promotion-content';
const explicitTimezoneIsoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const supportedCharacterTemplateModes = ['curated', 'universal'];
const requiredPortalSites = new Map([
  ['hagicode-main', 'https://hagicode.com/'],
  ['hagicode-docs', 'https://docs.hagicode.com/'],
  ['newbe-blog', 'https://newbe.hagicode.com/'],
  ['index-data', 'https://index.hagicode.com/data/'],
  ['compose-builder', 'https://builder.hagicode.com/'],
  ['cost-calculator', 'https://cost.hagicode.com/'],
  ['status-page', 'https://status.hagicode.com/'],
  ['awesome-design-gallery', 'https://design.hagicode.com/'],
  ['soul-builder', 'https://soul.hagicode.com/'],
  ['trait-builder', 'https://trait.hagicode.com/'],
]);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const routeSourceRoot = path.join(projectRoot, 'src', 'data', 'public');
const designVendorRoot = path.join(projectRoot, 'vendor', 'awesome-design-md', 'design-md');

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

async function collectPublishedJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectPublishedJsonFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function toPublishedJsonPath(filePath, publishedRoot) {
  return `/${path.relative(publishedRoot, filePath).split(path.sep).join('/')}`;
}

async function assertAllPublishedJsonMinified(publishedRoot) {
  const jsonFiles = await collectPublishedJsonFiles(publishedRoot);

  for (const filePath of jsonFiles) {
    const publishedPath = toPublishedJsonPath(filePath, publishedRoot);
    const raw = await readFile(filePath, 'utf8');
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Published JSON ${publishedPath} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const stable = JSON.stringify(parsed);

    assert(
      raw === stable,
      `Published JSON ${publishedPath} must be stable minified JSON. Run npm run build so scripts/minify-published-json.mjs rewrites build output only.`,
    );

    assert(
      isDeepStrictEqual(JSON.parse(stable), parsed),
      `Published JSON ${publishedPath} changed semantics during stable minification validation.`,
    );
  }

  return jsonFiles.length;
}

async function assertDesignVendorAvailable() {
  try {
    await access(designVendorRoot);
  } catch {
    throw new Error(
      `Missing required design vendor submodule at ${designVendorRoot}. Run "git submodule update --init --recursive" locally, or set actions/checkout submodules: recursive in CI.`,
    );
  }
}

async function assertPublishedRoute(sitePath, publishedRoot) {
  if (fileBackedRouteMappedJsonPaths.includes(sitePath)) {
    return assertPublishedFileBackedRoute(sitePath, publishedRoot);
  }

  return assertPublishedGeneratedRoute(sitePath, publishedRoot);
}

async function assertPublishedFileBackedRoute(sitePath, publishedRoot) {
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

async function assertPublishedGeneratedRoute(sitePath, publishedRoot) {
  const publishedFile = resolvePublishedPath(sitePath, publishedRoot);

  await access(publishedFile);
  const publishedRaw = await readFile(publishedFile, 'utf8');
  const publishedValue = JSON.parse(publishedRaw);

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

function validateLegalDocumentsContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Legal documents payload must be an object.');
  assert(payload.schemaVersion === '1.0.0', 'Legal documents payload schemaVersion must be 1.0.0.');
  assert(typeof payload.publishedAt === 'string' && payload.publishedAt.trim().length > 0, 'Legal documents payload publishedAt is required.');
  assert(Array.isArray(payload.documents) && payload.documents.length === 2, 'Legal documents payload must publish exactly two documents.');

  const expectedTypes = new Set(['eula', 'privacy-policy']);
  const seenTypes = new Set();

  for (const document of payload.documents) {
    assert(document && typeof document === 'object' && !Array.isArray(document), 'Each legal document entry must be an object.');
    assert(typeof document.documentType === 'string' && expectedTypes.has(document.documentType), 'Legal document type must be eula or privacy-policy.');
    assert(!seenTypes.has(document.documentType), `Duplicate legal document entry for ${document.documentType}.`);
    seenTypes.add(document.documentType);
    assert(typeof document.effectiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(document.effectiveDate), `Legal document ${document.documentType} effectiveDate must use YYYY-MM-DD.`);
    assert(typeof document.revision === 'string' && document.revision.trim().length > 0, `Legal document ${document.documentType} revision is required.`);
    assert(typeof document.canonicalUrl === 'string' && document.canonicalUrl.startsWith('https://docs.hagicode.com/'), `Legal document ${document.documentType} canonicalUrl must point to docs.hagicode.com.`);
    assert(document.locales && typeof document.locales === 'object' && !Array.isArray(document.locales), `Legal document ${document.documentType} locales must be an object.`);

    for (const locale of ['zh-CN', 'en-US']) {
      const localeEntry = document.locales[locale];
      assert(localeEntry && typeof localeEntry === 'object' && !Array.isArray(localeEntry), `Legal document ${document.documentType} locale ${locale} must be an object.`);
      assert(typeof localeEntry.title === 'string' && localeEntry.title.trim().length > 0, `Legal document ${document.documentType} locale ${locale} title is required.`);
      assert(
        typeof localeEntry.browserOpenUrl === 'string' && localeEntry.browserOpenUrl.startsWith('https://docs.hagicode.com/'),
        `Legal document ${document.documentType} locale ${locale} browserOpenUrl must point to docs.hagicode.com.`,
      );
    }
  }

  assert(seenTypes.size === expectedTypes.size, 'Legal documents payload must include eula and privacy-policy entries.');
}

function validatePromoteContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Promote payload must be an object.');
  assert(payload.version === '1.0.0', 'Promote payload version must be 1.0.0.');
  assert(typeof payload.updatedAt === 'string' && payload.updatedAt.trim().length > 0, 'Promote payload updatedAt is required.');
  assert(Array.isArray(payload.promotes), 'Promote payload promotes must be an array.');

  const seenIds = new Set();

  payload.promotes.forEach((entry, index) => {
    const fieldName = `Promote entry[${index}]`;
    assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${fieldName} must be an object.`);
    assert(typeof entry.id === 'string' && entry.id.trim().length > 0, `${fieldName} id is required.`);
    assert(!seenIds.has(entry.id), `Duplicate promote id ${entry.id}.`);
    seenIds.add(entry.id);
    assert(typeof entry.on === 'boolean', `${fieldName} on must be a boolean.`);

    for (const field of ['startTime', 'endTime']) {
      if (field in entry && entry[field] !== undefined) {
        assert(typeof entry[field] === 'string', `${fieldName} ${field} must be a string when present.`);
        assert(explicitTimezoneIsoPattern.test(entry[field]), `${fieldName} ${field} must be an ISO 8601 timestamp with an explicit timezone.`);
        assert(!Number.isNaN(Date.parse(entry[field])), `${fieldName} ${field} must be a valid timestamp.`);
      }
    }

    if (entry.startTime !== undefined && entry.endTime !== undefined) {
      assert(Date.parse(entry.startTime) < Date.parse(entry.endTime), `${fieldName} startTime must be before endTime.`);
    }
  });
}

function hasPromotionSchedule(promote) {
  return promote.startTime !== undefined || promote.endTime !== undefined;
}

function validatePromoteContentContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Promote content payload must be an object.');
  assert(payload.version === '1.0.0', 'Promote content payload version must be 1.0.0.');
  assert(typeof payload.updatedAt === 'string' && payload.updatedAt.trim().length > 0, 'Promote content payload updatedAt is required.');
  assert(Array.isArray(payload.contents), 'Promote content payload contents must be an array.');

  const seenIds = new Set();

  payload.contents.forEach((entry, index) => {
    const fieldName = `Promote content[${index}]`;
    assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${fieldName} must be an object.`);
    assert(typeof entry.id === 'string' && entry.id.trim().length > 0, `${fieldName} id is required.`);
    assert(!seenIds.has(entry.id), `Duplicate promote content id ${entry.id}.`);
    seenIds.add(entry.id);

    assert(entry.title && typeof entry.title === 'object' && !Array.isArray(entry.title), `${fieldName} title must be an object.`);
    assert(entry.description && typeof entry.description === 'object' && !Array.isArray(entry.description), `${fieldName} description must be an object.`);

    for (const locale of ['zh', 'en']) {
      assert(typeof entry.title[locale] === 'string' && entry.title[locale].trim().length > 0, `${fieldName} title.${locale} is required.`);
      assert(typeof entry.description[locale] === 'string' && entry.description[locale].trim().length > 0, `${fieldName} description.${locale} is required.`);
    }

    if ('cta' in entry && entry.cta !== undefined) {
      assert(entry.cta && typeof entry.cta === 'object' && !Array.isArray(entry.cta), `${fieldName} cta must be an object when present.`);
      for (const [locale, label] of Object.entries(entry.cta)) {
        assert(typeof locale === 'string' && locale.trim().length > 0, `${fieldName} cta locale keys must be non-empty strings.`);
        assert(typeof label === 'string' && label.trim().length > 0, `${fieldName} cta.${locale} must be a non-empty string when present.`);
      }
    }

    assert(typeof entry.link === 'string' && entry.link.trim().length > 0, `${fieldName} link is required.`);
    assert(typeof entry.targetPlatform === 'string' && entry.targetPlatform.trim().length > 0, `${fieldName} targetPlatform is required.`);

    if ('imageUrl' in entry && entry.imageUrl !== undefined) {
      assert(typeof entry.imageUrl === 'string' && entry.imageUrl.trim().length > 0, `${fieldName} imageUrl must be a non-empty string when present.`);
    }
  });
}

function validateSteamContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Steam payload must be an object.');
  assert(payload.version === '1.0.0', 'Steam payload version must be 1.0.0.');
  assert(typeof payload.updatedAt === 'string' && payload.updatedAt.trim().length > 0, 'Steam payload updatedAt is required.');
  assert(Array.isArray(payload.applications), 'Steam payload applications must be an array.');
  assert(Array.isArray(payload.bundles), 'Steam payload bundles must be an array.');

  const applicationKeys = new Set();

  payload.applications.forEach((entry, index) => {
    const fieldName = `Steam application[${index}]`;
    assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${fieldName} must be an object.`);

    for (const key of ['key', 'displayName', 'kind', 'storeAppId', 'storeUrl']) {
      assert(typeof entry[key] === 'string' && entry[key].trim().length > 0, `${fieldName} ${key} is required.`);
    }

    assert(entry.platformAppIds && typeof entry.platformAppIds === 'object' && !Array.isArray(entry.platformAppIds), `${fieldName} platformAppIds must be an object.`);

    if ('promoteId' in entry && entry.promoteId !== undefined) {
      assert(typeof entry.promoteId === 'string' && entry.promoteId.trim().length > 0, `${fieldName} promoteId must be a non-empty string when present.`);
    }

    applicationKeys.add(entry.key);
  });

  payload.bundles.forEach((entry, index) => {
    const fieldName = `Steam bundle[${index}]`;
    assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${fieldName} must be an object.`);

    for (const key of ['key', 'displayName', 'storeBundleId', 'storeUrl']) {
      assert(typeof entry[key] === 'string' && entry[key].trim().length > 0, `${fieldName} ${key} is required.`);
    }

    assert(
      Array.isArray(entry.includedApplicationKeys) && entry.includedApplicationKeys.length > 0,
      `${fieldName} includedApplicationKeys must be a non-empty array.`,
    );

    entry.includedApplicationKeys.forEach((applicationKey, applicationIndex) => {
      assert(
        typeof applicationKey === 'string' && applicationKey.trim().length > 0,
        `${fieldName} includedApplicationKeys[${applicationIndex}] must be a non-empty string.`,
      );
      assert(
        applicationKeys.has(applicationKey),
        `${fieldName} includedApplicationKeys[${applicationIndex}] must reference a published Steam application key.`,
      );
    });
  });
}

function validateAboutImageEntry(entry, fieldName) {
  assert(typeof entry.imageUrl === 'string' && entry.imageUrl.trim().length > 0, `${fieldName} imageUrl is required.`);
  assert(entry.imageUrl.startsWith('/_astro/'), `${fieldName} imageUrl must point to a published Astro asset URL.`);
  assert(
    !aboutSourcePathFragments.some((fragment) => entry.imageUrl.includes(fragment)),
    `${fieldName} imageUrl must not leak source paths.`,
  );
  assert(
    !aboutRawFilenamePattern.test(entry.imageUrl),
    `${fieldName} imageUrl must not leak raw source filenames.`,
  );
  assert(Number.isInteger(entry.width) && entry.width > 0, `${fieldName} width must be a positive integer.`);
  assert(Number.isInteger(entry.height) && entry.height > 0, `${fieldName} height must be a positive integer.`);
  assert(typeof entry.alt === 'string' && entry.alt.trim().length > 0, `${fieldName} alt is required.`);
}

function validateAboutContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'About payload must be an object.');
  assert(payload.version === '1.0.0', 'About payload version must be 1.0.0.');
  assert(typeof payload.updatedAt === 'string' && payload.updatedAt.trim().length > 0, 'About payload updatedAt is required.');
  assert(Array.isArray(payload.entries) && payload.entries.length > 0, 'About payload entries must be a non-empty array.');

  const remainingIds = new Set(requiredAboutEntryIds);
  const seenIds = new Set();

  payload.entries.forEach((entry, index) => {
    const fieldName = typeof entry?.id === 'string' && entry.id.trim().length > 0
      ? `About entry ${entry.id}`
      : `About entry[${index}]`;

    assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${fieldName} must be an object.`);
    assert(typeof entry.id === 'string' && entry.id.trim().length > 0, `${fieldName} id is required.`);
    assert(!seenIds.has(entry.id), `About entry ${entry.id} must be unique.`);
    seenIds.add(entry.id);
    remainingIds.delete(entry.id);
    assert(typeof entry.label === 'string' && entry.label.trim().length > 0, `${fieldName} label is required.`);
    assert(
      typeof entry.regionPriority === 'string' && aboutRegionPriorities.includes(entry.regionPriority),
      `${fieldName} regionPriority must be ${aboutRegionPriorities.join(' or ')}.`,
    );
    assert(
      ['link', 'contact', 'qr', 'image'].includes(entry.type),
      `${fieldName} type must be link, contact, qr, or image.`,
    );

    if (entry.type === 'link') {
      assert(typeof entry.url === 'string' && entry.url.trim().length > 0, `${fieldName} url is required.`);
      return;
    }

    if (entry.type === 'contact') {
      assert(typeof entry.value === 'string' && entry.value.trim().length > 0, `${fieldName} value is required.`);
      if ('url' in entry && entry.url !== undefined) {
        assert(typeof entry.url === 'string' && entry.url.trim().length > 0, `${fieldName} url must be a non-empty string when present.`);
      }
      return;
    }

    validateAboutImageEntry(entry, fieldName);
    if ('url' in entry && entry.url !== undefined) {
      assert(typeof entry.url === 'string' && entry.url.trim().length > 0, `${fieldName} url must be a non-empty string when present.`);
    }
  });

  assert(
    remainingIds.size === 0,
    `About payload is missing required entries: ${Array.from(remainingIds).join(', ')}.`,
  );
}

async function parseDesignReadmeMetadata(readmePath) {
  const markdown = await readFile(readmePath, 'utf8');
  const titleLine = markdown.split(/\r?\n/).find((line) => line.startsWith('# ')) ?? '';
  const images = Array.from(markdown.matchAll(/!\[([^\]]+)\]\((https?:[^)]+)\)/g)).map((match) => ({
    alt: match[1],
    url: match[2],
  }));
  const dark = images.find((image) => /dark mode/i.test(image.alt));
  const light = images.find((image) => /light mode/i.test(image.alt));

  assert(titleLine.length > 0, `Design README ${readmePath} must define a title heading.`);
  assert(dark, `Design README ${readmePath} must contain a dark mode preview image.`);
  assert(light, `Design README ${readmePath} must contain a light mode preview image.`);

  return {
    title: titleLine.replace(/^#\s+/, '').trim(),
    dark,
    light,
  };
}

function validateDesignContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Design payload must be an object.');
  assert(payload.version === '1.0.0', 'Design payload version must be 1.0.0.');
  assert(typeof payload.updatedAt === 'string' && payload.updatedAt.trim().length > 0, 'Design payload updatedAt is required.');
  assert(
    payload.vendorPath === 'vendor/awesome-design-md',
    'Design payload vendorPath must stay vendor/awesome-design-md.',
  );
  assert(
    payload.sourceRepository === 'https://github.com/VoltAgent/awesome-design-md',
    'Design payload sourceRepository must stay on the canonical upstream repository URL.',
  );
  assert(
    payload.detailBaseUrl === 'https://design.hagicode.com/designs/',
    'Design payload detailBaseUrl must stay on the canonical design detail base URL.',
  );
  assert(
    Number.isInteger(payload.themeCount) && payload.themeCount > 0,
    'Design payload themeCount must be a positive integer.',
  );
  assert(Array.isArray(payload.themes), 'Design payload themes must be an array.');
  assert(payload.themes.length === payload.themeCount, 'Design payload themeCount must match themes length.');

  const seenSlugs = new Set();

  payload.themes.forEach((theme, index) => {
    const fieldName = `Design theme[${index}]`;
    assert(theme && typeof theme === 'object' && !Array.isArray(theme), `${fieldName} must be an object.`);

    for (const key of ['slug', 'title', 'sourceDirectoryUrl', 'readmeUrl', 'designUrl', 'designDownloadUrl', 'previewLightImageUrl', 'previewLightAlt', 'previewDarkImageUrl', 'previewDarkAlt', 'detailUrl']) {
      assert(typeof theme[key] === 'string' && theme[key].trim().length > 0, `${fieldName} ${key} is required.`);
    }

    assert(!seenSlugs.has(theme.slug), `${fieldName} slug ${theme.slug} must be unique.`);
    seenSlugs.add(theme.slug);

    const encodedSlug = encodeURIComponent(theme.slug);
    assert(
      theme.sourceDirectoryUrl === `${payload.sourceRepository}/tree/main/design-md/${encodedSlug}`,
      `${fieldName} sourceDirectoryUrl must point to the upstream design-md directory.`,
    );
    assert(
      theme.readmeUrl === `${payload.sourceRepository}/blob/main/design-md/${encodedSlug}/README.md`,
      `${fieldName} readmeUrl must point to the upstream README.md.`,
    );
    assert(
      theme.designUrl === `${payload.sourceRepository}/blob/main/design-md/${encodedSlug}/DESIGN.md`,
      `${fieldName} designUrl must point to the upstream DESIGN.md.`,
    );
    assert(/^https:\/\//.test(theme.designDownloadUrl), `${fieldName} designDownloadUrl must use https.`);
    assert(
      theme.designDownloadUrl === `${payload.detailBaseUrl}${encodedSlug}/DESIGN.md`,
      `${fieldName} designDownloadUrl must point to the canonical DESIGN.md download route.`,
    );
    assert(!theme.previewLightImageUrl.endsWith('.html'), `${fieldName} previewLightImageUrl must not point to HTML.`);
    assert(!theme.previewDarkImageUrl.endsWith('.html'), `${fieldName} previewDarkImageUrl must not point to HTML.`);
    assert(/^https:\/\//.test(theme.previewLightImageUrl), `${fieldName} previewLightImageUrl must use https.`);
    assert(/^https:\/\//.test(theme.previewDarkImageUrl), `${fieldName} previewDarkImageUrl must use https.`);
    assert(
      theme.detailUrl === `${payload.detailBaseUrl}${encodedSlug}/`,
      `${fieldName} detailUrl must point to the canonical detail route.`,
    );
  });

  assert(payload.themes.some((theme) => theme.slug === 'linear.app'), 'Design payload must include linear.app.');
  assert(payload.themes.some((theme) => theme.slug === 'x.ai'), 'Design payload must include x.ai.');
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

function validateSitesCatalogContract(payload) {
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Sites catalog payload must be an object.');
  assert(payload.version === '1.0.0', 'Sites catalog payload version must be 1.0.0.');
  assert(typeof payload.generatedAt === 'string' && payload.generatedAt.trim().length > 0, 'Sites catalog generatedAt is required.');
  assert(Array.isArray(payload.groups) && payload.groups.length > 0, 'Sites catalog groups must be a non-empty array.');
  assert(Array.isArray(payload.entries) && payload.entries.length > 0, 'Sites catalog entries must be a non-empty array.');

  const groupIds = new Set();

  payload.groups.forEach((group, index) => {
    const fieldName = `Sites group[${index}]`;
    assert(group && typeof group === 'object' && !Array.isArray(group), `${fieldName} must be an object.`);
    for (const key of ['id', 'label', 'description']) {
      assert(typeof group[key] === 'string' && group[key].trim().length > 0, `${fieldName} ${key} is required.`);
    }
    assert(!groupIds.has(group.id), `Sites group ${group.id} must be unique.`);
    groupIds.add(group.id);
  });

  const remainingRequiredIds = new Map(requiredPortalSites);
  const entryIds = new Set();

  payload.entries.forEach((entry, index) => {
    const fieldName = `Sites entry[${index}]`;
    assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${fieldName} must be an object.`);
    for (const key of ['id', 'title', 'label', 'description', 'groupId', 'url', 'actionLabel']) {
      assert(typeof entry[key] === 'string' && entry[key].trim().length > 0, `${fieldName} ${key} is required.`);
    }
    assert(!entryIds.has(entry.id), `Sites entry ${entry.id} must be unique.`);
    entryIds.add(entry.id);
    assert(groupIds.has(entry.groupId), `Sites entry ${entry.id} references unknown groupId ${entry.groupId}.`);

    const parsedUrl = new URL(entry.url);
    assert(parsedUrl.protocol === 'https:', `Sites entry ${entry.id} must use https.`);
    assert(
      !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname),
      `Sites entry ${entry.id} must not point to a local address.`,
    );

    const expectedUrl = remainingRequiredIds.get(entry.id);
    if (expectedUrl) {
      assert(entry.url === expectedUrl, `Sites entry ${entry.id} must point to ${expectedUrl}.`);
      remainingRequiredIds.delete(entry.id);
    }
  });

  assert(
    remainingRequiredIds.size === 0,
    `Sites catalog is missing required entries: ${Array.from(remainingRequiredIds.keys()).join(', ')}.`,
  );
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

  const publishedJsonCount = await assertAllPublishedJsonMinified(publishedRoot);

  const publishedCatalog = await assertPublishedRoute('/index-catalog.json', publishedRoot);
  validateSitesCatalogContract(await assertPublishedRoute('/sites.json', publishedRoot));
  await assertPublishedRoute('/activity-metrics.json', publishedRoot);
  const designPayload = await assertPublishedRoute('/design.json', publishedRoot);
  validateDesignContract(designPayload);
  await assertDesignVendorAvailable();
  validateLiveBroadcastContract(await assertPublishedRoute('/live-broadcast.json', publishedRoot));
  validateLegalDocumentsContract(await assertPublishedRoute('/legal-documents.json', publishedRoot));
  const promotePayload = await assertPublishedRoute('/promote.json', publishedRoot);
  validatePromoteContract(promotePayload);
  const promoteContentPayload = await assertPublishedRoute('/promote_content.json', publishedRoot);
  validatePromoteContentContract(promoteContentPayload);
  await assertPublishedRoute('/server/index.json', publishedRoot);
  await assertPublishedRoute('/desktop/index.json', publishedRoot);
  const steamPayload = await assertPublishedRoute('/steam/index.json', publishedRoot);
  validateSteamContract(steamPayload);
  validateAboutContract(await assertPublishedRoute('/about.json', publishedRoot));

  const publishedPromotionContentIds = new Set(promoteContentPayload.contents.map((entry) => entry.id));

  for (const promote of promotePayload.promotes) {
    if (promote.on || hasPromotionSchedule(promote)) {
      assert(
        publishedPromotionContentIds.has(promote.id),
        `Promote id ${promote.id} must resolve to a promote_content.json entry when enabled or scheduled.`,
      );
    }
  }

  for (const application of steamPayload.applications) {
    if (application.promoteId) {
      assert(
        publishedPromotionContentIds.has(application.promoteId),
        `Steam application ${application.key} promoteId ${application.promoteId} must resolve to a promote_content.json entry.`,
      );
    }
  }

  const catalog = publishedCatalog;
  const activityMetricsAsset = await loadActivityMetrics(resolveSourcePath('/activity-metrics.json'));

  assert(typeof catalog.version === 'string' && catalog.version.length > 0, 'Catalog version is required.');
  assert(typeof catalog.generatedAt === 'string' && catalog.generatedAt.length > 0, 'Catalog generatedAt is required.');
  assert(Array.isArray(catalog.entries), 'Catalog entries must be an array.');
  assert(activityMetricsAsset, 'Activity metrics asset is required.');

  let sawActivityEntry = false;
  let sawAboutEntry = false;
  let sawDesignEntry = false;
  let sawAgentTemplatesEntry = false;
  let sawCharacterTemplatesEntry = false;
  let sawPromotionFlagsEntry = false;
  let sawPromotionContentEntry = false;

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

    if (entry.id === aboutEntryId) {
      sawAboutEntry = true;
      assert(entry.path === '/about.json', 'About entry path must be /about.json.');
    }

    if (entry.id === designEntryId) {
      sawDesignEntry = true;
      assert(entry.path === '/design.json', 'Design entry path must be /design.json.');
      assert(entry.lastUpdated === designPayload.updatedAt, 'Design entry lastUpdated must match /design.json.');
      assert(
        entry.sourceRepo === 'VoltAgent/awesome-design-md',
        'Design entry sourceRepo must stay VoltAgent/awesome-design-md.',
      );
      assert(
        entry.sourceUrl === 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md',
        'Design entry sourceUrl must point to the upstream design-md tree.',
      );

      for (const theme of designPayload.themes) {
        const readmePath = path.join(projectRoot, 'vendor', 'awesome-design-md', 'design-md', theme.slug, 'README.md');
        const readmeMetadata = await parseDesignReadmeMetadata(readmePath);
        assert(theme.title === readmeMetadata.title, `Design theme ${theme.slug} title must match README.md.`);
        assert(theme.previewLightImageUrl === readmeMetadata.light.url, `Design theme ${theme.slug} previewLightImageUrl must match README.md.`);
        assert(theme.previewDarkImageUrl === readmeMetadata.dark.url, `Design theme ${theme.slug} previewDarkImageUrl must match README.md.`);
        assert(theme.previewLightAlt === readmeMetadata.light.alt, `Design theme ${theme.slug} previewLightAlt must match README.md.`);
        assert(theme.previewDarkAlt === readmeMetadata.dark.alt, `Design theme ${theme.slug} previewDarkAlt must match README.md.`);
      }
    }

    if (entry.id === agentTemplatesEntryId) {
      sawAgentTemplatesEntry = true;
      await validateAgentTemplateManifest(entry, publishedRoot);
    }

    if (entry.id === characterTemplatesEntryId) {
      sawCharacterTemplatesEntry = true;
      await validateCharacterTemplateManifest(entry, publishedRoot);
    }

    if (entry.id === promotionFlagsEntryId) {
      sawPromotionFlagsEntry = true;
      assert(entry.path === '/promote.json', 'Promotion flags entry path must be /promote.json.');
      assert(entry.sourceRepo === 'repos/index', 'Promotion flags entry sourceRepo must be repos/index.');
      assert(entry.status === 'published', 'Promotion flags entry status must be published.');
    }

    if (entry.id === promotionContentEntryId) {
      sawPromotionContentEntry = true;
      assert(entry.path === '/promote_content.json', 'Promotion content entry path must be /promote_content.json.');
      assert(entry.sourceRepo === 'repos/index', 'Promotion content entry sourceRepo must be repos/index.');
      assert(entry.status === 'published', 'Promotion content entry status must be published.');
    }
  }

  assert(sawActivityEntry, 'Catalog must include an activity-metrics entry.');
  assert(sawAboutEntry, 'Catalog must include an about entry.');
  assert(sawDesignEntry, 'Catalog must include a design-theme-catalog entry.');
  assert(sawAgentTemplatesEntry, 'Catalog must include an agent-templates entry.');
  assert(sawCharacterTemplatesEntry, 'Catalog must include a character-templates entry.');
  assert(sawPromotionFlagsEntry, 'Catalog must include a promotion-flags entry.');
  assert(sawPromotionContentEntry, 'Catalog must include a promotion-content entry.');

  console.log(`Validated ${catalog.entries.length} catalog entries, ${routeMappedJsonPaths.length} route-mapped JSON assets, and ${publishedJsonCount} published JSON assets.`);
}

const publishedRootArg = getCliOption('--published-root');
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  validateCatalog({ publishedRoot: resolvePublishedRoot(publishedRootArg ?? undefined) }).catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
