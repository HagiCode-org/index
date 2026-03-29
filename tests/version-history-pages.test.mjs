import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePackageHistoryIndex } from '../src/lib/load-package-history.ts';

test('server history page normalization only keeps downloadable zip files while preserving newest-first ordering', () => {
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
        assets: [
          { name: 'server-v1.3.0.zip', path: 'artifacts/server-v1.3.0.zip', size: 1024 },
          { name: 'server-v1.3.0.manifest.json', path: 'artifacts/server-v1.3.0.manifest.json', size: 256 },
        ],
        files: ['ignored-by-structured-assets.zip'],
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
  assert.equal(page.latestRelease?.fileCount, 1);
  assert.deepEqual(
    page.latestRelease?.files.map((file) => file.label),
    ['server-v1.3.0.zip'],
  );
  assert.equal(page.latestRelease?.files[0]?.href, '/server/artifacts/server-v1.3.0.zip');
  assert.equal(page.latestRelease?.actions[0]?.href, '/server/artifacts/server-v1.3.0.zip');
});

test('history page normalization falls back to versions array and keeps stable version ordering', () => {
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

test('history page normalization shows fallback copy when release metadata is partial', () => {
  const page = normalizePackageHistoryIndex('desktop', {
    packages: [
      {
        version: 'v2.0.0',
      },
    ],
  });

  assert.equal(page.releases[0].publishedLabel, '发布日期未知');
  assert.equal(page.releases[0].primaryArtifactLabel, '无文件记录');
  assert.equal(page.releases[0].fileCount, 0);
  assert.deepEqual(page.releases[0].actions, [
    {
      kind: 'raw-json',
      label: '原始 JSON',
      href: '/desktop/index.json',
    },
  ]);
});

test('server history page falls back to no zip download when a release only has non-zip files', () => {
  const page = normalizePackageHistoryIndex('server', {
    packages: [
      {
        version: 'v9.0.0',
        publishedAt: '2026-03-28T10:00:00.000Z',
        assets: [
          { name: 'server-v9.0.0.manifest.json', path: 'artifacts/server-v9.0.0.manifest.json' },
          { name: 'server-v9.0.0.sha256', path: 'artifacts/server-v9.0.0.sha256' },
        ],
      },
    ],
  });

  assert.equal(page.releases[0].fileCount, 0);
  assert.equal(page.releases[0].downloadableFileCount, 0);
  assert.equal(page.releases[0].primaryArtifactLabel, '无 ZIP 下载');
  assert.deepEqual(page.releases[0].actions, [
    {
      kind: 'raw-json',
      label: '原始 JSON',
      href: '/server/index.json',
    },
  ]);
});

test('history page normalization falls back to files array and keeps unlinkable files visible', () => {
  const page = normalizePackageHistoryIndex('desktop', {
    packages: [
      {
        version: 'v3.0.0',
        releaseDate: '2026-03-23T12:00:00.000Z',
        files: [
          { fileName: 'desktop-v3.0.0.exe', path: 'artifacts/desktop-v3.0.0.exe' },
          { name: 'desktop-v3.0.0.sha256' },
        ],
      },
    ],
  });

  assert.equal(page.releases[0].fileCount, 2);
  assert.equal(page.releases[0].downloadableFileCount, 1);
  assert.equal(page.releases[0].files[0].href, '/desktop/artifacts/desktop-v3.0.0.exe');
  assert.equal(page.releases[0].files[1].label, 'desktop-v3.0.0.sha256');
  assert.equal(page.releases[0].files[1].href, null);
});

test('history page normalization prefers directUrl over relative path for structured desktop assets', () => {
  const page = normalizePackageHistoryIndex('desktop', {
    packages: [
      {
        version: 'v4.0.0',
        publishedAt: '2026-03-24T11:00:00.000Z',
        assets: [
          {
            name: 'Hagicode.Desktop.4.0.0.exe',
            path: 'v4.0.0/Hagicode.Desktop.4.0.0.exe',
            directUrl: 'https://desktop.dl.hagicode.com/v4.0.0/Hagicode.Desktop.4.0.0.exe',
          },
        ],
      },
    ],
  });

  assert.equal(
    page.releases[0].files[0].href,
    'https://desktop.dl.hagicode.com/v4.0.0/Hagicode.Desktop.4.0.0.exe',
  );
});
