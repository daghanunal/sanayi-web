import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const years = new Date().getFullYear() - d.isletme.kurulus;
const NS = 'http://www.w3.org/2000/svg';

// "1996'dan", "2004'ten": okunuşun son kelimesine göre ayrılma eki
function ablative(n) {
  const ones = n % 10;
  const tens = Math.floor(n / 10) % 10;
  const byOnes = ['', "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const byTens = ['', "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (ones) return byOnes[ones];
  if (tens) return byTens[tens];
  return "'den";
}

// --- Metin ve linkler ----------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${d.isletme.kurulus}${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = years;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = `Ölçeriz, gösteririz, onayınızla başlarız. ${d.garanti}`;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
const big = $('[data-tel-big]');
big.href = telHref(d);
big.textContent = d.iletisim.telefon;
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
$('[data-maps]').href = mapsHref(d);

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
// Telefonda üst çubukta kısa hâli
const topChip = $('.top .chip');
topChip.innerHTML = `<span class="chip__l">${esc(st.text)}</span><span class="chip__s">${st.open ? 'Açık' : 'Kapalı'}</span>`;

// Teknik föy: noktalı çizgili değer satırları
$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const val = i === 0 && /yıl/.test(s.etiket) ? years : s.deger;
    return `<div class="sheet__row"><dt>${esc(s.etiket)}</dt><span class="sheet__dots" aria-hidden="true"></span><dd><span data-count="${val}">${nf.format(val)}</span>${esc(s.sonek)}</dd></div>`;
  })
  .join('');

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h, i) => `<li class="part">
      <span class="part__no mono">MK-${String(i + 1).padStart(2, '0')}</span>
      <h3 class="part__t">${esc(h.baslik)}</h3>
      <p class="part__d">${esc(h.aciklama)}</p>
      <p class="part__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
      <span class="part__rule" aria-hidden="true"></span>
    </li>`
  )
  .join('');

const hexPts = (r, cx = 0, cy = 0) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

$('[data-process]').innerHTML = d.surec
  .map(
    (s, i) => `<li class="step">
      <svg class="step__nut" viewBox="-50 -50 100 100" aria-hidden="true">
        <polygon points="${hexPts(46)}" /><circle r="20" /><text y="11">${i + 1}</text>
      </svg>
      <h3 class="step__t">${esc(s.baslik)}</h3>
      <p class="step__d">${esc(s.aciklama)}</p>
    </li>`
  )
  .join('');

// Galeri: kendi fotoğraflarımız + işletmenin galerisi
const shots = [
  { src: asset('/img/motor-klasik2/atolye.jpg'), alt: 'Motor bölmesinin başında çalışan usta' },
  { src: asset('/img/motor-klasik2/temizlik.jpg'), alt: 'Eksantrik mili bezle temizleniyor' },
  ...d.galeri.filter((g) => /lift|eller/.test(g.src)),
  { src: asset('/img/motor-klasik2/anahtar.jpg'), alt: 'Külbütör mekanizmasında anahtarla çalışan usta' },
].slice(0, 5);
$('[data-gallery]').innerHTML = shots
  .map((g, i) => `<figure class="shot shot--${i + 1}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>`)
  .join('');

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${icons.star.repeat(Math.round(n))}</span>`;
$('[data-rating]').innerHTML = `
  <p class="score__n">${esc(String(d.puan.ortalama).replace('.', ','))}</p>
  <div>${stars(5)}<p class="score__c mono">${nf.format(d.puan.adet)} Google yorumu</p></div>`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y, i) => `<li class="tag" style="--r:${[-2.5, 1.8, -1.2, 2.4, -1.8][i % 5]}deg">
      <span class="tag__hole" aria-hidden="true"></span>
      <p class="tag__car">${esc(y.arac)}</p>
      ${stars(y.puan)}
      <blockquote class="tag__q">${esc(y.metin)}</blockquote>
      <p class="tag__who mono">${esc(y.ad)}</p>
    </li>`
  )
  .join('');

const run = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="brands__track"><div>${run}<i aria-hidden="true"></i></div><div aria-hidden="true">${run}<i></i></div></div>`;

$('[data-hours]').innerHTML = `<caption class="sr-only">Çalışma saatleri</caption><tbody>${groupedHours(d.saatler)
  .map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`)
  .join('')}</tbody>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '500px' }).observe(mapBox);

// --- Conta (hero imzası) -------------------------------------------------
// Conta kendi eksenlerinde çizilir: u = boy (silindir sırası), v = en.
// Masaüstünde yatay, telefonda dikey yerleşir; telefonda kaydırınca yukarı kayar.

const heroEl = $('.hero');
const svg = $('.gasket');
const plane = $('.gasket__plane');
const sheet = $('.gasket__sheet');
const beads = $('.gasket__beads');
const boltsG = $('.gasket__bolts');
const readBolt = $('[data-bolt]');
const readStage = $('[data-stage]');
const readBar = $('.readout__bar i');

// 10 cıvatalı kapak için ortadan dışa doğru sarmal sıkma sırası (üst sıra, alt sıra)
const ORDER = [[9, 5, 1, 3, 7], [8, 4, 2, 6, 10]];
const circle = (x, y, r) => `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;

function geometry() {
  const W = heroEl.clientWidth;
  const H = heroEl.clientHeight;
  const vertical = W < 700;
  let R, cx, cy;
  if (vertical) {
    R = Math.min(W * 0.2, 96);
    cx = W / 2;
    cy = H * 0.54 + 1.5 * R * 2.36; // sütun ortası
  } else {
    // Conta giriş metninin altında kalan alana oturur (butonlara ve alt kenara değmez)
    const intro = $('.hero__intro');
    const top = Math.min(intro.offsetTop + intro.offsetHeight + 16, H * 0.6);
    const bottom = H - 40;
    R = Math.min(W * 0.08, H * 0.13, (bottom - top) / 3.5);
    cx = W / 2;
    cy = (top + bottom) / 2;
  }
  const P = R * 2.36;
  const at = (u, v) => (vertical ? [cx + v, cy + u] : [cx + u, cy + v]);
  const pan = vertical ? H * 0.52 - cy : 0;
  return { W, H, R, P, at, pan, vertical };
}

let g;
function drawGasket() {
  g = geometry();
  const { W, H, R, P, at } = g;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let dPath = `M${-W * 6} ${-H * 6}h${W * 13}v${H * 13}h${-W * 13}Z`;
  let ring = '';
  g.bores = [];
  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) * P;
    const [x, y] = at(u, 0);
    g.bores.push([x, y]);
    dPath += circle(x, y, R);
    ring += `<circle class="fire" cx="${x}" cy="${y}" r="${R * 1.035}" stroke-width="${R * 0.07}"/>`;
    ring += `<circle class="bead" cx="${x}" cy="${y}" r="${R * 1.2}"/>`;
    // su kanalları ve yağ delikleri
    for (const s of [-1, 1]) {
      const [wx, wy] = at(u + s * R * 0.62, R * 1.22);
      const [ox, oy] = at(u - s * R * 0.62, -R * 1.22);
      dPath += circle(wx, wy, R * 0.075) + circle(ox, oy, R * 0.06);
    }
  }
  sheet.setAttribute('d', dPath);
  beads.innerHTML = ring;

  let bolts = '';
  ORDER.forEach((row, side) => {
    row.forEach((n, j) => {
      const u = (j - 2) * P;
      const v = (side ? 1 : -1) * R * 1.46;
      const [x, y] = at(u, v);
      const [lx, ly] = g.vertical ? at(u, v + (side ? 1 : -1) * R * 0.4) : at(u + R * 0.34, v);
      bolts += `<g class="bolt" data-n="${n}">
        <circle class="bolt__well" cx="${x}" cy="${y}" r="${R * 0.21}"/>
        <g class="bolt__head" data-x="${x}" data-y="${y}">
          <polygon points="${hexPts(R * 0.16, x, y)}"/>
          <rect class="bolt__paint" x="${x - R * 0.03}" y="${y - R * 0.15}" width="${R * 0.06}" height="${R * 0.3}"/>
        </g>
        <text class="bolt__n" x="${lx}" y="${ly + R * 0.06}" text-anchor="${g.vertical ? 'middle' : 'start'}" font-size="${Math.max(11, R * 0.16)}">${n}</text>
      </g>`;
    });
  });
  boltsG.innerHTML = bolts;
}

const view = { p: 0, z: 1 };
function applyView() {
  const [bx, by0] = g.bores[1];
  const pp = view.p * g.pan;
  const by = by0 + pp;
  plane.setAttribute('transform',
    `translate(${bx} ${by}) scale(${view.z}) translate(${-bx} ${-by}) translate(0 ${pp})`);
}

let heroTl;
function buildHero() {
  heroTl?.scrollTrigger?.kill();
  heroTl?.kill();
  drawGasket();
  view.p = 0;
  view.z = 1;
  applyView();

  const bolts = $$('.bolt', boltsG).sort((a, b) => a.dataset.n - b.dataset.n);
  const heads = bolts.map((b) => $('.bolt__head', b));
  const svgO = (h) => `${h.dataset.x} ${h.dataset.y}`;

  if (reducedMotion) {
    heads.forEach((h) => gsap.set(h, { rotation: 180, svgOrigin: svgO(h) }));
    bolts.forEach((b) => b.classList.add('is-tight'));
    readBolt.textContent = '10';
    readStage.textContent = 'Tork tamam';
    readBar.style.transform = 'scaleX(1)';
    return;
  }

  const { W, H, R } = g;
  const zoomTo = (Math.hypot(W, H) / R) * 0.62 + 1;
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to('.hero__intro', { opacity: 0, y: -80, duration: 1, ease: 'power2.in' }, 0.25)
    .fromTo('.hero__mid', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 1.1)
    .to('.hero__mid', { opacity: 0, y: -40, duration: 0.6, ease: 'power2.in' }, 6.5)
    .to(view, { p: 1, duration: 6.4, ease: 'power1.inOut', onUpdate: applyView }, 0);
  bolts.forEach((b, i) => {
    const t = 0.7 + i * 0.5;
    tl.to(heads[i], { rotation: 90, svgOrigin: svgO(heads[i]), duration: 0.42, ease: 'power2.out' }, t)
  });
  tl.to(heads, { rotation: 180, duration: 0.8, ease: 'power2.inOut', stagger: 0.02 }, 5.9)
    .to(view, { z: zoomTo, duration: 2, ease: 'power3.in', onUpdate: applyView }, 7)
    .fromTo('.hero__photo img', { scale: 1.18 }, { scale: 1, duration: 9, ease: 'none' }, 0)
    .to('.readout', { opacity: 0, y: 20, duration: 0.5 }, 7.6)
    .fromTo('.hero__inside', { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 8.7)
    .to({}, { duration: 0.9 });

  const stageAt = (t) =>
    t < 5.8 ? '1. aşama · 30 Nm' : t < 6.8 ? '2. aşama · +90°' : 'Tork tamam';
  const small = g.vertical;
  // Gösterge zaman çizelgesinden beslenir (scrub gecikmesiyle birlikte güncel kalır)
  let lastDone = -1;
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    const done = t < 0.9 ? 0 : Math.min(10, Math.floor((t - 0.9) / 0.5) + 1);
    readStage.textContent = stageAt(t);
    readBar.style.transform = `scaleX(${Math.min(1, t / 6.7)})`;
    if (done === lastDone) return;
    lastDone = done;
    readBolt.textContent = String(done).padStart(2, '0');
    bolts.forEach((b, i) => b.classList.toggle('is-tight', i < done));
  });
  tl.scrollTrigger = ScrollTrigger.create({
    trigger: heroEl,
    start: 'top top',
    end: small ? '+=300%' : '+=260%',
    pin: true,
    scrub: 0.5,
    animation: tl,
    refreshPriority: 1, // yeniden kurulunca da diğer tetikleyicilerden önce hesaplansın
  });
  heroTl = tl;
}

// --- Hareket -------------------------------------------------------------

const lenis = initSmoothScroll();
buildHero();

let lastW = innerWidth;
let rt;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - lastW) < 2) return;
  lastW = innerWidth;
  clearTimeout(rt);
  rt = setTimeout(() => { buildHero(); ScrollTrigger.refresh(); }, 180);
});

if (reducedMotion) {
  document.documentElement.classList.add('no-motion');
} else {
  const split = new SplitText('.hero__title', { type: 'words,chars', charsClass: 'ch' });
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from('.hero__photo img', { opacity: 0, duration: 1.2 }, 0)
    .from('.gasket', { opacity: 0, scale: 1.04, transformOrigin: '50% 60%', duration: 1.1 }, 0)
    .from(split.chars, { y: 40, opacity: 0, duration: 0.9, stagger: 0.03 }, 0.2)
    .from(['.hero__since', '.hero__slogan', '.hero__actions', '.readout'], { opacity: 0, y: 20, duration: 0.8, stagger: 0.08 }, 0.55)
    .from('.gasket__bolts', { opacity: 0, duration: 0.8 }, 0.6);

  // Sayılar
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    gsap.to(obj, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => (el.textContent = nf.format(Math.round(obj.v))),
    });
  });
  gsap.from('.sheet__dots', {
    scaleX: 0, transformOrigin: '0 50%', duration: 1, ease: 'power2.out', stagger: 0.1,
    scrollTrigger: { trigger: '.sheet', start: 'top 85%' },
  });

  // Parça listesi: kırmızı çizgi soldan sağa
  $$('.part').forEach((p) => {
    gsap.fromTo($('.part__rule', p), { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 90%', end: 'top 55%', scrub: true },
    });
    gsap.from(p, { opacity: 0, x: -24, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 88%' } });
  });

  // Tam genişlik bant: kapak aralanır gibi açılır
  gsap.fromTo('.band__frame', { clipPath: 'inset(42% 0% 42% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: '.band', start: 'top 90%', end: 'top 25%', scrub: true },
  });
  gsap.fromTo('.band__img', { scale: 1.25 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Süreç: somun çeyrek tur döner
  $$('.step').forEach((s) => {
    gsap.fromTo($('.step__nut polygon', s), { rotation: -60, svgOrigin: '0 0' }, {
      rotation: 0, svgOrigin: '0 0', duration: 0.9, ease: 'back.out(1.8)',
      scrollTrigger: { trigger: s, start: 'top 80%', onEnter: () => s.classList.add('is-on') },
    });
  });

  // Galeri
  $$('.shot').forEach((s) => {
    gsap.fromTo(s, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut',
      scrollTrigger: { trigger: s, start: 'top 88%' },
    });
    gsap.fromTo($('img', s), { scale: 1.2 }, {
      scale: 1, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: s, start: 'top 88%' },
    });
  });

  // Anahtar etiketleri çiviye asılınca sallanır
  gsap.from('.tag', {
    rotation: (i) => (i % 2 ? 14 : -14), y: -30, opacity: 0, transformOrigin: '50% 18px',
    duration: 1.6, ease: 'elastic.out(1, 0.35)', stagger: 0.08,
    scrollTrigger: { trigger: '.tags__row', start: 'top 85%' },
  });

  const ctaSplit = new SplitText('.cta__h', { type: 'words,chars', charsClass: 'ch' });
  gsap.from(ctaSplit.chars, {
    y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.015,
    scrollTrigger: { trigger: '.cta', start: 'top 72%' },
  });
}

// Üst çubuk: contadan çıkınca alüminyum zemine geçer
const topBar = $('.top');
ScrollTrigger.create({
  trigger: '.spec', start: 'top 70px',
  onEnter: () => topBar.classList.add('is-solid'),
  onLeaveBack: () => topBar.classList.remove('is-solid'),
});

window.addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => { if (!g.vertical) buildHero(); ScrollTrigger.refresh(); });
void lenis;
