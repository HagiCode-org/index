import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadDesignCatalog } from '../src/lib/load-design-catalog.ts';
import { SUPPORTED_DESKTOP_LANGUAGE_CODES } from '../src/lib/desktop-language-contract.ts';
import { loadIndexCatalog } from '../src/lib/load-index-catalog.ts';
import { loadPackageHistory } from '../src/lib/load-package-history.ts';
import { loadSitesCatalog } from '../src/lib/load-sites-catalog.ts';
import { loadRouteMappedJson } from '../src/lib/json-publication.ts';

const supportedPromotoLocales = [...SUPPORTED_DESKTOP_LANGUAGE_CODES].sort();
const subSitePromotions = [
  ['subsite-awesome', 'https://awesome.hagicode.com/'],
  ['subsite-design', 'https://design.hagicode.com/'],
  ['subsite-openspec', 'https://openspec.hagicode.com/'],
  ['subsite-omniroute', 'https://omniroute.hagicode.com/'],
];

test('loadIndexCatalog reads source-side route-mapped catalog with stable published paths', async () => {
  const catalog = await loadIndexCatalog();
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const aboutEntry = catalog.entries.find((entry) => entry.id === 'about');
  const designEntry = catalog.entries.find((entry) => entry.id === 'design-theme-catalog');
  const steamDataEntry = catalog.entries.find((entry) => entry.id === 'steam-data');
  const steamAchievementsEntry = catalog.entries.find((entry) => entry.id === 'steam-achievements');
  const promotionFlagsEntry = catalog.entries.find((entry) => entry.id === 'promotion-flags');
  const promotionContentEntry = catalog.entries.find((entry) => entry.id === 'promotion-content');

  assert.ok(serverEntry, 'server-packages entry is required.');
  assert.ok(aboutEntry, 'about entry is required.');
  assert.ok(designEntry, 'design-theme-catalog entry is required.');
  assert.ok(steamDataEntry, 'steam-data entry is required.');
  assert.ok(steamAchievementsEntry, 'steam-achievements entry is required.');
  assert.ok(promotionFlagsEntry, 'promotion-flags entry is required.');
  assert.ok(promotionContentEntry, 'promotion-content entry is required.');
  assert.equal(serverEntry.path, '/server/index.json');
  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(aboutEntry.path, '/about.json');
  assert.equal(designEntry.path, '/design.json');
  assert.equal(steamDataEntry.path, '/steam/index.json');
  assert.equal(steamAchievementsEntry.path, '/steam/achievements.json');
  assert.equal(promotionFlagsEntry.path, '/promote.json');
  assert.equal(promotionContentEntry.path, '/promote_content.json');
});

test('loadPackageHistory keeps the existing raw JSON contract for server and desktop history pages', async () => {
  const serverPage = await loadPackageHistory('server');
  const desktopPage = await loadPackageHistory('desktop');

  assert.equal(serverPage.sourceJsonPath, '/server/index.json');
  assert.equal(desktopPage.sourceJsonPath, '/desktop/index.json');
  assert.equal(serverPage.releases.length > 0, true);
  assert.equal(desktopPage.releases.length > 0, true);
  assert.equal(serverPage.releases[0].fileCount > 0, true);
  assert.equal(desktopPage.releases[0].fileCount > 0, true);
  assert.equal(serverPage.releases[0].files.length, serverPage.releases[0].fileCount);
  assert.equal(desktopPage.releases[0].files.length, desktopPage.releases[0].fileCount);
  assert.equal(serverPage.releases[0].actions.at(-1)?.href, '/server/index.json');
  assert.equal(desktopPage.releases[0].actions.at(-1)?.href, '/desktop/index.json');
  assert.equal(serverPage.releases[0].files[0].href?.startsWith('https://dl-server.hagicode.com/'), true);
  assert.equal(desktopPage.releases[0].files[0].href?.startsWith('https://dl-desktop.hagicode.com/'), true);
});

test('loadSitesCatalog reads the source-side route-mapped portal catalog with canonical production URLs', async () => {
  const sitesCatalog = await loadSitesCatalog();
  const sitesCatalogEn = await loadSitesCatalog('en-US');
  const mainSiteEntry = sitesCatalog.entries.find((entry) => entry.id === 'hagicode-main');
  const dataMirrorEntry = sitesCatalog.entries.find((entry) => entry.id === 'index-data');
  const englishGroup = sitesCatalogEn.groups.find((group) => group.id === 'core-sites');
  const englishMainSiteEntry = sitesCatalogEn.entries.find((entry) => entry.id === 'hagicode-main');

  assert.equal(sitesCatalog.groups.length > 0, true);
  assert.ok(mainSiteEntry, 'hagicode-main entry is required.');
  assert.ok(dataMirrorEntry, 'index-data entry is required.');
  assert.ok(englishGroup, 'english core-sites group is required.');
  assert.ok(englishMainSiteEntry, 'english hagicode-main entry is required.');
  assert.equal(mainSiteEntry.url, 'https://www.hagicode.com/');
  assert.equal(dataMirrorEntry.url, 'https://index.hagicode.com/data/');
  assert.equal(mainSiteEntry.title, 'HagiCode 主站');
  assert.equal(englishGroup.label, 'Core Sites');
  assert.equal(englishMainSiteEntry.title, 'HagiCode Main Site');
  assert.equal(englishMainSiteEntry.actionLabel, 'Open main site');
});

test('live broadcast route-mapped JSON keeps the canonical schedule contract', async () => {
  const liveBroadcast = await loadRouteMappedJson('/live-broadcast.json');

  assert.equal(liveBroadcast.schedule.previewStartTime, '18:00');
  assert.equal(liveBroadcast.schedule.startTime, '20:00');
  assert.equal(liveBroadcast.schedule.endTime, '21:00');
  assert.deepEqual(liveBroadcast.schedule.excludedWeekdays, [4]);
  assert.equal('imageUrl' in liveBroadcast.qrCode, false);
  assert.equal(liveBroadcast.locales.en.title, 'Daily Hagi Live Coding Room');
});

test('legal documents route-mapped JSON keeps the desktop legal metadata contract stable', async () => {
  const legalDocuments = await loadRouteMappedJson('/legal-documents.json');
  const eula = legalDocuments.documents.find((entry) => entry.documentType === 'eula');
  const privacyPolicy = legalDocuments.documents.find((entry) => entry.documentType === 'privacy-policy');

  assert.equal(legalDocuments.schemaVersion, '1.0.0');
  assert.equal(typeof legalDocuments.publishedAt, 'string');
  assert.ok(eula, 'eula entry is required.');
  assert.ok(privacyPolicy, 'privacy-policy entry is required.');
  assert.equal(eula.revision, '2026-04-15');
  assert.equal(eula.effectiveDate, '2026-04-15');
  assert.equal(eula.locales['zh-CN'].browserOpenUrl, 'https://docs.hagicode.com/legal/eula/');
  assert.equal(eula.locales['en-US'].browserOpenUrl, 'https://docs.hagicode.com/en/legal/eula/');
  assert.equal(privacyPolicy.revision, '2026-04-15');
  assert.equal(privacyPolicy.locales['zh-CN'].title, '隐私政策');
  assert.equal(privacyPolicy.locales['en-US'].title, 'Privacy Policy');
});

test('localized tips route-mapped JSON loads valid English and Chinese payloads', async () => {
  const englishTips = await loadRouteMappedJson('/tips-en-US.json');
  const chineseTips = await loadRouteMappedJson('/tips-zh-CN.json');

  for (const [payload, locale] of [[englishTips, 'en-US'], [chineseTips, 'zh-CN']]) {
    assert.equal(payload.schemaVersion, '1.0.0');
    assert.equal(payload.locale, locale);
    assert.equal(typeof payload.updatedAt, 'string');
    assert.equal(Array.isArray(payload.tips), true);
    assert.equal(payload.tips.length > 0, true);

    const ids = new Set();
    for (const tip of payload.tips) {
      assert.equal(typeof tip.id, 'string');
      assert.equal(tip.id.trim().length > 0, true);
      assert.equal(typeof tip.text, 'string');
      assert.equal(tip.text.trim().length > 0, true);
      assert.equal(typeof tip.category, 'string');
      assert.equal(tip.category.trim().length > 0, true);
      assert.equal(ids.has(tip.id), false);
      ids.add(tip.id);
    }
  }
});

test('about route-mapped JSON loads the canonical structured about contract', async () => {
  const about = await loadRouteMappedJson('/about.json');
  const youtubeEntry = about.entries.find((entry) => entry.id === 'youtube');
  const productHuntEntry = about.entries.find((entry) => entry.id === 'product-hunt');
  const steamEntry = about.entries.find((entry) => entry.id === 'steam');
  const xiaohongshuEntry = about.entries.find((entry) => entry.id === 'xiaohongshu');
  const douyinQrEntry = about.entries.find((entry) => entry.id === 'douyin-qr');
  const wechatEntry = about.entries.find((entry) => entry.id === 'wechat-account');

  assert.equal(about.version, '1.0.0');
  assert.equal(typeof about.updatedAt, 'string');
  assert.equal(Array.isArray(about.entries), true);
  assert.ok(youtubeEntry, 'youtube entry is required.');
  assert.ok(productHuntEntry, 'product-hunt entry is required.');
  assert.ok(steamEntry, 'steam entry is required.');
  assert.ok(xiaohongshuEntry, 'xiaohongshu entry is required.');
  assert.ok(douyinQrEntry, 'douyin-qr entry is required.');
  assert.ok(wechatEntry, 'wechat-account entry is required.');
  assert.equal(youtubeEntry.type, 'link');
  assert.equal(youtubeEntry.label, 'YouTube');
  assert.equal(youtubeEntry.regionPriority, 'international-first');
  assert.equal(youtubeEntry.url, 'https://www.youtube.com/@hagicode');
  assert.equal(productHuntEntry.type, 'link');
  assert.equal(productHuntEntry.label, 'Product Hunt');
  assert.equal(productHuntEntry.regionPriority, 'international-first');
  assert.equal(productHuntEntry.url, 'https://www.producthunt.com/products/hagicode');
  assert.equal(steamEntry.type, 'link');
  assert.equal(steamEntry.label, 'Steam');
  assert.equal(steamEntry.regionPriority, 'international-first');
  assert.equal(steamEntry.url, 'https://store.steampowered.com/app/4625540/Hagicode/');
  assert.equal(xiaohongshuEntry.type, 'contact');
  assert.equal(xiaohongshuEntry.regionPriority, 'china-first');
  assert.equal(xiaohongshuEntry.value, '11671904293');
  assert.equal(douyinQrEntry.type, 'qr');
  assert.equal(douyinQrEntry.regionPriority, 'china-first');
  assert.match(douyinQrEntry.imageUrl, /^\/_astro\/.+\.(avif|jpg)$/);
  assert.equal(Number.isInteger(douyinQrEntry.width) && douyinQrEntry.width > 0, true);
  assert.equal(Number.isInteger(douyinQrEntry.height) && douyinQrEntry.height > 0, true);
  assert.equal(typeof douyinQrEntry.alt, 'string');
  assert.equal(wechatEntry.type, 'qr');
  assert.equal(wechatEntry.regionPriority, 'china-first');
});

test('design route-mapped JSON loads awesome-design-md themes and README-derived preview screenshots', async () => {
  const design = await loadDesignCatalog();
  const linearTheme = design.themes.find((entry) => entry.slug === 'linear.app');
  const xaiTheme = design.themes.find((entry) => entry.slug === 'x.ai');

  assert.equal(design.version, '1.0.0');
  assert.equal(design.vendorPath, 'vendor/awesome-design-md');
  assert.equal(design.sourceRepository, 'https://github.com/VoltAgent/awesome-design-md');
  assert.equal(design.detailBaseUrl, 'https://design.hagicode.com/designs/');
  assert.equal(design.themeCount, 58);
  assert.equal(design.themes.length, 58);
  assert.ok(linearTheme, 'linear.app theme is required.');
  assert.ok(xaiTheme, 'x.ai theme is required.');
  assert.equal(linearTheme.previewLightImageUrl, 'https://pub-2e4ecbcbc9b24e7b93f1a6ab5b2bc71f.r2.dev/designs/linear.app/preview-screenshot.png');
  assert.equal(linearTheme.previewDarkImageUrl, 'https://pub-2e4ecbcbc9b24e7b93f1a6ab5b2bc71f.r2.dev/designs/linear.app/preview-dark-screenshot.png');
  assert.equal(linearTheme.previewLightAlt, 'Linear Design System — Light Mode');
  assert.equal(linearTheme.previewDarkAlt, 'Linear Design System — Dark Mode');
  assert.equal(linearTheme.designDownloadUrl, 'https://design.hagicode.com/designs/linear.app/DESIGN.md');
  assert.equal(xaiTheme.detailUrl, 'https://design.hagicode.com/designs/x.ai/');
  assert.equal(xaiTheme.designUrl, 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md');
  assert.equal(xaiTheme.designDownloadUrl, 'https://design.hagicode.com/designs/x.ai/DESIGN.md');
  assert.equal(xaiTheme.previewLightImageUrl.endsWith('.html'), false);
  assert.equal(xaiTheme.previewDarkImageUrl.endsWith('.html'), false);
});

test('steam route-mapped JSON publishes the canonical application mapping for Hagicode, Turbo Engine, and Hagicode Plus', async () => {
  const steamData = await loadRouteMappedJson('/steam/index.json');
  const steamAchievements = await loadRouteMappedJson('/steam/achievements.json');
  const hagicodeEntry = steamData.applications.find((entry) => entry.key === 'hagicode');
  const turboEngineEntry = steamData.applications.find((entry) => entry.key === 'turbo-engine');
  const hagicodePlusBundle = steamData.bundles.find((entry) => entry.key === 'hagicode-plus');
  const createAchievement = steamData.achievements.find((entry) => entry.steamApiName === 'HAGICODE_CREATE');
  const tokenAchievement = steamAchievements.achievements.find((entry) => entry.steamApiName === 'HAGICODE_TOKEN_CONSUMPTION');

  assert.equal(steamData.version, '1.0.0');
  assert.equal(typeof steamData.updatedAt, 'string');
  assert.equal(Array.isArray(steamData.applications), true);
  assert.equal(Array.isArray(steamData.bundles), true);
  assert.equal(Array.isArray(steamData.achievements), true);
  assert.equal(steamData.achievements.length, 19);
  assert.ok(hagicodeEntry, 'hagicode entry is required.');
  assert.ok(turboEngineEntry, 'turbo-engine entry is required.');
  assert.ok(hagicodePlusBundle, 'hagicode-plus bundle entry is required.');
  assert.ok(createAchievement, 'HAGICODE_CREATE achievement is required.');
  assert.equal(createAchievement.localId, 'create');
  assert.equal(createAchievement.displayName['zh-CN'], '开题者');
  assert.equal(createAchievement.steamworks.hidden, false);
  assert.equal(createAchievement.steamworks.statBased, false);
  assert.equal(createAchievement.icons.achieved.width, 256);
  assert.equal(createAchievement.icons.achieved.height, 256);
  assert.equal(createAchievement.icons.achieved.src, '/steam/achievements/icons/hagicode_create.avif');
  assert.equal(createAchievement.icons.locked.src, '/steam/achievements/icons/hagicode_create_locked.avif');
  assert.equal(hagicodeEntry.kind, 'application');
  assert.equal(hagicodeEntry.storeAppId, '4625540');
  assert.equal(hagicodeEntry.platformAppIds.windows, '4625541');
  assert.equal(hagicodeEntry.platformAppIds.linux, '4625542');
  assert.equal(hagicodeEntry.platformAppIds.macos, '4625543');
  assert.equal(hagicodeEntry.storeUrl, 'https://store.steampowered.com/app/4625540/Hagicode/');
  assert.equal(Array.isArray(hagicodeEntry.images), true);
  assert.equal(hagicodeEntry.images.length >= 3, true);
  assert.equal(hagicodeEntry.images.some((entry) => entry.variant === 'store-capsule'), true);
  assert.equal(hagicodeEntry.images.some((entry) => entry.variant === 'library-capsule'), true);
  assert.equal(hagicodeEntry.images.every((entry) => typeof entry.src === 'string' && entry.src.length > 0), true);
  assert.equal(hagicodeEntry.images.every((entry) => Number.isInteger(entry.width) && entry.width > 0), true);
  assert.equal(hagicodeEntry.images.every((entry) => Number.isInteger(entry.height) && entry.height > 0), true);
  assert.equal(hagicodeEntry.images.every((entry) => typeof entry.format === 'string' && entry.format.length > 0), true);
  assert.equal(turboEngineEntry.kind, 'dlc');
  assert.equal(turboEngineEntry.parentKey, 'hagicode');
  assert.equal(turboEngineEntry.storeAppId, '4635480');
  assert.equal(turboEngineEntry.platformAppIds.windows, '4635480');
  assert.equal(turboEngineEntry.platformAppIds.linux, '4635482');
  assert.equal(turboEngineEntry.platformAppIds.macos, '4635481');
  assert.equal(turboEngineEntry.storeUrl, 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/');
  assert.equal(turboEngineEntry.images.some((entry) => entry.variant === 'wide-capsule'), true);
  assert.equal(hagicodePlusBundle.displayName, 'Hagicode Plus');
  assert.equal(hagicodePlusBundle.storeBundleId, '73989');
  assert.equal(hagicodePlusBundle.storeUrl, 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/');
  assert.deepEqual(hagicodePlusBundle.includedApplicationKeys, ['hagicode', 'turbo-engine']);
  assert.equal(hagicodePlusBundle.images.some((entry) => entry.variant === 'store-capsule'), true);
  assert.equal(steamAchievements.applicationKey, 'hagicode');
  assert.equal(steamAchievements.applicationSteamAppId, '4625540');
  assert.equal(steamAchievements.iconSize.width, 256);
  assert.equal(steamAchievements.iconSize.height, 256);
  assert.equal(steamAchievements.achievements.length, 19);
  assert.ok(tokenAchievement, 'HAGICODE_TOKEN_CONSUMPTION achievement is required.');
  assert.equal(tokenAchievement.condition.progressUnitSize, 1000000);
  assert.equal(tokenAchievement.condition.schedulePreset, 'tokenConsumption');
});

test('promotion route-mapped JSON publishes stable flags and localized content contracts', async () => {
  const catalog = await loadIndexCatalog();
  const promote = await loadRouteMappedJson('/promote.json');
  const promoteContent = await loadRouteMappedJson('/promote_content.json');
  const promotionFlagsEntry = catalog.entries.find((entry) => entry.id === 'promotion-flags');
  const promotionContentEntry = catalog.entries.find((entry) => entry.id === 'promotion-content');
  const microsoftStorePromotion = promote.promotes.find((entry) => entry.id === 'desktop-microsoft-store-2026-06-10');
  const microsoftStorePromotionContent = promoteContent.contents.find((entry) => entry.id === 'desktop-microsoft-store-2026-06-10');

  assert.ok(promotionFlagsEntry, 'promotion-flags catalog entry is required for multi-site consumers.');
  assert.ok(promotionContentEntry, 'promotion-content catalog entry is required for multi-site consumers.');
  assert.equal(promotionFlagsEntry.path, '/promote.json');
  assert.equal(promotionContentEntry.path, '/promote_content.json');
  assert.equal(promotionFlagsEntry.status, 'published');
  assert.equal(promotionContentEntry.status, 'published');

  assert.equal(promote.version, '1.0.0');
  assert.equal(typeof promote.updatedAt, 'string');
  assert.equal(Array.isArray(promote.promotes), true);
  assert.ok(microsoftStorePromotion, 'microsoft-store promotion flag is required.');
  assert.equal(microsoftStorePromotion.on, true);
  assert.deepEqual(promote.promotes.map((entry) => Object.keys(entry).sort()), [
    ['id', 'on', 'platforms'],
    ['id', 'on', 'platforms'],
    ['id', 'on', 'platforms'],
    ['id', 'on', 'platforms'],
    ['id', 'on', 'platforms'],
  ]);
  assert.deepEqual(promote.promotes.map((entry) => [entry.id, entry.platforms]), [
    ['desktop-microsoft-store-2026-06-10', ['web']],
    ['subsite-awesome', ['web', 'hagicode']],
    ['subsite-design', ['web', 'hagicode']],
    ['subsite-openspec', ['web', 'hagicode']],
    ['subsite-omniroute', ['web', 'hagicode']],
  ]);

  assert.equal(promoteContent.version, '1.0.0');
  assert.equal(typeof promoteContent.updatedAt, 'string');
  assert.equal(Array.isArray(promoteContent.contents), true);
  assert.ok(microsoftStorePromotionContent, 'microsoft-store promotion content is required.');
  assert.deepEqual(Object.keys(microsoftStorePromotionContent).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title']);
  assert.deepEqual(Object.keys(microsoftStorePromotionContent.title).sort(), supportedPromotoLocales);
  assert.equal(microsoftStorePromotionContent.title['zh-CN'], 'HagiCode for Windows 已上线 Microsoft Store');
  assert.equal(microsoftStorePromotionContent.title['en-US'], 'HagiCode for Windows is now on Microsoft Store');
  assert.match(microsoftStorePromotionContent.description['zh-CN'], /Microsoft Store/);
  assert.match(microsoftStorePromotionContent.description['en-US'], /Microsoft Store/);
  assert.equal(microsoftStorePromotionContent.cta['zh-CN'], '打开 Microsoft Store');
  assert.equal(microsoftStorePromotionContent.cta['en-US'], 'Open Microsoft Store');
  assert.equal(microsoftStorePromotionContent.link, 'https://apps.microsoft.com/detail/9N3PM0N3SVDW');
  assert.equal(microsoftStorePromotionContent.targetPlatform, 'microsoft-store');
  assert.equal(microsoftStorePromotionContent.image.alt, 'HagiCode for Windows Microsoft Store artwork');
});

test('sub-site promotions publish active flags and complete localized content', async () => {
  const promote = await loadRouteMappedJson('/promote.json');
  const promoteContent = await loadRouteMappedJson('/promote_content.json');

  for (const [id, link] of subSitePromotions) {
    const flag = promote.promotes.find((entry) => entry.id === id);
    const content = promoteContent.contents.find((entry) => entry.id === id);

    assert.ok(flag, `${id} flag is required.`);
    assert.equal(flag.on, true, id);
    assert.deepEqual(flag.platforms, ['web', 'hagicode'], id);
    assert.ok(content, `${id} content is required.`);
    assert.deepEqual(Object.keys(content).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title'], id);
    assert.equal(content.link, link, id);
    assert.equal(content.targetPlatform, 'website', id);
    for (const field of ['title', 'description', 'cta']) {
      assert.deepEqual(Object.keys(content[field]).sort(), supportedPromotoLocales, `${id} ${field}`);
    }
    assert.equal(content.image.alt.length > 0, true, id);
  }

  const openspecContent = promoteContent.contents.find((entry) => entry.id === 'subsite-openspec');
  assert.match(openspecContent.title['zh-CN'], /OpenSpec/);
  assert.match(openspecContent.description['en-US'], /proposal/);
  assert.match(openspecContent.description['zh-CN'], /提案/);
  assert.doesNotMatch(openspecContent.description['en-US'], /docs|documentation/i);
  assert.doesNotMatch(openspecContent.description['zh-CN'], /文档/);
  assert.match(promoteContent.contents.find((entry) => entry.id === 'subsite-omniroute').title['en-US'], /OmniRoute/);
  assert.match(promoteContent.contents.find((entry) => entry.id === 'subsite-design').description['en-US'], /DESIGN\.md/);
});

test('published promote_content.json is minified and gives each entry three distinct tier src values', async () => {
  const raw = await readFile(path.join(process.cwd(), process.env.INDEX_BUILD_ROOT ?? 'dist', 'promote_content.json'), 'utf8');
  const payload = JSON.parse(raw);

  assert.equal(raw, JSON.stringify(payload));

  for (const content of payload.contents) {
    const sources = content.image.sources.map((source) => source.src);

    assert.equal(sources.length, 3, content.id);
    assert.equal(new Set(sources).size, 3, content.id);
  }
});

test('promotion route-mapped JSON keeps business fields and orders each image fallback chain', async () => {
  const promoteContent = await loadRouteMappedJson('/promote_content.json');

  for (const content of promoteContent.contents) {
    assert.deepEqual(Object.keys(content).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title'], content.id);

    const { sources, ...descriptor } = content.image;
    assert.deepEqual(Object.keys(descriptor).sort(), ['alt', 'format', 'height', 'src', 'width'], content.id);

    const original = descriptor.format === 'jpg' ? 'jpeg' : descriptor.format;
    const expectedFormats = [...['avif', 'webp'].filter((format) => format !== original), descriptor.format];
    assert.deepEqual(sources.map((source) => source.format), expectedFormats, content.id);
    assert.deepEqual(
      sources.at(-1),
      { format: descriptor.format, type: `image/${original}`, src: descriptor.src, width: descriptor.width, height: descriptor.height },
      content.id,
    );
  }
});
