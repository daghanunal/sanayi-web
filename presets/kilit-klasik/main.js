// Pim (klasik aile, oto kilit ve anahtar): anahtarcı panosu kobalt mavisi, pirinç sarısı, çelik grisi.
// Fotoğraf ağırlıklı, WebGL yok. İmza anı hero'da: pim hizası. Kaydırdıkça anahtar kilide girer, dişler
// beş pimi tek tek kaldırır; pimler kesme hattında hizalanınca anahtar döner ve ekran kesme hattından
// ikiye ayrılır (üst gövde yukarı, göbek aşağı), arkadan dükkân fotoğrafı açılır.
import sektor from '../../data/sektor-kilit.json';
import extra from '../../data/kilit-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const SVGNS = 'http://www.w3.org/2000/svg';

icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;
icons.id = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.3"/><path d="M5 16.2c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4M14.5 10h4.5M14.5 13.5h3"/></svg>`;
icons.key = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="12" r="4.5"/><path d="M12 12h9.5v3M18 12v2.5"/></svg>`;

const TIP_IKON = {
  duz: `<svg viewBox="0 0 120 60" aria-hidden="true"><circle cx="24" cy="30" r="17" class="f"/><circle cx="18" cy="30" r="5" class="h"/><path class="f" d="M40 24h72l4 6-4 6H98l-3 5-4-5h-7l-3 7-4-7H40z"/></svg>`,
  cipli: `<svg viewBox="0 0 120 60" aria-hidden="true"><rect x="4" y="12" width="40" height="36" rx="12" class="k"/><rect x="16" y="23" width="14" height="14" rx="2" class="c"/><path class="f" d="M44 25h68l4 5-4 5H98l-3 5-4-5h-7l-3 6-4-6H44z"/></svg>`,
  sustali: `<svg viewBox="0 0 120 60" aria-hidden="true"><rect x="4" y="10" width="54" height="40" rx="14" class="k"/><circle cx="20" cy="22" r="4" class="c"/><circle cx="20" cy="38" r="4" class="c"/><circle cx="46" cy="30" r="5" class="h"/><path class="f" d="M50 26 L112 12 l4 5 -6 4 -8 1 -2 5 -5 -3 -7 2 -1 6 -5 -4 -31 7z"/></svg>`,
  akilli: `<svg viewBox="0 0 120 60" aria-hidden="true"><rect x="30" y="4" width="60" height="52" rx="18" class="k"/><rect x="44" y="14" width="32" height="9" rx="4.5" class="c"/><rect x="44" y="27" width="32" height="9" rx="4.5" class="c"/><rect x="44" y="40" width="32" height="7" rx="3.5" class="c"/><path class="w" d="M96 20a14 14 0 0 1 0 20M104 14a22 22 0 0 1 0 32"/></svg>`,
};

// --- Bağlamalar ---------------------------------------------------------------
const yil = new Date().getFullYear() - d.isletme.kurulus;
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
if (d.isletme.ad.length > 16) $('.hero__name').classList.add('is-long');
if (d.isletme.ad.length > 26) $('.hero__name').classList.add('is-xlong');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `Oto kilit · Anahtar · Şaşmaz · ${d.isletme.kurulus}`;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-open-title]').textContent = 'Kapı açıldı. Sıra sizin anahtarınızda.';
$('[data-final]').textContent = d.finalBaslik;
$('[data-acil-baslik]').textContent = d.acil.baslik;
$('[data-acil-metin]').textContent = d.acil.metin;
$('[data-acil-kural]').textContent = d.acil.kural;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: pim hizası ---------------------------------------------------------
// SVG birimleri: gövde x 200–900, kesme hattı y 190, anahtar yolu y 224–328.
const SHEAR = 190;
const CH = [360, 460, 560, 660, 760]; // pim yuvalarının x merkezi
const KEY_IN = 160; // anahtar tam girdiğinde omuz x'i (uç 880)
const KEY_OUT = 170 - 720; // başlangıçta uç kilidin ağzında
const BLADE_TOP = 232, BLADE_BOT = 322;
const code = (d.kesimKodu || [3, 1, 4, 2, 5]).slice(0, 5);
const cutY = code.map((c) => BLADE_TOP + 12 + c * 12); // dişin dibi
const L = cutY.map((y) => y - SHEAR); // alt pim boyu
const REST_TOP = SHEAR + 20; // anahtarsızken alt pimin üstü
const DRIVER = 44;
const CH_TOP = 58;
const LOC = CH.map((c) => c - KEY_IN); // dişlerin anahtar üstündeki yeri

function bladeTop(l) {
  let y = BLADE_TOP;
  for (let i = 0; i < 5; i++) y = Math.max(y, cutY[i] - 1.35 * Math.abs(l - LOC[i]));
  if (l > 686) y = Math.max(y, BLADE_TOP + (l - 686) * 2);
  return y;
}
{
  let p = `M0 ${BLADE_TOP}`;
  for (let l = 4; l <= 720; l += 4) p += ` L${l} ${bladeTop(l).toFixed(1)}`;
  p += ` L720 306 L706 ${BLADE_BOT} L0 ${BLADE_BOT} Z`;
  $('[data-blade]').setAttribute('d', p);
  $('[data-groove]').setAttribute('d', `M0 296 H660 M0 306 H640`);
}

const mk = (tag, attrs, parent) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  parent.append(el);
  return el;
};
const chambers = $('[data-chambers]');
const plugCh = $('[data-plugchambers]');
const driversG = $('[data-drivers]');
const keypinsG = $('[data-keypins]');
const pins = CH.map((c, i) => {
  mk('rect', { class: 'lock__chamber', x: c - 20, y: CH_TOP - 4, width: 40, height: SHEAR - CH_TOP + 4 }, chambers);
  mk('rect', { class: 'lock__chamber', x: c - 20, y: SHEAR, width: 40, height: 40 }, plugCh);
  const spring = mk('polyline', { class: 'spring', 'vector-effect': 'non-scaling-stroke', points: Array.from({ length: 11 }, (_, k) => `${k % 2 ? 12 : -12},${k / 10}`).join(' ') }, driversG);
  const driver = mk('rect', { class: 'driver', x: -16, y: 0, width: 32, height: DRIVER, rx: 5 }, driversG);
  const kp = mk('path', { class: 'keypin', d: `M-15 0 H15 V${L[i] - 12} L0 ${L[i]} L-15 ${L[i] - 12} Z` }, keypinsG);
  return { c, spring, driver, kp, set: false };
});

const hero = $('.hero');
const pinBox = $('.hero__pin');
const lock = $('[data-lock]');
const housing = $('[data-housing]');
const plug = $('[data-plug]');
const keyG = $('[data-key]');
const keyHead = $('[data-keyhead]');
const halfTop = $('.half--top');
const halfBot = $('.half--bot');
const topIn = $('.half--top .half__in');
const photo = $('.hero__photo');
const openBox = $('.hero__open');
const hint = $('.hero__hint');
const cellsBox = $('[data-cells]');
cellsBox.innerHTML = code.map((c, i) => `<li><b>${i + 1}</b><span>${c}</span></li>`).join('');
const cells = $$('li', cellsBox);

let geo = { cut: 400, h: 800, s: 1 };
function measure() {
  const pr = pinBox.getBoundingClientRect();
  const lr = lock.getBoundingClientRect();
  const sr = $('[data-shear]').getBoundingClientRect();
  const s = lr.width / 1000;
  geo = { cut: sr.top + sr.height / 2 - pr.top, h: pr.height, s };
  pinBox.style.setProperty('--cut', `${geo.cut.toFixed(1)}px`);
}

let cur = -1;
let allSet = null;
function setP(p) {
  cur = p;
  // 1) Anahtar girer
  const ins = gsap.parseEase('power1.inOut')(seg(p, 0.04, 0.56));
  const K = KEY_OUT + (KEY_IN - KEY_OUT) * ins;
  keyG.setAttribute('transform', `translate(${K.toFixed(1)} 0)`);
  let n = 0;
  for (let i = 0; i < 5; i++) {
    const pn = pins[i];
    const l = pn.c - K;
    let top = REST_TOP;
    if (l >= 0 && l <= 720) top = Math.min(REST_TOP, bladeTop(l) - L[i]);
    const dTop = top - DRIVER;
    pn.kp.setAttribute('transform', `translate(${pn.c} ${top.toFixed(1)})`);
    pn.driver.setAttribute('transform', `translate(${pn.c} ${dTop.toFixed(1)})`);
    pn.spring.setAttribute('transform', `translate(${pn.c} ${CH_TOP}) scale(1 ${(dTop - CH_TOP).toFixed(1)})`);
    const ok = Math.abs(top - SHEAR) < 1.2;
    if (ok !== pn.set) { pn.set = ok; cells[i].classList.toggle('is-set', ok); }
    if (ok) n++;
  }
  const set = n === 5 && p >= 0.55;
  if (set !== allSet) { allSet = set; hero.classList.toggle('is-set', set); }

  // 2) Anahtar döner (yandan bakınca başlık incelir)
  const turn = seg(p, 0.6, 0.7);
  keyHead.setAttribute('transform', `translate(0 270) scale(1 ${(1 - 0.72 * turn).toFixed(3)}) translate(0 -270)`);
  hero.classList.toggle('is-turned', turn > 0.5);

  // 3) Kesme hattından ayrılır
  const sp = gsap.parseEase('power2.in')(seg(p, 0.68, 0.88));
  hero.classList.toggle('is-split', sp > 0.04);
  const up = (geo.cut + 40) * sp;
  const down = (geo.h - geo.cut + 40) * sp;
  topIn.style.opacity = (1 - clamp(sp * 2.2)).toFixed(3);
  halfTop.style.transform = `translate3d(0,${(-up).toFixed(1)}px,0)`;
  halfBot.style.transform = `translate3d(0,${down.toFixed(1)}px,0)`;
  housing.setAttribute('transform', `translate(0 ${(-up / geo.s).toFixed(1)})`);
  plug.setAttribute('transform', `translate(0 ${(down / geo.s).toFixed(1)})`);
  photo.style.transform = `scale(${(1.14 - 0.14 * seg(p, 0.68, 1)).toFixed(4)})`;
  const o = seg(p, 0.8, 0.94);
  openBox.style.opacity = o.toFixed(3);
  openBox.style.transform = `translate3d(0,${((1 - o) * 30).toFixed(1)}px,0)`;
  openBox.style.visibility = o > 0.01 ? 'visible' : 'hidden';
  hint.style.opacity = (1 - seg(p, 0, 0.06)).toFixed(3);
}
measure();

if (reducedMotion) {
  setP(0.58);
  hero.classList.add('is-static');
} else {
  setP(0);
  const m = { p: 0 };
  gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * 1.9}`,
      pin: pinBox, scrub: 0.6, anticipatePin: 1,
      onRefresh: () => { measure(); setP(m.p); },
    },
  }).to(m, { p: 1, duration: 1, ease: 'none', onUpdate: () => setP(m.p) });

  // Açılış
  gsap.from('.hero__name', { yPercent: 18, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.pins li', '.hero__slogan', '.half--bot .hero__cta'], { y: 14, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out', delay: 0.2 });
  gsap.from(lock, { opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.1 });
}
addEventListener('resize', () => { measure(); setP(Math.max(cur, 0)); });

// --- Anahtar tipi seçici ------------------------------------------------------
const tipBox = $('[data-types]');
const tipRes = $('[data-type-res]');
tipBox.innerHTML = d.anahtarTipleri.map((t, i) => `
  <button type="button" class="ktip" role="radio" aria-checked="${i === 0}" data-i="${i}">
    <span class="ktip__art">${TIP_IKON[t.ikon] || ''}</span>
    <span class="ktip__ad">${esc(t.ad)}</span>
  </button>`).join('');
function pickTip(i, animate) {
  const t = d.anahtarTipleri[i];
  $$('.ktip', tipBox).forEach((c, k) => c.setAttribute('aria-checked', String(k === i)));
  const isler = t.isler.map((k) => d.hizmetler[k]).filter(Boolean);
  const wa = waHref(d, `Merhaba ${d.isletme.ad}, elimde ${t.ad.toLocaleLowerCase('tr')} var. Aracım: `);
  tipRes.innerHTML = `
    <p class="res__ipucu"><span class="mono">Nasıl anlaşılır?</span>${esc(t.ipucu)}</p>
    <p class="res__nasil">${esc(t.nasil)}</p>
    <ul class="res__isler">${isler.map((h) => `<li>${icons.key}<span>${esc(h.baslik)}</span><b class="mono">${esc(h.sure)}</b></li>`).join('')}</ul>
    <div class="res__foot">
      <p class="res__sure"><span class="mono">Ortalama süre</span><b>${esc(t.sure)}</b></p>
      <a class="btn btn--cobalt" href="${esc(wa)}" target="_blank" rel="noopener">${icons.whatsapp}Bu anahtar için yaz</a>
    </div>`;
  if (animate && !reducedMotion) gsap.from(tipRes.children, { y: 12, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
}
tipBox.addEventListener('click', (e) => {
  const c = e.target.closest('.ktip');
  if (c) pickTip(Number(c.dataset.i), true);
});
tipBox.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const cs = $$('.ktip', tipBox);
  const i = cs.findIndex((c) => c.getAttribute('aria-checked') === 'true');
  const nx = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + cs.length) % cs.length;
  pickTip(nx, true);
  cs[nx].focus();
});
pickTip(0, false);

// --- Hizmetler: anahtar etiketleri ---------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="etiket">
    <span class="etiket__peg" aria-hidden="true"></span>
    <div class="etiket__card">
      <span class="etiket__hole" aria-hidden="true"></span>
      <p class="etiket__no mono">Nº ${String(i + 1).padStart(2, '0')}</p>
      <h3 class="etiket__ad">${esc(h.baslik)}</h3>
      <p class="etiket__desc">${esc(h.aciklama)}</p>
      <p class="etiket__sure mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
    </div>
  </li>`).join('');

// --- Rakamlar ------------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="kod__item">
    <p class="kod__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="kod__lbl mono">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Süreç ---------------------------------------------------------------------
$('[data-steps]').innerHTML = (d.surec.map((s, i) => `
  <li class="adim${i === 1 ? ' adim--kural' : ''}">
    <span class="adim__no" aria-hidden="true">${i + 1}</span>
    <div class="adim__body">
      <h3 class="adim__ad">${esc(s.baslik)}${i === 1 ? '<span class="adim__tag mono">Kural</span>' : ''}</h3>
      <p class="adim__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join(''));

// --- Galeri --------------------------------------------------------------------
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot${i % 3 === 0 ? ' shot--wide' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ------------------------------------------------------------------
const stars = (k) => Array.from({ length: 5 }, (_, i) => `<span class="${i < k ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
  </li>`).join('');

// --- Markalar ------------------------------------------------------------------
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join(`<i aria-hidden="true">${icons.key}</i>`);
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}<i aria-hidden="true">${icons.key}</i></div><div class="marka__row" aria-hidden="true">${brandRow}<i>${icons.key}</i></div>`;
new IntersectionObserver(([e]) => $('.marka').classList.toggle('is-off', !e.isIntersecting)).observe($('.marka'));

// --- Saatler -------------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const today = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${today >= a && today <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header --------------------------------------------------------------------
const top = $('.top');
const solid = () => top.classList.toggle('is-solid', scrollY > hero.offsetTop + hero.offsetHeight - 70);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri -----------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2, .acil__title').forEach((h) => gsap.from(h, { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  gsap.from('.acil__in > *:not(.acil__title)', { y: 18, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.acil', start: 'top 80%' } });
  gsap.from('.ktip', { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.tip__opts', start: 'top 88%' } });

  // Etiketler kancaya takılır gibi sallanarak gelir
  $$('.etiket__card').forEach((c, i) => gsap.fromTo(c,
    { rotate: i % 2 ? 16 : -16, y: -24, opacity: 0 },
    { rotate: 0, y: 0, opacity: 1, duration: 1.3, ease: 'elastic.out(1, 0.38)', delay: (i % 3) * 0.08, scrollTrigger: { trigger: c, start: 'top 90%' } }));

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });
  gsap.from('.kod__item', { y: 26, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.kod', start: 'top 85%' } });

  gsap.fromTo('.surec__rail span', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.surec__wrap', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 } });
  $$('.adim').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 72%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on') }));

  gsap.fromTo('.atolye__photo img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.atolye__photo', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut', scrollTrigger: { trigger: '.atolye', start: 'top 75%' } });
  gsap.from('.shot', { x: 50, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.galeri', start: 'top 80%' } });
  gsap.from('.rev', { y: 26, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('[data-final-key]', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top 85%', end: 'center 60%', scrub: 0.5 } });
} else {
  $$('.adim').forEach((s) => s.classList.add('is-on'));
}

addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
