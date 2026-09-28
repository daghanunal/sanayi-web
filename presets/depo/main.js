import veri from '../../data/depo.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { pickQuality } from '../../shared/lib3d.js';

// Sinematik aile. 3D iki yerde kalır: (1) künye, depo koridorunun girişi; kaydırınca kamera koridora
// yürür. (2) Parça grupları: her gruba gelince koridordaki kutu raftan çıkar, açılır, grubun parçası
// yükselir; kartın etiketi grup adı ve örnek parçalardır. Pin yok, kartlar akışta kayar.
// Parça gruplarından sonra sahne durur; gerisi düz site bölümleri.
gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, preset: 'depo' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const upper = (s) => s.toLocaleUpperCase('tr');
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const stops = d.urunler ?? [];
const wa = (m) => waHref(d, m ?? `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`);
const no = (i) => String(i + 1).padStart(2, '0');

// Barkod çubukları (isimden türetilmiş, her dükkâna özel)
function bars(seedText, n = 46) {
  let s = [...seedText].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => `<i style="--w:${1 + Math.floor(rnd() * 3.4)}"></i>`).join('');
}

// --- Üst çubuk ------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye" aria-label="${ad}, sayfa başı">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

// --- Künye -----------------------------------------------------------------------------

const words = d.isletme.ad.split(/\s+/);
const maxLine = Math.max(...words.map((w) => [...w].length), innerWidth < 700 ? 9 : Math.ceil([...d.isletme.ad].length / 2) + 1);
const lines = words.reduce((acc, w) => {
  const last = acc.at(-1);
  if (last && [...`${last} ${w}`].length <= maxLine) acc[acc.length - 1] = `${last} ${w}`;
  else acc.push(w);
  return acc;
}, []);

$('#kunye').innerHTML = `
  <div class="scrim" aria-hidden="true"></div>
  <div class="hero">
    <div class="tag tag--hero" aria-hidden="true">
      <p class="tag__top"><span>Şaşmaz Oto Sanayi Sitesi</span><b>${esc(String(d.isletme.kurulus))}</b></p>
      <div class="tag__bars">${bars(d.isletme.ad)}</div>
    </div>
    <h1 class="hero__title" id="hero-title" aria-label="${ad}" style="--len:${Math.max(...lines.map((w) => [...w].length))}">
      ${lines.map((w) => `<span class="line" aria-hidden="true"><span class="line__in">${esc(upper(w))}</span></span>`).join('')}
    </h1>
    <p class="hero__ne">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--orange" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler -----------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <p class="sec-kod">${d.hizmetler.length} hizmet</p>
      <h2 class="stencil" id="hizmet-title">Hizmetler</h2>
      <p>Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın.</p>
    </header>
    <ol class="hizmet-liste">
      ${d.hizmetler.map((h, i) => `
        <li class="hizmet">
          <p class="hizmet__kod"><span>${no(i)}</span><span class="hizmet__bars" aria-hidden="true">${bars(h.baslik, 18)}</span></p>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Parça grupları (3D eşlik eder) ----------------------------------------------------

$('#parca-gruplari').innerHTML = `
  <header class="gruplar__head">
    <h2 class="stencil" id="grup-title">Parça grupları</h2>
    <p>Binek ve hafif ticari araçlar için. Her grubun orijinali ve muadili bulunur.</p>
  </header>
  ${stops.map((s, i) => `
    <article class="grup" data-grup="${i}">
      <div class="shelfcard">
        <p class="shelfcard__code"><span>Parça grubu</span><span class="shelfcard__n"><b>${no(i)}</b> / ${no(stops.length - 1)}</span></p>
        <h3 class="shelfcard__title">${esc(s.baslik)}</h3>
        <p class="shelfcard__desc">${esc(s.aciklama)}</p>
        <ul class="shelfcard__list">${(s.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
      </div>
    </article>`).join('')}`;

// --- Hakkında --------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap hakkinda__inner">
    <header class="sec-head">
      <p class="sec-kod">Hakkında</p>
      <h2 class="stencil" id="hakkinda-title">Hakkında</h2>
    </header>
    <div class="hakkinda__grid">
      <p class="hakkinda__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="bilgi">
        ${(d.bilgiler ?? []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Parça bulunan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <ul class="stats">
      <li class="stat"><p class="stat__num"><b>${yas}</b><span>yıl</span></p><p class="stat__lbl">Şaşmaz Oto Sanayi Sitesi'nde</p></li>
      <li class="stat"><p class="stat__num"><b>${acikGun}</b><span>gün</span></p><p class="stat__lbl">haftada açık</p></li>
    </ul>
    <div class="galeri">
      ${(d.galeri ?? []).slice(0, 4).map((g, i) => `
        <figure class="gph gph--${i}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="1200" height="1600" /></figure>`).join('')}
    </div>
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
  <div class="wrap ziyaret__inner">
    <div class="ziyaret__info">
      <p class="sec-kod">Saatler ve konum</p>
      <h2 class="stencil" id="saat-title">Çalışma saatleri ve konum</h2>
      <p class="durum ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <dl class="hours">${saatListesi(d.saatler).map(([g, s]) => `<div class="${bugunMu(g) ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
      <p class="ziyaret__adres">${esc(d.iletisim.adres)}</p>
      <div class="ziyaret__cta">
        <a class="btn btn--orange" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="ziyaret__map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------

const yildiz = (n) => `<p class="rev__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <p class="sec-kod">Yorumlar</p>
      <h2 class="stencil" id="yorum-title">Örnek yorumlar</h2>
      <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
  </div>
  <div class="yorumlar__track" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        ${yildiz(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

// --- İletişim ---------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__inner">
    <div class="tag tag--final" aria-hidden="true">
      <p class="tag__top"><span>İletişim</span><span>Şaşmaz Oto Sanayi</span></p>
      <div class="tag__bars">${bars(d.iletisim.telefon)}</div>
      <p class="tag__name">${ad}</p>
      <p class="tag__code"><span>${tel}</span><span>Şaşmaz</span></p>
    </div>
    <div>
      <h2 class="final__title" id="final-title">İletişim</h2>
      <p class="final__sub">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın. Şasi numarası ya da ruhsatın fotoğrafı parçanın bulunması için yeterlidir.</p>
      <div class="final__cta">
        <a class="btn btn--orange btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        <a class="btn btn--ghost btn--big" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      </div>
      <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
    </div>
  </div>`;

$('#footer').innerHTML = `
  <p class="footer__name">${ad}</p>
  <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p class="footer__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. 3D görseller temsilîdir. Yorumlar örnektir.</p>`;

// --- Harita --------------------------------------------------------------------------------

const mapSlot = $('[data-map]');
new IntersectionObserver((en, ob) => {
  if (!en[0].isIntersecting) return;
  ob.disconnect();
  mapSlot.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapSlot);

// --- 3D sahne ---------------------------------------------------------------------------

const canvas = $('[data-stage]');
const heroEl = $('#kunye');
const gruplarEl = $('#parca-gruplari');
const grupEls = $$('[data-grup]');
let stage = null;

async function makeStage() {
  const { createStage } = await import('./scene.js');
  stage = createStage(canvas, { stops, ad: d.isletme.ad, tel: d.iletisim.telefon, lite, weak, quality: pickQuality() });
  addEventListener('resize', () => stage.resize());
}

const vis = new Set();
const io = new IntersectionObserver((en) => {
  en.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
  const on = vis.size > 0;
  stage?.setActive(on);
  canvas.classList.toggle('is-off', !on);
});
[heroEl, gruplarEl].forEach((el) => io.observe(el));

// Künye: 0 → 1 künye ekrandan çıkarken. Parça grupları: kartların ekran ortasından geçişi, durak cinsinden.
function frame() {
  if (!stage || !vis.size) return;
  const hr = heroEl.getBoundingClientRect();
  if (hr.bottom > innerHeight * 0.5) {
    stage.set('hero', clamp(-hr.top / Math.max(1, hr.height)));
    return;
  }
  const first = grupEls[0]?.getBoundingClientRect();
  const last = grupEls.at(-1)?.getBoundingClientRect();
  if (!first) return;
  const total = last.bottom - first.top;
  stage.set('raf', clamp((innerHeight * 0.64 - first.top) / total) * 0.999);
}

// --- Hareket -----------------------------------------------------------------------------

const topEl = $('#top');
const solid = () => topEl.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

const bir = (trigger, start = 'top 88%') => ({ trigger, start, toggleActions: 'play none none none' });

(async () => {
  if (reducedMotion) {
    document.documentElement.classList.add('rm');
    await makeStage();
    stage.set('hero', 0.3);
    stage.snap();
    stage.renderOnce();
    stage.setActive(false);
    return;
  }
  initSmoothScroll();
  await makeStage();
  gsap.ticker.add(frame);

  // Açılış: raf etiketi iner, ad harf harf çıkar, künye gelir (~1 sn, bir kez).
  const split = new SplitText('.hero__title .line__in', { type: 'chars' });
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.tag--hero', { y: -30, rotate: -8, autoAlpha: 0, duration: 0.6 }, 0)
    .from('.tag--hero .tag__bars i', { scaleY: 0, stagger: 0.006, duration: 0.25 }, 0.15)
    .fromTo(split.chars, { yPercent: 115 }, { yPercent: 0, stagger: 0.02, duration: 0.7, ease: 'power4.out' }, 0.1)
    .from('.hero__ne, .kunye, .hero__cta', { y: 18, autoAlpha: 0, stagger: 0.07, duration: 0.5, clearProps: 'all' }, 0.35);

  // Parça kartları: etiket kutudan çıkar gibi.
  grupEls.forEach((el) => {
    gsap.from($('.shelfcard', el), { y: 40, rotate: -1.5, autoAlpha: 0, duration: 0.7, clearProps: 'all', scrollTrigger: bir(el, 'top 70%') });
  });
  $$('.sec-head, .gruplar__head').forEach((el) => gsap.from(el.children, { y: 24, autoAlpha: 0, stagger: 0.07, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(el) }));
  $$('.hizmet').forEach((el) => gsap.from(el, { y: 30, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(el, 'top 92%') }));
  gsap.from('.stat', { clipPath: 'inset(0 100% 0 0)', stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: bir('.stats', 'top 88%') });
  $$('.gph').forEach((el) => gsap.from(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut', scrollTrigger: bir(el, 'top 92%') }));
  gsap.from('.tag--final', { y: -40, rotate: 6, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.6)', scrollTrigger: bir('#iletisim', 'top 75%') });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
