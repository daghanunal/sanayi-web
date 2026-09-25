import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createCoil } from './scene.js';

gsap.registerPlugin(SplitText);

const extra = import.meta.glob('../../data/elektrik-sinematik2.json', { eager: true, import: 'default' });
const ek = Object.values(extra)[0] || {};
const d = boot({ ...raw, ...ek });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mq = matchMedia('(max-width: 899px)');
const phone = mq.matches;
const low = phone || (navigator.hardwareConcurrency || 8) <= 4;
mq.addEventListener('change', () => location.reload());

const ad = esc(d.isletme.ad);
const yil = new Date().getFullYear();
const tecrube = yil - d.isletme.kurulus;
const status = openStatus(d.saatler);
const pad = (n) => String(n).padStart(2, '0');
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');

function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}

// Sarım işareti (logo): yatay tel sıraları
const mark = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="2.4" height="16" rx="1"/><rect x="18.6" y="4" width="2.4" height="16" rx="1"/><path d="M7 7.5h10M7 10.5h10M7 13.5h10M7 16.5h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;

// --- Render ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#basla">${mark}<span>${ad}</span></a>
  <p class="top__status ${status.open ? 'is-open' : ''}"><i></i><span class="long">${esc(status.text)}</span><span class="short">${status.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`;

$('#intro-name').textContent = d.isletme.ad;

$('#basla').innerHTML = `
  <div class="hero__inner">
    <p class="hero__kicker mono"><span class="dot"></span>Şaşmaz Oto Sanayi · ${esc(beri(d.isletme.kurulus))} beri</p>
    <h1 class="hero__title" id="hero-title"><span class="ln">Tel tel</span> <span class="ln ln--cu">ölçeriz.</span></h1>
    <p class="hero__sub">${esc(d.isletme.slogan)}</p>
    <div class="hero__cta">
      <a class="btn btn--cu" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
  </div>
  <div class="hero__meter mono" aria-hidden="true">
    <p><span>Sarım</span><b id="m-turn">000</b></p>
    <p><span>Katman</span><b id="m-layer">1/6</b></p>
    <p><span>Direnç</span><b id="m-ohm">0,00 Ω</b></p>
  </div>
  <p class="hero__hint mono" aria-hidden="true"><i></i>Kaydırın, bobin sarılsın</p>`;

const caps = ['Her sarım bir ölçüm.', 'Akım geçince alan doğar.'];
$$('[data-cap]').forEach((el, i) => (el.textContent = caps[i] || ''));

const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? tecrube : s.deger }));
const g = d.galeri || [];
$('#hakkimizda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__text">
      <p class="eyebrow mono">01 · Biz kimiz</p>
      <h2 class="h2 split" id="about-title">Önce ölçeriz, sonra söyleriz.</h2>
      <p class="lead">${esc(d.isletme.hakkinda)}</p>
    </div>
    <dl class="stats">
      ${stats.map((s) => `
        <div class="stat">
          <dd><b class="stat__n" data-to="${Number(s.deger) || 0}">0</b>${s.sonek ? `<span class="stat__u mono">${esc(s.sonek)}</span>` : ''}</dd>
          <dt>${esc(s.etiket)}</dt>
        </div>`).join('')}
    </dl>
    <div class="about__photos">
      ${g.slice(0, 2).map((p, i) => `<figure class="duo duo--${i}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" width="700" height="900" /></figure>`).join('')}
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="wrap services__wrap">
    <div class="services__head">
      <p class="eyebrow mono">02 · Hizmetler</p>
      <h2 class="h2 split" id="services-title">Akımın geçtiği her yere bakarız.</h2>
      <p class="muted">Fiyatı işe başlamadan söyleriz. Onayınız olmadan tek kablo sökülmez.</p>
    </div>
    <ol class="svc">
      ${d.hizmetler.map((h, i) => `
        <li class="svc__item">
          <span class="svc__no mono">${pad(i + 1)}</span>
          <div class="svc__body">
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
          </div>
          ${h.sure ? `<span class="svc__time mono">${esc(h.sure)}</span>` : ''}
          <span class="svc__wire" aria-hidden="true"></span>
        </li>`).join('')}
    </ol>
  </div>`;

const faults = (d.arizaKodlari || []).slice(0, 4);
$('#ariza').innerHTML = `
  <div class="faults__pin">
    <div class="faults__head wrap">
      <p class="eyebrow mono">03 · Arıza kaydı</p>
      <h2 class="h2" id="faults-title">Alan bozuksa, sebebi vardır.</h2>
    </div>
    <div class="faults__gauge mono" aria-hidden="true">
      <span>Aktif arıza</span><b id="f-left">${faults.length}</b>
    </div>
    <ol class="faults__list wrap">
      ${faults.map((f, i) => `
        <li class="fcard" data-i="${i}">
          <p class="fcard__top mono"><span class="fcard__code">${esc(f.kod)}</span><span class="fcard__state"><i></i><em class="bad">Arıza</em><em class="ok">Çözüldü</em></span></p>
          <p class="fcard__what">${esc(f.anlam)}</p>
          <p class="fcard__fix"><span class="mono">Bulunan:</span> ${esc(f.cozum)}</p>
        </li>`).join('')}
    </ol>
    <div class="faults__bar" aria-hidden="true"><i id="f-bar"></i></div>
  </div>`;

$('#surec').innerHTML = `
  <div class="wrap">
    <p class="eyebrow mono">04 · Nasıl çalışırız</p>
    <h2 class="h2 split" id="process-title">Dört adım. Sırası hiç değişmez.</h2>
    <ol class="steps">
      ${d.surec.map((s, i) => `
        <li class="step">
          <span class="step__ring mono" aria-hidden="true"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26"/><circle class="arc" cx="30" cy="30" r="26"/></svg><b>${i + 1}</b></span>
          <h3>${esc(s.baslik)}</h3>
          <p>${esc(s.aciklama)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

const puan = d.puan || { ortalama: 5, adet: d.yorumlar.length };
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__head">
    <div>
      <p class="eyebrow mono">05 · Müşteri ne diyor</p>
      <h2 class="h2 split" id="reviews-title">Çözülmeyen arıza burada biter.</h2>
    </div>
    <div class="score">
      <b class="score__n">${esc(String(puan.ortalama).replace('.', ','))}</b>
      <div><p class="stars">${stars(puan.ortalama)}</p><p class="muted mono">${esc(fmt(puan.adet))} değerlendirme</p></div>
    </div>
  </div>
  <div class="rv" data-lenis-prevent-wheel>
    ${d.yorumlar.map((y) => `
      <figure class="rv__card">
        <p class="stars">${stars(y.puan)}</p>
        <blockquote>“${esc(y.metin)}”</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac || '')}</span></figcaption>
      </figure>`).join('')}
  </div>`;

const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('');
$('#markalar').innerHTML = `
  <p class="brands__lab mono wrap">Her marka, her model</p>
  <div class="brands__track"><div class="brands__row">${brandRow}${brandRow}</div></div>`;

$('#dukkan').innerHTML = `
  <div class="wrap shop__grid">
    <div class="shop__hours">
      <p class="eyebrow mono">06 · Çalışma saatleri</p>
      <h2 class="h2" id="shop-title">Dükkân açık mı?</h2>
      <p class="live ${status.open ? 'is-open' : ''}"><i></i><span>${esc(status.text)}</span></p>
      <dl class="hours">
        ${groupedHours(d.saatler).map(([gun, saat]) => `<div><dt>${esc(gun)}</dt><dd class="mono ${saat === 'Kapalı' ? 'off' : ''}">${esc(saat)}</dd></div>`).join('')}
      </dl>
    </div>
    <div class="shop__map">
      <p class="eyebrow mono">Konum</p>
      <p class="addr">${esc(d.iletisim.adres)}</p>
      <div class="map" id="map"><span class="map__ph mono">Harita yükleniyor</span></div>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
    </div>
  </div>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <p class="eyebrow mono">07 · Kontak açık</p>
    <h2 class="finale__title" id="finale-title"><span>Aracı getirin,</span> <span class="cu">ölçelim.</span></h2>
    <p class="lead">Arıza tespit ${esc(d.hizmetler[0]?.sure || '30 dk')}. Ne bozuk, ne kadar tutar, ne zaman biter: işe başlamadan söyleriz.</p>
    <div class="finale__cta">
      <a class="btn btn--cu btn--xl" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
    ${d.garanti ? `<p class="finale__g mono">${esc(d.garanti)}</p>` : ''}
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${mark}<span>${ad}</span></p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="mono">© ${yil} ${ad}</p>
  </div>`;

// --- Harita: yaklaşınca yüklenir ------------------------------------------------------------
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  $('#map').innerHTML = `<iframe title="Konum haritası" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Sahne --------------------------------------------------------------------------------
const canvas = $('#gl');
let coil = null;
try {
  coil = createCoil(canvas, { low, reduced: reducedMotion });
} catch (e) {
  document.documentElement.classList.add('no-gl');
}
const S = coil?.S ?? {};

const lenis = initSmoothScroll();

// Kaydırma filmi: her anahtar kare bir öğenin sayfadaki konumuna bağlı; aradaki değerler yumuşak geçiş.
// Değerler masaüstü ve telefon için ayrı (telefonda bobin üst yarıda, yazılar altta).
const P = phone;
const KEYS = [
  { el: '#basla', at: 0, v: { wind: 0.3, camR: P ? 7.4 : 8.6, camYaw: 0.95, camPitch: 0.28, tx: 0, ty: 0, tz: 0, vx: P ? 0 : 0.26, vy: P ? 0.2 : 0, field: 0, pulse: 0, chaos: 0, fault: 0, heat: 0, dim: 1, roll: 0, fov: 34 } },
  { el: '.stage--wind', at: 0.5, v: { wind: 0.62, camR: P ? 4.6 : 5.2, camYaw: 0.3, camPitch: 0.5, vx: 0, vy: P ? 0.06 : 0 } },
  { el: '#hakkimizda', at: 0.55, v: { wind: 1, camR: 8, camYaw: -0.45, camPitch: 0.3, vx: P ? 0 : 0.25, vy: P ? 0.25 : 0, field: 0.45, dim: P ? 0.45 : 1 } },
  { el: '.stage--field', at: 0.5, v: { camR: P ? 7.6 : 8.8, camYaw: 0.02, camPitch: 0.05, vx: 0, vy: P ? 0.08 : 0, field: 1, pulse: 0.4, dim: 1 } },
  { el: '#hizmetler', at: 0.12, v: { camR: 7.4, camYaw: 0.75, camPitch: 0.18, vx: P ? 0 : -0.25, vy: 0, field: 0.55, pulse: 1, dim: P ? 0.4 : 1 } },
  { el: '#hizmetler', at: 0.9, v: { camYaw: 1.35, camPitch: 0.3 } },
  { el: '#ariza', at: 0, v: { camR: P ? 7.2 : 9.4, camYaw: 0.5, camPitch: 0.12, vx: P ? 0 : 0.36, vy: P ? 0.02 : 0, field: 1, pulse: 0, dim: 1 } },
  { el: '#ariza', at: 1, v: { camYaw: -0.5, camPitch: 0.2 } },
  { el: '#surec', at: 0.35, v: { camR: 6, camYaw: Math.PI / 2 - 0.02, camPitch: 0.02, vx: P ? 0 : 0.36, vy: 0, field: 0.35, pulse: 0.8, dim: P ? 0.45 : 0.35, roll: 0 } },
  { el: '#yorumlar', at: 0.4, v: { camR: 2.4, camYaw: 0.2, camPitch: 0.62, tx: 0.2, ty: 0.75, vx: 0, vy: 0, field: 0.15, pulse: 0.5, dim: 0.22 } },
  { el: '#dukkan', at: 0.4, v: { camR: 10, camYaw: -0.8, camPitch: 0.4, tx: 0, ty: 0, field: 0.4, pulse: 0.3, dim: 0.35 } },
  { el: '#iletisim', at: P ? 0.25 : 0.55, v: { camR: P ? 7 : 9.4, camYaw: 0.6, camPitch: 0.2, vx: P ? 0 : 0.44, vy: P ? 0.3 : 0, field: 1, pulse: 1, heat: 1, dim: 1 } },
  { el: '#foot', at: 0, v: { dim: P ? 0.6 : 1, vy: P ? -0.42 : 0 } },
];
let keyList = [];
function buildKeys() {
  const vh = innerHeight;
  const sy = scrollY;
  const tracks = {};
  for (const k of KEYS) {
    const el = $(k.el);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    // anahtar karenin y'si: öğedeki nokta ekranın ortasına geldiğinde
    const max = document.documentElement.scrollHeight - vh;
    let y = Math.min(max - 1, r.top + sy + r.height * k.at - vh / 2);
    if (k.el === '#basla') y = 0;
    for (const [p, v] of Object.entries(k.v)) (tracks[p] ??= []).push({ y, v });
  }
  keyList = Object.entries(tracks).map(([p, list]) => [p, list.sort((a, b) => a.y - b.y)]);
}
const smooth = (t) => t * t * (3 - 2 * t);
function sample(list, y) {
  if (y <= list[0].y) return list[0].v;
  const last = list[list.length - 1];
  if (y >= last.y) return last.v;
  let i = 0;
  while (list[i + 1].y < y) i++;
  const a = list[i], b = list[i + 1];
  return a.v + (b.v - a.v) * smooth((y - a.y) / Math.max(1, b.y - a.y));
}
let lastOp = '';
let override = {}; // arıza bölümü alanı doğrudan yönetir
let introHold = !reducedMotion;
function applyFilm() {
  if (!coil) return;
  const y = scrollY;
  for (const [p, list] of keyList) S[p] = sample(list, y);
  Object.assign(S, override);
  if (introHold) S.wind = Math.min(S.wind, introWind.v);
  const op = (0.3 + 0.7 * Math.min(1, S.dim)).toFixed(2);
  if (op !== lastOp && !introHold) canvas.style.opacity = lastOp = op;
  meters();
}
const introWind = { v: reducedMotion ? 0.3 : 0 };

// Hero göstergeleri: sarım sayısı, katman, direnç
const TOTAL_TURNS = 27 * 6;
const mTurn = $('#m-turn'), mLayer = $('#m-layer'), mOhm = $('#m-ohm');
let lastTurn = -1;
function meters() {
  const w = Math.min(1, Math.max(0, S.wind));
  const turn = Math.round(w * TOTAL_TURNS);
  if (turn === lastTurn) return;
  lastTurn = turn;
  mTurn.textContent = String(turn).padStart(3, '0');
  mLayer.textContent = `${Math.min(6, Math.floor(w * 5.999) + 1)}/6`;
  mOhm.textContent = `${(w * 1.84).toFixed(2).replace('.', ',')} Ω`;
}

ScrollTrigger.addEventListener('refresh', () => {
  buildKeys();
  applyFilm();
});
if (lenis) lenis.on('scroll', applyFilm);
else addEventListener('scroll', applyFilm, { passive: true });

// Ekran dışı / sekme gizli: çizimi durdur
if (coil) {
  addEventListener('resize', () => coil.resize());
  document.addEventListener('visibilitychange', () => (document.hidden ? coil.stop() : coil.start()));
}

// --- Arıza bölümü: sabitlenir, her kod sırayla çözülür -------------------------------------
const fcards = $$('.fcard');
const fLeft = $('#f-left');
const fBar = $('#f-bar');
let fStage = -1;
function setFault(p) {
  // p: 0..1 → 0 = hepsi arızalı, her çeyrekte bir kod çözülür
  const n = faults.length || 1;
  const solved = Math.min(n, Math.floor(p * (n + 0.6)));
  const active = Math.min(n - 1, Math.floor(p * n));
  override = { chaos: (n - solved) / n, fault: solved < n ? 1 : 0 };
  if (fBar) fBar.style.transform = `scaleX(${p})`;
  const key = `${active}-${solved}`;
  if (key === fStage) return;
  fStage = key;
  fcards.forEach((c, i) => {
    c.classList.toggle('is-on', i === active);
    c.classList.toggle('is-ok', i < solved);
  });
  fLeft.textContent = n - solved;
  fLeft.parentElement.classList.toggle('is-zero', n - solved === 0);
}
setFault(0);
override = {};

ScrollTrigger.create({
  trigger: '#ariza',
  start: 'top top',
  end: () => `+=${innerHeight * (faults.length * (P ? 0.75 : 0.65))}`,
  pin: '.faults__pin',
  pinSpacing: true,
  // Alan kontrolü yalnızca bölüm sabitliyken; dışarıda film anahtarlarına geri döner.
  onUpdate: (self) => {
    setFault(self.progress);
    if (!self.isActive) override = {};
  },
  onToggle: (self) => {
    setFault(self.isActive ? self.progress : self.progress > 0.5 ? 1 : 0);
    if (!self.isActive) override = {};
    applyFilm();
  },
});

// --- Metin hareketleri -------------------------------------------------------------------
function textFx() {
  if (reducedMotion) return;
  // başlıklar kelime kelime yükselir (clip-path ile, İ noktası kesilmesin diye üst pay)
  $$('.split').forEach((h) => {
    const st = new SplitText(h, { type: 'words', wordsClass: 'w' });
    gsap.from(st.words, {
      yPercent: 110, rotate: 4, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: h, start: 'top 85%' },
    });
  });
  $$('.svc__item').forEach((li) => {
    gsap.from(li, { x: P ? 0 : 40, y: P ? 30 : 0, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 90%' } });
    gsap.fromTo(li.querySelector('.svc__wire'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power2.inOut', scrollTrigger: { trigger: li, start: 'top 85%' } });
  });
  $$('.step').forEach((s, i) => {
    const arc = s.querySelector('.arc');
    gsap.fromTo(arc, { strokeDashoffset: 164 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 45%', scrub: true } });
    gsap.from(s, { y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', delay: (i % 2) * 0.05, scrollTrigger: { trigger: s, start: 'top 88%' } });
  });
  $$('.stage__cap').forEach((c) => {
    gsap.fromTo(c, { autoAlpha: 0, letterSpacing: '0.3em' }, {
      autoAlpha: 1, letterSpacing: '0em', ease: 'none',
      scrollTrigger: { trigger: c.parentElement, start: 'top 70%', end: 'center 50%', scrub: true },
    });
  });
  $$('.duo').forEach((f, i) => {
    gsap.fromTo(f, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'expo.inOut', delay: i * 0.12, scrollTrigger: { trigger: f, start: 'top 85%' } });
    gsap.fromTo(f.querySelector('img'), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.finale__title span', { yPercent: 100, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.finale__title', start: 'top 80%' } });
  gsap.from('.rv__card', { x: 80, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.rv', start: 'top 85%' } });
}

// Sayaçlar
$$('.stat__n').forEach((el) => {
  const to = Number(el.dataset.to) || 0;
  if (reducedMotion) {
    el.textContent = fmt(to);
    return;
  }
  const o = { v: 0 };
  gsap.to(o, {
    v: to, duration: 1.8, ease: 'power3.out',
    onUpdate: () => (el.textContent = fmt(o.v)),
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

// Marka şeridi
if (!reducedMotion) {
  gsap.to('.brands__row', { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
}

// Başlık çubuğu: aşağı inince koyulaşır
ScrollTrigger.create({ start: 80, onToggle: (s) => $('#top').classList.toggle('is-solid', s.isActive) });

// --- Açılış ------------------------------------------------------------------------------
function spiralPath() {
  // Arşimet spirali: bobinin önden görünüşü gibi, içten dışa
  const turns = 9;
  let p = '';
  for (let i = 0; i <= turns * 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r = 18 + (i / (turns * 60)) * 128;
    p += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  }
  return p;
}

function intro() {
  const el = $('#intro');
  const path = $('#intro-spiral');
  path.setAttribute('d', spiralPath());
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  const count = $('#intro-count');
  const done = () => {
    introHold = false;
    el.remove();
    lenis?.start();
    applyFilm();
  };
  if (reducedMotion) {
    done();
    return;
  }
  lenis?.stop();
  const c = { n: 0 };
  const tl = gsap.timeline({ onComplete: done });
  tl.to(path, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut' }, 0)
    .to(c, { n: TOTAL_TURNS, duration: 1.7, ease: 'power2.inOut', onUpdate: () => (count.textContent = String(Math.round(c.n)).padStart(3, '0')) }, 0)
    .to(introWind, { v: 0.3, duration: 1.7, ease: 'power2.inOut', onUpdate: applyFilm }, 0.4)
    .from('#intro-name', { yPercent: 60, autoAlpha: 0, duration: 0.7, ease: 'expo.out' }, 0.35)
    .to('.intro__coil', { scale: 7, rotate: 120, autoAlpha: 0, duration: 0.9, ease: 'expo.in' }, 1.75)
    .to('.intro__center, .intro__skip', { autoAlpha: 0, scale: 1.15, duration: 0.5, ease: 'power2.in' }, 1.8)
    .to(el, { backgroundColor: 'rgba(8,26,23,0)', duration: 0.6, ease: 'power2.in' }, 2.0)
    .fromTo('#gl', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 1.9)
    .from('.hero__title .ln', { yPercent: 105, duration: 1, ease: 'expo.out', stagger: 0.1 }, 2.15)
    .from('.hero__kicker, .hero__sub, .hero__cta, .hero__meter, .hero__hint, .top', { y: 20, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 }, 2.3);
  el.addEventListener('pointerdown', () => tl.progress(1), { once: true });
}

// --- Başlat --------------------------------------------------------------------------------
let started = false;
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  if (started) return;
  started = true;
  textFx();
  buildKeys();
  applyFilm();
  if (coil) {
    coil.warm();
    coil.snap();
    coil.start();
  }
  intro();
  ScrollTrigger.refresh();
});
if (!coil) gsap.set('#gl', { autoAlpha: 0 });
