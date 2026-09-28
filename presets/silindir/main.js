import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { createEngine, stopForService, STOPS } from './engine.js';

// Silindir (sinematik aile): 3D iki yerde kalır. (1) Künyenin arkasında rölantideki motor.
// (2) Hizmetler: motor parça parça açılır, her hizmette kamera ilgili parçaya gider; etiket parçanın adıdır.
// Hizmetlerden sonra sahne kararır ve çizim durur; gerisi normal site bölümleridir.
const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const clamp = gsap.utils.clamp;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);

// --- Üst çubuk --------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -----------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--hot" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler: her hizmet motorun bir parçasına bağlanır --------------------------------

const stopKeys = d.hizmetler.map((h) => stopForService(h.baslik));
$('#hizmetler').innerHTML = `
  <div class="parts__head">
    <h2 id="parts-h" class="h2">Hizmetler</h2>
    <p class="parts__lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <div class="parts__stops">
    ${d.hizmetler.map((h, i) => `
      <div class="stop">
        <article class="tag">
          <span class="tag__hole" aria-hidden="true"></span>
          ${STOPS[stopKeys[i]].label ? `<p class="tag__part">${esc(STOPS[stopKeys[i]].label)}</p>` : ''}
          <h3 class="tag__t">${esc(h.baslik)}</h3>
          <p class="tag__d">${esc(h.aciklama)}</p>
          <p class="tag__time">Süre: <strong>${esc(h.sure)}</strong></p>
          <div class="tag__rail" aria-hidden="true">${d.hizmetler.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        </article>
      </div>`).join('')}
  </div>`;

// --- Hakkında ------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div>
      <h2 id="about-h" class="h2">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <dl class="stats">
    <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span> <small>yıl</small></dd></div>
    <div class="stat"><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span> <small>gün</small></dd></div>
  </dl>`;

// --- Çalışma saatleri ve konum --------------------------------------------------------------

$('#saatler').innerHTML = `
  <h2 id="visit-h" class="h2">Çalışma saatleri ve konum</h2>
  <div class="visit__grid">
    <article class="panel">
      <span class="panel__tube" aria-hidden="true"></span>
      <h3 class="panel__h">Çalışma saatleri</h3>
      <p class="status status--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <dl class="hours">${saatListesi(d.saatler).map(([g, h]) => `<div class="hours__row"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('')}</dl>
    </article>
    <article class="panel panel--map">
      <span class="panel__tube" aria-hidden="true"></span>
      <h3 class="panel__h">Adres</h3>
      <p class="panel__addr">${esc(d.iletisim.adres)}</p>
      <div class="map" data-map></div>
      <div class="panel__actions">
        <a class="btn btn--hot" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </article>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="reviews__head">
    <h2 id="rev-h" class="h2">Örnek yorumlar</h2>
    <p class="reviews__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="quotes" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="quote">
        <span class="quote__stars" role="img" aria-label="5 üzerinden ${y.puan}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < y.puan ? 'on' : ''}">${icons.star}</i>`).join('')}</span>
        <blockquote class="quote__t">${esc(y.metin)}</blockquote>
        <p class="quote__who"><strong>${esc(y.ad)}</strong> <span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim -----------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="finale__cta">
    <h2 id="final-h" class="finale__h">İletişim</h2>
    <p class="finale__p">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="finale__actions">
      <a class="btn btn--hot btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. 3D motor görseli temsilîdir, belirli bir marka ya da modeli göstermez. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '800px 0px' }).observe(mapBox);

// --- Motor ------------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

const engine = createEngine($('.stage'), { reducedMotion });
const S = engine.state;
engine.setStops(stopKeys);

const callout = $('.callout');
const cLine = $('.callout__line line');
const cDot = $('.callout__dot');
const cLabel = $('.callout__label');
const wide = matchMedia('(min-width: 900px)');
let lastStop = -1;
let inServices = false;
engine.onFrame((p) => {
  const a = inServices && STOPS[stopKeys[p.stop]]?.label ? p.alpha : 0;
  callout.style.opacity = a.toFixed(3);
  if (a <= 0.01) return;
  if (p.stop !== lastStop) {
    lastStop = p.stop;
    cLabel.textContent = STOPS[stopKeys[p.stop]].label;
  }
  cDot.style.transform = `translate(${p.x}px, ${p.y}px)`;
  if (!wide.matches) return; // telefonda yalnız nokta: parça adı kartın üstünde yazıyor
  const w = innerWidth;
  const left = p.x > w * 0.55;
  const lw = cLabel.offsetWidth;
  let lx = p.x + (left ? -1 : 1) * Math.min(90, w * 0.16);
  lx = left ? Math.max(lw + 10, lx) : Math.min(w - lw - 10, lx);
  const ly = Math.max(90 + cLabel.offsetHeight, p.y - Math.min(90, innerHeight * 0.1));
  cLabel.style.transform = `translate(${left ? `calc(${lx}px - 100%)` : `${lx}px`}, calc(${ly}px - 100%))`;
  cLine.setAttribute('x1', p.x);
  cLine.setAttribute('y1', p.y);
  cLine.setAttribute('x2', lx);
  cLine.setAttribute('y2', ly);
});

if (reducedMotion) {
  root.classList.add('rm');
  S.intro = 0;
  engine.renderOnce();
  addEventListener('resize', () => engine.renderOnce());
  $$('.panel').forEach((p) => p.classList.add('is-lit'));
} else {
  const lenis = initSmoothScroll();
  lenis?.on('scroll', (e) => (S.velocity = e.velocity));
  engine.start();

  // Açılış: motor yaklaşır, künye satır satır gelir (bir kez, ~1 sn, kaydırmayı kilitlemez).
  gsap.to(S, { intro: 0, duration: 1.4, ease: 'expo.out', delay: 0.1 });
  gsap.from('.hero__inner > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  // Künyeden çıkış: kamera yükselir.
  gsap.fromTo(S, { hero: 0 }, { hero: 1, ease: 'none', scrollTrigger: { trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: true } });

  // Hizmetler başlığı geçilirken motor açılır; kartlar gelince tur başlar.
  gsap.fromTo(S, { explode: 0 }, { explode: 1, ease: 'none', scrollTrigger: { trigger: '.parts__head', start: 'top 90%', end: 'bottom 30%', scrub: true } });
  const n = stopKeys.length;
  gsap.fromTo(S, { tourIn: 0 }, { tourIn: 1, ease: 'none', scrollTrigger: { trigger: '.parts__stops', start: 'top bottom', end: 'top 40%', scrub: true } });
  ScrollTrigger.create({
    trigger: '.parts__stops', start: 'top center', end: 'bottom center',
    onUpdate: (self) => (S.tour = clamp(0, n - 1, self.progress * n - 0.5)),
    onToggle: (self) => (inServices = self.isActive),
  });
  // Telefonda hizmet kartı ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
  ScrollTrigger.create({
    trigger: '.parts__stops', start: 'top 92%', end: 'bottom 90%',
    onToggle: (s) => setStoryMode(s.isActive ? true : null),
  });
  $$('.stop').forEach((stop) => {
    const tag = $('.tag', stop);
    gsap.fromTo(tag, { '--in': 0, y: 50 }, { '--in': 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: stop, start: 'top 88%', end: 'top 60%', scrub: 0.5 } });
    gsap.fromTo(tag, { '--out': 0 }, {
      '--out': 1, ease: 'power1.in', immediateRender: false,
      scrollTrigger: wide.matches
        ? { trigger: stop, start: 'bottom 75%', end: 'bottom 50%', scrub: 0.3 }
        : { trigger: stop, start: 'bottom bottom', end: 'bottom 84%', scrub: 0.3 },
    });
  });

  // Hizmetlerden sonra sahne kararır; Hakkında ekranı kaplayınca çizim durur.
  gsap.fromTo(S, { dim: 0 }, { dim: 1, ease: 'none', scrollTrigger: { trigger: '#hakkinda', start: 'top 95%', end: 'top 35%', scrub: true } });
  ScrollTrigger.create({
    trigger: '#hakkinda', start: 'top top', end: 'max',
    onEnter: () => (S.covered = true),
    onLeaveBack: () => (S.covered = false),
  });
  gsap.ticker.add(() => root.style.setProperty('--dim', S.dim.toFixed(3)));

  // Rakamlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });
  // Saat panellerinin floresanı bir kez yanar.
  $$('.panel').forEach((p) => ScrollTrigger.create({ trigger: p, start: 'top 80%', once: true, onEnter: () => p.classList.add('is-lit') }));

  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
}
