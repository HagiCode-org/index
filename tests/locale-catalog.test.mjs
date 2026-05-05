import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  INDEX_PUBLISHED_CONTENT_LOCALES,
  INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE,
  normalizeIndexPublishedContentLocale,
} from '../src/i18n/locale-metadata.ts';
import { SUPPORTED_I18N_LOCALES } from '../src/i18n/config.ts';
import { SITE_LOCALES } from '../../site/src/i18n/locale-metadata.ts';

const projectRoot = path.resolve(import.meta.dirname, '..');

function sortByCode(locales) {
  return [...locales].sort((left, right) => left.code.localeCompare(right.code));
}

test('index published-content locale metadata stays aligned with the site reference catalog', () => {
  const indexLocales = sortByCode(INDEX_PUBLISHED_CONTENT_LOCALES);
  const siteLocales = sortByCode(SITE_LOCALES);

  assert.equal(indexLocales.length, 29);
  assert.deepEqual(
    indexLocales.map((locale) => locale.code),
    siteLocales.map((locale) => locale.code),
  );

  for (const locale of indexLocales) {
    const siteLocale = siteLocales.find((entry) => entry.code === locale.code);
    assert.ok(siteLocale, `${locale.code} must exist in the site locale catalog.`);
    assert.deepEqual(locale, siteLocale);
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
  assert.equal(normalizeIndexPublishedContentLocale('es-latam'), 'es-419');
  assert.equal(normalizeIndexPublishedContentLocale('pt'), 'pt-BR');
  assert.equal(normalizeIndexPublishedContentLocale('sv-SE'), 'sv-SE');
  assert.equal(normalizeIndexPublishedContentLocale('tr'), 'tr-TR');
  assert.equal(normalizeIndexPublishedContentLocale('xx-YY'), null);
  assert.equal(INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE, 'zh-CN');
});
