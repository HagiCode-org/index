import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { SUPPORTED_DESKTOP_LANGUAGE_CODES } from '../src/lib/desktop-language-contract.ts';
import { loadSitesCatalog, loadSitesCatalogSource } from '../src/lib/load-sites-catalog.ts';

const projectRoot = path.resolve(import.meta.dirname, '..');
const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

test('/sites.json stays aligned with the source loader and canonical production URLs', async () => {
  const sourceCatalog = JSON.parse(
    await readFile(path.join(projectRoot, 'src', 'data', 'public', 'sites.json'), 'utf8'),
  );
  const publishedCatalog = JSON.parse(await readFile(path.join(publishedRoot, 'sites.json'), 'utf8'));
  const loadedCatalog = await loadSitesCatalog();
  const sourceLoadedCatalog = await loadSitesCatalogSource();

  assert.deepEqual(publishedCatalog, sourceCatalog);
  assert.deepEqual(sourceLoadedCatalog, sourceCatalog);
  assert.equal(Array.isArray(loadedCatalog.groups), true);
  assert.equal(Array.isArray(loadedCatalog.entries), true);

  const expectedUrls = new Map([
    ['hagicode-main', 'https://hagicode.com/'],
    ['hagicode-docs', 'https://docs.hagicode.com/'],
    ['newbe-blog', 'https://newbe.hagicode.com/'],
    ['index-data', 'https://index.hagicode.com/data/'],
    ['compose-builder', 'https://builder.hagicode.com/'],
    ['cost-calculator', 'https://cost.hagicode.com/'],
    ['status-page', 'https://status.hagicode.com/'],
    ['awesome-design-gallery', 'https://design.hagicode.com/'],
    ['soul-builder', 'https://soul.hagicode.com/'],
    ['trait-builder', 'https://trait.hagicode.com/'],
  ]);

  for (const entry of publishedCatalog.entries) {
    const expectedUrl = expectedUrls.get(entry.id);
    if (expectedUrl) {
      assert.equal(entry.url, expectedUrl);
    }

    for (const locale of SUPPORTED_DESKTOP_LANGUAGE_CODES) {
      assert.equal(typeof entry.title[locale], 'string');
      assert.equal(typeof entry.label[locale], 'string');
      assert.equal(typeof entry.description[locale], 'string');
      assert.equal(typeof entry.actionLabel[locale], 'string');
    }

    assert.equal(entry.url.includes('localhost'), false);
    assert.equal(entry.url.includes('127.0.0.1'), false);
  }

  const zhMainSiteEntry = loadedCatalog.entries.find((entry) => entry.id === 'hagicode-main');
  assert.ok(zhMainSiteEntry);
  assert.equal(zhMainSiteEntry.title, 'HagiCode 主站');
  assert.equal(zhMainSiteEntry.actionLabel, '进入主站');
});
