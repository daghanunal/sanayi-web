// Mobil UX denetimi: "kaydırma ve menüler üst üste biniyor" sınıfı hataları ölçer.
// Her preset için 390×844 ve 360×740 (isMobile, hasTouch), ?vitrin=1 ile ve onsuz sayfayı
// adım adım kaydırır; her adımda sabit/yapışkan katmanları, çakışmaları, örtülen ve kırpılan
// metni, küçük/çakışan dokunma hedeflerini ölçer. Ayrıca uzun pin'leri, kaydırmayı kilitleyen
// girişleri, konsol hatalarını ve 404'leri toplar. Çıktı: JSON + HTML/Markdown rapor + kırpılmış
// ve kutuları çizilmiş ekran görüntüleri.
//
// Önce üretim derlemesi ve önizleme:
//   BASE_PATH=/sanayi-web/ pnpm build
//   BASE_PATH=/sanayi-web/ pnpm vite preview --port 4175 --strictPort &
// Kullanım:
//   node scripts/ux-audit.mjs [id ...] [--tag before] [--conc 6] [--base http://localhost:4175/sanayi-web]
//        [--vp 390x844,360x740] [--modes plain,vitrin] [--max-steps 36] [--pin-screens 3]
//        [--no-shots] [--compare before]        # yalnızca rapor: --compare <eski-tag> ile fark
//   node scripts/ux-audit.mjs --report-only --tag after --compare before
// Çıktı: .shots/ux-audit/<tag>/{results.json,report.html,report.md,shots/}
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hazirPresetler, PRESETS } from '../shared/katalog.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (n) => argv.includes(`--${n}`);
const VALUED = new Set(['tag', 'conc', 'base', 'vp', 'modes', 'max-steps', 'pin-screens', 'compare', 'wait', 'timeout']);
const ids = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUED.has(argv[i - 1].slice(2))));

const OPT = {
  tag: flag('tag', 'latest'),
  conc: Number(flag('conc', 6)),
  base: flag('base', 'http://localhost:4175/sanayi-web').replace(/\/$/, ''),
  vps: flag('vp', '390x844,360x740').split(',').map((s) => s.split('x').map(Number)),
  modes: flag('modes', 'plain,vitrin').split(','),
  maxSteps: Number(flag('max-steps', 36)),
  pinScreens: Number(flag('pin-screens', 3)),
  wait: Number(flag('wait', 450)),
  timeout: Number(flag('timeout', 150000)),
  shots: !has('no-shots'),
  compare: flag('compare', null),
  reportOnly: has('report-only'),
};
const OUT = resolve(ROOT, '.shots/ux-audit', OPT.tag);
const SHOTS = resolve(OUT, 'shots');
const grupOf = Object.fromEntries(PRESETS.map((p) => [p.id, p.grup]));

// --- Ağırlıklar ------------------------------------------------------------
// Her benzersiz sorun (tip + öğe [+ diğer öğe]) bir görev (preset × ekran × mod) içinde bir kez sayılır.
const ISSUE = {
  'intro-block': { w: 10, cap: 1, sev: 'high', label: 'Giriş/perde kaydırmayı 3 sn\'den uzun kilitliyor' },
  'scroll-stuck': { w: 10, cap: 1, sev: 'high', label: 'Kaydırma hedefe gitmiyor (sayfa kilitli)' },
  'h-overflow': { w: 15, cap: 1, sev: 'high', label: 'Yatay taşma (sayfa yana kayıyor)' },
  'tap-blocked-invisible': { w: 10, cap: 3, sev: 'high', label: 'Görünmez katman dokunmayı yutuyor' },
  'text-covered-anchored': { w: 8, cap: 8, sev: 'high', label: 'Sabit/pinli metin başka bir katmanın altında' },
  'tap-blocked': { w: 6, cap: 6, sev: 'high', label: 'Buton başka bir katmanın altında (dokunulamıyor)' },
  'text-covered-end': { w: 6, cap: 6, sev: 'high', label: 'Sayfa sonunda metin alt çubuğun altında kalıyor' },
  'label-collision': { w: 6, cap: 8, sev: 'high', label: 'İki sabit katmanın yazıları çakışıyor' },
  'text-overlap': { w: 4, cap: 6, sev: 'high', label: 'Yazılar üst üste biniyor' },
  'layer-overlap-bar': { w: 4, cap: 8, sev: 'med', label: 'Kart/etiket üst ya da alt çubuğun altına giriyor' },
  'console-error': { w: 5, cap: 4, sev: 'med', label: 'Konsol hatası' },
  'http-error': { w: 5, cap: 4, sev: 'med', label: 'HTTP 4xx/5xx (site içi)' },
  'text-offscreen': { w: 4, cap: 6, sev: 'med', label: 'Metin ekran kenarından taşıyor' },
  'text-clipped': { w: 3, cap: 8, sev: 'med', label: 'Metin overflow ile kırpılıyor' },
  'tap-blocked-other': { w: 3, cap: 5, sev: 'med', label: 'Buton akıştaki bir öğenin altında' },
  'tap-overlap': { w: 3, cap: 6, sev: 'med', label: 'Dokunma hedefleri üst üste' },
  'sheet-tall': { w: 3, cap: 4, sev: 'med', label: 'Hikâye kartı ekranın %40\'ından yüksek' },
  stack: { w: 0, cap: 1, sev: 'med', label: 'Aynı anda 2\'den fazla sabit katman (ya da 2 üst/2 alt)' },
  'pin-long': { w: 0, cap: 4, sev: 'med', label: `Pinli bölüm ${OPT.pinScreens} ekrandan uzun` },
  'layer-overlap': { w: 2, cap: 6, sev: 'low', label: 'Sabit katmanlar üst üste' },
  'text-covered-stacked': { w: 1, cap: 4, sev: 'low', label: 'Kart destesi: alttaki kart tamamen örtülü' },
  'http-error-ext': { w: 1, cap: 3, sev: 'low', label: 'HTTP 4xx/5xx (dış kaynak)' },
  'tap-small': { w: 0.5, cap: 16, sev: 'low', label: 'Birincil dokunma hedefi 44px\'ten küçük' },
  'text-covered-flow': { w: 0.25, cap: 20, sev: 'info', label: 'Akan metin geçici olarak alt/orta katmanın altında' },
};

// Görev skoru: benzersiz sorun ağırlıkları + yapısal metrikler.
function scoreTask(t) {
  const by = {};
  for (const is of t.issues) (by[is.type] ??= []).push(is);
  let s = 0;
  const parts = {};
  for (const [type, list] of Object.entries(by)) {
    const def = ISSUE[type];
    if (!def) continue;
    let v = 0;
    if (type === 'stack') v = 8 * (list[0].frac || 0) + 2 * Math.max(0, (list[0].max || 0) - 2);
    else if (type === 'pin-long') v = list.slice(0, def.cap).reduce((a, i) => a + Math.min(16, 2 * (i.screens - OPT.pinScreens)), 0);
    else if (type === 'intro-block') v = 10 + 2 * Math.max(0, (list[0].ms - 3000) / 1000);
    else v = Math.min(list.length, def.cap) * def.w;
    parts[type] = +v.toFixed(2);
    s += v;
  }
  return { score: +s.toFixed(2), parts };
}

// --- Sayfa içi analiz ------------------------------------------------------
// page.evaluate ile her adımda çalışır. Dönen kutular görünüm (viewport) koordinatındadır.
function uxAnalyze(o) {
  const vw = innerWidth, vh = innerHeight, vpA = vw * vh;
  const VP = { left: 0, top: 0, right: vw, bottom: vh };
  const csMap = new Map();
  const cs = (el) => { let s = csMap.get(el); if (!s) { s = getComputedStyle(el); csMap.set(el, s); } return s; };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const P = (r) => ({ left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) });
  const clampR = (r) => ({ left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(vw, r.right), bottom: Math.min(vh, r.bottom) });
  const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);
  const opMap = new Map();
  const opacityOf = (el) => {
    if (!el || el.nodeType !== 1) return 1;
    if (opMap.has(el)) return opMap.get(el);
    const s = cs(el);
    let v = s.display === 'none' ? 0 : parseFloat(s.opacity) * opacityOf(el.parentElement);
    opMap.set(el, v);
    return v;
  };
  const visible = (el) => cs(el).visibility !== 'hidden' && opacityOf(el) >= 0.08;
  const STATE = /^(is-|has-|js-|active$|visible$|in-view|on$|open$|show|hidden$|done$|current$|lit$|solid$|scrolled$|stuck$)/;
  const nm = (e) => { const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter((x) => x && !STATE.test(x)).slice(0, 2) : []; return e.tagName.toLowerCase() + (e.id ? '#' + e.id : c.length ? '.' + c.join('.') : ''); };
  const key = (el) => { const parts = []; let e = el; for (let i = 0; i < 3 && e && e !== document.body && e !== document.documentElement; i++) { parts.unshift(nm(e)); if (e.id) break; e = e.parentElement; } return parts.join('>'); };
  const alpha = (c) => { if (!c || c === 'transparent') return 0; const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) * (p[3].includes('%') ? 0.01 : 1) : 1; };
  const REPLACED = /^(IMG|SVG|CANVAS|VIDEO|IFRAME|INPUT|PICTURE|svg)$/;
  const paints = (e) => { const s = cs(e); return REPLACED.test(e.tagName) || alpha(s.backgroundColor) >= 0.35 || s.backgroundImage !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none'); };
  const snippet = (el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const ariaHidden = (el) => !!el.closest('[aria-hidden="true"],.sr-only');
  const ownTextNodes = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim().length >= 2);
  const lineRects = (el, max = 8) => {
    const out = [];
    for (const n of ownTextNodes(el)) {
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) { if (r.width > 1 && r.height > 1) out.push(r); if (out.length >= max) return out; }
    }
    return out;
  };
  const union = (rs) => rs.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });

  const all = [...document.body.querySelectorAll('*')].filter((e) => e.id !== '__uxbox' && !e.closest('#__uxbox'));
  const layers = [], stages = [];
  const inLayer = (el) => layers.find((l) => l.el.contains(el));
  const zoneOf = (r) => { const c = clampR(r); if (c.top <= vh * 0.2 && c.bottom <= vh * 0.5) return 'top'; if (c.bottom >= vh * 0.8 && c.top >= vh * 0.5) return 'bottom'; return 'middle'; };
  const accept = (el) => (el.textContent || '').trim().length >= 2 || el.matches('a[href],button,[role=button]') || !!el.querySelector('a[href],button');
  const addLayer = (el, r, how) => {
    const zone = zoneOf(r);
    const kind = el.matches('.action-bar,.vitrin-bar') ? 'bar' : zone === 'top' && (r.right - r.left) >= vw * 0.7 ? 'header' : zone === 'bottom' && (r.right - r.left) >= vw * 0.7 ? 'bottombar' : 'overlay';
    layers.push({ el, r, how, zone, kind, key: key(el), text: snippet(el).slice(0, 40) });
  };
  const isStuck = (el, s, r) => {
    const p = el.parentElement; if (!p) return false;
    const pr = p.getBoundingClientRect();
    if (s.top !== 'auto' && !s.top.endsWith('%')) { const t = parseFloat(s.top); if (Math.abs(r.top - t) < 2 && pr.top < r.top - 1) return true; }
    if (s.bottom !== 'auto' && !s.bottom.endsWith('%')) { const b = parseFloat(s.bottom); if (Math.abs(vh - r.bottom - b) < 2 && pr.bottom > r.bottom + 1) return true; }
    return false;
  };

  // 1) Sabit/yapışkan katmanlar ve tam ekran sahneler
  for (const el of all) {
    const s = cs(el); const pos = s.position;
    if (pos !== 'fixed' && pos !== 'sticky') continue;
    if (inLayer(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (pos === 'sticky' && !isStuck(el, s, r)) continue;
    const vis = inter(r, VP); if (vis < 64) continue;
    if (!visible(el)) continue;
    if (vis >= 0.6 * vpA || (r.height >= 0.85 * vh && r.width >= 0.9 * vw)) { stages.push({ el, r }); continue; }
    if (s.pointerEvents === 'none' && !(el.textContent || '').trim()) continue; // süs
    if (accept(el)) addLayer(el, r, pos);
  }
  // Sahnelerin içindeki konumlanmış kartlar/etiketler (hikâye kartları, HUD yazıları)
  const descend = (root, depth) => {
    if (depth > 14) return;
    for (const c of root.children) {
      if (c.id === '__uxbox') continue;
      const s = cs(c);
      if (s.display === 'none' || opacityOf(c) < 0.08) continue;
      if (/^(absolute|fixed|sticky)$/.test(s.position) && !inLayer(c)) {
        const r = c.getBoundingClientRect(); const a = inter(r, VP);
        if (a >= 64 && a < 0.6 * vpA && r.width >= 8 && r.height >= 8 && s.visibility !== 'hidden') {
          if (accept(c)) { addLayer(c, r, 'stage'); continue; }
        }
      }
      descend(c, depth + 1);
    }
  };
  for (const st of stages) descend(st.el, 0);
  const anchored = (el) => !!(inLayer(el) || stages.some((s) => s.el.contains(el)));

  const issues = [];
  const push = (type, el, extra = {}) => issues.push({ type, key: el ? key(el) : '', text: el ? snippet(el) : '', ...extra });

  // 2) Katman sayısı, bölgeler, kaplanan alan
  const zc = { top: 0, bottom: 0, middle: 0 };
  for (const l of layers) zc[l.zone]++;
  let covered = 0;
  { const G = 10; for (let y = G / 2; y < vh; y += G) for (let x = G / 2; x < vw; x += G) if (layers.some((l) => x >= l.r.left && x <= l.r.right && y >= l.r.top && y <= l.r.bottom)) covered++; covered = covered / (Math.ceil(vw / G) * Math.ceil(vh / G)); }
  const stackBad = layers.length > 3 || zc.top > 1 || zc.bottom > 1;

  // Kart yüksekliği sözleşmesi: alt/orta hikâye kartları ≤ %40
  for (const l of layers) {
    const h = Math.min(vh, l.r.bottom) - Math.max(0, l.r.top);
    if (l.kind !== 'header' && l.zone !== 'top' && h > 0.4 * vh && (l.el.textContent || '').trim().length > 20) push('sheet-tall', l.el, { box: P(l.r), h: Math.round(h), pct: Math.round((100 * h) / vh) });
  }

  // 3) Katman çakışmaları
  for (let i = 0; i < layers.length; i++) for (let j = i + 1; j < layers.length; j++) {
    const A = layers[i], B = layers[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const a = inter(A.r, B.r);
    if (a < 300 || a < 0.05 * Math.min(area(A.r), area(B.r))) continue;
    const la = [...A.el.querySelectorAll('*'), A.el].flatMap((e) => lineRects(e, 4)).slice(0, 40);
    const lb = [...B.el.querySelectorAll('*'), B.el].flatMap((e) => lineRects(e, 4)).slice(0, 40);
    const coll = la.some((x) => lb.some((y) => inter(x, y) > 20));
    const barish = (L) => L.kind === 'bar' || L.kind === 'header' || L.kind === 'bottombar';
    const type = coll ? 'label-collision' : barish(A) !== barish(B) ? 'layer-overlap-bar' : 'layer-overlap';
    const [X, Y] = barish(A) ? [B, A] : [A, B];
    issues.push({ type, key: X.key, other: Y.key, text: X.text, otherText: Y.text, box: P(X.r), box2: P(Y.r), area: Math.round(a) });
  }

  // 4) Metin öğeleri
  const texts = [];
  for (const el of all) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName) || el.closest('svg')) continue;
    if (!ownTextNodes(el).length) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !inter(r, VP)) continue;
    if (!visible(el) || opacityOf(el) < 0.2 || ariaHidden(el)) continue;
    const lines = lineRects(el);
    if (!lines.length) continue;
    texts.push({ el, r, lines, tr: union(lines) });
    if (texts.length >= 500) break;
  }
  const atEnd = o.atEnd;

  // 4a) Kırpılma: ekran kenarı ve overflow
  const trackLike = (el) => { for (let e = el.parentElement, i = 0; e && e !== document.body && i < 12; e = e.parentElement, i++) { const s = cs(e); if (/auto|scroll/.test(s.overflowX)) return true; const r = e.getBoundingClientRect(); if (r.width > vw * 1.25) return true; if (e.scrollWidth > e.clientWidth * 1.25 + 8) return true; if (s.whiteSpace === 'nowrap' && /marquee|ticker|track|band|serit|kayan|loop/i.test(e.className)) return true; } return false; };
  for (const t of texts) {
    const tr = t.tr;
    const edge = (tr.left < -2 && tr.right > 8) || (tr.right > vw + 2 && tr.left < vw - 8);
    if (edge && !trackLike(t.el)) { push('text-offscreen', t.el, { box: P(tr), over: Math.round(Math.max(-tr.left, tr.right - vw)) }); continue; }
    let n = 0;
    for (let e = t.el, i = 0; e && e !== document.body && i < 10 && n < 2; e = e.parentElement, i++) {
      const s = cs(e);
      const cx = /hidden|clip/.test(s.overflowX), cy = /hidden|clip/.test(s.overflowY);
      if (/auto|scroll/.test(s.overflowX) || /auto|scroll/.test(s.overflowY)) break;
      if (!cx && !cy) continue;
      n++;
      if (e === t.el && (s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none')) break;
      const ar = e.getBoundingClientRect();
      if (ar.width > vw * 1.25 || trackLike(t.el)) break;
      const outX = cx && (tr.left < ar.left - 3 || tr.right > ar.right + 3);
      const outY = cy && (tr.top < ar.top - 3 || tr.bottom > ar.bottom + 3);
      if (!outX && !outY) continue;
      const vis = inter(tr, ar) / Math.max(1, area(tr));
      if (vis > 0.05 && vis < 0.97) { push('text-clipped', t.el, { box: P(tr), box2: P(ar), clipper: key(e), vis: Math.round(vis * 100) }); break; }
    }
  }

  // 4b) Yazı-yazı çakışması (etiketler, başlıklar)
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const A = texts[i], B = texts[j];
    if (!inter(A.tr, B.tr)) continue;
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    if (inLayer(A.el) !== inLayer(B.el) || anchored(A.el) !== anchored(B.el)) continue; // katmanlar arası: label-collision / text-covered
    let hit = false;
    for (const x of A.lines) { for (const y of B.lines) { const a = inter(x, y); if (a > 30 && a > 0.3 * Math.min(area(x), area(y))) { hit = true; break; } } if (hit) break; }
    if (!hit) continue;
    const [X, Y] = area(A.tr) <= area(B.tr) ? [A, B] : [B, A];
    push('text-overlap', X.el, { box: P(X.tr), other: key(Y.el), box2: P(Y.tr), otherText: snippet(Y.el), anch: anchored(X.el) });
  }

  // 5) Dokunma hedefleri (gerçek pointer-events ile)
  const taps = [];
  for (const el of document.querySelectorAll('a[href],button,[role=button],input:not([type=hidden]),select,textarea,summary')) {
    if (el.closest('#__uxbox')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.top < 0 || r.bottom > vh || r.left < -1 || r.right > vw + 1) continue;
    const s = cs(el);
    if (s.pointerEvents === 'none' || !visible(el) || opacityOf(el) < 0.2 || ariaHidden(el)) continue;
    const par = el.parentElement;
    const inline = s.display === 'inline' && par && (par.textContent || '').trim().length > (el.textContent || '').trim().length + 10;
    taps.push({ el, r, inline });
  }
  for (const t of taps) {
    if (!t.inline && (t.r.height < 43.5 || t.r.width < 43.5)) push('tap-small', t.el, { box: P(t.r), w: Math.round(t.r.width), h: Math.round(t.r.height), anch: anchored(t.el) });
    const cx = (t.r.left + t.r.right) / 2, cy = (t.r.top + t.r.bottom) / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || hit === t.el || t.el.contains(hit) || hit.contains(t.el) || hit.closest('#__uxbox')) continue;
    const L = inLayer(hit);
    if (L && !L.el.contains(t.el)) {
      if (anchored(t.el) || (atEnd && L.zone !== 'top')) push('tap-blocked', t.el, { box: P(t.r), other: L.key, box2: P(L.r), otherText: L.text });
    } else if (!L) {
      const hs = cs(hit);
      const inv = opacityOf(hit) < 0.05 || (hs.position === 'fixed' && !paints(hit) && !(hit.textContent || '').trim());
      const st = stages.find((s) => s.el.contains(hit) && !s.el.contains(t.el));
      if (inv || st) push('tap-blocked-invisible', t.el, { box: P(t.r), other: key(hit), box2: P(hit.getBoundingClientRect()) });
      else if (!hit.closest('a,button,label')) push('tap-blocked-other', t.el, { box: P(t.r), other: key(hit), box2: P(hit.getBoundingClientRect()) });
    }
  }
  const prim = taps.filter((t) => !t.inline);
  for (let i = 0; i < prim.length; i++) for (let j = i + 1; j < prim.length; j++) {
    const A = prim[i], B = prim[j];
    if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    if (anchored(A.el) !== anchored(B.el) || inLayer(A.el) !== inLayer(B.el)) continue; // katman-akış örtmesi tap-blocked'ta
    if (inter(A.r, B.r) >= 16) push('tap-overlap', A.el, { box: P(A.r), other: key(B.el), box2: P(B.r), otherText: snippet(B.el) });
  }

  // 6) Örtülen metin (pointer-events geçici olarak açık: HUD etiketleri de görünsün)
  const pe = document.createElement('style'); pe.id = '__uxpe'; pe.textContent = '*{pointer-events:auto!important}';
  document.head.append(pe);
  const paintsAt = (e, stop, x, y) => {
    for (let n = e; n && n !== stop.parentElement; n = n.parentElement) {
      if (paints(n)) return true;
      if (lineRects(n, 6).some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return true;
      if (n === stop) break;
    }
    return false;
  };
  for (const t of texts) {
    const own = inLayer(t.el);
    const pts = [];
    for (const lr of t.lines.slice(0, 3)) {
      const c = clampR(lr); if (c.bottom - c.top < 4 || c.right - c.left < 4) continue;
      const y = (c.top + c.bottom) / 2;
      for (const f of [0.15, 0.5, 0.85]) pts.push([c.left + (c.right - c.left) * f, y]);
    }
    if (!pts.length) continue;
    let valid = 0, occ = 0; const by = new Map();
    for (const [x, y] of pts) {
      const stack = document.elementsFromPoint(x, y);
      const idx = stack.findIndex((e) => e === t.el || t.el.contains(e));
      if (idx === -1) continue;
      valid++;
      for (const e of stack.slice(0, idx)) {
        if (e.id === '__uxpe') continue;
        const L = inLayer(e);
        if (!L || L.el.contains(t.el) || L === own) continue;
        if (paintsAt(e, L.el, x, y)) { occ++; by.set(L, (by.get(L) || 0) + 1); break; }
      }
    }
    if (!valid || occ / valid < 0.34) continue;
    const L = [...by.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const frac = occ / valid;
    const extra = { box: P(t.tr), other: L.key, box2: P(L.r), otherText: L.text, zone: L.zone, pct: Math.round(frac * 100) };
    if (anchored(t.el)) {
      const sameStage = own && L.how === 'stage' && own.how === 'stage' && stages.some((s) => s.el.contains(own.el) && s.el.contains(L.el));
      push(sameStage && frac >= 0.9 ? 'text-covered-stacked' : 'text-covered-anchored', t.el, extra);
    } else if (atEnd && L.zone !== 'top') push('text-covered-end', t.el, extra);
    else if (L.zone !== 'top') push('text-covered-flow', t.el, extra);
  }
  pe.remove();

  const sw = Math.max(document.documentElement.scrollWidth, innerWidth > o.vw ? innerWidth : 0);
  return {
    y: Math.round(scrollY),
    layers: layers.map((l) => ({ key: l.key, zone: l.zone, kind: l.kind, how: l.how, box: P(l.r), text: l.text })),
    stages: stages.map((s) => key(s.el)),
    zones: zc, stackBad, covered: +covered.toFixed(3), sw, issues,
  };
}

// Pin uzunlukları: GSAP pin-spacer ve ekran boyu yapışkan sahneler.
function uxPins() {
  const vh = innerHeight, out = [];
  const STATE = /^(is-|has-|js-|active$|visible$|in-view|on$|open$|show|hidden$|done$|current$|lit$|solid$|scrolled$|stuck$)/;
  const nm = (e) => { const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter((x) => x && !STATE.test(x)).slice(0, 2) : []; return e.tagName.toLowerCase() + (e.id ? '#' + e.id : c.length ? '.' + c.join('.') : ''); };
  const key = (el) => { const parts = []; let e = el; for (let i = 0; i < 3 && e && e !== document.body; i++) { parts.unshift(nm(e)); if (e.id) break; e = e.parentElement; } return parts.join('>'); };
  document.querySelectorAll('.pin-spacer').forEach((sp) => {
    const c = sp.firstElementChild;
    const d = sp.offsetHeight - (c ? c.offsetHeight : 0);
    if (d > 0) out.push({ key: key(c || sp), screens: +(d / vh).toFixed(2), kind: 'gsap' });
  });
  for (const el of document.body.querySelectorAll('*')) {
    if (getComputedStyle(el).position !== 'sticky') continue;
    const h = el.offsetHeight; if (h < 0.7 * vh || !el.parentElement) continue;
    const d = el.parentElement.offsetHeight - h;
    if (d > 0) out.push({ key: key(el), screens: +(d / vh).toFixed(2), kind: 'sticky' });
  }
  return { pins: out, pageScreens: +(document.documentElement.scrollHeight / vh).toFixed(1) };
}

// Giriş perdesi / kaydırma kilidi durumu (yükleme sırasında yoklanır).
function uxIntro() {
  const vw = innerWidth, vh = innerHeight, html = document.documentElement, body = document.body;
  if (!body) return { t: 0, blocked: true, why: 'no-body' };
  const hs = getComputedStyle(html), bs = getComputedStyle(body);
  const tall = html.scrollHeight > vh + 100;
  const locked = html.classList.contains('lenis-stopped') || /hidden/.test(hs.overflowY) || /hidden/.test(bs.overflowY);
  let overlay = null;
  for (const el of body.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' || s.visibility === 'hidden' || s.display === 'none') continue;
    const z = parseInt(s.zIndex) || 0; if (z < 50) continue;
    const r = el.getBoundingClientRect();
    if (r.left > 2 || r.top > 2 || r.right < vw - 2 || r.bottom < vh - 2) continue;
    let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
    if (o < 0.5) continue;
    const m = s.backgroundColor.match(/rgba?\(([^)]+)\)/); const p = m ? m[1].split(/[ ,/]+/).filter(Boolean) : [];
    const a = s.backgroundColor === 'transparent' ? 0 : p.length > 3 ? parseFloat(p[3]) : 1;
    if (a < 0.8 && s.backgroundImage === 'none' && !/CANVAS|VIDEO|IMG/.test(el.tagName)) continue;
    const cp = s.clipPath; if (cp && cp !== 'none' && /inset\((100|50)%|circle\(0/.test(cp)) continue;
    const tr = s.transform; if (tr && tr !== 'none') { const mm = tr.match(/matrix\(([^)]+)\)/); if (mm) { const v = mm[1].split(',').map(Number); if (Math.abs(v[0]) < 0.05 || Math.abs(v[3]) < 0.05) continue; } }
    overlay = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
    break;
  }
  const nav = performance.getEntriesByType('navigation')[0];
  const dcl = nav && nav.domContentLoadedEventEnd > 0 ? nav.domContentLoadedEventEnd : 0;
  return { t: Math.round(performance.now() - dcl), raw: Math.round(performance.now()), blocked: !tall || (locked && tall) || !!overlay, locked, overlay, tall };
}

// Sorun kutularını sayfaya çizer (ekran görüntüsü için).
function uxDraw(boxes) {
  document.getElementById('__uxbox')?.remove();
  const root = document.createElement('div');
  root.id = '__uxbox';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  for (const b of boxes) {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${b.left}px;top:${b.top}px;width:${b.right - b.left}px;height:${b.bottom - b.top}px;outline:3px solid ${b.c};background:${b.c}22;`;
    root.append(d);
  }
  document.body.append(root);
}

// --- Görev ------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sleepUnref = (ms) => new Promise((r) => setTimeout(r, ms).unref());
const scrollTo = (page, y) =>
  page.evaluate((y) => {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    return Math.round(scrollY);
  }, y);

const SHOT_ORDER = ['tap-blocked-invisible', 'text-covered-anchored', 'label-collision', 'text-overlap', 'tap-blocked', 'text-covered-end', 'layer-overlap-bar', 'text-offscreen', 'text-clipped', 'sheet-tall', 'tap-overlap', 'tap-blocked-other', 'layer-overlap', 'stack'];

async function runTask(browser, task) {
  const [w, h] = task.vp;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'tr-TR' });
  const page = await ctx.newPage();
  const origin = new URL(OPT.base).origin;
  const errors = [];
  page.on('pageerror', (e) => errors.push({ type: 'console-error', msg: String(e.message).slice(0, 200) }));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const u = m.location()?.url || '';
    if (/Failed to load resource/.test(m.text())) return; // response olayı zaten sayar
    errors.push({ type: u && !u.startsWith(origin) ? 'http-error-ext' : 'console-error', msg: m.text().slice(0, 200) });
  });
  page.on('response', (r) => {
    if (r.status() < 400) return;
    const u = r.url();
    errors.push({ type: u.startsWith(origin) ? 'http-error' : 'http-error-ext', msg: `${r.status()} ${u.replace(origin, '').slice(0, 160)}` });
  });
  const tag = `${w}x${h}-${task.mode}`;
  const url = `${OPT.base}/presets/${task.id}/${task.mode === 'vitrin' ? '?vitrin=1' : ''}`;
  const res = { id: task.id, vp: `${w}x${h}`, mode: task.mode, url, steps: [], issues: [], metrics: {}, shots: [] };
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Giriş: kaydırma kilidi / tam ekran perde ne zaman kalkıyor?
    let intro = null, polls = [];
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      intro = await page.evaluate(uxIntro).catch(() => ({ blocked: true, t: 0 }));
      polls.push(intro);
      if (!intro.blocked && polls.length > 2) break;
      await sleep(200);
    }
    await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
    const introMs = intro.blocked ? 10000 : polls.find((p, i) => !p.blocked && polls.slice(i).every((q) => !q.blocked))?.t ?? 0;
    res.metrics.introMs = introMs;
    res.metrics.introWhy = polls.filter((p) => p.blocked).slice(-1)[0] ?? null;
    if (introMs > 3000) res.issues.push({ type: 'intro-block', key: res.metrics.introWhy?.overlay || (res.metrics.introWhy?.locked ? 'scroll-lock' : 'page'), ms: introMs, text: `${(introMs / 1000).toFixed(1)} sn` });
    await sleep(900);

    const pinA = await page.evaluate(uxPins);
    // Kaydırma adımları
    let total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const step = Math.max(h * 0.7, total / OPT.maxSteps);
    const seen = new Map();
    let stuck = 0, stackSteps = 0, maxLayers = 0, covSum = 0, covMax = 0, maxSw = w, n = 0;
    for (let y = 0, i = 0; ; i++) {
      const atEnd = y >= total - 2;
      const got = await scrollTo(page, y);
      await sleep(OPT.wait);
      if (Math.abs(got - y) > 60 && Math.abs((await page.evaluate(() => scrollY)) - y) > 60) stuck++;
      let a = await page.evaluate(uxAnalyze, { atEnd, vw: w });
      // Kırpılma/çakışma geçici animasyon olabilir: bir kez daha bak, iki ölçümde de olanı tut.
      const transient = new Set(['text-overlap', 'text-clipped', 'text-offscreen', 'label-collision', 'layer-overlap', 'layer-overlap-bar', 'text-covered-anchored', 'tap-blocked', 'tap-blocked-invisible', 'tap-overlap']);
      if (a.issues.some((x) => transient.has(x.type))) {
        await sleep(700);
        const b = await page.evaluate(uxAnalyze, { atEnd, vw: w });
        const ks = new Set(b.issues.map((x) => x.type + '|' + x.key + '|' + (x.other || '')));
        a = { ...b, issues: b.issues.filter((x) => !transient.has(x.type) || a.issues.some((q) => q.type === x.type && q.key === x.key)) };
        void ks;
      }
      n++;
      maxLayers = Math.max(maxLayers, a.layers.length);
      if (a.stackBad) stackSteps++;
      covSum += a.covered; covMax = Math.max(covMax, a.covered);
      maxSw = Math.max(maxSw, a.sw);
      res.steps.push({ y: a.y, layers: a.layers.length, zones: a.zones, covered: a.covered, stackBad: a.stackBad, layerKeys: a.layers.map((l) => `${l.zone}:${l.key}`) });
      // Tekilleştir
      const fresh = [];
      for (const is of a.issues) {
        const k = `${is.type}|${is.key}|${is.other || ''}`;
        const prev = seen.get(k);
        if (prev) { prev.count++; continue; }
        const rec = { ...is, y: a.y, count: 1 };
        seen.set(k, rec);
        fresh.push(rec);
      }
      if (a.stackBad && !seen.has('stack-shot') && a.layers.length > 2) {
        const rec = { type: 'stack', key: a.layers.map((l) => l.key).join(' + '), boxes: a.layers.map((l) => l.box), y: a.y, _shotOnly: true };
        seen.set('stack-shot', rec);
        fresh.push(rec);
      }
      if (OPT.shots) {
        const todo = fresh.filter((f) => SHOT_ORDER.includes(f.type)).sort((p, q) => SHOT_ORDER.indexOf(p.type) - SHOT_ORDER.indexOf(q.type));
        for (const f of todo) {
          if (res.shots.length >= 8) break;
          if (res.shots.filter((q) => q.type === f.type).length >= 2) continue;
          const boxes = f.boxes ? f.boxes.map((b) => ({ ...b, c: '#ff2d55' })) : [f.box && { ...f.box, c: '#ff2d55' }, f.box2 && { ...f.box2, c: '#2d7dff' }].filter(Boolean);
          if (!boxes.length) continue;
          await page.evaluate(uxDraw, boxes);
          const u = boxes.reduce((m, b) => ({ left: Math.min(m.left, b.left), top: Math.min(m.top, b.top), right: Math.max(m.right, b.right), bottom: Math.max(m.bottom, b.bottom) }), { left: 1e9, top: 1e9, right: -1e9, bottom: -1e9 });
          const pad = 28;
          let top = Math.max(0, u.top - pad), bottom = Math.min(h, u.bottom + pad);
          if (bottom - top < 160) { const c = (top + bottom) / 2; top = Math.max(0, c - 80); bottom = Math.min(h, top + 160); }
          const file = `${task.id}/${tag}-${String(res.shots.length).padStart(2, '0')}-${f.type}.jpg`;
          mkdirSync(resolve(SHOTS, task.id), { recursive: true });
          await page.screenshot({ path: resolve(SHOTS, file), type: 'jpeg', quality: 68, clip: { x: 0, y: top, width: w, height: Math.max(40, bottom - top) } }).catch(() => {});
          await page.evaluate(() => document.getElementById('__uxbox')?.remove());
          f.shot = file;
          res.shots.push({ type: f.type, file, key: f.key });
        }
      }
      if (atEnd || i > OPT.maxSteps + 20) break;
      total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      y = Math.min(total, y + step);
    }
    const panX = await page.evaluate(() => { const y = scrollY; window.scrollTo(80, y); const x = scrollX; window.scrollTo(0, y); return x; });
    res.metrics.panX = panX;
    const pinB = await page.evaluate(uxPins);
    const pins = new Map();
    for (const p of [...pinA.pins, ...pinB.pins]) if (!pins.has(p.key) || pins.get(p.key).screens < p.screens) pins.set(p.key, p);
    res.metrics.pins = [...pins.values()];
    res.metrics.pageScreens = Math.max(pinA.pageScreens, pinB.pageScreens);
    for (const p of pins.values()) if (p.screens > OPT.pinScreens) res.issues.push({ type: 'pin-long', key: p.key, screens: p.screens, text: `${p.screens} ekran (${p.kind})` });
    Object.assign(res.metrics, { steps: n, maxLayers, stackFrac: +(stackSteps / Math.max(1, n)).toFixed(2), covAvg: +(covSum / Math.max(1, n)).toFixed(3), covMax: +covMax.toFixed(3), scrollWidth: maxSw, stuckSteps: stuck });
    if (stackSteps) res.issues.push({ type: 'stack', key: 'layers', frac: res.metrics.stackFrac, max: maxLayers, text: `adımların %${Math.round(res.metrics.stackFrac * 100)}'inde, en çok ${maxLayers} katman`, shot: [...seen.values()].find((s) => s?.type === 'stack')?.shot });
    if (maxSw > w + 1 || panX > 0) res.issues.push({ type: 'h-overflow', key: 'document', text: `scrollWidth ${maxSw}px > ${w}px, yatay kaydırma ${panX}px` });
    if (stuck > 1) res.issues.push({ type: 'scroll-stuck', key: 'document', text: `${stuck} adımda kaydırma hedefe ulaşmadı` });
    for (const v of seen.values()) if (v && v.type && !v._shotOnly) res.issues.push(v);
  } catch (e) {
    res.error = String(e.message || e).slice(0, 300);
  }
  const errSeen = new Set();
  for (const e of errors) { const k = e.type + e.msg; if (errSeen.has(k)) continue; errSeen.add(k); res.issues.push({ type: e.type, key: e.msg.slice(0, 80), text: e.msg }); }
  res.ms = Date.now() - t0;
  Object.assign(res, scoreTask(res));
  await ctx.close().catch(() => {});
  return res;
}

// --- Rapor ------------------------------------------------------------------
function aggregate(results) {
  const byPreset = new Map();
  for (const r of results) {
    const p = byPreset.get(r.id) ?? { id: r.id, grup: grupOf[r.id] || '?', score: 0, tasks: [], types: {} };
    p.score += r.score || 0;
    p.tasks.push(r);
    for (const is of r.issues) {
      const t = (p.types[is.type] ??= { n: 0, score: 0 });
      t.n++;
    }
    for (const [k, v] of Object.entries(r.parts || {})) p.types[k] && (p.types[k].score += v);
    byPreset.set(r.id, p);
  }
  const presets = [...byPreset.values()].map((p) => ({ ...p, score: +p.score.toFixed(1) })).sort((a, b) => b.score - a.score);
  const freq = {};
  for (const p of presets) for (const [t, v] of Object.entries(p.types)) {
    const f = (freq[t] ??= { type: t, presets: 0, instances: 0, score: 0 });
    f.presets++; f.instances += v.n; f.score += v.score;
  }
  const freqList = Object.values(freq).sort((a, b) => b.presets - a.presets || b.instances - a.instances);
  return { presets, freq: freqList };
}

const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mainProblems = (p, k = 3) => Object.entries(p.types).filter(([t]) => ISSUE[t] && ISSUE[t].sev !== 'info').sort((a, b) => b[1].score - a[1].score).slice(0, k).filter(([, v]) => v.score > 0).map(([t, v]) => `${t} (${v.n})`);

function writeReports(results, prevAgg) {
  const agg = aggregate(results);
  const prevScore = prevAgg ? Object.fromEntries(prevAgg.presets.map((p) => [p.id, p.score])) : null;
  const prevFreq = prevAgg ? Object.fromEntries(prevAgg.freq.map((f) => [f.type, f])) : null;
  const total = agg.presets.reduce((a, p) => a + p.score, 0);
  const prevTotal = prevAgg ? prevAgg.presets.reduce((a, p) => a + p.score, 0) : null;
  const when = new Date().toISOString().slice(0, 16).replace('T', ' ');

  // Markdown
  const md = [];
  md.push(`# Mobil UX denetimi (${OPT.tag})`, '', `${when} · ${agg.presets.length} preset · ${results.length} görev (ekranlar: ${OPT.vps.map((v) => v.join('×')).join(', ')}; modlar: ${OPT.modes.join(', ')}) · toplam skor **${total.toFixed(0)}**${prevTotal != null ? ` (önce ${prevTotal.toFixed(0)}, ${(((total - prevTotal) / prevTotal) * 100).toFixed(1)}%)` : ''}`, '');
  md.push('Skor = görev başına benzersiz sorunların ağırlıklı toplamı (preset başına 4 görevin toplamı). Yüksek = kötü.', '');
  md.push('## Sorunlar (etkilenen preset sayısına göre)', '', '| Sorun | Açıklama | Preset | Adet | Skor payı |' + (prevFreq ? ' Önce (preset/adet) |' : ''), '|---|---|---:|---:|---:|' + (prevFreq ? '---:|' : ''));
  for (const f of agg.freq) md.push(`| \`${f.type}\` | ${ISSUE[f.type]?.label ?? ''} | ${f.presets} | ${f.instances} | ${f.score.toFixed(0)} |` + (prevFreq ? ` ${prevFreq[f.type] ? `${prevFreq[f.type].presets}/${prevFreq[f.type].instances}` : '0/0'} |` : ''));
  md.push('', '## Sıralama (en kötü önce)', '', '| # | Preset | Aile | Skor |' + (prevScore ? ' Önce |' : '') + ' Ana sorunlar | Maks. katman | Kaplama maks. | En uzun pin |', '|---:|---|---|---:|' + (prevScore ? '---:|' : '') + '---|---:|---:|---:|');
  agg.presets.forEach((p, i) => {
    const ml = Math.max(...p.tasks.map((t) => t.metrics?.maxLayers ?? 0));
    const cm = Math.max(...p.tasks.map((t) => t.metrics?.covMax ?? 0));
    const pin = Math.max(0, ...p.tasks.flatMap((t) => (t.metrics?.pins || []).map((x) => x.screens)));
    md.push(`| ${i + 1} | ${p.id} | ${p.grup} | ${p.score} |` + (prevScore ? ` ${prevScore[p.id] ?? '-'} |` : '') + ` ${mainProblems(p).join(', ')} | ${ml} | ${Math.round(cm * 100)}% | ${pin.toFixed(1)} |`);
  });
  const errs = results.filter((r) => r.error);
  if (errs.length) md.push('', '## Çalışmayan görevler', '', ...errs.map((r) => `- ${r.id} ${r.vp} ${r.mode}: ${r.error}`));
  writeFileSync(resolve(OUT, 'report.md'), md.join('\n') + '\n');

  // HTML
  const chip = (t, v) => `<span class="chip s-${ISSUE[t]?.sev || 'low'}" title="${escH(ISSUE[t]?.label)}">${t} <b>${v.n}</b></span>`;
  const rows = agg.presets.map((p, i) => {
    const issues = p.tasks.flatMap((t) => t.issues.filter((x) => ISSUE[x.type]?.sev !== 'info').map((x) => ({ ...x, task: `${t.vp} ${t.mode}` })));
    issues.sort((a, b) => (ISSUE[b.type]?.w ?? 0) - (ISSUE[a.type]?.w ?? 0));
    const shots = p.tasks.flatMap((t) => t.shots.map((s) => ({ ...s, task: `${t.vp} ${t.mode}` })));
    const delta = prevScore && prevScore[p.id] != null ? `<span class="delta ${p.score <= prevScore[p.id] ? 'good' : 'bad'}">${prevScore[p.id]} → ${p.score}</span>` : '';
    return `<details class="p"><summary><span class="rank">${i + 1}</span><span class="id">${p.id}</span><span class="grup">${p.grup}</span><span class="score">${p.score}</span>${delta}<span class="chips">${Object.entries(p.types).filter(([t]) => ISSUE[t]?.sev !== 'info').sort((a, b) => b[1].score - a[1].score).map(([t, v]) => chip(t, v)).join('')}</span></summary>
      <div class="body"><p class="links">${p.tasks.map((t) => `<a href="${escH(t.url)}" target="_blank">${t.vp} ${t.mode}</a> <small>skor ${t.score}, katman≤${t.metrics?.maxLayers ?? '?'}, yığılma %${Math.round((t.metrics?.stackFrac ?? 0) * 100)}, kaplama≤${Math.round((t.metrics?.covMax ?? 0) * 100)}%, giriş ${((t.metrics?.introMs ?? 0) / 1000).toFixed(1)} sn${t.error ? `, HATA: ${escH(t.error)}` : ''}</small>`).join('<br>')}</p>
      <div class="shots">${shots.map((s) => `<figure><a href="shots/${s.file}" target="_blank"><img loading="lazy" src="shots/${s.file}"></a><figcaption><b>${s.type}</b> · ${s.task}<br>${escH(s.key)}</figcaption></figure>`).join('')}</div>
      <table><tr><th>Sorun</th><th>Görev</th><th>Öğe</th><th>Diğer</th><th>Ayrıntı</th></tr>${issues.slice(0, 60).map((x) => `<tr><td class="s-${ISSUE[x.type]?.sev}">${x.type}</td><td>${x.task}</td><td><code>${escH(x.key)}</code><br><small>${escH(x.text)}</small></td><td><code>${escH(x.other || '')}</code><br><small>${escH(x.otherText || '')}</small></td><td><small>${[x.y != null && `y=${x.y}`, x.pct != null && `%${x.pct}`, x.w && `${x.w}×${x.h}`, x.screens && `${x.screens} ekran`, x.count > 1 && `${x.count} adım`].filter(Boolean).join(' · ')}</small></td></tr>`).join('')}</table></div></details>`;
  });
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobil UX Denetimi</title><style>
:root{--bg:#fbfaf7;--fg:#1b1c1e;--mut:#6b6e73;--line:#e3e1db;--card:#fff;--hi:#d92d20;--med:#c77700;--low:#5b6b7a}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#141517;--fg:#ececea;--mut:#9a9da3;--line:#2b2d31;--card:#1c1d20;--hi:#ff6b5e;--med:#f0a53a;--low:#9fb0c0}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 80px}h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 10px}
.meta{color:var(--mut)}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{color:var(--mut);font-weight:600}code{font-size:12px;word-break:break-all}.num{text-align:right}
details.p{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:6px 0}
summary{cursor:pointer;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px}
.rank{color:var(--mut);width:28px}.id{font-weight:700;min-width:170px}.grup{color:var(--mut);min-width:70px}.score{font-weight:700;min-width:48px}
.chips{display:flex;flex-wrap:wrap;gap:4px}.chip{font-size:11px;border:1px solid var(--line);border-radius:99px;padding:1px 7px}
.s-high{color:var(--hi)}.s-med{color:var(--med)}.s-low,.s-info{color:var(--low)}.delta.good{color:#1a8f4c}.delta.bad{color:var(--hi)}
.body{padding:0 12px 12px;overflow-x:auto}.shots{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
figure{margin:0;width:220px}figure img{width:220px;border:1px solid var(--line);border-radius:6px}figcaption{font-size:11px;color:var(--mut);word-break:break-all}
.links small{color:var(--mut)}
</style></head><body><main>
<h1>Mobil UX denetimi <small class="meta">${OPT.tag}</small></h1>
<p class="meta">${when} · ${agg.presets.length} preset · ${results.length} görev · ekranlar ${OPT.vps.map((v) => v.join('×')).join(', ')} · modlar ${OPT.modes.join(', ')} · toplam skor <b>${total.toFixed(0)}</b>${prevTotal != null ? ` (önce ${prevTotal.toFixed(0)}, ${(((total - prevTotal) / prevTotal) * 100).toFixed(1)}%)` : ''}. Kırmızı kutu = sorunlu öğe, mavi = onu örten / çakışan öğe.</p>
<h2>Sorunlar, sıklığa göre</h2>
<table><tr><th>Sorun</th><th>Açıklama</th><th class="num">Preset</th><th class="num">Adet</th><th class="num">Skor payı</th>${prevFreq ? '<th class="num">Önce</th>' : ''}</tr>
${agg.freq.map((f) => `<tr><td class="s-${ISSUE[f.type]?.sev}"><code>${f.type}</code></td><td>${escH(ISSUE[f.type]?.label)}</td><td class="num">${f.presets}</td><td class="num">${f.instances}</td><td class="num">${f.score.toFixed(0)}</td>${prevFreq ? `<td class="num">${prevFreq[f.type] ? `${prevFreq[f.type].presets} / ${prevFreq[f.type].instances}` : '0 / 0'}</td>` : ''}</tr>`).join('')}</table>
<h2>Presetler, en kötü önce</h2>
${rows.join('\n')}
</main></body></html>`;
  writeFileSync(resolve(OUT, 'report.html'), html);
  return agg;
}

// --- Ana akış ---------------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const prevAgg = OPT.compare && existsSync(resolve(ROOT, '.shots/ux-audit', OPT.compare, 'results.json'))
  ? aggregate(JSON.parse(readFileSync(resolve(ROOT, '.shots/ux-audit', OPT.compare, 'results.json'), 'utf8')).results)
  : null;

if (OPT.reportOnly) {
  const { results } = JSON.parse(readFileSync(resolve(OUT, 'results.json'), 'utf8'));
  writeReports(results, prevAgg);
  console.log(`rapor → ${resolve(OUT, 'report.html')}`);
  process.exit(0);
}

const list = ids.length ? ids : hazirPresetler().map((p) => p.id);
if (OPT.shots && !ids.length && existsSync(SHOTS)) rmSync(SHOTS, { recursive: true, force: true });
const tasks = list.flatMap((id) => OPT.vps.flatMap((vp) => OPT.modes.map((mode) => ({ id, vp, mode }))));
console.log(`${list.length} preset, ${tasks.length} görev, ${OPT.conc} paralel → ${OUT}`);

const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const results = [];
let next = 0, done = 0;
const t0 = Date.now();
async function worker() {
  while (next < tasks.length) {
    const task = tasks[next++];
    let r;
    try {
      r = await Promise.race([runTask(browser, task), sleepUnref(OPT.timeout).then(() => ({ id: task.id, vp: task.vp.join('x'), mode: task.mode, error: 'timeout', issues: [], steps: [], shots: [], metrics: {}, score: 0, parts: {} }))]);
    } catch (e) {
      r = { id: task.id, vp: task.vp.join('x'), mode: task.mode, error: String(e.message || e), issues: [], steps: [], shots: [], metrics: {}, score: 0, parts: {} };
    }
    results.push(r);
    done++;
    const el = (Date.now() - t0) / 1000;
    console.log(`[${done}/${tasks.length}] ${task.id} ${r.vp} ${r.mode} skor ${r.score}${r.error ? ' HATA ' + r.error : ''} · ${(r.ms / 1000 || 0).toFixed(0)} sn · kalan ~${Math.round((el / done) * (tasks.length - done) / 60)} dk`);
  }
}
await Promise.all(Array.from({ length: Math.min(OPT.conc, tasks.length) }, worker));
await browser.close();

// Kısmi koşu (id verilmiş) önceki sonuçlarla birleştirilir.
let merged = results;
const resFile = resolve(OUT, 'results.json');
if (ids.length && existsSync(resFile)) {
  const old = JSON.parse(readFileSync(resFile, 'utf8')).results.filter((r) => !list.includes(r.id));
  merged = [...old, ...results];
}
writeFileSync(resFile, JSON.stringify({ opt: OPT, at: new Date().toISOString(), results: merged }, null, 1));
const agg = writeReports(merged, prevAgg);
console.log(`\n${((Date.now() - t0) / 60000).toFixed(1)} dk · rapor → ${resolve(OUT, 'report.html')}`);
console.log('En kötü 10:', agg.presets.slice(0, 10).map((p) => `${p.id} ${p.score}`).join(', '));
