import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePackageHistoryIndex } from '../src/lib/load-package-history.ts';

test('history page normalization prefers packages array and sorts newest releases first', () => {
  const page = normalizePackageHistoryIndex('server', {
    generatedAt: '2026-03-24T08:00:00.000Z',
    packages: [
      {
        version: 'v1.2.0',
        publishedAt: '2026-03-22T10:00:00.000Z',
        downloadUrl: '/downloads/server-v1.2.0.zip',
      },
      {
        version: 'v1.3.0',
        publishedAt: '2026-03-24T09:00:00.000Z',
        files: [{ name: 'server-v1.3.0.zip', path: '/downloads/server-v1.3.0.zip' }],
      },
      {
        version: 'v1.1.0',
        publishedAt: '2026-03-20T09:00:00.000Z',
        downloadUrl: '/downloads/server-v1.1.0.zip',
      },
    ],
  });

  assert.deepEqual(
    page.releases.map((release) => release.version),
    ['v1.3.0', 'v1.2.0', 'v1.1.0'],
  );
  assert.equal(page.latestRelease?.primaryArtifactLabel, 'server-v1.3.0.zip');
  assert.equal(page.latestRelease?.actions[0]?.href, '/downloads/server-v1.3.0.zip');
});

test('history page normalization falls back to versions array and stable version ordering', () => {
  const page = normalizePackageHistoryIndex('desktop', {
    versions: [{ version: '1.0.0' }, { version: '1.2.0' }, { version: '1.1.0-beta.1' }],
  });

  assert.deepEqual(
    page.releases.map((release) => release.version),
    ['1.2.0', '1.1.0-beta.1', '1.0.0'],
  );
});

test('history page normalization keeps empty indexes renderable', () => {
  const page = normalizePackageHistoryIndex('server', {
    generatedAt: '2026-03-24T00:00:00.000Z',
    packages: [],
  });

  assert.equal(page.releases.length, 0);
  assert.equal(page.latestRelease, null);
  assert.equal(page.generatedAtLabel.includes('2026'), true);
});

test('history page normalization shows fallback copy when metadata is partial', () => {
  const page = normalizePackageHistoryIndex('desktop', {
    packages: [
      {
        version: 'v2.0.0',
      },
    ],
  });

  assert.equal(page.releases[0].publishedLabel, '发布日期未知');
  assert.equal(page.releases[0].primaryArtifactLabel, '无直接下载');
  assert.deepEqual(page.releases[0].actions, [
    {
      kind: 'raw-json',
      label: '原始 JSON',
      href: '/desktop/index.json',
    },
  ]);
});

test('history page normalization derives actions from relative artifact metadata', () => {
  const page = normalizePackageHistoryIndex('server', {
    packages: [
      {
        version: 'v3.0.0',
        releaseDate: '2026-03-23T12:00:00.000Z',
        files: [{ fileName: 'server-v3.0.0.zip', path: 'artifacts/server-v3.0.0.zip' }],
      },
    ],
  });

  assert.equal(page.releases[0].hasDirectDownload, true);
  assert.equal(page.releases[0].primaryArtifactLabel, 'server-v3.0.0.zip');
  assert.deepEqual(page.releases[0].actions, [
    {
      kind: 'download',
      label: '下载',
      href: '/server/artifacts/server-v3.0.0.zip',
    },
    {
      kind: 'raw-json',
      label: '原始 JSON',
      href: '/server/index.json',
    },
  ]);
});
