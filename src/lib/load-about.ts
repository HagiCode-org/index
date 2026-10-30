import douyinImage from '@/assets/about/douyin.avif';
import feishuImage from '@/assets/about/feishu.avif';
import wechatAccountImage from '@/assets/about/wechat-account.jpg';
import { buildAboutPayload, type AboutPayload } from '@/lib/about-data';

export function loadAboutPayload(): AboutPayload {
  return buildAboutPayload({
    douyin: douyinImage,
    feishu: feishuImage,
    'wechat-account': wechatAccountImage,
  });
}
