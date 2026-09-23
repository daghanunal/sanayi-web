import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld, NODES } from './scene.js';
import { createFilm } from './film.js';
import { createArcLayer, scramble, magnetic, initCursor, velocityMarquee } from './fx.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const lowTier = phone || (navigator.hardwareConcurrency || 8) <= 4;
matchMedia('(max-width: 899px)').addEventListener('change', () => location.reload());

const ad = esc(d.isletme.ad);
const yil = new Date().getFullYear();
const tecrube = yil - d.isletme.kurulus;

// "2001'den", "1994'ten", "2010'dan" gibi: sayının okunuşuna göre ek.
function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}

// Arıza kodlarının araçtaki yerleri (sıra: veri dosyasındaki sıra)
const FAULT_NODES = ['coils', 'maf', 'ecu', 'alt'];
const faults = (d.arizaKodlari || []).slice(0, 4).map((f, i) => ({ ...f, node: FAULT_NODES[i] }));

// Hizmet → araçtaki bileşenler, ölçüm satırı
const SERVICE_MAP = [
  { re: /tespit/i, key: 'diag', nodes: ['obd', 'dash', 'ecu'], tag: 'OBD-II', read: 'Bağlandı, 4 kod okundu' },
  { re: /beyin|ecu/i, key: 'ecu', nodes: ['ecu'], tag: 'ECU', read: 'Besleme 12,4 V, CAN hattı aktif' },
  { re: /akü|marş|dinamo/i, key: 'bat', nodes: ['bat', 'starter', 'alt'], tag: 'Akü', read: 'Akü 12,6 V, şarj 14,2 V' },
  { re: /klima/i, key: 'klima', nodes: ['klima'], tag: 'Klima', read: 'Kavrama bobini 3,4 Ω' },
  { re: /far|aydınlatma/i, key: 'far', nodes: ['hlL', 'hlR', 'tlL', 'tlR'], tag: 'Far', read: 'Huzme eğimi %1,2, ayarlı' },
  { re: /hibrit/i, key: 'hv', nodes: ['hv'], tag: 'HV', read: 'Batarya 201,6 V, 168 hücre dengede' },
  { re: /tesisat|kablo/i, key: 'wire', nodes: null, tag: 'Tesisat', read: '20 hat ölçüldü, kopukluk yok' },
];
const services = d.hizmetler.map((h, i) => ({ ...h, map: SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[6] }));

// --- Render ------------------------------------------------------------------------------

const status = openStatus(d.saatler);
const bolt = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4.5 13.5h6.2L9.5 22l9.8-12.6h-6.4z" fill="currentColor"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne" data-hot>${bolt}<span>${ad}</span></a>
  <p class="top__status ${status.open ? 'is-open' : ''}"><i></i><span class="top__status-long">${esc(status.text)}</span><span class="top__status-short">${status.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`;

$('#intro-name').textContent = d.isletme.ad;

const heroWords = ['Aracınızın', 'içini', 'görürüz.'];
$('#sahne').innerHTML = `
  <div class="hero__inner">
    <p class="hero__kicker mono"><span class="hero__live"></span>Şaşmaz Oto Sanayi, ${beri(d.isletme.kurulus)} beri</p>
    <h1 class="hero__title" id="hero-title">
      <span class="hero__layer hero__layer--outline" aria-hidden="true">${heroWords.map((w) => `<span class="hero__word">${w}</span>`).join(' ')}</span>
      <span class="hero__layer hero__layer--fill">${heroWords.map((w) => `<span class="hero__word">${w}</span>`).join(' ')}</span>
      <span class="hero__scanline" aria-hidden="true"></span>
    </h1>
    <p class="hero__sub">${esc(d.isletme.slogan)} Arızayı tahmin etmeyiz, cihaza bağlar ve ölçeriz.</p>
    <div class="hero__cta">
      <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
  </div>
  <div class="hero__readout mono" aria-hidden="true">
    <p><span>Tarama</span><b id="scan-pct">%0</b></p>
    <p><span>Bulunan arıza</span><b id="scan-found">0</b></p>
  </div>
  <p class="hero__hint mono" aria-hidden="true">Kaydırın, tarama başlasın</p>`;

$('#arizalar').innerHTML = `
  <div class="faults__panel">
    <h2 class="kinetic" id="faults-title" data-kinetic>Hata kodu okunur, sebebi bulunur.</h2>
    <p class="faults__count mono"><b id="fault-count">${faults.length}</b> <span id="fault-count-label">aktif arıza kaydı</span></p>
    <ol class="faults__list">
      ${faults.map((f, i) => `
        <li class="fault" data-i="${i}">
          <p class="fault__code mono">${esc(f.kod)}</p>
          <div class="fault__body">
            <p class="fault__what">${esc(f.anlam)}</p>
            <p class="fault__fix">${esc(f.cozum)}</p>
          </div>
          <p class="fault__state mono">Arıza</p>
        </li>`).join('')}
    </ol>
  </div>`;

$('#tags').innerHTML = faults.map((f, i) => `<span class="tag mono" data-i="${i}">${esc(f.kod)}</span>`).join('');

const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? tecrube : s.deger }));
$('#olcum').innerHTML = `
  <div class="about__inner">
    <h2 class="kinetic" id="about-title" data-kinetic>Tahmin etmeyiz, ölçeriz.</h2>
    <p class="about__text" id="about-text">${esc(d.isletme.hakkinda)}</p>
    <dl class="stats">
      ${stats.map((s) => `
        <div class="stat">
          <dt>${esc(s.etiket)}</dt>
          <dd><span class="stat__num" data-to="${s.deger}">0</span><span class="stat__unit mono">${esc(s.birim || s.sonek || '')}</span></dd>
        </div>`).join('')}
    </dl>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="services__head">
    <h2 class="kinetic" id="services-title" data-kinetic>Aracın neresinde akım varsa, oraya bakarız.</h2>
  </div>
  ${services.map((s, i) => `
    <article class="svc" data-i="${i}" data-key="${s.map.key}">
      <div class="svc__card">
        <p class="svc__tag mono">${s.map.tag}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        <div class="svc__meter" aria-hidden="true"><i></i></div>
        <p class="svc__read mono">${s.map.read}</p>
        <p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>
        <a class="svc__ask" href="${waHref(d, `Merhaba ${d.isletme.ad}, ${s.baslik} için bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu iş için WhatsApp'tan sor</span></a>
      </div>
    </article>`).join('')}`;

$('#surec').innerHTML = `
  <div class="process__inner">
    <h2 class="kinetic" id="process-title" data-kinetic>Arızadan teslime dört adım.</h2>
    <div class="process__ring" aria-hidden="true">
      <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="54"/><circle class="ring-fg" id="ring" cx="60" cy="60" r="54"/></svg>
      <p class="mono"><b id="ring-step">1</b>/${d.surec.length}</p>
    </div>
    <ol class="steps">
      ${d.surec.map((s, i) => `<li class="step" data-i="${i}"><span class="step__n mono">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('')}
    </ol>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
const reviewCard = (r) => `
  <figure class="review">
    <p class="review__stars" aria-label="${r.puan} yıldız">${stars(r.puan)}</p>
    <blockquote>${esc(r.metin)}</blockquote>
    <figcaption><b>${esc(r.ad)}</b> <span>${esc(r.arac || '')}</span></figcaption>
  </figure>`;
const half = Math.ceil(d.yorumlar.length / 2);
const rowA = d.yorumlar.slice(0, half).map(reviewCard).join('');
const rowB = d.yorumlar.slice(half).concat(d.yorumlar.slice(0, 1)).map(reviewCard).join('');
$('#yorumlar').innerHTML = `
  <div class="reviews__head">
    <p class="reviews__score"><b id="score" data-to="${d.puan.ortalama}">0,0</b><span class="mono">${d.puan.adet} Google yorumu</span></p>
    <h2 class="kinetic" id="reviews-title" data-kinetic>Lamba söndü, müşteri yazdı.</h2>
  </div>
  <div class="marquee"><div class="marquee__track" data-dir="1">${rowA}${rowA}</div></div>
  <div class="marquee"><div class="marquee__track" data-dir="-1">${rowB}${rowB}</div></div>`;

const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>${bolt}`).join('');
$('#markalar').innerHTML = `
  <p class="brands__lead mono">Yerli, Avrupa, Uzak Doğu: her markanın beynini okuruz.</p>
  <div class="marquee marquee--big"><div class="marquee__track" data-dir="1">${brandRow}${brandRow}</div></div>`;

const todayName = GUNLER[new Date().getDay()];
$('#dukkan').innerHTML = `
  <div class="shop__inner">
    <div class="shop__info">
      <h2 class="kinetic" id="shop-title" data-kinetic>Gelin, cihaza bağlayalım.</h2>
      <p class="shop__status ${status.open ? 'is-open' : ''}"><i></i>${esc(status.text)}</p>
      <table class="hours">
        <tbody>
          ${groupedHours(d.saatler).map(([g, h]) => `<tr class="${g.includes(todayName) ? 'is-today' : ''}"><th>${g}</th><td class="mono">${h}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="shop__addr">${esc(d.iletisim.adres)}</p>
      <div class="shop__cta">
        <a class="btn btn--main" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      </div>
    </div>
    <div class="shop__map" id="map"></div>
  </div>`;

$('#iletisim').innerHTML = `
  <div class="finale__inner">
    <p class="finale__kicker mono" id="finale-kicker">Sistem kontrolü</p>
    <h2 class="finale__title" id="finale-title">Lamba yandıysa, bir telefon uzağız.</h2>
    <div class="finale__cta">
      <a class="btn btn--main btn--xl" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
    <p class="finale__note">${esc(d.garanti || '')}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__inner">
    <p class="foot__brand">${bolt}<span>${ad}</span></p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="foot__small">© ${yil} ${ad}. 3D araç modeli: vicent091036, CC BY 4.0.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir
new IntersectionObserver((entries, io) => {
  if (entries.some((e) => e.isIntersecting)) {
    $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  }
}, { rootMargin: '600px' }).observe($('#map'));

// --- 3D dünya ----------------------------------------------------------------------------

const canvas = $('#gl');
const world = createWorld(canvas, { lowTier });
const resize = () => {
  world.resize(innerWidth, innerHeight);
  // Telefonda hizmet kartı, panel boyunca aksiyon çubuğunun hemen üstünde durur.
  if (phone) $$('.svc__card').forEach((c) => c.style.setProperty('--stick', `${innerHeight - 100 - c.offsetHeight}px`));
};
resize();
addEventListener('resize', resize);

let loadProgress = 0;
const loading = world.load((p) => (loadProgress = p)).then(() => {
  loadProgress = 1;
  gsap.to(canvas, { opacity: 1, duration: 1.2, ease: 'power2.out' });
});

// Kamera çekimleri. Masaüstünde araç metnin karşı tarafında, telefonda üst yarıda.
const cam = (o) => ({
  tx: 0, ty: 0.45, tz: 0, fov: 34, sx: 0, sy: phone ? -0.2 : 0,
  ...o,
  dist: (o.dist ?? 6.2) * (phone ? (o.close ? 2.1 : 1.55) : 1),
  close: undefined,
});
const SHOT = {
  heroA: cam({ az: 2.3, el: 0.1, dist: 6.3, sx: phone ? 0 : 0.2 }),
  heroB: cam({ az: 1.7, el: 0.17, dist: 6.0, sx: phone ? 0 : 0.2 }),
  faultsA: cam({ tz: 0.1, az: 2.1, el: 0.95, dist: 6.6, sx: phone ? 0 : 0.2, sy: phone ? -0.24 : 0 }),
  faultsB: cam({ tz: 0.1, az: 1.45, el: 1.08, dist: 6.4, sx: phone ? 0 : 0.2, sy: phone ? -0.24 : 0 }),
  aboutA: cam({ az: 0.95, el: -0.01, dist: 5.8, sx: phone ? 0 : -0.2 }),
  aboutB: cam({ az: 0.55, el: 0.04, dist: 5.6, sx: phone ? 0 : -0.2 }),
  process: cam({ az: 1.6, el: 0.36, dist: 6.8, sx: phone ? 0 : 0.18, sy: phone ? -0.22 : 0.03 }),
  reviews: cam({ az: 8.5, el: 0.22, dist: 9, sy: phone ? -0.1 : 0.05 }),
  brands: cam({ az: 9.1, el: 0.3, dist: 9.5 }),
  finaleA: cam({ tz: -0.3, az: 10.2, el: 0.02, dist: 7.2, sy: phone ? 0.02 : 0.1 }),
  finaleB: cam({ tz: -0.3, az: 10.0, el: 0.08, dist: 6.2, sy: phone ? 0.02 : 0.1 }),
};
const nodeShot = (names, o) => {
  const pts = names.map((n) => NODES[n].p);
  const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  return cam({ tx: c[0], ty: c[1], tz: c[2], close: true, sx: phone ? 0 : 0.2, sy: phone ? -0.2 : 0, ...o });
};
const SERVICE_SHOTS = {
  diag: () => nodeShot(['obd', 'dash', 'ecu'], { az: 2.75, el: 0.45, dist: 2.4 }),
  ecu: () => nodeShot(['ecu'], { az: 2.0, el: 0.7, dist: 2.1 }),
  bat: () => nodeShot(['bat', 'starter', 'alt'], { az: 1.5, el: 0.55, dist: 5.4 }),
  klima: () => nodeShot(['klima'], { az: 3.5, el: 0.3, dist: 2.3 }),
  far: () => cam({ tx: 0.1, ty: 0.45, tz: -2.6, az: 2.05, el: 0.2, dist: 5.2, sx: phone ? 0 : 0.2, beam: 1 }),
  hv: () => nodeShot(['hv'], { az: 1.25, el: 0.75, dist: 2.8 }),
  wire: () => cam({ tz: 0, az: 1.57, el: 1.3, dist: 6.4, sx: phone ? 0 : 0.2, flow: 1 }),
};

// --- Film --------------------------------------------------------------------------------

const F = {
  ...SHOT.heroA, scan: -2.8, xray: 1, harness: 0, flow: 0.15, dim: 0, power: 0, beam: 0, grid: 1, fault: 0, tags: 0,
};
Object.assign(world.P, F);

const kineticSplits = [];
function kinetic() {
  for (const h of $$('[data-kinetic]')) {
    const split = new SplitText(h, { type: 'words,chars', wordsClass: 'kw', charsClass: 'kc' });
    kineticSplits.push(split);
    gsap.fromTo(split.chars, { '--w': 50, opacity: 0.12 }, {
      '--w': 96, opacity: 1, stagger: 0.02, ease: 'none',
      scrollTrigger: { trigger: h, start: 'top 92%', end: 'top 45%', scrub: 0.6 },
    });
  }
}

let lenis = null;
const film = createFilm();
const segs = {};

function buildFilm() {
  let state = { ...F };
  const seg = (name, opts) => {
    const a = { ...state, ...opts.a };
    const b = { ...a, ...(opts.b ?? {}) };
    state = b;
    const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number'));
    segs[name] = film.add({ ...opts, a: clean(a), b: clean(b) });
    return segs[name];
  };

  seg('hero', {
    trigger: '#sahne', start: 'top top', end: phone ? '+=190%' : '+=170%', pin: true, ease: 'linear',
    a: { ...SHOT.heroA, scan: -2.8, harness: 0, flow: 0.15, tags: 0 },
    b: { ...SHOT.heroB, scan: 2.8, flow: 0.35 },
  });
  seg('faults', {
    trigger: '#arizalar', start: 'top top', end: phone ? '+=360%' : '+=300%', pin: true, ease: 'linear',
    a: { ...SHOT.faultsA, harness: 1, flow: 0.5, tags: 1, fault: 0 },
    b: { ...SHOT.faultsB, fault: faults.length + 0.2, flow: 0.8 },
  });
  seg('about', {
    trigger: '#olcum', start: 'top 70%', end: 'bottom 30%', ease: 'linear',
    a: { ...SHOT.aboutA, tags: 0, flow: 0.4, dim: 0.1 },
    b: { ...SHOT.aboutB },
  });
  $$('.svc').forEach((el, i) => {
    const shot = SERVICE_SHOTS[services[i].map.key]();
    seg('svc' + i, {
      trigger: el, start: 'top 35%', end: 'bottom 65%',
      a: { beam: 0, flow: 0.5, dim: 0, xray: 0.55, ...shot },
      b: {},
    });
  });
  seg('process', {
    trigger: '#surec', start: 'top top', end: phone ? '+=260%' : '+=220%', pin: true, ease: 'linear',
    a: { ...SHOT.process, beam: 0, flow: 0.9, dim: 0, xray: 1 },
    b: { az: SHOT.process.az + Math.PI * 2 },
  });
  seg('reviews', {
    trigger: '#yorumlar', start: 'top 75%', end: 'bottom 25%',
    a: { ...SHOT.reviews, dim: 0.55, flow: 0.4 },
    b: { az: SHOT.reviews.az + 0.4 },
  });
  seg('brands', {
    trigger: '#markalar', start: 'top 75%', end: 'bottom 25%',
    a: { ...SHOT.brands, dim: 0.6 },
    b: { az: SHOT.brands.az + 0.3 },
  });
  seg('shop', {
    trigger: '#dukkan', start: 'top 50%', end: 'bottom 50%',
    a: { dim: 1 },
    b: {},
  });
  seg('finale', {
    trigger: '#iletisim', start: 'top top', end: phone ? '+=140%' : '+=120%', pin: true, ease: 'linear',
    a: { ...SHOT.finaleA, dim: 0, power: 0, flow: 0.2, beam: 0 },
    b: { ...SHOT.finaleB, power: 1, flow: 1 },
  });
}

// --- Arklar ------------------------------------------------------------------------------

const arc = createArcLayer($('#arc'), $('#flash'));
const sizeArc = () => $('#arc').setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
sizeArc();
addEventListener('resize', sizeArc);
let lastStrike = 0;
function strikeAt(el, opts) {
  const now = performance.now();
  if (now - lastStrike < 700) return;
  lastStrike = now;
  const r = el.getBoundingClientRect();
  const tx = r.left + Math.min(r.width, 40);
  const ty = r.top + r.height / 2;
  const fromLeft = Math.random() > 0.5;
  arc.strike(fromLeft ? -20 : innerWidth + 20, Math.random() * innerHeight * 0.4, tx, ty, opts);
}

// --- Kare döngüsü ------------------------------------------------------------------------

const scanPct = $('#scan-pct');
const scanFound = $('#scan-found');
const heroFill = $('.hero__layer--fill');
const heroLine = $('.hero__scanline');
const tagEls = $$('.tag');
const faultEls = $$('.fault');
const statEls = $$('.stat__num');
const aboutWords = [];
const ring = $('#ring');
const ringStep = $('#ring-step');
const stepEls = $$('.step');
const svcEls = $$('.svc');
const RING_LEN = 2 * Math.PI * 54;

let lastFoundCount = -1;
let lastResolved = -1;
let lastRing = -1;
let prevY = -1;
const camKeys = ['tx', 'ty', 'tz', 'az', 'el', 'dist', 'fov', 'sx', 'sy'];

function faultStates() {
  const out = {};
  const resolved = [];
  faults.forEach((f, i) => {
    const ok = F.fault > i + 0.5;
    out[f.node] = ok ? 'ok' : 'fault';
    resolved.push(ok);
  });
  return { out, resolved };
}

function setFaultCount(n) {
  const el = $('#fault-count');
  scramble(el, String(n), { duration: 0.35 });
  $('#fault-count-label').textContent = n === 0 ? 'arıza kaldı, tüm sistemler normal' : 'aktif arıza kaydı';
  $('#arizalar').classList.toggle('is-clear', n === 0);
}

function tick(time, dtMs) {
  const dt = Math.min(0.05, dtMs / 1000);
  const y = window.scrollY;
  if (!reducedMotion) film.apply(F, y);

  // Kamera hafif gecikmeyle takip eder, sahne değerleri doğrudan uygulanır.
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
  for (const key of Object.keys(F)) {
    if (!(key in world.P)) continue;
    world.P[key] = camKeys.includes(key) ? world.P[key] + (F[key] - world.P[key]) * k : F[key];
  }

  const { out, resolved } = faultStates();
  world.setFaults(out);

  // Hizmet odağı
  let focus = null;
  svcEls.forEach((el, i) => {
    const st = segs['svc' + i];
    if (!st) return;
    let active = y >= st.start - innerHeight * 0.1 && y <= st.end + innerHeight * 0.1;
    if (phone) {
      // Telefonda kart yalnızca aksiyon çubuğunun üstünde sabitken görünür; kayarken gizli.
      const card = el.firstElementChild;
      const stick = parseFloat(card.style.getPropertyValue('--stick')) || 0;
      const top = card.getBoundingClientRect().top;
      active = Math.abs(top - stick) < 4 && el.getBoundingClientRect().top < innerHeight * 0.55;
    }
    el.classList.toggle('is-active', active);
    if (active) {
      focus = services[i].map.nodes;
      el.style.setProperty('--p', Math.min(1, Math.max(0, st.progress * 1.4)).toFixed(3));
    }
  });
  world.setFocus(focus);

  world.update(dt, time);
  if (F.dim < 0.995 && !document.hidden) world.render();

  if (y === prevY && !reducedMotion) return;
  prevY = y;

  // Kahraman: tarama yüzdesi ve başlık dolumu
  const sp = Math.min(1, Math.max(0, (F.scan + 2.8) / 5.6));
  scanPct.textContent = '%' + Math.round(sp * 100);
  const found = faults.filter((f) => NODES[f.node].p[2] < F.scan).length;
  if (found !== lastFoundCount) {
    lastFoundCount = found;
    scanFound.textContent = found;
    scanFound.classList.toggle('is-bad', found > 0);
  }
  heroFill.style.clipPath = `inset(-30% ${((1 - sp) * 100).toFixed(2)}% -30% 0)`;
  heroLine.style.transform = `translateX(${(sp * 100).toFixed(2)}cqw)`;
  heroLine.style.opacity = sp > 0.001 && sp < 0.999 ? 1 : 0;

  // Arıza listesi
  const resolvedCount = resolved.filter(Boolean).length;
  if (resolvedCount !== lastResolved) {
    if (lastResolved !== -1) setFaultCount(faults.length - resolvedCount);
    lastResolved = resolvedCount;
    faultEls.forEach((el, i) => {
      const was = el.classList.contains('is-ok');
      el.classList.toggle('is-ok', resolved[i]);
      el.classList.toggle('is-current', i === resolvedCount);
      const state = $('.fault__state', el);
      if (resolved[i] && !was) scramble(state, 'Düzeldi', { duration: 0.4 });
      else if (!resolved[i]) state.textContent = i === resolvedCount ? 'Ölçülüyor' : 'Arıza';
    });
  }

  // Ölçüm: sayaçlar ve genişlik ekseni
  const ab = segs.about;
  if (ab) {
    const p = Math.min(1, Math.max(0, ab.progress * 1.5));
    statEls.forEach((el, i) => {
      const to = Number(el.dataset.to);
      const e = Math.min(1, Math.max(0, p * 1.2 - i * 0.08));
      el.textContent = Math.round(to * e).toLocaleString('tr-TR');
      el.style.setProperty('--w', (50 + e * 75).toFixed(1));
    });
    const wp = Math.min(1, Math.max(0, ab.progress * 2.2));
    aboutWords.forEach((w, i) => w.classList.toggle('on', i / aboutWords.length < wp));
  }

  // Süreç halkası
  const pr = segs.process;
  if (pr) {
    const p = Math.min(1, Math.max(0, pr.progress));
    ring.style.strokeDashoffset = (RING_LEN * (1 - p)).toFixed(1);
    const step = Math.min(d.surec.length - 1, Math.floor(p * d.surec.length * 0.999));
    if (step !== lastRing) {
      lastRing = step;
      ringStep.textContent = step + 1;
      stepEls.forEach((el, i) => {
        el.classList.toggle('is-done', i < step);
        el.classList.toggle('is-active', i === step);
      });
    }
  }

  // Final: güç
  $('#iletisim').style.setProperty('--power', F.power.toFixed(3));
}

// Arıza etiketlerinin ekran konumları her karede güncellenir (sadece görünürken).
function tagTick() {
  const vis = F.tags;
  if (vis < 0.01) {
    if (tagEls[0]?.style.opacity !== '0') tagEls.forEach((t) => (t.style.opacity = 0));
    return;
  }
  faults.forEach((f, i) => {
    const p = world.project(f.node);
    const t = tagEls[i];
    t.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    t.style.opacity = p.visible ? vis : 0;
    t.classList.toggle('is-ok', F.fault > i + 0.5);
  });
}

// --- Başlatma ----------------------------------------------------------------------------

function initInteractions() {
  $$('.btn').forEach((b) => magnetic(b, 0.3));
  initCursor();
  $$('.marquee__track').forEach((t) => velocityMarquee(t, { speed: t.closest('.marquee--big') ? 60 : 30, dir: Number(t.dataset.dir), lenis }));
}

function splitAbout() {
  const p = $('#about-text');
  p.innerHTML = p.textContent.split(/(\s+)/).map((w) => (w.trim() ? `<span class="aw">${w}</span>` : w)).join('');
  aboutWords.push(...$$('.aw', p));
}

function heroEntrance() {
  const words = $$('.hero__word');
  gsap.fromTo(words, { '--w': 50, opacity: 0 }, { '--w': 72, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' });
  gsap.fromTo('.hero__sub, .hero__cta, .hero__kicker', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, delay: 0.25, ease: 'power3.out' });
  gsap.fromTo('.hero__readout, .hero__hint', { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.6 });
}

function runIntro() {
  const intro = $('#intro');
  const volt = $('#intro-volt');
  const nameEl = $('#intro-name');
  return new Promise((resolve) => {
    let done = false;
    const start = performance.now();
    const shown = { v: 0 };
    lenis?.stop();
    scramble(nameEl, d.isletme.ad, { duration: 0.9, delay: 0.15 });
    const finish = () => {
      if (done) return;
      done = true;
      gsap.ticker.remove(update);
      volt.textContent = '12,6 V';
      const a = $('#term-neg').getBoundingClientRect();
      const b = $('#term-pos').getBoundingClientRect();
      arc.strike(a.right + 4, a.top + a.height / 2, b.left - 4, b.top + b.height / 2, { duration: 380, rough: 0.35, flashAmount: 0.5 });
      const tl = gsap.timeline({
        delay: 0.35,
        onComplete: () => {
          intro.remove();
          lenis?.start();
          resolve();
        },
      });
      tl.to('.intro__center, .intro__skip', { opacity: 0, duration: 0.15 })
        .fromTo('.intro__line', { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.22, ease: 'expo.out' }, '<')
        .to('.intro__half--top', { yPercent: -100, duration: 0.7, ease: 'expo.inOut' }, '+=0.02')
        .to('.intro__half--bottom', { yPercent: 100, duration: 0.7, ease: 'expo.inOut' }, '<')
        .to('.intro__line', { opacity: 0, scaleY: 8, duration: 0.5, ease: 'power2.out' }, '<0.1')
        .add(heroEntrance, '<0.15');
    };
    function update() {
      const t = (performance.now() - start) / 1000;
      const target = Math.min(1, Math.max(Math.min(t / 1.3, loadProgress), t / 2.5));
      shown.v += (target - shown.v) * 0.2;
      volt.textContent = (shown.v * 12.6).toFixed(1).replace('.', ',').padStart(4, '0') + ' V';
      if ((t > 1.3 && loadProgress >= 1 && shown.v > 0.97) || t > 2.5) finish();
    }
    gsap.ticker.add(update);
    intro.addEventListener('pointerdown', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
  });
}

async function start() {
  splitAbout();
  resize();
  if (reducedMotion) {
    $('#intro').remove();
    document.documentElement.classList.add('is-static');
    Object.assign(F, SHOT.heroB, { scan: 3, harness: 1, flow: 0.4, fault: faults.length + 1, tags: 0, sx: phone ? 0 : 0.2 });
    Object.assign(world.P, F);
    statEls.forEach((el) => (el.textContent = Number(el.dataset.to).toLocaleString('tr-TR')));
    aboutWords.forEach((w) => w.classList.add('on'));
    faultEls.forEach((el) => {
      el.classList.add('is-ok');
      $('.fault__state', el).textContent = 'Düzeldi';
    });
    $('#fault-count').textContent = '0';
    $('#fault-count-label').textContent = 'arıza kaldı, tüm sistemler normal';
    $('#score').textContent = String(d.puan.ortalama).replace('.', ',');
    ring.style.strokeDashoffset = 0;
    stepEls.forEach((el) => el.classList.add('is-done'));
    $('#iletisim').style.setProperty('--power', 1);
    heroFill.style.clipPath = 'none';
    $$('.marquee__track').forEach((t) => (t.style.transform = 'none'));
    const once = () => {
      world.update(0.016, 0);
      world.update(0.5, 0);
      world.render();
    };
    loading.then(once);
    addEventListener('resize', () => loading.then(once));
    return;
  }

  lenis = initSmoothScroll({ lerp: 0.1 });
  buildFilm();
  kinetic();
  initInteractions();

  // Bölüm girişlerinde şimşek
  for (const sec of $$('.scene:not(.hero)')) {
    const h = $('h2', sec) || sec;
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', onEnter: () => strikeAt(h), onEnterBack: () => strikeAt(h, { flashAmount: 0.15 }) });
  }

  // Puan sayacı
  ScrollTrigger.create({
    trigger: '#yorumlar', start: 'top 70%', once: true,
    onEnter: () => {
      const o = { v: 0 };
      gsap.to(o, { v: d.puan.ortalama, duration: 1.4, ease: 'expo.out', onUpdate: () => ($('#score').textContent = o.v.toFixed(1).replace('.', ',')) });
    },
  });

  // Final başlığı: güç gelince metin çözülür
  ScrollTrigger.create({
    trigger: '#iletisim', start: 'top top', end: '+=100%',
    onUpdate: (st) => {
      const k = $('#finale-kicker');
      const next = st.progress > 0.55 ? 'Tüm sistemler normal' : 'Sistem kontrolü';
      if (k.dataset.t !== next) {
        k.dataset.t = next;
        scramble(k, next, { duration: 0.5 });
      }
    },
  });

  ScrollTrigger.refresh();
  film.rebuild();
  gsap.ticker.add((t, dtMs) => {
    tick(t, dtMs);
    tagTick();
  });

  if (new URLSearchParams(location.search).has('nointro')) {
    $('#intro').remove();
    heroEntrance();
  } else {
    await runIntro();
  }
}

document.fonts.ready.then(start);
