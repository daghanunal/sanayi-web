import veri from '../../data/manifold.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene, LIFT } from './scene.js';

// Manifold: ısı renkli paslanmaz çelik. 3D iki yerde kalır: (1) künyenin arkasında stüdyoda asılı egzoz hattı,
// (2) Hizmetler: her hizmete gelince kamera ilgili parçaya gider, etiket parça adıdır. Hizmetlerden sonra
// sahne kararır ve çizimi durur; gerisi normal site bölümleridir.

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(veri);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

const phoneMq = matchMedia('(max-width: 899px)');
const phone = phoneMq.matches;
phoneMq.addEventListener('change', () => location.reload());
const mobile = () => innerWidth < 900;

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);

// Hattaki parçalar: veri kimliği → 3D düğüm adı ve etiket
const DUGUM = { manifold: 'manifold', katalitik: 'catalyst', dpf: 'dpf', susturucu: 'muffler', uc: 'tailpipe' };
const PARCA_AD = Object.fromEntries((d.parcalar || []).map((p) => [p.id, p.ad]));
const parcaAdi = (id) => PARCA_AD[id] || { manifold: 'Manifold', katalitik: 'Katalitik konvertör', dpf: 'DPF', susturucu: 'Susturucu', uc: 'Egzoz ucu' }[id] || '';
const services = d.hizmetler.map((h) => ({ ...h, parca: DUGUM[h.parca] ? h.parca : 'susturucu' }));

// --- Render ------------------------------------------------------------------------------

const mark = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="5"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

$('#kunye').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title" aria-label="${ad}">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--heat" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
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
        <p class="svc__tag">${esc(parcaAdi(s.parca))}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        <p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>
      </div>
    </article>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <figure class="about__img"><img src="${import.meta.env.BASE_URL}img/manifold/lift.jpg" alt="Lifte kaldırılmış aracın altında egzoz kontrolü" width="933" height="1400" loading="lazy" decoding="async" /></figure>
    <div class="about__body">
      <h2 class="sec-title" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
      <dl class="stats">
        <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b data-count="${yas}">${yas}</b><span>yıl</span></dd></div>
        <div class="stat"><dt>haftada açık</dt><dd><b data-count="${acikGun}">${acikGun}</b><span>gün</span></dd></div>
      </dl>
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="sec-title" id="shop-title">Çalışma saatleri ve konum</h2>
    <p class="shop__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${h === 'Kapalı' ? 'is-closed' : ''}"><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="shop__addr">${esc(d.iletisim.adres)}</p>
    <div class="shop__cta">
      <a class="btn btn--heat" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--dark" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="shop__map" id="map"><p>Harita</p></div>`;

const stars = (n) => `<p class="rev__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <h2 class="sec-title" id="reviews-title">Örnek yorumlar</h2>
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
      <a class="btn btn--heat btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__brand">${mark}<span>${ad}</span></p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
  <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.</p>`;

// Harita yaklaşınca yüklenir
const mapBox = $('#map');
new IntersectionObserver((entries, obs) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne -------------------------------------------------------------------------------

const canvas = $('[data-stage]');
let S = null;
try { S = createScene(canvas); } catch (e) { canvas.remove(); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;

// Kamera: hedef c, azimut az, yükseklik açısı el, uzaklık dist. Masaüstünde nesne sağa (metin solda),
// telefonda üst yarıya (kart altta) kaydırılır.
function orbit(c, az, el, dist, fov, frame = 1) {
  const pos = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(c);
  const fwd = c.clone().sub(pos).normalize();
  const right = fwd.clone().cross(V(0, 1, 0)).normalize();
  const up = right.clone().cross(fwd).normalize();
  const look = c.clone();
  if (mobile()) look.addScaledVector(up, -dist * 0.07 * frame);
  else look.addScaledVector(right, -dist * 0.2 * frame);
  return { pos, look, fov };
}
const ALL = () => (S?.focus('exhaust') ? S.focus('exhaust').c.clone() : V(0, LIFT + 0.2, 0));
const F = (n) => (S?.focus(n) ? S.focus(n).c.clone() : ALL());

// Parça yakın planları; aynı parça ikinci kez gelirse kamera öbür yandan bakar.
function partPose(p, flip) {
  const m = mobile();
  const s = flip ? -1 : 1;
  switch (p) {
    case 'manifold': return m ? orbit(F('manifold'), s * 36 * deg, 18 * deg, 1.5, 40) : orbit(F('manifold'), s * 38 * deg, 16 * deg, 1.05, 32);
    case 'katalitik': return m ? orbit(F('catalyst'), s * -26 * deg, 20 * deg, 1.3, 40) : orbit(F('catalyst'), s * -24 * deg, 18 * deg, 0.95, 32);
    case 'dpf': return m ? orbit(F('dpf'), s * 24 * deg, 22 * deg, 1.35, 40) : orbit(F('dpf'), s * 26 * deg, 20 * deg, 1.0, 32);
    case 'susturucu': return m ? orbit(F('muffler'), s * -34 * deg, 24 * deg, 1.6, 40) : orbit(F('muffler'), s * -32 * deg, 22 * deg, 1.2, 32);
    default: return m ? orbit(F('tailpipe'), (flip ? 110 : 70) * deg, 12 * deg, 1.15, 42) : orbit(F('tailpipe'), (flip ? 112 : 66) * deg, 10 * deg, 0.85, 32);
  }
}
const seen = {};
const flips = services.map((s) => {
  const f = (seen[s.parca] || 0) % 2 === 1;
  seen[s.parca] = (seen[s.parca] || 0) + 1;
  return f;
});
// Anahtar kareler: 0 künye, 1 Hizmetler başlığı (genel plan), 2.. hizmetler
function poseAt(i) {
  const m = mobile();
  if (i <= 0) return m ? orbit(ALL(), 58 * deg, 20 * deg, 5.6, 42, 2.4) : orbit(ALL(), 22 * deg, 14 * deg, 4.6, 34, 1.1);
  if (i === 1) return m ? orbit(ALL(), 18 * deg, 44 * deg, 6.2, 42, 0.9) : orbit(ALL(), 10 * deg, 34 * deg, 5.0, 34, 1.15);
  const k = Math.min(services.length - 1, i - 2);
  return partPose(services[k].parca, flips[k]);
}
const bump = (t, i, w) => clamp(1 - Math.abs(t - i) / w);
function weights(t, w) {
  const o = { manifold: 0, katalitik: 0, dpf: 0, susturucu: 0, uc: 0 };
  services.forEach((s, j) => (o[s.parca] = Math.max(o[s.parca], bump(t, j + 2, w))));
  return o;
}

function state(t, time) {
  const n = services.length + 1;
  const tt = clamp(t, 0, n);
  const i = Math.min(n - 1, Math.floor(tt));
  const f = tt - i;
  const A = poseAt(i), B = poseAt(i + 1);
  const pose = { pos: A.pos.lerp(B.pos, f), look: A.look.lerp(B.look, f), fov: L(A.fov, B.fov, f) };
  const sway = (bump(tt, 0, 1) + bump(tt, 1, 1)) * 0.06;
  pose.pos.x += Math.sin(time * 0.3) * sway;
  pose.pos.y += Math.sin(time * 0.45) * sway * 0.5;
  const w = weights(tt, 0.8);
  const ws = weights(tt, 0.55);
  return {
    ...pose,
    ex: { manifold: w.manifold * 0.3, catalyst: w.katalitik * 0.9, dpf: w.dpf * 1.6, muffler: w.susturucu * 0.45, tailpipe: w.uc * 0.25 },
    heat: 0.35 + w.manifold * 0.65,
    slice: { catalyst: ws.katalitik, dpf: ws.dpf, muffler: ws.susturucu },
    cat: w.katalitik,
    dpf: smooth(ws.dpf),
    plumeDirt: 0.55 - w.dpf * 0.4,
    plumeAlpha: 1,
    speed: 0,
    sliceOff: mobile() ? [-0.02, -0.15] : [-0.2, 0.06],
    sliceScale: mobile() ? 0.68 : 0.72,
  };
}

// --- Kaydırma ------------------------------------------------------------------------------

const top = $('#top');
const svcEls = $$('.svc');
let anchors = [];
function measure() {
  const mid = (el) => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2;
  anchors = [0, mid($('.services__head')), ...svcEls.map(mid)];
  if (phone) $$('.svc__card').forEach((c) => c.style.setProperty('--card-h', `${c.offsetHeight}px`));
}
function targetT(y) {
  if (!anchors.length || y <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (y < anchors[i + 1]) {
      const f = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
      return i + smooth(clamp((f - 0.18) / 0.64)); // durakta bekler, arada geçer
    }
  }
  return anchors.length - 1;
}

let tourT = 0;
let fade = null;
let sceneOn = false;
let lastT = performance.now();

function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const y = scrollY;
  const target = targetT(y);
  if (Math.abs(target - tourT) > 1.5) tourT = target; // uzak atlama (#saatler gibi)
  tourT += (target - tourT) * (1 - Math.exp(-dt * 6));

  // Etkin hizmet kartı
  svcEls.forEach((el) => {
    let active;
    if (phone) {
      // Telefonda kart yalnızca ekranın altında sabitken görünür.
      const cr = el.firstElementChild.getBoundingClientRect();
      const sr = el.getBoundingClientRect();
      active = cr.top > sr.top + 2 && cr.bottom < sr.bottom - 2 && sr.top < innerHeight * 0.4;
    } else {
      const r = el.getBoundingClientRect();
      active = r.top < innerHeight * 0.62 && r.bottom > innerHeight * 0.38;
    }
    el.classList.toggle('is-active', active);
  });
  top.classList.toggle('is-solid', y > 40);

  const vis = fade ? 1 - fade.progress : 1;
  canvas.style.opacity = sceneOn ? vis.toFixed(3) : '0';
  if (S && sceneOn && vis > 0.001 && !document.hidden) S.update(state(tourT, now / 1000), now);
}

function start() {
  measure();
  if (reducedMotion || !S) {
    document.documentElement.classList.add('is-static');
    S?.readyP.then(() => { S.update(state(0, 0)); canvas.style.opacity = 1; }).catch(() => {});
    addEventListener('resize', () => S?.isReady() && (S.resize(), S.update(state(0, 0))));
    return;
  }

  initSmoothScroll();
  if (phone) autoHideHeader(top, { offset: 120 });
  fade = ScrollTrigger.create({ trigger: '#hakkinda', start: 'top 95%', end: 'top 35%' });
  if (phone) {
    // Hizmet kartları ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
  ScrollTrigger.addEventListener('refresh', measure);
  addEventListener('resize', () => S.resize());
  gsap.ticker.add(tick);

  S.readyP.then(() => {
    S.update(state(0, performance.now() / 1000));
    sceneOn = true;
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' });
  }).catch((e) => console.warn('3D sahne yüklenemedi', e));

  // Açılış (~1 sn): ad harf harf yükselir, künye gelir. Kaydırma kilitlenmez.
  const title = $('#hero-title');
  const split = new SplitText(title, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
  gsap.fromTo(split.chars, { yPercent: 115 }, { yPercent: 0, duration: 0.9, stagger: 0.025, ease: 'expo.out' });
  gsap.from(['.hero__what', '.kunye', '.hero__cta'], { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.06, delay: 0.2, ease: 'power3.out', clearProps: 'all' });

  // Bölüm başlıkları kaydırdıkça tavlama rengine döner
  $$('.sec-title').forEach((el) => {
    gsap.fromTo(el, { '--heat': 0 }, { '--heat': 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 35%', scrub: true } });
  });
  gsap.fromTo('.about__img img', { scale: 1.14, yPercent: -5 }, {
    scale: 1, yPercent: 5, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
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
  $$('.rev').forEach((el, i) => {
    gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.6, delay: (i % 3) * 0.06, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' } });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.fonts) document.fonts.ready.then(start);
else start();
