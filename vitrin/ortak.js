// Vitrin ve saha kitinin ortak parçaları: aile adları ve Türkçe sektör araması.
// (Katalogda eş anlamlı alanı olmadığı için eş anlamlılar burada; katalog SEKTORLER'e `arama` alanı eklenirse o da okunur.)

export const AILE = {
  sinematik: ['3D sinematik', 'Kaydırdıkça canlanan 3D sahneler.'],
  kurumsal: ['Kurumsal', 'Menülü, sayfalı, ciddi firma sitesi.'],
  kinetik: ['Hareketli', 'Hareketli yazılar, her telefonda akıcı.'],
  klasik: ['Sade', 'Sade, her telefonda hızlı açılır.'],
  ozel: ['Özel tasarım', ''],
};
export const aileAdi = (g) => AILE[g]?.[0] || g[0].toLocaleUpperCase('tr') + g.slice(1);

// Arama: Türkçe harf duyarsız (ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u), "-cı/-cu/-lık" eklerini tanır, eş anlamlılar.
const HARF = { ı: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u' };
export const norm = (s) =>
  String(s ?? '').toLocaleLowerCase('tr').replace(/[ışğçöüâîû]/g, (c) => HARF[c])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const EK = {
  motor: 'motorcu mekanik mekanikci tamir tamirci bakim yag triger kafa conta araba',
  boya: 'boyaci kaporta kaportaci gocuk pasta cila seramik kaplama boyasiz dent',
  lastik: 'lastikci jant jantci rot balans rotbalans kis lastigi teker tekerlek',
  elektrik: 'elektrikci beyin ecu ariza tespit aku sarj mars alternator elektronik',
  doseme: 'dosemeci koltuk tavan direksiyon deri kilif',
  yedekparca: 'parca parcaci yedek orijinal muadil',
  rektifiye: 'rektifiyeci torna tornaci honlama krank planya silindir',
  egzoz: 'egzozcu egsoz egzos susturucu dpf katalitik katalizor',
  cam: 'camci cam filmi on cam tas izi silecek',
  agirvasita: 'kamyon kamyoncu tir cekici otobus minibus agir vasita',
  klima: 'klimaci gaz dolum kompresor kacak',
  lpg: 'lpgci otogaz tup donusum',
  kilit: 'kilitci anahtarci anahtar cilingir immobilizer kumanda',
  turbo: 'turbocu intercooler',
  dizel: 'dizelci enjektor enjektorcu pompa pompaci mazot',
  radyator: 'radyatorcu petek hararet sogutma fan termostat',
  sanziman: 'sanzimanci otomatik vites dsg cvt mekatronik',
  yikama: 'yikamaci detay temizlik kuafor koltuk yikama',
  ekspertiz: 'eksper ekspertizci kontrol rapor',
  cekici: 'kurtarici yol yardim vinc aku takviye',
  eczane: 'eczaci ilac',
  alci: 'alcici alcipan siva kartonpiyer',
  veteriner: 'vet hayvan pet kedi kopek',
  dis: 'disci dis hekimi implant',
  restoran: 'lokanta kebap kebapci ocakbasi yemek',
  mimarlik: 'mimar proje ic mimar',
};
const DOLGU = new Set(['oto', 've', 'araba', 'arac', 'servis', 'servisi', 'dukkan', 'sanayi', 'usta', 'ustasi', 'isi', 'is']);
const kokler = (t) => [...new Set([t, t.replace(/(ci|cu)?(lik|luk)$/, ''), t.replace(/(ci|cu)(lar|ler)?$/, ''), t.replace(/(lar|ler)$/, '')])].filter((k) => k.length >= 2);
export const samanlik = (k) => norm(`${k.ad} ${k.ornek || ''} ${k.id} ${EK[k.id] || ''} ${k.arama || ''}`).split(' ');
export function eslesir(kelimeler, sorgu) {
  const tokenlar = norm(sorgu).split(' ').filter((t) => t && !DOLGU.has(t));
  if (!tokenlar.length) return true;
  return tokenlar.every((t) => kokler(t).some((k) => kelimeler.some((w) => w.startsWith(k) || (w.length >= 3 && k.startsWith(w)))));
}
