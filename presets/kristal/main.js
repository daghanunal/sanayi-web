import '../../shared/base.css';
import './style.css';
import raw from '../../data/kristal.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld } from './scene.js';
import { magnetic, initCursor } from './fx.js';

// Kristal: sinematik aile. 3D iki yerde kalır. (1) Künye: arkada ön cam, açılışta üstünden bir kez parlama geçer.
// (2) Hizmetler: her hizmete gelince camda ilgili iş gösterilir (taş izi reçineyle dolar, cam sökülüp takılır,
// yan cama film çekilir, kamera ayarlanır); kartın etiketi camın ilgili yeridir. Hizmetlerden sonra kanvas
// çizilmez; gerisi düz site bölümleri.
gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const st = gunDurumu(d.saatler);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

// Hizmet → camda gösterilecek iş ve kartın etiketi (camın ilgili yeri)
const SERVICE_MAP = [
  { re: /taş|çatlak/i, key: 'tas', yer: 'Ön cam · taş izi' },
  { re: /kasko/i, key: 'kasko', yer: 'Ön cam' },
  { re: /ön cam/i, key: 'degisim', yer: 'Ön cam' },
  { re: /yan|arka/i, key: 'yan', yer: 'Kapı camı' },
  { re: /film/i, key: 'film', yer: 'Yan cam · film' },
  { re: /sunroof|tavan/i, key: 'conta', yer: 'Conta ve sızdırmazlık' },
  { re: /adas|kamera|kalibrasyon/i, key: 'adas', yer: 'Ön kamera' },
];
const services = d.hizmetler.map((h) => ({ ...h, map: SERVICE_MAP.find((m) => m.re.test(h.baslik)) ?? SERVICE_MAP[1] }));

// --- Render ----------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M3 18 7 3h18l4 15z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 7h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".45"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne" data-hot>${logo}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn btn--small" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('#sahne').innerHTML = `
  <div class="hero__inner">
    <h1 class="h1" id="hero-title" data-reveal>${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="actions">
      <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener" data-mag>${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="services__head">
    <h2 class="h2" id="services-title">Hizmetler</h2>
    <p class="services__sub">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  ${services.map((s, i) => `
    <article class="svc" data-i="${i}" data-key="${s.map.key}">
      <div class="svc__card">
        <p class="svc__tag">${esc(s.map.yer)}</p>
        <h3 class="svc__title">${esc(s.baslik)}</h3>
        <p class="svc__text">${esc(s.aciklama)}</p>
        <p class="svc__time">Süre: <b>${esc(s.sure)}</b></p>
      </div>
    </article>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2 h2--ink" id="about-title" data-reveal>Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li><b>${yas} yıl</b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b>${acikGunSayisi(d.saatler)} gün</b><span>haftada açık</span></li>
      </ul>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Cam takılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="wrap">
    <ul class="gallery">
      ${d.galeri.map((g) => `<li class="gallery__item"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="1400" height="1050"><span class="gallery__fog" aria-hidden="true"></span></li>`).join('')}
    </ul>
  </div>`;

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2 h2--ink" id="visit-title" data-reveal>Çalışma saatleri ve konum</h2>
      <p class="visit__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2 h2--ink" id="reviews-title" data-reveal>Örnek yorumlar</h2>
    <p class="reviews__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__track" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="review">
        ${stars(y.puan)}
        <p>${esc(y.metin)}</p>
        <span class="review__who"><b>${esc(y.ad)}</b> ${esc(y.arac)}</span>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="h1" id="final-title" data-reveal>İletişim</h2>
    <div class="finale__side">
      <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Camın fotoğrafı WhatsApp'tan gönderilebilir.</p>
      <div class="actions">
        <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>${tel}</span></a>
        <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp</span></a>
      </div>
      <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
    </div>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. 3D görseller temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yaklaşınca yüklensin
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Başlık animasyonu -----------------------------------------------------------------

const splits = new Map();
function reveal(el) {
  if (reducedMotion || !el) return;
  let split = splits.get(el);
  if (!split) {
    split = new SplitText(el, { type: 'words,chars', wordsClass: 'w' });
    splits.set(el, split);
  }
  gsap.killTweensOf([el, ...split.chars]);
  gsap.fromTo(split.chars, { opacity: 0, yPercent: 35 }, { opacity: 1, yPercent: 0, duration: 0.55, stagger: 0.016, ease: 'power3.out' });
  gsap.fromTo(el, { '--shrp': 0, '--blur': 6 }, { '--shrp': 100, '--blur': 0, duration: 1.1, ease: 'power2.out' });
}

// --- 3D sahne --------------------------------------------------------------------------

const canvas = $('#gl');
const world = createWorld(canvas, { name: d.isletme.ad, phone, low });
const { S } = world;
addEventListener('resize', () => world.resize());
// Gökyüzüne yazılan ad künyedeki başlıkla aynı olduğu için gösterilmez.
const DEFAULTS = { ...S, name: 0 };
const reset = () => Object.assign(S, DEFAULTS);

const heroEl = $('#sahne');
const svcEls = $$('.svc');
const intro = { gleam: -1, amt: 0 };

// Her hizmetin camdaki gösterimi; p = kartın ekran ortasından geçişi (0..1)
const SHOWS = {
  tas(p) {
    world.view('tasYakin');
    S.crack = 1;
    S.tool = ease(seg(p, 0.1, 0.25)) * (1 - ease(seg(p, 0.78, 0.9)));
    S.resin = ease(seg(p, 0.25, 0.6)) * 0.9 + seg(p, 0.64, 0.8) * 0.1;
    S.uv = seg(p, 0.58, 0.64) * (1 - seg(p, 0.74, 0.8));
  },
  degisim(p) {
    world.view('kasko');
    S.glassY = p < 0.5 ? ease(seg(p, 0.12, 0.42)) : 1 - ease(seg(p, 0.52, 0.8));
    S.gleam = -0.4 + seg(p, 0.8, 0.98) * 1.9;
    S.gleamAmt = seg(p, 0.8, 0.84) * (1 - seg(p, 0.94, 0.98));
  },
  kasko(p) {
    world.view('final');
    S.gleam = -0.4 + seg(p, 0.2, 0.8) * 1.9;
    S.gleamAmt = seg(p, 0.2, 0.3) * (1 - seg(p, 0.7, 0.8));
  },
  yan(p) {
    world.view('film');
    S.side = ease(seg(p, 0.05, 0.35));
  },
  film(p) {
    world.view('film');
    S.side = 1;
    S.film = 0.7 * ease(seg(p, 0.2, 0.6));
  },
  conta(p) {
    world.view('yagmur');
    S.dim = 0.6;
    S.rain = 1;
    S.rainP = clamp(0.1 + p * 0.8);
  },
  adas(p) {
    world.view('adas');
    S.adas = ease(seg(p, 0.02, 0.3));
    S.adasErr = 1 - ease(seg(p, 0.35, 0.8));
  },
};

// Telefonda kart, bölümü boyunca ekranın altında (alt çubuğun üstünde) yapışık durur; kartın üst çizgisi
// o bölümün okuma çizgisidir. Masaüstünde okuma çizgisi ekranın ortası.
let cardH = [];
let bs = 96;
function cardHeights() {
  cardH = svcEls.map((el) => el.firstElementChild.offsetHeight);
  bs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-space')) || 0;
  if (phone) svcEls.forEach((el, i) => el.style.setProperty('--card-h', `${cardH[i]}px`));
}
cardHeights();
addEventListener('resize', cardHeights);
addEventListener('load', cardHeights);

const rootStyle = getComputedStyle(document.documentElement);
function tick() {
  const vh = innerHeight;
  if (phone) bs = parseFloat(rootStyle.getPropertyValue('--bar-space')) || 0;
  reset();
  let active = null;
  let p = 0;
  for (const [i, el] of svcEls.entries()) {
    const r = el.getBoundingClientRect();
    const line = phone ? vh - bs - 12 - cardH[i] + 1 : vh * 0.5;
    const span = phone ? r.height - cardH[i] : r.height;
    if (r.top <= line && r.top + span > line) {
      active = el;
      p = clamp((line - r.top) / Math.max(1, span));
    }
  }
  svcEls.forEach((el) => el.classList.toggle('is-active', el === active));
  if (active) {
    SHOWS[services[Number(active.dataset.i)].map.key](p);
  } else {
    world.view('hero');
    S.gleam = intro.gleam;
    S.gleamAmt = intro.amt;
  }
}

// Kanvas yalnız künye ya da hizmetler görünürken çizilir
let canvasOn = true;
const visible = new Set();
const vio = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
});
[heroEl, $('#hizmetler')].forEach((el) => vio.observe(el));

// --- Hareket ---------------------------------------------------------------------------

const topEl = $('#top');
ScrollTrigger.create({
  trigger: '.solid', start: 'top 60px', end: 'bottom 60px',
  onToggle: (self) => topEl.classList.toggle('is-solid', self.isActive),
});
if (phone) autoHideHeader(topEl, { offset: 120 });

const bir = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

function start() {
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    world.view('hero');
    world.snap();
    reset();
    world.render();
    $$('.gallery__fog').forEach((f) => f.remove());
    return;
  }
  const lenis = initSmoothScroll({ lerp: 0.1 });
  tick();
  world.snap();
  gsap.ticker.add(() => {
    if (!canvasOn || document.hidden) return;
    tick();
    world.render();
  });
  $$('[data-mag]').forEach((b) => magnetic(b, 0.3));
  initCursor();
  void lenis;

  // Düz bölüm başlıkları görünür olunca netleşir
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 85%', toggleActions: 'play none none none', onEnter: (s) => { if (!s.done) { s.done = true; reveal(el); } } });
  });
  // Hizmet kartları
  // Telefonda yalnız yapışık (etkin) kart görünür; masaüstünde kartlar kayarak gelir.
  document.documentElement.classList.add('has-film');
  // Telefonda hizmet kartı ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir (voltaj gibi).
  if (phone) {
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
  if (!phone) svcEls.forEach((el) => gsap.from($('.svc__card', el), { y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(el, 'top 75%') }));
  gsap.from('.stats li', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('.stats', 'top 90%') });
  // Galeri: buğulu cam silinerek açılır
  $$('.gallery__item').forEach((item) => {
    gsap.fromTo(item.querySelector('.gallery__fog'), { '--wipe': 0 }, {
      '--wipe': 100, ease: 'power2.inOut',
      scrollTrigger: { trigger: item, start: 'top 90%', end: 'top 45%', scrub: 0.6 },
    });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}

// --- Açılış: buğulu cam, parmakla yazılan ad, silecek (~1 sn; dokununca geçer) ---------

function fogIntro() {
  const el = $('#intro');
  const fog = $('#fog');
  if (reducedMotion) {
    el.remove();
    return Promise.resolve();
  }
  document.documentElement.classList.add('is-intro');
  const w = innerWidth;
  const h = innerHeight;
  const r = Math.min(devicePixelRatio || 1, 1.5);
  fog.width = w * r;
  fog.height = h * r;
  const x = fog.getContext('2d');
  x.scale(r, r);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(214,226,233,.985)');
  g.addColorStop(1, 'rgba(236,241,243,.985)');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 900; i++) {
    x.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.4})`;
    x.beginPath();
    x.arc(rand() * w, rand() * h, 0.6 + rand() * 1.8, 0, Math.PI * 2);
    x.fill();
  }
  const label = d.isletme.ad;
  let size = Math.min(w * 0.13, 120);
  x.font = `700 ${size}px Geologica, sans-serif`;
  const words = label.split(' ');
  let lines = [label];
  if (x.measureText(label).width > w * 0.86 && words.length > 1) {
    let best = 1;
    for (let i = 1; i < words.length; i++) {
      const diff = (k) => Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
      if (diff(i) < diff(best)) best = i;
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  const widest = Math.max(...lines.map((l) => x.measureText(l).width));
  size *= Math.min(1, (w * 0.86) / widest);
  x.font = `700 ${size}px Geologica, sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const cy = h * 0.3;
  const lh = size * 1.02;
  const textTop = cy - (lines.length * lh) / 2;
  const textLeft = w / 2 - Math.max(...lines.map((l) => x.measureText(l).width)) / 2;
  const textRight = w - textLeft;

  let done = false;
  return new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      gsap.to(el, { autoAlpha: 0, duration: 0.25, onComplete: () => {
        el.remove();
        document.documentElement.classList.remove('is-intro');
      } });
      resolve();
    };
    // perde dokunmayı yutmaz: ilk dokunuş hem perdeyi kaldırır hem alttaki düğmeye ulaşır
    addEventListener('pointerdown', finish, { once: true, capture: true });
    addEventListener('wheel', finish, { once: true, passive: true });
    addEventListener('keydown', finish, { once: true });
    const s = { write: 0, wipe: 0 };
    const draw = () => {
      x.save();
      x.globalCompositeOperation = 'destination-out';
      x.save();
      x.beginPath();
      x.rect(0, textTop - size, textLeft + (textRight - textLeft) * s.write, lines.length * lh + size * 2);
      x.clip();
      x.fillStyle = 'rgba(0,0,0,.9)';
      lines.forEach((l, i) => x.fillText(l, w / 2, textTop + lh * (i + 0.5)));
      x.restore();
      if (s.wipe > 0) {
        const R = Math.hypot(w, h) * 1.05;
        x.beginPath();
        x.moveTo(w / 2, h + 10);
        x.arc(w / 2, h + 10, R, Math.PI, Math.PI + Math.PI * s.wipe);
        x.closePath();
        x.fillStyle = '#000';
        x.fill();
      }
      x.restore();
    };
    gsap.timeline({ onUpdate: draw, onComplete: finish })
      .to(s, { write: 1, duration: 0.45, ease: 'power1.inOut' }, 0.05)
      .to(s, { wipe: 1, duration: 0.45, ease: 'power2.inOut' }, 0.5);
  });
}

// İlk kare, sonra açılış
world.view('hero');
world.snap();
world.render();
document.fonts?.ready.then(() => {
  world.setName(d.isletme.ad);
  world.render();
});
const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))]);
fontsReady.then(fogIntro).then(() => {
  reveal($('#hero-title'));
  if (!reducedMotion) {
    gsap.from('.hero__inner > :not(h1)', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
    gsap.timeline({ delay: 0.3 })
      .to(intro, { amt: 1, duration: 0.3 }, 0)
      .to(intro, { gleam: 1.4, duration: 1.6, ease: 'power1.inOut' }, 0)
      .to(intro, { amt: 0, duration: 0.3 }, 1.3);
  }
});
start();
