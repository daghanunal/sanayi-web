// Tork: Kinetik aile. 3D yok; sayfa bir dinamometre çıktısı gibi kaydırdıkça çizilir.
import garaj from '../../data/garaj.json';
import ek from '../../data/tork.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { tonDen, devirEgrisi } from './dyno.js';

gsap.registerPlugin(SplitText);

const d = boot({ ...garaj, ...ek, preset: 'tork' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const yil = d.isletme.kurulus;
const yillar = new Date().getFullYear() - yil;
const upper = (s) => s.toLocaleUpperCase('tr-TR');

// --- Metin ve bağlantılar -------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-since]').textContent = `Şaşmaz Oto Sanayi'nde ${yil}${tonDen(yil)} beri`;
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-years]').textContent = yillar;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = `Onayınız olmadan tek parça değişmez. ${d.garanti}`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$('[data-kelime-img]').src = d.kelimeGorsel;
$('[data-hiz-img]').src = d.hizGorsel;

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

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`)
  .join('');

// Harita yaklaşınca yüklenir.
const mapEl = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries[0].isIntersecting) return;
    mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(mapEl);

// --- Tabela: harfler bölünmüş kart (split-flap) gibi dönerek yerine oturur ----

const board = $('[data-board]');
const kelimeler = upper(d.isletme.ad).split(/\s+/).filter(Boolean);
board.setAttribute('aria-label', d.isletme.ad);
board.style.setProperty('--n', Math.max(...kelimeler.map((k) => [...k].length), 5));
board.innerHTML = kelimeler
  .map((k) => `<span class="board__row">${[...k].map((c) => `<span class="tile" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</span>`)
  .join('');

function tabelaCevir() {
  const tiles = $$('.tile', board);
  const HARF = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789';
  const plan = tiles.map((t, i) => ({ t, kalan: 5 + ((i * 7) % 6), sonraki: 120 + i * 45 }));
  const start = performance.now();
  const tick = (now) => {
    const el = now - start;
    let bitmedi = false;
    for (const p of plan) {
      if (p.kalan < 0) continue;
      bitmedi = true;
      if (el < p.sonraki) continue;
      p.t.textContent = p.kalan === 0 ? p.t.dataset.c : HARF[(Math.random() * HARF.length) | 0];
      p.t.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)' }, { transform: 'scaleY(1)' }], { duration: 70 });
      p.kalan -= 1;
      p.sonraki = el + 60;
    }
    if (bitmedi) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// --- Dev kelime ---------------------------------------------------------------

const kelimeEl = $('[data-kelime]');
kelimeEl.innerHTML = [...upper(d.kelime)].map((c) => `<span>${esc(c)}</span>`).join('');

function kelimeBoyutla() {
  kelimeEl.style.fontSize = '100px';
  const w = kelimeEl.getBoundingClientRect().width;
  const hedef = Math.min(innerWidth * 0.92, innerHeight * 1.9);
  kelimeEl.style.fontSize = `${(100 * hedef) / w}px`;
}
kelimeBoyutla();

// --- İstatistik: kilometre sayacı gibi dönen haneler -------------------------

function sayacHTML(n) {
  return [...nf.format(n)]
    .map((c) =>
      /\d/.test(c)
        ? `<span class="hane"><span class="hane__serit" data-d="${c}">${'0123456789'.split('').map((x) => `<span>${x}</span>`).join('')}</span></span>`
        : `<span class="hane__ayrac">${c}</span>`
    )
    .join('');
}
$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const v = i === 0 && /yıl/.test(s.etiket) ? yillar : s.deger;
    return `<div class="sayac__kalem"><dd class="odo" aria-label="${nf.format(v)}${esc(s.sonek)}">${sayacHTML(v)}<span class="odo__sonek">${esc(s.sonek)}</span></dd><dt>${esc(s.etiket)}</dt></div>`;
  })
  .join('');

// --- Hizmetler ----------------------------------------------------------------

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h) => `
    <li class="hizmet">
      <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
      <p class="hizmet__metin">${esc(h.aciklama)}</p>
      <span class="hizmet__sure">${esc(h.sure)}</span>
    </li>`
  )
  .join('');

// --- Süreç: her adım bir devir noktası -----------------------------------------

$('[data-steps]').innerHTML = d.surec
  .map(
    (s, i) => `
    <li class="adim">
      <span class="adim__devir" data-devir="${d.surecDevir[i] ?? (i + 1) * 1500}">${nf.format(d.surecDevir[i] ?? (i + 1) * 1500)}</span>
      <span class="adim__birim">d/d</span>
      <div class="adim__metin">
        <h3>${esc(s.baslik)}</h3>
        <p>${esc(s.aciklama)}</p>
      </div>
    </li>`
  )
  .join('');

// --- Galeri, yorumlar, markalar ----------------------------------------------

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
$('[data-puan]').innerHTML = [...puanStr].map((c) => `<span class="tile tile--puan" data-c="${esc(c)}">${esc(c)}</span>`).join('');
$('[data-puan]').setAttribute('aria-label', `5 üzerinden ${puanStr}`);
$('[data-puan-alt]').textContent = `${nf.format(d.puan.adet)} değerlendirme, 5 üzerinden`;

$('[data-reviews]').innerHTML = `<div class="serit__ic">${d.yorumlar
  .map(
    (y) => `
    <blockquote class="yorum">
      <p class="yorum__yildiz" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
      <p class="yorum__metin">${esc(y.metin)}</p>
      <footer>${esc(y.ad)}, ${esc(y.arac)}</footer>
    </blockquote>`
  )
  .join('')}</div>`;

const markaHTML = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-brands]').innerHTML = `<div class="marquee__ic">${markaHTML}${markaHTML}</div>`;

// --- Ölçüm grafiği: önce / sonra -----------------------------------------------

const G = { x0: 46, x1: 584, y0: 344, y1: 24, rpm0: 1000, rpm1: 7000, hpMax: 200 };
const gx = (r) => G.x0 + ((r - G.rpm0) / (G.rpm1 - G.rpm0)) * (G.x1 - G.x0);
const gy = (hp) => G.y0 - (hp / G.hpMax) * (G.y0 - G.y1);
const sekil = devirEgrisi(); // 0..1 normalize güç eğrisi
function egriNoktalari(tepe, bozuk) {
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const r = G.rpm0 + (i / 80) * (G.rpm1 - G.rpm0);
    const tit = bozuk ? 1 - 0.035 * Math.sin(r / 260) * Math.sin(r / 900) - (r > 5200 ? (r - 5200) / 18000 : 0) : 1;
    pts.push([gx(r), gy(tepe * sekil.hp(r) * tit)]);
  }
  return pts;
}
const yol = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
const once = egriNoktalari(d.olcum.once.hp, true);
const sonra = egriNoktalari(d.olcum.sonra.hp, false);
$('.grafik__once').setAttribute('d', yol(once));
$('.grafik__sonra').setAttribute('d', yol(sonra));
$('.grafik__alan').setAttribute('d', `${yol(sonra)}${[...once].reverse().map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}Z`);
{
  let izgara = '';
  let eksen = '';
  for (let r = 1000; r <= 7000; r += 1000) {
    izgara += `<line x1="${gx(r)}" x2="${gx(r)}" y1="${G.y1}" y2="${G.y0}" />`;
    eksen += `<text x="${gx(r)}" y="${G.y0 + 24}" text-anchor="middle">${r / 1000}</text>`;
  }
  for (let hp = 0; hp <= 200; hp += 50) {
    izgara += `<line x1="${G.x0}" x2="${G.x1}" y1="${gy(hp)}" y2="${gy(hp)}" />`;
    eksen += `<text x="${G.x0 - 10}" y="${gy(hp) + 5}" text-anchor="end">${hp}</text>`;
  }
  eksen += `<text x="${G.x1}" y="${G.y0 + 24}" text-anchor="end" class="birim">x1000 d/d</text>`;
  $('.grafik__izgara').innerHTML = izgara;
  $('.grafik__eksen').innerHTML = eksen;
}
$('[data-olcum-baslik]').textContent = d.olcum.baslik;
$('[data-olcum-aciklama]').textContent = d.olcum.aciklama;
$('[data-olcum-not]').textContent = d.olcum.not;
const olc = { hp: $('[data-olc="hp"]'), nm: $('[data-olc="nm"]'), fark: $('[data-olc="fark"]') };
const farkYuzde = Math.round(((d.olcum.sonra.hp - d.olcum.once.hp) / d.olcum.once.hp) * 100);
function olcumYaz(t) {
  olc.hp.textContent = Math.round(gsap.utils.interpolate(d.olcum.once.hp, d.olcum.sonra.hp, t));
  olc.nm.textContent = Math.round(gsap.utils.interpolate(d.olcum.once.nm, d.olcum.sonra.nm, t));
  olc.fark.textContent = `+${Math.round(farkYuzde * t)}`;
}
olcumYaz(0);

// --- Arka plandaki dinamometre eğrisi ve gösterge -----------------------------

const dyno = {
  svg: $('.dyno__svg'),
  tq: $('.dyno__tq'),
  hp: $('.dyno__hp'),
  dot: $('.dyno__dot'),
  w: 0,
  h: 0,
};
const hud = { rpm: $('[data-hud="rpm"]'), nm: $('[data-hud="nm"]'), hp: $('[data-hud="hp"]') };
const heroRpm = $('[data-hero-rpm]');
let heroGorunur = true;
new IntersectionObserver((e) => (heroGorunur = e[0].isIntersecting)).observe($('.hero'));
const son = { rpm: -1, nm: -1, hp: -1 };
// Eğrinin ekrandaki yeri (px). Telefonda üstte header ve gösterge, altta aksiyon çubuğu var.
const ekranX = (t) => dyno.w * (0.04 + t * 0.92);
const ekranY = (v, max) => dyno.h * (0.86 - (v / max) * 0.58);
function dynoCiz() {
  dyno.w = innerWidth;
  dyno.h = innerHeight;
  dyno.svg.setAttribute('viewBox', `0 0 ${dyno.w} ${dyno.h}`);
  const tq = [];
  const hp = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    const r = 1000 + t * 6000;
    tq.push([ekranX(t), ekranY(sekil.nm(r) - 150, 200)]);
    hp.push([ekranX(t), ekranY(sekil.hpMutlak(r), 220)]);
  }
  dyno.tq.setAttribute('d', yol(tq));
  dyno.hp.setAttribute('d', yol(hp));
}
dynoCiz();

function dynoGuncelle(p) {
  const t = gsap.utils.clamp(0, 1, p);
  dyno.tq.style.strokeDashoffset = 1 - t;
  dyno.hp.style.strokeDashoffset = 1 - t;
  const r = 1000 + t * 6000;
  const nm = sekil.nm(r);
  const hpv = sekil.hpMutlak(r);
  dyno.dot.style.transform = `translate3d(${ekranX(t)}px, ${ekranY(nm - 150, 200)}px, 0)`;
  const rpm = t < 0.005 ? 850 : Math.round(r / 10) * 10;
  if (rpm !== son.rpm) {
    hud.rpm.textContent = nf.format((son.rpm = rpm));
    if (heroGorunur) heroRpm.textContent = nf.format(rpm);
  }
  const n = Math.round(nm);
  if (n !== son.nm) hud.nm.textContent = son.nm = n;
  const h = Math.round(hpv);
  if (h !== son.hp) hud.hp.textContent = son.hp = h;
  document.documentElement.classList.toggle('is-redline', t > 0.97);
}

// --- Hareket ------------------------------------------------------------------

document.fonts.ready.then(() => {
  kelimeBoyutla();
  if (reducedMotion) {
    document.documentElement.classList.add('is-static');
    dynoGuncelle(1);
    document.documentElement.classList.remove('is-redline');
    olcumYaz(1);
    $$('.hane__serit').forEach((s) => (s.style.transform = `translateY(${-s.dataset.d}em)`));
    return;
  }
  const lenis = initSmoothScroll();
  hareket(lenis);
});

function hareket(lenis) {
  tabelaCevir();
  gsap.from('.hero__slogan, .hero__actions, .hero__since, .hero__hint', {
    y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, delay: 0.9,
  });

  // Sayfanın tamamı = eğri. Kaydırma ilerlemesi devri belirler.
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => dynoGuncelle(self.progress),
    onRefresh: (self) => dynoGuncelle(self.progress),
  });
  dynoGuncelle(0);
  setInterval(() => {
    if (son.rpm !== 850 && son.rpm > 870) return;
    const r = 850 + Math.round((Math.random() - 0.5) * 4) * 10;
    heroRpm.textContent = nf.format(r);
    hud.rpm.textContent = nf.format(r);
  }, 180);

  // Eğrinin üzerine büyük görsel/grafik bölümleri gelince arkadaki eğri çekilir.
  for (const sel of ['.kelime', '.olcum', '.final', '.konum']) {
    ScrollTrigger.create({
      trigger: sel,
      start: 'top 60%',
      end: 'bottom 40%',
      toggleClass: { targets: document.documentElement, className: `gizle-${sel.slice(1)}` },
    });
  }

  // Header hero'dan sonra koyulaşır.
  ScrollTrigger.create({
    start: () => innerHeight * 0.6,
    end: 'max',
    toggleClass: { targets: '.top', className: 'is-solid' },
  });

  // Dev kelime: harflerden motor görünür, M'nin gövdesine girilir, fotoğraf ekranı kaplar.
  const kapak = $('.kelime__kapak');
  const ilk = $('span', kelimeEl);
  const kelimeTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.kelime',
      start: 'top top',
      end: '+=260%',
      pin: '.kelime__pin',
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  kelimeTl
    .fromTo('.kelime__img', { scale: 1.25 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .fromTo(
      kapak,
      { scale: 1 },
      {
        scale: () => {
          const r = ilk.getBoundingClientRect();
          return (Math.max(innerWidth, innerHeight) * 2.6) / (r.width * 0.22);
        },
        transformOrigin: () => {
          const k = kapak.getBoundingClientRect();
          const r = ilk.getBoundingClientRect();
          return `${r.left - k.left + r.width * 0.11}px ${r.top - k.top + r.height * 0.5}px`;
        },
        ease: 'power3.in',
        duration: 1,
      },
      0.35
    )
    .set(kapak, { autoAlpha: 0 }, 1.36)
    .fromTo('.kelime__icerik', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 1.3)
    .to({}, { duration: 0.5 });

  // Kilometre sayaçları.
  ScrollTrigger.create({
    trigger: '.sayac',
    start: 'top 75%',
    once: true,
    onEnter: () =>
      $$('.hane__serit').forEach((s, i) =>
        gsap.fromTo(s, { y: 0 }, { y: `${-s.dataset.d}em`, duration: 1.6 + (i % 4) * 0.15, ease: 'power4.out', delay: (i % 6) * 0.05 })
      ),
  });

  // Hizmet başlıkları harf harf yükselir, süre kartı döner.
  $$('.hizmet').forEach((li) => {
    const split = SplitText.create($('.hizmet__baslik', li), { type: 'chars,lines', linesClass: 'satir' });
    gsap.from(split.chars, {
      yPercent: 110,
      duration: 0.7,
      ease: 'power4.out',
      stagger: 0.018,
      scrollTrigger: { trigger: li, start: 'top 88%', once: true },
    });
    gsap.from($('.hizmet__sure', li), {
      rotateX: -90,
      duration: 0.5,
      ease: 'back.out(2)',
      delay: 0.25,
      scrollTrigger: { trigger: li, start: 'top 88%', once: true },
    });
  });

  // Kaydırma hızı yazıyı yatırır (sadece transform, ucuz).
  const egik = gsap.quickTo('.hizmet-liste, .serit__ic', 'skewX', { duration: 0.5, ease: 'power3.out' });
  let markaHiz = 1;
  const markaTl = gsap.to('.marquee__ic', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  if (lenis) {
    lenis.on('scroll', (e) => {
      const v = gsap.utils.clamp(-40, 40, e.velocity);
      egik(-v * 0.18);
      markaHiz = 1 + Math.abs(v) * 0.25;
    });
    gsap.ticker.add(() => {
      markaTl.timeScale(gsap.utils.interpolate(markaTl.timeScale(), markaHiz, 0.08));
      markaHiz += (1 - markaHiz) * 0.05;
    });
  }

  // Ölçüm: önce eğrisi çizilir, sonra sonrası üstüne biner ve fark boyanır.
  const olcTl = gsap.timeline({
    scrollTrigger: { trigger: '.olcum', start: 'top top', end: '+=220%', pin: '.olcum__pin', scrub: 0.6 },
  });
  const sayi = { t: 0 };
  olcTl
    .fromTo('.olcum__metin > *', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.3 }, 0)
    .fromTo('.grafik__once', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0.1)
    .fromTo('.lej--once', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.1)
    .fromTo('.grafik__sonra', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 1.1)
    .fromTo('.lej--sonra', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 1.1)
    .fromTo('.grafik__alan', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'none' }, 1.1)
    .fromTo(sayi, { t: 0 }, { t: 1, duration: 1, ease: 'none', onUpdate: () => olcumYaz(sayi.t) }, 1.1)
    .to({}, { duration: 0.4 });

  // Süreç: devir sayısı adım görününce sıfırdan sayar.
  $$('.adim').forEach((li) => {
    const el = $('.adim__devir', li);
    const hedef = Number(el.dataset.devir);
    const o = { v: 0 };
    gsap.from(li, { opacity: 0, x: -30, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 85%', once: true } });
    gsap.to(o, {
      v: hedef,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v / 10) * 10)),
    });
  });

  // Galeri: kareler perde gibi açılır, fotoğraf içeride kayar.
  $$('.kare').forEach((f, i) => {
    gsap.fromTo(
      $('.kare__cerceve', f),
      { clipPath: i % 2 ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)' },
      { clipPath: 'inset(0 0 0% 0)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 45%', scrub: true } }
    );
    gsap.fromTo($('img', f), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Yorumlar: puan tabelası döner, kartlar yatay akar.
  ScrollTrigger.create({
    trigger: '.yorumlar',
    start: 'top 70%',
    once: true,
    onEnter: () => {
      $$('.tile--puan').forEach((t, i) =>
        gsap.fromTo(t, { rotateX: 90 }, { rotateX: 0, duration: 0.7, ease: 'back.out(2.2)', delay: i * 0.08 })
      );
    },
  });
  const serit = $('.serit__ic');
  gsap.to(serit, {
    x: () => -(serit.scrollWidth - innerWidth + 32),
    ease: 'none',
    scrollTrigger: {
      trigger: '.yorumlar',
      start: 'top top',
      end: () => `+=${serit.scrollWidth - innerWidth + 32}`,
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
    },
  });

  // Final: fotoğraf yaklaşır, başlık harf harf.
  const fsplit = SplitText.create('.final__baslik', { type: 'words,chars', wordsClass: 'kelime-sar' });
  gsap.from(fsplit.chars, {
    yPercent: 120,
    rotate: 6,
    duration: 0.8,
    ease: 'power4.out',
    stagger: 0.02,
    scrollTrigger: { trigger: '.final', start: 'top 60%', once: true },
  });
  gsap.fromTo('.final__img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('resize', () => {
    dynoCiz();
    kelimeBoyutla();
  });
}
