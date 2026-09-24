// Desibel: Kinetik aile, egzoz. 3D yok. Sayfa bir konser afişi gibi: dev harfler, çift renk fotoğraf,
// ve imza anında "GÜRÜLTÜ" kelimesi kaydırdıkça susar, yerine "SESSİZ" oturur.
import manifold from '../../data/manifold.json';
import ek from '../../data/egzoz-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';

const d = boot({ ...manifold, ...ek, preset: 'egzoz-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const upper = (s) => s.toLocaleUpperCase('tr-TR');
const yil = d.isletme.kurulus;
const yillar = new Date().getFullYear() - yil;
const mobil = matchMedia('(max-width: 899px)').matches;

// "1998'den", "2004'ten": ek, yılın okunuşundaki son kelimeye göre.
function tonDen(y) {
  const B = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const O = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  const n = Number(y);
  const son = n % 10 ? B[n % 10] : n % 100 ? O[(n / 10) % 10 | 0] : n % 1000 ? 'yüz' : 'bin';
  const unlu = [...son].reverse().find((c) => 'aeıioöuü'.includes(c));
  return `'${'çfhkpsşt'.includes(son.at(-1)) ? 't' : 'd'}${'aıou'.includes(unlu) ? 'a' : 'e'}n`;
}

// --- Metin ve bağlantılar ------------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${yil}${tonDen(yil)} beri egzoz`;
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-garanti]').textContent = `Ölçmeden parça değiştirmeyiz. ${d.garanti}`;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

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
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, s]) => `<div><dt>${esc(g)}</dt><dd class="${s === 'Kapalı' ? 'kapali' : ''}">${esc(s)}</dd></div>`)
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

// --- Afiş: isim satır satır, her satır genişliği tam dolduracak boyda ---------------

const harfler = (s, cls = 'h') =>
  [...s].map((c) => (c === ' ' ? '<span class="bosluk"> </span>' : `<span class="${cls}"><span>${esc(c)}</span></span>`)).join('');

const afis = $('[data-afis]');
afis.setAttribute('aria-label', d.isletme.ad);
// Kelimeleri en fazla iki satıra, harf sayısı dengeli olacak şekilde dağıt.
function satirla(ad) {
  const k = upper(ad).split(/\s+/).filter(Boolean);
  if (k.length < 3) return k;
  let enIyi = [k.join(' ')];
  let fark = Infinity;
  for (let i = 1; i < k.length; i++) {
    const a = k.slice(0, i).join(' ');
    const b = k.slice(i).join(' ');
    const f = Math.abs(a.length - b.length);
    if (f < fark) { fark = f; enIyi = [a, b]; }
  }
  return enIyi;
}
const kelimeler = satirla(d.isletme.ad);
afis.innerHTML = kelimeler.map((k, i) => `<span class="afis__satir" data-i="${i}" aria-hidden="true">${harfler(k)}</span>`).join('');

// Bir satırı kapsayıcı genişliğine yay. Çok kısa kelimeler aşırı büyümesin.
function sigdir(el, max) {
  el.style.fontSize = '100px';
  const w = el.scrollWidth;
  const hedef = el.parentElement.clientWidth;
  el.style.fontSize = `${Math.min((100 * hedef) / w, max)}px`;
}
function afisBoyutla() {
  const max = mobil ? innerHeight * 0.16 : innerHeight * 0.27;
  $$('.afis__satir', afis).forEach((s) => sigdir(s, max));
  $$('.final__satir').forEach((s) => sigdir(s, max * 1.1));
  $$('.ses__kelime').forEach((s) => sigdir(s, innerHeight * 0.3));
}

// Hero altındaki ses dalgası: CSS ile animasyonlu çubuklar.
{
  const n = mobil ? 36 : 72;
  let h = '';
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const zarf = 0.25 + 0.75 * Math.sin(Math.PI * t) ** 1.4;
    h += `<i style="--h:${(zarf * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7)))).toFixed(2)};--g:${((i * 37) % 11) * -0.09}s"></i>`;
  }
  $('[data-dalga]').innerHTML = h;
}

// --- İmza: GÜRÜLTÜ → SESSİZ ------------------------------------------------------

const G = d.gurultu;
$('[data-gurultu]').innerHTML = harfler(G.once, 'g');
$('[data-sessiz]').innerHTML = harfler(G.sonra, 'g');
$('[data-sinir]').textContent = G.sinir_db;
$('[data-ses-baslik]').textContent = G.baslik;
$('[data-ses-metin]').textContent = G.metin;
const DB0 = 60;
const DB1 = 110;
const dbOran = (v) => (v - DB0) / (DB1 - DB0);
$('[data-sinir-cizgi]').style.left = `${dbOran(G.sinir_db) * 100}%`;

// --- Egzoz hattı ------------------------------------------------------------------

$('[data-hat]').innerHTML = d.yolculuk
  .map(
    (y, i) => `
    <li class="durak">
      <p class="durak__dev" aria-hidden="true"><span>${esc(upper(y.durak))}</span></p>
      <div class="durak__ic">
        <p class="durak__no mono">${String(i + 1).padStart(2, '0')} / ${String(d.yolculuk.length).padStart(2, '0')} · ${esc(y.durak)}</p>
        <h3 class="durak__baslik">${esc(y.baslik)}</h3>
        <p class="durak__metin">${esc(y.metin)}</p>
        <a class="durak__sor" href="${waHref(d, `Merhaba, ${y.hizmet} için bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(y.hizmet)} için sor</span></a>
      </div>
    </li>`
  )
  .join('');

// --- Muayene ölçümü -----------------------------------------------------------------

$('[data-rapor-baslik]').textContent = 'Muayeneden kalan araç, bir saat sonra.';
const ondalik = (v) => (Number.isInteger(v) ? 0 : 1);
$('[data-olcum]').innerHTML = d.muayene.olcumler
  .map((o) => {
    const ust = Math.max(o.once, o.sinir) * 1.08;
    return `
    <div class="olcum" data-once="${o.once}" data-sonra="${o.sonra}" data-ust="${ust}" data-ondalik="${Math.max(ondalik(o.once), ondalik(o.sonra))}">
      <p class="olcum__ad"><b>${esc(o.ad)}</b><span class="mono">${esc(o.birim)} · sınır ${nf.format(o.sinir)}</span></p>
      <p class="olcum__deger"><span data-v>${nf.format(o.once)}</span></p>
      <div class="olcum__cubuk"><span class="olcum__dolu"></span><span class="olcum__sinir" style="left:${((o.sinir / ust) * 100).toFixed(1)}%"></span></div>
    </div>`;
  })
  .join('');

// --- Duman rengi --------------------------------------------------------------------

$('[data-duman]').innerHTML = d.duman
  .map(
    (x, i) => `
    <article class="dm dm--${esc(x.ton)}">
      <p class="dm__dev" aria-hidden="true" data-yon="${i % 2 ? 1 : -1}">${harfler(x.renk, 'g')}</p>
      <div class="dm__ic">
        <h3><span class="sr-only">${esc(x.renk)} duman: </span>${esc(x.anlam)}</h3>
        <p>${esc(x.metin)}</p>
      </div>
    </article>`
  )
  .join('');

// --- Hizmetler --------------------------------------------------------------------

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h, i) => `
    <li class="hizmet">
      <span class="hizmet__no mono">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="hizmet__baslik">${esc(h.baslik)}</h3>
      <p class="hizmet__metin">${esc(h.aciklama)}</p>
      <span class="hizmet__sure mono">${esc(h.sure)}</span>
    </li>`
  )
  .join('');

// --- Rakamlar ------------------------------------------------------------------------

const seritHTML = d.slogan2.map((s) => `<span>${esc(s)}</span><i aria-hidden="true"></i>`).join('');
$('[data-serit]').innerHTML = seritHTML.repeat(4);
$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const v = s.deger === 'kurulus' ? yillar : Number(s.deger);
    return `<div class="rakam__kalem"><dd><b data-say="${v}">${nf.format(v)}</b>${esc(s.sonek)}</dd><dt>${esc(s.etiket)}</dt></div>`;
  })
  .join('');

// --- Süreç, galeri, yorumlar, markalar ---------------------------------------------

$('[data-steps]').innerHTML = d.surec
  .map(
    (s, i) => `
    <li class="adim">
      <span class="adim__no" aria-hidden="true">${i + 1}</span>
      <div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
    </li>`
  )
  .join('');

$('[data-gallery]').innerHTML = d.galeri
  .slice(0, 4)
  .map(
    (g, i) => `
    <figure class="kare kare--${i + 1}">
      <div class="kare__cerceve"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></div>
    </figure>`
  )
  .join('');

const puanStr = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-puan]').textContent = puanStr;
$('[data-puan]').setAttribute('aria-label', `5 üzerinden ${puanStr}`);
$('[data-yildiz]').innerHTML = icons.star.repeat(5);
$('[data-puan-alt]').textContent = `${nf.format(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <blockquote class="yorum">
      <p class="yorum__yildiz" aria-label="${Number(y.puan)} yıldız">${icons.star.repeat(Number(y.puan) || 5)}</p>
      <p class="yorum__metin">${esc(y.metin)}</p>
      <footer><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac)}</span></footer>
    </blockquote>`
  )
  .join('');
const markaHTML = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-brands]').innerHTML = markaHTML + markaHTML;

// Final başlığı: kelimeler satır satır, afiş gibi.
const fin = $('[data-final]');
fin.setAttribute('aria-label', d.finalBaslik);
fin.innerHTML = upper(d.finalBaslik)
  .split(/\s+/)
  .filter(Boolean)
  .map((k) => `<span class="final__satir" aria-hidden="true">${harfler(k)}</span>`)
  .join('');

// --- Hareket --------------------------------------------------------------------------

// Header hero'dan sonra koyulaşır (hareket azaltılmışsa da).
const ust = $('.top');
const ustYaz = () => ust.classList.toggle('is-solid', scrollY > innerHeight * 0.7);
addEventListener('scroll', ustYaz, { passive: true });
ustYaz();

afisBoyutla();
document.fonts.ready.then(() => {
  afisBoyutla();
  if (reducedMotion) {
    document.documentElement.classList.add('is-static');
    sesYaz(1);
    $$('.olcum').forEach((o) => olcumYaz(o, 1));
    return;
  }
  hareket(initSmoothScroll());
  ScrollTrigger.refresh();
});

let genislik = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === genislik) return; // mobilde adres çubuğu kaymasıyla yeniden boyutlama yok
  genislik = innerWidth;
  afisBoyutla();
  ScrollTrigger.refresh();
});

const dbEl = $('[data-db]');
const dbBar = $('[data-db-bar]');
const sesPin = $('.ses__pin');
let sesGenlik = 1;
let sonDb = -1;
function sesYaz(p) {
  const t = gsap.utils.clamp(0, 1, p / 0.62);
  const db = Math.round(gsap.utils.interpolate(G.once_db, G.sonra_db, t));
  if (db !== sonDb) {
    sonDb = db;
    dbEl.textContent = db;
    dbBar.style.transform = `scaleX(${dbOran(db).toFixed(3)})`;
    sesPin.classList.toggle('is-gecti', db <= G.sinir_db);
    sesPin.style.setProperty('--genlik', ((db - G.sonra_db) / (G.once_db - G.sonra_db)).toFixed(2));
  }
  sesGenlik = Math.max(0, (db - G.sonra_db) / (G.once_db - G.sonra_db));
  sesPin.classList.toggle('is-sessiz', p > 0.66);
}

function olcumYaz(el, t) {
  const once = Number(el.dataset.once);
  const sonra = Number(el.dataset.sonra);
  const ust = Number(el.dataset.ust);
  const v = gsap.utils.interpolate(once, sonra, t);
  const k = Number(el.dataset.ondalik);
  el.querySelector('[data-v]').textContent = v.toLocaleString('tr-TR', { minimumFractionDigits: k, maximumFractionDigits: k });
  el.querySelector('.olcum__dolu').style.transform = `scaleX(${(v / ust).toFixed(3)})`;
  el.classList.toggle('is-gecti', t > 0.98);
}

function hareket(lenis) {
  // Afiş açılışı: satırlar sırayla yandan çarpar, harfler aşağıdan yükselir.
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  $$('.afis__satir').forEach((s, i) => {
    intro.from(s, { xPercent: i % 2 ? 18 : -18, skewX: i % 2 ? -14 : 14, duration: 1.1 }, 0.05 + i * 0.12);
    intro.from($$('.h > span', s), { yPercent: 105, duration: 0.9, stagger: 0.025 }, 0.05 + i * 0.12);
  });
  intro
    .from('.boru', { scale: 0.4, autoAlpha: 0, duration: 1.2 }, 0.25)
    .from('.hero__ust, .hero__alt > *', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.6)
    .from('.dalga i', { scaleY: 0, duration: 0.8, stagger: { each: 0.01, from: 'center' } }, 0.5);

  // Hero kaydırılırken afiş satırları ters yönlere kayar, boru büyür.
  const heroTl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.4 } });
  $$('.afis__satir').forEach((s, i) => heroTl.fromTo(s, { xPercent: 0 }, { xPercent: i % 2 ? 12 : -12, ease: 'none', immediateRender: false }, 0));
  heroTl.fromTo('.boru', { scale: 1, yPercent: 0 }, { scale: 1.3, yPercent: -8, ease: 'none', immediateRender: false }, 0).to('.dalga', { scaleY: 1.8, ease: 'none' }, 0);


  // İmza: pinli ses sahnesi.
  const gHarf = $$('.ses__kelime--once .g > span');
  const sHarf = $$('.ses__kelime--sonra .g > span');
  gsap.set(sHarf, { yPercent: 150 });
  let sesAktif = false;
  const sesTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.ses',
      start: 'top top',
      end: mobil ? '+=230%' : '+=260%',
      pin: '.ses__pin',
      scrub: 0.5,
      onToggle: (s) => (sesAktif = s.isActive),
      onUpdate: (s) => sesYaz(s.progress),
    },
  });
  sesTl
    .fromTo('.ses__kelime--once', { scaleY: 1.25 }, { scaleY: 0.72, ease: 'none', duration: 0.62 }, 0)
    .to(gHarf, { yPercent: -150, autoAlpha: 0, duration: 0.14, stagger: 0.012, ease: 'power2.in' }, 0.62)
    .to(sHarf, { yPercent: 0, duration: 0.16, stagger: 0.012, ease: 'power3.out' }, 0.68)
    .fromTo('.ses__metin', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.14 }, 0.74)
    .to({}, { duration: 0.12 });
  sesYaz(0);

  // Titreşim: sadece sahne ekrandayken, genlik desibelle orantılı.
  const titre = gHarf.map((el) => ({ x: gsap.quickSetter(el.parentElement, 'x', 'px'), y: gsap.quickSetter(el.parentElement, 'y', 'px'), r: gsap.quickSetter(el.parentElement, 'rotation', 'deg') }));
  let sesGorunur = false;
  ScrollTrigger.create({ trigger: '.ses', start: 'top bottom', end: 'bottom top', onToggle: (s) => (sesGorunur = s.isActive) });
  gsap.ticker.add(() => {
    if (!sesGorunur || (!sesAktif && sesGenlik === 0)) return;
    const a = sesGenlik * (mobil ? 5 : 9);
    for (const q of titre) {
      q.x((Math.random() - 0.5) * a);
      q.y((Math.random() - 0.5) * a * 1.4);
      q.r((Math.random() - 0.5) * a * 0.5);
    }
  });

  // Egzoz hattı: dev durak adları kaydırmayla yatay akar, boru hattı aşağı dolar.
  $$('.durak').forEach((li, i) => {
    gsap.fromTo(
      $('.durak__dev span', li),
      { xPercent: i % 2 ? -30 : 10 },
      { xPercent: i % 2 ? 10 : -30, ease: 'none', scrollTrigger: { trigger: li, start: 'top bottom', end: 'bottom top', scrub: true } }
    );
    gsap.from($('.durak__ic', li), { y: 50, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 80%', once: true } });
  });
  gsap.fromTo('.hat__liste', { '--dolu': 0 }, { '--dolu': 1, ease: 'none', scrollTrigger: { trigger: '.hat__liste', start: 'top 60%', end: 'bottom 60%', scrub: true } });

  // Muayene ölçümü: değerler sınırın altına iner, sonunda damga vurulur.
  const olcumlar = $$('.olcum');
  const rapor = { t: 0 };
  gsap.to(rapor, {
    t: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.rapor__liste', start: 'top 75%', end: mobil ? 'bottom 45%' : 'bottom 55%', scrub: 0.5 },
    onUpdate: () => {
      olcumlar.forEach((o, i) => olcumYaz(o, gsap.utils.clamp(0, 1, rapor.t * 1.3 - i * 0.1)));
      $('.rapor').classList.toggle('is-damga', rapor.t > 0.97);
    },
  });
  olcumlar.forEach((o) => olcumYaz(o, 0));

  // Duman rengi: dev kelimeler karşı yönlerden gelir.
  $$('.dm').forEach((a) => {
    const dev = $('.dm__dev', a);
    const yon = Number(dev.dataset.yon);
    gsap.fromTo(dev, { xPercent: 35 * yon }, { xPercent: -10 * yon, ease: 'none', scrollTrigger: { trigger: a, start: 'top bottom', end: 'bottom 30%', scrub: true } });
    gsap.from($$('.g > span', dev), { yPercent: 110, stagger: 0.04, duration: 0.8, ease: 'power4.out', scrollTrigger: { trigger: a, start: 'top 75%', once: true } });
  });

  // Hizmetler: satırlar alttan, numara dönerek.
  $$('.hizmet').forEach((li) => {
    gsap.from(li, { y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 90%', once: true } });
  });

  // Rakamlar: sayaç ve kayan şerit (hızla eğilir).
  $$('[data-say]').forEach((b) => {
    const hedef = Number(b.dataset.say);
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef,
      duration: 1.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: b, start: 'top 85%', once: true },
      onUpdate: () => (b.textContent = nf.format(Math.round(o.v))),
    });
  });
  const seritTl = gsap.to('.serit__ic', { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
  const egik = gsap.quickTo('.serit', 'skewY', { duration: 0.5, ease: 'power3.out' });
  let hiz = 1;
  if (lenis) {
    lenis.on('scroll', (e) => {
      const v = gsap.utils.clamp(-40, 40, e.velocity);
      egik(-2 + v * 0.06);
      hiz = 1 + Math.abs(v) * 0.2;
    });
  }
  gsap.ticker.add(() => {
    seritTl.timeScale(gsap.utils.interpolate(seritTl.timeScale(), hiz, 0.08));
    hiz += (1 - hiz) * 0.05;
  });

  // Süreç numaraları büyük, ölçekle girer.
  $$('.adim').forEach((li) => {
    gsap.from($('.adim__no', li), { scale: 0.3, rotate: -20, autoAlpha: 0, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: li, start: 'top 85%', once: true } });
    gsap.from($('div', li), { x: 30, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 85%', once: true } });
  });

  // Galeri: kareler perde gibi açılır.
  $$('.kare').forEach((f, i) => {
    gsap.fromTo(
      $('.kare__cerceve', f),
      { clipPath: i % 2 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0%)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 50%', scrub: true } }
    );
  });

  // Puan harfleri ve final başlığı.
  gsap.from('.puan', { yPercent: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.yorumlar', start: 'top 70%', once: true } });
  $$('.final__satir').forEach((s, i) => {
    gsap.from($$('.h > span', s), {
      yPercent: 110,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.03,
      delay: i * 0.12,
      scrollTrigger: { trigger: '.final', start: 'top 65%', once: true },
    });
  });
}
