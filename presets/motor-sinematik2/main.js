import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { createScene, ORDER } from './engine.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const years = new Date().getFullYear() - d.isletme.kurulus;
const pad = (n) => String(n).padStart(2, '0');

// 1996'dan, 2004'ten, 1990'dan (okunuşa göre ek)
const ablative = (y) => {
  const s = String(y);
  const ones = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const tens = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return ones[s.at(-1)];
  if (s.at(-2) !== '0') return tens[s.at(-2)];
  return "'den";
};
const locative = (y) => ablative(y).slice(0, -1);

// --- İçerik ---------------------------------------------------------------
$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
if (d.isletme.ad.length > 16) $('[data-hero-title]').classList.add('is-long');
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$$('[data-years]').forEach((el) => (el.textContent = years));
$('[data-hakkinda]').textContent = d.isletme.hakkinda.replace(/^\d{4}'[a-zçğıöşü]+\s/i, `${d.isletme.kurulus}${locative(d.isletme.kurulus)} `);
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$('[data-garanti]').textContent = d.garanti || '';

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
const maps = $('[data-maps]');
maps.href = mapsHref(d);
maps.innerHTML = `${icons.pin}<span>Yol tarifi al</span>`;

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.dataset.short = st.open ? 'Açık' : 'Kapalı';
  el.classList.toggle('is-open', st.open);
});
const topBar = $('.top');
const onScrollTop = () => topBar.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', onScrollTop, { passive: true });
onScrollTop();
$('[data-status-big]').innerHTML = st.open
  ? `Kepenk <em>açık.</em>`
  : `Kepenk <em>kapalı.</em>`;
$('.loc__h').insertAdjacentHTML('afterend', `<p class="loc__now ${st.open ? 'is-open' : ''}">${esc(st.text)}</p>`);
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="hours__row"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`)
  .join('');

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h, i) => `<li class="svc">
      <span class="svc__n">${pad(i + 1)}</span>
      <div class="svc__b">
        <h3 class="svc__t">${esc(h.baslik)}</h3>
        <p class="svc__d">${esc(h.aciklama)}</p>
      </div>
      <span class="svc__time">${esc(h.sure)}</span>
    </li>`
  )
  .join('');

const steps = d.surec.slice(0, 4);
$('[data-steps]').innerHTML = steps
  .map(
    (s, i) => `<li class="step${i === 0 ? ' is-on' : ''}">
      <span class="step__n">${i + 1}</span>
      <div><h3 class="step__t">${esc(s.baslik)}</h3><p class="step__d">${esc(s.aciklama)}</p></div>
    </li>`
  )
  .join('');

$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const val = i === 0 && /yıl/.test(s.etiket) ? years : s.deger;
    return `<div class="stat"><dd><span data-count="${val}">${nf.format(val)}</span><small>${esc(s.sonek)}</small></dd><dt>${esc(s.etiket)}</dt></div>`;
  })
  .join('');

$('[data-gallery]').innerHTML = d.galeri
  .slice(0, 5)
  .map(
    (g, i) => `<figure class="ph ph--${i}"><div class="ph__in"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></div><figcaption>${pad(i + 1)} · ${esc(g.alt)}</figcaption></figure>`
  )
  .join('');

$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-score-meta]').textContent = `${nf.format(d.puan.adet)} Google yorumu`;
$('[data-quotes]').innerHTML = d.yorumlar
  .map(
    (y, i) => `<figure class="q">
      <span class="q__mark" aria-hidden="true">“</span>
      <blockquote class="q__t">${esc(y.metin)}</blockquote>
      <figcaption class="q__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span>
        <span class="q__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</span></figcaption>
      <span class="q__n" aria-hidden="true">${pad(i + 1)}/${pad(d.yorumlar.length)}</span>
    </figure>`
  )
  .join('');
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true">⬡</i>`).join('');
$('[data-brands]').innerHTML = brandRow + brandRow;

const mapBox = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries[0].isIntersecting) return;
    mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '800px 0px' }
).observe(mapBox);

// Etiketler: sahnedeki on saplamanın sıra numarası
const labelsBox = $('[data-labels]');
labelsBox.innerHTML = ORDER.map((_, i) => `<span class="lbl">${i + 1}</span>`).join('');
const lbls = $$('.lbl', labelsBox);

// --- Sahne ve hareket -----------------------------------------------------
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const fontsReady = Promise.race([
  document.fonts.load("italic 600 100px 'Bodoni Moda'").then(() => document.fonts.ready),
  new Promise((r) => setTimeout(r, 1500)),
]);

let scene = null;
try {
  scene = createScene($('.stage'), { low, reduced: reducedMotion });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}
const S = scene ? scene.state : { intro: 0 };

fontsReady.then(start);

function start() {
  const lenis = initSmoothScroll();
  runIntro(lenis);
  wireScroll();
  wireText();
  ScrollTrigger.refresh();
}

function runIntro(lenis) {
  const intro = $('.intro');
  const heroSplit = new SplitText('[data-hero-title]', { type: 'words,chars', charsClass: 'ch', wordsClass: 'wd' });
  const heroBits = ['.hero .kicker', '.hero__slogan', '.hero__lead', '.hero__actions', '.hero__spec', '.hero__hint', '.top'];
  const finish = () => {
    intro.remove();
    S.intro = 0;
    lenis?.start();
  };
  if (reducedMotion) {
    finish();
    return;
  }
  lenis?.stop();
  const deg = $('[data-intro-deg]');
  const o = { a: 0 };
  gsap.set('.intro__arc', { drawSVG: '0%' });
  gsap.set(heroSplit.chars, { yPercent: 70, opacity: 0, rotate: 8 });
  gsap.set(heroBits, { opacity: 0, y: 18 });
  const tl = gsap.timeline({ onComplete: finish });
  tl.from('.intro__name', { opacity: 0, y: 10, duration: 0.5 }, 0)
    .to('.intro__arc', { drawSVG: '0% 25%', duration: 0.55, ease: 'power3.inOut' }, 0.15)
    .to('.intro__hex, .intro__mark', { rotate: 90, svgOrigin: '100 100', duration: 0.55, ease: 'power3.inOut' }, 0.15)
    .to(o, { a: 90, duration: 0.55, ease: 'power3.inOut', onUpdate: () => (deg.textContent = Math.round(o.a)) }, 0.15)
    .to('.intro__arc', { drawSVG: '0% 50%', duration: 0.55, ease: 'power3.inOut' }, 0.95)
    .to('.intro__hex, .intro__mark', { rotate: 180, svgOrigin: '100 100', duration: 0.55, ease: 'power3.inOut' }, 0.95)
    .to(o, { a: 180, duration: 0.55, ease: 'power3.inOut', onUpdate: () => (deg.textContent = Math.round(o.a)) }, 0.95)
    .to('.intro__mark', { stroke: '#ff2418', duration: 0.2 }, 1.45)
    .to('.intro', { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.7)
    .to(S, { intro: 0, duration: 1.6, ease: 'expo.out' }, 1.75)
    .to(heroSplit.chars, { yPercent: 0, opacity: 1, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.028 }, 1.95)
    .to(heroBits, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, 2.15);
  const skip = () => tl.progress(1);
  intro.addEventListener('pointerdown', skip, { once: true });
}

const colors = {
  red: [195, 18, 27],
  ink: [14, 12, 12],
};
const bgEl = $('.bg');
const mixRGB = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function wireScroll() {
  if (!scene) return;
  const bind = (key, cfg) =>
    ScrollTrigger.create({ ...cfg, onUpdate: (self) => (S[key] = self.progress), onRefresh: (self) => (S[key] = self.progress) });
  bind('land', { trigger: '.hero', start: 'top top', end: 'bottom 15%' });
  bind('serv', { trigger: '.serv', start: 'top bottom', end: 'bottom bottom' });
  bind('seqIn', { trigger: '.seq', start: 'top 85%', end: 'top top' });
  bind('seq', { trigger: '.seq', start: 'top top-=8%', end: 'bottom 170%' });
  bind('statsIn', { trigger: '.stats-sec', start: 'top 95%', end: 'top 20%' });
  let fadeOut = 0;
  let finIn = 0;
  ScrollTrigger.create({ trigger: '.stats-sec', start: 'bottom 70%', end: 'bottom 20%', onUpdate: (s) => (fadeOut = s.progress), onRefresh: (s) => (fadeOut = s.progress) });
  ScrollTrigger.create({ trigger: '.finale', start: 'top bottom', end: 'top 10%', onUpdate: (s) => (finIn = s.progress), onRefresh: (s) => (finIn = s.progress) });
  bind('fin', { trigger: '.finale', start: 'top bottom', end: 'bottom bottom' });

  const canvas = $('.stage');
  const stepsEls = $$('.step');
  const boltEl = $('[data-bolt]');
  const angleEl = $('[data-angle]');
  const meterEl = $('[data-meter]');
  const doneEl = $('[data-done]');
  const hudBox = $('.seq__hud');
  let lastHud = -1;
  let lastStep = -1;
  let lastBolt = -1;
  let lastAngle = -1;
  scene.onBefore(() => {
    S.finIn = finIn;
    const vis = Math.max(1 - fadeOut, finIn);
    S.visible = vis;
    canvas.style.opacity = vis.toFixed(3);
  });
  scene.onFrame((hud) => {
    // Zemin: kırmızıdan geceye ve geri
    const toInk = Math.min(1, S.seqIn) * (1 - finIn);
    bgEl.style.backgroundColor = `rgb(${mixRGB(colors.red, colors.ink, toInk).join(',')})`;

    // Etiketler sadece sıkma sahnesinde
    const lv = S.seqIn > 0.9 && S.statsIn < 0.2 ? 1 : 0;
    labelsBox.style.opacity = lv;
    if (lv) {
      hud.labels.forEach(([x, y], i) => {
        const el = lbls[i];
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.classList.toggle('is-done', i < hud.done);
        el.classList.toggle('is-cur', i === hud.bolt && hud.done < 10);
      });
    }
    if (hud.bolt !== lastBolt) {
      lastBolt = hud.bolt;
      boltEl.textContent = pad(hud.bolt + 1);
    }
    if (hud.angle !== lastAngle) {
      lastAngle = hud.angle;
      angleEl.textContent = `${hud.angle}°`;
    }
    // HUD yalnız sahne oturunca görünür; giriş/çıkışta ekran ortasında dolaşmasın
    const hv = Math.round(Math.min(Math.max((S.seqIn - 0.8) / 0.2, 0), 1) * (1 - Math.min(1, S.statsIn * 5)) * 100) / 100;
    if (hv !== lastHud) { lastHud = hv; hudBox.style.opacity = hv; }
    meterEl.style.transform = `scaleX(${(Math.min(1, S.seq)).toFixed(3)})`;
    doneEl.classList.toggle('is-on', hud.done >= 10);
    const step = Math.min(steps.length - 1, Math.floor(Math.min(0.999, S.seq) * steps.length));
    if (step !== lastStep) {
      lastStep = step;
      stepsEls.forEach((el, i) => {
        el.classList.toggle('is-on', i === step);
        el.classList.toggle('is-past', i < step);
      });
    }
  });
}

function wireText() {
  if (reducedMotion) return;
  // Başlıklar: kelime kelime yükselir
  $$('.h2, .finale__h').forEach((h) => {
    const sp = new SplitText(h, { type: 'words', wordsClass: 'w' });
    gsap.from(sp.words, {
      yPercent: 60, opacity: 0, rotate: 4, duration: 1, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: h, start: 'top 85%' },
    });
  });
  $$('.svc').forEach((el) => {
    gsap.from(el, { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    gsap.from($('.svc__n', el), { xPercent: -30, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  $$('.stat').forEach((el, i) => {
    gsap.from(el, { opacity: 0, y: 30, duration: 0.8, delay: i * 0.06, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  // Fotoğraflar: kırmızı perdeden açılır, içeride parallax
  $$('.ph').forEach((el) => {
    gsap.fromTo(el.querySelector('.ph__in'), { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
    gsap.fromTo(el.querySelector('img'), { yPercent: -8, scale: 1.18 }, {
      yPercent: 8, scale: 1.08, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  $$('.q').forEach((el, i) => {
    gsap.from(el, { opacity: 0, x: 60, duration: 1, delay: i * 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.rev__track', start: 'top 85%' } });
  });
  gsap.from('.rev__num', {
    yPercent: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.rev', start: 'top 75%' },
  });
  gsap.to('.brands__track', { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  gsap.from('.loc__card > *', {
    opacity: 0, y: 26, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.loc', start: 'top 75%' },
  });
}
