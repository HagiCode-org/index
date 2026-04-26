import type { ImageMetadata } from 'astro';

export interface ImageDescriptorMetadata {
  readonly alt: string;
  readonly variant?: string;
}

export interface ImageDescriptor extends ImageDescriptorMetadata {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly format: string;
}

function assertNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function assertPositiveInteger(value: unknown, fieldName: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
}

function inferFormat(src: string): string {
  const pathname = src.split('?')[0] ?? src;
  const extension = pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

  assertNonEmptyString(extension, 'image.format');
  return extension;
}

export function createImageDescriptor(
  image: ImageMetadata,
  metadata: ImageDescriptorMetadata,
): ImageDescriptor {
  assertNonEmptyString(image.src, 'image.src');
  assertPositiveInteger(image.width, 'image.width');
  assertPositiveInteger(image.height, 'image.height');
  assertNonEmptyString(metadata.alt, 'image.alt');

  if (metadata.variant !== undefined) {
    assertNonEmptyString(metadata.variant, 'image.variant');
  }

  return {
    src: image.src,
    width: image.width,
    height: image.height,
    format: inferFormat(image.src),
    alt: metadata.alt,
    ...(metadata.variant === undefined ? {} : { variant: metadata.variant }),
  };
}
