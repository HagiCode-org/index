import {
  DEFAULT_DESKTOP_LANGUAGE,
  DESKTOP_LANGUAGES,
  type DesktopLanguageCode,
} from './desktop-language-contract.ts';
import { loadRouteMappedJson } from './json-publication.ts';

export type SitesCatalogLocalizedField = Readonly<Record<DesktopLanguageCode, string>>;

export interface SitesCatalogLocalizedGroup {
  id: string;
  label: SitesCatalogLocalizedField;
  description: SitesCatalogLocalizedField;
}

export interface SitesCatalogLocalizedEntry {
  id: string;
  title: SitesCatalogLocalizedField;
  label: SitesCatalogLocalizedField;
  description: SitesCatalogLocalizedField;
  groupId: string;
  url: string;
  actionLabel: SitesCatalogLocalizedField;
}

export interface SitesCatalogSource {
  version: string;
  generatedAt: string;
  groups: SitesCatalogLocalizedGroup[];
  entries: SitesCatalogLocalizedEntry[];
}

export interface SitesCatalogGroup {
  id: string;
  label: string;
  description: string;
}

export interface SitesCatalogEntry {
  id: string;
  title: string;
  label: string;
  description: string;
  groupId: string;
  url: string;
  actionLabel: string;
}

export interface SitesCatalog {
  version: string;
  generatedAt: string;
  groups: SitesCatalogGroup[];
  entries: SitesCatalogEntry[];
}

const requiredGroupFields = ['id', 'label', 'description'] as const;
const requiredEntryFields = ['id', 'title', 'label', 'description', 'groupId', 'url', 'actionLabel'] as const;
const desktopLanguageLookup = new Map(
  DESKTOP_LANGUAGES.map((language) => [language.code, language]),
);

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Sites catalog field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function assertPlainObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Sites catalog field "${fieldName}" must be an object.`);
  }

  return value as Record<string, unknown>;
}

function normalizeLocalizedField(value: unknown, fieldName: string): SitesCatalogLocalizedField {
  const localizedValue = assertPlainObject(value, fieldName);

  return Object.fromEntries(
    DESKTOP_LANGUAGES.map((language) => [
      language.code,
      assertString(localizedValue[language.code], `${fieldName}.${language.code}`),
    ]),
  ) as SitesCatalogLocalizedField;
}

function resolveLocalizedField(value: SitesCatalogLocalizedField, locale: DesktopLanguageCode): string {
  const language = desktopLanguageLookup.get(locale);
  const resolutionChain = [locale, ...(language?.fallbackCodes ?? []), DEFAULT_DESKTOP_LANGUAGE];

  for (const candidate of resolutionChain) {
    const localizedValue = value[candidate];
    if (typeof localizedValue === 'string' && localizedValue.trim().length > 0) {
      return localizedValue;
    }
  }

  throw new Error(`Sites catalog localization for locale "${locale}" is unavailable after fallback resolution.`);
}

function normalizeUrl(value: unknown, entryId: string): string {
  const raw = assertString(value, 'url');
  const parsed = new URL(raw);

  if (parsed.protocol !== 'https:') {
    throw new Error(`Sites catalog entry "${entryId}" url must use https.`);
  }

  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
    throw new Error(`Sites catalog entry "${entryId}" url must not point to a local address.`);
  }

  return parsed.toString();
}

function normalizeGroup(rawGroup: unknown, locale: DesktopLanguageCode): SitesCatalogGroup {
  const group = assertPlainObject(rawGroup, 'group');

  for (const field of requiredGroupFields) {
    if (field === 'id') {
      assertString(group[field], field);
      continue;
    }

    normalizeLocalizedField(group[field], field);
  }

  return {
    id: String(group.id),
    label: resolveLocalizedField(normalizeLocalizedField(group.label, 'label'), locale),
    description: resolveLocalizedField(normalizeLocalizedField(group.description, 'description'), locale),
  };
}

function normalizeEntry(rawEntry: unknown, locale: DesktopLanguageCode): SitesCatalogEntry {
  const entry = assertPlainObject(rawEntry, 'entry');

  for (const field of requiredEntryFields) {
    if (field === 'id' || field === 'groupId' || field === 'url') {
      assertString(entry[field], field);
      continue;
    }

    normalizeLocalizedField(entry[field], field);
  }

  return {
    id: String(entry.id),
    title: resolveLocalizedField(normalizeLocalizedField(entry.title, 'title'), locale),
    label: resolveLocalizedField(normalizeLocalizedField(entry.label, 'label'), locale),
    description: resolveLocalizedField(normalizeLocalizedField(entry.description, 'description'), locale),
    groupId: String(entry.groupId),
    url: normalizeUrl(entry.url, String(entry.id)),
    actionLabel: resolveLocalizedField(normalizeLocalizedField(entry.actionLabel, 'actionLabel'), locale),
  };
}

export async function loadSitesCatalogSource(): Promise<SitesCatalogSource> {
  const parsed = await loadRouteMappedJson<Partial<SitesCatalogSource>>('/sites.json');

  if (typeof parsed.version !== 'string' || parsed.version.trim().length === 0) {
    throw new Error('Sites catalog must define a version string.');
  }

  if (typeof parsed.generatedAt !== 'string' || parsed.generatedAt.trim().length === 0) {
    throw new Error('Sites catalog must define generatedAt.');
  }

  if (!Array.isArray(parsed.groups)) {
    throw new Error('Sites catalog must define a groups array.');
  }

  if (!Array.isArray(parsed.entries)) {
    throw new Error('Sites catalog must define an entries array.');
  }

  return parsed as SitesCatalogSource;
}

export async function loadSitesCatalog(locale: DesktopLanguageCode = DEFAULT_DESKTOP_LANGUAGE): Promise<SitesCatalog> {
  const parsed = await loadSitesCatalogSource();
  const groups = parsed.groups.map((group) => normalizeGroup(group, locale));
  const groupIds = new Set(groups.map((group) => group.id));
  const entries = parsed.entries.map((entry) => normalizeEntry(entry, locale));

  for (const entry of entries) {
    if (!groupIds.has(entry.groupId)) {
      throw new Error(`Sites catalog entry "${entry.id}" references unknown groupId "${entry.groupId}".`);
    }
  }

  return {
    version: parsed.version,
    generatedAt: parsed.generatedAt,
    groups,
    entries,
  };
}
