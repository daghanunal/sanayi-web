// Scroll ederek ekran görüntüsü alır (sistemdeki Chrome ile).
// Kullanım: node scripts/shoot.mjs <url> <çıktı-klasörü> [--mobile] [--steps 10]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [url, out = 'shots'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const mobile = process.argv.includes('--mobile');
const stepsArg = process.argv.indexOf('--steps');
const steps = stepsArg > -1 ? Number(process.argv[stepsArg + 1]) : 10;
if (!url) {
  console.error('Kullanım: node scripts/shoot.mjs <url> <klasör> [--mobile] [--steps N]');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } }
);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const prefix = mobile ? 'm' : 'd';
for (let i = 0; i <= steps; i++) {
  const y = Math.round((total * i) / steps);
  await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y)), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${prefix}-${String(i).padStart(2, '0')}.png` });
}
console.log(`${steps + 1} görüntü → ${out} (sayfa yüksekliği ${total + (mobile ? 844 : 900)}px)`);
if (errors.length) console.log('Konsol hataları:\n' + errors.join('\n'));
await browser.close();
