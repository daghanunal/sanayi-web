import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Garaj (klasik aile): WebGL yok. Kimlik: yağlı atölye karanlığı, kızgın metal sarısı, Big Shoulders.
// Hareket az: künye bir kez gelir, hizmet satırlarının üst çizgisi kor gibi yanar, fotoğraf pencere gibi açılır.
const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('no-motion');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const img = (p) => asset(p);

// --- Üst çubuk ------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status status--top ${st.open ? 'is-open' : ''}"><span class="status__l">${esc(st.metin)}</span><span class="status__s">${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <figure class="hero__photo">
    <img src="${img('/img/garaj/lift.jpg')}" alt="Loş atölyede lifte kaldırılmış aracın altında çalışan usta" width="933" height="1400" fetchpriority="high" />
  </figure>
  <div class="hero__glow" aria-hidden="true"></div>
  <div class="hero__copy">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--molten" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ----------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap services__grid">
    <div class="services__side">
      <h2 id="services-h" class="h2">Hizmetler</h2>
      <p class="services__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
      <figure class="services__photo">
        <img src="${img('/img/garaj/kapak-montaj.jpg')}" alt="Eldivenli usta silindir kapağındaki supap mekanizması üzerinde çalışıyor" width="866" height="1300" loading="lazy" decoding="async" />
      </figure>
    </div>
    <ul class="services__list">
      ${d.hizmetler.map((h) => `
        <li class="svc">
          <h3 class="svc__t">${esc(h.baslik)}</h3>
          <p class="svc__d">${esc(h.aciklama)}</p>
          <p class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Hakkında ------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__text">
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <dl class="wrap stats">
    <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span> yıl</dd></div>
    <div class="stat"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd></div>
  </dl>
  <figure class="reveal">
    <img class="reveal__img" src="${img('/img/garaj/revizyon.jpg')}" alt="Revizyon için sökülmüş motor, sehpada" width="1400" height="787" loading="lazy" decoding="async" />
  </figure>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <h2 id="visit-h" class="h2">Çalışma saatleri ve konum</h2>
      <p class="status status--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--molten" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__head">
    <h2 id="reviews-h" class="h2">Örnek yorumlar</h2>
    <p class="reviews__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__row" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        ${stars(y.puan)}
        <blockquote class="rev__q">${esc(y.metin)}</blockquote>
        <p class="rev__who"><b>${esc(y.ad)}</b> <span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ----------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap">
    <h2 id="cta-h" class="cta__h">İletişim</h2>
    <p class="cta__p">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="cta__actions">
      <a class="btn btn--molten btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="cta__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket ----------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Üst çubuk künyeden sonra koyulaşır.
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

if (!reducedMotion) {
  initSmoothScroll();

  // Açılış: fotoğraf karanlıktan belirir, künye satır satır gelir (bir kez, ~1 sn, kaydırmayı kilitlemez).
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__photo img', { autoAlpha: 0, scale: 1.06, duration: 1.2 }, 0)
    .from('.hero__copy > *', { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0.1);

  // Hizmet satırlarının üst çizgisi ekrana girince kor gibi soldan yanar.
  ScrollTrigger.batch('.svc', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('is-lit'), i * 90)),
  });

  // Rakamlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });

  // Fotoğraf pencere açılır gibi büyür.
  gsap.fromTo('.reveal',
    { clipPath: 'inset(14% 18% 14% 18% round 18px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.reveal', start: 'top 90%', end: 'top 25%', scrub: true } });
  gsap.fromTo('.reveal__img', { scale: 1.2 }, {
    scale: 1, ease: 'none', scrollTrigger: { trigger: '.reveal', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
} else {
  $$('.svc').forEach((e) => e.classList.add('is-lit'));
}
