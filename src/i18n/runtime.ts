import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_RENDER_LOCALE,
  GENERATED_LOCALE_ROOT,
  REQUIRED_I18N_NAMESPACES,
  SUPPORTED_I18N_LOCALES,
  type RequiredI18nNamespace,
  type SupportedI18nLocale,
} from './config';
import type { DesktopLanguageCode } from '@/lib/desktop-language-contract';

type JsonRecord = Record<string, unknown>;
type LocalizedField = Record<DesktopLanguageCode, string>;

const projectRoot = process.cwd();
const generatedRoot = path.join(projectRoot, GENERATED_LOCALE_ROOT);
const namespaceCache = new Map<string, JsonRecord>();

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKnownLocale(locale: string): asserts locale is SupportedI18nLocale {
  if (!SUPPORTED_I18N_LOCALES.includes(locale as SupportedI18nLocale)) {
    throw new Error(`Unsupported i18n locale "${locale}".`);
  }
}

function assertKnownNamespace(namespace: string): asserts namespace is RequiredI18nNamespace {
  if (!REQUIRED_I18N_NAMESPACES.includes(namespace as RequiredI18nNamespace)) {
    throw new Error(`Unsupported i18n namespace "${namespace}".`);
  }
}

function readGeneratedNamespace(locale: SupportedI18nLocale, namespace: RequiredI18nNamespace): JsonRecord {
  const cacheKey = `${locale}/${namespace}`;
  const cached = namespaceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const resourcePath = path.join(generatedRoot, locale, `${namespace}.json`);
  if (!fs.existsSync(resourcePath)) {
    throw new Error(
      `Missing generated i18n resource ${path.relative(projectRoot, resourcePath)}. Run npm run i18n:generate in repos/index.`,
    );
  }

  const parsed = JSON.parse(fs.readFileSync(resourcePath, 'utf8')) as unknown;
  if (!isPlainObject(parsed)) {
    throw new Error(`Generated i18n resource ${path.relative(projectRoot, resourcePath)} must be a top-level object.`);
  }

  namespaceCache.set(cacheKey, parsed);
  return parsed;
}

export function getLocaleNamespace(
  namespace: RequiredI18nNamespace,
  locale: SupportedI18nLocale = DEFAULT_RENDER_LOCALE,
): JsonRecord {
  assertKnownLocale(locale);
  assertKnownNamespace(namespace);
  return readGeneratedNamespace(locale, namespace);
}

export function getPathValue(resource: JsonRecord, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((current, segment) => {
    if (!isPlainObject(current) || !(segment in current)) {
      throw new Error(`Missing i18n key "${keyPath}".`);
    }

    return current[segment];
  }, resource);
}

export function getString(resource: JsonRecord, keyPath: string): string {
  const value = getPathValue(resource, keyPath);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`i18n key "${keyPath}" must be a non-empty string.`);
  }

  return value;
}

export function formatI18n(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export function getRecord(resource: JsonRecord, keyPath: string): JsonRecord {
  const value = getPathValue(resource, keyPath);
  if (!isPlainObject(value)) {
    throw new Error(`i18n key "${keyPath}" must be an object.`);
  }

  return value;
}

export function getPromotionText(
  locale: SupportedI18nLocale,
  promotionId: string,
  fieldName: 'title' | 'description' | 'cta' | 'alt',
): string {
  const resource = getLocaleNamespace('promote-content', locale);
  return getString(resource, `promotions.${promotionId}.${fieldName}`);
}

export function createLocalizedPromotionField(
  promotionId: string,
  fieldName: 'title' | 'description' | 'cta',
): LocalizedField {
  return Object.fromEntries(
    SUPPORTED_I18N_LOCALES.map((locale) => [locale, getPromotionText(locale, promotionId, fieldName)]),
  ) as LocalizedField;
}

export function validatePromotionLocalization(promotionIds: readonly string[]): void {
  for (const promotionId of promotionIds) {
    for (const locale of SUPPORTED_I18N_LOCALES) {
      for (const fieldName of ['title', 'description', 'cta', 'alt'] as const) {
        getPromotionText(locale, promotionId, fieldName);
      }
    }
  }
}

export function getDefaultPromotionAlt(promotionId: string): string {
  return getPromotionText(DEFAULT_RENDER_LOCALE, promotionId, 'alt');
}
