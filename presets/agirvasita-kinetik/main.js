// Konvoy: Kinetik aile, ağır vasıta. WebGL yok. Sayfa bir otoyol yolculuğu:
// kaydırdıkça üst geçit levhası tepeden geçer, km sayacı Şaşmaz'a iner,
// hizmetler bir çekicinin çektiği dorseler olarak ekrandan akar.
import veri from '../../data/tonaj.json';
import ek from '../../data/agirvasita-kinetik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';

const d = boot({ ...veri, ...ek, preset: 'agirvasita-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const up = (s) => String(s).toLocaleUpperCase('tr-TR');
const yil = d.isletme.kurulus;
const yillar = new Date().getFullYear() - yil;
const mobil = () => innerWidth < 900;

// --- Metin ve bağlantılar ---------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
// Yıl için ayrılma eki: 1995'ten, 2000'den, 1990'dan.
function ten(n) {
  const s = String(n);
  if (s.endsWith('000') || s.endsWith('00')) return "'den";
  if (s.endsWith('0')) return { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" }[s.at(-2)];
  return { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" }[s.at(-1)];
}
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${yil}${ten(yil)} beri`;
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-years]').textContent = yillar;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-final]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = `${d.garanti} Onayınız olmadan ek iş yapmayız.`;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$$('[data-img]').forEach((img) => (img.src = d.gorsel[img.dataset.img]));
$('[data-yardim]').textContent = `${d.yolYardim} Servis aracımız yola çıkar, arızayı mümkünse yerinde gideririz.`;

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  if (!a.textContent.trim()) a.textContent = d.iletisim.telefon;
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
const telBig = $('[data-tel-big]');
telBig.href = telHref(d);
telBig.innerHTML = [...d.iletisim.telefon].map((c) => (c === ' ' ? '<i> </i>' : `<span>${esc(c)}</span>`)).join('');
telBig.setAttribute('aria-label', `Yol yardım hattı: ${d.iletisim.telefon}`);
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
const waK = $('[data-wa-konum]');
waK.href = waHref(d, `Merhaba ${d.isletme.ad}, yolda kaldım. Konumumu gönderiyorum.`);
waK.target = '_blank';
waK.rel = 'noopener';
waK.insertAdjacentHTML('afterbegin', icons.whatsapp);
$('[data-maps]').href = mapsHref(d);
$('[data-maps]').insertAdjacentHTML('afterbegin', icons.pin);

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`)
  .join('');

const mapEl = $('[data-map]');
new IntersectionObserver(
  (entries, io) => {
    if (!entries[0].isIntersecting) return;
    mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(mapEl);

// --- Hero: levhadaki ad -------------------------------------------------------

const heroAd = $('[data-hero-ad]');
heroAd.setAttribute('aria-label', d.isletme.ad);
const adKelime = up(d.isletme.ad).split(/\s+/).filter(Boolean);
// Telefonda her kelime bir satır; masaüstünde en fazla iki dengeli satır.
function adSatirlar() {
  if (mobil() || adKelime.length < 3) return adKelime;
  const top = adKelime.join(' ').length;
  let en = 1, fark = Infinity;
  for (let i = 1; i < adKelime.length; i++) {
    const f = Math.abs(adKelime.slice(0, i).join(' ').length - top / 2);
    if (f < fark) { fark = f; en = i; }
  }
  return [adKelime.slice(0, en).join(' '), adKelime.slice(en).join(' ')];
}
let adMod = null;
function adKur() {
  const m = mobil();
  if (adMod === m) return;
  adMod = m;
  heroAd.innerHTML = adSatirlar().map((k) => `<span class="hero__satir" aria-hidden="true">${esc(k)}</span>`).join('');
}

// Her satır levhanın iç genişliğini son (geniş) haliyle doldurur.
function adBoyutla() {
  adKur();
  const kutu = $('[data-hero-levha]');
  const w = kutu.clientWidth - parseFloat(getComputedStyle(kutu).paddingLeft) * 2;
  const maxH = mobil() ? innerHeight * 0.17 : innerHeight * 0.23;
  $$('.hero__satir', heroAd).forEach((s) => {
    s.style.transition = 'none';
    s.style.fontSize = '100px';
    s.style.fontStretch = '112%';
    const sw = s.getBoundingClientRect().width;
    s.style.fontSize = `${Math.min((100 * w) / sw, maxH)}px`;
    s.style.fontStretch = '';
    s.getBoundingClientRect();
    s.style.transition = '';
  });
}

// --- Şeritler ---------------------------------------------------------------

const serit = d.serit.map(up);
const seritHTML = (kaydir, cls) => {
  const dizi = [...serit.slice(kaydir), ...serit.slice(0, kaydir)];
  const parca = dizi.map((k) => `<span>${esc(k)}</span><b>•</b>`).join('');
  return `<div class="serit ${cls}"><div class="serit__ic">${parca}${parca}</div></div>`;
};
$('[data-seritler]').innerHTML = [
  seritHTML(0, 'serit--dolu'),
  '<div class="serit__cizgi"></div>',
  seritHTML(2, 'serit--bos'),
  '<div class="serit__cizgi"></div>',
  seritHTML(4, 'serit--adr'),
].join('');

// --- ADR plakaları ------------------------------------------------------------

$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const v = s.deger === 'kurulus' ? yillar : s.deger;
    return `<div class="plaka">
      <dd class="plaka__ust"><b data-say="${v}">${nf.format(v)}</b>${s.sonek ? `<small>${esc(s.sonek.trim())}</small>` : ''}</dd>
      <dt class="plaka__alt">${esc(s.etiket)}</dt>
    </div>`;
  })
  .join('');

// --- Konvoy -------------------------------------------------------------------

$('[data-konvoy-ust]').textContent = d.konvoy.ust;
$('[data-arka]').textContent = 'ANKARA → ŞAŞMAZ → ETİMESGUT → ANKARA → ŞAŞMAZ → ETİMESGUT';
$('[data-konvoy-baslik]').textContent = d.konvoy.baslik;
const teker = (cls = '') => `<span class="teker ${cls}" aria-hidden="true"><i></i></span>`;
const cekici = `
  <div class="cekici" aria-hidden="true">
    <div class="cekici__kabin">
      <span class="cekici__cam"></span>
      <span class="cekici__izgara"></span>
      <span class="cekici__far"></span>
      <span class="cekici__ad">${esc(up(d.isletme.ad))}</span>
    </div>
    <div class="cekici__sasi"></div>
    <div class="cekici__tekerler">${teker()}${teker()}${teker()}</div>
  </div>`;
$('[data-tren]').innerHTML =
  cekici +
  d.hizmetler
    .map(
      (h, i) => `
    <article class="dorse">
      <div class="dorse__kasa">
        <span class="dorse__no">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
        <span class="dorse__sure">${esc(h.sure)}</span>
      </div>
      <div class="dorse__alt" aria-hidden="true"><span class="dorse__bag"></span>${teker()}${teker()}${teker()}</div>
    </article>`
    )
    .join('');

// --- Levhalar (ölçüm) ------------------------------------------------------------

$('[data-levha-ust]').textContent = d.levha.ust;
$('[data-levha-baslik]').textContent = d.levha.baslik;
$('[data-levha-metin]').textContent = d.levha.metin;
$('[data-levha-not]').textContent = d.levha.not;
const hane = (v) => {
  const s = String(v);
  return s.includes('.') ? s.split('.')[1].length : 0;
};
const fmt = (v, h) => v.toLocaleString('tr-TR', { minimumFractionDigits: h, maximumFractionDigits: h });
$('[data-olcum]').innerHTML = d.alt
  .map((a) => {
    const o = a.olcum;
    const h = Math.max(hane(o.once), hane(o.sonra));
    return `
    <li class="olcum" data-once="${o.once}" data-sonra="${o.sonra}" data-iyi="${o.iyi}" data-ters="${o.ters ? 1 : 0}" data-h="${h}">
      <div class="isaret" aria-hidden="true">
        <div class="isaret__disk">
          <b class="isaret__deger" data-deger>${fmt(o.once, h)}</b>
          <small>${esc(o.birim)}</small>
        </div>
        <span class="isaret__onay">Uygun</span>
      </div>
      <div class="olcum__metin">
        <p class="etiket">${esc(a.durak)}</p>
        <h3>${esc(a.baslik)}</h3>
        <p>${esc(a.metin)}</p>
        <p class="olcum__degerler"><span>${esc(o.etiket)}</span> Gelişte <b>${fmt(o.once, h)}</b> · Teslimde <b class="yesil">${fmt(o.sonra, h)}</b> ${esc(o.birim)}</p>
      </div>
    </li>`;
  })
  .join('');

// --- Süreç: km direkleri --------------------------------------------------------

$('[data-steps]').innerHTML = d.surec
  .map(
    (s, i) => `
    <li class="kmdirek">
      <span class="kmdirek__levha"><small>KM</small><b>${esc(d.surecKm[i] ?? i)}</b></span>
      <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
    </li>`
  )
  .join('');

// --- Filo, takograf, markalar ---------------------------------------------------

$('[data-filo-baslik]').textContent = d.filo.baslik;
$('[data-filo-metin]').textContent = d.filo.metin;
$('[data-filo]').innerHTML = d.filo.maddeler
  .map((m) => `<li><span class="ok" aria-hidden="true">↑</span>${esc(m)}</li>`)
  .join('');
$('[data-tak-baslik]').textContent = d.takograf.baslik;
$('[data-tak-metin]').textContent = d.takograf.metin;
$('[data-brands]').innerHTML = d.markalar.map((m) => `<li>${esc(m)}</li>`).join('');

// --- Yorumlar -------------------------------------------------------------------

const puanStr = fmt(d.puan.ortalama, 1);
$('[data-puan]').innerHTML = `<b>${esc(puanStr)}</b><span>${icons.star.repeat(5)}</span>`;
$('[data-puan]').setAttribute('aria-label', `5 üzerinden ${puanStr}`);
$('[data-puan-alt]').textContent = `${nf.format(d.puan.adet)} değerlendirme, 5 üzerinden ${puanStr}.`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <blockquote class="yorum">
      <p class="yorum__yildiz" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
      <p class="yorum__metin">${esc(y.metin)}</p>
      <footer><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></footer>
    </blockquote>`
  )
  .join('');

// --- Hareket ----------------------------------------------------------------------

const kmEl = $('[data-km]');
const kmYaz = (p) => (kmEl.textContent = fmt(Math.max(0, d.yolKm * (1 - p)), 1));

document.fonts.ready.then(() => {
  adBoyutla();
  document.documentElement.classList.add('is-hazir');

  if (reducedMotion) {
    document.documentElement.classList.add('is-sabit');
    const kmSabit = () => kmYaz(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    kmSabit();
    addEventListener('scroll', kmSabit, { passive: true });
    return;
  }
  initSmoothScroll();

  // Açılış: ad dar başlar, çekici gibi uzar.
  gsap.from('.hero__satir', { y: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', delay: 0.1 });
  gsap.from('[data-hero-levha]', { rotateX: -24, transformOrigin: '50% 0%', duration: 1.1, ease: 'elastic.out(1, 0.55)' });
  gsap.from('.levha--hero .levha__ust, .levha--hero .levha__alt, .hero .hero__aks, .hero__ipucu', { opacity: 0, y: 14, duration: 0.6, stagger: 0.08, delay: 0.5 });

  // Km sayacı: tüm sayfa boyunca Şaşmaz'a iner.
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (s) => kmYaz(s.progress),
  });

  // Hero: levha yaklaşır, tepeden geçer; fotoğraf öne akar.
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.4 },
  })
    .to('[data-hero-levha]', { yPercent: -120, scale: 1.35, ease: 'power1.in' }, 0)
    .to('.hero .hero__aks, .hero__ipucu', { opacity: 0, y: -40, ease: 'none' }, 0)
    .to('.hero__foto img', { scale: 1.28, ease: 'none' }, 0)
    .to('.hero__serit', { backgroundPositionY: '600px', ease: 'none' }, 0);

  // Şeritler zıt yönlerde akar.
  $$('.serit').forEach((el, i) => {
    const ic = $('.serit__ic', el);
    const yon = i % 2 ? 1 : -1;
    gsap.fromTo(
      ic,
      { xPercent: yon < 0 ? 0 : -50 },
      {
        xPercent: yon < 0 ? -30 : -20,
        ease: 'none',
        scrollTrigger: { trigger: '.seritler', start: 'top bottom', end: 'bottom top', scrub: 0.3 },
      }
    );
  });
  gsap.from('.seritler__metin > *', {
    y: 40, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.seritler__metin', start: 'top 80%' },
  });

  // ADR plakaları: plakalar yukarı çakılır, rakamlar sayar.
  $$('.plaka').forEach((p, i) => {
    const b = $('[data-say]', p);
    const hedef = Number(b.dataset.say);
    const o = { v: 0 };
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 88%' } })
      .from(p, { y: 60, rotate: i % 2 ? 4 : -4, opacity: 0, duration: 0.7, ease: 'back.out(1.6)', delay: (i % 2) * 0.1 })
      .to(o, { v: hedef, duration: 1.1, ease: 'power2.out', onUpdate: () => (b.textContent = nf.format(Math.round(o.v))) }, 0.1);
  });

  // Konvoy: çekici dorseleri sürükler.
  const tren = $('[data-tren]');
  const asfalt = $('[data-asfalt]');
  const arka = $('[data-arka]');
  const mesafe = () => Math.max(0, tren.scrollWidth - innerWidth + (mobil() ? 32 : 120));
  const R = 22; // teker yarıçapı (px)
  gsap.to(tren, {
    x: () => -mesafe(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.konvoy',
      start: 'top top',
      end: () => `+=${mesafe() * (mobil() ? 1.1 : 0.9)}`,
      pin: '.konvoy__pin',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (s) => {
        const x = s.progress * mesafe();
        tren.style.setProperty('--don', `${(x / R) * 57.3}deg`);
        asfalt.style.transform = `translate3d(${-(x * 1.4) % 120}px,0,0)`;
        arka.style.transform = `translate3d(${-x * 0.35}px,0,0)`;
      },
    },
  });
  gsap.from('.konvoy__bas > *', {
    y: 30, opacity: 0, stagger: 0.1, duration: 0.7,
    scrollTrigger: { trigger: '.konvoy', start: 'top 70%' },
  });

  // Hız levhası gibi daire: rakam gelişten teslime döner.
  $$('.olcum').forEach((li) => {
    const once = Number(li.dataset.once);
    const sonra = Number(li.dataset.sonra);
    const iyi = Number(li.dataset.iyi);
    const ters = li.dataset.ters === '1';
    const h = Number(li.dataset.h);
    const el = $('[data-deger]', li);
    const o = { v: once };
    gsap.timeline({
      scrollTrigger: { trigger: li, start: 'top 78%', end: 'center 42%', scrub: 0.4 },
    })
      .from($('.isaret', li), { scale: 0.55, rotate: -90, ease: 'power2.out', duration: 0.4 }, 0)
      .to(o, {
        v: sonra,
        ease: 'power1.inOut',
        duration: 1,
        onUpdate: () => {
          el.textContent = fmt(o.v, h);
          li.classList.toggle('is-iyi', ters ? o.v <= iyi : o.v >= iyi);
        },
      }, 0.2)
      .from($('.olcum__metin', li), { x: mobil() ? 0 : 60, y: mobil() ? 30 : 0, opacity: 0, duration: 0.4 }, 0);
  });

  // Yol yardım: numara haneleri çakılır, km direkleri dizilir.
  gsap.from('[data-tel-big] span', {
    yPercent: 110, opacity: 0, stagger: 0.04, duration: 0.5, ease: 'back.out(2)',
    scrollTrigger: { trigger: '[data-tel-big]', start: 'top 85%' },
  });
  gsap.from('.yardim__baslik', {
    fontStretch: '62%', opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.yardim__baslik', start: 'top 85%' },
  });
  gsap.fromTo('.kmler', { '--yol': 0 }, {
    '--yol': 1, ease: 'none',
    scrollTrigger: { trigger: '.kmler', start: 'top 75%', end: 'bottom 60%', scrub: 0.4 },
  });
  $$('.kmdirek').forEach((k) =>
    gsap.from(k, { x: -30, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: k, start: 'top 82%' } })
  );

  // Filo: fotoğraf yavaş akar, levha yükselir.
  gsap.fromTo('.filo__foto img', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.filo', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.from('.levha--filo', {
    y: 80, rotateX: 20, opacity: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.levha--filo', start: 'top 85%' },
  });
  gsap.from('.filo__maddeler li', {
    x: -20, opacity: 0, stagger: 0.08, duration: 0.5,
    scrollTrigger: { trigger: '.filo__maddeler', start: 'top 85%' },
  });

  gsap.from('.markalar li', {
    y: 20, opacity: 0, stagger: 0.04, duration: 0.4,
    scrollTrigger: { trigger: '.markalar', start: 'top 90%' },
  });
  gsap.from('.yorum', {
    x: 60, opacity: 0, stagger: 0.1, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: '.yorumlar__serit', start: 'top 85%' },
  });

  // Çıkış levhası: yaklaşırken büyür.
  gsap.fromTo('.levha--cikis', { scale: 0.8, y: 40 }, {
    scale: 1, y: 0, ease: 'power2.out',
    scrollTrigger: { trigger: '.konum', start: 'top bottom', end: 'top 35%', scrub: 0.4 },
  });

  // Final: başlık genişler.
  gsap.fromTo('.final__baslik', { fontStretch: '62%' }, {
    fontStretch: '125%', ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top 80%', end: 'center center', scrub: 0.4 },
  });
  gsap.fromTo('.final__img', { scale: 1.2 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });

  let w = innerWidth;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - w) < 2) return; // mobil adres çubuğu
    w = innerWidth;
    adBoyutla();
    ScrollTrigger.refresh();
  });
});
