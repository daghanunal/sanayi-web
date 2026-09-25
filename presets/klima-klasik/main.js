// Ayaz (klasik aile, oto klima): gece laciverti, kırağı beyazı, buz mavisi; sıcak turuncu yalnızca
// "arıza" hâlinde. Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: termostat. Kaydırdıkça üfleme ağzından soğuk hava dairesel yayılır (fotoğrafın
// soğuk tonu clip-path ile açılır), derece 38'den 6'ya iner, kadran ibresi kırmızıdan maviye döner.
import sektor from '../../data/sektor-klima.json';
import extra from '../../data/klima-klasik.json';
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
icons.snow = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2.5L15 4M9 20l3-2.5 3 2.5M4 10.3l3.7-.8L6.6 6M20 13.7l-3.7.8 1.1 3.5M4 13.7l3.7.8L6.6 18M20 10.3l-3.7-.8L17.4 6"/></svg>`;

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
if (d.isletme.ad.length > 18) $('.hero__name').classList.add('is-long');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `Oto klima · Şaşmaz · ${ablative(d.isletme.kurulus)} beri`;
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-final-sub]').textContent = `Klima sezonunda sıra uzar. Arayın, gününüzü ayarlayalım. ${d.garanti ? d.garanti : ''}`.trim();
$('[data-final-temp]').textContent = `${d.hero.soguk}°C`;
$('[data-year]').textContent = new Date().getFullYear();
$('[data-fis-no]').textContent = `NO ${String(d.puan.adet * 7 + d.isletme.kurulus).padStart(5, '0')}`;

const status = openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: termostat ------------------------------------------------------------
const hero = $('.hero');
const stage = $('.hero__stage');
const vent = $('[data-vent]');
const tempEl = $('[data-temp]');
const verdict = $('[data-verdict]');
const badge = $('[data-badge]');
const needle = $('[data-needle]');
const fill = $('[data-fill]');
const cold = $('.hero__img--soguk');
const { sicak: T0, soguk: T1 } = d.hero;
const small = matchMedia('(max-width: 899px)').matches;

// Kadran çentikleri: 270° yay, 33 çentik
$('[data-ticks]').innerHTML = Array.from({ length: 33 }, (_, i) => {
  const a = (-135 + (270 * i) / 32) * (Math.PI / 180);
  const long = i % 4 === 0;
  const r1 = long ? 70 : 74, r2 = 80;
  const x1 = 100 + r1 * Math.sin(a), y1 = 100 - r1 * Math.cos(a);
  const x2 = 100 + r2 * Math.sin(a), y2 = 100 - r2 * Math.cos(a);
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${long ? 'l' : ''}"/>`;
}).join('');

// Fotoğraftaki üfleme ağzının yeri (1100×1650 görselde, oran olarak)
const IMG = { w: 1100, h: 1650, cx: 0.518, cy: 0.468, r: 0.3, px: 0.5, py: 0.47 };
let geo = { x: 0, y: 0, r: 100, far: 1000 };
function place() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const s = Math.max(w / IMG.w, h / IMG.h);
  const iw = IMG.w * s, ih = IMG.h * s;
  const ox = (w - iw) * IMG.px, oy = (h - ih) * IMG.py;
  const x = ox + IMG.cx * iw, y = oy + IMG.cy * ih, r = IMG.r * iw;
  const far = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
  geo = { x, y, r, far };
  vent.style.cssText = `left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px`;
}
place();
addEventListener('resize', () => { place(); setTemp(cur); });

let cur = 0;
let state = null;
function setTemp(p) {
  cur = p;
  const t = T0 + (T1 - T0) * p;
  tempEl.textContent = Math.round(t);
  badge.textContent = `${Math.round(t)}°C`;
  fill.style.strokeDasharray = `${p.toFixed(4)} 2`;
  fill.style.strokeDashoffset = `${(p - 1).toFixed(4)}`;
  needle.setAttribute('transform', `rotate(${(135 - 270 * p).toFixed(1)} 100 100)`);
  // Soğuk hava: ağızdan başlayıp bütün kareyi kaplayan daire
  const rad = p <= 0 ? 0 : geo.r * 0.9 + (geo.far - geo.r * 0.9) * gsap.parseEase('power2.in')(p);
  cold.style.clipPath = `circle(${rad.toFixed(1)}px at ${geo.x.toFixed(1)}px ${geo.y.toFixed(1)}px)`;
  const isCold = t <= 12;
  const st = isCold ? 2 : t <= 26 ? 1 : 0;
  if (st !== state) {
    state = st;
    hero.classList.toggle('is-cold', isCold);
    hero.classList.toggle('is-mid', st === 1);
    verdict.textContent = [d.hero.sicakDurum, d.hero.araDurum || d.hero.sicakDurum, d.hero.sogukDurum][st];
  }
}

if (reducedMotion) {
  setTemp(1);
} else {
  setTemp(0);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.15 : 1.4)}`,
      pin: '.hero__pin', scrub: 0.5, anticipatePin: 1,
    },
  });
  const m = { p: 0 };
  tl.to(m, { p: 1, duration: 1, onUpdate: () => setTemp(m.p) }, 0)
    .fromTo('.hero__stage', { scale: small ? 1.08 : 1 }, { scale: 1, duration: 1 }, 0)
    .fromTo('.hero__frost', { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.65)
    .to('.hero__hint', { opacity: 0, duration: 0.12 }, 0);

  // Açılış
  gsap.from('.hero__name', { yPercent: 30, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__foot > *'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  gsap.from('.dial', { rotate: -40, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 0.1 });
  gsap.from('.vent__read', { scale: 0.7, opacity: 0, duration: 0.9, ease: 'back.out(1.6)', delay: 0.35 });
}
// Masaüstü: hızlı hizmetler
$('[data-quick]').innerHTML = [0, 1, 4].map((i) => d.hizmetler[i]).filter(Boolean)
  .map((h) => `<li><span>${esc(h.baslik)}</span><b class="mono">${esc(h.sure)}</b></li>`).join('');
// Ekran dışındayken hava dalgalarını durdur
new IntersectionObserver(([e]) => hero.classList.toggle('is-off', !e.isIntersecting)).observe($('.hero__pin'));

// --- Belirti seçici ----------------------------------------------------------
const opts = $('[data-opts]');
const res = $('[data-res]');
opts.innerHTML = d.belirtiler.map((b, i) => `
  <button type="button" class="chip" role="radio" aria-checked="${i === 0}" data-i="${i}">${esc(b.etiket)}</button>`).join('');
function pick(i, animate) {
  const b = d.belirtiler[i];
  $$('.chip', opts).forEach((c, k) => c.setAttribute('aria-checked', String(k === i)));
  const wa = waHref(d, `Merhaba ${d.isletme.ad}, aracımın kliması: "${b.etiket}". Ne zaman getirebilirim?`);
  res.innerHTML = `
    <p class="res__tag mono"><span class="res__dot"></span>Olası sebep</p>
    <p class="res__sebep">${esc(b.sebep)}</p>
    <div class="res__ilk">
      <p><span class="mono">İlk yaptığımız</span><b>${esc(b.ilk)}</b></p>
      <p><span class="mono">Süre</span><b>${esc(b.sure)}</b></p>
    </div>
    <a class="btn btn--buz res__btn" href="${esc(wa)}" target="_blank" rel="noopener">${icons.whatsapp}Bu belirtiyle yaz</a>`;
  if (animate && !reducedMotion) gsap.from(res.children, { y: 14, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' });
}
opts.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (c) pick(Number(c.dataset.i), true);
});
opts.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const cs = $$('.chip', opts);
  const i = cs.findIndex((c) => c.getAttribute('aria-checked') === 'true');
  const n = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + cs.length) % cs.length;
  pick(n, true);
  cs[n].focus();
});
pick(0, false);

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

// --- Gazlar ------------------------------------------------------------------
$('[data-gas]').innerHTML = d.gazlar.map((g) => `
  <li class="gas">
    <p class="gas__ad">${esc(g.ad)}</p>
    <p class="gas__metin">${esc(g.metin)}</p>
    <p class="gas__not mono">${icons.check}${esc(g.not)}</p>
  </li>`).join('');

// --- Süreç (servis fişi) -----------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__box" aria-hidden="true">${icons.check}</span>
    <div>
      <h3 class="step__title"><span class="mono">${String(i + 1).padStart(2, '0')}</span>${esc(s.baslik)}</h3>
      <p class="step__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = ['atolye', 'klima-paneli', 'motor-kontrol', 'orta-konsol', 'lift', 'usta-sb', 'motor-bolmesi', 'konsol-sb'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('[data-gallery]').innerHTML = galItems.map((g) => `
  <figure class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>`).join('');

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
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join(`<i aria-hidden="true">${icons.snow}</i>`);
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}<i aria-hidden="true">${icons.snow}</i></div><div class="marka__row" aria-hidden="true">${brandRow}<i>${icons.snow}</i></div>`;

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const t = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${t >= a && t <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
const solid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  gsap.from('.chip', { y: 16, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: '.belirti__opts', start: 'top 88%' } });
  gsap.from('.belirti__res', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.belirti__res', start: 'top 90%' } });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });
  gsap.fromTo('.band__list', { '--frost': 0 }, { '--frost': 1, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: '.band', start: 'top 80%' } });

  gsap.from('.svc', { y: 24, opacity: 0, duration: 0.55, stagger: 0.05, ease: 'power2.out', scrollTrigger: { trigger: '.hizmet__list', start: 'top 86%' } });

  gsap.fromTo('.gaz__photo', { clipPath: 'circle(8% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', ease: 'none', scrollTrigger: { trigger: '.gaz', start: 'top 85%', end: 'top 25%', scrub: 0.4 } });
  gsap.from('.gas', { y: 26, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: '.gaz__list', start: 'top 88%' } });

  // Servis fişi: maddeler tek tek işaretlenir
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 78%', once: true, onEnter: () => s.classList.add('is-done') }));
  gsap.from('.fis', { y: 40, rotate: -1.2, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.fis', start: 'top 88%' } });

  gsap.fromTo('.atolye__photo img', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.shot', { x: 60, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.galeri', start: 'top 85%' } });
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-done'));
}

addEventListener('load', () => { place(); setTemp(cur); ScrollTrigger.refresh(); });
