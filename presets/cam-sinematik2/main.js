import '../../shared/base.css';
import './style.css';
import raw from '../../data/kristal.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, esc,
  telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, GUNLER,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { createWorld, SPECTRUM } from './scene.js';

gsap.registerPlugin(SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, preset: 'cam-sinematik2' });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const phone = matchMedia('(max-width: 899px)').matches;
const low = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;

const ad = esc(d.isletme.ad);
const yil = new Date().getFullYear();
const tecrube = yil - d.isletme.kurulus;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');

// "2006'dan", "1994'ten": yılın okunuşuna göre ek
function beri(y) {
  const birler = ["'den", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"];
  const onlar = [null, "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"];
  if (y % 10) return y + birler[y % 10];
  if (y % 100) return y + onlar[(y % 100) / 10];
  return y + "'den";
}

const WA_FOTO = waHref(d, `Merhaba ${d.isletme.ad}, camımın fotoğrafını gönderiyorum. Tamir mi değişim mi, bakabilir misiniz?`);
const WA_KASKO = waHref(d, `Merhaba ${d.isletme.ad}, kaskom var. Ön cam için fotoğraf ve ruhsat gönderiyorum.`);
const status = openStatus(d.saatler);

// Tayf renkli harfler: metni harf harf renklendirmeden, arka plan geçişiyle
const logo = `<svg viewBox="0 0 34 24" aria-hidden="true"><path d="M13 3 23 21H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M0 12h9" stroke="currentColor" stroke-width="1.6" opacity=".7"/>${SPECTRUM.map((c, i) => `<path d="M17 12 34 ${5 + i * 2.3}" stroke="${c}" stroke-width="1.3"/>`).join('')}</svg>`;

// --- Render ----------------------------------------------------------------------------

$('#top').innerHTML = `
  <a class="top__brand" href="#sahne">${logo}<span>${ad}</span></a>
  <nav class="top__nav" aria-label="Bölümler">
    <a href="#tas">Taş izi</a><a href="#cam-filmi">Cam filmi</a><a href="#hizmetler">Hizmetler</a><a href="#ulasim">Konum</a>
  </nav>
  <p class="top__status ${status.open ? 'is-open' : ''}"><i></i><span class="top__long">${esc(status.text)}</span><span class="top__short">${status.open ? 'Açık' : 'Kapalı'}</span></p>
  <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${esc(d.iletisim.telefon)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`;

const sticky = (inner, extra = '') => `<div class="scene__sticky ${extra}"><div class="copy">${inner}</div></div>`;
const kicker = (n, t) => `<p class="kick"><span class="kick__n">${n}</span>${t}</p>`;

$('#sahne').innerHTML = sticky(`
  <p class="kick kick--hero">Oto cam · Şaşmaz Oto Sanayi'nde ${beri(d.isletme.kurulus)} beri</p>
  <h1 class="h1" id="hero-title" data-reveal>${ad}</h1>
  <p class="lead">${esc(d.isletme.slogan)}</p>
  <div class="actions">
    <a class="btn btn--main" href="${WA_FOTO}" target="_blank" rel="noopener">${icons.whatsapp}<span>Camın fotoğrafını gönder</span></a>
    <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>Hemen ara</span></a>
  </div>`, 'is-hero') + `<p class="hint" aria-hidden="true"><span></span>Kaydırın, ışık camdan geçsin</p>`;

$('#katman').innerHTML = sticky(`
  ${kicker('01', 'Camın içi')}
  <h2 class="h2" id="katman-title" data-reveal>Ön cam tek parça değildir.</h2>
  <p class="lead">İki cam, arasında ince bir film. Taş dış camda kalır, film camın dağılmasını önler. Küçük iz bu yüzden tamirle kurtulur.</p>
  <ul class="layers" aria-label="Ön camın katmanları">
    <li style="--c:${SPECTRUM[4]}"><b>Dış cam</b><span>Yola bakan yüz, taş buraya değer</span></li>
    <li style="--c:${SPECTRUM[6]}"><b>Ara film</b><span>Kırılınca parçaları bir arada tutar</span></li>
    <li style="--c:${SPECTRUM[3]}"><b>İç cam</b><span>Kabine bakan yüz, kamera buna yapışır</span></li>
  </ul>`);

$('#tas').innerHTML = sticky(`
  <div class="beat" data-beat="0">
    ${kicker('02', 'Taş izi')}
    <h2 class="h2" id="tas-title" data-reveal>Bir çakıl, bir çıt sesi.</h2>
    <p class="lead">Öndeki aracın lastiğinden fırlayan küçük bir taş, dış camda yıldız şeklinde iz bırakır.</p>
  </div>
  <div class="beat" data-beat="1">
    ${kicker('02', 'Taş izi')}
    <h2 class="h2" data-reveal>İz bugün küçük. Soğuk onu büyütür.</h2>
    <p class="lead">Isı farkı ve yol titreşimi çatlağı uzatır. Bozuk para boyundaysa camı değiştirmeden kurtarırız.</p>
    <div class="meter" aria-hidden="true">
      <span class="meter__coin"><i id="coin-in"></i></span>
      <span class="meter__txt"><small>İz çapı</small><b id="iz">0 mm</b><em id="iz-state">Tamir edilir</em></span>
    </div>
  </div>`);

$('#recine').innerHTML = sticky(`
  ${kicker('03', 'Tamir')}
  <h2 class="h2" id="recine-title" data-reveal>Reçine doldurur, UV ışık sertleştirir.</h2>
  <p class="clock" aria-hidden="true"><span id="timer">00:00</span><small>/ 30 dk</small></p>
  <ol class="steps" id="resin-steps">
    <li><b>İzi temizleriz</b><span>İçindeki hava ve nem vakumla alınır.</span></li>
    <li><b>Reçineyi basarız</b><span>Şeffaf reçine çatlağın her koluna dolar.</span></li>
    <li><b>Işıkla sertleştiririz</b><span>UV lamba reçineyi birkaç dakikada dondurur.</span></li>
    <li><b>Yüzeyi düzleriz</b><span>İz silikleşir, yerini zor bulursunuz.</span></li>
  </ol>`);

const filmler = d.filmler || [];
const DEFAULT_FILM = Math.min(2, filmler.length - 1);
$('#cam-filmi').innerHTML = sticky(`
  ${kicker('04', 'Cam filmi')}
  <h2 class="h2" id="film-title" data-reveal>Güneşi camda durdurun.</h2>
  <p class="lead lead--small">Koyuluğu seçin, ışığın nasıl kesildiğini görün. Hangi cama hangi ton uygun, uygulamadan önce söyleriz.</p>
  <div class="tint" role="group" aria-label="Film koyuluğu">
    <div class="tint__opts">
      ${filmler.map((f, i) => `<button type="button" class="tint__opt" data-film="${i}" aria-pressed="false">${esc(f.ad)}</button>`).join('')}
    </div>
    <dl class="tint__read">
      <div><dt>Geçen ışık</dt><dd id="t-vlt">%100</dd></div>
      <div><dt>UV engeli</dt><dd id="t-uv">%0</dd></div>
      <div><dt>Isı kesme</dt><dd class="heat" id="t-heat">${'<i></i>'.repeat(5)}</dd></div>
    </dl>
    <p class="tint__note" id="t-note">Filmsiz cam</p>
  </div>`);

$('#kalibrasyon').innerHTML = sticky(`
  ${kicker('05', 'Kalibrasyon')}
  <h2 class="h2" id="adas-title" data-reveal>Cam değişti, kamera yeniden ayarlanır.</h2>
  <p class="lead">Şerit takip ve acil fren kamerası ön camın arkasındadır. Değişimden sonra hedef levhayla cihazda kalibre ederiz.</p>
  <div class="gauge" aria-hidden="true">
    <span class="gauge__lbl">Kamera sapması</span>
    <span class="gauge__val" id="adas">1,8°</span>
    <span class="gauge__state" id="adas-state">Ayarlanıyor</span>
  </div>`);

const hue = (i, n) => SPECTRUM[Math.round((i / Math.max(1, n - 1)) * (SPECTRUM.length - 1))];
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <p class="kick"><span class="kick__n">06</span>Hizmetler</p>
      <h2 class="h2" id="services-title" data-reveal>Aracın bütün camları, tek tezgâhta.</h2>
    </div>
    <ul class="svc">
      ${d.hizmetler.map((h, i, a) => `
        <li class="svc__row" style="--c:${hue(i, a.length)}">
          <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(h.baslik)}</h3>
          <p>${esc(h.aciklama)}</p>
          <span class="svc__time">${esc(h.sure)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

$('#kasko').innerHTML = `
  <div class="wrap process__grid">
    <div class="sec-head">
      <p class="kick"><span class="kick__n">07</span>Kasko</p>
      <h2 class="h2" id="process-title" data-reveal>Kaskonuz varsa dosyayı biz açarız.</h2>
      <p class="lead">Eksper ve onay işini biz takip ederiz. Poliçeniz uygunsa cebinizden para çıkmaz. Olmazsa fiyatı işe başlamadan söyleriz.</p>
      <a class="btn btn--main" href="${WA_KASKO}" target="_blank" rel="noopener">${icons.whatsapp}<span>Kasko için fotoğraf gönder</span></a>
    </div>
    <ol class="flow" id="flow">
      <span class="flow__beam" aria-hidden="true"><i></i></span>
      ${d.surec.map((s, i, a) => `<li style="--c:${hue(i, a.length)}"><span class="flow__dot">${i + 1}</span><b>${esc(s.baslik)}</b><p>${esc(s.aciklama)}</p></li>`).join('')}
    </ol>
  </div>`;

$('#biz').innerHTML = `
  <div class="wrap about__grid">
    <div>
      <p class="kick"><span class="kick__n">08</span>Biz</p>
      <h2 class="h2" id="about-title" data-reveal>${tecrube} yıldır Şaşmaz'da cam takıyoruz.</h2>
      <p class="about__text">${esc(d.isletme.hakkinda)}</p>
      <p class="about__warranty"><span>${icons.star}</span>${esc(d.garanti)}</p>
    </div>
    <ul class="stats">
      ${d.istatistikler.map((s, i) => {
        const v = s.kurulustanHesapla ? tecrube : s.deger;
        return `<li style="--c:${SPECTRUM[[0, 2, 4, 6][i % 4]]}"><b data-count="${v}" data-suffix="${esc(s.sonek)}">0</b><span>${esc(s.etiket)}</span></li>`;
      }).join('')}
    </ul>
  </div>`;

$('#atolye').innerHTML = `
  <div class="wrap">
    <div class="sec-head">
      <p class="kick"><span class="kick__n">09</span>Atölye</p>
      <h2 class="h2" id="shop-title" data-reveal>Tezgâhtan kareler.</h2>
    </div>
  </div>
  <ul class="gallery" data-lenis-prevent-touch>
    ${d.galeri.map((g, i) => `<li class="gallery__item" style="--c:${SPECTRUM[(i * 2) % 7]}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="1400" height="1050"><span class="gallery__alt">${esc(g.alt)}</span></li>`).join('')}
  </ul>`;

const stars = (n) => `<span class="stars" aria-label="5 üzerinden ${n}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.round(n) ? 'on' : ''}">${icons.star}</i>`).join('')}</span>`;
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <div class="reviews__head">
      <div>
        <p class="kick"><span class="kick__n">10</span>Yorumlar</p>
        <h2 class="h2" id="reviews-title" data-reveal>Camı takılan anlatsın.</h2>
      </div>
      <p class="score"><b data-count="${d.puan.ortalama}" data-decimals="1">0</b><span>${stars(d.puan.ortalama)}<small>${fmt(d.puan.adet)} Google yorumu</small></span></p>
    </div>
    <ul class="review-list">
      ${d.yorumlar.map((y, i) => `
        <li class="review" style="--c:${SPECTRUM[(i * 3) % 7]}">
          ${stars(y.puan)}
          <p>“${esc(y.metin)}”</p>
          <span class="review__who"><b>${esc(y.ad)}</b>${esc(y.arac)}</span>
        </li>`).join('')}
    </ul>
  </div>`;

$('#markalar').innerHTML = `
  <p class="brands__lbl">Camını taktığımız markalar</p>
  <div class="brands__rail"><div class="brands__track">${[...d.markalar, ...d.markalar].map((m) => `<span>${esc(m)}</span>`).join('<i aria-hidden="true"></i>')}</div></div>`;

const todayName = GUNLER[new Date().getDay()];
$('#ulasim').innerHTML = `
  <div class="wrap visit__grid">
    <div>
      <p class="kick"><span class="kick__n">11</span>Konum</p>
      <h2 class="h2" id="visit-title" data-reveal>Şaşmaz'da, sanayinin içinde.</h2>
      <p class="visit__status ${status.open ? 'is-open' : ''}"><i></i>${esc(status.text)}</p>
      <table class="hours">
        <caption class="sr-only">Çalışma saatleri</caption>
        <tbody>${groupedHours(d.saatler).map(([g, h]) => `<tr class="${g.includes(todayName) ? 'is-today' : ''}"><th scope="row">${esc(g)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody>
      </table>
      <p class="visit__addr">${esc(d.iletisim.adres)}</p>
      <div class="actions">
        <a class="btn btn--main" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi al</span></a>
        <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      </div>
    </div>
    <div class="visit__map" id="map"><a href="${mapsHref(d)}" target="_blank" rel="noopener">Haritada aç</a></div>
  </div>`;

$('#iletisim').innerHTML = sticky(`
  <h2 class="h1 h1--final" id="final-title" data-reveal>Bir fotoğraf atın, gerisini biz söyleyelim.</h2>
  <p class="lead">Tamir mi değişim mi, fiyatı işe başlamadan söyleriz. ${esc(d.garanti)}</p>
  <div class="actions">
    <a class="btn btn--main" href="${WA_FOTO}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan yaz</span></a>
    <a class="btn btn--ghost" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
  </div>`, 'is-final');

$('#foot').innerHTML = `
  <div class="wrap foot__grid">
    <p><b>${ad}</b><br>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar: Pexels. Cam ve ışık sahnesi bu site için kodla çizildi.</p>
  </div>`;

// Katman etiketleri (3B sahnede camın yanına yapışır)
$('#labels').innerHTML = ['outer', 'pvb', 'inner'].map((k, i) => `<span class="lbl" data-lbl="${k}" style="--c:${[SPECTRUM[4], SPECTRUM[6], SPECTRUM[3]][i]}">${['Dış cam', 'Ara film', 'İç cam'][i]}</span>`).join('');

// Harita yaklaşınca yüklensin
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  $('#map').innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe($('#map'));

// --- Film seçici -----------------------------------------------------------------------

let filmTouched = false;
let filmVlt = 100;
const nearestFilm = (vlt) => filmler.reduce((best, f, i) => (Math.abs(f.gecirgenlik - vlt) < Math.abs(filmler[best].gecirgenlik - vlt) ? i : best), 0);
function setFilmUi(vlt, idx) {
  $('#t-vlt').textContent = `%${Math.round(vlt)}`;
  const f = filmler[idx ?? nearestFilm(vlt)];
  const none = vlt > 98;
  $('#t-uv').textContent = none ? '%0' : `%${f.uv}`;
  $$('#t-heat i').forEach((el, i) => el.classList.toggle('on', !none && i < f.isi));
  $('#t-note').textContent = none ? 'Filmsiz cam' : f.not;
  $$('.tint__opt').forEach((b, i) => b.setAttribute('aria-pressed', String(i === idx)));
}
$('#cam-filmi').addEventListener('click', (e) => {
  const b = e.target.closest('[data-film]');
  if (!b) return;
  filmTouched = true;
  const i = Number(b.dataset.film);
  gsap.to({ v: filmVlt }, {
    v: filmler[i].gecirgenlik,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate() {
      filmVlt = this.targets()[0].v;
      setFilmUi(filmVlt, i);
    },
  });
});

// --- Başlıklar: tayf gibi dağılıp toplanır ---------------------------------------------

const splits = new Map();
function reveal(el) {
  if (reducedMotion || !el) return;
  let split = splits.get(el);
  if (!split) {
    split = new SplitText(el, { type: 'words,chars', wordsClass: 'w', charsClass: 'ch' });
    splits.set(el, split);
  }
  gsap.killTweensOf([el, ...split.chars]);
  gsap.fromTo(split.chars, { opacity: 0, x: (i) => ((i % 3) - 1) * 14, '--disp': 7 }, {
    opacity: 1, x: 0, '--disp': 0, duration: 0.8, stagger: 0.018, ease: 'power3.out',
  });
}

if (!reducedMotion) {
  $$('.solid [data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => reveal(el) });
  });
}

// Sayaçlar
$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  const dec = Number(el.dataset.decimals || 0);
  const suf = el.dataset.suffix || '';
  const out = (v) => (el.textContent = (dec ? v.toFixed(dec).replace('.', ',') : fmt(v)) + suf);
  if (reducedMotion) return out(to);
  ScrollTrigger.create({
    trigger: el,
    start: 'top 92%',
    once: true,
    onEnter: () => gsap.to({ v: 0 }, { v: to, duration: 1.6, ease: 'power2.out', onUpdate() { out(this.targets()[0].v); } }),
  });
});

// Hizmet satırları: ekranın ortasındaki satırdan ışık geçer
if (!reducedMotion) {
  $$('.svc__row').forEach((row) => {
    ScrollTrigger.create({
      trigger: row, start: 'top 66%', end: 'bottom 34%',
      onToggle: (self) => row.classList.toggle('is-lit', self.isActive),
    });
  });
  // Süreç: ışın aşağı iner, adımlar sırayla yanar
  gsap.fromTo('.flow__beam i', { scaleY: 0 }, {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '#flow', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
  });
  $$('#flow li').forEach((li) => ScrollTrigger.create({ trigger: li, start: 'top 68%', onEnter: () => li.classList.add('is-on'), onLeaveBack: () => li.classList.remove('is-on') }));
  // Galeri: kareler tayf gibi üç renge ayrılıp birleşir
  $$('.gallery__item').forEach((it) => ScrollTrigger.create({ trigger: it, start: 'top 92%', once: true, onEnter: () => it.classList.add('is-in') }));
} else {
  $$('.svc__row, #flow li, .gallery__item').forEach((r) => r.classList.add('is-lit', 'is-on', 'is-in'));
}

// Son film sahnesinin yazısı, sahne biterken üst çubuğun altına girmeden söner
if (!reducedMotion) {
  $$('.film .scene').forEach((sc) => gsap.fromTo($('.copy', sc), { opacity: 1, y: 0 }, {
    opacity: 0, y: -30, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: sc, start: 'bottom bottom', end: 'bottom 45%', scrub: true },
  }));
}

// Üst çubuk düz bölümlerde koyulaşır
ScrollTrigger.create({
  trigger: '#solid', start: 'top 60px', end: 'bottom 60px',
  onToggle: (self) => $('#top').classList.toggle('is-solid', self.isActive),
});

// --- 3B sahne ve scroll filmi ----------------------------------------------------------

const canvas = $('#gl');
const world = createWorld(canvas, { phone, low });
const { S } = world;
const DEFAULTS = { ...S };
const reset = () => Object.assign(S, DEFAULTS);

const scenes = $$('.scene');
let layout = [];
function measure() {
  layout = scenes.map((el) => ({ el, name: el.dataset.scene, top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight }));
}
addEventListener('resize', () => {
  world.resize();
  measure();
});

const beats = new Map();
function setBeat(sceneEl, idx) {
  if (beats.get(sceneEl) === idx) return;
  beats.set(sceneEl, idx);
  $$('.beat', sceneEl).forEach((b) => {
    const on = Number(b.dataset.beat) === idx;
    b.classList.toggle('is-on', on);
    if (on) reveal($('[data-reveal]', b));
  });
}
function steps(list, p, a, b) {
  const items = $$('li', list);
  const k = seg(p, a, b) * items.length;
  items.forEach((li, i) => {
    li.classList.toggle('is-on', k > i);
    li.classList.toggle('is-now', k > i && k <= i + 1.0001);
  });
}

const labels = $$('.lbl');
let labelsOn = false;
function placeLabels(amt) {
  const on = amt > 0.02;
  if (on !== labelsOn) {
    labelsOn = on;
    labels.forEach((l) => l.classList.toggle('is-on', on));
  }
  if (!on) return;
  labels.forEach((l) => {
    const p = world.project(l.dataset.lbl);
    const x = Math.min(p.x, innerWidth - (l.offsetWidth || 90) - 26);
    l.style.transform = `translate3d(${x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    l.style.opacity = amt;
  });
}

const PREV = { hero: 'hero', katman: 'hero', tas: 'katman', recine: 'tasYakin', film: 'recine', adas: 'film', final: 'adas' };
const enterView = (name, p, span = 0.22) => world.view(name, ease(seg(p, 0, span)), PREV[name]);

let lastImpact = false;
const SCENES = {
  hero(p) {
    world.view('hero');
    S.beam = 1;
    S.spec = 1;
    S.gleam = -2 + p * 4;
    S.gleamAmt = seg(p, 0.15, 0.4) * (1 - seg(p, 0.75, 1));
    S.spin = p * 0.25;
  },
  katman(p) {
    enterView('katman', p, 0.3);
    S.beam = 1 - seg(p, 0, 0.25) * 0.8;
    S.spec = S.beam;
    S.split = ease(seg(p, 0.18, 0.55)) * (1 - ease(seg(p, 0.86, 1)));
    S.spin = 0.25 * (1 - seg(p, 0, 0.3));
    steps($('.layers', layoutEl('katman')), p, 0.3, 0.75);
    placeLabels(seg(p, 0.35, 0.5) * (1 - seg(p, 0.8, 0.88)));
  },
  tas(p, el) {
    if (p < 0.34) enterView('tas', p, 0.25);
    else world.view('tasYakin', ease(seg(p, 0.34, 0.72)), 'tas');
    S.beam = 0.2 * (1 - seg(p, 0, 0.2));
    S.spec = S.beam;
    S.stone = seg(p, 0.08, 0.33);
    S.stoneOut = seg(p, 0.33, 0.5);
    S.ring = p > 0.33 ? 1 - seg(p, 0.33, 0.45) : 0;
    S.crack = 0.03 + seg(p, 0.34, 0.9) * 0.97;
    if (p < 0.33) S.crack = 0;
    S.glow = 0.7;
    setBeat(el, p < 0.36 ? 0 : 1);
    const impact = p >= 0.33;
    if (impact && !lastImpact) {
      gsap.fromTo('#flash', { opacity: 0.4 }, { opacity: 0, duration: 0.45, ease: 'power2.out' });
      try { navigator.vibrate?.(20); } catch {}
    }
    lastImpact = impact;
    const mm = 2 + 16 * seg(p, 0.36, 0.92);
    $('#iz').textContent = `${Math.round(mm)} mm`;
    $('#coin-in').style.transform = `scale(${(mm / 24).toFixed(3)})`;
  },
  recine(p, el) {
    enterView('recine', p, 0.25);
    S.crack = 1;
    S.glow = 0.6;
    S.resin = ease(seg(p, 0.25, 0.66));
    S.uv = seg(p, 0.62, 0.68) * (1 - seg(p, 0.82, 0.88));
    if (p > 0.9) S.resin = 1;
    steps($('#resin-steps', el), p, 0.1, 0.94);
    const min = 30 * seg(p, 0.08, 0.95);
    $('#timer').textContent = `${String(Math.floor(min)).padStart(2, '0')}:${String(Math.floor((min % 1) * 60)).padStart(2, '0')}`;
  },
  film(p) {
    enterView('film', p, 0.22);
    S.crack = p < 0.12 ? 1 : 0;
    S.resin = 1;
    S.beam = ease(seg(p, 0.05, 0.25));
    S.spec = S.beam;
    if (!filmTouched && filmler.length) {
      const target = filmler[DEFAULT_FILM].gecirgenlik;
      const v = 100 - (100 - target) * ease(seg(p, 0.28, 0.55));
      if (Math.abs(v - filmVlt) > 0.2 || (v === 100 && filmVlt !== 100)) {
        filmVlt = v;
        setFilmUi(v, v <= target + 0.5 ? DEFAULT_FILM : undefined);
      }
    }
    const tint = 1 - filmVlt / 100;
    S.tint = tint;
    S.specDim = tint;
    S.uvCut = filmVlt < 99 ? 1 : 0;
  },
  adas(p) {
    enterView('adas', p, 0.25);
    S.beam = 0.35 * (1 - seg(p, 0, 0.2));
    S.spec = S.beam;
    S.adas = ease(seg(p, 0.1, 0.3));
    S.adasErr = 1 - ease(seg(p, 0.35, 0.85));
    const err = 1.8 * S.adasErr;
    $('#adas').textContent = `${err.toFixed(1).replace('.', ',')}°`;
    const done = S.adasErr < 0.02;
    const st = $('#adas-state');
    st.textContent = done ? 'Ayarlandı' : 'Ayarlanıyor';
    st.classList.toggle('is-done', done);
  },
  final(p) {
    enterView('final', p, 0.45);
    S.beam = ease(seg(p, 0.1, 0.45));
    S.spec = S.beam;
    S.gleam = -2 + seg(p, 0.3, 0.9) * 4;
    S.gleamAmt = seg(p, 0.3, 0.4) * (1 - seg(p, 0.8, 0.9));
    S.spin = -0.3 + p * 0.3;
  },
};
const layoutEl = (name) => layout.find((l) => l.name === name)?.el;

let active = null;
function tick() {
  const y = scrollY;
  const vh = innerHeight;
  let cur = layout[0];
  for (const l of layout) if (l.top <= y + vh * (l.name === 'final' ? 0.95 : 0.5)) cur = l;
  const p = clamp((y - cur.top) / Math.max(1, cur.height - vh));
  reset();
  if (cur.name !== 'katman') placeLabels(0);
  SCENES[cur.name](p, cur.el);
  if (active !== cur.el) {
    active = cur.el;
    if (!$('.beat', cur.el)) reveal($('[data-reveal]', cur.el));
  }
}

// Kanvas sadece film bölümü ya da final görünürken çizilir
let canvasOn = true;
const visible = new Set();
new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
}).observe($('#film'));
new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  canvasOn = visible.size > 0;
  canvas.classList.toggle('is-off', !canvasOn);
}).observe($('#iletisim'));

let lenis = null;
function start() {
  measure();
  if (reducedMotion) {
    document.documentElement.classList.add('is-reduced');
    world.view('hero');
    world.snap();
    reset();
    S.beam = S.spec = 1;
    world.render();
    setFilmUi(filmler[DEFAULT_FILM]?.gecirgenlik ?? 100, DEFAULT_FILM);
    $$('.beat').forEach((b) => b.classList.add('is-on'));
    return;
  }
  lenis = initSmoothScroll({ lerp: 0.1 });
  ScrollTrigger.addEventListener('refresh', measure);
  ScrollTrigger.refresh();
  tick();
  world.snap();
  gsap.ticker.add(() => {
    tick();
    if (canvasOn) world.render();
  });
  marquee($('.brands__track'), 40);
}

function marquee(track, speed) {
  if (!track) return;
  let x = 0;
  let w = track.scrollWidth / 2;
  addEventListener('resize', () => (w = track.scrollWidth / 2));
  let on = false;
  new IntersectionObserver(([e]) => (on = e.isIntersecting)).observe(track);
  gsap.ticker.add((_, dt) => {
    if (!on) return;
    const v = lenis ? Math.min(6, Math.abs(lenis.velocity) * 0.25) : 0;
    x -= (speed * (1 + v) * dt) / 1000;
    if (-x >= w) x += w;
    track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  });
}

// --- Açılış: karanlıkta bir ışık, prizmadan geçip tayfa ayrılır -----------------------

function intro() {
  const el = $('#intro');
  if (reducedMotion) {
    el.remove();
    return Promise.resolve();
  }
  document.documentElement.classList.add('is-intro');
  const w = innerWidth;
  const h = innerHeight;
  const svg = $('#intro-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const s = Math.min(w * 0.34, h * 0.24, 200);
  const cx = w * (phone ? 0.42 : 0.44);
  const cy = h * (phone ? 0.4 : 0.44);
  const A = [cx, cy - s * 0.62];
  const B = [cx + s * 0.62, cy + s * 0.5];
  const Cc = [cx - s * 0.62, cy + s * 0.5];
  // giriş noktası sol yüzde, çıkış sağ yüzde
  const pin = [cx - s * 0.3, cy];
  const pout = [cx + s * 0.28, cy - s * 0.02];
  const rays = SPECTRUM.map((c, i) => {
    const ang = -0.09 + i * 0.05;
    const L = Math.hypot(w, h);
    return `<path class="ir" d="M${pout[0]} ${pout[1]} L${pout[0] + Math.cos(ang) * L} ${pout[1] + Math.sin(ang) * L}" stroke="${c}" pathLength="1"/>`;
  }).join('');
  svg.innerHTML = `
    <defs><filter id="gl0" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <path class="iin" d="M-10 ${cy - s * 0.35} L${pin[0]} ${pin[1]}" pathLength="1"/>
    <path class="iin iin--glow" d="M-10 ${cy - s * 0.35} L${pin[0]} ${pin[1]}" pathLength="1" filter="url(#gl0)"/>
    <path class="iinside" d="M${pin[0]} ${pin[1]} L${pout[0]} ${pout[1]}" pathLength="1"/>
    <g class="irays">${rays}</g>
    <g class="irays irays--glow" filter="url(#gl0)">${rays}</g>
    <path class="iprism" d="M${A} L${B} L${Cc} Z" pathLength="1"/>`;
  $('#intro-name').innerHTML = `<span>${ad}</span><small>Oto cam · Şaşmaz</small>`;

  let done = false;
  return new Promise((resolve) => {
    const finish = () => {
      if (done) return;
      done = true;
      tl.kill();
      gsap.to(el, { opacity: 0, duration: 0.5, ease: 'power2.inOut', onComplete: () => {
        el.remove();
        document.documentElement.classList.remove('is-intro');
      } });
      resolve();
    };
    el.addEventListener('pointerdown', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
    const tl = gsap.timeline({ onComplete: finish, defaults: { ease: 'power2.inOut' } });
    tl.fromTo('.iprism', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7 }, 0.1)
      .fromTo('.iin', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.in' }, 0.55)
      .fromTo('.iinside', { strokeDashoffset: 1, opacity: 0.2 }, { strokeDashoffset: 0, opacity: 1, duration: 0.18, ease: 'none' }, 1.05)
      .fromTo('.ir', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.03, ease: 'power2.out' }, 1.2)
      .fromTo('#intro-name span', { opacity: 0, letterSpacing: '0.4em', '--disp': 12 }, { opacity: 1, letterSpacing: '0em', '--disp': 0, duration: 0.9, ease: 'power3.out' }, 1.35)
      .fromTo('#intro-name small', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 1.7)
      .to({}, { duration: 0.3 });
  });
}

world.view('hero');
world.snap();
world.render();
const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 700))]);
fontsReady.then(intro).then(() => reveal($('#hero-title')));
start();

