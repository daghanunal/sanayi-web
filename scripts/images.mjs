// Stok görsel bulma ve indirme.
//
// Ara (Openverse, ticari kullanıma açık lisanslar) ve numaralı kontakt sayfası üret:
//   node scripts/images.mjs search "car paint booth" <klasör> [--n 24]
//   → <klasör>/candidates.json ve <klasör>/sheet.png
//
// Seçileni indir, en fazla 2000px genişliğe küçült, JPEG kaydet:
//   node scripts/images.mjs pick <klasör> <no> <hedef.jpg>
//
// Doğrudan URL'den indir (ör. images.unsplash.com/photo-...):
//   node scripts/images.mjs get <url> <hedef.jpg>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const [cmd, ...args] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
const flag = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const tmp = dest + '.tmp';
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '2000', tmp, '--out', dest], { stdio: 'ignore' });
  execFileSync('rm', [tmp]);
  const info = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', dest]).toString();
  console.log(`✓ ${dest} ${info.match(/\d+/g).slice(-2).join('×')}`);
}

if (cmd === 'search') {
  const [query, dir] = args;
  const n = Number(flag('n', 24));
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&page_size=${n}&size=large`;
  const data = await (await fetch(url)).json();
  const results = (data.results || []).map((r, i) => ({
    no: i + 1, title: r.title, url: r.url, thumb: r.thumbnail, w: r.width, h: r.height,
    license: `${r.license} ${r.license_version || ''}`.trim(), creator: r.creator, source: r.foreign_landing_url,
  }));
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/candidates.json`, JSON.stringify(results, null, 2));
  const html = `<body style="margin:0;background:#222;font:14px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:4px">
    ${results.map((r) => `<div style="position:relative"><img loading="eager" src="${r.url}" onerror="this.src='${r.thumb}'" style="width:100%;height:160px;object-fit:cover"><b style="position:absolute;top:2px;left:2px;background:#e00;padding:2px 6px">${r.no}</b><span style="position:absolute;bottom:2px;left:2px;background:#000a;padding:1px 4px;font-size:11px">${r.w}×${r.h}</span></div>`).join('')}</body>`;
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 400 } });
  await page.setContent(html, { waitUntil: 'load', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/sheet.png`, fullPage: true });
  await browser.close();
  console.log(`${results.length} aday → ${dir}/sheet.png`);
} else if (cmd === 'pick') {
  const [dir, no, dest] = args;
  const r = JSON.parse(readFileSync(`${dir}/candidates.json`)).find((c) => c.no === Number(no));
  await download(r.url, dest);
  const credits = `${dirname(dest)}/CREDITS.txt`;
  let prev = '';
  try { prev = readFileSync(credits, 'utf8'); } catch {}
  writeFileSync(credits, prev + `${dest.split('/').pop()}: "${r.title}" — ${r.creator}, ${r.license}, ${r.source}\n`);
} else if (cmd === 'get') {
  const [url, dest] = args;
  await download(url, dest);
} else {
  console.log('Komutlar: search <sorgu> <klasör> | pick <klasör> <no> <hedef> | get <url> <hedef>');
}
