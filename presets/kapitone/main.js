import raw from '../../data/usta.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
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
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || innerWidth < 600;
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
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;

const btnCall = (label = 'Hemen ara') =>
  `<a class="btn btn--brass mag" href="${telHref(d)}">${icons.phone}<span>${label}</span></a>`;
const btnWa = (label = "WhatsApp'tan yaz", msg) =>
  `<a class="btn btn--line mag" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${label}</span></a>`;

$('#hero').innerHTML = `
  <p class="hero__kicker">Şaşmaz Oto Sanayi'nde ${beri}</p>
  <h1 class="hero__title" aria-label="İskeletinden son dikişine kadar biz.">
    <span class="ln">İskeletinden</span><span class="ln">son dikişine</span><span class="ln">kadar biz.</span>
  </h1>
  <p class="hero__sub">${esc(d.isletme.ad)}: koltuk, tavan, direksiyon ve kapı döşemesi. ${yas} yıldır aynı tezgâhta, babadan oğula.</p>
  <div class="hero__cta">${btnCall()}${btnWa()}</div>
  <p class="hero__hint" aria-hidden="true"><i></i>Kaydırın, koltuğu birlikte döşeyelim</p>`;

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
    <p class="step__no" aria-hidden="true"><span>${i + 1}</span><small>/ ${ADIMLAR.length}</small></p>
    <h2 class="step__title">${a.baslik}</h2>
    <p class="step__text">${a.metin}</p>
  </article>`
).join('');

$('#hizmetler').innerHTML = `
  <header class="svcs__head">
    <h2>Neler yapıyoruz</h2>
    <p>Aracın içinde elimizin değmediği yer kalmıyor. Fiyatı işe başlamadan söylüyoruz.</p>
  </header>
  <div class="svcs__list">
    ${d.hizmetler.map((h, i) => `
      <article class="svc" data-i="${i}">
        <h3 class="svc__title" data-text="${esc(h.baslik)}">${esc(h.baslik)}</h3>
        <p class="svc__text">${esc(h.aciklama)}</p>
        <p class="svc__time">Süre: <b>${esc(h.sure)}</b></p>
      </article>`).join('')}
  </div>
  <ol class="svcs__dots" aria-hidden="true">${d.hizmetler.map(() => '<li></li>').join('')}</ol>`;

// Tarihçe: kuruluş yılı değişirse ondan önceki kayıtlar düşer
const tarihce = d.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus)
  .map((t) => ({ ...t, goster: t.yil ?? buYil, etiket: t.yil ?? 'Bugün' }));
const her = $('#tarihce');
her.style.setProperty('--n', tarihce.length);
$('.her__stage', her).innerHTML = `
  <div class="her__photos">
    ${tarihce.map((t, i) => `
      <figure class="her__ph" data-i="${i}">
        <img class="her__sep" src="${t.gorsel}" alt="" loading="lazy">
        <img class="her__col" src="${t.gorsel}" alt="${esc(t.baslik)}" loading="lazy">
      </figure>`).join('')}
  </div>
  <div class="her__shade"></div>
  <header class="her__head">
    <h2>Babadan oğula ${yas} yıl</h2>
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

const MALZEMELER = [
  { id: 'deri', ad: 'Hakiki deri', props: { roughness: 0.52, clearcoat: 0.18, clearcoatRoughness: 0.42, sheen: 0.25, sheenRoughness: 0.45, specularIntensity: 1 }, mat: 0, ton: 1, parilti: 1.8 },
  { id: 'alcantara', ad: 'Alcantara', props: { roughness: 0.96, clearcoat: 0, clearcoatRoughness: 0.8, sheen: 0.5, sheenRoughness: 0.85, specularIntensity: 0.1 }, mat: 1, ton: 0.58, parilti: 1.3 },
  { id: 'kumas', ad: 'Kumaş', props: { roughness: 0.9, clearcoat: 0, clearcoatRoughness: 0.8, sheen: 0.3, sheenRoughness: 0.7, specularIntensity: 0.3 }, mat: 2, ton: 0.9, parilti: 1.4 },
];
const RENKLER = [
  { id: 'siyah', ad: 'Siyah', hex: '#1f1512' },
  { id: 'konyak', ad: 'Konyak', hex: '#8c4a20' },
  { id: 'bordo', ad: 'Bordo', hex: '#5a171d' },
  { id: 'taba', ad: 'Taba', hex: '#b27a41' },
  { id: 'fume', ad: 'Füme', hex: '#45464a' },
  { id: 'bej', ad: 'Bej', hex: '#c9b28f' },
];
const IPLIKLER = [
  { id: 'hardal', ad: 'Hardal', hex: '#e7a33a' },
  { id: 'kirmizi', ad: 'Kırmızı', hex: '#d2362c' },
  { id: 'beyaz', ad: 'Beyaz', hex: '#efe7da' },
  { id: 'ton', ad: 'Ton sür ton', hex: null },
];
const DESENLER = [
  { id: 'kapitone', ad: 'Kapitone', v: 0 },
  { id: 'dilim', ad: 'Dikey dilim', v: 1 },
  { id: 'duz', ad: 'Düz', v: 2 },
];
const secim = { malzeme: MALZEMELER[0], renk: RENKLER[0], iplik: IPLIKLER[0], desen: DESENLER[0] };

const chipGroup = (key, title, list, swatch) => `
  <fieldset class="cfg__group">
    <legend>${title}</legend>
    <div class="cfg__chips">
      ${list.map((o, i) => `
        <button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-k="${key}" data-id="${o.id}" aria-pressed="${i === 0}">
          ${swatch ? `<i style="--sw:${o.hex || 'conic-gradient(#1f1512 0 25%, #8c4a20 0 50%, #5a171d 0 75%, #c9b28f 0)'}"></i>` : ''}${o.ad}
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
      <div>${stars(d.puan.ortalama)}<p>${fmt(d.puan.adet)} müşteri değerlendirmesi</p></div>
    </div>
    <ul class="proof__stats">
      ${stats.map((s) => `<li><b data-count="${s.deger}" data-suffix="${esc(s.sonek)}">0</b><span>${esc(s.etiket)}</span></li>`).join('')}
    </ul>
  </div>
  <h2 class="proof__title">Müşterilerimiz ne diyor</h2>
  <div class="proof__rows">
    <div class="marq" data-dir="-1"><div class="marq__track">${d.yorumlar.map(reviewCard).join('')}</div></div>
    <div class="marq" data-dir="1"><div class="marq__track">${[...d.yorumlar].reverse().map(reviewCard).join('')}</div></div>
  </div>
  <div class="marq marq--brands" data-dir="-1" aria-label="Çalıştığımız markalar"><div class="marq__track">${d.markalar.map((m) => `<span>${esc(m)}</span>`).join('')}</div></div>`;

const bugunIdx = [6, 0, 1, 2, 3, 4, 5][new Date().getDay()];
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
void bugunIdx;

$('#son').innerHTML = `
  <div class="fin__inner">
    <h2 class="fin__title"><span class="w">Koltuğunuzu</span> <span class="w">getirin,</span> <span class="w">gerisini</span> <span class="w">biz</span> <span class="w">dikeriz.</span></h2>
    <p class="fin__note">${esc(d.garanti)}</p>
    <div class="fin__cta">${btnCall()}${btnWa()}</div>
  </div>`;

$('.foot').innerHTML = `
  <div class="foot__name">${esc(d.isletme.ad)}</div>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
  <p class="foot__small">© ${buYil} ${esc(d.isletme.ad)}. Fotoğraflar: Pexels. 3D koltuk bu site için kodla çizildi.</p>`;

// --- Yapılandırıcı ---------------------------------------------------------

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

// --- 3D --------------------------------------------------------------------

const canvas = $('#gl');
const glow = document.createElement('div');
glow.className = 'glow';
canvas.before(glow);
let seat = null;
try {
  seat = createSeat(canvas, { low: lowEnd });
} catch (e) {
  document.documentElement.classList.add('no-gl');
  console.warn('WebGL yok', e);
}

function applyConfig(animate = true) {
  if (!seat) return;
  const dur = animate ? 0.8 : 0;
  // Süet ve kumaş ışığı yutar: aynı renk biraz koyu görünür, parlaması da kendi tonunda kalır
  const c = seat.U.uColor.value.clone().set(secim.renk.hex).multiplyScalar(secim.malzeme.ton);
  gsap.to(seat.U.uColor.value, { r: c.r, g: c.g, b: c.b, duration: dur, ease: 'power2.out' });
  const th = seat.U.uThread.value.clone().set(secim.iplik.hex || tonThread(secim.renk.hex));
  gsap.to(seat.U.uThread.value, { r: th.r, g: th.g, b: th.b, duration: dur });
  gsap.to([seat.matInsert, seat.matPlain], { ...secim.malzeme.props, duration: dur });
  const sh = c.clone().multiplyScalar(secim.malzeme.parilti);
  for (const m of [seat.matInsert, seat.matPlain]) gsap.to(m.sheenColor, { r: sh.r, g: sh.g, b: sh.b, duration: dur });
  gsap.to(seat.U.uMat, { value: secim.malzeme.mat, duration: dur });
  if (reducedMotion) setTimeout(() => seat.renderOnce(), dur * 1000 + 50);
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
  if (k === 'desen' && prev !== secim.desen) {
    seat.U.uPattern.value = secim.desen.v;
    if (!reducedMotion) gsap.fromTo(seat.extra, { restitch: 0 }, { restitch: 1, duration: 1.8, ease: 'none' });
  }
  applyConfig(!reducedMotion);
  if (reducedMotion) seat.renderOnce();
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
const film = $('#film');
const cfg = $('#tasarla');
const cover = $('.cover');
const fin = $('#son');
const vh = () => innerHeight;

const POSE = {
  hero: () => ({ frame: 1, foam: 0, wrap: 0, stitch: 0, heat: 0, theta: 0.75, phi: 0.2, dist: 2.35, tx: 0, ty: 0.42, tz: 0, spin: 0, sx: isDesk() ? 0.17 : 0, sy: isDesk() ? 0 : -0.17, dim: 1, turn: 0, cfg: 0 }),
  config: () => ({ frame: 1, foam: 1, wrap: 1, stitch: 1, heat: 0, theta: 0.6, phi: 0.16, dist: isDesk() ? 2.25 : 3.3, tx: 0, ty: 0.42, tz: 0, spin: 0, sx: isDesk() ? -0.2 : 0, sy: isDesk() ? 0 : -0.23, dim: 1, turn: 0, cfg: 1 }),
  finale: () => ({ frame: 1, foam: 1, wrap: 1, stitch: 1, heat: 0, theta: 0.2, phi: 0.2, dist: 2.45, tx: 0, ty: 0.45, tz: 0, spin: 0, sx: isDesk() ? 0.18 : 0, sy: isDesk() ? 0.02 : 0.2, dim: 0.95, turn: 1, cfg: 0 }),
};
const filmAt = (f) => () => top(film) + f * (film.offsetHeight - vh());
const K = [
  [filmAt(0), POSE.hero],
  [filmAt(0.08), () => ({ theta: 1.15, dist: 2.0 })],
  [filmAt(0.16), () => ({ theta: 1.45, phi: 0.36, dist: 1.8, ty: 0.4, sx: isDesk() ? 0.2 : 0 })],
  [filmAt(0.21), () => ({ foam: 0 })],
  [filmAt(0.29), () => ({ foam: 1, theta: -0.55, phi: 0.24, dist: 2.0 })],
  [filmAt(0.33), () => ({ wrap: 0 })],
  [filmAt(0.42), () => ({ wrap: 1, theta: 0.3, phi: 0.12, dist: 2.15 })],
  [filmAt(0.46), () => ({ stitch: 0, ty: 0.5, dist: 1.6, tz: -0.1 })],
  [filmAt(0.57), () => ({ stitch: 1, ty: 0.66, tz: -0.2, dist: 1.0, theta: 0.1, phi: 0.05 })],
  [filmAt(0.61), () => ({ heat: 0, ty: 0.5, dist: 1.3, phi: 0.5 })],
  [filmAt(0.71), () => ({ heat: 1, ty: 0.32, tz: 0.02, dist: 0.95, phi: 1.02, theta: 0.28 })],
  [filmAt(0.75), () => ({ heat: 1 })],
  [filmAt(0.82), () => ({ heat: 0, ty: 0.42, tz: 0, phi: 0.16, theta: 0.6, spin: 0, sx: isDesk() ? -0.19 : 0, sy: isDesk() ? 0 : -0.24, dist: isDesk() ? 2.3 : 2.9 })],
  [filmAt(1), () => ({ spin: TAU, dim: 0.5 })],
  [() => top(her) + vh(), () => ({ spin: TAU, dim: 0.5 })],
  [() => top(her) + her.offsetHeight - 2 * vh(), POSE.config],
  [() => top(cover), POSE.config],
  [() => top(fin) - vh(), POSE.finale],
  [() => document.documentElement.scrollHeight - vh(), () => ({ ...POSE.finale(), ...(isDesk() ? {} : { sy: -0.06, dist: 3.5 }) })],
];
let keys = [];
let covered = [];
function buildKeys() {
  let prev = { ...DEFAULT_STATE };
  keys = K.map(([p, v]) => ({ pos: p(), vals: v() }))
    .map((k) => {
      k.full = { ...prev, ...k.vals };
      prev = k.full;
      return k;
    });
  covered = [
    [top(her) + vh() + 4, top(her) + her.offsetHeight - 2 * vh() - 4],
    [top(cover) + 4, top(cover) + cover.offsetHeight - vh() - 4],
  ];
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

// --- Yumuşak scroll ve döngü --------------------------------------------------

const lenis = initSmoothScroll({ lerp: 0.085 });
if (lenis) lenis.stop();

if (seat) {
  seat.U.uPattern.value = 0;
  applyConfig(false);
  if (reducedMotion) {
    Object.assign(seat.target, POSE.config(), { sx: isDesk() ? -0.2 : 0 });
    Object.assign(seat.cur, seat.target);
    seat.extra.intro = 1;
    seat.ready.then(() => seat.renderOnce());
    window.addEventListener('resize', () => seat.renderOnce());
  } else {
    gsap.ticker.add(() => {
      const y = scrollY;
      if (!keys.length) return;
      sample(y, seat.target);
      const hidden = covered.some(([a, b]) => y > a && y < b);
      seat.setActive(!hidden);
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
  tl.from(chars, { yPercent: 110, fontStretch: '150%', duration: 1.1, ease: 'expo.out', stagger: 0.022 })
    .from('.hero__kicker', { opacity: 0, x: -20, duration: 0.6 }, 0.1)
    .from('.hero__sub, .hero__cta > *, .hero__hint', { opacity: 0, y: 24, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, 0.35)
    .from('.top', { yPercent: -100, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.2);
  if (seat) tl.to(seat.extra, { intro: 1, duration: 2.2, ease: 'power2.inOut' }, 0);
  return tl;
}

function buildFilm() {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: film, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  });
  tl.set({}, {}, 100);
  // Hero çıkışı
  tl.to('.hero__title .ln', { yPercent: -60, opacity: 0, stagger: 0.8, duration: 5 }, 1)
    .to('.hero__kicker, .hero__sub, .hero__cta, .hero__hint', { y: -40, opacity: 0, duration: 4, stagger: 0.5 }, 0.5);

  // Adımlar
  const W = [[8, 19.5], [20, 32.5], [33, 45.5], [46, 60.5], [61, 76]];
  $$('.step').forEach((el, i) => {
    const [a, b] = W[i];
    const title = splitChars($('.step__title', el));
    tl.set(el, { visibility: 'visible' }, a - 0.01)
      .fromTo($('.step__no span', el), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 2.2 }, a)
      .fromTo(title.chars, { yPercent: 115, rotate: 6 }, { yPercent: 0, rotate: 0, stagger: 0.07, duration: 2.4 }, a + 0.3)
      .fromTo($('.step__text', el), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 2 }, a + 1.4)
      .to(title.chars, { yPercent: -115, stagger: 0.04, duration: 2 }, b - 2.4)
      .to([$('.step__no span', el), $('.step__text', el)], { opacity: 0, y: -30, duration: 1.8 }, b - 2.2)
      .set(el, { visibility: 'hidden' }, b);
  });

  // Isıtma bölümünde turuncu parıltı
  tl.fromTo(glow, { '--heat': 0 }, { '--heat': 1, duration: 8 }, 62).to(glow, { '--heat': 0, duration: 5 }, 76);

  // Hizmetler
  const svcs = $$('.svc');
  const head = $('.svcs__head');
  tl.set('#hizmetler', { visibility: 'visible' }, 77)
    .fromTo(head, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 2 }, 77);
  const span = 21 / svcs.length;
  svcs.forEach((el, i) => {
    const a = 79 + i * span;
    const t = $('.svc__title', el);
    tl.set(el, { visibility: 'visible' }, a - 0.01)
      .fromTo(t, { fontStretch: '50%', opacity: 0 }, { fontStretch: '100%', opacity: 1, duration: span * 0.5, ease: 'power2.out' }, a)
      .to(t, { scrambleText: { text: t.dataset.text, chars: 'abcçdefgğhıijklmnoöprsştuüvyz', speed: 0.5 }, duration: span * 0.45 }, a)
      .fromTo([$('.svc__text', el), $('.svc__time', el)], { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: span * 0.1, duration: span * 0.3 }, a + span * 0.2)
      .to($$('.svcs__dots li')[i], { '--on': 1, duration: span * 0.3 }, a);
    if (i < svcs.length - 1) {
      tl.to(el, { opacity: 0, y: -30, duration: span * 0.2 }, a + span * 0.8).set(el, { visibility: 'hidden' }, a + span);
    }
  });
  tl.to('#hizmetler', { opacity: 0, duration: 1.2 }, 98.6);
  tl.fromTo('.film__rail i', { scaleY: 0 }, { scaleY: 1, duration: 100 }, 0);
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
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: her, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
  });
  const total = n + 1;
  tl.set({}, {}, total);
  tl.fromTo(stage, { clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(100% at 50% 55%)', duration: 0.8, ease: 'power2.in' }, 0)
    .fromTo('.her__head', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.4 }, 0.35)
    .fromTo('.her__line', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: n - 0.2 }, 0.8);
  tarihce.forEach((t, i) => {
    const s = 0.8 + i;
    const ph = phs[i];
    const card = cards[i];
    const split = splitChars($('h3', card));
    if (i > 0) {
      tl.fromTo(ph, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.inOut' }, s - 0.15)
        .fromTo(odo, { v: tarihce[i - 1].goster }, { v: t.goster, duration: 0.4, ease: 'power1.inOut', immediateRender: false, onUpdate: () => setOdo(odo.v) }, s - 0.15)
        .to(cards[i - 1], { opacity: 0, y: -40, duration: 0.2 }, s - 0.2);
    } else {
      tl.fromTo(ph, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.01 }, 0);
    }
    tl.fromTo($('.her__col', ph), { opacity: 0 }, { opacity: 1, duration: 0.55 }, s + 0.15)
      .fromTo($$('img', ph), { scale: 1.18 }, { scale: 1, duration: 1.2 }, s - 0.2)
      .fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.05 }, s)
      .fromTo($('.her__year', card), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.25 }, s)
      .fromTo(split.chars, { yPercent: 110 }, { yPercent: 0, stagger: 0.008, duration: 0.3 }, s + 0.05)
      .fromTo($('p:last-child', card), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, s + 0.2);
  });
  tl.to(stage, { clipPath: 'circle(0% at 50% 45%)', duration: 0.8, ease: 'power2.out' }, n + 0.2);
  odo.v = tarihce[0].goster;
  setOdo(odo.v);
}

function buildConfigIn() {
  gsap.fromTo('.cfg__panel', { opacity: 0, y: 80 }, {
    opacity: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: cfg, start: 'top 95%', end: 'top 35%', scrub: 0.5 },
  });
  gsap.fromTo('.cfg__panel .chip', { opacity: 0, scale: 0.6 }, {
    opacity: 1, scale: 1, stagger: 0.02, ease: 'back.out(2)',
    scrollTrigger: { trigger: cfg, start: 'top 70%', end: 'top 20%', scrub: 0.5 },
  });
  ScrollTrigger.create({
    trigger: cfg, start: 'top 50%', once: true,
    onEnter: () => seat && gsap.fromTo(seat.extra, { restitch: 0 }, { restitch: 1, duration: 2.2, ease: 'none' }),
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
  gsap.fromTo('.visit__info > *', { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, stagger: 0.1, ease: 'power3.out', duration: 0.9,
    scrollTrigger: { trigger: '#iletisim', start: 'top 70%', once: true },
  });
}

function syncFootHeight() {
  // Mobil aksiyon çubuğu için body'ye eklenen alt boşluk da son ekranın parçası
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
  gsap.fromTo(words, { yPercent: 120, fontStretch: '50%', opacity: 0 }, {
    yPercent: 0, fontStretch: '100%', opacity: 1, stagger: 0.15, ease: 'none',
    scrollTrigger: { trigger: fin, start: 'top 85%', end: 'top 20%', scrub: 0.5 },
  });
  gsap.fromTo('.fin__note, .fin__cta', { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: fin, start: 'top 45%', end: 'top 8%', scrub: 0.5 },
  });
}

// --- Açılış ------------------------------------------------------------------

function runIntro() {
  const intro = $('#intro');
  const count = $('.intro__count');
  const name = $('.intro__name');
  const nameChars = new SplitText(name, { type: 'chars' }).chars;
  const p = { v: 0 };
  let ready = !seat;
  seat?.ready.then(() => (ready = true)).catch(() => (ready = true));
  gsap.set('.intro__stitch', { strokeDashoffset: 600 });
  gsap.from(nameChars, { yPercent: 100, opacity: 0, fontStretch: '150%', stagger: 0.03, duration: 0.9, ease: 'expo.out' });
  const prog = gsap.to(p, {
    v: 100, duration: 1.3, ease: 'power1.inOut',
    onUpdate: () => {
      const v = ready ? p.v : Math.min(p.v, 92);
      count.textContent = String(Math.round(v)).padStart(3, '0');
      gsap.set('.intro__stitch', { strokeDashoffset: 600 - v * 6 });
      if (p.v >= 100 && ready) done();
    },
    onComplete: () => {
      if (ready) done();
      else seat.ready.finally(done);
    },
  });
  let finished = false;
  function done() {
    if (finished) return;
    finished = true;
    prog.kill();
    count.textContent = '100';
    gsap.set('.intro__stitch', { strokeDashoffset: 0 });
    const tl = gsap.timeline();
    tl.to('.intro__center', { scale: 0.92, opacity: 0, duration: 0.35, ease: 'power2.in' })
      .to('.intro__skip', { opacity: 0, duration: 0.25 }, 0)
      .to('.intro__half--top', { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, 0.2)
      .to('.intro__half--bot', { yPercent: 100, duration: 0.8, ease: 'expo.inOut' }, 0.2)
      .add(heroIn(), 0.4)
      .call(() => {
        intro.remove();
        lenis?.start();
        ScrollTrigger.refresh();
      }, null, 1.0);
  }
  intro.addEventListener('pointerdown', () => {
    if (ready) done();
    else gsap.to(p, { v: 100, duration: 0.3 });
  });
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
  buildFilm();
  buildHeritage();
  buildConfigIn();
  buildProof();
  buildFinale();
  ScrollTrigger.addEventListener('refresh', buildKeys);
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  buildKeys();
  runIntro();
}
