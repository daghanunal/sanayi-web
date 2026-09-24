import '../../shared/base.css';
import './style.css';
import raw from '../../data/alcibay.json';
import { boot, initSmoothScroll, esc, asset, icons, gsap, ScrollTrigger, reducedMotion, vitrinModu } from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { createGL } from './gl.js';

gsap.registerPlugin(SplitText, DrawSVGPlugin);

const d = boot(raw);
const { isletme: is, konumlar, urunler, paneller, isler } = d;
const merkez = konumlar[0];
const mobile = matchMedia('(max-width: 759px)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const telHref = (t) => `tel:${t.replace(/[^\d+]/g, '')}`;
const gmaps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const embed = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=13&hl=tr&output=embed`;
const nf = new Intl.NumberFormat('tr-TR');
const urun = (id) => urunler.find((u) => u.id === id);
const yil = new Date().getFullYear() - is.kurulus;

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
  `${is.ad}: ${is.kurulus}'den beri yapı alçısı ve alçı plaka. Bala ve Tarsus fabrikaları, günde ${nf.format(konumlar.reduce((a, k) => a + (k.kapasite || 0), 0))} ton.`;

// Mobil çubuk: WhatsApp yerine üreticiye uygun kısayollar (vitrin modunda seçim çubuğu kalır)
if (!vitrinModu()) {
  document.querySelector('.action-bar')?.remove();
  const bar = document.createElement('nav');
  bar.className = 'action-bar';
  bar.setAttribute('aria-label', 'Hızlı erişim');
  bar.innerHTML = `
    <a href="${telHref(merkez.tel)}" class="action-bar__btn">${icons.phone}<span>Ara</span></a>
    <a href="#sec" class="action-bar__btn action-bar__btn--main"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l9-9 3 3-9 9H6z"/></svg><span>Ürün bul</span></a>
    <a href="${gmaps(merkez.mapsQuery)}" class="action-bar__btn" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>`;
  document.body.append(bar);
}

const kapasite = konumlar.reduce((a, k) => a + (k.kapasite || 0), 0);

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

document.getElementById('top').innerHTML = `
  <a class="top__logo" href="#giris" aria-label="${esc(is.ad)} ana sayfa">
    <img class="top__logo-acik" src="${asset('/img/alcibay/logo-acik.png')}" alt="${esc(is.ad)}" width="144" height="25">
    <img class="top__logo-koyu" src="${asset('/img/alcibay/logo.png')}" alt="" width="144" height="25">
  </a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#urunler">Alçılar</a><a href="#plaka">Alçı plaka</a><a href="#fabrikalar">Fabrikalar</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="top__tel" href="${telHref(merkez.tel)}">${icons.phone}<span>${esc(merkez.tel.replace('+90 ', '0'))}</span></a>`;

document.getElementById('giris').innerHTML = `
  <div class="hero__pin">
    <div class="hero__inner">
      <p class="hero__kicker">${is.kurulus}'den beri Ankara'da yapı alçısı</p>
      <h1 class="hero__title" id="hero-title"><span class="hero__line">Tozdan</span> <span class="hero__line">duvara.</span></h1>
      <p class="hero__lead">Bala ve Tarsus'taki iki fabrikamızda günde ${nf.format(kapasite)} ton alçı üretiyoruz. Sıvadan perdaha, kartonpiyerden alçı plakaya, duvarın her katı için bir torba.</p>
      <div class="hero__cta">
        <a class="btn btn--turuncu" href="#sec">Ürününü bul</a>
        <a class="btn btn--hat" href="${telHref(merkez.tel)}">${icons.phone}<span>Teknik danışmanlık</span></a>
      </div>
    </div>
    <p class="hero__hint" aria-hidden="true">${fine ? 'İmleçle tozu savurun, kaydırınca yere otursun' : 'Parmağınızla tozu savurun, kaydırınca otursun'}</p>
    <div class="hero__settled" aria-hidden="true">
      <p class="hero__settled-t">Pürüzsüz.</p>
    </div>
  </div>`;

const ADIMLAR = [
  { k: 'hazir', baslik: 'Bu duvar nasıl bu kadar düz?', metin: 'Geri saralım. Her katın doğru alçısı var.', urun: null, kalin: '' },
  { k: 'tugla', baslik: 'Çıplak duvar', metin: 'Tuğla, beton ya da gazbeton. Önce toz ve yağdan arındırılır, ıslatılır.', urun: null, kalin: '' },
  { k: 'siva', baslik: 'İlk kat: sıva', metin: 'Ano çıtaları terazi verir, harç mala ile atılıp mastarla çekilir.', urun: 'perlitli', kalin: '0,5–1,5 cm' },
  { k: 'perdah', baslik: 'Son kat: perdah', metin: 'Çelik mala ile ince bir kat. Yüzeydeki izler harç donunca tıraşlanır.', urun: 'saten', kalin: 'min. 0,5 mm' },
  { k: 'son', baslik: 'Boyaya hazır.', metin: 'Yan ışıkta bile iz yok. Makineyle çalışıyorsanız Makina Sıva Alçısı bu yüzeyi tek katta verir, saten gerektirmez.', urun: 'makina', kalin: '' },
];

document.getElementById('katman').innerHTML = `
  <div class="wall__pin">
    <h2 class="sr-only" id="wall-title">Katman katman bir alçı duvar</h2>
    <div class="wall__trowel" id="trowel" aria-hidden="true">
      <svg viewBox="0 0 160 90"><path d="M8 70 L112 70 Q124 70 124 60 L124 56 L8 56 Q2 56 2 63 Q2 70 8 70Z" fill="#c9ced1" stroke="#7b8286" stroke-width="2"/><path d="M60 56 L60 40 L96 22" fill="none" stroke="#7b8286" stroke-width="5" stroke-linecap="round"/><rect x="92" y="6" width="58" height="22" rx="11" transform="rotate(-28 121 17)" fill="#f29d20"/></svg>
    </div>
    <ol class="wall__steps">
      ${ADIMLAR.map((a, i) => {
        const u = a.urun && urun(a.urun);
        return `<li class="wall__step" data-i="${i}">
          <p class="wall__n">${i === 0 ? '' : `${i}/4`}</p>
          <h3>${a.baslik}</h3>
          <p>${a.metin}</p>
          ${u ? `<button type="button" class="chip" data-urun="${u.id}" style="--c:${u.renk}"><span class="chip__dot"></span>${u.ad}${a.kalin ? ` <em>${a.kalin}</em>` : ''}</button>` : ''}
        </li>`;
      }).join('')}
    </ol>
    <figure class="kesit" aria-label="Duvar kesiti">
      <svg viewBox="0 0 120 200" aria-hidden="true">
        <rect class="kesit__tugla" x="0" y="0" width="64" height="200"/>
        <g class="kesit__derz">${Array.from({ length: 9 }, (_, i) => `<line x1="0" x2="64" y1="${i * 24 + 12}" y2="${i * 24 + 12}"/>`).join('')}</g>
        <rect class="kesit__siva" x="64" y="0" width="0" height="200"/>
        <rect class="kesit__perdah" x="64" y="0" width="0" height="200"/>
      </svg>
      <figcaption><span class="kesit__l kesit__l--t">Tuğla</span><span class="kesit__l kesit__l--s">Sıva</span><span class="kesit__l kesit__l--p">Perdah</span></figcaption>
    </figure>
    <div class="wall__bar" aria-hidden="true"><span id="wall-bar"></span></div>
  </div>`;

const plakaIs = isler.find((x) => x.panel);
document.getElementById('sec').innerHTML = `
  <div class="finder__head">
    <h2 id="finder-title">Ne yapacaksınız?</h2>
    <p>İşi seçin, doğru torbayı ve ne kadar lazım olduğunu söyleyelim.</p>
  </div>
  <div class="finder__grid">
    <div class="finder__jobs" role="radiogroup" aria-label="Yapılacak iş">
      ${isler.map((x, i) => `<button type="button" role="radio" class="job" data-is="${x.id}" aria-checked="${i === 0}"><span>${x.soru}</span></button>`).join('')}
    </div>
    <div class="finder__out" id="finder-out" aria-live="polite"></div>
  </div>`;

document.getElementById('urunler').innerHTML = `
  <div class="range__pin">
    <div class="range__head">
      <h2 id="range-title">Yedi torba,<br>her kat için bir alçı.</h2>
      <p>Torbanın rengi işi söyler. Dokunun, teknik föyü açılsın.</p>
    </div>
    <div class="range__track" id="range-track">
      ${urunler.map((u) => `
        <button type="button" class="bag" data-urun="${u.id}" style="--c:${u.renk}">
          <span class="bag__img"><img src="${asset(u.torba)}" alt="${esc(u.ad)} torbası" loading="lazy" width="383" height="491"></span>
          <span class="bag__ad">${u.ad}</span>
          <span class="bag__kisa">${u.kisa}</span>
        </button>`).join('')}
    </div>
  </div>`;

document.getElementById('plaka').innerHTML = `
  <div class="boards__head">
    <h2 id="boards-title">Alçı plaka: kartonun rengi ortamı söyler.</h2>
    <p>Ekopan ailesi TS EN 520 + A1 standardında. Gri standart, yeşil suya, kırmızı yangına dayanıklı.</p>
  </div>
  <div class="boards__stage">
    <div class="boards__stack" id="stack" aria-hidden="true">
      ${paneller.map((p, i) => `<div class="board" style="--i:${i};--k1:${p.karton[0]};--k2:${p.karton[1] || p.karton[0]}"><span class="board__face"></span><span class="board__edge"></span><span class="board__ad">${p.ad}</span></div>`).join('')}
    </div>
    <div class="boards__list" role="tablist" aria-label="Alçı plaka tipleri">
      ${paneller.map((p, i) => `<button type="button" role="tab" class="bt" data-panel="${p.id}" aria-selected="${i === 0}" style="--k1:${p.karton[0]};--k2:${p.karton[1] || p.karton[0]}"><span class="bt__sw"></span><span class="bt__ad">${p.ad}</span><span class="bt__t">${p.tanim}</span></button>`).join('')}
    </div>
    <div class="boards__detail" id="board-detail" role="tabpanel" aria-live="polite"></div>
  </div>`;

document.getElementById('alci').innerHTML = `
  <div class="chem__inner">
    <h2 id="chem-title">Taştan gelir, taşa döner.</h2>
    <div class="chem__cycle" aria-label="Alçının kimyası">
      <div class="formula formula--jips"><span>${d.kimya.jips}</span><small>Jips taşı</small></div>
      <div class="arrow"><svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12 H110 M100 4 L112 12 L100 20"/></svg><small>Isıtılır, öğütülür</small></div>
      <div class="formula formula--alci"><span>${d.kimya.alci}</span><small>Alçı tozu</small></div>
      <div class="arrow"><svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12 H110 M100 4 L112 12 L100 20"/></svg><small>Su ile karışır</small></div>
      <div class="formula formula--jips2"><span>${d.kimya.jips}</span><small>Sertleşmiş duvar</small></div>
    </div>
    <p class="chem__text">${d.kimya.metin}</p>
  </div>
  <div class="tl" aria-label="Alçının tarihçesi">
    <ol class="tl__track" id="tl-track">
      ${d.tarihce.map(([y, t]) => `<li class="tl__i ${/^(1992|2008)$/.test(y) ? 'tl__i--biz' : ''}"><b>${y}</b><span>${t}</span></li>`).join('')}
    </ol>
  </div>`;

const bala = konumlar.find((k) => k.id === 'bala');
const tarsus = konumlar.find((k) => k.id === 'tarsus');
document.getElementById('fabrikalar').innerHTML = `
  <div class="plants__head">
    <h2 id="plants-title">İki fabrika, günde ${nf.format(kapasite)} ton.</h2>
  </div>
  <div class="plants__grid">
    <figure class="map">
      <svg viewBox="${d.harita.viewBox}" role="img" aria-label="Türkiye haritasında Alçıbay merkez ve fabrikaları">
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
    <div class="stats">
      <div class="stat"><b data-count="${bala.kapasite}">0</b><span>ton/gün, Bala fabrikası</span></div>
      <div class="stat"><b data-count="${tarsus.kapasite}">0</b><span>ton/gün, Tarsus fabrikası (${tarsus.acilis})</span></div>
      <div class="stat"><b data-count="${yil}">0</b><span>yıl, ${is.kurulus}'den beri</span></div>
      <div class="stat"><b data-count="${urunler.length}">0</b><span>toz alçı, ${paneller.length} alçı plaka tipi</span></div>
    </div>
  </div>
  <p class="plants__about">${esc(is.hakkinda)}</p>
  <ul class="certs" aria-label="Belgeler ve standartlar">
    ${d.belgeler.map((b) => `<li>${b}</li>`).join('')}
  </ul>`;

document.getElementById('iletisim').innerHTML = `
  <div class="final__inner">
    <h2 class="final__title" id="final-title">Şantiyeniz için doğru alçıyı birlikte seçelim.</h2>
    <p class="final__lead">Teknik danışmanlık hattımız sorularınızı yanıtlar: sarfiyat, uygulama, depolama.</p>
    <div class="final__cta">
      <a class="btn btn--turuncu btn--xl" href="${telHref(merkez.tel)}">${icons.phone}<span>${esc(merkez.tel)}</span></a>
    </div>
    <div class="places" role="tablist" aria-label="Adresler">
      ${konumlar.map((k, i) => `
        <article class="place ${i === 0 ? 'is-on' : ''}" data-yer="${k.id}">
          <h3>${k.ad}</h3>
          <p>${k.adres}<br>${k.il}</p>
          <p class="place__tel"><a href="${telHref(k.tel)}">${k.tel}</a><span>Faks ${k.faks}</span></p>
          <div class="place__act">
            <a class="btn btn--hat btn--sm" href="${gmaps(k.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            <button type="button" class="btn btn--hat btn--sm" data-harita="${k.id}" role="tab" aria-selected="${i === 0}">Haritada gör</button>
          </div>
        </article>`).join('')}
    </div>
    <div class="gmap" id="gmap" data-q="${esc(merkez.mapsQuery)}"><p>Harita, bu bölüme gelince yüklenir.</p></div>
  </div>`;

document.getElementById('foot').innerHTML = `
  <div class="foot__in">
    <img src="${asset('/img/alcibay/logo-acik.png')}" alt="${esc(is.ad)}" width="144" height="25" loading="lazy">
    <p>${esc(is.unvan)}</p>
    <p class="foot__small">Bu sayfa Alçıbay için hazırlanmış bir tasarım önerisidir. Ürün bilgileri alcibay.com'dan alınmıştır; uygulama değerleri şantiye koşullarına göre değişebilir. Fotoğraflar: Pexels ve Alçıbay.</p>
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
        <img src="${asset(u.torba)}" alt="" width="383" height="491">
        <div>
          <p class="sheet__k">Teknik föy</p>
          <h2 id="sheet-title">${u.ad}</h2>
          <p>${u.kisa}</p>
          ${u.artilar.length ? `<ul class="sheet__plus">${u.artilar.map((a) => `<li>${a}</li>`).join('')}</ul>` : ''}
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
      ` : `<p class="sheet__empty">Bu ürünün teknik değerleri için teknik danışmanlık hattımızı arayın: <a href="${telHref(merkez.tel)}">${merkez.tel}</a></p>`}
      <div class="sheet__act">
        ${u.kullanim.length ? '<button type="button" class="btn btn--hat" data-print>Föyü yazdır</button>' : ''}
        <a class="btn btn--turuncu" href="${telHref(merkez.tel)}">${icons.phone}<span>Teknik danışmanlık</span></a>
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
        <p class="res__k">Önerimiz</p>
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
      <div class="res__bag"><img src="${asset(u.torba)}" alt="${esc(u.ad)} torbası" width="383" height="491"></div>
      <div class="res__body">
        <p class="res__k">${x.not}</p>
        <h3>${u.ad}</h3>
        <dl class="res__keys">${u.anahtar.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>
        ${t ? `
          <div class="calc">
            <p class="calc__t">Kaç kilo lazım?</p>
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
const gl = createGL(canvas, {
  lowEnd,
  urls: { brick: asset('/img/alcibay/tugla.jpg'), rough: asset('/img/alcibay/perdah-doku.jpg'), fine: asset('/img/alcibay/duvar-doku.jpg') },
});
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

const intro = document.getElementById('intro');
const top = document.getElementById('top');

if (reducedMotion) {
  intro.remove();
  gl.state.burst = 1;
  gl.state.settle = 0;
  gl.wall.uP1.value = gl.wall.uP2.value = gl.wall.uP3.value = 1;
  document.documentElement.classList.add('is-static');
  // Duvar bölümü: sabit, son hali; tuval yalnızca hero için
  ScrollTrigger.create({ trigger: '#katman', start: 'top 60%', end: 'bottom top', onToggle: (s) => gl.setMode(s.isActive ? 'duvar' : 'toz') });
  ScrollTrigger.create({ trigger: '#katman', start: 'top 60px', endTrigger: 'html', end: 'bottom top', onToggle: (s) => top.classList.toggle('is-light', s.isActive) });
  gl.state.time = 6;
} else {
  initSmoothScroll();
  const heroSplit = new SplitText('#hero-title .hero__line', { type: 'chars', charsClass: 'ch' });
  gsap.set(heroSplit.chars, { yPercent: 110, opacity: 0 });
  gsap.set('.hero__kicker, .hero__lead, .hero__cta, .hero__hint', { opacity: 0 });
  heroScroll(heroSplit);
  runIntro(heroSplit);
  motion();
  // Görseller yüklenince pin mesafeleri yeniden hesaplansın
  addEventListener('load', () => ScrollTrigger.refresh());
}

function runIntro(split) {
  document.documentElement.classList.add('is-intro');
  window.__lenis?.stop();
  const tl = gsap.timeline({ onComplete: () => endIntro(split) });
  tl.fromTo('.intro__logo', { opacity: 0, y: 14, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, 0.1)
    .fromTo('#intro-line', { opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0.18em', duration: 0.8, ease: 'power2.out' }, 0.35)
    .to(gl.state, { burst: 1, duration: 1.6, ease: 'power2.out' }, 0.55)
    .to('.intro__in', { opacity: 0, y: -18, duration: 0.45, ease: 'power2.in' }, 1.55)
    .to(intro, { opacity: 0, duration: 0.5 }, 1.75);
  const skip = () => tl.progress(1);
  intro.addEventListener('pointerdown', skip, { once: true });
  addEventListener('keydown', skip, { once: true });
}

function endIntro(split) {
  intro.remove();
  document.documentElement.classList.remove('is-intro');
  window.__lenis?.start();
  // Giriş animasyonu scroll zaman çizelgesinden bağımsız: karakterlerin iç sarmalayıcısı değil,
  // satırın kendisi hareket eder ki scroll'daki dağılma ile çakışmasın.
  gsap.fromTo(split.chars, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.035, ease: 'expo.out', immediateRender: false });
  gsap.fromTo('.hero__kicker, .hero__lead, .hero__cta, .hero__hint', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, delay: 0.25, ease: 'power3.out' });
}

function heroScroll(split) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#giris', start: 'top top', end: () => `+=${innerHeight * 1.6}`, scrub: 0.6, pin: '.hero__pin',
      onUpdate: (s) => top.classList.toggle('is-light', s.progress > 0.62),
    },
  });
  tl.to(gl.state, { settle: 1, duration: 1, ease: 'none' }, 0)
    .to(split.chars, { y: () => gsap.utils.random(-90, 70), rotate: () => gsap.utils.random(-14, 14), filter: 'blur(7px)', stagger: { each: 0.008, from: 'random' }, duration: 0.3, ease: 'power1.in' }, 0.05)
    .to('#hero-title', { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0.12)
    .fromTo('.hero__pin', { '--shade': 1 }, { '--shade': 0, duration: 0.3 }, 0.15)
    .to('.hero__kicker, .hero__lead, .hero__cta, .hero__hint', { opacity: 0, y: -20, duration: 0.2 }, 0.05)
    .fromTo('.hero__settled-t', { opacity: 0, scale: 1.12, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.25, ease: 'power2.out' }, 0.72)
    .to({}, { duration: 0.1 });
}

function motion() {
  // Toz sahnesinde imleç/parmak
  const move = (e) => gl.pointer(e.clientX, e.clientY);
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', move, { passive: true });


  // --- Katman katman duvar ---
  const w = gl.wall;
  const steps = gsap.utils.toArray('.wall__step');
  const trowel = document.getElementById('trowel');
  const kesit = { s: 1, p: 1 };
  const setKesit = () => {
    document.querySelector('.kesit__siva').setAttribute('width', kesit.s * 30);
    const p = document.querySelector('.kesit__perdah');
    p.setAttribute('x', 64 + kesit.s * 30);
    p.setAttribute('width', kesit.p * 8);
    document.querySelector('.kesit').style.setProperty('--s', kesit.s);
    document.querySelector('.kesit').style.setProperty('--p', kesit.p);
  };
  const showStep = (i) => steps.forEach((s, j) => s.classList.toggle('is-on', i === j));
  // Mala, açılan cephenin üstünde gezinir
  const trowelAt = (p) => {
    const x = gsap.utils.clamp(0, 1, p * 1.3 - 0.15);
    const row = Math.min(4, Math.floor(p * 5));
    const dir = row % 2 === 0 ? x : 1 - x;
    gsap.set(trowel, { x: dir * innerWidth - 60, y: (row + 0.5) / 5 * innerHeight - 40, rotate: row % 2 ? 8 : -8, opacity: p > 0.01 && p < 0.99 ? 1 : 0 });
  };
  const wt = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#katman', start: 'top top', end: () => `+=${innerHeight * (mobile ? 5 : 5.5)}`, scrub: 0.5, pin: '.wall__pin',
      onUpdate: (s) => {
        const p = s.progress;
        const i = p < 0.1 ? 0 : p < 0.26 ? 1 : p < 0.55 ? 2 : p < 0.8 ? 3 : 4;
        showStep(i);
        document.getElementById('wall-bar').style.transform = `scaleX(${p})`;
      },
    },
  });
  // Geri sarma: bitmiş duvar sökülür, tuğla görünür
  wt.to(w.uP3, { value: 0, duration: 0.6 }, 0.2)
    .to(w.uP2, { value: 0, duration: 0.6 }, 0.35)
    .to(w.uP1, { value: 0, duration: 0.6, onUpdate: () => trowel.style.opacity = 0 }, 0.5)
    .to(kesit, { s: 0, p: 0, duration: 0.6, onUpdate: setKesit }, 0.35)
    .set(kesit, { s: 0, p: 0, onUpdate: setKesit }, 1.1)
    // Sıva
    .to(w.uP1, { value: 1, duration: 3, onUpdate: () => trowelAt(w.uP1.value) }, 1.6)
    .to(kesit, { s: 1, duration: 3, onUpdate: setKesit }, 1.6)
    // Perdah
    .to(w.uP2, { value: 1, duration: 2.6, onUpdate: () => trowelAt(w.uP2.value) }, 4.9)
    .to(kesit, { p: 1, duration: 2.6, onUpdate: setKesit }, 4.9)
    // Boyaya hazır: yan ışık yüzeyi tarar
    .to(w.uP3, { value: 1, duration: 1 }, 7.6)
    .fromTo(w.uLight, { value: -0.3 }, { value: 1.3, duration: 2.4 }, 7.8)
    .to({}, { duration: 0.4 });
  w.uP1.value = w.uP2.value = w.uP3.value = 1;
  setKesit();
  showStep(0);

  // --- Ürün bulucu girişi ---
  gsap.fromTo('.finder__head h2', { clipPath: 'inset(-0.2em 100% -0.3em 0)' }, {
    clipPath: 'inset(-0.2em 0% -0.3em 0)', duration: 1, ease: 'power3.inOut',
    scrollTrigger: { trigger: '#sec', start: 'top 75%' },
  });
  gsap.fromTo('.job', { opacity: 0, x: -20 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: '.finder__jobs', start: 'top 85%' } });

  // --- Torba dizisi: yatay kayan raf ---
  const track = document.getElementById('range-track');
  const bags = gsap.utils.toArray('.bag');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth + (mobile ? 32 : 96));
  const rt = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '#urunler', start: 'top top', end: () => `+=${dist() + innerHeight * 0.4}`, scrub: 0.6, pin: '.range__pin', invalidateOnRefresh: true },
  });
  bags.forEach((b) => {
    gsap.fromTo(b.querySelector('.bag__img'), { yPercent: 18, rotate: -4 }, {
      yPercent: -4, rotate: 0, ease: 'none',
      scrollTrigger: { trigger: b, containerAnimation: rt, start: 'left right', end: 'center center', scrub: true },
    });
  });

  // --- Plaka yığını yelpaze gibi açılır ---
  gsap.utils.toArray('.board').forEach((b, i) => {
    gsap.fromTo(b, { '--spread': 0 }, {
      '--spread': 1, ease: 'power2.out',
      scrollTrigger: { trigger: '#plaka', start: 'top 80%', end: 'top 20%', scrub: 0.6 },
    });
  });

  // --- Kimya döngüsü ---
  const ct = gsap.timeline({ scrollTrigger: { trigger: '.chem__cycle', start: 'top 78%' } });
  ct.fromTo('.formula, .arrow', { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.14, duration: 0.6, ease: 'power3.out' })
    .fromTo('.arrow path', { drawSVG: '0%' }, { drawSVG: '100%', stagger: 0.3, duration: 0.6 }, 0.2);
  const chemSplit = new SplitText('#chem-title', { type: 'words' });
  gsap.fromTo(chemSplit.words, { opacity: 0.12 }, { opacity: 1, stagger: 0.1, scrollTrigger: { trigger: '#chem-title', start: 'top 85%', end: 'top 45%', scrub: true } });
  const tl = document.getElementById('tl-track');
  gsap.to(tl, { x: () => -(tl.scrollWidth - innerWidth + 32), ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 90%', end: 'bottom 10%', scrub: 0.8, invalidateOnRefresh: true } });

  // --- Harita ve sayaçlar ---
  const mt = gsap.timeline({ scrollTrigger: { trigger: '.map', start: 'top 75%' } });
  mt.fromTo('.map__tr', { drawSVG: '0%', fillOpacity: 0 }, { drawSVG: '100%', duration: 2, ease: 'power2.inOut' })
    .to('.map__tr', { fillOpacity: 1, duration: 0.6 }, 1.5)
    .fromTo('.map__pt', { scale: 0, transformOrigin: 'center' }, { scale: 1, stagger: 0.15, duration: 0.5, ease: 'back.out(3)' }, 1.4)
    .fromTo('.map__route', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 1.8)
    .fromTo('.map__lb', { opacity: 0 }, { opacity: 1, stagger: 0.1 }, 2);
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const o = { v: 0 };
    gsap.to(o, {
      v: Number(el.dataset.count), duration: 1.6, ease: 'power2.out',
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  gsap.fromTo('.certs li', { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.06, scrollTrigger: { trigger: '.certs', start: 'top 90%' } });

  // --- Final başlık ---
  const fs = new SplitText('.final__title', { type: 'lines', linesClass: 'ln' });
  gsap.fromTo(fs.lines, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.1, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '#iletisim', start: 'top 70%' } });

  // Hangi sahne çizilecek (pinler kurulduktan sonra, doğru mesafelerle)
  ScrollTrigger.create({
    trigger: '#katman', start: 'top bottom', end: 'bottom top',
    onToggle: (s) => gl.setMode(s.isActive ? 'duvar' : 'toz'),
  });
  ScrollTrigger.create({
    trigger: '#sec', start: 'top bottom', endTrigger: 'html', end: 'bottom bottom',
    onToggle: (s) => { glVisible = !s.isActive; canvas.style.visibility = s.isActive ? 'hidden' : 'visible'; },
  });

  // Header: açık zeminde koyu logo
  ScrollTrigger.create({
    trigger: '#katman', start: 'top 60px', endTrigger: 'html', end: 'bottom top',
    onToggle: (s) => top.classList.toggle('is-light', s.isActive),
  });

  // Mıknatıslı butonlar (masaüstü)
  if (fine) {
    document.querySelectorAll('.btn--turuncu').forEach((b) => {
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
