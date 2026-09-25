import ana from '../../data/mikron.json';
import ek from '../../data/rektifiye-sinematik2.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

const d = boot({ ...ana, ...ek, preset: 'rektifiye-sinematik2' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const num = (v, dec) => v.toFixed(dec).replace('.', ',');
const nf = new Intl.NumberFormat('tr-TR');
const phone = matchMedia('(max-width: 899px)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
const years = new Date().getFullYear() - d.isletme.kurulus;
if (reducedMotion) document.documentElement.classList.add('is-reduced');

// Yıl ekleri: 1989'dan, 2004'ten
const ablative = (y) => {
  const s = String(y);
  const ones = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const tens = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return ones[s.at(-1)];
  if (s.at(-2) !== '0') return tens[s.at(-2)];
  return "'den";
};

// ------------------------------------------------------------------ içerik
$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = d.garanti || '';
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
big.innerHTML = `<i></i>${esc(st.text)}`;
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
  .map((h, i) => `
  <li class="is" style="--i:${i};--n:${d.hizmetler.length}">
    <span class="is__no">${String(i + 1).padStart(2, '0')}</span>
    <div class="is__body">
      <h3 class="is__ad">${esc(h.baslik)}</h3>
      <p class="is__txt">${esc(h.aciklama)}</p>
    </div>
    <dl class="is__meta">
      ${h.tolerans ? `<div><dt>Tolerans</dt><dd>${esc(h.tolerans)}</dd></div>` : ''}
      ${h.sure ? `<div><dt>Süre</dt><dd>${esc(h.sure)}</dd></div>` : ''}
    </dl>
    <a class="is__wa" href="${esc(waHref(d, `Merhaba, ${h.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum.`))}" target="_blank" rel="noopener">Sor ${icons.whatsapp}</a>
    <span class="is__line" aria-hidden="true"></span>
  </li>`)
  .join('');

// Sayılar
$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const v = s.kurulustanHesapla ? years : s.deger;
    return `<div class="sayi"><p class="sayi__v"><span data-count="${Number(v) || 0}">0</span>${esc(s.sonek || '')}</p><p class="sayi__l">${esc(s.etiket)}</p></div>`;
  })
  .join('');

// Süreç
$('[data-surec]').innerHTML = d.surec
  .map((s, i) => `<li class="adim"><span class="adim__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`)
  .join('');

// Galeri
const gal = [...(d.galeri || []), ...(d.galeriEk || [])];
$('[data-galeri]').innerHTML = gal
  .map((g, i) => `<figure class="kare${i % 3 === 1 ? ' kare--uzun' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`)
  .join('');

// Yorumlar
const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-puan]').textContent = String(d.puan.ortalama).replace('.', ',');
$('[data-stars]').innerHTML = star(Math.round(d.puan.ortalama));
$('[data-puan-adet]').textContent = `${nf.format(d.puan.adet)} değerlendirme`;
$('[data-yorumlar]').innerHTML = d.yorumlar
  .map((y) => `<blockquote class="yorum"><p class="yorum__s" aria-label="${y.puan} yıldız">${star(y.puan)}</p><p class="yorum__m">${esc(y.metin)}</p><footer><b>${esc(y.ad)}</b><span>${esc(y.arac || '')}</span></footer></blockquote>`)
  .join('');

// Motor kodları
const mk = (d.markalar || []).map((m) => `<span>${esc(m)}</span>`).join('<i></i>');
$('[data-marquee]').innerHTML = `<div>${mk}<i></i></div><div aria-hidden="true">${mk}<i></i></div>`;

// ------------------------------------------------------------------ rapor: tolerans bandı
const R = d.rapor;
if (R && R.silindirler?.length) {
  const nom = parseFloat(String(R.nominal).replace(',', '.'));
  const rows = R.silindirler.map((c) => ({
    no: c.no,
    olcu: c.olcu,
    fark: (parseFloat(String(c.olcu).replace(',', '.')) - nom) * 1000, // µm
    ov: parseFloat(String(c.ovalite).replace(',', '.')) * 1000,
    ovs: c.ovalite,
  }));
  const W = 600, H = 340, top = 40, bot = 290, span = 9; // ±9 µm görünür
  const y = (um) => lerp(bot, top, (um + span) / (2 * span));
  const xs = rows.map((_, i) => 110 + (i * (W - 170)) / Math.max(1, rows.length - 1));
  $('[data-bant]').innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Silindir ölçüleri tolerans bandında">
      <defs>
        <linearGradient id="bantG" x1="0" x2="1">
          <stop offset="0" stop-color="#e3b862" stop-opacity=".45"/><stop offset=".5" stop-color="#6b34d4" stop-opacity=".28"/><stop offset="1" stop-color="#2f6bd8" stop-opacity=".4"/>
        </linearGradient>
      </defs>
      <rect class="bant__alan" x="70" y="${y(5)}" width="${W - 100}" height="${y(-5) - y(5)}" fill="url(#bantG)" rx="6"/>
      <line class="bant__nom" x1="70" x2="${W - 30}" y1="${y(0)}" y2="${y(0)}"/>
      ${[-5, 0, 5].map((u) => `<text class="bant__ax" x="60" y="${y(u) + 4}" text-anchor="end">${u > 0 ? '+' : ''}${u}</text>`).join('')}
      <text class="bant__ax bant__ax--u" x="60" y="${top - 18}" text-anchor="end">µm</text>
      <text class="bant__tag" x="${W - 34}" y="${y(-5) + 22}" text-anchor="end">Tolerans ±5 µm</text>
      <text class="bant__tag bant__tag--nom" x="76" y="${top - 18}">Hedef Ø ${esc(R.nominal)}</text>
      ${rows
        .map((r, i) => `
        <g class="bant__pt" style="--d:${i}">
          <line class="bant__ov" x1="${xs[i]}" x2="${xs[i]}" y1="${y(r.fark - r.ov / 2)}" y2="${y(r.fark + r.ov / 2)}"/>
          <circle class="bant__dot" cx="${xs[i]}" cy="${y(r.fark)}" r="9"/>
          <text class="bant__no" x="${xs[i]}" y="${bot + 32}" text-anchor="middle">S${esc(r.no)}</text>
          <text class="bant__v" x="${xs[i]}" y="${y(r.fark) - 20}" text-anchor="middle">${esc(r.olcu)}</text>
        </g>`)
        .join('')}
    </svg>
    <figcaption>Nokta: ölçülen çap. Dikey çizgi: ovalite. ${esc(R.is || '')}</figcaption>`;
  const meta = [
    ['İş', R.is],
    ['Ölçü sınıfı', R.olcuSinifi],
    ['Krank', R.krank],
    ['Planya', R.planya],
  ].filter(([, v]) => v);
  $('[data-rapor-meta]').innerHTML = meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
} else {
  $('.rapor').remove();
}

// ------------------------------------------------------------------ süreç sarmalı (talaş gibi)
{
  const pts = [];
  for (let t = 0; t <= 168; t += 0.25) {
    const x = 50 + 36 * Math.cos(t);
    const yy = t * 5.9 + 22 * Math.sin(t);
    pts.push(`${x.toFixed(1)} ${Math.min(1000, yy).toFixed(1)}`);
  }
  $('[data-spiral]').setAttribute('d', 'M' + pts.join(' L'));
}

// ------------------------------------------------------------------ büyüteç (yüzey)
const yuzeyler = d.yuzeyler || [];
const tabs = $('[data-yuzey-tabs]');
tabs.innerHTML = yuzeyler
  .map((y, i) => `<button type="button" role="tab" class="tab" aria-selected="${i === 0}" data-i="${i}"><span class="tab__sw tab__sw--${esc(y.tip)}"></span>${esc(y.ad)}</button>`)
  .join('');
const lupe = createLupe($('[data-lupe]'), $('.lupe__cv'));
function selectYuzey(i) {
  const y = yuzeyler[i];
  if (!y) return;
  $$('.tab', tabs).forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
  $('[data-yuzey-deger]').textContent = y.deger;
  $('[data-yuzey-metin]').textContent = y.metin;
  lupe.set(y.tip);
}
tabs.addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (b) selectYuzey(Number(b.dataset.i));
});
selectYuzey(0);
if (!fine) $('[data-lupe-hint]').textContent = '· dokunup kaydırın';

function createLupe(fig, cv) {
  const g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, type = 'torna';
  let base = null, mag = null;
  let lx = 0.5, ly = 0.5, tx = 0.5, ty = 0.5, user = false, visible = false, raf = 0, t0 = performance.now();
  const rnd = mulberry(7);

  function mulberry(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function steel(c, w, h, k) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, `hsl(220 8% ${34 + k * 6}%)`);
    gr.addColorStop(0.42, `hsl(220 10% ${80 + k * 4}%)`);
    gr.addColorStop(0.55, `hsl(220 12% ${90}%)`);
    gr.addColorStop(1, `hsl(222 8% ${30 + k * 6}%)`);
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  }
  function paint(c, w, h, s, kind, seed) {
    const r = mulberry(seed);
    steel(c, w, h, s > 1 ? 1 : 0);
    c.lineCap = 'round';
    if (kind === 'torna') {
      const gap = 11 * s;
      for (let x = -gap; x < w + gap; x += gap) {
        const gr = c.createLinearGradient(x, 0, x + gap, 0);
        gr.addColorStop(0, 'rgba(20,22,28,.55)');
        gr.addColorStop(0.35, 'rgba(255,255,255,.35)');
        gr.addColorStop(0.7, 'rgba(40,42,50,.2)');
        gr.addColorStop(1, 'rgba(20,22,28,.55)');
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(x, 0);
        for (let yy = 0; yy <= h; yy += 20) c.lineTo(x + Math.sin(yy * 0.01 + x) * 1.2 * s, yy);
        c.lineTo(x + gap, h);
        c.lineTo(x + gap, 0);
        c.fill();
      }
      for (let i = 0; i < 40 * s; i++) {
        c.fillStyle = `rgba(20,20,26,${0.2 + r() * 0.3})`;
        c.beginPath();
        c.ellipse(r() * w, r() * h, (0.6 + r() * 1.4) * s, (1 + r() * 3) * s, 0, 0, 7);
        c.fill();
      }
    } else if (kind === 'tas') {
      for (let i = 0; i < 2200; i++) {
        const x = r() * w, yy = r() * h, L = (10 + r() * 60) * s;
        c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.16})` : `rgba(30,32,40,${0.04 + r() * 0.12})`;
        c.lineWidth = (0.3 + r() * 0.5) * Math.min(s, 2);
        c.beginPath();
        c.moveTo(x, yy);
        c.lineTo(x + (r() - 0.5) * 3, yy + L);
        c.stroke();
      }
    } else {
      // çapraz hon izi (±30°)
      for (let fam = 0; fam < 2; fam++) {
        const ang = (fam ? 1 : -1) * (Math.PI / 6);
        const dx = Math.tan(ang) * h;
        let x = -Math.abs(dx) - 40;
        while (x < w + Math.abs(dx) + 40) {
          x += (4 + r() * 10) * s;
          const deep = r() < 0.18;
          c.strokeStyle = deep ? 'rgba(18,20,26,.6)' : `rgba(30,32,40,${0.12 + r() * 0.2})`;
          c.lineWidth = (deep ? 1.4 : 0.5) * s;
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x + dx, h);
          c.stroke();
          if (deep) {
            c.strokeStyle = 'rgba(255,255,255,.22)';
            c.lineWidth = 0.6 * s;
            c.beginPath();
            c.moveTo(x + 1.5 * s, 0);
            c.lineTo(x + dx + 1.5 * s, h);
            c.stroke();
          }
        }
      }
    }
  }
  function build() {
    const rect = cv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(10, Math.round(rect.width * dpr));
    H = Math.max(10, Math.round(rect.height * dpr));
    cv.width = W;
    cv.height = H;
    base = document.createElement('canvas');
    base.width = W;
    base.height = H;
    const bc = base.getContext('2d');
    paint(bc, W, H, 0.35 * dpr, type, 3);
    bc.fillStyle = 'rgba(12,12,18,.28)';
    bc.fillRect(0, 0, W, H);
    mag = document.createElement('canvas');
    mag.width = W;
    mag.height = H;
    paint(mag.getContext('2d'), W, H, 1.7 * dpr, type, 5);
    draw();
  }
  function draw() {
    if (!base) return;
    g.clearRect(0, 0, W, H);
    g.drawImage(base, 0, 0);
    const R = Math.min(W, H) * (phone ? 0.34 : 0.3);
    const cx = lx * W, cy = ly * H;
    g.save();
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.clip();
    g.drawImage(mag, 0, 0);
    // cam parlaması
    const gl = g.createRadialGradient(cx - R * 0.4, cy - R * 0.5, 0, cx - R * 0.4, cy - R * 0.5, R * 1.1);
    gl.addColorStop(0, 'rgba(255,255,255,.28)');
    gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gl;
    g.fillRect(cx - R, cy - R, R * 2, R * 2);
    // artı işareti ve ölçek
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = 1 * dpr;
    g.beginPath();
    g.moveTo(cx - 12 * dpr, cy);
    g.lineTo(cx + 12 * dpr, cy);
    g.moveTo(cx, cy - 12 * dpr);
    g.lineTo(cx, cy + 12 * dpr);
    g.stroke();
    g.restore();
    const ring = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    ring.addColorStop(0, '#e3b862');
    ring.addColorStop(0.4, '#b8683a');
    ring.addColorStop(0.7, '#6b34d4');
    ring.addColorStop(1, '#2f6bd8');
    g.lineWidth = 7 * dpr;
    g.strokeStyle = ring;
    g.beginPath();
    g.arc(cx, cy, R + 3 * dpr, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.5 * dpr;
    g.strokeStyle = 'rgba(10,10,16,.6)';
    g.beginPath();
    g.arc(cx, cy, R + 8 * dpr, 0, Math.PI * 2);
    g.stroke();
    // halka üstünde taksimat
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = 1.2 * dpr;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r1 = R - (i % 6 === 0 ? 12 : 6) * dpr;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1));
      g.stroke();
    }
  }
  function tick(now) {
    raf = 0;
    if (!visible) return;
    if (!user) {
      const t = (now - t0) / 1000;
      tx = 0.5 + Math.sin(t * 0.45) * 0.24;
      ty = 0.5 + Math.sin(t * 0.7 + 1) * 0.2;
    }
    const k = reducedMotion ? 1 : 0.12;
    lx += (tx - lx) * k;
    ly += (ty - ly) * k;
    draw();
    if (!reducedMotion) raf = requestAnimationFrame(tick);
  }
  const kick = () => {
    if (!raf && visible) raf = requestAnimationFrame(tick);
  };
  const move = (e) => {
    const r = cv.getBoundingClientRect();
    tx = clamp01((e.clientX - r.left) / r.width);
    ty = clamp01((e.clientY - r.top) / r.height);
    user = true;
    kick();
  };
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || e.buttons) move(e);
  });
  cv.addEventListener('pointerdown', move);
  cv.style.touchAction = 'pan-y';
  cv.addEventListener('pointerleave', () => {
    user = false;
    t0 = performance.now() - 2000;
  });
  new IntersectionObserver((ents) => {
    visible = ents[0].isIntersecting;
    if (visible) {
      if (!base) build();
      kick();
    }
  }).observe(fig);
  let rw = 0;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - rw) < 2) return;
    rw = innerWidth;
    if (base) build();
  });
  rw = innerWidth;
  return {
    set(t) {
      type = t;
      if (base || visible) build();
    },
  };
}

// ------------------------------------------------------------------ hareket
const lenis = initSmoothScroll();

// Başlık kelimeleri
if (!reducedMotion) {
  document.fonts.ready.then(() => {
    $$('[data-split]').forEach((el) => {
      const sp = new SplitText(el, { type: 'words', wordsClass: 'w' });
      gsap.from(sp.words, {
        yPercent: 60, opacity: 0, rotate: 4, duration: 0.8, ease: 'power3.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    ScrollTrigger.refresh();
  });

  $$('.is').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    ScrollTrigger.create({ trigger: el, start: 'top 70%', onEnter: () => el.classList.add('is-on') });
  });
  $$('.yorum').forEach((el, i) => {
    gsap.from(el, { y: 50, opacity: 0, duration: 0.8, delay: (i % 3) * 0.08, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });
  gsap.from('.kare', { opacity: 0, x: 80, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.galeri__track', start: 'top 85%' } });

  // Süreç sarmalı kaydırmayla çizilir
  gsap.fromTo('[data-spiral]', { drawSVG: '0%' }, {
    drawSVG: '100%', ease: 'none',
    scrollTrigger: { trigger: '.surec__wrap', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
  });
  $$('.adim').forEach((el) => {
    gsap.from(el, { x: 30, opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 82%' } });
  });

  // Tolerans bandı: noktalar yukarıdan düşer
  if ($('.bant__pt')) {
    gsap.from('.bant__pt', {
      y: -120, opacity: 0, duration: 0.9, ease: 'bounce.out', stagger: 0.14,
      scrollTrigger: { trigger: '[data-bant]', start: 'top 75%' },
    });
    gsap.from('.bant__alan', { scaleY: 0, transformOrigin: '50% 50%', duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '[data-bant]', start: 'top 78%' } });
  }
}

// Sayaçlar
$$('[data-count]').forEach((el) => {
  const v = Number(el.dataset.count);
  if (reducedMotion) {
    el.textContent = nf.format(v);
    return;
  }
  const o = { v: 0 };
  gsap.to(o, {
    v, duration: 1.8, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
    onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
  });
});

// ------------------------------------------------------------------ film
const film = $('.film');
const chaps = $$('.chap');
const steps = $$('.steps li');
const hudLbl = $('[data-hud-lbl]'), hudVal = $('[data-hud-val]'), hudUnit = $('[data-hud-unit]'), hudBar = $('[data-hud-bar]');
const hud = $('.hud');
const dark = $('.backdrop__dark');
const flash = $('.flash');
const stage = $('.stage');
const WIN = [
  [-1, 0, 0.1, 0.14],
  [0.15, 0.19, 0.36, 0.4],
  [0.43, 0.47, 0.56, 0.6],
  [0.63, 0.67, 0.77, 0.8],
  [0.85, 0.88, 1.2, 1.3],
];
let scene = null;
let filmP = 0;
let lastHud = '';

function applyFilm(p) {
  filmP = p;
  scene?.setProgress(p);
  chaps.forEach((c, i) => {
    const [a, b, e, f] = WIN[i];
    const o = smooth(a, b, p) * (1 - smooth(e, f, p));
    c.style.opacity = o.toFixed(3);
    c.style.transform = `translate3d(0, ${((1 - o) * (p < b ? 40 : -40)).toFixed(1)}px, 0)`;
    c.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    c.classList.toggle('is-on', o > 0.5);
  });
  const act = p < 0.14 ? -1 : p < 0.42 ? 0 : p < 0.61 ? 1 : p < 0.82 ? 2 : 3;
  steps.forEach((s, i) => s.classList.toggle('is-on', i === act));
  steps.forEach((s, i) => s.classList.toggle('is-done', i < act));
  const dk = smooth(0.58, 0.65, p);
  dark.style.opacity = dk.toFixed(3);
  document.documentElement.classList.toggle('is-dark', dk > 0.5 && p < 0.99);
  film.classList.toggle('film--dk', dk > 0.5);
  flash.style.opacity = clamp01(1 - Math.abs(p - 0.805) / 0.022).toFixed(3);

  // HUD
  const hv = smooth(0.12, 0.17, p);
  hud.style.opacity = hv.toFixed(3);
  let lbl, val, unit, bar;
  if (p < 0.42) {
    const feed = smooth(0.13, 0.4, p);
    lbl = feed > 0.01 ? 'Tornada çap' : 'Ham çap';
    val = `Ø ${num(80 - 4.75 * feed, 2)}`;
    unit = 'mm';
    bar = feed;
  } else if (p < 0.61) {
    const pr = smooth(0.44, 0.58, p);
    lbl = 'Numuneye göre';
    val = `${Math.round(pr * 6)}/6`;
    unit = 'kademe · ±0,02 mm';
    bar = pr;
  } else if (p < 0.82) {
    const po = smooth(0.64, 0.78, p);
    lbl = 'Yüzey pürüzü';
    val = `Ra ${num(lerp(3.2, 0.4, po), 1)}`;
    unit = 'µm';
    bar = po;
  } else {
    const t = smooth(0.84, 0.97, p);
    lbl = 'Tolerans';
    val = `±${num(lerp(0.05, 0.005, t), 3)}`;
    unit = 'mm';
    bar = t;
  }
  const key = lbl + val + unit;
  if (key !== lastHud) {
    lastHud = key;
    hudLbl.textContent = lbl;
    hudVal.textContent = val;
    hudUnit.textContent = unit;
  }
  hudBar.style.transform = `scaleX(${bar.toFixed(3)})`;
}

const filmST = ScrollTrigger.create({
  trigger: film,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (s) => applyFilm(s.progress),
});
let filmVis = null, sonST = null;
filmVis = ScrollTrigger.create({
  trigger: film,
  start: 'top bottom',
  end: 'bottom top',
  onToggle: () => setStage(),
});
const son = $('.son');
sonST = ScrollTrigger.create({
  trigger: son,
  start: 'top bottom',
  end: 'bottom top',
  onUpdate: (s) => scene?.setFinal(s.progress),
  onToggle: () => setStage(),
});
function setStage() {
  if (!filmVis || !sonST) return;
  const inFilm = filmVis.isActive || window.scrollY < 10;
  const inSon = sonST.isActive;
  const on = inFilm || inSon;
  stage.classList.toggle('is-off', !on);
  $('.backdrop').classList.toggle('is-off', !on);
  $('.backdrop').classList.toggle('is-final', inSon && !inFilm);
  if (!scene) return;
  if (inSon && !inFilm) scene.setFinal(sonST.progress);
  else scene.setFinal(null);
  if (on && !reducedMotion) scene.start();
  else scene.stop();
  if (on && reducedMotion) scene.renderOnce();
}
applyFilm(0);
setStage();

// Kaydırmada sabit kalan başlık cam efekti
ScrollTrigger.create({
  start: 60,
  onUpdate: (s) => document.documentElement.classList.toggle('is-scrolled', s.scroll() > 60),
});

// Sahne: WebGL yüklenir; sorun olursa sayfa yine çalışır
import('./scene.js')
  .then(({ createScene }) => {
    try {
      scene = createScene(stage, { phone, low });
    } catch (err) {
      stage.remove();
      return;
    }
    scene.jump(filmP);
    addEventListener('resize', () => scene.resize());
    setStage();
    scene.renderOnce();
  })
  .catch(() => stage.remove());

// ------------------------------------------------------------------ açılış
const intro = $('.intro');
function runIntro() {
  if (reducedMotion || new URLSearchParams(location.search).has('nointro')) {
    intro.remove();
    return;
  }
  lenis?.stop();
  document.documentElement.classList.add('is-intro');
  const rpm = { v: 0 };
  const rpmEl = $('[data-rpm]');
  const tl = gsap.timeline({
    onComplete: done,
  });
  tl.from('.ayna', { scale: 0.7, opacity: 0, duration: 0.5, ease: 'power3.out' })
    .from('.intro__name', { y: 20, opacity: 0, duration: 0.5 }, 0.15)
    .fromTo('.ayna__jaw', { attr: { y: -100 } }, { attr: { y: -76 }, duration: 0.45, ease: 'back.in(2)', stagger: 0.04 }, 0.35)
    .to('.ayna__spin', { rotate: 1440, duration: 1.6, ease: 'power2.in', transformOrigin: '50% 50%' }, 0.8)
    .to(rpm, { v: 1450, duration: 1.6, ease: 'power2.in', onUpdate: () => (rpmEl.textContent = nf.format(Math.round(rpm.v / 10) * 10)) }, 0.8)
    .to('.ayna__ring', { stroke: 'url(#tavG)', duration: 0.01 }, 1.7)
    .to(intro, { clipPath: 'circle(0% at 50% 50%)', duration: 0.8, ease: 'power3.inOut' }, 2.3)
    .from('.chap--hero > *', { y: 30, opacity: 0, stagger: 0.07, duration: 0.7, ease: 'power3.out' }, 2.65)
    .from('.hdr', { y: -30, opacity: 0, duration: 0.6 }, 2.7);
  let finished = false;
  function done() {
    if (finished) return;
    finished = true;
    intro.remove();
    document.documentElement.classList.remove('is-intro');
    lenis?.start();
  }
  intro.addEventListener('click', () => {
    tl.progress(1);
    done();
  });
  setTimeout(() => {
    if (!finished) {
      tl.progress(1);
      done();
    }
  }, 6000);
}
runIntro();
