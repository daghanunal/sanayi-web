import veri from '../../data/manifold.json';
import ek from '../../data/egzoz-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { createScene } from './scene.js';

// Duman Dili: afiş renkleri, dev Anton harfler. 3D yalnız künyede: aracın arka tamponu, çift egzoz ucu,
// uçlardan süzülen duman. Açılışta kısa bir duman patlaması (~1 sn), sonra sakin rölanti dumanı.
// Künye ekrandan çıkınca çizim durur; gerisi normal site bölümleridir.

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, ...ek, preset: 'egzoz-sinematik2' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mq = matchMedia('(max-width: 899px)');
const phone = mq.matches;
mq.addEventListener('change', () => location.reload());

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// --- Render ------------------------------------------------------------------------------

const mark = `<i class="top__mark" aria-hidden="true"><b></b><b></b></i>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

$('#kunye-ic').innerHTML = `
  <h1 class="hero__title ${d.isletme.ad.length > 16 ? 'is-long' : ''}" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--hot" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

$('#hizmetler').innerHTML = `
  <header class="svc__head">
    <h2 class="h2" id="services-title">Hizmetler</h2>
    <p class="svc__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </header>
  <ol class="svc__list">
    ${d.hizmetler.map((s, i) => `
      <li class="svc__row">
        <span class="svc__n" aria-hidden="true">${pad(i + 1)}</span>
        <h3 class="svc__name">${esc(s.baslik)}</h3>
        <p class="svc__desc">${esc(s.aciklama)}</p>
        <p class="svc__time">${esc(s.sure)}</p>
      </li>`).join('')}
  </ol>`;

const g = d.galeri || [];
$('#hakkinda').innerHTML = `
  <div class="about__lead">
    <h2 class="h2" id="about-title">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
  </div>
  <dl class="stats">
    <div class="stat"><dd><b data-count="${yas}">${yas}</b><span>yıl</span></dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
    <div class="stat"><dd><b data-count="${acikGun}">${acikGun}</b><span>gün</span></dd><dt>haftada açık</dt></div>
  </dl>
  <div class="about__grid">
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <div class="about__photos">
      ${g.slice(0, 2).map((p, i) => `<figure class="ph ph--${i}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" width="1000" height="1250" loading="lazy" decoding="async" /></figure>`).join('')}
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="h2" id="shop-title">Çalışma saatleri ve konum</h2>
    <p class="shop__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([gun, s]) => `<tr class="${s === 'Kapalı' ? 'is-closed' : ''}"><th scope="row">${esc(gun)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="shop__addr">${esc(d.iletisim.adres)}</p>
    <div class="shop__cta">
      <a class="btn btn--hot" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line btn--ink" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="shop__map" id="map"><p>Harita</p></div>`;

const stars = (n) => `<p class="rev__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <h2 class="h2" id="reviews-title">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <div class="reviews__list">
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        ${stars(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac || '')}</span></figcaption>
      </figure>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <div class="finale__inner">
    <h2 class="finale__title" id="finale-title">İletişim</h2>
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="finale__cta">
      <a class="btn btn--ink-solid btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--ink btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${yil} ${ad} · Pexels'ten alınan fotoğraflar ve 3D görsel temsilîdir · Yorumlar örnektir</p>`;

const mapBox = $('#map');
new IntersectionObserver((entries, obs) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne: yalnız künyede ------------------------------------------------------------------

const canvas = $('[data-stage]');
let S = null;
try { S = createScene(canvas); } catch (e) { canvas.remove(); }

// Sakin rölanti dumanı: açık gri, hafif; kırmızı kontur ışığı markanın rengi.
const BASE = {
  smoke: [0.86, 0.86, 0.88], smoke2: [0.95, 0.95, 0.96], density: 0.4, push: 1.4, spread: 0.9, size: 1, count: 0.7,
  rise: 1.8, wind: 0.3, rim: [1, 0.23, 0.36], glow: 0, az: phone ? 0.4 : 0.7, el: phone ? 0.16 : 0.2, dist: phone ? 15 : 9.4, lookX: phone ? 0.6 : -2.6, lookY: phone ? -5.2 : 0.3,
  ring: 0, ringAlpha: 0, burst: 0,
};
const P = { burst: reducedMotion ? 0 : 1, scroll: 0 };
const t0 = performance.now();

function frame() {
  const time = (performance.now() - t0) / 1000;
  const b = P.burst;
  const q = P.scroll;
  S.render({
    ...BASE,
    time,
    burst: b,
    density: BASE.density + (1 - BASE.density) * b * 0.9,
    count: BASE.count + (1 - BASE.count) * b,
    dist: BASE.dist + b * 0.8 + q * 0.6,
    az: BASE.az - q * 0.35,
    el: BASE.el + q * 0.08,
  });
}

let heroVisible = true;
let running = false;
function loop() {
  if (!running) return;
  frame();
  requestAnimationFrame(loop);
}
function sync() {
  const on = S && S.isReady() && heroVisible && !document.hidden && !reducedMotion;
  if (on && !running) { running = true; requestAnimationFrame(loop); }
  if (!on) running = false;
}

if (S) {
  new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; sync(); }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  addEventListener('resize', () => { S.resize(); if (reducedMotion && S.isReady()) frame(); });
  S.readyP.then(() => {
    S.resize();
    gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' });
    if (reducedMotion) { frame(); return; }
    // Açılış: uçlardan yoğun bir duman çıkar, ~1 sn içinde rölanti dumanına iner.
    gsap.to(P, { burst: 0, duration: 1.2, ease: 'power2.out', delay: 0.1 });
    sync();
  }).catch((e) => { console.warn('3D sahne yüklenemedi', e); canvas.remove(); });
}

// --- Hareket (sakin: bir kez, küçük kayma) --------------------------------------------------

initSmoothScroll({ lerp: 0.09 });
const top = $('#top');
ScrollTrigger.create({ start: 80, onToggle: (s) => top.classList.toggle('is-solid', s.isActive) });
if (phone) autoHideHeader(top, { offset: 140 });

if (!reducedMotion) {
  ScrollTrigger.create({ trigger: '#kunye', start: 'top top', end: 'bottom top', onUpdate: (s) => (P.scroll = s.progress) });
  // Ad alttan yukarı açılır (kutusu yerinden oynamaz, alttaki satırla çakışmaz).
  gsap.fromTo('#hero-title', { clipPath: 'inset(100% -5% -10% -5%)' }, { clipPath: 'inset(-10% -5% -10% -5%)', duration: 0.9, ease: 'expo.out', clearProps: 'clipPath' });
  gsap.from(['.hero__what', '.kunye', '.hero__cta'], { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.15, ease: 'power3.out', clearProps: 'all' });
  $$('.svc__row').forEach((li) => {
    gsap.from(li, { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 92%', toggleActions: 'play none none none' } });
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count) || 0;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });
  $$('.ph').forEach((f, i) => {
    gsap.fromTo(f, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1, delay: i * 0.12, ease: 'expo.inOut', scrollTrigger: { trigger: f, start: 'top 88%', toggleActions: 'play none none none' } });
  });
  $$('.rev').forEach((el, i) => {
    gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.6, delay: (i % 3) * 0.06, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' } });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
