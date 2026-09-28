import pist from '../../data/pist.json';
import extra from '../../data/drift.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger, autoHideHeader, setStoryMode,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { RIM_FINISHES, CALIPER_COLORS, DEFAULT_RIM, DEFAULT_CAL } from './finishes.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

// data/pist.json sektörün ortak verisi; drift.json yalnız bu tasarıma özgü alanları ekler/ezer.
const d = boot({ ...pist, ...extra, otel: { ...pist.otel, ...(extra.otel || {}) } });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const io = gsap.parseEase('power2.inOut');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const phone = matchMedia('(max-width: 899px)');

// "2004'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}
const upper = (s) => s.toLocaleUpperCase('tr');

// --- İçerik ------------------------------------------------------------------

const sentences = (s) => s.match(/[^.!?]+[.!?]+/g)?.map((x) => x.trim()) ?? [s];
const otelCumle = sentences(d.otel.metin);
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres,
  garanti: d.garanti, otelBaslik: d.otel.baslik, otelMetin: d.otel.metin,
  otelKisa: d.otel.kisa || otelCumle.slice(0, 2).join(' '),
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-wa-otel]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, lastik oteli için yer ayırtmak istiyorum.`)));
$('[data-wa-mevsim]').href = waHref(d, `Merhaba ${d.isletme.ad}, mevsimlik lastik değişimi için randevu almak istiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('.top__call').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

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
heroTitle.style.setProperty('--len', Math.max(...words.map((w) => [...w].length)));
heroTitle.style.setProperty('--lines', words.length);
heroTitle.setAttribute('aria-label', d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;

// Parça etiketleri (masaüstü: hepsi birden; telefon: tek kart)
$('[data-labels]').innerHTML = d.parcalar.map((p) => `
  <div class="lbl" data-lbl="${esc(p.id)}">
    <i class="lbl__dot"></i>
    <div class="lbl__box"><b data-scr="${esc(upper(p.baslik))}">${esc(upper(p.baslik))}</b><span>${esc(p.metin)}</span></div>
  </div>`).join('');
$('[data-pc-total]').textContent = d.parcalar.length;
$('[data-pc-rail]').innerHTML = d.parcalar.map(() => '<i></i>').join('');

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

// Yorumlar: örnek olduğu açıkça yazılır (gerçek kaynak iması yok)
$('[data-puan]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} örnek değerlendirme`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="card">
    <p class="card__stars" aria-label="${Number(y.puan) || 5} yıldız">${icons.star.repeat(Number(y.puan) || 5)}</p>
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
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, h]) => `<div class="hours__row"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
const lights = $('[data-lights]');

$('[data-final-title]').textContent = d.finalBaslik;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Jant seçici
const cfg = { rim: DEFAULT_RIM, cal: DEFAULT_CAL };
$('[data-rim-opts]').innerHTML = Object.entries(RIM_FINISHES).map(([k, v]) => `
  <button type="button" class="opt" data-rim="${k}" aria-pressed="${k === cfg.rim}"><i style="--sw:${v.color}" class="${v.metalness > 0.8 ? 'is-metal' : ''}"></i>${v.ad}</button>`).join('');
$('[data-cal-opts]').innerHTML = Object.entries(CALIPER_COLORS).map(([k, v]) => `
  <button type="button" class="opt opt--sw" data-cal="${k}" aria-pressed="${k === cfg.cal}" aria-label="${v.ad} kaliper" title="${v.ad}"><i style="--sw:${v.color}"></i><span>${v.ad}</span></button>`).join('');
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
    p: 1, duration, ease: 'none', overwrite: true,
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

// Sahne sayfa açılır açılmaz arka planda yüklenir; açılış perdesi onu beklemez.
const stageReady = (async () => {
  try {
    const { createStage } = await import('./scene.js');
    await Promise.race([document.fonts.load('800 50px Anybody'), new Promise((r) => setTimeout(r, 900))]);
    stage = await createStage(canvas, { ad: d.isletme.ad, olcu: d.tekerOlcu, since: String(d.isletme.kurulus) });
    stage.setLabels(labelEls);
    stage.wheel.setRim(cfg.rim);
    stage.wheel.setCaliper(cfg.cal);
    addEventListener('resize', () => stage.resize());
    frame();
    document.body.classList.add('is-3d');
  } catch (err) {
    console.warn('3D sahne yüklenemedi', err);
    document.body.classList.add('no-3d');
  }
})();

// Pozlar: her bölüm kendi ilerlemesine (0-1) göre kamerayı ve efektleri belirler.
// Bölüm sınırlarında pozlar birbirine eşit, geçişler dikişsiz. Kamera bilerek alçakta: asfalt
// hizasından bakan, gece çekimi.
const P = {
  hero: { cam: [0.7, -0.62, 4.4], target: [0, -0.1, 0], yaw: -0.3, off: [0.25, 0.02], offP: [0, -0.2] },
  parca0: { cam: [3.1, 0.55, 3.3], target: [0, 0, 0], yaw: 0, off: [0.12, 0], offP: [0, -0.12] },
  parca1: { cam: [4.4, 1.1, 1.0], target: [0, 0, 0.1], yaw: 0, off: [0.1, 0.04], offP: [0, -0.14] },
  dis0: { cam: [0.05, 1.72, 1.32], target: [0, 0.9, 0], yaw: 0.62, off: [0.14, 0], offP: [0, -0.08] },
  dis1: { cam: [0.45, 1.58, 1.2], target: [0, 0.92, 0], yaw: 0.72, off: [0.16, 0], offP: [0, -0.08] },
  balans0: { cam: [0, 0.05, 4.3], target: [0, 0, 0], yaw: 0, off: [0.2, 0], offP: [0, -0.18] },
  balans1: { cam: [0, 0.02, 3.85], target: [0, 0, 0], yaw: 0, off: [0.2, 0], offP: [0, -0.18] },
  config: { cam: [2.4, -0.2, 3.8], target: [0, 0, 0], off: [0.22, 0], offP: [0, -0.2] },
  final: { cam: [0, 0.6, 7], target: [0, 0, 0], off: [0, 0.2], offP: [0, 0.16] },
};
function blend(a, b, t) {
  return {
    cam: LV(a.cam, b.cam, t), target: LV(a.target, b.target, t), yaw: L(a.yaw ?? 0, b.yaw ?? 0, t),
    off: LV(a.off, b.off, t), offP: LV(a.offP, b.offP, t),
  };
}
const velocity = { v: 0 };
const configBoost = { v: 0 };
const ignite = { v: 0 }; // sahne ilk kez görününce disk bir kez kızarır
let clock = 0;

function pose(id, p) {
  const vel = Math.min(1, Math.abs(velocity.v) / 60);
  let b, o = {};
  switch (id) {
    case 'hero': {
      const t = io(seg(p, 0.3, 1));
      b = blend(P.hero, P.parca0, t);
      o = { spin: 26 + vel * 30, smoke: 1 - seg(p, 0.5, 0.95) * 0.85, heat: Math.min(1, 1 - seg(p, 0.3, 1) * 0.55 + ignite.v * 0.4) };
      break;
    }
    case 'parca': {
      const t1 = io(seg(p, 0, 0.35));
      const t2 = io(seg(p, 0.8, 1));
      b = t2 > 0 ? blend(P.parca1, P.dis0, t2) : blend(P.parca0, P.parca1, t1);
      const ex = io(seg(p, 0.06, 0.4)) * (1 - io(seg(p, 0.8, 0.96)));
      o = { spin: L(3, 0.25, seg(p, 0, 0.3)) + L(0, 1, t2), explode: ex, heat: 0.45 * (1 - seg(p, 0, 0.5)), smoke: 0.15 * (1 - seg(p, 0, 0.2)), labels: true, fitP: L(1.75, 2.25, t1 * (1 - t2)) };
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
      b = { ...P.final, target: [x * 0.12, 0, 0], cam: [x * 0.12, 0.6, 7] };
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

// HUD: disk sıcaklığı ve devir
const heatEls = $$('[data-heat]');
const rpmEls = $$('[data-rpm]');
let lastHud = 0;
function hud(id, po) {
  if (id !== 'hero' || performance.now() - lastHud < 90) return;
  lastHud = performance.now();
  const h = nf(40 + 600 * po.heat);
  const r = nf(Math.min(8200, po.spin * 250 + Math.random() * 120));
  heatEls.forEach((el) => (el.textContent = h));
  rpmEls.forEach((el) => (el.textContent = r));
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
  if (!id) return; // sahne ekranda değil: çizme
  let p = a.p;
  if (reducedMotion) {
    p = { hero: 0, parca: 0.55, dis: 0.2, balans: 0.9, otel: 0.3, config: 0.5, tunel: 0.2, final: 0.3 }[id];
    if (!rmDirty) return;
    rmDirty = false;
  }
  const po = pose(id, p);
  stage.render(po, dt);
  hud(id, po);
}

// --- Açılış (≤ 1,7 sn; dokunma, tekerlek, kaydırma ya da tuş anında geçer) ---------

const intro = $('[data-intro]');
const introName = $('[data-intro-name]');
const introBar = $('[data-intro-bar]');
const introPct = $('[data-intro-pct]');
let lenis = null;

function runIntro(onOpen) {
  return new Promise((resolve) => {
    const name = upper(d.isletme.ad);
    introName.textContent = name;
    scramble(introName, name, 0.6);
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      intro.style.pointerEvents = 'none';
      onOpen();
    };
    const bar = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        open();
        intro.remove();
        window.__introDone = Math.round(performance.now());
        resolve();
      },
    });
    tl.to(bar, {
      v: 1, duration: 0.8, ease: 'power2.inOut',
      onUpdate: () => {
        introBar.style.transform = `scaleX(${bar.v.toFixed(3)})`;
        introPct.textContent = `%${Math.round(bar.v * 100)}`;
      },
    }, 0)
      .to('.intro__center', { autoAlpha: 0, y: -10, duration: 0.22, ease: 'power2.in' }, 0.82)
      .fromTo('[data-intro-streak]', { scaleX: 0 }, { scaleX: 1, duration: 0.24, ease: 'power3.in' }, 0.84)
      .add(open, 1.0)
      .to('.intro__half--top', { yPercent: -100, duration: 0.55, ease: 'power4.inOut' }, 1.06)
      .to('.intro__half--bottom', { yPercent: 100, duration: 0.55, ease: 'power4.inOut' }, 1.06)
      .to('[data-intro-streak]', { opacity: 0, scaleY: 6, duration: 0.4, ease: 'power2.out' }, 1.08);
    const skip = () => {
      if (tl.progress() < 1) tl.progress(1);
    };
    intro.addEventListener('pointerdown', skip, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchstart', skip, { once: true, passive: true });
    addEventListener('keydown', skip, { once: true });
  });
}

function heroIn() {
  const split = SplitText.create(heroTitle, { type: 'chars', charsClass: 'c' });
  const tl = gsap.timeline();
  tl.fromTo(split.chars, { yPercent: 115, opacity: 0, '--w': 150 }, {
    yPercent: 0, opacity: 1, '--w': 100, duration: 0.85, ease: 'expo.out', stagger: 0.022,
  })
    .fromTo(['.hero__top', '.hero__slogan', '.hud--hero', '[data-hint]'], { autoAlpha: 0, y: 14 }, {
      autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.04,
    }, 0.05)
    // Butonlar hiç gizlenmez (perde onları zaten açar): ilk dokunuş her cihazda hemen çalışır
    .fromTo('.hero__cta', { y: 16 }, { y: 0, duration: 0.5, ease: 'power3.out' }, 0);
  return new Promise((r) => tl.eventCallback('onComplete', () => r(split)));
}

// --- Kaydırma kurguları ---------------------------------------------------------

// Kaydırmaya bağlı zaman çizelgeleri 1 birim uzunluğunda: konumlar = bölüm ilerlemesi
const tl1 = (st) => gsap.timeline({ scrollTrigger: st }).set({}, {}, 1);
const sc = (sel, extraOpts = {}) => ({
  trigger: sel, start: 'top top', end: 'bottom bottom', scrub: 0.6, ...extraOpts,
});

function setupScroll(split) {
  const mobile = phone.matches;
  const rnd = gsap.utils.random;

  // Kahraman: harfler dağılır, genişlik ekseni açılır
  tl1(sc('.ch--hero'))
    .to('[data-hint]', { autoAlpha: 0, duration: 0.05 }, 0)
    .fromTo(split.chars, { '--w': 100 }, {
      '--w': 150, yPercent: () => rnd(-260, -60), xPercent: () => rnd(-80, 80), rotate: () => rnd(-50, 50),
      opacity: 0, ease: 'power2.in', duration: 0.3, stagger: { each: 0.008, from: 'random' },
    }, 0.04)
    .to(['.hero__top', '.hero__slogan', '.hero__cta'], { autoAlpha: 0, y: -30, duration: 0.2, stagger: 0.03 }, 0.04)
    .to('[data-hero]', { autoAlpha: 0, duration: 0.02 }, 0.4)
    .to('.hud--hero', { autoAlpha: 0, duration: 0.2 }, 0.7);

  // Parçalar: başlık, sonra parça parça (masaüstü: etiketler; telefon: tek kart)
  const parcaTitle = $('[data-parca-title]');
  const parcaSplit = SplitText.create(parcaTitle, { type: 'words', wordsClass: 'wd' });
  const ptl = tl1(sc('.ch--parca'))
    .fromTo(parcaTitle, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.08)
    .fromTo(parcaSplit.words, { opacity: 0, yPercent: 60, '--w': 60 }, { opacity: 1, yPercent: 0, '--w': 110, duration: 0.12, stagger: 0.015 }, 0.1);
  if (mobile) {
    ptl.to(parcaSplit.words, { opacity: 0, yPercent: -60, duration: 0.06, stagger: 0.008 }, 0.26)
      .to(parcaTitle, { autoAlpha: 0, duration: 0.01 }, 0.33);
  } else {
    ptl.to(parcaSplit.words, { opacity: 0, yPercent: -60, duration: 0.1, stagger: 0.01 }, 0.8)
      .to(parcaTitle, { autoAlpha: 0, duration: 0.01 }, 0.95);
  }
  const lbls = $$('.lbl');
  const card = $('[data-partcard]');
  const cardN = $('[data-pc-n]');
  const cardT = $('[data-pc-t]');
  const cardD = $('[data-pc-d]');
  const rail = $$('[data-pc-rail] i');
  let cardIdx = -1;
  let cardOn = false;
  const showCard = (on) => {
    if (on === cardOn) return;
    cardOn = on;
    gsap.to(card, { autoAlpha: on ? 1 : 0, y: on ? 0 : 16, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  };
  gsap.set(card, { autoAlpha: 0, y: 16 });
  const n = d.parcalar.length;
  ScrollTrigger.create({
    ...sc('.ch--parca'), scrub: false,
    onUpdate(self) {
      const p = self.progress;
      if (mobile) {
        const on = p > 0.34 && p < 0.8;
        const idx = clamp(Math.floor((p - 0.34) / (0.46 / n)), 0, n - 1);
        lbls.forEach((el, i) => {
          el.classList.toggle('is-on', on);
          el.classList.toggle('is-active', on && i === idx);
        });
        showCard(on);
        if (on && idx !== cardIdx) {
          cardIdx = idx;
          const part = d.parcalar[idx];
          cardN.textContent = idx + 1;
          cardD.textContent = part.metin;
          scramble(cardT, part.baslik.toLocaleUpperCase('tr'), 0.45);
          rail.forEach((r, i) => r.classList.toggle('on', i <= idx));
        }
        return;
      }
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
  tl1(sc('.ch--dis'))
    .fromTo('.season', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.02)
    .fromTo('[data-yaz]', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -30, duration: 0.1 }, 0.44)
    .fromTo('[data-kis]', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.5)
    .fromTo('[data-season-bar]', { scaleX: 0 }, { scaleX: 1, duration: 0.38, ease: 'none' }, 0.3)
    .to('.season', { autoAlpha: 0, y: -40, duration: 0.1 }, 0.86);
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
  tl1(sc('.ch--balans'))
    .fromTo('[data-laser-h]', { scaleX: 0 }, { scaleX: 1, duration: 0.15 }, 0.05)
    .fromTo('[data-laser-v]', { scaleY: 0 }, { scaleY: 1, duration: 0.15 }, 0.1)
    .fromTo('.balans', { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.12 }, 0.05)
    .to(['.balans', '.laser'], { autoAlpha: 0, duration: 0.08 }, 0.92);
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

  // Otel: sayaç; telefonda metin → maddeler + buton (kart %40'ı aşmasın)
  const countEl = $('[data-otel-count]');
  const otl = tl1(sc('.ch--otel'))
    .fromTo('.otel', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.1)
    .fromTo(countEl, { '--n': 0 }, {
      '--n': otelStat.deger, duration: 0.3, ease: 'power1.out',
      onUpdate() { countEl.textContent = nf(gsap.getProperty(countEl, '--n')); },
    }, 0.1)
    .to('.otel', { autoAlpha: 0, y: -40, duration: 0.08 }, 0.9);
  if (mobile) {
    otl.fromTo('.otel__a', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -16, duration: 0.06 }, 0.48)
      .fromTo('.otel__b', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.52);
  }

  // Tünel: rakamlar yaklaşıp kameranın yanından geçer
  const statEls = $$('.stat');
  ScrollTrigger.create({
    ...sc('.ch--tunel'), scrub: false,
    onUpdate(self) {
      const cnt = statEls.length;
      statEls.forEach((el, i) => {
        const q = clamp((self.progress * (cnt + 0.3) - i) / 1.1);
        const scale = q < 0.4 ? L(0.25, 1, io(q / 0.4)) : L(1, 3.2, gsap.parseEase('power2.in')((q - 0.4) / 0.6));
        const op = q <= 0 || q >= 1 ? 0 : q < 0.15 ? q / 0.15 : q > 0.62 ? Math.max(0, 1 - (q - 0.62) / 0.2) : 1;
        el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        el.style.visibility = op > 0.01 ? 'visible' : 'hidden';
        const num = el.querySelector('b');
        num.textContent = nf(Number(num.dataset.statNum) * io(clamp(q / 0.4)));
      });
    },
  });

  // Final
  const finalSplit = SplitText.create('[data-final-title]', { type: 'words,chars', charsClass: 'c', wordsClass: 'fw' });
  tl1(sc('.ch--final'))
    .fromTo('.final', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.25)
    .fromTo(finalSplit.chars, { opacity: 0, yPercent: 100, '--w': 50 }, { opacity: 1, yPercent: 0, '--w': 125, duration: 0.14, stagger: 0.01 }, 0.26)
    .fromTo(['.final__txt', '.final__cta'], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.1, stagger: 0.04 }, 0.4)
    .to(finalSplit.chars, { '--w': 60, duration: 0.2, stagger: 0.005 }, 0.55)
    .to(finalSplit.chars, { '--w': 125, duration: 0.2, stagger: 0.005 }, 0.75);

  // Geçiş perdeleri: perde ekrandayken üst başlık ve alt çubuk çekilir (tek katman kuralı)
  const wipe = $('[data-wipe]');
  const wipePanel = $('[data-wipe-panel]');
  const wipeWord = $('[data-wipe-word]');
  const top = $('[data-top]');
  let wipeOn = false;
  const setWipe = (on) => {
    if (on === wipeOn) return;
    wipeOn = on;
    wipe.style.visibility = on ? 'visible' : 'hidden';
    top.classList.toggle('is-tucked', on);
    setStoryMode(on ? true : null);
  };
  $$('[data-wipe-in]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'top top', scrub: false,
      onToggle: (self) => { if (!self.isActive) setWipe(false); },
      onUpdate(self) {
        const q = self.progress;
        const on = q > 0.001 && q < 0.999;
        setWipe(on);
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

  // Hizmet satırları: ortaya geldikçe açılır. Genişlik ekseni yerine transform: satır kırılımı
  // değişip sayfa kaymasın.
  $$('.row').forEach((row) => {
    const name = row.querySelector('.row__name');
    ScrollTrigger.create({
      trigger: row, start: 'top bottom', end: 'bottom top',
      onUpdate(self) {
        const k = Math.sin(self.progress * Math.PI);
        row.style.setProperty('--k', k.toFixed(3));
        gsap.set(name, { scaleX: 0.84 + 0.16 * k * k });
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

  // Üst bar: kahramandan sonra koyu zemin
  ScrollTrigger.create({
    trigger: '.ch--hero', start: 'top+=40 top', end: 'max',
    onToggle: (self) => top.classList.toggle('is-solid', self.isActive),
  });
}

// Harita yaklaşınca yüklenir
function lazyMap() {
  const box = $('[data-map]');
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    box.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    obs.disconnect();
  }, { rootMargin: '900px 0px' }).observe(box);
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
      x((e.clientX - (r.left + r.width / 2)) * 0.3);
      y((e.clientY - (r.top + r.height / 2)) * 0.3);
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
    if (reducedMotion) frame();
  });
}

// --- Başlat ---------------------------------------------------------------------

configUi();
lazyMap();
autoHideHeader($('[data-top]'), { offset: 120 });
$('.top__brand').addEventListener('click', (e) => {
  e.preventDefault();
  if (lenis) lenis.scrollTo(0);
  else scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

(async () => {
  if (reducedMotion) {
    document.documentElement.classList.add('rm');
    document.body.classList.remove('is-loading');
    intro.remove();
    heroTitle.querySelectorAll('.line').forEach((l) => l.classList.add('is-static'));
    const onScroll = () => requestAnimationFrame(frame);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => {
      rmDirty = true;
      onScroll();
    });
    $$('.lbl').forEach((el) => el.classList.add('is-on'));
    if (status.open) lights.classList.add('is-go');
    $$('.stat').forEach((el) => (el.querySelector('b').textContent = nf(Number(el.querySelector('b').dataset.statNum))));
    await stageReady;
    frame();
    return;
  }
  lenis = initSmoothScroll();
  lenis?.stop();
  scrollTo(0, 0);
  gsap.ticker.add(frame);
  velocityFx();
  cursorAndMagnets();
  let heroP = null;
  await runIntro(() => {
    document.body.classList.remove('is-loading');
    lenis?.start();
    heroP = heroIn();
  });
  // Sahne hazır olunca disk bir kez kızarır (kontak)
  stageReady.then(() => gsap.fromTo(ignite, { v: 1 }, { v: 0, duration: 1.6, ease: 'power2.out' }));
  const split = await heroP;
  setupScroll(split);
  ScrollTrigger.refresh();
  document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
