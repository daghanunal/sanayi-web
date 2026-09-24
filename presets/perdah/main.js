// Perdah: Alçıbay için klasik (WebGL'siz) yeniden tasarım önerisi.
// İmza: hero'da tuğla duvar, scroll ile mala darbeleriyle sıvanıp pürüzsüz duvara dönüşür (SVG maske + DrawSVG).
import '../../shared/base.css';
import './style.css';
import raw from '../../data/alcibay.json';
import { boot, initSmoothScroll, esc, asset, icons, gsap, ScrollTrigger, reducedMotion, vitrinModu } from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

const d = boot(raw);
const { isletme: is, konumlar, urunler, paneller, isler, tarihce, belgeler } = d;
const merkez = konumlar[0];
const fabrikalar = konumlar.filter((k) => k.kapasite);
const kapasite = fabrikalar.reduce((a, k) => a + k.kapasite, 0);
const yil = new Date().getFullYear() - is.kurulus;
const nf = new Intl.NumberFormat('tr-TR');
const urun = (id) => urunler.find((u) => u.id === id);
const telHref = (t) => `tel:${t.replace(/[^\d+]/g, '')}`;
const telYaz = (t) => t.replace('+90 ', '0');
const gmaps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const embed = (q) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=13&hl=tr&output=embed`;
const $ = (s, r = document) => r.querySelector(s);

// Mala ikonları: küçük (alt çubuk) ve hero'da duvarı sıvayan büyük mala.
const ICON_MALA = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h13l3-4H6z"/><path d="M12 11V7a2 2 0 0 1 2-2h4"/></svg>`;
const ICON_MALA_BUYUK = `<svg viewBox="0 0 220 150" aria-hidden="true">
  <defs><linearGradient id="bicak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef1f3"/><stop offset=".55" stop-color="#9aa3aa"/><stop offset="1" stop-color="#5d666d"/></linearGradient></defs>
  <path d="M10 104 L176 104 L208 72 L42 72 Z" fill="url(#bicak)" stroke="#3b4247" stroke-width="2"/>
  <path d="M10 104 L176 104 L208 72" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
  <path d="M112 72 L112 44 Q112 34 122 34 L150 34" fill="none" stroke="#3b4247" stroke-width="7" stroke-linecap="round"/>
  <rect x="146" y="22" width="64" height="24" rx="12" fill="#f29d20" stroke="#8a520b" stroke-width="2"/>
  <path d="M40 96 Q110 84 180 92" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-linecap="round"/>
</svg>`;

// Üretici: AutoRepair yerine Organization/Manufacturer yapılandırılmış veri.
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
$('meta[name="description"]').content = `${is.ad}: ${is.kurulus}'den beri yapı alçısı ve alçı plaka. Bala ve Tarsus fabrikaları, günde ${nf.format(kapasite)} ton.`;

// Mobil çubuk: WhatsApp yok; üreticiye uygun kısayollar. Vitrin modunda seçim çubuğu kalır.
if (!vitrinModu()) {
  $('.action-bar')?.remove();
  const bar = document.createElement('nav');
  bar.className = 'action-bar';
  bar.setAttribute('aria-label', 'Hızlı erişim');
  bar.innerHTML = `
    <a href="${telHref(merkez.tel)}" class="action-bar__btn">${icons.phone}<span>Ara</span></a>
    <a href="#bul" class="action-bar__btn action-bar__btn--main">${ICON_MALA}<span>Ürün bul</span></a>
    <a href="${gmaps(merkez.mapsQuery)}" class="action-bar__btn" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>`;
  document.body.append(bar);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

$('#ust').innerHTML = `
  <a class="ust__logo" href="#giris" aria-label="${esc(is.ad)} ana sayfa">
    <img src="${asset('/img/alcibay/logo.png')}" alt="${esc(is.ad)}" width="144" height="25">
  </a>
  <nav class="ust__nav" aria-label="Bölümler">
    <a href="#urunler">Alçılar</a><a href="#plaka">Alçı plaka</a><a href="#kurumsal">Kurumsal</a><a href="#fabrikalar">Fabrikalar</a>
  </nav>
  <a class="ust__tel" href="${telHref(merkez.tel)}">${icons.phone}<span>${esc(telYaz(merkez.tel))}</span></a>`;

// Mala darbeleri ekran pikselinde üretilir (viewBox = sahne boyutu): telefonda da mala her darbede
// ekranın bir ucundan öbürüne gider. Sağdan sola, soldan sağa zikzak; her darbe hafif kavisli.
const SW = innerWidth;
const SH = Math.max(560, Math.round(document.documentElement.clientHeight));
const satir = SW < 700 ? 118 : 150;
const darbeSayisi = Math.ceil(SH / satir) + 1;
const DARBELER = Array.from({ length: darbeSayisi }, (_, i) => {
  const y = Math.round(satir * 0.35 + i * satir);
  const sag = i % 2 === 1;
  const [x0, x1] = sag ? [SW + 60, -60] : [-60, SW + 60];
  const e = satir * 0.22 * (i % 2 ? -1 : 1);
  return `M${x0} ${y} C ${Math.round(SW * 0.3)} ${Math.round(y - e)}, ${Math.round(SW * 0.62)} ${Math.round(y + e)}, ${x1} ${Math.round(y + satir * 0.08)}`;
});
const KALINLIK = Math.round(satir * 1.3);

$('#giris').innerHTML = `
  <div class="giris__sahne" aria-hidden="true">
    <svg class="giris__svg" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="xMidYMid slice">
      <defs>
        <mask id="sivaMaske" maskUnits="userSpaceOnUse" x="-100" y="-100" width="${SW + 200}" height="${SH + 200}">
          <rect x="-100" y="-100" width="${SW + 200}" height="${SH + 200}" fill="black"/>
          ${DARBELER.map((p) => `<path class="giris__darbe" d="${p}" fill="none" stroke="white" stroke-width="${KALINLIK}" stroke-linecap="round"/>`).join('')}
        </mask>
        <filter id="sivaKenar" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/>
          <feDisplacementMap in="SourceGraphic" scale="34"/>
        </filter>
      </defs>
      <image href="${asset('/img/alcibay/tugla.jpg')}" x="0" y="0" width="${SW}" height="${SH}" preserveAspectRatio="xMidYMid slice"/>
      <g mask="url(#sivaMaske)">
        <image href="${asset('/img/alcibay/duvar-doku.jpg')}" x="-40" y="-40" width="${SW + 80}" height="${SH + 80}" preserveAspectRatio="xMidYMid slice" filter="url(#sivaKenar)"/>
      </g>
      <image class="giris__son" href="${asset('/img/alcibay/bos-mekan.jpg')}" x="0" y="0" width="${SW}" height="${SH}" preserveAspectRatio="xMidYMid slice" opacity="0"/>
    </svg>
    <div class="giris__mala">${ICON_MALA_BUYUK}</div>
  </div>
  <div class="giris__kart">
    <p class="giris__ust">${esc(is.kurulus)}'den beri Ankara'da yapı alçısı</p>
    <h1 class="giris__baslik" id="giris-baslik"><span data-evre="0">Duvar önce böyle.</span><span data-evre="1">Sonra bir kat sıva.</span><span data-evre="2">Perdahla pürüzsüz.</span></h1>
    <p class="giris__metin">Sıvadan perdaha, kartonpiyerden alçı plakaya; Bala ve Tarsus'taki iki fabrikamızda günde ${nf.format(kapasite)} ton alçı üretiyoruz.</p>
    <div class="giris__butonlar">
      <a class="btn btn--turuncu" href="#bul">Doğru alçıyı bul</a>
      <a class="btn btn--cizgi" href="${telHref(merkez.tel)}">${icons.phone}<span>Teknik danışmanlık</span></a>
    </div>
    <ol class="giris__adim" aria-hidden="true"><li class="is-aktif">Tuğla</li><li>Sıva</li><li>Perdah</li></ol>
  </div>`;

$('#rakam').innerHTML = `
  <ul class="rakam__liste">
    <li><b data-say="${yil}">${yil}</b><span>yıldır üretimde</span></li>
    <li><b data-say="${kapasite}">${nf.format(kapasite)}</b><span>ton/gün toplam kapasite</span></li>
    <li><b data-say="${fabrikalar.length}">${fabrikalar.length}</b><span>fabrika: Bala ve Tarsus</span></li>
    <li><b data-say="${urunler.length + paneller.length}">${urunler.length + paneller.length}</b><span>ürün: ${urunler.length} toz alçı, ${paneller.length} alçı plaka</span></li>
  </ul>`;

// --- Ürün bulucu -----------------------------------------------------------
$('#bul').innerHTML = `
  <div class="bolum__bas">
    <p class="bolum__no">Ürün bulucu</p>
    <h2 class="bolum__baslik" id="bul-baslik">Ne yapacaksınız?</h2>
    <p class="bolum__giris">İşi seçin, doğru torbayı ve teknik değerlerini gösterelim.</p>
  </div>
  <div class="bul">
    <div class="bul__isler" role="tablist" aria-label="Yapılacak iş">
      ${isler.map((x, i) => `<button type="button" class="bul__is" role="tab" aria-selected="${i === 0}" data-is="${x.id}">${esc(x.soru)}</button>`).join('')}
    </div>
    <div class="bul__sonuc" id="bul-sonuc" aria-live="polite"></div>
  </div>`;

function anahtarlar(u, yokNotu = true) {
  if (u.anahtar.length) return `<dl class="anahtar">${u.anahtar.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  return yokNotu ? '<p class="anahtar anahtar--yok">Teknik değerler için teknik danışmanlığımızı arayın.</p>' : '';
}

function bulSonuc(id) {
  const x = isler.find((i) => i.id === id);
  const el = $('#bul-sonuc');
  if (x.panel) {
    el.innerHTML = `
      <p class="bul__not">${esc(x.not)}</p>
      <ul class="bul__paneller">
        ${paneller.map((p) => `
          <li><a href="#plaka" data-panel-git="${p.id}">
            <span class="karton">${p.karton.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
            <b>${esc(p.ad)}</b><span>${esc(p.tanim)}</span></a></li>`).join('')}
      </ul>`;
  } else {
    const u = urun(x.urun);
    el.innerHTML = `
      <article class="oneri" style="--u:${u.renk}">
        <img class="oneri__torba" src="${u.torba}" alt="${esc(u.ad)} torbası" width="191" height="245" loading="lazy">
        <div class="oneri__metin">
          <p class="oneri__etiket">Önerimiz</p>
          <h3>${esc(u.ad)}</h3>
          <p>${esc(x.not)}</p>
          ${anahtarlar(u)}
          <button type="button" class="btn btn--koyu btn--kucuk" data-foy="${u.id}">Teknik föyü aç</button>
        </div>
      </article>`;
  }
  if (!reducedMotion) gsap.fromTo(el.firstElementChild, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' });
}

// --- Ürün yelpazesi --------------------------------------------------------
$('#urunler').innerHTML = `
  <div class="bolum__bas">
    <p class="bolum__no">Toz alçılar</p>
    <h2 class="bolum__baslik" id="urunler-baslik">Her kat için bir torba.</h2>
    <p class="bolum__giris">Değerler üretici teknik föylerinden alınmıştır. Tamamı TS EN 13279-1 kapsamında.</p>
  </div>
  <ul class="urunler">
    ${urunler.map((u) => `
      <li class="urun" style="--u:${u.renk}">
        <div class="urun__gorsel"><img src="${u.torba}" alt="${esc(u.ad)} torbası" width="191" height="245" loading="lazy"></div>
        <div class="urun__metin">
          <h3>${esc(u.ad)}</h3>
          <p>${esc(u.kisa)}</p>
          ${anahtarlar(u, false)}
          ${u.artilar.length ? `<ul class="urun__arti">${u.artilar.slice(0, 4).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
          ${u.teknik.length ? `<button type="button" class="urun__foy" data-foy="${u.id}">Teknik föy</button>` : `<a class="urun__foy" href="${telHref(merkez.tel)}">Bilgi için arayın</a>`}
        </div>
      </li>`).join('')}
  </ul>`;

// --- Uygulama sırası (gerçek sıra: ilk kat → son kat → boya) --------------
const sira = [
  ['Tuğla, beton, gazbeton', 'Yüzey tozdan ve yağdan arındırılır, ıslatılır.', null],
  ['İlk kat: sıva', urun('perlitli').kisa, 'perlitli'],
  ['Son kat: perdah', urun('saten').kisa, 'saten'],
  ['Boyaya hazır', 'Makine ile tek katta bitirmek isterseniz: ' + urun('makina').ad + '.', 'makina'],
];
$('#sira').innerHTML = `
  <div class="sira__foto"><img src="${asset('/img/alcibay/uygulama.jpg')}" alt="Usta mala ile duvara son kat alçı uyguluyor" width="1335" height="2000" loading="lazy"></div>
  <div class="sira__metin">
    <p class="bolum__no">Uygulama sırası</p>
    <h2 class="bolum__baslik" id="sira-baslik">Tuğladan boyaya dört adım.</h2>
    <ol class="sira__liste">
      ${sira.map(([b, m, id], i) => `
        <li>
          <span class="sira__no">${i + 1}</span>
          <div><h3>${esc(b)}</h3><p>${esc(m)}</p>${id ? `<button type="button" class="sira__urun" data-foy="${id}" style="--u:${urun(id).renk}">${esc(urun(id).ad)}</button>` : ''}</div>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Alçı plaka ------------------------------------------------------------
$('#plaka').innerHTML = `
  <div class="bolum__bas">
    <p class="bolum__no">Alçı plaka</p>
    <h2 class="bolum__baslik" id="plaka-baslik">Kartonun rengi ortamı söyler.</h2>
    <p class="bolum__giris">Ekopan ailesi TS EN 520 + A1 standardında üretilir.</p>
  </div>
  <div class="plaka">
    <div class="plaka__sekmeler" role="tablist" aria-label="Alçı plaka türü">
      ${paneller.map((p, i) => `
        <button type="button" role="tab" class="plaka__sekme" aria-selected="${i === 0}" data-panel="${p.id}">
          <span class="karton">${p.karton.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
          <b>${esc(p.ad)}</b><span>${esc(p.tanim)}</span>
        </button>`).join('')}
    </div>
    <div class="plaka__detay" id="plaka-detay" role="tabpanel"></div>
  </div>`;

function panelDetay(id) {
  const p = paneller.find((x) => x.id === id);
  $('#plaka-detay').innerHTML = `
    <div class="plaka__gorsel"><img src="${p.gorsel}" alt="${esc(p.ad)} alçı plaka paleti" width="1000" height="714" loading="lazy"></div>
    <div class="plaka__bilgi">
      <h3>${esc(p.ad)} <span>${esc(p.kartonAd)}</span></h3>
      <p>${esc(p.metin)}</p>
      <dl class="anahtar anahtar--satir"><div><dt>Kullanım alanları</dt><dd>${esc(p.alanlar)}</dd></div><div><dt>Standart</dt><dd>${esc(p.standart)}</dd></div></dl>
      <div class="tablo" data-lenis-prevent>
        <table>
          <thead><tr><th>Kalınlık</th><th>Genişlik</th><th>Uzunluk</th><th>Ağırlık</th><th>Palet (adet)</th></tr></thead>
          <tbody>${p.olculer.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  if (!reducedMotion) gsap.fromTo('#plaka-detay > *', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' });
}

// --- Kurumsal --------------------------------------------------------------
$('#kurumsal').innerHTML = `
  <div class="kurumsal__ust">
    <div>
      <p class="bolum__no">Kurumsal</p>
      <h2 class="bolum__baslik" id="kurumsal-baslik">${esc(is.kurulus)}'den beri hızlı beyaz.</h2>
    </div>
    <div class="kurumsal__metin">
      <p>${esc(is.hakkinda)}</p>
      <p class="kurumsal__unvan">${esc(is.unvan)}</p>
    </div>
  </div>
  <ol class="tarih" data-lenis-prevent aria-label="Alçının tarihi">
    ${tarihce.map(([y, m]) => `<li class="${/^(19|20)\d\d$/.test(y) ? 'tarih--biz' : ''}"><b>${esc(y)}</b><span>${esc(m)}</span></li>`).join('')}
  </ol>
  <div class="belgeler">
    <h3>Belgeler ve standartlar</h3>
    <ul>${belgeler.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
  </div>`;

// --- Fabrikalar ------------------------------------------------------------
const bala = konumlar.find((k) => k.id === 'bala');
const tarsus = konumlar.find((k) => k.id === 'tarsus');
$('#fabrikalar').innerHTML = `
  <div class="bolum__bas">
    <p class="bolum__no">Üretim</p>
    <h2 class="bolum__baslik" id="fabrikalar-baslik">İki fabrika, günde ${nf.format(kapasite)} ton.</h2>
  </div>
  <div class="fab">
    <figure class="fab__harita">
      <svg viewBox="${d.harita.viewBox}" role="img" aria-label="Türkiye haritasında Alçıbay merkez ve fabrikaları">
        <path class="harita__tr" d="${d.harita.path}"/>
        <path class="harita__yol" d="M${bala.xy[0]} ${bala.xy[1]} Q ${bala.xy[0] + 150} ${(bala.xy[1] + tarsus.xy[1]) / 2 - 30} ${tarsus.xy[0]} ${tarsus.xy[1]}"/>
        ${konumlar.map((k) => `<g class="harita__nokta harita__nokta--${k.id}" transform="translate(${k.xy[0]} ${k.xy[1]})"><circle r="${k.kapasite ? 14 : 9}"/></g>`).join('')}
        <text class="harita__ad" x="${merkez.xy[0] - 18}" y="${merkez.xy[1] - 16}" text-anchor="end">Merkez</text>
        <text class="harita__ad" x="${bala.xy[0] + 22}" y="${bala.xy[1] + 10}">Bala</text>
        <text class="harita__ad" x="${tarsus.xy[0] + 24}" y="${tarsus.xy[1] + 10}">Tarsus</text>
      </svg>
    </figure>
    <ul class="fab__liste">
      ${konumlar.map((k) => `
        <li class="yer">
          <h3>${esc(k.ad)}</h3>
          ${k.kapasite ? `<p class="yer__kap"><b>${nf.format(k.kapasite)}</b> ton/gün${k.acilis ? `, ${k.acilis}'den beri` : ''}</p>` : '<p class="yer__kap">Genel müdürlük ve satış</p>'}
          <p>${esc(k.adres)}<br>${esc(k.il)}</p>
          ${k.not ? `<p class="yer__not">${esc(k.not)}</p>` : ''}
          <p class="yer__tel"><a href="${telHref(k.tel)}">${esc(k.tel)}</a><span>Faks ${esc(k.faks)}</span></p>
          <div class="yer__btn">
            <a class="btn btn--cizgi btn--kucuk" href="${gmaps(k.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            <button type="button" class="btn btn--cizgi btn--kucuk" data-harita="${k.id}">Haritada gör</button>
          </div>
        </li>`).join('')}
    </ul>
  </div>
  <div class="fab__embed" id="embed" data-q="${esc(merkez.mapsQuery)}"><p>Harita yükleniyor</p></div>`;

// --- Final + footer --------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="final__ic">
    <h2 class="final__baslik" id="iletisim-baslik">Şantiyeniz için doğru alçıyı birlikte seçelim.</h2>
    <p>Teknik danışmanlık hattımız sarfiyat, uygulama ve depolama sorularınızı yanıtlar.</p>
    <a class="btn btn--turuncu btn--buyuk" href="${telHref(merkez.tel)}">${icons.phone}<span>${esc(merkez.tel)}</span></a>
    <ul class="final__guv">${d.guvenlik.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
    <p class="final__saklama">${esc(d.saklama)}</p>
  </div>`;

$('#alt').innerHTML = `
  <div class="alt__ic">
    <img src="${asset('/img/alcibay/logo.png')}" alt="${esc(is.ad)}" width="144" height="25" loading="lazy">
    <p>${esc(is.unvan)}<br>${esc(merkez.adres)}, ${esc(merkez.il)}</p>
    <p class="alt__not">Bu sayfa Alçıbay için hazırlanmış bir tasarım önerisidir. Ürün bilgileri alcibay.com'dan alınmıştır; uygulama değerleri şantiye koşullarına göre değişebilir. Fotoğraflar: Alçıbay ve Pexels.</p>
    <p class="alt__telif">© ${new Date().getFullYear()} ${esc(is.ad)}</p>
  </div>`;

// ---------------------------------------------------------------------------
// Teknik föy (dialog)
// ---------------------------------------------------------------------------
const foy = $('#foy');
function foyAc(id) {
  const u = urun(id);
  foy.style.setProperty('--u', u.renk);
  foy.innerHTML = `
    <div class="foy__ic" data-lenis-prevent>
      <header class="foy__bas">
        <img src="${u.torba}" alt="" width="96" height="123">
        <div><p class="foy__etiket">Teknik föy</p><h2>${esc(u.ad)}</h2><p>${esc(u.kisa)}</p></div>
        <button type="button" class="foy__kapat" data-kapat aria-label="Kapat">×</button>
      </header>
      ${u.teknik.length ? `<h3>Teknik değerler</h3><table class="foy__tablo"><tbody>${u.teknik.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${u.kullanim.length ? `<h3>Uygulama</h3><ol class="foy__liste">${u.kullanim.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      ${u.dikkat.length ? `<h3>Dikkat edilecekler</h3><ul class="foy__liste foy__liste--nokta">${u.dikkat.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h3>Depolama</h3><p>${esc(d.saklama)}</p>
      <div class="foy__alt">
        <button type="button" class="btn btn--koyu btn--kucuk" data-yazdir>Yazdır</button>
        <a class="btn btn--cizgi btn--kucuk" href="${telHref(merkez.tel)}">${icons.phone}<span>Teknik danışmanlık</span></a>
      </div>
    </div>`;
  foy.showModal();
  window.__lenis?.stop();
}
foy.addEventListener('close', () => window.__lenis?.start());
foy.addEventListener('click', (e) => {
  if (e.target === foy || e.target.closest('[data-kapat]')) foy.close();
  if (e.target.closest('[data-yazdir]')) window.print();
});

// ---------------------------------------------------------------------------
// Etkileşim
// ---------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-foy]');
  if (f) return foyAc(f.dataset.foy);
  const is_ = e.target.closest('[data-is]');
  if (is_) {
    document.querySelectorAll('[data-is]').forEach((b) => b.setAttribute('aria-selected', String(b === is_)));
    return bulSonuc(is_.dataset.is);
  }
  const p = e.target.closest('[data-panel]');
  if (p) {
    document.querySelectorAll('[data-panel]').forEach((b) => b.setAttribute('aria-selected', String(b === p)));
    return panelDetay(p.dataset.panel);
  }
  const pg = e.target.closest('[data-panel-git]');
  if (pg) {
    const hedef = document.querySelector(`[data-panel="${pg.dataset.panelGit}"]`);
    document.querySelectorAll('[data-panel]').forEach((b) => b.setAttribute('aria-selected', String(b === hedef)));
    panelDetay(pg.dataset.panelGit);
  }
  const h = e.target.closest('[data-harita]');
  if (h) {
    const k = konumlar.find((x) => x.id === h.dataset.harita);
    haritaYukle(k.mapsQuery);
    window.__lenis ? window.__lenis.scrollTo('#embed', { offset: -90 }) : $('#embed').scrollIntoView({ behavior: 'smooth' });
  }
});

function haritaYukle(q) {
  const el = $('#embed');
  el.innerHTML = `<iframe title="Alçıbay konumu" src="${embed(q)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  el.dataset.yuklu = '1';
}

bulSonuc(isler[0].id);
panelDetay(paneller[0].id);

// ---------------------------------------------------------------------------
// Hareket
// ---------------------------------------------------------------------------
initSmoothScroll();

// Harita yaklaşınca yüklenir.
new IntersectionObserver((entries, io) => {
  if (entries[0].isIntersecting) {
    if (!$('#embed').dataset.yuklu) haritaYukle($('#embed').dataset.q);
    io.disconnect();
  }
}, { rootMargin: '600px 0px' }).observe($('#embed'));

// Header: hero geçilince zemin alır.
ScrollTrigger.create({ start: 'top -40', onToggle: (s) => $('#ust').classList.toggle('is-dolu', s.isActive) });

const darbeler = gsap.utils.toArray('.giris__darbe');
const evreler = gsap.utils.toArray('.giris__baslik [data-evre]');
const adimlar = gsap.utils.toArray('.giris__adim li');
const evre = (n) => {
  evreler.forEach((el, i) => el.classList.toggle('is-aktif', i === n));
  adimlar.forEach((el, i) => el.classList.toggle('is-aktif', i <= n));
};

if (reducedMotion) {
  gsap.set(darbeler, { drawSVG: '100%' });
  gsap.set('.giris__son', { opacity: 1 });
  gsap.set('.giris__mala', { autoAlpha: 0 });
  evre(2);
  document.querySelectorAll('[data-say]').forEach((el) => (el.textContent = nf.format(+el.dataset.say)));
} else {
  gsap.set(darbeler, { drawSVG: '0%' });
  evre(0);

  // İmza: mala her darbede duvarı bir şerit sıvar; en sonda perdahlı pürüzsüz mekân belirir.
  const mala = $('.giris__mala');
  const svg = $('.giris__svg');
  const uzunluk = darbeler.map((p) => p.getTotalLength());
  const malaKonum = (i, t) => {
    // Path noktasını sahne koordinatına çevirir (slice ölçeği ve kaymasıyla).
    const p = darbeler[i].getPointAtLength(uzunluk[i] * t);
    const m = svg.getScreenCTM();
    const r = $('.giris__sahne').getBoundingClientRect();
    return { x: m.a * p.x + m.e - r.left, y: m.d * p.y + m.f - r.top };
  };
  gsap.set(mala, { xPercent: -30, yPercent: -62 });
  const durum = { t: 0 };
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#giris',
      start: 'top top',
      end: '+=220%',
      pin: true,
      scrub: 0.6,
      onUpdate: (s) => {
        const p = s.progress;
        evre(p < 0.12 ? 0 : p < 0.8 ? 1 : 2);
      },
    },
  });
  const pay = 0.8 / darbeler.length;
  darbeler.forEach((path, i) => {
    tl.to(path, { drawSVG: '100%', duration: pay }, 0.08 + i * pay);
  });
  tl.to(durum, {
    t: darbeler.length,
    duration: pay * darbeler.length,
    onUpdate: () => {
      const i = Math.min(darbeler.length - 1, Math.floor(durum.t));
      const { x, y } = malaKonum(i, durum.t - i);
      const yon = i % 2 === 0 ? 1 : -1;
      gsap.set(mala, { x, y, scaleX: yon, autoAlpha: 1 });
    },
  }, 0.08);
  tl.to('.giris__son', { opacity: 1, duration: 0.12 }, 0.86);
  tl.to(mala, { autoAlpha: 0, duration: 0.05 }, 0.88);
  tl.to({}, { duration: 0.04 });
  gsap.set(mala, { autoAlpha: 0 });

  // Rakamlar sayar.
  document.querySelectorAll('[data-say]').forEach((el) => {
    const hedef = +el.dataset.say;
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
    });
  });

  // Bölüm başlıklarının altında mala izi gibi bir çizgi çekilir.
  document.querySelectorAll('.bolum__baslik').forEach((el) => {
    gsap.fromTo(el, { '--iz': 0 }, { '--iz': 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  // Ürün kartları: torbalar sırayla rafa oturur.
  ScrollTrigger.batch('.urun', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.fromTo(els.map((e) => e.querySelector('img')), { yPercent: 16, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' }),
  });

  // Uygulama sırası: fotoğraf içeride yavaş kayar, adımlar sırayla koyulaşır.
  gsap.fromTo('.sira__foto img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#sira', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.utils.toArray('.sira__liste li').forEach((li) => {
    ScrollTrigger.create({ trigger: li, start: 'top 70%', onEnter: () => li.classList.add('is-aktif'), onLeaveBack: () => li.classList.remove('is-aktif') });
  });

  // Harita: rota çizilir, noktalar belirir.
  gsap.set('.harita__yol', { drawSVG: '0%' });
  gsap.timeline({ scrollTrigger: { trigger: '.fab__harita', start: 'top 75%', once: true } })
    .fromTo('.harita__tr', { opacity: 0 }, { opacity: 1, duration: 0.6 })
    .fromTo('.harita__nokta', { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' }, '-=0.2')
    .to('.harita__yol', { drawSVG: '100%', duration: 1, ease: 'power2.inOut' });
}

// Görseller yüklenince pin mesafeleri yeniden hesaplanır.
addEventListener('load', () => ScrollTrigger.refresh());
