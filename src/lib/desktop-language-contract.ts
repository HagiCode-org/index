import {
  INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE,
  INDEX_PUBLISHED_CONTENT_LOCALES,
  type IndexPublishedContentLocale,
  type IndexPublishedContentLocaleDefinition,
} from '../i18n/locale-metadata.ts';

export const DEFAULT_DESKTOP_LANGUAGE = INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE;
export const SUPPORTED_DESKTOP_LANGUAGE_CODES = INDEX_PUBLISHED_CONTENT_LOCALES.map(
  (language) => language.code,
) as readonly IndexPublishedContentLocale[];

export type DesktopLanguageCode = IndexPublishedContentLocale;
export type DesktopLanguage = IndexPublishedContentLocaleDefinition;

export const DESKTOP_LANGUAGES: readonly DesktopLanguage[] = INDEX_PUBLISHED_CONTENT_LOCALES;

export const PRIMARY_PROMOTO_LOCALE_CODES = ['zh-CN', 'en-US'] as const;
