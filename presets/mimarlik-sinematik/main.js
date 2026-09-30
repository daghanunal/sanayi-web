// Mimarlık sinematik: ozalit mavisi pafta, beyaz çizgi, fosforlu kalem sarısı-yeşili; kodla çizilmiş temsilî konut.
// Akış: künye → Hizmetler (+ çalışma sırası) → Hakkında → Çalışma saatleri ve konum → Örnek yorumlar → İletişim.
// 3D yalnız künyede: açılışta paftadan katlar bir kez yükselir, çizgi akşam ışığında yapıya dönüşür;
// kaydırdıkça kamera yapının çevresinde döner, künye ekrandan çıkınca çizim durur.
import sektor from '../../data/sektor-mimarlik.json';
import ek from '../../data/mimarlik-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, GUNLER, autoHideHeader,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'mimarlik-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
// Dikey tablet kadrajı telefonunkine yakın: yazı üstte, yapı altta
const portrait = () => mobile() || (innerWidth < 1000 && innerHeight > innerWidth * 1.15);
const lite = weak || innerWidth < 760;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, new Date().getFullYear() - kurulus);
const st = gunDurumu(d.saatler);
const waGenel = d.waMesaj || 'Merhaba, proje için görüşme randevusu almak istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta ofisin metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: mimarlık ofisi (ProfessionalService) -------------------------------
$$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
const ld = $('script[type="application/ld+json"]');
if (ld) {
  const gunEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${gunEn[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
}
document.title = `${d.isletme.ad} | Mimarlık ofisi | Etimesgut, Ankara`;

const btn = (cls, href, ikon, label, dis) =>
  `<a class="btn ${cls}" href="${href}"${dis ? ' target="_blank" rel="noopener"' : ''}>${ikon}<span>${label}</span></a>`;
const liste = saatListesi(d.saatler);
const sira = [1, 2, 3, 4, 5, 6, 0];
const bugunG = sira.indexOf(new Date().getDay());
const bugunMu = (gunler) => {
  const [a, b] = gunler.split('–');
  const ia = sira.indexOf(GUNLER.indexOf(a));
  const ib = b ? sira.indexOf(GUNLER.indexOf(b)) : ia;
  return bugunG >= ia && bugunG <= ib;
};

// --- Başlık ----------------------------------------------------------------------
$('#ust').innerHTML = `
  <a class="top__brand" href="#basla" aria-label="${ad}, sayfa başı"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a>
    <a href="#hakkinda">Hakkında</a>
    <a href="#saatler">Saatler ve konum</a>
    <a href="#iletisim">İletişim</a>
  </nav>
  <p class="top__status${st.open ? ' is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -----------------------------------------------------------------------
$('#kunye').innerHTML = `
  <h1 class="hero__title${d.isletme.ad.length > 18 ? ' is-long' : ''}" id="hero-ad">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="live${st.open ? ' is-open' : ''}">${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    ${btn('btn--acc', telHref(d), icons.phone, 'Ara')}
    ${btn('btn--line', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}
    ${btn('btn--line', mapsHref(d), icons.pin, 'Yol tarifi', true)}
  </div>`;

// --- Hizmetler: satır + (masaüstünde) yapışkan görsel çerçevesi ---------------------------
$('#hizmetler').innerHTML = `
  <header class="sec-head">
    <h2 class="sec-title" id="svc-h">Hizmetler</h2>
    <p class="sec-sub">Süreler ortalamadır, projenin büyüklüğüne göre değişir. Ücret bilgisi ve görüşme randevusu için arayın. Görseller temsilîdir.</p>
  </header>
  <ol class="svc">
    <li class="svc__frame" aria-hidden="true">${d.hizmetler.map((s, i) => `<img src="${esc(s.gorsel)}" alt="" loading="lazy" decoding="async" data-svc-img="${i}" />`).join('')}<span class="svc__frame-no" data-svc-no>01 · Temsilî</span></li>
    ${d.hizmetler.map((s, i) => `
    <li class="svc__row" data-svc="${i}">
      <p class="svc__no">${String(i + 1).padStart(2, '0')}</p>
      <h3 class="svc__name">${esc(s.baslik)}</h3>
      <p class="svc__desc">${esc(s.aciklama)}</p>
      ${s.sure ? `<p class="svc__time"><span>Süre</span>${esc(s.sure)}</p>` : ''}
      <figure class="svc__img"><img src="${esc(s.gorsel)}" alt="${esc(s.gorselAlt || '')}" loading="lazy" decoding="async" /><figcaption>Temsilî</figcaption></figure>
    </li>`).join('')}
  </ol>`;

// --- Çalışma sırası -----------------------------------------------------------------
$('.steps').innerHTML = `
  <header class="sec-head"><h2 class="sec-title" id="steps-h">Çalışma sırası</h2></header>
  <ol class="steps__list">
    ${d.surec.map((s, i) => `<li class="step"><p class="step__n">${String(i + 1).padStart(2, '0')}</p><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('')}
  </ol>`;

// --- Hakkında ----------------------------------------------------------------------
const acikGun = acikGunSayisi(d.saatler);
const foto = d.galeri.find((g) => g.src.includes('/cizim-masasi.')) || d.galeri[0];
$('#hakkinda').innerHTML = `
  <div class="about__head"><h2 class="sec-title" id="about-h">Hakkında</h2></div>
  <div class="about__body">
    <p class="about__text">${ad} ${esc(yilEki(kurulus))} beri Etimesgut'ta. ${esc(d.isletme.hakkinda)}</p>
    ${d.bilgiler?.length ? `<dl class="facts">${d.bilgiler.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
  </div>
  <ul class="stats" aria-label="Rakamlarla">
    <li class="stat"><p class="stat__num"><b data-count="${yas}">${yas}</b><small> yıl</small></p><p class="stat__lbl">Etimesgut'ta</p></li>
    <li class="stat"><p class="stat__num"><b data-count="${acikGun}">${acikGun}</b><small> gün</small></p><p class="stat__lbl">haftada açık</p></li>
  </ul>
  <figure class="about__img"><img src="${esc(foto.src)}" alt="${esc(foto.alt)} (temsilî)" loading="lazy" decoding="async" width="2000" height="1333" /><figcaption>Temsilî</figcaption></figure>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------
$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="sec-title" id="shop-h">Çalışma saatleri ve konum</h2>
    <p class="shop__status${st.open ? ' is-open' : ''}">${esc(st.metin)}</p>
    <dl class="shop__hours">
      ${liste.map(([g, s]) => `<div class="${s === 'Kapalı' ? 'is-closed ' : ''}${bugunMu(g) ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="shop__addr">${esc(d.iletisim.adres)}</p>
    <div class="shop__cta">
      ${btn('btn--ink', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      ${btn('btn--inkline', telHref(d), icons.phone, tel)}
    </div>
  </div>
  <div class="shop__map" id="map"></div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <h2 class="sec-title" id="rev-h">Örnek yorumlar</h2>
    <p class="sec-sub">Buradaki yorumlar örnektir, yerlerine ofisin gerçek yorumları konur.</p>
  </header>
  <div class="reviews__rail" data-lenis-prevent-touch><div class="reviews__track">
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${icons.star.repeat(Number(y.puan) || 0)}</p>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b>${y.konu ? `<span>${esc(y.konu)}</span>` : ''}</figcaption>
      </figure>`).join('')}
  </div></div>`;

// --- İletişim ------------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="finale__in">
    <h2 class="finale__title" id="fin-h">İletişim</h2>
    <p class="finale__sub">Görüşme randevusu için arayın ya da WhatsApp'tan yazın. İlk görüşmeye tapu ya da ada-parsel numarası, varsa imar durum belgesi getirilir.</p>
    <dl class="finale__list">
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      <div><dt>Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
      <div><dt>Bugün</dt><dd>${esc(st.metin)}</dd></div>
    </dl>
    <div class="finale__cta">
      ${btn('btn--acc btn--xl', telHref(d), icons.phone, 'Ara')}
      ${btn('btn--line btn--xl', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}
    </div>
  </div>`;

$('#foot').innerHTML = `
  <p>© ${new Date().getFullYear()} ${ad} · ${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">Fotoğraflar ve proje görselleri temsilîdir (Pexels). 3D görsel temsilîdir; konut modeli bu site için kodla çizildi. Yorumlar örnektir.</p>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('#map');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne: yalnız künyede ------------------------------------------------------------------
const canvas = $('.stage');
let S = null;
try {
  S = createScene(canvas, { lite });
} catch {
  document.documentElement.classList.add('no-gl');
}
// Kamera yapının çevresinde bir yay üstünde döner. Masaüstünde bakış noktası sola kaydırılır: yapı sağda, künye solda.
// Telefonda yapı yazının altında kalır (bakış noktası yukarıda).
const sahne = { grow: reducedMotion ? 1 : 0, real: reducedMotion ? 1 : 0, q: 0 };
function state(time) {
  const m = portrait();
  const a = 0.62 + sahne.q * 0.75 + (reducedMotion ? 0 : Math.sin(time * 0.12) * 0.03);
  const r = m ? 44 : 40;
  const look = m ? V(0, 9.5, 0) : V(0, 4.2, 0);
  const pos = V(Math.sin(a) * r, m ? 12 : 9, Math.cos(a) * r);
  if (!m) {
    // Ekranın sağ yarısına it: bakış noktasını kameranın soluna kaydır.
    const f = look.clone().sub(pos).setY(0).normalize();
    const left = V(f.z, 0, -f.x);
    look.addScaledVector(left, 12);
  }
  const g = sahne.grow;
  return {
    pos, look, fov: m ? 46 : 38,
    grow: [smooth(clamp(g * 3)), smooth(clamp(g * 3 - 1)), smooth(clamp(g * 3 - 2))],
    setback: 0, hmax: 0, cut: 50, cutOn: 0,
    real: sahne.real, sunA: 3, inside: 0, night: sahne.real * 0.92,
  };
}
let heroVisible = true;
function tick(now) {
  if (S && heroVisible && !document.hidden) S.update(state(now / 1000), now);
  requestAnimationFrame(tick);
}
if (S) {
  addEventListener('resize', () => S.resize());
  new IntersectionObserver((e) => (heroVisible = e[0].isIntersecting)).observe(canvas);
  S.compile();
  S.update(state(0));
}

// --- Başlık çubuğu ve hareket ---------------------------------------------------------------
const top = $('#ust');
const solid = () => top.classList.toggle('is-light', scrollY > $('#basla').offsetHeight - 60);
addEventListener('scroll', solid, { passive: true });
solid();
if (innerWidth < 900) autoHideHeader(top, { offset: 140 });

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $$('.svc__row').forEach((r) => r.classList.add('is-on'));
  $('[data-svc-img="0"]')?.classList.add('is-on');
} else {
  initSmoothScroll();
  requestAnimationFrame(tick);

  // Açılış: katlar paftadan yükselir (~1,2 sn), ardından çizgi akşam ışığında yapıya döner. Kaydırma kilitlenmez.
  gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' });
  gsap.to(sahne, { grow: 1, duration: 1.3, ease: 'power2.inOut', delay: 0.2 });
  gsap.to(sahne, { real: 1, duration: 1.2, ease: 'power2.inOut', delay: 1.3 });
  gsap.from('#kunye > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.1, clearProps: 'all' });
  ScrollTrigger.create({
    trigger: '#basla', start: 'top top', end: 'bottom top',
    onUpdate: (s) => { sahne.q = s.progress; canvas.style.opacity = String(1 - s.progress * 0.6); },
  });

  // Başlıklar: satırlar çizgiden yükselir (bir kez)
  $$('.sec-title').forEach((el) => {
    const s = new SplitText(el, { type: 'lines', linesClass: 'rl', mask: 'lines' });
    gsap.fromTo(s.lines, { yPercent: 105 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } });
  });
  // Hizmetler: satır ortaya geldiğinde çerçevedeki görsel değişir
  const frameImgs = $$('[data-svc-img]');
  const frameNo = $('[data-svc-no]');
  const setSvc = (i) => {
    frameImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
    frameNo.textContent = `${String(i + 1).padStart(2, '0')} · Temsilî`;
  };
  setSvc(0);
  $$('.svc__row').forEach((row, i) => {
    ScrollTrigger.create({ trigger: row, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { row.classList.toggle('is-on', s.isActive); if (s.isActive) setSvc(i); } });
  });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 75%', onEnter: () => s.classList.add('is-lit'), onLeaveBack: () => s.classList.remove('is-lit') }));
  gsap.fromTo('.steps__list', { '--fill': 0 }, { '--fill': 1, ease: 'none', scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  gsap.fromTo('.about__img img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: target, duration: 1.2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)), scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' } });
  });
  gsap.fromTo('.rev', { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.reviews__rail', start: 'top 88%', toggleActions: 'play none none none' } });
  addEventListener('load', () => ScrollTrigger.refresh());
}
