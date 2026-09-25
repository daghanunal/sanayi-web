// Eşik (klasik aile, mimarlık ofisi): koyu çam yeşili sıva duvar, kireç beyazı, pirinç.
// Marcellus başlık + Gantari metin. Fotoğraf ağırlıklı, WebGL yok.
// İmza anı hero'da: duvarda tek bir kemerli kapı boşluğu. Kaydırdıkça kapıya yürürüz; boşluk
// büyüyüp ekranı doldurur, içerideki aydınlık oda "İçeri buyurun" diye karşılar.
import sektor from '../../data/sektor-mimarlik.json';
import extra from '../../data/mimarlik-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
// Sektör görsellerinin bu preset için küçültülmüş WebP kopyaları
const img = (src) => String(src).replace('/sektor-mimarlik/', '/mimarlik-klasik/').replace(/\.jpe?g$/, '.webp');
const wa = (msg) => waHref(d, msg ?? `Merhaba ${d.isletme.ad}, bir proje için görüşmek istiyorum.`);
const mq = matchMedia('(max-width: 899px)');

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = wa()));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
if (d.isletme.ad.length > 15) document.documentElement.classList.add('is-long');
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-hero-ust]').textContent = d.hero.ust;
$('[data-hero-ipucu]').textContent = d.hero.ipucu;
$('[data-iceri]').textContent = d.hero.iceri;
$('[data-iceri-alt]').textContent = d.hero.iceriAlt;
$('[data-years]').innerHTML = `<span>${esc(d.isletme.kurulus)}</span>${esc(yil)} yıldır aynı kapı`;
$('[data-years2]').innerHTML = `<span>${esc(yil)}</span>yıldır Etimesgut'ta`;
$('[data-final]').textContent = d.finalBaslik;
$('[data-final-alt]').textContent = d.finalAlt;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Hero: kapı boşluğu -------------------------------------------------------
const hero = $('.hero');
const pin = $('.hero__pin');
const wallSvg = $('[data-wall]');
const wallPath = $('[data-wallpath]');
const kasa = $('[data-kasa]');
const floor = $('[data-floor]');
const spill = $('[data-spill]');
const photo = $('.hero__photo');
const shade = $('.hero__shade');
const copy = $('[data-copy]');
const olcu = $('[data-olcu]');
const hint = $('[data-hint]');
const inner = $('[data-in]');

let G = null;
function measure() {
  const vw = pin.clientWidth, vh = pin.clientHeight;
  const small = vw < 900;
  let h = small ? Math.min(vh * 0.42, 380) : Math.min(vh * 0.6, 620);
  let w = h / 2.1;
  if (small) { w = Math.min(w, vw * 0.5); h = w * 2.1; }
  const cx = small ? vw / 2 : vw * 0.7;
  const fy = small ? vh - Math.max(118, vh * 0.15) : vh * 0.86; // zemin çizgisi = kapının altı
  const ay = fy - h * 0.45; // büyütme merkezi (kapının içinde)
  // Kapı ekranı tamamen örtene kadar gereken büyütme
  const r = w / 2;
  const need = Math.max(
    cx / (w / 2), (vw - cx) / (w / 2),
    ay / Math.max(1, h * 0.55 - r * 1.35), (vh - ay) / (h * 0.45),
  );
  G = { vw, vh, w, h, cx, fy, ay, sMax: need * 1.08, small };
  wallSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  olcu.style.setProperty('--dx', `${cx}px`);
  olcu.style.setProperty('--dy', `${fy + 14}px`);
  olcu.style.setProperty('--dw', `${w}px`);
}

const S = { o: 0, p: 0 }; // o: kapının açılışı (0-1), p: yürüyüş (0-1)
const f1 = (n) => n.toFixed(1);
function draw() {
  if (!G) return;
  const { vw, vh, w, h, cx, ay, sMax } = G;
  const s = Math.pow(sMax, S.p);
  const dw = w * s * (0.04 + 0.96 * S.o);
  const dh = h * s;
  const top = ay - h * 0.55 * s;
  const bot = ay + h * 0.45 * s;
  const L = cx - dw / 2, R = cx + dw / 2;
  const r = dw / 2;
  const door = `M${f1(L)} ${f1(bot)}V${f1(top + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(R)} ${f1(top + r)}V${f1(bot)}Z`;
  wallPath.setAttribute('d', `M-2 -2H${vw + 2}V${vh + 2}H-2Z${door}`);
  kasa.setAttribute('d', door);
  const fl = Math.min(bot, vh + 4);
  floor.setAttribute('d', `M0 ${f1(fl)}H${vw}`);
  const depth = Math.min(dh * 0.5, vh * 0.35);
  spill.setAttribute('d', `M${f1(L)} ${f1(bot)}L${f1(R)} ${f1(bot)}L${f1(R + dw * 0.9)} ${f1(bot + depth)}L${f1(L - dw * 0.9)} ${f1(bot + depth)}Z`);
  spill.style.opacity = String(S.o * (1 - Math.min(1, S.p * 2.2)));
  kasa.style.opacity = String(1 - Math.min(1, S.p * 1.6));
  photo.style.transform = `scale(${(1.34 - 0.34 * S.p).toFixed(4)})`;
  const cp = Math.min(1, S.p / 0.34);
  copy.style.transform = `translate3d(0,${f1(-cp * 60)}px,0) scale(${(1 + cp * 0.35).toFixed(3)})`;
  copy.style.opacity = String(1 - cp);
  olcu.style.opacity = String(S.o * (1 - Math.min(1, S.p * 4)));
  hint.style.opacity = String(S.o * (1 - Math.min(1, S.p * 6)));
  const ip = Math.max(0, (S.p - 0.78) / 0.22);
  shade.style.opacity = String(0.15 + ip * 0.65);
  inner.style.opacity = String(ip);
  inner.style.transform = `translate3d(0,${f1((1 - ip) * 40)}px,0)`;
  inner.style.visibility = ip > 0.01 ? 'visible' : 'hidden';
  wallSvg.style.visibility = S.p > 0.995 ? 'hidden' : 'visible';
}
measure();
addEventListener('resize', () => { measure(); draw(); });

if (reducedMotion) {
  S.o = 1; S.p = 0;
  document.documentElement.classList.add('is-rm');
  copy.append($('.hero__cta'));
  draw();
} else {
  draw();
  gsap.timeline({ delay: 0.15, onUpdate: draw })
    .to(S, { o: 1, duration: 1.3, ease: 'expo.inOut' }, 0.1)
    .from('.hero__copy > *', { y: 26, opacity: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out' }, 0);
  gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (G.small ? 1.25 : 1.5)}`,
      pin, scrub: 0.5, anticipatePin: 1,
      onUpdate: () => { if (S.o < 1) { gsap.killTweensOf(S, 'o'); S.o = 1; } },
    },
  }).to(S, { p: 1, duration: 1, ease: 'power1.in', onUpdate: draw })
    .to({}, { duration: 0.25 });
}

// --- Hizmetler: oda kartları ---------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="oda" style="--i:${i}">
    <article class="oda__card"><span class="oda__dim" aria-hidden="true"></span>
      <figure class="oda__img">${h.gorsel ? `<img src="${esc(img(h.gorsel))}" alt="${esc(h.baslik)}" loading="lazy" decoding="async" />` : ''}</figure>
      <div class="oda__body">
        <p class="oda__no"><span>${String(i + 1).padStart(2, '0')}</span> / ${String(d.hizmetler.length).padStart(2, '0')}</p>
        <h3 class="oda__title">${esc(h.baslik)}</h3>
        <p class="oda__desc">${esc(h.aciklama)}</p>
        ${h.sure ? `<p class="oda__sure"><span>Süre</span>${esc(h.sure)}</p>` : ''}
      </div>
    </article>
  </li>`).join('');

// --- Rakamlar -----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${nf(s.deger)}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');

// --- İhtiyaç programı ------------------------------------------------------------
const P = d.program;
const st = Object.fromEntries(P.odalar.map((o) => [o.id, o.sabit ? 1 : o.adet ?? (o.acik ? 1 : 0)]));
const formBox = $('[data-form]');
formBox.innerHTML = P.odalar.map((o) => {
  if (o.sabit) return `<div class="chip is-on is-fixed"><span class="chip__ad">${esc(o.ad)}</span><span class="chip__m">${nf(o.m2)} m²</span></div>`;
  if (o.adet != null) return `
    <div class="chip is-on is-step" data-step="${esc(o.id)}">
      <span class="chip__ad">${esc(o.ad)}</span>
      <span class="stepper">
        <button type="button" data-d="-1" aria-label="${esc(o.ad)} azalt">−</button>
        <output data-n>${st[o.id]}</output>
        <button type="button" data-d="1" aria-label="${esc(o.ad)} artır">+</button>
      </span>
    </div>`;
  return `<button type="button" class="chip${st[o.id] ? ' is-on' : ''}" data-tog="${esc(o.id)}" aria-pressed="${!!st[o.id]}"><span class="chip__ad">${esc(o.ad)}</span><span class="chip__m">${nf(o.m2)} m²</span><i aria-hidden="true"></i></button>`;
}).join('');
$('[data-program-not]').textContent = P.not;

// Kareleştirilmiş ağaç haritası: odalar alanlarıyla orantılı dikdörtgenlere yerleşir.
function squarify(items, x, y, w, h) {
  const out = [];
  const total = items.reduce((a, b) => a + b.v, 0);
  const scale = (w * h) / total;
  let rest = items.map((it) => ({ ...it, a: it.v * scale }));
  const worst = (row, side) => {
    const sum = row.reduce((a, b) => a + b.a, 0);
    const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a));
    return Math.max((side * side * mx) / (sum * sum), (sum * sum) / (side * side * mn));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) { row.push(rest[i]); i++; }
    rest = rest.slice(i);
    const sum = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) {
      const rw = sum / h; let yy = y;
      row.forEach((r) => { const rh = r.a / rw; out.push({ ...r, x, y: yy, w: rw, h: rh }); yy += rh; });
      x += rw; w -= rw;
    } else {
      const rh = sum / w; let xx = x;
      row.forEach((r) => { const rw = r.a / rh; out.push({ ...r, x: xx, y, w: rw, h: rh }); xx += rw; });
      y += rh; h -= rh;
    }
  }
  return out;
}

const plan = $('[data-plan]');
// Hücre adının sığıp sığmadığını ölçmek için (geçiş sırasında DOM ölçüsü yanıltır)
const ctx = document.createElement('canvas').getContext('2d');
const textW = (t, tiny) => {
  ctx.font = `500 ${tiny ? 12 : planW0() > 500 ? 16 : 14}px Gantari, system-ui, sans-serif`;
  return ctx.measureText(t).width;
};
const planW0 = () => plan.clientWidth || 340;
const cells = new Map();
function program() {
  const rooms = [];
  P.odalar.forEach((o) => {
    for (let k = 0; k < st[o.id]; k++) {
      const ad = o.id === 'yatak' ? (k === 0 ? 'Ebeveyn yatak odası' : `Yatak odası ${k + 1}`) : o.ad;
      const kisa = o.id === 'yatak' ? (k === 0 ? 'Ebeveyn odası' : `Yatak ${k + 1}`) : (o.kisa || o.ad);
      rooms.push({ id: `${o.id}${k}`, ad, kisa, v: o.id === 'yatak' && k === 0 ? o.m2 + 3 : o.m2 });
    }
  });
  const net = rooms.reduce((a, b) => a + b.v, 0);
  const sirk = Math.round(net * P.sirkulasyon);
  rooms.push({ id: 'sirk', ad: 'Antre, koridor, duvar', kisa: 'Koridor', v: sirk, sirk: true });
  rooms.sort((a, b) => b.v - a.v);
  const rects = squarify(rooms, 0, 0, 100, 100);
  const planW = plan.clientWidth || 340;
  const seen = new Set();
  rects.forEach((r) => {
    seen.add(r.id);
    let el = cells.get(r.id);
    if (!el) {
      el = document.createElement('div');
      el.className = `cell${r.sirk ? ' cell--sirk' : ''} is-new`;
      el.innerHTML = '<span class="cell__ad"></span><span class="cell__m"></span>';
      plan.append(el);
      cells.set(r.id, el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-new')));
    }
    // Hücrenin gerçek piksel genişliğine göre tam ad, kısa ad ya da yalnız metrekare
    const px = (r.w / 100) * planW;
    const tiny = r.w * r.h < 90 || r.w < 19 || r.h < 13;
    const fits = (t, sm) => textW(t, sm) + (sm ? 16 : planW > 500 ? 34 : 26) <= px;
    let lbl = '', sm = tiny;
    if (!tiny && fits(r.ad)) lbl = r.ad;
    else if (!tiny && fits(r.kisa)) lbl = r.kisa;
    else { sm = true; lbl = fits(r.kisa, true) ? r.kisa : ''; }
    $('.cell__ad', el).textContent = lbl;
    $('.cell__m', el).textContent = px < 44 ? `${nf(r.v)}` : `${nf(r.v)} m²`;
    el.title = `${r.ad}, ${nf(r.v)} m²`;
    el.classList.toggle('is-tiny', sm);
    Object.assign(el.style, { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` });
  });
  cells.forEach((el, id) => { if (!seen.has(id)) { el.remove(); cells.delete(id); } });
  const brut = Math.round((net + sirk) / 5) * 5;
  $('[data-r="net"]').textContent = `${nf(net)} m²`;
  const brutEl = $('[data-r="brut"]');
  if (!reducedMotion && brutEl.dataset.v) {
    const o = { v: Number(brutEl.dataset.v) };
    gsap.to(o, { v: brut, duration: 0.5, ease: 'power2.out', onUpdate: () => (brutEl.textContent = `≈ ${nf(o.v)} m²`) });
  } else brutEl.textContent = `≈ ${nf(brut)} m²`;
  brutEl.dataset.v = brut;
  const liste = P.odalar.filter((o) => st[o.id]).map((o) => (o.adet != null ? `${st[o.id]} ${o.ad.toLocaleLowerCase('tr')}` : o.ad.toLocaleLowerCase('tr'))).join(', ');
  $('[data-program-wa]').href = wa(`Merhaba ${d.isletme.ad}, yaklaşık ${nf(brut)} m² bir ev düşünüyoruz: ${liste}. Görüşmek isteriz.`);
}
let planLastW = 0;
addEventListener('resize', () => { const w = plan.clientWidth; if (w !== planLastW) { planLastW = w; program(); } });
formBox.addEventListener('click', (e) => {
  const tog = e.target.closest('[data-tog]');
  if (tog) {
    const id = tog.dataset.tog;
    st[id] = st[id] ? 0 : 1;
    tog.classList.toggle('is-on', !!st[id]);
    tog.setAttribute('aria-pressed', String(!!st[id]));
    program();
    return;
  }
  const b = e.target.closest('[data-d]');
  if (b) {
    const box = b.closest('[data-step]');
    const o = P.odalar.find((x) => x.id === box.dataset.step);
    st[o.id] = Math.max(o.min ?? 0, Math.min(o.max ?? 9, st[o.id] + Number(b.dataset.d)));
    $('[data-n]', box).textContent = st[o.id];
    program();
  }
});
program();
document.fonts?.ready.then(() => program());

// --- Süreç -------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <p class="step__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
    <div class="step__body">
      <h3 class="step__title">${esc(s.baslik)}</h3>
      <p class="step__text">${esc(s.aciklama)}</p>
    </div>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = ['maket-ahsap', 'cizim-masasi', 'ticari-yapi', 'maket', 'bilgisayar', 'restorasyon', 'salon', '3d-yatak-odasi'];
const galItems = gal.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.jpg`))).filter(Boolean);
$('[data-gallery]').innerHTML = galItems.map((g, i) => `
  <figure class="shot shot--${i}"><img src="${esc(img(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rev">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span>${esc(y.arac)}</span></p>
  </li>`).join('');

// --- Programlar ---------------------------------------------------------------
const row = d.markalar.map((m) => `<span>${esc(m)}</span><i aria-hidden="true"></i>`).join('');
$('[data-brands]').innerHTML = `<div class="marka__row">${row}</div><div class="marka__row" aria-hidden="true">${row}</div>`;

// --- Saatler -----------------------------------------------------------------
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const order = [1, 2, 3, 4, 5, 6, 0];
const t = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUN.indexOf(r[0])), b = order.indexOf(GUN.indexOf(r.at(-1)));
  return `<div class="${t >= a && t <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd>${esc(val)}</dd></div>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
let solidOn = null;
const solid = () => {
  const on = scrollY > innerHeight * (mq.matches ? 1.3 : 1.55);
  if (on !== solidOn) { solidOn = on; top.classList.toggle('is-solid', on); }
};
addEventListener('scroll', solid, { passive: true });
solid();

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));

  // Oda kartları: bir sonraki kart üstüne binerken öncekini geri it
  const odalar = $$('.oda');
  odalar.forEach((o, i) => {
    const next = odalar[i + 1];
    if (!next) return;
    gsap.timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } })
      .to($('.oda__card', o), { scale: 0.92, ease: 'none' }, 0)
      .to($('.oda__dim', o), { opacity: 0.55, ease: 'none' }, 0);
  });
  odalar.forEach((o) => gsap.fromTo($('.oda__img img', o), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: o, start: 'top bottom', end: 'top 25%', scrub: true } }));

  $$('.stat').forEach((s) => {
    const el = $('[data-count]', s);
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 90%' } })
      .fromTo(s, { '--line': 0 }, { '--line': 1, duration: 0.9, ease: 'power3.inOut' }, 0)
      .to(o, { v: to, duration: 1.5, ease: 'power2.out', onUpdate: () => (el.textContent = nf(o.v)) }, 0.1);
  });

  gsap.from('.program__box', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.program__box', start: 'top 88%' } });
  gsap.from('.cell', { scale: 0.6, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.plan', start: 'top 85%' }, clearProps: 'transform,opacity' });

  gsap.fromTo('.ofis__photo', { clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)' }, { clipPath: 'inset(0% 0 0 0 round 999px 999px 0 0)', duration: 1.2, ease: 'power3.inOut', scrollTrigger: { trigger: '.ofis__photo', start: 'top 80%' } });
  gsap.fromTo('.ofis__photo img', { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: '.ofis', start: 'top bottom', end: 'bottom top', scrub: true } });

  gsap.fromTo('.surec__list', { '--prog': 0 }, { '--prog': 1, ease: 'none', scrollTrigger: { trigger: '.surec__list', start: 'top 70%', end: 'bottom 65%', scrub: 0.4 } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 72%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on') }));

  $$('.shot').forEach((s) => gsap.fromTo(s, { clipPath: 'inset(14% 8% 0% 8%)', y: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 92%' } }));
  gsap.from('.rev', { y: 28, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.fromTo('.final__door', { clipPath: 'inset(40% 30% 0% 30% round 999px 999px 0 0)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0 0)', ease: 'none', scrollTrigger: { trigger: '.final', start: 'top 85%', end: 'center 60%', scrub: 0.5 } });
  gsap.fromTo('.final__door img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-on'));
  $('.surec__list').style.setProperty('--prog', 1);
}

addEventListener('load', () => { measure(); draw(); ScrollTrigger.refresh(); });
