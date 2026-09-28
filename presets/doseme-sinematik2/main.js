// Örtü: sinematik aileden ikinci oto döşeme preseti. 3D yalnız açılışta:
// kobalt boşlukta, stüdyo ışığında gerçek bir koltuk (lib3d seat). Açılışta örtü uçar, koltuk bir kez
// kumaştan alcantaraya, nappaya ve kapitoneye döner; sonra hafifçe salınır. Hero ekrandan çıkınca çizim durur.
// Gerisi normal site bölümleridir: Hizmetler, Hakkında, Çalışma saatleri ve konum, Örnek yorumlar, İletişim.
import usta from '../../data/usta.json';
import ext from '../../data/doseme-sinematik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';

const d = boot({ ...usta, ...ext, preset: 'doseme-sinematik2' });

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const phoneMq = matchMedia('(max-width: 899px)');
const lite = weak || innerWidth < 700;
const pad2 = (n) => String(n).padStart(2, '0');
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, buYil - kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const matAdlari = d.sahneMalzeme || [];

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, telefon: d.iletisim.telefon };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => { a.href = telHref(d); a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`); });
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-status]').innerHTML = `<i class="${st.open ? 'on' : ''}"></i>${st.open ? 'Açık' : 'Kapalı'}`;

$('[data-hero]').innerHTML = `
  <h1 class="hero__title" id="hero-title">${d.isletme.ad.split(/\s+/).map((w) => `<span class="ln"><span class="ln__in">${esc(w)}</span></span>`).join(' ')}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="live"><i class="${st.open ? 'on' : ''}"></i>${esc(st.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    <a class="btn btn--pink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
    <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="svc__head">
    <h2 id="hizmetler-h" class="svc__title">Hizmetler</h2>
    <p class="svc__sub">Süreler yaklaşıktır, araca ve koltuğun durumuna göre değişebilir. Fiyat ve randevu için arayın.</p>
  </div>
  <ol class="svc__list">
    ${d.hizmetler.map((h, i) => `
      <li class="svc__item">
        <figure class="svc__img"><img src="${esc(h.gorsel)}" alt="" loading="lazy" decoding="async" /></figure>
        <div class="svc__body">
          <p class="svc__no">${pad2(i + 1)}</p>
          <h3 class="svc__name">${esc(h.baslik)}</h3>
          <p class="svc__txt">${esc(h.aciklama)}</p>
          <p class="svc__sure"><span>Süre</span>${esc(h.sure)}</p>
        </div>
      </li>`).join('')}
  </ol>`;

$('#hakkinda').innerHTML = `
  <div class="about__grid">
    <div>
      <h2 id="hakkinda-h" class="about__title">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Sık gelen markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <ol class="nums__list">
    <li><p class="nums__v"><b data-count="${yas}">${yas}</b><span> yıl</span></p><p class="nums__l">Şaşmaz Oto Sanayi Sitesi'nde</p></li>
    <li><p class="nums__v"><b data-count="${acikGun}">${acikGun}</b><span> gün</span></p><p class="nums__l">haftada açık</p></li>
  </ol>`;

$('#saatler').innerHTML = `
  <h2 id="saatler-h" class="visit__title">Çalışma saatleri ve konum</h2>
  <div class="visit__grid">
    <div class="visit__col">
      <p class="visit__big"><i class="${st.open ? 'on' : ''}"></i>${esc(st.metin)}</p>
      <dl class="hours">${saatListesi(d.saatler).map(([g, h]) => `<div><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('')}</dl>
    </div>
    <div class="visit__col">
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__btns">
        <a class="btn btn--blue" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
  </div>
  <div class="visit__map" data-map><p>Harita</p></div>`;

$('#yorumlar').innerHTML = `
  <div class="rev__head">
    <h2 id="yorumlar-h" class="rev__title">Örnek yorumlar</h2>
    <p class="rev__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="rev__track" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <figure class="card">
        <p class="card__stars" role="img" aria-label="5 üzerinden ${Number(y.puan) || 5}">${icons.star.repeat(Number(y.puan) || 5)}</p>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
      </figure>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <h2 class="final__title" id="iletisim-h">İletişim</h2>
  <p class="final__txt">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Koltuğun fotoğrafı da gönderilebilir.</p>
  <div class="final__cta">
    <a class="btn btn--pink btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
    <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
  </div>
  <p class="final__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>`;

$('.foot').innerHTML = `
  <p class="foot__name">${ad}</p>
  <p>${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
  <p class="foot__small">© ${buYil} ${ad} · Pexels'ten alınan fotoğraflar ve 3D koltuk temsilîdir · Yorumlar örnektir</p>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((ents, obs) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  obs.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Sahne: yalnız hero'da -------------------------------------------------------

const canvas = $('[data-stage]');
const matLabel = $('[data-mat]');
let stage = null;
const HP = Math.PI / 2;
const S = { worn: 1, mat: 0, light: 1, fly: 0, spin: 1 };

// Kadraj: masaüstünde koltuk sağda (metin solda); telefonda başlık çubuğu ile metnin arasındaki boşlukta.
function frame() {
  const H = canvas.clientHeight || innerHeight;
  if (!phoneMq.matches) return { nx: 0.46, ny: -0.04, size: 0.72, maxW: 0.46, yaw: -HP + 0.64, pitch: 0.14 };
  const top = ($('.top')?.getBoundingClientRect().bottom || 64) + 8;
  const textTop = $('[data-hero]').getBoundingClientRect().top - canvas.getBoundingClientRect().top - 34;
  const h = Math.max(90, textTop - top);
  return { nx: 0, ny: 1 - (top + textTop) / H, size: Math.min(0.5, (h / H) * 0.92), maxW: 0.9, yaw: -HP + 0.62, pitch: 0.18 };
}
let F = null;
const refit = () => { F = frame(); stage?.resize(); };

function pose() {
  const cloth = S.fly < 1 ? {
    nx: 0, ny: 0, z: 1.5, size: Math.max(1.14, (1.14 * innerWidth / innerHeight * 4) / 3.2), maxW: 99,
    rx: 0, ry: 0, rz: 0, wind: 0.35 + S.fly * 0.8, fold: 0.9, chalk: 0, cut: 0, stitch: 0, puff: 0, mat: 0, fly: S.fly, freq: 0.45,
  } : null;
  return { seat: { ...F, explode: 0, worn: S.worn, light: S.light, spin: S.spin, mat: S.mat, recline: 0, head: 0 }, cloth };
}

let visible = true;
let last = performance.now();
let running = false;
function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!stage || !visible || document.hidden) return;
  stage.render(pose(), reducedMotion ? 0 : dt);
}
function setMatLabel() {
  const i = Math.round(S.mat);
  const t = matAdlari[i] || '';
  if (matLabel.textContent !== t) matLabel.textContent = t;
}

async function makeStage() {
  try {
    const { createStage } = await import('./scene.js');
    stage = await createStage(canvas, { lite, weak });
    refit();
    addEventListener('resize', () => requestAnimationFrame(refit));
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
    gsap.fromTo(canvas, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 });
    if (reducedMotion) {
      Object.assign(S, { worn: 0, mat: 3, fly: 1, spin: 0 });
      setMatLabel();
      stage.render(pose(), 0);
      addEventListener('resize', () => requestAnimationFrame(() => stage.render(pose(), 0)));
      return;
    }
    // Açılış (bir kez): örtü uçar (~1,1 sn), koltuk kumaştan kapitoneye döner. Kaydırma kilitlenmez.
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(S, { fly: 1, duration: 1.1, ease: 'power2.in' }, 0)
      .to(S, { worn: 0, duration: 0.6, ease: 'power1.out' }, 0.9)
      .to(S, { mat: 3, duration: 2.6, ease: 'power1.inOut', onUpdate: setMatLabel }, 1.3)
      .fromTo(matLabel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.2);
    setMatLabel();
    if (!running) { running = true; gsap.ticker.add(tick); }
  } catch (e) {
    console.warn('3D sahne açılamadı', e);
    document.documentElement.classList.add('no-gl');
  }
}

// --- Başlat ------------------------------------------------------------------------

initSmoothScroll();
const topEl = $('.top');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);
makeStage();
document.fonts?.ready.then(refit);

if (!reducedMotion) {
  gsap.from('.ln__in', { yPercent: 110, duration: 0.9, stagger: 0.08, ease: 'power4.out' });
  gsap.from('[data-hero] > :not(.hero__title)', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.2, ease: 'power3.out', clearProps: 'all' });

  $$('.svc__item').forEach((li) => {
    const img = $('.svc__img', li);
    gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)' }, {
      clipPath: 'inset(0 0 0% 0)', ease: 'none',
      scrollTrigger: { trigger: li, start: 'top 90%', end: 'top 50%', scrub: true },
    });
    gsap.from($$('.svc__body > *', li), {
      y: 26, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 78%', toggleActions: 'play none none none' },
    });
  });
  $$('.card').forEach((c, i) => gsap.from(c, { y: 40, opacity: 0, duration: 0.7, delay: (i % 3) * 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.rev__track', start: 'top 85%', toggleActions: 'play none none none' } }));
  gsap.from('.visit__col', { y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.visit', start: 'top 75%', toggleActions: 'play none none none' } });
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}
