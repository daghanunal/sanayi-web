// Konvoy (kinetik aile, WebGL yok): ADR turuncusu ve asfalt. Hareket yalnız tipografide ve çekicide:
// künyede adın harfleri dar başlayıp uzar, Hizmetler'de her dorse bir hizmettir ve kaydırdıkça çekici dorseleri
// sürükler (pin ≤ 3 ekran), Hakkında'da araç tipleri dev yazı olarak zıt yönlere akar. Sayaç ve levha yok.
import veri from '../../data/tonaj.json';
import ek from '../../data/agirvasita-kinetik.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, telHref, waHref, mapsHref, mapsEmbed, icons, asset,
  autoHideHeader, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki,
} from '../../shared/core.js';

const d = boot({ ...veri, ...ek, preset: 'agirvasita-kinetik' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const up = (s) => String(s).toLocaleUpperCase('tr-TR');
const pad = (n) => String(n).padStart(2, '0');
const mobil = () => innerWidth < 900;
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);

// --- İçerik -------------------------------------------------------------------

$('#top').innerHTML = `
  <a href="#kunye" class="top__brand"><span class="top__adr" aria-hidden="true"></span><span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>`;

$('#kunye').innerHTML = `
  <div class="hero__foto"><img src="${esc(d.gorsel.hero)}" alt="" fetchpriority="high" decoding="async" /></div>
  <div class="hero__ic">
    <h1 class="hero__ad" id="hero-title">${ad}</h1>
    <div class="adr">
      <p class="adr__ust">${esc(d.isletme.tanim)}</p>
      <dl class="adr__alt kunye">
        <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
        <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
        <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
      </dl>
    </div>
    <div class="hero__aks">
      <a class="btn btn--adr" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// Çekici: lib3d çekicinin Cycles render'ı (sol yandan, tekersiz) + dönen teker görselleri.
// Konumlar 1400 × 904 birimlik render kadrajına göre.
const CW = 1400, CH = 904, CR = 119.3 * 1.01;
const cTeker = (x) => `<img class="cekici__teker" src="${asset('/img/agirvasita-kinetik/teker.webp')}" alt="" width="320" height="320" style="left:${(((x - CR) / CW) * 100).toFixed(2)}%;top:${(((758.4 - CR) / CH) * 100).toFixed(2)}%;width:${(((2 * CR) / CW) * 100).toFixed(2)}%" />`;
const teker = () => '<span class="teker" aria-hidden="true"><i></i></span>';
$('#hizmetler').innerHTML = `
  <div class="konvoy__pin">
    <div class="konvoy__bas">
      <h2 id="hizmet-t">Hizmetler</h2>
      <p>Çekici, kamyon, otobüs ve midibüs. Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <div class="konvoy__yol">
      <ol class="konvoy__tren" data-tren>
        <li class="cekici" aria-hidden="true">
          <img class="cekici__govde" src="${asset('/img/agirvasita-kinetik/cekici-3d.webp')}" alt="" width="${CW}" height="${CH}" decoding="async" loading="lazy" />
          ${cTeker(355.6)}${cTeker(1177.8)}
          <span class="cekici__ad"><b>${ad}</b></span>
        </li>
        ${d.hizmetler.map((h, i) => `
          <li class="dorse">
            <div class="dorse__kasa">
              <span class="dorse__no">${pad(i + 1)}</span>
              <h3>${esc(h.baslik)}</h3>
              <p>${esc(h.aciklama)}</p>
              ${h.sure ? `<span class="dorse__sure">${esc(h.sure)}</span>` : ''}
            </div>
            <div class="dorse__alt" aria-hidden="true"><span class="dorse__bag"></span>${teker()}${teker()}${teker()}</div>
          </li>`).join('')}
      </ol>
      <div class="konvoy__asfalt" aria-hidden="true"><span data-asfalt></span></div>
    </div>
  </div>`;

const serit = d.serit.map(up);
const seritHTML = (kaydir, cls) => {
  const dizi = [...serit.slice(kaydir), ...serit.slice(0, kaydir)];
  const parca = dizi.map((k) => `<span>${esc(k)}</span><b>•</b>`).join('');
  return `<div class="serit ${cls}"><div class="serit__ic">${parca}${parca}</div></div>`;
};
$('#hakkinda').innerHTML = `
  <div class="seritler" aria-hidden="true">
    ${seritHTML(0, 'serit--dolu')}<div class="serit__cizgi"></div>${seritHTML(3, 'serit--adr')}
  </div>
  <div class="hakkinda__ic">
    <div>
      <h2 id="hakkinda-t">Hakkında</h2>
      <p class="hakkinda__metin">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="plakalar">
        <div class="plaka"><dt class="plaka__alt">Şaşmaz Oto Sanayi Sitesi'nde</dt><dd class="plaka__ust">${yas}<small>yıl</small></dd></div>
        <div class="plaka"><dt class="plaka__alt">haftada açık</dt><dd class="plaka__ust">${acikGun}<small>gün</small></dd></div>
      </dl>
    </div>
    <dl class="bilgi">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <figure class="hakkinda__foto"><img src="${esc(d.gorsel.cekici)}" alt="Siyah çekici, önünde turuncu ADR plakası" loading="lazy" decoding="async" /></figure>`;

$('#saatler').innerHTML = `
  <h2 id="konum-t">Çalışma saatleri ve konum</h2>
  <div class="konum__govde">
    <div class="konum__bilgi">
      <p class="konum__durum ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <dl class="saatler">${saatListesi(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
      <p class="konum__adres">${esc(d.iletisim.adres)}</p>
      <div class="konum__aks">
        <a class="btn btn--koyu" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--cizgi" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="harita" data-map><span>Harita</span></div>
  </div>`;

const yildiz = (n) => `<p class="yorum__yildiz" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="yorumlar__bas">
    <h2 id="yorum-t">Örnek yorumlar</h2>
    <p>Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="yorumlar__serit" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <blockquote class="yorum">
        ${yildiz(y.puan)}
        <p class="yorum__metin">${esc(y.metin)}</p>
        <footer><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></footer>
      </blockquote>`).join('')}
  </div>`;

$('#iletisim').innerHTML = `
  <img class="final__img" src="${esc(d.gorsel.beyaz)}" alt="" loading="lazy" decoding="async" />
  <div class="final__ic">
    <h2 class="final__baslik" id="final-t">İletişim</h2>
    <p>Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Yolda kaldıysanız konumunuzu WhatsApp'tan gönderebilirsiniz.</p>
    <div class="hero__aks">
      <a class="btn btn--adr" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--beyaz" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#alt').innerHTML = `
  <p><b>${ad}</b> · ${esc(d.isletme.tanim)}</p>
  <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p>© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D çekici görseli temsilîdir. Yorumlar örnektir.</p>`;

const mapEl = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapEl);

if (mobil()) autoHideHeader($('#top'), { offset: 120 });

// --- Hareket ----------------------------------------------------------------------

document.fonts.ready.then(() => {
  document.documentElement.classList.add('is-hazir');
  if (reducedMotion) {
    document.documentElement.classList.add('is-sabit');
    return;
  }
  initSmoothScroll();

  // Künye: ad dar başlar, çekici gibi uzar (bir kez, ~1 sn). Bilgi ve düğmeler baştan okunur.
  gsap.fromTo('.hero__ad', { fontStretch: '62%', autoAlpha: 0 }, { fontStretch: '100%', autoAlpha: 1, duration: 1, ease: 'power3.out', clearProps: 'fontStretch' });
  gsap.from('.adr, .hero__aks', { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08, delay: 0.15, ease: 'power3.out', clearProps: 'all' });
  gsap.to('.hero__foto img', { scale: 1.14, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: true } });

  // Hizmetler: çekici dorseleri sürükler.
  const tren = $('[data-tren]');
  const asfalt = $('[data-asfalt]');
  const mesafe = () => Math.max(0, tren.scrollWidth - innerWidth + (mobil() ? 32 : 120));
  const R = 22; // teker yarıçapı (px)
  gsap.to(tren, {
    x: () => -mesafe(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.konvoy', start: 'top top',
      end: () => `+=${Math.min(mesafe() * (mobil() ? 1.1 : 0.9), innerHeight * 2.8)}`, // pin ≤ 3 ekran
      pin: '.konvoy__pin', scrub: 0.5, invalidateOnRefresh: true,
      onUpdate: (s) => {
        const x = s.progress * mesafe();
        tren.style.setProperty('--don', `${(x / R) * 57.3}deg`);
        asfalt.style.transform = `translate3d(${-(x * 1.4) % 120}px,0,0)`;
      },
    },
  });

  // Hakkında: araç tipleri zıt yönlerde akar.
  $$('.serit').forEach((el, i) => {
    const ic = $('.serit__ic', el);
    gsap.fromTo(ic, { xPercent: i ? -50 : 0 }, {
      xPercent: i ? -20 : -30, ease: 'none',
      scrollTrigger: { trigger: '.seritler', start: 'top bottom', end: 'bottom top', scrub: 0.3 },
    });
  });
  $$('.plaka').forEach((p, i) => gsap.from(p, {
    y: 40, rotate: i ? 3 : -3, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.6)', delay: i * 0.08,
    scrollTrigger: { trigger: p, start: 'top 92%', toggleActions: 'play none none none' },
  }));
  gsap.from('.yorum', {
    x: 50, autoAlpha: 0, stagger: 0.08, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: '.yorumlar__serit', start: 'top 88%', toggleActions: 'play none none none' },
  });

  // İletişim: başlık kaydırdıkça genişler.
  gsap.fromTo('.final__baslik', { fontStretch: '62%' }, {
    fontStretch: '125%', ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top 85%', end: 'center center', scrub: 0.4 },
  });

  let w = innerWidth;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - w) < 2) return;
    w = innerWidth;
    ScrollTrigger.refresh();
  });
  addEventListener('load', () => ScrollTrigger.refresh());
});
