import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');

test('catalog validation script succeeds', async () => {
  const { stdout } = await execFileAsync('node', ['./scripts/validate-catalog.mjs'], {
    cwd: projectRoot,
  });

  assert.match(stdout, /Validated \d+ catalog entries\./);
});

test('catalog exposes managed server and desktop entries', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const entryIds = catalog.entries.map((entry) => entry.id);

  assert.deepEqual(entryIds, ['presets-catalog', 'server-packages', 'desktop-packages', 'activity-metrics']);
});

test('managed package entries expose stable history page paths', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const desktopEntry = catalog.entries.find((entry) => entry.id === 'desktop-packages');

  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(desktopEntry.historyPagePath, '/desktop/history/');
});

test('activity metrics catalog entry mirrors the current raw snapshot summary', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const activityMetricsPath = path.join(projectRoot, 'public', 'activity-metrics.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const activityMetrics = JSON.parse(await readFile(activityMetricsPath, 'utf8'));
  const activityEntry = catalog.entries.find((entry) => entry.id === 'activity-metrics');

  assert.equal(activityEntry.path, '/activity-metrics.json');
  assert.equal(activityEntry.lastUpdated, activityMetrics.lastUpdated);
  assert.deepEqual(activityEntry.activityMetrics, {
    activeUsers: activityMetrics.clarity.activeUsers,
    activeSessions: activityMetrics.clarity.activeSessions,
    dateRange: activityMetrics.clarity.dateRange,
  });
});
