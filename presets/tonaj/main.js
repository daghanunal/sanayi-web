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
heroTitle.classList.toggle('is-long', d.isletme.ad.length > 18);
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

// Duraklar: akan kartlar (her kartta ölçüm göstergesi)
const digitsOf = (o) => (Math.abs(o.sonra) < 10 || Math.abs(o.once) < 10 ? (Math.abs(o.sonra) < 1 ? 2 : 1) : 0);
$('[data-rail]').innerHTML = d.alt.map((a) => `<li data-rail-i><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = d.alt.map((a, i) => {
  const o = a.olcum;
  const max = Math.max(o.once, o.sonra, o.iyi) * 1.15;
  return `
  <article class="stop" data-stop="${i}">
    <div class="card" data-card="${esc(a.id)}">
      <p class="card__stop"><span>${String(i + 1).padStart(2, '0')}</span><b data-scr="${esc(up(a.durak))}">${esc(up(a.durak))}</b></p>
      <h3 class="card__title">${esc(a.baslik)}</h3>
      <p class="card__text">${esc(a.metin)}</p>
      <div class="gauge" data-gauge>
        <p class="gauge__head"><span>${esc(o.etiket)}</span><b><i data-g-val>${esc(nf(o.once, digitsOf(o)))}</i> ${esc(o.birim)}</b><em data-g-verdict>Arızalı</em></p>
        <div class="gauge__bar"><i data-g-fill></i><s style="left:${((o.iyi / max) * 100).toFixed(1)}%"></s></div>
      </div>
      <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${a.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.hizmet)} için sorun</span></a>
    </div>
  </article>`;
}).join('');

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
$('[data-puan-adet]').textContent = `Örnek puan · ${nf(d.puan.adet)} değerlendirme`;
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
const S = createScene(canvas, { name: d.isletme.ad });
document.fonts?.load("40px 'Alfa Slab One'").then(() => S.drawName(d.isletme.ad));
if (import.meta.env.DEV) window.__tj = S;
if (import.meta.env.DEV) window.__keys = () => keys.map((k) => [k.name, Math.round(k.at)]);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const isVitrin = document.documentElement.classList.contains('is-vitrin');

// Kamera pozları (araç ön +x, aks ortası orijin). Mobilde parça ekranın üst yarısında kalır.
const POSES = () => {
  const m = mobile();
  const P = (pd, ld, fd, pm, lm, fm, sh = 0) => (m ? { pos: V(...pm), look: V(...lm), fov: fm, sh } : { pos: V(...pd), look: V(...ld), fov: fd, sh: 0 });
  return {
    hero: P([9.6, 1.05, 7.4], [0.4, 1.75, 2.5], 36, [11.2, 1.7, 9.6], [0.5, -0.5, -0.4], 46),
    intro: P([6.2, 2.6, 6.8], [1.4, 1.4, 0.6], 40, [8.2, 3.2, 8.4], [1.6, 0.2, 0], 50),
    motor: P([0.2, 3.5, 5.4], [2.3, 1.0, -0.5], 44, [0.6, 3.6, 5.6], [2.1, 1.1, 0], 58, 0.24),
    enter: P([0.8, 0.26, 3.1], [1.1, 0.8, 0], 60, [0.8, 0.28, 3.4], [1.0, 0.8, 0], 66, 0.24),
    sanziman: P([-0.35, 0.22, 0.75], [1.05, 0.82, 0], 58, [-0.6, 0.22, 0.8], [1.05, 0.8, 0], 68, 0.24),
    diferansiyel: P([-0.5, 0.2, 0.5], [-1.85, 0.6, 0], 62, [-0.4, 0.2, 0.55], [-1.85, 0.6, 0], 70, 0.24),
    fren: P([-0.1, 0.26, -0.35], [-1.7, 0.72, 0.62], 62, [0.1, 0.26, -0.45], [-1.7, 0.75, 0.62], 72, 0.24),
    out: P([0.3, 0.3, -2.2], [-1.0, 0.7, -0.6], 58, [0.4, 0.35, -2.6], [-1.0, 0.7, -0.6], 64, 0.24),
    adblue: P([0.3, 1.15, -3.6], [-1.05, 0.72, -0.8], 44, [0.4, 1.3, -4.2], [-1.05, 0.75, -0.8], 54, 0.24),
    arka: P([-4.4, 1.3, -4.6], [-2.2, 0.7, 0], 50, [-4.8, 1.5, -5.4], [-2.2, 0.8, 0], 58, 0.22),
    korug: P([-5.2, 0.42, 0.45], [-2.3, 0.66, 0.3], 50, [-6.2, 0.55, 0.35], [-2.3, 0.8, 0.3], 56, 0.22),
    over: P([-9.2, 4.0, 7.4], [0.3, 1.3, 0], 38, [-12, 5.4, 10.4], [0, 0, 0], 48),
  };
};
const BETWEEN = { motor: 'enter', fren: 'out', adblue: 'arka' }; // iki durak arasındaki ara nokta

// Anahtar kaydırma değerleri: kartın ortası ekranın R oranına geldiğinde poz tam oturur
let keys = []; // { at, name, i? }
let stopAt = []; // durak başına anahtar
let tourEnd = 0;
function layout() {
  const ih = innerHeight;
  const R = mobile() ? 0.66 : 0.5;
  const y = (el) => el.getBoundingClientRect().top + scrollY;
  const at = (el) => y(el) + el.offsetHeight / 2 - ih * R;
  const base = [{ at: 0, name: 'hero' }, { at: at($('.tour__intro .sec-title')), name: 'intro' }];
  stopAt = $$('[data-stop]').map((st) => at($('.card', st)));
  d.alt.forEach((a, i) => base.push({ at: stopAt[i], name: a.id, i }));
  base.push({ at: at($('.overview__title')), name: 'over' });
  keys = [];
  base.forEach((k, j) => {
    keys.push(k);
    const b = base[j + 1];
    if (b && BETWEEN[k.name]) keys.push({ at: (k.at + b.at) / 2, name: BETWEEN[k.name] });
  });
  const tour = $('[data-tour]');
  tourEnd = y(tour) + tour.offsetHeight;
}

function tourPose(sy) {
  const P = POSES();
  const get = (n) => P[n] || P.over;
  if (sy <= keys[0].at) return { ...get(keys[0].name) };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (sy <= b.at) {
      const t = smooth(seg(sy, a.at, b.at));
      const A = get(a.name), B = get(b.name);
      return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t), sh: L(A.sh, B.sh, t) };
    }
  }
  const Z = get(keys.at(-1).name);
  return { pos: Z.pos.clone(), look: Z.look.clone(), fov: Z.fov, sh: Z.sh };
}

const stopIdx = (id) => d.alt.findIndex((a) => a.id === id);
function tourState(sy, time, vel) {
  const ih = innerHeight;
  const pose = tourPose(sy);
  const near = (id, w = 0.75) => {
    const i = stopIdx(id);
    return i < 0 ? 0 : clamp(1 - Math.abs(sy - stopAt[i]) / (ih * w));
  };
  // dışarıdaki çekimlerde hafif el kamerası salınımı
  const outside = pose.pos.y > 1 ? 1 : 0;
  pose.pos.x += Math.sin(time * 0.3) * 0.12 * outside;
  pose.pos.y += Math.sin(time * 0.45) * 0.05 * outside;
  const overAt = keys.at(-1).at;
  if (sy > overAt - ih * 0.3) pose.pos.applyAxisAngle(V(0, 1, 0), (sy - overAt) / ih * 0.35 + time * 0.012);
  // en yakın durak ve vurgu
  let active = -1, best = 0;
  stopAt.forEach((a, i) => {
    const v = clamp(1 - Math.abs(sy - a) / (ih * 0.55));
    if (v > best) { best = v; active = i; }
  });
  const kk = stopIdx('korug');
  const kAt = stopAt[kk] ?? 0;
  const sag = smooth(seg(sy, kAt - ih * 0.9, kAt - ih * 0.45));
  const rise = smooth(seg(sy, kAt - ih * 0.15, kAt + ih * 0.3));
  const under = clamp((0.95 - pose.pos.y) / 0.55);
  return {
    ...pose,
    cabTilt: 0.95 * smooth(clamp(near('motor', 0.95) * 1.9)),
    bellow: 1 - 0.36 * sag + 0.4 * rise,
    spin: 0.3 + 1.3 * Math.max(near('sanziman'), near('diferansiyel')) + vel * 2,
    highlight: active >= 0 ? d.alt[active].id : null,
    hlAmount: smooth(clamp(best * 1.6)),
    pulse: near('fren', 0.7),
    workLamp: under,
    underLight: under * 0.7,
    headlights: 1 - seg(sy, keys[1].at * 0.4, keys[1].at) + seg(sy, overAt - ih * 0.6, overAt),
    hazard: 0,
    env: L(0.45, 0.28, under),
  };
}

function finaleState(q, time) {
  const m = mobile();
  const drift = Math.sin(time * 0.2) * 0.25;
  const pose = m
    ? (() => {
        const a = -0.25 + q * 0.35;
        return { pos: V(Math.cos(a) * 10.5 + 3.5, 2.4, -Math.sin(a) * 18 - 3 + drift), look: V(-0.4, -0.8, -0.2), fov: 50 };
      })()
    : { pos: V(11.2 - q * 2, 1.2, -8.6 + q * 1.5 + drift), look: V(2.4, 1.8, 2.4), fov: 36 };
  return {
    ...pose,
    cabTilt: 0, bellow: 1, spin: 0, highlight: null, hlAmount: 0, pulse: 0,
    workLamp: 0, underLight: 0, headlights: m ? 0.8 : 0.6, hazard: 1, env: 0.3,
  };
}

// --- Tur arayüzü ---------------------------------------------------------

const top = $('[data-top]');
const railItems = $$('[data-rail-i]');
const stops = $$('[data-stop]').map((st, i) => ({
  el: st,
  scr: $('[data-scr]', st),
  val: $('[data-g-val]', st),
  fill: $('[data-g-fill]', st),
  verdict: $('[data-g-verdict]', st),
  gauge: $('[data-gauge]', st),
  o: d.alt[i].olcum,
  done: false,
}));

const SCR = 'ABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZ0123456789';
function scramble(el, t) {
  const target = el.dataset.scr;
  const n = Math.floor(t * target.length);
  let out = target.slice(0, n);
  for (let i = n; i < target.length; i++) out += target[i] === ' ' ? ' ' : SCR[(i * 7 + Math.floor(performance.now() / 55)) % SCR.length];
  if (el.textContent !== out) el.textContent = out;
}

let lastActive = -2;
function tourUI(sy) {
  const ih = innerHeight;
  const inTour = sy > keys[1].at - ih * 0.5 && sy < keys.at(-1).at + ih * 0.2;
  top.classList.toggle('is-tour', inTour);
  let active = -1;
  stops.forEach((s, i) => {
    const a = stopAt[i];
    if (Math.abs(sy - a) < ih * 0.5) active = i;
    // ölçüm: kart ekrana girerken arızalı, ortaya gelirken düzelir
    const fix = smooth(seg(sy, a - ih * 0.42, a + ih * 0.05));
    if (reducedMotion) return;
    const o = s.o;
    const v = L(o.once, o.sonra, fix);
    s.val.textContent = nf(v, digitsOf(o));
    const max = Math.max(o.once, o.sonra, o.iyi) * 1.15;
    s.fill.style.transform = `scaleX(${clamp(v / max)})`;
    const ok = o.ters ? v <= o.iyi : v >= o.iyi;
    s.verdict.textContent = ok ? 'Düzeldi' : 'Arızalı';
    s.gauge.classList.toggle('is-ok', ok);
    const sc = seg(sy, a - ih * 0.7, a - ih * 0.45);
    if (sc > 0 && sc < 1) scramble(s.scr, sc);
    else if (sc >= 1 && s.scr.textContent !== s.scr.dataset.scr) s.scr.textContent = s.scr.dataset.scr;
  });
  if (active !== lastActive) {
    railItems.forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.classList.toggle('is-done', active > -1 && i < active);
    });
    lastActive = active;
  }
}

// --- Başlangıç -------------------------------------------------------------

const heroTitleSplit = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
const titleChars = heroTitleSplit.chars;

let lenis = null;
let vel = 0;
let finaleQ = 0, finaleOn = false;
let solids = [];
let started = false;

function measure() {
  layout();
  const y = (el) => el.getBoundingClientRect().top + scrollY;
  const r = $$('.solid').map((el) => [y(el), y(el) + el.offsetHeight]).sort((a, b) => a[0] - b[0]);
  solids = [];
  for (const x of r) {
    const l = solids.at(-1);
    if (l && x[0] - l[1] < 4) l[1] = Math.max(l[1], x[1]);
    else solids.push(x.slice());
  }
}

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
    onToggle: (self) => (finaleOn = self.isActive),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 80px',
    endTrigger: '[data-finale]', end: 'top 80px',
    onToggle: (self) => top.classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar ağırlıkla düşer
  $$('[data-drop]').forEach((el) => {
    const s = new SplitText(el, { type: 'words', wordsClass: 'dw' });
    gsap.fromTo(s.words, { yPercent: -120, autoAlpha: 0 }, {
      yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.06, ease: 'bounce.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  gsap.fromTo('.tour__lead, .overview__note, .tour__intro .kicker, .overview .kicker', { y: 20, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.05,
    scrollTrigger: { trigger: '.tour__intro', start: 'top 80%', once: true },
  });
  $$('.card').forEach((c) => gsap.from(c, { y: 60, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 92%', once: true } }));
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
  const ticksG = $('[data-tacho-ticks]');
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
      ticksG.setAttribute('transform', `rotate(${-tacho.p * 360})`);
      acts.forEach((a, i) => {
        const [s0, s1] = TACHO[i];
        gsap.set(a, { drawSVG: `0% ${clamp((h - s0) / (s1 - s0)) * 100}%` });
      });
      const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
      clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    },
  });
  gsap.fromTo('.fleet__list li', { x: -40, autoAlpha: 0 }, {
    x: 0, autoAlpha: 1, stagger: 0.1, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '.fleet__list', start: 'top 85%', once: true },
  });
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 62%', onToggle: (self) => s.classList.toggle('is-lit', self.progress > 0 || self.isActive) });
  });
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
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.timeline({ scrollTrigger: { trigger: '[data-finale]', start: 'top 45%', once: true } })
    .fromTo(fsplit.chars, { yPercent: -160, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.03, ease: 'bounce.out' })
    .fromTo('.finale__sticky', { y: 0 }, { y: 7, duration: 0.07, yoyo: true, repeat: 3, ease: 'none' }, 0.45);
}

// Markalar: kaydırma hızına göre hızlanır
const mq = $('.marquee__inner');
let mqX = 0;
let mqW = 0;

let lastT = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;
  const sy = scrollY;
  const ih = innerHeight;

  if (sy < tourEnd + ih) tourUI(sy);
  const covered = solids.some(([a, b]) => a <= sy && b >= sy + ih);
  if (!covered) {
    if (sy < tourEnd) S.update(tourState(sy, time, started ? vel : 0), now);
    else if (finaleOn || finaleQ > 0) S.update(finaleState(finaleQ, time), now);
  }

  if (!mqW) mqW = mq.scrollWidth / 2;
  mqX -= (50 + vel * 900) * dt;
  if (mqX < -mqW) mqX += mqW;
  mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${-vel * 10}deg)`;
}

addEventListener('resize', () => { S.resize(); measure(); mqW = 0; });

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

// --- Açılış: hava basıncı dolar (model yüklenirken), dorse kapıları açılır, başlık düşer ---------

function heroDrop() {
  gsap.timeline()
    .fromTo(titleChars, { yPercent: -170, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.0, stagger: 0.03, ease: 'bounce.out' }, 0)
    .fromTo('.hero__in', { y: 0 }, { y: 6, duration: 0.06, yoyo: true, repeat: 3, ease: 'none' }, 0.4)
    .fromTo('.hero__title', { '--dust': 0 }, { '--dust': 1, duration: 0.9, ease: 'power2.out' }, 0.38)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.1);
}

function runIntro() {
  const intro = $('[data-intro]');
  if (isVitrin) {
    intro.remove();
    document.body.classList.remove('is-loading');
    started = true;
    heroDrop();
    return;
  }
  const fill = $('[data-intro-fill]');
  const val = $('[data-intro-bar]');
  let done = false;
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.fromTo('[data-intro-name]', { yPercent: -60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'bounce.out' }, 0);
  tl.to(o, { v: 8.5, duration: 1.1, ease: 'power2.inOut', onUpdate: () => {
    fill.style.transform = `scaleX(${o.v / 8.5})`;
    val.textContent = nf(o.v, 1);
  } }, 0.05);
  // model hazırsa 1,2 sn'de, değilse en geç 1,8 sn'de kapılar açılır
  let minDone = false, readyDone = false;
  const maybe = () => minDone && readyDone && finish();
  tl.call(() => { minDone = true; maybe(); }, [], 1.2);
  S.readyP.then(() => { readyDone = true; maybe(); }).catch(() => { readyDone = true; maybe(); });
  setTimeout(finish, 1800);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    started = true;
    document.body.classList.remove('is-loading');
    gsap.set(intro, { pointerEvents: 'none' });
    gsap.timeline({ onComplete: () => intro.remove() })
      .to('[data-intro-center]', { autoAlpha: 0, scale: 0.96, duration: 0.2, ease: 'power2.in' }, 0)
      .to('[data-door-l]', { rotationY: -100, duration: 0.7, ease: 'power3.inOut' }, 0.05)
      .to('[data-door-r]', { rotationY: 100, duration: 0.7, ease: 'power3.inOut' }, 0.05)
      .to(intro, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.4 }, 0.15)
      .call(heroDrop, [], 0.3);
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
  addEventListener('wheel', finish, { once: true, passive: true });
}

// --- Hareket azaltma -----------------------------------------------------------

measure();
if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  started = true;
  stops.forEach((s) => {
    s.val.textContent = nf(s.o.sonra, digitsOf(s.o));
    s.verdict.textContent = 'Düzeldi';
    s.gauge.classList.add('is-ok');
    const max = Math.max(s.o.once, s.o.sonra, s.o.iyi) * 1.15;
    s.fill.style.transform = `scaleX(${clamp(s.o.sonra / max)})`;
  });
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  gsap.set('.svc__row', { '--lit': 1 });
  S.readyP.then(() => measure());
  requestAnimationFrame(tick);
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
document.fonts?.ready.then(() => { measure(); ScrollTrigger.refresh(); });
S.readyP.catch(() => document.documentElement.classList.add('no-webgl'));
