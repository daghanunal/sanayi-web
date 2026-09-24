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
const mobile = () => innerWidth < 900;

// "2006'dan", "1998'den": sayının okunuşunun son hecesine göre ek
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
$('[data-wa-kasko]').href = waHref(d, `Merhaba ${ad}, kaskom var. Camım için ruhsat ve fotoğraf gönderiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${ad}, sayfa başı`);
$('[data-year]').textContent = new Date().getFullYear();
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;

// Başlık: işletme adı kelime kelime satırlara
$('[data-hero-name]').parentElement.innerHTML = ad.split(/\s+/).map((w) => `<span>${esc(w)}</span>`).join(' ');
if (ad.length > 18) $('[data-t="0"]').classList.add('is-long');

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.innerHTML = status.open
    ? '<span class="top__status-long">Şu an açık</span><span class="top__status-short">Açık</span>'
    : '<span class="top__status-long">Şu an kapalı</span><span class="top__status-short">Kapalı</span>';
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc">
    <span class="svc__no">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</p>
  </li>`).join('');

$('[data-steps]').innerHTML = `<span class="steps__bar" aria-hidden="true"></span>` + d.surec.map((s, i) => `
  <li class="step">
    <p class="step__no">Adım ${i + 1}</p>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__text">${esc(s.aciklama)}</p>
  </li>`).join('');

const stats = d.istatistikler.map((s) => ({
  ...s, deger: s.kurulustanHesapla ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
$('[data-stats]').innerHTML = stats.map((s, i) => `
  <li class="stat">
    <span class="stat__num"><span data-count="${i}">${nf(s.deger)}</span>${esc(s.sonek)}</span>
    <span class="stat__label">${esc(s.etiket)}</span>
  </li>`).join('');

$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot">
    <div class="shot__img"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></div>
    <figcaption><b>${String(i + 1).padStart(2, '0')}</b>${esc(g.alt)}</figcaption>
  </figure>`).join('');

$('[data-film]').innerHTML = (d.filmler || []).map((f) => `
  <li class="fstrip" style="--o:${(((100 - f.gecirgenlik) / 100) * 0.9).toFixed(2)}">
    <span class="fstrip__tint"></span>
    <span class="fstrip__ad">${esc(f.ad)}</span>
    <span class="fstrip__not">${esc(f.not)}</span>
  </li>`).join('');

const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${d.puan.ortalama}`);
$('[data-score-count]').textContent = `${nf(d.puan.adet)} değerlendirmenin ortalaması.`;
$('[data-reviews]').innerHTML = d.yorumlar.map((r) => `
  <li class="review">
    <p class="review__stars" aria-label="${Number(r.puan) || 5} yıldız">${star(r.puan)}</p>
    <blockquote class="review__text">${esc(r.metin)}</blockquote>
    <p class="review__who">${esc(r.ad)}<span>${esc(r.arac)}</span></p>
  </li>`).join('');
$('[data-brands]').innerHTML = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');

// Saatler: bugünü işaretle
const order = [1, 2, 3, 4, 5, 6, 0];
const groupDays = [];
for (const g of order) {
  const last = groupDays.at(-1);
  if (last && d.saatler[last.at(-1)] === d.saatler[g]) last.push(g);
  else groupDays.push([g]);
}
const today = new Date().getDay();
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([gun, saat], i) => `
  <tr class="${groupDays[i]?.includes(today) ? 'is-today' : ''}"><th scope="row">${esc(gun)}</th><td class="${saat === 'Kapalı' ? 'is-closed' : ''}">${esc(saat)}</td></tr>`).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Ön cam biçimi: yüzde koordinatlı çokgen (üst kenar yay, alt kenar sarkık) -----------

function windshield(sx = 1, sy = 1, cx = 50, cy = 50) {
  const pts = [];
  const push = (x, y) => pts.push([cx + (x - cx) * sx, cy + (y - cy) * sy]);
  const N = 14;
  for (let i = 0; i <= N; i++) { const t = -1 + (2 * i) / N; push(50 + t * 37, 3.5 - 3.5 * (1 - t * t)); }
  push(92, 12); push(97, 60); push(100, 92);
  for (let i = 0; i <= N; i++) { const t = 1 - (2 * i) / N; push(50 + t * 50, 92 + 8 * (1 - t * t)); }
  push(3, 60); push(8, 12);
  return `polygon(${pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',')})`;
}
const stackEl = $('[data-stack]');
stackEl.style.setProperty('--ws', windshield());
stackEl.style.setProperty('--ws-in', windshield(0.86, 0.78, 50, 52));

// --- Taş izi testi ------------------------------------------------------------------

const tasIzi = d.hizmetler.find((h) => /taş|çatlak/i.test(h.baslik));
const onCam = d.hizmetler.find((h) => /ön cam/i.test(h.baslik));
const iz = $('[data-iz]');
$('[data-facts]').innerHTML = [
  [tasIzi?.sure || '30 dk', 'taş izi tamiri'],
  ['Aynı gün', 'cam değişimi'],
  ['Kasko', 'dosyası bizden'],
].map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join('');
const breakG = $('[data-break]');
function buildBreak(mm) {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = mm / 2;
  const paths = [];
  const rays = 9;
  for (let i = 0; i < rays; i++) {
    let a = (i / rays) * Math.PI * 2 + rnd() * 0.5;
    const len = R * (0.65 + rnd() * 0.45);
    let x = 0, y = 0, p = 'M0 0';
    const segs = 4;
    for (let s = 0; s < segs; s++) { a += (rnd() - 0.5) * 0.5; x += (Math.cos(a) * len) / segs; y += (Math.sin(a) * len) / segs; p += ` L${x.toFixed(2)} ${y.toFixed(2)}`; }
    paths.push(`<path d="${p}" stroke-width="${(0.35 + mm / 180).toFixed(2)}"/>`);
  }
  const ring = (r, a0, a1) => {
    const x1 = Math.cos(a0) * r, y1 = Math.sin(a0) * r, x2 = Math.cos(a1) * r, y2 = Math.sin(a1) * r;
    return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke-width=".35" opacity=".8"/>`;
  };
  paths.push(ring(R * 0.3, 0.2, 2.4), ring(R * 0.34, 3.3, 5.7));
  if (mm > 30) paths.push(ring(R * 0.62, 4.0, 5.9), ring(R * 0.7, 0.7, 2.2));
  breakG.innerHTML = paths.join('') + `<circle class="chip" r="${Math.max(0.9, mm * 0.06).toFixed(2)}"/>`;
}
const verdicts = {
  tamir: { tag: 'TAMİR', title: 'Reçineyle kapanır', text: () => `Cam değişmez. İzi temizler, reçineyle doldurur, sertleştiririz. Süre: ${tasIzi?.sure || '30 dk'}.` },
  sinir: { tag: 'SINIRDA', title: 'Fotoğrafla bakalım', text: () => 'Bu boyda reçine çoğu zaman tutar, ama izin derinliği ve yeri önemli. Fotoğrafı görünce söyleriz.' },
  degisim: { tag: 'DEĞİŞİM', title: 'Cam değişmeli', text: () => `Bu boyda iz yol titreşiminde büyür. Kalıbına uygun cam, aynı gün takılır. Süre: ${onCam?.sure || '2-3 saat'}.` },
};
function setIz() {
  const mm = Number(iz.value);
  const k = mm <= 26 ? 'tamir' : mm <= 40 ? 'sinir' : 'degisim';
  const v = verdicts[k];
  $('[data-iz-out]').textContent = `${mm} mm`;
  iz.style.setProperty('--p', `${((mm - iz.min) / (iz.max - iz.min)) * 100}%`);
  const box = $('[data-verdict]');
  box.dataset.k = k;
  $('[data-v-tag]').textContent = v.tag;
  $('[data-v-title]').textContent = v.title;
  $('[data-v-text]').textContent = v.text();
  $('[data-wa-test]').href = waHref(d, `Merhaba ${ad}, camımda yaklaşık ${mm} mm boyunda bir iz var. Fotoğrafını gönderiyorum, tamir olur mu?`);
  buildBreak(mm);
}
iz.addEventListener('input', setIz);
setIz();

// --- Hareket -----------------------------------------------------------------------

const top = $('[data-top]');
const onScroll = () => top.classList.toggle('is-solid', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const titles = $$('[data-t]');
const subs = $$('[data-s]');
const hero = $('[data-hero]');
const stage = $('.hero__stage');
let phase = -1;
function setPhase(p) {
  if (p === phase) return;
  phase = p;
  titles.forEach((t, i) => { t.classList.toggle('is-on', i === p); t.setAttribute('aria-hidden', String(i !== p && i !== 0)); });
  subs.forEach((s, i) => s.classList.toggle('is-on', i === p));
}
setPhase(0);

if (reducedMotion) {
  gsap.set('[data-cup]', { opacity: 1 });
} else {
  initSmoothScroll();

  // Açılış: cam vantuzlarla yukarıdan iner, ölçüler çizilir
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .from(stage, { yPercent: -14, opacity: 0, duration: 1.1 }, 0.1)
    .from('.dims__line', { drawSVG: 0, duration: 0.9, stagger: 0.15, ease: 'power2.inOut' }, 0.7)
    .from('[data-dim-txt]', { opacity: 0, duration: 0.4, stagger: 0.1 }, 1.1)
    .from('.hero__actions', { y: 16, opacity: 0, duration: 0.6 }, 0.35);

  const layers = { out: $('[data-l="out"]'), pvb: $('[data-l="pvb"]'), in: $('[data-l="in"]') };
  gsap.set(layers.out, { z: 2 });
  gsap.set(layers.pvb, { z: 1 });
  gsap.set(layers.in, { z: 0 });
  const mm = gsap.matchMedia();
  mm.add({ small: '(max-width: 899px)', big: '(min-width: 900px)' }, (ctx) => {
    const small = ctx.conditions.small;
    const sep = small ? 46 : 90;
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '.hero__pin', start: 'top top', end: small ? '+=210%' : '+=240%', pin: true, scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          setPhase(p < 0.22 ? 0 : p < 0.6 ? 1 : 2);
          stage.classList.toggle('is-tags', p > 0.3 && p < 0.62);
          stage.classList.toggle('is-open', p > 0.04 && p < 0.9);
        },
      },
    });
    tl.to('.dims, [data-dim-txt]', { opacity: 0, duration: 0.08 }, 0)
      .to('[data-cup]', { y: -70, scale: 1.25, opacity: 0, duration: 0.12, stagger: 0.03, ease: 'power2.in' }, 0.02)
      .to(stackEl, { rotationX: 56, rotationZ: small ? -24 : -30, scale: small ? 0.8 : 0.82, y: small ? -26 : -30, xPercent: small ? 0 : -22, duration: 0.3 }, 0.1)
      .to(layers.out, { z: sep, duration: 0.3 }, 0.14)
      .to(layers.in, { z: -sep, duration: 0.3 }, 0.14)
      .to(layers.out, { z: 2, duration: 0.2 }, 0.62)
      .to(layers.in, { z: 0, duration: 0.2 }, 0.62)
      .to(stackEl, { rotationX: 0, rotationZ: 0, scale: small ? 1 : 1.04, y: 0, xPercent: 0, duration: 0.22 }, 0.66)
      .fromTo(stackEl, { '--shine': '130%' }, { '--shine': '-40%', duration: 0.12, ease: 'none' }, 0.87)
      .fromTo('[data-meter]', { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, 0);
    return () => { setPhase(0); };
  });

  // Hizmet satırları: kırmızı çizgi ve kayma
  ScrollTrigger.batch('.svc', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 26, opacity: 0, '--sx': 0 }, { y: 0, opacity: 1, '--sx': 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', onComplete() { gsap.to(els, { '--sx': 0, duration: 0.6, delay: 0.2 }); } }),
  });
  ScrollTrigger.batch('.shot', {
    start: 'top 90%', once: true,
    onEnter: (els) => {
      gsap.fromTo(els, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1, stagger: 0.1, ease: 'power3.inOut' });
      gsap.to(els.map((e) => e.querySelector('img')), { scale: 1, duration: 1.6, stagger: 0.1, ease: 'power2.out' });
    },
  });
  const bar = $('.steps__bar');
  gsap.fromTo(bar, { scaleX: 0, scaleY: 0 }, {
    scaleX: () => (mobile() ? 1 : 1), scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
  });
  ScrollTrigger.batch('.step', {
    start: 'top 82%', once: true,
    onEnter: (els) => gsap.from(els, { y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }),
  });
  $$('[data-count]').forEach((el, i) => {
    const target = stats[i].deger;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = nf(o.v)) }),
    });
  });
  ScrollTrigger.create({
    trigger: '.film__ladder', start: 'top 75%', once: true,
    onEnter: () => gsap.from('.fstrip__tint', { scaleX: mobile() ? 0 : 1, scaleY: mobile() ? 1 : 0, duration: 0.9, stagger: 0.12, ease: 'power3.inOut' }),
  });
  gsap.from('.final__big', { yPercent: 18, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.final', start: 'top 70%' } });
}
