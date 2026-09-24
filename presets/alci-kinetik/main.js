// Priz: Alçıbay için kinetik (WebGL'siz) yeniden tasarım önerisi.
// İmza: "Priz saati". Kaydırdıkça dev bir dakika sayacı 0'dan 70'e ilerler; her alçının kullanım
// süresinde zemin torbanın rengine boyanır, ürün adının harfleri toz gibi dağınıkken yerine oturur (priz alır).
import '../../shared/base.css';
import './style.css';
import raw from '../../data/alcibay.json';
import {
  boot, initSmoothScroll, esc, asset, icons, gsap, ScrollTrigger, reducedMotion, vitrinModu, mapsEmbed,
} from '../../shared/core.js';

const d = boot(raw);
const { isletme: is, konumlar, urunler, paneller, isler, tarihce, belgeler, kimya } = d;
const merkez = konumlar[0];
const fabrikalar = konumlar.filter((k) => k.kapasite);
const kapasite = fabrikalar.reduce((a, k) => a + k.kapasite, 0);
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
const orijinalAd = is.ad === raw.isletme.ad;

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
$('meta[name="description"]').content = `${is.ad}: ${is.kurulus}'den beri yapı alçısı ve alçı plaka. Bala ve Tarsus fabrikalarında günde ${nf.format(kapasite)} ton.`;

// Mobil çubuk: WhatsApp hattı yok; üreticiye uygun kısayollar. Vitrin modunda seçim çubuğu kalır.
if (!vitrinModu()) {
  $('.action-bar')?.remove();
  const bar = document.createElement('nav');
  bar.className = 'action-bar';
  bar.setAttribute('aria-label', 'Hızlı erişim');
  bar.innerHTML = `
    <a href="${telHref(tel)}" class="action-bar__btn">${icons.phone}<span>Ara</span></a>
    <a href="#is" class="action-bar__btn action-bar__btn--main">${ICON_BUL}<span>Torbanı bul</span></a>
    <a href="${gmaps(merkez.mapsQuery)}" class="action-bar__btn" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>`;
  document.body.append(bar);
}

// --- Header -------------------------------------------------------------------
const logo = orijinalAd
  ? `<img src="${asset('/img/alcibay/logo-acik.png')}" alt="${esc(is.ad)}" width="144" height="25">`
  : `<span class="ust__ad">${esc(is.ad)}</span>`;
$('#ust').innerHTML = `
  <a class="ust__logo" href="#giris" aria-label="${esc(is.ad)} ana sayfa">${logo}</a>
  <nav class="ust__nav" aria-label="Bölümler">
    <a href="#priz">Priz saati</a><a href="#is">Torba bul</a><a href="#plaka">Alçı plaka</a><a href="#fabrikalar">Fabrikalar</a>
  </nav>
  <a class="ust__tel" href="${telHref(tel)}">${icons.phone}<span>${esc(telYaz(tel))}</span></a>`;

// --- Hero: slogan harf harf toz gibi yağar -------------------------------------
const sloganKelime = is.slogan.split(/\s+/).filter(Boolean);
$('#giris').innerHTML = `
  <div class="hero__ic">
    <p class="hero__ust"><span>${is.kurulus}</span><span>Bala · Tarsus</span><span>${nf.format(kapasite)} ton/gün</span></p>
    <h1 class="hero__baslik" id="hero-baslik" aria-label="${esc(is.slogan)}">
      ${sloganKelime.map((k) => `<span class="hero__satir" aria-hidden="true">${harfler(k)}</span>`).join('')}
    </h1>
    <figure class="hero__foto"><img src="${asset('/img/alcibay/uygulama.jpg')}" alt="Çelik mala ile duvara son kat alçı çekiliyor" width="1333" height="2000" fetchpriority="high"></figure>
    <div class="hero__alt">
      <p class="hero__metin">${esc(is.ad)}: ${is.kurulus}'den beri yapı alçısı. Sıvadan perdaha, kartonpiyerden alçı plakaya, duvarın her katı için bir torba.</p>
      <div class="hero__btn">
        <a class="btn btn--beyaz" href="#is">${ICON_BUL}<span>Hangi torba?</span></a>
        <a class="btn btn--cizgi" href="${telHref(tel)}">${icons.phone}<span>Teknik danışmanlık</span></a>
      </div>
    </div>
    <p class="hero__formul" aria-label="Karışım: 10 kilogram alçıya 6 litre su">
      <b>10</b><small>kg alçı</small><i>+</i><b>6</b><small>l su</small><i>=</i><b class="hero__formul-son">duvar</b>
    </p>
  </div>`;

// --- Şerit: yedi torba, yedi renk ----------------------------------------------
const seritIc = urunler.map((u) => `<span class="serit__k" style="--c:${u.renk}"><i></i>${esc(u.ad)}</span>`).join('');
$('.serit').innerHTML = `<div class="serit__yol" aria-hidden="true">${seritIc}${seritIc}</div>
  <p class="sr-only">${urunler.map((u) => esc(u.ad)).join(', ')}</p>`;

// --- Rakamlar ---------------------------------------------------------------------
const rakamlar = [
  { v: kapasite, e: 'ton alçı, günde', a: fabrikalar.map((f) => `${f.id === 'bala' ? 'Bala' : f.id === 'tarsus' ? 'Tarsus' : f.ad} ${nf.format(f.kapasite)}`).join(' + ') },
  { v: yil, e: 'yıl', a: `${is.kurulus}'den beri` },
  { v: urunler.length, e: 'toz alçı', a: 'sıva, perdah, kalıp, yapıştırma, derz' },
  { v: paneller.length, e: 'alçı plaka tipi', a: 'Ekopan S, W, F, W&F' },
];
$('#rakam').innerHTML = `<dl class="rakam__liste">${rakamlar
  .map((r) => `<div class="rakam__k"><dd><span class="rakam__v" data-v="${r.v}">${nf.format(r.v)}</span></dd><dt><b>${esc(r.e)}</b><span>${esc(r.a)}</span></dt></div>`)
  .join('')}</dl>`;

// --- İmza: Priz saati -------------------------------------------------------------
const dakika = (u) => {
  const s = u.anahtar.find(([k]) => /kullanım süresi/i.test(k))?.[1] || '';
  return parseInt(s.replace(/\D+/g, ' ').trim(), 10) || 0;
};
const prizler = urunler.filter((u) => dakika(u)).sort((a, b) => dakika(a) - dakika(b));
const maxDk = Math.max(...prizler.map(dakika));
const cevre = 2 * Math.PI * 46;
const kisaAd = (u) => u.ad.replace(/ Alçısı$/, '').replace(/^Alçı Plaka /, '');
const gruplar = [];
prizler.forEach((u) => {
  const dk = dakika(u);
  let g = gruplar.find((x) => x.dk === dk);
  if (!g) gruplar.push((g = { dk, adlar: [] }));
  g.adlar.push(kisaAd(u));
});
const grupNo = (u) => gruplar.findIndex((g) => g.dk === dakika(u));
$('#priz').innerHTML = `
  <div class="priz__pin">
    <header class="priz__bas">
      <p class="etiket">Priz saati</p>
      <h2 id="priz-baslik">Suyu kattınız. Saat işliyor.</h2>
    </header>
    <div class="priz__saat" aria-hidden="true">
      <svg viewBox="0 0 100 100" class="priz__kadran">
        <circle cx="50" cy="50" r="46" class="priz__iz"/>
        <circle cx="50" cy="50" r="46" class="priz__dolu" style="stroke-dasharray:${cevre};stroke-dashoffset:${cevre}"/>
        ${Array.from({ length: 14 }, (_, i) => `<line x1="50" y1="2" x2="50" y2="${i % 7 === 0 ? 9 : 6}" transform="rotate(${(i * 360) / 14} 50 50)"/>`).join('')}
      </svg>
      <p class="priz__dk"><span data-dk>0</span><small>dk</small></p>
    </div>
    <div class="priz__sahne">
      ${prizler
        .map(
          (u, i) => `
      <article class="pz" data-i="${i}" style="--c:${u.renk}">
        <img class="pz__torba" src="${asset(u.torba)}" alt="${esc(u.ad)} torbası" width="383" height="491" loading="${i ? 'lazy' : 'eager'}">
        <div class="pz__yazi">
          <p class="pz__ust">en az ${dakika(u)} dakika kullanım</p>
          <h3 class="pz__ad" aria-label="${esc(u.ad)}">${u.ad
            .split(' ')
            .map((k) => `<span class="pz__kel" aria-hidden="true">${harfler(k, 'ph')}</span>`)
            .join(' ')}</h3>
          <p class="pz__kisa">${esc(u.kisa)}</p>
        </div>
      </article>`
        )
        .join('')}
    </div>
    <ol class="priz__cizelge" aria-label="Kullanım süreleri">
      ${gruplar.map((g) => `<li style="--x:${(g.dk / maxDk) * 100}%"><span>${g.dk}</span><em>${g.adlar.map(esc).join(' · ')}</em></li>`).join('')}
    </ol>
  </div>`;

// --- Ne yapacaksınız? -------------------------------------------------------------
$('#is').innerHTML = `
  <div class="kap">
    <p class="etiket">Torba bulucu</p>
    <h2 id="is-baslik" class="dev">Ne yapa&shy;caksınız?</h2>
    <ul class="is__liste">
      ${isler
        .map((x, i) => {
          const u = x.urun ? urun(x.urun) : null;
          const c = u ? u.renk : '#1f33d6';
          const cevap = u
            ? `<div class="is__cevap-ic">
                <img src="${asset(u.torba)}" alt="" width="383" height="491" loading="lazy">
                <div>
                  <p class="is__oner">Önerimiz</p>
                  <h3>${esc(u.ad)}</h3>
                  <p>${esc(x.not)}</p>
                  ${u.anahtar.length ? `<dl class="deger">${u.anahtar.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
                  <button type="button" class="btn btn--kucuk" data-foy="${u.id}">Teknik föy</button>
                </div>
              </div>`
            : `<div class="is__cevap-ic is__cevap-ic--plaka">
                <div>
                  <p class="is__oner">Önerimiz</p>
                  <h3>Ekopan alçı plaka</h3>
                  <p>${esc(x.not)} Kartonun rengi ortamı söyler:</p>
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
      <p class="etiket">Yedi torba</p>
      <h2 id="urunler-baslik" class="dev">Her katın bir rengi var.</h2>
      <p>Torbanın rengi içindekini söyler. Karta dokunun, teknik föy açılsın.</p>
    </div>
    <ul class="torbalar">
      ${urunler
        .map(
          (u) => `<li class="torba ${acikMi(u.renk) ? 'torba--acik' : ''}" style="--c:${u.renk}">
        <button type="button" data-foy="${u.id}" aria-label="${esc(u.ad)}: teknik föy">
          <img src="${asset(u.torba)}" alt="" width="383" height="491" loading="lazy">
          <span class="torba__ad">${esc(u.ad)}</span>
          <span class="torba__kisa">${esc(u.kisa)}</span>
          <span class="torba__dk">${dakika(u) ? `${dakika(u)} dk` : 'Bilgi için arayın'}</span>
        </button>
      </li>`
        )
        .join('')}
    </ul>
  </div>`;

// --- Alçı plaka: üst üste binen kartlar ----------------------------------------
$('#plaka').innerHTML = `
  <div class="kap">
    <div class="bolum-bas">
      <p class="etiket">Ekopan · TS EN 520</p>
      <h2 id="plaka-baslik" class="dev">Kartonun rengi, duvarın işi.</h2>
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

// --- Kimya: yarım molekül su ------------------------------------------------------
$('#kimya').innerHTML = `
  <div class="kimya__pin">
    <img class="kimya__doku" src="${asset('/img/alcibay/duvar-doku.jpg')}" alt="" loading="lazy">
    <div class="kimya__ic">
      <p class="etiket">Taştan gelir, taşa döner</p>
      <h2 id="kimya-baslik" class="sr-only">Alçının kimyası</h2>
      <p class="formul" aria-label="Jips ${esc(kimya.jips)}, alçı ${esc(kimya.alci)}">
        <span aria-hidden="true">CaSO<sub>4</sub>·</span><span class="formul__kutu" aria-hidden="true"><span class="formul__y" data-f="0">2</span><span class="formul__y" data-f="1">½</span></span><span aria-hidden="true">H<sub>2</sub>O</span>
      </p>
      <ol class="asama">
        <li data-a="0"><b>Jips</b><span>Ocaktan çıkan taş. Kristalinde iki molekül su.</span></li>
        <li data-a="1"><b>Isıt, öğüt</b><span>Suyun yarım molekülü kalır; beyaz toz olur. Torbadaki budur.</span></li>
        <li data-a="2"><b>Su kat</b><span>Karışınca yeniden taşlaşır, bağlar. Kuruduktan sonra boyut değiştirmez.</span></li>
      </ol>
      <p class="kimya__metin">${esc(kimya.metin)}</p>
    </div>
  </div>`;

// --- Tarihçe: kaydırdıkça akan yıllar ------------------------------------------
$('#tarih').innerHTML = `
  <div class="kap"><p class="etiket">11.000 yıllık malzeme</p><h2 id="tarih-baslik" class="dev">Çatalhöyük'ten Bala'ya.</h2></div>
  <div class="tarih__cerceve"><ol class="tarih__yol">
    ${tarihce.map(([y, t], i) => `<li class="${/^(19|20)\d\d$/.test(y) ? 'bizim' : ''}"><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}
  </ol></div>
  <div class="kap"><ul class="belge" aria-label="Belgeler">${belgeler.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>`;

// --- Fabrikalar ---------------------------------------------------------------
const [vx, vy, vw, vh] = d.harita.viewBox.split(' ').map(Number);
$('#fabrikalar').innerHTML = `
  <div class="kap">
    <div class="bolum-bas">
      <p class="etiket">Merkez + iki fabrika</p>
      <h2 id="yer-baslik" class="dev">Günde ${nf.format(kapasite)} ton, iki fırından.</h2>
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

// --- Final ----------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="kap final__ic">
    <p class="etiket">Teknik danışmanlık</p>
    <h2 id="final-baslik" class="final__baslik"><span>Doğru torba,</span> <span>tek telefon.</span></h2>
    <p class="final__metin">Sarfiyat, uygulama, depolama. Şantiyeniz için hangi alçının kaç torba gerektiğini birlikte hesaplayalım.</p>
    <a class="final__tel" href="${telHref(tel)}">${icons.phone}<span>${esc(tel)}</span></a>
    <div class="hero__btn">
      <a class="btn btn--beyaz" href="${gmaps(merkez.mapsQuery)}" target="_blank" rel="noopener">${icons.pin}<span>Merkeze yol tarifi</span></a>
      <a class="btn btn--cizgi" href="#is">${ICON_BUL}<span>Torbanı bul</span></a>
    </div>
  </div>`;

$('#alt').innerHTML = `
  <div class="kap alt__ic">
    <div>
      ${orijinalAd ? `<img src="${asset('/img/alcibay/logo.png')}" alt="${esc(is.ad)}" width="144" height="25" loading="lazy">` : `<p class="alt__ad">${esc(is.ad)}</p>`}
      <p>${esc(is.unvan)}</p>
      <p>${esc(merkez.adres)}, ${esc(merkez.il)}</p>
    </div>
    <div>
      <p class="alt__bas">Depolama</p><p>${esc(d.saklama)}</p>
      <p class="alt__bas">Güvenlik</p><p>${d.guvenlik.map(esc).join(' ')}</p>
    </div>
  </div>
  <p class="kap alt__not">Bu sayfa Alçıbay için hazırlanmış bir tasarım önerisidir. Ürün bilgileri alcibay.com'dan alınmıştır; uygulama değerleri şantiye koşullarına göre değişebilir. Fotoğraflar: Pexels ve Alçıbay.</p>`;

// --- Teknik föy ----------------------------------------------------------------------
const foy = $('#foy');
function foyAc(id) {
  const u = urun(id);
  if (!u) return;
  foy.style.setProperty('--c', u.renk);
  foy.innerHTML = `
    <div class="foy__bas">
      <img src="${asset(u.torba)}" alt="" width="383" height="491">
      <div><p class="etiket">Teknik föy</p><h3>${esc(u.ad)}</h3><p>${esc(u.kisa)}</p></div>
      <button type="button" class="foy__kapat" aria-label="Kapat">×</button>
    </div>
    ${u.artilar.length ? `<ul class="foy__arti">${u.artilar.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${u.kullanim.length ? `<h4>Uygulama</h4><ol class="foy__adim">${u.kullanim.map((a) => `<li>${esc(a)}</li>`).join('')}</ol>` : ''}
    ${u.dikkat.length ? `<h4>Dikkat</h4><ul class="foy__dikkat">${u.dikkat.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${u.teknik.length ? `<h4>Teknik değerler</h4><dl class="foy__tek">${u.teknik.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : `<p>Bu ürünün teknik bilgisi için teknik danışmanlığımızı arayın.</p>`}
    <a class="btn btn--renk" href="${telHref(tel)}">${icons.phone}<span>Teknik danışmanlık: ${esc(telYaz(tel))}</span></a>`;
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
ScrollTrigger.create({ start: 80, end: 'max', onToggle: (s) => ust.classList.toggle('is-dolu', s.isActive) });

// Rakamlar (hareketsiz modda da doğru değer görünür)
function sayac(el) {
  const v = +el.dataset.v;
  const o = { n: 0 };
  gsap.to(o, { n: v, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = nf.format(Math.round(o.n))) });
}

if (reducedMotion) {
  document.documentElement.classList.add('rm');
  $$('.pz')[0]?.classList.add('is-aktif');
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
  gsap.from('.hero__ust span, .hero__alt, .hero__formul > *', { y: 20, opacity: 0, duration: 0.7, stagger: 0.06, delay: 0.6, ease: 'power3.out' });
  gsap.from('.hero__foto', { clipPath: 'inset(100% 0 0 0 round 22px)', duration: 1.2, ease: 'expo.out', delay: 0.3 });
  gsap.to(hh, {
    yPercent: (i) => ((i * 37) % 11) * -9,
    rotate: (i) => (((i * 53) % 9) - 4) * 4,
    ease: 'none',
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
  $$('.rakam__v').forEach((el) =>
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => sayac(el) })
  );
  gsap.from('.rakam__k', { y: 60, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '#rakam', start: 'top 80%' } });

  // --- Priz saati -------------------------------------------------------------------
  const pin = $('.priz__pin');
  const kartlar = $$('.pz');
  const dkEl = $('[data-dk]');
  const dolu = $('.priz__dolu');
  const noktalar = $$('.priz__cizelge li');
  const saat = { dk: 0 };
  const dagit = (el) => ({
    x: () => rnd(-1, 1) * (mobile ? 120 : 260),
    y: () => rnd(-1, 1) * (mobile ? 140 : 220),
    rotate: () => rnd(-160, 160),
    scale: () => rnd(0.2, 0.7),
    opacity: 0,
  });
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#priz',
      start: 'top top',
      end: () => `+=${prizler.length * innerHeight * (mobile ? 0.9 : 0.8)}`,
      pin,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  gsap.set(kartlar, { autoAlpha: 0 });
  prizler.forEach((u, i) => {
    const k = kartlar[i];
    const ph = $$('.ph', k);
    const t = i * 1;
    // zemin rengi ve saat
    tl.to(pin, { backgroundColor: u.renk, color: acikMi(u.renk) ? '#141414' : '#ffffff', duration: 0.25 }, t);
    tl.to(saat, { dk: dakika(u), duration: 0.5, onUpdate: () => (dkEl.textContent = Math.round(saat.dk)) }, t);
    tl.to(dolu, { strokeDashoffset: cevre * (1 - dakika(u) / maxDk), duration: 0.5 }, t);
    if (i === 0 || grupNo(prizler[i - 1]) !== grupNo(u)) tl.fromTo(noktalar[grupNo(u)], { '--on': 0 }, { '--on': 1, duration: 0.2 }, t + 0.3);
    // giriş: toz → yerine otur
    tl.set(k, { autoAlpha: 1 }, t);
    tl.fromTo(ph, dagit(), { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.4, stagger: { each: 0.008, from: 'random' }, ease: 'power2.out' }, t);
    tl.fromTo($('.pz__torba', k), { yPercent: 60, rotate: -14, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }, t);
    tl.fromTo($$('.pz__ust, .pz__kisa', k), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, t + 0.35);
    // bekle, sonra çık (sonuncu kalır)
    if (i < prizler.length - 1) {
      tl.to(ph, { yPercent: 120, opacity: 0, duration: 0.25, stagger: { each: 0.006 } }, t + 0.85);
      tl.to($('.pz__torba', k), { yPercent: -40, rotate: 10, opacity: 0, duration: 0.25 }, t + 0.85);
      tl.to($$('.pz__ust, .pz__kisa', k), { opacity: 0, duration: 0.15 }, t + 0.85);
      tl.set(k, { autoAlpha: 0 }, t + 1);
    }
  });
  tl.to({}, { duration: 0.4 });

  // İşler: satırlar iki yönden kayar
  $$('.is__k').forEach((el, i) => {
    gsap.from(el, { xPercent: i % 2 ? 18 : -18, opacity: 0, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 60%', scrub: 0.5 } });
  });

  // Dev başlıklar: harfler aşağıdan dalga
  $$('.dev').forEach((h) => {
    gsap.from(h, { yPercent: 40, opacity: 0, skewY: 6, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });

  // Torbalar: yağarak düşer
  gsap.from('.torba', { y: 80, rotate: (i) => (i % 2 ? 6 : -6), opacity: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.3)', scrollTrigger: { trigger: '.torbalar', start: 'top 85%' } });

  // Plaka yığını: alttaki kart küçülür
  const kart = $$('.kart');
  kart.forEach((k, i) => {
    if (mobile) {
      gsap.from($('.kart__ic', k), { y: 90, rotate: i % 2 ? 3 : -3, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: k, start: 'top 88%' } });
      return;
    }
    if (i === kart.length - 1) return;
    gsap.to($('.kart__ic', k), { scale: 0.93, ease: 'none', scrollTrigger: { trigger: kart[i + 1], start: 'top bottom', end: 'top 20%', scrub: true } });
  });

  // Kimya: 2 → ½ → 2
  const y = $$('.formul__y');
  const as = $$('.asama li');
  const ktl = gsap.timeline({ scrollTrigger: { trigger: '#kimya', start: 'top top', end: '+=160%', pin: '.kimya__pin', scrub: 0.5 } });
  gsap.set(y[1], { yPercent: 100, opacity: 0 });
  ktl
    .fromTo(as[0], { '--on': 0 }, { '--on': 1, duration: 0.3 })
    .to(y[0], { yPercent: -100, opacity: 0, duration: 0.4 }, 1)
    .fromTo('.formul__kutu', { width: '0.62em' }, { width: '0.98em', duration: 0.4 }, 1)
    .to('.formul__kutu', { width: '0.62em', duration: 0.4 }, 2)
    .to(y[1], { yPercent: 0, opacity: 1, duration: 0.4 }, 1)
    .to('.formul', { color: '#1f33d6', duration: 0.4 }, 1)
    .fromTo(as[1], { '--on': 0 }, { '--on': 1, duration: 0.3 }, 1.1)
    .to(y[1], { yPercent: -100, opacity: 0, duration: 0.4 }, 2)
    .fromTo(y[0], { yPercent: 100 }, { yPercent: 0, opacity: 1, duration: 0.4, immediateRender: false }, 2)
    .to('.formul', { color: '#141414', duration: 0.4 }, 2)
    .fromTo(as[2], { '--on': 0 }, { '--on': 1, duration: 0.3 }, 2.1)
    .to({}, { duration: 0.4 });
  gsap.to('.kimya__doku', { scale: 1.15, ease: 'none', scrollTrigger: { trigger: '#kimya', start: 'top top', end: '+=160%', scrub: true } });

  // Tarihçe: yıllar yatay akar
  const yolT = $('.tarih__yol');
  gsap.fromTo(yolT, { x: () => innerWidth * 0.3 }, {
    x: () => -(yolT.scrollWidth - innerWidth * 0.7),
    ease: 'none',
    scrollTrigger: { trigger: '.tarih__cerceve', start: 'top bottom', end: 'bottom top', scrub: 0.4, invalidateOnRefresh: true },
  });

  // Harita: kıyı çizgisi çizilir, noktalar belirir
  const hp = $('.harita__yol');
  const L = hp.getTotalLength?.() || 8000;
  gsap.fromTo(hp, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.harita', start: 'top 85%', end: 'bottom 60%', scrub: 0.5 } });
  gsap.from('.harita__n', { scale: 0, transformOrigin: '50% 50%', stagger: 0.15, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: '.harita', start: 'top 60%' } });

  // Final başlık
  gsap.from('.final__baslik span', { yPercent: 110, rotate: 4, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '#iletisim', start: 'top 70%' } });

  // Font yüklenince ölçüler değişir
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
