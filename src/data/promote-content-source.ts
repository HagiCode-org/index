import { createImageDescriptor, type ImageDescriptor } from '@/data/image-descriptor';
import { promoteContentMetadata } from '@/data/promote-content-metadata';
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
  readonly image: ImageDescriptor;
}

export interface PromoteContentPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly contents: readonly PromoteContentEntry[];
}

validatePromotionLocalization(promoteContentMetadata.map((entry) => entry.id));

export const promoteContentPayload: PromoteContentPayload = {
  version: '1.0.0',
  updatedAt: '2026-04-23T00:00:00.000Z',
  contents: promoteContentMetadata.map((entry) => ({
    id: entry.id,
    title: createLocalizedPromotionField(entry.id, 'title'),
    description: createLocalizedPromotionField(entry.id, 'description'),
    cta: createLocalizedPromotionField(entry.id, 'cta'),
    link: entry.link,
    targetPlatform: entry.targetPlatform,
    image: createImageDescriptor(entry.image, {
      alt: getDefaultPromotionAlt(entry.id),
    }),
  })),
};
