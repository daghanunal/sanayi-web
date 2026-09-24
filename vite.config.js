import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { HAZIR_OLMAYAN } from './shared/katalog.js';

// Her presets/<ad>/index.html ayrı bir sayfa olarak derlenir; katalogda hazır olmayanlar hariç.
const presets = readdirSync(resolve(import.meta.dirname, 'presets')).filter(
  (p) => existsSync(resolve(import.meta.dirname, 'presets', p, 'index.html')) && !HAZIR_OLMAYAN.has(p)
);

export default defineConfig({
  base: process.env.BASE_PATH || '/', // GitHub Pages: /<repo>/
  server: { host: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        vitrin: resolve(import.meta.dirname, 'vitrin/index.html'),
        ...Object.fromEntries(presets.map((p) => [p, resolve(import.meta.dirname, 'presets', p, 'index.html')])),
      },
    },
  },
});
