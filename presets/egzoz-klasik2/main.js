// Desibel (klasik aile, egzoz): beton grisi, is karası, sinyal pembesi. Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: gürültü ölçer. Kaydırdıkça ses dalgası söner, desibel 104'ten 78'e iner,
// "Muayeneden kalır" hükmü "Geçer"e döner, titreyen fotoğraf durulur.
import manifold from '../../data/manifold.json';
import extra from '../../data/egzoz-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...manifold, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
const decimals = (n) => (String(n).split('.')[1] || '').length;
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;

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
$('[data-wa-rapor]').href = waHref(d, `Merhaba ${d.isletme.ad}, aracım muayeneden egzozdan kaldı. Raporun fotoğrafını gönderiyorum.`);
$('.hero__name').style.setProperty('--n', Math.max(12, d.isletme.ad.length));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-years]').textContent = `${yil} yıldır aynı cadde, aynı lift`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => (el.textContent = status.text));
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero ölçer -------------------------------------------------------------
const ses = d.muayene.olcumler.find((o) => o.birim === 'dB') || { once: 104, sonra: 78, sinir: 90 };
$('[data-limit]').textContent = ses.sinir;
const small = matchMedia('(max-width: 699px)').matches;
const N = small ? 34 : 72;
// Egzoz sesine benzeyen düzensiz ama tekrarlanabilir bir dalga (her açılışta aynı)
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const wave = $('[data-wave]');
wave.innerHTML = Array.from({ length: N }, (_, i) => {
  const env = 0.55 + 0.45 * Math.sin((i / N) * Math.PI * 3.1 + 0.6) ** 2;
  const h = Math.min(1, 0.3 + env * (0.5 + rnd() * 0.7));
  const dur = (0.22 + rnd() * 0.3).toFixed(2);
  const del = (-rnd()).toFixed(2);
  return `<i style="--h:${h.toFixed(3)};--t:${dur}s;--dl:${del}s"></i>`;
}).join('');
// Sınır çizgisi dalga yüksekliğinin hangi oranında: tam genlikte 104 dB, sıfırda ~60 dB kabul
const DB_MIN = 60;
const limitFrac = (ses.sinir - DB_MIN) / (ses.once - DB_MIN);
$('.wave').style.setProperty('--limit', limitFrac.toFixed(3));

const dbEl = $('[data-db]');
const verdict = $('[data-verdict]');
const lineEl = $('[data-line]');
const hero = $('.hero');
let loud = null;
function setMeter(p) {
  // p: 0 → gürültülü, 1 → sessiz
  const db = ses.once + (ses.sonra - ses.once) * p;
  dbEl.textContent = Math.round(db);
  const amp = (db - DB_MIN) / (ses.once - DB_MIN);
  wave.style.transform = `scaleY(${amp.toFixed(3)})`;
  const isLoud = db > ses.sinir;
  if (isLoud !== loud) {
    loud = isLoud;
    hero.classList.toggle('is-loud', isLoud);
    verdict.textContent = isLoud ? 'Muayeneden kalır' : 'Muayeneden geçer';
    lineEl.textContent = isLoud ? `${d.sesSatiri} Sınır ${ses.sinir}\u00a0dB.` : `${d.sessizSatiri} Sınırın ${ses.sinir - ses.sonra}\u00a0dB altında.`;
  }
}

if (reducedMotion) {
  setMeter(1);
} else {
  setMeter(0);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.1 : 1.3)}`,
      pin: '.hero__pin', scrub: 0.4, anticipatePin: 1,
    },
  });
  const m = { p: 0 };
  tl.to(m, { p: 1, duration: 1, onUpdate: () => setMeter(m.p) }, 0)
    .fromTo('.hero__photo img', { scale: 1.16 }, { scale: 1, duration: 1 }, 0)
    .fromTo('.hero__tint', { opacity: 1 }, { opacity: 0.12, duration: 0.9 }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.15 }, 0);

  // Açılış: isim satır satır, dalga sıfırdan kalkar
  gsap.from('.hero__name', { yPercent: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta'], { y: 16, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out', delay: 0.25 });
  gsap.fromTo('.wave', { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.1, ease: 'power3.inOut', delay: 0.15, clearProps: 'clipPath' });
}

// --- Ölçüm göstergeleri -------------------------------------------------------
$('[data-gauges]').innerHTML = d.muayene.olcumler.map((o) => {
  const max = Math.max(o.once, o.sinir) * 1.08;
  const dg = Math.max(decimals(o.once), decimals(o.sonra));
  return `
  <li class="gauge" style="--a:${(o.once / max).toFixed(3)};--b:${(o.sonra / max).toFixed(3)};--s:${(o.sinir / max).toFixed(3)}">
    <p class="gauge__name">${esc(o.ad)}<span class="mono">${esc(o.birim)}</span></p>
    <p class="gauge__vals">
      <s class="gauge__once mono" aria-label="Gelişte">${esc(nf(o.once, dg))}</s>
      <b class="gauge__sonra" aria-label="Teslimde">${esc(nf(o.sonra, dg))}</b>
    </p>
    <div class="gauge__track" aria-hidden="true">
      <i class="gauge__fill"></i>
      <span class="gauge__lim"><em class="mono">sınır ${esc(nf(o.sinir, decimals(o.sinir)))}</em></span>
    </div>
  </li>`;
}).join('');

// --- Hat ---------------------------------------------------------------------
$('[data-hat]').innerHTML = d.yolculuk.map((y, i) => {
  const g = d.durakGorsel?.[y.id] || d.galeri[i % d.galeri.length];
  return `
  <li class="stop">
    <figure class="stop__photo"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>
    <div class="stop__body">
      <p class="stop__no"><span>${String(i + 1).padStart(2, '0')}</span><em class="mono">${esc(y.durak)}</em></p>
      <h3 class="stop__title">${esc(y.baslik)}</h3>
      <p class="stop__text">${esc(y.metin)}</p>
      <p class="stop__svc mono">${esc(y.hizmet)}</p>
    </div>
  </li>`;
}).join('');

// --- Rakamlar ----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Hizmetler ---------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc">
    <span class="svc__no mono">${String(i + 1).padStart(2, '0')}</span>
    <div class="svc__body">
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
    </div>
    <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
  </li>`).join('');

// --- Süreç -------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__no">${i + 1}</span>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__text">${esc(s.aciklama)}</p>
  </li>`).join('');

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

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const t = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${t >= a && t <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');

// Harita yaklaşınca
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header -------------------------------------------------------------------
const top = $('.top');
ScrollTrigger.create({ start: () => innerHeight * 0.6, end: 'max', onToggle: (st) => top.classList.toggle('is-solid', st.isActive) });

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  // Başlıklar: alttan
  $$('.h2').forEach((h) => gsap.from(h, { y: 36, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));

  // Göstergeler: gelişteki değerden teslimdekine iner
  $$('.gauge').forEach((g) => {
    ScrollTrigger.create({ trigger: g, start: 'top 82%', once: true, onEnter: () => g.classList.add('is-on') });
  });

  // Duraklar: fotoğraf perde gibi açılır
  $$('.stop').forEach((s) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 80%' } });
    tl.fromTo(s.querySelector('.stop__photo'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'power3.inOut' })
      .from(s.querySelector('.stop__photo img'), { scale: 1.2, duration: 1.2, ease: 'power2.out' }, 0)
      .from(s.querySelectorAll('.stop__body > *'), { y: 22, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out' }, 0.25);
  });

  // Rakamlar sayar
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });

  // Hizmet satırları
  gsap.from('.svc', { y: 26, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.hizmet__list', start: 'top 85%' } });
  gsap.fromTo('.atolye__photo img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.step', { y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: '.surec__list', start: 'top 85%' } });
  gsap.fromTo('.surec__list', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.surec__list', start: 'top 80%', end: 'bottom 60%', scrub: true } });
  gsap.from('.rev', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__flat i', { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: '.final', start: 'top 70%' } });
  gsap.fromTo('.final__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
} else {
  $$('.gauge').forEach((g) => g.classList.add('is-on'));
}

// Ekran dışındayken dalga animasyonunu durdur
new IntersectionObserver(([e]) => hero.classList.toggle('is-off', !e.isIntersecting)).observe($('.hero__pin'));

addEventListener('load', () => ScrollTrigger.refresh());
