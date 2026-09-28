import veri from '../../data/tonaj.json';
import ek from '../../data/agirvasita-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  autoHideHeader, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki,
} from '../../shared/core.js';
import { createScene } from './scene.js';

// Gece Seferi (sinematik aile): 3D yalnız künyede. Gece otoyolunda sodyum lambaların altından geçen bir tır;
// kaydırınca kamera hafifçe yükselir ve sahne kararır, künye ekrandan çıkınca çizim durur. Tabela, portal ve
// kilometre sayacı yok; geri kalan her şey sodyum turuncusu vurgulu, düz gece zemininde normal site bölümü.
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, ...ek, preset: 'agirvasita-sinematik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, '0');
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const phone = matchMedia('(max-width: 899px)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 760;

// --- İçerik ---------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

$('#kunye-ic').innerHTML = `
  <h1 class="hero__title${d.isletme.ad.length > 20 ? ' is-long' : ''}" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--sodium" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="exits__head">
      <h2 class="h2" id="hizmet-t">Hizmetler</h2>
      <p class="exits__lead">Çekici, kamyon, otobüs ve midibüs. Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <ol class="exits__list">
      ${d.hizmetler.map((h, i) => `
        <li class="exit">
          <span class="exit__no">${pad(i + 1)}</span>
          <div class="exit__body"><h3>${esc(h.baslik)}</h3><p>${esc(h.aciklama)}</p></div>
          ${h.sure ? `<span class="exit__time">${esc(h.sure)}</span>` : ''}
        </li>`).join('')}
    </ol>
  </div>`;

const g = d.galeri || [];
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2" id="hakkinda-t">Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="odos">
        <div class="odo"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div class="odo"><dt>Haftada açık</dt><dd><b>${acikGun}</b> gün</dd></div>
      </dl>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <div class="about__photos">
      ${g.slice(0, 2).map((p, i) => `<figure class="about__photo about__photo--${i}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async" /></figure>`).join('')}
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="wrap hours__grid">
    <div>
      <h2 class="h2" id="saatler-t">Çalışma saatleri ve konum</h2>
      <p class="hours__now ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <dl class="hours__list">
        ${saatListesi(d.saatler).map(([gun, s]) => `<div class="${s === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(gun)}</dt><dd>${esc(s)}</dd></div>`).join('')}
      </dl>
    </div>
    <div class="loc">
      <p class="loc__addr">${esc(d.iletisim.adres)}</p>
      <div class="loc__map" data-map><p>Harita</p></div>
      <div class="loc__cta">
        <a class="btn btn--sodium" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
  </div>`;

const yildiz = (n) => `<p class="msg__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="yorum-t">Örnek yorumlar</h2>
    <p class="radio__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    <ul class="msgs">
      ${d.yorumlar.map((y, i) => `
        <li class="msg ${i % 2 ? 'msg--r' : ''}">
          <p class="msg__meta"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
          <blockquote>${esc(y.metin)}</blockquote>
          ${yildiz(y.puan)}
        </li>`).join('')}
    </ul>
  </div>`;

$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <h2 class="final__title" id="final-t">İletişim</h2>
    <p class="final__text">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Yolda kaldıysanız konumunuzu WhatsApp'tan gönderebilirsiniz.</p>
    <a class="final__tel" href="${telHref(d)}">${tel}</a>
    <div class="final__cta">
      <a class="btn btn--sodium" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap">
    <p class="foot__name">${ad}</p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D sahne temsilîdir. Yorumlar örnektir.</p>
  </div>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

const top = $('#top');
if (phone) autoHideHeader(top, { offset: 120 });
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Sahne: yalnız künye --------------------------------------------------------------

const canvas = $('[data-stage]');
let S = null;
try {
  S = createScene(canvas, { lite, signs: [], finalSign: null, name: d.isletme.ad.toLocaleUpperCase('tr'), tel: d.iletisim.telefon });
} catch {
  document.documentElement.classList.add('no-webgl');
  canvas.remove();
}
document.fonts?.ready.then(() => document.fonts.load("900 80px 'Saira Semi Condensed'")).then(() => S?.redrawSigns());

// Kamera [x, y, z, bakX, bakY, bakZ]. Araç −z yönüne gider; masaüstünde metin solda, tır sağda.
const portrait = () => innerWidth / innerHeight < 0.8;
const CAM = () => (portrait() ? [-5.5, 2.6, -21, 0.2, -1.6, -4] : [4.4, 1.3, -18.5, 3.2, 2.5, -3]);
const CAM_UST = () => (portrait() ? [-8, 8, -18, 0, -2, -3] : [7, 6.5, -15, 2.2, 1.6, -2]);

let visible = true;
let heroP = 0; // künyeden çıkış (0–1)
let travel = 0;
let last = performance.now();
let t0 = performance.now();
S?.setCam(CAM());
function frame(now) {
  requestAnimationFrame(frame);
  if (!S || !visible || document.hidden) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!reducedMotion) travel += dt * 14;
  const a = CAM(), b = CAM_UST();
  const k = heroP * heroP * (3 - 2 * heroP);
  const cam = a.map((v, i) => v + (b[i] - v) * k);
  // açılışta kamera ~1,2 sn'de yerine süzülür
  const intro = reducedMotion ? 1 : clamp((now - t0) / 1200);
  cam[2] -= (1 - intro * intro * (3 - 2 * intro)) * 6;
  S.update({ travel, gantryTravel: 0, cam, fov: portrait() ? 58 : 42, final: 0, time: now / 1000, convoy: 0, px: 0, py: 0 }, dt);
  S.render();
}
if (S) {
  addEventListener('resize', () => S.resize());
  new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe($('#kunye'));
  S.readyP?.then(() => gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 })).catch(() => {});
  requestAnimationFrame(frame);
}

// --- Hareket ---------------------------------------------------------------------------

if (!reducedMotion) {
  initSmoothScroll();
  gsap.from('#kunye-ic > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  ScrollTrigger.create({
    trigger: '#kunye', start: 'top top', end: 'bottom top',
    onUpdate: (s) => { heroP = s.progress; $('.hero__shade').style.opacity = String(0.2 + s.progress * 0.8); },
  });
  const gel = (sel, v) => $$(sel).forEach((el) => gsap.from(el, { ...v, autoAlpha: 0, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' } }));
  gel('.exit', { x: -24 });
  gel('.msg', { y: 24 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
