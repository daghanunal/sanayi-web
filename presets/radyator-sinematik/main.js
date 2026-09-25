import taban from '../../data/sektor-radyator.json';
import ek from '../../data/radyator-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...taban, ...ek, preset: 'radyator-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const up = (s) => s.toLocaleUpperCase('tr');
const low = (s) => s.toLocaleLowerCase('tr');

// "1990'dan", "2004'ten"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-wa-agir]').href = waHref(d, `Merhaba ${d.isletme.ad}, ağır vasıta radyatörü için bilgi almak istiyorum. Araç: `);
$('[data-wa-yol]').href = waHref(d, `Merhaba ${d.isletme.ad}, aracım hararet yaptı. Araç ve belirti: `);
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = up(d.isletme.ad).split(/\s+/).map((w) => `<span class="hw">${esc(w)}</span>`).join(' ');
$('[data-intro-name]').textContent = up(d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Atölye açık' : 'Atölye kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film durakları
const F = d.film;
$('[data-rail]').innerHTML = F.map((a, i) => `<li data-rail-i><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = F.map((a, i) => `
  <article class="card" data-card="${esc(a.id)}">
    <p class="card__stop"><b>${String(i + 1).padStart(2, '0')}</b> ${esc(a.durak)}</p>
    <h2 class="card__title">${esc(a.baslik)}</h2>
    <p class="card__text">${esc(a.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${low(a.hizmet)} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.hizmet)} için sorun</span></a>
  </article>`).join('');

// Hakkımızda + rakamlar
$('[data-about-title]').textContent = `${yil} yıldır yalnızca radyatör.`;
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__row">
    <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

// Belirti seçici
const symList = $('[data-sym-list]');
symList.innerHTML = d.belirtiler.map((b, i) => `
  <button type="button" role="tab" class="sym__btn" data-sym="${i}" aria-selected="${i === 0}"><span class="sym__n">${String(i + 1).padStart(2, '0')}</span><span>${esc(b.soru)}</span></button>`).join('');
const symHeat = [0.82, 0.6, 0.35, 0.95, 0.5];
function pickSym(i, animate = true) {
  const b = d.belirtiler[i];
  $$('[data-sym]').forEach((btn) => btn.setAttribute('aria-selected', String(Number(btn.dataset.sym) === i)));
  const set = () => {
    $('[data-sym-cause]').textContent = b.sebep;
    $('[data-sym-do]').textContent = b.yapariz;
    $('[data-sym-wa]').href = waHref(d, `Merhaba ${d.isletme.ad}, aracımda şu belirti var: ${low(b.soru)}. Araç: `);
  };
  const bar = $('[data-sym-bar]');
  if (!animate || reducedMotion) {
    set();
    bar.style.transform = `scaleY(${symHeat[i % symHeat.length]})`;
    return;
  }
  gsap.timeline()
    .to(['[data-sym-cause]', '[data-sym-do]'], { opacity: 0, y: -8, duration: 0.18, ease: 'power2.in' })
    .call(set)
    .to(['[data-sym-cause]', '[data-sym-do]'], { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' });
  gsap.to(bar, { scaleY: symHeat[i % symHeat.length], duration: 0.9, ease: 'elastic.out(1, .5)' });
}
symList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sym]');
  if (btn) pickSym(Number(btn.dataset.sym));
});
pickSym(0, false);

// Ağır vasıta metni
$('[data-heavy-text]').textContent = d.hizmetler.find((s) => /ağır/i.test(s.baslik))?.aciklama ?? '';

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Number(y.puan))}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(up(m))}</span><i></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-tips]').innerHTML = d.yoldaIpucu.map((t, i) => `<li><b>${i + 1}</b><div><h3>${esc(t.baslik)}</h3><p>${esc(t.metin)}</p></div></li>`).join('');
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Başlığı en uzun kelime sığacak şekilde büyüt
function fitTitle() {
  const box = heroTitle.parentElement.clientWidth;
  const max = mobile() ? 72 : 140;
  heroTitle.style.fontSize = `${max}px`;
  const widest = Math.max(...$$('.hw', heroTitle).map((w) => w.scrollWidth));
  const size = Math.min(max, (max * box) / Math.max(1, widest)) * 0.94;
  heroTitle.style.fontSize = `${Math.floor(size)}px`;
}
fitTitle();
document.fonts?.load("400 100px 'Gasoek One'").then(fitTitle).catch(() => {});
document.fonts?.ready.then(fitTitle);

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
document.fonts?.load("40px 'Gasoek One'").then(() => S.drawName(d.isletme.ad)).catch(() => {});
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const HANG = 1.25, SUB = -1.0;

// Kamera pozları. Mobilde dikey ekrana göre daha geriden ve dar açıdan.
const POSES = () => {
  const m = mobile();
  return {
    hero: m
      ? { pos: V(3.4, 0.9, 6.6), look: V(0.2, 1.05, 0), fov: 46 }
      : { pos: V(3.0, 1.55, 4.9), look: V(-0.75, 1.15, 0), fov: 40 },
    hot: m
      ? { pos: V(2.6, 2.55, 2.4), look: V(1.05, 1.7, 0), fov: 54 }
      : { pos: V(2.5, 2.35, 1.9), look: V(0.7, 1.8, 0), fov: 42 },
    dip: m
      ? { pos: V(1.7, 0.9, 5.2), look: V(0, -0.1, 0), fov: 52 }
      : { pos: V(1.9, 0.75, 4.0), look: V(-0.2, -0.1, 0), fov: 44 },
    under: m
      ? { pos: V(-0.45, -1.95, 2.5), look: V(-1.0, -2.1, 0), fov: 62 }
      : { pos: V(0.4, -1.35, 2.6), look: V(-0.75, -1.05, 0), fov: 50 },
    repair: m
      ? { pos: V(-0.35, 0.95, 1.25), look: V(-1.08, 0.6, 0.05), fov: 58 }
      : { pos: V(-0.3, 0.85, 1.05), look: V(-1.05, 0.62, 0.05), fov: 46 },
    petek: m
      ? { pos: V(0.55, 1.55, 1.25), look: V(0.25, 1.3, 0), fov: 50 }
      : { pos: V(0.6, 1.45, 1.05), look: V(0.15, 1.28, 0), fov: 44 },
    petek2: m
      ? { pos: V(-0.9, 1.3, 1.7), look: V(-0.35, 1.25, 0), fov: 54 }
      : { pos: V(-0.95, 1.25, 1.5), look: V(-0.1, 1.25, 0), fov: 46 },
    fan: m
      ? { pos: V(-2.2, 1.9, -3.9), look: V(0.1, 1.2, 0), fov: 52 }
      : { pos: V(-2.1, 1.75, -2.9), look: V(0.25, 1.2, 0), fov: 44 },
    agir: m
      ? { pos: V(5.6, 1.6, 9.8), look: V(0.2, 1.6, 0), fov: 50 }
      : { pos: V(4.6, 1.8, 6.6), look: V(-0.6, 1.8, 0), fov: 44 },
    over: m
      ? { pos: V(4.2, 5.2, 8.2), look: V(0, 0.6, 0), fov: 52 }
      : { pos: V(4.4, 4.2, 6.4), look: V(-0.2, 0.9, 0), fov: 44 },
  };
};
const KF = [
  [0.0, 'hero'], [0.06, 'hero'], [0.12, 'hot'], [0.215, 'hot'], [0.25, 'dip'], [0.305, 'under'], [0.395, 'under'],
  [0.435, 'repair'], [0.475, 'repair'], [0.5, 'dip'], [0.525, 'under'], [0.56, 'under'], [0.6, 'petek'], [0.7, 'petek2'],
  [0.745, 'fan'], [0.83, 'fan'], [0.88, 'agir'], [0.93, 'agir'], [0.975, 'over'], [1.0, 'over'],
];
const CARD_RANGES = [[0.085, 0.225], [0.25, 0.4], [0.41, 0.56], [0.585, 0.71], [0.725, 0.835], [0.85, 0.935]];
const FIX = { hararet: [0.2, 0.6], havuz: [0.4, 0.75], onarim: [0.72, 0.86], petek: [0.3, 0.62], fan: [0.35, 0.7], agir: [0.3, 0.6] };

function filmPose(p) {
  const P = POSES();
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(seg(p, a[0], b[0]));
  const A = P[a[1]], B = P[b[1]];
  return { pos: A.pos.clone().lerp(B.pos, t), look: A.look.clone().lerp(B.look, t), fov: L(A.fov, B.fov, t) };
}

function radY(p) {
  const dips = [[0.25, 0.305, 0.4, 0.44], [0.48, 0.515, 0.56, 0.6]];
  for (const [a, b, c, e] of dips) {
    if (p >= a && p < e) {
      if (p < b) return L(HANG, SUB, smooth(seg(p, a, b)));
      if (p < c) return SUB;
      return L(SUB, HANG, smooth(seg(p, c, e)));
    }
  }
  const big = smooth(seg(p, 0.845, 0.9)) * (1 - smooth(seg(p, 0.975, 1.2)));
  return L(HANG, 1.95, big);
}

function filmState(p, time, vel) {
  const pose = filmPose(p);
  const sway = (1 - seg(p, 0.06, 0.12)) * 0.12 + seg(p, 0.93, 0.97) * 0.2;
  pose.pos.x += Math.sin(time * 0.35) * sway;
  pose.pos.y += Math.sin(time * 0.5) * sway * 0.4;
  if (p > 0.95) pose.pos.applyAxisAngle(V(0, 1, 0), (p - 0.95) * 3 + Math.sin(time * 0.1) * 0.05);
  const inPetek = seg(p, 0.565, 0.585) * (1 - seg(p, 0.625, 0.67));
  return {
    ...pose,
    radY: radY(p),
    yaw: L(-0.32 + Math.sin(time * 0.4) * 0.04, 0, smooth(seg(p, 0.06, 0.13))) + Math.sin(time * 0.6) * 0.012 * (p < 0.25 ? 1 : 0),
    tilt: 0,
    scale: L(1, 1.75, smooth(seg(p, 0.845, 0.9))),
    hot: 0.25 * (1 - seg(p, 0.06, 0.1)) + smooth(seg(p, 0.1, 0.2)) * (1 - seg(p, 0.23, 0.26)) + 0.5 * seg(p, 0.72, 0.76) * (1 - seg(p, 0.78, 0.82)),
    steam: seg(p, 0.13, 0.17) * (1 - seg(p, 0.22, 0.25)),
    leak: seg(p, 0.305, 0.32) * (1 - seg(p, 0.395, 0.41)),
    spark: seg(p, 0.445, 0.452) * (1 - seg(p, 0.475, 0.482)),
    clean: 1 - inPetek,
    flow: L(11 / 34, 1, smooth(seg(p, 0.625, 0.67))),
    flowAmt: seg(p, 0.585, 0.605),
    fan: smooth(seg(p, 0.72, 0.76)) * (1 - smooth(seg(p, 0.84, 0.865))),
    fanSpin: smooth(seg(p, 0.765, 0.8)) * (1 - seg(p, 0.84, 0.86)) + vel * 0.2,
    lamp: 1,
  };
}

function finaleState(q, time) {
  const m = mobile();
  const a = time * 0.05 + q * 0.6;
  const r = m ? 1.4 : 2.2;
  return {
    pos: V(Math.sin(a) * r, m ? 6.4 : 5.4, Math.cos(a) * r + 1.2),
    look: V(0, -0.8, 0), fov: m ? 56 : 46,
    radY: SUB, yaw: 0.3, tilt: 0, scale: 1,
    hot: 0.15, steam: 0, leak: 0, spark: 0, clean: 1, flow: 1, flowAmt: 1, fan: 0, fanSpin: 0, lamp: 1,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const hud = $('[data-hud]');
const hudLbl = $('[data-hud-lbl]'), hudVal = $('[data-hud-val]'), hudUnit = $('[data-hud-unit]'), hudVerdict = $('[data-hud-verdict]');
const hudFill = $('[data-hud-fill]'), hudNeedle = $('[data-hud-needle]');
const leakEl = $('[data-leak]'), leakTxt = $('span', leakEl);
const overview = $('[data-overview]');
const hint = $('[data-hint]');
const waterline = $('[data-waterline]');
hudFill.setAttribute('pathLength', '100');

let lastHud = -1, lastVerdict = '';
function filmUI(p) {
  const heroOut = seg(p, 0.045, 0.085);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0.0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const vin = seg(p, a, a + 0.02), vout = seg(p, b - 0.018, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(0, ${(1 - vin) * 36 - vout * 24}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.075, 0.095) * (1 - seg(p, 0.935, 0.95));
  rail.style.opacity = railOn;
  rail.style.visibility = railOn > 0.01 ? 'visible' : 'hidden';
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p > CARD_RANGES[i][1]);
  });

  // Gösterge: durağın içinde önceki değerden sonrakine
  const on = active >= 0 ? seg(p, CARD_RANGES[active][0], CARD_RANGES[active][0] + 0.02) * (1 - seg(p, CARD_RANGES[active][1] - 0.015, CARD_RANGES[active][1])) : 0;
  hud.style.opacity = on;
  hud.style.visibility = on > 0.01 ? 'visible' : 'hidden';
  if (active >= 0) {
    const f = F[active], o = f.hud;
    const [a, b] = CARD_RANGES[active];
    const [fa, fb] = FIX[f.id] ?? [0.35, 0.7];
    const fix = smooth(seg(p, L(a, b, fa), L(a, b, fb)));
    const v = L(o.once, o.sonra, fix);
    const digits = o.max <= 5 ? 1 : 0;
    if (lastHud !== active) {
      hudLbl.textContent = o.etiket;
      hudUnit.textContent = o.birim;
      lastHud = active;
    }
    hudVal.textContent = nf(v, digits);
    const frac = clamp((v - o.min) / (o.max - o.min));
    hudFill.style.strokeDasharray = `${frac * 100} 100`;
    hudNeedle.setAttribute('transform', `rotate(${-120 + frac * 240})`);
    const txt = fix < 0.5 ? o.oncesi : o.sonrasi;
    if (txt !== lastVerdict) {
      hudVerdict.textContent = txt;
      lastVerdict = txt;
    }
    const good = fix >= 0.5 ? o.iyi : false;
    hud.classList.toggle('is-ok', good);
    hud.classList.toggle('is-bad', !o.iyi && fix >= 0.5);
  }

  const ov = seg(p, 0.945, 0.97);
  overview.style.opacity = ov;
  overview.style.visibility = ov > 0.01 ? 'visible' : 'hidden';
  overview.style.transform = `translate3d(0, ${(1 - ov) * 30}px, 0)`;
}

// Kaçak işareti ve su çizgisi: sahne karesinden sonra
function overlayUI(p) {
  const leakOn = seg(p, 0.315, 0.33) * (1 - seg(p, 0.39, 0.4));
  const solder = seg(p, 0.442, 0.45) * (1 - seg(p, 0.476, 0.484));
  const o = Math.max(leakOn, solder);
  leakEl.style.opacity = o;
  leakEl.style.visibility = o > 0.01 ? 'visible' : 'hidden';
  if (o > 0.01) {
    const s = S.screenOf('leak');
    leakEl.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    const t = solder > leakOn ? 'Lehimleniyor' : 'Kaçak burada';
    if (leakTxt.textContent !== t) leakTxt.textContent = t;
    leakEl.classList.toggle('is-solder', solder > leakOn);
  }
}

function waterUI(camY) {
  const w = clamp(1 - Math.abs(camY) / 0.22);
  waterline.style.opacity = w;
  waterline.style.visibility = w > 0.01 ? 'visible' : 'hidden';
  if (w > 0.01) waterline.style.transform = `translate3d(0, ${(camY / 0.22) * 50}%, 0)`;
}

// --- Başlangıç -------------------------------------------------------------

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
let filmActive = true, finaleActive = false;
let vel = 0;
let canvasFinale = 0;
let filmST = null, finaleST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));

  filmST = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: film, start: 'bottom bottom', end: 'bottom 40%',
    onUpdate: (self) => (canvas.style.opacity = 1 - self.progress),
  });
  finaleST = ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'top 30%',
    onUpdate: (self) => (canvasFinale = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 80px', end: 'max',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  // Başlıklar sudan yükselir gibi
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'lines,words', linesClass: 'rl', wordsClass: 'rw' });
    gsap.fromTo(s.words, { yPercent: 110, rotate: 4 }, {
      yPercent: 0, rotate: 0, duration: 1, stagger: 0.05, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.18 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.18, yPercent: -5 }, {
    scale: 1, yPercent: 5, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.8, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // Hizmet boruları: ortadan geçerken antifriz dolar
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--fill': 0 }, {
      '--fill': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 88%', end: 'top 50%', scrub: true },
    });
  });
  gsap.fromTo('.heavy__img img', { scale: 1.2 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-heavy]', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.heavy__list li', { x: -30, opacity: 0 }, {
    x: 0, opacity: 1, stagger: 0.08, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '.heavy__list', start: 'top 85%', once: true },
  });
  // Süreç: termometre hararetten normale iner
  const thermo = $('[data-thermo]'), thermoVal = $('[data-thermo-val]');
  const th = { v: 0 };
  gsap.to(th, {
    v: 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 60%', scrub: true },
    onUpdate: () => {
      const t = Math.round(L(118, 90, th.v));
      thermo.style.transform = `scaleY(${L(0.95, 0.52, th.v)})`;
      thermo.parentElement.style.setProperty('--cool', th.v);
      thermoVal.textContent = `${t}°`;
    },
  });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 65%', onToggle: (self) => s.classList.toggle('is-lit', self.progress > 0 || self.isActive) });
  });
  // Yorumlar yatay kayar
  const track = $('[data-rev-track]');
  gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - track.parentElement.clientWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.reviews', start: 'top 70%', end: 'bottom 20%', scrub: true, invalidateOnRefresh: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  gsap.fromTo('.tips li', { y: 30, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.tips', start: 'top 85%', once: true },
  });
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.fromTo(fsplit.chars, { yPercent: 120, opacity: 0 }, {
    yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.02, ease: 'back.out(2)',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 45%', once: true },
  });
}

// Markalar: kaydırma hızına göre hızlanır
const mq = $('.marquee__inner');
let mqX = 0;
let nextRipple = 0;

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  vel *= 0.92;

  if (filmST) {
    filmActive = filmST.progress < 1;
    finaleActive = (finaleST.progress > 0 && finaleST.progress < 1) || finaleST.isActive;
  }
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  if (filmActive || filmP < 0.999) filmUI(filmP);

  const showFilm = filmActive && canvas.style.opacity !== '0';
  const showFinale = finaleActive || canvasFinale > 0.001;
  if (showFinale && !filmActive) {
    canvas.style.opacity = canvasFinale;
    if (time > nextRipple) {
      S.ripple((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 0.5);
      nextRipple = time + 1.6 + Math.random() * 1.4;
    }
    S.update(finaleState(finaleQ, time), now);
    waterUI(9);
  } else if (showFilm) {
    const st = filmState(filmP, time, vel);
    S.update(st, now);
    overlayUI(filmP);
    waterUI(st.pos.y);
  }

  const w = mq.scrollWidth / 2;
  mqX -= (45 + vel * 900) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0)`;

  requestAnimationFrame(tick);
}

addEventListener('resize', () => {
  S.resize();
  fitTitle();
});

// Masaüstü: imleç ve mıknatıslı butonlar
if (finePointer && !reducedMotion) {
  const cur = $('[data-cursor]');
  const qx = gsap.quickTo(cur, 'x', { duration: 0.25, ease: 'power3' });
  const qy = gsap.quickTo(cur, 'y', { duration: 0.25, ease: 'power3' });
  addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); });
  document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hover', !!e.target.closest('a, button')));
  document.body.classList.add('has-cursor');
  $$('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.28);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

// --- Açılış: ibre kırmızıya çıkar, pembe damla düşer, su halkası sayfayı açar ---

function heroIn() {
  const split = new SplitText('.hero__title .hw', { type: 'chars', charsClass: 'ch' });
  fitTitle();
  gsap.timeline()
    .fromTo(split.chars, { yPercent: -120, opacity: 0, scaleY: 1.4 }, { yPercent: 0, opacity: 1, scaleY: 1, duration: 1.1, stagger: 0.035, ease: 'elastic.out(1, .55)' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.35);
}

function runIntro() {
  const intro = $('[data-intro]');
  const needle = $('[data-intro-needle]');
  const temp = $('[data-intro-temp]');
  let done = false;
  const o = { v: 40 };
  const tl = gsap.timeline();
  tl.fromTo('[data-intro-center]', { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }, 0);
  tl.to(o, {
    v: 124, duration: 1.1, ease: 'power2.in', onUpdate: () => {
      needle.setAttribute('transform', `rotate(${-120 + ((o.v - 40) / 90) * 240})`);
      temp.textContent = Math.round(o.v);
      intro.classList.toggle('is-hot', o.v > 108);
    },
  }, 0.1);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000, 0));
  }, [], 0.2);
  tl.add(finish, 1.3);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    intro.classList.add('is-hot');
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .fromTo('[data-intro-drop]', { y: '-60vh', scaleY: 1.6, opacity: 1 }, { y: 0, scaleY: 1, duration: 0.42, ease: 'power2.in' }, 0)
      .to('[data-intro-center]', { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' }, 0.1)
      .set('[data-intro-drop]', { opacity: 0 }, 0.42)
      .fromTo(intro, { '--r': '0%' }, { '--r': '150%', duration: 0.9, ease: 'power3.in' }, 0.42)
      .call(heroIn, [], 0.8);
    document.body.classList.remove('is-loading');
    S.ripple(0, 0, 1);
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

// --- Hareket azaltma -----------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  S.compile();
  const still = () => S.update({ ...filmState(0, 0, 0), flowAmt: 1 });
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  gsap.set('.svc__row', { '--fill': 1 });
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
