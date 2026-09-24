import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { hazirPresetler } from './shared/katalog.js';

// Yalnızca katalogda hazır işaretli presetler derlenir; yapımı süren klasörler yayını bozmasın.
const hazir = new Set(hazirPresetler().map((p) => p.id));
const presets = readdirSync(resolve(import.meta.dirname, 'presets')).filter(
  (p) => hazir.has(p) && existsSync(resolve(import.meta.dirname, 'presets', p, 'index.html'))
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
