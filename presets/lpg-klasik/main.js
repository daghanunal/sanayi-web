// Dolum (klasik aile, LPG): sis grisi, gece laciverti, propan turuncusu; Encode Sans Expanded başlıklar.
// WebGL yok. Hizmetler'de bir dönüşümde takılan parçaların temsilî 3D render'ı (lib3d lpg_kit, Blender Cycles)
// ve fotoğraflı hizmet kartları. Hareket az: künye bir kez gelir, kartların fotoğrafı perde gibi açılır.
import sektor from '../../data/sektor-lpg.json';
import extra from '../../data/lpg-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const small = matchMedia('(max-width: 899px)').matches;
document.documentElement.classList.toggle('is-open', st.open);

// --- Üst çubuk ---------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <span class="top__status">${st.open ? 'Açık' : 'Kapalı'}</span>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <figure class="hero__photo">
    <picture>
      <source media="(max-width: 899px)" srcset="${asset('/img/lpg-klasik/hero-dik.jpg')}" />
      <img src="${asset('/img/lpg-klasik/hero.jpg')}" alt="Kaputu açık aracın motor bölmesinde çalışan usta" fetchpriority="high" decoding="async" />
    </picture>
  </figure>
  <div class="hero__panel">
    <h1 class="hero__name" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--alev" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler -------------------------------------------------------------------------

const KIT = [
  ['Simit tank', 'stepne yuvasına oturur', 33.3, 32.6],
  ['Çok valf', 'doldurma, seviye ve emniyet valfi', 43.3, 14.2],
  ['Regülatör', 'sıvı gazı buhara çevirir', 73.3, 35.4],
  ['Gaz filtresi', 'bakımda değişir', 67.3, 53.7],
  ['Enjektör rampası', 'her silindire ayrı enjektör', 40.8, 63.6],
  ['Elektronik ünite', 'benzin enjektörünün sinyalini okur', 17.9, 53.7],
  ['Doldurma ağzı', 'tamponda ya da depo kapağında', 79.5, 80.5],
];
const foto = (i) => d.hizmetGorsel[i % d.hizmetGorsel.length];
$('#hizmetler').innerHTML = `
  <div class="hizmet__head">
    <h2 class="h2" id="hizmet-h">Hizmetler</h2>
    <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <figure class="kit" aria-labelledby="kit-cap">
    <div class="kit__img">
      <picture>
        <source media="(max-width: 699px)" srcset="${asset('/img/lpg-klasik/lpg-kiti-3d-k.jpg')}" />
        <img src="${asset('/img/lpg-klasik/lpg-kiti-3d.jpg')}" alt="Sıralı enjeksiyon LPG sisteminin parçaları: simit tank ve çok valf, regülatör, gaz filtresi, enjektör rampası, elektronik ünite ve doldurma ağzı" width="1560" height="780" loading="lazy" decoding="async" />
      </picture>
      <ol class="kit__pins" aria-hidden="true">
        ${KIT.map(([n], i) => `<li style="--x:${KIT[i][2]}%;--y:${KIT[i][3]}%"><b>${i + 1}</b><span>${n}</span></li>`).join('')}
      </ol>
    </div>
    <figcaption id="kit-cap">
      <p class="kit__t">Bir dönüşümde takılan parçalar</p>
      <ol class="kit__legend">
        ${KIT.map(([n, a], i) => `<li><b>${i + 1}</b><span>${n}: ${a}</span></li>`).join('')}
      </ol>
      <p class="kit__note mono">Temsilî 3D görsel. Parça seçimi araca göre değişir.</p>
    </figcaption>
  </figure>
  <ul class="hizmet__list" data-lenis-prevent-touch>
    ${d.hizmetler.map((h, i) => `
      <li class="svc">
        <figure class="svc__photo"><img src="${esc(foto(i).src)}" alt="${esc(foto(i).alt)}" width="800" height="600" loading="lazy" decoding="async" /><span class="svc__no">${String(i + 1).padStart(2, '0')}</span></figure>
        <div class="svc__body">
          <h3 class="svc__name">${esc(h.baslik)}</h3>
          <p class="svc__desc">${esc(h.aciklama)}</p>
          <p class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </div>
      </li>`).join('')}
  </ul>
  <p class="hizmet__hint mono" aria-hidden="true"><span data-svc-count>1 / ${d.hizmetler.length}</span><span class="hizmet__bar"><i data-svc-bar></i></span></p>`;

// --- Hakkında --------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <figure class="atolye__photo"><img src="${esc(d.hakkindaGorsel.src)}" alt="${esc(d.hakkindaGorsel.alt)}" width="1000" height="1250" loading="lazy" decoding="async" /></figure>
  <div class="atolye__copy">
    <h2 class="h2" id="atolye-h">Hakkında</h2>
    <p class="lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <ul class="olgular">
      <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
      <li><b>${acikGun}<small> gün</small></b><span>haftada açık</span></li>
    </ul>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Dönüşüm yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------------

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="konum__status">${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${s}</td></tr>`).join('')}</tbody>
    </table>
    <p class="konum__addr">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="yorum__head">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list">
    ${d.yorumlar.map((y) => `
      <li class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
        <p class="rev__text">${esc(y.metin)}</p>
        <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim -------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__bg" src="${asset('/img/lpg-klasik/yol.jpg')}" alt="" width="1600" height="1000" loading="lazy" decoding="async" />
  <div class="final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Ruhsatın fotoğrafı WhatsApp'tan gönderilirse motor tipine göre uygun sistem söylenir.</p>
    <div class="final__btns">
      <a class="btn btn--alev btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D parça görseli temsilîdir. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// Telefonda hizmet kartları yana kayar: kaçıncı kartta olunduğu çubukta görünür.
const svcList = $('.hizmet__list');
const svcCount = $('[data-svc-count]');
const svcBar = $('[data-svc-bar]');
const n = d.hizmetler.length;
svcList.addEventListener('scroll', () => {
  const max = svcList.scrollWidth - svcList.clientWidth;
  const p = max > 0 ? svcList.scrollLeft / max : 0;
  svcCount.textContent = `${Math.round(p * (n - 1)) + 1} / ${n}`;
  svcBar.style.transform = `scaleX(${(1 + p * (n - 1)) / n})`;
}, { passive: true });
svcBar.style.transform = `scaleX(${1 / n})`;

// --- Hareket ------------------------------------------------------------------------------------

const top = $('#top');
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();
if (small) autoHideHeader(top, { offset: 120 });

if (!reducedMotion) {
  initSmoothScroll();
  gsap.from('.hero__panel > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  gsap.from('.hero__photo img', { scale: 1.08, duration: 1.4, ease: 'power2.out' });
  $$('.h2').forEach((h) => gsap.from(h, { y: 28, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } }));
  gsap.from('.kit__pins li', { scale: 0, autoAlpha: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(2)', scrollTrigger: { trigger: '.kit', start: 'top 70%', toggleActions: 'play none none none' } });
  $$('.svc').forEach((s, i) => {
    gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 90%', toggleActions: 'play none none none' } })
      .fromTo(s.querySelector('.svc__photo'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'power3.inOut', delay: small ? 0 : (i % 4) * 0.06 })
      .from(s.querySelector('.svc__photo img'), { scale: 1.2, duration: 1.1, ease: 'power2.out' }, 0);
  });
  gsap.from('.rev', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%', toggleActions: 'play none none none' } });
  gsap.fromTo('.final__bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  addEventListener('load', () => ScrollTrigger.refresh());
}
