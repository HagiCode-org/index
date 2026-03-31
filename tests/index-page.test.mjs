import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

test('homepage renders the shared about payload content', async () => {
  const homepage = await readFile(path.join(publishedRoot, 'index.html'), 'utf8');

  assert.match(homepage, /联系与社区/);
  assert.match(homepage, /打开 about JSON/);
  assert.match(homepage, /Bilibili/);
  assert.match(homepage, /小红书/);
  assert.match(homepage, /微信公众号/);
  assert.match(homepage, /\/_astro\/.+\.(png|jpg)/);
});
