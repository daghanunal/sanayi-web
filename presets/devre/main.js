import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, esc,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import {
  LAMBALAR, lambaHTML, kadranHTML, KADRAN_BASLANGIC, KADRAN_SUPURME,
  segHTML, segSet, sigortaHTML,
} from './gfx.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// "2001'den", "1994'ten", "1990'dan" — yılın okunuşuna göre ayrılma eki.
function denEki(n) {
  const s = String(n);
  const son = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const onlar = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return s + son[s.at(-1)];
  if (s.at(-2) !== '0') return s + onlar[s.at(-2)];
  return s + (s.at(-3) !== '0' ? "'den" : "'den");
}

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const bolt = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 2 4 13.5h6.5L9 22l10-12.5h-6.6z"/></svg>`;

// --- Üst bar ---------------------------------------------------------------

$('#topbar').innerHTML = `
  <a class="brand" href="#hero">${bolt}<span>${ad}</span></a>
  <p class="status" data-status><i class="led"></i><span data-long></span><span data-short></span></p>
  <a class="topbar__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Hero: gösterge paneli ------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__panel">
    <div class="cluster">
      ${kadranHTML({ id: 'devir', max: 8, adim: 1, birim: 'x1000', etiket: 'dev/dk' })}
      <div class="cluster__center">
        <ul class="lamps">${LAMBALAR.map(lambaHTML).join('')}</ul>
        <p class="readout" data-readout aria-live="polite">Kontak kapalı</p>
      </div>
      ${kadranHTML({ id: 'hiz', max: 240, adim: 40, birim: 'km/s', etiket: 'hız' })}
    </div>
    <div class="hero__copy">
      <p class="hero__who">${ad}, Şaşmaz Oto Sanayi</p>
      <div class="hero__titles">
        <h1 id="hero-title" class="hero__title t1">Arıza lambası mı yandı?</h1>
        <p class="hero__title t2" aria-hidden="true">Söndürelim.</p>
      </div>
      <p class="hero__lead">${esc(d.isletme.slogan)} Arıza tespiti 30 dakika, fiyatı işe başlamadan söyleriz.</p>
      <div class="hero__actions">
        <a class="btn btn--hot" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
      </div>
    </div>
  </div>
  <p class="hero__hint" aria-hidden="true"><span></span>Kaydırın, arızaları söndürelim</p>`;

// --- Hakkımızda ve multimetreler -----------------------------------------

const METRE_HANE = 5;
// Tecrübe yılı kuruluştan hesaplanır, böylece ?kurulus= ile tutarlı kalır.
d.istatistikler.forEach((s) => s.kurulustanHesapla && (s.deger = new Date().getFullYear() - d.isletme.kurulus));
$('#hakkimizda').innerHTML = `
  <div class="wrap">
    <div class="about__grid">
      <div class="about__text">
        <h2 class="h2" data-power>Tahminle değil,<br>ölçerek buluruz.</h2>
        <p class="lead">${esc(d.isletme.hakkinda)}</p>
        <p class="about__since">${denEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'ndeyiz.</p>
      </div>
      <figure class="about__photo">
        <img src="${import.meta.env.BASE_URL}img/devre/usta.jpg" alt="Ustamız arıza tespit cihazıyla aracı kontrol ediyor" width="1400" height="933" loading="lazy" />
      </figure>
    </div>
    <ul class="meters">
      ${d.istatistikler.map((s) => `
        <li class="meter">
          <div class="meter__body">
            <div class="meter__lcd">
              <div class="meter__digits" data-seg="${s.deger}" role="img" aria-label="${s.deger.toLocaleString('tr-TR')} ${esc(s.etiket)}">${segHTML(METRE_HANE)}</div>
              <span class="meter__unit">${esc(s.birim || '')}</span>
            </div>
            <div class="meter__knob" aria-hidden="true"><i></i></div>
          </div>
          <p class="meter__label">${esc(s.etiket)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Hizmetler: sigorta kutusu -------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <h2 class="h2" data-power>Aracın her devresine<br>bakıyoruz.</h2>
      <p class="lead">Her sigortanın bir devresi var, her arızanın bir sebebi. Hangisi olduğunu bulur, onu onarırız.</p>
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
            <h3>Listede yoksa sorun</h3>
            <p>Cam motoru, merkezi kilit, park sensörü, geri görüş kamerası… Aracın elektriğiyle ilgili ne varsa bakarız.</p>
            <a class="slot__link" href="${waHref(d, `Merhaba ${d.isletme.ad}, aracımın elektriğiyle ilgili bir sorum var.`)}" target="_blank" rel="noopener">WhatsApp'tan sorun</a>
          </div>
        </li>
      </ol>
    </div>
  </div>`;

// --- Arıza tespit: tarama cihazı -----------------------------------------

const logLines = [
  { t: 'cmd', x: '> OBD-II bağlantısı kuruldu' },
  { t: 'cmd', x: '> Motor beyni okunuyor…' },
  { t: 'cmd', x: `> ${d.arizaKodlari.length} hata kodu bulundu` },
  ...d.arizaKodlari.flatMap((k) => [
    { t: 'code', kod: k.kod, x: k.anlam },
    { t: 'fix', x: `✓ ${k.cozum}` },
  ]),
  { t: 'done', x: '> Kodlar silindi. Arıza lambası söndü.' },
];

$('#ariza-tespit').innerHTML = `
  <div class="wrap diag__grid">
    <div class="diag__text">
      <h2 class="h2" data-power>Hata kodunu okur,<br>Türkçesini söyleriz.</h2>
      <p class="lead">Arıza lambası yandığında beyin bir kod kaydeder. Cihazı bağlar, kodu okuruz. Ama işi kodla bitirmeyiz: kabloyu ve sensörü ölçerek asıl sebebi buluruz.</p>
      <figure class="diag__photo">
        <img src="${import.meta.env.BASE_URL}img/devre/teshis.jpg" alt="Tablet arıza tespit cihazı araca bağlı" width="1400" height="933" loading="lazy" />
      </figure>
    </div>
    <div class="scanner">
      <div class="scanner__bezel">
        <div class="scanner__screen">
          <div class="scanner__bar"><span>Volt Teşhis</span><span data-scan-status>Hazır</span></div>
          <ol class="scanner__log" data-log>
            ${logLines.map((l) =>
              l.t === 'code'
                ? `<li class="log log--code" data-state="fault"><span class="log__kod">${esc(l.kod)}</span><span class="log__txt">${esc(l.x)}</span></li>`
                : `<li class="log log--${l.t}"><span class="log__txt">${esc(l.x)}</span></li>`
            ).join('')}
          </ol>
        </div>
        <div class="scanner__keys" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
    </div>
  </div>`;

// --- Süreç: osiloskop ------------------------------------------------------

$('#surec').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <h2 class="h2" data-power>Arızadan teslime<br>dört adım.</h2>
      <p class="lead">Sinyal bozuk gelir, düzgün çıkar. Aracınız da öyle.</p>
    </header>
    <div class="scope" aria-hidden="true">
      <svg class="scope__svg" viewBox="0 0 1000 160" preserveAspectRatio="none">
        <path class="scope__ghost" d=""/>
        <path class="scope__trace" d=""/>
      </svg>
    </div>
    <ol class="steps">
      ${d.surec.map((s, i) => `
        <li class="step">
          <span class="step__no">${i + 1}</span>
          <h3>${esc(s.baslik)}</h3>
          <p>${esc(s.aciklama)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

// Sinyal: başta gürültülü ve düzensiz, sona doğru temiz sinüs.
{
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  let dStr = '';
  for (let x = 0; x <= 1000; x += 4) {
    const t = x / 1000;
    const clean = Math.sin(x / 26) * 44;
    const noise = (rnd() * 60 + Math.sin(x / 7) * 20) * (1 - t) ** 1.6;
    const spike = t < 0.35 && rnd() > 0.93 ? rnd() * 70 : 0;
    const y = 80 - (clean * Math.min(1, t * 1.6 + 0.15) + noise + spike);
    dStr += `${x ? 'L' : 'M'}${x} ${Math.max(4, Math.min(156, y)).toFixed(1)}`;
  }
  $$('#surec .scope__trace, #surec .scope__ghost').forEach((p) => p.setAttribute('d', dStr));
}

// --- Yorumlar --------------------------------------------------------------

const yildiz = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}${`<span class="off">${icons.star}</span>`.repeat(5 - n)}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="reviews__head">
      <h2 class="h2" data-power>Arızası çözülen<br>ne diyor?</h2>
      <div class="score">
        <span class="score__num">${String(d.puan.ortalama).replace('.', ',')}</span>
        <span class="score__meta">${yildiz(5)}<span>${d.puan.adet} Google yorumu</span></span>
      </div>
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

// --- Markalar: kablo etiketleri ------------------------------------------

const tag = (m, i) => `<span class="tag tag--${['red', 'blue', 'yellow', 'green'][i % 4]}">${esc(m)}</span>`;
const half = Math.ceil(d.markalar.length / 2);
const rowA = d.markalar.slice(0, half), rowB = d.markalar.slice(half);
$('#markalar').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <h2 class="h2" data-power>Her marka, her yakıt.</h2>
      <p class="lead">Benzinli, dizel, LPG'li ve hibrit araçlarla çalışıyoruz. Aşağıdakiler en sık gelenler.</p>
    </header>
  </div>
  <div class="tags" aria-label="Çalıştığımız markalar">
    <div class="tags__row"><div class="tags__track">${[...rowA, ...rowA, ...rowA, ...rowA].map(tag).join('')}</div></div>
    <div class="tags__row"><div class="tags__track">${[...rowB, ...rowB, ...rowB, ...rowB].map((m, i) => tag(m, i + 2)).join('')}</div></div>
  </div>
  <p class="sr-only">${d.markalar.map(esc).join(', ')}</p>`;

// --- Dükkan: saatler ve konum --------------------------------------------

$('#dukkan').innerHTML = `
  <div class="wrap shop__grid">
    <div class="shop__info">
      <h2 class="h2" data-power>Şaşmaz'dayız.</h2>
      <p class="status status--big" data-status><i class="led"></i><span></span></p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${groupedHours(d.saatler).map(([g, s]) => `<tr><th scope="row">${g}</th><td>${s}</td></tr>`).join('')}</tbody>
      </table>
      <address>${esc(d.iletisim.adres)}</address>
      <div class="shop__actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--line-ink" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map">
      <iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>`;

// --- Son çağrı -------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap cta__inner">
    <h2 class="cta__title" data-power>Lamba yanıyorsa<br>beklemeyin.</h2>
    <p class="lead">Arızayı telefonda anlatın, ne zaman gelebileceğinizi söyleyelim. Çoğu işi aynı gün teslim ediyoruz.</p>
    <div class="cta__actions">
      <a class="btn btn--hot btn--xl" data-wire-end href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--wa btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
    <p class="cta__note">${esc(d.garanti)}</p>
  </div>`;

$('#footer').innerHTML = `
  <div class="footer__inner">
    <p class="brand">${bolt}<span>${ad}</span></p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a></p>
    <p class="footer__small">© ${new Date().getFullYear()} ${ad}. ${esc(d.isletme.sektor)}, Etimesgut/Ankara.</p>
  </div>`;

// --- Açık/kapalı durumu ----------------------------------------------------

function refreshStatus() {
  const st = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', st.open);
    const long = el.querySelector('[data-long]') || el.querySelector('span');
    long.textContent = st.text;
    const short = el.querySelector('[data-short]');
    if (short) short.textContent = st.open ? 'Açık' : 'Kapalı';
  });
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// ===========================================================================
// Hareket
// ===========================================================================

const lenis = initSmoothScroll();

// --- Gösterge paneli: kontak testi ve kadranlar ---------------------------

const hero = $('#hero');
const lamps = $$('.lamp', hero);
const faults = lamps.filter((l) => l.hasAttribute('data-fault'));
const readout = $('[data-readout]');
const needle = (id) => $(`#${id} [data-needle]`);
const angle = (v, max) => KADRAN_BASLANGIC + KADRAN_SUPURME * Math.min(1, Math.max(0, v / max));
gsap.set([needle('devir'), needle('hiz')], { rotation: KADRAN_BASLANGIC, svgOrigin: '100 100' });

function setReadout(text, tone) {
  readout.textContent = text;
  readout.dataset.tone = tone || '';
}
function faultText() {
  const n = faults.filter((l) => l.classList.contains('on')).length;
  if (n) setReadout(`${n} arıza kaydı var`, 'warn');
  else setReadout('Tüm sistemler normal', 'ok');
}

let introDone = reducedMotion;
if (reducedMotion) {
  faults.forEach((l) => l.classList.add('on'));
  faultText();
  gsap.set(needle('devir'), { rotation: angle(0.9, 8) });
} else {
  // Gerçek araçtaki gibi: kontak açılınca bütün lambalar yanar, ibreler sonuna kadar gidip döner.
  const intro = gsap.timeline({ delay: 0.5, onComplete: () => { introDone = true; faultText(); } });
  intro.call(() => setReadout('Kontak açık'));
  lamps.forEach((l, i) => intro.call(() => l.classList.add('on'), null, 0.1 + i * 0.06));
  intro.to([needle('devir'), needle('hiz')], { rotation: KADRAN_BASLANGIC + KADRAN_SUPURME, duration: 0.8, ease: 'power2.inOut' }, 0.15);
  intro.to(needle('hiz'), { rotation: KADRAN_BASLANGIC, duration: 0.7, ease: 'power2.inOut' }, 1.1);
  intro.to(needle('devir'), { rotation: angle(0.9, 8), duration: 0.7, ease: 'power2.inOut' }, 1.1);
  intro.call(() => lamps.forEach((l) => !l.hasAttribute('data-fault') && l.classList.remove('on')), null, 1.6);
  intro.from('.hero__copy > *', { opacity: 0, y: 24, stagger: 0.08, duration: 0.7, ease: 'power3.out' }, 0.9);

  // Rölanti titremesi
  gsap.to(needle('devir'), { rotation: `+=${KADRAN_SUPURME * 0.012}`, duration: 0.09, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2.4 });

  // Hız ibresi scroll hızını gösterir.
  if (lenis) {
    const hiz = gsap.quickTo(needle('hiz'), 'rotation', { duration: 0.5, ease: 'power3.out' });
    lenis.on('scroll', ({ velocity }) => introDone && hiz(angle(Math.abs(velocity) * 5, 240)));
  }
}

// Scroll ettikçe arızalar söner, başlık değişir.
if (!reducedMotion) {
  const t1 = SplitText.create('.hero__title.t1', { type: 'chars,words' });
  const t2 = SplitText.create('.hero__title.t2', { type: 'chars,words' });
  gsap.set(t2.chars, { opacity: 0 });

  const proxy = { p: 0 };
  const thresholds = faults.map((_, i) => 0.12 + i * 0.18);
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to(proxy, {
    p: 1, duration: 1,
    onUpdate() {
      if (!introDone) return;
      faults.forEach((l, i) => {
        const on = proxy.p < thresholds[i];
        if (on === l.classList.contains('on')) return;
        l.classList.toggle('on', on);
        if (!on) gsap.fromTo(l, { '--flash': 1 }, { '--flash': 0, duration: 0.8, ease: 'power2.out' });
      });
      faultText();
    },
  });
  tl.to(t1.chars, { opacity: 0, yPercent: -30, stagger: 0.008, duration: 0.12, ease: 'power1.in' }, 0.6);
  tl.to(t2.chars, { keyframes: { opacity: [0, 1, 0.25, 1] }, stagger: 0.03, duration: 0.14 }, 0.72);
  tl.to('.hero__hint', { opacity: 0, duration: 0.1 }, 0);

  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: '+=130%', pin: true, scrub: 0.4, animation: tl,
  });
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
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  let len = 0;
  let cur = pts[0];
  const keys = [[pts[0][1], 0]];
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  for (let i = 1; i < pts.length; i++) {
    const c = pts[i];
    if (i === pts.length - 1) {
      len += dist(cur, c);
      d += `L${c[0]} ${c[1]}`;
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
    d += `L${a[0]} ${a[1]}A${rr} ${rr} 0 0 ${sweep} ${b[0]} ${b[1]}`;
    const arc = (Math.PI * rr) / 2;
    // Yatay koşuya giriş ve çıkış köşeleri, işaretçi aralığına yayılır (ani sıçrama olmasın).
    const intoHoriz = dn[1] === 0, outOfHoriz = dp[1] === 0;
    const ky = intoHoriz ? c[1] - slack : outOfHoriz ? c[1] + slack : c[1];
    keys.push([ky, len + arc / 2]);
    len += arc;
    cur = b;
  }
  for (let i = 1; i < keys.length; i++) keys[i][0] = Math.max(keys[i][0], keys[i - 1][0] + 1);
  return { d, len, keys };
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
  // Son kadrandaki "Ara" düğmesi kablonun bittiği yer.
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
    // Aynı doğrultudaki ara noktaları at.
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
  hakkimizda: (sec) => {
    $$('[data-seg]', sec).forEach((el, i) => {
      const target = Number(el.dataset.seg);
      if (reducedMotion) return segSet(el, target, METRE_HANE);
      const o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.6, delay: 0.15 * i, ease: 'power2.out', onUpdate: () => segSet(el, o.v, METRE_HANE) });
    });
  },
  hizmetler: (sec) => {
    if (reducedMotion) return;
    gsap.fromTo($$('.slot__fuse svg', sec), { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.2)' });
  },
  'ariza-tespit': (sec) => typeScanner(sec),
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

// --- Tarama cihazı yazısı ---------------------------------------------------

function typeScanner(sec) {
  const items = $$('.log', sec);
  const status = $('[data-scan-status]', sec);
  if (reducedMotion) {
    items.forEach((li) => li.dataset.state === 'fault' && (li.dataset.state = 'fixed'));
    status.textContent = 'Tamamlandı';
    return;
  }
  const texts = items.map((li) => $$('span', li).map((s) => s.textContent));
  items.forEach((li) => { li.classList.add('pending'); $$('span', li).forEach((s) => (s.textContent = '')); });
  const tl = gsap.timeline({ delay: 0.3 });
  tl.call(() => (status.textContent = 'Bağlanıyor'));
  let lastCode = null;
  items.forEach((li, i) => {
    const spans = $$('span', li);
    tl.call(() => { li.classList.remove('pending'); li.classList.add('typing'); });
    spans.forEach((s, j) => {
      const full = texts[i][j];
      const o = { n: 0 };
      tl.to(o, { n: full.length, duration: full.length / 90, ease: 'none', onUpdate: () => (s.textContent = full.slice(0, Math.round(o.n))) });
    });
    tl.call(() => li.classList.remove('typing'));
    if (li.classList.contains('log--code')) {
      lastCode = li;
      tl.call(() => (status.textContent = 'Okunuyor'));
      tl.to({}, { duration: 0.25 });
    } else if (li.classList.contains('log--fix') && lastCode) {
      const code = lastCode;
      tl.call(() => (code.dataset.state = 'fixed'));
      tl.to({}, { duration: 0.2 });
    }
  });
  tl.call(() => (status.textContent = 'Tamamlandı'));
}

// --- Osiloskop çizgisi --------------------------------------------------------

if (!reducedMotion) {
  const steps = $$('#surec .step');
  gsap.fromTo('#surec .scope__trace', { drawSVG: '0% 0%' }, {
    drawSVG: '0% 100%', ease: 'none',
    scrollTrigger: {
      trigger: '#surec .scope', start: 'top 85%', end: 'bottom 35%', scrub: 0.5,
      onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('is-on', self.progress >= i / steps.length + 0.04)),
    },
  });
} else {
  $$('#surec .step').forEach((s) => s.classList.add('is-on'));
}

// --- Marka etiketleri: kayan şeritler, scroll hızıyla hızlanır ----------

if (!reducedMotion) {
  const tracks = $$('.tags__track').map((el, i) =>
    gsap.fromTo(el, { xPercent: i ? -50 : 0 }, { xPercent: i ? 0 : -50, duration: 38, ease: 'none', repeat: -1 })
  );
  let boost = { v: 1 };
  ScrollTrigger.create({
    trigger: '#markalar', start: 'top bottom', end: 'bottom top',
    onUpdate: (self) => {
      const v = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 8);
      gsap.to(boost, { v, duration: 0.2, overwrite: true, onUpdate: () => tracks.forEach((t) => t.timeScale(boost.v)) });
      gsap.to(boost, { v: 1, duration: 1.2, delay: 0.2, ease: 'power2.out', onUpdate: () => tracks.forEach((t) => t.timeScale(boost.v)) });
    },
  });
}

// --- Kurulum ----------------------------------------------------------------

function rebuild() {
  buildHarness();
}
let rt;
new ResizeObserver(() => {
  clearTimeout(rt);
  rt = setTimeout(() => ScrollTrigger.refresh(), 150);
}).observe(board);
ScrollTrigger.addEventListener('refresh', rebuild);
if (lenis) lenis.on('scroll', updateHarness);
else addEventListener('scroll', updateHarness, { passive: true });
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
rebuild();
