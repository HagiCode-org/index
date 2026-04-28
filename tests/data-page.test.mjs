import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

test('/data/ keeps the legacy catalog and about mirror content accessible', async () => {
  const dataPage = await readFile(path.join(publishedRoot, 'data', 'index.html'), 'utf8');

  assert.match(dataPage, /HagiCode Index Data/);
  assert.match(dataPage, /返回站点门户/);
  assert.match(dataPage, /查看目录 JSON/);
  assert.match(dataPage, /Steam 成就页面/);
  assert.match(dataPage, /打开 Steam 成就页面/);
  assert.match(dataPage, /Steam 成就 JSON/);
  assert.match(dataPage, /\/steam\/achievements\//);
  assert.match(dataPage, /\/steam\/achievements\.json/);
  assert.match(dataPage, /联系与社区/);
  assert.match(dataPage, /打开 about JSON/);
  assert.match(dataPage, /\/design\.json/);
  assert.match(dataPage, /Design Theme Catalog/);
  assert.match(dataPage, /awesome-design-md/);
  assert.match(dataPage, /Bilibili/);
  assert.match(dataPage, /\/server\/history\//);
  assert.match(dataPage, /\/desktop\/history\//);
  assert.match(dataPage, /\/_astro\/.+\.(png|jpg)/);
});
