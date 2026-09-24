import veri from '../../data/tonaj.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import * as THREE from 'three';
import { createScene, AKS } from './scene.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(veri);
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
const up = (s) => s.toLocaleUpperCase('tr');

// "1995'ten", "2004'ten", "2010'dan"
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
$('[data-wa-filo]').href = waHref(d, `Merhaba ${d.isletme.ad}, filomuzun bakımı için teklif almak istiyorum. Araç sayımız: `);
$('[data-wa-konum]').href = waHref(d, `Merhaba ${d.isletme.ad}, yolda kaldım. Konumumu gönderiyorum. Araç: `);
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi, ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = up(d.isletme.ad);
$('[data-intro-name]').textContent = up(d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Atölye açık' : 'Atölye kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);
$('[data-sos]').textContent = d.yolYardim;

// Duraklar
$('[data-rail]').innerHTML = d.alt.map((a) => `<li data-rail-i><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = d.alt.map((a) => `
  <article class="card" data-card="${esc(a.id)}">
    <p class="card__stop" data-scr="${esc(up(a.durak))}">${esc(up(a.durak))}</p>
    <h2 class="card__title">${esc(a.baslik)}</h2>
    <p class="card__text">${esc(a.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${a.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.hizmet)} için sorun</span></a>
  </article>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${s.deger}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="svc__row">
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

// Takograf ve filo
$('[data-tacho-title]').textContent = d.takograf.baslik;
$('[data-tacho-text]').textContent = d.takograf.metin;
$('[data-fleet-title]').textContent = d.filo.baslik;
$('[data-fleet-text]').textContent = d.filo.metin;
$('[data-fleet-list]').innerHTML = d.filo.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(up(m))}</span>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${g}</dt><dd>${h}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Takograf diski ------------------------------------------------------------

const TACHO = [ // [başlangıç saati, bitiş, tür]
  [0, 5.5, 'stop'], [5.5, 9.75, 'drive'], [9.75, 10.5, 'rest'], [10.5, 14.25, 'drive'],
  [14.25, 15, 'rest'], [15, 18.5, 'drive'], [18.5, 24, 'stop'],
];
const polar = (h, r) => {
  const a = (h / 24) * Math.PI * 2;
  return [Math.sin(a) * r, -Math.cos(a) * r];
};
(function buildTacho() {
  let ticks = '';
  for (let h = 0; h < 24; h++) {
    const [x0, y0] = polar(h, 196), [x1, y1] = polar(h, h % 2 ? 204 : 210);
    ticks += `<line class="tacho__tick" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
    if (h % 3 === 0) {
      const [tx, ty] = polar(h, 176);
      ticks += `<text class="tacho__h" x="${tx.toFixed(1)}" y="${(ty + 5).toFixed(1)}" text-anchor="middle">${h}</text>`;
    }
  }
  // Etkinlik halkası
  for (const [a, b, k] of TACHO) {
    const [x0, y0] = polar(a, 76), [x1, y1] = polar(b, 76);
    ticks += `<path class="tacho__act is-${k}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A76 76 0 ${b - a > 12 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
  }
  $('[data-tacho-ticks]').innerHTML = ticks;
  // Hız izi: sürüşte 60-88 km/s dalgalanır
  let path = '';
  const N = 720;
  for (let i = 0; i <= N; i++) {
    const h = (i / N) * 24;
    const k = TACHO.find(([a, b]) => h >= a && h <= b)?.[2];
    const v = k === 'drive' ? 74 + Math.sin(h * 9.1) * 8 + Math.sin(h * 31) * 5 + Math.sin(h * 3.3) * 4 : 0;
    const [x, y] = polar(h, 100 + v);
    path += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  $('[data-tacho-trace]').setAttribute('d', path);
})();

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite, name: d.isletme.ad });
document.fonts?.load("40px 'Alfa Slab One'").then(() => S.drawName(d.isletme.ad));
if (import.meta.env.DEV) window.__tj = S;
if (import.meta.env.DEV) window.__tjdbg = () => ({ filmActive, finaleActive, canvasFinale, finaleQ, filmP, st: ScrollTrigger.getAll().map((t) => [t.trigger?.className, Math.round(t.start), Math.round(t.end), t.progress.toFixed(2)]) });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera pozları. Mobilde daha geniş açı ve biraz geriden.
const POSES = () => {
  const m = mobile();
  return {
    hero: m
      ? { pos: V(12.2, 1.25, 9.6), look: V(0.9, -0.1, -0.5), fov: 44 }
      : { pos: V(10.4, 0.95, 7.7), look: V(0.9, 1.8, 3.0), fov: 36 },
    motor: m
      ? { pos: V(1.2, 4.8, 8.2), look: V(2.9, -0.4, 0), fov: 50 }
      : { pos: V(0.2, 3.8, 6.4), look: V(3.4, 0.5, -0.6), fov: 46 },
    enter: { pos: V(0.9, 0.26, 3.4), look: V(1.2, 0.8, 0), fov: m ? 66 : 58 },
    sanziman: m
      ? { pos: V(-0.9, 3.3, 1.0), look: V(1.25, 0.45, 0), fov: 50 }
      : { pos: V(-0.2, 0.22, 0.55), look: V(1.5, 0.86, 0), fov: 60 },
    mid: { pos: V(-0.3, 0.22, 0.45), look: V(-0.5, 0.75, -1.2), fov: m ? 76 : 62 },
    dif1: { pos: V(-0.35, 0.22, 0.36), look: V(AKS.arka1, 0.56, 0), fov: m ? 76 : 62 },
    dif2: { pos: V(-2.05, 0.22, 0.36), look: V(AKS.arka2, 0.56, 0), fov: m ? 76 : 62 },
    fren: m
      ? { pos: V(-0.2, 0.45, 3.1), look: V(-0.6, 0.72, 0.4), fov: 70 }
      : { pos: V(-0.35, 0.45, 2.35), look: V(-0.6, 0.74, 0.4), fov: 58 },
    adblue: m
      ? { pos: V(1.2, 1.0, -3.6), look: V(0.55, 0.78, -0.8), fov: 64 }
      : { pos: V(0.95, 0.95, -2.8), look: V(0.6, 0.8, -0.8), fov: 50 },
    arka: m
      ? { pos: V(-4.2, 1.4, -5.2), look: V(-2.4, 0.7, 0), fov: 60 }
      : { pos: V(-3.8, 1.2, -4.4), look: V(-2.4, 0.7, 0), fov: 50 },
    korug: m
      ? { pos: V(-5.9, 0.34, 0.25), look: V(-2.6, 0.62, 0.35), fov: 64 }
      : { pos: V(-5.4, 0.34, 0.2), look: V(-2.6, 0.62, 0.35), fov: 52 },
    over: m
      ? { pos: V(-12, 5.4, 10), look: V(0, 0.8, 0), fov: 50 }
      : { pos: V(-9.4, 4.2, 7.6), look: V(0.2, 1.4, 0), fov: 38 },
  };
};
const KF = [
  [0.0, 'hero'], [0.07, 'hero'], [0.12, 'motor'], [0.2, 'motor'], [0.24, 'enter'], [0.27, 'sanziman'],
  [0.35, 'sanziman'], [0.37, 'mid'], [0.39, 'dif1'], [0.44, 'dif2'], [0.48, 'dif2'], [0.525, 'fren'], [0.61, 'fren'],
  [0.655, 'adblue'], [0.735, 'adblue'], [0.755, 'arka'], [0.78, 'korug'], [0.86, 'korug'], [0.92, 'over'], [1.0, 'over'],
];
const CARD_RANGES = [[0.1, 0.225], [0.255, 0.365], [0.375, 0.49], [0.505, 0.625], [0.64, 0.75], [0.76, 0.87]];

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = P[a[1]], B = P[b[1]];
  return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

function activeStop(p) {
  return CARD_RANGES.findIndex(([a, b]) => p >= a && p < b);
}

function filmState(p, time, vel) {
  const pose = filmPose(p);
  const outside = 1 - seg(p, 0.2, 0.245) + seg(p, 0.86, 0.92);
  const sway = clamp(outside) * 0.18;
  pose.pos.x += Math.sin(time * 0.3) * sway;
  pose.pos.y += Math.sin(time * 0.45) * sway * 0.4;
  if (p > 0.9) {
    const a = (p - 0.9) * 2.4 + time * 0.05;
    pose.pos.applyAxisAngle(V(0, 1, 0), a * 0.25);
  }
  const under = seg(p, 0.235, 0.27) * (1 - seg(p, 0.48, 0.515));
  const i = activeStop(p);
  const id = i >= 0 ? d.alt[i].id : null;
  const [ca, cb] = i >= 0 ? CARD_RANGES[i] : [0, 1];
  const hl = i >= 0 ? seg(p, ca, ca + 0.02) * (1 - seg(p, cb - 0.015, cb)) : 0;
  return {
    ...pose,
    cabTilt: 1.0 * smooth(seg(p, 0.115, 0.16)) * (1 - smooth(seg(p, 0.2, 0.235))),
    // Körük önce iner (yük yamuk basıyor), sonra şişer
    bellow: p < 0.8 ? L(1, 0.62, smooth(seg(p, 0.765, 0.795))) : L(0.62, 1.04, smooth(seg(p, 0.8, 0.84))),
    spin: 0.25 + seg(p, 0.25, 0.3) * 1.2 * (1 - seg(p, 0.48, 0.52)) + vel * 2,
    highlight: id,
    hlAmount: hl,
    pulse: seg(p, 0.52, 0.56) * (1 - seg(p, 0.62, 0.64)) + (p > 0.9 ? 0.6 : 0),
    workLamp: under,
    underLight: under * 0.6,
    headlights: 1 - seg(p, 0.08, 0.12) + seg(p, 0.88, 0.94),
    hazard: 0,
    env: L(0.45, 0.3, under),
  };
}

function finaleState(q, time) {
  const m = mobile();
  const drift = Math.sin(time * 0.2) * 0.25;
  const pose = m
    ? (() => {
        const a = -0.25 + q * 0.35;
        return { pos: V(Math.cos(a) * 10.5 + 3.5, 2.2, -Math.sin(a) * 19 - 3 + drift), look: V(-0.6, -0.6, -0.2), fov: 50 };
      })()
    : { pos: V(11.5 - q * 2, 1.15, -8.8 + q * 1.5 + drift), look: V(2.6, 1.7, 2.4), fov: 36 };
  return {
    ...pose,
    cabTilt: 0, bellow: 1, spin: 0, highlight: null, hlAmount: 0, pulse: 0,
    workLamp: 0, underLight: 0, headlights: m ? 0.8 : 0.55, hazard: 1, env: 0.22,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const gaugeEl = $('[data-gauge]');
const gLbl = $('[data-g-lbl]'), gVal = $('[data-g-val]'), gUnit = $('[data-g-unit]'), gFill = $('[data-g-fill]'), gOk = $('[data-g-ok]'), gVerdict = $('[data-g-verdict]');
const overview = $('[data-overview]');
const hint = $('[data-hint]');

const SCR = 'ABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZ0123456789';
const scrState = new Map();
function scramble(el, t) {
  const target = el.dataset.scr;
  const n = Math.floor(t * target.length);
  let out = target.slice(0, n);
  for (let i = n; i < target.length; i++) out += target[i] === ' ' ? ' ' : SCR[(i * 7 + Math.floor(performance.now() / 55)) % SCR.length];
  if (scrState.get(el) !== out) {
    el.textContent = out;
    scrState.set(el, out);
  }
}

let lastGauge = -1;
function filmUI(p) {
  const heroOut = seg(p, 0.06, 0.1);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * 50}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0.0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.02), vout = seg(p, b - 0.02, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(0, ${(1 - vin) * -40 + vout * 30}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (v > 0.01) scramble(card.querySelector('[data-scr]'), seg(p, a, a + 0.04));
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.09, 0.11) * (1 - seg(p, 0.87, 0.89));
  rail.style.opacity = railOn;
  rail.style.visibility = railOn > 0.01 ? 'visible' : 'hidden';
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p > CARD_RANGES[i][1]);
  });

  // Ölçüm göstergesi: durağın ortasında arızalı değer düzelir
  const on = active >= 0 ? seg(p, CARD_RANGES[active][0], CARD_RANGES[active][0] + 0.02) * (1 - seg(p, CARD_RANGES[active][1] - 0.015, CARD_RANGES[active][1])) : 0;
  gaugeEl.style.opacity = on;
  gaugeEl.style.visibility = on > 0.01 ? 'visible' : 'hidden';
  if (active >= 0) {
    const o = d.alt[active].olcum;
    const [a, b] = CARD_RANGES[active];
    const fix = smooth(seg(p, L(a, b, 0.35), L(a, b, 0.7)));
    const v = L(o.once, o.sonra, fix);
    const digits = Math.abs(o.sonra) < 10 ? (Math.abs(o.sonra) < 1 ? 2 : 1) : 0;
    if (lastGauge !== active) {
      gLbl.textContent = o.etiket;
      gUnit.textContent = o.birim;
      lastGauge = active;
    }
    gVal.textContent = nf(v, digits);
    const max = Math.max(o.once, o.sonra, o.iyi) * 1.15;
    gFill.style.transform = `scaleX(${clamp(v / max)})`;
    gOk.style.left = `${clamp(o.iyi / max) * 100}%`;
    const ok = o.ters ? v <= o.iyi : v >= o.iyi;
    gVerdict.textContent = ok ? 'Düzeldi' : 'Arızalı';
    gaugeEl.classList.toggle('is-ok', ok);
  }

  const ov = seg(p, 0.885, 0.915) * (1 - seg(p, 0.985, 1));
  overview.style.opacity = ov;
  overview.style.visibility = ov > 0.01 ? 'visible' : 'hidden';
  overview.style.transform = `translate3d(0, ${(1 - ov) * 30}px, 0)`;
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
const titleChars = split.chars;

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
let filmActive = true, finaleActive = false;
let vel = 0;
let canvasFinale = 0;
let filmST = null, finaleST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));

  // Etkinlik her karede ilerlemeden hesaplanır (sayfa başından doğrudan atlanınca toggle olayı gelmez)
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
    trigger: '[data-about]', start: 'top 80px',
    endTrigger: '[data-finale]', end: 'top 80px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar ağırlıkla düşer
  $$('[data-drop]').forEach((el) => {
    const s = new SplitText(el, { type: 'words', wordsClass: 'dw' });
    gsap.fromTo(s.words, { yPercent: -120, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: 'bounce.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.16 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 45%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.2, yPercent: -6 }, {
    scale: 1, yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  // Hizmet satırları: ortadan geçerken kırmızı şerit dolar
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--lit': 0 }, {
      '--lit': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 80%', end: 'top 45%', scrub: true },
    });
  });
  // Takograf: disk döner, iz iğnenin altında çizilir
  const trace = $('[data-tacho-trace]');
  const acts = $$('.tacho__act');
  const rot = $('[data-tacho-rot]');
  const clock = $('[data-tacho-clock]');
  gsap.set(trace, { drawSVG: '0%' });
  gsap.set(acts, { drawSVG: '0%' });
  const tacho = { p: 0 };
  gsap.to(tacho, {
    p: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-tacho]', start: 'top 75%', end: 'bottom 35%', scrub: true },
    onUpdate: () => {
      const h = tacho.p * 24;
      gsap.set(trace, { drawSVG: `0% ${tacho.p * 100}%` });
      rot.setAttribute('transform', `rotate(${-tacho.p * 360})`);
      $('[data-tacho-ticks]').setAttribute('transform', `rotate(${-tacho.p * 360})`);
      acts.forEach((a, i) => {
        const [s0, s1] = TACHO[i];
        gsap.set(a, { drawSVG: `0% ${clamp((h - s0) / (s1 - s0)) * 100}%` });
      });
      const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
      clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    },
  });
  // Filo maddeleri
  gsap.fromTo('.fleet__list li', { x: -40, opacity: 0 }, {
    x: 0, opacity: 1, stagger: 0.1, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '.fleet__list', start: 'top 80%', once: true },
  });
  // Süreç
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 62%', onToggle: (self) => s.classList.toggle('is-lit', self.progress > 0 || self.isActive) });
  });
  // Yorumlar yatay kayar
  const track = $('[data-rev-track]');
  gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - track.parentElement.clientWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top 70%', end: 'bottom 20%', scrub: true, invalidateOnRefresh: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  // Final başlığı düşer, sayfa sarsılır
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.timeline({ scrollTrigger: { trigger: '[data-finale]', start: 'top 45%', once: true } })
    .fromTo(fsplit.chars, { yPercent: -160, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: 0.03, ease: 'bounce.out' })
    .fromTo('.finale__sticky', { y: 0 }, { y: 7, duration: 0.07, yoyo: true, repeat: 3, ease: 'none' }, 0.45);
}

// Markalar: kaydırma hızına göre hızlanır
const mq = $('.marquee__inner');
let mqX = 0;

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;

  if (filmST) {
    filmActive = filmST.progress < 1;
    finaleActive = finaleST.progress > 0 && finaleST.progress < 1 || finaleST.isActive;
  }
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  if (filmActive || filmP < 0.999) filmUI(filmP);

  const showFilm = filmActive && canvas.style.opacity !== '0';
  const showFinale = finaleActive || canvasFinale > 0.001;
  if (showFinale && !filmActive) {
    canvas.style.opacity = canvasFinale;
    S.update(finaleState(finaleQ, time), now);
  } else if (showFilm) {
    S.update(filmState(filmP, time, vel), now);
  }

  const w = mq.scrollWidth / 2;
  mqX -= (50 + vel * 900) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${-vel * 10}deg)`;

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
      mx((e.clientX - r.left - r.width / 2) * 0.28);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

// --- Açılış: hava basıncı dolar, dorse kapıları açılır, başlık düşer ---------

function heroDrop() {
  gsap.timeline()
    .fromTo(titleChars, { yPercent: -170, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.05, stagger: 0.035, ease: 'bounce.out' }, 0)
    .fromTo(hero, { y: 0 }, { y: 6, duration: 0.06, yoyo: true, repeat: 3, ease: 'none' }, 0.42)
    .fromTo('.hero__title', { '--dust': 0 }, { '--dust': 1, duration: 0.9, ease: 'power2.out' }, 0.4)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.55);
}

function runIntro() {
  const intro = $('[data-intro]');
  const fill = $('[data-intro-fill]');
  const val = $('[data-intro-bar]');
  let done = false;
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.fromTo('[data-intro-name]', { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'bounce.out' }, 0);
  tl.to(o, { v: 8.5, duration: 1.4, ease: 'power2.inOut', onUpdate: () => {
    fill.style.transform = `scaleX(${o.v / 8.5})`;
    val.textContent = nf(o.v, 1);
  } }, 0.1);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000, 0));
  }, [], 0.25);
  tl.add(finish, 1.7);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .to('[data-intro-center]', { opacity: 0, scale: 0.96, duration: 0.3, ease: 'power2.in' }, 0)
      .to('[data-door-l]', { rotationY: -100, duration: 0.95, ease: 'power3.inOut' }, 0.12)
      .to('[data-door-r]', { rotationY: 100, duration: 0.95, ease: 'power3.inOut' }, 0.12)
      .to(intro, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.5 }, 0.3)
      .call(heroDrop, [], 0.55);
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
  S.compile();
  const still = () => S.update({ ...filmState(0, 0, 0), headlights: 1 });
  still();
  addEventListener('resize', still);
  $$('[data-scr]').forEach((el) => (el.textContent = el.dataset.scr));
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  gsap.set('.svc__row', { '--lit': 1 });
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
