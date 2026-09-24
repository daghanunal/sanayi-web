import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import extra from '../../data/amper.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, esc,
} from '../../shared/core.js';
import { segHTML, segSet } from './seg.js';

// Kinetik aile: WebGL yok. Hareket CSS sınıfları, transform ve SVG ile.
const d = boot({ ...raw, ...extra, preset: 'amper' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

// "2001'den", "1994'ten", "1990'dan": yılın okunuşuna göre ayrılma eki.
function denEki(n) {
  const s = String(n);
  const son = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const onlar = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return s + son[s.at(-1)];
  if (s.at(-2) !== '0') return s + onlar[s.at(-2)];
  return s + "'den";
}

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = d.isletme.kurulus;
const yas = new Date().getFullYear() - yil;

// Nokta matris başlık: her harf ayrı yanar. Kelimeler bölünmez.
function dots(text, cls = '') {
  const words = String(text).split(' ');
  let i = 0;
  const html = words
    .map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--d:${(((i++ * 37) % 23) / 23 * 0.55).toFixed(3)}s">${esc(c)}</span>`).join('')}</span>`)
    .join(' ');
  return `<span class="dots ${cls}" aria-label="${esc(text)}"><span aria-hidden="true">${html}</span></span>`;
}

const rocker = (cls = '') => `
  <span class="rocker ${cls}" aria-hidden="true">
    <span class="rocker__plate"><span class="rocker__key"><i class="rocker__pilot"></i></span></span>
  </span>`;

const wa = (msg) => waHref(d, msg);

// --- Üst bar ---------------------------------------------------------------

const durum = openStatus(d.saatler);
$('#top').innerHTML = `
  <a class="top__brand" href="#hero">${ad}</a>
  <p class="top__status ${durum.open ? 'is-open' : ''}"><i></i><span class="l">${esc(durum.text)}</span><span class="s">${durum.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Hero --------------------------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__stage">
    <div class="tubes" aria-hidden="true"><i></i><i></i></div>
    <div class="hero__glow" aria-hidden="true"></div>
    <div class="hero__copy">
      <p class="hero__eyebrow">${ad}, Şaşmaz Oto Sanayi, ${denEki(yil)} beri</p>
      <h1 class="hero__title" id="hero-title">${dots(d.hero.baslik)}</h1>
      <p class="hero__lead">${esc(d.isletme.slogan)} Arıza tespiti 30 dakika.</p>
      <div class="hero__cta">
        <a class="btn btn--amber" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
        <a class="btn btn--line" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
      </div>
    </div>
    <div class="hero__switch">
      ${rocker('rocker--big')}
      <span class="dymo">${esc(d.hero.anahtar)}</span>
    </div>
    <p class="hero__hint" aria-hidden="true"><span class="blink">▼</span> ${esc(d.hero.ipucu)}</p>
  </div>`;

// --- Fener -------------------------------------------------------------------

const F = d.fener;
$('#fener').innerHTML = `
  <div class="fener__stage">
    <img class="fener__img" src="${asset('/img/amper/motor-bolmesi.jpg')}" alt="Kaputu açık aracın motor bölmesi, arıza tespit cihazı bağlı" width="1600" height="1066" />
    <div class="fener__dark" aria-hidden="true"><div class="fener__beam"></div></div>
    <div class="fener__mark" aria-hidden="true"><i></i><i></i></div>
    <p class="fener__found dymo dymo--red">${esc(F.bulgu)}</p>
    <ol class="fener__steps">
      ${F.adimlar.map((a, i) => `<li class="fener__step" data-i="${i}"><h2>${esc(a.baslik)}</h2><p>${esc(a.metin)}</p></li>`).join('')}
    </ol>
    <div class="fener__rail" aria-hidden="true">${F.adimlar.map(() => '<i></i>').join('')}</div>
  </div>`;

// --- Hakkımızda + sayaçlar ---------------------------------------------------

const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yas : s.deger }));
$('#hakkimizda').innerHTML = `
  <div class="wrap about__grid">
    <h2 class="h2 about__title">${dots('Tahmin değil, ölçü.')}</h2>
    <div class="about__text">
      <p class="about__lead" data-words>${esc(d.isletme.hakkinda)}</p>
    </div>
    <figure class="about__photo">
      <img src="${asset('/img/amper/fener-usta.jpg')}" alt="Ustamız kaputun altında el feneriyle kabloları kontrol ediyor" width="1600" height="1066" loading="lazy" />
    </figure>
    <ul class="meters">
      ${stats.map((s) => `
        <li class="meter">
          <div class="meter__lcd">${segHTML(String(s.deger).length, { label: `${s.deger} ${s.etiket}` })}<span class="meter__unit">${esc(s.birim || '')}</span></div>
          <p>${esc(s.etiket)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Hizmetler: anahtar paneli ------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="h2">${dots('Her devreye bir anahtar.')}</h2>
      <p>Aracın hangi devresi arızalıysa ondan sorumlu ustamız bakar. Süreler ortalamadır, arızayı gördükten sonra netleşir.</p>
    </header>
    <ul class="switches">
      ${d.hizmetler.map((h, i) => `
        <li class="sw">
          ${rocker()}
          <div class="sw__body">
            <h3 class="dymo">${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
            <p class="sw__meta"><span>Süre: <b>${esc(h.sure)}</b></span>
              <a href="${wa(`Merhaba ${d.isletme.ad}, ${h.baslik} için bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}Bu iş için sor</a></p>
          </div>
          <span class="sw__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Arıza kodları: LED tabela -------------------------------------------------

const K = d.arizaKodlari;
$('#ariza-kodlari').innerHTML = `
  <div class="tabela__stage">
    <div class="wrap">
      <header class="sec-head">
        <h2 class="h2">${dots(d.tabela.baslik)}</h2>
        <p>${esc(d.tabela.metin)}</p>
      </header>
      <div class="board" role="list">
        ${K.map((k, i) => `
          <div class="board__row" role="listitem" data-i="${i}">
            <p class="board__code">${esc(k.kod)}</p>
            <p class="board__mean">${esc(k.anlam)}</p>
            <p class="board__fix"><span class="ok">Çözüldü</span> ${esc(k.cozum)}</p>
          </div>`).join('')}
        <div class="board__leds" aria-hidden="true">${K.map(() => '<i></i>').join('')}</div>
      </div>
    </div>
  </div>`;

// --- Süreç: sıralı sinyal ------------------------------------------------------

const chev = `<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M3 2h6l8 10-8 10H3l8-10z"/></svg>`;
$('#surec').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="h2">${dots('Arızadan teslime dört adım.')}</h2>
    </header>
    <ol class="steps">
      ${d.surec.map((s, i) => `
        <li class="step">
          <span class="step__sig" aria-hidden="true">${Array.from({ length: 5 }, (_, j) => `<i style="--j:${j}">${chev}</i>`).join('')}</span>
          <span class="step__no">${i + 1}</span>
          <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Yorumlar ---------------------------------------------------------------

const P = d.puan;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="yorum__head">
      <div class="yorum__score">
        <div class="meter__lcd meter__lcd--wide">${segHTML(2, { label: `${String(P.ortalama).replace('.', ',')} puan` })}</div>
        <p><span class="leds5" aria-hidden="true">${'<i></i>'.repeat(5)}</span> ${P.adet} Google yorumu</p>
      </div>
      <h2 class="h2">${dots('Işığı söndürdük, onlar yazdı.')}</h2>
    </header>
  </div>
  <div class="yorum__track">
    <ul class="yorum__list">
      ${d.yorumlar.map((y) => `
        <li class="card">
          <span class="leds5 leds5--${y.puan}" aria-label="${y.puan} yıldız">${'<i></i>'.repeat(5)}</span>
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="card__who">${esc(y.ad)}, <span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Markalar: nokta matris kayan yazı ------------------------------------------

const brandLine = d.markalar.map((m) => `<span>${esc(m)}</span><i>•</i>`).join('');
$('#markalar').innerHTML = `
  <div class="marq"><div class="marq__in">${brandLine}${brandLine}</div></div>
  <div class="marq marq--rev"><div class="marq__in">${brandLine}${brandLine}</div></div>`;

// --- Dükkân ---------------------------------------------------------------------

$('#dukkan').innerHTML = `
  <div class="wrap dukkan__grid">
    <div>
      <div class="sign ${durum.open ? 'is-open' : 'is-closed'}" aria-live="polite">
        <span class="sign__word">${durum.open ? dots('Açık') : dots('Kapalı')}</span>
        <p>${esc(durum.text)}</p>
      </div>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        ${groupedHours(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
      </table>
      <p class="dukkan__adres">${esc(d.iletisim.adres)}</p>
      <div class="dukkan__cta">
        <a class="btn btn--amber" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p>Harita yükleniyor</p></div>
  </div>`;

// --- Final --------------------------------------------------------------------

const tri = `<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 3 37 33H3z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M20 12 29 28H11z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`;
$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <div class="final__hazard" aria-hidden="true"><span>${tri}</span><span>${tri}</span></div>
    <h2 class="final__title">${dots(d.final.baslik)}</h2>
    <p>${esc(d.final.metin)} ${esc(d.garanti)}</p>
    <div class="final__cta">
      <a class="btn btn--amber btn--xl" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
      <a class="btn btn--line btn--xl" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${ad}</p>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar: Pexels.</p>
  </div>`;

// --- Harita: yaklaşınca yükle -------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Sayaçlar -------------------------------------------------------------------

const meterSvgs = $$('#hakkimizda .seg');
meterSvgs.forEach((svg) => segSet(svg, '0'));
const scoreSvg = $('#yorumlar .seg');
segSet(scoreSvg, '0,0');

function countUp(svg, to, { dec = 0, dur = 1.4 } = {}) {
  const o = { v: 0 };
  gsap.to(o, {
    v: to, duration: dur, ease: 'power2.out',
    onUpdate: () => segSet(svg, dec ? o.v.toFixed(dec).replace('.', ',') : String(Math.round(o.v))),
  });
}

// --- Hareket ----------------------------------------------------------------------

function allOn() {
  $$('.zone').forEach((z) => z.classList.add('is-on'));
  $$('.sw, .step').forEach((z) => z.classList.add('is-on'));
  meterSvgs.forEach((svg, i) => segSet(svg, String(stats[i].deger)));
  segSet(scoreSvg, String(P.ortalama).replace('.', ','));
  $('#fener').classList.add('is-found');
  $$('.fener__step').forEach((s) => s.classList.add('is-on'));
  $$('.board__row').forEach((r) => r.classList.add('is-on', 'is-fixed'));
}

if (reducedMotion) {
  allOn();
} else {
  const lenis = initSmoothScroll();
  const mm = gsap.matchMedia();
  const mobile = () => innerWidth < 900;

  // Hero: anahtar iner → tüp ışık titrer → tabela yanar.
  const hero = $('#hero');
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=130%', pin: '.hero__stage', scrub: 0.6,
      onUpdate: (st) => hero.classList.toggle('is-on', st.progress > 0.2),
    },
  });
  heroTl
    .fromTo('.rocker--big .rocker__key', { rotateX: 16 }, { rotateX: -16, ease: 'power3.in', duration: 0.2 })
    .fromTo('.hero__hint', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.1 }, 0.05)
    .fromTo('.hero__switch', { scale: 1, yPercent: 0 }, { scale: () => (mobile() ? 0.46 : 0.7), yPercent: () => (mobile() ? 18 : 0), xPercent: () => (mobile() ? 30 : 0), duration: 0.5, ease: 'power2.inOut' }, 0.3)
    .fromTo('.hero__lead, .hero__cta', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.08 }, 0.32)
    .to({}, { duration: 0.25 });

  // Bölüm girince "ışığı yanar"; geri çıkınca söner.
  $$('.zone:not(.hero)').forEach((z) => {
    ScrollTrigger.create({
      trigger: z, start: 'top 68%',
      onEnter: () => z.classList.add('is-on'),
      onLeaveBack: () => z.classList.remove('is-on'),
    });
  });

  // Sayaçlar bir kez sayar.
  ScrollTrigger.create({
    trigger: '.meters', start: 'top 80%', once: true,
    onEnter: () => meterSvgs.forEach((svg, i) => countUp(svg, stats[i].deger, { dur: 1.2 + i * 0.15 })),
  });
  ScrollTrigger.create({
    trigger: '.yorum__score', start: 'top 85%', once: true,
    onEnter: () => countUp(scoreSvg, P.ortalama, { dec: 1, dur: 1 }),
  });

  // Hakkımızda: kelimeler okundukça koyulaşır.
  const lead = $('[data-words]');
  lead.innerHTML = lead.textContent.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ');
  gsap.fromTo(lead.children, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: lead, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });

  // Fener: ışık yolu boyunca ilerler, arızayı bulur, sonra her yer aydınlanır.
  const fener = $('#fener');
  const beam = $('.fener__beam');
  const stage = $('.fener__stage');
  const steps = $$('.fener__step');
  const rail = $$('.fener__rail i');
  const yol = F.yol;
  const mark = $('.fener__mark');
  const found = $('.fener__found');
  const placeMark = () => {
    const [x, y] = yol.at(-1);
    const r = stage.getBoundingClientRect();
    gsap.set(mark, { x: x * r.width, y: y * r.height });
    // Etiket işaretin altında, ekrandan taşmayacak şekilde.
    const lw = found.offsetWidth;
    const lx = gsap.utils.clamp(16, r.width - lw - 16, x * r.width - lw / 2);
    gsap.set(found, { x: lx, y: y * r.height + 48 });
    const [bx, by] = yol[0];
    gsap.set(beam, { x: bx * r.width, y: by * r.height });
  };
  const beamAt = (t) => {
    const n = yol.length - 1;
    const f = Math.min(n - 1e-6, t * n);
    const i = Math.floor(f);
    const k = f - i;
    const e = k * k * (3 - 2 * k);
    const x = yol[i][0] + (yol[i + 1][0] - yol[i][0]) * e;
    const y = yol[i][1] + (yol[i + 1][1] - yol[i][1]) * e;
    return [x, y];
  };
  let last = -1;
  // Masaüstünde fener biraz da imleci takip eder: ışık elinizde gibi.
  let bx = 0, by = 0, ox = 0, oy = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      if (fener.classList.contains('is-found')) return;
      const r = stage.getBoundingClientRect();
      ox = (e.clientX - r.left - bx) * 0.3;
      oy = (e.clientY - r.top - by) * 0.3;
      gsap.to(beam, { x: bx + ox, y: by + oy, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
    });
    stage.addEventListener('pointerleave', () => { ox = 0; oy = 0; });
  }
  ScrollTrigger.create({
    trigger: fener, start: 'top top', end: '+=260%', pin: stage, scrub: true,
    onRefresh: placeMark,
    onUpdate: (st) => {
      const p = st.progress;
      const r = stage.getBoundingClientRect();
      const search = Math.min(1, p / 0.72);
      const [x, y] = beamAt(search);
      // Arıza bulunduktan sonra ışık büyür ve her yeri aydınlatır.
      const grow = gsap.utils.clamp(0, 1, (p - 0.8) / 0.18);
      const wob = Math.sin(p * 40) * 0.006 * (1 - grow);
      bx = (x + wob) * r.width;
      by = (y - wob) * r.height;
      gsap.set(beam, { x: bx + ox, y: by + oy, scale: 1 + grow * 9 });
      fener.classList.toggle('is-found', p > 0.72);
      fener.classList.toggle('is-lit', p > 0.95);
      const idx = Math.min(steps.length - 1, Math.floor((p / 0.8) * steps.length));
      if (idx !== last) {
        steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
        rail.forEach((s, i) => s.classList.toggle('on', i <= idx));
        last = idx;
      }
    },
  });

  // Hizmet satırları: merkeze gelince anahtarı iner.
  $$('.sw').forEach((row) => {
    ScrollTrigger.create({
      trigger: row, start: 'top 72%',
      onEnter: () => row.classList.add('is-on'),
      onLeaveBack: () => row.classList.remove('is-on'),
    });
  });

  // LED tabela: kodlar sırayla gelir, sonra "Çözüldü".
  const rows = $$('.board__row');
  const leds = $$('.board__leds i');
  rows[0].classList.add('is-on');
  mm.add('(min-width: 1px)', () => {
    ScrollTrigger.create({
      trigger: '#ariza-kodlari', start: 'top top', end: `+=${rows.length * 70}%`, pin: '.tabela__stage', scrub: true,
      onUpdate: (st) => {
        const f = st.progress * rows.length;
        const i = Math.min(rows.length - 1, Math.floor(f));
        const fixed = f - i > 0.5 || st.progress > 0.98;
        rows.forEach((r, j) => {
          r.classList.toggle('is-on', j === i);
          r.classList.toggle('is-fixed', j < i || (j === i && fixed));
        });
        leds.forEach((l, j) => l.classList.toggle('on', j < i || (j === i && fixed)));
      },
    });
  });

  // Süreç: adımlar sırayla sinyal verir.
  $$('.step').forEach((s) => {
    ScrollTrigger.create({
      trigger: s, start: 'top 70%',
      onEnter: () => s.classList.add('is-on'),
      onLeaveBack: () => s.classList.remove('is-on'),
    });
  });

  // Sürekli yanıp sönen sinyaller yalnızca ekrandayken çalışsın.
  for (const sel of ['#surec', '#iletisim']) {
    ScrollTrigger.create({ trigger: sel, start: 'top bottom', end: 'bottom top', toggleClass: 'is-vis' });
  }

  // Yorumlar: kaydırma yönünde yana kayar.
  const list = $('.yorum__list');
  gsap.fromTo(list, { x: () => (mobile() ? 0 : innerWidth * 0.1) }, {
    x: () => -(list.scrollWidth - innerWidth * (mobile() ? 1 : 0.8)),
    ease: 'none',
    scrollTrigger: { trigger: '#yorumlar', start: 'top 75%', end: 'bottom 20%', scrub: 0.8, invalidateOnRefresh: true },
  });

  // Kayan yazılar: hız kaydırmayla artar.
  const marqs = $$('.marq__in').map((el, i) => ({ el, x: 0, dir: i % 2 ? 1 : -1, w: 0 }));
  const measure = () => marqs.forEach((m) => (m.w = m.el.scrollWidth / 2));
  measure();
  addEventListener('resize', measure);
  let vis = false;
  ScrollTrigger.create({ trigger: '#markalar', start: 'top bottom', end: 'bottom top', onToggle: (st) => (vis = st.isActive) });
  gsap.ticker.add((t, dt) => {
    if (!vis) return;
    const v = Math.min(8, Math.abs(lenis?.velocity ?? 0));
    for (const m of marqs) {
      m.x += m.dir * (0.6 + v * 0.9) * (dt / 16.7);
      if (m.x < -m.w) m.x += m.w;
      if (m.x > 0) m.x -= m.w;
      m.el.style.transform = `translate3d(${m.x}px,0,0)`;
    }
  });

  // Görseller yüklenince ölçüleri tazele.
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
