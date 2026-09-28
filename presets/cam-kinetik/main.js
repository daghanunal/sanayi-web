// Şangır: kinetik aile, oto cam. WebGL yok. Dev harfler yalnız olgulardır: dükkânın adı, hizmet adları,
// kuruluştan geçen yıl, telefon numarası. Künyede ön cam; açılışta bir kez taş çarpar, çatlak yayılır.
// Pin ve hikâye yok; hareket transform / opacity / clip ile.
import kristal from '../../data/kristal.json';
import ek from '../../data/cam-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot({ ...kristal, ...ek, preset: 'cam-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const upper = (s) => String(s).toLocaleUpperCase('tr-TR');
const yillar = new Date().getFullYear() - d.isletme.kurulus;
const mobil = () => innerWidth < 900;
const st = gunDurumu(d.saatler);
const no = (i) => String(i + 1).padStart(2, '0');

// --- Metin ve bağlantılar -------------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-tanim]').forEach((el) => (el.textContent = d.isletme.tanim));
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$('[data-kisa-adres]').textContent = kisaAdres(d.iletisim.adres);
$('[data-hero-img]').src = d.heroGorsel;
$('[data-hakkinda]').textContent = `${d.isletme.ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${d.isletme.hakkinda}`;

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
});
const telYazi = $('[data-tel-yazi]');
telYazi.href = telHref(d);
telYazi.textContent = d.iletisim.telefon;
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
$$('[data-maps]').forEach((a) => {
  a.href = mapsHref(d);
  a.insertAdjacentHTML('afterbegin', icons.pin);
});
const finalTel = $('[data-final-tel]');
finalTel.href = telHref(d);
$('[data-final-tel-yazi]').textContent = d.iletisim.telefon;
finalTel.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

$$('[data-status-kisa]').forEach((el) => {
  el.textContent = st.open ? 'Açık' : 'Kapalı';
  el.classList.toggle('is-open', st.open);
});
$$('[data-status]').forEach((el) => {
  el.textContent = st.metin;
  el.classList.toggle('is-open', st.open);
});
$('[data-kunye]').textContent = st.kunye;
$('[data-kunye]').classList.toggle('is-open', st.open);
$('[data-status-metin]').textContent = st.metin;
$('[data-hours]').innerHTML = saatListesi(d.saatler)
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
  // Telefonda künyenin tamamı ilk ekrana sığsın diye ad daha alçak tutulur.
  const tavan = mobil() ? Math.min(innerHeight * 0.1, 76) : Math.min(innerHeight * 0.17, 190);
  $$('.yigin__ic', yigin).forEach((el) => {
    sigdir(el, g, tavan);
    el.parentElement.style.fontSize = el.style.fontSize;
    el.style.fontSize = 'inherit';
  });
  sigdir($('[data-final-tel-yazi]'), finalTel.clientWidth - 2, 260);
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

// --- Hizmetler, süreç, hakkında, yorumlar --------------------------------------------

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h, i) => `
    <li class="hizmet">
      <div class="hizmet__ic">
        <span class="hizmet__no">${no(i)}</span>
        <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
        <p class="hizmet__metin">${esc(h.aciklama)}</p>
        <span class="hizmet__sure">${esc(h.sure)}</span>
      </div>
      <span class="hizmet__rakle" aria-hidden="true"></span>
    </li>`
  )
  .join('');

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

// Rakamlar yalnız veriden türeyen olgular: kuruluştan geçen yıl, haftada açık gün.
$('[data-stats]').innerHTML = [
  [yillar, ' yıl', "Şaşmaz Oto Sanayi Sitesi'nde"],
  [acikGunSayisi(d.saatler), ' gün', 'haftada açık'],
]
  .map(([v, sonek, etiket], i) => `<div class="sayi sayi--${i % 2 ? 'sag' : 'sol'}"><dd data-sayi="${v}" aria-label="${v}${sonek}"><span class="sayi__n">${v}</span><span class="sayi__sonek">${sonek}</span></dd><dt>${esc(etiket)}</dt></div>`)
  .join('');

$('[data-bilgi]').innerHTML = [
  ...(d.bilgiler || []),
  ...(d.markalar?.length ? [['Cam takılan markalar', d.markalar.join(', ')]] : []),
].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

$('[data-gallery]').innerHTML = d.galeri
  .slice(0, 4)
  .map(
    (g, i) => `
    <figure class="kare kare--${i + 1}">
      <div class="kare__cerceve"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="900" height="1200" /></div>
      <figcaption>${esc(g.alt)}</figcaption>
    </figure>`
  )
  .join('');

$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <blockquote class="kart">
      <p class="kart__yildiz" role="img" aria-label="5 üzerinden ${y.puan}">${icons.star.repeat(y.puan)}</p>
      <p class="kart__metin">${esc(y.metin)}</p>
      <footer><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></footer>
    </blockquote>`
  )
  .join('');

// --- Hareket --------------------------------------------------------------------

const ust = $('.ust');
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: () => ust.classList.toggle('is-solid', scrollY > innerHeight * 0.5) });
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(ust, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

Promise.race([
  Promise.all([document.fonts.load('100px "Climate Crisis"', 'ÇAMİŞ'), document.fonts.load('800 20px Sora', 'ÇAMİŞ')]),
  new Promise((r) => setTimeout(r, 2500)),
])
  .catch(() => {})
  .then(() => document.fonts.ready)
  .then(() => {
    yiginBoyutla();
    if (reducedMotion) {
      document.documentElement.classList.add('is-static');
      return;
    }
    document.documentElement.classList.add('is-motion');
    initSmoothScroll();
    hareket();
  });

let genislik = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - genislik) < 2 && mobil()) return; // telefon adres çubuğu
  genislik = innerWidth;
  yiginBoyutla();
  ScrollTrigger.refresh();
});

const bir = (trigger, start = 'top 86%') => ({ trigger, start, toggleActions: 'play none none none' });

function hareket() {
  // Açılış (~1,2 sn): harfler aşağıdan vurur, taş cama çarpar, çatlak yayılır.
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from('.yigin .h', { yPercent: 105, duration: 0.7, stagger: { each: 0.02, from: 'start' } }, 0.05)
    .fromTo('.hero__cam', { clipPath: 'inset(0 0 100% 0 round 22px)' }, { clipPath: 'inset(0 0 0% 0 round 22px)', duration: 0.7, ease: 'power3.inOut' }, 0.15)
    .from('.hero__alt > *', { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.06, clearProps: 'all' }, 0.3)
    .fromTo('.hero__tas', { scale: 9, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.25, ease: 'power2.in' }, 0.7)
    .fromTo('[data-hero-catlak] path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out', stagger: 0.015 }, 0.95)
    .fromTo('.hero__cam', { x: 0 }, { keyframes: [{ x: -6 }, { x: 5 }, { x: -2 }, { x: 0 }], duration: 0.24, ease: 'none' }, 0.95);

  // Hero fotoğrafı kaydırdıkça yukarı kayar, harf satırları ayrışır.
  gsap.to('.hero__cam img', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  $$('.yigin__satir').forEach((s, i) =>
    gsap.to(s, { xPercent: i % 2 ? 9 : -9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  );

  // Bölüm başlıkları harf harf.
  $$('.bas__baslik, .final__ust, .konum__baslik').forEach((h) => {
    const sp = SplitText.create(h, { type: 'words,chars', wordsClass: 'k-sar' });
    gsap.from(sp.chars, { yPercent: 110, duration: 0.8, ease: 'power4.out', stagger: 0.015, scrollTrigger: bir(h, 'top 88%') });
  });

  // Hizmetler: rakle geçer, arkasından satır belirir.
  $$('.hizmet').forEach((li) => {
    gsap.timeline({ scrollTrigger: bir(li) })
      .fromTo($('.hizmet__ic', li), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.75, ease: 'power2.inOut' }, 0)
      .fromTo($('.hizmet__rakle', li), { left: '0%', autoAlpha: 1 }, { left: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
      .to($('.hizmet__rakle', li), { autoAlpha: 0, duration: 0.2 })
      .from($('.hizmet__sure', li), { scale: 0, rotate: -20, duration: 0.5, ease: 'back.out(2.5)' }, 0.5);
  });

  // Süreç: dev rakam büyüyerek gelir.
  $$('.adim').forEach((li) => {
    gsap.timeline({ scrollTrigger: bir(li, 'top 82%') })
      .from($('.adim__no', li), { yPercent: 60, scale: 0.4, autoAlpha: 0, duration: 0.8, ease: 'expo.out' })
      .from($('.adim__metin', li), { x: 40, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0.15);
  });

  // Rakamlar: satırlar kaydırmayla ters yönlere kayar, sayılar sıfırdan sayar.
  $$('.sayi').forEach((el, i) => {
    const dr = mobil() ? 0.25 : 0.5;
    gsap.fromTo(el, { xPercent: (i % 2 ? -14 : 14) * dr }, { xPercent: (i % 2 ? 6 : -6) * dr, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    const n = $('.sayi__n', el);
    const hedef = Number($('dd', el).dataset.sayi);
    const o = { v: 0 };
    gsap.to(o, { v: hedef, duration: 1.2, ease: 'power3.out', scrollTrigger: bir(el, 'top 85%'), onUpdate: () => (n.textContent = Math.round(o.v)) });
  });

  // Galeri: kareler cam gibi yukarıdan iner.
  $$('.kare').forEach((f, i) => {
    gsap.fromTo($('.kare__cerceve', f), { clipPath: 'inset(0 0 100% 0 round 18px)' }, { clipPath: 'inset(0 0 0% 0 round 18px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 55%', scrub: true } });
    if (i % 2 && !mobil()) gsap.fromTo(f, { y: 60 }, { y: -30, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  gsap.from('.kart', { x: 80, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, clearProps: 'all', scrollTrigger: bir('.kartlar', 'top 85%') });

  // İletişim: telefon numarası harf harf.
  const ft = SplitText.create('[data-final-tel-yazi]', { type: 'chars' });
  gsap.from(ft.chars, { yPercent: 100, autoAlpha: 0, duration: 0.7, ease: 'power4.out', stagger: 0.03, scrollTrigger: bir('.final', 'top 70%') });
  addEventListener('load', () => ScrollTrigger.refresh());
}
