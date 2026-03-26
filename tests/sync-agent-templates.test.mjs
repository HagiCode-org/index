import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { syncAgentTemplates } from '../scripts/sync-agent-templates.mjs';

async function createCanonicalSource(root, templateType, generatedAt, detailId) {
  const sourceRoot = path.join(root, templateType);
  await mkdir(path.join(sourceRoot, 'templates'), { recursive: true });
  await writeFile(path.join(sourceRoot, 'index.json'), JSON.stringify({
    version: '1.0.0',
    generatedAt,
    templateType,
    title: `${templateType.toUpperCase()} Templates`,
    description: `${templateType} description`,
    templates: [
      {
        id: detailId,
        templateType,
        name: `${templateType} name`,
        summary: `${templateType} summary`,
        path: `/agent-templates/${templateType}/templates/${detailId}.json`,
        tags: [templateType],
        tagGroups: { languages: [], domains: [], roles: [] },
        previewText: `${templateType} preview`,
      },
    ],
  }), 'utf8');
  await writeFile(path.join(sourceRoot, 'templates', `${detailId}.json`), JSON.stringify({
    id: detailId,
    templateType,
    name: `${templateType} name`,
    summary: `${templateType} summary`,
  }), 'utf8');

  return sourceRoot;
}

test('syncAgentTemplates mirrors canonical outputs and builds a root manifest', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'index-agent-templates-'));
  const destinationRoot = path.join(tempRoot, 'public', 'agent-templates');

  const traitSource = await createCanonicalSource(tempRoot, 'trait', '2026-03-26T10:00:00.000Z', 'trait-one');
  const soulSource = await createCanonicalSource(tempRoot, 'soul', '2026-03-26T11:30:00.000Z', 'soul-one');

  const manifest = await syncAgentTemplates({
    sources: {
      trait: traitSource,
      soul: soulSource,
    },
    destinationRoot,
  });

  assert.equal(manifest.generatedAt, '2026-03-26T11:30:00.000Z');
  assert.deepEqual(manifest.types.map((entry) => entry.templateType), ['soul', 'trait']);

  const mirroredTrait = JSON.parse(await readFile(path.join(destinationRoot, 'trait', 'index.json'), 'utf8'));
  const mirroredSoulDetail = JSON.parse(await readFile(path.join(destinationRoot, 'soul', 'templates', 'soul-one.json'), 'utf8'));
  const mirroredManifest = JSON.parse(await readFile(path.join(destinationRoot, 'index.json'), 'utf8'));

  assert.equal(mirroredTrait.templateType, 'trait');
  assert.equal(mirroredSoulDetail.id, 'soul-one');
  assert.equal(mirroredManifest.types[0].path, '/agent-templates/soul/index.json');
});
