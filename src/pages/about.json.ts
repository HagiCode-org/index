import { createPublishedJsonResponse } from '@/lib/json-publication';
import { loadAboutPayload } from '@/lib/load-about';

export const prerender = true;

export async function GET() {
  return createPublishedJsonResponse(loadAboutPayload());
}
