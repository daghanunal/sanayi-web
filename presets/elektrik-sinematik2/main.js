import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, GUNLER,
  telHref, waHref, mapsHref, mapsEmbed, groupedHours, icons, autoHideHeader,
} from '../../shared/core.js';
import { createCoil } from './scene.js';

const extra = import.meta.glob('../../data/elektrik-sinematik2.json', { eager: true, import: 'default' });
const ek = Object.values(extra)[0] || {};
const d = boot({ ...raw, ...ek });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mq = matchMedia('(max-width: 899px)');
const phone = mq.matches;
const low = phone || (navigator.hardwareConcurrency || 8) <= 4;
mq.addEventListener('change', () => location.reload());

// --- Künye yardımcıları --------------------------------------------------------
const EK = { b: ['', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'], o: ['', 'da', 'de', 'da', 'ta', 'de'] };
const saatEki = (t) => {
  const [h, m] = t.split(':').map(Number);
  const n = m || h;
  return (n % 10 ? EK.b[n % 10] : EK.o[Math.floor(n / 10) % 10]) || 'da';
};
const saat = (s) => s.replace(/:/g, '.').replace(/\s*[-–]\s*/, '–');
const dk = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function durum(saatler, now = new Date()) {
  const g = now.getDay();
  const bugun = saatler[g];
  const simdi = now.getHours() * 60 + now.getMinutes();
  if (bugun) {
    const [ac, kapa] = bugun.split('-');
    if (simdi >= dk(ac) && simdi < dk(kapa)) return { open: true, durum: 'Şu an açık', saat: `Bugün ${saat(bugun)}` };
    if (simdi < dk(ac)) return { open: false, durum: 'Şu an kapalı', saat: `Bugün ${saat(bugun)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const s = saatler[(g + i) % 7];
    if (!s) continue;
    const ac = s.split('-')[0];
    return { open: false, durum: bugun ? 'Şu an kapalı' : 'Bugün kapalı', saat: `${i === 1 ? 'Yarın' : GUNLER[(g + i) % 7]} ${saat(ac)}'${saatEki(ac)} açılır` };
  }
  return { open: false, durum: 'Kapalı', saat: '' };
}
const saatListesi = (s) => groupedHours(s).map(([g, h]) => [g.replace(' – ', '–'), h === 'Kapalı' ? h : saat(h)]);
const kisaAdres = (a) => a.replace(/,\s*Etimesgut\s*\/\s*Ankara\s*$/i, '');
function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}
$('meta[name="description"]')?.setAttribute('content', `${d.isletme.ad}: ${d.isletme.tanim}. ${d.iletisim.adres}. Telefon: ${d.iletisim.telefon}`);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = d.saatler.filter(Boolean).length;
const st = durum(d.saatler);
const durumMetni = `${st.durum} · ${st.saat}`;
const pad = (n) => String(n).padStart(2, '0');

// Sarım işareti (logo): yatay tel sıraları
const mark = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="2.4" height="16" rx="1"/><rect x="18.6" y="4" width="2.4" height="16" rx="1"/><path d="M7 7.5h10M7 10.5h10M7 13.5h10M7 16.5h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`;

// --- Render ------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#basla">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

$('#basla-copy').innerHTML = `
  <h1 class="hero__title" id="hero-title">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.durum)} · ${esc(st.saat.replace(/^Bugün /, ''))}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--cu" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="wrap services__wrap">
    <div class="services__head">
      <h2 class="h2" id="services-title">Hizmetler</h2>
      <p class="muted">Süreler ortalamadır. Fiyat ve randevu için arayın.</p>
    </div>
    <ol class="svc">
      ${d.hizmetler.map((h, i) => `
        <li class="svc__item">
          <span class="svc__no mono">${pad(i + 1)}</span>
          <div class="svc__body">
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
          </div>
          ${h.sure ? `<span class="svc__time mono">${esc(h.sure)}</span>` : ''}
          <span class="svc__wire" aria-hidden="true"></span>
        </li>`).join('')}
    </ol>
  </div>`;

const g = d.galeri || [];
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <div class="about__text">
      <h2 class="h2" id="about-title">Hakkında</h2>
      <p class="lead">${esc(beri(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt class="mono">Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
    <dl class="stats">
      <div class="stat"><dd><b class="stat__n" data-to="${yas}">${yas}</b><span class="stat__u mono">YIL</span></dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
      <div class="stat"><dd><b class="stat__n" data-to="${acikGun}">${acikGun}</b><span class="stat__u mono">GÜN</span></dd><dt>haftada açık</dt></div>
    </dl>
    <div class="about__photos">
      ${g.slice(0, 2).map((p, i) => `<figure class="duo duo--${i}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async" width="${i ? 800 : 1600}" height="${i ? 1000 : 1068}" />${p.baslik ? `<figcaption class="duo__cap mono">${esc(p.baslik)}</figcaption>` : ''}</figure>`).join('')}
    </div>
  </div>`;

$('#saatler').innerHTML = `
  <div class="wrap">
    <h2 class="h2 shop__title" id="shop-title">Çalışma saatleri ve konum</h2>
    <div class="shop__grid">
      <div class="shop__hours">
        <p class="live ${st.open ? 'is-open' : ''}"><i></i><span>${esc(durumMetni)}</span></p>
        <dl class="hours">
          ${saatListesi(d.saatler).map(([gun, s]) => `<div><dt>${esc(gun)}</dt><dd class="mono ${s === 'Kapalı' ? 'off' : ''}">${esc(s)}</dd></div>`).join('')}
        </dl>
      </div>
      <div class="shop__map">
        <p class="addr">${esc(d.iletisim.adres)}</p>
        <div class="map" id="map"><span class="map__ph mono">Harita</span></div>
        <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;

const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__head">
    <h2 class="h2" id="reviews-title">Örnek yorumlar</h2>
    <p class="muted">Tasarım örneğidir; işletmenin gerçek yorumları buraya gelir.</p>
  </div>
  <div class="rv" data-lenis-prevent-wheel tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <figure class="rv__card">
        <p class="stars" role="img" aria-label="5 üzerinden ${y.puan}">${stars(y.puan)}</p>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac || '')}</span></figcaption>
      </figure>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <div class="wrap finale__inner">
    <h2 class="finale__title" id="finale-title">İletişim</h2>
    <p class="lead">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="finale__cta">
      <a class="btn btn--cu btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="finale__g mono">${esc(d.iletisim.adres)}<br>${esc(durumMetni)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${mark}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a></p>
    <p class="mono foot__small">© ${yil} ${ad} · Fotoğraflar: Pexels, temsilîdir · 3D görsel temsilîdir · Yorumlar örnektir</p>
  </div>`;

// --- Harita: yaklaşınca yüklenir ------------------------------------------------------------
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  $('#map').innerHTML = `<iframe title="Konum haritası" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Sahne: yalnızca açılışta, bobin bir kez sarılır ---------------------------------------
// 3D yalnız hero'da. Hero ekrandan çıkınca çizim durur.
const canvas = $('#gl');
let coil = null;
try {
  coil = createCoil(canvas, { low, reduced: reducedMotion });
} catch (e) {
  document.documentElement.classList.add('no-gl');
}
const S = coil?.S ?? {};
Object.assign(S, {
  wind: reducedMotion ? 1 : 0, field: 0, pulse: 0, chaos: 0, heat: 0, fault: 0, dim: 1, spin: 0.12,
  camR: phone ? 6.6 : 8.2, camYaw: 0.95, camPitch: 0.26, tx: 0, ty: 0, tz: 0,
  vx: phone ? 0 : 0.27, vy: phone ? 0.04 : 0, fov: 34,
});

initSmoothScroll();

// Başlık çubuğu: aşağı inince koyulaşır; telefonda aşağı kaydırırken saklanır.
ScrollTrigger.create({ start: 80, onToggle: (s) => $('#top').classList.toggle('is-solid', s.isActive) });
if (phone) autoHideHeader($('#top'), { offset: 140 });

if (coil) {
  addEventListener('resize', () => coil.resize());
  let visible = true;
  const sync = () => (visible && !document.hidden ? coil.start() : coil.stop());
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(canvas);
  document.addEventListener('visibilitychange', sync);

  Promise.race([coil.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    coil.resize();
    coil.warm();
    coil.snap();
    sync();
    gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' });
    if (reducedMotion) {
      Object.assign(S, { field: 0.5, pulse: 0.4 });
      coil.snap();
      return;
    }
    // Açılış: tel makaraya sarılır (~2,2 sn), sonra alan çizgileri belirir. Kaydırma kilitlenmez.
    gsap.to(S, { wind: 1, duration: 2.2, ease: 'power2.inOut', delay: 0.2 });
    gsap.to(S, { field: 0.55, pulse: 0.5, camYaw: 0.6, duration: 1.6, ease: 'power2.out', delay: 1.6 });
    // Kaydırdıkça kamera hafifçe döner, sahne kararır.
    ScrollTrigger.create({
      trigger: '#basla', start: 'top top', end: 'bottom top',
      onUpdate: (s) => {
        S.camPitch = 0.26 + s.progress * 0.25;
        S.dim = 1 - s.progress * 0.6;
      },
    });
  });
} else {
  gsap.set(canvas, { autoAlpha: 0 });
}

// --- Metin hareketleri (sakin: bir kez, küçük kayma) ---------------------------------------
if (!reducedMotion) {
  gsap.from('#basla-copy > *', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
  $$('.svc__item').forEach((li) => {
    gsap.from(li, { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 92%' } });
    gsap.fromTo(li.querySelector('.svc__wire'), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'power2.inOut', scrollTrigger: { trigger: li, start: 'top 88%' } });
  });
  $$('.stat__n').forEach((el) => {
    const to = Number(el.dataset.to) || 0;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)), scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('.duo').forEach((f, i) => {
    gsap.fromTo(f, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, ease: 'expo.inOut', delay: i * 0.12, scrollTrigger: { trigger: f, start: 'top 88%' } });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}
