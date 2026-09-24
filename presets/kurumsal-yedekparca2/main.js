import '../../shared/base.css';
import ana from '../../data/depo.json';
import ek from '../../data/kurumsal-yedekparca2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { patlatma } from './extra.js';
import './style.css';

// Depo verisi → motor şeması: ürün grubu = hizmet; raf kodu, stok ve örnek parçalar ayrıntıda.
const v = derinBirlestir(ana, ek);
const nf = new Intl.NumberFormat('tr-TR');
v.hizmetler = v.hizmetler.map((h) => ({
  ...h,
  kisa: `Raf ${h.raf} · ${h.ornekler.join(', ')}`,
  sure: null,
  detay: [
    ['Raf', h.raf],
    ['Stokta', `${nf.format(h.stok)} kalem`],
    ['Örnek parçalar', h.ornekler.slice(0, 3).join(', ')],
  ],
}));

const hedef = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg>';

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    logoAlt: 'Yedek parça · Şekil ve numarayla',
    baslikEki: 'Oto yedek parça | Şaşmaz, Ankara',
    teklifEtiketi: 'Parça sorun',
    hizmetEtiketi: 'Ürün grupları',
    css: {
      zemin: '#d7eadc', yuzey: '#c5dfcd', metin: '#0c2a2a', soluk: '#3d5c57', cizgi: 'rgb(12 42 42 / .2)',
      vurgu: '#ff4a1c', 'vurgu-metin': '#0c2a2a', koyu: '#0c2a2a', 'koyu-metin': '#d7eadc', 'koyu-soluk': '#8db3a5',
      gecis: '#ff4a1c',
      'font-baslik': "'Syne', system-ui, sans-serif", 'font-govde': "'Schibsted Grotesk', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.98',
      radius: '3px', 'radius-buyuk': '6px',
      h1: 'clamp(40px, 6.4vw, 104px)', h2: 'clamp(32px, 4.4vw, 62px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['patlatma', 'hizmetOzet', 'rakamlar', 'ozet', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'cta'] },
    { id: 'urunler', baslik: 'Ürün Grupları', menu: 'Ürünler', bolumler: ['hizmetler', 'markalar', 'cta'] },
    { id: 'parca', baslik: 'Parça Bul', bolumler: ['patlatma', 'surec', 'sss'] },
    { id: 'servis', baslik: 'Servis ve Filo', bolumler: ['anlasmalar', 'surec', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { patlatma },
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
    { href: '#/parca', rota: 'parca', ikon: hedef, etiket: 'Parça bul' },
    { href: `https://wa.me/${d.iletisim.whatsapp}`, dis: true, ikon: icons.whatsapp, etiket: 'WhatsApp' },
  ],
});
