import raw from '../../data/depo.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { partSvg } from './parts.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString('tr-TR');
const yil = new Date().getFullYear() - d.isletme.kurulus;

// "2003'ten", "1998'den", "1990'dan": son okunan kelimeye göre ayrılma eki
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  if (n % 10) return `${n}'${birler[n % 10]}`;
  if (n % 100) return `${n}'${onlar[(n % 100) / 10]}`;
  return `${n}'den`;
}

// Mağazanın kendi katalog kodu (üretici numarası değil): KRD-A04-0117
const katNo = (h, i) => `KRD-${h.raf.replace('-', '')}-${String(117 + i * 263).padStart(4, '0')}`;

// --- Metin ve linkler ----------------------------------------------------------
const binds = {
  ad: d.isletme.ad,
  slogan: d.isletme.slogan,
  hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon,
  adres: d.iletisim.adres,
  garanti: d.garanti,
  since: `Şaşmaz Oto Sanayi, ${ablative(d.isletme.kurulus)} beri`,
  copy: `© ${new Date().getFullYear()} ${d.isletme.ad}`,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
const hrefs = {
  tel: telHref(d),
  wa: waHref(d, `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`),
  'wa-ruhsat': waHref(d, 'Merhaba, ruhsatımın fotoğrafını gönderiyorum. Parça sormak istiyorum.'),
  maps: mapsHref(d),
};
$$('[data-href]').forEach((el) => (el.href = hrefs[el.dataset.href]));
$$('[data-icon]').forEach((el) => (el.outerHTML = icons[el.dataset.icon]));
$('.top__call').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

function refreshStatus() {
  const s = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.textContent = s.text;
    el.classList.toggle('is-open', s.open);
  });
  $$('[data-status-short]').forEach((el) => (el.textContent = s.open ? 'Açık' : 'Kapalı'));
  $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Hero: özet tablo ve raf ızgarası ----------------------------------------
const stat = (i) => d.istatistikler[i];
$('[data-hero-spec]').innerHTML = [
  [`${fmt(stat(1).deger)}${stat(1).sonek}`, 'çeşit parça rafta'],
  [`${stat(2).deger}${stat(2).sonek}`, 'sanayi içi teslim'],
  [`${yil} yıl`, 'aynı tezgâhta'],
].map(([v, k]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

$('[data-shelf]').innerHTML = d.hizmetler.map((h, i) => `
  <div class="bin" style="--i:${i}">
    <div class="bin__part">${partSvg(h.parca)}</div>
    <div class="bin__label"><span class="bin__raf">${esc(h.raf)}</span><span class="bin__name">${esc(h.baslik)}</span></div>
  </div>`).join('') + `<div class="bin bin--more"><span>+${fmt(stat(1).deger)}</span><small>kalem daha</small></div>`;

// --- Katalog ------------------------------------------------------------------
$('[data-catalog]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="row">
    <span class="row__poz">${String(i + 1).padStart(2, '0')}</span>
    <div class="row__fig">${partSvg(h.parca)}</div>
    <div class="row__main">
      <h3 class="row__title">${esc(h.baslik)}</h3>
      <p class="row__desc">${esc(h.aciklama)}</p>
      <ul class="row__tags">${h.ornekler.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    </div>
    <div class="row__raf"><span class="row__k">Raf</span><span class="row__v">${esc(h.raf)}</span><span class="row__code" data-scramble="${katNo(h, i)}">${katNo(h, i)}</span></div>
    <div class="row__stok"><span class="row__k">Stok</span><span class="row__v"><mark>${fmt(h.stok)}</mark> kalem</span></div>
    <a class="row__ask" href="${waHref(d, `Merhaba, ${h.baslik.toLocaleLowerCase('tr')} rafından parça sormak istiyorum. Aracım: `)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu raftan sor</span></a>
  </li>`).join('');

// --- Şasi no fişi ---------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s) => `
  <li><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');
$('[data-slip-no]').textContent = `No ${String(Math.floor(Date.now() / 1000) % 100000).padStart(5, '0')}`;
$('[data-vin-cells]').innerHTML = Array.from({ length: 17 }, () => '<span></span>').join('');
$('[data-chips]').innerHTML = d.hizmetler.map((h) => `
  <label class="chip"><input type="checkbox" name="parca" value="${esc(h.baslik)}"><span>${esc(h.baslik)}</span></label>`).join('');

const vin = $('#vin');
const cells = $$('[data-vin-cells] span');
function paintVin() {
  const clean = vin.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/I/g, '1').replace(/[OQ]/g, '0').slice(0, 17);
  if (vin.value !== clean) vin.value = clean;
  cells.forEach((c, i) => {
    c.textContent = clean[i] ?? '';
    c.classList.toggle('is-filled', i < clean.length);
    c.classList.toggle('is-caret', i === clean.length && document.activeElement === vin);
  });
  $('[data-vin-count]').textContent = clean.length;
  $('.vin').classList.toggle('is-done', clean.length === 17);
}
['input', 'focus', 'blur'].forEach((ev) => vin.addEventListener(ev, paintVin));
paintVin();

$('[data-slip]').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const no = f.get('vin');
  const parcalar = f.getAll('parca');
  const not = f.get('not').trim();
  const satirlar = [
    `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`,
    no ? `Şasi no: ${no}${no.length < 17 ? ` (${no.length} hane yazabildim)` : ''}` : 'Şasi numarasını birazdan göndereceğim.',
    parcalar.length ? `Lazım olan: ${parcalar.join(', ')}` : '',
    not ? `Not: ${not}` : '',
  ].filter(Boolean);
  window.open(waHref(d, satirlar.join('\n')), '_blank', 'noopener');
});

// --- Rakamlar -------------------------------------------------------------------
$('[data-stats]').innerHTML = d.istatistikler.map((s) => {
  const v = s.deger === 'kurulus' ? yil : s.deger;
  return `<li><span class="stat__v" data-count="${v}" data-suffix="${esc(s.sonek)}">${fmt(v)}${esc(s.sonek)}</span><span class="stat__k">${esc(s.etiket)}</span></li>`;
}).join('');

// --- Teslimat -------------------------------------------------------------------
$('[data-zones]').innerHTML = d.teslimat.map((z, i) => `
  <li class="zone" style="--i:${i}"><span class="zone__ring">${i + 1}</span><div><h3>${esc(z.yer)}</h3><p>${esc(z.not)}</p></div><strong>${esc(z.sure)}</strong></li>`).join('');
const ringR = [44, 92, 140, 188];
$('[data-ring-labels]').innerHTML = d.teslimat.map((z, i) => {
  const a = (-135 * Math.PI) / 180;
  const x = (200 + ringR[i] * Math.cos(a)).toFixed(1), y = (200 + ringR[i] * Math.sin(a)).toFixed(1);
  return `<g class="rings__badge"><circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y}" dy=".36em" text-anchor="middle">${i + 1}</text></g>`;
}).join('');

// --- Markalar -------------------------------------------------------------------
$('[data-brands]').innerHTML = d.markalar.map((m, i) =>
  `<li><span class="brand__i">${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}</span>${esc(m)}</li>`).join('');
const pb = d.parcaMarkalari.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-partbrands]').innerHTML = `<div class="partbrands__row">${pb}${pb}</div>`;

// --- Galeri ---------------------------------------------------------------------
const galeri = [
  { src: d.galeri[0].src, alt: d.galeri[0].alt },
  { src: `${import.meta.env.BASE_URL}img/raf/usta-motor.jpg`, alt: 'Usta aracın motor bölmesinde parçayı kontrol ediyor' },
  { src: d.galeri[1].src, alt: d.galeri[1].alt },
  { src: d.galeri[3].src, alt: d.galeri[3].alt },
  { src: `${import.meta.env.BASE_URL}img/raf/motor-tezgah.jpg`, alt: 'Revizyon için sökülmüş motor tezgâhta' },
];
$('[data-gallery]').innerHTML = galeri.map((g, i) => `
  <figure class="gal__item gal__item--${i}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>Şekil ${i + 2}. ${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar -------------------------------------------------------------------
$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-score-count]').textContent = `${fmt(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((r) => `
  <li class="rev">
    <span class="rev__stars" aria-label="${r.puan} yıldız">${icons.star.repeat(r.puan)}</span>
    <p class="rev__text">${esc(r.metin)}</p>
    <p class="rev__who"><strong>${esc(r.ad)}</strong> <span>${esc(r.arac)}</span></p>
  </li>`).join('');

// --- Saatler ve harita ---------------------------------------------------------
const bugun = GUNLER[new Date().getDay()];
$('[data-hours]').innerHTML = `<tbody>${groupedHours(d.saatler).map(([g, s]) => {
  const today = g === bugun || (g.includes('–') && (() => {
    const [a, b] = g.split(' – ').map((x) => GUNLER.indexOf(x));
    const t = new Date().getDay();
    return t >= a && t <= b;
  })());
  return `<tr class="${today ? 'is-today' : ''}"><th scope="row">${g}</th><td>${s}</td></tr>`;
}).join('')}</tbody>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Hareket --------------------------------------------------------------------
const header = $('.top');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => header.classList.toggle('is-solid', self.scroll() > 80) });
header.classList.toggle('is-solid', scrollY > 80);

if (!reducedMotion) {
  initSmoothScroll();
  document.documentElement.classList.add('js-motion');

  // Başlık satırları ve raf açılışı (tek orkestra)
  const split = new SplitText('.hero__title', { type: 'lines', mask: 'lines', linesClass: 'line' });
  const bins = $$('.bin');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(split.lines, { yPercent: 105, duration: 0.9, stagger: 0.08 })
    .from('.hero__kicker, .hero__lead, .hero__actions, .hero__spec', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.07 }, '-=0.5')
    .fromTo('.shelf', { '--grid': 0 }, { '--grid': 1, duration: 0.8 }, 0.1)
    .from(bins, {
      xPercent: (i) => (i % 2 ? 60 : -60), autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.3)',
    }, 0.25)
    .from($$('.bin__part .ln, .bin__part .aux'), { drawSVG: 0, duration: 1.1, stagger: 0.004, ease: 'power2.inOut' }, 0.35)
    .from($$('.bin__label'), { yPercent: 100, duration: 0.45, stagger: 0.06 }, 0.9);

  // Raf ızgarası kaydırınca hafif derinlik
  gsap.to(bins, {
    y: (i) => [-18, 10, -6, 16, -12, 6, -10, 12][i] ?? 0,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Katalog satırları: çizgi çekilir, çizim kendini çizer, kod karışıp oturur
  $$('.row').forEach((row) => {
    const t = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
    t.fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: 0.7, ease: 'power2.out' })
      .from(row.querySelectorAll('.part .ln, .part .aux'), { drawSVG: 0, duration: 0.9, stagger: 0.006, ease: 'power2.inOut' }, 0)
      .from(row.querySelectorAll('.row__main > *, .row__raf, .row__stok, .row__ask'), { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.05 }, 0.1)
      .add(() => scramble(row.querySelector('[data-scramble]')), 0.3);
  });

  // Süreç adımları: bağlantı çizgisi
  gsap.fromTo('.steps', { '--progress': 0 }, {
    '--progress': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 60%', scrub: true },
  });

  // Fiş: yazıcıdan çıkar gibi
  gsap.from('.slip', {
    yPercent: -8, rotate: -1.5, autoAlpha: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.slip', start: 'top 85%', once: true },
  });

  // Rakamlar
  $$('[data-count]').forEach((el) => {
    const v = Number(el.dataset.count), suf = el.dataset.suffix;
    const o = { n: 0 };
    gsap.to(o, {
      n: v, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = fmt(Math.round(o.n)) + suf),
    });
  });

  // Teslimat halkaları ve rota
  const rt = gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: '.teslim__body', start: 'top 80%', once: true } });
  rt.from('.ring', { drawSVG: '50% 50%', duration: 0.9, stagger: -0.15 })
    .from('.rings__route', { autoAlpha: 0, duration: 0.6 }, 0.6)
    .from('.rings__badge', { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.1 }, 0.5)
    .from('.zone', { x: 24, autoAlpha: 0, duration: 0.5, stagger: 0.1 }, 0.2);

  // Marka dizini
  gsap.from('.brands__grid li', {
    autoAlpha: 0, y: 10, duration: 0.4, stagger: { each: 0.025, from: 'start' },
    scrollTrigger: { trigger: '.brands__grid', start: 'top 85%', once: true },
  });

  // Galeri: fotoğraflar katalog sayfasına yapıştırılır gibi
  $$('.gal__item').forEach((fig, i) => {
    gsap.from(fig, {
      clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'power3.inOut',
      scrollTrigger: { trigger: fig, start: 'top 88%', once: true },
    });
    gsap.fromTo(fig.querySelector('img'), { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Final başlığı
  const fs = new SplitText('.final__title', { type: 'lines', mask: 'lines', linesClass: 'line' });
  gsap.from(fs.lines, {
    yPercent: 105, duration: 0.9, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.final', start: 'top 75%', once: true },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}

// Katalog kodu: karakterler karışır, soldan sağa yerine oturur
function scramble(el) {
  if (!el) return;
  const target = el.dataset.scramble;
  const pool = 'ABCDEFGHJKLMNPRSTUVYZ0123456789';
  const o = { p: 0 };
  gsap.to(o, {
    p: 1, duration: 0.9, ease: 'none',
    onUpdate: () => {
      const n = Math.floor(o.p * target.length);
      el.textContent = target.split('').map((c, i) =>
        i < n || c === '-' ? c : pool[Math.floor(Math.random() * pool.length)]).join('');
    },
    onComplete: () => (el.textContent = target),
  });
}
