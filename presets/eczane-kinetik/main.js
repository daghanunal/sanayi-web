// Eczane Kinetik: WebGL yok. Sayfa bir kapsül gibi açılır; yazılar afiş gibi kayar,
// imza anında haftalık ilaç kutusunun kapakları kaydırdıkça tek tek açılır.
import ana from '../../data/eczane.json';
import ek from '../../data/eczane-kinetik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const d = boot({ ...ana, ...ek, preset: 'eczane-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const buYil = new Date().getFullYear();
const kurulus = Number(d.isletme.kurulus) || buYil;
const yas = Math.max(1, buYil - kurulus);
const ad = esc(d.isletme.ad);
const st = openStatus(d.saatler);
const isDesk = () => innerWidth >= 900;
if (reducedMotion) html.classList.add('rm');

// Türkçe ayrılma eki: 1994'ten, 1990'dan, 2008'den…
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : n % 100 ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}

// --- Arama motoru: eczane olarak işaretle -----------------------------------
(function pharmacyLd() {
  const ld = $('script[type="application/ld+json"]');
  if (!ld) return;
  const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
    ...(d.puan && { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet } }),
  });
  document.title = `${d.isletme.ad} | Eczane | Etimesgut, Ankara`;
})();

// --- Ortak parçalar ---------------------------------------------------------
const receteMsg = 'Merhaba, reçetemin fotoğrafını gönderiyorum. Hazırlayabilir misiniz?';
const btnWa = (label = 'Reçetenizi gönderin', msg = receteMsg, cls = '') =>
  `<a class="btn btn--wa ${cls}" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(label)}</span></a>`;
const btnCall = (label = 'Hemen arayın', cls = '') =>
  `<a class="btn btn--line ${cls}" href="${telHref(d)}">${icons.phone}<span>${esc(label)}</span></a>`;
const capsIcon = '<span class="caps" aria-hidden="true"><i></i><i></i></span>';
const statusHtml = () => `<i aria-hidden="true"></i>${esc(st.text)}`;

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = statusHtml();
});
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
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

// --- 1. Hero: kapsül açılır ------------------------------------------------
const hizmet = (id) => d.hizmetler.find((h) => h.id === id) || {};
const sloganKelime = d.isletme.slogan.split(/\s+/).filter(Boolean);
$('#hero').innerHTML = `
  <figure class="hero__photo" aria-hidden="true"><img src="${asset('/img/eczane/tezgah.jpg')}" alt="" fetchpriority="high" /></figure>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__in">
    <p class="mono hero__meta"><span>Şaşmaz · Etimesgut</span><span>${esc(ablative(kurulus))} beri</span></p>
    <h1 class="hero__h" id="hero-h">${sloganKelime
      .map((w, i) => `<span class="w${i === 0 ? ' w--pill' : ''}"><span class="wi">${esc(w)}</span></span>`)
      .join(' ')}</h1>
    <div class="cap" aria-hidden="true">
      <span class="cap__half cap__half--l"><b>${ad}</b></span>
      <span class="cap__half cap__half--r"><b>${esc(ablative(kurulus))} beri</b></span>
    </div>
    <div class="hero__cta">${btnWa('Reçetenizi gönderin')}${btnCall('Arayın')}</div>
    <p class="hero__status" data-status-hero></p>
  </div>
  <div class="hero__after">
    <p class="mono">Mahallenin eczanesi</p>
    <p class="hero__about">${esc(d.isletme.hakkinda)}</p>
  </div>
  <p class="hero__hint mono" aria-hidden="true">Kaydırın, kapsül açılsın</p>`;
const heroStatus = $('[data-status-hero]');
heroStatus.classList.toggle('is-open', st.open);
heroStatus.innerHTML = statusHtml();

// --- 2. Kullanım bantları ---------------------------------------------------
const kul = hizmet('kullanim');
$('#kullanim').innerHTML = `
  <div class="bant__tracks" aria-hidden="true">
    ${d.bantlar
      .map((row, i) => {
        const one = row.map((w) => `<span>${esc(w)}</span>${capsIcon}`).join('');
        return `<div class="bant__row bant__row--${i}"><div class="bant__track">${one}${one}${one}</div></div>`;
      })
      .join('')}
  </div>
  <div class="bant__body">
    <figure class="pillframe"><img src="${asset(kul.gorsel || '/img/eczane/kapsul.jpg')}" alt="Eczacının avucunda ilaçlar" loading="lazy" /></figure>
    <div>
      <p class="kicker mono">${esc(kul.baslik || 'İlaç kullanım bilgisi')}</p>
      <h2 id="bant-h" class="h2">İlacınızı verirken nasıl kullanacağınızı da anlatırız.</h2>
      <p class="lead">${esc(kul.aciklama || '')}</p>
    </div>
  </div>`;

// --- 3. İmza: haftalık kutu -------------------------------------------------
const hat = hizmet('hatirlatma');
const gunKisa = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
const gunUzun = [1, 2, 3, 4, 5, 6, 0].map((i) => GUNLER[i]);
const hapRenk = ['a', 'b', 'c'];
const hucre = (g, r) => {
  const n = 1 + ((g + r * 3) % 3);
  const hap = Array.from({ length: n }, (_, k) => `<i class="hap hap--${hapRenk[(g + k + r) % 3]}"></i>`).join('');
  return `<div class="cell" data-i="${g * 2 + r}"><div class="cell__in">${hap}</div><div class="lid"><span>${gunKisa[g]}</span></div></div>`;
};
$('#kutu').innerHTML = `
  <div class="kutu__pin">
    <div class="kutu__head">
      <p class="kicker mono">${esc(hat.baslik || 'Düzenli ilaç takibi')}</p>
      <h2 id="kutu-h" class="h2">${esc(d.kutu.baslik)}</h2>
    </div>
    <div class="kutu__stage">
      <p class="kutu__day" aria-hidden="true"><span data-day>${esc(gunUzun[0])}</span></p>
      <div class="org" aria-hidden="true">
        <div class="org__rows"><span>Sabah</span><span>Akşam</span></div>
        <div class="org__grid">${gunKisa.map((_, g) => `<div class="org__col">${hucre(g, 0)}${hucre(g, 1)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="kutu__talk">
      <ol class="kutu__list">${d.kutu.maddeler.map((m, i) => `<li><b class="mono">0${i + 1}</b><span>${esc(m)}</span></li>`).join('')}</ol>
      <div class="kutu__end">
      <div class="bubble">
        <p class="bubble__who mono">${ad}</p>
        <p class="bubble__txt">${esc(d.kutu.balon)}</p>
        <p class="bubble__time mono">WhatsApp</p>
      </div>
      <div class="kutu__cta">${btnWa('Hatırlatma isteyin', hat.mesaj || 'Merhaba, düzenli kullandığım ilaçlar için hatırlatma istiyorum.')}</div>
      </div>
    </div>
  </div>`;

// --- 4. Reçete: üç adım ----------------------------------------------------
$('#recete').innerHTML = `
  <header class="recete__head">
    <p class="kicker mono">Reçete hazırlama</p>
    <h2 id="recete-h" class="h2">Siz gelmeden hazır.</h2>
    <p class="lead">${esc(hizmet('recete').aciklama || '')}</p>
  </header>
  <ol class="steps">
    ${d.surec
      .map(
        (s, i) => `<li class="step">
        <span class="step__n" aria-hidden="true">${i + 1}</span>
        <div class="step__t"><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
      </li>`
      )
      .join('')}
  </ol>
  <div class="recete__cta">${btnWa('Reçete fotoğrafını gönderin')}<p class="note">Kimliğinizle gelin, sıra beklemeden alın.</p></div>`;

// --- 5. Rakamlar -------------------------------------------------------------
$('#rakamlar').innerHTML = `
  <ul class="stats">${d.istatistikler
    .map((s) => {
      const v = s.kurulustanHesapla ? yas : s.deger;
      return `<li><b data-count="${Number(v) || 0}">${Number(v) || 0}</b><small>${esc(s.sonek || '')}</small><span>${esc(s.etiket)}</span></li>`;
    })
    .join('')}</ul>
  <p class="rakam__g mono">${esc(d.garanti || '')}</p>`;

// --- 6. Hizmetler -----------------------------------------------------------
$('#hizmetler').innerHTML = `
  <header class="hiz__head">
    <p class="kicker mono">Tezgâhta neler yaparız</p>
    <h2 id="hiz-h" class="h2">Sorun, anlatalım.</h2>
  </header>
  <ul class="srvs">${d.hizmetler
    .map(
      (h, i) => `<li class="srv${i % 2 ? ' srv--r' : ''}">
      <figure class="srv__img"><img src="${asset(h.gorsel || '/img/eczane/tezgah.jpg')}" alt="${esc(h.baslik)}" loading="lazy" /></figure>
      <div class="srv__t">
        <p class="mono srv__n">${String(i + 1).padStart(2, '0')} / ${String(d.hizmetler.length).padStart(2, '0')}</p>
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
        ${h.mesaj ? `<a class="srv__wa" href="${waHref(d, h.mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>` : ''}
      </div>
    </li>`
    )
    .join('')}</ul>`;

// --- 7. Nöbet ---------------------------------------------------------------
const nobet = d.nobet || { url: 'https://www.aeo.org.tr/nobetci-eczaneler', kaynak: 'Ankara Eczacı Odası' };
const nobetMetin = st.open
  ? `Şu an açığız. Kapandıktan sonra ilaç gerekirse en yakın nöbetçi eczaneye ${nobet.kaynak} listesinden bakın.`
  : `Şu an kapalıyız. En yakın nöbetçi eczane için ${nobet.kaynak}'nın güncel listesine bakın.`;
const marq = Array.from({ length: 4 }, () => `<span>Nöbetçi eczane</span>${capsIcon}`).join('');
$('#nobet').innerHTML = `
  <div class="marq" aria-hidden="true"><div class="marq__t">${marq}${marq}</div></div>
  <div class="nobet__in">
    <div class="moon" aria-hidden="true"><i></i></div>
    <div>
      <p class="kicker mono">Gece ve bayram</p>
      <h2 id="nobet-h" class="h2">Kapalıysak, nöbetçi eczane açık.</h2>
      <p class="lead">${esc(nobetMetin)} Nöbetçi olduğumuz geceler kapımızda da yazar.</p>
      <a class="btn btn--moon" href="${esc(nobet.url)}" target="_blank" rel="noopener"><span>Bu gece nöbetçi eczaneler</span><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>
    </div>
  </div>`;

// --- 8. Yorumlar ------------------------------------------------------------
const yildiz = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
const puanStr = Number(d.puan.ortalama).toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('#yorumlar').innerHTML = `
  <header class="yorum__head">
    <p class="yorum__big" aria-hidden="true">${esc(puanStr)}</p>
    <div>
      <p class="stars" aria-label="5 üzerinden ${esc(puanStr)}">${yildiz(Math.round(d.puan.ortalama))}</p>
      <h2 id="yorum-h" class="h2">${esc(String(d.puan.adet))} değerlendirme</h2>
      <p class="lead">Google'da mahallemizden yazılanlar.</p>
    </div>
  </header>
  <ul class="cards">${d.yorumlar
    .map(
      (y) => `<li class="card">
      <p class="stars stars--s" aria-label="5 üzerinden ${y.puan}">${yildiz(y.puan)}</p>
      <blockquote>${esc(y.metin)}</blockquote>
      <p class="card__ad mono">${esc(y.ad)}</p>
    </li>`
    )
    .join('')}</ul>`;

// --- 9. Ulaşım --------------------------------------------------------------
const bugun = new Date().getDay();
$('#ulasim').innerHTML = `
  <div class="ulasim__t">
    <p class="kicker mono">Çalışma saatleri</p>
    <h2 id="ulasim-h" class="h2">Uğrayın, bekletmeyelim.</h2>
    <p class="pillstatus${st.open ? ' is-open' : ''}">${statusHtml()}</p>
    <dl class="hours">${groupedHours(d.saatler)
      .map(([g, s]) => `<div${g.includes(GUNLER[bugun]) ? ' class="is-today"' : ''}><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`)
      .join('')}</dl>
    <p class="adres">${icons.pin}<span>${esc(d.iletisim.adres)}</span></p>
    <div class="row">
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      ${btnCall(d.iletisim.telefon)}
    </div>
    <p class="note">Kapalı saatlerde: <a href="${esc(nobet.url)}" target="_blank" rel="noopener">bu gece nöbetçi eczaneler</a></p>
  </div>
  <div class="map" data-map><span class="mono">Harita yükleniyor</span></div>`;
const mapEl = $('[data-map]');
new IntersectionObserver(
  (en, io) => {
    if (!en[0].isIntersecting) return;
    mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(mapEl);

// --- 10. Son çağrı + footer -------------------------------------------------
$('#son').innerHTML = `
  <h2 id="son-h" class="son__h">${d.finalBaslik
    .split(/\s+/)
    .map((w) => `<span class="w"><span class="wi">${esc(w)}</span></span>`)
    .join(' ')}</h2>
  <div class="son__cta">${btnWa('WhatsApp\'tan gönderin', receteMsg, 'btn--big')}${btnCall(d.iletisim.telefon, 'btn--big btn--light')}</div>
  <div class="son__caps" aria-hidden="true"><span class="cap__half cap__half--l"></span><span class="cap__half cap__half--r"></span></div>`;
$('#foot').innerHTML = `
  <div class="foot__in">
    <p class="foot__brand">${capsIcon}<span>${ad}</span></p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a> · <a href="${esc(nobet.url)}" target="_blank" rel="noopener">Nöbetçi eczaneler</a></p>
    <p class="mono foot__s">© ${buYil} ${ad}. Sitede ilaç tanıtımı ve satışı yapılmaz; ilaçlarınız eczanede eczacı tarafından verilir.</p>
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

  // Açılış: kelimeler maskeden yükselir, kapsülün iki yarısı yanlardan gelip birleşir.
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
  intro
    .from('.hero__meta span', { yPercent: 120, opacity: 0, stagger: 0.08, duration: 0.7 })
    .from('.hero__h .wi', { yPercent: 115, rotate: 4, stagger: 0.06, duration: 0.9 }, 0.1)
    .from('.hero .cap__half--l', { xPercent: -160, rotate: -30, duration: 1.1, ease: 'back.out(1.3)' }, 0.35)
    .from('.hero .cap__half--r', { xPercent: 160, rotate: 30, duration: 1.1, ease: 'back.out(1.3)' }, 0.35)
    .from('.hero .cap', { rotate: -8, duration: 1.4, ease: 'elastic.out(1, .5)' }, 1.1)
    .from('.hero__cta > *, .hero__status', { y: 24, opacity: 0, stagger: 0.07, duration: 0.6 }, 0.8)
    .from('.hero__hint', { opacity: 0, duration: 0.6 }, 1.4);

  // Scroll: kapsül açılır, arkasından eczane fotoğrafı ekranı kaplar.
  const hero = $('#hero');
  const cap = $('.hero .cap');
  const photo = $('.hero__photo');
  const capClip = () => {
    const h = hero.getBoundingClientRect();
    const c = cap.getBoundingClientRect();
    const t = c.top - h.top, l = c.left - h.left;
    const cx = l + c.width / 2;
    return `inset(${t}px ${h.width - cx}px ${h.height - t - c.height}px ${cx}px round ${c.height / 2}px)`;
  };
  gsap.set(photo, { clipPath: capClip() });
  const htl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: hero, start: 'top top', end: '+=130%', pin: true, scrub: 0.6, invalidateOnRefresh: true },
  });
  htl
    .to('.hero__hint', { opacity: 0, duration: 0.1 }, 0)
    .to('.hero .cap__half--l', { xPercent: -95, rotate: -24, y: '-12vh', duration: 0.55 }, 0)
    .to('.hero .cap__half--r', { xPercent: 95, rotate: 24, y: '12vh', duration: 0.55 }, 0)
    .fromTo(photo, { clipPath: capClip }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.6 }, 0.05)
    .fromTo('.hero__photo img', { scale: 1.35 }, { scale: 1, duration: 0.8 }, 0)
    .to('.hero__h', { yPercent: -40, opacity: 0, duration: 0.35 }, 0.05)
    .to('.hero__meta, .hero__cta, .hero__status', { opacity: 0, y: -30, duration: 0.25 }, 0.05)
    .to('.hero .cap', { opacity: 0, duration: 0.2 }, 0.45)
    .fromTo('.hero__shade', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5)
    .fromTo('.hero__after', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.3 }, 0.6)
    .to({}, { duration: 0.15 });

  // Bantlar: satırlar zıt yönlere kayar.
  $$('.bant__row').forEach((row, i) => {
    const t = $('.bant__track', row);
    const dir = i % 2 ? 1 : -1;
    gsap.fromTo(t, { xPercent: dir < 0 ? 0 : -33.33 }, {
      xPercent: dir < 0 ? -33.33 : 0, ease: 'none',
      scrollTrigger: { trigger: '#kullanim', start: 'top bottom', end: 'bottom top', scrub: 0.4 },
    });
  });
  gsap.fromTo('.pillframe', { clipPath: 'inset(30% 42% 30% 42% round 999px)' }, {
    clipPath: 'inset(0% 0% 0% 0% round 999px)', ease: 'none',
    scrollTrigger: { trigger: '.pillframe', start: 'top 95%', end: 'top 45%', scrub: 0.5 },
  });
  revealText('.bant__body .kicker, .bant__body .h2, .bant__body .lead');

  // İmza: haftalık kutunun kapakları açılır.
  const cells = $$('.cell').sort((a, b) => a.dataset.i - b.dataset.i);
  const dayEl = $('[data-day]');
  const items = $$('.kutu__list li');
  let lastDay = 0;
  const ktl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#kutu', start: 'top top', end: () => `+=${innerHeight * 2.2}`, pin: '.kutu__pin', scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (s) => {
        const g = Math.min(6, Math.floor(Math.max(0, s.progress - 0.04) / 0.1));
        if (g !== lastDay) {
          lastDay = g;
          dayEl.textContent = gunUzun[g];
          dayEl.animate([{ transform: 'translateY(40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
      },
    },
  });
  ktl.from('.org', { rotateX: 38, y: 40, duration: 0.6, ease: 'power2.out' }, 0);
  cells.forEach((c, i) => {
    const at = 0.4 + i * 0.5;
    ktl.to($('.lid', c), { rotateX: -118, duration: 0.45, ease: 'power2.inOut' }, at)
      .from($$('.hap', c), { scale: 0, y: -10, duration: 0.3, stagger: 0.05, ease: 'back.out(3)' }, at + 0.15)
      .fromTo(c, { '--on': 0 }, { '--on': 1, duration: 0.2 }, at);
  });
  const L = 0.4 + cells.length * 0.5;
  if (isDesk()) {
    items.forEach((li, i) => ktl.from(li, { opacity: 0, x: 40, duration: 0.5 }, 0.8 + i * 2));
  } else {
    items.forEach((li, i) => {
      ktl.fromTo(li, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, 0.4 + i * 2.2);
      if (i < items.length - 1) ktl.to(li, { opacity: 0, y: -14, duration: 0.4 }, 0.4 + i * 2.2 + 1.8);
    });
    ktl.to(items.at(-1), { opacity: 0, y: -14, duration: 0.4 }, L - 0.2);
  }
  ktl.fromTo('.bubble', { opacity: 0, y: 40, scale: 0.9, transformOrigin: '0% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, L + 0.1)
    .fromTo('.kutu__cta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, L + 0.3)
    .to({}, { duration: 1.4 });

  // Reçete adımları: dev rakam içten dolar.
  revealText('.recete__head > *');
  $$('.step').forEach((s) => {
    gsap.fromTo($('.step__n', s), { '--f': '0%' }, {
      '--f': '100%', ease: 'none',
      scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 35%', scrub: 0.4 },
    });
    gsap.from($('.step__n', s), { xPercent: -30, rotate: -8, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'top 40%', scrub: 0.4 } });
    gsap.from($$('.step__t > *', s), { y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 70%' } });
  });

  // Rakamlar sayar.
  $$('[data-count]').forEach((b) => {
    const end = Number(b.dataset.count);
    const o = { v: 0 };
    b.textContent = '0';
    gsap.to(o, {
      v: end, duration: 1.6, ease: 'power3.out',
      scrollTrigger: { trigger: '#rakamlar', start: 'top 80%', once: true },
      onUpdate: () => (b.textContent = Math.round(o.v).toLocaleString('tr-TR')),
    });
  });
  gsap.from('.stats li', { yPercent: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '#rakamlar', start: 'top 80%' } });

  // Hizmetler: fotoğraf kapsül dar halinden açılır, başlık yana kayar.
  revealText('.hiz__head > *');
  $$('.srv').forEach((s, i) => {
    const img = $('.srv__img', s);
    gsap.fromTo(img, { clipPath: 'inset(0% 36% 0% 36% round 999px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 999px)', ease: 'none',
      scrollTrigger: { trigger: s, start: 'top 92%', end: 'top 40%', scrub: 0.5 },
    });
    const sh = isDesk() ? 18 : 6;
    gsap.from($('h3', s), { xPercent: i % 2 ? sh : -sh, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'top 62%', scrub: 0.5 } });
    gsap.from($$('.srv__t > :not(h3)', s), { y: 24, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 70%' } });
  });

  // Nöbet: kayan yazı yalnız ekrandayken döner; ay doğar.
  const marqEl = $('.marq');
  new IntersectionObserver(([e]) => marqEl.classList.toggle('is-on', e.isIntersecting)).observe(marqEl);
  gsap.fromTo('.moon', { y: 80, rotate: -40 }, { y: -20, rotate: 0, ease: 'none', scrollTrigger: { trigger: '#nobet', start: 'top bottom', end: 'bottom 40%', scrub: 0.5 } });
  revealText('.nobet__in .kicker, .nobet__in .h2, .nobet__in .lead, .nobet__in .btn');

  // Yorumlar
  gsap.from('.yorum__big', { yPercent: 40, scale: 0.7, ease: 'none', scrollTrigger: { trigger: '#yorumlar', start: 'top bottom', end: 'top 30%', scrub: 0.5 } });
  mm.add('(min-width: 900px)', () => {
    gsap.from('.card', { y: 90, rotate: (i) => (i % 2 ? 4 : -4), opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.cards', start: 'top 80%' } });
  });
  mm.add('(max-width: 899px)', () => {
    gsap.from('.card', { x: 120, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.cards', start: 'top 85%' } });
  });

  revealText('.ulasim__t > *');

  // Son: kelimeler tek tek oturur, kapsül yarıları birleşir.
  gsap.from('.son__h .wi', { yPercent: 110, rotate: 6, stagger: 0.06, duration: 0.9, ease: 'power4.out', scrollTrigger: { trigger: '#son', start: 'top 70%' } });
  gsap.from('.son__caps .cap__half--l', { xPercent: -140, rotate: -20, ease: 'none', scrollTrigger: { trigger: '#son', start: 'top bottom', end: 'center center', scrub: 0.5 } });
  gsap.from('.son__caps .cap__half--r', { xPercent: 140, rotate: 20, ease: 'none', scrollTrigger: { trigger: '#son', start: 'top bottom', end: 'center center', scrub: 0.5 } });

  addEventListener('load', () => ScrollTrigger.refresh());
}

function revealText(sel) {
  const els = $$(sel);
  if (!els.length) return;
  gsap.from(els, {
    y: 36, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: els[0], start: 'top 85%' },
  });
}
