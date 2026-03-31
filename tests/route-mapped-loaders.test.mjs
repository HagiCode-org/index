import test from 'node:test';
import assert from 'node:assert/strict';

import { loadIndexCatalog } from '../src/lib/load-index-catalog.ts';
import { loadPackageHistory } from '../src/lib/load-package-history.ts';
import { loadRouteMappedJson } from '../src/lib/json-publication.ts';

test('loadIndexCatalog reads source-side route-mapped catalog with stable published paths', async () => {
  const catalog = await loadIndexCatalog();
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const activityEntry = catalog.entries.find((entry) => entry.id === 'activity-metrics');

  assert.ok(serverEntry, 'server-packages entry is required.');
  assert.ok(activityEntry, 'activity-metrics entry is required.');
  assert.equal(serverEntry.path, '/server/index.json');
  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(activityEntry.path, '/activity-metrics.json');
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

test('live broadcast route-mapped JSON keeps the canonical schedule contract', async () => {
  const liveBroadcast = await loadRouteMappedJson('/live-broadcast.json');

  assert.equal(liveBroadcast.schedule.previewStartTime, '18:00');
  assert.equal(liveBroadcast.schedule.startTime, '20:00');
  assert.equal(liveBroadcast.schedule.endTime, '21:00');
  assert.deepEqual(liveBroadcast.schedule.excludedWeekdays, [4]);
  assert.equal('imageUrl' in liveBroadcast.qrCode, false);
  assert.equal(liveBroadcast.locales.en.title, 'Daily Hagi Live Coding Room');
});
