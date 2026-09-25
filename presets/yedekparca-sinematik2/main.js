import veri from '../../data/depo.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createStage } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

// Ek veri (opsiyonel) derleme sırasında birleştirilir
const ekler = import.meta.glob('../../data/yedekparca-sinematik2.json', { eager: true, import: 'default' });
const ek = Object.values(ekler)[0] ?? {};
const d = boot({ ...veri, ...ek });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const sm = (t) => t * t * (3 - 2 * t);
const out = (t) => 1 - Math.pow(1 - t, 3);
const upper = (s) => s.toLocaleUpperCase('tr');
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;
const yil = new Date().getFullYear() - d.isletme.kurulus;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar --------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon,
  adres: d.iletisim.adres, garanti: d.garanti, hakkinda: d.isletme.hakkinda,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, şasi numaramı gönderiyorum, parça sormak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-brand]').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-kicker]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-since]').textContent = `${yil} yıldır aynı tezgâhta`;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});

// Dev isim: kelimeleri dengeli satırlara topla
const giant = $('[data-giant]');
{
  const words = d.isletme.ad.split(/\s+/);
  const narrow = innerWidth < 700;
  const max = Math.max(...words.map((w) => [...w].length), narrow ? 9 : Math.ceil([...d.isletme.ad].length / 2) + 1);
  const lines = words.reduce((acc, w) => {
    const last = acc.at(-1);
    if (last && [...`${last} ${w}`].length <= max) acc[acc.length - 1] = `${last} ${w}`;
    else acc.push(w);
    return acc;
  }, []);
  giant.innerHTML = lines.map((l) => `<span class="giant__line">${esc(upper(l))}</span>`).join('');
  giant.style.setProperty('--len', Math.max(...lines.map((l) => [...l].length)));
  giant.style.setProperty('--lines', lines.length);
  giant.setAttribute('aria-label', d.isletme.ad);
}

const stokStat = d.istatistikler.find((s) => /parça/.test(s.etiket)) ?? d.istatistikler[1];
$('[data-hero-count-label]').textContent = stokStat.etiket;

// --- Vitrin --------------------------------------------------------------------
const H = d.hizmetler.slice(0, 7);
const KINDS = ['disk', 'filtre', 'amortisor', 'triger', 'debriyaj', 'buji', 'piston'];
const kinds = H.map((h, i) => (KINDS.includes(h.parca) ? h.parca : KINDS[i % 7]));
const PASTEL = ['#dcd2f8', '#cdeedf', '#fad6c3', '#d0e2fa', '#f3e7b2', '#f6cfdd', '#d8e6c8'];
$('[data-v-total]').textContent = String(H.length).padStart(2, '0');
$('[data-vdots]').innerHTML = H.map((h, i) => `<li style="--i:${i}"><i></i><span>${esc(h.baslik)}</span></li>`).join('');
$('[data-v-list]').innerHTML = H.map((h) => `<li>${esc(h.baslik)}: ${esc(h.aciklama)}</li>`).join('');
const vcard = $('[data-vcard]');
let vIndex = -1;
const stockObj = { v: 0 };
function showPart(i) {
  if (i === vIndex) return;
  const first = vIndex < 0;
  vIndex = i;
  const h = H[i];
  const fill = () => {
    $('[data-v-raf]').textContent = h.raf ? `Raf ${h.raf}` : 'Rafta';
    $('[data-v-n]').textContent = String(i + 1).padStart(2, '0');
    $('[data-v-title]').textContent = h.baslik;
    $('[data-v-desc]').textContent = h.aciklama;
    $('[data-v-chips]').innerHTML = (h.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('');
    gsap.fromTo(stockObj, { v: (h.stok ?? 0) * 0.6 }, {
      v: h.stok ?? 0, duration: 0.8, ease: 'power2.out',
      onUpdate: () => ($('[data-v-stock]').textContent = nf(stockObj.v)),
    });
  };
  $$('[data-vdots] li').forEach((li, k) => li.classList.toggle('is-on', k === i));
  if (first || reducedMotion) return fill();
  gsap.killTweensOf(vcard, 'opacity,visibility,autoAlpha,y');
  gsap.to(vcard, {
    autoAlpha: 0, y: -14, duration: 0.18, ease: 'power2.in',
    onComplete: () => {
      fill();
      gsap.fromTo(vcard, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    },
  });
}
showPart(0);

// --- Şasi --------------------------------------------------------------------
const VIN = (ek.ornekSasi || 'VF1RFB00XD5123456').slice(0, 17).padEnd(17, '0');
$('[data-vin]').innerHTML = [...VIN].map((c, i) => `<span class="vin__c" style="--i:${i}"><b>${esc(c)}</b></span>`).join('');
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');
$('[data-match-name]').textContent = H[0]?.baslik ?? '';
const vinCells = $$('.vin__c');
const steps = $$('.step');
let typed = -1, stepOn = -1, legendOn = false, matchOn = false;

// --- Rakamlar --------------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, val: s.deger === 'kurulus' ? yil : Number(s.deger) || 0 }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><b class="stat__v"><span data-sv>0</span>${esc(s.sonek)}</b><span class="stat__l">${esc(s.etiket)}</span></li>`).join('');
const statEls = $$('.stat');
const statVals = $$('[data-sv]');
const lastStat = stats.map(() => -1);

// --- Teslimat -------------------------------------------------------------------
$('[data-tes]').innerHTML = (d.teslimat ?? []).map((t, i) => `
  <li class="tes__i" style="--i:${i}"><span class="tes__ring" aria-hidden="true"></span><div><h3>${esc(t.yer)}</h3><p><b>${esc(t.sure)}</b> · ${esc(t.not)}</p></div></li>`).join('');
const tesEls = $$('.tes__i');

// --- Opak bölümler ---------------------------------------------------------------
$('[data-strip]').innerHTML = (d.galeri ?? []).map((g, i) => `
  <figure class="strip__f" style="--i:${i}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="900" height="1100" /></figure>`).join('');

$$('[data-marquee]').forEach((el) => {
  const list = d[el.dataset.marquee] ?? [];
  const row = list.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
  el.innerHTML = `<div class="marquee__track"><div>${row}<i aria-hidden="true"></i></div><div aria-hidden="true">${row}<i></i></div></div>`;
});

if (d.puan) {
  $('[data-puan]').textContent = String(d.puan.ortalama).replace('.', ',');
  $('[data-puan-stars]').innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(d.puan.ortalama) ? 'on' : ''}">${icons.star}</i>`).join('');
  $('[data-puan-meta]').textContent = `${nf(d.puan.adet)} Google yorumunun ortalaması`;
}
$('[data-yorumlar]').innerHTML = d.yorumlar.map((y, i) => `
  <li class="yorum" style="--r:${[-2, 1.5, -1, 2, -1.5][i % 5]}deg">
    <p class="yorum__stars" aria-label="${y.puan} yıldız">${'★'.repeat(y.puan)}<span>${'★'.repeat(5 - y.puan)}</span></p>
    <p class="yorum__t">“${esc(y.metin)}”</p>
    <p class="yorum__m"><b>${esc(y.ad)}</b>${esc(y.arac)}</p>
  </li>`).join('');

const today = new Date().getDay();
const dayIdx = [1, 2, 3, 4, 5, 6, 0];
{
  // groupedHours ile aynı gruplama; bugünü işaretlemek için gün dizilerini de tut
  const labels = groupedHours(d.saatler);
  const dayGroups = [];
  for (const g of dayIdx) {
    const last = dayGroups.at(-1);
    if (last && d.saatler[last[0]] === d.saatler[g]) last.push(g);
    else dayGroups.push([g]);
  }
  $('[data-saatler]').innerHTML = labels.map(([gun, saat], i) =>
    `<li class="${dayGroups[i]?.includes(today) ? 'is-today' : ''}${saat === 'Kapalı' ? ' is-closed' : ''}"><span>${esc(gun)}</span><b>${esc(saat)}</b></li>`).join('');
}
$('[data-open]').innerHTML = `<i></i>${esc(status.text)}`;
$('[data-open]').classList.toggle('is-open', status.open);

const mapSlot = $('[data-map-slot]');
new IntersectionObserver((en, ob) => {
  if (!en[0].isIntersecting) return;
  ob.disconnect();
  mapSlot.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapSlot);

// --- Sahne ------------------------------------------------------------------------
const canvas = $('[data-stage]');
let stage = null;
const introState = { p: reducedMotion ? 1 : 0 };
try {
  stage = createStage(canvas, { kinds, lite });
  stage.setSize(innerWidth, innerHeight);
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}
addEventListener('resize', () => {
  stage?.setSize(innerWidth, innerHeight);
  measure();
});

// Film zamanı
const films = $$('[data-film]').map((el) => ({ el, i: Number(el.dataset.film), top: 0, len: 1 }));
// Uzun işletme adında (mobilde 4+ satır) giriş parçaları harflerin altına insin
let heroDrop = 0;
function measure() {
  heroDrop = innerWidth / innerHeight < 0.8
    ? Math.max(0, (giant.offsetTop + giant.offsetHeight) / innerHeight - 0.36) : 0;
  films.forEach((f) => {
    const r = f.el.getBoundingClientRect();
    f.top = r.top + scrollY;
    f.len = Math.max(1, f.el.offsetHeight - innerHeight);
  });
}
measure();
ScrollTrigger.addEventListener('refresh', measure);
function filmT(y) {
  let T = 0;
  let prev = -1;
  for (const f of films) {
    const gap = f.i !== prev + 1;
    const start = gap ? f.top - innerHeight : f.top;
    if (y >= start) T = f.i + (y >= f.top ? clamp((y - f.top) / f.len) : 0);
    prev = f.i;
  }
  return T;
}

// Film bölümleri görünür mü? Değilse WebGL durur.
let visible = 0;
const vis = new Set();
const io = new IntersectionObserver((en) => {
  en.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
  visible = vis.size;
  canvas.classList.toggle('is-off', !visible);
});
films.forEach((f) => io.observe(f.el));

// Fon renkleri
const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const toHex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const C = {
  hero: hex2('#e2dbf8'), sasi: hex2('#ece8f6'), stats: hex2('#1b1026'), tes: hex2('#cfe9dc'), final: hex2('#5b2bff'),
  p: PASTEL.map(hex2),
};
function bgAt(T, f) {
  const i = Math.floor(f), t = f - i;
  const vit = mix(C.p[i % 7], C.p[Math.min(i + 1, 6) % 7], t);
  let c = mix(C.hero, vit, sm(seg(T, 0.86, 1.0)));
  c = mix(c, C.sasi, sm(seg(T, 1.93, 2.0)));
  c = mix(c, C.stats, sm(seg(T, 2.9, 3.0)));
  c = mix(c, C.tes, sm(seg(T, 3.9, 4.0)));
  if (T > 5.5) c = C.final;
  return c;
}

const root = document.documentElement;
let lastBg = '';
const heroCount = $('[data-hero-count]');
let lastHC = -1;
const matchEl = $('[data-match]');
const legendEl = $('[data-vin-legend]');

function activeFAt(T) {
  const x = seg(T, 1.02, 1.93) * (H.length - 1);
  const i = Math.min(Math.floor(x), H.length - 2);
  return i + sm(seg(x - i, 0.3, 0.7));
}

const fades = [['.film--vitrin .stick', 1], ['.film--sasi .stick', 2], ['.film--stats .stick', 3], ['.film--teslimat .stick', 4]].map(([q, i]) => [$(q), i]);
let t0 = performance.now();
function frame() {
  const y = window.scrollY;
  const T = filmT(y);
  const f = T < 1 ? 0 : T > 2 ? H.length - 1 : activeFAt(T);
  // fon
  const bg = toHex(bgAt(T, f));
  if (bg !== lastBg) {
    lastBg = bg;
    root.style.setProperty('--bg', bg);
    stage?.setTint(bg);
    root.classList.toggle('is-dark', T > 2.95 && T < 3.95);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg);
    root.classList.toggle('is-violet', T > 5.5);
  }
  // hero sayaç
  const hc = Math.round(stokStat.deger * out(introState.p));
  if (hc !== lastHC && typeof stokStat.deger === 'number') {
    lastHC = hc;
    heroCount.textContent = nf(hc) + (stokStat.sonek || '');
  }
  // vitrin
  if (T >= 0.9 && T <= 2.05) showPart(Math.round(f));
  // şasi
  const pS = seg(T, 2, 3);
  const ty = Math.floor(seg(pS, 0.04, 0.3) * 17 + 0.001);
  if (ty !== typed) {
    typed = ty;
    vinCells.forEach((c, i) => c.classList.toggle('is-on', i < ty));
  }
  const lg = pS > 0.3;
  if (lg !== legendOn) legendEl.classList.toggle('is-on', (legendOn = lg));
  const st = pS < 0.2 ? -1 : pS < 0.36 ? 0 : pS < 0.5 ? 1 : pS < 0.7 ? 2 : 3;
  if (st !== stepOn) {
    stepOn = st;
    steps.forEach((s, i) => {
      s.classList.toggle('is-on', i === st);
      s.classList.toggle('is-done', i < st);
    });
  }
  const mt = pS > 0.52 && pS < 0.84;
  if (mt !== matchOn) matchEl.classList.toggle('is-on', (matchOn = mt));
  // rakamlar
  const pR = seg(T, 3, 4);
  stats.forEach((s, i) => {
    const a = 0.08 + i * 0.2;
    const k = out(seg(pR, a, a + 0.16));
    const v = Math.round(s.val * k);
    if (v !== lastStat[i]) {
      lastStat[i] = v;
      statVals[i].textContent = nf(v);
      statEls[i].classList.toggle('is-on', k > 0);
    }
  });
  // bölüm sonunda içerik söner (sahne geçişi için)
  fades.forEach(([el, i]) => {
    const o = T >= i && T < i + 1 ? 1 - sm(seg(T, i + 0.9, i + 0.985)) : T >= i + 1 ? 0 : 1;
    if (el._o !== o) el.style.opacity = el._o = o;
  });
  // teslimat
  tesEls.forEach((el, j) => el.classList.toggle('is-on', T >= 4.12 + j * 0.16));

  if (stage && visible) {
    const mobile = innerWidth / innerHeight < 0.8;
    // masaüstünde vitrin ve şasi sırasında kaideyi sağa kaydır, mobilde yukarı
    const vS = sm(seg(T, 0.85, 1.0)) * (1 - sm(seg(T, 2.86, 3.0)));
    const tS = T > 3.8 && T < 5.5 ? sm(seg(T, 3.86, 4.0)) : 0;
    const shiftX = mobile ? 0 : vS * 0.22 + tS * 0.18;
    const fS = T > 5.5 ? 1 : 0;
    const hD = heroDrop * (1 - sm(seg(T, 0.55, 0.9)));
    const shiftY = mobile ? vS * 0.2 + tS * 0.14 + fS * 0.1 - hD : 0;
    const time = reducedMotion ? 0 : (performance.now() - t0) / 1000;
    stage.update(T, time, { activeF: f, shiftX, shiftY, introP: introState.p });
  }
}
gsap.ticker.add(frame);

// --- Hareket -----------------------------------------------------------------------
const lenis = initSmoothScroll();
document.body.classList.remove('is-loading');

if (!reducedMotion) {
  const split = new SplitText('.giant__line', { type: 'chars', charsClass: 'ch' });
  gsap.set('.hero > *, .hero__count, .hint', { autoAlpha: 0, y: 24 });
  const tl = gsap.timeline({ delay: 0.15 });
  tl.to(introState, { p: 1, duration: 2.4, ease: 'power2.inOut' }, 0)
    .from(split.chars, { yPercent: 110, rotate: 8, autoAlpha: 0, duration: 1.1, stagger: 0.035, ease: 'expo.out' }, 0.35)
    .to('.hero > *, .hero__count, .hint', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 1.3);

  // hero çıkışı
  gsap.timeline({ scrollTrigger: { trigger: '.film--hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
    .to('.giant', { yPercent: -18, scale: 0.92, ease: 'none' }, 0)
    .to('.hero, .hero__count, .hint', { autoAlpha: 0, y: -40, ease: 'none', duration: 0.4 }, 0.45)
    .to('.giant', { autoAlpha: 0, duration: 0.3, ease: 'none' }, 0.7);

  // vitrin girişi
  gsap.from('.vcard, .vdots, .vlabel', {
    autoAlpha: 0, x: -30, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.film--vitrin', start: 'top 60%', toggleActions: 'play none none reverse' },
  });

  // şasi başlığı
  gsap.from('.sasi > .kicker, .sasi__title', {
    autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.film--sasi', start: 'top 55%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.stats > .kicker, .stats__about', {
    autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.film--stats', start: 'top 45%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.tes > .kicker, .tes__title', {
    autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.film--teslimat', start: 'top 45%', toggleActions: 'play none none reverse' },
  });

  // opak bölümler
  $$('.plain .plain__title, .plain .kicker').forEach((el) =>
    gsap.from(el, { autoAlpha: 0, y: 26, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  gsap.from('.strip__f', {
    y: 60, autoAlpha: 0, stagger: 0.07, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.strip', start: 'top 85%' },
  });
  gsap.to('.strip', {
    xPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.plain--galeri', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.from('.yorum', {
    y: 70, autoAlpha: 0, rotate: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.yorumlar', start: 'top 85%' },
  });
  gsap.from('.puan > *', {
    y: 30, autoAlpha: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.puan', start: 'top 85%' },
  });

  // final
  const fsplit = new SplitText('[data-final-title]', { type: 'words', wordsClass: 'w' });
  gsap.timeline({ scrollTrigger: { trigger: '.film--final', start: 'top 30%', end: 'top -40%', scrub: 0.6 } })
    .from(fsplit.words, { yPercent: 80, autoAlpha: 0, stagger: 0.12, ease: 'power3.out' })
    .from('.final__sub, .final__cta', { y: 30, autoAlpha: 0, stagger: 0.1 }, '-=0.2');
}

// resim yüklendikçe ölçüleri tazele
addEventListener('load', () => ScrollTrigger.refresh());
