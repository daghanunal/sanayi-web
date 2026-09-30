import '../../shared/base.css';
import './style.css';
import ortak from '../../data/bakim.json';
import ozel from '../../data/bakim-kinetik.json';
import {
  boot, initSmoothScroll, reducedMotion, gsap, ScrollTrigger, asset, autoHideHeader, esc, icons,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, saatBicim,
} from '../../shared/core.js';

// Kademe: kinetik aile, WebGL yok. Kimlik: kademe kademe dizilen dev tipografi. Künyede adın satırları
// basamak basamak içeri girer; Hizmetler büyük bir tipografik dizindir, her satır ekranın ortasına gelince
// "vitese takılır" (bir basamak sağa kayar, vurgu çizgisi dolar). Periyodik bakım aralıkları merdiven gibi
// kademelenir. Dev yazılar yalnız olgudur: işletmenin adı, grup ve hizmet adları, bakım aralıkları, açık/kapalı.
// Etkileşim: araç seçimi (marka, yıl, yakıt) + dizinden iş listesi → hazır WhatsApp mesajı.
const d = boot({ ...ortak, ...ozel });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
if (reducedMotion) root.classList.add('rm');

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yil = new Date().getFullYear();
const yas = yil - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const trLower = (s) => String(s).toLocaleLowerCase('tr');
const pad = (n) => String(n).padStart(2, '0');
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const img = (g, cls = '', lazy = true) => `<img class="${cls}" src="${asset(g.src)}" alt="${esc(g.alt)}" width="${g.w}" height="${g.h}" ${lazy ? 'loading="lazy" decoding="async"' : ''} />`;

// Kademe satırı: maske içinde yükselen metin (İ noktası kesilmesin diye üstte pay var).
const ln = (t, cls = '') => `<span class="ln ${cls}"><span class="ln__in">${t}</span></span>`;

// Gruplar ve hizmetler (ortak veri)
const groups = d.gruplar.map((g) => ({ ...g, items: [] }));
const services = d.hizmetler.map((h, i) => ({ ...h, i }));
for (const s of services) groups.find((g) => g.id === s.grup)?.items.push(s);

// --- Canlı durum: bugün kaça kadar açık ----------------------------------------------------
function kapanisa(now = new Date()) {
  const s = d.saatler[now.getDay()];
  if (!s || !st.open) return '';
  const [, kapa] = s.split('-');
  const [h, m] = kapa.split(':').map(Number);
  const kalan = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  if (kalan <= 0) return '';
  const sa = Math.floor(kalan / 60), dk = kalan % 60;
  return `Kapanmasına ${sa ? `${sa} sa ` : ''}${dk} dk var`;
}

// --- Üst bar -----------------------------------------------------------------------------
$('#top').innerHTML = `
  <div class="top__in">
    <a class="top__brand" href="#hero">${ad}</a>
    <nav class="top__nav" aria-label="Bölümler">
      <a href="#hizmetler">Hizmetler</a><a href="#periyodik">Periyodik bakım</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a>
    </nav>
    <a class="top__list" href="#liste" hidden><span>İş listesi</span><b id="top-count">0</b></a>
    <p class="top__status ${st.open ? 'is-open' : ''}"><i></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></p>
    <a class="top__call" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span>${tel}</span></a>
  </div>`;

// --- Künye ---------------------------------------------------------------------------------
const adSatirlar = d.isletme.ad.split(/\s+/);
$('#hero').innerHTML = `
  <div class="hero__in wrap">
    <p class="hero__what mono">${esc(d.isletme.tanim)}</p>
    <h1 class="hero__title" id="hero-title" aria-label="${ad}">
      ${adSatirlar.map((w, i) => `<span class="hero__line" style="--k:${i}" aria-hidden="true">${ln(esc(w))}</span>`).join('')}
    </h1>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="lamp ${st.open ? 'is-open' : ''}"><i></i><span>${esc(st.kunye)}</span></dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__cta">
      <a class="btn btn--accent" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
    <nav class="hero__groups" aria-label="Hizmet grupları">
      ${groups.map((g, i) => `<a href="#grup-${g.id}" style="--k:${i}"><span class="mono">${pad(i + 1)}</span><b>${esc(g.ad)}</b><small>${g.items.length} hizmet</small></a>`).join('')}
    </nav>
  </div>`;

// --- Hizmetler: araç seçimi + tipografik dizin + iş listesi ---------------------------------------
const yillar = Array.from({ length: yil - 1994 }, (_, i) => yil - i);
$('#hizmetler').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <p class="mono sec__no">01</p>
      <h2 class="h2" id="svc-title">${ln('Hizmetler')}</h2>
      <p class="svc__for" id="svc-for" aria-live="polite"></p>
      <p class="sec__sub">Dört grupta ${services.length} hizmet. Süreler yaklaşıktır, araca göre değişir. Fiyat ve randevu için arayın.</p>
    </header>

    <form class="car" id="car" aria-labelledby="car-title" autocomplete="off">
      <p class="car__title" id="car-title"><span class="mono">Araç</span> Araç seçilince iş listesi ve mesaj bu araca göre yazılır.</p>
      <div class="car__row">
        <label class="field">
          <span class="field__label">Marka</span>
          <select id="car-marka" class="field__in">
            <option value="">Seçin</option>
            ${d.markalar.map((m) => `<option>${esc(m)}</option>`).join('')}
            <option value="Diğer">Diğer marka</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Model <small>isteğe bağlı</small></span>
          <input id="car-model" class="field__in" type="text" maxlength="24" placeholder="Örn. Egea" enterkeyhint="done" />
        </label>
        <label class="field">
          <span class="field__label">Yıl</span>
          <select id="car-yil" class="field__in">
            <option value="">Seçin</option>
            ${yillar.map((y) => `<option>${y}</option>`).join('')}
          </select>
        </label>
      </div>
      <fieldset class="fuel">
        <legend class="field__label">Yakıt</legend>
        <div class="fuel__row">
          ${d.yakitlar.map((f) => `<button type="button" class="chip" data-fuel="${esc(f.id)}" aria-pressed="false">${esc(f.ad)}</button>`).join('')}
        </div>
      </fieldset>
    </form>

    <div class="ix" id="ix">
      ${groups.map((g, gi) => `
        <section class="ix__grp" id="grup-${g.id}" aria-labelledby="g-${g.id}">
          <h3 class="ix__gname" id="g-${g.id}"><span class="mono">${pad(gi + 1)} / ${pad(groups.length)}</span>${ln(esc(g.ad))}</h3>
          <ol class="ix__list">
            ${g.items.map((s) => `
              <li class="ix__item" data-i="${s.i}">
                <button type="button" class="ix__row" aria-expanded="false" aria-controls="ix-d-${s.i}" id="ix-b-${s.i}">
                  <span class="ix__no mono">${pad(s.i + 1)}</span>
                  <span class="ix__name">${esc(s.baslik)}</span>
                  <span class="ix__meta" aria-hidden="true">${esc(s.kisa)}${s.sure ? `<small class="mono">${esc(s.sure)}</small>` : ''}</span>
                  <span class="ix__tag mono" aria-hidden="true">Listede</span>
                  <span class="ix__rule" aria-hidden="true"></span>
                </button>
                <div class="ix__detail" id="ix-d-${s.i}" role="region" aria-labelledby="ix-b-${s.i}" hidden>
                  <div class="ix__body">
                    <p class="ix__short">${esc(s.kisa)}</p>
                    <p>${esc(s.aciklama)}</p>
                    <p class="ix__time mono">${s.sure ? `Süre ${esc(s.sure)}` : 'Süre araca göre değişir'}</p>
                  </div>
                  <div class="ix__acts">
                    <button type="button" class="btn btn--ink ix__add" data-add="${s.i}" aria-pressed="false"><span>Listeye ekle</span></button>
                  </div>
                </div>
              </li>`).join('')}
          </ol>
        </section>`).join('')}
    </div>

    <aside class="list" id="liste" aria-labelledby="list-title">
      <div class="list__head">
        <h3 class="list__title" id="list-title">İş listesi</h3>
        <p class="list__car mono" id="list-car"></p>
      </div>
      <div class="list__body" id="list-body" aria-live="polite"></div>
      <div class="list__cta">
        <a class="btn btn--accent btn--xl" id="list-wa" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Listeyi WhatsApp'tan gönder</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
      <p class="list__note">Mesaj WhatsApp'ta hazır açılır, gönderilmeden önce değiştirilebilir. Randevu günü ve saati yanıtta belirlenir.</p>
    </aside>
  </div>`;

// --- Periyodik bakım: kademeli aralıklar ------------------------------------------------------
const P = d.periyodik;
$('#periyodik').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <p class="mono sec__no">02</p>
      <h2 class="h2" id="plan-title">${ln('Periyodik bakım')}</h2>
      <p class="plan__for" id="plan-for" aria-live="polite"></p>
      <p class="sec__sub">${esc(P.not)}</p>
    </header>
    <ol class="steps" id="steps">
      ${P.adimlar.map((a, i) => `
        <li class="step" style="--k:${i}">
          <p class="step__no mono">${pad(i + 1)}</p>
          <h3 class="step__when">${esc(a.aralik).replace(/(\d) (bin km)/g, '$1\u00a0bin\u00a0km').replace(/–(\d)/g, '\u2060–\u2060$1')}</h3>
          <ul class="step__jobs">${a.isler.map((x) => `<li data-job="${esc(x)}">${esc(x)}</li>`).join('')}</ul>
        </li>`).join('')}
    </ol>
    <div class="plan__cta">
      <button type="button" class="btn btn--accent" id="plan-add" aria-pressed="false"><span>Periyodik bakımı listeye ekle</span></button>
      <a class="btn btn--line btn--on-dark" href="#liste">İş listesine git ${arrow}</a>
    </div>
  </div>`;

$('#band').innerHTML = `<figure class="band__fig">${img(d.gorseller.salon, 'band__img')}</figure>`;

// --- Çalışma sırası ---------------------------------------------------------------------------
$('#surec').innerHTML = `
  <div class="wrap flow__grid">
    <header class="sec__head">
      <p class="mono sec__no">03</p>
      <h2 class="h2" id="flow-title">${ln('Çalışma sırası')}</h2>
    </header>
    <figure class="flow__fig">${img(d.gorseller.fren, 'flow__img')}</figure>
    <ol class="flow__list">
      ${d.surec.map((s, i) => `
        <li class="flow__step" style="--k:${i}">
          <span class="mono">${pad(i + 1)}</span>
          <h3 class="flow__word">${ln(esc(s.baslik))}</h3>
          <p>${esc(s.aciklama)}</p>
        </li>`).join('')}
    </ol>
  </div>`;

// --- Hakkında ---------------------------------------------------------------------------------
$('#hakkinda').innerHTML = `
  <div class="wrap about__grid">
    <header class="sec__head">
      <p class="mono sec__no">04</p>
      <h2 class="h2" id="about-title">${ln('Hakkında')}</h2>
    </header>
    <div class="about__text">
      <p class="about__lead">${ad} ${yilEki(d.isletme.kurulus)} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
      <ul class="nums">
        <li><b class="nums__v" data-count="${yas}">${yas}</b><span>yıl<br>Şaşmaz Oto Sanayi Sitesi'nde</span></li>
        <li><b class="nums__v" data-count="${acikGun}">${acikGun}</b><span>gün<br>haftada açık</span></li>
      </ul>
      <dl class="facts">
        ${(d.bilgiler || []).map(([k, v]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
    </div>
    <figure class="about__fig">${img(d.gorseller.motor, 'about__img')}</figure>
    ${d.markalar?.length ? `
      <div class="brands">
        <h3 class="mono brands__title">Bakım yapılan markalar</h3>
        <ul class="brands__list">${d.markalar.map((m, i) => `<li style="--k:${i}">${esc(m)}</li>`).join('')}</ul>
      </div>` : ''}
  </div>`;

// --- Çalışma saatleri ve konum ----------------------------------------------------------------
const bugunIdx = new Date().getDay();
const gunSirasi = [1, 2, 3, 4, 5, 6, 0];
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
$('#saatler').innerHTML = `
  <div class="wrap hours__grid">
    <div>
      <header class="sec__head">
        <p class="mono sec__no">05</p>
        <h2 class="h2 h2--sm" id="hours-title">Çalışma saatleri ve konum</h2>
      </header>
      <p class="sign ${st.open ? 'is-open' : ''}" aria-label="${st.open ? 'Şu an açık' : 'Şu an kapalı'}">
        <span aria-hidden="true">${[...(st.open ? 'Açık' : 'Kapalı')].map((c, i) => `<span class="sign__ch" style="--k:${i}">${c}</span>`).join('')}</span>
      </p>
      <p class="hours__now">${esc(st.metin)}<span id="kalan">${kapanisa() ? ` · ${esc(kapanisa())}` : ''}</span></p>
      <table class="week">
        <caption class="sr-only">Haftalık çalışma saatleri</caption>
        <tbody>
          ${gunSirasi.map((g) => `<tr class="${g === bugunIdx ? 'is-today' : ''}"><th scope="row">${GUN[g]}${g === bugunIdx ? ' <small class="mono">bugün</small>' : ''}</th><td>${d.saatler[g] ? esc(saatBicim(d.saatler[g])) : 'Kapalı'}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="hours__addr">${esc(d.iletisim.adres)}</p>
      <div class="hours__cta">
        <a class="btn btn--ink" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--line" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
    <div class="map" data-map><p class="mono">Harita</p></div>
  </div>`;

// --- Örnek yorumlar ---------------------------------------------------------------------------
$('#yorumlar').innerHTML = `
  <div class="wrap">
    <header class="sec__head">
      <p class="mono sec__no">06</p>
      <h2 class="h2" id="quotes-title">${ln('Örnek yorumlar')}</h2>
      <p class="sec__sub">Buradaki yorumlar örnektir; yerlerine işletmenin gerçek yorumları konur.</p>
    </header>
  </div>
  <div class="quotes__track" data-lenis-prevent-touch>
    <ul class="quotes__list">
      ${d.yorumlar.map((y) => `
        <li class="quote">
          <p class="quote__car">${esc(y.arac)}</p>
          <blockquote>${esc(y.metin)}</blockquote>
          <p class="quote__who mono">${esc(y.ad)}</p>
        </li>`).join('')}
    </ul>
  </div>`;

// --- İletişim ----------------------------------------------------------------------------------
$('#iletisim').innerHTML = `
  <div class="wrap final__in">
    <p class="mono sec__no">07</p>
    <h2 class="h2" id="final-title">${ln('İletişim')}</h2>
    <a class="final__tel" href="${telHref(d)}">${tel}</a>
    <p class="final__sub">Fiyat ve randevu için arayın ya da WhatsApp'tan yazın.</p>
    <div class="final__cta">
      <a class="btn btn--accent btn--xl" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--line btn--xl btn--on-dark" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--line btn--xl btn--on-dark" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
    <p class="final__addr">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
  </div>`;

$('#foot').innerHTML = `
  <div class="wrap foot__in">
    <div><p class="foot__brand">${ad}</p><p>${esc(d.isletme.tanim)}</p></div>
    <p>${esc(d.iletisim.adres)}<br><a href="${telHref(d)}">${tel}</a></p>
    <p class="foot__small">© ${yil} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. Yorumlar örnektir.</p>
  </div>`;

// --- Harita: yaklaşınca yükle ---------------------------------------------------------------
const mapBox = $('[data-map]');
new IntersectionObserver((entries, io) => {
  if (!entries[0].isIntersecting) return;
  mapBox.innerHTML = `<iframe title="${ad} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  io.disconnect();
}, { rootMargin: '600px 0px' }).observe(mapBox);

// ===========================================================================================
// Etkileşim: araç + iş listesi
// ===========================================================================================
const KEY = 'kademe-arac';
const car = { marka: '', model: '', yil: '', yakit: '' };
try { Object.assign(car, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const picked = new Set();

const fuelOf = (id) => d.yakitlar.find((f) => f.id === id);
function carText() {
  const marka = car.marka === 'Diğer' ? '' : car.marka;
  const ana = [car.yil, marka, car.model.trim()].filter(Boolean).join(' ');
  const f = fuelOf(car.yakit);
  if (!ana) return f ? `${f.mesaj} aracım` : '';
  return f ? `${ana} (${f.mesaj})` : ana;
}

function applyFuel() {
  // "(dizel)" işler yalnız dizelde, "(benzinli)" işler dizel dışında gösterilir; yakıt seçilmediyse hepsi.
  const f = car.yakit;
  $$('.step__jobs li').forEach((li) => {
    const t = li.dataset.job;
    const hide = (f && /\(dizel\)/.test(t) && f !== 'dizel') || (f === 'dizel' && /\(benzinli\)/.test(t));
    li.hidden = !!hide;
  });
}

function renderCar() {
  const t = carText();
  const forSvc = $('#svc-for');
  const forPlan = $('#plan-for');
  const html = t ? `${esc(t.replace(/ aracım$/, ' araç'))} için` : '';
  if (forSvc.dataset.t !== html) {
    forSvc.dataset.t = html;
    forSvc.innerHTML = html ? ln(html) : '';
    forPlan.innerHTML = html ? ln(html) : '';
    if (html && !reducedMotion) {
      gsap.fromTo([forSvc, forPlan].map((e) => e.querySelector('.ln__in')), { yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' });
    }
  }
  $$('.chip[data-fuel]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fuel === car.yakit)));
  applyFuel();
  renderList();
  try { localStorage.setItem(KEY, JSON.stringify(car)); } catch {}
}

function renderList() {
  const list = services.filter((s) => picked.has(s.i));
  const t = carText();
  $('#list-car').textContent = t ? t.replace(/ aracım$/, ' araç') : 'Araç seçilmedi';
  const body = $('#list-body');
  if (!list.length) {
    body.innerHTML = `<p class="list__empty">Dizinden eklenen hizmetler burada toplanır ve tek mesajla gönderilir.</p>`;
  } else {
    body.innerHTML = `<ol class="list__items">${list.map((s) => `
      <li><span class="mono">${pad(s.i + 1)}</span><span class="list__name">${esc(s.baslik)}</span>
        <button type="button" class="list__x" data-x="${s.i}" aria-label="${esc(s.baslik)} listeden çıkar">×</button></li>`).join('')}</ol>`;
  }
  const kim = `Merhaba ${d.isletme.ad}, `;
  let msg;
  if (list.length) {
    msg = `${kim}${t ? `${t} için ` : ''}şu işler hakkında bilgi ve randevu almak istiyorum:\n${list.map((s) => `• ${s.baslik}`).join('\n')}`;
  } else {
    msg = `${kim}${t ? `${t} için ` : 'aracım için '}bilgi ve randevu almak istiyorum.`;
  }
  $('#list-wa').href = waHref(d, msg);
  const n = list.length;
  const badge = $('.top__list');
  badge.hidden = !n;
  $('#top-count').textContent = String(n);
  // Dizindeki durum
  $$('.ix__item').forEach((li) => {
    const on = picked.has(Number(li.dataset.i));
    li.classList.toggle('is-picked', on);
    const b = li.querySelector('.ix__add');
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('span').textContent = on ? 'Listeden çıkar' : 'Listeye ekle';
  });
  const pa = $('#plan-add');
  const onP = picked.has(0);
  pa.setAttribute('aria-pressed', String(onP));
  pa.querySelector('span').textContent = onP ? 'Periyodik bakım listede' : 'Periyodik bakımı listeye ekle';
}

function toggle(i, on = !picked.has(i)) {
  on ? picked.add(i) : picked.delete(i);
  renderList();
}

// Araç formu
const selM = $('#car-marka'), inMo = $('#car-model'), selY = $('#car-yil');
selM.value = car.marka; inMo.value = car.model; selY.value = car.yil;
selM.addEventListener('change', () => { car.marka = selM.value; renderCar(); });
selY.addEventListener('change', () => { car.yil = selY.value; renderCar(); });
inMo.addEventListener('input', () => { car.model = inMo.value.replace(/[<>]/g, '').slice(0, 24); renderCar(); });
inMo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inMo.blur(); } });
$('#car').addEventListener('submit', (e) => e.preventDefault());
$$('.chip[data-fuel]').forEach((b) => b.addEventListener('click', () => {
  car.yakit = car.yakit === b.dataset.fuel ? '' : b.dataset.fuel;
  renderCar();
}));

// Dizin: satıra dokununca ayrıntı açılır (bir anda bir satır)
let openRow = null;
function openDetail(btn, open) {
  const det = document.getElementById(btn.getAttribute('aria-controls'));
  btn.setAttribute('aria-expanded', String(open));
  btn.closest('.ix__item').classList.toggle('is-open', open);
  det.hidden = !open;
  if (open && !reducedMotion) {
    gsap.fromTo(det.children, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
  }
}
$$('.ix__row').forEach((btn) => btn.addEventListener('click', () => {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  if (openRow && openRow !== btn) openDetail(openRow, false);
  openDetail(btn, open);
  openRow = open ? btn : null;
  ScrollTrigger.refresh();
}));
$$('.ix__add').forEach((b) => b.addEventListener('click', () => toggle(Number(b.dataset.add))));
$('#list-body').addEventListener('click', (e) => {
  const x = e.target.closest('[data-x]');
  if (x) toggle(Number(x.dataset.x), false);
});
$('#plan-add').addEventListener('click', () => toggle(0));
renderCar();

// Kapanışa kalan süre dakikada bir güncellenir
setInterval(() => { const k = kapanisa(); $('#kalan').textContent = k ? ` · ${k}` : ''; }, 60000);

// ===========================================================================================
// Hareket
// ===========================================================================================
const topEl = $('#top');
let unhide = null;
const phoneMq = matchMedia('(max-width: 899px)');
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(topEl, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; root.style.setProperty('--header-h', `${topEl.offsetHeight}px`); }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

// Sayılar: ekrana gelince sayar (bir kez; once:true yerine bayrak).
function countUp(el) {
  const to = Number(el.dataset.count);
  if (reducedMotion) { el.textContent = String(to); return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: 1.1, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(o.v))) });
}

if (reducedMotion) {
  $$('.nums__v').forEach(countUp);
} else {
  initSmoothScroll();
  const mm = gsap.matchMedia();

  // Açılış: adın satırları basamak basamak (≈1,3 sn), künye ve düğmeler ardından. Kaydırmayı kilitlemez.
  const tl = gsap.timeline({ delay: 0.1 });
  tl.from('.hero__line .ln__in', { yPercent: 108, duration: 1.05, ease: 'expo.out', stagger: 0.08 })
    .from('.hero__line > .ln', { x: (i) => -(i + 1) * 28, duration: 1.05, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' }, 0)
    .from('.hero__what, .kunye > div, .hero__cta .btn', { y: 14, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'all' }, 0.35)
    .from('.hero__groups a', { y: 18, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'all' }, 0.55);
  // Dokununca açılış hemen biter
  const skip = () => tl.progress(1);
  addEventListener('pointerdown', skip, { once: true, passive: true });
  addEventListener('keydown', skip, { once: true });

  // Künyeden çıkarken satırlar zıt yönlere hafifçe kayar (kaydırmaya bağlı, kullanıcı durunca durur).
  $$('.hero__line').forEach((l, i) => {
    gsap.to(l, {
      xPercent: i % 2 ? 7 : 3, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  });

  // Bölüm başlıkları: maske içinden satır olarak yükselir.
  $$('.sec__head .h2 .ln__in, .ix__gname .ln__in, .final__in .h2 .ln__in').forEach((el) => {
    gsap.from(el, {
      yPercent: 108, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: el.closest('.ln'), start: 'top 97%', toggleActions: 'play none none reverse' },
    });
  });

  // Dizin: satır ekranın ortasına gelince "vitese takılır": bir basamak sağa kayar, vurgu çizgisi dolar.
  mm.add({ phone: '(max-width: 899px)', wide: '(min-width: 900px)' }, (ctx) => {
    const step = ctx.conditions.phone ? 14 : 36;
    $$('.ix__item').forEach((li) => {
      const name = $('.ix__name', li), rule = $('.ix__rule', li);
      const t = gsap.timeline({
        scrollTrigger: {
          trigger: li, start: 'top 78%', end: 'top 48%', scrub: 0.6,
          onEnter: () => li.classList.add('is-live'), onLeaveBack: () => li.classList.remove('is-live'),
        },
      });
      t.fromTo(name, { x: 0 }, { x: step, ease: 'power2.inOut' }, 0)
        .fromTo(rule, { scaleX: 0 }, { scaleX: 1, ease: 'power2.inOut' }, 0);
    });
  });

  // Grup adları kaydırmayla biraz sola kayar (kademe hissi).
  $$('.ix__gname').forEach((g) => {
    gsap.fromTo(g, { x: 24 }, { x: 0, ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'top 55%', scrub: 0.8 } });
  });

  // Araç formu ve iş listesi: bileşen girişi
  gsap.from('.car', { y: 28, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: '.car', start: 'top 88%', toggleActions: 'play none none none' } });
  gsap.from('.list', { y: 28, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: '.list', start: 'top 88%', toggleActions: 'play none none none' } });

  // Periyodik merdiven: basamaklar sırayla yerine iner (kaydırmaya bağlı).
  $$('.step').forEach((s, i) => {
    gsap.fromTo(s, { x: -40, autoAlpha: 0.15 }, {
      x: 0, autoAlpha: 1, ease: 'power2.out',
      scrollTrigger: { trigger: s, start: 'top 92%', end: 'top 62%', scrub: 0.5 },
    });
  });

  // Görsel bandı: maske açılır, görsel yavaşça yerine oturur.
  gsap.fromTo('.band__img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '#band', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
  gsap.fromTo('.band__fig', { clipPath: 'inset(0 12% 0 12%)' }, { clipPath: 'inset(0 0% 0 0%)', ease: 'power2.inOut', scrollTrigger: { trigger: '#band', start: 'top 90%', end: 'top 30%', scrub: 0.6 } });

  // Çalışma sırası: kelimeler sırayla yükselir
  $$('.flow__word .ln__in').forEach((w) => {
    gsap.from(w, { yPercent: 108, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: w.closest('.flow__step'), start: 'top 96%', toggleActions: 'play none none reverse' } });
  });
  gsap.from('.flow__img', { scale: 1.12, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.flow__fig', start: 'top 85%', toggleActions: 'play none none none' } });

  // Hakkında: sayılar, görsel, markalar
  let counted = false;
  ScrollTrigger.create({ trigger: '.nums', start: 'top 85%', onEnter: () => { if (!counted) { counted = true; $$('.nums__v').forEach(countUp); } } });
  gsap.from('.about__img', { scale: 1.14, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.about__fig', start: 'top 85%', toggleActions: 'play none none none' } });
  gsap.from('.brands__list li', { y: 20, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04, scrollTrigger: { trigger: '.brands', start: 'top 85%', toggleActions: 'play none none none' } });

  // Açık/Kapalı tabelası harf harf
  gsap.from('.sign__ch', { yPercent: 100, autoAlpha: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.sign', start: 'top 85%', toggleActions: 'play none none reverse' } });

  // Yorumlar
  gsap.from('.quote', { y: 30, autoAlpha: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, clearProps: 'all', scrollTrigger: { trigger: '.quotes__list', start: 'top 85%', toggleActions: 'play none none none' } });

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
