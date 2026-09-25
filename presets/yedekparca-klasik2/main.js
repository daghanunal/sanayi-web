import raw from '../../data/depo.json';
import extra from '../../data/yedekparca-klasik2.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const fmt = (n) => Number(n).toLocaleString('tr-TR');
const yil = Math.max(1, new Date().getFullYear() - d.isletme.kurulus);

// "2003'ten", "1998'den", "1990'dan"
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  if (n % 10) return `${n}'${birler[n % 10]}`;
  if (n % 100) return `${n}'${onlar[(n % 100) / 10]}`;
  return `${n}'den`;
}

// --- Metin, link, ikon ---------------------------------------------------------
const binds = {
  ad: d.isletme.ad,
  slogan: d.isletme.slogan,
  hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon,
  adres: d.iletisim.adres,
  garanti: d.garanti,
  since: `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`,
  copy: `© ${new Date().getFullYear()} ${d.isletme.ad}`,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
const hrefs = {
  tel: telHref(d),
  wa: waHref(d, `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`),
  maps: mapsHref(d),
};
$$('[data-href]').forEach((el) => (el.href = hrefs[el.dataset.href]));
$$('[data-icon]').forEach((el) => (el.outerHTML = icons[el.dataset.icon]));
$$('[data-icon-check]').forEach((el) => (el.outerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'));
document.querySelector('.hero__baslik').classList.toggle('is-uzun', d.isletme.ad.length > 26);
$('.ust__tel').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

function refreshStatus() {
  const s = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.textContent = s.text;
    el.classList.toggle('is-open', s.open);
  });
  $$('[data-status-short]').forEach((el) => (el.textContent = s.open ? 'Açık' : 'Kapalı'));
  $$('[data-status-dot]').forEach((el) => el.classList.toggle('is-open', s.open));
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Fren diski geometrisi (hero maskesi ve final diski ortak) -------------------
const TAU = Math.PI * 2;
const circle = (x, y, r) => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;
const LUG_R = 0.3, LUG = 0.062, HUB = 0.43, BORE = 0.17;
// Disk parçaları: [yarıçap-oranı (merkezden), açı, delik yarıçapı]. evenodd sırası: jant(delik) > göbek(dolu) > bijon+merkez(delik); delikler annulus içinde (dolu).
const discParts = (() => {
  const holes = [];
  for (let k = 0; k < 5; k++) holes.push([LUG_R, -Math.PI / 2 + (k * TAU) / 5, LUG]);
  const dots = [];
  [0.58, 0.7, 0.82].forEach((rr, ring) => {
    for (let k = 0; k < 20; k++) dots.push([rr, (k * TAU) / 20 + ring * 0.095, 0.021 + ring * 0.002]);
  });
  return { holes, dots };
})();

// Disk yolu: merkez (cx,cy), yarıçap R, dönüş th, ayrıca (Lx,Ly) etrafında z kat yakınlaştırma
function discPath(cx, cy, R, th, z = 1, Lx = cx, Ly = cy) {
  const P = (rr, a) => {
    const x = cx + Math.cos(a + th) * rr * R;
    const y = cy + Math.sin(a + th) * rr * R;
    return [Lx + (x - Lx) * z, Ly + (y - Ly) * z];
  };
  const [ox, oy] = P(0, 0);
  let s = circle(ox, oy, R * z) + circle(ox, oy, R * HUB * z) + circle(ox, oy, R * BORE * z);
  for (const [rr, a, r] of discParts.holes) { const [x, y] = P(rr, a); s += circle(x, y, R * r * z); }
  for (const [rr, a, r] of discParts.dots) { const [x, y] = P(rr, a); s += circle(x, y, R * r * z); }
  return s;
}

$('[data-final-disk]').setAttribute('d', discPath(100, 100, 96, 0));

// --- Hero: disk bir bijon döner, sonra üst bijon deliğinden depoya girilir -----------
const hero = $('[data-hero]');
const maske = $('[data-maske]');
const yol = $('[data-maske-yol]');
const cizgi = $('[data-cizgi-yol]');
const foto = $('[data-hero-foto]');
const karart = $('[data-karart]');
const bas = $('[data-hero-bas]');
const alt = $('[data-hero-alt]');
const son = $('[data-hero-son]');
const ipucu = $('[data-ipucu]');
const ara = $('[data-hero-ara]');
const jant = $('[data-jant-yol]');
const sayiEl = $('[data-hero-sayi]');
const stokStat = d.istatistikler.find((s) => typeof s.deger === 'number' && s.deger > 10000) ?? { deger: 48000, sonek: '+' };
$('[data-hero-sonek]').textContent = stokStat.sonek;
$('[data-kalem]').textContent = fmt(stokStat.deger);
$('[data-raf-sayi]').textContent = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz', 'On'][d.hizmetler.length] ?? String(d.hizmetler.length);

let geo = null;
function measure() {
  const w = maske.clientWidth || innerWidth;
  const h = maske.clientHeight || innerHeight;
  const mobil = w < 900;
  const R = mobil ? Math.min(w * 0.43, h * 0.24) : Math.min(h * 0.36, w * 0.25);
  const cx = mobil ? w / 2 : w * 0.68;
  const cy = mobil ? h * 0.515 : h * 0.54;
  const Lx = cx, Ly = cy - LUG_R * R;
  const far = Math.max(Math.hypot(Lx, Ly), Math.hypot(w - Lx, Ly), Math.hypot(Lx, h - Ly), Math.hypot(w - Lx, h - Ly));
  const zMax = (far / (LUG * R)) * 1.08;
  maske.setAttribute('viewBox', `0 0 ${w} ${h}`);
  geo = { w, h, R, cx, cy, Lx, Ly, zMax, mobil };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

let lastP = -1;
function renderHero(p) {
  if (!geo) measure();
  lastP = p;
  const { w, h, R, cx, cy, Lx, Ly, zMax } = geo;
  const tRot = inOut(seg(p, 0.02, 0.36));
  const th = tRot * (TAU / 5);
  const tZoom = seg(p, 0.38, 0.86);
  const z = Math.exp(Math.log(zMax) * tZoom ** 1.9);
  if (tZoom >= 1) {
    maske.style.visibility = 'hidden';
  } else {
    maske.style.visibility = '';
    yol.setAttribute('d', `M0 0H${w}V${h}H0Z` + discPath(cx, cy, R, th, z, Lx, Ly));
    // dış çevrede kesikli ölçek halkası
    const rr = R * 1.13 * z;
    const ox = Lx + (cx - Lx) * z, oy = Ly + (cy - Ly) * z;
    cizgi.setAttribute('d', circle(ox, oy, rr));
    cizgi.style.strokeDashoffset = (-th * rr).toFixed(1);
    cizgi.style.opacity = String(1 - seg(p, 0.36, 0.5));
    jant.setAttribute('d', circle(ox, oy, R * z) + circle(ox, oy, R * HUB * z));
    jant.style.opacity = String(1 - seg(p, 0.5, 0.7));
  }
  foto.style.transform = `scale(${(1.28 - 0.28 * inOut(p)).toFixed(4)}) rotate(${((1 - tRot) * -4).toFixed(2)}deg)`;
  const cik = seg(p, 0.06, 0.26);
  bas.style.opacity = String(1 - cik);
  bas.style.transform = `translate3d(0, ${(-cik * 40).toFixed(1)}px, 0)`;
  alt.style.opacity = String(1 - cik);
  alt.style.transform = `translate3d(0, ${(cik * 40).toFixed(1)}px, 0)`;
  ipucu.style.opacity = String(1 - seg(p, 0, 0.06));
  const a = seg(p, 0.27, 0.37) * (1 - seg(p, 0.48, 0.58));
  ara.style.opacity = String(a);
  ara.style.transform = `translate3d(0, ${((1 - seg(p, 0.27, 0.37)) * 24 - seg(p, 0.48, 0.58) * 24).toFixed(1)}px, 0)`;
  const gir = seg(p, 0.8, 0.96);
  karart.style.opacity = String(gir * 0.62);
  son.style.opacity = String(gir);
  son.style.transform = `translate3d(0, ${((1 - gir) * 30).toFixed(1)}px, 0)`;
  sayiEl.textContent = fmt(Math.round(stokStat.deger * inOut(seg(p, 0.78, 0.98)) / 10) * 10);
}

if (reducedMotion) {
  hero.classList.add('is-static');
  measure();
  renderHero(0);
} else {
  measure();
  renderHero(0);
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => renderHero(self.progress),
    onRefresh: (self) => { measure(); renderHero(self.progress); },
  });
}
let rz;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { measure(); renderHero(Math.max(0, lastP)); }, 120);
});

// --- Raflar --------------------------------------------------------------------
$('[data-raflar]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="raf" style="--i:${i}">
    <div class="raf__foto"><img src="${esc(d.parcaFoto?.[h.parca] ?? d.galeri[0].src)}" alt="" loading="lazy" decoding="async" /></div>
    <div class="raf__govde">
      <p class="raf__kod"><span>Raf</span> ${esc(h.raf)}</p>
      <h3 class="raf__ad">${esc(h.baslik)}</h3>
      <p class="raf__metin">${esc(h.aciklama)}</p>
      <ul class="raf__cip">${(h.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    </div>
    <p class="raf__stok"><b data-say="${Number(h.stok) || 0}">${fmt(h.stok)}</b><span>kalem rafta</span></p>
  </li>`).join('');

// --- Şasi numarası --------------------------------------------------------------
const vinGirdi = $('[data-vin-girdi]');
const vinKutular = $('[data-vin-kutular]');
const vinSayac = $('[data-vin-sayac]');
const vinGonder = $('[data-vin-gonder]');
const vinGonderMetin = $('[data-vin-gonder-metin]');
const vinNot = $('[data-vin-not]');
const gruplar = [[0, 3, 'Üretici'], [3, 9, 'Araç tanımı'], [9, 17, 'Seri no']];
vinKutular.innerHTML = gruplar.map(([a, b, ad]) => `
  <div class="vin__grup" style="--n:${b - a}"><div class="vin__hucreler">${Array.from({ length: b - a }, () => '<span class="vin__hucre"></span>').join('')}</div><small>${esc(ad)}</small></div>`).join('');
const hucreler = $$('.vin__hucre', vinKutular);
function vinGuncelle() {
  const temiz = vinGirdi.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const yasak = /[IOQ]/.test(temiz);
  const v = temiz.replace(/[IOQ]/g, '').slice(0, 17);
  if (vinGirdi.value !== v) vinGirdi.value = v;
  hucreler.forEach((c, i) => {
    c.textContent = v[i] ?? '';
    c.classList.toggle('is-dolu', i < v.length);
    c.classList.toggle('is-imlec', i === v.length && document.activeElement === vinGirdi);
  });
  vinSayac.textContent = `${v.length} / 17`;
  const tam = v.length === 17;
  $('[data-vin]').classList.toggle('is-tam', tam);
  vinNot.textContent = yasak ? 'I, O ve Q şasi numarasında olmaz; büyük ihtimalle 1, 0 ya da 9.' : tam ? 'Tamam. Gönderin, orijinal ve muadil fiyatını yazalım.' : 'I, O ve Q harfleri şasi numarasında kullanılmaz.';
  vinGonderMetin.textContent = tam ? 'Şasi numarasını gönder' : 'Ruhsat fotoğrafını gönder';
  vinGonder.href = tam
    ? waHref(d, `Merhaba ${d.isletme.ad}, şasi numaram: ${v}. Parça sormak istiyorum.`)
    : waHref(d, `Merhaba ${d.isletme.ad}, ruhsatımın fotoğrafını gönderiyorum. Parça sormak istiyorum.`);
}
vinGirdi.addEventListener('input', vinGuncelle);
vinGirdi.addEventListener('focus', vinGuncelle);
vinGirdi.addEventListener('blur', vinGuncelle);
vinGuncelle();

$('[data-surec]').innerHTML = d.surec.map((s, i) => `
  <li class="adim"><span class="adim__no">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('');

// --- Rakamlar -------------------------------------------------------------------
$('[data-rakamlar]').innerHTML = d.istatistikler.map((s) => {
  const deger = s.deger === 'kurulus' ? yil : Number(s.deger);
  return `<div class="rakam"><dd><b data-say="${deger}">${fmt(deger)}</b>${esc(s.sonek)}</dd><dt>${esc(s.etiket)}</dt></div>`;
}).join('');

// --- Depo -----------------------------------------------------------------------
$('[data-depo]').innerHTML = (d.depoFoto ?? d.galeri.slice(0, 4)).map((g, i) => `
  <figure class="depo__kare depo__kare--${i + 1}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></figure>`).join('');

// --- Teslimat halkaları ------------------------------------------------------------
const halkaR = [52, 96, 140, 184];
const tes = d.teslimat ?? [];
$('[data-halka]').innerHTML = `
  <defs><radialGradient id="hk-g"><stop offset="0" stop-color="var(--nane)" stop-opacity=".22"/><stop offset="1" stop-color="var(--nane)" stop-opacity="0"/></radialGradient></defs>
  <circle cx="200" cy="200" r="190" fill="url(#hk-g)"/>
  ${tes.map((t, i) => `<circle class="halka__cizgi" data-halka-i="${i}" cx="200" cy="200" r="${halkaR[i] ?? 184}" transform="rotate(-90 200 200)"/>`).join('')}
  ${tes.map((t, i) => {
    const r = halkaR[i] ?? 184;
    const a = (-50 + i * 34) * (Math.PI / 180);
    const x = 200 + Math.cos(a) * r, y = 200 + Math.sin(a) * r;
    return `<g class="halka__isaret" data-halka-isaret="${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13"/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${i + 1}</text></g>`;
  }).join('')}
  <circle class="halka__merkez" cx="200" cy="200" r="11"/>
  <text class="halka__merkez-yazi" x="200" y="232" text-anchor="middle">Şaşmaz</text>`;
$('[data-teslimat]').innerHTML = tes.map((t, i) => `
  <li class="tes" style="--i:${i}"><span class="tes__no">${i + 1}</span><div><h3>${esc(t.yer)}</h3><p class="tes__sure">${esc(t.sure)}</p><p class="tes__not">${esc(t.not)}</p></div></li>`).join('');

// --- Markalar şeridi ---------------------------------------------------------------
function serit(el, liste) {
  const parca = liste.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
  el.innerHTML = `<div class="serit__ic"><div>${parca}<i aria-hidden="true"></i></div><div aria-hidden="true">${parca}<i></i></div></div>`;
}
serit($('[data-serit="arac"]'), d.markalar ?? []);
serit($('[data-serit="parca"]'), d.parcaMarkalari ?? []);

// --- Yorumlar ---------------------------------------------------------------------
const yildiz = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</span>`).join('');
if (d.puan) {
  $('[data-puan]').innerHTML = `
    <p class="puan__deger">${esc(String(d.puan.ortalama).replace('.', ','))}</p>
    <div><div class="yildiz" aria-label="5 üzerinden ${esc(String(d.puan.ortalama))}">${yildiz(d.puan.ortalama)}</div><p class="puan__adet">${esc(fmt(d.puan.adet))} müşteri yorumu</p></div>`;
}
$('[data-yorumlar]').innerHTML = (d.yorumlar ?? []).map((y) => `
  <figure class="yorum">
    <div class="yildiz yildiz--kucuk" aria-label="5 üzerinden ${esc(String(y.puan))}">${yildiz(y.puan)}</div>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac ?? '')}</span></figcaption>
  </figure>`).join('');

// --- Saatler + harita ------------------------------------------------------------------
const bugun = new Date().getDay();
const GUN_KISA = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
$('[data-saatler]').innerHTML = groupedHours(d.saatler).map(([g, s]) => {
  const icinde = g.includes('–')
    ? (() => { const [a, b] = g.split(' – ').map((x) => GUN_KISA.indexOf(x)); const o = [1, 2, 3, 4, 5, 6, 0]; return o.slice(o.indexOf(a), o.indexOf(b) + 1).includes(bugun); })()
    : GUN_KISA.indexOf(g) === bugun;
  return `<div class="${icinde ? 'is-bugun' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`;
}).join('');
const harita = $('[data-harita]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  io.disconnect();
  harita.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(harita);

// --- Hareket ---------------------------------------------------------------------------
initSmoothScroll();
document.fonts?.ready.then(() => ScrollTrigger.refresh());

if (!reducedMotion) {
  // başlıklar
  $$('.bolum-bas, .sasi__metin').forEach((el) => {
    gsap.from(el.children, {
      y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  // raf satırları: yuvarlak fotoğraf disk gibi dönerek açılır
  $$('.raf').forEach((el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    tl.from($('.raf__foto', el), { clipPath: 'circle(0% at 50% 50%)', rotate: -75, duration: 1.1, ease: 'power3.out' })
      .from($('.raf__foto img', el), { scale: 1.5, duration: 1.3, ease: 'power3.out' }, 0)
      .from([$('.raf__govde', el), $('.raf__stok', el)], { x: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 0.1);
  });

  // sayaçlar
  $$('[data-say]').forEach((el) => {
    const hedef = Number(el.dataset.say);
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = fmt(Math.round(o.v))),
    });
  });

  // VIN kutuları sırayla yanar
  gsap.from('.vin__hucre', {
    y: 14, opacity: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.03,
    scrollTrigger: { trigger: '.vin', start: 'top 85%', once: true },
  });
  gsap.from('.adim', {
    y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.surec', start: 'top 85%', once: true },
  });

  // depo: kareler açılır + hafif paralaks
  $$('.depo__kare').forEach((el, i) => {
    gsap.from(el, {
      clipPath: 'inset(12% 12% 12% 12% round 999px)', duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
    gsap.fromTo($('img', el), { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // teslimat halkaları içten dışa çizilir
  const htl = gsap.timeline({ scrollTrigger: { trigger: '.halka', start: 'top 75%', once: true } });
  htl.from('.halka__merkez', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' });
  $$('[data-halka-i]').forEach((c, i) => {
    htl.from(c, { drawSVG: 0, duration: 0.9, ease: 'power2.inOut' }, 0.25 + i * 0.28)
      .from(`[data-halka-isaret="${i}"]`, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)' }, 0.75 + i * 0.28)
      .from(`.tes:nth-child(${i + 1})`, { x: 24, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0.6 + i * 0.28);
  });

  gsap.from('.yorum', {
    x: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
    scrollTrigger: { trigger: '.yorum-serit', start: 'top 88%', once: true },
  });

  // final diski: kaydırmayla döner
  gsap.fromTo('.final__disk svg', { rotate: -120 }, {
    rotate: 60, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.from('.final__baslik, .final__btnler', {
    y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.final', start: 'top 75%', once: true },
  });
}

// Başlık gölgesi: hero geçince zemin koyulaşır
ScrollTrigger.create({
  start: () => innerHeight * 0.4,
  onUpdate: (self) => document.documentElement.classList.toggle('is-kaydi', self.scroll() > innerHeight * 0.4),
});
