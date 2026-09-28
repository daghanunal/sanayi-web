import raw from '../../data/showroom.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

// Showroom: taze vernik. Akış künye → Hizmetler → Hakkında → Saatler ve konum → Örnek yorumlar → İletişim.
// Kimlik: piyano siyahı / kabin beyazı, sedef vurgu, kabin tavan ışıkları. Hareket: açılışta bir kez
// geçen ışık yansıması, hizmet listesinde değişen görsel, sürüklenebilir önce/sonra; pin yok.

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const fotoMesaj = `Merhaba ${d.isletme.ad}, aracımdaki hasarın fotoğraflarını gönderiyorum. Fiyat öğrenebilir miyim?`;
const ext = 'target="_blank" rel="noopener"';

// --- Üst bar --------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#hero">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}"><span class="dot" data-status-dot></span><span>${tel}</span></a>`;

// --- Künye ----------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <h1 class="hero__title" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="status" data-status data-kunye><span data-long></span></dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__actions">
    <a class="btn btn--pearl" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--ghost" href="${waHref(d)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--ghost" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// --- Hizmetler: liste + değişen görsel, altında sürüklenebilir önce/sonra ----------------

const pairs = d.oncesiSonrasi || [];
$('#hizmetler').innerHTML = `
  <div class="services__head">
    <h2 id="services-title">Hizmetler</h2>
    <p>Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <div class="services__body">
    <div class="services__visual" aria-hidden="true">
      <div class="services__frame">${d.hizmetler.map((h, i) => (h.gorsel ? `<img src="${esc(h.gorsel)}" alt="" data-i="${i}" loading="lazy" decoding="async" />` : '')).join('')}</div>
    </div>
    <ul class="services__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc" data-i="${i}">
          ${h.gorsel ? `<div class="svc__thumb"><img src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" /></div>` : ''}
          <h3 class="svc__title">${esc(h.baslik)}</h3>
          <div class="svc__meta">
            <p class="svc__desc">${esc(h.aciklama)}</p>
            ${h.sure ? `<span class="svc__time">Süre: ${esc(h.sure)}</span>` : ''}
          </div>
        </li>`).join('')}
    </ul>
  </div>
  ${pairs.length ? `
  <div class="compare">
    <div class="compare__head">
      <h3 class="compare__title">Pastadan önce ve sonra</h3>
      <p>Çizgiyi sağa sola kaydırarak karşılaştırın. Görseller temsilîdir.</p>
      ${pairs.length > 1 ? `<div class="compare__tabs" role="group" aria-label="Örnek">${pairs.map((p, i) => `<button class="compare__tab" type="button" aria-pressed="false" data-i="${i}">${esc(p.baslik)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="compare__box" data-compare>
      <img class="compare__img compare__img--after" alt="" loading="lazy" decoding="async" />
      <img class="compare__img compare__img--before" alt="" loading="lazy" decoding="async" />
      <span class="compare__tag compare__tag--before">Önce</span>
      <span class="compare__tag compare__tag--after">Sonra</span>
      <div class="compare__handle" aria-hidden="true"><span></span></div>
      <label class="sr-only" for="compare-range">Önce ve sonra arasındaki çizginin konumu</label>
      <input class="compare__range" id="compare-range" type="range" min="0" max="100" value="50" />
    </div>
  </div>` : ''}`;

function setService(i) {
  $$('.svc').forEach((el) => el.classList.toggle('is-active', Number(el.dataset.i) === i));
  const imgs = $$('.services__frame img');
  const target = imgs.find((im) => Number(im.dataset.i) === i);
  if (target) imgs.forEach((im) => im.classList.toggle('is-active', im === target));
}
setService(0);

const box = $('[data-compare]');
const range = $('#compare-range');
function showPair(i) {
  const p = pairs[i];
  const before = $('.compare__img--before', box);
  const after = $('.compare__img--after', box);
  before.src = p.once; before.alt = `${p.baslik}, işlemden önce`;
  after.src = p.sonra; after.alt = `${p.baslik}, işlemden sonra`;
  $$('.compare__tab').forEach((t, j) => t.setAttribute('aria-pressed', String(i === j)));
}
if (box) {
  $$('.compare__tab').forEach((t) => t.addEventListener('click', () => showPair(Number(t.dataset.i))));
  showPair(0);
  range.addEventListener('input', () => box.style.setProperty('--c', `${range.value}%`));
}

// --- Hakkında ----------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="booth-lights" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="about__inner">
    <h2 id="about-title">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="stats">
      <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span> yıl</dd></div>
      <div class="stat"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd></div>
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum --------------------------------------------------------------

const bugunGrup = (() => {
  const g = new Date().getDay();
  const gun = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][g];
  const sira = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  return (label) => {
    const [a, b] = label.split('–');
    if (!b) return a === gun;
    return sira.indexOf(gun) >= sira.indexOf(a) && sira.indexOf(gun) <= sira.indexOf(b);
  };
})();
$('#saatler').innerHTML = `
  <div class="visit__info">
    <h2 id="visit-title">Çalışma saatleri ve konum</h2>
    <p class="status status--light" data-status><span data-long></span></p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunGrup(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${s}</td></tr>`).join('')}</tbody>
    </table>
    <address class="visit__address">${icons.pin}<span>${esc(d.iletisim.adres)}</span></address>
    <div class="visit__actions">
      <a class="btn btn--ink" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="visit__map" data-map>
    <button class="visit__map-load" type="button" data-map-load>Haritayı göster</button>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => icons.star.replace('<svg', `<svg class="${i < n ? '' : 'off'}"`)).join('');
$('#yorumlar').innerHTML = `
  <div class="reviews__head">
    <h2 id="reviews-title">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__list">
    ${d.yorumlar.map((y) => `
      <li class="review">
        <div class="review__stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</div>
        <blockquote>${esc(y.metin)}</blockquote>
        <p class="review__who"><b>${esc(y.ad)}</b><span>${esc(y.arac || '')}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ----------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="booth-lights booth-lights--dark" aria-hidden="true"><i></i><i></i><i></i></div>
  <h2 class="cta__title" id="cta-title">İletişim</h2>
  <p class="cta__lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Hasarın fotoğrafı WhatsApp'tan gönderilebilir.</p>
  <div class="cta__actions">
    <a class="btn btn--pearl btn--lg" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--ghost btn--lg" href="${waHref(d, fotoMesaj)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="cta__note">${esc(d.iletisim.adres)}<br><span data-status><span data-long></span></span></p>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__note">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir, kırmızı kaput görseli 3D çizimdir. Yorumlar örnektir.</p>`;

// --- Harita (yaklaşınca yüklenir) -------------------------------------------------------------
{
  const map = $('[data-map]');
  const load = () => {
    if (map.querySelector('iframe')) return;
    map.insertAdjacentHTML('beforeend', `<iframe src="${mapsEmbed(d)}" title="${ad} konumu" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`);
    $('[data-map-load]', map)?.remove();
  };
  $('[data-map-load]', map).addEventListener('click', load);
  new IntersectionObserver((entries, io) => {
    if (entries.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
  }, { rootMargin: '400px' }).observe(map);
}

// --- Açık / kapalı --------------------------------------------------------------------------
function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
  $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// =============================================================================================
// Hareket
// =============================================================================================
const lenis = initSmoothScroll();
autoHideHeader($('.top'), { offset: 240 });

if (reducedMotion) {
  $$('.svc').forEach((el) => el.classList.add('is-active'));
} else {
  document.fonts.ready.then(runMotion);
}

function runMotion() {
  // Açılış: başlık satırları yükselir, kabin ışığı gövdenin ve başlığın üstünden bir kez geçer (~1,5 sn).
  const split = SplitText.create('.hero__title', { type: 'lines', linesClass: 'line', mask: 'lines' });
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero__img', { scale: 1.12, filter: 'brightness(.35)', duration: 1.6 }, 0)
    .from(split.lines, { yPercent: 115, duration: 0.9, stagger: 0.08 }, 0.1)
    // x: 0 şart: GSAP CSS'teki translateX(-70%)'i piksel x olarak okuyup xPercent'e ekliyordu
    .fromTo('.hero__sweep', { x: 0, xPercent: -60 }, { x: 0, xPercent: 60, duration: 1.3, ease: 'power2.inOut' }, 0.3)
    .to(split.lines, { backgroundPosition: '0% 0', duration: 1.3, ease: 'power2.inOut', stagger: 0.06 }, 0.3)
    .from(['.hero__what', '.kunye'], { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06 }, 0.3)
    // Butonlar yalnız opaklıkla ve erken gelir: açılış sürerken de dokunulabilir
    .from('.hero__actions', { y: 12, opacity: 0, duration: 0.5 }, 0.1);

  gsap.to('.hero__img', {
    yPercent: 10, scale: 1.06, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Hizmetler: ekranın ortasındaki satır genişler, soldaki görsel değişir
  $$('.svc').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 60%', end: 'bottom 60%',
      onToggle: (self) => self.isActive && setService(Number(el.dataset.i)),
    });
  });

  // Önce/sonra: bir kez sürüklenebilir olduğunu gösterir
  if (box) {
    const c = { v: 50 };
    const apply = () => { box.style.setProperty('--c', `${c.v}%`); range.value = c.v; };
    gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 70%', toggleActions: 'play none none none' } })
      .to(c, { v: 25, duration: 0.7, ease: 'power2.inOut', onUpdate: apply })
      .to(c, { v: 75, duration: 0.9, ease: 'power2.inOut', onUpdate: apply })
      .to(c, { v: 50, duration: 0.7, ease: 'power2.inOut', onUpdate: apply });
  }

  // Kabin ışıkları floresan gibi titreyerek yanar
  $$('.booth-lights').forEach((group) => {
    const tubes = $$('i', group);
    gsap.set(tubes, { autoAlpha: 0.08 });
    ScrollTrigger.create({
      trigger: group, start: 'top 85%', toggleActions: 'play none none none',
      onEnter: () => tubes.forEach((t, i) => {
        gsap.timeline({ delay: i * 0.15 })
          .to(t, { autoAlpha: 1, duration: 0.04 })
          .to(t, { autoAlpha: 0.15, duration: 0.05 })
          .to(t, { autoAlpha: 0.9, duration: 0.03, delay: 0.08 })
          .to(t, { autoAlpha: 1, duration: 0.2 });
      }),
    });
  });

  // Rakamlar sayarak gelir
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.fromTo(o, { v: 0 }, {
      v: end, duration: 1.2, ease: 'power3.out', immediateRender: false,
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });

  // Bölüm başlıkları
  $$('main h2').forEach((h) => {
    gsap.from(h, { y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

export { lenis };
