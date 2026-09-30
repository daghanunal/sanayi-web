import '../../shared/base.css';
import './style.css';
import ortak from '../../data/bakim.json';
import ozel from '../../data/lift.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons,
} from '../../shared/core.js';
import { pickQuality } from '../../shared/lib3d.js';
import { createStage, NOKTALAR } from './stage.js';

// Lift: etkileşimli 3D. Künyenin yanında döner tablada bir araç durur; yana sürükleyince döner,
// üstündeki noktalara dokununca kamera o parçaya gider ve yanında hizmet kartı açılır. Kartta
// belirtiler seçilir, seçilenler "Şikâyet listesi"nde toplanır ve WhatsApp mesajı olarak hazırlanır.
// Geri kalan her şey düz site bölümüdür.

const d = boot({ ...ortak, ...ozel });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = Math.max(1, yil - d.isletme.kurulus);
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const grupAd = Object.fromEntries(d.gruplar.map((g) => [g.id, g.ad]));
const ODAK = Object.fromEntries(d.odaklar.map((o) => [o.id, o]));
const parcaOdak = {};
for (const o of d.odaklar) for (const p of o.parcalar) parcaOdak[p] = o.id;
const hizmetlerOf = (id) => d.hizmetler.filter((h) => ODAK[id]?.parcalar.includes(h.parca));
if (reducedMotion) document.documentElement.classList.add('rm');

// Kapanışa kalan süre (bugün açıksa): "2 saat 10 dakika"
function kalan(saatler, now = new Date()) {
  const s = saatler[now.getDay()];
  if (!s) return '';
  const [a, k] = s.split('-').map((x) => x.split(':').map(Number));
  const m = now.getHours() * 60 + now.getMinutes();
  const ac = a[0] * 60 + a[1], kapa = k[0] * 60 + k[1];
  if (m < ac || m >= kapa) return '';
  const r = kapa - m;
  const sa = Math.floor(r / 60), dk = r % 60;
  return [sa ? `${sa} saat` : '', dk ? `${dk} dakika` : ''].filter(Boolean).join(' ');
}

// --- İkonlar ----------------------------------------------------------------------------
const mark = `<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="21" rx="12" ry="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="11" r="4" fill="currentColor"/><path d="M16 15v6" stroke="currentColor" stroke-width="2"/></svg>`;
const ico = {
  left: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>`,
  right: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  drag: `<svg viewBox="0 0 32 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h20M10 4 6 8l4 4M22 4l4 4-4 4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
};

// --- Üst çubuk -----------------------------------------------------------------------------
$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#hizmetler">Hizmetler</a><a href="#periyodik">Periyodik bakım</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__list" href="#liste" hidden><span>Liste</span><b class="top__count">0</b></a>
  <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye + sahne -------------------------------------------------------------------------
const words = (s) => esc(s).split(/\s+/).map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
const noktaIds = Object.keys(NOKTALAR);

$('#kunye').innerHTML = `
  <div class="hero__kunye">
    <h1 class="hero__title" id="hero-title">${words(d.isletme.ad)}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="live ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--lime" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="stage" id="stage">
    <div class="stage__head">
      <h2 class="stage__title" id="stage-title">Parça ve hizmet</h2>
      <p class="stage__sub">Araç yana sürüklenince döner. Noktaya dokununca ilgili hizmet ve belirtiler açılır.</p>
    </div>
    <div class="view" id="view" tabindex="0" role="group" aria-labelledby="stage-title" aria-describedby="view-help">
      <p class="sr-only" id="view-help">Sol ve sağ ok tuşlarıyla araç çevrilir. Parçalar aşağıdaki düğmelerle de seçilir.</p>
      <canvas class="view__gl" id="gl" aria-hidden="true"></canvas>
      <div class="view__load" aria-hidden="true"><i></i></div>
      <div class="spots" id="spots">
        ${noktaIds.map((id, i) => `
          <button class="spot" type="button" data-odak="${id}" aria-label="${esc(ODAK[id].ad)}: hizmeti aç" tabindex="-1">
            <span class="spot__dot"><b>${i + 1}</b></span><span class="spot__label">${esc(ODAK[id].ad)}</span>
          </button>`).join('')}
      </div>
      <p class="view__hint" aria-hidden="true">${ico.drag}<span>Sürükleyin</span></p>
      <div class="view__turn">
        <button class="round" type="button" data-turn="-1" aria-label="Aracı sola çevir">${ico.left}</button>
        <button class="round" type="button" data-turn="1" aria-label="Aracı sağa çevir">${ico.right}</button>
      </div>
      <aside class="card" id="card" aria-live="polite" aria-labelledby="card-title"></aside>
    </div>
    <div class="chips" role="toolbar" aria-label="Parça seç">
      ${d.odaklar.map((o) => `<button class="chip" type="button" data-odak="${o.id}" aria-pressed="false"><span>${esc(o.ad)}</span><b class="chip__n" hidden>0</b></button>`).join('')}
    </div>
    <div class="tray" id="liste" aria-labelledby="tray-title">
      <div class="tray__head">
        <h3 class="tray__title" id="tray-title">Şikâyet listesi</h3>
        <p class="tray__count mono" aria-live="polite"><span>0</span> belirti</p>
      </div>
      <p class="tray__empty">Seçilen belirtiler burada toplanır ve WhatsApp mesajı olarak hazırlanır.</p>
      <ul class="tray__items"></ul>
      <div class="tray__form" hidden>
        <label class="field"><span>Araç ve kilometre (isteğe bağlı)</span><input type="text" id="arac" autocomplete="off" inputmode="text" placeholder="Örnek: 2016 Fiat Egea, 120.000 km" /></label>
        <a class="btn btn--lime tray__send" id="send" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
      </div>
    </div>
  </div>`;

// --- Hizmetler (grup sekmeleri) --------------------------------------------------------------
const grupSvc = d.gruplar.map((g) => ({ ...g, list: d.hizmetler.filter((h) => h.grup === g.id) }));
let no = 0;
$('#hizmetler').innerHTML = `
  <div class="sec__in">
    <header class="sec__head">
      <h2 class="h2" id="svcs-title"><span class="mask"><span>Hizmetler</span></span></h2>
      <p class="sec__sub">Dört grupta ${d.hizmetler.length} hizmet. Süreler yaklaşıktır, araca göre değişir. Fiyat ve randevu için arayın.</p>
    </header>
    <div class="svcs__body">
      <div class="tabs" role="tablist" aria-label="Hizmet grupları">
        ${grupSvc.map((g, i) => `<button class="tab" role="tab" type="button" id="tab-${g.id}" aria-controls="grp-${g.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span>${esc(g.ad)}</span><b class="mono">${g.list.length}</b></button>`).join('')}
      </div>
      <div class="panels">
        ${grupSvc.map((g, i) => `
          <div class="panel ${i === 0 ? 'is-on' : ''}" role="tabpanel" id="grp-${g.id}" aria-labelledby="tab-${g.id}" tabindex="0">
            ${g.list.map((h) => {
              no += 1;
              const od = parcaOdak[h.parca];
              return `
              <article class="svc">
                <p class="svc__no mono">${String(no).padStart(2, '0')}</p>
                <h3 class="svc__title">${esc(h.baslik)}</h3>
                <p class="svc__kisa mono">${esc(h.kisa)}</p>
                <p class="svc__text">${esc(h.aciklama)}</p>
                <div class="svc__foot">
                  ${h.sure ? `<p class="svc__time">Süre <b>${esc(h.sure)}</b></p>` : '<p class="svc__time"></p>'}
                  ${od ? `<button class="svc__show" type="button" data-show="${od}"><i></i><span>Araçta göster</span></button>` : ''}
                </div>
              </article>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </div>
  </div>`;

// --- Periyodik bakım ------------------------------------------------------------------------
$('#periyodik').innerHTML = `
  <div class="sec__in">
    <header class="sec__head">
      <h2 class="h2" id="plan-title"><span class="mask"><span>Periyodik bakım</span></span></h2>
      <p class="sec__sub">${esc(d.periyodik.not)}</p>
    </header>
    <div class="plan__wrap">
      <div class="plan__bar" aria-hidden="true"><i></i></div>
      <ol class="plan__list">
        ${d.periyodik.adimlar.map((a) => `
          <li class="stop">
            <span class="stop__pin" aria-hidden="true"></span>
            <p class="stop__km">${esc(a.aralik)}</p>
            <ul class="stop__jobs">${a.isler.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </li>`).join('')}
      </ol>
    </div>
    <div class="plan__act">
      <button class="btn btn--lime" type="button" data-add="genel|Periyodik bakım zamanı geldi">${ico.plus}<span>Periyodik bakımı listeye ekle</span></button>
      <p class="plan__note">Seçilenler künyenin altındaki şikâyet listesine eklenir.</p>
    </div>
  </div>`;

// --- Çalışma sırası -------------------------------------------------------------------------
$('#surec').innerHTML = `
  <div class="sec__in">
    <header class="sec__head">
      <h2 class="h2" id="flow-title"><span class="mask"><span>Çalışma sırası</span></span></h2>
    </header>
    <ol class="flow__list">
      ${d.surec.map((s, i) => `
        <li class="step"><p class="step__no mono">${i + 1}</p><h3 class="step__title">${esc(s.baslik)}</h3><p class="step__text">${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında -------------------------------------------------------------------------------
$('#hakkinda').innerHTML = `
  <div class="sec__in about__grid">
    <div class="about__main">
      <h2 class="h2" id="about-title"><span class="mask"><span>Hakkında</span></span></h2>
      <p class="about__text">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="stats">
        <div class="stat"><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><span class="stat__num">${yas}</span><span class="stat__unit mono">yıl</span></dd></div>
        <div class="stat"><dt>haftada açık</dt><dd><span class="stat__num">${acikGun}</span><span class="stat__unit mono">gün</span></dd></div>
      </dl>
    </div>
    <dl class="facts">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div class="facts__brands"><dt class="mono">Bakım yapılan markalar</dt><dd><ul class="brands">${d.markalar.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></dd></div>` : ''}
    </dl>
  </div>`;

// --- Saatler ve konum -----------------------------------------------------------------------
const bugunIdx = new Date().getDay();
const kalanMetin = kalan(d.saatler);
const gunSira = [1, 2, 3, 4, 5, 6, 0];
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
$('#saatler').innerHTML = `
  <div class="sec__in shop__grid">
    <div class="shop__info">
      <h2 class="h2" id="shop-title"><span class="mask"><span>Çalışma saatleri ve konum</span></span></h2>
      <p class="shop__status ${st.open ? 'is-open' : ''}"><i></i><span>${esc(st.metin)}</span></p>
      ${kalanMetin ? `<p class="shop__left mono">Kapanmasına ${esc(kalanMetin)} var</p>` : ''}
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>
          ${gunSira.map((g) => {
            const s = d.saatler[g];
            return `<tr class="${g === bugunIdx ? 'is-today' : ''}"><th scope="row">${GUN[g]}${g === bugunIdx ? ' <span class="mono">bugün</span>' : ''}</th><td class="mono">${s ? s.replace(/:/g, '.').replace('-', '–') : 'Kapalı'}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="shop__addr">${esc(d.iletisim.adres)}</p>
      <div class="shop__cta">
        <a class="btn btn--lime" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="shop__map" id="map" aria-label="Harita"></div>
  </div>`;

// --- Örnek yorumlar -------------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.star}</i>`).join('');
$('#yorumlar').innerHTML = `
  <div class="sec__in">
    <header class="sec__head">
      <h2 class="h2" id="reviews-title"><span class="mask"><span>Örnek yorumlar</span></span></h2>
      <p class="sec__sub">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
    <ul class="reviews__list" tabindex="0" aria-label="Örnek yorumlar">
      ${d.yorumlar.map((r) => `
        <li class="review">
          <p class="review__stars" role="img" aria-label="5 üzerinden ${r.puan}">${stars(r.puan)}</p>
          <blockquote>${esc(r.metin)}</blockquote>
          <p class="review__who"><b>${esc(r.ad)}</b><span>${esc(r.arac || '')}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ve footer ---------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="sec__in contact__in">
    <h2 class="contact__title" id="contact-title">İletişim</h2>
    <p class="contact__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="contact__cta">
      <a class="btn btn--ink btn--xl" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--inkline btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="contact__note">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__in">
    <p class="foot__brand">${mark}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a class="foot__tel" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a></p>
    <p class="foot__small">© ${yil} ${ad}. 3D görseller temsilîdir, araç belirli bir marka ya da modeli göstermez. Yorumlar örnektir.</p>
  </div>`;

// Harita yalnız yaklaşınca yüklenir
new IntersectionObserver((entries, io) => {
  if (entries.some((e) => e.isIntersecting)) {
    $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  }
}, { rootMargin: '600px' }).observe($('#map'));

// =========================================================================================
// Şikâyet listesi (etkileşimin sonucu): odak|belirti anahtarları; URL'ye yazılmaz.
// =========================================================================================
const secili = new Map(); // "fren|Frenden ses geliyor" → { odak, belirti }
const trayItems = $('.tray__items');
const aracInput = $('#arac');
const sendBtn = $('#send');

function mesaj() {
  const satir = [`Merhaba ${d.isletme.ad}, aracım için randevu almak istiyorum.`];
  const arac = aracInput.value.trim();
  if (arac) satir.push(`Araç: ${arac}`);
  if (secili.size) {
    satir.push('Şikâyetler:');
    for (const { odak, belirti } of secili.values()) satir.push(`- ${ODAK[odak].ad}: ${belirti}`);
  }
  return satir.join('\n');
}
function renderTray() {
  const n = secili.size;
  $('.tray__count span').textContent = n;
  $('.tray').classList.toggle('has-items', n > 0);
  $('.tray__empty').hidden = n > 0;
  $('.tray__form').hidden = n === 0;
  trayItems.innerHTML = [...secili.entries()].map(([k, v]) => `
    <li><span class="mono">${esc(ODAK[v.odak].ad)}</span><b>${esc(v.belirti)}</b>
      <button type="button" class="tray__x" data-del="${esc(k)}" aria-label="Listeden çıkar: ${esc(v.belirti)}">${ico.close}</button></li>`).join('');
  sendBtn.href = waHref(d, mesaj());
  const top = $('.top__list');
  top.hidden = n === 0;
  $('.top__count').textContent = n;
  for (const c of $$('.chip')) {
    const k = [...secili.values()].filter((v) => v.odak === c.dataset.odak).length;
    const b = $('.chip__n', c);
    b.hidden = !k;
    b.textContent = k;
  }
  for (const b of $$('.sym')) b.setAttribute('aria-pressed', secili.has(b.dataset.key) ? 'true' : 'false');
}
function toggle(key, on) {
  const [odak, belirti] = key.split('|');
  const want = on ?? !secili.has(key);
  if (want) secili.set(key, { odak, belirti });
  else secili.delete(key);
  renderTray();
  if (want && !reducedMotion) gsap.fromTo('.tray', { scale: 0.985 }, { scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform' });
}
aracInput.addEventListener('input', () => (sendBtn.href = waHref(d, mesaj())));
trayItems.addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (b) toggle(b.dataset.del, false);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  toggle(b.dataset.add, true);
  const note = b.parentElement.querySelector('.plan__note');
  if (note) note.textContent = 'Listeye eklendi. Listeye üst çubuktaki Liste bağlantısından ulaşılır.';
});
renderTray();

// =========================================================================================
// 3D sahne ve kart
// =========================================================================================
const view = $('#view');
const canvas = $('#gl');
const card = $('#card');
const spots = Object.fromEntries($$('.spot').map((b) => [b.dataset.odak, b]));
const turnEl = $('.view__turn');
const quality = pickQuality();
const stage = createStage({ canvas, quality, reduced: reducedMotion });
let cardOpen = null;
const wide = () => view.clientWidth >= 760 && view.clientWidth / view.clientHeight > 1.05;

function cardHTML(id) {
  const o = ODAK[id];
  const list = hizmetlerOf(id);
  const ids = d.odaklar.map((x) => x.id);
  const i = ids.indexOf(id);
  const prev = ODAK[ids[(i - 1 + ids.length) % ids.length]];
  const next = ODAK[ids[(i + 1) % ids.length]];
  return `
    <div class="card__top">
      <p class="card__where mono">${esc(o.etiket)}</p>
      <button class="card__x round round--sm" type="button" data-close aria-label="Kartı kapat">${ico.close}</button>
    </div>
    <h3 class="card__title" id="card-title">${esc(o.ad)}</h3>
    <ul class="card__svcs">
      ${list.map((h) => `<li><b>${esc(h.baslik)}</b><span>${esc(h.kisa)}${h.sure ? ` · ${esc(h.sure)}` : ''}</span></li>`).join('')}
    </ul>
    <p class="card__label mono">Belirti seçin</p>
    <div class="card__syms">
      ${o.belirtiler.map((b) => {
        const k = `${id}|${b}`;
        return `<button class="sym" type="button" data-key="${esc(k)}" aria-pressed="${secili.has(k)}"><span class="sym__i">${ico.plus}${ico.check}</span><span>${esc(b)}</span></button>`;
      }).join('')}
    </div>
    <div class="card__nav">
      <button class="card__step" type="button" data-go="${prev.id}">${ico.left}<span>${esc(prev.ad)}</span></button>
      <button class="card__step" type="button" data-go="${next.id}"><span>${esc(next.ad)}</span>${ico.right}</button>
    </div>`;
}

function shiftFor(open) {
  if (!open) return [0, 0];
  const W = view.clientWidth, H = view.clientHeight;
  if (wide()) return [Math.min(0.24, (card.offsetWidth + 32) / (2 * W)), 0];
  return [0, Math.min(0.3, (card.offsetHeight + 12) / (2 * H))];
}

function openOdak(id, { from = 'spot' } = {}) {
  if (!ODAK[id]) return;
  const first = !cardOpen;
  cardOpen = id;
  card.innerHTML = cardHTML(id);
  card.classList.add('is-open');
  view.classList.add('has-card');
  view.dataset.odak = id;
  for (const c of $$('.chip')) c.setAttribute('aria-pressed', c.dataset.odak === id ? 'true' : 'false');
  for (const [k, b] of Object.entries(spots)) b.classList.toggle('is-on', k === id);
  stage.focus(id, { shift: shiftFor(true) });
  if (!reducedMotion) {
    const dx = wide() ? 28 : 0, dy = wide() ? 0 : 24;
    gsap.fromTo(card, { autoAlpha: first ? 0 : 0.4, x: first ? dx : 0, y: first ? dy : 0 },
      { autoAlpha: 1, x: 0, y: 0, duration: first ? 0.55 : 0.35, ease: 'power3.out', clearProps: 'transform' });
    gsap.from($$('.card__svcs li, .sym', card), { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.04, ease: 'power3.out', delay: first ? 0.1 : 0, clearProps: 'all' });
  } else gsap.set(card, { autoAlpha: 1 });
  if (from === 'chip' || from === 'svc') card.focus?.({ preventScroll: true });
}
function closeCard() {
  if (!cardOpen) return;
  cardOpen = null;
  view.classList.remove('has-card');
  delete view.dataset.odak;
  for (const c of $$('.chip')) c.setAttribute('aria-pressed', 'false');
  for (const b of Object.values(spots)) b.classList.remove('is-on');
  stage.focus(null, { shift: [0, 0] });
  gsap.to(card, { autoAlpha: 0, duration: reducedMotion ? 0 : 0.25, ease: 'power2.in', onComplete: () => card.classList.remove('is-open') });
}
card.tabIndex = -1;
card.addEventListener('click', (e) => {
  const s = e.target.closest('.sym');
  if (s) return toggle(s.dataset.key);
  const g = e.target.closest('[data-go]');
  if (g) return openOdak(g.dataset.go, { from: 'chip' });
  if (e.target.closest('[data-close]')) closeCard();
});
$('.chips').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  if (cardOpen === c.dataset.odak) closeCard();
  else openOdak(c.dataset.odak, { from: 'chip' });
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && cardOpen) closeCard();
});

// --- Sürükleme: yatay = döndürme, dikey = sayfa kaydırması (touch-action: pan-y) ----------------
let drag = null;
let dragged = false;
let hinted = false;
function hideHint() {
  if (hinted) return;
  hinted = true;
  view.classList.add('is-hinted');
}
view.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || e.target.closest('.card, .view__turn')) return;
  stage.skipIntro();
  stage.fling(0);
  dragged = false;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, t: performance.now(), on: false, v: 0 };
});
view.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.on) {
    if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      drag.on = true;
      dragged = true;
      try { view.setPointerCapture(e.pointerId); } catch (_) {}
      view.classList.add('is-drag');
      hideHint();
    } else {
      if (Math.abs(dy) > 10) drag = null; // dikey hareket: sayfa kaysın
      return;
    }
  }
  const step = e.clientX - drag.lx;
  drag.lx = e.clientX;
  const k = (Math.PI * 1.3) / Math.max(320, view.clientWidth);
  stage.rotateBy(step * k);
  const now = performance.now();
  const dt = Math.max(8, now - drag.t);
  drag.t = now;
  drag.v = drag.v * 0.6 + ((step * k) / (dt / 16.67)) * 0.4;
});
const endDrag = (e) => {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  if (drag.on) {
    stage.fling(performance.now() - drag.t > 90 ? 0 : drag.v);
    view.classList.remove('is-drag');
  }
  drag = null;
};
view.addEventListener('pointerup', endDrag);
view.addEventListener('pointercancel', endDrag);
view.addEventListener('lostpointercapture', endDrag);
// Fare tekerleği sayfayı kaydırır, sahneye bir şey yapmaz (Lenis devralır).

$('#spots').addEventListener('click', (e) => {
  const b = e.target.closest('.spot');
  if (!b || dragged) return;
  hideHint();
  if (cardOpen === b.dataset.odak) closeCard();
  else openOdak(b.dataset.odak);
});
$('.view__turn').addEventListener('click', (e) => {
  const b = e.target.closest('[data-turn]');
  if (!b) return;
  hideHint();
  stage.turn(Number(b.dataset.turn) * (Math.PI / 4));
});
view.addEventListener('keydown', (e) => {
  if (e.target !== view) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    stage.turn((e.key === 'ArrowLeft' ? -1 : 1) * (Math.PI / 6));
  }
});

// --- Nokta konumları (yalnız sahne çizildiğinde güncellenir) -----------------------------------
function placeSpots() {
  const W = view.clientWidth, H = view.clientHeight;
  const vr = view.getBoundingClientRect();
  const cr = cardOpen ? card.getBoundingClientRect() : null;
  const showLabels = W >= 700;
  // Önce konumlar; sonra öncelik sırasıyla (açık nokta, yüzü kameraya dönük olan) çakışma ayıklanır.
  const items = noktaIds.map((id) => {
    const p = stage.project(id);
    const inside = p.front && p.x > 18 && p.x < W - 18 && p.y > 18 && p.y < H - 18;
    let a = inside ? Math.min(1, Math.max(0, (p.facing - 0.02) / 0.18)) : 0;
    // Kartın altında kalan nokta gizlenir (kart metni örtülmesin, nokta da yutulmasın).
    if (a && cr) {
      const x = p.x + vr.left, y = p.y + vr.top;
      if (x > cr.left - 14 && x < cr.right + 14 && y > cr.top - 14 && y < cr.bottom + 14) a = 0;
    }
    return { id, p, a, on: id === cardOpen };
  });
  const order = [...items].sort((m, n) => (n.on - m.on) || (n.p.facing - m.p.facing));
  // Sahnedeki düğmeler (çevirme okları) de engel sayılır.
  const blocks = [turnEl].filter((e) => e.offsetParent).map((e) => {
    const r = e.getBoundingClientRect();
    return { l: r.left - vr.left - 16, r: r.right - vr.left + 16, t: r.top - vr.top - 16, b: r.bottom - vr.top + 16 };
  });
  const dots = [];
  const labels = [];
  for (const it of order) {
    if (it.a <= 0) continue;
    if (blocks.some((q) => it.p.x > q.l && it.p.x < q.r && it.p.y > q.t && it.p.y < q.b)) { it.a = 0; continue; }
    if (dots.some((q) => Math.hypot(q.x - it.p.x, q.y - it.p.y) < 46)) { it.a = 0; continue; }
    dots.push({ x: it.p.x, y: it.p.y });
    const b = spots[it.id];
    it.left = it.p.x > W * 0.62;
    it.label = false;
    if (showLabels || it.on) {
      const lw = (b._lw ||= b.querySelector('.spot__label').offsetWidth || 90);
      const x0 = it.left ? it.p.x - 18 - lw : it.p.x + 18;
      const r = { l: x0, r: x0 + lw, t: it.p.y - 14, b: it.p.y + 14 };
      const hit = labels.some((q) => r.l < q.r + 6 && q.l < r.r + 6 && r.t < q.b + 4 && q.t < r.b + 4)
        || dots.some((q) => q.x > r.l - 12 && q.x < r.r + 12 && q.y > r.t - 12 && q.y < r.b + 12 && !(q.x === it.p.x && q.y === it.p.y));
      if (!hit || it.on) { labels.push(r); it.label = true; }
    }
  }
  for (const it of items) {
    const b = spots[it.id];
    b.style.transform = `translate3d(${it.p.x.toFixed(1)}px, ${it.p.y.toFixed(1)}px, 0)`;
    const vis = it.a > 0.35;
    b.style.opacity = vis ? Math.max(0.8, it.a).toFixed(2) : '0';
    if (vis !== b._vis) {
      b._vis = vis;
      b.style.visibility = vis ? 'visible' : 'hidden';
      b.tabIndex = vis ? 0 : -1;
    }
    b.classList.toggle('is-left', !!it.left);
    b.classList.toggle('has-label', !!it.label);
  }
}

// --- Boyut, görünürlük, kare döngüsü ----------------------------------------------------------
let inView = true;
new IntersectionObserver((es) => {
  inView = es[0].isIntersecting;
  if (inView) stage.invalidate();
}).observe(view);
const fit = () => {
  stage.resize(view.clientWidth, view.clientHeight);
  if (cardOpen) stage.setShift(...shiftFor(true), true);
};
new ResizeObserver(fit).observe(view);
fit();

let last = performance.now();
gsap.ticker.add(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!inView || document.hidden) return;
  if (stage.frame(dt)) placeSpots();
});

stage.ready.then(() => {
  view.classList.add('is-ready');
  stage.intro();
  if (!reducedMotion) {
    gsap.fromTo('#spots', { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.9 });
    gsap.from('.spot__dot', { scale: 0.4, duration: 0.5, ease: 'expo.out', stagger: 0.06, delay: 0.9, clearProps: 'transform' });
  }
}).catch(() => view.classList.add('is-failed'));

// "Araçta göster": sahneye çık ve parçayı aç
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-show]');
  if (!b) return;
  const target = $('#stage');
  const off = -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64) - 8;
  if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.1 });
  else target.scrollIntoView({ block: 'start' });
  openOdak(b.dataset.show, { from: 'svc' });
});

// =========================================================================================
// Hizmet sekmeleri
// =========================================================================================
const tabs = $$('.tab');
function selectTab(t, focus = false) {
  for (const x of tabs) {
    const on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    const p = document.getElementById(x.getAttribute('aria-controls'));
    p.classList.toggle('is-on', on);
    if (on && !reducedMotion) gsap.from($$('.svc', p), { autoAlpha: 0, y: 14, duration: 0.45, stagger: 0.05, ease: 'power3.out', clearProps: 'all' });
  }
  if (focus) t.focus();
  ScrollTrigger.refresh();
}
$('.tabs').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (t && t.getAttribute('aria-selected') !== 'true') selectTab(t);
});
$('.tabs').addEventListener('keydown', (e) => {
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (k) {
    e.preventDefault();
    selectTab(tabs[(i + k + tabs.length) % tabs.length], true);
  } else if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
  else if (e.key === 'End') { e.preventDefault(); selectTab(tabs.at(-1), true); }
});

// =========================================================================================
// Kaydırma hareketi
// =========================================================================================
const lenis = initSmoothScroll({ lerp: 0.1 });
const topEl = $('#top');
if (matchMedia('(max-width: 899px)').matches) autoHideHeader(topEl, { offset: 120 });
addEventListener('scroll', () => topEl.classList.toggle('is-solid', scrollY > 24), { passive: true });

function motion() {
  if (reducedMotion) {
    $$('.mask, .hero__title').forEach((e) => e.classList.add('is-in'));
    return;
  }
  // Açılış: ad kelime kelime yükselir, künye satırları sırayla gelir, sahne ölçekle açılır.
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title .w > span', { yPercent: 110, duration: 0.9, stagger: 0.07, onComplete: () => $('.hero__title').classList.add('is-in') }, 0.05)
    .from('.hero__kunye > :not(h1)', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }, 0.25)
    .from('.stage', { autoAlpha: 0, scale: 0.975, duration: 1.0, clearProps: 'transform,opacity,visibility' }, 0.15);
  // Kullanıcı dokununca açılış hemen biter.
  const skip = () => tl.progress(1);
  addEventListener('pointerdown', skip, { once: true, capture: true });
  addEventListener('keydown', skip, { once: true });

  // Bölüm başlıkları maskeden satır olarak yükselir.
  for (const h of $$('.sec .mask > span')) {
    gsap.from(h, { yPercent: 105, duration: 0.8, ease: 'expo.out', onComplete: () => h.parentElement.classList.add('is-in'), scrollTrigger: { trigger: h.closest('.sec__head, .about__main, .shop__info') || h, start: 'top 94%', once: true } });
  }
  const once = (targets, trigger, vars) => gsap.from(targets, { ...vars, scrollTrigger: { trigger, start: 'top 80%', once: true } });
  once('#hizmetler .tabs, #hizmetler .panel.is-on .svc', '#hizmetler .svcs__body', { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'all' });
  once('.step', '.flow__list', { autoAlpha: 0, x: 28, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
  once('.stat', '.stats', { autoAlpha: 0, scale: 0.94, duration: 0.6, stagger: 0.08, ease: 'expo.out', clearProps: 'all' });
  once('.facts > div', '.facts', { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'all' });
  once('.review', '.reviews__list', { autoAlpha: 0, x: 40, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
  once('.contact__in > *', '#iletisim', { autoAlpha: 0, y: 20, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'all' });
  once('.hours tr', '.hours', { autoAlpha: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out', clearProps: 'all' });
}

// Periyodik çizelge: kaydırmaya bağlı ilerleme çizgisi, geçilen durak yanar.
function planScrub() {
  const bar = $('.plan__bar i');
  const stops = $$('.stop');
  const vertical = () => getComputedStyle($('.plan__wrap')).getPropertyValue('--dir').trim() === 'v';
  const set = (p) => {
    bar.style.transform = vertical() ? `scaleY(${p})` : `scaleX(${p})`;
    stops.forEach((s, i) => s.classList.toggle('is-on', p >= (i + 0.2) / stops.length || p > 0.98));
  };
  if (reducedMotion) return set(1);
  ScrollTrigger.create({
    trigger: '.plan__wrap', start: 'top 75%', end: 'bottom 55%', scrub: 0.6,
    onUpdate: (s) => set(s.progress),
  });
  set(0);
}

document.fonts.ready.then(() => {
  motion();
  planScrub();
  ScrollTrigger.refresh();
});
addEventListener('load', () => ScrollTrigger.refresh());
