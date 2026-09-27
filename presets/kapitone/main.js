import raw from '../../data/usta.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, vitrinModu, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { createSeat, DEFAULT_STATE } from './seat3d.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const d = boot(raw);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const TAU = Math.PI * 2;
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = buYil - kurulus;
const isDesk = () => innerWidth >= 900;
if (reducedMotion) document.documentElement.classList.add('rm');

// Türkçe ayrılma eki: 1987'den, 1990'dan, 2004'ten…
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : n % 100 ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}
const beri = `${ablative(kurulus)} beri`;

// --- İçerik ----------------------------------------------------------------

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-bind="beri"]').forEach((el) => (el.textContent = `Şaşmaz Oto Sanayi, ${beri}`));
const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = `<i></i>${esc(st.text)}`;
});
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;

const btnCall = (label = 'Hemen ara') =>
  `<a class="btn btn--brass mag" href="${telHref(d)}">${icons.phone}<span>${label}</span></a>`;
const btnWa = (label = "WhatsApp'tan yaz", msg) =>
  `<a class="btn btn--line mag" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${label}</span></a>`;

$('#bas').innerHTML = `
  <div class="hero__inner">
    <p class="hero__kicker"><i></i>Şaşmaz Oto Sanayi'nde ${beri}</p>
    <h1 class="hero__title" aria-label="İskeletinden son dikişine kadar biz.">
      <span class="ln">İskeletinden</span><span class="ln">son dikişine</span><span class="ln">kadar biz.</span>
    </h1>
    <p class="hero__sub">${esc(d.isletme.ad)}: koltuk, tavan, direksiyon ve kapı döşemesi. ${yas} yıldır aynı tezgâhta.</p>
    <div class="hero__cta">${btnCall()}${btnWa()}</div>
    <p class="hero__hint" aria-hidden="true"><i></i>Kaydırın, koltuğu birlikte söküp yeniden döşeyelim</p>
  </div>`;

const ADIMLAR = [
  { baslik: 'Önce iskelet', metin: 'Koltuğu çıplak iskeletine kadar sökeriz. Gevşeyen yayı gerer, çatlayan kaynağı yeniden çekeriz.' },
  { baslik: 'Sonra sünger', metin: 'Çökmüş süngeri atarız. Yenisini aracınızın kalıbına göre keser, sertliğini oturuşunuza göre seçeriz.' },
  { baslik: 'Deri giydirilir', metin: 'Deriyi kendimiz seçeriz. Kalıp kâğıdından kesilir, kırışıksız ve gergin giydirilir.' },
  { baslik: 'Dikiş elde atılır', metin: 'Kapitone, dilim ya da düz. Her dikişin aralığını ölçeriz, ipliğin rengini siz seçersiniz.' },
  { baslik: 'İsterseniz ısıtma', metin: 'Isıtma pedi döşemenin altına girer, düğmesi konsola yerleşir. Dışarıdan fark edilmez.' },
];
$('#adimlar').innerHTML = ADIMLAR.map(
  (a, i) => `
  <article class="step" data-step="${i}">
    <div class="step__card">
      <p class="step__no" aria-hidden="true"><span>${i + 1}</span><small>/ ${ADIMLAR.length}</small></p>
      <h2 class="step__title">${a.baslik}</h2>
      <p class="step__text">${a.metin}</p>
    </div>
  </article>`
).join('');

$('#hizmetler').innerHTML = `
  <header class="svcs__head">
    <p class="eyebrow">Neler yapıyoruz</p>
    <h2 class="svcs__title">Aracın içinde elimizin değmediği yer kalmıyor.</h2>
    <p class="svcs__lead">Fiyatı işe başlamadan söylüyoruz. Süreler koltuğun durumuna göre değişebilir.</p>
  </header>
  <ol class="svcs__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc">
        <figure class="svc__img">${h.gorsel ? `<img src="${esc(h.gorsel)}" alt="${esc(h.baslik)}" loading="lazy" width="600" height="400">` : ''}</figure>
        <div class="svc__body">
          <p class="svc__no">${String(i + 1).padStart(2, '0')}</p>
          <h3 class="svc__title" data-text="${esc(h.baslik)}">${esc(h.baslik)}</h3>
          <p class="svc__text">${esc(h.aciklama)}</p>
          <p class="svc__time">Süre: <b>${esc(h.sure)}</b></p>
        </div>
      </li>`).join('')}
  </ol>`;

// Tarihçe: kuruluş yılı değişirse ondan önceki kayıtlar düşer
const tarihce = d.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus)
  .map((t) => ({ ...t, goster: t.yil ?? buYil, etiket: t.yil ?? 'Bugün' }));
const her = $('#tarihce');
$('.her__stage', her).innerHTML = `
  <div class="her__photos">
    ${tarihce.map((t, i) => `
      <figure class="her__ph" data-i="${i}">
        <img class="her__sep" src="${esc(t.gorsel)}" alt="" loading="lazy">
        <img class="her__col" src="${esc(t.gorsel)}" alt="" loading="lazy">
      </figure>`).join('')}
  </div>
  <div class="her__shade"></div>
  <header class="her__head">
    <h2>${yas} yıl, aynı tezgâh</h2>
    <p>Tek makineyle açılan dükkândan bugüne.</p>
  </header>
  <div class="her__odo" aria-hidden="true">
    ${[3, 2, 1, 0].map((p) => `<span class="odo__col" data-p="${p}">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => `<b>${n}</b>`).join('')}</span>`).join('')}
  </div>
  <div class="her__cards">
    ${tarihce.map((t, i) => `
      <article class="her__card" data-i="${i}">
        <p class="her__year">${t.etiket}</p>
        <h3>${esc(t.baslik)}</h3>
        <p>${esc(t.metin)}</p>
      </article>`).join('')}
  </div>
  <svg class="her__thread" viewBox="0 0 1000 10" preserveAspectRatio="none" aria-hidden="true">
    <path class="her__guide" d="M0,5 L1000,5"/><path class="her__line" d="M0,5 L1000,5"/>
  </svg>`;

// Yapılandırıcı seçenekleri → lib3d koltuk varyantları
const MALZEMELER = [
  { id: 'deri', ad: 'Hakiki deri', up: 'leather', ins: 'leather', ton: 1 },
  { id: 'alcantara', ad: 'Alcantara', up: 'alcantara', ins: 'alcantara', ton: 0.72 },
  { id: 'kumas', ad: 'Kumaş', up: 'fabric', ins: 'fabric', ton: 0.85 },
];
const RENKLER = [
  { id: 'konyak', ad: 'Konyak', hex: '#6f3519' },
  { id: 'bordo', ad: 'Bordo', hex: '#5a171d' },
  { id: 'siyah', ad: 'Siyah', hex: '#221a17' },
  { id: 'taba', ad: 'Taba', hex: '#b27a41' },
  { id: 'fume', ad: 'Füme', hex: '#4a4b4f' },
  { id: 'bej', ad: 'Bej', hex: '#c9b28f' },
];
const IPLIKLER = [
  { id: 'hardal', ad: 'Hardal', hex: '#e7a33a' },
  { id: 'kirmizi', ad: 'Kırmızı', hex: '#d2362c' },
  { id: 'beyaz', ad: 'Beyaz', hex: '#efe7da' },
  { id: 'ton', ad: 'Ton sür ton', hex: null },
];
const DESENLER = [
  { id: 'kapitone', ad: 'Kapitone' },
  { id: 'dilim', ad: 'Dikey dilim' },
  { id: 'duz', ad: 'Düz' },
];
const secim = { malzeme: MALZEMELER[0], renk: RENKLER[0], iplik: IPLIKLER[0], desen: DESENLER[0] };

const chipGroup = (key, title, list, swatch) => `
  <fieldset class="cfg__group">
    <legend>${title}</legend>
    <div class="cfg__chips">
      ${list.map((o, i) => `
        <button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-k="${key}" data-id="${o.id}" aria-pressed="${i === 0}">
          ${swatch ? `<i style="--sw:${o.hex || 'conic-gradient(#221a17 0 25%, #8c4a20 0 50%, #5a171d 0 75%, #c9b28f 0)'}"></i>` : ''}${o.ad}
        </button>`).join('')}
    </div>
  </fieldset>`;

$('#tasarla').innerHTML = `
  <div class="cfg__sticky">
  <div class="cfg__drag" aria-hidden="true"><span>Sürükleyip çevirin</span></div>
  <div class="cfg__panel">
    <h2>Koltuğunuzu tasarlayın</h2>
    <p class="cfg__lead">Malzemeyi, rengi ve ipliği seçin. Beğendiğinizi WhatsApp'tan gönderin, aynısını dikelim.</p>
    ${chipGroup('malzeme', 'Malzeme', MALZEMELER)}
    ${chipGroup('renk', 'Renk', RENKLER, true)}
    ${chipGroup('iplik', 'İplik', IPLIKLER, true)}
    ${chipGroup('desen', 'Desen', DESENLER)}
    <p class="cfg__sum" aria-live="polite"></p>
    <a class="btn btn--brass cfg__send mag" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu tasarımı gönder</span></a>
  </div>
  </div>`;

const stats = [
  { deger: yas, sonek: '', etiket: 'yıldır aynı tezgâhta' },
  ...d.istatistikler,
];
const stars = (n) => `<span class="stars" style="--p:${(n / 5) * 100}%" aria-label="5 üzerinden ${n}">${icons.star.repeat(5)}<span class="stars__fill">${icons.star.repeat(5)}</span></span>`;
const reviewCard = (y) => `
  <figure class="rev">
    ${stars(y.puan)}
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`;
$('#yorumlar').innerHTML = `
  <div class="proof__top">
    <div class="proof__score">
      <p class="proof__big"><span data-score>0,0</span></p>
      <div>${stars(d.puan.ortalama)}<p>Örnek puan · ${fmt(d.puan.adet)} değerlendirme</p></div>
    </div>
    <ul class="proof__stats">
      ${stats.map((s) => `<li><b data-count="${s.deger}" data-suffix="${esc(s.sonek)}">0</b><span>${esc(s.etiket)}</span></li>`).join('')}
    </ul>
  </div>
  <div class="proof__head">
    <p class="tag">Örnek yorumlar</p>
    <h2 class="proof__title">Müşterilerimiz ne diyor</h2>
  </div>
  <div class="proof__rows">
    <div class="marq" data-dir="-1"><div class="marq__track">${d.yorumlar.map(reviewCard).join('')}</div></div>
    <div class="marq" data-dir="1"><div class="marq__track">${[...d.yorumlar].reverse().map(reviewCard).join('')}</div></div>
  </div>
  <div class="marq marq--brands" data-dir="-1" aria-label="Döşemesini yaptığımız markalar"><div class="marq__track">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('')}</div></div>`;

$('#iletisim').innerHTML = `
  <div class="visit__info">
    <h2>Dükkânımıza uğrayın</h2>
    <p class="visit__status${st.open ? ' is-open' : ''}"><i></i>${esc(st.text)}</p>
    <address>${esc(d.iletisim.adres)}</address>
    <table class="visit__hours"><tbody>
      ${groupedHours(d.saatler).map(([g, s]) => `<tr><th>${g}</th><td>${s}</td></tr>`).join('')}
    </tbody></table>
    <div class="visit__cta">
      <a class="btn btn--brass mag" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
      ${btnWa()}
    </div>
  </div>
  <div class="visit__map"><iframe title="${esc(d.isletme.ad)} konumu" data-src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;

$('#son').innerHTML = `
  <div class="fin__inner">
    <h2 class="fin__title"><span class="w">Koltuğunuzu</span> <span class="w">getirin,</span> <span class="w">gerisini</span> <span class="w">biz</span> <span class="w">dikeriz.</span></h2>
    <p class="fin__note">${esc(d.garanti)}</p>
    <div class="fin__cta">${btnCall()}${btnWa()}</div>
  </div>`;

$('.foot').innerHTML = `
  <div class="foot__name">${esc(d.isletme.ad)}</div>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a></p>
  <p class="foot__small">© ${buYil} ${esc(d.isletme.ad)}. Fotoğraflar: Pexels. 3D görseller temsilîdir.</p>`;

// --- 3D --------------------------------------------------------------------

const canvas = $('#gl');
const glow = document.createElement('div');
glow.className = 'glow';
canvas.before(glow);
let seat = null;
try {
  seat = createSeat(canvas);
  seat.ready.catch((e) => {
    console.warn('3D koltuk yüklenemedi', e);
    document.documentElement.classList.add('no-gl');
  });
} catch (e) {
  document.documentElement.classList.add('no-gl');
  console.warn('WebGL yok', e);
}

function tonThread(hex) {
  const c = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  const l = c.reduce((a, b) => a + b, 0) / 3;
  const f = l < 90 ? 1.9 : 0.72;
  return '#' + c.map((v) => Math.min(255, Math.round(v * f + (l < 30 ? 20 : 0))).toString(16).padStart(2, '0')).join('');
}
function cfgSummary() {
  const iplik = secim.iplik.hex ? `${secim.iplik.ad.toLocaleLowerCase('tr')} iplik` : 'ton sür ton iplik';
  const text = `${secim.malzeme.ad}, ${secim.renk.ad.toLocaleLowerCase('tr')}, ${iplik}, ${secim.desen.ad.toLocaleLowerCase('tr')} desen`;
  $('.cfg__sum').textContent = text + '.';
  $('.cfg__send').href = waHref(d, `Merhaba ${d.isletme.ad}, koltuklarım için şu tasarımı istiyorum: ${text}. Fiyat alabilir miyim?`);
}
cfgSummary();

function applyConfig(animate = true) {
  if (!seat) return;
  const m = secim.malzeme;
  seat.setConfig({
    upholstery: m.up,
    insert: secim.desen.id === 'kapitone' ? 'quilted' : m.ins,
    color: secim.renk.hex,
    tone: m.ton,
    thread: secim.iplik.hex || tonThread(secim.renk.hex),
    plain: secim.desen.id === 'duz',
  }, gsap, animate ? 0.8 : 0);
  if (reducedMotion) setTimeout(() => seat.renderOnce(), animate ? 900 : 30);
}

$('#tasarla').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const { k, id } = b.dataset;
  const list = { malzeme: MALZEMELER, renk: RENKLER, iplik: IPLIKLER, desen: DESENLER }[k];
  const prev = secim[k];
  secim[k] = list.find((o) => o.id === id);
  $$(`.chip[data-k="${k}"]`).forEach((c) => {
    c.classList.toggle('is-on', c === b);
    c.setAttribute('aria-pressed', c === b);
  });
  cfgSummary();
  if (!seat) return;
  if (k === 'desen' && prev !== secim.desen && !reducedMotion) {
    gsap.fromTo(seat.extra, { restitch: 0 }, { restitch: 1, duration: 1.4, ease: 'power1.inOut' });
  }
  applyConfig(!reducedMotion);
});

// Sürükleyerek çevirme
{
  const drag = $('.cfg__drag');
  let x0 = null;
  drag.addEventListener('pointerdown', (e) => {
    x0 = e.clientX;
    seat?.setDragging(true);
    drag.setPointerCapture(e.pointerId);
    drag.classList.add('is-drag');
  });
  drag.addEventListener('pointermove', (e) => {
    if (x0 === null || !seat) return;
    seat.extra.userYaw += (e.clientX - x0) * 0.012;
    x0 = e.clientX;
    if (reducedMotion) seat.renderOnce();
  });
  const end = () => {
    x0 = null;
    seat?.setDragging(false);
    drag.classList.remove('is-drag');
  };
  drag.addEventListener('pointerup', end);
  drag.addEventListener('pointercancel', end);
}

// Harita: yaklaşınca yükle
new IntersectionObserver((entries, io) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const f = en.target;
    f.src = f.dataset.src;
    io.disconnect();
  });
}, { rootMargin: '600px' }).observe($('.visit__map iframe'));

// --- Scroll'a bağlı 3D anahtar kareleri --------------------------------------

const top = (el) => el.getBoundingClientRect().top + scrollY;
const vh = () => innerHeight;
const cfg = $('#tasarla');
const fin = $('#son');
const svcsEl = $('#hizmetler');
const cover = $('.cover');
const steps = $$('.step');
const mid = (el) => top(el) + el.offsetHeight / 2 - vh() / 2;

const POSE = {
  hero: () => ({
    ...DEFAULT_STATE, theta: 0.78, phi: 0.05, dist: 3.05, ty: 0.6,
    sx: isDesk() ? 0.2 : 0, sy: isDesk() ? 0 : -0.25,
  }),
  config: () => ({
    frame: 0, explode: 0, foam: 1, wrap: 1, stitch: 1, heat: 0, recline: 0, head: 0,
    theta: 0.62, phi: 0.1, dist: isDesk() ? 3.0 : 3.6, tx: 0, ty: 0.62, tz: 0,
    sx: isDesk() ? -0.21 : 0, sy: isDesk() ? 0 : -0.26, dim: 1, turn: 0, cfg: 1,
  }),
  finale: () => ({
    frame: 0, explode: 0, foam: 1, wrap: 1, stitch: 1, heat: 0, recline: 0.7, head: 1,
    theta: 0.35, phi: 0.12, dist: 3.3, tx: 0, ty: 0.62, tz: 0,
    sx: isDesk() ? 0.19 : 0, sy: isDesk() ? 0.02 : 0.2, dim: 0.95, turn: 1, cfg: 0,
  }),
};
const STEP_POSE = [
  // 1 İskelet: deri ve sünger gitmiş, parçalar aralanmış, kalıp çizgileri
  () => ({ foam: 0, wrap: 0, stitch: 0, frame: 1, explode: 0.5, theta: 1.2, phi: 0.2, dist: 3.5, ty: 0.64, sx: isDesk() ? 0.2 : 0, sy: isDesk() ? 0 : -0.2 }),
  // 2 Sünger dolar, parçalar yerine oturur
  () => ({ foam: 1, explode: 0, frame: 0.2, theta: -0.62, phi: 0.14, dist: 3.1, ty: 0.6 }),
  // 3 Deri yukarıdan aşağı giydirilir
  () => ({ wrap: 1, frame: 0, theta: 0.32, phi: 0.08, dist: 3.0, ty: 0.62 }),
  // 4 Dikiş: sırtlığa yakın plan
  () => ({ stitch: 1, theta: 0.18, phi: 0.04, dist: isDesk() ? 2.0 : 1.45, ty: 0.98, tz: 0.02, sx: isDesk() ? 0.14 : 0, sy: isDesk() ? 0 : -0.14 }),
  // 5 Isıtma: minderi üstten
  () => ({ heat: 1, theta: 0.3, phi: 0.92, dist: isDesk() ? 2.3 : 1.75, ty: 0.42, tz: 0.08, sx: isDesk() ? 0.16 : 0, sy: isDesk() ? 0 : -0.16 }),
];

let keys = [];
function buildKeys() {
  const K = [[0, POSE.hero]];
  const s0 = mid(steps[0]);
  // Söküm: önce deri kalkar, sonra sünger boşalır
  K.push([s0 * 0.45, () => ({ wrap: 0, stitch: 0, theta: 1.0, dist: 3.2 })]);
  steps.forEach((el, i) => {
    const m = mid(el);
    // Kart ekrana girdiğinde poz hazır; kart yukarı çıkarken bir sonrakine geçer
    K.push([m - vh() * 0.12, STEP_POSE[i]], [m + vh() * 0.38, () => ({})]);
  });
  K.push([top(svcsEl) - vh() * 0.2, () => ({ heat: 0, spin: 0, dim: 0.6, theta: 0.62, dist: 3.4, ty: 0.62, tz: 0, phi: 0.1 })]);
  K.push([top(cfg) - vh() * 0.5, POSE.config]);
  K.push([top(cfg) + cfg.offsetHeight - vh(), POSE.config]);
  K.push([top(cover) + cover.offsetHeight - vh() * 0.8, () => ({ ...POSE.finale(), turn: 0.2 })]);
  K.push([top(fin), POSE.finale]);
  K.push([document.documentElement.scrollHeight - vh(), () => ({ ...POSE.finale(), ...(isDesk() ? {} : { sy: -0.05, dist: 3.8 }) })]);
  K.sort((a, b) => a[0] - b[0]);
  let prev = { ...DEFAULT_STATE };
  keys = K.map(([pos, v]) => {
    const full = { ...prev, ...v() };
    prev = full;
    return { pos, full };
  });
}
function sample(y, out) {
  if (y <= keys[0].pos) return Object.assign(out, keys[0].full);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (y < b.pos) {
      let t = (y - a.pos) / Math.max(1, b.pos - a.pos);
      t = t * t * (3 - 2 * t);
      for (const k in a.full) out[k] = a.full[k] + (b.full[k] - a.full[k]) * t;
      return out;
    }
  }
  return Object.assign(out, keys[keys.length - 1].full);
}
// Ekranı tamamen örten opak bölümler: arkadaki 3D çizilmez
const covers = [svcsEl, her, cover];
function isCovered() {
  const h = vh();
  for (const el of covers) {
    const r = el.getBoundingClientRect();
    if (r.top <= 0 && r.bottom >= h) return true;
  }
  return false;
}

// --- Yumuşak scroll ve döngü --------------------------------------------------

const lenis = initSmoothScroll({ lerp: 0.085 });
const header = $('#top');
autoHideHeader(header, { offset: 120 });

if (seat) {
  seat.ready.then(() => applyConfig(false)).catch(() => {});
  if (reducedMotion) {
    Object.assign(seat.target, POSE.config(), { sx: isDesk() ? -0.2 : 0 });
    Object.assign(seat.cur, seat.target);
    seat.extra.intro = 1;
    seat.ready.then(() => seat.renderOnce()).catch(() => {});
    window.addEventListener('resize', () => seat.renderOnce());
  } else {
    gsap.ticker.add(() => {
      if (!keys.length) return;
      sample(scrollY, seat.target);
      seat.setActive(!isCovered());
      seat.frame();
    });
  }
}

// --- Sinematik zaman çizelgeleri ------------------------------------------------

function splitChars(el) {
  return new SplitText(el, { type: 'lines,words,chars', linesClass: 'ln-mask' });
}

function heroIn() {
  const tl = gsap.timeline();
  const lines = $$('.hero__title .ln');
  const chars = lines.map((l) => new SplitText(l, { type: 'chars' }).chars).flat();
  tl.from(chars, { yPercent: 110, fontStretch: '150%', duration: 1.0, ease: 'expo.out', stagger: 0.02 })
    .from('.hero__kicker', { autoAlpha: 0, x: -20, duration: 0.6 }, 0.1)
    .from('.hero__sub, .hero__cta > *, .hero__hint', { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' }, 0.25)
    .from('.top__in', { yPercent: -100, autoAlpha: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all' }, 0.15);
  if (seat) tl.to(seat.extra, { intro: 1, duration: 1.8, ease: 'power2.inOut' }, 0);
  return tl;
}

function buildSteps() {
  steps.forEach((el) => {
    const title = splitChars($('.step__title', el));
    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 62%', toggleActions: 'play none none reverse' },
    });
    tl.fromTo($('.step__no span', el), { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out' })
      .fromTo(title.chars, { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, stagger: 0.02, duration: 0.7, ease: 'power3.out' }, 0.08)
      .fromTo($('.step__text', el), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.3);
  });
  // Isıtma bölümünde turuncu parıltı
  const last = steps[steps.length - 1];
  gsap.fromTo(glow, { '--heat': 0 }, {
    '--heat': 1, ease: 'none',
    scrollTrigger: { trigger: last, start: 'top 80%', end: 'center center', scrub: 0.5 },
  });
  gsap.to(glow, {
    '--heat': 0, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: last, start: 'bottom 90%', end: 'bottom 40%', scrub: 0.5 },
  });
}

function buildServices() {
  const head = splitChars('.svcs__title');
  gsap.fromTo(head.chars, { yPercent: 110 }, {
    yPercent: 0, stagger: 0.012, ease: 'none',
    scrollTrigger: { trigger: '.svcs__head', start: 'top 85%', end: 'top 40%', scrub: 0.4 },
  });
  $$('.svc').forEach((el) => {
    const t = $('.svc__title', el);
    const img = $('.svc__img img', el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 82%', once: true } });
    tl.fromTo(t, { fontStretch: '60%' }, { fontStretch: '100%', duration: 0.8, ease: 'power2.out' })
      .to(t, { scrambleText: { text: t.dataset.text, chars: 'abcçdefgğhıijklmnoöprsştuüvyz', speed: 0.6 }, duration: 0.7 }, 0)
      .fromTo([$('.svc__text', el), $('.svc__time', el)], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.5 }, 0.2);
    if (img) {
      gsap.fromTo(img, { scale: 1.15, yPercent: -6 }, {
        scale: 1.02, yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  });
}

let odoPrev = null;
function setOdo(v) {
  const r = Math.round(v * 100) / 100;
  if (r === odoPrev) return;
  odoPrev = r;
  $$('.odo__col').forEach((col) => {
    const p = +col.dataset.p;
    const pw = 10 ** p;
    let pos;
    if (p === 0) pos = v % 10;
    else pos = (Math.floor(v / pw) % 10) + Math.max(0, (v % pw) - (pw - 1));
    col.style.transform = `translate3d(0, ${-pos}em, 0)`;
  });
}

function buildHeritage() {
  const n = tarihce.length;
  const stage = $('.her__stage');
  const phs = $$('.her__ph');
  const cards = $$('.her__card');
  const odo = { v: tarihce[0].goster };
  setOdo(odo.v);
  // Giriş perdesi kaydırılırken (pin başlamadan) açılır; pin yalnızca bölümler için
  gsap.fromTo(stage, { clipPath: 'inset(12% 8% 12% 8% round 28px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
    scrollTrigger: { trigger: her, start: 'top 90%', end: 'top top', scrub: 0.4 },
  });
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: her, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
  });
  tl.set({}, {}, n);
  // Pin boyunca alt çubuk saklanır (tek alt öğe: hikâye kartı)
  ScrollTrigger.create({
    trigger: her, start: 'top top', end: 'bottom bottom',
    onToggle: (s) => setStoryMode(s.isActive ? true : null),
  });
  tl.fromTo('.her__head', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0)
    .fromTo('.her__line', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: n - 0.2 }, 0);
  tarihce.forEach((t, i) => {
    const s = i;
    const ph = phs[i];
    const card = cards[i];
    const split = splitChars($('h3', card));
    if (i > 0) {
      tl.fromTo(ph, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.inOut' }, s - 0.2)
        .fromTo(odo, { v: tarihce[i - 1].goster }, { v: t.goster, duration: 0.4, ease: 'power1.inOut', immediateRender: false, onUpdate: () => setOdo(odo.v) }, s - 0.2)
        .to(cards[i - 1], { autoAlpha: 0, y: -30, duration: 0.18 }, s - 0.22);
    } else {
      tl.set(ph, { clipPath: 'inset(0% 0% 0% 0%)' }, 0);
    }
    tl.fromTo($('.her__col', ph), { opacity: 0 }, { opacity: 1, duration: 0.5 }, s + 0.05)
      .fromTo($$('img', ph), { scale: 1.16 }, { scale: 1, duration: 1.1 }, s - 0.2)
      .fromTo(card, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, s - 0.02)
      .fromTo($('.her__year', card), { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.22 }, s)
      .fromTo(split.chars, { yPercent: 110 }, { yPercent: 0, stagger: 0.006, duration: 0.26 }, s + 0.03)
      .fromTo($('p:last-child', card), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.22 }, s + 0.14);
  });
  odo.v = tarihce[0].goster;
  setOdo(odo.v);
}

function buildConfigIn() {
  gsap.fromTo('.cfg__panel', { autoAlpha: 0, y: 70 }, {
    autoAlpha: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: cfg, start: 'top 95%', end: 'top 40%', scrub: 0.5 },
  });
  gsap.fromTo('.cfg__panel .chip', { autoAlpha: 0, scale: 0.7 }, {
    autoAlpha: 1, scale: 1, stagger: 0.015, ease: 'back.out(2)',
    scrollTrigger: { trigger: cfg, start: 'top 75%', end: 'top 30%', scrub: 0.5 },
  });
  ScrollTrigger.create({
    trigger: cfg, start: 'top 45%', once: true,
    onEnter: () => seat && gsap.fromTo(seat.extra, { restitch: 0 }, { restitch: 1, duration: 1.8, ease: 'power1.inOut' }),
  });
}

function buildProof() {
  const score = $('[data-score]');
  const o = { v: 0 };
  gsap.to(o, {
    v: d.puan.ortalama, ease: 'none',
    scrollTrigger: { trigger: '.proof__top', start: 'top 85%', end: 'top 30%', scrub: 0.4 },
    onUpdate: () => (score.textContent = o.v.toFixed(1).replace('.', ',')),
  });
  gsap.fromTo('.proof__score .stars__fill', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: `inset(0 ${100 - (d.puan.ortalama / 5) * 100}% 0 0)`, ease: 'none',
    scrollTrigger: { trigger: '.proof__top', start: 'top 85%', end: 'top 30%', scrub: 0.4 },
  });
  $$('[data-count]').forEach((el) => {
    const c = { v: 0 };
    const to = +el.dataset.count;
    gsap.to(c, {
      v: to, duration: 1.6, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = fmt(c.v) + el.dataset.suffix),
    });
  });
  const title = splitChars('.proof__title');
  gsap.fromTo(title.chars, { yPercent: 110 }, {
    yPercent: 0, stagger: 0.02, ease: 'none',
    scrollTrigger: { trigger: '.proof__title', start: 'top 90%', end: 'top 55%', scrub: 0.4 },
  });
  // Scroll hızına duyarlı kayan şeritler
  const marqs = $$('.marq').map((m) => {
    const track = $('.marq__track', m);
    track.innerHTML += track.innerHTML;
    [...track.children].slice(track.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    return { track, dir: +m.dataset.dir, x: 0, w: 0, active: false };
  });
  const measure = () => marqs.forEach((q) => (q.w = q.track.scrollWidth / 2));
  measure();
  window.addEventListener('resize', measure);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const q = marqs.find((m) => m.track.parentElement === e.target);
    if (q) q.active = e.isIntersecting;
  }));
  marqs.forEach((q) => io.observe(q.track.parentElement));
  let skew = 0;
  gsap.ticker.add((_, dt) => {
    const v = lenis ? lenis.velocity : 0;
    skew += (Math.max(-8, Math.min(8, v * 0.25)) - skew) * 0.1;
    marqs.forEach((q) => {
      if (!q.active || !q.w) return;
      q.x += q.dir * (0.035 * dt + Math.abs(v) * 0.4) * (q.track.parentElement.classList.contains('marq--brands') ? 1.6 : 1);
      if (q.x <= -q.w) q.x += q.w;
      if (q.x > 0) q.x -= q.w;
      q.track.style.transform = `translate3d(${q.x}px,0,0) skewX(${-skew * q.dir}deg)`;
    });
  });
  gsap.fromTo('.visit__info > *', { autoAlpha: 0, y: 40 }, {
    autoAlpha: 1, y: 0, stagger: 0.1, ease: 'power3.out', duration: 0.9,
    scrollTrigger: { trigger: '#iletisim', start: 'top 75%', once: true },
  });
}

function syncFootHeight() {
  const pad = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
  document.documentElement.style.setProperty('--foot-h', `${$('.foot').offsetHeight + pad}px`);
}
syncFootHeight();
window.addEventListener('resize', syncFootHeight);

function buildFinale() {
  // Telefonda son yazılar koltuğun üstüne biner: koltuk arka plana çekilir
  gsap.matchMedia().add('(max-width: 899px)', () => {
    gsap.fromTo('#gl', { opacity: 1 }, {
      opacity: 0.22, ease: 'none',
      scrollTrigger: { trigger: fin, start: 'top 70%', end: 'top 25%', scrub: 0.4 },
    });
  });
  const words = $$('.fin__title .w');
  gsap.fromTo(words, { yPercent: 120, fontStretch: '50%', autoAlpha: 0 }, {
    yPercent: 0, fontStretch: '100%', autoAlpha: 1, stagger: 0.15, ease: 'none',
    scrollTrigger: { trigger: fin, start: 'top 85%', end: 'top 30%', scrub: 0.5 },
  });
  gsap.fromTo('.fin__note, .fin__cta', { autoAlpha: 0, y: 30 }, {
    autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.7,
    scrollTrigger: { trigger: fin, start: 'top 55%', toggleActions: 'play none none reverse' },
  });
}

// --- Açılış (≤ 2 sn, dokununca geçer) ---------------------------------------------

function runIntro() {
  const intro = $('#intro');
  const count = $('.intro__count');
  const name = $('.intro__name');
  const nameChars = new SplitText(name, { type: 'chars' }).chars;
  const p = { v: 0 };
  gsap.set('.intro__stitch', { strokeDashoffset: 600 });
  gsap.from(nameChars, { yPercent: 100, autoAlpha: 0, fontStretch: '150%', stagger: 0.03, duration: 0.8, ease: 'expo.out' });
  let finished = false;
  // 3D hazır olmasa da perde en geç 1,6 sn'de kalkar; koltuk hazır olunca ışığı açılır
  const prog = gsap.to(p, {
    v: 100, duration: 1.2, ease: 'power1.inOut',
    onUpdate: () => {
      count.textContent = String(Math.round(p.v)).padStart(3, '0');
      gsap.set('.intro__stitch', { strokeDashoffset: 600 - p.v * 6 });
    },
    onComplete: () => done(),
  });
  function done() {
    if (finished) return;
    finished = true;
    prog.kill();
    count.textContent = '100';
    gsap.set('.intro__stitch', { strokeDashoffset: 0 });
    intro.style.pointerEvents = 'none';
    const tl = gsap.timeline();
    tl.to('.intro__center', { scale: 0.94, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
      .to('.intro__skip', { autoAlpha: 0, duration: 0.2 }, 0)
      .to('.intro__half--top', { yPercent: -100, duration: 0.7, ease: 'expo.inOut' }, 0.15)
      .to('.intro__half--bot', { yPercent: 100, duration: 0.7, ease: 'expo.inOut' }, 0.15)
      .add(heroIn(), 0.3)
      .call(() => intro.remove(), null, 0.9);
    lenis?.start();
  }
  intro.addEventListener('pointerdown', done);
  addEventListener('wheel', done, { once: true, passive: true });
  addEventListener('touchmove', done, { once: true, passive: true });
  addEventListener('keydown', done, { once: true });
}

// --- Etkileşimler ------------------------------------------------------------

function magnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.mag').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    });
  });
}

function cursor() {
  const cur = $('.cursor');
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || reducedMotion) {
    cur.remove();
    return;
  }
  document.documentElement.classList.add('has-cursor');
  cur.style.opacity = '0';
  window.addEventListener('pointermove', () => (cur.style.opacity = '1'), { once: true });
  const dot = $('.cursor__dot', cur);
  const ring = $('.cursor__ring', cur);
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    const t = e.target;
    cur.classList.toggle('is-link', !!t.closest?.('a, button'));
    cur.classList.toggle('is-drag', !!t.closest?.('.cfg__drag'));
  });
  window.addEventListener('pointerdown', () => cur.classList.add('is-down'));
  window.addEventListener('pointerup', () => cur.classList.remove('is-down'));
}

// --- Başlat ------------------------------------------------------------------

cursor();
magnetic();

if (reducedMotion) {
  $('#intro').remove();
  if (seat) seat.extra.intro = 1;
  $('[data-score]').textContent = d.puan.ortalama.toFixed(1).replace('.', ',');
  $$('[data-count]').forEach((el) => (el.textContent = fmt(+el.dataset.count) + el.dataset.suffix));
} else {
  buildSteps();
  buildServices();
  buildHeritage();
  buildConfigIn();
  buildProof();
  buildFinale();
  ScrollTrigger.addEventListener('refresh', buildKeys);
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  buildKeys();
  if (vitrinModu() || sessionStorageSeen()) {
    // Vitrinden gelen ya da perdeyi görmüş ziyaretçiye perde yok
    $('#intro').remove();
    heroIn();
  } else {
    lenis?.stop();
    runIntro();
  }
}

function sessionStorageSeen() {
  try {
    const seen = sessionStorage.getItem('kapitone-intro') === '1';
    sessionStorage.setItem('kapitone-intro', '1');
    return seen;
  } catch (_) {
    return false;
  }
}
