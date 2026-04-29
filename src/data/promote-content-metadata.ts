import type { ImageMetadata } from 'astro';
import hagicodeCapsule from '@/assets/steam/hagicode/1232x706.png';
import hagicodeEaCapsule from '@/assets/steam/hagicode/920x430.png';
import hagicodePlusCapsule from '@/assets/steam/hagicode-plus/hagicode-plus-1232x706.png';
import turboEngineCapsule from '@/assets/steam/turboEngine/hagicode-turbo-engine-promo-1232x706.png';

export interface PromoteContentMetadataEntry {
  readonly id: string;
  readonly link: string;
  readonly targetPlatform: string;
  readonly image: ImageMetadata;
}

export const promoteContentMetadata = [
  {
    id: 'main-game-2026-04-29',
    link: 'https://store.steampowered.com/app/4625540/Hagicode/',
    targetPlatform: 'steam',
    image: hagicodeCapsule,
  },
  {
    id: 'main-game-steam-ea-2026-04-29',
    link: 'https://store.steampowered.com/app/4625540/Hagicode/',
    targetPlatform: 'steam',
    image: hagicodeEaCapsule,
  },
  {
    id: 'hagicode-plus-bundle',
    link: 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/',
    targetPlatform: 'steam',
    image: hagicodePlusCapsule,
  },
  {
    id: 'hagicode-turbo-engine-dlc',
    link: 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/',
    targetPlatform: 'steam',
    image: turboEngineCapsule,
  },
] as const satisfies readonly PromoteContentMetadataEntry[];
