// Gece çağrısı (sinematik aile, çekici): lacivert gece, sodyum lamba sarısı, reflektör beyazı. Oswald + Karla + Oxanium.
// 3D yalnız künyede: foto-gerçekçi gece yolu. Açılışta çekici bir kez gelir, emniyet şeridinde dörtlüleri yanan aracın
// önünde durur; kasa eğilip geriye kayar, araç vinçle kasaya alınır ve sabitlenir (~9 sn, kaydırmaya bağlı değil).
// Sonra tepe lambası döner, kamera hafifçe salınır. Künye görünmez olunca çizim durur; gerisi düz site bölümleri.
import sektor from '../../data/sektor-cekici.json';
import ek from '../../data/cekici-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import * as THREE from 'three';
import { createScene, CAR_X, TRUCK_STOP } from './scene.js';

const d = boot({ ...sektor, ...ek, preset: ek.preset });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const phoneMQ = matchMedia('(max-width: 899px)');
const phone = () => phoneMQ.matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || phone();

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
// Her gün 00:00–24:00 ise saat satırı "24 saat" olarak yazılır (yalnız veriden).
const surekli = d.saatler.every((s) => s === '00:00-24:00');
const st = surekli ? { open: true, kunye: 'Şu an açık · 24 saat', metin: 'Her gün 24 saat açık' } : gunDurumu(d.saatler);
const saatSatir = surekli ? [['Her gün', '24 saat']] : saatListesi(d.saatler);
const waMesaj = `Merhaba ${d.isletme.ad}, yolda kaldım. Çekici ya da yol yardım için bilgi almak istiyorum.`;

// --- Render ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye"><span class="top__lamp" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('[data-hero]').innerHTML = `
  <h1 class="hero__title" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--amber" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--ghost" href="${waHref(d, waMesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// Hizmetler: yol levhası gibi kartlar (sarı çerçeve, levha numarası).
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <h2 class="sec-title" id="svc-h">Hizmetler</h2>
    <p class="sec-sub">Varış süresi aracın yerine göre aramada söylenir. Fiyat için arayın.</p>
    <ol class="signs">
      ${d.hizmetler.map((h, i) => `
        <li class="sign">
          <p class="sign__no">${String(i + 1).padStart(2, '0')}</p>
          <h3 class="sign__title">${esc(h.baslik)}</h3>
          <p class="sign__text">${esc(h.aciklama)}</p>
          <p class="sign__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

const foto = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <figure class="about__img"><img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="1200" height="800" loading="lazy" decoding="async" /></figure>
    <div>
      <h2 class="sec-title" id="about-h">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li><b>${yas}<small> yıl</small></b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGunSayisi(d.saatler)}<small> gün</small></b><span>haftada açık</span></li>
      </ul>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="wrap base__grid">
    <div>
      <h2 class="sec-title" id="base-h">Çalışma saatleri ve konum</h2>
      <p class="base__status ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatSatir.map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="base__addr">${esc(d.iletisim.adres)}</p>
      <div class="base__cta">
        <a class="btn btn--amber" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="base__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="sec-title" id="reviews-h">Örnek yorumlar</h2>
    <p class="sec-sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__rail" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((r) => `
      <li class="review">
        <p class="review__stars" role="img" aria-label="5 üzerinden ${Number(r.puan)}">${stars(r.puan)}</p>
        <p class="review__text">${esc(r.metin)}</p>
        <p class="review__who"><b>${esc(r.ad)}</b><span>${esc(r.arac || '')}</span></p>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="finale__title" id="finale-h">İletişim</h2>
    <p class="finale__sub">Çekici ve yol yardım için arayın ya da WhatsApp'tan yazın. Konum mesaja eklenebilir.</p>
    <div class="finale__cta">
      <a class="btn btn--amber btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <button class="btn btn--ghost btn--xl" type="button" data-geo>${icons.pin}<span data-geo-label>Konumla WhatsApp'tan yaz</span></button>
    </div>
    <p class="finale__note" data-geo-note>Konum izni istenir; konum yalnız WhatsApp mesajına eklenir.</p>
    <p class="finale__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.</p>
  </div>`;

new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// Konumla WhatsApp: izin verilirse harita bağlantısı mesaja eklenir, verilmezse mesaj konumsuz açılır.
const geoBtn = $('[data-geo]'), geoLabel = $('[data-geo-label]'), geoNote = $('[data-geo-note]');
const send = (link) => {
  const url = waHref(d, link ? `${waMesaj} Konumum: ${link}` : waMesaj);
  if (!window.open(url, '_blank', 'noopener')) location.href = url;
};
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { send(''); return; }
  geoLabel.textContent = 'Konum alınıyor';
  navigator.geolocation.getCurrentPosition(
    (p) => { geoLabel.textContent = "Konumla WhatsApp'tan yaz"; send(`https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`); },
    () => { geoLabel.textContent = "Konumla WhatsApp'tan yaz"; geoNote.textContent = 'Konum izni verilmedi; konum WhatsApp içinden de gönderilebilir.'; send(''); },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
  );
});

// --- Üst çubuk ---------------------------------------------------------------------------

const topEl = $('#top');
if (phone()) autoHideHeader(topEl, { offset: 120 });
const solid = () => topEl.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', solid, { passive: true });
solid();

// --- 3D sahne: açılış filmi ----------------------------------------------------------------

const canvas = $('#gl');
const S = createScene(canvas, { lite });
const loader = $('[data-loader]');
S.ready.then(() => loader.classList.add('is-done')).catch(() => loader.classList.add('is-done'));

// Kamera: masaüstünde künye solda, çekici ve araç sağ yarıda; telefonda künye altta, yol üst yarıda.
const cam = () => phone()
  ? { pos: V(-6.5, 6.4, 22), look: V(8.2, -2.4, 3), fov: 50 }
  : { pos: V(-2.5, 3.2, 17), look: V(5.4, 1.2, 3), fov: 42 };
const FILM = 9.6; // sn
function filmState(t, now) {
  const c = cam();
  // Kamera önce emniyet şeridindeki araca bakar, çekici yanaşınca kasaya döner.
  const pan = smooth(seg(t, 2.2, 5.6));
  const pos = c.pos.clone().add(V(L(-4.5, 0, pan), 0, 0));
  const look = c.look.clone().add(V(L(-6, 0, pan), 0, 0));
  const drift = reducedMotion ? 0 : Math.sin(now / 1000 * 0.3) * 0.25;
  const drive = easeOut(seg(t, 0, 3.0));
  const back = smooth(seg(t, 8.6, 9.6));
  const winch = smooth(seg(t, 5.0, 8.0));
  return {
    pos: pos.add(V(drift, drift * 0.2, 0)), look, fov: c.fov,
    truckX: L(-60, TRUCK_STOP, drive),
    tilt: smooth(seg(t, 3.2, 4.2)) * (1 - back),
    slide: smooth(seg(t, 3.7, 4.9)) * (1 - back),
    ramps: smooth(seg(t, 4.3, 4.9)) * (1 - smooth(seg(t, 8.3, 8.7))),
    winch, winching: t > 5 && t < 8 ? 1 : 0,
    loaded: t >= 8.2 ? 1 : 0, straps: t >= 8.2 ? 1 : 0,
    hazard: t < 8.2 ? 1 : 0, beacon: 1, work: seg(t, 3, 3.6), flash: 0, carX: CAR_X,
  };
}

let running = false, start = null;
function frame(now) {
  if (start === null) start = now;
  const t = reducedMotion ? FILM : Math.min(FILM, (now - start) / 1000);
  S.update(filmState(t, now), now);
  if (running) requestAnimationFrame(frame);
}
function setRunning(on) {
  if (on === running) return;
  running = on;
  canvas.classList.toggle('is-off', !on);
  if (on) requestAnimationFrame(frame);
}
const hero = $('#kunye');
S.ready.then(() => {
  S.compile?.();
  // Film yüklemeden sonra başlar; künye görünürken çizilir.
  start = null;
  new IntersectionObserver(([e]) => setRunning(e.isIntersecting && !document.hidden)).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden && hero.getBoundingClientRect().bottom > 0));
  gsap.to(canvas, { opacity: 1, duration: 0.8, ease: 'power2.out' });
}).catch(() => {});
addEventListener('resize', () => S.resize());

// --- Hareket ------------------------------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
} else {
  initSmoothScroll({ lerp: 0.1 });
  gsap.from('.hero__inner > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  const rise = (targets, trigger, extra = {}) =>
    gsap.from(targets, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', ...extra, scrollTrigger: { trigger, start: 'top 86%', toggleActions: 'play none none none' } });
  $$('.sec-title, .finale__title').forEach((s) => rise(s, s));
  $$('.sign').forEach((s) => rise(s, s, { y: 20, duration: 0.6 }));
  rise('.stats li', '.stats', { stagger: 0.1 });
  rise('.review', '.reviews__rail', { stagger: 0.06, y: 18 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
