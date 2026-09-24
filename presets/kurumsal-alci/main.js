import '../../shared/base.css';
import ana from '../../data/alcibay.json';
import ek from '../../data/kurumsal-alci.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { urunBul } from './extra.js';
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
    hero: 'tam',
    gecis: 'perde',
    heroGorsel: `${B}img/alcibay/kose-isik.jpg`,
    heroAlt: 'Işık alan pürüzsüz alçı duvar köşesi',
    logo: `${B}img/alcibay/logo.png`,
    logoAcik: `${B}img/alcibay/logo-acik.png`,
    baslikEki: 'Yapı alçıları ve alçı plaka',
    teklifEtiketi: 'Bize ulaşın',
    hizmetEtiketi: 'Ürünler',
    altNot: 'Bu sayfa Alçıbay için hazırlanmış bir tasarım önerisidir. Ürün bilgileri alcibay.com’dan alınmıştır; görsellerin bir kısmı temsilidir (Pexels).',
    css: {
      zemin: '#f4f3ef', yuzey: '#e8e6e0', metin: '#1b1d1e', soluk: '#5c6061', cizgi: 'rgb(27 29 30 / .14)',
      vurgu: '#f29d20', 'vurgu-metin': '#1b1d1e', koyu: '#1c1e1f', 'koyu-metin': '#efede8', 'koyu-soluk': '#a3a6a6',
      gecis: '#fbfaf7',
      'font-baslik': "'Red Hat Display', system-ui, sans-serif", 'font-govde': "'Red Hat Text', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.025em', 'baslik-satir': '0.98', radius: '0px', 'radius-buyuk': '0px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'urunBul', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'kalite', 'tarihce', 'cta'] },
    { id: 'urunler', baslik: 'Ürünler', bolumler: ['hizmetler', 'cta'] },
    { id: 'urun-secici', baslik: 'Ürün Seçici', bolumler: ['urunBul', 'cta'] },
    { id: 'iletisim', baslik: 'Fabrikalar ve İletişim', menu: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { urunBul },
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
