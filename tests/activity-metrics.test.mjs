import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile } from 'node:fs/promises';
import {
  loadActivityMetrics,
  mergeActivityMetrics,
  mergeHistoryEntries,
  updateActivityMetrics,
  validateActivityMetricsShape,
} from '../scripts/update-activity-metrics.mjs';

function buildMetrics({
  lastUpdated = '2026-03-24T00:00:00.000Z',
  repository = 'newbe36524/hagicode',
  pullCount = 1,
  activeUsers = 2,
  activeSessions = 3,
  history = null,
} = {}) {
  return {
    lastUpdated,
    dockerHub: {
      repository,
      pullCount,
    },
    clarity: {
      activeUsers,
      activeSessions,
      dateRange: '3Days',
    },
    history:
      history ?? [
        {
          date: lastUpdated,
          dockerHub: { pullCount },
          clarity: { activeUsers, activeSessions },
        },
      ],
  };
}

test('validateActivityMetricsShape accepts the expected JSON contract', () => {
  const metrics = buildMetrics();
  const validated = validateActivityMetricsShape(metrics);

  assert.equal(validated.dockerHub.repository, 'newbe36524/hagicode');
  assert.equal(validated.history.length, 1);
});

test('mergeActivityMetrics creates the first history entry on first run', () => {
  const now = new Date('2026-03-24T08:30:00.000Z');
  const result = mergeActivityMetrics({
    existingData: null,
    dockerHubMetrics: {
      repository: 'newbe36524/hagicode',
      pullCount: 10,
    },
    clarityMetrics: {
      activeUsers: 20,
      activeSessions: 30,
      dateRange: '3Days',
    },
    now,
  });

  assert.equal(result.data.history.length, 1);
  assert.equal(result.data.history[0].dockerHub.pullCount, 10);
  assert.deepEqual(result.warnings, []);
});

test('mergeActivityMetrics deduplicates same-day reruns', () => {
  const existingData = buildMetrics({
    lastUpdated: '2026-03-24T01:00:00.000Z',
    pullCount: 5,
    activeUsers: 6,
    activeSessions: 7,
  });
  const now = new Date('2026-03-24T12:00:00.000Z');

  const result = mergeActivityMetrics({
    existingData,
    dockerHubMetrics: {
      repository: 'newbe36524/hagicode',
      pullCount: 99,
    },
    clarityMetrics: {
      activeUsers: 55,
      activeSessions: 77,
      dateRange: '3Days',
    },
    now,
  });

  assert.equal(result.data.history.length, 1);
  assert.equal(result.data.history[0].dockerHub.pullCount, 99);
  assert.equal(result.data.history[0].clarity.activeUsers, 55);
});

test('mergeHistoryEntries retains only the most recent 90 UTC days', () => {
  const now = new Date('2026-03-24T00:00:00.000Z');
  const history = Array.from({ length: 95 }, (_, index) => {
    const date = new Date('2025-12-20T00:00:00.000Z');
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString(),
      dockerHub: { pullCount: index },
      clarity: { activeUsers: index, activeSessions: index },
    };
  });
  const entry = {
    date: now.toISOString(),
    dockerHub: { pullCount: 999 },
    clarity: { activeUsers: 999, activeSessions: 999 },
  };

  const merged = mergeHistoryEntries(history, entry, now);

  assert.equal(merged.length, 90);
  assert.equal(merged[0].date, '2025-12-25T00:00:00.000Z');
  assert.equal(merged.at(-1)?.date, '2026-03-24T00:00:00.000Z');
});

test('mergeActivityMetrics preserves the last valid clarity snapshot when Clarity returns zeros', () => {
  const existingData = buildMetrics({
    lastUpdated: '2026-03-23T00:00:00.000Z',
    pullCount: 5,
    activeUsers: 42,
    activeSessions: 84,
    history: [
      {
        date: '2026-03-23T00:00:00.000Z',
        dockerHub: { pullCount: 5 },
        clarity: { activeUsers: 42, activeSessions: 84 },
      },
    ],
  });
  const now = new Date('2026-03-24T00:00:00.000Z');

  const result = mergeActivityMetrics({
    existingData,
    dockerHubMetrics: {
      repository: 'newbe36524/hagicode',
      pullCount: 6,
    },
    clarityMetrics: {
      activeUsers: 0,
      activeSessions: 0,
      dateRange: '3Days',
    },
    now,
  });

  assert.equal(result.data.clarity.activeUsers, 42);
  assert.equal(result.data.history.at(-1)?.clarity.activeSessions, 84);
  assert.deepEqual(result.warnings, ['clarity_preserved_from_previous_snapshot']);
});

test('updateActivityMetrics writes the JSON asset and keeps the stable shape', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'index-activity-metrics-'));
  const filePath = path.join(tempDir, 'activity-metrics.json');
  const responses = [
    {
      ok: true,
      json: async () => ({ pull_count: 123 }),
    },
    {
      ok: true,
      json: async () => [
        {
          metricName: 'Traffic',
          information: [{ distinctUserCount: '7', totalSessionCount: '11' }],
        },
      ],
    },
  ];

  const fetchImpl = async () => {
    const next = responses.shift();
    assert.ok(next, 'Unexpected fetch call.');
    return next;
  };

  const result = await updateActivityMetrics({
    now: new Date('2026-03-24T10:00:00.000Z'),
    filePath,
    env: {
      DOCKER_HUB_REPOSITORY: 'newbe36524/hagicode',
      CLARITY_API_KEY: 'token',
      HAGICODE_CLARITY_PROJECT_ID: 'project-id',
    },
    fetchImpl,
  });

  const stored = JSON.parse(await readFile(filePath, 'utf8'));
  const loaded = await loadActivityMetrics(filePath);

  assert.equal(stored.dockerHub.pullCount, 123);
  assert.equal(stored.clarity.activeUsers, 7);
  assert.equal(stored.history.length, 1);
  assert.equal(loaded?.history.length, 1);
  assert.deepEqual(result.warnings, []);
});
