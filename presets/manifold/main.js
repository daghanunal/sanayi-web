import veri from '../../data/manifold.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import * as THREE from 'three';
import { createScene } from './scene.js';

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

// "1998'den", "2004'ten", "2010'dan"
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
$('[data-wa-imalat]').href = waHref(d, `Merhaba ${d.isletme.ad}, egzoz imalatı için fiyat almak istiyorum. Aracımın fotoğrafını gönderiyorum.`);
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi, ${ablative(d.isletme.kurulus)} beri`;
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

// Yolculuk durakları
$('[data-rail]').innerHTML = d.yolculuk.map((y) => `<li data-rail-i><span>${esc(y.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = d.yolculuk.map((y) => `
  <article class="card" data-card="${esc(y.id)}">
    <p class="card__stop" data-scr="${esc(y.durak)}">${esc(y.durak)}</p>
    <h2 class="card__title">${esc(y.baslik)}</h2>
    <p class="card__text">${esc(y.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${y.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(y.hizmet)} için sorun</span></a>
  </article>`).join('');

// Muayene raporu
const olc = d.muayene.olcumler;
$('[data-report-title]').textContent = d.muayene.baslik;
$('[data-report-plate]').textContent = '06 ••• ••';
$('[data-report-rows]').innerHTML = olc.map((o, i) => `
  <tr data-row="${i}">
    <th>${esc(o.ad)} <small>${esc(o.birim)}</small></th>
    <td class="is-fail">${nf(o.once, o.once % 1 ? 1 : 0)}</td>
    <td data-after>${nf(o.once, o.once % 1 ? 1 : 0)}</td>
    <td>${nf(o.sinir, o.sinir % 1 ? 1 : 0)}</td>
  </tr>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${s.deger}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="svc__row">
    <h3 class="svc__name"><span>${esc(s.baslik)}</span></h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

const imalat = d.hizmetler.find((h) => /imalat/i.test(h.baslik));
$('[data-imalat-text]').textContent = imalat ? imalat.aciklama : '';

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
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('')}</span>`;
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

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
const st = S.stations;
if (import.meta.env.DEV) window.__mf = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function insidePose(u) {
  const a = S.sample(u);
  const b = S.sample(Math.min(1, u + 0.014));
  const look = b.p.clone();
  if (u > 0.985) look.copy(a.p).addScaledVector(a.t, 1);
  return { pos: a.p.clone(), look, fov: mobile() ? 74 : 62 };
}
const tipP = S.tip.p, tipT = S.tip.t;
const EXT = () => mobile()
  ? {
      hero: { pos: V(9.8, 7.6, 12.8), look: V(-0.6, -2.4, 0), fov: 52 },
      hero2: { pos: V(-3.6, 4.6, 6.8), look: V(-8.6, 1.3, 0.2), fov: 50 },
      over: { pos: V(8.2, 7.4, 11.5), look: V(-1.2, 0, 0), fov: 50 },
      back: { pos: tipP.clone().add(V(2.2, 0.8, 2.8)), look: tipP.clone().addScaledVector(tipT, -1.6), fov: 48 },
    }
  : {
      hero: { pos: V(5.5, 6.2, 19.5), look: V(-4.2, 0.1, 0), fov: 34 },
      hero2: { pos: V(-2.4, 3.9, 7.6), look: V(-7.8, 1.1, 0), fov: 40 },
      over: { pos: V(2.6, 5.8, 12.4), look: V(0.8, -0.2, 0), fov: 38 },
      back: { pos: tipP.clone().add(V(1.8, 0.55, 2.3)), look: tipP.clone().addScaledVector(tipT, -1.4), fov: 40 },
    };
const inletA = S.sample(0);
const enterPose = () => ({
  pos: inletA.p.clone().addScaledVector(inletA.t, -1.4).add(V(0, 0.2, 0.1)),
  look: S.sample(0.012).p.clone(),
  fov: mobile() ? 60 : 50,
});
const exitPose = () => ({ pos: tipP.clone().addScaledVector(tipT, 1.1), look: tipP.clone().addScaledVector(tipT, 3.5), fov: mobile() ? 64 : 52 });

const uAt = (x) => S.uAtX(x);
const KF = [
  [0.0, 'x', 'hero'],
  [0.075, 'x', 'hero2'],
  [0.13, 'enter'],
  [0.165, 'u', 0.004],
  [0.25, 'u', st.collector + 0.035],
  [0.31, 'u', uAt(-5.25)],
  [0.38, 'u', uAt(-5.1)],
  [0.43, 'u', uAt(-3.9)],
  [0.47, 'u', uAt(-2.55)],
  [0.56, 'u', uAt(-2.4)],
  [0.61, 'u', uAt(-1.1)],
  [0.655, 'u', uAt(3.05)],
  [0.725, 'u', uAt(3.3)],
  [0.765, 'u', 0.996],
  [0.815, 'x', 'back'],
  [0.95, 'x', 'over'],
  [1.0, 'x', 'over'],
];
function poseOf(k) {
  const [, kind, v] = k;
  if (kind === 'u') return insidePose(v);
  if (kind === 'enter') return enterPose();
  if (kind === 'exit') return exitPose();
  return EXT()[v];
}
function filmPose(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  if (a[1] === 'u' && b[1] === 'u') return insidePose(L(a[2], b[2], t));
  const A = poseOf(a), B = poseOf(b);
  return { pos: A.pos.lerp(B.pos, t), look: A.look.lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

// Film ilerlemesine göre tüm sahne durumu
function filmState(p, time, vel) {
  const pose = filmPose(p);
  // Dış planlarda hafif nefes alma
  const outside = 1 - seg(p, 0.12, 0.165) + seg(p, 0.8, 0.83);
  const sway = clamp(outside) * 0.25;
  pose.pos.x += Math.sin(time * 0.35) * sway;
  pose.pos.y += Math.sin(time * 0.5) * sway * 0.5;
  const inside = seg(p, 0.14, 0.165) * (1 - seg(p, 0.765, 0.78));
  const cat = seg(p, 0.315, 0.37);
  const dpf = seg(p, 0.475, 0.55);
  const manifoldHot = seg(p, 0.16, 0.2) * (1 - seg(p, 0.27, 0.31));
  return {
    ...pose,
    inside,
    heat: 0.35 + manifoldHot * 1.1 - seg(p, 0.8, 0.9) * 0.2,
    heatInside: manifoldHot,
    clean: dpf,
    fog: inside * L(L(2.1, 0.9, cat), 0.12, dpf),
    cat, dpf,
    honeyAlpha: { katalitik: 1 - seg(p, 0.395, 0.415), dpf: 1 - seg(p, 0.575, 0.595) },
    baffleAlpha: 1,
    flowAlpha: inside,
    speed: vel,
    plumeDirt: 1 - seg(p, 0.5, 0.56),
    plumeAlpha: 1 - inside,
    spin: 0,
  };
}
function finaleState(q, time) {
  const a = time * 0.18;
  const r = mobile() ? 4.2 : 3.4;
  const pos = tipP.clone().add(V(Math.cos(a) * r * 0.55 + 1.2, 0.7 + q * 0.4, Math.sin(a) * r * 0.3 + (mobile() ? 3.6 : 2.6)));
  return {
    pos, look: tipP.clone().addScaledVector(tipT, -1.2 + q * 1.2).add(V(0, mobile() ? 0.6 : 0.1, 0)),
    fov: mobile() ? 54 : 40,
    inside: 0, heat: 0.15, heatInside: 0, clean: 1, fog: 0, cat: 1, dpf: 1,
    honeyAlpha: { katalitik: 1, dpf: 1 }, baffleAlpha: 1, flowAlpha: 0, speed: 0,
    plumeDirt: 0, plumeAlpha: 1, spin: 0,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const meter = $('[data-meter]');
const report = $('[data-report]');
const hint = $('[data-hint]');
const mSoot = $('[data-m-soot]'), mCo = $('[data-m-co]'), mDb = $('[data-m-db]'), mVerdict = $('[data-m-verdict]');
const wave = $('[data-wave]');
const stamp = $('[data-stamp]');
const rowsAfter = $$('[data-after]');
const CARD_RANGES = [[0.17, 0.29], [0.3, 0.43], [0.45, 0.61], [0.64, 0.76], [0.775, 0.885]];

// Kart başlığı "karışık harflerden" çözülür
const SCR = 'ABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZ';
const scrState = new Map();
function scramble(el, t) {
  const target = el.dataset.scr;
  const n = Math.floor(t * target.length);
  let out = target.slice(0, n);
  for (let i = n; i < target.length; i++) out += target[i] === ' ' ? ' ' : SCR[(i * 7 + Math.floor(performance.now() / 60)) % SCR.length];
  if (scrState.get(el) !== out) {
    el.textContent = out;
    scrState.set(el, out);
  }
}

function waveD(amp, time) {
  let dPath = 'M0 20';
  for (let x = 0; x <= 200; x += 4) {
    const y = 20 + Math.sin(x * 0.19 + time * 9) * amp * (0.6 + 0.4 * Math.sin(x * 0.047 + time * 2.3)) + Math.sin(x * 0.61 + time * 13) * amp * 0.25;
    dPath += ` L${x} ${y.toFixed(1)}`;
  }
  return dPath;
}

function filmUI(p, time) {
  const heroOut = seg(p, 0.05, 0.11);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${-heroOut * 60}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  titleChars.forEach((c, i) => {
    const k = clamp(heroOut * 1.4 - (i / titleChars.length) * 0.4);
    c.style.transform = `translate3d(${k * (i - titleChars.length / 2) * 8}px, ${-k * 40}px, 0)`;
  });
  hint.style.opacity = 1 - seg(p, 0.0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.025), vout = seg(p, b - 0.025, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(0, ${(1 - vin) * 30 - vout * 30}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (v > 0.01) {
      const lbl = card.querySelector('[data-scr]');
      scramble(lbl, seg(p, a, a + 0.05));
    }
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.15, 0.17) * (1 - seg(p, 0.87, 0.89));
  rail.style.opacity = railOn;
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p > CARD_RANGES[i][1]);
  });

  // Ölçüm göstergesi
  const meterOn = seg(p, 0.16, 0.19) * (1 - seg(p, 0.87, 0.9));
  meter.style.opacity = meterOn;
  meter.style.visibility = meterOn > 0.01 ? 'visible' : 'hidden';
  const cat = seg(p, 0.315, 0.37), dpf = seg(p, 0.475, 0.55), muf = seg(p, 0.66, 0.72);
  const soot = L(L(2.9, 2.2, cat), 0.4, dpf);
  const co = L(3.8, 0.2, cat);
  const db = L(104, 78, muf);
  mSoot.textContent = nf(soot, 1);
  mCo.textContent = nf(co, 1);
  mDb.textContent = nf(db);
  mSoot.parentElement.classList.toggle('is-ok', soot <= 1.5);
  mCo.parentElement.classList.toggle('is-ok', co <= 0.3);
  mDb.parentElement.classList.toggle('is-ok', db <= 90);
  const ok = soot <= 1.5 && co <= 0.3 && db <= 90;
  mVerdict.textContent = ok ? 'Muayeneye hazır' : 'Muayeneden kalır';
  mVerdict.classList.toggle('is-ok', ok);
  if (meterOn > 0.01) wave.setAttribute('d', waveD(L(15, 3, muf), time));

  // Rapor
  const rep = seg(p, 0.885, 0.915);
  report.style.opacity = rep;
  report.style.visibility = rep > 0.01 ? 'visible' : 'hidden';
  report.style.transform = `translate3d(0, ${(1 - rep) * 40}px, 0) rotate(${(1 - rep) * -3}deg)`;
  const fill = seg(p, 0.9, 0.95);
  rowsAfter.forEach((td, i) => {
    const o = olc[i];
    const v = L(o.once, o.sonra, clamp(fill * 1.6 - i * 0.2));
    td.textContent = nf(v, o.once % 1 ? 1 : 0);
    td.classList.toggle('is-pass', v <= o.sinir);
  });
  const st1 = seg(p, 0.955, 0.97);
  stamp.style.opacity = st1;
  stamp.style.transform = `rotate(-9deg) scale(${L(2.4, 1, smooth(st1))})`;
}

// --- Başlangıç: açılış, scroll, render döngüsü ----------------------------

let titleChars = [];
const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
titleChars = split.chars;

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
const top = $('[data-top]');
let vel = 0;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));

  // Durum her karede tetikleyicilerin kendisinden okunur (onToggle, sayfa doğrudan
  // ileriye atladığında — #konum bağlantısı, sayfa ortasında yenileme — hiç tetiklenmez).
  trg.film = ScrollTrigger.create({ trigger: film, start: 'top top', end: 'bottom bottom' });
  trg.finale = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom' });
  trg.filmOut = ScrollTrigger.create({ trigger: film, start: 'bottom bottom', end: 'bottom 40%' });
  trg.finaleIn = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'top 30%' });
  trg.solid = ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 80px',
    end: () => `+=${document.querySelector('[data-finale]').offsetTop - document.querySelector('[data-about]').offsetTop - 80}`,
  });

  contentMotion();
}
const trg = {};

function contentMotion() {
  // Isıyla renk değiştiren bölüm başlıkları
  $$('.sec-title').forEach((el) => {
    gsap.fromTo(el, { '--heat': 0 }, {
      '--heat': 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 35%', scrub: true },
    });
  });
  // Hakkımızda metni kelime kelime ısınır
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 45%', scrub: true },
  });
  // Panel yükselir
  gsap.fromTo('[data-about]', { clipPath: 'inset(12% 4% 0% 4% round 28px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: '[data-about]', start: 'top bottom', end: 'top 20%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.18, yPercent: -6 }, {
    scale: 1, yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Sayaçlar
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  // Hizmet satırları: merkezden geçerken kaynak rengi
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--heat': 0 }, {
      '--heat': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 78%', end: 'bottom 30%', scrub: true },
    });
  });
  // Kaynak dikişi
  const seams = $$('[data-weld-seam]');
  const halos = $$('[data-weld-halo]');
  const arc = $('[data-weld-arc]');
  gsap.set([...seams, ...halos], { drawSVG: '0%' });
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '[data-weld]', start: 'top 70%', end: 'bottom 55%', scrub: true },
  });
  seams.forEach((s, i) => {
    tl.to([s, halos[i]], {
      drawSVG: '100%', ease: 'none', duration: 1,
      onUpdate() {
        const len = s.getTotalLength();
        const pt = s.getPointAtLength(len * this.progress());
        arc.setAttribute('cx', pt.x);
        arc.setAttribute('cy', pt.y);
      },
    }, i * 1.1);
  });
  tl.to(arc, { opacity: 0, duration: 0.2 }, '>-0.1');
  gsap.fromTo('.weld__photo img', { scale: 1.2 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.weld__photo', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Süreç çizgisi
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((s) => {
    const lit = (self) => s.classList.toggle('is-lit', self.progress > 0);
    ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'max', onUpdate: lit, onRefresh: lit });
  });
  // Yorumlar yatay kayar
  const track = $('[data-rev-track]');
  gsap.to(track, {
    x: () => -(track.scrollWidth - track.parentElement.clientWidth),
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
  // Final başlığı
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.fromTo(fsplit.chars, { yPercent: 110, fontWeight: 300 }, {
    yPercent: 0, fontWeight: 800, stagger: 0.015, ease: 'none',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 70%', end: 'top 10%', scrub: true },
  });
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

  if (trg.film) {
    filmTarget = trg.film.progress;
    finaleQ = trg.finale.progress;
    const filmActive = trg.film.isActive || filmTarget < 0.001;
    const canvasFinale = trg.finaleIn.progress;
    const filmFade = 1 - trg.filmOut.progress;
    top.classList.toggle('is-solid', trg.solid.isActive);

    // Uzak atlamada (ör. #konum) filmi yumuşatmadan hedefe getir
    if (Math.abs(filmTarget - filmP) > 0.25) filmP = filmTarget;
    filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
    if (filmActive || filmP < 0.999) filmUI(filmP, time);

    if (canvasFinale > 0.001 && !filmActive) {
      canvas.style.opacity = canvasFinale;
      S.update(finaleState(finaleQ, time), now);
    } else if (filmActive || filmFade > 0.001) {
      canvas.style.opacity = filmFade;
      if (filmFade > 0.001) S.update(filmState(filmP, time, vel), now);
    } else {
      canvas.style.opacity = 0;
    }
  }

  const w = mq.scrollWidth / 2;
  mqX -= (40 + vel * 900) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${-vel * 12}deg)`;

  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());

// Masaüstü: imleç ve mıknatıslı butonlar
if (finePointer && !reducedMotion) {
  const cur = $('[data-cursor]');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    qx(pos.x); qy(pos.y);
  });
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

// --- Açılış --------------------------------------------------------------

function introHeroIn() {
  gsap.fromTo(titleChars, { yPercent: 115, fontWeight: 300 }, { yPercent: 0, fontWeight: 800, duration: 1.1, stagger: 0.035, ease: 'expo.out' });
  gsap.fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, delay: 0.35, ease: 'power3.out' });
}

function runIntro() {
  const intro = $('[data-intro]');
  const bar = $('[data-intro-bar]');
  const pct = $('[data-intro-pct]');
  const soot = $('[data-intro-soot]');
  const name = $('[data-intro-name]');
  const nsplit = new SplitText(name, { type: 'chars', charsClass: 'ch' });
  let done = false;
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.fromTo(nsplit.chars, { opacity: 0, filter: 'blur(10px)', fontWeight: 200 }, { opacity: 1, filter: 'blur(0px)', fontWeight: 800, duration: 0.8, stagger: 0.03, ease: 'power2.out' }, 0);
  tl.to(o, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => {
    bar.style.transform = `scaleX(${o.v / 100})`;
    pct.textContent = `%${Math.round(o.v)}`;
  } }, 0.1);
  tl.call(() => {
    // Sahne ilk kareyi çizsin (shader derlemesi açılışın arkasında)
    S.compile();
    S.update(filmState(0, performance.now() / 1000, 0));
  }, [], 0.3);
  tl.add(finish, 1.75);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    gsap.timeline({
      onComplete: () => {
        intro.remove();
        lenis?.start();
      },
    })
      .to(soot, { scale: 2.4, opacity: 0, filter: 'blur(30px)', duration: 0.8, ease: 'power2.in' }, 0)
      .to('.intro__center', { opacity: 0, y: -30, duration: 0.45, ease: 'power2.in' }, 0)
      .to(intro, { opacity: 0, duration: 0.55, ease: 'power1.inOut' }, 0.3)
      .call(introHeroIn, [], 0.35);
    document.body.classList.remove('is-loading');
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

// --- Hareket azaltma: durağan ama derli toplu ------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.compile();
  S.update({ ...filmState(0.95, 0, 0), plumeDirt: 0 });
  rowsAfter.forEach((td, i) => {
    td.textContent = nf(olc[i].sonra, olc[i].once % 1 ? 1 : 0);
    td.classList.add('is-pass');
  });
  mSoot.textContent = '0,4'; mCo.textContent = '0,2'; mDb.textContent = '78';
  $$('.meter__row').forEach((r) => r.classList.add('is-ok'));
  mVerdict.textContent = 'Muayeneye hazır';
  mVerdict.classList.add('is-ok');
  $$('[data-scr]').forEach((el) => (el.textContent = el.dataset.scr));
  $('[data-report-rows]');
  const puanEl = $('[data-puan]');
  puanEl.textContent = nf(d.puan.ortalama, 1);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  document.querySelector('.steps__list').style.setProperty('--fill', 1);
  addEventListener('resize', () => S.update({ ...filmState(0.95, 0, 0), plumeDirt: 0 }));
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
