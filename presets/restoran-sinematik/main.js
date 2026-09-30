// Közde (sinematik aile, ocakbaşı): gece ocakbaşı, kodla çizilmiş mangal.
// Akış: künye → Menü → Hakkında → Çalışma saatleri ve konum → Örnek yorumlar → İletişim (rezervasyon).
// 3D yalnız künyede: açılışta şişler közün üstüne bir kez iner, kaydırdıkça kamera ocağa yaklaşır ve sahne söner.
import temel from '../../data/sektor-restoran.json';
import ek from '../../data/restoran-sinematik.json';
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

const d = boot({ ...temel, ...ek });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, new Date().getFullYear() - kurulus);
const st = gunDurumu(d.saatler);
const waGenel = d.waMesaj || 'Merhaba, masa ayırtmak istiyorum.';
const waPaket = 'Merhaba, paket sipariş vermek istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta rezervasyon metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: restoran olarak işaretle ------------------------------------------
$$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
const ld = $('script[type="application/ld+json"]');
if (ld) {
  const gunEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    servesCuisine: 'Kebap, ızgara, meze',
    acceptsReservations: true,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${gunEn[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
}
document.title = `${d.isletme.ad} | Ocakbaşı | Etimesgut, Ankara`;

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
  <a class="top__brand" href="#basla" aria-label="${ad}, sayfa başı">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#menu">Menü</a>
    <a href="#hakkinda">Hakkında</a>
    <a href="#saatler">Saatler ve konum</a>
    <a href="#iletisim">Rezervasyon</a>
  </nav>
  <p class="top__status${st.open ? ' is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

// --- Künye -----------------------------------------------------------------------
$('#kunye').innerHTML = `
  <h1 class="hero__title" id="hero-ad">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="live${st.open ? ' is-open' : ''}">${esc(st.kunye)}</dd></div>
    <div><dt>Saatler</dt><dd><ul class="kunye__saat">${liste.map(([g, s]) => `<li${bugunMu(g) ? ' class="is-today"' : ''}><span>${esc(g)}</span> <b>${esc(s)}</b></li>`).join('')}</ul></dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    ${btn('btn--fire', telHref(d), icons.phone, 'Ara')}
    ${btn('btn--ghost', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}
    ${btn('btn--ghost', mapsHref(d), icons.pin, 'Yol tarifi', true)}
  </div>`;

// --- Menü: şiş rafı ------------------------------------------------------------------
$('#menu').innerHTML = `
  <header class="sec-head">
    <h2 class="sec-title" id="menu-h">Menü</h2>
    <p class="sec-sub">Süre, siparişten masaya ortalama bekleme süresidir. Güncel fiyat için arayın ya da WhatsApp'tan yazın.</p>
  </header>
  <ol class="rack">
    ${d.hizmetler.map((s, i) => `
      <li class="rack__row">
        <span class="rack__n">${String(i + 1).padStart(2, '0')}</span>
        <div class="rack__body">
          <h3 class="rack__name">${esc(s.baslik)}</h3>
          <p class="rack__desc">${esc(s.aciklama)}</p>
        </div>
        ${s.sure ? `<p class="rack__time"><span class="sr-only">Bekleme: </span>${esc(s.sure)}</p>` : ''}
        <span class="rack__sis" aria-hidden="true"><i></i></span>
      </li>`).join('')}
  </ol>
  ${d.servisler?.length ? `
  <div class="servis">
    <h3 class="servis__t">Masa, paket ve grup</h3>
    <ul class="servis__list">
      ${d.servisler.map((s) => `
        <li class="servis__item">
          <h4>${esc(s.baslik)}</h4>
          <p>${esc(s.aciklama)}</p>
          ${s.sure ? `<p class="servis__sure">${esc(s.sure)}</p>` : ''}
        </li>`).join('')}
    </ul>
  </div>` : ''}`;

// --- Hakkında ----------------------------------------------------------------------
const acikGun = acikGunSayisi(d.saatler);
const ocak = d.galeri.find((g) => g.src.includes('/ocak.')) || d.galeri[0];
$('#hakkinda').innerHTML = `
  <div class="about__body">
    <h2 class="sec-title" id="about-h">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz'da, Ankara Bulvarı üzerinde. ${esc(d.isletme.hakkinda)}</p>
    <ul class="stats" aria-label="Rakamlarla">
      <li class="stat"><p class="stat__num"><b data-count="${yas}">${yas}</b> yıl</p><p class="stat__lbl">Şaşmaz'da</p></li>
      <li class="stat"><p class="stat__num"><b data-count="${acikGun}">${acikGun}</b> gün</p><p class="stat__lbl">haftada açık</p></li>
    </ul>
    ${d.bilgiler?.length ? `<dl class="facts">${d.bilgiler.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
  </div>
  <figure class="about__img"><img src="${esc(ocak.src)}" alt="${esc(ocak.alt)}" loading="lazy" decoding="async" width="1500" height="2000" /><figcaption>Fotoğraf temsilîdir</figcaption></figure>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------
$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="sec-title" id="shop-h">Çalışma saatleri ve konum</h2>
    <p class="shop__status${st.open ? ' is-open' : ''}">${esc(st.metin)}</p>
    <dl class="shop__hours">
      ${liste.map(([g, s]) => `<div class="${bugunMu(g) ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="shop__note">Son sipariş kapanıştan yarım saat önce alınır.</p>
    <p class="shop__addr">${esc(d.iletisim.adres)}</p>
    <div class="shop__cta">
      ${btn('btn--fire', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      ${btn('btn--ghost', telHref(d), icons.phone, tel)}
    </div>
  </div>
  <div class="shop__map" id="map"></div>`;

// --- Örnek yorumlar -----------------------------------------------------------------
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <h2 class="sec-title" id="rev-h">Örnek yorumlar</h2>
    <p class="sec-sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <div class="reviews__grid">
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${icons.star.repeat(Number(y.puan) || 0)}</p>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><span class="rev__av" aria-hidden="true">${esc(y.ad.charAt(0))}</span><b>${esc(y.ad)}</b>${y.konu ? `<span class="rev__konu">${esc(y.konu)}</span>` : ''}</figcaption>
      </figure>`).join('')}
  </div>`;

// --- İletişim: rezervasyon ------------------------------------------------------------
const R = d.rezervasyon || {};
const TUR = R.turler || ['Salon'];
const GUN = d.rezervasyonGunler || ['Bugün', 'Yarın'];
const SAAT = R.saatler || [];
const saatYaz = (s) => String(s).replace(':', '.');
const chips = (key, list, bicim = (x) => x) => list.map((v) => `<button type="button" class="chip" data-key="${key}" data-val="${esc(v)}" aria-pressed="false">${esc(bicim(v))}</button>`).join('');
$('#iletisim').innerHTML = `
  <div class="rez__card">
    <header>
      <h2 class="sec-title" id="rez-h">İletişim</h2>
      <p class="rez__text">Rezervasyon WhatsApp'tan ya da telefonla yapılır. Yer, kişi sayısı, gün ve saat seçilince mesaj hazırlanır.</p>
      <dl class="rez__info">
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
        <div><dt>Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
        <div><dt>Bugün</dt><dd>${esc(st.metin)}</dd></div>
      </dl>
      <div class="rez__btns">
        ${btn('btn--ink', telHref(d), icons.phone, 'Ara')}
        ${btn('btn--line', waHref(d, waPaket), icons.whatsapp, 'Paket sipariş', true)}
      </div>
    </header>
    <form class="rez__form" onsubmit="return false" aria-label="Rezervasyon">
      <fieldset class="rez__group"><legend>Yer</legend><div class="chips">${chips('tur', TUR)}</div></fieldset>
      <fieldset class="rez__group"><legend>Kişi sayısı</legend>
        <div class="stepper">
          <button type="button" data-kisi="-1" aria-label="Bir kişi azalt">−</button>
          <output data-kisi-out aria-live="polite">4</output>
          <button type="button" data-kisi="1" aria-label="Bir kişi artır">+</button>
        </div>
      </fieldset>
      <fieldset class="rez__group"><legend>Gün</legend><div class="chips">${chips('gun', GUN)}</div></fieldset>
      <fieldset class="rez__group"><legend>Saat</legend><div class="chips">${chips('saat', SAAT, saatYaz)}</div></fieldset>
      <div class="rez__preview"><p class="rez__msg" data-rez-msg></p></div>
      <a class="btn btn--fire btn--xl rez__send" data-rez-send target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
    </form>
  </div>`;

const rez = { tur: TUR[0], kisi: 4, gun: GUN[0], saat: SAAT[2] || SAAT[0] };
function rezMsg() {
  const gun = rez.gun.toLocaleLowerCase('tr');
  const saat = saatYaz(rez.saat);
  return /paket/i.test(rez.tur)
    ? `Merhaba, ${gun} saat ${saat} için ${rez.kisi} kişilik paket sipariş vermek istiyorum.`
    : `Merhaba, ${gun} saat ${saat} için ${rez.kisi} kişilik masa ayırtmak istiyorum. Yer: ${rez.tur}.`;
}
function renderRez() {
  $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(rez[c.dataset.key] === c.dataset.val)));
  $('[data-kisi-out]').textContent = rez.kisi;
  const m = rezMsg();
  $('[data-rez-msg]').textContent = m;
  $('[data-rez-send]').href = waHref(d, m);
}
$('#iletisim').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (c) { rez[c.dataset.key] = c.dataset.val; renderRez(); }
  const k = e.target.closest('[data-kisi]');
  if (k) { rez.kisi = clamp(rez.kisi + Number(k.dataset.kisi), 1, 40); renderRez(); }
});
renderRez();

// --- Footer --------------------------------------------------------------------------
$('#foot').innerHTML = `
  <p class="foot__brand">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar temsilîdir (Pexels). Ocak sahnesi bu site için kodla çizildi, temsilîdir. Yorumlar örnektir. Güncel fiyatlar için arayın.</p>`;

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
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const POSES = () => (mobile()
  ? { a: { pos: V(3.4, 1.6, 2.2), look: V(-0.4, -0.75, -0.1), fov: 58 }, b: { pos: V(1.5, 1.25, 2.3), look: V(-0.3, -0.35, 0), fov: 54 } }
  : { a: { pos: V(3.3, 1.05, 3.1), look: V(-0.2, -0.05, -0.2), fov: 42 }, b: { pos: V(0.7, 0.34, 1.55), look: V(0, 0.12, 0), fov: 44 } });
const smooth = (t) => t * t * (3 - 2 * t);
// Sahne durumu: in = şişlerin inişi (0→1, açılışta bir kez), q = künyeden çıkış (kaydırma), cook zamanla artar.
const sahne = { in: reducedMotion ? 1 : 0, q: 0, heat: reducedMotion ? 0.9 : 0.4 };
function state(time) {
  const P = POSES();
  const t = smooth(sahne.q);
  const pos = P.a.pos.clone().lerp(P.b.pos, t);
  const look = P.a.look.clone().lerp(P.b.look, t);
  if (!reducedMotion) { pos.x += Math.sin(time * 0.35) * 0.06; pos.y += Math.sin(time * 0.5) * 0.03; }
  const cook = reducedMotion ? 0.6 : clamp(0.15 + (time % 60) / 40, 0, 0.85);
  return {
    pos, look, fov: P.a.fov + (P.b.fov - P.a.fov) * t,
    heat: sahne.heat, ash: 0.3, skewersIn: sahne.in, hover: 0, skewersOut: 0,
    cook: Math.max(cook, t * 0.9), spin: 0.9, drip: 1.6 * sahne.in, sparks: 0.55 + t * 0.3, smoke: 0.55, koz: 1,
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

// --- Başlık çubuğu ve hareket -------------------------------------------------------------------
const top = $('#ust');
const solid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', solid, { passive: true });
solid();
if (innerWidth < 900) autoHideHeader(top, { offset: 140 });

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  gsap.set('.rack__row', { '--cook': 1 });
} else {
  initSmoothScroll();
  requestAnimationFrame(tick);

  // Açılış: sahne belirir, şişler közün üstüne iner (~1,4 sn), yazılar küçük kaymayla gelir. Kaydırma kilitlenmez.
  gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' });
  gsap.to(sahne, { heat: 0.9, duration: 1.4, ease: 'power2.out' });
  gsap.to(sahne, { in: 1, duration: 1.4, ease: 'power2.out', delay: 0.2 });
  const title = $('.hero__title');
  const split = new SplitText(title, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch-l' });
  split.chars.forEach((c) => c.style.setProperty('--d', `${(Math.random() * 3).toFixed(2)}s`));
  gsap.fromTo(split.chars, { opacity: 0, yPercent: 40, '--lit': 0 }, { opacity: 1, yPercent: 0, '--lit': 1, duration: 0.9, stagger: { each: 0.03, from: 'random' }, ease: 'power3.out' });
  gsap.from('#kunye > :not(h1)', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.2, clearProps: 'all' });

  // Künyeden çıkarken kamera ocağa yaklaşır, sahne kararır.
  ScrollTrigger.create({
    trigger: '#basla', start: 'top top', end: 'bottom top',
    onUpdate: (s) => { sahne.q = s.progress; canvas.style.opacity = String(1 - s.progress * 0.7); },
  });

  // Başlıklar: harfler kor gibi tutuşur (bir kez)
  $$('.sec-title').forEach((el) => {
    const s = new SplitText(el, { type: 'words,chars', wordsClass: 'fw', charsClass: 'fc' });
    gsap.fromTo(s.chars, { '--lit': 0, opacity: 0.25 }, {
      '--lit': 1, opacity: 1, duration: 0.8, stagger: { each: 0.02, from: 'random' }, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });
  // Menü: her satırın şişi ekranın ortasına gelirken pişer
  $$('.rack__row').forEach((row) => {
    gsap.fromTo(row, { '--cook': 0 }, { '--cook': 1, ease: 'none', scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 45%', scrub: true } });
  });
  gsap.fromTo('.about__img img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)), scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' } });
  });
  gsap.fromTo('.rev', { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.reviews__grid', start: 'top 88%', toggleActions: 'play none none none' } });
  addEventListener('load', () => ScrollTrigger.refresh());
}

// Masaüstü: mıknatıslı butonlar (imleç yok)
if (finePointer && !reducedMotion) {
  $$('.hero__cta .btn, .rez__send').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.2);
      my((e.clientY - r.top - r.height / 2) * 0.25);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}
