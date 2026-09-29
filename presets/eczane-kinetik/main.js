// Eczane Kinetik: WebGL yok. Künyede kapsülün iki yarısı birleşir; hizmet adları afiş gibi kayar,
// fotoğraflar kapsül biçiminden açılır. Pinli hikâye yok.
import ana from '../../data/eczane.json';
import ek from '../../data/eczane-kinetik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, icons, GUNLER,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki,
} from '../../shared/core.js';

gsap.registerPlugin(ScrollTrigger);

const d = boot({ ...ana, ...ek, preset: 'eczane-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const buYil = new Date().getFullYear();
const kurulus = Number(d.isletme.kurulus) || buYil;
const yas = Math.max(1, buYil - kurulus);
const acikGun = acikGunSayisi(d.saatler);
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const isDesk = () => innerWidth >= 900;
const waGenel = d.waMesaj || 'Merhaba, bilgi almak istiyorum.';
if (reducedMotion) html.classList.add('rm');

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta eczane metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: eczane olarak işaretle -----------------------------------
(function pharmacyLd() {
  $$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
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
  document.head.append(ld);
  document.title = `${d.isletme.ad} | Eczane | Etimesgut, Ankara`;
})();

// --- Ortak parçalar ---------------------------------------------------------
const btn = (cls, href, ikon, label, dis) =>
  `<a class="btn ${cls}" href="${href}"${dis ? ' target="_blank" rel="noopener"' : ''}>${ikon}<span>${label}</span></a>`;
const capsIcon = '<span class="caps" aria-hidden="true"><i></i><i></i></span>';
const durum = (m) => `<i aria-hidden="true"></i>${esc(m)}`;
const kelimeler = (metin, pill) =>
  String(metin).split(/\s+/).filter(Boolean)
    .map((w, i) => `<span class="w${pill && i === 0 ? ' w--pill' : ''}"><span class="wi">${esc(w)}</span></span>`)
    .join(' ');

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
const setBig = (on, save = true) => {
  html.classList.toggle('big', on);
  yazi.setAttribute('aria-pressed', String(on));
  yazi.title = on ? 'Yazıları normale döndür' : 'Yazıları büyüt';
  if (save) try { localStorage.setItem('eczane-kinetik-yazi', on ? '1' : '0'); } catch {}
};
try { if (localStorage.getItem('eczane-kinetik-yazi') === '1') setBig(true, false); } catch {}
yazi.addEventListener('click', () => {
  setBig(!html.classList.contains('big'));
  requestAnimationFrame(() => ScrollTrigger.refresh());
});

// Kaydırınca üst çubuk koyulaşır
const topBar = $('#top');
const onTopScroll = () => topBar.classList.toggle('is-scrolled', scrollY > 40);
addEventListener('scroll', onTopScroll, { passive: true });
onTopScroll();

// --- Künye: kapsülün iki yarısı birleşir -------------------------------------
$('#hero').innerHTML = `
  <div class="hero__in">
    <h1 class="hero__h" id="hero-h">${kelimeler(d.isletme.ad, true)}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt class="mono">Bugün</dt><dd class="kunye__durum${st.open ? ' is-open' : ''}">${durum(st.kunye)}</dd></div>
      <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      ${btn('btn--ink', telHref(d), icons.phone, 'Ara')}
      ${btn('btn--wa', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}
      ${btn('btn--line', mapsHref(d), icons.pin, 'Yol tarifi', true)}
    </div>
    <div class="cap" aria-hidden="true">
      <span class="cap__half cap__half--l"><b>${esc(yilEki(kurulus))} beri</b></span>
      <span class="cap__half cap__half--r"><b>Haftada ${acikGun} gün</b></span>
    </div>
  </div>`;

// --- Hizmetler -----------------------------------------------------------------
$('#hizmetler').innerHTML = `
  <div class="bant__tracks" aria-hidden="true">
    ${(d.bantlar || [])
      .map((row, i) => {
        const one = row.map((w) => `<span>${esc(w)}</span>${capsIcon}`).join('');
        return `<div class="bant__row bant__row--${i}"><div class="bant__track">${one}${one}${one}</div></div>`;
      })
      .join('')}
  </div>
  <header class="hiz__head">
    <h2 id="hiz-h" class="h2">Hizmetler</h2>
    <p class="lead">Ürün ve ilaç bilgisi için arayın ya da WhatsApp'tan yazın.</p>
  </header>
  <ul class="srvs">${d.hizmetler
    .map(
      (h, i) => `<li class="srv${i % 2 ? ' srv--r' : ''}">
      <figure class="srv__img"><img src="${asset(h.gorsel || '/img/eczane/tezgah.jpg')}" alt="${esc(h.gorselAlt || '')}" loading="lazy" decoding="async" /></figure>
      <div class="srv__t">
        <p class="mono srv__n">${esc(h.kisa || '')}</p>
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
        ${h.sure ? `<p class="srv__sure mono">Süre ${esc(h.sure)}</p>` : ''}
        ${h.mesaj ? `<a class="srv__wa" href="${waHref(d, h.mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>` : ''}
      </div>
    </li>`
    )
    .join('')}</ul>
  <div class="recete">
    <h3 class="recete__h">Reçeteyi önceden gönderme</h3>
    <ol class="steps">
      ${d.surec
        .map((s, i) => `<li class="step">
          <span class="step__n" aria-hidden="true">${i + 1}</span>
          <div class="step__t"><h4>${esc(s.baslik)}</h4><p>${esc(s.aciklama)}</p></div>
        </li>`)
        .join('')}
    </ol>
    <div class="recete__cta">${btn('btn--moon', waHref(d, 'Merhaba, reçetemin fotoğrafını gönderiyorum.'), icons.whatsapp, 'Reçeteyi WhatsApp\'tan gönderin', true)}</div>
  </div>`;

// --- Hakkında -------------------------------------------------------------------
$('#hakkinda').innerHTML = `
  <div class="hakkinda__in">
    <h2 id="hakkinda-h" class="h2">Hakkında</h2>
    <p class="hakkinda__lead">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz Mahallesi'nde. ${esc(d.isletme.hakkinda)}</p>
    <dl class="facts">${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </div>
  <ul class="stats" aria-label="Rakamlarla">
    <li><b data-count="${yas}">${yas}</b><small>yıl</small><span>Şaşmaz Mahallesi'nde</span></li>
    <li><b data-count="${acikGun}">${acikGun}</b><small>gün</small><span>haftada açık</span></li>
  </ul>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------
const nobet = d.nobet || { url: 'https://www.aeo.org.tr/nobetci-eczaneler', kaynak: 'Ankara Eczacı Odası' };
const sira = [1, 2, 3, 4, 5, 6, 0];
const bugunG = sira.indexOf(new Date().getDay());
const bugunMu = (gunler) => {
  const [a, b] = gunler.split('–');
  const ia = sira.indexOf(GUNLER.indexOf(a));
  const ib = b ? sira.indexOf(GUNLER.indexOf(b)) : ia;
  return bugunG >= ia && bugunG <= ib;
};
$('#saatler').innerHTML = `
  <div class="ulasim__t">
    <h2 id="ulasim-h" class="h2">Çalışma saatleri ve konum</h2>
    <p class="pillstatus${st.open ? ' is-open' : ''}">${durum(st.metin)}</p>
    <dl class="hours">${saatListesi(d.saatler)
      .map(([g, s]) => `<div${bugunMu(g) ? ' class="is-today"' : ''}><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`)
      .join('')}</dl>
    <p class="adres">${icons.pin}<span>${esc(d.iletisim.adres)}</span></p>
    <div class="row">
      ${btn('btn--ink', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      ${btn('btn--line', telHref(d), icons.phone, tel)}
    </div>
  </div>
  <div class="map" data-map><span class="mono">Harita</span></div>`;
const mapEl = $('[data-map]');
new IntersectionObserver(
  (en, io) => {
    if (!en[0].isIntersecting) return;
    mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(mapEl);

// --- Nöbetçi eczane ------------------------------------------------------------------
const marq = Array.from({ length: 4 }, () => `<span>Nöbetçi eczane</span>${capsIcon}`).join('');
const ay = new Date().toLocaleDateString('tr-TR', { month: 'long' });
const ayAd = ay[0].toLocaleUpperCase('tr-TR') + ay.slice(1);
const ornek = (nobet.ornekGunler || []).map((g) => `${g} ${ayAd}`).join(' ve ');
$('#nobet').innerHTML = `
  <div class="marq" aria-hidden="true"><div class="marq__t">${marq}${marq}</div></div>
  <div class="nobet__in">
    <div class="moon" aria-hidden="true"><i></i></div>
    <div>
      <h2 id="nobet-h" class="h2">Nöbetçi eczane</h2>
      <p class="lead">Eczane kapalıyken ilaç gerekirse o gece nöbet tutan eczaneler ${esc(nobet.kaynak)}'nın güncel listesinden bulunur. Nöbetçi olunan geceler eczanenin kapısında da yazar.</p>
      <a class="btn btn--moon" href="${esc(nobet.url)}" target="_blank" rel="noopener"><span>Bu gece nöbetçi eczaneler</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>
      ${ornek ? `<p class="note nobet__ornek"><span class="ornek">Örnek</span>${esc(ornek)} geceleri nöbetçi. Gerçek günler oda çizelgesine göre yazılır.</p>` : ''}
    </div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------
const yildiz = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <header class="yorum__head">
    <h2 id="yorum-h" class="h2">Örnek yorumlar</h2>
    <p class="lead">Buradaki yorumlar örnektir, yerlerine eczanenin gerçek yorumları konur.</p>
  </header>
  <ul class="cards" data-lenis-prevent-touch>${d.yorumlar
    .map(
      (y) => `<li class="card">
      <p class="stars stars--s" role="img" aria-label="5 üzerinden ${y.puan}">${yildiz(y.puan)}</p>
      <blockquote>${esc(y.metin)}</blockquote>
      <p class="card__ad mono">${esc(y.ad)}${y.konu ? ` · ${esc(y.konu)}` : ''}</p>
    </li>`
    )
    .join('')}</ul>`;

// --- İletişim + footer ---------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <h2 id="son-h" class="son__h">${kelimeler('İletişim')}</h2>
  <p class="son__lead">Reçete, ölçüm ve ürün bilgisi için arayın ya da WhatsApp'tan yazın.</p>
  <div class="son__cta">${btn('btn--wa btn--big', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}${btn('btn--line btn--big btn--light', telHref(d), icons.phone, tel)}</div>
  <p class="son__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  <div class="son__caps" aria-hidden="true"><span class="cap__half cap__half--l"></span><span class="cap__half cap__half--r"></span></div>`;
$('#foot').innerHTML = `
  <div class="foot__in">
    <p class="foot__brand">${capsIcon}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a> · <a href="${esc(nobet.url)}" target="_blank" rel="noopener">Nöbetçi eczaneler</a></p>
    <p class="mono foot__s">© ${buYil} ${ad}. Sitede ilaç tanıtımı ve satışı yapılmaz. Fotoğraflar temsilîdir (Pexels). Yorumlar ve nöbet günleri örnektir.</p>
  </div>`;

// ============================================================================
// Hareket
// ============================================================================
if (!reducedMotion) {
  initSmoothScroll();
  document.fonts.ready.then(() => requestAnimationFrame(motion));
} else {
  html.classList.add('is-ready');
}

function motion() {
  html.classList.add('is-ready');
  const mm = gsap.matchMedia();
  const tetik = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

  // Açılış (~1,4 sn): ad kelime kelime yükselir, kapsülün iki yarısı yanlardan gelip birleşir.
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from('.hero__h .wi', { yPercent: 115, rotate: 4, stagger: 0.06, duration: 0.8 }, 0)
    .from('.hero__what, .kunye > div, .hero__cta > *', { y: 20, autoAlpha: 0, stagger: 0.05, duration: 0.5 }, 0.25)
    .from('.hero .cap__half--l', { xPercent: -160, rotate: -30, duration: 0.9, ease: 'back.out(1.3)' }, 0.2)
    .from('.hero .cap__half--r', { xPercent: 160, rotate: 30, duration: 0.9, ease: 'back.out(1.3)' }, 0.2);

  // Kaydırınca kapsül biraz daha döner ve yükselir (pin yok; yarıların açılış tween'ine dokunmaz)
  gsap.fromTo('.hero .cap', { rotate: -9, y: 0 }, { rotate: -16, y: -40, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.5 } });

  // Hizmet adları: satırlar zıt yönlere kayar.
  $$('.bant__row').forEach((row, i) => {
    const t = $('.bant__track', row);
    const dir = i % 2 ? 1 : -1;
    gsap.fromTo(t, { xPercent: dir < 0 ? 0 : -33.33 }, {
      xPercent: dir < 0 ? -33.33 : 0, ease: 'none',
      scrollTrigger: { trigger: '.bant__tracks', start: 'top bottom', end: 'bottom top', scrub: 0.4 },
    });
  });

  // Hizmetler: fotoğraf kapsül dar hâlinden açılır, başlık yana kayar.
  revealText('.hiz__head > *');
  $$('.srv').forEach((s, i) => {
    const img = $('.srv__img', s);
    gsap.fromTo(img, { clipPath: 'inset(0% 36% 0% 36% round 999px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 999px)', ease: 'none',
      scrollTrigger: { trigger: s, start: 'top 92%', end: 'top 45%', scrub: 0.5 },
    });
    const sh = isDesk() ? 18 : 6;
    gsap.from($('h3', s), { xPercent: i % 2 ? sh : -sh, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'top 62%', scrub: 0.5 } });
  });

  // Reçete adımları: dev rakam içten dolar.
  $$('.step').forEach((s) => {
    gsap.fromTo($('.step__n', s), { '--f': '0%' }, {
      '--f': '100%', ease: 'none',
      scrollTrigger: { trigger: s, start: 'top 90%', end: 'top 45%', scrub: 0.4 },
    });
  });

  // Rakamlar sayar.
  $$('[data-count]').forEach((b) => {
    const end = Number(b.dataset.count);
    const o = { v: 0 };
    b.textContent = '0';
    gsap.to(o, {
      v: end, duration: 1.4, ease: 'power3.out', scrollTrigger: tetik('.stats', 'top 85%'),
      onUpdate: () => (b.textContent = Math.round(o.v)),
    });
  });
  revealText('.hakkinda__in > *');

  // Nöbet: kayan yazı yalnız ekrandayken döner; ay doğar.
  const marqEl = $('.marq');
  new IntersectionObserver(([e]) => marqEl.classList.toggle('is-on', e.isIntersecting)).observe(marqEl);
  gsap.fromTo('.moon', { y: 80, rotate: -40 }, { y: -20, rotate: 0, ease: 'none', scrollTrigger: { trigger: '#nobet', start: 'top bottom', end: 'bottom 40%', scrub: 0.5 } });

  // Yorumlar
  mm.add('(min-width: 900px)', () => {
    gsap.from('.card', { y: 90, rotate: (i) => (i % 2 ? 4 : -4), autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: tetik('.cards', 'top 85%') });
  });

  revealText('.ulasim__t > *');

  // İletişim: kelime oturur, kapsül yarıları birleşir.
  gsap.from('.son__h .wi', { yPercent: 110, rotate: 6, duration: 0.9, ease: 'power4.out', scrollTrigger: tetik('#iletisim', 'top 75%') });
  gsap.from('.son__caps .cap__half--l', { xPercent: -140, rotate: -20, ease: 'none', scrollTrigger: { trigger: '#iletisim', start: 'top bottom', end: 'center center', scrub: 0.5 } });
  gsap.from('.son__caps .cap__half--r', { xPercent: 140, rotate: 20, ease: 'none', scrollTrigger: { trigger: '#iletisim', start: 'top bottom', end: 'center center', scrub: 0.5 } });

  addEventListener('load', () => ScrollTrigger.refresh());
}

function revealText(sel) {
  const els = $$(sel);
  if (!els.length) return;
  gsap.from(els, {
    y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out',
    scrollTrigger: { trigger: els[0], start: 'top 88%', toggleActions: 'play none none none' },
  });
}
