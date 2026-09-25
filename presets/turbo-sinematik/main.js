import sektor from '../../data/sektor-turbo.json';
import ek from '../../data/turbo-sinematik.json';
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

const d = boot({ ...sektor, ...ek, preset: 'turbo-sinematik' });
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

// "1998'den", "2004'ten", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik -------------------------------------------------------------------

const binds = { ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, turbom için bilgi almak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-brand]').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
const since = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-since]').textContent = since;
$('[data-about-kicker]').textContent = `${yil} yıldır aynı iş`;
$('[data-final-kicker]').textContent = d.isletme.ad;
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

// Film bölümleri
const film = d.film;
$('[data-cards]').innerHTML = film.map((f, i) => `
  <article class="card" data-card>
    <p class="card__n"><b>${String(i + 1).padStart(2, '0')}</b><span>/ ${String(film.length).padStart(2, '0')}</span><em>${esc(f.etiket)}</em></p>
    <h2 class="card__title">${esc(f.baslik)}</h2>
    <p class="card__text">${esc(f.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${f.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(f.hizmet)} için sorun</span></a>
  </article>`).join('');
$('[data-ticks]').innerHTML = film.map((f) => `<li><span>${esc(f.etiket)}</span></li>`).join('');
$('[data-labels]').innerHTML = d.parcalar.map((p) => `
  <p class="label" data-label="${esc(p.id)}"><b>${esc(p.ad)}</b><span>${esc(p.not)}</span></p>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
const hakkinda = d.isletme.hakkinda.replace(/\b(1[89]|20)\d\d'(dan|den|ten|tan) beri/g, `${ablative(d.isletme.kurulus)} beri`);
aboutText.innerHTML = hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger) || 0}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__row">
    <span class="svc__i">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
    <i class="svc__heat" aria-hidden="true"></i>
  </li>`).join('');

// Belirti seçici
const blades7 = (r1, r2, n = 7) => Array.from({ length: n }, (_, k) => {
  const a = (k / n) * Math.PI * 2;
  const p = (rr, da) => `${(Math.cos(a + da) * rr).toFixed(1)} ${(Math.sin(a + da) * rr).toFixed(1)}`;
  return `<path d="M${p(r1, 0)} Q${p((r1 + r2) / 2, 0.5)} ${p(r2, 1.05)}" />`;
}).join('');
$('[data-diag-blades]').innerHTML = `<g transform="translate(60 60)">${blades7(10, 40)}</g>`;
const diagList = $('[data-diag-list]');
diagList.innerHTML = d.belirtiler.map((b, i) => `
  <button class="diag__btn" role="tab" type="button" data-diag="${i}" aria-selected="false"><span>${String(i + 1).padStart(2, '0')}</span>${esc(b.ad)}</button>`).join('');
const diagArc = $('[data-diag-arc]');
let diagSpin = null;
function showDiag(i, animate = true) {
  const b = d.belirtiler[i];
  $$('[data-diag]').forEach((el) => el.setAttribute('aria-selected', String(Number(el.dataset.diag) === i)));
  $('[data-diag-tag]').textContent = `Belirti ${String(i + 1).padStart(2, '0')}`;
  $('[data-diag-title]').textContent = b.ad;
  $('[data-diag-cause]').textContent = b.sebep;
  $('[data-diag-check]').textContent = b.bakariz;
  $('[data-diag-wa]').href = waHref(d, `Merhaba ${d.isletme.ad}, ${b.mesaj}. Ne zaman getirebilirim?`);
  if (!animate || reducedMotion) return;
  gsap.fromTo(['[data-diag-title]', '[data-diag-cause]', '.diag__check'], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', overwrite: true });
  gsap.fromTo(diagArc, { strokeDashoffset: 314 }, { strokeDashoffset: 314 * (1 - (0.35 + i * 0.13)), duration: 0.9, ease: 'power3.out', overwrite: true });
  diagSpin?.kill();
  diagSpin = gsap.fromTo('[data-diag-blades] g', { rotation: 0, svgOrigin: '0 0' }, { rotation: 720, duration: 1.2, ease: 'power3.out' });
}
diagList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-diag]');
  if (btn) showDiag(Number(btn.dataset.diag));
});
showDiag(0, false);
diagArc.style.strokeDashoffset = 314 * 0.65;

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');

// Galeri
const gal = d.galeri.filter((g) => !/usta-turbo|sokulmus-turbo/.test(g.src)).slice(0, 8);
$('[data-gal-track]').innerHTML = gal.map((g, i) => `
  <figure class="gal gal--${i % 3}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

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

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${g}</dt><dd>${h}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne ------------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__tb = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera planları. Masaüstünde turbo sağda (metin solda), telefonda üstte (kart altta).
const POSES = () => mobile()
  ? {
      hero: { pos: V(8.4, 4.4, 10.2), look: V(0.2, -1.75, 0), fov: 44 },
      sokum: { pos: V(4.2, 9.4, 15.2), look: V(-0.3, -2.9, 0), fov: 48 },
      balans: { pos: V(6.0, 2.8, 7.6), look: V(0, -1.5, 0), fov: 44 },
      vnt: { pos: V(-7.4, 2.2, 3.4), look: V(-2.1, -1.1, 0), fov: 46 },
      yag: { pos: V(3.4, 5.6, 7.6), look: V(0.2, -0.4, -0.3), fov: 46 },
      basinc: { pos: V(9.2, 3.6, 9.4), look: V(0.1, -1.7, 0), fov: 44 },
      end: { pos: V(3.2, 3.2, 13.5), look: V(0, -2.0, 0), fov: 44 },
    }
  : {
      hero: { pos: V(3.6, 2.1, 7.6), look: V(-1.35, 0.1, 0), fov: 34 },
      sokum: { pos: V(0.8, 3.8, 12.6), look: V(-2.2, -0.3, 0), fov: 38 },
      balans: { pos: V(2.6, 1.5, 5.8), look: V(-1.7, -0.05, 0), fov: 38 },
      vnt: { pos: V(-6.4, 1.5, 2.6), look: V(-1.7, -0.1, -1.5), fov: 38 },
      yag: { pos: V(3.0, 4.6, 6.2), look: V(-1.2, 0.8, -0.3), fov: 38 },
      basinc: { pos: V(4.8, 1.7, 6.8), look: V(-1.2, 0, 0), fov: 36 },
      end: { pos: V(1.4, 1.9, 9.8), look: V(-1.6, 0, 0), fov: 36 },
    };
const KF = [
  [0.0, 'hero'], [0.08, 'hero'], [0.17, 'sokum'], [0.28, 'sokum'],
  [0.34, 'balans'], [0.44, 'balans'], [0.5, 'vnt'], [0.61, 'vnt'],
  [0.67, 'yag'], [0.77, 'yag'], [0.84, 'basinc'], [0.95, 'basinc'], [1.0, 'end'],
];
function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = P[a[1]], B = P[b[1]];
  return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

const CARD_RANGES = [[0.12, 0.285], [0.295, 0.455], [0.465, 0.62], [0.63, 0.78], [0.79, 0.965]];

function filmState(p, time, vel) {
  const pose = filmPose(p);
  const hold = 1 - seg(p, 0.08, 0.14) + seg(p, 0.95, 1);
  pose.pos.x += Math.sin(time * 0.4) * 0.18 * clamp(hold);
  pose.pos.y += Math.sin(time * 0.55) * 0.1 * clamp(hold);
  const explode = seg(p, 0.1, 0.18) * (1 - 0.75 * seg(p, 0.62, 0.7)) * (1 - seg(p, 0.78, 0.84));
  const far = seg(p, 0.285, 0.33) * (1 - seg(p, 0.6, 0.68));
  const balance = seg(p, 0.3, 0.34) * (1 - seg(p, 0.44, 0.47));
  const boost = seg(p, 0.8, 0.92);
  const spin = p < 0.1 ? 5.5
    : p < 0.29 ? L(5.5, 1.4, seg(p, 0.1, 0.16))
    : p < 0.46 ? L(1.4, 14, seg(p, 0.3, 0.36)) * (1 - seg(p, 0.44, 0.47)) + 1.2 * seg(p, 0.44, 0.47)
    : p < 0.78 ? 1.2
    : L(1.2, 24, boost);
  return {
    ...pose,
    explode, far, balance,
    wobble: 1 - seg(p, 0.36, 0.43) * 0.95,
    vntShow: seg(p, 0.44, 0.49) * (1 - seg(p, 0.62, 0.66)),
    vnt: seg(p, 0.5, 0.55) - 0.55 * seg(p, 0.56, 0.6),
    oil: 0.22 + 0.78 * seg(p, 0.62, 0.66) * (1 - seg(p, 0.79, 0.84)),
    oilClean: seg(p, 0.68, 0.75),
    heat: 0.16 * (1 - seg(p, 0.1, 0.16)) + boost,
    cool: 1 - seg(p, 0.1, 0.16),
    flow: (1 - seg(p, 0.1, 0.14)) * 0.8 + seg(p, 0.8, 0.86),
    flowSpeed: 0.5 + spin / 9 + vel,
    spin: spin + vel * 6,
    turn: 0,
    boost,
  };
}
function finaleState(q, time) {
  const a = Math.sin(time * 0.16) * 0.55 + 0.35;
  const r = mobile() ? 13.5 : 9.4;
  const pos = V(Math.sin(a) * r, (mobile() ? 3.4 : 1.9) + Math.sin(time * 0.3) * 0.3, Math.cos(a) * r);
  return {
    pos, look: mobile() ? V(0, -2.3 + q * 0.5, 0) : V(-3.9, 0.3, 0), fov: mobile() ? 44 : 36,
    explode: 0, far: 0, balance: 0, wobble: 0, vntShow: 0, vnt: 0, oil: 0.3, oilClean: 1,
    heat: 0.9, cool: 0.4, flow: 1, flowSpeed: 3, spin: 22, turn: 0, boost: 1,
  };
}

// --- Film UI -----------------------------------------------------------------

const filmEl = $('[data-film]');
const finaleEl = $('[data-finale]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const filmEnd = $('[data-film-end]');
const ticks = $$('[data-ticks] li');
const hud = $('[data-hud]');
const hint = $('[data-hint]');
const hRpm = $('[data-h-rpm]'), hBar = $('[data-h-bar]'), hGauge = $('[data-h-gauge]'), hExtra = $('[data-h-extra]');
const labels = $$('[data-label]');
const labelBox = $('[data-labels]');
let titleChars = [];

let lastExtra = '';
function setExtra(html) {
  if (html === lastExtra) return;
  lastExtra = html;
  hExtra.innerHTML = html;
}

function filmUI(p, time, st) {
  const heroOut = seg(p, 0.045, 0.1);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${-heroOut * 50}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  titleChars.forEach((c, i) => {
    const k = clamp(heroOut * 1.5 - (i / titleChars.length) * 0.5);
    c.style.transform = `translate3d(${k * 60}px, 0, 0) skewX(${-k * 20}deg)`;
    c.style.opacity = 1 - k;
  });
  hint.style.opacity = 1 - seg(p, 0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.025), vout = seg(p, b - 0.02, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(${(1 - vin) * -24 + vout * 24}px, 0, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) active = i;
  });
  const endV = seg(p, 0.968, 0.985);
  filmEnd.style.opacity = endV;
  filmEnd.style.transform = `translate3d(${(1 - endV) * -24}px, 0, 0)`;
  filmEnd.style.visibility = endV > 0.01 ? 'visible' : 'hidden';
  ticks.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p > CARD_RANGES[i][1]);
  });

  // Gösterge
  const hudOn = 1 - seg(p, 0.975, 1);
  hud.style.opacity = hudOn;
  const rpm = Math.round((st.spin * 7600) / 100) * 100;
  hRpm.textContent = nf(rpm);
  const bar = L(0.15 * (1 - seg(p, 0.1, 0.14)), 1.6, st.boost);
  hBar.textContent = nf(bar, 1);
  hGauge.style.transform = `scaleX(${clamp(bar / 2)})`;
  hud.classList.toggle('is-hot', st.boost > 0.6);
  if (active === 0) setExtra(`<span>Mil boşluğu</span><em>ölçülüyor</em>`);
  else if (active === 1) {
    setExtra(`<span>Dengesizlik</span><i class="meter"><i data-wob></i></i>`);
    const el = hExtra.querySelector('[data-wob]');
    if (el) el.style.transform = `scaleX(${clamp(st.wobble)})`;
    hExtra.classList.toggle('is-ok', st.wobble < 0.2);
  } else if (active === 2) setExtra(`<span>Kanat açıklığı</span><em data-vnt></em>`);
  else if (active === 3) setExtra(`<span>Yağ dönüşü</span><em data-oil></em>`);
  else if (active === 4) setExtra(`<span>Kaçak testi</span><em data-ic></em>`);
  else if (p > 0.9) setExtra(`<span>Tam yük</span><em>değerler yerinde</em>`);
  else setExtra(`<span>Rölanti</span><em>dinliyoruz</em>`);
  if (active !== 1) hExtra.classList.toggle('is-ok', active === -1 && p > 0.9);
  const vEl = hExtra.querySelector('[data-vnt]');
  if (vEl) vEl.textContent = `%${Math.round(20 + st.vnt * 75)}`;
  const oEl = hExtra.querySelector('[data-oil]');
  if (oEl) {
    oEl.textContent = st.oilClean > 0.6 ? 'açık' : 'tıkalı';
    hExtra.classList.toggle('is-ok', st.oilClean > 0.6);
  }
  const iEl = hExtra.querySelector('[data-ic]');
  if (iEl) {
    const ok = p > 0.9;
    iEl.textContent = ok ? 'kaçak yok' : 'basınç veriliyor';
    hExtra.classList.toggle('is-ok', ok);
  }

  // Parça etiketleri (söküm)
  const lab = seg(p, 0.165, 0.19) * (1 - seg(p, 0.265, 0.285));
  labelBox.style.opacity = lab;
  labelBox.style.visibility = lab > 0.01 ? 'visible' : 'hidden';
  if (lab > 0.01) {
    labels.forEach((el) => {
      const pr = S.project(el.dataset.label);
      const half = (el.firstElementChild.offsetWidth || 120) / 2 + 8;
      const x = clamp(pr.x, half, innerWidth - half);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${pr.y.toFixed(1)}px, 0)`;
    });
  }
}

// --- Başlangıç: açılış, scroll, render döngüsü ---------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
titleChars = split.chars;

let lenis = null;
let filmP = 0;
const topBar = $('[data-top]');
let vel = 0;
const trg = {};

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 60)));
  trg.film = ScrollTrigger.create({ trigger: filmEl, start: 'top top', end: 'bottom bottom' });
  trg.filmOut = ScrollTrigger.create({ trigger: filmEl, start: 'bottom bottom', end: 'bottom 40%' });
  trg.finale = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom' });
  trg.finaleIn = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'top 25%' });
  trg.solid = ScrollTrigger.create({ trigger: '[data-about]', start: 'top 70px', endTrigger: '[data-finale]', end: 'top 70px' });
  contentMotion();
}

function contentMotion() {
  // Başlıklar: kelimeler soğuktan sıcağa, yana kayarak gelir
  $$('[data-split]').forEach((el) => {
    const sp = new SplitText(el, { type: 'words', wordsClass: 'w' });
    gsap.fromTo(sp.words, { opacity: 0, x: -30, skewX: -14 }, {
      opacity: 1, x: 0, skewX: 0, stagger: 0.06, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.16 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  $$('.about__img img').forEach((img, i) => {
    gsap.fromTo(img, { scale: 1.2, yPercent: i ? 8 : -8 }, {
      scale: 1.02, yPercent: i ? -8 : 8, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  gsap.fromTo('.about__img', { clipPath: 'inset(0 0 100% 0)' }, {
    clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'expo.out', stagger: 0.15,
    scrollTrigger: { trigger: '.about__grid', start: 'top 80%', once: true },
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.8, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // Hizmet satırı merkeze geldikçe çizgisi ısınır
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--t': 0 }, {
      '--t': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 40%', scrub: true },
    });
  });
  // Süreç: mil çizgisi dolar, adımlar yanar
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) => {
    const lit = (self) => s.classList.toggle('is-lit', self.progress > 0);
    ScrollTrigger.create({ trigger: s, start: mobile() ? 'top 70%' : 'top 75%', end: 'max', onUpdate: lit, onRefresh: lit });
  });
  // Galeri yatay kayar
  const track = $('[data-gal-track]');
  gsap.fromTo(track, { x: () => (mobile() ? 0 : innerWidth * 0.1) }, {
    x: () => -(track.scrollWidth - innerWidth + (mobile() ? 16 : 40)),
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  gsap.fromTo('.rev', { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__grid', start: 'top 85%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
  gsap.fromTo(fsplit.chars, { opacity: 0, x: -40, skewX: -20 }, {
    opacity: 1, x: 0, skewX: 0, stagger: 0.012, ease: 'none',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 75%', end: 'top 15%', scrub: true },
  });
}

const mq = $('.marquee__inner');
let mqX = 0;
let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;

  if (trg.film) {
    const target = trg.film.progress;
    const filmActive = trg.film.isActive || target < 0.001;
    const canvasFinale = trg.finaleIn.progress;
    const filmFade = 1 - trg.filmOut.progress;
    topBar.classList.toggle('is-solid', trg.solid.isActive);

    if (Math.abs(target - filmP) > 0.25) filmP = target;
    filmP += (target - filmP) * (1 - Math.exp(-dt * 7));

    if (canvasFinale > 0.001 && !filmActive) {
      canvas.style.opacity = canvasFinale;
      const past = Math.min(0, finaleEl.getBoundingClientRect().bottom - innerHeight);
      canvas.style.transform = past < -0.5 ? `translate3d(0, ${past.toFixed(1)}px, 0)` : '';
      S.update(finaleState(trg.finale.progress, time), now);
    } else if (filmActive || filmFade > 0.001) {
      canvas.style.opacity = filmFade;
      if (canvas.style.transform) canvas.style.transform = '';
      const st = filmState(filmP, time, vel);
      filmUI(filmP, time, st);
      if (filmFade > 0.001) S.update(st, now);
    } else {
      canvas.style.opacity = 0;
    }
  }

  const w = mq.scrollWidth / 2;
  mqX -= (50 + vel * 900) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${-vel * 14}deg)`;

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

// --- Açılış: çark döner, devir yükselir ---------------------------------------------

$('[data-intro-blades]').innerHTML = blades7(18, 74, 7) + `<g transform="rotate(25.7)">${blades7(34, 74, 7)}</g>`;

function introHeroIn() {
  gsap.fromTo(titleChars, { opacity: 0, x: -50, skewX: -24 }, { opacity: 1, x: 0, skewX: 0, duration: 0.9, stagger: 0.03, ease: 'expo.out', clearProps: 'opacity' });
  gsap.fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__sides', '.hud'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, delay: 0.3, ease: 'power3.out', clearProps: 'opacity,transform' });
}

function runIntro() {
  const intro = $('[data-intro]');
  const wheel = $('[data-intro-wheel]');
  const blades = $('[data-intro-blades]');
  const rpm = $('[data-intro-rpm]');
  const name = $('[data-intro-name]');
  const nsplit = new SplitText(name, { type: 'chars', charsClass: 'ch' });
  let done = false;
  const o = { v: 0, a: 0, w: 0 };
  const spinTick = () => {
    o.a += o.w;
    blades.setAttribute('transform', `rotate(${o.a.toFixed(1)})`);
  };
  gsap.ticker.add(spinTick);
  const tl = gsap.timeline();
  tl.to(o, { w: 38, duration: 1.4, ease: 'power2.in' }, 0);
  tl.to(o, { v: 180000, duration: 1.4, ease: 'power2.in', onUpdate: () => (rpm.textContent = nf(Math.round(o.v / 100) * 100)) }, 0);
  tl.fromTo(nsplit.chars, { opacity: 0, x: -30, skewX: -25 }, { opacity: 1, x: 0, skewX: 0, duration: 0.6, stagger: 0.03, ease: 'power3.out' }, 0.25);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000, 0));
  }, [], 0.3);
  tl.add(finish, 1.5);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    gsap.timeline({
      onComplete: () => {
        gsap.ticker.remove(spinTick);
        intro.remove();
        lenis?.start();
      },
    })
      .to(wheel, { scale: 5, opacity: 0, duration: 0.7, ease: 'power3.in' }, 0)
      .to('.intro__center', { opacity: 0, x: 60, skewX: -15, duration: 0.4, ease: 'power2.in' }, 0)
      .to(intro, { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, 0.3)
      .call(introHeroIn, [], 0.3);
    document.body.classList.remove('is-loading');
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

// --- Hareket azaltma -----------------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.compile();
  const st = { ...filmState(0, 0, 0), spin: 0 };
  S.update(st);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  $$('.svc__row').forEach((r) => r.style.setProperty('--t', 1));
  addEventListener('resize', () => S.update(st));
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}


