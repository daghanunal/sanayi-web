import veri from '../../data/manifold.json';
import ek from '../../data/egzoz-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { createScene } from './scene.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, ...ek, preset: 'egzoz-sinematik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const nf = (n, digits = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 760;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toHex = (c) => '#' + c.map((v) => Math.round(clamp(v) * 255).toString(16).padStart(2, '0')).join('');

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-brand]').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri egzoz`;
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = d.isletme.ad.split(/\s+/).map((w) =>
  `<span class="w">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join(' ');

heroTitle.classList.toggle('is-long', d.isletme.ad.length > 16);
const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Şu an açık' : 'Şu an kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Bölümler (duman renkleri)
const CH = [...d.dumanlar.map((x) => ({ ...x, clean: false })), { id: 'temiz', ...d.temiz, renk: 'Temiz', clean: true }];
$('[data-words]').innerHTML = CH.map((c) => `<p class="word word--${esc(c.id)}" data-word>${esc(c.kelime)}</p>`).join('');
$('[data-chapters]').innerHTML = CH.map((c, i) => `
  <article class="chap" data-chap>
    <p class="chap__kicker"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(c.clean ? 'Ölçüm sonrası' : `${c.renk} duman · ${c.anlam}`)}</span></p>
    <h2 class="chap__title">${esc(c.baslik)}</h2>
    <p class="chap__text">${esc(c.metin)}</p>
    ${c.clean
      ? `<a class="chap__wa" href="${esc(telHref(d))}">${icons.phone}<span>Ölçüm için arayın</span></a>`
      : `<a class="chap__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, aracımın egzozundan ${c.hizmet.toLocaleLowerCase('tr')} geliyor, videosunu gönderiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Dumanın videosunu gönderin</span></a>`}
  </article>`).join('');
$('[data-dots]').innerHTML = ['Giriş', ...CH.map((c) => c.renk)].map((n) => `<li><span>${esc(n)}</span></li>`).join('');

// Gösterge
const olc = d.muayene.olcumler;
const dig = (v) => (v % 1 ? 1 : 0);
$('[data-gauge-rows]').innerHTML = olc.map((o) => `
  <div class="g"><span class="g__n">${esc(o.ad)}</span><b class="g__v" data-gv>0</b><small>${esc(o.birim)}</small><i class="g__bar"><i data-gb></i></i></div>`).join('');
const gv = $$('[data-gv]'), gb = $$('[data-gb]');
const verdict = $('[data-verdict]');

// Güven
$('[data-about]').textContent = d.isletme.hakkinda;
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b><span>${esc(s.sonek)}</span></p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');
$('[data-report-title]').textContent = d.muayene.baslik;
$('[data-report-rows]').innerHTML = olc.map((o) => {
  const max = Math.max(o.once, o.sinir) * 1.08;
  return `
  <div class="rr" style="--once:${(o.once / max).toFixed(3)};--sonra:${(o.sonra / max).toFixed(3)};--sinir:${(o.sinir / max).toFixed(3)}">
    <p class="rr__name">${esc(o.ad)} <small>${esc(o.birim)}</small></p>
    <p class="rr__vals"><s>${nf(o.once, dig(o.once))}</s><b>${nf(o.sonra, dig(o.sonra))}</b><span>sınır ${nf(o.sinir, dig(o.sinir))}</span></p>
    <div class="rr__bar"><i class="rr__once"></i><i class="rr__sonra"></i><i class="rr__lim"></i></div>
  </div>`;
}).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__row">
    <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

// Atölye şeridi
$('[data-reel-track]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot${i % 2 ? ' shot--low' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span><i></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad} · Fotoğraflar: Pexels · 3D egzoz bu site için kodla çizildi`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Film anahtar kareleri ------------------------------------------------------
// p: film ilerlemesi. Her bölümün arka planı, yazı rengi, duman rengi ve kamera açısı.
const INK = '#141013';
const KF = [
  { p: 0, bg: '#101013', fg: '#f3f1ec', call: '#ff3b5c', smoke: [0.86, 0.86, 0.88], smoke2: [0.95, 0.95, 0.96], density: 0.42, push: 1.43, spread: 0.9, size: 1, count: 0.75, rise: 1.80, wind: 0.3, rim: [1, 0.23, 0.36], glow: 0, az: 0.75, el: 0.2, dist: 7, lookX: 0.2, lookY: -0.5, dirt: [0.55, 0.45, 0.5, 0.5] },
  { p: 0.2, bg: '#ff3b5c', fg: INK, call: INK, smoke: [0.05, 0.045, 0.05], smoke2: [0.16, 0.12, 0.12], density: 0.95, push: 1.74, spread: 1.25, size: 1.25, count: 1, rise: 2.25, wind: 0.55, rim: [1, 0.85, 0.8], glow: 0.15, az: -0.85, el: 0.16, dist: 6.2, lookX: -0.4, lookY: -0.2, dirt: [1, 0.62, 1, 0.5] },
  { p: 0.38, bg: '#e7e3da', fg: INK, call: '#ff3b5c', smoke: [0.36, 0.45, 0.7], smoke2: [0.58, 0.64, 0.8], density: 0.72, push: 1.49, spread: 1.1, size: 1.2, count: 1, rise: 1.95, wind: -0.4, rim: [0.35, 0.5, 1], glow: 0, az: 0.95, el: 0.28, dist: 6.4, lookX: 0.4, lookY: -0.2, dirt: [0.4, 1, 0.7, 0.4] },
  { p: 0.56, bg: '#14222d', fg: '#f3f1ec', call: '#ff3b5c', smoke: [0.93, 0.95, 0.96], smoke2: [1, 1, 1], density: 0.62, push: 1.30, spread: 1.3, size: 1.45, count: 1, rise: 2.85, wind: 0.2, rim: [0.6, 0.85, 1], glow: 0, az: 0.18, el: 0.1, dist: 6.6, lookX: 0, lookY: -0.2, dirt: [0.3, 0.35, 0.45, 0.3] },
  { p: 0.74, bg: '#eaa53a', fg: INK, call: INK, smoke: [0.17, 0.15, 0.14], smoke2: [0.3, 0.26, 0.22], density: 0.9, push: 1.61, spread: 1.1, size: 1.15, count: 1, rise: 1.80, wind: 0.6, rim: [1, 0.5, 0.15], glow: 0.9, az: -0.7, el: 0.24, dist: 5.8, lookX: -0.5, lookY: -0.2, dirt: [0.5, 0.4, 1, 0.65] },
  { p: 0.92, bg: '#eef1ef', fg: INK, call: '#ff3b5c', smoke: [0.9, 0.92, 0.94], smoke2: [0.95, 0.96, 0.97], density: 0.07, push: 1.12, spread: 0.7, size: 1.4, count: 0.5, rise: 2.40, wind: 0.2, rim: [1, 0.23, 0.36], glow: 0, az: 0.5, el: 0.18, dist: 7.6, lookX: 0.1, lookY: -0.2, dirt: [0, 0, 0, 0] },
  { p: 1 },
];
KF[6] = { ...KF[5], p: 1 };
const FINALE = { bg: '#101013', fg: '#f3f1ec', call: '#ff3b5c', smoke: [0.9, 0.9, 0.92], smoke2: [0.95, 0.95, 0.96], density: 0.16, push: 1.24, spread: 0.8, size: 1, count: 0.6, rise: 2.10, wind: 0.2, rim: [1, 0.23, 0.36], glow: 0, az: 0.12, el: 0.08, dist: 7, lookX: -2.2, lookY: -1.35, dirt: [0, 0, 0, 0] };
const CENTERS = KF.slice(0, 6).map((k) => k.p);
const HOLD = 0.045;

function mixK(a, b, t) {
  const o = {};
  for (const k in a) {
    if (k === 'p') continue;
    const x = a[k], y = b[k];
    if (typeof x === 'number') o[k] = L(x, y, t);
    else if (Array.isArray(x)) o[k] = x.map((v, i) => L(v, y[i], t));
    else o[k] = t < 0.5 ? x : y;
  }
  o.bgRGB = hex(a.bg).map((v, i) => L(v, hex(b.bg)[i], t));
  o.fgRGB = hex(a.fg).map((v, i) => L(v, hex(b.fg)[i], t));
  o.callRGB = hex(a.call).map((v, i) => L(v, hex(b.call)[i], t));
  return o;
}
function filmState(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a.p + (i === 0 ? 0.06 : HOLD), b.p - HOLD));
  return mixK(a, b, t);
}

// --- Sahne -------------------------------------------------------------------
const canvas = $('[data-stage]');
let S = null;
try { S = createScene(canvas, { lite }); } catch (e) { canvas.remove(); }
if (import.meta.env.DEV) window.__ds = S;

const root = document.documentElement;
const backdrop = $('[data-backdrop]');
const wordsBox = $('[data-words]');
const words = $$('[data-word]');
const chaps = $$('[data-chap]');
const dots = $$('[data-dots] li');
const hero = $('[data-hero]');
const gauge = $('[data-gauge]');
const hint = $('[data-hint]');
const film = $('[data-film]');
const finale = $('[data-finale]');
const introMeter = $('[data-intro-meter]');
const introPct = $('[data-intro-pct]');
const chars = $$('.ch', heroTitle);

let filmP = 0, filmTarget = 0, finaleQ = 0, afterFilm = 0, finaleIn = 0;
let introK = reducedMotion ? 1 : 0;
let introDone = reducedMotion;
const t0 = performance.now();

const lenis = initSmoothScroll({ lerp: 0.085 });
if (!reducedMotion) { lenis?.stop(); document.body.classList.add('is-locked'); }
else document.body.classList.remove('is-intro');

function endIntro() {
  if (introDone) return;
  introDone = true;
  document.body.classList.remove('is-intro', 'is-locked');
  lenis?.start();
  gsap.to(introMeter, { autoAlpha: 0, duration: 0.4 });
}
if (!reducedMotion) {
  gsap.set(chars, { yPercent: 110, opacity: 0 });
  gsap.set(['.hero__kicker', '.hero__slogan', '.hero__cta', '.top', '.dots'], { autoAlpha: 0, y: 14 });
  const tl = gsap.timeline({ delay: 1.1 });
  tl.to(chars, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.035 })
    .to(['.hero__kicker', '.hero__slogan', '.hero__cta'], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, '-=0.5')
    .to(['.top', '.dots'], { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', onComplete: endIntro }, '<');
  addEventListener('pointerdown', () => { tl.progress(1); introK = Math.max(introK, 0.999); endIntro(); }, { once: true });
  addEventListener('keydown', () => { tl.progress(1); endIntro(); }, { once: true });
}

// Tetikleyiciler
const trg = {};
function setupTriggers() {
  trg.film = ScrollTrigger.create({ trigger: film, start: 'top top', end: 'bottom bottom' });
  trg.after = ScrollTrigger.create({ trigger: film, start: 'bottom bottom', end: 'bottom 35%' });
  trg.finale = ScrollTrigger.create({ trigger: finale, start: 'top top', end: 'bottom bottom' });
  trg.finaleIn = ScrollTrigger.create({ trigger: finale, start: 'top 90%', end: 'top 20%' });
  trg.finaleOut = ScrollTrigger.create({ trigger: finale, start: 'bottom bottom', end: 'bottom top' });
  ScrollTrigger.create({ trigger: '[data-trust]', start: 'top bottom', end: 'bottom top', onToggle: (s) => root.classList.toggle('is-page', s.isActive || s.progress >= 1) });
}
setupTriggers();

// Sayılar
$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const o = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to(o, { v: to, duration: reducedMotion ? 0 : 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = nf(Math.round(o.v))) }),
  });
});
ScrollTrigger.create({ trigger: '[data-report]', start: 'top 80%', once: true, onEnter: () => $('[data-report]').classList.add('is-on') });
$$('.svc__row, .step, .rev').forEach((el) => {
  ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => el.classList.add('is-in') });
});

// Atölye şeridi yatay kayar
const reel = $('[data-reel]');
const reelTrack = $('[data-reel-track]');
if (!reducedMotion) {
  gsap.to(reelTrack, {
    x: () => -(reelTrack.scrollWidth - innerWidth + 32),
    ease: 'none',
    scrollTrigger: { trigger: reel, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
  });
} else reel.classList.add('is-static');

// Başlık/üst bar
const top = $('[data-top]');
ScrollTrigger.create({ start: 80, onToggle: (s) => top.classList.toggle('is-scrolled', s.isActive) });

// --- Döngü ---------------------------------------------------------------------
let lastBg = '', lastFg = '', lastCall = '', lastLift = 0;
let active = -1;
let frames = 0, slow = 0, qualityDropped = false, lastT = performance.now();

function uiFilm(p, s, time) {
  // kahraman
  const heroOut = seg(p, 0.05, 0.12);
  hero.style.opacity = String(1 - heroOut);
  hero.style.transform = `translate3d(0, ${-heroOut * 60}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  if (introDone) gauge.style.opacity = String(seg(p, 0.07, 0.12) * (1 - seg(p, 0.975, 1)));
  hint.style.opacity = String(introDone ? 1 - seg(p, 0.005, 0.04) : 0);

  // bölümler
  let idx = 0;
  CENTERS.forEach((c, i) => {
    if (i === 0) return;
    const w = 1 - seg(Math.abs(p - c), 0.062, 0.089);
    const card = chaps[i - 1];
    const word = words[i - 1];
    const dir = p < c ? 1 : -1;
    card.style.opacity = String(w);
    card.style.transform = `translate3d(0, ${(1 - w) * 40 * dir}px, 0)`;
    card.style.visibility = w > 0.01 ? 'visible' : 'hidden';
    card.classList.toggle('is-live', w > 0.6);
    const ww = 1 - seg(Math.abs(p - c), 0.05, 0.1);
    word.style.opacity = String(ww);
    word.style.transform = `translate3d(${(p - c) * -260}vw, 0, 0) scale(${1 + (1 - ww) * 0.06})`;
    if (Math.abs(p - c) < 0.09) idx = i;
  });
  if (idx !== active) {
    active = idx;
    dots.forEach((dd, i) => dd.classList.toggle('is-on', i === idx));
  }

  // gösterge
  let fail = false;
  olc.forEach((o, i) => {
    const wob = 1 + Math.sin(time * 3.1 + i * 1.7) * 0.03 * s.dirt[i];
    const v = L(o.sonra, o.once, s.dirt[i]) * wob;
    gv[i].textContent = nf(v, dig(o.once) || dig(o.sonra));
    const max = Math.max(o.once, o.sinir) * 1.05;
    gb[i].style.transform = `scaleX(${clamp(v / max).toFixed(3)})`;
    const f = v > o.sinir;
    gb[i].parentElement.classList.toggle('is-fail', f);
    if (f) fail = true;
  });
  verdict.textContent = fail ? 'Kalır' : 'Geçer';
  verdict.classList.toggle('is-pass', !fail);
}

function tick() {
  const now = performance.now();
  const time = (now - t0) / 1000;
  const dt = now - lastT;
  lastT = now;

  if (!introDone || introK < 1) introK = Math.min(1, introK + dt / 2400);
  const ik = smooth(introK);
  if (!reducedMotion && introPct) introPct.textContent = String(Math.round(ik * 100));

  filmTarget = trg.film?.progress ?? 0;
  filmP = reducedMotion ? filmTarget : L(filmP, filmTarget, 0.14);
  afterFilm = trg.after?.progress ?? 0;
  finaleIn = trg.finaleIn?.progress ?? 0;
  finaleQ = trg.finale?.progress ?? 0;

  let s = filmState(filmP);
  const past = afterFilm > 0 && finaleIn <= 0 ? 1 : 0;
  if (finaleIn > 0) {
    s = mixK({ ...KF[5], bg: KF[5].bg }, FINALE, 1);
  }
  // açılış: yoğun beyaz duman patlaması, sonra incelir
  const burst = (1 - ik);
  s.burst = burst * 1.0;
  s.density = L(s.density, 1, burst * 0.9);
  s.count = L(s.count, 1, burst);
  s.dist += burst * 0.8;
  s.time = time;
  s.ring = finaleIn > 0 ? smooth(seg(finaleQ, 0.02, 0.92)) : 0;
  s.ringAlpha = finaleIn > 0 ? 1 : 0;

  // renkler
  const bg = finaleIn > 0 || afterFilm > 0.5 ? FINALE.bg : toHex(s.bgRGB);
  const fg = finaleIn > 0.3 ? FINALE.fg : afterFilm > 0.02 ? INK : toHex(s.fgRGB);
  const call = toHex(s.callRGB);
  if (bg !== lastBg) { backdrop.style.background = bg; root.style.setProperty('--bgc', bg); lastBg = bg; }
  if (fg !== lastFg) { root.style.setProperty('--fg', fg); lastFg = fg; }
  if (call !== lastCall) { root.style.setProperty('--call', call); lastCall = call; }

  // canvas görünürlüğü
  const vis = finaleIn > 0 ? smooth(finaleIn) : 1 - smooth(afterFilm);
  canvas.style.opacity = vis.toFixed(3);
  const lift = Math.round((trg.finaleOut?.progress ?? 0) * innerHeight);
  if (lift !== lastLift) { canvas.style.transform = lift ? `translate3d(0, ${-lift}px, 0)` : ''; lastLift = lift; }
  wordsBox.style.opacity = (1 - smooth(afterFilm)) * (finaleIn > 0 ? 0 : 1);
  root.classList.toggle('is-past', past === 1);

  if (afterFilm < 1 || finaleIn > 0) uiFilm(filmP, s, time);

  if (S && vis > 0.01 && !document.hidden) {
    S.render(s);
    // zayıf cihazda kaliteyi düşür
    if (!qualityDropped && introDone) {
      frames++;
      if (dt > 30) slow++;
      if (frames > 90) {
        if (slow / frames > 0.35) { S.setQuality(true); qualityDropped = true; }
        frames = 0; slow = 0;
      }
    }
  }
}
gsap.ticker.add(tick);

addEventListener('resize', () => { S?.resize(); });
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
