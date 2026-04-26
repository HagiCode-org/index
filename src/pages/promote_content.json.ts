import { promoteContentPayload } from '@/data/promote-content-source';
import { createPublishedJsonResponse } from '@/lib/json-publication';

export const prerender = true;

export async function GET() {
  return createPublishedJsonResponse(promoteContentPayload);
}
