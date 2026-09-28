// Tork (kinetik aile): 3D yok. Kimlik: ultramarin dinamometre kâğıdı, bölünmüş kart tabela, dev dar harfler.
// Büyük yazılar yalnız olgulardır: işletmenin adı, hizmet adları, yıl ve açık gün sayısı.
import garaj from '../../data/garaj.json';
import ek from '../../data/tork.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { devirEgrisi } from './dyno.js';

gsap.registerPlugin(SplitText);

const d = boot({ ...garaj, ...ek, preset: 'tork' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);

// --- Üst çubuk -----------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye: tabela -------------------------------------------------------------------

// Harfler adın kendi yazılışıyla (büyük harfle bağıran başlık yok).
const kelimeler = d.isletme.ad.split(/\s+/).filter(Boolean);
const tabela = kelimeler
  .map((k) => `<span class="board__row">${[...k].map((c) => `<span class="tile" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</span>`)
  .join('');
$('#kunye').innerHTML = `
  <h1 class="board" id="hero-title" aria-label="${ad}" style="--n:${Math.max(...kelimeler.map((k) => [...k].length), 5)}"><span aria-hidden="true">${tabela}</span></h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="status ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__actions">
    <a class="btn btn--sari" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

// Tabela harfleri bölünmüş kart gibi dönerek yerine oturur (bir kez, ~1 sn).
function tabelaCevir() {
  const tiles = $$('.tile', $('#kunye'));
  const HARF = 'abcçdefgğhıijklmnoöprsştuüvyz';
  const plan = tiles.map((t, i) => ({ t, kalan: 4 + ((i * 7) % 5), sonraki: 80 + i * 35 }));
  const start = performance.now();
  const tick = (now) => {
    const el = now - start;
    let bitmedi = false;
    for (const p of plan) {
      if (p.kalan < 0) continue;
      bitmedi = true;
      if (el < p.sonraki) continue;
      p.t.textContent = p.kalan === 0 ? p.t.dataset.c : HARF[(Math.random() * HARF.length) | 0];
      p.t.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.12)' }, { transform: 'scaleY(1)' }], { duration: 70 });
      p.kalan -= 1;
      p.sonraki = el + 55;
    }
    if (bitmedi) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// --- Hizmetler -----------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="bolum-bas">
    <h2 id="hizmetler-h">Hizmetler</h2>
    <p>Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ul class="hizmet-liste">
    ${d.hizmetler.map((h) => `
      <li class="hizmet">
        <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
        <p class="hizmet__metin">${esc(h.aciklama)}</p>
        <span class="hizmet__sure"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
      </li>`).join('')}
  </ul>`;

// --- Hakkında: kilometre sayacı gibi dönen haneler ------------------------------------

const sayacHTML = (n) =>
  [...String(n)].map((c) => `<span class="hane"><span class="hane__serit" data-d="${c}">${'0123456789'.split('').map((x) => `<span>${x}</span>`).join('')}</span></span>`).join('');
const g = d.hakkindaGorsel;
$('#hakkinda').innerHTML = `
  <div class="hakkinda__ic">
    <div class="hakkinda__metin">
      <h2 id="hakkinda-h" class="baslik">Hakkında</h2>
      <p class="hakkinda__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    ${g ? `<figure class="hakkinda__foto"><img src="${esc(asset(g.src))}" alt="${esc(g.alt)}" width="${g.w}" height="${g.h}" loading="lazy" decoding="async" /></figure>` : ''}
  </div>
  <dl class="sayac__liste">
    <div class="sayac__kalem"><dd class="odo" aria-label="${yas} yıl">${sayacHTML(yas)}<span class="odo__sonek">yıl</span></dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
    <div class="sayac__kalem"><dd class="odo" aria-label="Haftada ${acikGun} gün">${sayacHTML(acikGun)}<span class="odo__sonek">gün</span></dd><dt>haftada açık</dt></div>
  </dl>`;

// --- Çalışma saatleri ve konum -------------------------------------------------------------

$('#saatler').innerHTML = `
  <article class="rapor">
    <header class="rapor__bas">
      <h2 id="konum-h">Çalışma saatleri ve konum</h2>
      <p class="status status--rapor ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    </header>
    <div class="rapor__govde">
      <div>
        <h3>Çalışma saatleri</h3>
        <dl class="saatler">${saatListesi(d.saatler).map(([gun, s]) => `<div><dt>${esc(gun)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
        <h3>Adres</h3>
        <p>${esc(d.iletisim.adres)}</p>
        <div class="rapor__butonlar">
          <a class="btn btn--koyu" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
          <a class="btn btn--cizgi-koyu" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        </div>
      </div>
      <div class="harita" data-map></div>
    </div>
  </article>`;

// --- Örnek yorumlar -------------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  <div class="bolum-bas">
    <h2 id="yorumlar-h">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="serit" data-lenis-prevent-touch>
    <div class="serit__ic">
      ${d.yorumlar.map((y) => `
        <blockquote class="yorum">
          <p class="yorum__yildiz" role="img" aria-label="5 üzerinden ${y.puan}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < y.puan ? 'on' : ''}">${icons.star}</i>`).join('')}</p>
          <p class="yorum__metin">${esc(y.metin)}</p>
          <footer>${esc(y.ad)}, ${esc(y.arac)}</footer>
        </blockquote>`).join('')}
    </div>
  </div>`;

// --- İletişim --------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <picture class="final__pic">
    ${d.iletisimGorselDar ? `<source media="(max-width: 759px)" srcset="${esc(asset(d.iletisimGorselDar))}" />` : ''}
    <img class="final__img" src="${esc(asset(d.iletisimGorsel))}" alt="" loading="lazy" decoding="async" />
  </picture>
  <div class="final__icerik">
    <h2 class="final__baslik" id="final-h">İletişim</h2>
    <p>Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="hero__actions">
      <a class="btn btn--sari" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#alt').innerHTML = `
  <p><b>${ad}</b> · ${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p>© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D görsel temsilîdir. Yorumlar örnektir.</p>`;

const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapEl);

// --- Arka plandaki eğri (süs) ---------------------------------------------------------------

const sekil = devirEgrisi();
const dyno = { svg: $('.dyno__svg'), tq: $('.dyno__tq'), hp: $('.dyno__hp'), dot: $('.dyno__dot'), w: 0, h: 0 };
const ekranX = (t) => dyno.w * (0.04 + t * 0.92);
const ekranY = (v, max) => dyno.h * (0.86 - (v / max) * 0.58);
const yol = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
function dynoCiz() {
  dyno.w = innerWidth;
  dyno.h = innerHeight;
  dyno.svg.setAttribute('viewBox', `0 0 ${dyno.w} ${dyno.h}`);
  const tq = [], hp = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, r = 1000 + t * 6000;
    tq.push([ekranX(t), ekranY(sekil.nm(r) - 150, 200)]);
    hp.push([ekranX(t), ekranY(sekil.hpMutlak(r), 220)]);
  }
  dyno.tq.setAttribute('d', yol(tq));
  dyno.hp.setAttribute('d', yol(hp));
}
function dynoGuncelle(p) {
  const t = gsap.utils.clamp(0, 1, p);
  dyno.tq.style.strokeDashoffset = 1 - t;
  dyno.hp.style.strokeDashoffset = 1 - t;
  const r = 1000 + t * 6000;
  dyno.dot.style.transform = `translate3d(${ekranX(t)}px, ${ekranY(sekil.nm(r) - 150, 200)}px, 0)`;
  dyno.dot.style.opacity = t < 0.06 ? 0 : 1; // künyede metnin üstüne binmesin
}
dynoCiz();

// --- Hareket --------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
const solid = () => topEl.classList.toggle('is-solid', scrollY > innerHeight * 0.5);
addEventListener('scroll', solid, { passive: true });
solid();

document.fonts.ready.then(() => {
  if (reducedMotion) {
    root.classList.add('is-static');
    dynoGuncelle(1);
    $$('.hane__serit').forEach((s) => (s.style.transform = `translateY(${-s.dataset.d}em)`));
    return;
  }
  initSmoothScroll();
  tabelaCevir();
  gsap.from('#kunye > :not(.board)', { y: 20, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, delay: 0.35, clearProps: 'all' });

  // Sayfanın tamamı = eğri; kaydırma ilerlemesi eğriyi çizer.
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => dynoGuncelle(s.progress), onRefresh: (s) => dynoGuncelle(s.progress) });
  dynoGuncelle(0);
  // Fotoğraflı ve kâğıt zeminli bölümlerde arkadaki eğri çekilir.
  for (const sel of ['#saatler', '#iletisim']) {
    ScrollTrigger.create({ trigger: sel, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: root, className: 'gizle-egri' } });
  }

  // Hizmet adları harf harf yükselir, süre kartı döner.
  $$('.hizmet').forEach((li) => {
    const split = SplitText.create($('.hizmet__baslik', li), { type: 'chars,lines', linesClass: 'satir' });
    gsap.from(split.chars, { yPercent: 110, duration: 0.7, ease: 'power4.out', stagger: 0.016, scrollTrigger: { trigger: li, start: 'top 90%', once: true } });
    gsap.from($('.hizmet__sure', li), { rotateX: -90, duration: 0.5, ease: 'back.out(2)', delay: 0.25, scrollTrigger: { trigger: li, start: 'top 90%', once: true } });
  });

  // Sayaç haneleri bir kez döner.
  ScrollTrigger.create({
    trigger: '.sayac__liste', start: 'top 85%', once: true,
    onEnter: () => $$('.hane__serit').forEach((s, i) => gsap.fromTo(s, { y: 0 }, { y: `${-s.dataset.d}em`, duration: 1.4 + (i % 3) * 0.15, ease: 'power4.out', delay: i * 0.05 })),
  });

  gsap.fromTo('.final__img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#iletisim', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('resize', dynoCiz);
  addEventListener('load', () => ScrollTrigger.refresh());
});
