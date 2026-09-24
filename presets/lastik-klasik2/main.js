// Profil (klasik aile): soğuk kâğıt zemin, kobalt mavi, fotoğraf ağırlıklı.
// İmza anı hero'da: kâğıda oyulmuş "LASTİK / JANT" harflerinin içinden jant görünür,
// kaydırınca İ harfinin gövdesine dalınır ve fotoğraf ekranı kaplar. WebGL yok.
import pist from '../../data/pist.json';
import extra from '../../data/lastik-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...pist, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const mmf = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// "2004'ten", "1998'den": sayının okunuşunun son hecesine göre ek
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Render ----------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('[data-wa-otel]').href = waHref(d, `Merhaba ${d.isletme.ad}, lastik oteli için yer ayırtmak istiyorum.`);
$('[data-wa-olc]').href = waHref(d, `Merhaba ${d.isletme.ad}, lastiklerimin diş derinliğine baktırmak istiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

$('[data-meta-ad]').textContent = d.isletme.ad;
$('[data-facts]').innerHTML = d.hizmetler.slice(0, 3).map((h) => `<li><span>${esc(h.baslik.replace(/ satışı ve değişimi$/, ' değişimi'))}</span><b>${esc(h.sure)}</b></li>`).join('');
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => (el.textContent = status.text));
document.documentElement.classList.toggle('is-open', status.open);
$('[data-status-big]').textContent = status.text;

// Hizmetler
const svcImgs = d.hizmetGorselleri || [];
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__item" data-i="${i}">
    <span class="svc__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <img class="svc__thumb" src="${esc(svcImgs[i % svcImgs.length] || '')}" alt="" loading="lazy" decoding="async" />
    <div class="svc__body">
      <h3 class="svc__name">${esc(s.baslik)}</h3>
      <p class="svc__desc">${esc(s.aciklama)}</p>
    </div>
    <p class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</p>
  </li>`).join('');
const svcPhoto = $('[data-svc-photo]');
svcPhoto.innerHTML = svcImgs.map((src, i) => `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}" />`).join('');
const setSvc = (i) => {
  $$('img', svcPhoto).forEach((im, j) => im.classList.toggle('is-on', j === i % svcImgs.length));
  $$('.svc__item').forEach((li, j) => li.classList.toggle('is-active', j === i));
};
$$('.svc__item').forEach((li) => li.addEventListener('pointerenter', () => setSvc(Number(li.dataset.i))));

// İstatistikler
const stats = d.istatistikler.map((s) => ({
  ...s,
  deger: s.deger === 'kurulus' ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
$('[data-stats]').innerHTML = stats.map((s, i) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${s.deger}">${reducedMotion ? nf(s.deger) : '0'}</span>${esc(s.sonek)}</p>
    <p class="stat__label">${esc(s.etiket)}</p>
    <span class="stat__bar" aria-hidden="true"><i style="--w:${Math.min(s.deger / (s.max || s.deger), 1).toFixed(3)}"></i></span>
  </li>`).join('');

// Diş derinliği
const dp = d.derinlik;
$('[data-depth-title]').textContent = dp.baslik;
$('[data-depth-lead]').textContent = dp.metin;
const svg = $('[data-depth-svg]');
const BASE_Y = 172, PX = 15; // 1 mm = 15 birim
const blocks = [0, 1, 2, 3, 4].map((i) => i * 62);
svg.innerHTML = `
  <rect x="0" y="${BASE_Y}" width="308" height="48" rx="6" class="d-carcass"/>
  <g class="d-cords">${Array.from({ length: 15 }, (_, i) => `<line x1="${i * 21}" y1="${BASE_Y + 14}" x2="${i * 21 + 14}" y2="${BASE_Y + 34}"/>`).join('')}</g>
  ${blocks.slice(0, 4).map((x) => `<rect class="d-twi" x="${x + 52}" y="${BASE_Y - 1.6 * PX}" width="10" height="${1.6 * PX}"/>`).join('')}
  <g data-blocks>${blocks.map((x) => `<rect class="d-block" x="${x}" width="52" rx="4"/>`).join('')}</g>
  <line class="d-limit d-limit--kis" x1="0" x2="318" y1="${BASE_Y - 4 * PX}" y2="${BASE_Y - 4 * PX}"/>
  <line class="d-limit d-limit--yasal" x1="0" x2="318" y1="${BASE_Y - 1.6 * PX}" y2="${BASE_Y - 1.6 * PX}"/>
  <text class="d-lbl" x="400" y="${BASE_Y - 4 * PX - 22}" text-anchor="end">4 mm</text>
  <text class="d-lbl d-lbl--sm" x="400" y="${BASE_Y - 4 * PX - 7}" text-anchor="end">kış sınırı</text>
  <text class="d-lbl d-lbl--red" x="400" y="${BASE_Y - 1.6 * PX + 20}" text-anchor="end">1,6 mm</text>
  <text class="d-lbl d-lbl--red d-lbl--sm" x="400" y="${BASE_Y - 1.6 * PX + 35}" text-anchor="end">yasal sınır</text>`;
const blockEls = $$('.d-block', svg);
const range = $('[data-range]');
const depthSec = $('[data-depth]');
let lastTone = '';
function setDepth(mm) {
  const h = mm * PX;
  blockEls.forEach((b, i) => {
    // omuz blokları biraz daha hızlı aşınır: gerçekçi, düzensiz profil
    const hh = Math.max(h - (i === 0 || i === 4 ? (8 - mm) * 1.6 : 0), 4);
    b.setAttribute('y', (BASE_Y - hh).toFixed(1));
    b.setAttribute('height', hh.toFixed(1));
  });
  $('[data-mm]').textContent = mmf(mm);
  const e = dp.esikler.find((x) => mm >= x.min) || dp.esikler.at(-1);
  if (e.etiket !== lastTone) {
    lastTone = e.etiket;
    $('[data-verdict-tag]').textContent = e.etiket;
    $('[data-verdict-text]').textContent = e.metin;
    depthSec.dataset.tone = e.ton;
  }
}
setDepth(8);
range.addEventListener('input', () => {
  userTouched = true;
  setDepth(range.value / 10);
});
let userTouched = false;

// Süreç
const mins = d.surec.map((s) => parseInt(s.sure, 10) || 1);
const totalMin = mins.reduce((a, b) => a + b, 0);
$('[data-total]').textContent = totalMin;
let acc = 0;
$('[data-steps-list]').insertAdjacentHTML('beforeend', d.surec.map((s, i) => {
  acc += mins[i];
  return `
  <li class="step">
    <p class="step__clock">+${String(acc).padStart(2, '0')}:00</p>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__desc">${esc(s.aciklama)}</p>
  </li>`;
}).join(''));

// Mevsim
$('[data-esik]').textContent = d.mevsimEsik || '7°C';
$('[data-season]').innerHTML = ['yaz', 'kis'].map((k) => {
  const m = d.mevsim[k];
  return `
  <article class="season__card season__card--${k}">
    <figure><img src="${esc(m.gorsel)}" alt="${esc(m.baslik)}" loading="lazy" decoding="async" /></figure>
    <div class="season__body">
      <p class="season__when">${k === 'yaz' ? 'Üstünde' : 'Altında'} · değişim ${esc(m.zaman)}</p>
      <h3 class="season__name">${esc(m.baslik)}</h3>
      <p class="season__text">${esc(m.metin)}</p>
    </div>
  </article>`;
}).join('');

// Otel
$('[data-hotel-img]').src = d.otel.gorsel;
$('[data-hotel-title]').textContent = d.otel.baslik;
$('[data-hotel-text]').textContent = d.otel.metin;
$('[data-hotel-list]').innerHTML = d.otel.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

// Galeri
const galeri = d.galeri.filter((g) => !/\/jant-sari\.jpg$/.test(g.src));
$('[data-gallery]').innerHTML = (galeri.length ? galeri : d.galeri).map((g, i) => `
  <li class="shot shot--${i % 3}">
    <figure><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>
    <p class="shot__cap"><span>${String(i + 1).padStart(2, '0')}</span>${esc(g.alt)}</p>
  </li>`).join('');
$('[data-brands]').innerHTML = `<span class="brands__lbl">Stokta:</span> ` + d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true">/</i>');

// Yorumlar
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
const scoreTxt = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-score]').textContent = reducedMotion ? scoreTxt : '0,0';
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="review">
    <p class="review__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</p>
    <p class="review__text">${esc(y.metin)}</p>
    <p class="review__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></p>
  </li>`).join('');

// Saatler
const today = new Date().getDay();
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  const t = order.indexOf(today);
  const on = t >= a && t <= b;
  return `<div class="${on ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd>${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe src="${mapsEmbed(d)}" loading="lazy" title="${esc(d.isletme.ad)} konumu" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

$('[data-copy]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

const top = $('[data-top]');
addEventListener('scroll', () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.9), { passive: true });

// --- Hero maskesi ----------------------------------------------------------

const hero = $('[data-hero]');
const heroSvg = $('[data-hero-svg]');
const zoomG = $('[data-zoom]');
const w1 = $('[data-w1]'), w2 = $('[data-w2]'), probe = $('[data-probe]');
const geo = { W: 0, H: 0, ox: 0, oy: 0, smax: 60 };

function layoutHero() {
  const W = hero.clientWidth, H = hero.clientHeight;
  geo.W = W; geo.H = H;
  heroSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  heroSvg.setAttribute('width', W);
  heroSvg.setAttribute('height', H);
  for (const el of [$('[data-mask-bg]'), $('[data-paper]')]) {
    el.setAttribute('width', W); el.setAttribute('height', H);
  }
  const m = $('[data-mask]');
  m.setAttribute('width', W); m.setAttribute('height', H);

  const mobile = W < 700;
  const pad = mobile ? 14 : Math.max(40, W * 0.04);
  const avail = W - pad * 2;
  // Her satırı genişliğe sığdır: 100 birimlik ölçüde ölç, oranla büyüt
  const fit = (el, maxH) => {
    probe.textContent = el.textContent;
    probe.setAttribute('font-size', 100);
    const len = probe.getComputedTextLength() || 400;
    return Math.min((avail / len) * 100, maxH);
  };
  const f1 = fit(w1, H * (mobile ? 0.24 : 0.44));
  const f2 = mobile ? fit(w2, H * 0.30) : f1;
  const cap = 0.72; // Rubik büyük harf yüksekliği / font-size
  const gap = f1 * 0.08;
  const block = f1 * cap + gap + f2 * cap;
  // Mobilde harf bloğu + künye, üst bar ile ipucu arasında dikeyde ortalanır
  const labelsH = f2 * 0.14 + (H < 700 ? 90 : 215);
  const topY = mobile
    ? Math.max(130, 90 + (H - 230 - (block + labelsH)) / 2)
    : Math.max(H * 0.15, (H - block) / 2 + H * 0.01);
  const b1 = topY + f1 * cap;
  const b2 = b1 + gap + f2 * cap;
  w1.setAttribute('font-size', f1.toFixed(1)); w1.setAttribute('x', pad); w1.setAttribute('y', b1.toFixed(1));
  w2.setAttribute('font-size', f2.toFixed(1)); w2.setAttribute('y', b2.toFixed(1));
  w2.setAttribute('x', mobile ? pad : W - pad);
  w2.setAttribute('text-anchor', mobile ? 'start' : 'end');
  // Harf aralığını tam genişliğe yay (sağ kenar hizalı olsun)
  for (const [el, f] of (mobile ? [[w1, f1], [w2, f2]] : [[w1, f1]])) {
    probe.textContent = el.textContent;
    probe.setAttribute('font-size', f);
    const len = probe.getComputedTextLength();
    const n = el.textContent.length - 1;
    el.setAttribute('letter-spacing', n > 0 ? gsap.utils.clamp(-f * 0.02, f * 0.03, (avail - len) / n).toFixed(2) : 0);
  }
  // Yakınlaşma merkezi: İ'nin gövdesi (noktanın altı)
  probe.textContent = w1.textContent;
  probe.setAttribute('font-size', f1);
  probe.setAttribute('letter-spacing', w1.getAttribute('letter-spacing'));
  probe.setAttribute('x', pad); probe.setAttribute('y', b1);
  let ox = pad + avail * 0.7;
  try {
    const idx = w1.textContent.indexOf('İ');
    const ext = probe.getExtentOfChar(idx >= 0 ? idx : 3);
    ox = ext.x + ext.width / 2;
  } catch { /* yoksa tahmini merkez */ }
  geo.ox = ox;
  geo.oy = b1 - f1 * cap * 0.4;
  const stem = f1 * 0.2;
  geo.smax = (Math.hypot(W, H) * 1.25) / stem;
  const labels = $('[data-hero-labels]');
  labels.style.setProperty('--top', `${Math.round(topY)}px`);
  labels.style.setProperty('--below', `${Math.round(b2 + f2 * 0.14)}px`);
  // masaüstünde künye JANT'ın solundaki boşluğa oturur
  probe.textContent = w2.textContent; probe.setAttribute('font-size', f2); probe.setAttribute('letter-spacing', 0);
  labels.style.setProperty('--jant-left', `${Math.round(W - pad - probe.getComputedTextLength())}px`);
  labels.style.setProperty('--jant-base', `${Math.round(H - b2)}px`);
}

function setZoom(p) {
  // üstel yakınlaşma: her an aynı hızda dalıyormuş gibi hissettirir
  const s = Math.exp(Math.log(geo.smax) * p);
  const k = gsap.parseEase('power2.inOut')(p);
  const tx = geo.ox + (geo.W / 2 - geo.ox) * k;
  const ty = geo.oy + (geo.H / 2 - geo.oy) * k;
  zoomG.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-geo.ox.toFixed(2)} ${-geo.oy.toFixed(2)})`);
}

// --- Hareket --------------------------------------------------------------

const ready = document.fonts ? document.fonts.ready : Promise.resolve();
ready.then(() => {
  layoutHero();
  if (reducedMotion) {
    hero.classList.add('is-open');
    setDepth(3.2);
    return;
  }
  setZoom(0);
  motion();
});

function motion() {
  initSmoothScroll();
  const photo = $('[data-hero-photo]');
  const shade = $('[data-hero-shade]');
  const labels = $('[data-hero-labels]');
  const copy = $('[data-hero-copy]');

  // Açılış: harfler aşağıdan yükselir, fotoğraf harflerin içinde yavaşça oturur
  gsap.fromTo(photo, { scale: 1.5 }, { scale: 1.3, duration: 2.2, ease: 'power3.out' });
  gsap.from([w1, w2], { attr: { dy: 60 }, opacity: 0, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.1 });
  gsap.from($$('p', labels), { y: 16, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.55 });
  gsap.set(copy, { autoAlpha: 0, y: 40 });
  gsap.set(shade, { opacity: 0 });

  let svgOn = true;
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${innerHeight * 1.5}`,
    pin: true,
    scrub: true,
    onUpdate(self) {
      const p = self.progress;
      const z = gsap.utils.clamp(0, 1, p / 0.72);
      const on = z < 0.999;
      if (on !== svgOn) { heroSvg.style.visibility = on ? '' : 'hidden'; svgOn = on; }
      if (on) setZoom(z);
      gsap.set(photo, { scale: 1.3 - 0.3 * gsap.parseEase('power2.out')(z) });
      labels.style.opacity = String(Math.max(0, 1 - p * 6));
      const c = gsap.utils.clamp(0, 1, (p - 0.66) / 0.3);
      shade.style.opacity = String(c);
      gsap.set(copy, { autoAlpha: c, y: 40 * (1 - c) });
      top.classList.toggle('is-dark', p > 0.5);
    },
    onRefresh: () => layoutHero(),
  });

  // Hizmet satırları
  gsap.utils.toArray('.svc__item').forEach((row, i) => {
    gsap.from(row, {
      y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: row, start: 'top 90%', once: true },
    });
    ScrollTrigger.create({
      trigger: row, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => self.isActive && setSvc(i),
    });
  });

  // Sayaçlar ve çubuklar
  ScrollTrigger.create({
    trigger: '.stats', start: 'top 75%', once: true,
    onEnter: () => {
      $$('[data-count]').forEach((el, i) => {
        const o = { v: 0 };
        const to = Number(el.dataset.count);
        gsap.to(o, { v: to, duration: 1.6, delay: i * 0.1, ease: 'power3.out', onUpdate: () => (el.textContent = nf(o.v)) });
      });
      $('.stats').classList.add('is-in');
    },
  });

  // Diş derinliği: görünce 8 mm'den 3,2 mm'ye aşınır (kullanıcı dokunmadıysa)
  ScrollTrigger.create({
    trigger: depthSec, start: 'top 55%', once: true,
    onEnter: () => {
      if (userTouched) return;
      const o = { v: 8 };
      gsap.to(o, {
        v: 3.2, duration: 2.4, ease: 'power2.inOut',
        onUpdate: () => { if (!userTouched) { setDepth(o.v); range.value = Math.round(o.v * 10); } },
      });
    },
  });

  // Süreç rayı
  gsap.fromTo('[data-rail]', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-steps-list]', start: 'top 70%', end: 'bottom 70%', scrub: true },
  });
  $$('.step').forEach((s) => ScrollTrigger.create({
    trigger: s, start: 'top 70%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on'),
  }));

  // Fotoğraflar: kırpılarak açılır
  gsap.utils.toArray('.season__card figure, .hotel__media, .steps__photo').forEach((f) => {
    gsap.fromTo(f, { clipPath: 'inset(12% 12% 12% 12% round 28px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: f, start: 'top 85%', once: true },
    });
  });
  gsap.to('.hotel__media img', {
    yPercent: 10, ease: 'none',
    scrollTrigger: { trigger: '.hotel', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Puan
  ScrollTrigger.create({
    trigger: '.reviews', start: 'top 70%', once: true,
    onEnter: () => {
      const o = { v: 0 };
      const el = $('[data-score]');
      gsap.to(o, { v: d.puan.ortalama, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = mmf(o.v)) });
    },
  });

  gsap.fromTo('[data-wheel]', { rotation: -40 }, {
    rotation: 50, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  gsap.from('.final__title', {
    yPercent: 30, opacity: 0, duration: 1, ease: 'power4.out',
    scrollTrigger: { trigger: '.final', start: 'top 75%', once: true },
  });

  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastW) return;
    lastW = innerWidth;
    layoutHero();
  });
}

