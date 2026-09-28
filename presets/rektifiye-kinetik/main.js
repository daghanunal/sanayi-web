import '../../shared/base.css';
import './style.css';
import mikron from '../../data/mikron.json';
import ek from '../../data/rektifiye-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Talaş (kinetik aile): WebGL yok. Kimlik: işletmenin adı tornadaki iş parçası gibi döner, kalem bir kez
// geçer ve harfler ölçüsüne iner; kalemden talaş kıvrımları fırlar. Dev yazılar yalnız olgudur: işletmenin adı,
// hizmet adları, yıl ve gün sayısı, "Açık / Kapalı".
const d = boot({ ...mikron, ...ek, preset: 'rektifiye-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const upper = (s) => s.toLocaleUpperCase('tr-TR');
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// --- Üst çubuk -----------------------------------------------------------------

$('#ust').innerHTML = `
  <a href="#kunye" class="ust__ad">${ad}</a>
  <nav class="ust__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <span class="ust__durum ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</span>
  <a class="ust__tel" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye: iş parçaları ----------------------------------------------------------

const kelimeler = upper(d.isletme.ad).split(/\s+/).filter(Boolean).slice(0, 4);
$('#kunye').innerHTML = `
  <h1 class="hero__baslik" id="hero-title" aria-label="${ad}">
    <span class="hero__parcalar" aria-hidden="true">
      ${kelimeler.map((k) => `
        <span class="parca">
          <span class="parca__ayna"></span>
          <span class="parca__kaba"></span>
          <span class="parca__govde">
            <span class="parca__doku"></span>
            <span class="parca__yazi">${[...k].map((c) => `<span class="h">${esc(c)}</span>`).join('')}</span>
            <span class="parca__isik"></span>
          </span>
          <span class="parca__punta"></span>
          <span class="kalem"><svg viewBox="0 0 40 60"><path d="M20 0 L34 22 L6 22 Z" class="kalem__uc"/><rect x="8" y="22" width="24" height="38" class="kalem__sap"/></svg></span>
        </span>`).join('')}
    </span>
  </h1>
  <div class="hero__alt">
    <p class="hero__ne">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt class="mono">Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="butonlar">
      <a class="btn btn--turuncu" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="talas" aria-hidden="true"></div>`;

const parcaKutu = $('.hero__parcalar');
function parcaBoyutla() {
  const parcalar = $$('.parca', parcaKutu);
  const yuk = innerHeight * (innerWidth < 700 ? 0.26 : 0.34);
  parcalar.forEach((p) => {
    const yazi = $('.parca__yazi', p);
    yazi.style.fontSize = '100px';
    const w = yazi.scrollWidth;
    const hedef = $('.parca__govde', p).clientWidth * 0.9;
    const fs = Math.min((100 * hedef) / w, yuk / parcalar.length / 1.24);
    yazi.style.fontSize = `${fs}px`;
  });
}
parcaBoyutla();
document.fonts?.ready.then(parcaBoyutla);
addEventListener('resize', parcaBoyutla);

// --- Hizmetler ---------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="bolum-bas">
    <h2 class="buyuk" id="hizmet-t">Hizmetler</h2>
    <p class="bolum-bas__not">Süreler yaklaşıktır, parçaya göre değişebilir. Fiyat için arayın.</p>
  </div>
  <ol class="hizmet-liste">
    ${d.hizmetler.map((h, i) => `
      <li class="hizmet">
        <span class="hizmet__no mono" aria-hidden="true">${pad(i + 1)}</span>
        <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
        <p class="hizmet__sure mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
        <p class="hizmet__metin">${esc(h.aciklama)}</p>
      </li>`).join('')}
  </ol>`;

// --- Hakkında -----------------------------------------------------------------------

const [g1, g2] = d.gorseller || [];
$('#hakkinda').innerHTML = `
  <div class="hakkinda__ust">
    <h2 class="buyuk" id="hakkinda-t">Hakkında</h2>
    <p class="hakkinda__metin">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
  </div>
  <dl class="rakam-liste">
    <div class="rakam"><dd><b data-say="${yas}">${yas}</b><span>yıl</span></dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><svg class="rakam__ok" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5H100M0 0V10M100 0V10"/></svg></div>
    <div class="rakam"><dd><b data-say="${acikGun}">${acikGun}</b><span>gün</span></dd><dt>haftada açık</dt><svg class="rakam__ok" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5H100M0 0V10M100 0V10"/></svg></div>
  </dl>
  <div class="hakkinda__alt">
    <dl class="bilgi">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Sık gelen motorlar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    ${g1 ? `<figure class="hakkinda__foto"><img src="${asset(g1.src)}" alt="${esc(g1.alt)}" width="${g1.w}" height="${g1.h}" loading="lazy" decoding="async" /></figure>` : ''}
    ${g2 ? `<figure class="hakkinda__foto hakkinda__foto--dik"><img src="${asset(g2.src)}" alt="${esc(g2.alt)}" width="${g2.w}" height="${g2.h}" loading="lazy" decoding="async" /></figure>` : ''}
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="konum__sol">
    <h2 class="konum__baslik" id="konum-t">Çalışma saatleri ve konum</h2>
    <p class="konum__durum ${st.open ? 'is-open' : ''}"><i></i>${st.open ? 'Açık' : 'Kapalı'}</p>
    ${st.saat ? `<p class="konum__saat mono">${esc(st.saat)}</p>` : ''}
    <table class="saatler mono">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="konum__adres">${esc(d.iletisim.adres)}</p>
    <div class="butonlar">
      <a class="btn btn--murekkep" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--cizgi" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__harita" data-map></div>`;

// --- Örnek yorumlar ----------------------------------------------------------------------

const yildiz = (n) => `<p class="yorum__yildiz" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="bolum-bas yorumlar__bas">
    <h2 class="buyuk" id="yorum-t">Örnek yorumlar</h2>
    <p class="bolum-bas__not">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum-serit" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="yorum">
        ${yildiz(y.puan)}
        <blockquote class="yorum__metin">${esc(y.metin)}</blockquote>
        <p class="yorum__kim"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim --------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <h2 class="final__baslik" id="final-t" aria-label="İletişim"><span class="fk" aria-hidden="true">${[...'İLETİŞİM'].map((c) => `<span class="fh">${c}</span>`).join('')}</span></h2>
  <p class="final__not">Fiyat ve teslim günü için arayın ya da WhatsApp'tan yazın.</p>
  <div class="butonlar">
    <a class="btn btn--turuncu btn--dev" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--acik btn--dev" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="final__adres mono">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('#alt').innerHTML = `
  <p class="alt__ad">${ad}</p>
  <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p class="mono">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapEl);

// Görünmüyorken dönme dokusu dursun.
new IntersectionObserver((e) => $('#kunye').classList.toggle('is-durdu', !e[0].isIntersecting)).observe($('#kunye'));

// --- Talaş kıvrımları: az sayıda SVG spiral, kalemin ucundan fırlar ---------------------------

const talasKutu = $('.talas');
const SPIRAL = `<svg viewBox="0 0 40 40"><path d="M20 20 m0 -2 a2 2 0 1 1 -2 2 a5 5 0 1 1 5 5 a9 9 0 1 1 -9 -9 a13 13 0 1 1 13 13"/></svg>`;
function talasAt(x, y) {
  const el = document.createElement('span');
  el.className = 'talas__k';
  el.innerHTML = SPIRAL;
  talasKutu.append(el);
  const s = 0.5 + Math.random() * 0.8;
  gsap.fromTo(el, { x, y, scale: s * 0.4, rotation: Math.random() * 360, opacity: 1 }, {
    x: x + (Math.random() * 120 - 30), y: y + 120 + Math.random() * 160, rotation: `+=${400 + Math.random() * 400}`,
    scale: s, opacity: 0, duration: 0.9 + Math.random() * 0.5, ease: 'power2.in', onComplete: () => el.remove(),
  });
}

// --- Hareket -----------------------------------------------------------------------------

const ust = $('#ust');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(ust, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${ust.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

if (reducedMotion) {
  $$('.h').forEach((h) => h.classList.add('is-islendi'));
  $$('.parca__kaba').forEach((k) => (k.style.display = 'none'));
  $$('.hizmet').forEach((h) => h.classList.add('is-in'));
} else {
  initSmoothScroll();

  // Açılış (~1,2 sn): parçalar tezgâha kayar, kalem her parçanın üstünden bir kez geçer; künye hemen görünür.
  const tl = gsap.timeline({ delay: 0.1 });
  const parcalar = $$('.parca', parcaKutu);
  tl.from(parcalar, { xPercent: -104, duration: 0.5, ease: 'power3.out', stagger: 0.08 }, 0);
  tl.from('.hero__alt > *', { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }, 0.1);
  parcalar.forEach((p, pi) => {
    const kalem = $('.kalem', p);
    const govde = $('.parca__govde', p);
    const bas = 0.4 + pi * 0.22;
    const sure = 0.7;
    const g = govde.offsetWidth;
    const x0 = govde.offsetLeft;
    tl.set(kalem, { opacity: 1, x: x0 - 20 }, bas - 0.05);
    tl.to(kalem, { x: x0 + g + 10, duration: sure, ease: 'none' }, bas);
    tl.fromTo($('.parca__kaba', p), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: sure, ease: 'none' }, bas);
    tl.to(kalem, { opacity: 0, y: 24, duration: 0.25 }, bas + sure);
    $$('.h', p).forEach((h, hi) => {
      const oran = (h.offsetLeft + h.offsetWidth / 2) / g;
      tl.call(() => {
        h.classList.add('is-islendi');
        if (hi % 2) return; // her iki harfte bir talaş: az ve hafif
        const r = h.getBoundingClientRect();
        const hr = $('#kunye').getBoundingClientRect();
        talasAt(r.left + r.width / 2 - hr.left, r.bottom - hr.top);
      }, null, bas + oran * sure);
    });
  });

  // Hizmet adları dar hâlden açılır (font genişliği), bir kez.
  ScrollTrigger.batch('.hizmet', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), i * 80)),
  });

  // Rakamlar sayar, ölçü okları çizilir.
  $$('.rakam').forEach((el) => {
    const b = $('[data-say]', el);
    const v = Number(b.dataset.say);
    const o = { v: 0 };
    b.textContent = '0';
    const tr = { trigger: el, start: 'top 85%', toggleActions: 'play none none none' };
    gsap.to(o, { v, duration: 1.3, ease: 'power2.out', onUpdate: () => (b.textContent = Math.round(o.v)), scrollTrigger: tr });
    gsap.from($('.rakam__ok', el), { scaleX: 0, duration: 1, ease: 'power3.inOut', scrollTrigger: { ...tr } });
  });

  // İletişim: harfler tornadan çıkar gibi yerine oturur.
  gsap.from('.fh', {
    yPercent: 110, rotateX: -70, opacity: 0, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.03,
    scrollTrigger: { trigger: '.final', start: 'top 75%', toggleActions: 'play none none none' },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
