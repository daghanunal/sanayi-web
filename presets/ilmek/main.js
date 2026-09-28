// İlmek: kinetik aileden oto döşeme preseti. WebGL yok; SVG, CSS ve GSAP ile "atölye masası".
// Büyük yazılar yalnız olgu: dükkânın adı (kumaştan aplike harfler, kenarı dikilir), hizmet adları.
// Hizmetler'in altında kartela: malzemeye dokununca yelpaze döner (pin yok).
import usta from '../../data/usta.json';
import ext from '../../data/ilmek.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot({ ...usta, ...ext, preset: 'ilmek' });

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const mq = window.matchMedia('(max-width: 899px)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
let uid = 0;

const needleSVG = `
  <g class="needle">
    <line class="needle__thread" x1="0" y1="0" x2="-60" y2="26" />
    <g transform="rotate(-58)">
      <path class="needle__body" d="M-2 -1.4 L46 -0.5 L52 0 L46 0.5 L-2 1.4 Q-6 0 -2 -1.4 Z" />
      <ellipse class="needle__eye" cx="1.5" cy="0" rx="3" ry="0.6" />
    </g>
  </g>`;

// --- Üst bar ---------------------------------------------------------------

$('[data-bind="ad"]').textContent = d.isletme.ad;
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
topCall.innerHTML = `${icons.phone}<span>${tel}</span>`;
$('[data-status]').innerHTML = `<i class="${st.open ? 'is-open' : ''}"></i><span>${st.open ? 'Açık' : 'Kapalı'}</span>`;
$('[data-status]').title = st.metin;

// --- Hero: künye ------------------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__inner">
    <div class="woven hero__label"><span>Şaşmaz Oto Sanayi Sitesi</span><strong>${esc(yilEki(kurulus))} beri</strong></div>
    <h1 class="hero__title" id="hero-title" aria-label="${ad}"><span class="stitch-title" data-title="${ad}"></span></h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="lamp ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--chalk" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--stitch" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--stitch" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
    <figure class="hero__photo polaroid">
      <span class="pin pin--red"></span><span class="pin pin--blue"></span>
      <img src="${asset('/img/ilmek/kirmizi-koltuk.jpg')}" alt="Kırmızı deriyle kapitone döşenmiş ön koltuklar" fetchpriority="high" width="1200" height="960">
      <figcaption>Kırmızı deri, kapitone sırt</figcaption>
    </figure>
  </div>`;

// Aplike başlık: harfler kumaş, kenarları iplikle dikilir. SVG <text> + desen dolgusu.
async function buildStitchTitle(host, { maxLines = 3, maxSize = 150, tex = 'tex-beyaz', thread = 'var(--thread)' } = {}) {
  const text = host.dataset.title;
  try { await document.fonts.load('800 100px Syne'); } catch {}
  const W = Math.max(200, host.clientWidth);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = '800 100px Syne';
  const words = text.split(/\s+/).filter(Boolean);
  const ww = words.map((w) => ctx.measureText(w).width / 100);
  const sp = ctx.measureText(' ').width / 100;
  const wrap = (size) => {
    const lines = [];
    let cur = [];
    let cw = 0;
    words.forEach((w, i) => {
      const wpx = ww[i] * size;
      if (cur.length && cw + sp * size + wpx > W) {
        lines.push({ text: cur.join(' '), w: cw });
        cur = [w];
        cw = wpx;
      } else {
        cw = cur.length ? cw + sp * size + wpx : wpx;
        cur.push(w);
      }
    });
    if (cur.length) lines.push({ text: cur.join(' '), w: cw });
    return lines;
  };
  let size = Math.min(maxSize, (W / Math.max(...ww)) * 0.98);
  let lines = wrap(size);
  while (lines.length > maxLines && size > 24) {
    size *= 0.93;
    lines = wrap(size);
  }
  const lh = size * 0.98;
  const pad = size * 0.16;
  const H = pad + lh * lines.length + size * 0.12;
  const id = `st${++uid}`;
  const sw = Math.max(1.4, size * 0.022);
  const dash = `${(size * 0.06).toFixed(1)} ${(size * 0.042).toFixed(1)}`;
  const texSize = 360;
  const texHref = asset(`/img/ilmek/${tex}.jpg`);
  const line = (l, i, attrs) =>
    `<text x="0" y="${(pad + size * 0.8 + i * lh).toFixed(1)}" ${attrs}>${esc(l.text)}</text>`;
  host.innerHTML = `
    <svg class="stitch-svg" viewBox="0 ${-size * 0.1} ${W} ${H + size * 0.1}" width="${W}" height="${H + size * 0.1}" aria-hidden="true" style="--fs:${size}px">
      <defs>
        <pattern id="${id}-tx" patternUnits="userSpaceOnUse" width="${texSize}" height="${texSize}">
          <image href="${texHref}" width="${texSize}" height="${texSize}" preserveAspectRatio="none" />
        </pattern>
        ${lines.map((l, i) => `
          <clipPath id="${id}-f${i}"><rect class="clip-f" x="-4" y="${-size}" width="0" height="${H + size * 2}" /></clipPath>
          <clipPath id="${id}-s${i}"><rect class="clip-s" x="-4" y="${-size}" width="0" height="${H + size * 2}" /></clipPath>`).join('')}
      </defs>
      ${lines.map((l, i) => `
        <g class="st-line" data-w="${l.w.toFixed(1)}" data-y="${(pad + size * 0.45 + i * lh).toFixed(1)}">
          <g clip-path="url(#${id}-f${i})">
            ${line(l, i, `class="st-shadow" transform="translate(${(size * 0.03).toFixed(1)} ${(size * 0.05).toFixed(1)})"`)}
            ${line(l, i, `class="st-fabric" fill="url(#${id}-tx)"`)}
          </g>
          <g clip-path="url(#${id}-s${i})">
            ${line(l, i, `class="st-stitch" stroke="${thread}" stroke-width="${sw.toFixed(2)}" stroke-dasharray="${dash}"`)}
          </g>
        </g>`).join('')}
      ${needleSVG}
    </svg>`;
  return { svg: $('svg', host), lines, size };
}

function stitchTimeline({ svg, size }) {
  const tl = gsap.timeline({ paused: true });
  const needle = $('.needle', svg);
  gsap.set(needle, { opacity: 0 });
  $$('.st-line', svg).forEach((g, i) => {
    const w = Number(g.dataset.w) + size * 0.12;
    const y = Number(g.dataset.y);
    const f = svg.querySelectorAll('.clip-f')[i];
    const s = svg.querySelectorAll('.clip-s')[i];
    const dur = 0.3 + (w / size) * 0.08;
    const at = i * 0.34;
    tl.to(f, { attr: { width: w + 8 }, duration: dur * 0.7, ease: 'power2.inOut' }, at);
    tl.set(needle, { opacity: 1, x: 0, y }, at + 0.1);
    tl.to(s, { attr: { width: w + 8 }, duration: dur, ease: 'none' }, at + 0.1);
    tl.to(needle, { x: w, duration: dur, ease: 'none' }, at + 0.1);
    tl.fromTo(needle, { y: y - size * 0.12 }, { y: y + size * 0.1, duration: 0.07, ease: 'sine.inOut', repeat: Math.round(dur / 0.07), yoyo: true }, at + 0.1);
  });
  tl.to(needle, { opacity: 0, x: '+=40', duration: 0.3 });
  return tl;
}

function finishStitch(svg) {
  $$('.st-line', svg).forEach((g, i) => {
    const w = Number(g.dataset.w) + 40;
    gsap.set([svg.querySelectorAll('.clip-f')[i], svg.querySelectorAll('.clip-s')[i]], { attr: { width: w } });
  });
  gsap.set($('.needle', svg), { opacity: 0 });
}

// --- Hizmetler + kartela ------------------------------------------------------

const malzemeler = d.malzemeler || [];
$('#hizmetler').innerHTML = `
  <header class="svc__head">
    <h2 class="sec-title sec-title--light" id="hizmetler-h">Hizmetler</h2>
    <p>Süreler yaklaşıktır, araca ve koltuğun durumuna göre değişebilir. Fiyat ve randevu için arayın.</p>
  </header>
  <ul class="svc__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc" style="--r:${i % 2 ? 1.2 : -1.4}deg">
        <figure class="svc__photo"><span class="pin pin--${i % 2 ? 'blue' : 'red'}"></span><img src="${h.gorsel}" alt="" loading="lazy" decoding="async"></figure>
        <div class="svc__body">
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <p class="svc__meta"><span class="chalk">Süre: ${esc(h.sure)}</span></p>
        </div>
      </li>`).join('')}
  </ul>
  ${malzemeler.length ? `
  <div class="deck">
    <header class="deck__head">
      <h3 class="deck__title">Malzemeler</h3>
      <p>Numuneler dükkânda aracın içinde karşılaştırılır. Kartelada malzemeye dokununca nerede kullanıldığı ve bakımı görünür.</p>
    </header>
    <div class="deck__stage">
      <div class="deck__fan" aria-hidden="true">
        ${malzemeler.map((m, i) => `
          <article class="swatch" data-i="${i}">
            <div class="swatch__img" style="background-image:url('${m.gorsel}')"></div>
            <div class="swatch__label"></div>
            <span class="swatch__rivet"></span>
          </article>`).join('')}
      </div>
      <div class="deck__side">
        <div class="deck__chips" role="group" aria-label="Malzeme seçin">
          ${malzemeler.map((m, i) => `<button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-i="${i}" aria-pressed="${i === 0}">${esc(m.ad)}</button>`).join('')}
        </div>
        <div class="deck__info" aria-live="polite"></div>
      </div>
    </div>
  </div>` : ''}`;

function deckInfo(i) {
  const m = malzemeler[i];
  if (!m) return '';
  return `
    <div class="deck__card" data-i="${i}">
      <h4>${esc(m.ad)}</h4>
      <dl>
        <div><dt>Nerede</dt><dd>${esc(m.nerede)}</dd></div>
        <div><dt>Bakım</dt><dd>${esc(m.bakim)}</dd></div>
      </dl>
      <p class="deck__note">${esc(m.not)}</p>
    </div>`;
}

// --- Hakkında -----------------------------------------------------------------

const rakamlar = [
  { deger: yas, sonek: ' yıl', etiket: "Şaşmaz Oto Sanayi Sitesi'nde" },
  { deger: acikGun, sonek: ' gün', etiket: 'haftada açık' },
];
const CM = 12;
const tapeLen = 240;
$('#hakkinda').innerHTML = `
  <div class="about__inner">
    <h2 class="sec-title" id="hakkinda-h">Hakkında</h2>
    <p class="about__text" data-words>${ad} ${esc(yilEki(kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="tape" aria-hidden="true">
    <div class="tape__track" style="width:${tapeLen * CM}px">
      ${Array.from({ length: tapeLen / 10 + 1 }, (_, i) => `<span style="left:${i * 10 * CM}px">${i * 10}</span>`).join('')}
    </div>
  </div>
  <div class="about__inner">
    <ul class="stats">
      ${rakamlar.map((s) => `
        <li><strong data-count="${s.deger}" data-suffix="${esc(s.sonek)}">${s.deger}${esc(s.sonek)}</strong><span>${esc(s.etiket)}</span></li>`).join('')}
    </ul>
  </div>`;

// --- Çalışma saatleri ve konum (bakım etiketi) ------------------------------------

$('#saatler').innerHTML = `
  <div class="visit__grid">
    <div class="care">
      <p class="care__brand">${ad}</p>
      <h2 id="saatler-h">Çalışma saatleri ve konum</h2>
      <p class="care__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <ul class="care__hours">
        ${saatListesi(d.saatler).map(([g, s]) => `<li><span>${esc(g)}</span><span>${esc(s)}</span></li>`).join('')}
      </ul>
      <p class="care__addr">${esc(d.iletisim.adres)}</p>
      <div class="care__cta">
        <a class="btn btn--chalk" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--stitch" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map>
      <a class="visit__maplink" href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a>
    </div>
  </div>`;

// --- Örnek yorumlar (askı etiketleri) ------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <header class="tags__head">
    <h2 class="sec-title" id="yorumlar-h">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <div class="tags__rail" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y, i) => `
      <figure class="tag" style="--r:${[-3, 2, -1.5, 3, -2][i % 5]}deg">
        <span class="tag__hole"></span>
        <span class="tag__stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</span>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

// --- İletişim --------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="finale__inner">
    <h2 class="finale__title" id="iletisim-h">İletişim</h2>
    <svg class="finale__tape" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id="fin-clip"><rect class="fin-clip" x="0" y="0" width="1000" height="80" /></clipPath></defs>
      <g clip-path="url(#fin-clip)">
        <path class="fin-band" d="M0 46 C 160 12 300 70 480 40 S 820 18 1000 44" />
        <path class="fin-ticks" d="M0 46 C 160 12 300 70 480 40 S 820 18 1000 44" />
      </g>
    </svg>
    <p class="finale__lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Koltuğun fotoğrafı da gönderilebilir.</p>
    <div class="finale__cta">
      <a class="btn btn--chalk btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--stitch btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('.foot').innerHTML = `
  <div class="foot__inner">
    <strong>${ad}</strong>
    <span>${esc(d.isletme.tanim)}</span>
    <span>${esc(d.iletisim.adres)}</span>
    <a href="${telHref(d)}">${tel}</a>
    <small>© ${buYil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</small>
  </div>`;

// --- Harita: yaklaşınca yükle ------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  io.disconnect();
  const f = document.createElement('iframe');
  f.src = mapsEmbed(d);
  f.title = `${d.isletme.ad} konumu`;
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  mapBox.prepend(f);
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Kartela ------------------------------------------------------------------

const swatchLabel = (i) => `<span>No. ${String(i + 1).padStart(2, '0')}</span><strong>${esc(malzemeler[i].ad)}</strong>`;
function applyDeck(t) {
  $$('.swatch').forEach((el, i) => {
    const diff = i - t;
    const rot = diff < 0 ? Math.max(-36, diff * 12) : Math.min(diff, 3) * 4;
    const lift = diff < 0 ? 0 : Math.min(diff, 3) * 6;
    el.style.transform = `translate3d(${lift}px, ${-lift}px, 0) rotate(${rot.toFixed(2)}deg)`;
    el.style.zIndex = String(100 - Math.round(Math.abs(diff) * 10));
    const on = Math.abs(diff) < 0.5;
    if (on !== el.classList.contains('is-active')) {
      el.classList.toggle('is-active', on);
      el.querySelector('.swatch__label').innerHTML = on ? swatchLabel(i) : '';
    }
  });
}
const deck = { t: 0 };
let deckActive = -1;
function setDeckActive(i, animate = true) {
  if (i === deckActive) return;
  deckActive = i;
  $$('.deck__chips .chip').forEach((c, k) => {
    c.classList.toggle('is-on', k === i);
    c.setAttribute('aria-pressed', String(k === i));
  });
  const info = $('.deck__info');
  info.innerHTML = deckInfo(i);
  if (reducedMotion || !animate) {
    deck.t = i;
    applyDeck(i);
    return;
  }
  gsap.fromTo(info.firstElementChild, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  gsap.to(deck, { t: i, duration: 0.7, ease: 'power3.inOut', overwrite: true, onUpdate: () => applyDeck(deck.t) });
}
if (malzemeler.length) {
  applyDeck(0);
  setDeckActive(0, false);
  $('.deck__chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) setDeckActive(Number(b.dataset.i));
  });
  // Yelpazedeki bir karta dokunmak da o malzemeyi seçer.
  $('.deck__fan').addEventListener('click', (e) => {
    const s = e.target.closest('.swatch');
    if (s) setDeckActive(Number(s.dataset.i));
  });
}

// ============================================================================
// Hareket
// ============================================================================

const heroTitleHost = $('.stitch-title');
let heroTitle;

const topEl = $('#top');
let unhide = null;
const syncHeader = () => {
  if (mq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!mq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
mq.addEventListener('change', syncHeader);

function countUp(el) {
  const v = Number(el.dataset.count);
  const obj = { v: 0 };
  gsap.to(obj, {
    v, duration: 1.3, ease: 'power2.out',
    onUpdate: () => (el.textContent = Math.round(obj.v) + el.dataset.suffix),
  });
}

async function init() {
  heroTitle = await buildStitchTitle(heroTitleHost, { maxLines: mq.matches ? 3 : 2 });

  if (reducedMotion) {
    finishStitch(heroTitle.svg);
    document.documentElement.classList.add('is-static');
    return;
  }

  const lenis = initSmoothScroll();
  const vel = () => lenis?.velocity ?? 0;

  // Açılış (bir kez, kaydırmayı kilitlemez): başlığın kenarı dikilir, künye ve fotoğraf gelir.
  stitchTimeline(heroTitle).play();
  gsap.timeline()
    .from('.hero__label, .hero__what, .kunye, .hero__cta', { y: 20, autoAlpha: 0, stagger: 0.07, duration: 0.55, ease: 'power3.out', clearProps: 'all' }, 0.15)
    .from('.hero__photo', { y: -50, rotation: 14, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.6)' }, 0.2);

  gsap.to('.hero__photo', {
    yPercent: 24, rotation: -8, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });

  // Header: mat bitince koyulaşır.
  ScrollTrigger.create({
    trigger: '#hero', start: 'bottom 80px',
    onEnter: () => topEl.classList.add('is-solid'),
    onLeaveBack: () => topEl.classList.remove('is-solid'),
  });

  // Hakkında: kelimeler okundukça koyulaşır.
  const split = new SplitText('[data-words]', { type: 'words', wordsClass: 'w' });
  gsap.fromTo(split.words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: '[data-words]', start: 'top 80%', end: 'bottom 55%', scrub: true },
  });

  // Hizmetler: kalıp parçaları mata serilir.
  ScrollTrigger.batch('.svc', {
    start: 'top 88%',
    onEnter: (els) => gsap.fromTo(els,
      { y: 60, x: (i) => (i % 2 ? 40 : -40), rotation: (i) => (i % 2 ? 8 : -8), autoAlpha: 0 },
      { y: 0, x: 0, rotation: (i, el) => parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0, autoAlpha: 1, stagger: 0.1, duration: 0.8, ease: 'back.out(1.4)', overwrite: true }),
  });
  if (malzemeler.length) {
    gsap.from('.deck__fan', {
      y: 120, rotation: 12, autoAlpha: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.deck', start: 'top 75%', toggleActions: 'play none none none' },
    });
  }

  // Mezura: kaydırdıkça çekilir; sayılar görünce sayar.
  gsap.fromTo('.tape__track', { x: 0 }, {
    x: () => -(tapeLen * CM - window.innerWidth * 0.8), ease: 'none',
    scrollTrigger: { trigger: '.tape', start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true },
  });
  $$('#hakkinda [data-count]').forEach((el) => {
    el.textContent = `0${el.dataset.suffix}`;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: () => countUp(el) });
  });

  // Askı etiketleri: kaydırma hızıyla sallanır.
  const tags = $$('.tag');
  let sway = 0;
  gsap.ticker.add(() => {
    sway += (Math.max(-8, Math.min(8, vel() * 0.4)) - sway) * 0.08;
    if (Math.abs(sway) < 0.01) return;
    tags.forEach((t, i) => t.style.setProperty('--sway', `${(sway * (i % 2 ? 0.8 : 1.1)).toFixed(2)}deg`));
  });
  gsap.from('.tag', {
    y: -80, rotation: (i) => (i % 2 ? 18 : -18), autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'elastic.out(1, 0.55)',
    scrollTrigger: { trigger: '.tags__rail', start: 'top 85%', toggleActions: 'play none none none' },
  });

  // Saatler: bakım etiketi iner.
  gsap.from('.care', {
    y: 60, rotation: -3, autoAlpha: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#saatler', start: 'top 75%', toggleActions: 'play none none none' },
  });

  // İletişim: mezura başlığın altına çekilir.
  gsap.fromTo('.fin-clip', { attr: { width: 0 } }, {
    attr: { width: 1000 }, duration: 1.1, ease: 'power2.inOut',
    scrollTrigger: { trigger: '#iletisim', start: 'top 75%', toggleActions: 'play none none none' },
  });

  // Masaüstü: iğne ucu imleci.
  if (finePointer) {
    const cur = document.createElement('div');
    cur.className = 'cursor';
    document.body.append(cur);
    const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
    const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      qx(e.clientX);
      qy(e.clientY);
      cur.classList.toggle('is-link', !!e.target.closest('a, button'));
    });
  }

  // Genişlik değişince başlığı yeniden kur (telefon adres çubuğu vb. hariç).
  let lastW = innerWidth;
  let rt;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - lastW) < 40) return;
    lastW = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(async () => {
      heroTitle = await buildStitchTitle(heroTitleHost, { maxLines: mq.matches ? 3 : 2 });
      finishStitch(heroTitle.svg);
      ScrollTrigger.refresh();
    }, 200);
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}

init();
