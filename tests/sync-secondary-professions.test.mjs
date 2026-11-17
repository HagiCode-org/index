import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import { syncSecondaryProfessions } from '../scripts/sync-secondary-professions.mjs';

const ANTHROPIC_COMPATIBLE_FAMILIES = ['claude', 'codebuddy', 'hermes', 'qoder', 'kiro', 'pi', 'omp'];

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

test('syncSecondaryProfessions publishes the stable asset, backend fallback snapshot, and catalog entry', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'secondary-professions-sync-'));
  const sourceFile = path.join(tempRoot, 'src', 'data', 'secondary-professions.catalog.json');
  const publishedFile = path.join(tempRoot, 'public', 'secondary-professions', 'index.json');
  const catalogFile = path.join(tempRoot, 'src', 'data', 'public', 'index-catalog.json');
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
        icon: null,
        sourceLabel: 'tests',
        sortOrder: 10,
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

test('syncSecondaryProfessions rejects retired provider families and writes no output', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'secondary-professions-retired-'));
  const sourceFile = path.join(tempRoot, 'src', 'data', 'secondary-professions.catalog.json');
  const publishedFile = path.join(tempRoot, 'public', 'secondary-professions', 'index.json');
  const catalogFile = path.join(tempRoot, 'src', 'data', 'public', 'index-catalog.json');
  const backendFallbackFile = path.join(tempRoot, 'backend', 'Assets', 'secondary-professions.index.json');

  t.after(async () => rm(tempRoot, { recursive: true, force: true }));

  await mkdir(path.dirname(sourceFile), { recursive: true });
  await mkdir(path.dirname(catalogFile), { recursive: true });

  const item = {
    id: 'secondary-deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    family: 'deepseek',
    primaryProfessionId: null,
    icon: null,
    sourceLabel: 'hero.professionCopy.sources.aiProvidersKimiCliModel',
    sortOrder: 73,
    compatiblePrimaryFamilies: ['kimi'],
    defaultParameters: { model: 'deepseek-v4-pro' },
    fieldConstraints: [],
  };
  const baseCatalog = { version: '1.0.0', generatedAt: '2026-03-27T00:00:00.000Z', entries: [] };

  await writeFile(catalogFile, stableJson(baseCatalog), 'utf8');

  const syncOptions = { sourceFile, publishedFile, catalogFile, backendFallbackFile };

  await writeFile(sourceFile, stableJson({ version: '2026.11.17.1', publishedAt: '2026-11-17T00:00:00.000Z', items: [{ ...item, compatiblePrimaryFamilies: ['reasonix'] }] }), 'utf8');
  await assert.rejects(syncSecondaryProfessions(syncOptions), /must not reference retired family 'reasonix'/);

  await writeFile(sourceFile, stableJson({ version: '2026.11.17.1', publishedAt: '2026-11-17T00:00:00.000Z', items: [{ ...item, sourceLabel: 'hero.professionCopy.sources.aiProvidersReasonixCliModel' }] }), 'utf8');
  await assert.rejects(syncSecondaryProfessions(syncOptions), /must not reference a retired provider/);

  await assert.rejects(readFile(publishedFile, 'utf8'), { code: 'ENOENT' });
  await assert.rejects(readFile(backendFallbackFile, 'utf8'), { code: 'ENOENT' });
});

test('secondary profession source catalog has no retired provider references', async () => {
  const sourceText = await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8');
  const publishedText = await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8');

  assert.doesNotMatch(sourceText, /reasonix/i);
  assert.doesNotMatch(publishedText, /reasonix/i);
});

test('syncSecondaryProfessions keeps GLM 5.1 aligned across the source and published asset', async () => {
  const sourceCatalog = JSON.parse(await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8'));
  const publishedCatalog = JSON.parse(await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8'));

  const sourceEntry = sourceCatalog.items.find((item) => item.id === 'secondary-glm-5-1');
  const publishedEntry = publishedCatalog.items.find((item) => item.id === 'secondary-glm-5-1');
  const publishedIds = publishedCatalog.items.map((item) => item.id);

  assert.deepEqual(sourceEntry, {
    id: 'secondary-glm-5-1',
    name: 'GLM 5.1',
    family: 'anthropic',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 64,
    compatiblePrimaryFamilies: ANTHROPIC_COMPATIBLE_FAMILIES,
    defaultParameters: {
      model: 'glm-5.1',
    },
  });
  assert.deepEqual(publishedEntry, {
    ...sourceEntry,
    primaryProfessionId: null,
    icon: null,
    fieldConstraints: [],
  });
  assert.deepEqual(
    publishedIds.slice(publishedIds.indexOf('secondary-glm-5-codebuddy'), publishedIds.indexOf('secondary-minimax-m2-7') + 1),
    [
      'secondary-glm-5-codebuddy',
      'secondary-hy3-codebuddy',
      'secondary-hy3-x-codebuddy',
      'secondary-glm-5-1',
      'secondary-glm-5-2',
      'secondary-glm-5-3',
      'secondary-minimax-3',
      'secondary-minimax-m2-7',
    ],
  );
});

test('syncSecondaryProfessions keeps GLM 5.2 aligned across the source and published asset', async () => {
  const sourceCatalog = JSON.parse(await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8'));
  const publishedCatalog = JSON.parse(await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8'));

  const sourceEntry = sourceCatalog.items.find((item) => item.id === 'secondary-glm-5-2');
  const publishedEntry = publishedCatalog.items.find((item) => item.id === 'secondary-glm-5-2');

  assert.deepEqual(sourceEntry, {
    id: 'secondary-glm-5-2',
    name: 'GLM 5.2',
    family: 'anthropic',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 65,
    compatiblePrimaryFamilies: ANTHROPIC_COMPATIBLE_FAMILIES,
    defaultParameters: {
      model: 'glm-5.2',
    },
  });
  assert.deepEqual(publishedEntry, {
    ...sourceEntry,
    primaryProfessionId: null,
    icon: null,
    fieldConstraints: [],
  });
});

test('syncSecondaryProfessions keeps GLM 5.3 aligned and ordered across the source and published asset', async () => {
  const sourceCatalog = JSON.parse(await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8'));
  const publishedCatalog = JSON.parse(await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8'));
  const sourceEntry = sourceCatalog.items.find((item) => item.id === 'secondary-glm-5-3');
  const publishedEntry = publishedCatalog.items.find((item) => item.id === 'secondary-glm-5-3');
  const publishedIds = publishedCatalog.items.map((item) => item.id);

  assert.deepEqual(sourceEntry, {
    id: 'secondary-glm-5-3',
    name: 'GLM 5.3',
    family: 'anthropic',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 66,
    compatiblePrimaryFamilies: ANTHROPIC_COMPATIBLE_FAMILIES,
    defaultParameters: {
      model: 'glm-5.3',
    },
  });
  assert.deepEqual(publishedEntry, {
    ...sourceEntry,
    primaryProfessionId: null,
    icon: null,
    fieldConstraints: [],
  });
  assert.deepEqual(
    publishedIds.slice(publishedIds.indexOf('secondary-glm-5-2'), publishedIds.indexOf('secondary-minimax-3') + 1),
    ['secondary-glm-5-2', 'secondary-glm-5-3', 'secondary-minimax-3'],
  );
});

test('syncSecondaryProfessions keeps MiniMax 3 aligned and ordered across the source and published asset', async () => {
  const sourceCatalog = JSON.parse(await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8'));
  const publishedCatalog = JSON.parse(await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8'));
  const sourceEntry = sourceCatalog.items.find((item) => item.id === 'secondary-minimax-3');
  const publishedEntry = publishedCatalog.items.find((item) => item.id === 'secondary-minimax-3');
  const publishedIds = publishedCatalog.items.map((item) => item.id);

  assert.deepEqual(sourceEntry, {
    id: 'secondary-minimax-3',
    name: 'MiniMax 3',
    family: 'anthropic',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 69,
    compatiblePrimaryFamilies: ANTHROPIC_COMPATIBLE_FAMILIES,
    defaultParameters: {
      model: 'minimax-m3',
    },
  });
  assert.deepEqual(publishedEntry, {
    ...sourceEntry,
    primaryProfessionId: null,
    icon: null,
    fieldConstraints: [],
  });
  assert.deepEqual(
    publishedIds.slice(publishedIds.indexOf('secondary-minimax-3'), publishedIds.indexOf('secondary-minimax-m2-5') + 1),
    ['secondary-minimax-3', 'secondary-minimax-m2-7', 'secondary-minimax-m2-7-high-speed', 'secondary-minimax-m2-5'],
  );
});

test('syncSecondaryProfessions check mode detects drift across published asset, fallback snapshot, and catalog entry', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'secondary-professions-check-'));
  const sourceFile = path.join(tempRoot, 'src', 'data', 'secondary-professions.catalog.json');
  const publishedFile = path.join(tempRoot, 'public', 'secondary-professions', 'index.json');
  const catalogFile = path.join(tempRoot, 'src', 'data', 'public', 'index-catalog.json');
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

test('secondary-professions catalog carries no Agent CLI description copy', async () => {
  const catalogSource = await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8');

  // Agent CLI descriptions lived under hero.catalogCopy.primary.*; that copy was removed, so it must not come back here.
  assert.equal(catalogSource.includes('hero.catalogCopy.primary'), false);
});

test('syncSecondaryProfessions discards obsolete image flags and preserves model metadata', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'secondary-professions-legacy-'));
  const sourceFile = path.join(tempRoot, 'source.json');
  const publishedFile = path.join(tempRoot, 'published.json');
  const catalogFile = path.join(tempRoot, 'index-catalog.json');
  const backendFallbackFile = path.join(tempRoot, 'fallback.json');
  t.after(async () => rm(tempRoot, { recursive: true, force: true }));

  const baseItem = {
    name: 'Legacy model',
    family: 'anthropic',
    summary: 'Preserved summary',
    icon: 'model-icon',
    sourceLabel: 'tests',
    sortOrder: 27,
    compatiblePrimaryFamilies: ['claude', 'kiro'],
    defaultParameters: { model: 'legacy-model', reasoning: 'high' },
    fieldConstraints: [{ key: 'reasoning', isRequired: false, isReadOnly: false, description: 'Reasoning level' }],
  };
  const sourceCatalog = {
    version: '2026.03.27',
    publishedAt: '2026-03-27T00:00:00.000Z',
    items: [
      { ...baseItem, id: 'legacy-true', supportsImage: true },
      { ...baseItem, id: 'legacy-false', supportsImage: false },
      { ...baseItem, id: 'legacy-null', supportsImage: null },
      { ...baseItem, id: 'marker-free' },
    ],
  };

  await writeFile(sourceFile, stableJson(sourceCatalog), 'utf8');
  await writeFile(catalogFile, stableJson({ version: '1.0.0', generatedAt: '2026-03-27T00:00:00.000Z', entries: [] }), 'utf8');
  await syncSecondaryProfessions({ sourceFile, publishedFile, catalogFile, backendFallbackFile });

  const published = JSON.parse(await readFile(publishedFile, 'utf8'));
  assert.deepEqual(published.items.map(({ supportsImage, ...item }) => item), published.items);
  assert.deepEqual(published.items.map((item) => item.id), ['legacy-true', 'legacy-false', 'legacy-null', 'marker-free']);
  assert.deepEqual(published.items[0], {
    id: 'legacy-true',
    name: baseItem.name,
    family: baseItem.family,
    primaryProfessionId: null,
    summary: baseItem.summary,
    icon: baseItem.icon,
    sourceLabel: baseItem.sourceLabel,
    sortOrder: baseItem.sortOrder,
    compatiblePrimaryFamilies: baseItem.compatiblePrimaryFamilies,
    defaultParameters: baseItem.defaultParameters,
    fieldConstraints: baseItem.fieldConstraints,
  });
});
