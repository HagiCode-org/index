import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_DESKTOP_LANGUAGE_CODES } from '../src/lib/desktop-language-contract.ts';
import { buildCharacterTemplateLibrary } from '../scripts/build-agent-preset-library.mjs';
import { validateGeneratedImageDescriptor } from '../scripts/validate-catalog.mjs';

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');
const nodeCommand = process.execPath;
const nodeCommandBaseArgs = ['--experimental-strip-types'];
const steamAchievementSourceFixture = JSON.parse(
  await readFile(path.join(projectRoot, 'src', 'data', 'steam-achievements-source.json'), 'utf8'),
);
const supportedPromotoLocales = [...SUPPORTED_DESKTOP_LANGUAGE_CODES].sort();

function execNodeAsync(args, options) {
  return execFileAsync(nodeCommand, [...nodeCommandBaseArgs, ...args], options);
}

function buildImageDescriptorFixture({ variant } = {}) {
  return {
    src: '/_astro/hagicode.ABC123.png',
    width: 1232,
    height: 706,
    format: 'png',
    alt: 'HagiCode Steam artwork',
    ...(variant === undefined ? {} : { variant }),
  };
}

function buildLocalizedPromoteField(values) {
  return { ...values };
}

function buildLiveBroadcastFixture() {
  return {
    version: '1.0.0',
    updatedAt: '2026-03-31T00:00:00.000Z',
    timezone: {
      iana: 'Asia/Shanghai',
      utcOffsetMinutes: 480,
      label: {
        'zh-CN': '北京时间（UTC+8）',
        en: 'Beijing Time (UTC+8)',
      },
    },
    schedule: {
      activeWeekdays: [0, 1, 2, 3, 5, 6],
      excludedWeekdays: [4],
      previewStartTime: '18:00',
      startTime: '20:00',
      endTime: '21:00',
    },
    qrCode: {
      width: 201,
      height: 213,
      alt: {
        'zh-CN': 'Hagicode 抖音直播二维码',
        en: 'Douyin QR code for the Hagicode live broadcast',
      },
      fallbackLabel: {
        'zh-CN': '二维码暂时不可用',
        en: 'QR image unavailable',
      },
    },
    locales: {
      'zh-CN': {
        eyebrow: '直播预告',
        title: 'Hagicode 每日直播编程间',
        description: '每天 20:00 按北京时间开播，扫码进入抖音直播间。周四固定停播。',
        status: { upcoming: '即将开始', live: '正在直播', offline: '暂未开播' },
        stateCopy: { upcoming: '今晚 20:00 开播，18:00 起会显示直播提醒。', live: '直播已开始，扫码即可进入抖音直播间。', offline: '当前不在直播窗口，页面会自动显示下一场时间。' },
        reminder: { preview: '直播即将开始', live: '正在直播，扫码观看', cta: '打开二维码' },
        time: { beijingLabel: '北京时间', localLabel: '你的本地时间', nextLabel: '下一场', thursdayNote: '周四固定停播' },
      },
      en: {
        eyebrow: 'Live Broadcast',
        title: 'Daily Hagi Live Coding Room',
        description: 'The recurring Hagi coding stream starts at 20:00 Beijing time. Scan the Douyin QR code to join. Thursday stays offline.',
        status: { upcoming: 'Upcoming', live: 'Live now', offline: 'Offline' },
        stateCopy: { upcoming: 'The room starts at 20:00 Beijing time and shows a reminder from 18:00.', live: 'The stream is live right now. Scan the QR code to join the room.', offline: 'The room is outside its active window right now. The next start time stays visible below.' },
        reminder: { preview: 'Live starts soon', live: 'Now live, scan to watch', cta: 'Open QR' },
        time: { beijingLabel: 'Beijing time', localLabel: 'Your local time', nextLabel: 'Next stream', thursdayNote: 'Thursday is the weekly off day' },
      },
    },
  };
}

function buildAboutFixture() {
  return {
    version: '1.0.0',
    updatedAt: '2026-04-20T00:00:00.000Z',
    entries: [
      {
        id: 'youtube',
        type: 'link',
        label: 'YouTube',
        regionPriority: 'international-first',
        url: 'https://www.youtube.com/@hagicode',
      },
      {
        id: 'product-hunt',
        type: 'link',
        label: 'Product Hunt',
        regionPriority: 'international-first',
        url: 'https://www.producthunt.com/products/hagicode',
      },
      {
        id: 'steam',
        type: 'link',
        label: 'Steam',
        regionPriority: 'international-first',
        url: 'https://store.steampowered.com/app/4625540/Hagicode/',
      },
      {
        id: 'bilibili',
        type: 'link',
        label: 'Bilibili',
        regionPriority: 'china-first',
        url: 'https://space.bilibili.com/272265720',
      },
      {
        id: 'xiaohongshu',
        type: 'contact',
        label: '小红书',
        regionPriority: 'china-first',
        value: '11671904293',
        url: 'https://www.xiaohongshu.com/user/profile/665e764800000000030320b6',
      },
      {
        id: 'douyin-account',
        type: 'contact',
        label: '抖音',
        regionPriority: 'china-first',
        value: 'hagicode',
      },
      {
        id: 'douyin-qr',
        type: 'qr',
        label: '抖音二维码',
        regionPriority: 'china-first',
        imageUrl: '/_astro/douyin.ABC123.png',
        width: 1061,
        height: 1059,
        alt: 'HagiCode 抖音二维码',
      },
      {
        id: 'qq-group',
        type: 'contact',
        label: 'QQ群',
        regionPriority: 'china-first',
        value: '610394020',
        url: 'https://qm.qq.com/q/ZWPYvrYRYQ',
      },
      {
        id: 'feishu-group',
        type: 'qr',
        label: '飞书群',
        regionPriority: 'china-first',
        imageUrl: '/_astro/feishu.XYZ789.png',
        width: 778,
        height: 724,
        alt: 'HagiCode 飞书群二维码',
        url: 'https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=238gb3f7-6820-43b8-9f1f-e0f2e704a000',
      },
      {
        id: 'discord',
        type: 'link',
        label: 'Discord',
        regionPriority: 'international-first',
        url: 'https://discord.gg/b5kDHUcUZY',
      },
      {
        id: 'wechat-account',
        type: 'qr',
        label: '微信公众号',
        regionPriority: 'china-first',
        imageUrl: '/_astro/wechat-account.ZZZ999.jpg',
        width: 430,
        height: 430,
        alt: 'HagiCode 微信公众号二维码',
      },
    ],
  };
}

function buildLegalDocumentsFixture() {
  return {
    schemaVersion: '1.0.0',
    publishedAt: '2026-04-15T00:00:00.000Z',
    documents: [
      {
        documentType: 'eula',
        effectiveDate: '2026-04-15',
        revision: '2026-04-15',
        canonicalUrl: 'https://docs.hagicode.com/legal/eula/',
        locales: {
          'zh-CN': {
            title: '终端用户许可协议（EULA）',
            browserOpenUrl: 'https://docs.hagicode.com/legal/eula/',
          },
          'en-US': {
            title: 'End User License Agreement (EULA)',
            browserOpenUrl: 'https://docs.hagicode.com/en/legal/eula/',
          },
        },
      },
      {
        documentType: 'privacy-policy',
        effectiveDate: '2026-04-15',
        revision: '2026-04-15',
        canonicalUrl: 'https://docs.hagicode.com/legal/privacy-policy/',
        locales: {
          'zh-CN': {
            title: '隐私政策',
            browserOpenUrl: 'https://docs.hagicode.com/legal/privacy-policy/',
          },
          'en-US': {
            title: 'Privacy Policy',
            browserOpenUrl: 'https://docs.hagicode.com/en/legal/privacy-policy/',
          },
        },
      },
    ],
  };
}

function buildPromoteFixture() {
  return {
    version: '1.0.0',
    updatedAt: '2026-04-23T00:00:00.000Z',
    promotes: [
      {
        id: 'main-game-2026-04-29',
        on: true,
        endTime: '2026-04-29T00:00:00+08:00',
      },
      {
        id: 'main-game-steam-ea-2026-04-29',
        on: true,
        startTime: '2026-04-29T00:00:00+08:00',
      },
      {
        id: 'hagicode-plus-bundle',
        on: false,
      },
      {
        id: 'hagicode-turbo-engine-dlc',
        on: false,
      },
    ],
  };
}

function buildPromoteContentFixture() {
  return {
    version: '1.0.0',
    updatedAt: '2026-04-23T00:00:00.000Z',
    contents: [
      {
        id: 'main-game-2026-04-29',
        title: buildLocalizedPromoteField({
          'zh-CN': '求求加入愿望单',
          'zh-Hant': '求求加入願望單',
          'en-US': 'Wishlist It, Pretty Please',
          'ja-JP': 'お願いです、ウィッシュリストに追加してください',
          'ko-KR': '제발 위시리스트에 추가해 주세요',
          'de-DE': 'Bitte auf die Wunschliste setzen',
          'fr-FR': 'Ajoutez-le a votre liste de souhaits, s il vous plait',
          'es-ES': 'Anadelo a tu lista de deseados, por favor',
          'pt-BR': 'Coloque na lista de desejos, por favor',
          'ru-RU': 'Пожалуйста, добавьте в список желаемого',
        }),
        description: buildLocalizedPromoteField({
          'zh-CN': '全球不唯一但是超级好用的 Vibe Coding 软件 Hagicode 将于 4月29日发售，快来 steam 加入愿望单吧，呜呜呜，求求了',
          'zh-Hant': '全球不唯一但是超級好用的 Vibe Coding 軟體 Hagicode 將於 4月29日發售，快來 Steam 加入願望單吧，嗚嗚嗚，求求了',
          'en-US': 'Hagicode, the not-globally-unique but super handy Vibe Coding software, launches on April 29. Please add it to your Steam wishlist. Sob. Pretty please.',
          'ja-JP': '世界で唯一ではないけれど、とても使いやすい Vibe Coding ソフト Hagicode が 4月29日に発売されます。Steam のウィッシュリストに追加してください。お願いです。',
          'ko-KR': '전 세계에서 유일하진 않지만 정말 편리한 Vibe Coding 소프트웨어 Hagicode가 4월 29일에 출시됩니다. Steam 위시리스트에 추가해 주세요. 제발요.',
          'de-DE': 'Hagicode, die nicht weltweit einzigartige, aber extrem praktische Vibe-Coding-Software, erscheint am 29. April. Bitte setzt sie auf eure Steam-Wunschliste. Bitte, bitte.',
          'fr-FR': 'Hagicode, le logiciel de Vibe Coding pas unique au monde mais vraiment pratique, sort le 29 avril. Ajoutez-le a votre liste de souhaits Steam. S il vous plait.',
          'es-ES': 'Hagicode, el software de Vibe Coding que no es unico en el mundo pero si muy util, se lanza el 29 de abril. Anadelo a tu lista de deseados de Steam. Por favor.',
          'pt-BR': 'Hagicode, o software de Vibe Coding que nao e unico no mundo, mas e util demais, sera lancado em 29 de abril. Adicione-o a sua lista de desejos da Steam. Por favor.',
          'ru-RU': 'Hagicode, не уникальный во всем мире, но очень удобный Vibe Coding софт, выходит 29 апреля. Пожалуйста, добавьте его в список желаемого Steam. Очень просим.',
        }),
        cta: buildLocalizedPromoteField({
          'zh-CN': '加入愿望单',
          'zh-Hant': '加入願望單',
          'en-US': 'Wishlist on Steam',
          'ja-JP': 'Steam でウィッシュリストに追加',
          'ko-KR': 'Steam 위시리스트에 추가',
          'de-DE': 'Auf Steam vormerken',
          'fr-FR': 'Ajouter sur Steam',
          'es-ES': 'Anadir a Steam',
          'pt-BR': 'Adicionar na Steam',
          'ru-RU': 'Добавить в желаемое Steam',
        }),
        link: 'https://store.steampowered.com/app/4625540/Hagicode/',
        targetPlatform: 'steam',
        image: buildImageDescriptorFixture(),
      },
      {
        id: 'main-game-steam-ea-2026-04-29',
        title: buildLocalizedPromoteField({
          'zh-CN': '终于上架 EA 啦',
          'zh-Hant': '終於上架 EA 啦',
          'en-US': 'Early Access Is Finally Here',
          'ja-JP': 'ついに早期アクセス開始',
          'ko-KR': '드디어 앞서 해보기 시작',
          'de-DE': 'Early Access ist endlich da',
          'fr-FR': 'L acces anticipe est enfin la',
          'es-ES': 'El acceso anticipado por fin llego',
          'pt-BR': 'O acesso antecipado finalmente chegou',
          'ru-RU': 'Ранний доступ наконец открыт',
        }),
        description: buildLocalizedPromoteField({
          'zh-CN': '全球不唯一但是超级好用的 Vibe Coding 软件 Hagicode 已经在 steam 开启 EA 抢先体验啦，快来看看吧，呜呜呜，求求了',
          'zh-Hant': '全球不唯一但是超級好用的 Vibe Coding 軟體 Hagicode 已經在 Steam 開啟 EA 搶先體驗啦，快來看看吧，嗚嗚嗚，求求了',
          'en-US': 'Hagicode, the not-globally-unique but super handy Vibe Coding software, is now in Steam Early Access. Please come take a look. Sob. Pretty please.',
          'ja-JP': '世界で唯一ではないけれど、とても使いやすい Vibe Coding ソフト Hagicode が Steam で早期アクセスを開始しました。ぜひ見に来てください。お願いです。',
          'ko-KR': '전 세계에서 유일하진 않지만 정말 편리한 Vibe Coding 소프트웨어 Hagicode가 이제 Steam 앞서 해보기로 출시되었습니다. 한번 보러 와 주세요. 제발요.',
          'de-DE': 'Hagicode, die nicht weltweit einzigartige, aber extrem praktische Vibe-Coding-Software, ist jetzt im Steam-Early-Access. Schaut bitte vorbei. Bitte, bitte.',
          'fr-FR': 'Hagicode, le logiciel de Vibe Coding pas unique au monde mais vraiment pratique, est maintenant disponible en acces anticipe sur Steam. Venez y jeter un oeil. S il vous plait.',
          'es-ES': 'Hagicode, el software de Vibe Coding que no es unico en el mundo pero si muy util, ya esta en acceso anticipado en Steam. Ven a echarle un vistazo. Por favor.',
          'pt-BR': 'Hagicode, o software de Vibe Coding que nao e unico no mundo, mas e util demais, ja esta em acesso antecipado na Steam. Venha dar uma olhada. Por favor.',
          'ru-RU': 'Hagicode, не уникальный во всем мире, но очень удобный Vibe Coding софт, уже вышел в раннем доступе Steam. Загляните посмотреть. Очень просим.',
        }),
        cta: buildLocalizedPromoteField({
          'zh-CN': '查看抢先体验',
          'zh-Hant': '查看搶先體驗',
          'en-US': 'View Early Access',
          'ja-JP': '早期アクセスを見る',
          'ko-KR': '앞서 해보기 보기',
          'de-DE': 'Early Access ansehen',
          'fr-FR': 'Voir l acces anticipe',
          'es-ES': 'Ver acceso anticipado',
          'pt-BR': 'Ver acesso antecipado',
          'ru-RU': 'Открыть ранний доступ',
        }),
        link: 'https://store.steampowered.com/app/4625540/Hagicode/',
        targetPlatform: 'steam',
        image: buildImageDescriptorFixture(),
      },
      {
        id: 'hagicode-plus-bundle',
        title: buildLocalizedPromoteField({
          'zh-CN': 'Hagicode Plus 套装',
          'zh-Hant': 'Hagicode Plus 套裝',
          'en-US': 'Hagicode Plus Bundle',
          'ja-JP': 'Hagicode Plus バンドル',
          'ko-KR': 'Hagicode Plus 번들',
          'de-DE': 'Hagicode Plus Bundle',
          'fr-FR': 'Pack Hagicode Plus',
          'es-ES': 'Pack Hagicode Plus',
          'pt-BR': 'Pacote Hagicode Plus',
          'ru-RU': 'Набор Hagicode Plus',
        }),
        description: buildLocalizedPromoteField({
          'zh-CN': '全球不唯一但是很会打包的 Hagicode Plus 现享 15% off，组合本体与 Turbo Engine DLC，一口气补齐体验，快来 steam 看看吧，呜呜呜，求求了',
          'zh-Hant': '全球不唯一但是很會打包的 Hagicode Plus 現享 15% off，組合本體與 Turbo Engine DLC，一口氣補齊體驗，快來 Steam 看看吧，嗚嗚嗚，求求了',
          'en-US': 'Hagicode Plus, the not-globally-unique but impressively bundled option, is 15% off with the base game and Turbo Engine DLC. Come check it out on Steam. Sob. Pretty please.',
          'ja-JP': '世界で唯一ではないけれど、まとめ方がうまい Hagicode Plus が 15% off です。本編と Turbo Engine DLC をまとめてそろえられます。Steam でぜひ見てください。お願いです。',
          'ko-KR': '전 세계에서 유일하진 않지만 묶음 구성이 아주 좋은 Hagicode Plus를 지금 15% off로 만날 수 있습니다. 본편과 Turbo Engine DLC를 한 번에 챙겨 보세요. Steam에서 확인해 주세요. 제발요.',
          'de-DE': 'Hagicode Plus, das nicht weltweit einzigartige, aber stark gebuendelte Paket, ist jetzt 15% off. Basis-Spiel und Turbo Engine DLC gibt es zusammen fuer das volle Erlebnis. Schaut auf Steam vorbei. Bitte, bitte.',
          'fr-FR': 'Hagicode Plus, l offre pas unique au monde mais tres bien regroupee, est maintenant a 15% off. Le jeu de base et le DLC Turbo Engine arrivent ensemble pour une experience complete. Venez voir sur Steam. S il vous plait.',
          'es-ES': 'Hagicode Plus, la opcion que no es unica en el mundo pero si sabe empaquetarse, ahora tiene 15% off. Reune el juego base y el DLC Turbo Engine para completar la experiencia. Ven a verlo en Steam. Por favor.',
          'pt-BR': 'Hagicode Plus, a opcao que nao e unica no mundo mas sabe montar um pacote como ninguem, esta com 15% off. Junte o jogo base com o DLC Turbo Engine e complete a experiencia. Veja na Steam. Por favor.',
          'ru-RU': 'Hagicode Plus, вариант не уникальный во всем мире, но отлично собранный в набор, сейчас доступен со скидкой 15% off. Базовая игра и DLC Turbo Engine вместе закрывают весь опыт. Загляните в Steam. Очень просим.',
        }),
        cta: buildLocalizedPromoteField({
          'zh-CN': '查看套装',
          'zh-Hant': '查看套裝',
          'en-US': 'View Bundle',
          'ja-JP': 'バンドルを見る',
          'ko-KR': '번들 보기',
          'de-DE': 'Bundle ansehen',
          'fr-FR': 'Voir le pack',
          'es-ES': 'Ver pack',
          'pt-BR': 'Ver pacote',
          'ru-RU': 'Открыть набор',
        }),
        link: 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/',
        targetPlatform: 'steam',
        image: buildImageDescriptorFixture(),
      },
      {
        id: 'hagicode-turbo-engine-dlc',
        title: buildLocalizedPromoteField({
          'zh-CN': 'Turbo Engine DLC',
          'zh-Hant': 'Turbo Engine DLC',
          'en-US': 'Turbo Engine DLC',
          'ja-JP': 'Turbo Engine DLC',
          'ko-KR': 'Turbo Engine DLC',
          'de-DE': 'Turbo Engine DLC',
          'fr-FR': 'DLC Turbo Engine',
          'es-ES': 'DLC Turbo Engine',
          'pt-BR': 'DLC Turbo Engine',
          'ru-RU': 'DLC Turbo Engine',
        }),
        description: buildLocalizedPromoteField({
          'zh-CN': '全球不唯一但是真的很能跑的 Turbo Engine DLC 可解锁 32 个并发上线和更多自定义选项，让 Hagicode 工作流更顺手，快来 steam 看看吧，呜呜呜，求求了',
          'zh-Hant': '全球不唯一但是真的很能跑的 Turbo Engine DLC 可解鎖 32 個並發上線和更多自訂選項，讓 Hagicode 工作流更順手，快來 Steam 看看吧，嗚嗚嗚，求求了',
          'en-US': 'Turbo Engine DLC is not globally unique, but it really can run: unlock up to 32 concurrent online sessions and more customization options for your Hagicode workflow. Come peek on Steam. Sob. Pretty please.',
          'ja-JP': '世界で唯一ではないけれど、本当にパワフルな Turbo Engine DLC では最大 32 本の同時オンラインセッションと、さらに多くのカスタマイズ項目を解放できます。Hagicode の作業がもっとスムーズになります。Steam で見てください。お願いです。',
          'ko-KR': '전 세계에서 유일하진 않지만 정말 잘 달리는 Turbo Engine DLC는 최대 32개의 동시 온라인 세션과 더 많은 사용자 지정 옵션을 열어 줍니다. Hagicode 워크플로를 더 매끄럽게 만들어 줍니다. Steam에서 확인해 주세요. 제발요.',
          'de-DE': 'Das Turbo Engine DLC ist nicht weltweit einzigartig, aber wirklich schnell: Es schaltet bis zu 32 gleichzeitige Online-Sitzungen und mehr Anpassungsoptionen fuer euren Hagicode-Workflow frei. Schaut auf Steam vorbei. Bitte, bitte.',
          'fr-FR': 'Le DLC Turbo Engine n est pas unique au monde, mais il envoie vraiment: il debloque jusqu a 32 sessions en ligne simultanees et davantage d options de personnalisation pour votre workflow Hagicode. Venez voir sur Steam. S il vous plait.',
          'es-ES': 'El DLC Turbo Engine no es unico en el mundo, pero si corre de verdad: desbloquea hasta 32 sesiones online simultaneas y mas opciones de personalizacion para tu flujo de trabajo con Hagicode. Ven a verlo en Steam. Por favor.',
          'pt-BR': 'O DLC Turbo Engine nao e unico no mundo, mas realmente entrega desempenho: desbloqueia ate 32 sessoes online simultaneas e mais opcoes de personalizacao para o seu fluxo de trabalho com Hagicode. Veja na Steam. Por favor.',
          'ru-RU': 'DLC Turbo Engine не уникален во всем мире, но действительно ускоряет работу: он открывает до 32 одновременных онлайн-сессий и больше настроек для вашего процесса в Hagicode. Загляните в Steam. Очень просим.',
        }),
        cta: buildLocalizedPromoteField({
          'zh-CN': '查看 DLC',
          'zh-Hant': '查看 DLC',
          'en-US': 'View DLC',
          'ja-JP': 'DLC を見る',
          'ko-KR': 'DLC 보기',
          'de-DE': 'DLC ansehen',
          'fr-FR': 'Voir le DLC',
          'es-ES': 'Ver DLC',
          'pt-BR': 'Ver DLC',
          'ru-RU': 'Открыть DLC',
        }),
        link: 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/',
        targetPlatform: 'steam',
        image: buildImageDescriptorFixture(),
      },
    ],
  };
}

function buildSteamFixture() {
  const achievements = buildSteamAchievementsFixture().achievements;

  return {
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
        images: [buildImageDescriptorFixture({ variant: 'store-capsule' })],
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
        images: [buildImageDescriptorFixture({ variant: 'store-capsule' })],
      },
    ],
    bundles: [
      {
        key: 'hagicode-plus',
        displayName: 'Hagicode Plus',
        storeBundleId: '73989',
        storeUrl: 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/',
        includedApplicationKeys: ['hagicode', 'turbo-engine'],
        images: [buildImageDescriptorFixture({ variant: 'store-capsule' })],
      },
    ],
    achievements,
  };
}

function buildSteamAchievementsFixture() {
  const iconBasePath = steamAchievementSourceFixture.iconBasePath;
  const iconSize = steamAchievementSourceFixture.iconSize;
  const achievements = steamAchievementSourceFixture.achievements.map((entry) => {
    const basename = entry.steamApiName.toLowerCase();
    const achievedIconPath = `${iconBasePath}/${basename}.png`;
    const lockedIconPath = `${iconBasePath}/${basename}_locked.png`;

    return {
      ...entry,
      steamworks: {
        apiName: entry.steamApiName,
        displayName: entry.displayName,
        description: entry.description,
        hidden: false,
        statBased: false,
        achievedIconPath,
        lockedIconPath,
      },
      icons: {
        achieved: {
          src: achievedIconPath,
          width: iconSize.width,
          height: iconSize.height,
          format: iconSize.format,
          alt: `${entry.displayName.en} Steam achievement icon`,
          variant: 'achieved',
        },
        locked: {
          src: lockedIconPath,
          width: iconSize.width,
          height: iconSize.height,
          format: iconSize.format,
          alt: `${entry.displayName.en} locked Steam achievement icon`,
          variant: 'locked',
        },
      },
    };
  });

  return {
    ...steamAchievementSourceFixture,
    achievements,
  };
}

function buildDesignFixture({
  updatedAt = '2026-04-08T00:00:00.000Z',
  sourceRepository = 'https://github.com/VoltAgent/awesome-design-md',
  detailBaseUrl = 'https://design.hagicode.com/designs/',
  vendorPath = 'vendor/awesome-design-md',
  themes = [
    {
      slug: 'linear.app',
      title: 'Linear Inspired Design System',
      sourceDirectoryUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app',
      readmeUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/README.md',
      designUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md',
      designDownloadUrl: 'https://design.hagicode.com/designs/linear.app/DESIGN.md',
      previewLightImageUrl: 'https://cdn.example.com/designs/linear.app/preview-screenshot.png',
      previewLightAlt: 'Linear Design System — Light Mode',
      previewDarkImageUrl: 'https://cdn.example.com/designs/linear.app/preview-dark-screenshot.png',
      previewDarkAlt: 'Linear Design System — Dark Mode',
      detailUrl: 'https://design.hagicode.com/designs/linear.app/',
    },
    {
      slug: 'x.ai',
      title: 'xAI Inspired Design System',
      sourceDirectoryUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/x.ai',
      readmeUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/README.md',
      designUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md',
      designDownloadUrl: 'https://design.hagicode.com/designs/x.ai/DESIGN.md',
      previewLightImageUrl: 'https://cdn.example.com/designs/x.ai/preview-screenshot.png',
      previewLightAlt: 'xAI Design System — Light Mode',
      previewDarkImageUrl: 'https://cdn.example.com/designs/x.ai/preview-dark-screenshot.png',
      previewDarkAlt: 'xAI Design System — Dark Mode',
      detailUrl: 'https://design.hagicode.com/designs/x.ai/',
    },
  ],
} = {}) {
  return {
    version: '1.0.0',
    updatedAt,
    vendorPath,
    sourceRepository,
    detailBaseUrl,
    themeCount: themes.length,
    themes,
  };
}

function buildDesignReadmeFixture(theme) {
  return `# ${theme.title}

## Preview

### Dark Mode
![${theme.previewDarkAlt}](${theme.previewDarkImageUrl})

### Light Mode
![${theme.previewLightAlt}](${theme.previewLightImageUrl})
`;
}

function buildCatalogFixture({
  lastUpdated = '2026-03-24T10:00:00.000Z',
  designUpdatedAt = '2026-04-08T00:00:00.000Z',
} = {}) {
  return {
    version: '1.0.0',
    generatedAt: lastUpdated,
    entries: [
      {
        id: 'agent-templates',
        title: 'Agent Templates',
        description: '镜像发布 SOUL 与 Trait 模板目录。',
        path: '/agent-templates/index.json',
        category: 'templates',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
      },
      {
        id: 'about',
        title: 'About',
        description: '发布 HagiCode 对外联系渠道、社区入口与二维码资源的 canonical JSON 入口。',
        path: '/about.json',
        category: 'contacts',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
        sourceUrl: 'https://github.com/HagiCode-org/site/tree/main/repos/index/src/data/about',
      },
      {
        id: 'design-theme-catalog',
        title: 'Design Theme Catalog',
        description: '镜像发布 awesome-design-md 的主题目录、README 截图预览与上游文档链接。',
        path: '/design.json',
        category: 'catalogs',
        sourceRepo: 'VoltAgent/awesome-design-md',
        lastUpdated: designUpdatedAt,
        status: 'published',
        sourceUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md',
      },
      {
        id: 'character-templates',
        title: 'Character Templates',
        description: '镜像发布角色模板目录。',
        path: '/character-templates/index.json',
        category: 'templates',
        sourceRepo: 'repos/index',
        lastUpdated,
        status: 'published',
        readmePath: '/character-templates/README.md',
      },
      {
        id: 'promotion-flags',
        title: 'Promotion Flags',
        description: '公开跨站点复用的促销启停数据入口，用于切换当前有效的推广卡片。',
        path: '/promote.json',
        category: 'catalogs',
        sourceRepo: 'repos/index',
        lastUpdated: '2026-04-23T00:00:00.000Z',
        status: 'published',
      },
      {
        id: 'promotion-content',
        title: 'Promotion Content',
        description: '公开中英文促销标题、描述与跳转链接，供各站点按 promoteId 渲染推广卡片。',
        path: '/promote_content.json',
        category: 'catalogs',
        sourceRepo: 'repos/index',
        lastUpdated: '2026-04-23T00:00:00.000Z',
        status: 'published',
      },
      {
        id: 'steam-achievements',
        title: 'Steam Achievements',
        description: '公开 Steamworks 后台配置用的成就 API 名、双语文案、里程碑参数与 256x256 图标路径。',
        path: '/steam/achievements.json',
        category: 'catalogs',
        sourceRepo: 'repos/index',
        lastUpdated: '2026-04-28T00:00:00.000Z',
        status: 'published',
      },
    ],
  };
}

function loc(value) {
  const entry = {};
  for (const code of SUPPORTED_DESKTOP_LANGUAGE_CODES) {
    entry[code] = value;
  }
  return entry;
}

function buildSitesCatalogFixture() {
  return {
    version: '1.0.0',
    generatedAt: '2026-04-07T00:00:00.000Z',
    groups: [
      {
        id: 'core-sites',
        label: loc('核心站点'),
        description: loc('项目官网、正式文档与长期内容站点'),
      },
      {
        id: 'data-and-tools',
        label: loc('数据与工具'),
        description: loc('保留公开数据镜像与部署工具'),
      },
      {
        id: 'creator-studios',
        label: loc('创作实验'),
        description: loc('围绕人格与特质构建的独立体验站点'),
      },
    ],
    entries: [
      {
        id: 'hagicode-main',
        title: loc('HagiCode 主站'),
        label: loc('官网'),
        description: loc('项目官网、产品介绍与统一入口'),
        groupId: 'core-sites',
        url: 'https://hagicode.com/',
        actionLabel: loc('进入主站'),
      },
      {
        id: 'hagicode-docs',
        title: loc('HagiCode Docs'),
        label: loc('文档'),
        description: loc('安装指南、产品文档与博客内容的正式发布站点'),
        groupId: 'core-sites',
        url: 'https://docs.hagicode.com/',
        actionLabel: loc('查看文档'),
      },
      {
        id: 'newbe-blog',
        title: loc('newbe'),
        label: loc('newbe'),
        description: loc('长期文章与技术沉淀站点'),
        groupId: 'core-sites',
        url: 'https://newbe.hagicode.com/',
        actionLabel: loc('打开 newbe'),
      },
      {
        id: 'index-data',
        title: loc('Index Data Mirror'),
        label: loc('数据镜像'),
        description: loc('保留旧首页的人类可读数据页'),
        groupId: 'data-and-tools',
        url: 'https://index.hagicode.com/data/',
        actionLabel: loc('打开数据页'),
      },
      {
        id: 'compose-builder',
        title: loc('Docker Compose Builder'),
        label: loc('Builder'),
        description: loc('图形化生成 Docker Compose 配置'),
        groupId: 'data-and-tools',
        url: 'https://builder.hagicode.com/',
        actionLabel: loc('打开 Builder'),
      },
      {
        id: 'cost-calculator',
        title: loc('AI Replacement Calculator'),
        label: loc('Cost'),
        description: loc('交互式成本测算工具'),
        groupId: 'data-and-tools',
        url: 'https://cost.hagicode.com/',
        actionLabel: loc('打开 Cost'),
      },
      {
        id: 'status-page',
        title: loc('HagiCode Status'),
        label: loc('Status'),
        description: loc('公开状态页'),
        groupId: 'data-and-tools',
        url: 'https://status.hagicode.com/',
        actionLabel: loc('查看状态'),
      },
      {
        id: 'awesome-design-gallery',
        title: loc('Awesome Design MD'),
        label: loc('Design'),
        description: loc('设计语言画廊站点'),
        groupId: 'data-and-tools',
        url: 'https://design.hagicode.com/',
        actionLabel: loc('打开 Design'),
      },
      {
        id: 'soul-builder',
        title: loc('Soul Builder'),
        label: loc('Soul'),
        description: loc('面向角色灵魂设定的独立站点'),
        groupId: 'creator-studios',
        url: 'https://soul.hagicode.com/',
        actionLabel: loc('打开 Soul'),
      },
      {
        id: 'trait-builder',
        title: loc('Trait Builder'),
        label: loc('Trait'),
        description: loc('面向特质搜索与组合的独立站点'),
        groupId: 'creator-studios',
        url: 'https://trait.hagicode.com/',
        actionLabel: loc('打开 Trait'),
      },
    ],
  };
}

function buildCharacterTemplateManifestFixture() {
  const { manifest } = buildCharacterTemplateLibrary({
    libraryData: buildCharacterTemplateLibraryFixtureData(),
    soulIndex: buildSoulIndexFixture(),
    traitIndex: buildTraitIndexFixture(),
  });

  return manifest;
}

function buildCharacterTemplateDetailFixture({
  templateMode = 'curated',
  soulTemplateIds = ['soul-one', 'soul-two'],
  traitTemplateIds = templateMode === 'curated' ? ['trait-one'] : [],
} = {}) {
  const { details } = buildCharacterTemplateLibrary({
    libraryData: buildCharacterTemplateLibraryFixtureData({
      templateMode,
      traitTemplateIds,
      languageStyleId: soulTemplateIds[1] ?? 'soul-two',
    }),
    soulIndex: buildSoulIndexFixture({ includeExtraSoul: soulTemplateIds[1] && soulTemplateIds[1] !== 'soul-two' }),
    traitIndex: buildTraitIndexFixture(),
  });

  return {
    ...details[0],
    templateMode,
    applyScope: templateMode === 'curated' ? ['soul', 'trait'] : ['soul'],
    soulTemplateIds,
    traitTemplateIds,
    soulSelection: {
      personalityId: soulTemplateIds[0] ?? 'soul-one',
      languageStyleId: soulTemplateIds[1] ?? 'soul-two',
    },
  };
}

function buildCharacterTemplateLibraryFixtureData({
  templateMode = 'curated',
  traitTemplateIds = templateMode === 'curated' ? ['trait-one'] : [],
  languageStyleId = 'soul-two',
} = {}) {
  return {
    version: '1.0.0',
    templateVersion: '1.0.0',
    generatedAt: '2026-03-24T10:00:00.000Z',
    baseline: {
      publishedCounts: {
        soulTemplates: 2,
        traitTemplates: 1,
        characterTemplatesBeforeExpansion: 0,
      },
      characterCoverageBeforeExpansion: {
        domains: { frontend: 0 },
        languages: { react: 0 },
        roles: { engineer: 0 },
      },
    },
    gapPriorities: {
      domains: [{ tag: 'frontend', reason: 'frontend gap' }],
      languages: [{ tag: 'react', reason: 'react gap' }],
      roles: [{ tag: 'engineer', reason: 'engineer gap' }],
    },
    dungeonBindingPresetSources: [
      {
        scriptKey: 'proposal.archive',
        tagGroups: {
          languages: ['react'],
          domains: ['frontend'],
          roles: ['engineer'],
        },
      },
      {
        scriptKey: 'proposal.generate',
        tagGroups: {
          languages: ['react'],
          domains: ['frontend'],
          roles: [],
        },
      },
      {
        scriptKey: 'proposal.execute',
        tagGroups: {
          languages: [],
          domains: [],
          roles: ['engineer'],
        },
      },
    ],
    soulFilters: {
      personality: {
        preferredIds: ['soul-one'],
        allowedStyleTypes: ['persona-archetype'],
        allowedRoles: ['scholar'],
        blockedRoles: ['romantic'],
        blockedDomains: ['gaming'],
        blockedLanguages: ['anime-slang'],
      },
      languageStyle: {
        preferredIds: [languageStyleId],
        allowedStyleTypes: ['orthogonal-dimension'],
        allowedLanguages: ['mandarin'],
        blockedRoles: [],
        blockedDomains: ['gaming'],
        blockedLanguages: ['anime-slang'],
      },
    },
    expansionTargets: {
      minimumCharacterTemplates: 1,
      priorityDomains: ['frontend'],
      priorityLanguages: ['react'],
      priorityRoles: ['engineer'],
    },
    templateMatrix: [
      {
        id: 'character-one',
        name: 'Character One',
        summary: 'Summary',
        templateMode,
        styleTags: ['mandarin', 'scholar'],
        tagGroups: {
          languages: ['react'],
          domains: ['frontend'],
          roles: ['engineer'],
        },
        scenes: ['ui'],
        soulSelection: {
          personalityId: 'soul-one',
          languageStyleId,
        },
        traitTemplateIds,
      },
    ],
  };
}

function buildSoulIndexFixture({ includeExtraSoul = false } = {}) {
  const templates = [
    {
      id: 'soul-one',
      templateType: 'soul',
      name: 'Soul One',
      summary: 'Soul summary',
      styleType: 'persona-archetype',
      path: '/agent-templates/soul/templates/soul-one.json',
      tags: ['mandarin', 'scholar', 'soul'],
      tagGroups: {
        languages: ['mandarin'],
        domains: ['persona-archetype'],
        roles: ['scholar'],
      },
      previewText: 'Soul preview',
    },
    {
      id: 'soul-two',
      templateType: 'soul',
      name: 'Soul Two',
      summary: 'Soul summary two',
      styleType: 'orthogonal-dimension',
      path: '/agent-templates/soul/templates/soul-two.json',
      tags: ['mandarin', 'soul'],
      tagGroups: {
        languages: ['mandarin'],
        domains: ['orthogonal-dimension'],
        roles: [],
      },
      previewText: 'Soul preview two',
    },
  ];

  if (includeExtraSoul) {
    templates.push({
      id: 'missing-soul',
      templateType: 'soul',
      name: 'Missing Soul',
      summary: 'Missing soul summary',
      styleType: 'orthogonal-dimension',
      path: '/agent-templates/soul/templates/missing-soul.json',
      tags: ['mandarin', 'soul'],
      tagGroups: {
        languages: ['mandarin'],
        domains: ['orthogonal-dimension'],
        roles: [],
      },
      previewText: 'Missing soul preview',
    });
  }

  return {
    version: '1.0.0',
    generatedAt: '2026-03-24T10:00:00.000Z',
    templateType: 'soul',
    title: 'SOUL Templates',
    description: 'soul description',
    availableTagGroups: { languages: ['mandarin'], domains: ['orthogonal-dimension', 'persona-archetype'], roles: ['scholar'] },
    templates,
  };
}

function buildTraitIndexFixture() {
  return {
    version: '1.0.0',
    generatedAt: '2026-03-24T10:00:00.000Z',
    templateType: 'trait',
    title: 'Trait Templates',
    description: 'trait description',
    availableTagGroups: { languages: ['react'], domains: ['frontend'], roles: ['engineer'] },
    templates: [
      {
        id: 'trait-one',
        templateType: 'trait',
        name: 'Trait One',
        summary: 'Trait summary',
        path: '/agent-templates/trait/templates/trait-one.json',
        tags: ['engineer', 'frontend', 'react', 'trait'],
        tagGroups: { languages: ['react'], domains: ['frontend'], roles: ['engineer'] },
        previewText: 'Trait preview',
      },
    ],
  };
}

async function createValidationFixture({
  catalog,
  sitesCatalog = buildSitesCatalogFixture(),
  liveBroadcast = buildLiveBroadcastFixture(),
  about = buildAboutFixture(),
  legalDocuments = buildLegalDocumentsFixture(),
  promote = buildPromoteFixture(),
  promoteContent = buildPromoteContentFixture(),
  steam = buildSteamFixture(),
  steamAchievements = buildSteamAchievementsFixture(),
  design = buildDesignFixture(),
  libraryData = buildCharacterTemplateLibraryFixtureData(),
} = {}) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'index-validate-catalog-'));
  const scriptsDir = path.join(tempDir, 'scripts');
  const publicDir = path.join(tempDir, 'public');
  const distDir = path.join(tempDir, 'dist');
  const routeSourceDir = path.join(tempDir, 'src', 'data', 'public');
  const srcDataDir = path.join(tempDir, 'src', 'data');
  const srcLibDir = path.join(tempDir, 'src', 'lib');
  const designVendorDir = path.join(tempDir, 'vendor', 'awesome-design-md', 'design-md');
  const validateScriptPath = path.join(projectRoot, 'scripts', 'validate-catalog.mjs');
  const minifyScriptPath = path.join(projectRoot, 'scripts', 'minify-published-json.mjs');
  const buildScriptPath = path.join(projectRoot, 'scripts', 'build-agent-preset-library.mjs');
  const desktopLanguageContractPath = path.join(projectRoot, 'src', 'lib', 'desktop-language-contract.ts');
  const soulIndexFixture = buildSoulIndexFixture();
  const traitIndexFixture = buildTraitIndexFixture();
  const characterLibraryFixture = buildCharacterTemplateLibrary({
    libraryData,
    soulIndex: soulIndexFixture,
    traitIndex: traitIndexFixture,
  });

  await mkdir(scriptsDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await mkdir(distDir, { recursive: true });
  await mkdir(routeSourceDir, { recursive: true });
  await mkdir(srcDataDir, { recursive: true });
  await mkdir(srcLibDir, { recursive: true });
  await mkdir(designVendorDir, { recursive: true });
  await mkdir(path.join(distDir, 'agent-templates', 'trait', 'templates'), { recursive: true });
  await mkdir(path.join(distDir, 'agent-templates', 'soul', 'templates'), { recursive: true });
  await mkdir(path.join(distDir, 'character-templates', 'templates'), { recursive: true });
  await mkdir(path.join(distDir, 'secondary-professions'), { recursive: true });
  await mkdir(path.join(routeSourceDir, 'server'), { recursive: true });
  await mkdir(path.join(routeSourceDir, 'desktop'), { recursive: true });
  await mkdir(path.join(routeSourceDir, 'steam'), { recursive: true });
  await mkdir(path.join(distDir, 'server'), { recursive: true });
  await mkdir(path.join(distDir, 'desktop'), { recursive: true });
  await mkdir(path.join(distDir, 'steam'), { recursive: true });
  await writeFile(
    path.join(scriptsDir, 'validate-catalog.mjs'),
    await readFile(validateScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(
    path.join(scriptsDir, 'minify-published-json.mjs'),
    await readFile(minifyScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(
    path.join(scriptsDir, 'build-agent-preset-library.mjs'),
    await readFile(buildScriptPath, 'utf8'),
    'utf8',
  );
  await writeFile(
    path.join(srcLibDir, 'desktop-language-contract.ts'),
    await readFile(desktopLanguageContractPath, 'utf8'),
    'utf8',
  );
  const managedIndexFixture = JSON.stringify({
    generatedAt: catalog.generatedAt,
    packages: [{ version: '1.0.0' }],
  });

  await writeFile(
    path.join(srcDataDir, 'agent-preset-library.json'),
    JSON.stringify(libraryData),
    'utf8',
  );
  await writeFile(path.join(routeSourceDir, 'index-catalog.json'), JSON.stringify(catalog), 'utf8');
  await writeFile(path.join(routeSourceDir, 'sites.json'), JSON.stringify(sitesCatalog), 'utf8');
  await writeFile(path.join(routeSourceDir, 'design.json'), JSON.stringify(design), 'utf8');
  await writeFile(path.join(routeSourceDir, 'live-broadcast.json'), JSON.stringify(liveBroadcast), 'utf8');
  await writeFile(path.join(routeSourceDir, 'legal-documents.json'), JSON.stringify(legalDocuments), 'utf8');
  await writeFile(path.join(routeSourceDir, 'promote.json'), JSON.stringify(promote), 'utf8');
  await writeFile(path.join(routeSourceDir, 'promote_content.json'), JSON.stringify(promoteContent), 'utf8');
  await writeFile(path.join(routeSourceDir, 'server', 'index.json'), managedIndexFixture, 'utf8');
  await writeFile(path.join(routeSourceDir, 'desktop', 'index.json'), managedIndexFixture, 'utf8');
  await writeFile(path.join(routeSourceDir, 'steam', 'index.json'), JSON.stringify(steam), 'utf8');
  await writeFile(path.join(distDir, 'index-catalog.json'), JSON.stringify(catalog), 'utf8');
  await writeFile(path.join(distDir, 'sites.json'), JSON.stringify(sitesCatalog), 'utf8');
  await writeFile(path.join(distDir, 'design.json'), JSON.stringify(design), 'utf8');
  await writeFile(path.join(distDir, 'live-broadcast.json'), JSON.stringify(liveBroadcast), 'utf8');
  await writeFile(path.join(distDir, 'legal-documents.json'), JSON.stringify(legalDocuments), 'utf8');
  await writeFile(path.join(distDir, 'promote.json'), JSON.stringify(promote), 'utf8');
  await writeFile(path.join(distDir, 'promote_content.json'), JSON.stringify(promoteContent), 'utf8');
  await writeFile(path.join(distDir, 'about.json'), JSON.stringify(about), 'utf8');
  await writeFile(path.join(distDir, 'server', 'index.json'), managedIndexFixture, 'utf8');
  await writeFile(path.join(distDir, 'desktop', 'index.json'), managedIndexFixture, 'utf8');
  await writeFile(path.join(distDir, 'steam', 'index.json'), JSON.stringify(steam), 'utf8');
  await writeFile(path.join(distDir, 'steam', 'achievements.json'), JSON.stringify(steamAchievements), 'utf8');
  await writeFile(path.join(distDir, 'agent-templates', 'index.json'), JSON.stringify({
    version: '1.0.0',
    generatedAt: catalog.generatedAt,
    types: [
      {
        templateType: 'trait',
        title: 'Trait Templates',
        description: 'trait description',
        path: '/agent-templates/trait/index.json',
        count: 1,
      },
      {
        templateType: 'soul',
        title: 'SOUL Templates',
        description: 'soul description',
        path: '/agent-templates/soul/index.json',
        count: 2,
      },
    ],
  }), 'utf8');
  await writeFile(path.join(distDir, 'agent-templates', 'trait', 'index.json'), JSON.stringify(traitIndexFixture), 'utf8');
  await writeFile(path.join(distDir, 'agent-templates', 'soul', 'index.json'), JSON.stringify(soulIndexFixture), 'utf8');
  await writeFile(path.join(distDir, 'agent-templates', 'trait', 'templates', 'trait-one.json'), JSON.stringify({
    id: 'trait-one',
    templateType: 'trait',
    name: 'Trait One',
    summary: 'Trait summary',
  }), 'utf8');
  await writeFile(path.join(distDir, 'agent-templates', 'soul', 'templates', 'soul-one.json'), JSON.stringify({
    id: 'soul-one',
    templateType: 'soul',
    name: 'Soul One',
    summary: 'Soul summary',
  }), 'utf8');
  await writeFile(path.join(distDir, 'agent-templates', 'soul', 'templates', 'soul-two.json'), JSON.stringify({
    id: 'soul-two',
    templateType: 'soul',
    name: 'Soul Two',
    summary: 'Soul summary two',
  }), 'utf8');
  await writeFile(
    path.join(distDir, 'secondary-professions', 'index.json'),
    JSON.stringify({ version: '1.0.0', professions: [{ id: 'prompt-engineer', title: 'Prompt Engineer' }] }),
    'utf8',
  );
  await writeFile(
    path.join(distDir, 'character-templates', 'README.md'),
    '# Character Templates\n',
    'utf8',
  );
  await writeFile(
    path.join(distDir, 'character-templates', 'index.json'),
    JSON.stringify(characterLibraryFixture.manifest),
    'utf8',
  );
  await writeFile(
    path.join(distDir, 'character-templates', 'templates', 'character-one.json'),
    JSON.stringify(characterLibraryFixture.details[0]),
    'utf8',
  );

  for (const theme of design.themes) {
    const themeDir = path.join(designVendorDir, theme.slug);
    await mkdir(themeDir, { recursive: true });
    await writeFile(path.join(themeDir, 'README.md'), buildDesignReadmeFixture(theme), 'utf8');
  }

  return tempDir;
}

test('catalog validation script succeeds', async (t) => {
  if (!process.env.INDEX_BUILD_ROOT) {
    t.skip('INDEX_BUILD_ROOT is required so this test validates a fresh build output instead of stale dist/.');
    return;
  }

  const publishedRoot = path.resolve(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist');

  const { stdout } = await execFileAsync(
    'node',
    ['./scripts/validate-catalog.mjs', '--published-root', path.relative(projectRoot, publishedRoot)],
    { cwd: projectRoot },
  );

  assert.match(stdout, /Validated \d+ catalog entries, 12 route-mapped JSON assets, and \d+ published JSON assets\./);
});

test('character template library materializes stable dungeon bindings for summaries and details', () => {
  const library = buildCharacterTemplateLibrary({
    libraryData: buildCharacterTemplateLibraryFixtureData(),
    soulIndex: buildSoulIndexFixture(),
    traitIndex: buildTraitIndexFixture(),
  });

  assert.deepEqual(library.manifest.templates[0].dungeonBindings, [
    {
      scriptKey: 'proposal.generate',
      matchedTags: ['frontend', 'react'],
      matchedTagGroups: ['languages', 'domains'],
      priority: 0,
    },
    {
      scriptKey: 'proposal.execute',
      matchedTags: ['engineer'],
      matchedTagGroups: ['roles'],
      priority: 1,
    },
    {
      scriptKey: 'proposal.archive',
      matchedTags: ['engineer', 'frontend', 'react'],
      matchedTagGroups: ['languages', 'domains', 'roles'],
      priority: 2,
    },
  ]);
  assert.deepEqual(library.details[0].dungeonBindings, library.manifest.templates[0].dungeonBindings);
  assert.equal(library.manifest.templates[0].templateMode, 'curated');
  assert.deepEqual(library.manifest.templates[0].applyScope, ['soul', 'trait']);
  assert.deepEqual(library.details[0].applyScope, ['soul', 'trait']);
});

test('character template library materializes universal summaries and details with soul-only apply scope', () => {
  const library = buildCharacterTemplateLibrary({
    libraryData: buildCharacterTemplateLibraryFixtureData({
      templateMode: 'universal',
      traitTemplateIds: [],
    }),
    soulIndex: buildSoulIndexFixture(),
    traitIndex: buildTraitIndexFixture(),
  });

  assert.equal(library.manifest.templates[0].templateMode, 'universal');
  assert.deepEqual(library.manifest.templates[0].applyScope, ['soul']);
  assert.equal(library.details[0].templateMode, 'universal');
  assert.deepEqual(library.details[0].applyScope, ['soul']);
  assert.deepEqual(library.details[0].traitTemplateIds, []);
});

test('character template library rejects unknown dungeon binding tags', () => {
  const fixture = buildCharacterTemplateLibraryFixtureData();
  fixture.dungeonBindingPresetSources[0].tagGroups.languages = ['missing-tag'];

  assert.throws(
    () => buildCharacterTemplateLibrary({
      libraryData: fixture,
      soulIndex: buildSoulIndexFixture(),
      traitIndex: buildTraitIndexFixture(),
    }),
    /references unknown languages tag missing-tag\./,
  );
});

test('character template library rejects duplicate dungeon binding script keys', () => {
  const fixture = buildCharacterTemplateLibraryFixtureData();
  fixture.dungeonBindingPresetSources.push({
    scriptKey: 'proposal.generate',
    tagGroups: {
      languages: ['react'],
      domains: [],
      roles: [],
    },
  });

  assert.throws(
    () => buildCharacterTemplateLibrary({
      libraryData: fixture,
      soulIndex: buildSoulIndexFixture(),
      traitIndex: buildTraitIndexFixture(),
    }),
    /contains duplicate scriptKey proposal\.generate\./,
  );
});

test('catalog exposes managed server and desktop entries', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const entryIds = catalog.entries.map((entry) => entry.id);

  assert.deepEqual(entryIds, [
    'presets-catalog',
    'server-packages',
    'desktop-packages',
    'agent-templates',
    'character-templates',
    'about',
    'design-theme-catalog',
    'secondary-professions',
    'steam-data',
    'steam-achievements',
    'promotion-flags',
    'promotion-content',
  ]);
});

test('catalog exposes about entry at the canonical JSON route', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const aboutEntry = catalog.entries.find((entry) => entry.id === 'about');

  assert.ok(aboutEntry, 'about entry is required.');
  assert.equal(aboutEntry.path, '/about.json');
  assert.equal(aboutEntry.category, 'contacts');
});

test('catalog exposes design theme catalog entry at the canonical JSON route', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const designPath = path.join(projectRoot, 'src', 'data', 'public', 'design.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const design = JSON.parse(await readFile(designPath, 'utf8'));
  const designEntry = catalog.entries.find((entry) => entry.id === 'design-theme-catalog');

  assert.ok(designEntry, 'design-theme-catalog entry is required.');
  assert.equal(designEntry.path, '/design.json');
  assert.equal(designEntry.category, 'catalogs');
  assert.equal(designEntry.lastUpdated, design.updatedAt);
  assert.equal(designEntry.sourceRepo, 'VoltAgent/awesome-design-md');
  assert.equal(designEntry.sourceUrl, 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md');
});

test('portal sites catalog exposes the approved production destinations', async () => {
  const sitesCatalogPath = path.join(projectRoot, 'src', 'data', 'public', 'sites.json');
  const sitesCatalog = JSON.parse(await readFile(sitesCatalogPath, 'utf8'));
  const urlById = new Map(sitesCatalog.entries.map((entry) => [entry.id, entry.url]));
  const coreGroup = sitesCatalog.groups.find((group) => group.id === 'core-sites');
  const mainSiteEntry = sitesCatalog.entries.find((entry) => entry.id === 'hagicode-main');

  assert.deepEqual(
    sitesCatalog.groups.map((group) => group.id),
    ['core-sites', 'data-and-tools', 'creator-studios'],
  );
  assert.equal(coreGroup.label['zh-CN'], '核心站点');
  assert.equal(coreGroup.label['en-US'], 'Core Sites');
  assert.equal(mainSiteEntry.title['zh-CN'], 'HagiCode 主站');
  assert.equal(mainSiteEntry.title['en-US'], 'HagiCode Main Site');
  assert.equal(mainSiteEntry.actionLabel['ja-JP'], '公式サイトを開く');
  assert.equal(urlById.get('hagicode-main'), 'https://hagicode.com/');
  assert.equal(urlById.get('hagicode-docs'), 'https://docs.hagicode.com/');
  assert.equal(urlById.get('newbe-blog'), 'https://newbe.hagicode.com/');
  assert.equal(urlById.get('index-data'), 'https://index.hagicode.com/data/');
  assert.equal(urlById.get('compose-builder'), 'https://builder.hagicode.com/');
  assert.equal(urlById.get('cost-calculator'), 'https://cost.hagicode.com/');
  assert.equal(urlById.get('status-page'), 'https://status.hagicode.com/');
  assert.equal(urlById.get('awesome-design-gallery'), 'https://design.hagicode.com/');
  assert.equal(urlById.get('soul-builder'), 'https://soul.hagicode.com/');
  assert.equal(urlById.get('trait-builder'), 'https://trait.hagicode.com/');
});

test('managed package entries expose stable history page paths', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const serverEntry = catalog.entries.find((entry) => entry.id === 'server-packages');
  const desktopEntry = catalog.entries.find((entry) => entry.id === 'desktop-packages');

  assert.equal(serverEntry.historyPagePath, '/server/history/');
  assert.equal(desktopEntry.historyPagePath, '/desktop/history/');
});

test('catalog exposes promotion discovery entries at canonical JSON routes', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const promotePath = path.join(projectRoot, 'src', 'data', 'public', 'promote.json');
  const promoteContentPath = path.join(projectRoot, process.env.INDEX_BUILD_ROOT ?? 'dist', 'promote_content.json');
  const promote = JSON.parse(await readFile(promotePath, 'utf8'));
  const promoteContent = JSON.parse(await readFile(promoteContentPath, 'utf8'));
  const promotionFlagsEntry = catalog.entries.find((entry) => entry.id === 'promotion-flags');
  const promotionContentEntry = catalog.entries.find((entry) => entry.id === 'promotion-content');
  const mainPromotion = promote.promotes.find((entry) => entry.id === 'main-game-2026-04-29');
  const eaPromotion = promote.promotes.find((entry) => entry.id === 'main-game-steam-ea-2026-04-29');
  const plusPromotion = promote.promotes.find((entry) => entry.id === 'hagicode-plus-bundle');
  const turboPromotion = promote.promotes.find((entry) => entry.id === 'hagicode-turbo-engine-dlc');
  const mainPromotionContent = promoteContent.contents.find((entry) => entry.id === 'main-game-2026-04-29');
  const eaPromotionContent = promoteContent.contents.find((entry) => entry.id === 'main-game-steam-ea-2026-04-29');
  const plusPromotionContent = promoteContent.contents.find((entry) => entry.id === 'hagicode-plus-bundle');
  const turboPromotionContent = promoteContent.contents.find((entry) => entry.id === 'hagicode-turbo-engine-dlc');

  assert.ok(promotionFlagsEntry, 'promotion-flags entry is required.');
  assert.ok(promotionContentEntry, 'promotion-content entry is required.');
  assert.equal(promotionFlagsEntry.path, '/promote.json');
  assert.equal(promotionFlagsEntry.sourceRepo, 'repos/index');
  assert.equal(promotionFlagsEntry.status, 'published');
  assert.equal(promotionContentEntry.path, '/promote_content.json');
  assert.equal(promotionContentEntry.sourceRepo, 'repos/index');
  assert.equal(promotionContentEntry.status, 'published');
  assert.equal(mainPromotion?.on, true);
  assert.equal(mainPromotion?.endTime, '2026-04-29T00:00:00+08:00');
  assert.equal(eaPromotion?.on, true);
  assert.equal(eaPromotion?.startTime, '2026-04-29T00:00:00+08:00');
  assert.equal(Date.parse(mainPromotion.endTime), Date.parse(eaPromotion.startTime));
  assert.equal(plusPromotion?.on, false);
  assert.equal(turboPromotion?.on, false);
  assert.deepEqual(Object.keys(mainPromotionContent?.title ?? {}).sort(), supportedPromotoLocales);
  assert.deepEqual(Object.keys(mainPromotionContent?.description ?? {}).sort(), supportedPromotoLocales);
  assert.deepEqual(Object.keys(mainPromotionContent?.cta ?? {}).sort(), supportedPromotoLocales);
  assert.match(mainPromotionContent?.description['zh-CN'], /Vibe Coding/);
  assert.match(mainPromotionContent?.description['zh-CN'], /求求了/);
  assert.doesNotMatch(mainPromotionContent?.description['zh-CN'] ?? '', /游戏将于/);
  assert.equal(eaPromotionContent?.title['zh-CN'], '终于上架 EA 啦');
  assert.equal(eaPromotionContent?.title['en-US'], 'Early Access Is Finally Here');
  assert.equal(eaPromotionContent?.title['ja-JP'], 'ついに早期アクセス開始');
  assert.match(eaPromotionContent?.description['zh-CN'] ?? '', /steam/i);
  assert.match(eaPromotionContent?.description['zh-CN'] ?? '', /EA|抢先体验/);
  assert.match(eaPromotionContent?.description['zh-CN'] ?? '', /呜呜呜/);
  assert.match(eaPromotionContent?.description['zh-CN'] ?? '', /求求了/);
  assert.match(eaPromotionContent?.description['en-US'] ?? '', /Steam/);
  assert.match(eaPromotionContent?.description['en-US'] ?? '', /Early Access|EA/);
  assert.match(eaPromotionContent?.description['en-US'] ?? '', /Sob/);
  assert.match(eaPromotionContent?.description['en-US'] ?? '', /Pretty please/);
  assert.equal(mainPromotionContent?.cta['zh-CN'], '加入愿望单');
  assert.equal(mainPromotionContent?.cta['en-US'], 'Wishlist on Steam');
  assert.equal(typeof mainPromotionContent?.image.src, 'string');
  assert.equal(Number.isInteger(mainPromotionContent?.image.width), true);
  assert.equal(Number.isInteger(mainPromotionContent?.image.height), true);
  assert.equal(typeof mainPromotionContent?.image.format, 'string');
  assert.equal(mainPromotionContent?.image.alt, 'HagiCode Steam store capsule artwork');
  assert.equal(eaPromotionContent?.cta['zh-CN'], '查看抢先体验');
  assert.equal(eaPromotionContent?.cta['en-US'], 'View Early Access');
  assert.equal(eaPromotionContent?.image.alt, 'HagiCode Early Access Steam artwork');
  assert.equal(eaPromotionContent?.link, 'https://store.steampowered.com/app/4625540/Hagicode/');
  assert.equal(eaPromotionContent?.targetPlatform, 'steam');
  assert.match(plusPromotionContent?.description['zh-CN'], /15% off/);
  assert.match(plusPromotionContent?.description['zh-CN'], /呜呜呜/);
  assert.equal(plusPromotionContent?.cta['zh-CN'], '查看套装');
  assert.equal(plusPromotionContent?.cta['en-US'], 'View Bundle');
  assert.equal(plusPromotionContent?.link, 'https://store.steampowered.com/bundle/73989/Hagicode_Plus/');
  assert.match(turboPromotionContent?.description['zh-CN'], /32/);
  assert.match(turboPromotionContent?.description['zh-CN'], /求求了/);
  assert.equal(turboPromotionContent?.cta['zh-CN'], '查看 DLC');
  assert.equal(turboPromotionContent?.cta['en-US'], 'View DLC');
  assert.equal(turboPromotionContent?.link, 'https://store.steampowered.com/app/4635480/Hagicode__Turbo_Engine/');
});

test('catalog validation keeps legacy promotion content without cta parseable', async () => {
  const promoteContent = buildPromoteContentFixture();
  for (const entry of promoteContent.contents) {
    delete entry.cta;
  }

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    promoteContent,
  });

  await execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
    cwd: tempDir,
  });
});

test('catalog validation rejects malformed promotion cta maps', async () => {
  const invalidCases = [
    {
      label: 'non-object cta',
      mutate(promoteContent) {
        promoteContent.contents[0].cta = 'Wishlist';
      },
      expected: /Promote content\[0\] cta must be an object\./,
    },
    {
      label: 'blank cta value',
      mutate(promoteContent) {
        promoteContent.contents[0].cta['zh-CN'] = '   ';
      },
      expected: /Promote content\[0\] cta\.zh-CN is required\./,
    },
    {
      label: 'missing desktop locale',
      mutate(promoteContent) {
        delete promoteContent.contents[0].title['ja-JP'];
      },
      expected: /Promote content\[0\] title locales must match Desktop supported language codes\./,
    },
  ];

  for (const testCase of invalidCases) {
    const promoteContent = buildPromoteContentFixture();
    testCase.mutate(promoteContent);
    const tempDir = await createValidationFixture({
      catalog: buildCatalogFixture(),
        promoteContent,
    });

    await assert.rejects(
      () =>
        execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
          cwd: tempDir,
        }),
      (error) => {
        assert.match(error.stderr, testCase.expected, testCase.label);
        return true;
      },
    );
  }
});

test('catalog validation rejects invalid generated image descriptors directly', () => {
  const invalidCases = [
    {
      label: 'missing src',
      image: { ...buildImageDescriptorFixture(), src: '' },
      expected: /Promote content\[0\] image src is required\./,
      options: {},
    },
    {
      label: 'invalid width',
      image: { ...buildImageDescriptorFixture(), width: 0 },
      expected: /Promote content\[0\] image width must be a positive integer\./,
      options: {},
    },
    {
      label: 'missing variant',
      image: buildImageDescriptorFixture(),
      expected: /Steam application\[0\] images\[0\] variant is required\./,
      options: { requireVariant: true },
    },
  ];

  for (const testCase of invalidCases) {
    assert.throws(
      () => validateGeneratedImageDescriptor(testCase.image, testCase.options.requireVariant ? 'Steam application[0] images[0]' : 'Promote content[0] image', testCase.options),
      testCase.expected,
      testCase.label,
    );
  }
});

test('catalog validation rejects invalid generated promote and Steam image descriptors', async () => {
  const invalidCases = [
    {
      label: 'promote missing image',
      mutate({ promoteContent }) {
        delete promoteContent.contents[0].image;
      },
      expected: /Promote content\[0\] image must be an object\./,
    },
    {
      label: 'steam missing images',
      mutate({ steam }) {
        delete steam.applications[0].images;
      },
      expected: /Steam application\[0\] images must be a non-empty array\./,
    },
    {
      label: 'steam blank variant',
      mutate({ steam }) {
        steam.applications[0].images[0].variant = '   ';
      },
      expected: /Steam application\[0\] images\[0\] variant is required\./,
    },
  ];

  for (const testCase of invalidCases) {
    const promoteContent = buildPromoteContentFixture();
    const steam = buildSteamFixture();
    testCase.mutate({ promoteContent, steam });
    const tempDir = await createValidationFixture({
      catalog: buildCatalogFixture(),
        promoteContent,
      steam,
    });

    await assert.rejects(
      () =>
        execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
          cwd: tempDir,
        }),
      (error) => {
        assert.match(error.stderr, testCase.expected, testCase.label);
        return true;
      },
    );
  }
});

test('catalog validation fails when an enabled promotion flag does not resolve to content', async () => {
  const promote = buildPromoteFixture();
  promote.promotes[0].id = 'missing-promotion-id';

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    promote,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Promote id missing-promotion-id must resolve to a promote_content\.json entry when enabled or scheduled\./);
      return true;
    },
  );
});

test('catalog validation fails when a scheduled promotion flag does not resolve to content', async () => {
  const promote = buildPromoteFixture();
  promote.promotes[1] = {
    id: 'missing-future-promotion-id',
    on: false,
    startTime: '2026-04-29T00:00:00+08:00',
  };

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    promote,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Promote id missing-future-promotion-id must resolve to a promote_content\.json entry when enabled or scheduled\./);
      return true;
    },
  );
});

test('catalog validation rejects invalid promotion schedule metadata', async () => {
  const invalidCases = [
    {
      label: 'non-string startTime',
      mutate(promote) {
        promote.promotes[0].startTime = 123;
      },
      expected: /Promote entry\[0\] startTime must be a string when present\./,
    },
    {
      label: 'timestamp without explicit timezone',
      mutate(promote) {
        promote.promotes[0].startTime = '2026-04-29T00:00:00';
      },
      expected: /Promote entry\[0\] startTime must be an ISO 8601 timestamp with an explicit timezone\./,
    },
    {
      label: 'startTime equal to endTime',
      mutate(promote) {
        promote.promotes[0].startTime = '2026-04-29T00:00:00+08:00';
      },
      expected: /Promote entry\[0\] startTime must be before endTime\./,
    },
    {
      label: 'duplicate ids',
      mutate(promote) {
        promote.promotes[1].id = 'main-game-2026-04-29';
      },
      expected: /Duplicate promote id main-game-2026-04-29\./,
    },
  ];

  for (const testCase of invalidCases) {
    const promote = buildPromoteFixture();
    testCase.mutate(promote);
    const tempDir = await createValidationFixture({
      catalog: buildCatalogFixture(),
        promote,
    });

    await assert.rejects(
      () =>
        execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
          cwd: tempDir,
        }),
      (error) => {
        assert.match(error.stderr, testCase.expected, testCase.label);
        return true;
      },
    );
  }
});

test('catalog validation fails when a Steam promoteId does not resolve to promotion content', async () => {
  const steam = buildSteamFixture();
  steam.applications[0].promoteId = 'missing-promotion-id';

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    steam,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Steam application hagicode promoteId missing-promotion-id must resolve to a promote_content\.json entry\./);
      return true;
    },
  );
});

test('catalog validation fails when a Steam bundle references an unknown application key', async () => {
  const steam = buildSteamFixture();
  steam.bundles[0].includedApplicationKeys = ['hagicode', 'missing-app'];

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    steam,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Steam bundle\[0\] includedApplicationKeys\[1\] must reference a published Steam application key\./);
      return true;
    },
  );
});

test('live broadcast source-side contract keeps the stable QR asset and Thursday exclusion', async () => {
  const liveBroadcastPath = path.join(projectRoot, 'src', 'data', 'public', 'live-broadcast.json');
  const liveBroadcast = JSON.parse(await readFile(liveBroadcastPath, 'utf8'));

  assert.equal('imageUrl' in liveBroadcast.qrCode, false);
  assert.deepEqual(liveBroadcast.schedule.excludedWeekdays, [4]);
  assert.equal(liveBroadcast.schedule.previewStartTime, '18:00');
  assert.equal(liveBroadcast.schedule.startTime, '20:00');
  assert.equal(liveBroadcast.schedule.endTime, '21:00');
  assert.equal(liveBroadcast.locales.en.title, 'Daily Hagi Live Coding Room');
});

test('design source-side contract keeps all theme links aligned with awesome-design-md', async () => {
  const designPath = path.join(projectRoot, 'src', 'data', 'public', 'design.json');
  const design = JSON.parse(await readFile(designPath, 'utf8'));
  const linearTheme = design.themes.find((entry) => entry.slug === 'linear.app');
  const xaiTheme = design.themes.find((entry) => entry.slug === 'x.ai');

  assert.equal(design.vendorPath, 'vendor/awesome-design-md');
  assert.equal(design.sourceRepository, 'https://github.com/VoltAgent/awesome-design-md');
  assert.equal(design.detailBaseUrl, 'https://design.hagicode.com/designs/');
  assert.equal(design.themeCount, 58);
  assert.equal(design.themes.length, 58);
  assert.equal(linearTheme.designDownloadUrl, 'https://design.hagicode.com/designs/linear.app/DESIGN.md');
  assert.equal(linearTheme.previewLightImageUrl, 'https://pub-2e4ecbcbc9b24e7b93f1a6ab5b2bc71f.r2.dev/designs/linear.app/preview-screenshot.png');
  assert.equal(linearTheme.previewDarkImageUrl, 'https://pub-2e4ecbcbc9b24e7b93f1a6ab5b2bc71f.r2.dev/designs/linear.app/preview-dark-screenshot.png');
  assert.equal(linearTheme.previewLightAlt, 'Linear Design System — Light Mode');
  assert.equal(xaiTheme.designDownloadUrl, 'https://design.hagicode.com/designs/x.ai/DESIGN.md');
  assert.equal(xaiTheme.previewDarkAlt, 'xAI Design System — Dark Mode');
  assert.equal(linearTheme.previewLightImageUrl.endsWith('.html'), false);
  assert.equal(xaiTheme.previewDarkImageUrl.endsWith('.html'), false);
});

test('catalog exposes agent template discovery entry with the public manifest path', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const manifestPath = path.join(projectRoot, 'public', 'agent-templates', 'index.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = catalog.entries.find((item) => item.id === 'agent-templates');

  assert.equal(entry.path, '/agent-templates/index.json');
  assert.equal(entry.category, 'templates');
  assert.deepEqual(manifest.types.map((item) => item.templateType), ['soul', 'trait']);
});

test('catalog exposes character template discovery entry with the public manifest path', async () => {
  const catalogPath = path.join(projectRoot, 'src', 'data', 'public', 'index-catalog.json');
  const manifestPath = path.join(projectRoot, 'public', 'character-templates', 'index.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = catalog.entries.find((item) => item.id === 'character-templates');

  assert.equal(entry.path, '/character-templates/index.json');
  assert.equal(entry.readmePath, '/character-templates/README.md');
  assert.equal(entry.category, 'templates');
  assert.equal(manifest.templates.length >= 1, true);
  assert(manifest.templates.every((template) => ['curated', 'universal'].includes(template.templateMode)));
  assert(manifest.templates.every((template) => Array.isArray(template.applyScope)));
});

test('character template detail preserves ordered multi-soul references', async () => {
  const detailPath = path.join(projectRoot, 'public', 'character-templates', 'templates', 'character-cold-scholar-react-engineer.json');
  const detail = JSON.parse(await readFile(detailPath, 'utf8'));

  assert.deepEqual(detail.soulTemplateIds, [
    'soul-main-12-aloof-ace-scholar',
    'soul-orth-11-classical-chinese-ultra-minimal-mode',
  ]);
  assert.equal(detail.templateMode, 'curated');
  assert.deepEqual(detail.applyScope, ['soul', 'trait']);
});

test('published universal character template only exposes soul bindings', async () => {
  const detailPath = path.join(projectRoot, 'public', 'character-templates', 'templates', 'character-cold-scholar-universal-template.json');
  const detail = JSON.parse(await readFile(detailPath, 'utf8'));

  assert.equal(detail.templateMode, 'universal');
  assert.deepEqual(detail.applyScope, ['soul']);
  assert.deepEqual(detail.traitTemplateIds, []);
});

test('catalog validation fails with a clear message when the design vendor submodule is missing', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });

  await rm(path.join(tempDir, 'vendor'), { recursive: true, force: true });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Missing required design vendor submodule/);
      assert.match(error.stderr, /git submodule update --init --recursive/);
      return true;
    },
  );
});

test('catalog validation fails when the live broadcast payload publishes a QR asset URL', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    liveBroadcast: {
      ...buildLiveBroadcastFixture(),
      qrCode: {
        ...buildLiveBroadcastFixture().qrCode,
        imageUrl: '/live/temporary.png',
      },
    },
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Live broadcast qrCode must not publish imageUrl; each site hosts its own QR asset path\./);
      return true;
    },
  );
});

test('catalog validation fails when the design payload drifts from the canonical preview URL pattern', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    design: buildDesignFixture({
      themes: [
        {
          slug: 'linear.app',
          title: 'Linear Inspired Design System',
          sourceDirectoryUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app',
          readmeUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/README.md',
          designUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md',
          designDownloadUrl: 'https://design.hagicode.com/designs/linear.app/DESIGN.md',
          previewLightImageUrl: 'https://cdn.example.com/designs/linear.app/invalid.html',
          previewLightAlt: 'Linear Design System — Light Mode',
          previewDarkImageUrl: 'https://cdn.example.com/designs/linear.app/preview-dark-screenshot.png',
          previewDarkAlt: 'Linear Design System — Dark Mode',
          detailUrl: 'https://design.hagicode.com/designs/linear.app/',
        },
        {
          slug: 'x.ai',
          title: 'xAI Inspired Design System',
          sourceDirectoryUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/x.ai',
          readmeUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/README.md',
          designUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md',
          designDownloadUrl: 'https://design.hagicode.com/designs/x.ai/DESIGN.md',
          previewLightImageUrl: 'https://cdn.example.com/designs/x.ai/preview-screenshot.png',
          previewLightAlt: 'xAI Design System — Light Mode',
          previewDarkImageUrl: 'https://cdn.example.com/designs/x.ai/preview-dark-screenshot.png',
          previewDarkAlt: 'xAI Design System — Dark Mode',
          detailUrl: 'https://design.hagicode.com/designs/x.ai/',
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /Design theme\[0\] previewLightImageUrl must not point to HTML\./,
      );
      return true;
    },
  );
});

test('catalog validation fails when the design download URL drifts from the canonical route', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    design: buildDesignFixture({
      themes: [
        {
          slug: 'linear.app',
          title: 'Linear Inspired Design System',
          sourceDirectoryUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app',
          readmeUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/README.md',
          designUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md',
          designDownloadUrl: 'https://github.com/VoltAgent/awesome-design-md/raw/main/design-md/linear.app/DESIGN.md',
          previewLightImageUrl: 'https://cdn.example.com/designs/linear.app/preview-screenshot.png',
          previewLightAlt: 'Linear Design System — Light Mode',
          previewDarkImageUrl: 'https://cdn.example.com/designs/linear.app/preview-dark-screenshot.png',
          previewDarkAlt: 'Linear Design System — Dark Mode',
          detailUrl: 'https://design.hagicode.com/designs/linear.app/',
        },
        {
          slug: 'x.ai',
          title: 'xAI Inspired Design System',
          sourceDirectoryUrl: 'https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/x.ai',
          readmeUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/README.md',
          designUrl: 'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md',
          designDownloadUrl: 'https://design.hagicode.com/designs/x.ai/DESIGN.md',
          previewLightImageUrl: 'https://cdn.example.com/designs/x.ai/preview-screenshot.png',
          previewLightAlt: 'xAI Design System — Light Mode',
          previewDarkImageUrl: 'https://cdn.example.com/designs/x.ai/preview-dark-screenshot.png',
          previewDarkAlt: 'xAI Design System — Dark Mode',
          detailUrl: 'https://design.hagicode.com/designs/x.ai/',
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /Design theme\[0\] designDownloadUrl must point to the canonical DESIGN\.md download route\./,
      );
      return true;
    },
  );
});

test('catalog validation fails when the about payload leaks a raw source filename', async () => {
  const about = buildAboutFixture();
  const douyinQrEntry = about.entries.find((entry) => entry.id === 'douyin-qr');

  assert.ok(douyinQrEntry, 'douyin-qr fixture entry is required.');
  douyinQrEntry.imageUrl = '/_astro/douyin.png';

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    about,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /About entry douyin-qr imageUrl must not leak raw source filenames\./);
      return true;
    },
  );
});

test('catalog validation fails when the about payload misses required image metadata', async () => {
  const about = buildAboutFixture();
  const wechatEntry = about.entries.find((entry) => entry.id === 'wechat-account');

  assert.ok(wechatEntry, 'wechat-account fixture entry is required.');
  delete wechatEntry.width;

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    about,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /About entry wechat-account width must be a positive integer\./);
      return true;
    },
  );
});

test('catalog validation fails when the about payload misses a region priority marker', async () => {
  const about = buildAboutFixture();
  const discordEntry = about.entries.find((entry) => entry.id === 'discord');

  assert.ok(discordEntry, 'discord fixture entry is required.');
  delete discordEntry.regionPriority;

  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    about,
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /About entry discord regionPriority must be china-first or international-first\./);
      return true;
    },
  );
});

test('catalog validation fails when a route-mapped JSON output is pretty printed', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });

  await writeFile(
    path.join(tempDir, 'dist', 'index-catalog.json'),
    JSON.stringify(buildCatalogFixture(), null, 2),
    'utf8',
  );

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Published JSON \/index-catalog\.json must be stable minified JSON\./);
      return true;
    },
  );
});

test('catalog validation fails when copied public JSON output is pretty printed', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });

  await writeFile(
    path.join(tempDir, 'dist', 'secondary-professions', 'index.json'),
    JSON.stringify({ version: '1.0.0', professions: [{ id: 'prompt-engineer', title: 'Prompt Engineer' }] }, null, 2),
    'utf8',
  );

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Published JSON \/secondary-professions\/index\.json must be stable minified JSON\./);
      return true;
    },
  );
});

test('catalog validation reports invalid copied public JSON with the published path', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });

  await writeFile(
    path.join(tempDir, 'dist', 'secondary-professions', 'index.json'),
    '{"version":"1.0.0",',
    'utf8',
  );

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Published JSON \/secondary-professions\/index\.json is invalid JSON:/);
      return true;
    },
  );
});

test('published JSON minifier preserves semantics and public paths while leaving sources readable', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });
  const sourcePublicPath = path.join(tempDir, 'public', 'secondary-professions', 'index.json');
  const copiedPublishedPath = path.join(tempDir, 'dist', 'secondary-professions', 'index.json');
  const routeMappedPublishedPath = path.join(tempDir, 'dist', 'index-catalog.json');
  const sourcePayload = { version: '1.0.0', professions: [{ id: 'source-readable', title: 'Source Readable' }] };
  const copiedPayload = { version: '1.0.0', professions: [{ id: 'published-copy', title: 'Published Copy' }] };
  const routePayload = buildCatalogFixture();

  await mkdir(path.dirname(sourcePublicPath), { recursive: true });
  await writeFile(sourcePublicPath, JSON.stringify(sourcePayload, null, 2), 'utf8');
  await writeFile(copiedPublishedPath, JSON.stringify(copiedPayload, null, 2), 'utf8');
  await writeFile(routeMappedPublishedPath, JSON.stringify(routePayload, null, 2), 'utf8');

  const beforeCopied = JSON.parse(await readFile(copiedPublishedPath, 'utf8'));
  const beforeRoute = JSON.parse(await readFile(routeMappedPublishedPath, 'utf8'));

  await execNodeAsync(['./scripts/minify-published-json.mjs', '--published-root', 'dist'], {
    cwd: tempDir,
  });

  assert.deepEqual(JSON.parse(await readFile(copiedPublishedPath, 'utf8')), beforeCopied);
  assert.deepEqual(JSON.parse(await readFile(routeMappedPublishedPath, 'utf8')), beforeRoute);
  assert.equal(await readFile(copiedPublishedPath, 'utf8'), JSON.stringify(copiedPayload));
  assert.equal(await readFile(routeMappedPublishedPath, 'utf8'), JSON.stringify(routePayload));
  assert.equal(await readFile(sourcePublicPath, 'utf8'), JSON.stringify(sourcePayload, null, 2));

  await access(copiedPublishedPath);
  await access(routeMappedPublishedPath);
});

test('published JSON minifier refuses source-of-truth directories', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/minify-published-json.mjs', '--published-root', 'public'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(error.stderr, /Refusing to minify source-of-truth JSON under public\//);
      return true;
    },
  );
});

test('catalog validation fails when a character template references an unknown soul template', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
  });

  const detailPath = path.join(tempDir, 'dist', 'character-templates', 'templates', 'character-one.json');
  await writeFile(
    detailPath,
    JSON.stringify(buildCharacterTemplateDetailFixture({
      soulTemplateIds: ['soul-one', 'missing-soul'],
      traitTemplateIds: ['trait-one'],
    })),
    'utf8',
  );

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /Character template character-one references unknown soul template missing-soul\./,
      );
      return true;
    },
  );
});

test('catalog validation fails when a universal character template still controls traits', async () => {
  const tempDir = await createValidationFixture({
    catalog: buildCatalogFixture(),
    libraryData: buildCharacterTemplateLibraryFixtureData({
      templateMode: 'universal',
      traitTemplateIds: [],
    }),
  });

  const detailPath = path.join(tempDir, 'dist', 'character-templates', 'templates', 'character-one.json');
  await writeFile(
    detailPath,
    JSON.stringify({
      ...buildCharacterTemplateDetailFixture({
        templateMode: 'universal',
        traitTemplateIds: [],
      }),
      applyScope: ['soul', 'trait'],
      traitTemplateIds: ['trait-one'],
    }),
    'utf8',
  );

  await assert.rejects(
    () =>
      execNodeAsync(['./scripts/validate-catalog.mjs', '--published-root', 'dist'], {
        cwd: tempDir,
      }),
    (error) => {
      assert.match(
        error.stderr,
        /detail applyScope must match its summary|applyScope must be \["soul"\] for universal templates|templateMode universal must not control Trait templates\./,
      );
      return true;
    },
  );
});
