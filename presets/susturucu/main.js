import '../../shared/base.css';
import './style.css';
import raw from '../../data/manifold.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, autoHideHeader, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

// Klasik aile, "Susturucu": kâğıt zemin, grafit mürekkep, temiz yeşil. İmza: motordan uca egzoz hattı;
// künyenin altında parça adlarıyla bir kez çizilir, hizmetler de aynı parça etiketlerini taşır.
gsap.registerPlugin(DrawSVGPlugin);

const d = boot({ ...raw, preset: 'susturucu' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const PARCA = { manifold: 'Manifold', katalitik: 'Katalitik', dpf: 'DPF', susturucu: 'Susturucu', uc: 'Egzoz ucu' };
const KISA = { manifold: 'Manifold', katalitik: 'Katalitik', dpf: 'DPF', susturucu: 'Susturucu', uc: 'Uç' };
// Hizmetin üstündeki küçük etiket: hattın hangi parçası; ölçüm, imalat ve askı işleri kendi adıyla.
const etiket = (h) => (/ölçüm/i.test(h.baslik) ? 'Ölçüm' : /imalat/i.test(h.baslik) ? 'İmalat' : /askı/i.test(h.baslik) ? 'Egzoz hattı' : PARCA[h.parca] || 'Egzoz hattı');
const HAT = ['manifold', 'katalitik', 'dpf', 'susturucu', 'uc'];

// --- Üst bar ------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status status--top ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------------

// Hattın path'i (viewBox 0–1000 × 0–120) ve parçaların x konumları; motor solda, uç sağda.
const HAT_YOL = 'M10 60 C 80 60, 90 30, 160 30 L 300 30 C 350 30, 350 90, 400 90 L 560 90 C 610 90, 610 40, 660 40 L 820 40 C 870 40, 880 70, 930 70 L 990 70';
const HAT_X = [160, 350, 480, 740, 960];

$('#kunye').innerHTML = `
  <div class="hero__photo" aria-hidden="true">
    <img class="hero__img" src="${asset('/img/manifold/duman.jpg')}" alt="" width="1600" height="1067" fetchpriority="high" />
  </div>
  <div class="hero__copy">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--clean" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="line" aria-hidden="true">
    <p class="line__head"><span>Egzoz hattı</span><span>Motordan uca</span></p>
    <div class="line__track">
      <svg class="line__svg" viewBox="0 0 1000 120" preserveAspectRatio="none">
        <path class="line__base" d="${HAT_YOL}" />
        <path class="line__flow" d="${HAT_YOL}" />
      </svg>
      <ol class="line__stops"></ol>
    </div>
  </div>`;

// Durakları path üzerine yerleştir.
const flow = $('.line__flow');
const toplam = flow.getTotalLength();
const duraklar = HAT_X.map((x) => {
  let best = 0, bestDx = Infinity;
  for (let l = 0; l <= toplam; l += toplam / 400) {
    const dx = Math.abs(flow.getPointAtLength(l).x - x);
    if (dx < bestDx) { bestDx = dx; best = l; }
  }
  const p = flow.getPointAtLength(best);
  return { oran: best / toplam, x: p.x / 10, y: (p.y / 120) * 100 };
});
$('.line__stops').innerHTML = HAT.map((id, i) => `
  <li class="stop ${duraklar[i].y <= 50 ? 'stop--ust' : 'stop--alt'}" style="left:${duraklar[i].x}%;top:${duraklar[i].y}%">
    <span class="stop__dot"></span><span class="stop__name">${KISA[id]}</span>
  </li>`).join('');

// --- Hizmetler --------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="hizmetler__head">
    <h2 class="h2" id="hizmetler-h">Hizmetler</h2>
    <p>Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <figure class="hat-cizim">
    <img src="${asset('/img/susturucu/egzoz-hatti-3d.jpg')}" alt="Manifolddan egzoz ucuna kadar egzoz hattının temsilî 3D çizimi" width="1200" height="675" loading="lazy" decoding="async" />
    <figcaption>Egzoz hattı: manifold, katalitik konvertör, DPF, susturucu ve egzoz ucu. Temsilî 3D çizim.</figcaption>
  </figure>
  <ul class="hizmetler__list">
    ${d.hizmetler.map((h) => `
      <li class="hizmet rv">
        <p class="hizmet__parca">${esc(etiket(h))}</p>
        <h3 class="hizmet__title">${esc(h.baslik)}</h3>
        <p class="hizmet__text">${esc(h.aciklama)}</p>
        <span class="hizmet__sure">${esc(h.sure)}</span>
      </li>`).join('')}
  </ul>`;

// --- Hakkında ---------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <figure class="hakkinda__photo rv"><img src="${asset('/img/manifold/kaynak.jpg')}" alt="Egzoz borusunun argon kaynağı, kıvılcımlar" width="1600" height="1067" loading="lazy" decoding="async" /></figure>
  <div class="hakkinda__copy">
    <h2 class="h2 rv" id="hakkinda-h">Hakkında</h2>
    <p class="hakkinda__lead rv">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="stats rv">
      <div class="stat"><dd><span data-count="${yas}">${yas}</span> yıl</dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
      <div class="stat"><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd><dt>haftada açık</dt></div>
    </dl>
    <dl class="facts rv">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2 rv" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="status status--big ${st.open ? 'is-open' : ''} rv">${esc(st.metin)}</p>
    <table class="hours rv">
      <caption class="sr-only">Çalışma saatleri</caption>
      <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="konum__addr rv">${esc(d.iletisim.adres)}</p>
    <div class="konum__actions rv">
      <a class="btn btn--clean" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="konum__map" data-map><span>Harita</span></div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="yorumlar__head">
    <h2 class="h2" id="yorumlar-h">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorumlar__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="yorum">
        <p class="yorum__stars" role="img" aria-label="5 üzerinden ${y.puan}">${icons.star.repeat(y.puan)}${`<span class="off">${icons.star}</span>`.repeat(5 - y.puan)}</p>
        <blockquote class="yorum__text">${esc(y.metin)}</blockquote>
        <p class="yorum__who"><strong>${esc(y.ad)}</strong> <span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <h2 class="final__title" id="final-h">İletişim</h2>
  <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
  <div class="final__actions">
    <a class="btn btn--ink btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('#foot').innerHTML = `
  <p><strong>${ad}</strong> · ${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D çizim temsilîdir. Yorumlar örnektir.</p>`;

// --- Harita: yaklaşınca yüklenir --------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -------------------------------------------------------------------------------

const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader($('#top'), { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Başlık künyeyi geçince kâğıt zemin alır.
ScrollTrigger.create({
  trigger: '#hizmetler', start: 'top 70px', end: 'max',
  onToggle: (s) => $('#top').classList.toggle('is-solid', s.isActive),
});

const stops = $$('.stop');
if (reducedMotion) {
  document.documentElement.classList.add('rm');
  stops.forEach((s) => s.classList.add('is-on'));
} else {
  initSmoothScroll();
  // Açılış (~1 sn, bir kez): fotoğraf gri isten renge döner, künye satır satır gelir, hat motordan uca çizilir.
  gsap.from('.hero__copy > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  gsap.fromTo('.hero__img', { filter: 'grayscale(1) brightness(.5)' }, { filter: 'grayscale(0) brightness(1)', duration: 1.1, ease: 'power2.out', clearProps: 'filter' });
  gsap.fromTo(flow, { drawSVG: '0%' }, {
    drawSVG: '100%', duration: 1.1, delay: 0.2, ease: 'power2.inOut',
    onUpdate() { const p = this.progress(); stops.forEach((s, i) => s.classList.toggle('is-on', p >= duraklar[i].oran - 0.01)); },
  });

  ScrollTrigger.batch('.rv', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('in'), i * 60)),
  });

  // Sayaçlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const hedef = Number(el.dataset.count);
    el.textContent = '0';
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef, duration: 1.2, ease: 'power2.out',
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}
