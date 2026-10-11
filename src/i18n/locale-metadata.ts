export const INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE = 'zh-CN';
export const INDEX_PUBLISHED_CONTENT_BASE_LOCALE = 'en-US';

export const INDEX_PUBLISHED_CONTENT_LOCALES = [
  {
    code: 'zh-CN',
    steamCode: 'zh-CN',
    name: 'Simplified Chinese',
    nativeName: '简体中文',
    shortLabel: '简中',
    fallbackCodes: ['en-US'],
    aliases: ['zh', 'zh-cn', 'zh-hans', 'zh-sg'],
  },
  {
    code: 'zh-Hant',
    steamCode: 'zh-TW',
    name: 'Traditional Chinese',
    nativeName: '繁體中文',
    shortLabel: '繁中',
    fallbackCodes: ['zh-CN', 'en-US'],
    aliases: ['zh-hant', 'zh-tw', 'zh-hk', 'zh-mo'],
  },
  {
    code: 'en-US',
    steamCode: 'en-US',
    name: 'English',
    nativeName: 'English',
    shortLabel: 'EN',
    fallbackCodes: ['en-US'],
    aliases: ['en', 'en-us'],
  },
  {
    code: 'ja-JP',
    steamCode: 'ja-JP',
    name: 'Japanese',
    nativeName: '日本語',
    shortLabel: '日本',
    fallbackCodes: ['en-US'],
    aliases: ['ja', 'ja-jp'],
  },
  {
    code: 'ko-KR',
    steamCode: 'ko-KR',
    name: 'Korean',
    nativeName: '한국어',
    shortLabel: '한국',
    fallbackCodes: ['en-US'],
    aliases: ['ko', 'ko-kr'],
  },
  {
    code: 'de-DE',
    steamCode: 'de-DE',
    name: 'German',
    nativeName: 'Deutsch',
    shortLabel: 'DE',
    fallbackCodes: ['en-US'],
    aliases: ['de', 'de-de'],
  },
  {
    code: 'fr-FR',
    steamCode: 'fr-FR',
    name: 'French',
    nativeName: 'Français',
    shortLabel: 'FR',
    fallbackCodes: ['en-US'],
    aliases: ['fr', 'fr-fr'],
  },
  {
    code: 'es-ES',
    steamCode: 'es-ES',
    name: 'Spanish (Spain)',
    nativeName: 'Español (España)',
    shortLabel: 'ES',
    fallbackCodes: ['en-US'],
    aliases: ['es', 'es-es'],
  },
  {
    code: 'pt-BR',
    steamCode: 'pt-BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    shortLabel: 'PT-BR',
    fallbackCodes: ['en-US'],
    aliases: ['pt', 'pt-br'],
  },
  {
    code: 'ru-RU',
    steamCode: 'ru-RU',
    name: 'Russian',
    nativeName: 'Русский',
    shortLabel: 'RU',
    fallbackCodes: ['en-US'],
    aliases: ['ru', 'ru-ru'],
  },
] as const;

export type IndexPublishedContentLocale = (typeof INDEX_PUBLISHED_CONTENT_LOCALES)[number]['code'];
export type IndexPublishedContentLocaleDefinition = (typeof INDEX_PUBLISHED_CONTENT_LOCALES)[number];

export const SUPPORTED_INDEX_PUBLISHED_CONTENT_LOCALES = INDEX_PUBLISHED_CONTENT_LOCALES.map(
  (locale) => locale.code,
) as readonly IndexPublishedContentLocale[];

const localeByCode = new Map<IndexPublishedContentLocale, IndexPublishedContentLocaleDefinition>(
  INDEX_PUBLISHED_CONTENT_LOCALES.map((locale) => [locale.code, locale] as const),
);

function canonicalizeLocale(locale: string): string {
  const candidate = locale.trim().replace(/_/g, '-');
  if (!candidate) {
    return '';
  }

  const intlWithCanonicalLocales = Intl as typeof Intl & {
    getCanonicalLocales?: (locales: string | readonly string[]) => string[];
  };

  try {
    return intlWithCanonicalLocales.getCanonicalLocales?.(candidate)?.[0] ?? candidate;
  } catch {
    return candidate;
  }
}

function buildLocaleAliasMap() {
  const aliases = new Map<string, IndexPublishedContentLocale>();

  for (const locale of INDEX_PUBLISHED_CONTENT_LOCALES) {
    aliases.set(locale.code.toLowerCase(), locale.code);
    aliases.set(locale.steamCode.toLowerCase(), locale.code);

    for (const alias of locale.aliases) {
      const canonicalAlias = canonicalizeLocale(alias).toLowerCase();
      aliases.set(canonicalAlias || alias.toLowerCase(), locale.code);
    }
  }

  return aliases;
}

const localeByNormalizedInput = buildLocaleAliasMap();
const localeByLanguage = new Map<string, IndexPublishedContentLocale>(
  INDEX_PUBLISHED_CONTENT_LOCALES.map((locale) => [locale.code.split('-')[0].toLowerCase(), locale.code] as const),
);

export function getIndexPublishedContentLocaleDefinition(
  locale: IndexPublishedContentLocale,
): IndexPublishedContentLocaleDefinition {
  const definition = localeByCode.get(locale);
  if (!definition) {
    throw new Error(`Unsupported Index published-content locale: ${locale}`);
  }

  return definition;
}

export function normalizeIndexPublishedContentLocale(
  locale: string | null | undefined,
): IndexPublishedContentLocale | null {
  if (!locale) {
    return null;
  }

  const canonical = canonicalizeLocale(locale);
  const normalized = canonical.toLowerCase();
  if (!normalized) {
    return null;
  }

  const directMatch = localeByNormalizedInput.get(normalized);
  if (directMatch) {
    return directMatch;
  }

  const [languagePart] = normalized.split('-');
  return localeByLanguage.get(languagePart) ?? null;
}

export function resolveIndexPublishedContentLocale(
  locale: string | null | undefined,
  fallback: IndexPublishedContentLocale = INDEX_PUBLISHED_CONTENT_DEFAULT_LOCALE,
): IndexPublishedContentLocale {
  return normalizeIndexPublishedContentLocale(locale) ?? fallback;
}
