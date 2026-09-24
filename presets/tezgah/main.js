import raw from '../../data/mikron.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { crankSVG, chainSVG, VIEWBOX } from './drawing.js';

gsap.registerPlugin(DrawSVGPlugin);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const years = new Date().getFullYear() - d.isletme.kurulus;
const narrow = matchMedia('(max-width: 699px)');

// "1989'dan", "2004'ten": sayının okunuşunun son kelimesine göre ayrılma eki
function ablative(n) {
  const ones = n % 10;
  const tens = Math.floor(n / 10) % 10;
  const byOnes = ['', "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const byTens = ['', "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (ones) return byOnes[ones];
  if (tens) return byTens[tens];
  return "'den"; // yüz, bin
}

// --- Metin ve linkler ----------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi, ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$('[data-krank]').textContent = `Krank için de aynısı: muylular alt ölçüye taşlanır. Örnek iş: ${d.rapor.krank}.`;

$('.top__call').href = telHref(d);
$('.top__call').innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
$('[data-maps]').href = mapsHref(d);
$('[data-maps]').insertAdjacentHTML('afterbegin', icons.pin);

const st = openStatus(d.saatler);
$('[data-status]').textContent = st.open ? 'Açık' : 'Kapalı';
$('[data-status]').classList.toggle('is-open', st.open);
$('[data-status-big]').textContent = st.text;
$('[data-status-big]').classList.toggle('is-open', st.open);

// --- Hero: çizim ve antet --------------------------------------------------

const drawing = $('[data-drawing]');
drawing.innerHTML = crankSVG();
const crank = $('.crank', drawing);
const setViewBox = () => crank.setAttribute('viewBox', narrow.matches ? VIEWBOX.narrow : VIEWBOX.wide);
setViewBox();
narrow.addEventListener('change', setViewBox);

const today = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
const antet = [
  ['Firma', d.isletme.ad],
  ['Parça', 'Krank mili, 4 silindir'],
  ['İş', 'Muylu taşlama, 0,25 alt ölçü'],
  ['Tolerans', '±0,005 mm'],
  ['Ölçek', '1:2'],
  ['Tarih', today],
];
$('[data-antet]').innerHTML =
  antet.map(([k, v]) => `<div class="antet__row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('') +
  `<div class="antet__row antet__row--stamp"><dt>Kontrol</dt><dd><span class="stamp">Ölçüldü</span></dd></div>`;

// --- İstatistikler -------------------------------------------------------

$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const val = s.kurulustanHesapla ? years : s.deger;
    return `<div class="stat"><dd><span data-count="${val}">${nf.format(val)}</span>${esc(s.sonek)}</dd><dt>${esc(s.etiket)}</dt></div>`;
  })
  .join('');

// --- İş emri tablosu -----------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
$('[data-orders]').innerHTML = d.hizmetler
  .map(
    (h, i) => `<div class="order__row" role="row">
      <span class="order__no" role="cell">${pad(i + 1)}</span>
      <span class="order__job" role="cell"><strong>${esc(h.baslik)}</strong><span>${esc(h.aciklama)}</span></span>
      <span class="order__tol" role="cell"><em class="order__lbl">Tolerans</em>${esc(h.tolerans)}</span>
      <span class="order__time" role="cell"><em class="order__lbl">Süre</em>${esc(h.sure)}</span>
      <span class="order__ask" role="cell"><a href="${esc(waHref(d, `Merhaba, ${h.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener" aria-label="${esc(h.baslik)} için WhatsApp'tan sor">${icons.whatsapp}<span>Sor</span></a></span>
    </div>`
  )
  .join('');

// --- Fotoğraf eki ----------------------------------------------------------

const plates = [
  ...d.galeri,
  { src: asset('/img/tezgah/eksantrik.jpg'), alt: 'Taşlanmış eksantrik mili ve dişlisi' },
  { src: asset('/img/tezgah/freze-talas.jpg'), alt: 'Frezede işlenen parçadan kopan talaşlar' },
];
const plateNames = ['Torna tezgâhı', 'Freze', 'Taşlama tezgâhı', 'Tezgâh başında', 'Eksantrik mili', 'Talaş'];
$('[data-plates]').innerHTML = plates
  .map(
    (g, i) => `<figure class="plate plate--${i + 1}">
      <div class="plate__img"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></div>
      <figcaption><span class="balloon">${i + 1}</span>${esc(plateNames[i] || g.alt)}</figcaption>
    </figure>`
  )
  .join('');

// --- Ölçü tablosu (seçilebilir) -------------------------------------------

const sizes = $('[data-sizes]');
sizes.innerHTML = d.olculer
  .map(
    (o, i) => `<button type="button" class="sizes__row" role="radio" aria-checked="${i === 1}" data-i="${i}">
      <span>${esc(o.ad)}</span><span>Ø ${o.cap.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} mm</span><span>${esc(o.piston)}</span>
    </button>`
  )
  .join('');
const sizeCta = $('[data-size-cta]');
function pickSize(i) {
  $$('.sizes__row', sizes).forEach((b, j) => b.setAttribute('aria-checked', String(i === j)));
  const o = d.olculer[i];
  sizeCta.href = waHref(d, `Merhaba, motorum için ${o.ad.toLocaleLowerCase('tr')} (${o.piston}) işçiliği ve süresini öğrenmek istiyorum.`);
  sizeCta.innerHTML = `${icons.whatsapp}<span>${esc(o.ad)} için sor</span>`;
}
sizes.addEventListener('click', (e) => {
  const b = e.target.closest('.sizes__row');
  if (b) pickSize(Number(b.dataset.i));
});
sizes.addEventListener('keydown', (e) => {
  if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const cur = $$('.sizes__row', sizes).findIndex((b) => b.getAttribute('aria-checked') === 'true');
  const next = (cur + (e.key === 'ArrowDown' ? 1 : -1) + d.olculer.length) % d.olculer.length;
  pickSize(next);
  $$('.sizes__row', sizes)[next].focus();
});
pickSize(1);

// --- Süreç ---------------------------------------------------------------

$('[data-chain]').innerHTML = chainSVG(d.surec.length);
$('[data-steps]').innerHTML = d.surec
  .map(
    (s, i) => `<li class="step">
      <span class="step__n">${i + 1}</span>
      <h3 class="step__t">${esc(s.baslik)}</h3>
      <p class="step__d">${esc(s.aciklama)}</p>
    </li>`
  )
  .join('');

// --- Ölçü raporu -----------------------------------------------------------

const r = d.rapor;
$('[data-report]').innerHTML = `
  <header class="card-report__head">
    <p class="card-report__firm">${esc(d.isletme.ad)}</p>
    <p class="card-report__title">Ölçü raporu</p>
  </header>
  <dl class="card-report__meta">
    <div><dt>İş</dt><dd>${esc(r.is)}</dd></div>
    <div><dt>Sınıf</dt><dd>${esc(r.olcuSinifi)}</dd></div>
    <div><dt>Nominal</dt><dd>Ø ${esc(r.nominal)} mm</dd></div>
  </dl>
  <table class="card-report__table">
    <thead><tr><th scope="col">Silindir</th><th scope="col">Ölçü (mm)</th><th scope="col">Ovalite (mm)</th></tr></thead>
    <tbody>${r.silindirler.map((c) => `<tr><td>${c.no}</td><td>${esc(c.olcu)}</td><td>${esc(c.ovalite)}</td></tr>`).join('')}</tbody>
  </table>
  <p class="card-report__line"><strong>Krank:</strong> ${esc(r.krank)}</p>
  <p class="card-report__line"><strong>Planya:</strong> ${esc(r.planya)}</p>
  <span class="stamp stamp--big" aria-label="Ölçüldü">Ölçüldü</span>`;

// --- Yorumlar ------------------------------------------------------------

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}</span>`;
$('[data-score]').innerHTML = `<span class="score__n">${d.puan.ortalama.toLocaleString('tr-TR')}</span>
  <span class="score__meta">${stars(5)}<span>${nf.format(d.puan.adet)} değerlendirme</span></span>`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `<li class="review">
      ${stars(y.puan)}
      <blockquote>${esc(y.metin)}</blockquote>
      <p class="review__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></p>
    </li>`
  )
  .join('');

// --- Motor kodları ---------------------------------------------------------

const codes = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-codes]').innerHTML = `<div class="codes__run">${codes}</div><div class="codes__run" aria-hidden="true">${codes}</div>`;

// --- Saatler ve harita -------------------------------------------------------

const todayName = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }).format(new Date());
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => {
    const isToday = gun.split(' – ').some((g) => g === todayName) || rangeHasToday(gun);
    return `<div class="hours__row${isToday ? ' is-today' : ''}"><dt>${gun}</dt><dd>${saat}</dd></div>`;
  })
  .join('');
function rangeHasToday(range) {
  const order = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const [a, b] = range.split(' – ');
  if (!b) return false;
  const t = order.indexOf(todayName);
  return t >= order.indexOf(a) && t <= order.indexOf(b);
}

const mapBox = $('[data-map]');
const loadMap = () => {
  if (mapBox.dataset.loaded) return;
  mapBox.dataset.loaded = '1';
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
};
new IntersectionObserver((en, io) => {
  if (en.some((e) => e.isIntersecting)) {
    loadMap();
    io.disconnect();
  }
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -------------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('rm');
} else {
  initSmoothScroll();
  motion();
}

function motion() {
  const header = $('.top');
  ScrollTrigger.create({
    start: 80,
    end: 'max',
    onToggle: (self) => header.classList.toggle('is-solid', self.isActive),
  });

  // Açılış: isim satırı ve butonlar
  gsap.from('.hero__copy > *', { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.1 });
  gsap.fromTo('.hero__photo img', { scale: 1.12 }, { scale: 1, duration: 1.8, ease: 'power2.out' });

  // İmza: aydınger iner, krank çizilir, antet dolar
  const q = (s) => $$(s, crank);
  gsap.set(q('.ol, .dim'), { drawSVG: '0%' });
  gsap.set(q('.ol'), { fillOpacity: 0 });
  gsap.set('.antet', { opacity: 0 });
  gsap.set(q('.cl'), { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set(q('.arr, .dt, .sym'), { opacity: 0 });
  gsap.set('.sheet__border rect', { drawSVG: '0%' });
  gsap.set('.sheet', { yPercent: 104, opacity: 1 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=240%', pin: true, scrub: 0.6, anticipatePin: 1 },
  });
  tl.to('.hero__copy', { yPercent: -18, opacity: 0, duration: 0.5 }, 0)
    .to('.hero__tint', { opacity: 1, duration: 0.6 }, 0)
    .to('.sheet', { yPercent: 0, duration: 0.9, ease: 'power2.out' }, 0.1)
    .to('.sheet__border rect', { drawSVG: '100%', duration: 0.6 }, 0.7)
    .from('.zone', { opacity: 0, duration: 0.3, stagger: 0.05 }, 0.9)
    .from('.sheet__head > *', { y: 20, opacity: 0, duration: 0.4, stagger: 0.1 }, 0.8)
    .to(q('.crank__parts .ol'), { drawSVG: '100%', duration: 1.2, stagger: 0.04 }, 1.1)
    .to(q('.ol'), { fillOpacity: 1, duration: 0.5 }, 1.9)
    .to(q('.cl'), { scaleX: 1, duration: 0.6, stagger: 0.06 }, 1.6)
    .to(q('.dim'), { drawSVG: '100%', duration: 0.8, stagger: 0.05 }, 2.1)
    .to(q('.arr'), { opacity: 1, duration: 0.2, stagger: 0.03 }, 2.5)
    .to(q('.sym'), { opacity: 1, duration: 0.3, stagger: 0.1 }, 2.6)
    .to(q('.dt'), { opacity: 1, duration: 0.3, stagger: 0.06 }, 2.7)
    .to('.antet', { opacity: 1, duration: 0.2 }, 2.95)
    .from('.antet__row', { opacity: 0, x: -14, duration: 0.3, stagger: 0.08 }, 3.0)
    .fromTo('.antet .stamp', { scale: 2.4, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.25, ease: 'back.out(3)' }, 3.6)
    .from('.sheet__note', { opacity: 0, duration: 0.3 }, 3.6)
    .to({}, { duration: 0.4 });

  // Bölüm başlıkları: ince çizgi ve başlık yükselir (her bölümde tek, sakin hareket)
  $$('.sec-head, .intro__grid > div:first-child, .sizes__grid > div:first-child, .report__grid > div:first-child, .reviews__head, .visit__grid > div:first-child').forEach((el) => {
    gsap.from(el.children, {
      y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 82%' },
    });
  });

  // Sayaçlar
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
    });
  });

  // İş emri: satır çizgileri soldan çekilir, satır belirir
  $$('.order__row:not(.order__row--head)').forEach((row) => {
    gsap.fromTo(row, { '--rule': 0, opacity: 0, y: 12 }, {
      '--rule': 1, opacity: 1, y: 0, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: row, start: 'top 92%' },
    });
  });

  // Fotoğraf eki: perde açılır, balon numarası düşer
  $$('.plate').forEach((p) => {
    const st = { trigger: p, start: 'top 88%' };
    gsap.fromTo($('.plate__img', p), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power3.inOut', scrollTrigger: st });
    gsap.fromTo($('img', p), { scale: 1.18 }, { scale: 1, duration: 1.4, ease: 'power2.out', scrollTrigger: st });
    gsap.from($('.balloon', p), { scale: 0, duration: 0.5, delay: 0.5, ease: 'back.out(2.5)', scrollTrigger: st });
  });

  // Ölçü tablosu satırları
  gsap.from('.sizes__row', {
    opacity: 0, x: 20, duration: 0.5, stagger: 0.06, ease: 'power2.out',
    scrollTrigger: { trigger: '.sizes__table', start: 'top 80%' },
  });

  // Süreç: zincir ölçü soldan çizilir, adımlar sırayla gelir
  gsap.set('.chain__line', { drawSVG: '0%' });
  gsap.set('.chain__tick', { drawSVG: '50% 50%' });
  const ptl = gsap.timeline({ scrollTrigger: { trigger: '.process', start: 'top 70%', end: 'bottom 70%', scrub: 0.8 } });
  ptl.to('.chain__line', { drawSVG: '100%', duration: 1, ease: 'none' }, 0)
    .to('.chain__tick', { drawSVG: '0% 100%', duration: 0.2, stagger: 0.2 }, 0)
    .from('.step', { opacity: 0.15, y: 20, duration: 0.3, stagger: 0.22 }, 0.05);

  // Rapor: kart döner gelir, damga basılır
  gsap.from('.card-report', {
    y: 60, rotate: 3, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.card-report', start: 'top 85%' },
  });
  gsap.fromTo('.stamp--big', { scale: 2.6, opacity: 0, rotate: -30 }, {
    scale: 1, opacity: 1, rotate: -12, duration: 0.35, ease: 'back.out(3)',
    scrollTrigger: { trigger: '.card-report', start: 'top 45%' },
  });

  // Yorumlar
  gsap.from('.review', {
    y: 30, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__list', start: 'top 85%' },
  });

  // Final başlığı: harfler ölçü çizgisi gibi genişler
  gsap.fromTo('.final__t', { letterSpacing: '0.12em', opacity: 0 }, {
    letterSpacing: '-0.02em', opacity: 1, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.final', start: 'top 75%' },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}
