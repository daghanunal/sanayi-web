import usta from '../../data/usta.json';
import ek from '../../data/doseme-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot({ ...usta, ...ek, preset: 'doseme-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = buYil - kurulus;
const no = (i) => String(i + 1).padStart(2, '0');

// Türkçe ayrılma eki: 1987'den, 1990'dan, 2004'ten
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : (n % 100) ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}
const beri = `${ablative(kurulus)} beri`;

const btnCall = (cls = '') => `<a class="btn btn--ink ${cls}" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>`;
const btnWa = (cls = '', msg) => `<a class="btn btn--line ${cls}" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>`;

// --- Header ------------------------------------------------------------------
$('[data-ad]').textContent = d.isletme.ad;
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
const durum = openStatus(d.saatler);
const statusEl = $('[data-status]');
statusEl.textContent = durum.open ? 'Şu an açık' : 'Şu an kapalı';
statusEl.classList.toggle('is-open', durum.open);

// --- Hero: yakından uzağa --------------------------------------------------------
const heroImg = asset('/img/doseme-klasik2/hero.jpg');
const adKelime = d.isletme.ad.split(/\s+/);
$('#hero').innerHTML = `
  <div class="hero__stage">
    <div class="hero__cam">
      <div class="hero__photo">
        <img src="${heroImg}" alt="Yeniden döşenmiş, dikey pilili bej deri koltuk, atölye zemininde" fetchpriority="high" width="2000" height="2500">
        <span class="hero__fade" aria-hidden="true"></span>
        ${d.etiketler.map((t, i) => `
          <div class="tag tag--${t.yon === 'sag' ? 'sag' : 'sol'}" style="--x:${Number(t.x)}%;--y:${Number(t.y)}%">
            <i class="tag__dot"></i><span class="tag__line"></span>
            <span class="tag__txt"><em>${no(i)}</em><b>${esc(t.baslik)}</b><span>${esc(t.metin)}</span></span>
          </div>`).join('')}
      </div>
    </div>

    <div class="hero__lens" aria-hidden="true">
      <svg viewBox="0 0 300 300">
        <defs><path id="lens-c" d="M150,150 m-118,0 a118,118 0 1,1 236,0 a118,118 0 1,1 -236,0"/></defs>
        <circle cx="150" cy="150" r="136" class="lens__ring"/>
        <circle cx="150" cy="150" r="100" class="lens__ring lens__ring--thin"/>
        <path d="M150 0v28M150 272v28M0 150h28M272 150h28" class="lens__tick"/>
        <g class="lens__spin"><text><textPath href="#lens-c" textLength="735">YAKINDAN BAKIN · MİLİM MİLİM · YAKINDAN BAKIN · MİLİM MİLİM ·</textPath></text></g>
      </svg>
    </div>

    <div class="hero__intro">
      <p class="hero__mono">Şaşmaz · ${esc(beri)}</p>
      <p class="hero__name" aria-hidden="true">${adKelime.map((w) => `<span class="ln"><span>${esc(w)}</span></span>`).join('')}</p>
    </div>

    <div class="hero__copy">
      <p class="hero__kicker"><i></i>${esc(d.isletme.sektor)} · Şaşmaz'da ${esc(beri)}</p>
      <h1 class="hero__title">${esc(d.isletme.slogan)}</h1>
      <p class="hero__sub">Koltuk, tavan, direksiyon, kapı döşemesi. Kalıbını biz çıkarır, dikişini biz atarız.</p>
      <div class="hero__actions">${btnCall()}${btnWa('hide-sm')}</div>
    </div>

    <p class="hero__zoom" aria-hidden="true"><span>Büyütme</span><b data-zoom>×3,0</b></p>
    <p class="hero__hint" aria-hidden="true"><i></i>Kaydırın, uzaklaşalım</p>
  </div>`;

// Uzun dükkân adları da ekrana sığsın: en uzun kelimeye göre punto küçülür.
const nameEl = $('.hero__name');
const fitName = () => {
  nameEl.style.fontSize = '';
  const box = nameEl.clientWidth;
  const widest = Math.max(...$$('.ln > span', nameEl).map((s) => s.scrollWidth));
  if (widest > box) nameEl.style.fontSize = `${parseFloat(getComputedStyle(nameEl).fontSize) * (box / widest) * 0.97}px`;
};
$$('.ln > span', nameEl).forEach((s) => (s.style.width = 'max-content'));
document.fonts.ready.then(fitName);
window.addEventListener('resize', fitName);

// --- Hakkımızda ----------------------------------------------------------------
$('#hakkimizda').innerHTML = `
  <div class="wrap about__grid">
    <p class="label"><em>01</em> Dükkân</p>
    <p class="about__lead">${esc(d.isletme.hakkinda)}</p>
    <div class="about__meta">
      <div class="about__year"><span>Kuruluş</span><strong>${kurulus}</strong></div>
      <p class="about__warranty"><i aria-hidden="true"></i>${esc(d.garanti)}</p>
    </div>
  </div>`;

// --- Hizmetler: askılı numune etiketleri ---------------------------------------------
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="head">
      <p class="label"><em>02</em> İşler</p>
      <h2>Aracın içinde elimizin değmediği yer kalmıyor.</h2>
      <p class="head__sub">Fiyatı işe başlamadan söyleriz. Süreler tek araç içindir.</p>
    </header>
  </div>
  <div class="rail" tabindex="0" aria-label="Hizmetler, yana kaydırın">
    <ul class="rail__list">
      ${d.hizmetler.map((h, i) => `
        <li class="swatch">
          <span class="swatch__hole" aria-hidden="true"></span>
          <div class="swatch__img"><img src="${h.gorsel}" alt="" loading="lazy"></div>
          <div class="swatch__body">
            <p class="swatch__no">No.${no(i)}</p>
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
            <span class="swatch__time">${esc(h.sure)}</span>
          </div>
        </li>`).join('')}
    </ul>
  </div>
  <p class="rail__hint wrap" aria-hidden="true">Yana kaydırın →</p>`;

// --- Rakamlar ------------------------------------------------------------------------
const stats = [{ deger: yas, sonek: ' yıl', etiket: 'aynı tezgâhta' }, ...d.istatistikler];
$('#rakamlar').innerHTML = `
  <div class="stats__bg" aria-hidden="true"><img src="${asset('/img/doseme-klasik2/alcantara.jpg')}" alt="" loading="lazy"></div>
  <div class="wrap">
    <p class="label label--light"><em>03</em> Rakamlarla</p>
    <ul class="stats__list">
      ${stats.map((s) => `
        <li><strong data-count="${Number(s.deger)}" data-suffix="${esc(s.sonek || '')}">${nf.format(s.deger)}${esc(s.sonek || '')}</strong><span>${esc(s.etiket)}</span></li>`).join('')}
    </ul>
  </div>`;

// --- Süreç: üst üste binen kartlar ------------------------------------------------------
$('#surec').innerHTML = `
  <div class="wrap">
    <header class="head">
      <p class="label"><em>04</em> Tezgâh</p>
      <h2>Bir koltuk tezgâhımızdan böyle geçer.</h2>
    </header>
    <ol class="steps__list">
      ${d.surec.map((s, i) => `
        <li class="step" style="--i:${i}">
          <div class="step__img"><img src="${s.gorsel}" alt="" loading="lazy"></div>
          <div class="step__body">
            <p class="step__no">${no(i)}<span>/ ${no(d.surec.length - 1)}</span></p>
            <h3>${esc(s.baslik)}</h3>
            <p>${esc(s.aciklama)}</p>
          </div>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Tarihçe ---------------------------------------------------------------------------
const tarihce = d.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus);
$('#tarihce').innerHTML = `
  <div class="wrap">
    <header class="head">
      <p class="label"><em>05</em> Yıllar</p>
      <h2>Babadan oğula ${yas} yıl.</h2>
    </header>
  </div>
  <div class="rail" tabindex="0" aria-label="Tarihçe, yana kaydırın">
    <ol class="rail__list years__list">
      ${tarihce.map((t) => `
        <li class="yr">
          <p class="yr__y">${t.yil ?? buYil}</p>
          <div class="yr__img"><img src="${t.gorsel}" alt="" loading="lazy"></div>
          <h3>${esc(t.baslik)}</h3>
          <p>${esc(t.metin)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Galeri ---------------------------------------------------------------------------
const galeri = [...d.galeri, ...(d.galeriEk || [])];
$('#atolye').innerHTML = `
  <div class="wrap">
    <header class="head">
      <p class="label"><em>06</em> Atölyeden</p>
      <h2>Yakından bakın. Dikişe, kenara, köşeye.</h2>
    </header>
    <div class="gallery__grid">
      ${galeri.map((g, i) => `
        <figure class="shot">
          <div class="shot__img"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></div>
          <figcaption><em>${no(i)}</em>${esc(g.alt)}</figcaption>
        </figure>`).join('')}
    </div>
  </div>
  <div class="brands" aria-label="Çalıştığımız markalar">
    <div class="brands__run">${[...d.markalar, ...d.markalar].map((m, i) => `<span${i >= d.markalar.length ? ' aria-hidden="true"' : ''}>${esc(m)}</span>`).join('')}</div>
  </div>`;

// --- Yorumlar -----------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__grid">
    <div class="reviews__score">
      <p class="label"><em>07</em> Yorumlar</p>
      <strong>${d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 })}</strong>
      <span class="stars" aria-label="5 üzerinden ${d.puan.ortalama}">${stars(5)}</span>
      <p>Google'da ${nf.format(d.puan.adet)} yorum</p>
    </div>
    <div class="rail rail--flat" tabindex="0" aria-label="Müşteri yorumları">
      <ul class="rail__list reviews__list">
        ${d.yorumlar.map((y) => `
          <li class="review">
            <span class="stars" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</span>
            <blockquote>${esc(y.metin)}</blockquote>
            <p class="review__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
          </li>`).join('')}
      </ul>
    </div>
  </div>`;

// --- Ulaşım -------------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <p class="label"><em>08</em> Ulaşım</p>
      <h2>Koltuğu sökmeden gelin, biz sökeriz.</h2>
      <p class="status ${durum.open ? 'is-open' : ''}"><i></i>${esc(durum.text)}</p>
      <dl class="hours">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
      <address>${esc(d.iletisim.adres)}</address>
      <div class="visit__actions">
        <a class="btn btn--orange" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      </div>
    </div>
    <div class="visit__map" data-src="${esc(mapsEmbed(d))}"><span>Harita yükleniyor</span></div>
  </div>`;

// --- Final -------------------------------------------------------------------------
$('#randevu').innerHTML = `
  <div class="wrap">
    <p class="finale__mono">Şaşmaz Oto Sanayi · ${esc(beri)}</p>
    <h2 class="finale__title">Koltuğun fotoğrafını atın.<br>Fiyatı işe başlamadan söyleyelim.</h2>
    <div class="finale__actions">
      ${btnCall('btn--big')}
      <a class="btn btn--paper btn--big" href="${waHref(d, `Merhaba ${d.isletme.ad}, koltuklarımın fotoğrafını gönderiyorum. Fiyat alabilir miyim?`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Fotoğraf gönder</span></a>
    </div>
  </div>`;

$('.foot').innerHTML = `
  <div class="wrap foot__grid">
    <p class="foot__name">${esc(d.isletme.ad)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="foot__copy">© ${buYil} ${esc(d.isletme.ad)} · ${esc(beri)} Şaşmaz'da</p>
  </div>`;

// --- Harita: yaklaşınca yükle ------------------------------------------------------
const mapBox = $('.visit__map');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe src="${mapBox.dataset.src}" title="Konum haritası" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapBox);

// --- Header durumu --------------------------------------------------------------
const top = $('#top');
const syncTop = () => top.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
window.addEventListener('scroll', syncTop, { passive: true });
syncTop();

// --- Hareket --------------------------------------------------------------------
const zoomEl = $('[data-zoom]');
const setZoom = (s) => { zoomEl.textContent = `×${s.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`; };

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  setZoom(1);
} else {
  initSmoothScroll();
  const mobile = () => window.innerWidth < 900;
  const photo = $('.hero__photo');
  const FX = 0.66, FY = 0.2;

  // Başlangıç: pililerin üstüne yakın plan. Görüntü ekranı her zaman kaplasın.
  const start = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const L = photo.offsetLeft, T = photo.offsetTop, W = photo.offsetWidth, H = photo.offsetHeight;
    const S = Math.max(vw / W, vh / H) * (mobile() ? 1.9 : 1.45);
    let x = vw / 2 - L - S * FX * W;
    let y = vh / 2 - T - S * FY * H;
    x = Math.min(-L, Math.max(vw - L - W * S, x));
    y = Math.min(-T, Math.max(vh - T - H * S, y));
    return { x, y, S };
  };
  let s0 = start();
  const zoomState = { p: 0 };

  gsap.set('.hero__copy > *', { autoAlpha: 0, y: 26 });
  gsap.set('.tag', { autoAlpha: 0 });
  gsap.set('.tag__line', { scaleX: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#hero', start: 'top top', end: () => `+=${window.innerHeight * 1.7}`,
      pin: '.hero__stage', scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1,
      onRefreshInit: () => { s0 = start(); },
    },
  });
  tl.fromTo(photo,
    { x: () => s0.x, y: () => s0.y, scale: () => s0.S },
    { x: 0, y: 0, scale: 1, duration: 0.55, ease: 'power2.inOut' }, 0)
    .fromTo(zoomState, { p: 0 }, {
      p: 1, duration: 0.55, ease: 'power2.inOut',
      onUpdate: () => {
        const S = gsap.utils.interpolate(s0.S, 1, zoomState.p);
        setZoom(Math.round(S * 10) / 10);
      },
    }, 0)
    .to('.hero__intro', { autoAlpha: 0, y: -60, duration: 0.22 }, 0.02)
    .to('.hero__lens', { autoAlpha: 0, scale: 1.6, duration: 0.3 }, 0)
    .to('.hero__hint', { autoAlpha: 0, duration: 0.08 }, 0)
    .to('.hero__zoom', { autoAlpha: 0, y: -10, duration: 0.08 }, 0.5)
    .to('.hero__copy > *', { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.05 }, 0.42);
  $$('.tag').forEach((t, i) => {
    const at = 0.58 + i * 0.09;
    tl.to(t, { autoAlpha: 1, duration: 0.03 }, at)
      .fromTo(t.querySelector('.tag__dot'), { scale: 0 }, { scale: 1, duration: 0.05, ease: 'back.out(3)' }, at)
      .to(t.querySelector('.tag__line'), { scaleX: 1, duration: 0.06 }, at + 0.03)
      .fromTo(t.querySelector('.tag__txt'), { autoAlpha: 0, x: t.classList.contains('tag--sol') ? 10 : -10 }, { autoAlpha: 1, x: 0, duration: 0.06 }, at + 0.06);
  });
  tl.to({}, { duration: 0.08 });

  // Açılış: isim harf harf yükselir, kamera hafifçe oturur.
  gsap.from('.hero__name .ln > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.1 });
  gsap.from('.hero__mono, .hero__zoom, .hero__hint', { autoAlpha: 0, y: 12, duration: 0.8, delay: 0.5, stagger: 0.08 });
  gsap.from('.hero__cam', { scale: 1.12, duration: 1.8, ease: 'expo.out' });
  gsap.from('.hero__lens svg', { scale: 0.6, autoAlpha: 0, rotate: -40, duration: 1.4, ease: 'expo.out', delay: 0.15 });

  // Dükkân paragrafı: kelimeler okundukça koyulaşır
  const split = new SplitText('.about__lead', { type: 'words' });
  gsap.fromTo(split.words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.04, ease: 'none',
    scrollTrigger: { trigger: '.about__lead', start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
  gsap.from('.about__meta > *', {
    y: 40, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.about__meta', start: 'top 88%' },
  });

  // Başlıklar
  $$('.head h2, .finale__title, .visit__info h2').forEach((h) => {
    const s = new SplitText(h, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, {
      yPercent: 105, duration: 1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
  });

  // Numune etiketleri: askıdan sallanarak gelir
  ScrollTrigger.batch('.swatch', {
    start: 'top 92%', once: true,
    onEnter: (els) => gsap.fromTo(els, { rotate: -7, y: 50, autoAlpha: 0 }, {
      rotate: 0, y: 0, autoAlpha: 1, duration: 1.3, ease: 'elastic.out(1, 0.55)', stagger: 0.08,
    }),
  });

  // Sayaçlar
  $$('[data-count]').forEach((el) => {
    const v = Number(el.dataset.count), suf = el.dataset.suffix;
    const o = { n: 0 };
    gsap.to(o, {
      n: v, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => (el.textContent = nf.format(Math.round(o.n)) + suf),
    });
  });
  gsap.fromTo('.stats__bg img', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '#rakamlar', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Tezgâh kartları: sıradaki kart gelince öncekinin üstü kararır
  $$('.step').forEach((st, i, all) => {
    if (i === all.length - 1) return;
    gsap.to(st, {
      '--dim': 1, ease: 'none',
      scrollTrigger: { trigger: all[i + 1], start: 'top bottom', end: 'top 30%', scrub: true },
    });
  });

  // Galeri: kareler aşağıdan açılır
  ScrollTrigger.batch('.shot', {
    start: 'top 92%', once: true,
    onEnter: (els) => gsap.fromTo(els, { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'expo.out', stagger: 0.08,
      onComplete() { this.targets().forEach((e) => (e.style.clipPath = '')); },
    }),
  });

  ScrollTrigger.batch('.review, .yr', {
    start: 'top 94%', once: true,
    onEnter: (els) => gsap.from(els, { y: 40, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }),
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
