import raw from '../../data/showroom.json';
import extra from '../../data/boya-klasik2.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';

// Katman (klasik aile). Kimlik: astar grisi zemin, grafit, tek boya rengi; teknik föy havası.
// Açılışta dört kat (sac → astar → renk → vernik) bir kez alttan üste boyanır (~1,5 sn, kaydırmaya bağlı değil).
// Akış: künye → Hizmetler → Hakkında (föy) → Saatler ve konum → Örnek yorumlar → İletişim.

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, ...extra });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const ext = 'target="_blank" rel="noopener"';
const fotoMesaj = `Merhaba ${d.isletme.ad}, aracımdaki hasarın fotoğraflarını gönderiyorum. Fiyat öğrenebilir miyim?`;
const mark = '<span class="top__mark" aria-hidden="true"><i></i><i></i><i></i></span>';

// --- Üst bar ------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#hero" class="top__brand">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

// --- Künye --------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <h1 class="kat__title" id="hero-title">${ad}</h1>
  <p class="kat__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt class="mono">Bugün</dt><dd class="status" data-status data-kunye><span data-long></span></dd></div>
    <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="kat__actions">
    <a class="btn btn--paint" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--line" href="${waHref(d)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--line" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// --- Hizmetler -------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="sec-head">
    <h2 id="hiz-title">Hizmetler</h2>
    <p class="sec-head__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="hiz__list">
    ${d.hizmetler.map((h, i) => `
      <li class="hz" style="--c:var(--k${i % 4})">
        <span class="hz__no mono" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <div class="hz__body">
          <h3 class="hz__title">${esc(h.baslik)}</h3>
          <p class="hz__desc">${esc(h.aciklama)}</p>
          ${h.sure ? `<span class="hz__time mono">Süre: ${esc(h.sure)}</span>` : ''}
        </div>
        ${h.gorsel ? `<div class="hz__thumb"><img src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" /></div>` : ''}
      </li>`).join('')}
  </ol>`;

// --- Hakkında: ölçüm föyü görünümünde ----------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="foy__sheet">
    <div class="foy__ruler" aria-hidden="true"></div>
    <h2 class="foy__title" id="foy-title">Hakkında</h2>
    <p class="foy__about">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="foy__facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="foy__stats">
      <div class="st"><dt class="st__label">Şaşmaz Oto Sanayi Sitesi'nde</dt><dd class="st__val mono"><b data-count="${yas}">${yas}</b><span> yıl</span></dd></div>
      <div class="st"><dt class="st__label">haftada açık</dt><dd class="st__val mono"><b data-count="${acikGun}">${acikGun}</b><span> gün</span></dd></div>
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------------

const bugun = GUNLER[new Date().getDay()];
const SIRA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const bugunMu = (label) => {
  const [a, b] = label.split('–');
  if (!b) return a === bugun;
  const i = SIRA.indexOf(bugun);
  return i >= SIRA.indexOf(a) && i <= SIRA.indexOf(b);
};
$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 id="konum-title">Çalışma saatleri ve konum</h2>
    <p class="status" data-status><span data-long></span></p>
    <table class="saat">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td class="mono">${s}</td></tr>`).join('')}</tbody>
    </table>
    <address class="konum__adres">${icons.pin}<span>${esc(d.iletisim.adres)}</span></address>
    <div class="konum__actions">
      <a class="btn btn--ink" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--ghost-ink" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><span class="mono">Harita</span></div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="sec-head">
    <h2 id="yorum-title">Örnek yorumlar</h2>
    <p class="sec-head__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rv">
        <div class="rv__stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</div>
        <blockquote class="rv__text">${esc(y.metin)}</blockquote>
        <p class="rv__who"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac ?? '')}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim --------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="son__strata" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <h2 class="son__title" id="son-title">İletişim</h2>
  <p class="son__note">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Hasarın fotoğrafı WhatsApp'tan gönderilebilir.</p>
  <div class="son__actions">
    <a class="btn btn--paint btn--lg" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--line btn--lg" href="${waHref(d, fotoMesaj)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="son__adres">${esc(d.iletisim.adres)}<br><span data-status><span data-long></span></span></p>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__note mono">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.</p>`;

// Harita yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Açık / kapalı -------------------------------------------------------------------------
function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Hareket -------------------------------------------------------------------------------

initSmoothScroll();
const topEl = $('[data-top]');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Başlık, künye bittikten sonra zemin alır (metin şeffaf başlığın altından geçmesin)
ScrollTrigger.create({
  trigger: '#hizmetler', start: 'top bottom',
  onEnter: () => topEl.classList.add('is-solid'),
  onLeaveBack: () => topEl.classList.remove('is-solid'),
});

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
} else {
  const layers = $$('.kat .layer').slice(1);
  const legend = $$('.kat__legend li');
  gsap.set(layers, { yPercent: 100 });
  gsap.set(layers.map((l) => l.querySelector('.layer__in')), { yPercent: -100 });
  legend[0]?.classList.add('is-on');

  // Açılış: künye gelir, katlar arka arkaya alttan üste boyanır, en sonda vernik parlar.
  const intro = gsap.timeline({ delay: 0.15 });
  intro.from('.kat__panel > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0);
  layers.forEach((layer, j) => {
    const t = 0.2 + j * 0.38;
    intro.to([layer, layer.querySelector('.layer__in')], { yPercent: 0, duration: 0.5, ease: 'power2.inOut' }, t)
      .call(() => legend[j + 1]?.classList.add('is-on'), null, t + 0.25)
      .to(layer.querySelector('.layer__edge'), { autoAlpha: 0, duration: 0.15 }, t + 0.45);
  });
  intro.fromTo('.gloss', { xPercent: -120 }, { xPercent: 120, duration: 0.9, ease: 'power1.inOut' }, 0.2 + layers.length * 0.38);

  gsap.utils.toArray('.sec-head, .konum__info').forEach((el) =>
    gsap.from(el.children, { y: 24, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 84%', toggleActions: 'play none none none' } })
  );

  // Hizmetler: renk şeridi soldan boyanır
  gsap.utils.toArray('.hz').forEach((el) => {
    gsap.fromTo(el, { '--p': 0 }, { '--p': 1, duration: 0.9, ease: 'power2.inOut', scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none none' } });
  });

  // Föy: kâğıt yerine oturur, sayılar sayılır
  gsap.from('.foy__sheet', { y: 40, rotate: -1, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.foy', start: 'top 80%', toggleActions: 'play none none none' } });
  $$('[data-count]').forEach((el) => {
    const hedef = Number(el.dataset.count);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', toggleActions: 'play none none none',
      onEnter: () => gsap.fromTo(o, { v: 0 }, { v: hedef, duration: 1.2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });

  gsap.from('.rv', { y: 26, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 86%', toggleActions: 'play none none none' } });
  gsap.from('.son__strata i', { scaleX: 0, duration: 0.9, stagger: 0.12, ease: 'power3.inOut', scrollTrigger: { trigger: '.son', start: 'top 82%', toggleActions: 'play none none none' } });
}

addEventListener('load', () => ScrollTrigger.refresh());
