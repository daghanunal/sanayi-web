import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, groupedHours, icons, esc, GUNLER,
} from '../../shared/core.js';
import {
  LAMBALAR, lambaHTML, kadranHTML, KADRAN_BASLANGIC, KADRAN_SUPURME,
  segHTML, segSet, sigortaHTML,
} from './gfx.js';

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// --- Künye yardımcıları --------------------------------------------------------
// Saat biçimi "08.30–19.00"; ek, saatin okunuşuna göre: 08.30'da, 17.00'de, 19.00'da.
const EK = { b: ['', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'], o: ['', 'da', 'de', 'da', 'ta', 'de'] };
const saatEki = (t) => {
  const [h, m] = t.split(':').map(Number);
  const n = m || h;
  return (n % 10 ? EK.b[n % 10] : EK.o[Math.floor(n / 10) % 10]) || 'da';
};
const saat = (s) => s.replace(/:/g, '.').replace(/\s*[-–]\s*/, '–');
const dk = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function durum(saatler, now = new Date()) {
  const g = now.getDay();
  const bugun = saatler[g];
  const simdi = now.getHours() * 60 + now.getMinutes();
  if (bugun) {
    const [ac, kapa] = bugun.split('-');
    if (simdi >= dk(ac) && simdi < dk(kapa)) return { open: true, durum: 'Şu an açık', saat: `Bugün ${saat(bugun)}` };
    if (simdi < dk(ac)) return { open: false, durum: 'Şu an kapalı', saat: `Bugün ${saat(bugun)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const s = saatler[(g + i) % 7];
    if (!s) continue;
    const ac = s.split('-')[0];
    return { open: false, durum: bugun ? 'Şu an kapalı' : 'Bugün kapalı', saat: `${i === 1 ? 'Yarın' : GUNLER[(g + i) % 7]} ${saat(ac)}'${saatEki(ac)} açılır` };
  }
  return { open: false, durum: 'Kapalı', saat: '' };
}
const saatListesi = (s) => groupedHours(s).map(([g, h]) => [g.replace(' – ', '–'), h === 'Kapalı' ? h : saat(h)]);
const kisaAdres = (a) => a.replace(/,\s*Etimesgut\s*\/\s*Ankara\s*$/i, '');
// "2001'den", "1994'ten", "1990'dan": yılın okunuşuna göre ayrılma eki.
function denEki(n) {
  const s = String(n);
  const son = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const onlar = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return s + son[s.at(-1)];
  if (s.at(-2) !== '0') return s + onlar[s.at(-2)];
  return s + "'den";
}

// Meta açıklama sloganı değil künyeyi anlatsın.
$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const bolt = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 2 4 13.5h6.5L9 22l10-12.5h-6.6z"/></svg>`;
const st = durum(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = d.saatler.filter(Boolean).length;

// --- Üst bar ---------------------------------------------------------------

$('#topbar').innerHTML = `
  <a class="brand" href="#hero">${bolt}<span>${ad}</span></a>
  <nav class="topnav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status" data-status><i class="led"></i><span data-long></span><span data-short></span></p>
  <a class="topbar__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Hero: künye + gösterge paneli ------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__panel">
    <div class="hero__copy">
      <h1 id="hero-title" class="hero__title">${ad}</h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="status" data-status data-kunye><i class="led"></i><span data-long></span></dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__actions">
        <a class="btn btn--go" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
    <div class="cluster" aria-hidden="true">
      ${kadranHTML({ id: 'devir', max: 8, adim: 1, birim: 'x1000', etiket: 'dev/dk' })}
      <div class="cluster__center">
        <ul class="lamps">${LAMBALAR.map(lambaHTML).join('')}</ul>
        <p class="readout" data-readout>Kontak kapalı</p>
      </div>
      ${kadranHTML({ id: 'hiz', max: 240, adim: 40, birim: 'km/s', etiket: 'hız' })}
    </div>
  </div>`;

// --- Hizmetler: sigorta kutusu -------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <h2 class="h2" data-power>Hizmetler</h2>
      <p class="lead">Süreler ortalamadır. Fiyat ve randevu için arayın.</p>
    </header>
    <div class="fusebox">
      <ol class="fusebox__grid">
        ${d.hizmetler.map((h) => `
          <li class="slot">
            <div class="slot__fuse">${sigortaHTML(h.sigorta)}</div>
            <div class="slot__text">
              <h3>${esc(h.baslik)}</h3>
              <p>${esc(h.aciklama)}</p>
              <span class="slot__time">${esc(h.sure)}</span>
            </div>
          </li>`).join('')}
        <li class="slot slot--extra">
          <div class="slot__fuse" aria-hidden="true"><svg class="puller" viewBox="0 0 60 84"><path d="M18 4h24v10l-4 4v58a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V18l-4-4z"/><path d="M24 30h12M24 38h12M24 46h12" /></svg></div>
          <div class="slot__text">
            <h3>Diğer elektrik işleri</h3>
            <p>Cam motoru, merkezi kilit, park sensörü, geri görüş kamerası ve korna arızaları.</p>
            <a class="slot__link" href="${waHref(d, `Merhaba ${d.isletme.ad}, aracımın elektriğiyle ilgili bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp ile bilgi</span></a>
          </div>
        </li>
      </ol>
    </div>
  </div>`;

// --- Hakkında ------------------------------------------------------------------

const METRE_HANE = 3;
const olcumler = [
  { deger: yas, birim: 'YIL', etiket: "Şaşmaz Oto Sanayi Sitesi'nde" },
  { deger: acikGun, birim: 'GÜN', etiket: 'haftada açık' },
];
$('#hakkinda').innerHTML = `
  <div class="wrap">
    <div class="about__grid">
      <div class="about__text">
        <h2 class="h2" data-power>Hakkında</h2>
        <p class="lead lead--ink">${denEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
        <dl class="facts">
          ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
          ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
        </dl>
      </div>
      <figure class="about__photo">
        <img src="${import.meta.env.BASE_URL}img/devre/usta.jpg" alt="Arıza tespit tabletiyle araç kontrolü" width="1400" height="933" loading="lazy" decoding="async" />
      </figure>
    </div>
    <ul class="meters">
      ${olcumler.map((s) => `
        <li class="meter">
          <div class="meter__body">
            <div class="meter__lcd">
              <div class="meter__digits" data-seg="${s.deger}" role="img" aria-label="${s.deger} ${s.birim === 'YIL' ? 'yıldır' : 'gün'} ${esc(s.etiket)}">${segHTML(METRE_HANE)}</div>
              <span class="meter__unit">${s.birim}</span>
            </div>
            <div class="meter__knob" aria-hidden="true"><i></i></div>
          </div>
          <p class="meter__label">${esc(s.etiket)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap shop__grid">
    <div class="shop__info">
      <h2 class="h2" data-power>Çalışma saatleri ve konum</h2>
      <p class="status status--big" data-status><i class="led"></i><span data-long></span></p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${g}</th><td>${s}</td></tr>`).join('')}</tbody>
      </table>
      <address>${esc(d.iletisim.adres)}</address>
      <div class="shop__actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line-ink" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------

const yildiz = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}${`<span class="off">${icons.star}</span>`.repeat(5 - n)}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <h2 class="h2" data-power>Örnek yorumlar</h2>
      <p class="lead">Tasarım örneğidir; işletmenin gerçek yorumları buraya gelir.</p>
    </header>
    <ul class="cards" data-lenis-prevent-touch>
      ${d.yorumlar.map((y) => `
        <li class="card">
          ${yildiz(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="card__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap cta__inner">
    <h2 class="h2" data-power>İletişim</h2>
    <p class="lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="cta__actions">
      <a class="btn btn--go btn--xl" data-wire-end href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--ink btn--wa btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="cta__note">${esc(d.iletisim.adres)}<br><span data-status><span data-long></span></span></p>
  </div>`;

$('#footer').innerHTML = `
  <div class="footer__inner">
    <p class="brand">${bolt}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a></p>
    <p class="footer__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar: Pexels, temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Açık/kapalı durumu ----------------------------------------------------

function refreshStatus() {
  const s = durum(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = `${s.durum} · ${'kunye' in el.dataset ? s.saat.replace(/^Bugün /, '') : s.saat}`;
    const short = el.querySelector('[data-short]');
    if (short) short.textContent = s.open ? 'Açık' : 'Kapalı';
  });
  return s;
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// ===========================================================================
// Hareket
// ===========================================================================

const lenis = initSmoothScroll();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader($('#topbar'), { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Gösterge paneli: kontak testi (bir kez, kaydırmayı kilitlemez) ----------

const hero = $('#hero');
const lamps = $$('.lamp', hero);
const readout = $('[data-readout]');
const needle = (id) => $(`#${id} [data-needle]`);
const angle = (v, max) => KADRAN_BASLANGIC + KADRAN_SUPURME * Math.min(1, Math.max(0, v / max));
gsap.set([needle('devir'), needle('hiz')], { rotation: KADRAN_BASLANGIC, svgOrigin: '100 100' });
const readoutText = () => {
  readout.textContent = st.durum;
  readout.dataset.tone = st.open ? 'ok' : 'warn';
};

if (reducedMotion) {
  readoutText();
  gsap.set(needle('devir'), { rotation: angle(0.9, 8) });
} else {
  // Gerçek araçtaki gibi: kontak açılınca bütün lambalar yanar, ibreler sonuna kadar gidip döner, lambalar söner.
  const intro = gsap.timeline({ delay: 0.35, onComplete: readoutText });
  intro.call(() => (readout.textContent = 'Kontak açık'));
  lamps.forEach((l, i) => intro.call(() => l.classList.add('on'), null, 0.1 + i * 0.05));
  intro.to([needle('devir'), needle('hiz')], { rotation: KADRAN_BASLANGIC + KADRAN_SUPURME, duration: 0.7, ease: 'power2.inOut' }, 0.15);
  intro.to(needle('hiz'), { rotation: KADRAN_BASLANGIC, duration: 0.6, ease: 'power2.inOut' }, 0.95);
  intro.to(needle('devir'), { rotation: angle(0.9, 8), duration: 0.6, ease: 'power2.inOut' }, 0.95);
  intro.call(() => lamps.forEach((l) => l.classList.remove('on')), null, 1.4);
  intro.from('.hero__copy > *', { autoAlpha: 0, y: 16, stagger: 0.05, duration: 0.5, ease: 'power3.out', clearProps: 'all' }, 0);
  // Rölanti titremesi
  gsap.to(needle('devir'), { rotation: `+=${KADRAN_SUPURME * 0.012}`, duration: 0.09, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2 });
}

// --- Kablo demeti -------------------------------------------------------

const board = $('#board');
const svg = $('#harness');
const sections = $$('.sec', board);
const WIRES = [
  { cls: 'w-blue', o: -1 },
  { cls: 'w-red', o: 0 },
  { cls: 'w-yellow', o: 1 },
];
let harness = null;
const powered = new Set();

// Ortogonal çizgiyi (yalnızca yatay/dikey parçalar) o kadar paralel kaydırır.
function offsetPolyline(pts, o) {
  const segs = pts.slice(1).map((p, i) => {
    const a = pts[i];
    const dx = Math.sign(p[0] - a[0]), dy = Math.sign(p[1] - a[1]);
    return { dx, dy, off: dx === 0 ? a[0] - o * dy : a[1] + o * dx };
  });
  const out = [];
  const first = segs[0];
  out.push(first.dx === 0 ? [first.off, pts[0][1]] : [pts[0][0], first.off]);
  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1], next = segs[i];
    out.push(prev.dx === 0 ? [prev.off, next.off] : [next.off, prev.off]);
  }
  const last = segs.at(-1);
  const end = pts.at(-1);
  out.push(last.dx === 0 ? [last.off, end[1]] : [end[0], last.off]);
  return out;
}

// Köşeleri yuvarlatılmış yol ve scroll anahtar kareleri (işaretçi y → yol uzunluğu).
function roundedPath(pts, r, slack) {
  let dStr = `M${pts[0][0]} ${pts[0][1]}`;
  let len = 0;
  let cur = pts[0];
  const keys = [[pts[0][1], 0]];
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  for (let i = 1; i < pts.length; i++) {
    const c = pts[i];
    if (i === pts.length - 1) {
      len += dist(cur, c);
      dStr += `L${c[0]} ${c[1]}`;
      const horiz = cur[1] === c[1];
      keys.push([horiz ? c[1] + slack : c[1], len]);
      break;
    }
    const p = pts[i - 1], n = pts[i + 1];
    const dp = [Math.sign(c[0] - p[0]), Math.sign(c[1] - p[1])];
    const dn = [Math.sign(n[0] - c[0]), Math.sign(n[1] - c[1])];
    const rr = Math.min(r, dist(p, c) / 2, dist(c, n) / 2);
    const a = [c[0] - dp[0] * rr, c[1] - dp[1] * rr];
    const b = [c[0] + dn[0] * rr, c[1] + dn[1] * rr];
    len += dist(cur, a);
    const sweep = dp[0] * dn[1] - dp[1] * dn[0] > 0 ? 1 : 0;
    dStr += `L${a[0]} ${a[1]}A${rr} ${rr} 0 0 ${sweep} ${b[0]} ${b[1]}`;
    const arc = (Math.PI * rr) / 2;
    const intoHoriz = dn[1] === 0, outOfHoriz = dp[1] === 0;
    const ky = intoHoriz ? c[1] - slack : outOfHoriz ? c[1] + slack : c[1];
    keys.push([ky, len + arc / 2]);
    len += arc;
    cur = b;
  }
  for (let i = 1; i < keys.length; i++) keys[i][0] = Math.max(keys[i][0], keys[i - 1][0] + 1);
  return { d: dStr, len, keys };
}

function lengthAt(keys, y) {
  if (y <= keys[0][0]) return 0;
  for (let i = 1; i < keys.length; i++) {
    if (y <= keys[i][0]) {
      const [y0, l0] = keys[i - 1], [y1, l1] = keys[i];
      return l0 + ((y - y0) / (y1 - y0)) * (l1 - l0);
    }
  }
  return keys.at(-1)[1];
}

function buildHarness() {
  const W = board.clientWidth;
  const H = board.offsetHeight;
  const desk = W >= 900;
  const gap = desk ? 7 : 5;
  const xL = desk ? 56 : 20, xR = W - 56;
  const r = desk ? 44 : 16;

  $$('.terminal', board).forEach((t) => t.remove());
  const nodes = sections.map((sec) => {
    const side = desk ? sec.dataset.side : 'left';
    const x = side === 'right' ? xR : xL;
    const y = sec.offsetTop + (desk ? 76 : 58);
    const t = document.createElement('span');
    t.className = 'terminal';
    t.style.left = `${x}px`;
    t.style.top = `${y}px`;
    board.append(t);
    return { x, y, sec, t };
  });
  // Son bölümdeki "Ara" düğmesi kablonun bittiği yer.
  const endBtn = $('[data-wire-end]');
  const bRect = endBtn.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const end = [bRect.left - boardRect.left, bRect.top - boardRect.top + bRect.height / 2];

  const pts = [[nodes[0].x, 0]];
  nodes.forEach((n, i) => {
    const prev = pts.at(-1);
    if (prev[0] !== n.x) {
      const m = n.y - (desk ? 110 : 80);
      pts.push([prev[0], m], [n.x, m]);
    }
    if (i === nodes.length - 1) pts.push([n.x, end[1]], end);
  });
  const clean = pts.filter((p, i) => {
    const a = pts[i - 1], b = pts[i + 1];
    if (!a || !b) return true;
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  const slack = desk ? 70 : 40;
  const wires = WIRES.map((w) => ({ ...w, ...roundedPath(offsetPolyline(clean, w.o * gap), r - w.o * gap, slack) }));
  svg.innerHTML = `
    ${wires.map((w) => `<path class="wire-shadow" d="${w.d}"/>`).join('')}
    ${wires.map((w) => `<path class="wire ${w.cls}" d="${w.d}" stroke-dasharray="${w.len} ${w.len}" stroke-dashoffset="${w.len}"/>`).join('')}
    <g class="spark"><circle class="spark__halo" r="14"/><circle class="spark__core" r="4"/></g>`;
  $$('.wire', svg).forEach((el, i) => (wires[i].el = el));
  $$('.wire-shadow', svg).forEach((el, i) => el.setAttribute('stroke-dasharray', `${wires[i].len} ${wires[i].len}`) || (wires[i].shadow = el));
  harness = { wires, nodes, spark: $('.spark', svg), red: wires[1], endY: end[1] };
  updateHarness();
}

function updateHarness() {
  if (!harness) return;
  const boardTop = board.getBoundingClientRect().top;
  const marker = innerHeight * (innerWidth < 900 ? 0.7 : 0.64) - boardTop;
  for (const w of harness.wires) {
    const l = reducedMotion ? w.len : Math.min(w.len, lengthAt(w.keys, marker));
    const off = w.len - l;
    w.el.style.strokeDashoffset = off;
    w.shadow.style.strokeDashoffset = off;
    w.drawn = l;
  }
  const red = harness.red;
  const done = red.drawn >= red.len - 1;
  if (red.drawn > 2 && !done && !reducedMotion) {
    const p = red.el.getPointAtLength(red.drawn);
    harness.spark.style.transform = `translate(${p.x}px, ${p.y}px)`;
    harness.spark.style.opacity = 1;
  } else {
    harness.spark.style.opacity = 0;
  }
  harness.nodes.forEach((n) => {
    if (n.y <= marker || reducedMotion) power(n);
    n.t.classList.toggle('is-live', powered.has(n.sec.id));
  });
  document.body.classList.toggle('circuit-closed', done);
}

// --- Bölüm "enerji geldi" -------------------------------------------------

const onPower = {
  hakkinda: (sec) => {
    $$('[data-seg]', sec).forEach((el, i) => {
      const target = Number(el.dataset.seg);
      if (reducedMotion) return segSet(el, target, METRE_HANE);
      const o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.2, delay: 0.15 * i, ease: 'power2.out', onUpdate: () => segSet(el, o.v, METRE_HANE) });
    });
  },
  hizmetler: (sec) => {
    if (reducedMotion) return;
    gsap.fromTo($$('.slot__fuse svg', sec), { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.2)' });
  },
};

function power(n) {
  const sec = n.sec;
  if (powered.has(sec.id)) return;
  powered.add(sec.id);
  sec.classList.add('is-live');
  onPower[sec.id]?.(sec);
  if (!reducedMotion) {
    gsap.fromTo(sec.querySelectorAll('[data-power]'), { opacity: 0.2 }, { keyframes: { opacity: [0.2, 1, 0.35, 1, 0.7, 1] }, duration: 0.55, ease: 'none' });
  }
}

// Başta metreler boş görünür (sadece silik segmentler).
$$('[data-seg]').forEach((el) => segSet(el, 0, METRE_HANE) || el.querySelectorAll('rect').forEach((r) => r.classList.remove('on')));

// --- Kurulum ----------------------------------------------------------------

let rt;
new ResizeObserver(() => {
  clearTimeout(rt);
  rt = setTimeout(() => ScrollTrigger.refresh(), 150);
}).observe(board);
ScrollTrigger.addEventListener('refresh', buildHarness);
if (lenis) lenis.on('scroll', updateHarness);
else addEventListener('scroll', updateHarness, { passive: true });
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
buildHarness();
