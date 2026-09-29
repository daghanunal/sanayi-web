// Priz: Alçıbay için kinetik (WebGL'siz) yeniden tasarım önerisi.
// Künyede firmanın adı harf harf toz gibi yağar; ürün adları şerit hâlinde akar, kullanım süreleri
// kaydırdıkça dolan çubuklarla gösterilir. Pinli hikâye yok.
import '../../shared/base.css';
import './style.css';
import raw from '../../data/alcibay.json';
import {
  boot, initSmoothScroll, esc, asset, icons, gsap, ScrollTrigger, reducedMotion, vitrinModu, mapsEmbed, yilEki,
} from '../../shared/core.js';

const d = boot(raw);
const { isletme: is, konumlar, urunler, paneller, isler, tarihce, belgeler } = d;
const merkez = konumlar[0];
const fabrikalar = konumlar.filter((k) => k.kapasite);
const yil = new Date().getFullYear() - is.kurulus;
const nf = new Intl.NumberFormat('tr-TR');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const urun = (id) => urunler.find((u) => u.id === id);
const tel = d.iletisim.telefon;
const telHref = (t) => `tel:${t.replace(/[^\d+]/g, '')}`;
const telYaz = (t) => t.replace(/^\+90\s?/, '0');
const gmaps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const upper = (s) => s.toLocaleUpperCase('tr-TR');
const mobile = matchMedia('(max-width: 759px)').matches;
// Kart yığını (sticky) yalnız geniş ve yeterince yüksek ekranda; CSS ile aynı koşul
const yiginMod = false; // Yapışkan kart yığını kaldırıldı (kısa yatay iPad'de kart ekranın %60'ını kaplıyordu)
const yilDen = yilEki; // 1992'den (çekirdek)

// Rengin üstüne beyaz mı koyu mu yazı gelsin
const acikMi = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3;
};
const harfler = (s, cls = 'h') =>
  [...s].map((c) => (c === ' ' ? '<span class="bosluk"> </span>' : `<span class="${cls}">${esc(c)}</span>`)).join('');

const ICON_BUL = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>`;
const OK = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

// --- SEO: üretici --------------------------------------------------------------
document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
const ld = document.createElement('script');
ld.type = 'application/ld+json';
ld.textContent = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': ['Organization', 'Manufacturer'],
  name: is.ad,
  legalName: is.unvan,
  foundingDate: String(is.kurulus),
  telephone: tel,
  faxNumber: merkez.faks,
  address: { '@type': 'PostalAddress', streetAddress: merkez.adres, addressLocality: 'Çankaya', addressRegion: 'Ankara', addressCountry: 'TR' },
  makesOffer: [...urunler, ...paneller].map((u) => ({ '@type': 'Offer', itemOffered: { '@type': 'Product', name: u.ad } })),
});
document.head.append(ld);
document.title = `${is.ad} | Yapı alçıları ve alçı plaka | Ankara`;
$('meta[name="description"]').content = `${is.ad}: ${is.tanim}. Merkez Çankaya/Ankara; fabrikalar Bala/Ankara ve Tarsus/Mersin. Telefon: ${tel}`;

// Mobil çubuk: WhatsApp hattı yok; üreticiye uygun kısayollar. Vitrin modunda seçim çubuğu kalır.
if (!vitrinModu()) {
  $('.action-bar')?.remove();
  const bar = document.createElement('nav');
  bar.className = 'action-bar';
  bar.setAttribute('aria-label', 'Hızlı erişim');
  bar.innerHTML = `
    <a href="${telHref(tel)}" class="action-bar__btn">${icons.phone}<span>Ara</span></a>
    <a href="#urunler" class="action-bar__btn action-bar__btn--main">${ICON_BUL}<span>Ürünler</span></a>
    <a href="${gmaps(merkez.mapsQuery)}" class="action-bar__btn" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>`;
  document.body.append(bar);
}

// --- Header -------------------------------------------------------------------
// Firmanın logosu kullanılmaz: kelime logo
const logo = `<span class="ust__ad">${esc(is.ad)}</span>`;
$('#ust').innerHTML = `
  <a class="ust__logo" href="#giris" aria-label="${esc(is.ad)} ana sayfa">${logo}</a>
  <nav class="ust__nav" aria-label="Bölümler">
    <a href="#urunler">Ürünler</a><a href="#plaka">Alçı plaka</a><a href="#hakkinda">Hakkında</a><a href="#fabrikalar">Fabrikalar</a><a href="#iletisim">İletişim</a>
  </nav>
  <a class="ust__tel" href="${telHref(tel)}">${icons.phone}<span>${esc(telYaz(tel))}</span></a>`;

// --- Künye: firmanın adı harf harf toz gibi yağar ------------------------------------
$('#giris').innerHTML = `
  <div class="hero__ic">
    <h1 class="hero__baslik" id="hero-baslik" aria-label="${esc(is.ad)}">
      <span class="hero__satir" aria-hidden="true">${harfler(is.ad)}</span>
    </h1>
    <figure class="hero__foto"><img src="${asset('/img/alcibay/uygulama.jpg')}" alt="Çelik mala ile duvara son kat alçı çekiliyor" width="1333" height="2000" fetchpriority="high"></figure>
    <div class="hero__alt">
      <p class="hero__tanim">${esc(is.tanim)}</p>
      <dl class="kunye">
        <div><dt>Merkez</dt><dd>${esc(merkez.adres)}, ${esc(merkez.il)}</dd></div>
        <div><dt>Fabrikalar</dt><dd>${fabrikalar.map((k) => esc(k.il.split(' / ').slice(-2).join(' / '))).join(' · ')}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(tel)}">${esc(tel)}</a></dd></div>
      </dl>
      <div class="hero__btn">
        <a class="btn btn--beyaz" href="${telHref(tel)}">${icons.phone}<span>Ara</span></a>
        <a class="btn btn--cizgi" href="#urunler"><span>Ürünler</span></a>
        <a class="btn btn--cizgi" href="${gmaps(merkez.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </div>
    </div>
  </div>`;

// --- Şerit: yedi torba, yedi renk ----------------------------------------------
const seritIc = urunler.map((u) => `<span class="serit__k" style="--c:${u.renk}"><i></i>${esc(u.ad)}</span>`).join('');
$('.serit').innerHTML = `<div class="serit__yol" aria-hidden="true">${seritIc}${seritIc}</div>
  <p class="sr-only">${urunler.map((u) => esc(u.ad)).join(', ')}</p>`;

const dakika = (u) => {
  const x = u.anahtar.find(([k]) => /kullanım süresi/i.test(k))?.[1] || '';
  return parseInt(x.replace(/\D+/g, ' ').trim(), 10) || 0;
};
const prizler = urunler.filter((u) => dakika(u)).sort((a, b) => dakika(a) - dakika(b));
const maxDk = Math.max(...prizler.map(dakika));

// --- Ne yapacaksınız? -------------------------------------------------------------
$('#is').innerHTML = `
  <div class="kap">
    <h2 id="is-baslik" class="dev">Ürün seçimi</h2>
    <p class="is__giris">Yapılacak iş seçilince uygun ürün ve teknik değerleri açılır.</p>
    <ul class="is__liste">
      ${isler
        .map((x, i) => {
          const u = x.urun ? urun(x.urun) : null;
          const c = u ? u.renk : '#1f33d6';
          const cevap = u
            ? `<div class="is__cevap-ic">
                <img src="${asset(u.torba)}" alt="" width="600" height="800" loading="lazy">
                <div>
                  <p class="is__oner">Uygun ürün</p>
                  <h3>${esc(u.ad)}</h3>
                  <p>${esc(x.not)}</p>
                  ${u.anahtar.length ? `<dl class="deger">${u.anahtar.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
                  <button type="button" class="btn btn--kucuk" data-foy="${u.id}">Teknik föy</button>
                </div>
              </div>`
            : `<div class="is__cevap-ic is__cevap-ic--plaka">
                <div>
                  <p class="is__oner">Uygun ürün</p>
                  <h3>Ekopan alçı plaka</h3>
                  <p>${esc(x.not)} Kartonun rengi plakanın tipini gösterir:</p>
                  <ul class="mini-plaka">${paneller.map((p) => `<li><i style="background:${p.karton.length > 1 ? `linear-gradient(90deg,${p.karton[0]} 50%,${p.karton[1]} 50%)` : p.karton[0]}"></i>${esc(p.ad)} <span>${esc(p.tanim)}</span></li>`).join('')}</ul>
                  <a class="btn btn--kucuk" href="#plaka">Plakalara git</a>
                </div>
              </div>`;
          return `<li class="is__k" style="--c:${c}">
            <button type="button" class="is__soru" aria-expanded="false" aria-controls="cevap-${x.id}">
              <span class="is__no">${String(i + 1).padStart(2, '0')}</span><span class="is__metin">${esc(x.soru)}</span>${OK}
            </button>
            <div class="is__cevap" id="cevap-${x.id}" hidden>${cevap}</div>
          </li>`;
        })
        .join('')}
    </ul>
  </div>`;

$$('.is__soru').forEach((b) =>
  b.addEventListener('click', () => {
    const acik = b.getAttribute('aria-expanded') === 'true';
    $$('.is__soru').forEach((o) => {
      o.setAttribute('aria-expanded', 'false');
      o.nextElementSibling.hidden = true;
      o.parentElement.classList.remove('is-acik');
    });
    if (!acik) {
      b.setAttribute('aria-expanded', 'true');
      const c = b.nextElementSibling;
      c.hidden = false;
      b.parentElement.classList.add('is-acik');
      if (!reducedMotion) gsap.fromTo(c.firstElementChild, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    }
    ScrollTrigger.refresh();
  })
);

// --- Ürünler ------------------------------------------------------------------
$('#urunler').innerHTML = `
  <div class="kap">
    <div class="bolum-bas">
      <p class="etiket">Yapı alçıları</p>
      <h2 id="urunler-baslik" class="dev">Ürünler</h2>
      <p>Yedi yapı alçısı ve dört alçı plaka tipi üretilir. Karta dokununca teknik föy açılır.</p>
    </div>
    <ul class="torbalar">
      ${urunler
        .map(
          (u) => `<li class="torba ${acikMi(u.renk) ? 'torba--acik' : ''}" style="--c:${u.renk}">
        <button type="button" data-foy="${u.id}" aria-label="${esc(u.ad)}: teknik föy">
          <img src="${asset(u.torba)}" alt="" width="600" height="800" loading="lazy">
          <span class="torba__ad">${esc(u.ad)}</span>
          <span class="torba__kisa">${esc(u.kisa)}</span>
          <span class="torba__dk">${dakika(u) ? `Kullanım süresi en az ${dakika(u)} dk` : 'Teknik bilgi için arayın'}</span>
        </button>
      </li>`
        )
        .join('')}
    </ul>
  </div>`;

// Kullanım süreleri (teknik föylerden): çubuklar kaydırınca dolar
$('#urunler .kap').insertAdjacentHTML('beforeend', `
  <div class="sure">
    <h3 class="sure__bas">Kullanım süreleri</h3>
    <p class="sure__not">Su katıldıktan sonra harcın en az ne kadar süre kullanılabileceği, ürün föylerine göre.</p>
    <ol class="sure__liste">
      ${prizler.map((u) => `<li style="--c:${u.renk};--x:${dakika(u) / maxDk}"><span class="sure__ad">${esc(u.ad)}</span><span class="sure__cubuk"><i></i></span><b>${dakika(u)} dk</b></li>`).join('')}
    </ol>
  </div>`);

// --- Alçı plaka: üst üste binen kartlar ----------------------------------------
$('#plaka').innerHTML = `
  <div class="kap">
    <div class="bolum-bas">
      <p class="etiket">Ekopan · TS EN 520</p>
      <h2 id="plaka-baslik" class="dev">Alçı plaka</h2>
    </div>
  </div>
  <div class="yigin">
    ${paneller
      .map((p, i) => {
        const bg = p.karton.length > 1 ? `linear-gradient(115deg, ${p.karton[0]} 0 55%, ${p.karton[1]} 55%)` : p.karton[0];
        return `<article class="kart" style="--bg:${bg};--i:${i}">
          <div class="kart__ic">
            <div class="kart__bas">
              <span class="kart__no">${String(i + 1).padStart(2, '0')}/${String(paneller.length).padStart(2, '0')}</span>
              <h3>${esc(p.ad)}</h3>
              <p class="kart__tanim">${esc(p.tanim)} · ${esc(p.kartonAd)}</p>
            </div>
            <img src="${asset(p.gorsel)}" alt="${esc(p.ad)} alçı plaka paleti" width="1000" height="714" loading="lazy">
            <div class="kart__govde">
              <p>${esc(p.metin)}</p>
              <p><b>Kullanım:</b> ${esc(p.alanlar)}</p>
              <p class="kart__std">${esc(p.standart)}</p>
              <div class="tablo-kap"><table>
                <thead><tr><th>Kalınlık</th><th>Genişlik</th><th>Uzunluk</th><th>Ağırlık</th><th>Adet/palet</th></tr></thead>
                <tbody>${p.olculer.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
              </table></div>
            </div>
          </div>
        </article>`;
      })
      .join('')}
  </div>`;

// --- Hakkında ---------------------------------------------------------------------
const rakamlar = [
  ...fabrikalar.map((f) => ({ v: f.kapasite, e: 'ton/gün', a: `${f.il.split(' / ').slice(-2)[0]} fabrikası${f.acilis ? `, ${f.acilis}'den beri` : ''}` })),
  { v: yil, e: 'yıl', a: `${yilDen(is.kurulus)} beri` },
  { v: urunler.length, e: 'toz alçı', a: `ve ${paneller.length} alçı plaka tipi` },
];
$('#hakkinda').innerHTML = `
  <div class="kap">
    <div class="bolum-bas">
      <h2 id="hakkinda-baslik" class="dev">Hakkında</h2>
      <p class="hakkinda__metin">${esc(is.ad)} ${yilDen(is.kurulus)} beri yapı alçısı üretiyor. ${esc(is.hakkinda)}</p>
      <p class="hakkinda__unvan">${esc(is.unvan)}</p>
    </div>
  </div>
  <dl class="rakam__liste">${rakamlar
    .map((r) => `<div class="rakam__k"><dd><span class="rakam__v" data-v="${r.v}">${nf.format(r.v)}</span></dd><dt><b>${esc(r.e)}</b><span>${esc(r.a)}</span></dt></div>`)
    .join('')}</dl>
  <div class="kap hakkinda__alt">
    <div>
      <h3 class="hakkinda__h3">Tarihçe</h3>
      <ol class="tarih__liste">${tarihce.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol>
    </div>
    <div>
      <h3 class="hakkinda__h3">Belgeler ve standartlar</h3>
      <ul class="belge" aria-label="Belgeler">${belgeler.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </div>
  </div>`;

// --- Fabrikalar ---------------------------------------------------------------
const [vx, vy, vw, vh] = d.harita.viewBox.split(' ').map(Number);
$('#fabrikalar').innerHTML = `
  <div class="kap">
    <div class="bolum-bas">
      <h2 id="yer-baslik" class="dev">Merkez ve fabrikalar</h2>
    </div>
    <figure class="harita">
      <svg viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="Türkiye haritasında Alçıbay konumları">
        <path class="harita__yol" d="${esc(d.harita.path)}"/>
        ${konumlar
          .map(
            (k) => `<g class="harita__n harita__n--${k.id}" transform="translate(${k.xy[0]} ${k.xy[1]})">
            <circle r="${k.kapasite ? 10 + k.kapasite / 90 : 9}" class="harita__halka"/><circle r="8" class="harita__nokta"/></g>`
          )
          .join('')}
      </svg>
    </figure>
    <ul class="yerler">
      ${konumlar
        .map(
          (k) => `<li class="yerk">
        <p class="yerk__ad">${esc(k.ad)}${k.kapasite ? `<span>${nf.format(k.kapasite)} ton/gün</span>` : ''}</p>
        <p>${esc(k.adres)}<br>${esc(k.il)}</p>
        ${k.not ? `<p class="yerk__not">${esc(k.not)}</p>` : ''}
        <p class="yerk__tel"><a href="${telHref(k.id === 'merkez' ? tel : k.tel)}">${icons.phone}${esc(k.id === 'merkez' ? tel : k.tel)}</a><span>Faks ${esc(k.faks)}</span></p>
        <a class="btn btn--kucuk btn--cizgi-koyu" href="${gmaps(k.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      </li>`
        )
        .join('')}
    </ul>
    <div class="harita-cer" data-map aria-label="Merkez ofis haritası"></div>
  </div>`;

// Harita yaklaşınca yüklenir.
const mapEl = $('[data-map]');
new IntersectionObserver(
  (e, io) => {
    if (!e[0].isIntersecting) return;
    mapEl.innerHTML = `<iframe title="${esc(is.ad)} merkez konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    io.disconnect();
  },
  { rootMargin: '600px' }
).observe(mapEl);

// --- İletişim -------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="kap final__ic">
    <h2 id="final-baslik" class="final__baslik"><span>İletişim</span></h2>
    <p class="final__metin">Ürün, sarfiyat ve fiyat bilgisi için merkezi arayın.</p>
    <a class="final__tel" href="${telHref(tel)}">${icons.phone}<span>${esc(tel)}</span></a>
    <div class="hero__btn">
      <a class="btn btn--beyaz" href="${gmaps(merkez.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
      <a class="btn btn--cizgi" href="#urunler"><span>Ürünler</span></a>
    </div>
    <p class="final__adres">${esc(merkez.adres)}, ${esc(merkez.il)} · Faks ${esc(merkez.faks)}</p>
  </div>`;

$('#alt').innerHTML = `
  <div class="kap alt__ic">
    <div>
      <p class="alt__ad">${esc(is.ad)}</p>
      <p>${esc(is.unvan)}</p>
      <p>${esc(merkez.adres)}, ${esc(merkez.il)}</p>
    </div>
    <div>
      <p class="alt__bas">Depolama</p><p>${esc(d.saklama)}</p>
    </div>
  </div>
  <p class="kap alt__not">Bu sayfa ${esc(is.ad)} için hazırlanmış bir tasarım önerisidir. Ürün bilgileri, adresler, kapasiteler ve belge listesi alcibay.com'da yayımlanan bilgilerdir; uygulama değerleri şantiye koşullarına göre değişebilir. Fotoğraflar temsilîdir (Pexels). Torba ve plaka görselleri temsilî 3D çizimlerdir; gerçek ambalaj farklıdır.</p>`;

// --- Teknik föy ----------------------------------------------------------------------
const foy = $('#foy');
function foyAc(id) {
  const u = urun(id);
  if (!u) return;
  foy.style.setProperty('--c', u.renk);
  foy.innerHTML = `
    <div class="foy__bas">
      <img src="${asset(u.torba)}" alt="" width="600" height="800">
      <div><p class="etiket">Teknik föy</p><h3>${esc(u.ad)}</h3><p>${esc(u.kisa)}</p></div>
      <button type="button" class="foy__kapat" aria-label="Kapat">×</button>
    </div>
    ${u.artilar.length ? `<ul class="foy__arti">${u.artilar.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${u.kullanim.length ? `<h4>Uygulama</h4><ol class="foy__adim">${u.kullanim.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>` : ''}
    ${u.dikkat.length ? `<h4>Dikkat</h4><ul class="foy__dikkat">${u.dikkat.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${u.teknik.length ? `<h4>Teknik değerler</h4><dl class="foy__tek">${u.teknik.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : `<p>Bu ürünün teknik değerleri için merkez aranabilir.</p>`}
    <a class="btn btn--renk" href="${telHref(tel)}">${icons.phone}<span>Merkezi arayın: ${esc(telYaz(tel))}</span></a>`;
  foy.showModal();
  document.documentElement.classList.add('foy-acik');
  window.__lenis?.stop();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-foy]');
  if (b) foyAc(b.dataset.foy);
  if (e.target.closest('.foy__kapat') || e.target === foy) foy.close();
});
foy.addEventListener('close', () => {
  document.documentElement.classList.remove('foy-acik');
  window.__lenis?.start();
});

// =================================================================================
// Hareket
// =================================================================================
const lenis = initSmoothScroll();
const ust = $('#ust');
const ustGuncelle = () => ust.classList.toggle('is-dolu', scrollY > 80);
addEventListener('scroll', ustGuncelle, { passive: true });
ustGuncelle();

// Rakamlar (hareketsiz modda da doğru değer görünür)
function sayac(el) {
  const v = +el.dataset.v;
  const o = { n: 0 };
  gsap.to(o, { n: v, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = nf.format(Math.round(o.n))) });
}

const tetik = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

if (reducedMotion) {
  document.documentElement.classList.add('rm');
} else {
  // Hero: harfler tozdan düşer, sonra kaydırınca dağılır
  const hh = $$('.hero__baslik .h');
  const rnd = gsap.utils.random;
  gsap.from(hh, {
    yPercent: () => rnd(-160, -60),
    xPercent: () => rnd(-40, 40),
    rotate: () => rnd(-40, 40),
    opacity: 0,
    duration: 1.1,
    ease: 'bounce.out',
    stagger: { each: 0.045, from: 'random' },
    delay: 0.15,
  });
  gsap.from('.hero__tanim, .kunye > div, .hero__btn', { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.3, ease: 'power3.out' });
  gsap.from('.hero__foto', { clipPath: 'inset(100% 0 0 0 round 22px)', duration: 1.2, ease: 'expo.out', delay: 0.3 });
  // fromTo + immediateRender:false: başa dönünce harfler giriş animasyonunun ara hâline değil, yerine döner
  gsap.fromTo(hh, { yPercent: 0, rotate: 0 }, {
    yPercent: (i) => ((i * 37) % 11) * -9,
    rotate: (i) => (((i * 53) % 9) - 4) * 4,
    ease: 'none',
    immediateRender: false,
    scrollTrigger: { trigger: '#giris', start: 'top top', end: 'bottom top', scrub: 0.4 },
  });
  gsap.to('.hero__foto img', { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '#giris', start: 'top top', end: 'bottom top', scrub: true } });

  // Şerit: kaydırma hızına göre akar
  const yol = $('.serit__yol');
  let x = 0;
  let hiz = 0;
  let gorunur = false;
  ScrollTrigger.create({ trigger: '.serit', start: 'top bottom', end: 'bottom top', onToggle: (s) => (gorunur = s.isActive), onUpdate: (s) => (hiz = s.getVelocity() / 60) });
  gsap.ticker.add(() => {
    if (!gorunur) return;
    x -= 0.6 + Math.min(Math.abs(hiz), 40) * 0.25;
    hiz *= 0.92;
    const w = yol.scrollWidth / 2;
    if (-x > w) x += w;
    yol.style.transform = `translate3d(${x}px,0,0)`;
  });

  // Rakamlar
  $$('.rakam__v').forEach((el) => {
    el.textContent = '0';
    ScrollTrigger.create({ ...tetik(el, 'top 90%'), onEnter: () => sayac(el) });
  });
  gsap.from('.rakam__k', { y: 60, autoAlpha: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: tetik('.rakam__liste', 'top 85%') });

  // Kullanım süreleri: çubuklar dolar
  gsap.fromTo('.sure__cubuk i', { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.08, ease: 'power3.out', transformOrigin: 'left', scrollTrigger: tetik('.sure__liste', 'top 85%') });

  // İşler: satırlar iki yönden kayar
  $$('.is__k').forEach((el, i) => {
    gsap.from(el, { y: 36, opacity: 0, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 60%', scrub: 0.5 } });
  });

  // Dev başlıklar: harfler aşağıdan dalga
  $$('.dev').forEach((h) => {
    gsap.from(h, { yPercent: 40, autoAlpha: 0, skewY: 6, duration: 0.9, ease: 'expo.out', scrollTrigger: tetik(h, 'top 90%') });
  });

  // Torbalar: yağarak düşer
  gsap.from('.torba', { y: 80, rotate: (i) => (i % 2 ? 6 : -6), autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.3)', scrollTrigger: tetik('.torbalar') });

  // Plaka yığını: alttaki kart küçülür
  const kart = $$('.kart');
  kart.forEach((k, i) => {
    if (!yiginMod) {
      gsap.from($('.kart__ic', k), { y: 90, rotate: i % 2 ? 3 : -3, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: tetik(k, 'top 90%') });
      return;
    }
    if (i === kart.length - 1) return;
    gsap.to($('.kart__ic', k), { scale: 0.93, ease: 'none', scrollTrigger: { trigger: kart[i + 1], start: 'top bottom', end: 'top 20%', scrub: true } });
    // Üstüne gelen kart yazıyı örtmeden önce alttaki kartın içeriği söner (yazı yazı üstüne binmesin)
    gsap.to($$('.kart__bas, .kart__govde, img', k), { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: kart[i + 1], start: 'top 97%', end: 'top 74%', scrub: true } });
    // Sıradaki kart yerine oturunca alttaki tamamen çekilir: aynı anda en çok iki kart görünür
    gsap.to(k, { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: kart[i + 1], start: () => `top ${90 + (i + 1) * 18 + 60}px`, end: () => `top ${90 + (i + 1) * 18 + 2}px`, scrub: true, invalidateOnRefresh: true } });
  });

  // Harita: kıyı çizgisi çizilir, noktalar belirir
  const hp = $('.harita__yol');
  const L = hp.getTotalLength?.() || 8000;
  gsap.fromTo(hp, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.harita', start: 'top 85%', end: 'bottom 60%', scrub: 0.5 } });
  gsap.from('.harita__n', { scale: 0, transformOrigin: '50% 50%', stagger: 0.15, duration: 0.6, ease: 'back.out(2)', scrollTrigger: tetik('.harita', 'top 70%') });

  // Final başlık
  gsap.from('.final__baslik span', { yPercent: 110, rotate: 4, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: tetik('#iletisim', 'top 75%') });

  // Font yüklenince ölçüler değişir
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
