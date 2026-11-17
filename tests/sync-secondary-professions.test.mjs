import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import { readAgentCliFamilies, syncSecondaryProfessions } from '../scripts/sync-secondary-professions.mjs';

const presetText = await readFile(new URL('../src/data/agent-cli-presets.yaml', import.meta.url), 'utf8');
const ALL_AGENT_CLI_FAMILIES = readAgentCliFamilies(presetText).sort();

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writePresetFile(root, families) {
  const presetFile = path.join(root, 'agent-cli-presets.yaml');
  await writeFile(presetFile, families.map((family) => `- Id: "profession-${family}"\n  Family: "${family}"\n`).join(''), 'utf8');
  return presetFile;
}

function makeItem(overrides = {}) {
  return {
    id: 'secondary-gpt-5-4',
    name: 'GPT 5.4',
    family: 'gpt',
    preferenceGroup: 'gpt',
    primaryProfessionId: null,
    icon: null,
    sourceLabel: 'tests',
    sortOrder: 10,
    compatiblePrimaryFamilies: [...ALL_AGENT_CLI_FAMILIES],
    defaultParameters: {
      model: 'gpt-5.4',
    },
    fieldConstraints: [],
    ...overrides,
  };
}

async function setupSync(t, prefix, { items, families = ALL_AGENT_CLI_FAMILIES, rawSource } = {}) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => rm(tempRoot, { recursive: true, force: true }));

  const sourceFile = path.join(tempRoot, 'src', 'data', 'secondary-professions.catalog.json');
  const publishedFile = path.join(tempRoot, 'public', 'secondary-professions', 'index.json');
  const catalogFile = path.join(tempRoot, 'src', 'data', 'public', 'index-catalog.json');
  const backendFallbackFile = path.join(tempRoot, 'backend', 'Assets', 'secondary-professions.index.json');
  await mkdir(path.dirname(sourceFile), { recursive: true });
  await mkdir(path.dirname(catalogFile), { recursive: true });
  await writeFile(catalogFile, stableJson({ version: '1.0.0', generatedAt: '2026-03-27T00:00:00.000Z', entries: [] }), 'utf8');
  await writeFile(sourceFile, rawSource ?? stableJson({ version: '2026.11.17.1', publishedAt: '2026-11-17T00:00:00.000Z', items: items ?? [makeItem()] }), 'utf8');
  const agentCliPresetFile = await writePresetFile(tempRoot, families);

  return {
    publishedFile,
    backendFallbackFile,
    syncOptions: { sourceFile, publishedFile, catalogFile, backendFallbackFile, agentCliPresetFile },
  };
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
    items: [makeItem()],
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
    preferenceGroup: 'other',
    primaryProfessionId: null,
    icon: null,
    sourceLabel: 'hero.professionCopy.sources.aiProvidersKimiCliModel',
    sortOrder: 73,
    compatiblePrimaryFamilies: [...ALL_AGENT_CLI_FAMILIES],
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

test('readAgentCliFamilies reads every preset family and drops the retired one', () => {
  assert.deepEqual(readAgentCliFamilies('Id: "a"\n  Family: "codex"\nId: "b"\n  Family: "reasonix"\n  Family: "claude"\n'), ['codex', 'claude']);
  assert.ok(ALL_AGENT_CLI_FAMILIES.length >= 2);
  assert.equal(ALL_AGENT_CLI_FAMILIES.includes('reasonix'), false);
});

test('syncSecondaryProfessions rejects a missing preferenceGroup', async (t) => {
  const { syncOptions, publishedFile } = await setupSync(t, 'secondary-professions-group-missing-', {
    items: [makeItem({ preferenceGroup: undefined })],
  });
  await assert.rejects(syncSecondaryProfessions(syncOptions), /preferenceGroup must be a non-empty string/);
  await assert.rejects(readFile(publishedFile, 'utf8'), { code: 'ENOENT' });
});

test('syncSecondaryProfessions rejects an invalid preferenceGroup', async (t) => {
  const { syncOptions } = await setupSync(t, 'secondary-professions-group-invalid-', {
    items: [makeItem({ preferenceGroup: 'anthropic' })],
  });
  await assert.rejects(syncSecondaryProfessions(syncOptions), /preferenceGroup must be one of claude, claude-compatible, gpt, other/);
});

test('syncSecondaryProfessions rejects a non-pinned entry that omits an agent CLI family', async (t) => {
  const families = ALL_AGENT_CLI_FAMILIES;
  const { syncOptions } = await setupSync(t, 'secondary-professions-family-missing-', {
    items: [makeItem({ compatiblePrimaryFamilies: families.filter((family) => family !== 'kimi') })],
  });
  await assert.rejects(syncSecondaryProfessions(syncOptions), /must list agent CLI family 'kimi'/);
});

test('syncSecondaryProfessions rejects an unexpected pin on a non-fusion entry', async (t) => {
  const { syncOptions } = await setupSync(t, 'secondary-professions-pin-', {
    items: [makeItem({ id: 'secondary-kimi-k2-5', compatiblePrimaryFamilies: ['kimi'] })],
  });
  await assert.rejects(syncSecondaryProfessions(syncOptions), /only secondary-copilot-fusion may be pinned/);
});

test('syncSecondaryProfessions requires secondary-copilot-fusion to stay pinned', async (t) => {
  const { syncOptions } = await setupSync(t, 'secondary-professions-fusion-', {
    items: [makeItem({ id: 'secondary-copilot-fusion', family: 'copilot', preferenceGroup: 'other', defaultParameters: { model: 'fusion' } })],
  });
  await assert.rejects(syncSecondaryProfessions(syncOptions), /secondary-copilot-fusion must stay pinned to fewer agent CLI families/);
});

test('syncSecondaryProfessions accepts secondary-copilot-fusion pinned to copilot', async (t) => {
  const { syncOptions } = await setupSync(t, 'secondary-professions-fusion-ok-', {
    items: [makeItem({ id: 'secondary-copilot-fusion', family: 'copilot', preferenceGroup: 'other', compatiblePrimaryFamilies: ['copilot'], defaultParameters: { model: 'fusion' } })],
  });
  const result = await syncSecondaryProfessions(syncOptions);
  assert.equal(result.outcome, 'synced');
});

test('syncSecondaryProfessions rejects a selectable entry without a launch model', async (t) => {
  const { syncOptions } = await setupSync(t, 'secondary-professions-model-', {
    items: [makeItem({ defaultParameters: {} })],
  });
  await assert.rejects(syncSecondaryProfessions(syncOptions), /must declare a non-empty defaultParameters\.model/);
});

test('secondary profession source catalog has no retired provider references', async () => {
  const sourceText = await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8');
  const publishedText = await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8');

  assert.doesNotMatch(sourceText, /reasonix/i);
  assert.doesNotMatch(publishedText, /reasonix/i);
});

test('every selectable catalog entry declares a launch model and a valid preference group', async () => {
  const sourceCatalog = JSON.parse(await readFile(new URL('../src/data/secondary-professions.catalog.json', import.meta.url), 'utf8'));
  const groups = new Set(['claude', 'claude-compatible', 'gpt', 'other']);

  for (const item of sourceCatalog.items) {
    assert.ok(typeof item.defaultParameters?.model === 'string' && item.defaultParameters.model.length > 0, `${item.id} has no model`);
    assert.ok(groups.has(item.preferenceGroup), `${item.id} has invalid group ${item.preferenceGroup}`);
    if (item.id === 'secondary-copilot-fusion') {
      assert.deepEqual(item.compatiblePrimaryFamilies, ['copilot']);
    } else {
      assert.deepEqual([...item.compatiblePrimaryFamilies].sort(), ALL_AGENT_CLI_FAMILIES, `${item.id} is not listed for every agent CLI family`);
    }
  }
  assert.equal(sourceCatalog.items.filter((item) => item.id !== 'secondary-copilot-fusion' && item.preferenceGroup === 'other').length, 3);
});

test('published catalog and bundled fallback list the same model ids and compatible families', async () => {
  const published = JSON.parse(await readFile(new URL('../public/secondary-professions/index.json', import.meta.url), 'utf8'));
  const fallback = JSON.parse(await readFile(new URL('../../hagicode-core/src/PCode.Web/Assets/secondary-professions.index.json', import.meta.url), 'utf8'));
  const project = (catalog) => catalog.items.map((item) => ({
    id: item.id,
    preferenceGroup: item.preferenceGroup,
    compatiblePrimaryFamilies: item.compatiblePrimaryFamilies,
    model: item.defaultParameters?.model,
  }));

  assert.deepEqual(project(fallback), project(published));
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
    preferenceGroup: 'claude-compatible',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 64,
    compatiblePrimaryFamilies: ALL_AGENT_CLI_FAMILIES,
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
    preferenceGroup: 'claude-compatible',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 65,
    compatiblePrimaryFamilies: ALL_AGENT_CLI_FAMILIES,
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
    preferenceGroup: 'claude-compatible',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 66,
    compatiblePrimaryFamilies: ALL_AGENT_CLI_FAMILIES,
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
    preferenceGroup: 'claude-compatible',
    sourceLabel: 'hero.professionCopy.sources.aiSharedAnthropicModel',
    sortOrder: 69,
    compatiblePrimaryFamilies: ALL_AGENT_CLI_FAMILIES,
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
    items: [makeItem()],
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
    preferenceGroup: 'claude',
    summary: 'Preserved summary',
    icon: 'model-icon',
    sourceLabel: 'tests',
    sortOrder: 27,
    compatiblePrimaryFamilies: [...ALL_AGENT_CLI_FAMILIES],
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
    preferenceGroup: baseItem.preferenceGroup,
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
