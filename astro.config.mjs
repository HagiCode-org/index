import { defineConfig } from 'astro/config';
import { hagilight } from '@hagicode/hagilight/integration';

export default defineConfig({
  site: 'https://index.hagicode.com',
  output: 'static',
  integrations: [hagilight()],
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  scopedStyleStrategy: 'where',
});
