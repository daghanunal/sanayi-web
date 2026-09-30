import '../../shared/base.css';
import './style.css';
import ortak from '../../data/bakim.json';
import ozel from '../../data/kaput.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader, GUNLER,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, saatBicim, icons,
} from '../../shared/core.js';
import { pickQuality } from '../../shared/lib3d.js';
import { createScene, SHOTS } from './scene.js';

// Kaput: az 3D. Açılışta tek sahne (kaput kalkar, sıcak iş lambası yanar, pencereden ışık süzmesi
// geçer); sahne künye ekrandan çıkınca durur. Geri kalanı 2D editoryal: büyük fotoğraflar, yavaş
// paralaks, yapışkan hizmet dizini. Etkileşim: araç + iş + gün/saat seçimiyle hazırlanan randevu mesajı.

const d = boot({ ...ortak, ...ozel });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = Math.max(1, yil - d.isletme.kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const bilgi = Object.fromEntries(d.bilgiler || []);
const phone = matchMedia('(max-width: 899px)');
const narrow = matchMedia('(max-width: 767px)'); // dizin çubuğu düzeni
const two = (n) => String(n).padStart(2, '0');
if (reducedMotion) document.documentElement.classList.add('rm');

const mark = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 21 16 10l11 11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 25h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

// --- Üst çubuk ---------------------------------------------------------------------------
$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#periyodik">Periyodik bakım</a><a href="#randevu">Randevu</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------------
$('#kunye').innerHTML = `
  <div class="hero__stage" aria-hidden="true"><canvas class="hero__gl" id="gl"></canvas><div class="hero__shade"></div></div>
  <div class="hero__in">
    <p class="hero__eyebrow">${esc(d.isletme.tanim)}</p>
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--amber" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler: yapışkan dizin -------------------------------------------------------------
let n = 0;
const gruplar = d.gruplar.map((g, gi) => ({
  ...g, gi, img: d.grupGorsel?.[g.id],
  list: d.hizmetler.filter((h) => h.grup === g.id).map((h) => ({ ...h, i: ++n })),
}));
const svcIndex = Object.fromEntries(gruplar.flatMap((g) => g.list.map((h) => [h.i, h])));
$('#hizmetler').innerHTML = `
  <div class="svc__grid">
    <aside class="idx">
      <h2 class="svc__title" id="svc-title">Hizmetler</h2>
      <p class="svc__sub">Dört grupta ${d.hizmetler.length} hizmet. Süreler yaklaşıktır, araca göre değişir. Fiyat ve randevu için arayın.</p>
      <nav class="idx__nav" aria-label="Hizmet dizini" data-lenis-prevent>
        <ol>
          ${gruplar.map((g) => `
            <li class="idx__grp${g.gi === 0 ? ' is-on' : ''}" data-g="${g.id}">
              <a class="idx__g" href="#g-${g.id}"><span>${two(g.gi + 1)}</span>${esc(g.ad)}</a>
              <ol>${g.list.map((h) => `<li><a class="idx__s" href="#h-${h.i}" data-i="${h.i}"><span>${two(h.i)}</span>${esc(h.baslik)}</a></li>`).join('')}</ol>
            </li>`).join('')}
        </ol>
      </nav>
    </aside>
    <nav class="idx-bar" aria-label="Hizmet grupları">
      ${gruplar.map((g) => `<a href="#g-${g.id}" data-g="${g.id}"${g.gi === 0 ? ' class="is-on"' : ''}>${esc(g.ad)}</a>`).join('')}
    </nav>
    <div class="svc__body">
      ${gruplar.map((g) => `
        <section class="grp" id="g-${g.id}" data-g="${g.id}" aria-labelledby="gt-${g.id}">
          ${g.img ? `<figure class="grp__fig grp__fig--${g.img.oran === '4/5' ? 'tall' : 'wide'}"><img src="${esc(g.img.src)}" alt="${esc(g.img.alt)}" loading="lazy" decoding="async" /></figure>` : ''}
          <h3 class="grp__title" id="gt-${g.id}"><span>${two(g.gi + 1)}</span>${esc(g.ad)}</h3>
          ${g.list.map((h) => `
            <article class="ent" id="h-${h.i}" data-i="${h.i}">
              <p class="ent__n">${two(h.i)}</p>
              <div class="ent__body">
                <h4 class="ent__title">${esc(h.baslik)}</h4>
                <p class="ent__kisa">${esc(h.kisa)}</p>
                <p class="ent__text">${esc(h.aciklama)}</p>
                <div class="ent__foot">
                  ${h.sure ? `<p class="ent__time">Süre <b>${esc(h.sure)}</b></p>` : ''}
                  <button class="ent__book" type="button" data-book="${h.i}"><span>Bu iş için randevu</span>${arrow}</button>
                </div>
              </div>
            </article>`).join('')}
        </section>`).join('')}
    </div>
  </div>`;

// --- Periyodik bakım -------------------------------------------------------------------------
$('#periyodik').innerHTML = `
  <div class="wrap">
    <header class="head">
      <h2 class="h2" id="plan-title">Periyodik bakım</h2>
      <p class="head__sub" id="plan-note">${esc(d.periyodik.not)}</p>
    </header>
    <ol class="plan__rows">
      ${d.periyodik.adimlar.map((a, i) => `
        <li class="row">
          <span class="row__line" aria-hidden="true"></span>
          <p class="row__n">${two(i + 1)}</p>
          <p class="row__when">${esc(a.aralik)}</p>
          <ul class="row__jobs">${a.isler.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Randevu (etkileşim) ---------------------------------------------------------------------
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => `${two(Math.floor(m / 60))}:${two(m % 60)}`;
function dilimler(s, dk) {
  const [a, b] = s.split('-').map(toMin);
  const out = [];
  for (let t = a; t < b; t += dk) {
    const e = Math.min(t + dk, b);
    if (e - t < 60 && out.length) out.at(-1)[1] = e;
    else out.push([t, e]);
  }
  return out;
}
function gunler(now = new Date()) {
  const dk = d.randevu?.dilimDakika || 120;
  const out = [];
  const simdi = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 14 && out.length < (d.randevu?.gunSayisi || 6); i++) {
    const g = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const s = d.saatler[g.getDay()];
    if (!s) continue;
    let sl = dilimler(s, dk);
    if (i === 0) sl = sl.filter(([, e]) => e - 60 > simdi);
    if (!sl.length) continue;
    out.push({
      key: `${g.getMonth() + 1}-${g.getDate()}`,
      kisa: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : GUNLER[g.getDay()],
      tarih: `${g.getDate()} ${AY[g.getMonth()]}`,
      uzun: `${GUNLER[g.getDay()]} ${g.getDate()} ${AY[g.getMonth()]}`,
      dilim: sl.map(([a, b]) => saatBicim(`${fromMin(a)}-${fromMin(b)}`)),
    });
  }
  return out;
}
const GUN = gunler();
const yillar = Array.from({ length: yil - 1994 }, (_, i) => yil - i);

$('#randevu').innerHTML = `
  <div class="wrap book__grid">
    <div class="book__form">
      <header class="head">
        <h2 class="h2" id="book-title">Randevu</h2>
        <p class="head__sub">${esc(bilgi.Randevu || '')} Araç, iş ve uygun gün seçilince WhatsApp mesajı hazırlanır.</p>
      </header>
      <fieldset class="step">
        <legend><span>1</span>Araç</legend>
        <div class="step__row">
          <label class="fld"><span>Marka</span>
            <select id="f-marka"><option value="">Seçin</option>${d.markalar.map((m) => `<option>${esc(m)}</option>`).join('')}<option value="Diğer">Diğer</option></select></label>
          <label class="fld"><span>Model</span><input id="f-model" type="text" autocomplete="off" placeholder="Örnek: Egea" /></label>
          <label class="fld fld--s"><span>Yıl</span>
            <select id="f-yil"><option value="">Seçin</option>${yillar.map((y) => `<option>${y}</option>`).join('')}</select></label>
        </div>
      </fieldset>
      <fieldset class="step">
        <legend><span>2</span>İş</legend>
        <label class="fld fld--wide"><span>Hizmet</span>
          <select id="f-is"><option value="">Seçin</option>
            ${gruplar.map((g) => `<optgroup label="${esc(g.ad)}">${g.list.map((h) => `<option value="${h.i}">${esc(h.baslik)}</option>`).join('')}</optgroup>`).join('')}
            <option value="x">Emin değilim, arıza var</option>
          </select></label>
      </fieldset>
      <fieldset class="step">
        <legend><span>3</span>Gün ve saat</legend>
        <div class="days" role="radiogroup" aria-label="Gün">
          ${GUN.map((g, i) => `<button class="day" type="button" role="radio" aria-checked="false" data-day="${i}" tabindex="${i === 0 ? 0 : -1}"><b>${esc(g.kisa)}</b><span>${esc(g.tarih)}</span></button>`).join('')}
        </div>
        <div class="slots" role="radiogroup" aria-label="Saat aralığı"></div>
        <p class="step__hint">Yalnız çalışma saatleri içindeki aralıklar gösterilir.</p>
      </fieldset>
    </div>
    <aside class="book__out" aria-live="polite">
      <p class="out__label">Mesaj önizlemesi</p>
      <h3 class="out__title" id="out-title">Randevu isteği</h3>
      <dl class="out__list">
        <div><dt>Araç</dt><dd id="o-arac">Seçilmedi</dd></div>
        <div><dt>İş</dt><dd id="o-is">Seçilmedi</dd></div>
        <div><dt>Tercih</dt><dd id="o-gun">Seçilmedi</dd></div>
      </dl>
      <pre class="out__msg" id="o-msg"></pre>
      <a class="btn btn--amber btn--block" id="o-send" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
      <p class="out__note">Seçilen gün ve saat mesaja tercih olarak yazılır; kesin saat telefonda ya da WhatsApp'ta konuşulur.</p>
    </aside>
  </div>`;

// --- Çalışma sırası -------------------------------------------------------------------------
$('#surec').innerHTML = `
  <div class="wrap">
    <header class="head"><h2 class="h2" id="flow-title">Çalışma sırası</h2></header>
    <ol class="flow__list">
      ${d.surec.map((s, i) => `<li class="flow__step"><p class="flow__n">${two(i + 1)}</p><h3 class="flow__t">${esc(s.baslik)}</h3><p class="flow__d">${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında -------------------------------------------------------------------------------
$('#hakkinda').innerHTML = `
  <figure class="about__fig"><img src="${esc(d.atolye.src)}" alt="${esc(d.atolye.alt)}" loading="lazy" decoding="async" /></figure>
  <div class="wrap about__grid">
    <div>
      <h2 class="h2" id="about-title">Hakkında</h2>
      <p class="about__lead">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde.</p>
      <p class="about__text">${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div><dt>haftada açık</dt><dd><b>${acikGun}</b> gün</dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>`;

// --- Galeri ---------------------------------------------------------------------------------
$('#galeri').innerHTML = `
  <div class="wrap">
    <header class="head head--row"><h2 class="h2" id="gal-title">Galeri</h2><p class="head__sub">Fotoğraflar konuyu gösteren örneklerdir, yerlerine işletmenin kendi fotoğrafları konur.</p></header>
    <div class="gal__grid">
      ${(d.galeri || []).map((g, i) => `<figure class="gal__item gal__item--${i}"><div class="gal__frame"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /></div><figcaption>${esc(g.baslik)}</figcaption></figure>`).join('')}
    </div>
  </div>`;

// --- Saatler ve konum -----------------------------------------------------------------------
$('#saatler').innerHTML = `
  <div class="wrap shop__grid">
    <div>
      <h2 class="h2" id="shop-title">Çalışma saatleri ve konum</h2>
      <p class="shop__status ${st.open ? 'is-open' : ''}"><i></i>${esc(st.metin)}</p>
      <table class="hours"><caption class="sr-only">Çalışma saatleri</caption><tbody>
        ${saatListesi(d.saatler).map(([g, h]) => `<tr><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}
      </tbody></table>
      <p class="shop__addr">${esc(d.iletisim.adres)}</p>
      <div class="shop__cta">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--inkline" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="shop__map" id="map"></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------
const [ilk, ...diger] = d.yorumlar;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="head"><h2 class="h2" id="rev-title">Örnek yorumlar</h2><p class="head__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p></header>
    <figure class="rev__lead"><blockquote>${esc(ilk.metin)}</blockquote><figcaption><b>${esc(ilk.ad)}</b> · ${esc(ilk.arac)}</figcaption></figure>
    <ul class="rev__list">
      ${diger.map((r) => `<li class="rev__item"><blockquote>${esc(r.metin)}</blockquote><p><b>${esc(r.ad)}</b> · ${esc(r.arac)}</p></li>`).join('')}
    </ul>
  </div>`;

// --- SSS ------------------------------------------------------------------------------------
$('#sss').innerHTML = `
  <div class="wrap faq__grid">
    <header class="head"><h2 class="h2" id="faq-title">Sık sorulanlar</h2></header>
    <div class="faq__list">
      ${(d.sss || []).filter((q) => bilgi[q.bilgi]).map((q, i) => `
        <details class="qa" ${i === 0 ? 'open' : ''}><summary><span>${esc(q.soru)}</span><i aria-hidden="true"></i></summary><p>${esc(bilgi[q.bilgi])}</p></details>`).join('')}
    </div>
  </div>`;

// --- İletişim ve footer ---------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="wrap contact__in">
    <h2 class="contact__title" id="contact-title">İletişim</h2>
    <p class="contact__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="contact__cta">
      <a class="btn btn--amber btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--line btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="contact__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;
$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${mark}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)}</p>
    <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${yil} ${ad}. 3D görseller temsilîdir, araç belirli bir marka ya da modeli göstermez. Fotoğraflar örnektir. Yorumlar örnektir.</p>
  </div>`;

new IntersectionObserver((es, io) => {
  if (es.some((e) => e.isIntersecting)) {
    $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  }
}, { rootMargin: '600px' }).observe($('#map'));

// =========================================================================================
// Randevu mantığı (durum bellekte; URL'ye yazılmaz)
// =========================================================================================
const R = { marka: '', model: '', yil: '', is: '', gun: -1, dilim: -1 };
const aracMetni = () => [R.yil, R.marka === 'Diğer' ? '' : R.marka, R.model].filter(Boolean).join(' ');
function isMetni() {
  if (R.is === 'x') return 'Arıza var, ne olduğu belli değil';
  return R.is ? svcIndex[R.is].baslik : '';
}
function gunMetni() {
  if (R.gun < 0) return '';
  const g = GUN[R.gun];
  return R.dilim >= 0 ? `${g.uzun}, ${g.dilim[R.dilim]}` : g.uzun;
}
function renderSlots() {
  const box = $('.slots');
  if (R.gun < 0) { box.innerHTML = ''; return; }
  box.innerHTML = GUN[R.gun].dilim.map((s, i) => `<button class="slot" type="button" role="radio" aria-checked="${i === R.dilim}" data-slot="${i}" tabindex="${i === Math.max(0, R.dilim) ? 0 : -1}">${esc(s)}</button>`).join('');
  if (!reducedMotion) gsap.from($$('.slot', box), { autoAlpha: 0, y: 8, duration: 0.35, stagger: 0.04, ease: 'power3.out', clearProps: 'all' });
}
function renderOut() {
  const arac = aracMetni();
  const is = isMetni();
  const gun = gunMetni();
  $('#o-arac').textContent = arac || 'Seçilmedi';
  $('#o-is').textContent = is || 'Seçilmedi';
  $('#o-gun').textContent = gun || 'Seçilmedi';
  for (const [id, v] of [['o-arac', arac], ['o-is', is], ['o-gun', gun]]) $('#' + id).classList.toggle('is-set', !!v);
  $('#out-title').textContent = arac ? `${arac} için randevu isteği` : 'Randevu isteği';
  const satir = [`Merhaba ${d.isletme.ad}, randevu almak istiyorum.`];
  if (arac) satir.push(`Araç: ${arac}`);
  if (is) satir.push(`İş: ${is}`);
  if (gun) satir.push(`Tercih: ${gun}`);
  const msg = satir.join('\n');
  $('#o-msg').textContent = msg;
  $('#o-send').href = waHref(d, msg);
  // Sayfa seçilen araca göre konuşur (yalnız olgu: kitapçık vurgusu).
  $('#plan-note').textContent = arac
    ? `${arac} için kesin aralıklar aracın bakım kitapçığında yazar; aşağıdaki çizelge geneldir ve kullanıma göre değişir.`
    : d.periyodik.not;
}
$('#f-marka').addEventListener('change', (e) => { R.marka = e.target.value; renderOut(); });
$('#f-model').addEventListener('input', (e) => { R.model = e.target.value.trim(); renderOut(); });
$('#f-yil').addEventListener('change', (e) => { R.yil = e.target.value; renderOut(); });
$('#f-is').addEventListener('change', (e) => { R.is = e.target.value; renderOut(); });
function pickDay(i, focus) {
  R.gun = i; R.dilim = -1;
  $$('.day').forEach((b, k) => { b.setAttribute('aria-checked', k === i); b.tabIndex = k === i ? 0 : -1; });
  if (focus) $$('.day')[i].focus();
  renderSlots(); renderOut();
}
function pickSlot(i, focus) {
  R.dilim = i;
  $$('.slot').forEach((b, k) => { b.setAttribute('aria-checked', k === i); b.tabIndex = k === i ? 0 : -1; });
  if (focus) $$('.slot')[i].focus();
  renderOut();
}
$('.days').addEventListener('click', (e) => { const b = e.target.closest('.day'); if (b) pickDay(+b.dataset.day); });
$('.slots').addEventListener('click', (e) => { const b = e.target.closest('.slot'); if (b) pickSlot(+b.dataset.slot); });
// Radyo grubu klavyesi: ok tuşları
for (const [sel, item, fn] of [['.days', '.day', pickDay], ['.slots', '.slot', pickSlot]]) {
  $(sel).addEventListener('keydown', (e) => {
    const list = $$(item, $(sel));
    const i = list.indexOf(document.activeElement);
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (i < 0 || !k) return;
    e.preventDefault();
    fn((i + k + list.length) % list.length, true);
  });
}
renderOut();

// "Bu iş için randevu": iş seçilir, randevu bölümüne gidilir.
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book]');
  if (!b) return;
  R.is = b.dataset.book;
  $('#f-is').value = R.is;
  renderOut();
  const t = $('#randevu');
  if (lenis) lenis.scrollTo(t, { offset: -topH(), duration: 1.2 });
  else t.scrollIntoView();
  if (!reducedMotion) gsap.fromTo('#f-is', { boxShadow: '0 0 0 0 rgba(232,176,74,.0)' }, { boxShadow: '0 0 0 6px rgba(232,176,74,.35)', duration: 0.4, yoyo: true, repeat: 1, delay: 1.1, clearProps: 'boxShadow' });
});
const topH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;

// =========================================================================================
// Açılış sahnesi
// =========================================================================================
const canvas = $('#gl');
const stageEl = $('.hero__stage');
const sc = createScene(canvas, { quality: pickQuality() });
const S = sc.S;
const wideShift = () => (innerWidth >= 900 ? [-0.2, 0] : [0, 0.2]);
[S.sx, S.sy] = wideShift();
const fit = () => { sc.resize(stageEl.clientWidth, stageEl.clientHeight); [S.sx, S.sy] = wideShift(); sc.invalidate(); };
new ResizeObserver(fit).observe(stageEl);
fit();

let heroOn = true;   // künye ekranda mı (değilse çizim durur)
let intro = null;
new IntersectionObserver((es) => {
  heroOn = es[0].isIntersecting;
  document.documentElement.classList.toggle('hero-off', !heroOn);
  if (heroOn) sc.invalidate();
}, { threshold: 0 }).observe($('.hero__in'));
gsap.ticker.add(() => {
  if (!heroOn || document.hidden) return;
  if (intro && intro.isActive()) sc.invalidate();
  sc.frame();
});

sc.ready.then(() => {
  stageEl.classList.add('is-ready');
  if (reducedMotion) {
    Object.assign(S, SHOTS.open, { hood: 1, lamp: 1, shaft: 0.7, sweep: 0.6 });
    sc.invalidate();
    return;
  }
  // Tek sahne: kaput kalkar, lamba yanar, ışık süzmesi aracın üstünden geçer (toplam 1,8 sn).
  intro = gsap.timeline({ onUpdate: sc.invalidate })
    .to(S, { hood: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
    .to(S, { lamp: 1, duration: 0.6, ease: 'power2.out' }, 0.45)
    .to(S, { shaft: 1, duration: 0.5, ease: 'power2.out' }, 0)
    .fromTo(S, { sweep: 0 }, { sweep: 0.62, duration: 1.8, ease: 'power2.inOut' }, 0)
    .to(S, { ...camOf(SHOTS.open), duration: 1.6, ease: 'expo.out' }, 0.15)
    .to(S, { shaft: 0.7, duration: 0.6, ease: 'power2.inOut' }, 1.2);
  const skip = () => intro.progress(1);
  addEventListener('pointerdown', skip, { once: true, capture: true });
  addEventListener('keydown', skip, { once: true });
  addEventListener('wheel', skip, { once: true, passive: true });
  // Kaydırınca (künye ekrandayken) kamera motora doğru yavaşça yaklaşır.
  ScrollTrigger.create({
    trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: 0.8,
    onUpdate: (s) => {
      if (intro.isActive()) return;
      const p = s.progress;
      const a = SHOTS.open, b = SHOTS.push;
      for (const k of Object.keys(a)) S[k] = a[k] + (b[k] - a[k]) * p;
      sc.invalidate();
    },
  });
}).catch(() => stageEl.classList.add('is-failed'));
function camOf(o) { const { lx, ly, lz, az, el, dist } = o; return { lx, ly, lz, az, el, dist }; }

// =========================================================================================
// Kaydırma hareketi
// =========================================================================================
const lenis = initSmoothScroll({ lerp: 0.085 });
const topEl = $('#top');
if (phone.matches) autoHideHeader(topEl, { offset: 120 });
addEventListener('scroll', () => topEl.classList.toggle('is-solid', scrollY > 30), { passive: true });

// Yapışkan dizin: okunan hizmet ve grup dizinde işaretlenir.
const idxLinks = Object.fromEntries($$('.idx__s').map((a) => [a.dataset.i, a]));
const grpLinks = $$('.idx__grp, .idx-bar a');
const spy = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    const i = e.target.dataset.i;
    const g = e.target.closest('.grp').dataset.g;
    for (const a of Object.values(idxLinks)) a.classList.toggle('is-on', a.dataset.i === i);
    for (const l of grpLinks) l.classList.toggle('is-on', l.dataset.g === g);
    const bar = $('.idx-bar a.is-on');
    if (bar && narrow.matches) bar.parentElement.scrollTo({ left: bar.offsetLeft - 16, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}, { rootMargin: '-42% 0px -52% 0px' });
$$('.ent').forEach((el) => spy.observe(el));

// Telefonda dizin çubuğu hizmetler boyunca tek üst öğedir: üst başlık o sırada çekilir.
ScrollTrigger.create({
  trigger: '.svc__body', start: 'top 80px', end: 'bottom 120px',
  onToggle: (s) => document.documentElement.classList.toggle('in-index', s.isActive && narrow.matches),
});

function motion() {
  if (reducedMotion) return;
  // Künye: satırlar lamba yanarken sırayla gelir.
  gsap.from('.hero__in > *', { y: 26, autoAlpha: 0, duration: 1.0, stagger: 0.08, ease: 'expo.out', delay: 0.35, clearProps: 'all' });
  // Hero sahnesi yavaş paralaksla geride kalır.
  gsap.to('.hero__stage', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: 0.6 } });

  // Grup fotoğrafları: girişte ölçekten açılır, içinde yavaş paralaks.
  for (const f of $$('.grp__fig, .about__fig, .gal__frame')) {
    const img = $('img', f);
    gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    gsap.from(f, { scale: 0.94, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%', once: true } });
  }
  const up = (sel, trig, extra = {}) => gsap.from(sel, { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: trig, start: 'top 82%', once: true }, ...extra });
  for (const t of $$('.grp__title')) up(t, t);
  $$('.ent').forEach((e) => gsap.from(e, { y: 20, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: e, start: 'top 88%', once: true } }));
  // Başlıklar: harf aralığı değil, yalnız yükselip gelir; her bölümde farklı bir ikincil giriş.
  for (const h of $$('.h2')) gsap.from(h, { yPercent: 40, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
  // Periyodik: çizgiler soldan çizilir, satırlar arkasından gelir.
  gsap.from('.row__line', { scaleX: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.plan__rows', start: 'top 80%', once: true } });
  up('.row > :not(.row__line)', '.plan__rows', { stagger: 0.03 });
  up('.step, .book__out', '.book__grid', { stagger: 0.08 });
  gsap.from('.flow__step', { x: 36, autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: '.flow__list', start: 'top 82%', once: true } });
  up('.facts > div, .stats > div', '.about__grid', { stagger: 0.05 });
  up('.rev__lead', '.rev__lead');
  up('.rev__item', '.rev__list');
  up('.qa', '.faq__list', { stagger: 0.05, y: 0 });
  up('.contact__in > *', '#iletisim', { stagger: 0.07 });
}

document.fonts.ready.then(() => {
  motion();
  ScrollTrigger.refresh();
});
addEventListener('load', () => ScrollTrigger.refresh());
