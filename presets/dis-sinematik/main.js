import temel from '../../data/sektor-dis.json';
import ek from '../../data/dis-sinematik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed,
  openStatus, groupedHours, icons, esc, asset, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createScene } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...temel, ...ek, preset: 'dis-sinematik' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const L = (a, b, t) => a + (b - a) * t;
const sm = (t) => t * t * (3 - 2 * t);
const bump = (p, a, b, e = 0.2) => { const w = (b - a) * e; return seg(p, a, a + w) * (1 - seg(p, b - w, b)); };
const nf = (n, digits = 0) => n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const mobile = () => innerWidth < 760;
const lite = weak || innerWidth < 760;

function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}
const lower = (s) => s.toLocaleLowerCase('tr');

// --- İçerik ------------------------------------------------------------------

const binds = { ad: d.isletme.ad, telefon: d.iletisim.telefon, adres: d.iletisim.adres };
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
const waGenel = waHref(d, `Merhaba ${d.isletme.ad}, muayene için randevu almak istiyorum.`);
$$('[data-wa]').forEach((a) => (a.href = waGenel));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);

const yil = new Date().getFullYear() - d.isletme.kurulus;
$('[data-since]').textContent = `Etimesgut · ${ablative(d.isletme.kurulus)} beri`;
const heroTitle = $('[data-hero-title]');
heroTitle.textContent = d.isletme.ad;
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-intro-name]').textContent = d.isletme.ad;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Klinik açık' : 'Klinik kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;
$('[data-status-big]').classList.toggle('is-open', status.open);

// Film durakları
const F = d.film;
$('[data-rail]').innerHTML = F.map((a) => `<li data-rail-i><b>${esc(a.no)}</b><span>${esc(a.durak)}</span></li>`).join('');
$('[data-cards]').innerHTML = F.map((a) => `
  <article class="card" data-card="${esc(a.id)}">
    <p class="card__no"><b>${esc(a.no)}</b><span>${esc(a.durak)}</span></p>
    <h2 class="card__title">${esc(a.baslik)}</h2>
    <p class="card__text">${esc(a.metin)}</p>
    <a class="card__wa" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${lower(a.hizmet)} için muayene randevusu almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(a.hizmet)} için yazın</span></a>
  </article>`).join('');

// Sahne etiketleri (3B noktalara bağlı)
const TAGS = [
  { id: 'cavity', text: F[0].etiket, cls: 'is-warn' },
  { id: 'fill', text: F[2].etiket, cls: 'is-cure' },
  { id: 'mine', text: d.katmanlar[0] },
  { id: 'dentin', text: d.katmanlar[1] },
  { id: 'pulpa', text: d.katmanlar[2], cls: 'is-warn' },
  { id: 'screw', text: F[4].etiket },
  { id: 'bone', text: 'Çene kemiği' },
];
$('[data-tags]').innerHTML = TAGS.map((t) => `<p class="tag ${t.cls || ''}" data-tag="${t.id}"><i></i><span>${esc(t.text)}</span></p>`).join('');
const tagEls = Object.fromEntries(TAGS.map((t) => [t.id, $(`[data-tag="${t.id}"]`)]));

// Hakkımızda + rakamlar
const aboutText = $('[data-about-text]');
aboutText.innerHTML = d.isletme.hakkinda.split(' ').map((w) => `<span>${esc(w)} </span>`).join('');
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.kurulustanHesapla ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-count="${s.deger}">0</b>${esc(s.sonek)}</p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler.map((s, i) => `
  <article class="svc__card">
    <figure class="svc__img">${s.gorsel ? `<img src="${esc(s.gorsel)}" alt="" loading="lazy" width="800" height="600" />` : ''}<span class="svc__n">${String(i + 1).padStart(2, '0')}</span></figure>
    <div class="svc__body">
      <h3 class="svc__name">${esc(s.baslik)}</h3>
      <p class="svc__desc">${esc(s.aciklama)}</p>
      <p class="svc__foot"><span class="svc__time">${esc(s.sure)}</span>
        <a href="${esc(waHref(d, s.mesaj ? s.mesaj.replace(/^Merhaba,/, `Merhaba ${d.isletme.ad},`) : `Merhaba ${d.isletme.ad}, ${lower(s.baslik)} için randevu almak istiyorum.`))}" target="_blank" rel="noopener">${icons.whatsapp}<span>Sor</span></a></p>
    </div>
  </article>`).join('');

// Çocuk, süreç, galeri
$('[data-kids-title]').textContent = d.cocuk.baslik;
$('[data-kids-text]').textContent = d.cocuk.metin;
$('[data-wa-cocuk]').href = waHref(d, `Merhaba ${d.isletme.ad}, çocuğum için randevu almak istiyorum. Yaşı: `);
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('');
$('[data-garanti]').textContent = d.garanti;
$('[data-gallery]').innerHTML = d.galeri.map((g) => `
  <figure class="gallery__item"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="1200" height="800" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');

// Yorumlar
$('[data-puan]').textContent = nf(d.puan.ortalama, 1);
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = `${nf(d.puan.adet)} Google yorumu`;
$('[data-reviews]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption>${esc(y.ad)}</figcaption>
  </figure>`).join('');

// Saatler, final, footer
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([g, h]) => `<div class="${h === 'Kapalı' ? 'is-closed' : ''}"><dt>${g}</dt><dd>${h}</dd></div>`).join('');
$('[data-final-title]').textContent = d.finalBaslik;
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}`;

const mapBox = $('[data-map]');
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  obs.disconnect();
}, { rootMargin: '600px' }).observe(mapBox);

// --- Diş şeması (FDI numaralandırma) ------------------------------------------

const ADLAR = ['', 'orta kesici', 'yan kesici', 'köpek dişi', 'birinci küçük azı', 'ikinci küçük azı', 'birinci büyük azı', 'ikinci büyük azı', 'yirmilik diş'];
const BOLGE = { 1: 'sağ üst', 2: 'sol üst', 3: 'sol alt', 4: 'sağ alt' };
$('[data-chart-title]').textContent = d.sema.baslik;
$('[data-chart-text]').textContent = d.sema.metin;
(function buildChart() {
  const svg = $('[data-chart-svg]');
  const SZ = [0, [13, 17], [11, 15], [12, 17], [13, 15], [13, 15], [18, 19], [17, 18], [15, 17]];
  let out = '<g class="chart__guides"><path d="M60 250 Q 210 -40 360 250" /><path d="M60 290 Q 210 580 360 290" /></g>';
  // Kadran: ekranın solu hastanın sağı
  for (const [q, upper, dir] of [[1, true, -1], [2, true, 1], [4, false, -1], [3, false, 1]]) {
    for (let n = 1; n <= 8; n++) {
      const th = dir * (0.12 + (n - 1) * 0.2);
      const x = 210 + Math.sin(th) * 150 * (1 + (n - 1) * 0.004);
      const y = upper ? 255 - Math.cos(th) * 205 : 285 + Math.cos(th) * 205;
      const ang = (upper ? th : -th) * (180 / Math.PI);
      const [w, h] = SZ[n];
      const no = `${q}${n}`;
      const lx = 210 + Math.sin(th) * 186, ly = upper ? 255 - Math.cos(th) * 238 : 285 + Math.cos(th) * 238;
      out += `<g class="tooth" data-no="${no}" tabindex="0" role="button" aria-label="${no} numaralı diş, ${BOLGE[q]} ${ADLAR[n]}">
        <rect x="${(x - w).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${w * 2}" height="${h * 2}" rx="${Math.min(w, h) * 0.8}" transform="rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" />
        <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle">${no}</text></g>`;
    }
  }
  out += '<text class="chart__jaw" x="210" y="200" text-anchor="middle">Üst çene</text><text class="chart__jaw" x="210" y="350" text-anchor="middle">Alt çene</text>';
  svg.innerHTML = out;
  const pickNo = $('[data-pick-no]'), pickName = $('[data-pick-name]'), pickWa = $('[data-pick-wa]'), pickCta = $('[data-pick-cta]');
  pickWa.href = waGenel;
  const select = (g) => {
    $$('.tooth.is-on', svg).forEach((x) => x.classList.remove('is-on'));
    g.classList.add('is-on');
    const no = g.dataset.no, q = no[0], n = Number(no[1]);
    pickNo.textContent = no;
    pickName.textContent = `${BOLGE[q][0].toLocaleUpperCase('tr')}${BOLGE[q].slice(1)}, ${ADLAR[n]}`;
    pickCta.textContent = `${no} için WhatsApp'tan yazın`;
    pickWa.href = waHref(d, `Merhaba ${d.isletme.ad}, ${no} numaralı dişim (${BOLGE[q]} ${ADLAR[n]}) için muayene randevusu almak istiyorum. Şikâyetim: `);
    gsap.fromTo('[data-pick]', { scale: 0.97 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
  };
  svg.addEventListener('click', (e) => { const g = e.target.closest('.tooth'); if (g) select(g); });
  svg.addEventListener('keydown', (e) => { const g = e.target.closest('.tooth'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g); } });
})();

// --- Sahne ---------------------------------------------------------------

const canvas = $('[data-stage]');
const S = createScene(canvas, { lite });
if (import.meta.env.DEV) window.__tj = S;

// Durak aralıkları (film ilerlemesi)
const R = { hero: [0, 0.075], muayene: [0.075, 0.215], temizlik: [0.215, 0.34], dolgu: [0.34, 0.465], kanal: [0.465, 0.61], implant: [0.61, 0.765], ortodonti: [0.765, 0.9], over: [0.9, 1] };
const CARD_RANGES = F.map((a) => R[a.id]);
const kOf = (p, id) => seg(p, R[id][0], R[id][1]);

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
  if (m) { out[2] *= 1.62; out[4] = 40; }
  return out;
}

function filmState(p, time) {
  const m = mobile();
  const [camAz, camEl, camDist, camY, fov] = camPose(p);
  const kM = kOf(p, 'muayene'), kT = kOf(p, 'temizlik'), kD = kOf(p, 'dolgu'), kK = kOf(p, 'kanal'), kI = kOf(p, 'implant'), kO = kOf(p, 'ortodonti'), kV = kOf(p, 'over');
  // Diş dönüşü: kaydırmaya bağlı, hafif nefes
  let rotY = p < R.muayene[0] ? time * 0.25 % (Math.PI * 2) : 0;
  const idle = Math.sin(time * 0.6) * 0.06;
  if (p >= R.muayene[0]) {
    rotY = L(-0.55, -0.35, kM) + (kT > 0 ? kT * Math.PI * 2 : 0) + (kD > 0 ? L(0, -0.25, sm(seg(kD, 0, 0.3))) : 0);
    if (kK > 0) rotY = L(-0.6, 0.18, sm(seg(kK, 0, 0.3))) + L(0, -0.35, seg(kK, 0.3, 1));
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
  const shiftX = m ? 0 : 0.2;
  const shiftY = m ? -0.17 : 0;
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

function finaleState(q, time) {
  const m = mobile();
  return {
    camAz: 0, camEl: 0.18, camDist: m ? 8.2 : 5.4, camY: -0.1, fov: m ? 40 : 34, shiftX: m ? 0 : 0.22, shiftY: m ? -0.25 : 0,
    tooth: 1, toothY: Math.sin(time * 0.6) * 0.04, rotX: 0.1, rotY: time * 0.3 + q * 2,
    scan: 9, ring: 0, xray: 0, cavity: 0, fill: 1, plaque: 0, clean: 9, chips: 0, cure: 0,
    cut: 9, pulpGlow: 0, canal: 0, implant: 0, implantK: 0, iRotX: 0, iRotY: 0,
    arch: 0, archRot: 0, archY: 0, align: 1, brackets: 0, wire: 0, halo: 1,
  };
}

// --- Film UI -------------------------------------------------------------

const film = $('[data-film]');
const hero = $('[data-hero]');
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
const rail = $('[data-rail]');
const overview = $('[data-overview]');
const hint = $('[data-hint]');
const tagsBox = $('[data-tags]');

function place(el, v, pt) {
  el.style.opacity = v;
  el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
  if (v > 0.01 && pt) el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
}

function filmUI(p) {
  const heroOut = seg(p, 0.05, 0.075);
  hero.style.opacity = 1 - heroOut;
  hero.style.transform = `translate3d(0, ${heroOut * -40}px, 0)`;
  hero.style.visibility = heroOut >= 1 ? 'hidden' : 'visible';
  hint.style.opacity = 1 - seg(p, 0.0, 0.03);

  let active = -1;
  cards.forEach((card, i) => {
    const [a, b] = CARD_RANGES[i];
    const w = (b - a) * 0.12;
    const vin = seg(p, a + w * 0.3, a + w * 1.3), vout = seg(p, b - w, b);
    const v = vin * (1 - vout);
    card.style.opacity = v;
    card.style.transform = `translate3d(0, ${(1 - vin) * 36 - vout * 24}px, 0)`;
    card.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    if (p >= a && p < b) active = i;
  });
  const railOn = seg(p, 0.07, 0.085) * (1 - seg(p, 0.89, 0.9));
  rail.style.opacity = railOn;
  rail.style.visibility = railOn > 0.01 ? 'visible' : 'hidden';
  railItems.forEach((li, i) => {
    li.classList.toggle('is-active', i === active);
    li.classList.toggle('is-done', p >= CARD_RANGES[i][1]);
  });

  const ov = seg(p, 0.905, 0.93) * (1 - seg(p, 0.99, 1));
  overview.style.opacity = ov;
  overview.style.visibility = ov > 0.01 ? 'visible' : 'hidden';
  overview.style.transform = `translate3d(0, ${(1 - ov) * 30}px, 0)`;
}

function tagUI(p) {
  if (!S.isReady()) return;
  const kM = kOf(p, 'muayene'), kD = kOf(p, 'dolgu'), kK = kOf(p, 'kanal'), kI = kOf(p, 'implant');
  const inR = (id) => p >= R[id][0] && p < R[id][1];
  place(tagEls.cavity, inR('muayene') ? bump(kM, 0.4, 0.8, 0.15) : 0, S.project('cavity'));
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

const split = new SplitText(heroTitle, { type: 'words,chars', wordsClass: 'word', charsClass: 'ch' });

let lenis = null;
let filmP = 0, filmTarget = 0, finaleQ = 0, canvasFade = 1, finaleIn = 0, footOut = 0;
let filmST = null, finaleST = null;

function setupScroll() {
  lenis = initSmoothScroll();
  lenis?.stop();
  filmST = ScrollTrigger.create({
    trigger: film, start: 'top top', end: 'bottom bottom',
    onUpdate: (self) => (filmTarget = self.progress),
  });
  ScrollTrigger.create({
    trigger: film, start: 'bottom bottom', end: 'bottom 30%',
    onUpdate: (self) => (canvasFade = 1 - self.progress),
  });
  finaleST = ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top bottom', end: 'bottom bottom',
    onUpdate: (self) => (finaleQ = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-finale]', start: 'top 90%', end: 'top 25%',
    onUpdate: (self) => (finaleIn = self.progress),
  });
  ScrollTrigger.create({
    trigger: '.foot', start: 'top bottom', end: 'top 55%',
    onUpdate: (self) => (footOut = self.progress),
  });
  ScrollTrigger.create({
    trigger: '[data-about]', start: 'top 70px',
    endTrigger: '[data-finale]', end: 'top 70px',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive),
  });
  contentMotion();
}

function contentMotion() {
  $$('[data-rise]').forEach((el) => {
    const s = new SplitText(el, { type: 'lines', linesClass: 'ln', mask: 'lines' });
    gsap.fromTo(s.lines, { yPercent: 110 }, {
      yPercent: 0, duration: 1, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  const words = $$('span', aboutText);
  gsap.fromTo(words, { opacity: 0.15 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: aboutText, start: 'top 85%', end: 'bottom 50%', scrub: true },
  });
  gsap.fromTo('.about__img img', { scale: 1.18 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.about__img', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Görseller: yukarıdan aşağı "röntgen" perdesiyle açılır
  $$('.about__img, .kids__img, .svc__img').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, {
      clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'power3.out',
      onUpdate: () => (el.textContent = nf(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  // Şema: dişler sırayla yerine oturur
  gsap.fromTo('.chart .tooth', { opacity: 0, scale: 0.4, transformOrigin: 'center' }, {
    opacity: 1, scale: 1, duration: 0.5, stagger: { each: 0.025, from: 'center' }, ease: 'back.out(2.2)',
    scrollTrigger: { trigger: '.chart__svg', start: 'top 80%', once: true },
  });
  gsap.fromTo('.steps__list', { '--fill': 0 }, {
    '--fill': 1, ease: 'none',
    scrollTrigger: { trigger: '.steps__list', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  $$('.step').forEach((s) => {
    ScrollTrigger.create({ trigger: s, start: 'top 65%', onEnter: () => s.classList.add('is-lit'), onLeaveBack: () => s.classList.remove('is-lit') });
  });
  // Galeri yatay kayar
  const track = $('[data-gallery]');
  gsap.to(track, {
    x: () => -Math.max(0, track.scrollWidth - innerWidth),
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top 85%', end: 'bottom 15%', scrub: true, invalidateOnRefresh: true },
  });
  gsap.fromTo('.rev', { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.reviews__list', start: 'top 85%', once: true },
  });
  const puanEl = $('[data-puan]');
  const po = { v: 0 };
  gsap.to(po, {
    v: d.puan.ortalama, duration: 1.4, ease: 'power2.out',
    onUpdate: () => (puanEl.textContent = nf(po.v, 1)),
    scrollTrigger: { trigger: '.reviews', start: 'top 80%', once: true },
  });
  const fsplit = new SplitText('[data-final-title]', { type: 'lines', linesClass: 'ln', mask: 'lines' });
  gsap.fromTo(fsplit.lines, { yPercent: 110 }, {
    yPercent: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out',
    scrollTrigger: { trigger: '[data-finale]', start: 'top 50%', once: true },
  });
}

let lastT = performance.now();
let rendered = false;
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const time = now / 1000;

  const filmActive = filmST ? filmST.progress < 1 || canvasFade > 0.001 : true;
  filmP += (filmTarget - filmP) * (1 - Math.exp(-dt * 8));
  if (filmActive) filmUI(filmP);

  const showFinale = finaleIn > 0.001;
  let op;
  if (showFinale && filmST && filmST.progress >= 1) {
    op = finaleIn * (1 - footOut);
    S.update(finaleState(finaleQ, time), now);
    tagsBox.style.visibility = 'hidden';
    rendered = true;
  } else if (filmActive) {
    op = canvasFade;
    S.update(filmState(filmP, time), now);
    tagsBox.style.visibility = canvasFade > 0.99 ? 'visible' : 'hidden';
    tagUI(filmP);
    rendered = true;
  } else {
    op = 0;
    tagsBox.style.visibility = 'hidden';
  }
  if (canvas.style.opacity !== String(op)) canvas.style.opacity = op;
  requestAnimationFrame(tick);
}

addEventListener('resize', () => S.resize());

// --- Açılış: panoramik röntgen --------------------------------------------------

function buildPano() {
  // Üst ve alt çene: 16'şar diş, kökleriyle; ortada kapanış çizgisi
  const W = [44, 36, 40, 34, 34, 50, 48, 44]; // orta kesiciden yirmilik dişe
  const OCC = 210;
  let g = '';
  for (const upper of [true, false]) {
    const dir = upper ? -1 : 1; // köklerin yönü
    for (const s of [-1, 1]) {
      let x = 500 + s * 2;
      for (let n = 0; n < 8; n++) {
        const tw = W[n] * (upper ? 1 : 0.92);
        const cx = x + s * tw / 2;
        x += s * (tw + 3);
        const bend = Math.pow(Math.abs(cx - 500) / 430, 2) * 34;
        const y0 = OCC + dir * 3 - bend;
        const ch = n < 3 ? 52 : n < 5 ? 46 : 42; // kron boyu
        const rl = n === 2 ? 118 : n < 3 ? 96 : n < 5 ? 88 : 80;
        const ycej = y0 + dir * ch;
        const L0 = cx - tw / 2, R0 = cx + tw / 2;
        // Kron: kapanış yüzünden boyuna şişkin
        g += `<path class="pano__crown" d="M${L0 + 3} ${y0} C${L0 - 2} ${y0 + dir * ch * 0.5} ${L0 + 1} ${ycej} ${L0 + 5} ${ycej} L${R0 - 5} ${ycej} C${R0 - 1} ${ycej} ${R0 + 2} ${y0 + dir * ch * 0.5} ${R0 - 3} ${y0} Q${cx} ${y0 - dir * 6} ${L0 + 3} ${y0}Z"/>`;
        const roots = n >= 5 ? [[L0 + tw * 0.28, -0.05], [R0 - tw * 0.28, 0.05]] : [[cx, 0]];
        for (const [rx, lean] of roots) {
          const rw = n >= 5 ? tw * 0.2 : tw * 0.3;
          const tipX = rx + lean * 60 + s * 4, tipY = ycej + dir * rl;
          g += `<path class="pano__root" d="M${rx - rw} ${ycej} Q${rx - rw * 0.8} ${ycej + dir * rl * 0.7} ${tipX} ${tipY} Q${rx + rw * 0.8} ${ycej + dir * rl * 0.7} ${rx + rw} ${ycej}Z"/>`;
          g += `<path class="pano__pulp" d="M${rx - 2.5} ${ycej - dir * ch * 0.35} Q${rx} ${ycej + dir * rl * 0.6} ${tipX} ${tipY - dir * 8} Q${rx + 1} ${ycej + dir * rl * 0.6} ${rx + 2.5} ${ycej - dir * ch * 0.35}Z"/>`;
        }
      }
    }
  }
  $('[data-pano]').innerHTML = g;
  $('[data-pano-glow]').innerHTML = g;
}

function heroIn() {
  gsap.timeline()
    .fromTo(split.chars, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.022, ease: 'expo.out' }, 0)
    .fromTo(['.hero__since', '.hero__slogan', '.hero__cta'], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.35);
}

function runIntro() {
  buildPano();
  const vb = mobile() ? [170, 30, 660, 360] : [0, 0, 1000, 420];
  $('.intro__pano').setAttribute('viewBox', vb.join(' '));
  const intro = $('[data-intro]');
  const rect = $('[data-scan-rect]');
  const bar = $('[data-scan-bar]');
  const pct = $('[data-intro-pct]');
  let done = false;
  const o = { v: 0 };
  const tl = gsap.timeline();
  tl.fromTo('[data-intro-name]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0);
  tl.to(o, {
    v: 1, duration: 1.7, ease: 'power1.inOut', onUpdate: () => {
      rect.setAttribute('width', (vb[0] + o.v * vb[2]).toFixed(1));
      bar.style.transform = `translate3d(${(o.v * 100).toFixed(2)}cqw, 0, 0)`;
      pct.textContent = Math.round(o.v * 100);
    },
  }, 0.1);
  tl.call(() => {
    S.compile();
    S.update(filmState(0, performance.now() / 1000), performance.now());
  }, [], 0.3);
  tl.add(finish, 2.0);
  function finish() {
    if (done) return;
    done = true;
    tl.kill();
    rect.setAttribute('width', 1000);
    pct.textContent = 100;
    gsap.timeline({ onComplete: () => { intro.remove(); lenis?.start(); } })
      .to('.intro__film', { opacity: 1, filter: 'brightness(2.2)', duration: 0.12, ease: 'power1.in' }, 0)
      .to(intro, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.14)
      .call(heroIn, [], 0.25);
    document.body.classList.remove('is-loading');
  }
  intro.addEventListener('pointerdown', finish, { once: true });
  addEventListener('keydown', finish, { once: true });
}

// --- Hareket azaltma -----------------------------------------------------------

if (reducedMotion) {
  document.documentElement.classList.add('is-static');
  $('[data-intro]').remove();
  document.body.classList.remove('is-loading');
  const still = () => S.update(filmState(0, 0), performance.now());
  S.compile();
  still();
  addEventListener('resize', still);
  $$('[data-count]').forEach((el) => (el.textContent = nf(Number(el.dataset.count))));
  $$('.step').forEach((s) => s.classList.add('is-lit'));
  $('.steps__list').style.setProperty('--fill', 1);
  const again = setInterval(() => { if (S.isReady()) { still(); clearInterval(again); } }, 200);
} else {
  setupScroll();
  runIntro();
  requestAnimationFrame(tick);
}
void asset; void rendered;
