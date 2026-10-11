import type { ImageMetadata } from 'astro';
import hagicodeWindowsStoreArtwork from '@/assets/steam/hagicode/1280x720.png';
import subSiteAwesomeBanner from '@/assets/promote/sub-sites/awesome.png';
import subSiteDesignBanner from '@/assets/promote/sub-sites/design.png';
import subSiteOpenSpecBanner from '@/assets/promote/sub-sites/openspec.png';
import subSiteOmniRouteBanner from '@/assets/promote/sub-sites/omniroute.png';

export interface PromoteContentMetadataEntry {
  readonly id: string;
  readonly link: string;
  readonly targetPlatform: string;
  readonly image: ImageMetadata;
}

export const promoteContentMetadata = [
  {
    id: 'desktop-microsoft-store-2026-06-10',
    link: 'https://apps.microsoft.com/detail/9N3PM0N3SVDW',
    targetPlatform: 'microsoft-store',
    image: hagicodeWindowsStoreArtwork,
  },
  {
    id: 'subsite-awesome',
    link: 'https://awesome.hagicode.com/',
    targetPlatform: 'website',
    image: subSiteAwesomeBanner,
  },
  {
    id: 'subsite-design',
    link: 'https://design.hagicode.com/',
    targetPlatform: 'website',
    image: subSiteDesignBanner,
  },
  {
    id: 'subsite-openspec',
    link: 'https://openspec.hagicode.com/',
    targetPlatform: 'website',
    image: subSiteOpenSpecBanner,
  },
  {
    id: 'subsite-omniroute',
    link: 'https://omniroute.hagicode.com/',
    targetPlatform: 'website',
    image: subSiteOmniRouteBanner,
  },
] as const satisfies readonly PromoteContentMetadataEntry[];
