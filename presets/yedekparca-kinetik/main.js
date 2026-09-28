import '../../shared/base.css';
import './style.css';
import raw from '../../data/depo.json';
import extra from '../../data/yedekparca-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc,
} from '../../shared/core.js';

// Kinetik aile: WebGL yok. İki renkli afiş baskısı: lacivert mürekkep, floresan pembe.
// Dev satırlar yalnız olgudur: işletmenin adı, hizmetlerin kısa adları, "Açık / Kapalı", "İletişim".
// Hareketin tamamı transform, opacity ve sınıf değişimi.
const d = boot({ ...raw, ...extra, preset: 'yedekparca-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

const up = (s) => String(s).toLocaleUpperCase('tr-TR');
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const urunler = d.urunler ?? [];
const wa = (m) => waHref(d, m ?? `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`);

// Afiş satırı: genişliğe oturan dev yazı; harfler ayrı ayrı çarpsın diye bölünür.
const line = (t, cls = '', vh = 0) =>
  `<span class="ln ${cls}"><span class="ln__in" data-fit${vh ? ` data-maxvh="${vh}"` : ''}>${[...up(t)].map((c) => `<span class="c">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</span></span>`;
const pairs = (a) => a.reduce((o, x, i) => (i % 2 ? (o[o.length - 1] += ' ' + x) : o.push(x), o), []);
const kelimeler = d.isletme.ad.split(/\s+/);

// --- Üst bar ---------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#hero">${esc(up(d.isletme.ad))}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -------------------------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__in">
    <p class="hero__meta mono"><span>Şaşmaz Oto Sanayi Sitesi</span><span>${esc(yilEki(d.isletme.kurulus))} beri</span></p>
    <h1 class="hero__title" id="hero-title" aria-label="${ad}">
      <span aria-hidden="true" class="only-m">${kelimeler.map((s, i) => line(s, i % 2 ? 'ln--pink' : '', 0.092)).join('')}</span>
      <span aria-hidden="true" class="only-d">${pairs(kelimeler).map((s, i) => line(s, i % 2 ? 'ln--pink' : '', 0.2)).join('')}</span>
    </h1>
    <figure class="hero__photo" aria-hidden="true"><img src="${asset('/img/yedekparca-kinetik/disk-p.jpg')}" alt="" width="1400" height="933" fetchpriority="high" /></figure>
    <div class="hero__foot">
      <div>
        <p class="hero__ne">${esc(d.isletme.tanim)}</p>
        <dl class="kunye">
          <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
          <div><dt class="mono">Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
          <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
        </dl>
      </div>
      <div class="hero__cta">
        <a class="btn btn--pink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;

// --- Hizmetler ------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <p class="mono">${d.hizmetler.length} hizmet</p>
      <h2 class="h2" id="hizmet-title">Hizmetler</h2>
      <p class="sec-head__p">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın.</p>
    </header>
  </div>
  <ol class="kat">
    ${d.hizmetler.map((h, i) => `
      <li class="kat__row">
        <div class="kat__word" aria-hidden="true"><span class="kat__w" data-fit data-max="210">${esc(up(d.kelimeler?.[i] || h.baslik.split(' ')[0]))}</span></div>
        <div class="wrap kat__body">
          <p class="mono kat__no">${String(i + 1).padStart(2, '0')} / ${String(d.hizmetler.length).padStart(2, '0')}</p>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
        </div>
      </li>`).join('')}
  </ol>
  ${urunler.length ? `
  <div class="wrap gruplar">
    <header class="gruplar__head">
      <h3 class="gruplar__title">Parça grupları</h3>
      <p class="sec-head__p">Binek ve hafif ticari araçlar için. Her grubun orijinali ve muadili bulunur.</p>
    </header>
    <ul class="gruplar__list">
      ${urunler.map((u, i) => `
        <li class="grup grup--${i % 3}">
          <h4>${esc(u.baslik)}</h4>
          <ul class="chips">${(u.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
        </li>`).join('')}
    </ul>
  </div>` : ''}`;

// --- Hakkında -------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap">
    <p class="mono">Hakkında</p>
    <h2 class="sr-only" id="about-title">Hakkında</h2>
    <p class="about__lead" data-words>${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler ?? []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Parça bulunan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <ul class="stats">
      <li class="stat"><p class="stat__n"><b data-count="${yas}">${yas}</b><span> yıl</span></p><p class="stat__l">Şaşmaz Oto Sanayi Sitesi'nde</p></li>
      <li class="stat"><p class="stat__n"><b data-count="${acikGun}">${acikGun}</b><span> gün</span></p><p class="stat__l">haftada açık</p></li>
    </ul>
  </div>
  <div class="afis__grid">
    ${(d.afisler ?? []).map((a, i) => `
      <figure class="poster poster--${i}">
        <div class="poster__img"><img src="${asset(a.src)}" alt="${esc(a.alt)}" width="1000" height="1250" loading="lazy" decoding="async" /></div>
        <figcaption>
          <span class="poster__w" data-fit data-k="0.9" data-max="190" aria-hidden="true">${esc(up(a.kelime))}</span>
          <span class="poster__n mono">${esc(a.not)}</span>
        </figcaption>
      </figure>`).join('')}
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap dukkan__grid">
    <div>
      <p class="mono">Saatler ve konum</p>
      <h2 class="sr-only" id="dukkan-title">Çalışma saatleri ve konum</h2>
      <p class="sign ${st.open ? 'is-open' : ''}"><span class="sign__w" aria-hidden="true">${st.open ? 'AÇIK' : 'KAPALI'}</span><span class="sign__t">${esc(st.metin)}</span></p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        ${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
      </table>
      <p class="dukkan__adres">${esc(d.iletisim.adres)}</p>
      <div class="dukkan__cta">
        <a class="btn btn--pink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line btn--light" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p class="mono">Harita</p></div>
  </div>`;

// --- Örnek yorumlar ------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <p class="mono">Yorumlar</p>
      <h2 class="h2" id="yorum-title">Örnek yorumlar</h2>
      <p class="sec-head__p">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
    <ul class="cards">
      ${d.yorumlar.map((y, i) => `
        <li class="card card--${i % 3}">
          ${stars(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="card__who"><b>${esc(y.ad)}</b> <span class="mono">${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ---------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <h2 class="final__title" id="final-title" aria-label="İletişim"><span aria-hidden="true">${line('İletişim', '', 0.2)}</span></h2>
    <p class="final__p">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın. Şasi numarası ya da ruhsatın fotoğrafı parçanın bulunması için yeterlidir.</p>
    <div class="final__cta">
      <a class="btn btn--ink btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--xl" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__adres mono">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${esc(up(d.isletme.ad))}</p>
    <p>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="mono foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// --- Harita: yaklaşınca yükle ---------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Yazıyı genişliğe oturt ---------------------------------------------------------------

function fitAll() {
  for (const el of $$('[data-fit]')) {
    const box = el.closest('.ln, .kat__word') ?? el.parentElement;
    el.style.fontSize = '100px';
    const w = el.scrollWidth;
    const bs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
    if (!w || !avail) continue;
    let fs = (avail / w) * 100 * 0.995 * (Number(el.dataset.k) || 1);
    const max = Number(el.dataset.max);
    if (max) fs = Math.min(fs, max);
    // Dikey tablette (600–899 px) dev satırlar biraz daha büyüyebilir; yoksa künyenin üstünde boşluk kalıyor.
    const mvh = Number(el.dataset.maxvh) * (innerWidth >= 600 && innerWidth < 900 ? 1.4 : 1);
    if (mvh) fs = Math.min(fs, innerHeight * mvh);
    el.style.fontSize = `${fs.toFixed(2)}px`;
  }
}
// Telefonda künye fotoğrafı: en kısa ad satırının sağındaki boşluğa pencere gibi oturur.
function placeHeroPhoto() {
  const ph = $('.hero__photo');
  if (innerWidth >= 900) { ph.removeAttribute('style'); return; }
  const box = $('.hero__in').getBoundingClientRect();
  let best = null;
  for (const ln of $$('#hero .only-m .ln')) {
    const r = ln.getBoundingClientRect();
    const w = ln.firstElementChild.getBoundingClientRect().width;
    const free = r.width - w;
    if (!best || free > best.free) best = { r, w, free };
  }
  if (!best || best.free < 90) { ph.style.display = 'none'; return; }
  const h = best.r.height * 0.78;
  Object.assign(ph.style, {
    display: '', left: `${best.r.left - box.left + best.w + 14}px`, top: `${best.r.top - box.top + (best.r.height - h) / 2}px`,
    width: `${best.free - 14}px`, height: `${h}px`,
  });
}
fitAll();
placeHeroPhoto();
let fitW = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - fitW) < 2) return;
  fitW = innerWidth;
  fitAll();
  placeHeroPhoto();
  ScrollTrigger.refresh();
});
document.fonts?.ready.then(() => { fitAll(); placeHeroPhoto(); ScrollTrigger.refresh(); });

// --- Hareket ----------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

function countUp(el, dur = 1.2) {
  const to = Number(el.dataset.count);
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: dur, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
}
const bir = (trigger, start = 'top 80%') => ({ trigger, start, toggleActions: 'play none none none' });

if (reducedMotion) {
  root.classList.add('is-in');
} else {
  initSmoothScroll();

  // Açılış: ad satırları harf harf aşağıdan çarpar, fotoğraf açılır, künye gelir (~1 sn, bir kez).
  const heroLines = $$(innerWidth < 900 ? '#hero .only-m .ln' : '#hero .only-d .ln');
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: () => root.classList.add('is-in') });
  heroLines.forEach((ln, i) => {
    intro.fromTo($$('.c', ln), { yPercent: 115 }, { yPercent: 0, duration: 0.7, stagger: 0.024 }, 0.05 + i * 0.09);
  });
  intro
    .fromTo('.hero__photo', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'expo.out' }, 0.35)
    .fromTo('.hero__meta span', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.4 }, 0.1)
    .fromTo('.hero__foot > *', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.55, clearProps: 'all' }, 0.4);

  // Hizmetler: kısa ad sağdan kayarak yerine oturur, eğimi düzelir.
  $$('.kat__row').forEach((r) => {
    gsap.fromTo($('.kat__w', r), { xPercent: 30, skewX: -12 }, {
      xPercent: 0, skewX: 0, ease: 'power2.out',
      scrollTrigger: { trigger: r, start: 'top bottom', end: 'top 50%', scrub: 0.4 },
    });
  });
  $$('.grup').forEach((g, i) => {
    gsap.fromTo(g, { y: 30, rotate: i % 2 ? 2 : -2, autoAlpha: 0 }, { y: 0, rotate: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(g, 'top 90%') });
  });

  // Hakkında: kelimeler okundukça koyulaşır; sayılar bir kez sayar.
  const lead = $('[data-words]');
  lead.innerHTML = lead.textContent.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ');
  gsap.fromTo(lead.children, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: lead, start: 'top 80%', end: 'bottom 55%', scrub: true },
  });
  ScrollTrigger.create({ ...bir('.stats', 'top 85%'), onEnter: () => $$('.stats [data-count]').forEach((el, i) => countUp(el, 1.1 + i * 0.15)) });

  $$('.poster').forEach((p, i) => {
    const s = { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo($('img', p), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: s });
    gsap.fromTo($('.poster__w', p), { xPercent: i % 2 ? -6 : 6 }, { xPercent: i % 2 ? 2 : -2, ease: 'none', scrollTrigger: s });
  });

  $$('.card').forEach((c, i) => {
    gsap.fromTo(c, { xPercent: i % 2 ? 12 : -12, rotate: i % 2 ? 3 : -3, autoAlpha: 0 }, {
      xPercent: 0, rotate: 0, autoAlpha: 1, ease: 'power3.out', duration: 0.7, scrollTrigger: bir(c, 'top 90%'),
    });
  });

  $$('.sec-head').forEach((h) => ScrollTrigger.create({
    trigger: h, start: 'top 80%', onEnter: () => h.classList.add('is-on'), onLeaveBack: () => h.classList.remove('is-on'),
  }));

  gsap.fromTo('.final__title .c', { yPercent: 115 }, {
    yPercent: 0, stagger: 0.03, ease: 'power4.out', duration: 0.7, scrollTrigger: bir('#iletisim', 'top 70%'),
  });

  addEventListener('load', () => { fitAll(); placeHeroPhoto(); ScrollTrigger.refresh(); });
}
