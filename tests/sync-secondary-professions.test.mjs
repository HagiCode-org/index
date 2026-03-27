import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import { syncSecondaryProfessions } from '../scripts/sync-secondary-professions.mjs';

const ANTHROPIC_COMPATIBLE_FAMILIES = ['claude', 'codebuddy', 'hermes', 'qoder', 'kiro'];

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

test('syncSecondaryProfessions publishes the stable asset, backend fallback snapshot, and catalog entry', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'secondary-professions-sync-'));
  const sourceFile = path.join(tempRoot, 'src', 'data', 'secondary-professions.catalog.json');
  const publishedFile = path.join(tempRoot, 'public', 'secondary-professions', 'index.json');
  const catalogFile = path.join(tempRoot, 'public', 'index-catalog.json');
  const backendFallbackFile = path.join(tempRoot, 'backend', 'Assets', 'secondary-professions.index.json');

  t.after(async () => rm(tempRoot, { recursive: true, force: true }));

  await mkdir(path.dirname(sourceFile), { recursive: true });
  await mkdir(path.dirname(catalogFile), { recursive: true });

  const sourceCatalog = {
    version: '2026.03.27',
    publishedAt: '2026-03-27T00:00:00.000Z',
    title: 'Secondary Profession Catalog',
    description: 'Test catalog',
    items: [
      {
        id: 'secondary-gpt-5-4',
        name: 'GPT 5.4',
        family: 'gpt',
        primaryProfessionId: null,
        summary: null,
        icon: null,
        sourceLabel: 'tests',
        sortOrder: 10,
        supportsImage: true,
        compatiblePrimaryFamilies: ['codex'],
        defaultParameters: {
          model: 'gpt-5.4',
        },
        fieldConstraints: [],
      },
    ],
  };

  const baseCatalog = {
    version: '1.0.0',
    generatedAt: '2026-03-27T00:00:00.000Z',
    entries: [
      {
        id: 'character-templates',
        title: 'Character Templates',
        description: 'Character templates.',
        path: '/character-templates/index.json',
        category: 'templates',
        sourceRepo: 'repos/index',
        lastUpdated: '2026-03-27T00:00:00.000Z',
        status: 'published',
      },
    ],
  };

  await writeFile(sourceFile, stableJson(sourceCatalog), 'utf8');
  await writeFile(catalogFile, stableJson(baseCatalog), 'utf8');

  const result = await syncSecondaryProfessions({
    sourceFile,
    publishedFile,
    catalogFile,
    backendFallbackFile,
  });

  assert.equal(result.outcome, 'synced');
  assert.equal(result.itemCount, 1);

  const published = await readFile(publishedFile, 'utf8');
  const fallback = await readFile(backendFallbackFile, 'utf8');
  const catalog = JSON.parse(await readFile(catalogFile, 'utf8'));
  const entry = catalog.entries.find((item) => item.id === 'secondary-professions');

  assert.equal(published, stableJson(sourceCatalog));
  assert.equal(fallback, published);
  assert.equal(entry.path, '/secondary-professions/index.json');
  assert.equal(entry.sourceRepo, 'repos/index');
  assert.equal(entry.lastUpdated, '2026-03-27T00:00:00.000Z');
});

test('syncSecondaryProfessions keeps GLM 5.1 aligned across the published asset and backend fallback', async () => {
  const sourceCatalog = JSON.parse(await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8'));
  const publishedCatalog = JSON.parse(await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8'));
  const fallbackCatalog = JSON.parse(await readFile(new URL('../../hagicode-core/src/PCode.Web/Assets/secondary-professions.index.json', import.meta.url), 'utf8'));

  const sourceEntry = sourceCatalog.items.find((item) => item.id === 'secondary-glm-5-1');
  const publishedEntry = publishedCatalog.items.find((item) => item.id === 'secondary-glm-5-1');
  const fallbackEntry = fallbackCatalog.items.find((item) => item.id === 'secondary-glm-5-1');
  const publishedIds = publishedCatalog.items.map((item) => item.id);

  assert.deepEqual(sourceEntry, {
    id: 'secondary-glm-5-1',
    name: 'GLM 5.1',
    family: 'anthropic',
    summary: 'hero.professionCopy.secondary.glm51.summary',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 64,
    supportsImage: true,
    compatiblePrimaryFamilies: ANTHROPIC_COMPATIBLE_FAMILIES,
    defaultParameters: {
      model: 'glm-5.1',
      reasoning: 'high',
    },
  });
  assert.deepEqual(publishedEntry, sourceEntry);
  assert.deepEqual(fallbackEntry, sourceEntry);
  assert.deepEqual(
    publishedIds.slice(publishedIds.indexOf('secondary-glm-5-codebuddy'), publishedIds.indexOf('secondary-minimax-m2-7') + 1),
    ['secondary-glm-5-codebuddy', 'secondary-glm-5-1', 'secondary-minimax-m2-7'],
  );
});

test('syncSecondaryProfessions check mode detects drift across published asset, fallback snapshot, and catalog entry', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'secondary-professions-check-'));
  const sourceFile = path.join(tempRoot, 'src', 'data', 'secondary-professions.catalog.json');
  const publishedFile = path.join(tempRoot, 'public', 'secondary-professions', 'index.json');
  const catalogFile = path.join(tempRoot, 'public', 'index-catalog.json');
  const backendFallbackFile = path.join(tempRoot, 'backend', 'Assets', 'secondary-professions.index.json');

  t.after(async () => rm(tempRoot, { recursive: true, force: true }));

  await mkdir(path.dirname(sourceFile), { recursive: true });
  await mkdir(path.dirname(publishedFile), { recursive: true });
  await mkdir(path.dirname(backendFallbackFile), { recursive: true });
  await mkdir(path.dirname(catalogFile), { recursive: true });

  const sourceCatalog = {
    version: '2026.03.27',
    publishedAt: '2026-03-27T00:00:00.000Z',
    items: [
      {
        id: 'secondary-gpt-5-4',
        name: 'GPT 5.4',
        family: 'gpt',
        sourceLabel: 'tests',
        sortOrder: 10,
        supportsImage: true,
        compatiblePrimaryFamilies: ['codex'],
      },
    ],
  };

  await writeFile(sourceFile, stableJson(sourceCatalog), 'utf8');
  await writeFile(publishedFile, stableJson({ ...sourceCatalog, version: 'old' }), 'utf8');
  await writeFile(backendFallbackFile, stableJson(sourceCatalog), 'utf8');
  await writeFile(catalogFile, stableJson({ version: '1.0.0', generatedAt: '2026-03-27T00:00:00.000Z', entries: [] }), 'utf8');

  await assert.rejects(
    () => syncSecondaryProfessions({ sourceFile, publishedFile, catalogFile, backendFallbackFile, check: true }),
    /out of sync/,
  );
});
