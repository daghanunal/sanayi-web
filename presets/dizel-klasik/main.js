// Ateşleme (klasik aile, dizel enjektör): çekiçli boya makine yeşili, kemik beyazı kâğıt, tek sinyal kırmızısı.
// Başlıklar Asap Condensed, gövde Asap, etiket ve rakamlar Stick No Bills. WebGL yok.
// İmza anı hero'da: fotoğraf dört silindire bölünür, kaydırdıkça 1-3-4-2 sırasıyla ateşler (tempo artar);
// sonunda şeritler ayrılıp dört enjektör olur: üçü sağlam, 3 numara arızalı.
import base from '../../data/sektor-dizel.json';
import extra from '../../data/dizel-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...base, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const small = () => innerWidth < 900;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar -----------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımın enjektörleri için bilgi almak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-agir-lead]').textContent = d.agirMetin;
$('[data-year]').textContent = new Date().getFullYear();

const agirYorum = d.yorumlar.find((y) => /actros|kamyon|çekici|tır/i.test(`${y.arac} ${y.metin}`)) || d.yorumlar[0];
$('[data-agir-quote]').innerHTML = `<p>“${esc(agirYorum.metin)}”</p><footer class="tag">${esc(agirYorum.ad)} · ${esc(agirYorum.arac)}</footer>`;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => (el.textContent = status.text));
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- İMZA: dört silindir -----------------------------------------------------
const ORDER = [0, 2, 3, 1]; // 1-3-4-2 (0 tabanlı)
const sonuc = d.tezgahSonuc || [];
const hero = $('.hero');
const cyl = $('[data-cyl]');
const heroSrc = () => asset(small() ? '/img/dizel-klasik/giris-m.jpg' : '/img/dizel-klasik/giris.jpg');
cyl.innerHTML = [0, 1, 2, 3].map((i) => {
  const s = sonuc[i] || { no: i + 1, durum: 'Sağlam', not: '' };
  const bad = /arız/i.test(s.durum);
  return `
  <div class="slice${bad ? ' is-bad' : ''}" style="--i:${i}">
    <div class="slice__in"><img src="${esc(heroSrc())}" alt="" decoding="async" ${i === 0 ? 'fetchpriority="high"' : ''} /></div>
    <span class="slice__flash"></span>
    <span class="slice__tint"></span>
    <div class="slice__label"><b>${esc(s.no)}</b><span>${esc(s.durum)}</span><small>${esc(s.not)}</small></div>
  </div>`;
}).join('');
const slices = $$('.slice', cyl);
const sliceIn = slices.map((s) => $('.slice__in', s));
const flashes = slices.map((s) => $('.slice__flash', s));
const labels = slices.map((s) => $('.slice__label', s));
const tints = slices.map((s) => $('.slice__tint', s));
const orderLis = $$('[data-order] li');
const copy = $('.hero__copy'), mid = $('.hero__mid'), endEl = $('.hero__end'), hint = $('.hero__hint'), orderEl = $('.order');
const shade = $('.hero__shade');

// Ateşleme olayları: tempo giderek artar
const F0 = 0.1, F1 = 0.62, N = 16;
const events = Array.from({ length: N }, (_, k) => ({ t: F0 + (F1 - F0) * Math.pow(k / N, 0.62), c: ORDER[k % 4] }));
const clamp = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let lastLit = -1;
function render(p) {
  // her silindir için son ateşleme
  const pulse = [0, 0, 0, 0];
  let lit = -1;
  for (let k = 0; k < N; k++) {
    const e = events[k];
    if (p < e.t) break;
    const w = k < N - 1 ? Math.max(0.012, (events[k + 1].t - e.t) * 1.6) : 0.03;
    const dt = (p - e.t) / w;
    if (dt < 1) pulse[e.c] = Math.max(pulse[e.c], 1 - dt);
    lit = k % 4;
  }
  if (p > F1 + 0.03) lit = -1;
  if (lit !== lastLit) {
    lastLit = lit;
    orderLis.forEach((li, i) => li.classList.toggle('is-on', i === lit));
  }
  // ayrılma: silindirler enjektöre dönüşür
  const sp = eIO(seg(p, 0.64, 0.8));
  const gap = sp * (small() ? 8 : 18);
  cyl.style.setProperty('--gap', `${gap.toFixed(1)}px`);
  const mob = small();
  const W = innerWidth, H = innerHeight;
  // son durum: telefonda başlığın altı ile alt çubuğun üstü, masaüstünde sağ yarı
  const T = mob ? Math.min(236, H * 0.28) : 108, B = mob ? 104 : 56;
  const L = mob ? 14 : W * 0.46, R = mob ? 14 : Math.max(24, W * 0.045);
  cyl.style.inset = `${(T * sp).toFixed(1)}px ${(R * sp).toFixed(1)}px ${(B * sp).toFixed(1)}px ${(L * sp).toFixed(1)}px`;
  cyl.style.transform = `scale(${(1.06 - 0.06 * seg(p, 0, F1)).toFixed(4)})`;
  for (let i = 0; i < 4; i++) {
    const q = pulse[i];
    const stroke = Math.sin(q * Math.PI) * (mob ? 30 : 38); // aşağı, yukarı
    const lift = sp * (slices[i].classList.contains('is-bad') ? -14 : 0);
    sliceIn[i].style.transform = `translate3d(0, ${stroke.toFixed(1)}px, 0)`;
    slices[i].style.transform = lift ? `translate3d(0, ${lift.toFixed(1)}px, 0)` : '';
    flashes[i].style.opacity = (q * q).toFixed(3);
    sliceIn[i].style.filter = sp > 0.01 ? `grayscale(${(sp * 0.7).toFixed(2)})` : '';
    labels[i].style.opacity = eOut(seg(p, 0.72, 0.82)).toFixed(3);
    tints[i].style.opacity = (seg(p, 0.74, 0.84) * (slices[i].classList.contains('is-bad') ? 0.62 : 0.25)).toFixed(3);
  }
  // metinler
  const c = seg(p, 0.02, 0.12);
  copy.style.opacity = (1 - c).toFixed(3);
  copy.style.transform = `translate3d(0, ${(-c * 40).toFixed(1)}px, 0)`;
  copy.style.visibility = p > 0.13 ? 'hidden' : 'visible';
  hint.style.opacity = (1 - seg(p, 0, 0.04)).toFixed(3);
  orderEl.style.opacity = (seg(p, 0.06, 0.12) * (1 - seg(p, 0.64, 0.7))).toFixed(3);
  const m = seg(p, 0.26, 0.32) * (1 - seg(p, 0.48, 0.54));
  mid.style.opacity = m.toFixed(3);
  mid.style.transform = `translate3d(0, ${((1 - m) * 18).toFixed(1)}px, 0)`;
  const en = eOut(seg(p, 0.72, 0.86));
  endEl.style.opacity = en.toFixed(3);
  endEl.style.pointerEvents = en > 0.5 ? 'auto' : 'none';
  mid.style.visibility = m > 0.001 ? 'visible' : 'hidden';
  endEl.style.transform = `translate3d(0, ${((1 - en) * 26).toFixed(1)}px, 0)`;
  shade.style.opacity = (0.55 + 0.25 * sp - 0.3 * seg(p, 0.08, 0.2) * (1 - sp)).toFixed(3);
}

if (reducedMotion) {
  hero.classList.add('is-static');
  render(0);
} else {
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small() ? 2.6 : 2.8)}`,
    pin: '.hero__pin', scrub: 0.35, anticipatePin: 1,
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => render(self.progress),
  });
  render(0);

  // Açılış: yazılar gelir, motor bir tur "marş" alır
  gsap.from('.hero__name', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.05 });
  gsap.from(['.hero__since', '.hero__slogan', '.hero__cta'], { y: 14, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.2 });
  const crank = gsap.timeline({ delay: 0.55 });
  [0, 2, 3, 1, 0, 2, 3, 1].forEach((c, k) => {
    const o = { q: 1 };
    crank.fromTo(o, { q: 1 }, {
      q: 0, duration: 0.34, ease: 'power2.out',
      onUpdate: () => {
        if (window.scrollY > 4) return;
        sliceIn[c].style.transform = `translate3d(0, ${(Math.sin(o.q * Math.PI) * 18).toFixed(1)}px, 0)`;
        flashes[c].style.opacity = (o.q * o.q * 0.9).toFixed(3);
      },
    }, k * (0.3 - k * 0.018));
  });
}

// --- Rakamlar ---------------------------------------------------------------
const statsEl = $('[data-stats]');
statsEl.innerHTML = d.istatistikler.map((s, i) => {
  const v = s.kurulustanHesapla ? yil : s.deger;
  return `<li class="stat"><span class="stat__n tag">${['1', '3', '4', '2'][i] ?? i + 1}</span><p class="stat__v"><b data-count="${v}">${nf(v)}</b><span>${esc(s.sonek)}</span></p><p class="stat__l">${esc(s.etiket)}</p></li>`;
}).join('');
if (!reducedMotion) {
  $$('[data-count]', statsEl).forEach((el, i) => {
    const v = Number(el.dataset.count), o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v, duration: 1.5, ease: 'power2.out', delay: [0, 2, 3, 1][i] * 0.14,
      scrollTrigger: { trigger: statsEl, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = nf(o.v)),
    });
  });
}

// --- Hizmetler -------------------------------------------------------------
const HIZMET_IMG = ['k-dijital-olcum', 'parca', 'k-motor-ustu', 'k-parca-tepsisi', 'pompa', 'k-komparator', 'k-kamyon-bakim', 'k-silindir-kapak'];
const HIZMET_ALT = [
  'Dijital mikrometre ile hassas ölçüm', 'Yağlı elde sökülmüş parçalar', 'Dizel motor üzerinde anahtarla çalışan usta',
  'Sökülen parçalar tepside sırayla diziliyor', 'Paletin üzerinde eski bir dizel motor ve pompası', 'Hassas komparatör saati',
  'Kaputu açık kamyonun motor bölmesinde bakım', 'Silindir kapağında çalışan ustanın elleri',
];
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="svc${i < 2 ? ' svc--top' : ''}${[0, 3, 4, 7].includes(i) ? ' svc--wide' : ''}">
    <figure class="svc__img"><img src="${esc(asset(`/img/dizel-klasik/${HIZMET_IMG[i % HIZMET_IMG.length]}.jpg`))}" alt="${esc(HIZMET_ALT[i % HIZMET_ALT.length])}" loading="lazy" decoding="async" /></figure>
    <div class="svc__body">
      <p class="svc__n tag">${String(i + 1).padStart(2, '0')}</p>
      <h3 class="svc__t">${esc(h.baslik)}</h3>
      <p class="svc__d">${esc(h.aciklama)}</p>
      ${h.sure ? `<p class="svc__s tag">Süre · ${esc(h.sure)}</p>` : ''}
    </div>
  </li>`).join('');

// --- Süreç -------------------------------------------------------------------
const ZAMAN = ['Dinleme', 'Ölçüm', 'Karar', 'Onarım', 'Teslim'];
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__n">${i + 1}</span>
    <div>
      <p class="step__k tag">${esc(ZAMAN[i] || `${i + 1}. adım`)}</p>
      <h3 class="step__t">${esc(s.baslik)}</h3>
      <p class="step__d">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('') + (d.garanti ? `<li class="step step--garanti"><span class="step__n">✓</span><div><p class="step__k tag">Garanti</p><p class="step__d">${esc(d.garanti)}</p></div></li>` : '');

// --- Galeri --------------------------------------------------------------------
const GAL = ['k-usta', 'k-eksantrik', 'k-kamyon-atolye', 'k-dizel-kapak', 'k-cekici', 'k-yolda'];
const altOf = (name) => d.galeri?.find((g) => g.src.includes(name.replace(/^k-/, '')))?.alt || '';
$('[data-gallery]').innerHTML = GAL.map((g, i) => `
  <figure class="gal gal--${i + 1}"><img src="${esc(asset(`/img/dizel-klasik/${g}.jpg`))}" alt="${esc(altOf(g))}" loading="lazy" decoding="async" /></figure>`).join('');

// --- Yorumlar --------------------------------------------------------------------
const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-score]').textContent = String(d.puan.ortalama).replace('.', ',');
$('[data-stars]').innerHTML = star(Math.round(d.puan.ortalama));
$('[data-review-count]').textContent = `${d.puan.adet} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.filter((y) => y !== agirYorum || d.yorumlar.length < 4).map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="${esc(y.puan)} yıldız">${star(y.puan)}</p>
    <p class="rev__t">${esc(y.metin)}</p>
    <p class="rev__who"><b>${esc(y.ad)}</b><span class="tag">${esc(y.arac)}</span></p>
  </li>`).join('');

// --- Markalar --------------------------------------------------------------------
const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}</div><div class="marka__row" aria-hidden="true">${brandRow}</div>`;

// --- Saatler + harita ---------------------------------------------------------------
const ORDER_W = [1, 2, 3, 4, 5, 6, 0];
const pos = (g) => ORDER_W.indexOf(['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'].indexOf(g));
const todayPos = ORDER_W.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, s]) => {
  const [lo, hi = lo] = g.split(' – ').map(pos);
  const on = todayPos >= lo && todayPos <= hi;
  return `<div class="${on ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`;
}).join('');
const mapEl = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapEl);

// --- Üst çubuk ---------------------------------------------------------------------
const top = $('.top');
ScrollTrigger.create({
  trigger: '.band', start: 'top 64px',
  onEnter: () => top.classList.add('is-solid'), onLeaveBack: () => top.classList.remove('is-solid'),
});

// --- Ölçülü hareketler -----------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();
  const rise = (sel, opts = {}) => ScrollTrigger.batch(sel, {
    start: 'top 88%', once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true, ...opts }),
  });
  gsap.set('.h2, .lead, .eyebrow, .svc, .step, .rev, .gal, .stat', { opacity: 0 });
  rise('.h2'); rise('.lead'); rise('.eyebrow');
  rise('.svc'); rise('.step'); rise('.rev'); rise('.stat'); rise('.gal');

  // Hizmet fotoğrafları: yavaş kayma
  $$('.svc__img img, .about__photo img, .surec__photo img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // Süreç: ilerleme çizgisi
  gsap.fromTo('.steps', { '--prog': 0 }, { '--prog': 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  // Ağır vasıta: arka plan yakınlaşır
  gsap.fromTo('.agir__bg', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.agir', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.final__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true } });
  // Final: sıra rakamları tek tek yanar
  ScrollTrigger.create({
    trigger: '.final', start: 'top 70%', once: true,
    onEnter: () => {
      const lis = $$('.final__order li');
      const tl = gsap.timeline({ repeat: 2 });
      lis.forEach((li) => tl.to(li, { color: '#e0362c', duration: 0.12 }).to(li, { color: 'rgba(240,238,230,.45)', duration: 0.35 }));
      tl.eventCallback('onComplete', () => lis.forEach((li) => (li.style.color = '')));
    },
  });
}
