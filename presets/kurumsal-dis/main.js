import '../../shared/base.css';
import ana from '../../data/sektor-dis.json';
import ek from '../../data/kurumsal-dis.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, mapsHref, icons } from '../../shared/core.js';
import { arkHero, disHaritasi } from './extra.js';
import './style.css';

// "Diş haritası" yönü: porselen buz beyazı zemin, derin çivit, diş eti pembesi vurgu.
// Kemer (dental ark) motifi: hero penceresi, diş halkası, harita. Fotoğraflar yumuşak kemer içinde.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DETAY = {
  muayene: [['Gerekirse', 'Röntgen'], ['Sonra', 'Tedavi seçenekleri anlatılır']],
  kanal: [['Anestezi', 'Lokal'], ['Seans', 'Bir ya da iki']],
  implant: [['Önce', 'Kemik değerlendirmesi'], ['Aşama', 'Kaynaşma, sonra üst yapı']],
  ortodonti: [['Seçenek', 'Tel · şeffaf plak'], ['Takip', 'Düzenli kontrol']],
  cocuk: [['Koruma', 'Fissür örtücü · flor'], ['İlk ziyaret', 'Tanışma']],
  cekim: [['Önce', 'Röntgen'], ['Sonra', 'Yazılı bakım notu']],
};
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h) => ({ ...h, detay: DETAY[h.id] || [] }));
const waGenel = veri.waMesaj || 'Merhaba, muayene için randevu almak istiyorum.';

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Atakent'te",
    heroGorsel: `${import.meta.env.BASE_URL}img/sektor-dis/hekim.jpg`,
    heroAlt: 'Hekim, koltuktaki hastayı muayene ederken',
    logoAlt: 'Diş kliniği',
    baslikEki: 'Diş kliniği | Etimesgut, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
    altNot: 'Fotoğraflar temsilîdir (Pexels). Yorumlar örnektir. Sayfadaki bilgiler genel bilgilendirme içindir.',
    css: {
      zemin: '#eef1f8', yuzey: '#e0e5f2', metin: '#131838', soluk: '#4d5378', cizgi: 'rgb(19 24 56 / .14)',
      vurgu: '#de3d66', 'vurgu-metin': '#ffffff', koyu: '#171b45', 'koyu-metin': '#eef0fb', 'koyu-soluk': '#a6abd2',
      gecis: '#171b45',
      'font-baslik': "'Livvic', system-ui, sans-serif", 'font-govde': "'Nunito Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.03em', 'baslik-satir': '1.02',
      radius: '16px', 'radius-buyuk': '30px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['arkHero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'cta'] },
    { id: 'dis-haritasi', baslik: 'Diş haritası', bolumler: ['disHaritasi', 'cta'] },
    { id: 'sorular', baslik: 'Sorular', bolumler: ['sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { arkHero, disHaritasi },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, waGenel), ikon: icons.whatsapp, etiket: 'WhatsApp', dis: true },
    { href: mapsHref(d), ikon: icons.pin, etiket: 'Yol tarifi', dis: true },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  }),
});
