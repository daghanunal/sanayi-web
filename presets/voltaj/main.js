import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { createWorld, NODES } from './scene.js';
import { createFilm } from './film.js';

// Voltaj: 3D iki yerde kalır. (1) Açılış: tarama perdesi aracın üstünden bir kez geçer, araç röntgene
// döner. (2) Hizmetler: her hizmete gelince ilgili parça gösterilir, etiketler parça adıdır.
// Hizmetlerden sonra sahne kararır ve çizimi durur; gerisi normal site bölümleridir.

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const lowTier = phone || (navigator.hardwareConcurrency || 8) <= 4;
matchMedia('(max-width: 899px)').addEventListener('change', () => location.reload());

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const durumMetni = st.metin;

// Araçtaki parçaların adları (hizmet sahnesinde etiket olarak).
const PARCA = {
  bat: 'Akü', fuse: 'Sigorta kutusu', klima: 'Klima kompresörü', hlL: 'Far', hlR: 'Far', tlL: 'Stop lambası', tlR: 'Stop lambası',
  coils: 'Ateşleme bobinleri', maf: 'Hava akış sensörü', alt: 'Şarj dinamosu', starter: 'Marş motoru', ecu: 'Motor beyni (ECU)',
  dash: 'Gösterge paneli', obd: 'OBD soketi', hv: 'Hibrit batarya', absFL: 'ABS sensörü', absFR: 'ABS sensörü', absRL: 'ABS sensörü', absRR: 'ABS sensörü',
};
// Hizmet → araçtaki parçalar (odak) ve etiketlenecek parçalar
const SERVICE_MAP = [
  { re: /tespit/i, key: 'diag', nodes: ['obd', 'dash', 'ecu'] },
  { re: /beyin|ecu/i, key: 'ecu', nodes: ['ecu'] },
  { re: /akü|marş|dinamo/i, key: 'bat', nodes: ['bat', 'starter', 'alt'] },
  { re: /klima/i, key: 'klima', nodes: ['klima'] },
  { re: /far|aydınlatma/i, key: 'far', nodes: ['hlL', 'hlR', 'tlL', 'tlR'], tags: ['hlR', 'tlR'] },
  { re: /hibrit/i, key: 'hv', nodes: ['hv'] },
  { re: /tesisat|kablo/i, key: 'wire', nodes: null, tags: ['fuse'] },
];
const services = d.hizmetler.map((h) => {
  const map = SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[6];
  const tags = map.tags ?? map.nodes ?? [];
  return { ...h, map, tags, parts: [...new Set(tags.map((n) => PARCA[n]))] };
});

// --- Render ------------------------------------------------------------------------------

const bolt = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4.5 13.5h6.2L9.5 22l9.8-12.6h-6.4z" fill="currentColor"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne">${bolt}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn btn--main" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

$('#sahne').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye mono-dt">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="services__head">
    <h2 id="services-title">Hizmetler</h2>
    <p class="services__sub">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  ${services.map((s, i) => `
    <article class="svc" data-i="${i}" data-key="${s.map.key}">
      <div class="svc__card">
        <p class="svc__tag mono">${s.parts.map(esc).join(' · ')}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        <p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>
      </div>
    </article>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="about__inner">
    <h2 id="about-title">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="stats">
      <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span class="stat__num">${yas}</span><span class="stat__unit mono">YIL</span></dd></div>
      <div class="stat"><dt>haftada açık</dt><dd><span class="stat__num">${acikGun}</span><span class="stat__unit mono">GÜN</span></dd></div>
    </dl>
  </div>`;

$('#saatler').innerHTML = `
  <div class="shop__inner">
    <div class="shop__info">
      <h2 id="shop-title">Çalışma saatleri ve konum</h2>
      <p class="shop__status ${st.open ? 'is-open' : ''}"><i></i>${esc(durumMetni)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>
          ${saatListesi(d.saatler).map(([g, h]) => `<tr><th scope="row">${g}</th><td class="mono">${h}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="shop__addr">${esc(d.iletisim.adres)}</p>
      <div class="shop__cta">
        <a class="btn btn--main" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="shop__map" id="map"></div>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <div class="reviews__head">
    <h2 id="reviews-title">Örnek yorumlar</h2>
    <p class="reviews__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="reviews__list">
    ${d.yorumlar.map((r) => `
      <figure class="review">
        <p class="review__stars" role="img" aria-label="5 üzerinden ${r.puan}">${stars(r.puan)}</p>
        <blockquote>${esc(r.metin)}</blockquote>
        <figcaption><b>${esc(r.ad)}</b> <span>${esc(r.arac || '')}</span></figcaption>
      </figure>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <div class="finale__inner">
    <h2 class="finale__title" id="finale-title">İletişim</h2>
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="finale__cta">
      <a class="btn btn--main btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(durumMetni)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__inner">
    <p class="foot__brand">${bolt}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${yil} ${ad}. 3D görseller temsilîdir, araç belirli bir marka ya da modeli göstermez. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir
new IntersectionObserver((entries, io) => {
  if (entries.some((e) => e.isIntersecting)) {
    $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  }
}, { rootMargin: '600px' }).observe($('#map'));

// --- 3D dünya ----------------------------------------------------------------------------

const tagCanvas = $('#tags');
const tagCtx = tagCanvas.getContext('2d');
let tagDpr = 1;
let tagsDrawn = false;
const canvas = $('#gl');
const world = createWorld(canvas, { lowTier });
const resize = () => {
  world.resize(innerWidth, innerHeight);
  tagDpr = Math.min(2, window.devicePixelRatio || 1);
  tagCanvas.width = Math.round(innerWidth * tagDpr);
  tagCanvas.height = Math.round(innerHeight * tagDpr);
  // Telefonda hizmet kartı, bölüm boyunca ekranın altında (alt çubuğun boşluğunda) durur.
  if (phone) $$('.svc__card').forEach((c) => c.style.setProperty('--card-h', `${c.offsetHeight}px`));
};
resize();
addEventListener('resize', resize);

const loading = world.load(() => {}).then(() => {
  gsap.to(canvas, { opacity: 1, duration: 1, ease: 'power2.out' });
});

// Kamera çekimleri. Masaüstünde araç metnin karşı tarafında, telefonda üst yarıda.
const cam = (o) => ({
  tx: 0, ty: 0.55, tz: 0, fov: 34, sx: 0, sy: phone ? -0.2 : 0,
  ...o,
  dist: (o.dist ?? 6.2) * (phone ? o.pd ?? (o.close ? 2.1 : 1.55) : 1),
  close: undefined,
  pd: undefined,
});
const SHOT = {
  heroA: cam({ az: 2.3, el: 0.1, dist: 7.9, sx: phone ? 0 : 0.2, sy: phone ? -0.26 : 0, pd: 2.1 }),
  heroB: cam({ az: 1.85, el: 0.2, dist: 7.3, sx: phone ? 0 : 0.2, sy: phone ? -0.26 : 0, pd: 2.2 }),
  overview: cam({ tz: 0.1, az: 1.6, el: 0.95, dist: 6.6, sx: phone ? 0 : 0.2, sy: phone ? -0.24 : 0, pd: 1.8 }),
};
const nodeShot = (names, o) => {
  const pts = names.map((n) => NODES[n].p);
  const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  return cam({ tx: c[0], ty: c[1], tz: c[2], close: true, sx: phone ? 0 : 0.2, sy: phone ? -0.2 : 0, ...o, dist: o.dist * (phone ? 1 : 1.45) });
};
const SERVICE_SHOTS = {
  diag: () => nodeShot(['obd', 'dash', 'ecu'], { az: 2.6, el: 0.42, dist: 2.6, hood: 0.3 }),
  ecu: () => nodeShot(['ecu'], { az: 2.1, el: 0.72, dist: 2.7, hood: 1 }),
  bat: () => nodeShot(['bat', 'alt'], { az: 2.35, el: 0.62, dist: 2.7, hood: 1 }),
  klima: () => nodeShot(['klima', 'alt'], { az: 3.55, el: 0.28, dist: 2.5, hood: 1 }),
  far: () => cam({ tx: 0.1, ty: 0.5, tz: -2.6, az: 2.05, el: 0.2, dist: 5.2, sx: phone ? 0 : 0.2, beam: 1, hood: 0 }),
  hv: () => nodeShot(['hv'], { az: 1.25, el: 0.75, dist: 3.4, hood: 0 }),
  wire: () => cam({ tz: 0, az: 1.57, el: 1.3, dist: 6.4, sx: phone ? 0 : 0.2, flow: 1, hood: 0 }),
};

// Film: yalnızca kamera, kaput, far ve karartma. Tarama perdesi açılışta zamanla oynar (kaydırmaya bağlı değil).
const F = { ...SHOT.heroA, xray: 1, flow: 0.25, dim: 0, power: 0, beam: 0, grid: 1, hood: 0, tags: 0 };
Object.assign(world.P, F, { scan: reducedMotion ? 3 : -2.8, harness: reducedMotion ? 1 : 0 });

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
    trigger: '#sahne', start: 'top top', end: 'bottom top',
    a: { ...SHOT.heroB, tags: 0, flow: 0.35, hood: 0 },
    b: { ...SHOT.overview, flow: 0.5 },
  });
  seg('head', {
    trigger: '.services__head', start: 'top 60%', end: 'bottom 40%',
    a: { ...SHOT.overview, hood: 1, tags: 0 },
    b: {},
  });
  $$('.svc').forEach((el, i) => {
    const shot = SERVICE_SHOTS[services[i].map.key]();
    seg('svc' + i, {
      trigger: el, start: 'top 35%', end: 'bottom 65%',
      a: { beam: 0, flow: 0.5, dim: 0, xray: 0.55, tags: 1, ...shot },
      b: {},
    });
  });
  // Hizmetlerden sonra sahne kararır; tam karanlıkta çizim durur.
  seg('rest', {
    trigger: '#hakkinda', start: 'top 95%', end: 'top 40%',
    a: { ...SHOT.overview, tags: 0, beam: 0, dim: 0.2 },
    b: { dim: 1 },
  });
}

// --- Kare döngüsü ------------------------------------------------------------------------

const topEl = $('#top');
const svcEls = $$('.svc');
let prevY = -1;
const camKeys = ['tx', 'ty', 'tz', 'az', 'el', 'dist', 'fov', 'sx', 'sy', 'hood'];
let focusTags = [];
world.setFaults({});

function tick(time, dtMs) {
  const dt = Math.min(0.05, dtMs / 1000);
  const y = window.scrollY;
  if (!reducedMotion) film.apply(F, y);

  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
  for (const key of Object.keys(F)) {
    if (!(key in world.P)) continue;
    world.P[key] = camKeys.includes(key) ? world.P[key] + (F[key] - world.P[key]) * k : F[key];
  }

  // Hizmet odağı
  let focus = null;
  focusTags = [];
  svcEls.forEach((el, i) => {
    const s = segs['svc' + i];
    if (!s) return;
    let active = y >= s.start - innerHeight * 0.1 && y <= s.end + innerHeight * 0.1;
    if (phone) {
      // Telefonda kart yalnızca ekranın altında sabitken görünür; bölüm başında/sonunda kayarken gizli.
      const cr = el.firstElementChild.getBoundingClientRect();
      const sr = el.getBoundingClientRect();
      active = cr.top > sr.top + 2 && cr.bottom < sr.bottom - 2 && sr.top < innerHeight * 0.4;
    }
    el.classList.toggle('is-active', active);
    if (active) {
      focus = services[i].map.nodes;
      focusTags = services[i].tags;
    }
  });
  world.setFocus(focus);

  const dark = F.dim >= 0.995;
  if (!dark && !document.hidden) {
    world.update(dt, time);
    world.render();
  }
  tagTick();

  if (y === prevY && !reducedMotion) return;
  prevY = y;
  topEl.classList.toggle('is-solid', y > 40);
}

// Parça etiketleri: 3D sahnenin üstündeki 2D tuvale çizilir (dokunmayı almaz, metni örtmez).
function tagTick() {
  const vis = F.tags;
  if (vis < 0.01 || !focusTags.length) {
    if (tagsDrawn) {
      tagCtx.clearRect(0, 0, tagCanvas.width, tagCanvas.height);
      tagsDrawn = false;
    }
    return;
  }
  const ctx = tagCtx;
  ctx.setTransform(tagDpr, 0, 0, tagDpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  tagsDrawn = true;
  const fs = phone ? 12 : 13;
  ctx.font = `700 ${fs}px 'JetBrains Mono', ui-monospace, monospace`;
  ctx.textBaseline = 'middle';
  const top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 60) + 8;
  const card = $('.svc.is-active .svc__card');
  const bottom = phone && card ? card.getBoundingClientRect().top - 8 : innerHeight - 8;
  const left = !phone && card ? card.getBoundingClientRect().right + 12 : 8;
  const items = [];
  for (const name of focusTags) {
    const p = world.project(name);
    if (!p.visible) continue;
    const text = PARCA[name];
    const w = ctx.measureText(text).width + 18;
    items.push({ text, px: p.x, py: p.y, x: Math.max(left, p.x + 14), y: p.y - 34, w, h: fs + 14 });
  }
  items.sort((a, b) => a.y - b.y);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    it.x = Math.min(it.x, innerWidth - it.w - 8);
    it.y = Math.max(it.y, top);
    for (let j = 0; j < i; j++) {
      const o = items[j];
      if (it.x < o.x + o.w + 4 && o.x < it.x + it.w + 4 && it.y < o.y + o.h + 4) it.y = o.y + o.h + 4;
    }
  }
  for (const it of items) {
    if (it.y + it.h > bottom) continue;
    ctx.globalAlpha = vis;
    ctx.strokeStyle = '#7fd8ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(it.px, it.py);
    ctx.lineTo(it.x, it.y + it.h);
    ctx.stroke();
    ctx.fillStyle = 'rgba(4,6,11,.9)';
    ctx.fillRect(it.x, it.y, it.w, it.h);
    ctx.strokeRect(it.x + 0.5, it.y + 0.5, it.w - 1, it.h - 1);
    ctx.fillStyle = '#e6f4ff';
    ctx.fillText(it.text, it.x + 9, it.y + it.h / 2 + 0.5);
  }
  ctx.globalAlpha = 1;
}

// --- Başlatma ----------------------------------------------------------------------------

function start() {
  resize();
  if (reducedMotion) {
    document.documentElement.classList.add('is-static');
    Object.assign(world.P, SHOT.heroB, { scan: 3, harness: 1, flow: 0.4, sx: phone ? 0 : 0.2 });
    const once = () => {
      world.update(0.016, 0);
      world.update(0.5, 0);
      world.render();
    };
    loading.then(once);
    addEventListener('resize', () => loading.then(once));
    return;
  }

  initSmoothScroll({ lerp: 0.1 });
  if (phone) autoHideHeader(topEl, { offset: 120 });
  buildFilm();
  if (phone) {
    // Hizmet kartları ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
    ScrollTrigger.create({
      trigger: '.svc', start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
  ScrollTrigger.refresh();
  film.rebuild();
  gsap.ticker.add(tick);

  // Açılış: künye gelir; model yüklenince tarama perdesi aracın önünden arkasına bir kez geçer.
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  gsap.fromTo('.hero__title', { '--w': 60 }, { '--w': 100, duration: 1.1, ease: 'expo.out' });
  loading.then(() => {
    gsap.to(world.P, { scan: 2.9, duration: 2.6, ease: 'power1.inOut', delay: 0.3 });
    gsap.to(world.P, { harness: 1, duration: 0.8, delay: 2.6 });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}

document.fonts.ready.then(start);
