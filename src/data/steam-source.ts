import hagicodeHero from '@/assets/steam/hagicode/3840x1240.png';
import hagicodeLibraryCapsule from '@/assets/steam/hagicode/600x900.png';
import hagicodeStoreCapsule from '@/assets/steam/hagicode/462x174.png';
import hagicodeWideCapsule from '@/assets/steam/hagicode/1232x706.png';
import hagicodePlusLibraryCapsule from '@/assets/steam/hagicode-plus/hagicode-plus-748x896.png';
import hagicodePlusStoreCapsule from '@/assets/steam/hagicode-plus/hagicode-plus-462x174.png';
import hagicodePlusWideCapsule from '@/assets/steam/hagicode-plus/hagicode-plus-1232x706.png';
import turboEngineLibraryCapsule from '@/assets/steam/turboEngine/hagicode-turbo-engine-promo-748x896.png';
import turboEngineStoreCapsule from '@/assets/steam/turboEngine/hagicode-turbo-engine-promo-462x174.png';
import turboEngineWideCapsule from '@/assets/steam/turboEngine/hagicode-turbo-engine-promo-1232x706.png';
import { createImageDescriptor, type ImageDescriptor } from '@/data/image-descriptor';

export interface SteamApplicationEntry {
  readonly key: string;
  readonly displayName: string;
  readonly kind: 'application' | 'dlc';
  readonly parentKey: string | null;
  readonly promoteId?: string;
  readonly storeAppId: string;
  readonly storeUrl: string;
  readonly platformAppIds: Readonly<Record<'windows' | 'linux' | 'macos', string>>;
  readonly images: readonly ImageDescriptor[];
}

export interface SteamBundleEntry {
  readonly key: string;
  readonly displayName: string;
  readonly storeBundleId: string;
  readonly storeUrl: string;
  readonly includedApplicationKeys: readonly string[];
  readonly images: readonly ImageDescriptor[];
}

export interface SteamPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly applications: readonly SteamApplicationEntry[];
  readonly bundles: readonly SteamBundleEntry[];
}

export const steamPayload: SteamPayload = {
  version: '1.0.0',
  updatedAt: '2026-04-23T00:00:00.000Z',
  applications: [
    {
      key: 'hagicode',
      displayName: 'HagiCode',
      kind: 'application',
      parentKey: null,
      promoteId: 'main-game-2026-04-29',
      storeAppId: '4625540',
      storeUrl: 'https://store.steampowered.com/app/4625540/Hagicode/',
      platformAppIds: {
        windows: '4625541',
        linux: '4625542',
        macos: '4625543',
      },
      images: [
        createImageDescriptor(hagicodeStoreCapsule, {
          variant: 'store-capsule',
          alt: 'HagiCode Steam store capsule',
        }),
        createImageDescriptor(hagicodeWideCapsule, {
          variant: 'wide-capsule',
          alt: 'HagiCode wide promotional capsule',
        }),
        createImageDescriptor(hagicodeLibraryCapsule, {
          variant: 'library-capsule',
          alt: 'HagiCode Steam library capsule',
        }),
        createImageDescriptor(hagicodeHero, {
          variant: 'hero',
          alt: 'HagiCode Steam library hero artwork',
        }),
      ],
    },
    {
      key: 'turbo-engine',
      displayName: 'Turbo Engine',
      kind: 'dlc',
      parentKey: 'hagicode',
      storeAppId: '4635480',
      storeUrl: 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/',
      platformAppIds: {
        windows: '4635480',
        linux: '4635482',
        macos: '4635481',
      },
      images: [
        createImageDescriptor(turboEngineStoreCapsule, {
          variant: 'store-capsule',
          alt: 'Turbo Engine DLC Steam store capsule',
        }),
        createImageDescriptor(turboEngineWideCapsule, {
          variant: 'wide-capsule',
          alt: 'Turbo Engine DLC wide promotional capsule',
        }),
        createImageDescriptor(turboEngineLibraryCapsule, {
          variant: 'library-capsule',
          alt: 'Turbo Engine DLC Steam library capsule',
        }),
      ],
    },
  ],
  bundles: [
    {
      key: 'hagicode-plus',
      displayName: 'Hagicode Plus',
      storeBundleId: '73989',
      storeUrl: 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/',
      includedApplicationKeys: ['hagicode', 'turbo-engine'],
      images: [
        createImageDescriptor(hagicodePlusStoreCapsule, {
          variant: 'store-capsule',
          alt: 'Hagicode Plus Steam bundle store capsule',
        }),
        createImageDescriptor(hagicodePlusWideCapsule, {
          variant: 'wide-capsule',
          alt: 'Hagicode Plus Steam bundle wide promotional capsule',
        }),
        createImageDescriptor(hagicodePlusLibraryCapsule, {
          variant: 'library-capsule',
          alt: 'Hagicode Plus Steam bundle library capsule',
        }),
      ],
    },
  ],
};
