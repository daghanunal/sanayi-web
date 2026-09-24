// Vitrin ve saha kiti için önizlemeler üretir (sistemdeki Chrome ile):
//   public/onizleme/<id>.jpg   telefon ekranı (390×844 @2x çekilir, 540px genişliğe küçültülür)
//   public/onizleme/<id>.webm  ~5 sn mobil kaydırma klibi (VP9, düşük bit hızı, ≤ 400 KB hedef)
//   public/onizleme/<id>.mp4   aynı klip H.264 (ffmpeg varsa; eski iPhone'lar için)
//
// Önce derlenmiş siteyi yayınla:
//   BASE_PATH=/sanayi-web/ pnpm vite build --outDir /tmp/sanayi-onizleme --emptyOutDir
//   (yarım bir preset klasörü derlemeyi bozarsa: yalnız katalogda hazır presetleri alan ayrı bir --config ver)
//   BASE_PATH=/sanayi-web/ pnpm vite preview --outDir /tmp/sanayi-onizleme --port 4174 --strictPort
// Sonra:
//   node scripts/onizleme.mjs                 katalogdaki bütün hazır presetler (güncel olanlar atlanır)
//   node scripts/onizleme.mjs drift vernik    yalnız bunlar
//   --force  güncel olsa da yeniden üret     --no-video  yalnız jpg
//   --url http://localhost:4174/sanayi-web/  --jobs 2  --seconds 5
import { chromium } from 'playwright-core';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { hazirPresetler } from '../shared/katalog.js';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public/onizleme');
const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i > -1 ? args[i + 1] : d;
};
const force = args.includes('--force');
const video = !args.includes('--no-video');
const BASE = flag('url', 'http://localhost:4174/sanayi-web/').replace(/\/?$/, '/');
const JOBS = Number(flag('jobs', 2));
const SECONDS = Number(flag('seconds', 5));
const MAX_BYTES = 400 * 1024;
const valued = new Set(['--url', '--jobs', '--seconds']);
const ids = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));

const ffmpeg = spawnSync('which', ['ffmpeg']).status === 0;
if (!ffmpeg) console.log('ffmpeg yok: jpg doğrudan Chrome ile, klip Playwright kaydıyla yalnız webm.');

const hazir = hazirPresetler();
const hedef = ids.length ? hazir.filter((p) => ids.includes(p.id)) : hazir;
for (const id of ids) if (!hazir.some((p) => p.id === id)) console.log(`! ${id}: katalogda hazır değil, atlandı`);
mkdirSync(OUT, { recursive: true });

// Kaynağı (presets/<id>/**, data/<id>.json) çıktıdan yeniyse yeniden üret.
function newest(path) {
  if (!existsSync(path)) return 0;
  const st = statSync(path);
  if (!st.isDirectory()) return st.mtimeMs;
  return Math.max(st.mtimeMs, ...readdirSync(path).map((f) => newest(join(path, f))));
}
function guncel(id) {
  const src = Math.max(newest(join(ROOT, 'presets', id)), newest(join(ROOT, 'data', `${id}.json`)));
  const outs = [`${id}.jpg`, ...(video ? [`${id}.webm`, ...(ffmpeg ? [`${id}.mp4`] : [])] : [])];
  return outs.every((f) => existsSync(join(OUT, f)) && statSync(join(OUT, f)).mtimeMs > src);
}

const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
const kb = (f) => Math.round(statSync(f).size / 1024);

// Klip sıkıştırma: önce CRF ile dene, 400 KB'ı aşarsa kaliteyi düşür.
function encode(input, id) {
  const common = [...input, '-t', String(SECONDS), '-an', '-vf', 'fps=24,scale=360:-2:flags=lanczos'];
  const webm = join(OUT, `${id}.webm`);
  const mp4 = join(OUT, `${id}.mp4`);
  for (const crf of [42, 47, 52]) {
    ff([...common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-row-mt', '1',
      '-deadline', 'good', '-cpu-used', '3', '-pix_fmt', 'yuv420p', webm]);
    if (statSync(webm).size <= MAX_BYTES) break;
  }
  for (const crf of [29, 33, 37]) {
    ff([...common, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'main',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
    if (statSync(mp4).size <= MAX_BYTES) break;
  }
  return `webm ${kb(webm)} KB, mp4 ${kb(mp4)} KB`;
}

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const HIDE = '.action-bar, .vitrin-bar { display: none !important; }';

async function ac(page, id) {
  const res = await page.goto(`${BASE}presets/${id}/`, { waitUntil: 'networkidle', timeout: 60000 });
  if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
  if (!(await page.evaluate(() => location.pathname.includes('/presets/')))) throw new Error('preset bulunamadı');
  await page.addStyleTag({ content: HIDE });
  await page.waitForTimeout(2600); // giriş animasyonu otursun
}

async function thumbnail(id) {
  const ctx = await browser.newContext({ ...MOBIL, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await ac(page, id);
    const jpg = join(OUT, `${id}.jpg`);
    if (ffmpeg) {
      const png = join(tmpdir(), `onizleme-${id}.png`);
      await page.screenshot({ path: png });
      ff(['-i', png, '-vf', 'scale=540:-2:flags=lanczos', '-q:v', '5', jpg]);
      rmSync(png, { force: true });
    } else {
      await page.screenshot({ path: jpg, type: 'jpeg', quality: 72 });
    }
    return `jpg ${kb(jpg)} KB`;
  } finally {
    await ctx.close();
  }
}

// Kaydırma: 0,6 sn açılışta dur, sonra ilk ~5 ekranı yumuşakça kaydır.
const kaydir = (page) =>
  page.evaluate(async (ms) => {
    const total = Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 5);
    const to = (y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y));
    await new Promise((r) => setTimeout(r, 600));
    const t = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        const k = Math.min(1, (now - t) / (ms - 600));
        to(total * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
        k < 1 ? requestAnimationFrame(step) : done();
      };
      requestAnimationFrame(step);
    });
  }, SECONDS * 1000);

// ffmpeg varsa: CDP ekran yayınından kareleri al, zaman damgalarıyla birleştir, sıkıştır.
async function clip(id) {
  const dir = join(tmpdir(), `onizleme-kare-${id}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ ...MOBIL, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  try {
    await ac(page, id);
    const cdp = await ctx.newCDPSession(page);
    const kareler = [];
    cdp.on('Page.screencastFrame', (f) => {
      const file = join(dir, `${String(kareler.length).padStart(4, '0')}.jpg`);
      writeFileSync(file, Buffer.from(f.data, 'base64'));
      kareler.push({ file, t: f.metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 390, maxHeight: 844 });
    await page.waitForTimeout(150);
    await kaydir(page);
    await page.waitForTimeout(400);
    await cdp.send('Page.stopScreencast');
    if (kareler.length < 5) throw new Error(`yalnız ${kareler.length} kare yakalandı`);
    // concat listesi: her kare bir sonrakine kadar ekranda kalır.
    const list = kareler.map((k, i) => {
      const d = i < kareler.length - 1 ? kareler[i + 1].t - k.t : 1 / 24;
      return `file '${k.file}'\nduration ${Math.max(d, 0.001).toFixed(4)}`;
    });
    list.push(`file '${kareler.at(-1).file}'`);
    const txt = join(dir, 'list.txt');
    writeFileSync(txt, list.join('\n'));
    return encode(['-f', 'concat', '-safe', '0', '-i', txt], id) + `, ${kareler.length} kare`;
  } finally {
    await ctx.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

// ffmpeg yoksa: Playwright'ın kendi kaydı (webm). Gerekirse: npx playwright-core install ffmpeg
async function clipPlaywright(id) {
  const dir = join(tmpdir(), `onizleme-video-${id}`);
  rmSync(dir, { recursive: true, force: true });
  const ctx = await browser.newContext({ ...MOBIL, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 390, height: 844 } } });
  const page = await ctx.newPage();
  try {
    await ac(page, id);
    await kaydir(page);
  } finally {
    await ctx.close();
  }
  const webm = join(OUT, `${id}.webm`);
  copyFileSync(await page.video().path(), webm);
  rmSync(dir, { recursive: true, force: true });
  return `webm ${kb(webm)} KB (sıkıştırılmadı, açılış dahil)`;
}

const kuyruk = hedef.filter((p) => force || !guncel(p.id));
console.log(`${hedef.length} preset, ${kuyruk.length} tanesi üretilecek (${JOBS} paralel).`);
let hata = 0;
async function isci() {
  for (let p; (p = kuyruk.shift()); ) {
    try {
      const parts = [await thumbnail(p.id)];
      if (video) parts.push(await (ffmpeg ? clip(p.id) : clipPlaywright(p.id)));
      console.log(`✓ ${p.id}: ${parts.join(', ')}`);
    } catch (e) {
      hata++;
      console.log(`✗ ${p.id}: ${e.message.split('\n')[0]}`);
    }
  }
}
await Promise.all(Array.from({ length: JOBS }, isci));
await browser.close();
if (hata) process.exitCode = 1;
