import pist from '../../data/pist.json';
import extra from '../../data/drift.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { RIM_FINISHES, CALIPER_COLORS } from './wheel.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...pist, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const io = gsap.parseEase('power2.inOut');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;

// "2004'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}
const upper = (s) => s.toLocaleUpperCase('tr');

// --- İçerik ------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres,
  garanti: d.garanti, otelBaslik: d.otel.baslik, otelMetin: d.otel.metin,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('[data-wa-otel]').href = waHref(d, `Merhaba ${d.isletme.ad}, lastik oteli için yer ayırtmak istiyorum.`);
$('[data-wa-mevsim]').href = waHref(d, `Merhaba ${d.isletme.ad}, mevsimlik lastik değişimi için randevu almak istiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const since = ablative(d.isletme.kurulus);
$('[data-since]').textContent = `${since} beri Şaşmaz'da`;

// Başlık: kelime başına satır; "&" sonraki kelimeyle aynı satırda
const words = d.isletme.ad.split(/\s+/).reduce((acc, w) => {
  if (acc.length && acc.at(-1) === '&') acc[acc.length - 1] += ` ${w}`;
  else acc.push(w);
  return acc;
}, []);
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = words.map((w) => `<span class="line">${esc(upper(w))}</span>`).join('');
const longest = Math.max(...words.map((w) => [...w].length));
heroTitle.style.setProperty('--len', longest);
heroTitle.setAttribute('aria-label', d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;

// Parça etiketleri
const labelsWrap = $('[data-labels]');
labelsWrap.innerHTML = d.parcalar.map((p) => `
  <div class="lbl" data-lbl="${esc(p.id)}">
    <i class="lbl__dot"></i>
    <div class="lbl__box"><b data-scr="${esc(upper(p.baslik))}">${esc(upper(p.baslik))}</b><span>${esc(p.metin)}</span></div>
  </div>`).join('');

// Mevsim
$('[data-yaz-t]').textContent = d.dis.yaz.baslik;
$('[data-yaz-m]').textContent = d.dis.yaz.metin;
$('[data-kis-t]').textContent = d.dis.kis.baslik;
$('[data-kis-m]').textContent = d.dis.kis.metin;

// Balans
$('[data-balans-title]').textContent = d.balans.baslik;
$('[data-balans-svc]').innerHTML = [d.hizmetler[1], d.hizmetler[2]].map((s) => `
  <li><b>${esc(s.baslik)}</b><span>${esc(s.sure)}</span></li>`).join('');

// Otel
const otelStat = d.istatistikler.find((s) => /otel/.test(s.etiket)) ?? d.istatistikler.at(-1);
$('[data-otel-label]').textContent = otelStat.etiket;
$('[data-otel-list]').innerHTML = d.otel.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

// Rakamlar
const stats = d.istatistikler.map((s) => ({
  ...s, deger: s.deger === 'kurulus' ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-stat-num="${s.deger}">0</b><span class="stat__suf">${esc(s.sonek)}</span></p><span class="stat__lbl">${esc(s.etiket)}</span></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="row">
    <h3 class="row__name">${esc(s.baslik)}</h3>
    <p class="row__time">${esc(s.sure)}</p>
    <p class="row__desc">${esc(s.aciklama)}</p>
  </li>`).join('');

// Yorumlar
$('[data-puan]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="card">
    <p class="card__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
$$('[data-marquee]').forEach((row, i) => {
  const list = i ? [...d.markalar].reverse() : d.markalar;
  const chunk = `<span class="marquee__chunk">${list.map((m) => `<span>${esc(m)}</span>`).join('')}</span>`;
  row.innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;
});

// Saatler
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, h]) => `<dt>${g}</dt><dd>${h}</dd>`).join('');
const lights = $('[data-lights]');

$('[data-final-title]').textContent = d.finalBaslik;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Jant seçici
const cfg = { rim: 'grafit', cal: 'sari' };
$('[data-rim-opts]').innerHTML = Object.entries(RIM_FINISHES).map(([k, v]) => `
  <button type="button" class="opt" data-rim="${k}" aria-pressed="${k === cfg.rim}"><i style="--sw:${v.color}" class="${v.metalness > 0.8 ? 'is-metal' : ''}"></i>${v.ad}</button>`).join('');
$('[data-cal-opts]').innerHTML = Object.entries(CALIPER_COLORS).map(([k, v]) => `
  <button type="button" class="opt" data-cal="${k}" aria-pressed="${k === cfg.cal}"><i style="--sw:${v.color}"></i>${v.ad}</button>`).join('');
function updateConfigText() {
  const r = RIM_FINISHES[cfg.rim].ad.toLocaleLowerCase('tr');
  const c = CALIPER_COLORS[cfg.cal].ad.toLocaleLowerCase('tr');
  $('[data-config-sum]').textContent = `${RIM_FINISHES[cfg.rim].ad} jant, ${c} kaliper`;
  $('[data-wa-config]').href = waHref(d, `Merhaba ${d.isletme.ad}, jantımı ${r} boyatıp kaliperi ${c} yaptırmak istiyorum. Fiyat alabilir miyim?`);
}
updateConfigText();

// --- Yardımcılar --------------------------------------------------------------

const GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVYZÇĞİÖŞÜ0123456789#%';
function scramble(el, text, duration = 0.7) {
  const chars = [...text];
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration, ease: 'none',
    onUpdate() {
      const n = Math.floor(o.p * chars.length);
      el.textContent = chars.map((c, i) => (i < n || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    },
    onComplete() { el.textContent = text; },
  });
}

// --- Sahne ---------------------------------------------------------------------

let stage = null;
const canvas = $('[data-stage]');
const labelEls = new Map($$('[data-lbl]').map((el) => [el.dataset.lbl, el]));

async function makeStage() {
  const { createStage } = await import('./scene.js');
  stage = createStage(canvas, { ad: d.isletme.ad, olcu: d.tekerOlcu, since: String(d.isletme.kurulus), lite, weak });
  stage.setLabels(labelEls);
  stage.wheel.setRim(cfg.rim);
  stage.wheel.setCaliper(cfg.cal);
  addEventListener('resize', () => stage.resize());
}

// Pozlar: her bölüm kendi ilerlemesine (0-1) göre kamerayı ve efektleri belirler.
// Bölüm sınırlarında pozlar birbirine eşit, geçişler dikişsiz.
const P = {
  hero: { cam: [0.55, -0.32, 4.5], target: [0, -0.08, 0], yaw: -0.28, off: [0.19, 0.02], offP: [0, -0.2] },
  parca0: { cam: [3.1, 0.85, 3.3], target: [0, 0, 0], yaw: 0, off: [0.12, 0], offP: [0, -0.1] },
  parca1: { cam: [4.5, 1.35, 0.75], target: [0, 0, 0.25], yaw: 0, off: [0.1, 0.04], offP: [0, -0.04] },
  dis0: { cam: [0.05, 1.72, 1.32], target: [0, 0.9, 0], yaw: 0.62, off: [0.14, 0], offP: [0, -0.08] },
  dis1: { cam: [0.45, 1.58, 1.2], target: [0, 0.92, 0], yaw: 0.72, off: [0.16, 0], offP: [0, -0.08] },
  balans0: { cam: [0, 0.12, 4.3], target: [0, 0, 0], yaw: 0, off: [0.2, 0], offP: [0, -0.18] },
  balans1: { cam: [0, 0.08, 3.85], target: [0, 0, 0], yaw: 0, off: [0.2, 0], offP: [0, -0.18] },
  config: { cam: [2.5, 0.6, 3.7], target: [0, 0, 0], off: [0.22, 0], offP: [0, -0.23] },
  final: { cam: [0, 1.1, 7], target: [0, 0, 0], off: [0, 0.2], offP: [0, 0.16] },
};
function blend(a, b, t) {
  return {
    cam: LV(a.cam, b.cam, t), target: LV(a.target, b.target, t), yaw: L(a.yaw ?? 0, b.yaw ?? 0, t),
    off: LV(a.off, b.off, t), offP: LV(a.offP, b.offP, t),
  };
}
const velocity = { v: 0 };
const configBoost = { v: 0 };
let clock = 0;

function pose(id, p) {
  const vel = Math.min(1, Math.abs(velocity.v) / 60);
  let b, o = {};
  switch (id) {
    case 'hero': {
      const t = io(seg(p, 0.3, 1));
      b = blend(P.hero, P.parca0, t);
      o = { spin: 26 + vel * 30, smoke: 1 - seg(p, 0.5, 0.95) * 0.85, heat: 1 - seg(p, 0.3, 1) * 0.55 };
      break;
    }
    case 'parca': {
      const t1 = io(seg(p, 0, 0.35));
      const t2 = io(seg(p, 0.8, 1));
      b = t2 > 0 ? blend(P.parca1, P.dis0, t2) : blend(P.parca0, P.parca1, t1);
      const ex = io(seg(p, 0.06, 0.4)) * (1 - io(seg(p, 0.8, 0.96)));
      o = { spin: L(3, 0.25, seg(p, 0, 0.3)) + L(0, 1, t2), explode: ex, heat: 0.45 * (1 - seg(p, 0, 0.5)), smoke: 0.15 * (1 - seg(p, 0, 0.2)), labels: true };
      break;
    }
    case 'dis': {
      const t2 = io(seg(p, 0.82, 1));
      b = t2 > 0 ? blend(P.dis1, P.balans0, t2) : blend(P.dis0, P.dis1, seg(p, 0, 0.8));
      o = { spin: 1 + t2 * 14, tread: io(seg(p, 0.3, 0.68)), snow: seg(p, 0.42, 0.6) * (1 - seg(p, 0.8, 0.95)), fitP: 1.3 };
      if (t2 > 0) o.fitP = L(1.3, 1.75, t2);
      break;
    }
    case 'balans': {
      b = blend(P.balans0, P.balans1, io(p));
      const fix = io(seg(p, 0.3, 0.78));
      o = { spin: 16, tread: 1, wobble: 1 - fix, weights: seg(p, 0.28, 0.72) };
      break;
    }
    case 'otel': {
      const z = -p * 30;
      b = { cam: [Math.sin(p * 5) * 0.25, 0.55, 1 + z], target: [Math.sin(p * 5 + 0.6) * 0.3, 0.35, -7 + z], off: [0, 0], offP: [0, 0], yaw: 0 };
      o = { mode: 'otel', fitP: 1, roll: Math.sin(p * 7) * 0.04 };
      break;
    }
    case 'config': {
      b = { ...P.config, yaw: Math.sin(clock * 0.35) * 0.45 };
      o = { spin: 0.7 + configBoost.v * 22, tread: 0 };
      break;
    }
    case 'tunel': {
      b = { cam: [0, 0, 2], target: [0, 0, -6], off: [0, 0], offP: [0, 0], yaw: 0 };
      o = { mode: 'tunnel', tunnel: 1, tunnelSpeed: 14 + p * 30 + vel * 60, roll: p * 1.4, fitP: 1 };
      break;
    }
    case 'final': {
      const drop = seg(p, 0.02, 0.24);
      const y = drop < 1 ? 4.2 * (1 - gsap.parseEase('bounce.out')(drop)) : 0;
      const roll = gsap.parseEase('power2.in')(seg(p, 0.5, 0.86));
      const x = -roll * 11;
      b = { ...P.final, target: [x * 0.12, 0, 0], cam: [x * 0.12, 1.1, 7] };
      const burn = seg(p, 0.24, 0.3) * (1 - seg(p, 0.62, 0.75));
      o = {
        wheelY: y, wheelX: x, spin: drop < 1 ? 2 : 30 * burn + 2, smoke: burn, heat: burn * 0.8,
        rollAngle: roll > 0 ? x : null, skid: Math.max(burn > 0 ? 0.05 : 0, -x / 11), skidLen: 11, skidFrom: 0.2,
      };
      break;
    }
    default:
      return null;
  }
  return {
    cam: b.cam, target: b.target, yaw: b.yaw, off: b.off, offPortrait: b.offP, fitPortrait: o.fitP ?? 1.75,
    mode: 'wheel', ...o,
  };
}

// Aktif bölüm: ekranın ortasındaki bölüm
const chapters = $$('[data-ch]').map((el) => ({ id: el.dataset.ch, el }));
function active() {
  const mid = innerHeight / 2;
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) {
      const span = r.height - innerHeight;
      return { id: c.id, p: span > 0 ? clamp(-r.top / span) : 0.5 };
    }
  }
  return null;
}

// HUD ve etiketler bölüm ilerlemesiyle
const heatEl = $('[data-heat]');
const rpmEl = $('[data-rpm]');
let lastHud = 0;
function hud(id, p, po) {
  if (id === 'hero' && performance.now() - lastHud > 90) {
    lastHud = performance.now();
    heatEl.textContent = nf(40 + 600 * po.heat);
    rpmEl.textContent = nf(Math.min(8200, po.spin * 250 + Math.random() * 120));
  }
}

let current = null;
let last = performance.now();
let rmDirty = true;
function frame() {
  const now = performance.now();
  const dt = reducedMotion ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  configBoost.v *= 0.94;
  if (!stage) return;
  const a = active();
  const id = a?.id ?? null;
  if (id !== current) {
    current = id;
    document.body.dataset.scene = id ?? 'none';
    canvas.classList.toggle('is-off', !id);
    rmDirty = true;
  }
  if (!id) return;
  let p = a.p;
  if (reducedMotion) {
    p = { hero: 0, parca: 0.55, dis: 0.2, balans: 0.9, otel: 0.3, config: 0.5, tunel: 0.2, final: 0.3 }[id];
    if (!rmDirty) return;
    rmDirty = false;
  }
  const po = pose(id, p);
  stage.render(po, dt);
  hud(id, p, po);
}

// --- Açılış -----------------------------------------------------------------

const intro = $('[data-intro]');
const introName = $('[data-intro-name]');
const introBar = $('[data-intro-bar]');
const introPct = $('[data-intro-pct]');
let lenis = null;

async function runIntro() {
  const name = upper(d.isletme.ad);
  introName.textContent = name;
  const start = performance.now();
  let skipped = false;
  let progress = 0;
  const bar = gsap.quickTo(introBar, 'scaleX', { duration: 0.4, ease: 'power2.out' });
  const setProgress = (v) => {
    progress = Math.max(progress, v);
    bar(progress);
    introPct.textContent = `%${Math.round(progress * 100)}`;
  };
  intro.addEventListener('pointerdown', () => (skipped = true), { once: true });
  scramble(introName, name, 0.9);
  setProgress(0.08);

  const fonts = Promise.race([
    Promise.all([document.fonts.load('800 60px Anybody'), document.fonts.load('500 16px Barlow')]),
    new Promise((r) => setTimeout(r, 1100)),
  ]).then(() => setProgress(0.45));
  await fonts;
  await makeStage();
  setProgress(0.8);
  frame(); // ilk kare: shader derlemesi burada olur
  setProgress(1);
  const minTime = 1150;
  while (!skipped && performance.now() - start < minTime) await new Promise((r) => setTimeout(r, 50));

  const tl = gsap.timeline();
  tl.to('.intro__center', { opacity: 0, y: -10, duration: 0.25, ease: 'power2.in' })
    .fromTo('[data-intro-streak]', { scaleX: 0 }, { scaleX: 1, duration: 0.28, ease: 'power3.in' }, '<0.05')
    .to('.intro__half--top', { yPercent: -100, duration: 0.6, ease: 'power4.inOut' }, '>-0.02')
    .to('.intro__half--bottom', { yPercent: 100, duration: 0.6, ease: 'power4.inOut' }, '<')
    .to('[data-intro-streak]', { opacity: 0, scaleY: 6, duration: 0.5, ease: 'power2.out' }, '<');
  await new Promise((r) => tl.eventCallback('onComplete', r));
  intro.remove();
  window.__introDone = Math.round(performance.now());
}

function heroIn() {
  const split = SplitText.create(heroTitle, { type: 'chars', charsClass: 'c' });
  const tl = gsap.timeline();
  tl.fromTo(split.chars, { yPercent: 115, opacity: 0, '--w': 150 }, {
    yPercent: 0, opacity: 1, '--w': 100, duration: 0.9, ease: 'expo.out', stagger: 0.025,
  })
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.hud--hero', '[data-hint]'], { opacity: 0, y: 18 }, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06,
    }, '-=0.6');
  return new Promise((r) => tl.eventCallback('onComplete', () => r(split)));
}

// --- Kaydırma kurguları ---------------------------------------------------------

const sc = (sel, extraOpts = {}) => ({
  trigger: sel, start: 'top top', end: 'bottom bottom', scrub: 0.6, ...extraOpts,
});

function setupScroll(split) {
  // Kahraman: harfler dağılır, genişlik ekseni açılır
  const rnd = gsap.utils.random;
  gsap.timeline({ scrollTrigger: sc('.ch--hero') })
    .to('[data-hint]', { opacity: 0, duration: 0.05 }, 0)
    .fromTo(split.chars, { '--w': 100 }, {
      '--w': 150, yPercent: () => rnd(-260, -60), xPercent: () => rnd(-80, 80), rotate: () => rnd(-50, 50),
      opacity: 0, ease: 'power2.in', duration: 0.3, stagger: { each: 0.008, from: 'random' },
    }, 0.04)
    .to(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: -30, duration: 0.2, stagger: 0.03 }, 0.04)
    .to('.hud--hero', { opacity: 0, duration: 0.2 }, 0.7);

  // Parçalar: başlık + etiketler
  const parcaSplit = SplitText.create('[data-parca-title]', { type: 'words', wordsClass: 'wd' });
  gsap.timeline({ scrollTrigger: sc('.ch--parca') })
    .fromTo(parcaSplit.words, { opacity: 0, yPercent: 60, '--w': 60 }, { opacity: 1, yPercent: 0, '--w': 110, duration: 0.12, stagger: 0.015 }, 0.1)
    .to(parcaSplit.words, { opacity: 0, yPercent: -60, duration: 0.1, stagger: 0.01 }, 0.8);
  const lbls = $$('.lbl');
  ScrollTrigger.create({
    ...sc('.ch--parca'), scrub: false,
    onUpdate(self) {
      const p = self.progress;
      lbls.forEach((el, i) => {
        const on = p > 0.34 + i * 0.045 && p < 0.8;
        if (on !== el.classList.contains('is-on')) {
          el.classList.toggle('is-on', on);
          if (on) {
            const b = el.querySelector('b');
            scramble(b, b.dataset.scr, 0.5);
          }
        }
      });
    },
  });

  // Diş: sıcaklık düşer, metin değişir
  const tempEl = $('[data-temp]');
  const dis = d.dis;
  gsap.timeline({ scrollTrigger: sc('.ch--dis') })
    .fromTo('.season', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.12 }, 0.02)
    .fromTo('[data-yaz]', { opacity: 1, y: 0 }, { opacity: 0, y: -30, duration: 0.1 }, 0.44)
    .fromTo('[data-kis]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1 }, 0.5)
    .fromTo('[data-season-bar]', { scaleX: 0 }, { scaleX: 1, duration: 0.38, ease: 'none' }, 0.3)
    .to('.season', { opacity: 0, y: -40, duration: 0.1 }, 0.86);
  ScrollTrigger.create({
    ...sc('.ch--dis'), scrub: false,
    onUpdate(self) {
      const t = io(seg(self.progress, 0.3, 0.68));
      tempEl.textContent = Math.round(L(dis.yaz.derece, dis.kis.derece, t)).toLocaleString('tr-TR');
      document.body.classList.toggle('is-winter', t > 0.5);
    },
  });

  // Balans: lazer, gram, dalga
  const gramEl = $('[data-gram]');
  const toeEl = $('[data-toe]');
  const wave = $('[data-wave]');
  gsap.timeline({ scrollTrigger: sc('.ch--balans') })
    .fromTo('[data-laser-h]', { scaleX: 0 }, { scaleX: 1, duration: 0.15 }, 0.05)
    .fromTo('[data-laser-v]', { scaleY: 0 }, { scaleY: 1, duration: 0.15 }, 0.1)
    .fromTo('.balans', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.12 }, 0.05)
    .to(['.balans', '.laser'], { opacity: 0, duration: 0.08 }, 0.92);
  ScrollTrigger.create({
    ...sc('.ch--balans'), scrub: false,
    onUpdate(self) {
      const fix = io(seg(self.progress, 0.3, 0.78));
      gramEl.textContent = Math.round(d.balans.gram * (1 - fix));
      const toeMin = Math.round(14 * (1 - fix));
      toeEl.textContent = `0°${String(toeMin).padStart(2, '0')}′`;
      document.body.classList.toggle('is-balanced', fix > 0.98);
      const amp = 24 * (1 - fix) + 0.6;
      let path = 'M0 30';
      for (let x = 0; x <= 300; x += 6) path += ` L${x} ${(30 + Math.sin(x * 0.09 + self.progress * 40) * amp).toFixed(1)}`;
      wave.setAttribute('d', path);
    },
  });

  // Otel: sayaç
  const countEl = $('[data-otel-count]');
  gsap.timeline({ scrollTrigger: sc('.ch--otel') })
    .fromTo('.otel > *', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.03 }, 0.1)
    .fromTo(countEl, { '--n': 0 }, {
      '--n': otelStat.deger, duration: 0.3, ease: 'power1.out',
      onUpdate() { countEl.textContent = nf(gsap.getProperty(countEl, '--n')); },
    }, 0.1)
    .to('.otel', { opacity: 0, y: -40, duration: 0.08 }, 0.9);

  // Tünel: rakamlar yaklaşıp kameranın yanından geçer
  const statEls = $$('.stat');
  ScrollTrigger.create({
    ...sc('.ch--tunel'), scrub: false,
    onUpdate(self) {
      const n = statEls.length;
      statEls.forEach((el, i) => {
        const q = clamp((self.progress * (n + 0.3) - i) / 1.1);
        const scale = q < 0.4 ? L(0.25, 1, io(q / 0.4)) : L(1, 3.2, gsap.parseEase('power2.in')((q - 0.4) / 0.6));
        const op = q <= 0 || q >= 1 ? 0 : q < 0.15 ? q / 0.15 : q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1;
        el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        const num = el.querySelector('b');
        num.textContent = nf(Number(num.dataset.statNum) * io(clamp(q / 0.4)));
      });
    },
  });

  // Final
  const finalSplit = SplitText.create('[data-final-title]', { type: 'words,chars', charsClass: 'c', wordsClass: 'fw' });
  gsap.timeline({ scrollTrigger: sc('.ch--final') })
    .fromTo(finalSplit.chars, { opacity: 0, yPercent: 100, '--w': 50 }, { opacity: 1, yPercent: 0, '--w': 125, duration: 0.14, stagger: 0.01 }, 0.26)
    .fromTo(['.final__txt', '.final__cta'], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.04 }, 0.4)
    .to(finalSplit.chars, { '--w': 60, duration: 0.2, stagger: 0.005 }, 0.55)
    .to(finalSplit.chars, { '--w': 125, duration: 0.2, stagger: 0.005 }, 0.75);

  // Geçiş perdeleri
  const wipe = $('[data-wipe]');
  const wipePanel = $('[data-wipe-panel]');
  const wipeWord = $('[data-wipe-word]');
  $$('[data-wipe-in]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'top top', scrub: false,
      onUpdate(self) {
        const q = self.progress;
        const on = q > 0.001 && q < 0.999;
        wipe.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return;
        if (wipeWord.dataset.for !== sec.dataset.ch) {
          wipeWord.dataset.for = sec.dataset.ch;
          wipeWord.textContent = sec.dataset.wipeIn;
          wipe.dataset.tone = sec.dataset.ch;
        }
        const h = innerHeight;
        wipePanel.style.transform = `translate3d(0, ${(L(1.2, -1.2, q) * h).toFixed(1)}px, 0)`;
        wipeWord.style.transform = `translate3d(${(L(40, -40, q)).toFixed(1)}vw, 0, 0)`;
        wipeWord.style.setProperty('--w', (L(50, 150, q)).toFixed(0));
      },
    });
  });

  // Hizmet satırları: ortaya geldikçe genişler
  $$('.row').forEach((row) => {
    ScrollTrigger.create({
      trigger: row, start: 'top bottom', end: 'bottom top',
      onUpdate(self) {
        const k = Math.sin(self.progress * Math.PI);
        row.style.setProperty('--w', (55 + 85 * k * k).toFixed(0));
        row.style.setProperty('--k', k.toFixed(3));
      },
    });
  });

  // Yorumlar: kaydırdıkça yana akar
  const track = $('[data-rev-track]');
  gsap.fromTo(track, { x: () => innerWidth * 0.15 }, {
    x: () => -(track.scrollWidth - innerWidth * 0.85),
    ease: 'none',
    scrollTrigger: { trigger: '.rev', start: 'top bottom', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true },
  });

  // Start ışıkları
  ScrollTrigger.create({
    trigger: '.visit', start: 'top 70%', once: true,
    onEnter() {
      const ls = $$('i', lights);
      const tl = gsap.timeline();
      ls.forEach((l, i) => tl.call(() => l.classList.add('is-red'), null, i * 0.28));
      if (status.open) tl.call(() => { ls.forEach((l) => l.classList.remove('is-red')); lights.classList.add('is-go'); }, null, ls.length * 0.28 + 0.4);
    },
  });

  // Harita yakına gelince
  ScrollTrigger.create({
    trigger: '.visit', start: 'top 150%', once: true,
    onEnter() {
      $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    },
  });

  // Üst bar: kahramandan sonra koyu zemin
  ScrollTrigger.create({
    trigger: '.ch--hero', start: 'bottom-=1 top', end: 'max',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
}

// Hız: marquee ve eğim
function velocityFx() {
  const rows = $$('[data-marquee]').map((el) => ({ el, inner: el.firstElementChild, dir: Number(el.dataset.marquee), x: 0 }));
  const skews = $$('[data-skew], .row__name');
  const setSkew = skews.map((el) => gsap.quickTo(el, 'skewX', { duration: 0.4, ease: 'power3' }));
  let lastSkew = 0;
  gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity : 0;
    velocity.v = v;
    const speed = 0.6 + Math.min(8, Math.abs(v) * 0.25);
    for (const r of rows) {
      const w = r.inner.scrollWidth / 2;
      if (!w) continue;
      r.x -= speed * r.dir * (v < 0 ? -1 : 1);
      if (r.x < -w) r.x += w;
      if (r.x > 0) r.x -= w;
      r.inner.style.transform = `translate3d(${r.x.toFixed(1)}px,0,0)`;
      r.el.style.setProperty('--w', (100 - Math.min(45, Math.abs(v) * 1.6)).toFixed(0));
    }
    const sk = clamp(-v * 0.35, -10, 10);
    if (Math.abs(sk - lastSkew) > 0.2) {
      lastSkew = sk;
      setSkew.forEach((f) => f(sk));
    }
  });
}

// --- Mikro etkileşimler -----------------------------------------------------------

function cursorAndMagnets() {
  if (!finePointer) return;
  document.body.classList.add('has-cursor');
  const cur = $('[data-cursor]');
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    cur.classList.toggle('is-link', !!e.target.closest('a, button'));
  });
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.35);
      y((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

function configUi() {
  $('.config').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    if (b.dataset.rim) {
      cfg.rim = b.dataset.rim;
      stage?.wheel.setRim(cfg.rim);
      $$('[data-rim]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    } else {
      cfg.cal = b.dataset.cal;
      stage?.wheel.setCaliper(cfg.cal);
      $$('[data-cal]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    }
    configBoost.v = 1;
    rmDirty = true;
    updateConfigText();
  });
}

// --- Başlat ---------------------------------------------------------------------

configUi();

(async () => {
  if (reducedMotion) {
    document.documentElement.classList.add('rm');
    document.body.classList.remove('is-loading');
    intro.remove();
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
    await makeStage();
    heroTitle.querySelectorAll('.line').forEach((l) => l.classList.add('is-static'));
    const onScroll = () => requestAnimationFrame(frame);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => {
      rmDirty = true;
      onScroll();
    });
    $$('.lbl').forEach((el) => el.classList.add('is-on'));
    ScrollTrigger.create({
      trigger: '.visit', start: 'top 150%', once: true,
      onEnter() {
        $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy"></iframe>`;
      },
    });
    if (status.open) lights.classList.add('is-go');
    $$('.stat').forEach((el) => (el.querySelector('b').textContent = nf(Number(el.querySelector('b').dataset.statNum))));
    frame();
  } else {
    lenis = initSmoothScroll();
    lenis?.stop();
    scrollTo(0, 0);
    gsap.ticker.add(frame);
    velocityFx();
    cursorAndMagnets();
    await runIntro();
    document.body.classList.remove('is-loading');
    lenis?.start();
    const split = await heroIn();
    setupScroll(split);
    ScrollTrigger.refresh();
  }
})();
