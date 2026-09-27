import raw from '../../data/eczane.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER, setStoryMode,
} from '../../shared/core.js';
import { pickQuality } from '../../shared/lib3d.js';
import { SplitText } from 'gsap/SplitText';
import { createPills } from './pills.js';

gsap.registerPlugin(SplitText);

const d = boot(raw);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const buYil = new Date().getFullYear();
const kurulus = d.isletme.kurulus;
const yas = buYil - kurulus;
const isDesk = () => innerWidth >= 900;
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const ad = esc(d.isletme.ad);
const html = document.documentElement;
if (reducedMotion) html.classList.add('rm');

// Türkçe ayrılma eki: 1994'ten, 1990'dan, 2008'den…
function ablative(n) {
  const birler = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const onlar = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const s = n % 10 ? birler[n % 10] : n % 100 ? onlar[Math.floor(n / 10) % 10] : 'den';
  return `${n}'${s}`;
}

// --- Arama motoru: eczane olarak işaretle -----------------------------------
function pharmacyLd() {
  const ld = $('script[type="application/ld+json"]');
  if (!ld) return;
  const saatSpec = d.saatler
    .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
    .filter(Boolean);
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    telephone: d.iletisim.telefon,
    foundingDate: String(kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: saatSpec,
  });
  document.title = `${d.isletme.ad} | Eczane | Etimesgut, Ankara`;
}
pharmacyLd();

// --- Ortak parçalar ---------------------------------------------------------
const st = openStatus(d.saatler);
const receteMsg = 'Merhaba, reçetemin fotoğrafını gönderiyorum. Hazırlayabilir misiniz?';
const btnWa = (label = 'Reçetenizi gönderin', msg = receteMsg, cls = '') =>
  `<a class="btn btn--wa mag ${cls}" href="${waHref(d, msg)}" target="_blank" rel="noopener">${icons.whatsapp}<span>${label}</span></a>`;
const btnCall = (label = 'Hemen arayın', cls = '') =>
  `<a class="btn btn--line mag ${cls}" href="${telHref(d)}">${icons.phone}<span>${label}</span></a>`;

$$('[data-bind="ad"]').forEach((el) => (el.textContent = d.isletme.ad));
$$('[data-status]').forEach((el) => {
  el.classList.toggle('is-open', st.open);
  el.innerHTML = `<i aria-hidden="true"></i>${esc(st.text)}`;
});
const topCall = $('[data-tel]');
topCall.href = telHref(d);
topCall.innerHTML = `${icons.phone}<span>${esc(d.iletisim.telefon)}</span>`;

// Yazı boyutu (büyük yaştaki müşteriler için)
const yazi = $('#yazi');
const setBig = (on) => {
  html.classList.toggle('big', on);
  yazi.setAttribute('aria-pressed', String(on));
  yazi.title = on ? 'Yazıları normale döndür' : 'Yazıları büyüt';
  try { localStorage.setItem('eczane-yazi', on ? '1' : '0'); } catch {}
  ScrollTrigger.refresh();
};
try { if (localStorage.getItem('eczane-yazi') === '1') html.classList.add('big'), yazi.setAttribute('aria-pressed', 'true'); } catch {}
yazi.addEventListener('click', () => setBig(!html.classList.contains('big')));

// --- Film: hero + duraklar ---------------------------------------------------
$('#hero').innerHTML = `
  <p class="kicker">Etimesgut'ta ${ablative(kurulus)} beri</p>
  <h1 class="hero__title">${ad}</h1>
  <p class="hero__sub">${esc(d.isletme.slogan)}</p>
  <div class="cta">${btnWa()}${btnCall()}</div>
  <p class="hero__status ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.text)}</p>`;

$('#about').innerHTML = `
  <p class="card__kicker">${yas} yıldır aynı mahallede</p>
  <h2 class="card__title">Mahallenin eczanesi.</h2>
  <p class="card__text">${esc(d.isletme.hakkinda)}</p>`;

// Telefonda 1. adımın kartında kısa sohbet (masaüstünde sağdaki telefon)
const miniChat = `
  <div class="mini" aria-hidden="true">
    <div class="mini__msg mini__msg--me"><span class="mini__rx"><b>E-REÇETE</b> 2K7M4QX</span></div>
    <div class="mini__msg mini__msg--them"><b>Reçeteniz hazır.</b> Kimlikle gelmeniz yeterli.</div>
  </div>`;
const steps = $$('.card--step');
d.surec.forEach((s, i) => {
  if (!steps[i]) return;
  steps[i].innerHTML = `
    <p class="card__no"><span>${i + 1}</span> / ${d.surec.length}</p>
    <h2 class="card__title">${esc(s.baslik)}</h2>
    <p class="card__text">${esc(s.aciklama)}</p>
    ${i === 0 ? `${miniChat}<div class="cta cta--card">${btnWa("WhatsApp'tan gönderin")}</div>` : ''}
    ${i === 2 ? `<p class="card__note">${esc(d.garanti)}</p>` : ''}`;
});
if (steps[0]) steps[0].classList.add('card--chat');
$('#rail').innerHTML = d.surec.map((s, i) => `<li><span>${i + 1}</span>${esc(s.baslik)}</li>`).join('');

// Telefondaki WhatsApp sohbeti (1. adım, masaüstü)
$('#phone').innerHTML = `
  <div class="phone__screen">
    <div class="phone__bar"><span class="logo logo--sm">E</span><b>${ad}</b><small>çevrimiçi</small></div>
    <div class="phone__chat">
      <div class="msg msg--me msg--rx">
        <div class="rx">
          <p class="rx__head"><b>E-REÇETE</b><span>Örnek</span></p>
          <p class="rx__code">Reçete no <b>2K7M4QX</b></p>
          <p class="rx__line"></p><p class="rx__line rx__line--s"></p><p class="rx__line"></p>
        </div>
        <span class="msg__time">14:02 ✓✓</span>
      </div>
      <div class="msg msg--me"><p>Merhaba, annemin reçetesi. Akşam gelip alırım.</p><span class="msg__time">14:02 ✓✓</span></div>
      <div class="msg msg--typing" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="msg msg--them"><p>Merhaba, aldık. İlaçları hazırlıyoruz, hazır olunca yazarız.</p><span class="msg__time">14:04</span></div>
      <div class="msg msg--them msg--ready"><p><b>Reçeteniz hazır.</b> Kimlikle gelmeniz yeterli.</p><span class="msg__time">14:19</span></div>
    </div>
  </div>`;

// --- Rakamlar ---------------------------------------------------------------
const stats = d.istatistikler.map((s) => (s.kurulustanHesapla ? { ...s, deger: yas } : s));
$('#stats').innerHTML = `
  <ul class="stats__list">
    ${stats.map((s) => `
      <li class="stat">
        <p class="stat__num"><span data-count="${s.deger}">${fmt(s.deger)}</span>${esc(s.sonek || '')}</p>
        <p class="stat__label">${esc(s.etiket)}</p>
      </li>`).join('')}
  </ul>`;

// --- Hizmetler --------------------------------------------------------------
$('#hizmetler').innerHTML = `
  <header class="sec__head">
    <h2 class="sec__title">Eczanede neler yapıyoruz</h2>
    <p class="sec__lead">İlacınızı vermekle kalmıyoruz. Sorunuz olursa eczacımız tezgâhta, telefonda ve WhatsApp'ta.</p>
  </header>
  <div class="svcs__grid">
    <div class="svcs__media" aria-hidden="true">
      ${d.hizmetler.map((h, i) => `<img src="${h.gorsel}" alt="" loading="lazy" data-i="${i}">`).join('')}
    </div>
    <ul class="svcs__list">
      ${d.hizmetler.map((h, i) => `
        <li class="svc" data-i="${i}">
          <img class="svc__img" src="${h.gorsel}" alt="" loading="lazy">
          <h3 class="svc__title">${esc(h.baslik)}</h3>
          <p class="svc__text">${esc(h.aciklama)}</p>
          ${h.mesaj ? `<a class="svc__link" href="${waHref(d, h.mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yazın</span></a>` : ''}
        </li>`).join('')}
    </ul>
  </div>`;

// --- Ölçüm ------------------------------------------------------------------
$('#olcum').innerHTML = `
  <div class="olcum__text">
    <h2 class="sec__title">Tansiyonunuzu ölçelim, sonucu yazıp verelim.</h2>
    <p class="sec__lead">Birkaç dakika oturup dinlenin, sonra ölçelim. Sonucu tarihiyle kâğıda yazarız; kontrole giderken hekiminize gösterirsiniz. Şeker ölçümü için aç mı gelmeniz gerektiğini önceden arayıp sorun.</p>
    <div class="cta">${btnCall('Önceden arayın')}</div>
  </div>
  <figure class="bpm" aria-label="Örnek tansiyon aleti ekranı">
    <div class="bpm__body">
      <div class="bpm__lcd">
        <p class="bpm__row"><small>SYS<br>mmHg</small><b data-bp="118">0</b></p>
        <p class="bpm__row"><small>DIA<br>mmHg</small><b data-bp="76">0</b></p>
        <p class="bpm__row bpm__row--s"><small>NABIZ<br>/dk</small><b data-bp="72">0</b><i class="bpm__heart" aria-hidden="true">♥</i></p>
      </div>
      <div class="bpm__btns" aria-hidden="true"><span></span><span class="is-go"></span></div>
    </div>
    <figcaption>Örnek ekran. Değerleriniz hakkında hekiminize danışın.</figcaption>
  </figure>`;

// --- Nöbet ------------------------------------------------------------------
const nobetDurum = st.open
  ? 'Şu an açığız. Kapandıktan sonra ilaç lazım olursa aşağıdaki listeye bakın.'
  : 'Şu an kapalıyız. Bu gece açık olan en yakın eczaneyi aşağıdaki listeden bulabilirsiniz.';
$('#nobet').innerHTML = `
  <div class="nobet__inner">
    <div class="nobet__sign" aria-hidden="true">
      <div class="nobet__box"><span class="nobet__e">E</span></div>
      <p class="nobet__led">NÖBETÇİ</p>
    </div>
    <div class="nobet__text">
      <h2 class="sec__title">Gece ilaç mı lazım oldu?</h2>
      <p class="sec__lead">${esc(nobetDurum)}</p>
      <p class="sec__lead">Bu gece nöbetçi eczaneler için ${esc(d.nobet.kaynak)}'nın güncel listesine bakın. Nöbetçi olduğumuz geceler kapımızda da yazar.</p>
      <div class="cta"><a class="btn btn--red mag" href="${esc(d.nobet.url)}" target="_blank" rel="noopener"><span>Nöbetçi eczaneleri gör</span></a></div>
      ${nobetTakvim()}
    </div>
  </div>`;

// Örnek nöbet takvimi: bu ayın günleri, iki gün işaretli. Gerçek nöbet günleri odanın çizelgesiyle belirlenir.
function nobetTakvim() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const gunSay = new Date(y, m + 1, 0).getDate();
  const bas = (new Date(y, m, 1).getDay() + 6) % 7; // Pazartesi başlangıç
  const nobet = [9, 23];
  const ay = now.toLocaleDateString('tr-TR', { month: 'long' });
  const hucre = [];
  for (let i = 0; i < bas; i++) hucre.push('<li class="is-bos"></li>');
  for (let g = 1; g <= gunSay; g++) {
    const cls = [nobet.includes(g) ? 'is-nobet' : '', g === now.getDate() ? 'is-bugun' : ''].filter(Boolean).join(' ');
    hucre.push(`<li${cls ? ` class="${cls}"` : ''}>${g}</li>`);
  }
  return `
    <figure class="takvim" aria-label="Örnek nöbet takvimi">
      <figcaption><b>${esc(ay[0].toLocaleUpperCase('tr-TR') + ay.slice(1))} nöbet günleri</b><span class="etiket">Örnek</span></figcaption>
      <ol class="takvim__gun" aria-hidden="true">${['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((g) => `<li>${g}</li>`).join('')}</ol>
      <ol class="takvim__ay">${hucre.join('')}</ol>
      <p class="takvim__not">Örnek görünüm. Nöbet günleri her ay oda çizelgesiyle belirlenir; güncel bilgi için yukarıdaki listeye bakın.</p>
    </figure>`;
}

// --- Yorumlar ---------------------------------------------------------------
const star = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <header class="reviews__head">
    <p class="reviews__score"><b data-score="${d.puan.ortalama}">${String(d.puan.ortalama).replace('.', ',')}</b><span class="stars stars--big" aria-hidden="true">${star(5)}</span></p>
    <p class="reviews__count"><span class="etiket etiket--koyu">Örnek yorumlar</span> Puan ve yorumlar tanıtım içindir.</p>
    <h2 class="sec__title">Mahalleli ne diyor</h2>
  </header>
  <ul class="reviews__list">
    ${d.yorumlar.map((y) => `
      <li class="review">
        <span class="stars" aria-label="5 üzerinden ${y.puan}">${star(y.puan)}</span>
        <p class="review__text">${esc(y.metin)}</p>
        <p class="review__who">${esc(y.ad)}</p>
      </li>`).join('')}
  </ul>`;

// --- Ulaşım -----------------------------------------------------------------
$('#ulasim').innerHTML = `
  <div class="visit__info">
    <h2 class="sec__title">Açık olduğumuz saatler</h2>
    <p class="visit__status ${st.open ? 'is-open' : ''}"><i aria-hidden="true"></i>${esc(st.text)}</p>
    <dl class="hours">
      ${groupedHours(d.saatler).map(([gun, saat]) => `
        <div class="hours__row" data-days="${esc(gun)}"><dt>${esc(gun)}</dt><dd>${esc(saat)}</dd></div>`).join('')}
    </dl>
    <p class="visit__nobet">Kapalı saatlerde: <a href="${esc(d.nobet.url)}" target="_blank" rel="noopener">bu gece nöbetçi eczaneler</a></p>
    <h3 class="visit__h">Adres</h3>
    <p class="visit__addr">${esc(d.iletisim.adres)}</p>
    <div class="cta">
      <a class="btn btn--ink mag" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi alın</span></a>
      ${btnCall(esc(d.iletisim.telefon))}
    </div>
  </div>
  <div class="visit__map" id="map"><p>Harita yükleniyor</p></div>`;

// Bugünün satırını işaretle (gruplanmış günler içinde)
(() => {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const today = new Date().getDay();
  $$('.hours__row').forEach((row) => {
    const [a, b] = row.dataset.days.split(' – ');
    const ia = order.indexOf(GUNLER.indexOf(a));
    const ib = b ? order.indexOf(GUNLER.indexOf(b)) : ia;
    const it = order.indexOf(today);
    if (it >= ia && it <= ib) row.classList.add('is-today');
  });
})();

$('#final').innerHTML = `
  <p class="kicker">${esc(st.text)}</p>
  <h2 class="final__title">Reçetenizi gönderin, gelmeden hazır olsun.</h2>
  <div class="cta cta--big">${btnWa('Reçetenizi WhatsApp’tan gönderin')}${btnCall()}</div>`;

$('#foot').innerHTML = `
  <div class="foot__brand"><span class="logo" aria-hidden="true">E</span><b>${ad}</b></div>
  <p>${esc(d.iletisim.adres)}</p>
  <p><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
  <p class="foot__small">Bu sitedeki bilgiler tanıtım amaçlıdır. İlaç kullanımıyla ilgili kararlarınız için hekiminize ve eczacınıza danışın.</p>
  <p class="foot__small">© ${buYil} ${ad}. Fotoğraflar temsilîdir (Pexels). 3D görseller temsilîdir. Yorumlar örnektir.</p>`;

// Harita: yaklaşınca yükle
const mapEl = $('#map');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapEl.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px' }).observe(mapEl);

// --- 3D sahne ---------------------------------------------------------------
const canvas = $('#gl');
const quality = pickQuality();
let pills = null;
try {
  pills = createPills(canvas, { name: d.isletme.ad, lowEnd, quality, still: reducedMotion });
} catch (e) {
  html.classList.add('no-gl');
}
addEventListener('resize', () => pills?.resize());

const lenis = initSmoothScroll();
const top = $('#top');

// --- Hareketsiz mod ---------------------------------------------------------
if (reducedMotion) {
  $('#intro').remove();
  if (pills) {
    pills.setState({ film: 0, intro: 1 });
    pills.renderOnce();
  }
  const night = () => {
    const n = scrollY < innerHeight * 0.85;
    top.classList.toggle('is-night', n);
    top.classList.toggle('is-solid', !n);
  };
  night();
  addEventListener('scroll', night, { passive: true });
  $$('[data-count]').forEach((el) => (el.textContent = fmt(+el.dataset.count)));
  $$('[data-bp]').forEach((el) => (el.textContent = el.dataset.bp));
  $$('.mini__msg').forEach((m) => m.classList.add('is-on'));
} else {
  motion();
}

function motion() {
  const film = $('#film');
  const stops = $$('.stop', film);
  const cards = $$('.card', film);
  const phone = $('#phone');
  const railEl = $('#rail');
  const rail = $$('li', railEl);
  // Sahne aralıkları (0..1): hakkımızda, 1. adım (sohbet), 2. adım (blister), 3. adım (dönen blister)
  const RANGES = [[0.17, 0.33], [0.37, 0.5], [0.54, 0.74], [0.78, 0.94]];
  const state = { film: 0, intro: 0 };

  // Kaydırma konumu → sahne ilerlemesi: her durağın kartı yapışık kaldığı sürece kendi aralığında ilerler.
  let anchors = [[0, 0], [1, 1]];
  const measure = () => {
    const vh = innerHeight;
    const ft = film.offsetTop;
    const list = [[0, 0]];
    stops.forEach((st, i) => {
      const [a, b] = RANGES[i];
      const t0 = ft + st.offsetTop - vh * 0.55;
      const t1 = ft + st.offsetTop + st.offsetHeight - vh * 0.98;
      list.push([Math.max(list[list.length - 1][0] + 1, t0), a + 0.01], [Math.max(t0 + 2, t1), b - 0.01]);
    });
    list.push([Math.max(list[list.length - 1][0] + 1, ft + film.offsetHeight - vh * 0.7), 1]);
    anchors = list;
  };
  const progressAt = (y) => {
    if (y <= anchors[0][0]) return anchors[0][1];
    for (let i = 1; i < anchors.length; i++) {
      const [y1, f1] = anchors[i];
      if (y <= y1) {
        const [y0, f0] = anchors[i - 1];
        return f0 + ((y - y0) / (y1 - y0)) * (f1 - f0);
      }
    }
    return 1;
  };

  // Hero başlığı harf harf
  const title = $('.hero__title');
  const split = new SplitText(title, { type: 'chars,words', charsClass: 'char' });
  gsap.set(split.chars, { yPercent: 110, opacity: 0 });
  gsap.set(['.hero__sub', '#hero .cta', '.hero__status', '#hero .kicker'], { autoAlpha: 0, y: 24 });

  const msgs = $$('.msg', phone);
  const desk = () => innerWidth >= 900;

  function paint(f) {
    state.film = f;
    pills?.setState(state);
    film.style.setProperty('--night', String(1 - gsap.utils.clamp(0, 1, (f - 0.12) / 0.16)));
    if (desk()) {
      // Telefon 1. adımda görünür, 2. adımın başında kaybolur
      const pIn = gsap.utils.clamp(0, 1, (f - 0.34) / 0.05);
      const pOut = gsap.utils.clamp(0, 1, (0.56 - f) / 0.04);
      const pv = Math.min(pIn, pOut);
      phone.style.opacity = pv;
      phone.style.visibility = pv < 0.01 ? 'hidden' : 'visible';
      phone.style.setProperty('--p', pv);
      const chatT = gsap.utils.clamp(0, 1, (f - 0.37) / 0.14);
      msgs.forEach((m, i) => {
        const at = [0.02, 0.2, 0.4, 0.55, 0.85][i];
        const on = chatT >= at;
        m.classList.toggle('is-on', i === 2 ? on && chatT < 0.55 : on);
      });
      const stepIdx = f < 0.36 ? -1 : f < 0.52 ? 0 : f < 0.76 ? 1 : f < 0.95 ? 2 : 3;
      rail.forEach((li, i) => {
        li.classList.toggle('is-on', i === stepIdx);
        li.classList.toggle('is-done', i < stepIdx);
      });
      railEl.classList.toggle('is-shown', f > 0.35 && f < 0.95);
    }
    top.classList.toggle('is-night', f < 0.2);
  }
  measure();
  paint(0);

  ScrollTrigger.create({
    trigger: film,
    start: 'top top',
    end: 'bottom top',
    onRefresh: measure,
    onUpdate: () => paint(progressAt(scrollY)),
  });
  ScrollTrigger.create({
    trigger: film,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (s) => {
      canvas.classList.toggle('is-off', !s.isActive);
      if (!s.isActive) {
        phone.style.visibility = 'hidden';
        railEl.classList.remove('is-shown');
      }
      if (!pills) return;
      s.isActive ? pills.start() : pills.stop();
    },
  });

  // Duraklar boyunca hikâye modu: alt çubuk iner, kart onun boşluğuna oturur (hero ve sonrası çubuklu)
  ScrollTrigger.create({
    trigger: stops[0], endTrigger: stops[stops.length - 1], start: 'top 70%', end: () => `bottom ${Math.round(innerHeight * 0.9)}px`,
    onToggle: (st) => setStoryMode(st.isActive ? true : null),
  });

  // Kartlar: durağa girerken belirir, durak biterken söner (görünmezken dokunmayı yutmaz)
  cards.forEach((card) => {
    const stop = card.parentElement;
    gsap.fromTo(card, { autoAlpha: 0, y: 40 }, {
      autoAlpha: 1, y: 0, ease: 'power2.out',
      scrollTrigger: { trigger: stop, start: 'top 92%', end: 'top 55%', scrub: 0.4 },
    });
    gsap.to(card, {
      autoAlpha: 0, y: -30, ease: 'power1.in', immediateRender: false,
      scrollTrigger: { trigger: stop, start: 'bottom 98%', end: 'bottom 70%', scrub: 0.4 },
    });
  });
  // Telefonda kart içi sohbet: kart görününce mesajlar sırayla gelir
  const mini = $$('.mini__msg');
  if (mini.length) {
    ScrollTrigger.create({
      trigger: mini[0].closest('.stop'), start: 'top 45%',
      onEnter: () => mini.forEach((m, i) => setTimeout(() => m.classList.add("is-on"), 120 + i * 700)),
    });
  }

  // --- Giriş (≤ 2 sn, dokununca geçer; vitrinde yok) -------------------------
  const intro = $('#intro');
  const sign = $('.intro__sign', intro);
  const heroIn = () => gsap.timeline()
    .to(split.chars, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.022, ease: 'power4.out' }, 0)
    .to(['#hero .kicker', '.hero__sub', '#hero .cta', '.hero__status'], { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.2);
  if (html.classList.contains('is-vitrin')) {
    intro.remove();
    gsap.to(state, { intro: 1, duration: 1.4, ease: 'power3.inOut', onUpdate: () => pills?.setState(state) });
    heroIn();
  } else {
    const E = [];
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 9; x++) {
        const s = 2;
        E.push(x < s + 0.3 || y < s + 0.3 || y >= 12 - s || (y >= 5 && y < 5 + s && x < 7));
      }
    sign.innerHTML = E.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('');
    lenis?.stop();
    const dots = $$('.on', sign);
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.to(dots, { opacity: 1, scale: 1, duration: 0.22, stagger: { each: 0.01, from: 'random' } })
      .to('.intro__name', { opacity: 1, y: 0, duration: 0.45 }, 0.45)
      .to(sign, { filter: 'brightness(1.6)', duration: 0.12, yoyo: true, repeat: 1 }, 0.85)
      .to(state, { intro: 1, duration: 1.5, ease: 'power3.inOut', onUpdate: () => pills?.setState(state) }, 0.9)
      .to(intro, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, 1.15)
      .add(() => {
        intro.remove();
        lenis?.start();
      }, 1.6)
      .add(heroIn(), 1.25);
    const skip = () => {
      if (tl.progress() < 1) tl.progress(1);
    };
    intro.addEventListener('pointerdown', skip, { once: true });
    addEventListener('keydown', skip, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchmove', skip, { once: true, passive: true });
  }
  pills?.compile();
  pills?.start();

  // --- Rakamlar -------------------------------------------------------------
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: to, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => (el.textContent = fmt(o.v)),
    });
  });
  gsap.fromTo('.stats', { '--line': 0 }, { '--line': 1, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top 85%', end: 'top 35%', scrub: true } });

  // --- Hizmetler: aktif satır kalınlaşır, görsel değişir ---------------------
  const rows = $$('.svc');
  const media = $$('.svcs__media img');
  const setActive = (i) => {
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
    media.forEach((m, k) => m.classList.toggle('is-active', k === i));
  };
  setActive(0);
  rows.forEach((r, i) => {
    ScrollTrigger.create({ trigger: r, start: 'top 60%', end: 'bottom 60%', onToggle: (s) => s.isActive && setActive(i) });
    gsap.fromTo($('.svc__title', r), { '--w': 380 }, {
      '--w': 760, ease: 'none',
      scrollTrigger: { trigger: r, start: 'top 90%', end: 'top 45%', scrub: true },
    });
    const img = $('.svc__img', r);
    gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0 round 16px)' }, {
      clipPath: 'inset(0 0 0% 0 round 16px)', ease: 'none',
      scrollTrigger: { trigger: r, start: 'top 95%', end: 'top 55%', scrub: true },
    });
  });

  // --- Ölçüm aleti -----------------------------------------------------------
  const bps = $$('[data-bp]');
  ScrollTrigger.create({
    trigger: '.bpm', start: 'top 70%', once: true,
    onEnter: () => {
      const bp = $('.bpm');
      bp.classList.add('is-measuring');
      const o = { t: 0 };
      gsap.to(o, {
        t: 1, duration: 2.4, ease: 'power1.inOut',
        onUpdate: () => bps.forEach((el) => {
          // Önce şişer (yüksek), sonra iner: gerçek aletteki gibi
          const to = +el.dataset.bp;
          const v = o.t < 0.5 ? (o.t / 0.5) * (to + 60) : to + 60 - ((o.t - 0.5) / 0.5) * 60;
          el.textContent = String(Math.round(v));
        }),
        onComplete: () => bp.classList.replace('is-measuring', 'is-done'),
      });
    },
  });

  // --- Nöbet: gündüzden geceye, tabela yanar --------------------------------
  const nobet = $('#nobet');
  gsap.fromTo(nobet, { '--dark': 0 }, {
    '--dark': 1, ease: 'none',
    scrollTrigger: { trigger: nobet, start: 'top 90%', end: 'top 20%', scrub: true },
  });
  ScrollTrigger.create({
    trigger: nobet, start: 'top 35%',
    onEnter: () => nobet.classList.add('is-lit'),
    onLeaveBack: () => nobet.classList.remove('is-lit'),
  });

  // --- Yorum puanı ----------------------------------------------------------
  const sc = $('[data-score]');
  const so = { v: 0 };
  gsap.to(so, {
    v: +sc.dataset.score, duration: 1.2, ease: 'power2.out',
    scrollTrigger: { trigger: sc, start: 'top 85%', once: true },
    onUpdate: () => (sc.textContent = so.v.toFixed(1).replace('.', ',')),
  });
  gsap.fromTo('.stars--big span', { scale: 0, rotate: -40 }, {
    scale: 1, rotate: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(3)',
    scrollTrigger: { trigger: sc, start: 'top 85%', once: true },
  });

  // --- Final başlığı ağırlık animasyonu -------------------------------------
  gsap.fromTo('.final__title', { '--w': 300 }, {
    '--w': 800, ease: 'none',
    scrollTrigger: { trigger: '#final', start: 'top 85%', end: 'top 30%', scrub: true },
  });

  // --- Header ---------------------------------------------------------------
  ScrollTrigger.create({
    trigger: '#stats', start: 'top 80px',
    onToggle: (s) => $('#top').classList.toggle('is-solid', s.isActive || s.progress > 0),
  });

  // --- Mıknatıs butonlar (yalnızca fareyle) ---------------------------------
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.mag').forEach((b) => {
      const xTo = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
      const yTo = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener('pointerleave', () => (xTo(0), yTo(0)));
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
}
