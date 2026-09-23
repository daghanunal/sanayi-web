import QRCode from 'qrcode';

const GRUPLAR = [
  ['sinematik', 'Sinematik', 'Baştan sona 3D ve scroll filmi. Etkilemek için önce bunları göster.'],
  ['klasik', 'Klasik', 'Daha sade ve hafif. Hızlı açılır.'],
];

const PRESETS = [
  { id: 'silindir', grup: 'sinematik', ad: 'Silindir', icin: 'Motor, mekanik, şanzıman', renk: '#ff5a17' },
  { id: 'vernik', grup: 'sinematik', ad: 'Vernik', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#b9c7ff' },
  { id: 'drift', grup: 'sinematik', ad: 'Drift', icin: 'Lastik, jant, rot-balans', renk: '#ffd000' },
  { id: 'voltaj', grup: 'sinematik', ad: 'Voltaj', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#5ee6ff' },
  { id: 'kapitone', grup: 'sinematik', ad: 'Kapitone', icin: 'Döşeme, köklü aile işletmeleri', renk: '#c0763f' },
  { id: 'garaj', grup: 'klasik', ad: 'Garaj', icin: 'Motor, mekanik, şanzıman', renk: '#e8742a' },
  { id: 'showroom', grup: 'klasik', ad: 'Showroom', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#c9d6df' },
  { id: 'pist', grup: 'klasik', ad: 'Pist', icin: 'Lastik, jant, rot-balans', renk: '#f2c230' },
  { id: 'devre', grup: 'klasik', ad: 'Devre', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#3fa9f5' },
  { id: 'usta', grup: 'klasik', ad: 'Usta', icin: 'Döşeme, köklü aile işletmeleri', renk: '#a8552f' },
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

// 0532 123 45 67 → 905321234567
const toWhatsapp = (tel) => {
  let n = tel.replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (n.length === 10) n = '90' + n;
  return n;
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

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-qr]');
  if (!btn) return;
  const p = PRESETS.find((x) => x.id === btn.dataset.qr);
  const v = values();
  dialog.querySelector('.qr__title').textContent = `${v.ad || 'Demo'}: ${p.ad}`;
  await QRCode.toCanvas(dialog.querySelector('canvas'), presetUrl(p.id, v), { width: 280, margin: 1 });
  dialog.showModal();
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog || e.target.matches('[data-close]')) dialog.close();
});

render();
