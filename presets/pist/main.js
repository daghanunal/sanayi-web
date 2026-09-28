import raw from '../../data/pist.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { createWheel } from './wheel.js';

// Pist (klasik aile): gece asfaltı, pit şeridi çizgileri, tek vurgu volt yeşili. WebGL yok.
// Hareket az: künyede teker bir kez yuvarlanarak gelir ve kaydırdıkça döner; hizmet satırları
// üzerine gelince volt şeridiyle dolar; saatler bölümündeki start ışıkları dükkânın açık/kapalı
// durumunu gösterir.
const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const img = (n) => asset(`/img/pist/${n}`);

// --- Üst çubuk ----------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status status--top ${st.open ? 'is-open' : ''}"><span class="status__l">${esc(st.metin)}</span><span class="status__s">${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ----------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__copy">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--volt" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="hero__ground" aria-hidden="true"><i class="hero__lane"></i><i class="hero__road"></i></div>
  <div class="hero__wheel" data-wheel aria-hidden="true"></div>`;

// --- Hizmetler ------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="services__head">
      <h2 id="services-h" class="h2">Hizmetler</h2>
      <p class="services__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <ul class="services__list">
      ${d.hizmetler.map((h) => `
        <li class="svc">
          <h3 class="svc__name">${esc(h.baslik)}</h3>
          <p class="svc__desc">${esc(h.aciklama)}</p>
          <p class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Hakkında -------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__text">
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="board">
        <div class="board__cell"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span><small>yıl</small></dd></div>
        <div class="board__cell"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span><small>gün</small></dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Satılan lastik markaları</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <figure class="about__photo">
    <img src="${img('g-degisim.webp')}" alt="Lifte kaldırılmış aracın lastiği değiştiriliyor" width="1400" height="933" loading="lazy" decoding="async" />
  </figure>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <h2 id="visit-h" class="h2">Çalışma saatleri ve konum</h2>
      <div class="lights ${st.open ? 'is-open' : ''}" data-lights aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="status status--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--volt" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="reviews__head">
      <h2 id="reviews-h" class="h2">Örnek yorumlar</h2>
      <p class="reviews__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </div>
    <ul class="reviews__list">
      ${d.yorumlar.map((y) => `
        <li class="review">
          ${stars(y.puan)}
          <blockquote class="review__text">${esc(y.metin)}</blockquote>
          <p class="review__who"><b>${esc(y.ad)}</b> <span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim -------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <figure class="final__media">
    <img src="${img('r-wheel-beauty.webp')}" alt="" width="1600" height="1200" loading="lazy" decoding="async" />
  </figure>
  <div class="wrap final__copy">
    <h2 id="final-h" class="final__title">İletişim</h2>
    <p class="final__text">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Lastik ebadı yanağın fotoğrafından da okunur.</p>
    <div class="final__cta">
      <a class="btn btn--volt btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D teker görseli temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Teker ---------------------------------------------------------------------------------

// Yanak yazısı işletmenin adı ve kuruluş yılı (canvas; metin DOM'da değil).
const sidewall = `${d.isletme.ad}  ◆  Şaşmaz  ◆  ${d.isletme.kurulus}`.toLocaleUpperCase('tr');
const wheel = createWheel($('[data-wheel]'), { sidewall, eager: true });

// Start ışıkları: beşi sırayla kırmızı yanar; dükkân açıksa hepsi yeşile döner.
const lights = $('[data-lights]');
function runLights() {
  const bulbs = $$('i', lights);
  if (reducedMotion) {
    bulbs.forEach((b) => b.classList.add('on'));
    lights.classList.add(st.open ? 'is-green' : 'is-red');
    return;
  }
  lights.classList.add('is-red');
  bulbs.forEach((b, i) => setTimeout(() => b.classList.add('on'), 200 + i * 260));
  if (st.open) setTimeout(() => lights.classList.replace('is-red', 'is-green'), 200 + 5 * 260 + 350);
}

// --- Hareket ---------------------------------------------------------------------------

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

if (reducedMotion) {
  root.classList.add('no-motion');
  wheel.set(-12);
  new IntersectionObserver((e, io) => e[0].isIntersecting && (runLights(), io.disconnect())).observe(lights);
} else {
  initSmoothScroll();

  // Açılış: teker sağdan pit şeridine yuvarlanarak gelir, künye satır satır belirir (bir kez, ~1,2 sn).
  const wheelEl = $('[data-wheel]');
  const roll = { x: 0, scroll: 0 };
  const radius = () => wheelEl.offsetWidth / 2;
  const draw = () => {
    const angle = (roll.x / radius()) * (180 / Math.PI) + roll.scroll;
    wheelEl.style.transform = `translate3d(${roll.x.toFixed(1)}px,0,0)`;
    wheel.set(angle, Math.min(1, Math.abs(roll.x) / (innerWidth * 0.5)) * 0.9);
  };
  gsap.fromTo(roll, { x: innerWidth * 0.6 }, { x: 0, duration: 1.3, ease: 'power3.out', delay: 0.1, onUpdate: draw });
  gsap.from('.hero__copy > *', { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  // Künyeden aşağı inerken teker yerinde döner (pin yok).
  ScrollTrigger.create({
    trigger: '#kunye', start: 'top top', end: 'bottom top',
    onUpdate: (s) => { roll.scroll = -s.progress * 220; draw(); },
  });

  // Hizmet satırları soldan kayarak gelir.
  ScrollTrigger.batch('.svc', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, { x: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, clearProps: 'all' }),
  });

  // Zaman ekranındaki rakamlar bir kez sayar.
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

  // Fotoğraf hafifçe kayar.
  gsap.fromTo('.about__photo img', { yPercent: -6 }, {
    yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  ScrollTrigger.create({ trigger: lights, start: 'top 85%', once: true, onEnter: runLights });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
