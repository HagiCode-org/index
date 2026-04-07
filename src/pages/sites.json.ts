import { createRouteMappedJsonResponse } from '@/lib/json-publication';

export const prerender = true;

export async function GET() {
  return createRouteMappedJsonResponse('/sites.json');
}
