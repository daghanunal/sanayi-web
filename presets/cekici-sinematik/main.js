import sektor from '../../data/sektor-cekici.json';
import ek from '../../data/cekici-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import * as THREE from 'three';
import { createScene, ROAD, CAR_X, TRUCK_STOP } from './scene.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'cekici-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t * t;
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const up = (s) => s.toLocaleUpperCase('tr');
const low = (s) => s.toLocaleLowerCase('tr');

// "2008'den", "1995'ten", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`;

// --- İçerik ------------------------------------------------------------------

const ad = d.isletme.ad;
const binds = { ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$$('[data-wa-konum]').forEach((a) => (a.href = waHref(d, `Merhaba ${ad}, yolda kaldım. Konumumu gönderiyorum. Araç: `)));
$('.top__brand').setAttribute('aria-label', `${ad}, sayfa başı`);

const status = openStatus(d.saatler);
const hatText = d.yediYirmiDort ? 'Hat açık · 7/24' : status.open ? 'Şu an açık' : 'Şu an kapalı';
$('[data-status]').textContent = hatText;
$('[data-status-big]').textContent = d.yediYirmiDort ? 'Şu an açık. Gece, bayram, kar demeden telefonu açarız.' : status.text;
$('[data-status-big]').classList.toggle('is-open', d.yediYirmiDort || status.open);

// Açılış
$('[data-intro-time]').textContent = d.intro.saat;
$('[data-intro-where]').textContent = `${d.intro.yer} · ${d.intro.not}`;
$('[data-intro-name]').textContent = ad;

// Hero
$('[data-kicker]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = up(ad);
heroTitle.style.setProperty('--fit', Math.max(6, ...up(ad).split(/\s+/).map((w) => w.length)));

// Film bölümleri
const film = d.film.map((f) => ({
  ...f,
  metin: f.metin ?? d.surec[f.surec]?.aciklama ?? '',
}));
$('[data-rail]').innerHTML = film.map((f, i) => `<li data-rail-i><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(f.etiket)}</span></li>`).join('');
$('[data-cards]').innerHTML = film.map((f) => `
  <article class="card" data-card="${esc(f.id)}">
    <p class="card__kicker"><b>${esc(f.saat)}</b><span>${esc(up(f.etiket))}</span></p>
    <h2 class="card__title">${esc(f.baslik)}</h2>
    <p class="card__text">${esc(f.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${ad}, ${low(f.hizmet)} için arıyorum. Konumum: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(f.hizmet)} için yazın</span></a>
  </article>`).join('');
$('[data-route-to]').textContent = d.intro.yer.split(',')[0];

const fotoCh = film.find((f) => f.id === 'foto');
$('[data-shots]').innerHTML = (fotoCh?.kareler ?? []).map((k) => `
  <figure class="shot" data-shot><canvas width="200" height="140"></canvas><figcaption><span>${esc(k)}</span><i>✓</i></figcaption></figure>`).join('');
const svcByName = Object.fromEntries(d.hizmetler.map((h) => [h.baslik, h]));
const yerCh = film.find((f) => f.id === 'yerinde');
$('[data-onsite]').innerHTML = (yerCh?.yerinde ?? []).map((n) => `
  <li><span>${esc(n)}</span><b>${esc(svcByName[n]?.sure ?? '')}</b></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="plate">
    <p class="plate__n">${String(i + 1).padStart(2, '0')}</p>
    <h3 class="plate__name">${esc(s.baslik)}</h3>
    <p class="plate__desc">${esc(s.aciklama)}</p>
    <p class="plate__time"><i></i>${esc(s.sure)}</p>
  </li>`).join('');

// Güven
const yil = new Date().getFullYear() - d.isletme.kurulus;
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger) || 0}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');
$('[data-garanti]').textContent = d.garanti;

// Yolda kaldıysanız
const yk = d.yoldaKaldiysaniz;
$('[data-safe-title]').textContent = yk.baslik;
$('[data-safe-steps]').innerHTML = yk.maddeler.map((m, i) => `
  <li class="sstep" data-sstep><p class="sstep__n">${i + 1}</p><div><h3>${esc(m.baslik)}</h3><p>${esc(m.metin)}</p></div></li>`).join('');

// Galeri şeridi
const reelPics = d.galeri.slice(0, 7);
$('[data-reel-track]').innerHTML = reelPics.map((g, i) => `
  <figure class="reel__item${i % 3 === 1 ? ' is-tall' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Math.max(0, Math.min(5, Number(y.puan) || 0)))}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(up(m))}</span>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div><dt>${esc(g)}</dt><dd>${esc(h === '00:00 – 24:00' ? '24 saat' : h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${ad}`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Konum gönder: tarayıcıdan konumu alır, WhatsApp mesajına ekler
const geoBtn = $('[data-geo]');
const geoLabel = $('[data-geo-label]');
geoBtn.addEventListener('click', () => {
  const send = (link) => {
    location.href = waHref(d, `Merhaba ${ad}, yolda kaldım.${link ? ` Konumum: ${link}` : ' Konumumu buradan paylaşıyorum.'} Araç: `);
  };
  if (!navigator.geolocation) return send('');
  geoLabel.textContent = 'Konum alınıyor…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      geoLabel.textContent = 'WhatsApp açılıyor';
      send(`https://maps.google.com/?q=${la.toFixed(6)},${lo.toFixed(6)}`);
    },
    () => { geoLabel.textContent = "Konumumu WhatsApp'tan gönder"; send(''); },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
  );
});

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__tj = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Z = ROAD.shoulder;
const CARC = V(CAR_X, 0.75, Z);

// Film zaman çizelgesi (0..1)
const T = {
  heroOut: [0.05, 0.09],
  drive: [0.1, 0.34],
  tilt: [0.6, 0.635],
  slide: [0.625, 0.66],
  winch: [0.665, 0.73],
  back: [0.735, 0.775],
  leave: [0.79, 0.95],
};
const CARD_RANGES = [[0.11, 0.33], [0.355, 0.47], [0.48, 0.585], [0.595, 0.775], [0.785, 0.885]];
const FOTO = CARD_RANGES[2];
const DRIVE_FROM = -175;

function truckX(p) {
  if (p < T.leave[0]) return L(DRIVE_FROM, TRUCK_STOP, easeOut(seg(p, ...T.drive)));
  return TRUCK_STOP + easeIn(seg(p, ...T.leave)) * 150;
}
function truckSpeed(p) {
  const e = 0.003;
  return Math.abs(truckX(Math.min(1, p + e)) - truckX(Math.max(0, p - e))) / (2 * e) / 60;
}

// Fotoğraf turu: kamera otomobilin çevresinde döner. Sağ → ön → sol → arka
function orbitPose(u) {
  const m = mobile();
  const phi = Math.PI / 2 - Math.PI * 1.5 * u;
  const rx = m ? 5 : 4.4, rz = m ? 12.5 : 7.8;
  const k = Math.abs(Math.cos(phi)); // uçlarda (ön/arka) yakın: biraz daha yüksek ve geniş
  return { pos: V(CAR_X + Math.cos(phi) * rx, (m ? 4 : 2.3) + k * 0.8, Z + Math.sin(phi) * rz), look: V(CAR_X, m ? -0.9 : 0.5, Z), fov: (m ? 54 : 40) + k * 14 };
}
const fotoU = (p) => seg(p, FOTO[0] + 0.012, FOTO[1] - 0.012);

function POSE(name, p) {
  const m = mobile();
  const tx = truckX(p);
  const Tv = V(tx, 0, Z);
  switch (name) {
    case 'hero': return m
      ? { pos: V(-17, 7.6, 20), look: V(1.5, -0.8, 1.2), fov: 50 }
      : { pos: V(-15.5, 5.2, 15.5), look: V(-2.5, -1.4, 2.5), fov: 36 };
    case 'chase': return m
      ? { pos: Tv.clone().add(V(-12.5, 4.4, 7.5)), look: Tv.clone().add(V(8, 0.2, -1.5)), fov: 58 }
      : { pos: Tv.clone().add(V(-10.5, 3.1, 6.2)), look: Tv.clone().add(V(9, 1.2, -1.5)), fov: 44 };
    case 'side': return m
      ? { pos: Tv.clone().add(V(4, 2.2, 11.5)), look: Tv.clone().add(V(-3.5, 0.6, 0)), fov: 56 }
      : { pos: Tv.clone().add(V(3, 1.5, 9.5)), look: Tv.clone().add(V(-3, 1.3, 0)), fov: 42 };
    case 'arrive': return m
      ? { pos: V(-9.5, 3.2, 14), look: V(4.2, 0.2, 2.6), fov: 52 }
      : { pos: V(-7.5, 1.9, 11.5), look: V(4.2, 1.1, 2.8), fov: 38 };
    case 'onsite': return m
      ? { pos: V(-6.5, 4.2, 15), look: V(2.2, -1.6, 3.2), fov: 52 }
      : { pos: V(-6.2, 2.6, 11.5), look: V(2.4, 0.6, 3.2), fov: 38 };
    case 'foto': return orbitPose(fotoU(p));
    case 'load': return m
      ? { pos: V(-9, 5, 20), look: V(4.4, -1.8, 3), fov: 54 }
      : { pos: V(-8, 3.2, 14), look: V(4.6, 1.0, 3), fov: 42 };
    case 'loadClose': return m
      ? { pos: V(-3.5, 3.2, 15), look: V(5.4, -1.2, 3.1), fov: 52 }
      : { pos: V(-2.6, 1.8, 11), look: V(5.4, 1.3, 3.1), fov: 42 };
    case 'depart': return m
      ? { pos: Tv.clone().add(V(10, 2.8, 10)), look: Tv.clone().add(V(-2.5, 0.8, 0)), fov: 54 }
      : { pos: Tv.clone().add(V(9, 2.1, 7.5)), look: Tv.clone().add(V(-2, 1.6, 0)), fov: 42 };
    case 'aerial': return m
      ? { pos: Tv.clone().add(V(-38, 30, 42)), look: Tv.clone().add(V(14, 0, -18)), fov: 52 }
      : { pos: Tv.clone().add(V(-34, 24, 30)), look: Tv.clone().add(V(16, 2, -16)), fov: 42 };
    default: return POSE('hero', p);
  }
}

const KF = [
  [0.0, 'hero'], [0.06, 'hero'], [0.12, 'chase'], [0.27, 'chase'], [0.33, 'side'], [0.36, 'arrive'],
  [0.38, 'onsite'], [0.465, 'onsite'], [FOTO[0] + 0.012, 'foto'], [FOTO[1] - 0.012, 'foto'],
  [0.605, 'load'], [0.655, 'load'], [0.69, 'loadClose'], [0.74, 'loadClose'], [0.77, 'load'],
  [0.8, 'depart'], [0.86, 'depart'], [0.93, 'aerial'], [1.0, 'aerial'],
];

function filmPose(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = POSE(a[1], p), B = POSE(b[1], p);
  return { pos: A.pos.lerp(B.pos, t), look: A.look.lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

let flashAmt = 0;
const flashPos = new THREE.Vector3();
function filmState(p, time, vel) {
  const pose = filmPose(p);
  // Nefes alan kamera
  const calm = 1 - seg(p, 0.1, 0.12) + seg(p, 0.355, 0.38) * (1 - seg(p, 0.465, 0.48)) + seg(p, 0.93, 0.96);
  pose.pos.x += Math.sin(time * 0.35) * 0.25 * clamp(calm);
  pose.pos.y += Math.sin(time * 0.5) * 0.08 * clamp(calm);
  const tilt = smooth(seg(p, ...T.tilt)) * (1 - smooth(seg(p, T.back[0] + 0.012, T.back[1])));
  const slide = smooth(seg(p, ...T.slide)) * (1 - smooth(seg(p, T.back[0], T.back[1] - 0.012)));
  const loaded = p >= T.back[0] ? 1 : 0;
  const w = smooth(seg(p, ...T.winch));
  const sp = truckSpeed(p);
  return {
    ...pose,
    truckX: truckX(p), truckZ: Z, speed: sp + vel * 0,
    tilt, slide, winch: loaded ? 1 : w, loaded,
    carSpin: seg(p, T.winch[0], T.winch[1]) > 0 && seg(p, T.winch[0], T.winch[1]) < 1 ? 0.6 : 0,
    straps: p > T.back[0] - 0.005 ? 1 : 0,
    hazard: p < T.back[0] ? 1 : 0,
    beacon: 1,
    work: seg(p, 0.38, 0.41) * (1 - seg(p, 0.78, 0.8)),
    flash: flashAmt, flashPos,
  };
}

function finaleState(q, time) {
  const m = mobile();
  const a = -0.9 + q * 0.7 + Math.sin(time * 0.15) * 0.05;
  const c = V(TRUCK_STOP + 1.2, 1.4, Z);
  const r = m ? 17 : 13;
  return {
    pos: V(c.x + Math.cos(a) * r, m ? 3.6 : 2.4, c.z + Math.sin(-a) * r * 0.8 + 3),
    look: m ? V(c.x - 1, 0.6, c.z) : V(c.x - 3.2, 2.2, c.z + 1.5),
    fov: m ? 52 : 38,
    truckX: TRUCK_STOP, truckZ: Z, speed: 0, tilt: 0, slide: 0, winch: 1, loaded: 1, carSpin: 0,
    straps: 1, hazard: 0, beacon: 1, work: 0, flash: 0,
  };
}

// --- Film UI -------------------------------------------------------------

const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const hud = $('[data-hud]');
const clockEl = $('[data-hud-clock]');
const etaBox = $('[data-hud-eta]');
const etaB = $('[data-hud-eta] b');
const route = $('[data-route]');
const routePath = $('[data-route-path]');
const routeTruck = $('[data-route-truck]');
const routeLen = routePath.getTotalLength();
routePath.style.strokeDasharray = routeLen;
const shotsBox = $('[data-shots]');
const shotEls = $$('[data-shot]');
const onsite = $('[data-onsite]');
const onsiteItems = $$('li', onsite);
const overview = $('[data-overview]');
const hint = $('[data-hint]');
const flashEl = $('[data-flash]');

// Saat: kurgu noktaları
const t0 = toMin(d.intro.saat);
const CLOCK = [[0, t0], [CARD_RANGES[0][0], toMin(film[0].saat)], ...film.slice(1).map((f, i) => [CARD_RANGES[i + 1][0], toMin(f.saat)]), [1, toMin(film.at(-1).saat) + 6]]
  .map(([p, m]) => [p, m < t0 ? m + 1440 : m]);
const ETA_TOTAL = CLOCK[2][1] - CLOCK[1][1];
function clockAt(p) {
  let i = 0;
  while (i < CLOCK.length - 2 && p > CLOCK[i + 1][0]) i++;
  const [pa, ma] = CLOCK[i], [pb, mb] = CLOCK[i + 1];
  return L(ma, mb, seg(p, pa, pb));
}

const vis = (el, v) => {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
};

const shotTaken = [false, false, false, false];
const SHOT_AT = [0.02, 0.34, 0.67, 0.985];
let lastClock = '', lastEta = '';
let pendingShot = -1;
function filmUI(p) {
  const heroOut = seg(p, ...T.heroOut);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0, 0.025);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.018), vout = seg(p, b - 0.016, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(${(1 - vin) * 34 - vout * 34}px, 0, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.09, 0.11) * (1 - seg(p, 0.89, 0.91));
  vis(rail, railOn);
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p >= CARD_RANGES[i][1]);
  });

  // HUD: saat ve varış süresi
  vis(hud, 1 - seg(p, 0.9, 0.93));
  const c = fmt(clockAt(p));
  if (c !== lastClock) { clockEl.textContent = c; lastClock = c; }
  const drive = seg(p, ...T.drive);
  const eta = drive >= 1 ? 'Vardık' : `${Math.ceil(ETA_TOTAL * (1 - drive))} dk`;
  if (eta !== lastEta) {
    etaB.textContent = eta;
    lastEta = eta;
    etaBox.classList.toggle('is-here', drive >= 1);
  }
  etaBox.style.opacity = 1 - seg(p, 0.47, 0.49);

  // Güzergâh
  const rOn = seg(p, 0.11, 0.13) * (1 - seg(p, 0.34, 0.36));
  vis(route, rOn);
  if (rOn > 0.01) {
    routePath.style.strokeDashoffset = routeLen * (1 - drive);
    const pt = routePath.getPointAtLength(routeLen * drive);
    routeTruck.setAttribute('cx', pt.x.toFixed(1));
    routeTruck.setAttribute('cy', pt.y.toFixed(1));
  }

  // Yerinde işler
  const oOn = seg(p, 0.37, 0.385) * (1 - seg(p, 0.455, 0.47));
  vis(onsite, oOn);
  onsiteItems.forEach((li, i) => li.classList.toggle('is-on', p > 0.385 + i * 0.022));

  // Fotoğraflar
  const sOn = seg(p, FOTO[0], FOTO[0] + 0.012) * (1 - seg(p, 0.6, 0.615));
  vis(shotsBox, sOn);
  const u = fotoU(p);
  SHOT_AT.forEach((at, i) => {
    const hit = p > FOTO[0] + 0.01 && u >= at;
    if (hit && !shotTaken[i]) {
      shotTaken[i] = true;
      pendingShot = i;
      flashAmt = 1;
      flashEl.style.opacity = 0.85;
      shotEls[i].classList.add('is-taken');
    }
  });

  vis(overview, seg(p, 0.925, 0.95) * (1 - seg(p, 0.99, 1)));
  overview.style.transform = `translate3d(0, ${(1 - seg(p, 0.925, 0.95)) * 30}px, 0)`;
}

// Deklanşör: flaş anında WebGL karesini küçük tuvale kopyalar (render ile aynı karede)
function captureShot(i) {
  const cv = shotEls[i]?.querySelector('canvas');
  if (!cv) return;
  const g = cv.getContext('2d');
  const sw = canvas.width, sh = canvas.height;
  const ar = cv.width / cv.height;
  let w = sw, h = sw / ar;
  if (h > sh) { h = sh; w = sh * ar; }
  try {
    g.drawImage(canvas, (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, cv.width, cv.height);
  } catch (e) { /* sessiz */ }
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'hw', charsClass: 'ch' });

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
let vel = 0;
let canvasFinale = 0;
let filmST = null, finaleST = null;
let filmVisible = 1;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));

  filmST = ScrollTrigger.create({
    trigger: '[data-film]', start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-film]', start: 'bottom bottom', end: 'bottom 30%',
    onUpdate: (self) => (filmVisible = 1 - self.progress),
  });
  finaleST = ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'top 25%',
    onUpdate: (self) => (canvasFinale = self.progress),
  });
  ScrollTrigger.create({
    trigger: '#hizmetler', start: 'top 70px',
    endTrigger: '[data-finale]', end: 'top 70px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar: kelimeler yukarı kalkar
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'words', wordsClass: 'rw' });
    gsap.fromTo(s.words, { yPercent: 110, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });
  // Levhalar: yol kenarından geçer gibi
  $$('.plate').forEach((row, i) => {
    gsap.fromTo(row, { x: i % 2 ? 60 : -60, opacity: 0, rotate: i % 2 ? 1.5 : -1.5 }, {
      x: 0, opacity: 1, rotate: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: row, start: 'top 90%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.trust__img img', { scale: 1.18, yPercent: -5 }, {
    scale: 1, yPercent: 5, ease: 'none',
    scrollTrigger: { trigger: '.trust__img', start: 'top bottom', end: 'bottom top', scrub: true },
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

  // İmza: yolda kaldıysanız. Kaydırdıkça 4 adım canlanır
  const steps = $$('[data-sstep]');
  const haz = $$('[data-safe-haz]');
  const tri = $('[data-safe-tri]');
  const dist = $('[data-safe-dist]');
  const mText = $('[data-safe-m]');
  const person = $('[data-safe-person]');
  const call = $('[data-safe-call]');
  gsap.set(dist, { drawSVG: '0%' });
  let lastStep = -1;
  ScrollTrigger.create({
    trigger: '[data-safe]', start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => {
      const q = self.progress;
      const k = Math.min(3, Math.floor(q * 4.001));
      if (k !== lastStep) {
        steps.forEach((s, i) => { s.classList.toggle('is-on', i === k); s.classList.toggle('is-done', i < k); });
        lastStep = k;
      }
      haz.forEach((h) => h.classList.toggle('is-blink', q > 0.02));
      const q2 = seg(q, 0.25, 0.45);
      tri.style.transform = `translate3d(${(1 - q2) * 150}px, 0, 0)`;
      tri.style.opacity = 0.2 + q2 * 0.8;
      gsap.set(dist, { drawSVG: `0% ${seg(q, 0.35, 0.5) * 100}%` });
      mText.style.opacity = seg(q, 0.42, 0.5);
      const q3 = seg(q, 0.5, 0.7);
      person.style.transform = `translate3d(${q3 * -20}px, ${(1 - q3) * 58}px, 0)`;
      call.classList.toggle('is-on', q > 0.76);
    },
  });

  // Galeri şeridi: kaydırmayla yana akar
  const track = $('[data-reel-track]');
  gsap.fromTo(track, { x: () => (mobile() ? 20 : 80) }, {
    x: () => -Math.max(0, track.scrollWidth - innerWidth + (mobile() ? 20 : 80)),
    ease: 'none',
    scrollTrigger: { trigger: '[data-reel]', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });

  gsap.fromTo('.rev', { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-reviews]', start: 'top 85%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  gsap.fromTo('.base__big', { '--sweep': '0deg' }, {
    '--sweep': '360deg', duration: 1.6, ease: 'power2.inOut',
    scrollTrigger: { trigger: '.base', start: 'top 75%', once: true },
  });

  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.fromTo(fsplit.chars, { yPercent: 120, opacity: 0 }, {
    yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.025, ease: 'power4.out',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 40%', once: true },
  });
}

const mq = $('.marquee__inner');
let mqX = 0;
let lastT = performance.now();
let lastFilmP = -1;

function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;
  flashAmt *= Math.exp(-dt * 9);
  if (flashAmt < 0.01) flashAmt = 0;
  flashEl.style.opacity = flashAmt * 0.85;

  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  if (Math.abs(filmP - filmTarget) < 0.00005) filmP = filmTarget;
  const filmActive = !filmST || filmST.progress < 1 || filmVisible > 0.001;
  if (filmActive && filmP !== lastFilmP) { filmUI(filmP); lastFilmP = filmP; }

  const finaleOn = finaleST && (finaleST.progress > 0 || canvasFinale > 0.001);
  if (finaleOn && filmVisible <= 0.001) {
    canvas.style.opacity = canvasFinale;
    canvas.style.visibility = 'visible';
    flashPos.set(0, 0, 0);
    S.update(finaleState(finaleQ, time), now);
  } else if (filmActive && filmVisible > 0.001) {
    canvas.style.opacity = filmVisible;
    canvas.style.visibility = 'visible';
    flashPos.copy(S.camera.position);
    S.update(filmState(filmP, time, vel), now);
    if (pendingShot >= 0) { captureShot(pendingShot); pendingShot = -1; }
  } else if (canvas.style.visibility !== 'hidden') {
    canvas.style.visibility = 'hidden';
  }

  const w = mq.scrollWidth / 2;
  mqX -= (40 + vel * 700) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0)`;

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

// --- Açılış: telefon çalar, açılır, tepe lambası süpürmesiyle sahne açılır -----

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.03, ease: 'power4.out' }, 0)
    .fromTo(['.hero__kicker', '.hero__slogan', '.hero__cta', '.hud'], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.25);
}

function runIntro() {
  const intro = $('[data-intro]');
  const knob = $('[data-intro-knob]');
  let done = false;
  const tl = gsap.timeline();
  tl.fromTo('.intro__phone', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }, 0)
    .fromTo(['.intro__time', '.intro__label', '.intro__where', '.intro__slide'], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05 }, 0.05)
    .fromTo('.intro__icon', { rotate: -14 }, { rotate: 14, duration: 0.07, repeat: 7, yoyo: true, ease: 'none' }, 0.2)
    .to(knob, { x: () => knob.parentElement.clientWidth - knob.offsetWidth - 8, duration: 0.45, ease: 'power2.inOut' }, 0.6)
    .to('.intro__slide', { opacity: 0, duration: 0.2 }, 1.02)
    .fromTo('[data-intro-answer]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, 1.02)
    .call(() => {
      S.compile();
      S.update(filmState(0, performance.now() / 1000, 0));
    }, [], 0.3);
  tl.add(finish, 1.35);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    lenis?.start();
    document.body.classList.remove('is-loading');
    const o = { a: 0 };
    gsap.timeline({ onComplete: () => intro.remove() })
      .to('[data-intro-call]', { opacity: 0, scale: 0.94, duration: 0.25, ease: 'power2.in' }, 0)
      .to(o, {
        a: 360, duration: 0.8, ease: 'power2.inOut',
        onUpdate: () => intro.style.setProperty('--sweep', `${o.a}deg`),
      }, 0.1)
      .call(heroIn, [], 0.45);
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
  const still = () => S.update(filmState(0, 0, 0));
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('[data-sstep]').forEach((s) => s.classList.add('is-on'));
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
