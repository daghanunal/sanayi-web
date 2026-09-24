// Örtü: sinematik aileden ikinci oto döşeme preseti.
// Kobalt boşlukta tek bir kumaş parçası: söküm → kalıp → kesim → dikiş → gergi,
// sonra aynı panel kumaş → alcantara → nappa → kapitone. Finalde örtü uçar, çağrı açılır.
import usta from '../../data/usta.json';
import ext from '../../data/doseme-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...usta, ...ext, preset: 'doseme-sinematik2', isletme: { ...usta.isletme, ...(ext.isletme || {}) } });

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const io = gsap.parseEase('power2.inOut');
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;
const pad2 = (n) => String(n).padStart(2, '0');
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);

// "1987'den", "1990'dan", "2004'ten"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres,
  garanti: d.garanti, hakkinda: d.isletme.hakkinda,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `Şaşmaz'da ${ablative(kurulus)} beri`;
$('[data-yas]').textContent = yas;
$('[data-year]').textContent = `© ${buYil} ${d.isletme.ad}`;
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-final-alt]').textContent = d.finalAlt;

// Kahraman başlığı: kelime başına satır
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = d.isletme.ad.split(/\s+/).map((w) => `<span class="ln"><span class="ln__in">${esc(w)}</span></span>`).join(' ');

// Açık / kapalı
const st = openStatus(d.saatler);
$('[data-status]').innerHTML = `<i class="${st.open ? 'on' : ''}"></i>${esc(st.open ? 'Açık' : 'Kapalı')}`;
$('[data-status-big]').innerHTML = `<i class="${st.open ? 'on' : ''}"></i>${esc(st.text)}`;
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, h]) => `<div><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');

// Süreç adımları
const steps = d.surec.slice(0, 5);
$('[data-steps-rail]').innerHTML = steps.map((s, i) => `<li><b>${pad2(i + 1)}</b><span>${esc(s.baslik)}</span></li>`).join('');
$('[data-steps-body]').innerHTML = steps.map((s, i) => `
  <div class="step" data-step="${i}">
    <h2 class="step__title"><em>${pad2(i + 1)}</em>${esc(s.baslik)}</h2>
    <p class="step__txt">${esc(s.aciklama)}</p>
  </div>`).join('');
const railItems = $$('[data-steps-rail] li');
const stepEls = $$('[data-step]');

// Malzemeler (renkler sahnedeki panelle aynı)
const SW = [
  { bg: '#ede6da', fg: '#1a1a1a' }, { bg: '#403f49', fg: '#fff' },
  { bg: '#a8122a', fg: '#fff' }, { bg: '#141418', fg: '#ff8cc6', quilt: true },
];
const mats = d.malzemeler.slice(0, 4);
$('[data-kartela]').innerHTML = mats.map((m, i) => `
  <li style="--sw:${SW[i].bg};--swf:${SW[i].fg}" class="${SW[i].quilt ? 'q' : ''}"><span>${esc(m.ad)}</span></li>`).join('');
const swEls = $$('[data-kartela] li');

// Hizmetler
$('[data-svc]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc__item">
    <figure class="svc__img"><img src="${esc(h.gorsel)}" alt="${esc(h.baslik)}" loading="lazy" decoding="async" /></figure>
    <div class="svc__body">
      <p class="svc__no">${pad2(i + 1)}</p>
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__txt">${esc(h.aciklama)}</p>
      <p class="svc__sure"><span>Süre</span>${esc(h.sure)}</p>
    </div>
  </li>`).join('');

// Rakamlar
$('[data-stats]').innerHTML = d.istatistikler.map((s) => `
  <li><p class="nums__v"><b data-count="${Number(s.deger) || 0}">0</b><span>${esc(s.sonek)}</span></p><p class="nums__l">${esc(s.etiket)}</p></li>`).join('')
  + `<li><p class="nums__v"><b data-count="${yas}">0</b><span> yıl</span></p><p class="nums__l">aynı sanayide, aynı tezgâhta</p></li>`;

// Tarihçe: ilk kayıt kuruluş yılı; ondan önceki/aynı yıldaki kayıtlar düşer
const tarihce = (d.tarihce || [])
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus);
$('[data-tarihce]').innerHTML = tarihce.map((t) => `
  <li class="yil__item">
    <i class="yil__dot" aria-hidden="true"></i>
    <p class="yil__y">${esc(t.yil ?? 'Bugün')}</p>
    <div class="yil__card">
      ${t.gorsel ? `<figure><img src="${esc(t.gorsel)}" alt="" loading="lazy" decoding="async" /></figure>` : ''}
      <h3>${esc(t.baslik)}</h3>
      <p>${esc(t.metin)}</p>
    </div>
  </li>`).join('');

// Yorumlar
$('[data-puan]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} değerlendirme`;
$('[data-rev]').innerHTML = d.yorumlar.map((y) => `
  <figure class="card">
    <p class="card__stars" aria-label="${Number(y.puan) || 5} yıldız">${icons.star.repeat(Number(y.puan) || 5)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span><i></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((ents, obs) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  obs.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Sahne ---------------------------------------------------------------------

let stage = null;
const canvas = $('[data-stage]');
async function makeStage() {
  try {
    const { createStage } = await import('./scene.js');
    stage = createStage(canvas, { lite, weak });
    addEventListener('resize', () => stage.resize());
  } catch (e) {
    document.documentElement.classList.add('no-gl');
  }
}

const portrait = () => innerHeight > innerWidth * 1.05;
const S0 = 0.16;
const SL = 0.164;
const sStart = (k) => S0 + SL * k;

function poseHero(p) {
  const por = portrait();
  const a = por
    ? { nx: 0.1, ny: 0.64, size: 0.48, maxW: 0.9, rx: -0.3, ry: 0.42, rz: 0.14 }
    : { nx: 0.46, ny: 0.0, size: 0.88, maxW: 0.5, rx: -0.18, ry: -0.5, rz: 0.1 };
  const b = por
    ? { nx: 0, ny: 0.33, size: 0.56, maxW: 0.86, rx: -0.04, ry: 0, rz: 0 }
    : { nx: 0.4, ny: 0.0, size: 0.84, maxW: 0.5, rx: 0, ry: -0.12, rz: 0 };
  const t = io(seg(p, 0.06, sStart(1)));
  const o = {};
  for (const k of Object.keys(a)) o[k] = L(a[k], b[k], t);
  const tight = io(seg(p, sStart(4) + 0.01, sStart(5) - 0.04));
  o.wind = L(L(1, 0.55, seg(p, 0.1, sStart(1))), 0.04, tight);
  o.fold = L(L(0.7, 0.35, seg(p, 0.1, sStart(1))), 0, tight);
  o.chalk = seg(p, sStart(1) + 0.02, sStart(2) - 0.03);
  o.cut = seg(p, sStart(2) + 0.02, sStart(3) - 0.03);
  o.stitch = seg(p, sStart(3) + 0.02, sStart(4) - 0.03);
  o.puff = tight;
  o.mat = 0;
  o.ry += Math.sin(p * 9) * 0.04 * (1 - tight);
  return o;
}

function matValue(p) {
  const m = seg(p, 0.05, 0.92) * 3;
  const k = Math.min(2, Math.floor(m));
  return m >= 3 ? 3 : k + gsap.parseEase('power1.inOut')(seg(m - k, 0.25, 0.75));
}
function poseMat(p) {
  const por = portrait();
  const base = por
    ? { nx: 0, ny: 0.33, size: 0.56, maxW: 0.86 }
    : { nx: 0.4, ny: 0.0, size: 0.84, maxW: 0.5 };
  const sw = Math.sin(p * Math.PI * 2);
  return {
    ...base,
    rx: por ? -0.04 + sw * 0.05 : sw * 0.06,
    ry: (por ? 0 : -0.12) + Math.sin(p * Math.PI * 3) * 0.32,
    rz: 0,
    wind: 0.04, fold: 0, chalk: 0, cut: 1, stitch: 1, puff: 1,
    mat: matValue(p),
    size: base.size * (1 + 0.08 * Math.sin(p * Math.PI)),
  };
}

function poseFinal(p) {
  const drop = gsap.parseEase('power3.out')(seg(p, 0.02, 0.24));
  return {
    nx: 0, ny: L(2.6, 0, drop), size: 1, cover: true, rx: -0.12 * (1 - drop), ry: 0, rz: L(-0.12, 0, drop),
    wind: L(1.3, 0.35, drop) + seg(p, 0.36, 0.5) * 0.8, fold: 0.9, chalk: 0, cut: 0, stitch: 0, puff: 0, mat: 0,
    fly: io(seg(p, 0.4, 0.82)), freq: 0.45,
  };
}

const POSES = { hero: poseHero, mat: poseMat, final: poseFinal };

// --- Bölüm metinleri ------------------------------------------------------------

const heroEl = $('[data-hero]');
const stepsEl = $('[data-steps]');
const gaugeEl = $('[data-gauge]');
const gaugeLabel = $('[data-gauge-label]');
let stepNow = -1;
function textHero(p) {
  const out = seg(p, 0.07, 0.14);
  heroEl.style.opacity = 1 - out;
  heroEl.style.transform = `translate3d(0, ${(-out * 40).toFixed(1)}px, 0)`;
  heroEl.style.visibility = out >= 1 ? 'hidden' : 'visible';
  const inn = seg(p, 0.13, 0.18) * (1 - seg(p, 0.955, 0.985));
  stepsEl.style.opacity = inn;
  stepsEl.style.visibility = inn <= 0 ? 'hidden' : 'visible';
  const k = clamp(Math.floor((p - S0) / SL), 0, steps.length - 1);
  if (k !== stepNow) {
    const prev = stepNow;
    stepNow = k;
    railItems.forEach((li, i) => { li.classList.toggle('is-on', i === k); li.classList.toggle('is-done', i < k); });
    stepEls.forEach((el, i) => el.classList.toggle('is-on', i === k));
    const el = stepEls[k];
    if (prev !== -1 && !reducedMotion) gsap.fromTo(el.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', overwrite: true });
    gaugeLabel.textContent = steps[k].baslik;
  }
  const local = Math.round(seg(p, sStart(k), sStart(k + 1) - 0.02) * 100);
  const txt = String(local);
  if (gaugeEl.textContent !== txt) gaugeEl.textContent = txt;
}

const matName = $('[data-mat-name]');
const matAlt = $('[data-mat-alt]');
const matTxt = $('[data-mat-txt]');
const matChips = $('[data-mat-chips]');
const matIdx = $('[data-mat-idx]');
const matBox = $('.mat');
let matNow = -1;
function setMat(i) {
  const m = mats[i];
  matName.textContent = m.ad;
  matAlt.textContent = m.alt;
  matTxt.textContent = m.metin;
  matChips.innerHTML = (m.ozellik || []).map((o) => `<li>${esc(o)}</li>`).join('');
  matIdx.textContent = pad2(i + 1);
  swEls.forEach((li, j) => li.classList.toggle('is-on', j === i));
  document.body.dataset.mat = i;
}
function textMat(p) {
  const i = Math.round(matValue(p));
  if (i !== matNow) {
    const first = matNow === -1;
    matNow = i;
    setMat(i);
    if (!first && !reducedMotion) {
      gsap.fromTo([matName, matAlt, matTxt, matChips], { y: 30, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
        { y: 0, opacity: 1, clipPath: 'inset(-20% 0 -20% 0)', duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: true });
    }
  }
  matBox.style.opacity = seg(p, 0, 0.05);
}

const finalEl = $('[data-final]');
const finalHint = $('[data-final-hint]');
// Örtü sahnesi (z-index 40) main'in üstünde durur; ipucu görünsün diye body'ye taşınır.
document.body.appendChild(finalHint);
function textFinal(p) {
  const show = seg(p, 0.5, 0.74);
  finalEl.style.opacity = show;
  finalEl.style.transform = `translate3d(0, ${((1 - show) * 30).toFixed(1)}px, 0) scale(${(0.96 + show * 0.04).toFixed(3)})`;
  finalEl.style.visibility = show <= 0 ? 'hidden' : 'visible';
  finalHint.style.opacity = seg(p, 0.1, 0.17) * (1 - seg(p, 0.38, 0.46));
}
const TEXT = { hero: textHero, mat: textMat, final: textFinal };

// Aktif bölüm: ekranın ortasındaki bölüm (sonraki bölüm öncelikli). Görünen her bölümün metni güncellenir.
const chapters = $$('[data-ch]').map((el) => ({ id: el.dataset.ch, el }));
function scan() {
  const mid = innerHeight / 2;
  let act = null;
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    const span = r.height - innerHeight;
    const p = span > 0 ? clamp(-r.top / span) : 0.5;
    if (r.bottom > 0 && r.top < innerHeight) TEXT[c.id](p);
    if (r.top <= mid && r.bottom > mid) act = { id: c.id, p };
  }
  return act;
}

let current = null;
let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = reducedMotion ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  const a = scan();
  const id = a?.id ?? null;
  const done = id === 'final' && a.p > 0.9;
  const key = done ? 'none' : id ?? 'none';
  if (key !== current) {
    current = key;
    document.body.dataset.scene = key;
  }
  if (!id || done || !stage) return;
  const po = POSES[id](a.p);
  if (po.cover) {
    // Ekranı kaplayacak ölçek
    const ar = innerWidth / innerHeight;
    po.size = Math.max(1.14, (1.14 * ar * 4) / 3.2);
    po.maxW = 99;
  }
  stage.render(po, dt);
}

// --- Açılış -----------------------------------------------------------------

let lenis = null;
async function runIntro() {
  const intro = $('[data-intro]');
  const name = $('[data-intro-name]');
  const line = $('[data-intro-line]');
  const needle = $('[data-intro-needle]');
  const count = $('[data-intro-count]');
  name.textContent = d.isletme.ad;
  const finish = () => {
    intro.remove();
    document.body.classList.remove('is-loading');
    lenis?.start();
    ScrollTrigger.refresh();
    heroIn();
  };
  if (reducedMotion) { finish(); return; }
  const split = new SplitText(name, { type: 'chars' });
  const tl = gsap.timeline({ paused: true });
  const o = { v: 0 };
  tl.from(split.chars, { yPercent: 60, opacity: 0, duration: 0.5, stagger: 0.025, ease: 'power3.out' }, 0)
    .fromTo(o, { v: 0 }, {
      v: 1, duration: 1.25, ease: 'power1.inOut',
      onUpdate: () => {
        line.setAttribute('x2', (o.v * 1000).toFixed(1));
        needle.style.transform = `translate3d(${(o.v * 100).toFixed(2)}vw, 0, 0)`;
        count.textContent = String(Math.round(o.v * 120)).padStart(3, '0');
      },
    }, 0.15)
    .to(needle, { opacity: 0, duration: 0.2 }, '>-0.05')
    .to('[data-intro-top]', { yPercent: -100, duration: 0.85, ease: 'power4.inOut' }, '+=0.1')
    .to('[data-intro-bot]', { yPercent: 100, duration: 0.85, ease: 'power4.inOut' }, '<')
    .to('.intro__seam', { opacity: 0, duration: 0.3 }, '<')
    .add(() => heroIn(), '<0.35')
    .add(() => { intro.remove(); document.body.classList.remove('is-loading'); lenis?.start(); ScrollTrigger.refresh(); });
  intro.addEventListener('pointerdown', () => tl.timeScale(4), { once: true });
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  await stageReady;
  tl.play();
}

let heroDone = false;
function heroIn() {
  if (heroDone) return;
  heroDone = true;
  if (reducedMotion) return;
  gsap.from('.ln__in', { yPercent: 110, duration: 1.0, stagger: 0.08, ease: 'power4.out' });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta', '.hint'], { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, delay: 0.25, ease: 'power3.out' });
}

// --- Kaydırma animasyonları ---------------------------------------------------------

function scrollBits() {
  // Hizmet görselleri: dikiş hattından açılır
  $$('.svc__item').forEach((li) => {
    const img = $('.svc__img', li);
    if (!reducedMotion) {
      gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, {
        clipPath: 'inset(0 0 0% 0)', ease: 'none',
        scrollTrigger: { trigger: li, start: 'top 90%', end: 'top 45%', scrub: true },
      });
      gsap.fromTo($('img', img), { scale: 1.25 }, {
        scale: 1, ease: 'none', scrollTrigger: { trigger: li, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.from($$('.svc__body > *', li), {
        y: 30, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out',
        scrollTrigger: { trigger: li, start: 'top 75%' },
      });
    }
  });

  if (!reducedMotion) {
    gsap.from('.svc__title', { yPercent: 30, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.svc__head', start: 'top 80%' } });
    gsap.from('.nums__about', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.nums', start: 'top 75%' } });
    gsap.fromTo('.seam', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.nums__garanti', start: 'top 90%', end: 'top 55%', scrub: true } });
    $$('.card').forEach((c, i) => gsap.from(c, { y: 50, opacity: 0, duration: 0.8, delay: (i % 3) * 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.rev__track', start: 'top 85%' } }));
    gsap.from('.visit__col', { y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.visit', start: 'top 75%' } });
    $$('.yil__item').forEach((li) => gsap.from($$('.yil__y, .yil__card', li), { x: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 80%' } }));
  }

  // Sayaçlar
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    if (reducedMotion) { el.textContent = nf(to); return; }
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(o, { v: to, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = nf(o.v)) }),
    });
  });

  // Tarihçe ipliği
  const svg = $('[data-thread]');
  const path = $('[data-thread-path]');
  const draw = $('[data-thread-draw]');
  const wrap = $('.yil__wrap');
  let drawTween = null;
  const layoutThread = () => {
    const wr = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${wr.width.toFixed(0)} ${wr.height.toFixed(0)}`);
    const pts = $$('.yil__dot', wrap).map((dot) => {
      const r = dot.getBoundingClientRect();
      return [r.left + r.width / 2 - wr.left, r.top + r.height / 2 - wr.top];
    });
    if (!pts.length) return;
    const sway = wr.width < 700 ? 10 : Math.min(46, wr.width * 0.06);
    let dd = `M ${pts[0][0].toFixed(1)} 0 L ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const s = i % 2 ? sway : -sway;
      dd += ` C ${(x0 + s).toFixed(1)} ${(y0 + (y1 - y0) * 0.35).toFixed(1)}, ${(x1 + s).toFixed(1)} ${(y0 + (y1 - y0) * 0.65).toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    const lastP = pts.at(-1);
    dd += ` L ${lastP[0].toFixed(1)} ${wr.height.toFixed(1)}`;
    path.setAttribute('d', dd);
    draw.setAttribute('d', dd);
    drawTween?.scrollTrigger?.kill();
    drawTween?.kill();
    if (reducedMotion) return;
    drawTween = gsap.fromTo(draw, { drawSVG: '0%' }, {
      drawSVG: '100%', ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top 65%', end: 'bottom 65%', scrub: true },
    });
  };
  layoutThread();
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layoutThread(); ScrollTrigger.refresh(); }, 200); });
  $$('.yil__card img').forEach((img) => img.addEventListener('load', () => { layoutThread(); ScrollTrigger.refresh(); }, { once: true }));
}

// --- Başlat ----------------------------------------------------------------------

lenis = initSmoothScroll();
lenis?.stop();
const stageReady = makeStage();
setMat(0);
matNow = 0;
textHero(0);
scrollBits();
gsap.ticker.add(frame);
runIntro();
