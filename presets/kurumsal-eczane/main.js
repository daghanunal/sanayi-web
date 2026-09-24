import '../../shared/base.css';
import ana from '../../data/eczane.json';
import ek from '../../data/kurumsal-eczane.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { nobetDurum } from './extra.js';
import './style.css';

const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Etimesgut'ta",
    heroGorsel: `${import.meta.env.BASE_URL}img/eczane/tezgah.jpg`,
    heroAlt: 'Eczane tezgâhı',
    logoAlt: 'Eczane',
    baslikEki: 'Eczane | Etimesgut, Ankara',
    teklifEtiketi: 'Reçete gönder',
    hizmetEtiketi: 'Hizmetlerimiz',
    metinBoyutu: true,
    css: {
      zemin: '#fbfaf6', yuzey: '#efede6', metin: '#0f1a1c', soluk: '#465255', cizgi: 'rgb(15 26 28 / .16)',
      vurgu: '#1d5c45', 'vurgu-metin': '#ffffff', koyu: '#10231d', 'koyu-metin': '#eef1ec', 'koyu-soluk': '#a9b8b1',
      gecis: '#c8102e',
      'font-baslik': "'Lexend', system-ui, sans-serif", 'font-govde': "'Atkinson Hyperlegible', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.02em', 'baslik-satir': '1.05', radius: '14px', 'radius-buyuk': '22px',
      govde: '18px', h2: 'clamp(30px, 4vw, 52px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'nobetDurum', 'hizmetOzet', 'ozet', 'rakamlar', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Eczanemiz', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'kurumlar', baslik: 'Kurumlar', bolumler: ['anlasmalar', 'cta'] },
    { id: 'sss', baslik: 'Sorular', bolumler: ['sss', 'yorumlar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['nobetDurum', 'iletisim'] },
  ],
  ekstralar: { nobetDurum },
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
    ...(d.puan && { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet } }),
  }),
});
