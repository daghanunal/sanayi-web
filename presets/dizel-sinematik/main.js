import sektor from '../../data/sektor-dizel.json';
import ek from '../../data/dizel-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createScene } from './scene.js';

// Pülverize: dizel enjektör atölyesi; mazot lekesi siyahı, taşlanmış çelik, püskürtme amberi. 3D iki yerde kalır:
// (1) künyenin arkasında havada püskürten enjektör, (2) Hizmetler: her hizmete gelince sahne ilgili plana gider
// (söküm, test tezgâhındaki menzürler, kodlama), etiketler parça adıdır. Hizmetlerden sonra sahne kararır ve
// durur; gerisi normal site bölümleridir.

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'dizel-sinematik' });
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
const services = d.hizmetler.map((h) => ({ ...h, p: SAHNE[h.baslik]?.p ?? 0.95, etiket: SAHNE[h.baslik]?.etiket || '' }));

// --- Render ------------------------------------------------------------------------------

const mark = `<i class="top__mark" aria-hidden="true"></i>`;

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
    <p class="services__sub">Süreler yaklaşıktır, araca ve parçaya göre değişebilir. Fiyat ve randevu için arayın.</p>
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
    <figure class="about__img"><img src="${B}img/sektor-dizel/silindir-kapak.jpg" alt="Kamyon motorunun silindir kapağında çalışan ustanın elleri" loading="lazy" decoding="async" /></figure>
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
const NS = 'http://www.w3.org/2000/svg';
const tagBox = $('[data-tags]');
const mk = (tag, attrs = {}, parent = tagBox) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.append(el);
  return el;
};
const tagG = mk('g', { class: 'tags__parts' });
const tags = (d.parcalar || []).map((p) => {
  const g = mk('g', { class: 'tag' }, tagG);
  const line = mk('line', { class: 'tag__line', x1: 0, y1: 0, x2: 80, y2: 0 }, g);
  mk('circle', { class: 'tag__dot', r: 4 }, g);
  const t = mk('text', { class: 'tag__txt', x: 90, y: 4 }, g);
  t.textContent = p.ad;
  const sm = mk('text', { class: 'tag__small', x: 90, y: 20 }, g);
  sm.textContent = p.not || '';
  return { g, line, t, sm };
});

// --- Sahne -------------------------------------------------------------------------------

const canvas = $('[data-stage]');
const low = phone || weak;
let S = null;
try { S = createScene(canvas, { low, reduced: reducedMotion, phone }); } catch (e) { console.warn('WebGL yok, sahne atlandı', e); canvas.remove(); }

// Duraklar: 0 künye (havada püskürtme), 1 Hizmetler başlığı, 2.. hizmetler (her birinin sahne ilerlemesi p)
const PS = [0, 0.08, ...services.map((s) => s.p)];
const pAt = (t) => {
  const tt = clamp(t, 0, PS.length - 1);
  const i = Math.min(PS.length - 2, Math.floor(tt));
  return L(PS[i], PS[i + 1], smooth(tt - i));
};

function drawTags() {
  const st = S.state;
  const show = st.explode > 0.55 && S.isReady() && sceneOn;
  tagG.classList.toggle('is-on', show);
  if (!show) return;
  const heroC = S.project(S.anchors.part(2));
  const colX = Math.min(innerWidth - (phone ? 150 : 260), heroC.x + (phone ? 70 : 170));
  const gap = phone ? 17 : 34;
  const pts = tags.map((tg, i) => ({ tg, P: S.project(S.anchors.part(i)) }));
  const order = [...pts].sort((a, b) => a.P.y - b.P.y);
  let lastY = -1e9;
  for (const o of order) { o.ty = Math.max(o.P.y, lastY + gap); lastY = o.ty; }
  for (const { tg, P, ty } of pts) {
    const len = Math.max(12, colX - P.x);
    const dy = ty - P.y;
    tg.g.setAttribute('transform', `translate(${P.x.toFixed(1)} ${P.y.toFixed(1)})`);
    tg.line.setAttribute('x2', len.toFixed(0));
    tg.line.setAttribute('y2', dy.toFixed(1));
    tg.t.setAttribute('x', (len + 8).toFixed(0));
    tg.t.setAttribute('y', (dy + 4).toFixed(1));
    tg.sm.setAttribute('x', (len + 8).toFixed(0));
    tg.sm.setAttribute('y', (dy + 20).toFixed(1));
  }
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
let lastT = performance.now();

let sceneOn = false;
let running = false;

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
  if (!S || !sceneOn) return;
  // Sahne kendi döngüsünü çalıştırır; görünmezken durur.
  if (vis > 0.001 && !running) { S.start(); running = true; }
  else if (vis <= 0.001 && running) { S.stop(); running = false; }
  S.setProgress(pAt(tourT));
  tagBox.style.opacity = vis.toFixed(3);
  if (running) drawTags();
}

function start() {
  measure();
  if (reducedMotion || !S) {
    document.documentElement.classList.add('is-static');
    if (S) {
      S.setProgress(0);
      S.readyP.then(() => { S.render?.(); canvas.style.opacity = 1; }).catch(() => {});
      addEventListener('resize', () => { S.resize(); S.render?.(); });
    }
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

  S.setProgress(0);
  S.start();
  running = true;
  S.readyP.then(() => {
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
