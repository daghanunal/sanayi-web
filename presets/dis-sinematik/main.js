// Işık Masası (sinematik aile, diş kliniği): gece laciverti, mine beyazı, röntgen buzu, diş eti mercanı.
// 3D iki yerde: (1) künyenin arkasında ışık masasında yavaşça dönen diş; (2) Hizmetler boyunca her
// tedavide ilgili kesit ya da parça gösterilir (tarama, temizlik, dolgu, kanal kesiti, implant, ortodonti
// arkı), etiketler parça adıdır. Hizmetlerden sonra sahne söner ve çizimi durur; gerisi normal bölümler.
// Giriş perdesi yok.
import temel from '../../data/sektor-dis.json';
import ek from '../../data/dis-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, esc, gsap, ScrollTrigger, setStoryMode,
} from '../../shared/core.js';
import { createScene } from './scene.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, preset: 'dis-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const sm = (t) => t * t * (3 - 2 * t);
const bump = (p, a, b, e = 0.2) => { const w = (b - a) * e; return seg(p, a, a + w) * (1 - seg(p, b - w, b)); };
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
// Dikey tablet: diş biraz yukarıda ve küçük dursun, alttaki durak kartına binmesin
const tall = () => innerWidth >= 760 && innerHeight > innerWidth * 1.1;
const lite = weak || innerWidth < 760;
const lower = (s) => s.toLocaleLowerCase('tr');
const waGenel = d.waMesaj || 'Merhaba, muayene için randevu almak istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta klinik metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: diş kliniği --------------------------------------------------------
(function dentistLd() {
  $$('script[type="application/ld+json"]').forEach((x) => x.textContent.includes('"AutoRepair"') && x.remove());
  const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((x, i) => (x ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: x.split('-')[0], closes: x.split('-')[1] } : null))
      .filter(Boolean),
  });
  document.head.append(ld);
  document.title = `${d.isletme.ad} | ${d.isletme.sektor} | Etimesgut, Ankara`;
})();

// --- İçerik ------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, tanim: d.isletme.tanim, telefon: d.iletisim.telefon,
  adres: d.iletisim.adres, kisaAdres: kisaAdres(d.iletisim.adres),
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, waGenel)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-top]').classList.toggle('is-long', d.isletme.ad.length > 24);
$('[data-hizmet-not]').textContent = d.hizmetNot || '';
$('[data-year]').textContent = new Date().getFullYear();

function refreshStatus() {
  const st = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', st.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? st.kunye : st.metin;
  });
  const top = $('[data-top-status]');
  top.textContent = st.open ? 'Açık' : 'Kapalı';
  top.classList.toggle('is-open', st.open);
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// Hizmet durakları: kart = hizmet (başlık, açıklama, süre)
const byId = Object.fromEntries(d.hizmetler.map((h) => [h.id, h]));
const F = d.film.filter((a) => byId[a.hizmet]).map((a) => ({ ...a, h: byId[a.hizmet] }));
const svcMsg = (h) => h.mesaj || `Merhaba, ${lower(h.baslik)} için randevu almak istiyorum.`;
$('[data-rail]').innerHTML = F.map((a) => `<li data-rail-i><b>${esc(a.no)}</b><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = F.map((a) => `
  <div class="stop" data-stop="${esc(a.id)}">
  <article class="card" data-card="${esc(a.id)}">
    <p class="card__no"><b>${esc(a.no)}</b>${a.h.sure ? `<span><span class="sr-only">Süre: </span>${esc(a.h.sure)}</span>` : ''}</p>
    <h3 class="card__title">${esc(a.h.baslik)}</h3>
    <p class="card__text">${esc(a.h.aciklama)}</p>
    <a class="card__wa" href="${esc(waHref(d, svcMsg(a.h)))}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan randevu</span></a>
  </article>
  </div>`).join('');

// Durak dışındaki hizmetler: düz kartlar
const diger = (d.digerHizmetler || []).map((id) => byId[id]).filter(Boolean);
$('[data-services]').innerHTML = diger.map((s) => `
  <article class="svc__card">
    ${s.gorsel ? `<figure class="svc__img"><img src="${esc(s.gorsel)}" alt="" loading="lazy" decoding="async" width="800" height="500" /></figure>` : ''}
    <div class="svc__body">
      <h4 class="svc__name">${esc(s.baslik)}</h4>
      <p class="svc__desc">${esc(s.aciklama)}</p>
      <p class="svc__foot">${s.sure ? `<span class="svc__time"><span class="sr-only">Süre: </span>${esc(s.sure)}</span>` : '<span></span>'}
        <a href="${esc(waHref(d, svcMsg(s)))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bilgi alın</span></a></p>
    </div>
  </article>`).join('');

// Sahne etiketleri (3B noktalara bağlı): parça adları
const etiket = (id) => F.find((a) => a.id === id)?.etiket || '';
const TAGS = [
  { id: 'cavity', text: etiket('muayene'), cls: 'is-warn' },
  { id: 'fill', text: etiket('dolgu'), cls: 'is-cure' },
  { id: 'mine', text: d.katmanlar[0] },
  { id: 'dentin', text: d.katmanlar[1] },
  { id: 'pulpa', text: d.katmanlar[2], cls: 'is-warn is-left' },
  { id: 'screw', text: etiket('implant') },
  { id: 'bone', text: 'Çene kemiği' },
];
$('[data-tags]').innerHTML = TAGS.map((t) => `<p class="tag ${t.cls || ''}" data-tag="${t.id}" data-left="${/is-left/.test(t.cls || '') ? 1 : 0}"><i></i><span>${esc(t.text)}</span></p>`).join('');
const tagEls = Object.fromEntries(TAGS.map((t) => [t.id, $(`[data-tag="${t.id}"]`)]));

// Hakkında + rakamlar (yalnız olgular)
const yil = new Date().getFullYear() - d.isletme.kurulus;
const yer = d.isletme.yer || "Etimesgut'ta";
$('[data-about-text]').textContent = `${d.isletme.ad} ${yilEki(d.isletme.kurulus)} beri ${yer}. ${d.isletme.hakkinda}`;
$('[data-facts]').innerHTML = (d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
$('[data-stats]').innerHTML = [
  { n: yil, u: ' yıl', l: yer },
  { n: acikGunSayisi(d.saatler), u: ' gün', l: 'haftada açık' },
].map((x) => `<li class="stat"><p class="stat__num"><b>${x.n}</b>${esc(x.u)}</p><p class="stat__lbl">${esc(x.l)}</p></li>`).join('');

// Galeri
$('[data-gallery]').innerHTML = d.galeri.map((g) => `
  <figure class="gallery__item"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" width="1200" height="800" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// Örnek yorumlar
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption>${esc(y.ad)}${y.arac ? `<span>${esc(y.arac)}</span>` : ''}</figcaption>
  </figure>`).join('');

// Saatler
$('[data-hours]').innerHTML = saatListesi(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${esc(g)}</dt><dd>${esc(h)}</dd></div>`).join('');

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__tj = S;

// Durak aralıkları film ilerlemesi (0..1) cinsinden DOM'dan ölçülür. Her durak, bir önceki kartın
// çekilmeye başladığı yerden başlar: ilk ~%28'de kamera yeni poza geçer, kart gelince sahne oynar.
const filmEl = $('[data-film]');
const R = { hero: [0, 0.02], muayene: [0.02, 0.16], temizlik: [0.16, 0.3], dolgu: [0.3, 0.44], kanal: [0.44, 0.58], implant: [0.58, 0.72], ortodonti: [0.72, 0.9], over: [0.9, 1] };
function measure() {
  const vh = innerHeight;
  const total = Math.max(1, filmEl.offsetHeight - vh);
  const ft = filmEl.getBoundingClientRect().top;
  const top = (el) => el.getBoundingClientRect().top - ft;
  const starts = $$('[data-stop]').map((el) => clamp((top(el) - vh) / total));
  const over = clamp((top($('[data-over-sec]')) - vh * 0.75) / total);
  const heroEnd = Math.max(0.012, starts[0]);
  R.hero = [0, heroEnd];
  F.forEach((a, i) => { R[a.id] = [Math.max(heroEnd, starts[i]), i < F.length - 1 ? Math.max(heroEnd, starts[i + 1]) : over]; });
  R.over = [over, 1.0001];
  const sy = scrollY;
  cardGeo = $$('[data-stop]').map((el) => ({ top: el.getBoundingClientRect().top + sy, h: el.offsetHeight, pad: parseFloat(getComputedStyle(el).paddingTop) || 0 }));
}
let cardGeo = [];
// Kart görünürlüğü doğrudan kaydırma konumundan: durağa girerken belirir, bırakırken çekilir.
// (İki ayrı scrub tween'i hızlı atlamada birbirini ezip eski kartı ekranda bırakıyordu.)
const cardState = [];
function cardUI() {
  const y = scrollY, vh = innerHeight;
  cards.forEach((card, i) => {
    const g = cardGeo[i];
    if (!g) return;
    const a0 = g.top + g.pad * 0.6 - vh, a1 = g.top + g.pad - vh * 0.8;
    const b0 = g.top + g.h - vh, b1 = b0 + vh * 0.28;
    const vin = clamp((y - a0) / Math.max(1, a1 - a0)), vout = clamp((y - b0) / Math.max(1, b1 - b0));
    const v = +(sm(vin) * (1 - vout)).toFixed(3);
    const ty = +((1 - vin) * 30 - vout * 24).toFixed(1);
    const st = cardState[i] || (cardState[i] = {});
    if (st.v === v && st.ty === ty) return;
    st.v = v; st.ty = ty;
    card.style.opacity = v;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    card.style.transform = `translate3d(0, ${ty}px, 0)`;
  });
}
const kOf = (p, id) => seg(p, R[id][0], R[id][1]);
// 0: künye ekranda, 1: ilk durağın kamerası yerleşti (telefonda ve dikey tablette diş yukarıdan iner).
const heroOut = (p) => sm(seg(p, R.hero[1] * 0.4, R.muayene[0] + (R.muayene[1] - R.muayene[0]) * 0.28));

// Kamera pozları: [az, el, dist, y, fov]
const POSE = {
  hero: [0.0, 0.14, 5.4, -0.05, 34],
  muayene: [0.25, 0.3, 4.9, -0.05, 34],
  temizlik: [-0.2, 0.12, 4.4, -0.05, 34],
  dolgu: [0.1, 0.72, 4.0, 0.3, 34],
  kanal: [0.0, 0.04, 4.8, -0.25, 34],
  implant: [0.0, 0.16, 5.6, -0.35, 34],
  ortodonti: [0.0, 0.72, 6.4, 0.0, 34],
  over: [0.0, 0.95, 7.6, 0.0, 34],
};
const ORDER = ['hero', 'muayene', 'temizlik', 'dolgu', 'kanal', 'implant', 'ortodonti', 'over'];
function camPose(p) {
  // Her durağın ilk %28'inde bir öncekinden geçiş yapılır
  let id = ORDER.find((k) => p >= R[k][0] && p < R[k][1]) || 'over';
  const i = ORDER.indexOf(id);
  const prev = POSE[ORDER[Math.max(0, i - 1)]], cur = POSE[id];
  const t = i === 0 ? 1 : sm(seg(p, R[id][0], R[id][0] + (R[id][1] - R[id][0]) * 0.28));
  const m = mobile();
  const out = prev.map((v, j) => L(v, cur[j], t));
  // Telefonda künye ekranın alt yarısında: açılışta diş daha küçük ve üstte, ilk durağa gelince normal boy.
  if (m) { out[2] *= L(2.05, 1.62, heroOut(p)); out[4] = 40; }
  else if (tall()) out[2] *= L(1.7, 1.14, heroOut(p));
  return out;
}

let heroSpin = 0;
function filmState(p, time) {
  const m = mobile();
  const [camAz, camEl, camDist, camY, fov] = camPose(p);
  const kM = kOf(p, 'muayene'), kT = kOf(p, 'temizlik'), kD = kOf(p, 'dolgu'), kK = kOf(p, 'kanal'), kI = kOf(p, 'implant'), kO = kOf(p, 'ortodonti'), kV = kOf(p, 'over');
  // Diş dönüşü: kaydırmaya bağlı, hafif nefes
  // Hero'da diş yavaşça döner; kaydırma başlayınca son açıdan ilk durağın açısına yumuşakça geçer
  if (p < R.muayene[0] + 0.002) heroSpin = time * 0.25;
  let rotY = heroSpin;
  const idle = Math.sin(time * 0.6) * 0.06;
  if (p >= R.muayene[0]) {
    rotY = L(-0.55, -0.35, kM) + (kT > 0 ? kT * Math.PI * 2 : 0) + (kD > 0 ? L(0, -0.25, sm(seg(kD, 0, 0.3))) : 0);
    if (kK > 0) rotY = L(-0.6, 0.18, sm(seg(kK, 0, 0.3))) + L(0, -0.35, seg(kK, 0.3, 1));
    const TAU = Math.PI * 2;
    const from = rotY + ((((heroSpin - rotY) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
    rotY = L(from, rotY, sm(seg(kM, 0, 0.26)));
  }
  // Tarama: aşağı iner, bekler, geri çıkar
  const scanDown = sm(seg(kM, 0.08, 0.45)), scanUp = sm(seg(kM, 0.72, 0.98));
  const inM = p >= R.muayene[0] && p < R.muayene[1];
  const scan = inM ? L(L(1.15, -1.55, scanDown), 1.15, scanUp) : 9;
  const cavity = p >= R.muayene[0] ? 1 : 0;
  const fill = sm(seg(kD, 0.3, 0.6));
  const cut = kK > 0 ? L(1.0, -0.1, sm(seg(kK, 0.05, 0.28))) : 9;
  const out = kI > 0 ? sm(seg(kI, 0, 0.14)) : 0;
  const toothBack = kV > 0 ? 0 : 1;
  const tooth = (p >= R.implant[0] ? 1 - out : 1) * (p >= R.ortodonti[0] ? 0 : 1) * toothBack;
  const implant = p >= R.implant[0] && p < R.ortodonti[0] ? seg(kI, 0.04, 0.12) * (1 - seg(kI, 0.93, 1)) : 0;
  const arch = p >= R.ortodonti[0] ? seg(kO, 0, 0.14) : 0;
  const shiftX = m ? 0 : tall() ? 0.14 : 0.2;
  const shiftY = m ? L(-0.3, -0.17, heroOut(p)) : tall() ? L(-0.24, -0.1, heroOut(p)) : 0;
  return {
    camAz, camEl, camDist, camY, fov, shiftX: p < R.muayene[0] ? shiftX : shiftX, shiftY,
    tooth, toothY: out * 2.6 + idle * 0.5, rotX: 0.08 + idle * 0.4, rotY,
    scan, ring: inM ? seg(kM, 0.04, 0.1) * (1 - seg(kM, 0.97, 1)) * (scanDown < 1 || scanUp > 0 ? 1 : 0.35) : 0,
    xray: inM ? 1 : 0, cavity, fill,
    plaque: p >= R.temizlik[0] && p < R.dolgu[0] ? seg(kT, 0, 0.12) : 0,
    clean: p >= R.temizlik[0] ? L(0.95, -0.5, sm(seg(kT, 0.25, 0.8))) : 9,
    chips: p >= R.temizlik[0] && p < R.dolgu[0] ? seg(kT, 0.25, 0.9) : 0,
    cure: bump(kD, 0.42, 0.82, 0.25),
    cut, pulpGlow: kK > 0 ? bump(kK, 0.2, 0.6, 0.3) * 0.6 : 0, canal: kK > 0 ? sm(seg(kK, 0.55, 0.88)) : 0,
    implant, implantK: seg(kI, 0.1, 0.92), iRotX: 0.05, iRotY: L(-0.7, 0.2, kI),
    arch, archRot: L(-0.25, 0.1, kO) + kV * 0.6, archY: 0, align: sm(seg(kO, 0.35, 0.8)),
    brackets: seg(kO, 0.12, 0.3), wire: seg(kO, 0.12, 0.3),
    halo: 1 - (kO > 0 ? 0.5 : 0),
  };
}

// --- Film UI -------------------------------------------------------------

const film = filmEl;
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const tagsBox = $('[data-tags]');

function place(el, v, pt) {
  // Başlık çubuğunun hemen altındaki bölgeye etiket konmaz: üstte ikinci bir katman gibi durur.
  if (v > 0.01 && pt && pt.y - 56 < Math.max(topEl.getBoundingClientRect().bottom + 8, innerHeight * 0.2)) v = 0;
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
  if (v > 0.01 && pt) {
    el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
    // Etiket ekranın kenarından taşmasın (dikey tablette sağ kenar): gerekirse öbür yana dön
    const sw = el.lastElementChild.offsetWidth;
    let left = el.dataset.left === '1';
    if (!left && pt.x + 26 + sw > innerWidth - 8) left = true;
    else if (left && pt.x - 26 - sw < 8) left = false;
    el.classList.toggle('is-left', left);
  }
}

const topEl = $('[data-top]');
const topStopNo = $('[data-top-stop-no]'), topStopName = $('[data-top-stop-name]');
let lastActive = -2, railShown = -1;
function filmUI(p, inFilm = true) {
  const active = inFilm ? F.findIndex((a) => p >= R[a.id][0] && p < R[a.id][1]) : -1;
  const on = active >= 0 ? 1 : 0;
  if (on !== railShown) {
    rail.classList.toggle('is-on', !!on);
    topEl.classList.toggle('is-stop', !!on);
    railShown = on;
  }
  if (active !== lastActive) {
    railItems.forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.classList.toggle('is-done', active > i);
    });
    if (active >= 0) {
      topStopNo.textContent = `${F[active].no}/${String(F.length).padStart(2, '0')}`;
      topStopName.textContent = F[active].durak;
    }
    lastActive = active;
  }
}

function tagUI(p) {
  if (!S.isReady()) return;
  const kM = kOf(p, 'muayene'), kD = kOf(p, 'dolgu'), kK = kOf(p, 'kanal'), kI = kOf(p, 'implant');
  const inR = (id) => p >= R[id][0] && p < R[id][1];
  // Hero yazısı ekrandayken etiket çıkmasın (buton ve başlıkla çakışmasın)
  const heroGone = clamp((scrollY - innerHeight * 0.85) / (innerHeight * 0.1));
  place(tagEls.cavity, inR('muayene') ? bump(kM, 0.4, 0.8, 0.15) * heroGone : 0, S.project('cavity'));
  place(tagEls.fill, inR('dolgu') ? bump(kD, 0.5, 0.98, 0.15) : 0, S.project('cavity'));
  const layers = inR('kanal') ? bump(kK, 0.28, 0.97, 0.12) : 0;
  place(tagEls.mine, layers, S.project('mine'));
  place(tagEls.dentin, layers * seg(kK, 0.33, 0.4), S.project('dentin'));
  place(tagEls.pulpa, layers * seg(kK, 0.38, 0.45), S.project('pulpa'));
  tagEls.pulpa.classList.toggle('is-warn', kK < 0.55);
  tagEls.pulpa.querySelector('span').textContent = kK < 0.55 ? d.katmanlar[2] : 'Kanal dolgusu';
  const imp = inR('implant') ? bump(kI, 0.45, 0.94, 0.12) : 0;
  place(tagEls.screw, imp, S.projectImplant('screw'));
  place(tagEls.bone, imp * seg(kI, 0.5, 0.56), S.projectImplant('bone'));
}

// --- Başlangıç -------------------------------------------------------------

let lenis = null;
let filmP = 0, filmTarget = 0, canvasFade = 1;
let filmST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  ScrollTrigger.addEventListener('refresh', measure);
  measure();
  filmST = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: film, start: 'bottom bottom', end: 'bottom 30%',
    onUpdate: (self) => (canvasFade = 1 - self.progress),
  });
  // Duraklar boyunca hikâye modu: alt çubuk iner, kart onun boşluğuna oturur (künye ve sonrası çubuklu)
  ScrollTrigger.create({
    trigger: '[data-cards]', start: 'top 70%', end: () => `bottom ${Math.round(innerHeight * 0.9)}px`,
    onToggle: (st) => setStoryMode(st.isActive ? true : null),
  });
  ScrollTrigger.create({
    start: 60, end: 'max',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  if (!reducedMotion) contentMotion();
}

// Sakin: bir kez, küçük kayma
function contentMotion() {
  gsap.from('.hero > *', { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.1, clearProps: 'opacity,visibility,transform' });
  $$('.sec-title').forEach((el) => gsap.from(el, { y: 26, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  gsap.fromTo('.about__img img', { scale: 1.12 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  $$('.svc__card').forEach((el) => gsap.from(el, { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 94%' } }));
  // Galeri yatay kayar
  const track = $('[data-gallery]');
  gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - innerWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top 85%', end: 'bottom 15%', scrub: true, invalidateOnRefresh: true },
  });
  gsap.fromTo('.rev', { y: 36, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__list', start: 'top 88%' },
  });
}

let lastT = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;
  const filmActive = filmST ? filmST.progress < 1 || canvasFade > 0.001 : true;
  filmP = reducedMotion ? filmTarget : filmP + (filmTarget - filmP) * (1 - Math.exp(-dt * 8));
  if (filmActive) filmUI(filmP, filmST ? filmST.progress < 1 : true);
  if (filmActive || cardState.some((c) => c.v > 0)) cardUI();
  else if (railShown === 1) filmUI(filmP, false);
  let op = 0;
  // Hizmetlerden sonra sahne çizilmez.
  if (filmActive) {
    op = canvasFade;
    S.update(filmState(filmP, reducedMotion ? 0 : time), now);
    tagsBox.style.visibility = canvasFade > 0.99 ? 'visible' : 'hidden';
    tagUI(filmP);
  } else tagsBox.style.visibility = 'hidden';
  if (canvas.style.opacity !== String(op)) canvas.style.opacity = op;
  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());
if (matchMedia('(max-width: 899px)').matches) autoHideHeader($('[data-top]'), { offset: 140 });
if (reducedMotion) document.documentElement.classList.add('is-static');
S.compile();
setupScroll();
requestAnimationFrame(tick);
