import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import { syncPresets } from '../scripts/sync-presets.mjs';

test('syncPresets copies preset files and rewrites published README links to index.hagicode.com', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'index-sync-presets-'));
  const sourceDir = path.join(tempRoot, 'docs', 'public', 'presets');
  const targetDir = path.join(tempRoot, 'index', 'public', 'presets');

  t.after(async () => rm(tempRoot, { recursive: true, force: true }));

  await mkdir(path.join(sourceDir, 'claude-code', 'providers'), { recursive: true });
  await writeFile(path.join(sourceDir, 'index.json'), JSON.stringify({ version: '1.0.0', types: {} }), 'utf8');
  await writeFile(path.join(sourceDir, 'claude-code', 'providers', 'zai.json'), JSON.stringify({ providerId: 'zai' }), 'utf8');
  await writeFile(
    path.join(sourceDir, 'README.md'),
    '# Presets\n\n```bash\ncurl https://<your-docs-site>/presets/index.json\ncurl https://<your-docs-site>/presets/claude-code/providers/zai.json\n```\n',
    'utf8',
  );

  await syncPresets({
    sourceDir,
    targetDir,
    publishedBaseUrl: 'https://index.hagicode.com/',
  });

  const publishedReadme = await readFile(path.join(targetDir, 'README.md'), 'utf8');
  const sourceReadme = await readFile(path.join(sourceDir, 'README.md'), 'utf8');
  const presetIndex = JSON.parse(await readFile(path.join(targetDir, 'index.json'), 'utf8'));
  const provider = JSON.parse(await readFile(path.join(targetDir, 'claude-code', 'providers', 'zai.json'), 'utf8'));

  assert.match(publishedReadme, /https:\/\/index\.hagicode\.com\/presets\/index\.json/);
  assert.match(publishedReadme, /https:\/\/index\.hagicode\.com\/presets\/claude-code\/providers\/zai\.json/);
  assert.match(sourceReadme, /https:\/\/<your-docs-site>\/presets\/index\.json/);
  assert.equal(presetIndex.version, '1.0.0');
  assert.equal(provider.providerId, 'zai');
});
