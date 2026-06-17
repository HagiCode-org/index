import { createPublishedJsonResponse } from '@/lib/json-publication';
import { buildStructuredArticleRootManifest } from '@/lib/structured-articles';

export const prerender = true;

export async function GET() {
  return createPublishedJsonResponse(await buildStructuredArticleRootManifest());
}
