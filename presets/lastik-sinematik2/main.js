import pist from '../../data/pist.json';
import extra from '../../data/lastik-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger, setStoryMode,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({
  ...pist, ...extra,
  otel: { ...pist.otel, ...extra.otel },
  iz: { ...(pist.iz || {}), ...extra.iz },
});
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const mmf = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const LV = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const io = gsap.parseEase('power2.inOut');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const phone = () => innerWidth < 900;
const upper = (s) => s.toLocaleUpperCase('tr');
const pad2 = (n) => String(n).padStart(2, '0');

// "2004'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres,
  garanti: d.garanti, otelBaslik: d.otel.baslik,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('[data-wa-otel]').href = waHref(d, `Merhaba ${d.isletme.ad}, lastik oteli için yer ayırtmak istiyorum.`);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('.top__call').setAttribute('aria-label', `${d.iletisim.telefon} numarasını ara`);
$('[data-since]').textContent = `${ablative(d.isletme.kurulus)} beri Şaşmaz'da`;
$('[data-olcu]').textContent = d.olcu;
$('[data-dis-yeni]').textContent = `${mmf(d.dis.yeni)} mm`;
const stokStat = d.istatistikler.find((s) => /stok/.test(s.etiket));
$('[data-stok]').textContent = stokStat ? `${nf(stokStat.deger)} lastik` : 'Hazır';

// Başlık: kelime başına satır; "&" sonraki kelimeyle aynı satırda, en çok 3 dengeli satır
const words = d.isletme.ad.split(/\s+/).reduce((acc, w) => {
  if (acc.length && acc.at(-1) === '&') acc[acc.length - 1] += ` ${w}`;
  else acc.push(w);
  return acc;
}, []);
if (words.length > 3) {
  const target = Math.ceil(words.join(' ').length / 3);
  const packed = [];
  for (const w of words) {
    const last = packed.at(-1);
    if (last && packed.length >= 3) packed[packed.length - 1] += ` ${w}`;
    else if (last && (last.length + 1 + w.length <= target || last.length < 4)) packed[packed.length - 1] += ` ${w}`;
    else packed.push(w);
  }
  words.splice(0, words.length, ...packed);
}
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = words.map((w) => `<span class="line"><span class="line__in">${esc(upper(w))}</span></span>`).join('');
heroTitle.style.setProperty('--len', Math.max(5, ...words.map((w) => [...w].length)));
heroTitle.setAttribute('aria-label', d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
const big = $('[data-status-big]');
big.textContent = status.text;
big.classList.toggle('is-open', status.open);

// Diş bölümü
$('[data-dis-title]').textContent = d.dis.baslik;
$('[data-dis-note]').textContent = d.dis.not;
$('[data-mark-kis]').style.setProperty('--at', `${(d.dis.kis / d.dis.yeni) * 100}%`);
$('[data-mark-kis]').textContent = mmf(d.dis.kis).replace(',0', '');
$('[data-mark-sinir]').style.setProperty('--at', `${(d.dis.sinir / d.dis.yeni) * 100}%`);
$('[data-mark-sinir]').textContent = mmf(d.dis.sinir);
const disStages = [...d.dis.asamalar, { mm: d.dis.yeni, baslik: 'Yenisi takıldı', metin: d.isletme.slogan, yeni: true }];
$('[data-dis-stages]').innerHTML = disStages.map((s, i) => `
  <div class="stage-txt${s.yeni ? ' stage-txt--new' : ''}" data-stage-txt="${i}">
    <p class="stage-txt__mm">${esc(mmf(s.mm))} mm</p>
    <h3>${esc(s.baslik)}</h3>
    <p class="stage-txt__p">${esc(s.metin)}</p>
  </div>`).join('');

// İz bölümleri: istasyonlar (kar direkleri). İki kısa sahneye bölünür (pin ≤ 3 ekran).
$('[data-iz-title]').textContent = d.iz.baslik;
$('[data-iz-sub]').textContent = d.iz.alt;
$('[data-iz2-title]').textContent = d.iz.baslik2 || d.iz.baslik;
$('[data-iz2-sub]').textContent = d.iz.alt2 || '';
const STATION_GAP = 3.4;
const NS = d.hizmetler.length;
const SPLIT = Math.ceil(NS / 2) + (NS > 5 ? 0 : 0); // ilk sahnede ilk yarı (7 → 4 + 3)
const stationXs = d.hizmetler.map((_, i) => 2.6 + i * STATION_GAP);
const IZ_END = stationXs.at(-1) + 3.0;
const IZ_MID = SPLIT < NS ? (stationXs[SPLIT - 1] + stationXs[SPLIT]) / 2 + 0.6 : IZ_END;
const stationBoxes = $$('[data-stations]');
d.hizmetler.forEach((s, i) => {
  const box = stationBoxes[i < SPLIT ? 0 : 1];
  box.insertAdjacentHTML('beforeend', `
  <article class="st" data-st="${i}">
    <p class="st__top"><span class="st__n">${pad2(i + 1)}<small>/${pad2(NS)}</small></span><span class="st__time">${esc(s.sure)}</span></p>
    <h3 class="st__name">${esc(s.baslik)}</h3>
    <p class="st__desc">${esc(s.aciklama)}</p>
  </article>`);
});
if (SPLIT >= NS) $('.ch--iz2').remove();
const stEls = $$('[data-st]');
const odoEls = $$('[data-odo]');

// Otel
const otelStat = d.istatistikler.find((s) => /otel/.test(s.etiket)) ?? d.istatistikler.at(-1);
$('[data-otel-label]').textContent = otelStat.etiket;
$('[data-otel-list]').innerHTML = d.otel.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');
const otelTxt = $('[data-otel-txt]');
const setOtelTxt = () => (otelTxt.textContent = phone() && d.otel.kisa ? d.otel.kisa : d.otel.metin);
setOtelTxt();

// Mevsim
$('[data-kural]').textContent = d.mevsimKural;
$('[data-season]').innerHTML = ['kis', 'yaz'].map((k) => {
  const m = d.mevsim[k];
  return `
  <figure class="scard scard--${k}">
    <div class="scard__img"><img src="${esc(m.gorsel)}" alt="${esc(m.baslik)}: temsilî fotoğraf" loading="lazy" width="900" height="620" /></div>
    <figcaption>
      <p class="scard__when">${esc(m.zaman)}</p>
      <h3>${esc(m.baslik)}</h3>
      <p>${esc(m.metin)}</p>
      <a class="btn btn--sm ${k === 'kis' ? 'btn--orange' : 'btn--ink'}" target="_blank" rel="noopener" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${m.baslik.toLocaleLowerCase('tr')} için randevu almak istiyorum.`))}">${icons.whatsapp}Randevu al</a>
    </figcaption>
  </figure>`;
}).join('');

// Süreç
const mins = d.surec.map((s) => parseInt(s.sure, 10) || 0);
const total = mins.reduce((a, b) => a + b, 0);
$('.flow__title').innerHTML = `Liftten inene kadar <b>${total}</b> dakika.`;
let acc = 0;
$('[data-flow]').innerHTML = d.surec.map((s, i) => {
  acc += mins[i];
  return `
  <li class="fstep" data-fstep="${i}" data-at="${acc}">
    <span class="fstep__t">${esc(s.sure)}</span>
    <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
  </li>`;
}).join('');

// Rakamlar
const stats = d.istatistikler.map((s) => ({
  ...s, deger: s.deger === 'kurulus' ? new Date().getFullYear() - d.isletme.kurulus : s.deger,
}));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="num"><p class="num__v"><b data-num="${s.deger}">${nf(s.deger)}</b><span>${esc(s.sonek)}</span></p><p class="num__l">${esc(s.etiket)}</p></li>`).join('');

// Yorumlar (örnek)
$('[data-puan]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-stars]').setAttribute('aria-label', 'Örnek puan, 5 üzerinden');
$('[data-puan-adet]').textContent = 'Örnek puan ve yorumlar · gösterim amaçlı';
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="card">
    <p class="card__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(upper(m))}</span><i></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, h]) => `<div><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');

$('[data-final-title]').textContent = d.finalBaslik;
$('[data-final-alt]').textContent = d.finalAlt;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// --- Sahne ---------------------------------------------------------------------

let stage = null;
const canvas = $('[data-stage]');
let wheelReady = null;

async function makeStage() {
  const { createStage } = await import('./scene.js');
  let ready;
  wheelReady = new Promise((r) => (ready = r));
  try {
    stage = createStage(canvas, { ad: d.isletme.ad, stations: { start: 0, xs: stationXs }, onReady: ready });
  } catch (e) {
    console.warn('WebGL yok', e);
    document.documentElement.classList.add('no-webgl');
    ready();
    return;
  }
  addEventListener('resize', () => stage.resize());
}

// Kamera dili: yüksek anahtarlı ürün çekimi; uzun odak, sakin, hafif yukarıdan (kardeş "drift"ten farklı).
const P = {
  hero: { cam: [2.2, 1.05, 5.4], target: [0, -0.05, 0], yaw: -0.5, off: [0.2, 0.02], offP: [0, 0.14], fitP: 1.98 },
  hero1: { cam: [3.0, 1.9, 4.2], target: [0, -0.1, 0], yaw: 0.28, off: [0.2, 0], offP: [0, 0.06], fitP: 1.6 },
  dis0: { cam: [2.25, 1.5, 3.05], target: [0, 0.3, 0.2], yaw: 1.2, off: [0.25, 0], offP: [0, 0.07], fitP: 1.26 },
  dis1: { cam: [1.55, 1.15, 2.4], target: [0, 0.4, 0.28], yaw: 1.3, off: [0.25, 0], offP: [0, 0.11], fitP: 1.21 },
  iz0: { cam: [4.4, 2.1, 4.6], target: [-0.6, -0.4, 0], yaw: 0, off: [0.16, -0.04], offP: [0, 0.02], fitP: 1.28 },
  final: { cam: [0, 1.1, 7.6], target: [0, -0.1, 0], yaw: -0.3, off: [0, 0.3], offP: [0, 0.02], fitP: 1.7 },
};
function blend(a, b, t) {
  return {
    cam: LV(a.cam, b.cam, t), target: LV(a.target, b.target, t), yaw: L(a.yaw ?? 0, b.yaw ?? 0, t),
    off: LV(a.off, b.off, t), offP: LV(a.offP, b.offP, t), fitP: L(a.fitP ?? 1.45, b.fitP ?? 1.45, t),
  };
}
const shift = (pose, x) => ({ ...pose, cam: [pose.cam[0] + x, pose.cam[1], pose.cam[2]], target: [pose.target[0] + x, pose.target[1], pose.target[2]] });

const disWear = (p) => io(seg(p, 0.14, 0.72)) * (1 - io(seg(p, 0.8, 0.93)));
let izX = 0;
function izPose(x, t0) {
  izX = x;
  const b = t0 < 1 ? blend(P.dis1, P.iz0, t0) : shift(P.iz0, x);
  return { ...b, tireX: x, rollAngle: -x, trail: x, poles: true, snow: 0.7, snowSpeed: 1 };
}
function pose(id, p) {
  let b, o = {};
  switch (id) {
    case 'hero':
      b = blend(P.hero, P.hero1, io(seg(p, 0.1, 1)));
      o = { spin: 0.3, snow: 0.95 };
      break;
    case 'dis': {
      const t0 = io(seg(p, 0, 0.16));
      b = t0 < 1 ? blend(P.hero1, P.dis0, t0) : blend(P.dis0, P.dis1, seg(p, 0.16, 1));
      const wear = disWear(p);
      o = { spin: 0.22, wear, snow: 0.55, warm: wear > 0.8 ? (wear - 0.8) * 4 : 0 };
      break;
    }
    case 'iz':
      return { mode: 'tire', ...izPose(IZ_MID * seg(p, 0.08, 1), io(seg(p, 0, 0.1))) };
    case 'iz2':
      return { mode: 'tire', ...izPose(IZ_MID + (IZ_END - IZ_MID) * seg(p, 0, 0.96), 1) };
    case 'otel': {
      const a = L(-0.55, 0.45, p);
      const r = innerWidth > innerHeight ? 7.6 : 6.9;
      b = {
        cam: [Math.sin(a) * r, L(1.9, 3.3, p), Math.cos(a) * r - 1], target: [0, L(0.25, 0.45, p), -1.2], yaw: 0,
        off: [0.26, 0], offP: [0, -0.1], fitP: 1.4,
      };
      o = { mode: 'otel', otel: seg(p, 0.02, 0.72), snow: 0.9 };
      break;
    }
    case 'final': {
      const drop = seg(p, 0.04, 0.26);
      const y = drop < 1 ? 4.5 * (1 - gsap.parseEase('bounce.out')(drop)) : 0;
      const roll = io(seg(p, 0.45, 0.9));
      const x = roll * (innerWidth > innerHeight ? 2.4 : 1.2);
      b = { ...P.final, target: [x * 0.5, -0.1, 0], cam: [x * 0.5, 1.1, innerWidth > innerHeight ? 7.6 : 6.6] };
      b.yaw = L(-0.3, 0, seg(p, 0.3, 0.55));
      o = { tireY: y, tireX: x, spin: 0.2, rollAngle: roll > 0 ? -x : null, trail2: x, trail2From: 0, puffOk: true, snow: 0.95 };
      break;
    }
    default:
      return null;
  }
  return { ...b, mode: 'tire', ...o };
}

// Aktif bölüm: ekranın ortasındaki bölüm
const chapters = $$('[data-ch]').map((el) => ({ id: el.dataset.ch, el }));
let footShift = 0;
function active() {
  const mid = innerHeight / 2 - footShift;
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) {
      const span = r.height - innerHeight;
      return { id: c.id, p: span > 0 ? clamp(-r.top / span) : 0.5 };
    }
  }
  return null;
}

// İstasyon kartı: lastik bir kar direğini geçince o hizmet öne çıkar
let lastSt = -2;
function placeStations(id) {
  if (id !== 'iz' && id !== 'iz2') return;
  let passed = 0;
  stationXs.forEach((x) => { if (izX > x - 0.6) passed++; });
  let cur = passed - 1;
  // ikinci sahnenin başında ilk kartını hazır göster (önceki sahnenin kartı onunla gider)
  if (id === 'iz2' && cur < SPLIT) cur = SPLIT;
  if (id === 'iz' && cur >= SPLIT) cur = SPLIT - 1;
  if (cur !== lastSt) {
    stEls.forEach((el, i) => {
      el.classList.toggle('is-on', i === cur);
      el.classList.toggle('is-past', i < cur);
    });
    lastSt = cur;
    const txt = `${pad2(Math.max(0, cur + 1))}/${pad2(NS)}`;
    odoEls.forEach((el) => (el.textContent = txt));
  }
}

let current = null;
let last = performance.now();
let rmDirty = true;
function frame() {
  const now = performance.now();
  const dt = reducedMotion ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!stage || document.hidden) return;
  const a = active();
  const id = a?.id ?? null;
  if (id !== current) {
    current = id;
    document.body.dataset.scene = id ?? 'none';
    canvas.classList.toggle('is-off', !id);
    rmDirty = true;
  }
  if (!id) return; // ekran dışında: render yok
  let p = a.p;
  if (reducedMotion) {
    p = { hero: 0, dis: 0.5, iz: 0.4, iz2: 0.5, otel: 0.9, final: 0.4 }[id];
    if (!rmDirty) return;
    rmDirty = false;
  }
  stage.render(pose(id, p), dt);
  placeStations(id);
}

// --- Açılış (≤ 1,6 sn; kaydırma kilidi ~1,1 sn'de açılır; dokunma/kaydırma/tuş anında geçer) -----

const intro = $('[data-intro]');
let lenis = null;

function unlockScroll() {
  document.body.classList.remove('is-loading');
  lenis?.start();
}

function runIntro() {
  const introName = $('[data-intro-name]');
  const introPrint = $('[data-intro-print]');
  const introMm = $('[data-intro-mm]');
  introName.textContent = upper(d.isletme.ad);
  const nameSplit = SplitText.create(introName, { type: 'words,chars', wordsClass: 'w', charsClass: 'c' });
  const mm = { v: 0 };
  return new Promise((resolve) => {
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      intro.style.pointerEvents = 'none';
      unlockScroll();
    };
    const tl = gsap.timeline({
      onComplete: () => {
        unlock();
        intro.remove();
        window.__introDone = Math.round(performance.now());
        resolve();
      },
    });
    tl.fromTo(nameSplit.chars, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.02 }, 0)
      .fromTo(introPrint, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.1)
      .to(mm, { v: d.dis.yeni, duration: 0.8, ease: 'power2.inOut', onUpdate: () => (introMm.textContent = mmf(mm.v)) }, 0.1)
      .to(['.intro__meta', '.intro__kicker', '.intro__skip', introName], { opacity: 0, duration: 0.2 }, 0.9)
      .to(intro, { yPercent: -100, duration: 0.55, ease: 'power4.inOut' }, 1.0)
      .add(unlock, 1.05)
      .add(heroIn, 1.05);
    const skip = () => tl.progress() < 0.99 && tl.progress(1);
    intro.addEventListener('pointerdown', skip, { once: true });
    addEventListener('keydown', skip, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchstart', skip, { once: true, passive: true });
  });
}

let heroInDone = false;
function heroIn() {
  if (heroInDone) return;
  heroInDone = true;
  gsap.timeline()
    .fromTo('.hero__title .line__in', { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 })
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__spec', '[data-hint]'], { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06,
    }, 0.2);
}

// --- Kaydırma kurguları ---------------------------------------------------------

const sc = (sel, extraOpts = {}) => ({ trigger: sel, start: 'top top', end: 'bottom bottom', scrub: 0.5, ...extraOpts });

function setupScroll() {
  // Hikâye modu: pinli sahneler ekranı kaplarken alt çubuk (ve telefonda üst başlık) saklanır.
  $$('.ch--dis, .ch--iz, .ch--iz2, .ch--otel, .ch--final').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onToggle: (st) => setStoryMode(st.isActive ? true : null),
    });
  });

  // Kahraman: yazı çıkar (autoAlpha: görünmez butonlar dokunmayı yutmasın)
  gsap.timeline({ scrollTrigger: sc('.ch--hero') })
    .to('[data-hint]', { autoAlpha: 0, duration: 0.05 }, 0)
    .fromTo('.hero__title .line__in', { yPercent: 0 }, { yPercent: -110, duration: 0.25, stagger: 0.03, ease: 'power2.in', immediateRender: false }, 0.12)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta', '.hero__spec'], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: 0.18, stagger: 0.02, immediateRender: false }, 0.12)
    // kabın kendisi de gizlenir: boş kalan kart katmanı sayılmasın, dokunmayı yutmasın
    .fromTo('.hero', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.02, immediateRender: false }, 0.36)
    .set({}, {}, 1);

  // Diş
  const mmEl = $('[data-mm]');
  const fill = $('[data-gauge-fill]');
  const stageTxts = $$('[data-stage-txt]');
  gsap.set(['.dis', '.gauge'], { autoAlpha: 0 });
  gsap.timeline({ scrollTrigger: sc('.ch--dis') })
    .fromTo(['.dis', '.gauge'], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.02 }, 0.04)
    .fromTo('.dis__note', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.72)
    .to(['.dis', '.gauge'], { autoAlpha: 0, y: -20, duration: 0.05 }, 0.94);
  const Y = d.dis.yeni, S = d.dis.sinir;
  let lastStage = -1;
  ScrollTrigger.create({
    ...sc('.ch--dis'), scrub: false,
    onUpdate(self) {
      const p = self.progress;
      const mm = L(Y, S, disWear(p));
      mmEl.textContent = mmf(mm);
      fill.style.transform = `scaleX(${(mm / Y).toFixed(3)})`;
      document.body.classList.toggle('is-low', mm < d.dis.kis + 0.05 && p < 0.86);
      document.body.classList.toggle('is-limit', mm < S + 0.08 && p < 0.86);
      let st = 0;
      if (mm <= d.dis.kis + 0.05) st = 1;
      if (mm <= S + 0.08) st = 2;
      if (p > 0.86) st = 3;
      if (st !== lastStage) {
        lastStage = st;
        stageTxts.forEach((el, i) => el.classList.toggle('is-on', i === st));
      }
    },
  });

  // İz başlıkları: başlık üstte kalır, kart alta iner (telefonda tek üst + tek alt öğe)
  for (const cls of ['.ch--iz', '.ch--iz2']) {
    if (!$(cls)) continue;
    const head = `${cls} .iz__head`, odo = `${cls} .iz__odo`, box = `${cls} .stations`;
    gsap.set([head, odo, box], { autoAlpha: 0 });
    gsap.timeline({ scrollTrigger: sc(cls) })
      .fromTo(head, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.02)
      .fromTo([box, odo], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, 0.05)
      .to([head, box, odo], { autoAlpha: 0, duration: 0.04 }, 0.95);
  }

  // Otel
  const countEl = $('[data-otel-count]');
  const otelN = { v: 0 };
  gsap.set('.otel', { autoAlpha: 0 });
  gsap.timeline({ scrollTrigger: sc('.ch--otel') })
    .fromTo('.otel', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.05)
    .fromTo(otelN, { v: 0 }, {
      v: otelStat.deger, duration: 0.5, ease: 'power1.out',
      onUpdate() { countEl.textContent = nf(this.progress() > 0.995 ? otelStat.deger : otelN.v); },
    }, 0.06)
    .to('.otel', { autoAlpha: 0, y: -30, duration: 0.06 }, 0.94);

  // Mevsim kartları
  gsap.fromTo('.season__rule', { '--k': 0 }, {
    '--k': 1, ease: 'none', scrollTrigger: { trigger: '.season', start: 'top 85%', end: 'top 20%', scrub: 0.5 },
  });
  $$('.scard').forEach((c, i) => {
    gsap.fromTo(c, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', delay: i * 0.08, scrollTrigger: { trigger: c, start: 'top 92%', once: true } });
    gsap.fromTo(c.querySelector('img'), { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Süreç saati: kaydırdıkça dakika dolar
  const arc = $('[data-clock-arc]');
  const clockNum = $('[data-clock-num]');
  const C = 2 * Math.PI * 86;
  arc.style.strokeDasharray = `${C}`;
  arc.style.strokeDashoffset = `${C}`;
  const fsteps = $$('[data-fstep]');
  const capEl = $('[data-clock-cap]');
  capEl.textContent = d.surec[0].baslik;
  ScrollTrigger.create({
    trigger: '.flow__body', start: 'top 75%', end: 'bottom 60%',
    onUpdate(self) {
      const m = total * self.progress;
      arc.style.strokeDashoffset = `${(C * (1 - m / total)).toFixed(1)}`;
      clockNum.textContent = Math.round(m);
      let curStep = 0;
      fsteps.forEach((el, i) => {
        const on = m >= Number(el.dataset.at) - mins[i] + 0.01;
        el.classList.toggle('is-on', on);
        if (on) curStep = i;
      });
      const cap = d.surec[curStep].baslik;
      if (capEl.textContent !== cap) capEl.textContent = cap;
    },
  });
  // telefonda adımlar tek tek görünür olunca yanar (saat üstte sabit değil)
  fsteps.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 80%', onEnter: () => el.classList.add('is-seen') }));

  // Rakamlar
  $$('[data-num]').forEach((el) => {
    const v = Number(el.dataset.num);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter() {
        const o = { v: 0 };
        gsap.to(o, { v, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = nf(o.v)) });
      },
    });
  });
  gsap.fromTo('.num', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.nums', start: 'top 85%', once: true } });

  // Final: kelime kelime (harf bölmek Dela Gothic'te harf aralığını bozuyor)
  const finalTitle = $('[data-final-title]');
  finalTitle.setAttribute('aria-label', d.finalBaslik);
  finalTitle.innerHTML = d.finalBaslik.split(/\s+/).map((w) => `<span class="fw" aria-hidden="true"><span class="fwi">${esc(w)}</span></span>`).join(' ');
  gsap.set(['.final__txt', '.final__cta'], { autoAlpha: 0 });
  gsap.timeline({ scrollTrigger: sc('.ch--final') })
    .fromTo('.final__title .fwi', { autoAlpha: 0, yPercent: 105 }, { autoAlpha: 1, yPercent: 0, duration: 0.08, stagger: 0.02, ease: 'power3.out' }, 0.01)
    .fromTo(['.final__txt', '.final__cta'], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.06, stagger: 0.03 }, 0.06)
    .set({}, {}, 1);

  // İz perdeleri. Perde ekranı kaplarken alt çubuk aşağı kayar (telefon sözleşmesi: tek alt öğe).
  let wipeOn = false;
  const wipeStory = (on) => {
    if (on === wipeOn) return;
    wipeOn = on;
    setStoryMode(on ? true : null);
  };
  const wipe = $('[data-wipe]');
  const band = $('[data-wipe-band]');
  const word = $('[data-wipe-word]');
  $$('[data-wipe-in]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top bottom', end: 'top top',
      onUpdate(self) {
        const q = self.progress;
        const on = q > 0.001 && q < 0.999;
        wipe.style.visibility = on ? 'visible' : 'hidden';
        wipeStory(on);
        if (!on) return;
        if (word.dataset.for !== sec.dataset.ch) {
          word.dataset.for = sec.dataset.ch;
          word.textContent = sec.dataset.wipeIn;
        }
        band.style.transform = `translate3d(${(L(1.02, -1.62, q) * innerWidth).toFixed(1)}px,0,0)`;
        word.style.transform = `translate3d(${L(-18, 18, q).toFixed(1)}vw,0,0)`;
      },
      onLeave: () => { wipe.style.visibility = 'hidden'; wipeStory(false); },
      onLeaveBack: () => { wipe.style.visibility = 'hidden'; wipeStory(false); },
    });
  });

  // Footer girerken sabit sahne sayfayla birlikte yukarı kayar (final boş kalmasın)
  ScrollTrigger.create({
    trigger: '.foot', start: 'top bottom', end: 'bottom bottom',
    onUpdate(self) {
      footShift = $('.foot').offsetHeight * self.progress;
      canvas.style.transform = footShift > 0 ? `translate3d(0,${(-footShift).toFixed(1)}px,0)` : '';
    },
    onLeaveBack() { footShift = 0; canvas.style.transform = ''; },
  });

  mapWhenNear();

  // Üst bar: zemin değiştikçe
  ScrollTrigger.create({
    // end: 'max' sayfanın en altında isActive'i düşürüyordu (başlık çark üstünde saydam kalıyordu).
    trigger: '.ch--hero', start: 'bottom-=1 top',
    onEnter: () => $('[data-top]').classList.add('is-solid'),
    onLeaveBack: () => $('[data-top]').classList.remove('is-solid'),
  });
  ScrollTrigger.create({
    trigger: '.flow', start: 'top 40px', end: 'bottom 40px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-dark', self.isActive),
  });
}

function mapWhenNear() {
  ScrollTrigger.create({
    trigger: '.visit', start: 'top 150%', once: true,
    onEnter() {
      $('[data-map]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    },
  });
}

function marquee() {
  const inner = $('.marquee__inner');
  const box = $('.brands');
  let x = 0, on = false;
  new IntersectionObserver(([e]) => (on = e.isIntersecting)).observe(box);
  gsap.ticker.add(() => {
    if (!on) return;
    const v = lenis ? lenis.velocity : 0;
    const w = inner.scrollWidth / 2;
    if (!w) return;
    x -= 0.7 + Math.min(10, Math.abs(v) * 0.3);
    if (x < -w) x += w;
    inner.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  });
}

function magnets() {
  if (!finePointer) return;
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.25);
      y((e.clientY - (r.top + r.height / 2)) * 0.25);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

let rsT = 0;
addEventListener('resize', () => {
  clearTimeout(rsT);
  rsT = setTimeout(setOtelTxt, 200);
});

// --- Başlat ---------------------------------------------------------------------

(async () => {
  const fontsP = Promise.race([
    Promise.all([document.fonts.load('40px "Dela Gothic One"'), document.fonts.load('700 16px "Funnel Sans"')]),
    new Promise((r) => setTimeout(r, 800)),
  ]);
  if (reducedMotion || new URLSearchParams(location.search).has('vitrin')) {
    // Vitrin ve azaltılmış hareket: perde yok, içerik hemen
    intro.remove();
    document.body.classList.remove('is-loading');
  }
  if (reducedMotion) {
    document.documentElement.classList.add('rm');
    await fontsP;
    await makeStage();
    const onScroll = () => requestAnimationFrame(frame);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => {
      rmDirty = true;
      onScroll();
    });
    $$('[data-stage-txt]').forEach((el, i) => el.classList.toggle('is-on', i === 0));
    $$('[data-fstep]').forEach((el) => el.classList.add('is-on'));
    $$('[data-num]').forEach((el) => (el.textContent = nf(Number(el.dataset.num))));
    $('[data-otel-count]').textContent = nf(otelStat.deger);
    $('[data-clock-num]').textContent = total;
    mapWhenNear();
    wheelReady?.then(() => {
      rmDirty = true;
      frame();
    });
    frame();
    return;
  }
  lenis = initSmoothScroll();
  scrollTo(0, 0);
  gsap.ticker.add(frame);
  marquee();
  magnets();
  // Sahne (yanak yazısı için font beklenir) perdeyle paralel kurulur; perde sahneyi beklemez.
  const stageP = fontsP.then(makeStage);
  if (document.body.contains(intro)) {
    lenis?.stop();
    await Promise.race([fontsP, new Promise((r) => setTimeout(r, 350))]);
    await runIntro();
  } else {
    heroIn();
  }
  setupScroll();
  ScrollTrigger.refresh();
  await stageP;
  ScrollTrigger.refresh();
})();
