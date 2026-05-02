import { loadRouteMappedJson } from './json-publication.ts';

export interface IndexCatalogEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  historyPagePath?: string;
  category: string;
  sourceRepo: string;
  lastUpdated: string;
  status: string;
  readmePath?: string;
  sourceUrl?: string;
}

export interface IndexCatalog {
  version: string;
  generatedAt: string;
  entries: IndexCatalogEntry[];
}

const requiredEntryFields = [
  'id',
  'title',
  'description',
  'path',
  'category',
  'sourceRepo',
  'lastUpdated',
  'status',
] as const;

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Catalog field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function normalizeEntry(rawEntry: unknown): IndexCatalogEntry {
  if (!rawEntry || typeof rawEntry !== 'object') {
    throw new Error('Catalog entry must be an object.');
  }

  const entry = rawEntry as Record<string, unknown>;

  for (const field of requiredEntryFields) {
    assertString(entry[field], field);
  }

  return {
    id: String(entry.id),
    title: String(entry.title),
    description: String(entry.description),
    path: String(entry.path),
    historyPagePath: optionalString(entry.historyPagePath),
    category: String(entry.category),
    sourceRepo: String(entry.sourceRepo),
    lastUpdated: String(entry.lastUpdated),
    status: String(entry.status),
    readmePath: optionalString(entry.readmePath),
    sourceUrl: optionalString(entry.sourceUrl),
  };
}

export async function loadIndexCatalog(): Promise<IndexCatalog> {
  const parsed = await loadRouteMappedJson<Partial<IndexCatalog>>('/index-catalog.json');

  if (typeof parsed.version !== 'string' || parsed.version.trim().length === 0) {
    throw new Error('Catalog must define a version string.');
  }

  if (typeof parsed.generatedAt !== 'string' || parsed.generatedAt.trim().length === 0) {
    throw new Error('Catalog must define generatedAt.');
  }

  if (!Array.isArray(parsed.entries)) {
    throw new Error('Catalog must define an entries array.');
  }

  return {
    version: parsed.version,
    generatedAt: parsed.generatedAt,
    entries: parsed.entries.map(normalizeEntry),
  };
}
