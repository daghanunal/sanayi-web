// Orta seviye Android'i taklit ederek (390px, CPU 4x yavaş) sayfayı baştan sona kaydırır
// ve kare sürelerini ölçer.
// Kullanım: node scripts/perf.mjs <url> [--cpu 4] [--seconds 12]
import { chromium } from 'playwright-core';

const url = process.argv[2];
const flag = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? Number(process.argv[i + 1]) : d;
};
const cpu = flag('cpu', 4);
const seconds = flag('seconds', 12);
if (!url) {
  console.error('Kullanım: node scripts/perf.mjs <url> [--cpu 4] [--seconds 12]');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const result = await page.evaluate(async (ms) => {
  const frames = [];
  let last = performance.now();
  let running = true;
  const tick = (t) => {
    frames.push(t - last);
    last = t;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const total = document.documentElement.scrollHeight - innerHeight;
  const start = performance.now();
  await new Promise((done) => {
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      const y = total * p;
      window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
      if (p < 1) requestAnimationFrame(step);
      else done();
    };
    step();
  });
  running = false;
  frames.shift();
  const sorted = [...frames].sort((a, b) => a - b);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  return {
    frames: frames.length,
    avgFps: Math.round(1000 / avg),
    p95ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
    over50ms: frames.filter((f) => f > 50).length,
    pageHeight: total + innerHeight,
  };
}, seconds * 1000);

console.log(`CPU ${cpu}x yavaş, ${seconds} sn kaydırma:`, result);
console.log(result.avgFps >= 45 && result.p95ms <= 40 ? 'SONUÇ: akıcı' : 'SONUÇ: takılıyor, optimize et');
await browser.close();
