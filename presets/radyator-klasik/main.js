// Petek (klasik aile, radyatör ve soğutma): alüminyum grisi zemin, petrol koyusu, antifriz yeşili; kaçak için mercan.
// Alumni Sans + Libre Franklin + Sono. WebGL yok. Künyede hararet göstergesi fotoğrafının üstünde petek kanatları
// gibi dikey şeritler durur; açılışta kanatlar bir kez döner. Başka hareket az: hizmet numaraları, sayaçlar.
import base from '../../data/sektor-radyator.json';
import extra from '../../data/radyator-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

const d = boot({ ...base, ...extra });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('no-motion');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const img = (p) => asset(p);
const mark = `<span class="top__mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
// Adın son sözcüğü antifriz yeşili
const adParca = (() => {
  const w = String(d.isletme.ad).trim().split(/\s+/);
  if (w.length < 2) return `<span>${esc(w[0])}</span>`;
  return `<span>${esc(w.slice(0, -1).join(' '))}</span> <span class="is-green">${esc(w.at(-1))}</span>`;
})();

// --- Üst çubuk ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <img class="hero__photo" src="${img('/img/radyator-klasik/hararet-gostergesi.jpg')}" alt="Gösterge panelinde hararet ve yakıt göstergesi" fetchpriority="high" />
  <div class="hero__fins" aria-hidden="true">${Array.from({ length: 16 }, () => '<i></i>').join('')}</div>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__copy">
    <h1 class="hero__name" id="hero-title" aria-label="${ad}">${adParca}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--green" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--glass" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--glass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ---------------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap hizmet__in">
    <div class="hizmet__side">
      <h2 class="h2" id="hizmet-h">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
      <figure class="hizmet__img"><img src="${img('/img/radyator-klasik/radyator-parcalar.jpg')}" alt="Radyatör, tanklar ve fan çizimi" loading="lazy" decoding="async" /></figure>
    </div>
    <ol class="hizmet__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc">
          <span class="svc__n mono">${String(i + 1).padStart(2, '0')}</span>
          <div class="svc__body">
            <h3 class="svc__t">${esc(h.baslik)}</h3>
            <p class="svc__d">${esc(h.aciklama)}</p>
          </div>
          ${h.sure ? `<p class="svc__s mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>` : ''}
        </li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında ------------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <figure class="about__photo"><img src="${img('/img/radyator-klasik/tir-radyator.jpg')}" alt="Kamyonun ön tarafında radyatör üzerinde çalışan usta" loading="lazy" decoding="async" /></figure>
  <div class="about__copy">
    <h2 class="h2" id="about-h">Hakkında</h2>
    <p class="lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="stats">
      <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b data-count="${yas}">${yas}</b> yıl</dd></div>
      <div class="stat"><dt>haftada açık</dt><dd><b data-count="${acikGun}">${acikGun}</b> gün</dd></div>
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap konum__in">
    <div class="konum__info">
      <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
      <p class="konum__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr${s === 'Kapalı' ? ' class="off"' : ''}><th scope="row">${esc(g)}</th><td class="mono">${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="konum__addr">${esc(d.iletisim.adres)}</p>
      <div class="konum__btns">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="konum__map" data-map><span class="mono">Harita</span></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------------

const yildiz = (n) => `<p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(n)}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        ${yildiz(y.puan)}
        <blockquote class="rev__t">${esc(y.metin)}</blockquote>
        <p class="rev__who"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__bg" src="${img('/img/radyator-klasik/klasik-petek.jpg')}" alt="" loading="lazy" decoding="async" />
  <div class="final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--green btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D radyatör çizimi temsilîdir. Yorumlar örnektir.</p>
  </div>`;

const mapBox = $('[data-map]');
new IntersectionObserver((e, io) => {
  if (!e.some((x) => x.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Üst çubuk ve hareket ------------------------------------------------------------------------------

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

  // Açılış (~1,2 sn): kanatlar soldan sağa dalga gibi döner, künye satır satır gelir.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__photo', { autoAlpha: 0, scale: 1.05, duration: 1 }, 0)
    .from('.hero__fins i', { scaleX: 5, autoAlpha: 0, duration: 0.7, stagger: 0.03, ease: 'power2.out' }, 0.1)
    .from('.hero__copy > *', { autoAlpha: 0, y: 18, duration: 0.55, stagger: 0.06, clearProps: 'all' }, 0.2);

  gsap.from('.svc', {
    y: 20, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out',
    scrollTrigger: { trigger: '.hizmet__list', start: 'top 85%', toggleActions: 'play none none none' },
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count) || 0;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });
  gsap.fromTo('.about__photo img', { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.final__bg', { scale: 1.1 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
