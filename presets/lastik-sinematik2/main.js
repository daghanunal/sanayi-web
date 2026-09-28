import pist from '../../data/pist.json';
import ek from '../../data/lastik-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Kar İzi (sinematik aile): karlı, yüksek anahtarlı stüdyo; kar beyazı, kauçuk mürekkebi, kar küreme turuncusu.
// 3D yalnız açılışta: karın içinde duran kış lastiği yavaşça döner, künye geçilirken kamera yükselir.
// Künyeden sonra sahne durur; gerisi normal site bölümleridir.
ScrollTrigger.config({ ignoreMobileResize: true });
const d = boot({ ...pist, ...ek, preset: 'lastik-sinematik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const io = gsap.parseEase('power2.inOut');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad2 = (n) => String(n).padStart(2, '0');

// --- Üst çubuk -------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status status--top ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -------------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--orange" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler: numaralı liste, süre ölçü etiketi gibi ------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="svc__head">
    <h2 id="svc-h" class="h2">Hizmetler</h2>
    <p class="svc__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="svc__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc__item">
        <p class="svc__n" aria-hidden="true">${pad2(i + 1)}</p>
        <div class="svc__body">
          <h3 class="svc__t">${esc(h.baslik)}</h3>
          <p class="svc__d">${esc(h.aciklama)}</p>
        </div>
        <p class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
      </li>`).join('')}
  </ol>`;

// --- Hakkında ---------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div>
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span> <small>yıl</small></dd></div>
        <div class="stat"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span> <small>gün</small></dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Satılan lastik markaları</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum -------------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="visit__grid">
    <div class="visit__col">
      <h2 id="visit-h" class="h2 h2--sm">Çalışma saatleri ve konum</h2>
      <p class="status status--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <dl class="hours">${saatListesi(d.saatler).map(([g, h]) => `<div><dt>${esc(g)}</dt><dd${h === 'Kapalı' ? ' class="off"' : ''}>${esc(h)}</dd></div>`).join('')}</dl>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__btns">
        <a class="btn btn--orange" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="rev__head">
    <h2 id="rev-h" class="h2">Örnek yorumlar</h2>
    <p class="rev__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="rev__track" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="card">
        <p class="card__stars" role="img" aria-label="5 üzerinden ${y.puan}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < y.puan ? 'on' : ''}">${icons.star}</i>`).join('')}</p>
        <blockquote>${esc(y.metin)}</blockquote>
        <p class="card__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ----------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__inner">
    <h2 id="final-h" class="final__title">İletişim</h2>
    <p class="final__txt">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Lastik ebadı yanağın fotoğrafından da okunur.</p>
    <div class="final__cta">
      <a class="btn btn--orange btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--snow btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. 3D lastik görseli temsilîdir. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Üst çubuk davranışı ---------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Sahne (yalnız künye) -------------------------------------------------------------------------------

// Kamera dili: yüksek anahtarlı ürün çekimi, uzun odak, hafif yukarıdan. Künye geçilirken kamera yükselir.
const P0 = { cam: [2.2, 1.05, 5.4], target: [0, -0.05, 0], yaw: -0.5, off: [0.22, 0.02], offP: [0, -0.3], fitP: 2.35 };
const P1 = { cam: [3.0, 1.9, 4.2], target: [0, -0.1, 0], yaw: 0.28, off: [0.22, 0], offP: [0, -0.26], fitP: 2.0 };
const canvas = $('[data-stage]');
let stage = null;
let heroP = 0;
let visible = true;
let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = reducedMotion ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!stage || !visible || document.hidden) return;
  const t = io(heroP);
  stage.render({
    mode: 'tire', cam: LV(P0.cam, P1.cam, t), target: LV(P0.target, P1.target, t), yaw: L(P0.yaw, P1.yaw, t),
    off: LV(P0.off, P1.off, t), offP: LV(P0.offP, P1.offP, t), fitP: L(P0.fitP, P1.fitP, t), spin: 0.3, snow: 0.9,
  }, dt);
}
// Künye ekrandan çıkınca çizim durur, tuval gizlenir.
new IntersectionObserver(([e]) => {
  visible = e.isIntersecting;
  canvas.classList.toggle('is-off', !visible);
  if (visible && reducedMotion) frame();
}).observe($('#kunye'));

(async () => {
  try {
    await Promise.race([document.fonts.load('40px "Dela Gothic One"'), new Promise((r) => setTimeout(r, 800))]);
    const { createStage } = await import('./scene.js');
    let ready;
    const wheelReady = new Promise((r) => (ready = r));
    stage = createStage(canvas, { ad: d.isletme.ad, stations: { start: 0, xs: [] }, onReady: ready });
    addEventListener('resize', () => { stage.resize(); if (reducedMotion) frame(); });
    canvas.classList.add('is-ready');
    frame();
    wheelReady.then(frame);
  } catch (e) {
    console.warn('WebGL yok', e);
    root.classList.add('no-webgl');
  }
})();

if (reducedMotion) {
  root.classList.add('rm');
} else {
  initSmoothScroll();
  gsap.ticker.add(frame);
  gsap.from('.hero__inner > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  ScrollTrigger.create({ trigger: '#kunye', start: 'top top', end: 'bottom top', onUpdate: (s) => (heroP = s.progress) });

  ScrollTrigger.batch('.svc__item', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, { y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out', clearProps: 'all' }),
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}
