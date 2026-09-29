import '../../shared/base.css';
import './style.css';
import raw from '../../data/alcibay.json';
import { boot, initSmoothScroll, esc, asset, icons, gsap, ScrollTrigger, reducedMotion, vitrinModu, yilEki } from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { createGL } from './gl.js';

gsap.registerPlugin(DrawSVGPlugin);

const d = boot(raw);
const { isletme: is, konumlar, urunler, paneller, isler } = d;
const merkez = konumlar[0];
merkez.tel = d.iletisim.telefon; // ?tel= ile gelen numara merkez telefonunun yerine geçer
const mobile = matchMedia('(max-width: 759px)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const telHref = (t) => `tel:${t.replace(/[^\d+]/g, '')}`;
const gmaps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const embed = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=13&hl=tr&output=embed`;
const nf = new Intl.NumberFormat('tr-TR');
const urun = (id) => urunler.find((u) => u.id === id);

// Üretici olduğu için yapılandırılmış veri: AutoRepair yerine Organization/Manufacturer
document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
const ld = document.createElement('script');
ld.type = 'application/ld+json';
ld.textContent = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': ['Organization', 'Manufacturer'],
  name: is.ad,
  legalName: is.unvan,
  foundingDate: String(is.kurulus),
  telephone: merkez.tel,
  address: { '@type': 'PostalAddress', streetAddress: merkez.adres, addressLocality: 'Çankaya', addressRegion: 'Ankara', addressCountry: 'TR' },
  makesOffer: urunler.map((u) => ({ '@type': 'Offer', itemOffered: { '@type': 'Product', name: u.ad } })),
});
document.head.append(ld);
document.title = `${is.ad} | Yapı alçıları ve alçı plaka | Ankara`;
document.querySelector('meta[name="description"]').content =
  `${is.ad}: ${is.tanim}. Merkez ${merkez.il.replace(' / ', '/')}; fabrikalar Bala/Ankara ve Tarsus/Mersin. Telefon: ${merkez.tel}`;

// Mobil çubuk: WhatsApp yerine üreticiye uygun kısayollar (vitrin modunda seçim çubuğu kalır)
if (!vitrinModu()) {
  document.querySelector('.action-bar')?.remove();
  const bar = document.createElement('nav');
  bar.className = 'action-bar';
  bar.setAttribute('aria-label', 'Hızlı erişim');
  bar.innerHTML = `
    <a href="${telHref(merkez.tel)}" class="action-bar__btn">${icons.phone}<span>Ara</span></a>
    <a href="#urunler" class="action-bar__btn action-bar__btn--main"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l9-9 3 3-9 9H6z"/></svg><span>Ürünler</span></a>
    <a href="${gmaps(merkez.mapsQuery)}" class="action-bar__btn" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>`;
  document.body.append(bar);
}


// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const bala = konumlar.find((k) => k.id === 'bala');
const tarsus = konumlar.find((k) => k.id === 'tarsus');
const fabrikalar = konumlar.filter((k) => k.kapasite);

document.getElementById('top').innerHTML = `
  <a class="top__logo" href="#giris" aria-label="${esc(is.ad)} ana sayfa"><span class="wm">${esc(is.ad)}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#urunler">Ürünler</a><a href="#plaka">Alçı plaka</a><a href="#hakkinda">Hakkında</a><a href="#fabrikalar">Fabrikalar</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__tel" href="${telHref(merkez.tel)}">${icons.phone}<span>${esc(merkez.tel.replace('+90 ', '0'))}</span></a>`;

// --- Künye: firmanın adı, ne ürettiği, merkez ve fabrikalar, telefon -------------------------------
document.getElementById('giris').innerHTML = `
  <div class="hero__pin">
    <div class="hero__inner">
      <h1 class="hero__title" id="hero-title"><span class="hero__line">${esc(is.ad)}</span></h1>
      <p class="hero__what">${esc(is.tanim)}</p>
      <dl class="kunye">
        <div><dt>Merkez</dt><dd>${esc(merkez.adres)}, ${esc(merkez.il)}</dd></div>
        <div><dt>Fabrikalar</dt><dd>${fabrikalar.map((k) => esc(k.il.split(' / ').slice(-2).join(' / '))).join(' · ')}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(merkez.tel)}">${esc(merkez.tel)}</a></dd></div>
      </dl>
      <div class="hero__cta">
        <a class="btn btn--turuncu" href="${telHref(merkez.tel)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--hat" href="#urunler"><span>Ürünler</span></a>
        <a class="btn btn--hat" href="${gmaps(merkez.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;

// --- Ürünler: yapı alçıları -------------------------------------------------------------------------
document.getElementById('urunler').innerHTML = `
  <div class="range__pin">
    <div class="range__head">
      <h2 id="range-title">Ürünler</h2>
      <p>Yedi yapı alçısı ve dört alçı plaka tipi üretilir. Torbaya dokununca teknik föy açılır.</p>
    </div>
    <div class="range__track" id="range-track">
      ${urunler.map((u) => `
        <button type="button" class="bag" data-urun="${u.id}" style="--c:${u.renk}">
          <span class="bag__img"><img src="${asset(u.torba)}" alt="${esc(u.ad)} torbası (temsilî 3D görsel)" loading="lazy" decoding="async" width="600" height="800"></span>
          <span class="bag__ad">${esc(u.ad)}</span>
          <span class="bag__kisa">${esc(u.kisa)}</span>
        </button>`).join('')}
    </div>
  </div>`;

document.getElementById('sec').innerHTML = `
  <div class="finder__head">
    <h2 id="finder-title">Ürün seçimi ve sarfiyat</h2>
    <p>Yapılacak iş seçilince uygun ürün, teknik değerleri ve yaklaşık sarfiyatı görünür.</p>
  </div>
  <div class="finder__grid">
    <div class="finder__jobs" role="radiogroup" aria-label="Yapılacak iş">
      ${isler.map((x, i) => `<button type="button" role="radio" class="job" data-is="${x.id}" aria-checked="${i === 0}"><span>${esc(x.soru)}</span></button>`).join('')}
    </div>
    <div class="finder__out" id="finder-out" aria-live="polite"></div>
  </div>`;

document.getElementById('plaka').innerHTML = `
  <div class="boards__head">
    <h2 id="boards-title">Alçı plaka</h2>
    <p>Ekopan plakalar TS EN 520 + A1 standardındadır. Kartonun rengi plakanın tipini gösterir: gri standart, yeşil suya, kırmızı yangına dayanımlı.</p>
  </div>
  <div class="boards__stage">
    <div class="boards__stack" id="stack" aria-hidden="true">
      ${paneller.map((p, i) => `<div class="board" style="--i:${i};--k1:${p.karton[0]};--k2:${p.karton[1] || p.karton[0]}"><span class="board__face"></span><span class="board__edge"></span><span class="board__ad">${esc(p.ad)}</span></div>`).join('')}
    </div>
    <div class="boards__list" role="tablist" aria-label="Alçı plaka tipleri">
      ${paneller.map((p, i) => `<button type="button" role="tab" class="bt" data-panel="${p.id}" aria-selected="${i === 0}" style="--k1:${p.karton[0]};--k2:${p.karton[1] || p.karton[0]}"><span class="bt__sw"></span><span class="bt__ad">${esc(p.ad)}</span><span class="bt__t">${esc(p.tanim)}</span></button>`).join('')}
    </div>
    <div class="boards__detail" id="board-detail" role="tabpanel" aria-live="polite"></div>
  </div>`;

// --- Hakkında: olgular (alcibay.com'da yayımlanan bilgiler) -------------------------------------------
document.getElementById('hakkinda').innerHTML = `
  <div class="plants__head">
    <h2 id="plants-title">Hakkında</h2>
  </div>
  <p class="plants__about">${esc(is.ad)} ${esc(yilEki(is.kurulus))} beri yapı alçısı üretiyor. ${esc(is.hakkinda)}</p>
  <p class="plants__unvan">${esc(is.unvan)}</p>
  <div class="stats" aria-label="Rakamlarla">
    <div class="stat"><b data-count="${bala.kapasite}">${nf.format(bala.kapasite)}</b><span>ton/gün, Bala fabrikası</span></div>
    <div class="stat"><b data-count="${tarsus.kapasite}">${nf.format(tarsus.kapasite)}</b><span>ton/gün, Tarsus fabrikası</span></div>
    <div class="stat"><b data-count="${is.kurulus}" data-yil>${is.kurulus}</b><span>kuruluş yılı</span></div>
    <div class="stat"><b data-count="${urunler.length}">${urunler.length}</b><span>toz alçı, ${paneller.length} alçı plaka tipi</span></div>
  </div>
  <div class="about__grid">
    <div>
      <h3 class="plants__h3">Tarihçe</h3>
      <ol class="tl__list">${d.tarihce.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol>
    </div>
    <div>
      <h3 class="plants__h3">Alçı nasıl üretilir</h3>
      <div class="chem__cycle" aria-label="Alçının kimyası">
        <div class="formula"><span>${d.kimya.jips}</span><small>Jips taşı</small></div>
        <div class="arrow"><svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12 H110 M100 4 L112 12 L100 20"/></svg><small>Isıtılır, öğütülür</small></div>
        <div class="formula formula--alci"><span>${d.kimya.alci}</span><small>Alçı tozu</small></div>
      </div>
      <p class="chem__text">${esc(d.kimya.metin)}</p>
    </div>
  </div>
  <h3 class="plants__h3">${esc(d.belgeBaslik || 'Belgeler')}</h3>
  <ul class="certs" aria-label="Belgeler ve standartlar">
    ${d.belgeler.map((b) => `<li>${esc(b)}</li>`).join('')}
  </ul>`;

// --- Merkez ve fabrikalar (saat bilgisi yayımlanmadığı için yalnız adresler) ----------------------------
document.getElementById('fabrikalar').innerHTML = `
  <div class="final__inner">
    <h2 class="final__title" id="final-title">Merkez ve fabrikalar</h2>
    <div class="plants__grid">
      <figure class="map">
        <svg viewBox="${d.harita.viewBox}" role="img" aria-label="Türkiye haritasında ${esc(is.ad)} merkez ve fabrikaları">
          <path class="map__tr" d="${d.harita.path}"/>
          <path class="map__route" d="M${bala.xy[0]} ${bala.xy[1]} Q ${bala.xy[0] + 150} ${(bala.xy[1] + tarsus.xy[1]) / 2 - 30} ${tarsus.xy[0]} ${tarsus.xy[1]}"/>
          ${konumlar.map((k) => `
            <g class="map__pt map__pt--${k.id}" transform="translate(${k.xy[0]} ${k.xy[1]})">
              ${k.kapasite ? `<circle class="map__pulse" r="18"/>` : ''}
              <circle class="map__dot" r="${k.kapasite ? 9 : 6}"/>
            </g>`).join('')}
          <text class="map__lb" x="${merkez.xy[0] - 16}" y="${merkez.xy[1] - 16}" text-anchor="end">Merkez, Çankaya</text>
          <text class="map__lb" x="${bala.xy[0] + 20}" y="${bala.xy[1] + 8}">Bala</text>
          <text class="map__lb" x="${tarsus.xy[0] + 22}" y="${tarsus.xy[1] + 8}">Tarsus</text>
        </svg>
      </figure>
      <div class="places" role="tablist" aria-label="Adresler">
        ${konumlar.map((k, i) => `
          <article class="place ${i === 0 ? 'is-on' : ''}" data-yer="${k.id}">
            <h3>${esc(k.ad)}</h3>
            <p>${esc(k.adres)}<br>${esc(k.il)}</p>
            ${k.kapasite ? `<p class="place__not">Günlük kapasite ${nf.format(k.kapasite)} ton${k.acilis ? `, ${k.acilis}'den beri üretimde` : ''}</p>` : ''}
            <p class="place__tel"><a href="${telHref(k.tel)}">${esc(k.tel)}</a><span>Faks ${esc(k.faks)}</span></p>
            <div class="place__act">
              <a class="btn btn--hat btn--sm" href="${gmaps(k.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <button type="button" class="btn btn--hat btn--sm" data-harita="${k.id}" role="tab" aria-selected="${i === 0}">Haritada göster</button>
            </div>
          </article>`).join('')}
      </div>
    </div>
    <div class="gmap" id="gmap" data-q="${esc(merkez.mapsQuery)}"><p>Harita</p></div>
  </div>`;

document.getElementById('iletisim').innerHTML = `
  <div class="contact__inner">
    <h2 class="contact__title" id="contact-title">İletişim</h2>
    <p class="contact__lead">Ürün, sarfiyat ve fiyat bilgisi için merkezi arayın.</p>
    <div class="contact__cta">
      <a class="btn btn--turuncu btn--xl" href="${telHref(merkez.tel)}">${icons.phone}<span>${esc(merkez.tel)}</span></a>
      <a class="btn btn--hat btn--xl" href="${gmaps(merkez.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
    <p class="contact__note">${esc(merkez.adres)}, ${esc(merkez.il)} · Faks ${esc(merkez.faks)}</p>
  </div>`;

document.getElementById('foot').innerHTML = `
  <div class="foot__in">
    <p class="wm wm--foot">${esc(is.ad)}</p>
    <p>${esc(is.unvan)}</p>
    <p class="foot__small">Bu sayfa Alçıbay için hazırlanmış bir tasarım önerisidir. Ürün bilgileri, adresler, kapasiteler ve belge listesi alcibay.com'dan alınmıştır; uygulama değerleri şantiye koşullarına göre değişebilir. Fotoğraflar temsilîdir (Pexels). Torba ve plaka görselleri bu öneri için hazırlanmış temsilî 3D çizimlerdir; gerçek ambalaj farklıdır.</p>
  </div>`;

// ---------------------------------------------------------------------------
// Ürün föyü (dialog)
// ---------------------------------------------------------------------------

const sheet = document.getElementById('sheet');
function openSheet(id) {
  const u = urun(id);
  sheet.style.setProperty('--c', u.renk);
  sheet.innerHTML = `
    <div class="sheet__in">
      <button type="button" class="sheet__x" data-close aria-label="Kapat">×</button>
      <div class="sheet__top">
        <img src="${asset(u.torba)}" alt="" width="600" height="800">
        <div>
          <p class="sheet__k">Teknik föy</p>
          <h2 id="sheet-title">${u.ad}</h2>
          <p>${u.kisa}</p>
          ${u.artilar.length ? `<ul class="sheet__plus" aria-label="Özellikler">${u.artilar.map((a) => `<li>${a}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      ${u.kullanim.length ? `
        <h3>Kullanım şekli</h3>
        <ol class="sheet__steps">${u.kullanim.map((s) => `<li>${s}</li>`).join('')}</ol>
        <h3>Dikkat edilecekler</h3>
        <ul class="sheet__list">${u.dikkat.map((s) => `<li>${s}</li>`).join('')}</ul>
        <h3>Teknik özellikler</h3>
        <dl class="sheet__spec">${u.teknik.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <h3>Saklama</h3><p>${d.saklama}</p>
        <h3>Sağlık ve iş güvenliği</h3>
        <ul class="sheet__list">${d.guvenlik.map((s) => `<li>${s}</li>`).join('')}</ul>
      ` : `<p class="sheet__empty">Bu ürünün teknik değerleri için merkez aranabilir: <a href="${telHref(merkez.tel)}">${merkez.tel}</a></p>`}
      <div class="sheet__act">
        ${u.kullanim.length ? '<button type="button" class="btn btn--hat" data-print>Föyü yazdır</button>' : ''}
        <a class="btn btn--turuncu" href="${telHref(merkez.tel)}">${icons.phone}<span>Merkezi arayın</span></a>
      </div>
    </div>`;
  sheet.showModal();
  window.__lenis?.stop();
}
sheet.addEventListener('close', () => window.__lenis?.start());
sheet.addEventListener('click', (e) => {
  if (e.target === sheet || e.target.closest('[data-close]')) sheet.close();
  if (e.target.closest('[data-print]')) window.print();
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-urun]');
  if (b) openSheet(b.dataset.urun);
});

// ---------------------------------------------------------------------------
// Ürün bulucu ve sarfiyat hesabı
// ---------------------------------------------------------------------------

const out = document.getElementById('finder-out');
const fmt = (n) => nf.format(Math.round(n));
const fmtK = (n) => String(n).replace('.', ',');

function renderPanelPick(islak = false, yangin = false) {
  const id = islak && yangin ? 'wf' : islak ? 'w' : yangin ? 'f' : 's';
  const p = paneller.find((x) => x.id === id);
  out.innerHTML = `
    <div class="res res--panel" style="--k1:${p.karton[0]};--k2:${p.karton[1] || p.karton[0]}">
      <div class="res__q">
        <label class="tog"><input type="checkbox" data-t="islak" ${islak ? 'checked' : ''}><span>Islak hacim: banyo, mutfak</span></label>
        <label class="tog"><input type="checkbox" data-t="yangin" ${yangin ? 'checked' : ''}><span>Yangın dayanımı gerekli</span></label>
      </div>
      <div class="res__board"><img src="${asset(p.gorsel)}" alt="${p.ad} alçı plaka" loading="lazy"></div>
      <div class="res__body">
        <p class="res__k">Uygun plaka</p>
        <h3>${p.ad}</h3>
        <p>${p.metin} ${p.kartonAd[0].toUpperCase() + p.kartonAd.slice(1)}.</p>
        <p class="res__alan"><b>Kullanım:</b> ${p.alanlar}</p>
        <a class="btn btn--hat btn--sm" href="#plaka" data-go-panel="${p.id}">Ölçüleri gör</a>
      </div>
    </div>`;
}

function renderResult(isId, m2 = 50, kal) {
  const x = isler.find((i) => i.id === isId);
  if (x.panel) return renderPanelPick();
  const u = urun(x.urun);
  const t = u.tuketim;
  const k = kal ?? t?.kalinlik;
  out.innerHTML = `
    <div class="res" style="--c:${u.renk}">
      <div class="res__bag"><img src="${asset(u.torba)}" alt="${esc(u.ad)} torbası" width="600" height="800"></div>
      <div class="res__body">
        <p class="res__k">${x.not}</p>
        <h3>${u.ad}</h3>
        <dl class="res__keys">${u.anahtar.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>
        ${t ? `
          <div class="calc">
            <p class="calc__t">Yaklaşık sarfiyat</p>
            <label>Alan <output>${fmt(m2)} m²</output><input type="range" min="5" max="2000" step="5" value="${m2}" data-c="m2"></label>
            <label>Kalınlık <output>${fmtK(k)} ${t.birim}</output><input type="range" min="${t.kalinlikMin}" max="${t.kalinlikMax}" step="${t.adim}" value="${k}" data-c="kal"></label>
            <p class="calc__r"><b>${fmt(t.min * k * m2)}–${fmt(t.max * k * m2)}</b> kg <span>(${fmtK(t.min)}–${fmtK(t.max)} kg/m² · ${t.birim})</span></p>
          </div>` : ''}
        <button type="button" class="btn btn--hat btn--sm" data-urun="${u.id}">Teknik föyü aç</button>
      </div>
    </div>`;
  out.dataset.is = isId;
}

document.querySelector('.finder__jobs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-is]');
  if (!b) return;
  document.querySelectorAll('.job').forEach((j) => j.setAttribute('aria-checked', j === b));
  const prev = out.firstElementChild;
  const swap = () => {
    renderResult(b.dataset.is);
    if (!reducedMotion) gsap.fromTo(out.firstElementChild, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    puff(out.querySelector('.res__bag, .res__board'));
  };
  if (prev && !reducedMotion) gsap.to(prev, { opacity: 0, y: -10, duration: 0.18, onComplete: swap });
  else swap();
});
out.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.t) {
    const q = out.querySelectorAll('[data-t]');
    return renderPanelPick(q[0].checked, q[1].checked);
  }
  if (!t.dataset.c) return;
  const m2 = Number(out.querySelector('[data-c="m2"]').value);
  const kal = Number(out.querySelector('[data-c="kal"]').value);
  const u = urun(isler.find((i) => i.id === out.dataset.is).urun).tuketim;
  out.querySelector('[data-c="m2"]').previousElementSibling.textContent = `${fmt(m2)} m²`;
  out.querySelector('[data-c="kal"]').previousElementSibling.textContent = `${fmtK(kal)} ${u.birim}`;
  out.querySelector('.calc__r b').textContent = `${fmt(u.min * kal * m2)}–${fmt(u.max * kal * m2)}`;
});
out.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go-panel]');
  if (g) selectPanel(g.dataset.goPanel);
});
renderResult(isler[0].id);

// Torba değişince küçük bir toz bulutu
function puff(el) {
  if (!el || reducedMotion) return;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'puff';
    el.append(s);
    const a = (i / n) * Math.PI * 2;
    gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 0.9 }, {
      x: Math.cos(a) * (60 + Math.random() * 50), y: Math.sin(a) * (30 + Math.random() * 40) - 20,
      scale: 1.6 + Math.random(), opacity: 0, duration: 0.9 + Math.random() * 0.4, ease: 'power2.out',
      onComplete: () => s.remove(),
    });
  }
}

// ---------------------------------------------------------------------------
// Alçı plaka seçimi
// ---------------------------------------------------------------------------

const detail = document.getElementById('board-detail');
function selectPanel(id) {
  const p = paneller.find((x) => x.id === id);
  document.querySelectorAll('.bt').forEach((b) => b.setAttribute('aria-selected', b.dataset.panel === id));
  document.querySelectorAll('.board').forEach((b, i) => b.classList.toggle('is-on', paneller[i].id === id));
  detail.innerHTML = `
    <h3>${p.ad} <span>${p.tanim}</span></h3>
    <p>${p.metin}</p>
    <p class="bd__meta"><b>Kullanım:</b> ${p.alanlar}<br><b>Standart:</b> ${p.standart}</p>
    <div class="bd__table" role="region" aria-label="${p.ad} ölçüleri" tabindex="0">
      <table>
        <thead><tr><th>Kalınlık</th><th>Genişlik</th><th>Uzunluk</th><th>Ağırlık</th><th>Palet</th></tr></thead>
        <tbody>${p.olculer.map((r) => `<tr>${r.map((c, i) => `<td>${i === 4 ? `${c} adet` : c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}
document.querySelector('.boards__list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-panel]');
  if (b) selectPanel(b.dataset.panel);
});
selectPanel('s');

// Harita sekmeleri
const gmap = document.getElementById('gmap');
function loadMap(q) {
  gmap.innerHTML = `<iframe title="Alçıbay konumu" src="${embed(q)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
document.querySelector('.places').addEventListener('click', (e) => {
  const b = e.target.closest('[data-harita]');
  if (!b) return;
  const k = konumlar.find((x) => x.id === b.dataset.harita);
  document.querySelectorAll('.place').forEach((p) => p.classList.toggle('is-on', p.dataset.yer === k.id));
  document.querySelectorAll('[data-harita]').forEach((x) => x.setAttribute('aria-selected', x === b));
  loadMap(k.mapsQuery);
});
new IntersectionObserver((en, o) => {
  if (en[0].isIntersecting) { loadMap(gmap.dataset.q); o.disconnect(); }
}, { rootMargin: '600px' }).observe(gmap);

// ---------------------------------------------------------------------------
// WebGL + hareket
// ---------------------------------------------------------------------------

const canvas = document.getElementById('gl');
// Künyede tek sahne: alçı tozu savrulur, kaydırınca yere oturur. Duvar dokuları yüklenmez.
const gl = createGL(canvas, { lowEnd });
window.__gl = gl;

let glVisible = true;
let lastT = performance.now();
let frameAvg = 16;
gsap.ticker.add(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  frameAvg = frameAvg * 0.95 + dt * 1000 * 0.05;
  if (glVisible) gl.render(reducedMotion ? 0 : dt);
});
addEventListener('resize', () => { gl.resize(); ScrollTrigger.refresh(); });

const top = document.getElementById('top');
const setGL = (on) => { glVisible = on; canvas.style.visibility = on ? 'visible' : 'hidden'; };

if (reducedMotion) {
  gl.state.burst = 1;
  gl.state.settle = 0;
  gl.state.time = 6;
  document.documentElement.classList.add('is-static');
  gl.render(0);
  ScrollTrigger.create({ trigger: '#urunler', start: 'top bottom', endTrigger: 'html', end: 'bottom bottom', onToggle: (s) => setGL(!s.isActive) });
  ScrollTrigger.create({ trigger: '#urunler', start: 'top 60px', endTrigger: 'html', end: 'bottom top', onToggle: (s) => top.classList.toggle('is-light', s.isActive) });
} else {
  initSmoothScroll();
  motion();
  addEventListener('load', () => ScrollTrigger.refresh());
}

function motion() {
  const tetik = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

  // Açılış (~1,4 sn, perde yok): toz patlar, künye satır satır gelir
  gsap.to(gl.state, { burst: 1, duration: 1.4, ease: 'power2.out' });
  gsap.from('.hero__title, .hero__what, .kunye > div, .hero__cta', { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.07, ease: 'power3.out', delay: 0.15 });

  // Künye kayarken toz yere oturur (pin yok)
  gsap.to(gl.state, { settle: 1, ease: 'none', scrollTrigger: { trigger: '#giris', start: 'top top', end: 'bottom top', scrub: 0.6 } });

  // Toz sahnesinde imleç/parmak
  const move = (e) => gl.pointer(e.clientX, e.clientY);
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', move, { passive: true });

  // Torbalar: ızgarada sırayla yükselir
  gsap.from('.bag', { y: 40, autoAlpha: 0, stagger: 0.06, duration: 0.7, ease: 'power3.out', scrollTrigger: tetik('#range-track', 'top 88%') });

  // Ürün seçimi
  gsap.fromTo('.job', { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, stagger: 0.05, duration: 0.5, ease: 'power2.out', scrollTrigger: tetik('.finder__jobs') });

  // Plaka yığını yelpaze gibi açılır
  gsap.utils.toArray('.board').forEach((b) => {
    gsap.fromTo(b, { '--spread': 0 }, {
      '--spread': 1, ease: 'power2.out',
      scrollTrigger: { trigger: '#plaka', start: 'top 80%', end: 'top 20%', scrub: 0.6 },
    });
  });

  // Kimya oku çizilir
  gsap.fromTo('.arrow path', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.8, scrollTrigger: tetik('.chem__cycle') });

  // Sayaçlar (kuruluş yılı sayılmaz)
  gsap.utils.toArray('[data-count]:not([data-yil])').forEach((el) => {
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: Number(el.dataset.count), duration: 1.4, ease: 'power2.out',
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
      scrollTrigger: tetik(el, 'top 90%'),
    });
  });
  gsap.fromTo('.certs li', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.06, scrollTrigger: tetik('.certs', 'top 92%') });

  // Harita çizilir
  const mt = gsap.timeline({ scrollTrigger: tetik('.map', 'top 80%') });
  mt.fromTo('.map__tr', { drawSVG: '0%', fillOpacity: 0 }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' })
    .to('.map__tr', { fillOpacity: 1, duration: 0.5 }, 1.2)
    .fromTo('.map__pt', { scale: 0, transformOrigin: 'center' }, { scale: 1, stagger: 0.15, duration: 0.5, ease: 'back.out(3)' }, 1.1)
    .fromTo('.map__route', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.9 }, 1.4)
    .fromTo('.map__lb', { opacity: 0 }, { opacity: 1, stagger: 0.1 }, 1.6);

  // Bölüm başlıkları
  gsap.utils.toArray('.range__head h2, .finder__head h2, .boards__head h2, .plants__head h2, .final__title, .contact__title').forEach((h) => {
    gsap.fromTo(h, { clipPath: 'inset(-0.2em 100% -0.3em 0)' }, { clipPath: 'inset(-0.2em 0% -0.3em 0)', duration: 0.9, ease: 'power3.inOut', scrollTrigger: tetik(h) });
  });

  // Tuval yalnız künyede çizilir
  ScrollTrigger.create({ trigger: '#urunler', start: 'top top', endTrigger: 'html', end: 'bottom bottom', onToggle: (s) => setGL(!s.isActive) });

  // Header: açık zeminde koyu logo
  ScrollTrigger.create({
    trigger: '#urunler', start: 'top 60px', endTrigger: 'html', end: 'bottom top',
    onToggle: (s) => top.classList.toggle('is-light', s.isActive),
  });

  // Mıknatıslı butonlar (masaüstü)
  if (fine) {
    document.querySelectorAll('.hero .btn--turuncu').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3.out' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3.out' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // Yavaş cihazda çözünürlüğü düşür
  let lowered = false;
  setInterval(() => {
    if (!lowered && frameAvg > 28 && glVisible) {
      lowered = true;
      gl.renderer.setPixelRatio(1);
      gl.resize();
    }
  }, 2000);
}
