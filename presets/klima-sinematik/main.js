// Kırağı (sinematik aile, oto klima): buz beyazı zemin, gece mavisi metin, buz camgöbeği vurgu; Tektur.
// 3D iki yerde kalır. (1) Künye: arkada klima devresi; açılışta bir kez sıcak borular soğur, kabin rengi
// turuncudan buz beyazına döner. (2) Hizmetler: her hizmete gelince kamera ilgili parçaya gider, etiket parça
// adıdır (kaçak testinde UV ışık, gaz dolumunda hortumlar, polen filtresinde filtre değişimi).
// Hizmetlerden sonra çizim durur; gerisi düz site bölümleri.
import taban from '../../data/sektor-klima.json';
import ek from '../../data/klima-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import * as THREE from 'three';
import { createScene } from './scene.js';

const d = boot({ ...taban, ...ek });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

const phone = matchMedia('(max-width: 899px)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || phone;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const st = gunDurumu(d.saatler);
const flake = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;

// Hizmet → sahnedeki parça. key: kamera pozu; tag: parçanın etiketi (3D noktası), yer: kartın üst satırı.
const SERVICE_MAP = [
  { re: /gaz/i, key: 'dolum', tag: 'dolum', yer: 'Alçak basınç ağzı' },
  { re: /kaçak/i, key: 'kacak', tag: 'kacak', yer: 'Kaçak noktası, UV ışıkta' },
  { re: /kompresör/i, key: 'kompresor', tag: 'kompresor', yer: 'Kompresör' },
  { re: /kondenser/i, key: 'kondenser', tag: 'kondenser', yer: 'Kondenser' },
  { re: /polen|filtre/i, key: 'filtre', tag: 'filtre', yer: 'Polen filtresi' },
  { re: /dezenfeksiyon/i, key: 'evaporator', tag: 'evaporator', yer: 'Evaporatör' },
  { re: /elektronik/i, key: 'over', tag: null, yer: 'Klima devresi' },
  { re: /fan/i, key: 'fan', tag: 'kondenser', yer: 'Kondenser fanı' },
];
const services = d.hizmetler.map((h) => ({ ...h, map: SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[6] }));

// --- Render ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye"><span class="top__flake">${flake}</span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('#kunye').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--hot" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--glass" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--glass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
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
      </div>
    </article>`).join('')}`;

const foto = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <figure class="about__img"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="933" height="1400" loading="lazy" decoding="async" /></figure>
    <div class="about__body">
      <h2 class="sec-title" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGunSayisi(d.saatler)}<small> gün</small></b><span>haftada açık</span></li>
      </ul>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Klimasına bakılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
  </div>`;

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="wrap shop__grid">
    <div class="shop__info">
      <h2 class="sec-title" id="shop-title">Çalışma saatleri ve konum</h2>
      <p class="shop__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
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
      <a class="btn btn--hot btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--glass btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. 3D görseller temsilîdir. Yorumlar örnektir.</p>
  </div>`;

new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Üst çubuk ---------------------------------------------------------------------------

const topEl = $('#top');
const solid = () => topEl.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();
if (phone) autoHideHeader(topEl, { offset: 120 });

// --- 3D sahne ----------------------------------------------------------------------------

const canvas = $('#gl');
const S = createScene(canvas, { lite });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera pozları. Masaüstünde parça metnin karşı tarafında (görüş kaydırması), telefonda üst yarıda.
const POSES = () => phone
  ? {
    hero: { pos: V(4.4, 1.1, 14.6), look: V(-0.05, -3.6, 0), fov: 46 },
    kompresor: { pos: V(-0.9, 0.9, 4.4), look: V(-2.45, -2.35, 0.4), fov: 52 },
    kondenser: { pos: V(1.4, 1.2, 7.9), look: V(0.45, -0.9, -0.4), fov: 54 },
    fan: { pos: V(2.4, 1.6, 7.2), look: V(0.2, -0.6, -0.4), fov: 54 },
    kacak: { pos: V(1.1, 1.1, 2.9), look: V(2.35, -0.95, -0.2), fov: 52 },
    dolum: { pos: V(-1.1, 1.2, 4.6), look: V(-1.9, -2.1, 0.3), fov: 56 },
    evaporator: { pos: V(1.6, -0.2, 4.6), look: V(0.7, -2.7, 0.9), fov: 52 },
    filtre: { pos: V(0.9, 1.4, 4.2), look: V(0.6, -2.2, 0.7), fov: 52 },
    over: { pos: V(-4.4, 2.8, 15), look: V(0.1, -3.6, 0), fov: 48 },
  }
  : {
    hero: { pos: V(5.4, 2.0, 12.6), look: V(-5.6, -0.7, 0), fov: 40 },
    kompresor: { pos: V(-0.2, 0.3, 3.4), look: V(-2.0, -0.85, 0.3), fov: 44 },
    kondenser: { pos: V(2.2, 1.9, 4.4), look: V(-0.2, 1.2, -0.4), fov: 50 },
    fan: { pos: V(3.2, 2.3, 4.9), look: V(-0.4, 1.0, -0.4), fov: 50 },
    kacak: { pos: V(0.9, 1.2, 2.6), look: V(1.75, 0.35, -0.2), fov: 46 },
    dolum: { pos: V(-0.8, 0.9, 3.9), look: V(-1.55, -0.45, 0.3), fov: 50 },
    evaporator: { pos: V(1.9, -0.4, 3.7), look: V(0.3, -1.3, 0.9), fov: 46 },
    filtre: { pos: V(1.2, 1.1, 3.6), look: V(0.1, -0.85, 0.7), fov: 46 },
    over: { pos: V(-3.8, 2.8, 9.4), look: V(-2.0, -0.2, 0), fov: 42 },
  };
let P = POSES();

// Masaüstünde hizmet sahnesi sağa kayar (kart solda). Künyede kaydırma yok: poz zaten konuyu sağa koyar.
function viewShift(amount) {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  if (phone || amount < 0.001) S.camera.clearViewOffset();
  else S.camera.setViewOffset(w, h, -w * 0.12 * amount, 0, w, h);
}

// Sahne durumu: hedef her karede hesaplanır, mevcut durum ona yumuşakça yaklaşır.
const base = () => ({
  clutch: 1, fan: 0.6, flow: 1, charge: 1, heat: 0, uv: 0, leak: 0, hoses: 0, frost: 0.6, air: 0.5,
  filter: 0, highlight: null, hlAmount: 0, env: 0.9, float: 1, shift: 0,
});
const cur = { ...base(), pos: P.hero.pos.clone(), look: P.hero.look.clone(), fov: P.hero.fov, heat: 1, frost: 0, air: 0 };
const intro = { heat: reducedMotion ? 0 : 1 };

// Hizmet i, yerel ilerleme p (0..1) için sahne hedefi.
function serviceTarget(s, p) {
  const t = { ...base(), shift: 1, ...P[s.map.key] };
  switch (s.map.key) {
    case 'dolum':
      Object.assign(t, { hoses: seg(p, 0.05, 0.3), charge: L(0.05, 1, smooth(seg(p, 0.35, 0.85))), heat: 1 - smooth(seg(p, 0.5, 0.95)), highlight: 'dolum' });
      break;
    case 'kacak':
      Object.assign(t, { uv: 1, leak: seg(p, 0.15, 0.35), charge: 0.4, heat: 0.8, highlight: 'kacak' });
      break;
    case 'kompresor':
      Object.assign(t, { clutch: smooth(seg(p, 0.2, 0.6)), heat: 0.9, highlight: 'kompresor' });
      break;
    case 'kondenser':
      Object.assign(t, { fan: 1, heat: 0.7, highlight: 'kondenser' });
      break;
    case 'fan':
      Object.assign(t, { fan: L(0.05, 1, smooth(seg(p, 0.2, 0.6))), heat: 0.7, highlight: 'kondenser' });
      break;
    case 'filtre':
      Object.assign(t, { filter: seg(p, 0.2, 0.75), air: 0.6, highlight: 'filtre' });
      break;
    case 'evaporator':
      Object.assign(t, { air: 1, frost: 1, highlight: 'evaporator' });
      break;
    default:
      Object.assign(t, { air: 0.8, frost: 0.8 });
  }
  t.hlAmount = t.highlight ? 1 : 0;
  return t;
}

const svcEls = $$('.svc');
const heroEl = $('#kunye');
const tag = $('[data-tag]'), tagT = $('[data-tag-t]');
const tagPos = { x: 0, y: 0, vis: false };
const PARCA = { kompresor: 'Kompresör', kondenser: 'Kondenser', kacak: 'Kaçak noktası', dolum: 'Alçak basınç ağzı', evaporator: 'Evaporatör', filtre: 'Polen filtresi' };
const sky = { hot: $('[data-sky-hot]'), uv: $('[data-sky-uv]') };
let active = -1, lastTag = '';

function computeTarget() {
  const vh = innerHeight;
  active = -1;
  let p = 0;
  svcEls.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    let on;
    if (phone) {
      // Telefonda kart ekranın altında yapışıkken etkin (bölüm başı ve sonu hariç).
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
  if (active >= 0) return serviceTarget(services[active], p);
  // Künye ve Hizmetler başlığı: genel görünüm; açılışta borular soğur.
  const t = { ...base(), ...P.hero, heat: intro.heat, frost: 1 - intro.heat, air: (1 - intro.heat) * 0.7 };
  const head = $('.services__head').getBoundingClientRect();
  if (head.top < vh * 0.6) Object.assign(t, P.over, { shift: 1 });
  return t;
}

const NUM = ['clutch', 'fan', 'flow', 'charge', 'heat', 'uv', 'leak', 'hoses', 'frost', 'air', 'filter', 'hlAmount', 'env', 'float', 'shift', 'fov'];
let running = false, prevT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000);
  prevT = now;
  const tg = computeTarget();
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 4.5);
  cur.pos.lerp(tg.pos, k);
  cur.look.lerp(tg.look, k);
  for (const key of NUM) cur[key] = L(cur[key], tg[key], key === 'heat' || key === 'uv' ? Math.min(1, k * 1.4) : k);
  if (tg.highlight) cur.highlight = tg.highlight;
  else if (cur.hlAmount < 0.02) cur.highlight = null;
  viewShift(cur.shift);
  S.update(cur, now);

  // Kabin rengi: sıcak → soğuk; kaçak testinde UV karanlığı.
  sky.hot.style.opacity = String(clamp(cur.heat * (active < 0 ? 1 : 0.35)));
  sky.uv.style.opacity = String(clamp(cur.uv));
  document.documentElement.classList.toggle('is-uv', cur.uv > 0.5);

  // Parça etiketi
  const s = active >= 0 ? services[active] : null;
  if (s?.map.tag) {
    const text = s.map.key === 'fan' ? 'Kondenser fanı' : PARCA[s.map.tag];
    if (text !== lastTag) { tagT.textContent = text; lastTag = text; }
    S.project(S.points[s.map.tag], tagPos);
    const card = svcEls[active].firstElementChild.getBoundingClientRect();
    const hidden = !tagPos.vis || (phone && tagPos.y > card.top - 60) || (!phone && tagPos.x < card.right + 20);
    tag.style.transform = `translate3d(${tagPos.x.toFixed(1)}px, ${tagPos.y.toFixed(1)}px, 0)`;
    tag.classList.toggle('is-on', !hidden && cur.hlAmount > 0.6);
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
  P = POSES();
  S.resize();
  if (phone) $$('.svc__card').forEach((c) => c.style.setProperty('--card-h', `${c.offsetHeight}px`));
}
addEventListener('resize', resize);
resize();

// --- Başlatma ----------------------------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  S.compile();
  S.assetsReady?.then(() => setTimeout(() => { cur.heat = 0; frame(performance.now()); }, 300));
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
  S.compile();
  gsap.to(canvas, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.1 });
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  // Açılış: sıcak borular ve kabin bir kez soğur (kaydırmaya bağlı değil, ~2 sn).
  gsap.to(intro, { heat: 0, duration: 2.2, ease: 'power1.inOut', delay: 0.6 });
  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  ['#about-title', '#shop-title', '#reviews-title', '#finale-title'].forEach((s) => rise(s, s));
  rise('.stats li', '.stats', { stagger: 0.1 });
  rise('.review', '.reviews__rail', { stagger: 0.06, y: 18 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
