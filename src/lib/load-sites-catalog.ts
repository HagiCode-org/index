import { loadRouteMappedJson } from './json-publication.ts';

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

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Sites catalog field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function normalizeGroup(rawGroup: unknown): SitesCatalogGroup {
  if (!rawGroup || typeof rawGroup !== 'object') {
    throw new Error('Sites catalog group must be an object.');
  }

  const group = rawGroup as Record<string, unknown>;

  for (const field of requiredGroupFields) {
    assertString(group[field], field);
  }

  return {
    id: String(group.id),
    label: String(group.label),
    description: String(group.description),
  };
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

function normalizeEntry(rawEntry: unknown): SitesCatalogEntry {
  if (!rawEntry || typeof rawEntry !== 'object') {
    throw new Error('Sites catalog entry must be an object.');
  }

  const entry = rawEntry as Record<string, unknown>;

  for (const field of requiredEntryFields) {
    assertString(entry[field], field);
  }

  return {
    id: String(entry.id),
    title: String(entry.title),
    label: String(entry.label),
    description: String(entry.description),
    groupId: String(entry.groupId),
    url: normalizeUrl(entry.url, String(entry.id)),
    actionLabel: String(entry.actionLabel),
  };
}

export async function loadSitesCatalog(): Promise<SitesCatalog> {
  const parsed = await loadRouteMappedJson<Partial<SitesCatalog>>('/sites.json');

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

  const groups = parsed.groups.map(normalizeGroup);
  const groupIds = new Set(groups.map((group) => group.id));
  const entries = parsed.entries.map(normalizeEntry);

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
