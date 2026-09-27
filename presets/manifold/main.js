import veri from '../../data/manifold.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger, setStoryMode,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import * as THREE from 'three';
import { createScene, LIFT } from './scene.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(veri);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = () => innerWidth < 760;

// "1998'den", "2004'ten", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-wa-imalat]').href = waHref(d, `Merhaba ${d.isletme.ad}, egzoz imalatı için fiyat almak istiyorum. Aracımın fotoğrafını gönderiyorum.`);
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi, ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
$('[data-intro-name]').textContent = d.isletme.ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Yolculuk durakları: tur göstergesi ve kaydırılan durak kartları
const railShort = { 'Katalitik konvertör': 'Katalitik', 'Egzoz ucu': 'Uç' };
$('[data-rail]').innerHTML = d.yolculuk.map((y) => `<li data-rail-i><span>${esc(railShort[y.durak] || y.durak)}</span></li>`).join('');
$('[data-stops]').innerHTML = d.yolculuk.map((y, i) => `
  <div class="stop" data-stop="${esc(y.id)}">
    <article class="card">
      <p class="card__stop"><span>${String(i + 1).padStart(2, '0')}</span>${esc(y.durak)}</p>
      <h3 class="card__title">${esc(y.baslik)}</h3>
      <p class="card__text">${esc(y.metin)}</p>
      <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${y.hizmet.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(y.hizmet)} için sorun</span></a>
    </article>
  </div>`).join('');

// Muayene raporu
const olc = d.muayene.olcumler;
$('[data-report-title]').textContent = d.muayene.baslik;
$('[data-report-rows]').innerHTML = olc.map((o, i) => `
  <tr data-row="${i}">
    <th>${esc(o.ad)} <small>${esc(o.birim)}</small></th>
    <td class="is-fail">${nf(o.once, o.once % 1 ? 1 : 0)}</td>
    <td data-after>${nf(o.once, o.once % 1 ? 1 : 0)}</td>
    <td>${nf(o.sinir, o.sinir % 1 ? 1 : 0)}</td>
  </tr>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${s.deger}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="svc__row">
    <h3 class="svc__name"><span>${esc(s.baslik)}</span></h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

const imalat = d.hizmetler.find((h) => /imalat/i.test(h.baslik));
$('[data-imalat-text]').textContent = imalat ? imalat.aciklama : '';

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${g}</dt><dd>${h}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas);
if (import.meta.env.DEV) window.__mf = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const deg = Math.PI / 180;

// Kamera: hedef noktası c, azimut (az, +z'den saat yönü tersi), yükseklik açısı (el), uzaklık (dist).
// Masaüstünde nesne sağa (metin solda), telefonda üst yarıya (kart altta) kaydırılır.
function orbit(c, az, el, dist, fov, frame = 1) {
  const pos = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(c);
  const fwd = c.clone().sub(pos).normalize();
  const right = fwd.clone().cross(V(0, 1, 0)).normalize();
  const up = right.clone().cross(fwd).normalize();
  const look = c.clone();
  if (mobile()) look.addScaledVector(up, -dist * 0.07 * frame);
  else look.addScaledVector(right, -dist * 0.2 * frame);
  return { pos, look, fov };
}
const ALL = () => (S.focus('exhaust') ? S.focus('exhaust').c.clone() : V(0, LIFT + 0.2, 0));
const F = (n) => (S.focus(n) ? S.focus(n).c.clone() : ALL());
// Durak sırası (anahtar kareler): 0 giriş, 1 tur başlığı, 2–6 parçalar, 7 rapor
const PARTS = ['manifold', 'catalyst', 'dpf', 'muffler', 'tailpipe'];
function poseAt(i) {
  const m = mobile();
  switch (i) {
    case 0: return m ? orbit(ALL(), 58 * deg, 20 * deg, 5.6, 42, 2.4) : orbit(ALL(), 22 * deg, 14 * deg, 4.6, 34, 1.1);
    case 1: return m ? orbit(ALL(), 18 * deg, 44 * deg, 6.2, 42, 0.2) : orbit(ALL(), 6 * deg, 36 * deg, 5.0, 34, 0);
    case 2: return m ? orbit(F('manifold'), 36 * deg, 18 * deg, 1.5, 40) : orbit(F('manifold'), 38 * deg, 16 * deg, 1.05, 32);
    case 3: return m ? orbit(F('catalyst'), -26 * deg, 20 * deg, 1.3, 40) : orbit(F('catalyst'), -24 * deg, 18 * deg, 0.95, 32);
    case 4: return m ? orbit(F('dpf'), 24 * deg, 22 * deg, 1.35, 40) : orbit(F('dpf'), 26 * deg, 20 * deg, 1.0, 32);
    case 5: return m ? orbit(F('muffler'), -34 * deg, 24 * deg, 1.6, 40) : orbit(F('muffler'), -32 * deg, 22 * deg, 1.2, 32);
    case 6: return m ? orbit(F('tailpipe'), 70 * deg, 12 * deg, 1.15, 42) : orbit(F('tailpipe'), 66 * deg, 10 * deg, 0.85, 32);
    default: return m ? orbit(ALL(), -30 * deg, 30 * deg, 6.0, 42, 2.6) : orbit(ALL(), -18 * deg, 24 * deg, 4.8, 34, 1.1);
  }
}
const bump = (t, i, w = 1) => clamp(1 - Math.abs(t - i) / w);

// Tur ilerlemesi t (0–7) → sahnenin bütün durumu
function tourState(t, time, vel) {
  const i = Math.min(6, Math.floor(t));
  const f = t - i;
  const A = poseAt(i), B = poseAt(i + 1);
  const pose = { pos: A.pos.lerp(B.pos, f), look: A.look.lerp(B.look, f), fov: L(A.fov, B.fov, f) };
  // Dış planlarda hafif nefes alma
  const sway = (bump(t, 0, 1) + bump(t, 1, 1) + bump(t, 7, 1)) * 0.06;
  pose.pos.x += Math.sin(time * 0.3) * sway;
  pose.pos.y += Math.sin(time * 0.45) * sway * 0.5;
  const ex = {
    manifold: bump(t, 2, 0.8) * 0.3,
    catalyst: bump(t, 3, 0.8) * 0.9,
    dpf: bump(t, 4, 0.8) * 1.6,
    muffler: bump(t, 5, 0.8) * 0.45,
    tailpipe: bump(t, 6, 0.8) * 0.25,
  };
  return {
    ...pose,
    ex,
    heat: 0.35 + bump(t, 2, 1) * 0.65 - seg(t, 2.6, 4) * 0.2,
    slice: { catalyst: bump(t, 3, 0.55), dpf: bump(t, 4, 0.55), muffler: bump(t, 5, 0.55) },
    cat: seg(t, 2.7, 3.2),
    dpf: seg(t, 3.85, 4.35),
    plumeDirt: 1 - seg(t, 3.9, 4.4) * 0.75 - seg(t, 5.8, 6.4) * 0.25,
    plumeAlpha: 1,
    speed: vel,
    sliceOff: mobile() ? (Math.round(t) === 3 ? [0.08, -0.15] : [-0.02, -0.15]) : [-0.2, 0.06],
    sliceScale: mobile() ? 0.68 : 0.72,
  };
}
function finaleState(q, time) {
  const a = time * 0.16;
  const c = S.tip.p.clone().add(V(0.25, 0.02, 0));
  const P = orbit(c, (72 + Math.sin(a) * 12) * deg, (10 + q * 6) * deg, mobile() ? 1.3 : 1.05, mobile() ? 42 : 32, mobile() ? -0.9 : 0.8);
  return { ...P, ex: {}, heat: 0.2, slice: {}, cat: 1, dpf: 1, plumeDirt: 0, plumeAlpha: 1, speed: 0 };
}

// --- Tur arayüzü ----------------------------------------------------------

const hud = $('[data-hud]');
const railItems = $$('[data-rail-i]');
const hudN = $('[data-hud-n]'), hudName = $('[data-hud-name]');
const mSoot = $('[data-m-soot]'), mCo = $('[data-m-co]'), mDb = $('[data-m-db]'), mVerdict = $('[data-m-verdict]');
const stamp = $('[data-stamp]');
const rowsAfter = $$('[data-after]');
const report = $('[data-report]');
let hudShown = false;
let tourActive = false;

const stopEls = $$('[data-stop]');
let onStop = -2;
function tourUI(t) {
  const active = t >= 1.5 && t < 6.5 ? Math.round(t) - 2 : -1;
  const on = tourActive ? Math.round(t) - 2 : -1; // 0–4 parçalar, 5 rapor (yalnız tur içindeyken)
  if (on !== onStop) {
    onStop = on;
    stopEls.forEach((el, i) => el.classList.toggle('is-on', i === on));
  }
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', t >= i + 2.5);
  });
  const shownI = clamp(Math.round(t) - 2, 0, 4);
  hudN.textContent = String(shownI + 1).padStart(2, '0');
  if (hudName.textContent !== d.yolculuk[shownI].durak) hudName.textContent = d.yolculuk[shownI].durak;

  const co = L(3.8, 0.2, seg(t, 2.7, 3.3));
  const soot = L(L(2.9, 2.2, seg(t, 2.7, 3.3)), 0.4, seg(t, 3.7, 4.3));
  const db = L(104, 78, seg(t, 4.7, 5.3));
  mSoot.textContent = nf(soot, 1);
  mCo.textContent = nf(co, 1);
  mDb.textContent = nf(db);
  mSoot.parentElement.classList.toggle('is-ok', soot <= 1.5);
  mCo.parentElement.classList.toggle('is-ok', co <= 0.3);
  mDb.parentElement.classList.toggle('is-ok', db <= 90);
  const ok = soot <= 1.5 && co <= 0.3 && db <= 90;
  mVerdict.textContent = ok ? 'Hazır' : 'Kalır';
  mVerdict.classList.toggle('is-ok', ok);

  // Rapor: son durakta "sonra" sütunu dolar, mühür basılır
  const fill = seg(t, 6.35, 6.95);
  rowsAfter.forEach((td, i) => {
    const o = olc[i];
    const v = L(o.once, o.sonra, clamp(fill * 1.6 - i * 0.2));
    td.textContent = nf(v, o.once % 1 ? 1 : 0);
    td.classList.toggle('is-pass', v <= o.sinir);
  });
  const st1 = seg(t, 6.9, 7);
  stamp.style.opacity = st1;
  stamp.style.transform = `rotate(-8deg) scale(${L(2.2, 1, smooth(st1))})`;
}
function showHud(on) {
  if (on === hudShown) return;
  hudShown = on;
  gsap.to(hud, { autoAlpha: on ? 1 : 0, y: on ? 0 : -12, duration: 0.35, ease: 'power2.out', overwrite: true });
}

// --- Başlangıç: açılış, scroll, render döngüsü ----------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });
const titleChars = split.chars;

let lenis = null;
const top = $('[data-top]');
let vel = 0;
let tourT = 0;
const trg = {};
let anchors = [];

// Anahtar kareler: her durağın ortası ekranın ortasına geldiği kaydırma konumu
function measureAnchors() {
  const mid = (el) => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2;
  const els = [$('.tour__intro'), ...$$('[data-stop]')];
  anchors = [0, ...els.map(mid)];
}
function targetT(y) {
  if (!anchors.length) return 0;
  if (y <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (y < anchors[i + 1]) {
      const f = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
      return i + smooth(clamp((f - 0.18) / 0.64)); // durakta bekler, arada geçer
    }
  }
  return anchors.length - 1;
}

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  window.__lenis = lenis;

  trg.tour = ScrollTrigger.create({ trigger: '[data-tour]', start: 'top 55%', end: 'bottom 45%' });
  document.documentElement.classList.add('has-tour');
  trg.tourOut = ScrollTrigger.create({ trigger: '[data-tour]', start: 'bottom bottom', end: 'bottom 35%' });
  trg.finale = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom' });
  trg.finaleIn = ScrollTrigger.create({ trigger: '[data-finale]', start: 'top bottom', end: 'top 30%' });
  trg.solid = ScrollTrigger.create({ trigger: '[data-about]', start: 'top 80px', endTrigger: '[data-finale]', end: 'top 80px' });
  // Telefonda tur boyunca alt çubuk ve üst başlık çekilir; gösterge tek üst öğe olur
  ScrollTrigger.create({
    trigger: '.stops', start: 'top 45%', endTrigger: '[data-stop="report"]', end: 'bottom 85%',
    onToggle: (st) => { tourActive = st.isActive; setStoryMode(st.isActive ? true : null); showHud(st.isActive); },
  });
  ScrollTrigger.addEventListener('refresh', measureAnchors);
  measureAnchors();
  contentMotion();
}

function contentMotion() {
  // Isıyla renk değiştiren bölüm başlıkları
  $$('.sec-title').forEach((el) => {
    gsap.fromTo(el, { '--heat': 0 }, {
      '--heat': 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 35%', scrub: true },
    });
  });
  // Hakkımızda metni kelime kelime ısınır
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 45%', scrub: true },
  });
  // Panel yükselir
  gsap.fromTo('[data-about]', { clipPath: 'inset(12% 4% 0% 4% round 28px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: '[data-about]', start: 'top bottom', end: 'top 20%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.18, yPercent: -6 }, {
    scale: 1, yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Sayaçlar
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  // Hizmet satırları: merkezden geçerken kaynak rengi
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--heat': 0 }, {
      '--heat': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 78%', end: 'bottom 30%', scrub: true },
    });
  });
  // Kaynak dikişi
  const seams = $$('[data-weld-seam]');
  const halos = $$('[data-weld-halo]');
  const arc = $('[data-weld-arc]');
  gsap.set([...seams, ...halos], { drawSVG: '0%' });
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '[data-weld]', start: 'top 70%', end: 'bottom 55%', scrub: true },
  });
  seams.forEach((s, i) => {
    tl.to([s, halos[i]], {
      drawSVG: '100%', ease: 'none', duration: 1,
      onUpdate() {
        const len = s.getTotalLength();
        const pt = s.getPointAtLength(len * this.progress());
        arc.setAttribute('cx', pt.x);
        arc.setAttribute('cy', pt.y);
      },
    }, i * 1.1);
  });
  tl.to(arc, { opacity: 0, duration: 0.2 }, '>-0.1');
  gsap.fromTo('.weld__photo img', { scale: 1.2 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.weld__photo', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Süreç çizgisi
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((s) => {
    const lit = (self) => s.classList.toggle('is-lit', self.progress > 0);
    ScrollTrigger.create({ trigger: s, start: 'top 62%', end: 'max', onUpdate: lit, onRefresh: lit });
  });
  // Yorumlar yatay kayar
  const track = $('[data-rev-track]');
  gsap.to(track, {
    x: () => -(track.scrollWidth - track.parentElement.clientWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top 70%', end: 'bottom 20%', scrub: true, invalidateOnRefresh: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  // Final başlığı
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.fromTo(fsplit.chars, { yPercent: 110, fontWeight: 300 }, {
    yPercent: 0, fontWeight: 800, stagger: 0.015, ease: 'none',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 70%', end: 'top 10%', scrub: true },
  });
}

// Markalar: kaydırma hızına göre hızlanır
const mq = $('.marquee__inner');
let mqX = 0;
let sceneOn = false;

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;

  if (trg.tour) {
    top.classList.toggle('is-solid', trg.solid.isActive);
    const target = targetT(scrollY);
    if (Math.abs(target - tourT) > 1.5) tourT = target; // uzak atlama (#konum gibi)
    tourT += (target - tourT) * (1 - Math.exp(-dt * 6));
    tourUI(tourT);

    const tourVis = scrollY < anchors[1] ? 1 : 1 - trg.tourOut.progress;
    const finVis = trg.finaleIn.progress;
    const vis = Math.max(tourVis, finVis);
    canvas.style.opacity = sceneOn ? vis : 0;
    if (vis > 0.001 && S.isReady()) {
      if (finVis > tourVis) S.update(finaleState(trg.finale.progress, time), now);
      else S.update(tourState(tourT, time, vel), now);
    }
  }

  const w = mq.scrollWidth / 2;
  mqX -= (40 + vel * 900) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0) skewX(${-vel * 12}deg)`;

  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());

// Sahne hazır olunca yumuşakça belirir
S.readyP.then(() => {
  S.update(tourState(0, performance.now() / 1000, 0));
  sceneOn = true;
  canvas.classList.add('is-ready');
}).catch((e) => console.warn('3D sahne yüklenemedi', e));

// Masaüstü: imleç ve mıknatıslı butonlar
if (finePointer && !reducedMotion) {
  const cur = $('[data-cursor]');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    qx(pos.x); qy(pos.y);
  });
  document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hover', !!e.target.closest('a, button')));
  document.body.classList.add('has-cursor');
  $$('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.28);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

// --- Açılış (en çok ~2 sn; dokununca geçer) ---------------------------------

function introHeroIn() {
  gsap.fromTo(titleChars, { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.03, ease: 'expo.out' });
  gsap.fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.07, delay: 0.25, ease: 'power3.out' });
}

function runIntro() {
  const intro = $('[data-intro]');
  const bar = $('[data-intro-bar]');
  const pct = $('[data-intro-pct]');
  const soot = $('[data-intro-soot]');
  const name = $('[data-intro-name]');
  const nsplit = new SplitText(name, { type: 'chars', charsClass: 'ch' });
  let done = false;
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.fromTo(nsplit.chars, { autoAlpha: 0, filter: 'blur(8px)' }, { autoAlpha: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.025, ease: 'power2.out' }, 0);
  tl.to(o, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: () => {
    bar.style.transform = `scaleX(${o.v / 100})`;
    pct.textContent = `%${Math.round(o.v)}`;
  } }, 0.05);
  // Sahne 1,3 sn içinde hazırsa onu bekle, değilse 2 sn'de yine de aç (sahne sonra belirir)
  Promise.race([S.readyP, new Promise((r) => setTimeout(r, 2000))]).then(() => setTimeout(finish, Math.max(0, 1300 - performance.now())));
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    document.body.classList.remove('is-loading');
    lenis?.start();
    gsap.timeline({ onComplete: () => intro.remove() })
      .to(soot, { scale: 2.2, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0)
      .to('.intro__center', { autoAlpha: 0, y: -24, duration: 0.35, ease: 'power2.in' }, 0)
      .to(intro, { autoAlpha: 0, duration: 0.45, ease: 'power1.inOut' }, 0.15)
      .call(introHeroIn, [], 0.2);
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
  addEventListener('wheel', finish, { once: true, passive: true });
  addEventListener('touchmove', finish, { once: true, passive: true });
}

// --- Hareket azaltma: durağan ama derli toplu ------------------------------

const vitrin = /[?&]vitrin=1/.test(location.search);
if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.readyP.then(() => { S.update(tourState(0, 0, 0)); canvas.style.opacity = 1; });
  rowsAfter.forEach((td, i) => {
    td.textContent = nf(olc[i].sonra, olc[i].once % 1 ? 1 : 0);
    td.classList.add('is-pass');
  });
  stamp.style.opacity = 1;
  $('[data-puan]').textContent = nf(d.puan.ortalama, 1);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  document.querySelector('.steps__list').style.setProperty('--fill', 1);
  addEventListener('resize', () => S.isReady() && S.update(tourState(0, 0, 0)));
} else {
  setupScroll();
  if (vitrin) {
    $('[data-intro]').remove();
    document.body.classList.remove('is-loading');
    lenis?.start();
    introHeroIn();
  } else runIntro();
  requestAnimationFrame(tick);
}
