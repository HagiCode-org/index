import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'js-yaml';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  INDEX_PUBLISHED_CONTENT_LOCALES,
  INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE,
  normalizeIndexPublishedContentLocale,
} from '../src/i18n/locale-metadata.ts';
import { SUPPORTED_I18N_LOCALES } from '../src/i18n/config.ts';
import { SITE_LOCALES } from '../../site/src/i18n/locale-metadata.ts';

const projectRoot = path.resolve(import.meta.dirname, '..');
const RETAINED_LOCALE_CODES = ['de-DE', 'en-US', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'pt-BR', 'ru-RU', 'zh-CN', 'zh-Hant'];

function sortByCode(locales) {
  return [...locales].sort((left, right) => left.code.localeCompare(right.code));
}

test('index published-content locale metadata stays aligned with the site reference catalog', () => {
  const indexLocales = sortByCode(INDEX_PUBLISHED_CONTENT_LOCALES);
  const siteLocales = sortByCode(SITE_LOCALES);
  const indexLocaleByCode = new Map(indexLocales.map((locale) => [locale.code, locale]));

  assert.deepEqual(indexLocales.map((locale) => locale.code), RETAINED_LOCALE_CODES);
  assert.deepEqual(indexLocales.map((locale) => locale.code), siteLocales.map((locale) => locale.code));

  for (const siteLocale of siteLocales) {
    const indexLocale = indexLocaleByCode.get(siteLocale.code);
    assert.ok(indexLocale, `${siteLocale.code} must exist in the index locale catalog.`);
    assert.equal(indexLocale.code, siteLocale.code);
    assert.deepEqual(indexLocale.fallbackCodes, siteLocale.fallbackCodes);
    assert.deepEqual(indexLocale.aliases, siteLocale.aliases);
  }
});

test('index i18n config and hagi18n targets cover the full canonical locale catalog', async () => {
  const configLocales = [...SUPPORTED_I18N_LOCALES].sort();
  const catalogLocales = INDEX_PUBLISHED_CONTENT_LOCALES.map((locale) => locale.code).sort();
  const hagi18nConfig = load(await readFile(path.join(projectRoot, 'hagi18n.yaml'), 'utf8'));

  assert.deepEqual(configLocales, catalogLocales);
  assert.deepEqual(
    [...hagi18nConfig.targetLocales].sort(),
    catalogLocales.filter((locale) => locale !== 'en-US'),
  );
});

test('index locale normalization accepts site-aligned aliases and falls back to the default locale', () => {
  assert.equal(normalizeIndexPublishedContentLocale('zh-TW'), 'zh-Hant');
  assert.equal(normalizeIndexPublishedContentLocale('zh_HK'), 'zh-Hant');
  assert.equal(normalizeIndexPublishedContentLocale('es-latam'), 'es-ES');
  assert.equal(normalizeIndexPublishedContentLocale('es-419'), 'es-ES');
  assert.equal(normalizeIndexPublishedContentLocale('pt'), 'pt-BR');
  assert.equal(normalizeIndexPublishedContentLocale('pt-PT'), 'pt-BR');
  assert.equal(normalizeIndexPublishedContentLocale('it-IT'), null);
  assert.equal(normalizeIndexPublishedContentLocale('xx-YY'), null);
  assert.equal(INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE, 'zh-CN');
});

test('removed locales have no source directory and hagi18n targets the nine non-base locales', async () => {
  const localeDirectories = (await readdir(path.join(projectRoot, 'src/i18n/locales'), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const hagi18nConfig = load(await readFile(path.join(projectRoot, 'hagi18n.yaml'), 'utf8'));

  assert.deepEqual(localeDirectories, [...RETAINED_LOCALE_CODES].sort());
  assert.equal(hagi18nConfig.targetLocales.length, 9);
});
