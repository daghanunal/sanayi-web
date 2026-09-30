// Sini (klasik aile, ocakbaşı): kuşbakışı fıstık yeşili masa, bakır sini, limon sarısı. WebGL yok.
// Akış: künye → Menü → Hakkında → Çalışma saatleri ve konum → Örnek yorumlar → İletişim (rezervasyon).
// Künyede sini kurulu durur: açılışta tabaklar kenardan dönerek gelip bir kez yerine oturur (~1 sn).
import sektor from '../../data/sektor-restoran.json';
import ek from '../../data/restoran-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, GUNLER, autoHideHeader,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...ek, preset: 'restoran-klasik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, new Date().getFullYear() - kurulus);
const st = gunDurumu(d.saatler);
const waGenel = d.waMesaj || 'Merhaba, masa ayırtmak istiyorum.';
const waPaket = 'Merhaba, paket sipariş vermek istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta rezervasyon metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: restoran olarak işaretle ------------------------------------------
$$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
const ld = $('script[type="application/ld+json"]');
if (ld) {
  const gunEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    servesCuisine: 'Kebap, ızgara, meze',
    acceptsReservations: true,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${gunEn[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
}
document.title = `${d.isletme.ad} | Ocakbaşı | Etimesgut, Ankara`;

const btn = (cls, href, ikon, label, dis) =>
  `<a class="btn ${cls}" href="${href}"${dis ? ' target="_blank" rel="noopener"' : ''}>${ikon}<span>${label}</span></a>`;
const durum = (metin) => `<span class="dot" aria-hidden="true"></span>${esc(metin)}`;
const liste = saatListesi(d.saatler);
const sira = [1, 2, 3, 4, 5, 6, 0];
const bugunG = sira.indexOf(new Date().getDay());
const bugunMu = (gunler) => {
  const [a, b] = gunler.split('–');
  const ia = sira.indexOf(GUNLER.indexOf(a));
  const ib = b ? sira.indexOf(GUNLER.indexOf(b)) : ia;
  return bugunG >= ia && bugunG <= ib;
};
document.documentElement.classList.toggle('is-open', st.open);

// --- Başlık ------------------------------------------------------------------------
$('#ust').innerHTML = `
  <a href="#top" class="top__brand" aria-label="${ad}, sayfa başı"><span class="top__mark" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Sayfa bölümleri">
    <a href="#menu">Menü</a>
    <a href="#hakkinda">Hakkında</a>
    <a href="#saatler">Saatler ve konum</a>
    <a href="#iletisim">Rezervasyon</a>
  </nav>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye -------------------------------------------------------------------------
const kelime = d.isletme.ad.trim().split(/\s+/);
const adHtml = kelime.length > 1
  ? `<span>${esc(kelime.slice(0, -1).join(' '))}</span> <span class="alt">${esc(kelime.at(-1))}</span>`
  : `<span>${ad}</span>`;
const sofra = d.sofra || [];
$('#top').innerHTML = `
  <div class="hero__cloth" aria-hidden="true"></div>
  <div class="hero__in">
    <div class="hero__copy">
      <h1 class="hero__name${d.isletme.ad.length > 18 ? ' is-long' : ''}${d.isletme.ad.length > 28 ? ' is-xlong' : ''}" id="hero-ad">${adHtml}</h1>
      <p class="hero__what">${esc(d.isletme.tanim)}</p>
      <dl class="kunye">
        <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt class="mono">Bugün</dt><dd class="kunye__durum">${durum(st.kunye)}</dd></div>
        <div><dt class="mono">Saatler</dt><dd><ul class="kunye__saat">${liste.map(([g, s]) => `<li${bugunMu(g) ? ' class="is-today"' : ''}><span>${esc(g)}</span> <b>${esc(s)}</b></li>`).join('')}</ul></dd></div>
        <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
      <div class="hero__cta">
        ${btn('btn--light', telHref(d), icons.phone, 'Ara')}
        ${btn('btn--glass', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true)}
        ${btn('btn--glass', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      </div>
    </div>
    <div class="table" aria-hidden="true">
      <div class="sini"></div>
      ${sofra.map((p, i) => `<div class="plate" style="--i:${i}"><img src="${esc(p.src)}" alt="" decoding="async" /></div>`).join('')}
      <div class="plate plate--main"><img src="${esc(d.sofraOrta?.src || '')}" alt="" fetchpriority="high" decoding="async" /></div>
    </div>
  </div>`;

// Tabaklar sininin çevresinde bir elips üstünde durur (yüzde ile; ekran boyuna göre kendiliğinden ölçeklenir).
const ANG = [-62, 4, 62, 122, 180, 236];
const ROT = [-14, 9, -6, 12, -10, 7];
$$('.table .plate:not(.plate--main)').forEach((el, i) => {
  const t = (ANG[i % ANG.length] * Math.PI) / 180;
  el.style.setProperty('--x', `${(50 + Math.cos(t) * 34).toFixed(2)}%`);
  el.style.setProperty('--y', `${(50 + Math.sin(t) * 31).toFixed(2)}%`);
  el.style.setProperty('--r', `${ROT[i % ROT.length]}deg`);
});

// --- Menü ----------------------------------------------------------------------------
const tabak = (h) => d.menuGorsel?.[h.id] || h.gorsel || '';
$('#menu').innerHTML = `
  <div class="menu__card">
    <div class="menu__head">
      <h2 class="h2" id="menu-h">Menü</h2>
      <p class="lead">Süre, siparişten masaya ortalama bekleme süresidir. Güncel fiyat için arayın ya da WhatsApp'tan yazın.</p>
    </div>
    <ol class="menu__list">
      ${d.hizmetler.map((h) => `
        <li class="dish">
          <span class="dish__plate" aria-hidden="true"><img src="${esc(tabak(h))}" alt="" loading="lazy" decoding="async" /></span>
          <div class="dish__body">
            <h3 class="dish__line"><span class="dish__name">${esc(h.baslik)}</span><span class="dish__dots" aria-hidden="true"></span>${h.sure ? `<span class="dish__time mono"><span class="sr-only">Bekleme: </span>${esc(h.sure)}</span>` : ''}</h3>
            <p class="dish__desc">${esc(h.aciklama)}</p>
          </div>
        </li>`).join('')}
    </ol>
  </div>
  ${d.servisler?.length ? `
  <div class="servis">
    <h3 class="servis__t">Masa, paket ve grup</h3>
    <ul class="opts">
      ${d.servisler.map((s) => `
        <li class="opt">
          ${s.sure ? `<p class="opt__time mono">${esc(s.sure)}</p>` : ''}
          <h4 class="opt__name">${esc(s.baslik)}</h4>
          <p class="opt__desc">${esc(s.aciklama)}</p>
        </li>`).join('')}
    </ul>
  </div>` : ''}`;

// --- Hakkında ----------------------------------------------------------------------
const acikGun = acikGunSayisi(d.saatler);
const GAL = ['ocak', 'meze-masa', 'kor-sis', 'firin', 'salon'];
const local = (src) => String(src || '').replace('/sektor-restoran/', '/restoran-klasik/');
const galeri = GAL.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('#hakkinda').innerHTML = `
  <div class="tiles" aria-hidden="true"></div>
  <div class="about__in">
    <div class="about__text">
      <h2 class="h2" id="about-h">Hakkında</h2>
      <p class="about__t">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz'da, Ankara Bulvarı üzerinde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <ul class="stats" aria-label="Rakamlarla">
      <li class="stat"><p class="stat__val"><span data-count="${yas}">${yas}</span><small> yıl</small></p><p class="stat__lbl">Şaşmaz'da</p></li>
      <li class="stat"><p class="stat__val"><span data-count="${acikGun}">${acikGun}</span><small> gün</small></p><p class="stat__lbl">haftada açık</p></li>
    </ul>
    ${d.bilgiler?.length ? `<dl class="facts">${d.bilgiler.map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
  </div>
  ${galeri.length ? `
  <div class="galeri">
    <div class="galeri__grid">
      ${galeri.map((g, i) => `<figure class="shot shot--${i + 1}"><img src="${esc(local(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>`).join('')}
    </div>
    <p class="galeri__not mono">Fotoğraflar temsilîdir</p>
  </div>` : ''}`;

// --- Çalışma saatleri ve konum -------------------------------------------------------
$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="konum__status">${durum(st.metin)}</p>
    <dl class="hours">
      ${liste.map(([g, s]) => `<div class="${bugunMu(g) ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd class="mono">${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="konum__not">Son sipariş kapanıştan yarım saat önce alınır.</p>
    <h3 class="konum__h mono">Adres</h3>
    <p class="konum__addr">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns">
      ${btn('btn--blue', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      ${btn('btn--line', telHref(d), icons.phone, tel)}
    </div>
  </div>
  <div class="konum__map" id="map"><span class="mono">Harita</span></div>`;

// --- Örnek yorumlar ------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="yorum__head">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="yorum__not">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
        <p class="rev__text">${esc(y.metin)}</p>
        <p class="rev__who"><span class="rev__ini" aria-hidden="true">${esc(String(y.ad).charAt(0))}</span><strong>${esc(y.ad)}</strong>${y.konu ? `<span class="rev__konu">${esc(y.konu)}</span>` : ''}</p>
      </li>`).join('')}
  </ul>`;

// --- İletişim: rezervasyon mesajı ------------------------------------------------------
const R = d.rezervasyon || {};
const TUR = R.turler || ['Salon'];
const GUN = ['Bugün', 'Yarın', 'Hafta sonu', 'Başka gün'];
const SAAT = R.saatler || [];
const MAX = 40;
$('#iletisim').innerHTML = `
  <div class="masa__head">
    <h2 class="h2" id="masa-h">İletişim</h2>
    <p class="lead">Rezervasyon WhatsApp'tan ya da telefonla yapılır. Kişi sayısı, yer ve saat seçilince mesaj hazırlanır.</p>
  </div>
  <div class="masa__wrap">
    <form class="plan" onsubmit="return false" aria-labelledby="plan-h">
      <h3 class="plan__t" id="plan-h">Rezervasyon</h3>
      <div class="plan__row">
        <p class="plan__lbl" id="kisi-l">Kişi sayısı</p>
        <div class="stepper" role="group" aria-labelledby="kisi-l">
          <button type="button" class="stepper__b" data-kisi="-1" aria-label="Bir kişi azalt">−</button>
          <output class="stepper__v" data-kisi-v aria-live="polite">4</output>
          <button type="button" class="stepper__b" data-kisi="1" aria-label="Bir kişi artır">+</button>
        </div>
      </div>
      <div class="seats" aria-hidden="true"><span class="seats__table"></span>${'<span class="seat"></span>'.repeat(MAX)}</div>
      <p class="plan__hint" data-hint></p>
      <div class="plan__row plan__row--col"><p class="plan__lbl">Yer</p><div class="chips" data-tur></div></div>
      <div class="plan__row plan__row--col"><p class="plan__lbl">Gün</p><div class="chips" data-gun></div></div>
      <div class="plan__row plan__row--col"><p class="plan__lbl">Saat</p><div class="chips" data-saat></div></div>
      <p class="plan__msg" data-msg></p>
      <a class="btn btn--blue btn--big" data-send target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
    </form>
    <div class="contact">
      <dl class="contact__list">
        <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
        <div><dt class="mono">Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
        <div><dt class="mono">Bugün</dt><dd class="kunye__durum">${durum(st.metin)}</dd></div>
      </dl>
      <div class="contact__btns">
        ${btn('btn--blue', telHref(d), icons.phone, 'Ara')}
        ${btn('btn--line', waHref(d, waPaket), icons.whatsapp, 'Paket sipariş', true)}
        ${btn('btn--line', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      </div>
      ${d.surec?.length ? `<ol class="adim">${d.surec.map((s, i) => `<li><b class="mono">${String(i + 1).padStart(2, '0')}</b><span><strong>${esc(s.baslik)}</strong> ${esc(s.aciklama)}</span></li>`).join('')}</ol>` : ''}
    </div>
  </div>`;

const plan = { kisi: 4, tur: 0, gun: 0, saat: SAAT.length > 2 ? 3 : 0, oto: true };
const chips = (el, list, key, bicim = (x) => x) => {
  el.innerHTML = list.map((t, i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="false">${esc(bicim(t))}</button>`).join('');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    plan[key] = Number(b.dataset.i);
    if (key === 'tur') plan.oto = false;
    renderPlan();
  });
};
const saatYaz = (s) => String(s).replace(':', '.');
chips($('[data-tur]'), TUR, 'tur');
chips($('[data-gun]'), GUN, 'gun');
chips($('[data-saat]'), SAAT, 'saat', saatYaz);
const seatEls = $$('.seat');
const grupIdx = TUR.findIndex((t) => /grup/i.test(t));
const paketIdx = TUR.findIndex((t) => /paket/i.test(t));
function renderPlan() {
  if (plan.oto && grupIdx > -1) plan.tur = plan.kisi > 12 ? grupIdx : 0;
  $('[data-kisi-v]').textContent = plan.kisi;
  seatEls.forEach((s, i) => s.classList.toggle('is-on', i < plan.kisi));
  for (const [k, sel] of [['tur', '[data-tur]'], ['gun', '[data-gun]'], ['saat', '[data-saat]']]) {
    $$('.chip', $(sel)).forEach((c, i) => {
      c.classList.toggle('is-on', i === plan[k]);
      c.setAttribute('aria-pressed', String(i === plan[k]));
    });
  }
  const paket = plan.tur === paketIdx;
  const tur = TUR[plan.tur], gun = GUN[plan.gun], saat = saatYaz(SAAT[plan.saat] || '');
  $('[data-hint]').textContent = paket
    ? 'Lavaş ve közleme ayrı kaba konur. Sipariş hazır olunca haber verilir.'
    : plan.kisi > 12
      ? `${plan.kisi} kişi arka salona alınır. Grup yemekleri 1–2 gün önceden konuşulur.`
      : 'Cuma ve cumartesi akşamları ocakbaşı tezgâhı erken dolar.';
  const zaman = plan.gun === 3 ? `saat ${saat} civarı, gün yazışarak belirlenecek` : `${gun.toLocaleLowerCase('tr')} saat ${saat}`;
  const msg = paket
    ? `Merhaba, ${plan.kisi} kişilik paket sipariş vermek istiyorum. ${plan.gun === 3 ? '' : `${gun}, `}saat ${saat} gibi hazır olabilir mi?`
    : `Merhaba, ${plan.kisi} kişilik masa ayırtmak istiyorum. Yer: ${tur}. Zaman: ${zaman}.`;
  $('[data-msg]').textContent = `“${msg}”`;
  $('[data-send]').href = waHref(d, msg);
}
$$('[data-kisi]').forEach((b) => b.addEventListener('click', () => {
  plan.kisi = clamp(plan.kisi + Number(b.dataset.kisi), 1, MAX);
  renderPlan();
}));
renderPlan();

// --- Footer --------------------------------------------------------------------------
$('#foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${tel}</a></p>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar temsilîdir (Pexels). Yorumlar örnektir. Güncel fiyatlar için arayın.</p>`;

// --- Harita: yaklaşınca yüklenir -----------------------------------------------------------
const mapBox = $('#map');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Başlık çubuğu ---------------------------------------------------------------------
const top = $('#ust');
const solid = () => top.classList.toggle('is-solid', scrollY > $('#top').offsetHeight - 70);
addEventListener('scroll', solid, { passive: true });
addEventListener('resize', solid, { passive: true });
solid();
if (innerWidth < 900) autoHideHeader(top, { offset: 140 });

// --- Hareket (sakin: bir kez, küçük kayma) --------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  // Açılış: sini belirir, orta tabak döner, çevre tabaklar kenardan gelip oturur. Kaydırma kilitlenmez.
  const plates = $$('.table .plate:not(.plate--main)');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.hero__copy > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0)
    .from('.sini', { scale: 0.86, autoAlpha: 0, rotate: -30, duration: 0.9 }, 0)
    .from('.plate--main', { scale: 0.6, autoAlpha: 0, rotate: -60, duration: 0.9 }, 0.08);
  plates.forEach((p, i) => {
    const t = (ANG[i % ANG.length] * Math.PI) / 180;
    tl.from(p, { xPercent: Math.cos(t) * 260, yPercent: Math.sin(t) * 260, rotate: i % 2 ? 140 : -140, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.2)' }, 0.12 + i * 0.05);
  });
  // Kaydırdıkça sini hafifçe döner (yalnız künye görünürken).
  gsap.to('.sini', { rotate: -18, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });

  $$('.h2').forEach((h) => gsap.from(h, { y: 26, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });
  $$('.dish').forEach((el) => {
    gsap.from(el.querySelector('.dish__plate'), { rotate: -90, scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(1.4)', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  gsap.from('.opt', { y: 24, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.opts', start: 'top 90%' } });
  $$('.shot').forEach((s) => gsap.fromTo(s, { clipPath: 'inset(6% 6% 6% 6% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 92%' } }));
  gsap.from('.rev', { y: 24, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 90%' } });
  addEventListener('load', () => ScrollTrigger.refresh());
}
