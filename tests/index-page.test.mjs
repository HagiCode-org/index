import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

test('homepage renders the portal shell and canonical site destinations from /sites.json', async () => {
  const homepage = await readFile(path.join(publishedRoot, 'index.html'), 'utf8');
  const sitesCatalog = JSON.parse(await readFile(path.join(publishedRoot, 'sites.json'), 'utf8'));

  assert.match(homepage, /HagiCode 站点导航门户/);
  assert.match(homepage, /打开数据页/);
  assert.match(homepage, /站点清单 JSON/);
  assert.match(homepage, /查看目录 JSON/);
  assert.doesNotMatch(homepage, /联系与社区/);
  assert.doesNotMatch(homepage, /打开 about JSON/);

  for (const entry of sitesCatalog.entries) {
    assert.match(homepage, new RegExp(entry.title.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
    assert.match(homepage, new RegExp(entry.url.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')));
  }
});
