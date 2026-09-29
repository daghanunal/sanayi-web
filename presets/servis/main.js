import '../../shared/base.css';
import './style.css';
import ortak from '../../data/bakim.json';
import ozel from '../../data/servis.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld, DEFAULTS } from './scene.js';

// Servis: sinematik aile, bol 3D. Aydınlık serviste liftteki araç; Hizmetler'de kamera tek, kesintisiz bir
// yolda aracın sistemlerini gezer, her hizmette ilgili parça yerinden çıkar ya da patlatılır. Periyodik
// bakım hesaplayıcısı zamanı gelen parçaları araçta işaretler; şikâyet seçici kamerayı ilgili sisteme
// götürür. Hesaplayıcıdan sonra sahne çizilmez; gerisi düz site bölümleri.
gsap.registerPlugin(SplitText);

const d = boot({ ...ortak, ...ozel });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const phoneMq = matchMedia('(max-width: 899px)');
const phone = phoneMq.matches;
phoneMq.addEventListener('change', () => location.reload());

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const st = gunDurumu(d.saatler);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const trLower = (s) => String(s).toLocaleLowerCase('tr');
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
let dirty = true; // 3D yeniden çizilsin
const kick = () => (dirty = true);

// Parça etiketleri (3D'deki düğüm → ad)
const PARCA = {
  engine: 'Motor', oil_filter: 'Yağ filtresi', dipstick: 'Yağ çubuğu', oil_pan: 'Karter', timing: 'Triger kayışı',
  tensioner: 'Gergi rulmanı', coils: 'Bobin ve bujiler', fuel_rail: 'Enjektör rampası', alternator: 'Şarj dinamosu',
  gearbox: 'Şanzıman', gears: 'Vites dişlileri', clutch: 'Debriyaj rulmanı', radiator: 'Radyatör', fan: 'Fan',
  rad_cap: 'Radyatör kapağı', battery: 'Akü', terminal: 'Kutup başı', ac: 'Klima kompresörü', ac_clutch: 'Kompresör kavraması',
  muffler: 'Susturucu', catalyst: 'Katalitik konvertör', flex: 'Esnek boru', dpf: 'DPF', tailpipe: 'Egzoz çıkışı',
  disc: 'Fren diski', caliper: 'Kaliper ve balata', tyre: 'Lastik', rim: 'Jant', damper: 'Amortisör', spring: 'Helezon yay',
  arm: 'Salıncak ve rotil', head: 'Far', dash: 'Gösterge paneli', carwheel: 'Fren ve lastik',
};

// Kamera durakları (masaüstü değerleri; telefonda uzaklık ve kadraj ekrana göre ayarlanır).
// tx/ty/tz = bakılan nokta (ty lifte göre), az = araç çevresindeki açı (0 = sağ yan, π/2 = ön), el = yükseklik açısı.
const SHOT = {
  hero: { tx: 0.3, ty: 0.7, az: 0.95, el: 0.12, dist: 5.9, fov: 38, psy: innerHeight < 780 ? 0.31 : 0.27 },
  head: { tx: 0.3, ty: 0.85, az: 1.2, el: 0.3, dist: 6.2, lift: 0.12 },
  plan: { tx: 0.8, ty: 0.8, az: 0.85, el: 0.55, dist: 6.4, lift: 0.12, hood: 1 },
};
const GROUP_SHOT = {
  bakim: { tx: 1.1, ty: 0.85, az: 0.95, el: 0.5, dist: 5.8, lift: 0.12, hood: 1 },
  motor: { tx: 1.7, ty: 1.3, az: 0.8, el: 0.25, dist: 4.8, lift: 0.12, hood: 1, engUp: 1 },
  alt: { tx: 0.1, ty: 0.75, az: 0.5, el: -0.02, dist: 7.4, lift: 0.9, follow: 0.6 },
  elektrik: { tx: 1.2, ty: 0.9, az: 1.0, el: 0.45, dist: 5.4, lift: 0.12, hood: 1 },
};
// Hizmet → durak. `parca` anahtarı ortak veriden gelir; aynı anahtar iki kez gelirse ikinci durak yakın plandır.
const SVC_SHOT = {
  yag: [
    { tx: 1.55, ty: 0.85, az: 1.1, el: 0.75, dist: 3.0, lift: 0.12, hood: 1, oil: 0.35, focus: ['oil_filter', 'coils'], tags: ['oil_filter', 'dipstick', 'coils'], pk: 0.55 },
    { tx: 1.85, ty: 0.62, tz: 0.1, az: 1.3, el: 0.62, dist: 2.3, lift: 0.12, hood: 1, oil: 1, focus: ['oil_filter'], tags: ['oil_filter', 'dipstick'], pk: 0.5 },
  ],
  arac: [{ tx: -0.2, ty: 0.7, az: -0.8, el: 0.16, dist: 6.2, lift: 0.4, lights: 1, tags: ['carwheel', 'tailpipe'] }],
  motor: [{ tx: 2.0, ty: 1.45, tz: 0.1, az: 0.8, el: 0.3, dist: 2.7, lift: 0.12, hood: 1, engUp: 1, engEx: 0.5, tags: ['engine', 'alternator', 'fuel_rail'], pk: 0.55 }],
  triger: [{ tx: 2.0, ty: 1.4, tz: 0.35, az: 0.25, el: 0.18, dist: 2.3, lift: 0.12, hood: 1, engUp: 1, engEx: 0.08, timing: 1, focus: ['timing'], tags: ['timing', 'tensioner'], pk: 0.5 }],
  sanziman: [{ tx: 1.85, ty: 1.35, tz: -0.55, az: 1.2, el: 0.28, dist: 2.7, lift: 0.12, hood: 1, engUp: 1, engTurn: 0.75, gbOut: 1, gbEx: 1, tags: ['gearbox', 'gears', 'clutch'], pk: 0.55 }],
  fren: [{ tx: 1.4, ty: 0.3, tz: 1.1, az: 0.55, el: 0.04, dist: 2.5, lift: 0.85, wheelOut: 1, wheelEx: 0.9, focus: ['brake'], tags: ['disc', 'caliper'], pk: 0.5 }],
  suspansiyon: [{ tx: 1.37, ty: 0.45, tz: 0.8, az: 0.35, el: 0.1, dist: 2.1, lift: 0.85, wheelOut: 1, wheelX: 1, strut: 1, focus: ['strut'], tags: ['damper', 'spring', 'arm'], pk: 0.5 }],
  lastik: [{ tx: 1.4, ty: 0.3, tz: 1.35, az: 0.12, el: 0.06, dist: 2.2, lift: 0.85, wheelOut: 1, wheelSpin: 1, tags: ['tyre', 'rim'], pk: 0.5 }],
  egzoz: [{ tx: -0.4, ty: 0.02, tz: 0.2, az: 0.35, el: -0.45, dist: 4.3, lift: 1, exhDrop: 1, exhEx: 0.6, focus: ['exhaust'], tags: ['muffler', 'catalyst', 'flex', 'dpf'], ph: { tx: -0.6, tz: 0.15, az: -1.15, el: -0.32, dist: 1.9 } }],
  ariza: [{ tx: 0.35, ty: 0.95, tz: -0.3, az: 1.3, el: 0.3, dist: 2.5, lift: 0.12, dash: 1, tags: ['dash'], pk: 0.55 }],
  aku: [{ tx: 1.5, ty: 1.02, tz: -1.3, az: 1.9, el: 0.4, dist: 2.0, lift: 0.12, hood: 1, batUp: 1, batEx: 0.8, focus: ['battery'], tags: ['battery', 'terminal'], pk: 0.5 }],
  klima: [{ tx: 2.15, ty: 0.95, tz: 0.72, az: 1.0, el: 0.25, dist: 1.7, lift: 0.12, hood: 1, acUp: 1, acEx: 0.8, acSpin: 1, focus: ['ac'], tags: ['ac', 'ac_clutch'], pk: 0.5 }],
  sogutma: [{ tx: 3.0, ty: 0.9, az: 1.1, el: 0.2, dist: 2.7, lift: 0.12, hood: 1, radOut: 1, radEx: 0.8, fanSpin: 1, tags: ['radiator', 'fan', 'rad_cap'], pk: 0.55 }],
  far: [{ tx: 2.2, ty: 0.68, az: 1.08, el: 0.08, dist: 4.1, lift: 0.12, lights: 1, focus: ['head'], tags: ['head'] }],
};
// Periyodik bakım kalemi → araçtaki parça
const PLAN_MAP = [
  { re: /motor yağı|yağ filtresi/i, keys: ['oil_filter'], up: { oil: 1 } },
  { re: /fren ve lastik/i, keys: [], tags: ['carwheel'] },
  { re: /klima/i, keys: ['ac'], up: { acUp: 0.55 } },
  { re: /akü/i, keys: ['battery'], up: { batUp: 0.6 } },
  { re: /buji/i, keys: ['coils'], tags: ['coils'] },
  { re: /antifriz/i, keys: ['radiator'], up: { radOut: 0.45 }, tags: ['radiator'] },
  { re: /triger/i, keys: ['timing'], up: { timing: 0.8 }, tags: ['timing'] },
  { re: /şanzıman/i, keys: ['gearbox'], up: { gbOut: 0.5 }, tags: ['gearbox'] },
  { re: /fren hidroliği/i, keys: [], tags: ['carwheel'] },
];

const groups = d.gruplar.map((g) => ({ ...g, items: [] }));
const seen = {};
const services = d.hizmetler.map((h, i) => {
  const n = (seen[h.parca] = (seen[h.parca] ?? -1) + 1);
  const shots = SVC_SHOT[h.parca] || SVC_SHOT.arac;
  const shot = shots[Math.min(n, shots.length - 1)];
  const s = { ...h, i, shot, parts: [...new Set((shot.tags || []).map((k) => PARCA[k]))] };
  groups.find((g) => g.id === h.grup)?.items.push(s);
  return s;
});

// --- Render ----------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 28 24" aria-hidden="true"><path d="M3 22V4m22 18V4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 15h22" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 12.5c.6-2.4 2-3.5 4-3.5h6c2 0 3.4 1.1 4 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const arrow = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne">${logo}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#bakim-plani">Periyodik bakım</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn btn--main btn--sm" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('#sahne').innerHTML = `
  <div class="hero__inner">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div class="kunye__tel"><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--main" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

const svcWa = (s) => waHref(d, `Merhaba ${d.isletme.ad}, ${trLower(s.baslik)} için bilgi ve randevu almak istiyorum.`);
$('#hizmetler').innerHTML = `
  <div class="services__head" data-st="head">
    <div class="services__intro">
      <h2 class="h2" id="services-title">Hizmetler</h2>
      <p class="sub">Dört grupta ${services.length} hizmet. Süreler yaklaşıktır, araca göre değişir. Fiyat ve randevu için arayın.</p>
      <nav class="groups" aria-label="Hizmet grupları">
        ${groups.map((g, i) => `<a href="#grup-${g.id}"><span class="mono">0${i + 1}</span>${esc(g.ad)}<small>${g.items.length}</small></a>`).join('')}
      </nav>
    </div>
    <div class="pick" role="group" aria-labelledby="pick-title">
      <h3 class="pick__title" id="pick-title">Şikâyete göre hizmet</h3>
      <div class="pick__chips" data-lenis-prevent-touch>
        ${d.belirtiler.map((b) => `<button type="button" class="chip" aria-pressed="false" data-b="${esc(b.id)}">${esc(b.metin)}</button>`).join('')}
      </div>
      <div class="pick__out" id="pick-out" aria-live="polite"></div>
    </div>
  </div>
  ${groups.map((g, gi) => `
    <div class="grp" id="grup-${g.id}">
      <article class="svc svc--grp" data-st="g-${g.id}">
        <div class="card card--grp">
          <p class="card__tag mono"><span>Hizmet grubu</span><span>0${gi + 1} / 0${groups.length}</span></p>
          <h3 class="card__grp">${esc(g.ad)}</h3>
          <ol class="card__list">${g.items.map((s) => `<li><a href="#h-${s.i}">${esc(s.baslik)}</a></li>`).join('')}</ol>
        </div>
      </article>
      ${g.items.map((s) => `
        <article class="svc" id="h-${s.i}" data-st="svc-${s.i}">
          <div class="card">
            <p class="card__tag mono"><span>${esc(g.ad)}</span><span>${String(s.i + 1).padStart(2, '0')} / ${services.length}</span></p>
            <h3 class="card__title">${esc(s.baslik)}</h3>
            ${s.parts.length ? `<p class="card__parts">${s.parts.map(esc).join(' · ')}</p>` : ''}
            <p class="card__text">${esc(s.aciklama)}</p>
            <div class="card__foot">
              ${s.sure ? `<p class="card__time">Süre <b>${esc(s.sure)}</b></p>` : '<p class="card__time">Süre araca göre değişir</p>'}
              <a class="card__wa" href="${svcWa(s)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan sor</span></a>
            </div>
          </div>
        </article>`).join('')}
    </div>`).join('')}`;

const P = d.periyodik;
$('#bakim-plani').innerHTML = `
  <div class="plan__inner" data-st="plan">
    <div class="plan__panel">
      <h2 class="h2" id="plan-title">Periyodik bakım</h2>
      <p class="sub" id="plan-note">Aracın kilometresine göre sıradaki bakımda yapılacak işler listelenir. Hesap 15 bin km aralıkla yapılır. ${esc(P.not)}</p>
      <div class="km">
        <label class="km__label" for="km-in">Aracın kilometresi</label>
        <div class="km__row">
          <button type="button" class="km__step" data-d="-5000" aria-label="5.000 km azalt">−</button>
          <span class="km__field"><input class="km__in" id="km-in" inputmode="numeric" autocomplete="off" enterkeyhint="done" value="62.000" aria-describedby="plan-note"><span class="km__unit">km</span></span>
          <button type="button" class="km__step" data-d="5000" aria-label="5.000 km artır">+</button>
        </div>
        <input class="km__range" id="km-range" type="range" min="0" max="300000" step="5000" value="62000" aria-label="Kilometre">
        <div class="km__ticks" aria-hidden="true">${[0, 60, 120, 180, 240, 300].map((k) => `<span>${k ? `${k} bin` : '0'}</span>`).join('')}</div>
      </div>
      <div class="plan__out" id="plan-out" aria-live="polite"></div>
      <a class="btn btn--main plan__wa" id="plan-wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan randevu iste</span></a>
      <div class="plan__all">
        <button type="button" class="plan__toggle" aria-expanded="false" aria-controls="plan-table">Bütün bakım aralıkları</button>
        <table class="plan__table" id="plan-table" hidden>
          <caption class="sr-only">Periyodik bakım aralıkları</caption>
          <tbody>${P.adimlar.map((a) => `<tr><th scope="row">${esc(a.aralik)}</th><td>${a.isler.map(esc).join(', ')}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>
  </div>`;

$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__main">
      <h2 class="h2" id="about-title" data-reveal>Hakkında</h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div><dt>Haftada açık</dt><dd><b>${acikGunSayisi(d.saatler)}</b> gün</dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="wrap steps">
    <h3 class="h3">Çalışma sırası</h3>
    <ol class="steps__list">
      ${d.surec.map((s, i) => `<li><span class="mono">0${i + 1}</span><b>${esc(s.baslik)}</b><p>${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
  </div>
  ${d.galeri?.length ? `
  <div class="wrap">
    <ul class="gallery">
      ${d.galeri.map((g) => `<li class="gallery__item"><figure><div class="gallery__img"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="${g.w}" height="${g.h}"></div><figcaption>${esc(g.baslik)}</figcaption></figure></li>`).join('')}
    </ul>
  </div>` : ''}`;

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <h2 class="h2" id="visit-title" data-reveal>Çalışma saatleri ve konum</h2>
      <p class="visit__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, h]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="actions">
        <a class="btn btn--main" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="h2" id="reviews-title" data-reveal>Örnek yorumlar</h2>
    <p class="sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="reviews__track wrap" tabindex="0" aria-label="Örnek yorumlar" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="review">
        ${stars(y.puan)}
        <p>${esc(y.metin)}</p>
        <span class="review__who"><b>${esc(y.ad)}</b> ${esc(y.arac)}</span>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="h1" id="final-title" data-reveal>İletişim</h2>
    <div class="finale__side">
      <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
      <div class="actions">
        <a class="btn btn--main btn--lg" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        <a class="btn btn--ghost btn--lg" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      </div>
      <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
    </div>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p class="foot__brand">${logo}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)}<br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. 3D görseller temsilîdir, araç belirli bir marka ya da modeli göstermez. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. Yorumlar örnektir.</p>
  </div>`;

new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Etkileşim 1: şikâyet seçici ---------------------------------------------------------

const picked = new Set();
let pickShot = null;
function renderPick() {
  const list = d.belirtiler.filter((b) => picked.has(b.id));
  const keys = [...new Set(list.flatMap((b) => b.parca))];
  const hits = services.filter((s) => keys.includes(s.parca));
  const out = $('#pick-out');
  pickShot = hits[0]?.shot ?? null;
  if (!list.length) {
    out.innerHTML = `<p class="pick__hint">Şikâyet seçilince ilgili hizmetler ve hazır bir WhatsApp mesajı burada çıkar. Araçta ilgili sistem gösterilir.</p>`;
    return;
  }
  const cumle = list.map((b) => trLower(b.metin)).join(', ');
  const msg = `Merhaba ${d.isletme.ad}, aracımda ${list.length > 1 ? 'şu şikâyetler var' : 'şu şikâyet var'}: ${cumle}. Bakmanız için randevu almak istiyorum.`;
  out.innerHTML = `
    <p class="pick__label mono">İlgili hizmetler</p>
    <ul class="pick__hits">${hits.map((s) => `<li><a href="#h-${s.i}">${esc(s.baslik)}${arrow}</a></li>`).join('')}</ul>
    <a class="btn btn--main pick__wa" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Şikâyeti WhatsApp'tan yaz</span></a>`;
}
$$('.chip').forEach((b) => b.addEventListener('click', () => {
  const on = !picked.has(b.dataset.b);
  on ? picked.add(b.dataset.b) : picked.delete(b.dataset.b);
  b.setAttribute('aria-pressed', String(on));
  renderPick();
  kick();
}));
renderPick();

// --- Etkileşim 2: periyodik bakım hesaplayıcısı -----------------------------------------

const STEP = 15000;
let planKeys = [], planTags = [], planUp = {};
function calc(km) {
  const next = Math.max(STEP, Math.ceil(km / STEP) * STEP);
  const due = [];
  const [a0, a1, a2, a3, a4] = P.adimlar;
  if (a0) due.push(a0);
  if (a1) due.push(a1);
  if (a2 && next % (STEP * 2) === 0) due.push(a2);
  if (a4 && next % (STEP * 4) === 0) due.push(a4);
  return { next, due, time: a3 };
}
const kmIn = $('#km-in');
const kmRange = $('#km-range');
let km = 62000;
function setKm(v, from) {
  km = clamp(Math.round(Number(v) || 0), 0, 400000);
  if (from !== 'in') kmIn.value = fmt(km);
  if (from !== 'range') kmRange.value = String(Math.min(300000, km));
  kmRange.style.setProperty('--p', `${(Math.min(300000, km) / 300000) * 100}%`);
  const r = calc(km);
  // aynı bakımda "Hava filtresi" değişecekse "Hava filtresi kontrolü" ayrıca yazılmaz
  const hepsi = r.due.flatMap((a) => a.isler);
  const fazla = (x) => hepsi.some((y) => y !== x && x.startsWith(y + ' '));
  r.due = r.due.map((a) => ({ ...a, isler: a.isler.filter((x) => !fazla(x)) })).filter((a) => a.isler.length);
  const items = r.due.flatMap((a) => a.isler.map((x) => ({ x, aralik: a.aralik })));
  $('#plan-out').innerHTML = `
    <p class="plan__next"><span>Sıradaki bakım</span><b>${fmt(r.next)} km</b></p>
    ${[...r.due, ...(r.time ? [r.time] : [])].map((a) => `
      <div class="plan__group${a === r.time ? ' is-time' : ''}">
        <p class="mono">${esc(a.aralik)}</p>
        <ul>${a.isler.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`).join('')}`;
  const msg = `Merhaba ${d.isletme.ad}, aracım ${fmt(km)} km'de. ${fmt(r.next)} km periyodik bakımı için randevu almak istiyorum.`;
  $('#plan-wa').href = waHref(d, msg);
  // zamanı gelen parçalar araçta
  const all = [...items.map((i) => i.x), ...(r.time?.isler || [])];
  planKeys = [];
  planTags = [];
  planUp = {};
  for (const x of all) {
    for (const m of PLAN_MAP) {
      if (!m.re.test(x)) continue;
      planKeys.push(...m.keys);
      planTags.push(...(m.tags || m.keys));
      Object.assign(planUp, m.up || {});
    }
  }
  planKeys = [...new Set(planKeys)];
  planTags = [...new Set(planTags)];
  kick();
}
kmIn.addEventListener('input', () => {
  const digits = kmIn.value.replace(/\D/g, '').slice(0, 6);
  setKm(Number(digits), 'in');
});
kmIn.addEventListener('blur', () => (kmIn.value = fmt(km)));
kmIn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    setKm(km + (e.key === 'ArrowUp' ? 5000 : -5000));
  }
  if (e.key === 'Enter') kmIn.blur();
});
kmRange.addEventListener('input', () => setKm(kmRange.value, 'range'));
$('.plan__toggle').addEventListener('click', (e) => {
  const b = e.currentTarget;
  const open = b.getAttribute('aria-expanded') !== 'true';
  b.setAttribute('aria-expanded', String(open));
  $('#plan-table').hidden = !open;
  requestAnimationFrame(() => { measure(); ScrollTrigger.refresh(); });
});
$$('.km__step').forEach((b) => b.addEventListener('click', () => setKm(km + Number(b.dataset.d))));
setKm(km);

// --- 3D ---------------------------------------------------------------------------------

const canvas = $('#gl');
const tagCanvas = $('#tags');
const tctx = tagCanvas.getContext('2d');
const world = createWorld(canvas, { phone });
let tagDpr = 1;
const rootStyle = getComputedStyle(document.documentElement);

const HALL_BOX = [[-6.8, 6.8], [0.25, 6.2], [-6.3, 6.5]];
// Durak: ekranın biçimine göre kamera
function frame(s) {
  const a = innerWidth / innerHeight;
  const o = { ...DEFAULTS, follow: 1, ...s, ...(a < 1.25 && s.ph ? s.ph : {}) };
  const ref = 1.6;
  if (a < 1.25 || innerWidth < 900) {
    const k = a < 1.25 ? Math.pow(ref / a, s.pk ?? 0.72) : 1;
    o.dist *= k;
    o.fov += 4;
    o.sx = 0;
    o.sy = a >= 1.25 ? 0.08 : s.psy ?? (a < 0.8 ? 0.17 : 0.12); // özne üst yarıda, kart altta
  } else {
    o.sx = a > 1.45 ? 0.17 : 0.14; // özne sağda, kartlar solda
    if (innerHeight < 860) o.dist *= 1.04;
  }
  // kamera holün içinde kalır (duvarın arkasına geçmez); gerekirse yaklaşır
  const ce = Math.cos(o.el);
  const dir = [Math.sin(o.az) * ce, Math.sin(o.el), Math.cos(o.az) * ce];
  const t = [o.tx, o.ty + (o.lift * 1.75 - 0.06) * (o.follow ?? 1), o.tz];
  for (let i = 0; i < 3; i++) {
    const [lo, hi] = HALL_BOX[i];
    if (dir[i] > 1e-4) o.dist = Math.min(o.dist, (hi - t[i]) / dir[i]);
    if (dir[i] < -1e-4) o.dist = Math.min(o.dist, (lo - t[i]) / dir[i]);
  }
  delete o.focus;
  delete o.tags;
  delete o.pk;
  delete o.ph;
  delete o.psy;
  return o;
}

// Kaydırma yolu: her durak bir öğeye bağlı; öğenin ortası ekran ortasından geçerken durak tam oturur.
const stops = [];
const addStop = (el, get) => stops.push({ el, get, y: 0 });
addStop($('#sahne'), () => ({ shot: SHOT.hero }));
addStop($('.pick'), () => {
  if (pickShot) return { shot: pickShot, focus: pickShot.focus, tags: pickShot.tags };
  return { shot: SHOT.head };
});
for (const g of groups) {
  addStop($(`#grup-${g.id} .svc--grp`), () => ({ shot: GROUP_SHOT[g.id] || SHOT.head }));
  for (const s of g.items) addStop($(`#h-${s.i}`), () => ({ shot: s.shot, focus: s.shot.focus, tags: s.shot.tags, svc: s.i }));
}
addStop($('.plan__panel'), () => ({ shot: { ...SHOT.plan, ...planUp }, focus: planKeys, tags: planTags }));

const absTop = (el) => el.getBoundingClientRect().top + scrollY;
function measure() {
  const vh = innerHeight;
  stops.forEach((s, i) => {
    if (i === 0) { s.y = 0; return; }
    s.y = absTop(s.el) + s.el.offsetHeight / 2 - vh / 2;
    // ekrandan uzun öğe (kısa yatay ekranda panel): üstü başlığın altına gelince durak oturur
    if (s.el.classList.contains('plan__panel') && innerWidth < 900) s.y = absTop(s.el) - vh * 0.42; // telefon: üstte sahne, altta kilometre
    else if (s.el.offsetHeight > vh * 0.86 && !s.el.classList.contains('svc')) s.y = absTop(s.el) - (parseFloat(rootStyle.getPropertyValue('--header-h')) || 64) - 16;
    if (phone && s.el.classList.contains('svc')) {
      // telefonda kart ekranın altında yapışık durduğu aralığın ortası
      const ch = s.el.firstElementChild.offsetHeight;
      s.y = absTop(s.el) + s.el.offsetHeight / 2 - vh + 12 + bs + ch / 2;
    }
  });
  for (let i = 1; i < stops.length; i++) stops[i].y = Math.max(stops[i].y, stops[i - 1].y + 40);
  for (const k of ['wheelSpin', 'fanSpin', 'acSpin']) {
    const st = stops.find((x) => x.get().shot?.[k]);
    if (st) spinRef[k] = st.y;
  }
}
const spinRef = {};

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const HOLD = 0.16;
const T = { ...DEFAULTS }; // hedef
const D = world.P; // gösterilen (sönümlü)
let focusNow = [], tagsNow = [], tagAlpha = 0;

function target(y) {
  let i = 0;
  while (i < stops.length - 1 && y >= stops[i + 1].y) i++;
  const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
  const t = b === a ? 0 : clamp((y - a.y) / (b.y - a.y));
  const te = easeIO(clamp((t - HOLD) / (1 - 2 * HOLD)));
  const A = a.get(), B = b.get();
  const fa = frame(A.shot), fb = frame(B.shot);
  for (const k in fa) T[k] = fa[k] + ((fb[k] ?? DEFAULTS[k] ?? 0) - fa[k]) * te;
  const near = te < 0.5 ? A : B;
  const m = clamp((Math.abs(te - 0.5) * 2 - 0.25) / 0.6);
  T.hl = near.focus?.length ? m : 0;
  T.tags = near.tags?.length ? m : 0;
  focusNow = near.focus || [];
  tagsNow = near.tags || [];
  // dönen parçalar kaydırmayla döner, kullanıcı durunca durur
  // açı, o parçanın durağına göre: durakta 0, kaydırdıkça döner, ağırlık uzaklaştıkça söner
  T.wheelSpinW = T.wheelSpin;
  T.wheelSpin *= (y - (spinRef.wheelSpin ?? y)) * 0.008;
  T.fanSpin *= (y - (spinRef.fanSpin ?? y)) * 0.02;
  T.acSpin *= (y - (spinRef.acSpin ?? y)) * 0.02;
  return near;
}

const last = {};
function step(dt) {
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
  let moved = dirty;
  for (const key in T) {
    const cur = D[key] ?? T[key];
    const next = cur + (T[key] - cur) * k;
    if (Math.abs(next - (last[key] ?? Infinity)) > 1e-4) moved = true;
    D[key] = next;
  }
  const ta = tagAlpha + (T.tags - tagAlpha) * Math.min(1, k * 1.4);
  if (Math.abs(ta - tagAlpha) > 1e-3) moved = true;
  tagAlpha = ta;
  if (!moved) return false;
  for (const key in D) last[key] = D[key];
  dirty = false;
  return true;
}

// Canvas yalnız künye, hizmetler ya da periyodik bakım görünürken çizilir
let canvasOn = true;
const vis = new Set();
{
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
    const on = vis.size > 0;
    if (on !== canvasOn) {
      canvasOn = on;
      document.documentElement.classList.toggle('gl-off', !on);
      if (on) kick();
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  ['#sahne', '#hizmetler', '#bakim-plani'].forEach((s) => io.observe($(s)));
}

// Kartlar: telefonda yalnız yapışık kart görünür; masaüstünde etkin kart öne çıkar
const svcEls = $$('.svc');
let bs = 0;
function cardSizes() {
  bs = parseFloat(rootStyle.getPropertyValue('--bar-space')) || 0;
  svcEls.forEach((el) => el.style.setProperty('--card-h', `${el.firstElementChild.offsetHeight}px`));
}
function cardsTick(activeStop) {
  const vh = innerHeight;
  for (const el of svcEls) {
    let on;
    if (phone) {
      const cr = el.firstElementChild.getBoundingClientRect();
      const sr = el.getBoundingClientRect();
      on = cr.top > sr.top + 2 && cr.bottom < sr.bottom - 2 && cr.bottom > vh * 0.5;
    } else {
      on = activeStop?.el === el;
    }
    if (on !== el._on) {
      el._on = on;
      el.classList.toggle('is-active', on);
    }
  }
}

function resize() {
  world.resize(innerWidth, innerHeight);
  tagDpr = Math.min(2, devicePixelRatio || 1);
  tagCanvas.width = Math.round(innerWidth * tagDpr);
  tagCanvas.height = Math.round(innerHeight * tagDpr);
  cardSizes();
  measure();
  kick();
}

// Parça etiketleri: 2D tuvalde, dokunmayı almaz; etkin kartın ve panelin üstüne binmez
function drawTags() {
  const ctx = tctx;
  ctx.setTransform(tagDpr, 0, 0, tagDpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (tagAlpha < 0.02 || !tagsNow.length || !canvasOn) return;
  const fs = phone ? 12 : 13;
  ctx.font = `600 ${fs}px 'Instrument Sans', system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const topLim = (parseFloat(rootStyle.getPropertyValue('--header-h')) || 64) + 10;
  let bottom = innerHeight - 10, left = 10;
  const box = $('.svc.is-active .card');
  const zone = box?.getBoundingClientRect();
  const panel = activeZone();
  if (phone) {
    if (zone && zone.height) bottom = Math.min(bottom, zone.top - 10);
    if (panel) bottom = Math.min(bottom, panel.top - 10);
  } else {
    if (zone && zone.height) left = Math.max(left, zone.right + 16);
    if (panel) left = Math.max(left, panel.right + 16);
  }
  // düz bölümler yukarı gelince etiketler onların üstüne çizilmez
  const solidTop = $('#solid').getBoundingClientRect().top - 8;
  bottom = Math.min(bottom, solidTop);
  const items = [];
  for (const key of tagsNow) {
    const p = world.project(key);
    if (!p) continue;
    const text = PARCA[key];
    if (!text) continue;
    const w = ctx.measureText(text).width + 30;
    const h = fs + 16;
    const right = p.x > innerWidth * 0.62 && !phone;
    items.push({ text, px: p.x, py: p.y, x: right ? p.x - w - 26 : p.x + 26, y: p.y - h - 22, w, h });
  }
  items.sort((a, b) => a.y - b.y);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    it.x = clamp(it.x, left, innerWidth - it.w - 10);
    it.y = Math.max(it.y, topLim);
    for (let j = 0; j < i; j++) {
      const o = items[j];
      if (it.x < o.x + o.w + 6 && o.x < it.x + it.w + 6 && it.y < o.y + o.h + 6) it.y = o.y + o.h + 6;
    }
  }
  ctx.globalAlpha = tagAlpha;
  for (const it of items) {
    if (it.y + it.h > bottom || it.py > bottom || it.px < left - 40) continue;
    const ax = clamp(it.px, it.x, it.x + it.w);
    ctx.strokeStyle = 'rgba(47,123,255,.9)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(it.px, it.py);
    ctx.lineTo(ax, it.y + it.h);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(it.px, it.py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2f7bff';
    ctx.beginPath();
    ctx.arc(it.px, it.py, 2, 0, Math.PI * 2);
    ctx.fill();
    // hap
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.shadowColor = 'rgba(14,22,33,.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.roundRect(it.x, it.y, it.w, it.h, it.h / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#2f7bff';
    ctx.beginPath();
    ctx.arc(it.x + 13, it.y + it.h / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e1621';
    ctx.fillText(it.text, it.x + 22, it.y + it.h / 2 + 0.5);
  }
  ctx.globalAlpha = 1;
}
let activeEl = null;
function activeZone() {
  if (!activeEl) return null;
  const el = activeEl.classList.contains('pick') ? $('.pick') : activeEl.classList.contains('plan__panel') ? $('.plan__panel') : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight ? r : null;
}

// --- Açılış ve döngü ----------------------------------------------------------------------

const intro = { k: reducedMotion ? 1 : 0 };
let introTl = null;
let prevY = -1;
let lastTagKey = '';
function tick(time, dtMs) {
  const dt = Math.min(0.05, (dtMs || 16) / 1000);
  const y = scrollY;
  target(y);
  // açılış: kamera biraz uzaktan ve yandan yerine oturur
  if (intro.k < 1) {
    const e = 1 - intro.k;
    T.dist += 1.6 * e;
    T.az += 0.3 * e;
    T.el += 0.06 * e;
  }
  const moved = step(dt);
  if (y !== prevY) {
    prevY = y;
    const idx = nearestStop(y);
    activeEl = stops[idx]?.el ?? null;
    cardsTick(stops[idx]);
  }
  world.setFocus(focusNow);
  const tagKey = tagsNow.join() + tagAlpha.toFixed(3);
  if (!canvasOn || document.hidden) return;
  if (moved || !world.drawn) {
    world.render();
    world.drawn = true;
    drawTags();
    lastTagKey = tagKey;
  } else if (tagKey !== lastTagKey) {
    drawTags();
    lastTagKey = tagKey;
  }
}
function nearestStop(y) {
  let best = 0, bd = Infinity;
  stops.forEach((s, i) => {
    const dd = Math.abs(s.y - y);
    if (dd < bd) { bd = dd; best = i; }
  });
  return best;
}

// Başlık animasyonu: satır satır, maskeyle
const splits = new Map();
function lines(el, delay = 0) {
  if (reducedMotion || !el) return;
  let sp = splits.get(el);
  if (!sp) {
    sp = new SplitText(el, { type: 'lines', linesClass: 'ln', mask: 'lines' });
    splits.set(el, sp);
  }
  gsap.fromTo(sp.lines, { yPercent: 105 }, { yPercent: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out', delay });
}

const topEl = $('#top');
function start() {
  resize();
  addEventListener('resize', resize);
  addEventListener('load', () => { cardSizes(); measure(); ScrollTrigger.refresh(); kick(); });
  world.ready.then(() => {
    world.drawn = false;
    kick();
    gsap.to(canvas, { autoAlpha: 1, duration: reducedMotion ? 0 : 1.0, ease: 'power2.out' });
    if (!reducedMotion) {
      introTl = gsap.to(intro, { k: 1, duration: 1.6, ease: 'power2.inOut' });
      const skip = () => introTl?.progress(1);
      addEventListener('pointerdown', skip, { once: true, capture: true, passive: true });
      addEventListener('wheel', skip, { once: true, passive: true });
      addEventListener('keydown', skip, { once: true });
    }
  });
  world.partsP.then(() => { world.drawn = false; kick(); });

  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    gsap.ticker.add(tick);
    return;
  }
  initSmoothScroll({ lerp: 0.1 });
  if (phone) autoHideHeader(topEl, { offset: 120 });
  ScrollTrigger.create({
    trigger: '#solid', start: 'top 70px', end: 'max',
    onToggle: (s) => topEl.classList.toggle('is-solid', s.isActive),
  });
  if (phone) {
    // Hizmet kartı ekranın altında tek alt öğe: bu aralıkta alt çubuk çekilir.
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 60%', endTrigger: svcEls.at(-1), end: 'bottom 45%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }
  gsap.ticker.add(tick);

  // Künye: ad satır satır, kalanı sırayla
  lines($('#hero-title'), 0.05);
  gsap.from('.hero__inner > :not(h1)', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.25, ease: 'power3.out', clearProps: 'all' });
  gsap.from('.top > *', { y: -10, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'all' });

  const once = (trigger, startAt = 'top 85%') => ({ trigger, start: startAt, toggleActions: 'play none none none' });
  // Hizmetler başı ve bölüm başlıkları
  $$('.h2, .h1').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => lines(el) });
    if (!splits.has(el)) {
      const sp = new SplitText(el, { type: 'lines', linesClass: 'ln', mask: 'lines' });
      splits.set(el, sp);
      gsap.set(sp.lines, { yPercent: 105 });
    }
  });
  gsap.from('.groups a', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.groups', 'top 90%') });
  gsap.from('.chip', { y: 10, autoAlpha: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.pick', 'top 88%') });
  gsap.from('.km, .plan__out, .plan__wa, .plan__all', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.plan__panel', 'top 80%') });
  gsap.from('.stats > div', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.stats') });
  gsap.from('.facts > div', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.facts') });
  // Çalışma sırası: çizgi kaydırmayla çizilir, adımlar sırayla
  gsap.fromTo('.steps__list', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.steps__list', start: 'top 85%', end: 'bottom 60%', scrub: 0.6 } });
  gsap.from('.steps__list li', { y: 20, autoAlpha: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.steps__list') });
  // Galeri: görseller maskeyle açılır
  $$('.gallery__img').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(12% 8% 12% 8% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.0, ease: 'expo.out', scrollTrigger: once(el, 'top 88%') });
    gsap.fromTo(el.querySelector('img'), { scale: 1.12 }, { scale: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: once(el, 'top 88%') });
  });
  gsap.from('.review', { y: 28, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.reviews__track') });
  gsap.from('.hours tr', { x: -12, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out', clearProps: 'all', scrollTrigger: once('.hours') });
}

gsap.set(canvas, { autoAlpha: 0 });
window.__servis = { stops, world }; // ekran görüntüsü araçları için
const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 900))]);
fontsReady.then(start);
