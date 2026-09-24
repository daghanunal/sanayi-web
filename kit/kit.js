import QRCode from 'qrcode';
import { PRESETS, toWhatsapp } from '../shared/katalog.js';

const GRUPLAR = [
  ['sinematik', 'Sinematik', 'Baştan sona 3D ve scroll filmi. Etkilemek için önce bunları göster.'],
  ['klasik', 'Klasik', 'Daha sade ve hafif. Hızlı açılır.'],
];


const STORE = 'saha-kiti';
const form = document.getElementById('form');
const list = document.getElementById('list');
const dialog = document.getElementById('qr');

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
};
const save = (v) => {
  try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {}
};

function values() {
  const f = new FormData(form);
  return { ad: f.get('ad').trim(), tel: f.get('tel').trim(), kurulus: f.get('kurulus').trim() };
}

function presetUrl(id, v) {
  const p = new URLSearchParams();
  if (v.ad) p.set('ad', v.ad);
  if (v.tel) {
    p.set('tel', v.tel);
    p.set('wa', toWhatsapp(v.tel));
  }
  if (/^\d{4}$/.test(v.kurulus)) p.set('kurulus', v.kurulus);
  const q = p.toString();
  return new URL(`presets/${id}/${q ? '?' + q : ''}`, location.href).href;
}

function render() {
  const v = values();
  save(v);
  const card = (p) => `
    <li class="card" style="--c:${p.renk}">
      <a class="card__open" href="${presetUrl(p.id, v)}">
        <img class="card__shot" src="${import.meta.env.BASE_URL}onizleme/${p.id}.jpg" alt="" loading="lazy" onerror="this.remove()">
        <span class="card__name">${p.ad}</span>
        <span class="card__for">${p.icin}</span>
      </a>
      <button type="button" class="card__qr" data-qr="${p.id}" aria-label="${p.ad} için QR kodu göster">QR</button>
    </li>`;
  list.innerHTML = GRUPLAR.map(
    ([id, baslik, aciklama]) => `
    <section class="kit__group">
      <h2>${baslik}</h2>
      <p>${aciklama}</p>
      <ul class="kit__list">${PRESETS.filter((p) => p.grup === id).map(card).join('')}</ul>
    </section>`
  ).join('');
}

const saved = load();
for (const [k, val] of Object.entries(saved)) if (form.elements[k]) form.elements[k].value = val;
form.addEventListener('input', render);
form.addEventListener('reset', () => setTimeout(render));
form.addEventListener('submit', (e) => e.preventDefault());

// Ustanın kendi telefonuyla okutacağı vitrin linki (adı ve telefonu dolu gelir).
function vitrinUrl(v) {
  const p = new URLSearchParams();
  if (v.ad) p.set('ad', v.ad);
  if (v.tel) p.set('tel', v.tel);
  const q = p.toString();
  return new URL(`vitrin/${q ? '?' + q : ''}`, location.href).href;
}

async function showQr(title, url) {
  dialog.querySelector('.qr__title').textContent = title;
  await QRCode.toCanvas(dialog.querySelector('canvas'), url, { width: 280, margin: 1 });
  dialog.showModal();
}

form.addEventListener('click', (e) => {
  if (!e.target.closest('[data-vitrin]')) return;
  const v = values();
  showQr(v.ad ? `${v.ad}: tasarımını seç` : 'Tasarımını seç', vitrinUrl(v));
});

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-qr]');
  if (!btn) return;
  const p = PRESETS.find((x) => x.id === btn.dataset.qr);
  const v = values();
  showQr(`${v.ad || 'Demo'}: ${p.ad}`, presetUrl(p.id, v));
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog || e.target.matches('[data-close]')) dialog.close();
});

render();
