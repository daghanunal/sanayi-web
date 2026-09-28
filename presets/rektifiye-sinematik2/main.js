import '../../shared/base.css';
import './style.css';
import ana from '../../data/mikron.json';
import ek from '../../data/rektifiye-sinematik2.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Tav (sinematik aile): 3D yalnız açılışta. Aydınlık stüdyoda torna: ham çubuk aynada döner, kalem bir kez
// geçer, çeliğin tav renklerinde (saman, bronz, mor, mavi) talaş kıvrılır, parça kademelenir ve dönmeye devam
// eder. Künyeden sonra sahne çizilmez; gerisi normal site bölümleridir. Tav renkleri tek vurgu şerididir.
const d = boot({ ...ana, ...ek, preset: 'rektifiye-sinematik2' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('is-reduced');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// --- Üst çubuk -------------------------------------------------------------------

$('#hdr').innerHTML = `
  <a class="hdr__brand" href="#kunye"><span class="hdr__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="hdr__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="hdr__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="hdr__tel" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -------------------------------------------------------------------------

$('#kunye-in').innerHTML = `
  <h1 class="hero__title" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// --- Hizmetler -------------------------------------------------------------------------

const n = d.hizmetler.length;
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="sec-title" id="isler-t">Hizmetler</h2>
      <p class="sec-lead">Süreler yaklaşıktır, parçaya göre değişebilir. Fiyat için arayın.</p>
    </header>
    <ol class="isler__list">
      ${d.hizmetler.map((h, i) => `
        <li class="is" style="--i:${i};--n:${n}">
          <span class="is__no" aria-hidden="true">${pad(i + 1)}</span>
          <div class="is__body">
            <h3 class="is__ad">${esc(h.baslik)}</h3>
            <p class="is__txt">${esc(h.aciklama)}</p>
          </div>
          <p class="is__sure"><span>Süre</span> ${esc(h.sure)}</p>
          <span class="is__line" aria-hidden="true"></span>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------------

const gal = [...(d.galeri || []), ...(d.galeriEk || [])].slice(0, 5);
$('#hakkinda').innerHTML = `
  <div class="wrap sayilar__grid">
    <div>
      <h2 class="sec-title sec-title--light" id="hakkinda-t">Hakkında</h2>
      <p class="sayilar__txt">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <div class="sayilar__rakam">
        <div class="sayi"><p class="sayi__v"><span data-count="${yas}">${yas}</span> yıl</p><p class="sayi__l">Şaşmaz Oto Sanayi Sitesi'nde</p></div>
        <div class="sayi"><p class="sayi__v"><span data-count="${acikGun}">${acikGun}</span> gün</p><p class="sayi__l">haftada açık</p></div>
      </div>
    </div>
    <dl class="bilgi">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen motorlar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="galeri__track" data-lenis-prevent-touch>
    ${gal.map((g, i) => `<figure class="kare${i % 3 === 1 ? ' kare--uzun' : ''}"><img src="${asset(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('')}
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap konum__grid">
    <div class="konum__txt">
      <h2 class="sec-title" id="konum-t">Çalışma saatleri ve konum</h2>
      <p class="konum__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="saatler">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="konum__adres">${esc(d.iletisim.adres)}</p>
      <div class="konum__btns">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="harita" data-map><span>Harita</span></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------

const star = (k) => `<p class="yorum__s" role="img" aria-label="5 üzerinden ${k}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < k ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <h2 class="sec-title" id="yorum-t">Örnek yorumlar</h2>
      <p class="sec-lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
    <div class="yorumlar__grid">
      ${d.yorumlar.map((y) => `
        <figure class="yorum">
          ${star(y.puan)}
          <blockquote class="yorum__m">${esc(y.metin)}</blockquote>
          <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
        </figure>`).join('')}
    </div>
  </div>`;

// --- İletişim -------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="son__in wrap">
    <h2 class="son__title" id="son-t">İletişim</h2>
    <p class="son__lead">Fiyat ve teslim günü için arayın ya da WhatsApp'tan yazın.</p>
    <div class="son__btns">
      <a class="btn btn--tav btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--glass btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="son__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D torna sahnesi temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Üst çubuk davranışı ------------------------------------------------------------------------

const hdr = $('#hdr');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(hdr, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${hdr.offsetHeight + 16}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const scrolled = () => root.classList.toggle('is-scrolled', scrollY > 60);
addEventListener('scroll', scrolled, { passive: true });
scrolled();

// --- 3D: yalnız künyede ---------------------------------------------------------------------------

const stage = $('.stage');
const HEDEF = 0.55; // kalem geçmiş, talaş kıvrılmış, profil kademelenmiş; taşlama aşamasından önce durur
let scene = null;
let heroVisible = true;
const sync = () => {
  if (!scene) return;
  if (reducedMotion) return;
  if (heroVisible && !document.hidden) scene.start();
  else scene.stop();
};
new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; sync(); }).observe($('#kunye'));
document.addEventListener('visibilitychange', sync);

import('./scene.js')
  .then(({ createScene }) => {
    try {
      scene = createScene(stage, { phone, low, sabitKamera: true });
    } catch {
      stage.remove();
      return;
    }
    addEventListener('resize', () => { scene.resize(); if (reducedMotion) scene.renderOnce(); });
    if (reducedMotion) {
      scene.jump(HEDEF);
      scene.renderOnce();
      return;
    }
    scene.jump(0.02);
    gsap.fromTo(stage, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' });
    // Açılış sahnesi zamanla bir kez oynar (kaydırmaya bağlı değil, sayfayı kilitlemez).
    const pr = { v: 0.02 };
    gsap.to(pr, { v: HEDEF, duration: 3.6, delay: 0.3, ease: 'power1.inOut', onUpdate: () => scene.setProgress(pr.v) });
    sync();
  })
  .catch(() => stage.remove());

// --- Hareket ---------------------------------------------------------------------------------

if (!reducedMotion) {
  initSmoothScroll();

  gsap.from('.hero__in > *', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  // Hizmet satırının alt çizgisi tav renginde soldan dolar (bir kez).
  ScrollTrigger.batch('.is', {
    start: 'top 85%',
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('is-on'), i * 90)),
  });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.3, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => (el.textContent = Math.round(o.v)),
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
