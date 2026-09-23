import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createEngine } from './engine.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const nf = new Intl.NumberFormat('tr-TR');
const years = new Date().getFullYear() - d.isletme.kurulus;

// --- Metin ve linkler ----------------------------------------------------

$$('[data-name]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `${d.isletme.kurulus}'dan beri Şaşmaz Oto Sanayi'de`;
$('[data-years]').textContent = years;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = `Onayınız olmadan tek parça değişmez. ${d.garanti}`;
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));

$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  if (!a.textContent.trim()) a.textContent = d.iletisim.telefon;
  a.insertAdjacentHTML('afterbegin', icons.phone);
});
$$('[data-wa]').forEach((a) => {
  a.href = waHref(d);
  a.target = '_blank';
  a.rel = 'noopener';
  a.insertAdjacentHTML('afterbegin', icons.whatsapp);
});
$('[data-maps]').href = mapsHref(d);

// Açık / kapalı
const st = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = st.text;
  el.classList.toggle('is-open', st.open);
});

// İstatistikler (kuruluş yılı URL ile değişebilir, o yüzden ilk kalemi hesaplarız)
$('[data-stats]').innerHTML = d.istatistikler
  .map((s, i) => {
    const val = i === 0 && /yıl/.test(s.etiket) ? years : s.deger;
    return `<div class="stat"><dt>${esc(s.etiket)}</dt><dd><span data-count="${val}">${nf.format(val)}</span>${esc(s.sonek)}</dd></div>`;
  })
  .join('');

$('[data-services]').innerHTML = d.hizmetler
  .map(
    (h) => `<li class="svc">
      <h3 class="svc__t">${esc(h.baslik)}</h3>
      <p class="svc__d">${esc(h.aciklama)}</p>
      <p class="svc__time"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
    </li>`
  )
  .join('');

$('[data-process]').innerHTML = d.surec
  .map(
    (s, i) => `<li class="step">
      <span class="step__n" aria-hidden="true">${i + 1}</span>
      <h3 class="step__t">${esc(s.baslik)}</h3>
      <p class="step__d">${esc(s.aciklama)}</p>
    </li>`
  )
  .join('');

const [hero, ...rest] = d.galeri;
const revealImg = $('[data-reveal-img]');
revealImg.src = hero.src;
revealImg.alt = hero.alt;
$('[data-gallery]').innerHTML = rest
  .map(
    (g, i) => `<figure class="shot shot--${i + 1}"><div class="shot__in"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></div></figure>`
  )
  .join('');

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${icons.star.repeat(Math.round(n))}</span>`;
$('[data-rating]').innerHTML = `
  <p class="rating__n">${String(d.puan.ortalama).replace('.', ',')}</p>
  <div>${stars(5)}<p class="rating__c">${nf.format(d.puan.adet)} Google yorumu</p></div>`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map(
    (y) => `<li class="rev">
      ${stars(y.puan)}
      <blockquote class="rev__q">${esc(y.metin)}</blockquote>
      <p class="rev__who"><b>${esc(y.ad)}</b> <span>${esc(y.arac)}</span></p>
    </li>`
  )
  .join('');

const brandRun = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('');
$('[data-brands]').innerHTML = `<div class="brands__track">${brandRun}${brandRun}</div>`;

$('[data-hours]').innerHTML = `<caption class="sr-only">Çalışma saatleri</caption><tbody>${groupedHours(d.saatler)
  .map(([g, s]) => `<tr><th scope="row">${g}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${s}</td></tr>`)
  .join('')}</tbody>`;

// Harita: yalnızca görünür olunca yüklenir
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '400px' }).observe(mapBox);

// --- Takometre -----------------------------------------------------------

const ticks = $('.tach__ticks');
for (let i = 0; i <= 7; i++) {
  const a = Math.PI + (i / 7) * Math.PI;
  const x1 = 100 + Math.cos(a) * 80, y1 = 110 + Math.sin(a) * 80;
  const x2 = 100 + Math.cos(a) * 68, y2 = 110 + Math.sin(a) * 68;
  const tx = 100 + Math.cos(a) * 56, ty = 110 + Math.sin(a) * 56 + 4;
  ticks.insertAdjacentHTML('beforeend',
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" /><text x="${tx}" y="${ty}">${i}</text>`);
}
const needle = $('.tach__needle');
const rpmOut = $('[data-rpm]');
const setTach = (rpm) => {
  const deg = -90 + (Math.min(rpm, 7000) / 7000) * 180;
  needle.setAttribute('transform', `rotate(${deg} 100 110)`);
  rpmOut.textContent = nf.format(Math.round(rpm / 10) * 10);
};

// --- Hareket -------------------------------------------------------------

const lenis = initSmoothScroll();
const heroEl = $('.hero');
const engine = createEngine($('.hero__canvas'), { reducedMotion });

if (reducedMotion) {
  engine.renderOnce();
  setTach(850);
  document.documentElement.classList.add('no-motion');
} else {
  // Giriş: isim harf harf yükselir, motor karanlıktan belirir
  const split = new SplitText('.hero__title', { type: 'words,chars', wordsClass: 'w', charsClass: 'ch', mask: 'words' });
  gsap.timeline({ defaults: { ease: 'power4.out' } })
    .from('.hero__canvas', { opacity: 0, scale: 1.08, duration: 1.8 }, 0)
    .from(split.chars, { yPercent: 110, duration: 1.1, stagger: 0.035 }, 0.25)
    .from(['.hero__since', '.hero__slogan', '.hero__actions', '.tach', '.hero__hint'], { opacity: 0, y: 24, duration: 0.9, stagger: 0.08 }, 0.7);

  // Devir: scroll hızına göre yükselir, bırakınca rölantiye iner
  let target = 850;
  let rpm = 850;
  gsap.ticker.add(() => {
    rpm += (target - rpm) * 0.08;
    target += (850 - target) * 0.04;
    engine.setRpm(rpm);
    setTach(rpm);
  });

  const mm = gsap.matchMedia();
  mm.add({ small: '(max-width: 899px)', large: '(min-width: 900px)' }, (ctx) => {
    const { small } = ctx.conditions;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroEl,
        start: 'top top',
        end: small ? '+=220%' : '+=260%',
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          engine.setProgress(self.progress);
          const v = Math.abs(self.getVelocity());
          target = Math.max(target, Math.min(6900, 850 + v * 2.4));
        },
        onToggle: (self) => (self.isActive ? engine.start() : null),
      },
    });
    tl.to('.hero__chapter--1', { opacity: 0, y: -60, duration: 1, ease: 'power2.in' }, 0.6)
      .to('.hero__hint', { opacity: 0, duration: 0.4 }, 0)
      .fromTo('.hero__chapter--2', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1 }, 1.4)
      .to('.hero__chapter--2', { opacity: 0, y: -60, duration: 1, ease: 'power2.in' }, 3)
      .fromTo('.hero__chapter--3', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1 }, 3.8)
      .to('.hero__glow', { opacity: 1, scale: 1.25, duration: 5 }, 0)
      .to({}, { duration: 0.8 });
  });

  // Hero ekrandan çıkınca render durur
  ScrollTrigger.create({
    trigger: heroEl,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? engine.start() : engine.stop()),
  });
  engine.start();

  // Hakkında başlığı: satır satır
  const aboutSplit = new SplitText('.about__h', { type: 'lines', linesClass: 'line', mask: 'lines' });
  gsap.from(aboutSplit.lines, {
    yPercent: 100, duration: 1, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.about', start: 'top 70%' },
  });

  // Sayılar
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = nf.format(Math.round(obj.v))),
    });
  });

  // Tam ekran fotoğraf: pencere açılır gibi büyür
  gsap.fromTo('.reveal__frame',
    { clipPath: 'inset(18% 22% 18% 22% round 28px)' },
    {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: '.reveal', start: 'top 85%', end: 'top 10%', scrub: true },
    });
  gsap.fromTo('.reveal__img', { scale: 1.3 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.reveal', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // Süreç: kızgın çizgi adımlar boyunca ilerler
  gsap.fromTo('.process__line span', { scaleX: 0, scaleY: 0 }, {
    scaleX: 1, scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '.process__track', start: 'top 75%', end: 'bottom 60%', scrub: true },
  });
  $$('.step').forEach((s) =>
    ScrollTrigger.create({ trigger: s, start: 'top 70%', onEnter: () => s.classList.add('is-lit') })
  );

  // Galeri paralaks
  $$('.shot').forEach((s, i) => {
    gsap.fromTo($('img', s), { yPercent: -10 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from(s, {
      y: 80 + i * 30, ease: 'none',
      scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'center center', scrub: true },
    });
  });

  // Son çağrı başlığı
  const ctaSplit = new SplitText('.cta__h', { type: 'chars,words', charsClass: 'ch' });
  gsap.from(ctaSplit.chars, {
    yPercent: 100, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.015,
    scrollTrigger: { trigger: '.cta', start: 'top 70%' },
  });
}

// Üst çubuk: hero bitince koyu zemine geçer
ScrollTrigger.create({
  trigger: '.about', start: 'top 80px', end: 'max',
  toggleClass: { targets: '.top', className: 'is-solid' },
});

// Görseller yüklendikçe ölçüleri güncelle
window.addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
void lenis;
