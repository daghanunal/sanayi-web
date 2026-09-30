// Eşik (klasik aile, mimarlık ofisi): koyu çam yeşili sıva duvar, kireç beyazı, pirinç.
// Marcellus başlık + Gantari metin. Fotoğraf ağırlıklı, WebGL yok.
// Akış: künye → Hizmetler (+ çalışma sırası) → Hakkında → Çalışma saatleri ve konum → Örnek yorumlar → İletişim.
// Künyede duvarda tek bir kemerli kapı boşluğu açılışta bir kez açılır; içeride aydınlık bir oda (temsilî) görünür.
import sektor from '../../data/sektor-mimarlik.json';
import extra from '../../data/mimarlik-klasik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, asset, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, GUNLER, autoHideHeader,
} from '../../shared/core.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...sektor, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n, dig = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dig, maximumFractionDigits: dig });
// Sektör görsellerinin bu preset için küçültülmüş WebP kopyaları
const img = (src) => String(src).replace('/sektor-mimarlik/', '/mimarlik-klasik/').replace(/\.jpe?g$/, '.webp');
const waGenel = d.waMesaj || 'Merhaba, proje için görüşme randevusu almak istiyorum.';
const wa = (msg) => waHref(d, msg ?? waGenel);

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, new Date().getFullYear() - kurulus);
const st0 = gunDurumu(d.saatler);
if (d.isletme.ad.length > 15) document.documentElement.classList.add('is-long');
document.documentElement.classList.toggle('is-open', st0.open);

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta ofisin metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = wa()));

// --- Arama motoru: mimarlık ofisi (ProfessionalService) -------------------------------
$$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
const ld = $('script[type="application/ld+json"]');
if (ld) {
  const gunEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${gunEn[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  });
}
document.title = `${d.isletme.ad} | Mimarlık ofisi | Etimesgut, Ankara`;

const btn = (cls, href, ikon, label, dis) =>
  `<a class="btn ${cls}" href="${href}"${dis ? ' target="_blank" rel="noopener"' : ''}>${ikon}<span>${label}</span></a>`;
const liste = saatListesi(d.saatler);
const sira = [1, 2, 3, 4, 5, 6, 0];
const bugunG = sira.indexOf(new Date().getDay());
const bugunMu = (gunler) => {
  const [a, b] = gunler.split('–');
  const ia = sira.indexOf(GUNLER.indexOf(a));
  const ib = b ? sira.indexOf(GUNLER.indexOf(b)) : ia;
  return bugunG >= ia && bugunG <= ib;
};
const mark = '<span class="top__mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 21V9a5 5 0 0 1 10 0v12"/><path d="M3 21h18"/></svg></span>';

// --- Başlık --------------------------------------------------------------------
$('#ust').innerHTML = `
  <a href="#top" class="top__brand" aria-label="${ad}, sayfa başı">${mark}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Sayfa bölümleri">
    <a href="#hizmetler">Hizmetler</a>
    <a href="#hakkinda">Hakkında</a>
    <a href="#saatler">Saatler ve konum</a>
    <a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__call" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------
$('#kunye').innerHTML = `
  <h1 class="hero__ad" id="hero-ad">${ad}</h1>
  <p class="hero__what">${esc(d.isletme.tanim)}</p>
  <dl class="kunye">
    <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
    <div><dt>Bugün</dt><dd class="kunye__durum${st0.open ? ' is-open' : ''}">${esc(st0.kunye)}</dd></div>
    <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
  </dl>
  <div class="hero__cta">
    ${btn('btn--brass', telHref(d), icons.phone, 'Ara')}
    ${btn('btn--glass', wa(), icons.whatsapp, 'WhatsApp', true)}
    ${btn('btn--glass', mapsHref(d), icons.pin, 'Yol tarifi', true)}
  </div>`;

// Kapı boşluğu
const hero = $('.hero');
const wallSvg = $('.hero__wall');
const wallPath = $('[data-wallpath]');
const kasa = $('[data-kasa]');
const floor = $('[data-floor]');
const spill = $('[data-spill]');
const olcu = $('[data-olcu]');
let G = null;
function measure() {
  const vw = hero.clientWidth, vh = hero.clientHeight;
  const small = vw < 900;
  let h = small ? Math.min(innerHeight * 0.4, 360) : Math.min(vh * 0.62, 620);
  let w = h / 2.1;
  if (small) { w = Math.min(w, vw * 0.46); h = w * 2.1; }
  const cx = small ? vw / 2 : vw * 0.72;
  const fy = small ? vh - 40 : vh * 0.86; // zemin çizgisi = kapının altı
  G = { vw, vh, w, h, cx, fy };
  wallSvg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  olcu.style.setProperty('--dx', `${cx}px`);
  olcu.style.setProperty('--dy', `${fy + 12}px`);
  olcu.style.setProperty('--dw', `${w}px`);
}
const S = { o: reducedMotion ? 1 : 0 }; // kapının açılışı (0-1)
const f1 = (n) => n.toFixed(1);
function draw() {
  if (!G) return;
  const { vw, vh, w, h, cx, fy } = G;
  const dw = w * (0.04 + 0.96 * S.o);
  const top = fy - h, bot = fy;
  const L = cx - dw / 2, R = cx + dw / 2, r = dw / 2;
  const door = `M${f1(L)} ${f1(bot)}V${f1(top + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(R)} ${f1(top + r)}V${f1(bot)}Z`;
  wallPath.setAttribute('d', `M-2 -2H${vw + 2}V${vh + 2}H-2Z${door}`);
  kasa.setAttribute('d', door);
  floor.setAttribute('d', `M0 ${f1(bot)}H${vw}`);
  const depth = Math.min(h * 0.5, vh - bot + 40);
  spill.setAttribute('d', `M${f1(L)} ${f1(bot)}L${f1(R)} ${f1(bot)}L${f1(R + dw * 0.9)} ${f1(bot + depth)}L${f1(L - dw * 0.9)} ${f1(bot + depth)}Z`);
  spill.style.opacity = String(S.o);
  olcu.style.opacity = String(S.o);
}
measure();
draw();
let rw = innerWidth;
addEventListener('resize', () => {
  if (innerWidth < 900 && Math.abs(innerWidth - rw) < 2) return; // mobil adres çubuğu
  rw = innerWidth; measure(); draw();
});

// --- Hizmetler -------------------------------------------------------------------
$('#hizmetler').innerHTML = `
  <div class="odalar__head">
    <h2 class="h2" id="oda-h">Hizmetler</h2>
    <p class="lead">Süreler ortalamadır, projenin büyüklüğüne göre değişir. Ücret bilgisi ve görüşme randevusu için arayın.</p>
  </div>
  <ol class="odalar__list">
    ${d.hizmetler.map((h, i) => `
      <li class="oda">
        <article class="oda__card">
          <figure class="oda__img">${h.gorsel ? `<img src="${esc(img(h.gorsel))}" alt="${esc(h.gorselAlt || '')}" loading="lazy" decoding="async" /><figcaption>Temsilî</figcaption>` : ''}</figure>
          <div class="oda__body">
            <p class="oda__no"><span>${String(i + 1).padStart(2, '0')}</span></p>
            <h3 class="oda__title">${esc(h.baslik)}</h3>
            <p class="oda__desc">${esc(h.aciklama)}</p>
            ${h.sure ? `<p class="oda__sure"><span>Süre</span>${esc(h.sure)}</p>` : ''}
          </div>
        </article>
      </li>`).join('')}
  </ol>`;

// --- Çalışma sırası -------------------------------------------------------------------
$('.surec').innerHTML = `
  <div class="surec__head"><h2 class="h2" id="surec-h">Çalışma sırası</h2></div>
  <ol class="surec__list">
    ${d.surec.map((s, i) => `
      <li class="step">
        <p class="step__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</p>
        <div class="step__body">
          <h3 class="step__title">${esc(s.baslik)}</h3>
          <p class="step__text">${esc(s.aciklama)}</p>
        </div>
      </li>`).join('')}
  </ol>`;

// --- Hakkında ---------------------------------------------------------------------
const acikGun = acikGunSayisi(d.saatler);
const GAL = ['maket-ahsap', 'cizim-masasi', 'maket', 'bilgisayar'];
const galeri = GAL.map((k) => d.galeri.find((g) => g.src.includes(`/${k}.`))).filter(Boolean);
$('#hakkinda').innerHTML = `
  <div class="ofis__in">
    <figure class="ofis__photo"><img src="${asset('/img/mimarlik-klasik/santiye-plan.webp')}" alt="Şantiyede basılı projeyi birlikte inceleyen ekip (temsilî)" loading="lazy" decoding="async" width="1050" height="1400" /></figure>
    <div class="ofis__copy">
      <h2 class="h2" id="ofis-h">Hakkında</h2>
      <p class="lead">${ad} ${esc(yilEki(kurulus))} beri Etimesgut'ta. ${esc(d.isletme.hakkinda)}</p>
      <ul class="rakam__list" aria-label="Rakamlarla">
        <li class="stat"><p class="stat__val"><span data-count="${yas}">${yas}</span><small> yıl</small></p><p class="stat__lbl">Etimesgut'ta</p></li>
        <li class="stat"><p class="stat__val"><span data-count="${acikGun}">${acikGun}</span><small> gün</small></p><p class="stat__lbl">haftada açık</p></li>
      </ul>
      ${d.bilgiler?.length ? `<dl class="facts">${d.bilgiler.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    </div>
  </div>
  ${galeri.length ? `
  <div class="galeri">
    <div class="galeri__grid">
      ${galeri.map((g, i) => `<figure class="shot shot--${i}"><img src="${esc(img(g.src))}" alt="${esc(g.alt)}" loading="lazy" decoding="async" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('')}
    </div>
    <p class="galeri__note">Görseller temsilîdir; ofisin kendi projeleri görüşmede gösterilir.</p>
  </div>` : ''}`;

// --- Çalışma saatleri ve konum ---------------------------------------------------------
$('#saatler').innerHTML = `
  <div class="konum__info">
    <h2 class="h2" id="konum-h">Çalışma saatleri ve konum</h2>
    <p class="konum__status">${esc(st0.metin)}</p>
    <dl class="hours">
      ${liste.map(([g, s]) => `<div class="${bugunMu(g) ? 'is-today' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
    </dl>
    <p class="konum__addr">${esc(d.iletisim.adres)}</p>
    <div class="konum__btns">
      ${btn('btn--pine', mapsHref(d), icons.pin, 'Yol tarifi', true)}
      ${btn('btn--line', telHref(d), icons.phone, tel)}
    </div>
  </div>
  <div class="konum__map" id="map"><span>Harita</span></div>`;

// --- Örnek yorumlar ------------------------------------------------------------------
const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="yorum__head">
    <h2 class="h2" id="yorum-h">Örnek yorumlar</h2>
    <p class="yorum__not">Buradaki yorumlar örnektir, yerlerine ofisin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__list" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <li class="rev">
        <p class="rev__stars" role="img" aria-label="5 üzerinden ${Number(y.puan)}">${stars(y.puan)}</p>
        <p class="rev__text">${esc(y.metin)}</p>
        <p class="rev__who"><strong>${esc(y.ad)}</strong>${y.konu ? `<span>${esc(y.konu)}</span>` : ''}</p>
      </li>`).join('')}
  </ul>`;

// --- İletişim + ihtiyaç programı ----------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="program__head">
    <h2 class="h2" id="iletisim-h">İletişim</h2>
    <p class="lead">Görüşme randevusu için arayın ya da WhatsApp'tan yazın. Konut projelerinde oda listesi aşağıda hazırlanıp gönderilebilir.</p>
    <dl class="iletisim__list">
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      <div><dt>Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
      <div><dt>Bugün</dt><dd>${esc(st0.metin)}</dd></div>
    </dl>
    <div class="iletisim__btns">
      ${btn('btn--pine', telHref(d), icons.phone, 'Ara')}
      ${btn('btn--wa', wa(), icons.whatsapp, 'WhatsApp', true)}
    </div>
  </div>
  <div class="program__box">
    <div class="program__form">
      <h3 class="program__t">İhtiyaç programı</h3>
      <p class="program__alt">Odalar seçildikçe yaklaşık brüt alan hesaplanır.</p>
      <div class="program__chips" data-form></div>
    </div>
    <div class="program__res">
      <div class="plan" data-plan aria-hidden="true"></div>
      <dl class="program__sonuc">
        <div><dt>Net alan</dt><dd data-r="net"></dd></div>
        <div class="is-big"><dt>Brüt alan, yaklaşık</dt><dd data-r="brut"></dd></div>
      </dl>
      <p class="program__not" data-program-not></p>
      <a class="btn btn--pine program__btn" data-program-wa target="_blank" rel="noopener">${icons.whatsapp}<span>Listeyi WhatsApp'tan gönder</span></a>
    </div>
  </div>`;

// --- İhtiyaç programı ------------------------------------------------------------
const P = d.program;
const st = Object.fromEntries(P.odalar.map((o) => [o.id, o.sabit ? 1 : o.adet ?? (o.acik ? 1 : 0)]));
const formBox = $('[data-form]');
formBox.innerHTML = P.odalar.map((o) => {
  if (o.sabit) return `<div class="chip is-on is-fixed"><span class="chip__ad">${esc(o.ad)}</span><span class="chip__m">${nf(o.m2)} m²</span></div>`;
  if (o.adet != null) return `
    <div class="chip is-on is-step" data-step="${esc(o.id)}">
      <span class="chip__ad">${esc(o.ad)}</span>
      <span class="stepper">
        <button type="button" data-d="-1" aria-label="${esc(o.ad)} azalt">−</button>
        <output data-n>${st[o.id]}</output>
        <button type="button" data-d="1" aria-label="${esc(o.ad)} artır">+</button>
      </span>
    </div>`;
  return `<button type="button" class="chip${st[o.id] ? ' is-on' : ''}" data-tog="${esc(o.id)}" aria-pressed="${!!st[o.id]}"><span class="chip__ad">${esc(o.ad)}</span><span class="chip__m">${nf(o.m2)} m²</span><i aria-hidden="true"></i></button>`;
}).join('');
$('[data-program-not]').textContent = P.not;

// Kareleştirilmiş ağaç haritası: odalar alanlarıyla orantılı dikdörtgenlere yerleşir.
function squarify(items, x, y, w, h) {
  const out = [];
  const total = items.reduce((a, b) => a + b.v, 0);
  const scale = (w * h) / total;
  let rest = items.map((it) => ({ ...it, a: it.v * scale }));
  const worst = (row, side) => {
    const sum = row.reduce((a, b) => a + b.a, 0);
    const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a));
    return Math.max((side * side * mx) / (sum * sum), (sum * sum) / (side * side * mn));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) { row.push(rest[i]); i++; }
    rest = rest.slice(i);
    const sum = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) {
      const rw = sum / h; let yy = y;
      row.forEach((r) => { const rh = r.a / rw; out.push({ ...r, x, y: yy, w: rw, h: rh }); yy += rh; });
      x += rw; w -= rw;
    } else {
      const rh = sum / w; let xx = x;
      row.forEach((r) => { const rw = r.a / rh; out.push({ ...r, x: xx, y, w: rw, h: rh }); xx += rw; });
      y += rh; h -= rh;
    }
  }
  return out;
}

const plan = $('[data-plan]');
// Hücre adının sığıp sığmadığını ölçmek için (geçiş sırasında DOM ölçüsü yanıltır)
const ctx = document.createElement('canvas').getContext('2d');
const textW = (t, tiny) => {
  ctx.font = `500 ${tiny ? 12 : planW0() > 500 ? 16 : 14}px Gantari, system-ui, sans-serif`;
  return ctx.measureText(t).width;
};
const planW0 = () => plan.clientWidth || 340;
const cells = new Map();
function program() {
  const rooms = [];
  P.odalar.forEach((o) => {
    for (let k = 0; k < st[o.id]; k++) {
      const ad = o.id === 'yatak' ? (k === 0 ? 'Ebeveyn yatak odası' : `Yatak odası ${k + 1}`) : o.ad;
      const kisa = o.id === 'yatak' ? (k === 0 ? 'Ebeveyn odası' : `Yatak ${k + 1}`) : (o.kisa || o.ad);
      rooms.push({ id: `${o.id}${k}`, ad, kisa, v: o.id === 'yatak' && k === 0 ? o.m2 + 3 : o.m2 });
    }
  });
  const net = rooms.reduce((a, b) => a + b.v, 0);
  const sirk = Math.round(net * P.sirkulasyon);
  rooms.push({ id: 'sirk', ad: 'Antre, koridor, duvar', kisa: 'Koridor', v: sirk, sirk: true });
  rooms.sort((a, b) => b.v - a.v);
  const rects = squarify(rooms, 0, 0, 100, 100);
  const planW = plan.clientWidth || 340;
  const seen = new Set();
  rects.forEach((r) => {
    seen.add(r.id);
    let el = cells.get(r.id);
    if (!el) {
      el = document.createElement('div');
      el.className = `cell${r.sirk ? ' cell--sirk' : ''} is-new`;
      el.innerHTML = '<span class="cell__ad"></span><span class="cell__m"></span>';
      plan.append(el);
      cells.set(r.id, el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-new')));
    }
    // Hücrenin gerçek piksel genişliğine göre tam ad, kısa ad ya da yalnız metrekare
    const px = (r.w / 100) * planW;
    const tiny = r.w * r.h < 90 || r.w < 19 || r.h < 13;
    const fits = (t, sm) => textW(t, sm) + (sm ? 16 : planW > 500 ? 34 : 26) <= px;
    let lbl = '', sm = tiny;
    if (!tiny && fits(r.ad)) lbl = r.ad;
    else if (!tiny && fits(r.kisa)) lbl = r.kisa;
    else { sm = true; lbl = fits(r.kisa, true) ? r.kisa : ''; }
    $('.cell__ad', el).textContent = lbl;
    $('.cell__m', el).textContent = px < 44 ? `${nf(r.v)}` : `${nf(r.v)} m²`;
    el.title = `${r.ad}, ${nf(r.v)} m²`;
    el.classList.toggle('is-tiny', sm);
    Object.assign(el.style, { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` });
  });
  cells.forEach((el, id) => { if (!seen.has(id)) { el.remove(); cells.delete(id); } });
  const brut = Math.round((net + sirk) / 5) * 5;
  $('[data-r="net"]').textContent = `${nf(net)} m²`;
  const brutEl = $('[data-r="brut"]');
  if (!reducedMotion && brutEl.dataset.v) {
    const o = { v: Number(brutEl.dataset.v) };
    gsap.to(o, { v: brut, duration: 0.5, ease: 'power2.out', onUpdate: () => (brutEl.textContent = `≈ ${nf(o.v)} m²`) });
  } else brutEl.textContent = `≈ ${nf(brut)} m²`;
  brutEl.dataset.v = brut;
  const liste = P.odalar.filter((o) => st[o.id]).map((o) => (o.adet != null ? `${st[o.id]} ${o.ad.toLocaleLowerCase('tr')}` : o.ad.toLocaleLowerCase('tr'))).join(', ');
  $('[data-program-wa]').href = wa(`Merhaba, yaklaşık ${nf(brut)} m² bir ev için görüşmek istiyorum. Oda listesi: ${liste}.`);
}
let planLastW = 0;
addEventListener('resize', () => { const w = plan.clientWidth; if (w !== planLastW) { planLastW = w; program(); } });
formBox.addEventListener('click', (e) => {
  const tog = e.target.closest('[data-tog]');
  if (tog) {
    const id = tog.dataset.tog;
    st[id] = st[id] ? 0 : 1;
    tog.classList.toggle('is-on', !!st[id]);
    tog.setAttribute('aria-pressed', String(!!st[id]));
    program();
    return;
  }
  const b = e.target.closest('[data-d]');
  if (b) {
    const box = b.closest('[data-step]');
    const o = P.odalar.find((x) => x.id === box.dataset.step);
    st[o.id] = Math.max(o.min ?? 0, Math.min(o.max ?? 9, st[o.id] + Number(b.dataset.d)));
    $('[data-n]', box).textContent = st[o.id];
    program();
  }
});
program();
document.fonts?.ready.then(() => program());

// --- Footer ----------------------------------------------------------------------------
$('#foot').innerHTML = `
  <div class="foot__in">
    <p class="foot__ad">${ad}</p>
    <p>${esc(d.isletme.tanim)} · ${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a></p>
  </div>
  <p class="foot__small">© ${new Date().getFullYear()} ${ad}. Proje görselleri ve fotoğraflar temsilîdir (Pexels). Yorumlar örnektir.</p>`;

// Harita: yaklaşınca yüklenir
const mapBox = $('#map');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  io.disconnect();
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(mapBox);

// --- Başlık çubuğu -----------------------------------------------------------------------
const top = $('#ust');
const solid = () => top.classList.toggle('is-solid', scrollY > hero.offsetHeight - 70);
addEventListener('scroll', solid, { passive: true });
solid();
if (innerWidth < 900) autoHideHeader(top, { offset: 140 });

// --- Hareket (sakin: bir kez, küçük kayma) ---------------------------------------------------
if (!reducedMotion) {
  initSmoothScroll();
  // Açılış: kapı açılır (~1 sn), künye küçük kaymayla gelir.
  gsap.timeline({ delay: 0.1 })
    .to(S, { o: 1, duration: 1, ease: 'expo.inOut', onUpdate: draw }, 0)
    .from('#kunye > *', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }, 0);
  gsap.fromTo('.hero__photo', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

  $$('.h2').forEach((h) => gsap.from(h, { y: 26, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%' } }));
  $$('.oda').forEach((o) => gsap.from(o, { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: o, start: 'top 92%' } }));
  $$('.stat').forEach((s) => {
    const el = $('[data-count]', s);
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 92%' } })
      .fromTo(s, { '--line': 0 }, { '--line': 1, duration: 0.9, ease: 'power3.inOut' }, 0)
      .to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => (el.textContent = nf(o.v)) }, 0.1);
  });
  $$('.step').forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 80%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on') }));
  gsap.fromTo('.ofis__photo', { clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)' }, { clipPath: 'inset(0% 0 0 0 round 999px 999px 0 0)', duration: 1.1, ease: 'power3.inOut', scrollTrigger: { trigger: '.ofis__photo', start: 'top 85%' } });
  $$('.shot').forEach((s) => gsap.fromTo(s, { clipPath: 'inset(14% 8% 0% 8%)', y: 24 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 94%' } }));
  gsap.from('.rev', { y: 24, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '.yorum__list', start: 'top 90%' } });
  gsap.from('.program__box', { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.program__box', start: 'top 90%' } });
} else {
  $$('.step').forEach((s) => s.classList.add('is-on'));
}

addEventListener('load', () => { measure(); draw(); ScrollTrigger.refresh(); });
