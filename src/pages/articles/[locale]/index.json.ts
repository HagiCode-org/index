import { createPublishedJsonResponse } from '@/lib/json-publication';
import {
  buildStructuredArticleLocaleManifest,
  listStructuredArticleLocales,
} from '@/lib/structured-articles';

export const prerender = true;

export async function getStaticPaths() {
  const locales = await listStructuredArticleLocales();

  return locales.map((locale) => ({ params: { locale } }));
}

export async function GET({ params }: { params: { locale?: string } }) {
  if (!params.locale) {
    throw new Error('Structured article locale route requires params.locale.');
  }

  return createPublishedJsonResponse(await buildStructuredArticleLocaleManifest(params.locale));
}
