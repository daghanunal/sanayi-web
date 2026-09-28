import '../../shared/base.css';
import './style.css';
import raw from '../../data/mikron.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

// Ayna (klasik aile): WebGL yok. Kimlik: ayna gibi taşlanmış çelik; açık krom zemin, bor yağı turkuazı,
// geniş Unbounded başlıklar, yuvarlak (kovan) formlar, mikrometre taksimatı.
// Hareket az: künye bir kez gelir, kovanın taksimatı bir kez döner ve hon izi çizilir; kaydırmaya bağlı sahne yok.
const d = boot({ ...raw, preset: 'rektifiye-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const IMG = (n) => asset(`/img/rektifiye-klasik2/${n}.jpg`);
const pad = (n) => String(n).padStart(2, '0');

// --- Üst çubuk ------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <span class="chip ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</span>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------

// Kovan ölçü halkası: mikrometre tamburu gibi 100 çizgi.
let ticks = '';
for (let i = 0; i < 100; i++) {
  const a = (i / 100) * Math.PI * 2 - Math.PI / 2;
  const major = i % 10 === 0;
  const mid = i % 5 === 0;
  const r1 = 51.5;
  const r2 = major ? 57 : mid ? 55.5 : 54;
  const c = (r) => [(Math.cos(a) * r).toFixed(2), (Math.sin(a) * r).toFixed(2)];
  if (major) {
    const [tx, ty] = c(60.5);
    ticks += `<text x="${tx}" y="${ty}" transform="rotate(${(i * 3.6).toFixed(1)} ${tx} ${ty})">${i / 2}</text>`;
  }
  const [x1, y1] = c(r1);
  const [x2, y2] = c(r2);
  ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${major ? ' class="is-major"' : ''}/>`;
}
// 45° hon izi: iki yönde çapraz çizgiler.
let ha = '';
let hb = '';
for (let x = -96; x <= 96; x += 8) {
  ha += `<line x1="${x}" y1="0" x2="${x + 100}" y2="100" pathLength="1" stroke-dasharray="1"/>`;
  hb += `<line x1="${x}" y1="100" x2="${x + 100}" y2="0" pathLength="1" stroke-dasharray="1"/>`;
}

$('#kunye').innerHTML = `
  <div class="wrap hero__grid">
    <div class="hero__text">
      <h1 class="hero__title" id="hero-title"><span class="krom">${ad}</span></h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt class="mono">Bugün</dt><dd class="state ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
        <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__actions">
        <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
    <div class="bore" aria-hidden="true">
      <svg class="bore__ring" viewBox="-60 -60 120 120"><g>${ticks}</g></svg>
      <div class="bore__win">
        <img src="${IMG('silindir-ic')}" alt="" width="1280" height="960" fetchpriority="high" />
        <svg class="bore__hatch" viewBox="0 0 100 100" preserveAspectRatio="none"><g class="hatch hatch--a">${ha}</g><g class="hatch hatch--b">${hb}</g></svg>
        <div class="bore__glint"></div>
      </div>
      <div class="bore__pointer"></div>
    </div>
  </div>`;

// --- Hizmetler -----------------------------------------------------------------------

const svcImgs = ['krank-3d', 'kesit-3d', 'blok', 'kafa', 'kafa', 'silindir-ic', 'blok', 'ayna'];
const svcAlt = {
  'krank-3d': 'Taşlanmış krank mili (temsilî 3D görsel)',
  'kesit-3d': 'Kesit: çapraz hon izli silindirler (temsilî 3D görsel)',
  blok: 'Honlanmış dört silindirli motor bloğu',
  kafa: 'Silindir kapağı ve eksantrik milleri',
  'silindir-ic': 'Silindirin içi, hon izleri',
  ayna: 'Torna aynası ve ayna ayakları',
};
const svcImg = (i) => svcImgs[i % svcImgs.length];
$('#hizmetler').innerHTML = `
  <div class="wrap services__grid">
    <div class="services__side">
      <h2 class="h2" id="isler-t">Hizmetler</h2>
      <p class="lead">Süreler yaklaşıktır, parçaya göre değişebilir. Fiyat için arayın.</p>
      <figure class="services__photo">
        <img data-svc-img src="${IMG(svcImg(0))}" alt="${svcAlt[svcImg(0)]}" width="1600" height="1000" loading="lazy" decoding="async" />
        <figcaption class="mono" data-svc-cap>${esc(d.hizmetler[0]?.baslik || '')}</figcaption>
      </figure>
    </div>
    <ol class="svc">
      ${d.hizmetler.map((h, i) => `
        <li data-i="${i}"${i === 0 ? ' class="is-active"' : ''}>
          <span class="svc__no mono" aria-hidden="true">${pad(i + 1)} / ${pad(d.hizmetler.length)}</span>
          <h3 class="svc__t">${esc(h.baslik)}</h3>
          <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure || '')}</span>
          <p class="svc__d">${esc(h.aciklama)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

const svcPhoto = $('[data-svc-img]');
const svcCap = $('[data-svc-cap]');
let svcCur = 0;
function setSvc(i) {
  if (i === svcCur) return;
  svcCur = i;
  $$('.svc li').forEach((li, k) => li.classList.toggle('is-active', k === i));
  svcPhoto.style.opacity = 0;
  setTimeout(() => {
    const n = svcImg(i);
    svcPhoto.onload = () => (svcPhoto.style.opacity = 1);
    svcPhoto.src = IMG(n);
    svcPhoto.alt = svcAlt[n];
    svcCap.textContent = d.hizmetler[i].baslik;
  }, 180);
}
if (matchMedia('(min-width: 900px)').matches) {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setSvc(+e.target.dataset.i)), { rootMargin: '-45% 0px -45% 0px' });
  $$('.svc li').forEach((li) => io.observe(li));
}

// --- Hakkında ------------------------------------------------------------------------

const galeri = [
  { src: IMG('blok'), alt: 'Honlanmış dört silindirli motor bloğu', w: 1280, h: 960 },
  { src: asset('/img/mikron/torna.jpg'), alt: 'Torna tezgâhı ve aynası', w: 1800, h: 1199 },
  { src: IMG('ayna'), alt: 'Torna aynası ve ayna ayakları', w: 1280, h: 1280 },
  { src: IMG('kafa'), alt: 'Silindir kapağı ve eksantrik milleri', w: 1280, h: 853 },
];
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <h2 class="h2" id="about-t">Hakkında</h2>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div><dd><span data-count="${yas}">${yas}</span> yıl</dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
        <div><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd><dt>haftada açık</dt></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Sık gelen motorlar</dt><dd><ul class="engines">${d.markalar.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></dd></div>` : ''}
    </dl>
  </div>
  <div class="gallery__track" data-lenis-prevent-touch>
    ${galeri.map((g) => `<figure><img class="g__img" src="${g.src}" alt="${esc(g.alt)}" width="${g.w}" height="${g.h}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('')}
  </div>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__hours">
      <h2 class="h2 h2--s" id="konum-t">Çalışma saatleri ve konum</h2>
      <p class="status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours mono">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><span class="mono">Harita</span></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------

const stars = (n) => `<span class="rv__stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="reviews__head">
      <h2 class="h2" id="yorum-t">Örnek yorumlar</h2>
      <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </div>
    <ul class="reviews__list" data-lenis-prevent-touch>
      ${d.yorumlar.map((r) => `
        <li>
          ${stars(r.puan)}
          <p class="rv__t">${esc(r.metin)}</p>
          <span class="rv__who"><span class="rv__av" aria-hidden="true">${esc(r.ad.trim().charAt(0))}</span><span><b>${esc(r.ad)}</b><span>${esc(r.arac)}</span></span></span>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ----------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__ring" aria-hidden="true"></div>
  <div class="wrap final__in">
    <h2 class="final__t" id="final-t"><span class="krom krom--dark">İletişim</span></h2>
    <p class="final__p">Fiyat ve teslim günü için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__actions">
      <a class="btn btn--accent btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line-light btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr mono">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small mono">© ${new Date().getFullYear()} ${ad}. Fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnızca yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, { passive: true });
solid();

if (reducedMotion) {
  $$('.hatch line').forEach((l) => l.setAttribute('stroke-dashoffset', '0'));
} else {
  initSmoothScroll();

  // Açılış (bir kez, ~1,2 sn): künye satır satır gelir, taksimat çeyrek tur döner, hon izi iki yönde çizilir.
  gsap.set('.hatch line', { attr: { 'stroke-dashoffset': 1 } });
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__text > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0)
    .from('.bore__win', { scale: 0.92, autoAlpha: 0, duration: 0.8 }, 0.05)
    .fromTo('.bore__ring', { rotation: 60, transformOrigin: '50% 50%' }, { rotation: 0, duration: 1.3, ease: 'power2.out' }, 0.1)
    .to('.hatch--a line', { attr: { 'stroke-dashoffset': 0 }, duration: 0.5, stagger: 0.015, ease: 'power1.out' }, 0.35)
    .to('.hatch--b line', { attr: { 'stroke-dashoffset': 0 }, duration: 0.5, stagger: 0.015, ease: 'power1.out' }, 0.7);

  ScrollTrigger.batch('.svc li, .reviews__list li, .facts > div', {
    start: 'top 92%',
    onEnter: (els) => {
      const yeni = els.filter((e) => !e.dataset.in);
      yeni.forEach((e) => (e.dataset.in = '1'));
      if (yeni.length) gsap.from(yeni, { autoAlpha: 0, y: 22, stagger: 0.06, duration: 0.55, ease: 'power2.out', clearProps: 'transform' });
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

  gsap.to('.final__ring', { rotation: 60, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true } });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
