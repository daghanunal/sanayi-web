// Saha kiti: satışçının kendi telefonundaki araç. Dükkanı yaz, sektörünü seç;
// ustaya kişisel vitrin QR'ı ya da tek tasarım QR'ı okut, ya da sunum modunda tasarımları sırayla göster.
// Her şey katalogdan gelir (hazirPresetler); yeni tasarımlar kendiliğinden listelenir.
import QRCode from 'qrcode';
import { hazirPresetler, toWhatsapp, SEKTORLER, OZEL_SEKTORLER, GRUP_SIRASI } from '../shared/katalog.js';
import { aileAdi, samanlik, eslesir, norm } from '../vitrin/ortak.js';

const BASE = import.meta.env.BASE_URL;
const PRESETS = hazirPresetler();
const TUM_SEKTORLER = [...SEKTORLER, ...OZEL_SEKTORLER];
const sektorBul = (id) => TUM_SEKTORLER.find((k) => k.id === id);
const SIRA = [...GRUP_SIRASI, 'ozel'];
const sira = (g) => (SIRA.includes(g) ? SIRA.indexOf(g) : SIRA.length);
const sayisi = (id) => PRESETS.filter((p) => p.sektor === id).length;

// Aramada her tasarım: kendi adı, "için" metni, ailesi, sektörü ve sektörün eş anlamlıları.
const ARANAN = new Map(
  PRESETS.map((p) => {
    const k = sektorBul(p.sektor);
    return [p.id, [...(k ? samanlik(k) : []), ...norm(`${p.ad} ${p.id} ${p.icin} ${aileAdi(p.grup)} ${p.grup}`).split(' ')]];
  })
);

const STORE = 'saha-kiti';
const form = document.getElementById('form');
const list = document.getElementById('list');
const ara = document.getElementById('ara');
const aileEl = document.getElementById('aileler');
const sayiEl = document.getElementById('sayi');
const dialog = document.getElementById('qr');
const sunum = document.getElementById('sunum');
const sektorSec = document.getElementById('sektor');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Sektör seçici: tasarımı olanlar önce, sayılarıyla; özel işler ayrı grupta.
const secenek = (k) => `<option value="${k.id}">${esc(k.ad)} (${sayisi(k.id)})</option>`;
sektorSec.innerHTML = `
  <option value="">Tüm sektörler (${PRESETS.length})</option>
  <optgroup label="Oto sanayi">${SEKTORLER.filter((k) => sayisi(k.id)).map(secenek).join('')}</optgroup>
  <optgroup label="Özel işler">${OZEL_SEKTORLER.filter((k) => sayisi(k.id)).map(secenek).join('')}</optgroup>
  ${SEKTORLER.some((k) => !sayisi(k.id)) ? `<optgroup label="Tasarımı henüz yok">${SEKTORLER.filter((k) => !sayisi(k.id)).map(secenek).join('')}</optgroup>` : ''}`;

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
};
const save = (v) => {
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {}
};
let aile = load().aile || '';

function values() {
  const f = new FormData(form);
  const g = (k) => (f.get(k) || '').trim();
  return { ad: g('ad'), tel: g('tel'), kurulus: g('kurulus'), sektor: g('sektor') };
}

// Demo linki (satışçının telefonu için). vitrin=true: ustanın okutacağı, "Bunu istiyorum" çubuklu sürüm.
function presetUrl(id, v, vitrin = false) {
  const p = new URLSearchParams();
  if (vitrin) p.set('vitrin', '1');
  if (v.ad) p.set('ad', v.ad);
  if (v.tel) {
    p.set('tel', v.tel);
    p.set('wa', toWhatsapp(v.tel));
  }
  if (/^\d{4}$/.test(v.kurulus)) p.set('kurulus', v.kurulus);
  if (vitrin) p.set('sektor', PRESETS.find((x) => x.id === id).sektor);
  const q = p.toString();
  return new URL(`${BASE}presets/${id}/${q ? '?' + q : ''}`, location.href).href;
}

// Ustanın kendi telefonuyla okutacağı vitrin linki (ad, telefon ve sektör dolu gelir).
function vitrinUrl(v) {
  const p = new URLSearchParams();
  if (v.ad) p.set('ad', v.ad);
  if (v.tel) p.set('tel', v.tel);
  if (v.sektor) p.set('sektor', v.sektor);
  const q = p.toString();
  return new URL(`${BASE}vitrin/${q ? '?' + q : ''}`, location.href).href;
}

// Şu anki süzgeçten geçen tasarımlar (sunum modu da bunları oynatır).
function suzulmus() {
  const v = values();
  const q = ara.value;
  return PRESETS.filter(
    (p) => (!v.sektor || p.sektor === v.sektor) && (!aile || p.grup === aile) && (!q.trim() || eslesir(ARANAN.get(p.id), q))
  ).sort((a, b) => {
    const sa = TUM_SEKTORLER.findIndex((k) => k.id === a.sektor);
    const sb = TUM_SEKTORLER.findIndex((k) => k.id === b.sektor);
    return sa - sb || sira(a.grup) - sira(b.grup);
  });
}

function aileleriCiz() {
  const v = values();
  const havuz = PRESETS.filter((p) => !v.sektor || p.sektor === v.sektor);
  const var_ = [...new Set(havuz.map((p) => p.grup))].sort((a, b) => sira(a) - sira(b));
  if (aile && !var_.includes(aile)) aile = '';
  const cip = (id, ad, n) => `<button type="button" class="cip" data-aile="${id}" aria-pressed="${aile === id}">${ad} <span>${n}</span></button>`;
  aileEl.innerHTML = cip('', 'Tümü', havuz.length) + var_.map((g) => cip(g, aileAdi(g), havuz.filter((p) => p.grup === g).length)).join('');
}

function render() {
  const v = values();
  save({ ...v, aile });
  aileleriCiz();
  const liste = suzulmus();
  const kart = (p) => `
    <li class="card" style="--c:${esc(p.renk)}">
      <a class="card__open" href="${esc(presetUrl(p.id, v))}">
        <img class="card__shot" src="${BASE}onizleme/${p.id}.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">
        <span class="card__aile">${esc(aileAdi(p.grup))}</span>
        <span class="card__name">${esc(p.ad)}</span>
        <span class="card__for">${esc(p.icin)}</span>
      </a>
      <div class="card__btns">
        <button type="button" data-qr="${p.id}" aria-label="${esc(p.ad)} için QR">QR</button>
        <button type="button" data-sunum-baslat="${p.id}" aria-label="${esc(p.ad)} ile sunumu başlat">Sunum</button>
      </div>
    </li>`;
  // Sektör seçili değilse sektör sektör başlıklı; seçiliyse tek liste.
  const gruplar = v.sektor
    ? [[sektorBul(v.sektor), liste]]
    : TUM_SEKTORLER.map((k) => [k, liste.filter((p) => p.sektor === k.id)]).filter(([, l]) => l.length);
  sayiEl.textContent = liste.length ? `${liste.length} tasarım` : '';
  list.innerHTML = liste.length
    ? gruplar.map(([k, l]) => `
      <section class="kit__group">
        <h2>${esc(k?.ad || '')}${OZEL_SEKTORLER.includes(k) ? ' <small>Özel iş</small>' : ''}</h2>
        <ul class="kit__list">${l.map(kart).join('')}</ul>
      </section>`).join('')
    : `<p class="kit__bos">${v.sektor && !sayisi(v.sektor) ? 'Bu sektörün tasarımı henüz yok. Vitrin QR\'ı yine de çalışır; usta benzerlerini görür.' : 'Aramaya uyan tasarım yok.'}</p>`;
  form.querySelector('[data-sunum]').disabled = !liste.length;
}

const saved = load();
for (const [k, val] of Object.entries(saved)) if (form.elements[k]) form.elements[k].value = val;
if (sektorSec.value !== (saved.sektor || '')) sektorSec.value = '';
form.addEventListener('input', render);
form.addEventListener('reset', () => setTimeout(render));
form.addEventListener('submit', (e) => e.preventDefault());
ara.addEventListener('input', render);
aileEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-aile]');
  if (!b) return;
  aile = b.dataset.aile;
  render();
});

async function showQr(title, url) {
  dialog.querySelector('.qr__title').textContent = title;
  dialog.querySelector('.qr__url').textContent = url.replace(/^https?:\/\//, '');
  await QRCode.toCanvas(dialog.querySelector('canvas'), url, { width: 300, margin: 1 });
  if (!dialog.open) dialog.showModal();
}
const tasarimQr = (p) => {
  const v = values();
  showQr(`${v.ad || 'Demo'}: ${p.ad} (${sektorBul(p.sektor)?.ad || ''})`, presetUrl(p.id, v, true));
};

form.addEventListener('click', (e) => {
  const v = values();
  if (e.target.closest('[data-vitrin]')) {
    const k = sektorBul(v.sektor);
    showQr(`${v.ad || 'Dükkan'}: ${k ? k.ad + ' tasarımları' : 'tasarımını seç'}`, vitrinUrl(v));
  }
  if (e.target.closest('[data-sunum]')) sunumAc(suzulmus(), 0);
});

list.addEventListener('click', (e) => {
  const qr = e.target.closest('[data-qr]');
  if (qr) return tasarimQr(PRESETS.find((x) => x.id === qr.dataset.qr));
  const sb = e.target.closest('[data-sunum-baslat]');
  if (sb) {
    const l = suzulmus();
    sunumAc(l, Math.max(0, l.findIndex((p) => p.id === sb.dataset.sunumBaslat)));
  }
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog || e.target.matches('[data-close]')) dialog.close();
});

// --- Sunum modu: seçili tasarımlar tam ekran, sırayla. "Sonraki"ye dokun, geç. ----------------
let sunumListe = [];
let sunumI = 0;
const iframe = sunum.querySelector('iframe');

function sunumGoster() {
  const p = sunumListe[sunumI];
  iframe.src = presetUrl(p.id, values());
  sunum.querySelector('.sunum__ad b').textContent = p.ad;
  sunum.querySelector('.sunum__ad span').textContent = `${sunumI + 1} / ${sunumListe.length} · ${aileAdi(p.grup)}`;
}
function sunumAc(l, i) {
  if (!l.length) return;
  sunumListe = l;
  sunumI = i;
  sunum.hidden = false;
  document.body.classList.add('sunumda');
  sunum.requestFullscreen?.().catch(() => {});
  sunumGoster();
}
function sunumKapat() {
  sunum.hidden = true;
  iframe.src = 'about:blank';
  document.body.classList.remove('sunumda');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
function sunumGit(d) {
  sunumI = (sunumI + d + sunumListe.length) % sunumListe.length;
  sunumGoster();
}
sunum.addEventListener('click', (e) => {
  const git = e.target.closest('[data-sunum-git]');
  if (git) return sunumGit(Number(git.dataset.sunumGit));
  if (e.target.closest('[data-sunum-kapat]')) return sunumKapat();
  if (e.target.closest('[data-sunum-qr]')) tasarimQr(sunumListe[sunumI]);
});
addEventListener('keydown', (e) => {
  if (sunum.hidden || dialog.open) return;
  if (e.key === 'ArrowRight' || e.key === ' ') sunumGit(1);
  else if (e.key === 'ArrowLeft') sunumGit(-1);
  else if (e.key === 'Escape') sunumKapat();
});

render();
