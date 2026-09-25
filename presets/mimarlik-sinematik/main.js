import sektor from '../../data/sektor-mimarlik.json';
import ek from '../../data/mimarlik-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import * as THREE from 'three';
import { createScene, PLOT, FLOORS, HMAX } from './scene.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'mimarlik-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const up = (s) => s.toLocaleUpperCase('tr');
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// "2009'dan", "1995'ten"
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
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, bir proje için görüşmek istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-wa-arsa]').href = waHref(d, `Merhaba ${d.isletme.ad}, arsam / yapım için proje düşünüyorum. Yeri: `);
$('[data-brand]').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-kicker]').textContent = `${d.isletme.sektor} · Etimesgut · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
heroTitle.classList.toggle('is-long', d.isletme.ad.length > 18);
$('[data-intro-name]').textContent = d.isletme.ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Ofis açık' : 'Ofis kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film kartları ve pafta listesi
const FILM = d.film;
$('[data-sheets]').innerHTML = FILM.map((f) => `<li data-sheet><b>${esc(f.pafta)}</b><span>${esc(f.paftaAd)}</span></li>`).join('');
$('[data-cards]').innerHTML = FILM.map((f) => `
  <article class="card" data-card="${esc(f.id)}">
    <p class="card__sheet"><span>Pafta ${esc(f.pafta)}</span><span>${esc(f.durak)}</span></p>
    <h2 class="card__title">${esc(f.baslik)}</h2>
    <p class="card__text">${esc(f.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${f.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(f.hizmet)} için sorun</span></a>
  </article>`).join('');
$('[data-ov-kicker]').textContent = d.filmSon.ust;
$('[data-ov-title]').textContent = d.filmSon.baslik;

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b><small>${esc(s.sonek)}</small></p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler: satır + (masaüstünde) yapışkan görsel çerçevesi
$('[data-services]').innerHTML = `
  <li class="svc__frame" aria-hidden="true">${d.hizmetler.map((s, i) => `<img src="${esc(s.gorsel)}" alt="" loading="lazy" data-svc-img="${i}" />`).join('')}<span class="svc__frame-no" data-svc-no>P-01</span></li>
  ${d.hizmetler.map((s, i) => `
  <li class="svc__row" data-svc="${i}">
    <p class="svc__no">P-${String(i + 1).padStart(2, '0')}</p>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time"><span>Süre</span>${esc(s.sure)}</p>
    <figure class="svc__img"><img src="${esc(s.gorsel)}" alt="${esc(s.baslik)}" loading="lazy" /></figure>
  </li>`).join('')}`;

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><p class="step__n">${String(i + 1).padStart(2, '0')}</p><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Galeri
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="gal gal--${i % 3}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>${String(i + 1).padStart(2, '0')} · ${esc(g.alt)}</figcaption></figure>`).join('');

// Yazılımlar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Number(y.puan) || 0)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
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

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__mim = { S, get p() { return filmP; } };

// Kamera pozları: [masaüstü, mobil]
const POSE = {
  plan: [[-8, 46, 6, -8, 0, 0.5, 40], [0, 64, -3, 0, 0, -8.2, 46]],
  arsa: [[5, 32, 21, 2.5, 0, 0, 40], [0, 50, 22, 0, 0, -4, 48]],
  arsa2: [[-1, 29, 23, 3, 0, 0, 40], [3, 48, 24, 0, 0, -4, 48]],
  avan: [[23, 15, 23, 1, 3, 0, 36], [26, 25, 36, 0.5, 4.5, -4, 44]],
  avan2: [[27, 11, 11, 1, 3.6, 0, 36], [31, 20, 24, 0.5, 5, -4, 44]],
  ruhsat: [[8, 6.5, 31, -2.5, 5, 0, 34], [5, 11, 55, 0.5, 7.5, 0, 42]],
  ruhsat2: [[-4, 6, 32, -2.5, 5, 0, 34], [-4, 11, 55, 0.5, 7.5, 0, 42]],
  kesit: [[19, 7, 19, -2.5, 4, -1, 38], [21, 11, 30, 0, 6.5, -1, 46]],
  kesit2: [[11, 6, 22, -2.5, 3.6, -1, 38], [12, 10, 33, 0, 6.5, -1, 46]],
  render: [[-22, 6.5, 20, -1.5, 4, 0, 36], [-28, 10, 40, 0, 6.5, 0, 44]],
  render2: [[22, 5, 20, -1.5, 4, 0, 36], [24, 9, 33, 0, 7, 0, 44]],
  ev1: [[15, 6.5, 21, 0.5, 3.4, -1, 40], [8, 7.5, 23, -0.8, 4.6, -1, 54]],
  ev2: [[-13, 5.5, 20, -2.5, 3.2, -1, 40], [-7, 6.5, 22, -1.5, 4.4, -1, 54]],
  gece: [[17, 5, 24, -1.5, 4.2, 0, 38], [26, 8, 46, 0.5, 6.5, 0, 46]],
  gece2: [[-15, 4.5, 26, -1.5, 4.2, 0, 38], [-22, 7, 46, 0.5, 6.5, 0, 46]],
};
const KF = [
  [0, 'plan'], [0.05, 'plan'], [0.11, 'arsa'], [0.19, 'arsa2'], [0.235, 'avan'], [0.32, 'avan2'],
  [0.36, 'ruhsat'], [0.45, 'ruhsat2'], [0.49, 'kesit'], [0.575, 'kesit2'], [0.615, 'render'], [0.71, 'render2'],
  [0.765, 'ev1'], [0.835, 'ev2'], [0.885, 'gece'], [1, 'gece2'],
];
const CARD_RANGES = [[0.085, 0.2], [0.205, 0.33], [0.335, 0.46], [0.465, 0.59], [0.595, 0.72], [0.735, 0.85]];

const pose = (name) => {
  const a = POSE[name][mobile() ? 1 : 0];
  return { pos: V(a[0], a[1], a[2]), look: V(a[3], a[4], a[5]), fov: a[6] };
};
function filmPose(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = pose(a[1]), B = pose(b[1]);
  return { pos: A.pos.lerp(B.pos, t), look: A.look.lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

function filmState(p, time) {
  const ps = filmPose(p);
  const outside = 1;
  ps.pos.x += Math.sin(time * 0.25) * 0.25 * clamp(outside);
  ps.pos.y += Math.sin(time * 0.35) * 0.12 * clamp(outside);
  const cutIn = smooth(seg(p, 0.475, 0.53)), cutOut = smooth(seg(p, 0.56, 0.595));
  const cutOn = seg(p, 0.465, 0.485) * (1 - seg(p, 0.575, 0.6));
  const inside = smooth(seg(p, 0.725, 0.765)) * (1 - smooth(seg(p, 0.845, 0.875)));
  return {
    ...ps,
    grow: [smooth(seg(p, 0.205, 0.245)), smooth(seg(p, 0.235, 0.275)), smooth(seg(p, 0.265, 0.305))],
    setback: seg(p, 0.095, 0.13) * (1 - seg(p, 0.31, 0.345)),
    hmax: seg(p, 0.345, 0.375) * (1 - seg(p, 0.45, 0.475)),
    cut: cutOn > 0 ? L(8.5, 0.35, cutIn - cutOut) : inside > 0.001 ? L(9, 2.1, inside) : 50,
    cutOn,
    real: smooth(seg(p, 0.585, 0.64)),
    sunA: L(-0.2, 3.0, seg(p, 0.6, 0.74)),
    inside,
    night: smooth(seg(p, 0.83, 0.885)),
  };
}

function finaleState(q, time) {
  const m = mobile();
  const a = -0.5 + q * 0.95 + Math.sin(time * 0.15) * 0.03;
  const r = m ? 44 : 31;
  return {
    pos: V(Math.sin(a) * r, m ? 9 : 6, Math.cos(a) * r), look: V(-1, m ? -3 : 5.5, 0), fov: m ? 46 : 38,
    grow: [1, 1, 1], setback: 0, hmax: 0, cut: 50, cutOn: 0, real: 1, sunA: 3, inside: 0, night: 1,
  };
}

// --- Ölçü etiketleri: 3D noktalara yapışan küçük notlar -------------------------

const sunClock = (p) => {
  const h = L(7.5, 19.5, seg(p, 0.6, 0.74));
  return `Güneş ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 6) * 10).padStart(2, '0')}`;
};
const TAGS = [
  { r: [0.1, 0.2], at: V(0, 0, PLOT.z1), t: 'Parsel cephesi 24,00 m' },
  { r: [0.1, 0.2], at: V(PLOT.x1, 0, 0), t: '18,00 m' },
  { r: [0.12, 0.2], at: V(0, 0, 6.5), t: 'Ön çekme 5,00 m', acc: 1 },
  { r: [0.13, 0.2], at: V(-10.5, 0, -1), t: 'Yan çekme 3,00 m', acc: 1 },
  { r: [0.215, 0.33], at: V(-4.6, 0.8, 0.4), t: 'Salon · güneye bakar' },
  { r: [0.225, 0.33], at: V(3.3, 1.2, -2.7), t: 'Mutfak' },
  { r: [0.26, 0.33], at: V(6.6, 3.4, 3.9), t: 'Konsol 3,00 m', acc: 1 },
  { r: [0.29, 0.33], at: V(-3.5, 9.6, 1), t: 'Çatı terası' },
  { r: [0.345, 0.46], at: V(5.2, 0, 3.1), t: '±0,00' },
  { r: [0.345, 0.46], at: V(8.2, FLOORS[1].y, 3.9), t: '+3,30' },
  { r: [0.345, 0.46], at: V(8.2, FLOORS[2].y, 3.9), t: '+6,60' },
  { r: [0.345, 0.46], at: V(0.2, FLOORS[2].y + FLOORS[2].h, 1.2), t: '+9,60' },
  { r: [0.36, 0.46], at: V(9, HMAX, 4), t: 'Hmaks 10,50', acc: 1 },
  { r: [0.5, 0.585], at: V(-5, 3.3, 0.4), t: 'Döşeme 25 cm' },
  { r: [0.51, 0.585], at: V(-6.1, 1.6, 0.4), t: 'Merdiven 11 basamak' },
  { r: [0.52, 0.585], at: V(2, 5, 0.4), t: 'Kesit A–A', acc: 1 },
  { r: [0.61, 0.72], at: V(3, 10.2, 1), t: sunClock, acc: 1 },
  { r: [0.76, 0.845], at: V(0, 2.1, 0.75), t: 'Sarkıt aydınlatma', desk: 1, left: 1 },
  { r: [0.765, 0.845], at: V(3.4, 1.25, -2.7), t: 'Ada tezgâh, meşe', acc: 1 },
  { r: [0.775, 0.845], at: V(5.6, 4.1, -2.4), t: 'Yatak odası' },
  { r: [0.785, 0.845], at: V(-5, 0.8, 0.8), t: 'Köşe koltuk, 3,00 m' },
  { r: [0.795, 0.845], at: V(-3.5, 4.4, -3.2), t: 'Çalışma nişi' },
];
const tagsBox = $('[data-tags]');
tagsBox.innerHTML = TAGS.map((g) => `<p class="tag${g.acc ? ' tag--acc' : ''}" data-tag><i></i><span></span></p>`).join('');
const tagEls = $$('[data-tag]');
function drawTags(p) {
  TAGS.forEach((g, i) => {
    const el = tagEls[i];
    const [a, b] = g.r;
    const v = seg(p, a, a + 0.012) * (1 - seg(p, b - 0.012, b));
    if (v <= 0.01 || (g.desk && mobile())) {
      if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
      return;
    }
    const s = S.toScreen(g.at);
    if (s.behind) { el.style.visibility = 'hidden'; return; }
    const txt = typeof g.t === 'function' ? g.t(p) : g.t;
    if (el._t !== txt) { el.lastChild.textContent = txt; el._t = txt; }
    el.style.visibility = 'visible';
    el.style.opacity = v;
    if (el._t !== txt || !el._w) el._w = el.lastChild.offsetWidth || txt.length * 7.2 + 16;
    // Nokta ekran dışındaysa etiketi kenara yasla, noktayı gizle
    const edge = s.x < 10 || s.x > innerWidth - 10;
    const x = clamp(s.x, 10, innerWidth - 10);
    const flip = g.left ? x - el._w - 12 > 8 : x + el._w + 12 > innerWidth - 8;
    if (el._f !== flip) { el.classList.toggle('is-flip', flip); el._f = flip; }
    if (el._e !== edge) { el.classList.toggle('is-edge', edge); el._e = edge; }
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
  });
}

// --- Film arayüzü -----------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const sheets = $$('[data-sheet]');
const sheetsBox = $('[data-sheets]');
const antet = $('[data-antet]');
const aNo = $('[data-a-no]'), aScale = $('[data-a-scale]'), aName = $('[data-a-name]');
const compass = $('[data-compass]');
const overview = $('[data-overview]');
const hint = $('[data-hint]');
let lastSheet = -2;

function show(el, v) {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
}

function filmUI(p) {
  const heroOut = seg(p, 0.04, 0.08);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.018), vout = seg(p, b - 0.018, b);
    const v = vin * (1 - vout);
    show(card, v);
    card.style.transform = `translate3d(0, ${(1 - vin) * 34 - vout * 24}px, 0)`;
    card.style.setProperty('--draw', seg(p, a, a + 0.04));
    if (p >= a && p < b) active = i;
  });
  show(sheetsBox, seg(p, 0.07, 0.09) * (1 - seg(p, 0.86, 0.88)));
  show(antet, seg(p, 0.06, 0.09) * (1 - seg(p, 0.965, 0.99)));
  if (active !== lastSheet) {
    sheets.forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.classList.toggle('is-done', active > i || (active === -1 && p > 0.85));
    });
    const f = active >= 0 ? FILM[active] : p > 0.85 ? { pafta: '07', olcek: 'Akşam', paftaAd: 'Akşam görünüşü' } : { pafta: '00', olcek: '1/500', paftaAd: 'Vaziyet planı' };
    aNo.textContent = f.pafta;
    aScale.textContent = f.olcek;
    aName.textContent = f.paftaAd;
    antet.classList.remove('is-flash');
    void antet.offsetWidth;
    antet.classList.add('is-flash');
    lastSheet = active;
  }
  compass.style.transform = `rotate(${(S.azimuth() * 180) / Math.PI}deg)`;

  const ov = seg(p, 0.885, 0.915) * (1 - seg(p, 0.975, 0.995));
  show(overview, ov);
  overview.style.transform = `translate3d(0, ${(1 - ov) * 26}px, 0)`;
  document.documentElement.classList.toggle('is-real', p > 0.6 && p < 0.84);
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
let filmActive = true, finaleActive = false, canvasFinale = 0, filmFade = 1;
let filmST = null, finaleST = null;
let vel = 0;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  filmST = ScrollTrigger.create({ trigger: film, start: 'top top', end: 'bottom bottom', onUpdate: (s) => (filmTarget = s.progress) });
  ScrollTrigger.create({ trigger: film, start: 'bottom bottom', end: 'bottom 30%', onUpdate: (s) => (filmFade = 1 - s.progress) });
  finaleST = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom', onUpdate: (s) => (finaleQ = s.progress) });
  ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'top 25%', onUpdate: (s) => (canvasFinale = s.progress) });
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'bottom bottom', end: 'max',
    onToggle: (s) => $('[data-top]').classList.toggle('is-ink', s.isActive),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 64px', endTrigger: '[data-finale]', end: 'top 64px',
    onToggle: (s) => $('[data-top]').classList.toggle('is-light', s.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar: kelimeler çizgiden yükselir, fosforlu kalem altını boyar
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'lines', linesClass: 'rl', mask: 'lines' });
    gsap.fromTo(s.lines, { yPercent: 105 }, {
      yPercent: 0, duration: 1, stagger: 0.08, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
    const mk = $('mark', el);
    if (mk) gsap.fromTo(mk, { '--hl': 0 }, { '--hl': 1, duration: 0.9, ease: 'power2.inOut', delay: 0.5, scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.18 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.about__img', { clipPath: 'inset(0 0 100% 0)' }, {
    clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power3.inOut',
    scrollTrigger: { trigger: '.about__img', start: 'top 85%', once: true },
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.8, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // Hizmetler: satır ortaya geldiğinde çerçevedeki görsel değişir
  const frameImgs = $$('[data-svc-img]');
  const frameNo = $('[data-svc-no]');
  const setSvc = (i) => {
    frameImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
    frameNo.textContent = `P-${String(i + 1).padStart(2, '0')}`;
  };
  setSvc(0);
  $$('.svc__row').forEach((row, i) => {
    ScrollTrigger.create({ trigger: row, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { row.classList.toggle('is-on', s.isActive); if (s.isActive) setSvc(i); } });
    gsap.fromTo($('.svc__img', row), { clipPath: 'inset(0 100% 0 0)' }, {
      clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power3.inOut',
      scrollTrigger: { trigger: $('.svc__img', row), start: 'top 88%', once: true },
    });
  });
  // Süreç: ölçü çizgisi dolar
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 66%', onEnter: () => s.classList.add('is-lit'), onLeaveBack: () => s.classList.remove('is-lit') }));
  // Galeri kaydırmayla yana akar
  const gt = $('[data-gallery]');
  gsap.fromTo(gt, { x: () => (mobile() ? 0 : innerWidth * 0.1) }, {
    x: () => -Math.max(0, gt.scrollWidth - innerWidth) + (mobile() ? 0 : innerWidth * 0.05),
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  // Güvence: damga basılır
  gsap.fromTo('.promise__stamp', { scale: 2.2, opacity: 0, rotate: -24 }, {
    scale: 1, opacity: 1, rotate: -9, duration: 0.5, ease: 'back.out(2)',
    scrollTrigger: { trigger: '.promise', start: 'top 75%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  gsap.fromTo('.rev', { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__rail', start: 'top 85%', once: true },
  });
  const fsplit = new SplitText('[data-final-title]', { type: 'lines', linesClass: 'rl', mask: 'lines' });
  gsap.fromTo(fsplit.lines, { yPercent: 105 }, {
    yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'power4.out',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 40%', once: true },
  });
}

// Yazılım şeridi: kaydırma hızına göre hızlanır
const mq = $('.marquee__inner');
let mqX = 0;
let mqVisible = false;
new IntersectionObserver((e) => (mqVisible = e[0].isIntersecting)).observe($('.soft'));

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;

  if (filmST) {
    filmActive = filmST.progress < 1 || filmFade > 0.001;
    finaleActive = finaleST.progress > 0;
  }
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 6));
  const inFilm = filmST ? filmST.progress < 1 : true;
  if (inFilm || filmP < 0.999) filmUI(filmP);

  if (finaleActive && canvasFinale > 0.001) {
    canvas.style.opacity = canvasFinale;
    canvas.style.visibility = 'visible';
    S.update(finaleState(finaleQ, time), now);
    tagsBox.style.visibility = 'hidden';
  } else if (filmActive && filmFade > 0.001) {
    canvas.style.opacity = filmFade;
    canvas.style.visibility = 'visible';
    S.update(filmState(filmP, time), now);
    tagsBox.style.visibility = 'visible';
    drawTags(filmP);
  } else if (canvas.style.visibility !== 'hidden') {
    canvas.style.visibility = 'hidden';
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

// --- Açılış: kat planı çizilir, ölçek büyür, pafta sahneye açılır --------------

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.03, ease: 'power4.out' }, 0)
    .fromTo('.hero__title', { '--dim': 0 }, { '--dim': 1, duration: 1.1, ease: 'power3.inOut' }, 0.3)
    .fromTo(['.hero__kicker', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.45);
}

function runIntro() {
  const intro = $('[data-intro]');
  const paths = $$('.ip', intro);
  const scaleEl = $('[data-intro-scale]');
  const dimEl = $('[data-intro-dim]');
  let done = false;
  const tl = gsap.timeline();
  gsap.set(paths, { drawSVG: '0%' });
  tl.to(paths, { drawSVG: '100%', duration: 0.7, stagger: 0.09, ease: 'power2.inOut' }, 0.1);
  tl.fromTo('[data-intro-name]', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.3);
  const o = { v: 1000 };
  tl.to(o, { v: 200, duration: 1.4, ease: 'power2.inOut', onUpdate: () => {
    scaleEl.textContent = `1/${Math.round(o.v / 50) * 50}`;
    dimEl.textContent = nf(12 * (o.v / 1000) * 5, 2);
  } }, 0.2);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000), performance.now());
  }, [], 0.3);
  tl.add(finish, 1.9);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    gsap.set(paths, { drawSVG: '100%' });
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .to('.intro__sheet', { scale: 1.6, opacity: 0, duration: 0.9, ease: 'power3.in' }, 0)
      .to(intro, { opacity: 0, duration: 0.5, ease: 'power1.out' }, 0.55)
      .call(heroIn, [], 0.6);
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
  const still = () => S.update(filmState(0.7, 0), performance.now());
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  $$('mark').forEach((m) => m.style.setProperty('--hl', 1));
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
