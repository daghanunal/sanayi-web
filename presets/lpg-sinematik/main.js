// Mavi Hat (sinematik aile, LPG): gece laciverti, buz, emniyet sarısı ve alev mavisi; Tektur + Commissioner.
// 3D iki yerde kalır. (1) Künye: arkada mavi alev halkası; açılışta bir kez tutuşur. (2) Hizmetler: her hizmete
// gelince kamera LPG sisteminin ilgili parçasına gider (tank, çok valf, regülatör, enjektör rampası, silindir),
// arka plan rengi değişir; kartın üst satırı parçanın adıdır. Hizmetlerden sonra çizim durur.
import veri from '../../data/sektor-lpg.json';
import ek from '../../data/lpg-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { createScene } from './scene.js';

const d = boot({ ...veri, ...ek });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;

const phone = matchMedia('(max-width: 899px)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || phone;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const st = gunDurumu(d.saatler);

// --- Sahne durumları -------------------------------------------------------------------------
const NIGHT = '#04061a', ICE = '#dfe8f1', INK = '#0b1330', LIGHT = '#eef3ff';
const base = { fill: 0.8, flow: 0, speed: 0.1, regGlow: 0, inj: 0, burn: 0, amber: 0, rim: 2, env: 0.9, flat: 1, tank: 1, flame: 0, pd: 1.7, fx: 0.9, fy: 1.1 };
const SHOT = {
  alev: { ...base, bg: NIGHT, dark: 1, cam: [0, 0.1, 5.6], look: [0, 0, 0], pd: 2.05, fx: 2.3, fy: 1.6, flat: 0, tank: 0, flame: 1, rim: 3, env: 0.35 },
  tank: { ...base, bg: ICE, dark: 0, cam: [2.6, 2.9, 3.6], look: [0.1, -0.1, 0], pd: 1.95, fx: 1.3, fy: 1.5 },
  valf: { ...base, bg: '#ffb21e', dark: 0, cam: [2.3, 1.6, 2.2], look: [1.0, 0.4, 0.05], pd: 1.6, fx: 1.75, fy: 1.35, fill: 0.5, flow: 1, speed: 0.08, env: 1 },
  reg: { ...base, bg: '#2447ff', dark: 1, cam: [5.4, 1.5, 1.0], look: [3.75, 0.55, -0.6], pd: 1.9, fx: 1.0, fy: 1.35, flow: 1, speed: 0.08, regGlow: 1, rim: 1, env: 0.9 },
  rampa: { ...base, bg: '#070a18', dark: 1, cam: [8.4, 1.95, 3.0], look: [6.95, 0.45, -0.35], pd: 2.1, fx: 1.1, fy: 1.35, flow: 1, speed: 0.1, inj: 1, rim: 3.5, env: 0.55 },
  silindir: { ...base, bg: '#e6eef5', dark: 0, cam: [12.95, 1.65, 4.15], look: [11.6, 0.5, -0.3], pd: 2.25, fx: 1.0, fy: 1.35, flow: 0.4, inj: 0.4, burn: 1, amber: 0.3, env: 1 },
  genel: { ...base, bg: NIGHT, dark: 1, cam: [6.6, 10.5, 21.4], look: [5.8, 0.2, -0.3], pcam: [15.5, 6.5, 7.5], pd: 1, fx: 1.95, fy: 1.2, flow: 1, inj: 1, burn: 1, regGlow: 0.7, rim: 3, env: 0.6 },
};
for (const k of Object.values(SHOT)) k.pcam ||= k.cam;

// Hizmet → sahne ve kartın üst satırı (parça adı)
const SERVICE_MAP = [
  { re: /sıralı/i, shot: 'rampa', yer: 'Enjektör rampası' },
  { re: /direkt/i, shot: 'silindir', yer: 'Silindir' },
  { re: /bakım|filtre/i, shot: 'reg', yer: 'Regülatör ve buhar filtresi' },
  { re: /ayar|arıza/i, shot: 'genel', yer: 'Elektronik ünite ve enjektörler' },
  { re: /muayene/i, shot: 'valf', yer: 'Çok valf ve bağlantılar' },
  { re: /proje|ruhsat/i, shot: 'genel', yer: 'Evrak' },
  { re: /tank/i, shot: 'tank', yer: 'Simit tank' },
  { re: /yenileme/i, shot: 'genel', yer: 'LPG sistemi' },
];
const services = d.hizmetler.map((h) => ({ ...h, map: SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[7] }));

// --- Render ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <div class="top__row">
    <a class="top__brand" href="#kunye"><i class="top__mark" aria-hidden="true"></i><span>${ad}</span></a>
    <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
    <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
    <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>
  </div>`;

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
      <a class="btn btn--flame" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
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
  <p class="services__note">3D görseller temsilîdir. Parça seçimi araca göre değişir.</p>`;

const foto = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__body">
      <h2 class="h2" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGunSayisi(d.saatler)}<small> gün</small></b><span>haftada açık</span></li>
      </ul>
    </div>
    <figure class="about__img"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="1200" height="900" loading="lazy" decoding="async" /></figure>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Dönüşüm yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
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
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
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
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Ruhsatın fotoğrafı WhatsApp'tan gönderilirse motor tipine göre uygun sistem söylenir.</p>
    <div class="finale__cta">
      <a class="btn btn--flame btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
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
const root = document.documentElement;
const solid = () => topEl.classList.toggle('is-scrolled', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();
if (phone) autoHideHeader(topEl, { offset: 120 });

// --- 3D sahne ----------------------------------------------------------------------------

const canvas = $('#gl');
const backdrop = $('[data-backdrop]');
let S = null;
try { S = createScene(canvas, { lite }); } catch { canvas.remove(); }

const svcEls = $$('.svc');
const intro = { k: reducedMotion ? 1 : 0 };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a) => `#${a.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const cur = { ...SHOT.alev, bgRGB: hex(NIGHT), flame: 0 };
let active = -1;

function target() {
  const vh = innerHeight;
  active = -1;
  svcEls.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    let on;
    if (phone) {
      const c = el.firstElementChild.getBoundingClientRect();
      on = c.top > r.top + 2 && c.bottom < r.bottom - 2 && r.top < vh * 0.4;
    } else on = r.top < vh * 0.55 && r.bottom > vh * 0.45;
    el.classList.toggle('is-active', on);
    if (on) active = i;
  });
  if (active >= 0) return SHOT[services[active].map.shot];
  const head = $('.services__head').getBoundingClientRect();
  if (head.top < vh * 0.6) return SHOT.genel;
  return { ...SHOT.alev, flame: intro.k };
}

let running = false, prevT = performance.now(), lastBg = '';
function frame(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000);
  prevT = now;
  const tg = target();
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 4);
  for (const key of Object.keys(base).concat(['flame', 'dark'])) cur[key] = L(cur[key] ?? 0, tg[key] ?? 0, k);
  cur.cam = cur.cam.map((v, i) => L(v, tg.cam[i], k));
  cur.pcam = cur.pcam.map((v, i) => L(v, tg.pcam[i], k));
  cur.look = cur.look.map((v, i) => L(v, tg.look[i], k));
  const tb = hex(tg.bg);
  cur.bgRGB = cur.bgRGB.map((v, i) => L(v, tb[i], k));
  const bg = toHex(cur.bgRGB);
  if (bg !== lastBg) { backdrop.style.background = bg; lastBg = bg; }
  root.classList.toggle('is-dark', cur.dark > 0.5);
  if (S) S.render({ ...cur, time: now / 1000, firing: -1 });
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
  S?.resize();
  if (phone) $$('.svc__card').forEach((c) => c.style.setProperty('--card-h', `${c.offsetHeight}px`));
}
addEventListener('resize', resize);
resize();

// --- Başlatma ----------------------------------------------------------------------------

if (reducedMotion) {
  root.classList.add('is-static');
  frame(performance.now());
  S?.ready?.then(() => frame(performance.now()));
} else {
  initSmoothScroll({ lerp: 0.1 });
  if (phone) {
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (t) => setStoryMode(t.isActive ? true : null),
    });
  }
  gsap.to(canvas, { opacity: 1, duration: 0.8, delay: 0.1 });
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  // Açılış: alev halkası bir kez tutuşur (~1,5 sn).
  gsap.to(intro, { k: 1, duration: 1.5, ease: 'power2.out', delay: 0.3 });
  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  ['#about-title', '#shop-title', '#reviews-title', '#finale-title'].forEach((s) => rise(s, s));
  rise('.stats li', '.stats', { stagger: 0.1 });
  rise('.review', '.reviews__grid', { stagger: 0.06, y: 18 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
