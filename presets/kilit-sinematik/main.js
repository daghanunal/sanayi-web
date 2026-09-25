import taban from '../../data/sektor-kilit.json';
import ek from '../../data/kilit-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import * as THREE from 'three';
import { createScene, PINS, CUTS, TIP_IN, TIP_OUT, topAt } from './scene.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...taban, ...ek });
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

// "1999'dan", "2004'ten"
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
$('[data-wa-final]').href = waHref(d, `Merhaba ${d.isletme.ad}, anahtar işim var. Araç (marka, model, yıl): `);
$('[data-brand]').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-since-2]').textContent = `${ablative(d.isletme.kurulus)} beri aynı tezgâhta`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
$('[data-intro-name]').textContent = d.isletme.ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film kartları
const FILM = d.film;
$('[data-rail]').innerHTML = FILM.map((f, i) => `<li data-rail-i><b>0${i + 1}</b><span>${esc(f.etiket.split('·')[1]?.trim() ?? '')}</span></li>`).join('');
$('[data-cards]').innerHTML = FILM.map((f) => `
  <article class="card" data-card="${esc(f.id)}">
    <p class="card__tag">${esc(f.etiket)}</p>
    <h2 class="card__title">${esc(f.baslik)}</h2>
    <p class="card__text">${esc(f.metin)}</p>
    <p class="card__foot"><span class="card__time">${esc(f.sure)}</span><a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${f.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Sorun</span></a></p>
  </article>`).join('');

// Kesim kodu: diş derinliği 1-9
const CODE = CUTS.map((c) => Math.round((0.32 - c) / 0.04));
$('[data-code-digits]').innerHTML = CODE.map(() => '<span>·</span>').join('');
$('[data-pinmeter]').innerHTML = PINS.map(() => '<i><b></b></i>').join('') + '<s></s>';

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.replace(/\b(19|20)\d\d'(dan|den|tan|ten)\b/, ablative(d.isletme.kurulus)).split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__item">
    <p class="svc__n">${String(i + 1).padStart(2, '0')}</p>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

// Anahtar tipleri
const ART = {
  duz: `<svg viewBox="0 0 400 200"><g class="a-key"><circle class="a-line" cx="80" cy="100" r="46"/><circle class="a-line" cx="80" cy="100" r="16"/><path class="a-line" d="M126 88 H352 l14 12 -14 12 H336 l-8 14 -8 -14 -10 0 -8 18 -8 -18 -12 0 -8 10 -8 -10 -14 0 -8 16 -8 -16 H126"/></g></svg>`,
  cipli: `<svg viewBox="0 0 400 200"><g class="a-key"><rect class="a-line a-fill" x="24" y="50" width="120" height="100" rx="30"/><rect class="a-chip" x="60" y="90" width="44" height="20" rx="10"/><path class="a-wave" d="M50 60 a60 60 0 0 1 64 0"/><path class="a-line" d="M144 88 H352 l14 12 -14 12 H336 l-8 14 -8 -14 -10 0 -8 18 -8 -18 -12 0 -8 10 -8 -10 -14 0 -8 16 -8 -16 H144"/></g></svg>`,
  sustali: `<svg viewBox="0 0 400 200"><g class="a-key"><rect class="a-line a-fill" x="30" y="46" width="150" height="108" rx="34"/><circle class="a-btn" cx="74" cy="100" r="13"/><circle class="a-btn" cx="112" cy="100" r="13"/><circle class="a-btn" cx="150" cy="100" r="9"/><g class="a-flip"><path class="a-line" d="M180 90 H352 l14 10 -14 10 H336 l-8 12 -8 -12 -10 0 -8 16 -8 -16 -12 0 -8 9 -8 -9 -14 0 -8 14 -8 -14 H180"/></g></g></svg>`,
  akilli: `<svg viewBox="0 0 400 200"><g class="a-key"><rect class="a-line a-fill" x="120" y="30" width="110" height="150" rx="40"/><circle class="a-btn" cx="175" cy="80" r="14"/><circle class="a-btn" cx="175" cy="120" r="14"/><path class="a-wave" d="M250 70 a40 40 0 0 1 0 60"/><path class="a-wave a-wave--2" d="M272 50 a66 66 0 0 1 0 100"/><path class="a-wave a-wave--3" d="M294 32 a92 92 0 0 1 0 136"/></g></svg>`,
};
const tipler = d.anahtarTipleri;
$('[data-type-tabs]').innerHTML = tipler.map((t, i) => `
  <button class="types__tab" role="tab" data-type-tab="${i}" aria-selected="${i === 0}"><b>${esc(t.ad)}</b><span>${esc(t.yillar)}</span></button>`).join('');
function showType(i, animate = true) {
  const t = tipler[i];
  $$('[data-type-tab]').forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
  const art = $('[data-type-art]');
  art.innerHTML = ART[t.id] || ART.duz;
  art.dataset.type = t.id;
  $('[data-type-info]').innerHTML = `
    <h3>${esc(t.ad)}</h3>
    <p class="types__how">${esc(t.nasil)}</p>
    <ul>${t.yapilan.map((y) => `<li>${esc(y)}</li>`).join('')}</ul>
    <p class="types__foot"><span>Ortalama süre</span><b>${esc(t.sure)}</b></p>
    <a class="btn btn--brass" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${t.ad.toLocaleLowerCase('tr')} anahtarım için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu anahtar için sorun</span></a>`;
  if (!animate || reducedMotion) return;
  const lines = $$('.a-line', art), fills = $$('.a-fill, .a-chip, .a-btn', art);
  if (lines.length) gsap.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut', stagger: 0.1 });
  if (fills.length) gsap.fromTo(fills, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.5, stagger: 0.06 });
  gsap.fromTo('[data-type-info] > *', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
}
$$('[data-type-tab]').forEach((b) => b.addEventListener('click', () => showType(Number(b.dataset.typeTab))));
showType(0, false);

// Güven + süreç
$('[data-guven-title]').textContent = d.guven.baslik;
$('[data-guven-text]').textContent = d.guven.metin;
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');

// Galeri
const GAL = ['atolye', 'kilit-silindiri', 'kodlama', 'anahtar-duvari', 'akilli-anahtar', 'kapi-acma', 'silindir-parcalari', 'start-stop'];
const galeri = GAL.map((id) => {
  const g = d.galeri.find((x) => x.src.endsWith(`/${id}.jpg`));
  return { src: `${import.meta.env.BASE_URL}img/kilit-sinematik/${id}.jpg`, alt: g?.alt ?? '' };
});
$('[data-gallery]').innerHTML = galeri.map((g) => `<figure class="gallery__item"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></figure>`).join('');

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
$('[data-brands]').innerHTML = `<span>Çalıştığımız markalardan bazıları</span>${d.markalar.map((m) => `<b>${esc(m)}</b>`).join('')}`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-padlock]').classList.toggle('is-open', status.open);
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
const S = createScene(canvas, { lite, aa: !weak });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const POSES = () => {
  const m = mobile();
  return m ? {
    hero: { pos: V(12.5, 5.4, 12.5), look: V(2.0, 0.2, 0), fov: 44, shift: -0.1 },
    cut: { pos: V(TIP_OUT + 3.6, 2.2, 6.2), look: V(TIP_OUT + 1.5, 0.1, 0), fov: 48, shift: 0.08 },
    lock: { pos: V(2.8, 1.9, 10.4), look: V(0.2, 0.6, 0), fov: 50, shift: 0.05 },
    turn: { pos: V(5.2, 3.6, 9.2), look: V(0.5, 0.4, 0), fov: 50, shift: 0.05 },
    chip: { pos: V(4.9, 5.6, 3.4), look: V(2.0, 0.0, 0), fov: 50, shift: 0.1 },
    fob: { pos: V(-4.2, 1.6, 8.6), look: V(-5.6, 0.4, 0.2), fov: 50, shift: 0.1 },
    over: { pos: V(-13.5, 6.5, 13), look: V(-2.2, 0.2, 0), fov: 46, shift: 0.1 },
  } : {
    hero: { pos: V(2.8, 3.6, 11.4), look: V(-3.0, 0.3, 0), fov: 38 },
    cut: { pos: V(TIP_OUT + 0.6, 1.9, 6.4), look: V(TIP_OUT + 0.4, 0.1, 0), fov: 40 },
    lock: { pos: V(-1.3, 1.5, 6.4), look: V(-1.6, 0.6, 0), fov: 44 },
    turn: { pos: V(0.9, 2.6, 6.0), look: V(-1.1, 0.4, 0), fov: 44 },
    chip: { pos: V(2.2, 4.8, 4.3), look: V(1.0, 0.0, 0), fov: 38 },
    fob: { pos: V(-4.9, 1.2, 6.2), look: V(-6.2, 0.4, 0.2), fov: 42 },
    over: { pos: V(0.2, 3.8, 10.5), look: V(-1.6, 0.2, 0), fov: 40 },
  };
};
const KF = [
  [0, 'hero'], [0.07, 'hero'], [0.13, 'cut'], [0.29, 'cut'], [0.34, 'lock'], [0.47, 'lock'], [0.53, 'turn'],
  [0.555, 'turn'], [0.6, 'chip'], [0.715, 'chip'], [0.76, 'fob'], [0.875, 'fob'], [0.93, 'over'], [1, 'over'],
];
const CARD_RANGES = [[0.12, 0.3], [0.335, 0.56], [0.575, 0.725], [0.745, 0.885]];

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = P[a[1]], B = P[b[1]];
  return {
    pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t),
    fov: L(A.fov, B.fov, t), shift: L(A.shift || 0, B.shift || 0, t),
  };
}

function filmState(p, time) {
  const pose = filmPose(p);
  const idle = 1 - seg(p, 0.06, 0.12) + seg(p, 0.9, 0.95);
  pose.pos.x += Math.sin(time * 0.35) * 0.25 * idle;
  pose.pos.y += Math.sin(time * 0.5) * 0.12 * idle;
  const cut = smooth(seg(p, 0.14, 0.28));
  const slide = smooth(seg(p, 0.335, 0.445));
  return {
    ...pose,
    cut,
    cutting: p > 0.135 && p < 0.285,
    bench: seg(p, 0.08, 0.12) * (1 - seg(p, 0.3, 0.33)),
    tipX: L(TIP_OUT, TIP_IN, slide),
    shear: seg(p, 0.44, 0.46) * (1 - seg(p, 0.56, 0.6)) * (1 + Math.sin(time * 6) * 0.15),
    turn: -Math.PI / 2 * smooth(seg(p, 0.475, 0.53)),
    xray: smooth(seg(p, 0.585, 0.62)) * (1 - seg(p, 0.9, 0.95) * 0.6),
    rf: seg(p, 0.61, 0.64) * (1 - seg(p, 0.72, 0.745)),
    fob: smooth(seg(p, 0.7, 0.75)),
    flip: smooth(seg(p, 0.765, 0.8)),
    explode: smooth(seg(p, 0.8, 0.85)) * (1 - 0.5 * seg(p, 0.9, 0.95)),
    press: seg(p, 0.845, 0.86) * (1 - seg(p, 0.88, 0.9)),
    env: 0.85,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const overview = $('[data-overview]');
const hint = $('[data-hint]');
const hudCode = $('[data-hud-code]'), hudPins = $('[data-hud-pins]'), hudChip = $('[data-hud-chip]');
const codeDigits = $$('[data-code-digits] span');
const codeSub = $('[data-code-sub]');
const pinBars = $$('[data-pinmeter] i b');
const pinState = $('[data-pin-state]');
const hexEl = $('[data-hex]'), chipState = $('[data-chip-state]');
const HEX = ['7A', '3F', '91', 'C2'];

function vis(el, v, dy = 0) {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
  if (dy) el.style.transform = `translate3d(0, ${(1 - v) * dy}px, 0)`;
}

let last = {};
function setText(el, key, txt) {
  if (last[key] !== txt) { el.textContent = txt; last[key] = txt; }
}

function filmUI(p, time) {
  const heroOut = seg(p, 0.05, 0.1);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${-heroOut * 40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.02), vout = seg(p, b - 0.02, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(0, ${(1 - vin) * 36 - vout * 24}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.1, 0.12) * (1 - seg(p, 0.885, 0.9));
  vis(rail, railOn);
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p > CARD_RANGES[i][1]);
  });

  // Kesim kodu
  const cv = seg(p, 0.13, 0.15) * (1 - seg(p, 0.29, 0.31));
  vis(hudCode, cv, 16);
  if (cv > 0.01) {
    const c = smooth(seg(p, 0.14, 0.28));
    codeDigits.forEach((sp, i) => {
      const u = PINS[i] - TIP_IN;
      const done = c * 3.25 > u + 0.06;
      const txt = done ? String(CODE[i]) : String(Math.floor(time * 20 + i * 3) % 10);
      if (sp.textContent !== txt) sp.textContent = txt;
      sp.classList.toggle('is-set', done);
    });
    setText(codeSub, 'cs', c >= 0.999 ? 'Kesim tamam' : 'Freze ilerliyor');
  }

  // Pim ölçer
  const pv = seg(p, 0.34, 0.36) * (1 - seg(p, 0.545, 0.565));
  vis(hudPins, pv, 16);
  if (pv > 0.01) {
    const slide = smooth(seg(p, 0.335, 0.445));
    const tipX = L(TIP_OUT, TIP_IN, slide);
    let ok = true;
    PINS.forEach((x, i) => {
      const u = x - tipX;
      const b = tipX < 1.9 && u >= 0 && u <= 3.15 ? Math.max(-0.06, topAt(u, 1)) : -0.06;
      const off = b + (0.5 - CUTS[i]) - 0.5; // kesme hattına uzaklık
      if (Math.abs(off) > 0.012) ok = false;
      pinBars[i].style.transform = `translate3d(0, ${clamp(-off / 0.6, -1, 1) * 100}%, 0)`;
      pinBars[i].parentElement.classList.toggle('is-ok', Math.abs(off) <= 0.012);
    });
    const turned = p > 0.5;
    setText(pinState, 'ps', turned ? 'Açık · kontak döndü' : ok ? 'Hizalandı' : 'Kilitli');
    hudPins.classList.toggle('is-ok', ok);
  }

  // Çip
  const chv = seg(p, 0.6, 0.62) * (1 - seg(p, 0.715, 0.735));
  vis(hudChip, chv, 16);
  if (chv > 0.01) {
    const r = seg(p, 0.62, 0.68);
    const n = Math.floor(r * 4.99);
    const hex = HEX.map((h, i) => (i < n ? h : ((Math.floor(time * 18) * (i + 3)) % 256).toString(16).toUpperCase().padStart(2, '0'))).join(' ');
    setText(hexEl, 'hx', hex);
    setText(chipState, 'cs2', r >= 1 ? 'Tanındı · motor çalışır' : 'Okunuyor');
    hudChip.classList.toggle('is-ok', r >= 1);
  }

  const ov = seg(p, 0.905, 0.935) * (1 - seg(p, 0.99, 1));
  vis(overview, ov, 30);
}

// --- Kaydırma ve içerik hareketi ---------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
let lenis = null;
let filmP = 0, filmTarget = 0, filmST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  filmST = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: film, start: 'bottom bottom', end: 'bottom 30%',
    onUpdate: (self) => (canvas.style.opacity = String(1 - self.progress)),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 70px',
    onEnter: () => $('[data-top]').classList.add('is-solid'),
    onLeaveBack: () => $('[data-top]').classList.remove('is-solid'),
  });
  contentMotion();
}

function contentMotion() {
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'lines,words', linesClass: 'ln', wordsClass: 'rw' });
    gsap.fromTo(s.words, { yPercent: 110, rotate: 4 }, {
      yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.04, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  gsap.fromTo($$('span', aboutText), { opacity: 0.15 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.25 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.about__img', { clipPath: 'inset(12% 12% 12% 12% round 200px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top 95%', end: 'top 35%', scrub: true },
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
  // Hizmetler: satır geçerken dişli kenar çizilir
  $$('.svc__item').forEach((row) => {
    gsap.fromTo(row, { '--cut': 0 }, {
      '--cut': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 88%', end: 'top 55%', scrub: true },
    });
  });
  ScrollTrigger.create({ trigger: '[data-types]', start: 'top 65%', once: true, onEnter: () => showType(0) });
  // Mühür dönerek basılır
  gsap.timeline({ scrollTrigger: { trigger: '[data-trust]', start: 'top 70%', once: true } })
    .fromTo('.trust__stamp', { scale: 2.2, rotate: -40, opacity: 0 }, { scale: 1, rotate: -12, opacity: 1, duration: 0.55, ease: 'power4.in' })
    .fromTo('.trust__stamp', { y: 0 }, { y: 4, duration: 0.06, yoyo: true, repeat: 1 })
    .fromTo('.trust__check', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.out' });
  gsap.to('.trust__stamp text', { rotate: 360, transformOrigin: '100px 100px', duration: 30, repeat: -1, ease: 'none' });
  gsap.fromTo('.steps', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 70%', onEnter: () => s.classList.add('is-lit') }));
  // Galeri yatay kayar
  const track = $('[data-gallery]');
  gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - innerWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  gsap.fromTo('.rev', { y: 50, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-reviews]', start: 'top 82%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  // Asma kilit: açıksa kanca kalkar
  ScrollTrigger.create({ trigger: '[data-padlock]', start: 'top 85%', once: true, onEnter: () => $('[data-padlock]').classList.add('is-in') });
  // Final: anahtar deliği büyür
  gsap.fromTo('[data-final-hole]', { '--s': 0.16 }, {
    '--s': 1, ease: 'none',
    scrollTrigger: { trigger: '[data-finale]', start: 'top top', end: 'bottom bottom', scrub: true },
  });
  gsap.fromTo('.finale__copy', { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: '[data-finale]', start: '15% bottom', end: '48% bottom', scrub: true },
  });
}

let lastT = performance.now();
let sceneOn = true;
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  const active = !filmST || filmST.progress < 1 || canvas.style.opacity !== '0';
  if (active) {
    filmUI(filmP, time);
    S.update(filmState(filmP, time), now);
  }
  if (active !== sceneOn) {
    sceneOn = active;
    canvas.style.visibility = active ? 'visible' : 'hidden';
  }
  requestAnimationFrame(tick);
}
addEventListener('resize', () => S.resize());

// --- Açılış: kod okunur, anahtar deliği büyür ---------------------------------------

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 115, rotate: 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.1, stagger: 0.025, ease: 'expo.out' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.top'], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out' }, 0.3);
}

function runIntro() {
  const intro = $('[data-intro]');
  const codeEl = $('[data-intro-code]');
  let done = false;
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.fromTo('[data-kh-line]', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1, ease: 'power2.inOut' }, 0);
  tl.fromTo('[data-intro-name]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.1);
  tl.to(o, {
    v: 1, duration: 1.2, ease: 'none',
    onUpdate: () => {
      const n = Math.floor(o.v * 5.99);
      codeEl.textContent = CODE.map((c, i) => (i < n ? c : Math.floor(Math.random() * 10))).join(' ');
    },
  }, 0.2);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000));
  }, [], 0.3);
  tl.add(finish, 1.55);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    codeEl.textContent = CODE.join(' ');
    document.body.classList.remove('is-loading');
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .to('[data-intro-center]', { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' }, 0)
      .to('[data-kh], [data-kh-rim]', { attr: { transform: 'translate(50 50) scale(22)' }, duration: 1.1, ease: 'expo.in' }, 0.1)
      .to('[data-kh-rim]', { opacity: 0, duration: 0.3 }, 0.8)
      .call(heroIn, [], 0.95);
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

if (import.meta.env.DEV) window.__film = (p) => { filmTarget = p; filmP = p; };

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.compile();
  const still = () => S.update(filmState(0.46, 0));
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('[data-padlock]').classList.add('is-in');
  $('[data-final-hole]').style.setProperty('--s', 1);
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
