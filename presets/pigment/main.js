// Pigment: kinetik aile, boya ve kaporta. 3D yok. Kimlik: gerçek RAL renk kartları, maskeleme bandı,
// renk taşmaları. Dev yazılar yalnız olgulardır: işletmenin adı ve hizmet adları.
// Akış: künye → Hizmetler → Hakkında → Saatler ve konum → Örnek yorumlar → İletişim.
import showroom from '../../data/showroom.json';
import ekler from '../../data/pigment.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, autoHideHeader, telHref, waHref, mapsHref, mapsEmbed,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...showroom, ...ekler });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
document.documentElement.classList.toggle('uzun-ad', (d.isletme.ad || '').length > 24);
$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const INK = '#16181b';
// Renk üstünde okunacak yazı rengi (göreli parlaklık)
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.33 ? INK : '#ffffff';
}
const renkler = d.renkler;
const renkAt = (i) => renkler[i % renkler.length];

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ext = 'target="_blank" rel="noopener"';
const fotoMesaj = `Merhaba ${d.isletme.ad}, aracımdaki hasarın fotoğraflarını gönderiyorum. Fiyat öğrenebilir miyim?`;
const kartela = renkler.map((r) => `<i style="background:${r.hex}"></i>`).join('');
const heroRenk = renkler.find((r) => r.kod === 'RAL 5015') ?? renkler[0];

// --- Üst bar ---------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#hero">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}" data-status-short>${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------------

// Adın içindeki şerit yalnız koyu renklerden (açık zeminde okunur kalsın; sarı ve açık yeşil çıkar).
const koyular = renkler.filter((r) => onColor(r.hex) !== INK);
const adim = 100 / koyular.length;
const serit = `linear-gradient(90deg, ${koyular.map((r, i) => `${r.hex} ${i * adim}% ${(i + 1) * adim}%`).join(', ')})`;
$('#hero').innerHTML = `
  <div class="hero__inner">
    <div class="hero__copy">
      <h1 class="hero__title" id="hero-title" style="--serit:${serit}">${ad}</h1>
      <div class="hero__kartela" aria-hidden="true">${kartela}</div>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="lamp ${st.open ? 'is-open' : ''}" data-status data-kunye><span data-long>${esc(st.kunye)}</span></dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__cta">
        <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
    <figure class="hero__chip" aria-hidden="true">
      <div class="hero__chip-img" style="background-image:url('${esc(d.heroGorsel)}')"></div>
      <figcaption><span>${esc(heroRenk.kod)}</span><strong>${esc(heroRenk.ad)}</strong></figcaption>
      <div class="tape tape--hero"><span>${esc(yilEki(d.isletme.kurulus))} beri</span></div>
    </figure>
  </div>`;

// --- Hizmetler: renk kartları -----------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="sec-head">
    <h2 class="sec-title" id="svcs-title">Hizmetler</h2>
    <p class="sec-sub">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="svc-list">
    ${d.hizmetler.map((h, i) => {
      const r = renkAt(i);
      return `
      <li class="svc" style="--c:${r.hex};--on:${onColor(r.hex)}">
        <div class="svc__chip" aria-hidden="true"><span class="svc__code">${esc(r.kod)}</span><span class="svc__no">${String(i + 1).padStart(2, '0')}</span></div>
        <h3 class="svc__title">${esc(h.baslik)}</h3>
        <div class="svc__body">
          <p>${esc(h.aciklama)}</p>
          ${h.sure ? `<p class="svc__time">Süre: <strong>${esc(h.sure)}</strong></p>` : ''}
        </div>
      </li>`;
    }).join('')}
  </ol>`;

// --- Hakkında ---------------------------------------------------------------------------------

const rakamlar = [
  { deger: yas, sonek: ' yıl', etiket: "Şaşmaz Oto Sanayi Sitesi'nde", r: renkAt(2) },
  { deger: acikGun, sonek: ' gün', etiket: 'haftada açık', r: renkAt(4) },
];
$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <h2 class="sec-title" id="about-title">Hakkında</h2>
    <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <dl class="stats">
      ${rakamlar.map((s) => `
        <div style="--c:${s.r.hex};--on:${onColor(s.r.hex)}">
          <dt>${esc(s.etiket)}</dt>
          <dd><strong><span data-count="${s.deger}">${s.deger}</span>${esc(s.sonek)}</strong><em>${esc(s.r.kod)}</em></dd>
        </div>`).join('')}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum --------------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="tape tape--visit" aria-hidden="true"><span>${esc(st.open ? `Açık, ${st.saat.replace(/^Bugün /, '')}` : st.durum)}</span></div>
  <div class="visit__info">
    <h2 class="sec-title" id="visit-title">Çalışma saatleri ve konum</h2>
    <p class="visit__status lamp ${st.open ? 'is-open' : ''}" data-status><span data-long>${esc(st.metin)}</span></p>
    <table class="visit__hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <address class="visit__addr">${esc(d.iletisim.adres)}</address>
    <div class="visit__cta">
      <a class="btn btn--ink" href="${mapsHref(d)}" ${ext}>${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="visit__map" data-map></div>`;

// --- Örnek yorumlar -----------------------------------------------------------------------------

const yildiz = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="sec-head">
    <h2 class="sec-title" id="reviews-title">Örnek yorumlar</h2>
    <p class="sec-sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="review-list">
    ${d.yorumlar.map((y, i) => `
      <li class="review" style="--c:${renkAt(i).hex}">
        <p class="review__stars" role="img" aria-label="5 üzerinden ${y.puan}">${yildiz(y.puan)}</p>
        <blockquote class="review__text">${esc(y.metin)}</blockquote>
        <p class="review__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__flood" aria-hidden="true"></div>
  <div class="final__kartela" aria-hidden="true">${kartela}</div>
  <h2 class="final__title" id="final-title">İletişim</h2>
  <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Hasarın fotoğrafı WhatsApp'tan gönderilebilir.</p>
  <div class="final__cta">
    <a class="btn btn--ink btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--line btn--big" href="${waHref(d, fotoMesaj)}" ${ext}>${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="final__addr">${esc(d.iletisim.adres)}<br><span data-status><span data-long>${esc(st.metin)}</span></span></p>`;

$('#foot').innerHTML = `
  <p><strong>${ad}</strong></p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${yil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

// Harita: yaklaşınca yükle
const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapEl);

// Açık / kapalı (dakikada bir)
function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
  const sh = $('[data-status-short]');
  sh.textContent = s.open ? 'Açık' : 'Kapalı';
  sh.classList.toggle('is-open', s.open);
}
setInterval(refreshStatus, 60_000);

// --- Hareket -------------------------------------------------------------------------------------

document.documentElement.classList.toggle('is-static', reducedMotion);
const topEl = $('[data-top]');
ScrollTrigger.create({
  start: 40, end: 'max',
  onToggle: (s) => topEl.classList.toggle('is-solid', s.isActive),
});

if (!reducedMotion) {
  initSmoothScroll();
  const phoneMq = matchMedia('(max-width: 899px)');
  if (phoneMq.matches) autoHideHeader(topEl, { offset: 120 });
  document.fonts.ready.then(hareket);
}

function hareket() {
  // Açılış (~1 sn): ad harf harf yükselir, içindeki kartela şeridi soldan sağa akar, renk kartı dönerek yerine oturur.
  const split = SplitText.create('.hero__title', { type: 'lines', linesClass: 'line', mask: 'lines' });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(split.lines, { yPercent: 105, duration: 0.6, stagger: 0.07 }, 0)
    .fromTo('.hero__title', { '--cover': '100%' }, { '--cover': '0%', duration: 1, ease: 'power2.inOut' }, 0.15)
    .from('.hero__kartela i', { scaleY: 0, transformOrigin: '50% 100%', duration: 0.4, stagger: 0.04 }, 0.2)
    .from(['.hero__what', '.kunye'], { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.3)
    .from('.hero__cta', { y: 10, opacity: 0, duration: 0.4 }, 0.1)
    .from('.hero__chip', { rotate: 8, yPercent: 14, autoAlpha: 0, duration: 0.8 }, 0.15)
    .add(() => $('.tape--hero')?.classList.add('is-on'), 0.8);

  // Bölüm başlıkları: harfler alttan
  $$('.sec-title').forEach((h) => {
    const s = SplitText.create(h, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 105, duration: 0.8, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' } });
  });

  // Hizmetler: renk kartı soldan açılır, hizmet adı kayarak gelir
  $$('.svc').forEach((el, i) => {
    const t = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } });
    t.from($('.svc__chip', el), { scaleX: 0, transformOrigin: '0 50%', duration: 0.6, ease: 'power3.inOut' })
      .from($('.svc__title', el), { x: i % 2 ? 40 : -40, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, 0.15)
      .from($('.svc__body', el), { y: 14, autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0.3);
  });

  // Rakamlar sayar
  $$('[data-count]').forEach((el) => {
    const hedef = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.fromTo(o, { v: 0 }, {
      v: hedef, duration: 1.2, ease: 'power2.out', immediateRender: false,
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });
  gsap.from('.stats > div', { rotate: (i) => (i ? 5 : -5), y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.stats', start: 'top 88%', toggleActions: 'play none none none' } });

  ScrollTrigger.create({ trigger: '.visit', start: 'top 75%', toggleActions: 'play none none none', onEnter: () => $('.tape--visit')?.classList.add('is-on') });
  gsap.from('.review', { y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.review-list', start: 'top 86%', toggleActions: 'play none none none' } });

  // İletişim: kartela şeritleri iner, zemin sarıya boyanır
  const fin = gsap.timeline({ scrollTrigger: { trigger: '.final', start: 'top 70%', toggleActions: 'play none none none' } });
  fin.from('.final__kartela i', { scaleY: 0, transformOrigin: '50% 0', duration: 0.5, stagger: 0.05, ease: 'power3.out' })
    .fromTo('.final__flood', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'power3.inOut' }, 0.1);

  addEventListener('load', () => ScrollTrigger.refresh());
}
