import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface IndexCatalogEntry {
  id: string;
  title: string;
  description: string;
  path: string;
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
    category: String(entry.category),
    sourceRepo: String(entry.sourceRepo),
    lastUpdated: String(entry.lastUpdated),
    status: String(entry.status),
    readmePath:
      typeof entry.readmePath === 'string' && entry.readmePath.trim().length > 0
        ? entry.readmePath
        : undefined,
    sourceUrl:
      typeof entry.sourceUrl === 'string' && entry.sourceUrl.trim().length > 0
        ? entry.sourceUrl
        : undefined,
  };
}

export async function loadIndexCatalog(): Promise<IndexCatalog> {
  const catalogPath = path.join(process.cwd(), 'public', 'index-catalog.json');
  const raw = await readFile(catalogPath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<IndexCatalog>;

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
