import veri from '../../data/depo.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createStage } from './scene.js';
import { pickQuality } from '../../shared/lib3d.js';

// Sinematik aile, 3D yalnız açılışta: künyede krom parçalar kaidenin çevresinde döner ve dükkânın
// adının önünden geçer. Künye ekrandan çıkınca sahne durur; geri kalan her şey düz site bölümü.
gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, preset: 'yedekparca-sinematik2' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const upper = (s) => s.toLocaleUpperCase('tr');
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const urunler = d.urunler ?? [];
const wa = (m) => waHref(d, m ?? `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`);
const PASTEL = ['#dcd2f8', '#cdeedf', '#fad6c3', '#d0e2fa', '#f3e7b2', '#f6cfdd', '#d8e6c8'];
const KINDS = ['disk', 'filtre', 'amortisor', 'triger', 'debriyaj', 'buji', 'piston'];
const kinds = KINDS.map((k, i) => urunler[i]?.parca && KINDS.includes(urunler[i].parca) ? urunler[i].parca : k);

// --- Üst çubuk ------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye" aria-label="${ad}, sayfa başı"><i class="top__dot" aria-hidden="true"></i><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------

// Dev isim: kelimeleri dengeli satırlara topla
const words = d.isletme.ad.split(/\s+/);
const narrow = innerWidth < 700;
const maxLen = Math.max(...words.map((w) => [...w].length), narrow ? 9 : Math.ceil([...d.isletme.ad].length / 2) + 1);
const lines = words.reduce((acc, w) => {
  const last = acc.at(-1);
  if (last && [...`${last} ${w}`].length <= maxLen) acc[acc.length - 1] = `${last} ${w}`;
  else acc.push(w);
  return acc;
}, []);

$('#kunye').innerHTML = `
  <canvas class="stage" aria-hidden="true"></canvas>
  <h1 class="giant" id="hero-title" aria-label="${ad}" style="--len:${Math.max(...lines.map((l) => [...l].length))};--lines:${lines.length}">
    ${lines.map((l) => `<span class="giant__line" aria-hidden="true">${esc(upper(l))}</span>`).join('')}
  </h1>
  <div class="hero__in">
    <div class="kunye-kart">
      <p class="kicker">Şaşmaz Oto Sanayi Sitesi · ${esc(yilEki(d.isletme.kurulus))} beri</p>
      <p class="hero__ne">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__cta">
        <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;

// --- Hizmetler ------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <p class="kicker">${d.hizmetler.length} hizmet</p>
    <h2 class="sec__title" id="hizmet-title">Hizmetler</h2>
    <p class="sec__lead">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın.</p>
    <ul class="hizmet-liste">
      ${d.hizmetler.map((h, i) => `
        <li class="hizmet" style="--c:${PASTEL[i % PASTEL.length]}">
          <span class="hizmet__no">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
        </li>`).join('')}
    </ul>
    ${urunler.length ? `
    <div class="gruplar">
      <h3 class="gruplar__title">Parça grupları</h3>
      <p class="sec__lead">Binek ve hafif ticari araçlar için. Her grubun orijinali ve muadili bulunur.</p>
      <ul class="grup-liste">
        ${urunler.map((u, i) => `
          <li class="grup" style="--c:${PASTEL[i % PASTEL.length]}">
            <h4><i aria-hidden="true"></i>${esc(u.baslik)}</h4>
            <div><p>${esc(u.aciklama)}</p><ul class="chips">${(u.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
          </li>`).join('')}
      </ul>
    </div>` : ''}
  </div>`;

// --- Hakkında -------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap">
    <p class="kicker kicker--light">Hakkında</p>
    <h2 class="sec__title" id="hakkinda-title">Hakkında</h2>
    <div class="hakkinda__ic">
      <div>
        <p class="hakkinda__giris">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
        <ul class="sayilar">
          <li class="sayi"><b>${yas}<small>yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
          <li class="sayi"><b>${acikGun}<small>gün</small></b><span>haftada açık</span></li>
        </ul>
      </div>
      <dl class="bilgi">
        ${(d.bilgiler ?? []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Parça bulunan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
  </div>
  <div class="strip" tabindex="0" aria-label="Fotoğraflar, yana kaydırın" data-lenis-prevent-touch>
    ${(d.galeri ?? []).map((g, i) => `<figure class="strip__f" style="--i:${i}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="900" height="1100" /></figure>`).join('')}
  </div>`;

// --- Çalışma saatleri ve konum --------------------------------------------------------

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="wrap ziyaret">
    <div>
      <p class="kicker">Saatler ve konum</p>
      <h2 class="sec__title" id="saat-title">Çalışma saatleri ve konum</h2>
      <p class="open ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <ul class="saatler">
        ${saatListesi(d.saatler).map(([g, s]) => `<li class="${bugunMu(g) ? 'is-today' : ''}${s === 'Kapalı' ? ' is-closed' : ''}"><span>${esc(g)}</span><b>${esc(s)}</b></li>`).join('')}
      </ul>
      <p class="adres">${icons.pin}<span>${esc(d.iletisim.adres)}</span></p>
      <div class="ziyaret__cta">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="wrap">
    <p class="kicker">Yorumlar</p>
    <h2 class="sec__title" id="yorum-title">Örnek yorumlar</h2>
    <p class="sec__lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    <ul class="yorumlar">
      ${d.yorumlar.map((y, i) => `
        <li class="yorum" style="--r:${[-1.5, 1, -0.8, 1.5, -1][i % 5]}deg">
          <p class="yorum__stars" role="img" aria-label="5 üzerinden ${y.puan}">${'★'.repeat(y.puan)}<span>${'★'.repeat(5 - y.puan)}</span></p>
          <p class="yorum__t">${esc(y.metin)}</p>
          <p class="yorum__m"><b>${esc(y.ad)}</b>${esc(y.arac)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ----------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <p class="kicker kicker--light">İletişim</p>
    <h2 class="final__title" id="final-title">İletişim</h2>
    <p class="final__sub">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın. Şasi numarası ya da ruhsatın fotoğrafı parçanın bulunması için yeterlidir.</p>
    <div class="final__cta">
      <a class="btn btn--white" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--lineW" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>
  <footer class="final__foot">
    <p class="final__foot-name">${ad}</p>
    <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)}</p>
    <p class="final__foot-small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. 3D görseller temsilîdir. Yorumlar örnektir.</p>
  </footer>`;

// --- Harita --------------------------------------------------------------------------------

const mapSlot = $('[data-map]');
new IntersectionObserver((en, ob) => {
  if (!en[0].isIntersecting) return;
  ob.disconnect();
  mapSlot.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapSlot);

// --- 3D sahne: yalnız künyede ----------------------------------------------------------

const hero = $('#kunye');
const giant = $('.giant');
const canvas = $('.stage');
let stage = null;
const introState = { p: reducedMotion ? 1 : 0 };
function sizeHero() {
  hero.style.setProperty('--giant-h', `${giant.offsetHeight}px`);
  stage?.setSize(canvas.clientWidth, canvas.clientHeight);
}
try {
  stage = createStage(canvas, { kinds, lite, quality: pickQuality() });
  stage.setTint('#e2dbf8');
} catch {
  document.documentElement.classList.add('no-webgl');
}
sizeHero();
addEventListener('resize', sizeHero);
document.fonts?.ready.then(sizeHero);

let heroVisible = true;
new IntersectionObserver((en) => {
  heroVisible = en[0].isIntersecting;
  canvas.classList.toggle('is-off', !heroVisible);
}).observe(hero);

const t0 = performance.now();
let lastRender = -1;
function frame() {
  if (!stage || !heroVisible || document.hidden) return;
  // Künye kaydırıldıkça halka biraz döner (T 0 → 0,7; vitrin sahnesi 0,8'de başlar, oraya gidilmez).
  const T = clamp(scrollY / Math.max(1, hero.offsetHeight)) * 0.7;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const mobile = w / h < 0.8;
  const time = reducedMotion ? 0 : (performance.now() - t0) / 1000;
  if (reducedMotion && lastRender === T) return;
  lastRender = T;
  // Telefonda halka dev ismin hemen altına, künye kartının üstüne insin; masaüstünde sağa kaysın.
  const giantBottom = (giant.offsetTop + giant.offsetHeight) / h;
  const shiftY = mobile ? -clamp(giantBottom - 0.26, 0, 0.14) : 0;
  const shiftX = mobile ? 0 : 0.2;
  stage.update(T, time, { activeF: 0, shiftX, shiftY, introP: introState.p });
}
gsap.ticker.add(frame);

// --- Hareket -----------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

const bir = (trigger, start = 'top 88%') => ({ trigger, start, toggleActions: 'play none none none' });

if (!reducedMotion) {
  initSmoothScroll();
  // Açılış: parçalar yukarıdan inip kaidenin çevresine dizilir, isim harf harf çıkar, künye gelir (~1,6 sn).
  const split = new SplitText('.giant__line', { type: 'chars', charsClass: 'ch' });
  const tl = gsap.timeline({ delay: 0.1 });
  tl.to(introState, { p: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
    .from(split.chars, { yPercent: 110, rotate: 8, autoAlpha: 0, duration: 0.9, stagger: 0.025, ease: 'expo.out' }, 0.2)
    .from('.kunye-kart', { autoAlpha: 0, y: 24, duration: 0.6, ease: 'power3.out', clearProps: 'all' }, 0.4);

  // Künyeden çıkarken isim hafifçe yükselir.
  gsap.to('.giant', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.5 } });

  $$('.sec .kicker, .sec__title, .sec__lead').forEach((el) =>
    gsap.from(el, { autoAlpha: 0, y: 24, duration: 0.7, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(el) }));
  $$('.hizmet, .grup').forEach((el) =>
    gsap.from(el, { autoAlpha: 0, y: 36, duration: 0.7, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(el, 'top 92%') }));
  gsap.from('.strip__f', { y: 50, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: 'power3.out', clearProps: 'opacity,visibility', scrollTrigger: bir('.strip') });
  gsap.from('.yorum', { y: 50, autoAlpha: 0, stagger: 0.07, duration: 0.8, ease: 'power3.out', clearProps: 'opacity,visibility', scrollTrigger: bir('.yorumlar') });
  gsap.from('.final__in > *', { y: 30, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('#iletisim', 'top 75%') });

  addEventListener('load', () => ScrollTrigger.refresh());
}
