import raw from '../../data/usta.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { seatSVG, applySeat, MALZEMELER, RENKLER, IPLIKLER, DESENLER } from './seat.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);

const d = boot(raw);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => n.toLocaleString('tr-TR');
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = buYil - kurulus;

// Türkçe ayrılma eki: 1987'den, 1990'dan, 2004'ten, 1996'dan…
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : (n % 100) ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}
const beri = `${ablative(kurulus)} beri`;

// --- Render ----------------------------------------------------------------

$('[data-bind="ad"]').textContent = d.isletme.ad;
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;

const btnCall = (cls = '') => `<a class="btn btn--thread ${cls}" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>`;
const btnWa = (cls = '', msg) => `<a class="btn btn--ghost ${cls}" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>`;

$('#hero').innerHTML = `
  <div class="hero__media"><img src="${import.meta.env.BASE_URL}img/usta/hero-koltuk.jpg" alt="Kontrast dikişli siyah deri koltuk" fetchpriority="high"></div>
  <div class="hero__inner">
    <p class="hero__kicker">Şaşmaz Oto Sanayi'nde ${beri}</p>
    <h1 class="hero__title">${esc(d.isletme.slogan)}</h1>
    <p class="hero__sub">Koltuk, tavan, direksiyon, kapı döşemesi. Babadan oğula ${yas} yıldır aynı tezgâhta.</p>
    <div class="hero__actions">${btnCall()}${btnWa()}</div>
  </div>
  <p class="hero__hint" aria-hidden="true">Kaydırın, iğne dikmeye başlasın</p>`;

$('#hakkimizda').innerHTML = `
  <div class="about__stamp" aria-hidden="true">
    <svg viewBox="0 0 200 200">
      <defs><path id="stamp-c" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs>
      <circle cx="100" cy="100" r="96" class="stamp__ring"/>
      <circle cx="100" cy="100" r="88" class="stamp__ring stamp__ring--dash"/>
      <text><textPath href="#stamp-c" textLength="464">El işçiliği ✦ Şaşmaz ✦ ${beri} ✦</textPath></text>
      <text x="100" y="94" class="stamp__year" text-anchor="middle">${kurulus}</text>
      <text x="100" y="122" class="stamp__small" text-anchor="middle">kuruluş</text>
    </svg>
  </div>
  <p class="about__lead">${esc(d.isletme.hakkinda)}</p>
  <p class="about__note">${esc(d.garanti)}</p>`;

$('#hizmetler').innerHTML = `
  <header class="sec-head">
    <h2>Neler yapıyoruz</h2>
    <p>Aracın içinde elimizin değmediği yer kalmıyor. Fiyatı işe başlamadan söylüyoruz.</p>
  </header>
  <div class="services__grid">
    <div class="services__frame" aria-hidden="true">
      ${d.hizmetler.map((h, i) => `<img src="${h.gorsel}" alt="" loading="lazy" class="${i === 0 ? 'is-on' : ''}">`).join('')}
    </div>
    <ul class="services__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc${i === 0 ? ' is-on' : ''}" data-i="${i}">
          <img class="svc__img" src="${h.gorsel}" alt="" loading="lazy">
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <span class="svc__time">${esc(h.sure)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

// Tarihçe: ilk kayıt kuruluş yılı olur, kuruluştan önceki kayıtlar düşer.
const tarihce = d.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus);
$('#tarihce').innerHTML = `
  <div class="timeline__pin">
    <header class="timeline__head">
      <h2>Babadan oğula ${yas} yıl</h2>
      <p>Tek makineyle açılan dükkândan bugüne.</p>
    </header>
    <div class="timeline__track">
      ${tarihce.map((t) => `
        <article class="era">
          <div class="era__photo">
            <img class="era__old" src="${t.gorsel}" alt="" loading="lazy">
            <img class="era__new" src="${t.gorsel}" alt="${esc(t.baslik)}" loading="lazy">
          </div>
          <p class="era__year">${t.yil ?? buYil}</p>
          <h3>${esc(t.baslik)}</h3>
          <p class="era__text">${esc(t.metin)}</p>
        </article>`).join('')}
    </div>
    <div class="tape" aria-hidden="true"><div class="tape__strip"></div></div>
  </div>`;

const stats = [{ deger: yas, sonek: ' yıl', etiket: 'aynı tezgâhta' }, ...d.istatistikler];
$('#rakamlar').innerHTML = `
  <div class="patch__leather">
    <ul class="patch__stats">
      ${stats.map((s) => `
        <li><strong data-count="${s.deger}" data-suffix="${esc(s.sonek || '')}">${fmt(s.deger)}${esc(s.sonek || '')}</strong><span>${esc(s.etiket)}</span></li>`).join('')}
    </ul>
  </div>`;

const opt = (name, list, checked, swatch) => list.map((o) => `
  <label class="chip">
    <input type="radio" name="${name}" value="${o.id}" ${o.id === checked ? 'checked' : ''}>
    <span class="chip__face">${swatch(o)}<span>${o.ad}</span></span>
  </label>`).join('');

$('#tasarla').innerHTML = `
  <header class="sec-head">
    <h2>Koltuğunuzu burada tasarlayın</h2>
    <p>Malzemeyi, rengi ve ipliği seçin. Beğendiğiniz tasarımı WhatsApp'tan gönderin, aynısını dikelim.</p>
  </header>
  <div class="studio__grid">
    <div class="studio__stage">${seatSVG()}</div>
    <form class="studio__form" aria-label="Koltuk tasarımı">
      <fieldset><legend>Malzeme</legend><div class="chips">${opt('malzeme', MALZEMELER, 'deri', (o) => `<i class="sw sw--${o.id}"></i>`)}</div></fieldset>
      <fieldset><legend>Renk</legend><div class="chips chips--color">${opt('renk', RENKLER, 'konyak', (o) => `<i class="sw" style="--c:${o.hex}"></i>`)}</div></fieldset>
      <fieldset><legend>İplik</legend><div class="chips">${opt('iplik', IPLIKLER, 'sari', (o) => `<i class="sw sw--thread" style="--c:${o.hex ?? 'transparent'}"></i>`)}</div></fieldset>
      <fieldset><legend>Desen</legend><div class="chips">${opt('desen', DESENLER, 'kapitone', (o) => `<i class="sw sw--${o.id}"></i>`)}</div></fieldset>
      <p class="studio__summary" aria-live="polite"></p>
      <a class="btn btn--thread studio__send" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu tasarımı gönder</span></a>
    </form>
  </div>`;

$('#atolye').innerHTML = `
  <header class="sec-head">
    <h2>Atölyeden</h2>
    <p>Kalıp, kesim, dikiş. Hepsi bu dükkânda, bu ellerle.</p>
  </header>
  <div class="works__grid">
    ${d.galeri.map((g) => `<figure class="work"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></figure>`).join('')}
  </div>
  <div class="brands">
    <h3 class="brands__title">Hangi marka olursa olsun</h3>
    <div class="brands__rail"><div class="brands__run">${[...d.markalar, ...d.markalar].map((m) => `<span>${esc(m)}</span>`).join('')}</div></div>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <p class="reviews__score"><strong>${d.puan.ortalama.toLocaleString('tr-TR')}</strong><span class="stars" aria-label="5 üzerinden ${d.puan.ortalama}">${stars(5)}</span></p>
    <h2>${d.puan.adet} müşterimiz Google'da yorum bıraktı</h2>
  </header>
  <ul class="reviews__list">
    ${d.yorumlar.map((y) => `
      <li class="review">
        <span class="stars" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</span>
        <blockquote>${esc(y.metin)}</blockquote>
        <p class="review__who"><b>${esc(y.ad)}</b> ${esc(y.arac)}</p>
      </li>`).join('')}
  </ul>`;

const durum = openStatus(d.saatler);
$('#iletisim').innerHTML = `
  <div class="visit__info">
    <h2>Dükkâna uğrayın</h2>
    <p class="status ${durum.open ? 'is-open' : ''}"><i></i>${durum.text}</p>
    <dl class="hours">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
    <address>${esc(d.iletisim.adres)}</address>
    <div class="visit__actions">
      <a class="btn btn--thread" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
      <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
    </div>
  </div>
  <div class="visit__map" data-src="${mapsEmbed(d)}"></div>`;

$('#randevu').innerHTML = `
  <h2 class="finale__title">Koltuğunuzu getirin, gerisini bize bırakın.</h2>
  <p class="finale__sub">Fotoğrafını WhatsApp'tan atın, aynı gün fiyat verelim.</p>
  <div class="finale__actions">${btnCall('btn--big')}${btnWa('btn--big', `Merhaba ${d.isletme.ad}, koltuklarımın fotoğrafını gönderiyorum. Fiyat alabilir miyim?`)}</div>`;

$('.foot').innerHTML = `
  <p class="foot__name">${esc(d.isletme.ad)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
  <p class="foot__copy">© ${buYil} ${esc(d.isletme.ad)}. ${beri} Şaşmaz'da.</p>`;

// --- Koltuk tasarlama --------------------------------------------------------

const form = $('.studio__form');
const seat = $('.seat');
const sendBtn = $('.studio__send');
function updateSeat(animate) {
  const v = Object.fromEntries(new FormData(form));
  applySeat(seat, v);
  const ad = (list, id) => list.find((x) => x.id === id).ad.toLocaleLowerCase('tr-TR');
  const iplik = v.iplik === 'ton' ? 'ton sür ton iplik' : `${ad(IPLIKLER, v.iplik)} iplik`;
  const ozet = `${RENKLER.find((x) => x.id === v.renk).ad} ${ad(MALZEMELER, v.malzeme)}, ${iplik}, ${ad(DESENLER, v.desen)} desen.`;
  $('.studio__summary').textContent = ozet;
  sendBtn.href = waHref(d, `Merhaba ${d.isletme.ad}, sitenizde şu koltuk tasarımını yaptım: ${ozet} Aracım: `);
  if (animate && !reducedMotion) {
    gsap.fromTo(seat, { scale: 0.97, rotate: -1.2 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    gsap.fromTo($$('.thread', seat), { strokeDashoffset: 40 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out' });
  }
}
form.addEventListener('change', () => updateSeat(true));
updateSeat(false);

// --- Üst şerit: kaydırınca zemin kazanır -------------------------------------

const top = $('.top');
ScrollTrigger.create({ start: 80, end: 'max', onToggle: (self) => top.classList.toggle('is-solid', self.isActive) });

// --- Harita: görününce yükle -------------------------------------------------

const mapBox = $('.visit__map');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe src="${mapBox.dataset.src}" title="Harita: ${esc(d.iletisim.adres)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Hareket -----------------------------------------------------------------

initSmoothScroll();
const mm = gsap.matchMedia();

if (!reducedMotion) {
  // Açılış: başlık satır satır, deri gibi aşağıdan yukarı
  document.fonts.ready.then(() => {
    const split = SplitText.create('.hero__title', { type: 'lines', mask: 'lines' });
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .from('.hero__media img', { scale: 1.18, duration: 2.2, ease: 'power2.out' }, 0)
      .from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.09 }, 0.2)
      .from(['.hero__kicker', '.hero__sub', '.hero__actions', '.hero__hint'], { opacity: 0, y: 18, duration: 0.8, stagger: 0.08 }, 0.6);

    // Hakkımızda: kelimeler okundukça koyulaşır
    const lead = SplitText.create('.about__lead', { type: 'words' });
    gsap.fromTo(lead.words, { opacity: 0.16 }, {
      opacity: 1, stagger: 0.04, ease: 'none',
      scrollTrigger: { trigger: '.about__lead', start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  gsap.to('.hero__media img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.about__stamp svg', { rotate: 220, ease: 'none', scrollTrigger: { trigger: '#hakkimizda', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Tarihçe: yatay kayan, eski fotoğraflar renklenir
  mm.add('(min-width: 0px)', () => {
    const track = $('.timeline__track');
    const distance = () => track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingLeft);
    const move = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '#tarihce', pin: '.timeline__pin', start: 'top top',
        end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true,
      },
    });
    gsap.to('.tape__strip', {
      x: () => -distance() * 0.5, ease: 'none',
      scrollTrigger: { trigger: '#tarihce', start: 'top top', end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true },
    });
    $$('.era').forEach((era) => {
      gsap.fromTo($('.era__new', era), { opacity: 0 }, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: era, containerAnimation: move, start: 'left 85%', end: 'center 50%', scrub: true },
      });
      gsap.fromTo($('.era__year', era), { xPercent: 30 }, {
        xPercent: -10, ease: 'none',
        scrollTrigger: { trigger: era, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
      });
    });
  });

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

  // Deri etiket: rakamlar sayar
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = fmt(Math.round(obj.v)) + el.dataset.suffix),
    });
  });

  // Atölye: kareler içinde hafif paralaks
  $$('.work img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Markalar: scroll hızına göre akan şerit
  const run = $('.brands__run');
  const loop = gsap.to(run, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  ScrollTrigger.create({
    trigger: '.brands', start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => gsap.to(loop, { timeScale: 1 + Math.min(Math.abs(self.getVelocity()) / 300, 6), duration: 0.2, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: 1, duration: 1 }) }),
  });

  document.fonts.ready.then(() => requestAnimationFrame(buildSeams));
}

// --- İmza efekti: sayfa boyunca dikilen iplik ---------------------------------
// Her bölümün kendi SVG'si var; uçları birbirine denk geldiği için tek bir dikiş gibi görünür.

const SEAM_SECTIONS = ['#hero', '#hakkimizda', '#hizmetler', '#rakamlar', '#tasarla', '#atolye', '#yorumlar', '#iletisim', '#randevu'];
const NEEDLE = `
  <g class="needle"><g transform="scale(1.45)">
    <path d="M-58,-2.4 L-8,-1.3 L0,0 L-8,1.3 L-58,2.4 Q-63,0 -58,-2.4 Z" fill="url(#needle-steel)"/>
    <ellipse cx="-52" cy="0" rx="3.6" ry="0.9" fill="#1d1411"/>
  </g></g>`;
let seamTriggers = [];
let lastWidth = 0;

function seamPath(x0, y0, x1, y1, knot) {
  const h = y1 - y0;
  if (knot) return `M${x0},${y0} C${x0},${y0 + h * 0.9} ${x1 - (x1 - x0) * 0.8},${y1} ${x1},${y1}`;
  return `M${x0},${y0} C${x0},${y0 + h * 0.42} ${x1},${y1 - h * 0.42} ${x1},${y1}`;
}

function buildSeams() {
  if (innerWidth === lastWidth && seamTriggers.length) return;
  lastWidth = innerWidth;
  seamTriggers.forEach((t) => t.kill());
  seamTriggers = [];
  $$('.seam').forEach((s) => s.remove());

  const mobile = innerWidth < 700;
  const xs = mobile ? [0.94, 0.06, 0.95, 0.05, 0.94, 0.06, 0.95, 0.06, 0.5] : [0.9, 0.06, 0.94, 0.08, 0.93, 0.05, 0.92, 0.07, 0.5];
  let prevX = null;

  SEAM_SECTIONS.forEach((sel, i) => {
    const sec = $(sel);
    const w = sec.offsetWidth;
    const h = sec.offsetHeight;
    const first = i === 0;
    const last = i === SEAM_SECTIONS.length - 1;
    const x0 = first ? w * (mobile ? 0.82 : 0.72) : prevX;
    const y0 = first ? h * 0.2 : 0;
    const x1 = w * xs[i];
    const y1 = last ? $('.finale__actions').offsetTop + $('.finale__actions').offsetHeight + 44 : h;
    prevX = x1;
    const d = seamPath(x0, y0, x1, y1, last);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('seam');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <mask id="seam-m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">
          <path class="seam__reveal" d="${d}"/>
        </mask>
        <linearGradient id="needle-steel${i}" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0" stop-color="#f4f5f7"/><stop offset=".5" stop-color="#9aa0a8"/><stop offset="1" stop-color="#4c5057"/>
        </linearGradient>
      </defs>
      <path class="seam__guide" d="${d}"/>
      <g mask="url(#seam-m${i})">
        <path class="seam__holes" d="${d}"/>
        <path class="seam__thread" d="${d}"/>
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
