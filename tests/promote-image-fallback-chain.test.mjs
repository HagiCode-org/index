import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePromotionContent } from '@hagicode/hagilight-core/promotions';
import { detectImageType, readImageDimensions } from '../scripts/image-file-inspection.mjs';
import { loadRouteMappedJson } from '../src/lib/json-publication.ts';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');
const buildRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');
const indexOrigin = 'https://index.hagicode.com';
const requiresFreshBuild = {
  skip: process.env.INDEX_BUILD_ROOT
    ? false
    : 'INDEX_BUILD_ROOT is required so this test validates a fresh build output instead of stale dist/.',
};

function containsKey(value, key) {
  if (Array.isArray(value)) {
    return value.some((item) => containsKey(item, key));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(([name, item]) => name === key || containsKey(item, key));
  }

  return false;
}

test('promote image tiers exist on disk with matching type, dimensions and AVIF size advantage', requiresFreshBuild, async () => {
  const promoteContent = await loadRouteMappedJson('/promote_content.json');

  for (const content of promoteContent.contents) {
    const byteLengths = new Map();

    for (const source of content.image.sources) {
      const bytes = await readFile(path.join(buildRoot, source.src.replace(/^\//, '')));

      assert.equal(detectImageType(bytes), source.type.slice('image/'.length), `${content.id} ${source.format}`);
      assert.deepEqual(readImageDimensions(bytes), { width: source.width, height: source.height }, `${content.id} ${source.format}`);
      byteLengths.set(source.format, bytes.length);
    }

    assert.ok(byteLengths.get('avif') < byteLengths.get('webp'), `${content.id} AVIF must be smaller than WebP`);
  }
});

test('promote image tier src values resolve to the index origin under /_astro/', requiresFreshBuild, async () => {
  const promoteContent = await loadRouteMappedJson('/promote_content.json');

  for (const content of promoteContent.contents) {
    for (const source of content.image.sources) {
      const url = new URL(source.src, indexOrigin);

      assert.equal(url.protocol, 'https:', content.id);
      assert.equal(url.origin, indexOrigin, content.id);
      assert.match(url.pathname, /^\/_astro\//, content.id);
    }
  }
});

test('hagilight-core promotion parser accepts every published promote entry', requiresFreshBuild, async () => {
  const promoteContent = await loadRouteMappedJson('/promote_content.json');
  const parsed = parsePromotionContent(promoteContent);

  assert.equal(parsed.length, promoteContent.contents.length);

  for (const [index, content] of promoteContent.contents.entries()) {
    assert.equal(parsed[index].id, content.id);
    assert.equal(parsed[index].image.src, new URL(content.image.src, indexOrigin).toString(), content.id);
    assert.equal(parsed[index].image.width, content.image.width, content.id);
    assert.equal(parsed[index].image.height, content.image.height, content.id);
    assert.equal(parsed[index].image.alt, content.image.alt, content.id);
  }
});

test('steam published JSON does not carry promote image fallback chains', requiresFreshBuild, async () => {
  for (const file of ['steam/index.json', 'steam/achievements.json']) {
    const payload = JSON.parse(await readFile(path.join(buildRoot, file), 'utf8'));

    assert.equal(containsKey(payload, 'sources'), false, file);
  }
});
