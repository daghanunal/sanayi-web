import '../../shared/base.css';
import './style.css';
import raw from '../../data/mikron.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, setStoryMode,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Mikron (sinematik aile): 3D iki yerde kalır. (1) Künye: arkada krank mili aynada döner. (2) Hizmetler: her
// hizmete gelince sahne ilgili tezgâha geçer (krank taşlama, silindir honlama, kafa planyası); kartın üstünde parçanın
// adı yazar. Hizmetlerden sonra sahne kararır ve çizilmez; gerisi normal site bölümleridir.
const d = boot({ ...raw, preset: 'mikron' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('is-reduced');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const phone = matchMedia('(max-width: 899px)').matches;
matchMedia('(max-width: 899px)').addEventListener('change', () => location.reload());
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// Hizmet → sahnedeki tezgâh (film ilerlemesi) ve etiket olarak parça adları.
const ISTASYON = [
  { re: /krank/i, p: 0.28, parca: ['Krank mili', 'Taşlama taşı'] },
  { re: /hon/i, p: 0.62, parca: ['Silindir bloğu', 'Hon başlığı'] },
  { re: /planya/i, p: 0.88, parca: ['Silindir kapağı', 'Freze çakısı'] },
  { re: /supap/i, p: 0.8, parca: ['Silindir kapağı'] },
  { re: /basınç|test/i, p: 0.78, parca: ['Silindir kapağı'] },
  { re: /gömlek/i, p: 0.5, parca: ['Silindir bloğu'] },
  { re: /biyel|yatak/i, p: 0.1, parca: ['Krank mili', 'Ana yatak muylusu'] },
  { re: /torna|freze/i, p: 0.93, parca: ['Freze çakısı'] },
];
const hizmetler = d.hizmetler.map((h) => ({ ...h, ist: ISTASYON.find((m) => m.re.test(h.baslik)) ?? { p: 0.05, parca: [] } }));

// --- Üst çubuk ------------------------------------------------------------------

$('#hdr').innerHTML = `
  <a class="hdr__brand" href="#kunye">${ad}</a>
  <nav class="hdr__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="hdr__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="hdr__tel btn btn--steel" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__in">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--blue" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler -----------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="isler__bas">
    <h2 class="sec-title" id="isler-t">Hizmetler</h2>
    <p class="sec-lead">Süreler yaklaşıktır, parçaya göre değişebilir. Fiyat için arayın.</p>
  </div>
  ${hizmetler.map((h, i) => `
    <article class="svc" data-i="${i}">
      <div class="svc__card">
        <p class="svc__tag">${pad(i + 1)}${h.ist.parca.length ? ` · ${h.ist.parca.map(esc).join(' · ')}` : ''}</p>
        <h3 class="svc__t">${esc(h.baslik)}</h3>
        <p class="svc__d">${esc(h.aciklama)}</p>
        <p class="svc__sure">Süre <b>${esc(h.sure)}</b></p>
      </div>
    </article>`).join('')}`;

// --- Hakkında --------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap hakkinda__grid">
    <div>
      <h2 class="sec-title" id="hakkinda-t">Hakkında</h2>
      <p class="hakkinda__txt">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="dro">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span data-count="${yas}">${yas}</span><small>YIL</small></dd></div>
        <div><dt>haftada açık</dt><dd><span data-count="${acikGun}">${acikGun}</span><small>GÜN</small></dd></div>
      </dl>
    </div>
    <dl class="bilgi">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen motorlar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <div class="wrap galeri">
    ${(d.galeri || []).slice(0, 3).map((g, i) => `<figure class="galeri__k galeri__k--${i + 1}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('')}
  </div>`;

// --- Çalışma saatleri ve konum -------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap konum__grid">
    <div>
      <h2 class="sec-title" id="konum-t">Çalışma saatleri ve konum</h2>
      <p class="konum__status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="saatler">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="konum__adres">${esc(d.iletisim.adres)}</p>
      <div class="konum__btns">
        <a class="btn btn--blue" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="harita" data-map><span>Harita</span></div>
  </div>`;

// --- Örnek yorumlar ----------------------------------------------------------------------

const yildiz = (n) => `<p class="yorum__s" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <h2 class="sec-title" id="yorum-t">Örnek yorumlar</h2>
    <p class="sec-lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="yorumlar__row" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <figure class="yorum">
        ${yildiz(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

// --- İletişim ----------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap son__in">
    <h2 class="son__title" id="son-t">İletişim</h2>
    <p class="sec-lead">Fiyat ve teslim günü için arayın ya da WhatsApp'tan yazın.</p>
    <div class="son__btns">
      <a class="btn btn--blue btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="son__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D tezgâh sahnesi temsilîdir. Yorumlar örnektir.</p>
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
if (phone) autoHideHeader(hdr, { offset: 120 });
const solid = () => hdr.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

// --- 3D: künye ve hizmetler ---------------------------------------------------------------------

const canvas = $('.stage');
const shade = $('.stage-shade');
const low = phone || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
let scene = null;
const film = { p: 0 };
let karanlik = 0; // 1: sahne tamamen karardı, çizim durur

import('./scene.js')
  .then(({ createScene }) => {
    try {
      scene = createScene(canvas, { low, reduced: reducedMotion });
    } catch {
      canvas.remove();
      return;
    }
    addEventListener('resize', () => { scene.resize(); if (reducedMotion) scene.render(); });
    scene.setProgress(0);
    scene.warm();
    gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' });
    if (reducedMotion) {
      scene.setProgress(0.3);
      scene.render();
      return;
    }
    senkron();
  })
  .catch(() => canvas.remove());

function senkron() {
  if (!scene || reducedMotion) return;
  if (karanlik < 0.995 && !document.hidden) scene.start();
  else scene.stop();
}
document.addEventListener('visibilitychange', senkron);

function istasyonaGit(p) {
  if (!scene) { film.p = p; return; }
  gsap.to(film, {
    p, duration: Math.min(1.6, 0.5 + Math.abs(p - film.p) * 2), ease: 'power2.inOut', overwrite: true,
    onUpdate: () => scene.setProgress(film.p),
  });
}

// --- Hareket ---------------------------------------------------------------------------------

if (!reducedMotion) {
  initSmoothScroll({ lerp: 0.1 });

  gsap.from('.hero__in > *', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  // Hizmet kartı etkinleşince sahne o tezgâha geçer.
  const svcEls = $$('.svc');
  svcEls.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 60%', end: 'bottom 40%',
      onToggle: (s) => {
        el.classList.toggle('is-active', s.isActive);
        if (s.isActive) istasyonaGit(hizmetler[i].ist.p);
      },
    });
  });
  // Künyeye dönünce sahne başa döner.
  ScrollTrigger.create({ trigger: '#kunye', start: 'top top', end: 'bottom 60%', onEnterBack: () => istasyonaGit(0) });

  // Telefonda hizmetler boyunca alt çubuk çekilir (kart ekranın altında tek alt öğe).
  if (phone) {
    ScrollTrigger.create({
      trigger: svcEls[0], start: 'top 70%', endTrigger: svcEls.at(-1), end: 'bottom 30%',
      onToggle: (s) => setStoryMode(s.isActive ? true : null),
    });
  }

  // Hizmetlerden sonra sahne kararır; tam karanlıkta çizim durur.
  ScrollTrigger.create({
    trigger: '#hakkinda', start: 'top 95%', end: 'top 35%', scrub: true,
    onUpdate: (s) => {
      karanlik = s.progress;
      canvas.style.opacity = String(1 - s.progress);
      shade.style.opacity = String(1 - s.progress);
      senkron();
    },
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
