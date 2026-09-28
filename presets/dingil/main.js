import tonaj from '../../data/tonaj.json';
import ek from '../../data/dingil.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, icons, esc, gsap, ScrollTrigger,
  autoHideHeader, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, GUNLER,
} from '../../shared/core.js';
import { truckHTML, WHEEL_R, IMG_W } from './truck.js';

// Dingil (klasik aile): beton grisi zemin, turuncu-kırmızı ikaz şeridi, dar League Gothic başlıklar.
// Künyenin altında yolda tenteli tır durur (brandasında işletmenin adı); açılışta ~1,2 sn'de yerine gelir,
// kaydırınca yoluna devam eder. Geri kalan her şey sakin, düz site bölümü.
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...tonaj, ...ek, preset: 'dingil' });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const st = gunDurumu(d.saatler);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const pad = (n) => String(n).padStart(2, '0');

// --- İçerik -------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#kunye">${ad}</a>
  <nav class="top__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <p class="top__status ${st.open ? 'is-open' : ''}">${st.open ? 'Açık' : 'Kapalı'}</p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="top__call-no">${tel}</span></a>`;

$('#kunye').innerHTML = `
  <div class="hero__copy">
    <h1 class="hero__title" id="hero-title">${ad}</h1>
    <p class="hero__what">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="durum ${st.open ? 'is-open' : ''}">${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--kirmizi" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--cizgi" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>
  <div class="hero__sahne" aria-hidden="true">
    <div class="hero__tir" data-tir></div>
    <div class="hero__yol"><div class="hero__serit" data-serit></div></div>
  </div>`;

$('#hizmetler').innerHTML = `
  <div class="kap">
    <div class="hizmet__bas">
      <h2 class="bas" id="hizmet-t">Hizmetler</h2>
      <p class="hizmet__giris">Çekici, kamyon, otobüs ve midibüs. Süreler yaklaşıktır, araca göre değişebilir. Fiyat ve randevu için arayın.</p>
    </div>
    <ol class="hizmet__liste">
      ${d.hizmetler.map((h, i) => `
        <li class="hizmet__satir">
          <span class="hizmet__no">${pad(i + 1)}</span>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          ${h.sure ? `<span class="hizmet__sure">${esc(h.sure)}</span>` : ''}
        </li>`).join('')}
    </ol>
  </div>`;

const g = d.galeri || [];
$('#hakkinda').innerHTML = `
  <div class="kap hakkinda__kap">
    <div>
      <h2 class="bas" id="hakkinda-t">Hakkında</h2>
      <p class="hakkinda__metin">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <dl class="rakam">
        <div><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt><dd><b>${yas}</b> yıl</dd></div>
        <div><dt>Haftada açık</dt><dd><b>${acikGun}</b> gün</dd></div>
      </dl>
    </div>
    <dl class="bilgi">
      ${(d.bilgiler || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>
  </div>
  <div class="galeri" data-lenis-prevent-touch tabindex="0" aria-label="Fotoğraflar, yana kaydırın">
    ${g.map((p) => `<figure><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async" /></figure>`).join('')}
  </div>
  ${d.markalar?.length ? `
  <div class="kap markalar">
    <h3 class="markalar__bas">Bakım yapılan markalar</h3>
    <ul class="plakalar">${d.markalar.map((m) => `<li class="plaka"><span class="plaka__tr" aria-hidden="true">TR</span><span class="plaka__ad">${esc(m)}</span></li>`).join('')}</ul>
  </div>` : ''}`;

// Bugünün satırı vurgulanır
const bugun = GUNLER[new Date().getDay()];
const gunAraligi = (etiket) => {
  const [a, b] = etiket.split('–');
  const sira = [1, 2, 3, 4, 5, 6, 0].map((i) => GUNLER[i]);
  const i = sira.indexOf(a), j = sira.indexOf(b ?? a), k = sira.indexOf(bugun);
  return k >= i && k <= j;
};
$('#saatler').innerHTML = `
  <div class="kap konum__kap">
    <div>
      <h2 class="bas" id="konum-t">Çalışma saatleri ve konum</h2>
      <p class="konum__durum ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <table class="saatler">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${saatListesi(d.saatler).map(([gun, s]) => `<tr class="${gunAraligi(gun) ? 'is-bugun' : ''}"><th scope="row">${esc(gun)}</th><td>${esc(s)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="konum__adres">${esc(d.iletisim.adres)}</p>
      <div class="konum__btn">
        <a class="btn btn--koyu" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--cizgi" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="konum__harita" data-harita><span>Harita</span></div>
  </div>`;

const yildiz = (n) => `<p class="yorum__yildizlar" role="img" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('')}</p>`;
$('#yorumlar').innerHTML = `
  <div class="kap yorum__bas">
    <h2 class="bas bas--beyaz" id="yorum-t">Örnek yorumlar</h2>
    <p class="yorum__not">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <ul class="yorum__liste" data-lenis-prevent-touch tabindex="0" aria-label="Örnek yorumlar, yana kaydırın">
    ${d.yorumlar.map((y) => `
      <li class="yorum__kart">
        ${yildiz(y.puan)}
        <blockquote>${esc(y.metin)}</blockquote>
        <p class="yorum__kim"><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></p>
      </li>`).join('')}
  </ul>`;

$('#iletisim').innerHTML = `
  <div class="kap">
    <h2 class="final__baslik" id="final-t">İletişim</h2>
    <p class="final__metin">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın. Yolda kaldıysanız konumunuzu WhatsApp'tan gönderebilirsiniz.</p>
    <div class="final__btn">
      <a class="btn btn--koyu btn--buyuk" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      <a class="btn btn--beyaz btn--buyuk" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    </div>
    <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#alt').innerHTML = `
  <div class="kap alt__kap">
    <p class="alt__ad">${ad}</p>
    <p>${esc(d.isletme.tanim)}</p>
    <p>${esc(d.iletisim.adres)}</p>
    <p><a href="${telHref(d)}">${tel}</a></p>
    <p class="alt__kucuk">© ${new Date().getFullYear()} ${ad}. Pexels'ten alınan fotoğraflar ve 3D tır görseli temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// Harita: yaklaşınca yükle
const harita = $('[data-harita]');
new IntersectionObserver((ents, io) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  harita.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(harita);

// --- Tır -------------------------------------------------------------------------

const tirKap = $('[data-tir]');
tirKap.innerHTML = truckHTML(ad);
const svg = $('.truck', tirKap);
const perde = $('[data-curtain] b', svg);
perde.textContent = d.isletme.ad;

// Brandadaki yazıyı alana sığdır
function perdeSigdir() {
  const kutu = perde.parentElement;
  const w = kutu.clientWidth, h = kutu.clientHeight;
  if (!w) return;
  perde.style.fontSize = '100px';
  const oran = Math.min((w * 0.9) / Math.max(perde.scrollWidth, 1), (h * 0.78) / 100);
  perde.style.fontSize = `${(100 * oran).toFixed(1)}px`;
}
perdeSigdir();
document.fonts?.ready.then(perdeSigdir);
addEventListener('resize', perdeSigdir);

const wheels = $$('[data-wheel]', svg);
const tekerDon = (px) => {
  const deg = ((px / WHEEL_R) * 180) / Math.PI;
  const t = `rotate(${deg.toFixed(1)}deg)`;
  wheels.forEach((w) => (w.style.transform = t));
};
const olcek = () => svg.getBoundingClientRect().width / IMG_W;

// --- Başlık ---------------------------------------------------------------------------

const top = $('#top');
if (matchMedia('(max-width: 899px)').matches) autoHideHeader(top, { offset: 120 });
const dolu = () => top.classList.toggle('is-dolu', scrollY > 40);
addEventListener('scroll', dolu, { passive: true });
dolu();

// --- Hareket ---------------------------------------------------------------------------

if (reducedMotion) {
  tekerDon(0);
} else {
  initSmoothScroll();
  const hazards = $$('[data-hazard]', svg);
  const durum = { x: 0 };
  let giriste = true;
  const koy = () => { gsap.set(tirKap, { x: durum.x }); tekerDon(durum.x / olcek()); };
  // Açılış: tır soldan gelir (~1,2 sn), durur, dörtlüler iki kez yanar. Metin baştan görünür.
  durum.x = -Math.min(innerWidth * 0.55, 520);
  koy();
  gsap.timeline({ delay: 0.1, onComplete: () => (giriste = false) })
    .to(durum, { x: 0, duration: 1.2, ease: 'power3.out', onUpdate: koy })
    .to(hazards, { opacity: 0.15, duration: 0.25, repeat: 3, yoyo: true, ease: 'steps(1)' }, '-=0.1');
  gsap.from('.hero__copy > *', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });

  // Kaydırınca tır yoluna devam eder, şerit çizgileri akar
  ScrollTrigger.create({
    trigger: '#kunye', start: 'top top', end: 'bottom top',
    onUpdate(self) {
      if (giriste) return;
      const x = self.progress * innerWidth * 0.9;
      gsap.set(tirKap, { x });
      tekerDon(x / olcek());
      gsap.set('[data-serit]', { x: -x * 0.6 });
    },
  });

  $$('.hizmet__satir').forEach((li) => gsap.from(li, { y: 20, autoAlpha: 0, duration: 0.5, ease: 'power2.out', scrollTrigger: { trigger: li, start: 'top 92%', toggleActions: 'play none none none' } }));
  gsap.from('.plaka', {
    y: -16, autoAlpha: 0, duration: 0.45, ease: 'back.out(2)', stagger: 0.04,
    scrollTrigger: { trigger: '.plakalar', start: 'top 88%', toggleActions: 'play none none none' },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}
