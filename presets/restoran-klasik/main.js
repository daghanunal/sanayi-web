// Sini (klasik aile, ocakbaşı): kuşbakışı fıstık yeşili masa, bakır sini, limon sarısı.
// Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: sofra kurulur. Ortada ocaktan gelen şiş tabağı durur; kaydırdıkça meze, lahmacun,
// Adana ve çay tabakları ekranın kenarlarından dönerek gelip masaya oturur, sayaç 1/7'den 7/7'ye çıkar.
// Sofra tamamlanınca orta tabak büyüyüp bütün ekranı kaplar ve içinden ocakbaşı açılır.
import sektor from '../../data/sektor-restoran.json';
import ek from '../../data/restoran-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'restoran-klasik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const ad = d.isletme.ad;
const waMasa = waHref(d, `Merhaba ${ad}, masa ayırtmak istiyorum.`);
const waPaket = waHref(d, `Merhaba ${ad}, paket sipariş vermek istiyorum.`);
const barWa = $('.action-bar__btn--main');
if (barWa) barWa.href = waMasa;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar ------------------------------------------------------------------
const binds = {
  ad, slogan: d.isletme.slogan,
  // ?kurulus= metindeki yılı da değiştirsin ("1998'den beri" → "2011'den beri")
  hakkinda: String(d.isletme.hakkinda).replace(/\b(19|20)\d\d'[a-zçğıöşü]+ beri/i, `${ablative(d.isletme.kurulus)} beri`),
  telefon: d.iletisim.telefon, adres: d.iletisim.adres,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa-masa]').forEach((a) => (a.href = waMasa));
$$('[data-wa-paket]').forEach((a) => (a.href = waPaket));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${ad}, sayfa başı`);
$('[data-since]').textContent = `Etimesgut · ${ablative(d.isletme.kurulus)} beri`;
$('[data-year]').textContent = new Date().getFullYear();
$('[data-garanti]').textContent = d.garanti;
$('[data-hero-alt]').textContent = d.heroAlt || d.isletme.slogan;
const yil = new Date().getFullYear() - d.isletme.kurulus;

// Ad: son kelime ayrı satıra (ör. "Közde / Ocakbaşı")
const words = ad.trim().split(/\s+/);
const nameEl = $('[data-name]');
nameEl.innerHTML = words.length > 1
  ? `<span>${esc(words.slice(0, -1).join(' '))}</span> <span class="alt">${esc(words.at(-1))}</span>`
  : `<span>${esc(ad)}</span>`;
if (ad.length > 18) nameEl.classList.add('is-long');
if (ad.length > 28) nameEl.classList.add('is-xlong');

const status = openStatus(d.saatler);
$('[data-status]').textContent = status.text;
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: sofra kurulur -------------------------------------------------------------
const hero = $('.hero');
const pin = $('.hero__pin');
const table = $('[data-table]');
const mainPlate = $('[data-main]');
const sini = $('[data-sini]');
const reveal = $('[data-reveal]');
const nEl = $('[data-plate-n]');
const lEl = $('[data-plate-l]');
const sofra = d.sofra || [];
const TOTAL = sofra.length + 1;
$('[data-plate-total]').textContent = TOTAL;

sofra.forEach((p) => {
  const el = document.createElement('div');
  el.className = 'plate';
  el.innerHTML = `<img src="${esc(p.src)}" alt="" decoding="async" />`;
  table.append(el);
});
const plates = $$('.plate:not(.plate--main)', table);

// Tabakların masadaki yerleri (açı derece, 0 = sağ, saat yönü)
const ANG = [-62, 4, 62, 122, 180, 236];
const ROT = [-14, 9, -6, 12, -10, 7];
let L = null;
function layout() {
  const w = pin.clientWidth, h = pin.clientHeight;
  const narrow = w < 900;
  const cx = narrow ? w / 2 : w * 0.69;
  let cy = narrow ? h * 0.55 : h * 0.54;
  let mainD = narrow ? Math.min(w * 0.6, h * 0.31) : Math.min(h * 0.36, w * 0.26);
  let satD = narrow ? Math.min(w * 0.34, h * 0.17) : mainD * 0.54;
  const rx = narrow ? w * 0.38 : mainD * 0.88;
  let ry = narrow ? mainD * 0.86 : mainD * 0.76;
  if (narrow) {
    // Sofra, ad ile alt satır (durum + sayaç) arasındaki boşluğa sığsın; tabaklar yazının üstüne oturmasın.
    const copy = $('.hero__copy'), foot = $('.hero__foot'), cnt = $('.count');
    const top = copy.offsetTop + copy.offsetHeight + 10;
    const bot = Math.min(foot.offsetTop, cnt.offsetTop) - 10;
    const half = (bot - top) / 2;
    const need = ry * 0.9 + satD / 2;
    const k = clamp(half / need, 0.68, 1);
    mainD *= k; satD *= k; ry *= k;
    cy = half * 2 >= 2 * need * k ? (top + bot) / 2 : top + need * k;
  }
  const far = Math.hypot(w, h) * 0.75;
  L = {
    w, h, cx, cy, mainD, satD, far,
    pos: ANG.map((a) => {
      const t = (a * Math.PI) / 180;
      return { x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry, dx: Math.cos(t), dy: Math.sin(t) };
    }),
  };
  const siniD = narrow ? Math.max(w * 1.1, 2 * ry + satD * 0.55) : 2 * rx + satD * 1.25;
  L.siniD = siniD;
  Object.assign(sini.style, { width: `${siniD}px`, height: `${siniD}px`, left: `${cx - siniD / 2}px`, top: `${cy - siniD / 2}px` });
  Object.assign(mainPlate.style, { width: `${mainD}px`, height: `${mainD}px`, left: `${cx - mainD / 2}px`, top: `${cy - mainD / 2}px` });
  plates.forEach((el) => Object.assign(el.style, { width: `${satD}px`, height: `${satD}px`, left: `${-satD / 2}px`, top: `${-satD / 2}px`, padding: `${(satD * 0.05).toFixed(1)}px` }));
}

const land = gsap.parseEase('back.out(1.25)');
const growE = gsap.parseEase('power2.in');
let last = { p: -1, g: -1 };
let shown = -1;
function setTable(p, g = 0) {
  if (!L) return;
  last = { p, g };
  const span = 0.34, step = (1 - span) / Math.max(1, plates.length - 1);
  let arrived = 0;
  plates.forEach((el, i) => {
    const q = clamp((p - i * step) / span);
    const e = land(q);
    const P = L.pos[i];
    const out = L.far * (1 - e) + g * L.far * 0.5;
    const x = P.x + P.dx * out, y = P.y + P.dy * out;
    const r = ROT[i] + (1 - e) * (i % 2 ? 140 : -140);
    const s = 1 + (1 - q) * 0.25;
    el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${r.toFixed(1)}deg) scale(${s.toFixed(3)})`;
    el.style.opacity = g > 0 ? String(1 - g * 1.4) : '';
    if (q >= 0.82) arrived++;
  });
  mainPlate.style.transform = `rotate(${(p * 38).toFixed(1)}deg)`;
  sini.style.transform = `rotate(${(p * -24).toFixed(1)}deg) scale(${(1 + g * 0.15).toFixed(3)})`;
  // Orta tabaktan ocakbaşı açılır
  const r0 = L.mainD / 2;
  const far = Math.hypot(Math.max(L.cx, L.w - L.cx), Math.max(L.cy, L.h - L.cy));
  const r = g <= 0 ? 0 : r0 + (far - r0) * growE(g);
  reveal.style.clipPath = `circle(${r.toFixed(1)}px at ${L.cx.toFixed(1)}px ${L.cy.toFixed(1)}px)`;
  reveal.style.visibility = g > 0 ? 'visible' : 'hidden';
  if (arrived !== shown) {
    shown = arrived;
    nEl.textContent = arrived + 1;
    lEl.textContent = arrived ? sofra[arrived - 1].etiket : d.sofraOrta?.etiket || '';
  }
}

layout();
if (reducedMotion) {
  setTable(1, 0);
  hero.classList.add('is-static');
} else {
  setTable(0, 0);
  const small = innerWidth < 900;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 2 : 2.3)}`,
      pin: pin, scrub: 0.5, anticipatePin: 1,
    },
  });
  const m = { p: 0, g: 0 };
  const upd = () => setTable(m.p, m.g);
  tl.to(m, { p: 1, duration: 0.74, onUpdate: upd }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.05 }, 0)
    .to('.hero__foot', { opacity: 0, y: 20, duration: 0.08 }, 0.7)
    .to(m, { g: 1, duration: 0.24, onUpdate: upd }, 0.76)
    .to('.count', { opacity: 0, duration: 0.06 }, 0.76)
    .to('.hero__copy', { opacity: 0, y: -30, duration: 0.1 }, 0.8)
    .fromTo('.hero__end', { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.08 }, 0.92);

  // Açılış
  gsap.from('.hero__name span', { yPercent: 60, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__foot > *', '.hero__hint', '.count'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power2.out', delay: 0.25 });
  gsap.from(mainPlate, { scale: 0.6, opacity: 0, rotate: -60, duration: 1.2, ease: 'power3.out', delay: 0.25 });
  gsap.from(sini, { opacity: 0, duration: 1.1, ease: 'power2.out' });
}
let rw = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - rw) < 2 && innerWidth < 900) return; // mobil adres çubuğu
  rw = innerWidth; layout(); setTable(last.p, last.g);
});

// --- Hakkında + rakamlar ----------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Menü tahtası (yemekler) --------------------------------------------------------
const yemek = d.hizmetler.slice(0, 5);
const hizmet = d.hizmetler.slice(5);
$('[data-menu]').innerHTML = yemek.map((h, i) => `
  <li class="dish">
    <span class="dish__plate" aria-hidden="true"><img src="${esc(d.menuGorsel?.[i] || '')}" alt="" loading="lazy" decoding="async" /></span>
    <div class="dish__body">
      <p class="dish__line"><span class="dish__name">${esc(h.baslik)}</span><span class="dish__dots" aria-hidden="true"></span><span class="dish__time mono"><span class="sr-only">Bekleme: </span>${esc(h.sure)}</span></p>
      <p class="dish__desc">${esc(h.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Şişin yolu --------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__chunk" aria-hidden="true"></span>
    <p class="step__no mono">${String(i + 1).padStart(2, '0')}</p>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__text">${esc(s.aciklama)}</p>
  </li>`).join('');

// --- Masa planlayıcı ---------------------------------------------------------------
const opts = $('[data-opts]');
opts.innerHTML = hizmet.map((h) => `
  <li class="opt">
    <p class="opt__time mono">${esc(h.sure)}</p>
    <h3 class="opt__name">${esc(h.baslik)}</h3>
    <p class="opt__desc">${esc(h.aciklama)}</p>
  </li>`).join('');

const TUR = d.masaTurleri || ['Salon'];
const GUNLER = ['Bugün', 'Yarın', 'Hafta sonu', 'Başka gün'];
const SAAT = d.masaSaatleri || [];
const MAX = 40;
const plan = { kisi: 4, tur: 0, gun: 0, saat: SAAT.length > 2 ? 3 : 0, oto: true };
const chips = (el, list, key) => {
  el.innerHTML = list.map((t, i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="false">${esc(t)}</button>`).join('');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    plan[key] = Number(b.dataset.i);
    if (key === 'tur') plan.oto = false;
    renderPlan();
  });
};
chips($('[data-tur]'), TUR, 'tur');
chips($('[data-gun]'), GUNLER, 'gun');
chips($('[data-saat]'), SAAT, 'saat');
const seatsEl = $('[data-seats]');
seatsEl.innerHTML = `<span class="seats__table"></span>` + Array.from({ length: MAX }, () => '<span class="seat"></span>').join('');
const seatEls = $$('.seat', seatsEl);
const grupIdx = TUR.findIndex((t) => /grup/i.test(t));
const paketIdx = TUR.findIndex((t) => /paket/i.test(t));
function renderPlan() {
  if (plan.oto && grupIdx > -1) plan.tur = plan.kisi > 12 ? grupIdx : 0;
  $('[data-kisi-v]').textContent = plan.kisi;
  seatEls.forEach((s, i) => s.classList.toggle('is-on', i < plan.kisi));
  const grp = { tur: '[data-tur]', gun: '[data-gun]', saat: '[data-saat]' };
  for (const [k, sel] of Object.entries(grp)) $$('.chip', $(sel)).forEach((c, i) => {
    const on = i === plan[k];
    c.classList.toggle('is-on', on);
    c.setAttribute('aria-pressed', on);
  });
  const paket = plan.tur === paketIdx;
  const tur = TUR[plan.tur], gun = GUNLER[plan.gun], saat = SAAT[plan.saat];
  const hint = paket
    ? 'Lavaş ayrı, közleme ayrı paketlenir. Hazır olunca haber veririz.'
    : plan.kisi > 12
      ? `${plan.kisi} kişi arka salona alınır. Sabit menüyü birlikte belirlemek için 1-2 gün önceden yazın.`
      : plan.kisi <= 2 ? 'İki kişiye en güzeli ocakbaşı tezgâhı: şiş gözünüzün önünde pişer.' : 'Hafta sonu akşamları erken dolar, önceden yazmanız iyi olur.';
  $('[data-seat-hint]').textContent = hint;
  const zaman = plan.gun === 3 ? `${saat} civarı (günü yazışırız)` : `${gun.toLowerCase()} ${saat}`;
  const msg = paket
    ? `Merhaba ${ad}, ${plan.kisi} kişilik paket sipariş vermek istiyorum. ${gun === 'Başka gün' ? '' : gun + ', '}${saat} gibi hazır olsun.`
    : `Merhaba ${ad}, ${plan.kisi} kişilik masa ayırtmak istiyorum. Yer: ${tur}. Zaman: ${zaman}.`;
  $('[data-msg]').textContent = `“${msg}”`;
  $('[data-plan-send]').href = waHref(d, msg);
}
$$('[data-kisi]').forEach((b) => b.addEventListener('click', () => {
  plan.kisi = clamp(plan.kisi + Number(b.dataset.kisi), 1, MAX);
  renderPlan();
}));
renderPlan();

// --- Galeri ------------------------------------------------------------------------
const gal = ['ocak', 'sofra', 'kor-sis', 'meze-masa', 'lahmacun', 'firin', 'salon'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
const local = (src) => String(src || '').replace('/sektor-restoran/', '/restoran-klasik/');
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i + 1}"><img src="${esc(local(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><span class="rev__ini" aria-hidden="true">${esc(String(y.ad).charAt(0))}</span><strong>${esc(y.ad)}</strong></p>
  </li>`).join('');

// --- Saatler -----------------------------------------------------------------------
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
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------------
const top = $('.top');
const aboutEl = $('.about');
// Pin bırakılınca "Sofra hazır" başlığı şeffaf header'ın altına kaymasın: header o anda katılaşır.
const solid = () => top.classList.toggle('is-solid', scrollY > Math.min(aboutEl.getBoundingClientRect().top + scrollY - 70, hero.offsetHeight - innerHeight + 4));
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2, .about__t').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });
  gsap.from('.stat', { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.stats', start: 'top 90%' } });
  $$('.dish').forEach((el) => {
    gsap.from(el.querySelector('.dish__plate'), { rotate: -120, scale: 0.4, opacity: 0, duration: 0.9, ease: 'back.out(1.4)', scrollTrigger: { trigger: el, start: 'top 88%' } });
    gsap.from(el.querySelector('.dish__body'), { x: 24, opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  gsap.fromTo('.yol__photo img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.yol', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('[data-heat]', { attr: { 'stroke-dashoffset': 1000 } }, { attr: { 'stroke-dashoffset': 0 }, ease: 'none', scrollTrigger: { trigger: '.yol__steps', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 66%', onEnter: () => s.classList.add('is-hot'), onLeaveBack: () => s.classList.remove('is-hot') }));
  gsap.from('.opt', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.opts', start: 'top 88%' } });
  $$('.shot').forEach((s, i) => gsap.fromTo(s, { clipPath: 'inset(8% 8% 8% 8% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1, ease: 'power3.out', delay: (i % 2) * 0.08, scrollTrigger: { trigger: s, start: 'top 92%' } }));
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 90%' } });
  gsap.fromTo('.final__bg', { clipPath: 'circle(18% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', ease: 'none', scrollTrigger: { trigger: '.final', start: 'top 90%', end: 'center 55%', scrub: 0.4 } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-hot'));
}

addEventListener('load', () => { layout(); setTable(last.p, last.g); ScrollTrigger.refresh(); });
