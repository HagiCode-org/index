export const DEFAULT_DESKTOP_LANGUAGE = 'zh-CN';

export const SUPPORTED_DESKTOP_LANGUAGE_CODES = [
  'zh-CN',
  'zh-Hant',
  'en-US',
  'ja-JP',
  'ko-KR',
  'de-DE',
  'fr-FR',
  'es-ES',
  'pt-BR',
  'ru-RU',
] as const;

export type DesktopLanguageCode = (typeof SUPPORTED_DESKTOP_LANGUAGE_CODES)[number];

export interface DesktopLanguage {
  readonly code: DesktopLanguageCode;
  readonly name: string;
  readonly nativeName: string;
  readonly shortLabel: string;
  readonly fallbackCodes: readonly DesktopLanguageCode[];
}

export const DESKTOP_LANGUAGES: readonly DesktopLanguage[] = [
  {
    code: 'zh-CN',
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    shortLabel: '中',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'zh-Hant',
    name: 'Traditional Chinese',
    nativeName: '繁體中文',
    shortLabel: '繁',
    fallbackCodes: ['zh-CN', 'en-US'],
  },
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    shortLabel: 'EN',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    shortLabel: '日',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    shortLabel: '한',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    shortLabel: 'DE',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    shortLabel: 'FR',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'es-ES',
    name: 'Spanish',
    nativeName: 'Español',
    shortLabel: 'ES',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    shortLabel: 'PT',
    fallbackCodes: ['en-US'],
  },
  {
    code: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    shortLabel: 'RU',
    fallbackCodes: ['en-US'],
  },
] as const;

export const PRIMARY_PROMOTO_LOCALE_CODES = ['zh-CN', 'en-US'] as const;
