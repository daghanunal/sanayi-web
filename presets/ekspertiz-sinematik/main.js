import temel from '../../data/sektor-ekspertiz.json';
import ek from '../../data/ekspertiz-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, preset: ek.preset });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const sm = (t) => t * t * (3 - 2 * t);
const win = (p, a, b, f = 0.02) => seg(p, a, a + f) * (1 - seg(p, b - f, b));
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const lower = (s) => s.toLocaleLowerCase('tr');

// "2012'den", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres, hakkinda: d.isletme.hakkinda };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
const randevuMsg = `Merhaba ${d.isletme.ad}, ekspertiz randevusu almak istiyorum. Araç (marka, model, yıl): `;
$$('[data-wa-randevu]').forEach((a) => (a.href = waHref(d, randevuMsg)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
const raporNo = `Rapor no ${String(d.isletme.kurulus).slice(-2)}-${String(21000 + yil * 7).padStart(5, '0')}`;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
$('[data-intro-name]').textContent = d.isletme.ad;
$('[data-intro-no]').textContent = raporNo;
$('[data-form-no]').textContent = raporNo;
$('[data-rapor-no]').textContent = `${raporNo} · ${d.ornekArac.replace(/^Örnek araç: /, '')}`;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Bölme açık' : 'Bölme kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film bölümleri
$('[data-rail]').innerHTML = d.film.map((f) => `<li data-rail-i><b>${esc(f.no)}</b><span>${esc(f.kisa)}</span></li>`).join('');
$('[data-chaps]').innerHTML = d.film.map((f) => `
  <article class="chap" data-chap="${esc(f.id)}">
    <p class="chap__no"><b>${esc(f.no)}</b>${esc(f.kisa)}</p>
    <h2 class="chap__title">${esc(f.baslik)}</h2>
    <p class="chap__text">${esc(f.metin)}</p>
  </article>`).join('');

const legendHtml = d.siniflar.map((c) => `<li><i style="--c:${esc(c.renk)}"></i>${esc(c.ad)}</li>`).join('');
$('[data-legend]').innerHTML = legendHtml;
$('[data-legend2]').innerHTML = legendHtml;
$('[data-checks]').innerHTML = d.sasiNoktalari.map((s) => `<li><i></i><div><b>${esc(s.ad)}</b><span>${esc(s.sonuc)}</span></div></li>`).join('');
$('[data-term]').innerHTML = d.obdKodlari.map((o) => `<li class="${o.kod === '—' ? '' : 'is-hit'}"><span>${esc(o.modul)}</span><code>${esc(o.kod)}</code><em>${esc(o.durum)}</em></li>`).join('');
$('[data-obd-total]').textContent = d.obdKodlari.length;
$('[data-dyno-lbl]').textContent = `Dinamometre · ${d.dinamo.etiket}`;
$('[data-rapor-title]').textContent = d.rapor.baslik;
$('[data-rapor-note]').textContent = d.rapor.not;
const flagged = d.paneller.filter((p) => p.sinif > 0);
$('[data-rapor-list]').innerHTML = [
  `<li><i style="--c:${esc(d.siniflar[0].renk)}"></i><b>${d.paneller.length - flagged.length} parça</b><span>${esc(d.siniflar[0].ad)}</span></li>`,
  ...flagged.map((p) => `<li><i style="--c:${esc(d.siniflar[p.sinif].renk)}"></i><b>${esc(p.ad)}</b><span>${esc(d.siniflar[p.sinif].ad)}${p.sinif < 3 ? ` · ${p.mikron} µm` : ''}</span></li>`),
  `<li><i style="--c:${esc(d.siniflar[1].renk)}"></i><b>Bagaj havuzu</b><span>Düzeltme izi</span></li>`,
  `<li><i style="--c:${esc(d.siniflar[1].renk)}"></i><b>P0700 şanzıman</b><span>Silinmiş kayıt</span></li>`,
].join('');

// Hakkında: rapor formu alanları
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <div class="field"><dt>${esc(s.etiket)}</dt><dd><b data-count="${s.deger}">0</b>${esc(s.sonek)}</dd></div>`).join('');

// Hizmetler: kontrol listesi
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__row">
    <svg class="svc__box" viewBox="0 0 32 32" aria-hidden="true"><rect x="2" y="2" width="28" height="28" rx="4" /><path d="M8 16.5l5.5 5.5L24 10" /></svg>
    <div class="svc__body">
      <p class="svc__no">${String(i + 1).padStart(2, '0')}</p>
      <h3 class="svc__name">${esc(s.baslik)}</h3>
      <p class="svc__desc">${esc(s.aciklama)}</p>
    </div>
    <p class="svc__time">${esc(s.sure)}</p>
    ${s.gorsel ? `<img class="svc__img" src="${esc(s.gorsel)}" alt="" loading="lazy" width="240" height="160" />` : ''}
  </li>`).join('');

// Ölçer
$('[data-olcer-title]').textContent = d.olcer.baslik;
$('[data-olcer-text]').textContent = d.olcer.metin;
$('[data-ornek]').textContent = `${d.ornekArac}. ${d.rapor.not}`;

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');

// Galeri
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="800" height="560" />
  <figcaption><b>${String(i + 1).padStart(2, '0')}</b>${esc(g.alt)}</figcaption></figure>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${g}</dt><dd>${h}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-final-text]').textContent = d.finalMetin;
$('[data-garanti]').textContent = d.garanti;
$('[data-stamp-text]').textContent = `${d.isletme.ad.toLocaleUpperCase('tr')} · ŞAŞMAZ · `.repeat(2);
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Araç şeması (dokunmatik ölçer) ---------------------------------------------

const PLAN = {
  'on-tampon': 'M104 58 Q104 22 180 20 Q256 22 256 58 Z',
  kaput: 'M116 70 H244 Q250 70 250 78 L246 186 Q246 192 240 192 H120 Q114 192 114 186 L110 78 Q110 70 116 70 Z',
  tavan: 'M124 248 H236 Q242 248 242 256 V386 Q242 394 234 394 H126 Q118 394 118 386 V256 Q118 248 124 248 Z',
  bagaj: 'M120 440 H240 Q248 440 248 448 L244 516 Q244 522 238 522 H122 Q116 522 116 516 L112 448 Q112 440 120 440 Z',
  'arka-tampon': 'M104 532 H256 Q256 578 180 580 Q104 578 104 532 Z',
  'sol-on-camurluk': 'M34 84 Q40 66 70 64 H98 V194 H34 Z',
  'sag-on-camurluk': 'M326 84 Q320 66 290 64 H262 V194 H326 Z',
  'sol-on-kapi': 'M34 200 H98 V316 H34 Z',
  'sag-on-kapi': 'M262 200 H326 V316 H262 Z',
  'sol-arka-kapi': 'M34 322 H98 V432 H34 Z',
  'sag-arka-kapi': 'M262 322 H326 V432 H262 Z',
  'sol-arka-camurluk': 'M34 438 H98 V536 H70 Q40 534 34 516 Z',
  'sag-arka-camurluk': 'M262 438 H326 V516 Q320 534 290 536 H262 Z',
};
const plan = $('[data-plan]');
plan.innerHTML = `
  <path class="plan__glass" d="M118 200 H242 L236 240 H124 Z" />
  <path class="plan__glass" d="M124 400 H236 L242 432 H118 Z" />
  ${[[8, 100], [8, 450], [336, 100], [336, 450]].map(([x, y]) => `<rect class="plan__tire" x="${x}" y="${y}" width="16" height="64" rx="7" />`).join('')}
  <text class="plan__side" x="66" y="590" text-anchor="middle">SOL</text>
  <text class="plan__side" x="294" y="590" text-anchor="middle">SAĞ</text>
  <text class="plan__side" x="180" y="12" text-anchor="middle">ÖN</text>
  ${d.paneller.map((p) => {
    const [cx, cy] = [0, 0];
    const short = p.ad.replace(/^(Sol|Sağ) /, '').replace('çamurluk', 'çam.').replace('Bagaj kapağı', 'Bagaj');
    return `<g class="pp" data-pp="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.ad)} ölç">
      <path d="${PLAN[p.id]}" />
      <text class="pp__n" x="${cx}" y="${cy - 2}" text-anchor="middle">${esc(short)}</text>
      <text class="pp__v" x="${cx}" y="${cy + 15}" text-anchor="middle"></text>
    </g>`;
  }).join('')}
  <g class="probe" data-probe><circle r="13" /><circle r="4" /><path d="M0 -13 V-40" /></g>`;
const CENTERS = {};
$$('.pp', plan).forEach((g) => {
  const b = g.querySelector('path').getBBox();
  const c = [b.x + b.width / 2, b.y + b.height / 2];
  CENTERS[g.dataset.pp] = c;
  g.querySelector('.pp__n').setAttribute('x', c[0]);
  g.querySelector('.pp__n').setAttribute('y', c[1] - 2);
  g.querySelector('.pp__v').setAttribute('x', c[0]);
  g.querySelector('.pp__v').setAttribute('y', c[1] + 15);
});

const rPanel = $('[data-r-panel]'), rVal = $('[data-r-val]'), rCls = $('[data-r-cls]');
const probe = $('[data-probe]');
let measureTl = null;
function measure(id, quick = false) {
  const p = d.paneller.find((x) => x.id === id);
  const g = plan.querySelector(`[data-pp="${id}"]`);
  const [cx, cy] = CENTERS[id];
  const cls = d.siniflar[p.sinif];
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.to(probe, { x: cx, y: cy, opacity: 1, duration: quick ? 0.25 : 0.45, ease: 'power3.inOut' })
    .call(() => {
      rPanel.textContent = p.ad;
      rCls.textContent = 'Ölçülüyor';
      rCls.style.removeProperty('--c');
      g.classList.add('is-probing');
    })
    .to(o, {
      v: p.mikron, duration: quick ? 0.35 : 0.8, ease: 'power2.out',
      onUpdate: () => (rVal.textContent = Math.round(o.v)),
    })
    .call(() => {
      g.classList.remove('is-probing');
      g.classList.add('is-done');
      g.style.setProperty('--c', cls.renk);
      g.querySelector('.pp__v').textContent = p.sinif === 3 ? 'değişen' : `${p.mikron} µm`;
      rCls.textContent = cls.ad;
      rCls.style.setProperty('--c', cls.renk);
    });
  return tl;
}
$$('.pp', plan).forEach((g) => {
  const go = () => { measureTl?.kill(); measureTl = measure(g.dataset.pp); };
  g.addEventListener('click', go);
  g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
function measureAll() {
  measureTl?.kill();
  const tl = gsap.timeline();
  d.paneller.forEach((p) => tl.add(measure(p.id, true)));
  measureTl = tl;
}
$('[data-measure-all]').addEventListener('click', measureAll);
$('[data-measure-reset]').addEventListener('click', () => {
  measureTl?.kill();
  $$('.pp', plan).forEach((g) => { g.classList.remove('is-done', 'is-probing'); g.style.removeProperty('--c'); g.querySelector('.pp__v').textContent = ''; });
  rPanel.textContent = 'Bir parçaya dokunun';
  rVal.textContent = '—';
  rCls.textContent = 'Ölçüm bekleniyor';
  rCls.style.removeProperty('--c');
  gsap.to(probe, { opacity: 0, duration: 0.3 });
});
gsap.set(probe, { x: 180, y: 300, opacity: 0 });

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
S.setPanels(d.paneller);
if (import.meta.env.DEV) window.__tj = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Zaman çizelgesi (film ilerlemesi 0..1)
const T = {
  boya: [0.085, 0.29], scan: [0.11, 0.255],
  sasi: [0.3, 0.49], liftUp: [0.285, 0.33], hots: [0.345, 0.47], liftDown: [0.478, 0.515],
  obd: [0.51, 0.665], xrayIn: [0.505, 0.535], hits: [0.545, 0.64], xrayOut: [0.648, 0.68],
  dyno: [0.675, 0.835], dynoIn: [0.665, 0.695], spin: [0.705, 0.8], dynoOut: [0.815, 0.85],
  rapor: [0.85, 1.001],
};
const CH = [T.boya, T.sasi, T.obd, T.dyno, T.rapor];
const SCAN_X = [2.75, -2.75];
const scanAt = (p) => L(SCAN_X[0], SCAN_X[1], sm(seg(p, ...T.scan)));
const hotTrack = (p) => L(2.3, -2.4, sm(seg(p, T.hots[0] - 0.01, T.hots[1])));

function pose(name, p) {
  const m = mobile();
  const sx = clamp(scanAt(p), -2.3, 2.3);
  const hx = hotTrack(p);
  const P = {
    hero: m
      ? { pos: V(8.7, 2.8, 11.3), look: V(-0.55, 0.55, 0), fov: 35, shiftY: 0.15 }
      : { pos: V(5.6, 1.5, 6.1), look: V(0.0, 0.72, 0), fov: 31, shiftX: 0.17, shiftY: -0.07 },
    boya: m
      ? { pos: V(sx * 0.7 + 1.0, 1.6, 8.6), look: V(sx * 0.7, 0.7, 0), fov: 44, shiftY: 0.1 }
      : { pos: V(sx * 0.5 + 0.4, 1.05, 6.6), look: V(sx * 0.5, 0.72, 0), fov: 34, shiftX: 0.2 },
    boyaOut: m
      ? { pos: V(-6.2, 2.0, 5.8), look: V(-0.3, 0.6, 0), fov: 44, shiftY: 0.14 }
      : { pos: V(-5.4, 1.7, 4.6), look: V(-0.4, 0.75, 0), fov: 34, shiftX: 0.2 },
    sasi: m
      ? { pos: V(hx + 0.5, 0.45, 3.0), look: V(hx - 0.1, 1.9, 0.1), fov: 62, shiftY: 0.06 }
      : { pos: V(hx * 0.9 + 0.5, 0.55, 2.9), look: V(hx * 0.9 - 0.2, 1.85, 0), fov: 56, shiftX: 0.14 },
    sasiIn: m
      ? { pos: V(4.6, 0.6, 4.4), look: V(1.0, 1.6, 0), fov: 58, shiftY: 0.08 }
      : { pos: V(4.6, 0.8, 4.4), look: V(1.0, 1.6, 0), fov: 48, shiftX: 0.14 },
    obd: m
      ? { pos: V(4.6, 3.3, -5.6), look: V(0.7, 0.55, -0.1), fov: 42, shiftY: 0.12 }
      : { pos: V(3.5, 2.5, -4.0), look: V(0.7, 0.7, -0.1), fov: 36, shiftX: 0.15 },
    obdB: m
      ? { pos: V(1.2, 3.6, -6.4), look: V(0.6, 0.55, -0.1), fov: 42, shiftY: 0.12 }
      : { pos: V(1.0, 2.7, -4.8), look: V(0.6, 0.7, -0.1), fov: 36, shiftX: 0.15 },
    dyno: m
      ? { pos: V(5.8, 0.75, 6.6), look: V(0.2, 0.55, 0), fov: 44, shiftY: 0.1 }
      : { pos: V(3.9, 0.5, 4.5), look: V(0.0, 0.55, 0), fov: 42, shiftX: 0.14 },
    dynoB: m
      ? { pos: V(-4.8, 0.8, 7.0), look: V(0.0, 0.55, 0), fov: 44, shiftY: 0.1 }
      : { pos: V(-3.4, 0.55, 4.8), look: V(0.2, 0.55, 0), fov: 42, shiftX: 0.14 },
    raporIn: m
      ? { pos: V(-5.5, 7.5, 5.5), look: V(0, 0.3, 0), fov: 40, shiftY: 0.05 }
      : { pos: V(-4.8, 6.4, 5.2), look: V(0, 0.4, 0), fov: 34, shiftX: 0.2 },
    rapor: m
      ? { pos: V(-2.4, 16.5, 0.9), look: V(0, 0.2, 0), fov: 54, up: V(1, 0, 0), shiftY: -0.1 }
      : { pos: V(0, 11.5, 2.0), look: V(0, 0.2, 0), fov: 32, shiftX: 0.02, shiftY: 0.1 },
  };
  return P[name];
}
const KF = [
  [0, 'hero'], [0.06, 'hero'], [0.105, 'boya'], [0.26, 'boya'], [0.29, 'boyaOut'],
  [0.315, 'sasiIn'], [0.345, 'sasi'], [0.47, 'sasi'], [0.505, 'obd'], [0.64, 'obdB'],
  [0.685, 'dyno'], [0.82, 'dynoB'], [0.845, 'raporIn'], [0.88, 'rapor'], [1.0, 'rapor'],
];
function filmPose(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const [ta, na] = KF[i], [tb, nb] = KF[i + 1];
  const t = sm(seg(p, ta, tb));
  const A = pose(na, p), B = pose(nb, p);
  const up = A.up || B.up ? (A.up || V(0, 1, 0)).clone().lerp(B.up || V(0, 1, 0), t) : null;
  return {
    pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t), up,
    shiftX: L(A.shiftX || 0, B.shiftX || 0, t), shiftY: L(A.shiftY || 0, B.shiftY || 0, t),
  };
}

const HOT_T = d.sasiNoktalari.map((_, i, a) => L(T.hots[0], T.hots[1] - 0.02, i / (a.length - 1)));
const HIT_T = d.obdKodlari.map((_, i, a) => L(T.hits[0], T.hits[1] - 0.012, i / (a.length - 1)));

function filmState(p, time) {
  const pz = filmPose(p);
  const orbit = 1 - seg(p, 0.06, 0.1);
  pz.pos.x += Math.sin(time * 0.25) * 0.25 * orbit;
  if (p > 0.88) {
    const a = (p - 0.88) * 0.8;
    pz.pos.applyAxisAngle(V(0, 1, 0), a);
  }
  const scan = scanAt(p);
  const hotsOn = win(p, T.hots[0] - 0.02, T.liftDown[0], 0.015);
  const hots = HOT_T.map((t) => hotsOn * seg(p, t - 0.012, t));
  const dynoOn = seg(p, ...T.dynoIn) * (1 - seg(p, ...T.dynoOut));
  const spinT = seg(p, T.spin[0], T.spin[0] + 0.04) * (1 - seg(p, T.spin[1], T.spin[1] + 0.02));
  const hit = HIT_T.findIndex((t, i) => p >= t && p < (HIT_T[i + 1] ?? T.hits[1] + 0.02));
  return {
    ...pz,
    scan,
    scanOn: win(p, T.scan[0] - 0.01, T.scan[1] + 0.012, 0.012),
    gate: p < T.scan[0] ? 0.85 : win(p, 0, T.scan[1] + 0.02, 0.018),
    heat: 1 - seg(p, 0.285, 0.31),
    report: seg(p, T.rapor[0], T.rapor[0] + 0.03),
    lift: sm(seg(p, ...T.liftUp)) * (1 - sm(seg(p, ...T.liftDown))),
    torch: hotsOn,
    hideNearPost: mobile(),
    posts: seg(p, 0.268, 0.3) * (1 - seg(p, 0.5, 0.53)),
    hots,
    hotBad: 3,
    xray: sm(seg(p, ...T.xrayIn)) * (1 - sm(seg(p, ...T.xrayOut))),
    obdHit: hit >= 0 && d.obdKodlari[hit].kod !== '—' ? hit : hit >= 0 ? -1 : -2,
    dyno: dynoOn,
    spin: dynoOn * (4 + spinT * 60),
    load: spinT,
    env: 0.55,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const chaps = $$('[data-chap]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const hint = $('[data-hint]');
const huds = Object.fromEntries($$('[data-hud]').map((h) => [h.dataset.hud, h]));
const mPanel = $('[data-m-panel]'), mVal = $('[data-m-val]'), mCls = $('[data-m-cls]');
const checks = $$('[data-checks] li');
const termLines = $$('[data-term] li');
const obdCount = $('[data-obd-count]');
const dynoKw = $('[data-dyno-kw]'), dynoRpm = $('[data-dyno-rpm]'), dynoCurve = $('[data-dyno-curve]'), dynoDot = $('[data-dyno-dot]');
const raporItems = $$('[data-rapor-list] li');

// Güç eğrisi (tekerden kW, devir)
const KW = (r) => d.dinamo.maksimumKw * Math.sin(Math.PI * 0.5 * Math.pow(r, 0.85)) * (1 - 0.12 * Math.max(0, r - 0.85) / 0.15);
const CURVE = Array.from({ length: 61 }, (_, i) => {
  const r = i / 60;
  return [r * 300, 110 - (KW(r) / (d.dinamo.maksimumKw * 1.08)) * 104];
});
dynoCurve.setAttribute('d', CURVE.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(''));
const curveLen = dynoCurve.getTotalLength();
dynoCurve.style.strokeDasharray = curveLen;

// Sağ taraftaki panel (kamera aracın sağında)
function sidePanel(x) {
  if (x > 1.97) return 'on-tampon';
  if (x > 0.93) return 'sag-on-camurluk';
  if (x > -0.05) return 'sag-on-kapi';
  if (x > -0.98) return 'sag-arka-kapi';
  if (x > -2.02) return 'sag-arka-camurluk';
  return 'arka-tampon';
}
const panelById = Object.fromEntries(d.paneller.map((p) => [p.id, p]));

function show(el, v, dy = 24) {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
  el.style.transform = `translate3d(0, ${(1 - v) * dy}px, 0)`;
}

let lastPanel = '';
function filmUI(p, time) {
  const heroOut = seg(p, 0.045, 0.085);
  show(hero, 1 - heroOut, -40);
  hint.style.opacity = 1 - seg(p, 0, 0.025);

  let active = -1;
  chaps.forEach((c, i) => {
    const [a, b] = CH[i];
    const v = win(p, a, b, 0.018);
    show(c, v);
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.07, 0.095);
  show(rail, railOn, -10);
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p >= CH[i][1]);
  });

  // Boya
  const boyaV = win(p, T.scan[0] - 0.01, T.boya[1], 0.015);
  show(huds.boya, boyaV, -16);
  if (boyaV > 0.01) {
    const x = scanAt(p);
    const id = sidePanel(x);
    const pn = panelById[id];
    if (id !== lastPanel) {
      mPanel.textContent = pn.ad;
      const c = d.siniflar[pn.sinif];
      mCls.textContent = c.ad;
      mCls.style.setProperty('--c', c.renk);
      lastPanel = id;
    }
    const jitter = Math.round(Math.sin(time * 13) * 2 + Math.sin(time * 7.3) * 2);
    mVal.textContent = p > T.scan[1] ? '—' : pn.mikron + jitter;
  }

  // Şasi
  const sasiV = win(p, T.hots[0] - 0.02, T.sasi[1], 0.015);
  show(huds.sasi, sasiV, -16);
  checks.forEach((li, i) => li.classList.toggle('is-on', p >= HOT_T[i]));

  // OBD
  const obdV = win(p, T.hits[0] - 0.02, T.obd[1], 0.015);
  show(huds.obd, obdV, -16);
  let n = 0;
  termLines.forEach((li, i) => {
    const on = p >= HIT_T[i];
    li.classList.toggle('is-on', on);
    if (on) n++;
  });
  obdCount.textContent = n;

  // Dinamo
  const dynoV = win(p, T.spin[0] - 0.015, T.dyno[1], 0.015);
  show(huds.dyno, dynoV, -16);
  if (dynoV > 0.01) {
    const r = seg(p, T.spin[0], T.spin[1]);
    const kw = KW(r);
    dynoKw.textContent = Math.round(kw);
    dynoRpm.textContent = nf(Math.round((800 + r * (d.dinamo.devir - 800)) / 50) * 50);
    dynoCurve.style.strokeDashoffset = curveLen * (1 - r);
    const [cx, cy] = CURVE[Math.round(r * 60)];
    dynoDot.setAttribute('cx', cx);
    dynoDot.setAttribute('cy', cy);
  }

  // Rapor
  const raporV = seg(p, T.rapor[0] + 0.02, T.rapor[0] + 0.045);
  show(huds.rapor, raporV, -16);
  raporItems.forEach((li, i) => li.classList.toggle('is-on', p > T.rapor[0] + 0.04 + i * 0.012));
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });

let lenis = null;
let filmP = 0, filmTarget = 0;
let filmST = null;
let filmOn = true;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  filmST = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  const sticky = $('.film__sticky');
  ScrollTrigger.create({
    trigger: '.paper', start: 'top bottom', end: 'top top',
    onUpdate: (self) => {
      filmOn = self.progress < 1;
      // film çıkarken göstergeler üst çubuğun altına kaymasın
      const o = Math.max(0, 1 - Math.max(0, self.progress - 0.35) * 3);
      sticky.style.opacity = o === 1 ? '' : o;
    },
    onLeave: () => (filmOn = false), onEnterBack: () => (filmOn = true),
  });
  ScrollTrigger.create({
    trigger: '.paper', start: 'top 70px', endTrigger: '.finale', end: 'top 70px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-paper', self.isActive),
  });
  ScrollTrigger.create({
    trigger: '.finale', start: 'top 70px', end: 'max',
    onToggle: (self) => $('[data-top]').classList.toggle('is-night', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  $$('[data-reveal]').forEach((el) => {
    const s = new SplitText(el, { type: 'lines', linesClass: 'ln', mask: 'lines' });
    gsap.fromTo(s.lines, { yPercent: 110 }, {
      yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // Kontrol listesi: satır ortaya gelince işaretlenir
  $$('.svc__row').forEach((row) => {
    ScrollTrigger.create({ trigger: row, start: 'top 72%', once: true, onEnter: () => row.classList.add('is-checked') });
  });
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 70%', once: true, onEnter: () => s.classList.add('is-lit') }));
  // Ölçer: görünce kendiliğinden birkaç parçayı ölçer
  ScrollTrigger.create({
    trigger: '[data-plan]', start: 'top 65%', once: true,
    onEnter: () => {
      if (measureTl) return;
      const tl = gsap.timeline();
      ['kaput', 'sag-arka-camurluk', 'sol-on-kapi'].forEach((id) => tl.add(measure(id, true)));
      measureTl = tl;
    },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  gsap.fromTo('.rev', { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__grid', start: 'top 85%', once: true },
  });
  // Final: mühür basılır
  gsap.timeline({ scrollTrigger: { trigger: '[data-finale]', start: 'top 60%', once: true } })
    .fromTo('[data-stamp]', { scale: 2.4, rotate: -40, opacity: 0 }, { scale: 1, rotate: -12, opacity: 1, duration: 0.5, ease: 'power4.in' })
    .fromTo('.finale', { y: 0 }, { y: 5, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' }, 0.48)
    .fromTo(['.finale__title', '.finale__sub', '.finale__cta', '.finale__garanti'], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.4);
}

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 8));
  if (filmOn) {
    filmUI(filmP, time);
    S.update(filmState(filmP, time), now);
    canvas.style.visibility = 'visible';
  } else {
    canvas.style.visibility = 'hidden';
  }
  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());

// --- Açılış: ölçer kaputa değer, değer okunur, tarama çizgisi perdeyi açar -----

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { clipPath: 'inset(-20% 0 100% 0)', y: 18 }, { clipPath: 'inset(-20% 0 -20% 0)', y: 0, duration: 0.7, stagger: 0.022, ease: 'power3.out' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.25);
}

function runIntro() {
  const intro = $('[data-intro]');
  const val = $('[data-intro-val]');
  const cls = $('[data-intro-cls]');
  const bars = $('[data-intro-bars]');
  bars.innerHTML = Array.from({ length: 24 }, () => '<i></i>').join('');
  const barEls = $$('i', bars);
  let done = false;
  const o = { v: 0 };
  const kaput = panelById.kaput;
  const tl = gsap.timeline();
  tl.fromTo('.intro__probe', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0);
  tl.to(o, {
    v: kaput.mikron, duration: 1.1, ease: 'power2.out',
    onUpdate: () => {
      val.textContent = String(Math.round(o.v)).padStart(3, '0');
      const k = Math.round((o.v / 300) * barEls.length);
      barEls.forEach((b, i) => b.classList.toggle('on', i < k));
    },
  }, 0.25);
  tl.call(() => {
    cls.textContent = d.siniflar[kaput.sinif].ad;
    cls.classList.add('is-ok');
  }, [], 1.35);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000), performance.now());
  }, [], 0.3);
  tl.add(finish, 1.95);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .to('.intro__probe', { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' }, 0)
      .fromTo('[data-intro-scan]', { top: '0%', opacity: 1 }, { top: '100%', duration: 0.8, ease: 'power2.inOut' }, 0.15)
      .fromTo(intro, { clipPath: 'inset(0 0 0% 0)' }, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'power2.inOut' }, 0.15)
      .call(heroIn, [], 0.55);
    document.body.classList.remove('is-loading');
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

// --- Hareket azaltma -----------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.compile();
  const still = () => S.update({ ...filmState(0.9, 0), report: 1 });
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.svc__row, .step').forEach((s) => s.classList.add('is-checked', 'is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  d.paneller.forEach((p) => {
    const g = plan.querySelector(`[data-pp="${p.id}"]`);
    g.classList.add('is-done');
    g.style.setProperty('--c', d.siniflar[p.sinif].renk);
    g.querySelector('.pp__v').textContent = p.sinif === 3 ? 'değişen' : `${p.mikron} µm`;
  });
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
void lower;
