// Mühür (klasik aile, oto ekspertiz): soğuk rapor kâğıdı + koyu grafit, mühür moru tek vurgu. WebGL yok.
// Künye bir ekspertiz raporunun başlığı gibi: liftteki aracın fotoğrafı üstünde kâğıt form, daktilo alanlar,
// köşede işletmenin mor mührü. Açılışta kâğıt bir kez yukarı kayar, mühür basılır (~1 sn); gerisi düz site.
import sektor from '../../data/sektor-ekspertiz.json';
import extra from '../../data/ekspertiz-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, asset, gsap, ScrollTrigger, GUNLER,
} from '../../shared/core.js';

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
// Sektör görselleri ağır; aynı karelerin küçültülmüş kopyaları bu presetin klasöründe.
const img = (p) => String(p).replace('img/sektor-ekspertiz/', 'img/ekspertiz-klasik/');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const st = gunDurumu(d.saatler);
const wa = waHref(d, `Merhaba ${d.isletme.ad}, bir araç için ekspertiz randevusu almak istiyorum.`);
const pad2 = (n) => String(n).padStart(2, '0');

// --- Üst çubuk --------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand" aria-label="${ad}, sayfa başı"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#yorumlar">Yorumlar</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------
// Mühür yazısı: statik büyük harf yerine toLocaleUpperCase('tr') (i → İ doğru çıkar).
const muhurYazi = esc(`${d.isletme.ad} · Şaşmaz Oto Sanayi Sitesi · `.toLocaleUpperCase('tr'));

$('#kunye').innerHTML = `
  <picture class="hero__photo">
    <source media="(min-width: 900px)" srcset="${asset('/img/ekspertiz-klasik/lift-suv.jpg')}" width="1600" height="1066" />
    <img src="${asset('/img/ekspertiz-klasik/alttan-m.jpg')}" alt="Lifte kaldırılmış aracın altını el feneriyle kontrol eden usta" width="820" height="1230" fetchpriority="high" decoding="async" />
  </picture>
  <div class="hero__wrap">
    <article class="sheet">
      <p class="sheet__label tw">Oto ekspertiz · ${esc(yilEki(d.isletme.kurulus))} beri</p>
      <h1 class="sheet__name" id="hero-title">${ad}</h1>
      <p class="sheet__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt class="tw">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt class="tw">Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
        <div><dt class="tw">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="sheet__cta">
        <a class="btn btn--mor" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${wa}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
      <svg class="stamp" viewBox="0 0 120 120" aria-hidden="true">
        <defs><path id="stamp-c" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0" /></defs>
        <circle cx="60" cy="60" r="56" /><circle cx="60" cy="60" r="34" />
        <text class="stamp__ring"><textPath href="#stamp-c" textLength="280">${muhurYazi}</textPath></text>
        <text class="stamp__year" x="60" y="67" text-anchor="middle">${d.isletme.kurulus}</text>
      </svg>
    </article>
  </div>`;

// --- Hizmetler --------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="h2" id="svc-h">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </header>
    <div class="svc__grid">
      <div class="svc__viewer" aria-hidden="true">
        ${d.hizmetler.map((h, i) => `<img src="${esc(asset(img(h.gorsel)))}" alt="" width="1600" height="1066" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}" data-v="${i}" />`).join('')}
        <p class="svc__cap tw" data-cap>Madde 01 / ${pad2(d.hizmetler.length)}</p>
      </div>
      <ol class="svc__list">
        ${d.hizmetler.map((h, i) => `
          <li class="item" data-s="${i}">
            <p class="item__no tw">Madde ${pad2(i + 1)}</p>
            <h3 class="item__name">${esc(h.baslik)}</h3>
            <p class="item__desc">${esc(h.aciklama)}</p>
            <p class="item__time tw"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
          </li>`).join('')}
      </ol>
    </div>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__copy">
      <h2 class="h2" id="about-h">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div><dt>haftada açık</dt><dd><b>${acikGunSayisi(d.saatler)}</b> gün</dd></div>
      </dl>
    </div>
    <figure class="about__photo">
      <img src="${asset('/img/ekspertiz-klasik/sasi-alt.jpg')}" alt="El feneriyle aracın alt şasisini inceleyen usta" width="1600" height="1066" loading="lazy" decoding="async" />
    </figure>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="tw">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="tw">Ekspertizi yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------

const bugun = new Date().getDay();
const bugunMu = (g) => {
  if (g === GUNLER[bugun]) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  return a <= b ? bugun >= a && bugun <= b : bugun >= a || bugun <= b;
};
$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <h2 class="h2" id="visit-h">Çalışma saatleri ve konum</h2>
      <p class="visit__status durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td class="tw${s === 'Kapalı' ? ' off' : ''}">${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__btns">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><a class="tw" href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${Number(n)}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap yorum__head">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        <p class="rev__car tw">${esc(y.arac)}</p>
        <blockquote class="rev__text">${esc(y.metin)}</blockquote>
        <p class="rev__who"><b>${esc(y.ad)}</b>${stars(y.puan)}</p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__bg" src="${asset('/img/ekspertiz-klasik/anahtar.jpg')}" alt="" width="1600" height="1066" loading="lazy" decoding="async" />
  <div class="wrap final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__p">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--mor btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${wa}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hizmet fotoğrafı (masaüstü): okunan madde fotoğrafı değiştirir ----------------------

const small = matchMedia('(max-width: 899px)');
const viewImgs = $$('[data-v]');
const cap = $('[data-cap]');
function showSvc(i) {
  viewImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
  $$('.item').forEach((it, k) => it.classList.toggle('is-active', k === i));
  cap.textContent = `Madde ${pad2(i + 1)} / ${pad2(d.hizmetler.length)}`;
}
if (!small.matches) {
  $$('.item').forEach((it, i) => {
    ScrollTrigger.create({ trigger: it, start: 'top 60%', end: 'bottom 60%', onToggle: (s) => s.isActive && showSvc(i) });
  });
  showSvc(0);
}

// --- Üst çubuk ------------------------------------------------------------------------

const top = $('#top');
let unhide = null;
const syncHeader = () => {
  if (small.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!small.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${top.offsetHeight}px`); }
};
syncHeader();
small.addEventListener('change', syncHeader);
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Hareket ----------------------------------------------------------------------------

if (reducedMotion) {
  root.classList.add('no-motion');
} else {
  initSmoothScroll();
  // Açılış (~1 sn, kaydırmayı kilitlemez): fotoğraf netleşir, kâğıt yukarı kayar, mühür basılır.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__photo img', { scale: 1.08, duration: 1.2 }, 0)
    .from('.sheet', { y: 40, autoAlpha: 0, duration: 0.7, clearProps: 'transform,opacity,visibility' }, 0.05)
    .from('.sheet > :not(.stamp)', { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.05, clearProps: 'all' }, 0.2)
    .fromTo('.stamp', { scale: 1.9, rotate: 6, autoAlpha: 0 }, { scale: 1, rotate: -12, autoAlpha: 1, duration: 0.3, ease: 'power4.in' }, 0.75);

  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  $$('.h2').forEach((h) => rise(h, h));
  $$('.item').forEach((it) => rise(it, it, { y: 22, duration: 0.6 }));
  rise('.stats > div', '.stats', { stagger: 0.1 });
  rise('.rev', '.yorum__list', { stagger: 0.07, y: 18 });
  gsap.fromTo('.about__photo img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.final__bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
