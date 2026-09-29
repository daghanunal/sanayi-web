// Salyangoz (klasik aile, turbo): çelik grisi zemin, grafit mürekkep, ısıl renk geçişi
// (saman sarısı → bronz → temper moru → mavi; egzoz tarafında ısınan çeliğin rengi). WebGL yok.
// Hareket az: açılışta turbonun ağzında salyangoz sarmalı bir kez çizilir; Hizmetler'de yandaki
// parçalarına ayrılmış turbo çiziminde etkin hizmetin parçası işaretlenir; İletişim'de sarmal kaydırdıkça çizilir.
import base from '../../data/sektor-turbo.json';
import extra from '../../data/turbo-klasik.json';
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
const parca = Object.fromEntries((d.parcalar || []).map((p) => [p.id, p]));
const hizmetParca = (h) => parca[d.hizmetParca?.[h.baslik]] || null;

// Arşimet sarmalı: iç yarıçaptan dışa, sonunda teğet çıkış borusu (salyangoz).
function sarmal(r0 = 30, r1 = 92, tur = 1.2, cikis = 70) {
  const n = 90, pts = [];
  const top = tur * Math.PI * 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = -Math.PI / 2 + t * top, r = r0 + (r1 - r0) * t;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const aSon = -Math.PI / 2 + top;
  const [ex, ey] = pts.at(-1);
  let s = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) s += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  if (cikis) s += `L${(ex - Math.sin(aSon) * cikis).toFixed(1)} ${(ey + Math.cos(aSon) * cikis).toFixed(1)}`;
  return s;
}
const mark = `<svg class="top__mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 16m-2 0a2 2 0 1 0 4 0a4 4 0 1 0-8 0a6 6 0 1 0 12 0a8 8 0 1 0-16 0" /></svg>`;

// --- Üst çubuk ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <picture class="hero__photo">
    <source media="(min-width: 900px)" srcset="${img('/img/turbo-klasik/giris-d.jpg')}" />
    <img src="${img('/img/turbo-klasik/giris-m.jpg')}" alt="Usta, tezgâhtaki dizel turboyu iki eliyle tutuyor" fetchpriority="high" />
  </picture>
  <div class="hero__shade" aria-hidden="true"></div>
  <svg class="hero__volute" viewBox="-100 -100 200 200" aria-hidden="true"><path pathLength="1" d="${sarmal()}" /></svg>
  <div class="hero__copy">
    <h1 class="hero__name" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--tint" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--glass" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--glass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ----------------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="hizmet__in">
    <div class="hizmet__side">
      <h2 class="h2" id="hizmet-h">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, turboya göre değişebilir. Fiyat ve randevu için arayın.</p>
      <figure class="parca">
        <div class="parca__img">
          <img src="${img('/img/turbo-klasik/turbo-parcalar.webp')}" alt="Parçalarına ayrılmış turbo: türbin gövdesi, türbin çarkı, yatak gövdesi, kompresör çarkı ve gövdesi" width="1400" height="1050" loading="lazy" decoding="async" />
          ${(d.parcalar || []).map((p) => `<span class="pin" style="left:${Number(p.x)}%;top:${Number(p.y)}%" data-part="${esc(p.id)}" aria-hidden="true">${esc(p.no)}</span>`).join('')}
        </div>
        <figcaption class="parca__cap" aria-hidden="true"><b data-cap-no></b><span data-cap-ad></span></figcaption>
      </figure>
    </div>
    <ol class="hizmet__list">
      ${d.hizmetler.map((h, i) => {
        const p = hizmetParca(h);
        return `
        <li class="svc" data-part="${esc(p?.id || '')}">
          <span class="svc__n mono">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="svc__t">${esc(h.baslik)}</h3>
          <p class="svc__d">${esc(h.aciklama)}</p>
          <p class="svc__meta mono">${h.sure ? `<span><span class="sr-only">Süre: </span>${esc(h.sure)}</span>` : ''}${p ? `<span class="svc__part">${esc(p.no)} · ${esc(p.ad)}</span>` : ''}</p>
        </li>`;
      }).join('')}
    </ol>
  </div>`;

// --- Hakkında ------------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <figure class="atolye__photo"><img src="${img('/img/turbo-klasik/usta.jpg')}" alt="Elinde turbo tutan usta" loading="lazy" decoding="async" /></figure>
  <div class="atolye__copy">
    <h2 class="h2" id="atolye-h">Hakkında</h2>
    <p class="lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
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
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr${s === 'Kapalı' ? ' class="off"' : ''}><th scope="row">${esc(g)}</th><td class="mono">${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="konum__addr">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><span class="mono">Harita</span></div>`;

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
        <p class="rev__who"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__bg" src="${img('/img/turbo-klasik/atolye.jpg')}" alt="" loading="lazy" decoding="async" />
  <div class="final__in">
    <svg class="final__spiral" viewBox="-100 -100 200 200" aria-hidden="true"><path pathLength="1" d="${sarmal(8, 88, 2.4, 0)}" /></svg>
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__btns">
      <a class="btn btn--tint btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D turbo çizimi temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnız yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((e, io) => {
  if (!e.some((x) => x.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Hizmet ↔ parça ---------------------------------------------------------------------------------

const pins = $$('.pin');
const capNo = $('[data-cap-no]');
const capAd = $('[data-cap-ad]');
let etkin = null;
function parcaGoster(id) {
  if (id === etkin) return;
  etkin = id;
  pins.forEach((p) => p.classList.toggle('is-on', p.dataset.part === id));
  const p = parca[id];
  capNo.textContent = p ? p.no : '';
  capAd.textContent = p ? p.ad : 'Parçalarına ayrılmış turbo';
}
parcaGoster(d.hizmetParca?.[d.hizmetler[0]?.baslik] || null);
const svcs = $$('.svc');
const svcIO = new IntersectionObserver((ents) => {
  for (const e of ents) e.target.classList.toggle('is-center', e.isIntersecting);
  const aktif = svcs.find((s) => s.classList.contains('is-center'));
  if (aktif) {
    svcs.forEach((s) => s.classList.toggle('is-on', s === aktif));
    parcaGoster(aktif.dataset.part || null);
  }
}, { rootMargin: '-45% 0px -45% 0px' });
svcs.forEach((s) => {
  svcIO.observe(s);
  s.addEventListener('pointerenter', () => parcaGoster(s.dataset.part || null));
});

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

  // Açılış (~1,4 sn, kaydırmayı kilitlemez): fotoğraf belirir, künye satır satır gelir, sarmal bir kez çizilip söner.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__photo img', { autoAlpha: 0, scale: 1.05, duration: 1.1 }, 0)
    .from('.hero__copy > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0.1)
    .fromTo('.hero__volute path', { strokeDashoffset: 1, autoAlpha: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.3)
    .fromTo('.hero__volute', { rotation: -40 }, { rotation: 20, duration: 1.8, ease: 'power2.out' }, 0.3)
    .to('.hero__volute path', { autoAlpha: 0.35, duration: 0.6 }, 1.4);

  gsap.from('.svc', {
    y: 20, autoAlpha: 0, duration: 0.55, stagger: 0.05, ease: 'power2.out',
    scrollTrigger: { trigger: '.hizmet__list', start: 'top 85%', toggleActions: 'play none none none' },
  });
  gsap.fromTo('.atolye__photo img', { yPercent: -6 }, {
    yPercent: 6, ease: 'none',
    scrollTrigger: { trigger: '.atolye', start: 'top bottom', end: 'bottom top', scrub: true },
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
  gsap.fromTo('.final__spiral path', { strokeDashoffset: 1 }, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top 85%', end: 'center center', scrub: 0.5 },
  });
  gsap.fromTo('.final__bg', { scale: 1.12 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
