import { defineConfig } from 'astro/config';
import { hagilight } from '@hagicode/hagilight/integration';

export default defineConfig({
  site: 'https://index.hagicode.com',
  output: 'static',
  integrations: [hagilight()],
  vite: {
    define: {
      'import.meta.env.VITE_51LA_ID': JSON.stringify(
        process.env.LI_51LA_ID || 'L6b88a5yK4h2Xnci',
      ),
      'import.meta.env.VITE_51LA_DEBUG': JSON.stringify(
        process.env.LI_51LA_DEBUG || '',
      ),
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  scopedStyleStrategy: 'where',
});
