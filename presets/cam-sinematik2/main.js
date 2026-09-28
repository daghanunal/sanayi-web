import '../../shared/base.css';
import './style.css';
import raw from '../../data/kristal.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld, SPECTRUM } from './scene.js';

// Prizma: sinematik aile, 3D yalnız açılışta. Künyenin arkasında camdan geçip tayfa ayrılan ışık; künye
// ekrandan çıkarken cam katmanlarına ayrılır (dış cam, ara film, iç cam). Künyeden sonra kanvas çizilmez;
// gerisi düz site: Hizmetler, Çalışma sırası, Hakkında, Saatler ve konum, Örnek yorumlar, İletişim.
gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, preset: 'cam-sinematik2' });
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
const no = (i) => String(i + 1).padStart(2, '0');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const logo = `<svg viewBox="0 0 34 24" aria-hidden="true"><path d="M13 3 23 21H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M0 12h9" stroke="currentColor" stroke-width="1.6" opacity=".7"/>${SPECTRUM.map((c, i) => `<path d="M17 12 34 ${5 + i * 2.3}" stroke="${c}" stroke-width="1.3"/>`).join('')}</svg>`;
const hue = (i, n) => SPECTRUM[Math.round((i / Math.max(1, n - 1)) * (SPECTRUM.length - 1))];

// --- Render ----------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne">${logo}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

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
      <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="services-title" data-reveal>Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <ul class="svc">
      ${d.hizmetler.map((h, i, a) => `
        <li class="svc__row" style="--c:${hue(i, a.length)}">
          <span class="svc__n">${no(i)}</span>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <span class="svc__time">${esc(h.sure)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

$('#calisma').innerHTML = `
  <div class="wrap process__grid">
    <div class="sec-head">
      <h2 class="h2" id="process-title" data-reveal>Çalışma sırası</h2>
      <p class="lead">Kaskolu araçlarda hasar dosyası buradan açılır. Anlaşmalı sigorta şirketlerinin güncel listesi için arayın.</p>
    </div>
    <ol class="flow" id="flow">
      <span class="flow__beam" aria-hidden="true"><i></i></span>
      ${d.surec.map((s, i, a) => `<li style="--c:${hue(i, a.length)}"><span class="flow__dot">${i + 1}</span><b>${esc(s.baslik)}</b><p>${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
  </div>`;

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2" id="about-title" data-reveal>Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stats">
        <li style="--c:${SPECTRUM[0]}"><b>${yas} yıl</b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li style="--c:${SPECTRUM[4]}"><b>${acikGunSayisi(d.saatler)} gün</b><span>haftada açık</span></li>
      </ul>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Cam takılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <ul class="gallery" data-lenis-prevent-touch aria-label="Atölyeden fotoğraflar">
    ${d.galeri.map((g, i) => `<li class="gallery__item" style="--c:${SPECTRUM[(i * 2) % 7]}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="1400" height="1050"><span class="gallery__alt">${esc(g.alt)}</span></li>`).join('')}
  </ul>`;

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
      <h2 class="h2" id="visit-title" data-reveal>Çalışma saatleri ve konum</h2>
      <p class="visit__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="actions">
        <a class="btn btn--main" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="reviews-title" data-reveal>Örnek yorumlar</h2>
      <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </div>
    <ul class="review-list" tabindex="0" aria-label="Örnek yorumlar" data-lenis-prevent-touch>
      ${d.yorumlar.map((y, i) => `
        <li class="review" style="--c:${SPECTRUM[(i * 3) % 7]}">
          ${stars(y.puan)}
          <p>${esc(y.metin)}</p>
          <span class="review__who"><b>${esc(y.ad)}</b>${esc(y.arac)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="h1 h1--final" id="final-title" data-reveal>İletişim</h2>
    <div>
      <p class="lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Camın fotoğrafı WhatsApp'tan gönderilebilir.</p>
      <div class="actions">
        <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
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

// --- Başlıklar: tayf gibi dağılıp toplanır ---------------------------------------------

const splits = new Map();
function reveal(el) {
  if (reducedMotion || !el) return;
  let split = splits.get(el);
  if (!split) {
    split = new SplitText(el, { type: 'words,chars', wordsClass: 'w', charsClass: 'ch' });
    splits.set(el, split);
  }
  gsap.killTweensOf([el, ...split.chars]);
  gsap.fromTo(split.chars, { opacity: 0, x: (i) => ((i % 3) - 1) * 14, '--disp': 7 }, {
    opacity: 1, x: 0, '--disp': 0, duration: 0.8, stagger: 0.018, ease: 'power3.out',
  });
}

const bir = (trigger, start = 'top 86%') => ({ trigger, start, toggleActions: 'play none none none' });
const topEl = $('#top');
ScrollTrigger.create({
  trigger: '#solid', start: 'top 60px', end: 'bottom 60px',
  onToggle: (self) => topEl.classList.toggle('is-solid', self.isActive),
});
if (phone) autoHideHeader(topEl, { offset: 120 });

if (!reducedMotion) {
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 86%', toggleActions: 'play none none none', onEnter: (s) => { if (!s.done) { s.done = true; reveal(el); } } });
  });
  // Hizmet satırları: ekranın ortasındaki satırdan ışık geçer
  $$('.svc__row').forEach((row) => {
    ScrollTrigger.create({ trigger: row, start: 'top 66%', end: 'bottom 34%', onToggle: (self) => row.classList.toggle('is-lit', self.isActive) });
  });
  // Çalışma sırası: ışın aşağı iner, adımlar sırayla yanar
  gsap.fromTo('.flow__beam i', { scaleY: 0 }, {
    scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#flow', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
  });
  $$('#flow li').forEach((li) => ScrollTrigger.create({ trigger: li, start: 'top 68%', onEnter: () => li.classList.add('is-on'), onLeaveBack: () => li.classList.remove('is-on') }));
  // Galeri: kareler tayf gibi üç renge ayrılıp birleşir
  $$('.gallery__item').forEach((it) => ScrollTrigger.create({ ...bir(it, 'top 92%'), onEnter: () => it.classList.add('is-in') }));
  gsap.from('.stats li', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('.stats', 'top 90%') });
} else {
  $$('.svc__row, #flow li, .gallery__item').forEach((r) => r.classList.add('is-lit', 'is-on', 'is-in'));
}

// --- 3D: yalnız künyede ------------------------------------------------------------------

const canvas = $('#gl');
const heroEl = $('#sahne');
const worldP = createWorld(canvas, { phone, low });
let world = null;
let S = null;
let DEFAULTS = null;
const reset = () => Object.assign(S, DEFAULTS);
addEventListener('resize', () => world?.resize());
const intro = { gleam: -2, amt: 0 };

// Künye ekrandan çıkarken (p: 0 → 1) kamera yana döner, cam katmanlarına ayrılır, ışık söner.
function tick() {
  const r = heroEl.getBoundingClientRect();
  const p = clamp(-r.top / Math.max(1, r.height));
  reset();
  world.view('katman', ease(seg(p, 0.05, 0.7)), 'hero');
  S.beam = 1 - seg(p, 0.1, 0.6) * 0.8;
  S.spec = S.beam;
  S.split = ease(seg(p, 0.25, 0.8));
  S.spin = 0.25 * (1 - seg(p, 0, 0.4));
  S.gleam = intro.gleam;
  S.gleamAmt = intro.amt;
}

let canvasOn = true;
new IntersectionObserver(([e]) => {
  canvasOn = e.isIntersecting;
  canvas.classList.toggle('is-off', !canvasOn);
}).observe(heroEl);

function start() {
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    world.view('hero');
    world.snap();
    reset();
    S.beam = S.spec = 1;
    world.render();
    return;
  }
  initSmoothScroll({ lerp: 0.1 });
  tick();
  world.snap();
  gsap.ticker.add(() => {
    if (!canvasOn || document.hidden) return;
    tick();
    world.render();
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}

// --- Açılış (~1 sn): karanlıkta bir ışık prizmadan geçip tayfa ayrılır; dokununca geçer ---

function introScreen() {
  const el = $('#intro');
  if (reducedMotion) {
    el.remove();
    return Promise.resolve();
  }
  document.documentElement.classList.add('is-intro');
  const w = innerWidth;
  const h = innerHeight;
  const svg = $('#intro-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const s = Math.min(w * 0.34, h * 0.24, 200);
  const cx = w * (phone ? 0.42 : 0.44);
  const cy = h * (phone ? 0.4 : 0.44);
  const A = [cx, cy - s * 0.62];
  const B = [cx + s * 0.62, cy + s * 0.5];
  const Cc = [cx - s * 0.62, cy + s * 0.5];
  // giriş noktası sol yüzde, çıkış sağ yüzde
  const pin = [cx - s * 0.3, cy];
  const pout = [cx + s * 0.28, cy - s * 0.02];
  const rays = SPECTRUM.map((c, i) => {
    const ang = -0.09 + i * 0.05;
    const L = Math.hypot(w, h);
    return `<path class="ir" d="M${pout[0]} ${pout[1]} L${pout[0] + Math.cos(ang) * L} ${pout[1] + Math.sin(ang) * L}" stroke="${c}" pathLength="1"/>`;
  }).join('');
  svg.innerHTML = `
    <defs><filter id="gl0" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <path class="iin" d="M-10 ${cy - s * 0.35} L${pin[0]} ${pin[1]}" pathLength="1"/>
    <path class="iin iin--glow" d="M-10 ${cy - s * 0.35} L${pin[0]} ${pin[1]}" pathLength="1" filter="url(#gl0)"/>
    <path class="iinside" d="M${pin[0]} ${pin[1]} L${pout[0]} ${pout[1]}" pathLength="1"/>
    <g class="irays">${rays}</g>
    <g class="irays irays--glow" filter="url(#gl0)">${rays}</g>
    <path class="iprism" d="M${A} L${B} L${Cc} Z" pathLength="1"/>`;

  let done = false;
  return new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      tl.kill();
      gsap.to(el, { autoAlpha: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => {
        el.remove();
        document.documentElement.classList.remove('is-intro');
      } });
      resolve();
    };
    // perde dokunmayı yutmaz: ilk dokunuş hem perdeyi kaldırır hem alttaki düğmeye ulaşır
    addEventListener('pointerdown', finish, { once: true, capture: true });
    addEventListener('wheel', finish, { once: true, passive: true });
    addEventListener('keydown', finish, { once: true });
    // toplam ~1 sn; dokununca hemen kalkar
    const tl = gsap.timeline({ onComplete: finish, defaults: { ease: 'power2.inOut' } });
    tl.fromTo('.iprism', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3 }, 0.02)
      .fromTo('.iin', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.22, ease: 'power1.in' }, 0.2)
      .fromTo('.iinside', { strokeDashoffset: 1, opacity: 0.2 }, { strokeDashoffset: 0, opacity: 1, duration: 0.08, ease: 'none' }, 0.42)
      .fromTo('.ir', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.36, stagger: 0.015, ease: 'power2.out' }, 0.5)
      .to({}, { duration: 0.08 });
  });
}

const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))]);
fontsReady.then(introScreen).then(() => {
  reveal($('#hero-title'));
  if (!reducedMotion) {
    gsap.from('.hero__inner > :not(h1)', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
    gsap.timeline({ delay: 0.2 })
      .to(intro, { amt: 1, duration: 0.3 }, 0)
      .to(intro, { gleam: 2, duration: 1.8, ease: 'power1.inOut' }, 0)
      .to(intro, { amt: 0, duration: 0.3 }, 1.5);
  }
});
worldP.then((w) => {
  world = w;
  if (import.meta.env.DEV) window.__world = w;
  S = w.S;
  DEFAULTS = { ...S };
  world.view('hero');
  world.snap();
  world.render();
  canvas.classList.add('is-ready');
  start();
});
