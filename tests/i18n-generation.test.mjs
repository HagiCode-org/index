import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'js-yaml';
import {
  generateI18nResources,
  verifyGeneratedI18nResources,
} from '../scripts/generate-i18n-resources.mjs';
import { SUPPORTED_DESKTOP_LANGUAGE_CODES } from '../src/lib/desktop-language-contract.ts';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, '..');
const expectedLocales = [...SUPPORTED_DESKTOP_LANGUAGE_CODES].sort();
const expectedNamespaces = ['hagindex', 'promote-content', 'promoto'];

async function withTemporaryI18nTree(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'hagindex-i18n-'));
  const localesRoot = path.join(root, 'locales');
  const generatedRoot = path.join(root, 'generated-locales');

  try {
    await cp(path.join(projectRoot, 'src', 'i18n', 'locales'), localesRoot, { recursive: true });
    await callback({ localesRoot, generatedRoot });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('i18n generator writes every configured locale and namespace from YAML', async () => {
  await withTemporaryI18nTree(async ({ localesRoot, generatedRoot }) => {
    const result = await generateI18nResources({ localesRoot, generatedRoot });
    assert.equal(result.localeCount, expectedLocales.length);
    assert.equal(result.namespaceCount, expectedNamespaces.length);

    for (const locale of expectedLocales) {
      for (const namespace of expectedNamespaces) {
        const source = load(await readFile(path.join(localesRoot, locale, `${namespace}.yml`), 'utf8'));
        const generated = JSON.parse(await readFile(path.join(generatedRoot, locale, `${namespace}.json`), 'utf8'));
        assert.deepEqual(generated, source);
      }
    }

    await verifyGeneratedI18nResources({ localesRoot, generatedRoot });
  });
});

test('i18n check reports stale generated resources', async () => {
  await withTemporaryI18nTree(async ({ localesRoot, generatedRoot }) => {
    await generateI18nResources({ localesRoot, generatedRoot });
    await writeFile(path.join(generatedRoot, 'zh-CN', 'hagindex.json'), '{\"stale\":true}\n', 'utf8');

    await assert.rejects(
      verifyGeneratedI18nResources({ localesRoot, generatedRoot }),
      /zh-CN\/hagindex\.json is stale/,
    );
  });
});

test('hagi18n config target locales stay aligned with the generated locale catalog', async () => {
  const config = load(await readFile(path.join(projectRoot, 'hagi18n.yaml'), 'utf8'));
  assert.deepEqual(
    [...config.targetLocales].sort(),
    expectedLocales.filter((locale) => locale !== 'en-US'),
  );
});
