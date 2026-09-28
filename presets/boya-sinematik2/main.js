import '../../shared/base.css';
import './style.css';
import base from '../../data/showroom.json';
import extra from '../../data/boya-sinematik2.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld } from './scene.js';

// Yansıma (sinematik). 3D yalnız açılışta: ışık tahtasının bantları çamurlukta yansır; açılışta bir kez
// dolu göçükleri oluşur ve boyaya dokunmadan çıkarılır (~3 sn, kaydırmaya bağlı değil). Künye ekrandan
// çıkınca çizim durur; gerisi normal site bölümleridir.

gsap.registerPlugin(SplitText);

const d = boot({ ...base, ...extra });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const mq = matchMedia('(max-width: 899px)');
const phone = mq.matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
mq.addEventListener('change', () => location.reload());

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ext = 'target="_blank" rel="noopener"';
const fotoMesaj = `Merhaba ${d.isletme.ad}, aracımdaki hasarın fotoğraflarını gönderiyorum. Fiyat öğrenebilir miyim?`;

// --- Render --------------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 28 20" aria-hidden="true"><path d="M1 3h26M1 10c8 0 9 3 13 3s5-3 13-3M1 17h26" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`;

$('#top').innerHTML = `
  <div class="top__row">
    <a class="top__brand" href="#sahne">${logo}<span>${ad}</span></a>
    <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
    <p class="top__status ${st.open ? 'is-open' : ''}" data-status-short><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
    <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>
  </div>`;

$('#sahne').innerHTML = `
  <div class="hero__inner">
    <div class="copy">
      <h1 class="h1" id="hero-title">${ad}</h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="lamp ${st.open ? 'is-open' : ''}" data-status data-kunye><i></i><span data-long>${esc(st.kunye)}</span></dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="actions">
        <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="svc-title">Hizmetler</h2>
      <p class="sec-head__p">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <ol class="svc__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc__row">
          <span class="svc__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div class="svc__txt"><h3>${esc(h.baslik)}</h3><p>${esc(h.aciklama)}</p></div>
          ${h.sure ? `<span class="svc__time">Süre: ${esc(h.sure)}</span>` : '<span></span>'}
          ${h.gorsel ? `<img class="svc__img" src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" width="400" height="300">` : ''}
        </li>`).join('')}
    </ol>
  </div>`;

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__main">
      <h2 class="h2" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b data-count="${yas}">${yas}</b> yıl</dd></div>
        <div><dt>haftada açık</dt><dd><b data-count="${acikGun}">${acikGun}</b> gün</dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2" id="visit-title">Çalışma saatleri ve konum</h2>
      <p class="visit__status lamp ${st.open ? 'is-open' : ''}" data-status><i></i><span data-long>${esc(st.metin)}</span></p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
      </table>
      <address class="visit__addr">${esc(d.iletisim.adres)}</address>
      <div class="actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line btn--line-ink" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" ${ext}>Haritada aç</a></div>
  </div>`;

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="reviews-title">Örnek yorumlar</h2>
      <p class="sec-head__p">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </div>
    <ul class="reviews__list">
      ${d.yorumlar.map((y) => `
        <li class="review">
          ${stars(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="review__who"><b>${esc(y.ad)}</b> · ${esc(y.arac)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

$('#iletisim').innerHTML = `
  <div class="wrap final__inner">
    <div class="final__zebra" aria-hidden="true"></div>
    <h2 class="h2 h2--xl" id="final-title">İletişim</h2>
    <p class="lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Hasarın fotoğrafı WhatsApp'tan gönderilebilir.</p>
    <div class="actions">
      <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--line-dark" href="${waHref(d, fotoMesaj)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__note">${esc(d.iletisim.adres)}<br><span data-status><span data-long>${esc(st.metin)}</span></span></p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir. Işık haritası: Poly Haven (CC0).</p>
  </div>`;

// Harita yaklaşınca yüklensin
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
  const sh = $('[data-status-short]');
  sh.classList.toggle('is-open', s.open);
  sh.querySelector('span').textContent = s.open ? 'Açık' : 'Kapalı';
}
setInterval(refreshStatus, 60_000);

// --- Başlık çubuğu ------------------------------------------------------------------------------

ScrollTrigger.create({
  trigger: '#solid', start: 'top 64px', endTrigger: '#foot', end: 'bottom top',
  onToggle: (s) => $('#top').classList.toggle('is-solid', s.isActive),
});

// --- 3D: yalnız künyede ------------------------------------------------------------------------

const canvas = $('#gl');
let world = null;
try {
  world = createWorld(canvas, { phone, low });
} catch (e) {
  console.warn('WebGL yok', e);
  document.documentElement.classList.add('no-gl');
}
const S = world?.S ?? {};
// Masaüstünde panel sağda, telefonda yukarıda
const OFF = phone ? { x: 0, y: innerHeight < 800 ? -1.2 : -0.95 } : { x: 0.8, y: 0 };
let canvasOn = true;

if (world) {
  world.whenReady.then(() => canvas.classList.add('is-ready'));
  addEventListener('resize', () => world.resize());
  new IntersectionObserver((entries) => {
    canvasOn = entries[0].isIntersecting;
    canvas.classList.toggle('is-off', !canvasOn);
  }).observe($('#sahne'));
  Object.assign(S, { offX: OFF.x, offY: OFF.y });
  world.view('hero');
  world.snap();
}

let heroP = 0;
function tick() {
  if (!world || !canvasOn) return;
  // Bantlar panel üstünde yavaşça akar; kaydırdıkça kamera hafifçe tepeden bakar.
  S.envRot = Math.sin(performance.now() / 2600) * 0.08 + heroP * 0.3;
  world.view('seramik', heroP * 0.5, 'hero');
  if (world.isReady()) world.render();
}

function start() {
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    if (world) world.whenReady.then(() => world.render());
    return;
  }
  initSmoothScroll({ lerp: 0.1 });
  if (phone) autoHideHeader($('#top'), { offset: 120 });
  ScrollTrigger.create({ trigger: '#sahne', start: 'top top', end: 'bottom top', onUpdate: (s) => (heroP = s.progress) });
  gsap.ticker.add(tick);

  // Künye gelir; model hazır olunca dolu bir kez vurur ve göçükler boyaya dokunmadan çıkar.
  const split = SplitText.create('#hero-title', { type: 'lines', linesClass: 'ln', mask: 'lines' });
  gsap.from(split.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: 'expo.out' });
  gsap.from(['.hero__what', '.kunye'], { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.15 });
  gsap.from('#sahne .actions', { y: 10, opacity: 0, duration: 0.5, delay: 0.1 });
  world?.whenReady.then(() => {
    gsap.timeline({ delay: 0.4 })
      .fromTo(S, { hit: 0 }, { hit: 1, duration: 0.9, ease: 'power1.in' })
      .fromTo(S, { pop: 0 }, { pop: 1, duration: 1.6, ease: 'power1.inOut' }, '+=0.5')
      .to(S, { spin: 0.18, duration: 2.5, ease: 'sine.inOut' }, '-=0.4');
  });

  // Düz bölümler: başlıklar, sayaçlar, satırlar
  $$('.solid .h2, .final .h2').forEach((h) => {
    const s = SplitText.create(h, { type: 'lines', linesClass: 'ln', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 110, duration: 0.9, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } });
  });
  $$('.svc__row').forEach((row) => {
    gsap.from(row, { opacity: 0, y: 26, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 92%', toggleActions: 'play none none none' } });
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', toggleActions: 'play none none none',
      onEnter: () => gsap.fromTo(o, { v: 0 }, { v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });
  gsap.from('.final__zebra', { scaleX: 0, transformOrigin: '0 50%', duration: 1, ease: 'expo.inOut', scrollTrigger: { trigger: '.final', start: 'top 80%', toggleActions: 'play none none none' } });

  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
}

document.fonts.ready.then(start);
