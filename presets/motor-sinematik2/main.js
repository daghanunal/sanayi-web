import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { createScene } from './engine.js';

// Saplama (sinematik aile): 3D yalnız açılışta. Krom saplama künyenin yanında havada döner, kaydırınca
// kapağa oturur, sahne söner ve çizim durur. Gerisi editoryal, sakin bir işletme sitesi.
const d = boot({ ...raw, preset: 'motor-sinematik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// --- Üst çubuk --------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title${d.isletme.ad.length > 16 ? ' is-long' : ''}" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler --------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="serv__head">
    <h2 id="serv-h" class="h2">Hizmetler</h2>
    <p class="serv__lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="serv__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc">
        <span class="svc__n" aria-hidden="true">${pad(i + 1)}</span>
        <div class="svc__b">
          <h3 class="svc__t">${esc(h.baslik)}</h3>
          <p class="svc__d">${esc(h.aciklama)}</p>
        </div>
        <span class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
      </li>`).join('')}
  </ol>`;

// --- Hakkında ----------------------------------------------------------------------

const foto = d.galeri?.find((g) => /eller/.test(g.src)) || d.galeri?.[0];
$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div class="about__text">
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    ${foto ? `<figure class="ph"><div class="ph__in"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" loading="lazy" decoding="async" /></div></figure>` : ''}
  </div>
  <dl class="stats">
    <div class="stat"><dd><span data-count="${yas}">${yas}</span> <small>yıl</small></dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
    <div class="stat"><dd><span data-count="${acikGun}">${acikGun}</span> <small>gün</small></dd><dt>haftada açık</dt></div>
  </dl>`;

// --- Çalışma saatleri ve konum --------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="loc__card">
    <h2 id="loc-h" class="h2 loc__h">Çalışma saatleri ve konum</h2>
    <p class="loc__now ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <dl class="hours">${saatListesi(d.saatler).map(([g, h]) => `<div class="hours__row"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('')}</dl>
    <p class="loc__addr">${esc(d.iletisim.adres)}</p>
    <div class="loc__actions">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="loc__map" data-map><p>Harita</p></div>`;

// --- Örnek yorumlar ----------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="rev__head">
    <h2 id="rev-h" class="h2">Örnek yorumlar</h2>
    <p class="rev__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="rev__track" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <figure class="q">
        <span class="q__mark" aria-hidden="true">“</span>
        <blockquote class="q__t">${esc(y.metin)}</blockquote>
        <figcaption class="q__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span>
          <span class="q__stars" role="img" aria-label="5 üzerinden ${y.puan}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < y.puan ? 'on' : ''}">${icons.star}</i>`).join('')}</span></figcaption>
      </figure>`).join('')}
  </div>`;

// --- İletişim --------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="finale__in">
    <h2 id="final-h" class="finale__h">İletişim</h2>
    <p class="finale__p">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="finale__actions">
      <a class="btn btn--bone btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad} · Pexels'ten alınan fotoğraf ve 3D görsel temsilîdir · Yorumlar örnektir</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '800px 0px' }).observe(mapBox);

// --- Üst çubuk davranışı ------------------------------------------------------------------

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

// --- Sahne: yalnız künyede ------------------------------------------------------------------

let scene = null;
try {
  scene = createScene($('.stage'), { reduced: reducedMotion });
} catch (e) {
  root.classList.add('no-webgl');
}
const canvas = $('.stage');
const S = scene?.state;

if (scene) {
  let fade = 0;
  scene.onBefore(() => {
    S.visible = 1 - fade;
    canvas.style.opacity = S.visible.toFixed(3);
  });
  if (reducedMotion) {
    S.intro = 0;
    new IntersectionObserver((e) => (fade = e[0].isIntersecting ? 0 : 1)).observe($('#kunye'));
  } else {
    // Açılış: saplama yaklaşır (~1,3 sn, kaydırmayı kilitlemez).
    gsap.to(S, { intro: 0, duration: 1.3, ease: 'expo.out', delay: 0.15 });
    // Künyeden çıkarken saplama kapağa oturur, sonra sahne söner (tam sönünce çizim durur).
    ScrollTrigger.create({
      trigger: '#kunye', start: 'top top', end: 'bottom 20%',
      onUpdate: (s) => (S.land = s.progress), onRefresh: (s) => (S.land = s.progress),
    });
    ScrollTrigger.create({
      trigger: '#hizmetler', start: 'top 75%', end: 'top 15%',
      onUpdate: (s) => (fade = s.progress), onRefresh: (s) => (fade = s.progress),
    });
  }
}

if (!reducedMotion) {
  initSmoothScroll();
  gsap.from('.hero__inner > *', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  $$('.svc').forEach((el) => {
    gsap.from(el, { autoAlpha: 0, y: 30, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });
  // Fotoğraf kırmızı perdeden açılır.
  $$('.ph__in').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}
