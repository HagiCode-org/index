import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://index.hagicode.com',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  scopedStyleStrategy: 'where',
});
