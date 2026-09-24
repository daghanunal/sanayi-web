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
  { id: 'yedekparca', ad: 'Yedek parça', ornek: 'Orijinal ve muadil parça' },
  { id: 'rektifiye', ad: 'Rektifiye ve torna', ornek: 'Honlama, krank, kafa planyası' },
  { id: 'egzoz', ad: 'Egzoz', ornek: 'Susturucu, DPF, katalitik' },
  { id: 'cam', ad: 'Oto cam', ornek: 'Ön cam, taş izi, cam filmi' },
  { id: 'agirvasita', ad: 'Ağır vasıta', ornek: 'Kamyon, çekici, otobüs servisi' },
];

// Vitrinde sektör olarak görünmeyen, ayrı satılan işler (saha kitinde "Özel işler").
export const OZEL_SEKTORLER = [
  { id: 'eczane', ad: 'Eczane' },
  { id: 'alci', ad: 'Alçı üreticisi' },
];

// Ailelerin sırası: normal cihazda sinematik önce, zayıf cihazda klasik önce.
export const GRUP_SIRASI = ['sinematik', 'kurumsal', 'kinetik', 'klasik'];

export const PRESETS = [
  { id: 'silindir', grup: 'sinematik', sektor: 'motor', ad: 'Silindir', icin: 'Motor, mekanik, şanzıman', renk: '#ff5a17' },
  { id: 'vernik', grup: 'sinematik', sektor: 'boya', ad: 'Vernik', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#b9c7ff' },
  { id: 'drift', grup: 'sinematik', sektor: 'lastik', ad: 'Drift', icin: 'Lastik, jant, rot-balans', renk: '#ffd000' },
  { id: 'voltaj', grup: 'sinematik', sektor: 'elektrik', ad: 'Voltaj', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#5ee6ff' },
  { id: 'kapitone', grup: 'sinematik', sektor: 'doseme', ad: 'Kapitone', icin: 'Döşeme, köklü aile işletmeleri', renk: '#c0763f' },
  { id: 'depo', grup: 'sinematik', sektor: 'yedekparca', ad: 'Depo', icin: 'Yedek parça', renk: '#d9a441' },
  { id: 'mikron', grup: 'sinematik', sektor: 'rektifiye', ad: 'Mikron', icin: 'Rektifiye ve torna', renk: '#7fb2d9' },
  { id: 'manifold', grup: 'sinematik', sektor: 'egzoz', ad: 'Manifold', icin: 'Egzoz, DPF, katalitik', renk: '#9b7fd9' },
  { id: 'kristal', grup: 'sinematik', sektor: 'cam', ad: 'Kristal', icin: 'Oto cam', renk: '#8fe3e0' },
  { id: 'tonaj', grup: 'sinematik', sektor: 'agirvasita', ad: 'Tonaj', icin: 'Ağır vasıta servisi', renk: '#e0b22f' },
  { id: 'tork', grup: 'kinetik', sektor: 'motor', ad: 'Tork', icin: 'Motor, mekanik, şanzıman', renk: '#1630e8' },
  { id: 'pigment', grup: 'kinetik', sektor: 'boya', ad: 'Pigment', icin: 'Boya, kaporta, detaylı temizlik', renk: '#ff4f8b' },
  { id: 'asfalt', grup: 'kinetik', sektor: 'lastik', ad: 'Asfalt', icin: 'Lastik, jant, rot-balans', renk: '#d8332a' },
  { id: 'amper', grup: 'kinetik', sektor: 'elektrik', ad: 'Amper', icin: 'Oto elektrik, arıza tespit', renk: '#ffab1f' },
  { id: 'ilmek', grup: 'kinetik', sektor: 'doseme', ad: 'İlmek', icin: 'Döşeme', renk: '#1d5a45' },
  { id: 'garaj', grup: 'klasik', sektor: 'motor', ad: 'Garaj', icin: 'Motor, mekanik, şanzıman', renk: '#e8742a' },
  { id: 'showroom', grup: 'klasik', sektor: 'boya', ad: 'Showroom', icin: 'Boya, kaporta, detaylı temizlik, seramik kaplama', renk: '#c9d6df' },
  { id: 'pist', grup: 'klasik', sektor: 'lastik', ad: 'Pist', icin: 'Lastik, jant, rot-balans', renk: '#f2c230' },
  { id: 'devre', grup: 'klasik', sektor: 'elektrik', ad: 'Devre', icin: 'Oto elektrik, elektronik, arıza tespit', renk: '#3fa9f5' },
  { id: 'usta', grup: 'klasik', sektor: 'doseme', ad: 'Usta', icin: 'Döşeme, köklü aile işletmeleri', renk: '#a8552f' },
  { id: 'raf', grup: 'klasik', sektor: 'yedekparca', ad: 'Raf', icin: 'Yedek parça', renk: '#d9a441' },
  { id: 'tezgah', grup: 'klasik', sektor: 'rektifiye', ad: 'Tezgâh', icin: 'Rektifiye ve torna', renk: '#7fb2d9' },
  { id: 'susturucu', grup: 'klasik', sektor: 'egzoz', ad: 'Susturucu', icin: 'Egzoz, DPF, katalitik', renk: '#1f9d6b' },
  { id: 'seffaf', grup: 'klasik', sektor: 'cam', ad: 'Şeffaf', icin: 'Oto cam', renk: '#f2a60c' },
  { id: 'dingil', grup: 'klasik', sektor: 'agirvasita', ad: 'Dingil', icin: 'Ağır vasıta servisi', renk: '#e0b22f' },
  { id: 'recete', grup: 'klasik', sektor: 'eczane', ad: 'Reçete', icin: 'Mahalle eczanesi', renk: '#1c6f40' },
  { id: 'perdah', grup: 'klasik', sektor: 'alci', ad: 'Perdah', icin: 'Alçıbay için sade yeniden tasarım', renk: '#f29d20' },
  { id: 'kurumsal-motor', grup: 'kurumsal', sektor: 'motor', ad: 'Kurumsal', icin: 'Motor ve mekanik, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-boya', grup: 'kurumsal', sektor: 'boya', ad: 'Kurumsal', icin: 'Boya ve kaporta, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-lastik', grup: 'kurumsal', sektor: 'lastik', ad: 'Kurumsal', icin: 'Lastik ve jant, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-elektrik', grup: 'kurumsal', sektor: 'elektrik', ad: 'Kurumsal', icin: 'Oto elektrik, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-doseme', grup: 'kurumsal', sektor: 'doseme', ad: 'Kurumsal', icin: 'Döşeme, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-yedekparca', grup: 'kurumsal', sektor: 'yedekparca', ad: 'Kurumsal', icin: 'Yedek parça, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-rektifiye', grup: 'kurumsal', sektor: 'rektifiye', ad: 'Kurumsal', icin: 'Rektifiye ve torna, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-egzoz', grup: 'kurumsal', sektor: 'egzoz', ad: 'Kurumsal', icin: 'Egzoz, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-cam', grup: 'kurumsal', sektor: 'cam', ad: 'Kurumsal', icin: 'Oto cam, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-agirvasita', grup: 'kurumsal', sektor: 'agirvasita', ad: 'Kurumsal', icin: 'Ağır vasıta, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-eczane', grup: 'kurumsal', sektor: 'eczane', ad: 'Kurumsal', icin: 'Eczane, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'kurumsal-alci', grup: 'kurumsal', sektor: 'alci', ad: 'Kurumsal', icin: 'Alçıbay, kurumsal görünüm', renk: '#8a94a6' },
  { id: 'eczane', grup: 'ozel', sektor: 'eczane', ad: 'Eczane', icin: 'Mahalle eczanesi', renk: '#3fbf8a' },
  { id: 'alcibay', grup: 'ozel', sektor: 'alci', ad: 'Alçıbay', icin: 'Alçıbay için yeniden tasarım önerisi', renk: '#e8e4dc' },
];

// Henüz yapılmamış ya da yayına alınmamış presetler burada gizlenir.
export const HAZIR_OLMAYAN = new Set(['raf', 'tezgah', 'dingil', 'kurumsal-motor', 'kurumsal-boya', 'kurumsal-lastik', 'kurumsal-elektrik', 'kurumsal-doseme', 'kurumsal-yedekparca', 'kurumsal-rektifiye', 'kurumsal-egzoz', 'kurumsal-cam', 'kurumsal-agirvasita', 'kurumsal-eczane', 'kurumsal-alci']);
export const hazirPresetler = () => PRESETS.filter((p) => !HAZIR_OLMAYAN.has(p.id));

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
