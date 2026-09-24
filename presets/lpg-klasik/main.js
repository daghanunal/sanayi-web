// Dolum (klasik aile, LPG): sis grisi, gece laciverti, alev kobaltı. Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: simit tank göstergesi. Kaydırdıkça tank dolar, ibre döner, %80'de çok valf
// dolumu keser; kalan %20 sarı taramayla "genleşme payı" olarak belirir.
import base from '../../data/sektor-lpg.json';
import extra from '../../data/lpg-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...base, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;

// "2002'den", "1998'den", "2010'dan" gibi
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar ---------------------------------------------------------------
// Metindeki sabit kuruluş yılı ("2002'den") ?kurulus= ile güncellenir
const hakkinda = String(d.isletme.hakkinda || '').replace(/\b(19|20)\d\d'(den|dan|ten|tan)\b/, () => ablative(d.isletme.kurulus));
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, aracıma LPG dönüşümü için bilgi almak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => (el.textContent = status.text));
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: simit tank ---------------------------------------------------------
const R = 132, L = 2 * Math.PI * R, LIMIT = 0.8;
const ticks = $('[data-ticks]');
let tickHtml = '';
for (let i = 0; i < 100; i += 5) {
  const a = (i / 100) * Math.PI * 2 - Math.PI / 2;
  const major = i % 20 === 0;
  const r1 = major ? 163 : 166, r2 = major ? 177 : 173;
  const c = Math.cos(a), s = Math.sin(a);
  tickHtml += `<line class="${major ? 'is-major' : ''}" x1="${(200 + c * r1).toFixed(1)}" y1="${(200 + s * r1).toFixed(1)}" x2="${(200 + c * r2).toFixed(1)}" y2="${(200 + s * r2).toFixed(1)}"/>`;
  if (major) tickHtml += `<text class="${i === 80 ? 'is-limit' : ''}" x="${(200 + c * 188).toFixed(1)}" y="${(200 + s * 188).toFixed(1)}">${i}</text>`;
}
ticks.innerHTML = tickHtml;

const fill = $('[data-fill]');
const pay = $('[data-pay]');
const needle = $('[data-needle]');
const levelEl = $('[data-level]');
const stateEl = $('[data-state]');
const hero = $('.hero');
pay.setAttribute('stroke-dasharray', `${(L * (1 - LIMIT)).toFixed(1)} ${L.toFixed(1)}`);
pay.style.transform = `rotate(${-90 + LIMIT * 360}deg)`;
pay.style.transformOrigin = '200px 200px';

let lastState = '';
function setTank(p) {
  // p: 0 → boş, 0.8 → dolum sınırı
  const v = Math.min(p, LIMIT);
  fill.setAttribute('stroke-dasharray', `${(L * v).toFixed(1)} ${L.toFixed(1)}`);
  needle.style.transform = `rotate(${(v * 360).toFixed(2)}deg)`;
  levelEl.textContent = Math.round(v * 100);
  const st = v >= LIMIT - 0.001 ? 'full' : v < 0.01 ? 'empty' : 'mid';
  if (st !== lastState) {
    lastState = st;
    hero.classList.toggle('is-full', st === 'full');
    stateEl.textContent = st === 'full' ? 'Dolum kesildi' : st === 'empty' ? 'Tank boş' : 'Dolduruluyor';
  }
}

const small = matchMedia('(max-width: 899px)').matches;
if (reducedMotion) {
  setTank(LIMIT);
} else {
  setTank(0);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.05 : 1.2)}`,
      pin: '.hero__pin', scrub: 0.5, anticipatePin: 1,
    },
  });
  const m = { p: 0 };
  const START = 0.1;
  tl.fromTo(m, { p: START }, { p: LIMIT, immediateRender: false, duration: 0.8, ease: 'power1.inOut', onUpdate: () => setTank(m.p) }, 0)
    .fromTo('.hero__photo img', { scale: 1.14 }, { scale: 1, duration: 1 }, 0)
    .fromTo('.tank__svg', { rotate: -12 }, { rotate: 0, duration: 0.8, ease: 'power2.out' }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.1 }, 0)
    .to({}, { duration: 0.25 });

  // Açılış
  gsap.from('.hero__name', { yPercent: 30, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__copy .eyebrow', '.hero__slogan', '.hero__cta'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  gsap.from('.tank', { opacity: 0, scale: 0.8, duration: 1, ease: 'power3.out', delay: 0.1 });
  // İlk açılışta tank biraz dolar: "kaydırınca dolar" ipucu. Kaydırma bu seviyeden devam eder.
  gsap.to(m, {
    p: START, duration: 1.1, ease: 'power2.out', delay: 0.6,
    onUpdate: () => { if (tl.progress() === 0) setTank(m.p); },
  });
}

// --- Aracıma uyar mı? --------------------------------------------------------
const opts = $('[data-opts]');
const res = $('[data-res]');
opts.innerHTML = d.uygunluk.map((u, i) => `
  <button type="button" class="opt" role="radio" aria-checked="${i === 0}" data-id="${esc(u.id)}">
    <span class="opt__dot" aria-hidden="true"></span>
    <span class="opt__t">${esc(u.secenek)}<span class="opt__o">${esc(u.ornek)}</span></span>
  </button>`).join('');
function showRes(u, animate) {
  const msg = u.ton === 'belki'
    ? `Merhaba ${d.isletme.ad}, aracımın motor tipinden emin değilim. Ruhsatın fotoğrafını gönderiyorum, LPG'ye uygun mu?`
    : `Merhaba ${d.isletme.ad}, aracım ${u.secenek.toLocaleLowerCase('tr-TR')}. LPG dönüşümü için bilgi almak istiyorum.`;
  res.innerHTML = `
    <div class="res res--${esc(u.ton)}">
      <p class="res__hukum">${esc(u.hukum)}</p>
      <p class="res__txt">${esc(u.metin)}</p>
      <div class="res__row">
        ${u.sure ? `<span class="res__sure">Süre: ${esc(u.sure)}</span>` : ''}
        ${u.ton !== 'hayir' ? `<a class="btn" href="${esc(waHref(d, msg))}" target="_blank" rel="noopener">${icons.whatsapp}${u.ton === 'belki' ? 'Ruhsatı gönder' : 'WhatsApp’tan sor'}</a>` : `<a class="btn" href="${esc(telHref(d))}">${icons.phone}Yine de arayın</a>`}
      </div>
    </div>`;
  if (animate && !reducedMotion) {
    gsap.from(res.firstElementChild, { y: 14, opacity: 0, duration: 0.45, ease: 'power2.out' });
    gsap.from(res.querySelector('.res__hukum'), { x: -10, duration: 0.5, ease: 'power3.out' });
  }
}
showRes(d.uygunluk[0], false);
opts.addEventListener('click', (e) => {
  const b = e.target.closest('.opt');
  if (!b || b.getAttribute('aria-checked') === 'true') return;
  $$('.opt', opts).forEach((o) => o.setAttribute('aria-checked', String(o === b)));
  showRes(d.uygunluk.find((u) => u.id === b.dataset.id), true);
});
opts.addEventListener('keydown', (e) => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  const all = $$('.opt', opts);
  const i = all.findIndex((o) => o.getAttribute('aria-checked') === 'true');
  const n = all[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
  n.focus(); n.click();
});

// Hero altı kısa bilgiler (masaüstü)
$('[data-facts]').innerHTML = d.istatistikler.slice(1, 4).map((s) => `<li><b>${esc(nf(s.deger))}${esc(s.sonek)}</b><span>${esc(s.etiket)}</span></li>`).join('');

// --- Hizmetler ---------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => {
  const g = d.hizmetGorsel?.[i] || d.galeri[i % d.galeri.length];
  return `
  <li class="svc">
    <figure class="svc__photo"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><span class="svc__no">${String(i + 1).padStart(2, '0')}</span></figure>
    <div class="svc__body">
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
      <span class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
    </div>
  </li>`;
}).join('');
const svcList = $('[data-services]');
const svcCount = $('[data-svc-count]');
const svcBar = $('[data-svc-bar]');
const nSvc = d.hizmetler.length;
svcCount.textContent = `1 / ${nSvc}`;
svcBar.style.transform = `scaleX(${1 / nSvc})`;
svcList.addEventListener('scroll', () => {
  const max = svcList.scrollWidth - svcList.clientWidth;
  if (max <= 0) return;
  const f = svcList.scrollLeft / max;
  svcBar.style.transform = `scaleX(${(1 / nSvc + f * (1 - 1 / nSvc)).toFixed(3)})`;
  svcCount.textContent = `${Math.min(nSvc, 1 + Math.round(f * (nSvc - 1)))} / ${nSvc}`;
}, { passive: true });

// --- Rakamlar ----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Evrak yolu --------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => {
  const key = /proje|evrak/i.test(s.baslik);
  return `
  <li class="doc${key ? ' is-key' : ''}">
    <span class="doc__no">${i + 1}</span>
    <div class="doc__card">
      ${key ? `<span class="doc__stamp">${/proje/i.test(s.baslik) ? 'Montajdan önce' : 'Elinize verilir'}</span>` : ''}
      <h3 class="doc__title">${esc(s.baslik)}</h3>
      <p class="doc__text">${esc(s.aciklama)}</p>
    </div>
  </li>`;
}).join('');

// --- Galeri ------------------------------------------------------------------
const kucuk = ['usta', 'tespit', 'manometre', 'motor-siyah', 'eller', 'tablet', 'motor-kirmizi', 'lift', 'gosterge', 'yakit', 'atolye'];
const galeri = d.galeri
  .map((g) => {
    const name = g.src.split('/').pop().replace('.jpg', '');
    return kucuk.includes(name) ? { ...g, src: asset(`/img/lpg-klasik/${name}.jpg`) } : null;
  })
  .filter(Boolean)
  .filter((g) => !/atolye/.test(g.src))
  .slice(0, 8);
$('[data-gallery]').innerHTML = galeri.map((g) => `
  <figure><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="1400" height="933" /></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
  </li>`).join('');

// --- Markalar ----------------------------------------------------------------
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}<i aria-hidden="true"></i></div><div class="marka__row" aria-hidden="true">${brandRow}<i></i></div>`;
const marka = $('.marka');
new IntersectionObserver(([e]) => marka.classList.toggle('is-off', !e.isIntersecting)).observe(marka);

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const t = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${t >= a && t <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header -------------------------------------------------------------------
const top = $('.top');
const solid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.5);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 34, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));

  gsap.from('.opt', { x: -20, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.uyar__opts', start: 'top 85%' } });

  // Hizmet kartları: fotoğraf alttan perde gibi açılır
  $$('.svc').forEach((s, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 88%' } });
    tl.fromTo(s.querySelector('.svc__photo'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'power3.inOut', delay: small ? 0 : (i % 4) * 0.06 })
      .from(s.querySelector('.svc__photo img'), { scale: 1.2, duration: 1.1, ease: 'power2.out' }, 0)
      .from(s.querySelectorAll('.svc__body > *'), { y: 16, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' }, 0.25);
  });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });

  // Evrak yolu: gaz hattı gibi çizgi dolar, kartlar sırayla gelir
  gsap.fromTo('.evrak__list', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.evrak__list', start: 'top 75%', end: 'bottom 70%', scrub: true } });
  gsap.from('.doc', { y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: '.evrak__list', start: 'top 85%' } });
  gsap.from('.doc__stamp', { scale: 1.8, opacity: 0, rotate: -12, duration: 0.5, stagger: 0.2, ease: 'back.out(2)', scrollTrigger: { trigger: '.evrak__list', start: 'top 60%' } });

  gsap.fromTo('.atolye__photo img', { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Galeri: kaydırdıkça yana akar
  const track = $('.galeri__track');
  gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - innerWidth + 40), ease: 'none',
    scrollTrigger: { trigger: '.galeri', start: 'top bottom', end: 'bottom top', scrub: 0.3, invalidateOnRefresh: true },
  });

  gsap.from('.rev', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__ring i', { '--p': '0%' }, { '--p': '80%', duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: '.final', start: 'top 70%' } });
  gsap.fromTo('.final__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

addEventListener('load', () => ScrollTrigger.refresh());
