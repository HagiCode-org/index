import douyinImage from '@/assets/about/douyin.png';
import feishuImage from '@/assets/about/feishu.png';
import wechatAccountImage from '@/assets/about/wechat-account.jpg';
import { buildAboutPayload } from '@/lib/about-data';
import { createPublishedJsonResponse } from '@/lib/json-publication';

export const prerender = true;

export async function GET() {
  return createPublishedJsonResponse(
    buildAboutPayload({
      douyin: douyinImage,
      feishu: feishuImage,
      'wechat-account': wechatAccountImage,
    }),
  );
}
