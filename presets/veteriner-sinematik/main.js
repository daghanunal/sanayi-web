// Karne (sinematik aile, veteriner kliniği): gece çivitisi zemin, nane ve pembe vurgu, el yazısı.
// 3D yalnız açılışta: künyenin yanında (telefonda üstünde) sağlık karnesi bir kez masaya iner ve kapağı
// açılır; kimlik ve muayene sayfalarındaki el yazısı yazılır. Kaydırma kilitlenmez, perde yok.
// Bölüm ekrandan çıkınca çizim durur. Gerisi normal site bölümleri.
import temel from '../../data/sektor-veteriner.json';
import ek from '../../data/veteriner-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { createScene, W } from './scene.js';
import { buildPages, pawSprite } from './pages.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, preset: 'veteriner-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const sm = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const lower = (s) => s.toLocaleLowerCase('tr');
const IMG = (n) => asset(`/img/sektor-veteriner/${n}.jpg`);
const waGenel = d.waMesaj || 'Merhaba, randevu almak istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta klinik metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: veteriner kliniği ------------------------------------------------
(function vetLd() {
  $$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
  const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
  document.head.append(ld);
  document.title = `${d.isletme.ad} | Veteriner Kliniği | Etimesgut, Ankara`;
})();

// --- İçerik ------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, tanim: d.isletme.tanim, telefon: d.iletisim.telefon,
  adres: d.iletisim.adres, kisaAdres: kisaAdres(d.iletisim.adres),
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, waGenel)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-year]').textContent = new Date().getFullYear();
if (d.isletme.ad.length > 22) $('.hero__title').classList.add('is-long');

function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
  const top = $('[data-top-status]');
  top.textContent = s.open ? 'Açık' : 'Kapalı';
  top.classList.toggle('is-open', s.open);
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// Hizmetler: karne sekmeleri
const TABC = ['mint', 'lilac', 'pink', 'butter'];
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <article class="svc__card svc__card--${TABC[i % 4]}${s.id === 'acil' ? ' is-acil' : ''}">
    <p class="svc__tab"><b>${String(i + 1).padStart(2, '0')}</b>${esc(s.kisa || s.baslik)}</p>
    <div class="svc__inner">
      ${s.gorsel ? `<figure class="svc__img"><img src="${esc(s.gorsel)}" alt="${esc(s.gorselAlt || '')}" loading="lazy" decoding="async" width="800" height="600" /></figure>` : ''}
      <div class="svc__body">
        <h3 class="svc__name">${esc(s.baslik)}</h3>
        <p class="svc__desc">${esc(s.aciklama)}</p>
        <p class="svc__foot">${s.sure ? `<span class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</span>` : '<span></span>'}
          ${s.id === 'acil'
            ? `<a href="${esc(telHref(d))}">${icons.phone}<span>Ara</span></a>`
            : `<a href="${esc(waHref(d, s.mesaj || `Merhaba, ${lower(s.baslik)} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bilgi alın</span></a>`}</p>
      </div>
    </div>
  </article>`).join('');

// Hakkında + rakamlar (yalnız olgular: kuruluştan geçen yıl, haftada açık gün)
const yil = new Date().getFullYear() - d.isletme.kurulus;
const yer = d.isletme.yer || "Etimesgut'ta";
$('[data-about-text]').textContent = `${d.isletme.ad} ${yilEki(d.isletme.kurulus)} beri ${yer}. ${d.isletme.hakkinda}`;
$('[data-facts]').innerHTML = (d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
$('[data-stats]').innerHTML = [
  { n: yil, u: ' yıl', l: yer },
  { n: acikGunSayisi(d.saatler), u: ' gün', l: 'haftada açık' },
].map((s) => `<li class="stat"><p class="stat__num"><b>${s.n}</b>${esc(s.u)}</p><p class="stat__lbl">${esc(s.l)}</p></li>`).join('');

// Galeri
$('[data-gallery]').innerHTML = d.galeri.slice(0, 10).map((g, i) => `
  <figure class="pol" style="--r:${[-3, 2, -1.5, 3, -2.5, 1][i % 6]}deg"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="900" height="700" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// Örnek yorumlar
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__pet">${esc(y.arac || '')}</p>
    <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption>${esc(y.ad)}</figcaption>
  </figure>`).join('');

// Saatler
$('[data-hours]').innerHTML = saatListesi(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Başlık çubuğu ---------------------------------------------------------------
const topEl = $('[data-top]');
ScrollTrigger.create({ start: 60, end: 'max', onToggle: (s) => topEl.classList.toggle('is-solid', s.isActive) });
if (matchMedia('(max-width: 899px)').matches) autoHideHeader(topEl, { offset: 140 });

// --- Sahne: yalnız açılışta ------------------------------------------------------

const hero = $('.hero');
const canvas = $('[data-stage]');
let S = null;
try {
  S = createScene(canvas, { lite });
} catch {
  document.documentElement.classList.add('no-gl');
}

// Açılış ilerlemesi t: 0 kapalı karne havada → 0,45 masaya iner → 0,8 kapak açık → 1 el yazısı yazıldı.
const intro = { t: reducedMotion ? 1 : 0 };
function camFor(open, time) {
  const m = mobile();
  const port = innerHeight > innerWidth * 1.15;
  const sway = reducedMotion ? 0 : Math.sin(time * 0.3) * 0.035;
  // [tx, tz, dist, el, az, fov, sx, sy]
  let A, B;
  if (m) {
    A = [0, 0.05, 4.1, 0.62, 0, 40, 0, 0.02];
    B = [0, 0.02, 4.3, 1.08, 0.12, 40, 0, 0.02];
  } else if (port) {
    A = [0, 0, 3.9, 0.6, 0, 34, 0, 0.02];
    B = [0, 0.02, 4.4, 1.05, 0.12, 34, 0, 0.02];
  } else {
    // Masaüstü: künye solda, karne sağ yarıda.
    const kd = Math.max(1, 1.6 / (innerWidth / innerHeight));
    A = [0, 0, 3.4 * kd, 0.55, 0, 34, 0.2, 0.02];
    B = [0, 0.02, 4.2 * kd, 1.0, 0.16, 34, 0.22, 0.0];
  }
  const out = A.map((v, j) => L(v, B[j], sm(open)));
  out[4] += sway;
  return out;
}
function heroState(t, time) {
  const land = sm(seg(t, 0, 0.45));
  const open = sm(seg(t, 0.38, 0.8));
  const bob = Math.sin(time * 0.9) * 0.025 * (1 - land);
  const cam = camFor(open, time);
  const ink = new Array(11).fill(0);
  ink[1] = seg(t, 0.6, 0.9);
  ink[2] = seg(t, 0.72, 1);
  const m = mobile();
  return {
    tx: cam[0], ty: 0, tz: cam[1], dist: cam[2], el: cam[3], az: cam[4], fov: cam[5], sx: cam[6], sy: cam[7],
    bx: -W / 2 * (1 - open), by: L(m ? 0.25 : 0.3, 0, land) + bob, bz: 0,
    rx: L(m ? 0.72 : 0.62, 0, land) + Math.sin(time * 0.7) * 0.03 * (1 - land),
    ry: L(-0.38 + Math.sin(time * 0.4) * 0.12, 0, land),
    rz: L(m ? 0.12 : 0.16, 0, land),
    flip: [open, 0, 0, 0, 0], curl: 0.9, ink, stamps: [0, 0, 0], tool: 0, toolAt: 0, toolH: 0.16, toolTilt: 0,
    glow: 0, paws: 0,
  };
}

function loadImg(src) {
  return new Promise((res) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}
async function fontsReady() {
  const list = ['400 40px "Paytone One"', '600 40px "Parkinsans"', '700 40px "Parkinsans"', '700 40px "Kalam"', '700 40px "Courier Prime"'];
  const t = new Promise((r) => setTimeout(r, 3000));
  await Promise.race([Promise.all(list.map((f) => document.fonts.load(f, 'ğşİıöçü'))), t]).catch(() => {});
}
// Yalnız kapak ve ilk açılan iki sayfa (kimlik, muayene) çizilir.
async function buildTextures() {
  const [imgs] = await Promise.all([Promise.all(['kedi', 'steteskop'].map((n) => loadImg(IMG(n)))), fontsReady()]);
  const [kedi, steteskop] = imgs;
  const { pages } = buildPages(d, { kedi, steteskop }, lite ? 720 : 1024, null, 3);
  for (let i = 0; i < pages.length; i++) {
    S.setPage(i, pages[i]);
    await new Promise((r) => setTimeout(r, 0));
  }
  S.setPaw(pawSprite());
}

let visible = true;
let running = false;
function tick(time) {
  if (!visible || document.hidden) return;
  S.render(heroState(intro.t, time), time);
}
function sync() {
  const on = visible && !document.hidden;
  if (on && !running) { gsap.ticker.add(tick); running = true; }
  else if (!on && running) { gsap.ticker.remove(tick); running = false; }
}

if (S) {
  gsap.set(canvas, { autoAlpha: 0 });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(hero);
  document.addEventListener('visibilitychange', sync);
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => S.resize(), 120); });
  Promise.race([buildTextures(), new Promise((r) => setTimeout(r, 2500))]).then(() => {
    S.resize();
    sync();
    gsap.to(canvas, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' });
    if (!reducedMotion) gsap.to(intro, { t: 1, duration: 2.6, ease: 'power1.inOut', delay: 0.1 });
    // Kaydırdıkça sahne hafifçe kararır.
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: (s) => (canvas.style.opacity = String(1 - s.progress * 0.6)),
    });
  });
}

// --- Metin hareketleri (sakin: bir kez, küçük kayma) ---------------------------------
initSmoothScroll();
if (!reducedMotion) {
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.05, clearProps: 'opacity,visibility,transform' });
  $$('.sec-title').forEach((el) => gsap.from(el, { y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  $$('.svc__card').forEach((el) => {
    gsap.fromTo(el, { y: 40, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.8, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 94%', toggleActions: 'play none none none' },
    });
  });
  // Galeri: sayfa kaydıkça yatay kayar
  const track = $('[data-gallery]');
  gsap.fromTo(track, { x: () => innerWidth * 0.05 }, {
    x: () => -(track.scrollWidth - innerWidth * 0.95), ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  $$('.rev').forEach((el, i) => {
    gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', delay: (i % 3) * 0.06, scrollTrigger: { trigger: el, start: 'top 94%', toggleActions: 'play none none none' } });
  });
}
addEventListener('load', () => ScrollTrigger.refresh());
