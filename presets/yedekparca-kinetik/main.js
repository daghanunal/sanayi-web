import '../../shared/base.css';
import './style.css';
import raw from '../../data/depo.json';
import extra from '../../data/yedekparca-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, esc,
} from '../../shared/core.js';

// Kinetik aile: WebGL yok. İki renkli afiş baskısı: lacivert mürekkep, floresan pembe.
// Hareketin tamamı transform, opacity ve sınıf değişimi.
const d = boot({ ...raw, ...extra, preset: 'yedekparca-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

const up = (s) => String(s).toLocaleUpperCase('tr-TR');
const nf = (n) => Number(n).toLocaleString('tr-TR');
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = d.isletme.kurulus;
const yas = new Date().getFullYear() - yil;
const wa = (msg) => waHref(d, msg);

// "2003'ten", "1994'ten", "1990'dan": yılın okunuşuna göre ayrılma eki.
function denEki(n) {
  const s = String(n);
  const son = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const onlar = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return s + son[s.at(-1)];
  if (s.at(-2) !== '0') return s + onlar[s.at(-2)];
  return s + "'den";
}

// Afiş satırı: genişliğe oturan dev yazı; harfler ayrı ayrı çarpsın diye bölünür.
const line = (t, cls = '', vh = 0) =>
  `<span class="ln ${cls}"><span class="ln__in" data-fit${vh ? ` data-maxvh="${vh}"` : ''}>${[...up(t)].map((c) => `<span class="c">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</span></span>`;

const pairs = (a) => a.reduce((o, x, i) => (i % 2 ? (o[o.length - 1] += ' ' + x) : o.push(x), o), []);

// Masaüstü afişi: ilk iki kelime tek satır, sonrakiler kendi satırında (yüksekliğe göre sınırlı).
const heroD = (a) => (a.length > 3 ? [a[0] + ' ' + a[1], ...a.slice(2)] : a);

// --- Üst bar ---------------------------------------------------------------

const durum = openStatus(d.saatler);
$('#top').innerHTML = `
  <a class="top__brand" href="#hero">${esc(up(d.isletme.ad))}</a>
  <p class="top__status ${durum.open ? 'is-open' : ''}"><i></i><span>${durum.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Telefonla ara">${icons.phone}<span>${tel}</span></a>`;

// --- Hero --------------------------------------------------------------------

const tape = ['Şasi no', 'Doğru parça', 'Orijinal', 'Muadil', 'Aynı gün', 'Dükkânınıza kadar'].map((t) => `<span>${esc(up(t))}</span><i>●</i>`).join('');
$('#hero').innerHTML = `
  <div class="hero__in">
    <p class="hero__meta mono"><span>Şaşmaz Oto Sanayi</span><span>${esc(denEki(yil))} beri</span><span>Etimesgut</span></p>
    <h1 class="hero__title" id="hero-title" aria-label="${esc(d.hero.satirlar.join(' '))}">
      <span aria-hidden="true" class="only-m">${d.hero.satirlar.map((s, i) => line(s, i % 2 ? 'ln--pink' : '')).join('')}</span>
      <span aria-hidden="true" class="only-d">${heroD(d.hero.satirlar).map((s, i) => line(s, i % 2 ? 'ln--pink' : '', 0.22)).join('')}</span>
    </h1>
    <figure class="hero__photo" aria-hidden="true"><img src="${asset('/img/yedekparca-kinetik/disk-p.jpg')}" alt="" width="1400" height="933" fetchpriority="high" /></figure>
    <div class="hero__foot">
      <div>
        <p class="hero__ad">${ad}</p>
        <p class="hero__lead">${esc(d.isletme.slogan)}</p>
      </div>
      <div class="hero__cta">
        <a class="btn btn--pink" href="${wa(`Merhaba ${d.isletme.ad}, şasi numaramı gönderiyorum, parça bakar mısınız?`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Şasi no'yu gönder</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
      </div>
    </div>
  </div>
  <div class="tape" aria-hidden="true"><div class="tape__in">${tape}${tape}${tape}</div></div>`;

// --- Şasi numarası: imza -------------------------------------------------------

const V = d.vin;
const vinChars = [...V.ornek.toUpperCase()];
$('#sasi').innerHTML = `
  <div class="vin__stage">
    <header class="vin__head">
      <p class="mono">Parçayı nasıl buluruz</p>
      <h2 class="vin__title">${line(V.baslik)}</h2>
    </header>
    <div class="vin__code" role="img" aria-label="Örnek şasi numarası ${esc(V.ornek)}">
      ${V.gruplar.map((g, gi) => `
        <span class="vin__g" data-g="${gi}">${vinChars.slice(g.bas, g.son).map((c, k) => `<span class="vin__c" data-i="${g.bas + k}" data-v="${esc(c)}">${esc(c)}</span>`).join('')}</span>`).join('')}
    </div>
    <ol class="vin__labels">
      ${V.gruplar.map((g, i) => `
        <li class="vin__lab" data-g="${i}">
          <span class="mono">${g.bas + 1}–${g.son}. hane</span>
          <b>${esc(g.etiket)}</b>
          <span>${esc(g.metin)}</span>
        </li>`).join('')}
    </ol>
    <div class="vin__result" aria-live="off">
      <span class="vin__stamp">Eşleşti</span>
      <p class="mono">Raf ${esc(V.sonuc.raf)} · Stokta</p>
      <p class="vin__parca">${esc(up(V.sonuc.parca))}</p>
      <ul class="vin__opts"><li>Orijinal</li><li>Muadil</li><li>Aynı gün</li></ul>
      <p class="vin__detay">${esc(V.sonuc.detay)}. Sanayi içindeyseniz 45 dakikada dükkânınızda.</p>
    </div>
    <div class="vin__bar" aria-hidden="true"><i></i></div>
  </div>`;

// --- Süreç --------------------------------------------------------------------

$('#surec').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <p class="mono">Dört adım</p>
      <h2 class="h2">Numaradan dükkâna.</h2>
    </header>
    <ol class="steps">
      ${d.surec.map((s, i) => `
        <li class="step">
          <span class="step__no" aria-hidden="true"><span>${i + 1}</span></span>
          <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Katalog ------------------------------------------------------------------

$('#katalog').innerHTML = `
  <div class="wrap">
    <header class="sec-head">
      <p class="mono">Katalog · ${d.hizmetler.length} grup</p>
      <h2 class="h2">Rafta ne var?</h2>
      <p class="sec-head__p">Binek ve hafif ticari. Aradığınız grubu seçin, raf numarası ve stok aşağıda. Fiyatı parçayı göndermeden yazarız.</p>
    </header>
  </div>
  <ol class="kat">
    ${d.hizmetler.map((h, i) => `
      <li class="kat__row">
        <div class="kat__word" aria-hidden="true"><span class="kat__w" data-fit data-max="210">${esc(up(d.katalogKelime?.[i] || h.baslik.split(' ')[0]))}</span></div>
        <div class="wrap kat__body">
          <div class="kat__meta">
            <span class="tag">Raf ${esc(h.raf)}</span>
            <span class="mono"><b data-count="${Number(h.stok) || 0}">${nf(h.stok)}</b> kalem stokta</span>
          </div>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <ul class="chips">${h.ornekler.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
          <a class="kat__ask" href="${wa(`Merhaba ${d.isletme.ad}, ${h.baslik} (raf ${h.raf}) için parça soracağım.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu raftan sor</span></a>
        </div>
      </li>`).join('')}
  </ol>`;

// --- Teslimat: yatay afiş dizisi -------------------------------------------------

const T = d.teslimat;
$('#teslimat').innerHTML = `
  <div class="teslim__pin">
    <div class="teslim__track">
      <article class="panel panel--intro">
        <img src="${asset('/img/yedekparca-kinetik/kutu-arac-p.jpg')}" alt="Parça kutuları teslimat aracına yükleniyor" width="1400" height="933" loading="lazy" />
        <div class="panel__txt">
          <p class="mono">Teslimat</p>
          <h2 class="panel__h">${line('Parça', '', 0.15)}${line('size', '', 0.15)}${line('gelsin.', 'ln--pink', 0.15)}</h2>
        </div>
      </article>
      ${T.map((t, i) => `
        <article class="panel panel--${i % 3}">
          <p class="mono panel__no">0${i + 1} / 0${T.length}</p>
          <p class="panel__yer">${esc(t.yer)}</p>
          <p class="panel__sure">${up(t.sure).split(' ').map((w) => `<span class="w">${esc(w)}</span>`).join(' ')}</p>
          <p class="panel__not">${esc(t.not)}</p>
        </article>`).join('')}
    </div>
    <div class="teslim__rail" aria-hidden="true"><i></i></div>
  </div>`;

// --- Sayılar + hakkında -----------------------------------------------------------

const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yas : Number(s.deger) }));
$('#hakkimizda').innerHTML = `
  <div class="wrap">
    <p class="mono">Hakkımızda</p>
    <p class="about__lead" data-words>${esc(d.isletme.hakkinda)}</p>
    <ul class="stats">
      ${stats.map((s) => `
        <li class="stat">
          <p class="stat__n"><b data-count="${s.deger}">${nf(s.deger)}</b><span>${esc(s.sonek)}</span></p>
          <p class="stat__l">${esc(s.etiket)}</p>
        </li>`).join('')}
    </ul>
    <p class="about__garanti"><span class="tag tag--pink">Söz</span> ${esc(d.garanti)}</p>
  </div>`;

// --- Afişler -----------------------------------------------------------------------

$('#afis').innerHTML = `
  <div class="afis__grid">
    ${d.afisler.map((a, i) => `
      <figure class="poster poster--${i}">
        <div class="poster__img"><img src="${asset(a.src)}" alt="${esc(a.alt)}" width="1000" height="1250" loading="lazy" /></div>
        <figcaption>
          <span class="poster__w" data-fit data-max="190">${esc(up(a.kelime))}</span>
          <span class="poster__n mono">${esc(a.not)}</span>
        </figcaption>
      </figure>`).join('')}
  </div>`;

// --- Markalar ------------------------------------------------------------------------

const row = (arr) => arr.map((m) => `<span>${esc(up(m))}</span><i>/</i>`).join('');
$('#markalar').innerHTML = `
  <p class="wrap mono marka__l">Parçasını bulduğumuz araçlar</p>
  <div class="marq"><div class="marq__in">${row(d.markalar)}${row(d.markalar)}</div></div>
  <div class="marq marq--pink"><div class="marq__in">${row(d.parcaMarkalari)}${row(d.parcaMarkalari)}</div></div>
  <p class="wrap mono marka__l marka__l--r">Raftaki parça markaları</p>`;

// --- Yorumlar ----------------------------------------------------------------------

const P = d.puan;
const stars = (n) => `<span class="stars" aria-label="${n} yıldız">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="yorum__head">
      <p class="yorum__score"><b data-count="${P.ortalama}" data-dec="1">${String(P.ortalama).replace('.', ',')}</b></p>
      <div>
        ${stars(Math.round(P.ortalama))}
        <p class="mono">${nf(P.adet)} Google değerlendirmesi</p>
        <h2 class="h2">Ustalar ne diyor?</h2>
      </div>
    </header>
    <ul class="cards">
      ${d.yorumlar.map((y, i) => `
        <li class="card card--${i % 3}" style="--i:${i}">
          ${stars(y.puan)}
          <blockquote>“${esc(y.metin)}”</blockquote>
          <p class="card__who"><b>${esc(y.ad)}</b> <span class="mono">${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Dükkân ------------------------------------------------------------------------

$('#dukkan').innerHTML = `
  <div class="wrap dukkan__grid">
    <div>
      <p class="mono">Tezgâh</p>
      <p class="sign ${durum.open ? 'is-open' : ''}" aria-live="polite"><span class="sign__w">${durum.open ? 'AÇIK' : 'KAPALI'}</span><span class="sign__t">${esc(durum.text)}</span></p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        ${groupedHours(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
      </table>
      <p class="dukkan__adres">${esc(d.iletisim.adres)}</p>
      <div class="dukkan__cta">
        <a class="btn btn--pink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--line btn--light" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p class="mono">Harita yaklaşınca yüklenir</p></div>
  </div>`;

// --- Final ---------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <h2 class="final__title" aria-label="${esc(d.final.satirlar.join(' '))}"><span aria-hidden="true" class="only-m">${d.final.satirlar.map((s) => line(s)).join('')}</span>
      <span aria-hidden="true" class="only-d">${pairs(d.final.satirlar).map((s) => line(s)).join('')}</span></h2>
    <p class="final__p">${esc(d.final.metin)}</p>
    <div class="final__cta">
      <a class="btn btn--ink btn--xl" href="${wa(`Merhaba ${d.isletme.ad}, şasi numaramı gönderiyorum, parça bakar mısınız?`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
      <a class="btn btn--line btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    </div>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${esc(up(d.isletme.ad))}</p>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="mono foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar: Pexels.</p>
  </div>`;

// --- Harita: yaklaşınca yükle ---------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Yazıyı genişliğe oturt ---------------------------------------------------------------

function fitAll() {
  for (const el of $$('[data-fit]')) {
    const box = el.closest('.ln, .kat__word') ?? el.parentElement;
    el.style.fontSize = '100px';
    const w = el.scrollWidth;
    const avail = box.clientWidth;
    if (!w || !avail) continue;
    let fs = (avail / w) * 100 * 0.995;
    const max = Number(el.dataset.max);
    if (max) fs = Math.min(fs, max);
    const mvh = Number(el.dataset.maxvh);
    if (mvh) fs = Math.min(fs, innerHeight * mvh);
    el.style.fontSize = `${fs.toFixed(2)}px`;
  }
  // Teslim süreleri: en uzun kelime panele sığacak kadar büyük.
  for (const el of $$('.panel__sure')) {
    const cs = getComputedStyle(el.parentElement);
    const avail = el.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    el.style.setProperty('--fs', '100px');
    const widest = Math.max(...$$('.w', el).map((w) => w.getBoundingClientRect().width));
    const words = $$('.w', el).length;
    const cap = innerHeight * (words > 3 ? 0.12 : 0.24);
    if (widest && avail > 0) el.style.setProperty('--fs', `${Math.min(cap, (avail / widest) * 100 * 0.97).toFixed(1)}px`);
  }
}
fitAll();
let fitW = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - fitW) < 2) return;
  fitW = innerWidth;
  fitAll();
  ScrollTrigger.refresh();
});
document.fonts?.ready.then(() => { fitAll(); ScrollTrigger.refresh(); });

// --- Sayaç ----------------------------------------------------------------------------------

function countUp(el, dur = 1.3) {
  const to = Number(el.dataset.count);
  const dec = Number(el.dataset.dec || 0);
  const o = { v: 0 };
  gsap.to(o, {
    v: to, duration: dur, ease: 'power3.out',
    onUpdate: () => (el.textContent = dec ? o.v.toFixed(dec).replace('.', ',') : nf(Math.round(o.v))),
  });
}

// --- Şasi çözücü -------------------------------------------------------------------------------

const vin = $('#sasi');
const cells = $$('.vin__c');
const groups = $$('.vin__g');
const labs = $$('.vin__lab');
const POOL = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
let vinState = { locked: -1, g: -2, done: null };
function vinAt(p) {
  // 0.04–0.40: haneler soldan sağa kilitlenir
  const locked = Math.floor(gsap.utils.clamp(0, 1, (p - 0.04) / 0.36) * cells.length) - 1;
  const t = performance.now();
  cells.forEach((c, i) => {
    if (i <= locked) {
      if (c.classList.contains('is-lock')) return;
      c.textContent = c.dataset.v;
      c.classList.add('is-lock');
    } else {
      c.classList.remove('is-lock');
      c.textContent = POOL[(Math.floor(t / 60) * 7 + i * 13) % POOL.length];
    }
  });
  // 0.44–0.78: gruplar sırayla okunur
  const g = p < 0.44 ? -1 : p < 0.78 ? Math.min(groups.length - 1, Math.floor((p - 0.44) / 0.34 * groups.length)) : groups.length;
  if (g !== vinState.g) {
    groups.forEach((el, i) => { el.classList.toggle('is-on', i === g); el.classList.toggle('is-read', i < g); });
    labs.forEach((el, i) => { el.classList.toggle('is-on', i === g); el.classList.toggle('is-read', i < g); });
    vinState.g = g;
  }
  const done = p > 0.8;
  if (done !== vinState.done) {
    vin.classList.toggle('is-done', done);
    vinState.done = done;
  }
  vin.style.setProperty('--p', p.toFixed(3));
}

// --- Hareket ----------------------------------------------------------------------------------

if (reducedMotion) {
  vinAt(1);
  root.classList.add('is-in');
} else {
  const lenis = initSmoothScroll();
  const mobile = () => innerWidth < 900;

  // Açılış: satırlar harf harf aşağıdan çarpar, sonra fotoğraf ve bant.
  const heroChars = $$(innerWidth < 900 ? '#hero .only-m .ln' : '#hero .only-d .ln');
  const intro = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: () => root.classList.add('is-in') });
  heroChars.forEach((ln, i) => {
    intro.fromTo($$('.c', ln), { yPercent: 115 }, { yPercent: 0, duration: 0.8, stagger: 0.028 }, 0.1 + i * 0.12);
  });
  intro
    .fromTo('.hero__photo', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'expo.out' }, 0.45)
    .fromTo('.hero__meta span', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.5 }, 0.2)
    .fromTo('.hero__foot > *', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.7 }, 0.7)
    .fromTo('.tape', { yPercent: 120, rotate: 0 }, { yPercent: 0, rotate: -4, duration: 0.9 }, 0.8);

  // Kaydırınca satırlar iki yana açılır, fotoğraf büyür.
  const heroOut = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.5 };
  heroChars.forEach((ln, i) => {
    gsap.fromTo(ln.firstElementChild, { xPercent: 0 }, { xPercent: i % 2 ? 38 : -38, ease: 'none', immediateRender: false, scrollTrigger: heroOut });
  });
  gsap.fromTo('.hero__photo img', { scale: 1 }, { scale: 1.25, ease: 'none', scrollTrigger: heroOut });
  gsap.fromTo('.hero__photo', { rotate: 3 }, { rotate: -6, ease: 'none', scrollTrigger: heroOut });

  // Şasi: sahne sabitlenir, numara kaydırdıkça çözülür.
  vinAt(0);
  ScrollTrigger.create({
    trigger: vin, start: 'top top', end: () => `+=${innerHeight * (mobile() ? 2.6 : 2.4)}`, pin: '.vin__stage', scrub: true,
    onUpdate: (st) => vinAt(st.progress),
  });
  // Numara kilitlenmeden önce ekrana girince de biraz karışsın.
  let scr = 0;
  ScrollTrigger.create({
    trigger: vin, start: 'top bottom', end: 'top top',
    onUpdate: () => { if (++scr % 2 === 0) vinAt(0); },
  });
  gsap.fromTo('.vin__title .c', { yPercent: 115 }, {
    yPercent: 0, stagger: 0.02, ease: 'power4.out', duration: 0.8,
    scrollTrigger: { trigger: vin, start: 'top 70%', toggleActions: 'play none none reverse' },
  });

  // Süreç: rakamlar maskeden çıkar, dolar.
  $$('.step').forEach((s) => ScrollTrigger.create({
    trigger: s, start: 'top 78%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on'),
  }));

  // Katalog: dev kelime sağdan kayarak yerine oturur, eğimi düzelir.
  $$('.kat__row').forEach((r) => {
    const w = $('.kat__w', r);
    gsap.fromTo(w, { xPercent: 55, skewX: -14 }, {
      xPercent: 0, skewX: 0, ease: 'power2.out',
      scrollTrigger: { trigger: r, start: 'top bottom', end: 'top 45%', scrub: 0.4 },
    });
    const n = $('[data-count]', r);
    ScrollTrigger.create({ trigger: r, start: 'top 70%', once: true, onEnter: () => { r.classList.add('is-on'); countUp(n, 1.1); } });
  });

  // Teslimat: yatay afiş dizisi.
  const track = $('.teslim__track');
  const dist = () => track.scrollWidth - innerWidth;
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '#teslimat', start: 'top top', end: () => `+=${dist()}`, pin: '.teslim__pin', scrub: 0.5, invalidateOnRefresh: true,
      onUpdate: (st) => $('.teslim__rail i').style.transform = `scaleX(${st.progress.toFixed(3)})`,
    },
  });
  gsap.fromTo('.panel--intro .c', { yPercent: 115 }, {
    yPercent: 0, stagger: 0.025, ease: 'power4.out', duration: 0.8,
    scrollTrigger: { trigger: '#teslimat', start: 'top 65%', toggleActions: 'play none none reverse' },
  });

  // Hakkında: kelimeler okundukça koyulaşır.
  const lead = $('[data-words]');
  lead.innerHTML = lead.textContent.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ');
  gsap.fromTo(lead.children, { opacity: 0.15 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: lead, start: 'top 80%', end: 'bottom 50%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: '.stats', start: 'top 82%', once: true,
    onEnter: () => $$('.stats [data-count]').forEach((el, i) => countUp(el, 1.2 + i * 0.15)),
  });
  ScrollTrigger.create({
    trigger: '.yorum__score', start: 'top 85%', once: true,
    onEnter: () => countUp($('.yorum__score b'), 1),
  });

  // Afişler: fotoğraf içeride kayar, kelime ters yöne.
  $$('.poster').forEach((p, i) => {
    const st = { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo($('img', p), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: st });
    gsap.fromTo($('.poster__w', p), { xPercent: i % 2 ? -18 : 18 }, { xPercent: i % 2 ? 6 : -6, ease: 'none', scrollTrigger: st });
  });

  // Bölüm girişlerinde başlık çizgisi dolsun.
  $$('.sec-head, .yorum__head').forEach((h) => ScrollTrigger.create({
    trigger: h, start: 'top 80%', onEnter: () => h.classList.add('is-on'), onLeaveBack: () => h.classList.remove('is-on'),
  }));

  // Final: satırlar çarpar.
  gsap.fromTo('.final__title .c', { yPercent: 115 }, {
    yPercent: 0, stagger: 0.02, ease: 'power4.out', duration: 0.8,
    scrollTrigger: { trigger: '#iletisim', start: 'top 65%', toggleActions: 'play none none reverse' },
  });

  // Bant ve markalar: sürekli akar, kaydırma hızıyla hızlanır. Yalnızca ekrandayken.
  const loops = [
    { el: $('.tape__in'), dir: -1, sp: 0.7, sel: '#hero' },
    ...$$('.marq__in').map((el, i) => ({ el, dir: i % 2 ? 1 : -1, sp: 0.8, sel: '#markalar' })),
  ].map((m) => ({ ...m, x: 0, w: 0, vis: false }));
  const measure = () => loops.forEach((m) => (m.w = m.el.scrollWidth / (m.el === loops[0].el ? 3 : 2)));
  measure();
  addEventListener('resize', measure);
  loops.forEach((m) => ScrollTrigger.create({ trigger: m.sel, start: 'top bottom', end: 'bottom top', onToggle: (st) => (m.vis = st.isActive) }));
  gsap.ticker.add((t, dt) => {
    const v = Math.min(10, Math.abs(lenis?.velocity ?? 0));
    for (const m of loops) {
      if (!m.vis || !m.w) continue;
      m.x += m.dir * (m.sp + v * 0.8) * (dt / 16.7);
      if (m.x < -m.w) m.x += m.w;
      if (m.x > 0) m.x -= m.w;
      m.el.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0)`;
    }
  });

  addEventListener('load', () => { fitAll(); measure(); ScrollTrigger.refresh(); });
}
