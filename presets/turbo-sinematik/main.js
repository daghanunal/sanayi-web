import sektor from '../../data/sektor-turbo.json';
import ek from '../../data/turbo-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

// Girdap: turbonun iki yüzü; soğuk taraf buz mavisi, sıcak taraf kor turuncu. 3D iki yerde kalır:
// (1) künyenin arkasında karanlık stüdyoda dönen turbo, (2) Hizmetler: her hizmete gelince kamera ilgili
// parçaya gider (söküm, balans, VNT, yağ hattı…), etiket parça adıdır. Hizmetlerden sonra sahne kararır ve
// çizimi durur; gerisi normal site bölümleridir.

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'turbo-sinematik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

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
const services = d.hizmetler.map((h) => ({ ...h, sahne: SAHNE[h.baslik]?.sahne || 'montaj', etiket: SAHNE[h.baslik]?.etiket || '' }));

// --- Render ------------------------------------------------------------------------------

const mark = `<span class="top__mark" aria-hidden="true"></span>`;

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
    <p class="services__sub">Süreler yaklaşıktır, turboya göre değişebilir. Fiyat ve randevu için arayın.</p>
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
    <figure class="about__img"><img src="${B}img/sektor-turbo/usta-turbo.jpg" alt="Tezgâhta turbo üzerinde çalışan usta" width="1333" height="2000" loading="lazy" decoding="async" /></figure>
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

// Parça etiketleri (yalnız söküm planında): tek SVG katmanı, dokunmayı almaz.
const SVGNS = 'http://www.w3.org/2000/svg';
const labelBox = $('[data-labels]');
const labels = (d.parcalar || []).map((p) => {
  const g = document.createElementNS(SVGNS, 'g');
  g.setAttribute('class', 'lbl');
  g.dataset.label = p.id;
  const dn = /^(kg|tg|yg)$/.test(p.id); // gövdeler noktanın altında, çarklar üstünde: telefonda çakışmasın
  g.innerHTML = dn
    ? `<line x1="0" y1="0" x2="0" y2="24" /><circle r="4" /><rect rx="11" y="24" height="22" /><text y="39">${esc(p.ad)}</text>`
    : `<line x1="0" y1="0" x2="0" y2="-26" /><circle r="4" /><rect rx="11" y="-50" height="22" /><text y="-35">${esc(p.ad)}</text>`;
  labelBox.append(g);
  return g;
});
function sizeLabels() {
  for (const g of labels) {
    const w = g.querySelector('text').getComputedTextLength() + 24;
    const r = g.querySelector('rect');
    r.setAttribute('width', w.toFixed(0));
    r.setAttribute('x', (-w / 2).toFixed(0));
    g.dataset.w = w;
  }
}

// --- Sahne -------------------------------------------------------------------------------

const canvas = $('[data-stage]');
let S = null;
try { S = createScene(canvas, { lite: weak || phone }); } catch (e) { canvas.remove(); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera planları. Masaüstünde turbo sağda (metin solda), telefonda üst yarıda (kart altta).
const POSES = () => mobile()
  ? {
      hero: { pos: V(7.6, 3.6, 9.6), look: V(0.1, -0.2, 0), fov: 42, sh: 0.22 },
      genel: { pos: V(3.6, 5.4, 14.8), look: V(0, -0.3, 0), fov: 42, sh: 0.2 },
      sokum: { pos: V(4.4, 9.8, 18.4), look: V(-0.1, -0.6, 0), fov: 46, sh: 0.24 },
      balans: { pos: V(8.2, 3.0, 9.6), look: V(0, -0.1, 0), fov: 44, sh: 0.24 },
      vnt: { pos: V(-8.4, 2.2, 4.6), look: V(-0.9, -0.1, 0), fov: 46, sh: 0.24 },
      yag: { pos: V(5.0, 7.4, 11.0), look: V(0.2, 0.2, -0.2), fov: 44, sh: 0.24 },
      basinc: { pos: V(10.6, 3.8, 11.6), look: V(0, -0.3, 0), fov: 42, sh: 0.24 },
      kacak: { pos: V(-9.6, 4.2, 9.8), look: V(-0.6, -0.3, 0), fov: 42, sh: 0.24 },
      aktuator: { pos: V(-5.4, 1.6, 10.8), look: V(-0.8, -0.4, 0.3), fov: 42, sh: 0.24 },
      montaj: { pos: V(2.6, 3.4, 13.4), look: V(0, -0.3, 0), fov: 42, sh: 0.22 },
    }
  : {
      hero: { pos: V(3.8, 2.0, 7.8), look: V(-1.45, 0.1, 0), fov: 34 },
      genel: { pos: V(1.4, 2.6, 9.8), look: V(-1.7, 0, 0), fov: 36 },
      sokum: { pos: V(0.6, 3.3, 10.4), look: V(-2.0, -0.2, 0), fov: 38 },
      balans: { pos: V(1.6, 1.1, 5.0), look: V(-1.3, 0, 0), fov: 38 },
      vnt: { pos: V(-7.4, 1.8, 4.4), look: V(-1.5, 0, -1.3), fov: 38 },
      yag: { pos: V(3.2, 4.8, 6.4), look: V(-1.2, 0.9, -0.3), fov: 38 },
      basinc: { pos: V(4.8, 1.7, 6.8), look: V(-1.3, 0, 0), fov: 36 },
      kacak: { pos: V(-5.8, 2.6, 6.2), look: V(-2.2, -0.1, 0.9), fov: 36 },
      aktuator: { pos: V(-2.8, 1.2, 8.8), look: V(-2.0, -0.2, 0.2), fov: 36 },
      montaj: { pos: V(1.0, 1.9, 9.0), look: V(-1.7, 0, 0), fov: 36 },
    };

// Her planın sahne değerleri (scene.update'in okuduğu alanlar)
const BOS = { explode: 0, far: 0, balance: 0, wobble: 0, vntShow: 0, vntAnim: 0, oil: 0.15, oilClean: 0, heat: 0.06, cool: 1, flow: 0.8, spin: 5.5, lab: 0 };
const DEGER = {
  hero: {},
  genel: { spin: 3, flow: 0.5 },
  sokum: { explode: 1, spin: 1.4, flow: 0, heat: 0, cool: 0.6, lab: 1 },
  balans: { explode: 1, far: 1, balance: 1, wobble: 0.15, spin: 14, flow: 0, heat: 0 },
  vnt: { explode: 1, far: 1, vntShow: 1, vntAnim: 1, spin: 1.2, flow: 0, heat: 0 },
  yag: { explode: 0.3, oil: 1, oilClean: 1, spin: 1.2, flow: 0, heat: 0 },
  basinc: { heat: 1, cool: 0.2, flow: 1, spin: 22 },
  kacak: { heat: 0.12, cool: 0.7, flow: 1, spin: 10 },
  aktuator: { heat: 0.08, cool: 0.8, flow: 0.5, spin: 6 },
  montaj: { heat: 0.04, flow: 0.6, spin: 8 },
};
const plan = (k) => ({ ...BOS, ...(DEGER[k] || {}) });
const KEYS = ['hero', 'genel', ...services.map((s) => s.sahne)];

function state(t, time) {
  const P = POSES();
  const tt = clamp(t, 0, KEYS.length - 1);
  const i = Math.min(KEYS.length - 2, Math.floor(tt));
  const f = smooth(tt - i);
  const A = P[KEYS[i]] || P.montaj, Bp = P[KEYS[i + 1]] || P.montaj;
  const a = plan(KEYS[i]), b = plan(KEYS[i + 1]);
  const s = {};
  for (const k in a) s[k] = L(a[k], b[k], f);
  const sway = clamp(1 - tt) * 0.18;
  const pos = A.pos.clone().lerp(Bp.pos, f);
  pos.x += Math.sin(time * 0.4) * sway;
  pos.y += Math.sin(time * 0.55) * sway * 0.5;
  return {
    ...s,
    pos, look: A.look.clone().lerp(Bp.look, f), fov: L(A.fov, Bp.fov, f), sh: L(A.sh || 0, Bp.sh || 0, f),
    vnt: s.vntAnim * (0.5 + 0.5 * Math.sin(time * 1.3)),
    flowSpeed: 0.5 + s.spin / 9,
    boost: clamp(s.heat),
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

function drawLabels(lab) {
  labelBox.style.opacity = lab.toFixed(3);
  labelBox.style.visibility = lab > 0.01 ? 'visible' : 'hidden';
  if (lab <= 0.01 || !S?.isReady()) return;
  for (const g of labels) {
    const pr = S.project(g.dataset.label);
    const half = Number(g.dataset.w || 120) / 2 + 8;
    const x = clamp(pr.x, half, innerWidth - half);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${pr.y.toFixed(1)})`);
    g.querySelector('line').setAttribute('x1', (pr.x - x).toFixed(1));
  }
}

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
  if (S && sceneOn && vis > 0.001 && !document.hidden) {
    const s = state(tourT, now / 1000);
    S.update(s, now);
    drawLabels(s.lab * vis);
  } else drawLabels(0);
}

function start() {
  measure();
  sizeLabels();
  if (reducedMotion || !S) {
    document.documentElement.classList.add('is-static');
    const s0 = { ...state(0, 0), spin: 0 };
    S?.readyP.then(() => { S.update(s0); canvas.style.opacity = 1; }).catch(() => {});
    addEventListener('resize', () => S?.isReady() && (S.resize(), S.update(s0)));
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
  addEventListener('resize', () => { S.resize(); sizeLabels(); });
  gsap.ticker.add(tick);

  S.readyP.then(() => {
    S.compile?.();
    S.update(state(0, performance.now() / 1000));
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
