import usta from '../../data/usta.json';
import ek from '../../data/doseme-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

// Nappa: klasik aile. Beton zemin, emniyet turuncusu, askılı numune etiketleri.
// Künyenin yanında sökülmüş koltuk ve numaralı parça notları; açılışta fotoğraf bir kez yakından uzağa çekilir.
gsap.registerPlugin(SplitText);

const d = boot({ ...usta, ...ek, preset: 'doseme-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const no = (i) => String(i + 1).padStart(2, '0');

// --- Header ------------------------------------------------------------------
$('[data-ad]').textContent = d.isletme.ad;
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
topCall.innerHTML = `${icons.phone}<span>${tel}</span>`;
const statusEl = $('[data-status]');
statusEl.textContent = st.open ? 'Açık' : 'Kapalı';
statusEl.classList.toggle('is-open', st.open);

const durum = (metin) => `<span class="status ${st.open ? 'is-open' : ''}"><i></i>${esc(metin)}</span>`;

// --- Hero: künye --------------------------------------------------------------
const adKelime = d.isletme.ad.split(/\s+/);
$('#hero').innerHTML = `
  <div class="hero__stage">
    <div class="hero__copy">
      <h1 class="hero__name" id="hero-title">${adKelime.map((w) => `<span class="ln"><span>${esc(w)}</span></span>`).join(' ')}</h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd>${durum(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__actions">
        <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
    <figure class="hero__photo">
      <div class="hero__cam">
        <img src="${asset('/img/doseme-klasik2/hero.jpg')}" alt="Yeniden döşenmiş, dikey pilili bej deri koltuk" fetchpriority="high" width="2000" height="2500">
        ${d.etiketler.map((t, i) => `<div class="tag tag--${t.yon === 'sag' ? 'sag' : 'sol'}" style="--x:${Number(t.x)}%;--y:${Number(t.y)}%" aria-hidden="true"><i class="tag__dot" data-n="${i + 1}"></i><span class="tag__line"></span><span class="tag__txt"><em>${no(i)}</em><b>${esc(t.baslik)}</b><span>${esc(t.metin)}</span></span></div>`).join('')}
      </div>
      <figcaption class="sr-only">Koltukta bakılan yerler: ${d.etiketler.map((t) => `${esc(t.baslik)}, ${esc(t.metin)}`).join('; ')}</figcaption>
    </figure>
  </div>`;

// Uzun dükkân adları da sığsın: en uzun kelimeye göre punto küçülür.
const nameEl = $('.hero__name');
const fitName = () => {
  nameEl.style.fontSize = '';
  const box = nameEl.clientWidth;
  const widest = Math.max(...$$('.ln > span', nameEl).map((s) => s.scrollWidth));
  if (widest > box) nameEl.style.fontSize = `${parseFloat(getComputedStyle(nameEl).fontSize) * (box / widest) * 0.97}px`;
};
$$('.ln > span', nameEl).forEach((s) => (s.style.width = 'max-content'));
document.fonts.ready.then(fitName);
addEventListener('resize', fitName);

// --- Hizmetler: askılı numune etiketleri ---------------------------------------------
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="head">
      <h2 id="hizmetler-h">Hizmetler</h2>
      <p class="head__sub">Süreler yaklaşıktır, araca ve koltuğun durumuna göre değişebilir. Fiyat ve randevu için arayın.</p>
    </header>
  </div>
  <div class="rail" tabindex="0" aria-label="Hizmetler, yana kaydırın">
    <ul class="rail__list">
      ${d.hizmetler.map((h, i) => `
        <li class="swatch">
          <span class="swatch__hole" aria-hidden="true"></span>
          <div class="swatch__img"><img src="${h.gorsel}" alt="" loading="lazy" decoding="async"></div>
          <div class="swatch__body">
            <p class="swatch__no">No. ${no(i)}</p>
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
            <span class="swatch__time">${esc(h.sure)}</span>
          </div>
        </li>`).join('')}
    </ul>
  </div>
  <p class="rail__hint wrap" aria-hidden="true">Yana kaydırın →</p>`;

// --- Hakkında ------------------------------------------------------------------------
const galeri = d.galeriEk || [];
$('#hakkinda').innerHTML = `
  <div class="wrap">
    <div class="about__grid">
      <h2 class="about__title" id="hakkinda-h">Hakkında</h2>
      <div class="about__body">
        <p class="about__lead">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
        <dl class="facts">
          ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
          ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
        </dl>
        <ul class="about__facts">
          <li><strong><b data-count="${yas}">${yas}</b> yıl</strong><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
          <li><strong><b data-count="${acikGun}">${acikGun}</b> gün</strong><span>haftada açık</span></li>
        </ul>
      </div>
    </div>
    <div class="gallery__grid">
      ${galeri.map((g, i) => `
        <figure class="shot">
          <div class="shot__img"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" decoding="async"></div>
          <figcaption><em>${no(i)}</em>${esc(g.alt)}</figcaption>
        </figure>`).join('')}
    </div>
  </div>`;

// --- Çalışma saatleri ve konum -------------------------------------------------------
$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <h2 id="saatler-h">Çalışma saatleri ve konum</h2>
      ${durum(st.metin)}
      <dl class="hours">${saatListesi(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
      <address>${esc(d.iletisim.adres)}</address>
      <div class="visit__actions">
        <a class="btn btn--orange" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-src="${esc(mapsEmbed(d))}"><span>Harita</span></div>
  </div>`;

// --- Örnek yorumlar -----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__grid">
    <header class="reviews__head">
      <h2 id="yorumlar-h">Örnek yorumlar</h2>
      <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
    <div class="rail rail--flat" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
      <ul class="rail__list reviews__list">
        ${d.yorumlar.map((y) => `
          <li class="review">
            <span class="stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</span>
            <blockquote>${esc(y.metin)}</blockquote>
            <p class="review__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
          </li>`).join('')}
      </ul>
    </div>
  </div>`;

// --- İletişim -------------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="wrap">
    <h2 class="finale__title" id="iletisim-h">İletişim</h2>
    <p class="finale__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Koltuğun fotoğrafı da gönderilebilir.</p>
    <div class="finale__actions">
      <a class="btn btn--ink btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--paper btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('.foot').innerHTML = `
  <div class="wrap foot__grid">
    <p class="foot__name">${ad}</p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__copy">© ${buYil} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// --- Harita: yaklaşınca yükle ------------------------------------------------------
const mapBox = $('.visit__map');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe src="${mapBox.dataset.src}" title="${ad} konumu" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapBox);

// --- Header durumu --------------------------------------------------------------
const top = $('#top');
const syncTop = () => top.classList.toggle('is-solid', window.scrollY > 40);
window.addEventListener('scroll', syncTop, { passive: true });
syncTop();
let unhide = null;
const phoneMq = matchMedia('(max-width: 899px)');
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Hareket --------------------------------------------------------------------
if (reducedMotion) {
  document.documentElement.classList.add('is-static');
} else {
  initSmoothScroll();

  // Açılış (bir kez, ~1,4 sn): fotoğraf pililerin üstünden geri çekilir, parça notları sırayla belirir.
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .fromTo('.hero__cam', { scale: 1.9, xPercent: -14, yPercent: 30 }, { scale: 1, xPercent: 0, yPercent: 0, duration: 1.3, ease: 'power2.inOut' }, 0)
    .from('.hero__name .ln > span', { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.05)
    .from('.hero__copy > :not(.hero__name)', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, clearProps: 'all' }, 0.3);
  $$('.tag').forEach((t, i) => {
    const at = 1.1 + i * 0.12;
    intro.from(t.querySelector('.tag__dot'), { scale: 0, duration: 0.3, ease: 'back.out(3)' }, at)
      .from(t.querySelector('.tag__line'), { scaleX: 0, duration: 0.25 }, at + 0.1)
      .from(t.querySelector('.tag__txt'), { autoAlpha: 0, x: 10, duration: 0.3 }, at + 0.15);
  });

  // Başlıklar
  document.fonts.ready.then(() => {
    $$('.head h2, .about__title, .visit__info h2, .reviews__head h2, .finale__title').forEach((h) => {
      const s = new SplitText(h, { type: 'lines', mask: 'lines' });
      gsap.from(s.lines, {
        yPercent: 105, duration: 0.9, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' },
      });
    });
  });

  // Numune etiketleri: askıdan sallanarak gelir
  ScrollTrigger.batch('.swatch', {
    start: 'top 92%',
    onEnter: (els) => gsap.fromTo(els, { rotate: -7, y: 50, autoAlpha: 0 }, {
      rotate: 0, y: 0, autoAlpha: 1, duration: 1.2, ease: 'elastic.out(1, 0.55)', stagger: 0.08, overwrite: true,
    }),
  });

  // Olgu rakamları
  $$('[data-count]').forEach((el) => {
    const v = Number(el.dataset.count);
    const o = { n: 0 };
    el.textContent = '0';
    gsap.to(o, {
      n: v, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => (el.textContent = Math.round(o.n)),
    });
  });

  // Galeri: kareler aşağıdan açılır
  ScrollTrigger.batch('.shot', {
    start: 'top 92%',
    onEnter: (els) => gsap.fromTo(els, { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true,
      onComplete() { this.targets().forEach((e) => (e.style.clipPath = '')); },
    }),
  });

  ScrollTrigger.batch('.review', {
    start: 'top 94%',
    onEnter: (els) => gsap.fromTo(els, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08, overwrite: true }),
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
