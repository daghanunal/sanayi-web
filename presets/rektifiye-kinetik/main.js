// Talaş: Kinetik aile, rektifiye. WebGL yok. Açılışta işletme adı tornadaki iş parçası gibi döner,
// kalem geçtikçe kaba harfler ölçüsüne iner. Sonra mikrometre gibi dönen büyütme ölçüleri,
// dev fiillerle afiş gibi süreç ve tolerans bandına düşen ölçü raporu.
import mikron from '../../data/mikron.json';
import ek from '../../data/rektifiye-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';

const d = boot({ ...mikron, ...ek, preset: 'rektifiye-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const upper = (s) => s.toLocaleUpperCase('tr-TR');
const yil = d.isletme.kurulus;
const yillar = new Date().getFullYear() - yil;
const ekler = (y) => {
  // 1989'dan, 2004'ten, 1990'dan: son okunan sözcüğe göre ayrılma eki
  const BIR = ['', "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const ON = ['', "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return BIR[y % 10];
  if (y % 100) return ON[(y % 100) / 10];
  return "'den";
};
const num = (s) => Number(String(s).replace(',', '.'));
const virgul = (n, k) => n.toLocaleString('tr-TR', { minimumFractionDigits: k, maximumFractionDigits: k });

// --- Metin ve bağlantılar ----------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${yil}${ekler(yil)} beri`;
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-hero-not]').textContent = d.heroNot;
$('[data-fiyat-not]').textContent = d.fiyatNot;
$('[data-final]').textContent = d.finalBaslik;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
$('[data-maps]').href = mapsHref(d);
$('[data-maps]').insertAdjacentHTML('afterbegin', icons.pin);

const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.open ? 'Açık' : 'Kapalı';
  el.classList.toggle('is-open', st.open);
});
$('[data-status-buyuk]').innerHTML = `<i></i>${esc(st.text)}`;
$('[data-status-buyuk]').classList.toggle('is-open', st.open);
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

// --- 1. Açılış: iş parçaları ------------------------------------------------

const parcaKutu = $('[data-parca]');
const kelimeler = upper(d.isletme.ad).split(/\s+/).filter(Boolean).slice(0, 4);
parcaKutu.innerHTML = kelimeler
  .map(
    (k) => `
    <div class="parca">
      <span class="parca__ayna"></span>
      <span class="parca__kaba"></span>
      <div class="parca__govde">
        <span class="parca__doku"></span>
        <span class="parca__yazi">${[...k].map((c) => `<span class="h">${esc(c)}</span>`).join('')}</span>
        <span class="parca__isik"></span>
      </div>
      <span class="parca__punta"></span>
      <span class="kalem"><svg viewBox="0 0 40 60"><path d="M20 0 L34 22 L6 22 Z" class="kalem__uc"/><rect x="8" y="22" width="24" height="38" class="kalem__sap"/></svg></span>
    </div>`
  )
  .join('');

function parcaBoyutla() {
  const parcalar = $$('.parca', parcaKutu);
  const genis = parcaKutu.clientWidth;
  const yuk = innerHeight * (innerWidth < 700 ? 0.34 : 0.4);
  parcalar.forEach((p) => {
    const yazi = $('.parca__yazi', p);
    yazi.style.fontSize = '100px';
    const w = yazi.scrollWidth;
    const hedef = $('.parca__govde', p).clientWidth * 0.9;
    let fs = (100 * hedef) / w;
    fs = Math.min(fs, yuk / parcalar.length / 1.24);
    yazi.style.fontSize = `${fs}px`;
  });
}
parcaBoyutla();
document.fonts?.ready.then(parcaBoyutla);
addEventListener('resize', () => {
  parcaBoyutla();
});

// Talaş kıvrımları: az sayıda SVG spiral, kalemin ucundan fırlar.
const talasKutu = $('[data-talas]');
const SPIRAL = `<svg viewBox="0 0 40 40"><path d="M20 20 m0 -2 a2 2 0 1 1 -2 2 a5 5 0 1 1 5 5 a9 9 0 1 1 -9 -9 a13 13 0 1 1 13 13"/></svg>`;
function talasAt(x, y, adet = 3) {
  if (reducedMotion) return;
  for (let i = 0; i < adet; i++) {
    const el = document.createElement('span');
    el.className = 'talas__k';
    el.innerHTML = SPIRAL;
    talasKutu.append(el);
    const s = 0.5 + Math.random() * 0.9;
    gsap.fromTo(
      el,
      { x, y, scale: s * 0.4, rotation: Math.random() * 360, opacity: 1 },
      {
        x: x + (Math.random() * 120 - 30),
        y: y + 140 + Math.random() * 220,
        rotation: `+=${400 + Math.random() * 500}`,
        scale: s,
        opacity: 0,
        duration: 1.1 + Math.random() * 0.7,
        ease: 'power2.in',
        onComplete: () => el.remove(),
      }
    );
  }
}

const heroCap = $('[data-hero-cap]');
const heroEtiket = $('[data-hero-etiket]');
const hedefCap = num(d.rapor?.nominal ?? '75,25');
const hamCap = Math.floor(hedefCap);
$('[data-alinan]').textContent = `çaptan ${virgul(hedefCap - hamCap, 2)} mm alındı · tolerans ±0,005`;

function acilis() {
  const parcalar = $$('.parca', parcaKutu);
  const heroAlt = $$('.hero__alt > *');
  if (reducedMotion) {
    $$('.h', parcaKutu).forEach((h) => h.classList.add('is-islendi'));
    $$('.parca__kaba', parcaKutu).forEach((k) => (k.style.display = 'none'));
    heroCap.textContent = virgul(hedefCap, 3);
    heroEtiket.textContent = d.rapor?.olcuSinifi ?? 'ölçüsünde';
    return;
  }
  const tl = gsap.timeline({ delay: 0.25 });
  tl.from(parcalar, { xPercent: -104, duration: 0.8, ease: 'power3.out', stagger: 0.12 });
  tl.from('.hero__ust', { y: 12, opacity: 0, duration: 0.5 }, 0.2);
  parcalar.forEach((p, pi) => {
    const kalem = $('.kalem', p);
    const govde = $('.parca__govde', p);
    const harfler = $$('.h', p);
    const bas = 0.75 + pi * 0.95;
    const sure = 1.1;
    const g = govde.offsetWidth;
    const x0 = govde.offsetLeft;
    tl.set(kalem, { opacity: 1, x: x0 - 20 }, bas - 0.15);
    tl.to(kalem, { x: x0 + g + 10, duration: sure, ease: 'none' }, bas);
    tl.fromTo($('.parca__kaba', p), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 100%)', duration: sure, ease: 'none' }, bas);
    tl.to(kalem, { opacity: 0, y: 30, duration: 0.3 }, bas + sure);
    harfler.forEach((h) => {
      const oran = (h.offsetLeft + h.offsetWidth / 2) / g;
      tl.call(
        () => {
          h.classList.add('is-islendi');
          const r = h.getBoundingClientRect();
          const hr = $('.hero').getBoundingClientRect();
          talasAt(r.left + r.width / 2 - hr.left, r.bottom - hr.top, 2);
        },
        null,
        bas + oran * sure
      );
    });
  });
  const son = 0.75 + parcalar.length * 0.95 + 0.2;
  const sayac = { v: hamCap };
  tl.to(
    sayac,
    {
      v: hedefCap,
      duration: son - 0.9,
      ease: 'power1.inOut',
      onUpdate: () => (heroCap.textContent = virgul(sayac.v, 3)),
      onComplete: () => {
        heroEtiket.textContent = d.rapor?.olcuSinifi ?? 'ölçüsünde';
        heroEtiket.classList.add('is-tamam');
      },
    },
    0.9
  );
  tl.from('.hero__olcuok', { scaleX: 0, opacity: 0, duration: 0.6, ease: 'power3.out' }, son - 0.2);
  tl.from(heroAlt, { y: 24, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 1.2);
}

// Görünmüyorken dönme dokusu dursun.
new IntersectionObserver((e) => $('.hero').classList.toggle('is-durdu', !e[0].isIntersecting)).observe($('.hero'));

// --- 2. Hakkında: kelime kelime dolar ------------------------------------------

$('[data-hakkinda]').innerHTML = d.isletme.hakkinda
  .split(/\s+/)
  .map((w) => `<span class="k${/ölç/i.test(w) ? ' k--vurgu' : ''}">${esc(w)}</span>`)
  .join(' ');

// --- 3. Büyütme ölçüleri: mikrometre rakamları ---------------------------------

const olculer = d.olculer?.length ? d.olculer : [{ ad: 'Standart', cap: 75, piston: 'STD' }];
const mikro = $('[data-mikro]');
// "75,00" biçimi: 2 tam hane, virgül, 2 ondalık
const HANE = [1000, 100, null, 10, 1]; // yüzde birlik birimde basamak değeri
mikro.innerHTML =
  `<span class="mikro__on">Ø</span>` +
  HANE.map((p) =>
    p === null
      ? `<span class="mikro__virgul">,</span>`
      : `<span class="mikro__hane"><span class="mikro__serit">${'01234567890'.split('').map((c) => `<span>${c}</span>`).join('')}</span></span>`
  ).join('') +
  `<span class="mikro__birim mono">mm</span>`;
const seritler = $$('.mikro__serit', mikro);
const haneDeger = HANE.filter((p) => p !== null);
mikro.setAttribute('aria-label', `${virgul(olculer[0].cap, 2)} mm`);

function mikroYaz(v) {
  const u = Math.round(v * 100 * 1000) / 1000; // yüzde birlik
  seritler.forEach((s, i) => {
    const P = haneDeger[i];
    const rakam = Math.floor(u / P) % 10;
    let ofs;
    if (P === 1) ofs = u % 10;
    else {
      const alt = u % P;
      ofs = rakam + (alt > P - 1 ? alt - (P - 1) : 0);
    }
    s.style.transform = `translate3d(0, ${(-ofs / 11) * 100}%, 0)`;
  });
}

$('[data-olcu-liste]').innerHTML = olculer
  .map((o, i) => `<li data-i="${i}"><b>${esc(o.piston)}</b><span>${esc(virgul(o.cap, 2))}</span></li>`)
  .join('');
const olcuLi = $$('[data-olcu-liste] li');
const olcuAd = $('[data-olcu-ad]');
const olcuPiston = $('[data-olcu-piston]');
const kovan = $('[data-kovan]');
{
  let cizgi = '';
  for (let i = 0; i <= 200; i++) cizgi += `<i class="${i % 5 === 0 ? 'u' : ''}"></i>`;
  kovan.innerHTML = cizgi;
}
const dYuva = $('.d-yuva');
const dPiston = $('.d-piston');
let aktif = -1;
function buyutmeYaz(p) {
  const n = olculer.length - 1;
  const seg = Math.min(Math.floor(p), n - 1 < 0 ? 0 : n - 1);
  const f = n <= 0 ? 0 : Math.min(1, Math.max(0, p - seg));
  const e0 = Math.min(1, Math.max(0, (f - 0.3) / 0.4));
  const e = e0 * e0 * (3 - 2 * e0);
  const a = olculer[seg];
  const b = olculer[Math.min(seg + 1, n)];
  const v = a.cap + (b.cap - a.cap) * e;
  mikroYaz(v);
  const fark = v - olculer[0].cap;
  dYuva.setAttribute('r', (70 + fark * 18).toFixed(2));
  dPiston.setAttribute('r', (62 + fark * 18).toFixed(2));
  kovan.style.transform = `translate3d(${-fark * 400}px,0,0)`;
  const idx = e > 0.5 ? Math.min(seg + 1, n) : seg;
  if (idx !== aktif) {
    aktif = idx;
    olcuAd.textContent = olculer[idx].ad;
    olcuPiston.textContent = `Piston ${olculer[idx].piston}`;
    olcuLi.forEach((li, i) => li.classList.toggle('is-aktif', i === idx));
    mikro.setAttribute('aria-label', `${virgul(olculer[idx].cap, 2)} mm`);
  }
}
buyutmeYaz(0);

// --- 4. Hizmetler ----------------------------------------------------------------

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h, i) => `
    <li class="hizmet">
      <span class="hizmet__no mono">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
      <div class="hizmet__olcu mono"><b>${esc(h.tolerans ?? '')}</b><span>${esc(h.sure)}</span></div>
      <p class="hizmet__metin">${esc(h.aciklama)}</p>
    </li>`
  )
  .join('');

// --- 5. Süreç: afişler ------------------------------------------------------------

const gorseller = d.surecGorsel?.length ? d.surecGorsel : d.galeri;
$('[data-steps]').innerHTML = d.surec
  .map((s, i) => {
    const g = gorseller[i % gorseller.length];
    const fiil = d.surecKelime?.[i] ?? upper(s.baslik.split(' ')[0]);
    return `
    <article class="adim adim--${i % 2 ? 'ters' : 'duz'}">
      <div class="adim__foto"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></div>
      <p class="adim__fiil" aria-hidden="true"><span>${esc(fiil)}</span></p>
      <div class="adim__kart">
        <p class="etiket mono">04 / Adım ${i + 1} / ${d.surec.length}</p>
        <h3>${esc(s.baslik)}</h3>
        <p>${esc(s.aciklama)}</p>
      </div>
    </article>`;
  })
  .join('');

// --- 6. Ölçü raporu ---------------------------------------------------------------

const r = d.rapor;
if (r) {
  const nominal = num(r.nominal);
  $('[data-rapor-is]').textContent = r.is;
  $('[data-rapor-sinif]').textContent = r.olcuSinifi;
  $('[data-rapor-nominal]').textContent = r.nominal;
  const TOL = 0.005;
  const ARALIK = 0.007;
  const pos = (dev) => 50 + (dev / ARALIK) * 50;
  $('.rapor__tol').style.cssText = `left:${pos(-TOL)}%;right:${100 - pos(TOL)}%`;
  $('[data-bant]').insertAdjacentHTML(
    'beforeend',
    r.silindirler
      .map((s, i, all) => {
        const dev = num(s.olcu) - nominal;
        const top = all.length > 1 ? 18 + (i * 64) / (all.length - 1) : 50;
        return `<span class="rapor__nokta" style="left:${pos(Math.max(-ARALIK, Math.min(ARALIK, dev))).toFixed(2)}%;top:${top.toFixed(1)}%"><b>${esc(s.no)}</b></span>`;
      })
      .join('')
  );
  $('[data-rapor-satir]').innerHTML = r.silindirler
    .map((s) => {
      const dev = num(s.olcu) - nominal;
      const ok = Math.abs(dev) <= TOL + 1e-9;
      return `<tr><td>${esc(s.no)}</td><td data-karistir="${esc(s.olcu)}">${esc(s.olcu)}</td><td data-karistir="${esc(s.ovalite)}">${esc(s.ovalite)}</td><td class="${ok ? 'ok' : 'nok'}">${ok ? 'Ölçüde' : 'Dışında'}</td></tr>`;
    })
    .join('');
  $('[data-rapor-not]').innerHTML = [r.krank && `Krank: ${r.krank}`, r.planya && `Planya: ${r.planya}`]
    .filter(Boolean)
    .map((t) => `<li>${esc(t)}</li>`)
    .join('');
} else {
  $('.rapor').remove();
}

// --- 7. Rakamlar -----------------------------------------------------------------

$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const v = s.kurulustanHesapla ? yillar : s.deger;
    return `<div class="rakam"><dd><b data-say="${v}">${nf.format(v)}</b><span>${esc(s.sonek)}</span></dd><dt>${esc(s.etiket)}</dt><svg class="rakam__ok" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5H100M0 0V10M100 0V10"/></svg></div>`;
  })
  .join('');

// --- 8. Motor bantları -----------------------------------------------------------

const markaHTML = d.markalar.map((m) => `<span>${esc(m)}</span><i>✕</i>`).join('');
$('[data-brands]').innerHTML = markaHTML + markaHTML;
const hizHTML = d.hizmetler.map((h) => `<span>${esc(upper(h.baslik))}</span><i>/</i>`).join('');
$('[data-brands2]').innerHTML = hizHTML + hizHTML;

// --- 9. Yorumlar -------------------------------------------------------------------

const puanStr = virgul(d.puan.ortalama, 1);
$('[data-puan]').textContent = puanStr;
$('[data-puan]').setAttribute('aria-label', `5 üzerinden ${puanStr}`);
$('[data-puan-yildiz]').innerHTML = icons.star.repeat(5);
$('[data-puan-alt]').textContent = `${nf.format(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <blockquote class="yorum">
      <p class="yorum__yildiz" aria-label="${esc(y.puan)} yıldız">${icons.star.repeat(Math.max(0, Math.min(5, y.puan)))}</p>
      <p class="yorum__metin">${esc(y.metin)}</p>
      <footer><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></footer>
    </blockquote>`
  )
  .join('');

// --- Final başlığı harflere ---------------------------------------------------------

const finalEl = $('[data-final]');
finalEl.setAttribute('aria-label', d.finalBaslik);
finalEl.innerHTML = d.finalBaslik
  .split(' ')
  .map((w) => `<span class="fk" aria-hidden="true">${[...w].map((c) => `<span class="fh">${esc(c)}</span>`).join('')}</span>`)
  .join(' ');

// --- Hareket -------------------------------------------------------------------------

initSmoothScroll();
acilis();

if (reducedMotion) {
  $$('.k').forEach((k) => k.classList.add('is-dolu'));
  $$('.hizmet').forEach((h) => h.classList.add('is-in'));
} else {
  const mm = gsap.matchMedia();

  // Açılıştan sonra parçalar zıt yönlere kayar.
  $$('.parca').forEach((p, i) => {
    gsap.to(p, {
      xPercent: i % 2 ? 9 : -9,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  // Hakkında: kelimeler kaydırdıkça dolar.
  const kelime = $$('.okuma .k');
  ScrollTrigger.create({
    trigger: '.okuma__metin',
    start: 'top 80%',
    end: 'bottom 45%',
    onUpdate: (self) => {
      const n = Math.round(self.progress * kelime.length);
      kelime.forEach((k, i) => k.classList.toggle('is-dolu', i < n));
    },
  });

  // Büyütme: sabitlenir, ölçüler sırayla döner.
  const adimSay = Math.max(1, olculer.length - 1);
  ScrollTrigger.create({
    trigger: '.buyutme',
    start: 'top top',
    end: `+=${adimSay * 80}%`,
    pin: '.buyutme__sahne',
    scrub: 0.4,
    onUpdate: (self) => buyutmeYaz(self.progress * adimSay),
  });

  // Hizmet başlıkları dar hâlden açılır (font genişliği).
  ScrollTrigger.batch('.hizmet', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), i * 90)),
  });

  // Süreç: dev fiil yatayda akar, foto yavaşça iner.
  $$('.adim').forEach((a, i) => {
    const yon = i % 2 ? 1 : -1;
    gsap.fromTo(
      $('.adim__fiil span', a),
      { xPercent: -yon * 18 },
      { xPercent: yon * 28, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom top', scrub: true } }
    );
    gsap.fromTo(
      $('.adim__foto img', a),
      { yPercent: -8, scale: 1.12 },
      { yPercent: 8, scale: 1.02, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom top', scrub: true } }
    );
    gsap.from($('.adim__kart', a), {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: a, start: 'top 55%' },
    });
  });

  // Rapor: noktalar banda düşer, rakamlar karışıp yerine oturur.
  if (r) {
    gsap.from('.rapor__nokta', {
      y: -60,
      opacity: 0,
      duration: 0.7,
      ease: 'bounce.out',
      stagger: 0.15,
      scrollTrigger: { trigger: '.rapor__bant', start: 'top 80%' },
    });
    gsap.from('.rapor__tol', {
      scaleX: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.rapor__bant', start: 'top 80%' },
    });
    ScrollTrigger.create({
      trigger: '.rapor__tablo',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        $$('[data-karistir]').forEach((el, i) => {
          const hedef = el.dataset.karistir;
          let n = 0;
          const t = setInterval(() => {
            n++;
            if (n > 10 + i) {
              el.textContent = hedef;
              clearInterval(t);
            } else el.textContent = hedef.replace(/\d/g, () => (Math.random() * 10) | 0);
          }, 45);
        });
      },
    });
  }

  // Rakamlar sayar, ölçü okları çizilir.
  $$('.rakam').forEach((el) => {
    const b = $('[data-say]', el);
    const v = Number(b.dataset.say);
    const o = { v: 0 };
    gsap.to(o, {
      v,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => (b.textContent = nf.format(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
    gsap.from($('.rakam__ok', el), { scaleX: 0, duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  // Bantlar görünürken akar.
  new IntersectionObserver((e) => $('.bantlar').classList.toggle('is-akiyor', e[0].isIntersecting)).observe($('.bantlar'));

  // Final: harfler tornadan çıkar gibi yerine oturur.
  gsap.from('.fh', {
    yPercent: 110,
    rotateX: -70,
    opacity: 0,
    duration: 0.7,
    ease: 'back.out(1.6)',
    stagger: 0.025,
    scrollTrigger: { trigger: '.final', start: 'top 70%' },
  });

  mm.add('(min-width: 900px)', () => {
    gsap.from('.puan__sayi', { xPercent: -30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.yorumlar', start: 'top 75%' } });
  });
}
