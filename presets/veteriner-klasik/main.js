// Burun Buruna (klasik aile, veteriner kliniği): stüdyo fonu sisli gri-mavi, derin mürekkep,
// mandalina vurgu. Young Serif (başlık) + Albert Sans (gövde). WebGL yok, fotoğraf ağırlıklı.
// Künye hero'da: köpek soldan, kedi sağdan yalnızca burnunu uzatır. Açılışta bir kez içeri kayarlar,
// kaydırdıkça burunları ortaya biraz daha yaklaşır (pin yok). Gerisi klasik site akışı.
import sektor from '../../data/sektor-veteriner.json';
import extra from '../../data/veteriner-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
icons.check = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg>`;
icons.alert = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.2v.1"/></svg>`;
icons.clock = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

const waGenel = d.waMesaj || 'Merhaba, randevu almak istiyorum.';
// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta klinik metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: veteriner kliniği ------------------------------------------------
(function vetLd() {
  $$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
  const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
  document.head.append(ld);
  document.title = `${d.isletme.ad} | Veteriner Kliniği | Etimesgut, Ankara`;
})();

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, tanim: d.isletme.tanim, telefon: d.iletisim.telefon,
  adres: d.iletisim.adres, kisaAdres: kisaAdres(d.iletisim.adres),
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, waGenel)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
if (d.isletme.ad.length > 20) document.documentElement.classList.add('is-long');
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-year]').textContent = new Date().getFullYear();

function refreshStatus() {
  const s = gunDurumu(d.saatler);
  document.documentElement.classList.toggle('is-open', s.open);
  $$('[data-status]').forEach((el) => {
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Künye: burun buruna --------------------------------------------------------
const hero = $('.hero');
const pin = $('.hero__pin');
const panes = $$('.yuz');
const kay = $$('.yuz__kay');
const imgs = $$('.yuz__img');
// Fotoğraflarda burun ucunun yeri (1050×1400 görselde oran olarak)
const NOSE = [{ x: 0.872, y: 0.648 }, { x: 0.266, y: 0.662 }];
const RATIO = 1400 / 1050;
let geo = { sx: 0 };

function place() {
  const W = pin.clientWidth, H = pin.clientHeight, half = W / 2;
  const mobile = W < 900;
  // Yarım ekranda burundan geriye görselin ne kadarı görünsün
  const reach = mobile ? 0.6 : 0.8;
  let iw = half / reach;
  if (!mobile) iw = Math.max(iw, (H * 1.12) / RATIO);
  const ih = iw * RATIO;
  // Telefonda künye üstte, burunlar altta buluşur.
  const noseY = mobile ? H - 150 : H * 0.54;
  // Masaüstünde burunlar künyenin iki yanında durur; kaydırdıkça ortadaki boşluğa doğru yaklaşır.
  const gap = mobile ? 6 : Math.min(half * 0.62, 400);
  imgs[0].style.cssText = `width:${iw}px;height:${ih}px;left:${half - gap - NOSE[0].x * iw}px;top:${noseY - NOSE[0].y * ih}px`;
  imgs[1].style.cssText = `width:${iw}px;height:${ih}px;left:${gap - NOSE[1].x * iw}px;top:${noseY - NOSE[1].y * ih}px`;
  geo = { sx: mobile ? 0 : gap * 0.35 };
}
place();

if (!reducedMotion) {
  // Açılış: burunlar kenarlardan bir kez içeri kayar (≈1 sn).
  gsap.from(panes[0], { xPercent: -24, duration: 1.1, ease: 'power3.out', delay: 0.1 });
  gsap.from(panes[1], { xPercent: 24, duration: 1.1, ease: 'power3.out', delay: 0.18 });
  gsap.from('.hero__copy > *', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.05, clearProps: 'opacity,visibility,transform' });
  // Kaydırdıkça burunlar ortaya yaklaşır; künye yerinde kalır.
  gsap.to(kay[0], { x: () => geo.sx, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true } });
  gsap.to(kay[1], { x: () => -geo.sx, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true } });
}

// --- Hizmetler ---------------------------------------------------------------
const svcMsg = (h) => h.mesaj || `Merhaba, ${h.baslik.toLocaleLowerCase('tr-TR')} için bilgi almak istiyorum.`;
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc${h.id === 'acil' ? ' svc--acil' : ''}" data-i="${i}">
    <img class="svc__thumb" src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" />
    <div class="svc__body">
      <p class="svc__no">${String(i + 1).padStart(2, '0')}</p>
      <h3 class="svc__name">${esc(h.baslik)}</h3>
      <p class="svc__desc">${esc(h.aciklama)}</p>
      <p class="svc__meta">${h.sure ? `<span class="svc__time">${icons.clock}<span class="sr-only">Süre: </span>${esc(h.sure)}</span>` : ''}
        ${h.id === 'acil'
          ? `<a class="svc__link" href="${esc(telHref(d))}">${icons.phone}${esc(d.iletisim.telefon)}</a>`
          : `<a class="svc__link" href="${esc(waHref(d, svcMsg(h)))}" target="_blank" rel="noopener">${icons.whatsapp}WhatsApp'tan sorun</a>`}
      </p>
    </div>
  </li>`).join('');
const photo = $('[data-svc-photo]');
photo.innerHTML = d.hizmetler.map((h, i) => `<img src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}" />`).join('')
  + `<figcaption data-svc-cap>${esc(d.hizmetler[0].baslik)}</figcaption>`;
const photoImgs = $$('img', photo);
const cap = $('[data-svc-cap]');
function setSvc(i) {
  photoImgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
  $$('.svc').forEach((s, k) => s.classList.toggle('is-active', k === i));
  cap.textContent = d.hizmetler[i].baslik;
}
setSvc(0);

// --- Yaşa göre kontroller: tür + yaş -----------------------------------------
$('[data-rehber-not]').textContent = d.rehberNot || '';
const turler = Object.entries(d.rehber);
let tur = turler[0][0];
let yas = 'yetiskin';
$('[data-turler]').innerHTML = turler.map(([k, t]) => `
  <button type="button" class="tur__btn tur__btn--${esc(k)}" role="radio" aria-checked="${k === tur}" data-tur="${esc(k)}">
    <span class="tur__foto"><img src="${esc(t.gorsel)}" alt="" loading="lazy" decoding="async" /></span>
    <span class="tur__ad">${esc(t.ad)}</span>
  </button>`).join('');
function renderYas() {
  const ys = Object.entries(d.rehber[tur].yaslar);
  $('[data-yaslar]').innerHTML = ys.map(([k, y]) => `
    <button type="button" class="yas__btn" role="radio" aria-checked="${k === yas}" data-yas="${esc(k)}">
      <b>${esc(y.etiket)}</b><span>${esc(y.aralik)}</span>
    </button>`).join('');
}
function renderRehber(animate) {
  const t = d.rehber[tur];
  const y = t.yaslar[yas];
  const wa = waHref(d, `Merhaba, ${y.etiket.toLocaleLowerCase('tr-TR')} ${t.tekil} (${y.aralik}) için kontrol randevusu almak istiyorum.`);
  $('[data-rehber]').innerHTML = `
    <p class="sonuc__tag">${esc(t.ad)} · ${esc(y.etiket)} · ${esc(y.aralik)}</p>
    <p class="sonuc__gelis">${esc(y.gelis)}</p>
    <p class="sonuc__alt">Bu yaşta bakılanlar</p>
    <ul class="sonuc__list">${y.liste.map((l) => `<li>${icons.check}<span>${esc(l)}</span></li>`).join('')}</ul>
    <p class="sonuc__dikkat">${icons.alert}<span>${esc(y.dikkat)}</span></p>
    <a class="btn btn--tan sonuc__btn" href="${esc(wa)}" target="_blank" rel="noopener">${icons.whatsapp}WhatsApp'tan randevu</a>`;
  $$('.tur__btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tur === tur)));
  document.documentElement.dataset.tur = tur;
  if (animate && !reducedMotion) gsap.from('[data-rehber] > *', { y: 14, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out' });
}
renderYas();
renderRehber(false);
$('[data-turler]').addEventListener('click', (e) => {
  const b = e.target.closest('.tur__btn');
  if (!b || b.dataset.tur === tur) return;
  tur = b.dataset.tur;
  renderYas();
  renderRehber(true);
  if (!reducedMotion) gsap.fromTo(b.querySelector('.tur__foto'), { scale: 0.86 }, { scale: 1, duration: 0.6, ease: 'back.out(2.4)' });
});
$('[data-yaslar]').addEventListener('click', (e) => {
  const b = e.target.closest('.yas__btn');
  if (!b || b.dataset.yas === yas) return;
  yas = b.dataset.yas;
  $$('.yas__btn').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.yas === yas)));
  renderRehber(true);
});
function arrows(group, sel, attr, onPick) {
  $(group).addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const bs = $$(sel);
    const i = bs.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const n = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length;
    onPick(bs[n].dataset[attr]);
    $$(sel)[n].focus();
  });
}
arrows('[data-turler]', '.tur__btn', 'tur', (v) => { tur = v; renderYas(); renderRehber(true); });
arrows('[data-yaslar]', '.yas__btn', 'yas', (v) => { yas = v; $$('.yas__btn').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.yas === yas))); renderRehber(true); });

// --- Hakkında ----------------------------------------------------------------
const yil = new Date().getFullYear() - d.isletme.kurulus;
const yer = d.isletme.yer || "Etimesgut'ta";
$('[data-hakkinda]').textContent = `${d.isletme.ad} ${yilEki(d.isletme.kurulus)} beri ${yer}. ${d.isletme.hakkinda}`;
$('[data-facts]').innerHTML = (d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
// Rakamlar yalnız veriden türeyen olgular: kuruluştan geçen yıl, haftada açık gün.
const stats = [
  { deger: yil, sonek: ' yıl', etiket: yer },
  { deger: acikGunSayisi(d.saatler), sonek: ' gün', etiket: 'haftada açık' },
];
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span>${s.deger}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = ['steteskop', 'goz-muayene', 'pomeranyen', 'ultrason', 'laboratuvar', 'agiz-kontrol', 'muayene-masasi', 'sefkat', 'kan-ornegi'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.endsWith(`/${k}.jpg`))).filter(Boolean)
  .map((g) => ({ ...g, src: g.src.replace('/sektor-veteriner/', '/veteriner-klasik/') }));
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i % 3}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Örnek yorumlar ------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac || '')}</span></p>
  </li>`).join('');

// --- Çalışma saatleri ----------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const today = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = saatListesi(d.saatler).map(([days, val]) => {
  const r = days.split('–');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${today >= a && today <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd>${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
let solidState = null;
const solid = () => {
  const s = scrollY > innerHeight * 0.4;
  if (s !== solidState) { solidState = s; top.classList.toggle('is-solid', s); }
};
addEventListener('scroll', solid, { passive: true });
solid();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Bölüm hareketleri (sakin: bir kez, küçük kayma) ------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));

  // Hizmetler: masaüstünde yapışkan fotoğraf, ortadaki satıra göre değişir
  $$('.svc').forEach((s, i) => ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => st.isActive && setSvc(i) }));
  $$('.svc').forEach((s) => gsap.fromTo(s, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out', clearProps: 'opacity,visibility,transform', scrollTrigger: { trigger: s, start: 'top 92%' } }));

  gsap.from('.tur__btn', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.reh__sec', start: 'top 90%' } });
  gsap.from('.reh__sonuc', { y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.reh__sonuc', start: 'top 92%' } });

  gsap.fromTo('.kli__foto img', { yPercent: -5, scale: 1.1 }, { yPercent: 5, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.kli', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.shot', { y: 40, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.gal', start: 'top 90%' } });
  gsap.from('.rev', { y: 24, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yor__list', start: 'top 90%' } });
  gsap.fromTo('.fin__yuzler img', { xPercent: 18 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.fin', start: 'top bottom', end: 'center center', scrub: 0.5 } });
}

let rw = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - rw) < 2) return;
  rw = innerWidth;
  place();
  ScrollTrigger.refresh();
});
addEventListener('load', () => { place(); ScrollTrigger.refresh(); });
