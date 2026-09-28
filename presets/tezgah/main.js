import '../../shared/base.css';
import './style.css';
import raw from '../../data/mikron.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { crankSVG, VIEWBOX } from './drawing.js';

// Tezgâh (klasik aile): WebGL yok. Kimlik: teknik resim paftası; aydınger kâğıdı, grafit, kırmızı kalem,
// eski torna yeşili. Künye bir antet (başlık bloğu) gibi durur; krank milinin resmi Hakkında'da bir kez çizilir.
gsap.registerPlugin(DrawSVGPlugin);

const d = boot({ ...raw, preset: 'tezgah' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const img = (p) => asset(p);
const pad = (n) => String(n).padStart(2, '0');
const narrow = matchMedia('(max-width: 699px)');

// --- Üst çubuk ------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye: antet ---------------------------------------------------------------------

$('#kunye').innerHTML = `
  <picture class="hero__photo">
    <source media="(max-width: 699px)" srcset="${img('/img/mikron/tezgah.jpg')}" width="999" height="1500" />
    <img src="${img('/img/mikron/torna.jpg')}" alt="Atölyede eski bir torna tezgâhı ve aynası" width="1800" height="1199" fetchpriority="high" />
  </picture>
  <div class="hero__sheet">
    <div class="sheet__frame" aria-hidden="true">
      <span class="zone zone--t">A</span><span class="zone zone--t zone--2">B</span><span class="zone zone--t zone--3">C</span>
      <span class="zone zone--l">1</span><span class="zone zone--l zone--2">2</span>
    </div>
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="state ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler: iş emri ------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="orders-t">Hizmetler</h2>
      <p class="sec-head__d">Süreler yaklaşıktır, parçaya göre değişebilir. Fiyat için arayın.</p>
    </div>
    <div class="order" role="table" aria-label="Hizmetler">
      <div class="order__row order__row--head" role="row">
        <span role="columnheader">No</span>
        <span role="columnheader">İş</span>
        <span role="columnheader">Süre</span>
        <span role="columnheader"><span class="sr-only">Bilgi al</span></span>
      </div>
      ${d.hizmetler.map((h, i) => `
        <div class="order__row" role="row">
          <span class="order__no" role="cell">${pad(i + 1)}</span>
          <span class="order__job" role="cell"><strong>${esc(h.baslik)}</strong><span>${esc(h.aciklama)}</span></span>
          <span class="order__time" role="cell"><em class="order__lbl">Süre</em>${esc(h.sure)}</span>
          <span class="order__ask" role="cell"><a href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${h.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener" aria-label="${esc(h.baslik)} için WhatsApp'tan bilgi alın">${icons.whatsapp}<span>Bilgi al</span></a></span>
        </div>`).join('')}
    </div>
  </div>`;

// --- Hakkında --------------------------------------------------------------------------------

const plates = [
  { src: '/img/mikron/atolye.jpg', alt: 'Tezgâh başında çalışan usta', ad: 'Tezgâh başında', w: 999, h: 1500 },
  { src: '/img/tezgah/eksantrik.jpg', alt: 'Taşlanmış eksantrik mili yakından', ad: 'Eksantrik mili', w: 1066, h: 1600 },
  { src: '/img/tezgah/freze-talas.jpg', alt: 'Frezede işlenen parçadan kopan talaş', ad: 'Freze', w: 1400, h: 1288 },
];
$('#hakkinda').innerHTML = `
  <div class="wrap intro__grid">
    <div>
      <h2 class="h2" id="intro-t">Hakkında</h2>
      <p class="lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <div>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Sık gelen motorlar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
      <dl class="stats">
        <div class="stat"><dd><span data-count="${yas}">${yas}</span> yıl</dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
        <div class="stat"><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd><dt>haftada açık</dt></div>
      </dl>
    </div>
  </div>
  <figure class="wrap drawing">
    <div class="drawing__sheet">
      <div class="sheet__frame" aria-hidden="true"><span class="zone zone--t">A</span><span class="zone zone--t zone--2">B</span><span class="zone zone--t zone--3">C</span></div>
      <div class="drawing__svg" data-drawing></div>
    </div>
    <figcaption>Krank mili, yan görünüş. Örnek çizimdir, ölçüler temsilîdir.</figcaption>
  </figure>
  <div class="wrap plates">
    ${plates.map((g, i) => `
      <figure class="plate plate--${i + 1}">
        <div class="plate__img"><img src="${img(g.src)}" alt="${esc(g.alt)}" width="${g.w}" height="${g.h}" loading="lazy" decoding="async" /></div>
        <figcaption><span class="balloon" aria-hidden="true">${i + 1}</span>${esc(g.ad)}</figcaption>
      </figure>`).join('')}
  </div>`;

const drawing = $('[data-drawing]');
drawing.innerHTML = crankSVG();
const crank = $('.crank', drawing);
const setViewBox = () => crank.setAttribute('viewBox', narrow.matches ? VIEWBOX.narrow : VIEWBOX.wide);
setViewBox();
narrow.addEventListener('change', setViewBox);

// --- Çalışma saatleri ve konum ---------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2" id="visit-t">Çalışma saatleri ve konum</h2>
      <p class="visit__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><span class="visit__map-hint">Harita</span></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="reviews-t">Örnek yorumlar</h2>
      <p class="sec-head__d">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </div>
    <ul class="reviews__list" data-lenis-prevent-touch>
      ${d.yorumlar.map((y) => `
        <li class="review">
          ${stars(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="review__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__inner">
    <h2 class="final__t" id="final-t">İletişim</h2>
    <p class="final__d">Fiyat ve teslim günü için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__actions">
      <a class="btn btn--paper btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line-light btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__inner">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve krank çizimi temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -----------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

if (!reducedMotion) {
  initSmoothScroll();

  // Açılış (bir kez, ~1 sn): fotoğraf yerine oturur, antet satır satır dolar.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .fromTo('.hero__photo img', { scale: 1.08 }, { scale: 1, duration: 1.4, ease: 'power2.out' }, 0)
    .from('.hero__sheet', { autoAlpha: 0, y: 24, duration: 0.6, clearProps: 'all' }, 0.05)
    .from('.hero__sheet > :not(.sheet__frame)', { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06, clearProps: 'all' }, 0.2);

  // Bölüm başlıkları sakin yükselir.
  $$('.sec-head, .intro__grid > div:first-child, .visit__grid > div:first-child').forEach((el) => {
    gsap.from(el.children, {
      y: 22, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 84%', toggleActions: 'play none none none' },
    });
  });

  // İş emri: satır çizgileri soldan çekilir.
  $$('.order__row:not(.order__row--head)').forEach((row) => {
    gsap.fromTo(row, { '--rule': 0, autoAlpha: 0, y: 12 }, {
      '--rule': 1, autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: row, start: 'top 92%', toggleActions: 'play none none none' },
    });
  });

  // Rakamlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => (el.textContent = Math.round(o.v)),
    });
  });

  // Krank resmi ekrana girince bir kez çizilir: hatlar, eksenler, ölçüler, yazılar.
  const q = (s) => $$(s, crank);
  gsap.set(q('.ol, .dim'), { drawSVG: '0%' });
  gsap.set(q('.ol'), { fillOpacity: 0 });
  gsap.set(q('.cl'), { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set(q('.arr, .dt, .sym'), { opacity: 0 });
  gsap.timeline({ defaults: { ease: 'power1.inOut' }, scrollTrigger: { trigger: '.drawing', start: 'top 75%', toggleActions: 'play none none none' } })
    .to(q('.crank__parts .ol'), { drawSVG: '100%', duration: 1, stagger: 0.02 }, 0)
    .to(q('.cl'), { scaleX: 1, duration: 0.5, stagger: 0.04 }, 0.3)
    .to(q('.ol'), { fillOpacity: 1, duration: 0.4 }, 0.9)
    .to(q('.dim'), { drawSVG: '100%', duration: 0.6, stagger: 0.03 }, 1)
    .to(q('.arr, .sym, .dt'), { opacity: 1, duration: 0.3, stagger: 0.02 }, 1.4);

  // Fotoğraf eki: perde açılır, balon numarası düşer.
  $$('.plate').forEach((p) => {
    const tr = { trigger: p, start: 'top 88%', toggleActions: 'play none none none' };
    gsap.fromTo($('.plate__img', p), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'power3.inOut', scrollTrigger: tr });
    gsap.from($('.balloon', p), { scale: 0, duration: 0.4, delay: 0.5, ease: 'back.out(2.5)', scrollTrigger: { ...tr } });
  });

  gsap.from('.review', {
    y: 26, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__list', start: 'top 86%', toggleActions: 'play none none none' },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
