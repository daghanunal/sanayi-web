// Salyangoz (klasik aile, turbo): çelik grisi zemin, grafit mürekkep, ısıl renk geçişi
// (saman sarısı → bronz → temper moru → mavi; egzoz tarafında ısınan çeliğin rengi). WebGL yok.
// İmza anı hero'da: turbonun çıkış ağzından içeri dalış. Dairesel pencereler açılarak gövdeye,
// sonra çarka inilir; salyangoz sarmalı çizilir, mil devri 180.000 d/dk'ya çıkar.
import base from '../../data/sektor-turbo.json';
import extra from '../../data/turbo-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...base, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar -----------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımın turbosu için bilgi almak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => (el.textContent = status.text));
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Sarmal (salyangoz) yolu ------------------------------------------------
// Arşimet sarmalı: iç yarıçaptan dışa 1,2 tur, sonra teğet çıkış borusu.
function volutePath(r0 = 30, r1 = 92, turns = 1.2, outlet = 70) {
  const n = 90, pts = [];
  const total = turns * Math.PI * 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = -Math.PI / 2 + t * total, r = r0 + (r1 - r0) * t;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const aEnd = -Math.PI / 2 + total;
  const [ex, ey] = pts.at(-1);
  const tx = -Math.sin(aEnd), ty = Math.cos(aEnd);
  let dStr = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) dStr += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  dStr += `L${(ex + tx * outlet).toFixed(1)} ${(ey + ty * outlet).toFixed(1)}`;
  return dStr;
}
const VOLUTE = volutePath();
$('[data-volute-path]').setAttribute('d', VOLUTE);
$('[data-final-spiral]').setAttribute('d', volutePath(8, 88, 2.4, 0));

// --- Çizim çark ------------------------------------------------------------
(function drawWheel() {
  const g = $('[data-blades]');
  const blade = (a0, rIn, rOut, sweep) => {
    let s = '';
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, r = rIn + (rOut - rIn) * t, a = a0 + sweep * t * t;
      s += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
    }
    return s;
  };
  let html = '';
  const N = 7;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    html += `<path class="wheel__blade" d="${blade(a, 17, 92, 0.95)}"/>`;
    html += `<path class="wheel__split" d="${blade(a + Math.PI / N, 42, 90, 0.6)}"/>`;
  }
  g.innerHTML = html;
})();

// --- Hero: dalış -------------------------------------------------------------
const hero = $('.hero');
const pin = $('.hero__pin');
const frames = $$('.dive__frame', hero);
const small = () => innerWidth < 900;
// Odak noktası: her karede turbonun ağzı / çarkın merkezi (görsel oranı olarak).
const FOCI = {
  1: () => (small() ? [0.74, 0.46] : [0.69, 0.36]),
  2: () => [0.6, 0.52],
  3: () => [0.68, 0.29],
};
let C = [0, 0], RMAX = 1, VW = 1, VH = 1;
const volG = $('[data-volute]');
const volPath = $('[data-volute-path]');
const volGr = $('[data-volute-g]');
const ring = $('[data-ring]');
const wheel = $('[data-wheel]');

function layout() {
  VW = pin.clientWidth; VH = pin.clientHeight;
  C = small() ? [VW * 0.6, VH * 0.34] : [VW * 0.7, VH * 0.5];
  RMAX = Math.hypot(Math.max(C[0], VW - C[0]), Math.max(C[1], VH - C[1])) + 8;
  frames.forEach((fr) => {
    const img = $('img', fr);
    const w = img.naturalWidth || (fr.dataset.frame === '1' && !small() ? 1920 : 1100);
    const h = img.naturalHeight || (fr.dataset.frame === '1' && !small() ? 1280 : 1650);
    const [fx, fy] = FOCI[fr.dataset.frame]();
    const k = Math.max(VW / w, VH / h, C[0] / (fx * w), (VW - C[0]) / ((1 - fx) * w), C[1] / (fy * h), (VH - C[1]) / ((1 - fy) * h));
    Object.assign(img.style, {
      width: `${w * k}px`, height: `${h * k}px`,
      left: `${C[0] - fx * w * k}px`, top: `${C[1] - fy * h * k}px`,
      transformOrigin: `${fx * 100}% ${fy * 100}%`,
    });
  });
  volG.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  const ws = Math.min(VW, VH) * (small() ? 0.62 : 0.5);
  Object.assign(wheel.style, { width: `${ws}px`, height: `${ws}px`, left: `${C[0] - ws / 2}px`, top: `${C[1] - ws / 2}px` });
  if (heroP != null) render(heroP);
}

// Aşamalar: sürecin ilk üç adımı
const stagesEl = $('[data-stages]');
stagesEl.innerHTML = d.surec.slice(0, 3).map((s, i) => `<li><span>0${i + 1}</span>${esc(s.baslik)}</li>`).join('');
const stageLis = $$('li', stagesEl);
const rpmEl = $('[data-rpm]');
const rpmBar = $('[data-rpm-bar]');
const RPM_MAX = 180000;
let rpm = 0, heroP = null, stage = -1;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const eIn = (t) => t * t * t;
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const img1 = $('[data-frame="1"] img'), img2 = $('[data-frame="2"] img'), img3 = $('[data-frame="3"] img');
const f2 = frames[1], f3 = frames[2];
const shade = $('.dive__shade');
const copy = $('.hero__copy'), hud = $('.hud'), endEl = $('.hero__end'), hint = $('.hero__hint');

function circle(el, r) {
  el.style.clipPath = r <= 0.5 ? 'circle(0px at 0 0)' : `circle(${r.toFixed(1)}px at ${C[0].toFixed(1)}px ${C[1].toFixed(1)}px)`;
  el.style.visibility = r <= 0.5 ? 'hidden' : 'visible';
}

function render(p) {
  heroP = p;
  // Kare 1: ağza doğru yaklaş
  const a = seg(p, 0, 0.42);
  img1.style.transform = `scale(${(1 + eIn(a) * 2.4).toFixed(4)})`;
  // Kare 2: ağızdan açılan pencere
  const b = seg(p, 0.1, 0.42);
  const r2 = b * b * RMAX;
  circle(f2, r2);
  const b2 = seg(p, 0.42, 0.8);
  img2.style.transform = `scale(${(1.9 - eOut(b) * 0.9 + eIn(b2) * 2.2).toFixed(4)})`;
  // Kare 3: çark
  const c = seg(p, 0.46, 0.8);
  const r3 = c * c * RMAX;
  circle(f3, r3);
  img3.style.transform = `scale(${(1.7 - eOut(c) * 0.6).toFixed(4)})`;
  // Sarmal: açılan pencerenin kenarını takip eder
  const rr = p < 0.44 ? r2 : r3;
  const vs = Math.max(rr, 0.001) / 92 * 1.02;
  const drawT = p < 0.44 ? seg(p, 0.04, 0.3) : seg(p, 0.46, 0.66);
  const fade = p < 0.44 ? 1 - seg(p, 0.34, 0.42) : 1 - seg(p, 0.74, 0.8);
  volGr.setAttribute('transform', `translate(${C[0].toFixed(1)} ${C[1].toFixed(1)}) rotate(${(p * 220).toFixed(1)}) scale(${Math.max(vs, 0.35).toFixed(4)})`);
  volPath.style.strokeDashoffset = (1 - drawT).toFixed(4);
  ring.setAttribute('cx', C[0].toFixed(1)); ring.setAttribute('cy', C[1].toFixed(1));
  ring.setAttribute('r', Math.max(0, rr - 1).toFixed(1));
  ring.style.opacity = (rr > 2 && rr < RMAX * 0.97 ? 1 : 0).toString();
  volPath.style.opacity = (fade * Math.min(1, drawT * 4)).toFixed(3);
  // Karartma ve çizim çark
  const e = seg(p, 0.76, 0.9);
  shade.style.opacity = (0.35 + eOut(e) * 0.4).toFixed(3);
  wheel.style.opacity = eOut(e).toFixed(3);
  wheel.style.setProperty('--ws', (0.7 + eOut(e) * 0.3).toFixed(3));
  // Metinler
  copy.style.opacity = (1 - seg(p, 0.02, 0.14)).toFixed(3);
  copy.style.transform = `translate3d(0, ${(-seg(p, 0.02, 0.14) * 40).toFixed(1)}px, 0)`;
  copy.style.visibility = p > 0.15 ? 'hidden' : 'visible';
  hint.style.opacity = (1 - seg(p, 0, 0.05)).toFixed(3);
  const hudIn = seg(p, 0.06, 0.14);
  hud.style.opacity = hudIn.toFixed(3);
  stagesEl.style.opacity = (hudIn * (1 - seg(p, 0.86, 0.92))).toFixed(3);
  endEl.style.opacity = eOut(seg(p, 0.86, 0.97)).toFixed(3);
  endEl.style.transform = `translate3d(0, ${((1 - eOut(seg(p, 0.86, 0.97))) * 30).toFixed(1)}px, 0)`;
  // Devir: önce ağır, sonra hızla toplar
  rpm = RPM_MAX * Math.pow(seg(p, 0.06, 0.9), 2.2);
  rpmEl.textContent = nf(Math.round(rpm / 100) * 100);
  rpmBar.style.transform = `scaleX(${(rpm / RPM_MAX).toFixed(4)})`;
  hero.classList.toggle('is-max', rpm >= RPM_MAX * 0.995);
  const st = p < 0.36 ? 0 : p < 0.66 ? 1 : 2;
  if (st !== stage) {
    stage = st;
    stageLis.forEach((li, i) => li.classList.toggle('is-on', i === st));
  }
}

// Çarkı devire göre döndür (yalnızca görünürken)
let angle = 0, heroVisible = true;
const wheelSvg = $('[data-wheel-svg]');
const blurEl = $('.wheel__blur');
gsap.ticker.add((t, dt) => {
  if (!heroVisible || heroP == null || heroP < 0.74) return;
  const k = rpm / RPM_MAX;
  angle = (angle + dt * 0.001 * (40 + 640 * k)) % 360;
  wheelSvg.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  blurEl.style.opacity = (k * k * 0.9).toFixed(3);
});

if (reducedMotion) {
  hero.classList.add('is-static');
  layout();
  rpmEl.textContent = nf(RPM_MAX);
} else {
  layout();
  frames.forEach((fr) => {
    const im = $('img', fr);
    if (!im.complete) im.addEventListener('load', layout, { once: true });
  });
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small() ? 2.4 : 2.6)}`,
    pin: pin, scrub: 0.4, anticipatePin: 1,
    onUpdate: (self) => render(self.progress),
    onToggle: (self) => (heroVisible = self.isActive || self.progress < 1),
    onRefresh: (self) => render(self.progress),
  });
  ScrollTrigger.create({
    trigger: hero, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => (heroVisible = self.isActive),
  });
  ScrollTrigger.addEventListener('refreshInit', layout);
  render(0);

  // Açılış
  gsap.from('.hero__name', { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta'], { y: 14, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  // Açılışta sarmal bir kez çizilip söner: "buradan girilir" ipucu
  const intro = { t: 0 };
  gsap.fromTo(intro, { t: 0 }, {
    t: 1, duration: 1.8, ease: 'power2.inOut', delay: 0.5,
    onUpdate: () => {
      if (window.scrollY > 4) return;
      const s = 0.42 + intro.t * 0.2;
      volGr.setAttribute('transform', `translate(${C[0].toFixed(1)} ${C[1].toFixed(1)}) rotate(${(intro.t * 120).toFixed(1)}) scale(${s.toFixed(3)})`);
      volPath.style.strokeDashoffset = (1 - Math.min(1, intro.t * 1.6)).toFixed(3);
      volPath.style.opacity = (1 - seg(intro.t, 0.7, 1)).toFixed(3);
    },
  });
}
addEventListener('resize', () => { if (reducedMotion) layout(); });

// --- Rakamlar ---------------------------------------------------------------
const statsEl = $('[data-stats]');
statsEl.innerHTML = d.istatistikler.map((s) => {
  const v = s.kurulustanHesapla ? yil : s.deger;
  return `<li class="stat"><p class="stat__v"><b data-count="${v}">${nf(v)}</b><span>${esc(s.sonek)}</span></p><p class="stat__l">${esc(s.etiket)}</p></li>`;
}).join('');
if (!reducedMotion) {
  $$('[data-count]', statsEl).forEach((el) => {
    const v = Number(el.dataset.count), o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: statsEl, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = nf(o.v)),
    });
  });
}

// --- Belirti → parça -------------------------------------------------------
const parcaById = Object.fromEntries(d.parcalar.map((p) => [p.id, p]));
const pinsEl = $('[data-pins]');
pinsEl.innerHTML = d.parcalar.map((p) => `
  <button type="button" class="pin" style="left:${Number(p.x)}%;top:${Number(p.y)}%" data-part="${esc(p.id)}" aria-label="${esc(p.ad)}">
    <span>${esc(p.no)}</span>
  </button>`).join('');
const capEl = $('[data-parca-cap]');
function showPart(id) {
  const p = parcaById[id];
  if (!p) return;
  $$('.pin', pinsEl).forEach((b) => b.classList.toggle('is-on', b.dataset.part === id));
  capEl.innerHTML = `<b>${esc(p.no)} · ${esc(p.ad)}</b><span>${esc(p.metin)}</span>`;
}
pinsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.pin');
  if (b) showPart(b.dataset.part);
});

const opts = $('[data-opts]');
const res = $('[data-res]');
opts.innerHTML = d.belirtiler.map((b, i) => `
  <button type="button" class="opt" role="radio" aria-checked="${i === 0}" data-i="${i}">
    <span class="opt__n mono">${String(i + 1).padStart(2, '0')}</span><span class="opt__t">${esc(b.ad)}</span>
  </button>`).join('');
function showSymptom(i, animate) {
  const b = d.belirtiler[i];
  $$('.opt', opts).forEach((o, j) => o.setAttribute('aria-checked', String(j === i)));
  const msg = `Merhaba ${d.isletme.ad}, aracımda şu şikâyet var: ${b.ad.toLocaleLowerCase('tr-TR')}. Turboya bakabilir misiniz?`;
  const part = parcaById[b.parca];
  res.innerHTML = `
    <div class="res">
      <p class="res__k mono">Genelde sebep</p>
      <p class="res__sebep">${esc(b.sebep)}</p>
      <p class="res__k mono">Biz ne yaparız</p>
      <p class="res__txt">${esc(b.yapilan)}</p>
      <div class="res__row">
        ${part ? `<span class="res__part mono">Bakılan yer: ${esc(part.no)} · ${esc(part.ad)}</span>` : ''}
        <a class="btn btn--tint" href="${esc(waHref(d, msg))}" target="_blank" rel="noopener">${icons.whatsapp}WhatsApp'tan sor</a>
      </div>
    </div>`;
  showPart(b.parca);
  if (animate && !reducedMotion) gsap.from(res.firstElementChild, { opacity: 0, y: 12, duration: 0.4, ease: 'power2.out' });
}
opts.addEventListener('click', (e) => {
  const o = e.target.closest('.opt');
  if (o) showSymptom(Number(o.dataset.i), true);
});
opts.addEventListener('keydown', (e) => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault();
  const all = $$('.opt', opts);
  const cur = all.findIndex((o) => o.getAttribute('aria-checked') === 'true');
  const n = (cur + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
  all[n].focus();
  showSymptom(n, true);
});
showSymptom(0, false);

// --- Hizmetler ---------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc">
    <span class="svc__n mono">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__t">${esc(h.baslik)}</h3>
    <p class="svc__d">${esc(h.aciklama)}</p>
    <span class="svc__s mono">${esc(h.sure)}</span>
  </li>`).join('');

// --- Süreç ------------------------------------------------------------------
const steps = $('[data-steps]');
steps.innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__n mono">${i + 1}</span>
    <h3 class="step__t">${esc(s.baslik)}</h3>
    <p class="step__d">${esc(s.aciklama)}</p>
  </li>`).join('');

// --- Galeri, yorumlar, markalar -------------------------------------------
$('[data-gallery]').innerHTML = d.galeri.map((g) => `
  <figure class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>`).join('');

$('[data-score]').textContent = Number(d.puan.ortalama).toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${d.puan.ortalama}`);
$('[data-review-count]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="5 üzerinden ${Number(y.puan)}">${icons.star.repeat(Number(y.puan))}</p>
    <blockquote class="rev__t">${esc(y.metin)}</blockquote>
    <p class="rev__who"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac)}</span></p>
  </li>`).join('');

const brandHtml = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandHtml}<i aria-hidden="true"></i></div><div class="marka__row" aria-hidden="true">${brandHtml}<i></i></div>`;

// --- Saatler + harita ------------------------------------------------------
const today = new Date().getDay();
const order = [1, 2, 3, 4, 5, 6, 0];
const groups = groupedHours(d.saatler);
let gi = 0;
// Bugünün hangi grupta olduğunu groupedHours ile aynı kuralla bul
const todayGroup = (() => {
  let g = -1, prev;
  for (let i = 0; i < order.length; i++) {
    const v = d.saatler[order[i]];
    if (i === 0 || v !== prev) g++;
    prev = v;
    if (order[i] === today) return g;
  }
  return -1;
})();
$('[data-hours]').innerHTML = groups.map(([g, v]) => `
  <div class="hours__row${gi++ === todayGroup ? ' is-today' : ''}"><dt>${esc(g)}</dt><dd class="mono">${esc(v)}</dd></div>`).join('');

const mapEl = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapEl);

// Üst çubuk: hero bitince koyu zemin
const top = $('.top');
ScrollTrigger.create({
  trigger: '.band', start: 'top bottom-=8',
  onEnter: () => top.classList.add('is-solid'), onLeaveBack: () => top.classList.remove('is-solid'),
});

// --- Bölüm hareketleri ---------------------------------------------------------
initSmoothScroll();
if (!reducedMotion) {
  $$('.h2').forEach((h) => gsap.from(h, {
    y: 28, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: h, start: 'top 88%', once: true },
  }));
  gsap.from('.svc', {
    y: 24, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out',
    scrollTrigger: { trigger: '.hizmet__list', start: 'top 85%', once: true },
  });
  // Süreç çizgisi kaydırdıkça ısınır
  gsap.fromTo('.steps', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 55%', scrub: 0.4 },
  });
  $$('.step').forEach((s) => ScrollTrigger.create({
    trigger: s, start: 'top 68%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on'),
  }));
  gsap.fromTo('.parca img', { scale: 1.12 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.parca', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.atolye__photo img', { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('[data-final-spiral]', { strokeDashoffset: 1 }, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top 80%', end: 'center center', scrub: 0.5 },
  });
  gsap.fromTo('.final__bg', { scale: 1.15 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
} else {
  $('.steps').style.setProperty('--fill', 1);
  $$('.step').forEach((s) => s.classList.add('is-on'));
}
