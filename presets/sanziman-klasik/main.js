// Yağ Çubuğu (klasik aile, şanzıman): alüminyum grisi, grafit ve ATF kırmızısı
// (otomatik şanzıman yağının kendi rengi). Fotoğraf ağırlıklı, WebGL yok.
// Künyenin arkasında yağ çubuğu: açılışta şanzıman yağı bir kez MAX çizgisine kadar dolar.
// Kaydırmaya bağlı pin yok; gerisi düz site bölümleri.
import raw from '../../data/sektor-sanziman.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, autoHideHeader, telHref, waHref, mapsHref, mapsEmbed,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const B = import.meta.env.BASE_URL;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const drop = `<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 3C20 3 5 22 5 33a15 15 0 0 0 30 0C35 22 20 3 20 3z"/></svg>`;
const ok = (open) => `<i class="led${open ? ' is-open' : ''}" aria-hidden="true"></i>`;

// --- Başlık ---------------------------------------------------------------------
$('#top').innerHTML = `
  <a href="#kunye" class="top__brand" aria-label="${ad}, sayfa başı">
    <span class="top__mark" aria-hidden="true">${drop}</span>
    <span class="top__name">${ad}</span>
  </a>
  <nav class="top__nav" aria-label="Sayfa bölümleri">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------
$('[data-hero]').innerHTML = `
  <h1 class="hero__name" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt class="mono">Bugün</dt><dd class="durum">${ok(st.open)}<span>${esc(st.kunye)}</span></dd></div>
    <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--atf" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--ghost" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--ghost" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// --- Hizmetler ----------------------------------------------------------------------
$('#hizmetler').innerHTML = `
  <div class="sec-head">
    <h2 class="h2" id="svc-h">Hizmetler</h2>
    <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="svcs__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc">
        <span class="svc__no mono">${String(i + 1).padStart(2, '0')}</span>
        <div class="svc__body">
          <h3 class="svc__name">${esc(h.baslik)}</h3>
          <p class="svc__desc">${esc(h.aciklama)}</p>
        </div>
        <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
      </li>`).join('')}
  </ol>`;

// --- Hakkında ------------------------------------------------------------------------
const olgular = [
  { deger: yas, sonek: ' yıl', etiket: "Şaşmaz Oto Sanayi Sitesi'nde" },
  { deger: acikGun, sonek: ' gün', etiket: 'haftada açık' },
];
$('#hakkinda').innerHTML = `
  <figure class="about__photo"><img src="${B}img/sanziman-klasik/atolye.jpg" alt="Liftlerde araçların bulunduğu şanzıman atölyesi" width="1600" height="1067" loading="lazy" decoding="async" /></figure>
  <div class="about__copy">
    <h2 class="h2" id="about-h">Hakkında</h2>
    <p class="lead lead--ink">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
    <ul class="band">
      ${olgular.map((s) => `
        <li class="stat">
          <p class="stat__val"><span data-count="${s.deger}">${s.deger}</span><small>${esc(s.sonek)}</small></p>
          <p class="stat__lbl">${esc(s.etiket)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------
const GUN_SIRA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const bugun = (new Date().getDay() + 6) % 7;
const bugunMu = (g) => {
  const [a, b = a] = g.split('–');
  return bugun >= GUN_SIRA.indexOf(a) && bugun <= GUN_SIRA.indexOf(b);
};
$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="konum__status">${ok(st.open)}<span>${esc(st.metin)}</span></p>
    <table class="hours">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr class="${bugunMu(g) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td class="mono">${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <address class="konum__addr">${esc(d.iletisim.adres)}</address>
    <div class="konum__btns">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><span class="mono">Harita</span></div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="sec-head">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list">
    ${d.yorumlar.map((y) => `
      <li class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
        <blockquote class="rev__text">${esc(y.metin)}</blockquote>
        <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ------------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <img class="final__bg" src="${B}img/sanziman-klasik/gece-vites.jpg" alt="" width="1600" height="1067" loading="lazy" decoding="async" />
  <svg class="final__d" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2C20 2 4 22 4 33a16 16 0 0 0 32 0C36 22 20 2 20 2z"/></svg>
  <div class="final__in">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--atf btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Başlık davranışı -------------------------------------------------------------------
const top = $('#top');
ScrollTrigger.create({ start: () => innerHeight * 0.5, end: 'max', onToggle: (s) => top.classList.toggle('is-solid', s.isActive) });
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Hareket ---------------------------------------------------------------------------
// Yağ çubuğunun MIN/MAX işaretleri hero yüksekliğine göre (yağ yüzeyi hero'nun %62'si)
const hero = $('.hero');
const olcHero = () => hero.style.setProperty('--hh', `${hero.offsetHeight}px`);
olcHero();
new ResizeObserver(olcHero).observe(hero);
const oil = $('[data-oil]');
if (reducedMotion) {
  oil.classList.add('is-full');
} else {
  initSmoothScroll();

  // Açılış (~1,2 sn): yağ alttan MAX çizgisine kadar dolar, künye yazıları gelir.
  gsap.fromTo(oil, { yPercent: 100 }, { yPercent: 0, duration: 1.2, ease: 'power3.out', delay: 0.1, onComplete: () => oil.classList.add('is-full') });
  gsap.from('.stick', { opacity: 0, x: 20, duration: 0.7, ease: 'power3.out', delay: 0.2 });
  gsap.from('.hero__copy > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', delay: 0.15, clearProps: 'all' });

  $$('.h2').forEach((h) => gsap.from(h, { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));
  gsap.from('.svc', { y: 22, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: '.svcs__list', start: 'top 88%' } });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 94%' }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });
  gsap.fromTo('.about__photo img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.rev', { y: 24, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 90%' } });
  gsap.fromTo('.final__d', { yPercent: 18, opacity: 0.2 }, { yPercent: -6, opacity: 0.8, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

addEventListener('load', () => ScrollTrigger.refresh());
