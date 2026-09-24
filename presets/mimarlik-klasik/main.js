// Ozalit (klasik aile, mimarlık ofisi): soğuk kâğıt grisi, grafit ve ozalit moru-mavisi.
// Fotoğraf ağırlıklı, WebGL yok. İmza anı hero'da: ozalit makinesi. Sayfa açılınca villanın cephesi
// çizgi çizgi çizilir; kaydırdıkça bir ışık çubuğu paftanın üstünden geçer ve geçtiği yerde çizim
// gerçek yapıya (fotoğrafa) döner. Antette durum "Çizim"den "Yapı"ya ilerler, sonunda damga vurulur.
import sektor from '../../data/sektor-mimarlik.json';
import extra from '../../data/mimarlik-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
// Sektör görsellerinin bu preset için küçültülmüş WebP kopyaları
const img = (src) => String(src).replace('/sektor-mimarlik/', '/mimarlik-klasik/').replace(/\.jpe?g$/, '.webp');
const wa = (msg) => waHref(d, msg ?? `Merhaba ${d.isletme.ad}, bir proje için görüşmek istiyorum.`);
const small = matchMedia('(max-width: 899px)').matches;

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = wa()));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
if (d.isletme.ad.length > 16) document.documentElement.classList.add('is-long');
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-hero-ust]').textContent = `${d.hero.ust} · ${d.isletme.kurulus}`;
$('[data-hero-proje]').textContent = d.hero.proje;
$('[data-hero-ipucu]').textContent = d.hero.ipucu;
$('[data-years]').innerHTML = `<span>${esc(yil)}</span>yıldır Etimesgut'ta`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-final-alt]').textContent = d.finalAlt;
$('[data-kapsam]').innerHTML = d.hizmetler.slice(0, 6).map((h, i) => `<li><span>${esc(d.paftaKodlari[i] || '')}</span>${esc(h.baslik)}</li>`).join('');
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: cephe çizimi -------------------------------------------------------
// Koordinatlar villa fotoğrafının 2000×1335 ölçeğinde elle çizildi.
const W = [
  // üst kütle: çatı, baca, pencere, taş sütun
  'M236 158 L300 48 L858 188 L846 204 L306 66 Z', 'M268 84 V8 H360 V70',
  'M340 172 V196', 'M485 160 L690 205 L690 440 L603 434', 'M603 186 V434', 'M485 160 V252',
  'M690 246 V706', 'M782 262 V706',
  // sol alt kütle: saçak, ahşap cephe, pergole, cam doğrama
  'M0 108 L340 186', 'M0 130 L600 255 V742', 'M0 236 L408 300', 'M410 300 V745',
  'M495 396 V750', 'M526 402 V750', 'M0 326 L500 392', 'M0 366 L500 416',
  'M34 280 L10 386', 'M126 296 L62 410', 'M214 306 L132 420', 'M300 318 L205 426', 'M372 330 L258 432', 'M440 342 L312 438',
  'M0 440 L376 462 V742', 'M198 452 V742', 'M328 458 V740',
  // orta kütle
  'M782 278 L1022 322 L1010 336 L782 294', 'M800 345 H890 V478 H800 Z', 'M960 360 V420',
  'M780 476 L965 490', 'M780 494 L965 508', 'M786 548 H896 V702', 'M786 548 V702', 'M900 520 V698',
  // sağ kütle: konsol saçak, taş kutu, kapı
  'M962 420 L1296 468 V500 L1036 484', 'M962 420 V698', 'M1036 484 V698',
  'M1036 500 H1186 V698', 'M1066 566 H1156 V698 M1066 566 V698', 'M1066 510 H1156 V540 H1066 Z',
  // teras, basamaklar, çit
  'M0 780 L1133 727 L1265 717', 'M0 887 L1300 800', 'M0 1000 L1400 873', 'M0 1167 L800 1000 L1400 873',
  // ahşap kaplama derzleri (ayrıntı)
  'M416 340 L596 346', 'M416 390 L596 395', 'M416 440 L596 444', 'M416 490 L596 493', 'M416 540 L596 542', 'M416 590 L596 591', 'M416 640 L596 640', 'M416 690 L596 689',
  'M968 460 L1030 470', 'M968 520 L1030 526', 'M968 580 L1030 584', 'M968 640 L1030 642',
  'M1186 612 L2000 600', 'M1186 692 L2000 690', 'M1265 716 L2000 706',
];
// Yalnızca çizimde görünen ölçü ve kot işaretleri
const kot = (y, x1, t) => `<g class="k"><path class="a" d="M${x1} ${y} H1250" pathLength="1"/><path class="a f" d="M1250 ${y} l-16 -26 h32 Z" pathLength="1"/><text x="1274" y="${y - 6}">${t}</text></g>`;
const dim = [[0, 410, '4,10'], [410, 690, '2,80'], [690, 962, '2,72'], [962, 1296, '3,34']];
const A = [
  kot(188, 870, '+7,20'), kot(440, 1030, '+3,60'), kot(716, 1275, '±0,00'),
  `<path class="a" d="M0 1250 H1296" pathLength="1"/>`,
  ...[0, 410, 690, 962, 1296].map((x) => `<path class="a" d="M${x} 1210 V1285 M${x - 14} 1264 l28 -28" pathLength="1"/>`),
  ...dim.map(([a, b, t]) => `<text x="${(a + b) / 2}" y="1234" text-anchor="middle">${t}</text>`),
  `<text x="648" y="1316" text-anchor="middle" class="t2">13,36 m</text>`,
  // kuzey oku + ölçek çubuğu (gökyüzünde)
  `<g transform="translate(1640 170)"><circle class="a" cx="0" cy="0" r="54" pathLength="1"/><path class="a f" d="M0 -48 L18 28 L0 14 L-18 28 Z" pathLength="1"/><text x="0" y="-70" text-anchor="middle">K</text></g>`,
];
const pathsW = W.map((p) => `<path d="${p}" pathLength="1"/>`).join('');
const inkSvg = $('[data-ink]');
const ghostSvg = $('[data-ghost]');
inkSvg.innerHTML = `<g class="w">${pathsW}</g><g class="an">${A.join('')}</g>`;
ghostSvg.innerHTML = `<g class="w">${pathsW}</g>`;
$$('path', inkSvg).forEach((p, i) => p.style.setProperty('--i', i));

const hero = $('.hero');
const frame = $('[data-frame]');
const art = $('[data-art]');
const photo = $('.sheet__photo');
const beam = $('[data-beam]');
const durum = $('[data-durum]');
const yuzde = $('[data-yuzde]');
const bar = $('[data-bar]');
const tag = $('[data-sheet-tag]');
const damga = $('[data-damga]');
if (!small) $('.antet__kapsam').append(damga);
const FOCUS = small ? 0.33 : 0.36; // yapının ortası (görsel genişliğine oran)

let geo = { fw: 0, aw: 0, left: 0 };
function place() {
  const fw = frame.clientWidth, fh = frame.clientHeight;
  const s = Math.max(fw / 2000, fh / 1335);
  const aw = 2000 * s, ah = 1335 * s;
  const left = Math.min(0, Math.max(fw - aw, fw / 2 - FOCUS * aw));
  const topY = (fh - ah) * 0.5;
  Object.assign(art.style, { width: `${aw}px`, height: `${ah}px`, left: `${left.toFixed(1)}px`, top: `${topY.toFixed(1)}px` });
  geo = { fw, aw, left };
}

let cur = -1, phase = '';
function setSweep(p) {
  cur = p;
  const bx = -40 + (geo.fw + 80) * p; // ışık çubuğunun çerçevedeki yeri
  const xa = Math.max(0, Math.min(geo.aw, bx - geo.left));
  beam.style.transform = `translate3d(${bx.toFixed(1)}px,0,0)`;
  beam.style.opacity = p <= 0.001 || p >= 0.999 ? '0' : '1';
  const clipR = `inset(0 ${(geo.aw - xa).toFixed(1)}px 0 0)`;
  photo.style.clipPath = clipR;
  ghostSvg.style.clipPath = clipR;
  inkSvg.style.clipPath = `inset(0 0 0 ${xa.toFixed(1)}px)`;
  const pct = Math.round(p * 100);
  yuzde.textContent = `%${pct}`;
  bar.style.transform = `scaleX(${p.toFixed(3)})`;
  const ph = p < 0.01 ? 'c' : p < 0.99 ? 'i' : 'y';
  if (ph !== phase) {
    phase = ph;
    durum.textContent = ph === 'c' ? 'Çizim' : ph === 'i' ? 'Işıkta' : 'Yapı';
    tag.textContent = ph === 'y' ? 'GÜNEY CEPHESİ · 1/1' : 'GÜNEY CEPHESİ · 1/100';
    hero.classList.toggle('is-built', ph === 'y');
  }
}
place();
addEventListener('resize', () => { place(); setSweep(Math.max(cur, 0)); });

if (reducedMotion) {
  hero.classList.add('is-drawn');
  setSweep(1);
} else {
  setSweep(0);
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-drawn')));
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.2 : 1.5)}`,
      pin: '.hero__pin', scrub: 0.6, anticipatePin: 1,
    },
  });
  const m = { p: 0 };
  tl.to(m, { p: 1, duration: 1, ease: 'power1.inOut', onUpdate: () => setSweep(m.p) }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.1 }, 0)
    .fromTo(art, { scale: 1 }, { scale: 1.04, duration: 1.15, transformOrigin: '40% 60%' }, 0)
    .fromTo(damga, { opacity: 0, scale: 1.8, rotate: -24 }, { opacity: 1, scale: 1, rotate: -9, duration: 0.12, ease: 'back.out(2)' }, 1.02)
    .to({}, { duration: 0.14 });

  // Açılış
  gsap.from('.antet > *:not(.antet__damga)', { y: 18, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power2.out', delay: 0.15 });
}
if (reducedMotion) gsap.set(damga, { opacity: 1, rotate: -9 });

// --- Hizmetler: pafta listesi ------------------------------------------------
const list = $('[data-services]');
list.innerHTML = d.hizmetler.map((h, i) => `
  <li class="row${i === 0 ? ' is-open' : ''}">
    <button type="button" class="row__btn" aria-expanded="${i === 0}" aria-controls="p${i}" data-i="${i}">
      <span class="row__kod mono">${esc(d.paftaKodlari[i] || `P-${String(i + 1).padStart(2, '0')}`)}</span>
      <span class="row__ad">${esc(h.baslik)}</span>
      <span class="row__sure mono">${esc(h.sure)}</span>
      <span class="row__plus" aria-hidden="true"></span>
    </button>
    <div class="row__panel" id="p${i}" role="region">
      <div class="row__in">
        <p class="row__desc">${esc(h.aciklama)}</p>
        ${h.gorsel ? `<img class="row__img" src="${esc(img(h.gorsel))}" alt="${esc(h.baslik)}" loading="lazy" decoding="async" />` : ''}
      </div>
    </div>
  </li>`).join('');
const view = $('[data-view]');
const viewImg = $('img', view);
const viewCap = $('[data-view-cap]');
function showView(i) {
  const h = d.hizmetler[i];
  if (!h?.gorsel) return;
  const src = img(h.gorsel);
  if (viewImg.getAttribute('src') !== src) {
    viewImg.src = src;
    if (!reducedMotion) gsap.fromTo(viewImg, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power3.out' });
  }
  viewCap.textContent = `${d.paftaKodlari[i] || ''} · ${h.baslik}`;
}
function openRow(i) {
  $$('.row', list).forEach((r, k) => {
    const on = k === i ? !r.classList.contains('is-open') || !small : false;
    r.classList.toggle('is-open', on);
    $('.row__btn', r).setAttribute('aria-expanded', String(on));
  });
  showView(i);
  setTimeout(() => ScrollTrigger.refresh(), 450);
}
list.addEventListener('click', (e) => {
  const b = e.target.closest('.row__btn');
  if (b) openRow(Number(b.dataset.i));
});
if (!small) list.addEventListener('mouseover', (e) => {
  const b = e.target.closest('.row__btn');
  if (b) showView(Number(b.dataset.i));
});
showView(0);

// --- Rakamlar: ölçü çizgileri -------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${nf(s.deger)}</span><small>${esc(s.sonek)}</small></p>
    <span class="stat__dim" aria-hidden="true"><i></i></span>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- İmar ön hesabı ----------------------------------------------------------
const form = $('[data-imar]');
const svg = $('[data-imar-svg]');
const imarWa = $('[data-imar-wa]');
$('[data-imar-not]').textContent = d.imar.not;
form.arsa.value = d.imar.arsa;
form.emsal.value = d.imar.emsal;
form.taks.value = d.imar.taks;
function imar() {
  const arsa = Number(form.arsa.value), emsal = Number(form.emsal.value), taks = Number(form.taks.value);
  const taban = arsa * taks, toplam = arsa * emsal;
  const k = toplam / taban;
  $('[data-out="arsa"]').textContent = `${nf(arsa)} m²`;
  $('[data-out="emsal"]').textContent = nf(emsal, 2);
  $('[data-out="taks"]').textContent = nf(taks, 2);
  $('[data-r="taban"]').textContent = `${nf(taban)} m²`;
  $('[data-r="toplam"]').textContent = `${nf(toplam)} m²`;
  const kat = Math.abs(k - Math.round(k)) < 0.05 ? `${Math.round(k)}` : `${Math.floor(k)}–${Math.ceil(k)}`;
  $('[data-r="kat"]').textContent = kat;
  $$('input[type=range]', form).forEach((r) => r.style.setProperty('--v', ((r.value - r.min) / (r.max - r.min)).toFixed(3)));

  // Plan: arsa kareye, bina taban alanı oranında içine
  const P = 170, px = 18, py = 50;
  const b = P * Math.sqrt(taks);
  const bx = px + (P - b) / 2, by = py + (P - b) * 0.4;
  // Kesit: katlar üst üste
  const floors = Math.min(12, Math.ceil(k - 0.05));
  const fh = Math.min(26, 168 / Math.max(floors, 1));
  const ew = Math.max(40, b * 0.9), ex = 300 - ew / 2, base = 220;
  let fl = '';
  for (let i = 0; i < floors; i++) {
    const partial = i === floors - 1 && k % 1 > 0.05 && k % 1 < 0.95;
    fl += `<rect class="${partial ? 'fl fl--p' : 'fl'}" x="${ex}" y="${base - (i + 1) * fh}" width="${partial ? ew * (k % 1) : ew}" height="${fh - 3}"/>`;
  }
  svg.innerHTML = `
    <defs><pattern id="tr" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" class="hatch"/></pattern></defs>
    <text x="${px}" y="26" class="lb">PLAN</text>
    <rect x="${px}" y="${py}" width="${P}" height="${P}" class="parsel"/>
    <rect x="${bx}" y="${by}" width="${b}" height="${b}" class="taban"/>
    <rect x="${bx}" y="${by}" width="${b}" height="${b}" fill="url(#tr)"/>
    <text x="${px + P / 2}" y="${py + P + 22}" text-anchor="middle" class="lb2">${nf(arsa)} m² arsa</text>
    <text x="232" y="26" class="lb">KESİT</text>
    <path d="M226 ${base} H392" class="zemin"/>
    ${fl}
    ${k > 12 ? `<text x="300" y="${base - 12 * fh - 8}" text-anchor="middle" class="lb2">+${nf(Math.ceil(k) - 12)} kat</text>` : ''}
    <text x="300" y="${base + 22}" text-anchor="middle" class="lb2">≈ ${kat} kat</text>`;
  imarWa.href = wa(`Merhaba ${d.isletme.ad}, ${nf(arsa)} m² arsam var (emsal ${nf(emsal, 2)}, TAKS ${nf(taks, 2)}). Ne yapılabileceğini konuşmak istiyorum.`);
}
form.addEventListener('input', imar);
imar();

// --- Süreç: ölçek ölçek -------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <p class="step__olcek" aria-hidden="true">${esc(d.olcekler[i] || '')}</p>
    <div class="step__body">
      <p class="step__no mono">${String(i + 1).padStart(2, '0')} <span>Ölçek ${esc(d.olcekler[i] || '')}</span></p>
      <h3 class="step__title">${esc(s.baslik)}</h3>
      <p class="step__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = ['cizim-masasi', 'maket-ahsap', 'bilgisayar', 'maket', 'ticari-yapi', 'ic-mekan', 'restorasyon', 'salon'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i}"><img src="${esc(img(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption><span class="mono">Şekil ${String(i + 1).padStart(2, '0')}</span>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__proje mono">${esc(y.arac)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</span></p>
  </li>`).join('');

// --- Programlar ---------------------------------------------------------------
const row = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true">/</i>`).join('');
$('[data-brands]').innerHTML = `<div class="marka__row">${row}</div><div class="marka__row" aria-hidden="true">${row}</div>`;

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const t = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${t >= a && t <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  gsap.from('.row', { y: 18, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: '.pafta__list', start: 'top 86%' } });

  $$('.stat').forEach((st) => {
    const el = $('[data-count]', st);
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    const tl = gsap.timeline({ scrollTrigger: { trigger: st, start: 'top 90%' } });
    tl.fromTo($('.stat__dim', st), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, 0)
      .to(o, { v: to, duration: 1.5, ease: 'power2.out', onUpdate: () => (el.textContent = nf(o.v)) }, 0.1);
  });

  gsap.from('.imar__box', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.imar__box', start: 'top 88%' } });

  gsap.fromTo('.surec__list', { '--prog': 0 }, { '--prog': 1, ease: 'none', scrollTrigger: { trigger: '.surec__list', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 } });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 72%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on') });
    gsap.from($('.step__olcek', s), { xPercent: -12, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
  });

  gsap.fromTo('.ofis__photo img', { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.ofis', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.rev-not', { rotate: -3, y: 30, opacity: 0, duration: 0.8, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.rev-not', start: 'top 90%' } });
  $$('.shot').forEach((s) => gsap.fromTo(s, { clipPath: 'inset(12% 12% 12% 12%)', opacity: 0.3 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%' } }));
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__bg', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-on'));
  $('.surec__list').style.setProperty('--prog', 1);
}

addEventListener('load', () => { place(); setSweep(Math.max(cur, 0)); ScrollTrigger.refresh(); });
