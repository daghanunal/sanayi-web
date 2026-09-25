// Petek (klasik aile, radyatör ve soğutma): alüminyum grisi zemin, petrol koyusu, antifriz yeşili vurgu.
// Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: fotoğraf dikey radyatör kanatlarına bölünmüştür; kaydırdıkça kanatlar sırayla
// kendi ekseninde döner ve hararet göstergesinin arkasından radyatör peteği çıkar.
// İkinci an (sektöre özel): su havuzunda basınç testi — su yükselir, ibre 1,4 bara çıkar, kaçaktan
// kabarcık çıkar, lehimle kapanır, fan döner. Beş iş adımıyla eşleşir.
import sektor from '../../data/sektor-radyator.json';
import extra from '../../data/radyator-klasik.json';
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
icons.plus = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const small = matchMedia('(max-width: 899px)').matches;

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
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Radyatör · Şaşmaz · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır aynı cadde, aynı iş`;
$('[data-years-big]').textContent = yil;
$('[data-final]').textContent = d.finalBaslik;
// Final: hero'daki kanatların yankısı; kaydırınca petek kanatları açılıp arkadaki fotoğrafı gösterir
const FF = small ? 8 : 14;
const finalFins = $('[data-final-fins]');
finalFins.innerHTML = '<i></i>'.repeat(FF);
if (reducedMotion) finalFins.hidden = true;
else gsap.fromTo(finalFins.children, { scaleX: 1 }, {
  scaleX: 0.14, ease: 'none', stagger: { each: 0.04, from: 'center' },
  scrollTrigger: { trigger: '.final', start: 'top 85%', end: 'center 55%', scrub: 0.5 },
});
$('[data-year]').textContent = new Date().getFullYear();

// İsim: kelimeler ayrı satırda, uzunsa küçülür
const words = d.isletme.ad.trim().split(/\s+/);
$('[data-name]').innerHTML = words.map((w) => `<span>${esc(w)}</span>`).join(' ');
const longest = Math.max(...words.map((w) => w.length));
if (longest > 9 || words.length > 3) $('[data-name]').classList.add('is-long');
$('[data-q]').textContent = `${d.hero.soru} ${d.isletme.slogan}`;
$('[data-answer]').textContent = d.hero.cevap;
const garantiStat = d.istatistikler.find((s) => /garanti/.test(s.etiket));
const facts = [
  ...d.hizmetler.filter((h) => /tespit|tamiri$/i.test(h.baslik)).slice(0, 2).map((h) => [h.sure, h.baslik]),
  garantiStat && [`${garantiStat.deger}${garantiStat.sonek}`, garantiStat.etiket],
].filter(Boolean);
$('[data-facts]').innerHTML = facts.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('');

const status = openStatus(d.saatler);
$('[data-status]').innerHTML = `<span class="dot"></span>${esc(status.text)}`;
$('[data-status-final]').innerHTML = `<span class="dot"></span>${esc(status.text)}`;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: petek kanatları ------------------------------------------------------
const N = small ? 9 : 16;
const fins = $('[data-fins]');
fins.style.setProperty('--n', N);
fins.style.setProperty('--img-a', `url("${d.hero.onGorsel}")`);
fins.style.setProperty('--img-b', `url("${d.hero.arkaGorsel}")`);
fins.innerHTML = Array.from({ length: N }, (_, i) =>
  `<div class="fin" style="--i:${i}"><div class="fin__f fin__f--a"><span></span><i></i></div><div class="fin__f fin__f--b"><span></span><i></i></div></div>`
).join('');
const finEls = $$('.fin', fins);

const lenis = initSmoothScroll();

if (!reducedMotion) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: small ? '+=110%' : '+=130%',
      pin: '.hero__pin', scrub: 0.6, anticipatePin: 1,
    },
  });
  // Ortadan dışa doğru: önce merkez kanatlar döner
  const mid = (N - 1) / 2;
  const order = finEls.map((el, i) => ({ el, dist: Math.abs(i - mid) })).sort((a, b) => a.dist - b.dist);
  order.forEach(({ el, dist }) => {
    const t = 0.05 + (dist / (mid + 0.5)) * 0.4;
    const [sa, sb] = el.querySelectorAll('i');
    tl.to(el, { rotateY: 180, duration: 0.55, ease: 'power2.inOut' }, t)
      .to(sa, { opacity: 0.85, duration: 0.275, ease: 'power2.in' }, t)
      .fromTo(sb, { opacity: 0.85 }, { opacity: 0, duration: 0.275, ease: 'power2.out' }, t + 0.275);
  });
  tl.to('[data-a]', { yPercent: -18, autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 0.08)
    .fromTo('[data-b]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.7)
    .fromTo('.hero__shade', { opacity: 0.55 }, { opacity: 0.8, duration: 1 }, 0)
    .fromTo('[data-progress]', { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);

  // Açılış: kanatlar hafif aralıktan kapanır
  gsap.from(finEls, { rotateY: -38, duration: 1.1, ease: 'power3.out', stagger: { each: 0.035, from: 'center' } });
  gsap.from('.hero__name span', { yPercent: 105, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.15 });
  gsap.from(['.hero__a .hero__eyebrow', '.hero__q', '.hero__foot'], { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.08, delay: 0.45 });
}

// --- Rakamlar -------------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">${nf(s.deger)}</b><span>${esc(s.sonek)}</span></p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');
if (!reducedMotion) {
  $$('[data-count]').forEach((el) => {
    const v = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => (el.textContent = nf(Math.round(o.v))),
    });
  });
}

// --- Belirtiler ----------------------------------------------------------------
$('[data-causes]').innerHTML = (d.sebepler || []).map((s, i) => `
  <li class="cause">
    <details${i === 0 ? ' open' : ''}>
      <summary><span class="cause__no mono">${String(i + 1).padStart(2, '0')}</span><span class="cause__t">${esc(s.baslik)}</span><span class="cause__pm">${icons.plus}</span></summary>
      <div class="cause__body"><p>${esc(s.ipucu)}</p><a href="#hizmetler" class="cause__link mono">İlgili iş: ${esc(s.hizmet)} →</a></div>
    </details>
  </li>`).join('');
// Tek seferde bir tanesi açık
$$('.cause details').forEach((det) => det.addEventListener('toggle', () => {
  if (det.open) $$('.cause details').forEach((o) => o !== det && (o.open = false));
  requestAnimationFrame(() => ScrollTrigger.refresh());
}));

// --- Hizmetler -------------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc">
    <span class="svc__no mono">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__t">${esc(h.baslik)}</h3>
    <span class="svc__sure mono">${esc(h.sure)}</span>
    <p class="svc__d">${esc(h.aciklama)}</p>
  </li>`).join('');

// --- Basınç testi -----------------------------------------------------------------
const tubes = [];
for (let x = 86; x <= 276; x += 12.6) tubes.push(`<line x1="${x.toFixed(1)}" y1="122" x2="${x.toFixed(1)}" y2="262"/>`);
$('[data-tubes]').innerHTML = tubes.join('');
$('[data-bubbles]').innerHTML = Array.from({ length: 9 }, (_, i) => {
  const r = 2 + (i % 3) * 1.4;
  const x = 112 + ((i * 7) % 15);
  return `<circle cx="${x}" cy="262" r="${r}" style="--d:${(i * 0.23).toFixed(2)}s;--x:${((i % 2 ? 1 : -1) * (3 + (i % 4) * 2))}px"/>`;
}).join('');

$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step" data-step="${i}">
    <span class="step__no mono">${i + 1}</span>
    <div><h3 class="step__t">${esc(s.baslik)}</h3><p class="step__d">${esc(s.aciklama)}</p></div>
  </li>`).join('');
const stepEls = $$('.step');
const rig = $('.rig');
const tagEl = $('[data-tag]');
const needle = $('[data-needle]');
const arc = $('[data-arc]');
const barEl = $('[data-bar]');
const MAXBAR = 1.4;
let curStep = -1;
function setStep(i) {
  if (i === curStep) return;
  curStep = i;
  stepEls.forEach((el, k) => {
    el.classList.toggle('is-on', k === i);
    el.classList.toggle('is-done', k < i);
  });
  rig.dataset.phase = i;
  tagEl.textContent = i >= 3 ? 'ONARILDI: ALT TANK CONTASI' : 'KAÇAK: ALT TANK CONTASI';
}
function setBar(b) {
  barEl.textContent = nf(b, 1);
  gsap.set(needle, { rotation: -135 + (b / MAXBAR) * 270, svgOrigin: '0 0' });
  arc.style.strokeDashoffset = String(1 - b / MAXBAR);
}

if (reducedMotion) {
  setStep(d.surec.length - 1);
  setBar(MAXBAR);
  gsap.set('[data-water]', { y: 92 });
  gsap.set('[data-patch]', { scale: 1, svgOrigin: '118 266' });
} else {
  setStep(0);
  setBar(0);
  gsap.set('[data-water]', { y: 330 });
  gsap.set('[data-patch]', { scale: 0, svgOrigin: '118 266' });
  const st = { bar: 0 };
  const tl2 = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.test', start: 'top top', end: small ? '+=260%' : '+=220%',
      pin: '.test__pin', scrub: 0.5, anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress;
        const n = d.surec.length;
        setStep(Math.min(n - 1, Math.floor(p * n * 0.999)));
      },
    },
  });
  // 0 → 0.2 dinleme · 0.2 → 0.4 basınç ve su · 0.4 → 0.6 fiyat · 0.6 → 0.8 onarım · 0.8 → 1 sıcakta deneme
  tl2.to('[data-water]', { y: 92, duration: 0.2, ease: 'power1.inOut' }, 0.16)
    .to(st, { bar: MAXBAR, duration: 0.2, ease: 'power2.out', onUpdate: () => setBar(st.bar) }, 0.2)
    .to('[data-patch]', { scale: 1, duration: 0.08, ease: 'back.out(2)' }, 0.66)
    .to('[data-fan]', { rotation: 900, svgOrigin: '0 0', duration: 0.2, ease: 'power1.in' }, 0.8)
    .to({}, { duration: 0.02 }, 0.98);

  // Diğer bölümler: ölçülü giriş
  $$('.h2, .lead, .svc, .cause, .yorum__list li, .agir__copy > *, .about__years').forEach((el) => {
    gsap.from(el, {
      y: 26, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  $$('.agir__photos img, .galeri__item img').forEach((img) => {
    gsap.fromTo(img, { scale: 1.12 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: img.closest('figure'), start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

// --- Ağır vasıta ---------------------------------------------------------------------
$('[data-agir-img]').src = d.agirVasita.gorsel;
$('[data-agir-img2]').src = d.agirVasita.ikinci;
$('[data-agir-title]').textContent = d.agirVasita.baslik;
$('[data-agir-text]').textContent = d.agirVasita.metin;
const heavyStat = d.istatistikler.find((s) => /ağır/i.test(s.etiket));
$('[data-agir-stat]').textContent = heavyStat ? `${nf(heavyStat.deger)}${heavyStat.sonek} ${heavyStat.etiket}` : 'Ağır vasıta';
const heavy = d.markalar.filter((m) => /MAN|Scania|Isuzu|Mercedes|Volvo|DAF|Iveco|BMC|Otokar/i.test(m));
$('[data-heavy-brands]').innerHTML = heavy.map((m) => `<li>${esc(m)}</li>`).join('');

// --- Galeri --------------------------------------------------------------------------
const mine = /teshis|tir-usta|kaput-alti/;
const gallery = [
  ...(d.galeriEk || []),
  ...d.galeri.filter((g) => mine.test(g.src)).map((g) => ({ ...g, src: g.src.replace('sektor-radyator', 'radyator-klasik') })),
];
$('[data-gallery]').innerHTML = gallery.map((g, i) => `
  <figure class="galeri__item${i % 3 === 1 ? ' is-tall' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar -------------------------------------------------------------------------
const star = icons.star;
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.round(d.puan.ortalama) ? 'on' : ''}">${star}</span>`).join('');
$('[data-review-count]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rv">
    <p class="rv__stars" aria-label="${y.puan} yıldız">${Array.from({ length: 5 }, (_, i) => `<span class="${i < y.puan ? 'on' : ''}">${star}</span>`).join('')}</p>
    <blockquote class="rv__t">${esc(y.metin)}</blockquote>
    <p class="rv__who"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac)}</span></p>
  </li>`).join('');

// --- Markalar --------------------------------------------------------------------------
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}</div><div class="marka__row" aria-hidden="true">${brandRow}</div>`;

// --- Saatler + harita -------------------------------------------------------------------
const today = new Date().getDay();
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const on = days.includes(GUN[today]) || (days.includes('–') && (() => {
    const [a, b] = days.split(' – ').map((x) => GUN.indexOf(x));
    const t = today === 0 ? 7 : today, aa = a === 0 ? 7 : a, bb = b === 0 ? 7 : b;
    return t >= aa && t <= bb;
  })());
  return `<div class="${on ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
const io = new IntersectionObserver((entries) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="Harita: ${esc(d.iletisim.adres)}" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' });
io.observe(mapBox);

// Header: hero geçilince zemin koyulaşır
ScrollTrigger.create({
  trigger: '.stats', start: 'top 85%',
  onEnter: () => document.documentElement.classList.add('is-scrolled'),
  onLeaveBack: () => document.documentElement.classList.remove('is-scrolled'),
});

window.addEventListener('load', () => ScrollTrigger.refresh());
if (lenis) document.fonts?.ready.then(() => ScrollTrigger.refresh());
