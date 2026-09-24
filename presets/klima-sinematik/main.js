import taban from '../../data/sektor-klima.json';
import ek from '../../data/klima-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...taban, ...ek, preset: 'klima-sinematik' });
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
const low = (s) => s.toLocaleLowerCase('tr');

// "2005'ten", "1998'den", "2010'dan"
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
$('[data-wa-final]').href = waHref(d, `Merhaba ${d.isletme.ad}, klimamı kontrol ettirmek istiyorum. Hangi gün uygun? Araç: `);
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri yalnızca klima`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
$('[data-intro-name]').textContent = up(d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Şu an açık' : 'Şu an kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film durakları
const F = d.film;
$('[data-rail]').innerHTML = F.map((a) => `<li data-rail-i><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = F.map((a, i) => `
  <article class="card" data-card="${esc(a.id)}">
    <p class="card__stop"><span>${String(i + 1).padStart(2, '0')} / ${String(F.length).padStart(2, '0')}</span>${esc(up(a.durak))}</p>
    <h2 class="card__title">${esc(a.baslik)}</h2>
    <p class="card__text">${esc(a.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${low(a.hizmet)} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.hizmet)} için sorun</span></a>
  </article>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
$('[data-about-cap]').textContent = `${ablative(d.isletme.kurulus)} beri Şaşmaz'da`;
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__row">
    <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

// Belirtiler
const B = d.belirtiler;
$('[data-chips]').innerHTML = B.map((b, i) => `<button class="chip" type="button" role="tab" data-chip="${i}" aria-selected="${i === 0}">${esc(b.etiket)}</button>`).join('');
{
  let blades = '';
  for (let i = 0; i < 6; i++) {
    const y = 42 + i * 23;
    blades += `<rect x="30" y="${y}" width="140" height="9" rx="4.5" fill="#c9d6dd" opacity=".9"/>`;
  }
  $('[data-vent-blades]').innerHTML = `<g clip-path="circle(80px at 100px 100px)">${blades}</g>`;
  $('[data-flow]').innerHTML = Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
}
const diag = $('[data-diag]');
function showSymptom(i, animate = true) {
  const b = B[i];
  $$('[data-chip]').forEach((c) => c.setAttribute('aria-selected', String(Number(c.dataset.chip) === i)));
  const fill = () => {
    $('[data-diag-t]').textContent = b.sebep;
    $('[data-diag-is]').textContent = b.is;
    $('[data-diag-sure]').textContent = b.sure;
    $('[data-diag-wa]').href = waHref(d, `Merhaba ${d.isletme.ad}, klimam için yazıyorum: ${low(b.etiket)}. Ne zaman bakabilirsiniz? Araç: `);
  };
  $('.symptom').dataset.state = b.id;
  if (!animate || reducedMotion) return fill();
  gsap.timeline()
    .to(diag, { opacity: 0, y: 10, duration: 0.18, ease: 'power2.in', onComplete: fill })
    .to(diag, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
}
$('[data-chips]').addEventListener('click', (e) => {
  const c = e.target.closest('[data-chip]');
  if (c) showSymptom(Number(c.dataset.chip));
});
showSymptom(0, false);

// Atölye fotoğrafları
const SHOTS = [
  ['teshis', 'Elinde tabletle motor bölmesini kontrol eden usta'],
  ['klima-paneli', 'Araç konsolundaki klima kontrol düğmeleri'],
  ['atolye', 'Atölyede kaputu açık aracın başında çalışan usta'],
  ['orta-konsol', 'Klima ve radyo panelinin bulunduğu orta konsol'],
  ['motor-bolmesi', 'Atölyede kaputu açık kırmızı aracın motor bölmesi'],
  ['yaz-surus', 'Güneşli bir günde direksiyon başındaki sürücü ve havalandırma ızgaraları'],
  ['usta-sb', 'Motor bölmesine eğilmiş usta, siyah beyaz'],
];
$('[data-shots]').innerHTML = SHOTS.map(([n, alt], i) => `
  <figure class="shot${['orta-konsol', 'usta-sb'].includes(n) ? ' shot--tall' : ''}"><img src="${esc(asset(`/img/klima-sinematik/${n}.jpg`))}" alt="${esc(alt)}" loading="lazy" /><figcaption>${String(i + 1).padStart(2, '0')}</figcaption></figure>`).join('');

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Number(y.puan))}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true">✳</i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Manifold saatlerinin çentikleri
const DIAL = { lo: [-1, 10], hi: [0, 35] };
const dialAngle = (k, v) => -135 + clamp((v - DIAL[k][0]) / (DIAL[k][1] - DIAL[k][0])) * 270;
for (const k of ['lo', 'hi']) {
  let s = '';
  const [a, b] = DIAL[k];
  const step = k === 'lo' ? 1 : 5;
  for (let v = a; v <= b; v += step) {
    const r = (dialAngle(k, v) * Math.PI) / 180;
    const x0 = 50 + Math.sin(r) * 38, y0 = 50 - Math.cos(r) * 38;
    const x1 = 50 + Math.sin(r) * 44, y1 = 50 - Math.cos(r) * 44;
    s += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
  }
  $(`[data-ticks-${k}]`).innerHTML = s;
}

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera pozları. Mobilde dar ekran: daha geri ve konu ekranın üst yarısında
const POSES = () => {
  const m = mobile();
  return {
    hero: m
      ? { pos: V(4.4, 1.1, 14.6), look: V(-0.05, -2.2, 0), fov: 46 }
      : { pos: V(5.2, 1.8, 9.8), look: V(-3.4, 0.3, 0), fov: 40 },
    kompresor: m
      ? { pos: V(-0.9, 0.9, 4.4), look: V(-2.45, -1.55, 0.4), fov: 52 }
      : { pos: V(-0.2, 0.3, 3.4), look: V(-2.0, -0.85, 0.3), fov: 44 },
    kondenser: m
      ? { pos: V(1.6, 1.0, 6.2), look: V(0.45, 0.2, -0.4), fov: 54 }
      : { pos: V(2.2, 1.9, 4.4), look: V(-0.2, 1.2, -0.4), fov: 50 },
    kacak: m
      ? { pos: V(1.1, 1.1, 2.9), look: V(2.35, -0.25, -0.2), fov: 52 }
      : { pos: V(0.9, 1.2, 2.6), look: V(1.75, 0.35, -0.2), fov: 46 },
    dolum: m
      ? { pos: V(-1.1, 1.2, 4.6), look: V(-1.9, -1.2, 0.3), fov: 56 }
      : { pos: V(-0.8, 0.9, 3.9), look: V(-1.55, -0.45, 0.3), fov: 50 },
    evaporator: m
      ? { pos: V(1.6, -0.2, 4.6), look: V(0.7, -1.95, 0.9), fov: 52 }
      : { pos: V(1.9, -0.4, 3.7), look: V(0.3, -1.3, 0.9), fov: 46 },
    filtre: m
      ? { pos: V(0.9, 1.4, 4.2), look: V(0.6, -1.4, 0.7), fov: 52 }
      : { pos: V(1.2, 1.1, 3.6), look: V(0.1, -0.85, 0.7), fov: 46 },
    over: m
      ? { pos: V(-4.4, 2.8, 15), look: V(0.1, -2.2, 0), fov: 48 }
      : { pos: V(-3.8, 2.8, 9.4), look: V(-2.0, -0.2, 0), fov: 42 },
  };
};
// Her durakta kamera hafifçe süzülür: ikinci poz, birincinin kaydırılmışı
const drift = (p, dx, dy, dz) => ({ ...p, pos: p.pos.clone().add(V(dx, dy, dz)) });
const KF = [
  [0.0, 'hero'], [0.05, 'hero'],
  [0.1, 'kompresor'], [0.21, 'kompresor', [0.35, 0.1, -0.35]],
  [0.25, 'kondenser'], [0.355, 'kondenser', [-0.6, -0.1, 0.2]],
  [0.395, 'kacak'], [0.49, 'kacak', [-0.15, 0.1, -0.35]],
  [0.535, 'dolum'], [0.63, 'dolum', [0.3, 0.1, -0.3]],
  [0.67, 'evaporator'], [0.765, 'evaporator', [-0.4, 0.1, 0.1]],
  [0.8, 'filtre'], [0.875, 'filtre', [0.25, 0.1, 0.2]],
  [0.935, 'over'], [1.0, 'over', [0.6, 0.2, 0]],
];
const CARD_RANGES = [[0.09, 0.225], [0.235, 0.365], [0.375, 0.505], [0.515, 0.645], [0.655, 0.775], [0.785, 0.885]];
const CABIN = [[0, 38], [0.18, 38], [0.22, 34], [0.3, 33], [0.34, 30], [0.44, 31], [0.52, 33], [0.6, 26], [0.7, 14], [0.8, 9], [0.93, 6], [1, 6]];
const cabinAt = (p) => {
  let i = 0;
  while (i < CABIN.length - 2 && p > CABIN[i + 1][0]) i++;
  return L(CABIN[i][1], CABIN[i + 1][1], smooth(seg(p, CABIN[i][0], CABIN[i + 1][0])));
};

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const pose = (k) => (k[2] ? drift(P[k[1]], ...k[2]) : P[k[1]]);
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = pose(a), Bp = pose(b);
  return { pos: A.pos.clone().lerp(Bp.pos, t), look: A.look.clone().lerp(Bp.look, t), fov: L(A.fov, Bp.fov, t) };
}

const activeStop = (p) => CARD_RANGES.findIndex(([a, b]) => p >= a && p < b);

function filmState(p, time) {
  const pose = filmPose(p);
  if (p < 0.08) {
    pose.pos.x += Math.sin(time * 0.3) * 0.25;
    pose.pos.y += Math.sin(time * 0.4) * 0.12;
  }
  if (p > 0.92) pose.pos.applyAxisAngle(V(0, 1, 0), (p - 0.92) * 1.2);
  const i = activeStop(p);
  const [ca, cb] = i >= 0 ? CARD_RANGES[i] : [0, 1];
  const hl = i >= 0 ? seg(p, ca, ca + 0.02) * (1 - seg(p, cb - 0.015, cb)) : 0;
  const clutch = smooth(seg(p, 0.14, 0.175));
  const vacuum = seg(p, 0.525, 0.55) * (1 - seg(p, 0.565, 0.61));
  const charge = p < 0.375 ? 0.5 : p < 0.515 ? L(0.5, 0.3, seg(p, 0.375, 0.42)) : p < 0.56 ? L(0.3, 0.03, seg(p, 0.515, 0.55)) : L(0.03, 1, smooth(seg(p, 0.565, 0.625)));
  return {
    ...pose,
    clutch,
    fan: L(0.12, 1, smooth(seg(p, 0.285, 0.315))),
    flow: (0.25 + clutch * 0.9) * (1 - vacuum * 0.9),
    charge,
    heat: 1 - smooth(seg(p, 0.585, 0.68)),
    uv: seg(p, 0.375, 0.4) * (1 - seg(p, 0.49, 0.51)),
    leak: seg(p, 0.405, 0.425) * (1 - seg(p, 0.47, 0.49)),
    hoses: seg(p, 0.52, 0.545) * (1 - seg(p, 0.628, 0.65)),
    frost: seg(p, 0.64, 0.72),
    air: seg(p, 0.66, 0.72) * (1 - seg(p, 0.8, 0.82) * 0.6) + seg(p, 0.86, 0.9) * 0.6,
    filter: seg(p, 0.815, 0.865),
    highlight: i >= 0 ? F[i].id : null,
    hlAmount: hl,
    env: 0.9,
  };
}

function finaleState(q, time) {
  const m = mobile();
  const a = -0.5 + q * 0.6 + Math.sin(time * 0.15) * 0.05;
  const r = m ? 16 : 11;
  return {
    pos: V(Math.sin(a) * r, m ? 1.6 : 1.2, Math.cos(a) * r),
    look: m ? V(0.2, -3.4, 0) : V(-3.0, 0.1, 0), fov: m ? 46 : 40,
    clutch: 1, fan: 1, flow: 1.15, charge: 1, heat: 0, uv: 0, leak: 0, hoses: 0,
    frost: 1, air: 1, filter: 1, highlight: null, hlAmount: 0, env: 0.9,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const hud = $('[data-hud]');
const thermo = $('[data-thermo]');
const cabinEl = $('[data-cabin]'), cabinFill = $('[data-cabin-fill]');
const needleLo = $('[data-needle-lo]'), needleHi = $('[data-needle-hi]');
const loEl = $('[data-lo]'), hiEl = $('[data-hi]');
const exLbl = $('[data-ex-lbl]'), exVal = $('[data-ex-val]'), exUnit = $('[data-ex-unit]'), verdict = $('[data-verdict]');
const overview = $('[data-overview]');
const hint = $('[data-hint]');
const tag = $('[data-tag]'), tagT = $('[data-tag-t]');
const sky = { hot: $('[data-sky-hot]'), uv: $('[data-sky-uv]') };
const haze = $('[data-haze]');
const root = document.documentElement;

let lastEx = -1, lastCabin = '', lastTag = -1;
const tagPos = { x: 0, y: 0, vis: false };
function setSky(cool, uv) {
  sky.hot.style.opacity = String(1 - cool);
  sky.uv.style.opacity = String(uv);
  haze.style.opacity = String((1 - cool) * (1 - uv));
  root.classList.toggle('is-uv', uv > 0.5);
}

function filmUI(p) {
  const heroOut = seg(p, 0.045, 0.085);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0.0, 0.03);

  const T = cabinAt(p);
  const cool = clamp((38 - T) / 32);
  const uv = seg(p, 0.375, 0.4) * (1 - seg(p, 0.49, 0.51));
  setSky(cool, uv);
  const tTxt = nf(T, 1);
  if (tTxt !== lastCabin) {
    cabinEl.textContent = tTxt;
    cabinFill.style.transform = `scaleX(${clamp((T - 0) / 45)})`;
    thermo.style.setProperty('--cool', cool.toFixed(3));
    lastCabin = tTxt;
  }

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.02), vout = seg(p, b - 0.02, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(${(1 - vin) * -30}px, ${vout * -24}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.08, 0.1) * (1 - seg(p, 0.885, 0.9));
  rail.style.opacity = railOn;
  rail.style.visibility = railOn > 0.01 ? 'visible' : 'hidden';
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p > CARD_RANGES[i][1]);
  });

  // Manifold saatleri: durağın ortasında arızalı değer düzelir
  const on = seg(p, 0.08, 0.1) * (1 - seg(p, 0.885, 0.9));
  hud.style.opacity = on;
  hud.style.visibility = on > 0.01 ? 'visible' : 'hidden';
  const ai = active >= 0 ? active : CARD_RANGES.findIndex(([, b]) => p < b);
  if (ai >= 0) {
    const o = F[ai].olcum;
    const [a, b] = CARD_RANGES[ai];
    const fix = smooth(seg(p, L(a, b, 0.3), L(a, b, 0.68)));
    let lo = L(o.alcak[0], o.alcak[1], fix);
    let hi = L(o.yuksek[0], o.yuksek[1], fix);
    if (F[ai].id === 'dolum') { // vakum: iki saat de eksiye iner, sonra dolumla çıkar
      const f2 = smooth(seg(p, L(a, b, 0.4), L(a, b, 0.8)));
      lo = L(-0.9, 2.1, f2);
      hi = L(-0.9, 14.8, f2);
    }
    needleLo.style.transform = `rotate(${dialAngle('lo', lo)}deg)`;
    needleHi.style.transform = `rotate(${dialAngle('hi', hi)}deg)`;
    loEl.textContent = nf(lo, 1);
    hiEl.textContent = nf(hi, 1);
    if (lastEx !== ai) {
      exLbl.textContent = o.ek.etiket;
      exUnit.textContent = o.ek.birim;
      lastEx = ai;
    }
    const ev = F[ai].id === 'dolum' ? L(o.ek.once, o.ek.sonra, smooth(seg(p, L(a, b, 0.4), L(a, b, 0.8)))) : L(o.ek.once, o.ek.sonra, fix);
    exVal.textContent = nf(ev, Math.abs(o.ek.sonra) < 20 && o.ek.birim.includes('bar') ? 1 : 0);
    const ok = fix > 0.98 && (F[ai].id !== 'dolum' || ev >= o.ek.sonra - 0.5);
    verdict.textContent = ok ? 'Normal' : F[ai].id === 'dolum' && fix > 0.05 ? 'Vakum / dolum' : 'Arızalı';
    hud.classList.toggle('is-ok', ok);
  }

  // Parça etiketi: 3D parçanın ekrandaki yerine yapışır
  const hlOn = active >= 0 ? seg(p, CARD_RANGES[active][0] + 0.012, CARD_RANGES[active][0] + 0.03) * (1 - seg(p, CARD_RANGES[active][1] - 0.02, CARD_RANGES[active][1] - 0.005)) : 0;
  if (active >= 0) {
    if (lastTag !== active) {
      tagT.textContent = up(F[active].durak);
      lastTag = active;
    }
    S.project(S.points[F[active].id], tagPos);
    tag.style.transform = `translate3d(${tagPos.x.toFixed(1)}px, ${tagPos.y.toFixed(1)}px, 0)`;
  }
  tag.style.opacity = tagPos.vis ? hlOn : 0;

  const ov = seg(p, 0.9, 0.93) * (1 - seg(p, 0.985, 1));
  overview.style.opacity = ov;
  overview.style.visibility = ov > 0.01 ? 'visible' : 'hidden';
  overview.style.transform = `translate3d(0, ${(1 - ov) * 30}px, 0)`;
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });

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
  // Başlıklar buğudan netleşerek yükselir
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'words', wordsClass: 'rw' });
    gsap.fromTo(s.words, { yPercent: 60, opacity: 0, filter: 'blur(8px)' }, {
      yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      onComplete: () => gsap.set(s.words, { clearProps: 'filter' }),
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.14 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.18, yPercent: -5 }, {
    scale: 1, yPercent: 5, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
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
  // Hizmet satırları: ortadan geçerken sıcak şerit soğur
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--cool': 0 }, {
      '--cool': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 45%', scrub: true },
    });
  });
  // Fotoğraflar: masaüstünde kayarak geçer
  const track = $('[data-shots]');
  ScrollTrigger.matchMedia({
    '(min-width: 760px)': () => {
      gsap.fromTo(track, { x: 0 }, {
        x: () => -Math.max(0, track.scrollWidth - innerWidth + 80), ease: 'none',
        scrollTrigger: { trigger: '.shots', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    },
  });
  $$('.shot img').forEach((img) => {
    gsap.fromTo(img, { scale: 1.15 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'left right', end: 'right left', horizontal: false, scrub: true },
    });
  });
  // Süreç: termometre cıvası dolar
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 64%', onToggle: (self) => s.classList.toggle('is-lit', self.progress > 0 || self.isActive) });
  });
  gsap.fromTo('.rev', { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__rail', start: 'top 85%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  gsap.fromTo('.chip', { y: 16, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-chips]', start: 'top 88%', once: true },
  });
  // Final: sıcaklık 38'den düşer, başlık buğudan çıkar
  const ftemp = $('[data-final-temp]');
  const ft = { v: 38 };
  const fsplit = new SplitText('[data-final-title]', { type: 'words', wordsClass: 'rw' });
  gsap.timeline({ scrollTrigger: { trigger: '[data-finale]', start: 'top 40%', once: true } })
    .to(ft, { v: 6, duration: 1.8, ease: 'power3.out', onUpdate: () => (ftemp.textContent = nf(ft.v)) }, 0)
    .fromTo(fsplit.words, { yPercent: 70, opacity: 0, filter: 'blur(10px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1, stagger: 0.07, ease: 'power3.out' }, 0.2);
}

// Markalar: kaydırma hızına göre hızlanır
const mq = $('.marquee__inner');
let mqX = 0;
let mqVisible = false;
new IntersectionObserver((e) => (mqVisible = e[0].isIntersecting)).observe(mq);

let lastT = performance.now();
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

  const showFilm = filmActive && canvas.style.opacity !== '0';
  const showFinale = finaleActive || canvasFinale > 0.001;
  if (showFinale && !filmActive) {
    canvas.style.opacity = canvasFinale;
    setSky(1, 0);
    S.update(finaleState(finaleQ, time), now);
  } else if (showFilm) {
    S.update(filmState(filmP, time), now);
  }

  if (mqVisible) {
    const w = mq.scrollWidth / 2;
    mqX -= (40 + vel * 700) * dt;
    if (mqX < -w) mqX += w;
    mq.style.transform = `translate3d(${mqX}px,0,0)`;
  }
  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());

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

// --- Açılış: 41 °C kabin, A/C düğmesine basılır, devre çalışmaya başlar ---------

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 90, opacity: 0, filter: 'blur(12px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.0, stagger: 0.028, ease: 'power3.out', onComplete: () => gsap.set(split.chars, { clearProps: 'filter' }) }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.thermo'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.35);
}

function runIntro() {
  const intro = $('[data-intro]');
  const tempEl = $('[data-intro-temp]');
  const ac = $('[data-intro-ac]');
  let done = false;
  const o = { v: 41 };
  const tl = gsap.timeline();
  tl.fromTo('.intro__temp', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0);
  tl.fromTo([ac, '.intro__lbl', '.intro__name'], { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(2)' }, 0.1);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000));
  }, [], 0.2);
  tl.call(() => ac.classList.add('is-on'), [], 0.75);
  tl.to(ac, { scale: 0.92, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 0.72);
  tl.to(o, { v: 38, duration: 0.6, ease: 'power2.out', onUpdate: () => (tempEl.textContent = nf(o.v)) }, 0.8);
  tl.add(finish, 1.3);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    ac.classList.add('is-on');
    tempEl.textContent = '38';
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .fromTo('[data-intro-cold]', { scale: 0, opacity: 1 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power3.in' }, 0)
      .to('.intro__center', { opacity: 0, scale: 1.08, duration: 0.35, ease: 'power2.in' }, 0.1)
      .to(intro, { opacity: 0, duration: 0.45, ease: 'power2.out' }, 0.6)
      .call(heroIn, [], 0.55);
    document.body.classList.remove('is-loading');
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

if (reducedMotion) {
  root.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.compile();
  const still = () => S.update({ ...filmState(0.95, 0), heat: 0, charge: 1, frost: 1 });
  still();
  setSky(1, 0);
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  gsap.set('.svc__row', { '--cool': 1 });
  $('[data-final-temp]').textContent = '6';
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
