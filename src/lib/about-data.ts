import {
  aboutRegionPriorities,
  aboutSource,
  type AboutImageId,
  type AboutRegionPriority,
  type AboutSourceEntry,
} from '@/data/about/about-source';

export interface AboutImageAsset {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export type AboutImageAssets = Record<AboutImageId, AboutImageAsset>;

type AboutBaseEntry = {
  readonly id: string;
  readonly type: AboutSourceEntry['type'];
  readonly label: string;
  readonly regionPriority: AboutRegionPriority;
  readonly description?: string;
};

export type AboutEntry =
  | (AboutBaseEntry & {
      readonly type: 'link';
      readonly url: string;
    })
  | (AboutBaseEntry & {
      readonly type: 'contact';
      readonly value: string;
      readonly url?: string;
    })
  | (AboutBaseEntry & {
      readonly type: 'qr' | 'image';
      readonly imageUrl: string;
      readonly width: number;
      readonly height: number;
      readonly alt: string;
      readonly url?: string;
    });

export interface AboutPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly entries: readonly AboutEntry[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  assert(typeof value === 'string' && value.trim().length > 0, `${fieldName} must be a non-empty string.`);
}

function assertPositiveInteger(value: unknown, fieldName: string): asserts value is number {
  assert(Number.isInteger(value) && Number(value) > 0, `${fieldName} must be a positive integer.`);
}

function assertRegionPriority(value: unknown, fieldName: string): asserts value is AboutRegionPriority {
  assert(
    typeof value === 'string' && aboutRegionPriorities.includes(value as AboutRegionPriority),
    `${fieldName} must be one of ${aboutRegionPriorities.join(', ')}.`,
  );
}

function withOptionalDescription<T extends object>(entry: T, fieldName: string) {
  const description = (entry as { description?: unknown }).description;

  if (description === undefined) {
    return {};
  }

  assertNonEmptyString(description, `${fieldName}.description`);
  return { description };
}

function withOptionalUrl<T extends object>(entry: T, fieldName: string) {
  const url = (entry as { url?: unknown }).url;

  if (url === undefined) {
    return {};
  }

  assertNonEmptyString(url, `${fieldName}.url`);
  return { url };
}

function isImageEntry(entry: AboutSourceEntry): entry is Extract<AboutSourceEntry, { imageId: AboutImageId }> {
  return entry.type === 'qr' || entry.type === 'image';
}

function normalizeImageEntry(
  entry: Extract<AboutSourceEntry, { imageId: AboutImageId }>,
  imageAssets: AboutImageAssets,
): AboutEntry {
  const imageAsset = imageAssets[entry.imageId];

  assert(imageAsset, `Missing image asset binding for ${entry.id}.`);
  assertNonEmptyString(entry.alt, `${entry.id}.alt`);
  assertNonEmptyString(imageAsset.src, `${entry.id}.imageUrl`);
  assertPositiveInteger(imageAsset.width, `${entry.id}.width`);
  assertPositiveInteger(imageAsset.height, `${entry.id}.height`);

  return {
    id: entry.id,
    type: entry.type,
    label: entry.label,
    regionPriority: entry.regionPriority,
    ...withOptionalDescription(entry, entry.id),
    ...withOptionalUrl(entry, entry.id),
    imageUrl: imageAsset.src,
    width: imageAsset.width,
    height: imageAsset.height,
    alt: entry.alt,
  };
}

export function buildAboutPayload(imageAssets: AboutImageAssets): AboutPayload {
  assertNonEmptyString(aboutSource.version, 'about.version');
  assertNonEmptyString(aboutSource.updatedAt, 'about.updatedAt');
  assert(Array.isArray(aboutSource.entries) && aboutSource.entries.length > 0, 'about.entries must not be empty.');

  const seenIds = new Set<string>();
  const entries = aboutSource.entries.map((entry, index): AboutEntry => {
    assertNonEmptyString(entry.id, `about.entries[${index}].id`);
    assertNonEmptyString(entry.label, `about.entries[${index}].label`);
    assertRegionPriority(entry.regionPriority, `${entry.id}.regionPriority`);
    assert(!seenIds.has(entry.id), `Duplicate about entry id detected: ${entry.id}.`);
    seenIds.add(entry.id);

    if (entry.type === 'link') {
      assertNonEmptyString(entry.url, `${entry.id}.url`);
      return {
        id: entry.id,
        type: entry.type,
        label: entry.label,
        regionPriority: entry.regionPriority,
        ...withOptionalDescription(entry, entry.id),
        url: entry.url,
      };
    }

    if (entry.type === 'contact') {
      assertNonEmptyString(entry.value, `${entry.id}.value`);
      return {
        id: entry.id,
        type: entry.type,
        label: entry.label,
        regionPriority: entry.regionPriority,
        ...withOptionalDescription(entry, entry.id),
        ...withOptionalUrl(entry, entry.id),
        value: entry.value,
      };
    }

    if (isImageEntry(entry)) {
      return normalizeImageEntry(entry, imageAssets);
    }

    throw new Error(`Unsupported about entry type: ${String((entry as { type?: unknown }).type)}.`);
  });

  return {
    version: aboutSource.version,
    updatedAt: aboutSource.updatedAt,
    entries,
  };
}
