import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDesignCatalog } from '../src/lib/load-design-catalog.ts';
import { loadIndexCatalog } from '../src/lib/load-index-catalog.ts';
import { loadPackageHistory } from '../src/lib/load-package-history.ts';
import { loadSitesCatalog } from '../src/lib/load-sites-catalog.ts';
import { loadRouteMappedJson } from '../src/lib/json-publication.ts';

test('loadIndexCatalog reads source-side route-mapped catalog with stable published paths', async () => {
  const catalog = await loadIndexCatalog();
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const activityEntry = catalog.entries.find((entry) => entry.id === 'activity-metrics');
  const aboutEntry = catalog.entries.find((entry) => entry.id === 'about');
  const designEntry = catalog.entries.find((entry) => entry.id === 'design-theme-catalog');
  const steamDataEntry = catalog.entries.find((entry) => entry.id === 'steam-data');
  const steamAchievementsEntry = catalog.entries.find((entry) => entry.id === 'steam-achievements');
  const promotionFlagsEntry = catalog.entries.find((entry) => entry.id === 'promotion-flags');
  const promotionContentEntry = catalog.entries.find((entry) => entry.id === 'promotion-content');

  assert.ok(serverEntry, 'server-packages entry is required.');
  assert.ok(activityEntry, 'activity-metrics entry is required.');
  assert.ok(aboutEntry, 'about entry is required.');
  assert.ok(designEntry, 'design-theme-catalog entry is required.');
  assert.ok(steamDataEntry, 'steam-data entry is required.');
  assert.ok(steamAchievementsEntry, 'steam-achievements entry is required.');
  assert.ok(promotionFlagsEntry, 'promotion-flags entry is required.');
  assert.ok(promotionContentEntry, 'promotion-content entry is required.');
  assert.equal(serverEntry.path, '/server/index.json');
  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(activityEntry.path, '/activity-metrics.json');
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
  assert.equal(serverPage.releases[0].files[0].href?.startsWith('https://server.dl.hagicode.com/'), true);
  assert.equal(desktopPage.releases[0].files[0].href?.startsWith('https://desktop.dl.hagicode.com/'), true);
});

test('loadSitesCatalog reads the source-side route-mapped portal catalog with canonical production URLs', async () => {
  const sitesCatalog = await loadSitesCatalog();
  const mainSiteEntry = sitesCatalog.entries.find((entry) => entry.id === 'hagicode-main');
  const dataMirrorEntry = sitesCatalog.entries.find((entry) => entry.id === 'index-data');

  assert.equal(sitesCatalog.groups.length > 0, true);
  assert.ok(mainSiteEntry, 'hagicode-main entry is required.');
  assert.ok(dataMirrorEntry, 'index-data entry is required.');
  assert.equal(mainSiteEntry.url, 'https://hagicode.com/');
  assert.equal(dataMirrorEntry.url, 'https://index.hagicode.com/data/');
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
  assert.match(douyinQrEntry.imageUrl, /^\/_astro\/.+\.(png|jpg)$/);
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
  assert.equal(createAchievement.icons.achieved.src, '/steam/achievements/icons/hagicode_create.png');
  assert.equal(createAchievement.icons.locked.src, '/steam/achievements/icons/hagicode_create_locked.png');
  assert.equal(hagicodeEntry.kind, 'application');
  assert.equal(hagicodeEntry.storeAppId, '4625540');
  assert.equal(hagicodeEntry.platformAppIds.windows, '4625541');
  assert.equal(hagicodeEntry.platformAppIds.linux, '4625542');
  assert.equal(hagicodeEntry.platformAppIds.macos, '4625543');
  assert.equal(hagicodeEntry.promoteId, 'main-game-2026-04-29');
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
  const mainPromotion = promote.promotes.find((entry) => entry.id === 'main-game-2026-04-29');
  const eaPromotion = promote.promotes.find((entry) => entry.id === 'main-game-steam-ea-2026-04-29');
  const plusPromotion = promote.promotes.find((entry) => entry.id === 'hagicode-plus-bundle');
  const turboPromotion = promote.promotes.find((entry) => entry.id === 'hagicode-turbo-engine-dlc');
  const mainPromotionContent = promoteContent.contents.find((entry) => entry.id === 'main-game-2026-04-29');
  const eaPromotionContent = promoteContent.contents.find((entry) => entry.id === 'main-game-steam-ea-2026-04-29');
  const plusPromotionContent = promoteContent.contents.find((entry) => entry.id === 'hagicode-plus-bundle');
  const turboPromotionContent = promoteContent.contents.find((entry) => entry.id === 'hagicode-turbo-engine-dlc');

  assert.ok(promotionFlagsEntry, 'promotion-flags catalog entry is required for multi-site consumers.');
  assert.ok(promotionContentEntry, 'promotion-content catalog entry is required for multi-site consumers.');
  assert.equal(promotionFlagsEntry.path, '/promote.json');
  assert.equal(promotionContentEntry.path, '/promote_content.json');
  assert.equal(promotionFlagsEntry.status, 'published');
  assert.equal(promotionContentEntry.status, 'published');

  assert.equal(promote.version, '1.0.0');
  assert.equal(typeof promote.updatedAt, 'string');
  assert.equal(Array.isArray(promote.promotes), true);
  assert.ok(mainPromotion, 'main-game promotion flag is required.');
  assert.ok(eaPromotion, 'main-game Steam EA promotion flag is required.');
  assert.ok(plusPromotion, 'hagicode-plus promotion flag is required.');
  assert.ok(turboPromotion, 'turbo-engine promotion flag is required.');
  assert.equal(mainPromotion.on, true);
  assert.equal(mainPromotion.endTime, '2026-04-29T00:00:00+08:00');
  assert.equal(eaPromotion.on, true);
  assert.equal(eaPromotion.startTime, '2026-04-29T00:00:00+08:00');
  assert.equal(Date.parse(mainPromotion.endTime), Date.parse(eaPromotion.startTime));
  assert.equal(plusPromotion.on, false);
  assert.equal(turboPromotion.on, false);
  assert.deepEqual(promote.promotes.map((entry) => Object.keys(entry).sort()), [
    ['endTime', 'id', 'on'],
    ['id', 'on', 'startTime'],
    ['id', 'on'],
    ['id', 'on'],
  ]);

  assert.equal(promoteContent.version, '1.0.0');
  assert.equal(typeof promoteContent.updatedAt, 'string');
  assert.equal(Array.isArray(promoteContent.contents), true);
  assert.ok(mainPromotionContent, 'main-game promotion content is required.');
  assert.ok(eaPromotionContent, 'main-game Steam EA promotion content is required.');
  assert.ok(plusPromotionContent, 'hagicode-plus promotion content is required.');
  assert.ok(turboPromotionContent, 'turbo-engine promotion content is required.');
  assert.deepEqual(Object.keys(mainPromotionContent).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title']);
  assert.equal(mainPromotionContent.title.zh, '求求加入愿望单');
  assert.equal(mainPromotionContent.title.en, 'Wishlist It, Pretty Please');
  assert.match(mainPromotionContent.description.zh, /Hagicode/);
  assert.match(mainPromotionContent.description.zh, /4月29日/);
  assert.match(mainPromotionContent.description.zh, /求求了/);
  assert.doesNotMatch(mainPromotionContent.description.zh, /游戏将于/);
  assert.match(mainPromotionContent.description.en, /April 29/);
  assert.equal(mainPromotionContent.cta.zh, '加入愿望单');
  assert.equal(mainPromotionContent.cta.en, 'Wishlist on Steam');
  assert.equal(mainPromotionContent.link, 'https://store.steampowered.com/app/4625540/Hagicode/');
  assert.equal(mainPromotionContent.targetPlatform, 'steam');
  assert.equal(typeof mainPromotionContent.image.src, 'string');
  assert.equal(mainPromotionContent.image.src.length > 0, true);
  assert.equal(Number.isInteger(mainPromotionContent.image.width) && mainPromotionContent.image.width > 0, true);
  assert.equal(Number.isInteger(mainPromotionContent.image.height) && mainPromotionContent.image.height > 0, true);
  assert.equal(typeof mainPromotionContent.image.format, 'string');
  assert.equal(typeof mainPromotionContent.image.alt, 'string');
  assert.deepEqual(Object.keys(eaPromotionContent).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title']);
  assert.equal(eaPromotionContent.title.zh, '终于上架 EA 啦');
  assert.equal(eaPromotionContent.title.en, 'Early Access Is Finally Here');
  assert.match(eaPromotionContent.description.zh, /steam/i);
  assert.match(eaPromotionContent.description.zh, /EA|抢先体验/);
  assert.match(eaPromotionContent.description.zh, /呜呜呜/);
  assert.match(eaPromotionContent.description.zh, /求求了/);
  assert.match(eaPromotionContent.description.en, /Steam/);
  assert.match(eaPromotionContent.description.en, /Early Access|EA/);
  assert.match(eaPromotionContent.description.en, /Sob/);
  assert.match(eaPromotionContent.description.en, /Pretty please/);
  assert.equal(eaPromotionContent.cta.zh, '查看抢先体验');
  assert.equal(eaPromotionContent.cta.en, 'View Early Access');
  assert.equal(eaPromotionContent.link, 'https://store.steampowered.com/app/4625540/Hagicode/');
  assert.equal(eaPromotionContent.targetPlatform, 'steam');
  assert.deepEqual(Object.keys(plusPromotionContent).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title']);
  assert.equal(plusPromotionContent.title.zh.length > 0, true);
  assert.equal(plusPromotionContent.title.en.length > 0, true);
  assert.match(plusPromotionContent.description.zh, /15% off/);
  assert.match(plusPromotionContent.description.zh, /呜呜呜/);
  assert.equal(plusPromotionContent.cta.zh, '查看套装');
  assert.equal(plusPromotionContent.cta.en, 'View Bundle');
  assert.equal(plusPromotionContent.link, 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/');
  assert.equal(plusPromotionContent.targetPlatform, 'steam');
  assert.deepEqual(Object.keys(turboPromotionContent).sort(), ['cta', 'description', 'id', 'image', 'link', 'targetPlatform', 'title']);
  assert.equal(turboPromotionContent.title.zh.length > 0, true);
  assert.equal(turboPromotionContent.title.en.length > 0, true);
  assert.match(turboPromotionContent.description.zh, /32/);
  assert.match(turboPromotionContent.description.zh, /求求了/);
  assert.equal(turboPromotionContent.cta.zh, '查看 DLC');
  assert.equal(turboPromotionContent.cta.en, 'View DLC');
  assert.equal(turboPromotionContent.link, 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/');
  assert.equal(turboPromotionContent.targetPlatform, 'steam');
});
