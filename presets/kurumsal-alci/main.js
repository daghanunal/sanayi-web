import '../../shared/base.css';
import ana from '../../data/alcibay.json';
import ek from '../../data/kurumsal-alci.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { urunBul, fabrikalar, hero } from './extra.js';
import './style.css';

// Alçıbay verisini motorun ortak şemasına çevir (ürünler → hizmetler, fabrikalar → konumlar, rakamlar).
const v = derinBirlestir(ana, ek);
const kapasite = (v.konumlar || []).reduce((a, x) => a + (x.kapasite || 0), 0);
v.hizmetler = [
  ...v.urunler.map((u) => ({ baslik: u.ad, kisa: u.kisa, aciklama: `${u.kisa} ${u.artilar?.length ? `${u.artilar.join(', ')}.` : ''}`.trim(), gorsel: u.torba, detay: u.anahtar, sure: null })),
  ...(v.paneller || []).map((p) => ({ baslik: `${p.ad}, ${p.tanim.toLocaleLowerCase('tr')}`, kisa: p.metin, aciklama: p.metin, gorsel: p.gorsel, detay: [['Standart', p.standart], ['Kullanım', p.alanlar]] })),
];
v.istatistikler = [
  { deger: new Date().getFullYear() - v.isletme.kurulus, sonek: '', etiket: 'yıllık üretim deneyimi' },
  { deger: (v.konumlar || []).filter((x) => x.kapasite).length, sonek: '', etiket: 'fabrika: Bala ve Tarsus' },
  ...(kapasite ? [{ deger: kapasite, sonek: ' ton', etiket: 'günlük toz alçı kapasitesi' }] : []),
  { deger: v.urunler.length + (v.paneller?.length || 0), sonek: '', etiket: 'ürün: 7 alçı, 4 alçı plaka' },
];
v.kurumsal.hakkimizda.paragraflar = [
  v.isletme.hakkinda,
  ...(v.konumlar || []).filter((x) => x.not).map((x) => `${x.ad}: ${x.not}`),
];
v.kurumsal.ozet.metin = v.isletme.hakkinda;
v.kurumsal.belgeler = v.belgeler;
v.kurumsal.hero.bilgi = [
  ['Kuruluş', String(v.isletme.kurulus)],
  ['Fabrikalar', 'Bala / Ankara, Tarsus / Mersin'],
  ['Merkez', v.iletisim.telefon],
];

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    heroGorsel: `${B}img/kurumsal-alci/fabrika-3d.jpg`,
    heroAlt: 'Beton zeminde üç alçı torbası ve arkada alçı plaka yığını (temsilî 3D görsel)',
    logoAlt: 'Yapı alçıları · Alçı plaka',
    baslikEki: 'Yapı alçıları ve alçı plaka',
    teklifEtiketi: 'Bize ulaşın',
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
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'fabrikalar', 'urunBul', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'fabrikalar', 'kalite', 'tarihce', 'cta'] },
    { id: 'urunler', baslik: 'Ürünler', bolumler: ['hizmetler', 'cta'] },
    { id: 'urun-secici', baslik: 'Ürün Seçici', bolumler: ['urunBul', 'cta'] },
    { id: 'iletisim', baslik: 'Fabrikalar ve İletişim', menu: 'İletişim', bolumler: ['iletisim'] },
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
    { href: '#/urun-secici', rota: 'urun-secici', ikon: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>', etiket: 'Ürün bul' },
    { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.iletisim.mapsQuery)}`, dis: true, ikon: icons.pin, etiket: 'Yol tarifi' },
  ],
});
