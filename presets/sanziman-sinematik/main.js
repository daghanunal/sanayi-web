import veri from '../../data/sektor-sanziman.json';
import ek from '../../data/sanziman-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger, setStoryMode, vitrinModu,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import * as THREE from 'three';
import { createScene, ISTASYON, ZEMIN } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...veri, ...ek, preset: 'sanziman-sinematik' });
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
const lo = (s) => s.toLocaleLowerCase('tr');

// "2007'den", "1995'ten", "2010'dan"
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
$('[data-brand]').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.innerHTML = up(d.isletme.ad).split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
$('[data-intro-name]').textContent = up(d.isletme.ad);

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Atölye açık' : 'Atölye kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Duraklar: her biri kendi kısa bölümü (kart durakta yapışır)
const B = d.bolumler;
$('[data-rail]').innerHTML = B.map((b) => `<li data-rail-i><b>${esc(b.vites)}</b><span>${esc(b.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = B.map((b, i) => `
  <div class="stop" data-stop="${esc(b.id)}">
    <article class="card" data-card="${esc(b.id)}">
      <p class="card__kicker"><span>${esc(b.vites)}</span>${esc(b.kicker)}</p>
      <h2 class="card__title">${esc(b.baslik)}</h2>
      <p class="card__text">${esc(b.metin)}</p>
      <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${b.wa} için bilgi almak istiyorum. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(b.durak)} için sorun</span></a>
      <p class="card__n" aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${String(B.length).padStart(2, '0')}</p>
    </article>
  </div>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${Number(s.deger)}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Belirti çözücü
const chipsEl = $('[data-chips]');
const panelEl = $('[data-panel]');
chipsEl.innerHTML = d.belirtiler.map((b, i) => `
  <button class="chip" role="tab" type="button" aria-selected="${i === 0}" data-chip="${i}"><span class="chip__n">${i + 1}</span>${esc(b.ad)}</button>`).join('');
function showSymptom(i, animate = true) {
  const b = d.belirtiler[i];
  $$('[data-chip]', chipsEl).forEach((c, j) => c.setAttribute('aria-selected', String(i === j)));
  panelEl.innerHTML = `
    <p class="symp__what">${esc(b.ne)}</p>
    <p class="symp__h">Genelde şuradan çıkar</p>
    <ol class="symp__causes">${b.sebep.map((s, j) => `<li><span>${j + 1}</span>${esc(s)}</li>`).join('')}</ol>
    <p class="symp__first"><b>İlk yaptığımız:</b> ${esc(b.ilk)}</p>
    <a class="btn btn--acc" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, aracımda şu şikâyet var: ${lo(b.ad)}. Araç: `))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu şikâyeti yazın</span></a>`;
  if (animate && !reducedMotion) {
    gsap.fromTo(panelEl.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out' });
  }
}
chipsEl.addEventListener('click', (e) => {
  const c = e.target.closest('[data-chip]');
  if (c) showSymptom(Number(c.dataset.chip));
});
showSymptom(0, false);

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc__row">
    <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time">${esc(s.sure)}</p>
  </li>`).join('');

// Süreç
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `Örnek puan · ${nf(d.puan.adet)} değerlendirme`;
$('[data-rev-track]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Number(y.puan))}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

// Markalar
const chunk = `<span class="marquee__chunk">${d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('')}</span>`;
$('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__sz = S;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KY = ZEMIN + 2.45; // kutunun görsel merkezi

// İstasyon başına kamera pozu. Masaüstünde parça sağda (metin solda), telefonda üst yarıda.
// dir: parçadan kameraya yön; sağa kaydırma için bakış noktası ekranın soluna alınır.
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
    hero: stationPose(X.kutu, m, { y: KY, dir: V(0.78, 0.32, 0.55), D: 14, Dm: 15.5, shift: 3.6, drop: 3.3, fov: 38 }),
    planet: stationPose(X.planet, m, { D: 10.5, Dm: 17, drop: 3.1 }),
    tork: stationPose(X.tork, m, { dir: V(0.5, 0.25, 0.85), D: 9.5, Dm: 14 }),
    meka: stationPose(X.meka, m, { dir: V(0.35, 0.8, 0.7), D: 7.6, Dm: 10.5, shift: 2.2, drop: 2.2, mfov: 54 }),
    dsg: stationPose(X.dsg, m, { dir: V(0.32, 0.3, 0.9), D: 10, Dm: 14.5 }),
    cvt: stationPose(X.cvt, m, { dir: V(0.75, 0.12, 0.66), D: 10.5, Dm: 15, drop: 3.4, fov: 40 }),
    yag: m
      ? { pos: V(X.cvt + 10, 4.2, 14), look: V(X.cvt - 16, -5.5, -3), fov: 54 }
      : { pos: V(X.cvt + 8, 3.2, 9), look: V(X.cvt - 42, -0.2, -7), fov: 42 },
    over: m
      ? { pos: V(X.cvt + 9, 8, 21), look: V(X.meka + 5, -5.5, -2), fov: 52 }
      : { pos: V(X.cvt + 10, 7, 16), look: V(X.meka + 6, -1.5, -4), fov: 40 },
  };
};
// Durakta kamera hafifçe süzülür: ikinci poz, birincinin kaydırılmışı
const drift = (p, dx, dy, dz) => ({ ...p, pos: p.pos.clone().add(V(dx, dy, dz)) });
const DRIFT = [[0.5, 0.2, -0.6], [-0.7, 0.15, 0.3], [0.3, 0.25, -0.4], [0.6, 0.1, -0.5], [-0.5, 0.2, 0.3], [0.8, 0.3, 0.4]];

// Durak aralıkları film ilerlemesi (0..1) cinsinden DOM'dan ölçülür: kart yapışınca başlar, bırakınca biter.
const filmEl = $('[data-film]');
const stopEls = $$('[data-stop]');
let R = B.map((_, i) => [0.09 + i * 0.135, 0.2 + i * 0.135]);
let OVER = 0.92, HERO_END = 0.06;
function measure() {
  const vh = innerHeight;
  const total = Math.max(1, filmEl.offsetHeight - vh);
  R = stopEls.map((el) => {
    const card = el.firstElementChild;
    const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const stick = el.offsetTop + padTop + card.offsetHeight + (mobile() ? 90 : 60) - vh;
    const release = el.offsetTop + el.offsetHeight - vh;
    return [clamp((stick - vh * 0.12) / total), clamp(release / total)];
  });
  OVER = clamp(($('[data-over-sec]').offsetTop - vh * 0.55) / total);
  HERO_END = clamp((stopEls[0].offsetTop - vh * 0.6) / total);
}
const at = (i, u) => L(R[i][0], R[i][1], u);
const sp = (p, i, u0, j, u1) => seg(p, at(i, u0), at(j, u1));
let KF = [];
function keyframes() {
  const K = [[0, 'hero'], [HERO_END * 0.55, 'hero']];
  B.forEach((b, i) => { K.push([R[i][0], b.id], [R[i][1], b.id, DRIFT[i]]); });
  K.push([Math.max(OVER, R[5][1] + 0.001), 'over'], [1, 'over', [0.8, 0.3, 0]]);
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
const activeStop = (p) => R.findIndex(([a, b]) => p >= a && p < b);
const amount = (p, i) => {
  const [a, b] = R[i];
  return seg(p, a - 0.01, a + 0.02) * (1 - seg(p, b - 0.015, b + 0.01));
};
const local = (p, i) => seg(p, R[i][0], R[i][1]);

// DSG: durakta vites 1→6 döner; tekler K1, çiftler K2
function dsgGear(u) {
  const x = clamp(u, 0, 0.999) * 6;
  const g = Math.floor(x), f = x - g;
  const cur = g % 2 === 0 ? 1 : 0; // g=0 → 1. vites (tek)
  const e = g === 0 ? 1 : L(1 - cur, cur, smooth(clamp(f / 0.22)));
  return { gear: g + 1, k1: e };
}

let introOpen = 0; // açılıştan sonra kutunun kapağı kendiliğinden aralanır
function filmState(p, time, vel) {
  const pose = filmPose(p);
  const heroW = 1 - seg(p, HERO_END * 0.4, HERO_END * 1.2);
  pose.pos.x += Math.sin(time * 0.3) * (0.12 + heroW * 0.25);
  pose.pos.y += Math.sin(time * 0.45) * 0.06;
  const k = { kutu: heroW, planet: amount(p, 0), tork: amount(p, 1), meka: amount(p, 2), dsg: amount(p, 3), cvt: amount(p, 4), yag: amount(p, 5) };
  const i = activeStop(p);
  const fix = i >= 0 ? smooth(seg(local(p, i), 0.3, 0.7)) : 1;
  const q = {
    open: Math.max(introOpen * 0.55, smooth(seg(p, 0, HERO_END * 0.9))),
    turn: -0.3 + Math.sin(time * 0.12) * 0.3 + p * 1.5,
    torkOpen: smooth(sp(p, 1, 0, 1, 0.35)) * (1 - 0.6 * smooth(sp(p, 1, 0.95, 2, 0.1))),
    torkLock: smooth(sp(p, 1, 0.5, 1, 0.8)),
    meka: smooth(sp(p, 2, 0.25, 2, 0.85)),
    dsgK1: dsgGear(local(p, 3)).k1,
    cvt: p < R[4][1] ? smooth(sp(p, 4, 0.05, 4, 0.85)) : L(1, 0.45, smooth(sp(p, 4, 1, 5, 0.4))),
  };
  const ov = sp(p, 5, -0.05, 5, 0.4);
  return {
    ...pose, k, q, fix,
    assemble: L(0.18, 1, smooth(seg(p, HERO_END * 0.6, at(0, 0.45)))),
    spin: 0.35 + vel * 2.5,
    oil: smooth(sp(p, 5, -0.1, 5, 0.3)),
    overview: p > at(5, 0),
    fogNear: mobile() ? L(13, 28, ov) : L(9, 22, ov),
    fogFar: mobile() ? L(34, 90, ov) : L(26, 75, ov),
    env: 0.5 + heroW * 0.3,
  };
}

function finaleState(qv, time) {
  const m = mobile();
  const a = 0.5 + qv * 0.5 + Math.sin(time * 0.15) * 0.05;
  const dir = V(Math.cos(a), 0.32, Math.sin(a));
  const pose = stationPose(ISTASYON.kutu, m, { y: KY, dir, D: 19.5, Dm: 20, shift: 6.6, drop: 5.4, fov: 38 });
  return {
    ...pose,
    k: { kutu: 1, planet: 0, tork: 0, meka: 0, dsg: 0, cvt: 0, yag: 0 },
    q: { open: 0.5, turn: 0.3 + qv * 0.6, torkOpen: 0.4, torkLock: 1, meka: 1, dsgK1: 1, cvt: 0.5 },
    fix: 1, assemble: 1, spin: 0.9, oil: 0, overview: false, env: 0.8,
    fogNear: m ? 13 : 9, fogFar: m ? 34 : 26,
  };
}

// --- Film UI -------------------------------------------------------------

const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const hud = $('[data-hud]');
const hDigit = $('[data-h-digit]'), hLbl = $('[data-h-lbl]'), hVerdict = $('[data-h-verdict]'), hSpec = $('[data-h-spec]');
const wave = $('[data-h-wave]');
const wctx = wave.getContext('2d');
const hint = $('[data-hint]');
const topEl = $('[data-top]');
// Görünmezken dokunmayı ve odağı almasın (autoAlpha mantığı)
const show = (el, v) => {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
};

// Sarsıntı ölçer: arızalıyken titrek, düzelince pürüzsüz dalga
function drawWave(fix, time) {
  const w = wave.width, h = wave.height;
  wctx.clearRect(0, 0, w, h);
  wctx.strokeStyle = 'rgba(159,198,201,.18)';
  wctx.lineWidth = 1;
  wctx.beginPath();
  wctx.moveTo(0, h / 2); wctx.lineTo(w, h / 2);
  wctx.stroke();
  const jerk = 1 - fix;
  wctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const u = x / w;
    let y = Math.sin(u * 9 + time * 3) * 7 * (0.4 + fix * 0.6);
    y += jerk * (Math.sin(u * 61 + time * 17) * 7 + Math.sin(u * 137 - time * 29) * 5);
    const spike = Math.exp(-((((u * 3 + time * 0.8) % 1) - 0.5) ** 2) * 400) * 20 * jerk;
    y -= spike;
    x ? wctx.lineTo(x, h / 2 + y) : wctx.moveTo(x, h / 2 + y);
  }
  wctx.strokeStyle = fix > 0.6 ? '#3be3c3' : '#ff4d63';
  wctx.lineWidth = 2;
  wctx.stroke();
}

let lastStop = -2, hudOn = -1;
function filmUI(p, time, inFilm = true) {
  show(hint, 1 - seg(p, 0.0, 0.02));
  const active = activeStop(p);
  const railOn = inFilm ? seg(p, R[0][0] - 0.02, R[0][0]) * (1 - seg(p, R[5][1] - 0.01, R[5][1] + 0.01)) : 0;
  show(rail, railOn);
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p >= R[i][1]);
  });
  const on = railOn > 0.5 ? 1 : 0;
  if (on !== hudOn) {
    hud.classList.toggle('is-live', !!on);
    topEl.classList.toggle('has-hud', !!on);
    hudOn = on;
  }
  const ai = active >= 0 ? active : R.findIndex(([, b]) => p < b);
  if (!on || ai < 0) return;
  const b = B[ai];
  const u = local(p, ai);
  const fix = smooth(seg(u, 0.3, 0.7));
  if (lastStop !== ai) { hLbl.textContent = b.olcer; lastStop = ai; }
  let digit = b.vites, spec = '';
  if (b.id === 'planet') spec = 'Güneş 18 · uydu 12 · çember 42 diş';
  else if (b.id === 'tork') spec = u > 0.55 ? 'Kilitleme kavraması: kapalı' : 'Kilitleme kavraması: kaçırıyor';
  else if (b.id === 'meka') spec = `Kayıtlı hata: ${fix > 0.95 ? 0 : fix > 0.5 ? 1 : 3}`;
  else if (b.id === 'dsg') {
    const g = dsgGear(u);
    digit = String(g.gear);
    spec = g.gear % 2 ? 'K1 tutuyor · 1-3-5' : 'K2 tutuyor · 2-4-6';
  } else if (b.id === 'cvt') spec = `Oran ${nf(S.ratio(smooth(sp(p, 4, 0.05, 4, 0.85))), 2)} : 1`;
  else spec = 'Seviye, şanzıman ısınınca ayarlanır';
  if (hDigit.textContent !== digit) hDigit.textContent = digit;
  if (hSpec.textContent !== spec) hSpec.textContent = spec;
  const ok = fix > 0.6;
  const verdict = ok ? 'Düzeldi' : 'Sarsıntılı';
  if (hVerdict.textContent !== verdict) hVerdict.textContent = verdict;
  hud.classList.toggle('is-ok', ok);
  drawWave(fix, time);
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'chars', charsClass: 'ch' });
const titleChars = split.chars;

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0;
let filmActive = true, finaleActive = false;
let vel = 0;
let canvasFinale = 0, canvasOut = 0;
let filmST = null, finaleST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  lenis?.on('scroll', (e) => (vel = Math.min(1, Math.abs(e.velocity) / 40)));
  ScrollTrigger.addEventListener('refresh', remeasure);
  remeasure();

  filmST = ScrollTrigger.create({
    trigger: filmEl, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: filmEl, start: 'bottom bottom', end: 'bottom 40%',
    onUpdate: (self) => (canvas.style.opacity = 1 - self.progress),
  });
  // Duraklar boyunca hikâye modu: alt çubuk iner, kart onun boşluğuna oturur (hero ve sonrası çubuklu)
  ScrollTrigger.create({
    trigger: '[data-cards]', start: 'top 70%', end: () => `bottom ${Math.round(innerHeight * 0.9)}px`,
    onToggle: (st) => setStoryMode(st.isActive ? true : null),
  });
  // Kart durağında belirir ve yapışır; bırakırken çekilir (görünmezken dokunmayı almaz)
  cards.forEach((card) => {
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
  gsap.fromTo('[data-overview] > *', { autoAlpha: 0, y: 30 }, {
    autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-over-sec]', start: 'top 55%', toggleActions: 'play none none reverse' },
  });
  finaleST = ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top 75%', end: 'top 15%',
    onUpdate: (self) => (canvasFinale = self.progress),
  });
  // Footer girerken sahne kararır; son yazı kutunun üstüne binmesin
  ScrollTrigger.create({
    trigger: '.foot', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (canvasOut = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 80px',
    endTrigger: '[data-finale]', end: 'top 80px',
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
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  gsap.fromTo('.chip', { y: 20, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '[data-chips]', start: 'top 85%', once: true },
  });
  // Hizmet satırları: ortadan geçerken nane şerit dolar
  $$('.svc__row').forEach((row) => {
    gsap.fromTo(row, { '--lit': 0 }, {
      '--lit': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 85%', end: 'top 50%', scrub: true },
    });
  });
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 62%', onToggle: (self) => s.classList.toggle('is-lit', self.progress > 0 || self.isActive) });
  });
  $$('.steps__photos img').forEach((img, i) => {
    gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, {
      clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut', delay: i * 0.12,
      scrollTrigger: { trigger: img, start: 'top 85%', once: true },
    });
  });
  // Yorumlar: masaüstünde kaydırmayla yana akar; telefonda parmakla kaydırılır
  const track = $('[data-rev-track]');
  ScrollTrigger.matchMedia({
    '(min-width: 760px)': () => {
      gsap.to(track, {
        x: () => -Math.max(0, track.scrollWidth - track.parentElement.clientWidth),
        ease: 'none',
        scrollTrigger: { trigger: '.reviews', start: 'top 70%', end: 'bottom 20%', scrub: true, invalidateOnRefresh: true },
      });
    },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  const fsplit = new SplitText('[data-final-title]', { type: 'words,chars', charsClass: 'ch' });
  gsap.fromTo(fsplit.chars, { yPercent: 120, autoAlpha: 0 }, {
    yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.03, ease: 'power4.out',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 40%', once: true },
  });
}

const mq = $('.marquee__inner');
let mqX = 0;
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

  if (filmST) {
    filmActive = filmST.progress < 1;
    finaleActive = (finaleST.progress > 0 && finaleST.progress < 1) || finaleST.isActive;
  }
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 7));
  if (filmActive || filmP < 0.999) filmUI(filmP, time, filmActive);
  else if (hudOn) filmUI(filmP, time, false);

  const showFilm = filmActive && canvas.style.opacity !== '0';
  const fin = canvasFinale * (1 - canvasOut);
  const showFinale = (finaleActive || canvasFinale > 0.001) && fin > 0.001;
  if (!filmActive && !showFinale) canvas.style.opacity = 0;
  if (showFinale && !filmActive) {
    canvas.style.opacity = fin;
    S.update(finaleState(finaleQ, time), now);
  } else if (showFilm) {
    S.update(filmState(filmP, time, vel), now);
  }

  const w = mq.scrollWidth / 2;
  mqX -= (40 + vel * 700) * dt;
  if (mqX < -w) mqX += w;
  mq.style.transform = `translate3d(${mqX}px,0,0)`;
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

// --- Açılış: vites kolu P → R → N → D, D büyüyüp ekranı açar ------------------

function heroIn() {
  gsap.timeline()
    .fromTo(titleChars, { yPercent: 115, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: 0.025, ease: 'power4.out' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__types', '.hero__cta'], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.35);
}

// Açılıştan sonra kutunun kapağı kendiliğinden aralanır, dişliler görünür
function openBox() {
  const io = { v: 0 };
  gsap.to(io, { v: 1, duration: 2.4, delay: 0.2, ease: 'power2.inOut', onUpdate: () => (introOpen = io.v) });
}

function runIntro() {
  const intro = $('[data-intro]');
  if (vitrinModu()) { // vitrinde perde yok
    intro.remove();
    document.body.classList.remove('is-loading');
    S.compile();
    lenis?.start();
    heroIn();
    openBox();
    return;
  }
  const slot = $('[data-slot]');
  const letters = $$('[data-l]');
  let done = false;
  const tl = gsap.timeline();
  const stepH = () => letters[1].offsetTop - letters[0].offsetTop;
  tl.fromTo('.intro__gate', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0);
  tl.fromTo('[data-intro-name]', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.1);
  letters[0].classList.add('is-on');
  for (let i = 1; i < 4; i++) {
    const at = 0.35 + i * 0.32;
    tl.to(slot, { y: () => stepH() * i, duration: 0.2, ease: 'back.out(2.2)' }, at);
    tl.call(() => { letters.forEach((l, j) => l.classList.toggle('is-on', j === i)); }, [], at + 0.08);
    tl.fromTo('.intro__gate', { x: 0 }, { x: 3, duration: 0.04, yoyo: true, repeat: 1, ease: 'none' }, at + 0.16);
  }
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000, 0));
  }, [], 0.3);
  tl.add(finish, 1.45);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    intro.style.pointerEvents = 'none'; // kalkarken ilk dokunuşu yutmasın
    letters.forEach((l, j) => l.classList.toggle('is-on', j === 3));
    gsap.set(slot, { y: stepH() * 3 });
    const D = letters[3];
    $('.intro__gate').classList.add('is-open');
    lenis?.start();
    gsap.timeline({ onComplete: () => intro.remove() })
      .to(['[data-intro-name]', '.intro__skip', ...letters.slice(0, 3), slot], { opacity: 0, duration: 0.2 }, 0)
      .to(D, { scale: 42, color: '#0a1a1f', duration: 0.7, ease: 'power3.in' }, 0.05)
      .to(intro, { backgroundColor: 'rgba(10,26,31,0)', duration: 0.4, ease: 'power1.out' }, 0.45)
      .to(D, { opacity: 0, duration: 0.2 }, 0.6)
      .call(heroIn, [], 0.45)
      .call(openBox, [], 0.5);
    document.body.classList.remove('is-loading');
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
  introOpen = 1;
  const still = () => S.update(filmState(0, 0, 0));
  still();
  S.ready.then(() => { still(); requestAnimationFrame(still); });
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  gsap.set('.svc__row', { '--lit': 1 });
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
