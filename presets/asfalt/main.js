// Asfalt (kinetik aile): sayfa üstten görülen bir yol. Başlıklar yola boyanmış işaretler,
// lastik izleri bölümleri keser, fren mesafesi yan yana iki şeritte oynar. WebGL yok.
import pist from '../../data/pist.json';
import extra from '../../data/asfalt.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { car, treadDefs, track, arrow, speedSign, steering, asphaltTexture, wornMask } from './marks.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...pist, ...extra, preset: 'asfalt' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, digits = 0) =>
  Number(n).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const isMobile = () => innerWidth < 900;
const upper = (s) => s.toLocaleUpperCase('tr-TR');

// "2004'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Dokular -----------------------------------------------------------------

const root = document.documentElement;
root.style.setProperty('--asfalt-img', `url(${asphaltTexture()})`);
root.style.setProperty('--worn', `url(${wornMask()})`);
// Desen tanımları iki renkte: asfalttaki iz (tozlu gri) ve lastiğin kendisi (kauçuk).
$('[data-tread-defs]').innerHTML = `
  <g class="defs--iz">${treadDefs('iz')}</g>
  <g class="defs--ty">${treadDefs('ty')}</g>`;

// --- Metinler ---------------------------------------------------------------

const yil = new Date().getFullYear();
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti, balans: d.balans,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('[data-wa-otel]').href = waHref(d, `Merhaba ${d.isletme.ad}, lastik oteli için yer ayırtmak istiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-since]').textContent = `Şaşmaz Oto Sanayi'de ${ablative(d.isletme.kurulus)} beri`;
$('[data-copy]').textContent = `© ${yil} ${d.isletme.ad}. Fotoğraflar: Pexels.`;

// Hero: dükkân adı yola boyanmış satırlar halinde. Kısa kelimeler ("&") sonrakine bağlanır;
// satır sayısı ekran oranına göre (fitHero) en büyük harfi verecek şekilde seçilir.
const words = [];
for (const w of upper(d.isletme.ad).split(/\s+/).filter(Boolean)) {
  const prev = words.at(-1);
  if (prev && prev.length <= 2 && !prev.includes(' ')) words[words.length - 1] = `${prev} ${w}`;
  else words.push(w);
}
const heroMarks = $('[data-hero-marks]');
heroMarks.setAttribute('aria-label', d.isletme.ad);
let lines = words;
const renderMarks = () =>
  (heroMarks.innerHTML = lines.map((l) => `<span class="hm" aria-hidden="true"><span class="hm__t">${esc(l)}</span></span>`).join(''));
renderMarks();

$('[data-hero-car]').innerHTML = car({ id: 'hero' });
$('[data-hero-tracks]').innerHTML = [0, 1]
  .map(() => `<svg class="hero__track" viewBox="0 0 60 1000" preserveAspectRatio="none">${track('dortmevsim', 1000, 'iz')}</svg>`)
  .join('');

// Hizmetler
const OKLAR = ['duz', 'sag', 'duz', 'sol', 'duz', 'sag', 'sol'];
$('[data-hizmet]').innerHTML = d.hizmetler
  .map((h, i) => {
    const [ust, ...alt] = String(h.sure).split(' ');
    return `
    <li class="lane">
      <span class="lane__arrow">${arrow(OKLAR[i % OKLAR.length])}</span>
      <div class="lane__body">
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
      </div>
      <span class="lane__sign" title="Ortalama süre">${speedSign(esc(ust), esc(alt.join(' ')))}</span>
    </li>`;
  })
  .join('');

// Kilometre taşları
const stats = d.istatistikler.map((s) =>
  s.deger === 'kurulus' ? { ...s, deger: yil - d.isletme.kurulus } : s
);
$('[data-stats]').innerHTML = stats
  .map(
    (s) => `
    <li class="stone">
      <span class="stone__cap"></span>
      <b data-count="${Number(s.deger)}">${nf(s.deger)}${esc(s.sonek || '')}</b>
      <span>${esc(s.etiket)}</span>
    </li>`
  )
  .join('');

// Diş desenleri
$('[data-desen]').innerHTML = d.desenler
  .map(
    (t) => `
    <article class="tread" data-tread="${t.id}">
      <div class="tread__strip" aria-hidden="true">
        <svg class="tread__print" viewBox="0 0 60 420" preserveAspectRatio="none">${track(t.id, 420, 'iz')}</svg>
        <svg class="tread__tyre" viewBox="0 0 60 96"><rect width="60" height="96" rx="12" fill="#121315"/><rect x="0" y="0" width="60" height="96" rx="12" fill="url(#ty-${t.id})" data-tyre-fill/></svg>
      </div>
      <div class="tread__body">
        <p class="tread__word" aria-hidden="true"><span>${esc(t.kisa)}</span></p>
        <h3>${esc(t.baslik)}</h3>
        <p class="tread__temp">${esc(t.sicaklik)}</p>
        <p>${esc(t.metin)}</p>
        <p class="tread__when">${esc(t.zaman)}</p>
      </div>
    </article>`
  )
  .join('');

// Fren
const F = d.fren;
$('[data-fren-title]').textContent = `${F.hiz} km/s'ten fren. Aynı araç, iki farklı lastik.`;
$('[data-fren-not]').textContent = `${F.zemin}. ${F.not}`;
for (const key of ['yeni', 'asinmis']) {
  const L = F[key];
  $(`[data-lane="${key}"]`).innerHTML = `
    <div class="fren__read">
      <p class="fren__label">${esc(L.etiket)}<small>${esc(L.dis)}</small></p>
      <p class="fren__m"><b data-m>0,0</b> m</p>
      <p class="fren__v"><b data-v>${F.hiz}</b> km/s</p>
    </div>
    <i class="fren__skid" data-skid></i>
    <div class="fren__car" data-fcar>${car({ id: `f-${key}`, body: key === 'yeni' ? '#e9e7e1' : '#c9c6bd' })}</div>`;
}
$('[data-fark]').textContent = `+${F.asinmis.mesafe - F.yeni.mesafe} m`;

// Rot
$('[data-rot-car]').innerHTML = car({ id: 'rot' });
$('[data-steer]').innerHTML = steering;
const rotState = (k) => `<h2 class="h2">${esc(d.rot[k].baslik)}</h2><p class="lead">${esc(d.rot[k].metin)}</p>`;
$('[data-rot-state]').innerHTML = rotState('once');
$('[data-rot-deger]').textContent = d.rot.once.deger;

// Otel
$('[data-otel-title]').textContent = d.otel.baslik;
$('[data-otel-text]').textContent = d.otel.metin;
$('[data-bays]').innerHTML = `
  <li class="bay bay--photo"><img src="${esc(d.otel.gorsel)}" alt="Etiketli lastikler rafta" loading="lazy"></li>
  ${d.otel.maddeler.map((m, i) => `<li class="bay"><span class="bay__no">B-${String(i + 11)}</span><p>${esc(m)}</p></li>`).join('')}`;

// Galeri
$('[data-galeri]').innerHTML = d.galeri
  .map(
    (g, i) => `
    <li class="plate ${i % 3 === 1 ? 'plate--sign' : 'plate--rogar'}">
      <figure><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy"></figure>
    </li>`
  )
  .join('');

// Markalar (iki kopya: kesintisiz döngü)
const brandHtml = d.markalar.map((m) => `<span>${esc(upper(m))}</span><i></i>`).join('');
$('[data-marquee-track]').innerHTML = `<div>${brandHtml}</div><div aria-hidden="true">${brandHtml}</div>`;

// Yorumlar
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
$('[data-puan]').innerHTML = `
  ${speedSign(nf(d.puan.ortalama, 1))}
  <p><span class="yorum__stars" aria-label="5 üzerinden ${nf(d.puan.ortalama, 1)}">★★★★★</span>${nf(d.puan.adet)} değerlendirme</p>`;
$('[data-yorumlar]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <li class="review">
      <p class="review__stars" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</p>
      <blockquote>${esc(y.metin)}</blockquote>
      <p class="review__who">${esc(y.ad)}<small>${esc(y.arac)}</small></p>
    </li>`
  )
  .join('');

// Saatler ve durum
const st = openStatus(d.saatler);
$('[data-status]').innerHTML = `<i class="${st.open ? 'on' : ''}"></i><span class="long">${esc(st.text)}</span><span class="short">${st.open ? 'Açık' : 'Kapalı'}</span>`;
$('[data-status-long]').textContent = st.text;
const openMark = $('[data-open-mark]');
openMark.classList.toggle('is-closed', !st.open);
openMark.querySelector('span').textContent = st.open ? 'AÇIK' : 'KAPALI';
// Bugünün satırı: "Pazartesi – Cuma" gibi aralıkları da yakalar.
const SIRA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const bugunAd = SIRA[(new Date().getDay() + 6) % 7];
const bugunMu = (gun) => {
  const [a, b = a] = gun.split(' – ');
  const i = SIRA.indexOf(bugunAd);
  return i >= SIRA.indexOf(a) && i <= SIRA.indexOf(b);
};
$('[data-saatler]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => `<tr class="${bugunMu(gun) ? 'is-today' : ''}"><th>${esc(gun)}</th><td>${esc(saat)}</td></tr>`)
  .join('');
const adresParca = d.iletisim.adres.split(',').map((s) => s.trim());
$('[data-yon]').innerHTML = `
  <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 L34 20 L25 20 L25 36 L15 36 L15 20 L6 20 Z" fill="currentColor"/></svg>
  <p><b>${esc(adresParca[0] || '')}</b>${esc(adresParca.slice(1).join(', '))}</p>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px 0px' }
).observe(mapBox);

$('[data-final-car]').innerHTML = car({ id: 'final' });

// --- Hareket -----------------------------------------------------------------

const lenis = initSmoothScroll();

// Header: hero geçince zemin alır
ScrollTrigger.create({
  trigger: '[data-hero]', start: 'bottom top+=80', end: 'max',
  onToggle: (s) => $('[data-top]').classList.toggle('is-solid', s.isActive),
});

// Kaydırma hızı: işaretler hızlandıkça uzar (hareket bulanıklığı hissi)
let vel = 0;
if (!reducedMotion && lenis) {
  const setVel = gsap.quickSetter(root, '--vel');
  gsap.ticker.add(() => {
    const target = Math.min(1, Math.abs(lenis.velocity) / 60);
    vel += (target - vel) * 0.12;
    setVel(vel.toFixed(3));
  });
}

// Hero satırlarını genişliğe sığdır: kelimeleri 1..n satıra bölen her düzeni dener,
// harf yüksekliği en büyük olanı seçer (hepsi aynı boy, yol yazısı gibi).
const measurer = document.createElement('span');
measurer.className = 'hm__t hm__measure';
heroMarks.append(measurer);
const widthOf = (text) => ((measurer.textContent = text), measurer.getBoundingClientRect().width);
function fitHero() {
  const w = heroMarks.clientWidth;
  const sy = parseFloat(getComputedStyle(heroMarks).getPropertyValue('--sy')) || 1.9;
  const hMax = innerHeight * (isMobile() ? 0.5 : 0.52);
  measurer.style.fontSize = '100px';
  let best = { fs: 0, lines: words };
  const n = words.length;
  // tüm bölünmeler (kelime sayısı küçük; 2^(n-1) düzen)
  for (let mask = 0; mask < 1 << (n - 1); mask++) {
    const ls = [];
    let cur = words[0];
    for (let i = 1; i < n; i++) {
      if (mask & (1 << (i - 1))) { ls.push(cur); cur = words[i]; } else cur += ` ${words[i]}`;
    }
    ls.push(cur);
    const widest = Math.max(...ls.map(widthOf));
    const fs = Math.min((w / widest) * 100, hMax / ls.length / sy / 0.8, 340);
    if (fs > best.fs) best = { fs, lines: ls };
  }
  measurer.textContent = '';
  heroMarks.style.setProperty('--fs', `${best.fs.toFixed(1)}px`);
  if (best.lines.join('|') !== lines.join('|')) {
    lines = best.lines;
    renderMarks();
    heroMarks.append(measurer);
  }
}

document.fonts.ready.then(() => {
  fitHero();
  if (reducedMotion) return staticState();
  intro();
  heroScroll();
  marks();
  hizmetler();
  taslar();
  desenler();
  fren();
  rot();
  otel();
  galeri();
  marquee();
  yorumlar();
  final();
  ScrollTrigger.refresh();
});
addEventListener('resize', () => {
  fitHero();
});

// Açılış: dükkân adı yola boyanır, araç aşağıdan girer
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo('.hm', { clipPath: 'inset(100% 0 -40% 0)' }, { clipPath: 'inset(-40% 0 -40% 0)', duration: 0.9, stagger: 0.16, ease: 'power2.inOut' })
    .fromTo('[data-hero-car]', { yPercent: 160 }, { yPercent: 0, duration: 1.2 }, 0.2)
    .from(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__speed'], { y: 20, opacity: 0, duration: 0.7, stagger: 0.07 }, 0.7)
    .from('.hero__hint', { opacity: 0, duration: 0.6 }, 1.3);
}

// Hero: pinli; araç yukarı çıkar, arkasında iz kalır, işaretler altından kayar
function heroScroll() {
  const hero = $('[data-hero]');
  const speed = $('[data-speed]');
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * 1.3}`, pin: true, scrub: 0.6,
      onUpdate: (s) => (speed.textContent = Math.round(Math.pow(s.progress, 0.8) * 92)),
    },
  });
  tl.to('[data-hero-car]', { y: () => -innerHeight * 1.25, ease: 'power2.in', duration: 1 }, 0)
    .fromTo('[data-hero-tracks]', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', ease: 'power2.in', duration: 1 }, 0)
    .to('[data-hero-marks]', { y: () => -innerHeight * 0.14, duration: 1 }, 0)
    .to('.hero__copy', { y: -60, opacity: 0, duration: 0.35 }, 0.62)
    .to('.hero__hint', { opacity: 0, duration: 0.1 }, 0)
    .to('.hero__speed', { opacity: 0, duration: 0.2 }, 0.8);
}

// Bölüm işaretleri: yola boyanır (alttan üste), geçerken hafif paralaks
function marks() {
  $$('[data-mark]').forEach((m) => {
    const span = m.querySelector('span');
    gsap.fromTo(span, { clipPath: 'inset(100% 0 -30% 0)' }, {
      clipPath: 'inset(-30% 0 -30% 0)', ease: 'none',
      scrollTrigger: { trigger: m, start: 'top 92%', end: 'top 45%', scrub: 0.4 },
    });
    gsap.fromTo(m, { y: 50 }, {
      y: -50, ease: 'none',
      scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

function hizmetler() {
  $$('.lane').forEach((li) => {
    gsap.fromTo(li.querySelector('.arrow'), { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', ease: 'none',
      scrollTrigger: { trigger: li, start: 'top 90%', end: 'top 55%', scrub: 0.4 },
    });
    gsap.fromTo(li.querySelector('.lane__body'), { x: -24, opacity: 0 }, {
      x: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 78%', toggleActions: 'play none none reverse' },
    });
    gsap.fromTo(li.querySelector('.sign'), { rotateY: 90, scale: 0.7 }, {
      rotateY: 0, scale: 1, duration: 0.7, ease: 'back.out(2)',
      scrollTrigger: { trigger: li, start: 'top 74%', toggleActions: 'play none none reverse' },
    });
  });
}

function taslar() {
  $$('.stone').forEach((el, i) => {
    const b = el.querySelector('[data-count]');
    const end = Number(b.dataset.count);
    const suffix = b.textContent.replace(/[\d.]/g, '');
    const o = { v: 0 };
    gsap.fromTo(el, { y: 60, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.7, delay: i * 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: '.stones', start: 'top 80%', once: true },
      onStart: () => gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => (b.textContent = nf(o.v) + suffix) }),
    });
  });
}

// Lastik izleri: lastik aşağı yuvarlanır, arkasında desen kalır
function desenler() {
  $$('.tread').forEach((el) => {
    const strip = el.querySelector('.tread__strip');
    const print = el.querySelector('.tread__print');
    const tyre = el.querySelector('.tread__tyre');
    const pat = document.getElementById(`ty-${el.dataset.tread}`);
    const st = { trigger: el, start: 'top 80%', end: 'bottom 55%', scrub: 0.5 };
    gsap.fromTo(print, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'none', scrollTrigger: st });
    gsap.fromTo(tyre, { y: 0 }, {
      y: () => strip.clientHeight - tyre.clientHeight, ease: 'none', scrollTrigger: { ...st, invalidateOnRefresh: true },
      onUpdate() {
        pat?.setAttribute('patternTransform', `translate(0 ${(-this.progress() * 420).toFixed(1)})`);
      },
    });
    gsap.fromTo(el.querySelector('.tread__word span'), { clipPath: 'inset(100% 0 -30% 0)' }, {
      clipPath: 'inset(-30% 0 -30% 0)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'top 50%', scrub: 0.4 },
    });
  });
}

// Fren mesafesi: iki şerit, aynı hızdan fren; aşınmış lastik yaya geçidinin üstünde durur
function fren() {
  const road = $('[data-fren-road]');
  const v = F.hiz / 3.6;
  const lanes = ['yeni', 'asinmis'].map((key) => {
    const D = F[key].mesafe;
    const el = $(`[data-lane="${key}"]`);
    return { key, D, a: (v * v) / (2 * D), t: (2 * D) / v, el, car: $('[data-fcar]', el), skid: $('[data-skid]', el), m: $('[data-m]', el), vv: $('[data-v]', el) };
  });
  const tMax = Math.max(...lanes.map((l) => l.t));
  const bracket = $('[data-bracket]');
  const gecit = $('[data-gecit]');
  let ppm = 1, y0 = 0, carH = 0;

  function layout() {
    const H = road.clientHeight;
    carH = lanes[0].car.offsetHeight;
    const top = isMobile() ? 118 : 104;
    ppm = (H - carH - top - 20) / (F.asinmis.mesafe + 2);
    y0 = H - carH - 12;
    gecit.style.top = `${y0 - F.gecit * ppm - 3.5 * ppm}px`;
    gecit.style.height = `${3.5 * ppm}px`;
    const yY = y0 - F.yeni.mesafe * ppm, yA = y0 - F.asinmis.mesafe * ppm;
    bracket.style.top = `${yA}px`;
    bracket.style.height = `${yY - yA}px`;
    lanes.forEach((l) => {
      l.skid.style.top = `${y0 + carH * 0.2 - l.D * ppm}px`;
      l.skid.style.height = `${l.D * ppm}px`;
    });
    draw(last);
  }

  let last = 0;
  function draw(p) {
    last = p;
    const T = Math.min(1, p / 0.86) * tMax;
    lanes.forEach((l) => {
      const tt = Math.min(T, l.t);
      const s = v * tt - (l.a * tt * tt) / 2;
      const sp = Math.max(0, v - l.a * T) * 3.6;
      l.car.style.transform = `translate3d(-50%, ${(y0 - s * ppm).toFixed(1)}px, 0)`;
      l.skid.style.transform = `scaleY(${(s / l.D).toFixed(4)})`;
      l.m.textContent = nf(s, 1);
      l.vv.textContent = Math.round(sp);
      l.el.classList.toggle('is-stopped', T >= l.t);
    });
    bracket.classList.toggle('is-on', T >= tMax);
  }

  ScrollTrigger.create({
    trigger: '[data-fren]', start: 'top top', end: () => `+=${innerHeight * 1.8}`, pin: true, scrub: 0.5,
    onUpdate: (s) => draw(s.progress),
    onRefresh: layout,
  });
  layout();
}

// Rot: yalpalayan iz çizilir, sonra düz iz; araç yolu takip eder
function rot() {
  const box = $('.rot__road');
  const svg = $('[data-rot-svg]');
  const bad = $('[data-rot-bad]');
  const good = $('[data-rot-good]');
  const carEl = $('[data-rot-car]');
  const deger = $('[data-rot-deger]');
  const stateEl = $('[data-rot-state]');
  const steer = $('[data-steer]');
  const lenB = bad.getTotalLength(), lenG = good.getTotalLength();
  let state = 'once';
  gsap.set([bad, good], { drawSVG: '0%' });

  function place(path, len, t) {
    const w = svg.clientWidth / 200, h = svg.clientHeight / 600;
    const p = path.getPointAtLength(len * t);
    const q = path.getPointAtLength(Math.min(len, len * t + 4));
    const ang = (Math.atan2((q.y - p.y) * h, (q.x - p.x) * w) * 180) / Math.PI + 90;
    carEl.style.transform = `translate3d(${(p.x * w).toFixed(1)}px, ${(p.y * h).toFixed(1)}px, 0) translate(-50%, -30%) rotate(${ang.toFixed(1)}deg)`;
  }

  ScrollTrigger.create({
    trigger: '[data-rot]', start: isMobile() ? 'top top+=60' : 'top top', end: () => `+=${innerHeight * 1.6}`,
    pin: true, scrub: 0.5,
    onUpdate: (s) => {
      const p = s.progress;
      const a = gsap.utils.clamp(0, 1, p / 0.45);
      const b = gsap.utils.clamp(0, 1, (p - 0.55) / 0.45);
      gsap.set(bad, { drawSVG: `0% ${a * 100}%`, opacity: p > 0.55 ? 0.35 : 1 });
      gsap.set(good, { drawSVG: `0% ${b * 100}%` });
      if (p < 0.5) place(bad, lenB, a);
      else place(good, lenG, Math.max(0.001, b));
      const next = p < 0.5 ? 'once' : 'sonra';
      if (next !== state) {
        state = next;
        stateEl.innerHTML = rotState(next);
        deger.textContent = d.rot[next].deger;
        deger.classList.toggle('is-ok', next === 'sonra');
        steer.classList.toggle('is-calm', next === 'sonra');
        gsap.from(stateEl.children, { y: 16, opacity: 0, duration: 0.4, stagger: 0.06 });
      }
    },
  });
  place(bad, lenB, 0.001);
}

function otel() {
  gsap.fromTo('[data-mark-p]', { clipPath: 'inset(100% 0 -20% 0)', yPercent: 20 }, {
    clipPath: 'inset(-20% 0 -20% 0)', yPercent: -10, ease: 'none',
    scrollTrigger: { trigger: '.otel', start: 'top 85%', end: 'center 45%', scrub: 0.4 },
  });
  gsap.fromTo('.bay', { '--line': 0, opacity: 0 }, {
    '--line': 1, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out',
    scrollTrigger: { trigger: '[data-bays]', start: 'top 80%', toggleActions: 'play none none reverse' },
  });
}

// Galeri: rögar kapakları yuvarlanarak gelir, tabelalar sallanarak asılır
function galeri() {
  $$('.plate').forEach((el, i) => {
    const fig = el.querySelector('figure');
    if (el.classList.contains('plate--rogar')) {
      const dir = i % 2 ? 1 : -1;
      gsap.fromTo(fig, { x: () => dir * innerWidth * 0.6, rotate: dir * 200 }, {
        x: 0, rotate: 0, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'center 60%', scrub: 0.5, invalidateOnRefresh: true },
      });
    } else {
      gsap.fromTo(fig, { rotate: -9, y: -40, opacity: 0, transformOrigin: '50% 0%' }, {
        rotate: 0, y: 0, opacity: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)',
        scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' },
      });
    }
  });
}

function marquee() {
  const trackEl = $('[data-marquee-track]');
  let x = 0;
  gsap.ticker.add((t, dt) => {
    const half = trackEl.scrollWidth / 2;
    x -= (dt / 1000) * (60 + vel * 900);
    if (x <= -half) x += half;
    trackEl.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(-vel * 14).toFixed(2)}deg)`;
  });
}

function yorumlar() {
  const row = $('[data-yorum-row]');
  const trackEl = $('[data-yorumlar]');
  if (isMobile()) return; // telefonda parmakla kaydırılır
  gsap.fromTo(trackEl, { x: 0 }, {
    x: () => -(trackEl.scrollWidth - row.clientWidth), ease: 'none',
    scrollTrigger: { trigger: row, start: 'top 85%', end: 'bottom 15%', scrub: 0.6, invalidateOnRefresh: true },
  });
}

// Final: araç gelip DUR çizgisinde durur
function final() {
  const road = $('.final__road');
  gsap.fromTo('[data-final-car]', { y: () => road.clientHeight }, {
    y: 0, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-final]', start: 'top 85%', end: 'center 60%', scrub: 0.5, invalidateOnRefresh: true },
  });
}

// Hareket azaltılmışsa: her şey son hâlinde, pin yok
function staticState() {
  document.documentElement.classList.add('is-static');
  $$('.tread').forEach((el) => {
    const strip = el.querySelector('.tread__strip');
    const tyre = el.querySelector('.tread__tyre');
    tyre.style.transform = `translateY(${strip.clientHeight - tyre.clientHeight}px)`;
  });
  // Fren: iki araç da durduğu yerde
  const road = $('[data-fren-road]');
  const H = road.clientHeight;
  const carEls = $$('[data-fcar]');
  const carH = carEls[0].offsetHeight;
  const ppm = (H - carH - 124) / (F.asinmis.mesafe + 2);
  const y0 = H - carH - 12;
  ['yeni', 'asinmis'].forEach((k, i) => {
    const lane = $(`[data-lane="${k}"]`);
    carEls[i].style.transform = `translate3d(-50%, ${y0 - F[k].mesafe * ppm}px, 0)`;
    $('[data-m]', lane).textContent = nf(F[k].mesafe, 1);
    $('[data-v]', lane).textContent = '0';
    const skid = $('[data-skid]', lane);
    skid.style.top = `${y0 + carH * 0.2 - F[k].mesafe * ppm}px`;
    skid.style.height = `${F[k].mesafe * ppm}px`;
  });
  const gecit = $('[data-gecit]');
  gecit.style.top = `${y0 - F.gecit * ppm - 3.5 * ppm}px`;
  gecit.style.height = `${3.5 * ppm}px`;
  const bracket = $('[data-bracket]');
  bracket.style.top = `${y0 - F.asinmis.mesafe * ppm}px`;
  bracket.style.height = `${(F.asinmis.mesafe - F.yeni.mesafe) * ppm}px`;
  bracket.classList.add('is-on');
  // Rot: düz iz, düzelmiş durum
  $('[data-rot-bad]').style.opacity = 0.35;
  $('[data-rot-state]').innerHTML = rotState('sonra');
  $('[data-rot-deger]').textContent = d.rot.sonra.deger;
  $('[data-rot-deger]').classList.add('is-ok');
  $('[data-steer]').classList.add('is-calm');
}
