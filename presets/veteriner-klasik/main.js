// Burun Buruna (klasik aile, veteriner kliniği): stüdyo fonu sisli gri-mavi, derin mürekkep,
// mandalina vurgu. Young Serif (başlık) + Albert Sans (gövde). WebGL yok, fotoğraf ağırlıklı.
// İmza anı hero'da: köpek soldan, kedi sağdan yalnızca burnunu uzatır; kaydırdıkça ikisi ortaya
// yaklaşır, burunları ortadaki çizgide buluşur ve çizgi iki ayrı muayene odasının duvarına dönüşür.
import sektor from '../../data/sektor-veteriner.json';
import extra from '../../data/veteriner-klasik.json';
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
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;
icons.alert = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.2v.1"/></svg>`;
icons.clock = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

// Yapı-sayı ekleri: 2011'den, 1998'den ...
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// JSON-LD türünü kliniğe çevir
const ld = $('script[type="application/ld+json"]');
if (ld) {
  try { const j = JSON.parse(ld.textContent); j['@type'] = 'VeterinaryCare'; ld.textContent = JSON.stringify(j); } catch { /* yok say */ }
}
document.title = `${d.isletme.ad} | Veteriner Kliniği | Etimesgut, Ankara`;

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-h]').forEach((el) => (el.textContent = d.hero[el.dataset.h] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, randevu almak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
if (d.isletme.ad.length > 20) document.documentElement.classList.add('is-long');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `${d.hero.ust} · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır Etimesgut'ta`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$('[data-status]').innerHTML = `<i></i>${esc(status.text)}`;
$('[data-status-big]').innerHTML = `<i></i>${esc(status.text)}`;
$('[data-fin-status]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: burun buruna --------------------------------------------------------
const hero = $('.hero');
const pin = $('.hero__pin');
const panes = $$('.yuz');
const kay = $$('.yuz__kay');
const imgs = $$('.yuz__img');
// Fotoğraflarda burun ucunun yeri (1050×1400 görselde oran olarak)
const NOSE = [{ x: 0.872, y: 0.648 }, { x: 0.266, y: 0.662 }];
const RATIO = 1400 / 1050;
let geo = { half: 0, H: 0, sx: 0, sy: 0 };

function place() {
  const W = pin.clientWidth, H = pin.clientHeight, half = W / 2;
  const mobile = W < 900;
  // Yarım ekranda burundan geriye görselin ne kadarı görünsün
  const reach = mobile ? 0.43 : 0.8;
  let iw = half / reach;
  if (!mobile) iw = Math.max(iw, (H * 1.12) / RATIO);
  const ih = iw * RATIO;
  const noseY = mobile ? H * 0.41 : H * 0.5;
  const gap = mobile ? 3 : 8;
  imgs[0].style.cssText = `width:${iw}px;height:${ih}px;left:${half - gap - NOSE[0].x * iw}px;top:${noseY - NOSE[0].y * ih}px`;
  imgs[1].style.cssText = `width:${iw}px;height:${ih}px;left:${gap - NOSE[1].x * iw}px;top:${noseY - NOSE[1].y * ih}px`;
  geo = { half, H, sx: half * (mobile ? 0.6 : 0.66), sy: H * (mobile ? 0.26 : 0.22) };
  hero.style.setProperty('--nose-y', `${noseY}px`);
}
place();

let tl;
function buildHero() {
  if (reducedMotion) {
    hero.classList.add('is-met');
    return;
  }
  tl?.scrollTrigger?.kill();
  tl?.kill();
  const small = innerWidth < 900;
  tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.3 : 1.5)}`,
      pin, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (st) => hero.classList.toggle('is-met', st.progress > 0.72),
    },
  });
  tl.fromTo(kay[0], { x: () => -geo.sx, y: () => geo.sy, rotate: -4 }, { x: 0, y: 0, rotate: 0, duration: 0.72, ease: 'power2.inOut' }, 0)
    .fromTo(kay[1], { x: () => geo.sx, y: () => geo.sy, rotate: 4 }, { x: 0, y: 0, rotate: 0, duration: 0.72, ease: 'power2.inOut' }, 0)
    .to('.hero__copy', { yPercent: -18, opacity: 0, duration: 0.34, ease: 'power1.in' }, 0.02)
    .to('.hero__ipucu', { opacity: 0, duration: 0.1 }, 0)
    .fromTo('.duvar__cizgi', { scaleY: 0 }, { scaleY: 1, duration: 0.22, ease: 'power2.out' }, 0.68)
    .fromTo('.duvar__etiket', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.12, stagger: 0.04 }, 0.78)
    .fromTo('.hero__son > *', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.14, stagger: 0.05 }, 0.8)
    .to({}, { duration: 0.08 });
}
buildHero();

if (!reducedMotion) {
  // Açılış: burunlar köşelerden kısaca uzanır
  gsap.from(panes[0], { xPercent: -30, duration: 1.2, ease: 'power3.out', delay: 0.15 });
  gsap.from(panes[1], { xPercent: 30, duration: 1.2, ease: 'power3.out', delay: 0.25 });
  gsap.from('.hero__copy > *', { y: 22, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', delay: 0.05 });
}

// --- Hizmetler ---------------------------------------------------------------
const svcMsg = (h) => h.mesaj || `Merhaba, ${h.baslik.toLocaleLowerCase('tr-TR')} için bilgi almak istiyorum.`;
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc${h.id === 'acil' ? ' svc--acil' : ''}" data-i="${i}">
    <img class="svc__thumb" src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" />
    <div class="svc__body">
      <p class="svc__no">${String(i + 1).padStart(2, '0')}</p>
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
      <p class="svc__meta"><span class="svc__time">${icons.clock}<span class="sr-only">Süre: </span>${esc(h.sure)}</span>
        ${h.id === 'acil'
          ? `<a class="svc__link" href="${esc(telHref(d))}">${icons.phone}Hemen ara</a>`
          : `<a class="svc__link" href="${esc(waHref(d, svcMsg(h)))}" target="_blank" rel="noopener">${icons.whatsapp}Sor</a>`}
      </p>
    </div>
  </li>`).join('');
const photo = $('[data-svc-photo]');
photo.innerHTML = d.hizmetler.map((h, i) => `<img src="${esc(h.gorsel)}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" class="${i === 0 ? 'is-on' : ''}" />`).join('')
  + `<figcaption data-svc-cap>${esc(d.hizmetler[0].baslik)}</figcaption>`;
const photoImgs = $$('img', photo);
const cap = $('[data-svc-cap]');
function setSvc(i) {
  photoImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
  $$('.svc').forEach((s, k) => s.classList.toggle('is-active', k === i));
  cap.textContent = d.hizmetler[i].baslik;
}
setSvc(0);

// --- Rehber: tür + yaş -------------------------------------------------------
const turler = Object.entries(d.rehber);
let tur = turler[0][0];
let yas = 'yetiskin';
$('[data-turler]').innerHTML = turler.map(([k, t]) => `
  <button type="button" class="tur__btn tur__btn--${esc(k)}" role="radio" aria-checked="${k === tur}" data-tur="${esc(k)}">
    <span class="tur__foto"><img src="${esc(t.gorsel)}" alt="" loading="lazy" decoding="async" /></span>
    <span class="tur__ad">${esc(t.ad)}</span>
  </button>`).join('');
function renderYas() {
  const ys = Object.entries(d.rehber[tur].yaslar);
  $('[data-yaslar]').innerHTML = ys.map(([k, y]) => `
    <button type="button" class="yas__btn" role="radio" aria-checked="${k === yas}" data-yas="${esc(k)}">
      <b>${esc(y.etiket)}</b><span>${esc(y.aralik)}</span>
    </button>`).join('');
}
function renderRehber(animate) {
  const t = d.rehber[tur];
  const y = t.yaslar[yas];
  const wa = waHref(d, `Merhaba ${d.isletme.ad}, ${y.etiket.toLocaleLowerCase('tr-TR')} ${t.tekil} (${y.aralik}) için randevu almak istiyorum.`);
  $('[data-rehber]').innerHTML = `
    <p class="sonuc__tag">${esc(y.etiket)} · ${esc(y.aralik)}</p>
    <p class="sonuc__gelis">${esc(y.gelis)}</p>
    <p class="sonuc__alt">Bu ziyarette baktıklarımız</p>
    <ul class="sonuc__list">${y.liste.map((l) => `<li>${icons.check}<span>${esc(l)}</span></li>`).join('')}</ul>
    <p class="sonuc__dikkat">${icons.alert}<span>${esc(y.dikkat)}</span></p>
    <a class="btn btn--tan sonuc__btn" href="${esc(wa)}" target="_blank" rel="noopener">${icons.whatsapp}Bu yaş için randevu iste</a>`;
  $$('.tur__btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tur === tur)));
  document.documentElement.dataset.tur = tur;
  if (animate && !reducedMotion) gsap.from('[data-rehber] > *', { y: 14, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out' });
}
renderYas();
renderRehber(false);
$('[data-turler]').addEventListener('click', (e) => {
  const b = e.target.closest('.tur__btn');
  if (!b || b.dataset.tur === tur) return;
  tur = b.dataset.tur;
  renderYas();
  renderRehber(true);
  if (!reducedMotion) gsap.fromTo(b.querySelector('.tur__foto'), { scale: 0.86 }, { scale: 1, duration: 0.6, ease: 'back.out(2.4)' });
});
$('[data-yaslar]').addEventListener('click', (e) => {
  const b = e.target.closest('.yas__btn');
  if (!b || b.dataset.yas === yas) return;
  yas = b.dataset.yas;
  $$('.yas__btn').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.yas === yas)));
  renderRehber(true);
});
function arrows(group, sel, attr, onPick) {
  $(group).addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const bs = $$(sel);
    const i = bs.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const n = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length;
    onPick(bs[n].dataset[attr]);
    $$(sel)[n].focus();
  });
}
arrows('[data-turler]', '.tur__btn', 'tur', (v) => { tur = v; renderYas(); renderRehber(true); });
arrows('[data-yaslar]', '.yas__btn', 'yas', (v) => { yas = v; $$('.yas__btn').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.yas === yas))); renderRehber(true); });

// --- Rakamlar ----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Süreç -------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__no" aria-hidden="true">${i + 1}</span>
    <div>
      <h3 class="step__title">${esc(s.baslik)}</h3>
      <p class="step__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Acil --------------------------------------------------------------------
const acilH = d.hizmetler.find((h) => h.id === 'acil');
$('[data-acil-metin]').textContent = d.acilMetin || (acilH ? acilH.aciklama : '');
$('[data-acil]').innerHTML = (d.acilIsaretler || []).map((a) => `<li>${esc(a)}</li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = ['steteskop', 'goz-muayene', 'pomeranyen', 'ultrason', 'laboratuvar', 'agiz-kontrol', 'muayene-masasi', 'sefkat', 'kan-ornegi'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.endsWith(`/${k}.jpg`))).filter(Boolean)
  .map((g) => ({ ...g, src: g.src.replace('/sektor-veteriner/', '/veteriner-klasik/') }));
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i % 3}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

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
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></p>
  </li>`).join('');

// --- Türler bandı ------------------------------------------------------------
const row = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="tur-bant__row">${row}<i aria-hidden="true"></i></div><div class="tur-bant__row" aria-hidden="true">${row}<i></i></div>`;
new IntersectionObserver(([e]) => $('.tur-bant').classList.toggle('is-off', !e.isIntersecting)).observe($('.tur-bant'));

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const today = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${today >= a && today <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd>${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
let solidState = null;
const solid = () => {
  const s = scrollY > innerHeight * 0.4;
  if (s !== solidState) { solidState = s; top.classList.toggle('is-solid', s); }
};
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));

  // Hizmetler: masaüstünde yapışkan fotoğraf, ortadaki satıra göre değişir
  $$('.svc').forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => st.isActive && setSvc(i) }));
  $$('.svc').forEach((s) => gsap.fromTo(s, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out', clearProps: 'opacity,visibility,transform', scrollTrigger: { trigger: s, start: 'top 90%' } }));

  gsap.from('.tur__btn', { y: 24, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.reh__sec', start: 'top 88%' } });
  gsap.from('.reh__sonuc', { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.reh__sonuc', start: 'top 90%' } });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.5, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });

  gsap.fromTo('.sur__list', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.sur__list', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 68%', once: true, onEnter: () => s.classList.add('is-on') }));

  gsap.from('.acil__list li', { scale: 0.8, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(2)', scrollTrigger: { trigger: '.acil__list', start: 'top 90%' } });
  gsap.fromTo('.acil__tel', { '--fill': '0%' }, { '--fill': '100%', duration: 1, ease: 'power2.out', scrollTrigger: { trigger: '.acil__tel', start: 'top 92%' } });

  gsap.fromTo('.kli__foto img', { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.kli', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.shot', { y: 50, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.gal', start: 'top 88%' } });
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yor__list', start: 'top 88%' } });
  gsap.fromTo('.fin__yuzler img', { xPercent: 22 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.fin', start: 'top bottom', end: 'center center', scrub: 0.5 } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-on'));
}

let rw = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - rw) < 2) return;
  rw = innerWidth;
  place();
  ScrollTrigger.refresh();
});
addEventListener('load', () => { place(); ScrollTrigger.refresh(); });
