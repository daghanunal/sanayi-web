import raw from '../../data/usta.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createSeat, DEFAULT_STATE } from './seat3d.js';

// Kapitone: sinematik aile. 3D iki yerde kalır. (1) Açılış: loş atölyede koltuğun ışığı bir kez açılır.
// (2) Hizmetler: her hizmete gelince koltuk o işe geçer (sünger, alcantara, el dikişi, ısıtma, kumaş);
// kartın üstündeki küçük etiket parça adıdır. Hizmetlerden sonra koltuk çizilmez, gerisi normal site.
gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const isDesk = () => innerWidth >= 900;
if (reducedMotion) document.documentElement.classList.add('rm');

// --- Hizmet → koltuk hâli ------------------------------------------------------

const CFG = {
  deri: { upholstery: 'leather', insert: 'quilted', color: '#6f3519', tone: 1, thread: '#e7a33a', plain: false },
  alcantara: { upholstery: 'alcantara', insert: 'alcantara', color: '#221a17', tone: 0.72, thread: '#d2362c', plain: false },
  klasik: { upholstery: 'leather', insert: 'leather', color: '#b27a41', tone: 1, thread: '#efe7da', plain: false },
  kumas: { upholstery: 'fabric', insert: 'fabric', color: '#4a4b4f', tone: 0.85, thread: '#8a8b8f', plain: true },
};
const phoneShift = () => (isDesk() ? { sx: 0.2, sy: 0 } : { sx: 0, sy: -0.22 });
const SVC_MAP = [
  { re: /deri koltuk|koltuk döşeme/i, tag: 'Sünger · Kılıf', cfg: 'deri', pose: () => ({ foam: 1, wrap: 0, stitch: 0, theta: -0.62, phi: 0.14, dist: 3.1, ty: 0.6 }) },
  { re: /alcantara|kumaş döşeme/i, tag: 'Koltuk ortası · Yanaklar', cfg: 'alcantara', pose: () => ({ theta: 0.32, phi: 0.08, dist: 3.0, ty: 0.62 }) },
  { re: /tavan/i, tag: 'Tavan kumaşı · Güneşlik', cfg: 'deri', pose: () => ({ theta: 0.95, phi: 0.34, dist: 3.7, ty: 0.62, dim: 0.8 }) },
  { re: /direksiyon/i, tag: 'Deri · El dikişi', cfg: 'deri', stitch: true, pose: () => ({ theta: 0.18, phi: 0.04, dist: isDesk() ? 2.0 : 1.5, ty: 0.98, tz: 0.02 }) },
  { re: /kapı/i, tag: 'Kapı paneli · Kolçak', cfg: 'deri', pose: () => ({ theta: 1.3, phi: 0.1, dist: 3.3, ty: 0.62 }) },
  { re: /ısıtma/i, tag: 'Isıtma pedi · Düğme', cfg: 'deri', pose: () => ({ heat: 1, theta: 0.3, phi: 0.92, dist: isDesk() ? 2.3 : 1.8, ty: 0.42, tz: 0.08 }) },
  { re: /klasik/i, tag: 'Orijinal desen', cfg: 'klasik', pose: () => ({ recline: 0.5, theta: 0.5, phi: 0.1, dist: 3.2, ty: 0.62 }) },
  { re: /servis|minibüs/i, tag: 'Kumaş kılıf · Sünger', cfg: 'kumas', pose: () => ({ theta: -0.4, phi: 0.12, dist: 3.3, ty: 0.62 }) },
];
const FALLBACK = { tag: '', cfg: 'deri', pose: () => ({ theta: 0.62, phi: 0.1, dist: 3.3, ty: 0.62 }) };
const services = d.hizmetler.map((h) => ({ ...h, map: SVC_MAP.find((m) => m.re.test(h.baslik)) || FALLBACK }));

// --- İçerik ----------------------------------------------------------------

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = `<i></i>${st.open ? 'Açık' : 'Kapalı'}`;
});
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
topCall.innerHTML = `${icons.phone}<span>${tel}</span>`;

$('#bas').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--brass" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <header class="svcs__head">
    <h2 class="svcs__title" id="hizmetler-h">Hizmetler</h2>
    <p class="svcs__lead">Süreler yaklaşıktır, araca ve koltuğun durumuna göre değişebilir. Fiyat ve randevu için arayın.</p>
  </header>
  ${services.map((s, i) => `
    <article class="step" data-i="${i}">
      <div class="step__card">
        ${s.map.tag ? `<p class="step__tag">${esc(s.map.tag)}</p>` : ''}
        <h3 class="step__title">${esc(s.baslik)}</h3>
        <p class="step__text">${esc(s.aciklama)}</p>
        <p class="step__time">Süre: <b>${esc(s.sure)}</b></p>
      </div>
    </article>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div class="about__text">
      <h2 id="hakkinda-h">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
      <ul class="about__stats">
        <li><b><i data-count="${yas}">${yas}</i> yıl</b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b><i data-count="${acikGun}">${acikGun}</i> gün</b><span>haftada açık</span></li>
      </ul>
    </div>
    <figure class="about__photo"><img src="${asset('/img/usta/is-dikis.jpg')}" alt="Siyah deri sanayi makinesinde dikiliyor" loading="lazy" decoding="async" width="1000" height="1500"></figure>
  </div>`;

$('#saatler').innerHTML = `
  <div class="visit__info">
    <h2 id="saatler-h">Çalışma saatleri ve konum</h2>
    <p class="visit__status${st.open ? ' is-open' : ''}"><i></i>${esc(st.metin)}</p>
    <table class="visit__hours"><caption class="sr-only">Çalışma saatleri</caption><tbody>
      ${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
    </tbody></table>
    <address>${esc(d.iletisim.adres)}</address>
    <div class="visit__cta">
      <a class="btn btn--brass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="visit__map"><iframe title="${ad} konumu" data-src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;

const stars = (n) => `<span class="stars" role="img" style="--p:${(n / 5) * 100}%" aria-label="5 üzerinden ${n}">${icons.star.repeat(5)}<span class="stars__fill">${icons.star.repeat(5)}</span></span>`;
$('#yorumlar').innerHTML = `
  <div class="proof__head">
    <h2 class="proof__title" id="yorumlar-h">Örnek yorumlar</h2>
    <p class="proof__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="proof__list" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        ${stars(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <div class="fin__inner">
    <h2 class="fin__title" id="iletisim-h">İletişim</h2>
    <p class="fin__note">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Koltuğun fotoğrafı da gönderilebilir.</p>
    <div class="fin__cta">
      <a class="btn btn--brass" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="fin__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('.foot').innerHTML = `
  <div class="foot__name">${ad}</div>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
  <p class="foot__small">© ${buYil} ${ad}. Pexels'ten alınan fotoğraf ve 3D koltuk temsilîdir. Yorumlar örnektir.</p>`;

// Harita: yaklaşınca yükle
new IntersectionObserver((entries, io) => {
  if (!entries.some((en) => en.isIntersecting)) return;
  const f = $('.visit__map iframe');
  f.src = f.dataset.src;
  io.disconnect();
}, { rootMargin: '600px' }).observe($('.visit__map'));

// --- 3D --------------------------------------------------------------------

const canvas = $('#gl');
const glow = document.createElement('div');
glow.className = 'glow';
canvas.before(glow);
let seat = null;
try {
  seat = createSeat(canvas);
  seat.ready.catch((e) => {
    console.warn('3D koltuk yüklenemedi', e);
    document.documentElement.classList.add('no-gl');
  });
} catch (e) {
  document.documentElement.classList.add('no-gl');
  console.warn('WebGL yok', e);
}

let cfgNow = null;
function applyCfg(key, animate = true) {
  if (!seat || key === cfgNow) return;
  cfgNow = key;
  seat.setConfig(CFG[key], gsap, animate && !reducedMotion ? 0.8 : 0);
  if (reducedMotion) setTimeout(() => seat.renderOnce(), 40);
}

// --- Kaydırmaya bağlı koltuk hâlleri --------------------------------------------

const top = (el) => el.getBoundingClientRect().top + scrollY;
const vh = () => innerHeight;
const steps = $$('.step');
const svcsEl = $('#hizmetler');
const cover = $('.cover');
const mid = (el) => top(el) + el.offsetHeight / 2 - vh() / 2;

const POSE = {
  hero: () => ({
    ...DEFAULT_STATE, theta: 0.78, phi: 0.05, ty: 0.6,
    dist: isDesk() ? 3.05 : 4.3, sx: isDesk() ? 0.2 : 0, sy: isDesk() ? 0 : -0.3,
  }),
  overview: () => ({ theta: 0.62, phi: 0.1, dist: 3.4, ty: 0.62, tz: 0, ...phoneShift() }),
};
const RESET = { frame: 0, explode: 0, foam: 1, wrap: 1, stitch: 1, heat: 0, recline: 0, head: 0, tz: 0, dim: 1 };

let keys = [];
function buildKeys() {
  const K = [[0, POSE.hero]];
  K.push([top(svcsEl) - vh() * 0.1, () => ({ ...RESET, ...POSE.overview() })]);
  steps.forEach((el, i) => {
    const m = mid(el);
    const pose = services[i].map.pose;
    K.push([m - vh() * 0.14, () => ({ ...RESET, ...phoneShift(), ...pose() })], [m + vh() * 0.2, () => ({})]);
  });
  K.push([top(cover) - vh() * 0.9, () => ({ ...RESET, ...POSE.overview() })]);
  K.push([top(cover) - vh() * 0.2, () => ({ dim: 0.15 })]);
  K.sort((a, b) => a[0] - b[0]);
  let prev = { ...DEFAULT_STATE };
  keys = K.map(([pos, v]) => {
    const full = { ...prev, ...v() };
    prev = full;
    return { pos, full };
  });
}
function sample(y, out) {
  if (y <= keys[0].pos) return Object.assign(out, keys[0].full);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (y < b.pos) {
      let t = (y - a.pos) / Math.max(1, b.pos - a.pos);
      t = t * t * (3 - 2 * t);
      for (const k in a.full) out[k] = a.full[k] + (b.full[k] - a.full[k]) * t;
      return out;
    }
  }
  return Object.assign(out, keys[keys.length - 1].full);
}
// Opak bölümler ekranı kapladıysa koltuk çizilmez.
const isCovered = () => cover.getBoundingClientRect().top <= 0;

// Etkin hizmet: kartı ekranın ortasına en yakın olan.
let activeSvc = -1;
function syncActive() {
  const c = vh() * 0.5;
  let best = -1, dist = Infinity;
  steps.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh()) return;
    const dd = Math.abs(r.top + r.height / 2 - c);
    if (dd < dist) { dist = dd; best = i; }
  });
  if (best === activeSvc) return;
  activeSvc = best;
  steps.forEach((el, i) => el.classList.toggle('is-active', i === best));
  const m = best > -1 ? services[best].map : null;
  applyCfg(m ? m.cfg : 'deri');
  if (m?.stitch && seat && !reducedMotion) gsap.fromTo(seat.extra, { restitch: 0 }, { restitch: 1, duration: 1.4, ease: 'power1.inOut' });
  if (!reducedMotion) gsap.to(glow, { '--heat': m?.pose().heat ? 1 : 0, duration: 0.6, overwrite: true });
}

// --- Kaydırma ve döngü --------------------------------------------------------

const lenis = initSmoothScroll({ lerp: 0.09 });
const header = $('#top');
if (!isDesk()) autoHideHeader(header, { offset: 120 });

if (seat) {
  seat.ready.then(() => applyCfg('deri', false)).catch(() => {});
  if (reducedMotion) {
    Object.assign(seat.target, POSE.hero());
    Object.assign(seat.cur, seat.target);
    seat.extra.intro = 1;
    seat.ready.then(() => seat.renderOnce()).catch(() => {});
    addEventListener('resize', () => seat.renderOnce());
  } else {
    gsap.ticker.add(() => {
      if (!keys.length) return;
      sample(scrollY, seat.target);
      syncActive();
      seat.setActive(!isCovered() && !document.hidden);
      seat.frame();
    });
  }
}

// --- Metin hareketleri ------------------------------------------------------------

function heroIn() {
  const tl = gsap.timeline();
  const chars = new SplitText('.hero__title', { type: 'words,chars' }).chars;
  tl.from(chars, { yPercent: 60, autoAlpha: 0, fontStretch: '130%', duration: 0.8, ease: 'expo.out', stagger: 0.015 })
    .from('.hero__inner > :not(.hero__title)', { autoAlpha: 0, y: 18, duration: 0.55, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }, 0.15)
    .from('.top__in', { yPercent: -100, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all' }, 0.1);
  // Açılış: loş atölyede koltuğun ışığı bir kez açılır (~1,6 sn, kaydırmayı kilitlemez).
  if (seat) tl.to(seat.extra, { intro: 1, duration: 1.6, ease: 'power2.inOut' }, 0);
  return tl;
}

function buildSteps() {
  steps.forEach((el) => {
    gsap.fromTo($('.step__card', el).children, { autoAlpha: 0, y: 24 }, {
      autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 62%', toggleActions: 'play none none reverse' },
    });
  });
  // Telefonda hizmet kartları ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
  if (!isDesk()) {
    ScrollTrigger.create({
      trigger: steps[0], start: 'top 60%', endTrigger: steps.at(-1), end: 'bottom 40%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
}

function buildRest() {
  $$('[data-count]').forEach((el) => {
    const c = { v: 0 };
    const to = +el.dataset.count;
    el.textContent = '0';
    gsap.to(c, {
      v: to, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => (el.textContent = Math.round(c.v)),
    });
  });
  gsap.from('.rev', {
    y: 40, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '.proof__list', start: 'top 85%', toggleActions: 'play none none none' },
  });
  gsap.fromTo('.visit__info > *', { autoAlpha: 0, y: 30 }, {
    autoAlpha: 1, y: 0, stagger: 0.08, ease: 'power3.out', duration: 0.7,
    scrollTrigger: { trigger: '#saatler', start: 'top 75%', toggleActions: 'play none none none' },
  });
}

// --- Başlat ------------------------------------------------------------------

if (reducedMotion) {
  if (seat) seat.extra.intro = 1;
} else {
  buildSteps();
  buildRest();
  ScrollTrigger.addEventListener('refresh', buildKeys);
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  buildKeys();
  heroIn();
  addEventListener('load', () => ScrollTrigger.refresh());
}
