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

  assert.ok(serverEntry, 'server-packages entry is required.');
  assert.ok(activityEntry, 'activity-metrics entry is required.');
  assert.ok(aboutEntry, 'about entry is required.');
  assert.ok(designEntry, 'design-theme-catalog entry is required.');
  assert.equal(serverEntry.path, '/server/index.json');
  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(activityEntry.path, '/activity-metrics.json');
  assert.equal(aboutEntry.path, '/about.json');
  assert.equal(designEntry.path, '/design.json');
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
  const xiaohongshuEntry = about.entries.find((entry) => entry.id === 'xiaohongshu');
  const douyinQrEntry = about.entries.find((entry) => entry.id === 'douyin-qr');
  const wechatEntry = about.entries.find((entry) => entry.id === 'wechat-account');

  assert.equal(about.version, '1.0.0');
  assert.equal(typeof about.updatedAt, 'string');
  assert.equal(Array.isArray(about.entries), true);
  assert.ok(youtubeEntry, 'youtube entry is required.');
  assert.ok(xiaohongshuEntry, 'xiaohongshu entry is required.');
  assert.ok(douyinQrEntry, 'douyin-qr entry is required.');
  assert.ok(wechatEntry, 'wechat-account entry is required.');
  assert.equal(youtubeEntry.type, 'link');
  assert.equal(youtubeEntry.label, 'YouTube');
  assert.equal(youtubeEntry.regionPriority, 'international-first');
  assert.equal(youtubeEntry.url, 'https://www.youtube.com/@hagicode');
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
