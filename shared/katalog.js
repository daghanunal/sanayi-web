// Preset kataloğu ve satış ayarları. Saha kiti, vitrin ve presetlerdeki vitrin çubuğu bunu kullanır.

// Seçimlerin geleceği WhatsApp numarası (ülke koduyla, sadece rakam).
// TODO: gerçek satış numarasıyla değiştir.
export const SATIS_WHATSAPP = '905555555555';

export const SEKTORLER = [
  { id: 'motor', ad: 'Motor ve mekanik', ornek: 'Motor, şanzıman, bakım' },
  { id: 'boya', ad: 'Boya ve kaporta', ornek: 'Boya, göçük, pasta-cila, seramik' },
  { id: 'lastik', ad: 'Lastik ve jant', ornek: 'Lastik, jant, rot-balans' },
  { id: 'elektrik', ad: 'Oto elektrik', ornek: 'Elektrik, beyin, arıza tespit' },
  { id: 'doseme', ad: 'Döşeme', ornek: 'Koltuk, tavan, direksiyon' },
];

export const PRESETS = [
  { id: 'silindir', grup: 'sinematik', sektor: 'motor', ad: 'Silindir', icin: 'Motor, mekanik, şanzıman', renk: '#ff5a17' },
  { id: 'vernik', grup: 'sinematik', sektor: 'boya', ad: 'Vernik', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#b9c7ff' },
  { id: 'drift', grup: 'sinematik', sektor: 'lastik', ad: 'Drift', icin: 'Lastik, jant, rot-balans', renk: '#ffd000' },
  { id: 'voltaj', grup: 'sinematik', sektor: 'elektrik', ad: 'Voltaj', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#5ee6ff' },
  { id: 'kapitone', grup: 'sinematik', sektor: 'doseme', ad: 'Kapitone', icin: 'Döşeme, köklü aile işletmeleri', renk: '#c0763f' },
  { id: 'garaj', grup: 'klasik', sektor: 'motor', ad: 'Garaj', icin: 'Motor, mekanik, şanzıman', renk: '#e8742a' },
  { id: 'showroom', grup: 'klasik', sektor: 'boya', ad: 'Showroom', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#c9d6df' },
  { id: 'pist', grup: 'klasik', sektor: 'lastik', ad: 'Pist', icin: 'Lastik, jant, rot-balans', renk: '#f2c230' },
  { id: 'devre', grup: 'klasik', sektor: 'elektrik', ad: 'Devre', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#3fa9f5' },
  { id: 'usta', grup: 'klasik', sektor: 'doseme', ad: 'Usta', icin: 'Döşeme, köklü aile işletmeleri', renk: '#a8552f' },
];

export const presetById = (id) => PRESETS.find((p) => p.id === id);

// 0532 123 45 67 → 905321234567
export const toWhatsapp = (tel) => {
  let n = String(tel).replace(/\D/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (n.length === 10) n = '90' + n;
  return n;
};

// Zayıf telefonda sinematik (3D) tasarımlar ağır gelebilir; önce klasiği öner.
export const zayifCihaz = () => {
  const nav = navigator;
  return (
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
    (nav.deviceMemory && nav.deviceMemory <= 3) ||
    nav.connection?.saveData === true
  );
};
