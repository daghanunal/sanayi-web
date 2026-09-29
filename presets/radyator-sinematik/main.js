import sektor from '../../data/sektor-radyator.json';
import ek from '../../data/radyator-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

// Kabarcık: gece mürdümü, pembe antifriz, havuz turkuazı. 3D iki yerde kalır: (1) künyenin arkasında test havuzunun
// üstünde asılı radyatör, (2) Hizmetler: her hizmete gelince sahne ilgili plana gider (havuzda kaçak kabarcığı,
// hararet ve buhar, petek, fan, antifriz akışı), etiket kısa bilgidir. Hizmetlerden sonra sahne kararır ve durur;
// gerisi normal site bölümleridir.

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'radyator-sinematik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const seg = (p, a, b) => clamp((p - a) / (b - a));

const phoneMq = matchMedia('(max-width: 899px)');
const phone = phoneMq.matches;
phoneMq.addEventListener('change', () => location.reload());
const mobile = () => innerWidth < 900;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const B = import.meta.env.BASE_URL;

const SAHNE = d.hizmetSahne || {};
const services = d.hizmetler.map((h) => ({ ...h, p: SAHNE[h.baslik]?.p ?? 0.05, etiket: SAHNE[h.baslik]?.etiket || '' }));

// --- Render ------------------------------------------------------------------------------

const mark = `<svg class="top__mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 5c4 6 7 9.6 7 13.4A7 7 0 0 1 9 18.4C9 14.6 12 11 16 5z"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

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
        <p class="svc__tag"><b>${String(i + 1).padStart(2, '0')}</b>${esc(s.etiket)}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        ${s.sure ? `<p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>` : ''}
      </div>
    </article>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <figure class="about__img"><img src="${B}img/radyator-sinematik/usta-kaput.jpg" alt="Kaputun altında çalışan usta" loading="lazy" decoding="async" /></figure>
    <div class="about__body">
      <h2 class="sec-title" id="about-title">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
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

const mapBox = $('#map');
new IntersectionObserver((entries, obs) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne -------------------------------------------------------------------------------

const canvas = $('[data-stage]');
let S = null;
try { S = createScene(canvas, { lite: weak || phone }); } catch (e) { console.warn('WebGL yok, sahne atlandı', e); canvas.remove(); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const HANG = 1.25, SUB = -1.0;

// Kamera pozları. Mobilde dikey ekrana göre daha geriden ve dar açıdan.
const POSES = () => {
  const m = mobile();
  return {
    hero: m
      ? { pos: V(3.6, 0.7, 7.6), look: V(0.2, 0.25, 0), fov: 46 }
      : { pos: V(3.0, 1.55, 4.9), look: V(-0.75, 1.15, 0), fov: 40 },
    hot: m
      ? { pos: V(2.6, 2.55, 2.4), look: V(1.05, 1.7, 0), fov: 54 }
      : { pos: V(2.5, 2.35, 1.9), look: V(0.7, 1.8, 0), fov: 42 },
    dip: m
      ? { pos: V(1.7, 0.9, 5.2), look: V(0, -0.1, 0), fov: 52 }
      : { pos: V(1.9, 0.75, 4.0), look: V(-0.2, -0.1, 0), fov: 44 },
    under: m
      ? { pos: V(-0.45, -1.95, 2.5), look: V(-1.0, -2.1, 0), fov: 62 }
      : { pos: V(0.4, -1.35, 2.6), look: V(-0.75, -1.05, 0), fov: 50 },
    repair: m
      ? { pos: V(-0.35, 0.95, 1.25), look: V(-1.08, 0.6, 0.05), fov: 58 }
      : { pos: V(-0.3, 0.85, 1.05), look: V(-1.05, 0.62, 0.05), fov: 46 },
    petek: m
      ? { pos: V(0.55, 1.55, 1.25), look: V(0.25, 1.3, 0), fov: 50 }
      : { pos: V(0.6, 1.45, 1.05), look: V(0.15, 1.28, 0), fov: 44 },
    petek2: m
      ? { pos: V(-0.9, 1.3, 1.7), look: V(-0.35, 1.25, 0), fov: 54 }
      : { pos: V(-0.95, 1.25, 1.5), look: V(-0.1, 1.25, 0), fov: 46 },
    fan: m
      ? { pos: V(-2.2, 1.9, -3.9), look: V(0.1, 1.2, 0), fov: 52 }
      : { pos: V(-2.1, 1.75, -2.9), look: V(0.25, 1.2, 0), fov: 44 },
    agir: m
      ? { pos: V(5.6, 1.6, 9.8), look: V(0.2, 1.6, 0), fov: 50 }
      : { pos: V(4.6, 1.8, 6.6), look: V(-0.6, 1.8, 0), fov: 44 },
    over: m
      ? { pos: V(4.2, 5.2, 8.2), look: V(0, 0.6, 0), fov: 52 }
      : { pos: V(4.4, 4.2, 6.4), look: V(-0.2, 0.9, 0), fov: 44 },
  };
};
const KF = [
  [0.0, 'hero'], [0.06, 'hero'], [0.12, 'hot'], [0.215, 'hot'], [0.25, 'dip'], [0.305, 'under'], [0.395, 'under'],
  [0.435, 'repair'], [0.475, 'repair'], [0.5, 'dip'], [0.525, 'under'], [0.56, 'under'], [0.6, 'petek'], [0.7, 'petek2'],
  [0.745, 'fan'], [0.83, 'fan'], [0.88, 'agir'], [0.93, 'agir'], [0.975, 'over'], [1.0, 'over'],
];

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = P[a[1]], B = P[b[1]];
  return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

function radY(p) {
  const dips = [[0.25, 0.305, 0.4, 0.44], [0.48, 0.515, 0.56, 0.6]];
  for (const [a, b, c, e] of dips) {
    if (p >= a && p < e) {
      if (p < b) return L(HANG, SUB, smooth(seg(p, a, b)));
      if (p < c) return SUB;
      return L(SUB, HANG, smooth(seg(p, c, e)));
    }
  }
  const big = smooth(seg(p, 0.845, 0.9)) * (1 - smooth(seg(p, 0.975, 1.2)));
  return L(HANG, 1.95, big);
}

function filmState(p, time, vel) {
  const pose = filmPose(p);
  const sway = (1 - seg(p, 0.06, 0.12)) * 0.12 + seg(p, 0.93, 0.97) * 0.2;
  pose.pos.x += Math.sin(time * 0.35) * sway;
  pose.pos.y += Math.sin(time * 0.5) * sway * 0.4;
  if (p > 0.95) pose.pos.applyAxisAngle(V(0, 1, 0), (p - 0.95) * 3 + Math.sin(time * 0.1) * 0.05);
  const inPetek = seg(p, 0.565, 0.585) * (1 - seg(p, 0.625, 0.67));
  return {
    ...pose,
    radY: radY(p),
    yaw: L(-0.32 + Math.sin(time * 0.4) * 0.04, 0, smooth(seg(p, 0.06, 0.13))) + Math.sin(time * 0.6) * 0.012 * (p < 0.25 ? 1 : 0),
    tilt: 0,
    scale: L(1, 1.75, smooth(seg(p, 0.845, 0.9))),
    hot: 0.25 * (1 - seg(p, 0.06, 0.1)) + smooth(seg(p, 0.1, 0.2)) * (1 - seg(p, 0.23, 0.26)) + 0.5 * seg(p, 0.72, 0.76) * (1 - seg(p, 0.78, 0.82)),
    steam: seg(p, 0.13, 0.17) * (1 - seg(p, 0.22, 0.25)),
    leak: seg(p, 0.305, 0.32) * (1 - seg(p, 0.395, 0.41)),
    spark: seg(p, 0.445, 0.452) * (1 - seg(p, 0.475, 0.482)),
    clean: 1 - inPetek,
    flow: L(11 / 34, 1, smooth(seg(p, 0.625, 0.67))),
    flowAmt: seg(p, 0.585, 0.605),
    fan: smooth(seg(p, 0.72, 0.76)) * (1 - smooth(seg(p, 0.84, 0.865))),
    fanSpin: smooth(seg(p, 0.765, 0.8)) * (1 - seg(p, 0.84, 0.86)) + vel * 0.2,
    lamp: 1,
  };
}

// Duraklar: 0 künye, 1 Hizmetler başlığı, 2.. hizmetler (her birinin sahne ilerlemesi p)
const PS = [0, 0.03, ...services.map((s) => s.p)];
const pAt = (t) => {
  const tt = clamp(t, 0, PS.length - 1);
  const i = Math.min(PS.length - 2, Math.floor(tt));
  return L(PS[i], PS[i + 1], smooth(tt - i));
};

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
  if (Math.abs(target - tourT) > 1.5) tourT = target;
  tourT += (target - tourT) * (1 - Math.exp(-dt * 6));

  svcEls.forEach((el) => {
    let active;
    if (phone) {
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
  if (S && sceneOn && vis > 0.001 && !document.hidden) S.update(pan(filmState(pAt(tourT), now / 1000, 0), tourT), now);
}

// Masaüstünde hizmet kartları solda: kamera yana kayar, radyatör sağ yarıya geçer (künye planı zaten öyle).
const UP = new THREE.Vector3(0, 1, 0);
function pan(st, t) {
  const k = mobile() ? 0 : clamp(t - 0.4) * 0.26;
  if (!k) return st;
  const fwd = st.look.clone().sub(st.pos);
  const right = fwd.clone().cross(UP).normalize().multiplyScalar(-fwd.length() * k);
  st.pos.add(right);
  st.look.add(right);
  return st;
}

function start() {
  measure();
  if (reducedMotion || !S) {
    document.documentElement.classList.add('is-static');
    const still = () => S.update({ ...filmState(0, 0, 0), flowAmt: 1 });
    S?.readyP.then(() => { still(); canvas.style.opacity = 1; }).catch(() => {});
    addEventListener('resize', () => S?.isReady() && (S.resize(), still()));
    return;
  }

  initSmoothScroll();
  if (phone) autoHideHeader(top, { offset: 120 });
  fade = ScrollTrigger.create({ trigger: '#hakkinda', start: 'top 95%', end: 'top 35%' });
  if (phone) {
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
  ScrollTrigger.addEventListener('refresh', measure);
  addEventListener('resize', () => S.resize());
  gsap.ticker.add(tick);

  S.readyP.then(() => {
    S.compile?.();
    S.update(filmState(0, performance.now() / 1000, 0));
    sceneOn = true;
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' });
  }).catch((e) => console.warn('3D sahne yüklenemedi', e));

  // Açılış (~1 sn): ad harf harf eğik gelir, künye satır satır. Kaydırma kilitlenmez, perde yok.
  const split = new SplitText('#hero-title', { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
  gsap.fromTo(split.chars, { autoAlpha: 0, x: -40, skewX: -20 }, { autoAlpha: 1, x: 0, skewX: 0, duration: 0.8, stagger: 0.025, ease: 'expo.out' });
  gsap.from(['.hero__what', '.kunye', '.hero__cta'], { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.06, delay: 0.2, ease: 'power3.out', clearProps: 'all' });

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
