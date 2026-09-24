import raw from '../../data/eczane.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const html = document.documentElement;
const kurulus = d.isletme.kurulus;
const yil = new Date().getFullYear() - kurulus;

// Türkçe ayrılma eki: 1994'ten, 1990'dan, 2008'den…
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : n % 100 ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}

// --- Arama motoru: eczane olarak işaretle ----------------------------------
const ld = $('script[type="application/ld+json"]');
if (ld) {
  const gunEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${gunEn[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
    aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet },
  });
}
document.title = `${d.isletme.ad} | Eczane | Etimesgut, Ankara`;

// --- Metinler ve linkler ---------------------------------------------------
const st = openStatus(d.saatler);
const receteMsg = 'Merhaba, reçetemin fotoğrafını gönderiyorum. Hazırlayabilir misiniz?';
const btnWa = (label = 'Reçetenizi WhatsApp\'tan gönderin', msg = receteMsg) =>
  `<a class="btn btn--wa" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${label}</span></a>`;
const btnCall = (label = 'Hemen arayın') => `<a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${label}</span></a>`;

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$('[data-slogan]').textContent = d.isletme.slogan;
$('[data-since]').textContent = `Etimesgut'ta ${ablative(kurulus)} beri`;
$('[data-hakkinda]').textContent = d.isletme.hakkinda;
$('[data-garanti]').textContent = d.garanti;
$('[data-year]').textContent = new Date().getFullYear();
$('[data-today]').textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
$$('[data-address]').forEach((el) => (el.textContent = d.iletisim.adres));
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = `<i aria-hidden="true"></i>${esc(st.text)}`;
});
$$('[data-tel]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
  a.setAttribute('aria-label', `Ara: ${d.iletisim.telefon}`);
});
$$('[data-tel-btn]').forEach((a) => {
  a.href = telHref(d);
  a.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;
});
$$('[data-tel-plain]').forEach((a) => {
  a.href = telHref(d);
  a.textContent = d.iletisim.telefon;
});
$$('[data-maps]').forEach((a) => {
  a.href = mapsHref(d);
  if (!a.textContent.trim()) a.innerHTML = `${icons.pin}<span>Yol tarifi alın</span>`;
});

$('[data-hero-cta]').innerHTML = btnWa() + btnCall();
$('[data-flow-cta]').innerHTML = btnWa('Reçetenizi gönderin');
$('[data-final-cta]').innerHTML = btnWa() + btnCall();

// Adımlar
$('[data-steps]').innerHTML = d.surec
  .map((s, i) => `<li class="step" data-step="${i}"><span class="step__no">${i + 1}</span><div><h3>${esc(s.baslik)}</h3><p>${esc(s.aciklama)}</p></div></li>`)
  .join('');

// İstatistikler
const nf = new Intl.NumberFormat('tr-TR');
$('[data-stats]').innerHTML = d.istatistikler
  .map((s) => {
    const deger = s.kurulustanHesapla ? yil : s.deger;
    return `<li><b data-count="${deger}">${nf.format(deger)}</b><span class="stats__suf">${esc(s.sonek || '')}</span><p>${esc(s.etiket)}</p></li>`;
  })
  .join('');

// Hizmetler
$('[data-services]').innerHTML = d.hizmetler
  .map((h) => `
    <li class="svc">
      <figure class="svc__img"><img src="${esc(h.gorsel)}" alt="" loading="lazy" width="800" height="533"></figure>
      <div class="svc__body">
        <h3>${esc(h.baslik)}</h3>
        <p>${esc(h.aciklama)}</p>
        ${h.mesaj ? `<a class="svc__wa" href="${waHref(d, h.mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>` : ''}
      </div>
    </li>`)
  .join('');

// Nöbet
$('[data-nobet-text]').textContent = st.open
  ? `Şu an açığız. Kapandıktan sonra ilaç lazım olursa, o gece nöbet tutan eczaneleri ${d.nobet.kaynak} güncel listesinden bulabilirsiniz.`
  : `Şu an kapalıyız. Bu gece nöbetçi eczaneler için ${d.nobet.kaynak} güncel listesine bakın.`;
$('[data-nobet-link]').href = d.nobet.url;
$('[data-nobet-src]').textContent = `Liste ${d.nobet.kaynak} sitesinde açılır.`;

// Yorumlar
const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${icons.star.repeat(n)}</span>`;
$('[data-score]').innerHTML = `<b>${String(d.puan.ortalama).replace('.', ',')}</b>${stars(5)}<span>${nf.format(d.puan.adet)} değerlendirme</span>`;
$('[data-reviews]').innerHTML = d.yorumlar
  .map((y) => `<li class="rev">${stars(y.puan)}<blockquote>${esc(y.metin)}</blockquote><p class="rev__who">${esc(y.ad)}</p></li>`)
  .join('');

// Saatler (bugün vurgulu)
const bugun = new Date().getDay();
const bugunGrup = (gun) => {
  const sira = [1, 2, 3, 4, 5, 6, 0];
  return groupedHours(d.saatler).findIndex(([gunler]) => {
    const parca = gunler.split(' – ');
    const a = sira.indexOf(GUNLER.indexOf(parca[0]));
    const b = sira.indexOf(GUNLER.indexOf(parca.at(-1)));
    const g = sira.indexOf(gun);
    return g >= a && g <= b;
  });
};
const bugunIdx = bugunGrup(bugun);
$('[data-hours]').innerHTML = groupedHours(d.saatler)
  .map(([gun, saat], i) => `<tr class="${i === bugunIdx ? 'is-today' : ''}"><th scope="row">${gun}${i === bugunIdx ? ' <em>bugün</em>' : ''}</th><td>${saat}</td></tr>`)
  .join('');

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

// Header: kaydırınca zemin al
const top = $('#top');
const onScroll = () => top.classList.toggle('is-solid', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// --- Hareket --------------------------------------------------------------
if (reducedMotion) {
  html.classList.add('rm');
} else {
  initSmoothScroll();
  motion();
}

function motion() {
  // Hero: tabelanın ışığı yanar (tek sahneli açılış)
  const eLen = $('.sign__e').getTotalLength();
  gsap.set('.sign__e', { strokeDasharray: eLen, strokeDashoffset: eLen, fillOpacity: 0 });
  gsap.set('.sign__e-glow', { opacity: 0 });
  const title = new SplitText('.hero__title', { type: 'lines', mask: 'lines' });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.sign__box, .sign__pole', { y: 24, opacity: 0, duration: 0.7, stagger: 0.08 })
    .to('.sign__e', { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 0.2)
    .to('.sign__e', { fillOpacity: 1, duration: 0.15, repeat: 3, yoyo: true, ease: 'steps(1)' }, 1.25)
    .to('.sign__e', { fillOpacity: 1, duration: 0.2 }, 1.9)
    .to('.sign__e-glow', { opacity: 1, duration: 0.6 }, 1.9)
    .from('.sign__cap', { opacity: 0, y: 8, duration: 0.5 }, 2)
    .from('.hero__since', { opacity: 0, y: 10, duration: 0.5 }, 0.3)
    .from(title.lines, { yPercent: 105, duration: 0.9, stagger: 0.09 }, 0.4)
    .from('.hero__lead, .hero__cta, .hero__status', { opacity: 0, y: 16, duration: 0.6, stagger: 0.1 }, 0.9);

  // İmza: reçeteden poşete (pinli, scroll ile)
  const mm = gsap.matchMedia();
  mm.add({ mobile: '(max-width: 899px)', desktop: '(min-width: 900px)' }, (ctx) => {
    const { mobile } = ctx.conditions;
    const steps = $$('.step');
    const setStep = (i) => steps.forEach((s, j) => s.classList.toggle('is-on', j === i));
    setStep(0);
    const t = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '.flow',
        start: 'top top',
        end: mobile ? '+=220%' : '+=260%',
        pin: '.flow__pin',
        scrub: 0.6,
        onUpdate: (self) => setStep(Math.min(2, Math.floor(self.progress * 3.02))),
      },
    });
    // 1: reçete sahneye girerken gelir (scroll'dan bağımsız), pinde "gönderilir"
    gsap.fromTo('.rx', { y: 60, rotate: -8, opacity: 0 }, {
      y: 0, rotate: -3, opacity: 1, duration: 0.9, ease: 'power3.out', immediateRender: true,
      scrollTrigger: { trigger: '.flow', start: 'top 75%', once: true },
    });
    t.fromTo('.rx__sent', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5 }, 0.3)
      // 2: eczacı kontrol eder, kutular hazırlanır
      .fromTo('.rx__lines li', { '--tick': 0 }, { '--tick': 1, duration: 0.4, stagger: 0.35 }, '+=0.3')
      .fromTo('.box', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.25 }, '<0.2')
      .fromTo('.rx', { x: 0, scale: 1 }, { x: mobile ? -30 : -60, y: -20, rotate: -9, scale: 0.86, opacity: 0.35, duration: 0.8, immediateRender: false }, '+=0.2')
      // 3: poşete girer, poşet adı ve tarihle kapanır
      .fromTo('.bag', { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '+=0.1')
      .to('.box', { y: mobile ? 70 : 90, scale: 0.7, opacity: 0, duration: 0.7, stagger: 0.12 }, '<0.3')
      .fromTo('.bag__front > *', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12 })
      .fromTo('.bag__ready', { scale: 1.3 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' }, '<')
      .to({}, { duration: 0.4 });
  });

  // İstatistik sayaçları
  $$('[data-count]').forEach((el) => {
    const hedef = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => (el.textContent = nf.format(Math.round(o.v))),
    });
  });

  // Bölüm başlıkları ve kartlar: ölçülü giriş
  $$('.sec-head h2, .nobet h2, .visit h2, .final h2').forEach((h) => {
    const s = new SplitText(h, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 100, duration: 0.8, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });
  $$('.svc').forEach((el) => {
    gsap.from(el.querySelector('.svc__img'), { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  // Nöbet: tabela titreyerek yanar
  gsap.timeline({ scrollTrigger: { trigger: '.nobet__card', start: 'top 75%', once: true } })
    .fromTo('.nobet', { '--glow': 0 }, { '--glow': 1, duration: 0.08, repeat: 5, yoyo: true, ease: 'steps(1)' })
    .to('.nobet', { '--glow': 1, duration: 0.3 });
}

// Görseller geç yüklendikçe tetikleyicileri yenile
addEventListener('load', () => ScrollTrigger.refresh());
