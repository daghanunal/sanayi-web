import veri from '../../data/tonaj.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, autoHideHeader, setStoryMode,
} from '../../shared/core.js';
import * as THREE from 'three';
import { createScene } from './scene.js';

// Tonaj (sinematik aile): gece atölyesinde 3D çekici. Künyenin arkasında önden görünür; Hizmetler'de her hizmete
// gelince kamera ilgili parçaya gider (kabin yatar, şanzıman döner, fren hattı nabız atar, körük iner). Hizmetlerden
// sonra düz zeminli bölümler sahneyi kapatır ve çizim durur. Sayı sayaçları, ölçüm göstergeleri ve açılış perdesi yok.
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(veri);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const pad = (n) => String(n).padStart(2, '0');
const mobile = () => innerWidth < 760;
const phoneMq = matchMedia('(max-width: 899px)');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);

// Hizmet → sahnedeki poz ve parça adı. Sıra kameranın aracın etrafında dolaştığı yol: motor, altına girilir
// (şanzıman, fren), arkadan çıkılır (AdBlue, körük), yandan kabine ve öne dönülür, en sonda araç tümüyle görünür.
const DURAK = [
  { re: /motor/i, poz: 'motor', hl: 'motor', parca: 'Motor' },
  { re: /şanzıman|diferansiyel/i, poz: 'sanziman', hl: 'sanziman', parca: 'Şanzıman ve şaft' },
  { re: /fren/i, poz: 'fren', hl: 'fren', parca: 'Fren körükleri ve hava hattı' },
  { re: /adblue|scr/i, poz: 'adblue', hl: 'adblue', parca: 'AdBlue deposu ve SCR' },
  { re: /süspansiyon|dingil|körük/i, poz: 'korug', hl: 'korug', parca: 'Havalı körük ve dingil' },
  { re: /takograf/i, poz: 'intro', hl: null, parca: 'Kabin' },
  { re: /elektrik/i, poz: 'hero', hl: null, parca: 'Farlar ve tesisat' },
  { re: /yol yardım/i, poz: 'over', hl: null, parca: '' },
];
const hizmetler = d.hizmetler
  .map((h, i) => {
    const k = DURAK.findIndex((x) => x.re.test(h.baslik));
    return { ...h, durak: DURAK[k] ?? { poz: 'over', hl: null, parca: '' }, sira: k < 0 ? 99 + i : k };
  })
  .sort((a, b) => a.sira - b.sira);

// --- İçerik ------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

$('#kunye').innerHTML = `
  <div class="hero__in">
    <h1 class="hero__title${d.isletme.ad.length > 18 ? ' is-long' : ''}" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <header class="tour__intro">
    <h2 class="sec-title" id="hizmet-t">Hizmetler</h2>
    <p class="tour__lead">Çekici, kamyon, otobüs ve midibüs. Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </header>
  ${hizmetler.map((h, i) => `
    <article class="stop" data-stop="${i}">
      <div class="card">
        <p class="card__stop"><span>${pad(i + 1)}</span>${h.durak.parca ? `<b>${esc(h.durak.parca)}</b>` : ''}</p>
        <h3 class="card__title">${esc(h.baslik)}</h3>
        <p class="card__text">${esc(h.aciklama)}</p>
        <p class="card__meta">${h.sure ? `<span>Süre <b>${esc(h.sure)}</b></span>` : '<span></span>'}
          <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${h.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bilgi alın</span></a></p>
      </div>
    </article>`).join('')}`;

const g = d.galeri || [];
$('#hakkinda').innerHTML = `
  <figure class="about__img"><img src="${esc(g[1]?.src || g[0]?.src || '')}" alt="${esc(g[1]?.alt || g[0]?.alt || '')}" loading="lazy" decoding="async" width="1600" height="1067" /></figure>
  <div class="about__body">
    <h2 class="sec-title" id="hakkinda-t">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="stats">
      <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
      <div class="stat"><dt>Haftada açık</dt><dd><b>${acikGun}</b> gün</dd></div>
    </dl>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="sec-title" id="saatler-t">Çalışma saatleri ve konum</h2>
    <p class="shop__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <dl class="shop__hours">
      ${saatListesi(d.saatler).map(([gun, s]) => `<div class="${s === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(gun)}</dt><dd>${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="shop__addr">${esc(d.iletisim.adres)}</p>
    <div class="shop__cta">
      <a class="btn btn--red" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="shop__map" data-map><span>Harita</span></div>`;

const yildiz = (n) => `<p class="rev__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <header class="sec-head">
    <h2 class="sec-title" id="yorum-t">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <div class="reviews__rail" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        ${yildiz(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <div class="contact__in">
    <h2 class="contact__title" id="iletisim-t">İletişim</h2>
    <p class="contact__lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Yolda kaldıysanız konumunuzu WhatsApp'tan gönderebilirsiniz.</p>
    <div class="contact__cta">
      <a class="btn btn--red btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="contact__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__in">
    <p class="foot__name">${ad}</p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D çekici temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Başlık: aşağı inince koyulaşır; telefonda aşağı kaydırırken saklanır (tek üst öğe)
const top = $('#top');
if (phoneMq.matches) autoHideHeader(top, { offset: 120 });
const solid = () => top.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- Sahne -------------------------------------------------------------------

const canvas = $('[data-stage]');
let S = null;
try {
  S = createScene(canvas, { name: d.isletme.ad });
  document.fonts?.load("40px 'Alfa Slab One'").then(() => S.drawName(d.isletme.ad));
} catch {
  canvas.remove();
  document.documentElement.classList.add('no-webgl');
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Kamera pozları (araç ön +x, aks ortası orijin). Telefonda parça ekranın üst yarısında kalır (sh).
const POSES = () => {
  const m = mobile();
  const P = (pd, ld, fd, pm, lm, fm, sh = 0) => (m ? { pos: V(...pm), look: V(...lm), fov: fm, sh } : { pos: V(...pd), look: V(...ld), fov: fd, sh: 0 });
  return {
    hero: P([9.6, 1.05, 7.4], [0.4, 1.75, 2.5], 36, [11.2, 1.7, 9.6], [0.5, -0.5, -0.4], 46, 0.1),
    intro: P([6.2, 2.6, 6.8], [1.4, 1.4, 0.6], 40, [8.2, 3.2, 8.4], [1.6, 0.2, 0], 50, 0.2),
    motor: P([0.2, 3.5, 5.4], [2.3, 1.0, -0.5], 44, [0.6, 3.6, 5.6], [2.1, 1.1, 0], 58, 0.24),
    enter: P([0.8, 0.26, 3.1], [1.1, 0.8, 0], 60, [0.8, 0.28, 3.4], [1.0, 0.8, 0], 66, 0.24),
    sanziman: P([-0.35, 0.22, 0.75], [1.05, 0.82, 0], 58, [-0.6, 0.22, 0.8], [1.05, 0.8, 0], 68, 0.24),
    fren: P([-0.1, 0.26, -0.35], [-1.7, 0.72, 0.62], 62, [0.1, 0.26, -0.45], [-1.7, 0.75, 0.62], 72, 0.24),
    out: P([0.3, 0.3, -2.2], [-1.0, 0.7, -0.6], 58, [0.4, 0.35, -2.6], [-1.0, 0.7, -0.6], 64, 0.24),
    adblue: P([0.3, 1.15, -3.6], [-1.05, 0.72, -0.8], 44, [0.4, 1.3, -4.2], [-1.05, 0.75, -0.8], 54, 0.24),
    arka: P([-4.4, 1.3, -4.6], [-2.2, 0.7, 0], 50, [-4.8, 1.5, -5.4], [-2.2, 0.8, 0], 58, 0.22),
    korug: P([-5.2, 0.42, 0.45], [-2.3, 0.66, 0.3], 50, [-6.2, 0.55, 0.35], [-2.3, 0.8, 0.3], 56, 0.22),
    yan: P([-7.4, 1.8, 5.2], [-1.2, 1.0, 0], 44, [-8.6, 2.2, 6.6], [-1.2, 0.6, 0], 52, 0.22),
    over: P([-9.2, 4.0, 7.4], [0.3, 1.3, 0], 38, [-12, 5.4, 10.4], [0, 0, 0], 48, 0.2),
  };
};
// İki poz arasında gövdenin içinden geçmemek için ara nokta
const ARA = { 'motor>sanziman': 'enter', 'fren>adblue': 'out', 'adblue>korug': 'arka', 'korug>intro': 'yan' };

let keys = []; // { at, name }
let stopAt = [];
let tourEnd = 0;
function layout() {
  const ih = innerHeight;
  const R = mobile() ? 0.62 : 0.5;
  const y = (el) => el.getBoundingClientRect().top + scrollY;
  const at = (el) => y(el) + el.offsetHeight / 2 - ih * R;
  stopAt = $$('[data-stop]').map((s) => at($('.card', s)));
  const base = [{ at: 0, name: 'hero' }];
  hizmetler.forEach((h, i) => base.push({ at: stopAt[i], name: h.durak.poz }));
  keys = [];
  base.forEach((k, j) => {
    keys.push(k);
    const b = base[j + 1];
    const ara = b && ARA[`${k.name}>${b.name}`];
    if (ara) keys.push({ at: (k.at + b.at) / 2, name: ara });
  });
  const tour = $('#hizmetler');
  tourEnd = y(tour) + tour.offsetHeight;
}

function tourPose(sy) {
  const P = POSES();
  const get = (n) => P[n] || P.over;
  if (sy <= keys[0].at) return { ...get(keys[0].name) };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (sy <= b.at) {
      const t = smooth(seg(sy, a.at, b.at));
      const A = get(a.name), B = get(b.name);
      return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t), sh: L(A.sh, B.sh, t) };
    }
  }
  const Z = get(keys.at(-1).name);
  return { pos: Z.pos.clone(), look: Z.look.clone(), fov: Z.fov, sh: Z.sh };
}

function tourState(sy, time) {
  const ih = innerHeight;
  const pose = tourPose(sy);
  const yakin = (poz, w = 0.75) => {
    let v = 0;
    hizmetler.forEach((h, i) => { if (h.durak.poz === poz) v = Math.max(v, clamp(1 - Math.abs(sy - stopAt[i]) / (ih * w))); });
    return v;
  };
  // dışarıdaki çekimlerde hafif el kamerası salınımı; son hizmette araç yavaşça döner
  const outside = pose.pos.y > 1 ? 1 : 0;
  pose.pos.x += Math.sin(time * 0.3) * 0.12 * outside;
  pose.pos.y += Math.sin(time * 0.45) * 0.05 * outside;
  const overAt = stopAt.at(-1) ?? 0;
  if (hizmetler.at(-1)?.durak.poz === 'over' && sy > overAt - ih * 0.3) pose.pos.applyAxisAngle(V(0, 1, 0), (sy - overAt) / ih * 0.3 + time * 0.012);
  let active = -1, best = 0;
  stopAt.forEach((a, i) => {
    const v = clamp(1 - Math.abs(sy - a) / (ih * 0.55));
    if (v > best) { best = v; active = i; }
  });
  const ki = hizmetler.findIndex((h) => h.durak.poz === 'korug');
  const kAt = stopAt[ki] ?? -1e6;
  const sag = smooth(seg(sy, kAt - ih * 0.7, kAt - ih * 0.3));
  const rise = smooth(seg(sy, kAt - ih * 0.1, kAt + ih * 0.3));
  const under = clamp((0.95 - pose.pos.y) / 0.55);
  return {
    ...pose,
    cabTilt: 0.95 * smooth(clamp(yakin('motor', 0.9) * 1.9)),
    bellow: 1 - 0.36 * sag + 0.36 * rise,
    spin: 0.3 + 1.3 * yakin('sanziman'),
    highlight: active >= 0 ? hizmetler[active].durak.hl : null,
    hlAmount: smooth(clamp(best * 1.6)) * 0.8,
    pulse: yakin('fren', 0.7),
    workLamp: under,
    underLight: under * 0.7,
    headlights: Math.max(1 - seg(sy, 0, ih * 0.9), yakin('hero'), yakin('over') * 0.8),
    hazard: yakin('over') * 0.9,
    env: L(0.45, 0.28, under),
  };
}

let solids = [];
function measure() {
  layout();
  const y = (el) => el.getBoundingClientRect().top + scrollY;
  const r = $$('.solid').map((el) => [y(el), y(el) + el.offsetHeight]).sort((a, b) => a[0] - b[0]);
  solids = [];
  for (const x of r) {
    const l = solids.at(-1);
    if (l && x[0] - l[1] < 4) l[1] = Math.max(l[1], x[1]);
    else solids.push(x.slice());
  }
}

// Kart etkinliği (kenar çizgisi)
const cards = $$('[data-stop] .card');
let lastActive = -2;
function cardUI(sy) {
  const ih = innerHeight;
  let active = -1;
  stopAt.forEach((a, i) => { if (Math.abs(sy - a) < ih * 0.42) active = i; });
  if (active !== lastActive) {
    cards.forEach((c, i) => c.classList.toggle('is-active', i === active));
    lastActive = active;
  }
}

function tick(now) {
  requestAnimationFrame(tick);
  const sy = scrollY;
  const ih = innerHeight;
  if (sy < tourEnd + ih) cardUI(sy);
  if (!S || document.hidden) return;
  const covered = solids.some(([a, b]) => a <= sy && b >= sy + ih);
  if (!covered && sy < tourEnd) S.update(tourState(sy, reducedMotion ? 0 : now / 1000), now);
}

addEventListener('resize', () => { S?.resize(); measure(); });

// --- Hareket -------------------------------------------------------------------

measure();
if (S) gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' });
if (reducedMotion) {
  document.documentElement.classList.add('is-static');
} else {
  initSmoothScroll();
  gsap.from('.hero__in > *', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  $$('.card').forEach((c) => gsap.from(c, { y: 50, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 92%', toggleActions: 'play none none none' } }));
  gsap.fromTo('.about__img img', { scale: 1.12 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Telefonda hizmetler boyunca alt çubuk çekilir: kart ekranın altında tek alt öğe
  if (phoneMq.matches) {
    const stops = $$('[data-stop]');
    ScrollTrigger.create({
      trigger: stops[0], start: 'top 70%', endTrigger: stops.at(-1), end: 'bottom 30%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
}
requestAnimationFrame(tick);
S?.readyP.then(() => { measure(); ScrollTrigger.refresh(); }).catch(() => document.documentElement.classList.add('no-webgl'));
document.fonts?.ready.then(() => { measure(); ScrollTrigger.refresh(); });
addEventListener('load', () => { measure(); ScrollTrigger.refresh(); });
