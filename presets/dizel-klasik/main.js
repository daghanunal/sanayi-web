// Ateşleme (klasik aile, dizel enjektör): çekiçli boya makine yeşili, kemik beyazı kâğıt, tek sinyal kırmızısı.
// Başlıklar Asap Condensed, gövde Asap, numaralar Stick No Bills. WebGL yok.
// Künyede fotoğraf dört silindire bölünür; açılışta şeritler 1-3-4-2 ateşleme sırasıyla yerine iner, her
// inişte şeridin üstünde kırmızı bir çizgi yanar. Başka kaydırma hareketi yok denecek kadar az.
import base from '../../data/sektor-dizel.json';
import extra from '../../data/dizel-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

const d = boot({ ...base, ...extra });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('no-motion');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const img = (p) => asset(p);
const ORDER = [0, 2, 3, 1]; // 1-3-4-2 (0 tabanlı)
const mark = `<svg class="top__mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="4" height="13" /><rect class="is-hot" x="7.5" y="3" width="4" height="17" /><rect x="13" y="7" width="4" height="13" /><rect x="18.5" y="7" width="4" height="13" /></svg>`;

// --- Üst çubuk ----------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ----------------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="cyl" aria-hidden="true">
    ${[0, 1, 2, 3].map((i) => `
      <div class="slice" style="--i:${i}">
        <picture>
          <source media="(min-width: 900px)" srcset="${img('/img/dizel-klasik/giris.jpg')}" />
          <img src="${img('/img/dizel-klasik/giris-m.jpg')}" alt="" ${i === 0 ? 'fetchpriority="high"' : ''} />
        </picture>
        <span class="slice__flash"></span>
        <span class="slice__no">${i + 1}</span>
      </div>`).join('')}
  </div>
  <div class="hero__copy">
    <h1 class="hero__name" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ---------------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="hizmet__head">
    <div>
      <h2 class="h2" id="hizmet-h">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, araca ve parçaya göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <figure class="hizmet__img"><img src="${img('/img/dizel-klasik/enjektor-kesit.jpg')}" alt="İki common rail enjektörün çizimi" width="1600" height="1000" loading="lazy" decoding="async" /></figure>
  </div>
  <ol class="hizmet__grid">
    ${d.hizmetler.map((h, i) => `
      <li class="svc">
        <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="svc__t">${esc(h.baslik)}</h3>
        <p class="svc__d">${esc(h.aciklama)}</p>
        ${h.sure ? `<p class="svc__s"><span>Süre</span>${esc(h.sure)}</p>` : ''}
      </li>`).join('')}
  </ol>`;

// --- Hakkında ------------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="about__copy">
    <h2 class="h2" id="about-h">Hakkında</h2>
    <p class="lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="about__side">
    <figure class="about__photo"><img src="${img('/img/dizel-klasik/tezgah.jpg')}" alt="Tezgâhta sökülmüş parçalar üzerinde çalışan usta" width="1500" height="999" loading="lazy" decoding="async" /></figure>
    <dl class="stats">
      <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b data-count="${yas}">${yas}</b> yıl</dd></div>
      <div class="stat"><dt>haftada açık</dt><dd><b data-count="${acikGun}">${acikGun}</b> gün</dd></div>
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="konum__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr${s === 'Kapalı' ? ' class="off"' : ''}><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="konum__addr">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns">
      <a class="btn btn--dark" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><span>Harita</span></div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------------

const yildiz = (n) => `<p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(n)}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="yorum__head">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        ${yildiz(y.puan)}
        <blockquote class="rev__t">${esc(y.metin)}</blockquote>
        <p class="rev__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__bg" src="${img('/img/dizel-klasik/eski-motor.jpg')}" alt="" loading="lazy" decoding="async" />
  <div class="final__in">
    <ol class="final__order" aria-hidden="true"><li>1</li><li>3</li><li>4</li><li>2</li></ol>
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--red btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve enjektör çizimi temsilîdir. Yorumlar örnektir.</p>
  </div>`;

const mapBox = $('[data-map]');
new IntersectionObserver((e, io) => {
  if (!e.some((x) => x.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Üst çubuk ve hareket ------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

if (!reducedMotion) {
  initSmoothScroll();

  // Açılış (~1,2 sn): şeritler 1-3-4-2 sırasıyla yukarıdan iner, inerken üstünde kırmızı çizgi yanar; künye gelir.
  const slices = $$('.slice');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  ORDER.forEach((c, k) => {
    tl.fromTo(slices[c], { yPercent: -8, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.55 }, k * 0.14)
      .fromTo(slices[c].querySelector('.slice__flash'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, k * 0.14 + 0.3);
  });
  tl.from('.hero__copy > *', { autoAlpha: 0, y: 18, duration: 0.55, stagger: 0.06, clearProps: 'all' }, 0.15);

  gsap.from('.svc', {
    y: 22, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out',
    scrollTrigger: { trigger: '.hizmet__grid', start: 'top 85%', toggleActions: 'play none none none' },
  });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count) || 0;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });
  // İletişim: 1-3-4-2 rakamları sırayla yanar (bir kez)
  gsap.from('.final__order li', {
    autoAlpha: 0.2, duration: 0.3, stagger: 0.18, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top 70%', toggleActions: 'play none none none' },
  });
  gsap.fromTo('.final__bg', { scale: 1.1 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
