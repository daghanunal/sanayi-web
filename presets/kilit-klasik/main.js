// Çift Flaş (klasik aile, oto kilit): gece asfaltı, beton grisi, flaşör turuncusu; Saira Extra Condensed,
// Reddit Sans, Sono. WebGL yok. Künyede gece çekilmiş araç fotoğrafı: açılışta araç bir kez çift flaş yapar
// (kilit açıldı), sonra karşılama ışıkları yanar. Pin ve kaydırmaya bağlı sahne yok.
import sektor from '../../data/sektor-kilit.json';
import extra from '../../data/kilit-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const phone = matchMedia('(max-width: 899px)').matches;
document.documentElement.classList.toggle('is-open', st.open);
const mark = `<span class="top__mark" aria-hidden="true"><i></i><i></i></span>`;

// --- Üst çubuk ---------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="car" aria-hidden="true">
    <div class="car__frame">
      <img class="car__img" src="${esc(d.heroFoto)}" alt="" width="1336" height="2000" fetchpriority="high" decoding="async" />
      <span class="car__dim"></span>
      <span class="glow glow--marker" data-glow></span>
      <span class="glow glow--strip" data-glow></span>
      <span class="glow glow--head" data-head></span>
      <span class="glow glow--fog" data-head></span>
    </div>
  </div>
  <span class="hero__pulse" aria-hidden="true"></span>
  <span class="hero__shade" aria-hidden="true"></span>
  <div class="hero__copy">
    <h1 class="hero__name${d.isletme.ad.length > 16 ? ' is-long' : ''}" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum"><span class="led"></span>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--amber" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--glass" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--glass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler -------------------------------------------------------------------------

const foto = (i) => d.hizmetFoto[i % d.hizmetFoto.length];
$('#hizmetler').innerHTML = `
  <div class="sec-head">
    <h2 class="h2" id="hiz-h">Hizmetler</h2>
    <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="kartlar">
    ${d.hizmetler.map((h, i) => `
      <li class="kart">
        <figure class="kart__foto"><img src="${esc(foto(i).src)}" alt="${esc(foto(i).alt)}" width="800" height="600" loading="lazy" decoding="async" /></figure>
        <div class="kart__govde">
          <p class="kart__no mono">${String(i + 1).padStart(2, '0')}</p>
          <h3 class="kart__baslik">${esc(h.baslik)}</h3>
          <p class="kart__metin">${esc(h.aciklama)}</p>
          <p class="kart__sure mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </div>
      </li>`).join('')}
  </ol>`;

// --- Hakkında --------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="dukkan__ic">
    <figure class="dukkan__foto"><img src="${esc(d.hakkindaGorsel.src)}" alt="${esc(d.hakkindaGorsel.alt)}" width="1200" height="1500" loading="lazy" decoding="async" /></figure>
    <div class="dukkan__metin">
      <h2 class="h2" id="dukkan-h">Hakkında</h2>
      <p class="lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="olgular">
        <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGun}<small> gün</small></b><span>haftada açık</span></li>
      </ul>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt class="mono">Anahtarı yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
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
    <p class="konum__status"><span class="led"></span>${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td class="mono">${s}</td></tr>`).join('')}</tbody>
    </table>
    <p class="konum__addr">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--outline" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="sec-head">
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
  <div class="final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Aracın marka, model ve yılı yazılırsa anahtar tipi söylenir.</p>
    <div class="final__btns">
      <a class="btn btn--amber btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--glass btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Künye: çift flaş -------------------------------------------------------------------------

const carBox = $('.car');
const frame = $('.car__frame');
const dim = $('.car__dim');
const glows = $$('[data-glow]');
const heads = $$('[data-head]');
const pulse = $('.hero__pulse');
const IMG_R = 1336 / 2000;
// Fotoğraf çerçevesi alanı kaplar; ışık noktaları görselin üstünde % ile sabit kalır.
function fitCar() {
  const r = carBox.getBoundingClientRect();
  let w = r.width, h = w / IMG_R;
  if (h < r.height) { h = r.height; w = h * IMG_R; }
  const fx = phone ? 0.47 : 0.5;
  const left = clamp(r.width * 0.5 - w * fx, r.width - w, 0);
  const top = (r.height - h) * (phone ? 0.42 : 0.5);
  frame.style.cssText = `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px`;
}
fitCar();
addEventListener('resize', fitCar);

// --- Hareket ------------------------------------------------------------------------------------

const top = $('#top');
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();
if (phone) autoHideHeader(top, { offset: 120 });

if (reducedMotion) {
  gsap.set(dim, { opacity: 0.35 });
  gsap.set(heads, { opacity: 1 });
  gsap.set([...glows, pulse], { opacity: 0 });
} else {
  initSmoothScroll();
  gsap.set(dim, { opacity: 0.8 });
  gsap.set([...glows, pulse, ...heads], { opacity: 0 });
  // Açılış: araç iki kez sinyal verir, sonra karşılama ışıkları yanar (~2 sn, bir kez).
  const tl = gsap.timeline({ delay: 0.6 });
  const blink = (at) => {
    tl.to([...glows, pulse], { opacity: 1, duration: 0.07, ease: 'none' }, at)
      .to(dim, { opacity: 0.45, duration: 0.07, ease: 'none' }, at)
      .to([...glows, pulse], { opacity: 0, duration: 0.2, ease: 'power1.in' }, at + 0.26)
      .to(dim, { opacity: 0.7, duration: 0.2, ease: 'power1.in' }, at + 0.26);
  };
  blink(0);
  blink(0.55);
  tl.to(dim, { opacity: 0.35, duration: 1, ease: 'power2.out' }, 1.1)
    .to(heads, { opacity: 1, duration: 0.8, ease: 'power2.out', stagger: 0.12 }, 1.1);
  gsap.from('.hero__copy > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.6, ease: 'power2.out', ...extra, scrollTrigger: { trigger, start: 'top 88%', toggleActions: 'play none none none' } });
  $$('.h2').forEach((h) => rise(h, h, { y: 30, duration: 0.7 }));
  $$('.kart').forEach((k) => rise(k, k));
  rise('.rev', '.yorum__list', { stagger: 0.07 });
  addEventListener('load', () => { fitCar(); ScrollTrigger.refresh(); });
}
