import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

test('/steam/achievements/ builds a human-readable Steam achievement page with public icon paths', async () => {
  const page = await readFile(path.join(publishedRoot, 'steam', 'achievements', 'index.html'), 'utf8');
  const rawJson = JSON.parse(await readFile(path.join(publishedRoot, 'steam', 'achievements.json'), 'utf8'));

  assert.match(page, /Steam Achievement Data/);
  assert.match(page, /打开 Raw JSON/);
  assert.match(page, /按字段拆分的成就表/);
  assert.match(page, /当前显示 <strong data-visible-count>19<\/strong> \/ 19 个条目/);
  assert.match(page, /HAGICODE_CREATE/);
  assert.match(page, /开题者/);
  assert.match(page, /\/steam\/achievements\.json/);
  assert.match(page, /\/steam\/achievements\/icons\/hagicode_create\.png/);
  assert.match(page, /\/steam\/achievements\/icons\/hagicode_create_locked\.png/);
  assert.equal(rawJson.achievements.length, 19);
  assert.equal(rawJson.achievements.some((entry) => entry.steamApiName === 'HAGICODE_CREATE'), true);
});
