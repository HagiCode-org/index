import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { hasSubstantiveManagedDiff } from '../scripts/check-managed-index-diff.mjs';

const run = promisify(execFile);
const sourceRoot = 'src/data/public';
const serverPath = `${sourceRoot}/server/index.json`;
const desktopPath = `${sourceRoot}/desktop/index.json`;
const catalogPath = `${sourceRoot}/index-catalog.json`;

const baseline = {
  [serverPath]: {
    updatedAt: 'old',
    packages: [{ version: '1.0.0', assets: [{ lastModified: 'old', url: '/server.zip' }] }],
  },
  [desktopPath]: {
    updatedAt: 'old',
    packages: [{ version: '1.0.0', assets: [{ lastModified: 'old', url: '/desktop.zip' }] }],
  },
  [catalogPath]: {
    generatedAt: 'old',
    entries: [
      { id: 'server-packages', lastUpdated: 'old', title: 'Server' },
      { id: 'desktop-packages', lastUpdated: 'old', title: 'Desktop' },
      { id: 'other', lastUpdated: 'old', title: 'Other' },
    ],
  },
};

async function writeSnapshot(projectRoot, relativePath, value) {
  await writeFile(path.join(projectRoot, relativePath), JSON.stringify(value), 'utf8');
}

async function fixture(t) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'index-diff-test-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));

  await mkdir(path.join(projectRoot, sourceRoot, 'server'), { recursive: true });
  await mkdir(path.join(projectRoot, sourceRoot, 'desktop'), { recursive: true });
  for (const [relativePath, value] of Object.entries(baseline)) {
    await writeSnapshot(projectRoot, relativePath, value);
  }

  await run('git', ['init', '-q', projectRoot]);
  await run('git', ['add', '--', ...Object.keys(baseline)], { cwd: projectRoot });
  await run('git', ['-c', 'user.name=Index Test', '-c', 'user.email=index@example.test',
    'commit', '-qm', 'baseline'], { cwd: projectRoot });
  return projectRoot;
}

test('unchanged managed JSON does not require publication', async (t) => {
  const projectRoot = await fixture(t);
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), false);
});

for (const sources of [['server'], ['desktop'], ['server', 'desktop']]) {
  test(`timestamp-only updates for ${sources.join(' and ')} do not require publication`, async (t) => {
    const projectRoot = await fixture(t);
    for (const source of sources) {
      const indexPath = source === 'server' ? serverPath : desktopPath;
      await writeSnapshot(projectRoot, indexPath, { ...baseline[indexPath], updatedAt: 'new' });
    }
    await writeSnapshot(projectRoot, catalogPath, {
      ...baseline[catalogPath],
      generatedAt: 'new',
      entries: baseline[catalogPath].entries.map((entry) => ({
        ...entry,
        lastUpdated: sources.includes(entry.id.replace('-packages', '')) ? 'new' : entry.lastUpdated,
      })),
    });

    assert.equal(await hasSubstantiveManagedDiff(projectRoot), false);
  });
}

test('substantive package changes alongside timestamps require publication', async (t) => {
  const projectRoot = await fixture(t);
  await writeSnapshot(projectRoot, serverPath, {
    ...baseline[serverPath],
    updatedAt: 'new',
    packages: [{ version: '2.0.0' }],
  });
  await writeSnapshot(projectRoot, catalogPath, {
    ...baseline[catalogPath],
    generatedAt: 'new',
  });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), true);
});

test('object key order is immaterial but catalog entry order is significant', async (t) => {
  const projectRoot = await fixture(t);
  await writeSnapshot(projectRoot, serverPath, {
    packages: baseline[serverPath].packages,
    updatedAt: 'new',
  });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), false);

  await writeSnapshot(projectRoot, catalogPath, {
    ...baseline[catalogPath],
    entries: [...baseline[catalogPath].entries].reverse(),
  });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), true);
});

test('nested asset timestamps remain significant', async (t) => {
  const projectRoot = await fixture(t);
  await writeSnapshot(projectRoot, desktopPath, {
    ...baseline[desktopPath],
    updatedAt: 'new',
    packages: [{
      ...baseline[desktopPath].packages[0],
      assets: [{ lastModified: 'new', url: '/desktop.zip' }],
    }],
  });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), true);
});

test('missing prior managed files require publication', async (t) => {
  const projectRoot = await fixture(t);
  await run('git', ['rm', '-q', '--cached', '--', desktopPath], { cwd: projectRoot });
  await run('git', ['-c', 'user.name=Index Test', '-c', 'user.email=index@example.test',
    'commit', '-qm', 'remove prior desktop'], { cwd: projectRoot });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), true);
});

test('unrelated catalog entry timestamps remain significant', async (t) => {
  const projectRoot = await fixture(t);
  await writeSnapshot(projectRoot, catalogPath, {
    ...baseline[catalogPath],
    generatedAt: 'new',
    entries: baseline[catalogPath].entries.map((entry) =>
      entry.id === 'other' ? { ...entry, lastUpdated: 'new' } : entry),
  });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), true);
});

test('managed catalog fields other than lastUpdated remain significant', async (t) => {
  const projectRoot = await fixture(t);
  await writeSnapshot(projectRoot, catalogPath, {
    ...baseline[catalogPath],
    entries: baseline[catalogPath].entries.map((entry) =>
      entry.id === 'server-packages' ? { ...entry, title: 'New server' } : entry),
  });
  assert.equal(await hasSubstantiveManagedDiff(projectRoot), true);
});

test('invalid current JSON fails visibly even if another file has changed', async (t) => {
  const projectRoot = await fixture(t);
  await writeSnapshot(projectRoot, serverPath, { packages: [] });
  await writeFile(path.join(projectRoot, desktopPath), '{bad json', 'utf8');
  await assert.rejects(hasSubstantiveManagedDiff(projectRoot), /Invalid JSON in src\/data\/public\/desktop\/index.json/);
});

test('invalid existing HEAD JSON fails visibly', async (t) => {
  const projectRoot = await fixture(t);
  await writeFile(path.join(projectRoot, catalogPath), '{bad json', 'utf8');
  await run('git', ['add', '--', catalogPath], { cwd: projectRoot });
  await run('git', ['-c', 'user.name=Index Test', '-c', 'user.email=index@example.test',
    'commit', '-qm', 'invalid prior catalog'], { cwd: projectRoot });
  await writeSnapshot(projectRoot, catalogPath, baseline[catalogPath]);
  await assert.rejects(hasSubstantiveManagedDiff(projectRoot), /Invalid JSON in HEAD:src\/data\/public\/index-catalog.json/);
});

test('missing synchronized files fail instead of reporting no changes', async (t) => {
  const projectRoot = await fixture(t);
  await rm(path.join(projectRoot, serverPath));
  await assert.rejects(hasSubstantiveManagedDiff(projectRoot), { code: 'ENOENT' });
});
