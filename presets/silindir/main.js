import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { createEngine, stopForService, STOPS } from './engine.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const years = new Date().getFullYear() - d.isletme.kurulus;
const fine = matchMedia('(pointer: fine)').matches;
const TR_CHARS = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789';
const clamp = gsap.utils.clamp;

// Yıl ekleri: 1996'dan, 2004'ten, 1990'dan, 2000'den (sayının okunuşuna göre)
const ablative = (y) => {
  const str = String(y);
  const ones = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const tens = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (str.at(-1) !== '0') return ones[str.at(-1)];
  if (str.at(-2) !== '0') return tens[str.at(-2)];
  return "'den"; // yüz, bin
};
const locative = (y) => ablative(y).slice(0, -1);

// --- İçerik ---------------------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi, ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$$('[data-years]').forEach((el) => (el.textContent = years));
$('[data-hakkinda]').textContent = d.isletme.hakkinda.replace(/^\d{4}'[a-zçğıöşü]+\s/i, `${d.isletme.kurulus}${locative(d.isletme.kurulus)} `);
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-plain]').forEach((a) => {
  a.href = telHref(d);
  a.textContent = d.iletisim.telefon;
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(a.textContent)}</span>`;
});
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = `${icons.whatsapp}<span>${esc(a.textContent)}</span>`;
});
$('[data-maps]').innerHTML = `${icons.pin}<span>Yol tarifi al</span>`;
$('[data-maps]').href = mapsHref(d);

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="hours__row"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`)
  .join('');

// Parça turu: her hizmet motorun bir parçasına bağlanır.
const stopKeys = d.hizmetler.map((h) => stopForService(h.baslik));
$('[data-stops]').innerHTML = d.hizmetler
  .map(
    (h, i) => `<div class="stop">
      <article class="tag">
        <span class="tag__hole" aria-hidden="true"></span>
        <p class="tag__part">${esc(STOPS[stopKeys[i]].label)}</p>
        <h3 class="tag__t" data-scramble>${esc(h.baslik)}</h3>
        <p class="tag__d">${esc(h.aciklama)}</p>
        <p class="tag__time">Ortalama süre: <strong>${esc(h.sure)}</strong></p>
        <div class="tag__rail" aria-hidden="true">${d.hizmetler.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      </article>
    </div>`
  )
  .join('');

// Dört zaman = dört adım
const STROKES = [
  { ad: 'Emme', cls: 'intake' },
  { ad: 'Sıkıştırma', cls: 'compress' },
  { ad: 'Ateşleme', cls: 'ignite' },
  { ad: 'Egzoz', cls: 'exhaust' },
];
$('[data-strokes]').innerHTML = STROKES.map((s, i) => {
  const step = d.surec[i] || { baslik: '', aciklama: '' };
  return `<li class="stroke stroke--${s.cls}">
      <p class="stroke__word" aria-hidden="true">${s.ad}</p>
      <div class="stroke__body">
        <p class="stroke__n">${i + 1}. zaman</p>
        <h3 class="stroke__t">${esc(step.baslik)}</h3>
        <p class="stroke__d">${esc(step.aciklama)}</p>
      </div>
    </li>`;
}).join('');

$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const val = i === 0 && /yıl/.test(s.etiket) ? years : s.deger;
    return `<div class="stat"><dt>${esc(s.etiket)}</dt><dd><span data-count="${val}">${nf.format(val)}</span>${esc(s.sonek)}</dd></div>`;
  })
  .join('');

// Yorumlar
$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = Array.from({ length: 5 }, () => icons.star).join('');
$('[data-score-meta]').textContent = `${nf.format(d.puan.adet)} Google yorumu`;
$('[data-quotes]').innerHTML = d.yorumlar
  .map(
    (y, i) => `<figure class="quote${i === 0 ? ' is-on' : ''}">
      <blockquote class="quote__t">${esc(y.metin)}</blockquote>
      <figcaption class="quote__who"><strong>${esc(y.ad)}</strong> <span>${esc(y.arac)}</span>
        <span class="quote__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</span></figcaption>
    </figure>`
  )
  .join('');
$('[data-quote-dots]').innerHTML = d.yorumlar.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('');

const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$$('[data-brands]').forEach((t) => (t.innerHTML = brandRow + brandRow));

// Harita yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries[0].isIntersecting) return;
    mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '800px 0px' }
).observe(mapBox);

// Devir saati çentikleri
{
  const g = $('.tach__ticks');
  let html = '';
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const x1 = 100 + Math.cos(a) * 80;
    const y1 = 110 + Math.sin(a) * 80;
    const x2 = 100 + Math.cos(a) * 68;
    const y2 = 110 + Math.sin(a) * 68;
    const tx = 100 + Math.cos(a) * 56;
    const ty = 110 + Math.sin(a) * 56 + 4;
    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text x="${tx}" y="${ty}">${i}</text>`;
  }
  g.innerHTML = html;
}

// --- Motor ----------------------------------------------------------------

const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const fontsReady = Promise.race([
  document.fonts.load("900 100px 'Anybody'").then(() => document.fonts.ready),
  new Promise((r) => setTimeout(r, 1400)),
]);

fontsReady.then(init);

function init() {
const engine = createEngine($('.stage'), { name: d.isletme.ad, low, reducedMotion });
const S = engine.state;
engine.setStops(stopKeys);

const rpmEl = $('[data-rpm]');
const needle = $('.tach__needle');
const callout = $('.callout');
const cLine = $('.callout__line line');
const cDot = $('.callout__dot');
const cLabel = $('.callout__label');
let lastStop = -1;
engine.onFrame((p, rpm) => {
  // Devir saati: 0..8000 → -90°..90°
  const deg = -90 + (Math.min(8000, rpm) / 8000) * 180;
  needle.setAttribute('transform', `rotate(${deg.toFixed(1)} 100 110)`);
  rpmEl.textContent = nf.format(Math.round(rpm / 10) * 10);
  // Parça etiketi
  callout.style.opacity = p.alpha.toFixed(3);
  if (p.alpha > 0.01) {
    if (p.stop !== lastStop) {
      lastStop = p.stop;
      cLabel.textContent = STOPS[stopKeys[p.stop]].label;
    }
    const w = innerWidth;
    const left = p.x > w * 0.55;
    const lw = cLabel.offsetWidth;
    let lx = p.x + (left ? -1 : 1) * Math.min(90, w * 0.16);
    lx = left ? Math.max(lw + 10, lx) : Math.min(w - lw - 10, lx);
    const ly = Math.max(70 + cLabel.offsetHeight, p.y - Math.min(90, innerHeight * 0.1));
    cDot.style.transform = `translate(${p.x}px, ${p.y}px)`;
    cLabel.style.transform = `translate(${left ? `calc(${lx}px - 100%)` : `${lx}px`}, calc(${ly}px - 100%))`;
    cLine.setAttribute('x1', p.x);
    cLine.setAttribute('y1', p.y);
    cLine.setAttribute('x2', lx);
    cLine.setAttribute('y2', ly);
  }
});

// --- Hareketsiz mod -------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('rm');
  $('.intro').remove();
  S.intro = 0;
  engine.renderOnce();
  addEventListener('resize', () => engine.renderOnce());
} else {
  runFilm();
}

function runFilm() {
  const lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (S.velocity = e.velocity));
  engine.compile();
  engine.start();

  // --- Yazı bölme ---
  const heroSplit = new SplitText('.hero__title', { type: 'words,chars', charsClass: 'ch', wordsClass: 'wd' });
  gsap.set(heroSplit.chars, { '--w': 150, yPercent: 110, opacity: 0 });
  gsap.set('.hero__kicker, .hero__slogan, .hero__actions, .hero__hint, .top', { opacity: 0, y: 20 });

  // --- Açılış ---
  const intro = $('.intro');
  const introName = $('.intro__name');
  const nameText = d.isletme.ad;
  introName.textContent = '';
  const tl = gsap.timeline({
    onComplete: () => {
      intro.remove();
      lenis?.start();
      ScrollTrigger.refresh();
    },
  });
  tl.to(introName, { duration: 0.9, scrambleText: { text: nameText, chars: TR_CHARS, speed: 0.6 }, ease: 'none' })
    .to('.intro__bar span', { scaleX: 1, duration: 1.1, ease: 'power2.inOut' }, 0)
    .to('.intro__core', { opacity: 0, scale: 0.96, duration: 0.3 }, 1.25)
    .to('.intro__half--top', { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, 1.3)
    .to('.intro__half--bottom', { yPercent: 100, duration: 0.8, ease: 'expo.inOut' }, 1.3)
    .fromTo(S, { intro: 1 }, { intro: 0, duration: 1.4, ease: 'expo.out' }, 1.35)
    .to(heroSplit.chars, { yPercent: 0, opacity: 1, '--w': 100, duration: 0.9, stagger: 0.025, ease: 'expo.out' }, 1.55)
    .to('.hero__kicker, .hero__slogan, .hero__actions, .top', { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 1.8)
    .to('.hero__hint', { opacity: 1, y: 0, duration: 0.6 }, 2.1);
  const skip = () => tl.progress() < 0.95 && tl.progress(1);
  intro.addEventListener('pointerdown', skip);
  addEventListener('keydown', skip, { once: true });

  // --- 1. Hero'dan çıkış ---
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .fromTo(S, { hero: 0 }, { hero: 1, ease: 'none' }, 0)
    .fromTo(heroSplit.chars, { '--w': 100, yPercent: 0 }, { '--w': 50, yPercent: -60, opacity: 0, stagger: 0.02, ease: 'power2.in' }, 0)
    .fromTo('.hero__kicker, .hero__slogan, .hero__actions', { y: 0 }, { y: -80, opacity: 0, stagger: 0.05, ease: 'power2.in' }, 0)
    .fromTo('.hero__hint', { opacity: 1 }, { opacity: 0, duration: 0.2 }, 0)
    .fromTo('.tach', { opacity: 1 }, { opacity: 0, duration: 0.4 }, 0.5);

  ScrollTrigger.create({
    trigger: '.hero', start: 'bottom 80px',
    onEnter: () => $('.top').classList.add('is-solid'),
    onLeaveBack: () => $('.top').classList.remove('is-solid'),
  });

  // --- 2. Patlatma ---
  gsap.fromTo(S, { explode: 0 }, {
    explode: 1, ease: 'none',
    scrollTrigger: { trigger: '.parts__intro', start: 'top 85%', end: 'bottom 35%', scrub: true },
  });
  // "Parça parça": harfler toplanır, sonra motorla birlikte dağılır
  const scatter = new SplitText('[data-scatter]', { type: 'words,chars', charsClass: 'sc', wordsClass: 'wd' });
  const rnd = gsap.utils.random;
  const vec = scatter.chars.map(() => ({ x: rnd(-160, 160), y: rnd(-120, 120), r: rnd(-70, 70) }));
  gsap.timeline({ scrollTrigger: { trigger: '.parts__intro', start: 'top bottom', end: 'bottom top', scrub: true } })
    .fromTo(scatter.chars,
      { x: (i) => vec[i].x * 1.6, y: (i) => vec[i].y * 1.6, rotation: (i) => vec[i].r, opacity: 0, '--w': 150 },
      { x: 0, y: 0, rotation: 0, opacity: 1, '--w': 100, ease: 'power3.out', duration: 0.45, stagger: { each: 0.004, from: 'random' } })
    .to(scatter.chars,
      { x: (i) => vec[i].x, y: (i) => vec[i].y - 80, rotation: (i) => vec[i].r, opacity: 0, '--w': 60, ease: 'power2.in', duration: 0.4, stagger: { each: 0.004, from: 'random' } }, 0.6)
    .fromTo('.parts__lead', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.2 }, 0.25)
    .to('.parts__lead', { opacity: 0, y: -40, duration: 0.2 }, 0.75);

  // --- Tur ---
  const n = stopKeys.length;
  gsap.fromTo(S, { tourIn: 0 }, {
    tourIn: 1, ease: 'none',
    scrollTrigger: { trigger: '.parts__stops', start: 'top bottom', end: 'top 40%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: '.parts__stops', start: 'top center', end: 'bottom center',
    onUpdate: (self) => (S.tour = clamp(0, n - 1, self.progress * n - 0.5)),
  });
  $$('.stop').forEach((stop) => {
    const t = $('.tag__t', stop);
    const text = t.textContent;
    const run = () => gsap.to(t, { duration: 0.8, scrambleText: { text, chars: TR_CHARS, speed: 0.5 }, overwrite: true });
    ScrollTrigger.create({ trigger: stop, start: 'top 75%', end: 'bottom 25%', onEnter: run, onEnterBack: run });
    gsap.fromTo($('.tag', stop), { rotation: -6, y: 60, opacity: 0 }, {
      rotation: 0, y: 0, opacity: 1, ease: 'back.out(1.6)', duration: 0.8,
      scrollTrigger: { trigger: stop, start: 'top 80%', toggleActions: 'play none none reverse' },
    });
    gsap.fromTo($('.tag', stop), { opacity: 1, xPercent: 0 }, {
      opacity: 0, xPercent: -30, rotation: -4, ease: 'power1.in', immediateRender: false,
      scrollTrigger: { trigger: stop, start: 'bottom 75%', end: 'bottom 45%', scrub: true },
    });
  });

  // --- 3. Dalış ve dört zaman ---
  gsap.fromTo(S, { dive: 0 }, {
    dive: 1, ease: 'none',
    scrollTrigger: { trigger: '.cycle__dive', start: 'top 90%', end: 'bottom bottom', scrub: true },
  });
  const cycleSplit = new SplitText('.cycle__title [data-split-lines]', { type: 'words', wordsClass: 'cw' });
  gsap.timeline({ scrollTrigger: { trigger: '.cycle__dive', start: 'top 70%', end: 'bottom 30%', scrub: true } })
    .fromTo(cycleSplit.words, { opacity: 0, yPercent: 60, '--w': 140 }, { opacity: 1, yPercent: 0, '--w': 100, stagger: 0.05, duration: 0.4 })
    .to(cycleSplit.words, { opacity: 0, scale: 1.4, filter: 'blur(8px)', stagger: 0.03, duration: 0.3 }, 0.7);
  ScrollTrigger.create({
    trigger: '.cycle__strokes', start: 'top 50%', end: 'bottom 50%',
    onUpdate: (self) => (S.stroke = self.progress * 4),
  });
  const words = $$('.stroke__word');
  // Emme: harfler aşağı akar
  const wIn = new SplitText(words[0], { type: 'chars', charsClass: 'sc' });
  gsap.fromTo(wIn.chars, { yPercent: -120, opacity: 0 }, {
    yPercent: 0, opacity: 1, stagger: 0.06, ease: 'none',
    scrollTrigger: { trigger: words[0].parentElement, start: 'top 80%', end: 'center 45%', scrub: true },
  });
  // Sıkıştırma: kelimenin kendisi sıkışır
  gsap.fromTo(words[1], { '--w': 150, scaleY: 1 }, {
    '--w': 50, scaleY: 0.72, ease: 'none',
    scrollTrigger: { trigger: words[1].parentElement, start: 'top 70%', end: 'bottom 40%', scrub: true },
  });
  // Ateşleme: parlama
  gsap.fromTo(words[2], { '--glow': 0, '--w': 90 }, {
    '--glow': 1, '--w': 130, ease: 'expo.out',
    scrollTrigger: { trigger: words[2].parentElement, start: 'top 55%', end: 'center 40%', scrub: true },
  });
  // Egzoz: dağılıp yükselir
  gsap.fromTo(words[3], { filter: 'blur(0px)', y: 0, opacity: 1 }, {
    filter: 'blur(14px)', y: -140, opacity: 0.1, ease: 'power1.in',
    scrollTrigger: { trigger: words[3].parentElement, start: 'center 60%', end: 'bottom top', scrub: true },
  });
  $$('.stroke__body').forEach((b) => {
    gsap.fromTo(b, { opacity: 0, y: 50 }, {
      opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: b, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });

  // --- 4. Kepenk ---
  const counters = $$('[data-count]');
  gsap.set('.shutter', { yPercent: -100 });
  const shutterTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.shutter-sec', start: 'top top', end: '+=260%', pin: true, scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        S.re = p >= 0.2;
        S.covered = p > 0.24 && p < 0.76;
      },
    },
  });
  shutterTl
    .fromTo('.shutter', { yPercent: -100 }, { yPercent: 0, ease: 'bounce.out', duration: 0.2 })
    .fromTo('.plate', { rotation: -8, y: -60, opacity: 0 }, { rotation: -1.5, y: 0, opacity: 1, duration: 0.1, ease: 'back.out(2)' }, 0.2)
    .fromTo(counters, { '--w': 50 }, { '--w': innerWidth < 900 ? 100 : 112, duration: 0.3, stagger: 0.03, ease: 'expo.out' }, 0.26)
    .to({}, { duration: 0.25 })
    .to('.shutter', { yPercent: -100, ease: 'power2.in', duration: 0.22 }, 0.78);
  counters.forEach((el, i) => {
    const val = Number(el.dataset.count);
    const obj = { v: 0 };
    shutterTl.fromTo(obj, { v: 0 }, {
      v: val, duration: 0.3, ease: 'power2.out',
      onUpdate: () => (el.textContent = nf.format(Math.round(obj.v))),
    }, 0.24 + i * 0.03);
  });

  // --- 5. Yorumlar (motor arka planda) ---
  gsap.fromTo(S, { dim: 0 }, {
    dim: 1, ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top 60%', end: 'top top', scrub: true },
  });
  const quotes = $$('.quote');
  const dots = $$('[data-quote-dots] i');
  const qSplits = quotes.map((q) => new SplitText($('.quote__t', q), { type: 'words', wordsClass: 'qw' }));
  let qi = 0;
  const showQuote = (i) => {
    if (i === qi) return;
    const prev = qi;
    qi = i;
    gsap.to(qSplits[prev].words, { opacity: 0, y: -20, filter: 'blur(6px)', duration: 0.35, stagger: 0.005, overwrite: true });
    quotes[prev].classList.remove('is-on');
    quotes[i].classList.add('is-on');
    gsap.fromTo(qSplits[i].words, { opacity: 0, y: 24, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, stagger: 0.018, ease: 'power3.out', overwrite: true });
    dots.forEach((dt, k) => dt.classList.toggle('on', k === i));
  };
  gsap.set(qSplits.slice(1).flatMap((s) => s.words), { opacity: 0 });
  ScrollTrigger.create({
    trigger: '.reviews', start: 'top top', end: `+=${quotes.length * 55}%`, pin: '.reviews__pin',
    onUpdate: (self) => showQuote(Math.min(quotes.length - 1, Math.floor(self.progress * quotes.length))),
  });
  const scoreObj = { v: 0 };
  gsap.timeline({ scrollTrigger: { trigger: '.reviews', start: 'top 55%', toggleActions: 'play none none reverse' } })
    .fromTo('.score__num', { '--w': 50, opacity: 0 }, { '--w': 130, opacity: 1, duration: 1.2, ease: 'expo.out' })
    .fromTo(scoreObj, { v: 0 }, {
      v: d.puan.ortalama, duration: 1.2, ease: 'expo.out',
      onUpdate: () => ($('[data-score]').textContent = scoreObj.v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })),
    }, 0)
    .fromTo('.score__stars svg', { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, stagger: 0.08, ease: 'back.out(3)', duration: 0.5 }, 0.3);

  // --- 6. Markalar: hızla tepki veren kayan yazı ---
  const tracks = $$('.marquee__track');
  const pos = tracks.map(() => 0);
  gsap.ticker.add((t, dt) => {
    const v = S.velocity || 0;
    const w = clamp(55, 150, 100 + Math.abs(v) * 2.2);
    tracks.forEach((tr, i) => {
      const dir = i % 2 ? 1 : -1;
      const half = tr.scrollWidth / 2 || 1;
      pos[i] = (pos[i] + dir * (0.6 + Math.abs(v) * 0.25) * (dt / 16)) % half;
      const x = dir < 0 ? pos[i] : pos[i] - half;
      tr.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(-14, 14, -v * 0.35)}deg)`;
      tr.style.setProperty('--w', w.toFixed(0));
    });
  });

  // --- 7. Saatler ve konum ---
  const visitSplit = new SplitText('.visit__h', { type: 'words', wordsClass: 'cw' });
  gsap.fromTo(visitSplit.words, { yPercent: 80, opacity: 0, '--w': 150 }, {
    yPercent: 0, opacity: 1, '--w': 100, stagger: 0.06, duration: 0.9, ease: 'expo.out',
    scrollTrigger: { trigger: '.visit', start: 'top 70%', toggleActions: 'play none none reverse' },
  });
  $$('.panel').forEach((p) =>
    ScrollTrigger.create({ trigger: p, start: 'top 80%', onEnter: () => p.classList.add('is-lit') })
  );

  // --- 8. Kontak ---
  gsap.fromTo(S, { finaleIn: 0 }, {
    finaleIn: 1, ease: 'none',
    scrollTrigger: {
      trigger: '.finale', start: 'top bottom', end: 'top top', scrub: true,
      onUpdate: (self) => (S.dim = Math.min(S.dim, 1 - self.progress)),
      onLeaveBack: () => (S.dim = 1),
    },
  });
  const finSplit = new SplitText('.finale__h', { type: 'words,chars', charsClass: 'ch', wordsClass: 'wd' });
  gsap.timeline({ scrollTrigger: { trigger: '.finale', start: 'top top', end: '+=220%', pin: '.finale__pin', scrub: true } })
    .fromTo('.tach', { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0)
    .fromTo('.finale__key', { scale: 0.6, opacity: 0, '--w': 50 }, { scale: 1, opacity: 1, '--w': 150, duration: 0.25, ease: 'power2.out' }, 0)
    .fromTo(S, { ignite: 0 }, { ignite: 1, duration: 0.5, ease: 'power1.in' }, 0.05)
    .to('.finale__key', { scale: 1.8, opacity: 0, filter: 'blur(10px)', duration: 0.2 }, 0.45)
    .fromTo(finSplit.chars, { yPercent: 120, opacity: 0, '--w': 150 }, { yPercent: 0, opacity: 1, '--w': 100, stagger: 0.008, duration: 0.25, ease: 'expo.out' }, 0.55)
    .fromTo('.finale__p, .finale__actions', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15, stagger: 0.05 }, 0.72)
    .to('.tach', { opacity: 0, duration: 0.08 }, 0.6)
    .to({}, { duration: 0.1 });

  // Tüm sayfa boyunca: ekran gölgesi ve sahne opaklığı
  gsap.ticker.add(() => {
    document.documentElement.style.setProperty('--dim', S.dim.toFixed(3));
    document.documentElement.style.setProperty('--fire', (S.re ? S.ignite : 0).toFixed(3));
  });

  // Footer görünürken çizmeyi bırak
  ScrollTrigger.create({
    trigger: '.foot', start: 'top 20%',
    onEnter: () => (S.covered = true),
    onLeaveBack: () => (S.covered = false),
  });

  // --- İmleç ve mıknatıslı düğmeler ---
  if (fine) {
    const cur = $('.cursor');
    const cx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      cx(e.clientX);
      cy(e.clientY);
      S.pointer.x = (e.clientX / innerWidth - 0.5) * 2;
      S.pointer.y = (e.clientY / innerHeight - 0.5) * 2;
      cur.classList.toggle('is-link', !!e.target.closest('a, button'));
    });
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)', overwrite: true });
      });
    });
  }

  // Görseller yoksa bile pin hesapları fontlardan sonra tazelensin
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
}
