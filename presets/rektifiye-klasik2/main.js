import raw from '../../data/mikron.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const nf = new Intl.NumberFormat('tr-TR');
const mm = (v, dec = 3) => v.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const years = new Date().getFullYear() - d.isletme.kurulus;
const IMG = (n) => asset(`/img/rektifiye-klasik2/${n}.jpg`);

function ablative(n) {
  const ones = n % 10, tens = Math.floor(n / 10) % 10;
  const byOnes = ['', "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const byTens = ['', "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  return ones ? byOnes[ones] : tens ? byTens[tens] : "'den";
}

// ------------------------------------------------------------------ metinler, linkler
$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$('[data-tags]').innerHTML = d.hizmetler.slice(0, 3).map((h) => `<li>${esc(h.baslik)}</li>`).join('');
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-btn]').forEach((a) => { a.href = telHref(d); a.insertAdjacentHTML('afterbegin', icons.phone); });
const big = $('[data-tel-big]');
big.href = telHref(d);
big.textContent = d.iletisim.telefon;
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d); a.target = '_blank'; a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
$('[data-maps]').href = mapsHref(d);

const st = openStatus(d.saatler);
const chip = $('[data-status-chip]');
chip.classList.toggle('is-open', st.open);
chip.innerHTML = `<span class="chip__l">${esc(st.text)}</span><span class="chip__s">${st.open ? 'Açık' : 'Kapalı'}</span>`;
const stEl = $('[data-status]');
stEl.textContent = st.text;
stEl.classList.toggle('is-open', st.open);

// Saatler, bugün vurgulu
const order = [1, 2, 3, 4, 5, 6, 0];
const todayPos = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const [a, b = a] = days.split(' – ');
  const ia = order.indexOf(GUNLER.indexOf(a)), ib = order.indexOf(GUNLER.indexOf(b));
  const today = todayPos >= ia && todayPos <= ib;
  return `<div class="${today ? 'is-today' : ''}"><dt>${esc(days)}${today ? ' · bugün' : ''}</dt><dd>${esc(val)}</dd></div>`;
}).join('');

// ------------------------------------------------------------------ hero verisi
const R = d.rapor || {};
const olculer = d.olculer?.length ? d.olculer : [{ ad: 'Standart', cap: 75, piston: 'STD' }];
const capStart = olculer[0].cap;
const nominal = R.nominal ? parseFloat(String(R.nominal).replace(',', '.')) : olculer[Math.min(1, olculer.length - 1)].cap;
const sinif = (v) => {
  let best = olculer[0];
  for (const o of olculer) if (v >= o.cap - 0.0005) best = o;
  return best.ad === 'Standart' ? 'Standart ölçü' : best.ad;
};
$('[data-cap]').textContent = mm(capStart);
$('[data-cls]').textContent = sinif(capStart);
$('[data-end-k]').textContent = [R.is, R.olcuSinifi].filter(Boolean).join(' · ');
$('[data-end-list]').innerHTML = (R.silindirler || []).map((c) =>
  `<li><span>${esc(c.no)}. silindir</span><b>Ø ${esc(c.olcu)}</b><span>ovalite ${esc(c.ovalite)}</span></li>`).join('');

// Kovan ölçü halkası: mikrometre tamburu gibi 100 çizgi
const ticks = $('.bore__ticks');
let tickHTML = '';
for (let i = 0; i < 100; i++) {
  const a = (i / 100) * Math.PI * 2 - Math.PI / 2;
  const major = i % 10 === 0, mid = i % 5 === 0;
  const r1 = 51.5, r2 = major ? 57 : mid ? 55.5 : 54;
  if (major) tickHTML += `<text x="${(Math.cos(a) * 60.5).toFixed(2)}" y="${(Math.sin(a) * 60.5).toFixed(2)}" transform="rotate(${(i * 3.6).toFixed(1)} ${(Math.cos(a) * 60.5).toFixed(2)} ${(Math.sin(a) * 60.5).toFixed(2)})">${i / 2}</text>`;
  tickHTML += `<line x1="${(Math.cos(a) * r1).toFixed(2)}" y1="${(Math.sin(a) * r1).toFixed(2)}" x2="${(Math.cos(a) * r2).toFixed(2)}" y2="${(Math.sin(a) * r2).toFixed(2)}"${major ? ' class="is-major"' : ''}/>`;
}
ticks.innerHTML = tickHTML;

// 45° hon izi: iki yönde çapraz çizgiler
const hatchA = $('.hatch--a'), hatchB = $('.hatch--b');
let ha = '', hb = '';
for (let x = -96; x <= 96; x += 8) {
  ha += `<line x1="${x}" y1="0" x2="${x + 100}" y2="100" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  hb += `<line x1="${x}" y1="100" x2="${x + 100}" y2="0" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
}
hatchA.innerHTML = ha;
hatchB.innerHTML = hb;

// ------------------------------------------------------------------ hakkında
const aboutEl = $('[data-about]');
const words = d.isletme.hakkinda.split(/\s+/);
const pillAt = { 3: 'ayna', [Math.floor(words.length * 0.62)]: 'krank' };
aboutEl.innerHTML = words.map((w, i) => {
  const pill = pillAt[i] ? ` <span class="pill-img w" style="background-image:url('${IMG(pillAt[i])}')" aria-hidden="true"></span>` : '';
  return `<span class="w">${esc(w)}</span>${pill}`;
}).join(' ');

// ------------------------------------------------------------------ hizmetler
const svcImgs = ['krank', 'blok', 'honlu', 'kafa', 'kafa', 'blok', 'krank-masa', 'ayna'];
const svcImg = (i) => IMG(svcImgs[i % svcImgs.length]);
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `<li data-i="${i}">
    <span class="svc__no mono">${String(i + 1).padStart(2, '0')} / ${String(d.hizmetler.length).padStart(2, '0')}</span>
    <h3 class="svc__t">${esc(h.baslik)}</h3>
    <span class="svc__tol">${esc(h.tolerans || '')}<small>${esc(h.sure || '')}</small></span>
    <p class="svc__d">${esc(h.aciklama)}</p>
    ${i < 3 ? `<span class="svc__thumb" style="background-image:url('${svcImg(i)}')" aria-hidden="true"></span>` : ''}
  </li>`).join('');
const svcPhoto = $('[data-svc-img]'), svcCap = $('[data-svc-cap]');
let svcCur = 0;
function setSvc(i) {
  if (i === svcCur) return;
  svcCur = i;
  $$('.svc li').forEach((li, k) => li.classList.toggle('is-active', k === i));
  svcPhoto.style.opacity = 0;
  setTimeout(() => {
    svcPhoto.src = svcImg(i);
    svcPhoto.alt = d.hizmetler[i].baslik;
    svcCap.textContent = d.hizmetler[i].baslik;
    svcPhoto.onload = () => (svcPhoto.style.opacity = 1);
  }, 180);
}
$('.svc li')?.classList.add('is-active');
svcCap.textContent = d.hizmetler[0]?.baslik || '';
if (matchMedia('(min-width: 900px)').matches) {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setSvc(+e.target.dataset.i)), { rootMargin: '-45% 0px -45% 0px' });
  $$('.svc li').forEach((li) => { io.observe(li); li.addEventListener('mouseenter', () => setSvc(+li.dataset.i)); });
}

// ------------------------------------------------------------------ büyütme halkaları
const ringsG = $('[data-rings]');
const nR = olculer.length;
let rg = '';
olculer.forEach((o, i) => {
  const r = 46 + (i * 44) / Math.max(1, nR - 1);
  rg += `<circle r="${r.toFixed(2)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/>`;
});
for (let i = 0; i < 72; i++) {
  const a = (i / 72) * Math.PI * 2, r1 = 95, r2 = i % 6 === 0 ? 100 : 97.5;
  rg += `<line class="rings__tick" x1="${(Math.cos(a) * r1).toFixed(2)}" y1="${(Math.sin(a) * r1).toFixed(2)}" x2="${(Math.cos(a) * r2).toFixed(2)}" y2="${(Math.sin(a) * r2).toFixed(2)}"/>`;
}
ringsG.innerHTML = rg;
$('[data-sizes]').innerHTML = olculer.map((o) =>
  `<li><b>${esc(o.ad)}</b><span>Ø ${esc(mm(o.cap, 2))} mm</span><span>piston ${esc(o.piston)}</span></li>`).join('');
const ringEls = $$('circle', ringsG), sizeEls = $$('[data-sizes] li');
let ringCur = -1;
function setRing(i) {
  if (i === ringCur) return;
  ringCur = i;
  ringEls.forEach((c, k) => { c.classList.toggle('is-on', k === i); c.classList.toggle('is-past', k < i); });
  sizeEls.forEach((li, k) => li.classList.toggle('is-on', k === i));
  $('[data-ring-val]').textContent = mm(olculer[i].cap, 2);
  $('[data-ring-cls]').textContent = olculer[i].piston === 'STD' ? 'Standart piston' : `Piston ${olculer[i].piston}`;
}
setRing(0);

// ------------------------------------------------------------------ rapor ve istatistik
$('[data-sheet-no]').textContent = 'ÖRNEK';
$('[data-rapor-is]').textContent = R.is || '';
$('[data-rapor-nom]').innerHTML = `Hedef çap <b>Ø ${esc(R.nominal || '')}</b> · ${esc(R.olcuSinifi || '')}`;
$('[data-rapor-cyl]').innerHTML = (R.silindirler || []).map((c) => {
  const ov = parseFloat(String(c.ovalite).replace(',', '.')) || 0;
  return `<li><span class="n">${esc(c.no)}</span><span class="v">${esc(c.olcu)}</span><span class="o">ovalite ${esc(c.ovalite)}</span>
    <span class="bar" aria-hidden="true"><i style="transform:scaleX(${Math.min(1, ov / 0.005).toFixed(3)})"></i></span></li>`;
}).join('');
$('[data-rapor-notes]').innerHTML = [['Krank', R.krank], ['Planya', R.planya]].filter((x) => x[1])
  .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
$('[data-stats]').innerHTML = d.istatistikler.map((s) => {
  const val = s.kurulustanHesapla ? years : s.deger;
  return `<div><dd><span data-count="${val}">${nf.format(val)}</span>${esc(s.sonek)}</dd><dt>${esc(s.etiket)}</dt></div>`;
}).join('');

// ------------------------------------------------------------------ süreç, galeri, motorlar, yorumlar
$('[data-steps]').innerHTML = d.surec.map((s, i) => `<li>
  <span class="steps__n">${String(i + 1).padStart(2, '0')}</span>
  <h3 class="steps__t">${esc(s.baslik)}</h3><p class="steps__d">${esc(s.aciklama)}</p></li>`).join('');

const extra = [
  { src: IMG('blok'), alt: 'Yeni honlanmış dört silindirli blok' },
  { src: IMG('krank-masa'), alt: 'Taşlanmayı bekleyen krank milleri' },
  { src: IMG('ayna'), alt: 'Torna aynası ve ayna ayakları' },
  { src: IMG('kafa'), alt: 'Silindir kapağı ve eksantrik milleri' },
];
const gal = [];
(d.galeri || []).forEach((g, i) => { gal.push(g); if (extra[i]) gal.push(extra[i]); });
extra.slice((d.galeri || []).length).forEach((g) => gal.push(g));
$('[data-gallery]').innerHTML = gal.map((g) =>
  `<figure><img class="g__img" src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

$('[data-engines]').innerHTML = (d.markalar || []).map((m) => `<li>${esc(m)}</li>`).join('');

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-score-count]').textContent = `${d.puan.adet} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((r) => `<li>
  <span class="rv__stars" aria-label="${r.puan} yıldız">${stars(r.puan)}</span>
  <p class="rv__t">${esc(r.metin)}</p>
  <span class="rv__who"><span class="rv__av" aria-hidden="true">${esc(r.ad.trim().charAt(0))}</span><span><b>${esc(r.ad)}</b><span>${esc(r.arac)}</span></span></span></li>`).join('');

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '500px 0px' }).observe(mapBox);

// ------------------------------------------------------------------ header
const top = $('.top');
const hero = $('.hero');
let heroDark = false;
let heroEndY = 0;
function headerState() {
  const y = window.scrollY;
  const past = y > heroEndY + 10;
  top.classList.toggle('is-solid', past);
  top.classList.toggle('is-dark', heroDark && !past);
}
addEventListener('scroll', headerState, { passive: true });

// ------------------------------------------------------------------ İMZA: kovan
const stage = $('.hero__stage');
const bore = $('.bore'), win = $('.bore__win'), boreImg = $('.bore__img');
const IMG_W = 1280, IMG_H = 960, BORE_FRAC = 0.86; // kovanın fotoğraf yüksekliğine oranı
const geo = { s1: 3, k0: 0.6 };
const zoom = { z: 0 };
function layoutBore() {
  const D = bore.offsetWidth;
  const vw = stage.clientWidth, vh = stage.clientHeight;
  const cx = bore.offsetLeft + D / 2, cy = bore.offsetTop + D / 2;
  const need = [2 * Math.max(cx, vw - cx), 2 * Math.max(cy, vh - cy)];
  // Kutu fotoğrafın kendi oranında: kırpılmadan kovan tam ortada kalsın
  const W = Math.max(need[0], (need[1] * IMG_W) / IMG_H), H = (W * IMG_H) / IMG_W;
  Object.assign(boreImg.style, { width: `${W}px`, height: `${H}px`, left: `${D / 2 - W / 2}px`, top: `${D / 2 - H / 2}px`, transformOrigin: `${W / 2}px ${H / 2}px` });
  const sc = Math.max(W / IMG_W, H / IMG_H);
  geo.k0 = Math.min(1, (D * 1.04) / (BORE_FRAC * IMG_H * sc));
  geo.s1 = (Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy)) * 2) / D + 0.04;
  applyZoom();
}
function applyZoom() {
  const z = zoom.z;
  const s = 1 + (geo.s1 - 1) * z;
  const k = geo.k0 + (1 - geo.k0) * z;
  win.style.transform = `scale(${s.toFixed(4)})`;
  boreImg.style.transform = `scale(${(k / s).toFixed(5)})`;
}
layoutBore();
addEventListener('resize', () => { layoutBore(); });

const capEl = $('[data-cap]'), clsEl = $('[data-cls]');
const cap = { v: capStart };
const setCap = () => { capEl.textContent = mm(cap.v); clsEl.textContent = sinif(cap.v); };

initSmoothScroll();
ScrollTrigger.config({ ignoreMobileResize: true });

if (reducedMotion) {
  $$('.hatch line').forEach((l) => l.setAttribute('stroke-dashoffset', '0'));
  cap.v = nominal; setCap();
  $$('.about__lead .w').forEach((w) => (w.style.opacity = 1));
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: headerState });
  heroEndY = 0;
} else {
  const mobile = matchMedia('(max-width: 899px)').matches;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${Math.round(innerHeight * (mobile ? 1.7 : 1.9))}`,
      pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1,
      onRefresh: (self) => { heroEndY = self.end; layoutBore(); },
      onUpdate: (self) => { const dk = self.progress > 0.66; if (dk !== heroDark) { heroDark = dk; headerState(); } },
    },
  });
  tl.to('.hero__cue', { autoAlpha: 0, duration: 0.4 }, 0)
    .to('.bore__ring', { rotation: -324, duration: 5, transformOrigin: '50% 50%' }, 0)
    .to(cap, { v: nominal, duration: 4.6, ease: 'power1.inOut', onUpdate: setCap }, 0.2)
    .to('.hatch--a line', { attr: { 'stroke-dashoffset': 0 }, duration: 1.1, stagger: 0.06, ease: 'power1.out' }, 0.3)
    .to('.hatch--b line', { attr: { 'stroke-dashoffset': 0 }, duration: 1.1, stagger: 0.06, ease: 'power1.out' }, 1.9)
    .fromTo('.readout__hon', { autoAlpha: 0.3 }, { autoAlpha: 1, duration: 0.6 }, 3.2)
    .to('.hero__text', { autoAlpha: 0, y: -50, duration: 1, ease: 'power1.in' }, 5.1)
    .to('.readout', { autoAlpha: 0, y: 30, duration: 0.9, ease: 'power1.in' }, 5.1)
    .to(['.bore__ring', '.bore__pointer'], { autoAlpha: 0, duration: 0.8 }, 5.2)
    .to(['.bore__hatch', '.bore__glint'], { autoAlpha: 0, duration: 0.9 }, 5.5)
    .to(zoom, { z: 1, duration: 3, ease: 'power2.in', onUpdate: applyZoom }, 5.4)
    .to('.hero__shade', { opacity: 1, duration: 1 }, 7.6)
    .fromTo('.hero__end', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' }, 7.9)
    .from('.hero__end-list li', { autoAlpha: 0, y: 20, stagger: 0.12, duration: 0.6 }, 8.2)
    .to({}, { duration: 0.8 });

  // Hakkında: kelimeler okundukça koyulaşır
  gsap.to('.about__lead .w', {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '.about__lead', start: 'top 82%', end: 'bottom 50%', scrub: true },
  });

  // Hizmet satırları
  ScrollTrigger.batch('.svc li', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, { autoAlpha: 0, y: 24, stagger: 0.08, duration: 0.6, ease: 'power2.out' }),
  });

  // Büyütme halkaları: kaydırdıkça bir üst ölçüye
  gsap.from(ringEls, { attr: { 'stroke-dashoffset': 1 }, duration: 1.2, stagger: 0.12, ease: 'power2.out', scrollTrigger: { trigger: '.rings', start: 'top 80%', once: true } });
  ScrollTrigger.create({
    trigger: '.sizes', start: 'top 45%', end: 'bottom 70%',
    onUpdate: (self) => setRing(Math.min(nR - 1, Math.floor(self.progress * nR))),
  });

  // Rapor: çubuklar ve mühür
  gsap.from('.sheet__cyl .bar i', { scaleX: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out', scrollTrigger: { trigger: '.sheet', start: 'top 70%', once: true } });
  gsap.from('.sheet__stamp', { scale: 1.8, autoAlpha: 0, rotation: 10, duration: 0.5, ease: 'back.out(2)', delay: 0.6, scrollTrigger: { trigger: '.sheet', start: 'top 70%', once: true } });
  gsap.from('.sheet', { y: 60, rotation: 2, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.sheet', start: 'top 92%', once: true } });

  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = nf.format(Math.round(o.v))) }),
    });
  });

  ScrollTrigger.batch('.steps__list li, .reviews__list li, .engines__list li', {
    start: 'top 92%', once: true,
    onEnter: (els) => gsap.from(els, { autoAlpha: 0, y: 30, stagger: 0.06, duration: 0.6, ease: 'power2.out' }),
  });

  gsap.to('.final__ring', { rotation: 90, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true } });
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: headerState });
}
headerState();
