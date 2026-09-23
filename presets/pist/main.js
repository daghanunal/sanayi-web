import raw from '../../data/pist.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWheel } from './tire.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const isMobile = () => innerWidth < 900;

// "2004'ten", "1998'den", "2010'dan": sayının okunuşunun son hecesine göre ek
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  const suf = u ? units[u] : t ? tens[t] : 'den';
  return `${n}'${suf}`;
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
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

$('[data-since]').textContent = `${ablative(d.isletme.kurulus)} beri Şaşmaz'da`;

// Başlık: kelime başına satır, "&" kendinden sonraki kelimeyle aynı satırda
const words = d.isletme.ad.split(/\s+/).reduce((acc, w) => {
  if (acc.length && acc.at(-1) === '&') acc[acc.length - 1] += ` ${w}`;
  else acc.push(w);
  return acc;
}, []);
$('[data-hero-title]').innerHTML = words.map((w) => `<span class="line"><span>${esc(w.toLocaleUpperCase('tr'))}</span></span>`).join('');

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;

$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="svc">
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</p>
  </li>`).join('');

// Göstergeler
const stats = d.istatistikler.map((s) => ({
  ...s,
  deger: s.deger === 'kurulus' ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
buildGaugeSvg($('[data-gauge-svg]'));
$('[data-gauge-list]').innerHTML = stats
  .map((s) => `<li><span class="sr-only">${nf(s.deger)}${s.sonek} ${esc(s.etiket)}</span></li>`).join('');

function buildGaugeSvg(svg) {
  const R = 200, start = -225, sweep = 270;
  const pt = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return [(Math.cos(a) * r).toFixed(2), (Math.sin(a) * r).toFixed(2)];
  };
  const arc = (from, to, r) => {
    const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r);
    return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  let ticks = '';
  for (let i = 0; i <= 50; i++) {
    const deg = start + (sweep * i) / 50;
    const major = i % 5 === 0;
    const [x1, y1] = pt(deg, R - (major ? 34 : 16));
    const [x2, y2] = pt(deg, R - 4);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${major ? 5 : 2}" ${i >= 43 ? 'stroke="var(--kirmizi)"' : ''}/>`;
  }
  svg.innerHTML = `
    <path d="${arc(start, start + sweep, R)}" fill="none" stroke="#141416" stroke-width="6"/>
    <path d="${arc(start + sweep * 0.86, start + sweep, R - 14)}" fill="none" stroke="var(--kirmizi)" stroke-width="22"/>
    <g stroke="#141416">${ticks}</g>`;
}

// Pit stop adımları
const mins = d.surec.map((s) => parseInt(s.sure, 10) || 1);
const totalMin = mins.reduce((a, b) => a + b, 0);
$('[data-pit-track]').innerHTML = d.surec.map((s, i) => `
  <article class="step">
    <p class="step__no" aria-hidden="true">${i + 1}</p>
    <p class="step__time">${esc(s.sure)}</p>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__desc">${esc(s.aciklama)}</p>
  </article>`).join('');
$('.pit__clock small').textContent = `toplam ${totalMin} dakika`;

// Mevsim
const season = $('.season');
for (const key of ['yaz', 'kis']) {
  const img = $(`[data-season-img="${key}"]`);
  img.src = d.mevsim[key].gorsel;
  img.alt = d.mevsim[key].baslik;
}
const temps = { yaz: 24, kis: -3 };
function setSeason(key, animate = true) {
  const m = d.mevsim[key];
  season.dataset.season = key;
  $$('[data-season-btn]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.seasonBtn === key)));
  $('[data-season-title]').textContent = m.baslik;
  $('[data-season-text]').textContent = m.metin;
  $('[data-season-when]').textContent = m.zaman;
  const kis = $('[data-season-img="kis"]');
  const temp = $('[data-temp]');
  const to = temps[key];
  if (!animate || reducedMotion) {
    kis.style.clipPath = key === 'kis' ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)';
    temp.textContent = `${to}°C`;
    return;
  }
  gsap.to(kis, { clipPath: key === 'kis' ? 'inset(0 0 0 0%)' : 'inset(0 0 0 100%)', duration: 0.8, ease: 'power3.inOut' });
  const o = { t: parseInt(temp.textContent, 10) || 0 };
  gsap.to(o, { t: to, duration: 0.8, ease: 'power2.out', onUpdate: () => (temp.textContent = `${Math.round(o.t)}°C`) });
}
$$('[data-season-btn]').forEach((b) => b.addEventListener('click', () => setSeason(b.dataset.seasonBtn)));
// Ekim-Mart arası kış lastiği önerisiyle aç
const month = new Date().getMonth();
setSeason(month >= 9 || month <= 2 ? 'kis' : 'yaz', false);

// Otel
$('[data-hotel-img]').src = d.otel.gorsel;
$('[data-hotel-title]').textContent = d.otel.baslik;
$('[data-hotel-text]').textContent = d.otel.metin;
$('[data-hotel-list]').innerHTML = d.otel.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

// Galeri: 3 sütun
const cols = [[], [], []];
d.galeri.forEach((g, i) => cols[i % 3].push(g));
$('[data-gallery]').innerHTML = cols.map((c) => `
  <div class="gallery__col">${c.map((g) => `<figure><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></figure>`).join('')}</div>`).join('');

// Kayan yazılar
const marqueeWords = $('[data-marquee-words]');
fillMarquee(marqueeWords, marqueeWords.dataset.marqueeWords.split('|'));
fillMarquee($('[data-brands]'), d.markalar);
function fillMarquee(track, items) {
  const set = items.map((w) => `<span>${esc(w)}</span>`).join('');
  track.innerHTML = set + set + set + set;
}

// Yorumlar
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="review">
    <p class="review__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</p>
    <p class="review__text">${esc(y.metin)}</p>
    <p class="review__who"><strong>${esc(y.ad)}</strong>, ${esc(y.arac)}</p>
  </li>`).join('');

// Saatler
const today = new Date().getDay();
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const range = days.split(' – ');
  const first = GUN.indexOf(range[0]), last = GUN.indexOf(range.at(-1));
  const order = [1, 2, 3, 4, 5, 6, 0];
  const isToday = order.indexOf(today) >= order.indexOf(first) && order.indexOf(today) <= order.indexOf(last);
  return `<dt class="${isToday ? 'is-today' : ''}">${days}</dt><dd class="${isToday ? 'is-today' : ''}">${val}</dd>`;
}).join('');

// Harita: yaklaşınca yükle
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe src="${mapsEmbed(d)}" loading="lazy" title="${esc(d.isletme.ad)} konumu" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

$('[data-copy]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Tekerler: yanak yazısı işletme adı
const sidewall = `${d.isletme.ad}  ◆  Şaşmaz  ◆  ${d.isletme.kurulus}`.toLocaleUpperCase('tr');
const heroWheel = createWheel($('[data-hero-wheel]'), { sidewall });
const finalWheel = createWheel($('[data-final-wheel]'), { sidewall });

// Işıklar: açıksa yeşil, kapalıysa kırmızı
const lights = $('[data-lights]');
const bulbs = $$('i', lights);
function runLights() {
  lights.classList.add('is-red');
  if (reducedMotion) {
    bulbs.forEach((b) => b.classList.add('on'));
    lights.classList.toggle('is-green', status.open);
    lights.classList.toggle('is-red', !status.open);
    return;
  }
  bulbs.forEach((b, i) => setTimeout(() => b.classList.add('on'), 250 + i * 320));
  setTimeout(() => {
    if (status.open) {
      lights.classList.remove('is-red');
      lights.classList.add('is-green');
    }
  }, 250 + 5 * 320 + 400);
}

// Üst çubuk
const top = $('[data-top]');
const onScrollTop = (y) => top.classList.toggle('is-solid', y > 40);
addEventListener('scroll', () => onScrollTop(scrollY), { passive: true });

// --- Hareket --------------------------------------------------------------

if (reducedMotion) {
  $('[data-hint]').hidden = true;
  heroWheel.set(-12);
  finalWheel.set(20);
  showGauge(0, 1);
  new IntersectionObserver((e, io) => e[0].isIntersecting && (runLights(), io.disconnect())).observe(lights);
} else {
  motion();
}

function showGauge(i, t) {
  const s = stats[i];
  const needle = $('[data-needle]');
  const ratio = Math.min(s.deger / s.max, 1) * t;
  needle.style.transform = `rotate(${-225 + 270 * ratio}deg)`;
  $('[data-gauge-value]').textContent = nf(s.deger * t) + (t > 0.98 ? s.sonek : '');
  $('[data-gauge-label]').textContent = s.etiket;
  $$('[data-gauge-list] li').forEach((li, j) => li.classList.toggle('is-on', j === i));
}

function motion() {
  const lenis = initSmoothScroll();
  const hero = $('[data-hero]');
  const wheelEl = heroWheel.el;
  const skid = $('[data-skid]');
  const road = $('[data-road]');
  const lines = $$('.hero__lines i');

  // Hero yuvarlanma durumu
  const state = { rollX: 0, intro: 0, spin: 0, vel: 0 };
  let radius = wheelEl.offsetWidth / 2;
  let travel = 0;
  const measure = () => {
    radius = wheelEl.offsetWidth / 2;
    const rect = wheelEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - (gsap.getProperty(wheelEl, 'x') || 0);
    travel = cx + radius * 1.15;
    skid.style.right = `${innerWidth - cx}px`;
    skid.style.width = `${travel}px`;
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', () => gsap.set(wheelEl, { x: 0 }));
  ScrollTrigger.addEventListener('refresh', measure);

  // Açılış: teker sağdan yuvarlanarak gelir, başlık satırları yükselir
  const introFrom = innerWidth * 0.7;
  state.intro = introFrom;
  gsap.to(state, { intro: 0, duration: 1.6, ease: 'power3.out', delay: 0.15 });
  gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.09, delay: 0.35 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta'], { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.8 });

  // Hero pin: teker sola yuvarlanır, arkasında iz kalır
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${innerHeight * (isMobile() ? 0.8 : 1)}`,
    pin: true,
    scrub: true,
    onUpdate(self) {
      const p = self.progress;
      state.rollX = -travel * gsap.parseEase('power1.in')(p);
      skid.style.transform = `scaleX(${(-state.rollX / travel).toFixed(4)})`;
    },
  });
  gsap.to('.hero__copy', {
    yPercent: -12, opacity: 0.15, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${innerHeight}`, scrub: true },
  });

  // Hız çizgileri, kayan yazılar ve teker aynı tick'ten beslenir
  const marquees = $$('[data-marquee]').map((m) => ({
    track: $('.marquee__track', m), dir: Number(m.dataset.marquee), x: 0, skew: 0,
  }));
  let lastY = scrollY;
  let finalAngle = 0;
  let idle = 0;

  gsap.ticker.add((time, dtMs) => {
    const dt = Math.min(dtMs, 50) / 1000;
    const y = lenis ? lenis.scroll : scrollY;
    const rawVel = lenis ? lenis.velocity : (y - lastY);
    lastY = y;
    state.vel += (rawVel - state.vel) * 0.18;
    const speed = Math.min(Math.abs(state.vel) / 45, 1);

    // Hero tekeri: yuvarlanma açısı + patinaj (scroll hızı) + boşta hafif dönüş
    idle += dt * 14;
    state.spin -= state.vel * 0.55;
    const x = state.rollX + state.intro;
    const rollAngle = (x / radius) * (180 / Math.PI);
    if (y < innerHeight * 2.2) {
      wheelEl.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      heroWheel.set(rollAngle + state.spin - idle, speed * 1.3 + Math.min(state.intro / introFrom, 1) * 0.6);
      lines.forEach((l, i) => {
        const s = Math.min(speed * (0.6 + (i % 3) * 0.25) + (state.intro / introFrom) * 0.8, 1);
        l.style.transform = `scaleX(${s.toFixed(3)})`;
        l.style.opacity = s.toFixed(3);
      });
      road.style.backgroundPosition = `${(x * 1.4).toFixed(1)}px 0`;
    }

    // Final tekeri
    finalAngle += (state.vel * 0.6 + 8 * dt * 60 * 0.05);
    finalWheel.set(finalAngle, speed);

    // Kayan yazılar: hızla birlikte hızlanır ve eğilir
    for (const m of marquees) {
      const half = m.track.scrollWidth / 2;
      m.x -= (60 * dt + Math.abs(state.vel) * 0.6) * m.dir * Math.sign(state.vel || 1);
      if (half) m.x = ((m.x % half) - half) % half;
      const targetSkew = gsap.utils.clamp(-16, 16, -state.vel * 0.35);
      m.skew += (targetSkew - m.skew) * 0.12;
      m.track.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0) skewX(${m.skew.toFixed(2)}deg)`;
    }
  });

  // Hizmet satırları: yan kayarak gelir
  gsap.utils.toArray('.svc').forEach((row) => {
    gsap.from(row, {
      xPercent: 12, skewX: -10, opacity: 0, duration: 0.9, ease: 'power4.out',
      scrollTrigger: { trigger: row, start: 'top 88%', once: true },
    });
  });

  // Gösterge: pin, ibre her rakamda yükselip bekler
  const gauge = $('[data-gauge]');
  showGauge(0, 0);
  ScrollTrigger.create({
    trigger: gauge,
    start: 'top top',
    end: () => `+=${innerHeight * stats.length * 0.7}`,
    pin: true,
    scrub: true,
    onUpdate(self) {
      const p = self.progress * stats.length;
      const i = Math.min(Math.floor(p), stats.length - 1);
      const local = Math.min((p - i) / 0.6, 1);
      showGauge(i, gsap.parseEase('power3.out')(local));
    },
  });

  // Pit stop: yatay kayma + kronometre
  const pit = $('[data-pit]');
  const track = $('[data-pit-track]');
  const clock = $('[data-pit-clock]');
  const bar = $('[data-pit-bar]');
  const steps = $$('.step', track);
  const bounds = mins.reduce((acc, m) => [...acc, (acc.at(-1) || 0) + m / totalMin], []);
  gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: pit,
      start: 'top top',
      end: () => `+=${track.scrollWidth - innerWidth + innerHeight * 0.3}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const p = self.progress;
        const secs = p * totalMin * 60;
        clock.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
        bar.style.transform = `scaleX(${p})`;
        const active = bounds.findIndex((b) => p <= b + 0.0001);
        steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
      },
    },
  });

  // Otel: fotoğraf parallax, başlık harfleri
  gsap.to('.hotel__media', {
    yPercent: 14, ease: 'none',
    scrollTrigger: { trigger: '.hotel', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  document.fonts.ready.then(() => {
    const split = SplitText.create('.hotel__title', { type: 'chars', mask: 'chars' });
    gsap.from(split.chars, {
      yPercent: 110, duration: 0.9, ease: 'power4.out', stagger: 0.035,
      scrollTrigger: { trigger: '.hotel__title', start: 'top 85%', once: true },
    });
    ScrollTrigger.refresh();
  });

  // Galeri sütunları farklı hızlarda
  $$('.gallery__col').forEach((col, i) => {
    gsap.fromTo(col, { yPercent: [6, -4, 10][i] }, {
      yPercent: [-10, 8, -16][i], ease: 'none',
      scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Puan sayacı
  const score = $('[data-score]');
  const target = d.puan.ortalama;
  ScrollTrigger.create({
    trigger: '.reviews', start: 'top 70%', once: true,
    onEnter: () => {
      const o = { v: 0 };
      gsap.to(o, {
        v: target, duration: 1.4, ease: 'power3.out',
        onUpdate: () => (score.textContent = o.v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })),
      });
    },
  });

  ScrollTrigger.create({ trigger: lights, start: 'top 80%', once: true, onEnter: runLights });

  // Final başlığı
  gsap.from('.final__title', {
    xPercent: -8, skewX: 12, opacity: 0, duration: 1, ease: 'power4.out',
    scrollTrigger: { trigger: '.final', start: 'top 70%', once: true },
  });
}
