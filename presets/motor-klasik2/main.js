import raw from '../../data/garaj.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import renders from './render.json';

// Conta (klasik aile): WebGL yok. İmza: künyenin altında silindir kapak contası; açılışta cıvatalar
// sıkma sırasıyla bir kez sıkılır (~1,5 sn, kaydırmayı kilitlemez). Gerisi sakin bir işletme sitesi.
const d = boot({ ...raw, preset: 'motor-klasik2' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('no-motion');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// --- Üst çubuk -----------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand"><span class="top__dot" aria-hidden="true"></span><span class="top__ad">${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="chip ${st.open ? 'is-open' : ''}"><span class="chip__l">${esc(st.metin)}</span><span class="chip__s">${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="mono">${tel}</span></a>`;

// --- Künye + conta ----------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__copy">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt class="mono">Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt class="mono">Bugün</dt><dd class="dot ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt class="mono">Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__actions">
      <a class="btn btn--red" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="hero__art" aria-hidden="true">
    <div class="hero__deck"><img alt="" decoding="async" fetchpriority="high" /></div>
    <svg class="gasket" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gasket-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3a3e42" /><stop offset=".45" stop-color="#2a2d30" />
          <stop offset=".62" stop-color="#34383c" /><stop offset="1" stop-color="#1f2224" />
        </linearGradient>
      </defs>
      <path class="gasket__sheet" fill-rule="evenodd" />
      <g class="gasket__beads"></g>
      <g class="gasket__bolts"></g>
    </svg>
  </div>`;

// --- Hizmetler ------------------------------------------------------------------------

$('#hizmetler').innerHTML = `
  <div class="wrap parts__grid">
    <div class="parts__side">
      <h2 id="parts-h" class="h2">Hizmetler</h2>
      <p class="parts__note">Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
      <figure class="parts__photo"><img src="${asset('/img/motor-klasik2/yaylar.jpg')}" alt="Silindir kapağındaki supap yayları" width="999" height="1500" loading="lazy" decoding="async" /></figure>
    </div>
    <ol class="parts__list">
      ${d.hizmetler.map((h, i) => `
        <li class="part">
          <span class="part__no mono" aria-hidden="true">${pad(i + 1)}</span>
          <h3 class="part__t">${esc(h.baslik)}</h3>
          <p class="part__d">${esc(h.aciklama)}</p>
          <p class="part__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</p>
          <span class="part__rule" aria-hidden="true"></span>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap spec__grid">
    <div>
      <h2 id="spec-h" class="h2">Hakkında</h2>
      <p class="spec__p">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt class="mono">Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <dl class="wrap sheet">
    <div class="sheet__row"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><span class="sheet__dots" aria-hidden="true"></span><dd><span data-count="${yas}">${yas}</span> yıl</dd></div>
    <div class="sheet__row"><dt>Haftada açık</dt><span class="sheet__dots" aria-hidden="true"></span><dd><span data-count="${acikGun}">${acikGun}</span> gün</dd></div>
  </dl>
  <figure class="band">
    <img class="band__img" src="${asset('/img/motor-klasik2/eksantrik.jpg')}" alt="Tezgâhta temizlenmiş eksantrik milleri ve silindir kapağı" width="1700" height="1133" loading="lazy" decoding="async" />
  </figure>`;

// --- Çalışma saatleri ve konum -------------------------------------------------------------

$('#saatler').innerHTML = `
  <div class="wrap visit__grid">
    <div class="visit__info">
      <h2 id="visit-h" class="h2">Çalışma saatleri ve konum</h2>
      <p class="chip chip--big ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="hours mono">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${esc(g)}</th><td${s === 'Kapalı' ? ' class="off"' : ''}>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="visit__actions">
        <a class="btn btn--red" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="visit__map" data-map><span class="mono">Harita</span></div>
  </div>`;

// --- Örnek yorumlar: anahtar etiketleri -------------------------------------------------------

const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap tags__head">
    <h2 id="tags-h" class="h2">Örnek yorumlar</h2>
    <p class="tags__note">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="tags__row" data-lenis-prevent-touch>
    ${d.yorumlar.map((y, i) => `
      <li class="tag" style="--r:${[-2.5, 1.8, -1.2, 2.4, -1.8][i % 5]}deg">
        <span class="tag__hole" aria-hidden="true"></span>
        <p class="tag__car">${esc(y.arac)}</p>
        ${stars(y.puan)}
        <blockquote class="tag__q">${esc(y.metin)}</blockquote>
        <p class="tag__who mono">${esc(y.ad)}</p>
      </li>`).join('')}
  </ul>`;

// --- İletişim ---------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap">
    <h2 id="cta-h" class="cta__h">İletişim</h2>
    <p class="cta__p">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <a class="cta__num" href="${telHref(d)}">${tel}</a>
    <div class="cta__actions">
      <a class="btn btn--red btn--xl" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="cta__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <div><p class="foot__name">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small mono">© ${new Date().getFullYear()} ${ad} · Pexels'ten alınan fotoğraflar ve 3D görsel temsilîdir · Yorumlar örnektir</p>
  </div>`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Conta ----------------------------------------------------------------------------------
// Conta kendi kutusunda yatay çizilir: u = boy (silindir sırası), v = en. Delikler render'daki
// bloğun delikleriyle birebir çakışır.

const art = $('.hero__art');
const svg = $('.gasket');
const sheet = $('.gasket__sheet');
const beads = $('.gasket__beads');
const boltsG = $('.gasket__bolts');
const deckImg = $('.hero__deck img');
const PITCH_R = (renders.h.bores[1][0] - renders.h.bores[0][0]) / renders.h.r;
// 10 cıvatalı kapak için ortadan dışa doğru sarmal sıkma sırası (üst sıra, alt sıra)
const ORDER = [[9, 5, 1, 3, 7], [8, 4, 2, 6, 10]];
const circle = (x, y, r) => `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
const hexPts = (r, cx = 0, cy = 0) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

let tightened = reducedMotion;
let lastSize = '';
function drawGasket() {
  const W = art.clientWidth;
  const H = art.clientHeight;
  if (!W || !H || lastSize === `${W}x${H}`) return;
  lastSize = `${W}x${H}`;
  // Kutu enine genişse conta yatay (telefon), boyuna uzunsa dikey (masaüstünde künyenin yanında) durur.
  const vertical = H > W;
  const M = vertical ? renders.v : renders.h;
  const L = vertical ? H : W;
  const S = vertical ? W : H;
  const R = Math.min(L / (3 * PITCH_R + 3.6), S / 3.9);
  const P = R * PITCH_R;
  const cx = W / 2;
  const cy = H / 2;
  const at = (u, v) => (vertical ? [cx + v, cy + u] : [cx + u, cy + v]);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let dPath = `M-10 -10h${W + 20}v${H + 20}h${-W - 20}Z`;
  let ring = '';
  const bores = [];
  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) * P;
    const [x, y] = at(u, 0);
    bores.push([x, y]);
    dPath += circle(x, y, R);
    ring += `<circle class="fire" cx="${x}" cy="${y}" r="${R * 1.035}" stroke-width="${R * 0.07}"/><circle class="bead" cx="${x}" cy="${y}" r="${R * 1.2}"/>`;
    for (const s of [-1, 1]) {
      const [wx, wy] = at(u + s * R * 0.62, R * 1.22);
      const [ox, oy] = at(u - s * R * 0.62, -R * 1.22);
      dPath += circle(wx, wy, R * 0.075) + circle(ox, oy, R * 0.06);
    }
  }
  sheet.setAttribute('d', dPath);
  beads.innerHTML = ring;

  // Blok render'ı: delik merkezleri contadaki deliklerle çakışacak şekilde yerleşir.
  const src = asset(`/img/motor-klasik2/cycles-deck-${vertical ? 'v' : 'h'}.webp`);
  if (deckImg.dataset.src !== src) { deckImg.src = src; deckImg.dataset.src = src; }
  const k = R / M.r;
  deckImg.style.cssText = `left:${(bores[0][0] - M.bores[0][0] * k).toFixed(1)}px;top:${(bores[0][1] - M.bores[0][1] * k).toFixed(1)}px;width:${(M.w * k).toFixed(1)}px;height:${(M.h * k).toFixed(1)}px`;

  const showN = R >= 48;
  let bolts = '';
  ORDER.forEach((row, side) => row.forEach((n, j) => {
    const [x, y] = at((j - 2) * P, (side ? 1 : -1) * R * 1.46);
    const [lx, ly] = vertical ? at((j - 2) * P, (side ? 1 : -1) * R * 1.86) : [x + R * 0.34, y];
    bolts += `<g class="bolt${tightened ? ' is-tight' : ''}" data-n="${n}">
      <circle class="bolt__well" cx="${x}" cy="${y}" r="${R * 0.21}"/>
      <g class="bolt__head" data-x="${x}" data-y="${y}"${tightened ? ` transform="rotate(90 ${x} ${y})"` : ''}>
        <polygon points="${hexPts(R * 0.16, x, y)}"/>
        <rect class="bolt__paint" x="${x - R * 0.03}" y="${y - R * 0.15}" width="${R * 0.06}" height="${R * 0.3}"/>
      </g>
      ${showN ? `<text class="bolt__n" x="${lx}" y="${ly + R * 0.06}" text-anchor="${vertical ? 'middle' : 'start'}" font-size="${Math.max(11, R * 0.16)}">${n}</text>` : ''}
    </g>`;
  }));
  boltsG.innerHTML = bolts;
}
drawGasket();
new ResizeObserver(() => drawGasket()).observe(art);

// Cıvatalar sıkma sırasıyla bir kez sıkılır.
function tighten() {
  const bolts = $$('.bolt', boltsG).sort((a, b) => a.dataset.n - b.dataset.n);
  const tl = gsap.timeline({ delay: 0.5 });
  tightened = true; // boyut değişip conta yeniden çizilirse cıvatalar sıkılmış çizilir
  bolts.forEach((b, i) => {
    const h = $('.bolt__head', b);
    tl.to(h, { rotation: 90, svgOrigin: `${h.dataset.x} ${h.dataset.y}`, duration: 0.22, ease: 'power2.out', onComplete: () => b.classList.add('is-tight') }, i * 0.11);
  });
}

// --- Hareket -------------------------------------------------------------------------------

const topEl = $('#top');
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Üst çubuk kaydırınca dökme demir zemine geçer.
const onScroll = () => topEl.classList.toggle('is-scrolled', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (!reducedMotion) {
  initSmoothScroll();
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__copy > *', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.06, clearProps: 'all' }, 0)
    .from('.hero__art', { autoAlpha: 0, duration: 0.8 }, 0.15);
  (deckImg.decode ? deckImg.decode() : Promise.resolve()).catch(() => {}).finally(tighten);

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v)) });
      },
    });
  });
  gsap.from('.sheet__dots', { scaleX: 0, transformOrigin: '0 50%', duration: 1, ease: 'power2.out', stagger: 0.1, scrollTrigger: { trigger: '.sheet', start: 'top 88%' } });

  // Hizmet satırlarının kırmızı çizgisi soldan çekilir.
  $$('.part').forEach((p) => {
    gsap.fromTo($('.part__rule', p), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut', scrollTrigger: { trigger: p, start: 'top 88%' } });
  });

  // Bant: kapak aralanır gibi açılır.
  gsap.fromTo('.band', { clipPath: 'inset(30% 0% 30% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.band', start: 'top 92%', end: 'top 35%', scrub: true },
  });

  // Anahtar etiketleri çiviye asılınca bir kez sallanır.
  gsap.from('.tag', {
    rotation: (i) => (i % 2 ? 12 : -12), y: -24, autoAlpha: 0, transformOrigin: '50% 18px',
    duration: 1.4, ease: 'elastic.out(1, 0.4)', stagger: 0.07,
    scrollTrigger: { trigger: '.tags__row', start: 'top 85%' },
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => { drawGasket(); ScrollTrigger.refresh(); });
}
