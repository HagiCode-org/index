import { loadRouteMappedJson } from './json-publication.ts';

export interface DesignCatalogTheme {
  slug: string;
  title: string;
  sourceDirectoryUrl: string;
  readmeUrl: string;
  designUrl: string;
  designDownloadUrl: string;
  previewLightImageUrl: string;
  previewLightAlt: string;
  previewDarkImageUrl: string;
  previewDarkAlt: string;
  detailUrl: string;
}

export interface DesignCatalog {
  version: string;
  updatedAt: string;
  vendorPath: string;
  sourceRepository: string;
  detailBaseUrl: string;
  themeCount: number;
  themes: DesignCatalogTheme[];
}

const requiredThemeFields = [
  'slug',
  'title',
  'sourceDirectoryUrl',
  'readmeUrl',
  'designUrl',
  'designDownloadUrl',
  'previewLightImageUrl',
  'previewLightAlt',
  'previewDarkImageUrl',
  'previewDarkAlt',
  'detailUrl',
] as const;

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Design catalog field "${fieldName}" must be a non-empty string.`);
  }

  return value;
}

function normalizeTheme(rawTheme: unknown): DesignCatalogTheme {
  if (!rawTheme || typeof rawTheme !== 'object') {
    throw new Error('Design catalog theme must be an object.');
  }

  const theme = rawTheme as Record<string, unknown>;

  for (const field of requiredThemeFields) {
    assertString(theme[field], field);
  }

  return {
    slug: String(theme.slug),
    title: String(theme.title),
    sourceDirectoryUrl: String(theme.sourceDirectoryUrl),
    readmeUrl: String(theme.readmeUrl),
    designUrl: String(theme.designUrl),
    designDownloadUrl: String(theme.designDownloadUrl),
    previewLightImageUrl: String(theme.previewLightImageUrl),
    previewLightAlt: String(theme.previewLightAlt),
    previewDarkImageUrl: String(theme.previewDarkImageUrl),
    previewDarkAlt: String(theme.previewDarkAlt),
    detailUrl: String(theme.detailUrl),
  };
}

export async function loadDesignCatalog(): Promise<DesignCatalog> {
  const parsed = await loadRouteMappedJson<Partial<DesignCatalog>>('/design.json');

  if (typeof parsed.version !== 'string' || parsed.version.trim().length === 0) {
    throw new Error('Design catalog must define a version string.');
  }

  if (typeof parsed.updatedAt !== 'string' || parsed.updatedAt.trim().length === 0) {
    throw new Error('Design catalog must define updatedAt.');
  }

  if (typeof parsed.vendorPath !== 'string' || parsed.vendorPath.trim().length === 0) {
    throw new Error('Design catalog must define vendorPath.');
  }

  if (typeof parsed.sourceRepository !== 'string' || parsed.sourceRepository.trim().length === 0) {
    throw new Error('Design catalog must define sourceRepository.');
  }

  if (typeof parsed.detailBaseUrl !== 'string' || parsed.detailBaseUrl.trim().length === 0) {
    throw new Error('Design catalog must define detailBaseUrl.');
  }

  if (!Number.isInteger(parsed.themeCount) || Number(parsed.themeCount) < 0) {
    throw new Error('Design catalog must define themeCount.');
  }

  if (!Array.isArray(parsed.themes)) {
    throw new Error('Design catalog must define a themes array.');
  }

  return {
    version: parsed.version,
    updatedAt: parsed.updatedAt,
    vendorPath: parsed.vendorPath,
    sourceRepository: parsed.sourceRepository,
    detailBaseUrl: parsed.detailBaseUrl,
    themeCount: Number(parsed.themeCount),
    themes: parsed.themes.map(normalizeTheme),
  };
}
