// Mühür (klasik aile, oto ekspertiz): soğuk rapor kâğıdı + koyu grafit, mühür moru tek vurgu;
// boya kodları (yeşil/sarı/turuncu/kırmızı) yalnızca ölçüm şemasında. Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: rapor kâğıdı fotoğrafın üstüne çıkar, ölçüm ucu panelden panele gezer, boya
// kalınlıkları okunur, şema renklenir ve en sonda mor "Kontrol edildi" mührü basılır.
import sektor from '../../data/sektor-ekspertiz.json';
import extra from '../../data/ekspertiz-klasik.json';
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
// Sektör görselleri ağır; aynı karelerin küçültülmüş kopyaları bu presetin klasöründe.
const img = (p) => String(p).replace('img/sektor-ekspertiz/', 'img/ekspertiz-klasik/');
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti, ornekArac: d.ornekArac,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, bir araç için ekspertiz randevusu almak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
if (d.isletme.ad.length > 16) $('.hero__name').classList.add('is-long');
if (d.isletme.ad.length > 26) $('.hero__name').classList.add('is-xlong');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Oto ekspertiz · Şaşmaz · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();
$('[data-no]').textContent = String(d.puan.adet * 59 + d.isletme.kurulus).padStart(6, '0');
$('[data-stamp-name]').textContent = d.isletme.ad;
$('[data-stamp-date]').textContent = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const status = openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Araç şeması ------------------------------------------------------------------
// Üstten görünüş, burun yukarıda. Koordinatlar 240 genişlikte; şema 60 birim sağa kaydırılır ki
// iki yanda ölçüm etiketlerine yer kalsın. side: l/r yan etiket, c panelin içinde.
const G = {
  'on-tampon': { d: 'M62 34 Q120 12 178 34 L180 52 L60 52 Z', c: [120, 42], side: 'c' },
  kaput: { d: 'M70 56 L170 56 L166 148 L74 148 Z', c: [120, 104], side: 'c' },
  'sol-on-camurluk': { d: 'M46 62 Q52 56 66 56 L70 148 L38 148 Q38 94 46 62 Z', c: [54, 104], side: 'l' },
  'sag-on-camurluk': { d: 'M194 62 Q188 56 174 56 L170 148 L202 148 Q202 94 194 62 Z', c: [186, 104], side: 'r' },
  'sol-on-kapi': { d: 'M38 152 L80 152 L80 234 L38 234 Z', c: [59, 193], side: 'l' },
  'sag-on-kapi': { d: 'M202 152 L160 152 L160 234 L202 234 Z', c: [181, 193], side: 'r' },
  tavan: { d: 'M84 190 L156 190 L156 300 L84 300 Z', c: [120, 246], side: 'c' },
  'sol-arka-kapi': { d: 'M38 238 L80 238 L80 314 L38 314 Z', c: [59, 276], side: 'l' },
  'sag-arka-kapi': { d: 'M202 238 L160 238 L160 314 L202 314 Z', c: [181, 276], side: 'r' },
  'sol-arka-camurluk': { d: 'M38 318 L78 318 L72 392 L56 392 Q40 384 38 318 Z', c: [57, 352], side: 'l' },
  'sag-arka-camurluk': { d: 'M202 318 L162 318 L168 392 L184 392 Q200 384 202 318 Z', c: [183, 352], side: 'r' },
  bagaj: { d: 'M80 334 L160 334 L166 392 L74 392 Z', c: [120, 364], side: 'c' },
  'arka-tampon': { d: 'M60 396 L180 396 L178 414 Q120 434 62 414 Z', c: [120, 410], side: 'c' },
};
const OX = 60;
const kod = Object.fromEntries(d.kodlar.map((k) => [k.id, k]));
kod.plastik = { id: 'plastik', ad: 'Plastik, ölçülmez' };
const panels = d.paneller.filter((p) => G[p.id]).map((p) => ({ ...p, g: G[p.id] }));
const glass = `
  <path class="car__glass" d="M82 152 L158 152 L154 186 L86 186 Z"/>
  <path class="car__glass" d="M84 304 L156 304 L162 330 L78 330 Z"/>`;
const wheels = [[30, 84], [30, 332], [202, 84], [202, 332]].map(([x, y]) => `<rect class="car__wheel" x="${x}" y="${y}" width="8" height="44" rx="3"/>`).join('');
const mirrors = `<path class="car__mirror" d="M38 160 L27 163 L27 173 L38 174 Z"/><path class="car__mirror" d="M202 160 L213 163 L213 173 L202 174 Z"/>`;
const panelSvg = panels.map((p, i) => `<path class="pnl" data-i="${i}" d="${p.g.d}"/>`).join('');
const labelSvg = panels.map((p, i) => {
  const [cx, cy] = p.g.c;
  const val = p.um == null ? 'PLASTİK' : String(p.um);
  if (p.g.side === 'c') {
    const small = p.um == null;
    return `<g class="lbl lbl--c${small ? ' lbl--s' : ''}" data-i="${i}"><text x="${cx + OX}" y="${cy + (small ? 3 : 5)}" text-anchor="middle">${esc(val)}${small ? '' : '<tspan class="u" dx="1">µm</tspan>'}</text></g>`;
  }
  const left = p.g.side === 'l';
  const tx = left ? 4 : 356;
  const edge = left ? OX + (p.id.includes('camurluk') ? 38 : 38) : OX + 202;
  const lx1 = left ? 56 : 304;
  return `<g class="lbl lbl--${p.g.side}" data-i="${i}">
    <line x1="${lx1}" y1="${cy}" x2="${edge}" y2="${cy}"/><circle cx="${edge}" cy="${cy}" r="2.2"/>
    <text x="${tx}" y="${cy + 6}" text-anchor="${left ? 'start' : 'end'}">${esc(val)}<tspan class="u" dx="1">µm</tspan></text>
    <rect class="lbl__code" x="${left ? 4 : 316}" y="${cy + 11}" width="40" height="4" rx="2"/>
  </g>`;
}).join('');
$('[data-car]').innerHTML = `
  <defs>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern>
  </defs>
  <g transform="translate(${OX} 0)">${wheels}${mirrors}${panelSvg}${glass}</g>
  ${labelSvg}
  <g class="probe" data-probe transform="translate(${OX + 120} 104)">
    <circle class="probe__ring" r="14"/><circle class="probe__dot" r="4.5"/>
    <path class="probe__x" d="M-22 0h7M15 0h7M0 -22v7M0 15v7"/>
  </g>`;
const pEls = $$('.pnl');
const lEls = $$('.lbl');
panels.forEach((p, i) => {
  pEls[i].dataset.k = p.durum;
  lEls[i].dataset.k = p.durum;
});

// Lejant
const legendIds = ['orijinal', 'lokal', 'boyali', 'degisen', 'plastik'];
$('[data-legend]').innerHTML = legendIds.map((k) => `<li data-k="${k}"><i></i>${esc(k === 'plastik' ? 'Plastik' : kod[k]?.ad ?? k)}</li>`).join('');

// --- Hero: ölçüm filmi ---------------------------------------------------------
const hero = $('.hero');
const probe = $('[data-probe]');
const stPanel = $('[data-st-panel]');
const stVal = $('[data-st-val]');
const stLabel = $('[data-st-label]');
const stBar = $('[data-st-bar]');
const small = matchMedia('(max-width: 899px)').matches;
const N = panels.length;
const islemli = panels.filter((p) => ['lokal', 'boyali', 'degisen', 'macun'].includes(p.durum));
const olculen = panels.filter((p) => p.um != null).length;
const sonuc = `${olculen} panel ölçüldü · ${islemli.length} panelde işlem var`;
const ease = gsap.parseEase('power2.inOut');

let last = { i: -2, done: -1, txt: '' };
function measure(p) {
  // p: 0..1 ölçüm aşaması
  const f = Math.min(p, 0.99999) * N;
  const i = Math.floor(f);
  const t = f - i;
  const cur = panels[i];
  const prev = panels[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : ease(Math.min(1, t / 0.42));
  const x = OX + prev.g.c[0] + (cur.g.c[0] - prev.g.c[0]) * k;
  const y = prev.g.c[1] + (cur.g.c[1] - prev.g.c[1]) * k;
  probe.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  // Bitenler: i'den öncekiler + (t≥.85 ise) i
  const done = p >= 1 ? N : i + (t >= 0.82 ? 1 : 0);
  if (done !== last.done) {
    pEls.forEach((el, j) => el.classList.toggle('is-on', j < done));
    lEls.forEach((el, j) => el.classList.toggle('is-on', j < done));
    last.done = done;
  }
  if (i !== last.i) {
    pEls.forEach((el, j) => el.classList.toggle('is-cur', j === i && p < 1));
    stPanel.textContent = cur.ad;
    last.i = i;
  }
  let txt;
  if (p >= 1) txt = '';
  else if (cur.um == null) txt = t >= 0.42 ? 'Plastik · ölçülmez' : '— µm';
  else {
    const c = Math.max(0, Math.min(1, (t - 0.42) / 0.4));
    txt = `${Math.round(cur.um * c)} µm${t >= 0.82 ? ' · ' + kod[cur.durum].ad : ''}`;
  }
  if (txt !== last.txt) { stVal.textContent = txt; last.txt = txt; }
  stBar.style.transform = `scaleX(${p.toFixed(3)})`;
}
function finish(on) {
  hero.classList.toggle('is-stamped', on);
  stLabel.textContent = on ? 'Sonuç' : 'Boya kalınlığı ölçümü';
  if (on) { stPanel.textContent = sonuc; stVal.textContent = ''; last.i = -2; last.txt = ''; }
}

if (reducedMotion) {
  measure(1);
  finish(true);
  hero.classList.add('is-static');
} else {
  const sheet = $('.sheet');
  const peek = () => sheet.offsetHeight - (small ? 76 : 92);
  const m = { p: 0 };
  let stamped = false;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 2.3 : 2.6)}`,
      pin: '.hero__pin', scrub: 0.4, anticipatePin: 1, invalidateOnRefresh: true,
    },
  });
  tl.fromTo(sheet, { y: peek }, { y: 0, duration: 0.2, ease: 'power2.out' }, 0)
    .to('.hero__copy', { y: small ? -60 : -30, opacity: small ? 0 : 0.35, duration: 0.18 }, 0)
    .to('.hero__shade', { opacity: 1, duration: 0.2 }, 0)
    .fromTo('.hero__photo img', { scale: 1.12 }, { scale: 1, duration: 0.3 }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.05 }, 0)
    .to(m, { p: 1, duration: 0.62, onUpdate: () => measure(m.p) }, 0.2)
    .fromTo('.stamp', { scale: 2.6, rotate: -2, opacity: 0 }, { scale: 1, rotate: -9, opacity: 1, duration: 0.05, ease: 'power4.in' }, 0.86)
    .to('.sheet__body', { keyframes: [{ y: 5, duration: 0.012 }, { y: 0, duration: 0.02 }] }, 0.91)
    .to({}, { duration: 0.09 }, 0.91);
  tl.eventCallback('onUpdate', () => {
    const on = tl.progress() >= 0.9;
    if (on !== stamped) { stamped = on; finish(on); }
  });
  measure(0);

  // Açılış
  gsap.from('.hero__name', { yPercent: 24, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  gsap.from('.sheet', { yPercent: 18, duration: 1, ease: 'power3.out', delay: 0.3 });
}

// --- Rakamlar ----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Hizmetler ---------------------------------------------------------------
$('[data-viewer]').innerHTML = d.hizmetler.map((h, i) => `
  <img src="${esc(img(h.gorsel))}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}" data-v="${i}" />`).join('')
  + `<p class="svc__cap tw" data-cap>01 / ${String(d.hizmetler.length).padStart(2, '0')}</p>`;
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="item" data-s="${i}">
    <img class="item__thumb" src="${esc(img(h.gorsel))}" alt="" loading="lazy" decoding="async" />
    <div class="item__body">
      <p class="item__no tw">Madde ${String(i + 1).padStart(2, '0')}</p>
      <h3 class="item__name">${esc(h.baslik)}</h3>
      <p class="item__desc">${esc(h.aciklama)}</p>
      <p class="item__time tw"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
    </div>
  </li>`).join('');
const viewImgs = $$('[data-v]');
const cap = $('[data-cap]');
function showSvc(i) {
  viewImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
  $$('.item').forEach((it, k) => it.classList.toggle('is-active', k === i));
  cap.textContent = `${String(i + 1).padStart(2, '0')} / ${String(d.hizmetler.length).padStart(2, '0')}`;
}
if (!small) {
  $$('.item').forEach((it, i) => {
    ScrollTrigger.create({ trigger: it, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && showSvc(i) });
    it.addEventListener('mouseenter', () => showSvc(i));
  });
  showSvc(0);
}

// --- Rapor okuma: mikron cetveli ----------------------------------------------
const MAX = 600;
const bands = d.kodlar.filter((k) => k.max > 0);
$('[data-ruler-track]').innerHTML = bands.map((k) => `
  <span class="band" data-k="${esc(k.id)}" style="left:${(k.min / MAX) * 100}%;width:${((k.max - k.min) / MAX) * 100}%"></span>`).join('')
  + panels.filter((p) => p.um != null).map((p) => `<span class="pin" data-k="${esc(p.durum)}" style="left:${(p.um / MAX) * 100}%" title="${esc(p.ad)}: ${Number(p.um)} µm"></span>`).join('');
$('[data-ruler-scale]').innerHTML = [0, 100, 200, 300, 400, 500, 600].map((v) => `<span style="left:${(v / MAX) * 100}%">${v}</span>`).join('') + '<span class="ruler__unit">µm</span>';
$('[data-ruler-note]').textContent = `Noktalar: yukarıdaki örnek raporda ölçülen ${olculen} panel.`;
$('[data-codes]').innerHTML = d.kodlar.map((k) => `
  <li class="code" data-k="${esc(k.id)}">
    <p class="code__top"><i aria-hidden="true"></i><b>${esc(k.ad)}</b><span class="tw">${esc(k.aralik)}</span></p>
    <p class="code__text">${esc(k.metin)}</p>
  </li>`).join('');

// --- Kontrol listesi ---------------------------------------------------------
const pts = d.istatistikler.find((s) => /kontrol/i.test(s.etiket));
$('[data-points]').textContent = pts ? `${nf(pts.deger)}${pts.sonek} ${pts.etiket}` : 'Kontrol listesi';
$('[data-groups]').innerHTML = d.kontrolGruplari.map((g, i) => `
  <div class="group">
    <p class="group__h"><span class="tw">${String(i + 1).padStart(2, '0')}</span>${esc(g.ad)}</p>
    <ul class="group__list">${g.maddeler.map((m) => `<li><span class="box" aria-hidden="true">${icons.check}</span>${esc(m)}</li>`).join('')}</ul>
  </div>`).join('');

// --- Süreç -------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <p class="step__no" aria-hidden="true">${i + 1}</p>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__text">${esc(s.aciklama)}</p>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const galItems = d.galeri.filter((g) => !/sasi-alt|alttan/.test(g.src));
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot"><img src="${esc(img(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption><span class="tw">${String(i + 1).padStart(2, '0')}</span>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__car tw">${esc(y.arac)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</span></p>
  </li>`).join('');

// --- Markalar ----------------------------------------------------------------
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}<i aria-hidden="true"></i></div><div class="marka__row" aria-hidden="true">${brandRow}<i></i></div>`;
new IntersectionObserver(([e]) => $('.marka').classList.toggle('is-off', !e.isIntersecting)).observe($('.marka'));

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const today = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${today >= a && today <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="tw">${esc(val)}</dd></div>`;
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
  const s = scrollY > hero.offsetHeight - 80;
  if (s !== solidState) { solidState = s; top.classList.toggle('is-solid', s); }
};
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();
  const rise = (sel, trig, o = {}) => gsap.from(sel, { y: 26, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: trig, start: 'top 86%' }, ...o });

  $$('.h2').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.5, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });
  rise('.stat', '.stats');
  $$('.item').forEach((it) => gsap.from(it, { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: it, start: 'top 90%' } }));

  // Cetvel: bantlar soldan dolar, noktalar tek tek düşer
  gsap.from('.band', { scaleX: 0, transformOrigin: 'left center', duration: 0.7, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.ruler', start: 'top 82%' } });
  gsap.from('.pin', { y: -26, opacity: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(2)', delay: 0.4, scrollTrigger: { trigger: '.ruler', start: 'top 82%' } });
  rise('.code', '.codes');

  gsap.fromTo('.liste__photo img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.liste', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.group').forEach((g) => ScrollTrigger.create({ trigger: g, start: 'top 80%', once: true, onEnter: () => g.classList.add('is-done') }));

  $$('.step').forEach((s) => gsap.from(s, { y: 36, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
  gsap.fromTo('.steps', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 60%', scrub: true } });

  gsap.fromTo('.biz__photo', { clipPath: 'inset(12% 12% 12% 12%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.biz', start: 'top 90%', end: 'top 30%', scrub: 0.4 } });
  gsap.from('.biz__garanti', { scale: 0.92, opacity: 0, duration: 0.6, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.biz__garanti', start: 'top 90%' } });

  gsap.from('.shot', { x: 60, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.galeri', start: 'top 85%' } });
  rise('.rev', '.yorum__list', { stagger: 0.07 });
  gsap.fromTo('.final__bg', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.fromTo('.final__stamp', { scale: 2.2, opacity: 0, rotate: 0 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.45, ease: 'power4.in', scrollTrigger: { trigger: '.final', start: 'top 60%' } });
} else {
  $$('.group').forEach((g) => g.classList.add('is-done'));
}

addEventListener('load', () => ScrollTrigger.refresh());
