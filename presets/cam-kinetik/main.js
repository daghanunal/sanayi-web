// Şangır: Kinetik aile, oto cam. WebGL yok. Afiş gibi dev harfler, taş izi, çatlak ve
// parçalanıp yenisi takılan cam; hepsi transform / opacity / clip ile.
import kristal from '../../data/kristal.json';
import ek from '../../data/cam-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot({ ...kristal, ...ek, preset: 'cam-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const upper = (s) => String(s).toLocaleUpperCase('tr-TR');
const yil = d.isletme.kurulus;
const yillar = new Date().getFullYear() - yil;
const mobil = () => innerWidth < 900;

// Türkçe ek: 2006'dan, 1990'dan, 2010'dan …
function denEki(n) {
  const s = String(n);
  const son = s.slice(-1);
  const ikiSon = s.slice(-2);
  let unlu = { 0: 'a', 1: 'e', 2: 'e', 3: 'e', 4: 'e', 5: 'e', 6: 'a', 7: 'e', 8: 'e', 9: 'a' }[son];
  if (son === '0') unlu = { 10: 'a', 20: 'e', 30: 'a', 40: 'a', 50: 'e', 60: 'a', 70: 'e', 80: 'e', 90: 'a', '00': 'e' }[ikiSon] ?? 'a';
  const sert = ['3', '4', '5'].includes(son) || ['40', '60', '70'].includes(ikiSon);
  return `'${sert ? 't' : 'd'}${unlu}n`;
}

// --- Metin ve bağlantılar -------------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${yil}${denEki(yil)} beri`;
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-kasko]').textContent = d.kasko;
$('[data-final]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$('[data-cadde]').textContent = (d.iletisim.adres.match(/\d+\.\s*Cadde/) || ['Oto Sanayi Sitesi'])[0] + '.';
$('[data-hero-img]').src = d.heroGorsel;
$('[data-film-img]').src = d.filmGorsel;

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  if (!a.textContent.trim()) a.textContent = d.iletisim.telefon;
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
$('[data-maps]').href = mapsHref(d);
const finalTel = $('[data-final-tel]');
finalTel.href = telHref(d);
$('[data-final-tel-yazi]').textContent = d.iletisim.telefon;
finalTel.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`)
  .join('');

const mapEl = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries[0].isIntersecting) return;
    mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(mapEl);

// --- Yığın: dükkân adı, her satır kenardan kenara ---------------------------------

const yigin = $('[data-yigin]');
yigin.setAttribute('aria-label', d.isletme.ad);
function satirlaraBol(ad) {
  const k = upper(ad).split(/\s+/).filter(Boolean);
  if (k.length <= 3) return k;
  // Uzun adlar: kelimeleri yaklaşık eşit uzunlukta üç satıra dağıt.
  const hedef = k.join(' ').length / 3;
  const satirlar = [''];
  for (const w of k) {
    const s = satirlar[satirlar.length - 1];
    if (s && (s + ' ' + w).length > hedef * 1.25 && satirlar.length < 3) satirlar.push(w);
    else satirlar[satirlar.length - 1] = s ? `${s} ${w}` : w;
  }
  return satirlar;
}
yigin.innerHTML = satirlaraBol(d.isletme.ad)
  .map((s) => `<span class="yigin__satir${/[İÖÜ]/.test(s) ? ' yigin__satir--nokta' : ''}" aria-hidden="true"><span class="yigin__ic">${[...s].map((c) => `<span class="h">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</span></span>`)
  .join('');

function sigdir(el, genislik, tavan) {
  el.style.fontSize = '100px';
  const w = el.scrollWidth || 1;
  el.style.fontSize = `${Math.min(tavan, (100 * genislik) / w)}px`;
}
function yiginBoyutla() {
  const g = yigin.clientWidth;
  const tavan = mobil() ? innerHeight * 0.16 : Math.min(innerHeight * 0.2, 210);
  $$('.yigin__ic', yigin).forEach((el) => {
    sigdir(el, g, tavan);
    el.parentElement.style.fontSize = el.style.fontSize;
    el.style.fontSize = 'inherit';
  });
  const ft = $('[data-final-tel-yazi]');
  sigdir(ft, finalTel.clientWidth - 2, 260);
}

// --- Hero çatlağı: çarpma noktasından ışınlar -------------------------------------

function rnd(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
{
  const r = rnd(7);
  const cx = 64, cy = 38;
  let yol = '';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.5;
    const L = 30 + r() * 60;
    let p = `M${cx} ${cy}`;
    for (let j = 1; j <= 4; j++) {
      const t = (j / 4) * L;
      const sap = (r() - 0.5) * 6;
      p += ` L${(cx + Math.cos(a) * t + Math.cos(a + 1.57) * sap).toFixed(1)} ${(cy + Math.sin(a) * t * 1.3 + Math.sin(a + 1.57) * sap).toFixed(1)}`;
    }
    yol += `<path d="${p}" pathLength="1" />`;
  }
  yol += `<path class="halka" d="M${cx - 5} ${cy} a5 6.5 0 1 0 10 0 a5 6.5 0 1 0 -10 0" pathLength="1" />`;
  $('[data-hero-catlak]').innerHTML = yol;
}

// --- İmza: kırılan cam ------------------------------------------------------------

const K = d.kirilma;
$('[data-kirilma]').innerHTML = K.adimlar
  .map(
    (a, i) => `
    <li class="adim-k" data-k="${i}">
      <p class="adim-k__ust"><span>${String(i + 1).padStart(2, '0')}</span>${esc(a.ust)}</p>
      <h2 class="adim-k__baslik">${esc(a.baslik)}</h2>
      <p class="adim-k__alt">${esc(a.alt)}</p>
    </li>`
  )
  .join('');

const pano = $('[data-pano]');
const kirikEl = $('[data-kirik]');
const catlakSvg = $('[data-catlak]');
let parcalar = []; // { el, cx, cy, ic }
const IS = { x: 0.58, y: 0.42 }; // çarpma noktası (oran)

function isinCikis(ix, iy, a, W, H) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (W - ix) / dx);
  if (dx < -1e-6) t = Math.min(t, -ix / dx);
  if (dy > 1e-6) t = Math.min(t, (H - iy) / dy);
  if (dy < -1e-6) t = Math.min(t, -iy / dy);
  return [ix + dx * t, iy + dy * t];
}

function camKur() {
  const W = pano.clientWidth;
  const H = pano.clientHeight;
  if (!W || !H) return;
  const ix = W * IS.x, iy = H * IS.y;
  const r = rnd(11);
  const N = 8;
  const acilar = Array.from({ length: N }, (_, i) => -Math.PI + (i / N) * Math.PI * 2 + (r() - 0.5) * 0.45);
  const cikis = acilar.map((a) => isinCikis(ix, iy, a, W, H));
  const R0 = Math.min(W, H) * 0.24;
  const halka = acilar.map((a) => {
    const rr = R0 * (0.8 + r() * 0.45);
    return [ix + Math.cos(a) * rr, iy + Math.sin(a) * rr];
  });
  const koseler = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => ({ x, y, a: Math.atan2(y - iy, x - ix) }));
  const acidaMi = (a, a0, a1) => {
    const n = (v) => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const s = n(a - a0), e = n(a1 - a0);
    return s > 0 && s < e;
  };

  const sekiller = [];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    sekiller.push({ pts: [[ix, iy], halka[i], halka[j]], ic: true, a: (acilar[i] + acilar[j] + (j === 0 ? Math.PI * 2 : 0)) / 2 });
    const k = koseler.filter((c) => acidaMi(c.a, acilar[i], acilar[j]))
      .sort((p, q) => ((p.a - acilar[i] + Math.PI * 4) % (Math.PI * 2)) - ((q.a - acilar[i] + Math.PI * 4) % (Math.PI * 2)));
    sekiller.push({ pts: [halka[i], cikis[i], ...k.map((c) => [c.x, c.y]), cikis[j], halka[j]], ic: false, a: (acilar[i] + acilar[j] + (j === 0 ? Math.PI * 2 : 0)) / 2 });
  }

  const kelime = esc(upper(K.kelime));
  kirikEl.innerHTML = sekiller
    .map((s) => {
      const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]);
      const bx = Math.floor(Math.min(...xs)), by = Math.floor(Math.min(...ys));
      const bw = Math.ceil(Math.max(...xs)) - bx, bh = Math.ceil(Math.max(...ys)) - by;
      const poli = s.pts.map((p) => `${(p[0] - bx).toFixed(1)}px ${(p[1] - by).toFixed(1)}px`).join(',');
      return `<div class="parca${s.ic ? ' parca--ic' : ''}" style="left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;clip-path:polygon(${poli})" data-a="${s.a.toFixed(3)}"><div class="parca__art" style="left:${-bx}px;top:${-by}px;width:${W}px;height:${H}px"><span class="parca__kelime">${kelime}</span></div></div>`;
    })
    .join('');
  const img = `url("${K.kirikGorsel}")`;
  parcalar = $$('.parca', kirikEl).map((el) => {
    $('.parca__art', el).style.backgroundImage = img;
    return { el, a: Number(el.dataset.a), ic: el.classList.contains('parca--ic') };
  });
  $$('.parca__kelime', kirikEl).forEach((k) => sigdir(k, W * 0.86, H * 0.42));
  sigdir($('.pano__yeni-yazi'), W * 0.8, H * 0.45);

  // Çatlak çizgileri: ışınlar biraz kırık, halka tırtıklı.
  catlakSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = '';
  cikis.forEach(([ex, ey], i) => {
    let p = `M${ix.toFixed(1)} ${iy.toFixed(1)}`;
    for (let q = 1; q < 5; q++) {
      const t = q / 5;
      const sap = (r() - 0.5) * 10;
      const a = acilar[i] + Math.PI / 2;
      p += ` L${(ix + (ex - ix) * t + Math.cos(a) * sap).toFixed(1)} ${(iy + (ey - iy) * t + Math.sin(a) * sap).toFixed(1)}`;
    }
    p += ` L${ex.toFixed(1)} ${ey.toFixed(1)}`;
    s += `<path class="isin" d="${p}" pathLength="1" />`;
  });
  s += `<path class="halka" d="M${halka.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} Z" pathLength="1" />`;
  s += `<circle class="merkez" cx="${ix.toFixed(1)}" cy="${iy.toFixed(1)}" r="${(Math.min(W, H) * 0.035).toFixed(1)}" />`;
  catlakSvg.innerHTML = s;
  const tas = $('.pano__tas');
  tas.style.left = `${ix}px`;
  tas.style.top = `${iy}px`;
}

// --- İstatistik -----------------------------------------------------------------

$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const v = s.kurulustanHesapla ? yillar : s.deger;
    return `<div class="sayi sayi--${i % 2 ? 'sag' : 'sol'}"><dd data-sayi="${v}" aria-label="${nf.format(v)}${esc(s.sonek)}"><span class="sayi__n">${nf.format(v)}</span><span class="sayi__sonek">${esc(s.sonek)}</span></dd><dt>${esc(s.etiket)}</dt></div>`;
  })
  .join('');

// --- Hizmetler ------------------------------------------------------------------

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h, i) => `
    <li class="hizmet">
      <div class="hizmet__ic">
        <span class="hizmet__no">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
        <p class="hizmet__metin">${esc(h.aciklama)}</p>
        <span class="hizmet__sure">${esc(h.sure)}</span>
      </div>
      <span class="hizmet__rakle" aria-hidden="true"></span>
    </li>`
  )
  .join('');

// --- Film -----------------------------------------------------------------------

const filmler = d.filmler || [];
$('[data-film-makara]').innerHTML = filmler.map((f) => `<span>${esc(f.ad)}</span>`).join('');
const filmPerde = $('[data-film-perde]');
const filmNot = $('[data-film-not]');
const barIsik = $('[data-film-bar="isik"]');
const barIsi = $('[data-film-bar="isi"]');
let filmSon = -1;
const filmEase = gsap.parseEase('power3.inOut');
function filmYaz(p) {
  if (!filmler.length) return;
  const f = gsap.utils.clamp(0, filmler.length - 1, p * (filmler.length - 1));
  const a = filmler[Math.floor(f)], b = filmler[Math.min(filmler.length - 1, Math.floor(f) + 1)];
  const t = f - Math.floor(f);
  const g = a.gecirgenlik + (b.gecirgenlik - a.gecirgenlik) * t;
  filmPerde.style.opacity = ((100 - g) / 100) * 0.94;
  barIsik.style.transform = `scaleX(${g / 100})`;
  barIsi.style.transform = `scaleX(${(a.isi + (b.isi - a.isi) * t) / 5})`;
  const kes = gsap.utils.clamp(0, 1, (t - 0.55) / 0.45);
  $('[data-film-makara]').style.transform = `translateY(${-(Math.floor(f) + filmEase(kes))}em)`;
  const i = Math.min(filmler.length - 1, Math.floor(f) + (kes > 0.5 ? 1 : 0));
  if (i !== filmSon) {
    filmSon = i;
    filmNot.textContent = filmler[i].not;
    $('[data-film-uv]').textContent = `%${filmler[i].uv}`;
  }
}
filmYaz(0);

// --- Süreç, galeri, yorumlar, markalar --------------------------------------------

$('[data-steps]').innerHTML = d.surec
  .map(
    (s, i) => `
    <li class="adim">
      <span class="adim__no" aria-hidden="true">${i + 1}</span>
      <div class="adim__metin">
        <h3>${esc(s.baslik)}</h3>
        <p>${esc(s.aciklama)}</p>
      </div>
    </li>`
  )
  .join('');

$('[data-gallery]').innerHTML = d.galeri
  .slice(0, 4)
  .map(
    (g, i) => `
    <figure class="kare kare--${i + 1}">
      <div class="kare__cerceve"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></div>
      <figcaption>${esc(g.alt)}</figcaption>
    </figure>`
  )
  .join('');

const puanStr = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-puan]').textContent = puanStr;
$('[data-puan]').setAttribute('aria-label', `5 üzerinden ${puanStr}`);
$('[data-yildiz]').innerHTML = icons.star.repeat(5);
$('[data-puan-alt]').textContent = `${nf.format(d.puan.adet)} değerlendirme, 5 üzerinden`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <blockquote class="kart">
      <p class="kart__yildiz" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
      <p class="kart__metin">${esc(y.metin)}</p>
      <footer><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></footer>
    </blockquote>`
  )
  .join('');

const markaHTML = d.markalar.map((m) => `<span>${esc(m)}</span><i>✦</i>`).join('');
$('[data-brands]').innerHTML = `<div class="serit__grup">${markaHTML}</div><div class="serit__grup" aria-hidden="true">${markaHTML}</div>`;
$$('[data-serit]').forEach((el) => {
  const g = `<div class="serit__grup">${esc(el.dataset.serit)} ${esc(el.dataset.serit)}</div>`;
  el.innerHTML = g + g;
});

// --- Hareket --------------------------------------------------------------------

Promise.race([
  Promise.all([document.fonts.load('100px "Climate Crisis"', 'ÇAMİŞ'), document.fonts.load('800 20px Sora', 'ÇAMİŞ')]),
  new Promise((r) => setTimeout(r, 2500)),
])
  .catch(() => {})
  .then(() => document.fonts.ready)
  .then(() => {
  yiginBoyutla();
  camKur();
  if (reducedMotion) {
    document.documentElement.classList.add('is-static');
    filmYaz(0.5);
    return;
  }
  document.documentElement.classList.add('is-motion');
  const lenis = initSmoothScroll();
  hareket(lenis);
});

let genislik = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - genislik) < 2 && mobil()) return; // telefon adres çubuğu
  genislik = innerWidth;
  yiginBoyutla();
  camKur();
  if (kt) {
    kirilmaKur();
    ScrollTrigger.sort();
  }
  ScrollTrigger.refresh();
});

function hareket() {
  // Açılış: harfler aşağıdan vurur, taş cama çarpar, çatlak yayılır, afiş sarsılır.
  const giris = gsap.timeline({ defaults: { ease: 'power4.out' } });
  giris
    .from('.yigin .h', { yPercent: 105, duration: 0.9, stagger: { each: 0.028, from: 'start' } }, 0.1)
    .from('.hero__ustsatir', { y: 16, autoAlpha: 0, duration: 0.6 }, 0.25)
    .fromTo('.hero__cam', { clipPath: 'inset(0 0 100% 0 round 22px)' }, { clipPath: 'inset(0 0 0% 0 round 22px)', duration: 0.9, ease: 'power3.inOut' }, 0.45)
    .fromTo('.hero__tas', { scale: 9, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.32, ease: 'power2.in' }, 1.2)
    .fromTo('[data-hero-catlak] path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', stagger: 0.02 }, 1.52)
    .fromTo('.hero', { x: 0 }, { keyframes: [{ x: -7 }, { x: 6 }, { x: -3 }, { x: 0 }], duration: 0.28, ease: 'none' }, 1.52)
    .fromTo('.hero__damga', { scale: 0, rotate: -30 }, { scale: 1, rotate: -8, duration: 0.6, ease: 'back.out(2.4)' }, 1.9)
    .from('.hero__alt > *', { y: 22, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 1.0);

  // Hero fotoğrafı kaydırdıkça yukarı kayar, harfler ayrışır.
  gsap.to('.hero__cam img', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  $$('.yigin__satir').forEach((s, i) =>
    gsap.to(s, { xPercent: i % 2 ? 9 : -9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  );

  // Header hero'dan sonra koyulaşır.
  const ust = $('.ust');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: () => ust.classList.toggle('is-solid', scrollY > innerHeight * 0.5) });

  kirilmaKur();

  // Rakamlar: satırlar kaydırmayla ters yönlere kayar, sayılar sıfırdan sayar.
  $$('.sayi').forEach((el, i) => {
    gsap.fromTo(el, { xPercent: i % 2 ? -14 : 14 }, { xPercent: i % 2 ? 6 : -6, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    const n = $('.sayi__n', el);
    const hedef = Number($('dd', el).dataset.sayi);
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => (n.textContent = nf.format(Math.round(o.v))),
    });
  });

  // Hizmetler: rakle geçer, arkasından satır belirir.
  $$('.hizmet').forEach((li) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 86%', once: true } });
    tl.fromTo($('.hizmet__ic', li), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.75, ease: 'power2.inOut' }, 0)
      .fromTo($('.hizmet__rakle', li), { left: '0%', autoAlpha: 1 }, { left: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
      .to($('.hizmet__rakle', li), { autoAlpha: 0, duration: 0.2 })
      .from($('.hizmet__sure', li), { scale: 0, rotate: -20, duration: 0.5, ease: 'back.out(2.5)' }, 0.5);
  });

  // Film: pinli, kaydırdıkça cam koyulaşır.
  ScrollTrigger.create({
    trigger: '.film',
    start: 'top top',
    end: () => `+=${innerHeight * 2}`,
    pin: '.film__pin',
    scrub: true,
    onUpdate: (self) => filmYaz(self.progress),
  });
  gsap.fromTo('.film__img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.film', start: 'top bottom', end: 'top top', scrub: true } });

  // Bölüm başlıkları harf harf.
  $$('.bas__baslik, .final__ust').forEach((h) => {
    const sp = SplitText.create(h, { type: 'words,chars', wordsClass: 'k-sar' });
    gsap.from(sp.chars, { yPercent: 110, duration: 0.8, ease: 'power4.out', stagger: 0.015, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });

  // Süreç: dev rakam büyüyerek gelir.
  $$('.adim').forEach((li) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 82%', once: true } });
    tl.from($('.adim__no', li), { yPercent: 60, scale: 0.4, autoAlpha: 0, duration: 0.8, ease: 'expo.out' })
      .from($('.adim__metin', li), { x: 40, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.15);
  });

  // Galeri: kareler cam gibi yukarıdan iner.
  $$('.kare').forEach((f, i) => {
    gsap.fromTo($('.kare__cerceve', f), { clipPath: 'inset(0 0 100% 0 round 18px)' }, { clipPath: 'inset(0 0 0% 0 round 18px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 50%', scrub: true } });
    gsap.fromTo($('img', f), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    if (i % 2) gsap.fromTo(f, { y: 60 }, { y: -30, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Puan sayar.
  {
    const el = $('[data-puan]');
    const o = { v: 0 };
    gsap.to(o, {
      v: d.puan.ortalama, duration: 1.3, ease: 'power3.out',
      scrollTrigger: { trigger: '.yorumlar', start: 'top 75%', once: true },
      onUpdate: () => (el.textContent = o.v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })),
    });
    gsap.from('.puan__yildiz svg', { scale: 0, rotate: -90, duration: 0.5, ease: 'back.out(3)', stagger: 0.07, scrollTrigger: { trigger: '.yorumlar', start: 'top 75%', once: true } });
    gsap.from('.kart', { x: 80, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.kartlar', start: 'top 85%', once: true } });
  }

  // Final: telefon numarası harf harf.
  const ft = SplitText.create('[data-final-tel-yazi]', { type: 'chars' });
  gsap.from(ft.chars, { yPercent: 100, autoAlpha: 0, duration: 0.7, ease: 'power4.out', stagger: 0.03, scrollTrigger: { trigger: '.final', start: 'top 70%', once: true } });
}

// İmza: pinli kırılma filmi. Yeniden boyutlanınca parçalarla birlikte baştan kurulur.
let kt = null;
function kirilmaKur() {
  if (kt) {
    kt.scrollTrigger?.kill(true);
    kt.kill();
  }
  const adimlar = $$('.adim-k');
  const ilerleme = $('.kirilma__ilerleme span');
  let aktif = -1;
  const adimGoster = (i) => {
    if (i === aktif) return;
    aktif = i;
    adimlar.forEach((li, k) => li.classList.toggle('is-aktif', k === i));
  };
  adimGoster(0);
  kt = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.kirilma',
      start: 'top top',
      end: () => `+=${innerHeight * 3.2}`,
      pin: '.kirilma__pin',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        adimGoster(p < 0.2 ? 0 : p < 0.46 ? 1 : p < 0.78 ? 2 : 3);
        ilerleme.style.transform = `scaleX(${p})`;
      },
    },
  });
  // 0 → 1 zaman ölçeği = kaydırma ilerlemesi.
  kt.fromTo('.pano__tas', { scale: 6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.08, ease: 'power2.in' }, 0.02)
    .fromTo('.pano', { rotate: 0 }, { keyframes: [{ rotate: -1.2 }, { rotate: 0.8 }, { rotate: 0 }], duration: 0.05 }, 0.1)
    .fromTo('[data-catlak] .merkez', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.05 }, 0.1)
    .fromTo('[data-catlak] .isin', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.2, stagger: 0.012 }, 0.2)
    .fromTo('[data-catlak] .halka', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.12 }, 0.32)
    .to('.pano__tas', { autoAlpha: 0, duration: 0.05 }, 0.44)
    .to('[data-catlak]', { autoAlpha: 0, duration: 0.06 }, 0.5)
    .add(() => {}, 1);

  const parcaHareket = () => {
    const W = pano.clientWidth;
    const H = pano.clientHeight;
    parcalar.forEach((p, i) => {
      const ayr = (p.ic ? 0.03 : 0.05) * Math.min(W, H);
      const x = Math.cos(p.a) * ayr;
      const y = Math.sin(p.a) * ayr;
      const don = (i % 2 ? 1 : -1) * (2 + (i % 3));
      kt.fromTo(p.el, { x: 0, y: 0, rotate: 0 }, { x, y, rotate: don, duration: 0.2, ease: 'power2.out' }, 0.47)
        .to(p.el, { x: x * 3 + (i % 2 ? 1 : -1) * W * 0.08, y: H * (1.1 + (i % 4) * 0.12), rotate: don * 6, autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 0.74 + (i % 5) * 0.012);
    });
  };
  parcaHareket();
  kt.fromTo('.pano__yeni', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.1, ease: 'power2.out' }, 0.84)
    .fromTo('.pano__yeni-yazi', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.05 }, 0.9)
    .fromTo('.pano__parilti', { xPercent: -120 }, { xPercent: 260, duration: 0.07 }, 0.93);

}
