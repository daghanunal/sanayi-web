import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc,
} from '../../shared/core.js';

// Klasik aile: WebGL yok. Kimlik: sigorta renk kodlu kablo demeti; her hizmet bir hat.
gsap.registerPlugin(ScrollTrigger);
const d = boot({ ...raw, preset: 'elektrik-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const img = (p) => asset(p);
const st = gunDurumu(d.saatler);
const durumMetni = st.metin;

// Bıçak sigorta renk kodu: amper → renk. Kablolar da bu renkleri taşır.
const AMPER = {
  5: ['#d9a441', '#1b1406'], 7.5: ['#7b4b2a', '#fff'], 10: ['#e2261c', '#fff'], 15: ['#1f5fd8', '#fff'],
  20: ['#f2c200', '#1b1606'], 25: ['#cfd2cc', '#15171a'], 30: ['#1d9b4f', '#fff'],
};
const PALET = ['#e2261c', '#1f5fd8', '#f2c200', '#1d9b4f', '#7b4b2a', '#d9a441', '#cfd2cc'];
const renk = (a) => AMPER[a] || AMPER[10];
const amp = (a) => String(a).replace('.', ',');
const fuseSVG = (a) => {
  const [c, t] = renk(a);
  return `<svg class="fuse" viewBox="0 0 40 52" aria-hidden="true">
    <rect x="9" y="30" width="7" height="20" rx="1" fill="#b9bdb8"/><rect x="24" y="30" width="7" height="20" rx="1" fill="#b9bdb8"/>
    <rect x="2" y="2" width="36" height="32" rx="5" fill="${c}"/>
    <rect x="5" y="5" width="30" height="7" rx="3" fill="#fff" opacity=".28"/>
    <text x="20" y="26" text-anchor="middle" fill="${t}" font-size="${String(a).length > 2 ? 11 : 14}" font-weight="700" font-family="Spline Sans Mono, monospace">${amp(a)}</text>
  </svg>`;
};
const stripe = `<div class="top__stripe" aria-hidden="true">${PALET.map((c) => `<i style="background:${c}"></i>`).join('')}</div>`;

// --- Üst bar ------------------------------------------------------------------

$('#top').innerHTML = `
  <div class="top__in">
    <a class="top__brand" href="#hero"><span class="top__mark" aria-hidden="true"><i></i><i></i><i></i></span><span>${ad}</span></a>
    <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
    <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span class="s">${st.open ? 'Açık' : 'Kapalı'}</span></p>
    <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>
  </div>
  ${stripe}`;

// --- Hero: künye ---------------------------------------------------------------------

$('#hero').innerHTML = `
  <div class="hero__stage">
    <picture><source media="(min-width: 900px)" srcset="${img('/img/elektrik-klasik2/karmasa-genis.jpg')}" width="2200" height="1364" /><img class="hero__img" src="${img('/img/elektrik-klasik2/karmasa.jpg')}" alt="Motor bölmesinde renkli elektrik kabloları" width="1066" height="1600" fetchpriority="high" /></picture>
    <div class="hero__shade" aria-hidden="true"></div>
    <div class="wrap hero__copy">
      <h1 class="hero__title" id="hero-title">${ad}</h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="state-line ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__cta">
        <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--white" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
        <a class="btn btn--glass" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
    <ul class="hero__wires" aria-hidden="true">${d.hizmetler.map((h) => `<li style="--c:${renk(h.sigorta)[0]}"></li>`).join('')}</ul>
  </div>`;

// --- Hizmetler: her hat bir iş -----------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="head">
      <p class="kicker rv" aria-hidden="true"><i style="background:#e2261c"></i></p>
      <h2 class="h2 rv">Hizmetler</h2>
      <p class="head__p rv">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </header>
    <ol class="lines">
      ${d.hizmetler.map((h, i) => `
        <li class="line rv" style="--c:${renk(h.sigorta)[0]}">
          <span class="line__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          ${fuseSVG(h.sigorta)}
          <div class="line__body">
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
          </div>
          <p class="line__meta"><span>Süre <b>${esc(h.sure)}</b></span></p>
          <i class="line__wire" aria-hidden="true"></i>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap olcu__grid">
    <div class="olcu__text">
      <p class="kicker rv" aria-hidden="true"><i style="background:#1f5fd8"></i></p>
      <h2 class="h2 rv">Hakkında</h2>
      <p class="olcu__lead rv">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts rv">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <figure class="olcu__photo rv">
      <img src="${img('/img/elektrik-klasik2/kaput-usta.jpg')}" alt="Kaputun altında kablo soketi kontrolü" width="1600" height="1066" loading="lazy" decoding="async" />
    </figure>
    <figure class="olcu__photo olcu__photo--s rv">
      <img src="${img('/img/elektrik-klasik2/aku-takviye.jpg')}" alt="Motor bölmesinde akü ve kırmızı takviye kablosu" width="1600" height="1068" loading="lazy" decoding="async" />
    </figure>
  </div>
  <ul class="wrap sleeves">
    <li class="sleeve rv" style="--c:${PALET[0]}">
      <span class="sleeve__wire" aria-hidden="true"></span>
      <span class="sleeve__tube"><b data-count="${yas}">${yas}</b><small>yıl</small></span>
      <span class="sleeve__lbl">Şaşmaz Oto Sanayi Sitesi'nde</span>
    </li>
    <li class="sleeve rv" style="--c:${PALET[1]}">
      <span class="sleeve__wire" aria-hidden="true"></span>
      <span class="sleeve__tube"><b data-count="${acikGun}">${acikGun}</b><small>gün</small></span>
      <span class="sleeve__lbl">haftada açık</span>
    </li>
  </ul>`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap dukkan__grid">
    <div class="dukkan__info">
      <p class="kicker rv" aria-hidden="true"><i style="background:#7b4b2a"></i></p>
      <h2 class="h2 rv">Çalışma saatleri ve konum</h2>
      <p class="state ${st.open ? 'is-open' : ''} rv"><i></i><span>${esc(durumMetni)}</span></p>
      <table class="hours rv">
        <caption class="sr-only">Çalışma saatleri</caption>
        ${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
      </table>
      <p class="dukkan__adres rv">${esc(d.iletisim.adres)}</p>
      <div class="dukkan__cta rv">
        <a class="btn btn--red" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map rv" data-map><p>Harita</p></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------

const yildiz = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap yorum__head">
    <p class="kicker rv" aria-hidden="true"><i style="background:#d9a441"></i></p>
    <h2 class="h2 rv">Örnek yorumlar</h2>
    <p class="head__p rv">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="yorum__track" data-lenis-prevent-touch>
    <ul class="yorum__list">
      ${d.yorumlar.map((y, i) => `
        <li class="card" style="--c:${PALET[i % PALET.length]}">
          ${yildiz(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="card__who">${esc(y.ad)} <span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__img" src="${img('/img/elektrik-klasik2/kablolar.jpg')}" alt="" width="1800" height="1199" loading="lazy" decoding="async" />
  <div class="wrap final__in">
    <p class="kicker kicker--light rv" aria-hidden="true"><i style="background:#f2c200"></i></p>
    <h2 class="final__title rv">İletişim</h2>
    <p class="rv">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__cta rv">
      <a class="btn btn--red btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--white btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__addr rv">${esc(d.iletisim.adres)}<br>${esc(durumMetni)}</p>
  </div>`;

$('#foot').innerHTML = `
  ${stripe}
  <div class="wrap foot__in">
    <div><p class="foot__brand">${ad}</p><p class="foot__what">${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// --- Harita: yaklaşınca yükle --------------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -----------------------------------------------------------------------------

if (reducedMotion) {
  $$('.rv').forEach((e) => e.classList.add('in'));
} else {
  initSmoothScroll();
  // Açılış: künye satır satır gelir, hero'nun altındaki demet hatları soldan çekilir (bir kez, ~1 sn).
  gsap.from('.hero__copy > *', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  gsap.from('.hero__wires li', { scaleX: 0, transformOrigin: 'left center', duration: 0.9, stagger: 0.05, ease: 'power3.inOut', delay: 0.15 });

  ScrollTrigger.batch('.rv', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('in'), i * 70)),
  });

  // Sayaçlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } });
      },
    });
  });

  gsap.fromTo('.final__img', { yPercent: -6, scale: 1.1 }, {
    yPercent: 6, scale: 1.1, ease: 'none',
    scrollTrigger: { trigger: '#iletisim', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}
