import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export interface ImageSource {
  readonly format: string;
  readonly type: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const mediaTypes: Readonly<Record<string, string>> = {
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const encodableOriginalFormats = new Set(['png', 'jpeg', 'webp', 'avif']);
const modernTiers = ['avif', 'webp'] as const;

function canonicalFormat(format: string): string {
  return format === 'jpg' ? 'jpeg' : format;
}

export async function createImageSources(
  image: ImageMetadata,
  originalFormat: string,
): Promise<readonly ImageSource[]> {
  if (!encodableOriginalFormats.has(canonicalFormat(originalFormat))) {
    throw new Error(`${image.src} is ${originalFormat}, which cannot be encoded to AVIF or WebP.`);
  }

  const sources: ImageSource[] = [];

  for (const format of modernTiers) {
    if (canonicalFormat(originalFormat) === format) {
      continue;
    }

    const { src, options } = await getImage({ src: image, format });

    if (options.width === undefined || options.height === undefined) {
      throw new Error(`${image.src} ${format} rendition has no width or height.`);
    }

    sources.push({
      format,
      type: mediaTypes[format],
      src,
      width: options.width,
      height: options.height,
    });
  }

  sources.push({
    format: originalFormat,
    type: mediaTypes[originalFormat],
    src: image.src,
    width: image.width,
    height: image.height,
  });

  return sources;
}
