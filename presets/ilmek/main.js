// İlmek: kinetik aileden oto döşeme preseti. WebGL yok; SVG, CSS ve GSAP ile "atölye masası".
// Kesim matı, aplike harfler üstüne atılan dikiş, kartela (malzeme yelpazesi), desen dikişi,
// kalıp kesimi, mezura ve iğneli pano üzerinde tarihçe.
import usta from '../../data/usta.json';
import ext from '../../data/ilmek.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(SplitText, DrawSVGPlugin, MotionPathPlugin);

const raw = { ...usta, ...ext, preset: 'ilmek', isletme: { ...usta.isletme, ...ext.isletme } };
const d = boot(raw);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n) => n.toLocaleString('tr-TR');
const mq = window.matchMedia('(max-width: 899px)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

// Türkçe ayrılma eki: 1987'den, 1990'dan, 2004'ten…
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : n % 100 ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}
const beri = `${ablative(kurulus)} beri`;

const btnCall = (cls = '') =>
  `<a class="btn btn--chalk ${cls}" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>`;
const btnWa = (cls = '', msg) =>
  `<a class="btn btn--stitch ${cls}" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>`;

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
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
const st = openStatus(d.saatler);
$('[data-status]').innerHTML = `<i class="${st.open ? 'is-open' : ''}"></i><span>${esc(st.open ? 'Açık' : 'Kapalı')}</span>`;
$('[data-status]').title = st.text;

// --- Hero ------------------------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__inner">
    <div class="woven hero__label"><span>Şaşmaz Oto Sanayi</span><strong>${esc(beri)}</strong></div>
    <h1 class="hero__title" aria-label="${esc(d.isletme.ad)}"><span class="stitch-title" data-title="${esc(d.isletme.ad)}"></span></h1>
    <p class="hero__lead">${esc(d.isletme.slogan)}<span class="hero__lead-extra"> Koltuk, tavan, direksiyon ve kapı döşemesi; deri, alcantara ya da kumaş.</span></p>
    <div class="hero__cta">${btnCall()}${btnWa('', `Merhaba ${d.isletme.ad}, koltuk döşemesi için fiyat almak istiyorum.`)}</div>
    <figure class="hero__photo polaroid">
      <span class="pin pin--red"></span><span class="pin pin--blue"></span>
      <img src="${asset('/img/ilmek/kirmizi-koltuk.jpg')}" alt="Kırmızı deriyle kapitone döşenmiş ön koltuklar" fetchpriority="high">
      <figcaption>Kırmızı deri, kapitone sırt</figcaption>
    </figure>
    <p class="hero__chalk chalk" aria-hidden="true">dikiş payı 1 cm</p>
  </div>
  <p class="hero__hint" aria-hidden="true">Kaydırın, kartelayı açalım</p>`;

// Aplike başlık: harfler kumaş, kenarları iplikle dikilir. SVG <text> + desen dolgusu.
async function buildStitchTitle(host, { maxLines = 3, maxSize = 168, tex = 'tex-beyaz', thread = 'var(--thread)' } = {}) {
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
    const dur = 0.35 + (w / size) * 0.1;
    const at = i * 0.42;
    tl.to(f, { attr: { width: w + 8 }, duration: dur * 0.7, ease: 'power2.inOut' }, at);
    tl.set(needle, { opacity: 1, x: 0, y }, at + 0.12);
    tl.to(s, { attr: { width: w + 8 }, duration: dur, ease: 'none' }, at + 0.12);
    tl.to(needle, { x: w, duration: dur, ease: 'none' }, at + 0.12);
    tl.fromTo(needle, { y: y - size * 0.12 }, { y: y + size * 0.1, duration: 0.07, ease: 'sine.inOut', repeat: Math.round(dur / 0.07), yoyo: true }, at + 0.12);
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

// --- Hakkımızda --------------------------------------------------------------

$('#hakkimizda').innerHTML = `
  <div class="about__inner">
    <p class="about__kicker chalk">${esc(beri)}, aynı tezgâhta</p>
    <p class="about__text" data-words>${esc(d.isletme.hakkinda)}</p>
  </div>`;

// --- Kartela (malzeme yelpazesi) ------------------------------------------

const malzemeler = d.malzemeler || [];
$('#kartela').innerHTML = `
  <div class="deck__pin">
    <header class="deck__head">
      <h2 class="sec-title sec-title--light">Kartelayı çevirin.</h2>
      <p>Hangi malzeme nereye yakışır, ne kadar dayanır? Beş seçenek, hepsi atölyede.</p>
    </header>
    <div class="deck__stage">
      <div class="deck__fan">
        ${malzemeler.map((m, i) => `
          <article class="swatch" data-i="${i}">
            <div class="swatch__img" style="background-image:url('${m.gorsel}')"></div>
            <div class="swatch__label"><span>No. ${String(i + 1).padStart(2, '0')}</span><strong>${esc(m.ad)}</strong></div>
            <span class="swatch__rivet"></span>
          </article>`).join('')}
      </div>
      <div class="deck__info" aria-live="polite"></div>
    </div>
  </div>`;

const dots = (n) =>
  `<span class="dots" aria-label="Dayanım ${n}/5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

function deckInfo(i) {
  const m = malzemeler[i];
  if (!m) return '';
  return `
    <div class="deck__card" data-i="${i}">
      <h3>${esc(m.ad)}</h3>
      <dl>
        <div><dt>Nerede</dt><dd>${esc(m.nerede)}</dd></div>
        <div><dt>Dayanım</dt><dd>${dots(m.dayanim)}</dd></div>
        <div><dt>Bakım</dt><dd>${esc(m.bakim)}</dd></div>
      </dl>
      <p class="deck__note">${esc(m.not)}</p>
      <a class="deck__ask" href="${waHref(d, `Merhaba ${d.isletme.ad}, koltuklarım için ${m.ad} hakkında bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(m.ad)} için fiyat sor</span></a>
    </div>`;
}

// --- Desen (dikiş desenleri) -------------------------------------------------

const desenler = d.desenler || [];
const IPLIK = [
  ['Beyaz', '#f4f6f1'], ['Kırmızı', '#e2402f'], ['Mavi', '#4a6bff'], ['Pembe', '#ff8fb1'], ['Sarı', '#f2cc3b'],
];

// Sırt paneli: 300×400. İç bölge desenlerin çizildiği yer.
const SEAT = 'M58 34 Q150 6 242 34 Q256 40 258 56 L270 350 Q272 372 250 378 Q150 398 50 378 Q28 372 30 350 L42 56 Q44 40 58 34 Z';
const INNER = 'M84 58 Q150 40 216 58 L228 344 Q150 362 72 344 Z';

function patternPath(kind) {
  const seg = [];
  const L = (x1, y1, x2, y2) => seg.push(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
  if (kind === 'kapitone') {
    for (let k = -8; k <= 12; k++) {
      const c = k * 34;
      L(40 + c, 30, 40 + c + 330, 360);
      L(260 - c, 30, 260 - c - 330, 360);
    }
  } else if (kind === 'dilim') {
    for (let x = 96; x <= 206; x += 22) L(x, 52, x + (x - 150) * 0.04, 352);
    L(74, 120, 226, 120);
  } else if (kind === 'petek') {
    const r = 17;
    const h = Math.sqrt(3) * r;
    for (let row = 0; row < 14; row++) {
      for (let col = 0; col < 7; col++) {
        const cx = 70 + col * r * 3 + (row % 2 ? r * 1.5 : 0);
        const cy = 50 + row * (h / 2);
        const p = Array.from({ length: 6 }, (_, k) => [cx + r * Math.cos((Math.PI / 3) * k), cy + r * Math.sin((Math.PI / 3) * k)]);
        seg.push(`M${p.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join('L')}Z`);
      }
    }
  } else {
    seg.push('M92 70 Q150 54 208 70 L218 334 Q150 350 82 334 Z');
  }
  return seg.join('');
}

$('#desen').innerHTML = `
  <div class="quilt__pin">
    <div class="quilt__copy">
      <h2 class="sec-title">Dikiş desenini siz seçin.</h2>
      <ul class="quilt__list">${desenler.map((p, i) => `<li data-i="${i}">${esc(p.ad)}</li>`).join('')}</ul>
      <p class="quilt__desc"></p>
      <div class="quilt__threads" role="group" aria-label="İplik rengi">
        <span>İplik</span>
        ${IPLIK.map(([ad, c], i) => `<button type="button" class="${i === 0 ? 'is-on' : ''}" data-c="${c}" style="--c:${c}" aria-label="${ad} iplik" aria-pressed="${i === 0}"></button>`).join('')}
      </div>
    </div>
    <div class="quilt__panel">
      <svg viewBox="0 0 300 400" aria-hidden="true">
        <defs>
          <pattern id="q-leather" patternUnits="userSpaceOnUse" width="300" height="400">
            <image href="${asset('/img/usta/deri-doku.jpg')}" width="300" height="400" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <radialGradient id="q-sheen" cx="42%" cy="30%" r="75%">
            <stop offset="0" stop-color="#fff" stop-opacity=".22" />
            <stop offset=".55" stop-color="#fff" stop-opacity="0" />
            <stop offset="1" stop-color="#000" stop-opacity=".35" />
          </radialGradient>
          <clipPath id="q-inner"><path d="${INNER}" /></clipPath>
          ${desenler.map((p, i) => `<mask id="q-m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="400"><path class="q-mask" d="${patternPath(p.id)}" /></mask>`).join('')}
        </defs>
        <path class="q-shadow" d="${SEAT}" transform="translate(6 10)" />
        <path d="${SEAT}" fill="url(#q-leather)" />
        <path d="${SEAT}" fill="url(#q-sheen)" />
        <path class="q-seam" d="M62 44 Q58 200 48 364 M238 44 Q242 200 252 364" />
        <path class="q-seam q-seam--top" d="M70 50 Q150 26 230 50" />
        ${desenler.map((p, i) => `
          <g class="q-pat" data-i="${i}" clip-path="url(#q-inner)">
            <path class="q-groove" d="${patternPath(p.id)}" mask="url(#q-m${i})" />
            <path class="q-thread" d="${patternPath(p.id)}" mask="url(#q-m${i})" />
          </g>`).join('')}
      </svg>
    </div>
  </div>`;

// --- Kalıp ---------------------------------------------------------------------

const PIECE = 'M150 72 C 232 40 368 40 450 72 C 462 78 466 88 467 100 L 482 372 C 382 404 218 404 118 372 L 133 100 C 134 88 138 78 150 72 Z';
const CUT = 'M146 56 C 230 22 370 22 454 56 C 474 64 482 80 483 98 L 498 384 C 386 422 214 422 102 384 L 117 98 C 118 80 126 64 146 56 Z';
const NOTCHES = [[300, 48], [133, 200], [467, 200], [300, 396]];
const kalipAdim = [
  'Eski döşemeyi söküp kalıbını çıkarıyoruz. Aracınızın orijinal ölçüsü neyse o.',
  'Dikiş payını bırakıp deriyi ya da kumaşı kalıba göre kesiyoruz.',
  'Parçaları dikip koltuğa geriyoruz. Kalıp arşivimizde saklanır.',
];

$('#kalip').innerHTML = `
  <div class="pattern__pin">
    <div class="pattern__copy">
      <h2 class="sec-title">Kalıp aracınızdan çıkar.</h2>
      <ol class="pattern__steps">${kalipAdim.map((t, i) => `<li data-i="${i}"><span>${i + 1}</span><p>${esc(t)}</p></li>`).join('')}</ol>
    </div>
    <div class="pattern__board">
      <svg viewBox="0 0 600 460" aria-hidden="true">
        <defs>
          <pattern id="pc-leather" patternUnits="userSpaceOnUse" width="600" height="460">
            <image href="${asset('/img/usta/deri-doku.jpg')}" width="600" height="460" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <mask id="pc-cutmask" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="460"><path class="pc-cutdraw" d="${CUT}" /></mask>
        </defs>
        <g class="pc-piece">
          <path class="pc-shadow" d="${PIECE}" transform="translate(10 16)" />
          <path class="pc-paper" d="${PIECE}" />
          <path class="pc-leather" d="${PIECE}" fill="url(#pc-leather)" />
          <path class="pc-sewn" d="M162 88 C 238 60 362 60 438 88 L 452 360 C 370 386 230 386 148 360 Z" />
          <path class="pc-chalk" d="${PIECE}" />
          <g class="pc-marks">
            ${NOTCHES.map(([x, y]) => `<path class="pc-notch" d="M${x - 7} ${y} L${x} ${y + (y > 300 ? -11 : 11)} L${x + 7} ${y}" />`).join('')}
            <path class="pc-grain" d="M300 120 L300 320 M288 136 L300 116 L312 136 M288 304 L300 324 L312 304" />
            <text class="pc-text" x="316" y="214">düz boy</text>
            <text class="pc-text pc-text--big" x="190" y="188">SIRT</text>
            <text class="pc-text" x="190" y="214">kesim: 2 adet</text>
            <text class="pc-text" x="316" y="240">dikiş payı 1 cm</text>
          </g>
        </g>
        <path class="pc-cut" d="${CUT}" mask="url(#pc-cutmask)" />
        <g class="pc-scissors"><g transform="scale(1.9)">
          <g class="pc-blade pc-blade--a"><path d="M0 -2 L38 -1 Q44 0 38 1 L0 3 Z" /><circle cx="-12" cy="-6" r="8" /></g>
          <g class="pc-blade pc-blade--b"><path d="M0 2 L38 1 Q44 0 38 -1 L0 -3 Z" /><circle cx="-12" cy="6" r="8" /></g>
          <circle class="pc-screw" r="2.4" />
        </g></g>
      </svg>
    </div>
  </div>`;

// --- Hizmetler -----------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <header class="svc__head">
    <h2 class="sec-title sec-title--light">Tezgâhtan çıkan işler</h2>
    <p>Süreleri aracın durumuna göre değişir; kesin süreyi aracı görünce söyleriz.</p>
  </header>
  <ul class="svc__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc" style="--r:${i % 2 ? 1.2 : -1.4}deg">
        <figure class="svc__photo"><span class="pin pin--${i % 2 ? 'blue' : 'red'}"></span><img src="${h.gorsel}" alt="" loading="lazy"></figure>
        <div class="svc__body">
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <p class="svc__meta"><span class="chalk">Süre: ${esc(h.sure)}</span>
            <a href="${waHref(d, `Merhaba ${d.isletme.ad}, ${h.baslik} için fiyat almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Fiyat sor</span></a></p>
        </div>
      </li>`).join('')}
  </ul>`;

// --- Mezura (rakamlar) ----------------------------------------------------

const rakamlar = [
  { deger: yas, sonek: ' yıl', etiket: 'aynı tezgâhta' },
  ...d.istatistikler,
];
const CM = 12;
const tapeLen = 240;
$('#rakamlar').innerHTML = `
  <div class="tape" aria-hidden="true">
    <div class="tape__track" style="width:${tapeLen * CM}px">
      ${Array.from({ length: tapeLen / 10 + 1 }, (_, i) => `<span style="left:${i * 10 * CM}px">${i * 10}</span>`).join('')}
    </div>
  </div>
  <div class="tape-sec__inner">
    <h2 class="sec-title">Ölçüp biçtiğimiz yıllar</h2>
    <ul class="stats">
      ${rakamlar.map((s) => `
        <li><strong data-count="${s.deger}" data-suffix="${esc(s.sonek || '')}">${fmt(s.deger)}${esc(s.sonek || '')}</strong><span>${esc(s.etiket)}</span></li>`).join('')}
    </ul>
    <p class="tape-sec__garanti">${esc(d.garanti)}</p>
  </div>`;

// --- Tarihçe ---------------------------------------------------------------------

const tarihce = d.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus);

$('#tarihce').innerHTML = `
  <div class="story__pin">
    <header class="story__head">
      <h2 class="sec-title sec-title--light">Bir tezgâhın hikâyesi</h2>
      <p>${esc(beri)} Şaşmaz'dayız. Panodaki her iğne bir dönüm noktası.</p>
    </header>
    <div class="story__track">
      <svg class="story__thread" aria-hidden="true"><path /></svg>
      ${tarihce.map((t, i) => `
        <article class="story__item" style="--r:${[-2.5, 2, -1.2, 2.8, -2, 1.4][i % 6]}deg">
          <svg class="story__year" aria-hidden="true"><text>${t.yil ?? 'Bugün'}</text></svg>
          <figure class="story__photo"><span class="pin pin--${i % 2 ? 'blue' : 'red'}" data-pin></span><span class="washi"></span>
            <img src="${t.gorsel}" alt="" loading="lazy"></figure>
          <h3><span class="sr-only">${t.yil ?? 'Bugün'}: </span>${esc(t.baslik)}</h3>
          <p>${esc(t.metin)}</p>
        </article>`).join('')}
    </div>
  </div>`;

// --- Markalar (kurdele) -------------------------------------------------------

const button4 = `<svg class="button4" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><circle cx="7" cy="7" r="1.6" /><circle cx="13" cy="7" r="1.6" /><circle cx="7" cy="13" r="1.6" /><circle cx="13" cy="13" r="1.6" /></svg>`;
const ribbonRow = d.markalar.map((m) => `<span>${esc(m)}</span>${button4}`).join('');
$('#markalar').innerHTML = `
  <p class="sr-only">Çalıştığımız markalar: ${d.markalar.map(esc).join(', ')}</p>
  <div class="ribbon__band ribbon__band--a" aria-hidden="true"><div class="ribbon__row">${ribbonRow}${ribbonRow}</div></div>
  <div class="ribbon__band ribbon__band--b" aria-hidden="true"><div class="ribbon__row">${ribbonRow}${ribbonRow}</div></div>`;

// --- Yorumlar (askı etiketleri) ------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <header class="tags__head">
    <div class="tags__score">
      <strong data-count-dec="${d.puan.ortalama}">${String(d.puan.ortalama).replace('.', ',')}</strong>
      <div><span class="tags__stars">${stars(d.puan.ortalama)}</span><span>${fmt(d.puan.adet)} değerlendirme</span></div>
    </div>
    <h2 class="sec-title">Koltuğunu yaptıranlar anlatıyor</h2>
  </header>
  <div class="tags__rail">
    ${d.yorumlar.map((y, i) => `
      <figure class="tag" style="--r:${[-3, 2, -1.5, 3, -2][i % 5]}deg">
        <span class="tag__hole"></span>
        <span class="tag__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</span>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

// --- Ulaşım ----------------------------------------------------------------------

const saatler = groupedHours(d.saatler);
$('#iletisim').innerHTML = `
  <div class="visit__grid">
    <div class="care">
      <p class="care__brand">${esc(d.isletme.ad)}</p>
      <h2>Çalışma saatleri</h2>
      <p class="care__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.text)}</p>
      <ul class="care__hours">
        ${saatler.map(([g, s]) => `<li><span>${esc(g)}</span><span>${esc(s)}</span></li>`).join('')}
      </ul>
      <p class="care__addr">${esc(d.iletisim.adres)}</p>
      <div class="care__cta">
        <a class="btn btn--chalk" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--stitch btn--onmat" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map>
      <a class="visit__maplink" href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a>
    </div>
  </div>`;

// --- Final ---------------------------------------------------------------------

$('#randevu').innerHTML = `
  <div class="finale__inner">
    <h2 class="finale__title">Koltuğunuzu getirin, ölçüsünü alalım.</h2>
    <svg class="finale__tape" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
      <defs><clipPath id="fin-clip"><rect class="fin-clip" x="0" y="0" width="0" height="80" /></clipPath></defs>
      <g clip-path="url(#fin-clip)">
        <path class="fin-band" d="M0 46 C 160 12 300 70 480 40 S 820 18 1000 44" />
        <path class="fin-ticks" d="M0 46 C 160 12 300 70 480 40 S 820 18 1000 44" />
      </g>
    </svg>
    <p class="finale__lead">${esc(d.garanti)} Fiyatı işe başlamadan söyleriz.</p>
    <div class="finale__cta">${btnCall('btn--big')}${btnWa('btn--big', `Merhaba ${d.isletme.ad}, koltuklarım için randevu almak istiyorum.`)}</div>
  </div>`;

$('.foot').innerHTML = `
  <div class="foot__inner">
    <strong>${esc(d.isletme.ad)}</strong>
    <span>${esc(d.iletisim.adres)}</span>
    <a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a>
    <small>© ${buYil} ${esc(d.isletme.ad)}. Fotoğraflar: Pexels.</small>
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

// ============================================================================
// Hareket
// ============================================================================

const heroTitleHost = $('.stitch-title');
let heroTitle;

function applyDeck(t) {
  $$('.swatch').forEach((el, i) => {
    const diff = i - t;
    const rot = diff < 0 ? Math.max(-36, diff * 12) : Math.min(diff, 3) * 4;
    const lift = diff < 0 ? 0 : Math.min(diff, 3) * 6;
    el.style.transform = `translate3d(${lift}px, ${-lift}px, 0) rotate(${rot.toFixed(2)}deg)`;
    el.style.zIndex = String(100 - Math.round(Math.abs(diff) * 10));
    el.classList.toggle('is-active', Math.abs(diff) < 0.5);
  });
}
let deckActive = -1;
function setDeckActive(i) {
  if (i === deckActive) return;
  deckActive = i;
  const info = $('.deck__info');
  info.innerHTML = deckInfo(i);
  if (!reducedMotion) gsap.fromTo(info.firstElementChild, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
}

function setQuiltActive(i) {
  $$('.quilt__list li').forEach((li, k) => li.classList.toggle('is-on', k === i));
  const p = desenler[i];
  if (p) $('.quilt__desc').textContent = p.aciklama;
}

function setPatternStep(i) {
  $$('.pattern__steps li').forEach((li, k) => li.classList.toggle('is-on', k <= i));
}

function countUp(el) {
  const v = Number(el.dataset.count);
  const obj = { v: 0 };
  gsap.to(obj, {
    v, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (el.textContent = fmt(Math.round(obj.v)) + el.dataset.suffix),
  });
}

// İplik rengi seçimi (desen paneli)
$('.quilt__threads').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-c]');
  if (!b) return;
  $$('.quilt__threads button').forEach((x) => {
    x.classList.toggle('is-on', x === b);
    x.setAttribute('aria-pressed', String(x === b));
  });
  $('.quilt__panel svg').style.setProperty('--q-thread', b.dataset.c);
});

// Tarihçe ipi: iğneler arasından sarkan kırmızı iplik
function layoutThread() {
  const track = $('.story__track');
  const svg = $('.story__thread');
  const pins = $$('[data-pin]', track);
  if (!pins.length) return;
  const tb = track.getBoundingClientRect();
  const pts = pins.map((p) => {
    const r = p.getBoundingClientRect();
    return [r.left - tb.left + r.width / 2, r.top - tb.top + r.height / 2];
  });
  const w = track.scrollWidth;
  const h = track.offsetHeight;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  let dStr = `M${pts[0][0] - 60} ${pts[0][1] - 30} Q${pts[0][0] - 30} ${pts[0][1] + 10} ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    dStr += ` Q${(x0 + x1) / 2} ${Math.max(y0, y1) + 70} ${x1} ${y1}`;
  }
  const last = pts.at(-1);
  dStr += ` Q${last[0] + 60} ${last[1] + 60} ${last[0] + 140} ${last[1] + 20}`;
  $('path', svg).setAttribute('d', dStr);
}

function fitYears() {
  $$('.story__year').forEach((svg) => {
    const t = $('text', svg);
    const b = t.getBBox();
    svg.setAttribute('viewBox', `${b.x - 6} ${b.y - 6} ${b.width + 12} ${b.height + 12}`);
  });
}

function staticState() {
  if (heroTitle) finishStitch(heroTitle.svg);
  applyDeck(0);
  setDeckActive(0);
  setQuiltActive(0);
  setPatternStep(2);
  document.documentElement.classList.add('is-static');
  $('#intro').remove();
}

async function init() {
  heroTitle = await buildStitchTitle(heroTitleHost, { maxLines: mq.matches ? 3 : 2 });
  try { await document.fonts.load('700 100px Syne'); } catch {}
  fitYears();

  if (reducedMotion) {
    staticState();
    return;
  }

  const lenis = initSmoothScroll();
  const vel = () => lenis?.velocity ?? 0;

  // Açılış: mezura çekilir, yıl sayılır, perde açılır.
  const intro = $('#intro');
  const count = $('.intro__count span', intro);
  const heroTl = stitchTimeline(heroTitle);
  const introTl = gsap.timeline();
  const cnt = { v: 0 };
  introTl
    .fromTo('.intro__tape', { xPercent: 30 }, { xPercent: -30, duration: 1.2, ease: 'power2.inOut' }, 0)
    .to(cnt, { v: yas, duration: 1.1, ease: 'power2.out', onUpdate: () => (count.textContent = Math.round(cnt.v)) }, 0)
    .to(intro, { yPercent: -100, duration: 0.55, ease: 'power3.inOut' }, 1.15)
    .from('.hero__label, .hero__lead, .hero__cta, .hero__chalk', { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' }, 1.35)
    .from('.hero__photo', { y: -60, rotation: 14, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.6)' }, 1.3);
  intro.addEventListener('pointerdown', () => introTl.progress(1), { once: true });
  document.body.style.overflow = 'hidden';
  introTl.eventCallback('onComplete', () => {
    document.body.style.overflow = '';
    intro.remove();
    heroTl.play();
  });

  // Hero: kaydırınca fotoğraf sallanır, başlık hafifçe kalkar.
  gsap.to('.hero__photo', {
    yPercent: 30, rotation: -10, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
  gsap.to('.hero__title', {
    yPercent: -18, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });

  // Header: mat bitince koyulaşır.
  ScrollTrigger.create({
    trigger: '#hero', start: 'bottom 80px',
    onEnter: () => $('#top').classList.add('is-solid'),
    onLeaveBack: () => $('#top').classList.remove('is-solid'),
  });

  // Hakkımızda: kelimeler dikilerek koyulaşır.
  const split = new SplitText('[data-words]', { type: 'words', wordsClass: 'w' });
  gsap.fromTo(split.words, { opacity: 0.16 }, {
    opacity: 1, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: '#hakkimizda', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });

  // Kartela: yelpaze perçinin etrafında açılır.
  const n = malzemeler.length;
  applyDeck(0);
  setDeckActive(0);
  ScrollTrigger.create({
    trigger: '#kartela',
    pin: '.deck__pin',
    start: 'top top',
    end: () => `+=${(n - 1) * window.innerHeight * 0.75}`,
    scrub: 0.5,
    snap: { snapTo: 1 / (n - 1), duration: { min: 0.15, max: 0.4 }, delay: 0.05, ease: 'power1.inOut' },
    onUpdate: (self) => {
      const t = self.progress * (n - 1);
      applyDeck(t);
      setDeckActive(Math.round(t));
    },
  });
  gsap.from('.deck__fan', {
    y: 140, rotation: 12, autoAlpha: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#kartela', start: 'top 75%' },
  });

  // Desen: her desen sırayla dikilir.
  setQuiltActive(0);
  const masks = $$('.q-mask');
  const groups = $$('.q-pat');
  gsap.set(masks, { drawSVG: '0%' });
  gsap.set(groups, { autoAlpha: 1 });
  const qtl = gsap.timeline({
    scrollTrigger: {
      trigger: '#desen', pin: '.quilt__pin', start: 'top top',
      end: () => `+=${desenler.length * window.innerHeight * 0.7}`, scrub: 0.6,
      onUpdate: (self) => setQuiltActive(Math.min(desenler.length - 1, Math.floor(self.progress * desenler.length * 0.999))),
    },
  });
  masks.forEach((m, i) => {
    qtl.to(m, { drawSVG: '100%', duration: 1, ease: 'none' }, i * 1.3);
    if (i < masks.length - 1) qtl.to(groups[i], { autoAlpha: 0, duration: 0.3 }, i * 1.3 + 1.1);
  });
  qtl.to({}, { duration: 0.3 });

  // Kalıp: tebeşir çizgisi, makas, parça ters çevrilir.
  const sc = $('.pc-scissors');
  const bladeA = $('.pc-blade--a');
  const bladeB = $('.pc-blade--b');
  gsap.set('.pc-chalk', { drawSVG: '0%' });
  gsap.set('.pc-cutdraw', { drawSVG: '0%' });
  gsap.set('.pc-marks > *', { autoAlpha: 0 });
  gsap.set(['.pc-leather', '.pc-sewn'], { autoAlpha: 0 });
  gsap.set('.pc-shadow', { autoAlpha: 0.45 });
  gsap.set(sc, { autoAlpha: 0 });
  const snip = { v: 0 };
  const ptl = gsap.timeline({
    scrollTrigger: {
      trigger: '#kalip', pin: '.pattern__pin', start: 'top top',
      end: () => `+=${window.innerHeight * 2.2}`, scrub: 0.6,
      onUpdate: (self) => setPatternStep(self.progress < 0.34 ? 0 : self.progress < 0.68 ? 1 : 2),
    },
  });
  ptl
    .to('.pc-chalk', { drawSVG: '100%', duration: 1.2, ease: 'none' })
    .to('.pc-marks > *', { autoAlpha: 1, stagger: 0.08, duration: 0.3 }, 0.8)
    .set(sc, { autoAlpha: 1 }, 1.5)
    .to('.pc-cutdraw', { drawSVG: '100%', duration: 2, ease: 'none' }, 1.5)
    .to(sc, {
      duration: 2, ease: 'none',
      motionPath: { path: CUT, align: 'self', autoRotate: true, alignOrigin: [0.5, 0.5] },
    }, 1.5)
    .to(snip, {
      v: 1, duration: 2, ease: 'none',
      onUpdate: () => {
        const a = Math.sin(snip.v * Math.PI * 28) * 14;
        bladeA.setAttribute('transform', `rotate(${-Math.abs(a)})`);
        bladeB.setAttribute('transform', `rotate(${Math.abs(a)})`);
      },
    }, 1.5)
    .to(sc, { autoAlpha: 0, duration: 0.2 }, 3.5)
    .to('.pc-cut', { autoAlpha: 0, duration: 0.3 }, 3.6)
    .to('.pc-shadow', { autoAlpha: 1, duration: 0.3 }, 3.6)
    .to('.pc-piece', { y: -14, duration: 0.4, ease: 'power2.out' }, 3.6)
    .to('.pc-piece', { scaleX: 0, svgOrigin: '300 230', duration: 0.35, ease: 'power2.in' }, 4.0)
    .set(['.pc-marks', '.pc-paper', '.pc-chalk'], { autoAlpha: 0 }, 4.35)
    .set('.pc-leather', { autoAlpha: 1 }, 4.35)
    .to('.pc-piece', { scaleX: 1, svgOrigin: '300 230', duration: 0.35, ease: 'power2.out' }, 4.35)
    .fromTo('.pc-sewn', { autoAlpha: 1, drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9, ease: 'none' }, 4.7);

  // Hizmetler: kalıp parçaları mata serilir.
  ScrollTrigger.batch('.svc', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.fromTo(els,
      { y: 60, x: (i) => (i % 2 ? 40 : -40), rotation: (i) => (i % 2 ? 8 : -8), autoAlpha: 0 },
      { y: 0, x: 0, rotation: (i, el) => parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0, autoAlpha: 1, stagger: 0.1, duration: 0.8, ease: 'back.out(1.4)' }),
  });

  // Mezura: kaydırdıkça çekilir; sayılar görünce sayar.
  gsap.fromTo('.tape__track', { x: 0 }, {
    x: () => -(tapeLen * CM - window.innerWidth * 0.8), ease: 'none',
    scrollTrigger: { trigger: '#rakamlar', start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true },
  });
  $$('#rakamlar [data-count]').forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => countUp(el) }));

  // Tarihçe: pano yatay kayar, iğneler arası iplik çekilir, fotoğraflar renklenir.
  const track = $('.story__track');
  const items = $$('.story__item');
  layoutThread();
  const threadPath = $('.story__thread path');
  gsap.set(threadPath, { drawSVG: '0%' });
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + (mq.matches ? 32 : 120));
  gsap.timeline({
    scrollTrigger: {
      trigger: '#tarihce', pin: '.story__pin', start: 'top top',
      end: () => `+=${dist()}`, scrub: 0.6, invalidateOnRefresh: true,
      onRefresh: layoutThread,
      onUpdate: () => {
        const mid = window.innerWidth * 0.62;
        items.forEach((it) => {
          const r = it.getBoundingClientRect();
          it.classList.toggle('is-on', r.left < mid);
        });
      },
    },
  })
    .to(track, { x: () => -dist(), ease: 'none' }, 0)
    .to(threadPath, { drawSVG: '100%', ease: 'none' }, 0);

  // Kurdele: hızla akar, kaydırma hızıyla hızlanır.
  const rows = $$('.ribbon__row');
  const pos = rows.map(() => 0);
  gsap.ticker.add(() => {
    const v = vel();
    rows.forEach((row, i) => {
      const half = row.scrollWidth / 2;
      if (!half) return;
      const dir = i % 2 ? 1 : -1;
      pos[i] += dir * (0.6 + Math.min(12, Math.abs(v) * 0.35));
      if (pos[i] <= -half) pos[i] += half;
      if (pos[i] > 0) pos[i] -= half;
      row.style.transform = `translate3d(${pos[i].toFixed(1)}px,0,0)`;
    });
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
    scrollTrigger: { trigger: '.tags__rail', start: 'top 85%' },
  });
  const score = $('[data-count-dec]');
  ScrollTrigger.create({
    trigger: score, start: 'top 85%', once: true,
    onEnter: () => {
      const o = { v: 0 };
      gsap.to(o, { v: Number(score.dataset.countDec), duration: 1.2, ease: 'power2.out', onUpdate: () => (score.textContent = o.v.toFixed(1).replace('.', ',')) });
    },
  });

  // Ulaşım: bakım etiketi dikişle iner.
  gsap.from('.care', {
    y: 60, rotation: -3, autoAlpha: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#iletisim', start: 'top 75%' },
  });

  // Final: satırlar yükselir, mezura başlığın altına çekilir.
  const fsplit = new SplitText('.finale__title', { type: 'lines', linesClass: 'ln' });
  fsplit.lines.forEach((l) => {
    const wrap = document.createElement('span');
    wrap.className = 'ln-mask';
    l.parentNode.insertBefore(wrap, l);
    wrap.appendChild(l);
  });
  gsap.timeline({ scrollTrigger: { trigger: '#randevu', start: 'top 70%' } })
    .from(fsplit.lines, { yPercent: 110, duration: 0.9, stagger: 0.1, ease: 'power4.out' })
    .to('.fin-clip', { attr: { width: 1000 }, duration: 1.1, ease: 'power2.inOut' }, 0.3)
    .from('.finale__lead, .finale__cta', { y: 20, autoAlpha: 0, stagger: 0.1, duration: 0.6 }, 0.6);

  // Masaüstü: iğne ucu imleci ve mıknatıslı butonlar.
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
    $$('.btn').forEach((b) => {
      const mx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
      const my = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.25);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  // Genişlik değişince başlığı yeniden kur (yükseklik değişimi, telefon adres çubuğu vb. hariç).
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
