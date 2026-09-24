// İkaz (klasik aile, çekici): soğuk beton zemin, asfalt mürekkebi, reflektör kırmızısı.
// Saira Extra Condensed başlıklar, Saira Stencil One rakamlar (çekici kasasındaki şablon yazı).
// İmza anı hero'da: yolda kalan aracın arkasına konan ikaz üçgeni bir pencere olur; kaydırdıkça
// büyüyüp ekranı yutar, sonra varış sayacı 45 dakikadan sıfıra iner ve kare yüklemeye geçer. WebGL yok.
import base from '../../data/sektor-cekici.json';
import extra from '../../data/cekici-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, GUNLER, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...base, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const img = (name) => asset(`/img/cekici-klasik/${name}.jpg`);
const star = icons.star;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- Bağlamalar -----------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
const konumMesaj = `Merhaba ${d.isletme.ad}, yolda kaldım. Konumumu gönderiyorum:`;
$$('[data-wa-konum]').forEach((a) => (a.href = waHref(d, konumMesaj)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri · 7/24`;
$('[data-years]').textContent = `${yil} yıldır Ankara yollarındayız.`;
$('[data-year]').textContent = new Date().getFullYear();

const allDay = d.yediYirmiDort || d.saatler.every((s) => s === '00:00-24:00');
const status = allDay ? { open: true, text: 'Şu an açığız · 7/24, bayram dahil' } : openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);
$('[data-hours]').innerHTML = allDay
  ? `<li><span>Her gün</span><b>24 saat</b></li><li><span>Bayram ve resmî tatil</span><b>Açık</b></li><li><span>Gece hattı</span><b>Telefonu biz açarız</b></li>`
  : groupedHours(d.saatler).map(([g, s]) => `<li><span>${esc(g)}</span><b>${esc(s)}</b></li>`).join('');

// --- Hizmetler: durum seçici ------------------------------------------------
const durumlar = (d.durumlar || []).filter((x) => d.hizmetler[x.hizmet]);
const chipsEl = $('[data-chips]');
chipsEl.innerHTML = durumlar
  .map((x, i) => `<button class="chip" role="tab" type="button" data-i="${i}" aria-selected="false"><span class="chip__no">${String(i + 1).padStart(2, '0')}</span><span class="chip__t">${esc(x.etiket)}</span><span class="chip__s">${esc(d.hizmetler[x.hizmet].baslik)}</span></button>`)
  .join('');
const panel = {
  img: $('[data-panel-img]'), no: $('[data-panel-no]'), sure: $('[data-panel-sure]'),
  title: $('[data-panel-title]'), text: $('[data-panel-text]'), wa: $('[data-panel-wa]'),
  konum: $('[data-konum]'), konumText: $('[data-konum-text]'),
};
let aktif = 0;
let konumLink = '';
function panelWa() {
  const x = durumlar[aktif];
  const msg = `Merhaba ${d.isletme.ad}, ${x.mesaj}.${konumLink ? ` Konumum: ${konumLink}` : ' Konumumu da gönderiyorum.'}`;
  panel.wa.href = waHref(d, msg);
}
function sec(i, anim = true) {
  aktif = i;
  const x = durumlar[i], h = d.hizmetler[x.hizmet];
  $$('.chip', chipsEl).forEach((c, j) => c.setAttribute('aria-selected', String(j === i)));
  const cb = $$('.chip', chipsEl)[i];
  if (anim && chipsEl.scrollWidth > chipsEl.clientWidth) chipsEl.scrollTo({ left: cb.offsetLeft - 16, behavior: reducedMotion ? 'auto' : 'smooth' });
  const fill = () => {
    panel.img.src = asset(x.gorsel);
    panel.img.alt = h.baslik;
    panel.no.textContent = `${String(i + 1).padStart(2, '0')}/${String(durumlar.length).padStart(2, '0')}`;
    panel.sure.textContent = h.sure || '';
    panel.title.textContent = h.baslik;
    panel.text.textContent = h.aciklama;
    panelWa();
  };
  if (!anim || reducedMotion) return fill();
  gsap.timeline()
    .to('[data-panel] .panel__body > *', { opacity: 0, y: -8, duration: 0.14, stagger: 0.02, ease: 'power1.in' })
    .add(fill)
    .fromTo(panel.img, { clipPath: 'polygon(50% 100%, 50% 100%, 50% 100%)' }, { clipPath: 'polygon(50% -110%, 190% 100%, -90% 100%)', duration: 0.55, ease: 'power3.out' })
    .fromTo('[data-panel] .panel__body > *', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }, '<0.05');
}
chipsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (b) sec(Number(b.dataset.i));
});
chipsEl.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const n = (aktif + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + durumlar.length) % durumlar.length;
  sec(n);
  $$('.chip', chipsEl)[n].focus();
});
panel.konum.addEventListener('change', () => {
  if (!panel.konum.checked) {
    konumLink = '';
    panel.konumText.textContent = 'Mesaja konumumu ekle';
    return panelWa();
  }
  if (!navigator.geolocation) {
    panel.konumText.textContent = 'Konum alınamadı; WhatsApp\'tan konum gönderin';
    return;
  }
  panel.konumText.textContent = 'Konum alınıyor…';
  navigator.geolocation.getCurrentPosition(
    (p) => {
      konumLink = `https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`;
      panel.konumText.textContent = 'Konumunuz mesaja eklendi';
      panelWa();
    },
    () => {
      panel.konum.checked = false;
      panel.konumText.textContent = 'Konum izni yok; WhatsApp\'tan konum gönderin';
    },
    { enableHighAccuracy: true, timeout: 9000 }
  );
});
sec(0, false);

// --- Rakamlar ---------------------------------------------------------------
$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const v = s.kurulustanHesapla ? yil : s.deger;
    const statik = s.sonek === '/7';
    return `<div class="stat"><p class="stat__v">${statik ? '7/24' : `<span data-count="${v}">0</span>${s.sonek ? `<small>${esc(s.sonek.trim())}</small>` : ''}`}</p><p class="stat__l">${esc(s.etiket)}</p></div>`;
  })
  .join('');

// --- Süreç + mesajlar -------------------------------------------------------
const tick = `<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6.5 4.5 10 11 2M7 8.5 8.5 10 16.5 2"/></svg>`;
$('[data-steps]').innerHTML = d.surec
  .map((s, i) => {
    const m = (d.mesajlar || [])[i];
    const fotolar = m?.fotolar?.length
      ? `<span class="bubble__pics bubble__pics--${Math.min(m.fotolar.length, 4)}">${m.fotolar.map((f) => `<img src="${esc(asset(f))}" alt="" loading="lazy" decoding="async" />`).join('')}</span>`
      : '';
    const bubble = m
      ? `<div class="chat"><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span><p class="bubble bubble--${m.kim === 'siz' ? 'siz' : 'biz'}">${fotolar}<span class="bubble__who">${m.kim === 'siz' ? 'Siz' : esc(d.isletme.ad)}</span>${esc(m.metin)}<span class="bubble__meta">${tick}</span></p></div>`
      : '';
    return `<li class="adim"><div class="adim__txt"><span class="adim__no">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>${bubble}</li>`;
  })
  .join('');

// --- Fotoğraf şeridi --------------------------------------------------------
const strip = ['cekici-sehir', 'zincir-sabitleme', 'aku-kablo', 'agir-vasita', 'lastik-degisimi', 'gece-yol', 'arac-tasima', 'agir-kurtarma'];
const stripAlts = Object.fromEntries((d.galeri || []).map((g) => [g.src.split('/').pop().replace('.jpg', ''), g.alt]));
const stripHtml = strip.map((n) => `<figure><img src="${esc(img(n))}" alt="${esc(stripAlts[n] || '')}" loading="lazy" decoding="async" /></figure>`).join('');
$('[data-strip]').innerHTML = `<div class="serit__track">${stripHtml}${stripHtml.replace(/alt="[^"]*"/g, 'alt="" aria-hidden="true"')}</div>`;

// --- Yorumlar ---------------------------------------------------------------
const stars = (n) => `<span class="stars" aria-label="${n} üzerinden 5 yıldız">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${star}</i>`).join('')}</span>`;
if (d.puan) {
  $('[data-puan]').innerHTML = `<p class="puan__v">${esc(String(d.puan.ortalama).replace('.', ','))}</p><div>${stars(Math.round(d.puan.ortalama))}<p class="puan__n">${nf(d.puan.adet)} değerlendirme</p></div>`;
}
$('[data-reviews]').innerHTML = `<div class="yorum-track">${d.yorumlar
  .map((y) => `<figure class="yorum">${stars(y.puan)}<blockquote>${esc(y.metin)}</blockquote><figcaption><b>${esc(y.ad)}</b>${y.arac ? `<span>${esc(y.arac)}</span>` : ''}</figcaption></figure>`)
  .join('')}</div>`;

// --- Yollar -----------------------------------------------------------------
$('[data-roads]').innerHTML = (d.yollar || []).map((y) => `<li>${esc(y)}</li>`).join('');

// --- Canlı saat -------------------------------------------------------------
const clockEl = $('[data-clock]');
const clockSub = $('[data-clock-sub]');
const dilim = (h) => (h < 6 ? 'gecesi' : h < 12 ? 'sabahı' : h < 17 ? 'öğleden sonrası' : h < 21 ? 'akşamı' : 'gecesi');
function saatYaz() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  clockEl.innerHTML = `${hh}<span class="colon">:</span>${mm}`;
  clockSub.textContent = `${GUNLER[now.getDay()]} ${dilim(now.getHours())}. ${allDay ? 'Telefonumuz açık.' : status.text}`;
}
saatYaz();
let clockTimer = 0;
new IntersectionObserver(([e]) => {
  clearInterval(clockTimer);
  if (e.isIntersecting) clockTimer = setInterval(saatYaz, 10000);
}).observe(clockEl);

// --- Harita (yaklaşınca) ----------------------------------------------------
const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapEl.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(mapEl);

// --- Hero: ikaz üçgeni --------------------------------------------------------
const hero = $('.hero');
const pin = $('.hero__pin');
const win = $('[data-win]');
const img1 = $('[data-img="1"]');
const triSvg = $('[data-tri]');
const triOut = $('[data-tri-out]');
const triIn = $('[data-tri-in]');
const triGlint = $('[data-tri-glint]');
const small = () => innerWidth < 900;
const etaStat = d.istatistikler.find((s) => /dk/.test(s.sonek || ''));
const ETA = etaStat ? etaStat.deger : 45;
const etaNum = $('[data-eta-num]');
etaNum.textContent = ETA;

let VW = 1, VH = 1, C = [0, 0], F = [0, 0], T = [0, 0], R0 = 100, RMAX = 1000;
function layout() {
  VW = pin.clientWidth; VH = pin.clientHeight;
  triSvg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  const im = $('img', img1);
  const mob = small();
  const w = im.naturalWidth || (mob ? 826 : 1800);
  const h = im.naturalHeight || (mob ? 1333 : 1200);
  const [fx, fy] = mob ? [0.476, 0.8] : [0.54, 0.78];
  const k = Math.max(VW / w, VH / h);
  const dw = w * k, dh = h * k;
  F = [(VW - dw) / 2 + fx * dw, (VH - dh) / 2 + fy * dh];
  if (mob) {
    R0 = Math.min(VW * 0.4, VH * 0.2);
    T = [VW * 0.5, Math.min(VH * 0.74, VH - 100 - R0 * 0.5)];
  } else {
    R0 = Math.min(VH * 0.34, VW * 0.2);
    T = [VW * 0.72, VH * 0.56];
  }
  C = [T[0], T[1] - R0 * 0.18];
  RMAX = 2 * Math.hypot(Math.max(C[0], VW - C[0]), Math.max(C[1], VH - C[1])) + 60;
  img1.style.transformOrigin = `${F[0]}px ${F[1]}px`;
}
const pts = (R) => {
  const s = R * 0.8660254;
  return [[C[0], C[1] - R], [C[0] + s, C[1] + R / 2], [C[0] - s, C[1] + R / 2]];
};
const pathOf = (R) => {
  const p = pts(R);
  return `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}L${p[1][0].toFixed(1)} ${p[1][1].toFixed(1)}L${p[2][0].toFixed(1)} ${p[2][1].toFixed(1)}Z`;
};
const state = { z: 0 };
function render() {
  const z = state.z;
  const R = R0 * Math.pow(RMAX / R0, z);
  const p = pts(R);
  win.style.clipPath = `polygon(${p.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
  const bw = Math.max(10, R * 0.13);
  triOut.setAttribute('d', pathOf(R + bw));
  triOut.style.strokeWidth = bw;
  triIn.setAttribute('d', pathOf(R + bw * 2.1));
  triIn.style.strokeWidth = Math.max(1.5, bw * 0.08);
  triGlint.setAttribute('d', pathOf(R + bw));
  triGlint.style.strokeWidth = bw * 0.5;
  const q = Math.min(1, z * 1.1);
  const s = 1.35 - 0.35 * q;
  img1.style.transform = `translate(${((T[0] - F[0]) * (1 - q)).toFixed(1)}px, ${((T[1] - F[1]) * (1 - q)).toFixed(1)}px) scale(${s.toFixed(4)})`;
}

function heroInit() {
  layout();
  render();
  if (reducedMotion) {
    hero.classList.add('is-static');
    return;
  }
  const fill = $('[data-eta-fill]');
  const truck = $('[data-eta-truck]');
  const count = { v: ETA };
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
  });
  tl.to(state, { z: 1, duration: 5.4, ease: 'power1.in', onUpdate: render }, 0)
    .to('[data-intro]', { y: () => -VH * 0.12, opacity: 0, duration: 2.2, ease: 'power1.in' }, 0.2)
    .to('[data-hint]', { opacity: 0, duration: 0.6 }, 0)
    .to(triSvg, { opacity: 0, duration: 0.9 }, 4.4)
    .to('[data-shade]', { opacity: 1, duration: 1 }, 4.6)
    .fromTo('[data-eta]', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 5.1)
    .to(count, { v: 0, duration: 3.2, onUpdate: () => (etaNum.textContent = Math.ceil(count.v)) }, 5.4)
    .fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 3.2 }, 5.4)
    .fromTo(truck, { x: 0 }, { x: () => fill.parentElement.clientWidth, duration: 3.2 }, 5.4)
    .fromTo('[data-img="2"]', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'power1.out' }, 7.9)
    .to('.eta__num, .eta__label', { opacity: 0, y: -16, duration: 0.5 }, 8.6)
    .fromTo('[data-eta-done]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 8.8)
    .to({}, { duration: 0.8 });
  ScrollTrigger.addEventListener('refreshInit', () => { layout(); });
  ScrollTrigger.addEventListener('refresh', render);
}
const im1 = $('img', img1);
if (im1.complete) heroInit();
else im1.addEventListener('load', heroInit, { once: true }), im1.addEventListener('error', heroInit, { once: true });

// --- Bölüm hareketleri ------------------------------------------------------
initSmoothScroll();
if (!reducedMotion) {
  gsap.utils.toArray('.sec-head, .hakkinda__grid, .yorumlar__head, .saat__grid, .konum__grid').forEach((el) => {
    gsap.from(el.children, { y: 34, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 82%', once: true } });
  });
  gsap.from('.chip', { x: -24, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: chipsEl, start: 'top 85%', once: true } });
  gsap.from('[data-panel]', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '[data-panel]', start: 'top 88%', once: true } });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = nf(o.v)), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  gsap.from('.stat', { y: 30, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.rakam', start: 'top 85%', once: true } });

  gsap.fromTo('[data-rail]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.adimlar', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 } });
  $$('.adim').forEach((li) => {
    const chat = $('.chat', li);
    const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 72%', once: true } });
    tl.from($('.adim__txt', li).children, { y: 24, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' })
      .add(() => li.classList.add('is-on'), 0);
    if (chat) {
      tl.fromTo($('.typing', chat), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(2)' }, 0.1)
        .to($('.typing', chat), { opacity: 0, scale: 0.6, duration: 0.15 }, 0.55)
        .fromTo($('.bubble', chat), { opacity: 0, y: 16, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, 0.6);
    }
  });

  gsap.from('.yorum', { y: 40, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.yorum-list', start: 'top 85%', once: true } });
  gsap.from('.final__tri', { scale: 0.6, rotate: -8, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.final', start: 'top 75%', once: true } });
  gsap.from('.final__in > *', { y: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.final', start: 'top 70%', once: true } });
}

// Şerit ve pırıltı yalnızca görünürken çalışsın.
const pause = (el, cls = 'is-paused') =>
  new IntersectionObserver(([e]) => el.classList.toggle(cls, !e.isIntersecting)).observe(el);
pause($('[data-strip]'));
pause($('.chevron'));
pause(triSvg.parentElement);

window.addEventListener('load', () => ScrollTrigger.refresh());
