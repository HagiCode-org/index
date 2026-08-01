import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildStructuredArticleLocaleManifest,
  buildStructuredArticleRootManifest,
  listStructuredArticleLocales,
  listStructuredArticleSlugs,
  loadStructuredArticleDetail,
} from '../src/lib/structured-articles.ts';
import { validateStructuredArticlePublication } from '../scripts/validate-catalog.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('structured article source exposes expected locale folders and baseline slugs', async () => {
  const locales = await listStructuredArticleLocales();
  const zhSlugs = await listStructuredArticleSlugs('zh-CN');
  const enSlugs = await listStructuredArticleSlugs('en-US');

  assert.deepEqual(locales, [
    'de-DE',
    'en-US',
    'es-ES',
    'fr-FR',
    'ja-JP',
    'ko-KR',
    'pt-BR',
    'ru-RU',
    'zh-CN',
    'zh-Hant',
  ]);
  assert.equal(zhSlugs.includes('claude-vs-hagicode'), true);
  assert.equal(zhSlugs.includes('copilot-vs-hagicode'), true);
  assert.equal(zhSlugs.includes('kiro-vs-hagicode'), true);
  assert.deepEqual(enSlugs, [
    'claude-vs-hagicode',
    'codebuddy-vs-hagicode',
    'codex-vs-hagicode',
    'copilot-vs-hagicode',
    'deepagents-vs-hagicode',
    'gemini-vs-hagicode',
    'hermes-vs-hagicode',
    'kimi-vs-hagicode',
    'kiro-vs-hagicode',
    'opencode-vs-hagicode',
    'pi-vs-hagicode',
    'qoder-vs-hagicode',
    'reasonix-vs-hagicode',
  ]);
});

test('structured article manifests keep canonical locale and detail paths', async () => {
  const rootManifest = await buildStructuredArticleRootManifest();
  const zhManifest = await buildStructuredArticleLocaleManifest('zh-CN');
  const englishManifest = await buildStructuredArticleLocaleManifest('en-US');
  const chineseClaude = await loadStructuredArticleDetail('zh-CN', 'claude-vs-hagicode');
  const englishClaude = await loadStructuredArticleDetail('en-US', 'claude-vs-hagicode');

  assert.equal(rootManifest.schemaVersion, '1.0.0');
  assert.deepEqual(rootManifest.localeIndexes.map((entry) => entry.path), [
    '/articles/de-DE/index.json',
    '/articles/en-US/index.json',
    '/articles/es-ES/index.json',
    '/articles/fr-FR/index.json',
    '/articles/ja-JP/index.json',
    '/articles/ko-KR/index.json',
    '/articles/pt-BR/index.json',
    '/articles/ru-RU/index.json',
    '/articles/zh-CN/index.json',
    '/articles/zh-Hant/index.json',
  ]);
  assert.equal(zhManifest.locale, 'zh-CN');
  assert.equal(englishManifest.locale, 'en-US');
  assert.equal(zhManifest.articles.find((entry) => entry.slug === 'claude-vs-hagicode')?.path, '/articles/zh-CN/claude-vs-hagicode.json');
  assert.equal(englishManifest.articles[0]?.path, '/articles/en-US/claude-vs-hagicode.json');
  assert.equal(chineseClaude.sections.some((section) => section.blocks.some((block) => block.type === 'capability-list')), true);
  assert.equal(englishClaude.sections.at(-1)?.blocks.at(-1)?.type, 'bullet-list');
});

test('structured article publication validates the current build output', async (t) => {
  if (!process.env.INDEX_BUILD_ROOT) {
    t.skip('INDEX_BUILD_ROOT is required so the publication check runs against the active test build output.');
    return;
  }

  await validateStructuredArticlePublication({
    publishedRoot: path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT),
  });
});
