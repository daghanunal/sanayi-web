import raw from '../../data/showroom.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, setStoryMode, autoHideHeader,
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
const TR_CHARS = 'ABCÇDEFGĞHIİKLMNOÖPRSŞTUÜVYZ';

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
const hakkinda = d.isletme.hakkinda.replace(/^\d{4}'[a-zçğıöşü]+/i, ablative(d.isletme.kurulus));
const binds = {
  ad: d.isletme.ad,
  slogan: d.isletme.slogan,
  hakkinda,
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
$('.top__brand').classList.toggle('is-long', d.isletme.ad.length > 24);

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
  return `<li><span class="stat__num" data-to="${v}" data-suffix="${esc(s.sonek || '')}">${fmt(v)}${esc(s.sonek || '')}</span><span class="stat__lbl">${esc(s.etiket)}</span></li>`;
}).join('');

$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <article class="step">
    <span class="step__n">${i + 1}</span>
    <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
  </article>`).join('');

const stars = (n) => Array.from({ length: 5 }, (_, i) => (i < Math.round(n) ? icons.star : '')).join('');
$('[data-stars]').innerHTML = stars(d.puan.ortalama);
$('[data-score]').textContent = d.puan.ortalama.toFixed(1).replace('.', ',');
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
  return `<dt class="${isToday ? 'is-today' : ''}">${esc(gun)}</dt><dd>${esc(saat)}</dd>`;
}).join('');
function dayInRange(label) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const [a, b] = label.split(' – ').map((g) => order.indexOf(GUNLER.indexOf(g)));
  const t = order.indexOf(new Date().getDay());
  return t >= a && t <= b;
}

// Harita yaklaşınca yüklenir
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '900px 0px' }).observe($('[data-map]'));

// --- Renk seçici ------------------------------------------------------------
$('[data-swatches]').innerHTML = BOYALAR.map((b, i) => `
  <button type="button" class="sw" role="radio" aria-checked="${i === 0}" data-i="${i}" style="--c:${b.hex}">
    <i></i>${esc(b.ad)}
  </button>`).join('');

function applyPaintUi(b) {
  const root = document.documentElement.style;
  root.setProperty('--paint', b.ui);
  root.setProperty('--paint-deep', b.hex);
  root.setProperty('--on-paint', lum(b.ui) > 0.45 ? '#0b0b0c' : '#ffffff');
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
  stage = createScene(canvas, { reduced: reducedMotion });
  stage.setPaint(boya.hex, { instant: true });
} catch (err) {
  console.warn('WebGL yok, fotoğrafla devam', err);
  $('.stage').style.background = `center / cover no-repeat url(${import.meta.env.BASE_URL}img/showroom/hero.jpg)`;
}
const S = stage?.state ?? {};
if (/[?&]debug\b/.test(location.search)) window.__v = { S, ScrollTrigger, gsap, stage, vis: () => visibleCanvas };

// Yükleme: sayfa hemen kullanılabilir; sahne akarken küçük bir gösterge
const loaderEl = $('[data-loader]');
const loadBar = $('[data-load-bar]');
const loadPct = $('[data-load-pct]');
let loaded = !stage;
const loadP = stage
  ? stage.load((p) => {
      loadBar.style.transform = `scaleX(${p.toFixed(3)})`;
      loadPct.textContent = Math.round(p * 100);
    }).then(() => {
      loaded = true;
      loaderEl.classList.add('is-done');
    }).catch((e) => {
      console.error(e);
      loaded = true;
      loaderEl.classList.add('is-done');
    })
  : Promise.resolve();
if (!stage) loaderEl.classList.add('is-done');

let paintTl = null;
// Film dışındaki sahne hareketleri (seçici, final): film zaman çizelgesine dokunmadan öldürülebilsin
const own = new Set();
const ownTween = (t) => {
  own.add(t);
  t.eventCallback('onComplete', () => own.delete(t));
  return t;
};
const killOwn = () => {
  own.forEach((t) => t.kill());
  own.clear();
};
$('[data-swatches]').addEventListener('click', (e) => {
  const btn = e.target.closest('.sw');
  if (!btn) return;
  const b = BOYALAR[btn.dataset.i];
  if (b === boya) return;
  boya = b;
  applyPaintUi(b);
  gsap.to('.chip [data-paint-name]', { duration: 0.8, scrambleText: { text: b.ad, chars: TR_CHARS, speed: 0.6 } });
  if (!stage) return;
  stage.setPaint(b.hex);
  // killTweensOf(S) film zaman çizelgesinin içindeki tween'leri de öldürür; yalnız kendi tween'imizi durdur
  paintTl?.kill();
  paintTl = gsap.timeline()
    .fromTo(S, { swap: 0 }, { swap: 1, duration: reducedMotion ? 0.01 : 1.5, ease: 'power1.inOut' }, 0);
  if (reducedMotion) paintTl.eventCallback('onComplete', () => stage.renderOnce());
  else paintTl.to(S, { spray: 1, duration: 0.2 }, 0).to(S, { spray: 0, duration: 0.35 }, 1.2);
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

// --- Kamera pozları (dünya uzayı: aracın önü -Z, sol yanı -X) -----------------
const POSES = {
  p0: { px: -4.5, py: 1.3, pz: -5.5, tx: 0, ty: 0.55, tz: -0.1, fitK: 0.82 },
  p1: { px: -6.6, py: 1.45, pz: -0.4, tx: 0, ty: 0.6, tz: 0, fitK: 1 },
  p2: { px: -5.2, py: 2.0, pz: 4.6, tx: 0, ty: 0.55, tz: 0.2, fitK: 1 },
  p2b: { px: 1.2, py: 2.6, pz: 7.0, tx: 0, ty: 0.55, tz: 0, fitK: 1 },
  p3: { px: 6.9, py: 3.1, pz: 1.9, tx: -0.15, ty: 0.55, tz: 0, fitK: 1 }, // masaüstünde sağ kenardan taşmasın
  p4: { px: 0.9, py: 3.8, pz: -4.0, tx: 0, ty: 0.85, tz: -1.1, fitK: 0.5 },
  p5a: { px: -2.9, py: 0.55, pz: -2.9, tx: -0.8, ty: 0.42, tz: -1.3, fitK: 0.5 },
  p5b: { px: -2.1, py: 1.0, pz: -4.4, tx: -0.5, ty: 0.72, tz: -1.9, fitK: 0.5 },
  pick: { px: -4.9, py: 1.5, pz: -5.0, tx: 0, ty: 0.55, tz: 0, fitK: 1 },
  pickFrom: { px: -1.5, py: 6.5, pz: -6.5, tx: 0, ty: 0.4, tz: 0, fitK: 1 },
  fin: { px: 0.2, py: 0.85, pz: -6.6, tx: 0, ty: 0.68, tz: 0, fitK: 1 },
};
// Dikey ekranda araba metnin üstündeki banda sığdırılır (sahne kutuya göre uzaklığı hesaplar)
for (const [k, v] of Object.entries(POSES)) {
  const close = ['p4', 'p5a', 'p5b'].includes(k);
  Object.assign(v, { fitCar: close ? 0 : 1, rTop: 0.12, rBot: 0.58 }); // bant ortası ≈ metin kartının üstündeki boşluğun ortası
}
Object.assign(POSES.p0, { rTop: 0.1, rBot: 0.36 });
Object.assign(POSES.pick, { rTop: 0.08, rBot: 0.3 });
Object.assign(POSES.pickFrom, { rTop: 0.08, rBot: 0.3 });
Object.assign(POSES.fin, { rTop: 0.1, rBot: 0.4 });
if (mobile) {
  // Önden 3/4 açı dikey ekranda daha iyi okunur
  Object.assign(POSES.p0, { px: -2.8, py: 1.5, pz: -6.3 });
}
Object.assign(S, POSES.p0);

// --- Açılış: ~1 sn perde; model beklenmez (sahne kendi göstergesiyle yüklenir) ---
function runIntro() {
  const lenis = initSmoothScroll({ lerp: 0.085 });
  lenis?.stop();
  scrollTo(0, 0);

  const intro = $('[data-intro]');
  const name = new SplitText('.intro__name', { type: 'chars', charsClass: 'ch' });
  gsap.set(name.chars, { opacity: 0, y: 30 });
  gsap.set('.intro__name', { fontVariationSettings: "'wdth' 75" });
  // Satır bölme font yüklendikten sonra (yoksa satırlar kayar); en fazla 0,8 sn beklenir
  Promise.race([document.fonts.load("700 60px 'Bricolage Grotesque'").then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 800))])
    .then(visibleCanvasInit);

  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    intro.style.pointerEvents = 'none';
    document.body.classList.remove('is-loading');
    lenis?.start();
  };
  const tl = gsap.timeline({
    onComplete: () => {
      unlock();
      intro.remove();
      ScrollTrigger.refresh();
    },
  });
  tl.to(name.chars, { opacity: 1, y: 0, stagger: 0.02, duration: 0.5, ease: 'power3.out' }, 0)
    .to('.intro__name', { fontVariationSettings: "'wdth' 100", duration: 0.9, ease: 'power2.inOut' }, 0)
    .to('.intro__tube i', { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.05)
    .to('.intro__tube i', { keyframes: [{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }], duration: 0.22, ease: 'none' }, 0.72)
    .to('.intro__core', { opacity: 0, duration: 0.2 }, 0.92)
    .add(unlock, 0.95)
    .to('.intro__half--top', { yPercent: -101, duration: 0.8, ease: 'expo.inOut' }, 0.95)
    .to('.intro__half--bottom', { yPercent: 101, duration: 0.8, ease: 'expo.inOut' }, 0.95)
    .add(() => (loaded ? lightUp() : loadP.then(lightUp)), 1.0)
    .add(heroIn, 1.2);
  // Dokunma, tekerlek, tuş: perde hemen kalkar
  const skip = () => tl.progress() < 0.98 && tl.progress(1);
  intro.addEventListener('pointerdown', skip);
  addEventListener('keydown', skip, { once: true });
  addEventListener('wheel', skip, { once: true, passive: true });
  addEventListener('touchstart', skip, { once: true, passive: true });
}

let lit = false;
function lightUp() {
  if (!stage || lit) return;
  lit = true;
  // Kabin ışıkları floresan gibi titreyerek yanar, gündüz farı bir kez parlar
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
  const filmST = buildFilm();
  buildSections();
  initBeforeAfter();
  initCursor();
  initHeader(filmST);
  // Tetikleyiciler sayfa sırasına dizilir: süreç pini, önce oluşturulan seçici/final tuval bölümlerini aşağı iter
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
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
    yPercent: 0, rotate: 0, duration: 1.0, stagger: 0.02, ease: 'expo.out',
  });
  gsap.fromTo(
    ['.chap__kicker', '.chap__lead', '.chap__actions > *', '.status'].map((s) => hero.querySelectorAll(s)),
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', delay: 0.25, clearProps: 'opacity,transform' }
  );
}

// --- FİLM: tek zaman çizelgesi, birimi "ekran" (1 = bir ekran boyu kaydırma) ------
function buildFilm() {
  const film = $('.film');
  const scenes = $$('[data-scene]');
  const chaps = $$('[data-chap]');
  const rail = $$('.rail li');
  const top = $('.top');
  const vh = innerHeight;
  const fTop = film.getBoundingClientRect().top;
  const S0 = scenes.map((s) => (s.getBoundingClientRect().top - fTop) / vh); // sahnenin pinlendiği an
  const P = scenes.map((s) => s.offsetHeight / vh - 1); // pin uzunluğu (≤ 3 ekran)
  const total = (film.offsetHeight - vh) / vh;

  const splits = chaps.map((c) => ({
    el: c,
    title: splitTitle($('.chap__title', c)),
    text: splitLines($('.chap__text', c)),
    extra: $$('.chap__n, .chip, .gauge', c),
  }));

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  let pose = { ...POSES.p0 };
  const cam = (to, at, dur, ease = 'power2.inOut') => {
    tl.fromTo(S, { ...pose }, { ...POSES[to], duration: dur, ease, immediateRender: false }, at);
    pose = { ...POSES[to] };
  };
  const val = (key, from, to, at, dur, ease = 'none') =>
    tl.fromTo(S, { [key]: from }, { [key]: to, duration: dur, ease, immediateRender: false }, at);
  // Kart görünmezken visibility: hidden (dokunmayı yutmaz, denetimde katman sayılmaz)
  const chapIn = (i, at) => {
    const s = splits[i];
    tl.fromTo(s.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02, immediateRender: false }, at);
    tl.fromTo(s.title.chars, { yPercent: 115, rotate: 5 }, { yPercent: 0, rotate: 0, stagger: 0.008, duration: 0.3, ease: 'power3.out', immediateRender: false }, at);
    tl.fromTo(s.text.lines, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.04, duration: 0.25, ease: 'power3.out', immediateRender: false }, at + 0.1);
    if (s.extra.length) tl.fromTo(s.extra, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.22, immediateRender: false }, at + 0.05);
  };
  const chapOut = (i, at) => {
    const s = splits[i];
    tl.fromTo(s.title.chars, { yPercent: 0 }, { yPercent: -115, stagger: 0.005, duration: 0.22, ease: 'power2.in', immediateRender: false }, at);
    tl.fromTo([...s.text.lines, ...s.extra], { opacity: 1 }, { opacity: 0, duration: 0.16, immediateRender: false }, at);
    tl.fromTo(s.el, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.02, immediateRender: false }, at + 0.24);
  };
  splits.forEach((s) => {
    gsap.set(s.el, { autoAlpha: 0 });
    gsap.set(s.title.chars, { yPercent: 115 });
    gsap.set(s.text.lines, { yPercent: 105, opacity: 0 });
  });

  const [a, b, c] = S0;
  const [P0, P1, P2] = P;

  // 1 Kabin (hero akışta kayar, yazı söner) → yan profil
  cam('p1', 0.05, a - 0.05);
  tl.fromTo('.chap--hero', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: a * 0.4, ease: 'power1.in', immediateRender: false }, a * 0.12);
  tl.fromTo('.hero__hint', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.15, immediateRender: false }, 0.02);

  // 2 Astar
  chapIn(0, a + 0.04);
  chapOut(0, a + P0 * 0.42);
  // 3 Boya: kapı açılır, tabanca önden arkaya süpürür (kapı içi dahil)
  cam('p2', a + P0 * 0.4, P0 * 0.32);
  val('door', 0, 1, a + P0 * 0.44, P0 * 0.16, 'power2.inOut');
  val('spray', 0, 1, a + P0 * 0.5, 0.08);
  val('sweep', 0, 1, a + P0 * 0.52, P0 * 0.42);
  val('spray', 1, 0, a + P0 * 0.94, 0.08);
  chapIn(1, a + P0 * 0.54);
  chapOut(1, a + P0 - 0.26);
  val('door', 1, 0, a + P0 - 0.2, 0.7, 'power2.inOut');

  // Geçiş → 4 Vernik: yansıma netleşir, ışık bandı gövde boyunca kayar
  const tr1 = b - (a + P0);
  cam('p2b', a + P0 - 0.1, tr1 * 0.5 + 0.1, 'sine.in');
  cam('p3', a + P0 + tr1 * 0.5, tr1 * 0.5 + P1 * 0.1, 'sine.out');
  val('envRot', 0, Math.PI * 1.1, a + P0 + 0.4, P1 * 0.6);
  val('gloss', 0, 1, b, P1 * 0.42);
  chapIn(2, b + 0.04);
  chapOut(2, b + P1 * 0.44);

  // 5 Seramik: su boncuklanır, sonra akıp gider
  cam('p4', b + P1 * 0.44, P1 * 0.2);
  val('beads', 0, 1, b + P1 * 0.56, P1 * 0.22);
  val('sheet', 0, 1, b + P1 * 0.8, P1 * 0.2 - 0.02, 'power1.in');
  chapIn(3, b + P1 * 0.54);
  chapOut(3, b + P1 - 0.26);

  // Geçiş → 6 Film: jant, sonra far; PPF önden sarar
  cam('p5a', b + P1, c - (b + P1) + 0.05);
  val('beads', 1, 0, b + P1, 0.3);
  val('film', 0, 1, c, P2 * 0.5);
  cam('p5b', c + P2 * 0.36, P2 * 0.3);
  val('head', 0, 1, c + P2 * 0.56, P2 * 0.14);
  chapIn(4, c + 0.04);
  chapOut(4, c + P2 * 0.72);

  // Boya rengi ekranı doldurur
  tl.fromTo('.flood', { clipPath: 'circle(0% at 50% 45%)' }, { clipPath: 'circle(150% at 50% 45%)', duration: P2 * 0.24, ease: 'power2.in', immediateRender: false }, c + P2 * 0.76);
  if (tl.duration() < total) tl.to({}, { duration: total - tl.duration() });

  const marks = [0, a - 0.1, a + P0 * 0.48, b - 0.3, b + P1 * 0.48, c - 0.3];
  let last = -1;
  const gv = $('[data-gloss]');
  const gb = $('[data-gloss-bar]');
  const { once = 38, sonra = 94 } = d.parlaklik || {};

  // Bir kez uçtan uca çal: her fromTo'nun "geri sarınca dönülecek" değerleri film sırasıyla kaydedilsin
  // (yoksa ilk oynatma sırasında final/seçicinin yazdığı değerler kaydedilir ve geri dönüşte kamera kayar)
  tl.progress(1, true).progress(0, true);
  if (window.__v) window.__v.tl = tl;
  const st = ScrollTrigger.create({
    trigger: film,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.9,
    animation: tl,
    onUpdate: (self) => {
      const t = self.progress * total;
      let idx = 0;
      marks.forEach((m, i) => t >= m && (idx = i));
      if (idx !== last) {
        last = idx;
        rail.forEach((li, i) => {
          li.classList.toggle('is-on', i === idx);
          li.classList.toggle('is-done', i < idx);
        });
      }
      top.classList.toggle('is-film', self.isActive && t > a * 0.55 && t < total - P2 * 0.2);
      const g = once + (sonra - once) * S.gloss;
      gv.textContent = Math.round(g);
      gb.style.transform = `scaleX(${g / 100})`;
    },
    onLeave: () => top.classList.remove('is-film'),
    onLeaveBack: () => top.classList.remove('is-film'),
    onEnterBack: (self) => {
      // Dışarıdan (seçici/final) değişen değerleri zaman çizelgesi yeniden yazsın: tamamlanmış tween'ler kendiliğinden yazmaz
      const p = tl.progress();
      tl.progress(0, true).progress(p, true);
      killOwn();
      ownTween(gsap.to(S, { spin: 0, steer: 0, drive: 0, duration: 0.6 }));
    },
  });

  // Hikâye modu: hero çıktıktan sonra film boyunca alt çubuk saklanır; kart çubuğun yerine iner
  ScrollTrigger.create({
    trigger: film,
    start: () => `top+=${Math.round(innerHeight * (a - 0.35))} top`,
    end: () => `bottom-=${Math.round(innerHeight * 0.1)} bottom`,
    onToggle: (self) => setStoryMode(self.isActive ? true : null),
  });
  return st;
}

// --- Başlık: filmde ray gösterir; filmden sonra katılaşır ve aşağı kaydırırken saklanır ---
function initHeader(filmST) {
  const top = $('.top');
  let stopHide = null;
  const after = (on) => {
    top.classList.toggle('is-solid', on);
    if (on && !stopHide) stopHide = autoHideHeader(top, { offset: 80 });
    if (!on && stopHide) {
      stopHide();
      stopHide = null;
    }
  };
  if (!filmST) return after(true);
  ScrollTrigger.create({
    trigger: '.proof', start: 'top 72px',
    onEnter: () => after(true),
    onLeaveBack: () => after(false),
  });
}

// --- Film sonrası bölümler ------------------------------------------------------
function buildSections() {
  const proofT = splitTitle($('#proof-title'));
  gsap.fromTo(proofT.chars, { yPercent: 115 }, {
    yPercent: 0, stagger: 0.015, ease: 'power3.out',
    scrollTrigger: { trigger: '.proof', start: 'top 85%', end: 'top 35%', scrub: 0.6 },
  });

  // Hizmet satırları: yazı genişler ve aydınlanır, görsel perdeden açılır
  $$('.row').forEach((row) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 88%', end: 'top 38%', scrub: 0.6 } });
    tl.fromTo($('.row__title', row), { fontVariationSettings: "'wdth' 75", color: '#6b737b' }, { fontVariationSettings: "'wdth' 100", color: '#e7eaed', ease: 'none' });
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
    el.textContent = '0' + el.dataset.suffix;
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

  // Renk seçici: kamera yukarıdan süzülür, araba döner tablaya çıkar, ön tekerlekler kırılır
  if (stage) {
    ScrollTrigger.create({
      trigger: '.picker', start: 'top 85%', end: 'bottom 15%',
      onToggle: (self) => {
        if (!self.isActive) return;
        killOwn();
        gsap.set(S, { tubes: 1, sweep: 1, gloss: 1, beads: 0, sheet: 0, film: 0, spray: 0, head: 0, door: 0, drive: 0, swap: 1 });
        const from = self.direction > 0 ? POSES.pickFrom : POSES.fin;
        ownTween(gsap.fromTo(S, { ...from }, { ...POSES.pick, duration: 1.8, ease: 'expo.out' }));
        ownTween(gsap.to(S, { spin: 1, steer: 0.34, duration: 1.5 }));
      },
    });
    // Final: araç farları yanık, kabinin derinliğinden kameraya doğru yuvarlanarak gelir
    ScrollTrigger.create({
      trigger: '.finale', start: 'top 70%', end: 'bottom top',
      onToggle: (self) => {
        if (!self.isActive) return;
        killOwn();
        gsap.set(S, { tubes: 1, sweep: 1, gloss: 1, beads: 0, sheet: 0, film: 0, spray: 0, door: 0, swap: 1, spin: 0 });
        ownTween(gsap.fromTo(S, { ...POSES.fin, px: 1.6, py: 1.2, pz: -8.2 }, { ...POSES.fin, duration: 2.4, ease: 'expo.out' }));
        if (self.direction > 0) {
          ownTween(gsap.fromTo(S, { drive: -7.5, steer: 0.12 }, { drive: 0, steer: 0, duration: 2.6, ease: 'power3.out' }));
        } else ownTween(gsap.to(S, { drive: 0, steer: 0, duration: 0.8 }));
        ownTween(gsap.to(S, { head: 1, duration: 0.8 }));
      },
    });
  }
  const pickT = splitTitle($('.picker__title'));
  gsap.fromTo(pickT.chars, { yPercent: 115 }, {
    yPercent: 0, stagger: 0.012, ease: 'power3.out',
    scrollTrigger: { trigger: '.picker', start: 'top 60%', end: 'top 10%', scrub: 0.6 },
  });

  // Puan sayacı
  const sc = { v: 0 };
  ScrollTrigger.create({
    trigger: '.voices', start: 'top 75%', once: true,
    onEnter: () => gsap.fromTo(sc, { v: 0 }, {
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

  initMagnetic();
}

// --- Önce / sonra sürüklenebilir ------------------------------------------------
function initBeforeAfter() {
  $$('[data-ba]').forEach((frame) => {
    const set = (pct) => frame.style.setProperty('--x', `${Math.max(0, Math.min(100, pct))}%`);
    let dragging = false;
    let userMoved = false;
    let st = null;
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
    if (!c.classList.contains('is-on')) gsap.set(c, { x: e.clientX, y: e.clientY });
    c.classList.add('is-on');
    c.classList.remove('is-out');
    xTo(e.clientX);
    yTo(e.clientY);
    const t = e.target;
    c.classList.toggle('is-link', !!t.closest?.('a, button'));
    c.classList.toggle('is-drag', !!t.closest?.('[data-ba]'));
  });
  document.documentElement.addEventListener('pointerleave', () => c.classList.add('is-out'));
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

// --- Hareket azaltma: sabit ama güzel ----------------------------------------
function start() {
if (reducedMotion) {
  document.body.classList.remove('is-loading');
  $('[data-intro]').remove();
  $$('[data-canvas]').forEach(canvasSection);
  if (stage) {
    Object.assign(S, POSES.p0, { tubes: 1, sweep: 1, gloss: 1, swap: 1, head: 0.6 });
    loadP.then(() => stage.renderOnce());
    addEventListener('resize', () => loaded && stage.renderOnce());
  }
  initBeforeAfter();
  initHeader(null);
} else {
  runIntro();
}
}
start();
