// Ayna (klasik aile, diş kliniği): koyu şişe yeşili, nane yeşili vurgu, soğuk beyaz kâğıt.
// Fotoğraf ağırlıklı, WebGL yok.
// Künye hero'da; yanında 32 dişlik şema ve diş aynası. Ayna açılışta bir kez alt çenede birkaç diş
// ilerler, kaydırdıkça (pin yok) yoluna devam eder. Aynanın içinden klinik fotoğrafı net ve renkli görünür.
// Sayaç ya da "muayene edildi" göstergesi yok.
import sektor from '../../data/sektor-dis.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(sektor);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const SVGNS = 'http://www.w3.org/2000/svg';
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;

// Klinik için WhatsApp mesajı (çekirdeğin varsayılan mesajı araç içindir): alt çubuk dahil.
const waGenel = waHref(d, d.waMesaj || 'Merhaba, muayene için randevu almak istiyorum.');
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waGenel));

// --- Arama motoru: diş kliniği --------------------------------------------------------
(function dentistLd() {
  $$('script[type="application/ld+json"]').forEach((x) => x.textContent.includes('"AutoRepair"') && x.remove());
  const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((x, i) => (x ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: x.split('-')[0], closes: x.split('-')[1] } : null))
      .filter(Boolean),
  });
  document.head.append(ld);
  // Klinik Şaşmaz sanayisinde değil: başlıkta semti yaz
  document.title = `${d.isletme.ad} | ${d.isletme.sektor} | Etimesgut, Ankara`;
})();

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, tanim: d.isletme.tanim, telefon: d.iletisim.telefon,
  adres: d.iletisim.adres, kisaAdres: kisaAdres(d.iletisim.adres),
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa-randevu]').forEach((a) => (a.href = waGenel));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
if (d.isletme.ad.length > 16) $('.hero__name').classList.add('is-long');
if (d.isletme.ad.length > 26) $('.hero__name').classList.add('is-xlong');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-hizmet-not]').textContent = d.hizmetNot || '';
$('[data-year]').textContent = new Date().getFullYear();

function refreshStatus() {
  const st = gunDurumu(d.saatler);
  document.documentElement.classList.toggle('is-open', st.open);
  $$('[data-status]').forEach((el) => {
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? st.kunye : st.metin;
  });
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Hero: diş şeması ---------------------------------------------------------------
// FDI numaralandırma. k: 0 = orta kesici … 7 = yirmilik
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
const LENS = 96;
ring.setAttribute('r', LENS);
const narrow = matchMedia('(max-width: 899px)').matches;
const VB = narrow ? { x: 112, y: 112, w: 776 } : { x: 88, y: 88, w: 824 };
svg.setAttribute('viewBox', `${VB.x} ${VB.y} ${VB.w} ${VB.w}`);

let map = { s: 1, ox: 0, oy: 0 };
function measure() {
  const sr = stage.getBoundingClientRect();
  const ar = svg.getBoundingClientRect();
  const sc = Math.min(ar.width, ar.height) / VB.w;
  map = {
    s: sc,
    ox: ar.left - sr.left + (ar.width - VB.w * sc) / 2 - VB.x * sc,
    oy: ar.top - sr.top + (ar.height - VB.w * sc) / 2 - VB.y * sc,
  };
}

// Aynanın yolu: p 0 = 18, p 1 = 48 (üst çene soldan sağa, alt çene sağdan sola).
let cur = 0;
function setMirror(p) {
  cur = p;
  const q = Math.min(Math.max(p, 0), 1) * 31;
  const i = Math.floor(q), f = q - i;
  const a = teeth[i], b = teeth[Math.min(i + 1, 31)];
  const x = a.x + (b.x - a.x) * f;
  const y = a.y + (b.y - a.y) * f;
  // Sap: aynadan ağız dışına doğru
  const vx = x - 500, vy = y - 500, len = Math.hypot(vx, vy) || 1;
  const hx = x + (vx / len) * (LENS + 4), hy = y + (vy / len) * (LENS + 4);
  const ex = x + (vx / len) * (LENS + 190), ey = y + (vy / len) * (LENS + 190);
  ring.setAttribute('cx', x.toFixed(1));
  ring.setAttribute('cy', y.toFixed(1));
  handle.setAttribute('x1', hx.toFixed(1)); handle.setAttribute('y1', hy.toFixed(1));
  handle.setAttribute('x2', ex.toFixed(1)); handle.setAttribute('y2', ey.toFixed(1));
  // Ayna içi: net fotoğraf
  const px = map.ox + x * map.s, py = map.oy + y * map.s;
  net.style.clipPath = `circle(${(LENS * map.s).toFixed(1)}px at ${px.toFixed(1)}px ${py.toFixed(1)}px)`;
  // Aynanın altındaki diş vurgulanır (yalnız o an; sayaç yok).
  const n = Math.round(q);
  teeth.forEach((th, k) => {
    const on = k === n;
    if (th.on !== on) { th.on = on; th.el.classList.toggle('is-ok', on); th.num.classList.toggle('is-ok', on); }
  });
}

measure();
const yol = { a: 0, b: 0 };
// Alt çenede: sap aşağı baktığı için üst çubuğa uzanmaz. 38'den başlar, 35'e gelir, kaydırdıkça 42'ye ilerler.
const mirrorAt = () => setMirror(0.5 + 0.1 * yol.a + 0.17 * yol.b);
if (reducedMotion) {
  yol.a = 1;
  mirrorAt();
} else {
  mirrorAt();
  // Açılış: ayna bir kez birkaç diş ilerler (≈1,4 sn), kaydırma kilitlenmez.
  gsap.to(yol, { a: 1, duration: 1.4, ease: 'power2.inOut', delay: 0.35, onUpdate: mirrorAt });
  gsap.to(yol, { b: 1, ease: 'none', onUpdate: mirrorAt, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.5 } });
  gsap.from('.hero__copy > *', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.05, clearProps: 'opacity,visibility,transform' });
  gsap.from('.tooth', { opacity: 0, duration: 0.4, stagger: { each: 0.02, from: 'center' }, ease: 'power1.out', delay: 0.1 });
  gsap.from('.mirror', { opacity: 0, duration: 0.5, delay: 0.3 });
}
addEventListener('resize', () => { measure(); setMirror(cur); });

// --- Hakkında ------------------------------------------------------------------
const yil = new Date().getFullYear() - d.isletme.kurulus;
const yer = d.isletme.yer || "Etimesgut'ta";
$('[data-hakkinda]').textContent = `${d.isletme.ad} ${yilEki(d.isletme.kurulus)} beri ${yer}. ${d.isletme.hakkinda}`;
$('[data-facts]').innerHTML = (d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
// Rakamlar yalnız olgu: kuruluştan geçen yıl, haftada açık gün.
$('[data-stats]').innerHTML = [
  { n: yil, u: ' yıl', l: yer },
  { n: acikGunSayisi(d.saatler), u: ' gün', l: 'haftada açık' },
].map((x) => `<li class="stat"><p class="stat__val"><span>${x.n}</span><small>${esc(x.u)}</small></p><p class="stat__lbl">${esc(x.l)}</p></li>`).join('');

// --- Hizmetler ---------------------------------------------------------------
const local = (src) => String(src || '').replace('/sektor-dis/', '/dis-klasik/');
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc" data-i="${i}">
    <img class="svc__img" src="${esc(local(h.gorsel))}" alt="" loading="lazy" decoding="async" />
    <div class="svc__body">
      <p class="svc__top mono"><span>${String(i + 1).padStart(2, '0')}</span><span>${h.sure ? `<span class="sr-only">Süre: </span>${esc(h.sure)}` : ''}</span></p>
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
      ${h.mesaj ? `<a class="svc__wa" href="${esc(waHref(d, h.mesaj))}" target="_blank" rel="noopener">${icons.whatsapp}WhatsApp'tan randevu</a>` : ''}
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
  tedCap.textContent = d.hizmetler[i].baslik;
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

// --- Galeri ------------------------------------------------------------------
const gal = ['muayenehane', 'alet-seti', 'ekip', 'implant', 'klinik', 'aletler'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i + 1}"><img src="${esc(local(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Örnek yorumlar ------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><span class="rev__ini" aria-hidden="true">${esc(String(y.ad).charAt(0))}</span><strong>${esc(y.ad)}</strong>${y.arac ? `<span class="rev__konu">${esc(y.arac)}</span>` : ''}</p>
  </li>`).join('');

// --- Çalışma saatleri -------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const today = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = saatListesi(d.saatler).map(([days, val]) => {
  const r = days.split('–');
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
if (narrow) autoHideHeader(top, { offset: 120 });

// --- Bölüm hareketleri (sakin: bir kez, küçük kayma) ------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));
  gsap.from('.svc', { [narrow ? 'x' : 'y']: 36, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: '.ted__list', start: 'top 88%' } });
  gsap.fromTo('.surec__photo img', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.surec', start: 'top bottom', end: 'center center', scrub: true } });
  $$('.shot').forEach((x) => gsap.fromTo(x, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1, ease: 'power2.out', scrollTrigger: { trigger: x, start: 'top 92%' } }));
  gsap.from('.rev', { y: 24, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 90%' } });
  gsap.fromTo('.final__lens', { clipPath: 'circle(14% at 50% 45%)' }, { clipPath: 'circle(80% at 50% 45%)', ease: 'none', scrollTrigger: { trigger: '.final', start: 'top 90%', end: 'center 55%', scrub: 0.4 } });
}

addEventListener('load', () => { measure(); setMirror(cur); ScrollTrigger.refresh(); });
