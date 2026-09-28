// Gece Kesiti (sinematik aile, oto kilit): gece moru zemin, pirinç anahtar, leylak çizgiler; Tilt Warp + Onest.
// 3D iki yerde kalır. (1) Künye: arkada kesitli pim tamburlu kilit; açılışta anahtar bir kez girer, pimler
// kesme hattına oturur ve göbek döner. (2) Hizmetler: her hizmete gelince kamera ilgili parçaya gider (kesim
// tezgâhı, kilit silindiri, transponder çipi, sustalı kumanda); kartın üst satırı parçanın adıdır.
// Hizmetlerden sonra çizim durur; gerisi düz site bölümleri.
import taban from '../../data/sektor-kilit.json';
import ek from '../../data/kilit-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import * as THREE from 'three';
import { createScene, TIP_IN, TIP_OUT } from './scene.js';

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

// Hizmet → sahne ve kartın üst satırı (parça adı)
const SERVICE_MAP = [
  { re: /yedek/i, key: 'cut', yer: 'Anahtar kesim tezgâhı' },
  { re: /kayıp/i, key: 'chip', yer: 'Transponder çipi' },
  { re: /immobilizer|çip/i, key: 'chip', yer: 'Transponder çipi' },
  { re: /kumanda ve akıllı/i, key: 'fob', yer: 'Sustalı kumanda' },
  { re: /kab|pil/i, key: 'fobOpen', yer: 'Kumanda kartı ve pil' },
  { re: /araçta kalan/i, key: 'over', yer: 'Kapı kilidi' },
  { re: /kontak/i, key: 'turn', yer: 'Kontak silindiri ve pimler' },
  { re: /kapı ve bagaj/i, key: 'lock', yer: 'Kilit göbeği' },
  { re: /kırık/i, key: 'lockOut', yer: 'Kilit silindiri' },
];
const services = d.hizmetler.map((h) => ({ ...h, map: SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[5] }));

// --- Render ------------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10 12h4l1.2 9h-6.4z" fill="currentColor"/></svg>`;
$('#top').innerHTML = `
  <a class="top__brand" href="#kunye"><span class="top__mark">${logo}</span><span>${ad}</span></a>
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
      <a class="btn btn--brass" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="services__head">
    <h2 class="h2" id="services-title">Hizmetler</h2>
    <p class="services__sub">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  ${services.map((s, i) => `
    <article class="svc" data-i="${i}">
      <div class="svc__card">
        <p class="svc__tag"><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.map.yer)}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        <p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>
      </div>
    </article>`).join('')}
  <p class="services__note">3D kilit kesiti temsilîdir.</p>`;

const foto = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <figure class="about__img"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="1200" height="1500" loading="lazy" decoding="async" /></figure>
    <div class="about__body">
      <h2 class="h2" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGunSayisi(d.saatler)}<small> gün</small></b><span>haftada açık</span></li>
      </ul>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Anahtarı yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
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
      <h2 class="h2" id="shop-title">Çalışma saatleri ve konum</h2>
      <p class="shop__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
      </table>
      <p class="shop__addr">${esc(d.iletisim.adres)}</p>
      <div class="shop__cta">
        <a class="btn btn--brass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="shop__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="reviews-title">Örnek yorumlar</h2>
    <p class="reviews__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    <ul class="reviews__grid">
      ${d.yorumlar.map((r) => `
        <li class="review">
          <p class="review__stars" role="img" aria-label="5 üzerinden ${Number(r.puan)}">${stars(r.puan)}</p>
          <p class="review__text">${esc(r.metin)}</p>
          <p class="review__who"><b>${esc(r.ad)}</b><span>${esc(r.arac || '')}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="finale__title" id="finale-title">İletişim</h2>
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Aracın marka, model ve yılı yazılırsa anahtar tipi söylenir.</p>
    <div class="finale__cta">
      <a class="btn btn--brass btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
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
const S = createScene(canvas, { lite, aa: !weak });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const POSES = () => phone ? {
  hero: { pos: V(12.5, 5.4, 12.5), look: V(2.0, 0.2, 0), fov: 44, shift: 0.22 },
  cut: { pos: V(TIP_OUT + 3.6, 2.2, 6.2), look: V(TIP_OUT + 1.5, 0.1, 0), fov: 48, shift: 0.2 },
  lock: { pos: V(2.8, 1.9, 10.4), look: V(0.2, 0.6, 0), fov: 50, shift: 0.2 },
  turn: { pos: V(5.2, 3.6, 9.2), look: V(0.5, 0.4, 0), fov: 50, shift: 0.2 },
  chip: { pos: V(4.9, 5.6, 3.4), look: V(2.0, 0.0, 0), fov: 50, shift: 0.22 },
  fob: { pos: V(-4.2, 1.6, 8.6), look: V(-5.6, 0.4, 0.2), fov: 50, shift: 0.22 },
  over: { pos: V(-13.5, 6.5, 13), look: V(-2.2, 0.2, 0), fov: 46, shift: 0.2 },
} : {
  hero: { pos: V(2.8, 3.6, 11.4), look: V(-3.0, 0.3, 0), fov: 38, shift: 0 },
  cut: { pos: V(TIP_OUT + 0.6, 1.9, 6.4), look: V(TIP_OUT + 0.4, 0.1, 0), fov: 40, shift: 0 },
  lock: { pos: V(-1.3, 1.5, 6.4), look: V(-1.6, 0.6, 0), fov: 44, shift: 0 },
  turn: { pos: V(0.9, 2.6, 6.0), look: V(-1.1, 0.4, 0), fov: 44, shift: 0 },
  chip: { pos: V(2.2, 4.8, 4.3), look: V(1.0, 0.0, 0), fov: 38, shift: 0 },
  fob: { pos: V(-4.9, 1.2, 6.2), look: V(-6.2, 0.4, 0.2), fov: 42, shift: 0 },
  over: { pos: V(0.2, 3.8, 10.5), look: V(-1.6, 0.2, 0), fov: 40, shift: 0 },
};
let P = POSES();

const base = () => ({ cut: 1, cutting: false, bench: 0, tipX: TIP_IN, shear: 0, turn: 0, xray: 0, rf: 0, fob: 0, flip: 0, explode: 0, press: 0, env: 0.85 });
const intro = { k: reducedMotion ? 1 : 0 };
const UP = V(0, 1, 0);
const tmp = new THREE.Vector3();
// Masaüstünde hizmet sahnesi sağa kayar (kart solda): bakış noktası kameranın soluna alınır.
function sideShift(pose, amount) {
  if (phone || amount <= 0) return pose;
  const dir = tmp.copy(pose.look).sub(pose.pos);
  const dist = dir.length();
  const right = dir.normalize().cross(UP).normalize();
  return { ...pose, look: pose.look.clone().addScaledVector(right, -dist * 0.2 * amount) };
}

function serviceTarget(s, p) {
  const k = s.map.key;
  const t = { ...base() };
  if (k === 'cut') return { ...t, ...P.cut, cut: smooth(seg(p, 0.1, 0.85)), cutting: p > 0.08 && p < 0.9, bench: 1, tipX: TIP_OUT };
  if (k === 'chip') return { ...t, ...P.chip, xray: 1, rf: seg(p, 0.2, 0.4) };
  if (k === 'fob') return { ...t, ...P.fob, fob: 1, flip: smooth(seg(p, 0.1, 0.4)) };
  if (k === 'fobOpen') return { ...t, ...P.fob, fob: 1, flip: 1, explode: smooth(seg(p, 0.15, 0.5)) };
  if (k === 'turn') return { ...t, ...P.turn, shear: 1, turn: -Math.PI / 2 * smooth(seg(p, 0.25, 0.6)) };
  if (k === 'lock') return { ...t, ...P.lock, tipX: L(TIP_OUT, TIP_IN, smooth(seg(p, 0.05, 0.5))), shear: seg(p, 0.45, 0.55) };
  if (k === 'lockOut') return { ...t, ...P.lock, tipX: L(TIP_IN, TIP_OUT, smooth(seg(p, 0.2, 0.7))) };
  return { ...t, ...P.over };
}

const svcEls = $$('.svc');
let active = -1;
function target() {
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
  if (active >= 0) return { ...serviceTarget(services[active], p), side: 1 };
  const head = $('.services__head').getBoundingClientRect();
  if (head.top < vh * 0.6) return { ...base(), ...P.over, side: 1 };
  // Künye: anahtar girer, pimler hizalanır, göbek döner (açılışta bir kez).
  const k = intro.k;
  return { ...base(), ...P.hero, side: 0, tipX: L(TIP_OUT, TIP_IN, smooth(seg(k, 0, 0.6))), shear: seg(k, 0.55, 0.7), turn: -Math.PI / 2 * smooth(seg(k, 0.7, 1)) };
}

const cur = { ...base(), ...P.hero, pos: P.hero.pos.clone(), look: P.hero.look.clone(), tipX: TIP_OUT, side: 0 };
const NUM = ['cut', 'bench', 'tipX', 'shear', 'turn', 'xray', 'rf', 'fob', 'flip', 'explode', 'press', 'env', 'fov', 'shift', 'side'];
let running = false, prevT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000);
  prevT = now;
  const tg = target();
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 4.5);
  cur.pos.lerp(tg.pos, k);
  cur.look.lerp(tg.look, k);
  for (const key of NUM) cur[key] = L(cur[key], tg[key], key === 'tipX' || key === 'turn' || key === 'cut' ? Math.min(1, k * 1.6) : k);
  cur.cutting = tg.cutting;
  const shot = sideShift({ pos: cur.pos, look: cur.look }, cur.side);
  S.update({ ...cur, pos: shot.pos, look: shot.look }, now);
  if (running) requestAnimationFrame(frame);
}

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
  frame(performance.now());
} else {
  initSmoothScroll({ lerp: 0.1 });
  if (phone) {
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (t) => setStoryMode(t.isActive ? true : null),
    });
  }
  S.compile();
  gsap.to(canvas, { opacity: 1, duration: 0.8, delay: 0.1 });
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  gsap.to(intro, { k: 1, duration: 2.2, ease: 'power1.inOut', delay: 0.5 });
  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  ['#about-title', '#shop-title', '#reviews-title', '#finale-title'].forEach((s) => rise(s, s));
  rise('.stats li', '.stats', { stagger: 0.1 });
  rise('.review', '.reviews__grid', { stagger: 0.06, y: 18 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
