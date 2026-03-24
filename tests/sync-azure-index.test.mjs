import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

import {
  EXIT_CODES,
  publishManagedFiles,
  syncManagedIndexes,
} from '../scripts/sync-azure-index.mjs';

const noopLogger = {
  log() {},
  warn() {},
  error() {},
};

const serverUrl = 'https://example.test/server/index.json';
const desktopUrl = 'https://example.test/desktop/index.json';
const managedEnv = {
  SERVER_INDEX_SYNC_URL: serverUrl,
  DESKTOP_INDEX_SYNC_URL: desktopUrl,
};

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function createFetchMock(routes) {
  return async (url, init = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const key = `${method} ${url}`;
    const route = routes.get(key);

    assert.ok(route, `Unexpected request: ${key}`);

    if (route.error) {
      throw route.error;
    }

    return new Response(route.body ?? null, {
      status: route.status ?? 200,
      headers: route.headers,
    });
  };
}

async function createFixtureProject() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'index-sync-test-'));
  const publicRoot = path.join(projectRoot, 'public');

  await mkdir(path.join(publicRoot, 'presets'), { recursive: true });
  await mkdir(path.join(publicRoot, 'server'), { recursive: true });
  await mkdir(path.join(publicRoot, 'desktop'), { recursive: true });

  const presetsIndex = {
    version: '1.0.0',
    generatedAt: '2026-03-01T00:00:00.000Z',
    presets: [],
  };
  const serverIndex = {
    version: '1.0.0',
    generatedAt: '2026-03-10T00:00:00.000Z',
    packages: [{ version: '1.0.0' }],
  };
  const desktopIndex = {
    version: '1.0.0',
    generatedAt: '2026-03-10T00:00:00.000Z',
    packages: [{ version: '1.0.0' }],
  };
  const catalog = {
    version: '1.0.0',
    generatedAt: '2026-03-10T00:00:00.000Z',
    entries: [
      {
        id: 'presets-catalog',
        title: 'Presets Catalog',
        description: '镜像发布 Claude Code 提供商预设与入口索引。',
        path: '/presets/index.json',
        category: 'presets',
        sourceRepo: 'repos/docs',
        lastUpdated: '2026-03-01T00:00:00.000Z',
        status: 'published',
        readmePath: '/presets/README.md',
      },
      {
        id: 'server-packages',
        title: 'HagiCode Server Packages',
        description: '镜像发布 HagiCode Server 的 index.json 稳定入口。',
        path: '/server/index.json',
        category: 'packages',
        sourceRepo: 'repos/hagicode-core',
        lastUpdated: '2026-03-10T00:00:00.000Z',
        status: 'published',
        sourceUrl: 'https://github.com/HagiCode-org/site/tree/main/repos/hagicode-core',
      },
      {
        id: 'desktop-packages',
        title: 'HagiCode Desktop Packages',
        description: '镜像发布 HagiCode Desktop 的 index.json 稳定入口。',
        path: '/desktop/index.json',
        category: 'packages',
        sourceRepo: 'repos/hagicode-desktop',
        lastUpdated: '2026-03-10T00:00:00.000Z',
        status: 'published',
        sourceUrl: 'https://github.com/HagiCode-org/site/tree/main/repos/hagicode-desktop',
      },
    ],
  };

  await writeFile(path.join(publicRoot, 'presets', 'index.json'), stableStringify(presetsIndex), 'utf8');
  await writeFile(path.join(publicRoot, 'presets', 'README.md'), '# presets\n', 'utf8');
  await writeFile(path.join(publicRoot, 'server', 'index.json'), stableStringify(serverIndex), 'utf8');
  await writeFile(path.join(publicRoot, 'desktop', 'index.json'), stableStringify(desktopIndex), 'utf8');
  await writeFile(path.join(publicRoot, 'index-catalog.json'), stableStringify(catalog), 'utf8');

  return {
    projectRoot,
    publicRoot,
    catalog,
    serverIndex,
    desktopIndex,
  };
}

test('syncManagedIndexes leaves files untouched when upstream metadata is unchanged', async (t) => {
  const fixture = await createFixtureProject();
  t.after(async () => rm(fixture.projectRoot, { recursive: true, force: true }));

  const beforeCatalog = await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8');
  const beforeServer = await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8');
  const beforeDesktop = await readFile(path.join(fixture.publicRoot, 'desktop', 'index.json'), 'utf8');

  const fetchImpl = createFetchMock(
    new Map([
      [
        `HEAD ${serverUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 10 Mar 2026 00:00:00 GMT' },
        },
      ],
      [
        `HEAD ${desktopUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 10 Mar 2026 00:00:00 GMT' },
        },
      ],
    ]),
  );

  const result = await syncManagedIndexes({
    projectRoot: fixture.projectRoot,
    env: managedEnv,
    fetchImpl,
    now: new Date('2026-03-24T08:00:00.000Z'),
    logger: noopLogger,
  });

  assert.equal(result.outcome, 'no-change');
  assert.deepEqual(result.wroteFiles, []);
  assert.equal(await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8'), beforeCatalog);
  assert.equal(await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8'), beforeServer);
  assert.equal(await readFile(path.join(fixture.publicRoot, 'desktop', 'index.json'), 'utf8'), beforeDesktop);
});

test('syncManagedIndexes publishes changed mirrors together and refreshes managed catalog entries', async (t) => {
  const fixture = await createFixtureProject();
  t.after(async () => rm(fixture.projectRoot, { recursive: true, force: true }));

  const nextServer = {
    version: '1.1.0',
    generatedAt: '2026-03-24T08:00:00.000Z',
    packages: [{ version: '1.1.0' }],
  };
  const nextDesktop = {
    version: '1.2.0',
    generatedAt: '2026-03-24T08:01:00.000Z',
    packages: [{ version: '1.2.0' }],
  };

  const fetchImpl = createFetchMock(
    new Map([
      [
        `HEAD ${serverUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:00:00 GMT' },
        },
      ],
      [
        `HEAD ${desktopUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:01:00 GMT' },
        },
      ],
      [
        `GET ${serverUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:00:00 GMT' },
          body: JSON.stringify(nextServer),
        },
      ],
      [
        `GET ${desktopUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:01:00 GMT' },
          body: JSON.stringify(nextDesktop),
        },
      ],
    ]),
  );

  const result = await syncManagedIndexes({
    projectRoot: fixture.projectRoot,
    env: managedEnv,
    fetchImpl,
    now: new Date('2026-03-24T08:05:00.000Z'),
    logger: noopLogger,
  });

  assert.equal(result.outcome, 'changed');
  assert.deepEqual(result.changedSources, ['server', 'desktop']);
  assert.deepEqual(result.wroteFiles.sort(), [
    'public/desktop/index.json',
    'public/index-catalog.json',
    'public/server/index.json',
  ]);

  assert.equal(
    await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8'),
    stableStringify(nextServer),
  );
  assert.equal(
    await readFile(path.join(fixture.publicRoot, 'desktop', 'index.json'), 'utf8'),
    stableStringify(nextDesktop),
  );

  const catalog = JSON.parse(await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8'));
  const presetsEntry = catalog.entries.find((entry) => entry.id === 'presets-catalog');
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const desktopEntry = catalog.entries.find((entry) => entry.id === 'desktop-packages');

  assert.equal(presetsEntry.path, '/presets/index.json');
  assert.equal(serverEntry.path, '/server/index.json');
  assert.equal(serverEntry.lastUpdated, '2026-03-24T08:00:00.000Z');
  assert.equal(desktopEntry.path, '/desktop/index.json');
  assert.equal(desktopEntry.lastUpdated, '2026-03-24T08:01:00.000Z');
  assert.equal(catalog.generatedAt, '2026-03-24T08:05:00.000Z');
});

test('publishManagedFiles rolls back every managed file when a later promotion fails', async (t) => {
  const fixture = await createFixtureProject();
  t.after(async () => rm(fixture.projectRoot, { recursive: true, force: true }));

  const originalServer = await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8');
  const originalCatalog = await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8');
  let renameCount = 0;

  await assert.rejects(
    publishManagedFiles(
      fixture.projectRoot,
      [
        {
          relativePath: 'public/server/index.json',
          content: stableStringify({ version: '2.0.0', packages: [] }),
        },
        {
          relativePath: 'public/index-catalog.json',
          content: stableStringify({ version: '2.0.0', generatedAt: '2026-03-24T08:05:00.000Z', entries: [] }),
        },
      ],
      {
        mkdtemp,
        mkdir,
        writeFile,
        rm,
        async rename(from, to) {
          renameCount += 1;
          if (renameCount === 4) {
            throw new Error('forced publish failure');
          }

          await rename(from, to);
        },
      },
    ),
    (error) => {
      assert.equal(error.exitCode, EXIT_CODES.PUBLISH_FAILED);
      return true;
    },
  );

  assert.equal(await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8'), originalServer);
  assert.equal(await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8'), originalCatalog);
});

test('syncManagedIndexes fails fast when required sync metadata is missing', async (t) => {
  const fixture = await createFixtureProject();
  t.after(async () => rm(fixture.projectRoot, { recursive: true, force: true }));

  await assert.rejects(
    syncManagedIndexes({
      projectRoot: fixture.projectRoot,
      env: { SERVER_INDEX_SYNC_URL: serverUrl },
      fetchImpl: createFetchMock(new Map()),
      logger: noopLogger,
    }),
    (error) => {
      assert.equal(error.exitCode, EXIT_CODES.MISSING_METADATA);
      return true;
    },
  );
});

test('syncManagedIndexes aborts on invalid JSON without mutating published files', async (t) => {
  const fixture = await createFixtureProject();
  t.after(async () => rm(fixture.projectRoot, { recursive: true, force: true }));

  const beforeServer = await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8');
  const beforeCatalog = await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8');

  const fetchImpl = createFetchMock(
    new Map([
      [
        `HEAD ${serverUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:00:00 GMT' },
        },
      ],
      [
        `HEAD ${desktopUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 10 Mar 2026 00:00:00 GMT' },
        },
      ],
      [
        `GET ${serverUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:00:00 GMT' },
          body: '{not-json}',
        },
      ],
    ]),
  );

  await assert.rejects(
    syncManagedIndexes({
      projectRoot: fixture.projectRoot,
      env: managedEnv,
      fetchImpl,
      now: new Date('2026-03-24T08:05:00.000Z'),
      logger: noopLogger,
    }),
    (error) => {
      assert.equal(error.exitCode, EXIT_CODES.INVALID_JSON);
      return true;
    },
  );

  assert.equal(await readFile(path.join(fixture.publicRoot, 'server', 'index.json'), 'utf8'), beforeServer);
  assert.equal(await readFile(path.join(fixture.publicRoot, 'index-catalog.json'), 'utf8'), beforeCatalog);
});

test('syncManagedIndexes returns a download failure code when a managed source cannot be fetched', async (t) => {
  const fixture = await createFixtureProject();
  t.after(async () => rm(fixture.projectRoot, { recursive: true, force: true }));

  const fetchImpl = createFetchMock(
    new Map([
      [
        `HEAD ${serverUrl}`,
        {
          status: 200,
          headers: { 'last-modified': 'Tue, 24 Mar 2026 08:00:00 GMT' },
        },
      ],
      [
        `GET ${serverUrl}`,
        {
          status: 503,
          body: 'unavailable',
        },
      ],
    ]),
  );

  await assert.rejects(
    syncManagedIndexes({
      projectRoot: fixture.projectRoot,
      env: managedEnv,
      fetchImpl,
      now: new Date('2026-03-24T08:05:00.000Z'),
      logger: noopLogger,
    }),
    (error) => {
      assert.equal(error.exitCode, EXIT_CODES.DOWNLOAD_FAILED);
      return true;
    },
  );
});
