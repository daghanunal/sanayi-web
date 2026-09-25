// Seviye (klasik aile, otomatik şanzıman): alüminyum grisi, grafit ve ATF kırmızısı
// (otomatik şanzıman yağının kendi rengi). Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: yağ çubuğu. Kaydırdıkça ekranın altından yağ yükselir; koyu, eksik yağ
// taze ATF kırmızısına döner ve sağdaki çubukta MIN'den MAX çizgisine "tık" diye oturur (snap).
import sektor from '../../data/sektor-sanziman.json';
import extra from '../../data/sanziman-klasik.json';
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
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;
const drop = (c) => `<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2C20 2 4 22 4 33a16 16 0 0 0 32 0C36 22 20 2 20 2z" fill="${esc(c)}"/><path d="M12 33a8 8 0 0 0 6 8" fill="none" stroke="rgb(255 255 255 / .45)" stroke-width="2.4" stroke-linecap="round"/></svg>`;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `Otomatik şanzıman · Şaşmaz · ${ablative(d.isletme.kurulus)} beri`;
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: yağ çubuğu ------------------------------------------------------------
const S = d.seviyeler;
const hero = $('.hero');
const oil = $('[data-oil]');
const oilNew = $('[data-oil-new]');
const oilOld = $('.sivi__old');
const lvlEl = $('[data-lvl]');
const lvlNum = $('[data-lvl-num]');
const gTitle = $('[data-g-title]'), gText = $('[data-g-text]'), gNo = $('[data-g-no]'), gAd = $('[data-g-ad]'), gStep = $('[data-g-step]');
const small = matchMedia('(max-width: 899px)').matches;
const steps = S.length - 1;

let stage = -1;
function setStage(i, animate) {
  if (i === stage) return;
  const prev = stage;
  stage = i;
  const v = S[i];
  hero.dataset.stage = String(i);
  const write = () => {
    gNo.textContent = String(i + 1);
    gAd.textContent = v.etiket;
    gStep.textContent = `${i + 1}/${S.length}`;
    gTitle.textContent = v.baslik;
    gText.textContent = v.metin;
  };
  if (!animate || reducedMotion) return write();
  const dir = i > prev ? 1 : -1;
  gsap.killTweensOf('.gcard > *');
  gsap.to('.gcard > *', {
    y: -10 * dir, opacity: 0, duration: 0.14, ease: 'power1.in',
    onComplete: () => {
      write();
      gsap.fromTo('.gcard > *', { y: 14 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, stagger: 0.04, ease: 'power3.out' });
    },
  });
  if (i === steps) gsap.fromTo('.stick__zone', { opacity: .4 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
}

// p: 0..1 → seviye (yüzde), kademeler arasında doğrusal
let H = hero.querySelector('.hero__pin').offsetHeight;
let lastLvl = -1;
const intro = { off: 0 };
function setLevel(p) {
  const x = p * steps, k = Math.min(Math.floor(x), steps - 1), f = x - k;
  const lvl = S[k].seviye + (S[k + 1].seviye - S[k].seviye) * f;
  const y = H * (1 - lvl / 100) + intro.off;
  oil.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  lvlEl.style.transform = `translate3d(0, ${(-H * lvl / 100).toFixed(1)}px, 0)`;
  const fresh = Math.min(1, Math.max(0, (p - 0.15) / 0.7));
  oilNew.style.opacity = fresh.toFixed(3);
  oilOld.style.opacity = (1 - fresh).toFixed(3);
  const r = Math.round(lvl);
  if (r !== lastLvl) { lastLvl = r; lvlNum.textContent = r; }
}

setStage(0, false);
let prog = 0;
if (reducedMotion) {
  prog = 1;
  setStage(steps, false);
  setLevel(1);
} else {
  setLevel(0);
  const m = { p: 0 };
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.9 : 2.3)}`,
      pin: '.hero__pin', scrub: 0.4, anticipatePin: 1,
      snap: { snapTo: (v, st) => Math.round((st ? st.progress : v) * steps) / steps, duration: { min: 0.2, max: 0.5 }, delay: 0.06, ease: 'power2.inOut' },
    },
  });
  tl.to(m, {
    p: 1, duration: 1,
    onUpdate: () => { prog = m.p; setLevel(m.p); setStage(Math.round(m.p * steps), true); },
  }, 0)
    .fromTo('.hero__img', { scale: 1.1 }, { scale: 1, duration: 1 }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.1 }, 0);

  // Açılış: yağ alttan kabarır
  intro.off = H * 0.16;
  setLevel(0);
  gsap.to(intro, { off: 0, duration: 1.4, ease: 'power3.out', delay: 0.1, onUpdate: () => setLevel(prog) });
  gsap.from('.hero__name', { yPercent: 28, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__foot > *'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  gsap.from('.stick', { opacity: 0, x: 20, duration: 0.8, ease: 'power3.out', delay: 0.3 });
}
addEventListener('resize', () => { H = hero.querySelector('.hero__pin').offsetHeight; setLevel(prog); });

// --- Şanzıman tipleri --------------------------------------------------------
const tabs = $('[data-tabs]');
const panel = $('[data-panel]');
tabs.innerHTML = d.tipler.map((t, i) => `
  <button type="button" class="tab" role="tab" id="tab-${i}" aria-selected="${i === 0}" data-i="${i}">
    <b>${esc(t.kod)}</b><span>${esc(t.ad)}</span>
  </button>`).join('') + '<span class="tab__ind" aria-hidden="true"></span>';
const tabInd = $('.tab__ind', tabs);
function pickTip(i, animate) {
  const t = d.tipler[i];
  const bs = $$('.tab', tabs);
  bs.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
  panel.setAttribute('aria-labelledby', `tab-${i}`);
  tabInd.style.transform = `translateX(${i * 100}%)`;
  const wa = waHref(d, `Merhaba ${d.isletme.ad}, aracımda ${t.ad} şanzıman var. Bakabilir misiniz?`);
  panel.innerHTML = `
    <figure class="tp__photo"><img src="${esc(t.img)}" alt="" loading="lazy" decoding="async" /><span class="tp__kod">${esc(t.kod)}</span></figure>
    <div class="tp__body">
      <p class="tp__alt mono">${esc(t.alt)}</p>
      <h3 class="tp__ad">${esc(t.ad)}</h3>
      <p class="tp__metin">${esc(t.metin)}</p>
      <p class="tp__lbl mono">Sık gördüğümüz belirtiler</p>
      <ul class="tp__list">${t.belirtiler.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <a class="btn btn--atf" href="${esc(wa)}" target="_blank" rel="noopener">${icons.whatsapp}Bu şanzıman için yaz</a>
    </div>`;
  if (animate && !reducedMotion) {
    gsap.from('.tp__photo img', { scale: 1.12, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.from('.tp__body > *', { y: 14, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out' });
  }
}
tabs.addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (b) pickTip(Number(b.dataset.i), true);
});
tabs.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault();
  const bs = $$('.tab', tabs);
  const i = bs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
  const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length;
  pickTip(n, true);
  bs[n].focus();
});
pickTip(0, false);

// --- Rakamlar ----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Hizmetler ---------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc">
    <span class="svc__no mono">${String(i + 1).padStart(2, '0')}</span>
    <div class="svc__body">
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
    </div>
    <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
  </li>`).join('');

// --- Yağ rengi -----------------------------------------------------------------
$('[data-oils]').innerHTML = d.yagRenkleri.map((y, i) => `
  <li class="oil" style="--c:${esc(y.renk)}">
    <span class="oil__drop">${drop(y.renk)}</span>
    <div>
      <p class="oil__durum mono"><span>${String(i + 1).padStart(2, '0')}</span>${esc(y.durum)}</p>
      <h3 class="oil__ad">${esc(y.ad)}</h3>
      <p class="oil__metin">${esc(y.metin)}</p>
    </div>
  </li>`).join('');

// --- Süreç -------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__no mono">${String(i + 1).padStart(2, '0')}</span>
    <div>
      <h3 class="step__title">${esc(s.baslik)}</h3>
      <p class="step__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot${i % 3 === 0 ? ' shot--wide' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
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

// --- Markalar ----------------------------------------------------------------
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}<i aria-hidden="true"></i></div><div class="marka__row" aria-hidden="true">${brandRow}<i></i></div>`;

// --- Saatler -----------------------------------------------------------------
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

// --- Header ------------------------------------------------------------------
const top = $('.top');
ScrollTrigger.create({ start: () => innerHeight * 0.5, end: 'max', onToggle: (st) => top.classList.toggle('is-solid', st.isActive) });

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  gsap.from('.tab', { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.tip__tabs', start: 'top 90%' } });
  gsap.from('.tip__panel', { y: 36, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.tip__panel', start: 'top 90%' } });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });

  gsap.from('.svc', { y: 24, opacity: 0, duration: 0.55, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: '.svcs__list', start: 'top 86%' } });

  $$('.oil').forEach((o) => gsap.from(o, { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: o, start: 'top 90%' } }));
  gsap.from('.oil__drop', { scale: 0.3, y: -30, duration: 0.8, stagger: 0.12, ease: 'bounce.out', scrollTrigger: { trigger: '.yag__list', start: 'top 80%' } });

  gsap.fromTo('[data-line]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.surec__list', start: 'top 75%', end: 'bottom 60%', scrub: 0.4 } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 72%', once: true, onEnter: () => s.classList.add('is-done') }));

  gsap.fromTo('.about__photo img', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.shot', { x: 60, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.gal', start: 'top 85%' } });
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__d', { yPercent: 18, opacity: 0.2 }, { yPercent: -6, opacity: .8, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.final__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-done'));
}

addEventListener('load', () => { H = hero.querySelector('.hero__pin').offsetHeight; setLevel(prog); ScrollTrigger.refresh(); });
