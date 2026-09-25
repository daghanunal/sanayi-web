import veri from '../../data/tonaj.json';
import ek from '../../data/agirvasita-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, ...ek });
const T = d.sinema;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const nf = (n, digits = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const dec = (n) => (Number.isInteger(n) ? 0 : String(n).split('.')[1].length);
const up = (s) => s.toLocaleUpperCase('tr');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 760;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------------------

const binds = { ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-t]').forEach((el) => (el.textContent = T[el.dataset.t] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$$('[data-wa-konum]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, yolda kaldım. Konumumu gönderiyorum. Araç: `)));
$('[data-wa-filo]').href = waHref(d, `Merhaba ${d.isletme.ad}, filomuzun bakımı için teklif almak istiyorum. Araç sayımız: `);
$$('[data-sos]').forEach((el) => (el.textContent = d.yolYardim));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

$('[data-intro-ust]').textContent = up(T.introUst);
$('[data-intro-name]').textContent = d.isletme.ad;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
heroTitle.classList.toggle('is-long', d.isletme.ad.length > 22);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Atölye açık' : 'Atölye kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});

// Hakkında: kelime kelime aydınlanır
$('[data-about]').innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ');

// Duraklar (her biri bir portal)
const fmt = (o, v) => nf(v, dec(o.iyi) || dec(o.once) || dec(o.sonra));
$('[data-stop-list]').innerHTML = d.alt.map((a, i) => {
  const o = a.olcum;
  const max = Math.max(o.once, o.sonra, o.iyi) * 1.15;
  const pct = (v) => ((v / max) * 100).toFixed(1);
  return `
  <article class="stop" data-cam="stop${i}" data-stop="${i}">
    <div class="stop__card">
      <p class="stop__tab"><span>ÇIKIŞ ${i + 1}</span>${esc(up(a.durak))}</p>
      <h3 class="stop__title">${esc(a.baslik)}</h3>
      <p class="stop__text">${esc(a.metin)}</p>
      <div class="gauge" data-gauge data-once="${o.once}" data-sonra="${o.sonra}" style="--iyi:${pct(o.iyi)}%">
        <div class="gauge__head"><span>${esc(o.etiket)}</span><b><i data-gauge-val>${esc(fmt(o, o.once))}</i> ${esc(o.birim)}</b></div>
        <div class="gauge__bar"><i class="gauge__fill" data-gauge-fill style="--p:${pct(o.once)}%;--q:${pct(o.sonra)}%"></i><i class="gauge__mark"></i></div>
        <div class="gauge__foot"><span>Gelişte ${esc(fmt(o, o.once))}</span><span>Olması gereken ${o.ters ? '≤' : '≥'} ${esc(fmt(o, o.iyi))}</span><span>Teslimde ${esc(fmt(o, o.sonra))}</span></div>
      </div>
      <a class="stop__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${a.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.hizmet)} için yazın</span></a>
    </div>
  </article>`;
}).join('');

// Hizmetler: çıkış listesi
$('[data-exits]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="exit">
    <span class="exit__no">${i + 1}</span>
    <div class="exit__body"><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
    <span class="exit__time">${esc(s.sure)}</span>
  </li>`).join('');
$('[data-tako-baslik]').textContent = d.takograf.baslik;
$('[data-tako-metin]').textContent = d.takograf.metin;
$('[data-ticks]').innerHTML = Array.from({ length: 13 }, (_, i) => {
  const a = (-120 + i * 20) * (Math.PI / 180);
  const r0 = i % 2 ? 44 : 40;
  return `<line x1="${(60 + Math.sin(a) * r0).toFixed(1)}" y1="${(60 - Math.cos(a) * r0).toFixed(1)}" x2="${(60 + Math.sin(a) * 50).toFixed(1)}" y2="${(60 - Math.cos(a) * 50).toFixed(1)}"/>`;
}).join('');

// Kilometre sayaçları
const yil = new Date().getFullYear() - d.isletme.kurulus;
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => {
  const digits = String(s.deger).split('');
  return `
  <div class="odo" aria-label="${esc(`${s.deger}${s.sonek} ${s.etiket}`)}">
    <div class="odo__win" aria-hidden="true">${digits.map((n) => `<span class="odo__col" data-digit="${n}">${Array.from({ length: 10 }, (_, k) => `<i>${k}</i>`).join('')}</span>`).join('')}${s.sonek ? `<em>${esc(s.sonek.trim())}</em>` : ''}</div>
    <p class="odo__lbl">${esc(s.etiket)}</p>
  </div>`;
}).join('');

$('[data-filo-baslik]').textContent = d.filo.baslik;
$('[data-filo-metin]').textContent = d.filo.metin;
$('[data-filo-list]').innerHTML = d.filo.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');
const chunk = `<span class="brands__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i>·</i>')}<i>·</i></span>`;
$('[data-brands]').innerHTML = chunk + chunk;

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');
$('[data-garanti]').textContent = d.garanti;

// Yorumlar: telsiz mesajları
$('[data-score]').innerHTML = `
  <b>${esc(nf(d.puan.ortalama, 1))}</b>
  <div><p class="score__stars" aria-hidden="true">${icons.star.repeat(5)}</p><p>${esc(nf(d.puan.adet))} Google yorumu</p></div>`;
$('[data-msgs]').innerHTML = d.yorumlar.map((y, i) => `
  <li class="msg ${i % 2 ? 'msg--r' : ''}">
    <p class="msg__meta"><span class="msg__ch">KANAL ${esc(String(9 + (i % 3)))}</span><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
    <blockquote>${esc(y.metin)}</blockquote>
    <p class="msg__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
  </li>`).join('');

// Saatler + VMS tabelası
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
const vms = $('[data-vms]');
$('[data-vms-text]').textContent = up(status.text);
vms.classList.toggle('is-open', status.open);

$('[data-final-title]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Fotoğraflar (arka plan olarak)
$$('[data-photo]').forEach((el) => (el.style.backgroundImage = `url("${asset(el.dataset.photo)}")`));

// --- Sahne -------------------------------------------------------------------------------

const signs = d.alt.map((a, i) => ({
  tab: `ÇIKIŞ ${i + 1}`,
  main: up(a.durak),
  sub: `${a.olcum.etiket} ${a.olcum.ters ? '≤' : '≥'} ${fmt(a.olcum, a.olcum.iyi)} ${a.olcum.birim}`,
  d: 1e6,
}));
const canvas = $('[data-stage]');
let S = null;
try {
  S = createScene(canvas, { lite, signs, finalSign: T.cikisTabela, name: up(d.isletme.ad), tel: d.iletisim.telefon });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}
document.fonts?.ready.then(() => document.fonts.load("900 80px 'Overpass'")).then(() => S?.redrawSigns());
if (import.meta.env.DEV) window.__av = { S, signs };

// Kamera pozları [kamX, kamY, kamZ, bakX, bakY, bakZ]. Araç -z yönüne gider.
const CAMS = {
  hero: [-6.8, 1.4, -18.5, -2.6, 2.6, -3],
  side: [-12.5, 2.6, -2, 0, 2.3, -3],
  chase0: [-3.6, 7, 24, 0, 3, -34],
  stop0: [-8.2, 4.4, 3, -1.6, 3.2, -30],
  stop1: [4.4, 2.6, 7, 0, 2.6, -32],
  stop2: [-2.6, 1.3, 16, 0, 2.2, -34],
  stop3: [3.6, 8.5, 17, -0.5, 3.4, -32],
  stop4: [-6.4, 5, 8, -0.4, 3.4, -32],
  stop5: [0.4, 3.4, 22, 0, 3.4, -34],
  aerial: [-22, 34, 12, -1.4, 0, -14],
  aerial2: [-8, 20, 50, -1.8, 1, -24],
  cab: [-8.5, 3.6, -9, 0, 2.6, -4],
  final: [-2.5, 3.4, 26, 3.4, 2.2, 0],
};
// Dikey ekranda dar açıda tır kadrajdan çıkmasın diye bazı pozlar değişir
const CAMS_P = {
  stop0: [-4.6, 4.2, 9, 1.4, 2.8, -30],
};
const K = 0.06; // metre / piksel
let keys = [];
let solids = [];
let finalTop = 0;
let heroFade = 0;

function layout() {
  const ih = innerHeight;
  const y = (el) => el.getBoundingClientRect().top + scrollY;
  keys = $$('[data-cam]').map((el) => {
    const top = y(el);
    const h = el.offsetHeight;
    // pozun tam oturduğu kaydırma değeri: bölüm ekranın ortasına geldiğinde
    const at = el.dataset.cam === 'hero' ? 0 : el.dataset.cam === 'final' ? top + h - ih : top + Math.min(h, ih) * 0.5 - ih * 0.5;
    return { at, cam: (portrait() && CAMS_P[el.dataset.cam]) || CAMS[el.dataset.cam] };
  }).sort((a, b) => a.at - b.at);
  solids = $$('.solid').map((el) => [y(el), y(el) + el.offsetHeight]);
  const fin = $('[data-final]');
  finalTop = y(fin) - ih;
  $$('[data-stop]').forEach((el, i) => {
    const top = y(el);
    signs[i].d = K * (top + el.offsetHeight - ih) + 6;
  });
}

function camAt(sy) {
  if (!keys.length) return CAMS.hero;
  if (sy <= keys[0].at) return keys[0].cam;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (sy <= b.at) {
      const t = smooth(clamp((sy - a.at) / Math.max(1, b.at - a.at)));
      return a.cam.map((v, k) => v + (b.cam[k] - v) * t);
    }
  }
  return keys.at(-1).cam;
}

const portrait = () => innerWidth / innerHeight < 0.8;
let mx = 0, my = 0;
if (finePointer) addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

// HUD: Şaşmaz'a kalan yol
const kmEl = $('[data-km]');
let lastKm = '';
const hud = $('[data-hud]');

let flow = 0;
let last = performance.now();
let running = true;
let started = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const sy = scrollY;
  const ih = innerHeight;
  // HUD
  const remain = Math.max(0, 1 - sy / Math.max(1, finalTop));
  const km = remain > 0.001 ? `${nf(remain * 42, 1)} km` : 'ÇIKIŞ';
  if (km !== lastKm) { kmEl.textContent = km; lastKm = km; }
  hud.classList.toggle('is-on', sy > ih * 0.4);
  if (!S) return;
  // solid bölüm ekranı tamamen kapatıyorsa çizme
  const covered = solids.some(([a, b]) => a <= sy && b >= sy + ih);
  if (covered) { running = false; return; }
  running = true;
  const travel = K * Math.min(sy, finalTop);
  const f = clamp((sy - finalTop) / (ih * 0.9));
  flow += dt * (reducedMotion ? 0 : 2.2) * (1 - f);
  const cam = camAt(sy).slice();
  if (portrait() && sy < ih) {
    // telefonda tır başlığın üstünde görünsün
    const t = clamp(1 - sy / ih);
    cam[3] += (0.4 - cam[3]) * t; cam[4] += (-2.2 - cam[4]) * t;
  }
  let fov = 42;
  if (portrait()) {
    // dar ekranda kamerayı geri çek, açıyı büyüt
    fov = 60;
    const dx = cam[0] - cam[3], dy = cam[1] - cam[4], dz = cam[2] - cam[5];
    const k = 1.12;
    cam[0] = cam[3] + dx * k; cam[1] = cam[4] + dy * k; cam[2] = cam[5] + dz * k;
    // son sahnede araçlar metnin üstünde kalsın
    const fz = clamp((sy - finalTop) / ih);
    cam[4] -= 2.2 * fz; cam[1] += 1.5 * fz;
  }
  S.update({
    travel: travel + flow,
    gantryTravel: travel,
    cam, fov, final: f, time: now / 1000,
    convoy: convoyAmt(sy),
    px: finePointer ? mx * 1.4 : 0,
    py: finePointer ? -my * 0.8 : 0,
  }, started ? dt : 1);
  S.render();
}

let convoyRange = [0, 0];
function convoyAmt(sy) {
  const [a, b] = convoyRange;
  if (sy < a - innerHeight || sy > b) return 0;
  return clamp((sy - (a - innerHeight)) / innerHeight);
}

function resize() {
  S?.resize();
  layout();
  const km = $('.km');
  const top = km.getBoundingClientRect().top + scrollY;
  convoyRange = [top, top + km.offsetHeight];
}
addEventListener('resize', () => { resize(); ScrollTrigger.refresh(); });

// --- Hareket ------------------------------------------------------------------------------

const lenis = initSmoothScroll();
resize();
requestAnimationFrame(frame);

function intro() {
  const el = $('[data-intro]');
  const done = () => {
    document.body.classList.remove('is-loading');
    el.remove();
    started = true;
    heroIn();
  };
  if (reducedMotion) return done();
  lenis?.stop();
  const tl = gsap.timeline({ onComplete: () => { lenis?.start(); done(); } });
  tl.fromTo('[data-intro-sign]', { filter: 'brightness(0.08)', scale: 0.86 }, { filter: 'brightness(1)', scale: 1, duration: 1.1, ease: 'power2.out' })
    .fromTo('[data-intro-shine]', { xPercent: -120 }, { xPercent: 260, duration: 0.8, ease: 'power2.inOut' }, 0.5)
    .to('[data-intro-sign]', { scale: 1.9, opacity: 0, duration: 0.7, ease: 'power3.in' }, 1.7)
    .to(el, { opacity: 0, duration: 0.5 }, 2.05);
  el.addEventListener('click', () => tl.progress(1), { once: true });
}

function heroIn() {
  if (reducedMotion) return;
  const split = new SplitText(heroTitle, { type: 'words,chars', charsClass: 'ch' });
  gsap.from(split.chars, { yPercent: 110, opacity: 0, rotate: 4, duration: 0.9, ease: 'power4.out', stagger: 0.025 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__sos'], { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.3 });
}

if (!reducedMotion) {
  // hero yukarı kayarken söner
  gsap.to('.hero__in', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true } });
  gsap.to('.hero__hint', { opacity: 0, scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=200', scrub: true } });

  // hakkında: kelimeler yanar
  gsap.fromTo('.about__text span', { opacity: 0.16 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top 75%', end: 'bottom 60%', scrub: true },
  });

  gsap.from('.stops__head > *', { y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.stops__head', start: 'top 70%' } });

  // durak kartları + ölçü göstergesi
  $$('.stop').forEach((st) => {
    const card = $('.stop__card', st);
    const g = $('[data-gauge]', st);
    const fill = $('[data-gauge-fill]', st);
    const val = $('[data-gauge-val]', st);
    const once = Number(g.dataset.once), sonra = Number(g.dataset.sonra);
    const digits = Math.max(dec(once), dec(sonra));
    gsap.from(card, { y: 80, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 92%' } });
    gsap.fromTo(card, { '--shine': '-40%' }, { '--shine': '140%', duration: 1.1, ease: 'power2.inOut', scrollTrigger: { trigger: card, start: 'top 70%' } });
    const o = { v: once, t: 0 };
    gsap.to(o, {
      v: sonra, t: 1, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top 75%', end: 'bottom 55%', scrub: 0.6 },
      onUpdate() {
        val.textContent = nf(o.v, digits);
        fill.style.setProperty('--t', o.t.toFixed(3));
        g.classList.toggle('is-ok', o.t > 0.75);
      },
    });
  });

  gsap.from('.exit', { x: -30, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: '.exits__list', start: 'top 80%' } });
  gsap.fromTo('.tako__needle', { rotate: -120 }, { rotate: 40, transformOrigin: '60px 60px', duration: 1.6, ease: 'elastic.out(1, 0.5)', scrollTrigger: { trigger: '.tako', start: 'top 85%' } });

  // kilometre sayaçları döner
  $$('.odo__col').forEach((c, i) => {
    const n = Number(c.dataset.digit);
    gsap.fromTo(c, { yPercent: 0 }, { yPercent: -n * 10 - 0, duration: 1.6 + (i % 3) * 0.2, ease: 'power3.out', scrollTrigger: { trigger: c.closest('.odos'), start: 'top 80%' } });
  });
  gsap.from('.filo__card', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.filo__card', start: 'top 85%' } });

  gsap.fromTo('[data-road-line]', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  $$('.step').forEach((s) => gsap.from(s, { x: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 82%' } }));

  $$('.msg').forEach((m) => gsap.from(m, { y: 30, opacity: 0, scale: 0.96, duration: 0.6, ease: 'back.out(1.6)', scrollTrigger: { trigger: m, start: 'top 88%' } }));

  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.from(fsplit.chars, { yPercent: 100, opacity: 0, stagger: 0.03, duration: 0.8, ease: 'power4.out', scrollTrigger: { trigger: '.final', start: 'top 40%' } });
  gsap.from(['.final__text', '.final__tel', '.final__cta'], { y: 30, opacity: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.final', start: 'top 30%' } });
} else {
  $$('.odo__col').forEach((c) => (c.style.transform = `translateY(${-Number(c.dataset.digit) * 10}%)`));
}

document.fonts?.ready.then(() => { resize(); ScrollTrigger.refresh(); });
intro();
