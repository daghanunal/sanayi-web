import { defineConfig } from 'vite';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { hazirPresetler } from './shared/katalog.js';

// lib3d ön yükleme: presetin JS'inde loadAsset('ad') / loadEnv('ad') çağrılarını bulup 3D dosyalarını
// HTML'de <link rel="preload"> olarak ekler. Böylece model ve HDRI, JS indirilip çalışmayı beklemeden
// baştan paralel iner. Kalite pickQuality() ile aynı kuralla medya sorgusundan seçilir (telefon/dokunmatik → lo).
const LO_MEDYA = '(max-width: 820px), (pointer: coarse)';
const HI_MEDYA = '(min-width: 821px) and (pointer: fine)';
function lib3dOnyukleme() {
  let base = '/';
  const manifestYolu = resolve(import.meta.dirname, 'public/lib3d/manifest.json');
  return {
    name: 'lib3d-onyukleme',
    configResolved(c) {
      base = c.base;
    },
    transformIndexHtml(html, ctx) {
      const klasor = dirname(ctx.filename);
      if (!/[\\/]presets[\\/][^\\/]+$/.test(klasor) || !existsSync(manifestYolu)) return html;
      const kod = readdirSync(klasor)
        .filter((f) => f.endsWith('.js'))
        .map((f) => readFileSync(join(klasor, f), 'utf8'))
        .join('\n');
      const m = JSON.parse(readFileSync(manifestYolu, 'utf8'));
      const dosyalar = new Map(); // dosya → medya (null = her zaman)
      const ekle = (kayit, kalite) => {
        if (!kayit) return;
        for (const q of kalite ? [kalite] : ['lo', 'hi']) {
          const f = (kayit[q] || kayit.hi || kayit.lo)?.file;
          if (f && !dosyalar.has(f)) dosyalar.set(f, kalite ? null : q === 'lo' ? LO_MEDYA : HI_MEDYA);
        }
      };
      const sabitKalite = (s) => /quality:\s*['"](lo|hi)['"]/.exec(s || '')?.[1];
      for (const [, ad, secenek] of kod.matchAll(/loadAsset\(\s*['"](\w+)['"]\s*(?:,\s*\{([^}]*)\})?/g)) {
        const a = m.assets[ad];
        if (!a) continue;
        const surum = /version:\s*(\d+)/.exec(secenek || '')?.[1];
        ekle(surum && Number(surum) !== Number(a.version || 1) ? a.versions?.[surum] : a, sabitKalite(secenek));
      }
      for (const [, ad, secenek] of kod.matchAll(/loadEnv\(\s*['"](\w+)['"]\s*,[^,)]*(?:,\s*\{([^}]*)\})?/g)) {
        ekle(m.envs[ad], sabitKalite(secenek));
      }
      if (!dosyalar.size) return html;
      const link = (href, media) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href, ...(media && { media }) },
        injectTo: 'head',
      });
      return {
        html,
        tags: [
          link(`${base}lib3d/manifest.json`),
          ...[...dosyalar].map(([f, media]) => link(`${base}lib3d/${f}`, media)),
        ],
      };
    },
  };
}

// Yalnızca katalogda hazır işaretli presetler derlenir; yapımı süren klasörler yayını bozmasın.
const hazir = new Set(hazirPresetler().map((p) => p.id));
const presets = readdirSync(resolve(import.meta.dirname, 'presets')).filter(
  (p) => hazir.has(p) && existsSync(resolve(import.meta.dirname, 'presets', p, 'index.html'))
);

export default defineConfig({
  base: process.env.BASE_PATH || '/', // GitHub Pages: /<repo>/
  server: { host: true },
  plugins: [lib3dOnyukleme()],
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
