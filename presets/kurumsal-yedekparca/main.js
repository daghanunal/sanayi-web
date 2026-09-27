import '../../shared/base.css';
import ana from '../../data/depo.json';
import ek from '../../data/kurumsal-yedekparca.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { sasiSorgu } from './extra.js';
import './style.css';

// Depo verisini motorun şemasına çevir: ürün grubu → hizmet (raf kodu ve örnek parçalar ayrıntıda).
const v = derinBirlestir(ana, ek);
const nf = new Intl.NumberFormat('tr-TR');
// Ürün gruplarına stüdyo çekimi gibi 3D parça görselleri (Cycles; temsilî).
const B3 = import.meta.env.BASE_URL + 'img/kurumsal-yedekparca/3d-';
const GORSEL = { disk: 'fren', filtre: 'filtre', amortisor: 'amortisor', triger: 'triger', debriyaj: 'volan', buji: 'bobin', piston: 'piston' };
// Yorumlar örnektir: uydurma puan ve "N değerlendirme" sayısı gösterilmez.
delete v.puan;
v.kurumsal = { ...v.kurumsal, yorumBaslik: 'Örnek müşteri yorumları' };
v.hizmetler = v.hizmetler.map((h) => ({
  ...h,
  gorsel: GORSEL[h.parca] ? `${B3}${GORSEL[h.parca]}.jpg` : undefined,
  kisa: h.ornekler?.join(', '),
  sure: null,
  detay: [
    ['Raf', h.raf],
    ['Stokta', `${nf.format(h.stok)} kalem`],
    ['Örnek parçalar', h.ornekler.slice(0, 3).join(', ')],
  ],
}));

const B = import.meta.env.BASE_URL;
const ara = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/depo/raf.jpg`,
    heroAlt: 'Tavana kadar dolu raflar arasında uzanan depo koridoru',
    logoAlt: 'Orijinal ve muadil yedek parça',
    baslikEki: 'Oto yedek parça | Şaşmaz, Ankara',
    teklifEtiketi: 'Parça sorun',
    hizmetEtiketi: 'Ürün grupları',
    altNot: 'Fotoğraflar Pexels; 3D parça görselleri temsilîdir; yorumlar örnektir.',
    css: {
      zemin: '#f1f3f6', yuzey: '#e2e7ee', metin: '#0b1526', soluk: '#4e5a6c', cizgi: 'rgb(11 21 38 / .13)',
      vurgu: '#1f3fd1', 'vurgu-metin': '#ffffff', koyu: '#0a1122', 'koyu-metin': '#e8edf5', 'koyu-soluk': '#95a1b5',
      gecis: '#ffd23f',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Public Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '118%', 'baslik-harf': '-0.03em', 'baslik-satir': '0.96', radius: '8px', 'radius-buyuk': '16px',
      h2: 'clamp(30px, 4vw, 54px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'sasiSorgu', 'hizmetOzet', 'rakamlar', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'cta'] },
    { id: 'urunler', baslik: 'Ürün Grupları', menu: 'Ürünler', bolumler: ['hizmetler', 'markalar', 'cta'] },
    { id: 'sorgu', baslik: 'Şasi ile Sorgu', bolumler: ['sasiSorgu', 'surec', 'sss'] },
    { id: 'bayi', baslik: 'Servis ve Bayi', bolumler: ['anlasmalar', 'surec', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { sasiSorgu },
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    ...(d.puan && { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet } }),
  }),
  aksiyon: (d) => [
    { href: `tel:${d.iletisim.telefon.replace(/[^\d+]/g, '')}`, ikon: icons.phone, etiket: 'Ara' },
    { href: '#/sorgu', rota: 'sorgu', ikon: ara, etiket: 'Şasi ile sor' },
    { href: `https://wa.me/${d.iletisim.whatsapp}`, dis: true, ikon: icons.whatsapp, etiket: 'WhatsApp' },
  ],
});

// Motorun hizmet sayfasındaki "Bu hizmet için teklif isteyin" bağlantısı parça deposuna uymuyor:
// sayfa her çizildiğinde metni "Bu gruptan parça sorun" yap (motorda bu metin için seçenek yok).
{
  const fix = () => document.querySelectorAll('.k-hizmet .k-link').forEach((a) => {
    const t = a.firstChild;
    if (t && t.nodeType === 3 && /Bu hizmet için/.test(t.textContent)) t.textContent = 'Bu gruptan parça sorun ';
  });
  new MutationObserver(fix).observe(document.body, { childList: true, subtree: true });
  fix();
}
