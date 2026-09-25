import temel from '../../data/sektor-restoran.json';
import ek from '../../data/restoran-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, isletme: { ...temel.isletme }, iletisim: { ...temel.iletisim } });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const low = (s) => s.toLocaleLowerCase('tr');

// "1998'den", "2004'ten", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const ad = d.isletme.ad;
const binds = { ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$$('[data-wa-rez]').forEach((a) => (a.href = waHref(d, `Merhaba ${ad}, masa ayırtmak istiyorum. Gün, saat ve kişi sayısı: `)));
$$('[data-wa-paket]').forEach((a) => (a.href = waHref(d, `Merhaba ${ad}, paket sipariş vermek istiyorum: `)));
$('.top__brand').setAttribute('aria-label', `${ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Etimesgut, ${ablative(d.isletme.kurulus)} beri aynı ocak`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = ad;
$('[data-intro-name]').textContent = ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Ocak yanıyor' : 'Şu an kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film bölümleri
const CH = d.film;
$('[data-chapters]').innerHTML = CH.map((c, i) => `
  <article class="ch" data-ch>
    <p class="ch__kicker"><span>${String(i + 1).padStart(2, '0')}</span>${esc(c.kicker)}</p>
    <h2 class="ch__title">${esc(c.baslik)}</h2>
    <p class="ch__text">${esc(c.metin)}</p>
    ${c.secenekler ? `<ul class="ch__chips">${c.secenekler.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
  </article>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Menü rafı
$('[data-fiyat]').textContent = d.fiyatNotu;
$('[data-rack]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="rack__row">
    <span class="rack__n">${String(i + 1).padStart(2, '0')}</span>
    <div class="rack__body">
      <h3 class="rack__name">${esc(s.baslik)}</h3>
      <p class="rack__desc">${esc(s.aciklama.replace(/ustamız/g, "usta"))}</p>
    </div>
    <p class="rack__time">${esc(s.sure)}</p>
    <span class="rack__sis" aria-hidden="true"><i></i></span>
  </li>`).join('');

// Fotoğraf şeridi
const REEL = ['meze-bakir', 'lahmacun', 'kor-sis', 'meze-masa', 'servis', 'firin', 'kebap-tabak', 'cay', 'salon'];
const gal = REEL.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.`))).filter(Boolean);
$('[data-reel-track]').innerHTML = gal.map((g, i) => `
  <figure class="reel__item${i % 3 === 1 ? ' is-tall' : ''}">
    <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" />
    <figcaption>${esc(g.alt)}</figcaption>
  </figure>`).join('');

// Salon
$('[data-salon-title]').textContent = d.salon.baslik;
$('[data-salon-text]').textContent = d.salon.metin;
$('[data-salon-list]').innerHTML = d.salon.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');
const SEATS = 40;
$('[data-seats]').innerHTML = `<div class="seats__table"></div>${Array.from({ length: SEATS }, (_, i) => `<i style="--i:${i}"></i>`).join('')}<p class="seats__n"><b data-seat-n>0</b> kişi</p>`;

// Rezervasyon
const R = d.rezervasyon;
$('[data-rez-title]').textContent = R.baslik;
$('[data-rez-text]').textContent = R.metin;
const rez = { tur: R.turler[0], kisi: 4, gun: R.gunler[0], saat: R.saatler[2] };
const chips = (key, list) => list.map((v) => `<button type="button" class="chip" data-key="${key}" data-val="${esc(v)}" aria-pressed="false">${esc(v)}</button>`).join('');
$('[data-rez-tur]').innerHTML = chips('tur', R.turler);
$('[data-rez-gun]').innerHTML = chips('gun', R.gunler);
$('[data-rez-saat]').innerHTML = chips('saat', R.saatler);
function rezMsg() {
  const paket = /paket/i.test(rez.tur);
  const gun = low(rez.gun);
  return paket
    ? `Merhaba ${ad}, ${gun} saat ${rez.saat} için ${rez.kisi} kişilik paket sipariş vermek istiyorum. Siparişim: `
    : `Merhaba ${ad}, ${gun} saat ${rez.saat} için ${rez.kisi} kişilik ${low(rez.tur)} rezervasyonu yapmak istiyorum. Adım: `;
}
function renderRez() {
  $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(rez[c.dataset.key] === c.dataset.val)));
  $('[data-kisi-out]').textContent = rez.kisi;
  const m = rezMsg();
  $('[data-rez-msg]').textContent = m;
  $('[data-rez-send]').href = waHref(d, m);
}
document.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (c) {
    rez[c.dataset.key] = c.dataset.val;
    renderRez();
  }
  const k = e.target.closest('[data-kisi]');
  if (k) {
    rez.kisi = clamp(rez.kisi + Number(k.dataset.kisi), 1, 40);
    renderRez();
  }
});
renderRez();

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><span class="rev__av">${esc(y.ad.charAt(0))}</span><b>${esc(y.ad)}</b></figcaption>
  </figure>`).join('');

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${ad}`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera pozları. Mobilde mangalın boyuna bakan dar açı.
const POSES = () => {
  const m = mobile();
  return {
    hero: m
      ? { pos: V(3.4, 1.6, 2.2), look: V(-0.4, -0.75, -0.1), fov: 58 }
      : { pos: V(3.3, 1.05, 3.1), look: V(-0.2, -0.05, -0.2), fov: 42 },
    ates: m
      ? { pos: V(1.1, 0.8, 1.3), look: V(-0.3, -0.7, -0.1), fov: 58 }
      : { pos: V(1.2, 0.7, 1.7), look: V(0, -0.2, 0), fov: 44 },
    et: m
      ? { pos: V(0.9, 2.0, 2.9), look: V(0, 0.2, 0), fov: 58 }
      : { pos: V(-0.4, 1.9, 3.6), look: V(0, 0.6, 0), fov: 40 },
    siparis: m
      ? { pos: V(1.9, 1.4, 2.4), look: V(-0.1, -0.45, 0), fov: 56 }
      : { pos: V(-1.9, 1.2, 3.0), look: V(0, 0.05, 0), fov: 40 },
    kozde: m
      ? { pos: V(2.3, 0.62, 0.85), look: V(0.3, -0.2, 0), fov: 56 }
      : { pos: V(0.7, 0.34, 1.55), look: V(0, 0.12, 0), fov: 44 },
    kozde2: m
      ? { pos: V(1.5, 1.25, 2.3), look: V(-0.3, -0.35, 0), fov: 54 }
      : { pos: V(-1.4, 0.55, 1.9), look: V(0.3, 0.1, 0), fov: 42 },
    masa: m
      ? { pos: V(0.1, 4.6, 1.3), look: V(0, 0, -0.6), fov: 60 }
      : { pos: V(0, 4.8, 1.3), look: V(0, 0, 0), fov: 48 },
  };
};
const KF = [
  [0.0, 'hero'], [0.07, 'hero'], [0.13, 'ates'], [0.24, 'ates'], [0.3, 'et'], [0.4, 'et'],
  [0.47, 'siparis'], [0.56, 'siparis'], [0.61, 'kozde'], [0.7, 'kozde2'], [0.76, 'kozde2'], [0.84, 'masa'], [1.0, 'masa'],
];
const CR = [[0.08, 0.24], [0.26, 0.4], [0.42, 0.56], [0.58, 0.76], [0.78, 0.87]];

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = P[a[1]], B = P[b[1]];
  return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

let introHeat = 0;
function filmState(p, time, vel) {
  const pose = filmPose(p);
  const sway = 0.06;
  pose.pos.x += Math.sin(time * 0.35) * sway;
  pose.pos.y += Math.sin(time * 0.5) * sway * 0.5;
  const drip = seg(p, 0.6, 0.63) * (1 - seg(p, 0.78, 0.8));
  const cook = smooth(seg(p, 0.57, 0.77));
  return {
    ...pose,
    heat: L(introHeat, 1, smooth(seg(p, 0.07, 0.2))),
    ash: seg(p, 0.14, 0.24) * 0.45,
    skewersIn: seg(p, 0.26, 0.36),
    hover: 1 - smooth(seg(p, 0.43, 0.5)),
    skewersOut: seg(p, 0.8, 0.9),
    cook,
    spin: seg(p, 0.5, 0.56) * (1.1 + vel * 3),
    drip: drip * 2.2,
    sparks: 0.35 + seg(p, 0.08, 0.2) * 0.4 + drip * 0.4,
    smoke: 0.3 + cook * 0.7 * (1 - seg(p, 0.86, 0.95)),
    koz: 1,
  };
}

function finaleState(q, time) {
  const m = mobile();
  const a = time * 0.05 + q * 0.6;
  const r = m ? 4.6 : 5;
  return {
    pos: V(Math.sin(a) * r * 0.7, m ? 2.7 : 1.7, Math.cos(a) * r * 0.55 + 1.2),
    look: V(0, m ? -0.5 : -0.1, -0.2), fov: m ? 56 : 42,
    heat: 1, ash: 0.35, skewersIn: 0, hover: 0, skewersOut: 1, cook: 1, spin: 0, drip: 0,
    sparks: 1, smoke: 0.5, koz: 1,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const chEls = $$('[data-ch]');
const hud = $('[data-hud]');
const hudClock = $('[data-hud-clock]'), hudKicker = $('[data-hud-kicker]');
const doneFill = $('[data-done-fill]'), doneState = $('[data-done-state]');
const plate = $('[data-plate]'), plateCap = $('[data-plate-cap]');
const hint = $('[data-hint]');
const heatEl = $('[data-heat]');

const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const CLK = CH.map((c) => toMin(c.saat));
function clockAt(p) {
  let i = CR.findIndex(([, b]) => p < b);
  if (i < 0) i = CR.length - 1;
  const [a, b] = CR[i];
  const next = CLK[i + 1] ?? CLK[i] + 2;
  const m = Math.round(L(CLK[i], next - (i < CLK.length - 1 ? 1 : 0), seg(p, a, b)));
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
const LBL = d.pismeEtiketleri;
function doneness(p) {
  if (p < 0.5) return 0;
  return L(0.12, 1, smooth(seg(p, 0.57, 0.77)));
}
let lastClock = '', lastKicker = -1, lastDone = '';
function filmUI(p) {
  const heroOut = seg(p, 0.05, 0.09);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0.0, 0.03);

  let active = -1;
  chEls.forEach((el, i) => {
    const [a, b] = CR[i];
    const vin = seg(p, a, a + 0.025), vout = seg(p, b - 0.02, b);
    const v = vin * (1 - vout);
    el.style.opacity = v;
    el.style.transform = `translate3d(0, ${(1 - vin) * 36 - vout * 30}px, 0)`;
    el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    el.style.setProperty('--in', seg(p, a, a + 0.05));
    if (p >= a - 0.01 && p < b + 0.01) active = i;
  });

  const hudOn = seg(p, 0.07, 0.09) * (1 - seg(p, 0.86, 0.88));
  hud.style.opacity = hudOn;
  hud.style.visibility = hudOn > 0.01 ? 'visible' : 'hidden';
  if (hudOn > 0.01) {
    const c = clockAt(p);
    if (c !== lastClock) { hudClock.textContent = c; lastClock = c; }
    if (active >= 0 && active !== lastKicker) { hudKicker.textContent = CH[active].kicker; lastKicker = active; }
    const dn = doneness(p);
    doneFill.style.transform = `scaleX(${dn})`;
    const lb = dn < 0.05 ? LBL[0] : dn < 0.35 ? LBL[1] : dn < 0.7 ? LBL[2] : dn < 0.97 ? LBL[3] : LBL[4];
    if (lb !== lastDone) { doneState.textContent = lb; lastDone = lb; }
    hud.style.setProperty('--dn', dn);
  }

  // Tabak: daire açılır, fotoğraf büyür
  const pl = smooth(seg(p, 0.86, 0.95));
  plate.style.visibility = pl > 0.001 ? 'visible' : 'hidden';
  plate.style.clipPath = `circle(${(pl * 78).toFixed(2)}% at 50% 55%)`;
  plate.firstElementChild.style.transform = `scale(${L(1.35, 1, pl)}) rotate(${L(-12, 0, pl)}deg)`;
  const cap = seg(p, 0.93, 0.97);
  plateCap.style.opacity = cap;
  plateCap.style.visibility = cap > 0.01 ? 'visible' : 'hidden';
  plateCap.style.transform = `translate3d(0, ${(1 - cap) * 30}px, 0)`;
  heatEl.style.opacity = 0.35 + seg(p, 0.07, 0.2) * 0.4 + seg(p, 0.6, 0.64) * (1 - seg(p, 0.78, 0.82)) * 0.25;
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch-l' });
split.chars.forEach((c) => c.style.setProperty('--d', `${(Math.random() * 3).toFixed(2)}s`));

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
let filmActive = true, finaleActive = false;
let vel = 0, canvasFinale = 0;
let filmST = null, finaleST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  filmST = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: film, start: 'bottom bottom', end: 'bottom 40%',
    onUpdate: (self) => (canvas.style.opacity = 1 - self.progress),
  });
  finaleST = ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'top 30%',
    onUpdate: (self) => (canvasFinale = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 70px',
    endTrigger: '[data-finale]', end: 'top 70px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar: harfler kor gibi tutuşur
  $$('[data-flame]').forEach((el) => {
    const s = new SplitText(el, { type: 'words,chars', wordsClass: 'fw', charsClass: 'fc' });
    gsap.fromTo(s.chars, { '--lit': 0, opacity: 0.25 }, {
      '--lit': 1, opacity: 1, duration: 0.9, stagger: { each: 0.025, from: 'random' }, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.14 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.2, yPercent: -6 }, {
    scale: 1, yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.salon__img img', { scale: 1.2, yPercent: -6 }, {
    scale: 1, yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.salon__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // Menü: her satırın şişi ekranın ortasına gelirken pişer
  $$('.rack__row').forEach((row) => {
    gsap.fromTo(row, { '--cook': 0 }, {
      '--cook': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 40%', scrub: true },
    });
  });
  // Fotoğraf şeridi: dikey kaydırma yatay yolculuğa döner
  const reel = $('[data-reel]');
  const track = $('[data-reel-track]');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + 32);
  const sizeReel = () => (reel.style.height = `${dist() + innerHeight}px`);
  sizeReel();
  ScrollTrigger.addEventListener('refreshInit', sizeReel);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: reel, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
  });
  $$('.reel__item img').forEach((img) => img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true }));
  // Salon: sandalyeler dolar
  const seatEls = $$('[data-seats] i');
  const seatN = $('[data-seat-n]');
  const so = { v: 0 };
  gsap.to(so, {
    v: SEATS, ease: 'none',
    scrollTrigger: { trigger: '[data-seats]', start: 'top 85%', end: 'bottom 45%', scrub: true },
    onUpdate: () => {
      const n = Math.round(so.v);
      seatN.textContent = n;
      seatEls.forEach((s, i) => s.classList.toggle('is-on', i < n));
    },
  });
  gsap.fromTo('.rev', { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-reviews]', start: 'top 85%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', wordsClass: 'fw', charsClass: 'fc' });
  gsap.fromTo(fsplit.chars, { '--lit': 0, opacity: 0.2, yPercent: 30 }, {
    '--lit': 1, opacity: 1, yPercent: 0, duration: 0.8, stagger: { each: 0.016, from: 'center' }, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 45%', once: true },
  });
}

let lastT = performance.now();
let offscreenFrames = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;

  if (filmST) {
    filmActive = filmST.progress < 1;
    finaleActive = (finaleST.progress > 0 && finaleST.progress < 1) || finaleST.isActive;
  }
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  if (filmActive || filmP < 0.999) filmUI(filmP);

  const showFilm = filmActive && canvas.style.opacity !== '0' && filmP < 0.975;
  const showFinale = finaleActive || canvasFinale > 0.001;
  if (showFinale && !filmActive) {
    canvas.style.opacity = canvasFinale;
    S.update(finaleState(finaleQ, time), now);
  } else if (showFilm) {
    S.update(filmState(filmP, time, vel), now);
  } else offscreenFrames++;

  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());

// Masaüstü: imleç ve mıknatıslı butonlar
if (finePointer && !reducedMotion) {
  const cur = $('[data-cursor]');
  const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); });
  document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hover', !!e.target.closest('a, button')));
  document.body.classList.add('has-cursor');
  $$('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.25);
      my((e.clientY - r.top - r.height / 2) * 0.3);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

// --- Açılış: karanlıkta tek kor, saat 06:00'ya gelir, ateş tutuşur ------------

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { opacity: 0, yPercent: 40, '--lit': 0 }, { opacity: 1, yPercent: 0, '--lit': 1, duration: 1.1, stagger: { each: 0.035, from: 'random' }, ease: 'power3.out' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.35);
}

function runIntro() {
  const intro = $('[data-intro]');
  const clock = $('[data-intro-clock]');
  let done = false;
  const o = { m: toMin('05:40') };
  const endM = CLK[0];
  const tl = gsap.timeline();
  tl.fromTo('[data-ember]', { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
  tl.fromTo('[data-intro-center]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.1);
  tl.to(o, { m: endM, duration: 1.3, ease: 'power2.inOut', onUpdate: () => {
    const m = Math.round(o.m);
    clock.textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  } }, 0.2);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000, 0));
  }, [], 0.3);
  tl.add(finish, 1.65);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    clock.textContent = CH[0].saat;
    const ih = { v: 0 };
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .to(['[data-intro-line]', '.intro__skip'], { opacity: 0, duration: 0.2 }, 0)
      .to('[data-ember]', { scale: 60, duration: 0.9, ease: 'power3.in' }, 0.05)
      .to('[data-flash]', { opacity: 1, duration: 0.35, ease: 'power2.in' }, 0.55)
      .to(ih, { v: 0.85, duration: 1.4, ease: 'power2.out', onUpdate: () => (introHeat = ih.v) }, 0.7)
      .set(['[data-ember]', '[data-intro-center]'], { opacity: 0 }, 0.9)
      .to(intro, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.6 }, 0.9)
      .to('[data-flash]', { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.9)
      .call(heroIn, [], 1.0);
    document.body.classList.remove('is-loading');
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

// --- Hareket azaltma -----------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  introHeat = 0.9;
  S.compile();
  const still = () => S.update({ ...filmState(0, 0, 0), heat: 0.9 });
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  gsap.set('.rack__row', { '--cook': 1 });
  $$('[data-seats] i').forEach((s) => s.classList.add('is-on'));
  $('[data-seat-n]').textContent = SEATS;
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
