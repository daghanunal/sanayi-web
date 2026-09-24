import raw from '../../data/mikron.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const mm = (v, dec = 3) => v.toFixed(dec).replace('.', ',');
const clamp = gsap.utils.clamp;
const smooth = (a, b, x) => {
  const t = clamp(0, 1, (x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const phone = matchMedia('(max-width: 899px)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const years = new Date().getFullYear() - d.isletme.kurulus;
if (reducedMotion) document.documentElement.classList.add('is-reduced');

// Yıl ekleri: 1989'dan, 2004'ten, 2000'den
const ablative = (y) => {
  const s = String(y);
  const ones = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const tens = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return ones[s.at(-1)];
  if (s.at(-2) !== '0') return tens[s.at(-2)];
  return "'den";
};

// ------------------------------------------------------------------ içerik

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi, ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
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
$$('[data-maps]').forEach((a) => {
  a.href = mapsHref(d);
  a.innerHTML = `${icons.pin}<span>${esc(a.textContent)}</span>`;
});

// Açık / kapalı
const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
const big = $('[data-status-big]');
big.textContent = st.text;
big.classList.toggle('is-open', st.open);
const HAFTA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const bugun = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][new Date().getDay()];
const icerir = (label) => {
  const [a, b = a] = label.split(' – ');
  const i = HAFTA.indexOf(bugun);
  return i >= HAFTA.indexOf(a) && i <= HAFTA.indexOf(b);
};
$('[data-saatler]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => `<tr class="${icerir(gun) ? 'is-today' : ''}"><td>${gun}</td><td>${saat}</td></tr>`)
  .join('');

// Harita: yaklaşınca yükle
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Hizmetler: iş emri satırları
$('[data-hizmetler]').innerHTML = d.hizmetler
  .map(
    (h) => `
  <li class="is">
    <h3 class="is__ad">${esc(h.baslik)}</h3>
    <span class="is__tol" data-tol="${esc(h.tolerans)}">${esc(h.tolerans)}</span>
    <span class="is__sure">${esc(h.sure)}</span>
    <p class="is__txt">${esc(h.aciklama)}</p>
    <a class="is__wa" href="${waHref(d, `Merhaba, ${h.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`)}" target="_blank" rel="noopener">Bu iş için sor</a>
  </li>`
  )
  .join('');

// DRO: istatistikler eksen okumaları gibi
const AXES = ['X', 'Y', 'Z', 'W'];
$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const v = s.kurulustanHesapla ? years : s.deger;
    return `<div class="dro__row"><span class="dro__ax">${AXES[i] || ''}</span>
      <span class="dro__val" data-count="${v}" data-suffix="${esc(s.sonek)}">0</span>
      <span class="dro__lbl">${esc(s.etiket)}</span></div>`;
  })
  .join('');

// Süreç
$('[data-surec]').innerHTML = d.surec
  .map((s, i) => `<li class="adim"><span class="adim__n">${i + 1}. adım</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`)
  .join('');

// Rapor kartı
const R = d.rapor;
$('[data-rapor]').innerHTML = `
  <header class="kart__head">
    <div><p class="kart__title">Ölçü raporu</p><p>${esc(d.isletme.ad)}</p></div>
    <div class="kart__meta"><p>${esc(R.is)}</p><p>${esc(R.olcuSinifi)}</p></div>
  </header>
  <table>
    <thead><tr><th>Silindir</th><th>Hedef</th><th>Ölçülen</th><th>Ovalite</th><th></th></tr></thead>
    <tbody>${R.silindirler
      .map((c) => `<tr><td>${c.no}</td><td>${esc(R.nominal)}</td><td>${esc(c.olcu)}</td><td>${esc(c.ovalite)}</td><td class="ok">Uygun</td></tr>`)
      .join('')}</tbody>
  </table>
  <div class="kart__notes"><p>Krank: ${esc(R.krank)}</p><p>Kafa: ${esc(R.planya)}</p></div>
  <p class="kart__stamp">Ölçüldü</p>`;

// Galeri
$('[data-galeri]').innerHTML = d.galeri
  .map((g) => `<figure class="foto"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"><figcaption>${esc(g.alt)}</figcaption></figure>`)
  .join('');

// Yorumlar
const stars = (n) => Array.from({ length: 5 }, (_, i) => (i < n ? icons.star : '')).join('');
$('[data-puan]').textContent = String(d.puan.ortalama).replace('.', ',');
$('[data-stars]').innerHTML = stars(5);
$('[data-puan-adet]').textContent = `${nf.format(d.puan.adet)} Google yorumu`;
$('[data-yorumlar]').innerHTML = d.yorumlar
  .map(
    (y) => `<figure class="yorum"><div class="yorum__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</div>
      <p>${esc(y.metin)}</p><footer><b>${esc(y.ad)}</b>${esc(y.arac)}</footer></figure>`
  )
  .join('');

// Motor kodları
const mq = $('[data-marquee]');
const codes = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
mq.innerHTML = codes + codes;

// ------------------------------------------------------------------ komparatörler

function buildGauge(svg, nums = true) {
  const ticks = $('.gauge__ticks', svg);
  let t = '';
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2;
    const maj = i % 10 === 0, mid = i % 5 === 0;
    const r1 = 84, r2 = maj ? 70 : mid ? 74 : 78;
    t += `<line class="${maj ? 'maj' : ''}" x1="${100 + Math.sin(a) * r1}" y1="${100 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * r2}" y2="${100 - Math.cos(a) * r2}"/>`;
  }
  ticks.innerHTML = t;
  const n = $('.gauge__nums', svg);
  if (n && nums) {
    n.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const lbl = i <= 5 ? i * 10 : (10 - i) * 10; // 0 10 20 30 40 50 40 30 20 10
      return `<text x="${100 + Math.sin(a) * 58}" y="${100 - Math.cos(a) * 58}">${lbl}</text>`;
    }).join('');
  }
  const needle = $('.gauge__needle', svg);
  return (deg) => needle.setAttribute('transform', `rotate(${deg} 100 100)`);
}
const introNeedle = buildGauge($('.gauge--intro'));
const hudNeedle = buildGauge($('.gauge--hud'), false);
const sonNeedle = buildGauge($('.gauge--son'));

// ------------------------------------------------------------------ kinetik başlıklar

const splits = new Map();
function splitHead(el) {
  if (splits.has(el)) return splits.get(el);
  const s = new SplitText(el, { type: 'lines,words,chars', linesClass: 'ln', charsClass: 'ch' });
  splits.set(el, s);
  return s;
}

// ------------------------------------------------------------------ sahne

const low = phone || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const canvas = $('.stage');
let scene = null;
try {
  scene = createScene(canvas, { low, reduced: reducedMotion });
} catch (err) {
  console.warn('WebGL yok, sahne atlandı', err);
  canvas.remove();
}

// Ölçü çizgileri (3D noktalara bağlı)
const dimsSvg = $('.dims');
const NS = 'http://www.w3.org/2000/svg';
function makeDim(label) {
  const g = document.createElementNS(NS, 'g');
  g.innerHTML = `<line class="ext e1"/><line class="ext e2"/><line class="dl"/>
    <path class="arr a1"/><path class="arr a2"/><text class="lb">${label}</text>`;
  g.style.opacity = 0;
  dimsSvg.append(g);
  const q = (c) => g.querySelector(c);
  return {
    g, p: 0,
    update(A, B, off, text) {
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const A2 = { x: A.x + nx * off, y: A.y + ny * off }, B2 = { x: B.x + nx * off, y: B.y + ny * off };
      const set = (el, a, b) => { el.setAttribute('x1', a.x); el.setAttribute('y1', a.y); el.setAttribute('x2', b.x); el.setAttribute('y2', b.y); };
      const draw = this.p;
      set(q('.e1'), A, { x: A.x + nx * (off + 8 * Math.sign(off)), y: A.y + ny * (off + 8 * Math.sign(off)) });
      set(q('.e2'), B, { x: B.x + nx * (off + 8 * Math.sign(off)), y: B.y + ny * (off + 8 * Math.sign(off)) });
      const mid = { x: (A2.x + B2.x) / 2, y: (A2.y + B2.y) / 2 };
      const half = draw / 2;
      const P1 = { x: mid.x - (dx / 2) * draw, y: mid.y - (dy / 2) * draw };
      const P2 = { x: mid.x + (dx / 2) * draw, y: mid.y + (dy / 2) * draw };
      set(q('.dl'), P1, P2);
      const ux = dx / len, uy = dy / len, s = 9, w = 3.5;
      const arrow = (P, dir) => `M${P.x} ${P.y} L${P.x - ux * s * dir + nx * w} ${P.y - uy * s * dir + ny * w} L${P.x - ux * s * dir - nx * w} ${P.y - uy * s * dir - ny * w}z`;
      q('.a1').setAttribute('d', arrow(P1, -1));
      q('.a2').setAttribute('d', arrow(P2, 1));
      const lb = q('.lb');
      if (text && lb.textContent !== text) lb.textContent = text;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      const flip = ang > 90 || ang < -90 ? 180 : 0;
      const lx = mid.x + nx * 12 * Math.sign(off || 1), ly = mid.y + ny * 12 * Math.sign(off || 1);
      lb.setAttribute('x', lx);
      lb.setAttribute('y', ly);
      lb.setAttribute('text-anchor', 'middle');
      lb.setAttribute('transform', `rotate(${ang + flip} ${lx} ${ly})`);
      g.style.opacity = Math.min(1, draw * 1.6) * (half >= 0 ? 1 : 0);
    },
  };
}
const DIMS = [
  { a: 'journalA', b: 'journalB', off: 70, win: [0.16, 0.39], text: (s) => `Ø 54,${String(Math.round(40 - s.grind * 40)).padStart(3, '0')}` },
  { a: 'boreA', b: 'boreB', off: 0, win: [0.52, 0.74], text: () => 'Ø 75,25 +0,01' },
  { a: 'deckA', b: 'deckB', off: 30, win: [0.82, 1.01], text: (s) => (s.cut > 0.98 ? 'Düzlemsellik 0,02' : 'Düzlemsellik ölçülüyor') },
].map((c) => ({ ...c, dim: makeDim('') }));

// HUD okumaları
const HUD = [
  { win: [0.14, 0.39], label: 'Ovalite', from: 0.06, to: 0.004, tol: 0.005, key: 'grind' },
  { win: [0.5, 0.75], label: 'Koniklik', from: 0.05, to: 0.004, tol: 0.005, key: 'hone' },
  { win: [0.8, 1.01], label: 'Çarpılma', from: 0.12, to: 0.02, tol: 0.02, key: 'cut' },
];
const hud = $('.hud');
const hudLabel = $('[data-hud-label]'), hudVal = $('[data-hud-val]'), hudTol = $('[data-hud-tol]'), hudVerdict = $('[data-hud-verdict]');
let hudIdx = -1, hudShown = false, needleDeg = 0, jitterT = 0;

function honeProgress(s) {
  return s.hone.reduce((a, b) => a + b, 0) / 4;
}

if (scene) {
  const S = scene.state;
  scene.onFrame.push(() => {
    const p = S.p;
    // ölçü çizgileri
    for (const c of DIMS) {
      const target = smooth(c.win[0], c.win[0] + 0.03, p) * (1 - smooth(c.win[1] - 0.03, c.win[1], p));
      c.dim.p += (target - c.dim.p) * 0.15;
      if (c.dim.p < 0.01) {
        c.dim.g.style.opacity = 0;
        continue;
      }
      const A = scene.project(scene.anchors[c.a]);
      const B = scene.project(scene.anchors[c.b]);
      c.dim.update(A, B, c.off, c.text(S));
    }
    // HUD
    const idx = HUD.findIndex((h) => p >= h.win[0] && p < h.win[1]);
    const show = idx > -1;
    if (show !== hudShown) {
      hudShown = show;
      gsap.to(hud, { autoAlpha: show ? 1 : 0, y: show ? 0 : -10, duration: 0.35, overwrite: true });
    }
    if (show) {
      const h = HUD[idx];
      if (idx !== hudIdx) {
        hudIdx = idx;
        hudLabel.textContent = h.label;
        hudTol.textContent = mm(h.tol);
      }
      const k = h.key === 'hone' ? honeProgress(S) : S[h.key];
      const v = h.from + (h.to - h.from) * k;
      const working = k > 0 && k < 1;
      jitterT += 0.18;
      const jitter = working ? Math.sin(jitterT * 3.1) * 0.0012 + (Math.random() - 0.5) * 0.001 : 0;
      const shown = Math.max(0, v + jitter);
      hudVal.textContent = mm(shown);
      const go = v <= h.tol + 1e-6;
      hudVerdict.textContent = go ? 'Ölçüde' : 'Ölçü dışı';
      hudVerdict.classList.toggle('is-go', go);
      const target = shown * 1000 * 3.6; // 0,001 mm bölüntü, tur 0,1 mm
      needleDeg += (target - needleDeg) * 0.25;
      hudNeedle(needleDeg);
      $('.gauge--hud .gauge__needle').style.stroke = go ? 'var(--go)' : 'var(--nogo)';
    }
  });
}

// ------------------------------------------------------------------ açılış

const intro = $('.intro');
let introDone = false;
function playIntro() {
  return new Promise((resolve) => {
    if (reducedMotion) {
      intro.remove();
      resolve();
      return;
    }
    const read = $('[data-intro-read]');
    const o = { v: 0 };
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(o, {
      v: 1, duration: 1.5, ease: 'power2.inOut',
      onUpdate() {
        const k = o.v;
        const wobble = Math.sin(k * 18) * (1 - k) * 160;
        const deg = (1 - k) * 540 + wobble;
        introNeedle(deg);
        read.textContent = mm(Math.abs(deg / 3.6 / 1000));
      },
    })
      .add(() => {
        introNeedle(0);
        read.textContent = '0,000';
        $('.gauge--intro .gauge__needle').style.stroke = 'var(--go)';
      })
      .to({}, { duration: 0.25 })
      .to('.intro__core', { autoAlpha: 0, scale: 0.96, duration: 0.3, ease: 'power2.in' })
      .to('.intro__shutter--l', { xPercent: -101, duration: 0.6, ease: 'expo.inOut' }, '<0.15')
      .to('.intro__shutter--r', { xPercent: 101, duration: 0.6, ease: 'expo.inOut' }, '<');
    gsap.from('.intro__name', { yPercent: 40, autoAlpha: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
    intro.addEventListener('pointerdown', () => tl.progress(0.999), { once: true });
    function finish() {
      intro.remove();
      resolve();
    }
    // sahne hazırsa shader'ları ısıt (açılışın arkasında)
    requestAnimationFrame(() => scene?.warm());
  });
}

// ------------------------------------------------------------------ film

function heroIn() {
  const split = splitHead($('.hero__title'));
  gsap.set('.chap--hero', { autoAlpha: 1 });
  const tl = gsap.timeline();
  tl.from(split.chars, { yPercent: 115, rotate: 6, duration: 0.9, ease: 'expo.out', stagger: 0.028 })
    .from(['.chap__since', '.hero__lead', '.hero__cta', '.hero__hint'], { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.25);
  return tl;
}

let filmST = null;
function buildFilm() {
  const chaps = $$('.chap');
  const dur = phone ? 6.2 : 7;
  // bölüm pencereleri: [giriş başı, çıkış sonu]
  const W = [
    [-1, 0.1],
    [0.13, 0.38],
    [0.49, 0.74],
    [0.8, 1.02],
  ];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  chaps.forEach((el, i) => {
    const [a, b] = W[i];
    const title = $('.chap__title, .hero__title', el);
    const split = title ? splitHead(title) : null;
    if (i > 0) {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.012 }, a);
      if (split) tl.fromTo(split.chars, { yPercent: 115 }, { yPercent: 0, stagger: 0.0015, duration: 0.03, ease: 'power3.out' }, a);
      tl.fromTo($$('.antet, .chap__txt', el), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.03, stagger: 0.01 }, a + 0.01);
    }
    if (b < 1) {
      if (split) tl.to(split.chars, { yPercent: -115, stagger: 0.001, duration: 0.025, ease: 'power2.in' }, b - 0.035);
      tl.to(el, { autoAlpha: 0, duration: 0.02 }, b - 0.02);
    }
  });
  // kamera istasyon değiştirirken kesit taraması ekranı kapatır
  for (const [el, a] of [[$('[data-wipe="1"]'), 0.393], [$('[data-wipe="2"]'), 0.742]]) {
    tl.fromTo(el, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.024, ease: 'power2.inOut' }, a)
      .fromTo($('p', el), { xPercent: 30, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.02 }, a + 0.008)
      .to(el, { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.024, ease: 'power2.inOut' }, a + 0.034)
      .to($('p', el), { xPercent: -30, autoAlpha: 0, duration: 0.018 }, a + 0.032);
  }
  tl.fromTo('.scale__fill', { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
  tl.to({}, { duration: 0.001 }, 1);

  filmST = ScrollTrigger.create({
    trigger: '.film',
    start: 'top top',
    end: () => `+=${innerHeight * dur}`,
    pin: true,
    scrub: true,
    anticipatePin: 1,
    onUpdate(self) {
      scene?.setProgress(self.progress);
      tl.progress(self.progress);
    },
  });
  // film bitince sahne yukarı kayarak çıkar; tamamen çıkınca render dursun
  ScrollTrigger.create({
    start: () => filmST.end,
    end: () => filmST.end + innerHeight,
    onLeave: () => scene?.stop(),
    onEnterBack: () => scene?.start(),
  });
  window.__film = filmST; // ekran görüntüsü betikleri için
}

// ------------------------------------------------------------------ bölümler

function kineticHeads() {
  $$('[data-kin]').forEach((el) => {
    const s = splitHead(el);
    gsap.from(s.chars, {
      yPercent: 115, duration: 0.9, ease: 'expo.out', stagger: 0.018,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });
}

function olcuSecici() {
  const box = $('[data-olcu-btns]');
  box.innerHTML = d.olculer
    .map((o, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-i="${i}">${esc(o.piston)}</button>`)
    .join('');
  const bore = $('[data-bore]'), piston = $('[data-piston]'), rings = $$('[data-ring]');
  const dim = $('[data-dim]'), e1 = $('[data-ext1]'), e2 = $('[data-ext2]'), lbl = $('[data-dim-label]');
  const capEl = $('[data-olcu-cap]'), pisEl = $('[data-olcu-piston]'), alEl = $('[data-olcu-alinan]');
  const waBtn = $('[data-olcu-wa]');
  waBtn.target = '_blank';
  waBtn.rel = 'noopener';
  const st = { w: 180, cap: d.olculer[0].cap };
  const drawW = (w) => {
    const x = 210 - w / 2;
    bore.setAttribute('x', x);
    bore.setAttribute('width', w);
    piston.setAttribute('x', x + 6);
    piston.setAttribute('width', w - 12);
    rings.forEach((r) => { r.setAttribute('x1', x + 6); r.setAttribute('x2', x + w - 6); });
    for (const [el, xx] of [[e1, x], [e2, x + w]]) { el.setAttribute('x1', xx); el.setAttribute('x2', xx); }
    dim.setAttribute('x1', x);
    dim.setAttribute('x2', x + w);
  };
  const select = (i, animate = true) => {
    const o = d.olculer[i];
    $$('button', box).forEach((b, k) => b.setAttribute('aria-checked', k === i));
    const w = 180 + (o.cap - d.olculer[0].cap) * 64;
    const from = { ...st };
    gsap.to(st, {
      w, cap: o.cap, duration: animate ? 0.8 : 0, ease: 'expo.out',
      onUpdate() {
        drawW(st.w);
        capEl.textContent = mm(st.cap);
        alEl.textContent = mm(st.cap - d.olculer[0].cap);
      },
    });
    if (animate && !reducedMotion) gsap.to(lbl, { duration: 0.6, scrambleText: { text: `Ø ${mm(o.cap)}`, chars: '0123456789', speed: 0.6 } });
    else lbl.textContent = `Ø ${mm(o.cap)}`;
    void from;
    pisEl.textContent = o.piston;
    waBtn.href = waHref(d, `Merhaba, motorum için ${o.ad.toLocaleLowerCase('tr')} honlama ve piston fiyatı almak istiyorum.`);
    waBtn.innerHTML = `${icons.whatsapp}<span>${o.ad} için fiyat sor</span>`;
  };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) select(Number(b.dataset.i));
  });
  select(0, false);
  // ilk görünüşte kendiliğinden bir ölçü seç (etkileşimi göster)
  if (!reducedMotion) {
    ScrollTrigger.create({ trigger: '.olcu', start: 'top 55%', once: true, onEnter: () => setTimeout(() => select(1), 400) });
  }
}

function isler() {
  $$('.is').forEach((row) => {
    gsap.fromTo(row, { '--p': 0 }, {
      '--p': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 85%', end: 'bottom 55%', scrub: true },
    });
    const tol = $('.is__tol', row);
    ScrollTrigger.create({
      trigger: row, start: 'top 80%', once: true,
      onEnter: () => gsap.to(tol, { duration: 0.8, scrambleText: { text: tol.dataset.tol, chars: '0123456789,±', speed: 0.5 } }),
    });
    gsap.from(row.querySelector('.is__ad'), {
      xPercent: -6, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: row, start: 'top 88%', once: true },
    });
  });
}

function hakkinda() {
  const p = $('[data-hakkinda]');
  const words = p.textContent.split(' ');
  p.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
  const ws = $$('.w', p);
  ScrollTrigger.create({
    trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * ws.length);
      ws.forEach((w, i) => w.classList.toggle('is-on', i < n));
    },
  });
  $$('[data-count]').forEach((el) => {
    const v = Number(el.dataset.count), suf = el.dataset.suffix;
    const o = { v: 0 };
    gsap.to(o, {
      v, duration: 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v)) + suf),
    });
  });
}

function kumpas() {
  const marks = $('.kumpas__marks');
  let m = '';
  for (let i = 0; i <= 1000; i += 10) {
    const maj = i % 100 === 0, mid = i % 50 === 0;
    m += `<line x1="${i}" y1="40" x2="${i}" y2="${maj ? 62 : mid ? 55 : 49}"/>`;
    if (maj && i > 0 && i < 1000) m += `<text x="${i + 3}" y="76">${i / 10}</text>`;
  }
  marks.innerHTML = m;
  const slider = $('.kumpas__slider');
  const steps = $$('.adim');
  gsap.set(slider, { x: 60 });
  ScrollTrigger.create({
    trigger: '.surec', start: 'top 70%', end: 'bottom 60%', scrub: 0.6,
    onUpdate(self) {
      const x = 60 + self.progress * 790;
      gsap.set(slider, { x });
      steps.forEach((s, i) => s.classList.toggle('is-on', self.progress >= i / steps.length + 0.02));
    },
  });
}

function rapor() {
  const kart = $('.kart');
  const tl = gsap.timeline({ scrollTrigger: { trigger: kart, start: 'top 75%', once: true } });
  tl.from(kart, { rotateX: -12, y: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out' })
    .from($$('tbody tr', kart), { autoAlpha: 0, x: -12, duration: 0.35, stagger: 0.12 }, '-=0.4')
    .from($$('.kart__notes p', kart), { autoAlpha: 0, duration: 0.3, stagger: 0.1 })
    .fromTo('.kart__stamp', { scale: 2.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.9, duration: 0.28, ease: 'power4.in' })
    .to(kart, { x: 3, duration: 0.05, yoyo: true, repeat: 3 });
}

function galeri() {
  const track = $('[data-galeri]');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.galeri', start: 'top 80%', end: 'bottom 20%', scrub: 0.5, invalidateOnRefresh: true },
  });
  $$('.foto img').forEach((img) => {
    gsap.fromTo(img, { scale: 1.2 }, { scale: 1.02, ease: 'none', scrollTrigger: { trigger: '.galeri', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // kesit taraması gibi çapraz açılış
  $$('.foto').forEach((f) => {
    gsap.fromTo(f, { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }, {
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', duration: 1.1, ease: 'expo.inOut',
      scrollTrigger: { trigger: '.galeri', start: 'top 70%', once: true },
    });
  });
}

function yorumlar(lenis) {
  const row = $('[data-yorumlar]');
  gsap.fromTo(row, { x: () => (phone ? 0 : innerWidth * 0.1) }, {
    x: () => -(row.scrollWidth - innerWidth * 0.9), ease: 'none',
    scrollTrigger: { trigger: '.yorumlar', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
  });
  const puan = $('[data-puan]');
  const o = { v: 0 };
  gsap.to(o, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    scrollTrigger: { trigger: puan, start: 'top 85%', once: true },
    onUpdate: () => (puan.textContent = o.v.toFixed(1).replace('.', ',')),
  });
  // kayan satır hız ile eğilir
  if (lenis) {
    const skew = gsap.quickTo(row, 'skewX', { duration: 0.4, ease: 'power3' });
    lenis.on('scroll', ({ velocity }) => skew(clamp(-6, 6, -velocity * 0.25)));
  }
}

function marquee(lenis) {
  let x = 0, boost = 0;
  const half = () => mq.scrollWidth / 2;
  gsap.ticker.add((_, dt) => {
    x -= (0.6 + boost) * dt * 0.06;
    const h = half();
    if (h && -x > h) x += h;
    if (x > 0) x -= h;
    mq.style.transform = `translate3d(${x}px,0,0)`;
    boost *= 0.92;
  });
  lenis?.on('scroll', ({ velocity }) => (boost = clamp(-12, 12, velocity * 0.8)));
}

function son() {
  const o = { deg: 300 };
  sonNeedle(300);
  gsap.to(o, {
    deg: 0, ease: 'elastic.out(1, 0.35)', duration: 2.4,
    scrollTrigger: { trigger: '.son', start: 'top 70%', once: true },
    onUpdate: () => sonNeedle(o.deg),
    onComplete: () => ($('.gauge--son .gauge__needle').style.stroke = 'var(--go)'),
  });
}

function header() {
  const hdr = $('.hdr');
  ScrollTrigger.create({
    start: () => innerHeight * 0.6,
    onUpdate: (self) => hdr.classList.toggle('is-solid', self.scroll() > innerHeight * 0.6),
  });
}

function cursor() {
  if (!fine) return;
  document.documentElement.classList.add('has-cur');
  const cur = $('.cur');
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.18, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.18, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    cur.classList.toggle('is-hot', !!e.target.closest('a, button'));
  });
  $$('.mag').forEach((b) => {
    const bx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
    const by = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      bx((e.clientX - r.left - r.width / 2) * 0.28);
      by((e.clientY - r.top - r.height / 2) * 0.35);
    });
    b.addEventListener('pointerleave', () => { bx(0); by(0); });
  });
}

// ------------------------------------------------------------------ başlat

function staticFallback() {
  // hareket azaltma: tek kare, ayna muylu
  if (scene) {
    scene.setProgress(0.3);
    scene.state.grind = 1;
    scene.state.wheelIn = 1;
    scene.resize();
    scene.render();
  }
  olcuSecici();
  $$('[data-count]').forEach((el) => (el.textContent = nf.format(Number(el.dataset.count)) + el.dataset.suffix));
  sonNeedle(0);
  $$('.gauge__needle').forEach((n) => (n.style.stroke = 'var(--go)'));
  $$('.adim').forEach((a) => a.classList.add('is-on'));
}

async function start() {
  addEventListener('resize', () => scene?.resize());
  if (reducedMotion) {
    intro.remove();
    staticFallback();
    return;
  }
  const lenis = initSmoothScroll();
  lenis?.stop();
  scrollTo(0, 0);
  buildFilm();
  scene?.render();
  scene?.start();
  await playIntro();
  lenis?.start();
  heroIn();
  kineticHeads();
  olcuSecici();
  isler();
  hakkinda();
  kumpas();
  rapor();
  galeri();
  yorumlar(lenis);
  marquee(lenis);
  son();
  header();
  cursor();
  ScrollTrigger.refresh();
  introDone = true;
  void introDone;
}

document.fonts?.ready.then(start) ?? start();
