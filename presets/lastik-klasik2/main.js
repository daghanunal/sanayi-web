import pist from '../../data/pist.json';
import ek from '../../data/lastik-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Profil (klasik aile): soğuk kâğıt zemin, kobalt mavi, yuvarlak Rubik ve lastik yanağı kodu gibi Space Mono.
// İmza: kâğıda oyulmuş "Lastik / Jant" harflerinin içinden jant fotoğrafı görünür (yalnız süs).
// Hareket az: harflerin içindeki fotoğraf bir kez oturur, hizmet listesinde yandaki fotoğraf hizmete göre değişir.
const d = boot({ ...pist, ...ek, preset: 'lastik-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);

// --- Üst çubuk ---------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status status--top ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -------------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__cut" aria-hidden="true" style="--img:url('${asset('/img/lastik-klasik2/jant-hero.jpg')}')">
    <span>Lastik</span><span>Jant</span>
  </div>
  <div class="hero__copy">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--mavi" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler -----------------------------------------------------------------------------

const gorseller = (d.hizmetGorselleri || []).map(asset);
$('#hizmetler').innerHTML = `
  <div class="wrap svc__grid">
    <div class="svc__side">
      <h2 id="svc-h" class="h2">Hizmetler</h2>
      <p class="svc__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
      <figure class="svc__photo" aria-hidden="true">
        ${gorseller.map((src, i) => `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}" />`).join('')}
      </figure>
    </div>
    <ol class="svc__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc__item" data-i="${i}">
          <img class="svc__thumb" src="${esc(gorseller[i % gorseller.length] || '')}" alt="" loading="lazy" decoding="async" />
          <div class="svc__body">
            <h3 class="svc__name">${esc(h.baslik)}</h3>
            <p class="svc__desc">${esc(h.aciklama)}</p>
          </div>
          <p class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </li>`).join('')}
    </ol>
  </div>`;
const setSvc = (i) => {
  $$('.svc__photo img').forEach((im, j) => im.classList.toggle('is-on', j === i % gorseller.length));
  $$('.svc__item').forEach((li, j) => li.classList.toggle('is-active', j === i));
};
$$('.svc__item').forEach((li) => li.addEventListener('pointerenter', () => setSvc(Number(li.dataset.i))));

// --- Hakkında --------------------------------------------------------------------------------

const hg = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__text">
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Satılan lastik markaları</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <div class="about__side">
      ${hg ? `<figure class="about__photo"><img src="${esc(asset(hg.src))}" alt="${esc(hg.alt)}" width="${hg.w}" height="${hg.h}" loading="lazy" decoding="async" /></figure>` : ''}
      <dl class="stats">
        <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span> yıl</dd></div>
        <div class="stat"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd></div>
      </dl>
    </div>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <h2 id="visit-h" class="h2 h2--sm">Çalışma saatleri ve konum</h2>
      <p class="status status--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--mavi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ------------------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__head">
    <h2 id="reviews-h" class="h2">Örnek yorumlar</h2>
    <p class="reviews__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="review">
        ${stars(y.puan)}
        <blockquote class="review__text">${esc(y.metin)}</blockquote>
        <p class="review__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim --------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__ring" aria-hidden="true"></div>
  <div class="wrap final__inner">
    <h2 id="final-h" class="final__title">İletişim</h2>
    <p class="final__text">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Lastik ebadı yanağın fotoğrafından da okunur.</p>
    <div class="final__cta">
      <a class="btn btn--beyaz btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -------------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

if (reducedMotion) {
  root.classList.add('no-motion');
} else {
  initSmoothScroll();

  // Açılış: harfler aşağıdan yükselir, içlerindeki fotoğraf yerine oturur (bir kez, ~1,2 sn).
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__cut span', { yPercent: 40, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0)
    .fromTo('.hero__cut', { '--z': 1.25 }, { '--z': 1, duration: 1.6 }, 0)
    .from('.hero__copy > *', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0.1);

  // Hizmet listesi: ekranın ortasındaki hizmetin fotoğrafı yanda görünür.
  $$('.svc__item').forEach((row, i) => {
    ScrollTrigger.create({ trigger: row, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setSvc(i) });
  });
  ScrollTrigger.batch('.svc__item', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, { y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }),
  });

  // Rakamlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });

  // Fotoğraflar yuvarlak köşeli pencere gibi açılır.
  gsap.utils.toArray('.about__photo').forEach((f) => {
    gsap.fromTo(f, { clipPath: 'inset(10% 10% 10% 10% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: f, start: 'top 85%', once: true },
    });
  });

  gsap.fromTo('.final__ring', { rotation: -30 }, {
    rotation: 40, ease: 'none', scrollTrigger: { trigger: '#iletisim', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
