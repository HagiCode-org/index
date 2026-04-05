import { loadRouteMappedJson } from './json-publication.ts';

export type PackageHistorySource = 'server' | 'desktop';
export type VersionHistoryFileSourceKind = 'release' | 'assets' | 'downloads' | 'artifacts' | 'files';

export interface VersionHistoryAction {
  kind: 'download' | 'raw-json';
  label: string;
  href: string;
}

export interface VersionHistoryDownloadSource {
  kind: string;
  label: string;
  href: string;
  primary: boolean;
}

export interface VersionHistoryFileEntry {
  label: string;
  href: string | null;
  sizeBytes: number | null;
  sizeLabel: string | null;
  publishedAt: string | null;
  publishedLabel: string;
  sourceKind: VersionHistoryFileSourceKind;
  sources: VersionHistoryDownloadSource[];
}

export interface VersionHistoryRecord {
  version: string;
  publishedAt: string | null;
  publishedLabel: string;
  primaryArtifactLabel: string;
  hasDirectDownload: boolean;
  fileCount: number;
  downloadableFileCount: number;
  files: VersionHistoryFileEntry[];
  actions: VersionHistoryAction[];
}

export interface PackageHistoryPageModel {
  source: PackageHistorySource;
  sourceLabel: string;
  title: string;
  description: string;
  sourceJsonPath: string;
  generatedAt: string | null;
  generatedAtLabel: string;
  releases: VersionHistoryRecord[];
  latestRelease: VersionHistoryRecord | null;
}

interface NormalizedReleaseRecord extends VersionHistoryRecord {
  sortTimestamp: number | null;
  originalIndex: number;
}

interface SourceMeta {
  sourceLabel: string;
  title: string;
  description: string;
  sourceJsonPath: string;
}

const releaseDateCandidateKeys = [
  'publishedAt',
  'releaseDate',
  'updatedAt',
  'createdAt',
  'published_at',
  'release_date',
  'updated_at',
  'created_at',
] as const;

const directDownloadKeys = [
  'directUrl',
  'downloadUrl',
  'url',
  'downloadURL',
  'download_url',
  'assetUrl',
  'browserDownloadUrl',
  'href',
  'path',
] as const;
const structuredArtifactCollectionKeys = ['assets', 'downloads', 'artifacts'] as const;
const artifactLabelKeys = ['displayName', 'name', 'fileName', 'filename', 'label', 'path'] as const;
const artifactDateCandidateKeys = [
  'lastModified',
  'publishedAt',
  'releaseDate',
  'updatedAt',
  'createdAt',
  'published_at',
  'release_date',
  'updated_at',
  'created_at',
] as const;
const artifactSizeCandidateKeys = ['size', 'fileSize', 'contentLength', 'length', 'bytes'] as const;
const structuredDownloadSourceLabels: Record<string, string> = {
  official: '官网下载',
  'github-release': 'GitHub Release',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getSourceMeta(source: PackageHistorySource): SourceMeta {
  if (source === 'server') {
    return {
      sourceLabel: 'Server',
      title: 'HagiCode Server 版本历史',
      description: '基于 /server/index.json 渲染，按版本分组展示 Server 可下载 ZIP 包。',
      sourceJsonPath: '/server/index.json',
    };
  }

  return {
    sourceLabel: 'Desktop',
    title: 'HagiCode Desktop 版本历史',
    description: '基于 /desktop/index.json 渲染，按版本分组展示 Desktop 发布文件清单。',
    sourceJsonPath: '/desktop/index.json',
  };
}

function getStringCandidate(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNumberCandidate(record: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getBooleanCandidate(record: Record<string, unknown>, keys: readonly string[]): boolean | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'boolean') {
      return value;
    }
  }

  return null;
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatDateLabel(value: string | null): string {
  const timestamp = parseTimestamp(value);

  if (timestamp === null) {
    return '发布日期未知';
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatGeneratedAtLabel(value: string | null): string {
  const timestamp = parseTimestamp(value);

  if (timestamp === null) {
    return '未知';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

function formatBytes(value: number | null): string | null {
  if (value === null || value < 0) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let current = value;
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = current >= 100 || unitIndex === 0 ? 0 : current >= 10 ? 1 : 2;
  return `${current.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

function normalizeHref(rawHref: string, sourceJsonPath: string): string {
  if (/^https?:\/\//i.test(rawHref)) {
    return rawHref;
  }

  if (rawHref.startsWith('/')) {
    return rawHref;
  }

  const resolved = new URL(rawHref, `https://index.hagicode.com${sourceJsonPath}`);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

function deriveArtifactLabel(record: Record<string, unknown>, fallbackHref: string | null): string {
  const namedArtifact = getStringCandidate(record, artifactLabelKeys);

  if (namedArtifact) {
    return namedArtifact.split('/').at(-1) ?? namedArtifact;
  }

  if (fallbackHref) {
    return fallbackHref.split('/').at(-1) ?? fallbackHref;
  }

  return '无直接下载';
}

function normalizeArtifactRecord(
  artifact: Record<string, unknown>,
  sourceKind: VersionHistoryFileSourceKind,
  sourceJsonPath: string,
  fallbackPublishedAt: string | null,
): VersionHistoryFileEntry {
  const structuredSources = normalizeStructuredDownloadSources(artifact, sourceJsonPath);
  const primaryStructuredSource = structuredSources.find((source) => source.primary) ?? structuredSources[0] ?? null;
  const fallbackHref = getStringCandidate(artifact, directDownloadKeys);
  const publishedAt = getStringCandidate(artifact, artifactDateCandidateKeys) ?? fallbackPublishedAt;
  const sizeBytes = getNumberCandidate(artifact, artifactSizeCandidateKeys);
  const artifactHref = primaryStructuredSource?.href ?? (fallbackHref ? normalizeHref(fallbackHref, sourceJsonPath) : null);

  return {
    label: deriveArtifactLabel(artifact, artifactHref),
    href: artifactHref,
    sizeBytes,
    sizeLabel: formatBytes(sizeBytes),
    publishedAt,
    publishedLabel: formatDateLabel(publishedAt),
    sourceKind,
    sources: structuredSources,
  };
}

function normalizeFileArrayEntry(
  artifact: unknown,
  sourceJsonPath: string,
  fallbackPublishedAt: string | null,
): VersionHistoryFileEntry | null {
  if (typeof artifact === 'string') {
    const trimmed = artifact.trim();

    if (!trimmed) {
      return null;
    }

    return {
      label: trimmed.split('/').at(-1) ?? trimmed,
      href: normalizeHref(trimmed, sourceJsonPath),
      sizeBytes: null,
      sizeLabel: null,
      publishedAt: fallbackPublishedAt,
      publishedLabel: formatDateLabel(fallbackPublishedAt),
      sourceKind: 'files',
      sources: [],
    };
  }

  if (!isRecord(artifact)) {
    return null;
  }

  return normalizeArtifactRecord(artifact, 'files', sourceJsonPath, fallbackPublishedAt);
}

function normalizeReleaseArtifacts(
  release: Record<string, unknown>,
  sourceJsonPath: string,
  fallbackPublishedAt: string | null,
): VersionHistoryFileEntry[] {
  const structuredArtifacts = structuredArtifactCollectionKeys.flatMap((collectionKey) => {
    const collection = release[collectionKey];

    if (!Array.isArray(collection)) {
      return [];
    }

    return collection
      .filter(isRecord)
      .map((artifact) => normalizeArtifactRecord(artifact, collectionKey, sourceJsonPath, fallbackPublishedAt));
  });

  if (structuredArtifacts.length > 0) {
    return structuredArtifacts;
  }

  if (Array.isArray(release.files)) {
    const normalizedFiles = release.files
      .map((artifact) => normalizeFileArrayEntry(artifact, sourceJsonPath, fallbackPublishedAt))
      .filter((artifact): artifact is VersionHistoryFileEntry => artifact !== null);

    if (normalizedFiles.length > 0) {
      return normalizedFiles;
    }
  }

  const releaseDownload = getStringCandidate(release, directDownloadKeys);

  if (!releaseDownload) {
    return [];
  }

  const releaseSize = getNumberCandidate(release, artifactSizeCandidateKeys);

  return [
    {
      label: deriveArtifactLabel(release, releaseDownload),
      href: normalizeHref(releaseDownload, sourceJsonPath),
      sizeBytes: releaseSize,
      sizeLabel: formatBytes(releaseSize),
      publishedAt: fallbackPublishedAt,
      publishedLabel: formatDateLabel(fallbackPublishedAt),
      sourceKind: 'release',
      sources: [],
    },
  ];
}

function normalizeStructuredDownloadSources(
  artifact: Record<string, unknown>,
  sourceJsonPath: string,
): VersionHistoryDownloadSource[] {
  const rawSources = artifact.downloadSources;
  if (!Array.isArray(rawSources)) {
    return [];
  }

  const deduped = new Map<string, VersionHistoryDownloadSource>();
  for (const rawSource of rawSources) {
    if (!isRecord(rawSource)) {
      continue;
    }

    const href = getStringCandidate(rawSource, ['url', 'href']);
    if (!href) {
      continue;
    }

    const normalizedHref = normalizeHref(href, sourceJsonPath);
    const kind = getStringCandidate(rawSource, ['kind'])?.toLowerCase() ?? 'download';
    const label = structuredDownloadSourceLabels[kind]
      ?? getStringCandidate(rawSource, ['label', 'name'])
      ?? kind;
    const normalizedSource: VersionHistoryDownloadSource = {
      kind,
      label,
      href: normalizedHref,
      primary: getBooleanCandidate(rawSource, ['primary']) ?? false,
    };
    const dedupeKey = normalizedHref.toLowerCase();
    const existing = deduped.get(dedupeKey);

    if (!existing || (!existing.primary && normalizedSource.primary)) {
      deduped.set(dedupeKey, normalizedSource);
    }
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.primary !== right.primary) {
      return left.primary ? -1 : 1;
    }

    return left.label.localeCompare(right.label, 'zh-CN', { sensitivity: 'base' });
  });
}

function shouldDisplayFile(source: PackageHistorySource, file: VersionHistoryFileEntry): boolean {
  if (source !== 'server') {
    return true;
  }

  return Boolean(file.href) && file.label.toLowerCase().endsWith('.zip');
}

function compareSemverLikeDescending(leftVersion: string, rightVersion: string): number {
  const normalize = (version: string) => version.replace(/^v/i, '');
  const splitVersion = (version: string) => normalize(version).split('-');
  const [leftBase, leftSuffix = ''] = splitVersion(leftVersion);
  const [rightBase, rightSuffix = ''] = splitVersion(rightVersion);
  const leftParts = leftBase.split('.');
  const rightParts = rightBase.split('.');
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? '0';
    const rightPart = rightParts[index] ?? '0';
    const leftNumber = Number.parseInt(leftPart, 10);
    const rightNumber = Number.parseInt(rightPart, 10);
    const bothNumeric = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);

    if (bothNumeric && leftNumber !== rightNumber) {
      return rightNumber - leftNumber;
    }

    if (!bothNumeric) {
      const lexicographic = rightPart.localeCompare(leftPart, 'en', { sensitivity: 'base' });
      if (lexicographic !== 0) {
        return lexicographic;
      }
    }
  }

  if (Boolean(leftSuffix) !== Boolean(rightSuffix)) {
    return leftSuffix ? 1 : -1;
  }

  return normalize(rightVersion).localeCompare(normalize(leftVersion), 'en', {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareReleaseRecords(
  leftRecord: NormalizedReleaseRecord,
  rightRecord: NormalizedReleaseRecord,
): number {
  if (leftRecord.sortTimestamp !== null && rightRecord.sortTimestamp !== null) {
    if (leftRecord.sortTimestamp !== rightRecord.sortTimestamp) {
      return rightRecord.sortTimestamp - leftRecord.sortTimestamp;
    }
  } else if (leftRecord.sortTimestamp !== null || rightRecord.sortTimestamp !== null) {
    return leftRecord.sortTimestamp === null ? 1 : -1;
  }

  const versionComparison = compareSemverLikeDescending(leftRecord.version, rightRecord.version);

  if (versionComparison !== 0) {
    return versionComparison;
  }

  return leftRecord.originalIndex - rightRecord.originalIndex;
}

function getReleaseCollection(indexPayload: unknown): unknown[] {
  if (!isRecord(indexPayload)) {
    return [];
  }

  if (Array.isArray(indexPayload.packages)) {
    return indexPayload.packages;
  }

  if (Array.isArray(indexPayload.versions)) {
    return indexPayload.versions;
  }

  return [];
}

function normalizeReleaseRecord(
  source: PackageHistorySource,
  release: unknown,
  originalIndex: number,
  sourceJsonPath: string,
): NormalizedReleaseRecord {
  const releaseRecord = isRecord(release) ? release : {};
  const version = getStringCandidate(releaseRecord, ['version', 'tag', 'name']) ?? `未命名版本 ${originalIndex + 1}`;
  const publishedAt = getStringCandidate(releaseRecord, releaseDateCandidateKeys);
  const files = normalizeReleaseArtifacts(releaseRecord, sourceJsonPath, publishedAt).filter((file) =>
    shouldDisplayFile(source, file),
  );
  const primaryFile = files.find((file) => file.href) ?? files[0] ?? null;
  const downloadableFileCount = files.filter((file) => file.href).length;

  return {
    version,
    publishedAt,
    publishedLabel: formatDateLabel(publishedAt),
    primaryArtifactLabel: primaryFile?.label ?? (source === 'server' ? '无 ZIP 下载' : '无文件记录'),
    hasDirectDownload: Boolean(files.find((file) => file.href)),
    fileCount: files.length,
    downloadableFileCount,
    files,
    actions: [
      ...(primaryFile?.href
        ? [
            {
              kind: 'download' as const,
              label: '下载',
              href: primaryFile.href,
            },
          ]
        : []),
      {
        kind: 'raw-json' as const,
        label: '原始 JSON',
        href: sourceJsonPath,
      },
    ],
    sortTimestamp: parseTimestamp(publishedAt),
    originalIndex,
  };
}

export function normalizePackageHistoryIndex(
  source: PackageHistorySource,
  indexPayload: unknown,
): PackageHistoryPageModel {
  const meta = getSourceMeta(source);
  const indexRecord = isRecord(indexPayload) ? indexPayload : {};
  const generatedAt =
    typeof indexRecord.generatedAt === 'string' && indexRecord.generatedAt.trim().length > 0
      ? indexRecord.generatedAt
      : null;
  const releases = getReleaseCollection(indexPayload)
    .map((release, index) => normalizeReleaseRecord(source, release, index, meta.sourceJsonPath))
    .sort(compareReleaseRecords)
    .map(({ sortTimestamp: _sortTimestamp, originalIndex: _originalIndex, ...release }) => release);

  return {
    source,
    sourceLabel: meta.sourceLabel,
    title: meta.title,
    description: meta.description,
    sourceJsonPath: meta.sourceJsonPath,
    generatedAt,
    generatedAtLabel: formatGeneratedAtLabel(generatedAt),
    releases,
    latestRelease: releases[0] ?? null,
  };
}

export async function loadPackageHistory(
  source: PackageHistorySource,
): Promise<PackageHistoryPageModel> {
  const parsed = await loadRouteMappedJson(`/${source}/index.json`);

  return normalizePackageHistoryIndex(source, parsed);
}
