import '../../shared/base.css';
import './style.css';
import raw from '../../data/kristal.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER, asset,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld } from './scene.js';
import { magnetic, initCursor, velocityMarquee } from './fx.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const ad = esc(d.isletme.ad);
const yil = new Date().getFullYear();
const tecrube = yil - d.isletme.kurulus;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');

// "2006'dan", "1994'ten", "2010'dan": yılın okunuşuna göre ek
function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}

const WA_FOTO = waHref(d, `Merhaba ${d.isletme.ad}, camımın fotoğrafını gönderiyorum. Tamir mi değişim mi, fiyat alabilir miyim?`);
const WA_KASKO = waHref(d, `Merhaba ${d.isletme.ad}, kaskom var. Ön cam değişimi için fotoğraf ve ruhsat gönderiyorum.`);
const status = openStatus(d.saatler);

// --- Render ----------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M3 18 7 3h18l4 15z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 7h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".45"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne" data-hot>${logo}<span>${ad}</span></a>
  <p class="top__status ${status.open ? 'is-open' : ''}"><i></i><span class="top__long">${esc(status.text)}</span><span class="top__short">${status.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn btn--small" href="${telHref(d)}" aria-label="Ara: ${esc(d.iletisim.telefon)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`;

const sticky = (inner, extra = '') => `<div class="scene__sticky ${extra}"><div class="copy">${inner}</div></div>`;

$('#sahne').innerHTML = sticky(`
  <div class="copy__a">
    <p class="who">${ad}, Şaşmaz Oto Sanayi'nde ${beri(d.isletme.kurulus)} beri</p>
    <h1 class="h1" id="hero-title" data-reveal>Yolu net görün.</h1>
  </div>
  <div class="copy__b">
    <p class="lead">${esc(d.isletme.slogan)}</p>
    <div class="actions">
      <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>Hemen ara</span></a>
      <a class="btn btn--ghost" href="${WA_FOTO}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>Camın fotoğrafını gönder</span></a>
    </div>
    <a class="kasko-chip" href="#kasko"><b>Kasko</b><span>Cam teminatınız varsa ön cam değişimi ücretsiz olabilir</span></a>
  </div>`, 'is-hero') + `<p class="scroll-hint" aria-hidden="true"><span></span>Kaydırın, yolda bir taş var</p>`;

$('#tas').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    <div class="copy__a"><h2 class="h2" id="tas-title" data-reveal>Yolda bir taş.</h2></div>
    <div class="copy__b"><p class="lead">Öndeki kamyonun lastiğinden fırlayan küçük bir taş, camda iz bırakır.</p></div>
  </div>
  <div class="beat" data-beat="1">
    <div class="copy__a"><h2 class="h2" data-reveal>Küçük bir iz, soğukta çatlağa döner.</h2></div>
    <div class="copy__b">
      <p class="lead">Isı farkı ve yol titreşimi izi büyütür. Bozuk para boyundan küçükse yarım saatte tamir ederiz, cam değişmez.</p>
      <div class="gauge" aria-hidden="true">
        <span class="gauge__lbl">Dış hava</span>
        <span class="gauge__val" id="temp">18°C</span>
        <span class="gauge__bar"><i id="temp-bar"></i></span>
      </div>
    </div>
  </div>`);

$('#recine').innerHTML = sticky(`
  <div class="copy__a">
    <h2 class="h2" id="recine-title" data-reveal>Reçineyle doldurur, UV ışıkla sertleştiririz.</h2>
    <p class="timer" aria-hidden="true"><span id="timer">00:00</span><small>dakika</small></p>
  </div>
  <div class="copy__b">
    <ol class="steps" id="resin-steps">
      <li><b>Temizlik</b><span>İzin içindeki hava ve nem vakumla alınır.</span></li>
      <li><b>Reçine</b><span>Şeffaf reçine basınçla çatlağın her koluna dolar.</span></li>
      <li><b>UV ışık</b><span>Reçine ışıkla birkaç dakikada sertleşir.</span></li>
      <li><b>Cila</b><span>Yüzey düzlenir, iz neredeyse görünmez olur.</span></li>
    </ol>
  </div>`);

$('#kasko').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    <div class="copy__a"><h2 class="h2" data-reveal>Çatlak kenara ulaştıysa cam değişir.</h2></div>
    <div class="copy__b"><p class="lead">Uzayan çatlak tamirle tutmaz. Camı söker, aracınıza uygun yenisini takarız.</p></div>
  </div>
  <div class="beat" data-beat="1">
    <div class="copy__a">
      <h2 class="h2" id="kasko-title" data-reveal>Kaskonuz varsa cebinizden para çıkmayabilir.</h2>
      <a class="btn btn--main" href="${WA_KASKO}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>Kasko için fotoğraf gönder</span></a>
    </div>
    <div class="copy__b">
      <ol class="steps" id="kasko-steps">
        ${d.surec.map((s) => `<li><b>${esc(s.baslik)}</b><span>${esc(s.aciklama)}</span></li>`).join('')}
      </ol>
    </div>
  </div>`);

const filmler = d.filmler || [];
const DEFAULT_FILM = Math.min(2, filmler.length - 1);
$('#cam-filmi').innerHTML = sticky(`
  <div class="copy__a">
    <h2 class="h2" id="film-title" data-reveal>Güneşi kesin, içerisi serin kalsın.</h2>
    <p class="lead lead--small">Yan ve arka camlara. Yasal sınırlara uygun film öneririz.</p>
  </div>
  <div class="copy__b">
    <div class="tint" role="group" aria-label="Film koyuluğu">
      <div class="tint__opts">
        ${filmler.map((f, i) => `<button type="button" class="tint__opt" data-film="${i}" aria-pressed="${i === DEFAULT_FILM}">${esc(f.ad)}</button>`).join('')}
      </div>
      <dl class="tint__read">
        <div><dt>Işık geçirgenliği</dt><dd id="t-vlt">%100</dd></div>
        <div><dt>UV engelleme</dt><dd id="t-uv">%99</dd></div>
        <div><dt>Isı kesme</dt><dd class="heat" id="t-heat">${'<i></i>'.repeat(5)}</dd></div>
      </dl>
      <p class="tint__note" id="t-note"></p>
    </div>
  </div>`);

$('#yagmur').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    <div class="copy__a"><h2 class="h2" id="yagmur-title" data-reveal>Silecek iz bırakıyorsa camı çizer.</h2></div>
    <div class="copy__b"><p class="lead">Silecek lastiğini, yağmur sensörünü ve cam suyu memelerini kontrol ederiz. Yağmurda yol net kalır.</p></div>
  </div>
  <div class="beat" data-beat="1">
    <div class="copy__a"><h2 class="h2" data-reveal>Cam değiştiyse kamera yeniden ayarlanır.</h2></div>
    <div class="copy__b">
      <p class="lead">Şerit takip ve acil fren kamerası ön camın arkasındadır. Değişimden sonra cihazla kalibre ederiz.</p>
      <div class="gauge gauge--adas" aria-hidden="true">
        <span class="gauge__lbl">Kamera açı sapması</span>
        <span class="gauge__val" id="adas">1,8°</span>
        <span class="gauge__state" id="adas-state">Ayarlanıyor</span>
      </div>
    </div>
  </div>`);

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <h2 class="h2 h2--ink" id="services-title" data-reveal>Aracın bütün camları.</h2>
    <ul class="svc">
      ${d.hizmetler.map((h) => `
        <li class="svc__row">
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <span class="svc__time">${esc(h.sure)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

$('#biz').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2 h2--ink" id="about-title" data-reveal>Şaşmaz'da ${tecrube} yıldır cam takıyoruz.</h2>
      <p class="about__text">${esc(d.isletme.hakkinda)}</p>
      <p class="about__warranty">${esc(d.garanti)}</p>
    </div>
    <ul class="stats">
      ${d.istatistikler.map((s) => {
        const v = s.kurulustanHesapla ? tecrube : s.deger;
        return `<li><b data-count="${v}" data-suffix="${esc(s.sonek)}">0</b><span>${esc(s.etiket)}</span></li>`;
      }).join('')}
    </ul>
  </div>`;

$('#atolye').innerHTML = `
  <div class="wrap">
    <h2 class="h2 h2--ink" id="shop-gallery-title" data-reveal>Tezgâhtan kareler.</h2>
    <ul class="gallery">
      ${d.galeri.map((g) => `<li class="gallery__item"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" width="1400" height="1050"><span class="gallery__fog" aria-hidden="true"></span></li>`).join('')}
    </ul>
  </div>`;

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
const reviewCard = (y) => `
  <li class="review">
    ${stars(y.puan)}
    <p>${esc(y.metin)}</p>
    <span class="review__who">${esc(y.ad)}, ${esc(y.arac)}</span>
  </li>`;
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__head">
    <h2 class="h2 h2--ink" id="reviews-title" data-reveal>Camı takılan anlatsın.</h2>
    <p class="score"><b data-count="${d.puan.ortalama}" data-decimals="1">0</b><span>${stars(d.puan.ortalama)}<small>${fmt(d.puan.adet)} Google yorumu</small></span></p>
  </div>
  <div class="reviews__rail"><ul class="reviews__track">${[...d.yorumlar, ...d.yorumlar].map(reviewCard).join('')}</ul></div>`;

$('#markalar').innerHTML = `
  <div class="brands__rail"><div class="brands__track">${[...d.markalar, ...d.markalar].map((m) => `<span>${esc(m)}</span>`).join('')}</div></div>`;

const todayName = GUNLER[new Date().getDay()];
$('#ulasim').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2 h2--ink" id="visit-title" data-reveal>Şaşmaz'da, sanayinin içinde.</h2>
      <p class="visit__status ${status.open ? 'is-open' : ''}"><i></i>${esc(status.text)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${groupedHours(d.saatler).map(([g, h]) => `<tr class="${g.includes(todayName) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

$('#iletisim').innerHTML = sticky(`
  <div class="copy__a">
    <h2 class="h1" id="final-title" data-reveal>Camınızı bugün getirin.</h2>
  </div>
  <div class="copy__b">
    <p class="lead">${esc(d.garanti)} Taş izini büyümeden gösterin, yarım saatte kapatalım.</p>
    <div class="actions">
      <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      <a class="btn btn--ghost" href="${WA_FOTO}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
  </div>`);

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar: Pexels. 3D cam sahnesi bu site için kodla çizildi.</p>
  </div>`;

// Harita yaklaşınca yüklensin
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Film seçici -----------------------------------------------------------------------

let filmTouched = false;
let filmVlt = 100;
function setFilmUi(vlt, idx) {
  $('#t-vlt').textContent = `%${Math.round(vlt)}`;
  const f = filmler[idx ?? nearestFilm(vlt)];
  $('#t-uv').textContent = vlt > 98 ? '%0' : `%${f.uv}`;
  $$('#t-heat i').forEach((el, i) => el.classList.toggle('on', vlt < 98 && i < f.isi));
  $('#t-note').textContent = vlt > 98 ? 'Filmsiz cam' : f.not;
  $$('.tint__opt').forEach((b, i) => b.setAttribute('aria-pressed', String(i === (idx ?? -1))));
}
const nearestFilm = (vlt) => filmler.reduce((best, f, i) => (Math.abs(f.gecirgenlik - vlt) < Math.abs(filmler[best].gecirgenlik - vlt) ? i : best), 0);
$('#cam-filmi').addEventListener('click', (e) => {
  const b = e.target.closest('[data-film]');
  if (!b) return;
  filmTouched = true;
  const i = Number(b.dataset.film);
  gsap.to({ v: filmVlt }, {
    v: filmler[i].gecirgenlik,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate() {
      filmVlt = this.targets()[0].v;
      setFilmUi(filmVlt, i);
    },
  });
});
setFilmUi(100);

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

// Sabit bölümler dışındaki başlıklar görünür olunca netleşsin
if (!reducedMotion) {
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => reveal(el) });
  });
}

// Düz bölümlerde üst çubuk açık zemine geçer
ScrollTrigger.create({
  trigger: '.solid',
  start: 'top 60px',
  end: 'bottom 60px',
  onToggle: (self) => $('#top').classList.toggle('is-solid', self.isActive),
});

// Sayaçlar
$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const dec = Number(el.dataset.decimals || 0);
  const suf = el.dataset.suffix || '';
  const out = (v) => (el.textContent = (dec ? v.toFixed(dec).replace('.', ',') : fmt(v)) + suf);
  if (reducedMotion) return out(to);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => gsap.to({ v: 0 }, { v: to, duration: 1.6, ease: 'power2.out', onUpdate() { out(this.targets()[0].v); } }),
  });
});

// Galeri: buğulu cam silinerek açılır
if (!reducedMotion) {
  $$('.gallery__item').forEach((item, i) => {
    gsap.fromTo(item.querySelector('.gallery__fog'), { '--wipe': 0 }, {
      '--wipe': 100,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: item, start: 'top 85%', end: 'top 35%', scrub: 0.6 },
    });
  });
} else {
  $$('.gallery__fog').forEach((f) => f.remove());
}

// Hizmet satırları: ekran ortasındaki satır net, diğerleri buğulu
if (!reducedMotion) {
  $$('.svc__row').forEach((row) => {
    ScrollTrigger.create({
      trigger: row,
      start: 'top 62%',
      end: 'bottom 38%',
      onToggle: (self) => row.classList.toggle('is-clear', self.isActive),
    });
  });
} else {
  $$('.svc__row').forEach((r) => r.classList.add('is-clear'));
}

// --- 3D sahne ve scroll filmi ----------------------------------------------------------

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
    const top = r.top + scrollY;
    return { el, name: el.dataset.scene, top, height: el.offsetHeight };
  });
}

let lastImpact = false;
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
function steps(list, p, a, b) {
  const items = $$('li', list);
  const n = items.length;
  const k = seg(p, a, b) * n;
  items.forEach((li, i) => {
    li.classList.toggle('is-on', k > i);
    li.classList.toggle('is-now', k > i && k <= i + 1.0001);
  });
}

const PREV = { hero: 'hero', tas: 'hero', recine: 'tasYakin', kasko: 'recine', film: 'kasko', yagmur: 'film', final: 'yagmur' };
function enterView(name, p, span = 0.22) {
  world.view(name, ease(seg(p, 0, span)), PREV[name]);
}

const SCENES = {
  hero(p) {
    world.view('hero');
    S.gleam = -0.4 + p * 1.8;
    S.gleamAmt = seg(p, 0.1, 0.4) * (1 - seg(p, 0.7, 1));
  },
  tas(p, el) {
    if (p < 0.34) enterView('tas', p, 0.3);
    else world.view('tasYakin', ease(seg(p, 0.34, 0.8)), 'tas');
    S.name = 1 - ease(seg(p, 0.34, 0.6)); // yakın planda gökyüzü yazısı söner
    S.stone = seg(p, 0.05, 0.3);
    S.crack = seg(p, 0.3, 0.92);
    setBeat(el, p < 0.3 ? 0 : 1);
    const impact = p >= 0.3;
    if (impact && !lastImpact) {
      world.hit();
      gsap.fromTo('#flash', { opacity: 0.55 }, { opacity: 0, duration: 0.5, ease: 'power2.out' });
      try { navigator.vibrate?.(25); } catch {}
    }
    lastImpact = impact;
    const t = 18 - 24 * seg(p, 0.35, 0.95);
    $('#temp').textContent = `${t < 0 ? '−' : ''}${Math.abs(Math.round(t))}°C`;
    $('#temp-bar').style.transform = `scaleX(${1 - seg(p, 0.35, 0.95) * 0.85})`;
  },
  recine(p, el) {
    enterView('recine', p, 0.25);
    S.crack = 1;
    S.name = ease(seg(p, 0.86, 1));
    S.tool = ease(seg(p, 0.05, 0.25)) * (1 - ease(seg(p, 0.86, 0.98)));
    S.resin = ease(seg(p, 0.3, 0.62)) * 0.9 + seg(p, 0.66, 0.9) * 0.1;
    S.uv = seg(p, 0.6, 0.66) * (1 - seg(p, 0.8, 0.86));
    steps($('#resin-steps', el), p, 0.1, 0.92);
    const min = 30 * seg(p, 0.08, 0.95);
    $('#timer').textContent = `${String(Math.floor(min)).padStart(2, '0')}:${String(Math.floor((min % 1) * 60)).padStart(2, '0')}`;
  },
  kasko(p, el) {
    enterView('kasko', p, 0.25);
    // yeni bir taş izi, bu kez çatlak kenarlara koşar
    S.crack = p < 0.52 ? 1 : 0;
    S.long = p < 0.52 ? ease(seg(p, 0.02, 0.3)) : 0;
    S.glassY = ease(seg(p, 0.34, 0.52)) * (p < 0.52 ? 1 : 0) + (p >= 0.52 ? 1 - ease(seg(p, 0.52, 0.72)) : 0);
    S.gleam = -0.4 + seg(p, 0.72, 0.95) * 1.9;
    S.gleamAmt = seg(p, 0.72, 0.78) * (1 - seg(p, 0.92, 0.98));
    setBeat(el, p < 0.34 ? 0 : 1);
    steps($('#kasko-steps', el), p, 0.4, 0.96);
  },
  film(p) {
    enterView('film', p, 0.2);
    S.side = ease(seg(p, 0.02, 0.22)) * (1 - ease(seg(p, 0.9, 1)));
    if (!filmTouched) {
      const v = 100 - (100 - filmler[DEFAULT_FILM].gecirgenlik) * ease(seg(p, 0.22, 0.5));
      if (Math.abs(v - filmVlt) > 0.2) {
        filmVlt = v;
        setFilmUi(v, v <= filmler[DEFAULT_FILM].gecirgenlik + 0.5 ? DEFAULT_FILM : undefined);
      }
    }
    S.film = 1 - filmVlt / 100;
  },
  yagmur(p, el) {
    const adasOn = p >= 0.64;
    if (!adasOn) enterView('yagmur', p, 0.2);
    else world.view('adas', ease(seg(p, 0.64, 0.78)), 'yagmur');
    S.dim = seg(p, 0, 0.12) * (1 - seg(p, 0.6, 0.72));
    S.rain = seg(p, 0.02, 0.1) * (1 - seg(p, 0.62, 0.72));
    S.rainP = clamp(p);
    S.adas = ease(seg(p, 0.66, 0.8));
    S.adasErr = 1 - ease(seg(p, 0.8, 0.95));
    setBeat(el, adasOn ? 1 : 0);
    const err = 1.8 * S.adasErr;
    $('#adas').textContent = `${err.toFixed(1).replace('.', ',')}°`;
    const done = S.adasErr < 0.02;
    $('#adas-state').textContent = done ? 'Ayarlandı' : 'Ayarlanıyor';
    $('#adas-state').classList.toggle('is-done', done);
  },
  final(p) {
    enterView('final', p, 0.4);
    S.gleam = -0.4 + seg(p, 0.3, 0.8) * 1.9;
    S.gleamAmt = seg(p, 0.3, 0.4) * (1 - seg(p, 0.75, 0.85));
  },
};

// Aktif sahne: üst kenarı ekranın ortasını geçmiş son sahne
let active = null;
function tick() {
  const y = scrollY;
  const vh = innerHeight;
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * 0.5) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  reset();
  SCENES[cur.name](p, cur.el);
  if (active !== cur.el) {
    active = cur.el;
    if (!$('.beat', cur.el)) reveal($('[data-reveal]', cur.el));
  }
}

// Kanvas sadece film bölümü ya da final görünürken çizilir
let canvasOn = true;
const visible = new Set();
const vio = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
});
[$('#film'), $('#iletisim')].forEach((el) => vio.observe(el));

let lenis = null;
function start() {
  measure();
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    measure();
    world.view('hero');
    world.snap();
    reset();
    S.crack = 0;
    world.render();
    return;
  }
  lenis = initSmoothScroll({ lerp: 0.1 });
  ScrollTrigger.addEventListener('refresh', measure);
  ScrollTrigger.refresh();
  tick();
  world.snap();
  gsap.ticker.add(() => {
    tick();
    if (canvasOn) world.render();
  });
  $$('[data-mag]').forEach((b) => magnetic(b, 0.3));
  initCursor();
  velocityMarquee($('.brands__track'), { speed: 50, lenis });
  velocityMarquee($('.reviews__track'), { speed: 22, dir: -1, lenis });
}

// --- Açılış: buğulu cam, parmakla yazılan ad, silecek ---------------------------------

function intro() {
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
  // buğu
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(214,226,233,.985)');
  g.addColorStop(1, 'rgba(236,241,243,.985)');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < (w * h) / 900; i++) {
    const px = rand() * w;
    const py = rand() * h;
    const rr = 0.6 + rand() * 1.8;
    x.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.4})`;
    x.beginPath();
    x.arc(px, py, rr, 0, Math.PI * 2);
    x.fill();
  }
  // parmakla yazılacak ad
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
      gsap.to(el, { opacity: 0, duration: 0.3, onComplete: () => {
        el.remove();
        document.documentElement.classList.remove('is-intro');
      } });
      resolve();
    };
    el.addEventListener('pointerdown', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
    const st = { write: 0, wipe: 0 };
    const draw = () => {
      x.save();
      x.globalCompositeOperation = 'destination-out';
      // yazı: soldan sağa açılan kırpma içinde
      x.save();
      x.beginPath();
      x.rect(0, textTop - size, textLeft + (textRight - textLeft) * st.write, lines.length * lh + size * 2);
      x.clip();
      x.fillStyle = 'rgba(0,0,0,.9)';
      lines.forEach((l, i) => x.fillText(l, w / 2, textTop + lh * (i + 0.5)));
      x.restore();
      // silecek
      if (st.wipe > 0) {
        const R = Math.hypot(w, h) * 1.05;
        x.beginPath();
        x.moveTo(w / 2, h + 10);
        x.arc(w / 2, h + 10, R, Math.PI, Math.PI + Math.PI * st.wipe);
        x.closePath();
        x.fillStyle = '#000';
        x.fill();
      }
      x.restore();
    };
    gsap.timeline({ onUpdate: draw, onComplete: finish })
      .to(st, { write: 1, duration: 0.95, ease: 'power1.inOut' }, 0.25)
      .to(st, { wipe: 1, duration: 0.75, ease: 'power2.inOut' }, 1.45);
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
fontsReady.then(intro).then(() => {
  reveal($('#hero-title'));
});
start();
