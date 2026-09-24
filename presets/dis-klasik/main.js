// Ayna (klasik aile, diş kliniği): koyu şişe yeşili, nane yeşili vurgu, soğuk beyaz kâğıt.
// Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: diş aynası. Kaydırdıkça ayna 32 dişlik şemanın üstünden sırayla geçer (18 → 28,
// 38 → 48). Aynanın içinden klinik fotoğrafı net ve renkli görünür (clip-path), geçtiği diş işaretlenir,
// ortadaki sayaç 00'dan 32'ye çıkar. Muayene bitince ayna büyüyüp bütün ekranı kaplar.
import sektor from '../../data/sektor-dis.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(sektor);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
const SVGNS = 'http://www.w3.org/2000/svg';
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;
icons.arrow = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

// Klinik için WhatsApp mesajları (ortak varsayılan mesaj araç içindir)
const waGenel = waHref(d, `Merhaba ${d.isletme.ad}, muayene için randevu almak istiyorum.`);
const cocukSvc = d.hizmetler.find((h) => h.id === 'cocuk');
const waCocuk = waHref(d, cocukSvc?.mesaj || `Merhaba ${d.isletme.ad}, çocuğum için randevu almak istiyorum.`);
const barWa = $('.action-bar__btn--main');
if (barWa) barWa.href = waGenel;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa-randevu]').forEach((a) => (a.href = waGenel));
$$('[data-wa-cocuk]').forEach((a) => (a.href = waCocuk));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
if (d.isletme.ad.length > 16) $('.hero__name').classList.add('is-long');
if (d.isletme.ad.length > 26) $('.hero__name').classList.add('is-xlong');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `Etimesgut · ${ablative(d.isletme.kurulus)} beri`;
$('[data-cocuk]').textContent = cocukSvc?.aciklama ?? '';
$('[data-year]').textContent = new Date().getFullYear();
const yil = new Date().getFullYear() - d.isletme.kurulus;

const status = openStatus(d.saatler);
$('[data-status]').textContent = status.text;
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: diş şeması ---------------------------------------------------------------
// FDI numaralandırma. k: 0 = orta kesici … 7 = yirmilik
const ADLAR = ['orta kesici', 'yan kesici', 'köpek dişi', '1. küçük azı', '2. küçük azı', '1. büyük azı', '2. büyük azı', 'yirmilik'];
const GEN = [34, 29, 33, 34, 34, 46, 45, 41]; // yay boyunca genişlik
const DER = [44, 40, 48, 42, 42, 50, 48, 44]; // derinlik
const R = 318, GAP = 7;
const UST = { cx: 500, cy: 478 }, ALT = { cx: 500, cy: 522 };
// Bir çeyrekte orta hattan (90°) dışa doğru açıları hesapla
const quadAngles = (() => {
  const out = [];
  let s = GAP / 2;
  for (let k = 0; k < 8; k++) {
    const mid = s + (GEN[k] * 1.25) / 2;
    out.push((mid / R) * (180 / Math.PI));
    s += GEN[k] * 1.25 + GAP;
  }
  return out;
})();

// Muayene sırası: 18→11, 21→28 (üst, soldan sağa), 38→31, 41→48 (alt, sağdan sola)
const teeth = [];
const addTooth = (quad, k, upper, side) => {
  const off = quadAngles[k];
  const tDeg = 90 + side * off; // side: +1 ekranın solu, -1 sağı
  const t = (tDeg * Math.PI) / 180;
  const c = upper ? UST : ALT;
  const x = c.cx + R * Math.cos(t);
  const y = upper ? c.cy - R * Math.sin(t) : c.cy + R * Math.sin(t);
  const rot = upper ? 90 - tDeg : tDeg - 90;
  teeth.push({ no: `${quad}${k + 1}`, k, x, y, rot, upper, t });
};
for (let k = 7; k >= 0; k--) addTooth(1, k, true, 1);
for (let k = 0; k < 8; k++) addTooth(2, k, true, -1);
for (let k = 7; k >= 0; k--) addTooth(3, k, false, -1);
for (let k = 0; k < 8; k++) addTooth(4, k, false, 1);

function toothPath(k, w, h) {
  // Taç: kesicilerde ince kenar, azılarda iki tepecikli üst
  const x0 = -w / 2, y0 = -h / 2, r = Math.min(w, h) * 0.34;
  if (k >= 5) {
    const c = h * 0.1;
    return `M${x0 + r} ${y0} Q${-w * 0.25} ${y0 + c} 0 ${y0} Q${w * 0.25} ${y0 + c} ${w / 2 - r} ${y0}
      Q${w / 2} ${y0} ${w / 2} ${y0 + r} L${w / 2} ${h / 2 - r} Q${w / 2} ${h / 2} ${w / 2 - r} ${h / 2}
      L${x0 + r} ${h / 2} Q${x0} ${h / 2} ${x0} ${h / 2 - r} L${x0} ${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0}Z`;
  }
  const rt = k <= 1 ? r * 0.6 : r;
  return `M${x0 + rt} ${y0} L${w / 2 - rt} ${y0} Q${w / 2} ${y0} ${w / 2} ${y0 + rt} L${w / 2 - w * 0.06} ${h / 2 - r}
    Q${w / 2 - w * 0.06} ${h / 2} ${w / 2 - r} ${h / 2} L${x0 + r} ${h / 2} Q${x0 + w * 0.06} ${h / 2} ${x0 + w * 0.06} ${h / 2 - r}
    L${x0} ${y0 + rt} Q${x0} ${y0} ${x0 + rt} ${y0}Z`;
}

const gTeeth = $('[data-teeth]');
const gNums = $('[data-nums]');
teeth.forEach((th) => {
  const w = GEN[th.k] * 1.25, h = DER[th.k] * 1.25;
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('transform', `translate(${th.x.toFixed(1)} ${th.y.toFixed(1)}) rotate(${th.rot.toFixed(1)})`);
  // Üst çenede taçlar dışa, altta dışa bakar: alt dişte şekli ters çevir
  const flip = th.upper ? '' : ' scale(1 -1)';
  g.innerHTML = `<g class="tooth"${flip ? ` transform="${flip.trim()}"` : ''}><path d="${toothPath(th.k, w, h)}"/>${
    th.k >= 3 ? `<path class="groove" d="M${-w * 0.22} ${-h * 0.02} Q0 ${h * 0.12} ${w * 0.22} ${-h * 0.02}"/>` : ''}</g>`;
  gTeeth.append(g);
  th.el = g.firstElementChild;
  // Numara: dişin biraz dışında
  const dx = Math.cos(th.t), dy = th.upper ? -Math.sin(th.t) : Math.sin(th.t);
  const n = document.createElementNS(SVGNS, 'text');
  n.setAttribute('x', (th.x + dx * (h / 2 + 22)).toFixed(1));
  n.setAttribute('y', (th.y + dy * (h / 2 + 22) + 6).toFixed(1));
  n.textContent = th.no;
  gNums.append(n);
  th.num = n;
});

const hero = $('.hero');
const stage = $('.hero__stage');
const svg = $('[data-arch]');
const net = $('.hero__img--net');
const ring = $('[data-ring]');
const handle = $('[data-handle]');
const mirror = $('[data-mirror]');
const countEl = $('[data-tooth-count]');
const nameEl = $('[data-tooth-name]');
const LENS = 96;
ring.setAttribute('r', LENS);
const narrow = matchMedia('(max-width: 899px)').matches;
const VB = narrow ? { x: 112, y: 112, w: 776 } : { x: 88, y: 88, w: 824 };
svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.w}`);

let map = { s: 1, ox: 0, oy: 0, far: 1000 };
function measure() {
  const sr = stage.getBoundingClientRect();
  const ar = svg.getBoundingClientRect();
  const s = Math.min(ar.width, ar.height) / VB.w;
  map = {
    s,
    ox: ar.left - sr.left + (ar.width - VB.w * s) / 2 - VB.x * s,
    oy: ar.top - sr.top + (ar.height - VB.w * s) / 2 - VB.y * s,
    w: sr.width, h: sr.height,
  };
}

let done = -1;
let cur = 0;
function setExam(p, grow = 0) {
  cur = p;
  const q = Math.min(Math.max(p, 0), 1) * 31;
  const i = Math.floor(q), f = q - i;
  const a = teeth[i], b = teeth[Math.min(i + 1, 31)];
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  // Sap: aynadan ağız dışına doğru
  const vx = x - 500, vy = y - 500, L = Math.hypot(vx, vy) || 1;
  const hx = x + (vx / L) * (LENS + 4), hy = y + (vy / L) * (LENS + 4);
  const ex = x + (vx / L) * (LENS + 190), ey = y + (vy / L) * (LENS + 190);
  ring.setAttribute('cx', x.toFixed(1));
  ring.setAttribute('cy', y.toFixed(1));
  handle.setAttribute('x1', hx.toFixed(1)); handle.setAttribute('y1', hy.toFixed(1));
  handle.setAttribute('x2', ex.toFixed(1)); handle.setAttribute('y2', ey.toFixed(1));
  // Ayna içi: net fotoğraf
  const px = map.ox + x * map.s, py = map.oy + y * map.s;
  const far = Math.hypot(Math.max(px, map.w - px), Math.max(py, map.h - py));
  const r0 = LENS * map.s;
  const r = r0 + (far - r0) * gsap.parseEase('power2.in')(grow);
  net.style.clipPath = `circle(${r.toFixed(1)}px at ${px.toFixed(1)}px ${py.toFixed(1)}px)`;
  const n = p <= 0 ? -1 : Math.min(31, Math.round(q));
  if (n !== done) {
    teeth.forEach((th, k) => {
      const on = k <= n;
      if (th.on !== on) { th.on = on; th.el.classList.toggle('is-ok', on); th.num.classList.toggle('is-ok', on); }
    });
    done = n;
    countEl.textContent = String(n + 1).padStart(2, '0');
    const th = teeth[Math.max(n, 0)];
    nameEl.textContent = n < 0 ? 'diş tek tek' : `${th.no} · ${ADLAR[th.k]}`;
  }
}

measure();
if (reducedMotion) {
  setExam(1, 0);
  hero.classList.add('is-static');
} else {
  setExam(0, 0);
  const small = matchMedia('(max-width: 899px)').matches;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.9 : 2.2)}`,
      pin: '.hero__pin', scrub: 0.5, anticipatePin: 1,
    },
  });
  const m = { p: 0, g: 0 };
  const upd = () => setExam(m.p, m.g);
  tl.to(m, { p: 1, duration: 0.78, onUpdate: upd }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.06 }, 0)
    .to(m, { g: 1, duration: 0.22, onUpdate: upd }, 0.78)
    .to(['.arch', '.count'], { opacity: 0, scale: 1.08, duration: 0.14 }, 0.8)
    .to('.hero__veil', { opacity: 1, duration: 0.12 }, 0.88)
    .fromTo('.hero__end', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1 }, 0.9)
    .to('.hero__copy', { opacity: 0, y: -20, duration: 0.1 }, 0.84);

  // Açılış
  gsap.from('.hero__name', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__foot > *', '.hero__hint'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  gsap.from('.tooth', { opacity: 0, duration: 0.4, stagger: { each: 0.025, from: 'center' }, ease: 'power1.out', delay: 0.15 });
  gsap.from('[data-teeth]', { scale: 0.9, duration: 1.1, ease: 'power3.out', delay: 0.1, transformOrigin: '50% 50%' });
  gsap.from('.mirror', { opacity: 0, duration: 0.6, delay: 0.7 });
  gsap.from('.count', { opacity: 0, scale: 0.85, duration: 0.8, ease: 'power3.out', delay: 0.4 });
}
addEventListener('resize', () => { measure(); setExam(cur, 0); });
new IntersectionObserver(([e]) => hero.classList.toggle('is-off', !e.isIntersecting)).observe($('.hero__pin'));

// --- İlke + rakamlar -----------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Tedaviler ---------------------------------------------------------------
const local = (src) => String(src || '').replace('/sektor-dis/', '/dis-klasik/');
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc" data-i="${i}">
    <img class="svc__img" src="${esc(local(h.gorsel))}" alt="" loading="lazy" decoding="async" />
    <div class="svc__body">
      <p class="svc__top mono"><span>${String(i + 1).padStart(2, '0')}</span><span><span class="sr-only">Süre: </span>${esc(h.sure)}</span></p>
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
      ${h.mesaj ? `<a class="svc__wa" href="${esc(waHref(d, h.mesaj))}" target="_blank" rel="noopener">${icons.whatsapp}Bunun için yaz</a>` : ''}
    </div>
  </li>`).join('');
const tedPhoto = $('[data-ted-photo]');
tedPhoto.innerHTML = d.hizmetler.map((h, i) => `<img src="${esc(local(h.gorsel))}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}" />`)
  .join('') + `<p class="ted__cap mono" data-ted-cap></p>`;
const tedImgs = $$('img', tedPhoto);
const tedCap = $('[data-ted-cap]');
let tedCur = -1;
function tedSet(i) {
  if (i === tedCur) return;
  tedCur = i;
  tedImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
  $$('.svc').forEach((s, k) => s.classList.toggle('is-on', k === i));
  tedCap.textContent = `${String(i + 1).padStart(2, '0')} / ${String(d.hizmetler.length).padStart(2, '0')} · ${d.hizmetler[i].sure}`;
}
tedSet(0);
const tedList = $('[data-services]');
if (!narrow) {
  $$('.svc').forEach((s, i) => {
    ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (e) => e.isActive && tedSet(i) });
    s.addEventListener('mouseenter', () => tedSet(i));
  });
} else {
  // Telefonda yatay kaydırmalı kartlar + nokta göstergesi
  tedList.insertAdjacentHTML('afterend', `<div class="ted__dots" aria-hidden="true">${d.hizmetler.map(() => '<span></span>').join('')}</div>`);
  const dots = $$('.ted__dots span');
  let raf = 0;
  const onX = () => {
    raf = 0;
    const w = tedList.firstElementChild.getBoundingClientRect().width + 12;
    const i = Math.min(dots.length - 1, Math.round(tedList.scrollLeft / w));
    dots.forEach((dd, k) => dd.classList.toggle('is-on', k === i));
  };
  tedList.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onX); }, { passive: true });
  onX();
}

// --- Süreç --------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__no" aria-hidden="true"><span>${i + 1}</span>${icons.check}</span>
    <div>
      <h3 class="step__title">${esc(s.baslik)}</h3>
      <p class="step__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = ['muayenehane', 'alet-seti', 'ekip', 'implant', 'klinik', 'aletler'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i + 1}"><img src="${esc(local(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><span class="rev__ini" aria-hidden="true">${esc(String(y.ad).charAt(0))}</span><strong>${esc(y.ad)}</strong></p>
  </li>`).join('');

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const today = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${today >= a && today <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
const solid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.5);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2, .ilke__t').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });
  gsap.from('.stat', { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.stats', start: 'top 90%' } });
  gsap.from('.svc', { [narrow ? 'x' : 'y']: 40, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: '.ted__list', start: 'top 85%' } });
  gsap.fromTo('.surec__photo img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.surec', start: 'top bottom', end: 'center center', scrub: true } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 80%', once: true, onEnter: () => s.classList.add('is-done') }));
  gsap.fromTo('.ilk__photo', { clipPath: 'inset(12% 12% 12% 12% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: '.ilk', start: 'top 85%', end: 'top 25%', scrub: 0.4 } });
  gsap.from('.ilk__list li', { x: -24, opacity: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.ilk__list', start: 'top 88%' } });
  $$('.shot').forEach((s) => gsap.fromTo(s, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1, ease: 'power2.out', scrollTrigger: { trigger: s, start: 'top 90%' } }));
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__lens', { clipPath: 'circle(14% at 50% 45%)' }, { clipPath: 'circle(80% at 50% 45%)', ease: 'none', scrollTrigger: { trigger: '.final', start: 'top 90%', end: 'center 55%', scrub: 0.4 } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-done'));
}

addEventListener('load', () => { measure(); setExam(cur, 0); ScrollTrigger.refresh(); });
