export const SUPPORTED_I18N_LOCALES = [
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
