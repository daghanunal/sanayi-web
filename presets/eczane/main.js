import raw from '../../data/eczane.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
  telHref, waHref, mapsHref, mapsEmbed, icons, GUNLER,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki,
} from '../../shared/core.js';
import { pickQuality } from '../../shared/lib3d.js';
import { SplitText } from 'gsap/SplitText';
import { createPills } from './pills.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const html = document.documentElement;
const waGenel = d.waMesaj || 'Merhaba, bilgi almak istiyorum.';
if (reducedMotion) html.classList.add('rm');

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta eczane metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: eczane olarak işaretle -----------------------------------
(function pharmacyLd() {
  $$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
  const ld = $('script[type="application/ld+json"]');
  if (!ld) return;
  const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
  document.title = `${d.isletme.ad} | Eczane | Etimesgut, Ankara`;
})();

// --- Ortak parçalar ---------------------------------------------------------
const st = gunDurumu(d.saatler);
const btn = (cls, href, ikon, label, dis) =>
  `<a class="btn ${cls}" href="${href}"${dis ? ' target="_blank" rel="noopener"' : ''}>${ikon}<span>${label}</span></a>`;
const durum = (metin) => `<i aria-hidden="true"></i>${esc(metin)}`;

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = durum(st.durum);
});
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.innerHTML = `${icons.phone}<span>${tel}</span>`;
topCall.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

// Yazı boyutu (büyük yaştaki müşteriler için)
const yazi = $('#yazi');
const setBig = (on) => {
  html.classList.toggle('big', on);
  yazi.setAttribute('aria-pressed', String(on));
  yazi.title = on ? 'Yazıları normale döndür' : 'Yazıları büyüt';
  try { localStorage.setItem('eczane-yazi', on ? '1' : '0'); } catch {}
  ScrollTrigger.refresh();
};
try { if (localStorage.getItem('eczane-yazi') === '1') html.classList.add('big'), yazi.setAttribute('aria-pressed', 'true'); } catch {}
yazi.addEventListener('click', () => setBig(!html.classList.contains('big')));

// --- Künye ------------------------------------------------------------------
$('#hero').innerHTML = `
  <h1 class="hero__title">${ad}</h1>
  <p class="hero__sub">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}">${durum(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="cta hero__cta">
    ${btn('btn--red', telHref(d), icons.phone, 'Ara')}
    ${btn('btn--wa', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}
    ${btn('btn--line', mapsHref(d), icons.pin, 'Yol tarifi', true)}
  </div>`;

// --- Hizmetler --------------------------------------------------------------
$('#hizmetler').innerHTML = `
  <header class="sec__head">
    <h2 class="sec__title">Hizmetler</h2>
    <p class="sec__lead">Ürün ve ilaç bilgisi için arayın ya da WhatsApp'tan yazın.</p>
  </header>
  <div class="svcs__grid">
    <div class="svcs__media" aria-hidden="true">
      ${d.hizmetler.map((h, i) => `<img src="${h.gorsel}" alt="" loading="lazy" decoding="async" data-i="${i}">`).join('')}
    </div>
    <ul class="svcs__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc" data-i="${i}">
          <img class="svc__img" src="${h.gorsel}" alt="${esc(h.gorselAlt || '')}" loading="lazy" decoding="async">
          <h3 class="svc__title">${esc(h.baslik)}</h3>
          <p class="svc__text">${esc(h.aciklama)}</p>
          ${h.sure ? `<p class="svc__sure">Süre: ${esc(h.sure)}</p>` : ''}
          ${h.mesaj ? `<a class="svc__link" href="${waHref(d, h.mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>` : ''}
        </li>`).join('')}
    </ul>
  </div>
  <div class="gonder">
    <h3 class="gonder__baslik">Reçeteyi önceden gönderme</h3>
    <ol class="gonder__adim">${d.surec.map((s, i) => `<li><b>${i + 1}</b><span><strong>${esc(s.baslik)}</strong>${esc(s.aciklama)}</span></li>`).join('')}</ol>
    ${btn('btn--wa', waHref(d, 'Merhaba, reçetemin fotoğrafını gönderiyorum.'), icons.whatsapp, 'Reçeteyi WhatsApp\'tan gönderin', true)}
  </div>`;

// --- Hakkında ---------------------------------------------------------------
const acikGun = acikGunSayisi(d.saatler);
$('#hakkinda').innerHTML = `
  <div class="about__text">
    <h2 class="sec__title">Hakkında</h2>
    <p class="sec__lead about__lead">${ad} ${yilEki(kurulus)} beri Şaşmaz Mahallesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </div>
  <ul class="stats__list" aria-label="Rakamlarla">
    <li class="stat"><p class="stat__num"><span data-count="${yas}">${yas}</span> yıl</p><p class="stat__label">Şaşmaz Mahallesi'nde</p></li>
    <li class="stat"><p class="stat__num"><span data-count="${acikGun}">${acikGun}</span> gün</p><p class="stat__label">haftada açık</p></li>
  </ul>`;

// --- Çalışma saatleri ve konum -------------------------------------------------
const liste = saatListesi(d.saatler);
const sira = [1, 2, 3, 4, 5, 6, 0];
const bugunG = sira.indexOf(new Date().getDay());
const bugunMu = (gunler) => {
  const [a, b] = gunler.split('–');
  const ia = sira.indexOf(GUNLER.indexOf(a));
  const ib = b ? sira.indexOf(GUNLER.indexOf(b)) : ia;
  return bugunG >= ia && bugunG <= ib;
};
$('#saatler').innerHTML = `
  <div class="visit__info">
    <h2 class="sec__title">Çalışma saatleri ve konum</h2>
    <p class="visit__status ${st.open ? 'is-open' : ''}">${durum(st.metin)}</p>
    <dl class="hours">
      ${liste.map(([gun, saat]) => `
        <div class="hours__row${bugunMu(gun) ? ' is-today' : ''}"><dt>${esc(gun)}</dt><dd>${esc(saat)}</dd></div>`).join('')}
    </dl>
    <h3 class="visit__h">Adres</h3>
    <p class="visit__addr">${esc(d.iletisim.adres)}</p>
    <div class="cta">
      ${btn('btn--ink', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      ${btn('btn--line', telHref(d), icons.phone, tel)}
    </div>
  </div>
  <div class="visit__map" id="map"><p>Harita</p></div>`;

// --- Nöbetçi eczane ----------------------------------------------------------
$('#nobet').innerHTML = `
  <div class="nobet__inner">
    <div class="nobet__sign" aria-hidden="true">
      <div class="nobet__box"><span class="nobet__e">E</span></div>
      <p class="nobet__led">NÖBETÇİ</p>
    </div>
    <div class="nobet__text">
      <h2 class="sec__title">Nöbetçi eczane</h2>
      <p class="sec__lead">Eczane kapalıyken ilaç gerekirse o gece nöbet tutan eczaneler ${esc(d.nobet.kaynak)}'nın güncel listesinden bulunur. Nöbetçi olunan geceler eczanenin kapısında da yazar.</p>
      <div class="cta">${btn('btn--red', esc(d.nobet.url), '', 'Bu gece nöbetçi eczaneler', true)}</div>
      ${nobetTakvim()}
    </div>
  </div>`;

// Örnek nöbet takvimi: bu ayın günleri, iki gün işaretli. Gerçek nöbet günleri odanın çizelgesiyle belirlenir.
function nobetTakvim() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const gunSay = new Date(y, m + 1, 0).getDate();
  const bas = (new Date(y, m, 1).getDay() + 6) % 7; // Pazartesi başlangıç
  const nobet = d.nobet.ornekGunler || [];
  const ay = now.toLocaleDateString('tr-TR', { month: 'long' });
  const hucre = [];
  for (let i = 0; i < bas; i++) hucre.push('<li class="is-bos"></li>');
  for (let g = 1; g <= gunSay; g++) {
    const cls = [nobet.includes(g) ? 'is-nobet' : '', g === now.getDate() ? 'is-bugun' : ''].filter(Boolean).join(' ');
    hucre.push(`<li${cls ? ` class="${cls}"` : ''}>${g}</li>`);
  }
  return `
    <figure class="takvim" aria-label="Örnek nöbet takvimi">
      <figcaption><b>${esc(ay[0].toLocaleUpperCase('tr-TR') + ay.slice(1))} nöbet günleri</b><span class="etiket">Örnek</span></figcaption>
      <ol class="takvim__gun" aria-hidden="true">${['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((g) => `<li>${g}</li>`).join('')}</ol>
      <ol class="takvim__ay">${hucre.join('')}</ol>
      <p class="takvim__not">Örnek görünüm. Nöbet günleri her ay oda çizelgesiyle belirlenir.</p>
    </figure>`;
}

// --- Örnek yorumlar ------------------------------------------------------------
const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <h2 class="sec__title">Örnek yorumlar</h2>
    <p class="reviews__count">Buradaki yorumlar örnektir, yerlerine eczanenin gerçek yorumları konur.</p>
  </header>
  <ul class="reviews__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="review">
        <span class="stars" role="img" aria-label="5 üzerinden ${y.puan}">${star(y.puan)}</span>
        <p class="review__text">${esc(y.metin)}</p>
        <p class="review__who">${esc(y.ad)}${y.konu ? `<span>${esc(y.konu)}</span>` : ''}</p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------
$('#iletisim').innerHTML = `
  <h2 class="final__title">İletişim</h2>
  <p class="sec__lead final__lead">Reçete, ölçüm ve ürün bilgisi için arayın ya da WhatsApp'tan yazın.</p>
  <div class="cta cta--big">${btn('btn--wa', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}${btn('btn--line', telHref(d), icons.phone, tel)}</div>
  <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('#foot').innerHTML = `
  <div class="foot__brand"><span class="logo" aria-hidden="true">E</span><b>${ad}</b></div>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">Bu sitedeki bilgiler tanıtım amaçlıdır. İlaç kullanımıyla ilgili kararlar için hekime ve eczacıya danışılmalıdır.</p>
  <p class="foot__small">© ${buYil} ${ad}. Fotoğraflar temsilîdir (Pexels). 3D görseller temsilîdir. Yorumlar ve nöbet takvimi örnektir.</p>`;

// Harita: yaklaşınca yükle
const mapEl = $('#map');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapEl);

// --- 3D sahne: yalnız künyede ------------------------------------------------
const canvas = $('#gl');
const quality = pickQuality();
let pills = null;
try {
  pills = createPills(canvas, { name: d.isletme.ad, lowEnd, quality, still: reducedMotion });
} catch (e) {
  html.classList.add('no-gl');
}
addEventListener('resize', () => pills?.resize());

const lenis = initSmoothScroll();
const top = $('#top');

if (reducedMotion) {
  if (pills) {
    pills.setState({ film: 0, intro: 1 });
    pills.renderOnce();
  }
  const night = () => {
    const n = scrollY < innerHeight * 0.85;
    top.classList.toggle('is-night', n);
    top.classList.toggle('is-solid', !n);
  };
  night();
  addEventListener('scroll', night, { passive: true });
} else {
  motion();
}

function motion() {
  const film = $('#film');
  const state = { film: 0, intro: 0 };
  const tetik = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

  // Künye kayarken kapsül tabela dağılır, tuval söner (film 0 → 0,3)
  ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom top',
    onUpdate: (s) => {
      state.film = s.progress * 0.3;
      pills?.setState(state);
      canvas.style.opacity = String(1 - gsap.utils.clamp(0, 1, (s.progress - 0.55) / 0.4));
      top.classList.toggle('is-night', s.progress < 0.85);
      top.classList.toggle('is-solid', s.progress >= 0.85);
    },
    onLeave: () => { canvas.classList.add('is-off'); pills?.stop(); },
    onEnterBack: () => { canvas.classList.remove('is-off'); pills?.start(); },
  });

  // Açılış (~1,4 sn): kapsüller tabelaya dizilir, künye satır satır gelir. Kaydırma kilitlenmez.
  const title = $('.hero__title');
  const split = new SplitText(title, { type: 'chars,words', charsClass: 'char' });
  gsap.timeline()
    .to(state, { intro: 1, duration: 1.4, ease: 'power3.inOut', onUpdate: () => pills?.setState(state) }, 0)
    .from(split.chars, { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.02, ease: 'power4.out' }, 0.1)
    .from(['.hero__sub', '.kunye > div', '.hero__cta'], { autoAlpha: 0, y: 18, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.3);
  pills?.compile();
  pills?.start();

  // Hizmetler: aktif satır kalınlaşır, görsel değişir
  const rows = $$('.svc');
  const media = $$('.svcs__media img');
  const setActive = (i) => {
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
    media.forEach((m, k) => m.classList.toggle('is-active', k === i));
  };
  setActive(0);
  rows.forEach((r, i) => {
    ScrollTrigger.create({ trigger: r, start: 'top 60%', end: 'bottom 60%', onToggle: (s) => s.isActive && setActive(i) });
    gsap.fromTo($('.svc__title', r), { '--w': 380 }, {
      '--w': 760, ease: 'none',
      scrollTrigger: { trigger: r, start: 'top 90%', end: 'top 45%', scrub: true },
    });
    const img = $('.svc__img', r);
    gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0 round 16px)' }, {
      clipPath: 'inset(0 0 0% 0 round 16px)', ease: 'none',
      scrollTrigger: { trigger: r, start: 'top 95%', end: 'top 55%', scrub: true },
    });
  });

  // Rakamlar sayar
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', scrollTrigger: tetik(el, 'top 90%'), onUpdate: () => (el.textContent = Math.round(o.v)) });
  });

  // Nöbet: gündüzden geceye, tabela yanar
  const nobet = $('#nobet');
  gsap.fromTo(nobet, { '--dark': 0 }, {
    '--dark': 1, ease: 'none',
    scrollTrigger: { trigger: nobet, start: 'top 90%', end: 'top 30%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: nobet, start: 'top 45%',
    onEnter: () => nobet.classList.add('is-lit'),
    onLeaveBack: () => nobet.classList.remove('is-lit'),
  });

  // Son başlık ağırlığı
  gsap.fromTo('.final__title', { '--w': 300 }, {
    '--w': 800, ease: 'none',
    scrollTrigger: { trigger: '#iletisim', start: 'top 85%', end: 'top 35%', scrub: true },
  });

  // Mıknatıs butonlar (yalnızca fareyle)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('#hero .btn').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.2);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      b.addEventListener('pointerleave', () => (xTo(0), yTo(0)));
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
  void lenis;
}
