import { createPublishedJsonResponse } from '@/lib/json-publication';
import {
  listStructuredArticleLocales,
  listStructuredArticleSlugs,
  loadStructuredArticleDetail,
} from '@/lib/structured-articles';

export const prerender = true;

export async function getStaticPaths() {
  const locales = await listStructuredArticleLocales();
  const paths = await Promise.all(
    locales.map(async (locale) => {
      const slugs = await listStructuredArticleSlugs(locale);
      return slugs.map((slug) => ({ params: { locale, slug } }));
    }),
  );

  return paths.flat();
}

export async function GET({ params }: { params: { locale?: string; slug?: string } }) {
  if (!params.locale || !params.slug) {
    throw new Error('Structured article detail route requires params.locale and params.slug.');
  }

  return createPublishedJsonResponse(await loadStructuredArticleDetail(params.locale, params.slug));
}
