// Desibel (klasik aile, egzoz): beton grisi, is karası, LED camgöbeği. Fotoğraf ağırlıklı, WebGL yok.
// Künye tam ekran fotoğrafın üstünde; hizmetler egzoz hattının parçalarına göre fotoğraflı satırlar.
import manifold from '../../data/manifold.json';
import extra from '../../data/egzoz-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, asset,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, GUNLER, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...manifold, ...extra, preset: 'egzoz-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const PARCA = { manifold: 'Manifold', katalitik: 'Katalitik konvertör', dpf: 'Dizel partikül filtresi', susturucu: 'Susturucu', uc: 'Egzoz ucu' };
document.documentElement.classList.toggle('is-open', st.open);
const markSVG = '<span class="top__mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';

// --- Üst bar ------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${markSVG}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <span class="top__status">${st.open ? 'Açık' : 'Kapalı'}</span>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------------

// Dekor: egzoz sesine benzeyen düzensiz ama her açılışta aynı çubuklar (ölçüm değil, rakam yok).
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cubuk = Array.from({ length: 56 }, (_, i) => {
  const env = 0.35 + 0.65 * Math.sin((i / 56) * Math.PI * 2.4 + 0.5) ** 2;
  return `<i style="--h:${Math.min(1, 0.18 + env * (0.4 + rnd() * 0.6)).toFixed(3)}"></i>`;
}).join('');

$('#kunye').innerHTML = `
  <picture class="hero__photo" aria-hidden="true">
    <source media="(max-width: 699px)" srcset="${asset('/img/egzoz-klasik2/hero-dik.jpg')}" width="733" height="1100" />
    <img src="${asset('/img/egzoz-klasik2/hero.jpg')}" alt="" width="2000" height="1333" fetchpriority="high" decoding="async" />
  </picture>
  <div class="hero__in">
    <h1 class="hero__name" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt class="mono">Bugün</dt><dd class="durum">${esc(st.kunye)}</dd></div>
      <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--sig" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="wave" aria-hidden="true">${cubuk}</div>`;

// --- Hizmetler --------------------------------------------------------------------------

// Her parçanın ilk hizmeti fotoğraflı satır olur; kalan işler altta numaralı liste.
const gorulen = new Set();
const buyuk = [], kucuk = [];
d.hizmetler.forEach((h) => {
  const g = d.parcaGorsel?.[h.parca];
  if (g && !gorulen.has(h.parca)) { gorulen.add(h.parca); buyuk.push({ h, g }); }
  else kucuk.push(h);
});
const no = (i) => String(i + 1).padStart(2, '0');

$('#hizmetler').innerHTML = `
  <div class="hat__head">
    <h2 class="h2 rv" id="hizmet-h">Hizmetler</h2>
    <p class="lead lead--d rv">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="hat__list">
    ${buyuk.map(({ h, g }, i) => `
      <li class="stop">
        <figure class="stop__photo"><img src="${esc(g.src)}" alt="${esc(g.alt)}" width="1400" height="930" loading="lazy" decoding="async" /></figure>
        <div class="stop__body">
          <p class="stop__no"><span>${no(i)}</span><em class="mono">${esc(PARCA[h.parca] || '')}</em></p>
          <h3 class="stop__title">${esc(h.baslik)}</h3>
          <p class="stop__text">${esc(h.aciklama)}</p>
          <p class="stop__svc mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </div>
      </li>`).join('')}
  </ol>
  ${kucuk.length ? `
  <ul class="svc__list">
    ${kucuk.map((h, i) => `
      <li class="svc rv">
        <span class="svc__no mono">${no(buyuk.length + i)}</span>
        <div class="svc__body">
          <h3 class="svc__name">${esc(h.baslik)}</h3>
          <p class="svc__desc">${esc(h.aciklama)}</p>
        </div>
        <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
      </li>`).join('')}
  </ul>` : ''}`;

// --- Hakkında ---------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <figure class="atolye__photo">
    <picture>
      <source media="(min-width: 900px)" srcset="${asset('/img/egzoz-klasik2/lift-3d.jpg')}" width="900" height="1200" />
      <img src="${asset('/img/egzoz-klasik2/lift-3d-genis.jpg')}" alt="Lifte kaldırılmış aracın altında susturucu ve egzoz ucu, temsilî 3D çizim" width="1400" height="875" loading="lazy" decoding="async" />
    </picture>
    <figcaption>Temsilî 3D çizim</figcaption>
  </figure>
  <div class="atolye__copy">
    <h2 class="h2 rv" id="atolye-h">Hakkında</h2>
    <p class="lead atolye__lead rv">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <ul class="band rv">
      <li class="stat"><p class="stat__val"><span data-count="${yas}">${yas}</span><small> yıl</small></p><p class="stat__lbl">Şaşmaz Oto Sanayi Sitesi'nde</p></li>
      <li class="stat"><p class="stat__val"><span data-count="${acikGun}">${acikGun}</span><small> gün</small></p><p class="stat__lbl">haftada açık</p></li>
    </ul>
    <dl class="facts rv">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------

const bugunAdi = GUNLER[new Date().getDay()];
const SIRA = [1, 2, 3, 4, 5, 6, 0].map((g) => GUNLER[g]);
const bugunMu = (gunler) => {
  const [a, b = a] = gunler.split('–');
  const t = SIRA.indexOf(bugunAdi);
  return t >= SIRA.indexOf(a) && t <= SIRA.indexOf(b);
};
$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2 rv" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="konum__status rv">${esc(st.metin)}</p>
    <dl class="hours rv">
      ${saatListesi(d.saatler).map(([g, s]) => `<div class="${bugunMu(g) ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd class="mono">${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="konum__addr rv">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns rv">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><span class="mono">Harita</span></div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="yorum__head">
    <h2 class="h2 rv" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead lead--d rv">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
        <p class="rev__text">${esc(y.metin)}</p>
        <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__bg" src="${asset('/img/manifold/duman.jpg')}" alt="" width="1600" height="1059" loading="lazy" decoding="async" />
  <div class="final__in">
    <h2 class="final__title rv" id="final-h">İletişim</h2>
    <p class="final__p rv">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns rv">
      <a class="btn btn--sig btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr mono">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D çizim temsilîdir. Yorumlar örnektir.</p>`;

// --- Harita: yaklaşınca yüklenir --------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Başlık ---------------------------------------------------------------------------------

const top = $('.top');
ScrollTrigger.create({ start: () => innerHeight * 0.6, end: 'max', onToggle: (s) => top.classList.toggle('is-solid', s.isActive) });

// --- Hareket ----------------------------------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('rm');
} else {
  initSmoothScroll();

  // Açılış (~1 sn, bir kez): fotoğraf durulur, künye gelir, ses çubukları ortadan dışa doğru yükselir.
  gsap.fromTo('.hero__photo img', { scale: 1.1 }, { scale: 1, duration: 1.2, ease: 'power3.out' });
  gsap.from('.hero__in > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  gsap.from('.wave i', { scaleY: 0, duration: 0.7, ease: 'power3.out', stagger: { each: 0.008, from: 'center' }, delay: 0.15 });

  ScrollTrigger.batch('.rv', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('in'), i * 60)),
  });

  // Parça satırları: fotoğraf perde gibi açılır.
  $$('.stop').forEach((s) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 80%', toggleActions: 'play none none none' } });
    tl.fromTo(s.querySelector('.stop__photo'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'power3.inOut' })
      .from(s.querySelector('.stop__photo img'), { scale: 1.15, duration: 1.1, ease: 'power2.out' }, 0)
      .from(s.querySelectorAll('.stop__body > *'), { y: 20, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out' }, 0.25);
  });

  // Rakamlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });

  gsap.fromTo('.atolye__photo img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.final__bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

addEventListener('load', () => ScrollTrigger.refresh());
