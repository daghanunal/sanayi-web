import raw from '../../data/showroom.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => Number(n).toLocaleString('tr-TR');
const isMobile = () => innerWidth < 900;

// "2008'den", "1994'ten", "1990'dan": sayının okunuşundaki son kelimeye göre ayrılma eki
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  if (n % 10) return `${n}'${birler[n % 10]}`;
  if (n % 100) return `${n}'${onlar[(n % 100) / 10]}`;
  return `${n}'den`; // yüz, bin
}

// --- Metin ve linkler ------------------------------------------------------
const fotoMesaj = 'Merhaba, aracımın fotoğraflarını gönderiyorum. Fiyat alabilir miyim?';
const binds = {
  ad: d.isletme.ad,
  slogan: d.isletme.slogan,
  hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon,
  adres: d.iletisim.adres,
  garanti: d.garanti,
  since: `Şaşmaz'da ${ablative(d.isletme.kurulus)} beri`,
  copy: `© ${new Date().getFullYear()} ${d.isletme.ad}`,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
const hrefs = { tel: telHref(d), 'wa-foto': waHref(d, fotoMesaj), maps: mapsHref(d) };
$$('[data-href]').forEach((el) => (el.href = hrefs[el.dataset.href]));
$$('[data-icon]').forEach((el) => el.outerHTML = icons[el.dataset.icon]);
$('.top__call').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

function refreshStatus() {
  const s = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.textContent = s.text;
    el.classList.toggle('is-open', s.open);
  });
  $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Hizmetler ---------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc" data-i="${i}">
    ${h.gorsel ? `<div class="svc__thumb"><img src="${h.gorsel}" alt="" loading="lazy" /></div>` : ''}
    <h3 class="svc__title">${esc(h.baslik)}</h3>
    <div class="svc__meta">
      <p class="svc__desc">${esc(h.aciklama)}</p>
      ${h.sure ? `<span class="svc__time">${esc(h.sure)}</span>` : ''}
    </div>
  </li>`).join('');
$('[data-service-frame]').innerHTML = d.hizmetler
  .map((h, i) => (h.gorsel ? `<img src="${h.gorsel}" alt="" data-i="${i}" loading="lazy" />` : ''))
  .join('');

function setService(i) {
  $$('.svc').forEach((el) => el.classList.toggle('is-active', Number(el.dataset.i) === i));
  const imgs = $$('[data-service-frame] img');
  const target = imgs.find((im) => Number(im.dataset.i) === i);
  if (target) imgs.forEach((im) => im.classList.toggle('is-active', im === target));
}
setService(0);

// --- Rakamlar ----------------------------------------------------------------
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-stats]').innerHTML = d.istatistikler.map((s) => {
  const v = s.deger === 'kurulustan' ? yil : s.deger;
  return `<div class="stat"><dt>${esc(s.etiket)}</dt><dd><span data-count="${v}">${fmt(v)}</span>${esc(s.sonek || '')}</dd></div>`;
}).join('');

// --- Galeri ------------------------------------------------------------------
$('[data-gallery]').insertAdjacentHTML('beforeend', d.galeri.map((g) => `
  <figure class="shot">
    <div class="shot__img"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" /></div>
    <figcaption><b>${esc(g.baslik)}</b><span>${esc(g.detay || '')}</span></figcaption>
  </figure>`).join(''));

// --- Karşılaştırma -----------------------------------------------------------
const box = $('[data-compare]');
const range = $('#compare-range');
const pairs = d.oncesiSonrasi || [];
function showPair(i) {
  const p = pairs[i];
  const before = $('.compare__img--before', box);
  const after = $('.compare__img--after', box);
  before.src = p.once; before.alt = `${p.baslik}, işlem öncesi`;
  after.src = p.sonra; after.alt = `${p.baslik}, işlem sonrası`;
  $$('.compare__tab').forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
}
if (pairs.length) {
  $('[data-compare-tabs]').innerHTML = pairs.length > 1
    ? pairs.map((p, i) => `<button class="compare__tab" role="tab" type="button" aria-selected="false">${esc(p.baslik)}</button>`).join('')
    : '';
  $$('.compare__tab').forEach((t, i) => t.addEventListener('click', () => showPair(i)));
  showPair(0);
  range.addEventListener('input', () => box.style.setProperty('--c', `${range.value}%`));
} else {
  $('.compare').remove();
}

// --- Süreç -------------------------------------------------------------------
$('[data-process]').insertAdjacentHTML('beforeend', (d.surec || []).map((s) => `
  <li class="step"><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join(''));

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => icons.star.replace('<svg', `<svg class="${i < n ? '' : 'off'}"`)).join('');
if (d.puan) {
  $('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
  $('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
  $('[data-stars]').setAttribute('aria-hidden', 'true');
  $('[data-score-text]').textContent = `Google'daki ${fmt(d.puan.adet)} yorumun ortalaması`;
}
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="review">
    <div class="review__stars" role="img" aria-label="5 üzerinden ${y.puan} yıldız">${stars(y.puan)}</div>
    <blockquote>${esc(y.metin)}</blockquote>
    <footer><b>${esc(y.ad)}</b><span>${esc(y.arac || '')}</span></footer>
  </li>`).join('');

// --- Markalar ----------------------------------------------------------------
const row = `<div class="brands__row">${d.markalar.map((m) => `<span class="brand" data-name="${esc(m)}">${esc(m)}</span>`).join('')}</div>`;
$('[data-brands]').innerHTML = row + row.replace('class="brands__row"', 'class="brands__row" aria-hidden="true"');

// --- Saatler -----------------------------------------------------------------
{
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups = [];
  for (const g of order) {
    const last = groups.at(-1);
    if (last && last.value === d.saatler[g]) last.days.push(g);
    else groups.push({ days: [g], value: d.saatler[g] });
  }
  const today = new Date().getDay();
  $('[data-hours] tbody').innerHTML = groups.map(({ days, value }) => {
    const label = days.length > 1 ? `${GUNLER[days[0]]} – ${GUNLER[days.at(-1)]}` : GUNLER[days[0]];
    return `<tr class="${days.includes(today) ? 'is-today' : ''}"><td>${label}</td><td>${value ? value.replace('-', ' – ') : 'Kapalı'}</td></tr>`;
  }).join('');
}

// --- Harita (yaklaşınca yüklenir) -----------------------------------------------
{
  const map = $('[data-map]');
  const load = () => {
    if (map.querySelector('iframe')) return;
    map.insertAdjacentHTML('beforeend', `<iframe src="${mapsEmbed(d)}" title="${esc(d.isletme.ad)} konumu" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`);
    $('[data-map-load]', map)?.remove();
  };
  $('[data-map-load]', map).addEventListener('click', load);
  new IntersectionObserver((entries, io) => {
    if (entries.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
  }, { rootMargin: '300px' }).observe(map);
}

// =============================================================================
// Hareket
// =============================================================================
const lenis = initSmoothScroll();

// Header: aşağı kayınca gizlen, yukarı kayınca gel
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => $('.top').classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 240),
});

if (reducedMotion) {
  $('[data-meter]').textContent = `${d.parlaklik?.once ?? 38} → ${d.parlaklik?.sonra ?? 94}`;
  $('[data-meter-bar]').style.transform = `scaleX(${(d.parlaklik?.sonra ?? 94) / 100})`;
  $$('.svc').forEach((el) => el.classList.add('is-active'));
} else {
  document.fonts.ready.then(runMotion);
}

function runMotion() {
  // --- Hero: tek seferlik açılış -------------------------------------------
  const split = SplitText.create('.hero__title', { type: 'lines', linesClass: 'line', mask: 'lines' });
  const heroTl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  heroTl
    .from('.hero__img', { scale: 1.2, filter: 'brightness(.25)', duration: 2.4 }, 0)
    .from(split.lines, { yPercent: 115, duration: 1.2, stagger: 0.09 }, 0.25)
    .fromTo('.hero__sweep', { xPercent: -60 }, { xPercent: 60, duration: 1.8, ease: 'power2.inOut' }, 0.7)
    .to(split.lines, { backgroundPosition: '0% 0', duration: 1.8, ease: 'power2.inOut', stagger: 0.08 }, 0.7)
    .from(['.hero__kicker', '.hero__lead', '.hero__actions', '.hero .status'], { y: 24, autoAlpha: 0, duration: 1, stagger: 0.07 }, 0.55)
    .from('.top', { autoAlpha: 0, duration: 1 }, 0.9);

  gsap.to('.hero__img', {
    yPercent: 14, scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__content', {
    y: -80, autoAlpha: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: '35% top', end: 'bottom top', scrub: true },
  });

  // --- İmza: pinli önce/sonra ------------------------------------------------
  const stage = $('.reveal__stage');
  const meter = { v: d.parlaklik?.once ?? 38 };
  const meterEnd = d.parlaklik?.sonra ?? 94;
  const meterEl = $('[data-meter]');
  const meterBar = $('[data-meter-bar]');
  const drawMeter = () => {
    meterEl.textContent = Math.round(meter.v);
    meterBar.style.transform = `scaleX(${meter.v / 100})`;
  };
  drawMeter();
  gsap.set('.reveal__label--after', { autoAlpha: 0, y: 16 });
  gsap.set('.reveal__hud', { autoAlpha: 0 });

  const rtl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.reveal', start: 'top top', end: '+=260%', pin: true, scrub: 0.7, anticipatePin: 1 },
  });
  rtl
    .fromTo('.reveal__intro', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -50, duration: 0.14 }, 0.02)
    .to('.reveal__hud', { autoAlpha: 1, duration: 0.08 }, 0.1)
    .fromTo(stage, { '--p': -0.06 }, { '--p': 1.06, duration: 0.72, ease: 'power1.inOut' }, 0.16)
    .to(meter, { v: meterEnd, duration: 0.72, ease: 'power1.inOut', onUpdate: drawMeter }, 0.16)
    .to('.reveal__label--before', { autoAlpha: 0, y: -16, duration: 0.08 }, 0.5)
    .to('.reveal__label--after', { autoAlpha: 1, y: 0, duration: 0.08 }, 0.54)
    .fromTo('.reveal__img', { scale: 1.1 }, { scale: 1, duration: 0.9 }, 0)
    .fromTo(stage, { '--seam-o': 1 }, { '--seam-o': 0, duration: 0.06 }, 0.88)
    .to({}, { duration: 0.06 });

  // --- Hizmetler: aktif satır genişler, görsel değişir ------------------------
  $$('.svc').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 60%', end: 'bottom 60%',
      onToggle: (self) => self.isActive && setService(Number(el.dataset.i)),
    });
  });

  // --- Kabin ışıkları: floresan gibi titreyerek yanar ----------------------------
  $$('.booth-lights').forEach((group) => {
    const tubes = $$('i', group);
    gsap.set(tubes, { autoAlpha: 0.08 });
    ScrollTrigger.create({
      trigger: group, start: 'top 85%', once: true,
      onEnter: () => {
        tubes.forEach((t, i) => {
          gsap.timeline({ delay: i * 0.18 })
            .to(t, { autoAlpha: 1, duration: 0.04 })
            .to(t, { autoAlpha: 0.15, duration: 0.05 })
            .to(t, { autoAlpha: 0.9, duration: 0.03, delay: 0.08 })
            .to(t, { autoAlpha: 0.3, duration: 0.04, delay: 0.04 })
            .to(t, { autoAlpha: 1, duration: 0.2 });
        });
      },
    });
  });

  // --- Hakkında metni: kelime kelime aydınlanır ------------------------------------
  const about = SplitText.create('.trust__about', { type: 'words', wordsClass: 'w' });
  gsap.to(about.words, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.trust__about', start: 'top 85%', end: 'bottom 50%', scrub: true },
  });

  // Rakamlar sayarak gelir
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'power3.out',
      onUpdate: () => (el.textContent = fmt(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  // --- Galeri: yatay kayan şerit -----------------------------------------------
  const track = $('[data-gallery]');
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  const htween = gsap.to(track, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: {
      trigger: '.gallery', start: 'top top', end: () => `+=${distance()}`,
      pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (self) => gsap.set('[data-gallery-progress]', { scaleX: self.progress }),
    },
  });
  $$('.shot').forEach((shot) => {
    gsap.fromTo($('img', shot), { xPercent: 6 }, {
      xPercent: -6, ease: 'none',
      scrollTrigger: { trigger: shot, containerAnimation: htween, start: 'left right', end: 'right left', scrub: true },
    });
    gsap.fromTo($('.shot__img', shot), { '--gp': '100%' }, {
      '--gp': '0%', ease: 'none',
      scrollTrigger: { trigger: shot, containerAnimation: htween, start: 'left 90%', end: 'right 10%', scrub: true },
    });
  });

  // --- Karşılaştırma: bir kez sürüklenebilir olduğunu gösterir -----------------------
  if (pairs.length) {
    const c = { v: 50 };
    const apply = () => { box.style.setProperty('--c', `${c.v}%`); range.value = c.v; };
    gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 70%', once: true } })
      .to(c, { v: 22, duration: 0.8, ease: 'power2.inOut', onUpdate: apply })
      .to(c, { v: 78, duration: 1.1, ease: 'power2.inOut', onUpdate: apply })
      .to(c, { v: 50, duration: 0.8, ease: 'power2.inOut', onUpdate: apply });
  }

  // --- Süreç: ray dolar, numaralar dolar -----------------------------------------
  gsap.to('.process__rail i', {
    [isMobile() ? 'scaleY' : 'scaleX']: 1, ease: 'none',
    scrollTrigger: { trigger: '.process__list', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 72%', onEnter: () => el.classList.add('is-done'), onLeaveBack: () => el.classList.remove('is-done') });
  });

  // --- Markalar: scroll hızına göre hızlanan kayan yazı ---------------------------
  const marquee = gsap.to('.brands__row', { xPercent: -100, duration: 28, ease: 'none', repeat: -1 });
  let boost = gsap.quickTo(marquee, 'timeScale', { duration: 0.6, ease: 'power3.out' });
  ScrollTrigger.create({
    trigger: '.brands', start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => {
      const v = self.getVelocity() / 300;
      boost(1 + Math.min(Math.abs(v), 6) * Math.sign(v || 1));
      clearTimeout(boost.t);
      boost.t = setTimeout(() => boost(1), 150);
    },
  });

  // Son çağrı başlığı
  const cta = SplitText.create('.cta__title', { type: 'lines', linesClass: 'line', mask: 'lines' });
  gsap.from(cta.lines, {
    yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '.cta__title', start: 'top 80%', once: true },
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

export { lenis };
