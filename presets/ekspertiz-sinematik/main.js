import temel from '../../data/sektor-ekspertiz.json';
import ek from '../../data/ekspertiz-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger, vitrinModu,
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
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const phoneMQ = matchMedia('(max-width: 759px)');
const mobile = () => phoneMQ.matches;
const lite = weak || mobile();

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
$('.top__call').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
const raporNo = `Örnek rapor · ${String(d.isletme.kurulus).slice(-2)}-${String(21000 + yil * 7).padStart(5, '0')}`;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
$('[data-intro-name]').textContent = d.isletme.ad;
$('[data-intro-no]').textContent = raporNo;
$('[data-form-no]').textContent = raporNo;
$('[data-rapor-no]').textContent = d.ornekArac;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Bölme açık' : 'Bölme kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);
const bugun = d.saatler[new Date().getDay()];
$('[data-today]').innerHTML = `<i class="${status.open ? 'on' : ''}"></i>${bugun ? `Bugün ${esc(bugun.replace('-', ' – '))}` : 'Bugün kapalı'} · ${esc(status.text)}`;

// Duraklar
const STOPS = ['boya', 'sasi', 'obd', 'dyno', 'rapor'];
const filmById = Object.fromEntries(d.film.map((f) => [f.id, f]));
$('[data-rail]').innerHTML = d.film.map((f) => `<li data-rail-i="${esc(f.id)}"><span class="rail__i"><b>${esc(f.no)}</b><span>${esc(f.kisa)}</span></span></li>`).join('');
STOPS.forEach((id) => {
  const sec = $(`[data-stop="${id}"]`);
  const f = filmById[id];
  if (!sec || !f) return;
  $('[data-no]', sec).innerHTML = `<b>${esc(f.no)}</b>${esc(f.kisa)}`;
  $('[data-title]', sec).textContent = f.baslik;
  $('[data-text]', sec).textContent = f.metin;
});

const legendHtml = d.siniflar.map((c) => `<li><i style="--c:${esc(c.renk)}"></i>${esc(c.ad)}</li>`).join('');
$('[data-legend]').innerHTML = legendHtml;
$('[data-legend2]').innerHTML = legendHtml;
$('[data-checks]').innerHTML = d.sasiNoktalari.map((s) => `<li><i></i><div><b>${esc(s.ad)}</b><span>${esc(s.sonuc)}</span></div></li>`).join('');
$('[data-term]').innerHTML = d.obdKodlari.map((o) => `<li class="${o.kod === '—' ? '' : 'is-hit'}"><span>${esc(o.modul)}</span><code>${esc(o.kod)}</code><em>${esc(o.durum)}</em></li>`).join('');
$('[data-obd-total]').textContent = d.obdKodlari.length;
$('[data-dyno-lbl]').textContent = `Dinamometre · ${d.dinamo.etiket} · örnek araç`;
$('[data-rapor-note]').textContent = d.rapor.not;
const flagged = d.paneller.filter((p) => p.sinif > 0);
const rItems = [
  `<li><i style="--c:${esc(d.siniflar[0].renk)}"></i><b>${d.paneller.length - flagged.length} parça</b><span>${esc(d.siniflar[0].ad)}</span></li>`,
  ...flagged.map((p) => `<li><i style="--c:${esc(d.siniflar[p.sinif].renk)}"></i><b>${esc(p.ad)}</b><span>${esc(d.siniflar[p.sinif].ad)}${p.sinif < 3 ? ` · ${p.mikron} µm` : ''}</span></li>`),
];
const bad = d.sasiNoktalari.find((s) => !/^Orijinal/.test(s.sonuc));
if (bad) rItems.push(`<li><i style="--c:${esc(d.siniflar[1].renk)}"></i><b>${esc(bad.ad)}</b><span>${esc(bad.sonuc.split(',')[0])}</span></li>`);
const hitObd = d.obdKodlari.find((o) => o.kod !== '—');
if (hitObd) rItems.push(`<li><i style="--c:${esc(d.siniflar[1].renk)}"></i><b>${esc(hitObd.kod)} ${esc(lowerTr(hitObd.modul))}</b><span>${esc(hitObd.durum)}</span></li>`);
$('[data-rapor-list]').innerHTML = rItems.join('');
function lowerTr(s) { return s.toLocaleLowerCase('tr'); }

// Hakkında: rapor formu alanları
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <div class="field"><dt>${esc(s.etiket)}</dt><dd><b data-count="${s.deger}">${nf(s.deger)}</b>${esc(s.sonek)}</dd></div>`).join('');

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

// Galeri: konu başlıklı kareler
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="800" height="560" />
  <figcaption><b>${String(i + 1).padStart(2, '0')}</b>${esc(g.alt)}</figcaption></figure>`).join('');

// Yorumlar (örnek)
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `Örnek puan · ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="5 üzerinden ${y.puan}">${icons.star.repeat(y.puan)}</p>
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
mapBox.innerHTML = `<a class="shop__maplink" href="${esc(mapsHref(d))}" target="_blank" rel="noopener">Haritada aç</a>`;
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
    const short = p.ad.replace(/^(Sol|Sağ) /, '').replace('çamurluk', 'çam.').replace('Bagaj kapağı', 'Bagaj');
    return `<g class="pp" data-pp="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.ad)} ölç">
      <path d="${PLAN[p.id]}" />
      <text class="pp__n" text-anchor="middle">${esc(short)}</text>
      <text class="pp__v" text-anchor="middle"></text>
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
const S = createScene(canvas, { lite, phone: mobile() });
S.setPanels(d.paneller, d.siniflar);
if (import.meta.env.DEV) window.__eks = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const loader = $('[data-loader]');
S.ready.then(() => loader.classList.add('is-done')).catch(() => loader.classList.add('is-done'));

// Kamera: her durak kendi pozlarını verir (masaüstü: kart solda, araç sağa kayar; telefon: kart altta, araç üstte)
const P = (pos, look, fov, extra = {}) => ({ pos, look, fov, ...extra });
const scanX = (p) => L(2.95, -2.95, sm(seg(p, 0.16, 0.8)));
const hotX = (p) => L(2.0, -2.1, sm(seg(p, 0.16, 0.86)));
const CAM = {
  hero: (p, m) => m
    ? P(V(L(8.2, 7.2, p), 2.1, L(9.8, 8.6, p)), V(-0.2, 0.55, 0), 36, { shiftY: 0.21 })
    : P(V(L(5.6, 4.4, p), L(1.55, 1.35, p), L(7.8, 6.6, p)), V(0.1, 0.72, 0), 30, { shiftX: 0.17, shiftY: -0.04 }),
  boya: (p, m) => {
    const sx = clamp(scanX(p), -2.3, 2.3);
    return m
      ? P(V(sx * 0.55 + 1.6, 1.9, 9.6), V(sx * 0.55, 0.55, 0), 40, { shiftY: 0.2 })
      : P(V(sx * 0.5 + 0.8, 1.15, 5.8), V(sx * 0.5, 0.72, 0), 34, { shiftX: 0.19 });
  },
  sasi: (p, m) => {
    const hx = hotX(p);
    const up = sm(seg(p, 0, 0.22));
    return m
      ? P(V(L(5.2, hx + 1.3, up), L(1.3, 0.3, up), L(6.4, 3.9, up)), V(L(0.4, hx - 0.4, up), L(0.8, 1.75, up), 0), L(46, 56, up), { shiftY: 0.14 })
      : P(V(L(4.8, hx * 0.8 + 1.4, up), L(1.2, 0.35, up), L(5.6, 3.6, up)), V(L(0.6, hx * 0.8 - 0.4, up), L(0.85, 1.7, up), 0), L(38, 46, up), { shiftX: 0.16 });
  },
  obd: (p, m) => m
    ? P(V(L(3.9, 3.3, p), 1.9, L(-3.15, -3.05, p)), V(0.6, 0.75, -1.1), 58, { shiftY: 0.19 })
    : P(V(L(3.6, 2.9, p), L(1.6, 1.45, p), -3.05), V(0.45, 0.82, -0.95), 44, { shiftX: 0.16 }),
  dyno: (p, m) => m
    ? P(V(L(7.4, -6.4, sm(p)), 1.35, L(8.6, 9.0, sm(p))), V(0.1, 0.4, 0), 40, { shiftY: 0.2 })
    : P(V(L(4.2, -3.4, sm(p)), 0.6, L(4.6, 4.9, sm(p))), V(0.1, 0.6, 0), 40, { shiftX: 0.15 }),
  rapor: (p, m) => {
    const t = sm(seg(p, 0, 0.35));
    return m
      ? P(V(L(-4.5, 0.001, t), L(7, 14.5, t), L(5.5, 0.0, t)), V(0, 0.3, 0), L(42, 52, t), { up: V(L(0, 1, t), L(1, 0, t), 0), shiftY: 0.2, topDown: t > 0.4 })
      : P(V(L(-4.8, 0.0, t), L(6.2, 10.5, t), L(5.4, 0.001, t)), V(0, 0.3, 0), L(34, 34, t), { up: V(0, L(1, 0, t), L(0, -1, t)), shiftX: 0.2, topDown: t > 0.4 });
  },
};
const PREV = { hero: 'hero', boya: 'hero', sasi: 'boya', obd: 'sasi', dyno: 'obd', rapor: 'dyno' };
function lerpPose(A, B, t) {
  const up = A.up || B.up ? (A.up || V(0, 1, 0)).clone().lerp(B.up || V(0, 1, 0), t) : null;
  return {
    pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t), up,
    shiftX: L(A.shiftX || 0, B.shiftX || 0, t), shiftY: L(A.shiftY || 0, B.shiftY || 0, t),
    topDown: t > 0.5 ? B.topDown : A.topDown,
  };
}
function camFor(name, p, span = 0.2) {
  const m = mobile();
  const cur = CAM[name](p, m);
  if (name === 'hero') return cur;
  const t = sm(seg(p, 0, span));
  return t >= 1 ? cur : lerpPose(CAM[PREV[name]](1, m), cur, t);
}

// Durak durumları
const HOT_T = d.sasiNoktalari.map((_, i, a) => L(0.2, 0.84, i / (a.length - 1)));
const HIT_T = d.obdKodlari.map((_, i, a) => L(0.3, 0.84, i / (a.length - 1)));
const badHot = d.sasiNoktalari.findIndex((s) => !/^Orijinal/.test(s.sonuc));

function stateFor(name, p, time) {
  const s = { ...camFor(name, p), env: 0.45 };
  switch (name) {
    case 'hero':
      s.pos.x += Math.sin(time * 0.25) * 0.18;
      break;
    case 'boya': {
      const on = seg(p, 0.1, 0.18) * (1 - seg(p, 0.86, 0.96));
      s.scan = scanX(p);
      s.scanOn = on;
      s.gate = Math.max(on, seg(p, 0.02, 0.1) * (1 - seg(p, 0.9, 0.98)));
      if (p < 0.1) s.scan = 2.95;
      s.heat = 1;
      break;
    }
    case 'sasi': {
      s.heat = 1 - seg(p, 0, 0.08);
      s.scan = -10;
      s.posts = sm(seg(p, 0, 0.08)) * (1 - sm(seg(p, 0.94, 1)));
      s.lift = sm(seg(p, 0.06, 0.22)) * (1 - sm(seg(p, 0.86, 0.95)));
      const hotsOn = seg(p, 0.16, 0.22) * (1 - seg(p, 0.88, 0.94));
      s.torch = hotsOn;
      s.hots = HOT_T.map((t) => hotsOn * seg(p, t - 0.04, t));
      s.hotBad = badHot;
      s.keyK = 0.75;
      break;
    }
    case 'obd': {
      s.obd = sm(seg(p, 0.02, 0.22));
      s.hood = sm(seg(p, 0.08, 0.3));
      s.obdLink = seg(p, 0.22, 0.3);
      const n = HIT_T.filter((t) => p >= t).length;
      s.obdN = n;
      s.obdTotal = d.obdKodlari.length;
      const hit = n > 0 && d.obdKodlari[n - 1].kod !== '—' ? n - 1 : -1;
      s.obdHit = hit;
      s.obdN = n;
      if (p > 0.9) { s.obd = 1 - sm(seg(p, 0.9, 1)) * 0; }
      break;
    }
    case 'dyno': {
      const up = sm(seg(p, 0.02, 0.18)) * (1 - sm(seg(p, 0.92, 1)));
      s.dyno = up;
      const r = seg(p, 0.22, 0.82);
      const run = seg(p, 0.18, 0.24) * (1 - seg(p, 0.84, 0.92));
      s.speed = run * (3 + r * 30);
      s.load = run * r;
      break;
    }
    case 'rapor':
      s.heat = seg(p, 0.05, 0.3);
      s.scan = -10;
      break;
  }
  return s;
}

// --- Durak arayüzü -----------------------------------------------------------

const film = $('[data-film]');
const top = $('[data-top]');
const hint = $('[data-hint]');
const railItems = $$('[data-rail-i]');
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
  if (x > 1.8) return 'on-tampon';
  if (x > 0.93) return 'sag-on-camurluk';
  if (x > -0.05) return 'sag-on-kapi';
  if (x > -1.0) return 'sag-arka-kapi';
  if (x > -1.95) return 'sag-arka-camurluk';
  return 'arka-tampon';
}
const panelById = Object.fromEntries(d.paneller.map((p) => [p.id, p]));

// Rapor etiketleri: işaretli panellere bağlı
const TAG_AT = {
  'on-tampon': V(2.25, 0.5, 0.2), kaput: V(1.6, 0.95, 0), 'sol-on-kapi': V(0.45, 0.95, -0.85), 'sag-on-kapi': V(0.45, 0.95, 0.85),
  'sag-arka-camurluk': V(-1.55, 0.92, 0.8), 'sol-arka-camurluk': V(-1.55, 0.92, -0.8), bagaj: V(-2.05, 1.0, 0.45), 'arka-tampon': V(-2.3, 0.6, -0.55),
  'sol-on-camurluk': V(1.4, 0.8, -0.8), 'sag-on-camurluk': V(1.4, 0.8, 0.8), 'sol-arka-kapi': V(-0.5, 0.95, -0.85), 'sag-arka-kapi': V(-0.5, 0.95, 0.85), tavan: V(-0.2, 1.45, 0),
};
const tagsBox = $('[data-tags]');
tagsBox.innerHTML = flagged.filter((p) => TAG_AT[p.id]).map((p) => `<span class="tag" style="--c:${esc(d.siniflar[p.sinif].renk)}"><i></i>${esc(p.ad)}<b>${p.sinif === 3 ? esc(d.siniflar[3].ad) : `${p.mikron} µm`}</b></span>`).join('');
const tagEls = $$('.tag', tagsBox);
const tagPanels = flagged.filter((p) => TAG_AT[p.id]);

function setOn(els, fn) { els.forEach((el, i) => el.classList.toggle('is-on', fn(i))); }
let lastPanel = '';
const cards = Object.fromEntries(STOPS.map((id) => [id, $(`[data-stop="${id}"] [data-card]`)]));
const UI = {
  hero() {},
  boya(p, time) {
    const x = scanX(p);
    const id = sidePanel(x);
    const pn = panelById[id];
    if (pn && id !== lastPanel) {
      mPanel.textContent = pn.ad;
      const c = d.siniflar[pn.sinif];
      mCls.textContent = c.ad;
      mCls.style.setProperty('--c', c.renk);
      lastPanel = id;
    }
    const jitter = Math.round(Math.sin(time * 13) * 2 + Math.sin(time * 7.3) * 2);
    mVal.textContent = p < 0.16 ? '—' : pn ? (pn.sinif === 3 ? '—' : pn.mikron + (p < 0.8 ? jitter : 0)) : '—';
    return p > 0.14;
  },
  sasi(p) {
    setOn(checks, (i) => p >= HOT_T[i]);
    return p > 0.14;
  },
  obd(p) {
    let n = 0;
    setOn(termLines, (i) => { const on = p >= HIT_T[i]; if (on) n++; return on; });
    obdCount.textContent = n;
    return p > 0.22;
  },
  dyno(p) {
    const r = seg(p, 0.22, 0.82);
    dynoKw.textContent = Math.round(KW(r));
    dynoRpm.textContent = nf(Math.round((800 + r * (d.dinamo.devir - 800)) / 50) * 50);
    dynoCurve.style.strokeDashoffset = curveLen * (1 - r);
    const [cx, cy] = CURVE[Math.round(r * 60)];
    dynoDot.setAttribute('cx', cx);
    dynoDot.setAttribute('cy', cy);
    return p > 0.18;
  },
  rapor(p) {
    setOn(raporItems, (i) => p > 0.28 + i * 0.05);
    return p > 0.24;
  },
};

let tagsOn = false;
function placeTags(on) {
  if (on !== tagsOn) { tagsOn = on; tagsBox.classList.toggle('is-on', on); }
  if (!on) return;
  const c = S.project(V(0, 0.9, 0));
  tagPanels.forEach((p, i) => {
    const s = S.project(TAG_AT[p.id]);
    const el = tagEls[i];
    const w = el._w || (el._w = el.offsetWidth);
    const left = s.x < c.x;
    el.classList.toggle('is-left', left);
    const x = clamp(left ? s.x - w : s.x, 12, innerWidth - w - 12);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
  });
}

// Durak ölçüleri
const stopEls = $$('[data-stop]');
let layout = [];
function measureLayout() {
  layout = stopEls.map((el) => ({ el, name: el.dataset.stop, top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight, card: $('[data-card], .hero', el) }));
}

let railCur = null;
let liveCur = new Map();
let filmOn = true;
function tick(time) {
  const y = scrollY, vh = innerHeight;
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * 0.5) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  // Durak sonu: kart yukarı kayarken sönsün (üst başlığın altına girmesin)
  for (const l of layout) {
    if (!l.card) continue;
    const o = y - (l.top + l.height - vh);
    const a = o <= 0 ? 1 : clamp(1 - o / (vh * 0.28));
    const r = Math.round(a * 40) / 40;
    if (l.a !== r) {
      l.a = r;
      l.card.style.opacity = r === 1 ? '' : String(r);
      l.card.style.visibility = r === 0 ? 'hidden' : '';
    }
  }
  hint.classList.toggle('is-gone', y > vh * 0.12);
  const live = UI[cur.name](p, time);
  const card = cards[cur.name];
  if (card && liveCur.get(card) !== live) { liveCur.set(card, live); card.classList.toggle('is-live', !!live); }
  if (railCur !== cur.name) {
    railCur = cur.name;
    const idx = STOPS.indexOf(cur.name);
    railItems.forEach((li, i) => {
      li.classList.toggle('is-active', i === idx);
      li.classList.toggle('is-done', idx > i);
    });
  }
  const inFilm = STOPS.includes(cur.name) && filmOn && y < cur.top + cur.height - vh * 0.6;
  if (inFilm !== top.classList.contains('in-film')) top.classList.toggle('in-film', inFilm);
  placeTags(!mobile() && cur.name === 'rapor' && p > 0.3 && p < 0.97 && filmOn);
  if (filmOn) S.render(stateFor(cur.name, p, time));
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
let lenis = null;

function setupScroll() {
  lenis = initSmoothScroll({ lerp: 0.1 });
  ScrollTrigger.create({
    trigger: '.paper', start: 'top bottom', end: 'top top',
    onLeave: () => (filmOn = false), onEnterBack: () => (filmOn = true),
  });
  new IntersectionObserver((entries) => {
    const vis = entries.some((e) => e.isIntersecting);
    filmOn = vis;
    canvas.style.visibility = vis ? 'visible' : 'hidden';
  }, { rootMargin: '0px' }).observe(film);
  ScrollTrigger.create({
    trigger: '.paper', start: 'top 70px', endTrigger: '.finale', end: 'top 70px',
    onToggle: (self) => top.classList.toggle('is-paper', self.isActive),
  });
  ScrollTrigger.create({
    trigger: '.finale', start: 'top 70px', end: 'max',
    onToggle: (self) => top.classList.toggle('is-night', self.isActive),
  });
  ScrollTrigger.addEventListener('refresh', measureLayout);
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
    if (target < 100) return; // küçük sayılar saydırılmaz (ara değerde yanlış okunmasın)
    const o = { v: 0 };
    gsap.fromTo(o, { v: 0 }, {
      v: target, duration: 1.6, ease: 'power3.out', immediateRender: false,
      onStart: () => (el.textContent = '0'),
      onUpdate: () => (el.textContent = nf(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  $$('.svc__row').forEach((row) => {
    ScrollTrigger.create({ trigger: row, start: 'top 72%', once: true, onEnter: () => row.classList.add('is-checked') });
  });
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 70%', once: true, onEnter: () => s.classList.add('is-lit') }));
  ScrollTrigger.create({
    trigger: '[data-plan]', start: 'top 65%', once: true,
    onEnter: () => {
      if (measureTl) return;
      const tl = gsap.timeline();
      ['kaput', 'sag-arka-camurluk', 'sol-on-kapi'].forEach((id) => tl.add(measure(id, true)));
      measureTl = tl;
    },
  });
  gsap.fromTo('.rev', { y: 40, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__grid', start: 'top 85%', once: true },
  });
  gsap.timeline({ scrollTrigger: { trigger: '[data-finale]', start: 'top 70%', once: true } })
    .fromTo('[data-stamp]', { scale: 2.4, rotate: -40, autoAlpha: 0 }, { scale: 1, rotate: -12, autoAlpha: 1, duration: 0.5, ease: 'power4.in' })
    .fromTo('.finale', { y: 0 }, { y: 5, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' }, 0.48);
}

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { clipPath: 'inset(-20% 0 100% 0)', y: 18 }, { clipPath: 'inset(-20% 0 -20% 0)', y: 0, duration: 0.7, stagger: 0.022, ease: 'power3.out' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__today'], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' }, 0.2);
}

// Açılış: ölçer kaputa değer, değer okunur (≤1,5 sn), tarama çizgisi perdeyi açar. Dokununca geçer.
function runIntro() {
  const intro = $('[data-intro]');
  if (!intro) return heroIn();
  if (vitrinModu()) {
    intro.remove();
    document.body.classList.remove('is-loading');
    return heroIn();
  }
  const val = $('[data-intro-val]');
  const cls = $('[data-intro-cls]');
  const bars = $('[data-intro-bars]');
  bars.innerHTML = Array.from({ length: 24 }, () => '<i></i>').join('');
  const barEls = $$('i', bars);
  let done = false;
  const o = { v: 0 };
  const kaput = panelById.kaput || d.paneller[0];
  const tl = gsap.timeline();
  tl.fromTo('.intro__probe', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, 0);
  tl.to(o, {
    v: kaput.mikron, duration: 0.75, ease: 'power2.out',
    onUpdate: () => {
      val.textContent = String(Math.round(o.v)).padStart(3, '0');
      const k = Math.round((o.v / 300) * barEls.length);
      barEls.forEach((b, i) => b.classList.toggle('on', i < k));
    },
  }, 0.15);
  tl.call(() => { cls.textContent = d.siniflar[kaput.sinif].ad; cls.classList.add('is-ok'); }, [], 0.9);
  tl.add(finish, 1.2);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    document.body.classList.remove('is-loading');
    gsap.timeline({ onComplete: () => intro.remove() })
      .to('.intro__probe', { autoAlpha: 0, y: -16, duration: 0.25, ease: 'power2.in' }, 0)
      .fromTo('[data-intro-scan]', { top: '0%', autoAlpha: 1 }, { top: '100%', duration: 0.55, ease: 'power2.inOut' }, 0.1)
      .fromTo(intro, { clipPath: 'inset(0 0 0% 0)' }, { clipPath: 'inset(0 0 100% 0)', duration: 0.55, ease: 'power2.inOut' }, 0.1)
      .set(intro, { pointerEvents: 'none' }, 0.1)
      .call(heroIn, [], 0.35);
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
  addEventListener('wheel', finish, { once: true, passive: true });
  addEventListener('touchmove', finish, { once: true, passive: true });
}

addEventListener('resize', () => { S.resize(); tagEls.forEach((t) => (t._w = 0)); measureLayout(); });

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]')?.remove();
  document.body.classList.remove('is-loading');
  $$('[data-card]').forEach((c) => c.classList.add('is-live'));
  checks.forEach((c) => c.classList.add('is-on'));
  termLines.forEach((c) => c.classList.add('is-on'));
  raporItems.forEach((c) => c.classList.add('is-on'));
  obdCount.textContent = d.obdKodlari.length;
  UI.dyno(1);
  const still = () => S.render(stateFor('rapor', 1, 0));
  S.ready.then(still);
  still();
  addEventListener('resize', still);
  $$('.svc__row, .step').forEach((s) => s.classList.add('is-checked', 'is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  d.paneller.forEach((p) => {
    const g = plan.querySelector(`[data-pp="${p.id}"]`);
    g.classList.add('is-done');
    g.style.setProperty('--c', d.siniflar[p.sinif].renk);
    g.querySelector('.pp__v').textContent = p.sinif === 3 ? 'değişen' : `${p.mikron} µm`;
  });
} else {
  measureLayout();
  setupScroll();
  runIntro();
  gsap.ticker.add((t) => tick(t));
  S.ready.then(() => { S.compile(); ScrollTrigger.refresh(); });
}
