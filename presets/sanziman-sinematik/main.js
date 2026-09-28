// Planet (sinematik aile, şanzıman): petrol mavisi, nane vurgu, pirinç dişli.
// 3D iki yerde kalır. (1) Açılış: şanzıman kutusunun kapağı bir kez aralanır, dişliler görünür.
// (2) Hizmetler: her hizmet kartında kamera ilgili parçaya gider (planet dişli, tork konvertörü, mekatronik,
// çift kavrama, CVT kasnakları, yağ kanalları); kartın etiketi parça adıdır. Hizmetlerden sonra sahne kararır
// ve çizimi durur; gerisi normal site bölümleridir.
import raw from '../../data/sektor-sanziman.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, autoHideHeader, telHref, waHref, mapsHref, mapsEmbed,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger, setStoryMode,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene, ISTASYON, ZEMIN } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / Math.max(1e-6, b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
// Dar ya da dikey tablet ekranda parça üst yarıda, kart altta (telefon kadrajı)
const mobile = () => innerWidth < 760 || (innerWidth < 1100 && innerHeight > innerWidth * 1.15);
const lite = weak || innerWidth < 760;
const B = import.meta.env.BASE_URL;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);

// --- Hizmet → sahnedeki parça -------------------------------------------------------------
// Kamera istasyon sırasıyla ilerlesin diye kartlar istasyon sırasına dizilir.
const SIRA = ['kutu', 'planet', 'tork', 'meka', 'dsg', 'cvt', 'yag'];
const PARCA = [
  { re: /tespit|test/i, id: 'kutu', etiket: 'Şanzıman kutusu' },
  { re: /revizyon/i, id: 'planet', etiket: 'Planet dişli seti · Kavrama paketleri' },
  { re: /tork/i, id: 'tork', etiket: 'Tork konvertörü · Kilitleme kavraması' },
  { re: /mekatronik/i, id: 'meka', etiket: 'Mekatronik ünite · Solenoidler · Valf gövdesi' },
  { re: /beyin|yazılım|adaptasyon/i, id: 'meka', etiket: 'Şanzıman beyni · Mekatronik' },
  { re: /dsg|çift kavrama/i, id: 'dsg', etiket: 'Çift kavrama · Tek ve çift vitesler' },
  { re: /manuel|debriyaj/i, id: 'dsg', etiket: 'Vites dişlileri · Kavrama diskleri' },
  { re: /cvt/i, id: 'cvt', etiket: 'Kayış · Kasnaklar' },
  { re: /yağ/i, id: 'yag', etiket: 'Şanzıman yağı · Yağ kanalları' },
];
const hizmetler = d.hizmetler
  .map((h, i) => ({ ...h, i, ...(PARCA.find((m) => m.re.test(h.baslik)) || { id: 'kutu', etiket: '' }) }))
  .sort((a, b) => SIRA.indexOf(a.id) - SIRA.indexOf(b.id) || a.i - b.i);

// --- İçerik ------------------------------------------------------------------------------
$('[data-top]').innerHTML = `
  <div class="top__row">
    <a class="top__brand" href="#kunye" aria-label="${ad}, sayfa başı"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
    <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
    <p class="top__status ${st.open ? 'is-open' : ''}"><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
    <a class="top__call" href="${telHref(d)}" data-magnetic aria-label="Telefonla ara">${icons.phone}<span class="top__num">${tel}</span></a>
  </div>`;

$('[data-hero]').innerHTML = `
  <h1 class="hero__title" data-hero-title>${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--acc" href="${telHref(d)}" data-magnetic>${icons.phone}<span>Ara</span></a>
    <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener" data-magnetic>${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener" data-magnetic>${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

$('[data-cards]').innerHTML = `
  <header class="svc-head">
    <h2 class="sec-title" data-rise>Hizmetler</h2>
    <p>Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </header>
  ${hizmetler.map((h, i) => `
    <div class="stop" data-stop="${esc(h.id)}">
      <article class="card">
        ${h.etiket ? `<p class="card__tag">${esc(h.etiket)}</p>` : ''}
        <h3 class="card__title">${esc(h.baslik)}</h3>
        <p class="card__text">${esc(h.aciklama)}</p>
        <p class="card__time">Süre: <b>${esc(h.sure)}</b></p>
        <p class="card__n" aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${String(hizmetler.length).padStart(2, '0')}</p>
      </article>
    </div>`).join('')}`;

$('#hakkinda').innerHTML = `
  <div class="about__body">
    <h2 class="sec-title" id="about-h" data-rise>Hakkında</h2>
    <p class="about__text" data-about-text>${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="stats">
      <div class="stat"><dt class="stat__lbl">Şaşmaz Oto Sanayi Sitesi'nde</dt><dd class="stat__num"><b>${yas}</b> yıl</dd></div>
      <div class="stat"><dt class="stat__lbl">haftada açık</dt><dd class="stat__num"><b>${acikGun}</b> gün</dd></div>
    </dl>
  </div>
  <figure class="about__img">
    <img src="${B}img/sektor-sanziman/usta-tablet.jpg" alt="Usta araç başında teşhis cihazıyla şanzıman kaydını okuyor" loading="lazy" decoding="async" width="1600" height="1067" />
  </figure>`;

$('#saatler').innerHTML = `
  <div class="shop__info">
    <h2 class="sec-title" id="shop-h" data-rise>Çalışma saatleri ve konum</h2>
    <p class="shop__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <table class="shop__hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${h === 'Kapalı' ? 'is-closed' : ''}"><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
    </table>
    <address class="shop__addr">${esc(d.iletisim.adres)}</address>
    <div class="shop__cta">
      <a class="btn btn--acc" href="${mapsHref(d)}" target="_blank" rel="noopener" data-magnetic>${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--ghost" href="${telHref(d)}" data-magnetic>${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="shop__map" data-map></div>`;

$('#yorumlar').innerHTML = `
  <header class="sec-head">
    <h2 class="sec-title" id="rev-h" data-rise>Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <div class="reviews__rail" data-lenis-prevent-touch><div class="reviews__track" data-rev-track>
    ${d.yorumlar.map((y) => `
      <figure class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${icons.star.repeat(Number(y.puan))}</p>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div></div>`;

$('#iletisim').innerHTML = `
  <h2 class="finale__title" id="fin-h">İletişim</h2>
  <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
  <div class="finale__cta">
    <a class="btn btn--acc btn--xl" href="${telHref(d)}" data-magnetic>${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--ghost btn--xl" href="${waHref(d)}" target="_blank" rel="noopener" data-magnetic>${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('[data-foot]').innerHTML = `
  <p class="foot__brand">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.</p>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne ------------------------------------------------------------------------------
const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__sz = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KY = ZEMIN + 2.45; // kutunun görsel merkezi

// İstasyon başına kamera pozu. Masaüstünde parça sağda (metin solda), telefonda üst yarıda.
function stationPose(x, m, o = {}) {
  const obj = V(x, o.y || 0, 0);
  const dir = (o.dir || V(0.62, 0.2, 0.76)).clone().normalize();
  const left = V(-dir.z, 0, dir.x).normalize();
  if (m) {
    const pos = obj.clone().addScaledVector(dir, o.Dm || 15);
    return { pos, look: obj.clone().add(V(0, -(o.drop ?? 3.4), 0)), fov: o.mfov || 56 };
  }
  const pos = obj.clone().addScaledVector(dir, o.D || 10);
  return { pos, look: obj.clone().addScaledVector(left, o.shift ?? 2.4).add(V(0, o.ly || 0, 0)), fov: o.fov || 38 };
}
const POSES = () => {
  const m = mobile();
  const X = ISTASYON;
  return {
    hero: stationPose(X.kutu, m, { y: KY, dir: V(0.78, 0.32, 0.55), D: 14, Dm: innerWidth < 760 ? 23 : 17, shift: 3.6, drop: innerWidth < 760 ? 7 : 4.6, fov: 38 }),
    kutu: stationPose(X.kutu, m, { y: KY, dir: V(0.55, 0.36, 0.76), D: 13, Dm: 15, shift: 3.2, drop: 3.3, fov: 38 }),
    planet: stationPose(X.planet, m, { D: 10.5, Dm: 17, drop: 3.1 }),
    tork: stationPose(X.tork, m, { dir: V(0.5, 0.25, 0.85), D: 9.5, Dm: 14 }),
    meka: stationPose(X.meka, m, { dir: V(0.35, 0.8, 0.7), D: 7.6, Dm: 10.5, shift: 2.2, drop: 2.2, mfov: 54 }),
    dsg: stationPose(X.dsg, m, { dir: V(0.32, 0.3, 0.9), D: 10, Dm: 14.5 }),
    cvt: stationPose(X.cvt, m, { dir: V(0.75, 0.12, 0.66), D: 10.5, Dm: 15, drop: 3.4, fov: 40 }),
    yag: m
      ? { pos: V(X.cvt + 10, 4.2, 14), look: V(X.cvt - 16, -5.5, -3), fov: 54 }
      : { pos: V(X.cvt + 8, 3.2, 9), look: V(X.cvt - 42, -0.2, -7), fov: 42 },
  };
};
// Durakta kamera hafifçe süzülür: ikinci poz, birincinin kaydırılmışı
const drift = (p, dx, dy, dz) => ({ ...p, pos: p.pos.clone().add(V(dx, dy, dz)) });
const DRIFT = [[0.5, 0.2, -0.6], [-0.7, 0.15, 0.3], [0.3, 0.25, -0.4], [0.6, 0.1, -0.5], [-0.5, 0.2, 0.3], [0.8, 0.3, 0.4]];

// Durak aralıkları film ilerlemesi (0..1) cinsinden DOM'dan ölçülür: kart yapışınca başlar, bırakınca biter.
// Aynı istasyona düşen kartlar (mekatronik + beyin, DSG + manuel) tek istasyon aralığında birleşir.
const filmEl = $('[data-film]');
const stopEls = $$('[data-stop]');
const stopIds = hizmetler.map((h) => h.id);
let R = stopEls.map((_, i) => [0.1 + i * 0.09, 0.18 + i * 0.09]);
let SR = {};
let HERO_END = 0.06;
function measure() {
  const vh = innerHeight;
  const total = Math.max(1, filmEl.offsetHeight - vh);
  const f0 = filmEl.getBoundingClientRect().top;
  const top = (el) => el.getBoundingClientRect().top - f0;
  R = stopEls.map((el) => {
    const card = el.firstElementChild;
    const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const stick = top(el) + padTop + card.offsetHeight + (mobile() ? 90 : 60) - vh;
    const release = top(el) + el.offsetHeight - vh;
    return [clamp((stick - vh * 0.12) / total), clamp(release / total)];
  });
  HERO_END = clamp((top(stopEls[0]) - vh * 0.6) / total);
  SR = {};
  let son = [HERO_END, HERO_END];
  for (const id of SIRA) {
    const idx = stopIds.map((s, i) => (s === id ? i : -1)).filter((i) => i >= 0);
    SR[id] = idx.length ? [R[idx[0]][0], R[idx.at(-1)][1]] : [son[1], son[1]];
    son = SR[id];
  }
}
const at = (id, u) => L(SR[id][0], SR[id][1], u);
const sp = (p, i, u0, j, u1) => seg(p, at(i, u0), at(j, u1));
const amount = (p, id) => {
  const [a, b] = SR[id];
  if (b <= a) return 0;
  return seg(p, a - 0.01, a + 0.02) * (1 - seg(p, b - 0.015, b + 0.01));
};
const local = (p, id) => seg(p, SR[id][0], SR[id][1]);
let KF = [];
function keyframes() {
  const K = [[0, 'hero'], [HERO_END * 0.55, 'hero']];
  stopIds.forEach((id, i) => { K.push([R[i][0], id], [R[i][1], id, DRIFT[i % DRIFT.length]]); });
  K.push([1, stopIds.at(-1) || 'hero', [0.8, 0.3, 0]]);
  for (let i = 1; i < K.length; i++) K[i][0] = Math.max(K[i][0], K[i - 1][0] + 1e-4);
  return K;
}
function remeasure() { measure(); KF = keyframes(); }
remeasure();

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const pose = (k) => (k[2] ? drift(P[k[1]], ...k[2]) : P[k[1]]);
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = pose(a), Bp = pose(b);
  const out = { pos: A.pos.clone().lerp(Bp.pos, t), look: A.look.clone().lerp(Bp.look, t), fov: L(A.fov, Bp.fov, t) };
  // İstasyonlar arası geçişte kamera hafifçe yükselir
  if (a[1] !== b[1]) out.pos.y += Math.sin(t * Math.PI) * 1.1;
  return out;
}
const activeStation = (p) => SIRA.find((id) => SR[id][1] > SR[id][0] && p >= SR[id][0] && p < SR[id][1]);

// DSG: durakta vites 1→6 döner; tekler K1, çiftler K2
function dsgGear(u) {
  const x = clamp(u, 0, 0.999) * 6;
  const g = Math.floor(x), f = x - g;
  const cur = g % 2 === 0 ? 1 : 0;
  const e = g === 0 ? 1 : L(1 - cur, cur, smooth(clamp(f / 0.22)));
  return { gear: g + 1, k1: e };
}

let introOpen = 0; // açılışta kutunun kapağı kendiliğinden aralanır
function filmState(p, time, vel) {
  const pose = filmPose(p);
  const heroW = 1 - seg(p, HERO_END * 0.4, HERO_END * 1.2);
  pose.pos.x += Math.sin(time * 0.3) * (0.12 + heroW * 0.25);
  pose.pos.y += Math.sin(time * 0.45) * 0.06;
  const k = {};
  for (const id of SIRA) k[id] = amount(p, id);
  const act = activeStation(p);
  const fix = act ? smooth(seg(local(p, act), 0.3, 0.7)) : 1;
  const q = {
    open: Math.max(introOpen * 0.55, L(0.55, 1, smooth(sp(p, 'kutu', 0, 'kutu', 0.6))) * seg(p, HERO_END * 0.5, HERO_END)),
    turn: -0.3 + Math.sin(time * 0.12) * 0.3 + p * 1.5,
    torkOpen: smooth(sp(p, 'tork', 0, 'tork', 0.35)) * (1 - 0.6 * smooth(sp(p, 'tork', 0.95, 'meka', 0.1))),
    torkLock: smooth(sp(p, 'tork', 0.5, 'tork', 0.8)),
    meka: smooth(sp(p, 'meka', 0.25, 'meka', 0.85)),
    dsgK1: dsgGear(local(p, 'dsg')).k1,
    cvt: p < SR.cvt[1] ? smooth(sp(p, 'cvt', 0.05, 'cvt', 0.85)) : L(1, 0.45, smooth(sp(p, 'cvt', 1, 'yag', 0.4))),
  };
  const ov = sp(p, 'yag', -0.05, 'yag', 0.4);
  return {
    ...pose, k, q, fix,
    assemble: L(0.18, 1, smooth(seg(p, HERO_END * 0.6, at('planet', 0.45)))),
    spin: 0.35 + vel * 2.5,
    oil: smooth(sp(p, 'yag', -0.1, 'yag', 0.3)),
    overview: SR.yag[1] > SR.yag[0] && p > at('yag', 0),
    fogNear: mobile() ? L(13, 28, ov) : L(9, 22, ov),
    fogFar: mobile() ? L(34, 90, ov) : L(26, 75, ov),
    env: 0.5 + heroW * 0.3,
  };
}

// --- Başlangıç -------------------------------------------------------------------------
const topEl = $('[data-top]');
const heroTitle = $('[data-hero-title]');
const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'w', charsClass: 'ch' });

let filmP = 0, filmTarget = 0, vel = 0;
let filmST = null;

function setupScroll() {
  const lenis = initSmoothScroll();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  ScrollTrigger.addEventListener('refresh', remeasure);
  remeasure();

  filmST = ScrollTrigger.create({
    trigger: filmEl, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  // Hizmetler bitince sahne kararır; aşağıdaki bölümler düz zemin üstünde
  ScrollTrigger.create({
    trigger: filmEl, start: 'bottom bottom', end: 'bottom 40%',
    onUpdate: (self) => (canvas.style.opacity = 1 - self.progress),
  });
  // Kartlar boyunca (telefon) tek alt öğe kart: alt çubuk iner
  ScrollTrigger.create({
    trigger: stopEls[0], start: 'top 70%', endTrigger: stopEls.at(-1), end: () => `bottom ${Math.round(innerHeight * 0.9)}px`,
    onToggle: (s) => setStoryMode(innerWidth < 900 && s.isActive ? true : null),
  });
  // Kart durağında belirir ve yapışır; bırakırken çekilir (görünmezken dokunmayı almaz)
  $$('.card').forEach((card) => {
    const stop = card.parentElement;
    const pad = () => parseFloat(getComputedStyle(stop).paddingTop) || 0;
    gsap.fromTo(card, { autoAlpha: 0, y: 28 }, {
      autoAlpha: 1, y: 0, ease: 'power2.out', immediateRender: true,
      scrollTrigger: { trigger: stop, start: () => `top+=${Math.round(pad() * 0.6)} bottom`, end: () => `top+=${Math.round(pad())} 80%`, scrub: 0.4 },
    });
    gsap.fromTo(card, { autoAlpha: 1, y: 0 }, {
      autoAlpha: 0, y: -24, ease: 'power1.in', immediateRender: false,
      scrollTrigger: { trigger: stop, start: 'bottom bottom', end: 'bottom 72%', scrub: 0.4 },
    });
  });
  ScrollTrigger.create({
    trigger: '#hakkinda', start: 'top 80px', end: 'max',
    onToggle: (self) => topEl.classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar: kelime kelime yükselir (İ noktası için üstte pay var)
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'words', wordsClass: 'rw' });
    gsap.fromTo(s.words, { yPercent: 110, autoAlpha: 0, rotate: 4 }, {
      yPercent: 0, autoAlpha: 1, rotate: 0, duration: 0.9, stagger: 0.05, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });
  const aboutText = $('[data-about-text]');
  const words = new SplitText(aboutText, { type: 'words' }).words;
  gsap.fromTo(words, { opacity: 0.2 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 55%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.16, yPercent: -5 }, {
    scale: 1, yPercent: 5, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Yorumlar: masaüstünde kaydırmayla yana akar; telefonda parmakla kaydırılır
  const track = $('[data-rev-track]');
  ScrollTrigger.matchMedia({
    '(min-width: 760px)': () => {
      gsap.to(track, {
        x: () => -Math.max(0, track.scrollWidth - track.parentElement.clientWidth),
        ease: 'none',
        scrollTrigger: { trigger: '.reviews', start: 'top 70%', end: 'bottom 30%', scrub: true, invalidateOnRefresh: true },
      });
    },
  });
}

let stageVisible = true;
document.addEventListener('visibilitychange', () => (stageVisible = !document.hidden));

let lastT = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (!stageVisible) return;
  const time = now / 1000;
  vel *= 0.92;
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  // Film bitip sahne karardıktan sonra çizim durur
  const filmActive = !filmST || filmST.progress < 1;
  if (filmActive || canvas.style.opacity !== '0') S.update(filmState(filmP, time, vel), now);
}

addEventListener('resize', () => S.resize());

if (finePointer && !reducedMotion) {
  const cur = $('[data-cursor]');
  const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); cur.classList.add('is-moved'); });
  document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hover', !!e.target.closest('a, button')));
  document.body.classList.add('has-cursor');
  $$('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.25);
      my((e.clientY - r.top - r.height / 2) * 0.3);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

// Telefonda başlık aşağı kaydırınca saklanır
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Açılış: künye gelir, kutunun kapağı bir kez aralanır (perde yok) ------------------------
if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  S.compile();
  introOpen = 1;
  const still = () => S.update(filmState(0, 0, 0));
  still();
  S.ready.then(() => { still(); requestAnimationFrame(still); });
  addEventListener('resize', still);
} else {
  setupScroll();
  S.compile();
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.02, ease: 'power4.out' }, 0)
    .fromTo(['.hero__what', '.kunye', '.hero__cta'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.2);
  const io = { v: 0 };
  gsap.to(io, { v: 1, duration: 2.2, delay: 0.3, ease: 'power2.inOut', onUpdate: () => (introOpen = io.v) });
  requestAnimationFrame(tick);
  addEventListener('load', () => ScrollTrigger.refresh());
}
