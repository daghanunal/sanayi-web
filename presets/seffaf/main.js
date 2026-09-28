import raw from '../../data/kristal.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';

// Klasik aile. Künye ön cam gibi: açılışta silecek buğuyu bir kez siler. Gerisi düz site bölümleri:
// Hizmetler (film koyulukları ve çalışma sırası), Hakkında, Saatler ve konum, Örnek yorumlar, İletişim.
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const ad = d.isletme.ad;
const yas = new Date().getFullYear() - d.isletme.kurulus;
const st = gunDurumu(d.saatler);

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
$('[data-stamp-since]').textContent = `Şaşmaz ${d.isletme.kurulus}`;

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

$('[data-services]').innerHTML = d.hizmetler.map((s) => `
  <li class="svc">
    <h3 class="svc__name">${esc(s.baslik)}</h3>
    <p class="svc__desc">${esc(s.aciklama)}</p>
    <p class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</p>
  </li>`).join('');

$('[data-steps]').innerHTML = d.surec.map((s) => `
  <li class="step">
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

$('[data-gallery]').innerHTML = d.galeri.map((g) => `
  <li class="shot"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="840" height="1050" /><span>${esc(g.alt)}</span></li>`).join('');

const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-reviews]').innerHTML = d.yorumlar.map((r) => `
  <li class="review">
    <p class="review__stars" role="img" aria-label="5 üzerinden ${r.puan}">${star(r.puan)}</p>
    <blockquote class="review__text">${esc(r.metin)}</blockquote>
    <p class="review__who">${esc(r.ad)}<span>${esc(r.arac)}</span></p>
  </li>`).join('');

$('[data-hours]').innerHTML = saatListesi(d.saatler)
  .map(([gun, saat]) => `<tr><th scope="row">${gun}</th><td class="${saat === 'Kapalı' ? 'is-closed' : ''}">${saat}</td></tr>`).join('');

// Harita: yaklaşınca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Cam filmi koyulukları -------------------------------------------------

const films = d.filmler || [];
let filmIdx = Math.max(0, films.findIndex((f) => f.ad === '%35'));
$('[data-film-opts]').innerHTML = films.map((f, i) => `
  <button type="button" role="radio" class="film__opt" data-film="${i}" aria-checked="false">${esc(f.ad)}</button>`).join('');

function setFilm(i, animate = true) {
  filmIdx = i;
  const f = films[i];
  $$('[data-film]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.film) === i)));
  const dark = (100 - f.gecirgenlik) / 100;
  const dur = animate && !reducedMotion ? 0.6 : 0;
  gsap.to('[data-tint]', { opacity: dark * 0.92, duration: dur, ease: 'power2.out' });
  gsap.to('[data-glare]', { opacity: 1 - dark, duration: dur, ease: 'power2.out' });
  $('[data-m-gec]').textContent = `%${f.gecirgenlik}`;
  $('[data-film-not]').textContent = f.not;
  $('[data-film-cta]').textContent = `${f.ad} film için bilgi al`;
  $('[data-wa-film]').href = waHref(d, `Merhaba ${ad}, camlarıma ${f.ad} cam filmi çektirmek istiyorum. Bilgi alabilir miyim?`);
}
$('[data-film-opts]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-film]');
  if (b) setFilm(Number(b.dataset.film));
});
$('[data-film-opts]').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
  const n = (filmIdx + dir + films.length) % films.length;
  setFilm(n);
  $(`[data-film="${n}"]`).focus();
});
if (films.length) setFilm(filmIdx, false);

// --- Silecek maskesi: pivot altta ortada, açıyla büyüyen dilim --------------

function sectorClip(el, angleDeg) {
  // angleDeg: silinen bölümün sağ kenarı; 180 = hiç silinmedi, 0 = tamamı silindi
  const w = el.clientWidth, h = el.clientHeight;
  const px = w / 2, py = h;
  const R = Math.hypot(w, h) * 1.05;
  const pts = [`${px}px ${py}px`];
  for (let a = 180; a >= angleDeg; a -= 6) {
    const r = (a * Math.PI) / 180;
    pts.push(`${(px + Math.cos(r) * R).toFixed(1)}px ${(py - Math.sin(r) * R).toFixed(1)}px`);
  }
  const r = (angleDeg * Math.PI) / 180;
  pts.push(`${(px + Math.cos(r) * R).toFixed(1)}px ${(py - Math.sin(r) * R).toFixed(1)}px`);
  el.style.clipPath = `polygon(${pts.join(',')})`;
}

// --- Hareket ---------------------------------------------------------------

const lenis = initSmoothScroll();
const top = $('[data-top]');
const solid = () => top.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', solid, { passive: true });
solid();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

const bir = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

if (reducedMotion) {
  document.documentElement.classList.add('is-still');
} else {
  const clear = $('[data-clear]');
  const wiper = $('[data-wiper]');
  const wipe = { a: 180 };
  const applyWipe = () => {
    sectorClip(clear, wipe.a);
    wiper.style.transform = `rotate(${-wipe.a}deg)`;
  };
  applyWipe();

  // Açılış: tek bir silecek darbesi buğuyu siler (~1 sn), künye gelir
  gsap.timeline({ delay: 0.2 })
    .from('.hero__copy > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }, 0.15)
    .to(wipe, { a: 0, duration: 1, ease: 'power2.inOut', onUpdate: applyWipe }, 0)
    .to(wiper, { opacity: 0, duration: 0.25 }, 0.95)
    .add(() => (clear.style.clipPath = 'none'));

  // Hizmet satırlarının üst çizgisi: camın kenarı gibi soldan sağa
  $$('.svc').forEach((row) => {
    gsap.fromTo(row, { '--edge': 0 }, {
      '--edge': 1, ease: 'none',
      scrollTrigger: { trigger: row, start: 'top 92%', end: 'top 60%', scrub: true },
    });
  });

  gsap.from('.step', { opacity: 0, y: 26, duration: 0.7, stagger: 0.12, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('[data-steps]', 'top 80%') });
  gsap.from('.stat', { opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir('[data-stats]', 'top 90%') });
  gsap.fromTo('.shot img', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: 'inset(0 0% 0 0)', duration: 1, stagger: 0.12, ease: 'power3.inOut', scrollTrigger: bir('[data-gallery]', 'top 88%'),
  });

  // İletişim: bölüme girerken ikinci silecek darbesi
  const finalClear = $('[data-final-clear]');
  const fw = { a: 180 };
  const applyFinal = () => sectorClip(finalClear, fw.a);
  applyFinal();
  gsap.to(fw, {
    a: 0, ease: 'none', onUpdate: applyFinal,
    scrollTrigger: { trigger: '[data-final]', start: 'top 85%', end: 'top 25%', scrub: 0.5 },
  });

  addEventListener('resize', () => {
    applyFinal();
    if (clear.style.clipPath !== 'none') applyWipe();
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
void lenis;
