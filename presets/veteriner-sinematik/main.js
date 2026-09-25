import temel from '../../data/sektor-veteriner.json';
import ek from '../../data/veteriner-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createScene, W } from './scene.js';
import { buildPages, stampAtlas, pawSprite } from './pages.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, preset: 'veteriner-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const sm = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const bump = (p, a, b, e = 0.2) => { const w = (b - a) * e; return seg(p, a, a + w) * (1 - seg(p, b - w, b)); };
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;
const lower = (s) => s.toLocaleLowerCase('tr');
const IMG = (n) => asset(`/img/sektor-veteriner/${n}.jpg`);

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}
const waMsg = (m) => waHref(d, m ? m.replace(/^Merhaba,/, `Merhaba ${d.isletme.ad},`) : undefined);

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
const waGenel = waHref(d, `Merhaba ${d.isletme.ad}, randevu almak istiyorum.`);
$$('[data-wa]').forEach((a) => (a.href = waGenel));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Etimesgut · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
if (d.isletme.ad.length > 22) heroTitle.classList.add("is-long");
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-intro-name]').textContent = d.isletme.ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Klinik açık' : 'Klinik kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film kartları
const byId = Object.fromEntries(d.hizmetler.map((h) => [h.id, h]));
const FILM = d.film.map((f) => {
  const h = f.hizmet ? byId[f.hizmet] : null;
  return {
    ...f,
    baslik: f.baslik || h?.baslik || '',
    metin: f.metin || h?.aciklama || '',
    sure: h?.sure || '',
    wa: waMsg(f.mesaj || h?.mesaj || `Merhaba, ${lower(h?.baslik || f.durak)} için bilgi almak istiyorum.`),
    cta: f.id === 'acil' ? 'Hemen arayın' : f.id === 'hatirlatma' ? 'Listeye ekleyin' : f.id === 'karne' ? 'Karne açtırın' : 'WhatsApp\'tan sorun',
  };
});
$('[data-rail]').innerHTML = FILM.map((a) => `<li data-rail-i><b>${esc(a.no)}</b><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = FILM.map((a) => `
  <article class="card${a.id === 'acil' ? ' card--acil' : ''}" data-card="${esc(a.id)}">
    <p class="card__no"><b>${esc(a.no)}</b><span>${esc(a.durak)}</span>${a.sure ? `<em>${esc(a.sure)}</em>` : ''}</p>
    <h2 class="card__title">${esc(a.baslik)}</h2>
    <p class="card__text">${esc(a.metin)}</p>
    ${a.id === 'acil'
      ? `<a class="card__wa card__wa--tel" href="${esc(telHref(d))}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`
      : `<a class="card__wa" href="${esc(a.wa)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.cta)}</span></a>`}
  </article>`).join('');

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${s.deger}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler: karne sekmeleri
const TABC = ['mint', 'lilac', 'pink', 'butter'];
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <article class="svc__card svc__card--${TABC[i % 4]}${s.id === 'acil' ? ' is-acil' : ''}">
    <p class="svc__tab"><b>${String(i + 1).padStart(2, '0')}</b>${esc(s.baslik)}</p>
    <div class="svc__inner">
      ${s.gorsel ? `<figure class="svc__img"><img src="${esc(s.gorsel)}" alt="" loading="lazy" width="800" height="600" /></figure>` : ''}
      <div class="svc__body">
        <h3 class="svc__name">${esc(s.baslik)}</h3>
        <p class="svc__desc">${esc(s.aciklama)}</p>
        <p class="svc__foot"><span class="svc__time">${esc(s.sure)}</span>
          ${s.id === 'acil'
            ? `<a href="${esc(telHref(d))}">${icons.phone}<span>Ara</span></a>`
            : `<a href="${esc(waMsg(s.mesaj || `Merhaba, ${lower(s.baslik)} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Sor</span></a>`}</p>
      </div>
    </div>
  </article>`).join('');

// Süreç, galeri, türler
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');
$('[data-garanti]').textContent = d.garanti;
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="pol" style="--r:${[-3, 2, -1.5, 3, -2.5, 1][i % 6]}deg"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="900" height="700" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');
const who = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true">${pawSvg()}</i>`).join('');
$('[data-who]').innerHTML = `<div>${who}</div><div aria-hidden="true">${who}</div>`;
function pawSvg() {
  return '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="7" ry="6"/><ellipse cx="7.5" cy="13" rx="2.7" ry="3.5"/><ellipse cx="12.8" cy="8.6" rx="2.7" ry="3.5"/><ellipse cx="19.2" cy="8.6" rx="2.7" ry="3.5"/><ellipse cx="24.5" cy="13" rx="2.7" ry="3.5"/></svg>';
}

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__pet">${esc(y.arac || '')}</p>
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption>${esc(y.ad)}</figcaption>
  </figure>`).join('');

// Saatler, final, footer
const saatGrup = groupedHours(d.saatler);
$('[data-hours]').innerHTML = saatGrup
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;
$('[data-final-paws]').innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--i:${i}">${pawSvg()}</i>`).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Hatırlatma karnesi (imza bölümü) -----------------------------------------

(function remind() {
  const H = d.hatirlatici;
  $('[data-remind-title]').textContent = H.baslik;
  $('[data-remind-text]').textContent = H.metin;
  $('[data-mini-clinic]').textContent = d.isletme.ad;
  const form = $('[data-remind-form]');
  const photo = $('[data-mini-photo]');
  const wa = $('[data-remind-wa]');
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const PH = { Kedi: IMG('kedi'), Köpek: IMG('kopek-portre'), Diğer: IMG('kedi-portre') };
  let lastTur = '';
  function update(pop) {
    const f = new FormData(form);
    const tur = f.get('tur') || 'Kedi', yas = f.get('yas') || 'Yavru';
    const ad = String(f.get('ad') || '').trim();
    const son = String(f.get('son') || '');
    let sonTxt = 'Bilinmiyor';
    if (/^\d{4}-\d{2}$/.test(son)) sonTxt = `${AYLAR[Number(son.slice(5)) - 1]} ${son.slice(0, 4)}`;
    $('[data-mini-ad]').textContent = ad || '...';
    $('[data-mini-tur]').textContent = tur;
    $('[data-mini-yas]').textContent = yas;
    $('[data-mini-son]').textContent = sonTxt;
    if (tur !== lastTur) {
      photo.style.backgroundImage = `url("${PH[tur]}")`;
      lastTur = tur;
    }
    const sahip = { Kedi: 'kedim', Köpek: 'köpeğim' }[tur] || 'evcil hayvanım';
    const kim = ad ? `${sahip} ${ad}` : sahip;
    const msg = `Merhaba ${d.isletme.ad}, ${kim} için aşı takibini sizde başlatmak istiyorum. Yaşı: ${lower(yas)}. Son aşı: ${lower(sonTxt)}.`;
    wa.href = waHref(d, msg);
    if (pop && !reducedMotion) gsap.fromTo('[data-mini-stamp]', { scale: 1.6, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: -12, duration: 0.45, ease: 'back.out(2.5)' });
  }
  form.addEventListener('input', () => update(false));
  form.addEventListener('change', () => update(true));
  update(false);
})();

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__tj = S;
let ready = false;

// Bölüm aralıkları (film ilerlemesi)
const R = { hero: [0, 0.06], c1: [0.06, 0.24], c2: [0.24, 0.42], c3: [0.42, 0.6], c4: [0.6, 0.78], c5: [0.78, 0.92], over: [0.92, 1] };
const CH = ['c1', 'c2', 'c3', 'c4', 'c5'];
const K_FLIP = [0.02, 0.28], K_L = [0.28, 0.64], K_R = [0.64, 1];
const CARD_R = FILM.map((_, i) => {
  const [a, b] = R[CH[Math.floor(i / 2)]];
  const [ka, kb] = i % 2 ? K_R : K_L;
  return [L(a, b, ka), L(a, b, kb)];
});
const kOf = (p, id) => seg(p, R[id][0], R[id][1]);

// Kamera: [tx, tz, dist, el, az, fov, sx, sy]
function camFor(p, time) {
  const m = mobile();
  const port = innerHeight > innerWidth * 1.15;
  const idle = Math.sin(time * 0.35) * 0.02;
  const HERO = m
    ? [0, 0.05, 4.9, 0.62, 0.0, 40, 0, 0.2]
    : [0, 0.0, 3.3, 0.55, 0.0, 34, 0.17, 0.02];
  const FLIP = m ? (x) => [x, 0, 4.5, 1.18, 0, 40, 0, -0.19] : (x) => [x, 0.02, 3.7, 1.02, 0, 34, 0.15, 0.0];
  const PAGE = m ? (x) => [x, 0.02, port ? 3.95 : 4.1, 1.22, x * -0.05, 40, 0, -0.2] : (x) => [x * 0.1, 0.04, 3.5, 1.1, x * -0.1, 34, 0.165, 0.0];
  const OVER = m ? [0, 0.1, 6.2, 1.0, 0.18, 40, 0, -0.08] : [0, 0.08, 4.5, 0.9, 0.2, 34, 0.18, 0.0];

  if (p < R.c1[0]) return HERO;
  const lerpA = (A, B, t) => A.map((v, j) => L(v, B[j], sm(t)));
  if (p < R.hero[1] + 0.001) return HERO;
  for (let c = 0; c < 5; c++) {
    const id = CH[c];
    if (p >= R[id][0] && p < R[id][1]) {
      const k = kOf(p, id);
      const prev = c === 0 ? HERO : PAGE(0.5);
      const fk = seg(k, 0, 0.28);
      // Mobil: çevrilen yaprağı takip et (sağdan sola)
      const flipPose = m ? FLIP(L(0.5, -0.5, sm(seg(k, 0.06, 0.3)))) : FLIP(0);
      if (k < 0.28) return lerpA(prev, flipPose, seg(fk, 0, 0.6));
      if (k < 0.64) return lerpA(flipPose, PAGE(-0.5), seg(k, 0.28, 0.4));
      return lerpA(PAGE(-0.5), PAGE(0.5), seg(k, 0.64, 0.78));
    }
  }
  const out = lerpA(PAGE(0.5), OVER, seg(kOf(p, 'over'), 0, 0.5));
  out[4] += idle;
  return out;
}

const STAMP_T0 = 0.33, STAMP_DT = 0.085;
function filmState(p, time) {
  const cam = camFor(p, time);
  const m = mobile();
  // Kahraman: karne havada süzülür, sonra masaya yatar
  const land = sm(seg(p, 0.025, 0.085));
  const bob = Math.sin(time * 0.9) * 0.025 * (1 - land);
  const flip = [0, 0, 0, 0, 0];
  CH.forEach((id, c) => (flip[c] = sm(seg(kOf(p, id), K_FLIP[0], K_FLIP[1]))));
  const open = flip[0];
  const ink = new Array(11).fill(0);
  CH.forEach((id, c) => {
    const k = kOf(p, id);
    ink[c * 2 + 1] = seg(k, 0.3, 0.56);
    ink[c * 2 + 2] = seg(k, 0.66, 0.9);
  });
  // Mühür
  const k2 = kOf(p, 'c2');
  const stamps = [0, 0, 0];
  let tool = 0, toolAt = 0, toolH = 0.16, tilt = 0;
  if (k2 > 0.28 && k2 < 0.7) {
    tool = sm(seg(k2, 0.29, 0.34)) * (1 - sm(seg(k2, 0.6, 0.66)));
    for (let i = 0; i < 3; i++) {
      const q = seg(k2, STAMP_T0 + i * STAMP_DT, STAMP_T0 + (i + 1) * STAMP_DT);
      if (k2 >= STAMP_T0 + i * STAMP_DT) {
        toolAt = i === 0 ? 0 : i - 1 + sm(seg(q, 0, 0.35));
        const down = sm(seg(q, 0.35, 0.5)), upq = sm(seg(q, 0.62, 0.9));
        toolH = L(L(0.16, 0, down), 0.16, upq);
        tilt = Math.sin(q * Math.PI * 2) * 0.08 * (1 - down + upq);
      }
    }
    if (k2 > STAMP_T0 + 3 * STAMP_DT) { toolAt = 2; toolH = L(0.16, 0.5, seg(k2, STAMP_T0 + 3 * STAMP_DT, 0.66)); }
  }
  for (let i = 0; i < 3; i++) stamps[i] = seg(k2, STAMP_T0 + i * STAMP_DT + STAMP_DT * 0.5, STAMP_T0 + i * STAMP_DT + STAMP_DT * 0.62);
  if (p >= R.c3[0]) stamps.fill(1);
  const k5 = kOf(p, 'c5');
  return {
    tx: cam[0], ty: 0, tz: cam[1], dist: cam[2], el: cam[3], az: cam[4], fov: cam[5], sx: cam[6], sy: cam[7],
    bx: -W / 2 * (1 - open), by: L(m ? 0.25 : 0.3, 0, land) + bob, bz: 0,
    rx: L(m ? 0.72 : 0.62, 0, land) + Math.sin(time * 0.7) * 0.03 * (1 - land),
    ry: L(-0.38 + Math.sin(time * 0.4) * 0.12, 0, land),
    rz: L(m ? 0.12 : 0.16, 0, land),
    flip, curl: 0.9, ink, stamps, tool, toolAt, toolH, toolTilt: tilt,
    glow: bump(k5, 0.28, 0.64, 0.2),
    paws: seg(kOf(p, 'over'), 0.12, 0.85),
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const overview = $('[data-overview]');
const hint = $('[data-hint]');
const tag = $('[data-tag]');
const flipNote = $('[data-flipnote]');
const flipNo = $('b', flipNote), flipTxt = $('span', flipNote);
const tagText = $('span', tag);
let tagLayout = {};

function vis(el, v) {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
}

function filmUI(p) {
  const heroOut = seg(p, 0.022, 0.05);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0.0, 0.02);

  let active = -1, activeV = 0;
  cards.forEach((card, i) => {
    const [a, b] = CARD_R[i];
    const w = (b - a) * 0.14;
    const vin = seg(p, a + w * 0.2, a + w * 1.2), vout = seg(p, b - w, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(0, ${(1 - vin) * 34 - vout * 22}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) { active = i; activeV = v; }
  });
  const railOn = seg(p, 0.06, 0.08) * (1 - seg(p, 0.915, 0.925));
  vis(rail, railOn);
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p >= CARD_R[i][1]);
  });

  // Sayfa çevrilirken: sıradaki sayfaların başlığı
  let fv = 0;
  CH.forEach((id, c) => {
    const k = kOf(p, id);
    if (k > 0 && k < 0.3) {
      fv = bump(k, 0.0, 0.3, 0.3);
      const a = FILM[c * 2], b = FILM[c * 2 + 1];
      const t = `${a.no}–${b.no}`;
      if (flipNo.textContent !== t) { flipNo.textContent = t; flipTxt.textContent = `${a.durak} · ${b.durak}`; }
    }
  });
  vis(flipNote, fv);
  flipNote.style.transform = `translate3d(0, ${(1 - fv) * 20}px, 0)`;

  const ov = seg(p, 0.93, 0.955) * (1 - seg(p, 0.995, 1));
  vis(overview, ov);
  overview.style.transform = `translate3d(0, ${(1 - ov) * 30}px, 0)`;

  // Sayfaya iğnelenen etiket
  if (ready && active >= 0) {
    const f = FILM[active];
    const at = tagLayout[f.id] || [0.5, 0.5];
    const pt = S.project(active + 1, at[0], at[1]);
    const [a, b] = CARD_R[active];
    const tv = bump(p, a, b, 0.25) * activeV;
    if (tagText.textContent !== f.etiket) tagText.textContent = f.etiket;
    tag.classList.toggle('is-acil', f.id === 'acil');
    vis(tag, tv);
    tag.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
  } else vis(tag, 0);
}

// --- Başlangıç -------------------------------------------------------------

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });

let lenis = null;
let filmP = 0, filmTarget = 0, canvasFade = 1;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: film, start: 'bottom bottom', end: 'bottom 35%',
    onUpdate: (self) => (canvasFade = 1 - self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 70px', endTrigger: '.foot', end: 'bottom top',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'lines', linesClass: 'ln', mask: 'lines' });
    gsap.fromTo(s.lines, { yPercent: 110 }, {
      yPercent: 0, duration: 1, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.14 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 55%', scrub: true },
  });
  $$('[data-count]').forEach((el) => {
    const n = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: n, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = nf(Math.round(o.v))),
    });
  });
  // Hizmet sekmeleri: kart destesi gibi açılır
  $$('.svc__card').forEach((el, i) => {
    gsap.fromTo(el, { y: 80, rotate: i % 2 ? 3 : -3, opacity: 0 }, {
      y: 0, rotate: 0, opacity: 1, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });
  gsap.fromTo('.remind__card .mini', { rotate: -8, y: 60 }, {
    rotate: 3, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.remind', start: 'top bottom', end: 'center center', scrub: true },
  });
  $$('.step').forEach((el) => {
    gsap.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  // Galeri: sayfa kaydıkça yatay kayar
  const track = $('[data-gallery]');
  gsap.fromTo(track, { x: () => innerWidth * 0.1 }, {
    x: () => -(track.scrollWidth - innerWidth * 0.9), ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  $$('.rev').forEach((el, i) => {
    gsap.fromTo(el, { y: 50, rotate: i % 2 ? 2 : -2, opacity: 0 }, { y: 0, rotate: i % 2 ? 1 : -1, opacity: 1, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
  // Final: pati izleri yürür
  gsap.fromTo('.finale__paws i', { opacity: 0, scale: 0.4 }, {
    opacity: 1, scale: 1, stagger: 0.12, ease: 'back.out(2)',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 75%', end: 'center center', scrub: true },
  });
}

// --- Döngü ---------------------------------------------------------------

let visible = true;
new IntersectionObserver((e) => (visible = e[0].isIntersecting), { rootMargin: '100px' }).observe(film);
addEventListener('resize', () => S.resize());

let frame = 0;
function tick(time) {
  if (reducedMotion) filmP = filmTarget;
  else filmP += (filmTarget - filmP) * 0.14;
  if (Math.abs(filmTarget - filmP) < 0.00005) filmP = filmTarget;
  canvas.style.opacity = canvasFade;
  canvas.style.visibility = canvasFade > 0.01 ? 'visible' : 'hidden';
  if (visible && canvasFade > 0.01) {
    const st = filmState(filmP, time);
    S.render(st, time);
    filmUI(filmP);
  } else vis(tag, 0);
  frame++;
}

// --- Açılış + dokular ----------------------------------------------------

const intro = $('[data-intro]');
const pctEl = $('[data-intro-pct]');
let introDone = false;

function loadImg(src) {
  return new Promise((res) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}
async function fontsReady() {
  const list = ['400 40px "Paytone One"', '600 40px "Parkinsans"', '700 40px "Parkinsans"', '700 40px "Kalam"', '700 40px "Courier Prime"'];
  const t = new Promise((r) => setTimeout(r, 3500));
  await Promise.race([Promise.all(list.map((f) => document.fonts.load(f, 'ğşİıöçü'))), t]).catch(() => {});
}

async function buildTextures() {
  const [imgs] = await Promise.all([
    Promise.all(['kedi', 'steteskop', 'kan-ornegi', 'agiz-kontrol', 'sefkat'].map((n) => loadImg(IMG(n)))),
    fontsReady(),
  ]);
  const [kedi, steteskop, kan, agiz, sefkat] = imgs;
  const res = lite ? 720 : 1024;
  d.__saatler = saatGrup;
  const total = 11;
  let shown = 0;
  const setPct = (n) => {
    const v = Math.round((n / total) * 100);
    gsap.to({ v: shown }, { v, duration: 0.3, onUpdate() { pctEl.textContent = Math.round(this.targets()[0].v); } });
    shown = v;
  };
  // Sayfaları tek tek çiz; aralarda tarayıcıya nefes aldır
  const { pages, layout } = await new Promise((resolve) => {
    const out = buildPages(d, { kedi, steteskop, kan, agiz, sefkat }, res, (n) => setPct(n * 0.5));
    resolve(out);
  });
  for (let i = 0; i < pages.length; i++) {
    S.setPage(i, pages[i]);
    setPct(5.5 + (i + 1) * 0.5);
    await new Promise((r) => setTimeout(r, 0));
  }
  S.setStampAtlas(stampAtlas(lite ? 256 : 384));
  S.setPaw(pawSprite());
  S.setStamps(layout.stamps);
  tagLayout = layout.tags;
  ready = true;
}

function playIntro() {
  if (reducedMotion) return Promise.resolve();
  const tl = gsap.timeline();
  tl.fromTo('[data-intro-stamp]', { scale: 2.6, opacity: 0, rotate: -40 }, { scale: 1, opacity: 1, rotate: -12, duration: 0.55, ease: 'power4.in' }, 0.25)
    .fromTo('[data-intro-splat]', { scale: 0.4, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.8, ease: 'expo.out' }, 0.8)
    .fromTo('[data-intro-stamp]', { y: 0 }, { y: 6, duration: 0.08, yoyo: true, repeat: 1 }, 0.8)
    .fromTo('.intro__name, .intro__count', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'expo.out' }, 0.9);
  return new Promise((r) => tl.eventCallback('onComplete', r));
}

function heroIn() {
  if (reducedMotion) return;
  gsap.fromTo(split.chars, { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.025, ease: 'expo.out' });
  gsap.fromTo('.hero__since, .hero__slogan, .hero__cta, .top, .hint', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.25 });
}

function endIntro() {
  if (introDone) return;
  introDone = true;
  document.body.classList.remove('is-loading');
  gsap.to(intro, {
    clipPath: 'circle(0% at 50% 50%)', duration: reducedMotion ? 0.01 : 0.9, ease: 'expo.inOut',
    onComplete: () => intro.remove(),
  });
  lenis?.start();
  heroIn();
}
intro.addEventListener('click', () => { if (ready) endIntro(); });

setupScroll();
gsap.ticker.add((t) => tick(t));
const minWait = new Promise((r) => setTimeout(r, reducedMotion ? 0 : 1900));
Promise.all([playIntro(), buildTextures(), minWait]).then(() => {
  pctEl.textContent = '100';
  setTimeout(endIntro, reducedMotion ? 0 : 250);
});
// Güvenlik: bir şey takılırsa yine de aç
setTimeout(() => { if (!introDone) { ready = true; endIntro(); } }, 9000);
