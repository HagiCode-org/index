import douyinImage from '@/assets/about/douyin.png';
import feishuImage from '@/assets/about/feishu.png';
import wechatAccountImage from '@/assets/about/wechat-account.jpg';
import { buildAboutPayload, type AboutPayload } from '@/lib/about-data';

export function loadAboutPayload(): AboutPayload {
  return buildAboutPayload({
    douyin: douyinImage,
    feishu: feishuImage,
    'wechat-account': wechatAccountImage,
  });
}
