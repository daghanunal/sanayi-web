import raw from '../../data/usta.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, autoHideHeader, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

// Usta: klasik aile. Petrol yeşili deri, krem iplik. İmza: sayfa boyunca dikilen iplik; künyeden
// başlar, İletişim'deki düğmelerin altında düğümlenir. Tarihçe, tasarım aracı ve marka şeridi çıktı.
gsap.registerPlugin(SplitText, DrawSVGPlugin);

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

// --- Render ----------------------------------------------------------------

$('[data-bind="ad"]').textContent = d.isletme.ad;
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
topCall.innerHTML = `${icons.phone}<span>${tel}</span>`;

const durum = (cls = '', kunye = false) =>
  `<span class="status ${cls} ${st.open ? 'is-open' : ''}"><i></i>${esc(kunye ? st.kunye : st.metin)}</span>`;

$('#hero').innerHTML = `
  <div class="hero__media"><img src="${asset('/img/usta/hero-koltuk.jpg')}" alt="Kontrast dikişli siyah deri koltuk" fetchpriority="high" width="1600" height="1067"></div>
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd>${durum('', true)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--thread" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <header class="sec-head">
    <h2 id="hizmetler-h">Hizmetler</h2>
    <p>Süreler yaklaşıktır, araca ve koltuğun durumuna göre değişebilir. Fiyat ve randevu için arayın.</p>
  </header>
  <div class="services__grid">
    <div class="services__frame" aria-hidden="true">
      ${d.hizmetler.map((h, i) => `<img src="${h.gorsel}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}">`).join('')}
    </div>
    <ul class="services__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc${i === 0 ? ' is-on' : ''}" data-i="${i}">
          <img class="svc__img" src="${h.gorsel}" alt="" loading="lazy" decoding="async">
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <span class="svc__time">${esc(h.sure)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

const olgular = [
  { deger: yas, sonek: ' yıl', etiket: "Şaşmaz Oto Sanayi Sitesi'nde" },
  { deger: acikGun, sonek: ' gün', etiket: 'haftada açık' },
];
$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div class="about__stamp" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs><path id="stamp-c" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs>
        <circle cx="100" cy="100" r="96" class="stamp__ring"/>
        <circle cx="100" cy="100" r="88" class="stamp__ring stamp__ring--dash"/>
        <text><textPath href="#stamp-c" textLength="464">Şaşmaz Oto Sanayi ✦ ${esc(yilEki(kurulus))} beri ✦</textPath></text>
        <text x="100" y="94" class="stamp__year" text-anchor="middle">${kurulus}</text>
        <text x="100" y="122" class="stamp__small" text-anchor="middle">kuruluş</text>
      </svg>
    </div>
    <div class="about__text">
      <h2 id="hakkinda-h">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
  </div>
  <div class="patch">
    <div class="patch__leather">
      <ul class="patch__stats">
        ${olgular.map((s) => `
          <li><strong data-count="${s.deger}" data-suffix="${esc(s.sonek)}">${s.deger}${esc(s.sonek)}</strong><span>${esc(s.etiket)}</span></li>`).join('')}
      </ul>
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="visit__info">
    <h2 id="saatler-h">Çalışma saatleri ve konum</h2>
    ${durum('status--big')}
    <dl class="hours">${saatListesi(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
    <address>${esc(d.iletisim.adres)}</address>
    <div class="visit__actions">
      <a class="btn btn--thread" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="visit__map" data-src="${esc(mapsEmbed(d))}"></div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <h2 id="yorumlar-h">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <ul class="reviews__list">
    ${d.yorumlar.map((y) => `
      <li class="review">
        <span class="stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</span>
        <blockquote>${esc(y.metin)}</blockquote>
        <p class="review__who"><b>${esc(y.ad)}</b> ${esc(y.arac)}</p>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <h2 class="finale__title" id="iletisim-h">İletişim</h2>
  <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Koltuğun fotoğrafı da gönderilebilir.</p>
  <div class="finale__actions">
    <a class="btn btn--thread btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--ghost btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('.foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
  <p class="foot__copy">© ${buYil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

// --- Üst şerit ---------------------------------------------------------------

const top = $('.top');
ScrollTrigger.create({ start: 80, end: 'max', onToggle: (self) => top.classList.toggle('is-solid', self.isActive) });
let unhide = null;
const phoneMq = matchMedia('(max-width: 899px)');
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Harita: yaklaşınca yükle -------------------------------------------------

const mapBox = $('.visit__map');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe src="${mapBox.dataset.src}" title="${ad} konumu" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Hareket -----------------------------------------------------------------

initSmoothScroll();

if (!reducedMotion) {
  // Açılış: künye bir kez gelir (kaydırmayı kilitlemez).
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__media img', { scale: 1.12, duration: 1.8, ease: 'power2.out' }, 0)
    .from('.hero__inner > *', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0.1);
  gsap.to('.hero__media img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

  document.fonts.ready.then(() => {
    // Hakkında: kelimeler okundukça koyulaşır
    const lead = SplitText.create('.about__lead', { type: 'words' });
    gsap.fromTo(lead.words, { opacity: 0.2 }, {
      opacity: 1, stagger: 0.04, ease: 'none',
      scrollTrigger: { trigger: '.about__lead', start: 'top 82%', end: 'bottom 50%', scrub: true },
    });
  });
  gsap.to('.about__stamp svg', { rotate: 200, ease: 'none', scrollTrigger: { trigger: '#hakkinda', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Hizmetler: ekranın ortasındaki satır öne çıkar, görsel değişir
  const frames = $$('.services__frame img');
  $$('.svc').forEach((li) => {
    ScrollTrigger.create({
      trigger: li, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => {
        if (!self.isActive) return;
        $$('.svc.is-on').forEach((x) => x.classList.remove('is-on'));
        li.classList.add('is-on');
        frames.forEach((f, i) => f.classList.toggle('is-on', i === Number(li.dataset.i)));
      },
    });
  });

  // Deri etiket: iki olgu sayar
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = `0${el.dataset.suffix}`;
    gsap.to(obj, {
      v: end, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
      onUpdate: () => (el.textContent = Math.round(obj.v) + el.dataset.suffix),
    });
  });

  document.fonts.ready.then(() => requestAnimationFrame(buildSeams));
}

// --- İmza: sayfa boyunca dikilen iplik ---------------------------------------
// Her bölümün kendi SVG'si var; uçları birbirine denk geldiği için tek bir dikiş gibi görünür.

const SEAM_SECTIONS = ['#hero', '#hizmetler', '#hakkinda', '#saatler', '#yorumlar', '#iletisim'];
const NEEDLE = `
  <g class="needle"><g transform="scale(1.45)">
    <path d="M-58,-2.4 L-8,-1.3 L0,0 L-8,1.3 L-58,2.4 Q-63,0 -58,-2.4 Z" fill="url(#needle-steel)"/>
    <ellipse cx="-52" cy="0" rx="3.6" ry="0.9" fill="#071a1c"/>
  </g></g>`;
let seamTriggers = [];
let lastKey = 0;

function seamPath(x0, y0, x1, y1, knot) {
  const h = y1 - y0;
  if (knot) return `M${x0},${y0} C${x0},${y0 + h * 0.9} ${x1 - (x1 - x0) * 0.8},${y1} ${x1},${y1}`;
  return `M${x0},${y0} C${x0},${y0 + h * 0.42} ${x1},${y1 - h * 0.42} ${x1},${y1}`;
}

// Bölüm boyu sonradan değişirse (geç yüklenen görsel, yazı tipi) dikiş yeniden çizilir.
const seamKey = () => innerWidth + ':' + SEAM_SECTIONS.map((sel) => $(sel)?.offsetHeight ?? 0).join(',');
function buildSeams() {
  const key = seamKey();
  if (key === lastKey && seamTriggers.length) return;
  lastKey = key;
  seamTriggers.forEach((t) => t.kill());
  seamTriggers = [];
  $$('.seam').forEach((s) => s.remove());

  // Dikiş sağ kenar boşluğundan iner, hafifçe salınır: metnin üstünden geçmez.
  const pad = Math.min(72, Math.max(20, innerWidth * 0.05));
  const pageW = document.documentElement.clientWidth;
  const gutterX = (i) => pageW - pad * (i % 2 ? 0.62 : 0.4);
  let prevX = null;

  SEAM_SECTIONS.forEach((sel, i) => {
    const sec = $(sel);
    const w = sec.offsetWidth;
    const h = sec.offsetHeight;
    const left = sec.getBoundingClientRect().left;
    const first = i === 0;
    const last = i === SEAM_SECTIONS.length - 1;
    const x0 = (first ? gutterX(1) : prevX) - left;
    const y0 = first ? h * 0.2 : 0;
    const x1 = last ? w * 0.5 : gutterX(i) - left;
    const acts = $('.finale__actions');
    const y1 = last ? acts.offsetTop + acts.offsetHeight + 44 : h;
    prevX = x1 + left;
    const path = seamPath(x0, y0, x1, y1, last);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('seam');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <mask id="seam-m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
          <path class="seam__reveal" d="${path}"/>
        </mask>
        <linearGradient id="needle-steel${i}" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stop-color="#f4f5f7"/><stop offset=".5" stop-color="#9aa0a8"/><stop offset="1" stop-color="#4c5057"/>
        </linearGradient>
      </defs>
      <path class="seam__guide" d="${path}"/>
      <g mask="url(#seam-m${i})">
        <path class="seam__holes" d="${path}"/>
        <path class="seam__thread" d="${path}"/>
      </g>
      ${last ? `<circle class="seam__knot" cx="${x1}" cy="${y1}" r="7"/>` : ''}
      ${NEEDLE.replace('needle-steel', `needle-steel${i}`)}`;
    sec.prepend(svg);

    const reveal = $('.seam__reveal', svg);
    const thread = $('.seam__thread', svg);
    const needle = $('.needle', svg);
    const len = thread.getTotalLength();
    const knot = $('.seam__knot', svg);
    gsap.set(needle, { opacity: 0 });
    if (knot) gsap.set(knot, { scale: 0, transformOrigin: 'center' });

    const tween = gsap.fromTo(reveal, { drawSVG: '0%' }, {
      drawSVG: '100%', ease: 'none',
      scrollTrigger: {
        trigger: sec,
        start: first ? 'top top' : 'top 58%',
        end: last ? 'clamp(bottom bottom)' : 'bottom 58%',
        scrub: 0.5,
      },
      onUpdate() {
        const p = this.progress();
        const at = Math.max(0.5, len * p);
        const a = thread.getPointAtLength(at);
        const b = thread.getPointAtLength(Math.max(0, at - 2));
        const ang = (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI;
        needle.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${ang})`);
        needle.style.opacity = p > 0.001 && p < 0.999 ? 1 : 0;
        if (knot) gsap.to(knot, { scale: p > 0.99 ? 1 : 0, duration: 0.4, ease: 'back.out(3)', overwrite: true });
      },
    });
    seamTriggers.push(tween);
  });
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

let resizeTimer;
addEventListener('resize', () => {
  if (reducedMotion) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildSeams, 300);
});
addEventListener('load', () => ScrollTrigger.refresh());
if (!reducedMotion && 'ResizeObserver' in window) {
  const ro = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(buildSeams, 300); });
  SEAM_SECTIONS.forEach((sel) => $(sel) && ro.observe($(sel)));
}
