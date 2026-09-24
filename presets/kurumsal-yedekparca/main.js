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
v.hizmetler = v.hizmetler.map((h) => ({
  ...h,
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
