// Bölme (sinematik aile, oto ekspertiz): karanlık ekspertiz bölmesi, nane vurgu; film bitince sayfa rapor kâğıdı rengine
// döner. Encode Sans Expanded (başlık), Host Grotesk (gövde), Geist Mono (etiket).
// 3D iki yerde kalır. (1) Künye: araç bölmede, kamera açılışta bir kez yaklaşır. (2) Hizmetler: her hizmete gelince
// kamera ilgili yere gider (tarama kapısı, lift, OBD cihazı, kaput, ön takım, dinamometre, kuşbakışı renk şeması);
// etiket parça adıdır. Boya renkleri örnek bir araca aittir. Hizmetlerden sonra çizim durur; gerisi düz site bölümleri.
import temel from '../../data/sektor-ekspertiz.json';
import ek from '../../data/ekspertiz-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader, setStoryMode,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger, GUNLER,
} from '../../shared/core.js';
import * as THREE from 'three';
import { createScene } from './scene.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, preset: ek.preset });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const sm = (t) => t * t * (3 - 2 * t);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const phone = matchMedia('(max-width: 899px)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || phone;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const st = gunDurumu(d.saatler);
const wa = waHref(d, `Merhaba ${d.isletme.ad}, bir araç için ekspertiz randevusu almak istiyorum.`);

// Hizmet → sahne. key: kamera ve sahne durumu; tag: 3D etiket noktası (araç uzayında); yer: kartın üst satırı.
const SERVICE_MAP = [
  { re: /tam ekspertiz/i, key: 'over', tag: null, yer: 'Ekspertiz bölmesi' },
  { re: /boya|kaporta/i, key: 'boya', tag: V(0.45, 0.98, 0.86), yer: 'Kaporta parçaları' },
  { re: /şasi/i, key: 'sasi', tag: V(0.1, 0.14, 0.86), yer: 'Şasi ve podye' },
  { re: /arıza|obd/i, key: 'obd', tag: V(0.62, 0.5, -0.62), yer: 'OBD soketi' },
  { re: /motor/i, key: 'motor', tag: V(1.55, 0.78, 0), yer: 'Motor bölmesi' },
  { re: /yürüyen|fren/i, key: 'aksam', tag: V(1.38, 0.34, 0.8), yer: 'Ön takım' },
  { re: /dinamometre|yol testi/i, key: 'dyno', tag: V(1.38, 0.12, 0.9), yer: 'Dinamometre merdaneleri' },
  { re: /rapor/i, key: 'rapor', tag: null, yer: 'Rapordaki araç şeması' },
];
const services = d.hizmetler.map((h) => ({ ...h, map: SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[0] }));
const legend = `<ul class="legend" aria-label="Rapordaki boya renkleri">${d.siniflar.map((c) => `<li><i style="--c:${esc(c.renk)}"></i>${esc(c.ad)}</li>`).join('')}</ul>`;

// --- Render ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('#kunye').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--mint" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${wa}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="services__head">
    <h2 class="sec-title" id="services-title">Hizmetler</h2>
    <p class="services__sub">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  ${services.map((s, i) => `
    <article class="svc" data-i="${i}">
      <div class="svc__card">
        <p class="svc__tag">${esc(s.map.yer)}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        <p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>
        ${s.map.key === 'rapor' || s.map.key === 'boya' ? `<div class="svc__legend"><p>Rapordaki renkler, örnek araç</p>${legend}</div>` : ''}
      </div>
    </article>`).join('')}`;

const foto = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__body">
      <h2 class="sec-title" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGunSayisi(d.saatler)}<small> gün</small></b><span>haftada açık</span></li>
      </ul>
    </div>
    <figure class="about__img"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="1800" height="1200" loading="lazy" decoding="async" /></figure>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Ekspertizi yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

const bugun = new Date().getDay();
const bugunMu = (g) => {
  if (g === GUNLER[bugun]) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  return a <= b ? bugun >= a && bugun <= b : bugun >= a || bugun <= b;
};
$('#saatler').innerHTML = `
  <div class="wrap shop__grid">
    <div class="shop__info">
      <h2 class="sec-title" id="shop-title">Çalışma saatleri ve konum</h2>
      <p class="shop__status ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="shop__addr">${esc(d.iletisim.adres)}</p>
      <div class="shop__cta">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="shop__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="sec-title" id="reviews-title">Örnek yorumlar</h2>
    <p class="reviews__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__rail" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((r) => `
      <li class="review">
        <p class="review__stars" role="img" aria-label="5 üzerinden ${Number(r.puan)}">${stars(r.puan)}</p>
        <p class="review__text">${esc(r.metin)}</p>
        <p class="review__who"><b>${esc(r.ad)}</b><span>${esc(r.arac || '')}</span></p>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="finale__title" id="finale-title">İletişim</h2>
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="finale__cta">
      <a class="btn btn--mint btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${wa}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. 3D görseller ve boya renkleri temsilîdir. Yorumlar örnektir.</p>
  </div>`;

new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Üst çubuk ---------------------------------------------------------------------------

const topEl = $('#top');
if (phone) autoHideHeader(topEl, { offset: 120 });
ScrollTrigger.create({ trigger: '.paper', start: 'top 70px', endTrigger: '.finale', end: 'top 70px', onToggle: (s) => topEl.classList.toggle('is-paper', s.isActive) });
ScrollTrigger.create({ trigger: '.finale', start: 'top 70px', end: 'max', onToggle: (s) => topEl.classList.toggle('is-night', s.isActive) });

// --- 3D sahne ----------------------------------------------------------------------------

const canvas = $('#gl');
const S = createScene(canvas, { lite, phone });
S.setPanels(d.paneller, d.siniflar);
const loader = $('[data-loader]');
S.ready.then(() => loader.classList.add('is-done')).catch(() => loader.classList.add('is-done'));

// Kamera pozları. Masaüstü: kart solda, araç sağa kayar (shiftX). Telefon: kart altta, araç üst yarıda (shiftY).
const P = (pos, look, fov, extra = {}) => ({ pos, look, fov, ...extra });
const scanX = (p) => L(2.95, -2.95, sm(seg(p, 0.1, 0.85)));
const CAM = {
  hero: (p) => phone
    ? P(V(L(8.8, 7.4, p), 2.1, L(10.4, 8.8, p)), V(-0.2, 0.55, 0), 36, { shiftY: 0.2 })
    : P(V(L(6.4, 4.8, p), L(1.7, 1.4, p), L(8.8, 7.0, p)), V(0.1, 0.72, 0), 30, { shiftX: 0.17, shiftY: -0.04 }),
  over: () => phone
    ? P(V(-6.2, 2.6, 9.4), V(0, 0.6, 0), 38, { shiftY: 0.2 })
    : P(V(-5.2, 2.2, 7.4), V(0, 0.7, 0), 32, { shiftX: 0.18 }),
  boya: (p) => {
    const sx = clamp(scanX(p), -2.3, 2.3);
    return phone
      ? P(V(sx * 0.55 + 1.6, 1.9, 9.6), V(sx * 0.55, 0.55, 0), 40, { shiftY: 0.2 })
      : P(V(sx * 0.5 + 0.8, 1.15, 5.8), V(sx * 0.5, 0.72, 0), 34, { shiftX: 0.19 });
  },
  sasi: (p) => {
    const hx = L(2.0, -2.1, sm(seg(p, 0.2, 0.9)));
    return phone
      ? P(V(hx + 1.3, 0.3, 3.9), V(hx - 0.4, 1.75, 0), 56, { shiftY: 0.14 })
      : P(V(hx * 0.8 + 1.4, 0.35, 3.6), V(hx * 0.8 - 0.4, 1.7, 0), 46, { shiftX: 0.16 });
  },
  obd: (p) => phone
    ? P(V(L(3.9, 3.3, p), 1.9, L(-3.15, -3.05, p)), V(0.6, 0.75, -1.1), 58, { shiftY: 0.19 })
    : P(V(L(3.6, 2.9, p), L(1.6, 1.45, p), -3.05), V(0.45, 0.82, -0.95), 44, { shiftX: 0.16 }),
  motor: (p) => phone
    ? P(V(L(2.9, 2.5, p), 2.7, L(4.6, 4.2, p)), V(1.35, 0.7, 0), 46, { shiftY: 0.2 })
    : P(V(L(5.0, 4.3, p), 2.3, L(2.6, 2.0, p)), V(1.35, 0.8, 0), 38, { shiftX: 0.17 }),
  aksam: (p) => phone
    ? P(V(L(3.8, 3.4, p), 0.9, L(3.8, 3.4, p)), V(1.3, 1.6, 0.6), 52, { shiftY: 0.16 })
    : P(V(L(3.8, 3.3, p), 0.95, L(3.6, 3.1, p)), V(1.25, 1.5, 0.5), 44, { shiftX: 0.16 }),
  dyno: (p) => phone
    ? P(V(L(7.4, -6.4, sm(p)), 1.35, L(8.6, 9.0, sm(p))), V(0.1, 0.4, 0), 40, { shiftY: 0.2 })
    : P(V(L(4.2, -3.4, sm(p)), 0.6, L(4.6, 4.9, sm(p))), V(0.1, 0.6, 0), 40, { shiftX: 0.15 }),
  rapor: () => phone
    ? P(V(0.001, 14.5, 0.0), V(0, 0.3, 0), 52, { up: V(1, 0, 0), shiftY: 0.2, topDown: true })
    : P(V(0.0, 10.5, 0.001), V(0, 0.3, 0), 34, { up: V(0, 0, -1), shiftX: 0.2, topDown: true }),
};
const HOT_T = [0.25, 0.45, 0.65, 0.85];

// Sahne hedefi: kamera + durum alanları (scene.js render sözleşmesi).
function target(key, p) {
  const s = { ...CAM[key](p), env: 0.45, heat: 0, scan: 10, scanOn: 0, gate: 0, lift: 0, posts: 0, torch: 0, obd: 0, hood: 0, obdLink: 0, dyno: 0, speed: 0, load: 0, keyK: 1 };
  switch (key) {
    case 'boya': {
      s.scan = scanX(p);
      s.scanOn = seg(p, 0.05, 0.12) * (1 - seg(p, 0.88, 0.97));
      s.gate = s.scanOn;
      s.heat = 1;
      break;
    }
    case 'sasi': {
      s.posts = 1; s.lift = 1; s.torch = 1; s.keyK = 0.75;
      s.hots = HOT_T.map((t) => seg(p, t - 0.12, t));
      break;
    }
    case 'aksam': { s.posts = 1; s.lift = 1; s.keyK = 0.85; break; }
    case 'obd': {
      s.obd = 1; s.hood = 1; s.obdLink = 1;
      s.obdTotal = 5; s.obdN = Math.min(5, Math.floor(seg(p, 0.1, 0.9) * 6)); s.obdHit = -1;
      break;
    }
    case 'motor': { s.hood = 1; break; }
    case 'dyno': {
      s.dyno = 1;
      const r = seg(p, 0.15, 0.85);
      const run = seg(p, 0.08, 0.15) * (1 - seg(p, 0.88, 0.96));
      s.speed = run * (3 + r * 30); s.load = run * r;
      break;
    }
    case 'rapor': s.heat = 1; s.scan = -10; break;
  }
  return s;
}

const svcEls = $$('.svc');
const tag = $('[data-tag]'), tagT = $('[data-tag-t]');
let active = -1, lastTag = '';
const intro = { p: reducedMotion ? 1 : 0 };

function computeTarget() {
  const vh = innerHeight;
  active = -1;
  let p = 0;
  svcEls.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    let on;
    if (phone) {
      const c = el.firstElementChild.getBoundingClientRect();
      on = c.top > r.top + 2 && c.bottom < r.bottom - 2 && r.top < vh * 0.4;
      if (on) p = clamp(-r.top / Math.max(1, r.height - vh));
    } else {
      on = r.top < vh * 0.55 && r.bottom > vh * 0.45;
      if (on) p = clamp((vh * 0.55 - r.top) / Math.max(1, r.height - vh * 0.1));
    }
    el.classList.toggle('is-active', on);
    if (on) active = i;
  });
  if (active >= 0) return target(services[active].map.key, p);
  const head = $('.services__head').getBoundingClientRect();
  return head.top < vh * 0.6 ? target('over', 0) : target('hero', intro.p);
}

// Mevcut durum hedefe yumuşakça yaklaşır; kesikli alanlar (topDown, hots) doğrudan alınır.
const NUM = ['fov', 'shiftX', 'shiftY', 'env', 'heat', 'scan', 'scanOn', 'gate', 'lift', 'posts', 'torch', 'obd', 'hood', 'obdLink', 'dyno', 'speed', 'load', 'keyK'];
const first = target('hero', intro.p);
const cur = { ...first, pos: first.pos.clone(), look: first.look.clone(), up: V(0, 1, 0), shiftX: first.shiftX || 0, shiftY: first.shiftY || 0 };
let running = false, prevT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000);
  prevT = now;
  const tg = computeTarget();
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
  cur.pos.lerp(tg.pos, k);
  cur.look.lerp(tg.look, k);
  cur.up.lerp(tg.up || V(0, 1, 0), k).normalize();
  for (const key of NUM) cur[key] = L(cur[key] ?? 0, tg[key] ?? 0, key === 'scan' && Math.abs(tg.scan - cur.scan) > 6 ? 1 : k);
  cur.topDown = cur.up.y < 0.6;
  cur.hots = tg.hots;
  cur.obdN = tg.obdN; cur.obdTotal = tg.obdTotal; cur.obdHit = tg.obdHit;
  S.render(cur, now);

  // Parça etiketi
  const s = active >= 0 ? services[active] : null;
  if (s?.map.tag) {
    if (s.map.yer !== lastTag) { tagT.textContent = s.map.yer; lastTag = s.map.yer; }
    const pt = S.project(s.map.tag);
    const card = svcEls[active].firstElementChild.getBoundingClientRect();
    const hidden = pt.behind || (phone && pt.y > card.top - 60) || (!phone && pt.x < card.right + 20) || pt.y < 80 || pt.x > innerWidth - 200;
    tag.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
    tag.classList.toggle('is-on', !hidden && cur.pos.distanceTo(tg.pos) < 0.6);
  } else tag.classList.remove('is-on');

  if (running) requestAnimationFrame(frame);
}

// Yalnız künye ve Hizmetler görünürken çizilir.
const film = $('#film');
function setRunning(on) {
  if (on === running) return;
  running = on;
  canvas.classList.toggle('is-off', !on);
  if (on) { prevT = performance.now(); requestAnimationFrame(frame); }
}
new IntersectionObserver(([e]) => setRunning(e.isIntersecting && !document.hidden), { rootMargin: '0px 0px -20% 0px' }).observe(film);
document.addEventListener('visibilitychange', () => setRunning(!document.hidden && film.getBoundingClientRect().bottom > innerHeight * 0.2));

function resize() {
  S.resize();
  if (phone) $$('.svc__card').forEach((c) => c.style.setProperty('--card-h', `${c.offsetHeight}px`));
}
addEventListener('resize', resize);
resize();

// --- Başlatma ----------------------------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  S.ready.then(() => frame(performance.now()));
  frame(performance.now());
} else {
  initSmoothScroll({ lerp: 0.1 });
  if (phone) {
    // Hizmet kartları ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir (yukarı kaydırınca döner).
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (t) => setStoryMode(t.isActive ? true : null),
    });
  }
  S.ready.then(() => { S.compile(); ScrollTrigger.refresh(); }).catch(() => {});
  gsap.to(canvas, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.1 });
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  // Açılış: kamera bölmeye bir kez yaklaşır (~2,4 sn, kaydırmaya bağlı değil).
  gsap.to(intro, { p: 1, duration: 2.4, ease: 'power2.inOut', delay: 0.3 });
  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  ['#about-title', '#shop-title', '#reviews-title', '#finale-title'].forEach((s) => rise(s, s));
  rise('.stats li', '.stats', { stagger: 0.1 });
  rise('.review', '.reviews__rail', { stagger: 0.06, y: 18 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
