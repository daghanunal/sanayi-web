// Asfalt (kinetik aile): sayfa üstten görülen bir yol. Yola boyanmış dev yazılar yalnız olgulardır:
// işletmenin adı, kuruluş yılı, bugünkü açık/kapalı durumu ve telefon numarası. Kaydırma hızlandıkça
// boyalı yazılar uzar (hareket bulanıklığı). WebGL yok.
import pist from '../../data/pist.json';
import ek from '../../data/asfalt.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { car, treadDefs, track, arrow, speedSign, asphaltTexture, wornMask } from './marks.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...pist, ...ek, preset: 'asfalt' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
const phone = () => innerWidth < 900;

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);

// --- Dokular -----------------------------------------------------------------

root.style.setProperty('--asfalt-img', `url(${asphaltTexture()})`);
root.style.setProperty('--worn', `url(${wornMask()})`);
$('[data-tread-defs]').innerHTML = `<g class="defs--iz">${treadDefs('iz')}</g>`;

// Boyalı yazı: aria-hidden; okunan metin her zaman yanındaki gerçek başlık ya da etikettir.
const mark = (text, cls = '') => `<div class="mark ${cls}" data-mark aria-hidden="true"><span>${esc(text)}</span></div>`;

// --- Üst çubuk --------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="top__status"><i class="${st.open ? 'on' : ''}"></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye: adı yola boyanmış ----------------------------------------------------------

// Kısa kelimeler ("&") sonrakine bağlanır; satır düzeni ekrana göre fitHero ile seçilir.
const words = [];
for (const w of d.isletme.ad.split(/\s+/).filter(Boolean)) {
  const prev = words.at(-1);
  if (prev && prev.length <= 2 && !prev.includes(' ')) words[words.length - 1] = `${prev} ${w}`;
  else words.push(w);
}
$('#kunye').innerHTML = `
  <div class="road" aria-hidden="true">
    <i class="road__edge road__edge--l"></i><i class="road__edge road__edge--r"></i><i class="road__center"></i>
  </div>
  <div class="hero__tracks" aria-hidden="true">
    ${[0, 1].map(() => `<svg class="hero__track" viewBox="0 0 60 1000" preserveAspectRatio="none">${track('dortmevsim', 1000, 'iz')}</svg>`).join('')}
  </div>
  <div class="hero__car" aria-hidden="true">${car({ id: 'hero' })}</div>
  <div class="hero__stack">
    <h1 class="hero__marks" id="hero-title" aria-label="${ad}"></h1>
    <div class="hero__copy">
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__cta">
        <a class="btn btn--paint" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;
const heroMarks = $('.hero__marks');
let lines = words;
const renderMarks = () =>
  (heroMarks.innerHTML = lines.map((l) => `<span class="hm" aria-hidden="true"><span class="hm__t">${esc(l)}</span></span>`).join(''));
renderMarks();

// --- Hizmetler: her hizmet bir şerit; süre hız tabelasında ----------------------------------

const OKLAR = ['duz', 'sag', 'duz', 'sol', 'duz', 'sag', 'sol'];
const tabela = (sure) => {
  const [ust, ...alt] = String(sure).split(' ');
  return /^\d/.test(ust) ? speedSign(esc(ust), esc(alt.join(' '))) : speedSign(`<span class="sign__word">${esc(sure)}</span>`);
};
$('#hizmetler').innerHTML = `
  <h2 class="h2" id="hizmet-h">Hizmetler</h2>
  <p class="lead">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  <ol class="lanes">
    ${d.hizmetler.map((h, i) => `
      <li class="lane">
        <span class="lane__arrow" aria-hidden="true">${arrow(OKLAR[i % OKLAR.length])}</span>
        <div class="lane__body">
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <p class="sr-only">Süre: ${esc(h.sure)}</p>
        </div>
        <span class="lane__sign">${tabela(h.sure)}</span>
      </li>`).join('')}
  </ol>`;

// --- Hakkında: kuruluş yılı yola boyanmış ----------------------------------------------------

const hg = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  ${mark(String(d.isletme.kurulus))}
  <div class="hakkinda__grid">
    <div>
      <h2 class="h2" id="hakkinda-h">Hakkında</h2>
      <p class="lead lead--ink">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="stones">
        <li class="stone"><span class="stone__cap"></span><b><span data-count="${yas}">${yas}</span> yıl</b><span>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li class="stone"><span class="stone__cap"></span><b><span data-count="${acikGun}">${acikGun}</span> gün</b><span>haftada açık</span></li>
      </ul>
    </div>
    <div>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Satılan lastik markaları</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
      ${hg ? `<figure class="plate"><img src="${esc(asset(hg.src))}" alt="${esc(hg.alt)}" width="${hg.w}" height="${hg.h}" loading="lazy" decoding="async" /></figure>` : ''}
    </div>
  </div>`;

// --- Çalışma saatleri ve konum: bugünkü durum yola boyanmış --------------------------------------

$('#saatler').innerHTML = `
  ${mark(st.open ? 'Açık' : 'Kapalı', st.open ? '' : 'is-closed')}
  <div class="konum__grid">
    <div>
      <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
      <p class="konum__status status ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="saat">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="yon">
        <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 L34 20 L25 20 L25 36 L15 36 L15 20 L6 20 Z" fill="currentColor"/></svg>
        <p>${esc(d.iletisim.adres)}</p>
      </div>
      <div class="konum__cta">
        <a class="btn btn--paint" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------------

const stars = (n) => `<p class="review__stars" role="img" aria-label="5 üzerinden ${n}">${'★'.repeat(n)}<span>${'★'.repeat(5 - n)}</span></p>`;
$('#yorumlar').innerHTML = `
  <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
  <p class="lead">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  <div class="yorum__row" data-lenis-prevent-touch>
    <ul class="yorum__track">
      ${d.yorumlar.map((y) => `
        <li class="review">
          ${stars(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="review__who">${esc(y.ad)}<small>${esc(y.arac)}</small></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim: araç gelip durma çizgisinde durur ----------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__road" aria-hidden="true">
    <i class="road__edge road__edge--l"></i><i class="road__edge road__edge--r"></i>
    <i class="final__line"></i>
    <div class="final__car">${car({ id: 'final', brake: true })}</div>
  </div>
  <div class="final__copy">
    <h2 class="final__title" id="final-h">İletişim</h2>
    <p class="lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Lastik ebadı yanağın fotoğrafından da okunur.</p>
    <div class="final__cta">
      <a class="btn btn--paint btn--big" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--big" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <p><strong>${ad}</strong> · ${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraf ve üstten araç çizimi temsilîdir. Yorumlar örnektir.</p>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Başlığı genişliğe sığdır ---------------------------------------------------------------------

// Kelimeleri 1..n satıra bölen her düzeni dener, harf boyu en büyük olanı seçer (yol yazısı gibi hepsi aynı boy).
const measurer = document.createElement('span');
measurer.className = 'hm__t hm__measure';
heroMarks.append(measurer);
const widthOf = (text) => ((measurer.textContent = text), measurer.getBoundingClientRect().width);
function fitHero() {
  const w = heroMarks.clientWidth;
  const sy = parseFloat(getComputedStyle(heroMarks).getPropertyValue('--sy')) || 1.5;
  const hMax = innerHeight * (phone() ? 0.24 : 0.36);
  measurer.style.fontSize = '100px';
  let best = { fs: 0, lines: words };
  const n = words.length;
  for (let m = 0; m < 1 << (n - 1); m++) {
    const ls = [];
    let cur = words[0];
    for (let i = 1; i < n; i++) {
      if (m & (1 << (i - 1))) { ls.push(cur); cur = words[i]; } else cur += ` ${words[i]}`;
    }
    ls.push(cur);
    const widest = Math.max(...ls.map(widthOf));
    const fs = Math.min((w / widest) * 100, hMax / ls.length / sy / 0.8, 300);
    if (fs > best.fs) best = { fs, lines: ls };
  }
  measurer.textContent = '';
  heroMarks.style.setProperty('--fs', `${best.fs.toFixed(1)}px`);
  if (best.lines.join('|') !== lines.join('|')) {
    lines = best.lines;
    renderMarks();
    heroMarks.append(measurer);
  }
}

// --- Hareket ----------------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', solid, { passive: true });
solid();

let lastW = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; fitHero(); } });

document.fonts.ready.then(() => {
  fitHero();
  if (reducedMotion) {
    root.classList.add('is-static');
    return;
  }
  const lenis = initSmoothScroll();

  // Kaydırma hızı: boyalı yazılar hızlandıkça uzar. Yalnız belirgin değişimde yazılır.
  let vel = 0, shown = 0;
  const velEls = $$('[data-mark], .hero__marks');
  gsap.ticker.add(() => {
    const target = Math.min(1, Math.abs(lenis?.velocity || 0) / 60);
    vel += (target - vel) * 0.12;
    if (vel < 0.004) vel = 0;
    const q = Math.round(vel * 50) / 50;
    if (q !== shown) { shown = q; for (const el of velEls) el.style.setProperty('--vel', q); }
  });

  // Açılış (~1,4 sn, kaydırmayı kilitlemez): ad yola boyanır, araç sağ şeritten geçip çıkar, arkasında iz kalır.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .fromTo('.hm', { clipPath: 'inset(100% 0 -40% 0)' }, { clipPath: 'inset(-40% 0 -40% 0)', duration: 0.7, stagger: 0.1, ease: 'power2.inOut' })
    .from('.hero__copy > *', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.05, clearProps: 'all' }, 0.2)
    .fromTo('.hero__car', { y: () => innerHeight * 0.6 }, { y: () => -innerHeight * 1.5, duration: 1.4, ease: 'power2.in' }, 0.1)
    .fromTo('.hero__track', { yPercent: 100 }, { yPercent: 0, duration: 1.4, ease: 'power2.in' }, 0.1);

  // Boyalı yazılar alttan üste boyanır, geçerken hafif paralaks.
  $$('[data-mark]').forEach((m) => {
    gsap.fromTo(m.querySelector('span'), { clipPath: 'inset(100% 0 -30% 0)' }, {
      clipPath: 'inset(-30% 0 -30% 0)', ease: 'none',
      scrollTrigger: { trigger: m, start: 'top 92%', end: 'top 50%', scrub: 0.4 },
    });
  });

  // Şerit okları çizilir, gövde yandan gelir.
  $$('.lane').forEach((li) => {
    gsap.fromTo(li.querySelector('.arrow'), { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', ease: 'none', scrollTrigger: { trigger: li, start: 'top 90%', end: 'top 60%', scrub: 0.4 },
    });
    gsap.from(li.querySelector('.lane__body'), { x: -24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: li, start: 'top 85%', once: true } });
  });

  // Kilometre taşlarındaki rakamlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });

  // Son bölüm: araç aşağıdan gelip durma çizgisinde durur, fren lambaları yanık.
  gsap.fromTo('.final__car', { y: () => innerHeight * 0.7 }, {
    y: 0, ease: 'power3.out', scrollTrigger: { trigger: '#iletisim', start: 'top 85%', end: 'center 60%', scrub: 0.5, invalidateOnRefresh: true },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  ScrollTrigger.refresh();
});
