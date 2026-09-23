import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Her presets/<ad>/index.html ayrı bir sayfa olarak derlenir.
const presets = readdirSync(resolve(import.meta.dirname, 'presets')).filter((p) =>
  existsSync(resolve(import.meta.dirname, 'presets', p, 'index.html'))
);

export default defineConfig({
  base: process.env.BASE_PATH || '/', // GitHub Pages: /<repo>/
  server: { host: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(presets.map((p) => [p, resolve(import.meta.dirname, 'presets', p, 'index.html')])),
      },
    },
  },
});
