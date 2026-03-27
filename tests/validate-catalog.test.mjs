import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');

function buildActivityMetricsFixture({
  lastUpdated = '2026-03-24T10:00:00.000Z',
  pullCount = 123,
  activeUsers = 7,
  activeSessions = 11,
  dateRange = '3Days',
} = {}) {
  return {
    lastUpdated,
    dockerHub: {
      repository: 'newbe36524/hagicode',
      pullCount,
    },
    clarity: {
      activeUsers,
      activeSessions,
      dateRange,
    },
    history: [
      {
        date: lastUpdated,
        dockerHub: {
          pullCount,
        },
        clarity: {
          activeUsers,
          activeSessions,
        },
      },
    ],
  };
}

function buildCatalogFixture({
  lastUpdated = '2026-03-24T10:00:00.000Z',
  activityMetrics = {
    activeUsers: 7,
    activeSessions: 11,
    dateRange: '3Days',
  },
} = {}) {
  return {
    version: '1.0.0',
    generatedAt: lastUpdated,
    entries: [
      {
        id: 'agent-templates',
        title: 'Agent Templates',
        description: '镜像发布 SOUL 与 Trait 模板目录。',
        path: '/agent-templates/index.json',
        category: 'templates',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
      },
      {
        id: 'activity-metrics',
        title: 'Activity Metrics',
        description: '镜像发布 HagiCode Index 的活跃用户快照与 90 天历史。',
        path: '/activity-metrics.json',
        category: 'analytics',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
        activityMetrics,
      },
      {
        id: 'character-templates',
        title: 'Character Templates',
        description: '镜像发布角色模板目录。',
        path: '/character-templates/index.json',
        category: 'templates',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
        readmePath: '/character-templates/README.md',
      },
    ],
  };
}

function buildCharacterTemplateManifestFixture() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-24T10:00:00.000Z',
    title: 'Character Templates',
    description: 'Character template catalog',
    availableTagGroups: {
      languages: ['mandarin'],
      domains: ['frontend'],
      roles: ['engineer'],
    },
    templates: [
      {
        id: 'character-one',
        name: 'Character One',
        summary: 'Summary',
        path: '/character-templates/templates/character-one.json',
        templateVersion: '1.0.0',
        tags: ['frontend'],
        tagGroups: {
          languages: ['mandarin'],
          domains: ['frontend'],
          roles: ['engineer'],
        },
        scenes: ['ui'],
      },
    ],
  };
}

function buildCharacterTemplateDetailFixture({
  soulTemplateIds = ['soul-one', 'soul-two'],
  traitTemplateIds = ['trait-one'],
} = {}) {
  return {
    id: 'character-one',
    name: 'Character One',
    summary: 'Summary',
    path: '/character-templates/templates/character-one.json',
    templateVersion: '1.0.0',
    tags: ['frontend'],
    tagGroups: {
      languages: ['mandarin'],
      domains: ['frontend'],
      roles: ['engineer'],
    },
    scenes: ['ui'],
    sourceRepo: 'repos/index',
    sourceUrl: 'https://example.com/character-one',
    soulTemplateIds,
    traitTemplateIds,
  };
}

async function createValidationFixture({ catalog, activityMetrics }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'index-validate-catalog-'));
  const scriptsDir = path.join(tempDir, 'scripts');
  const publicDir = path.join(tempDir, 'public');
  const validateScriptPath = path.join(projectRoot, 'scripts', 'validate-catalog.mjs');
  const updateScriptPath = path.join(projectRoot, 'scripts', 'update-activity-metrics.mjs');

  await mkdir(scriptsDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await mkdir(path.join(publicDir, 'agent-templates', 'trait', 'templates'), { recursive: true });
  await mkdir(path.join(publicDir, 'agent-templates', 'soul', 'templates'), { recursive: true });
  await mkdir(path.join(publicDir, 'character-templates', 'templates'), { recursive: true });
  await writeFile(
    path.join(scriptsDir, 'validate-catalog.mjs'),
    await readFile(validateScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(
    path.join(scriptsDir, 'update-activity-metrics.mjs'),
    await readFile(updateScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(path.join(publicDir, 'index-catalog.json'), JSON.stringify(catalog), 'utf8');
  await writeFile(path.join(publicDir, 'activity-metrics.json'), JSON.stringify(activityMetrics), 'utf8');
  await writeFile(path.join(publicDir, 'agent-templates', 'index.json'), JSON.stringify({
    version: '1.0.0',
    generatedAt: catalog.generatedAt,
    types: [
      {
        templateType: 'trait',
        title: 'Trait Templates',
        description: 'trait description',
        path: '/agent-templates/trait/index.json',
        count: 1,
      },
      {
        templateType: 'soul',
        title: 'SOUL Templates',
        description: 'soul description',
        path: '/agent-templates/soul/index.json',
        count: 2,
      },
    ],
  }), 'utf8');
  await writeFile(path.join(publicDir, 'agent-templates', 'trait', 'index.json'), JSON.stringify({
    version: '1.0.0',
    generatedAt: catalog.generatedAt,
    templateType: 'trait',
    title: 'Trait Templates',
    description: 'trait description',
    availableTagGroups: { languages: [], domains: [], roles: [] },
    templates: [
      {
        id: 'trait-one',
        templateType: 'trait',
        name: 'Trait One',
        summary: 'Trait summary',
        path: '/agent-templates/trait/templates/trait-one.json',
        tags: ['trait'],
        tagGroups: { languages: [], domains: [], roles: [] },
        previewText: 'Trait preview',
      },
    ],
  }), 'utf8');
  await writeFile(path.join(publicDir, 'agent-templates', 'soul', 'index.json'), JSON.stringify({
    version: '1.0.0',
    generatedAt: catalog.generatedAt,
    templateType: 'soul',
    title: 'SOUL Templates',
    description: 'soul description',
    availableTagGroups: { languages: [], domains: [], roles: [] },
    templates: [
      {
        id: 'soul-one',
        templateType: 'soul',
        name: 'Soul One',
        summary: 'Soul summary',
        path: '/agent-templates/soul/templates/soul-one.json',
        tags: ['soul'],
        tagGroups: { languages: [], domains: [], roles: [] },
        previewText: 'Soul preview',
      },
      {
        id: 'soul-two',
        templateType: 'soul',
        name: 'Soul Two',
        summary: 'Soul summary two',
        path: '/agent-templates/soul/templates/soul-two.json',
        tags: ['soul'],
        tagGroups: { languages: [], domains: [], roles: [] },
        previewText: 'Soul preview two',
      },
    ],
  }), 'utf8');
  await writeFile(path.join(publicDir, 'agent-templates', 'trait', 'templates', 'trait-one.json'), JSON.stringify({
    id: 'trait-one',
    templateType: 'trait',
    name: 'Trait One',
    summary: 'Trait summary',
  }), 'utf8');
  await writeFile(path.join(publicDir, 'agent-templates', 'soul', 'templates', 'soul-one.json'), JSON.stringify({
    id: 'soul-one',
    templateType: 'soul',
    name: 'Soul One',
    summary: 'Soul summary',
  }), 'utf8');
  await writeFile(path.join(publicDir, 'agent-templates', 'soul', 'templates', 'soul-two.json'), JSON.stringify({
    id: 'soul-two',
    templateType: 'soul',
    name: 'Soul Two',
    summary: 'Soul summary two',
  }), 'utf8');
  await writeFile(
    path.join(publicDir, 'character-templates', 'README.md'),
    '# Character Templates\n',
    'utf8',
  );
  await writeFile(
    path.join(publicDir, 'character-templates', 'index.json'),
    JSON.stringify(buildCharacterTemplateManifestFixture()),
    'utf8',
  );
  await writeFile(
    path.join(publicDir, 'character-templates', 'templates', 'character-one.json'),
    JSON.stringify(buildCharacterTemplateDetailFixture()),
    'utf8',
  );

  return tempDir;
}

test('catalog validation script succeeds', async () => {
  const { stdout } = await execFileAsync('node', ['./scripts/validate-catalog.mjs'], {
    cwd: projectRoot,
  });

  assert.match(stdout, /Validated \d+ catalog entries\./);
});

test('catalog exposes managed server and desktop entries', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const entryIds = catalog.entries.map((entry) => entry.id);

  assert.deepEqual(entryIds, ['presets-catalog', 'server-packages', 'desktop-packages', 'agent-templates', 'character-templates', 'activity-metrics']);
});

test('managed package entries expose stable history page paths', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const desktopEntry = catalog.entries.find((entry) => entry.id === 'desktop-packages');

  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(desktopEntry.historyPagePath, '/desktop/history/');
});

test('activity metrics catalog entry mirrors the current raw snapshot summary', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const activityMetricsPath = path.join(projectRoot, 'public', 'activity-metrics.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const activityMetrics = JSON.parse(await readFile(activityMetricsPath, 'utf8'));
  const activityEntry = catalog.entries.find((entry) => entry.id === 'activity-metrics');

  assert.equal(catalog.generatedAt, activityMetrics.lastUpdated);
  assert.equal(activityEntry.path, '/activity-metrics.json');
  assert.equal(activityEntry.lastUpdated, activityMetrics.lastUpdated);
  assert.deepEqual(activityEntry.activityMetrics, {
    activeUsers: activityMetrics.clarity.activeUsers,
    activeSessions: activityMetrics.clarity.activeSessions,
    dateRange: activityMetrics.clarity.dateRange,
  });
});

test('catalog exposes agent template discovery entry with the public manifest path', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const manifestPath = path.join(projectRoot, 'public', 'agent-templates', 'index.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = catalog.entries.find((item) => item.id === 'agent-templates');

  assert.equal(entry.path, '/agent-templates/index.json');
  assert.equal(entry.category, 'templates');
  assert.deepEqual(manifest.types.map((item) => item.templateType), ['soul', 'trait']);
});

test('catalog exposes character template discovery entry with the public manifest path', async () => {
  const catalogPath = path.join(projectRoot, 'public', 'index-catalog.json');
  const manifestPath = path.join(projectRoot, 'public', 'character-templates', 'index.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = catalog.entries.find((item) => item.id === 'character-templates');

  assert.equal(entry.path, '/character-templates/index.json');
  assert.equal(entry.readmePath, '/character-templates/README.md');
  assert.equal(entry.category, 'templates');
  assert.equal(manifest.templates.length >= 1, true);
});

test('character template detail preserves ordered multi-soul references', async () => {
  const detailPath = path.join(projectRoot, 'public', 'character-templates', 'templates', 'character-cold-scholar-react-engineer.json');
  const detail = JSON.parse(await readFile(detailPath, 'utf8'));

  assert.deepEqual(detail.soulTemplateIds, [
    'soul-main-12-aloof-ace-scholar',
    'soul-orth-11-classical-chinese-ultra-minimal-mode',
  ]);
});

test('catalog validation fails when the activity metrics catalog entry drifts from the raw snapshot', async () => {
  const activityMetrics = buildActivityMetricsFixture();
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture({
      lastUpdated: '2026-03-23T10:00:00.000Z',
      activityMetrics: {
        activeUsers: 5,
        activeSessions: 9,
        dateRange: '3Days',
      },
    }),
    activityMetrics,
  });

  await assert.rejects(
    () =>
      execFileAsync('node', ['./scripts/validate-catalog.mjs'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /Activity metrics entry lastUpdated must match \/activity-metrics\.json\./,
      );
      return true;
    },
  );
});

test('catalog validation fails when a character template references an unknown soul template', async () => {
  const activityMetrics = buildActivityMetricsFixture();
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    activityMetrics,
  });

  const detailPath = path.join(tempDir, 'public', 'character-templates', 'templates', 'character-one.json');
  await writeFile(
    detailPath,
    JSON.stringify(buildCharacterTemplateDetailFixture({
      soulTemplateIds: ['missing-soul'],
      traitTemplateIds: ['trait-one'],
    })),
    'utf8',
  );

  await assert.rejects(
    () =>
      execFileAsync('node', ['./scripts/validate-catalog.mjs'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /Character template character-one references unknown soul template missing-soul\./,
      );
      return true;
    },
  );
});
