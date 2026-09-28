// Tünel (klasik aile, oto yıkama): eski usul yıkama tüneli tabelası. Kobalt mavi + ayçiçeği sarısı + kiraz,
// üç renkli köpük. Künyenin yanında kemerli pencere: açılışta araç tünelden bir kez geçer (su, fırça, köpük
// perdesi, durulama, kurutma). Kaydırmaya bağlı pin yok; katmanlar yalnızca transform/opacity ile hareket eder.
import raw from '../../data/sektor-yikama.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, autoHideHeader, telHref, waHref, mapsHref, mapsEmbed,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const small = matchMedia('(max-width: 899px)').matches;
const B = import.meta.env.BASE_URL;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const led = `<i class="led${st.open ? ' is-open' : ''}" aria-hidden="true"></i>`;
// Kendi küçültülmüş kopyamız varsa onu kullan
const kucuk = (src) => {
  const name = String(src).split('/').pop();
  return /sektor-yikama\//.test(src) ? asset(`/img/yikama-klasik/k/${name}`) : src;
};

// --- Başlık ---------------------------------------------------------------------
$('#top').innerHTML = `
  <a href="#kunye" class="top__brand" aria-label="${ad}, sayfa başı"><span class="top__mark" aria-hidden="true"><i></i></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Sayfa bölümleri">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <span class="top__status">${led}<span>${st.open ? 'Açık' : 'Kapalı'}</span></span>
  <a class="top__call" href="${telHref(d)}" aria-label="Telefonla ara">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------
if (d.isletme.ad.length > 18) document.documentElement.classList.add('ad-uzun');
$('[data-hero]').innerHTML = `
  <h1 class="hero__name" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt class="mono">Bugün</dt><dd class="durum">${led}<span>${esc(st.kunye)}</span></dd></div>
    <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--sari" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// --- Köpük üretici (sabit tohumlu; her açılışta aynı köpük) ------------------------
function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const PASTEL = ['#ffc6cf', '#ffe38c', '#c6d9ff'];
// w×h piksellik köpük: gövde + kabarcıklı kenarlar (üst/alt) + üç renkli lekeler + kabarcık halkaları
function foamSvg(w, h, { seed = 7, top = true, bottom = true, edge = 0.12, patches = true } = {}) {
  const r = rng(seed);
  const e = Math.round(h * edge);
  const out = [];
  const y0 = top ? e : 0, y1 = bottom ? h - e : h;
  out.push(`<rect x="0" y="${y0}" width="${w}" height="${y1 - y0}" fill="#fdfdff"/>`);
  const rim = (y, dir) => {
    let x = -20;
    while (x < w + 20) {
      const rad = e * (0.35 + r() * 0.65);
      out.push(`<circle cx="${(x + rad).toFixed(1)}" cy="${(y + dir * (r() * e * 0.35)).toFixed(1)}" r="${rad.toFixed(1)}" fill="#fdfdff"/>`);
      if (r() > 0.55) out.push(`<circle cx="${(x + rad * 0.6).toFixed(1)}" cy="${(y + dir * rad * 0.55).toFixed(1)}" r="${(rad * 0.42).toFixed(1)}" fill="#fdfdff"/>`);
      x += rad * (1.1 + r() * 0.5);
    }
  };
  if (top) rim(y0, -1);
  if (bottom) rim(y1, 1);
  if (patches) {
    const n = Math.round((w * (y1 - y0)) / 26000) + 6;
    for (let i = 0; i < n; i++) {
      const rad = Math.min(w, h) * (0.08 + r() * 0.16);
      const cx = r() * w, cy = y0 + rad * 0.4 + r() * Math.max(1, y1 - y0 - rad * 0.8);
      out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="${PASTEL[i % 3]}" opacity="${(0.55 + r() * 0.35).toFixed(2)}"/>`);
    }
  }
  const b = Math.round((w * h) / 5200) + 20;
  for (let i = 0; i < b; i++) {
    const rad = 2 + r() * r() * 22;
    const cx = r() * w, cy = y0 + r() * (y1 - y0);
    out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="${r() > 0.7 ? '#ffffff' : 'none'}" stroke="#9fb6f2" stroke-opacity=".55" stroke-width="${(0.8 + rad * 0.06).toFixed(2)}"/>`);
    if (rad > 7) out.push(`<circle cx="${(cx - rad * 0.35).toFixed(1)}" cy="${(cy - rad * 0.35).toFixed(1)}" r="${(rad * 0.2).toFixed(1)}" fill="#fff"/>`);
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">${out.join('')}</svg>`;
}

// --- Hero: yıkama tüneli (açılışta bir kez) ---------------------------------------
const hero = $('.hero');
const stage = $('.hero__stage');
const kopuk = $('[data-kopuk]');
const istasyon = $$('[data-istasyon] li');
const FOAM_H = 1.34; // köpük perdesi = sahne yüksekliği × 1.34 (üst/alt kabarcık payı)
function buildFoam() {
  const w = Math.round(stage.clientWidth), h = Math.round(stage.clientHeight * FOAM_H);
  kopuk.innerHTML = foamSvg(w, h, { seed: 11, edge: 0.13 });
}
buildFoam();
let rw = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; buildFoam(); } });

const ASAMA = [0, 0.1, 0.4, 0.6, 0.8, 1.01];
let lastSt = -2;
function setStation(p) {
  let s = -1;
  if (p > 0.005) for (let i = 0; i < 5; i++) if (p >= ASAMA[i]) s = i;
  if (p >= 0.985) s = 5;
  if (s === lastSt) return;
  lastSt = s;
  istasyon.forEach((li, i) => {
    li.classList.toggle('is-on', i === s);
    li.classList.toggle('is-done', i < s);
  });
  hero.classList.toggle('is-clean', s === 5);
}

if (reducedMotion) {
  $('[data-kirli]').style.opacity = 0;
  hero.classList.add('is-static');
  setStation(1);
} else {
  gsap.set(kopuk, { y: 0, yPercent: -101 });
  gsap.set('[data-parilti]', { x: 0, xPercent: -130, opacity: 1 });
  hero.classList.add('is-ready');
  gsap.set('[data-firca]', { xPercent: 0, x: () => stage.clientWidth + 20 });
  const W = () => stage.clientWidth;
  // Zamana bağlı tek geçiş (~2,6 sn); künye yazıları beklemeden görünür
  const tl = gsap.timeline({ defaults: { ease: 'none' }, delay: 0.5, onUpdate: () => setStation(tl.progress()) });
  tl
    .fromTo('[data-su]', { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.005)
    .fromTo('[data-su] i', { yPercent: -50 }, { yPercent: 0, duration: 0.2 }, 0)
    .to('[data-su]', { opacity: 0, duration: 0.05 }, 0.14)
    .fromTo('.firca--1', { x: () => W() + 20 }, { x: () => -W() * 0.55, duration: 0.28, ease: 'power1.inOut' }, 0.1)
    .fromTo('.firca--2', { x: () => W() + 20 }, { x: () => -W() * 0.55, duration: 0.28, ease: 'power1.inOut' }, 0.16)
    .fromTo('[data-firca] i', { yPercent: 0 }, { yPercent: -50, duration: 0.34 }, 0.1)
    .fromTo('[data-kirli] img', { x: 0 }, { x: () => -W() * 0.015, duration: 0.3, ease: 'sine.inOut' }, 0.1)
    .fromTo(kopuk, { yPercent: -101 }, { yPercent: -9.7, duration: 0.18, ease: 'power2.in' }, 0.4)
    .set('[data-kirli]', { opacity: 0 }, 0.6)
    .fromTo('.hero__img--temiz img', { scale: 1.12 }, { scale: 1, duration: 0.4, ease: 'power1.out' }, 0.6)
    .to(kopuk, { yPercent: 78, duration: 0.2, ease: 'power1.in' }, 0.61)
    .to('[data-su]', { opacity: 0.85, duration: 0.03 }, 0.62)
    .fromTo('[data-su] i', { yPercent: -50 }, { yPercent: 0, duration: 0.2, immediateRender: false }, 0.62)
    .to('[data-su]', { opacity: 0, duration: 0.04 }, 0.79)
    .fromTo('[data-kurut]', { yPercent: -120, opacity: 0 }, { yPercent: 420, opacity: 1, duration: 0.13, ease: 'power1.inOut' }, 0.8)
    .to('[data-kurut]', { opacity: 0, duration: 0.02 }, 0.93)
    .fromTo('[data-parilti]', { x: 0, xPercent: -130 }, { xPercent: 330, duration: 0.1, ease: 'power2.inOut' }, 0.89)
    .to({}, { duration: 0.05 });
  tl.timeScale(tl.duration() / 2.6);

  gsap.from('.hero__copy > *', { y: 18, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', clearProps: 'all' });
  gsap.from('.tunel', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out' });
}

// --- Hizmetler: yıkama programı panosu ---------------------------------------------
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="prog__head">
      <h2 class="h2" id="svc-h">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <div class="prog__grid">
      <figure class="prog__screen" aria-hidden="true" data-screen></figure>
      <ol class="prog__list" data-services></ol>
    </div>
  </div>`;
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => {
  const g = h.gorsel ? kucuk(h.gorsel) : null;
  return `
  <li class="svc${g ? '' : ' svc--nophoto'}" data-i="${i}">
    <button type="button" class="svc__btn" aria-expanded="false">
      <span class="svc__no mono" aria-hidden="true">${i + 1}</span>
      <span class="svc__name">${esc(h.baslik)}</span>
      <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
    </button>
    <div class="svc__body">
      ${g ? `<figure class="svc__photo"><img src="${esc(g)}" alt="" loading="lazy" decoding="async" /></figure>` : `<div class="svc__photo svc__photo--foam" aria-hidden="true"><span>${esc(h.baslik)}</span></div>`}
      <p class="svc__desc">${esc(h.aciklama)}</p>
    </div>
  </li>`;
}).join('');
const screen = $('[data-screen]');
screen.innerHTML = d.hizmetler.map((h, i) => h.gorsel
  ? `<img src="${esc(kucuk(h.gorsel))}" alt="" loading="lazy" decoding="async" data-s="${i}" />`
  : `<div class="prog__foam" data-s="${i}"><span>${esc(h.baslik)}</span></div>`).join('')
  + `<figcaption class="prog__cap"><span class="mono" data-cap-no></span><b data-cap></b></figcaption>`;
const svcs = $$('.svc');
function setActive(i) {
  svcs.forEach((s, j) => {
    s.classList.toggle('is-on', j === i);
    s.querySelector('.svc__btn').setAttribute('aria-expanded', String(j === i));
  });
  $$('[data-s]', screen).forEach((el) => el.classList.toggle('is-on', Number(el.dataset.s) === i));
  $('[data-cap-no]', screen).textContent = `Süre: ${d.hizmetler[i].sure}`;
  $('[data-cap]', screen).textContent = d.hizmetler[i].baslik;
}
setActive(0);
$('[data-services]').addEventListener('click', (e) => {
  const li = e.target.closest('.svc');
  if (!li) return;
  const i = Number(li.dataset.i);
  if (small && li.classList.contains('is-on')) { li.classList.remove('is-on'); li.querySelector('.svc__btn').setAttribute('aria-expanded', 'false'); return; }
  setActive(i);
  if (small && !reducedMotion) gsap.from(li.querySelector('.svc__body'), { height: 0, duration: 0.45, ease: 'power2.out', clearProps: 'height' });
});
if (!small) {
  $('[data-services]').addEventListener('mouseover', (e) => {
    const li = e.target.closest('.svc');
    if (li && !li.classList.contains('is-on')) setActive(Number(li.dataset.i));
  });
}

// --- Hakkında -----------------------------------------------------------------------
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <figure class="about__photo"><img src="${B}img/yikama-klasik/k/ic-mekan.jpg" alt="Detaylı temizlikten çıkmış araç içi" loading="lazy" decoding="async" /></figure>
    <div class="about__copy">
      <h2 class="h2" id="about-h">Hakkında</h2>
      <p class="lead lead--ink">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
    </div>
  </div>
  <div class="rakam">
    <div class="rakam__bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <ul class="wrap rakam__list">
      <li class="stat"><p class="stat__val"><span data-count="${yas}">${yas}</span><small> yıl</small></p><p class="stat__lbl">Şaşmaz Oto Sanayi Sitesi'nde</p></li>
      <li class="stat"><p class="stat__val"><span data-count="${acikGun}">${acikGun}</span><small> gün</small></p><p class="stat__lbl">haftada açık</p></li>
    </ul>
  </div>`;
const rakam = $('.rakam');
new IntersectionObserver(([e]) => rakam.classList.toggle('is-off', !e.isIntersecting)).observe(rakam);

// --- Çalışma saatleri ve konum -------------------------------------------------------
const GUN_SIRA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const bugun = (new Date().getDay() + 6) % 7;
const bugunMu = (g) => { const [a, b = a] = g.split('–'); return bugun >= GUN_SIRA.indexOf(a) && bugun <= GUN_SIRA.indexOf(b); };
$('#saatler').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <div class="konum__grid">
      <div class="konum__card">
        <p class="konum__status">${led}<span>${esc(st.metin)}</span></p>
        <table class="hours">
          <caption class="sr-only">Çalışma saatleri</caption>
          <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td class="mono">${esc(h)}</td></tr>`).join('')}</tbody>
        </table>
        <address class="konum__addr">${icons.pin}<span>${esc(d.iletisim.adres)}</span></address>
        <div class="konum__btns">
          <a class="btn btn--sari" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
          <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        </div>
      </div>
      <div class="konum__map" data-map><p class="mono">Harita</p></div>
    </div>
  </div>`;
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Örnek yorumlar ----------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    <ul class="yorum__list" data-lenis-prevent-touch>
      ${d.yorumlar.map((y, i) => `
        <li class="rev rev--${i % 3}">
          <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
          <blockquote class="rev__text">${esc(y.metin)}</blockquote>
          <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ---------------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <img class="final__bg" src="${B}img/yikama-klasik/k/cila-2.jpg" alt="" loading="lazy" decoding="async" />
  <div class="final__foam" data-foam-edge aria-hidden="true"></div>
  <div class="wrap final__in">
    <h2 class="final__h" id="final-h">İletişim</h2>
    <p class="final__lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--sari btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--white btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;
const edgeEl = $('[data-foam-edge]');
edgeEl.innerHTML = foamSvg(Math.max(360, Math.round(edgeEl.clientWidth || innerWidth)), 120, { seed: 5, top: false, bottom: true, edge: 0.5, patches: false });

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${ad}</p>
    <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__not">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// --- Başlık davranışı ----------------------------------------------------------------------
const top = $('#top');
const setSolid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
setSolid();
addEventListener('scroll', setSolid, { passive: true });
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Bölüm hareketleri ----------------------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();
  $$('.h2').forEach((h) => gsap.from(h, { y: 32, opacity: 0, duration: 0.75, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));
  gsap.from('.svc', { y: 24, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: '.prog__list', start: 'top 88%' } });
  if (!small) gsap.fromTo('.prog__screen', { clipPath: 'inset(0 0 100% 0 round 28px)' }, { clipPath: 'inset(0 0 0% 0 round 28px)', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: '.prog__grid', start: 'top 82%' } });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 94%' }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });
  gsap.fromTo('.about__photo img', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.rev', { y: 26, opacity: 0, duration: 0.55, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 90%' } });
  gsap.fromTo('.final__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

addEventListener('load', () => ScrollTrigger.refresh());
