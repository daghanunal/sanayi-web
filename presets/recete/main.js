import raw from '../../data/eczane.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc, asset,
  telHref, waHref, mapsHref, mapsEmbed, icons, GUNLER, autoHideHeader,
  saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const html = document.documentElement;
const kurulus = d.isletme.kurulus;
const yas = Math.max(1, new Date().getFullYear() - kurulus);
const waGenel = d.waMesaj || 'Merhaba, bilgi almak istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir; alt çubukta eczane metni kullanılır.
$$('.action-bar a[href*="wa.me"]').forEach((a) => (a.href = waHref(d, waGenel)));

// --- Arama motoru: eczane olarak işaretle ----------------------------------
$$('script[type="application/ld+json"]').forEach((s) => s.textContent.includes('"AutoRepair"') && s.remove());
const ld = $('script[type="application/ld+json"]');
if (ld) {
  const gunEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
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
document.title = `${d.isletme.ad} | Eczane | Etimesgut, Ankara`;

// --- Metinler ve bağlantılar -----------------------------------------------
const st = gunDurumu(d.saatler);
const tel = esc(d.iletisim.telefon);
const receteMsg = 'Merhaba, reçetemin fotoğrafını gönderiyorum.';
const btn = (cls, href, ikon, label, dis) =>
  `<a class="btn ${cls}" href="${href}"${dis ? ' target="_blank" rel="noopener"' : ''}>${ikon}<span>${label}</span></a>`;

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-tanim]').forEach((el) => (el.textContent = d.isletme.tanim));
$('[data-year]').textContent = new Date().getFullYear();
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = `<i aria-hidden="true"></i>${esc(el.classList.contains('top__status') ? st.durum : st.metin)}`;
});
$$('[data-status-text]').forEach((el) => (el.textContent = st.metin));
$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${tel}</span>`;
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${tel}</span>`;
});
$$('[data-tel-plain]').forEach((a) => {
  a.href = telHref(d);
  a.textContent = d.iletisim.telefon;
});
$$('[data-maps]').forEach((a) => {
  a.href = mapsHref(d);
  if (!a.textContent.trim()) a.innerHTML = `${icons.pin}<span>Yol tarifi</span>`;
});

// Künye
$('[data-kunye]').innerHTML = `
  <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
  <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.kunye)}</dd></div>
  <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>`;
$('[data-hero-cta]').innerHTML =
  btn('btn--ink', telHref(d), icons.phone, 'Ara') +
  btn('btn--wa', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true) +
  btn('btn--line', mapsHref(d), icons.pin, 'Yol tarifi', true);

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler
  .map((h) => `
    <li class="svc">
      <figure class="svc__img"><img src="${esc(h.gorsel)}" alt="${esc(h.gorselAlt || '')}" loading="lazy" decoding="async" width="800" height="533"></figure>
      <div class="svc__body">
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
        ${h.sure ? `<p class="svc__time">Süre: ${esc(h.sure)}</p>` : ''}
        ${h.mesaj ? `<a class="svc__wa" href="${waHref(d, h.mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>` : ''}
      </div>
    </li>`)
  .join('');
$('[data-steps]').innerHTML = d.surec
  .map((s, i) => `<li class="step"><span class="step__no" aria-hidden="true">${i + 1}</span><div><h4>${esc(s.baslik)}</h4><p>${esc(s.aciklama)}</p></div></li>`)
  .join('');
$('[data-send-cta]').innerHTML = btn('btn--wa', waHref(d, receteMsg), icons.whatsapp, 'Reçeteyi WhatsApp\'tan gönderin', true);

// Hakkında
$('[data-hakkinda]').textContent = `${d.isletme.ad} ${yilEki(kurulus)} beri Şaşmaz Mahallesi'nde. ${d.isletme.hakkinda}`;
$('[data-facts]').innerHTML = (d.bilgiler || [])
  .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
  .join('');
const acikGun = acikGunSayisi(d.saatler);
$('[data-stats]').innerHTML = [
  { deger: yas, sonek: ' yıl', etiket: "Şaşmaz Mahallesi'nde" },
  { deger: acikGun, sonek: ' gün', etiket: 'haftada açık' },
]
  .map((s) => `<li><b data-count="${s.deger}">${s.deger}</b><span class="stats__suf">${esc(s.sonek)}</span><p>${esc(s.etiket)}</p></li>`)
  .join('');

// Saatler (bugün vurgulu)
const liste = saatListesi(d.saatler);
const sira = [1, 2, 3, 4, 5, 6, 0];
const bugunG = sira.indexOf(new Date().getDay());
const bugunIdx = liste.findIndex(([gunler]) => {
  const [a, b] = gunler.split('–');
  const ia = sira.indexOf(GUNLER.indexOf(a));
  const ib = b ? sira.indexOf(GUNLER.indexOf(b)) : ia;
  return bugunG >= ia && bugunG <= ib;
});
$('[data-hours]').innerHTML = `<caption class="sr-only">Çalışma saatleri</caption><tbody>${liste
  .map(([gun, saat], i) => `<tr class="${i === bugunIdx ? 'is-today' : ''}"><th scope="row">${gun}${i === bugunIdx ? ' <em>bugün</em>' : ''}</th><td>${saat}</td></tr>`)
  .join('')}</tbody>`;

// Nöbet: güncel liste odanın sitesinde; takvim günleri örnektir.
$('[data-nobet-text]').textContent = `Eczane kapalıyken ilaç gerekirse o gece nöbet tutan eczaneler ${d.nobet.kaynak}'nın güncel listesinden bulunur. Nöbetçi olunan geceler eczanenin kapısında da yazar.`;
$('[data-nobet-link]').href = d.nobet.url;
const ay = new Date().toLocaleDateString('tr-TR', { month: 'long' });
const ayAd = ay[0].toLocaleUpperCase('tr-TR') + ay.slice(1);
const gunler = (d.nobet.ornekGunler || []).map((g) => `${g} ${ayAd}`).join(' ve ');
$('[data-nobet-ornek]').innerHTML = gunler
  ? `<span class="etiket etiket--gece">Örnek</span> ${esc(gunler)} geceleri nöbetçi. Gerçek günler oda çizelgesine göre yazılır.`
  : '';

// Örnek yorumlar
const stars = (n) => `<span class="stars" role="img" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}${`<span class="off">${icons.star}</span>`.repeat(5 - n)}</span>`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map((y) => `<li class="rev">${stars(y.puan)}<blockquote>${esc(y.metin)}</blockquote><p class="rev__who">${esc(y.ad)}${y.konu ? `<span>${esc(y.konu)}</span>` : ''}</p></li>`)
  .join('');

// İletişim
$('[data-final-cta]').innerHTML =
  btn('btn--wa', waHref(d, waGenel), icons.whatsapp, 'WhatsApp', true) +
  btn('btn--line', telHref(d), icons.phone, tel);

// Harita: yaklaşınca yükle
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();
  mapBox.insertAdjacentHTML('afterbegin', `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`);
}, { rootMargin: '600px' }).observe(mapBox);

// --- Yazı boyutu (büyük yaştaki müşteriler için) --------------------------
const yazi = $('#yazi');
const setBig = (on) => {
  html.classList.toggle('big', on);
  yazi.setAttribute('aria-pressed', String(on));
  $('.top__size-label').textContent = on ? 'Yazıyı küçült' : 'Yazıyı büyüt';
  try { localStorage.setItem('recete-yazi', on ? '1' : '0'); } catch {}
  ScrollTrigger.refresh();
};
try { if (localStorage.getItem('recete-yazi') === '1') setBig(true); } catch {}
yazi.addEventListener('click', () => setBig(!html.classList.contains('big')));

// Başlık: kaydırınca zemin alır; telefonda aşağı kaydırırken saklanır
const top = $('#top');
const onScroll = () => top.classList.toggle('is-solid', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(top, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// --- Hareket --------------------------------------------------------------
if (reducedMotion) {
  html.classList.add('rm');
} else {
  initSmoothScroll();
  motion();
}

function motion() {
  const tetik = (trigger, start = 'top 85%') => ({ trigger, start, toggleActions: 'play none none none' });

  // Künye: tabelanın ışığı yanar (tek açılış, ~1,5 sn)
  const eLen = $('.sign__e').getTotalLength();
  gsap.set('.sign__e', { strokeDasharray: eLen, strokeDashoffset: eLen, fillOpacity: 0 });
  gsap.set('.sign__e-glow', { opacity: 0 });
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero__img', { clipPath: 'inset(6% 6% 6% 6% round 28px)', scale: 1.04, duration: 1 })
    .from('.sign__box, .sign__pole', { y: 16, opacity: 0, duration: 0.5, stagger: 0.06 }, 0.05)
    .to('.sign__e', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.15)
    .to('.sign__e', { fillOpacity: 1, duration: 0.1, repeat: 3, yoyo: true, ease: 'steps(1)' }, 0.95)
    .to('.sign__e', { fillOpacity: 1, duration: 0.15 }, 1.35)
    .to('.sign__e-glow', { opacity: 1, duration: 0.4 }, 1.35)
    .from('.hero__text > :not(.sign)', { autoAlpha: 0, y: 14, duration: 0.55, stagger: 0.07 }, 0.2);

  // Bölüm başlıkları: satır satır
  $$('.sec-head h2, .about h2, .visit h2, .final h2').forEach((h) => {
    const s = new SplitText(h, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 100, duration: 0.7, stagger: 0.08, ease: 'power3.out', scrollTrigger: tetik(h) });
  });
  $$('.svc').forEach((el) => {
    gsap.from(el.querySelector('.svc__img'), { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'power3.out', scrollTrigger: tetik(el, 'top 88%') });
  });

  // Rakamlar sayar
  $$('[data-count]').forEach((el) => {
    const hedef = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: hedef, duration: 1.2, ease: 'power2.out', scrollTrigger: tetik(el, 'top 90%'),
      onUpdate: () => (el.textContent = Math.round(o.v)),
    });
  });

  // Nöbet tabelası titreyerek yanar
  gsap.timeline({ scrollTrigger: tetik('.nobet', 'top 80%') })
    .fromTo('.nobet', { '--glow': 0 }, { '--glow': 1, duration: 0.08, repeat: 5, yoyo: true, ease: 'steps(1)' })
    .to('.nobet', { '--glow': 1, duration: 0.3 });
}

// Görseller geç yüklendikçe tetikleyicileri yenile
addEventListener('load', () => ScrollTrigger.refresh());
void asset;
