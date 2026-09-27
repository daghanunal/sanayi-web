// Örtü: sinematik aileden ikinci oto döşeme preseti.
// Kobalt boşlukta, yüksek anahtarlı stüdyo ışığında gerçek bir koltuk (lib3d seat):
// söküm → kalıp → kesim → dikiş → gergi, sonra aynı koltuk kumaş → alcantara → nappa → kapitone.
// Finalde örtü uçar, çağrı açılır.
import usta from '../../data/usta.json';
import ext from '../../data/doseme-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, storyZone,
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
$('.foot__tel').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
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
  { bg: '#ebe5d8', fg: '#10143f' }, { bg: '#5d6190', fg: '#fff' },
  { bg: '#b3142f', fg: '#fff' }, { bg: '#1d1d26', fg: '#ff8cc6', quilt: true },
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
$('[data-puan-adet]').textContent = 'örnek puan';
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
    stage = await createStage(canvas, { lite, weak });
    addEventListener('resize', () => stage.resize());
  } catch (e) {
    console.warn('3D sahne açılamadı', e);
    document.documentElement.classList.add('no-gl');
  }
}

const portrait = () => innerHeight > innerWidth * 1.05;
const HP = Math.PI / 2;
const mixPose = (a, b, t) => {
  const o = {};
  for (const k of Object.keys(a)) o[k] = typeof a[k] === 'number' && typeof b[k] === 'number' ? L(a[k], b[k], t) : (t < 0.5 ? a[k] : b[k]);
  return o;
};

// Telefonda sahne, başlık ile kartın arasındaki boşluğa oturur: kartların üst kenarı ölçülür
// (pin içindeki konum; kaydırmadan bağımsız). Yüklemede ve boyut değişince yenilenir.
const REG = {};
function measureRegions() {
  const vh = innerHeight;
  const top = ($('.top')?.getBoundingClientRect().bottom || 64) + 10;
  const inPin = (el) => {
    const pin = el.closest('.ch__pin');
    return el.getBoundingClientRect().top - pin.getBoundingClientRect().top;
  };
  const since = $('.hero__since');
  REG.vh = vh;
  REG.hero = [top, inPin(since) - 16];
  REG.work = [top, inPin(stepsEl) - 16];
  // Malzeme kartı içeriğe göre uzar: en uzun metnin üst kenarı esas alınır
  let mt = Infinity;
  mats.forEach((_, i) => { setMat(i); mt = Math.min(mt, inPin(matBox)); });
  setMat(Math.max(0, matNow));
  REG.show = [top, mt - 18];
}
function fit(f, key, k = 1) {
  const r = REG[key];
  if (!r || !REG.vh) return f;
  const h = Math.max(80, r[1] - r[0]);
  return { ...f, ny: 1 - (r[0] + r[1]) / REG.vh, size: Math.min(f.size, (h / REG.vh) * 0.95 * k) };
}

// Kadrajlar: telefonda koltuk üst yarıda (kart altta), masaüstünde sağda (metin solda)
function frames() {
  const por = portrait();
  const F = framesRaw(por);
  if (!por) return F;
  return {
    hero: fit(F.hero, 'hero'), work: fit(F.work, 'work'), bench: fit(F.bench, 'work', 0.92),
    show: fit(F.show, 'show'), cloth: fit(F.cloth, 'work', 0.82),
  };
}
function framesRaw(por) {
  return {
    hero: por
      ? { nx: 0.02, ny: 0.34, size: 0.44, maxW: 0.9, yaw: -HP + 0.66, pitch: 0.12 }
      : { nx: 0.44, ny: -0.05, size: 0.74, maxW: 0.5, yaw: -HP + 0.72, pitch: 0.1 },
    work: por // söküm başı: yandan
      ? { nx: 0.0, ny: 0.26, size: 0.44, maxW: 0.9, yaw: -HP + 1.2, pitch: 0.16 }
      : { nx: 0.44, ny: -0.04, size: 0.66, maxW: 0.5, yaw: -HP + 1.25, pitch: 0.14 },
    bench: por // tezgâh: parçaları açık koltuk solda, kılıf sağda
      ? { nx: -0.24, ny: 0.2, size: 0.4, maxW: 0.56, yaw: -HP + 0.95, pitch: 0.18 }
      : { nx: 0.22, ny: -0.02, size: 0.62, maxW: 0.34, yaw: -HP + 0.95, pitch: 0.16 },
    show: por // ürün çekimi: 3/4, hafif üstten
      ? { nx: 0.0, ny: 0.2, size: 0.5, maxW: 0.92, yaw: -HP + 0.6, pitch: 0.2 }
      : { nx: 0.44, ny: -0.05, size: 0.7, maxW: 0.5, yaw: -HP + 0.62, pitch: 0.16 },
    cloth: por
      ? { nx: 0.24, ny: 0.13, size: 0.36, maxW: 0.6 }
      : { nx: 0.62, ny: -0.02, size: 0.56, maxW: 0.34 },
  };
}

const NS = 5; // adım sayısı
const stepOf = (p) => clamp(Math.floor(p * NS), 0, NS - 1);
const sA = (k) => k / NS;

function poseHero(p) {
  const F = frames();
  const t = io(seg(p, 0.25, 1));
  return {
    seat: { ...mixPose(F.hero, F.work, t * 0.25), explode: 0, worn: 1, light: 1, spin: 1 - t, mat: 0, recline: 0, head: 0 },
    cloth: null,
  };
}

function poseAtolye(p) {
  const F = frames();
  const out = io(seg(p, 0.0, sA(1) - 0.02)); // söküm
  const back = io(seg(p, sA(4) + 0.1, 0.97)); // gergi: toparlanma
  const seatBase = mixPose(mixPose(mixPose(F.hero, F.work, 0.25), F.bench, out), F.show, back);
  const explode = L(1.15 * out, 0, back);
  const light = L(L(1, 0.45, io(seg(p, sA(0) + 0.08, sA(1)))), 1, io(seg(p, sA(4) + 0.08, sA(4) + 0.16)));
  const seat = {
    ...seatBase, explode, light, worn: 1 - io(seg(p, sA(4) + 0.12, sA(4) + 0.17)),
    head: 0.04 * out * (1 - back), recline: 0.2 * out * (1 - back), spin: 0.4, mat: 0,
  };
  seat.yaw += Math.sin(p * 7) * 0.05 * (1 - back);

  // Kılıf: sırttan kalkar, öne süzülür; kalıp, kesim, dikiş; gerilir ve sırta geri oturur
  const lift = 1 - io(seg(p, 0.02, sA(1) - 0.03));
  const tight = io(seg(p, sA(4) + 0.005, sA(4) + 0.1));
  const home = seg(p, sA(4) + 0.1, 0.965);
  let cloth = null;
  if (p > 0.012 && home < 1) {
    const cf = F.cloth;
    cloth = {
      ...cf, z: 2.2,
      rx: -0.06 + Math.sin(p * 5) * 0.04, ry: -0.18 + Math.sin(p * 9) * 0.05 * (1 - tight), rz: 0.04 * (1 - tight),
      wind: L(L(1, 0.55, 1 - lift), 0.05, tight), fold: L(0.35, 0, tight),
      chalk: seg(p, sA(1) + 0.02, sA(2) - 0.03),
      cut: seg(p, sA(2) + 0.02, sA(3) - 0.03),
      stitch: seg(p, sA(3) + 0.02, sA(4) - 0.03),
      puff: tight, mat: 0,
      toSeat: Math.max(lift, home),
    };
  }
  return { seat, cloth };
}

function matValue(p) {
  const m = seg(p, 0.06, 0.9) * 3;
  const k = Math.min(2, Math.floor(m));
  return m >= 3 ? 3 : k + gsap.parseEase('power1.inOut')(seg(m - k, 0.3, 0.8));
}
function poseMat(p) {
  const F = frames();
  const seat = { ...F.show, explode: 0, worn: 0, light: 1, spin: 0, head: 0, recline: 0, mat: matValue(p) };
  seat.yaw += Math.sin(p * Math.PI * 2) * 0.55;
  seat.pitch += Math.sin(p * Math.PI) * 0.06;
  seat.size *= 1 + 0.06 * Math.sin(p * Math.PI);
  return { seat, cloth: null };
}

function poseFinal(p) {
  const drop = gsap.parseEase('power3.out')(seg(p, 0.02, 0.24));
  const ar = innerWidth / innerHeight;
  return {
    seat: null,
    cloth: {
      nx: 0, ny: L(2.6, 0, drop), z: 0, size: Math.max(1.14, (1.14 * ar * 4) / 3.2), maxW: 99,
      rx: -0.12 * (1 - drop), ry: 0, rz: L(-0.12, 0, drop),
      wind: L(1.3, 0.35, drop) + seg(p, 0.36, 0.5) * 0.8, fold: 0.9, chalk: 0, cut: 0, stitch: 0, puff: 0, mat: 0,
      fly: io(seg(p, 0.4, 0.82)), freq: 0.45,
    },
  };
}

const POSES = { hero: poseHero, atolye: poseAtolye, mat: poseMat, final: poseFinal };

// --- Bölüm metinleri ------------------------------------------------------------

const heroEl = $('[data-hero]');
const stepsEl = $('[data-steps]');
const gaugeEl = $('[data-gauge]');
const show = (el, v) => gsap.set(el, { autoAlpha: v });
function textHero(p) {
  const out = seg(p, 0.35, 0.95);
  show(heroEl, 1 - out);
  heroEl.style.transform = `translate3d(0, ${(-out * 40).toFixed(1)}px, 0)`;
}

let stepNow = -1;
function textAtolye(p) {
  const inn = seg(p, 0.0, 0.035) * (1 - seg(p, 0.975, 1));
  show(stepsEl, inn);
  const k = stepOf(p);
  if (k !== stepNow) {
    const prev = stepNow;
    stepNow = k;
    railItems.forEach((li, i) => { li.classList.toggle('is-on', i === k); li.classList.toggle('is-done', i < k); });
    stepEls.forEach((el, i) => { el.classList.toggle('is-on', i === k); el.setAttribute('aria-hidden', i === k ? 'false' : 'true'); });
    const el = stepEls[k];
    if (prev !== -1 && !reducedMotion) gsap.fromTo(el.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out', overwrite: true });
  }
  const local = Math.round(seg(p, sA(k), sA(k + 1) - 0.02) * 100);
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
      gsap.fromTo([matName, matAlt, matTxt, matChips], { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: 'power3.out', overwrite: true });
    }
  }
  show(matBox, seg(p, 0, 0.04) * (1 - seg(p, 0.97, 1)));
}

const finalEl = $('[data-final]');
const finalHint = $('[data-final-hint]');
// Örtü sahnesi (z-index 40) main'in üstünde durur; ipucu görünsün diye body'ye taşınır.
const finalVeil = $('[data-final-veil]');
document.body.append(finalHint, finalVeil);
function textFinal(p) {
  const s = seg(p, 0.5, 0.74);
  show(finalEl, s);
  finalEl.style.transform = `translate3d(0, ${((1 - s) * 30).toFixed(1)}px, 0) scale(${(0.96 + s * 0.04).toFixed(3)})`;
  show(finalHint, seg(p, 0.1, 0.17) * (1 - seg(p, 0.38, 0.46)));
  const veil = seg(p, 0.12, 0.22) * (1 - seg(p, 0.38, 0.45));
  show(finalVeil, veil);
  finalVeil.style.transform = `translate3d(-50%, calc(-50% + ${(L(24, 0, seg(p, 0.12, 0.24)) - seg(p, 0.36, 0.45) * 120).toFixed(1)}px), 0)`;
}
const TEXT = { hero: textHero, atolye: textAtolye, mat: textMat, final: textFinal };

// Aktif bölüm: tepesine ulaşılmış son bölüm (bölümler -100vh ile üst üste biner).
// Pin bitip bölüm ekrandan çıkarken sahne kapanır (arkada boşuna çizilmez).
const chapters = $$('[data-ch]').map((el) => ({ id: el.dataset.ch, el }));
function scan() {
  const vh = innerHeight;
  let act = null;
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    const span = r.height - vh;
    const p = span > 0 ? clamp(-r.top / span) : 0.5;
    if (r.bottom > 0 && r.top < vh) TEXT[c.id](p);
    if (r.top <= 1 && r.bottom > vh * 0.45) act = { id: c.id, p };
  }
  if (!act) {
    const r = chapters[0].el.getBoundingClientRect();
    if (r.top > 1 && r.top < vh) act = { id: chapters[0].id, p: 0 };
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
  if (!id || done || !stage || document.hidden) return;
  stage.render(POSES[id](a.p), dt);
}

// --- Açılış (≤ 2,5 sn; dokununca geçilir; vitrin ve azaltılmış harekette yok) ------------

let lenis = null;
async function runIntro() {
  const intro = $('[data-intro]');
  const name = $('[data-intro-name]');
  const line = $('[data-intro-line]');
  const needle = $('[data-intro-needle]');
  const count = $('[data-intro-count]');
  name.textContent = d.isletme.ad;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    intro.remove();
    document.body.classList.remove('is-loading');
    lenis?.start();
    ScrollTrigger.refresh();
    heroIn();
  };
  const vitrin = document.documentElement.classList.contains('is-vitrin');
  if (reducedMotion || vitrin) { finish(); return; }
  const split = new SplitText(name, { type: 'chars' });
  const tl = gsap.timeline({ paused: true });
  const o = { v: 0 };
  tl.from(split.chars, { yPercent: 60, opacity: 0, duration: 0.4, stagger: 0.02, ease: 'power3.out' }, 0)
    .fromTo(o, { v: 0 }, {
      v: 1, duration: 0.95, ease: 'power1.inOut',
      onUpdate: () => {
        line.setAttribute('x2', (o.v * 1000).toFixed(1));
        needle.style.transform = `translate3d(${(o.v * 100).toFixed(2)}vw, 0, 0)`;
        count.textContent = String(Math.round(o.v * 120)).padStart(3, '0');
      },
    }, 0.1)
    .to(needle, { opacity: 0, duration: 0.15 }, '>-0.05')
    .to('[data-intro-top]', { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, '+=0.05')
    .to('[data-intro-bot]', { yPercent: 100, duration: 0.7, ease: 'power4.inOut' }, '<')
    .to('.intro__seam', { opacity: 0, duration: 0.25 }, '<')
    .add(() => { intro.style.pointerEvents = 'none'; heroIn(); }, '<0.25')
    .add(finish);
  // Dokunuş: perde hemen açılır
  intro.addEventListener('pointerdown', () => { tl.play(); tl.timeScale(5); }, { once: true });
  // Güvenlik: sahne ya da fontlar gecikse de perde 2,5 sn'de kalkar
  setTimeout(() => { if (!finished) { tl.play(); tl.timeScale(4); } }, 1600);
  setTimeout(finish, 2600);
  await Promise.race([Promise.all([document.fonts.ready, stageReady]), new Promise((r) => setTimeout(r, 900))]);
  tl.play();
}

let heroDone = false;
function heroIn() {
  if (heroDone) return;
  heroDone = true;
  if (reducedMotion) return;
  gsap.from('.ln__in', { yPercent: 110, duration: 1.0, stagger: 0.08, ease: 'power4.out' });
  gsap.from(['.hero__since', '.hero__slogan', '.hint'], { y: 24, opacity: 0, duration: 0.8, stagger: 0.07, delay: 0.25, ease: 'power3.out' });
  // Düğmeler: yalnız konum; ilk dokunuşta hep tıklanabilir kalsın
  gsap.from('.hero__cta', { y: 18, duration: 0.7, delay: 0.3, ease: 'power3.out' });
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
textAtolye(0);
scrollBits();
measureRegions();
document.fonts?.ready.then(measureRegions);
addEventListener('resize', () => requestAnimationFrame(measureRegions));
storyZone($('.ch--atolye'));
storyZone($('.ch--mat'));
gsap.ticker.add(frame);
runIntro();
