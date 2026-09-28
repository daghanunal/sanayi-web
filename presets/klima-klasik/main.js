// Ayaz (klasik aile, oto klima): gece yeşili, kırağı beyazı, buz yeşili; sıcak turuncu yalnızca künyedeki
// üfleme ağzının ilk sıcak hâlinde. Fotoğraf ağırlıklı, WebGL yok.
// Hareket az: künyede üfleme ağzı açılışta bir kez sıcak tondan soğuk tona döner (ağızdan dairesel yayılan
// soğuk), hizmet satırları sırayla gelir, Hakkında fotoğrafı hafif kayar. Pin yok, sayaç yok.
import sektor from '../../data/sektor-klima.json';
import extra from '../../data/klima-klasik.json';
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
const mark = `<span class="top__mark" aria-hidden="true"></span>`;

// --- Üst çubuk ---------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__stage" aria-hidden="true">
    <img class="hero__img hero__img--sicak" src="${asset('/img/klima-klasik/vent-sicak.jpg')}" alt="" width="1100" height="1650" fetchpriority="high" decoding="async" />
    <img class="hero__img hero__img--soguk" src="${asset('/img/klima-klasik/vent-nane.jpg')}" alt="" width="1100" height="1650" decoding="async" />
    <div class="hero__frost"></div>
    <div class="vent" data-vent><span class="vent__wave"></span><span class="vent__wave"></span><span class="vent__wave"></span></div>
  </div>
  <div class="hero__copy">
    <h1 class="hero__name${d.isletme.ad.length > 18 ? ' is-long' : ''}" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--buz" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler -------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="hizmet__head">
    <h2 class="h2" id="hizmet-h">Hizmetler</h2>
    <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ul class="hizmet__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc">
        <span class="svc__no mono">${String(i + 1).padStart(2, '0')}</span>
        <div class="svc__body">
          <h3 class="svc__name">${esc(h.baslik)}</h3>
          <p class="svc__desc">${esc(h.aciklama)}</p>
        </div>
        <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
      </li>`).join('')}
  </ul>`;

// --- Hakkında --------------------------------------------------------------------------

const foto = d.hakkindaGorsel;
const galeri = (d.galeriSec || []).map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('#hakkinda').innerHTML = `
  <figure class="atolye__photo"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="1400" height="933" loading="lazy" decoding="async" /></figure>
  <div class="atolye__copy">
    <h2 class="h2" id="atolye-h">Hakkında</h2>
    <p class="lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <ul class="band">
      <li class="stat"><p class="stat__val">${yas}<small> yıl</small></p><p class="stat__lbl">Şaşmaz Oto Sanayi Sitesi'nde</p></li>
      <li class="stat"><p class="stat__val">${acikGun}<small> gün</small></p><p class="stat__lbl">haftada açık</p></li>
    </ul>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Klimasına bakılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="galeri" data-lenis-prevent-touch>
    <div class="galeri__track" tabindex="0" aria-label="Klima işlerinden temsilî fotoğraflar, yana kaydırın">
      ${galeri.map((g) => `<figure class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" width="800" height="1000" loading="lazy" decoding="async" /></figure>`).join('')}
    </div>
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
    <p class="konum__status durum ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td class="mono">${s}</td></tr>`).join('')}</tbody>
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
  <img class="final__bg" src="${asset('/img/klima-klasik/vent-nane.jpg')}" alt="" width="1100" height="1650" loading="lazy" decoding="async" />
  <div class="final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--buz btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

// Harita yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Künye: üfleme ağzı ----------------------------------------------------------------------

const hero = $('#kunye');
const stage = $('.hero__stage');
const vent = $('[data-vent]');
const cold = $('.hero__img--soguk');
// Fotoğraftaki üfleme ağzının yeri (1100×1650 görselde, oran olarak)
const IMG = { w: 1100, h: 1650, cx: 0.518, cy: 0.468, r: 0.3 };
let geo = { x: 0, y: 0, r: 100, far: 1000 };
function place() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const s = Math.max(w / IMG.w, h / IMG.h);
  const iw = IMG.w * s, ih = IMG.h * s;
  const ox = (w - iw) * 0.5, oy = (h - ih) * 0.47;
  const x = ox + IMG.cx * iw, y = oy + IMG.cy * ih, r = IMG.r * iw;
  geo = { x, y, r, far: Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) };
  vent.style.cssText = `left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px`;
}
let cur = 0;
function setCold(p) {
  cur = p;
  const rad = p <= 0 ? 0 : geo.r * 0.9 + (geo.far - geo.r * 0.9) * p;
  cold.style.clipPath = `circle(${rad.toFixed(1)}px at ${geo.x.toFixed(1)}px ${geo.y.toFixed(1)}px)`;
  hero.classList.toggle('is-cold', p > 0.5);
}
place();
addEventListener('resize', () => { place(); setCold(cur); });
// Ekran dışındayken hava dalgaları durur.
new IntersectionObserver(([e]) => hero.classList.toggle('is-off', !e.isIntersecting)).observe(hero);

// --- Hareket ------------------------------------------------------------------------------------

const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader($('#top'), { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const top = $('#top');
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

if (reducedMotion) {
  setCold(1);
} else {
  initSmoothScroll();
  setCold(0);
  // Açılış: künye gelir, üfleme ağzından soğuk bir kez yayılır (1,2 sn).
  const m = { p: 0 };
  gsap.timeline({ delay: 0.5 })
    .to(m, { p: 1, duration: 1.2, ease: 'power2.in', onUpdate: () => setCold(m.p) }, 0)
    .fromTo('.hero__frost', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.8);
  gsap.from('.hero__copy > *', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power2.out', ...extra, scrollTrigger: { trigger, start: 'top 88%', toggleActions: 'play none none none' } });
  $$('.h2').forEach((h) => rise(h, h, { y: 30, duration: 0.7 }));
  rise('.svc', '.hizmet__list', { stagger: 0.05 });
  rise('.rev', '.yorum__list', { stagger: 0.07 });
  rise('.stat', '.band', { stagger: 0.1 });
  gsap.fromTo('.atolye__photo img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.atolye__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.final__bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

addEventListener('load', () => { place(); setCold(cur); ScrollTrigger.refresh(); });
