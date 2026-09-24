import '../../shared/base.css';
import './style.css';
import raw from '../../data/sektor-yikama.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld } from './scene.js';
import { magnetic, velocityMarquee, runIntro } from './fx.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const ad = esc(d.isletme.ad);
const yil = new Date().getFullYear();
const tecrube = Math.max(1, yil - d.isletme.kurulus);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const H = d.hizmetler;
const hz = (re) => H.find((h) => re.test(h.baslik.toLocaleLowerCase('tr-TR'))) || H[0];

function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}

const WA = waHref(d, `Merhaba ${d.isletme.ad}, aracımı yıkatmak istiyorum. Bugün ne zaman gelebilirim?`);
const WA_FILO = waHref(d, `Merhaba ${d.isletme.ad}, şirket araçlarımız için abonelikli filo yıkama hakkında görüşmek istiyorum.`);
const status = openStatus(d.saatler);
const bugun = d.saatler[new Date().getDay()];

// --- Render ----------------------------------------------------------------------------

const logo = `<svg viewBox="0 0 30 24" aria-hidden="true"><circle cx="10" cy="14" r="7" fill="#ff5c9d"/><circle cx="21" cy="8" r="5" fill="#3ec5ff"/><circle cx="22" cy="19" r="3.5" fill="#ffe45c"/><circle cx="7.5" cy="11.5" r="1.8" fill="#fff" opacity=".8"/></svg>`;

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne">${logo}<span>${ad}</span></a>
  <p class="top__status ${status.open ? 'is-open' : ''}"><i></i><span class="top__long">${esc(status.text)}</span><span class="top__short">${status.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call btn btn--small" href="${telHref(d)}" aria-label="Ara: ${esc(d.iletisim.telefon)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`;

const HUD = [
  ['kir', 'Kontrol'], ['kopuk', 'Köpük'], ['durulama', 'Durulama'], ['jant', 'Jant'],
  ['ic', 'İç temizlik'], ['cila', 'Cila'], ['filo', 'Filo'],
];
$('#hud').innerHTML = `<p class="hud__lbl">Program</p><ol>${HUD.map(([k, t], i) => `<li data-hud="${k}"><i>${i + 1}</i><span>${t}</span></li>`).join('')}</ol><div class="hud__bar"><b id="hud-bar"></b></div>`;

const sticky = (inner, extra = '') => `<div class="scene__sticky ${extra}"><div class="copy">${inner}</div></div>`;
const chip = (t) => `<span class="dur"><b>${esc(t)}</b></span>`;
const meter = (id, label, color) => `<div class="meter meter--${color}" aria-hidden="true"><span class="meter__lbl">${label}</span><span class="meter__val" id="${id}">%0</span><span class="meter__bar"><i id="${id}-bar"></i></span></div>`;

const sDetay = hz(/detayl/);
const sHizli = hz(/hızlı/);
const sJant = hz(/jant/);
const sKoltuk = hz(/koltuk/);
const sTavan = hz(/tavan/);
const sPasta = hz(/pasta|cila/);
const sFilo = hz(/filo/);

$('#sahne').innerHTML = sticky(`
  <p class="who">${ad} · Şaşmaz Oto Sanayi, ${beri(d.isletme.kurulus)} beri</p>
  <h1 class="h1" id="hero-title" data-reveal>Kirli getirin, ışıl ışıl alın.</h1>
  <p class="lead">${esc(d.isletme.slogan)}</p>
  <div class="actions">
    <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>Hemen ara</span></a>
    <a class="btn btn--ghost" href="${WA}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp'tan sıra al</span></a>
  </div>
  <p class="today"><i class="${status.open ? 'on' : ''}"></i>${bugun ? `Bugün ${esc(bugun.replace('-', ' – '))}` : 'Bugün kapalı'} · haftanın ${d.saatler.filter(Boolean).length} günü açık</p>`, 'is-hero') + `<p class="scroll-hint" aria-hidden="true"><span></span>Kaydırın, yıkamaya başlayalım</p>`;

$('#kir').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    <p class="kicker">Geliş</p>
    <h2 class="h2" id="kir-title" data-reveal>Sanayide araç bir haftada bu hale gelir.</h2>
    <p class="lead">Yol tozu, çamur sıçrağı, jantta fren tozu. Boyaya yapışan kir kuru bezle silinirse boyayı çizer.</p>
    ${meter('m-kir', 'Kir', 'mud')}
  </div>
  <div class="beat" data-beat="1">
    <p class="kicker">1 · ${esc(d.surec[0]?.baslik || '')}</p>
    <h2 class="h2" data-reveal>Önce aracın etrafında birlikte dolaşırız.</h2>
    <p class="lead">${esc(d.surec[0]?.aciklama || '')} ${esc(d.surec[1]?.aciklama || '')}</p>
  </div>`);

$('#kopuk').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    <p class="kicker">2 · Ön yıkama</p>
    <h2 class="h2" id="kopuk-title" data-reveal>Önce basınçlı su kalın çamuru alır.</h2>
    <p class="lead">Kiri bezle sürtmeden önce suyla gevşetiriz. Boyaya ilk dokunuş fırça değil, sudur.</p>
  </div>
  <div class="beat" data-beat="1">
    <p class="kicker">3 · ${esc(sDetay.baslik)}</p>
    <h2 class="h2" data-reveal>Sonra köpük, her köşeye.</h2>
    <p class="lead">${esc(sDetay.aciklama)}</p>
    <div class="row">${chip(sDetay.sure)}${meter('m-kopuk', 'Köpük', 'foam')}</div>
  </div>`);

$('#durulama').innerHTML = sticky(`
  <p class="kicker">4 · Durulama ve kurulama</p>
  <h2 class="h2" id="durulama-title" data-reveal>Durula, kurula, ışıl ışıl.</h2>
  <p class="lead">${esc(sHizli.aciklama)}</p>
  <div class="row">${chip(sHizli.sure + ' hızlı yıkama')}${meter('m-temiz', 'Temiz', 'clean')}</div>`);

$('#jant').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    <p class="kicker">5 · Jant</p>
    <h2 class="h2" id="jant-title" data-reveal>Fren tozu jantı karartır.</h2>
    <p class="lead">Balata tozu jantın içine yapışır, suyla tek başına çıkmaz.</p>
  </div>
  <div class="beat" data-beat="1">
    <p class="kicker">5 · ${esc(sJant.baslik)}</p>
    <h2 class="h2" data-reveal>Jant içi fırçayla, lastiğe parlatıcı.</h2>
    <p class="lead">${esc(sJant.aciklama)}</p>
    <div class="row">${chip(sJant.sure)}</div>
  </div>`);

const icList = [
  ['Koltuk', sKoltuk.aciklama],
  ['Tavan', sTavan.aciklama.split('.')[0] + '.'],
  ['Taban ve paspas', 'Halı ve paspaslar yıkanır, makineyle çekilir.'],
  ['Bagaj', 'Bagaj da süpürülüp silinir, kurutularak teslim edilir.'],
];
$('#ic').innerHTML = sticky(`
  <p class="kicker">6 · İç temizlik</p>
  <h2 class="h2" id="ic-title" data-reveal>Asıl kir içeride.</h2>
  <ol class="checks" id="ic-list">
    ${icList.map(([b, t]) => `<li><b>${esc(b)}</b><span>${esc(t)}</span></li>`).join('')}
  </ol>
  <div class="row">${chip(sKoltuk.sure)}</div>`);

$('#cila').innerHTML = sticky(`
  <p class="kicker">7 · ${esc(sPasta.baslik)}</p>
  <h2 class="h2" id="cila-title" data-reveal>Kılcal çiziği pasta alır, parlaklığı cila verir.</h2>
  <p class="lead">${esc(sPasta.aciklama)}</p>
  <div class="row">${chip(sPasta.sure)}${meter('m-cila', 'Parlaklık', 'gleam')}</div>`);

const filoStat = d.istatistikler.find((s) => /filo/.test(s.etiket));
const HAFTA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const HAFTA_UZUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
$('#filo').innerHTML = sticky(`
  <p class="kicker">8 · ${esc(sFilo.baslik)}</p>
  <h2 class="h2" id="filo-title" data-reveal>Şirket araçlarınız her hafta aynı gün hazır.</h2>
  <p class="lead">${esc(sFilo.aciklama)}</p>
  <div class="week" role="group" aria-label="Yıkama günü seçin">
    ${HAFTA.map((g, i) => `<button type="button" data-day="${i}" aria-pressed="${i === 1}">${g}</button>`).join('')}
  </div>
  <p class="week__note" id="week-note">Her Salı sabah araçlarınız sıraya girmeden yıkanır.</p>
  <div class="actions">
    <a class="btn btn--main" href="${WA_FILO}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>Filo için görüşelim</span></a>
    ${filoStat ? `<span class="filo-stat"><b>${esc(filoStat.deger)}</b>${esc(filoStat.etiket)}</span>` : ''}
  </div>`);

// Programlar: yıkama makinesi paneli gibi
const FALLBACK = '/img/sektor-yikama/yakin-yikama.jpg';
const imgSrc = (h) => h.gorsel || (import.meta.env.BASE_URL + FALLBACK.slice(1));
$('#programlar').innerHTML = `
  <div class="wrap">
    <p class="kicker kicker--ink">Programlar</p>
    <h2 class="h2 h2--ink" id="programs-title" data-reveal>Hangi program sizin aracınıza?</h2>
    <div class="panel">
      <div class="panel__keys" role="tablist" aria-label="Yıkama programları">
        ${H.map((h, i) => `<button type="button" role="tab" id="pk-${i}" aria-controls="pv" aria-selected="${i === 0}" class="key key--${i % 3}" data-prog="${i}"><i>${String(i + 1).padStart(2, '0')}</i><span>${esc(h.baslik)}</span></button>`).join('')}
      </div>
      <div class="panel__view" id="pv" role="tabpanel" aria-live="polite">
        <div class="pv__img"><img id="pv-img" src="${esc(imgSrc(H[0]))}" alt="" width="1200" height="800"></div>
        <div class="pv__body">
          <p class="pv__no" id="pv-no">Program 01</p>
          <h3 id="pv-title">${esc(H[0].baslik)}</h3>
          <p id="pv-text">${esc(H[0].aciklama)}</p>
          <p class="pv__meta"><span class="dur"><b id="pv-sure">${esc(H[0].sure)}</b></span><span class="pv__price">Fiyatı işe başlamadan söyleriz.</span></p>
          <a class="btn btn--ink" id="pv-wa" href="${waHref(d, `Merhaba ${d.isletme.ad}, ${H[0].baslik} için bilgi almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu program için yaz</span></a>
        </div>
      </div>
    </div>
  </div>`;

$('#surec').innerHTML = `
  <div class="wrap">
    <p class="kicker kicker--ink">Nasıl çalışırız</p>
    <h2 class="h2 h2--ink" id="steps-title" data-reveal>Teslimde son sözü siz söylersiniz.</h2>
    <ol class="flow">
      ${d.surec.map((s, i) => `<li class="flow__item"><span class="flow__dot flow__dot--${i % 3}">${i + 1}</span><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
    <p class="promise">${esc(d.garanti)}</p>
  </div>`;

$('#biz').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <p class="kicker kicker--ink">Biz</p>
      <h2 class="h2 h2--ink" id="about-title" data-reveal>Şaşmaz'da ${tecrube} yıldır araç yıkıyoruz.</h2>
      <p class="about__text">${esc(d.isletme.hakkinda)}</p>
    </div>
    <ul class="bubbles">
      ${d.istatistikler.map((s, i) => {
        const v = s.kurulustanHesapla ? tecrube : s.deger;
        return `<li class="bubble bubble--${i % 4}"><b data-count="${v}" data-suffix="${esc(s.sonek)}">0</b><span>${esc(s.etiket)}</span></li>`;
      }).join('')}
    </ul>
  </div>`;

$('#bolme').innerHTML = `
  <div class="wrap">
    <p class="kicker kicker--ink">Bölmeden</p>
    <h2 class="h2 h2--ink" id="shop-title" data-reveal>Köpüğün altında ne var?</h2>
    <ul class="gallery">
      ${d.galeri.map((g, i) => `<li class="gallery__item g${i % 6}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" width="1200" height="800"></li>`).join('')}
    </ul>
  </div>`;

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
const reviewCard = (y, i) => `
  <li class="review review--${i % 3}">
    ${stars(y.puan)}
    <p>${esc(y.metin)}</p>
    <span class="review__who">${esc(y.ad)} · ${esc(y.arac)}</span>
  </li>`;
$('#yorumlar').innerHTML = `
  <div class="wrap reviews__head">
    <div>
      <p class="kicker kicker--ink">Yorumlar</p>
      <h2 class="h2 h2--ink" id="reviews-title" data-reveal>Aracını teslim alan anlatsın.</h2>
    </div>
    <p class="score"><b data-count="${d.puan.ortalama}" data-decimals="1">0</b><span>${stars(d.puan.ortalama)}<small>${fmt(d.puan.adet)} Google yorumu</small></span></p>
  </div>
  <div class="reviews__rail"><ul class="reviews__track">${[...d.yorumlar, ...d.yorumlar].map(reviewCard).join('')}</ul></div>`;

$('#markalar').innerHTML = `
  <div class="brands__rail"><div class="brands__track">${[...d.markalar, ...d.markalar].map((m, i) => `<span class="b${i % 3}">${esc(m)}</span>`).join('')}</div></div>`;

const todayName = GUNLER[new Date().getDay()];
$('#ulasim').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <p class="kicker kicker--ink">Ulaşım</p>
      <h2 class="h2 h2--ink" id="visit-title" data-reveal>Şaşmaz'da, 4. Cadde'de.</h2>
      <p class="visit__status ${status.open ? 'is-open' : ''}"><i></i>${esc(status.text)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${groupedHours(d.saatler).map(([g, h]) => `<tr class="${g.includes(todayName) ? 'is-today' : ''}"><th scope="row">${g}</th><td>${h}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;
// adres başlığı veriden gelsin: cadde bilgisi yoksa genel başlık
if (!/4\. Cadde/.test(d.iletisim.adres)) $('#visit-title').textContent = "Şaşmaz Oto Sanayi'nin içinde.";

$('#iletisim').innerHTML = sticky(`
  <p class="kicker">Son adım</p>
  <h2 class="h1" id="final-title" data-reveal>Aracınızı bugün getirin.</h2>
  <p class="lead">${esc(d.garanti)}</p>
  <div class="actions">
    <a class="btn btn--main" href="${telHref(d)}" data-mag>${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
    <a class="btn btn--ghost" href="${WA}" target="_blank" rel="noopener" data-mag>${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
  </div>`);

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar: Pexels. 3D yıkama bölmesi ve araç bu site için üretildi.</p>
  </div>`;

// Kir etiketleri (3D noktalara bağlı)
const TAGS = [
  { t: 'Çamur sıçrağı', p: [-1.85, 0.5, 0.92] },
  { t: 'Fren tozu', p: [1.34, 0.36, 0.95] },
  { t: 'Yol tozu', p: [-0.6, 1.45, 0.4] },
  { t: 'Camda leke', p: [0.9, 1.2, 0.3] },
];
$('#tags').innerHTML = TAGS.map((g, i) => `<span class="tag tag--${i % 3}" data-tag="${i}"><i></i>${esc(g.t)}</span>`).join('');
const tagEls = $$('.tag');

// Harita yaklaşınca yüklensin
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Program paneli -----------------------------------------------------------------------
function setProgram(i) {
  const h = H[i];
  $$('.key').forEach((k, j) => k.setAttribute('aria-selected', String(j === i)));
  $('#pv').setAttribute('aria-labelledby', `pk-${i}`);
  const apply = () => {
    $('#pv-img').src = imgSrc(h);
    $('#pv-no').textContent = `Program ${String(i + 1).padStart(2, '0')}`;
    $('#pv-title').textContent = h.baslik;
    $('#pv-text').textContent = h.aciklama;
    $('#pv-sure').textContent = h.sure;
    $('#pv-wa').href = waHref(d, `Merhaba ${d.isletme.ad}, ${h.baslik} için bilgi almak istiyorum.`);
  };
  if (reducedMotion) return apply();
  gsap.timeline()
    .fromTo('#pv', { '--wipe': 0 }, { '--wipe': 1, duration: 0.28, ease: 'power2.in' })
    .add(apply)
    .to('#pv', { '--wipe': 0, duration: 0.45, ease: 'power2.out' });
}
$('.panel__keys').addEventListener('click', (e) => {
  const b = e.target.closest('[data-prog]');
  if (b) setProgram(Number(b.dataset.prog));
});
$('.panel__keys').addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
  const keys = $$('.key');
  const cur = keys.findIndex((k) => k.getAttribute('aria-selected') === 'true');
  const n = (cur + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + keys.length) % keys.length;
  keys[n].focus();
  setProgram(n);
  e.preventDefault();
});

// Filo günü seçici
$('.week').addEventListener('click', (e) => {
  const b = e.target.closest('[data-day]');
  if (!b) return;
  $$('.week button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const g = HAFTA_UZUN[Number(b.dataset.day)];
  $('#week-note').textContent = `Her ${g} sabah araçlarınız sıraya girmeden yıkanır.`;
});

// --- Başlık animasyonu -----------------------------------------------------------------
const splits = new Map();
function reveal(el) {
  if (reducedMotion || !el) return;
  let split = splits.get(el);
  if (!split) {
    split = new SplitText(el, { type: 'words,chars', wordsClass: 'w' });
    splits.set(el, split);
  }
  gsap.killTweensOf(split.chars);
  gsap.fromTo(split.chars,
    { opacity: 0, yPercent: 60, scale: 0.4, rotate: () => gsap.utils.random(-25, 25) },
    { opacity: 1, yPercent: 0, scale: 1, rotate: 0, duration: 0.7, stagger: { each: 0.018, from: 'random' }, ease: 'back.out(2.2)' });
}

if (!reducedMotion) {
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => reveal(el) });
  });
}

ScrollTrigger.create({
  trigger: '.solid',
  start: 'top 60px',
  end: 'bottom 60px',
  onToggle: (self) => {
    $('#top').classList.toggle('is-solid', self.isActive);
    document.documentElement.classList.toggle('in-solid', self.isActive);
  },
});

$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const dec = Number(el.dataset.decimals || 0);
  const suf = el.dataset.suffix || '';
  const out = (v) => (el.textContent = (dec ? v.toFixed(dec).replace('.', ',') : fmt(v)) + suf);
  if (reducedMotion) return out(to);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => gsap.to({ v: 0 }, { v: to, duration: 1.6, ease: 'power2.out', onUpdate() { out(this.targets()[0].v); } }),
  });
});

// Galeri: köpük baloncuğundan açılır
if (!reducedMotion) {
  $$('.gallery__item').forEach((item) => {
    gsap.fromTo(item, { '--r': 0 }, {
      '--r': 1,
      ease: 'none',
      scrollTrigger: { trigger: item, start: 'top 95%', end: 'top 45%', scrub: 0.5 },
    });
  });
  $$('.bubble').forEach((b, i) => {
    gsap.from(b, { scale: 0.2, opacity: 0, duration: 0.9, ease: 'elastic.out(1, 0.55)', delay: i * 0.08, scrollTrigger: { trigger: b, start: 'top 90%', once: true } });
  });
  $$('.flow__item').forEach((b, i) => {
    gsap.from(b, { y: 60, opacity: 0, duration: 0.8, ease: 'back.out(1.6)', delay: i * 0.1, scrollTrigger: { trigger: b, start: 'top 90%', once: true } });
  });
}

// --- 3D sahne ve scroll filmi ----------------------------------------------------------
const canvas = $('#gl');
const world = createWorld(canvas, { name: d.isletme.ad, phone, low });
const { S } = world;
addEventListener('resize', () => {
  world.resize();
  measure();
});

const DEFAULTS = { ...S };
const reset = () => Object.assign(S, DEFAULTS);

const scenes = $$('.scene');
let layout = [];
function measure() {
  layout = scenes.map((el) => {
    const r = el.getBoundingClientRect();
    return { el, name: el.dataset.scene, top: r.top + scrollY, height: el.offsetHeight };
  });
}

const beats = new Map();
function setBeat(sceneEl, idx) {
  if (beats.get(sceneEl) === idx) return;
  beats.set(sceneEl, idx);
  $$('.beat', sceneEl).forEach((b) => {
    const on = Number(b.dataset.beat) === idx;
    b.classList.toggle('is-on', on);
    if (on) reveal($('[data-reveal]', b));
  });
}
function listSteps(list, p, a, b) {
  const items = $$('li', list);
  const k = seg(p, a, b) * items.length;
  items.forEach((li, i) => {
    li.classList.toggle('is-on', k > i + 0.999);
    li.classList.toggle('is-now', k > i && k <= i + 0.999);
  });
}
const meters = new Map();
function setMeter(id, v) {
  const r = Math.round(v * 100);
  if (meters.get(id) === r) return;
  meters.set(id, r);
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = `%${r}`;
  document.getElementById(`${id}-bar`).style.transform = `scaleX(${v})`;
}

function clean() {
  S.dirt = 0;
  S.rinse = -4;
  S.foam = 0;
  S.dust = 0;
  S.tireShine = 1;
}

const PREV = { hero: 'hero', kir: 'hero', kopuk: 'kir', durulama: 'kopuk', jant: 'durulama', ic: 'jant', cila: 'ic', filo: 'cila', final: 'filo' };
function enterView(name, p, span = 0.22) {
  world.view(name, ease(seg(p, 0, span)), PREV[name]);
}

let tagsOn = false;
function showTags(on, fade = 1) {
  if (on !== tagsOn) {
    tagsOn = on;
    $('#tags').classList.toggle('is-on', on);
  }
  if (!on) return;
  TAGS.forEach((g, i) => {
    const s = world.project(...g.p);
    tagEls[i].style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
    tagEls[i].style.opacity = String(fade);
  });
}

const SCENES = {
  hero(p) {
    world.view('hero');
    world.orbit(p * 14, 0, -p * 0.6);
    S.lights = 1;
  },
  kir(p, el) {
    enterView('kir', p, 0.3);
    world.orbit(-6 + p * 12);
    S.lights = 1;
    setBeat(el, p < 0.48 ? 0 : 1);
    setMeter('m-kir', 0.87 * ease(seg(p, 0.08, 0.4)));
    const tp = seg(p, 0.5, 0.6) * (1 - seg(p, 0.92, 1));
    showTags(tp > 0.01, tp);
  },
  kopuk(p, el) {
    enterView('kopuk', p, 0.2);
    world.orbit(-10 + p * 22, 0, -p * 0.8);
    S.spray = seg(p, 0.04, 0.1) * (1 - seg(p, 0.38, 0.45));
    S.sprayX = 2.6 - 5.2 * seg(p, 0.05, 0.42);
    S.dirt = 1 - 0.35 * seg(p, 0.08, 0.42);
    S.fall = seg(p, 0.4, 0.5) * (1 - seg(p, 0.9, 0.98));
    S.foam = ease(seg(p, 0.44, 0.88));
    setBeat(el, p < 0.42 ? 0 : 1);
    setMeter('m-kopuk', S.foam);
  },
  durulama(p) {
    enterView('durulama', p, 0.18);
    world.orbit(-8 + p * 16);
    S.dirt = 0.65;
    S.foam = 1;
    S.rinse = 2.7 - 5.6 * seg(p, 0.1, 0.68);
    S.curtain = seg(p, 0.06, 0.12) * (1 - seg(p, 0.66, 0.74));
    S.wet = seg(p, 0.15, 0.4) * (1 - 0.6 * seg(p, 0.78, 1));
    S.gleam = -3.5 + 7 * seg(p, 0.72, 0.98);
    S.gleamAmt = seg(p, 0.72, 0.78) * (1 - seg(p, 0.94, 1));
    setMeter('m-temiz', seg(2.4 - S.rinse, 0, 4.6));
  },
  jant(p, el) {
    enterView('jant', p, 0.25);
    world.orbit(-6 + p * 10);
    clean();
    S.dust = 1 - ease(seg(p, 0.35, 0.72));
    S.tireShine = ease(seg(p, 0.66, 0.9));
    S.spinAngle = p * 7;
    S.spray = seg(p, 0.33, 0.38) * (1 - seg(p, 0.66, 0.72)) * 0.7;
    S.sprayX = 1.34;
    setBeat(el, p < 0.4 ? 0 : 1);
  },
  ic(p, el) {
    enterView('ic', p, 0.2);
    world.orbit(-6 + p * 12);
    clean();
    S.xray = ease(seg(p, 0.06, 0.2)) * (1 - ease(seg(p, 0.9, 0.99)));
    S.scan = 2.2 - 4.4 * seg(p, 0.24, 0.86);
    S.neon = 1 - 0.7 * S.xray;
    listSteps($('#ic-list', el), p, 0.24, 0.86);
  },
  cila(p) {
    enterView('cila', p, 0.2);
    world.orbit(-8 + p * 16);
    clean();
    S.swirl = 1;
    S.arch = 0;
    S.polisher = ease(seg(p, 0.1, 0.18)) * (1 - ease(seg(p, 0.76, 0.84)));
    S.polishPath = seg(p, 0.14, 0.78);
    const px = 2.05 - S.polishPath * 1.4;
    S.polish = p < 0.78 ? px + 0.05 : px + 0.05 - 4 * seg(p, 0.78, 0.86);
    S.gleam = -3.5 + 7.5 * seg(p, 0.84, 1);
    S.gleamAmt = seg(p, 0.84, 0.88);
    setMeter('m-cila', 0.35 + 0.65 * seg(p, 0.14, 0.86));
  },
  filo(p) {
    enterView('filo', p, 0.18);
    world.orbit(-6 + p * 10);
    clean();
    S.fleet = p > 0.03 ? 1 : 0;
    S.fleetP = seg(p, 0.05, 0.98);
  },
  final(p) {
    enterView('final', p, 0.4);
    world.orbit(-10 + p * 20);
    clean();
    S.lights = 1;
    S.wet = 0.25;
    S.gleam = -3.5 + 7.5 * seg(p, 0.3, 0.8);
    S.gleamAmt = seg(p, 0.3, 0.36) * (1 - seg(p, 0.76, 0.82));
  },
};

// HUD
const hudItems = $$('[data-hud]');
let hudCur = null;
function setHud(name, filmP) {
  const idx = HUD.findIndex(([k]) => k === name);
  if (hudCur !== name) {
    hudCur = name;
    hudItems.forEach((li, i) => {
      li.classList.toggle('is-now', i === idx);
      li.classList.toggle('is-done', idx > -1 && i < idx);
    });
    $('#hud').classList.toggle('is-on', idx > -1);
  }
  $('#hud-bar').style.transform = `scaleX(${filmP.toFixed(3)})`;
}

let active = null;
function tick() {
  const y = scrollY;
  const vh = innerHeight;
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * 0.5) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  reset();
  SCENES[cur.name](p, cur.el);
  if (cur.name !== 'kir') showTags(false);
  const film = layout.filter((l) => l.name !== 'final');
  const f0 = film[1]?.top ?? 0;
  const last = film.at(-1);
  setHud(cur.name, clamp((y - f0) / Math.max(1, last.top + last.height - vh - f0)));
  if (active !== cur.el) {
    active = cur.el;
    if (!$('.beat', cur.el)) reveal($('[data-reveal]', cur.el));
  }
}

// Kanvas sadece film ya da final görünürken çizilir
let canvasOn = true;
const visible = new Set();
const vio = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
  if (!canvasOn) $('#hud').classList.remove('is-on');
  else hudCur = null;
});
[$('#film'), $('#iletisim')].forEach((el) => vio.observe(el));

let lenis = null;
function start() {
  measure();
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    measure();
    reset();
    world.view('final');
    world.snap();
    clean();
    S.lights = 1;
    const draw = () => world.render();
    draw();
    setTimeout(draw, 1500);
    addEventListener('scroll', () => requestAnimationFrame(draw), { passive: true });
    return;
  }
  lenis = initSmoothScroll({ lerp: 0.1 });
  ScrollTrigger.addEventListener('refresh', measure);
  ScrollTrigger.refresh();
  tick();
  world.snap();
  gsap.ticker.add(() => {
    tick();
    if (canvasOn) world.render();
  });
  $$('[data-mag]').forEach((b) => magnetic(b, 0.3));
  velocityMarquee($('.brands__track'), { speed: 50, lenis });
  velocityMarquee($('.reviews__track'), { speed: 24, dir: -1, lenis });
}

world.view('hero');
world.snap();
world.render();
document.fonts?.ready.then(() => world.setName(d.isletme.ad));
const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))]);
fontsReady
  .then(() => (reducedMotion ? $('#intro').remove() : runIntro($('#intro'), $('#foam'), d.isletme.ad)))
  .then(() => reveal($('#hero-title')));
start();
