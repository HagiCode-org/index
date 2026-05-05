export const SUPPORTED_I18N_LOCALES = [
  'bg-BG',
  'cs-CZ',
  'da-DK',
  'de-DE',
  'el-GR',
  'en-US',
  'es-419',
  'es-ES',
  'fi-FI',
  'fr-FR',
  'hu-HU',
  'id-ID',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'nb-NO',
  'nl-NL',
  'pl-PL',
  'pt-BR',
  'pt-PT',
  'ro-RO',
  'ru-RU',
  'sv-SE',
  'th-TH',
  'tr-TR',
  'uk-UA',
  'vi-VN',
  'zh-CN',
  'zh-Hant',
] as const;

export type SupportedI18nLocale = (typeof SUPPORTED_I18N_LOCALES)[number];

export const BASE_I18N_LOCALE = 'en-US' satisfies SupportedI18nLocale;
export const DEFAULT_RENDER_LOCALE = 'zh-CN' satisfies SupportedI18nLocale;

export const REQUIRED_I18N_NAMESPACES = [
  'hagindex',
  'promoto',
  'promote-content',
] as const;

export type RequiredI18nNamespace = (typeof REQUIRED_I18N_NAMESPACES)[number];

export const GENERATED_LOCALE_ROOT = 'src/i18n/generated-locales';
