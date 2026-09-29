import '../../shared/base.css';
import ana from '../../data/alcibay.json';
import ek from '../../data/kurumsal-alci.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { urunBul, fabrikalar, hero } from './extra.js';
import './style.css';

// Alçıbay verisini motorun ortak şemasına çevir (ürünler → hizmetler, fabrikalar → konumlar, olgu rakamları).
const v = derinBirlestir(ana, ek);
v.hizmetler = [
  ...v.urunler.map((u) => ({ baslik: u.ad, kisa: u.kisa, aciklama: u.kisa, gorsel: u.torba, detay: u.anahtar, sure: null })),
  ...(v.paneller || []).map((p) => ({ baslik: `${p.ad}, ${p.tanim.toLocaleLowerCase('tr')}`, kisa: p.metin, aciklama: p.metin, gorsel: p.gorsel, detay: [['Standart', p.standart], ['Kullanım', p.alanlar]] })),
];
// Rakamlar yalnız olgu: kuruluştan geçen yıl ve alcibay.com'da yayımlanan günlük fabrika kapasiteleri.
v.istatistikler = [
  { deger: 0, sonek: ' yıl', etiket: 'yıldır üretimde', kurulustanHesapla: true },
  ...(v.konumlar || []).filter((x) => x.kapasite).map((x) => ({ deger: x.kapasite, sonek: ' ton', etiket: `günlük kapasite, ${x.il.split(' / ').slice(-2)[0]}`, olgu: true })),
  { deger: v.urunler.length, sonek: '', etiket: `toz alçı, ${v.paneller?.length || 0} alçı plaka tipi`, olgu: true },
];
v.kurumsal.hakkimizda.paragraflar = [
  v.isletme.hakkinda,
  ...(v.konumlar || []).filter((x) => x.not).map((x) => `${x.ad}: ${x.not}`),
];
v.kurumsal.ozet.metin = v.isletme.hakkinda;
v.kurumsal.belgeler = v.belgeler;

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    heroGorsel: `${B}img/kurumsal-alci/fabrika-3d.jpg`,
    heroAlt: 'Beton zeminde üç alçı torbası ve arkada alçı plaka yığını (temsilî 3D görsel)',
    yer: 'yapı alçısı üretiyor',
    logoAlt: 'Yapı alçıları · Alçı plaka',
    baslikEki: 'Yapı alçıları ve alçı plaka',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Ürünler',
    altNot: 'Bu sayfa Alçıbay için hazırlanmış bir tasarım önerisidir. Ürün bilgileri, adresler, kapasiteler ve belgeler alcibay.com’da yayımlanan bilgilerdir. Torba ve plaka görselleri temsilî 3D çizimlerdir; gerçek ambalaj farklıdır. Fotoğraflar temsilîdir (Pexels).',
    // "Kurumsal Fabrika" yönü: mineral beyazı zemin, derin gece mavisi vurgu, beton grisi paneller; ölçüler IBM Plex Mono.
    // Kardeşlerden ayrışır: marka turuncusu yalnızca amiral sayfada (alcibay), perdah kiremit, kinetik elektrik mavisi.
    css: {
      zemin: '#f2f3f1', yuzey: '#e4e7e5', metin: '#151b24', soluk: '#525c67', cizgi: 'rgb(21 27 36 / .14)',
      vurgu: '#1c2e55', 'vurgu-metin': '#ffffff', koyu: '#131c2e', 'koyu-metin': '#eef1f5', 'koyu-soluk': '#a3adbd',
      gecis: 'repeating-linear-gradient(90deg, #131c2e 0 38px, #1c2e55 38px 40px)',
      'font-baslik': "'IBM Plex Sans', system-ui, sans-serif", 'font-govde': "'IBM Plex Sans', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.03em', 'baslik-satir': '1', radius: '2px', 'radius-buyuk': '4px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'fabrikalar', 'cta'] },
    { id: 'urunler', baslik: 'Ürünler', bolumler: ['hizmetler', 'urunBul', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'kalite', 'tarihce', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { urunBul, fabrikalar, hero },
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': ['Organization', 'Manufacturer'],
    name: d.isletme.ad,
    legalName: d.isletme.unvan,
    foundingDate: String(d.isletme.kurulus),
    url: 'https://www.alcibay.com/',
    telephone: d.iletisim.telefon,
    address: { '@type': 'PostalAddress', streetAddress: 'İlkbahar Mahallesi 606. Sok. No:7', addressLocality: 'Çankaya', addressRegion: 'Ankara', addressCountry: 'TR' },
    location: (d.konumlar || []).map((x) => ({ '@type': 'Place', name: x.ad, address: `${x.adres}, ${x.il}`, telephone: x.tel })),
  }),
  aksiyon: (d) => [
    { href: `tel:${d.iletisim.telefon.replace(/[^\d+]/g, '')}`, ikon: icons.phone, etiket: 'Ara' },
    { href: '#/urunler', rota: 'urunler', ikon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16l9-9 3 3-9 9H6z"/></svg>', etiket: 'Ürünler' },
    { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.iletisim.mapsQuery)}`, dis: true, ikon: icons.pin, etiket: 'Yol tarifi' },
  ],
});
