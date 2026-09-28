import raw from '../../data/kristal.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger, GUNLER,
} from '../../shared/core.js';

// Klasik aile ("Vantuz"). Künyenin yanında vantuzla tutulan ön cam; künye ekrandan çıkarken cam katmanlarına
// ayrılır. Pin yok. Gerisi düz site: Hizmetler (taş izi boyu, film koyulukları, çalışma sırası), Hakkında,
// Saatler ve konum, Örnek yorumlar, İletişim.
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const ad = d.isletme.ad;
const yas = new Date().getFullYear() - d.isletme.kurulus;
const st = gunDurumu(d.saatler);
const no = (i) => String(i + 1).padStart(2, '0');

// --- Render ----------------------------------------------------------------

const binds = {
  ad, tanim: d.isletme.tanim, telefon: d.iletisim.telefon, adres: d.iletisim.adres, kisaAdres: kisaAdres(d.iletisim.adres),
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${ad}, sayfa başı`);
$('[data-year]').textContent = new Date().getFullYear();

// Başlık: işletme adı kelime kelime
$('[data-hero-name]').innerHTML = ad.split(/\s+/).map((w) => `<span>${esc(w)}</span>`).join(' ');
if (ad.length > 18) $('[data-hero-name]').classList.add('is-long');

$$('[data-status]').forEach((el) => {
  el.innerHTML = st.open
    ? '<span class="top__status-long">Şu an açık</span><span class="top__status-short">Açık</span>'
    : '<span class="top__status-long">Şu an kapalı</span><span class="top__status-short">Kapalı</span>';
  el.classList.toggle('is-open', st.open);
});
$('[data-kunye]').textContent = st.kunye;
$('[data-kunye]').classList.toggle('is-open', st.open);
$('[data-status-big]').textContent = st.metin;
$('[data-status-big]').classList.toggle('is-open', st.open);
$('[data-status-text]').textContent = st.metin;

$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <li class="svc">
    <span class="svc__no">${no(i)}</span>
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</p>
  </li>`).join('');

$('[data-steps]').innerHTML = `<span class="steps__bar" aria-hidden="true"></span>` + d.surec.map((s, i) => `
  <li class="step">
    <p class="step__no">${no(i)}</p>
    <h3 class="step__title">${esc(s.baslik)}</h3>
    <p class="step__text">${esc(s.aciklama)}</p>
  </li>`).join('');

$('[data-about]').textContent = `${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${d.isletme.hakkinda}`;
$('[data-facts]').innerHTML = [
  ...(d.bilgiler || []),
  ...(d.markalar?.length ? [['Cam takılan markalar', d.markalar.join(', ')]] : []),
].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');

$('[data-stats]').innerHTML = `
  <li class="stat"><span class="stat__num">${yas} yıl</span><span class="stat__label">Şaşmaz Oto Sanayi Sitesi'nde</span></li>
  <li class="stat"><span class="stat__num">${acikGunSayisi(d.saatler)} gün</span><span class="stat__label">haftada açık</span></li>`;

$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="shot">
    <div class="shot__img"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="900" height="1200" /></div>
    <figcaption><b>${no(i)}</b>${esc(g.alt)}</figcaption>
  </figure>`).join('');

$('[data-film]').innerHTML = (d.filmler || []).map((f) => `
  <li class="fstrip" style="--o:${(((100 - f.gecirgenlik) / 100) * 0.9).toFixed(2)}">
    <span class="fstrip__tint"></span>
    <span class="fstrip__ad">${esc(f.ad)}</span>
    <span class="fstrip__not">${esc(f.not)}</span>
  </li>`).join('');

const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-reviews]').innerHTML = d.yorumlar.map((r) => `
  <li class="review">
    <p class="review__stars" role="img" aria-label="5 üzerinden ${Number(r.puan) || 5}">${star(r.puan)}</p>
    <blockquote class="review__text">${esc(r.metin)}</blockquote>
    <p class="review__who">${esc(r.ad)}<span>${esc(r.arac)}</span></p>
  </li>`).join('');

// Saatler: bugünü işaretle
const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('[data-hours]').innerHTML = saatListesi(d.saatler).map(([gun, saat]) => `
  <tr class="${bugunMu(gun) ? 'is-today' : ''}"><th scope="row">${esc(gun)}</th><td class="${saat === 'Kapalı' ? 'is-closed' : ''}">${esc(saat)}</td></tr>`).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Taş izi boyu ---------------------------------------------------------------------

const tasIzi = d.hizmetler.find((h) => /taş|çatlak/i.test(h.baslik));
const onCam = d.hizmetler.find((h) => /ön cam/i.test(h.baslik));
const iz = $('[data-iz]');
const breakG = $('[data-break]');
function buildBreak(mm) {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = mm / 2;
  const paths = [];
  const rays = 9;
  for (let i = 0; i < rays; i++) {
    let a = (i / rays) * Math.PI * 2 + rnd() * 0.5;
    const len = R * (0.65 + rnd() * 0.45);
    let x = 0, y = 0, p = 'M0 0';
    const segs = 4;
    for (let s = 0; s < segs; s++) { a += (rnd() - 0.5) * 0.5; x += (Math.cos(a) * len) / segs; y += (Math.sin(a) * len) / segs; p += ` L${x.toFixed(2)} ${y.toFixed(2)}`; }
    paths.push(`<path d="${p}" stroke-width="${(0.35 + mm / 180).toFixed(2)}"/>`);
  }
  const ring = (r, a0, a1) => {
    const x1 = Math.cos(a0) * r, y1 = Math.sin(a0) * r, x2 = Math.cos(a1) * r, y2 = Math.sin(a1) * r;
    return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke-width=".35" opacity=".8"/>`;
  };
  paths.push(ring(R * 0.3, 0.2, 2.4), ring(R * 0.34, 3.3, 5.7));
  if (mm > 30) paths.push(ring(R * 0.62, 4.0, 5.9), ring(R * 0.7, 0.7, 2.2));
  breakG.innerHTML = paths.join('') + `<circle class="chip" r="${Math.max(0.9, mm * 0.06).toFixed(2)}"/>`;
}
const verdicts = {
  tamir: { tag: 'Tamir', title: 'Reçineyle tamir edilir', text: () => `Cam değişmez. İz temizlenip reçineyle doldurulur ve UV ışıkla sertleştirilir. Süre yaklaşık ${tasIzi?.sure || '30 dk'}.` },
  sinir: { tag: 'Sınırda', title: 'Fotoğrafa bakılır', text: () => 'Bu boyda reçine çoğu zaman tutar, ama izin derinliği ve yeri de önemlidir. Karar fotoğrafa bakılarak verilir.' },
  degisim: { tag: 'Değişim', title: 'Cam değişir', text: () => `Bu boydaki iz yol titreşiminde büyür. Araca uygun cam stokta ise aynı gün takılır. Süre yaklaşık ${onCam?.sure || '2–3 saat'}.` },
};
function setIz() {
  const mm = Number(iz.value);
  const k = mm <= 26 ? 'tamir' : mm <= 40 ? 'sinir' : 'degisim';
  const v = verdicts[k];
  $('[data-iz-out]').textContent = `${mm} mm`;
  iz.style.setProperty('--p', `${((mm - iz.min) / (iz.max - iz.min)) * 100}%`);
  const box = $('[data-verdict]');
  box.dataset.k = k;
  $('[data-v-tag]').textContent = v.tag;
  $('[data-v-title]').textContent = v.title;
  $('[data-v-text]').textContent = v.text();
  $('[data-wa-test]').href = waHref(d, `Merhaba ${ad}, camımda yaklaşık ${mm} mm boyunda bir iz var. Fotoğrafını gönderiyorum, tamir olur mu?`);
  buildBreak(mm);
}
iz.addEventListener('input', setIz);
setIz();

// --- Hareket -----------------------------------------------------------------------

const top = $('[data-top]');
const onScroll = () => top.classList.toggle('is-solid', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

const stackEl = $('[data-stack]');
const stage = $('.hero__stage');
const bir = (trigger, start = 'top 88%') => ({ trigger, start, toggleActions: 'play none none none' });

if (reducedMotion) {
  gsap.set('[data-cup]', { opacity: 1 });
} else {
  initSmoothScroll();

  // Açılış (~1 sn): cam vantuzla yukarıdan iner, künye gelir
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from(stage, { yPercent: -10, opacity: 0, duration: 0.9 }, 0.05)
    .from('.hero__copy > *', { y: 18, opacity: 0, duration: 0.55, stagger: 0.06, clearProps: 'all' }, 0.1);

  // Künye ekrandan çıkarken cam katmanlarına ayrılır (pin yok, kaydırmaya bağlı)
  const layers = { out: $('[data-l="out"]'), pvb: $('[data-l="pvb"]'), in: $('[data-l="in"]') };
  gsap.set(layers.out, { z: 2 });
  gsap.set(layers.pvb, { z: 1 });
  gsap.set(layers.in, { z: 0 });
  const mm = gsap.matchMedia();
  mm.add({ small: '(max-width: 899px)', big: '(min-width: 900px)' }, (ctx) => {
    const small = ctx.conditions.small;
    const sep = small ? 40 : 80;
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '[data-hero]', start: small ? 'top top-=40' : 'top top', end: 'bottom top', scrub: 0.6,
        onUpdate: (self) => stage.classList.toggle('is-open', self.progress > 0.08),
      },
    });
    tl.to('[data-cup]', { y: -60, scale: 1.2, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .to(stackEl, { rotationX: 52, rotationZ: small ? -20 : -26, scale: 0.84, duration: 0.6 }, 0.1)
      .to(layers.out, { z: sep, duration: 0.6 }, 0.15)
      .to(layers.in, { z: -sep, duration: 0.6 }, 0.15);
    return () => stage.classList.remove('is-open');
  });

  // Hizmet satırları: kırmızı çizgi ve kayma
  $$('.svc').forEach((el) => {
    gsap.fromTo(el, { y: 26, opacity: 0, '--sx': 0 }, {
      y: 0, opacity: 1, '--sx': 1, duration: 0.8, ease: 'power3.out', scrollTrigger: bir(el),
      onComplete() { gsap.to(el, { '--sx': 0, duration: 0.6, delay: 0.2 }); },
    });
  });
  $$('.shot').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'power3.inOut', scrollTrigger: bir(el, 'top 92%') });
    gsap.to(el.querySelector('img'), { scale: 1, duration: 1.6, ease: 'power2.out', scrollTrigger: bir(el, 'top 92%') });
  });
  gsap.fromTo('.steps__bar', { scaleX: 0, scaleY: 0 }, {
    scaleX: 1, scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
  });
  gsap.from('.step', { y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('.steps', 'top 82%') });
  gsap.from('.stat', { y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('.stats__list', 'top 90%') });
  gsap.from('.fstrip__tint', {
    scaleX: () => (innerWidth < 900 ? 0 : 1), scaleY: () => (innerWidth < 900 ? 1 : 0),
    duration: 0.9, stagger: 0.12, ease: 'power3.inOut', scrollTrigger: bir('.film__ladder', 'top 75%'),
  });
  gsap.from('.final__big', { yPercent: 18, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: bir('.final', 'top 75%') });
}

addEventListener('load', () => ScrollTrigger.refresh());
