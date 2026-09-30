import '../../shared/base.css';
import './style.css';
import ortak from '../../data/bakim.json';
import ozel from '../../data/servis-defteri.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, gunDurumu, saatBicim, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

// Servis Defteri (klasik aile): aracın bakım kitapçığı gibi düzenlenmiş sayfa. WebGL yok.
// Kâğıt sayfalar, form satırları, numaralı bölümler, noktalı hizalar ve tablo. Parça görselleri
// Blender Cycles ile sabit render (temsilî). Baş etkileşim: periyodik bakım çizelgesi; kilometre,
// yakıt ve son bakımdan bu yana geçen süre seçilince sıradaki bakımın sütunu açılır, yapılacak işler
// "Bakım kaydı" fişinde listelenir ve WhatsApp mesajı hazırlanır.

gsap.registerPlugin(SplitText);
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
const L = d.levhalar;
const trLower = (s) => s.charAt(0).toLocaleLowerCase('tr') + s.slice(1);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const tick = `<svg class="tk" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.6 6.4 12 13 4.6"/></svg>`;
const bookIco = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="2.5" width="15" height="19" rx="1.5"/><path d="M8 7.5h8M8 11.5h8M8 15.5h5"/></svg>`;

const plate = (p, no, cls = '') => `
  <figure class="plate ${cls}">
    <div class="plate__frame">
      <img src="${asset(p.src)}" alt="${esc(p.alt)}" width="${p.w}" height="${p.h}" ${no === 1 ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'} />
      <i class="plate__wipe" aria-hidden="true"></i>
    </div>
    <figcaption><span class="mono">Levha ${no}</span><span>${esc(p.baslik)}, temsilî 3D görsel</span></figcaption>
  </figure>`;

const head = (no, id, baslik, alt) => `
  <header class="shead">
    <p class="shead__no mono" aria-hidden="true"><span>Bölüm</span> ${String(no).padStart(2, '0')}</p>
    <h2 class="h2" id="${id}">${baslik}</h2>
    ${alt ? `<p class="shead__sub">${alt}</p>` : ''}
    <i class="shead__rule" aria-hidden="true"></i>
  </header>`;

// --- Üst çubuk ve sayfa sekmeleri ------------------------------------------------------------

const BOLUMLER = [
  ['hizmetler', 'Hizmetler'], ['cizelge', 'Bakım çizelgesi'], ['hakkinda', 'Hakkında'],
  ['saatler', 'Saatler ve konum'], ['yorumlar', 'Yorumlar'], ['iletisim', 'İletişim'],
];
$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${bookIco}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    ${BOLUMLER.filter(([id]) => id !== 'yorumlar').map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}
  </nav>
  <p class="top__status status" data-status><i class="dot"></i><span class="l" data-long></span><span class="s" data-short></span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('#tabs').innerHTML = BOLUMLER.map(([id, t], i) =>
  `<a href="#${id}" data-tab="${id}"><span class="mono">${String(i + 1).padStart(2, '0')}</span><span>${t}</span></a>`).join('');

// --- Kapak: künye -----------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="cover__sheet">
    <div class="cover__band"><span>Künye</span><span class="mono">${d.isletme.kurulus}</span></div>
    <div class="cover__grid">
      <div class="cover__form">
        <div class="fld fld--ad"><span class="fld__l">İşletme</span><h1 class="cover__ad" id="kunye-ad">${ad}</h1><i class="rl"></i></div>
        <div class="fld"><span class="fld__l">İş</span><p class="fld__v"><span>${esc(d.isletme.tanim)}</span></p><i class="rl"></i></div>
        <div class="fld-row">
          <div class="fld"><span class="fld__l">Adres</span><p class="fld__v"><span>${esc(kisaAdres(d.iletisim.adres))}</span></p><i class="rl"></i></div>
          <div class="fld"><span class="fld__l">Bugün</span><p class="fld__v"><span class="status" data-status data-kunye><i class="dot"></i><span data-long></span></span></p><i class="rl"></i></div>
          <div class="fld"><span class="fld__l">Telefon</span><p class="fld__v"><a href="${telHref(d)}">${tel}</a></p><i class="rl"></i></div>
        </div>
        <div class="cover__actions">
          <a class="btn btn--rust" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
          <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
          <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        </div>
      </div>
      ${plate(L.kapak, 1, 'plate--cover')}
    </div>
    <i class="cover__shade" aria-hidden="true"></i>
  </div>`;

// --- 01 Hizmetler ------------------------------------------------------------------------------

const hizmetSay = d.hizmetler.length;
$('#hizmetler').innerHTML = `
  <div class="sheet__in">
    ${head(1, 'hizmetler-h', 'Hizmetler', `Dört grupta ${hizmetSay} hizmet. Süreler yaklaşıktır, araca göre değişir. Fiyat ve randevu için arayın.`)}
    <div class="chapters">
      ${d.gruplar.map((g, gi) => {
        const list = d.hizmetler.filter((h) => h.grup === g.id);
        return `
        <article class="chapter" id="grup-${esc(g.id)}" aria-labelledby="grup-${esc(g.id)}-h">
          <header class="chapter__head">
            <span class="chapter__no mono">${gi + 1}.</span>
            <h3 id="grup-${esc(g.id)}-h">${esc(g.ad)}</h3>
            <span class="chapter__n">${list.length} hizmet</span>
          </header>
          ${L[g.id] ? plate(L[g.id], gi + 2, `plate--ch plate--${esc(g.id)}`) : ''}
          <ol class="entries">
            ${list.map((h, i) => `
              <li class="entry">
                <div class="entry__line">
                  <span class="entry__no mono">${gi + 1}.${i + 1}</span>
                  <h4>${esc(h.baslik)}</h4>
                  <i class="entry__lead" aria-hidden="true"></i>
                  ${h.sure ? `<span class="entry__time mono"><span class="sr-only">Süre: </span>${esc(h.sure)}</span>` : ''}
                </div>
                <p class="entry__text">${esc(h.aciklama)}</p>
              </li>`).join('')}
          </ol>
          <a class="chapter__ask" href="${waHref(d, `Merhaba ${d.isletme.ad}, ${trLower(g.ad)} işleri için bilgi ve randevu almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${esc(g.ad)} için WhatsApp'tan yazın</span></a>
        </article>`;
      }).join('')}
    </div>
  </div>`;

// --- 02 Periyodik bakım çizelgesi (baş etkileşim) ----------------------------------------------

const C = d.cizelge;
const TUR = 120000; // çizelgenin bir turu (8 × 15 bin km)
const kolonlar = (next) => {
  const tur = Math.floor((next - 1) / TUR);
  return Array.from({ length: C.kolon }, (_, i) => tur * TUR + C.adim * (i + 1));
};
const bandMi = (r, K) => {
  const rel = ((K - 1) % TUR) + 1;
  return rel >= r.aralik[0] && rel <= r.aralik[1];
};
const dueMi = (r, K) => (r.her ? K % r.her === 0 : bandMi(r, K));

$('#cizelge').innerHTML = `
  <div class="sheet__in">
    ${head(2, 'cizelge-h', 'Periyodik bakım çizelgesi', 'Aracın kilometresi girilince sıradaki bakımın sütunu açılır, o bakımda yapılacak işler bakım kaydında listelenir.')}
    <div class="plan">
      <form class="plan__form" id="plan-form" autocomplete="off" novalidate>
        <div class="q">
          <p class="q__l"><span class="q__n mono" aria-hidden="true">1</span><label for="km">Aracın kilometresi</label></p>
          <div class="km">
            <button type="button" class="km__b" data-d="-5000" aria-label="5.000 km azalt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg></button>
            <span class="km__f"><input id="km" class="km__in mono" inputmode="numeric" enterkeyhint="done" value="42.000" aria-describedby="plan-not" /><span class="km__u">km</span></span>
            <button type="button" class="km__b" data-d="5000" aria-label="5.000 km artır"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg></button>
          </div>
        </div>
        <fieldset class="q">
          <legend class="q__l"><span class="q__n mono" aria-hidden="true">2</span>Yakıt</legend>
          <div class="seg">
            ${C.yakitlar.map((y, i) => `
              <label class="seg__o"><input type="radio" name="yakit" value="${esc(y.id)}" ${i === 0 ? 'checked' : ''} /><span><b>${esc(y.ad)}</b><small>${esc(y.alt)}</small></span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="q">
          <legend class="q__l"><span class="q__n mono" aria-hidden="true">3</span>Son bakımdan bu yana</legend>
          <div class="seg seg--3">
            ${C.sureler.map((s, i) => `
              <label class="seg__o"><input type="radio" name="sure" value="${esc(s.id)}" ${i === 0 ? 'checked' : ''} /><span><b>${esc(s.ad)}</b></span></label>`).join('')}
          </div>
        </fieldset>
      </form>

      <div class="slip" id="slip">
        <p class="slip__band"><span>Bakım kaydı</span><span class="mono" data-slip-date></span></p>
        <div class="slip__top">
          <p class="slip__l">Sıradaki bakım</p>
          <p class="slip__km mono"><b data-next>45.000</b><span>km</span></p>
          <p class="slip__left" data-left></p>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <p class="slip__h">Çizelgeye göre yapılacaklar</p>
          <ul class="slip__list" data-list></ul>
          <div class="slip__more" data-more></div>
        </div>
        <a class="btn btn--wa slip__wa" data-wa href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan randevu iste</span></a>
        <p class="slip__note" id="plan-not">Genel aralık, aracın bakım kitapçığına göre değişir.</p>
      </div>

      <div class="grid-wrap" data-lenis-prevent-touch>
        <div class="grid-scroll" tabindex="0" role="region" aria-label="Kilometre çizelgesi, yatay kaydırılır">
          <table class="grid" id="grid">
            <caption class="sr-only">Periyodik bakım çizelgesi: satırlar işler, sütunlar bin km</caption>
            <thead><tr><th scope="col" class="grid__is"><span>İş</span><small>bin km</small></th><!--kolon--></tr></thead>
            <tbody>
              ${C.satirlar.map((r) => `
                <tr data-row="${esc(r.id)}" ${r.yakit ? `data-yakit="${esc(r.yakit)}"` : ''}>
                  <th scope="row">${esc(r.is)}${r.yakit ? ` <small>(${r.yakit === 'dizel' ? 'dizel' : 'benzinli'})</small>` : ''}${r.aralik ? ` <small>(${r.aralik[0] / 1000}–${r.aralik[1] / 1000} bin km)</small>` : ''}</th>
                  ${'<td></td>'.repeat(C.kolon)}
                </tr>`).join('')}
            </tbody>
          </table>
          <i class="grid__hl" aria-hidden="true"></i>
        </div>
        <p class="grid__legend"><span><i class="mk"></i> yapılır</span><span><i class="mk mk--band"></i> bu aralıkta, kitapçıktaki km'de</span><span>Süreye bağlı: ${C.sureli.map((s) => esc(trLower(s.is))).join(' ve ')} her ${C.sureli[0].yil} yılda bir.</span></p>
      </div>
    </div>
    <p class="plan__not">${esc(d.periyodik.not)} Kilometre ya da süre, hangisi önce dolarsa bakım zamanı gelir.</p>
  </div>`;

// --- 03 Hakkında -------------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="sheet__in">
    ${head(3, 'hakkinda-h', 'Hakkında')}
    <div class="about__grid">
      <div class="about__text">
        <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
        <dl class="figs">
          <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b class="mono">${yas}</b><span>yıl</span></dd></div>
          <div><dt>Haftada açık</dt><dd><b class="mono">${acikGun}</b><span>gün</span></dd></div>
        </dl>
      </div>
      <table class="info">
        <caption class="sr-only">Servis bilgileri</caption>
        <tbody>${(d.bilgiler || []).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <h3 class="subh" id="surec-h">Çalışma sırası</h3>
    <ol class="steps" aria-labelledby="surec-h">
      ${d.surec.map((s, i) => `<li class="step"><span class="step__n mono">${i + 1}</span><h4>${esc(s.baslik)}</h4><p>${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
    ${d.markalar?.length ? `
    <h3 class="subh" id="marka-h">Bakım yapılan markalar</h3>
    <ul class="brands" aria-labelledby="marka-h">${d.markalar.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
  </div>`;

// --- 04 Çalışma saatleri ve konum -------------------------------------------------------------

const bugunNo = new Date().getDay();
$('#saatler').innerHTML = `
  <div class="sheet__in">
    ${head(4, 'saatler-h', 'Çalışma saatleri ve konum')}
    <div class="hours__grid">
      <div class="hours__info">
        <p class="status status--big" data-status><i class="dot"></i><span data-long></span></p>
        <p class="hours__left" data-kalan></p>
        <table class="week">
          <caption class="sr-only">Çalışma saatleri</caption>
          <tbody>${[1, 2, 3, 4, 5, 6, 0].map((g) => `
            <tr class="${g === bugunNo ? 'is-today' : ''}"><th scope="row">${GUNLER[g]}${g === bugunNo ? ' <small>bugün</small>' : ''}</th><td class="mono">${d.saatler[g] ? saatBicim(d.saatler[g]) : 'Kapalı'}</td></tr>`).join('')}
          </tbody>
        </table>
        <address>${esc(d.iletisim.adres)}</address>
        <div class="hours__actions">
          <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
          <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        </div>
      </div>
      <div class="map" data-map><p>Harita yükleniyor</p></div>
    </div>
  </div>`;

// --- 05 Örnek yorumlar -------------------------------------------------------------------------

const yildiz = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}${`<span class="off">${icons.star}</span>`.repeat(5 - n)}</span>`;
$('#yorumlar').innerHTML = `
  <div class="sheet__in">
    ${head(5, 'yorumlar-h', 'Örnek yorumlar', 'Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.')}
    <ul class="notes__list" tabindex="0" aria-label="Örnek yorumlar, yatay kaydırılır">
      ${d.yorumlar.map((y) => `
        <li class="note">
          <p class="note__car mono">${esc(y.arac)}</p>
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="note__who"><b>${esc(y.ad)}</b>${yildiz(y.puan)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- 06 İletişim -------------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="sheet__in">
    ${head(6, 'iletisim-h', 'İletişim', "Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.")}
    <div class="contact__grid">
      <a class="contact__tel" href="${telHref(d)}"><span class="fld__l">Telefon</span><b class="mono">${tel}</b><i class="rl"></i></a>
      <div class="contact__side">
        <a class="btn btn--wa btn--xl" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>
        <a class="btn btn--line btn--xl" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
      <dl class="contact__dl">
        <div><dt>Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
        <div><dt>Bugün</dt><dd><span class="status" data-status><i class="dot"></i><span data-long></span></span></dd></div>
      </dl>
    </div>
  </div>`;

$('#foot').innerHTML = `
  <div class="foot__in">
    <p class="foot__brand">${bookIco}<span>${ad}</span></p>
    <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. 3D görseller temsilîdir, belirli bir marka ya da modeli göstermez. Bakım aralıkları geneldir. Yorumlar örnektir.</p>
  </div>`;

// Harita yaklaşınca yüklenir.
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Açık/kapalı ve "kapanmasına ne kadar var" --------------------------------------------------

function kalanMetin(now = new Date()) {
  const s = d.saatler[now.getDay()];
  if (!s) return '';
  const [a, k] = s.split('-').map((x) => x.split(':').map(Number));
  const m = now.getHours() * 60 + now.getMinutes();
  const ac = a[0] * 60 + a[1], kapa = k[0] * 60 + k[1];
  if (m < ac || m >= kapa) return '';
  const r = kapa - m, sa = Math.floor(r / 60), dk = r % 60;
  const parca = [sa ? `${sa} saat` : '', dk ? `${dk} dakika` : ''].filter(Boolean).join(' ');
  return `Kapanmasına ${parca} var.`;
}
function refreshStatus() {
  const s = gunDurumu(d.saatler);
  $$('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    const long = el.querySelector('[data-long]');
    if (long) long.textContent = 'kunye' in el.dataset ? s.kunye : s.metin;
    const short = el.querySelector('[data-short]');
    if (short) short.textContent = s.open ? 'Açık' : 'Kapalı';
  });
  const k = $('[data-kalan]');
  if (k) { k.textContent = kalanMetin(); k.hidden = !k.textContent; }
}
refreshStatus();
setInterval(refreshStatus, 60_000);

// ===============================================================================================
// Çizelge etkileşimi
// ===============================================================================================

const kmIn = $('#km');
const grid = $('#grid');
const gridScroll = $('.grid-scroll');
const hl = $('.grid__hl');
const slip = $('#slip');
const listEl = $('[data-list]', slip);
const moreEl = $('[data-more]', slip);
const nextEl = $('[data-next]', slip);
const leftEl = $('[data-left]', slip);
const waEl = $('[data-wa]', slip);
$('[data-slip-date]', slip).textContent = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const state = { km: 42000, yakit: C.yakitlar[0].id, sure: C.sureler[0].id, cols: [] };
let shownNext = 45000;

function hesapla({ km, yakit, sure }) {
  const next = Math.max(C.adim, Math.ceil(km / C.adim) * C.adim);
  const rows = C.satirlar.filter((r) => !r.yakit || r.yakit === yakit);
  let due = rows.filter((r) => r.her && next % r.her === 0);
  const ids = new Set(due.map((r) => r.id));
  due = due.filter((r) => !(r.yerine && ids.has(r.yerine)));
  const pencere = rows.filter((r) => r.aralik && next >= r.aralik[0]);
  const sureli = sure === '2' ? C.sureli : [];
  return { next, kalan: next - km, due, pencere, sureli };
}

function buildColumns(next) {
  const cols = kolonlar(next);
  if (cols[0] === state.cols[0]) return false;
  state.cols = cols;
  const headRow = grid.tHead.rows[0];
  while (headRow.cells.length > 1) headRow.deleteCell(1);
  cols.forEach((K) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.innerHTML = `<button type="button" class="grid__col mono" data-km="${K}" aria-label="${fmt(K)} km bakımını göster">${K / 1000}</button>`;
    headRow.append(th);
  });
  for (const tr of grid.tBodies[0].rows) {
    const r = C.satirlar.find((x) => x.id === tr.dataset.row);
    [...tr.cells].slice(1).forEach((td, i) => {
      const K = cols[i];
      const band = r.aralik && bandMi(r, K);
      const prev = r.aralik && i > 0 && bandMi(r, cols[i - 1]);
      const nxt = r.aralik && i < cols.length - 1 && bandMi(r, cols[i + 1]);
      td.className = band ? `c-band${prev ? '' : ' c-band--s'}${nxt ? '' : ' c-band--e'}` : dueMi(r, K) ? 'c-due' : '';
      td.innerHTML = band ? '<i class="mk mk--band"></i>' : dueMi(r, K) ? `<i class="mk"></i>${tick}` : '';
      if (td.className) td.insertAdjacentHTML('afterbegin', `<span class="sr-only">${fmt(K)} km: ${band ? 'bu aralıkta' : 'yapılır'}</span>`);
    });
  }
  return true;
}

function placeHighlight(animate) {
  const i = state.cols.indexOf(hesapla(state).next);
  const th = grid.tHead.rows[0].cells[i + 1];
  if (!th) return;
  const x = th.offsetLeft, w = th.offsetWidth;
  const h = grid.offsetHeight;
  gsap.to(hl, { x, width: w, height: h, autoAlpha: 1, duration: animate && !reducedMotion ? 0.45 : 0, ease: 'power3.inOut', overwrite: true });
  $$('.grid__col', grid).forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
  [...grid.rows].forEach((tr) => [...tr.cells].forEach((c, j) => c.classList.toggle('is-on', j === i + 1)));
  // Telefonda seçilen sütun görünür kalsın (tablo yatay kayar; sayfa kaymaz).
  const sw = gridScroll.clientWidth, first = grid.rows[0].cells[0].offsetWidth;
  if (x < gridScroll.scrollLeft + first || x + w > gridScroll.scrollLeft + sw) {
    gridScroll.scrollTo({ left: Math.max(0, x - first - 8), behavior: reducedMotion || !animate ? 'auto' : 'smooth' });
  }
}

// "Triger seti ve devirdaim pompası, şanzıman yağı"
const liste = (rows) => rows.map((x, i) => (i ? trLower(x.is) : x.is)).join(', ');

function yakitAd(id) { return C.yakitlar.find((y) => y.id === id); }

function render(animate = true) {
  const r = hesapla(state);
  const rebuilt = buildColumns(r.next);
  grid.dataset.yakit = state.yakit;
  // Başlıktaki sıradaki bakım kilometresi
  if (animate && !reducedMotion && shownNext !== r.next) {
    const o = { v: shownNext };
    gsap.to(o, { v: r.next, duration: 0.45, ease: 'power3.out', onUpdate: () => (nextEl.textContent = fmt(Math.round(o.v / 1000) * 1000)) });
  } else nextEl.textContent = fmt(r.next);
  shownNext = r.next;
  const sureAsildi = state.sure !== '0';
  leftEl.textContent = [
    r.kalan === 0 ? 'Bakım kilometresi geldi' : `${fmt(r.kalan)} km kaldı`,
    sureAsildi ? 'süre doldu, bakım zamanı geldi' : '',
  ].filter(Boolean).join(' · ');
  leftEl.classList.toggle('is-due', r.kalan === 0 || sureAsildi);

  const items = [...r.due.map((x) => x.is), ...r.sureli.map((x) => x.is)];
  listEl.innerHTML = items.map((t) => `<li>${tick}<span>${esc(t)}</span></li>`).join('');
  const more = [];
  if (r.pencere.length) more.push(`<p><b>${esc(liste(r.pencere))}</b> ${r.pencere[0].aralik[0] / 1000}–${r.pencere[0].aralik[1] / 1000} bin km arasında, kitapçıkta yazan kilometrede değişir. Daha önce değiştiyse kayda bakılır.</p>`);
  if (state.sure === '2') more.push('<p>Son bakımın üzerinden iki yıldan fazla geçtiği için fren hidroliği ve antifriz de listeye eklendi.</p>');
  else if (state.sure === '1') more.push('<p>Son bakımın üzerinden bir yıldan fazla geçti; kilometre dolmasa da yıllık bakım zamanı gelmiş sayılır.</p>');
  moreEl.innerHTML = more.join('');

  const y = yakitAd(state.yakit);
  const sureCumle = { 0: '', 1: 'Son bakımın üzerinden 1–2 yıl geçti.', 2: 'Son bakımın üzerinden 2 yıldan fazla geçti.' }[state.sure];
  const msg = [
    `Merhaba ${d.isletme.ad}, aracım ${fmt(state.km)} km'de, ${y.mesaj}. ${fmt(r.next)} km periyodik bakımı için randevu almak istiyorum.`,
    sureCumle,
    items.length ? `Çizelgeye göre yapılacaklar: ${items.map(trLower).join(', ')}.` : '',
    r.pencere.length ? `${liste(r.pencere)} için de bilgi almak istiyorum.` : '',
  ].filter(Boolean).join('\n');
  waEl.href = waHref(d, msg);

  placeHighlight(animate && !rebuilt);
  if (animate && !reducedMotion) {
    gsap.fromTo($$('li', listEl), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power3.out', overwrite: true });
    gsap.fromTo($$('li .tk path', listEl), { strokeDashoffset: 18 }, { strokeDashoffset: 0, duration: 0.35, stagger: 0.04, delay: 0.08, ease: 'power2.out' });
    const onTicks = $$('td.is-on.c-due .tk path', grid);
    gsap.fromTo(onTicks, { strokeDashoffset: 18 }, { strokeDashoffset: 0, duration: 0.3, stagger: 0.035, delay: 0.2, ease: 'power2.out' });
  }
}

let kmTimer = 0;
function setKm(v, from) {
  state.km = Math.min(999999, Math.max(0, Math.round(Number(v) || 0)));
  if (from !== 'input') kmIn.value = fmt(state.km);
  clearTimeout(kmTimer);
  kmTimer = setTimeout(() => render(true), from === 'input' ? 140 : 0);
}
kmIn.addEventListener('input', () => {
  const digits = kmIn.value.replace(/\D/g, '').slice(0, 6);
  setKm(digits, 'input');
});
kmIn.addEventListener('focus', () => kmIn.select());
kmIn.addEventListener('blur', () => (kmIn.value = fmt(state.km)));
kmIn.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    setKm(state.km + (e.key === 'ArrowUp' ? 5000 : -5000));
  }
  if (e.key === 'Enter') { e.preventDefault(); kmIn.blur(); }
});
$('#plan-form').addEventListener('submit', (e) => e.preventDefault());
$$('.km__b').forEach((b) => b.addEventListener('click', () => setKm(state.km + Number(b.dataset.d))));
$$('input[name="yakit"]').forEach((i) => i.addEventListener('change', () => { state.yakit = i.value; render(true); }));
$$('input[name="sure"]').forEach((i) => i.addEventListener('change', () => { state.sure = i.value; render(true); }));
grid.addEventListener('click', (e) => {
  const b = e.target.closest('.grid__col');
  if (b) setKm(Number(b.dataset.km));
});
render(false);
let rt = 0;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => placeHighlight(false), 150); }, { passive: true });
document.fonts?.ready.then(() => placeHighlight(false));

// ===============================================================================================
// Hareket
// ===============================================================================================

initSmoothScroll();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader($('#top'), { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Sayfa sekmeleri: görünen bölüm işaretlenir.
const tabs = new Map($$('#tabs a').map((a) => [a.dataset.tab, a]));
const seen = new Map();
const tabIo = new IntersectionObserver((entries) => {
  for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
  let best = null, bestR = 0;
  for (const [id, r] of seen) if (r > bestR) { best = id; bestR = r; }
  tabs.forEach((a, id) => (id === best && bestR > 0 ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
}, { threshold: [0, 0.15, 0.3, 0.5, 0.7] });
['kunye', ...tabs.keys()].forEach((id) => tabIo.observe(document.getElementById(id)));

// Başlık satırları için maske içinde yükselen satırlar (İ noktası kesilmesin diye maskede üst pay var).
// Bölme animasyon bitince geri alınır; ekran dönünce satırlar yeniden akar.
const splits = [];
function lines(el) {
  const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
  s.masks?.forEach((m) => m.classList.add('ln-mask'));
  splits.push(s);
  return s.lines;
}
const unsplit = (el) => () => splits.filter((s) => el.contains(s.elements?.[0] ?? null) || s.elements?.[0] === el).forEach((s) => s.revert());

if (!reducedMotion) {
  // --- Açılış: form satırları çizilir, alanlar yazılır, levha açılır. ≤ 1,6 sn, dokununca biter.
  const cover = $('#kunye');
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => unsplit($('.cover__ad'))() });
  intro
    .from($$('.rl', cover), { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, stagger: 0.06, ease: 'expo.out' }, 0)
    .from($$('.fld__l, .cover__band > *', cover), { autoAlpha: 0, y: 6, duration: 0.4, stagger: 0.04 }, 0.08)
    .from(lines($('.cover__ad', cover)), { yPercent: 105, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.12)
    .from($$('.fld__v > *', cover), { y: 12, autoAlpha: 0, duration: 0.6, stagger: 0.07 }, 0.34)
    .from($$('.cover__actions .btn', cover), { y: 14, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 0.62)
    .fromTo($('.plate--cover .plate__wipe', cover), { scaleY: 1 }, { scaleY: 0, transformOrigin: '50% 0%', duration: 1.1, ease: 'expo.inOut' }, 0.15)
    .from($('.plate--cover img', cover), { scale: 1.08, duration: 1.4, ease: 'expo.out' }, 0.3)
    .from($('.plate--cover figcaption', cover), { autoAlpha: 0, y: 6, duration: 0.4 }, 1.0);
  const skip = () => { if (intro.progress() < 1) intro.progress(1); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, skip, { once: true, passive: true }));

  // --- Kaydırmaya bağlı sakin an: kapak geri çekilir, ilk sayfa üstüne kayar.
  gsap.to('.cover__sheet', {
    scale: 0.955, yPercent: 5, ease: 'none',
    scrollTrigger: { trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
  gsap.fromTo('.cover__shade', { autoAlpha: 0 }, {
    autoAlpha: 1, ease: 'none',
    scrollTrigger: { trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });

  // --- Bölüm başlıkları: çizgi çekilir, başlık satırları yükselir.
  $$('.shead').forEach((h) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 82%', once: true }, onComplete: () => unsplit($('.h2', h))() });
    tl.from($('.shead__rule', h), { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, ease: 'expo.out' }, 0)
      .from($('.shead__no', h), { autoAlpha: 0, x: -8, duration: 0.4, ease: 'power3.out' }, 0.05)
      .from(lines($('.h2', h)), { yPercent: 105, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.08);
    const sub = $('.shead__sub', h);
    if (sub) tl.from(sub, { autoAlpha: 0, y: 10, duration: 0.5, ease: 'power3.out' }, 0.3);
  });

  // --- Hizmetler: noktalı hizalar soldan dolar; levhalar perde gibi açılır, hafif paralaks.
  $$('.chapter').forEach((ch) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: ch, start: 'top 80%', once: true } });
    const entries = $$('.entry', ch);
    tl.from($('.chapter__head', ch), { autoAlpha: 0, y: 12, duration: 0.5, ease: 'power3.out' }, 0);
    const wipe = $('.plate__wipe', ch);
    if (wipe) {
      tl.fromTo(wipe, { scaleX: 1 }, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.9, ease: 'expo.inOut' }, 0.05)
        .from($('.plate img', ch), { scale: 1.06, duration: 1.1, ease: 'expo.out' }, 0.2);
    }
    tl.from(entries, { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.15)
      .from($$('.entry__lead', ch), { scaleX: 0, transformOrigin: '0 50%', duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.3);
    const img = $('.plate img', ch);
    if (img) {
      gsap.fromTo($('.plate__frame', ch).firstElementChild, { yPercent: -3 }, {
        yPercent: 3, ease: 'none', scrollTrigger: { trigger: ch, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      });
    }
  });

  // --- Çizelge: işaretler sütun sütun belirir (toplam ≤ 600 ms), fiş yukarıdan yazılır.
  ScrollTrigger.create({
    trigger: '#grid', start: 'top 80%', once: true,
    onEnter: () => {
      gsap.from($$('#grid td .mk'), {
        scale: 0, duration: 0.3, ease: 'back.out(2)',
        stagger: { each: 0.012, grid: [C.satirlar.length, C.kolon], from: 'start', axis: 'x' },
      });
      gsap.from(hl, { autoAlpha: 0, duration: 0.5, delay: 0.4 });
    },
  });
  gsap.from('.plan__form .q', { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.plan', start: 'top 80%', once: true } });
  gsap.from('.slip', { autoAlpha: 0, y: 24, rotation: -0.6, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: '.slip', start: 'top 85%', once: true } });

  // --- Hakkında: rakamlar yükselir, çalışma sırası çizgisi çekilir, marka hücreleri ızgara hâlinde.
  gsap.from('.figs b', { yPercent: 100, autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.figs', start: 'top 85%', once: true } });
  gsap.from('.info tr', { autoAlpha: 0, x: 16, duration: 0.5, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.info', start: 'top 85%', once: true } });
  const steps = gsap.timeline({ scrollTrigger: { trigger: '.steps', start: 'top 82%', once: true } });
  steps.from('.steps', { '--line': 0, duration: 1.0, ease: 'power2.inOut' }, 0)
    .from('.step', { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 0.1);
  gsap.from('.brands li', { autoAlpha: 0, scale: 0.94, duration: 0.4, stagger: { each: 0.035, grid: 'auto', from: 'start' }, ease: 'power3.out', scrollTrigger: { trigger: '.brands', start: 'top 88%', once: true } });

  // --- Saatler: bugünün satırı işaretlenir.
  gsap.from('.week tr', { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: '.week', start: 'top 85%', once: true } });
  gsap.from('.week .is-today', { '--mark': 0, duration: 0.6, delay: 0.35, ease: 'expo.out', scrollTrigger: { trigger: '.week', start: 'top 85%', once: true } });

  // --- Yorumlar: notlar sağdan gelir. İletişim: numara satırı yükselir.
  gsap.from('.note', { autoAlpha: 0, x: 40, duration: 0.6, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.notes__list', start: 'top 85%', once: true } });
  gsap.from('.contact__tel b', { yPercent: 60, autoAlpha: 0, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '.contact__grid', start: 'top 85%', once: true } });
  gsap.from('.contact__tel .rl', { scaleX: 0, transformOrigin: '0 50%', duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.contact__grid', start: 'top 85%', once: true } });
}

// Görseller ve yazı tipleri gelince tetikleyici konumları yenilenir.
addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
