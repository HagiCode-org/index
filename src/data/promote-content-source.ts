import { createImageDescriptor, type ImageDescriptor } from '@/data/image-descriptor';
import { createImageSources, type ImageSource } from '@/data/image-source-chain';
import {
  promoteContentMetadata,
  type PromoteContentMetadataEntry,
} from '@/data/promote-content-metadata';
import {
  createLocalizedPromotionField,
  getDefaultPromotionAlt,
  validatePromotionLocalization,
} from '@/i18n/runtime';
import type { DesktopLanguageCode } from '@/lib/desktop-language-contract';

export type PromoteLocalizedField = Readonly<Record<DesktopLanguageCode, string>>;

export interface PromoteContentEntry {
  readonly id: string;
  readonly title: PromoteLocalizedField;
  readonly description: PromoteLocalizedField;
  readonly cta: PromoteLocalizedField;
  readonly link: string;
  readonly targetPlatform: string;
  readonly image: ImageDescriptor & { readonly sources: readonly ImageSource[] };
}

export interface PromoteContentPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly contents: readonly PromoteContentEntry[];
}

validatePromotionLocalization(promoteContentMetadata.map((entry) => entry.id));

async function createPromoteContentEntry(entry: PromoteContentMetadataEntry): Promise<PromoteContentEntry> {
  const image = createImageDescriptor(entry.image, {
    alt: getDefaultPromotionAlt(entry.id),
  });

  return {
    id: entry.id,
    title: createLocalizedPromotionField(entry.id, 'title'),
    description: createLocalizedPromotionField(entry.id, 'description'),
    cta: createLocalizedPromotionField(entry.id, 'cta'),
    link: entry.link,
    targetPlatform: entry.targetPlatform,
    image: {
      ...image,
      sources: await createImageSources(entry.image, image.format),
    },
  };
}

export const promoteContentPayload: PromoteContentPayload = {
  version: '1.0.0',
  updatedAt: '2026-10-09T00:00:00.000Z',
  contents: await Promise.all(promoteContentMetadata.map(createPromoteContentEntry)),
};
