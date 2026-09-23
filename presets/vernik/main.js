import raw from '../../data/showroom.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString('tr-TR');
const mobile = matchMedia('(max-width: 899px)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lowPower = mobile || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

// "2008'den", "1994'ten", "1990'dan"
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  if (n % 10) return `${n}'${birler[n % 10]}`;
  if (n % 100) return `${n}'${onlar[(n % 100) / 10]}`;
  return `${n}'den`;
}

// --- Boyalar: seçilen renk arabayı ve bütün sayfanın vurgusunu değiştirir ---
const BOYALAR = [
  { ad: 'Nar kırmızısı', hex: '#7a0911', ui: '#e5323d' },
  { ad: 'Gece mavisi', hex: '#0b2456', ui: '#5b8ff5' },
  { ad: 'Zümrüt yeşili', hex: '#063d2d', ui: '#2fc28c' },
  { ad: 'Nardo grisi', hex: '#62676b', ui: '#aab2b9' },
  { ad: 'Şampanya', hex: '#8c7048', ui: '#dcb67f' },
  { ad: 'İnci beyazı', hex: '#d8d6cf', ui: '#f2f0ea' },
  { ad: 'Obsidyen', hex: '#070708', ui: '#cfd5db' },
];
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
let boya = BOYALAR[0];

// --- Metin ve linkler ------------------------------------------------------
const fotoMesaj = 'Merhaba, aracımın fotoğraflarını gönderiyorum. Fiyat alabilir miyim?';
const binds = {
  ad: d.isletme.ad,
  slogan: d.isletme.slogan,
  hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon,
  adres: d.iletisim.adres,
  garanti: d.garanti,
  since: `Şaşmaz'da ${ablative(d.isletme.kurulus)} beri`,
  copy: `© ${new Date().getFullYear()} ${d.isletme.ad}`,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
const hrefs = { tel: telHref(d), 'wa-foto': waHref(d, fotoMesaj), maps: mapsHref(d) };
$$('[data-href]').forEach((el) => hrefs[el.dataset.href] && (el.href = hrefs[el.dataset.href]));
$$('[data-icon]').forEach((el) => (el.outerHTML = icons[el.dataset.icon]));
$('.top__call').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

function refreshStatus() {
  const s = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.textContent = s.text;
    el.classList.toggle('is-open', s.open);
  });
  $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- İçerik ------------------------------------------------------------------
$('[data-proof]').innerHTML = (d.oncesiSonrasi || []).map((p) => `
  <figure class="ba">
    <div class="ba__frame" data-ba>
      <img src="${p.sonra}" alt="${esc(p.baslik)}, işlem sonrası" loading="lazy" />
      <img class="ba__before" src="${p.once}" alt="${esc(p.baslik)}, işlem öncesi" loading="lazy" />
      <span class="ba__tag ba__tag--l">Önce</span><span class="ba__tag ba__tag--r">Sonra</span>
      <span class="ba__seam" aria-hidden="true"></span>
    </div>
    <figcaption>${esc(p.baslik)}</figcaption>
  </figure>`).join('');

$('[data-services]').innerHTML = d.hizmetler.map((h) => `
  <li class="row">
    <h3 class="row__title">${esc(h.baslik)}</h3>
    <div class="row__meta">
      <p class="row__desc">${esc(h.aciklama)}</p>
      ${h.sure ? `<span class="row__time">${esc(h.sure)}</span>` : ''}
    </div>
    ${h.gorsel ? `<div class="row__img"><img src="${h.gorsel}" alt="" loading="lazy" /></div>` : ''}
  </li>`).join('');

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-stats]').innerHTML = d.istatistikler.map((s) => {
  const v = s.deger === 'kurulustan' ? yil : s.deger;
  return `<li><span class="stat__num" data-to="${v}" data-suffix="${esc(s.sonek || '')}">0</span><span class="stat__lbl">${esc(s.etiket)}</span></li>`;
}).join('');

$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <article class="step">
    <span class="step__n">${i + 1}</span>
    <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
  </article>`).join('');

const stars = (n) => Array.from({ length: 5 }, (_, i) => (i < Math.round(n) ? icons.star : '')).join('');
$('[data-stars]').innerHTML = stars(d.puan.ortalama);
$('[data-review-count]').textContent = fmt(d.puan.adet);
const reviewHtml = d.yorumlar.map((y) => `
  <blockquote class="review">
    <span class="review__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</span>
    <p class="review__txt">${esc(y.metin)}</p>
    <footer class="review__who"><b>${esc(y.ad)}</b>${y.arac ? `, ${esc(y.arac)}` : ''}</footer>
  </blockquote>`).join('');
$('[data-reviews]').innerHTML = reviewHtml + reviewHtml.replaceAll('<blockquote class="review"', '<blockquote class="review" aria-hidden="true"');
const brandHtml = d.markalar.map((m) => `<span class="brand">${esc(m)}</span>`).join('');
$('[data-brands]').innerHTML = brandHtml + brandHtml.replaceAll('<span class="brand"', '<span class="brand" aria-hidden="true"');

const today = GUNLER[new Date().getDay()];
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([gun, saat]) => {
  const isToday = gun.includes(today) || (gun.includes('–') && dayInRange(gun));
  return `<dt class="${isToday ? 'is-today' : ''}">${gun}</dt><dd>${saat}</dd>`;
}).join('');
function dayInRange(label) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const [a, b] = label.split(' – ').map((g) => order.indexOf(GUNLER.indexOf(g)));
  const t = order.indexOf(new Date().getDay());
  return t >= a && t <= b;
}

// --- Renk seçici ------------------------------------------------------------
$('[data-swatches]').innerHTML = BOYALAR.map((b, i) => `
  <button type="button" class="sw" role="radio" aria-checked="${i === 0}" data-i="${i}" style="--c:${b.hex}">
    <i></i>${esc(b.ad)}
  </button>`).join('');

function applyPaintUi(b) {
  const root = document.documentElement.style;
  root.setProperty('--paint', b.ui);
  root.setProperty('--paint-deep', b.hex);
  root.setProperty('--on-paint', lum(b.ui) > 0.5 ? '#0b0b0c' : '#ffffff');
  $$('[data-paint-name]').forEach((el) => (el.textContent = b.ad));
  const cta = $('[data-renk-cta]');
  cta.textContent = `${b.ad} için fiyat al`;
  cta.closest('a').href = waHref(d, `Merhaba, aracımı ${b.ad.toLocaleLowerCase('tr-TR')} renge boyatmak istiyorum. Fiyat alabilir miyim?`);
  $$('.sw').forEach((s) => s.setAttribute('aria-checked', String(BOYALAR[s.dataset.i] === b)));
}
applyPaintUi(boya);

// --- 3D sahne ---------------------------------------------------------------
const canvas = $('[data-stage]');
let stage = null;
try {
  stage = createScene(canvas, { lowPower });
  stage.setPaint(boya.hex, { instant: true });
} catch (err) {
  console.warn('WebGL yok, fotoğrafla devam', err);
  canvas.style.background = `center / cover no-repeat url(${import.meta.env.BASE_URL}img/showroom/hero.jpg)`;
}
const S = stage?.state ?? {};

$('[data-swatches]').addEventListener('click', (e) => {
  const btn = e.target.closest('.sw');
  if (!btn) return;
  const b = BOYALAR[btn.dataset.i];
  if (b === boya) return;
  boya = b;
  applyPaintUi(b);
  gsap.to('[data-paint-name]', { duration: 0.8, scrambleText: { text: b.ad, chars: 'ABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZ', speed: 0.6 } });
  if (!stage) return;
  stage.setPaint(b.hex);
  gsap.killTweensOf(S, 'swap,spray');
  gsap.fromTo(S, { swap: 0 }, { swap: 1, duration: reducedMotion ? 0.01 : 1.5, ease: 'power1.inOut' });
  if (!reducedMotion) {
    gsap.timeline()
      .to(S, { spray: 1, duration: 0.2 })
      .to(S, { spray: 0, duration: 0.35 }, 1.2);
  }
});

// Sahne sadece arabanın göründüğü bölümlerde çizer
let visibleCanvas = 0;
function canvasSection(el) {
  ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      visibleCanvas += self.isActive ? 1 : -1;
      stage?.setActive(visibleCanvas > 0);
    },
  });
}

// --- Hareket azaltma: sabit ama güzel ----------------------------------------
if (reducedMotion) {
  document.body.classList.remove('is-loading');
  $('[data-intro]').remove();
  $$('[data-canvas]').forEach(canvasSection);
  if (stage) {
    Object.assign(S, { px: -4.6, py: 1.3, pz: -5.4, tx: 0, ty: 0.5, tz: 0, tubes: 1, sweep: 1, gloss: 1, swap: 1 });
    stage.load().then(() => stage.renderOnce());
  }
  initBeforeAfter();
  $$('.stat__num').forEach((el) => (el.textContent = fmt(el.dataset.to) + el.dataset.suffix));
  $('[data-score]').textContent = d.puan.ortalama.toFixed(1).replace('.', ',');
  $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy"></iframe>`;
} else {
  runIntro();
}

// --- Açılış -----------------------------------------------------------------
function runIntro() {
  const lenis = initSmoothScroll({ lerp: 0.085 });
  lenis?.stop();
  scrollTo(0, 0);

  const intro = $('[data-intro]');
  const bar = $('[data-intro-bar]');
  const pct = $('[data-intro-pct]');
  const name = new SplitText('.intro__name', { type: 'chars', charsClass: 'ch' });
  gsap.set(name.chars, { opacity: 0, y: 30 });
  gsap.set('.intro__name', { fontVariationSettings: "'wdth' 75" });

  const shown = { p: 0 };
  let loaded = !stage;
  let done = false;
  const start = performance.now();

  const introTl = gsap.timeline();
  introTl
    .to(name.chars, { opacity: 1, y: 0, stagger: 0.025, duration: 0.7, ease: 'power3.out' }, 0.05)
    .to('.intro__name', { fontVariationSettings: "'wdth' 100", duration: 1.6, ease: 'power2.inOut' }, 0.1);

  const loadP = stage
    ? stage.load((p) => (shown.target = p)).then(() => (loaded = true)).catch((e) => { console.error(e); loaded = true; })
    : Promise.resolve();

  // Çubuk gerçek yüklemeyi izler ama en az 1,4 sn sürer
  gsap.ticker.add(tickBar);
  function tickBar() {
    const elapsed = (performance.now() - start) / 1400;
    const goal = Math.min(loaded ? 1 : Math.min(shown.target ?? 0, 0.96), Math.min(elapsed, 1));
    shown.p += (goal - shown.p) * 0.12;
    bar.style.transform = `scaleX(${shown.p})`;
    pct.textContent = Math.round(shown.p * 100);
    // Model gelmese de açılış 2,4 sn'yi geçmez; araba hazır olunca kabin yanar
    if (!done && ((loaded && shown.p > 0.985) || performance.now() - start > 2400)) finish();
  }

  intro.addEventListener('click', () => {
    if (done) return;
    finish(true);
  });

  function finish(fast = false) {
    done = true;
    gsap.ticker.remove(tickBar);
    if (loaded) {
      bar.style.transform = 'scaleX(1)';
      pct.textContent = '100';
    }
    visibleCanvasInit();
    const tl = gsap.timeline({
      onComplete: () => {
        intro.remove();
        ScrollTrigger.refresh();
      },
    });
    // Tüp titrer, sonra perde ortadan ikiye açılır
    if (!fast) {
      tl.to('.intro__tube i', { keyframes: [{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }], duration: 0.35, ease: 'none' });
    }
    tl.to('.intro__core, .intro__skip', { opacity: 0, duration: 0.25 }, '>-0.05')
      .add(() => {
        // Perde açılırken sayfa kaydırılabilir olsun
        intro.style.pointerEvents = 'none';
        document.body.classList.remove('is-loading');
        lenis?.start();
      }, '<')
      .to('.intro__half--top', { yPercent: -101, duration: 0.9, ease: 'expo.inOut' }, '<0.1')
      .to('.intro__half--bottom', { yPercent: 101, duration: 0.9, ease: 'expo.inOut' }, '<')
      .add(() => (loaded ? lightUp(false) : loadP.then(() => lightUp(false))), '<0.1')
      .add(heroIn, '<0.35');
  }
}

let introLit = false;
function lightUp(instant) {
  if (!stage || introLit) return;
  introLit = true;
  if (instant) return gsap.to(S, { tubes: 1, duration: 0.6 });
  // Kabin ışıkları tek tek, floresan gibi titreyerek yanar
  gsap.timeline()
    .to(S, { tubes: 0.18, duration: 0.06 })
    .to(S, { tubes: 0.02, duration: 0.08 })
    .to(S, { tubes: 0.45, duration: 0.07 }, '+=0.1')
    .to(S, { tubes: 0.12, duration: 0.05 })
    .to(S, { tubes: 1, duration: 1.1, ease: 'power2.out' }, '+=0.12');
}

let visibleInitDone = false;
function visibleCanvasInit() {
  if (visibleInitDone) return;
  visibleInitDone = true;
  $$('[data-canvas]').forEach(canvasSection);
  buildFilm();
  buildSections();
  initBeforeAfter();
  initCursor();
}

// --- Başlık animasyonu yardımcıları -------------------------------------------
function splitTitle(el) {
  return new SplitText(el, { type: 'lines,words,chars', linesClass: 'ln', charsClass: 'ch' });
}
function splitLines(el) {
  return new SplitText(el, { type: 'lines', linesClass: 'ln' });
}

let heroSplit;
function heroIn() {
  const hero = $('.chap--hero');
  heroSplit = heroSplit || splitTitle($('.chap__title--hero', hero));
  gsap.fromTo(heroSplit.chars, { yPercent: 115, rotate: 6 }, {
    yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.022, ease: 'expo.out',
  });
  gsap.fromTo(
    ['.chap__kicker', '.chap__lead', '.chap__actions > *', '.chap--hero .status'].map((s) => hero.querySelectorAll(s)),
    { opacity: 0, y: 24, filter: 'blur(8px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.35, clearProps: 'filter' }
  );
}

// --- FİLM ---------------------------------------------------------------------
const POSES = {
  p0: { px: -4.4, py: 1.25, pz: -5.4, tx: 0, ty: 0.35, tz: -0.2, fitK: 0.82 },
  p0b: { px: -3.7, py: 1.25, pz: -4.4, tx: 0, ty: 0.4, tz: -0.2, fitK: 0.9 },
  p1: { px: -6.4, py: 1.5, pz: -0.6, tx: 0, ty: 0.5, tz: 0, fitK: 1 },
  p2: { px: -5.1, py: 1.9, pz: 4.7, tx: 0, ty: 0.45, tz: 0.3, fitK: 1 },
  p3: { px: 5.8, py: 2.9, pz: 1.4, tx: 0, ty: 0.4, tz: 0, fitK: 1 },
  p4: { px: 0.9, py: 3.7, pz: -3.9, tx: 0, ty: 0.75, tz: -1.15, fitK: 0.5 },
  p5a: { px: -2.9, py: 0.55, pz: -2.8, tx: -0.8, ty: 0.42, tz: -1.2, fitK: 0.5 },
  p5b: { px: -1.95, py: 0.95, pz: -4.3, tx: -0.45, ty: 0.62, tz: -1.85, fitK: 0.5 },
  pick: { px: -4.9, py: 1.45, pz: -5.0, tx: 0, ty: 0.42, tz: 0, fitK: 1 },
  pickFrom: { px: -1.5, py: 6.5, pz: -6.5, tx: 0, ty: 0.3, tz: 0, fitK: 1 },
  fin: { px: 0.15, py: 0.75, pz: -6.4, tx: 0, ty: 0.58, tz: 0, fitK: 1 },
};
// Dikey ekranda araba metnin üstündeki banda sığdırılır (sahne kutuya göre uzaklığı hesaplar)
for (const [k, v] of Object.entries(POSES)) {
  const close = ['p4', 'p5a', 'p5b'].includes(k);
  Object.assign(v, { fitCar: close ? 0 : 1, rTop: 0.09, rBot: 0.42 });
}
Object.assign(POSES.p0, { rTop: 0.08, rBot: 0.27 });
Object.assign(POSES.p0b, { rTop: 0.09, rBot: 0.36 });
Object.assign(POSES.pick, { rTop: 0.06, rBot: 0.31 }); // başlık ~%32de başlıyor
Object.assign(POSES.pickFrom, { rTop: 0.06, rBot: 0.31 });
Object.assign(POSES.fin, { rTop: 0.1, rBot: 0.42 });
if (mobile) {
  // Önden 3/4 açı dikey ekranda daha iyi okunur
  Object.assign(POSES.p0, { px: -2.5, py: 1.5, pz: -6.3 });
  Object.assign(POSES.p0b, { px: -2.9, py: 1.4, pz: -5.6 });
}
Object.assign(S, POSES.p0);

function buildFilm() {
  const chaps = $$('[data-chap]');
  const rail = $$('.rail li');
  const splits = chaps.map((c, i) => (i === 0 ? null : {
    title: splitTitle($('.chap__title', c)),
    text: splitLines($('.chap__text', c)),
    extra: $$('.chip, .gauge', c),
  }));
  chaps.slice(1).forEach((c) => gsap.set(c, { autoAlpha: 1 }));
  splits.forEach((s) => {
    if (!s) return;
    gsap.set(s.title.chars, { yPercent: 115 });
    gsap.set(s.text.lines, { yPercent: 105, opacity: 0 });
    if (s.extra.length) gsap.set(s.extra, { opacity: 0, y: 20 });
  });

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  let pose = { ...POSES.p0 };
  const cam = (to, at, dur, ease = 'power2.inOut') => {
    tl.fromTo(S, { ...pose }, { ...POSES[to], duration: dur, ease, immediateRender: false }, at);
    pose = { ...POSES[to] };
  };
  const val = (key, from, to, at, dur, ease = 'none') =>
    tl.fromTo(S, { [key]: from }, { [key]: to, duration: dur, ease, immediateRender: false }, at);
  const chapIn = (i, at) => {
    const s = splits[i];
    tl.fromTo(s.title.chars, { yPercent: 115, rotate: 5, opacity: 1 }, { yPercent: 0, rotate: 0, opacity: 1, stagger: 0.012, duration: 0.45, ease: 'power3.out', immediateRender: false }, at);
    tl.fromTo(s.text.lines, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.4, ease: 'power3.out', immediateRender: false }, at + 0.15);
    if (s.extra.length) tl.fromTo(s.extra, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, immediateRender: false }, at + 0.3);
  };
  const chapOut = (i, at) => {
    const s = splits[i];
    tl.fromTo(s.title.chars, { yPercent: 0, opacity: 1 }, { yPercent: -115, opacity: 0, stagger: 0.008, duration: 0.35, ease: 'power2.in', immediateRender: false }, at);
    tl.fromTo([...s.text.lines, ...s.extra], { opacity: 1 }, { opacity: 0, duration: 0.25, immediateRender: false }, at);
  };

  // 1 Kabin (hero)
  cam('p0b', 0, 1.3, 'none');
  tl.add(() => {}, 1.0);
  tl.fromTo('.chap--hero', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -60, duration: 0.5, immediateRender: false, ease: 'power2.in' }, 0.9);
  tl.fromTo('.rail', { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, 1.1);

  // 2 Astar
  cam('p1', 1.3, 1.4);
  chapIn(1, 1.7);
  chapOut(1, 3.0);

  // 3 Boya: tabanca önden arkaya
  cam('p2', 3.2, 2.2, 'sine.inOut');
  val('sweep', 0, 1, 3.4, 1.9);
  val('spray', 0, 1, 3.35, 0.2);
  val('spray', 1, 0, 5.2, 0.25);
  chapIn(2, 3.45);
  chapOut(2, 5.3);

  // 4 Vernik: yansıma netleşir, ışık bandı gövde boyunca kayar
  cam('p3', 5.45, 1.3);
  val('gloss', 0, 1, 5.9, 1.4);
  val('envRot', 0, Math.PI * 1.1, 5.6, 2.0);
  chapIn(3, 5.8);
  chapOut(3, 7.45);

  // 5 Seramik: su boncuklanır, sonra akıp gider
  cam('p4', 7.55, 0.95);
  val('beads', 0, 1, 7.95, 0.8);
  val('sheet', 0, 1, 8.95, 0.7, 'power1.in');
  chapIn(4, 7.95);
  chapOut(4, 9.55);

  // 6 Detay: jant, sonra far; PPF filmi önden sarar
  cam('p5a', 9.65, 0.8);
  val('film', 0, 1, 10.0, 1.0);
  cam('p5b', 10.65, 0.8);
  val('head', 0, 1, 10.95, 0.35);
  chapIn(5, 9.95);

  // Boya rengi ekranı doldurur
  tl.fromTo('.flood', { clipPath: 'circle(0% at 50% 45%)' }, { clipPath: 'circle(150% at 50% 45%)', duration: 0.7, ease: 'power2.in', immediateRender: false }, 11.5);
  tl.to({}, { duration: 0.15 });

  const marks = [0, 1.45, 3.25, 5.5, 7.6, 9.7];
  let last = -1;
  const gv = $('[data-gloss]');
  const gb = $('[data-gloss-bar]');
  const { once = 38, sonra = 94 } = d.parlaklik || {};

  ScrollTrigger.create({
    trigger: '.film',
    start: 'top top',
    end: 'bottom bottom',
    pin: '.film__pin',
    pinSpacing: false,
    scrub: 0.9,
    animation: tl,
    onUpdate: () => {
      const t = tl.time();
      let idx = 0;
      marks.forEach((m, i) => t >= m && (idx = i));
      if (idx !== last) {
        last = idx;
        rail.forEach((li, i) => {
          li.classList.toggle('is-on', i === idx);
          li.classList.toggle('is-done', i < idx);
        });
      }
      gv.textContent = Math.round(once + (sonra - once) * S.gloss);
      gb.style.transform = `scaleX(${(once + (sonra - once) * S.gloss) / 100})`;
    },
    onEnterBack: () => gsap.to(S, { spin: 0, duration: 0.6 }),
  });
}

// --- Film sonrası bölümler ------------------------------------------------------
function buildSections() {
  // Önce/sonra başlığı
  const proofT = splitTitle($('#proof-title'));
  gsap.fromTo(proofT.chars, { yPercent: 115 }, {
    yPercent: 0, stagger: 0.015, ease: 'power3.out',
    scrollTrigger: { trigger: '.proof', start: 'top 85%', end: 'top 35%', scrub: 0.6 },
  });

  // Hizmet satırları: yazı genişler ve aydınlanır, görsel perdeden açılır
  $$('.row').forEach((row) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', end: 'top 38%', scrub: 0.6 } });
    tl.fromTo($('.row__title', row), { fontVariationSettings: "'wdth' 75", color: '#5e666e' }, { fontVariationSettings: "'wdth' 100", color: '#e7eaed', ease: 'none' });
    const img = $('.row__img', row);
    if (img) {
      tl.fromTo(img, { clipPath: 'inset(0% 0% 100% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'power2.out' }, 0);
      tl.fromTo($('img', img), { scale: 1.25 }, { scale: 1, ease: 'none' }, 0);
    }
  });
  const svcT = splitTitle($('#svc-title'));
  gsap.fromTo(svcT.chars, { yPercent: 115 }, {
    yPercent: 0, stagger: 0.015, ease: 'power3.out',
    scrollTrigger: { trigger: '.svc', start: 'top 85%', end: 'top 40%', scrub: 0.6 },
  });

  // Hakkımızda: kelimeler okundukça yanar
  const about = new SplitText('.stats__about', { type: 'words', wordsClass: 'w' });
  gsap.to(about.words, {
    color: '#e7eaed', stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.stats__about', start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
  $$('.stat__num').forEach((el) => {
    const to = Number(el.dataset.to);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, {
        v: to, duration: 1.8, ease: 'expo.out',
        onUpdate: () => (el.textContent = fmt(Math.round(o.v)) + el.dataset.suffix),
      }),
    });
  });

  // Süreç: yatay kayan kartlar
  const track = $('[data-steps]');
  const steps = $$('.step', track);
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.steps', start: 'top top', end: () => `+=${dist() + innerHeight * 0.4}`, pin: '.steps__pin', scrub: 0.7,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        $('.steps__progress i').style.transform = `scaleX(${self.progress})`;
        const on = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
        steps.forEach((s, i) => s.classList.toggle('is-on', i <= on));
      },
    },
  });

  // Renk seçici: kamera yukarıdan süzülür, araba döner tablaya çıkar
  if (stage) {
    ScrollTrigger.create({
      trigger: '.picker', start: 'top 85%', end: 'bottom 15%',
      onToggle: (self) => {
        if (!self.isActive) return;
        gsap.killTweensOf(S, 'px,py,pz,tx,ty,tz');
        gsap.set(S, { tubes: 1, sweep: 1, gloss: 1, beads: 0, sheet: 0, film: 0, spray: 0, head: 0, swap: 1 });
        const from = self.direction > 0 ? POSES.pickFrom : POSES.fin;
        gsap.fromTo(S, { ...from }, { ...POSES.pick, duration: 1.8, ease: 'expo.out' });
        gsap.to(S, { spin: 1, duration: 1.5 });
      },
    });
    ScrollTrigger.create({
      trigger: '.finale', start: 'top 70%', end: 'bottom top',
      onToggle: (self) => {
        if (!self.isActive) return;
        gsap.killTweensOf(S, 'px,py,pz,tx,ty,tz');
        gsap.set(S, { tubes: 1, sweep: 1, gloss: 1, beads: 0, sheet: 0, film: 0, spray: 0, swap: 1 });
        gsap.fromTo(S, { ...POSES.pickFrom, px: 2.5, pz: -8 }, { ...POSES.fin, duration: 2, ease: 'expo.out' });
        gsap.to(S, { spin: 0.28, head: 1, duration: 1.4 });
      },
    });
  }
  const pickT = splitTitle($('.picker__title'));
  gsap.fromTo(pickT.chars, { yPercent: 115 }, {
    yPercent: 0, stagger: 0.012, ease: 'power3.out',
    scrollTrigger: { trigger: '.picker', start: 'top 20%', end: 'top -20%', scrub: 0.6 },
  });

  // Puan sayacı
  const sc = { v: 0 };
  ScrollTrigger.create({
    trigger: '.voices', start: 'top 75%', once: true,
    onEnter: () => gsap.to(sc, {
      v: d.puan.ortalama, duration: 1.6, ease: 'expo.out',
      onUpdate: () => ($('[data-score]').textContent = sc.v.toFixed(1).replace('.', ',')),
    }),
  });

  // Kayan şeritler: scroll hızına göre hızlanır
  const lenis = window.__lenis;
  const rows = [
    { el: $('[data-reviews]'), dir: -1, base: 40, x: 0 },
    { el: $('[data-brands]'), dir: 1, base: 60, x: 0 },
  ];
  let marqueeOn = false;
  ScrollTrigger.create({ trigger: '.voices', start: 'top bottom', end: 'bottom top', onToggle: (s) => (marqueeOn = s.isActive) });
  gsap.ticker.add((_, dt) => {
    if (!marqueeOn) return;
    const v = Math.min(Math.abs(lenis?.velocity ?? 0), 60);
    for (const r of rows) {
      const half = r.el.scrollWidth / 2;
      r.x += r.dir * (r.base + v * 18) * (dt / 1000);
      if (r.dir < 0 && r.x <= -half) r.x += half;
      if (r.dir > 0 && r.x >= 0) r.x -= half;
      if (r.dir > 0 && r.x === 0) r.x = -half;
      gsap.set(r.el, { x: r.x, skewX: -r.dir * v * 0.12 });
    }
  });
  rows[1].x = -rows[1].el.scrollWidth / 2;

  // Final başlığı
  const finT = splitTitle($('.finale__title'));
  gsap.fromTo(finT.chars, { yPercent: 115, rotate: 4 }, {
    yPercent: 0, rotate: 0, stagger: 0.012, ease: 'power3.out',
    scrollTrigger: { trigger: '.finale', start: 'top 55%', end: 'top 0%', scrub: 0.6 },
  });

  // Harita yaklaşınca yüklenir
  ScrollTrigger.create({
    trigger: '.finale', start: 'top 180%', once: true,
    onEnter: () => ($('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`),
  });

  initMagnetic();
}

// --- Önce / sonra sürüklenebilir ------------------------------------------------
function initBeforeAfter() {
  $$('[data-ba]').forEach((frame) => {
    const set = (pct) => frame.style.setProperty('--x', `${Math.max(0, Math.min(100, pct))}%`);
    let dragging = false;
    let userMoved = false;
    const fromEvent = (e) => {
      const r = frame.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };
    frame.addEventListener('pointerdown', (e) => {
      dragging = true;
      userMoved = true;
      st?.kill();
      frame.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    frame.addEventListener('pointermove', (e) => dragging && fromEvent(e));
    frame.addEventListener('pointerup', () => (dragging = false));
    frame.addEventListener('pointercancel', () => (dragging = false));
    // Kaydırırken çizgi kendiliğinden geçer, dokununca kontrol kullanıcıya geçer
    let st = null;
    if (!reducedMotion) {
      const o = { x: 88 };
      set(88);
      st = gsap.to(o, {
        x: 18, ease: 'none',
        onUpdate: () => !userMoved && set(o.x),
        scrollTrigger: { trigger: frame, start: 'top 85%', end: 'bottom 45%', scrub: 0.8 },
      }).scrollTrigger;
    }
  });
}

// --- İmleç ve mıknatıslı butonlar ----------------------------------------------
function initCursor() {
  if (!finePointer) return;
  const c = $('.cursor');
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    const t = e.target;
    c.classList.toggle('is-link', !!t.closest?.('a, button'));
    c.classList.toggle('is-drag', !!t.closest?.('[data-ba]'));
  });
}
function initMagnetic() {
  if (!finePointer) return;
  $$('.magnetic').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.28);
      yTo((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}
