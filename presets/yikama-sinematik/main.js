// Köpük Tüneli (sinematik aile, oto yıkama): gece yıkama bölmesi, neon kemerler, üç renk köpük.
// 3D iki yerde kalır. (1) Künye: arkada bölmede duran araç, kamera yavaşça döner.
// (2) Hizmetler: her hizmet kartında kamera ilgili işe gider (basınçlı su ve köpük, durulama, jant,
// iç temizlik, pasta-cila, filo). Kartın etiketi işin yapıldığı yerdir. Sonrası düz site bölümleri.
import '../../shared/base.css';
import './style.css';
import raw from '../../data/sektor-yikama.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld } from './scene.js';
import { magnetic } from './fx.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = Math.max(1, yil - d.isletme.kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);

// --- Hizmet → sahne ------------------------------------------------------------------------
// Sahneler kamera yolunun sırasıyla dizilir; aynı sahneye düşen hizmetler o sahnede sırayla gelir.
const SAHNE = ['kopuk', 'durulama', 'jant', 'ic', 'cila', 'filo'];
const ESLE = [
  { re: /iç-dış|dış yıkama|hızlı/i, s: 'kopuk', etiket: 'Basınçlı su · Köpük' },
  { re: /motor/i, s: 'durulama', etiket: 'Düşük basınçlı su' },
  { re: /jant|lastik/i, s: 'jant', etiket: 'Jant · Lastik' },
  { re: /detaylı|iç temizlik/i, s: 'ic', etiket: 'Torpido · Konsol · Bagaj' },
  { re: /koltuk/i, s: 'ic', etiket: 'Koltuklar' },
  { re: /tavan|halı/i, s: 'ic', etiket: 'Tavan · Halı · Paspas' },
  { re: /pasta|cila/i, s: 'cila', etiket: 'Boya yüzeyi · Pasta makinesi' },
  { re: /filo/i, s: 'filo', etiket: 'Şirket ve ticari araçlar' },
];
const hizmetler = d.hizmetler.map((h) => ({ ...h, ...(ESLE.find((m) => m.re.test(h.baslik)) || { s: 'kopuk', etiket: '' }) }));
const gruplar = SAHNE.map((s) => ({ s, list: hizmetler.filter((h) => h.s === s) })).filter((g) => g.list.length);
let sira = 0;
gruplar.forEach((g) => g.list.forEach((h) => (h.no = ++sira)));

// --- Render ----------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 30 24" aria-hidden="true"><circle cx="10" cy="14" r="7" fill="#ff5c9d"/><circle cx="21" cy="8" r="5" fill="#27e3f0"/><circle cx="22" cy="19" r="3.5" fill="#7dffb4"/><circle cx="7.5" cy="11.5" r="1.8" fill="#fff" opacity=".8"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye" aria-label="${ad}, sayfa başı">${logo}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn btn--small" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

const sticky = (inner, extra = '') => `<div class="scene__sticky ${extra}"><div class="copy">${inner}</div></div>`;
const LEN = { kopuk: 150, durulama: 140, jant: 140, ic: 110, cila: 150, filo: 150 };

$('#film').innerHTML = `
  <section class="scene" data-scene="hero" id="kunye" aria-labelledby="hero-title">
    ${sticky(`
      <h1 class="h1" id="hero-title">${ad}</h1>
      <p class="lead lead--what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="actions">
        <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>Ara</span></a>
        <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener" data-mag>${icons.pin}<span>Yol tarifi</span></a>
      </div>`, 'is-hero')}
  </section>
  <section class="svc-head" id="hizmetler" aria-labelledby="svc-title">
    <div class="wrap">
      <h2 class="h2" id="svc-title">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
  </section>
  ${gruplar.map((g) => `
    <section class="scene" data-scene="${g.s}" style="--len:${LEN[g.s] + (g.list.length > 1 ? 80 : 100) * g.list.length}vh" aria-label="${esc(g.list.map((h) => h.baslik).join(', '))}">
      ${sticky(g.list.map((h, i) => `
        <article class="beat" data-beat="${i}">
          ${h.etiket ? `<p class="kicker">${esc(h.etiket)}</p>` : ''}
          <h3 class="h2" data-reveal>${esc(h.baslik)}</h3>
          <p class="lead">${esc(h.aciklama)}</p>
          <p class="row"><span class="dur">Süre: <b>${esc(h.sure)}</b></span><span class="beat__n" aria-hidden="true">${String(h.no).padStart(2, '0')} / ${String(sira).padStart(2, '0')}</span></p>
        </article>`).join(''))}
    </section>`).join('')}`;

const B = import.meta.env.BASE_URL;
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2 h2--ink" id="about-title" data-reveal>Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
    </div>
    <div class="about__side">
      <ul class="bubbles">
        <li class="bubble bubble--0"><b>${yas} yıl</b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li class="bubble bubble--1"><b>${acikGun} gün</b><span>haftada açık</span></li>
      </ul>
      <figure class="about__img"><img src="${B}img/sektor-yikama/ic-mekan.jpg" alt="Detaylı temizlikten çıkmış araç içi" loading="lazy" decoding="async" width="1200" height="800"></figure>
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2 h2--ink" id="visit-title" data-reveal>Çalışma saatleri ve konum</h2>
      <p class="visit__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
      </table>
      <address class="visit__addr">${esc(d.iletisim.adres)}</address>
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
  <div class="reviews__rail" data-lenis-prevent-touch><ul class="reviews__track">
    ${d.yorumlar.map((y, i) => `
      <li class="review review--${i % 3}">
        ${stars(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <span class="review__who">${esc(y.ad)} · ${esc(y.arac)}</span>
      </li>`).join('')}
  </ul></div>`;

$('#iletisim').innerHTML = `
  <div class="wrap contact__in">
    <h2 class="h1 contact__title" id="contact-title" data-reveal>İletişim</h2>
    <p class="lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="actions">
      <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="contact__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a class="foot__tel" href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.</p>
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
  gsap.killTweensOf(split.chars);
  gsap.fromTo(split.chars,
    { opacity: 0, yPercent: 60, scale: 0.4, rotate: () => gsap.utils.random(-25, 25) },
    { opacity: 1, yPercent: 0, scale: 1, rotate: 0, duration: 0.7, stagger: { each: 0.018, from: 'random' }, ease: 'back.out(2.2)' });
}

if (!reducedMotion) {
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', toggleActions: 'play none none none', onEnter: () => reveal(el) });
  });
}

ScrollTrigger.create({
  trigger: '.solid',
  start: 'top 60px',
  end: 'bottom 60px',
  onToggle: (self) => {
    $('#top').classList.toggle('is-solid', self.isActive);
    document.documentElement.classList.toggle('in-solid', self.isActive);
  },
});

if (!reducedMotion) {
  $$('.bubble').forEach((b, i) => {
    gsap.from(b, { scale: 0.2, opacity: 0, duration: 0.9, ease: 'elastic.out(1, 0.55)', delay: i * 0.08, scrollTrigger: { trigger: b, start: 'top 90%', toggleActions: 'play none none none' } });
  });
}

// --- 3D sahne ve hizmet filmi ----------------------------------------------------------
const canvas = $('#gl');
const world = createWorld(canvas, { name: d.isletme.ad, phone, low });
const { S } = world;
addEventListener('resize', () => {
  world.resize();
  measure();
});

const DEFAULTS = { ...S };
const reset = () => Object.assign(S, DEFAULTS);

const scenes = $$('.scene');
let layout = [];
function measure() {
  layout = scenes.map((el) => {
    const r = el.getBoundingClientRect();
    return { el, copy: el.querySelector('.copy'), sticky: el.querySelector('.scene__sticky'), name: el.dataset.scene, n: $$('.beat', el).length, top: r.top + scrollY, height: el.offsetHeight };
  });
}

const beats = new Map();
function setBeat(sceneEl, idx) {
  if (beats.get(sceneEl) === idx) return;
  beats.set(sceneEl, idx);
  $$('.beat', sceneEl).forEach((b) => {
    const on = Number(b.dataset.beat) === idx;
    b.classList.toggle('is-on', on);
    if (on) reveal($('[data-reveal]', b));
  });
}
// Sahnedeki hizmet sırası: ilerleme hizmet sayısına eşit dilimlere bölünür
const beatOf = (p, n) => Math.min(n - 1, Math.floor(p * n));

function clean() {
  S.dirt = 0;
  S.rinse = -4;
  S.foam = 0;
  S.dust = 0;
  S.tireShine = 1;
}

const PREV = { hero: 'hero', kopuk: 'hero', durulama: 'kopuk', jant: 'durulama', ic: 'jant', cila: 'ic', filo: 'cila' };
function enterView(name, p, span = 0.22) {
  world.view(name, ease(seg(p, 0, span)), PREV[name]);
}

const SCENES = {
  hero(p) {
    world.view('hero');
    world.orbit(p * 14, 0, -p * 0.6);
    S.lights = 1;
  },
  kopuk(p) {
    enterView('kopuk', p, 0.2);
    world.orbit(-10 + p * 22, 0, -p * 0.8);
    S.spray = seg(p, 0.06, 0.12) * (1 - seg(p, 0.4, 0.47));
    S.sprayX = 2.6 - 5.2 * seg(p, 0.07, 0.44);
    S.dirt = 1 - 0.35 * seg(p, 0.1, 0.44);
    S.fall = seg(p, 0.42, 0.52) * (1 - seg(p, 0.9, 0.98));
    S.foam = ease(seg(p, 0.46, 0.88));
  },
  durulama(p) {
    enterView('durulama', p, 0.18);
    world.orbit(-8 + p * 16);
    S.dirt = 0.65;
    S.foam = 1;
    S.rinse = 2.7 - 5.6 * seg(p, 0.1, 0.68);
    S.curtain = seg(p, 0.06, 0.12) * (1 - seg(p, 0.66, 0.74));
    S.wet = seg(p, 0.15, 0.4) * (1 - 0.6 * seg(p, 0.78, 1));
    S.gleam = -3.5 + 7 * seg(p, 0.72, 0.98);
    S.gleamAmt = seg(p, 0.72, 0.78) * (1 - seg(p, 0.94, 1));
  },
  jant(p) {
    enterView('jant', p, 0.25);
    world.orbit(-6 + p * 10);
    clean();
    S.dust = 1 - ease(seg(p, 0.3, 0.68));
    S.tireShine = ease(seg(p, 0.62, 0.88));
    S.spinAngle = p * 7;
    S.spray = seg(p, 0.28, 0.33) * (1 - seg(p, 0.62, 0.68)) * 0.7;
    S.sprayX = 1.34;
  },
  ic(p) {
    enterView('ic', p, 0.14);
    world.orbit(-6 + p * 12);
    clean();
    S.xray = ease(seg(p, 0.04, 0.14)) * (1 - ease(seg(p, 0.92, 0.99)));
    S.scan = 2.2 - 4.4 * seg(p, 0.14, 0.9);
    S.neon = 1 - 0.7 * S.xray;
  },
  cila(p) {
    enterView('cila', p, 0.2);
    world.orbit(-8 + p * 16);
    clean();
    S.swirl = 1;
    S.arch = 0;
    S.polisher = ease(seg(p, 0.1, 0.18)) * (1 - ease(seg(p, 0.76, 0.84)));
    S.polishPath = seg(p, 0.14, 0.78);
    const px = 2.05 - S.polishPath * 1.4;
    S.polish = p < 0.78 ? px + 0.05 : px + 0.05 - 4 * seg(p, 0.78, 0.86);
    S.gleam = -3.5 + 7.5 * seg(p, 0.84, 1);
    S.gleamAmt = seg(p, 0.84, 0.88);
  },
  filo(p) {
    enterView('filo', p, 0.18);
    world.orbit(-6 + p * 10);
    clean();
    S.fleet = p > 0.03 ? 1 : 0;
    S.fleetP = seg(p, 0.05, 0.98);
  },
};

let active = null;
function tick() {
  const y = scrollY;
  const vh = innerHeight;
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * 0.5) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  // Sahne biterken yukarı kayan metin sönsün
  for (const l of layout) {
    if (!l.copy) continue;
    const o = y - (l.top + l.height - vh);
    const a = o <= 0 ? 1 : clamp(1 - o / (vh * 0.3));
    const r = Math.round(a * 50) / 50;
    if (l.a !== r) {
      l.a = r;
      l.copy.style.opacity = r === 1 ? '' : String(r);
      l.copy.style.visibility = r === 0 ? 'hidden' : '';
      l.sticky?.style.setProperty('--fade', r === 1 ? '' : String(r));
    }
  }
  reset();
  SCENES[cur.name](p, cur.el);
  if (cur.n) setBeat(cur.el, beatOf(p, cur.n));
  if (active !== cur.el) active = cur.el;
}

// Kanvas yalnız film görünürken çizilir
let canvasOn = true;
new IntersectionObserver(([e]) => {
  canvasOn = e.isIntersecting;
  canvas.classList.toggle('is-off', !canvasOn);
}).observe($('#film'));

// Telefonda başlık aşağı kaydırınca saklanır
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader($('#top'), { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

function start() {
  measure();
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    reset();
    world.view('hero');
    world.snap();
    S.lights = 1;
    const draw = () => world.render();
    draw();
    setTimeout(draw, 1500);
    addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true });
    return;
  }
  initSmoothScroll({ lerp: 0.1 });
  ScrollTrigger.addEventListener('refresh', measure);
  ScrollTrigger.refresh();
  tick();
  world.snap();
  gsap.ticker.add(() => {
    tick();
    if (canvasOn) world.render();
  });
  $$('[data-mag]').forEach((b) => magnetic(b, 0.3));
  // Açılış: künye satırları gelir (perde yok)
  gsap.from('.is-hero .copy > *', { y: 18, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
}

world.view('hero');
world.snap();
world.render();
document.fonts?.ready.then(() => world.setName(d.isletme.ad));
start();
addEventListener('load', () => ScrollTrigger.refresh());
