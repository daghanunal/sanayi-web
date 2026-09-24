import sektor from '../../data/sektor-dizel.json';
import ekstra from '../../data/dizel-sinematik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const d = boot({ ...sektor, ...ekstra, preset: 'dizel-sinematik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const dec = (v, n = 1) => (Number.isInteger(v) && n === 0 ? String(v) : v.toFixed(n).replace('.', ','));
const clamp = gsap.utils.clamp;
const smooth = (a, b, x) => {
  const t = clamp(0, 1, (x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const phone = matchMedia('(max-width: 899px)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const years = new Date().getFullYear() - d.isletme.kurulus;
if (reducedMotion) document.documentElement.classList.add('is-reduced');

// Yıl ekleri: 1995'ten, 2000'den, 1989'dan
const ablative = (y) => {
  const s = String(y);
  const ones = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const tens = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'ten", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return ones[s.at(-1)];
  if (s.at(-2) !== '0') return tens[s.at(-2)];
  return "'den";
};

// ------------------------------------------------------------------ içerik

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri dizel`;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-plain]').forEach((a) => {
  a.href = telHref(d);
  a.textContent = d.iletisim.telefon;
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(a.textContent)}</span>`;
});
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = `${icons.whatsapp}<span>${esc(a.textContent)}</span>`;
});
$$('[data-maps]').forEach((a) => {
  a.href = mapsHref(d);
  a.innerHTML = `${icons.pin}<span>${esc(a.textContent)}</span>`;
});

// Açık / kapalı
const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
const big = $('[data-status-big]');
big.textContent = st.text;
big.classList.toggle('is-open', st.open);
const HAFTA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const bugun = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][new Date().getDay()];
const icerir = (label) => {
  const [a, b = a] = label.split(' – ');
  const i = HAFTA.indexOf(bugun);
  return i >= HAFTA.indexOf(a) && i <= HAFTA.indexOf(b);
};
$('[data-saatler]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => `<tr class="${icerir(gun) ? 'is-today' : ''}"><td>${esc(gun)}</td><td>${esc(saat)}</td></tr>`)
  .join('');

// Harita: yaklaşınca yükle
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// Hizmetler
$('[data-hizmetler]').innerHTML = d.hizmetler
  .map(
    (h, i) => `
  <li class="is">
    <span class="is__n">${String(i + 1).padStart(2, '0')}</span>
    <div class="is__body">
      <h3 class="is__ad">${esc(h.baslik)}</h3>
      <p class="is__txt">${esc(h.aciklama)}</p>
      <div class="is__foot">
        <span class="is__sure">${esc(h.sure)}</span>
        <a class="is__wa" href="${esc(waHref(d, `Merhaba, ${h.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">Bu iş için sor</a>
      </div>
    </div>
    <i class="is__line" aria-hidden="true"></i>
  </li>`
  )
  .join('');

// Manometreler (istatistikler)
const ARC = 'M 20 80 A 60 60 0 1 1 140 80';
const FRAC = [0.82, 0.94, 0.72, 0.6];
$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const v = s.kurulustanHesapla ? years : s.deger;
    let ticks = '';
    for (let k = 0; k <= 20; k++) {
      const a = Math.PI * (1 + 0.25) - (k / 20) * Math.PI * 1.5;
      const r1 = 60, r2 = k % 5 ? 54 : 49;
      ticks += `<line x1="${(80 + Math.cos(a) * r1).toFixed(1)}" y1="${(80 - Math.sin(a) * r1).toFixed(1)}" x2="${(80 + Math.cos(a) * r2).toFixed(1)}" y2="${(80 - Math.sin(a) * r2).toFixed(1)}"/>`;
    }
    return `<figure class="mano" style="--f:${FRAC[i] ?? 0.8}">
      <svg viewBox="0 0 160 118" aria-hidden="true">
        <g class="mano__ticks">${ticks}</g>
        <path class="mano__track" d="${ARC}" pathLength="1"/>
        <path class="mano__fill" d="${ARC}" pathLength="1"/>
        <line class="mano__needle" x1="80" y1="80" x2="80" y2="30"/>
        <circle class="mano__hub" cx="80" cy="80" r="5"/>
      </svg>
      <p class="mano__val" data-count="${v}" data-suffix="${esc(s.sonek)}">0</p>
      <figcaption>${esc(s.etiket)}</figcaption>
    </figure>`;
  })
  .join('');

// Süreç
$('[data-surec]').innerHTML = d.surec
  .map((s, i) => `<li class="adim"><span class="adim__dot" aria-hidden="true"><i></i></span><span class="adim__n">${i + 1}. adım</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`)
  .join('');

// Ağır vasıta
const agir = d.hizmetler.find((h) => /ağır/i.test(h.baslik)) || d.hizmetler.at(-1);
$('[data-agir]').textContent = agir.aciklama;
const waAgir = $('[data-wa-agir]');
waAgir.href = waHref(d, 'Merhaba, ticari aracımın enjektör / pompası için bilgi almak istiyorum.');
waAgir.target = '_blank';
waAgir.rel = 'noopener';
waAgir.innerHTML = `${icons.whatsapp}<span>${esc(waAgir.textContent)}</span>`;

// Galeri
$('[data-galeri]').innerHTML = d.galeri
  .map((g, i) => `<figure class="foto${i % 3 === 1 ? ' foto--tall' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy"><figcaption><span>${String(i + 1).padStart(2, '0')}</span>${esc(g.alt)}</figcaption></figure>`)
  .join('');

// Yorumlar
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('[data-puan]').textContent = String(d.puan.ortalama).replace('.', ',');
$('[data-stars]').innerHTML = stars(5);
$('[data-puan-adet]').textContent = `${nf.format(d.puan.adet)} Google yorumu`;
$('[data-yorumlar]').innerHTML = d.yorumlar
  .map(
    (y) => `<figure class="yorum"><div class="yorum__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</div>
      <blockquote>${esc(y.metin)}</blockquote><figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption></figure>`
  )
  .join('');

// Sistemler
const mq = $('[data-marquee]');
const codes = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('');
mq.innerHTML = codes + codes;

// ------------------------------------------------------------------ test çıktısı (fiş)

const C = d.cikti;
$('[data-cikti-not]').textContent = C.not;
const bugunStr = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
const inRange = (v, [a, b]) => v >= a && v <= b;
function fisHTML(mode) {
  const V = C[mode];
  const rows = C.olcumler
    .map((o, r) => {
      const cells = V.map((col) => {
        const v = col[r];
        const ok = inRange(v, o.aralik);
        return `<td class="${ok ? '' : 'bad'}" data-v="${esc(dec(v, v % 1 ? 1 : 0))}">${esc(dec(v, v % 1 ? 1 : 0))}${ok ? '' : '<em>!</em>'}</td>`;
      }).join('');
      const [a, b] = o.aralik;
      return `<tr><th><b>${esc(o.kod)}</b>${esc(o.ad)}</th>${cells}<td class="rng">${esc(dec(a, a % 1 ? 1 : 0))}–${esc(dec(b, b % 1 ? 1 : 0))}</td></tr>`;
    })
    .join('');
  const kotu = V.map((col, i) => (C.olcumler.some((o, r) => !inRange(col[r], o.aralik)) ? i + 1 : 0)).filter(Boolean);
  const sonuc = kotu.length
    ? `${kotu.join(', ')} numaralı enjektör aralık dışında. Tamir edilip yeniden ölçülecek.`
    : 'Dört enjektör de aralıkta. Kodlanıp araca takılabilir.';
  let bars = '';
  for (let i = 0; i < 46; i++) bars += `<i style="flex:${1 + ((i * 7) % 4)}"></i>`;
  return `
    <header class="fis__head">
      <p class="fis__name">${esc(d.isletme.ad)}</p>
      <p>${esc(d.iletisim.telefon)}</p>
      <p class="fis__title">ENJEKTÖR TEST ÇIKTISI</p>
      <div class="fis__meta"><span>${esc(bugunStr)}</span><span>${mode === 'once' ? 'İLK ÖLÇÜM' : 'TAMİR SONRASI'}</span></div>
      <div class="fis__meta"><span>${esc(C.tip)}</span><span>${esc(C.birim)}</span></div>
    </header>
    <table>
      <thead><tr><th></th><th>E1</th><th>E2</th><th>E3</th><th>E4</th><th class="rng">Aralık</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="fis__sonuc ${kotu.length ? 'is-bad' : 'is-ok'}"><b>${kotu.length ? 'SONUÇ: ARALIK DIŞI' : 'SONUÇ: UYGUN'}</b>${esc(sonuc)}</p>
    <div class="fis__bars" aria-hidden="true">${bars}</div>
    <p class="fis__foot">Örnek çıktı · Teslimde bu kâğıt verilir</p>`;
}
const fis = $('[data-fis]');
let fisMode = 'once';
fis.innerHTML = fisHTML(fisMode);

function printFis(mode, animate = true) {
  fisMode = mode;
  $$('.toggle button').forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === mode));
  if (!animate || reducedMotion) {
    fis.innerHTML = fisHTML(mode);
    gsap.set(fis, { yPercent: 0 });
    return;
  }
  gsap.timeline()
    .to(fis, { yPercent: -102, duration: 0.35, ease: 'power2.in' })
    .add(() => (fis.innerHTML = fisHTML(mode)))
    .to(fis, { yPercent: 0, duration: 1.3, ease: 'steps(26)' })
    .add(() => {
      $$('td[data-v]', fis).forEach((td, i) => {
        const v = td.dataset.v;
        const em = td.querySelector('em');
        gsap.fromTo(td, { color: '#8a8a80' }, { color: '', duration: 0.4, delay: i * 0.012 });
        void v; void em;
      });
    }, '-=1.1');
}
$$('.toggle button').forEach((b) => b.addEventListener('click', () => b.dataset.mode !== fisMode && printFis(b.dataset.mode)));

// ------------------------------------------------------------------ kinetik başlıklar

const splits = new Map();
function splitHead(el) {
  if (splits.has(el)) return splits.get(el);
  const s = new SplitText(el, { type: 'lines,words,chars', linesClass: 'ln', charsClass: 'ch' });
  splits.set(el, s);
  return s;
}

// ------------------------------------------------------------------ sahne

const low = phone || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const canvas = $('.stage');
let scene = null;
try {
  scene = createScene(canvas, { low, reduced: reducedMotion, phone });
} catch (err) {
  console.warn('WebGL yok, sahne atlandı', err);
  canvas.remove();
}

// Patlatılmış görünüş etiketleri
const tagBox = $('[data-tags]');
tagBox.innerHTML = d.parcalar
  .map((p, i) => `<div class="tag"><i class="tag__dot"></i><i class="tag__line"></i><p class="tag__txt"><b>${String(i + 1).padStart(2, '0')}</b>${esc(p.ad)}<small>${esc(p.not)}</small></p></div>`)
  .join('');
const tags = $$('.tag', tagBox);

// Menzür etiketleri
const tubeBox = $('[data-tubetags]');
tubeBox.innerHTML = [0, 1, 2, 3]
  .map((i) => `<div class="tt"><b>${i + 1}</b><span data-tt>0,0</span></div>`)
  .join('');
const tts = $$('.tt', tubeBox);
const ttVals = $$('[data-tt]', tubeBox);

const hud = $('.hud'), codehud = $('.codehud');
const hudBar = $('[data-hud-bar]'), hudK = $('[data-hud-k]');
const codeEl = $('[data-code]'), codeState = $('[data-code-state]'), codePct = $('[data-code-pct]'), codeBar = $('[data-code-bar]');
const rpm = $('[data-rpm]');
const CODE = '5A7C 3F91';
const HEX = '0123456789ABCDEF';

function setVis(el, on, key) {
  if (el[key] === on) return;
  el[key] = on;
  gsap.to(el, { autoAlpha: on ? 1 : 0, y: on ? 0 : -8, duration: 0.3, overwrite: true });
}

if (scene) {
  const S = scene.state;
  const TAM = C.once.map((r) => r[0]);
  let lastCh = -1;
  scene.onFrame.push(() => {
    const p = S.p;
    // bölüm sayacı
    const ch = p < 0.13 ? 0 : p < 0.42 ? 1 : p < 0.7 ? 2 : p < 0.88 ? 3 : 4;
    if (ch !== lastCh) {
      lastCh = ch;
      rpm.textContent = String(ch + 1).padStart(2, '0');
    }
    // parça etiketleri
    const e = S.explode;
    const showTags = e > 0.75;
    tagBox.classList.toggle('is-on', showTags);
    if (e > 0.5) {
      const heroC = scene.project(scene.anchors.part(2));
      const colX = heroC.x + (phone ? 64 : 150);
      tags.forEach((tg, i) => {
        const P = scene.project(scene.anchors.part(i));
        const len = Math.max(12, colX - P.x);
        tg.style.transform = `translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`;
        tg.style.setProperty('--len', `${len.toFixed(0)}px`);
      });
    }
    // menzür etiketleri
    const showTT = S.bench > 0.98 && S.fill > 0.02 && p < 0.9;
    tubeBox.classList.toggle('is-on', showTT);
    if (showTT) {
      tts.forEach((tt, i) => {
        const P = scene.project(scene.anchors.tubeBottom(i));
        tt.style.transform = `translate3d(${P.x.toFixed(1)}px,${P.y.toFixed(1)}px,0)`;
        let v = TAM[i] * S.fill;
        let bad = false;
        if (i === 2) {
          if (S.redo < 0.35) { v = TAM[i] * S.fill * (1 - smooth(0, 0.35, S.redo)); bad = S.fill > 0.6; }
          else v = C.sonra[2][0] * smooth(0.45, 1, S.redo);
        }
        ttVals[i].textContent = dec(v, 1);
        tt.classList.toggle('is-bad', bad);
        tt.classList.toggle('is-ok', i === 2 && S.redo > 0.99);
      });
    }
    // HUD
    const showHud = p > 0.49 && p < 0.7;
    setVis(hud, showHud, '_on');
    if (showHud) {
      hudBar.style.transform = `scaleX(${S.fill.toFixed(3)})`;
      hudK.textContent = S.redo > 0.02 ? '3 numara: tamir sonrası ölçüm' : S.fill > 0.6 ? '3 numara aralık dışında' : 'Tam yük debisi';
      hud.classList.toggle('is-bad', S.fill > 0.6 && S.redo < 0.02);
    }
    // kod HUD
    const showCode = p > 0.73 && p < 0.89;
    setVis(codehud, showCode, '_on');
    if (showCode) {
      const k = S.code;
      const n = Math.floor(k * CODE.length);
      let s = '';
      for (let i = 0; i < CODE.length; i++) {
        if (CODE[i] === ' ') s += ' ';
        else s += i < n ? CODE[i] : HEX[(Math.random() * 16) | 0];
      }
      codeEl.textContent = s;
      codePct.textContent = `${Math.round(k * 100)}%`;
      codeBar.style.transform = `scaleX(${k.toFixed(3)})`;
      const done = k > 0.99;
      codeState.textContent = done ? 'Beyne yazıldı' : 'Beyne yazılıyor';
      codehud.classList.toggle('is-done', done);
    }
  });
}

// ------------------------------------------------------------------ açılış

const intro = $('.intro');
function buildIntro() {
  // kadran çentikleri
  let t = '';
  for (let i = 0; i <= 36; i++) {
    const a = Math.PI * 1.25 - (i / 36) * Math.PI * 1.5;
    const r1 = 96, r2 = i % 6 ? 90 : 84;
    t += `<line class="${i % 6 ? '' : 'maj'}" x1="${(120 + Math.cos(a) * r1).toFixed(1)}" y1="${(120 - Math.sin(a) * r1).toFixed(1)}" x2="${(120 + Math.cos(a) * r2).toFixed(1)}" y2="${(120 - Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  $('.intro__ticks').innerHTML = t;
  // püskürtme çizgileri
  let b = '';
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + Math.random() * 0.05;
    const r0 = 6 + Math.random() * 8, r1 = 60 + Math.random() * 90;
    b += `<line x1="${(Math.cos(a) * r0).toFixed(1)}" y1="${(Math.sin(a) * r0).toFixed(1)}" x2="${(Math.cos(a) * r1).toFixed(1)}" y2="${(Math.sin(a) * r1).toFixed(1)}" style="stroke-width:${(0.3 + Math.random() * 1.2).toFixed(2)}"/>`;
  }
  $('.intro__burst').innerHTML = b;
}
function playIntro() {
  return new Promise((resolve) => {
    if (reducedMotion) {
      intro.remove();
      resolve();
      return;
    }
    buildIntro();
    const num = $('[data-intro-bar]');
    const o = { v: 0 };
    const MAX = 1800;
    const tl = gsap.timeline({ onComplete: finish });
    tl.fromTo('.intro__fill', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, ease: 'power3.in' }, 0)
      .to(o, {
        v: MAX, duration: 1.5, ease: 'power3.in',
        onUpdate: () => (num.textContent = nf.format(Math.round(o.v / 10) * 10)),
      }, 0)
      .to('.intro__core', { x: 2, duration: 0.04, yoyo: true, repeat: 5, ease: 'none' }, 1.3)
      .add(() => intro.classList.add('is-burst'))
      .fromTo('.intro__burst line', { scale: 0.1, autoAlpha: 1, transformOrigin: '0px 0px' }, { scale: 1.8, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.002, from: 'random' } })
      .to('.intro__core', { scale: 1.12, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, '<')
      .fromTo(intro, { '--r': '0%' }, { '--r': '160%', duration: 0.9, ease: 'expo.inOut' }, '<0.05');
    gsap.from('.intro__name', { yPercent: 40, autoAlpha: 0, duration: 0.6, ease: 'power3.out', delay: 0.15 });
    intro.addEventListener('pointerdown', () => tl.progress(0.999), { once: true });
    function finish() {
      intro.remove();
      resolve();
    }
    requestAnimationFrame(() => scene?.warm());
  });
}

// ------------------------------------------------------------------ film

function heroIn() {
  const split = splitHead($('.hero__title'));
  gsap.set('.chap--hero', { autoAlpha: 1 });
  const tl = gsap.timeline();
  tl.from(split.chars, { yPercent: 118, duration: 0.9, ease: 'expo.out', stagger: 0.025 })
    .from(['.chap__since', '.hero__lead', '.hero__cta', '.hero__hint'], { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.25)
    .from('.rpm', { autoAlpha: 0, x: -10, duration: 0.5 }, 0.5);
  return tl;
}

let filmST = null;
function buildFilm() {
  const chaps = $$('.chap');
  const dur = phone ? 7.5 : 8;
  const W = [
    [-1, 0.1],
    [0.15, 0.37],
    [0.47, 0.66],
    [0.72, 0.87],
    [0.9, 1.1],
  ];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  chaps.forEach((el, i) => {
    const [a, b] = W[i];
    const title = $('.chap__title, .hero__title', el);
    const split = title ? splitHead(title) : null;
    if (i > 0) {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.012 }, a);
      if (split) tl.fromTo(split.chars, { yPercent: 118 }, { yPercent: 0, stagger: 0.0014, duration: 0.03, ease: 'power3.out' }, a);
      tl.fromTo($$('.antet, .chap__txt', el), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.03, stagger: 0.01 }, a + 0.01);
    }
    if (b < 1) {
      if (split) tl.to(split.chars, { yPercent: -118, stagger: 0.001, duration: 0.025, ease: 'power2.in' }, b - 0.035);
      tl.to(el, { autoAlpha: 0, duration: 0.02 }, b - 0.02);
    }
  });
  tl.fromTo('.rpm i', { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
  tl.to({}, { duration: 0.001 }, 1);

  filmST = ScrollTrigger.create({
    trigger: '.film',
    start: 'top top',
    end: () => `+=${innerHeight * dur}`,
    pin: true,
    scrub: true,
    anticipatePin: 1,
    onUpdate(self) {
      scene?.setProgress(self.progress);
      tl.progress(self.progress);
    },
  });
  ScrollTrigger.create({
    start: () => filmST.end,
    end: () => filmST.end + innerHeight,
    onLeave: () => scene?.stop(),
    onEnterBack: () => scene?.start(),
  });
  window.__film = filmST;
}

// ------------------------------------------------------------------ bölümler

function kineticHeads() {
  $$('[data-kin]').forEach((el) => {
    const s = splitHead(el);
    gsap.from(s.chars, {
      yPercent: 118, duration: 0.9, ease: 'expo.out', stagger: 0.014,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });
  $$('.eyebrow').forEach((el) => gsap.from(el, { autoAlpha: 0, x: -14, duration: 0.6, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
}

function hakkinda() {
  const p = $('[data-hakkinda]');
  const words = p.textContent.split(' ');
  p.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
  const ws = $$('.w', p);
  ScrollTrigger.create({
    trigger: p, start: 'top 80%', end: 'bottom 50%', scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * ws.length);
      ws.forEach((w, i) => w.classList.toggle('is-on', i < n));
    },
  });
  $$('.mano').forEach((m) => {
    const el = $('.mano__val', m);
    const v = Number(el.dataset.count), suf = el.dataset.suffix;
    const f = parseFloat(m.style.getPropertyValue('--f'));
    const o = { v: 0, k: 0 };
    const needle = $('.mano__needle', m), fill = $('.mano__fill', m);
    gsap.set(needle, { rotation: -135, svgOrigin: '80 80' });
    gsap.set(fill, { strokeDashoffset: 1 });
    gsap.to(o, {
      v, k: f, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: m, start: 'top 88%', once: true },
      onUpdate: () => {
        el.textContent = nf.format(Math.round(o.v)) + suf;
        gsap.set(needle, { rotation: -135 + o.k * 270 + Math.sin(o.k * 40) * (1 - o.k / f) * 6, svgOrigin: '80 80' });
        fill.style.strokeDashoffset = 1 - o.k * 0.999;
      },
    });
  });
}

function isler() {
  $$('.is').forEach((row) => {
    gsap.fromTo(row, { '--p': 0 }, {
      '--p': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 90%', end: 'top 45%', scrub: true },
    });
    gsap.from($$('.is__n, .is__body', row), {
      y: 30, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: row, start: 'top 88%', once: true },
    });
  });
}

function cikti() {
  gsap.set(fis, { yPercent: -102 });
  ScrollTrigger.create({
    trigger: '.printer', start: 'top 70%', once: true,
    onEnter: () => {
      gsap.to(fis, { yPercent: 0, duration: 1.8, ease: 'steps(34)' });
    },
  });
}

function surec() {
  const hat = $('.hat'), svg = $('.hat__svg');
  const bg = $('.hat__bg'), fg = $('.hat__fg');
  const steps = $$('.adim');
  let len = 1;
  const layout = () => {
    const r = hat.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    svg.style.height = `${r.height}px`;
    const dots = steps.map((s) => {
      const dr = $('.adim__dot', s).getBoundingClientRect();
      return { x: dr.left + dr.width / 2 - r.left, y: dr.top + dr.height / 2 - r.top };
    });
    let dd = `M ${dots[0].x} 0 L ${dots[0].x} ${dots[0].y}`;
    for (let i = 1; i < dots.length; i++) {
      const a = dots[i - 1], b = dots[i];
      if (Math.abs(a.x - b.x) < 2) dd += ` L ${b.x} ${b.y}`;
      else {
        const my = (a.y + b.y) / 2;
        dd += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
      }
    }
    bg.setAttribute('d', dd);
    fg.setAttribute('d', dd);
    len = fg.getTotalLength();
    fg.style.strokeDasharray = `${len} ${len}`;
    // her durağın hat üzerindeki uzunluğu
    dots.forEach((dt) => {
      let best = 1e9;
      for (let k = 0; k <= 240; k++) {
        const L = (len * k) / 240, P = fg.getPointAtLength(L);
        const dd2 = (P.x - dt.x) ** 2 + (P.y - dt.y) ** 2;
        if (dd2 < best) { best = dd2; dt.L = L; }
      }
    });
    return dots;
  };
  let dots = layout();
  ScrollTrigger.create({
    trigger: hat, start: 'top 65%', end: 'bottom 60%', scrub: 0.5,
    onRefresh: () => (dots = layout()),
    onUpdate(self) {
      const L = len * self.progress;
      fg.style.strokeDashoffset = len - L;
      steps.forEach((s, i) => s.classList.toggle('is-on', L >= dots[i].L - 4));
    },
  });
}

function agirParallax() {
  gsap.fromTo('.agir__img img', { yPercent: -12, scale: 1.15 }, {
    yPercent: 12, scale: 1.02, ease: 'none',
    scrollTrigger: { trigger: '.agir', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

function galeri() {
  const track = $('[data-galeri]');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.galeri', start: 'top 75%', end: 'bottom 15%', scrub: 0.5, invalidateOnRefresh: true },
  });
  $$('.foto').forEach((f, i) => {
    gsap.fromTo(f, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut', delay: Math.min(i, 5) * 0.06,
      scrollTrigger: { trigger: '.galeri', start: 'top 70%', once: true },
    });
  });
}

function yorumlar(lenis) {
  const row = $('[data-yorumlar]');
  gsap.fromTo(row, { x: () => (phone ? 0 : innerWidth * 0.08) }, {
    x: () => -(row.scrollWidth - innerWidth * 0.92), ease: 'none',
    scrollTrigger: { trigger: '.yorumlar', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
  });
  const puan = $('[data-puan]');
  const o = { v: 0 };
  gsap.to(o, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    scrollTrigger: { trigger: puan, start: 'top 88%', once: true },
    onUpdate: () => (puan.textContent = o.v.toFixed(1).replace('.', ',')),
  });
  if (lenis) {
    const skew = gsap.quickTo(row, 'skewX', { duration: 0.4, ease: 'power3' });
    lenis.on('scroll', ({ velocity }) => skew(clamp(-5, 5, -velocity * 0.22)));
  }
}

function marquee(lenis) {
  let x = 0, boost = 0, on = false;
  const half = () => mq.scrollWidth / 2;
  ScrollTrigger.create({ trigger: '.markalar', start: 'top bottom', end: 'bottom top', onToggle: (s) => (on = s.isActive) });
  gsap.ticker.add((_, dt) => {
    if (!on) return;
    x -= (0.7 + boost) * dt * 0.06;
    const h = half();
    if (h && -x > h) x += h;
    if (x > 0) x -= h;
    mq.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    boost *= 0.92;
  });
  lenis?.on('scroll', ({ velocity }) => (boost = clamp(-12, 12, velocity * 0.8)));
}

function son() {
  const mist = $('[data-mist]');
  mist.innerHTML = Array.from({ length: 7 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
  ScrollTrigger.create({ trigger: '.son', start: 'top bottom', end: 'bottom top', toggleClass: { targets: '.son', className: 'is-live' } });
}

function header() {
  const hdr = $('.hdr');
  ScrollTrigger.create({
    start: () => innerHeight * 0.5,
    onUpdate: (self) => hdr.classList.toggle('is-solid', self.scroll() > innerHeight * 0.5),
  });
}

function cursor() {
  if (!fine) return;
  document.documentElement.classList.add('has-cur');
  const cur = $('.cur');
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.18, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.18, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    cur.classList.toggle('is-hot', !!e.target.closest('a, button'));
  });
  $$('.mag').forEach((b) => {
    const bx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
    const by = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      bx((e.clientX - r.left - r.width / 2) * 0.26);
      by((e.clientY - r.top - r.height / 2) * 0.32);
    });
    b.addEventListener('pointerleave', () => { bx(0); by(0); });
  });
}

// ------------------------------------------------------------------ başlat

function staticFallback() {
  if (scene) {
    scene.setProgress(0.62);
    scene.resize();
    scene.render();
  }
  $$('.mano').forEach((m) => {
    const el = $('.mano__val', m);
    el.textContent = nf.format(Number(el.dataset.count)) + el.dataset.suffix;
    const f = parseFloat(m.style.getPropertyValue('--f'));
    $('.mano__needle', m).setAttribute('transform', `rotate(${-135 + f * 270} 80 80)`);
    $('.mano__fill', m).style.strokeDashoffset = 1 - f;
  });
  $$('.adim').forEach((a) => a.classList.add('is-on'));
  const hat = $('.hat__svg');
  hat?.remove();
}

async function start() {
  addEventListener('resize', () => scene?.resize());
  if (reducedMotion) {
    intro.remove();
    staticFallback();
    return;
  }
  const lenis = initSmoothScroll();
  lenis?.stop();
  scrollTo(0, 0);
  buildFilm();
  scene?.render();
  scene?.start();
  await playIntro();
  lenis?.start();
  heroIn();
  kineticHeads();
  hakkinda();
  isler();
  cikti();
  surec();
  agirParallax();
  galeri();
  yorumlar(lenis);
  marquee(lenis);
  son();
  header();
  cursor();
  ScrollTrigger.refresh();
}

document.fonts?.ready.then(start) ?? start();
