import '../../shared/base.css';
import './style.css';
import ortak from '../../data/bakim.json';
import ozel from '../../data/pano.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, gunDurumu, saatBicim, saatListesi, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { Flip } from 'gsap/Flip';

// Pano (klasik aile): fotoğraf ağırlıklı dergi düzeni. WebGL yok.
// Baş etkileşim iki parçalı: (1) araç seçimi (marka listesi bakim.json'dan, yıl, isteğe bağlı model):
// seçilince sayfa o araca göre konuşur (başlıklar, mesajlar, marka notu, aynı markanın yorumu öne gelir);
// (2) hizmet panosu: dört grup kartına dokununca kart fotoğrafı ayrıntı yayılımına taşınır (paylaşılan öğe
// geçişi), hizmetler "Randevu listesi"ne eklenir ve liste araçla birlikte WhatsApp mesajı olarak hazırlanır.

gsap.registerPlugin(Flip);
const d = boot({ ...ortak, ...ozel });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = Math.max(1, yil - d.isletme.kurulus);
const acikGun = acikGunSayisi(d.saatler);
const trLower = (s) => s.charAt(0).toLocaleLowerCase('tr') + s.slice(1);
const img = (p, { cls = '', lazy = true, sizes = '' } = {}) =>
  `<img class="${cls}" src="${asset(p.src)}" alt="${esc(p.alt)}" width="${p.w}" height="${p.h}" ${lazy ? 'loading="lazy" decoding="async"' : 'fetchpriority="high"'} ${sizes} />`;
const ico = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
};
const kicker = (t) => `<p class="kicker">${t}</p>`;

// --- Araç durumu (URL'ye yazılmaz) ------------------------------------------------------------
const arac = { marka: '', yil: '', model: '' };
const DIGER = d.arac.diger;
const aracAd = () => {
  const marka = arac.marka === DIGER ? '' : arac.marka;
  return [arac.yil, marka, arac.model.trim()].filter(Boolean).join(' ');
};
const icin = (bos = 'aracım') => (aracAd() ? `${aracAd()} için` : `${bos} için`);

// --- Üst çubuk --------------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#periyodik">Periyodik bakım</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__list" href="#liste" data-list-pill hidden>${ico.list}<span>Liste</span><b data-count>0</b></a>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ------------------------------------------------------------------------------------

const K = d.kapak;
$('#kunye').innerHTML = `
  <div class="hero__copy">
    <p class="kicker kicker--hero"><span>${esc(d.isletme.tanim)}</span></p>
    <h1 class="hero__ad" id="kunye-ad">${ad}</h1>
    <dl class="hero__facts">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="status" data-status data-kunye><i class="dot"></i><span data-long></span></dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--ink" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--green" data-wa-genel href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <figure class="hero__photo">
    <div class="hero__frame">
      <picture>
        <source media="(max-width: 899px)" srcset="${asset(K.srcM)}" width="${K.wM}" height="${K.hM}" />
        <img src="${asset(K.src)}" alt="${esc(K.alt)}" width="${K.w}" height="${K.h}" fetchpriority="high" />
      </picture>
    </div>
    <figcaption>${esc(K.baslik)}</figcaption>
  </figure>`;

// --- Hizmetler: araç seçimi + pano + liste -----------------------------------------------------

const G = d.gruplar.map((g) => ({ ...g, list: d.hizmetler.filter((h) => h.grup === g.id) }));
const yillar = Array.from({ length: yil - d.arac.enEskiYil + 1 }, (_, i) => yil - i);
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sh">
      ${kicker('Pano')}
      <h2 class="h2" id="hizmetler-h">Hizmetler</h2>
      <p class="sh__sub" data-board-sub></p>
    </header>

    <div class="picker" id="arac">
      <div class="picker__head">
        <p class="picker__t">Araç seçimi</p>
        <p class="picker__sum" data-arac-sum aria-live="polite"></p>
      </div>
      <fieldset class="picker__brands">
        <legend class="picker__l"><span class="picker__n">1</span>Marka</legend>
        <div class="chips">
          ${[...d.markalar, DIGER].map((m) => `<label class="chip"><input type="radio" name="marka" value="${esc(m)}" /><span>${esc(m)}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="picker__row">
        <label class="fx"><span class="picker__l"><span class="picker__n">2</span>Yıl</span>
          <select id="yil"><option value="">Seçilmedi</option>${yillar.map((y) => `<option>${y}</option>`).join('')}</select>
        </label>
        <label class="fx"><span class="picker__l"><span class="picker__n">3</span><span data-model-l>Model</span> <small>isteğe bağlı</small></span>
          <input id="model" type="text" maxlength="32" autocomplete="off" enterkeyhint="done" placeholder="Örnek: Egea" />
        </label>
        <button type="button" class="btn btn--ghost picker__clear" data-clear hidden>Temizle</button>
      </div>
      <p class="picker__note" data-marka-not aria-live="polite"></p>
    </div>

    <div class="board" id="board">
      ${G.map((g, i) => `
        <article class="tile tile--${i}" data-g="${esc(g.id)}">
          <button type="button" class="tile__btn" aria-expanded="false" aria-controls="spread">
            <span class="tile__img">${img(d.grupGorsel[g.id])}</span>
            <span class="tile__txt">
              <span class="tile__n">${g.list.length} hizmet</span>
              <span class="tile__h">${esc(g.ad)}</span>
              <span class="tile__list">${g.list.map((h) => esc(h.baslik)).join(' · ')}</span>
            </span>
            <span class="tile__plus" aria-hidden="true">${ico.plus}</span>
            <span class="tile__sel" aria-hidden="true" data-tile-count></span>
          </button>
        </article>`).join('')}
    </div>

    <aside class="list" id="liste" aria-labelledby="liste-h">
      <div class="list__head">
        ${kicker('Seçilen hizmetler')}
        <h3 class="list__h" id="liste-h" data-list-h>Randevu listesi</h3>
        <p class="list__car" data-list-car></p>
      </div>
      <div class="list__body">
        <ul class="list__items" data-items aria-live="polite"></ul>
        <p class="list__empty" data-empty>Panodaki gruplardan eklenen hizmetler burada toplanır ve WhatsApp mesajı olarak hazırlanır.</p>
        <div class="list__act">
          <a class="btn btn--green btn--xl" data-list-wa href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
          <button type="button" class="btn btn--ghost" data-list-clear hidden>Listeyi temizle</button>
        </div>
        <p class="list__note">Mesaj WhatsApp'ta açılır, göndermeden önce değiştirilebilir. Fiyat ve randevu için arayın.</p>
      </div>
    </aside>
  </div>`;

// Ayrıntı yayılımı (tek öğe; açılan kartın satırının altına taşınır)
const spread = document.createElement('section');
spread.className = 'spread';
spread.id = 'spread';
spread.hidden = true;
spread.setAttribute('aria-labelledby', 'spread-h');
$('#board').append(spread);

// --- Periyodik bakım ----------------------------------------------------------------------------

$('#periyodik').innerHTML = `
  <div class="wrap">
    <header class="sh sh--row">
      ${kicker('Aralıklar')}
      <h2 class="h2" id="periyodik-h">Periyodik bakım</h2>
      <p class="sh__sub">${esc(d.periyodik.not)} Bakım randevuyla yapılır.</p>
    </header>
    <ol class="per">
      ${d.periyodik.adimlar.map((a) => `
        <li class="per__row">
          <p class="per__km">${esc(a.aralik)}</p>
          <ul class="per__is">${a.isler.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Çalışma sırası -------------------------------------------------------------------------------

$('#surec').innerHTML = `
  <div class="wrap surec">
    <figure class="surec__photo">${img(d.surecGorsel)}</figure>
    <div class="surec__txt">
      <header class="sh">
        ${kicker('Serviste')}
        <h2 class="h2" id="surec-h">Çalışma sırası</h2>
      </header>
      <ol class="steps">
        ${d.surec.map((s, i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`).join('')}
      </ol>
    </div>
  </div>`;

// --- Hakkında -----------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="wrap about">
    <figure class="about__photo">${img(d.hakkindaGorsel)}</figure>
    <div class="about__txt">
      <header class="sh">
        ${kicker('Servis')}
        <h2 class="h2" id="hakkinda-h">Hakkında</h2>
      </header>
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="nums">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div><dt>Haftada açık</dt><dd><b>${acikGun}</b> gün</dd></div>
      </dl>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      <h3 class="about__h" id="marka-h">Bakım yapılan markalar</h3>
      <ul class="brands" aria-labelledby="marka-h">${d.markalar.map((m) => `<li data-marka="${esc(m)}">${esc(m)}</li>`).join('')}</ul>
    </div>
  </div>`;

// --- Galeri ---------------------------------------------------------------------------------------

$('#galeri').innerHTML = `
  <div class="wrap">
    <header class="sh sh--row">
      ${kicker('Fotoğraflar')}
      <h2 class="h2" id="galeri-h">Galeri</h2>
      <p class="sh__sub">Fotoğraflar temsilîdir.</p>
    </header>
  </div>
  <div class="strip" tabindex="0" role="region" aria-label="Galeri, yatay kaydırılır">
    <ul class="strip__track">
      ${d.galeri.map((g) => `<li class="shot ${g.h > g.w ? 'shot--tall' : ''}"><figure>${img(g)}<figcaption>${esc(g.baslik)}</figcaption></figure></li>`).join('')}
    </ul>
  </div>`;

// --- Çalışma saatleri ve konum ------------------------------------------------------------------

const bugun = new Date().getDay();
$('#saatler').innerHTML = `
  <div class="wrap hours">
    <div class="hours__txt">
      <header class="sh">
        ${kicker('Açık saatler')}
        <h2 class="h2" id="saatler-h">Çalışma saatleri ve konum</h2>
      </header>
      <div class="today">
        <p class="today__day">${GUNLER[bugun]}</p>
        <p class="today__h">${d.saatler[bugun] ? saatBicim(d.saatler[bugun]) : 'Kapalı'}</p>
        <p class="status" data-status><i class="dot"></i><span data-long></span></p>
        <p class="today__left" data-kalan hidden></p>
      </div>
      <table class="week">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([g, s]) => `<tr><th scope="row">${g}</th><td>${s}</td></tr>`).join('')}</tbody>
      </table>
      <address>${esc(d.iletisim.adres)}</address>
      <div class="hours__cta">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p>Harita yükleniyor</p></div>
  </div>`;

// --- Örnek yorumlar -----------------------------------------------------------------------------

const yildiz = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}${`<span class="off">${icons.star}</span>`.repeat(5 - n)}</span>`;
function renderYorumlar() {
  const m = arac.marka && arac.marka !== DIGER ? arac.marka.toLocaleLowerCase('tr') : '';
  const ayni = (y) => m && y.arac.toLocaleLowerCase('tr').includes(m);
  const list = [...d.yorumlar].sort((a, b) => ayni(b) - ayni(a));
  const [bas, ...diger] = list;
  const tag = (y) => (ayni(y) ? '<span class="rev__tag">Aynı marka</span>' : '');
  $('[data-rev]').innerHTML = `
    <figure class="pull">
      <blockquote><p>${esc(bas.metin)}</p></blockquote>
      <figcaption>${tag(bas)}<b>${esc(bas.ad)}</b><span>${esc(bas.arac)}</span>${yildiz(bas.puan)}</figcaption>
    </figure>
    <ul class="revs" tabindex="0" aria-label="Diğer örnek yorumlar">
      ${diger.map((y) => `<li class="rev">${tag(y)}<blockquote>${esc(y.metin)}</blockquote><p class="rev__who"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>${yildiz(y.puan)}</li>`).join('')}
    </ul>`;
}
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="sh sh--row">
      ${kicker('Araç sahipleri')}
      <h2 class="h2" id="yorumlar-h">Örnek yorumlar</h2>
      <p class="sh__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
    <div data-rev></div>
  </div>`;
renderYorumlar();

// --- İletişim -----------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="wrap contact">
    <header class="sh">
      ${kicker('Randevu ve bilgi')}
      <h2 class="h2" id="iletisim-h">İletişim</h2>
      <p class="sh__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    </header>
    <a class="contact__tel" href="${telHref(d)}">${tel}</a>
    <div class="contact__cta">
      <a class="btn btn--light btn--xl" data-wa-genel href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>
      <a class="btn btn--line-l btn--xl" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
    <dl class="contact__dl">
      <div><dt>Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
      <div><dt>Bugün</dt><dd class="status" data-status><i class="dot"></i><span data-long></span></dd></div>
      <div><dt>Araç</dt><dd data-contact-car>Seçilmedi. <a href="#arac">Araç seçimi</a></dd></div>
    </dl>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <p class="foot__brand">${ad}</p>
    <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Açık/kapalı ----------------------------------------------------------------------------------

function kalanMetin(now = new Date()) {
  const s = d.saatler[now.getDay()];
  if (!s) return '';
  const [a, k] = s.split('-').map((x) => x.split(':').map(Number));
  const m = now.getHours() * 60 + now.getMinutes();
  const ac = a[0] * 60 + a[1], kapa = k[0] * 60 + k[1];
  if (m < ac || m >= kapa) return '';
  const r = kapa - m, sa = Math.floor(r / 60), dk = r % 60;
  return `Kapanmasına ${[sa ? `${sa} saat` : '', dk ? `${dk} dakika` : ''].filter(Boolean).join(' ')} var.`;
}
function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
  });
  const k = $('[data-kalan]');
  k.textContent = kalanMetin();
  k.hidden = !k.textContent;
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// =================================================================================================
// Etkileşim: araç seçimi
// =================================================================================================

const secili = new Map(); // hizmet başlığı → grup id (sırayla)

function aracGuncelle() {
  const a = aracAd();
  const n = d.hizmetler.length;
  $('[data-board-sub]').textContent = `${a ? `${a} için dört grupta` : 'Dört grupta'} ${n} hizmet. Bir gruba dokununca o grubun hizmetleri açılır. Süreler yaklaşıktır, araca göre değişir. Fiyat ve randevu için arayın.`;
  $('[data-arac-sum]').innerHTML = a
    ? `Seçilen araç: <b>${esc(a)}</b>`
    : 'Marka ve yıl seçilince sayfadaki başlıklar ve WhatsApp mesajları bu araca göre hazırlanır.';
  $('[data-clear]').hidden = !(arac.marka || arac.yil || arac.model);
  $('[data-model-l]').textContent = arac.marka === DIGER ? 'Marka ve model' : 'Model';
  const not = $('[data-marka-not]');
  if (arac.marka && arac.marka !== DIGER) not.textContent = `${arac.marka}, bakım yapılan markalar arasında.`;
  else if (arac.marka === DIGER) not.textContent = 'Listede olmayan markalar için telefonla bilgi alınabilir.';
  else not.textContent = '';
  $$('.brands li').forEach((li) => li.classList.toggle('is-on', li.dataset.marka === arac.marka));
  $('[data-contact-car]').innerHTML = a ? esc(a) : 'Seçilmedi. <a href="#arac">Araç seçimi</a>';
  // Genel WhatsApp bağlantıları (künye, iletişim, alt çubuk) araçla birlikte
  const genel = waHref(d, `Merhaba ${d.isletme.ad}, ${icin()} bilgi almak istiyorum.`);
  $$('[data-wa-genel]').forEach((el) => (el.href = genel));
  const barWa = $('.action-bar a[href*="wa.me"]');
  if (barWa) barWa.href = genel;
  renderYorumlar();
  listeGuncelle();
  if (acik) spreadBaslik();
}

$$('input[name="marka"]').forEach((r) => r.addEventListener('change', () => { arac.marka = r.value; aracGuncelle(); }));
$('#yil').addEventListener('change', (e) => { arac.yil = e.target.value; aracGuncelle(); });
let mt = 0;
$('#model').addEventListener('input', (e) => { clearTimeout(mt); mt = setTimeout(() => { arac.model = e.target.value.replace(/[<>]/g, ''); aracGuncelle(); }, 160); });
$('#model').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('[data-clear]').addEventListener('click', () => {
  arac.marka = arac.yil = arac.model = '';
  $$('input[name="marka"]').forEach((r) => (r.checked = false));
  $('#yil').value = '';
  $('#model').value = '';
  aracGuncelle();
});

// =================================================================================================
// Etkileşim: pano ve randevu listesi
// =================================================================================================

const board = $('#board');
const tiles = $$('.tile', board);
let acik = null; // açık grup id
const cols = () => (matchMedia('(min-width: 700px)').matches ? 2 : 1);

function spreadIcerik(g) {
  const gi = d.grupGorsel[g.id];
  spread.innerHTML = `
    <figure class="spread__img">${img(gi, { lazy: false })}</figure>
    <div class="spread__body">
      <div class="spread__top">
        <p class="kicker" data-spread-k></p>
        <button type="button" class="spread__x" data-close aria-label="${esc(g.ad)} grubunu kapat">${ico.close}</button>
      </div>
      <h3 class="spread__h" id="spread-h" tabindex="-1">${esc(g.ad)}</h3>
      <ul class="svc">
        ${g.list.map((h) => `
          <li class="svc__i">
            <div class="svc__t">
              <h4>${esc(h.baslik)}</h4>
              <p>${esc(h.aciklama)}</p>
              ${h.sure ? `<span class="svc__sure">Yaklaşık ${esc(h.sure)}</span>` : ''}
            </div>
            <button type="button" class="add" data-add="${esc(h.baslik)}" data-g="${esc(g.id)}" aria-pressed="false">
              <span class="add__i">${ico.plus}${ico.check}</span><span class="add__t">Listeye ekle</span>
            </button>
          </li>`).join('')}
      </ul>
      <div class="spread__foot">
        <a class="btn btn--line" href="#liste">${ico.list}<span>Randevu listesi</span></a>
        <a class="btn btn--ghost" data-spread-wa target="_blank" rel="noopener">${icons.whatsapp}<span>Bu grup için sor</span></a>
      </div>
    </div>`;
  spreadBaslik();
  syncAdd();
}
function spreadBaslik() {
  const g = G.find((x) => x.id === acik);
  if (!g) return;
  $('[data-spread-k]', spread).textContent = `${g.list.length} hizmet${aracAd() ? ` · ${aracAd()}` : ''}`;
  $('[data-spread-wa]', spread).href = waHref(d, `Merhaba ${d.isletme.ad}, ${icin()} ${trLower(g.ad)} işleri hakkında bilgi almak istiyorum.`);
}
function syncAdd() {
  $$('.add', spread).forEach((b) => {
    const on = secili.has(b.dataset.add);
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.add__t').textContent = on ? 'Listede' : 'Listeye ekle';
  });
  tiles.forEach((t) => {
    const n = [...secili.values()].filter((g) => g === t.dataset.g).length;
    const el = $('[data-tile-count]', t);
    el.textContent = n ? `${n} seçili` : '';
    el.classList.toggle('is-on', n > 0);
  });
}

// Yayılım, açılan kartın satırının sonuna yerleşir (masaüstünde 2 sütun, telefonda kartın hemen altı).
function yerlestir(tile) {
  const i = tiles.indexOf(tile);
  const c = cols();
  const son = tiles[Math.min(tiles.length - 1, Math.floor(i / c) * c + c - 1)];
  son.after(spread);
  spread.dataset.col = String(i % c);
}

function ac(tile, { focus = true } = {}) {
  const g = G.find((x) => x.id === tile.dataset.g);
  const kapaliydi = !acik;
  const fromImg = $('.tile__img img', tile);
  fromImg.dataset.flipId = 'foto';
  const state = reducedMotion ? null : Flip.getState([...tiles, fromImg]);
  delete fromImg.dataset.flipId;
  tiles.forEach((t) => {
    const on = t === tile;
    t.classList.toggle('is-open', on);
    $('.tile__btn', t).setAttribute('aria-expanded', String(on));
  });
  acik = g.id;
  spreadIcerik(g);
  yerlestir(tile);
  spread.hidden = false;
  if (state) {
    // Paylaşılan öğe: kartın fotoğrafı yayılımdaki yerine uçar; diğer kartlar yalnız kayar.
    const toImg = $('.spread__img img', spread);
    toImg.dataset.flipId = 'foto';
    Flip.from(state, {
      targets: [...tiles, toImg], duration: 0.6, ease: 'power3.inOut', scale: true, zIndex: 5,
      onComplete: () => delete toImg.dataset.flipId,
    });
    gsap.fromTo($$('.spread__top, .spread__h, .svc__i, .spread__foot', spread), { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, delay: kapaliydi ? 0.2 : 0.1, ease: 'power3.out', clearProps: 'transform' });
  }
  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
    const r = spread.getBoundingClientRect();
    const hh = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 60;
    if (r.top < hh || r.top > innerHeight * 0.55) {
      const y = scrollY + r.top - hh - 12;
      lenis ? lenis.scrollTo(y, { duration: 0.9 }) : scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    if (focus) $('#spread-h')?.focus({ preventScroll: true });
  });
}

function kapat({ returnFocus = true } = {}) {
  if (!acik) return;
  const tile = tiles.find((t) => t.dataset.g === acik);
  const done = () => {
    const state = Flip.getState(tiles);
    spread.hidden = true;
    spread.innerHTML = '';
    tiles.forEach((t) => { t.classList.remove('is-open'); $('.tile__btn', t).setAttribute('aria-expanded', 'false'); });
    acik = null;
    if (!reducedMotion) Flip.from(state, { targets: tiles, duration: 0.45, ease: 'power3.inOut', simple: true });
    ScrollTrigger.refresh();
    if (returnFocus) $('.tile__btn', tile)?.focus({ preventScroll: true });
  };
  if (reducedMotion) return done();
  gsap.to(spread, { autoAlpha: 0, duration: 0.18, ease: 'power2.in', onComplete: () => { gsap.set(spread, { clearProps: 'opacity,visibility' }); done(); } });
}

board.addEventListener('click', (e) => {
  const btn = e.target.closest('.tile__btn');
  if (btn) {
    const tile = btn.closest('.tile');
    if (acik === tile.dataset.g) kapat();
    else ac(tile);
    return;
  }
  if (e.target.closest('[data-close]')) return kapat();
  const add = e.target.closest('.add');
  if (add) {
    const key = add.dataset.add;
    if (secili.has(key)) secili.delete(key);
    else secili.set(key, add.dataset.g);
    syncAdd();
    listeGuncelle(true);
    if (!reducedMotion && secili.has(key)) {
      gsap.fromTo($('.add__i', add), { scale: 0.6 }, { scale: 1, duration: 0.3, ease: 'back.out(2.4)' });
    }
  }
});
spread.addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });
let lastCols = cols();
addEventListener('resize', () => {
  if (cols() !== lastCols && acik) yerlestir(tiles.find((t) => t.dataset.g === acik));
  lastCols = cols();
}, { passive: true });

// Randevu listesi (sonuç): sayfada görünür bir kart + başlıktaki sayaç.
function listeGuncelle(bump = false) {
  const items = [...secili.entries()];
  const a = aracAd();
  $('[data-list-h]').textContent = a ? `${a} için randevu listesi` : 'Randevu listesi';
  $('[data-list-car]').innerHTML = a ? '' : 'Araç seçilmedi. <a href="#arac">Araç seçimi</a> yapılırsa mesaja eklenir.';
  const ul = $('[data-items]');
  ul.innerHTML = items.map(([t, g]) => `
    <li><span class="list__g">${esc(G.find((x) => x.id === g).ad)}</span><b>${esc(t)}</b>
      <button type="button" class="list__x" data-del="${esc(t)}" aria-label="Listeden çıkar: ${esc(t)}">${ico.close}</button></li>`).join('');
  $('[data-empty]').hidden = items.length > 0;
  $('[data-list-clear]').hidden = items.length === 0;
  const satir = [`Merhaba ${d.isletme.ad}, ${icin()} randevu almak istiyorum.`];
  if (items.length) {
    satir.push('İstenen işler:');
    for (const [t] of items) satir.push(`- ${t}`);
  }
  $('[data-list-wa]').href = waHref(d, satir.join('\n'));
  const pill = $('[data-list-pill]');
  pill.hidden = items.length === 0;
  $('[data-count]', pill).textContent = String(items.length);
  if (bump && !reducedMotion && items.length) gsap.fromTo(pill, { scale: 1.12 }, { scale: 1, duration: 0.3, ease: 'power3.out' });
}
$('[data-items]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  secili.delete(b.dataset.del);
  syncAdd();
  listeGuncelle();
});
$('[data-list-clear]').addEventListener('click', () => { secili.clear(); syncAdd(); listeGuncelle(); });

// =================================================================================================
// Hareket
// =================================================================================================

const lenis = initSmoothScroll();
aracGuncelle();

const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader($('#top'), { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Başlıkları sözcüklere böler (bir kez); sözcükler hafif yükselerek gelir.
function words(el) {
  const parts = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = parts.map((w) => `<span class="w" aria-hidden="true">${esc(w)}</span>`).join(' ');
  return $$('.w', el);
}

if (!reducedMotion) {
  // --- Açılış: fotoğraf çerçevesi genişleyerek açılır, ad sözcük sözcük gelir. ≤ 1,5 sn, dokununca biter.
  const hero = $('#kunye');
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from($('.hero__frame', hero), { scale: 0.86, duration: 1.4 }, 0)
    .from($('.hero__frame img', hero), { scale: 1.28, duration: 1.5 }, 0)
    .from($('.kicker--hero span', hero), { yPercent: 110, duration: 0.7, ease: 'power3.out' }, 0.1)
    .from(words($('.hero__ad', hero)), { yPercent: 40, autoAlpha: 0, duration: 0.9, stagger: 0.06 }, 0.15)
    .from($$('.hero__facts > div', hero), { x: -18, autoAlpha: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out' }, 0.4)
    .from($$('.hero__cta .btn', hero), { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.55)
    .from($('.hero__photo figcaption', hero), { autoAlpha: 0, duration: 0.4 }, 1.0);
  const skip = () => { if (intro.progress() < 1) intro.progress(1); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, skip, { once: true, passive: true }));

  // --- Kaydırmaya bağlı sakin an: kapak fotoğrafı çerçevesinde yavaşça kayar.
  gsap.fromTo($('.hero__frame img', hero), { yPercent: 0 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 },
  });

  // --- Bölüm başlıkları: etiket çizgisi uzar, başlık sözcükleri gelir.
  $$('.sh').forEach((h) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 84%', once: true } });
    tl.from($('.kicker', h), { autoAlpha: 0, x: -12, duration: 0.45, ease: 'power3.out' }, 0)
      .from(words($('.h2', h)), { yPercent: 40, autoAlpha: 0, duration: 0.7, stagger: 0.05, ease: 'expo.out' }, 0.05);
    const sub = $('.sh__sub', h);
    if (sub) tl.from(sub, { autoAlpha: 0, y: 10, duration: 0.5, ease: 'power3.out' }, 0.25);
  });

  // --- Araç seçimi ve pano: çipler dalga gibi, kartlar ölçekle girer (fotoğraf içeriden yaklaşır).
  gsap.from('.picker', { autoAlpha: 0, y: 24, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: '.picker', start: 'top 85%', once: true } });
  gsap.from('.chip', { autoAlpha: 0, y: 10, duration: 0.4, stagger: { each: 0.03, from: 'start' }, ease: 'power3.out', scrollTrigger: { trigger: '.chips', start: 'top 88%', once: true } });
  tiles.forEach((t, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: t, start: 'top 88%', once: true } });
    tl.from(t, { autoAlpha: 0, y: 30, scale: 0.97, duration: 0.7, ease: 'expo.out', delay: (i % 2) * 0.08, clearProps: 'transform' })
      .from($('.tile__img img', t), { scale: 1.14, duration: 1.1, ease: 'expo.out', clearProps: 'transform' }, 0)
      .from($$('.tile__txt > *', t), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.2);
  });
  gsap.from('.list', { autoAlpha: 0, y: 24, duration: 0.6, ease: 'expo.out', scrollTrigger: { trigger: '.list', start: 'top 88%', once: true } });

  // --- Periyodik: çizgi uzar, satır soldan gelir.
  $$('.per__row').forEach((r) => {
    gsap.timeline({ scrollTrigger: { trigger: r, start: 'top 88%', once: true } })
      .from(r, { '--rule': 0, duration: 0.8, ease: 'expo.out' }, 0)
      .from($('.per__km', r), { x: -20, autoAlpha: 0, duration: 0.55, ease: 'power3.out' }, 0.05)
      .from($$('.per__is li', r), { x: -12, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out' }, 0.12);
  });

  // --- Süreç, hakkında: fotoğraflar maske içinde yükselir.
  $$('.surec__photo, .about__photo').forEach((f) => {
    gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 85%', once: true } })
      .from(f, { yPercent: 8, autoAlpha: 0, duration: 0.9, ease: 'expo.out' }, 0)
      .from($('img', f), { scale: 1.12, duration: 1.3, ease: 'expo.out' }, 0);
  });
  gsap.from('.nums b', { yPercent: 50, autoAlpha: 0, duration: 0.7, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.nums', start: 'top 88%', once: true } });
  gsap.from('.facts > div', { autoAlpha: 0, y: 12, duration: 0.45, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: '.facts', start: 'top 88%', once: true } });
  gsap.from('.brands li', { autoAlpha: 0, scale: 0.9, duration: 0.35, stagger: 0.03, ease: 'power3.out', scrollTrigger: { trigger: '.brands', start: 'top 90%', once: true } });

  // --- Galeri: geniş ekranda şerit kaydırmayla sakin biçimde sola akar (pin yok).
  const mqWide = matchMedia('(min-width: 900px)');
  const track = $('.strip__track');
  gsap.matchMedia().add('(min-width: 900px)', () => {
    const tw = gsap.to(track, {
      x: () => -Math.max(0, track.scrollWidth - innerWidth + 48), ease: 'none',
      scrollTrigger: { trigger: '.strip', start: 'top bottom', end: 'bottom top', scrub: 0.9, invalidateOnRefresh: true },
    });
    return () => tw.kill();
  });
  if (!mqWide.matches) gsap.from('.shot', { autoAlpha: 0, x: 30, duration: 0.6, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.strip', start: 'top 88%', once: true } });

  // --- Saatler, yorumlar, iletişim
  gsap.from('.today > *', { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.today', start: 'top 88%', once: true } });
  gsap.from('.week tr', { autoAlpha: 0, duration: 0.4, stagger: 0.05, scrollTrigger: { trigger: '.week', start: 'top 90%', once: true } });
  ScrollTrigger.create({
    trigger: '#yorumlar', start: 'top 75%', once: true,
    onEnter: () => {
      gsap.from('.pull blockquote p', { autoAlpha: 0, y: 24, duration: 0.8, ease: 'expo.out' });
      gsap.from('.rev', { autoAlpha: 0, y: 20, duration: 0.5, stagger: 0.06, delay: 0.2, ease: 'power3.out' });
    },
  });
  gsap.from('.contact__tel', { autoAlpha: 0, y: 30, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '.contact__tel', start: 'top 90%', once: true } });
}

// Süreç: ekranın ortasına gelen adım belirginleşir (kaydırmayla, geri sarılabilir; hareket CSS geçişi).
const stepIo = new IntersectionObserver((entries) => {
  for (const e of entries) e.target.classList.toggle('is-on', e.isIntersecting);
}, { rootMargin: '-40% 0px -45% 0px' });
$$('.step').forEach((s) => stepIo.observe(s));

addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
