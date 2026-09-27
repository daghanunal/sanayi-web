import sektor from '../../data/sektor-cekici.json';
import ek from '../../data/cekici-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger, vitrinModu,
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
const phoneMQ = matchMedia('(max-width: 759px)');
const mobile = () => phoneMQ.matches;
const lite = weak || mobile();
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

// Film durakları
const film = d.film.map((f) => ({ ...f, metin: f.metin ?? d.surec[f.surec]?.aciklama ?? '' }));
const svcByName = Object.fromEntries(d.hizmetler.map((h) => [h.baslik, h]));
const hedef = d.intro.yer.split(',')[0];
const LIVE = {
  yola: () => `
    <div class="route" data-route aria-hidden="true">
      <svg viewBox="0 0 220 96">
        <path class="route__base" d="M16 80 C 60 80, 70 30, 118 34 S 176 14, 204 16" />
        <path class="route__done" data-route-path d="M16 80 C 60 80, 70 30, 118 34 S 176 14, 204 16" />
        <circle class="route__a" cx="16" cy="80" r="5" />
        <circle class="route__b" cx="204" cy="16" r="6" />
        <circle class="route__truck" data-route-truck r="5" cx="16" cy="80" />
      </svg>
      <p><span>Şaşmaz</span><span>${esc(hedef)}</span></p>
    </div>`,
  yerinde: (f) => `<ul class="onsite" data-onsite>${(f.yerinde ?? []).map((n) => `<li><span>${esc(n)}</span><b>${esc(svcByName[n]?.sure ?? '')}</b></li>`).join('')}</ul>`,
  foto: (f) => `<div class="shots" data-shots aria-hidden="true">${(f.kareler ?? []).map((k) => `<figure class="shot" data-shot><canvas width="200" height="140"></canvas><figcaption><span>${esc(k)}</span><i>✓</i></figcaption></figure>`).join('')}</div>`,
  yukleme: () => `<ol class="ticks" data-ticks>${['Kasa yere iner', 'Vinç aracı kasaya alır', 'Tekerler kayışla sabitlenir'].map((t) => `<li><i></i>${esc(t)}</li>`).join('')}</ol>`,
  teslim: () => `<ol class="ticks" data-ticks>${['Aracınız istediğiniz adrese', 'Teslim fotoğrafı WhatsApp\'ta', 'Anahtarın kimde olduğu bildirilir'].map((t) => `<li><i></i>${esc(t)}</li>`).join('')}</ol>`,
};
$('[data-film]').insertAdjacentHTML('beforeend', film.map((f) => `
  <section class="stop" data-stop="${esc(f.id)}" id="${esc(f.id)}" aria-labelledby="t-${esc(f.id)}">
    <div class="stop__sticky">
      <article class="card" data-card>
        <p class="card__kicker"><b>${esc(f.saat)}</b><span>${esc(up(f.etiket))}</span></p>
        <h2 class="card__title" id="t-${esc(f.id)}">${esc(f.baslik)}</h2>
        <div class="card__swap">
          <p class="card__text">${esc(f.metin)}</p>
          <div class="live">${LIVE[f.id] ? LIVE[f.id](f) : ''}</div>
        </div>
        <a class="card__wa" href="${esc(waHref(d, `Merhaba ${ad}, ${low(f.hizmet)} için arıyorum. Konumum: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(f.hizmet)} için yazın</span></a>
      </article>
    </div>
  </section>`).join(''));

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
  <li class="stat"><p class="stat__num">${/^\//.test(s.sonek || '') ? `<b>${esc(String(s.sonek).slice(1))}/${esc(s.deger)}</b>` : `<b data-count="${Number(s.deger) || 0}">0</b>${esc(s.sonek)}`}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');
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
$('[data-puan-adet]').textContent = `Örnek puan · ${nf(d.puan.adet)} değerlendirme`;
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
if (import.meta.env.DEV) window.__cek = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Z = ROAD.shoulder;
const LANE = 1.1;
const loader = $('[data-loader]');
S.ready.then(() => loader.classList.add('is-done')).catch(() => loader.classList.add('is-done'));

// Çekici yolu: sağ şeritten gelir, otomobilin önünde emniyet şeridine yanaşır; teslimde şeride döner
const DRIVE_FROM = -170;
const laneZ = (x, leaving) => (leaving ? L(Z, LANE, smooth(seg(x, TRUCK_STOP + 4, TRUCK_STOP + 22))) : L(LANE, Z, smooth(seg(x, -9, TRUCK_STOP - 1.5))));
function truckAt(name, p) {
  let x;
  if (name === 'hero') x = DRIVE_FROM - 30;
  else if (name === 'yola') x = L(DRIVE_FROM, TRUCK_STOP - 34, smooth(seg(p, 0.05, 1)) * 0.3 + seg(p, 0.05, 1) * 0.7);
  else if (name === 'yerinde') x = L(TRUCK_STOP - 34, TRUCK_STOP, easeOut(seg(p, 0, 0.42)));
  else if (name === 'teslim') x = TRUCK_STOP + easeIn(seg(p, 0.12, 0.92)) * 150;
  else x = TRUCK_STOP;
  const leaving = name === 'teslim';
  const z = laneZ(x, leaving);
  const dz = laneZ(x + 0.5, leaving) - laneZ(x - 0.5, leaving);
  return { x, z, yaw: -Math.atan2(dz, 1) };
}

// Fotoğraf turu: kamera otomobilin çevresinde döner. Sağ → ön → sol → arka
function orbitPose(u) {
  const m = mobile();
  const phi = Math.PI / 2 - Math.PI * 1.5 * u;
  const rx = m ? 6.2 : 4.6, rz = m ? 11 : 7.6;
  const k = Math.abs(Math.cos(phi));
  return { pos: V(CAR_X + Math.cos(phi) * rx, (m ? 3.4 : 2.2) + k * 0.8, Z + Math.sin(phi) * rz), look: V(CAR_X, 0.55, Z), fov: (m ? 50 : 38) + k * 10, shiftX: m ? 0 : 0.14, shiftY: m ? 0.18 : 0 };
}
const P = (pos, look, fov, extra = {}) => ({ pos, look, fov, ...extra });
const CAM = {
  hero: (p, m) => m
    ? P(V(-15, 6.4, 19), V(1.2, 0.2, 2.2), 46, { shiftY: 0.2 })
    : P(V(L(-15.5, -13.5, p), 4.6, L(15.5, 14, p)), V(-1.5, -0.6, 2.5), 34, { shiftX: 0.16 }),
  yola: (p, m, T) => {
    const Tv = V(T.x, 0, T.z);
    return m
      ? P(Tv.clone().add(V(-13, 4.6, 8.5)), Tv.clone().add(V(7, 0.6, -1.2)), 54, { shiftY: 0.2 })
      : P(Tv.clone().add(V(-10.5, 3.1, 6.6)), Tv.clone().add(V(9, 1.4, -1.5)), 42, { shiftX: 0.14 });
  },
  yerinde: (p, m) => m
    ? P(V(L(-12, -10, p), L(4.2, 5, p), 19.5), V(5.8, 0.4, 2.8), 50, { shiftY: 0.2 })
    : P(V(L(-8.5, -6.8, p), L(2.2, 2.7, p), L(12.5, 12, p)), V(5.6, 1.0, 3), 38, { shiftX: 0.14 }),
  foto: (p) => orbitPose(seg(p, 0.08, 0.92)),
  yukleme: (p, m) => {
    const c = smooth(seg(p, 0.3, 0.55)) * (1 - smooth(seg(p, 0.8, 0.95)));
    return m
      ? P(V(L(-11, -5, c), L(5, 3.6, c), L(21, 16.5, c)), V(L(6, 6.4, c), 0.3, 3), 52, { shiftY: 0.2 })
      : P(V(L(-9, -3.4, c), L(3.2, 2.1, c), L(15, 11.5, c)), V(L(5.8, 6.2, c), 1.1, 3), 42, { shiftX: 0.14 });
  },
  teslim: (p, m, T) => {
    const Tv = V(T.x, 0, T.z);
    const a = smooth(seg(p, 0.5, 0.95));
    const near = m ? P(Tv.clone().add(V(11, 3, 10.5)), Tv.clone().add(V(-2.5, 0.8, 0)), 52, { shiftY: 0.2 }) : P(Tv.clone().add(V(9, 2.1, 7.5)), Tv.clone().add(V(-2, 1.6, 0)), 42, { shiftX: 0.14 });
    const far = m ? P(Tv.clone().add(V(-38, 30, 42)), Tv.clone().add(V(14, 0, -18)), 52, { shiftY: 0.18 }) : P(Tv.clone().add(V(-34, 24, 30)), Tv.clone().add(V(16, 2, -16)), 42, { shiftX: 0.14 });
    return lerpPose(near, far, a);
  },
};
const PREV = { hero: 'hero', yola: 'hero', yerinde: 'yola', foto: 'yerinde', yukleme: 'foto', teslim: 'yukleme' };
function lerpPose(A, B, t) {
  return {
    pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t),
    shiftX: L(A.shiftX || 0, B.shiftX || 0, t), shiftY: L(A.shiftY || 0, B.shiftY || 0, t),
  };
}
function camFor(name, p) {
  const m = mobile();
  const cur = CAM[name](p, m, truckAt(name, p));
  if (name === 'hero') return cur;
  const t = smooth(seg(p, 0, 0.18));
  const pn = PREV[name];
  return t >= 1 ? cur : lerpPose(CAM[pn](1, m, truckAt(pn, 1)), cur, t);
}

let flashAmt = 0;
const flashPos = new THREE.Vector3();
function stateFor(name, p, time) {
  const s = camFor(name, p);
  const T = truckAt(name, p);
  const calm = name === 'hero' || name === 'yerinde' ? 1 : 0;
  s.pos.x += Math.sin(time * 0.35) * 0.22 * calm;
  s.pos.y += Math.sin(time * 0.5) * 0.07 * calm;
  Object.assign(s, {
    truckX: T.x, truckZ: T.z, truckYaw: T.yaw, tilt: 0, slide: 0, ramps: 0, winch: 0, loaded: 0, straps: 0,
    hazard: 1, beacon: 1, work: 0, flash: flashAmt, flashPos,
  });
  if (name === 'yerinde') s.work = seg(p, 0.35, 0.5);
  if (name === 'foto') s.work = 1;
  if (name === 'yukleme') {
    s.work = 1;
    const back = smooth(seg(p, 0.84, 0.97));
    s.tilt = smooth(seg(p, 0.04, 0.18)) * (1 - smooth(seg(p, 0.88, 0.99)));
    s.slide = smooth(seg(p, 0.1, 0.28)) * (1 - back);
    s.ramps = smooth(seg(p, 0.2, 0.3)) * (1 - smooth(seg(p, 0.82, 0.88)));
    s.winch = smooth(seg(p, 0.32, 0.78));
    s.winching = p > 0.32 && p < 0.78 ? 1 : 0;
    s.loaded = p >= 0.8 ? 1 : 0;
    s.straps = p > 0.8 ? 1 : 0;
    s.hazard = p < 0.8 ? 1 : 0;
  }
  if (name === 'teslim') {
    Object.assign(s, { loaded: 1, winch: 1, straps: 1, hazard: 0 });
  }
  return s;
}

function finaleState(q, time) {
  const m = mobile();
  const a = -0.9 + q * 0.7 + Math.sin(time * 0.15) * 0.05;
  const c = V(TRUCK_STOP - 0.6, 1.4, Z);
  const r = m ? 17 : 13;
  return {
    pos: V(c.x + Math.cos(a) * r, m ? 3.6 : 2.4, c.z + Math.sin(-a) * r * 0.8 + 3),
    look: m ? V(c.x - 1, 0.6, c.z) : V(c.x - 3.2, 2.2, c.z + 1.5),
    fov: m ? 52 : 38, shiftY: m ? -0.12 : 0,
    truckX: TRUCK_STOP, truckZ: Z, truckYaw: 0, tilt: 0, slide: 0, ramps: 0, winch: 1, loaded: 1,
    straps: 1, hazard: 0, beacon: 1, work: 0, flash: 0,
  };
}

// --- Durak arayüzü -----------------------------------------------------------

const top = $('[data-top]');
const hint = $('[data-hint]');
const clockEl = $('[data-hud-clock]');
const etaBox = $('[data-hud-eta]');
const etaB = $('[data-hud-eta] b');
const routePath = $('[data-route-path]');
const routeTruck = $('[data-route-truck]');
const routeLen = routePath ? routePath.getTotalLength() : 0;
if (routePath) routePath.style.strokeDasharray = routeLen;
const shotEls = $$('[data-shot]');
const onsiteItems = $$('[data-onsite] li');
const flashEl = $('[data-flash]');
const ticks = Object.fromEntries(['yukleme', 'teslim'].map((id) => [id, $$(`[data-stop="${id}"] [data-ticks] li`)]));

const t0 = toMin(d.intro.saat);
const mins = film.map((f) => { const m = toMin(f.saat); return m < t0 ? m + 1440 : m; });
const idxOf = Object.fromEntries(film.map((f, i) => [f.id, i]));
function clockAt(name, p) {
  if (name === 'hero') return t0;
  const i = idxOf[name];
  const next = mins[i + 1] ?? mins[i] + 6;
  return L(mins[i], next, name === 'yola' ? seg(p, 0.05, 1) : p);
}
const ETA_TOTAL = (mins[1] ?? mins[0] + 30) - mins[0];

const shotTaken = [false, false, false, false];
const SHOT_AT = [0.1, 0.36, 0.64, 0.9];
const pendingShots = [];
function setOn(els, fn) { els.forEach((el, i) => el.classList.toggle('is-on', fn(i))); }
const UI = {
  hero: () => false,
  yola(p) {
    const drive = seg(p, 0.05, 1);
    if (routePath) {
      routePath.style.strokeDashoffset = routeLen * (1 - drive);
      const pt = routePath.getPointAtLength(routeLen * drive);
      routeTruck.setAttribute('cx', pt.x.toFixed(1));
      routeTruck.setAttribute('cy', pt.y.toFixed(1));
    }
    return p > 0.22;
  },
  yerinde(p) { setOn(onsiteItems, (i) => p > 0.4 + i * 0.1); return p > 0.35; },
  foto(p) {
    const u = seg(p, 0.08, 0.92);
    SHOT_AT.forEach((at, i) => {
      const hit = u >= at && p > 0.06;
      if (hit && !shotTaken[i]) {
        shotTaken[i] = true;
        pendingShots.push(i);
        flashAmt = 1;
        shotEls[i]?.classList.add('is-taken');
      }
    });
    return p > 0.06;
  },
  yukleme(p) { setOn(ticks.yukleme, (i) => p > [0.12, 0.5, 0.82][i]); return p > 0.12; },
  teslim(p) { setOn(ticks.teslim, (i) => p > [0.2, 0.45, 0.65][i]); return p > 0.2; },
};

function captureShot(i) {
  const cv = shotEls[i]?.querySelector('canvas');
  if (!cv) return;
  const g = cv.getContext('2d');
  const sw = canvas.width, sh = canvas.height;
  const ar = cv.width / cv.height;
  let w = sw * 0.62, h = w / ar;
  if (h > sh) { h = sh; w = sh * ar; }
  const cx = mobile() ? sw / 2 : sw * 0.6, cy = mobile() ? sh * 0.32 : sh / 2;
  try { g.drawImage(canvas, clamp(cx - w / 2, 0, sw - w), clamp(cy - h / 2, 0, sh - h), w, h, 0, 0, cv.width, cv.height); } catch (e) { /* sessiz */ }
}

const stopEls = $$('[data-stop]');
let layout = [];
function measureLayout() {
  layout = stopEls.map((el) => ({ el, name: el.dataset.stop, top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight, card: $('[data-card], .hero', el) }));
}
const liveCur = new Map();
let lastClock = '', lastEta = '';
let filmOn = true, finaleOn = false, finaleQ = 0;

function filmTick(time) {
  const y = scrollY, vh = innerHeight;
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * 0.5) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  for (const l of layout) {
    if (!l.card) continue;
    const o = y - (l.top + l.height - vh);
    const a = o <= 0 ? 1 : clamp(1 - o / (vh * 0.28));
    const r = Math.round(a * 40) / 40;
    if (l.a !== r) {
      l.a = r;
      l.card.style.opacity = r === 1 ? '' : String(r);
      l.card.style.visibility = r === 0 ? 'hidden' : '';
    }
  }
  hint.classList.toggle('is-gone', y > vh * 0.12);
  const live = UI[cur.name](p);
  const card = cur.name !== 'hero' ? cur.card : null;
  if (card && liveCur.get(card) !== live) { liveCur.set(card, live); card.classList.toggle('is-live', !!live); }
  const inFilm = cur.name !== 'hero' && y < cur.top + cur.height - vh * 0.6;
  if (inFilm !== top.classList.contains('in-film')) top.classList.toggle('in-film', inFilm);
  // saat ve varış süresi
  const c = fmt(clockAt(cur.name, p));
  if (c !== lastClock) { clockEl.textContent = c; lastClock = c; }
  const arrived = cur.name !== 'hero' && cur.name !== 'yola';
  const eta = arrived ? 'Vardık' : cur.name === 'hero' ? `${ETA_TOTAL} dk` : `${Math.max(1, Math.ceil(ETA_TOTAL * (1 - seg(p, 0.05, 1))))} dk`;
  if (eta !== lastEta) {
    etaB.textContent = eta;
    lastEta = eta;
    etaBox.classList.toggle('is-here', arrived);
  }
  flashPos.copy(S.camera.position);
  S.update(stateFor(cur.name, p, time));
  while (pendingShots.length) captureShot(pendingShots.shift());
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'hw', charsClass: 'ch' });
let lenis = null;

function setupScroll() {
  lenis = initSmoothScroll({ lerp: 0.1 });
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.target.matches('[data-film]')) filmOn = e.isIntersecting;
      else finaleOn = e.isIntersecting;
    });
    canvas.style.visibility = filmOn || finaleOn ? 'visible' : 'hidden';
  }).observe($('[data-film]'));
  new IntersectionObserver((entries) => {
    finaleOn = entries[0].isIntersecting;
    canvas.style.visibility = filmOn || finaleOn ? 'visible' : 'hidden';
  }).observe($('[data-finale]'));
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
  });
  ScrollTrigger.create({
    trigger: '#hizmetler', start: 'top 70px',
    endTrigger: '[data-finale]', end: 'top 70px',
    onToggle: (self) => top.classList.toggle('is-solid', self.isActive),
  });
  ScrollTrigger.addEventListener('refresh', measureLayout);
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
let mqX = 0, vel = 0;
let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;
  flashAmt *= Math.exp(-dt * 9);
  if (flashAmt < 0.01) flashAmt = 0;
  flashEl.style.opacity = flashAmt * 0.85;
  if (filmOn) filmTick(time);
  else if (finaleOn) S.update(finaleState(finaleQ, time), now);
  const w = mq.scrollWidth / 2;
  mqX -= (40 + vel * 700) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0)`;
  requestAnimationFrame(tick);
}

addEventListener('resize', () => { S.resize(); measureLayout(); });

// Masaüstü: imleç ve mıknatıslı butonlar
if (finePointer && !reducedMotion) {
  const cur = $('[data-cursor]');
  const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => { document.body.classList.add('cursor-live'); qx(e.clientX); qy(e.clientY); });
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

// --- Açılış (≤1,5 sn, dokununca geçer): telefon çalar, açılır, tepe lambası süpürmesiyle sahne açılır -----

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.03, ease: 'power4.out' }, 0)
    .fromTo(['.hero__kicker', '.hero__slogan', '.hero__cta'], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.2);
}

function runIntro() {
  const intro = $('[data-intro]');
  if (vitrinModu()) {
    intro.remove();
    document.body.classList.remove('is-loading');
    return heroIn();
  }
  const knob = $('[data-intro-knob]');
  let done = false;
  const tl = gsap.timeline();
  tl.fromTo('.intro__phone', { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)' }, 0)
    .fromTo(['.intro__time', '.intro__label', '.intro__where', '.intro__slide'], { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, stagger: 0.04 }, 0.05)
    .fromTo('.intro__icon', { rotate: -14 }, { rotate: 14, duration: 0.07, repeat: 5, yoyo: true, ease: 'none' }, 0.15)
    .to(knob, { x: () => knob.parentElement.clientWidth - knob.offsetWidth - 8, duration: 0.35, ease: 'power2.inOut' }, 0.45)
    .to('.intro__slide', { autoAlpha: 0, duration: 0.15 }, 0.8)
    .fromTo('[data-intro-answer]', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.8);
  tl.add(finish, 1.05);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    document.body.classList.remove('is-loading');
    const o = { a: 0 };
    gsap.timeline({ onComplete: () => intro.remove() })
      .set(intro, { pointerEvents: 'none' }, 0)
      .to('[data-intro-call]', { autoAlpha: 0, scale: 0.94, duration: 0.2, ease: 'power2.in' }, 0)
      .to(o, { a: 360, duration: 0.55, ease: 'power2.inOut', onUpdate: () => intro.style.setProperty('--sweep', `${o.a}deg`) }, 0.05)
      .call(heroIn, [], 0.3);
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
  addEventListener('wheel', finish, { once: true, passive: true });
  addEventListener('touchmove', finish, { once: true, passive: true });
}

// --- Hareket azaltma -----------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  $$('[data-card]').forEach((c) => c.classList.add('is-live'));
  $$('.onsite li, .ticks li').forEach((li) => li.classList.add('is-on'));
  const still = () => S.update(finaleState(0.5, 0));
  S.ready.then(still);
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('[data-sstep]').forEach((s) => s.classList.add('is-on'));
} else {
  measureLayout();
  setupScroll();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  runIntro();
  requestAnimationFrame(tick);
  S.ready.then(() => { S.compile(); ScrollTrigger.refresh(); });
}
