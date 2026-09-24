// Çekpas (klasik aile, oto yıkama): köpük beyazı + patlıcan mürdümü + köpük pembesi, limon sarısı vurgu.
// İmza anı hero'da: çamurlu araç fotoğrafının üzerinden kaydırdıkça bir çekpas geçer, çamur silinir,
// altından parlak araç çıkar. Katmanlar yalnızca transform ile kayar; WebGL yok.
import base from '../../data/sektor-yikama.json';
import extra from '../../data/yikama-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger, GUNLER,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...base, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
const small = matchMedia('(max-width: 899px)').matches;

// "2015'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}
// Kendi küçültülmüş kopyamız varsa onu kullan
const kucuk = (src) => {
  const name = String(src).split('/').pop();
  return /sektor-yikama\//.test(src) ? asset(`/img/yikama-klasik/k/${name}`) : src;
};

// --- Bağlamalar ---------------------------------------------------------------
const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, hakkinda: d.isletme.hakkinda,
  telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icons[el.dataset.icon] || ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımı yıkatmak istiyorum. Bugün müsait misiniz?`)));
$$('[data-wa-filo]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, şirket araçlarımız için düzenli yıkama hakkında görüşmek istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Şaşmaz Oto Sanayi · ${ablative(d.isletme.kurulus)} beri`;
$('[data-years]').textContent = `${yil} yıldır Şaşmaz'da`;
$('[data-final]').textContent = d.finalBaslik || d.isletme.slogan;
$('[data-year]').textContent = new Date().getFullYear();

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => (el.textContent = status.text));
$('[data-status-big]').textContent = status.text;
document.documentElement.classList.toggle('is-open', status.open);

// --- Şerit ----------------------------------------------------------------------
const seritler = d.seritler || d.hizmetler.map((h) => h.baslik);
const seritRow = seritler.map((s) => `<span>${esc(s)}</span><i></i>`).join('');
$('[data-serit]').innerHTML = `<div>${seritRow}</div><div>${seritRow}</div>`;
const serit = $('.serit');
new IntersectionObserver(([e]) => serit.classList.toggle('is-off', !e.isIntersecting)).observe(serit);

// --- Hero: çekpas ------------------------------------------------------------
const mud = $('[data-mud]');
const mudIn = $('[data-mud-in]');
const blade = $('[data-blade]');
const meter = $('[data-meter]');
const meterBar = $('[data-meter-bar]');
const meterLbl = $('[data-meter-lbl]');
const hero = $('.hero');
let lastLbl = '';
function setWipe(p) {
  // p: 0 → tamamen çamurlu, 1 → tertemiz. Çamur katmanı sağa kayar, içi ters yönde kayar: sabit görünür.
  const x = (p * 100).toFixed(3);
  mud.style.transform = `translate3d(${x}%,0,0)`;
  mudIn.style.transform = `translate3d(-${x}%,0,0)`;
  blade.style.transform = `translate3d(${(p * hero.clientWidth).toFixed(1)}px,0,0)`;
  const v = Math.round(p * 100);
  meter.textContent = v;
  meterBar.style.transform = `scaleX(${p.toFixed(3)})`;
  const lbl = p < 0.02 ? 'Çamur' : p < 0.98 ? 'Çekpas geçiyor' : 'Işıl ışıl';
  if (lbl !== lastLbl) {
    lastLbl = lbl;
    meterLbl.textContent = lbl;
    hero.classList.toggle('is-clean', p >= 0.98);
    hero.classList.toggle('is-wiping', p >= 0.02 && p < 0.98);
  }
}

if (reducedMotion) {
  setWipe(1);
} else {
  setWipe(0);
  const w = { p: 0 };
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: () => `+=${innerHeight * (small ? 1.1 : 1.3)}`,
      pin: '.hero__pin', scrub: 0.4, anticipatePin: 1,
    },
  });
  tl.fromTo(w, { p: 0 }, { p: 1, duration: 0.85, ease: 'power1.inOut', immediateRender: false, onUpdate: () => setWipe(w.p) }, 0)
    .fromTo('.hero__img--temiz img', { scale: 1.08 }, { scale: 1, duration: 1 }, 0)
    .to('.hero__hint', { opacity: 0, duration: 0.08 }, 0)
    .fromTo('[data-glint]', { xPercent: -120 }, { xPercent: 260, duration: 0.25, ease: 'power2.inOut' }, 0.82)
    .to({}, { duration: 0.12 });

  gsap.from('.hero__name', { yPercent: 40, opacity: 0, duration: 0.9, ease: 'power3.out' });
  gsap.from(['.hero__copy .eyebrow', '.hero__slogan', '.hero__cta'], { y: 18, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out', delay: 0.15 });
  gsap.from('.meter', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.35 });
  // İpucu: çekpas bir kez hafifçe içeri girip geri çekilir
  gsap.fromTo(w, { p: 0 }, {
    p: 0.07, duration: 0.7, ease: 'power2.out', delay: 0.7, yoyo: true, repeat: 1, repeatDelay: 0.25,
    onUpdate: () => { if (tl.progress() === 0) setWipe(w.p); },
  });
}

// --- Programlar ----------------------------------------------------------------
const svcHtml = d.hizmetler.map((h, i) => {
  const g = h.gorsel ? kucuk(h.gorsel) : null;
  return `
  <li class="svc${g ? '' : ' svc--nophoto'}" data-i="${i}">
    <button type="button" class="svc__btn" aria-expanded="false">
      <span class="svc__no mono">P${i + 1}</span>
      <span class="svc__name">${esc(h.baslik)}</span>
      <span class="svc__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>
    </button>
    <div class="svc__body">
      ${g ? `<figure class="svc__photo"><img src="${esc(g)}" alt="" loading="lazy" decoding="async" /></figure>` : `<div class="svc__photo svc__photo--foam" aria-hidden="true"><span>${esc(h.baslik)}</span></div>`}
      <p class="svc__desc">${esc(h.aciklama)}</p>
    </div>
  </li>`;
}).join('');
$('[data-services]').innerHTML = svcHtml;
const screen = $('[data-screen]');
screen.innerHTML = d.hizmetler.map((h, i) => h.gorsel
  ? `<img src="${esc(kucuk(h.gorsel))}" alt="" loading="lazy" decoding="async" data-s="${i}" />`
  : `<div class="prog__foam" data-s="${i}"><span>${esc(h.baslik)}</span></div>`).join('')
  + `<figcaption class="prog__cap"><span class="mono" data-cap-no></span><b data-cap></b></figcaption>`;
const svcs = $$('.svc');
function setActive(i) {
  svcs.forEach((s, j) => {
    s.classList.toggle('is-on', j === i);
    s.querySelector('.svc__btn').setAttribute('aria-expanded', String(j === i));
  });
  $$('[data-s]', screen).forEach((el) => el.classList.toggle('is-on', Number(el.dataset.s) === i));
  $('[data-cap-no]', screen).textContent = `P${i + 1} · ${d.hizmetler[i].sure}`;
  $('[data-cap]', screen).textContent = d.hizmetler[i].baslik;
}
setActive(0);
$('[data-services]').addEventListener('click', (e) => {
  const li = e.target.closest('.svc');
  if (!li) return;
  const i = Number(li.dataset.i);
  if (small && li.classList.contains('is-on')) { li.classList.remove('is-on'); li.querySelector('.svc__btn').setAttribute('aria-expanded', 'false'); return; }
  setActive(i);
  if (small && !reducedMotion) gsap.from(li.querySelector('.svc__body'), { height: 0, duration: 0.45, ease: 'power2.out', clearProps: 'height' });
});
if (!small) {
  $('[data-services]').addEventListener('mouseover', (e) => {
    const li = e.target.closest('.svc');
    if (li && !li.classList.contains('is-on')) setActive(Number(li.dataset.i));
  });
}

// --- Rakamlar ----------------------------------------------------------------
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat">
    <p class="stat__val"><span data-count="${Number(s.deger)}">${reducedMotion ? nf(s.deger) : '0'}</span><small>${esc(s.sonek)}</small></p>
    <p class="stat__lbl">${esc(s.etiket)}</p>
  </li>`).join('');
const rakam = $('.rakam');
new IntersectionObserver(([e]) => rakam.classList.toggle('is-off', !e.isIntersecting)).observe(rakam);

// --- Ne zaman hazır? ---------------------------------------------------------
const plan = d.planlayici || [];
const items = d.hizmetler.map((h, i) => ({ ...h, i, p: plan[i] })).filter((x) => x.p);
const sel = new Set([0, 5].filter((i) => items.some((x) => x.i === i)));
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dur = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} sa${r ? ` ${r} dk` : ''}` : `${r} dk`; };

$('[data-chips]').innerHTML = items.map((x) => `
  <button type="button" class="chip" data-i="${x.i}" aria-pressed="${sel.has(x.i)}">
    <span class="chip__box" aria-hidden="true"></span>${esc(x.baslik)}
  </button>`).join('');

function compute() {
  let chosen = items.filter((x) => sel.has(x.i));
  // İç-dış detaylı temizlik seçiliyse hızlı dış yıkama onun içinde
  const hasFull = chosen.some((x) => x.i === 0);
  chosen = chosen.map((x) => ({ ...x, skip: hasFull && x.i === 6 }));
  const act = chosen.filter((x) => !x.skip);
  const work = act.reduce((a, x) => a + x.p.is, 0);
  const dryers = act.filter((x) => x.p.kuruma);
  const maxDry = Math.max(0, ...dryers.map((x) => x.p.kuruma));
  const dryWork = dryers.reduce((a, x) => a + x.p.is, 0);
  const total = act.length ? Math.max(work, dryWork + maxDry) : 0;
  return { chosen, act, work, total, maxDry };
}

// Açık saatler içinde ilerleyerek teslim zamanını bul
function readyAt(total, now = new Date()) {
  let day = now.getDay();
  let t = now.getHours() * 60 + now.getMinutes();
  let left = total;
  for (let k = 0; k < 8; k++) {
    const h = d.saatler[(day + k) % 7];
    if (h) {
      const [a, b] = h.split('-').map(toMin);
      const start = k === 0 ? Math.max(t, a) : a;
      if (start < b) {
        const avail = b - start;
        if (left <= avail) {
          const m = Math.ceil((start + left) / 10) * 10;
          return { k, day: (day + k) % 7, m: Math.min(m, b), startedLater: k > 0 || start > t };
        }
        left -= avail;
      }
    }
  }
  return null;
}

const fisNow = $('[data-fis-now]');
const readyEl = $('[data-ready]');
const readySub = $('[data-ready-sub]');
const barEl = $('[data-bar]');
const linesEl = $('[data-lines]');
const noteEl = $('[data-note]');
const planWa = $('[data-plan-wa]');
function renderPlan(animate) {
  const now = new Date();
  fisNow.textContent = `${GUNLER[now.getDay()]} ${hhmm(now.getHours() * 60 + now.getMinutes())}`;
  const { chosen, act, work, total } = compute();
  $$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(sel.has(Number(c.dataset.i)))));
  if (!act.length) {
    readyEl.textContent = 'İş seçin';
    readySub.textContent = 'Soldan en az bir iş işaretleyin.';
    barEl.innerHTML = '';
    linesEl.innerHTML = '';
    noteEl.textContent = '';
    planWa.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımı yıkatmak istiyorum.`);
    return;
  }
  const r = readyAt(total, now);
  const when = !r ? 'Arayın, planlayalım' : r.k === 0 ? `Bugün ${hhmm(r.m)}` : r.k === 1 ? `Yarın ${hhmm(r.m)}` : `${GUNLER[r.day]} ${hhmm(r.m)}`;
  readyEl.textContent = when;
  readySub.textContent = r && r.startedLater && !status.open
    ? `Şu an kapalıyız; ${status.text.toLocaleLowerCase('tr-TR')}. Toplam yaklaşık ${dur(total)}.`
    : `Şimdi getirirseniz toplam yaklaşık ${dur(total)}.`;
  barEl.innerHTML = act.map((x) => `<span style="flex:${x.p.is}" title="${esc(x.baslik)}"></span>`).join('')
    + (total > work ? `<span class="is-dry" style="flex:${total - work}" title="Kuruma"></span>` : '');
  linesEl.innerHTML = chosen.map((x) => `
    <li class="${x.skip ? 'is-skip' : ''}"><span>${esc(x.baslik)}</span><span class="mono">${x.skip ? 'içinde' : esc(dur(x.p.is))}</span></li>`).join('')
    + (total > work ? `<li class="is-dryline"><span>Kuruma (bu arada diğer işler)</span><span class="mono">+${esc(dur(total - work))}</span></li>` : '');
  const notes = chosen.map((x) => x.p.not).filter(Boolean);
  noteEl.textContent = notes[notes.length - 1] || '';
  const list = act.map((x) => x.baslik.toLocaleLowerCase('tr-TR')).join(', ');
  planWa.href = waHref(d, `Merhaba ${d.isletme.ad}, aracıma şu işleri yaptırmak istiyorum: ${list}. Ne zaman getirebilirim?`);
  if (animate && !reducedMotion) {
    gsap.fromTo(readyEl, { y: 10, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
    gsap.fromTo(barEl.children, { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', transformOrigin: 'left center' });
  }
}
renderPlan(false);
$('[data-chips]').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  const i = Number(c.dataset.i);
  sel.has(i) ? sel.delete(i) : sel.add(i);
  renderPlan(true);
});

// --- Süreç -------------------------------------------------------------------
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step">
    <span class="step__drop" aria-hidden="true"><b>${i + 1}</b></span>
    <h3 class="step__t">${esc(s.baslik)}</h3>
    <p class="step__p">${esc(s.aciklama)}</p>
  </li>`).join('');

// --- Galeri ------------------------------------------------------------------
const gal = d.galeri.filter((g) => !/yikama-garaj|kopuk\.jpg/.test(g.src)).slice(0, 8);
$('[data-gallery]').innerHTML = gal.map((g, i) => `
  <figure class="gi gi--${i}"><img src="${esc(kucuk(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// --- Filo --------------------------------------------------------------------
const filo = d.hizmetler.find((h) => /filo/i.test(h.baslik));
$('[data-filo-text]').textContent = filo ? filo.aciklama : '';
const fq = d.yorumlar.find((y) => /şirket|ticari|araçlar/i.test(y.metin));
$('[data-filo-q]').innerHTML = fq ? `<p>“${esc(fq.metin)}”</p><cite>${esc(fq.ad)} · <span class="mono">${esc(fq.arac)}</span></cite>` : '';
if (!fq) $('[data-filo-q]').remove();

// --- Yorumlar ----------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-score]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-stars]').setAttribute('aria-label', `5 üzerinden ${nf(d.puan.ortalama, 1)}`);
$('[data-review-count]').textContent = `Google'da ${nf(d.puan.adet)} değerlendirme`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y, i) => `
  <li class="rev rev--${i % 3}">
    <p class="rev__stars" aria-label="${Number(y.puan)} yıldız">${stars(y.puan)}</p>
    <p class="rev__text">${esc(y.metin)}</p>
    <p class="rev__who"><strong>${esc(y.ad)}</strong><span class="mono">${esc(y.arac)}</span></p>
  </li>`).join('');

const brandRow = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div class="marka__row">${brandRow}<i aria-hidden="true"></i></div><div class="marka__row" aria-hidden="true">${brandRow}<i></i></div>`;
const marka = $('.marka');
new IntersectionObserver(([e]) => marka.classList.toggle('is-off', !e.isIntersecting)).observe(marka);

// --- Saatler + harita --------------------------------------------------------
const order = [1, 2, 3, 4, 5, 6, 0];
const t = order.indexOf(new Date().getDay());
$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([days, val]) => {
  const r = days.split(' – ');
  const a = order.indexOf(GUNLER.indexOf(r[0])), b = order.indexOf(GUNLER.indexOf(r.at(-1)));
  return `<div class="${t >= a && t <= b ? 'is-today' : ''}"><dt>${esc(days)}</dt><dd class="mono">${esc(val)}</dd></div>`;
}).join('');
const mapBox = $('[data-map]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Header ------------------------------------------------------------------
const top = $('.top');
const setSolid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
setSolid();
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: setSolid });
addEventListener('scroll', setSolid, { passive: true });

// --- Bölüm hareketleri --------------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();

  $$('.h2').forEach((h) => gsap.from(h, { y: 36, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } }));
  $$('.lead').forEach((h) => gsap.from(h, { y: 20, opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));

  gsap.from('.svc', { y: 26, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.prog__list', start: 'top 85%' } });
  if (!small) gsap.fromTo('.prog__screen', { clipPath: 'inset(0 0 100% 0 round 28px)' }, { clipPath: 'inset(0 0 0% 0 round 28px)', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: '.prog__grid', start: 'top 80%' } });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = nf(o.v)) });
  });

  gsap.from('.chip', { y: 14, opacity: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: '.plan__chips', start: 'top 88%' } });
  gsap.from('.fis', { y: 60, rotate: small ? 0 : 3, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.fis', start: 'top 90%' } });

  // Süreç: damla ray boyunca akar, adımlar sırayla ıslanır
  gsap.fromTo('.surec__list', { '--fill': 0 }, { '--fill': 1, ease: 'none', scrollTrigger: { trigger: '.surec__list', start: 'top 78%', end: 'bottom 60%', scrub: true } });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: small ? 'top 62%' : 'top 70%', onToggle: (st) => s.classList.toggle('is-wet', st.isActive || st.progress > 0), end: 'max' }));
  gsap.from('.step', { y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: '.surec__list', start: 'top 86%' } });

  $$('.gi').forEach((g, i) => {
    gsap.fromTo(g, { clipPath: 'inset(12% 12% 12% 12% round 22px)', opacity: 0.3 }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', opacity: 1, duration: 0.9, ease: 'power3.out', delay: small ? 0 : (i % 3) * 0.06, scrollTrigger: { trigger: g, start: 'top 90%' } });
  });

  gsap.fromTo('.filo__photo img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.filo', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.from('.filo__pts li', { x: -20, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.filo__pts', start: 'top 88%' } });

  gsap.from('.rev', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 88%' } });
  gsap.from('.garanti__badge', { scale: 1.8, rotate: -20, opacity: 0, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: '.garanti', start: 'top 85%' } });
  gsap.fromTo('.final__bg', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.final__h', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.final', start: 'top 70%' } });
}

addEventListener('load', () => ScrollTrigger.refresh());
