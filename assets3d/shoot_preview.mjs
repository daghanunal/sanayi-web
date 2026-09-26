// Playwright screenshots of the lib3d preview page (system Chrome, like scripts/shoot.mjs).
// usage: node assets3d/shoot_preview.mjs <out-dir> "<query>" ["<query>" ...] [--mobile] [--base http://localhost:5401]
//        [--eval "<js run after load; window.__lib3d.cur = the loaded asset>"]
//   node assets3d/shoot_preview.mjs /tmp/shots "asset=car&q=hi&az=35" "asset=car&q=lo&az=-30"
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const bi = args.indexOf('--base');
const base = bi > -1 ? args[bi + 1] : 'http://localhost:5401';
const ei = args.indexOf('--eval');
const evalJs = ei > -1 ? args[ei + 1] : null;
const rest = args.filter((a, i) => !a.startsWith('--') && (bi < 0 || i !== bi + 1) && (ei < 0 || i !== ei + 1));
const [out, ...queries] = rest;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(
  mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } }
);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const q of queries) {
  const url = `${base}/assets3d/preview/?ui=0&spin=0&${q}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  if (evalJs) await page.evaluate(evalJs);
  await page.waitForTimeout(500);
  const name = q.replace(/[&=]/g, '_').replace(/[^a-z0-9_.-]/gi, '') + (mobile ? '_m' : '') + (evalJs ? '_eval' : '');
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', `${out}/${name}.png`);
}
if (errors.length) console.log('console errors:\n' + errors.join('\n'));
await browser.close();
