import tonaj from '../../data/tonaj.json';
import ek from '../../data/agirvasita-klasik2.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  autoHideHeader, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, GUNLER,
} from '../../shared/core.js';

// Köprü (klasik aile): karayolu yön levhası dili. Künye gece yolunun üstünde asılı yeşil köprü levhasıdır;
// açılışta levha kirişten iner, üstünden bir kez far parlaması geçer. Hizmetler yeşil çıkış levhaları, rakamlar
// kilometre taşı, saatler mavi bilgi levhası. Kaydırmaya bağlı pin ve sayaç yok.
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...tonaj, ...ek, preset: 'agirvasita-klasik2' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const ok = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 36 L34 14 M18 14 H34 V30"/></svg>`;
const logo = `<span class="top__logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 18 L17 7 M9 7 H17 V15" /></svg></span>`;

// --- İçerik -------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${logo}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__call-no">${tel}</span></a>`;

const adUz = d.isletme.ad.length;
$('#kunye').innerHTML = `
  <img class="hero__foto" src="${import.meta.env.BASE_URL}img/agirvasita-klasik2/gece-yol.jpg" alt="" fetchpriority="high" decoding="async" />
  <div class="hero__karart" aria-hidden="true"></div>
  <div class="hero__ic">
    <div class="gantry">
      <div class="gantry__kiris" aria-hidden="true"></div>
      <div class="tabela" data-tabela>
        <i class="tabela__parlama" aria-hidden="true"></i>
        <div class="tabela__ic">
          <p class="tabela__ust"><span class="kalkan" aria-hidden="true">${ok}</span><span>Şaşmaz Oto Sanayi Sitesi</span></p>
          <h1 class="tabela__ad" id="hero-title" style="--ad-k:${adUz > 22 ? 0.72 : adUz > 16 ? 0.86 : 1}">${ad}</h1>
          <p class="tabela__tanim">${esc(d.isletme.tanim)}</p>
          <dl class="kunye">
            <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
            <div><dt>Bugün</dt><dd><span class="lamba ${st.open ? 'is-open' : ''}" aria-hidden="true"></span>${esc(st.kunye)}</dd></div>
            <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
          </dl>
        </div>
      </div>
    </div>
    <div class="hero__cta">
      <a class="btn btn--beyaz" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="kap">
    <h2 class="baslik" id="hizmet-t">Hizmetler</h2>
    <p class="giris">Çekici, kamyon, otobüs ve midibüs. Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    <ol class="cikis-liste">
      ${d.hizmetler.map((h, i) => `
        <li class="cikis">
          <span class="cikis__no" aria-hidden="true">${i + 1}</span>
          <div class="cikis__govde">
            <h3>${esc(h.baslik)}</h3>
            <p>${esc(h.aciklama)}</p>
          </div>
          ${h.sure ? `<span class="cikis__sure">${esc(h.sure)}</span>` : ''}
        </li>`).join('')}
    </ol>
  </div>`;

$('#hakkinda').innerHTML = `
  <div class="kap">
    <h2 class="baslik" id="hakkinda-t">Hakkında</h2>
    <div class="yesil__grid">
      <div>
        <p class="yesil__metin">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
        <ol class="taslar" aria-label="Rakamlarla">
          <li class="tas"><span class="tas__deger"><b class="tas__sayi">${yas}</b><span class="tas__sonek"> yıl</span></span><span class="tas__etiket">Şaşmaz Oto Sanayi Sitesi'nde</span></li>
          <li class="tas"><span class="tas__deger"><b class="tas__sayi">${acikGun}</b><span class="tas__sonek"> gün</span></span><span class="tas__etiket">haftada açık</span></li>
        </ol>
      </div>
      <dl class="bilgi">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${d.markalar?.length ? `<div><dt>Bakım yapılan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
      </dl>
    </div>
  </div>
  <div class="galeri__serit" data-lenis-prevent-touch tabindex="0" aria-label="Fotoğraflar, yana kaydırın">
    ${(d.galeri || []).map((g) => `
      <figure class="kare">
        <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" />
        <figcaption>${esc(g.etiket)}</figcaption>
      </figure>`).join('')}
  </div>`;

const bugun = GUNLER[new Date().getDay()];
const sira = [1, 2, 3, 4, 5, 6, 0].map((i) => GUNLER[i]);
const bugunMu = (etiket) => {
  const [a, b] = etiket.split('–');
  const k = sira.indexOf(bugun);
  return k >= sira.indexOf(a) && k <= sira.indexOf(b ?? a);
};
$('#saatler').innerHTML = `
  <div class="kap">
    <h2 class="baslik baslik--koyu" id="konum-t">Çalışma saatleri ve konum</h2>
    <div class="konum__grid">
      <div class="saatler">
        <p class="saatler__durum"><span class="lamba ${st.open ? 'is-open' : ''}" aria-hidden="true"></span>${esc(st.metin)}</p>
        <dl class="saatler__liste">
          ${saatListesi(d.saatler).map(([g, s]) => `<div class="${bugunMu(g) ? 'is-bugun' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
        </dl>
      </div>
      <div class="harita-kap">
        <p class="adres">${esc(d.iletisim.adres)}</p>
        <div class="harita" data-harita><span>Harita</span></div>
        <div class="konum__btn">
          <a class="btn btn--yesil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
          <a class="btn btn--koyu-cizgi" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        </div>
      </div>
    </div>
  </div>`;

const yildiz = (n) => `<p class="mesaj__yildiz" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="kap">
    <h2 class="baslik" id="yorum-t">Örnek yorumlar</h2>
    <p class="giris">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
    <ul class="mesajlar">
      ${d.yorumlar.map((y) => `
        <li class="mesaj">
          ${yildiz(y.puan)}
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="mesaj__kim"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
        </li>`).join('')}
    </ul>
  </div>`;

$('#iletisim').innerHTML = `
  <img class="final__foto" src="${import.meta.env.BASE_URL}img/agirvasita-klasik2/yolda.jpg" alt="" loading="lazy" decoding="async" />
  <div class="final__karart" aria-hidden="true"></div>
  <div class="final__tabela">
    <h2 class="final__baslik" id="final-t">İletişim</h2>
    <p class="final__metin">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Yolda kaldıysanız konumunuzu WhatsApp'tan gönderebilirsiniz.</p>
    <div class="final__cta">
      <a class="btn btn--beyaz" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#alt').innerHTML = `
  <div class="kap alt__grid">
    <div>
      <p class="alt__ad">${ad}</p>
      <p>${esc(d.isletme.tanim)}</p>
      <p>${esc(d.iletisim.adres)}</p>
    </div>
    <div>
      <a href="${telHref(d)}">${tel}</a>
      <p class="alt__kucuk">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.</p>
    </div>
  </div>`;

// Harita yaklaşınca yüklenir
const harita = $('[data-harita]');
new IntersectionObserver(([e], io) => {
  if (!e.isIntersecting) return;
  io.disconnect();
  harita.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px 0px' }).observe(harita);

// Başlık: hero'dan sonra koyulaşır; telefonda aşağı kaydırırken saklanır
const top = $('#top');
if (matchMedia('(max-width: 899px)').matches) autoHideHeader(top, { offset: 120 });
const topYaz = () => top.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', topYaz, { passive: true });
topYaz();

// --- Hareket (sakin: bir kez, kısa) --------------------------------------------------

if (!reducedMotion) {
  initSmoothScroll();
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__foto', { scale: 1.12, duration: 1.4, ease: 'power2.out' }, 0)
    .from('.gantry__kiris', { scaleX: 0.6, opacity: 0, duration: 0.6 }, 0)
    .from('[data-tabela]', { yPercent: -18, rotateX: -30, opacity: 0, transformOrigin: '50% 0', duration: 0.9 }, 0.1)
    .fromTo('.tabela__parlama', { xPercent: -120 }, { xPercent: 300, duration: 0.9, ease: 'power2.inOut' }, 0.6)
    .from('.hero__cta > *', { y: 16, opacity: 0, stagger: 0.06, duration: 0.5 }, 0.5);
  gsap.to('.hero__foto', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#kunye', start: 'top top', end: 'bottom top', scrub: true } });
  const gel = (sel, v) => $$(sel).forEach((el, i) => gsap.from(el, { ...v, opacity: 0, duration: 0.6, delay: (i % 2) * 0.06, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' } }));
  gel('.cikis', { x: 40 });
  gel('.tas, .mesaj', { y: 30 });
  addEventListener('load', () => ScrollTrigger.refresh());
}
