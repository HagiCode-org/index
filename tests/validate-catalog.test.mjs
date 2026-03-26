import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');

function buildActivityMetricsFixture({
  lastUpdated = '2026-03-24T10:00:00.000Z',
  pullCount = 123,
  activeUsers = 7,
  activeSessions = 11,
  dateRange = '3Days',
} = {}) {
  return {
    lastUpdated,
    dockerHub: {
      repository: 'newbe36524/hagicode',
      pullCount,
    },
    clarity: {
      activeUsers,
      activeSessions,
      dateRange,
    },
    history: [
      {
        date: lastUpdated,
        dockerHub: {
          pullCount,
        },
        clarity: {
          activeUsers,
          activeSessions,
        },
      },
    ],
  };
}

function buildCatalogFixture({
  lastUpdated = '2026-03-24T10:00:00.000Z',
  activityMetrics = {
    activeUsers: 7,
    activeSessions: 11,
    dateRange: '3Days',
  },
} = {}) {
  return {
    version: '1.0.0',
    generatedAt: lastUpdated,
    entries: [
      {
        id: 'activity-metrics',
        title: 'Activity Metrics',
        description: '镜像发布 HagiCode Index 的活跃用户快照与 90 天历史。',
        path: '/activity-metrics.json',
        category: 'analytics',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
        activityMetrics,
      },
    ],
  };
}

async function createValidationFixture({ catalog, activityMetrics }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'index-validate-catalog-'));
  const scriptsDir = path.join(tempDir, 'scripts');
  const publicDir = path.join(tempDir, 'public');
  const validateScriptPath = path.join(projectRoot, 'scripts', 'validate-catalog.mjs');
  const updateScriptPath = path.join(projectRoot, 'scripts', 'update-activity-metrics.mjs');

  await mkdir(scriptsDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await writeFile(
    path.join(scriptsDir, 'validate-catalog.mjs'),
    await readFile(validateScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(
    path.join(scriptsDir, 'update-activity-metrics.mjs'),
    await readFile(updateScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(path.join(publicDir, 'index-catalog.json'), JSON.stringify(catalog), 'utf8');
  await writeFile(path.join(publicDir, 'activity-metrics.json'), JSON.stringify(activityMetrics), 'utf8');

  return tempDir;
}

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

  assert.equal(catalog.generatedAt, activityMetrics.lastUpdated);
  assert.equal(activityEntry.path, '/activity-metrics.json');
  assert.equal(activityEntry.lastUpdated, activityMetrics.lastUpdated);
  assert.deepEqual(activityEntry.activityMetrics, {
    activeUsers: activityMetrics.clarity.activeUsers,
    activeSessions: activityMetrics.clarity.activeSessions,
    dateRange: activityMetrics.clarity.dateRange,
  });
});

test('catalog validation fails when the activity metrics catalog entry drifts from the raw snapshot', async () => {
  const activityMetrics = buildActivityMetricsFixture();
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture({
      lastUpdated: '2026-03-23T10:00:00.000Z',
      activityMetrics: {
        activeUsers: 5,
        activeSessions: 9,
        dateRange: '3Days',
      },
    }),
    activityMetrics,
  });

  await assert.rejects(
    () =>
      execFileAsync('node', ['./scripts/validate-catalog.mjs'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /Activity metrics entry lastUpdated must match \/activity-metrics\.json\./,
      );
      return true;
    },
  );
});
