// Rezonans: kinetik aile, egzoz. 3D yok. Sayfa bir konser afişi gibi: dev dar harfler, çift renk fotoğraf,
// borunun ağzından yayılan ses halkaları. Dev yazılar yalnız olgulardır: işletmenin adı, bölüm ve hizmet adları,
// kuruluştan geçen yıl, "Açık / Kapalı".
import '../../shared/base.css';
import './style.css';
import manifold from '../../data/manifold.json';
import ek from '../../data/egzoz-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

const d = boot({ ...manifold, ...ek, preset: 'egzoz-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const G = d.gorseller;
const mobil = matchMedia('(max-width: 899px)').matches;

// Harf maskeli yazı: her harf ayrı yükselir. Kelimeler bölünmez.
const harfler = (s) =>
  [...String(s)].map((c) => (c === ' ' ? '<span class="bosluk"> </span>' : `<span class="h"><span>${esc(c)}</span></span>`)).join('');
// Bölüm başlığı: ekran genişliğine yayılan tek satır dev yazı; ekran okuyucuya düz metin.
const dev = (metin, id, cls = '') =>
  `<h2 class="dev ${cls}" id="${id}"><span class="sr-only">${esc(metin)}</span><span class="dev__satir" aria-hidden="true">${harfler(metin)}</span></h2>`;

// Adı en fazla iki satıra, harf sayısı dengeli dağıt.
function satirla(metin) {
  const k = String(metin).split(/\s+/).filter(Boolean);
  if (k.length < 2) return k;
  let enIyi = [k.join(' ')], fark = Infinity;
  for (let i = 1; i < k.length; i++) {
    const a = k.slice(0, i).join(' '), b = k.slice(i).join(' ');
    const f = Math.abs(a.length - b.length);
    if (f < fark) { fark = f; enIyi = [a, b]; }
  }
  return enIyi;
}

// --- Üst bar ------------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <span class="status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</span>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye (afiş) -----------------------------------------------------------------------

$('#kunye').innerHTML = `
  <h1 class="afis" id="hero-title"><span class="sr-only">${ad}</span>${satirla(d.isletme.ad).map((k) => `<span class="afis__satir" aria-hidden="true">${harfler(k)}</span>`).join('')}</h1>
  <div class="sahne" aria-hidden="true">
    <div class="boru">
      <img class="boru__img" src="${asset(G.boru.src)}" alt="" width="${G.boru.w}" height="${G.boru.h}" fetchpriority="high" />
      <span class="halka"></span><span class="halka"></span><span class="halka"></span>
    </div>
  </div>
  <div class="hero__alt">
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt class="mono">Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="butonlar">
      <a class="btn btn--koyu" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  ${dev('Hizmetler', 'hizmet-h')}
  <p class="bas__alt">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
  <ul class="hizmet-liste">
    ${d.hizmetler.map((h, i) => `
      <li class="hizmet">
        <span class="hizmet__no mono">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="hizmet__baslik"><span>${esc(h.baslik)}</span></h3>
        <p class="hizmet__metin">${esc(h.aciklama)}</p>
        <span class="hizmet__sure mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
      </li>`).join('')}
  </ul>`;

// --- Hakkında --------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  ${dev('Hakkında', 'hakkinda-h')}
  <div class="hakkinda__izgara">
    <div class="hakkinda__metin">
      <p class="hakkinda__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="rakam__liste">
        <div class="rakam__kalem"><dd><b data-say="${yas}">${yas}</b> yıl</dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
        <div class="rakam__kalem"><dd><b data-say="${acikGun}">${acikGun}</b> gün</dd><dt>haftada açık</dt></div>
      </dl>
      <dl class="bilgi">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt class="mono">Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <div class="hakkinda__foto">
      ${G.hakkinda.map((g, i) => `<figure class="kare kare--${i + 1}"><div class="kare__cerceve"><img src="${asset(g.src)}" alt="${esc(g.alt)}" width="${g.w}" height="${g.h}" loading="lazy" decoding="async" /></div></figure>`).join('')}
    </div>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="konum__metin">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="tabela ${st.open ? 'is-open' : ''}" aria-hidden="true"><span class="tabela__satir">${harfler(st.open ? 'Açık' : 'Kapalı')}</span></p>
    <p class="acik ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
    <dl class="saatler">
      ${saatListesi(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd class="${s === 'Kapalı' ? 'kapali' : ''}">${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="adres">${esc(d.iletisim.adres)}</p>
    <div class="butonlar">
      <a class="btn btn--turuncu" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--cizgi" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>
  <div class="harita" data-map><span class="mono">Harita</span></div>`;

// --- Örnek yorumlar ------------------------------------------------------------------------

$('#yorumlar').innerHTML = `
  ${dev('Örnek yorumlar', 'yorum-h', 'dev--uzun')}
  <p class="bas__alt">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  <ul class="yorum-serit" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="yorum">
        <p class="yorum__yildiz" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${icons.star.repeat(Number(y.puan))}${`<span class="off">${icons.star}</span>`.repeat(5 - Number(y.puan))}</p>
        <blockquote class="yorum__metin">${esc(y.metin)}</blockquote>
        <p class="yorum__kim"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__halkalar" aria-hidden="true"><span class="halka"></span><span class="halka"></span><span class="halka"></span></div>
  ${dev('İletişim', 'final-h', 'final__baslik')}
  <p class="final__metin">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
  <div class="butonlar butonlar--orta">
    <a class="btn btn--koyu btn--buyuk" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--cizgi btn--buyuk" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="final__adres mono">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('#alt').innerHTML = `
  <p><b>${ad}</b> · ${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="alt__kucuk">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>`;

// --- Harita: yaklaşınca yüklenir -----------------------------------------------------------

const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapEl);

// --- Dev yazıları genişliğe yay ------------------------------------------------------------

function sigdir(el, max) {
  el.style.fontSize = '100px';
  const w = el.scrollWidth;
  const hedef = el.parentElement.clientWidth;
  el.style.fontSize = `${Math.min((100 * hedef) / w, max)}px`;
}
function boyutla() {
  const vh = innerHeight;
  $$('.afis__satir').forEach((s) => sigdir(s, mobil ? vh * 0.15 : vh * 0.2));
  $$('.dev__satir').forEach((s) => sigdir(s, mobil ? vh * 0.13 : vh * 0.26));
  $$('.tabela__satir').forEach((s) => sigdir(s, mobil ? vh * 0.16 : vh * 0.2));
}
boyutla();

let genislik = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === genislik) return; // telefonda adres çubuğu kayınca yeniden boyutlama yok
  genislik = innerWidth;
  boyutla();
  ScrollTrigger.refresh();
});

// --- Başlık ---------------------------------------------------------------------------------

const ust = $('#top');
const ustYaz = () => ust.classList.toggle('is-solid', scrollY > innerHeight * 0.7);
addEventListener('scroll', ustYaz, { passive: true });
ustYaz();
let unhide = null;
const phoneMq = matchMedia('(max-width: 899px)');
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(ust, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Hareket ----------------------------------------------------------------------------------

document.fonts.ready.then(() => {
  boyutla();
  if (reducedMotion) return;
  initSmoothScroll();
  hareket();
  ScrollTrigger.refresh();
});

function hareket() {
  // Afiş açılışı (~1 sn, bir kez): satırlar yandan gelir, harfler aşağıdan yükselir, boru büyür.
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  $$('.afis__satir').forEach((s, i) => {
    intro.from(s, { xPercent: i % 2 ? 14 : -14, duration: 1 }, i * 0.1);
    intro.from($$('.h > span', s), { yPercent: 160, duration: 0.8, stagger: 0.02 }, i * 0.1);
  });
  intro
    .from('.boru', { scale: 0.5, autoAlpha: 0, duration: 1 }, 0.15)
    .from('.hero__alt > *', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06 }, 0.3);

  // Hero kaydırılırken afiş satırları ters yönlere kayar, boru büyür.
  const heroTl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.4 } });
  $$('.afis__satir').forEach((s, i) => heroTl.fromTo(s, { xPercent: 0 }, { xPercent: i % 2 ? 10 : -10, ease: 'none', immediateRender: false }, 0));
  heroTl.fromTo('.boru', { scale: 1 }, { scale: 1.2, ease: 'none', immediateRender: false }, 0);

  // Bölüm başlıkları: harfler aşağıdan yükselir (bir kez).
  $$('.dev__satir, .tabela__satir').forEach((s) => {
    gsap.from($$('.h > span', s), {
      yPercent: 160, duration: 0.9, ease: 'expo.out', stagger: 0.03,
      scrollTrigger: { trigger: s, start: 'top 85%', toggleActions: 'play none none none' },
    });
  });

  // Hizmet satırları: ad soldan kayarak gelir, açıklama ve süre ardından (bir kez).
  $$('.hizmet').forEach((li) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 90%', toggleActions: 'play none none none' } });
    tl.from($('.hizmet__baslik span', li), { xPercent: -12, autoAlpha: 0, duration: 0.8, ease: 'expo.out' })
      .from(li.querySelectorAll('.hizmet__no, .hizmet__metin, .hizmet__sure'), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.1);
  });

  // Rakamlar bir kez sayar.
  $$('[data-say]').forEach((b) => {
    const hedef = Number(b.dataset.say);
    const o = { v: 0 };
    b.textContent = '0';
    gsap.to(o, {
      v: hedef, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: b, start: 'top 88%', toggleActions: 'play none none none' },
      onUpdate: () => (b.textContent = Math.round(o.v)),
    });
  });

  // Fotoğraflar perde gibi açılır (bir kez).
  $$('.kare').forEach((f, i) => {
    gsap.fromTo($('.kare__cerceve', f), { clipPath: i % 2 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0%)', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: f, start: 'top 88%', toggleActions: 'play none none none' } });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
}
