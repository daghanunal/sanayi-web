import raw from '../../data/depo.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { partSvg } from './parts.js';

// Klasik aile: WebGL yok. Kimlik: basılı yedek parça kataloğu. Katalog kırmızısı, siyah baskı,
// teknik parça çizimleri; bölümler "Bölüm A, B, C" diye numaralı katalog sayfaları.
gsap.registerPlugin(SplitText, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, preset: 'raf' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const urunler = d.urunler ?? [];
const wa = (m) => waHref(d, m ?? `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`);
const no = (i) => String(i + 1).padStart(2, '0');

// --- Üst bar ----------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <span class="top__status"><span class="dot ${st.open ? 'is-open' : ''}"></span><span>${st.open ? 'Açık' : 'Kapalı'}</span></span>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__num">${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__text">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><span class="dot ${st.open ? 'is-open' : ''}"></span>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--wa" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <figure class="hero__shelf" aria-hidden="true">
    <div class="shelf">
      ${urunler.slice(0, 7).map((u, i) => `
        <div class="bin" style="--i:${i}">
          <div class="bin__part">${partSvg(u.parca)}</div>
          <div class="bin__label"><span class="bin__raf">${no(i)}</span><span class="bin__name">${esc(u.baslik)}</span></div>
        </div>`).join('')}
      <div class="bin bin--more"><span>${yas} yıl</span><small>Şaşmaz'da</small></div>
    </div>
    <figcaption class="shelf__caption">Şekil 1. Parça grupları</figcaption>
  </figure>`;

// --- Hizmetler ve parça grupları ---------------------------------------------------

// Katalog plakasındaki parçalar görselde sabittir (3D render); numaralar görseldeki yerleridir.
const PLATE = [
  { ad: 'Fren diski ve kaliper', x: 22, y: 47 },
  { ad: 'Yağ filtresi', x: 29, y: 13 },
  { ad: 'Triger kayışı ve gergi', x: 60, y: 11 },
  { ad: 'Piston ve biyel', x: 44, y: 38 },
  { ad: 'Volan', x: 81, y: 36 },
  { ad: 'Ateşleme bobini', x: 45, y: 76 },
  { ad: 'Silindir kapak cıvatası', x: 70, y: 78 },
];

$('#hizmetler').innerHTML = `
  <header class="sec__head">
    <p class="sec__code">Bölüm A</p>
    <h2 class="sec__title" id="hizmet-title">Hizmetler</h2>
    <p class="sec__lead">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın.</p>
  </header>
  <ol class="svc">
    ${d.hizmetler.map((h, i) => `
      <li class="svc__item">
        <span class="svc__poz">${no(i)}</span>
        <div>
          <h3 class="svc__title">${esc(h.baslik)}</h3>
          <p class="svc__desc">${esc(h.aciklama)}</p>
        </div>
      </li>`).join('')}
  </ol>

  ${urunler.length ? `
  <div class="groups">
    <header class="groups__head">
      <h3 class="groups__title">Parça grupları</h3>
      <p class="sec__lead">Binek ve hafif ticari araçlar için. Her grubun orijinali ve muadili bulunur.</p>
    </header>
    <figure class="plate">
      <div class="plate__img">
        <img src="${asset('/img/raf/katalog-3d.jpg')}" srcset="${asset('/img/raf/katalog-3d-800.jpg')} 800w, ${asset('/img/raf/katalog-3d.jpg')} 1600w" sizes="(min-width: 1100px) 760px, 100vw" alt="Beyaz zeminde yan yana dizilmiş fren diski, triger kayışı, volan, piston, yağ filtresi, ateşleme bobini ve cıvatalar" width="1600" height="1200" loading="lazy" decoding="async" />
        <ol class="plate__pins" aria-hidden="true">${PLATE.map((p, i) => `<li style="--x:${p.x}%;--y:${p.y}%">${i + 1}</li>`).join('')}</ol>
      </div>
      <figcaption>
        <p class="plate__cap">Şekil 2. Örnek parçalar. 3D görsel, temsilîdir.</p>
        <ol class="plate__legend">${PLATE.map((p, i) => `<li><span class="plate__n">${i + 1}</span><span>${esc(p.ad)}</span></li>`).join('')}</ol>
      </figcaption>
    </figure>
    <div class="cat__thead" aria-hidden="true"><span>Poz.</span><span>Grup</span></div>
    <ol class="cat">
      ${urunler.map((u, i) => `
        <li class="row">
          <span class="row__poz">${no(i)}</span>
          <div class="row__fig">${partSvg(u.parca)}</div>
          <div class="row__main">
            <h4 class="row__title">${esc(u.baslik)}</h4>
            <p class="row__desc">${esc(u.aciklama)}</p>
            <ul class="row__tags">${(u.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
          </div>
        </li>`).join('')}
    </ol>
  </div>` : ''}`;

// --- Hakkında ----------------------------------------------------------------------

const foto = d.galeri ?? [];
$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div class="about__text">
      <p class="sec__code">Bölüm B</p>
      <h2 class="sec__title" id="about-title">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler ?? []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Parça bulunan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
      <ul class="stats__grid">
        <li><span class="stat__v" data-count="${yas}" data-suffix=" yıl">${yas} yıl</span><span class="stat__k">Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><span class="stat__v" data-count="${acikGun}" data-suffix=" gün">${acikGun} gün</span><span class="stat__k">haftada açık</span></li>
      </ul>
    </div>
    <div class="about__photos">
      ${[foto[0], foto[3]].filter(Boolean).map((g, i) => `
        <figure class="gal__item gal__item--${i}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" width="1200" height="${i ? 900 : 1500}" loading="lazy" decoding="async" /><figcaption>Şekil ${i + 3}. ${esc(g.alt)}</figcaption></figure>`).join('')}
    </div>
  </div>`;

// --- Çalışma saatleri ve konum -----------------------------------------------------

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="visit__info">
    <p class="sec__code">Bölüm C</p>
    <h2 class="sec__title" id="visit-title">Çalışma saatleri ve konum</h2>
    <p class="visit__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="visit__addr">${esc(d.iletisim.adres)}</p>
    <div class="visit__actions">
      <a class="btn btn--red" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="visit__map" data-map><p>Harita</p></div>`;

// --- Örnek yorumlar ----------------------------------------------------------------

const yildiz = (n) => `<span class="rev__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <p class="sec__code">Bölüm D</p>
    <h2 class="sec__title" id="rev-title">Örnek yorumlar</h2>
    <p class="sec__lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </header>
  <ul class="reviews__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((r) => `
      <li class="rev">
        ${yildiz(r.puan)}
        <p class="rev__text">${esc(r.metin)}</p>
        <p class="rev__who"><strong>${esc(r.ad)}</strong> <span>${esc(r.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim: parça sorgu fişi -----------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__in">
    <div class="final__text">
      <p class="sec__code sec__code--light">Bölüm E</p>
      <h2 class="final__title" id="final-title">İletişim</h2>
      <p class="final__lead">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın. Şasi numarası ya da ruhsatın fotoğrafı parçanın bulunması için yeterlidir.</p>
      <div class="final__actions">
        <a class="btn btn--white btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        <a class="btn btn--lineW btn--big" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      </div>
      <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
    </div>
    <form class="slip" data-slip novalidate>
      <div class="slip__head"><span>Parça sorgu fişi</span><span class="slip__no">WhatsApp ile</span></div>
      <label class="slip__label" for="vin">Şasi numarası</label>
      <div class="vin">
        <div class="vin__cells" aria-hidden="true">${'<span></span>'.repeat(17)}</div>
        <input class="vin__input" id="vin" name="vin" maxlength="17" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" aria-describedby="vin-help" />
      </div>
      <p class="vin__help" id="vin-help"><span data-vin-count>0</span>/17 hane. Şasi numarasında I, O ve Q harfleri bulunmaz; yazılırsa 1 ve 0 olarak düzeltilir.</p>
      ${urunler.length ? `
      <fieldset class="slip__parts">
        <legend class="slip__label">Parça grubu</legend>
        <div class="chips">${urunler.map((u) => `<label class="chip"><input type="checkbox" name="parca" value="${esc(u.baslik)}"><span>${esc(u.baslik)}</span></label>`).join('')}</div>
      </fieldset>` : ''}
      <label class="slip__label" for="not">Not (isteğe bağlı)</label>
      <input class="slip__note" id="not" name="not" placeholder="Örn. ön takım, sol taraf" autocomplete="off" />
      <button class="btn btn--wa slip__send" type="submit">${icons.whatsapp}<span>WhatsApp'tan gönder</span></button>
      <p class="slip__alt">Numara elinizde değilse <a href="${wa(`Merhaba ${d.isletme.ad}, ruhsatımın fotoğrafını gönderiyorum. Parça sormak istiyorum.`)}" target="_blank" rel="noopener">ruhsatın fotoğrafını gönderin</a>.</p>
    </form>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. Parça çizimleri ve 3D görsel bu site için hazırlandı, temsilîdir. Yorumlar örnektir.</p>`;

// --- Fiş: şasi numarası hücreleri --------------------------------------------------

const vin = $('#vin');
const cells = $$('.vin__cells span');
function paintVin() {
  const clean = vin.value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/I/g, '1').replace(/[OQ]/g, '0').slice(0, 17);
  if (vin.value !== clean) vin.value = clean;
  cells.forEach((c, i) => {
    c.textContent = clean[i] ?? '';
    c.classList.toggle('is-filled', i < clean.length);
    c.classList.toggle('is-caret', i === clean.length && document.activeElement === vin);
  });
  $('[data-vin-count]').textContent = clean.length;
  $('.vin').classList.toggle('is-done', clean.length === 17);
}
['input', 'focus', 'blur'].forEach((ev) => vin.addEventListener(ev, paintVin));
paintVin();

$('[data-slip]').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const sasi = f.get('vin');
  const parcalar = f.getAll('parca');
  const not = String(f.get('not') || '').trim();
  const satirlar = [
    `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`,
    sasi ? `Şasi no: ${sasi}${sasi.length < 17 ? ` (${sasi.length} hane)` : ''}` : 'Şasi numarasını ayrıca göndereceğim.',
    parcalar.length ? `Parça grubu: ${parcalar.join(', ')}` : '',
    not ? `Not: ${not}` : '',
  ].filter(Boolean);
  window.open(waHref(d, satirlar.join('\n')), '_blank', 'noopener');
});

// --- Harita: yaklaşınca yükle --------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Hareket -------------------------------------------------------------------------

const header = $('.top');
const solid = () => header.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(header, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Bir kez oynayan tetikleyici (sayfa ortasından açılınca da güvenli).
const bir = (trigger, start = 'top 86%') => ({ trigger, start, toggleActions: 'play none none none' });

if (!reducedMotion) {
  initSmoothScroll();
  root.classList.add('js-motion');

  // Açılış: ad satır satır, künye ve düğmeler; raf gözleri yerine kayar, çizimler kendini çizer (~1 sn).
  const split = new SplitText('.hero__title', { type: 'lines', mask: 'lines', linesClass: 'line' });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(split.lines, { yPercent: 105, duration: 0.8, stagger: 0.07 })
    .from('.hero__what, .kunye, .hero__actions', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, clearProps: 'all' }, 0.2)
    .from('.bin', { xPercent: (i) => (i % 2 ? 40 : -40), autoAlpha: 0, duration: 0.6, stagger: 0.05, ease: 'back.out(1.3)' }, 0.1)
    .from('.bin__part .ln, .bin__part .aux', { drawSVG: 0, duration: 0.9, stagger: 0.003, ease: 'power2.inOut' }, 0.2);

  // Hizmet satırları ve parça grupları: çizgi çekilir, çizim kendini çizer.
  $$('.svc__item, .row').forEach((row) => {
    const t = gsap.timeline({ scrollTrigger: bir(row) });
    t.fromTo(row, { '--rule': 0 }, { '--rule': 1, duration: 0.6, ease: 'power2.out' })
      .from(row.querySelectorAll('.part .ln, .part .aux'), { drawSVG: 0, duration: 0.8, stagger: 0.005, ease: 'power2.inOut' }, 0)
      .from(row.querySelectorAll('.svc__poz, .svc__item > div > *, .row__main > *'), { y: 12, autoAlpha: 0, duration: 0.45, stagger: 0.05, clearProps: 'all' }, 0.1);
  });

  const pt = gsap.timeline({ scrollTrigger: bir('.plate', 'top 80%') });
  pt.from('.plate__img', { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut' })
    .from('.plate__pins li', { scale: 0, autoAlpha: 0, duration: 0.35, stagger: 0.06, ease: 'back.out(2)' }, 0.5)
    .from('.plate__legend li', { y: 10, autoAlpha: 0, duration: 0.35, stagger: 0.04, clearProps: 'all' }, 0.55);

  $$('[data-count]').forEach((el) => {
    const v = Number(el.dataset.count), suf = el.dataset.suffix;
    const o = { n: 0 };
    gsap.to(o, {
      n: v, duration: 1.2, ease: 'power2.out', scrollTrigger: bir(el, 'top 92%'),
      onUpdate: () => (el.textContent = Math.round(o.n) + suf),
    });
  });

  $$('.gal__item').forEach((fig) => {
    gsap.from(fig, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut', scrollTrigger: bir(fig, 'top 88%') });
  });

  gsap.from('.slip', { yPercent: -6, rotate: -1.2, autoAlpha: 0, duration: 0.8, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('.slip', 'top 88%') });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
