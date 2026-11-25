import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import alerts from './src/plugins/alerts.js';

export default defineConfig({
  output: 'static',
  markdown: { processor: satteri({ hastPlugins: [alerts] }), shikiConfig: { theme: 'min-dark' } },
  devToolbar: { enabled: false },
  vite: { build: { target: 'es2022' }, server: { strictPort: true } },
});
