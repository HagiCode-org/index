import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadActivityMetrics } from './update-activity-metrics.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const metricsFile = path.join(projectRoot, 'public', 'activity-metrics.json');

const data = await loadActivityMetrics(metricsFile);

if (!data) {
  throw new Error('activity-metrics.json is missing.');
}

console.log(`Validated activity metrics with ${data.history.length} history entries.`);
