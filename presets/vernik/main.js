import raw from '../../data/showroom.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, setStoryMode, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createScene } from './scene.js';

// Vernik (sinematik). 3D iki yerde kalır:
//  (1) Açılış: fırınlı kabinde vernikli araç, kabin ışıkları bir kez titreyerek yanar.
//  (2) Hizmetler: her hizmete gelince kamera ilgili yere gider ve o iş sahnede gösterilir
//      (boya tabancası, yan yüzeyde ışık bandı, pasta sonrası parlaklık, seramikte su, far üstünde film, jant).
// Hizmetlerden sonra sahne durur; gerisi normal site bölümleridir.

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const mobile = matchMedia('(max-width: 899px)').matches;
matchMedia('(max-width: 899px)').addEventListener('change', () => location.reload());

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ext = 'target="_blank" rel="noopener"';
const fotoMesaj = `Merhaba ${d.isletme.ad}, aracımdaki hasarın fotoğraflarını gönderiyorum. Fiyat öğrenebilir miyim?`;

// Hizmet → sahne. Etiket, sahnede gösterilen yerin adıdır.
const SAHNE = [
  { re: /göçük/i, key: 'gocuk', yer: 'Kapı ve çamurluk sacı' },
  { re: /kaporta|şase/i, key: 'kaporta', yer: 'Arka çamurluk ve bagaj' },
  { re: /pasta|cila/i, key: 'pasta', yer: 'Kaput ve tavan verniği' },
  { re: /seramik/i, key: 'seramik', yer: 'Kaput yüzeyi' },
  { re: /ppf|film/i, key: 'ppf', yer: 'Ön tampon, kaput ve farlar' },
  { re: /temizlik|yıkama/i, key: 'temizlik', yer: 'Jant ve kaliper' },
  { re: /boya/i, key: 'boya', yer: 'Kapı, kapı içi ve çamurluk' },
];
const hizmetler = d.hizmetler.map((h) => ({ ...h, sahne: SAHNE.find((s) => s.re.test(h.baslik)) ?? { key: 'genel', yer: '' } }));

// --- Render ------------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand ${d.isletme.ad.length > 24 ? 'is-long' : ''}" href="#hero">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">
    <span class="dot ${st.open ? 'is-open' : ''}" data-status-dot></span>
    <span class="top__num">${tel}</span>
    <span class="top__icon">${icons.phone}</span>
  </a>`;

$('#hero').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}" data-status data-kunye><span data-long>${esc(st.kunye)}</span></dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--paint" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="svcs__head">
    <h2 class="big" id="svcs-title">Hizmetler</h2>
    <p class="svcs__sub">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  ${hizmetler.map((h, i) => `
    <article class="svc" data-i="${i}" data-key="${h.sahne.key}">
      <div class="svc__card">
        ${h.sahne.yer ? `<p class="svc__tag">${esc(h.sahne.yer)}</p>` : ''}
        <h3 class="svc__title">${esc(h.baslik)}</h3>
        <p class="svc__text">${esc(h.aciklama)}</p>
        ${h.sure ? `<p class="svc__time">Süre: <b>${esc(h.sure)}</b></p>` : ''}
      </div>
    </article>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="about__inner">
    <h2 class="big" id="about-title">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="stats">
      <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span> yıl</dd></div>
      <div><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd></div>
    </dl>
  </div>`;

$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="big big--m" id="shop-title">Çalışma saatleri ve konum</h2>
    <p class="status status--big ${st.open ? 'is-open' : ''}" data-status><span data-long>${esc(st.metin)}</span></p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <address class="shop__addr">${esc(d.iletisim.adres)}</address>
    <div class="shop__cta">
      <a class="btn btn--paint" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="shop__map" data-map></div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <div class="voices__head">
    <h2 class="big big--m" id="voices-title">Örnek yorumlar</h2>
    <p class="voices__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="voices__list">
    ${d.yorumlar.map((y) => `
      <li class="review">
        <p class="review__stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</p>
        <blockquote class="review__txt">${esc(y.metin)}</blockquote>
        <p class="review__who"><b>${esc(y.ad)}</b> <span>${esc(y.arac || '')}</span></p>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <div class="finale__inner">
    <h2 class="finale__title" id="finale-title">İletişim</h2>
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Hasarın fotoğrafı WhatsApp'tan gönderilebilir.</p>
    <div class="finale__actions">
      <a class="btn btn--paint btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d, fotoMesaj)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br><span data-status><span data-long>${esc(st.metin)}</span></span></p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__inner">
    <p class="foot__brand">${ad}</p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__credit">© ${yil} ${ad}. 3D görseller temsilîdir, araç belirli bir marka ya da modeli göstermez. Yorumlar örnektir.</p>
  </div>`;

// Harita yaklaşınca yüklenir
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  $('[data-map]').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('[data-map]'));

function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
  $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
}
setInterval(refreshStatus, 60_000);

// --- 3D sahne -----------------------------------------------------------------------------------

const canvas = $('[data-stage]');
let stage = null;
try {
  stage = createScene(canvas, { reduced: reducedMotion });
  stage.setPaint('#7a0911', { instant: true });
} catch (err) {
  console.warn('WebGL yok, fotoğrafla devam', err);
  $('.stage').style.background = `center / cover no-repeat url(${import.meta.env.BASE_URL}img/showroom/hero.jpg)`;
}
const S = stage?.state ?? {};

const loaderEl = $('[data-loader]');
const loadBar = $('[data-load-bar]');
const loadP = stage
  ? stage.load((p) => (loadBar.style.transform = `scaleX(${p.toFixed(3)})`))
    .catch((e) => console.error(e))
    .finally(() => loaderEl.classList.add('is-done'))
  : Promise.resolve();
if (!stage) loaderEl.classList.add('is-done');

// Kamera pozları (dünya uzayı: aracın önü -Z, sol yanı -X)
const POSES = {
  hero: { px: -4.5, py: 1.3, pz: -5.5, tx: 0, ty: 0.55, tz: -0.1, fitK: 0.82 },
  head: { px: -6.6, py: 1.45, pz: -0.4, tx: 0, ty: 0.6, tz: 0, fitK: 1 },
  boya: { px: -5.2, py: 2.0, pz: 4.6, tx: 0, ty: 0.55, tz: 0.2, fitK: 1 },
  gocuk: { px: -6.2, py: 1.0, pz: -1.2, tx: 0, ty: 0.62, tz: 0.2, fitK: 1 },
  kaporta: { px: 1.2, py: 2.6, pz: 7.0, tx: 0, ty: 0.55, tz: 0, fitK: 1 },
  pasta: { px: 6.9, py: 3.1, pz: 1.9, tx: -0.15, ty: 0.55, tz: 0, fitK: 1 },
  seramik: { px: 0.9, py: 3.8, pz: -4.0, tx: 0, ty: 0.85, tz: -1.1, fitK: 0.5 },
  ppf: { px: -2.1, py: 1.0, pz: -4.4, tx: -0.5, ty: 0.72, tz: -1.9, fitK: 0.5 },
  temizlik: { px: -2.9, py: 0.55, pz: -2.9, tx: -0.8, ty: 0.42, tz: -1.3, fitK: 0.5 },
};
POSES.genel = POSES.head;
// Dikey ekranda araba metin kartının üstündeki banda sığdırılır (yakın planlar serbest)
for (const [k, v] of Object.entries(POSES)) {
  const close = ['seramik', 'ppf', 'temizlik'].includes(k);
  Object.assign(v, { fitCar: close ? 0 : 1, rTop: 0.12, rBot: 0.56 });
}
Object.assign(POSES.hero, { rTop: 0.1, rBot: 0.34 });
if (mobile) Object.assign(POSES.hero, { px: -2.8, py: 1.5, pz: -6.3 });
else if (innerWidth / innerHeight >= 1.2) {
  // Masaüstünde araç metnin karşı tarafında: künyede biraz daha sağda
  for (const v of Object.values(POSES)) v.viewX = -0.16;
  POSES.hero.viewX = -0.24;
}

// Bitmiş araç: boyalı, vernikli, filmsiz, kuru.
const BITMIS = { sweep: 1, gloss: 1, swap: 1, beads: 0, sheet: 0, film: 0, spray: 0, door: 0, head: 0.35, spin: 0, drive: 0, steer: 0 };
Object.assign(S, POSES.hero, BITMIS, { tubes: 0 });

let aktif = null;
function sahne(key) {
  if (!stage || key === aktif) return;
  aktif = key;
  gsap.killTweensOf(S);
  const pose = POSES[key] ?? POSES.genel;
  const cam = gsap.to(S, { ...pose, duration: 1.5, ease: 'power2.inOut' });
  const fx = gsap.timeline();
  fx.to(S, { ...BITMIS, tubes: 1, duration: 0.5 }, 0);
  if (key === 'boya') {
    // Astar grisi gövde, kapı açılır, tabanca önden arkaya süpürür (kapı içi dahil)
    fx.set(S, { sweep: 0 }, 0.3)
      .to(S, { door: 1, duration: 0.8, ease: 'power2.inOut' }, 0.5)
      .to(S, { spray: 1, duration: 0.2 }, 1.1)
      .to(S, { sweep: 1, duration: 2.4, ease: 'none' }, 1.2)
      .to(S, { spray: 0, duration: 0.3 }, 3.5)
      .to(S, { door: 0, duration: 0.9, ease: 'power2.inOut' }, 3.9);
  } else if (key === 'gocuk' || key === 'kaporta') {
    // Işık bandı yan yüzey boyunca kayar: sacdaki dalga böyle görünür
    fx.fromTo(S, { envRot: 0 }, { envRot: Math.PI * 0.9, duration: 3.2, ease: 'sine.inOut' }, 0.2);
  } else if (key === 'pasta') {
    fx.set(S, { gloss: 0.1 }, 0.4)
      .to(S, { gloss: 1, duration: 2.2, ease: 'power1.inOut' }, 0.9)
      .fromTo(S, { envRot: 0 }, { envRot: Math.PI * 1.1, duration: 3, ease: 'sine.inOut' }, 0.6);
  } else if (key === 'seramik') {
    fx.to(S, { beads: 1, duration: 1.4 }, 1.0).to(S, { sheet: 1, duration: 1.2, ease: 'power1.in' }, 2.8);
  } else if (key === 'ppf') {
    fx.fromTo(S, { film: 0 }, { film: 1, duration: 2.2, ease: 'power1.inOut' }, 0.9).to(S, { head: 1, duration: 0.5 }, 2.6);
  } else if (key === 'temizlik') {
    fx.to(S, { spin: 0.25, duration: 1 }, 0.5);
  }
  return { cam, fx };
}

// --- Başlatma ------------------------------------------------------------------------------------

const topEl = $('#top');
const svcEls = $$('.svc');

function start() {
  if (reducedMotion) {
    document.documentElement.classList.add('is-static');
    if (stage) {
      Object.assign(S, { tubes: 1 });
      stage.setActive(false);
      loadP.then(() => stage.renderOnce());
      addEventListener('resize', () => loadP.then(() => stage.renderOnce()));
    }
    topEl.classList.add('is-solid');
    return;
  }

  initSmoothScroll({ lerp: 0.09 });
  if (mobile) autoHideHeader(topEl, { offset: 120 });

  // Sahne yalnız künye ve hizmetler görünürken çizer
  ScrollTrigger.create({
    trigger: '#hero', start: 'top bottom', endTrigger: '#hizmetler', end: 'bottom top',
    onToggle: (s) => stage?.setActive(s.isActive),
  });
  stage?.setActive(true);
  ScrollTrigger.create({
    trigger: '#hakkinda', start: 'top 80px',
    onEnter: () => topEl.classList.add('is-solid'),
    onLeaveBack: () => topEl.classList.remove('is-solid'),
  });

  // Künye → hizmet başlığı: araç yan profile döner
  ScrollTrigger.create({ trigger: '.svcs__head', start: 'top 70%', end: 'bottom 30%', onToggle: (s) => s.isActive && sahne('head'), onLeaveBack: () => sahne('hero') });
  svcEls.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el, start: mobile ? 'top 55%' : 'top 60%', end: mobile ? 'bottom 55%' : 'bottom 40%',
      onToggle: (s) => {
        el.classList.toggle('is-active', s.isActive);
        if (s.isActive) sahne(hizmetler[i].sahne.key);
      },
    });
  });
  if (mobile) {
    // Hizmet kartları ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 40%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
    const setH = () => $$('.svc__card').forEach((c) => c.style.setProperty('--card-h', `${c.offsetHeight}px`));
    setH();
    addEventListener('resize', setH);
  }

  // Açılış: künye gelir; model yüklenince kabin ışıkları floresan gibi titreyerek yanar.
  const split = SplitText.create('.hero__title', { type: 'lines', linesClass: 'ln', mask: 'lines' });
  gsap.from(split.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: 'expo.out' });
  gsap.from(['.hero__what', '.kunye'], { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.15 });
  gsap.from('.hero__actions', { y: 12, opacity: 0, duration: 0.5, delay: 0.1 });
  loadP.then(() => {
    if (!stage) return;
    gsap.timeline()
      .to(S, { tubes: 0.18, duration: 0.06 })
      .to(S, { tubes: 0.02, duration: 0.08 })
      .to(S, { tubes: 0.45, duration: 0.07 }, '+=0.1')
      .to(S, { tubes: 0.12, duration: 0.05 })
      .to(S, { tubes: 1, duration: 1.1, ease: 'power2.out' }, '+=0.12');
    gsap.to(canvas, { opacity: 1, duration: 0.8 });
  });

  // Film sonrası bölümler: başlıklar ve sayılar
  $$('.about .big, .shop .big, .voices .big, .finale__title').forEach((h) => {
    const s = SplitText.create(h, { type: 'lines', linesClass: 'ln', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 110, duration: 0.9, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } });
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', toggleActions: 'play none none none',
      onEnter: () => gsap.fromTo(o, { v: 0 }, { v: to, duration: 1.4, ease: 'expo.out', onUpdate: () => (el.textContent = Math.round(o.v)) }),
    });
  });
  gsap.from('.review', { y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.voices__list', start: 'top 86%', toggleActions: 'play none none none' } });

  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
}

document.fonts.ready.then(start);
