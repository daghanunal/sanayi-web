import raw from '../../data/showroom.json';
import extra from '../../data/boya-klasik2.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, ...extra });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat('tr-TR');
const mobil = () => innerWidth < 900;

// "2008'den", "1994'ten", "1990'dan"
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  if (n % 10) return `${n}'${birler[n % 10]}`;
  if (n % 100) return `${n}'${onlar[(n % 100) / 10]}`;
  return `${n}'den`;
}

// --- Metinler ve linkler ----------------------------------------------------
const fotoMesaj = `Merhaba ${d.isletme.ad}, aracımın fotoğraflarını gönderiyorum. Fiyat alabilir miyim?`;
const binds = {
  ad: d.isletme.ad,
  slogan: d.isletme.slogan,
  hakkinda: String(d.isletme.hakkinda ?? '').replace(/\b(19|20)\d\d'(?:d|t)[ae]n\b/, ablative(d.isletme.kurulus)),
  telefon: d.iletisim.telefon,
  adres: d.iletisim.adres,
  garanti: d.garanti,
  since: `Şaşmaz'da ${ablative(d.isletme.kurulus)} beri · Boya ve kaporta`,
  copy: `© ${new Date().getFullYear()} ${d.isletme.ad}`,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
const hrefs = { tel: telHref(d), 'wa-foto': waHref(d, fotoMesaj), maps: mapsHref(d) };
$$('[data-href]').forEach((el) => (el.href = hrefs[el.dataset.href]));
$$('[data-icon]').forEach((el) => (el.outerHTML = icons[el.dataset.icon]));
$('.top__call').setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);

function refreshStatus() {
  const s = openStatus(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.textContent = s.text;
    el.classList.toggle('is-open', s.open);
  });
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// --- Katlar (hero) ------------------------------------------------------------
const katlar = d.katlar;
const toplam = katlar.reduce((a, k) => a + k.mikron, 0);
const SAC_PAY = 26; // kesitte sacın yüksekliği (%)
let alt = 0;
const bandlar = katlar.map((k, i) => {
  const h = i === 0 ? SAC_PAY : ((100 - SAC_PAY) * k.mikron) / toplam;
  const b = { bottom: alt, h };
  alt += h;
  return b;
});
$('[data-kesit]').innerHTML = katlar.map((k, i) => `
  <div class="band band--${i}" style="bottom:${bandlar[i].bottom}%;height:${bandlar[i].h}%">
    <span class="band__fill"></span>
    <span class="band__label mono">${esc(k.ad)}${k.mikron ? ` · ${k.mikron} µm` : ''}</span>
  </div>`).join('');

const capHtml = katlar.map((k, i) => `
  <div class="cap" data-cap="${i}">
    <p class="cap__no mono">${String(i + 1).padStart(2, '0')} / ${String(katlar.length).padStart(2, '0')}${k.mikron ? ` · ${k.mikron} µm` : ''}</p>
    <h2 class="cap__title">${esc(k.ad)}.</h2>
    <p class="cap__text">${esc(k.not)}</p>
  </div>`).join('') + `
  <div class="cap cap--final" data-cap="${katlar.length}">
    <p class="cap__no mono">Toplam ${toplam} µm · bir kâğıt yaprağı kalınlığında</p>
    <h2 class="cap__title">Fabrikadan çıktığı gibi.</h2>
    <p class="cap__text">Dört kat, fırınlı kabin, gün ışığında son kontrol. <a data-href="wa-foto" href="${esc(hrefs['wa-foto'])}" target="_blank" rel="noopener">Fotoğraf gönderin →</a></p>
  </div>`;
$('[data-caps]').innerHTML = capHtml;

// --- Hizmetler -------------------------------------------------------------------
$('[data-services]').innerHTML = d.hizmetler.map((h, i) => `
  <li class="hz" style="--c:var(--k${i % 4})">
    <span class="hz__no mono">${String(i + 1).padStart(2, '0')}</span>
    <div class="hz__body">
      <h3 class="hz__title">${esc(h.baslik)}</h3>
      <p class="hz__desc">${esc(h.aciklama)}</p>
      ${h.sure ? `<span class="hz__time mono">${esc(h.sure)}</span>` : ''}
    </div>
    ${h.gorsel ? `<div class="hz__thumb"><img src="${esc(h.gorsel)}" alt="" loading="lazy" /></div>` : ''}
  </li>`).join('');

// --- Ölçüm föyü -------------------------------------------------------------------
const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-stats]').innerHTML = d.istatistikler.map((s) => {
  const v = s.deger === 'kurulustan' ? yil : Number(s.deger);
  return `<div class="st">
    <dt class="st__label">${esc(s.etiket)}</dt>
    <dd class="st__val mono"><b data-count="${v}">${nf.format(v)}</b><span>${esc(s.sonek ?? '')}</span></dd>
  </div>`;
}).join('');

// --- Renk seçici ----------------------------------------------------------------
const renkler = d.renkler;
$('[data-swatches]').innerHTML = renkler.map((r, i) => `
  <button type="button" class="sw" role="radio" aria-checked="${i === 0}" aria-label="${esc(r.ad)}" data-sw="${i}" style="--sw:${esc(r.hex)}"><span></span></button>`).join('');
const renkName = $('[data-renk-name]');
const oran = d.istatistikler.find((s) => s.sonek === '%');
$('[data-renk-rate]').textContent = oran ? ` · %${oran.deger} ${oran.etiket}` : '';
renkName.textContent = renkler[0].ad;
let renkAktif = 0;
let imgA = $('[data-renk-a]');
let imgB = $('[data-renk-b]');
const renkEdge = $('.renk__edge');
function renkSec(i) {
  if (i === renkAktif) return;
  renkAktif = i;
  const r = renkler[i];
  $$('.sw').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.sw) === i)));
  renkName.textContent = r.ad;
  renkEdge.style.setProperty('--c', r.hex);
  const next = imgB;
  next.alt = `${r.ad} boyalı spor otomobilin arkası`;
  const go = () => {
    gsap.killTweensOf([next, renkEdge]);
    next.classList.add('is-top');
    imgA.classList.remove('is-top');
    if (reducedMotion) {
      gsap.set(next, { clipPath: 'inset(0% 0 0 0)' });
    } else {
      gsap.fromTo(next, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'power2.inOut' });
      const fh = renkEdge.parentElement.offsetHeight;
      gsap.fromTo(renkEdge, { y: fh, opacity: 1 }, { y: 0, duration: 0.8, ease: 'power2.inOut', onComplete: () => gsap.to(renkEdge, { opacity: 0, duration: 0.2 }) });
    }
    imgB = imgA;
    imgA = next;
  };
  if (next.getAttribute('src') === r.src && next.complete) go();
  else {
    next.onload = () => { next.onload = null; go(); };
    next.src = r.src;
  }
}
$('[data-swatches]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sw]');
  if (b) renkSec(Number(b.dataset.sw));
});
// ok tuşlarıyla gezinme
$('[data-swatches]').addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault();
  const n = (renkAktif + (e.key === 'ArrowRight' ? 1 : -1) + renkler.length) % renkler.length;
  renkSec(n);
  $(`[data-sw="${n}"]`).focus();
});

// --- Süreç --------------------------------------------------------------------
$('[data-process]').innerHTML = d.surec.map((s, i) => `
  <li class="ad">
    <span class="ad__no mono">${String(i + 1).padStart(2, '0')}</span>
    <h3 class="ad__title">${esc(s.baslik)}</h3>
    <p class="ad__text">${esc(s.aciklama)}</p>
  </li>`).join('');

// --- Galeri -------------------------------------------------------------------
$('[data-gallery]').innerHTML = d.galeri.map((g, i) => `
  <figure class="g g--${i}">
    <div class="g__img"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" /></div>
    <figcaption><b>${esc(g.baslik ?? '')}</b><span class="mono">${esc(g.detay ?? '')}</span></figcaption>
  </figure>`).join('');

// --- Yorumlar -------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('[data-score]').textContent = String(d.puan.ortalama).replace('.', ',');
$('[data-stars]').innerHTML = stars(Math.round(d.puan.ortalama));
$('[data-score-text]').textContent = `${nf.format(d.puan.adet)} müşteri yorumunun ortalaması`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <li class="rv">
    <div class="rv__stars" aria-label="${y.puan} yıldız">${stars(y.puan)}</div>
    <blockquote class="rv__text">${esc(y.metin)}</blockquote>
    <p class="rv__who"><b>${esc(y.ad)}</b><span class="mono">${esc(y.arac ?? '')}</span></p>
  </li>`).join('');
const markaHtml = d.markalar.map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>');
$('[data-brands]').innerHTML = `<div>${markaHtml}<i aria-hidden="true"></i></div><div aria-hidden="true">${markaHtml}<i></i></div>`;

// --- Saatler ve harita ------------------------------------------------------------
const bugunIdx = new Date().getDay();
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
$('[data-hours] tbody').innerHTML = groupedHours(d.saatler).map(([gun, saat]) => {
  const parca = gun.split(/\s*[–-]\s*/).map((g) => g.trim());
  const bugun = parca.length === 1 ? parca[0] === GUN[bugunIdx] : (() => {
    const [a, b] = parca.map((g) => GUN.indexOf(g));
    const sira = [1, 2, 3, 4, 5, 6, 0];
    const ia = sira.indexOf(a), ib = sira.indexOf(b), ic = sira.indexOf(bugunIdx);
    return ia >= 0 && ib >= 0 && ic >= ia && ic <= ib;
  })();
  return `<tr class="${bugun ? 'is-today' : ''}"><th scope="row">${esc(gun)}</th><td class="mono">${esc(saat)}</td></tr>`;
}).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket ---------------------------------------------------------------------
const umEl = $('[data-um]');
const setUm = (v) => (umEl.textContent = String(Math.round(v)));

initSmoothScroll();

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  setUm(toplam);
} else {
  const layers = $$('.kat .layer').slice(1);
  const caps = $$('.cap');
  const bands = $$('.band');
  const um = { v: 0 };

  gsap.set(layers, { yPercent: 100 });
  gsap.set(layers.map((l) => l.querySelector('.layer__in')), { yPercent: -100 });
  gsap.set(caps, { autoAlpha: 0, y: 30 });
  gsap.set(bands.slice(1).map((b) => b.querySelector('.band__fill')), { scaleY: 0 });
  gsap.set(bands.slice(1).map((b) => b.querySelector('.band__label')), { autoAlpha: 0, x: -8 });
  gsap.set('.kesit', { autoAlpha: 0, y: 20 });

  // Açılış
  gsap.from('.kat__kicker, .kat__title, .kat__lead, .kat__actions, .kat__hint', { y: 24, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', delay: 0.1 });
  gsap.from('.layer--0 img', { scale: 1.08, duration: 1.6, ease: 'power2.out' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.kat',
      start: 'top top',
      end: () => `+=${innerHeight * (mobil() ? 3.4 : 3)}`,
      pin: '.kat__stage',
      scrub: 0.5,
      anticipatePin: 1,
    },
  });

  // 0 → intro çıkar, "Sac" gelir
  tl.to('.kat__intro', { autoAlpha: 0, y: -40, duration: 0.5, ease: 'power1.in' }, 0.1)
    .to('.kesit', { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.45)
    .to(caps[0], { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.5);

  // Her kat alttan boya tabancası gibi yükselir
  layers.forEach((layer, j) => {
    const i = j + 1;
    const t = 1 + j * 1.1;
    tl.to(layer, { yPercent: 0, duration: 1 }, t)
      .to(layer.querySelector('.layer__in'), { yPercent: 0, duration: 1 }, t)
      .to(bands[i].querySelector('.band__fill'), { scaleY: 1, duration: 1 }, t)
      .to(bands[i].querySelector('.band__label'), { autoAlpha: 1, x: 0, duration: 0.3 }, t + 0.3)
      .to(um, { v: bandlar.slice(0, i + 1).reduce((a, _, k) => a + katlar[k].mikron, 0), duration: 1, onUpdate: () => setUm(um.v) }, t)
      .to(caps[i - 1], { autoAlpha: 0, y: -24, duration: 0.3 }, t + 0.1)
      .to(caps[i], { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, t + 0.45)
      .to(layer.querySelector('.layer__edge'), { autoAlpha: 0, duration: 0.15 }, t + 0.9);
  });
  const tEnd = 1 + layers.length * 1.1;
  tl.fromTo('.gloss', { xPercent: -120 }, { xPercent: 120, duration: 0.9, ease: 'power1.inOut' }, tEnd - 0.2)
    .to(caps[layers.length], { autoAlpha: 0, y: -24, duration: 0.3 }, tEnd)
    .to(caps[layers.length + 1], { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, tEnd + 0.3)
    .to('.kesit', { '--glow': 1, duration: 0.4 }, tEnd + 0.3)
    .to({}, { duration: 0.4 });

  // Başlık ve bölüm girişleri
  gsap.utils.toArray('.sec-head, .renk__text, .konum__info').forEach((el) =>
    gsap.from(el.children, { y: 26, opacity: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 82%', once: true } })
  );

  // Hizmetler: renk şeridi soldan boyanır
  gsap.utils.toArray('.hz').forEach((el) => {
    gsap.fromTo(el, { '--p': 0 }, { '--p': 1, duration: 0.9, ease: 'power2.inOut', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    gsap.from(el.querySelector('.hz__body'), { y: 18, opacity: 0, duration: 0.6, delay: 0.15, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
  });

  // Föy: cetvel çizilir, sayılar sayılır
  gsap.from('.foy__sheet', { y: 50, rotate: -1.2, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.foy', start: 'top 78%', once: true } });
  $$('[data-count]').forEach((el) => {
    const hedef = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(o, { v: hedef, duration: 1.5, ease: 'power2.out', onUpdate: () => (el.textContent = nf.format(Math.round(o.v))) }),
    });
  });
  gsap.from('.stamp', { scale: 1.8, rotate: -18, opacity: 0, duration: 0.5, ease: 'back.out(2)', scrollTrigger: { trigger: '.foy__warranty', start: 'top 90%', once: true } });

  // Süreç: kesit sütunu kaydırdıkça dolar
  gsap.fromTo('[data-surec-fill]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.surec__list', start: 'top 70%', end: 'bottom 60%', scrub: true } });
  $$('.ad').forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 68%', end: 'bottom -99999', onToggle: (s) => el.classList.toggle('is-on', s.isActive) })
  );

  // Galeri: alttan maskeyle açılır (kaydırmaya bağlı değil, tek sefer)
  gsap.utils.toArray('.g').forEach((el) => {
    gsap.fromTo(el.querySelector('.g__img'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    gsap.from(el.querySelector('img'), { scale: 1.2, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  gsap.from('.rv', { y: 30, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 85%', once: true } });
  gsap.from('.son__strata i', { scaleX: 0, duration: 0.9, stagger: 0.12, ease: 'power3.inOut', scrollTrigger: { trigger: '.son', start: 'top 80%', once: true } });
  gsap.from('.son__title, .son__note, .son__actions', { y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.son', start: 'top 70%', once: true } });
}

// Header: hero bitince zemin alır
ScrollTrigger.create({
  trigger: '.hiz',
  start: 'top 64px',
  onEnter: () => $('[data-top]').classList.add('is-solid'),
  onLeaveBack: () => $('[data-top]').classList.remove('is-solid'),
});

addEventListener('load', () => ScrollTrigger.refresh());
