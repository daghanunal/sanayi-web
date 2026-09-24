import '../../shared/base.css';
import './style.css';
import raw from '../../data/devre.json';
import extra from '../../data/elektrik-klasik2.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, esc,
} from '../../shared/core.js';

// Klasik aile: WebGL yok. İmza anı hero'da: soket karmaşanın üstünden geçer, arkasında düzgün demet kalır.
gsap.registerPlugin(ScrollTrigger);
const d = boot({ ...raw, ...extra, preset: 'elektrik-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

// "2001'den", "1994'ten", "1990'dan": yılın okunuşuna göre ayrılma eki.
function denEki(n) {
  const s = String(n);
  const son = { 1: "'den", 2: "'den", 3: "'ten", 4: "'ten", 5: "'ten", 6: "'dan", 7: "'den", 8: "'den", 9: "'dan" };
  const onlar = { 1: "'dan", 2: "'den", 3: "'dan", 4: "'tan", 5: "'den", 6: "'tan", 7: "'ten", 8: "'den", 9: "'dan" };
  if (s.at(-1) !== '0') return s + son[s.at(-1)];
  if (s.at(-2) !== '0') return s + onlar[s.at(-2)];
  return s + "'den";
}

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = d.isletme.kurulus;
const yas = new Date().getFullYear() - yil;
const wa = (msg) => waHref(d, msg);
const img = (p) => asset(p);

// Bıçak sigorta renk kodu: amper → renk. Kablolar da bu renkleri taşır.
const AMPER = {
  5: ['#d9a441', '#1b1406'], 7.5: ['#7b4b2a', '#fff'], 10: ['#e2261c', '#fff'], 15: ['#1f5fd8', '#fff'],
  20: ['#f2c200', '#1b1606'], 25: ['#cfd2cc', '#15171a'], 30: ['#1d9b4f', '#fff'],
};
const PALET = ['#e2261c', '#1f5fd8', '#f2c200', '#1d9b4f', '#7b4b2a', '#d9a441', '#cfd2cc'];
const renk = (a) => AMPER[a] || AMPER[10];
const amp = (a) => String(a).replace('.', ',');

const fuseSVG = (a) => {
  const [c, t] = renk(a);
  return `<svg class="fuse" viewBox="0 0 40 52" aria-hidden="true">
    <rect x="9" y="30" width="7" height="20" rx="1" fill="#b9bdb8"/><rect x="24" y="30" width="7" height="20" rx="1" fill="#b9bdb8"/>
    <rect x="2" y="2" width="36" height="32" rx="5" fill="${c}"/>
    <rect x="5" y="5" width="30" height="7" rx="3" fill="#fff" opacity=".28"/>
    <text x="20" y="26" text-anchor="middle" fill="${t}" font-size="${String(a).length > 2 ? 11 : 14}" font-weight="700" font-family="Spline Sans Mono, monospace">${amp(a)}</text>
  </svg>`;
};

const durum = openStatus(d.saatler);

// --- Üst bar ------------------------------------------------------------------

$('#top').innerHTML = `
  <div class="top__in">
    <a class="top__brand" href="#hero"><span class="top__mark" aria-hidden="true"><i></i><i></i><i></i></span><span>${ad}</span></a>
    <p class="top__status ${durum.open ? 'is-open' : ''}"><i></i><span class="l">${esc(durum.text)}</span><span class="s">${durum.open ? 'Açık' : 'Kapalı'}</span></p>
    <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#ariza-kodlari">Arıza kodları</a><a href="#dukkan">Konum</a></nav>
    <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
  </div>
  <div class="top__stripe" aria-hidden="true">${PALET.map((c) => `<i style="background:${c}"></i>`).join('')}</div>`;

// --- Hero -----------------------------------------------------------------------

const H = d.hero;
const baslikHTML = (vurgu) => {
  const t = esc(H.baslik);
  const v = esc(H.vurgu || '');
  return vurgu && v && t.includes(v) ? t.replace(v, `<em>${v}</em>`) : t;
};
const kopya = (ink) => `
  <div class="hero__copy ${ink ? 'is-ink' : 'is-light'}" ${ink ? '' : 'aria-hidden="true"'}>
    <p class="hero__eyebrow">${ad} · Şaşmaz Oto Sanayi · ${denEki(yil)} beri</p>
    ${ink ? `<h1 class="hero__title" id="hero-title">${baslikHTML(true)}</h1>` : `<p class="hero__title">${baslikHTML(false)}</p>`}
    <div class="harness" ${ink ? 'data-harness' : ''}></div>
    <p class="hero__lead">${esc(H.cozum)}</p>
    <div class="hero__cta">
      <a class="btn btn--red" href="${telHref(d)}" ${ink ? '' : 'tabindex="-1"'}>${icons.phone}<span>Hemen ara</span></a>
      <a class="btn btn--ink" href="${wa()}" target="_blank" rel="noopener" ${ink ? '' : 'tabindex="-1"'}>${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
  </div>`;

$('#hero').innerHTML = `
  <div class="hero__stage">
    <div class="hero__mess">
      <img class="hero__img" src="${img('/img/elektrik-klasik2/karmasa.jpg')}" alt="Birbirine dolanmış renkli elektrik kabloları" width="1066" height="1600" fetchpriority="high" />
      <div class="hero__shade" aria-hidden="true"></div>
      <p class="hero__q" aria-hidden="true"><i></i><span>Hangisi?</span></p>
      ${kopya(false)}
    </div>
    <div class="hero__clean">
      <div class="hero__cleanIn">${kopya(true)}</div>
      <div class="plug" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <p class="hero__hint" aria-hidden="true"><span class="hero__hintLine"></span>${esc(H.ipucu)}</p>
  </div>`;

// Demet: her hizmet bir kablo, rengi sigortasının rengi.
const HAT = d.hizmetler.map((h) => ({ ad: h.baslik, a: h.sigorta, c: renk(h.sigorta)[0] }));
const FAULT = Math.max(0, HAT.findIndex((h) => /kablo|tesisat/i.test(h.ad)));
const harness = $('[data-harness]');

function drawHarness() {
  const W = harness.clientWidth;
  const h = harness.clientHeight;
  if (!W || !h) return;
  const n = HAT.length;
  const pad = Math.max(8, h * 0.07);
  const lane = (i) => pad + (i * (h - pad * 2)) / (n - 1);
  const cy = h / 2;
  const tight = Math.min(6, h / 40);
  const bx = Math.min(W * 0.2, 240);
  const sw = Math.max(5, Math.min(9, h / 42));
  const path = (i) => {
    const y0 = cy + (i - (n - 1) / 2) * tight;
    const y = lane(i);
    return `M -20 ${y0} L ${bx * 0.28} ${y0} C ${bx * 0.62} ${y0}, ${bx * 0.55} ${y}, ${bx} ${y} L ${W + 30} ${y}`;
  };
  const wires = HAT.map((w, i) => {
    const p = path(i);
    const light = w.a === 25 || w.a === 20 || w.a === 5;
    const stripe = w.a === 30 ? `<path d="${p}" stroke="#f2c200" stroke-width="${sw}" stroke-dasharray="14 18" fill="none"/>` : '';
    return `<g class="wire ${i === FAULT ? 'is-fault' : ''}" style="--c:${w.c}">
      <path d="${p}" stroke="${light ? '#8a8e88' : '#15171a'}" stroke-opacity=".55" stroke-width="${sw + 2.4}" fill="none"/>
      <path d="${p}" stroke="${w.c}" stroke-width="${sw}" fill="none"/>
      ${stripe}
      <path d="${p}" stroke="#fff" stroke-opacity=".38" stroke-width="${Math.max(1.2, sw * 0.22)}" fill="none" transform="translate(0 ${-sw * 0.22})"/>
    </g>`;
  }).join('');
  const tape = `<rect x="${bx * 0.02}" y="${cy - tight * 5}" width="${bx * 0.26}" height="${tight * 10}" rx="${tight * 1.6}" fill="#15171a"/>
    ${[0.07, 0.14, 0.21].map((f) => `<rect x="${bx * f}" y="${cy - tight * 5}" width="1.5" height="${tight * 10}" fill="#3b3f44"/>`).join('')}`;
  const fx = Math.min(W * 0.78, W - 60);
  const fy = lane(FAULT);
  harness.innerHTML = `
    <svg class="harness__svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" aria-hidden="true">${wires}${tape}
      <g class="spark" transform="translate(${fx} ${fy})"><circle r="${sw * 2.6}" class="spark__ring"/><circle r="${sw * 0.9}" class="spark__dot"/></g>
    </svg>
    <ul class="harness__tags">${HAT.map((w, i) => `<li style="top:${lane(i)}px;left:${bx + 10}px;--c:${w.c}" class="${i === FAULT ? 'is-fault' : ''}"><b>${amp(w.a)}A</b>${esc(w.ad)}</li>`).join('')}</ul>
    <p class="harness__found" style="top:${fy}px;right:${W - fx - 8}px">${esc(H.bulgu)}</p>`;
  // Işık tarafındaki kopyada aynı yükseklik korunur (hizalama için), çizim yok.
  const plug = $('.plug');
  const r = harness.getBoundingClientRect();
  const s = $('.hero__stage').getBoundingClientRect();
  plug.style.top = `${r.top - s.top + pad - 14}px`;
  plug.style.height = `${h - pad * 2 + 28}px`;
}

// --- Ölçü: hakkımızda + sayaçlar ---------------------------------------------------

const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yas : s.deger }));
const sayi = (n) => Number(n).toLocaleString('tr-TR');
$('#hakkimizda').innerHTML = `
  <div class="wrap olcu__grid">
    <div class="olcu__text">
      <p class="kicker rv"><i style="background:#1f5fd8"></i>Dükkân</p>
      <h2 class="h2 rv">Parça atıp denemeyiz, <span class="u">sebebi buluruz.</span></h2>
      <p class="olcu__lead rv">${esc(d.isletme.hakkinda)}</p>
      <p class="olcu__garanti rv">${fuseSVG(10)}<span>${esc(d.garanti)} Değişen parçayı size geri veririz.</span></p>
    </div>
    <figure class="olcu__photo rv">
      <img src="${img('/img/elektrik-klasik2/kaput-usta.jpg')}" alt="Ustamız kaputun altında kablo soketini kontrol ediyor" width="1600" height="1066" loading="lazy" />
      <figcaption>Önce ölçüm, sonra parça.</figcaption>
    </figure>
    <figure class="olcu__photo olcu__photo--s rv">
      <img src="${img('/img/elektrik-klasik2/aku-takviye.jpg')}" alt="Motor bölmesinde akü ve kırmızı takviye kablosu" width="1600" height="1068" loading="lazy" />
    </figure>
  </div>
  <ul class="wrap sleeves">
    ${stats.map((s, i) => `
      <li class="sleeve rv" style="--c:${PALET[i % PALET.length]}">
        <span class="sleeve__wire" aria-hidden="true"></span>
        <span class="sleeve__tube"><b data-count="${s.deger}">${sayi(s.deger)}</b></span>
        <span class="sleeve__lbl">${esc(s.etiket)}</span>
      </li>`).join('')}
  </ul>`;

// --- Sigorta bandı ------------------------------------------------------------

$('#bant').innerHTML = `
  <div class="bant__img"><img src="${img('/img/elektrik-klasik2/sigortalar.jpg')}" alt="Sıra sıra dizilmiş renkli bıçak sigortalar" width="1600" height="1066" loading="lazy" /></div>
  <div class="wrap bant__box">
    <div class="bant__card rv">
      <h2 class="h2">${esc(d.bant.baslik)}</h2>
      <p>${esc(d.bant.metin)}</p>
      <ul class="bant__legend">${Object.keys(AMPER).map(Number).sort((a, b) => a - b).map((a) => `<li>${fuseSVG(a)}</li>`).join('')}</ul>
    </div>
  </div>`;

// --- Hizmetler: her hat bir iş -----------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="head">
      <p class="kicker rv"><i style="background:#e2261c"></i>Hizmetler</p>
      <h2 class="h2 rv">Hangi hat arızalıysa, <span class="u">ondan başlarız.</span></h2>
      <p class="head__p rv">Süreler ortalamadır. Aracı gördükten sonra netleşir, fiyatı işe başlamadan söyleriz.</p>
    </header>
    <ol class="lines">
      ${d.hizmetler.map((h, i) => `
        <li class="line rv" style="--c:${renk(h.sigorta)[0]}">
          <span class="line__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          ${fuseSVG(h.sigorta)}
          <div class="line__body">
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
          </div>
          <p class="line__meta"><span>Süre <b>${esc(h.sure)}</b></span>
            <a href="${wa(`Merhaba ${d.isletme.ad}, ${h.baslik} için bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu iş için sor</span></a></p>
          <i class="line__wire" aria-hidden="true"></i>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Arıza kodları: kablo etiketleri ----------------------------------------------------

$('#ariza-kodlari').innerHTML = `
  <div class="wrap kod__grid">
    <div class="kod__side">
      <p class="kicker rv"><i style="background:#f2c200"></i>Arıza kodları</p>
      <h2 class="h2 rv">${esc(d.kodlar.baslik)}</h2>
      <p class="head__p rv">${esc(d.kodlar.metin)}</p>
      <figure class="kod__photo rv"><img src="${img('/img/elektrik-klasik2/multimetre.jpg')}" alt="Tezgâhta ölçü aleti ve kırmızı ölçüm kabloları" width="1600" height="1201" loading="lazy" /></figure>
    </div>
    <ul class="tags">
      ${d.arizaKodlari.map((k, i) => `
        <li class="tag rv" style="--c:${PALET[(i + 1) % 4]}">
          <span class="tag__wire" aria-hidden="true"></span>
          <p class="tag__code"><span>${esc(k.kod)}</span></p>
          <dl>
            <dt>Beyin ne yazdı</dt><dd>${esc(k.anlam)}</dd>
            <dt>Ne çıktı</dt><dd class="ok">${esc(k.cozum)}</dd>
          </dl>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Süreç: demet inceldikçe iş biter --------------------------------------------------

const SC = ['#e2261c', '#f2c200', '#1f5fd8', '#1d9b4f'];
$('#surec').innerHTML = `
  <div class="wrap surec__grid">
    <header class="head">
      <p class="kicker rv"><i style="background:#1d9b4f"></i>Nasıl çalışırız</p>
      <h2 class="h2 rv">Dört tel, <span class="u">dört adım.</span></h2>
      <p class="head__p rv">Her adım bir teli bağlar. Son tel bağlanmadan araç çıkmaz.</p>
    </header>
    <ol class="pins">
      ${d.surec.map((s, k) => `
        <li class="pin rv" style="--c:${SC[k % 4]}">
          <span class="pin__rails" aria-hidden="true">
            ${SC.map((c, j) => (j > k ? `<i class="v" style="--x:${j};background:${c}"></i>` : j === k ? `<i class="v v--end" style="--x:${j};background:${c}"></i><i class="h" style="--x:${j};background:${c}"></i>` : '')).join('')}
          </span>
          <span class="pin__ring" aria-hidden="true"></span>
          <div class="pin__body"><p class="pin__no">Adım ${k + 1}</p><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Yorumlar ---------------------------------------------------------------------

const P = d.puan;
const yildiz = (n) => `<span class="stars" aria-label="${n} yıldız">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap yorum__head">
    <div>
      <p class="kicker rv"><i style="background:#d9a441"></i>Yorumlar</p>
      <h2 class="h2 rv">Lamba söndü, <span class="u">onlar yazdı.</span></h2>
    </div>
    <div class="score rv"><b>${String(P.ortalama).replace('.', ',')}</b><div>${yildiz(5)}<p>${sayi(P.adet)} Google yorumu</p></div></div>
  </div>
  <div class="yorum__track" data-lenis-prevent-touch>
    <ul class="yorum__list">
      ${d.yorumlar.map((y, i) => `
        <li class="card" style="--c:${PALET[i % PALET.length]}">
          ${yildiz(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="card__who">${esc(y.ad)} <span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- Markalar ------------------------------------------------------------------------

const brandLine = d.markalar.map((m, i) => `<span>${esc(m)}</span><i style="background:${PALET[i % PALET.length]}"></i>`).join('');
$('#markalar').innerHTML = `<p class="marka__t">Her marka, her model</p><div class="marq"><div class="marq__in">${brandLine}${brandLine}</div></div>`;

// --- Dükkân ---------------------------------------------------------------------------

$('#dukkan').innerHTML = `
  <div class="wrap dukkan__grid">
    <div class="dukkan__info">
      <p class="kicker rv"><i style="background:#7b4b2a"></i>Dükkân</p>
      <h2 class="h2 rv">Şaşmaz'da, <span class="u">4. Cadde'deyiz.</span></h2>
      <p class="state ${durum.open ? 'is-open' : ''} rv"><i></i><span>${esc(durum.text)}</span></p>
      <table class="hours rv">
        <caption class="sr-only">Çalışma saatleri</caption>
        ${groupedHours(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(s)}</td></tr>`).join('')}
      </table>
      <p class="dukkan__adres rv">${esc(d.iletisim.adres)}</p>
      <div class="dukkan__cta rv">
        <a class="btn btn--red" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map rv" data-map><p>Harita yükleniyor</p></div>
  </div>`;

// --- Final ------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <img class="final__img" src="${img('/img/elektrik-klasik2/kablolar.jpg')}" alt="" width="1800" height="1199" loading="lazy" />
  <div class="wrap final__in">
    <h2 class="final__title rv">${esc(d.final.baslik)}</h2>
    <p class="rv">${esc(d.final.metin)}</p>
    <div class="final__cta rv">
      <a class="btn btn--red btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--white btn--xl" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    </div>
  </div>`;

$('#foot').innerHTML = `
  <div class="top__stripe" aria-hidden="true">${PALET.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
  <div class="wrap foot__in">
    <p class="foot__brand">${ad}</p>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Fotoğraflar: Pexels.</p>
  </div>`;

// --- Harita: yaklaşınca yükle --------------------------------------------------------------

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Hareket -----------------------------------------------------------------------------

drawHarness();
let rw = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - rw) < 2 && innerWidth < 900) return; // mobil adres çubuğu
  rw = innerWidth;
  drawHarness();
  ScrollTrigger.refresh();
});
document.fonts?.ready.then(() => { drawHarness(); ScrollTrigger.refresh(); });

const hero = $('#hero');
if (reducedMotion) {
  hero.classList.add('is-found', 'is-done');
  $$('.rv').forEach((e) => e.classList.add('in'));
} else {
  initSmoothScroll();

  // İmza: temiz panel soldan sağa açılır (iç kopya ters kayar, sabit durur), soket öndedir.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=170%', pin: '.hero__stage', scrub: 0.5,
      onUpdate: (st) => {
        hero.classList.toggle('is-found', st.progress > 0.8);
        hero.classList.toggle('is-done', st.progress > 0.9);
      },
    },
  });
  tl.fromTo('.hero__clean', { xPercent: -100 }, { xPercent: 0, duration: 0.72 }, 0)
    .fromTo('.hero__cleanIn', { xPercent: 100 }, { xPercent: 0, duration: 0.72 }, 0)
    .fromTo('.hero__img', { scale: 1.14 }, { scale: 1, duration: 0.72 }, 0)
    .fromTo('.hero__hint', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.08 }, 0.02)
    .fromTo('.plug', { x: 0 }, { x: () => -$('.plug').offsetWidth * 0.5 - 6, duration: 0.08, ease: 'power2.out' }, 0.72)
    .to({}, { duration: 0.2 });

  // Açılışta soket kenardan hafifçe görünür, "çek beni" der.
  gsap.fromTo('.plug', { xPercent: -60 }, { xPercent: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 });
  gsap.fromTo('.hero__mess .hero__eyebrow, .hero__mess .hero__title', { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out' });

  ScrollTrigger.batch('.rv', {
    start: 'top 88%',
    onEnter: (els) => els.forEach((e, i) => setTimeout(() => e.classList.add('in'), i * 70)),
  });

  // Sayaçlar bir kez sayar.
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = sayi(Math.round(o.v)); } });
      },
    });
  });

  // Sigorta bandı: hafif paralaks.
  gsap.fromTo('.bant__img img', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '#bant', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.final__img', { yPercent: -6, scale: 1.1 }, {
    yPercent: 6, scale: 1.1, ease: 'none',
    scrollTrigger: { trigger: '#iletisim', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}
