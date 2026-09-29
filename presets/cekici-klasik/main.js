// İkaz (klasik aile, çekici): soğuk beton zemin, asfalt mürekkebi, reflektör kırmızısı. WebGL yok.
// Saira Extra Condensed başlıklar, Saira Stencil One rakamlar (çekici kasasındaki şablon yazı).
// Künye: çekiciye yüklenen aracın fotoğrafı, yanında köşesi ikaz üçgeniyle işaretli künye kartı. Açılışta üçgenin
// reflektörü bir kez parlar (~1 sn). Hizmetler fotoğraflı kartlar; gerisi düz site bölümleri.
import base from '../../data/sektor-cekici.json';
import extra from '../../data/cekici-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';

const d = boot({ ...base, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const img = (p) => String(p).replace('img/sektor-cekici/', 'img/cekici-klasik/');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
// Her gün 00:00–24:00 ise saat satırı "24 saat" olarak yazılır (yalnız veriden).
const surekli = d.saatler.every((s) => s === '00:00-24:00');
const st = surekli ? { open: true, kunye: 'Şu an açık · 24 saat', metin: 'Her gün 24 saat açık' } : gunDurumu(d.saatler);
const saatSatir = surekli ? [['Her gün', '24 saat']] : saatListesi(d.saatler);
const waMesaj = `Merhaba ${d.isletme.ad}, yolda kaldım. Çekici ya da yol yardım için bilgi almak istiyorum.`;
const tri = `<svg class="tri" viewBox="0 0 32 28" aria-hidden="true"><path d="M16 2.5 29.5 25.5h-27z" /><path class="tri__in" d="M16 10 23 22H9z" /></svg>`;

// --- Üst çubuk --------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand" aria-label="${ad}, sayfa başı">${tri}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#yorumlar">Yorumlar</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <picture class="hero__photo">
    <source media="(min-width: 900px)" srcset="${asset('/img/cekici-klasik/varis-d.jpg')}" width="1800" height="1200" />
    <img src="${asset('/img/cekici-klasik/varis-m.jpg')}" alt="Kayar kasalı çekiciye yüklenen beyaz pikap ve tekeri sabitleyen usta" width="826" height="1333" fetchpriority="high" decoding="async" />
  </picture>
  <div class="hero__wrap">
    <article class="card">
      ${tri.replace('class="tri"', 'class="tri tri--big"')}
      <h1 class="card__name" id="hero-title">${ad}</h1>
      <p class="card__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="card__cta">
        <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d, waMesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </article>
  </div>`;

// --- Hizmetler --------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="h2" id="svc-h">Hizmetler</h2>
      <p class="lead">Varış süresi aracın yerine göre aramada söylenir. Fiyat için arayın.</p>
    </header>
    <ul class="svc__grid">
      ${d.hizmetler.map((h, i) => `
        <li class="item">
          <figure class="item__img"><img src="${esc(asset(img(h.gorsel)))}" alt="" width="1200" height="800" loading="lazy" decoding="async" /><span class="item__no">${String(i + 1).padStart(2, '0')}</span></figure>
          <div class="item__body">
            <h3 class="item__name">${esc(h.baslik)}</h3>
            <p class="item__desc">${esc(h.aciklama)}</p>
            <p class="item__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
          </div>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2" id="about-h">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div><dt>haftada açık</dt><dd><b>${acikGunSayisi(d.saatler)}</b> gün</dd></div>
      </dl>
    </div>
    <div>
      <figure class="about__photo"><img src="${asset('/img/cekici-klasik/zincir-sabitleme.jpg')}" alt="Çekici kasasında tekerleğin sabitlenmesi" width="1200" height="800" loading="lazy" decoding="async" /></figure>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
    </div>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2" id="visit-h">Çalışma saatleri ve konum</h2>
      <p class="visit__status durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatSatir.map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__btns">
        <a class="btn btn--dark" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${Number(n)}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        ${stars(y.puan)}
        <blockquote class="rev__text">${esc(y.metin)}</blockquote>
        <p class="rev__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim: konumlu WhatsApp mesajı ---------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__p">Çekici ve yol yardım için arayın ya da WhatsApp'tan yazın. Konum mesaja eklenebilir.</p>
    <label class="konum"><input type="checkbox" data-konum /><span class="konum__box" aria-hidden="true"></span><span data-konum-text>Mesaja konumumu ekle</span></label>
    <div class="final__btns">
      <a class="btn btn--white btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost-light btn--big" href="${waHref(d, waMesaj)}" target="_blank" rel="noopener" data-wa>${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Konum kutusu işaretlenince tarayıcıdan konum istenir, WhatsApp mesajına harita bağlantısı eklenir.
const konum = $('[data-konum]');
const konumText = $('[data-konum-text]');
const waLink = $('[data-wa]');
konum.addEventListener('change', () => {
  if (!konum.checked) {
    waLink.href = waHref(d, waMesaj);
    konumText.textContent = 'Mesaja konumumu ekle';
    return;
  }
  if (!navigator.geolocation) { konum.checked = false; konumText.textContent = 'Konum alınamadı, WhatsApp\'tan konum gönderilebilir'; return; }
  konumText.textContent = 'Konum alınıyor';
  navigator.geolocation.getCurrentPosition(
    (p) => {
      const link = `https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`;
      waLink.href = waHref(d, `${waMesaj} Konumum: ${link}`);
      konumText.textContent = 'Konum mesaja eklendi';
    },
    () => { konum.checked = false; konumText.textContent = 'Konum izni verilmedi, WhatsApp\'tan konum gönderilebilir'; },
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Üst çubuk ------------------------------------------------------------------------

const top = $('#top');
const small = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (small.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!small.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${top.offsetHeight}px`); }
};
syncHeader();
small.addEventListener('change', syncHeader);
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Hareket ----------------------------------------------------------------------------

if (!reducedMotion) {
  initSmoothScroll();
  // Açılış (~1 sn): fotoğraf netleşir, kart gelir, üçgenin reflektörü bir kez parlar.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__photo img', { scale: 1.07, duration: 1.2 }, 0)
    .from('.card', { y: 30, autoAlpha: 0, duration: 0.6, clearProps: 'transform,opacity,visibility' }, 0.05)
    .from('.card > :not(.tri)', { y: 12, autoAlpha: 0, duration: 0.45, stagger: 0.05, clearProps: 'all' }, 0.2)
    .fromTo('.tri--big', { rotate: -14, scale: 0.6, autoAlpha: 0 }, { rotate: 0, scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(2)' }, 0.35)
    .add(() => $('.tri--big')?.classList.add('is-lit'), 0.8);

  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  $$('.h2, .final__title').forEach((h) => rise(h, h));
  $$('.item').forEach((it) => rise(it, it, { y: 22, duration: 0.6 }));
  rise('.stats > div', '.stats', { stagger: 0.1 });
  rise('.rev', '.yorum__list', { stagger: 0.07, y: 18 });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
} else {
  $('.tri--big')?.classList.add('is-lit');
}
