import hagicodeCapsule from '@/assets/steam/hagicode/1232x706.png';
import hagicodeEaCapsule from '@/assets/steam/hagicode/920x430.png';
import hagicodePlusCapsule from '@/assets/steam/hagicode-plus/hagicode-plus-1232x706.png';
import turboEngineCapsule from '@/assets/steam/turboEngine/hagicode-turbo-engine-promo-1232x706.png';
import { createImageDescriptor, type ImageDescriptor } from '@/data/image-descriptor';

export interface PromoteContentEntry {
  readonly id: string;
  readonly title: Readonly<Record<'zh' | 'en', string>>;
  readonly description: Readonly<Record<'zh' | 'en', string>>;
  readonly cta: Readonly<Record<'zh' | 'en', string>>;
  readonly link: string;
  readonly targetPlatform: string;
  readonly image: ImageDescriptor;
}

export interface PromoteContentPayload {
  readonly version: string;
  readonly updatedAt: string;
  readonly contents: readonly PromoteContentEntry[];
}

export const promoteContentPayload: PromoteContentPayload = {
  version: '1.0.0',
  updatedAt: '2026-04-23T00:00:00.000Z',
  contents: [
    {
      id: 'main-game-2026-04-29',
      title: {
        zh: '求求加入愿望单',
        en: 'Wishlist It, Pretty Please',
      },
      description: {
        zh: '全球不唯一但是超级好用的 Vibe Coding 软件 Hagicode 将于 4月29日发售，快来 steam 加入愿望单吧，呜呜呜，求求了',
        en: 'Hagicode, the not-globally-unique but super handy Vibe Coding software, launches on April 29. Please add it to your Steam wishlist. Sob. Pretty please.',
      },
      cta: {
        zh: '加入愿望单',
        en: 'Wishlist on Steam',
      },
      link: 'https://store.steampowered.com/app/4625540/Hagicode/',
      targetPlatform: 'steam',
      image: createImageDescriptor(hagicodeCapsule, {
        alt: 'HagiCode Steam store capsule artwork',
      }),
    },
    {
      id: 'main-game-steam-ea-2026-04-29',
      title: {
        zh: '终于上架 EA 啦',
        en: 'Early Access Is Finally Here',
      },
      description: {
        zh: '全球不唯一但是超级好用的 Vibe Coding 软件 Hagicode 已经在 steam 开启 EA 抢先体验啦，快来看看吧，呜呜呜，求求了',
        en: 'Hagicode, the not-globally-unique but super handy Vibe Coding software, is now in Steam Early Access. Please come take a look. Sob. Pretty please.',
      },
      cta: {
        zh: '查看抢先体验',
        en: 'View Early Access',
      },
      link: 'https://store.steampowered.com/app/4625540/Hagicode/',
      targetPlatform: 'steam',
      image: createImageDescriptor(hagicodeEaCapsule, {
        alt: 'HagiCode Early Access Steam artwork',
      }),
    },
    {
      id: 'hagicode-plus-bundle',
      title: {
        zh: 'Hagicode Plus 套装',
        en: 'Hagicode Plus Bundle',
      },
      description: {
        zh: '全球不唯一但是很会打包的 Hagicode Plus 现享 15% off，组合本体与 Turbo Engine DLC，一口气补齐体验，快来 steam 看看吧，呜呜呜，求求了',
        en: 'Hagicode Plus, the not-globally-unique but impressively bundled option, is 15% off with the base game and Turbo Engine DLC. Come check it out on Steam. Sob. Pretty please.',
      },
      cta: {
        zh: '查看套装',
        en: 'View Bundle',
      },
      link: 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/',
      targetPlatform: 'steam',
      image: createImageDescriptor(hagicodePlusCapsule, {
        alt: 'Hagicode Plus Steam bundle artwork',
      }),
    },
    {
      id: 'hagicode-turbo-engine-dlc',
      title: {
        zh: 'Turbo Engine DLC',
        en: 'Turbo Engine DLC',
      },
      description: {
        zh: '全球不唯一但是真的很能跑的 Turbo Engine DLC 可解锁 32 个并发上线和更多自定义选项，让 Hagicode 工作流更顺手，快来 steam 看看吧，呜呜呜，求求了',
        en: 'Turbo Engine DLC is not globally unique, but it really can run: unlock up to 32 concurrent online sessions and more customization options for your Hagicode workflow. Come peek on Steam. Sob. Pretty please.',
      },
      cta: {
        zh: '查看 DLC',
        en: 'View DLC',
      },
      link: 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/',
      targetPlatform: 'steam',
      image: createImageDescriptor(turboEngineCapsule, {
        alt: 'Turbo Engine DLC Steam artwork',
      }),
    },
  ],
};
