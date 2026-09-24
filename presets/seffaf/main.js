import raw from '../../data/kristal.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const ad = d.isletme.ad;

// "2006'dan", "1998'den", "2004'ten": sayının okunuşunun son hecesine göre ek
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Render ----------------------------------------------------------------

const binds = {
  ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-wa-foto]').forEach((a) => (a.href = waHref(d, `Merhaba ${ad}, camımın fotoğrafını gönderiyorum. Tamir mi olur, değişim mi?`)));
$('[data-wa-kasko]').href = waHref(d, `Merhaba ${ad}, kaskom var. Camım için fotoğraf ve ruhsat gönderiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${ad}, sayfa başı`);
$('[data-year]').textContent = new Date().getFullYear();

$('[data-since]').textContent = `Şaşmaz Oto Sanayi'nde ${ablative(d.isletme.kurulus)} beri`;
$('[data-stamp-since]').textContent = `Şaşmaz ${d.isletme.kurulus}`;
$('[data-hero-title]').textContent = ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.innerHTML = status.open
    ? '<span class="top__status-long">Şu an açık</span><span class="top__status-short">Açık</span>'
    : '<span class="top__status-long">Şu an kapalı</span><span class="top__status-short">Kapalı</span>';
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

$('[data-steps]').innerHTML = d.surec.map((s) => `
  <li class="step">
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__text">${esc(s.aciklama)}</p>
  </li>`).join('');

$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="svc">
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</p>
  </li>`).join('');

const stats = d.istatistikler.map((s) => ({
  ...s, deger: s.kurulustanHesapla ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
$('[data-stats]').innerHTML = stats.map((s, i) => `
  <li class="stat">
    <span class="stat__num"><span data-count="${i}">${nf(s.deger)}</span>${esc(s.sonek)}</span>
    <span class="stat__label">${esc(s.etiket)}</span>
  </li>`).join('');

$('[data-gallery]').innerHTML = d.galeri.map((g) => `
  <li class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><span>${esc(g.alt)}</span></li>`).join('');

const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = star(Math.round(d.puan.ortalama));
$('[data-score-count]').textContent = `${nf(d.puan.adet)} değerlendirme, 5 üzerinden.`;
$('[data-reviews]').innerHTML = d.yorumlar.map((r) => `
  <li class="review">
    <p class="review__stars" aria-label="${r.puan} yıldız">${star(r.puan)}</p>
    <blockquote class="review__text">${esc(r.metin)}</blockquote>
    <p class="review__who">${esc(r.ad)}<span>${esc(r.arac)}</span></p>
  </li>`).join('');

const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-brands]').innerHTML = `<div>${brandRow}</div><div aria-hidden="true">${brandRow}</div>`;

$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => `<tr><th scope="row">${gun}</th><td class="${saat === 'Kapalı' ? 'is-closed' : ''}">${saat}</td></tr>`).join('');

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Cam filmi seçici -------------------------------------------------------

const films = d.filmler;
let filmIdx = Math.max(0, films.findIndex((f) => f.ad === '%35'));
$('[data-film-opts]').innerHTML = films.map((f, i) => `
  <button type="button" role="radio" class="film__opt" data-film="${i}" aria-checked="false">${esc(f.ad)}</button>`).join('');

function setFilm(i, animate = true) {
  filmIdx = i;
  const f = films[i];
  $$('[data-film]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.film) === i)));
  const dark = (100 - f.gecirgenlik) / 100;
  const dur = animate && !reducedMotion ? 0.6 : 0;
  gsap.to('[data-tint]', { opacity: dark * 0.92, duration: dur, ease: 'power2.out' });
  gsap.to('[data-glare]', { opacity: 1 - dark, duration: dur, ease: 'power2.out' });
  $('[data-m-gec]').textContent = `%${f.gecirgenlik}`;
  $('[data-m-uv]').textContent = `%${f.uv}`;
  $('[data-m-isi]').innerHTML = Array.from({ length: 5 }, (_, k) => `<i class="${k < f.isi ? 'on' : ''}"></i>`).join('') +
    `<span class="sr-only">${f.isi} / 5</span>`;
  $('[data-film-not]').textContent = f.not;
  $('[data-film-cta]').textContent = `${f.ad} film için fiyat al`;
  $('[data-wa-film]').href = waHref(d, `Merhaba ${ad}, camlarıma ${f.ad} cam filmi yaptırmak istiyorum. Fiyat alabilir miyim?`);
}
$('[data-film-opts]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-film]');
  if (b) setFilm(Number(b.dataset.film));
});
$('[data-film-opts]').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
  const n = (filmIdx + dir + films.length) % films.length;
  setFilm(n);
  $(`[data-film="${n}"]`).focus();
});
setFilm(filmIdx, false);

// --- Çatlak: tohumlu rastgele, her açılışta aynı ----------------------------

const IMPACT = { x: 610, y: 400 };
function buildCrack(svg) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rays = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const base = (i / n) * Math.PI * 2 + rnd() * 0.4;
    const len = 150 + rnd() * 330;
    let x = IMPACT.x, y = IMPACT.y, a = base;
    let dStr = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    const segs = 6 + Math.floor(rnd() * 4);
    for (let s = 0; s < segs; s++) {
      a += (rnd() - 0.5) * 0.6;
      const step = len / segs;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      dStr += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      // Arada kısa bir dal
      if (s > 1 && rnd() > 0.72) {
        const ba = a + (rnd() > 0.5 ? 1 : -1) * (0.5 + rnd() * 0.5);
        const bl = 30 + rnd() * 70;
        rays.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + Math.cos(ba) * bl).toFixed(1)} ${(y + Math.sin(ba) * bl).toFixed(1)}`, w: 1 });
      }
    }
    rays.push({ d: dStr, w: 1.6 });
  }
  // Darbenin etrafında iki yarım halka (yıldız kırığı)
  const ring = (r, from, to) => {
    const p = (t) => [IMPACT.x + Math.cos(t) * r, IMPACT.y + Math.sin(t) * r];
    const [x1, y1] = p(from), [x2, y2] = p(to);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  rays.push({ d: ring(26, 0.3, 2.4), w: 1.2 }, { d: ring(30, 3.4, 5.6), w: 1.2 }, { d: ring(58, 4.2, 5.9), w: 1 }, { d: ring(64, 0.9, 2.1), w: 1 });

  svg.innerHTML = `
    <g class="crack__shadow">${rays.map((r) => `<path d="${r.d}" stroke-width="${r.w + 1.6}"/>`).join('')}</g>
    <g class="crack__lines">${rays.map((r) => `<path d="${r.d}" stroke-width="${r.w}"/>`).join('')}</g>
    <circle class="crack__resin" cx="${IMPACT.x}" cy="${IMPACT.y}" r="46"/>
    <circle class="crack__chip" cx="${IMPACT.x}" cy="${IMPACT.y}" r="9"/>
    <circle class="crack__pulse" cx="${IMPACT.x}" cy="${IMPACT.y}" r="9"/>`;
}
buildCrack($('[data-crack]'));

// --- Silecek maskesi: pivot altta ortada, açıyla büyüyen dilim --------------

function sectorClip(el, angleDeg) {
  // angleDeg: silinen bölümün sağ kenarı; 180 = hiç silinmedi, 0 = tamamı silindi
  const w = el.clientWidth, h = el.clientHeight;
  const px = w / 2, py = h;
  const R = Math.hypot(w, h) * 1.05;
  const pts = [`${px}px ${py}px`];
  for (let a = 180; a >= angleDeg; a -= 6) {
    const r = (a * Math.PI) / 180;
    pts.push(`${(px + Math.cos(r) * R).toFixed(1)}px ${(py - Math.sin(r) * R).toFixed(1)}px`);
  }
  const r = (angleDeg * Math.PI) / 180;
  pts.push(`${(px + Math.cos(r) * R).toFixed(1)}px ${(py - Math.sin(r) * R).toFixed(1)}px`);
  el.style.clipPath = `polygon(${pts.join(',')})`;
}

// --- Hareket ---------------------------------------------------------------

const lenis = initSmoothScroll();
const top = $('[data-top]');

if (reducedMotion) {
  $$('.cap').forEach((c, i) => c.classList.toggle('is-on', i === 0));
  document.documentElement.classList.add('is-still');
} else {
  const clear = $('[data-clear]');
  const wiper = $('[data-wiper]');
  const wipe = { a: 180 };
  const applyWipe = () => {
    sectorClip(clear, wipe.a);
    wiper.style.transform = `rotate(${-wipe.a}deg)`;
  };
  applyWipe();

  // Açılış: tek bir silecek darbesi buğuyu siler
  const intro = gsap.timeline({ delay: 0.35 });
  intro
    .from('.hero__copy > *', { y: 24, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.2)
    .to(wipe, { a: 0, duration: 1.25, ease: 'power2.inOut', onUpdate: applyWipe }, 0)
    .to(wiper, { opacity: 0, duration: 0.3 }, 1.2)
    .add(() => (clear.style.clipPath = 'none'));

  // Hero sabitlenir: taş çarpar, çatlak yayılır, reçine kapatır
  const lines = $$('.crack__lines path');
  const shadows = $$('.crack__shadow path');
  gsap.set([...lines, ...shadows], { drawSVG: '0%' });
  gsap.set('.crack__chip, .crack__pulse', { scale: 0, transformOrigin: '50% 50%' });
  gsap.set('.crack__resin', { scale: 0, opacity: 0, transformOrigin: '50% 50%' });

  const caps = $$('.cap');
  const showCap = (tl, i, at) => {
    tl.to(caps.filter((_, k) => k !== i), { opacity: 0, y: -18, duration: 0.06, ease: 'power2.in' }, at)
      .fromTo(caps[i], { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.08, ease: 'power2.out' }, at + 0.05);
  };

  const hero = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '[data-hero]', start: 'top top', end: '+=170%', pin: true, scrub: 0.6,
      onLeave: () => top.classList.add('is-solid'),
      onEnterBack: () => top.classList.remove('is-solid'),
    },
  });
  gsap.set(caps.slice(1), { opacity: 0 });
  hero
    .to('.crack__chip', { scale: 1, duration: 0.03, ease: 'back.out(3)' }, 0.08)
    .fromTo('.crack__pulse', { scale: 0, opacity: 0.9 }, { scale: 7, opacity: 0, duration: 0.1 }, 0.08)
    .to('.hero__glass', { x: 6, duration: 0.01, yoyo: true, repeat: 3 }, 0.08)
    .to('.hero__hint', { opacity: 0, duration: 0.05 }, 0.02);
  showCap(hero, 1, 0.1);
  hero
    .to(lines, { drawSVG: '100%', duration: 0.3, stagger: 0.004 }, 0.12)
    .to(shadows, { drawSVG: '100%', duration: 0.3, stagger: 0.004 }, 0.12)
    .to('.crack__resin', { scale: 1, opacity: 0.85, duration: 0.1, ease: 'power2.out' }, 0.5)
    .to('.crack__chip', { scale: 0.4, duration: 0.1 }, 0.5);
  showCap(hero, 2, 0.5);
  hero
    .to([...lines, ...shadows], { drawSVG: '0% 0%', duration: 0.24, stagger: -0.003 }, 0.6)
    .to('.crack__resin', { scale: 0.18, opacity: 0, duration: 0.18 }, 0.72)
    .to('.crack__chip', { scale: 0, duration: 0.1 }, 0.78)
    .to({}, { duration: 0.1 }, 0.9);

  // Hizmet satırlarının üst çizgisi: camın kenarı gibi soldan sağa
  $$('.svc').forEach((row) => {
    gsap.fromTo(row, { '--edge': 0 }, {
      '--edge': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 92%', end: 'top 60%', scrub: true },
    });
  });

  // Kasko adımları sırayla
  gsap.from('.step', {
    opacity: 0, y: 26, duration: 0.7, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-steps]', start: 'top 80%' },
  });

  // Rakamlar sayar
  $$('[data-count]').forEach((el) => {
    const s = stats[Number(el.dataset.count)];
    const o = { v: 0 };
    gsap.to(o, {
      v: s.deger, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => (el.textContent = nf(o.v)),
    });
  });

  // Galeri fotoğrafları camdan siler gibi açılır
  gsap.fromTo('.shot img', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: 'inset(0 0% 0 0)', duration: 1, stagger: 0.12, ease: 'power3.inOut',
    scrollTrigger: { trigger: '[data-gallery]', start: 'top 82%' },
  });

  // Final: sayfaya girerken ikinci silecek darbesi
  const finalClear = $('[data-final-clear]');
  const fw = { a: 180 };
  const applyFinal = () => sectorClip(finalClear, fw.a);
  applyFinal();
  gsap.to(fw, {
    a: 0, ease: 'none', onUpdate: applyFinal,
    scrollTrigger: { trigger: '[data-final]', start: 'top 85%', end: 'top 15%', scrub: 0.5 },
  });

  addEventListener('resize', () => {
    applyFinal();
    if (clear.style.clipPath !== 'none') applyWipe();
  });
}

// Hero'dan sonra üst çubuk koyu zemin alır (hareket azaltmada da)
if (reducedMotion) {
  ScrollTrigger.create({
    trigger: '[data-hero]', start: 'bottom top+=60',
    onEnter: () => top.classList.add('is-solid'),
    onLeaveBack: () => top.classList.remove('is-solid'),
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
void lenis;
