import pist from '../../data/pist.json';
import ek from '../../data/drift.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { DEFAULT_RIM, DEFAULT_CAL } from './finishes.js';

// Drift (sinematik aile): gece pisti, kaliper sarısı. 3D iki yerde kalır:
// (1) künyenin arkasında ıslak asfaltta yavaş dönen teker; (2) Hizmetler: her hizmette kamera tekerin
// ilgili yerine gider (lastik, jant, sibop; rotta teker düzelir, balansta sallantı durur). Etiket parçanın adıdır.
// Hizmetlerden sonra sahne kararır ve çizim durur; gerisi normal site bölümleridir.
ScrollTrigger.config({ ignoreMobileResize: true });
const d = boot({ ...pist, ...ek, preset: 'drift' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const clamp = gsap.utils.clamp;
const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const io = gsap.parseEase('power2.inOut');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);

// --- Hizmet → sahne duruşu ------------------------------------------------------------
// Her duruş: kamera, parça etiketi ve tekerin durumu. Duruşlar arasında kaydırmayla yumuşak geçilir.
const HERO = { cam: [0.7, -0.62, 4.4], target: [0, -0.1, 0], yaw: -0.3, off: [0.25, 0.02], offP: [0, -0.2], fitP: 1.75, spin: 2.2 };
const DURUS = {
  lastik: { cam: [3.1, 0.55, 3.3], target: [0, 0, 0], yaw: 0, off: [0.16, 0], offP: [0, -0.14], fitP: 1.9, spin: 0.4, parca: 'lastik', etiket: `Lastik · ${d.tekerOlcu}` },
  rot: { cam: [0, 0.05, 4.3], target: [0, 0, 0], yaw: 0, yawFrom: 0.32, off: [0.2, 0], offP: [0, -0.16], fitP: 1.75, spin: 0.6 },
  balans: { cam: [0, 0.02, 3.85], target: [0, 0, 0], yaw: 0, off: [0.2, 0], offP: [0, -0.16], fitP: 1.75, spin: 9, weights: 1, wobbleFrom: 1 },
  otel: { cam: [0.05, 1.72, 1.32], target: [0, 0.9, 0], yaw: 0.62, off: [0.14, 0], offP: [0, -0.1], fitP: 1.3, spin: 0.3, tread: 1, snow: 0.7 },
  jant: { cam: [1.5, 0.25, 2.3], target: [0, 0, 0], yaw: 0, off: [0.18, 0], offP: [0, -0.14], fitP: 1.6, spin: 0.15, parca: 'jant', etiket: 'Jant' },
  patlak: { cam: [0.45, 1.58, 1.2], target: [0, 0.92, 0], yaw: 0.72, off: [0.16, 0], offP: [0, -0.1], fitP: 1.3, spin: 0.25 },
  basinc: { cam: [1.3, 0.35, 2.0], target: [0.25, 0.1, 0], yaw: -0.2, off: [0.18, 0], offP: [0, -0.14], fitP: 1.6, spin: 0, etiket: 'Sibop ve basınç sensörü' },
};
const durusIcin = (baslik) => {
  const b = baslik.toLocaleLowerCase('tr');
  if (b.includes('rot')) return 'rot';
  if (b.includes('balans')) return 'balans';
  if (b.includes('otel')) return 'otel';
  if (b.includes('jant')) return 'jant';
  if (b.includes('patlak')) return 'patlak';
  if (b.includes('basınç') || b.includes('nitrojen')) return 'basinc';
  return 'lastik';
};
const stops = d.hizmetler.map((h) => DURUS[durusIcin(h.baslik)]);

// --- Üst çubuk ---------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------------------

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
      <a class="btn btn--yellow" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ---------------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="parts__head">
    <h2 id="parts-h" class="h2">Hizmetler</h2>
    <p class="parts__lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <div class="parts__stops">
    ${d.hizmetler.map((h, i) => `
      <div class="stop">
        <article class="tag">
          <p class="tag__top"><span class="tag__n">${String(i + 1).padStart(2, '0')}</span>${stops[i].etiket ? `<span class="tag__part">${esc(stops[i].etiket)}</span>` : ''}</p>
          <h3 class="tag__t">${esc(h.baslik)}</h3>
          <p class="tag__d">${esc(h.aciklama)}</p>
          <p class="tag__time">Süre: <strong>${esc(h.sure)}</strong></p>
          <div class="tag__rail" aria-hidden="true">${d.hizmetler.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        </article>
      </div>`).join('')}
  </div>`;

// --- Hakkında ------------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div>
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span><small>yıl</small></dd></div>
        <div class="stat"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span><small>gün</small></dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Satılan lastik markaları</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------------------

$('#saatler').innerHTML = `
  <h2 id="visit-h" class="h2">Çalışma saatleri ve konum</h2>
  <div class="visit__grid">
    <div class="visit__info">
      <p class="status status--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <dl class="hours">${saatListesi(d.saatler).map(([g, h]) => `<div class="hours__row"><dt>${esc(g)}</dt><dd${h === 'Kapalı' ? ' class="off"' : ''}>${esc(h)}</dd></div>`).join('')}</dl>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--yellow" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map></div>
  </div>`;

// --- Örnek yorumlar -----------------------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="reviews__head">
    <h2 id="rev-h" class="h2">Örnek yorumlar</h2>
    <p class="reviews__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="quotes">
    ${d.yorumlar.map((y) => `
      <li class="quote">
        <span class="quote__stars" role="img" aria-label="5 üzerinden ${y.puan}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < y.puan ? 'on' : ''}">${icons.star}</i>`).join('')}</span>
        <blockquote class="quote__t">${esc(y.metin)}</blockquote>
        <p class="quote__who"><strong>${esc(y.ad)}</strong> <span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim -------------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <h2 id="final-h" class="finale__h">İletişim</h2>
  <p class="finale__p">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Lastik ebadı yanağın fotoğrafından da okunur.</p>
  <div class="finale__actions">
    <a class="btn btn--yellow btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="finale__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. 3D teker görseli temsilîdir, belirli bir marka ya da modeli göstermez. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '800px 0px' }).observe(mapBox);

// --- Üst çubuk davranışı ----------------------------------------------------------------------------------

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

// --- Sahne ------------------------------------------------------------------------------------------------

const S = { enter: 0, tour: 0, local: 0, dim: 0, covered: false, inServices: false };
const canvas = $('[data-stage]');
let stage = null;

// İki duruş arasında karışım (sayılar doğrusal, etiket yakın olanınki).
function blend(a, b, t) {
  const o = {
    cam: LV(a.cam, b.cam, t), target: LV(a.target, b.target, t), yaw: L(a.yaw ?? 0, b.yaw ?? 0, t),
    off: LV(a.off, b.off, t), offPortrait: LV(a.offP, b.offP, t), fitPortrait: L(a.fitP ?? 1.75, b.fitP ?? 1.75, t),
    spin: L(a.spin ?? 0, b.spin ?? 0, t), tread: L(a.tread ?? 0, b.tread ?? 0, t), snow: L(a.snow ?? 0, b.snow ?? 0, t),
    weights: L(a.weights ?? 0, b.weights ?? 0, t), mode: 'wheel',
  };
  return o;
}
function currentPose() {
  const n = stops.length;
  const t = clamp(0, n - 1, S.tour);
  const i = Math.min(n - 2, Math.floor(t));
  const f = n > 1 ? io(clamp(0, 1, (t - i - 0.25) / 0.5)) : 0;
  let p = n > 1 ? blend(stops[i], stops[i + 1], f) : blend(stops[0], stops[0], 0);
  // Duruşun kendi hareketi: rotta teker açısı düzelir, balansta sallantı durur.
  const near = stops[Math.round(t)];
  const k = clamp(0, 1, S.local);
  if (near.yawFrom != null) p.yaw += near.yawFrom * (1 - k) * (1 - Math.abs(t - Math.round(t)) * 2);
  if (near.wobbleFrom != null) p.wobble = near.wobbleFrom * (1 - k) * (1 - Math.abs(t - Math.round(t)) * 2);
  if (S.enter < 1) p = { ...blend(HERO, stops[0], io(S.enter)), smoke: 0.12 * (1 - S.enter) };
  return p;
}

const callout = $('.callout');
const cLine = $('.callout__line line');
const cDot = $('.callout__dot');
const cLabel = $('.callout__label');
const wide = matchMedia('(min-width: 900px)');
const labelWide = matchMedia('(min-width: 1300px)');
let lastLabel = '';
function placeCallout() {
  const t = S.tour;
  const near = stops[Math.round(clamp(0, stops.length - 1, t))];
  const settled = 1 - Math.min(1, Math.abs(t - Math.round(t)) * 4);
  const a = S.inServices && S.enter >= 1 && near.parca ? settled : 0;
  callout.style.opacity = a.toFixed(3);
  if (a <= 0.01) return;
  const pt = stage.anchorScreen(near.parca);
  if (!pt) return;
  const [x, y] = pt;
  if (near.etiket !== lastLabel) { lastLabel = near.etiket; cLabel.textContent = near.etiket; }
  cDot.style.transform = `translate(${x}px, ${y}px)`;
  if (!labelWide.matches) return; // telefon ve tablette yalnız nokta: parça adı kartın üstünde yazıyor
  const w = innerWidth;
  const left = x > w * 0.55;
  const lw = cLabel.offsetWidth;
  let lx = x + (left ? -1 : 1) * Math.min(90, w * 0.16);
  lx = left ? Math.max(lw + 10, lx) : Math.min(w - lw - 10, lx);
  const ly = Math.max(90 + cLabel.offsetHeight, y - Math.min(90, innerHeight * 0.1));
  cLabel.style.transform = `translate(${left ? `calc(${lx}px - 100%)` : `${lx}px`}, calc(${ly}px - 100%))`;
  cLine.setAttribute('x1', x); cLine.setAttribute('y1', y);
  cLine.setAttribute('x2', lx); cLine.setAttribute('y2', ly);
}

let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = reducedMotion ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  root.style.setProperty('--dim', S.dim.toFixed(3));
  if (S.covered) callout.style.opacity = '0';
  if (!stage || S.covered || document.hidden) return;
  stage.render(currentPose(), dt);
  placeCallout();
}

const stageReady = (async () => {
  try {
    const { createStage } = await import('./scene.js');
    await Promise.race([document.fonts.load('800 50px Anybody'), new Promise((r) => setTimeout(r, 900))]);
    stage = await createStage(canvas, { ad: d.isletme.ad, olcu: d.tekerOlcu, since: String(d.isletme.kurulus) });
    // Tasarımın rengi: parlak siyah jant, sarı kaliper.
    stage.wheel.setRim(DEFAULT_RIM);
    stage.wheel.setCaliper(DEFAULT_CAL);
    addEventListener('resize', () => { stage.resize(); if (reducedMotion) frame(); });
    canvas.classList.add('is-ready');
    frame();
  } catch (err) {
    console.warn('3D sahne yüklenemedi', err);
    root.classList.add('no-3d');
  }
})();

if (reducedMotion) {
  root.classList.add('rm');
  stageReady.then(frame);
} else {
  initSmoothScroll();
  gsap.ticker.add(frame);

  // Açılış: künye satır satır gelir (bir kez, ~1 sn, kaydırmayı kilitlemez); sahne kendi hızında belirir.
  gsap.from('.hero__inner > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  // Künyeden Hizmetler'e: kamera ilk hizmetin duruşuna geçer.
  gsap.fromTo(S, { enter: 0 }, { enter: 1, ease: 'none', scrollTrigger: { trigger: '.parts__head', start: 'top bottom', end: 'bottom 40%', scrub: true } });
  const n = stops.length;
  ScrollTrigger.create({
    trigger: '.parts__stops', start: 'top center', end: 'bottom center',
    onUpdate: (self) => {
      const v = self.progress * n - 0.5;
      S.tour = clamp(0, n - 1, v);
      S.local = clamp(0, 1, v - Math.round(v) + 0.5);
    },
    onToggle: (self) => (S.inServices = self.isActive),
  });
  // Telefonda hizmet kartı ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
  ScrollTrigger.create({ trigger: '.parts__stops', start: 'top 92%', end: 'bottom 90%', onToggle: (s) => setStoryMode(s.isActive ? true : null) });
  $$('.stop').forEach((stopEl) => {
    const tag = $('.tag', stopEl);
    gsap.fromTo(tag, { '--in': 0, y: 50 }, { '--in': 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: stopEl, start: 'top 88%', end: 'top 60%', scrub: 0.5 } });
    gsap.fromTo(tag, { '--out': 0 }, {
      '--out': 1, ease: 'power1.in', immediateRender: false,
      scrollTrigger: wide.matches
        ? { trigger: stopEl, start: 'bottom 85%', end: 'bottom 62%', scrub: 0.3 }
        : { trigger: stopEl, start: 'bottom bottom', end: 'bottom 84%', scrub: 0.3 },
    });
  });

  // Hizmetlerden sonra sahne kararır; Hakkında ekranı kaplayınca çizim durur.
  gsap.fromTo(S, { dim: 0 }, { dim: 1, ease: 'none', scrollTrigger: { trigger: '#hakkinda', start: 'top 95%', end: 'top 35%', scrub: true } });
  ScrollTrigger.create({
    trigger: '#hakkinda', start: 'top top', end: 'max',
    onEnter: () => (S.covered = true),
    onLeaveBack: () => (S.covered = false),
  });

  // Rakamlar bir kez sayar.
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
