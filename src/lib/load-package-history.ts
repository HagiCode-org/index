import { loadRouteMappedJson } from './json-publication.ts';

export type PackageHistorySource = 'server' | 'desktop';

export interface VersionHistoryAction {
  kind: 'download' | 'raw-json';
  label: string;
  href: string;
}

export interface VersionHistoryRecord {
  version: string;
  publishedAt: string | null;
  publishedLabel: string;
  primaryArtifactLabel: string;
  hasDirectDownload: boolean;
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

const directDownloadKeys = ['downloadUrl', 'url', 'downloadURL', 'download_url', 'assetUrl'] as const;
const artifactCollectionKeys = ['files', 'assets', 'downloads', 'artifacts'] as const;
const artifactLabelKeys = ['displayName', 'name', 'fileName', 'filename', 'label', 'path'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getSourceMeta(source: PackageHistorySource): SourceMeta {
  if (source === 'server') {
    return {
      sourceLabel: 'Server',
      title: 'HagiCode Server 版本历史',
      description: '基于 /server/index.json 渲染的静态版本历史页。',
      sourceJsonPath: '/server/index.json',
    };
  }

  return {
    sourceLabel: 'Desktop',
    title: 'HagiCode Desktop 版本历史',
    description: '基于 /desktop/index.json 渲染的静态版本历史页。',
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

function normalizeHref(rawHref: string, sourceJsonPath: string): string {
  if (/^https?:\/\//i.test(rawHref)) {
    return rawHref;
  }

  if (rawHref.startsWith('/')) {
    return rawHref;
  }

  return new URL(rawHref, `https://index.hagicode.com${sourceJsonPath}`).pathname;
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

function deriveDownloadAction(
  release: Record<string, unknown>,
  sourceJsonPath: string,
): { label: string; href: string } | null {
  const directHref = getStringCandidate(release, directDownloadKeys);

  if (directHref) {
    return {
      label: deriveArtifactLabel(release, directHref),
      href: normalizeHref(directHref, sourceJsonPath),
    };
  }

  for (const key of artifactCollectionKeys) {
    const collection = release[key];

    if (!Array.isArray(collection)) {
      continue;
    }

    for (const item of collection) {
      if (!isRecord(item)) {
        continue;
      }

      const artifactHref = getStringCandidate(item, directDownloadKeys) ?? getStringCandidate(item, ['path']);

      if (!artifactHref) {
        continue;
      }

      return {
        label: deriveArtifactLabel(item, artifactHref),
        href: normalizeHref(artifactHref, sourceJsonPath),
      };
    }
  }

  return null;
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
  release: unknown,
  originalIndex: number,
  sourceJsonPath: string,
): NormalizedReleaseRecord {
  const releaseRecord = isRecord(release) ? release : {};
  const version = getStringCandidate(releaseRecord, ['version', 'tag', 'name']) ?? `未命名版本 ${originalIndex + 1}`;
  const publishedAt = getStringCandidate(releaseRecord, releaseDateCandidateKeys);
  const downloadAction = deriveDownloadAction(releaseRecord, sourceJsonPath);

  return {
    version,
    publishedAt,
    publishedLabel: formatDateLabel(publishedAt),
    primaryArtifactLabel: downloadAction?.label ?? '无直接下载',
    hasDirectDownload: Boolean(downloadAction),
    actions: [
      ...(downloadAction
        ? [
            {
              kind: 'download' as const,
              label: '下载',
              href: downloadAction.href,
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
    .map((release, index) => normalizeReleaseRecord(release, index, meta.sourceJsonPath))
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
