import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HISTORY_RETENTION_DAYS = 90;
const DEFAULT_DOCKER_HUB_REPOSITORY = 'newbe36524/hagicode';
const DEFAULT_CLARITY_DATE_RANGE = '3Days';
const REQUIRED_TOP_LEVEL_FIELDS = ['lastUpdated', 'dockerHub', 'clarity', 'history'];
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

export class MetricsUpdateError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'MetricsUpdateError';
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new MetricsUpdateError(message);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDateString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function normalizeInteger(value, fieldName) {
  const number = Number(value);
  assert(Number.isInteger(number) && number >= 0, `${fieldName} must be a non-negative integer.`);
  return number;
}

function validateDockerHubMetrics(value, fieldName = 'dockerHub') {
  assert(isObject(value), `${fieldName} must be an object.`);
  assert(typeof value.repository === 'string' && value.repository.trim().length > 0, `${fieldName}.repository must be a non-empty string.`);

  return {
    repository: value.repository,
    pullCount: normalizeInteger(value.pullCount, `${fieldName}.pullCount`),
  };
}

function validateClarityMetrics(value, fieldName = 'clarity') {
  assert(isObject(value), `${fieldName} must be an object.`);
  assert(typeof value.dateRange === 'string' && value.dateRange.trim().length > 0, `${fieldName}.dateRange must be a non-empty string.`);

  return {
    activeUsers: normalizeInteger(value.activeUsers, `${fieldName}.activeUsers`),
    activeSessions: normalizeInteger(value.activeSessions, `${fieldName}.activeSessions`),
    dateRange: value.dateRange,
  };
}

function validateHistoryEntry(value, index) {
  assert(isObject(value), `history[${index}] must be an object.`);
  assert(isIsoDateString(value.date), `history[${index}].date must be an ISO date string.`);

  const dockerHub = validateDockerHubMetrics(
    {
      repository: DEFAULT_DOCKER_HUB_REPOSITORY,
      pullCount: value.dockerHub?.pullCount,
    },
    `history[${index}].dockerHub`,
  );
  const clarity = validateClarityMetrics(
    {
      activeUsers: value.clarity?.activeUsers,
      activeSessions: value.clarity?.activeSessions,
      dateRange: DEFAULT_CLARITY_DATE_RANGE,
    },
    `history[${index}].clarity`,
  );

  return {
    date: value.date,
    dockerHub: { pullCount: dockerHub.pullCount },
    clarity: {
      activeUsers: clarity.activeUsers,
      activeSessions: clarity.activeSessions,
    },
  };
}

export function validateActivityMetricsShape(value) {
  assert(isObject(value), 'Activity metrics must be an object.');

  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    assert(field in value, `Activity metrics is missing field ${field}.`);
  }

  assert(isIsoDateString(value.lastUpdated), 'lastUpdated must be an ISO date string.');
  const dockerHub = validateDockerHubMetrics(value.dockerHub);
  const clarity = validateClarityMetrics(value.clarity);
  assert(Array.isArray(value.history), 'history must be an array.');

  const history = value.history.map((entry, index) => validateHistoryEntry(entry, index));

  return {
    lastUpdated: value.lastUpdated,
    dockerHub,
    clarity,
    history,
  };
}

export function createHistoryEntry(snapshot, now = new Date()) {
  return {
    date: now.toISOString(),
    dockerHub: {
      pullCount: snapshot.dockerHub.pullCount,
    },
    clarity: {
      activeUsers: snapshot.clarity.activeUsers,
      activeSessions: snapshot.clarity.activeSessions,
    },
  };
}

function getUtcDateKey(input) {
  return input.toISOString().slice(0, 10);
}

function getRetentionCutoff(now, retentionDays = HISTORY_RETENTION_DAYS) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - (retentionDays - 1));
  return cutoff;
}

function isValidClaritySnapshot(clarity) {
  if (!clarity) {
    return false;
  }

  return clarity.activeUsers > 0 || clarity.activeSessions > 0;
}

export function mergeHistoryEntries(existingHistory, entry, now = new Date(), retentionDays = HISTORY_RETENTION_DAYS) {
  const validatedHistory = Array.isArray(existingHistory)
    ? existingHistory.map((item, index) => validateHistoryEntry(item, index))
    : [];
  const nextEntries = validatedHistory.filter((item) => getUtcDateKey(new Date(item.date)) !== getUtcDateKey(now));

  nextEntries.push(entry);
  nextEntries.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  const cutoff = getRetentionCutoff(now, retentionDays).getTime();
  return nextEntries.filter((item) => new Date(item.date).getTime() >= cutoff);
}

export function applyClarityFallback({ existingData, nextSnapshot, warnings }) {
  if (!isValidClaritySnapshot(existingData?.clarity)) {
    return nextSnapshot;
  }

  if (isValidClaritySnapshot(nextSnapshot.clarity)) {
    return nextSnapshot;
  }

  warnings.push('clarity_preserved_from_previous_snapshot');
  return {
    ...nextSnapshot,
    clarity: { ...existingData.clarity },
  };
}

export async function loadActivityMetrics(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return validateActivityMetricsShape(JSON.parse(raw));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw new MetricsUpdateError(`Failed to load ${filePath}.`, { cause: error });
  }
}

async function fetchJson(url, options = {}, fetchImpl = globalThis.fetch) {
  assert(typeof fetchImpl === 'function', 'A fetch implementation is required.');
  const response = await fetchImpl(url, options);

  if (!response.ok) {
    throw new MetricsUpdateError(`HTTP ${response.status} from ${url}`);
  }

  return response.json();
}

export async function fetchDockerHubMetrics({ repository = DEFAULT_DOCKER_HUB_REPOSITORY, fetchImpl = globalThis.fetch } = {}) {
  const url = `https://hub.docker.com/v2/repositories/${repository}`;

  try {
    const payload = await fetchJson(
      url,
      {
        headers: {
          'User-Agent': 'HagiCode-Index-Activity-Metrics/1.0',
        },
      },
      fetchImpl,
    );

    return {
      metrics: {
        repository,
        pullCount: Number.isFinite(Number(payload.pull_count)) ? Number(payload.pull_count) : 0,
      },
      warnings: [],
    };
  } catch (error) {
    console.error(`Docker Hub fetch failed: ${error.message}`);
    return {
      metrics: {
        repository,
        pullCount: 0,
      },
      warnings: ['dockerhub_fetch_failed'],
    };
  }
}

export async function fetchClarityMetrics({ apiKey, projectId, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) {
    console.warn('Clarity API key is missing. Falling back to zero values.');
    return {
      metrics: {
        activeUsers: 0,
        activeSessions: 0,
        dateRange: DEFAULT_CLARITY_DATE_RANGE,
      },
      warnings: ['clarity_api_key_missing'],
    };
  }

  const searchParams = new URLSearchParams({
    numOfDays: '3',
    metricType: 'Traffic',
  });
  const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?${searchParams.toString()}`;

  try {
    const payload = await fetchJson(
      url,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'HagiCode-Index-Activity-Metrics/1.0',
          ...(projectId ? { 'X-Project-Id': projectId } : {}),
        },
      },
      fetchImpl,
    );

    if (!Array.isArray(payload) || payload.length === 0) {
      return {
        metrics: {
          activeUsers: 0,
          activeSessions: 0,
          dateRange: DEFAULT_CLARITY_DATE_RANGE,
        },
        warnings: ['clarity_empty_payload'],
      };
    }

    const trafficMetric = payload.find((item) => item?.metricName === 'Traffic');
    const trafficData = Array.isArray(trafficMetric?.information) ? trafficMetric.information[0] : null;

    if (!trafficData) {
      return {
        metrics: {
          activeUsers: 0,
          activeSessions: 0,
          dateRange: DEFAULT_CLARITY_DATE_RANGE,
        },
        warnings: ['clarity_traffic_metric_missing'],
      };
    }

    return {
      metrics: {
        activeUsers: Number.parseInt(trafficData.distinctUserCount ?? '0', 10) || 0,
        activeSessions: Number.parseInt(trafficData.totalSessionCount ?? '0', 10) || 0,
        dateRange: DEFAULT_CLARITY_DATE_RANGE,
      },
      warnings: [],
    };
  } catch (error) {
    console.error(`Clarity fetch failed: ${error.message}`);
    return {
      metrics: {
        activeUsers: 0,
        activeSessions: 0,
        dateRange: DEFAULT_CLARITY_DATE_RANGE,
      },
      warnings: ['clarity_fetch_failed'],
    };
  }
}

export function mergeActivityMetrics({ existingData, dockerHubMetrics, clarityMetrics, now = new Date() }) {
  const warnings = [];
  let snapshot = {
    lastUpdated: now.toISOString(),
    dockerHub: dockerHubMetrics,
    clarity: clarityMetrics,
    history: [],
  };

  snapshot = applyClarityFallback({ existingData, nextSnapshot: snapshot, warnings });
  const historyEntry = createHistoryEntry(snapshot, now);

  snapshot.history = mergeHistoryEntries(existingData?.history ?? [], historyEntry, now);
  return {
    data: validateActivityMetricsShape(snapshot),
    warnings,
  };
}

export async function writeActivityMetrics(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function updateActivityMetrics({
  now = new Date(),
  filePath = path.join(projectRoot, 'public', 'activity-metrics.json'),
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const repository = env.DOCKER_HUB_REPOSITORY || DEFAULT_DOCKER_HUB_REPOSITORY;
  const existingData = await loadActivityMetrics(filePath);
  const dockerHubResult = await fetchDockerHubMetrics({ repository, fetchImpl });
  const clarityResult = await fetchClarityMetrics({
    apiKey: env.CLARITY_API_KEY,
    projectId: env.HAGICODE_CLARITY_PROJECT_ID,
    fetchImpl,
  });

  const warnings = [...dockerHubResult.warnings, ...clarityResult.warnings];
  const merged = mergeActivityMetrics({
    existingData,
    dockerHubMetrics: dockerHubResult.metrics,
    clarityMetrics: clarityResult.metrics,
    now,
  });

  warnings.push(...merged.warnings);
  await writeActivityMetrics(filePath, merged.data);

  return {
    data: merged.data,
    warnings: [...new Set(warnings)],
  };
}

export async function main() {
  const result = await updateActivityMetrics();
  const summary = {
    lastUpdated: result.data.lastUpdated,
    dockerHubPullCount: result.data.dockerHub.pullCount,
    dockerHubRepository: result.data.dockerHub.repository,
    activeUsers: result.data.clarity.activeUsers,
    activeSessions: result.data.clarity.activeSessions,
    historyLength: result.data.history.length,
    warnings: result.warnings,
  };

  console.log('Activity metrics updated.');
  console.log(`Docker Hub repository: ${summary.dockerHubRepository}`);
  console.log(`Docker Hub pull count: ${summary.dockerHubPullCount}`);
  console.log(`Clarity active users: ${summary.activeUsers}`);
  console.log(`Clarity active sessions: ${summary.activeSessions}`);
  console.log(`History length: ${summary.historyLength}`);
  console.log(`Updated at: ${summary.lastUpdated}`);
  console.log(`METRICS_SUMMARY ${JSON.stringify(summary)}`);

  return result;
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  });
}
