// Çift Flaş (klasik aile, oto kilit ve anahtar): gece asfaltı, beton grisi, sinyal turuncusu.
// Fotoğraf ağırlıklı, WebGL yok. İmza anı hero'da: kaydırdıkça başparmak kumandanın "aç" tuşuna basar,
// sinyal halkaları araca gider, araç iki kez sinyal verir ve karşılama ışıkları yanar.
// Geri kaydırınca araç tek flaşla kilitlenir (gerçek araçlardaki gibi: aç = 2 flaş, kilitle = 1 flaş).
import sektor from '../../data/sektor-kilit.json';
import extra from '../../data/kilit-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const src = (p) => (/^https?:/.test(p) ? p : asset(p));

icons.id = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.3"/><path d="M5 16.2c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4M14.5 10h4.5M14.5 13.5h3"/></svg>`;
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;
icons.arrow = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

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
const nameLen = d.isletme.ad.length;
const heroName = $('.hero__name');
if (nameLen > 14) heroName.classList.add('is-long');
if (nameLen > 24) heroName.classList.add('is-xlong');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = 'Oto kilit · Anahtar · İmmobilizer';
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-years-short]').textContent = `${yil} yıl`;
$('[data-final]').innerHTML = String(d.finalBaslik).split(/(?<=[.!?])\s+/).map((t) => `<span>${esc(t)}</span>`).join('');
$('[data-plate]').textContent = `06 KLT ${d.isletme.kurulus}`;
$('[data-acil-baslik]').textContent = d.acil.baslik;
$('[data-acil-metin]').textContent = d.acil.metin;
$('[data-acil-kural]').textContent = d.acil.kural;
$('[data-year]').textContent = new Date().getFullYear();
if (d.heroFoto) $('[data-hero-img]').src = src(d.heroFoto);

const status = openStatus(d.saatler);
$('[data-status-big] span:last-child').textContent = status.text;
$('[data-status-short]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: çift flaş ----------------------------------------------------------
const hero = $('.hero');
const pinBox = $('.hero__pin');
const carBox = $('[data-car]');
const frame = $('[data-frame]');
const dim = $('[data-dim]');
const glows = $$('[data-glow]');
const heads = $$('[data-head]');
const pulse = $('[data-pulse]');
const fob = $('[data-fob]');
const thumb = $('[data-thumb]');
const btnOpen = $('[data-fob-btn="open"]');
const btnLock = $('[data-fob-btn="lock"]');
const fobLed = $('[data-fob-led]');
const waves = $$('[data-wave]');
const after = $('[data-after]');
const stateEl = $('[data-state]');
const stateTxt = $('[data-state-txt]');
const stateSub = $('[data-state-sub]');
const hint = $('.hero__hint');
const IMG_R = 1336 / 2000;

// Fotoğraf çerçevesini alanı kaplayacak şekilde boyutlandır (ışık noktaları % ile sabit kalsın).
function fitCar() {
  const r = carBox.getBoundingClientRect();
  let w = r.width, h = w / IMG_R;
  if (h < r.height) { h = r.height; w = h * IMG_R; }
  // Farı yatayda çerçevenin ortasına yakın tut (mobilde araç merkezde görünsün).
  const fx = innerWidth < 900 ? 0.47 : 0.5;
  const left = clamp(r.width * 0.5 - w * fx, r.width - w, 0);
  const top = (r.height - h) * (innerWidth < 900 ? 0.62 : 0.5);
  frame.style.cssText = `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px`;
}
fitCar();

let unlocked = false;
let flashTl = null;
const DIM_LOCK = 0.8, DIM_OPEN = 0.12;
gsap.set(dim, { opacity: DIM_LOCK });
gsap.set([...glows, pulse], { opacity: 0 });
gsap.set(heads, { opacity: 0 });

function setState(open) {
  stateEl.classList.toggle('is-open', open);
  stateTxt.textContent = open ? 'Kilit açık' : 'Kilitli';
  stateSub.textContent = open ? 'İki flaş: kapılar açıldı' : 'Kumandaya basın';
  hero.classList.toggle('is-unlocked', open);
}

function flash(open) {
  if (open === unlocked) return;
  unlocked = open;
  setState(open);
  flashTl?.kill();
  if (reducedMotion) {
    gsap.set(dim, { opacity: open ? DIM_OPEN : DIM_LOCK });
    gsap.set(heads, { opacity: open ? 1 : 0 });
    return;
  }
  const tl = gsap.timeline();
  const blink = (at) => {
    tl.to(glows, { opacity: 1, duration: 0.07, ease: 'none' }, at)
      .to(pulse, { opacity: 1, duration: 0.07, ease: 'none' }, at)
      .to(dim, { opacity: 0.42, duration: 0.07, ease: 'none' }, at)
      .to(fobLed, { opacity: 1, duration: 0.05 }, at)
      .to(glows, { opacity: 0, duration: 0.2, ease: 'power1.in' }, at + 0.26)
      .to(pulse, { opacity: 0, duration: 0.24, ease: 'power1.in' }, at + 0.26)
      .to(fobLed, { opacity: 0, duration: 0.2 }, at + 0.26)
      .to(dim, { opacity: open ? 0.7 : DIM_LOCK, duration: 0.2, ease: 'power1.in' }, at + 0.26);
  };
  if (open) {
    blink(0.05);
    blink(0.62);
    tl.to(dim, { opacity: DIM_OPEN, duration: 1.1, ease: 'power2.out' }, 1.15)
      .to(heads, { opacity: 1, duration: 0.9, ease: 'power2.out', stagger: 0.12 }, 1.15);
  } else {
    tl.to(heads, { opacity: 0, duration: 0.25 }, 0).to(dim, { opacity: 0.7, duration: 0.25 }, 0);
    blink(0.12);
  }
  flashTl = tl;
}

let cur = 0;
function setP(p) {
  cur = p;
  // 1) başparmak "aç" tuşuna gider ve basar
  const mv = gsap.parseEase('power2.inOut')(seg(p, 0.04, 0.26));
  const press = seg(p, 0.26, 0.31) - seg(p, 0.33, 0.38);
  thumb.style.transform = `translate3d(${(-58 * (1 - mv)).toFixed(1)}px,${(70 * (1 - mv)).toFixed(1)}px,0) scale(${(1 - 0.12 * press).toFixed(3)})`;
  thumb.style.opacity = (seg(p, 0.02, 0.1) * (1 - seg(p, 0.5, 0.6))).toFixed(3);
  btnOpen.style.transform = `scale(${(1 - 0.1 * press).toFixed(3)})`;
  // 2) sinyal halkaları
  waves.forEach((w, i) => {
    const t = seg(p, 0.3 + i * 0.035, 0.44 + i * 0.035);
    w.style.opacity = (t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0).toFixed(3);
    w.style.transform = `translate3d(0,${(-14 * t).toFixed(1)}px,0)`;
  });
  // 3) eşik: kilit açılır / kapanır
  flash(p >= 0.4);
  // 4) kumanda çekilir, metin açılır
  const out = gsap.parseEase('power2.in')(seg(p, 0.5, 0.7));
  fob.style.transform = `translate3d(0,${(out * 60).toFixed(1)}px,0) scale(${(1 - out * 0.25).toFixed(3)})`;
  fob.style.opacity = (1 - out).toFixed(3);
  fob.style.visibility = out > 0.99 ? 'hidden' : 'visible';
  const a = seg(p, 0.64, 0.86);
  after.style.opacity = a.toFixed(3);
  after.style.transform = `translate3d(0,${((1 - a) * 26).toFixed(1)}px,0)`;
  after.style.visibility = a > 0.01 ? 'visible' : 'hidden';
  frame.style.transform = `scale(${(1.1 - 0.1 * seg(p, 0, 1)).toFixed(4)})`;
  hint.style.opacity = (1 - seg(p, 0, 0.06)).toFixed(3);
}

let st = null;
if (reducedMotion) {
  hero.classList.add('is-static');
  flash(true);
  setP(0.95);
} else {
  setP(0);
  const m = { p: 0 };
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * 1.7}`,
      pin: pinBox, scrub: 0.5, anticipatePin: 1,
      onRefresh: () => { fitCar(); setP(m.p); },
    },
  }).to(m, { p: 1, duration: 1, ease: 'none', onUpdate: () => setP(m.p) });
  st = tl.scrollTrigger;

  // Açılış
  gsap.from('.hero__name', { yPercent: 30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__eyebrow', '.hero__state'], { y: 14, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.25 });
  gsap.from(fob, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.35, clearProps: 'transform,opacity' });
}

// Kumanda tuşları dokunulabilir: aç → kilit açılana kadar kaydır, kilitle → başa dön.
function goTo(p) {
  if (!st) { flash(p > 0.4); return; }
  const y = st.start + (st.end - st.start) * p;
  if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
  else scrollTo({ top: y, behavior: 'smooth' });
}
btnOpen.addEventListener('click', () => goTo(0.62));
btnLock.addEventListener('click', () => goTo(0));
addEventListener('resize', () => { fitCar(); setP(cur); });

// --- Hizmetler: yığın + dizin ---------------------------------------------------
const foto = (i) => src(d.hizmetFoto?.[i] || d.galeri[i % d.galeri.length].src);
const one = (d.oneCikan || [0, 2, 3, 5]).filter((i) => d.hizmetler[i]);
$('[data-stack]').innerHTML = one.map((k, n) => {
  const h = d.hizmetler[k];
  return `
  <li class="card" style="--n:${n}"><div class="card__inner">
    <span class="card__veil" aria-hidden="true"></span>
    <figure class="card__photo"><img src="${esc(foto(k))}" alt="" loading="lazy" decoding="async" /></figure>
    <div class="card__body">
      <p class="card__no mono">${String(n + 1).padStart(2, '0')} / ${String(one.length).padStart(2, '0')}</p>
      <h3 class="card__title">${esc(h.baslik)}</h3>
      <p class="card__desc">${esc(h.aciklama)}</p>
      <p class="card__sure mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
    </div>
  </div></li>`;
}).join('');
$('[data-dizin]').innerHTML = d.hizmetler.map((h, k) => (one.includes(k) ? '' : `
  <li class="row">
    <img class="row__img" src="${esc(foto(k))}" alt="" loading="lazy" decoding="async" />
    <div class="row__txt">
      <h4 class="row__title">${esc(h.baslik)}</h4>
      <p class="row__desc">${esc(h.aciklama)}</p>
    </div>
    <p class="row__sure mono">${esc(h.sure)}</p>
  </li>`)).join('');

// --- Rakamlar ------------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="rakam__item">
    <p class="rakam__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="rakam__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Belirti seçici ------------------------------------------------------------
const chips = $('[data-chips]');
const teshis = $('[data-teshis]');
const bel = d.belirtiler || [];
chips.innerHTML = bel.map((b, i) => `<button type="button" class="chip" role="radio" aria-checked="${i === 0}" data-i="${i}"><span class="chip__dot" aria-hidden="true"></span>${esc(b.kisa)}</button>`).join('');
function pick(i, animate) {
  const b = bel[i];
  if (!b) return;
  $$('.chip', chips).forEach((c, k) => c.setAttribute('aria-checked', String(k === i)));
  const h = d.hizmetler[b.hizmet] || {};
  const wa = waHref(d, `Merhaba ${d.isletme.ad}, aracımda şu sorun var: ${b.kisa}. Aracım: `);
  teshis.innerHTML = `
    <figure class="teshis__photo"><img src="${esc(foto(b.hizmet))}" alt="" decoding="async" /><figcaption class="mono">${esc(h.baslik || '')}</figcaption></figure>
    <div class="teshis__body">
      <p class="teshis__lbl mono">Belirti</p>
      <p class="teshis__belirti">${esc(b.belirti)}</p>
      <p class="teshis__lbl mono">Muhtemel sebep</p>
      <p class="teshis__sebep">${esc(b.sebep)}</p>
      <p class="teshis__lbl mono">Ne yaparız</p>
      <p class="teshis__cozum">${esc(b.cozum)}</p>
      <div class="teshis__foot">
        <p class="teshis__sure"><span class="mono">Ortalama süre</span><b>${esc(h.sure || '')}</b></p>
        <a class="btn btn--amber" href="${esc(wa)}" target="_blank" rel="noopener">${icons.whatsapp}Bunu yazın</a>
      </div>
    </div>`;
  if (animate && !reducedMotion) {
    gsap.fromTo(teshis.querySelector('.teshis__photo img'), { scale: 1.12, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' });
    gsap.from(teshis.querySelectorAll('.teshis__body > *'), { y: 10, opacity: 0, duration: 0.4, stagger: 0.035, ease: 'power2.out' });
  }
}
chips.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (c) pick(Number(c.dataset.i), true);
});
chips.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const cs = $$('.chip', chips);
  const i = cs.findIndex((c) => c.getAttribute('aria-checked') === 'true');
  const nx = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + cs.length) % cs.length;
  pick(nx, true);
  cs[nx].focus();
});
pick(0, false);

// --- Süreç ---------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="adim${i === 1 ? ' adim--kural' : ''}">
    <span class="adim__no" aria-hidden="true">${i + 1}</span>
    <h3 class="adim__ad">${esc(s.baslik)}</h3>
    <p class="adim__text">${esc(s.aciklama)}</p>
    ${i === 1 ? '<span class="adim__tag mono">Kural</span>' : ''}
  </li>`).join('');
$('[data-teslim]').innerHTML = (d.teslimTesti || []).map((t) => `<li><span class="tick">${icons.check}</span>${esc(t)}</li>`).join('');

// --- Galeri --------------------------------------------------------------------
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot shot--${i % 7}"><img src="${esc(src(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>`).join('');

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
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}</div><div class="marka__row" aria-hidden="true">${brandRow}</div>`;
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
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri -----------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2, .acil__title').forEach((h) => gsap.from(h, { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  gsap.from('.serit li', { y: 16, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.serit', start: 'top 92%' } });

  // Yığın kartları: arkadaki kart küçülüp kararır
  $$('.card').forEach((c, i, all) => {
    if (i === all.length - 1) return;
    const sc = { trigger: all[i + 1], start: 'top bottom', end: 'top 20%', scrub: true };
    gsap.to(c.querySelector('.card__inner'), { scale: 0.92, ease: 'none', scrollTrigger: sc });
    gsap.to(c.querySelector('.card__veil'), { opacity: 0.55, ease: 'none', scrollTrigger: { ...sc } });
  });
  $$('.card__photo img').forEach((im) => gsap.fromTo(im, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: im, start: 'top bottom', end: 'top 30%', scrub: true } }));
  gsap.from('.row', { y: 20, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.dizin', start: 'top 85%' } });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });
  gsap.from('.rakam__item', { y: 26, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.rakam', start: 'top 85%' } });
  gsap.from('.chip', { y: 14, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: '.belirti__chips', start: 'top 88%' } });

  // Acil: iki sinyal lambası bölüm görününce iki kez yanar
  ScrollTrigger.create({
    trigger: '.acil', start: 'top 75%', once: true,
    onEnter: () => gsap.timeline().to('.acil__flash i', { opacity: 1, duration: 0.06, repeat: 3, yoyo: true, repeatDelay: 0.22 }).to('.acil__flash i', { opacity: 1, duration: 0.3 }),
  });

  gsap.from('.adim', { y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: '.surec__list', start: 'top 82%' } });
  gsap.from('.teslim__list li', { x: -14, opacity: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.teslim', start: 'top 85%' } });

  gsap.fromTo('.dukkan__photo img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.dukkan', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.dukkan__photo', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut', scrollTrigger: { trigger: '.dukkan', start: 'top 75%' } });
  gsap.from('.shot', { y: 40, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.galeri__grid', start: 'top 85%' } });
  gsap.from('.rev', { y: 26, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__glow', { opacity: 0.15 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top 90%', end: 'center 55%', scrub: 0.5 } });
  gsap.from('.final__plate', { rotateX: -80, opacity: 0, duration: 0.9, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.final', start: 'top 70%' } });
}

addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
