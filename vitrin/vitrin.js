// Vitrin: ustanın QR ile kendi telefonunda açtığı sayfa.
// Akış: sektör seç → o sektörün tasarımlarını gez → "Bunu istiyorum" → bilgileri WhatsApp'la gönder.
// Durum URL'de tutulur: ?ad=&tel=&sektor=&sec=  (kişisel QR'lar ad ve sektörü önceden doldurur).
import { hazirPresetler, SEKTORLER, GRUP_SIRASI, SATIS_WHATSAPP, presetById, toWhatsapp, zayifCihaz } from '../shared/katalog.js';

// Vitrinde yalnızca oto sanayi tasarımları (özel işler hariç) ve tasarımı olan sektörler.
const PRESETS = hazirPresetler().filter((p) => SEKTORLER.some((k) => k.id === p.sektor));
const SEKTORLER_V = SEKTORLER.filter((k) => PRESETS.some((p) => p.sektor === k.id));

const app = document.getElementById('app');
const BASE = import.meta.env.BASE_URL;
const zayif = zayifCihaz();

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const state = () => {
  const p = new URLSearchParams(location.search);
  return { ad: p.get('ad')?.trim() || '', tel: p.get('tel')?.trim() || '', sektor: p.get('sektor') || '', sec: p.get('sec') || '' };
};

function go(changes) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(changes)) v ? p.set(k, v) : p.delete(k);
  history.pushState(null, '', `?${p}`);
  render();
  scrollTo({ top: 0 });
}

function presetUrl(id, s) {
  const p = new URLSearchParams({ vitrin: '1' });
  if (s.ad) p.set('ad', s.ad);
  if (s.tel) {
    p.set('tel', s.tel);
    p.set('wa', toWhatsapp(s.tel));
  }
  p.set('sektor', presetById(id).sektor);
  return `${BASE}presets/${id}/?${p}`;
}

const shot = (id) => `${BASE}onizleme/${id}.jpg`;

// Sektörün tasarımları aile sırasıyla; zayıf cihazda en hafifi önce.
const siraliTasarimlar = (sektor) => {
  const sira = zayif ? [...GRUP_SIRASI].reverse() : GRUP_SIRASI;
  return PRESETS.filter((p) => p.sektor === sektor).sort((a, b) => sira.indexOf(a.grup) - sira.indexOf(b.grup));
};

const TANIM = {
  sinematik: 'Kaydırdıkça canlanan 3D sahneler. Müşteriniz ilk bakışta etkilenir.',
  kurumsal: 'Menülü, sayfalı, ciddi bir firma sitesi. Filo ve sigorta müşterisi için.',
  kinetik: 'Hareketli yazılar ve fotoğraflar. Hafif, her telefonda akıcı.',
  klasik: 'Sade, hızlı açılan, her telefonda akıcı.',
};
const ETIKET = { sinematik: '3D, hareketli', kurumsal: 'Kurumsal', kinetik: 'Hareketli, hafif', klasik: 'Sade, hızlı' };

// --- Ekranlar --------------------------------------------------------------

function sektorEkrani(s) {
  return `
    <header class="v__head">
      <h1>${s.ad ? `${esc(s.ad)},<br>siteniz hazır.` : 'Dükkanınızın sitesi hazır.'}</h1>
      <p>Ne iş yapıyorsunuz? Size uygun tasarımları gösterelim.</p>
    </header>
    <ul class="sektorler">
      ${SEKTORLER_V.map(
        (k) => `
        <li><button type="button" class="sektor" data-sektor="${k.id}">
          <span class="sektor__ad">${k.ad}</span>
          <span class="sektor__ornek">${k.ornek}</span>
        </button></li>`
      ).join('')}
    </ul>
    <button type="button" class="v__link" data-hepsi>Tüm tasarımları gör</button>`;
}

function kart(p, s, buyuk) {
  return `
    <li class="tasarim ${buyuk ? 'tasarim--buyuk' : ''}" style="--c:${p.renk}">
      <a class="tasarim__gor" href="${esc(presetUrl(p.id, s))}">
        <img src="${shot(p.id)}" alt="${p.ad} tasarımının telefondaki görünümü" loading="${buyuk ? 'eager' : 'lazy'}">
        <span class="tasarim__etiket">${ETIKET[p.grup]}</span>
      </a>
      <div class="tasarim__alt">
        <h3>${p.ad}</h3>
        ${buyuk ? `<p>${TANIM[p.grup]}</p>` : `<p>${p.icin}</p>`}
        <div class="tasarim__butonlar">
          <a class="btn btn--ikincil" href="${esc(presetUrl(p.id, s))}">Tam ekran gör</a>
          <button type="button" class="btn" data-sec="${p.id}">Bunu istiyorum</button>
        </div>
      </div>
    </li>`;
}

function tasarimEkrani(s) {
  const sektor = SEKTORLER_V.find((k) => k.id === s.sektor);
  const ana = sektor ? siraliTasarimlar(sektor.id) : [];
  const diger = PRESETS.filter((p) => !ana.includes(p));
  return `
    <header class="v__head v__head--kucuk">
      <button type="button" class="v__geri" data-sektor="">Sektörü değiştir</button>
      <h1>${sektor ? `${sektor.ad} için ${ana.length} tasarım` : 'Tüm tasarımlar'}</h1>
      <p>Dokunun, tam ekran gezin. Sayfayı aşağı kaydırmayı unutmayın, asıl gösteri orada.${
        s.ad ? ` Tasarımlarda <strong>${esc(s.ad)}</strong> adı yazar.` : ''
      }</p>
      ${zayif && sektor ? '<p class="v__not">Telefonunuzda en akıcı çalışan tasarımı başa koyduk.</p>' : ''}
    </header>
    ${ana.length ? `<ul class="tasarimlar">${ana.map((p) => kart(p, s, true)).join('')}</ul>` : ''}
    <section class="diger">
      <h2>${sektor ? 'Diğer tasarımlar' : ''}</h2>
      <ul class="tasarimlar tasarimlar--serit">${diger.map((p) => kart(p, s, false)).join('')}</ul>
    </section>`;
}

function secimEkrani(s) {
  const p = presetById(s.sec);
  return `
    <header class="v__head v__head--kucuk">
      <button type="button" class="v__geri" data-sec="">Tasarımlara dön</button>
      <h1>Seçiminiz: ${p.ad}</h1>
    </header>
    <div class="secim">
      <img class="secim__gorsel" src="${shot(p.id)}" alt="${p.ad} tasarımı">
      <form class="form" id="form" autocomplete="on">
        <label>Dükkanınızın adı
          <input name="ad" value="${esc(s.ad)}" placeholder="Örn. Yıldız Oto Elektrik" autocomplete="organization" required>
        </label>
        <label>Telefonunuz
          <input name="tel" type="tel" inputmode="tel" value="${esc(s.tel)}" placeholder="0532 123 45 67" autocomplete="tel" required>
        </label>
        <button type="button" class="btn btn--ikincil" data-onizle>Kendi adımla gör</button>
        <button type="submit" class="btn btn--wa">Seçimimi WhatsApp'tan gönder</button>
        <p class="form__not">Fiyat ve detaylar için sizi arayacağız. Seçim yapmak sizi hiçbir şeye bağlamaz.</p>
      </form>
    </div>`;
}

function tesekkurEkrani(s) {
  const p = presetById(s.sec);
  return `
    <header class="v__head">
      <h1>Teşekkürler${s.ad ? `, ${esc(s.ad)}` : ''}.</h1>
      <p>${p.ad} tasarımını seçtiniz. WhatsApp'ta mesajı gönderdiyseniz en kısa sürede sizi arayacağız.</p>
    </header>
    <div class="tesekkur">
      <a class="btn" href="${esc(presetUrl(p.id, s))}">Sitemi bir daha göster</a>
      <button type="button" class="v__link" data-sec="">Başka bir tasarıma bak</button>
    </div>`;
}

let gonderildi = false;

function render() {
  const s = state();
  if (s.sec && !presetById(s.sec)) s.sec = '';
  app.innerHTML = s.sec
    ? gonderildi ? tesekkurEkrani(s) : secimEkrani(s)
    : s.sektor ? tasarimEkrani(s) : sektorEkrani(s);
  document.title = s.ad ? `${s.ad}: siteniz hazır` : 'Dükkanınızın sitesi hazır';
}

// Formdaki ad/telefonu URL'ye yaz (geri dönüldüğünde ve önizlemede kaybolmasın).
function formDegerleri() {
  const f = new FormData(document.getElementById('form'));
  return { ad: f.get('ad').trim(), tel: f.get('tel').trim() };
}
function formuKaydet() {
  const v = formDegerleri();
  const p = new URLSearchParams(location.search);
  for (const [k, val] of Object.entries(v)) val ? p.set(k, val) : p.delete(k);
  history.replaceState(null, '', `?${p}`);
  return { ...state(), ...v };
}

app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-sektor], [data-sec], [data-hepsi], [data-onizle]');
  if (!t) return;
  if (t.hasAttribute('data-hepsi')) return go({ sektor: 'hepsi' });
  if (t.hasAttribute('data-sektor')) return go({ sektor: t.dataset.sektor, sec: '' });
  if (t.hasAttribute('data-sec')) {
    gonderildi = false;
    return go({ sec: t.dataset.sec });
  }
  if (t.hasAttribute('data-onizle')) {
    const s = formuKaydet();
    location.href = presetUrl(s.sec, s);
  }
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const s = formuKaydet();
  const p = presetById(s.sec);
  const sektor = SEKTORLER.find((k) => k.id === p.sektor);
  const mesaj = [
    `Merhaba, sitem için ${p.ad} tasarımını seçtim.`,
    `Dükkan: ${s.ad}`,
    `Sektör: ${sektor.ad}`,
    `Telefon: ${s.tel}`,
  ].join('\n');
  window.open(`https://wa.me/${SATIS_WHATSAPP}?text=${encodeURIComponent(mesaj)}`, '_blank', 'noopener');
  gonderildi = true;
  render();
  scrollTo({ top: 0 });
});

addEventListener('popstate', () => {
  gonderildi = false;
  render();
});

render();
