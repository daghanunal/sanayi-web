import pist from '../../data/pist.json';
import extra from '../../data/lastik-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...pist, ...extra, otel: { ...pist.otel, ...extra.otel } });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const mmf = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const io = gsap.parseEase('power2.inOut');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;
const upper = (s) => s.toLocaleUpperCase('tr');

// "2004'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

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
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `${ablative(d.isletme.kurulus)} beri Şaşmaz'da`;
$('[data-olcu]').textContent = d.olcu;
const stokStat = d.istatistikler.find((s) => /stok/.test(s.etiket));
$('[data-stok]').textContent = stokStat ? `${nf(stokStat.deger)} lastik` : 'Hazır';

// Başlık: kelime başına satır; "&" sonraki kelimeyle aynı satırda
const words = d.isletme.ad.split(/\s+/).reduce((acc, w) => {
  if (acc.length && acc.at(-1) === '&') acc[acc.length - 1] += ` ${w}`;
  else if (w === '&' && acc.length) acc.push(w);
  else acc.push(w);
  return acc;
}, []);
// 3'ten fazla satır olursa kelimeleri en çok 3 dengeli satıra topla
if (words.length > 3) {
  const total = words.join(' ').length;
  const target = Math.ceil(total / 3);
  const packed = [];
  for (const w of words) {
    const last = packed.at(-1);
    if (last && packed.length >= 3) packed[packed.length - 1] += ` ${w}`;
    else if (last && (last.length + 1 + w.length <= target || last.length < 4)) packed[packed.length - 1] += ` ${w}`;
    else packed.push(w);
  }
  words.splice(0, words.length, ...packed);
}
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = words.map((w) => `<span class="line"><span class="line__in">${esc(upper(w))}</span></span>`).join('');
heroTitle.style.setProperty('--len', Math.max(5, ...words.map((w) => [...w].length)));
heroTitle.setAttribute('aria-label', d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
const big = $('[data-status-big]');
big.textContent = status.text;
big.classList.toggle('is-open', status.open);

// Diş bölümü
$('[data-dis-title]').textContent = d.dis.baslik;
$('[data-dis-note]').textContent = d.dis.not;
const disStages = [...d.dis.asamalar, { mm: d.dis.yeni, baslik: 'Yenisi takıldı', metin: d.isletme.slogan, yeni: true }];
$('[data-dis-stages]').innerHTML = disStages.map((s, i) => `
  <div class="stage-txt${s.yeni ? ' stage-txt--new' : ''}" data-stage-txt="${i}">
    <p class="stage-txt__mm">${esc(mmf(s.mm))} mm</p>
    <h3>${esc(s.baslik)}</h3>
    <p>${esc(s.metin)}</p>
  </div>`).join('');

// İz bölümü: istasyonlar (kar direkleri)
$('[data-iz-title]').textContent = d.iz.baslik;
$('[data-iz-sub]').textContent = d.iz.alt;
const STATION_GAP = 3.4;
const stationXs = d.hizmetler.map((_, i) => 2.6 + i * STATION_GAP);
const IZ_END = stationXs.at(-1) + 3.2;
$('[data-stations]').innerHTML = d.hizmetler.map((s, i) => `
  <article class="st" data-st="${i}">
    <p class="st__top"><span class="st__n">${String(i + 1).padStart(2, '0')}</span><span class="st__time">${esc(s.sure)}</span></p>
    <h3 class="st__name">${esc(s.baslik)}</h3>
    <p class="st__desc">${esc(s.aciklama)}</p>
  </article>`).join('');
const stEls = $$('[data-st]');
const odoEl = $('[data-odo]');

// Otel
const otelStat = d.istatistikler.find((s) => /otel/.test(s.etiket)) ?? d.istatistikler.at(-1);
$('[data-otel-label]').textContent = otelStat.etiket;
$('[data-otel-list]').innerHTML = d.otel.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

// Mevsim
$('[data-kural]').textContent = d.mevsimKural;
$('[data-season]').innerHTML = ['kis', 'yaz'].map((k) => {
  const m = d.mevsim[k];
  return `
  <figure class="scard scard--${k}">
    <div class="scard__img"><img src="${esc(m.gorsel)}" alt="${esc(m.baslik)}" loading="lazy" width="900" height="1100" /></div>
    <figcaption>
      <p class="scard__when">${esc(m.zaman)}</p>
      <h3>${esc(m.baslik)}</h3>
      <p>${esc(m.metin)}</p>
      <a class="btn btn--sm ${k === 'kis' ? 'btn--orange' : 'btn--ink'}" target="_blank" rel="noopener" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${m.baslik.toLocaleLowerCase('tr')} için randevu almak istiyorum.`))}">${icons.whatsapp}Randevu al</a>
    </figcaption>
  </figure>`;
}).join('');

// Süreç
const mins = d.surec.map((s) => parseInt(s.sure, 10) || 0);
const total = mins.reduce((a, b) => a + b, 0);
$('.flow__title').innerHTML = `Liftten inene kadar <b>${total}</b> dakika.`;
let acc = 0;
$('[data-flow]').innerHTML = d.surec.map((s, i) => {
  acc += mins[i];
  return `
  <li class="fstep" data-fstep="${i}" data-at="${acc}">
    <span class="fstep__t">${esc(s.sure)}</span>
    <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
  </li>`;
}).join('');

// Rakamlar
const stats = d.istatistikler.map((s) => ({
  ...s, deger: s.deger === 'kurulus' ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="num"><p class="num__v"><b data-num="${s.deger}">0</b><span>${esc(s.sonek)}</span></p><p class="num__l">${esc(s.etiket)}</p></li>`).join('');

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
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(upper(m))}</span><i></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, h]) => `<div><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');

$('[data-final-title]').textContent = d.finalBaslik;
$('[data-final-alt]').textContent = d.finalAlt;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// --- Sahne ---------------------------------------------------------------------

let stage = null;
const canvas = $('[data-stage]');

async function makeStage() {
  const { createStage } = await import('./scene.js');
  stage = createStage(canvas, {
    ad: d.isletme.ad, olcu: d.olcu, lite, weak, stations: { start: 0, xs: stationXs },
  });
  addEventListener('resize', () => stage.resize());
}

const P = {
  hero: { cam: [1.9, 0.5, 4.9], target: [0, -0.05, 0], yaw: -0.62, off: [0.2, 0.02], offP: [0, 0.2], fitP: 1.75 },
  hero1: { cam: [2.4, 1.0, 3.9], target: [0, 0.05, 0], yaw: 0.35, off: [0.2, 0], offP: [0, 0.2], fitP: 1.6 },
  dis0: { cam: [1.5, 0.75, 2.45], target: [0, 0.3, 0.45], yaw: 1.15, off: [0.16, 0], offP: [0, 0.2], fitP: 1.6 },
  dis1: { cam: [1.1, 0.9, 2.05], target: [0, 0.35, 0.6], yaw: 1.25, off: [0.16, 0], offP: [0, 0.2], fitP: 1.55 },
  iz0: { cam: [4.6, 1.5, 3.6], target: [-0.9, -0.45, 0], yaw: 0, off: [-0.1, -0.04], offP: [0, 0.14], fitP: 1.3 },
  final: { cam: [0, 0.7, 7.6], target: [0, -0.05, 0], yaw: -0.3, off: [0, 0.3], offP: [0, 0.25], fitP: 1.7 },
};
function blend(a, b, t) {
  return {
    cam: LV(a.cam, b.cam, t), target: LV(a.target, b.target, t), yaw: L(a.yaw ?? 0, b.yaw ?? 0, t),
    off: LV(a.off, b.off, t), offP: LV(a.offP, b.offP, t), fitP: L(a.fitP ?? 1.45, b.fitP ?? 1.45, t),
  };
}
const shift = (pose, x) => ({ ...pose, cam: [pose.cam[0] + x, pose.cam[1], pose.cam[2]], target: [pose.target[0] + x, pose.target[1], pose.target[2]] });

let clock = 0;
let izX = 0;
function pose(id, p) {
  let b, o = {};
  switch (id) {
    case 'hero': {
      b = blend(P.hero, P.hero1, io(seg(p, 0.15, 1)));
      o = { spin: 0.35, snow: 0.95 };
      break;
    }
    case 'dis': {
      const t0 = io(seg(p, 0, 0.18));
      b = t0 < 1 ? blend(P.hero1, P.dis0, t0) : blend(P.dis0, P.dis1, seg(p, 0.18, 1));
      const wear = io(seg(p, 0.16, 0.7)) * (1 - io(seg(p, 0.8, 0.94)));
      o = { spin: 0.28, wear, snow: 0.55, warm: wear > 0.8 ? (wear - 0.8) * 4 : 0 };
      break;
    }
    case 'iz': {
      const t0 = io(seg(p, 0, 0.12));
      const x = IZ_END * seg(p, 0.1, 0.97);
      izX = x;
      b = t0 < 1 ? blend(P.dis1, P.iz0, t0) : shift(P.iz0, x);
      o = { tireX: x, rollAngle: -x / 1.0, trail: x, poles: true, snow: 0.7, snowSpeed: 1 };
      break;
    }
    case 'otel': {
      const a = L(-0.55, 0.45, p);
      const r = innerWidth > innerHeight ? 7.4 : 6.4;
      b = {
        cam: [Math.sin(a) * r, L(1.6, 3.2, p), Math.cos(a) * r - 1], target: [0, L(0.1, 0.6, p), -1], yaw: 0,
        off: [0.28, 0], offP: [0, 0.2], fitP: 1.45,
      };
      o = { mode: 'otel', otel: seg(p, 0.02, 0.72), snow: 0.9 };
      break;
    }
    case 'final': {
      const drop = seg(p, 0.04, 0.26);
      const y = drop < 1 ? 4.5 * (1 - gsap.parseEase('bounce.out')(drop)) : 0;
      const roll = gsap.parseEase('power2.inOut')(seg(p, 0.45, 0.9));
      const x = roll * (innerWidth > innerHeight ? 2.4 : 1.2);
      b = { ...P.final, target: [x * 0.5, -0.05, 0], cam: [x * 0.5, 0.7, innerWidth > innerHeight ? 7.6 : 6.6] };
      b.yaw = L(-0.3, 0, seg(p, 0.3, 0.55));
      o = {
        tireY: y, tireX: x, spin: 0.2, rollAngle: roll > 0 ? -x : null, trail2: x, trail2From: 0,
        puffOk: true, snow: 0.95,
      };
      break;
    }
    default:
      return null;
  }
  return { ...b, mode: 'tire', ...o };
}

// Aktif bölüm: ekranın ortasındaki bölüm
const chapters = $$('[data-ch]').map((el) => ({ id: el.dataset.ch, el }));
let footShift = 0;
function active() {
  const mid = innerHeight / 2 - footShift;
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) {
      const span = r.height - innerHeight;
      return { id: c.id, p: span > 0 ? clamp(-r.top / span) : 0.5 };
    }
  }
  return null;
}

// İstasyon kartı: lastik bir kar direğini geçince o hizmet öne çıkar
let lastSt = -2;
function placeStations(id) {
  if (id !== 'iz') return;
  let passed = 0;
  stationXs.forEach((x) => { if (izX > x - 0.5) passed++; });
  const cur = passed - 1;
  if (cur !== lastSt) {
    stEls.forEach((el, i) => {
      el.classList.toggle('is-on', i === cur);
      el.classList.toggle('is-past', i < cur);
    });
    lastSt = cur;
    const txt = `${String(passed).padStart(2, '0')}/${String(stEls.length).padStart(2, '0')}`;
    odoEl.textContent = txt;
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
    p = { hero: 0, dis: 0.5, iz: 0.35, otel: 0.9, final: 0.4 }[id];
    if (!rmDirty) return;
    rmDirty = false;
  }
  const po = pose(id, p);
  stage.render(po, dt);
  placeStations(id);
}

// --- Açılış -----------------------------------------------------------------

const intro = $('[data-intro]');
const introName = $('[data-intro-name]');
const introPrint = $('[data-intro-print]');
const introMm = $('[data-intro-mm]');
let lenis = null;

async function runIntro() {
  introName.textContent = upper(d.isletme.ad);
  const start = performance.now();
  let skipped = false;
  let progress = 0;
  const bar = gsap.quickTo(introPrint, 'scaleX', { duration: 0.5, ease: 'power2.out' });
  const setProgress = (v) => {
    progress = Math.max(progress, v);
    bar(progress);
    introMm.textContent = mmf(progress * d.dis.yeni);
  };
  intro.addEventListener('pointerdown', () => (skipped = true), { once: true });
  const nameSplit = SplitText.create(introName, { type: 'words,chars', wordsClass: 'w', charsClass: 'c' });
  gsap.fromTo(nameSplit.chars, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.03 });
  setProgress(0.1);

  await Promise.race([
    Promise.all([document.fonts.load('40px "Dela Gothic One"'), document.fonts.load('500 16px "Funnel Sans"')]),
    new Promise((r) => setTimeout(r, 1200)),
  ]);
  setProgress(0.45);
  await makeStage();
  setProgress(0.8);
  frame(); // ilk kare: shader derlemesi burada olur
  setProgress(1);
  const minTime = 1300;
  while (!skipped && performance.now() - start < minTime) await new Promise((r) => setTimeout(r, 50));

  const tl = gsap.timeline();
  tl.to(nameSplit.chars, { yPercent: -80, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: 0.012 })
    .to(['.intro__meta', '.intro__kicker', '.intro__skip'], { opacity: 0, duration: 0.2 }, '<')
    .to('.intro__print', { scaleY: 40, duration: 0.55, ease: 'power3.in' }, '-=0.15')
    .to(intro, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, '-=0.05');
  await new Promise((r) => tl.eventCallback('onComplete', r));
  intro.remove();
  window.__introDone = Math.round(performance.now());
}

function heroIn() {
  const tl = gsap.timeline();
  tl.fromTo('.hero__title .line__in', { yPercent: 105 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.08 })
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__spec', '[data-hint]'], { opacity: 0, y: 18 }, {
      opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07,
    }, '-=0.7');
  return new Promise((r) => tl.eventCallback('onComplete', r));
}

// --- Kaydırma kurguları ---------------------------------------------------------

const sc = (sel, extraOpts = {}) => ({ trigger: sel, start: 'top top', end: 'bottom bottom', scrub: 0.6, ...extraOpts });

function setupScroll() {
  // Kahraman
  gsap.timeline({ scrollTrigger: sc('.ch--hero') })
    .to('[data-hint]', { opacity: 0, duration: 0.05 }, 0)
    .to('.hero__title .line__in', { yPercent: -110, duration: 0.3, stagger: 0.04, ease: 'power2.in' }, 0.25)
    .to(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__spec'], { opacity: 0, y: -24, duration: 0.2, stagger: 0.03 }, 0.25)
    .set({}, {}, 1);

  // Diş
  const mmEl = $('[data-mm]');
  const fill = $('[data-gauge-fill]');
  const stageTxts = $$('[data-stage-txt]');
  gsap.timeline({ scrollTrigger: sc('.ch--dis') })
    .fromTo(['.dis .ch__title', '.gauge'], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.08, stagger: 0.03 }, 0.1)
    .fromTo('.dis__note', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.72)
    .to(['.dis', '.gauge'], { opacity: 0, y: -30, duration: 0.05 }, 0.95);
  const Y = d.dis.yeni, S = d.dis.sinir;
  let lastStage = -1;
  ScrollTrigger.create({
    ...sc('.ch--dis'), scrub: false,
    onUpdate(self) {
      const p = self.progress;
      const wear = io(seg(p, 0.16, 0.7)) * (1 - io(seg(p, 0.8, 0.94)));
      const mm = L(Y, S, wear);
      mmEl.textContent = mmf(mm);
      fill.style.transform = `scaleX(${(mm / Y).toFixed(3)})`;
      document.body.classList.toggle('is-low', mm < d.dis.kis + 0.05 && p < 0.86);
      document.body.classList.toggle('is-limit', mm < S + 0.08 && p < 0.86);
      let st = -1;
      if (p > 0.12) st = 0;
      if (mm <= d.dis.kis + 0.05) st = 1;
      if (mm <= S + 0.08) st = 2;
      if (p > 0.86) st = 3;
      if (st !== lastStage) {
        lastStage = st;
        stageTxts.forEach((el, i) => el.classList.toggle('is-on', i === st));
      }
    },
  });

  // İz başlığı
  gsap.timeline({ scrollTrigger: sc('.ch--iz') })
    .fromTo('.iz__head > *', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.05, stagger: 0.02 }, 0.02)
    .to('.iz__head', { opacity: 0, y: -30, duration: 0.05 }, 0.2)
    .fromTo('.iz__odo', { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.12)
    .to('.iz__odo', { opacity: 0, duration: 0.04 }, 0.95);

  // Otel
  const countEl = $('[data-otel-count]');
  const otelN = { v: 0 };
  gsap.timeline({ scrollTrigger: sc('.ch--otel') })
    .fromTo('.otel > *', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.03 }, 0.06)
    .fromTo(otelN, { v: 0 }, {
      v: otelStat.deger, duration: 0.5, ease: 'power1.out',
      onUpdate() { countEl.textContent = nf(this.progress() > 0.995 ? otelStat.deger : otelN.v); },
    }, 0.06)
    .to('.otel', { opacity: 0, y: -40, duration: 0.06 }, 0.94);

  // Mevsim kartları
  gsap.fromTo('.season__rule', { '--k': 0 }, {
    '--k': 1, ease: 'none', scrollTrigger: { trigger: '.season', start: 'top 85%', end: 'top 20%', scrub: 0.5 },
  });
  $$('.scard').forEach((c, i) => {
    gsap.fromTo(c, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay: i * 0.08, scrollTrigger: { trigger: c, start: 'top 90%', once: true } });
    gsap.fromTo(c.querySelector('img'), { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1.12, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Süreç saati: kaydırdıkça dakika dolar
  const arc = $('[data-clock-arc]');
  const clockNum = $('[data-clock-num]');
  const C = 2 * Math.PI * 86;
  arc.style.strokeDasharray = `${C}`;
  arc.style.strokeDashoffset = `${C}`;
  const fsteps = $$('[data-fstep]');
  const capEl = $('[data-clock-cap]');
  capEl.textContent = d.surec[0].baslik;
  ScrollTrigger.create({
    trigger: '.flow__body', start: 'top 75%', end: 'bottom 55%',
    onUpdate(self) {
      const m = total * self.progress;
      arc.style.strokeDashoffset = `${(C * (1 - m / total)).toFixed(1)}`;
      clockNum.textContent = Math.round(m);
      let curStep = 0;
      fsteps.forEach((el, i) => {
        const on = m >= Number(el.dataset.at) - mins[i] + 0.01;
        el.classList.toggle('is-on', on);
        if (on) curStep = i;
      });
      const cap = d.surec[curStep].baslik;
      if (capEl.textContent !== cap) capEl.textContent = cap;
    },
  });

  // Rakamlar
  $$('[data-num]').forEach((el) => {
    const v = Number(el.dataset.num);
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter() {
        const o = { v: 0 };
        gsap.to(o, { v, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = nf(o.v)) });
      },
    });
  });
  gsap.fromTo('.num', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.nums', start: 'top 80%', once: true } });

  // Final
  // Kelime kelime (harf bölmek Dela Gothic'te harf aralığını bozuyor)
  const finalTitle = $('[data-final-title]');
  finalTitle.setAttribute('aria-label', d.finalBaslik);
  finalTitle.innerHTML = d.finalBaslik.split(/\s+/).map((w) => `<span class="fw" aria-hidden="true"><span class="fwi">${esc(w)}</span></span>`).join(' ');
  gsap.timeline({ scrollTrigger: sc('.ch--final') })
    .fromTo('.final__title .fwi', { opacity: 0, yPercent: 105 }, { opacity: 1, yPercent: 0, duration: 0.08, stagger: 0.02, ease: 'power3.out' }, 0.01)
    .fromTo(['.final__txt', '.final__cta'], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.06, stagger: 0.03 }, 0.08)
    .set({}, {}, 1);

  // İz perdeleri
  const wipe = $('[data-wipe]');
  const band = $('[data-wipe-band]');
  const word = $('[data-wipe-word]');
  $$('[data-wipe-in]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'top top',
      onUpdate(self) {
        const q = self.progress;
        const on = q > 0.001 && q < 0.999;
        wipe.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return;
        if (word.dataset.for !== sec.dataset.ch) {
          word.dataset.for = sec.dataset.ch;
          word.textContent = sec.dataset.wipeIn;
        }
        const w = innerWidth;
        band.style.transform = `translate3d(${(L(1.02, -1.62, q) * w).toFixed(1)}px,0,0)`;
        word.style.transform = `translate3d(${(L(-18, 18, q)).toFixed(1)}vw,0,0)`;
      },
    });
  });

  // Footer girerken sabit sahne sayfayla birlikte yukarı kayar (final boş kalmasın)
  ScrollTrigger.create({
    trigger: '.foot', start: 'top bottom', end: 'bottom bottom',
    onUpdate(self) {
      footShift = $('.foot').offsetHeight * self.progress;
      canvas.style.transform = footShift > 0 ? `translate3d(0,${(-footShift).toFixed(1)}px,0)` : '';
    },
    onLeaveBack() { footShift = 0; canvas.style.transform = ''; },
  });

  // Harita yakına gelince
  ScrollTrigger.create({
    trigger: '.visit', start: 'top 150%', once: true,
    onEnter() {
      $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    },
  });

  // Üst bar: zemin değiştikçe
  ScrollTrigger.create({
    trigger: '.ch--hero', start: 'bottom-=1 top', end: 'max',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  ScrollTrigger.create({
    trigger: '.flow', start: 'top 40px', end: 'bottom 40px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-dark', self.isActive),
  });
}

function marquee() {
  const inner = $('.marquee__inner');
  let x = 0;
  gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity : 0;
    const w = inner.scrollWidth / 2;
    if (!w) return;
    x -= 0.7 + Math.min(10, Math.abs(v) * 0.3);
    if (x < -w) x += w;
    inner.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  });
}

function magnets() {
  if (!finePointer) return;
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

// --- Başlat ---------------------------------------------------------------------

(async () => {
  if (reducedMotion) {
    document.documentElement.classList.add('rm');
    document.body.classList.remove('is-loading');
    intro.remove();
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
    await makeStage();
    const onScroll = () => requestAnimationFrame(frame);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => {
      rmDirty = true;
      onScroll();
    });
    $$('[data-stage-txt]').forEach((el) => el.classList.add('is-on'));
    $$('[data-fstep]').forEach((el) => el.classList.add('is-on'));
    $$('[data-num]').forEach((el) => (el.textContent = nf(Number(el.dataset.num))));
    $('[data-otel-count]').textContent = nf(otelStat.deger);
    $('[data-clock-num]').textContent = total;
    ScrollTrigger.create({
      trigger: '.visit', start: 'top 150%', once: true,
      onEnter() {
        $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy"></iframe>`;
      },
    });
    frame();
  } else {
    lenis = initSmoothScroll();
    lenis?.stop();
    scrollTo(0, 0);
    gsap.ticker.add(frame);
    marquee();
    magnets();
    await runIntro();
    document.body.classList.remove('is-loading');
    lenis?.start();
    await heroIn();
    setupScroll();
    ScrollTrigger.refresh();
  }
})();
