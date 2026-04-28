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
import rawSteamAchievementSource from '@/data/steam-achievements-source.json';

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

export interface SteamAchievementLocaleText {
  readonly 'zh-CN': string;
  readonly en: string;
}

export interface SteamAchievementCondition {
  readonly source: string;
  readonly schedulePreset: string;
  readonly rewardAmount?: number;
  readonly progressUnitSize?: number;
}

export interface SteamAchievementIconSource {
  readonly concept: string;
  readonly prompt: string;
}

export interface SteamAchievementEntry {
  readonly localId: string;
  readonly steamApiName: string;
  readonly category: string;
  readonly displayName: SteamAchievementLocaleText;
  readonly description: SteamAchievementLocaleText;
  readonly condition: SteamAchievementCondition;
  readonly steamworks: {
    readonly apiName: string;
    readonly displayName: SteamAchievementLocaleText;
    readonly description: SteamAchievementLocaleText;
    readonly hidden: boolean;
    readonly statBased: boolean;
    readonly achievedIconPath: string;
    readonly lockedIconPath: string;
  };
  readonly icons: {
    readonly achieved: ImageDescriptor;
    readonly locked: ImageDescriptor;
  };
  readonly icon: SteamAchievementIconSource;
}

export interface SteamAchievementPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly applicationKey: string;
  readonly applicationSteamAppId: string;
  readonly iconBasePath: string;
  readonly iconSize: {
    readonly width: number;
    readonly height: number;
    readonly format: string;
  };
  readonly steamworksDefaults: {
    readonly hidden: boolean;
    readonly statBased: boolean;
    readonly achievedIconSize: {
      readonly width: number;
      readonly height: number;
    };
    readonly lockedIconSize: {
      readonly width: number;
      readonly height: number;
    };
  };
  readonly rewardDefaults: Readonly<Record<string, unknown>>;
  readonly schedulePresets: Readonly<Record<string, unknown>>;
  readonly achievements: readonly SteamAchievementEntry[];
}

export interface SteamAchievementPageCategory {
  readonly key: string;
  readonly count: number;
}

export interface SteamAchievementPageStats {
  readonly achievementCount: number;
  readonly categoryCount: number;
  readonly rewardBearingCount: number;
  readonly progressTrackedCount: number;
  readonly publicIconCount: number;
}

export interface SteamAchievementPageRow {
  readonly localId: string;
  readonly steamApiName: string;
  readonly category: string;
  readonly displayName: SteamAchievementLocaleText;
  readonly description: SteamAchievementLocaleText;
  readonly steamworksDisplayName: SteamAchievementLocaleText;
  readonly steamworksDescription: SteamAchievementLocaleText;
  readonly steamworksHidden: boolean;
  readonly steamworksStatBased: boolean;
  readonly source: string;
  readonly rewardAmount: number | null;
  readonly rewardLabel: string;
  readonly progressUnitSize: number | null;
  readonly progressLabel: string;
  readonly schedulePreset: string;
  readonly scheduleLabel: string;
  readonly achievedIconPath: string;
  readonly lockedIconPath: string;
  readonly achievedIcon: ImageDescriptor;
  readonly lockedIcon: ImageDescriptor;
  readonly searchText: string;
}

export interface SteamAchievementPageData {
  readonly updatedAt: string;
  readonly applicationSteamAppId: string;
  readonly rawJsonPath: string;
  readonly iconDirectoryPath: string;
  readonly categories: readonly SteamAchievementPageCategory[];
  readonly stats: SteamAchievementPageStats;
  readonly rows: readonly SteamAchievementPageRow[];
}

export interface SteamPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly applications: readonly SteamApplicationEntry[];
  readonly bundles: readonly SteamBundleEntry[];
  readonly achievements: readonly SteamAchievementEntry[];
}

type RawSteamAchievementEntry = Omit<SteamAchievementEntry, 'steamworks' | 'icons'>;
type RawSteamAchievementSource = Omit<SteamAchievementPayload, 'achievements'> & {
  readonly achievements: readonly RawSteamAchievementEntry[];
};

const steamAchievementSource = rawSteamAchievementSource as RawSteamAchievementSource;
const numberFormatter = new Intl.NumberFormat('en-US');

function apiNameToIconBasename(apiName: string): string {
  return apiName.toLowerCase();
}

function createPublicImageDescriptor(
  src: string,
  metadata: {
    readonly alt: string;
    readonly variant: string;
  },
): ImageDescriptor {
  return {
    src,
    width: steamAchievementSource.iconSize.width,
    height: steamAchievementSource.iconSize.height,
    format: steamAchievementSource.iconSize.format,
    alt: metadata.alt,
    variant: metadata.variant,
  };
}

function createSteamAchievementEntry(entry: RawSteamAchievementEntry): SteamAchievementEntry {
  const basename = apiNameToIconBasename(entry.steamApiName);
  const achievedIconPath = `${steamAchievementSource.iconBasePath}/${basename}.png`;
  const lockedIconPath = `${steamAchievementSource.iconBasePath}/${basename}_locked.png`;

  return {
    ...entry,
    steamworks: {
      apiName: entry.steamApiName,
      displayName: entry.displayName,
      description: entry.description,
      hidden: steamAchievementSource.steamworksDefaults.hidden,
      statBased: steamAchievementSource.steamworksDefaults.statBased,
      achievedIconPath,
      lockedIconPath,
    },
    icons: {
      achieved: createPublicImageDescriptor(achievedIconPath, {
        variant: 'achieved',
        alt: `${entry.displayName.en} Steam achievement icon`,
      }),
      locked: createPublicImageDescriptor(lockedIconPath, {
        variant: 'locked',
        alt: `${entry.displayName.en} locked Steam achievement icon`,
      }),
    },
  };
}

function describeSchedulePreset(schedulePreset: string): string {
  const preset = steamAchievementSource.schedulePresets[schedulePreset];

  if (!preset || typeof preset !== 'object') {
    return schedulePreset;
  }

  const record = preset as Record<string, unknown>;
  const presetType = typeof record.type === 'string' ? record.type : 'custom';
  const step = typeof record.step === 'number' ? record.step : null;
  const from = typeof record.from === 'number' ? record.from : null;
  const to = typeof record.to === 'number' ? record.to : null;

  if (presetType === 'explicit-then-range') {
    const range = record.range;

    if (range && typeof range === 'object') {
      const rangeRecord = range as Record<string, unknown>;
      const rangeFrom = typeof rangeRecord.from === 'number' ? rangeRecord.from : null;
      const rangeTo = typeof rangeRecord.to === 'number' ? rangeRecord.to : null;
      const rangeStep = typeof rangeRecord.step === 'number' ? rangeRecord.step : null;

      return `${schedulePreset} · explicit + ${rangeFrom ?? '?'}-${rangeTo ?? '?'} / ${rangeStep ?? '?'}`;
    }
  }

  if (presetType === 'range') {
    return `${schedulePreset} · ${from ?? '?'}-${to ?? '?'} / ${step ?? '?'}`;
  }

  if (presetType === 'explicit') {
    const values = Array.isArray(record.values) ? record.values.length : 0;
    return `${schedulePreset} · ${values} explicit values`;
  }

  return `${schedulePreset} · ${presetType}`;
}

function createSteamAchievementPageRow(entry: SteamAchievementEntry): SteamAchievementPageRow {
  const rewardAmount = entry.condition.rewardAmount ?? null;
  const progressUnitSize = entry.condition.progressUnitSize ?? null;

  return {
    localId: entry.localId,
    steamApiName: entry.steamApiName,
    category: entry.category,
    displayName: entry.displayName,
    description: entry.description,
    steamworksDisplayName: entry.steamworks.displayName,
    steamworksDescription: entry.steamworks.description,
    steamworksHidden: entry.steamworks.hidden,
    steamworksStatBased: entry.steamworks.statBased,
    source: entry.condition.source,
    rewardAmount,
    rewardLabel: rewardAmount === null ? '—' : `${numberFormatter.format(rewardAmount)} points`,
    progressUnitSize,
    progressLabel:
      progressUnitSize === null ? 'No progress unit' : `${numberFormatter.format(progressUnitSize)} per unit`,
    schedulePreset: entry.condition.schedulePreset,
    scheduleLabel: describeSchedulePreset(entry.condition.schedulePreset),
    achievedIconPath: entry.steamworks.achievedIconPath,
    lockedIconPath: entry.steamworks.lockedIconPath,
    achievedIcon: entry.icons.achieved,
    lockedIcon: entry.icons.locked,
    searchText: [
      entry.localId,
      entry.steamApiName,
      entry.displayName['zh-CN'],
      entry.displayName.en,
      entry.steamworks.displayName['zh-CN'],
      entry.steamworks.displayName.en,
    ]
      .join(' ')
      .toLowerCase(),
  };
}

export const steamAchievementPayload: SteamAchievementPayload = {
  ...steamAchievementSource,
  achievements: steamAchievementSource.achievements.map(createSteamAchievementEntry),
};

export const steamPayload: SteamPayload = {
  version: '1.0.0',
  updatedAt: '2026-04-28T00:00:00.000Z',
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
  achievements: steamAchievementPayload.achievements,
};

const steamAchievementPageRows = steamAchievementPayload.achievements.map(createSteamAchievementPageRow);
const steamAchievementCategoryCounts = new Map<string, number>();

for (const row of steamAchievementPageRows) {
  steamAchievementCategoryCounts.set(row.category, (steamAchievementCategoryCounts.get(row.category) ?? 0) + 1);
}

export const steamAchievementPageData: SteamAchievementPageData = {
  updatedAt: steamAchievementPayload.updatedAt,
  applicationSteamAppId: steamAchievementPayload.applicationSteamAppId,
  rawJsonPath: '/steam/achievements.json',
  iconDirectoryPath: steamAchievementPayload.iconBasePath,
  categories: Array.from(steamAchievementCategoryCounts, ([key, count]) => ({
    key,
    count,
  })),
  stats: {
    achievementCount: steamAchievementPageRows.length,
    categoryCount: steamAchievementCategoryCounts.size,
    rewardBearingCount: steamAchievementPageRows.filter((row) => row.rewardAmount !== null).length,
    progressTrackedCount: steamAchievementPageRows.filter((row) => row.progressUnitSize !== null).length,
    publicIconCount: steamAchievementPageRows.length * 2,
  },
  rows: steamAchievementPageRows,
};
