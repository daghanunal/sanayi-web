import tonaj from '../../data/tonaj.json';
import ek from '../../data/dingil.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { truckSVG, wheelCenters, WHEEL_R } from './truck.js';
import { chassisSVG, NOKTALAR } from './chassis.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

// Tonaj verisinin üstüne Dingil'e özel alanlar
const d = boot({ ...tonaj, ...ek, isletme: { ...tonaj.isletme, ...(ek.isletme || {}) } });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, frac = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
const yil = new Date().getFullYear() - d.isletme.kurulus;

// "1995'ten", "2008'den", "2010'dan": sayının okunuşunun son hecesine göre ek
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Metinler ---------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-wa-yardim]').forEach((a) => (a.href = waHref(d, d.yolYardimBlok.mesaj)));
$('[data-wa-filo]').href = waHref(d, `Merhaba ${d.isletme.ad}, filomuzun bakımı için teklif almak istiyorum. Araç sayımız: `);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));

const set = (sel, text) => $$(sel).forEach((el) => (el.textContent = text));
set('[data-hero-ust]', `Şaşmaz'da ${ablative(d.isletme.kurulus)} beri. ${d.hero.ust}`);
set('[data-hero-cagri]', d.hero.cagri);
set('[data-yardim-baslik]', d.yolYardimBlok.baslik);
set('[data-yardim-metin]', d.yolYardimBlok.metin);
set('[data-yardim-not]', d.yolYardimBlok.not);
set('[data-sasi-baslik]', d.sasi.baslik);
set('[data-sasi-metin]', d.sasi.metin);
set('[data-marka-baslik]', d.markaBaslik);
set('[data-kantar-baslik]', d.kantar.baslik);
set('[data-filo-baslik]', d.filo.baslik);
set('[data-filo-metin]', d.filo.metin);
set('[data-tako-baslik]', d.takograf.baslik);
set('[data-tako-metin]', d.takograf.metin);
set('[data-final-baslik]', d.finalBaslik);
set('[data-final-metin]', d.finalMetin);
set('[data-alt-kucuk]', `© ${new Date().getFullYear()} ${d.isletme.ad}. Fotoğraflar: Pexels.`);

$('[data-hero-title]').innerHTML = d.isletme.ad
  .split(/\s+/)
  .map((w) => `<span class="satir"><span>${esc(w.toLocaleUpperCase('tr'))}</span></span>`)
  .join(' ');

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Atölye açık' : 'Atölye kapalı';
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

$('[data-yardim-adim]').innerHTML = d.yolYardimBlok.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

$('[data-hizmetler]').innerHTML = d.hizmetler
  .map(
    (s) => `
    <li class="hizmet__satir">
      <h3>${esc(s.baslik)}</h3>
      <p>${esc(s.aciklama)}</p>
      <span class="hizmet__sure">${esc(s.sure)}</span>
    </li>`
  )
  .join('');

// Şasi çizimi ve kartlar
$('[data-sasi]').innerHTML = chassisSVG();
$('[data-noktalar]').innerHTML = d.alt
  .map((a, i) => {
    const [x, y] = NOKTALAR[a.id] ?? [300, 120];
    return `<g class="nokta" data-nokta="${i}" transform="translate(${x} ${y})">
      <circle r="17" class="nokta__halka"/><circle r="7" class="nokta__ic"/>
    </g>`;
  })
  .join('');

const olcumYuzde = (o, v) => {
  const max = Math.max(o.once, o.sonra, o.iyi) * 1.15;
  return Math.min(100, (v / max) * 100);
};
$('[data-sasi-kartlar]').innerHTML = d.alt
  .map((a, i) => {
    const o = a.olcum;
    const frac = Number.isInteger(o.once) && Number.isInteger(o.sonra) ? 0 : o.once < 1 ? 2 : 1;
    return `
    <li class="sasi__kart" data-kart="${i}">
      <p class="sasi__durak">${esc(a.durak)}</p>
      <h3>${esc(a.baslik)}</h3>
      <p>${esc(a.metin)}</p>
      <div class="olcum" style="--once:${olcumYuzde(o, o.once)}%;--sonra:${olcumYuzde(o, o.sonra)}%;--iyi:${olcumYuzde(o, o.iyi)}%">
        <p class="olcum__etiket">${esc(o.etiket)}</p>
        <div class="olcum__cubuk"><i class="olcum__dolum"></i><b class="olcum__esik"></b></div>
        <p class="olcum__deger"><span class="olcum__once">Gelişte ${nf(o.once, frac)}</span><span class="olcum__sonra">Teslimde ${nf(o.sonra, frac)} ${esc(o.birim)}</span></p>
      </div>
    </li>`;
  })
  .join('');

// Markalar: plaka gibi
$('[data-markalar]').innerHTML = d.markalar
  .map((m) => `<li class="plaka"><span class="plaka__tr" aria-hidden="true">TR</span><span class="plaka__ad">${esc(m)}</span></li>`)
  .join('');

// Kantar fişi
const kalemler = d.istatistikler.map((s) => ({
  etiket: s.etiket,
  deger: s.deger === 'kurulus' ? yil : s.deger,
  sonek: s.sonek,
}));
const bugun = new Date().toLocaleDateString('tr-TR');
$('[data-fis]').innerHTML = `
  <p class="fis__ust">${esc(d.isletme.ad.toLocaleUpperCase('tr'))}</p>
  <p class="fis__alt">KANTAR FİŞİ, ${bugun}</p>
  <p class="fis__no">FİŞ NO ${d.isletme.kurulus}-${String(d.puan.adet).padStart(4, '0')}</p>
  <ul class="fis__kalem">
    ${kalemler
      .map(
        (k) => `<li><span>${esc(k.etiket)}</span><b data-say="${k.deger}">${nf(k.deger)}</b><em>${esc(k.sonek.trim())}</em></li>`
      )
      .join('')}
  </ul>
  <p class="fis__toplam"><span>Müşteri puanı</span><b>${nf(d.puan.ortalama, 1)} / 5</b></p>
  <p class="fis__not">${esc(d.garanti)}</p>
  <p class="fis__barkod" aria-hidden="true"></p>`;

// Filo
$('[data-filo-liste]').innerHTML = d.filo.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');

// Süreç
$('[data-surec]').innerHTML = d.surec
  .map((s, i) => `<li><span class="surec__no">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`)
  .join('');

// Galeri
$('[data-galeri]').innerHTML = d.galeri
  .map((g) => `<figure><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></figure>`)
  .join('');

// Yorumlar
const yildiz = (n) => icons.star.repeat(n);
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-yildiz]').innerHTML = yildiz(Math.round(d.puan.ortalama));
$('[data-puan-adet]').textContent = `${d.puan.adet} değerlendirme`;
$('[data-yorumlar]').innerHTML = d.yorumlar
  .map(
    (y) => `
    <li class="yorum__kart">
      <p class="yorum__yildizlar" aria-label="${y.puan} yıldız">${yildiz(y.puan)}</p>
      <blockquote>${esc(y.metin)}</blockquote>
      <p class="yorum__kim"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
    </li>`
  )
  .join('');

// Saatler
const bugunIdx = [1, 2, 3, 4, 5, 6, 0].indexOf(new Date().getDay());
let sayac = 0;
$('[data-saatler]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => {
    const kac = gun.includes('–') ? 5 : 1;
    const aktif = bugunIdx >= sayac && bugunIdx < sayac + kac;
    sayac += kac;
    return `<tr class="${aktif ? 'is-bugun' : ''}"><th scope="row">${gun}</th><td>${saat}</td></tr>`;
  })
  .join('');

// Harita: yaklaşınca yükle
const harita = $('[data-harita]');
new IntersectionObserver(
  (ents, io) => {
    if (!ents[0].isIntersecting) return;
    harita.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(harita);

// --- Tır --------------------------------------------------------------------

const tirKap = $('[data-tir]');
tirKap.innerHTML = truckSVG(esc(d.isletme.ad));
const svg = $('svg', tirKap);
const perde = $('[data-curtain]', svg);
perde.textContent = d.isletme.ad.toLocaleUpperCase('tr');

// Brandadaki yazıyı alana sığdır (genişlik 700, yükseklik 130 birim)
function perdeSigdir() {
  perde.setAttribute('font-size', 118);
  const w = perde.getComputedTextLength();
  const size = Math.min(128, (118 * 900) / Math.max(w, 1));
  perde.setAttribute('font-size', size.toFixed(1));
  perde.setAttribute('y', (126 + size * 0.36).toFixed(1));
}
perdeSigdir();
document.fonts?.ready.then(perdeSigdir);

const wheels = $$('[data-wheel]', svg).map((g, i) => ({ g, c: wheelCenters[i] }));
const tekerDon = (px) => {
  // px: SVG birimiyle alınan yol; açı = yol / yarıçap
  const deg = ((px / WHEEL_R) * 180) / Math.PI;
  wheels.forEach(({ g, c }) => g.setAttribute('transform', `rotate(${deg.toFixed(1)} ${c[0]} ${c[1]})`));
};

// SVG ekranda kaç piksel? Ekran pikselini SVG birimine çevirmek için
const olcek = () => svg.getBoundingClientRect().width / 1200;

// --- Hareket ----------------------------------------------------------------

const lenis = initSmoothScroll();
const hazards = $$('[data-hazard]', svg);

if (reducedMotion) {
  tekerDon(0);
} else {
  const durum = { x: 0 };
  const sahne = () => gsap.set(tirKap, { x: durum.x });

  // Giriş: tır soldan gelir, frene basar, dörtlüler yanar
  const giris = gsap.timeline({ delay: 0.2 });
  const basla = -(innerWidth + svg.getBoundingClientRect().width);
  durum.x = basla;
  sahne();
  giris
    .to(durum, {
      x: 0, duration: 2.1, ease: 'power3.out',
      onUpdate() {
        sahne();
        tekerDon(durum.x / olcek());
      },
    })
    .fromTo(tirKap, { rotate: 0 }, { rotate: -0.6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '90% 100%' }, '-=0.25')
    .to(hazards, { opacity: 0.15, duration: 0.28, repeat: 5, yoyo: true, ease: 'steps(1)' }, '-=0.1');

  // Başlık satırları: alttan yükselir (İ noktası için üst pay var)
  gsap.from('.hero__title .satir > span', { yPercent: 105, duration: 1, ease: 'power4.out', stagger: 0.08, delay: 0.15 });
  gsap.from('.hero__ust, .hero__slogan, .hero__cta', { opacity: 0, y: 14, duration: 0.8, stagger: 0.08, delay: 0.6, ease: 'power2.out' });

  // Kaydırınca tır yoluna devam eder, şerit çizgileri akar
  ScrollTrigger.create({
    trigger: '[data-hero]',
    start: 'top top',
    end: 'bottom top',
    onUpdate(self) {
      if (giris.isActive()) return;
      const x = self.progress * innerWidth * 1.3;
      gsap.set(tirKap, { x });
      tekerDon(x / olcek());
      gsap.set('[data-serit]', { x: -x * 0.6 });
    },
  });
  gsap.to('.hero__copy', {
    yPercent: -18, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Şasi: görünen kartın noktası yanar, ölçüm çubuğu gelişten teslime dolar
  $$('[data-kart]').forEach((kart) => {
    const i = kart.dataset.kart;
    ScrollTrigger.create({
      trigger: kart,
      start: 'top 62%',
      end: 'bottom 38%',
      onToggle(self) {
        kart.classList.toggle('is-aktif', self.isActive);
        $(`[data-nokta="${i}"]`)?.classList.toggle('is-aktif', self.isActive);
        if (self.isActive) kart.classList.add('is-olcum');
      },
    });
  });

  // Fotoğraf bandı: hafif parallax
  gsap.fromTo('[data-parallax]', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.bant', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Markalar: plakalar sırayla takılır
  gsap.from('.plaka', {
    y: -30, rotate: () => gsap.utils.random(-6, 6), opacity: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.05,
    scrollTrigger: { trigger: '.plakalar', start: 'top 85%' },
  });

  // Kantar fişi yazıcıdan çıkar, rakamlar sayar
  const fis = $('[data-fis]');
  gsap.fromTo(fis, { clipPath: 'inset(0 0 100% 0)', y: -40 }, {
    clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.6, ease: 'steps(24)',
    scrollTrigger: { trigger: '.kantar', start: 'top 70%' },
  });
  $$('[data-say]', fis).forEach((b) => {
    const son = Number(b.dataset.say);
    const o = { v: 0 };
    gsap.to(o, {
      v: son, duration: 1.4, ease: 'power2.out', delay: 0.5,
      onUpdate: () => (b.textContent = nf(o.v)),
      scrollTrigger: { trigger: '.kantar', start: 'top 70%' },
    });
  });

  // Süreç: çizgi dolar, adımlar sırayla yanar
  gsap.fromTo('[data-surec-dolum]', { scaleY: 0, scaleX: 0 }, {
    scaleY: 1, scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: '.surec__yol', start: 'top 70%', end: 'bottom 60%', scrub: true },
  });
  $$('.surec__adim li').forEach((li) =>
    ScrollTrigger.create({ trigger: li, start: 'top 70%', onEnter: () => li.classList.add('is-yandi'), onLeaveBack: () => li.classList.remove('is-yandi') })
  );

  // Galeri: yatay sürüklenme
  gsap.fromTo('[data-galeri]', { x: () => innerWidth * 0.08 }, {
    x: () => -innerWidth * 0.08, ease: 'none',
    scrollTrigger: { trigger: '.galeri', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
}

if (reducedMotion) {
  $$('[data-kart]').forEach((k) => k.classList.add('is-olcum'));
  $$('.surec__adim li').forEach((li) => li.classList.add('is-yandi'));
}

// Header: hero geçilince zemini koyulaşır
ScrollTrigger.create({
  trigger: '[data-hero]',
  start: 'bottom 70px',
  onEnter: () => $('[data-top]').classList.add('is-dolu'),
  onLeaveBack: () => $('[data-top]').classList.remove('is-dolu'),
});

addEventListener('load', () => ScrollTrigger.refresh());
void lenis;
