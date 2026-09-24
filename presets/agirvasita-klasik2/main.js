import tonaj from '../../data/tonaj.json';
import ek from '../../data/agirvasita-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

// Tonaj işletme verisi + bu tasarıma özel metinler (galeri de buradan gelir)
const d = boot({ ...tonaj, ...ek, isletme: { ...tonaj.isletme, ...(ek.isletme || {}) } });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = (n, frac = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: frac, maximumFractionDigits: frac });
const yil = new Date().getFullYear() - d.isletme.kurulus;
const mobil = matchMedia('(max-width: 760px)').matches;

// --- Metinler ------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti, yolYardim: d.yolYardim,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-wa-yardim]').forEach((a) => (a.href = waHref(d, d.yardimBlok.mesaj)));
$('[data-wa-filo]').href = waHref(d, `Merhaba ${d.isletme.ad}, filomuzun bakımı için görüşmek istiyorum. Araç sayımız: `);
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));

const set = (sel, text) => $$(sel).forEach((el) => (el.textContent = text ?? ''));
set('[data-hero-ad]', d.isletme.ad);
set('[data-tabela-ust]', d.tabela.ust);
set('[data-tabela-yon]', d.tabela.yon);
set('[data-km]', nf(d.tabela.km, 1));
set('[data-vardin-ust]', `${d.tabela.yon} · 0 km`);
set('[data-vardin-ad]', d.isletme.ad);
set('[data-yardim-etiket]', d.yardimBlok.etiket);
set('[data-yardim-baslik]', d.yardimBlok.baslik);
set('[data-yardim-not]', d.yardimBlok.not);
set('[data-cikis-baslik]', d.cikisBaslik);
set('[data-cikis-metin]', d.cikisMetin);
set('[data-tako-baslik]', d.takograf.baslik);
set('[data-tako-metin]', d.takograf.metin);
set('[data-guzergah-baslik]', d.guzergahBaslik);
set('[data-guzergah-metin]', d.guzergahMetin);
set('[data-filo-baslik]', d.filo.baslik);
set('[data-filo-metin]', d.filo.metin);
set('[data-surec-baslik]', d.surecBaslik);
set('[data-yorum-baslik]', d.yorumBaslik);
set('[data-galeri-baslik]', d.galeriBaslik);
set('[data-marka-baslik]', d.markaBaslik);
set('[data-konum-baslik]', d.konumBaslik);
set('[data-final-baslik]', d.finalBaslik);
set('[data-final-metin]', d.finalMetin);
set('[data-copy]', `© ${new Date().getFullYear()} ${d.isletme.ad}. Fotoğraflar: Pexels.`);

// Uzun dükkân adları tabelaya sığsın
const adUz = d.isletme.ad.length;
$('[data-hero-ad]').style.setProperty('--ad-k', adUz > 22 ? 0.72 : adUz > 16 ? 0.86 : 1);

// --- Km taşları (istatistik) --------------------------------------------
$('[data-taslar]').innerHTML = d.istatistikler
  .map((s) => {
    const v = s.deger === 'kurulus' ? yil : s.deger;
    return `<li class="tas" data-reveal>
      <span class="tas__bas" aria-hidden="true"></span>
      <span class="tas__deger"><b class="tas__sayi" data-say="${Number(v) || 0}">${esc(nf(Number(v) || 0))}</b><span class="tas__sonek">${esc(s.sonek)}</span></span>
      <span class="tas__etiket">${esc(s.etiket)}</span>
    </li>`;
  })
  .join('');

// --- Çıkış levhaları (hizmetler) ----------------------------------------
const ok = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 36 L34 14 M18 14 H34 V30"/></svg>`;
$('[data-hizmetler]').innerHTML = d.hizmetler
  .map(
    (h, i) => `<li class="cikis" data-cikis>
      <span class="cikis__no"><small>Çıkış</small>${i + 1}</span>
      <div class="cikis__govde">
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
      </div>
      <span class="cikis__sure">${esc(h.sure)}</span>
      <span class="cikis__ok">${ok}</span>
    </li>`
  )
  .join('');

// --- Güzergah duraklar ---------------------------------------------------
const ondalik = (v) => String(v).split('.')[1]?.length ?? 0;
const fmt = (v, dec) => nf(v, dec);
$('[data-duraklar]').innerHTML = d.alt
  .map((a, i) => {
    const o = a.olcum;
    const maks = Math.max(o.once, o.sonra, o.iyi) * 1.15;
    const dec = Math.max(ondalik(o.once), ondalik(o.sonra));
    return `<li class="durak" data-durak>
      <span class="durak__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
      <div class="durak__kart">
        <p class="durak__ad">${esc(a.durak)}</p>
        <h3>${esc(a.baslik)}</h3>
        <p>${esc(a.metin)}</p>
        <div class="led" style="--once:${(o.once / maks).toFixed(3)};--sonra:${(o.sonra / maks).toFixed(3)};--iyi:${(o.iyi / maks).toFixed(3)}">
          <p class="led__etiket">${esc(o.etiket)}</p>
          <div class="led__satir">
            <span class="led__grup"><span class="led__ne">Geliş</span><span><b class="led__deger led__deger--kirmizi">${esc(fmt(o.once, dec))}</b></span></span>
            <span class="led__ok" aria-hidden="true">→</span>
            <span class="led__grup"><span class="led__ne">Teslim</span><span><b class="led__deger" data-led-sonra="${o.sonra}" data-from="${o.once}" data-dec="${dec}">${esc(fmt(o.sonra, dec))}</b><span class="led__birim">${esc(o.birim)}</span></span></span>
          </div>
          <div class="led__bar" aria-hidden="true"><i></i><em></em></div>
        </div>
      </div>
    </li>`;
  })
  .join('');

// --- Filo, süreç ----------------------------------------------------------
$('[data-filo-maddeler]').innerHTML = d.filo.maddeler.map((m) => `<li>${esc(m)}</li>`).join('');
$('[data-surec]').innerHTML = d.surec
  .map(
    (s, i) => `<li class="levha" data-levha>
      <span class="levha__no">${i + 1}</span>
      <h3>${esc(s.baslik)}</h3>
      <p>${esc(s.aciklama)}</p>
    </li>`
  )
  .join('');

// --- Yorum panosu ----------------------------------------------------------
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-puan-adet]').textContent = `${d.puan.adet} değerlendirme`;
$('[data-yildiz]').innerHTML = icons.star.repeat(5);
const yorumlar = d.yorumlar;
const noktaKap = $('[data-pano-nokta]');
noktaKap.innerHTML = yorumlar
  .map((y, i) => `<button type="button" role="tab" aria-label="${esc(y.ad)} yorumu" data-i="${i}"></button>`)
  .join('');
let aktif = 0, panoZaman = null, panoGorunur = false;
const metinEl = $('[data-pano-metin]'), kimEl = $('[data-pano-kim]');
function yorumGoster(i, anim = true) {
  aktif = (i + yorumlar.length) % yorumlar.length;
  const y = yorumlar[aktif];
  const yaz = () => {
    metinEl.textContent = `“${y.metin}”`;
    kimEl.textContent = `${y.ad} · ${y.arac} · ${'★'.repeat(y.puan)}`;
  };
  $$('button', noktaKap).forEach((b, j) => b.setAttribute('aria-selected', j === aktif));
  if (!anim || reducedMotion) return yaz();
  gsap.to([metinEl, kimEl], {
    opacity: 0, duration: 0.18, ease: 'steps(3)',
    onComplete: () => { yaz(); gsap.to([metinEl, kimEl], { opacity: 1, duration: 0.24, ease: 'steps(4)' }); },
  });
}
function panoSayac() {
  clearInterval(panoZaman);
  if (panoGorunur && !reducedMotion) panoZaman = setInterval(() => yorumGoster(aktif + 1), 5200);
}
noktaKap.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  yorumGoster(Number(b.dataset.i));
  panoSayac();
});
yorumGoster(0, false);
new IntersectionObserver(([e]) => { panoGorunur = e.isIntersecting; panoSayac(); }).observe($('[data-pano]'));

// --- Galeri, markalar -------------------------------------------------------
$('[data-galeri]').innerHTML = d.galeri
  .map(
    (g, i) => `<figure class="kare">
      <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" />
      <figcaption><span>${String(i + 1).padStart(2, '0')}</span>${esc(g.etiket)}</figcaption>
    </figure>`
  )
  .join('');
$('[data-markalar]').innerHTML = d.markalar.map((m) => `<li>${esc(m)}</li>`).join('');

// --- Saatler + canlı durum -------------------------------------------------
function durumYaz() {
  const s = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.textContent = s.text;
    el.classList.toggle('is-open', s.open);
  });
  const big = $('[data-status-big]');
  big.innerHTML = `<span class="lamba ${s.open ? 'is-open' : ''}" aria-hidden="true"></span>${esc(s.text)}`;
}
durumYaz();
setInterval(durumYaz, 60000);
const bugun = new Date().getDay();
const gunIdx = { Pazartesi: 1, Salı: 2, Çarşamba: 3, Perşembe: 4, Cuma: 5, Cumartesi: 6, Pazar: 0 };
$('[data-saatler]').innerHTML = groupedHours(d.saatler)
  .map(([g, s]) => {
    const [a, b] = g.split(' – ');
    const bas = gunIdx[a], son = gunIdx[b ?? a];
    const icinde = bas <= son ? bugun >= bas && bugun <= son : bugun === bas;
    return `<div class="${icinde ? 'is-bugun' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`;
  })
  .join('');

// Harita yaklaşınca yüklenir
const harita = $('[data-harita]');
new IntersectionObserver(
  ([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    harita.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  },
  { rootMargin: '600px 0px' }
).observe(harita);

// Header: hero'dan sonra koyulaşır
const top = $('[data-top]');
ScrollTrigger.create({
  start: () => innerHeight * 0.5, end: 'max',
  onToggle: (self) => top.classList.toggle('is-solid', self.isActive),
});

// --- Hareket ---------------------------------------------------------------
if (reducedMotion) {
  document.documentElement.classList.add('rm');
} else {
  initSmoothScroll();
  hero();
  bolumler();
}

// İMZA: köprü tabelasının altından geçmek
function hero() {
  const pin = $('[data-hero-pin]');
  const gantry = $('[data-gantry]');
  const tabela = $('[data-tabela]');
  const ic = $('[data-tabela-ic]');
  const km = $('[data-km]');
  const sayac = { v: d.tabela.km };

  // Açılış: tabela yukarıdan iner, ışık yanar
  const acilis = gsap.timeline({ defaults: { ease: 'power3.out' } });
  acilis
    .from('[data-hero-foto]', { scale: 1.25, duration: 1.8, ease: 'power2.out' }, 0)
    .from(gantry, { yPercent: -60, opacity: 0, duration: 1.1 }, 0.1)
    .from($$('.tabela__ust, .tabela__ad, .tabela__cikis', ic), { y: 18, opacity: 0, stagger: 0.09, duration: 0.7 }, 0.55)
    .from($$('.hero__slogan, .hero__cta, .hero__ipucu'), { y: 24, opacity: 0, stagger: 0.08, duration: 0.7 }, 0.8);

  // Tabelanın ekranı tam kaplayacağı ölçek ve kayma
  const hedef = () => {
    const r = tabela.getBoundingClientRect();
    const gr = gantry.getBoundingClientRect();
    const s = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.3;
    // tabela merkezini ekran merkezine taşı (gantry ölçeği tabela merkezinden)
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { s, x: innerWidth / 2 - cx, y: innerHeight / 2 - cy, ox: cx - gr.left, oy: cy - gr.top };
  };
  let h = hedef();
  gsap.set(gantry, { transformOrigin: () => `${h.ox}px ${h.oy}px` });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: pin, start: 'top top', end: () => `+=${innerHeight * (mobil ? 1.5 : 1.7)}`,
      pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
      onRefreshInit: () => { gsap.set(gantry, { clearProps: 'transform' }); h = hedef(); gsap.set(gantry, { transformOrigin: `${h.ox}px ${h.oy}px` }); },
    },
  });
  tl.to('[data-hero-alt]', { opacity: 0, y: 40, duration: 0.25 }, 0)
    .to('[data-hero-foto]', { scale: 1.45, duration: 1 }, 0)
    .to('[data-serit]', { yPercent: 50, duration: 1 }, 0)
    .to(sayac, {
      v: 0, duration: 0.7,
      onUpdate: () => { km.textContent = nf(Math.max(0, sayac.v), 1); },
    }, 0)
    .to(gantry, { scale: () => h.s, x: () => h.x, y: () => h.y, duration: 0.8, ease: 'power2.in' }, 0)
    .fromTo(tabela, { '--parlak': 1 }, { '--parlak': 0, duration: 0.15 }, 0.6)
    .to(ic, { opacity: 0, duration: 0.2 }, 0.62)
    .to('.gantry__kiris', { opacity: 0, duration: 0.15 }, 0.55)
    .to('.hero__karart', { opacity: 1, duration: 0.3 }, 0.6)
    .fromTo('[data-vardin]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, 0.8)
    .fromTo('[data-vardin] .vardin__cizgi', { scaleX: 0 }, { scaleX: 1, duration: 0.2 }, 0.8)
    .fromTo('[data-parlama]', { xPercent: -120 }, { xPercent: 260, duration: 0.55, ease: 'power1.in' }, 0.05);
}

function bolumler() {
  // Başlıklar: satır satır yükselir
  $$('[data-split]').forEach((el) => {
    const st = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'satir' });
    gsap.from(st.lines, {
      yPercent: 105, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // Genel beliriş
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }),
  });

  // Km taşları: sayılar sayar
  $$('[data-say]').forEach((el) => {
    const hedef = Number(el.dataset.say);
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = nf(Math.round(o.v))),
    });
  });

  // Çıkış levhaları sağdan geçer, oku döner
  ScrollTrigger.batch('[data-cikis]', {
    start: 'top 90%', once: true,
    onEnter: (els) => {
      gsap.from(els, { x: mobil ? 60 : 140, opacity: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out' });
      gsap.from(els.map((e) => e.querySelector('.cikis__ok svg')), { rotate: -90, duration: 0.9, stagger: 0.09, ease: 'back.out(2)', delay: 0.2 });
    },
  });

  // Güzergah: yol dolar, her durakta LED değeri gelişten teslime akar
  gsap.fromTo('[data-rota-dolgu]', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-rota]', start: 'top 60%', end: 'bottom 70%', scrub: true },
  });
  $$('[data-durak]').forEach((el) => {
    const b = el.querySelector('[data-led-sonra]');
    const from = Number(b.dataset.from), to = Number(b.dataset.ledSonra);
    const o = { v: from };
    const led = el.querySelector('.led');
    ScrollTrigger.create({
      trigger: el, start: 'top 72%', once: true,
      onEnter: () => {
        el.classList.add('is-aktif');
        gsap.fromTo(led, { '--p': 0 }, { '--p': 1, duration: 1.3, ease: 'power2.inOut' });
        gsap.to(o, { v: to, duration: 1.3, ease: 'power2.inOut', onUpdate: () => (b.textContent = fmt(o.v, Number(b.dataset.dec))) });
      },
    });
    gsap.from(el.querySelector('.durak__kart'), {
      x: 50, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  // Filo fotoğrafı: hafif parallax
  gsap.fromTo('[data-parallax]', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '[data-parallax-kap]', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Levhalar: direğe asılı gibi sallanarak gelir
  ScrollTrigger.batch('[data-levha]', {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.from(els, { rotate: -8, y: -30, opacity: 0, transformOrigin: '50% 0', duration: 1, stagger: 0.12, ease: 'elastic.out(1, 0.5)' }),
  });

  // Galeri kareleri
  ScrollTrigger.batch('.kare', {
    start: 'left 95%', once: true,
    onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }),
  });
}
