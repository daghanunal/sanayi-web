import '../../shared/base.css';
import './style.css';
import base from '../../data/showroom.json';
import extra from '../../data/boya-sinematik2.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld, PINS } from './scene.js';

gsap.registerPlugin(SplitText);

const d = boot({ ...base, ...extra });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const ad = esc(d.isletme.ad);
const yil = new Date().getFullYear();
const tecrube = Math.max(1, yil - d.isletme.kurulus);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const dec = (n, k = 1) => n.toFixed(k).replace('.', ',');
const O = d.olcum || { sapmaMm: 6.4, deltaEOnce: 4.2, deltaESonra: 0.4, kalinlikMikron: 118 };
const GOCUK = d.dolu?.gocuk ?? 12;
const GU = d.parlaklik || { once: 38, sonra: 94 };

function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}

const WA_FOTO = waHref(d, `Merhaba ${d.isletme.ad}, aracımın hasarlı yerinin fotoğrafını gönderiyorum. Fiyat alabilir miyim?`);
const WA_DOLU = waHref(d, `Merhaba ${d.isletme.ad}, aracımda dolu göçükleri var. Boyasız göçük düzeltme için fotoğraf gönderiyorum.`);
const status = openStatus(d.saatler);
const hz = (i) => d.hizmetler[i] || d.hizmetler[0];

// --- Render ----------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 28 20" aria-hidden="true"><path d="M1 3h26M1 10c8 0 9 3 13 3s5-3 13-3M1 17h26" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne" data-hot>${logo}<span>${ad}</span></a>
  <p class="top__status ${status.open ? 'is-open' : ''}"><i></i><span class="top__long">${esc(status.text)}</span><span class="top__short">${status.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${esc(d.iletisim.telefon)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`;

const sticky = (inner) => `<div class="scene__sticky"><div class="copy">${inner}</div></div>`;
const beat = (i, inner) => `<div class="beat" data-beat="${i}">${inner}</div>`;

$('#sahne').innerHTML = sticky(`
  <p class="kicker">${ad} · Şaşmaz'da ${beri(d.isletme.kurulus)} beri</p>
  <h1 class="h1" id="hero-title" data-reveal>Çizgi yalan söylemez.</h1>
  <p class="lead">${esc(d.isletme.slogan)} Boya, kaporta, boyasız göçük, pasta ve seramik. Panelin üstündeki çizgiler düz akıyorsa iş tamamdır.</p>
  <div class="actions">
    <a class="btn btn--main" href="${WA_FOTO}" target="_blank" rel="noopener">${icons.whatsapp}<span>Fotoğraf gönder, fiyat al</span></a>
    <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
  </div>`) + `<p class="hint" aria-hidden="true"><i></i>Kaydırın, dolu geliyor</p>`;

$('#dolu').innerHTML = sticky(`
  <div class="beats">
    ${beat(0, `
      <p class="tag">01 · Dolu</p>
      <h2 class="h2" id="dolu-title" data-reveal>Beş dakikalık dolu.</h2>
      <p class="lead">Kaputta, tavanda onlarca küçük göçük. Gözle zor seçilir; yansımadaki çizgi hemen ele verir.</p>`)}
    ${beat(1, `
      <p class="tag">02 · Boyasız göçük</p>
      <h2 class="h2" data-reveal>Boyaya dokunmadan iteriz.</h2>
      <p class="lead">${esc(hz(1).aciklama)}</p>
      <a class="btn btn--main btn--small" href="${WA_DOLU}" target="_blank" rel="noopener">${icons.whatsapp}<span>Dolu hasarını gönder</span></a>`)}
  </div>
  <div class="meter" aria-hidden="true">
    <span class="meter__lbl">Göçük sayısı</span>
    <b class="meter__val" id="m-dent">0</b>
    <span class="meter__bar"><i id="m-dent-bar"></i></span>
    <span class="meter__sub" id="m-dent-sub">Yansıma düz</span>
  </div>`);

$('#kaza').innerHTML = sticky(`
  <div class="beats">
    ${beat(0, `
      <p class="tag">03 · Kaza</p>
      <h2 class="h2" id="kaza-title" data-reveal>Kazadan sonra önce ölçü.</h2>
      <p class="lead">Göz kararı çekilen kaporta yamuk kalır. Aracı ölçer, sapmayı noktası noktasına çıkarırız.</p>`)}
    ${beat(1, `
      <p class="tag">04 · Kaporta</p>
      <h2 class="h2" data-reveal>Fabrika değerine çekeriz.</h2>
      <p class="lead">${esc(hz(2).aciklama)}</p>`)}
  </div>
  <div class="meter" aria-hidden="true">
    <span class="meter__lbl">En büyük sapma</span>
    <b class="meter__val"><span id="m-mm">0,0</span><small>mm</small></b>
    <span class="meter__bar"><i id="m-mm-bar"></i></span>
    <span class="meter__sub" id="m-mm-sub">Ölçü alınıyor</span>
  </div>`);

$('#renk').innerHTML = sticky(`
  <p class="tag">05 · Renk</p>
  <h2 class="h2" id="renk-title" data-reveal>Renk cihazla tutar.</h2>
  <p class="lead">${esc(hz(0).aciklama)}</p>
  <div class="meter meter--inline" aria-hidden="true">
    <span class="meter__lbl">Renk farkı (ΔE)</span>
    <b class="meter__val" id="m-de">${dec(O.deltaEOnce)}</b>
    <span class="swatch"><i class="swatch__a"></i><i class="swatch__b" id="m-sw"></i></span>
    <span class="meter__sub" id="m-de-sub">Astar hazır</span>
  </div>`);

$('#pasta').innerHTML = sticky(`
  <p class="tag">06 · Pasta ve cila</p>
  <h2 class="h2" id="pasta-title" data-reveal>Hare gider, derinlik gelir.</h2>
  <p class="lead">${esc(hz(3).aciklama)}</p>
  <div class="meter meter--inline" aria-hidden="true">
    <span class="meter__lbl">Parlaklık, 60°</span>
    <b class="meter__val"><span id="m-gu">${GU.once}</span><small>GU</small></b>
    <span class="meter__bar"><i id="m-gu-bar"></i></span>
    <span class="meter__sub">Boya kalınlığı ${O.kalinlikMikron} µm, ölçüldü</span>
  </div>`);

$('#seramik').innerHTML = sticky(`
  <p class="tag">07 · Seramik</p>
  <h2 class="h2" id="seramik-title" data-reveal>Su tutunamaz.</h2>
  <p class="lead">${esc(hz(4).aciklama)}</p>
  <p class="warranty">${esc(d.garanti)}</p>`);

// Önce / sonra: zebra jaluzi
$('#isler').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <p class="tag tag--ink">Atölyeden</p>
      <h2 class="h2 h2--ink" id="proof-title" data-reveal>Bunlar render değil.</h2>
      <p class="sec-head__p">Gerçek işler. Kaydırdıkça bantlar kapanır, sonrası görünür.</p>
    </div>
    <div class="proof__list">
      ${(d.oncesiSonrasi || []).map((o) => `
        <figure class="ba" data-ba>
          <div class="ba__frame">
            <img src="${esc(o.once)}" alt="${esc(o.baslik)}, önce" loading="lazy" width="1400" height="1000">
            <img class="ba__after" src="${esc(o.sonra)}" alt="${esc(o.baslik)}, sonra" loading="lazy" width="1400" height="1000">
            <span class="ba__chip ba__chip--a">Önce</span><span class="ba__chip ba__chip--b">Sonra</span>
          </div>
          <figcaption>${esc(o.baslik)}</figcaption>
        </figure>`).join('')}
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <p class="tag tag--ink">Hizmetler</p>
      <h2 class="h2 h2--ink" id="svc-title" data-reveal>Kaportadan seramiğe.</h2>
      <p class="sec-head__p">Fiyatı işe başlamadan, aracı görünce yazılı söyleriz.</p>
    </div>
    <ol class="svc__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc__row">
          <span class="svc__no">${String(i + 1).padStart(2, '0')}</span>
          <div class="svc__txt"><h3>${esc(h.baslik)}</h3><p>${esc(h.aciklama)}</p></div>
          <span class="svc__time">${esc(h.sure)}</span>
          ${h.gorsel ? `<img class="svc__img" src="${esc(h.gorsel)}" alt="" loading="lazy" width="400" height="300">` : ''}
        </li>`).join('')}
    </ol>
  </div>`;

$('#biz').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <p class="tag tag--ink">Biz</p>
      <h2 class="h2 h2--ink" id="about-title" data-reveal>${tecrube} yıldır aynı cadde, aynı kabin.</h2>
      <p class="about__text">${esc(d.isletme.hakkinda)}</p>
    </div>
    <ul class="stats">
      ${d.istatistikler.map((s) => {
        const v = s.deger === 'kurulustan' ? tecrube : Number(s.deger);
        return `<li><b data-count="${v}" data-suffix="${esc(s.sonek)}">0</b><span>${esc(s.etiket)}</span></li>`;
      }).join('')}
    </ul>
  </div>`;

$('#surec').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <p class="tag tag--ink">Süreç</p>
      <h2 class="h2 h2--ink" id="steps-title" data-reveal>Aracınız bizde altı banttan geçer.</h2>
    </div>
    <ol class="band">
      ${d.surec.map((s, i) => `<li class="band__row"><span class="band__no">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
  </div>`;

$('#galeri').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <p class="tag tag--ink">Teslim edilenler</p>
      <h2 class="h2 h2--ink" id="gal-title" data-reveal>Kabinden yeni çıktı.</h2>
    </div>
  </div>
  <ul class="gal__rail" data-lenis-prevent-horizontal>
    ${d.galeri.map((g) => `
      <li class="gal__item">
        <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="900" height="1200">
        <p><b>${esc(g.baslik)}</b><span>${esc(g.detay)}</span></p>
      </li>`).join('')}
  </ul>`;

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="reviews__head">
      <div>
        <p class="tag tag--ink">Yorumlar</p>
        <h2 class="h2 h2--ink" id="reviews-title" data-reveal>Arabasını alan anlatsın.</h2>
      </div>
      <p class="score"><b data-count="${d.puan.ortalama}" data-decimals="1">0</b><span>${stars(d.puan.ortalama)}<small>${fmt(d.puan.adet)} Google yorumu</small></span></p>
    </div>
    <ul class="reviews__list">
      ${d.yorumlar.map((y) => `
        <li class="review">
          ${stars(y.puan)}
          <p>${esc(y.metin)}</p>
          <span class="review__who">${esc(y.ad)} · ${esc(y.arac)}</span>
        </li>`).join('')}
    </ul>
  </div>
  <div class="brands" aria-label="Çalıştığımız markalar"><div class="brands__track">${[...d.markalar, ...d.markalar].map((m) => `<span>${esc(m)}</span>`).join('')}</div></div>`;

const todayName = GUNLER[new Date().getDay()];
$('#ulasim').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <p class="tag tag--ink">Ziyaret</p>
      <h2 class="h2 h2--ink" id="visit-title" data-reveal>Şaşmaz'da, kabinin başında.</h2>
      <p class="visit__status ${status.open ? 'is-open' : ''}"><i></i>${esc(status.text)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${groupedHours(d.saatler).map(([g, h]) => `<tr class="${g.includes(todayName) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--line btn--line-ink" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
      </div>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

$('#iletisim').innerHTML = sticky(`
  <p class="tag">Son kontrol</p>
  <h2 class="h2 h2--xl" id="final-title" data-reveal>Çizgiler düz akana kadar teslim yok.</h2>
  <p class="lead">Hasarın fotoğrafını WhatsApp'tan gönderin, fiyatı aynı gün yazalım. ${esc(d.garanti)}</p>
  <div class="actions">
    <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
    <a class="btn btn--line" href="${WA_FOTO}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
  </div>`);

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar: Pexels. 3D panel bu site için kodla çizildi.</p>
  </div>`;

const CHAPTERS = { hero: ['00', 'Son kontrol ışığı'], dolu: ['01', 'Dolu ve boyasız göçük'], kaza: ['03', 'Kaza ve ölçü'], renk: ['05', 'Renk eşleme'], pasta: ['06', 'Pasta ve cila'], seramik: ['07', 'Seramik'], final: ['08', 'Teslim'] };
const hud = document.createElement('div');
hud.className = 'hud';
hud.setAttribute('aria-hidden', 'true');
hud.innerHTML = `<span class="hud__rec"><i></i>Yansıma testi</span><span class="hud__ch"><b id="hud-no">00</b><span id="hud-name">Son kontrol ışığı</span></span><span class="hud__prog"><i id="hud-bar"></i></span>`;
document.body.append(hud);
let hudKey = '';

$('#pins').innerHTML = PINS.map((p, i) => `<span class="pin" data-pin="${i}"><i></i><b>+${dec(p.mm)} mm</b></span>`).join('');
const pinEls = $$('.pin');

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
    split = new SplitText(el, { type: 'words,chars', wordsClass: 'w', charsClass: 'ch' });
    splits.set(el, split);
  }
  gsap.killTweensOf(split.chars);
  gsap.fromTo(split.chars, { '--wd': 50, opacity: 0 }, { '--wd': 125, opacity: 1, duration: 0.8, stagger: 0.014, ease: 'expo.out' });
}

if (!reducedMotion) {
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => reveal(el) });
  });
}

const solidOn = { solid: false, foot: false };
function setSolid() {
  const on = solidOn.solid || solidOn.foot;
  $('#top').classList.toggle('is-solid', on);
  document.documentElement.classList.toggle('is-solid-page', on);
}
ScrollTrigger.create({
  trigger: '#solid',
  start: 'top 64px',
  end: 'bottom 64px',
  onToggle: (self) => { solidOn.solid = self.isActive; setSolid(); },
});

// Sayaçlar
$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const k = Number(el.dataset.decimals || 0);
  const suf = el.dataset.suffix || '';
  const pre = suf.trim() === '%' ? '%' : '';
  const out = (v) => (el.textContent = pre + (k ? dec(v, k) : fmt(v)) + (pre ? '' : suf));
  if (reducedMotion) return out(to);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => gsap.to({ v: 0 }, { v: to, duration: 1.6, ease: 'power2.out', onUpdate() { out(this.targets()[0].v); } }),
  });
});

// Önce/sonra jaluzisi ve süreç bantları
if (!reducedMotion) {
  $$('[data-ba]').forEach((f) => {
    gsap.fromTo(f, { '--k': 0 }, {
      '--k': 1, ease: 'none',
      scrollTrigger: { trigger: f, start: 'top 75%', end: 'bottom 45%', scrub: 0.5 },
    });
  });
  $$('.band__row').forEach((row) => {
    ScrollTrigger.create({ trigger: row, start: 'top 70%', onToggle: (s) => row.classList.toggle('is-on', s.isActive), end: 'bottom -400%' });
  });
  $$('.svc__row').forEach((row, i) => {
    gsap.from(row, { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
  });
} else {
  $$('[data-ba]').forEach((f) => f.style.setProperty('--k', 1));
  $$('.band__row').forEach((r) => r.classList.add('is-on'));
}

// --- 3D sahne ve scroll filmi ----------------------------------------------------------

const canvas = $('#gl');
const world = createWorld(canvas, { phone, low });
const { S } = world;
const DEFAULTS = { ...S };
const reset = () => Object.assign(S, DEFAULTS);

const scenes = $$('.scene');
let layout = [];
function measure() {
  layout = scenes.map((el) => ({ el, name: el.dataset.scene, top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight }));
}
addEventListener('resize', () => {
  world.resize();
  measure();
});

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
const txt = (id, v) => {
  const el = document.getElementById(id);
  if (el && el.textContent !== v) el.textContent = v;
};
const bar = (id, v) => {
  const el = document.getElementById(id);
  if (el) el.style.transform = `scaleX(${clamp(v).toFixed(3)})`;
};

let flashed = { dolu: false, kaza: false };
function flash(key, on) {
  if (on && !flashed[key]) {
    gsap.fromTo('#flash', { opacity: 0.5 }, { opacity: 0, duration: 0.45, ease: 'power2.out' });
    try { navigator.vibrate?.(20); } catch {}
  }
  flashed[key] = on;
}

let pinsOn = false;
function showPins(on, k = 1) {
  if (on !== pinsOn) {
    pinsOn = on;
    $('#pins').classList.toggle('is-on', on);
  }
  if (!on) return;
  PINS.forEach((p, i) => {
    const s = world.project(p.x, p.y, 0.02);
    const el = pinEls[i];
    el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    el.lastChild.textContent = k < 0.02 ? '0,0 mm' : `+${dec(p.mm * k)} mm`;
    el.classList.toggle('is-ok', k < 0.02);
  });
}

// Masaüstünde panel sağda, telefonda yukarıda
const OFF = phone ? { x: 0, y: -0.62 } : { x: 0.8, y: 0 };
const PREV = { hero: 'hero', dolu: 'hero', kaza: 'pdr', renk: 'kaza', pasta: 'renk', seramik: 'pasta', final: 'seramik' };
function enter(name, p, span = 0.2) {
  world.view(name, ease(seg(p, 0, span)), PREV[name]);
}

const SCENES = {
  hero(p) {
    world.view('hero');
    S.spin = -0.1 + p * 0.25;
  },
  dolu(p, el) {
    if (p < 0.5) enter('dolu', p, 0.2);
    else world.view('pdr', ease(seg(p, 0.5, 0.66)), 'dolu');
    S.hit = seg(p, 0.08, 0.42);
    S.pop = seg(p, 0.58, 0.95);
    setBeat(el, p < 0.5 ? 0 : 1);
    flash('dolu', p > 0.1);
    // canlı göçük sayısı
    let n = 0;
    world.HAIL.forEach((h) => {
      if (S.hit > h.t * 0.85 + 0.02 && S.pop < h.p * 0.82 + 0.08) n++;
    });
    txt('m-dent', String(Math.round((n / world.HAIL.length) * GOCUK)));
    bar('m-dent-bar', n / world.HAIL.length);
    txt('m-dent-sub', p < 0.1 ? 'Yansıma düz' : p < 0.55 ? 'Çizgiler kırıldı' : n ? 'İçeriden itiliyor' : 'Boya korunarak düzeldi');
  },
  kaza(p, el) {
    enter('kaza', p, 0.18);
    S.crash = ease(seg(p, 0.1, 0.14)) * (1 - ease(seg(p, 0.46, 0.82)));
    S.wire = ease(seg(p, 0.16, 0.26)) * (1 - ease(seg(p, 0.84, 0.94)));
    S.patch = ease(seg(p, 0.84, 0.97));
    setBeat(el, p < 0.44 ? 0 : 1);
    flash('kaza', p > 0.1);
    const k = S.crash;
    showPins(S.wire > 0.5, k);
    txt('m-mm', dec(O.sapmaMm * k));
    bar('m-mm-bar', k);
    txt('m-mm-sub', p < 0.12 ? 'Ölçü alınıyor' : p < 0.46 ? 'Sapma var' : k > 0.02 ? 'Çekiliyor' : 'Fabrika değerinde');
  },
  renk(p) {
    enter('renk', p, 0.22);
    S.patch = 1;
    S.paint = ease(seg(p, 0.12, 0.4));
    S.match = ease(seg(p, 0.48, 0.86));
    const de = lerp(O.deltaEOnce, O.deltaESonra, S.match);
    txt('m-de', dec(de));
    txt('m-de-sub', S.paint < 0.5 ? 'Astar hazır' : S.match < 0.98 ? 'Karışım ayarlanıyor' : 'Göz ayırt etmez');
    $('#m-sw').style.opacity = String(1 - S.match);
  },
  pasta(p) {
    enter('pasta', p, 0.22);
    const h = ease(seg(p, 0.02, 0.18)) * (1 - ease(seg(p, 0.42, 0.86)));
    S.haze = h;
    S.swirl = h;
    const g = lerp(GU.once, GU.sonra, ease(seg(p, 0.42, 0.86)));
    txt('m-gu', String(Math.round(g)));
    bar('m-gu-bar', g / 100);
  },
  seramik(p) {
    enter('seramik', p, 0.22);
    S.beads = seg(p, 0.08, 0.45);
    S.sheet = seg(p, 0.55, 0.98);
  },
  final(p) {
    enter('final', p, 0.4);
    S.spin = p * 0.6;
  },
};

let active = null;
const copies = new Map();
function fadeCopies(y, vh) {
  // Yapışkan metin sahneden çıkarken/girerken üst çubuğa ve alt butonlara binmesin
  for (const l of layout) {
    let c = copies.get(l.el);
    if (c === undefined) { c = $('.scene__sticky', l.el); copies.set(l.el, c); }
    if (!c) continue;
    const rel = (y - (l.top + l.height - vh)) / vh;
    if (l.name === 'final') {
      // Final sahnesi yukarı kayarken (footer girince) üst çubuk da dolu olsun
      const f = rel > 0.02;
      if (solidOn.foot !== f) { solidOn.foot = f; setSolid(); }
    }
    const exit = l.name === 'final' ? 0 : rel;
    const entry = (l.top - y) / vh;
    const k = Math.max(exit, entry);
    if (k > 1.2 || k < -0.2 && c._o === 1) continue;
    const o = k <= 0 ? 1 : Math.max(0, 1 - k * 4);
    const r = Math.round(o * 100) / 100;
    if (c._o !== r) { c._o = r; c.style.opacity = r; }
  }
}
function tick() {
  const y = scrollY;
  const vh = innerHeight;
  fadeCopies(y, vh);
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * 0.5) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  reset();
  S.offX = OFF.x;
  S.offY = OFF.y;
  S.envRot = Math.sin(y / vh * 0.55) * 0.22 + Math.sin(performance.now() / 2600) * 0.06;
  SCENES[cur.name](p, cur.el);
  if (cur.name !== 'kaza') showPins(false);
  if (hudKey !== cur.name) {
    hudKey = cur.name;
    txt('hud-no', CHAPTERS[cur.name][0]);
    txt('hud-name', CHAPTERS[cur.name][1]);
    if (cur.name === 'dolu') txt('hud-no', p < 0.5 ? '01' : '02');
  }
  if (cur.name === 'dolu' || cur.name === 'kaza') {
    const n = cur.name === 'dolu' ? (p < 0.5 ? '01' : '02') : (p < 0.44 ? '03' : '04');
    txt('hud-no', n);
  }
  $('#hud-bar').style.transform = `scaleX(${p.toFixed(3)})`;
  if (active !== cur.el) {
    active = cur.el;
    if (!$('.beat', cur.el)) reveal($('[data-reveal]', cur.el));
  }
}

let canvasOn = true;
const visible = new Set();
new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
}).observe($('#film'));
new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
}).observe($('#iletisim'));

let lenis = null;
function marquee(track, speed) {
  let x = 0;
  const set = gsap.quickSetter(track, 'x', 'px');
  gsap.ticker.add((_, dt) => {
    const v = lenis?.velocity ?? 0;
    const w = track.scrollWidth / 2;
    x -= (speed + Math.abs(v) * 10) * (dt / 1000);
    if (w > 0) x = ((x % w) + w) % w - w;
    set(x);
  });
}

function start() {
  measure();
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    world.view('hero');
    world.snap();
    reset();
    S.offX = OFF.x;
    S.offY = OFF.y;
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
  marquee($('.brands__track'), 40);
}

// --- Açılış: zebra ışık tahtası, göçük, "tık", bantlar açılır --------------------------

function intro() {
  const el = $('#intro');
  if (reducedMotion) {
    el.remove();
    return Promise.resolve();
  }
  document.documentElement.classList.add('is-intro');
  const cv = $('#zebra');
  const w = innerWidth;
  const h = innerHeight;
  const r = Math.min(devicePixelRatio || 1, 1.5);
  cv.width = w * r;
  cv.height = h * r;
  const x = cv.getContext('2d');
  x.scale(r, r);
  const name = $('#intro-name');
  name.textContent = d.isletme.ad;

  const N = phone ? 15 : 17;
  const step = h / N;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const sig = Math.min(w, h) * 0.26;
  const st = { dent: 0, open: 0 };
  const SEGS = 48;
  const draw = () => {
    x.fillStyle = '#f2f3f5';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#0b0b10';
    for (let i = 0; i < N; i++) {
      const dir = i % 2 ? 1 : -1;
      const t = clamp(st.open * 1.6 - (Math.abs(i - N / 2) / N) * 0.6);
      const off = dir * w * 1.05 * t * t * (3 - 2 * t);
      const y0 = i * step + step * 0.28;
      const y1 = y0 + step * 0.44;
      x.beginPath();
      for (let s = 0; s <= SEGS; s++) {
        const px = (w * s) / SEGS;
        x[s ? 'lineTo' : 'moveTo'](px + off, bend(px, y0));
      }
      for (let s = SEGS; s >= 0; s--) {
        const px = (w * s) / SEGS;
        x.lineTo(px + off, bend(px, y1));
      }
      x.closePath();
      x.fill();
    }
  };
  function bend(px, py) {
    const dx = px - cx;
    const dy = py - cy;
    const e = Math.exp(-(dx * dx + dy * dy) / (sig * sig));
    return py - dy * 0.55 * st.dent * e;
  }

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
    draw();
    gsap.timeline({ onUpdate: draw, onComplete: finish })
      .to(st, { dent: 1, duration: 0.55, ease: 'power3.in' }, 0.2)
      .to(st, { dent: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' }, 0.95)
      .fromTo(name, { opacity: 0, '--wd': 50 }, { opacity: 1, '--wd': 125, duration: 0.6, ease: 'expo.out' }, 1.0)
      .to(name, { opacity: 0, duration: 0.25 }, 1.95)
      .to(st, { open: 1, duration: 0.8, ease: 'power2.inOut' }, 1.95);
  });
}

world.view('hero');
reset();
S.offX = OFF.x;
S.offY = OFF.y;
world.snap();
world.render();
const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((res) => setTimeout(res, 700))]);
fontsReady.then(intro).then(() => reveal($('#hero-title')));
start();
