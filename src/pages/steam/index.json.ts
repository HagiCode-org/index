import { steamPayload } from '@/data/steam-source';
import { createPublishedJsonResponse } from '@/lib/json-publication';

export const prerender = true;

export async function GET() {
  return createPublishedJsonResponse(steamPayload);
}
