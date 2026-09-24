import raw from '../../data/manifold.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(SplitText, DrawSVGPlugin);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const years = new Date().getFullYear() - d.isletme.kurulus;

// Türkçe ayrılma eki: 1998'den, 2004'ten, 2010'dan…
function denEki(n) {
  const s = String(n);
  const son = +s.at(-1);
  let kelime;
  if (s.endsWith('000')) kelime = 'bin';
  else if (s.endsWith('00')) kelime = 'yüz';
  else if (son === 0) kelime = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'][+s.at(-2)];
  else kelime = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'][son];
  const unlu = [...kelime].reverse().find((c) => 'aeıioöuü'.includes(c));
  const sert = /[çfhkpsşt]$/.test(kelime);
  const kalin = 'aıou'.includes(unlu);
  return `'${sert ? 't' : 'd'}${kalin ? 'an' : 'en'}`;
}

// --- Metin ve linkler ----------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi'nde ${d.isletme.kurulus}${denEki(d.isletme.kurulus)} beri`;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-years-title]').textContent = `${years} yıldır aynı cadde, aynı lift.`;
$('[data-garanti]').textContent = `Ölçmeden parça değiştirmeyiz. ${d.garanti}`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
$$('[data-tel-plain]').forEach((a) => {
  a.href = telHref(d);
  a.textContent = d.iletisim.telefon;
});
const waLink = (a, mesaj) => {
  a.href = waHref(d, mesaj);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
};
$$('[data-wa]').forEach((a) => waLink(a));
waLink($('[data-wa-muayene]'), `Merhaba ${d.isletme.ad}, aracım egzoz emisyonundan muayeneden kaldı. Raporun fotoğrafını gönderiyorum.`);
$('[data-maps]').href = mapsHref(d);

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});

// --- Hero hattı: duraklar ---------------------------------------------

// Durakların path üzerindeki x konumu (viewBox 0-1000).
const DURAK_X = [160, 350, 480, 740, 960];
const flowPath = $('.line__flow');
const total = flowPath.getTotalLength();
const durakOran = DURAK_X.map((x) => {
  let best = 0;
  let bestDx = Infinity;
  for (let l = 0; l <= total; l += total / 400) {
    const p = flowPath.getPointAtLength(l);
    const dx = Math.abs(p.x - x);
    if (dx < bestDx) {
      bestDx = dx;
      best = l;
    }
  }
  const p = flowPath.getPointAtLength(best);
  return { oran: best / total, x: p.x / 10, y: (p.y / 120) * 100 };
});

$('[data-stops]').innerHTML = d.yolculuk
  .map(
    (y, i) => `
    <li class="stop ${durakOran[i].y <= 50 ? 'stop--ust' : 'stop--alt'}" style="left:${durakOran[i].x}%;top:${durakOran[i].y}%">
      <span class="stop__dot"></span>
      <span class="stop__name"><span class="stop__long">${esc(y.durak)}</span><span class="stop__short" aria-hidden="true">${esc(y.durak.length > 10 ? y.durak.split(' ')[0] : y.durak)}</span></span>
    </li>`
  )
  .join('');

// --- Muayene raporu -----------------------------------------------------

const ondalik = (n) => (String(n).split('.')[1] || '').length;
const fmt = (n, dec) => n.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const olcumler = d.muayene.olcumler;
$('[data-rapor-title]').textContent = d.muayene.baslik;
$('[data-rapor-no]').textContent = `${d.isletme.ad} · No ${String(new Date().getDate()).padStart(2, '0')}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
$('[data-olcumler]').innerHTML = olcumler
  .map((o) => {
    const dec = Math.max(ondalik(o.once), ondalik(o.sonra));
    return `
    <tr>
      <th scope="row">${esc(o.ad)} <small>${esc(o.birim)}</small></th>
      <td class="is-fail">${fmt(o.once, dec)}</td>
      <td class="rapor__sonra"><span data-sonra="${o.sonra}" data-once="${o.once}" data-dec="${dec}">${fmt(o.once, dec)}</span><i aria-hidden="true"></i></td>
      <td class="rapor__sinir">${fmt(o.sinir, ondalik(o.sinir))}</td>
    </tr>`;
  })
  .join('');

// --- Duraklar listesi ---------------------------------------------------

$('[data-duraklar]').innerHTML = d.yolculuk
  .map(
    (y, i) => `
    <li class="durak">
      <span class="durak__no">${String(i + 1).padStart(2, '0')}</span>
      <div class="durak__body">
        <p class="durak__name">${esc(y.durak)}</p>
        <h3 class="durak__title">${esc(y.baslik)}</h3>
        <p class="durak__text">${esc(y.metin)}</p>
        <a class="durak__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${y.hizmet.toLocaleLowerCase('tr-TR')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(y.hizmet)} için sor</span></a>
      </div>
    </li>`
  )
  .join('');

// --- Hizmetler, istatistik, süreç ---------------------------------------

$('[data-hizmetler]').innerHTML = d.hizmetler
  .map(
    (h) => `
    <li class="hizmet">
      <h3 class="hizmet__title">${esc(h.baslik)}</h3>
      <p class="hizmet__text">${esc(h.aciklama)}</p>
      <span class="hizmet__sure">${esc(h.sure)}</span>
    </li>`
  )
  .join('');

$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const val = s.deger === 'kurulus' ? years : s.deger;
    return `<div class="stat"><dd><span data-count="${val}">${nf.format(val)}</span>${esc(s.sonek)}</dd><dt>${esc(s.etiket)}</dt></div>`;
  })
  .join('');

$('[data-surec]').innerHTML = d.surec
  .map(
    (s, i) => `
    <li class="adim">
      <span class="adim__no">${i + 1}</span>
      <h3 class="adim__title">${esc(s.baslik)}</h3>
      <p class="adim__text">${esc(s.aciklama)}</p>
    </li>`
  )
  .join('');

// --- Galeri, yorumlar, markalar ------------------------------------------

const galeri = [...d.galeri, { src: asset('/img/susturucu/egzoz-bw.jpg'), alt: 'Paslanmaz egzoz ucu, siyah beyaz yakın plan' }];
$('[data-galeri]').innerHTML = galeri
  .map((g, i) => `<figure class="g g--${i + 1}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></figure>`)
  .join('');

$('[data-puan]').innerHTML = `<span class="puan__val">${fmt(d.puan.ortalama, 1)}</span><span class="puan__stars" aria-hidden="true">${icons.star.repeat(5)}</span><span class="puan__adet">${nf.format(d.puan.adet)} değerlendirme</span>`;
$('[data-yorumlar]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <li class="yorum">
      <p class="yorum__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
      <blockquote class="yorum__text">${esc(y.metin)}</blockquote>
      <p class="yorum__who"><strong>${esc(y.ad)}</strong> <span>${esc(y.arac)}</span></p>
    </li>`
  )
  .join('');

const markalar = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-markalar]').innerHTML = `<div class="markalar__row">${markalar}</div><div class="markalar__row" aria-hidden="true">${markalar}</div>`;

// --- Saatler ve harita ---------------------------------------------------

$('[data-hours]').innerHTML = `<caption class="sr-only">Çalışma saatleri</caption><tbody>${groupedHours(d.saatler)
  .map(([gun, saat]) => `<tr><th scope="row">${esc(gun)}</th><td>${esc(saat)}</td></tr>`)
  .join('')}</tbody>`;

const mapBox = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  },
  { rootMargin: '600px 0px' }
).observe(mapBox);

// --- Hareket --------------------------------------------------------------

const kEl = $('[data-k]');
const verdictEl = $('[data-verdict]');
const stops = $$('.stop');
const kOnce = olcumler.find((o) => /duman/i.test(o.ad))?.once ?? 2.9;
const kSonra = olcumler.find((o) => /duman/i.test(o.ad))?.sonra ?? 0.4;

function setHat(p) {
  const k = kOnce + (kSonra - kOnce) * gsap.parseEase('power1.inOut')(Math.min(1, p / 0.96));
  kEl.textContent = fmt(k, 1);
  const temiz = p >= 0.96;
  verdictEl.textContent = temiz ? 'Muayeneye hazır' : 'Muayeneden kalır';
  verdictEl.classList.toggle('is-pass', temiz);
  stops.forEach((s, i) => s.classList.toggle('is-on', p >= durakOran[i].oran - 0.01));
}

function raporuBitir() {
  $$('[data-sonra]').forEach((el) => (el.textContent = fmt(+el.dataset.sonra, +el.dataset.dec)));
  $$('.rapor__sonra').forEach((td) => td.classList.add('is-pass'));
  $('.rapor').classList.add('is-stamped');
}

initSmoothScroll();

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  gsap.set(flowPath, { drawSVG: '100%' });
  gsap.set('.hero__img--temiz', { opacity: 1 });
  gsap.set('.soot', { opacity: 0 });
  setHat(1);
  raporuBitir();
} else {
  // Hero açılışı: başlık satır satır
  document.fonts.ready.then(() => {
    const split = new SplitText('.hero__title', { type: 'lines,words', linesClass: 'line-mask' });
    gsap.from(split.words, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.06 });
    gsap.from('.hero__since, .hero__slogan, .hero__actions', { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, delay: 0.35, ease: 'power2.out' });
    gsap.from('.line', { opacity: 0, y: 24, duration: 0.8, delay: 0.55, ease: 'power2.out' });
    ScrollTrigger.refresh();
  });

  gsap.set(flowPath, { drawSVG: '0%' });
  setHat(0);

  const heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: () => `+=${innerHeight * 1.6}`,
      pin: '.hero__stage',
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => setHat(self.progress),
    },
  });
  heroTl
    .to(flowPath, { drawSVG: '100%', duration: 1 }, 0)
    .to('.hero__img--temiz', { opacity: 1, duration: 0.85 }, 0.1)
    .to('.soot i', { yPercent: -60, xPercent: (i) => (i % 2 ? 18 : -14), scale: 1.5, opacity: 0, duration: 0.8, stagger: 0.03 }, 0.05)
    .to('.hero__hint', { opacity: 0, duration: 0.1 }, 0);

  // Muayene raporu: kalan değerler ölçülür, sınırın altına iner, damga basılır
  const rows = $$('[data-sonra]');
  const raporTl = gsap.timeline({
    paused: true,
    onComplete: () => $('.rapor').classList.add('is-stamped'),
  });
  raporTl.from('.rapor', { y: 40, rotate: -1.5, opacity: 0, duration: 0.7, ease: 'power3.out' });
  rows.forEach((el, i) => {
    const o = { v: +el.dataset.once };
    raporTl.to(
      o,
      {
        v: +el.dataset.sonra,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => (el.textContent = fmt(o.v, +el.dataset.dec)),
        onComplete: () => el.closest('td').classList.add('is-pass'),
      },
      0.5 + i * 0.25
    );
  });
  ScrollTrigger.create({ trigger: '.rapor', start: 'top 70%', once: true, onEnter: () => raporTl.play() });

  // Duraklar: dikey boru dolar, durak noktaları yanar
  gsap.fromTo(
    '.duraklar__list',
    { '--fill': 0 },
    { '--fill': 1, ease: 'none', scrollTrigger: { trigger: '.duraklar__list', start: 'top 70%', end: 'bottom 60%', scrub: true } }
  );
  $$('.durak').forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 62%', onToggle: (s) => el.classList.toggle('is-on', s.isActive || s.progress === 1), end: 'bottom -9999' })
  );

  // Hizmetler: satırlar alttan açılır
  gsap.utils.toArray('.hizmet').forEach((el) =>
    gsap.from(el, { y: 26, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  );

  // Sayaçlar
  $$('[data-count]').forEach((el) => {
    const hedef = +el.dataset.count;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(o, { v: hedef, duration: 1.4, ease: 'power2.out', onUpdate: () => (el.textContent = nf.format(Math.round(o.v))) }),
    });
    el.textContent = '0';
  });

  // Süreç: adımlar sırayla yanar
  gsap.utils.toArray('.adim').forEach((el, i) =>
    gsap.from(el, { y: 30, opacity: 0, duration: 0.6, delay: i * 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.surec__list', start: 'top 80%', once: true } })
  );

  // Galeri: fotoğraflar kurum perdesinden temize çıkar
  gsap.utils.toArray('.g').forEach((el) => {
    gsap.fromTo(el, { '--k': 1 }, { '--k': 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 45%', scrub: true } });
    gsap.fromTo(el.querySelector('img'), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Final başlığı
  gsap.from('.final__title', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.final', start: 'top 75%', once: true } });
}

// Header: hero geçilince zemin alır
ScrollTrigger.create({
  trigger: '.muayene',
  start: 'top 70px',
  end: 'max',
  onToggle: (s) => document.querySelector('.top').classList.toggle('is-solid', s.isActive),
});

addEventListener('load', () => ScrollTrigger.refresh());
