// Pigment: Kinetik aile, boya ve kaporta. 3D yok; kartela, renk taşmaları, harf içinden fotoğraf.
import showroom from '../../data/showroom.json';
import ekler from '../../data/pigment.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const raw = { ...showroom, ...ekler, isletme: { ...showroom.isletme, ...ekler.isletme } };
const d = boot(raw);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const isMobile = () => innerWidth < 900;
const INK = '#16181b';
const PAPER = '#eceeea';

// "2004'ten", "1998'den", "2010'dan": okunuşun son hecesine göre ek
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

const rgbHex = (rgb) => {
  const m = String(rgb).match(/\d+/g);
  return m ? `#${m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('')}` : PAPER;
};

// Renk üstünde okunacak yazı rengi (göreli parlaklık)
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.33 ? INK : '#ffffff';
}

const renkler = d.renkler;
const renkAt = (i) => renkler[i % renkler.length];
const yil = new Date().getFullYear();
const yilSayisi = Math.max(1, yil - d.isletme.kurulus);

// --- Render ------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon,
  adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-wa-foto]').forEach(
  (a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımın fotoğrafını gönderiyorum. Fiyat alabilir miyim?`))
);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('[data-year]').textContent = yil;
$('[data-since]').textContent = `Şaşmaz'da ${ablative(d.isletme.kurulus)} beri. Boya, kaporta, detaylı bakım.`;
$$('[data-note]').forEach((el) => (el.textContent = d.bantNotlari[Number(el.dataset.note)] ?? ''));

const durum = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = durum.open ? 'Açık' : 'Kapalı';
  el.classList.toggle('is-open', durum.open);
});
$$('[data-status-long]').forEach((el) => {
  el.textContent = durum.text;
  el.classList.toggle('is-open', durum.open);
});

// Hero: adın ilk kelimesi, içi fotoğraf
const heroWord = $('[data-hero-word]');
const ilkKelime = d.isletme.ad.trim().split(/\s+/)[0].toLocaleUpperCase('tr');
heroWord.textContent = ilkKelime;
// Kelimenin içi kartela renkleri: şerit şerit
const adim = 100 / renkler.length;
heroWord.style.backgroundImage = `linear-gradient(90deg, ${renkler.map((r, i) => `${r.hex} ${i * adim}% ${(i + 1) * adim}%`).join(', ')})`;
$('[data-hero-photo]').style.backgroundImage = `url("${d.heroGorsel}")`;
$('[data-hero-chip-img]').style.backgroundImage = `url("${d.heroGorsel}")`;
const heroRenk = renkler.find((r) => r.kod === 'RAL 5015') ?? renkler[0];
$('[data-hero-chip-code]').textContent = heroRenk.kod;
$('[data-hero-chip-name]').textContent = heroRenk.ad;

// Kartela
const fan = $('[data-fan]');
fan.innerHTML = d.hizmetler
  .map((h, i) => {
    const r = renkAt(i);
    return `
    <div class="chip" style="--c:${r.hex};--on:${onColor(r.hex)}" data-chip>
      <div class="chip__color">
        <span class="chip__code">${esc(r.kod)}</span>
        <span class="chip__name">${esc(r.ad)}</span>
        <span class="chip__no">${String(i + 1).padStart(2, '0')}</span>
      </div>
      <div class="chip__foot"></div>
    </div>`;
  })
  .join('') + '<i class="deck__rivet"></i>';
$('[data-deck-total]').textContent = String(d.hizmetler.length).padStart(2, '0');
$('[data-deck-list]').innerHTML = d.hizmetler
  .map((h, i) => `
    <li style="--c:${renkAt(i).hex}">
      <span class="deck__list-code">${esc(renkAt(i).kod)}</span>
      <h3>${esc(h.baslik)}</h3>
      <p>${esc(h.aciklama)}</p>
      <p class="deck__list-time">Süre: <strong>${esc(h.sure)}</strong></p>
    </li>`)
  .join('');

const deck = $('[data-deck]');
let aktifHizmet = -1;
function hizmetGoster(i) {
  if (i === aktifHizmet) return;
  aktifHizmet = i;
  const h = d.hizmetler[Math.max(0, i)];
  const r = renkAt(Math.max(0, i));
  $('[data-deck-no]').textContent = String(Math.max(0, i) + 1).padStart(2, '0');
  $('[data-deck-code]').textContent = `${r.kod}, ${r.ad}`;
  $('[data-deck-title]').textContent = h.baslik;
  $('[data-deck-text]').textContent = h.aciklama;
  $('[data-deck-time]').textContent = h.sure;
  $('[data-deck-wa]').href = waHref(d, `Merhaba ${d.isletme.ad}, ${h.baslik.toLocaleLowerCase('tr')} için fiyat almak istiyorum.`);
  if (!reducedMotion && i >= 0) {
    gsap.fromTo('[data-deck-panel] > *', { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.04, ease: 'power3.out', overwrite: true });
  }
}
hizmetGoster(0);

// Renk eşleştirme
const e = d.eslestirme;
const matchImg = $('[data-match-img]');
matchImg.src = e.gorsel;
$('[data-swatch-chip]').style.background = e.baslangic;
const renkStat = d.istatistikler.find((s) => s.sonek === '%') ?? { deger: 98, sonek: '%', etiket: 'tek seferde renk tutturma' };
$('[data-match-stat]').textContent = `%${renkStat.deger}`;
$('[data-match-stat-label]').textContent = renkStat.etiket;
let hedefRenk = '#b0141c';
// Fotoğrafın ortasından gerçek renk örneği al: kartın vardığı renk bu.
matchImg.addEventListener('load', () => {
  try {
    // Fotoğrafın doygun ve aydınlık piksellerinin ortalaması = boyanın rengi
    const c = document.createElement('canvas');
    c.width = 32; c.height = 24;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(matchImg, 0, 0, 32, 24);
    const px = ctx.getImageData(0, 0, 32, 24).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
      if (mx > 110 && (mx - mn) / mx > 0.55) (r += px[i]), (g += px[i + 1]), (b += px[i + 2]), n++;
    }
    if (n > 10) hedefRenk = `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')}`;
    if (reducedMotion) $('[data-swatch-chip]').style.background = hedefRenk;
  } catch {}
});

// Katmanlar
$('[data-stack]').innerHTML = d.katmanlar
  .map((k, i) => `<div class="layer layer--${i}" style="--c:${k.renk}" data-layer><span>${esc(k.ad)}</span><em>${esc(k.kalinlik)}</em></div>`)
  .join('');
$('[data-steps]').innerHTML = d.surec
  .map((s, i) => `<li data-step><span class="layers__no">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`)
  .join('');

// Önce / sonra
$('[data-ba-list]').innerHTML = d.oncesiSonrasi
  .map((p) => `
    <figure class="ba__item" data-ba-item style="--pos:50%">
      <img src="${esc(p.sonra)}" alt="${esc(p.baslik)}, işlem sonrası" loading="lazy" />
      <div class="ba__before"><img src="${esc(p.once)}" alt="${esc(p.baslik)}, işlem öncesi" loading="lazy" /></div>
      <span class="ba__tag ba__tag--l">Önce</span><span class="ba__tag ba__tag--r">Sonra</span>
      <div class="ba__handle" role="slider" tabindex="0" aria-label="Önce ve sonra karşılaştırması" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><i></i></div>
      <figcaption>${esc(p.baslik)}</figcaption>
    </figure>`)
  .join('');

// Hakkında + rakamlar
$('[data-about-text]').textContent = d.isletme.hakkinda;
$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const deger = s.deger === 'kurulustan' ? yilSayisi : s.deger;
    const onek = s.sonek === '%' ? '%' : '';
    const sonek = s.sonek === '%' ? '' : s.sonek;
    const r = renkAt(i + 2);
    return `<li style="--c:${r.hex};--on:${onColor(r.hex)}"><strong><span>${onek}</span><span data-count="${deger}">${nf(deger)}</span><span>${esc(sonek)}</span></strong><span>${esc(s.etiket)}</span><em>${esc(r.kod)}</em></li>`;
  })
  .join('');

// Galeri
$('[data-gallery-track]').innerHTML = d.galeri
  .map((g) => `
    <figure class="card" style="--c:${g.renk};--on:${onColor(g.renk)}">
      <div class="card__img"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></div>
      <figcaption><strong>${esc(g.baslik)}</strong><span>${esc(g.detay)}</span></figcaption>
    </figure>`)
  .join('');

// Yorumlar
const yildiz = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-stars]').innerHTML = yildiz(Math.round(d.puan.ortalama));
$('[data-score-count]').textContent = `${nf(d.puan.adet)} Google yorumu`;
const yorumKart = (y, i) => `
  <blockquote class="review" style="--c:${renkAt(i).hex}">
    <p class="review__stars">${yildiz(y.puan)}</p>
    <p class="review__text">${esc(y.metin)}</p>
    <footer><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></footer>
  </blockquote>`;
const yarim = Math.ceil(d.yorumlar.length / 2);
const sira1 = d.yorumlar.slice(0, yarim), sira2 = d.yorumlar.slice(yarim);
$('[data-review-rows]').innerHTML = `
  <div class="reviews__row" data-rrow="1">${[...sira1, ...sira1].map(yorumKart).join('')}</div>
  <div class="reviews__row" data-rrow="-1">${[...sira2, ...sira2].map((y, i) => yorumKart(y, i + 3)).join('')}</div>`;

// Markalar
const markaHTML = d.markalar.map((m) => `<span>${esc(m)}</span><i></i>`).join('');
$('[data-brands]').innerHTML = `<div class="brands__track" data-brand-track>${markaHTML}${markaHTML}</div>`;

// Saatler
const bugun = new Date().getDay();
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat]) => `<tr><th>${esc(gun)}</th><td>${esc(saat)}</td></tr>`)
  .join('');

// Harita: yaklaşınca yükle
const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapEl);

$('[data-final-title]').textContent = d.finalBaslik;

// Önce/sonra sürükleme (her durumda çalışır)
$$('[data-ba-item]').forEach((item) => {
  const handle = $('.ba__handle', item);
  const set = (p) => {
    p = Math.min(96, Math.max(4, p));
    item.style.setProperty('--pos', `${p}%`);
    handle.setAttribute('aria-valuenow', Math.round(p));
  };
  item._set = set;
  let drag = false;
  const move = (ev) => {
    const r = item.getBoundingClientRect();
    set(((ev.clientX - r.left) / r.width) * 100);
  };
  item.addEventListener('pointerdown', (ev) => {
    drag = true;
    item._touched = true;
    gsap.killTweensOf(item);
    item.setPointerCapture(ev.pointerId);
    move(ev);
  });
  item.addEventListener('pointermove', (ev) => drag && move(ev));
  item.addEventListener('pointerup', () => (drag = false));
  item.addEventListener('pointercancel', () => (drag = false));
  handle.addEventListener('keydown', (ev) => {
    const cur = parseFloat(item.style.getPropertyValue('--pos')) || 50;
    if (ev.key === 'ArrowLeft') set(cur - 5);
    if (ev.key === 'ArrowRight') set(cur + 5);
  });
});

// --- Hareket -------------------------------------------------------------------

document.documentElement.classList.toggle('is-static', reducedMotion);

if (reducedMotion) {
  $('[data-intro]').remove();
  $$('[data-tape]').forEach((t) => t.classList.add('is-on'));
  $$('[data-step]').forEach((s) => s.classList.add('is-done'));
  $('[data-stamp]').classList.add('is-on');
  $('[data-score]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
  $('[data-gauge-val]').textContent = '110';
  $('[data-delta]').textContent = e.deltaSon.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
  $('[data-swatch-code]').textContent = 'Karışım 4';
  document.fonts.ready.then(fitHeroWord);
  addEventListener('resize', fitHeroWord);
} else {
  hareket();
}

function intro() {
  const box = $('[data-intro]');
  const bars = $('[data-intro-bars]');
  bars.innerHTML = renkler.map((r) => `<i style="background:${r.hex}"></i>`).join('');
  const name = $('[data-intro-name]');
  name.textContent = d.isletme.ad;
  const split = new SplitText(name, { type: 'chars', charsClass: 'intro__ch' });
  const tl = gsap.timeline({
    onComplete: () => {
      box.remove();
      split.revert();
      heroIn();
    },
  });
  tl.from(bars.children, { scaleX: 0, transformOrigin: 'left center', duration: 0.45, stagger: 0.05, ease: 'power3.out' })
    .from(split.chars, { yPercent: 110, duration: 0.45, stagger: 0.018, ease: 'power3.out' }, 0.25)
    .to(split.chars, { yPercent: -110, duration: 0.3, stagger: 0.01, ease: 'power2.in' }, 1.15)
    .to(bars.children, { scaleX: 0, transformOrigin: 'right center', duration: 0.4, stagger: 0.04, ease: 'power3.in' }, 1.2)
    .set(box, { pointerEvents: 'none' }, 1.2);
  box.addEventListener('pointerdown', () => tl.progress(1), { once: true });
}

let heroGirdi = false;
function heroIn() {
  if (heroGirdi) return;
  heroGirdi = true;
  gsap.from(heroWord, { yPercent: 18, autoAlpha: 0, duration: 0.8, ease: 'power3.out' });
  gsap.from('[data-hero-chip]', { yPercent: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', delay: 0.05 });
  gsap.from('[data-hero-copy] > *, [data-since]', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.1 });
}

function fitHeroWord() {
  // Kelimeyi ekran genişliğine sığdır
  heroWord.style.fontSize = '100px';
  const w = heroWord.scrollWidth;
  const hedef = $('.hero__wordwrap').clientWidth;
  heroWord.style.fontSize = `${Math.min(100 * (hedef / w), innerHeight * 0.42)}px`;
}

function hareket() {
  const lenis = initSmoothScroll();
  intro();

  // Header: hero geçince zemin al
  const top = $('[data-top]');
  const ustGuncelle = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
  addEventListener('scroll', ustGuncelle, { passive: true });
  ustGuncelle();

  // Bant şeritleri: görünce açılır
  $$('[data-tape]').forEach((t) =>
    ScrollTrigger.create({ trigger: t, start: 'top 85%', once: true, onEnter: () => t.classList.add('is-on') })
  );

  document.fonts.ready.then(() => {
    fitHeroWord();
    kur();
    ScrollTrigger.refresh();
  });

  function kur() {
    const mm = gsap.matchMedia();

    // 1. Hero: kartelanın içine dalış
    const heroChip = $('[data-hero-chip]');
    const chipImg = $('[data-hero-chip-img]');
    // Kartın fotoğraf alanı ekranı kaplayacak kadar büyür (düzen konumundan hesap, transform'dan bağımsız)
    const dalis = () => {
      const w = heroChip.offsetWidth, h = chipImg.offsetHeight;
      const cx = heroChip.offsetLeft + w / 2, cy = heroChip.offsetTop + chipImg.offsetTop + h / 2;
      const s = Math.max(innerWidth / w, innerHeight / h) * 1.06;
      return { x: innerWidth / 2 - cx, y: innerHeight / 2 - cy, s };
    };
    gsap.set(heroChip, { rotation: isMobile() ? -5 : 6, transformOrigin: '50% 50%' });
    gsap.timeline({
      scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: '+=120%', pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
    })
      .to('[data-hero-copy], [data-since], .tape--hero', { y: -50, autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 0)
      .to(heroWord, { yPercent: -60, scale: 1.25, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0)
      .to(heroChip, { x: () => dalis().x, y: () => dalis().y, scale: () => dalis().s, rotation: 0, duration: 1, ease: 'power3.inOut' }, 0.05)
      .to('[data-hero-photo]', { autoAlpha: 1, duration: 0.2 }, 0.88);

    // 2. Kartela
    const chips = $$('[data-chip]');
    const n = chips.length;
    const flood = $('[data-deck-flood]');
    mm.add({ mob: '(max-width: 899px)', desk: '(min-width: 900px)' }, (ctx) => {
      const { mob } = ctx.conditions;
      const acilar = chips.map((_, i) => (mob ? -6 + (i * 72) / (n - 1) : -10 + (i * 80) / (n - 1)));
      gsap.set(chips, { rotation: 0, transformOrigin: '14% 92%' });
      gsap.set(flood, { backgroundColor: PAPER });
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: deck, start: 'top top', end: () => `+=${(n + 1.2) * (mob ? 55 : 60)}%`,
          pin: true, scrub: 0.5, anticipatePin: 1,
        },
        // Scrub gecikmesiyle birlikte ilerlesin diye zaman çizelgesinin kendi güncellemesinde
        onUpdate: () => {
          const t = tl.time();
          hizmetGoster(t < 0.9 ? -1 : Math.min(n - 1, Math.floor(t - 0.9)));
          deck.classList.toggle('is-open', t >= 0.9);
          // Yazı rengi zeminin o anki rengine göre (geçiş sırasında da okunur kalsın)
          const on = onColor(rgbHex(gsap.getProperty(flood, 'backgroundColor')));
          deck.style.setProperty('--on', on);
          deck.classList.toggle('is-light-text', on !== INK);
        },
      });
      tl.to('[data-deck-head]', { autoAlpha: 0, y: -30, duration: 0.3 }, 0.1)
        .to(chips, { rotation: (i) => acilar[i], duration: 0.8, stagger: 0.02 }, 0.1)
        .fromTo('[data-deck-panel]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.9);
      chips.forEach((chip, i) => {
        const t = 1 + i;
        const r = renkAt(i).hex;
        const digerleri = chips.filter((_, k) => k !== i);
        tl.to(flood, { backgroundColor: r, duration: 0.35, ease: 'power1.inOut' }, t - 0.1)
          .to(chip, { rotation: mob ? 28 : 34, yPercent: -9, scale: 1.08, duration: 0.35 }, t - 0.1)
          .to(digerleri, { rotation: (k) => acilar[chips.indexOf(digerleri[k])], yPercent: 0, scale: 1, duration: 0.35 }, t - 0.1)
          .set(chip, { zIndex: 10 + i }, t - 0.1);
      });
      tl.to({}, { duration: 0.4 });
    });

    // 3. Renk eşleştirme
    const delta = $('[data-delta]');
    const code = $('[data-swatch-code]');
    const chip = $('[data-swatch-chip]');
    const renkDurum = { p: 0 };
    gsap.timeline({
      scrollTrigger: {
        trigger: '[data-match]', start: 'top top', end: '+=140%', pin: true, scrub: 0.5, anticipatePin: 1,
        onUpdate: (self) => $('[data-stamp]').classList.toggle('is-on', self.progress > 0.86),
      },
    })
      .fromTo('[data-swatch]', { xPercent: 130, rotation: 8 }, { xPercent: 0, rotation: -3, duration: 0.3, ease: 'power3.out' }, 0)
      .to(renkDurum, {
        p: 1, duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => {
          const p = renkDurum.p;
          chip.style.background = gsap.utils.interpolate(e.baslangic, hedefRenk, p);
          delta.textContent = (e.deltaBaslangic + (e.deltaSon - e.deltaBaslangic) * p).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
          code.textContent = `Karışım ${1 + Math.min(3, Math.floor(p * 4))}`;
        },
      }, 0.25)
      .to({}, { duration: 0.2 });

    // 4. Katmanlar
    const layers = $$('[data-layer]');
    const steps = $$('[data-step]');
    const gaugeVal = $('[data-gauge-val]');
    const olcum = { v: 0 };
    const gaugeGuncelle = () => (gaugeVal.textContent = Math.round(olcum.v));
    gsap.set(layers.slice(1), { scaleY: 0, transformOrigin: 'bottom center' });
    gsap.set('[data-layer-tapes] i', { scaleX: 0, transformOrigin: 'left center' });
    gsap.set('[data-sheen]', { xPercent: -120 });
    const lt = gsap.timeline({
      defaults: { ease: 'power2.out', duration: 0.5 },
      scrollTrigger: {
        trigger: '[data-layers]', start: 'top top', end: `+=${steps.length * (isMobile() ? 50 : 55)}%`,
        pin: true, scrub: 0.5, anticipatePin: 1,
        onUpdate: (self) => {
          const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999));
          steps.forEach((s, i) => {
            s.classList.toggle('is-active', i === idx);
            s.classList.toggle('is-done', i < idx);
          });
        },
      },
    });
    lt.to(olcum, { v: 118, onUpdate: gaugeGuncelle }, 0)
      .to('[data-layer-tapes] i', { scaleX: 1, stagger: 0.1 }, 1)
      .to(olcum, { v: 0, onUpdate: gaugeGuncelle, duration: 0.3 }, 1.2)
      .to(layers[1], { scaleY: 1 }, 2)
      .to(layers[2], { scaleY: 1 }, 2.3)
      .to(olcum, { v: 40, onUpdate: gaugeGuncelle }, 2.3)
      .to(layers[3], { scaleY: 1 }, 3)
      .to(layers[4], { scaleY: 1 }, 3.3)
      .to(olcum, { v: 110, onUpdate: gaugeGuncelle }, 3.3)
      .to('[data-sheen]', { xPercent: 120, duration: 0.9, ease: 'power1.inOut' }, 4)
      .to('[data-layer-tapes] i', { scaleX: 0, transformOrigin: 'right center', stagger: 0.1, duration: 0.3 }, 5)
      .fromTo('[data-layer-ok]', { scale: 1.6, autoAlpha: 0, rotation: -14 }, { scale: 1, autoAlpha: 1, rotation: -6, duration: 0.3, ease: 'back.out(2)' }, 5.2)
      .to({}, { duration: 0.5 });

    // 5. Önce/sonra: görünce bir kez kendi kendine kayar
    $$('[data-ba-item]').forEach((item) => {
      ScrollTrigger.create({
        trigger: item, start: 'top 70%', once: true,
        onEnter: () => {
          if (item._touched) return;
          const s = { p: 50 };
          gsap.timeline()
            .to(s, { p: 18, duration: 0.7, ease: 'power2.inOut', onUpdate: () => item._set(s.p) })
            .to(s, { p: 82, duration: 1, ease: 'power2.inOut', onUpdate: () => item._set(s.p) })
            .to(s, { p: 50, duration: 0.7, ease: 'power2.inOut', onUpdate: () => item._set(s.p) });
        },
      });
    });

    // 6. Hakkında: kelime kelime koyulaşır; rakamlar sayar
    const aboutSplit = new SplitText('[data-about-text]', { type: 'words' });
    gsap.fromTo(aboutSplit.words, { opacity: 0.16 }, {
      opacity: 1, stagger: 0.05, ease: 'none',
      scrollTrigger: { trigger: '[data-about-text]', start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
    $$('[data-count]').forEach((el) => {
      const hedef = Number(el.dataset.count);
      const s = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(s, { v: hedef, duration: 1.4, ease: 'power2.out', onUpdate: () => (el.textContent = nf(s.v)) }),
      });
    });
    gsap.from('[data-stats] li', {
      yPercent: 30, rotation: (i) => (i % 2 ? 4 : -4), autoAlpha: 0, stagger: 0.08, duration: 0.6, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: '[data-stats]', start: 'top 85%', once: true },
    });

    // 7. Galeri: yatay
    const track = $('[data-gallery-track]');
    gsap.to(track, {
      x: () => -(track.scrollWidth - track.parentElement.clientWidth),
      ease: 'none',
      scrollTrigger: {
        trigger: '[data-gallery]', start: 'top top', end: () => `+=${track.scrollWidth - track.parentElement.clientWidth}`,
        pin: true, scrub: 0.5, anticipatePin: 1, invalidateOnRefresh: true,
      },
    });

    // 8. Yorumlar: puan sayar, sıralar ters yöne kayar
    const puan = { v: 0 };
    ScrollTrigger.create({
      trigger: '[data-reviews]', start: 'top 75%', once: true,
      onEnter: () => gsap.to(puan, {
        v: d.puan.ortalama, duration: 1.2, ease: 'power2.out',
        onUpdate: () => ($('[data-score]').textContent = puan.v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })),
      }),
    });
    $$('[data-rrow]').forEach((row) => {
      const yon = Number(row.dataset.rrow);
      gsap.fromTo(row, { xPercent: yon > 0 ? 0 : -25 }, {
        xPercent: yon > 0 ? -25 : 0, ease: 'none',
        scrollTrigger: { trigger: '[data-reviews]', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // 9. Markalar: sürekli akar, kaydırma hızına göre hızlanır
    const brandTween = gsap.to('[data-brand-track]', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    if (lenis) {
      gsap.ticker.add(() => {
        const v = Math.min(6, Math.abs(lenis.velocity) / 8);
        brandTween.timeScale(gsap.utils.interpolate(brandTween.timeScale(), 1 + v, 0.1));
      });
    }

    // 10. Final: zemin kartela renklerinden geçer, başlık yükselir
    const ff = $('[data-final-flood]');
    const ft = gsap.timeline({ scrollTrigger: { trigger: '[data-final]', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
    renkler.slice(0, 5).forEach((r, i) => ft.to(ff, { backgroundColor: r.hex, duration: 1 }, i));
    ft.eventCallback('onUpdate', () => {
      const on = onColor(rgbHex(gsap.getProperty(ff, 'backgroundColor')));
      $('[data-final]').style.setProperty('--on', on);
      $('[data-final]').classList.toggle('is-light-text', on !== INK);
    });
    const finalSplit = new SplitText('[data-final-title]', { type: 'lines,words', linesClass: 'final__line' });
    gsap.from(finalSplit.words, {
      yPercent: 110, stagger: 0.05, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: '[data-final]', start: 'top 70%', once: true },
    });
  }

  // Masaüstü: mıknatıslı butonlar
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.btn').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3.out' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3.out' });
      b.addEventListener('pointermove', (ev) => {
        const r = b.getBoundingClientRect();
        xTo((ev.clientX - r.left - r.width / 2) * 0.25);
        yTo((ev.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener('pointerleave', () => (xTo(0), yTo(0)));
    });
  }

  addEventListener('resize', () => {
    fitHeroWord();
  });
}
