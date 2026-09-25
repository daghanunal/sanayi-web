import veri from '../../data/sektor-lpg.json';
import ek from '../../data/lpg-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { createScene } from './scene.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, ...ek, preset: 'lpg-sinematik' });
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
$('[data-since]').innerHTML = `<span>Şaşmaz Oto Sanayi</span><span>${esc(ablative(d.isletme.kurulus))} beri yalnızca LPG</span>`;
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = d.isletme.ad.split(/\s+/).map((w) =>
  `<span class="w">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join(' ');
heroTitle.classList.toggle('is-long', d.isletme.ad.length > 15);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Şu an açık' : 'Şu an kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Bölümler
const CH = d.bolumler;
$('[data-chapters]').innerHTML = CH.map((c, i) => `
  <article class="chap chap--${esc(c.id)}" data-chap>
    <p class="chap__kicker"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(c.durak)} · ${esc(c.kicker)}</span></p>
    <h2 class="chap__title">${esc(c.baslik)}</h2>
    <p class="chap__text">${esc(c.metin)}</p>
    <a class="chap__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${c.wa} için bilgi almak istiyorum. Aracım: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu iş için yazın</span></a>
  </article>`).join('');
$('[data-route-stops]').innerHTML = CH.map((c) => `<li><i></i><span>${esc(c.durak)}</span></li>`).join('');

// Güven
$('[data-trust-title]').textContent = `${yil} yıldır tek iş: aracınızı gazla yürütmek.`;
$('[data-about]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = d.garanti;
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s, i) => `
  <li class="stat${(nf(s.deger) + s.sonek).length > 5 ? ' stat--long' : ''}" style="--i:${i}">
    <svg class="stat__arc" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="stat__track"/><circle cx="60" cy="60" r="52" class="stat__val" pathLength="100"/></svg>
    <p class="stat__num"><b data-count="${Number(s.deger)}">0</b><span>${esc(s.sonek)}</span></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__item">
    <p class="svc__top"><span class="svc__n">${String(i + 1).padStart(2, '0')}</span><span class="svc__time">${esc(s.sure)}</span></p>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
  </li>`).join('');

// Süreç
$('[data-evrak-title]').textContent = d.evrakBaslik;
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="pstep" data-pstep><span class="pstep__n">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');

// Atölye mozaiği
const pick = [0, 2, 4, 1, 5, 3, 8, 13];
$('[data-mosaic]').innerHTML = pick.map((k, i) => d.galeri[k]).filter(Boolean).map((g, i) => `
  <figure class="tile tile--${i}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Number(y.puan) || 5)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span><i></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-final-kicker]').textContent = `${d.isletme.ad} · ${d.iletisim.telefon}`;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad} · Fotoğraflar: Pexels · 3D sahne bu site için kodla çizildi`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Film anahtar kareleri -------------------------------------------------------
const NIGHT = '#04061a', ICE = '#dfe8f1', INK = '#0b1330', LIGHT = '#eef3ff';
const base = { fill: 0.8, flow: 0, speed: 0.1, regGlow: 0, inj: 0, burn: 0, amber: 0, rim: 2, env: 0.9, flat: 1, tank: 1, flame: 0, pd: 1.7, fx: 0.9, fy: 1.1 };
const KF = [
  { ...base, p: 0, bg: NIGHT, fg: LIGHT, call: '#2447ff', cam: [0, 0.1, 5.6], look: [0, 0, 0], pd: 2.05, fx: 1.35, fy: 1.6, flat: 0, tank: 0, flame: 1, rim: 3, env: 0.35 },
  { ...base, p: 0.16, bg: ICE, fg: INK, call: '#2447ff', cam: [2.6, 2.9, 3.6], look: [0.1, -0.1, 0], pd: 1.95, fx: 1.3, fy: 1.5 },
  { ...base, p: 0.32, bg: '#ffb21e', fg: INK, call: INK, cam: [2.3, 1.6, 2.2], look: [1.0, 0.4, 0.05], pd: 1.6, fx: 1.1, fy: 1.35, fill: 0.5, flow: 1, speed: 0.08, env: 1 },
  { ...base, p: 0.48, bg: '#2447ff', fg: '#ffffff', call: INK, cam: [5.4, 1.5, 1.0], look: [3.75, 0.55, -0.6], pd: 1.9, fx: 1.0, fy: 1.35, flow: 1, speed: 0.08, regGlow: 1, rim: 1, env: 0.9 },
  { ...base, p: 0.64, bg: '#070a18', fg: LIGHT, call: '#2447ff', cam: [8.4, 1.95, 3.0], look: [6.95, 0.45, -0.35], pd: 2.1, fx: 1.1, fy: 1.35, flow: 1, speed: 0.1, inj: 1, rim: 3.5, env: 0.55 },
  { ...base, p: 0.8, bg: '#e6eef5', fg: INK, call: '#2447ff', cam: [12.95, 1.65, 4.15], look: [11.6, 0.5, -0.3], pd: 2.25, fx: 1.0, fy: 1.35, flow: 0.4, inj: 0.4, burn: 1, amber: 0.3, env: 1 },
  { ...base, p: 0.95, bg: NIGHT, fg: LIGHT, call: '#2447ff', cam: [6.6, 10.5, 21.4], look: [5.8, 0.2, -0.3], pcam: [15.5, 6.5, 7.5], pd: 1, fx: 1.95, fy: 1.2, flow: 1, inj: 1, burn: 1, regGlow: 0.7, rim: 3, env: 0.6 },
];
KF.forEach((k) => { k.pcam ||= k.cam; });
KF.push({ ...KF[6], p: 1 });
const FINALE = { ...KF[0], cam: [0, 0.05, 5.2], pcam: [0, 0.05, 5.2], pd: 2.1, fx: 0, fy: 2.0, env: 0.3 };
const CENTERS = KF.slice(0, 7).map((k) => k.p);
const HOLD = 0.04;

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
  const t = smooth(seg(p, a.p + (i === 0 ? 0.03 : HOLD), b.p - HOLD));
  const s = mixK(a, b, t);
  // alev tanka dönüşürken: önce alev söner, sonra tank belirir
  if (i === 0) {
    s.flame = 1 - smooth(seg(t, 0, 0.55));
    s.tank = smooth(seg(t, 0.3, 0.9));
  }
  return s;
}

// --- Sahne -------------------------------------------------------------------------
const canvas = $('[data-stage]');
let S = null;
try { S = createScene(canvas, { lite }); } catch (e) { canvas.remove(); }
if (import.meta.env.DEV) window.__ls = S;

const root = document.documentElement;
const backdrop = $('[data-backdrop]');
const chaps = $$('[data-chap]');
const chapBox = $('[data-chapters]');
const stops = $$('[data-route-stops] li');
const routeFill = $('[data-route-fill]');
const routeDot = $('[data-route-dot]');
const route = $('[data-route]');
const hero = $('[data-hero]');
const meter = $('[data-meter]');
const hint = $('[data-hint]');
const film = $('[data-film]');
const ignite = $('[data-ignite]');
const ignitePct = $('[data-ignite-pct]');
const chars = $$('.ch', heroTitle);
const mHal = $('[data-m-hal]'), mBar = $('[data-m-bar]'), mTemp = $('[data-m-temp]');
const seqLis = $$('[data-seq] li');

let filmP = 0, afterFilm = 0, finaleIn = 0, finaleQ = 0;
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
  gsap.to(ignite, { autoAlpha: 0, duration: 0.4 });
}
if (!reducedMotion) {
  gsap.set(chars, { yPercent: 115, opacity: 0 });
  gsap.set(['.hero__kicker', '.hero__slogan', '.hero__cta', '.top', '.route'], { autoAlpha: 0, y: 14 });
  const tl = gsap.timeline({ delay: 1.3 });
  tl.to(chars, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.035 })
    .to(['.hero__kicker', '.hero__slogan', '.hero__cta'], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, '-=0.55')
    .to(['.top', '.route'], { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', onComplete: endIntro }, '<');
  const skip = () => { tl.progress(1); introK = 1; endIntro(); };
  addEventListener('pointerdown', skip, { once: true });
  addEventListener('keydown', skip, { once: true });
  addEventListener('wheel', skip, { once: true, passive: true });
}

// Tetikleyiciler
const trg = {};
trg.film = ScrollTrigger.create({ trigger: film, start: 'top top', end: 'bottom bottom' });
trg.after = ScrollTrigger.create({ trigger: film, start: 'bottom bottom', end: 'bottom 35%' });
trg.finale = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top top', end: 'bottom bottom' });
trg.finaleIn = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top 85%', end: 'top 15%' });

// Sayılar + yaylar
$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const o = { v: 0 };
  const li = el.closest('.stat');
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => {
      li.classList.add('is-on');
      gsap.to(o, { v: to, duration: reducedMotion ? 0 : 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = nf(Math.round(o.v))) });
    },
  });
});
$$('.svc__item, .rev, .tile').forEach((el) => {
  ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => el.classList.add('is-in') });
});

// Süreç borusu: gaz ilerledikçe adımlar yanar
const pathEl = $('[data-path]');
const gas = $('[data-gas]');
const psteps = $$('[data-pstep]');
if (!reducedMotion) {
  ScrollTrigger.create({
    trigger: pathEl, start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => {
      const p = st.progress;
      gas.style.strokeDashoffset = String(1000 - p * 1000);
      pathEl.style.setProperty('--gp', p.toFixed(3));
      psteps.forEach((el, i) => el.classList.toggle('is-on', p >= (i / psteps.length) * 0.92 + 0.02));
    },
  });
} else {
  pathEl.classList.add('is-static');
  psteps.forEach((el) => el.classList.add('is-on'));
}

// Mozaik: hafif paralaks
if (!reducedMotion && innerWidth >= 760) {
  $$('.tile').forEach((t, i) => {
    gsap.fromTo(t.querySelector('img'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

const top = $('[data-top]');
const onScrolled = () => top.classList.toggle('is-scrolled', scrollY > 80);
addEventListener('scroll', onScrolled, { passive: true });
onScrolled();
// koyu bölümlerin (süreç, final) üstünde üst bar da koyulaşsın
const darkOn = new Set();
$$('.path, .finale').forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 60px', end: 'bottom 60px',
    onToggle: (st) => { st.isActive ? darkOn.add(sec) : darkOn.delete(sec); top.classList.toggle('is-dark', darkOn.size > 0); },
  });
});

// --- Döngü ------------------------------------------------------------------------------
let lastBg = '', lastFg = '', lastCall = '';
let active = -2, lastFiring = -9, lastHal = '';
let frames = 0, slow = 0, qualityDropped = false, lastT = performance.now();

function chapterIdx(p) {
  let idx = -1;
  CENTERS.forEach((c, i) => { if (i > 0 && Math.abs(p - c) < 0.07) idx = i - 1; });
  return idx;
}

function uiFilm(p, s) {
  const heroOut = seg(p, 0.025, 0.08);
  hero.style.opacity = String(1 - heroOut);
  hero.style.transform = `translate3d(0, ${-heroOut * 60}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = String(introDone ? 1 - seg(p, 0.004, 0.03) : 0);
  const mv = seg(p, 0.1, 0.15) * (1 - seg(p, 0.975, 1));
  meter.style.opacity = String(mv);
  meter.style.visibility = mv > 0.01 ? 'visible' : 'hidden';

  let maxW = 0;
  CENTERS.forEach((c, i) => {
    if (i === 0) return;
    const w = 1 - seg(Math.abs(p - c), 0.04, 0.07);
    const card = chaps[i - 1];
    const dir = p < c ? 1 : -1;
    card.style.opacity = String(w);
    card.style.transform = `translate3d(0, ${(1 - w) * 46 * dir}px, 0)`;
    card.style.visibility = w > 0.01 ? 'visible' : 'hidden';
    maxW = Math.max(maxW, w);
  });
  chapBox.style.setProperty('--scrim', maxW.toFixed(3));

  // güzergâh
  const rp = seg(p, CENTERS[1], CENTERS[6]);
  routeFill.style.transform = `scaleX(${rp.toFixed(4)})`;
  routeDot.style.left = `${(rp * 100).toFixed(2)}%`;
  const idx = chapterIdx(p);
  if (idx !== active) {
    active = idx;
    stops.forEach((st, i) => {
      st.classList.toggle('is-on', i === idx);
      st.classList.toggle('is-past', i < idx || (idx === -1 && p > CENTERS[i + 1]));
    });
    const c = CH[Math.max(0, idx)];
    if (c && c.hal !== lastHal) {
      lastHal = c.hal;
      mHal.textContent = c.hal;
      mBar.textContent = c.basinc;
      mTemp.textContent = c.sicaklik;
      meter.classList.remove('is-flip');
      void meter.offsetWidth;
      meter.classList.add('is-flip');
    }
  }
  if (s.firing !== lastFiring) {
    lastFiring = s.firing;
    // ORDER: 0,2,3,1 → görüntülenen sıra 1-3-4-2 ; firing = enjektör indeksi
    const pos = [0, 3, 1, 2][s.firing] ?? -1;
    seqLis.forEach((li, i) => li.classList.toggle('is-fire', i === pos));
  }
}

const mobileQ = matchMedia('(max-width: 759px)');
function tick() {
  const now = performance.now();
  const time = (now - t0) / 1000;
  const dt = now - lastT;
  lastT = now;

  if (introK < 1) introK = Math.min(1, introK + dt / 2600);
  const ik = smooth(introK);
  if (!reducedMotion && ignitePct && introK < 1) ignitePct.textContent = String(Math.round(ik * 100));

  const target = trg.film?.progress ?? 0;
  filmP = reducedMotion ? target : L(filmP, target, 0.12);
  afterFilm = trg.after?.progress ?? 0;
  finaleIn = trg.finaleIn?.progress ?? 0;
  finaleQ = trg.finale?.progress ?? 0;

  let s = finaleIn > 0 ? mixK(FINALE, FINALE, 0) : filmState(filmP);
  if (finaleIn > 0) {
    s.flame = smooth(finaleIn);
    s.tank = 0;
    s.flat = 0;
    s.solo = true;
    s.cam = s.pcam = [0, 0.05 - finaleQ * 0.4, 5.2 - finaleQ * 1.1];
  }
  // açılış: kıvılcımdan halka
  s.flame *= reducedMotion ? 1 : L(0.02, 1, ik);
  s.time = time;
  s.firing = -1;

  const bg = finaleIn > 0 ? NIGHT : afterFilm > 0.5 ? '#eef3f8' : toHex(s.bgRGB);
  const fg = finaleIn > 0 ? LIGHT : afterFilm > 0.5 ? INK : toHex(s.fgRGB);
  const call = toHex(s.callRGB);
  if (bg !== lastBg) { backdrop.style.background = bg; root.style.setProperty('--bgc', bg); lastBg = bg; }
  if (fg !== lastFg) { root.style.setProperty('--fg', fg); lastFg = fg; }
  if (call !== lastCall) { root.style.setProperty('--call', call); lastCall = call; }
  root.classList.toggle('is-page', afterFilm > 0.5 && finaleIn <= 0);

  const vis = finaleIn > 0 ? smooth(finaleIn) : 1 - smooth(afterFilm);
  canvas.style.opacity = vis.toFixed(3);
  chapBox.style.opacity = String(1 - seg(afterFilm, 0, 0.25));
  route.style.opacity = String(introDone ? (mobileQ.matches ? smooth(seg(filmP, 0.03, 0.09)) : 1) * (1 - smooth(seg(afterFilm, 0, 0.3))) : 0);

  if (S && vis > 0.01 && !document.hidden) {
    S.render(s);
    if (!qualityDropped && introDone) {
      frames++;
      if (dt > 30) slow++;
      if (frames > 90) {
        if (slow / frames > 0.35) { S.setQuality(true); qualityDropped = true; }
        frames = 0; slow = 0;
      }
    }
  }
  if (afterFilm < 1) uiFilm(filmP, s);
}
gsap.ticker.add(tick);

addEventListener('resize', () => { S?.resize(); });
if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
