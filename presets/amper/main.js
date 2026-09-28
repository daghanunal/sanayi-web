import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc,
} from '../../shared/core.js';
import { segHTML, segSet } from './seg.js';

// Kinetik aile: WebGL yok. Kimlik: nokta matris tabela yazısı, ışıklı anahtarlar, 7 segment sayaç.
// Büyük yazılar yalnızca olgulardır: işletmenin adı, hizmet adları, "Açık / Kapalı".
const d = boot({ ...raw, preset: 'amper' });
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
const durumMetni = st.metin;

// Nokta matris başlık: her harf ayrı yanar. Kelimeler bölünmez.
function dots(text, cls = '') {
  const words = String(text).split(' ');
  let i = 0;
  const html = words
    .map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--d:${(((i++ * 37) % 23) / 23 * 0.45).toFixed(3)}s">${esc(c)}</span>`).join('')}</span>`)
    .join(' ');
  return `<span class="dots ${cls}" aria-label="${esc(text)}"><span aria-hidden="true">${html}</span></span>`;
}
const rocker = (cls = '') => `
  <span class="rocker ${cls}" aria-hidden="true">
    <span class="rocker__plate"><span class="rocker__key"><i class="rocker__pilot"></i></span></span>
  </span>`;

// --- Üst bar ---------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#hero">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Hero: künye ------------------------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__stage">
    <div class="tubes" aria-hidden="true"><i></i><i></i></div>
    <div class="hero__glow" aria-hidden="true"></div>
    <div class="hero__copy">
      <h1 class="hero__title" id="hero-title">${dots(d.isletme.ad)}</h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="lamp ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__cta">
        <a class="btn btn--amber" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
    <div class="hero__switch" aria-hidden="true">
      ${rocker('rocker--big')}
      <span class="dymo">${st.open ? 'Dükkân açık' : 'Dükkân kapalı'}</span>
    </div>
  </div>`;

// --- Hizmetler: anahtar paneli; her satırın adı nokta matris tabelada yanar ---------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="h2">${dots('Hizmetler')}</h2>
      <p>Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </header>
    <ul class="switches">
      ${d.hizmetler.map((h, i) => `
        <li class="sw">
          ${rocker()}
          <div class="sw__body">
            <h3 class="sw__title">${dots(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
          </div>
          <p class="sw__time"><span>Süre</span><b>${esc(h.sure)}</b></p>
          <span class="sw__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------

const sayaclar = [
  { deger: yas, birim: 'YIL', etiket: "Şaşmaz Oto Sanayi Sitesi'nde", aria: `${yas} yıldır Şaşmaz Oto Sanayi Sitesi'nde` },
  { deger: acikGun, birim: 'GÜN', etiket: 'haftada açık', aria: `Haftada ${acikGun} gün açık` },
];
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <h2 class="h2 about__title">${dots('Hakkında')}</h2>
    <div class="about__text">
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <figure class="about__photo">
      <img src="${asset('/img/amper/fener-usta.jpg')}" alt="Kaputun altında el feneriyle kablo kontrolü" width="1600" height="1066" loading="lazy" decoding="async" />
    </figure>
    <ul class="meters">
      ${sayaclar.map((s) => `
        <li class="meter">
          <div class="meter__lcd">${segHTML(2, { label: s.aria })}<span class="meter__unit">${s.birim}</span></div>
          <p>${esc(s.etiket)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap dukkan__grid">
    <div>
      <h2 class="h2 dukkan__title">Çalışma saatleri ve konum</h2>
      <div class="sign ${st.open ? 'is-open' : 'is-closed'}">
        <span class="sign__word">${dots(st.open ? 'Açık' : 'Kapalı')}</span>
        <p>${esc(st.saat)}</p>
      </div>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        ${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
      </table>
      <p class="dukkan__adres">${esc(d.iletisim.adres)}</p>
      <div class="dukkan__cta">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="wrap yorum__head">
    <h2 class="h2">${dots('Örnek yorumlar')}</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="yorum__track" data-lenis-prevent-touch>
    <ul class="yorum__list">
      ${d.yorumlar.map((y) => `
        <li class="card">
          <span class="leds5 leds5--${y.puan}" role="img" aria-label="5 üzerinden ${y.puan}">${'<i></i>'.repeat(5)}</span>
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="card__who">${esc(y.ad)}, <span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim --------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <h2 class="final__title">${dots('İletişim')}</h2>
    <p>Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__cta">
      <a class="btn btn--amber btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(durumMetni)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <div><p class="foot__brand">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// --- Harita: yaklaşınca yükle -------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Sayaçlar -------------------------------------------------------------------

const meterSvgs = $$('#hakkinda .seg');
meterSvgs.forEach((svg) => segSet(svg, '0'));
function countUp(svg, to, dur = 1.2) {
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: dur, ease: 'power2.out', onUpdate: () => segSet(svg, String(Math.round(o.v))) });
}

// --- Hareket ----------------------------------------------------------------------

// Telefonda tek üst öğe: aşağı kaydırırken başlık saklanır (telefon sözleşmesi).
const topEl = $('#top');
let unhide = null;
const phoneMq = matchMedia('(max-width: 899px)');
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

if (reducedMotion) {
  $$('.zone, .sw').forEach((z) => z.classList.add('is-on'));
  meterSvgs.forEach((svg, i) => segSet(svg, String(sayaclar[i].deger)));
} else {
  initSmoothScroll();
  // Açılış: ışık yanar, anahtar iner, tabela harf harf yanar (bir kez, ~1 sn, kaydırmayı kilitlemez).
  const hero = $('#hero');
  hero.classList.toggle('is-closed', !st.open);
  requestAnimationFrame(() => setTimeout(() => hero.classList.add('is-on'), 200));
  gsap.from('.hero__copy > :not(.hero__title)', { y: 16, autoAlpha: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', delay: 0.25, clearProps: 'all' });

  // Bölüm girince "ışığı yanar"; geri çıkınca söner.
  $$('.zone:not(.hero)').forEach((z) => {
    ScrollTrigger.create({
      trigger: z, start: 'top 72%',
      onEnter: () => z.classList.add('is-on'),
      onLeaveBack: () => z.classList.remove('is-on'),
    });
  });

  // Hizmet satırları: ekrana gelince anahtarı iner, adı tabelada yanar.
  $$('.sw').forEach((row) => {
    ScrollTrigger.create({
      trigger: row, start: 'top 80%',
      onEnter: () => row.classList.add('is-on'),
      onLeaveBack: () => row.classList.remove('is-on'),
    });
  });

  // Sayaçlar bir kez sayar.
  ScrollTrigger.create({
    trigger: '.meters', start: 'top 85%', once: true,
    onEnter: () => meterSvgs.forEach((svg, i) => countUp(svg, sayaclar[i].deger, 1 + i * 0.15)),
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
