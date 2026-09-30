import '../../shared/base.css';
import ana from '../../data/sektor-veteriner.json';
import ek from '../../data/kurumsal-veteriner.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, mapsHref, icons } from '../../shared/core.js';
import { karneHero, asiKarnesi, hizmetOzet } from './extra.js';
import './style.css';

// "Pati karnesi" yönü: pudra pembesi zemin, derin petrol yeşili, hardal mühür.
// Tekrarlanan motif: aşı karnesi sayfası (mono yazı, delikli kenar) ve yuvarlak klinik mühürü.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DETAY = {
  muayene: [['Getirilecekler', 'Varsa eski karne ve tahliller'], ['Sonunda', 'Bulgular tek tek anlatılır']],
  asi: [['Önce', 'Kısa muayene'], ['Sonra', 'Tarih karneye yazılır']],
  kisirlastirma: [['Önce', 'Muayene ve kan tahlili'], ['Kontrol', '10 gün sonra']],
  dis: [['Önce', 'Ağız muayenesi'], ['Yöntem', 'Ultrasonik temizlik']],
  laboratuvar: [['Bakılanlar', 'Hemogram, biyokimya']],
  acil: [['İlk adım', 'Telefonla arayın']],
};
const veri = derinBirlestir(ana, ek);
// Acil durum hizmet listesinde değil: künyenin altındaki acil şeridinde ve sorularda (form bağlantısı acile uymaz).
veri.hizmetler = veri.hizmetler.filter((h) => h.id !== 'acil').map((h) => ({ ...h, detay: DETAY[h.id] || [] }));
const waGenel = veri.waMesaj || 'Merhaba, randevu almak istiyorum.';

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: "Elvankent'te",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-veteriner/kopek.jpg`,
    heroAlt: 'Terrier köpek yandan portre',
    logoAlt: 'Veteriner kliniği',
    baslikEki: 'Veteriner kliniği | Etimesgut, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
    altNot: 'Fotoğraflar temsilîdir (Pexels). Yorumlar ve aşı takvimi örnektir. Sayfadaki bilgiler genel bilgilendirme içindir; tedavi ve aşı kararını veteriner hekim muayeneden sonra verir.',
    css: {
      zemin: '#f7ebe6', yuzey: '#efdcd5', metin: '#10292b', soluk: '#4f6466', cizgi: 'rgb(16 41 43 / .15)',
      vurgu: '#0b6f6a', 'vurgu-metin': '#ffffff', koyu: '#0e3032', 'koyu-metin': '#f7ebe6', 'koyu-soluk': '#9dbcb9',
      gecis: '#0b6f6a',
      'font-baslik': "'Gabarito', system-ui, sans-serif", 'font-govde': "'Figtree', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-harf': '-0.03em', 'baslik-satir': '0.98',
      radius: '14px', 'radius-buyuk': '28px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['karneHero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'cta'] },
    { id: 'asi-karnesi', baslik: 'Aşı karnesi', bolumler: ['asiKarnesi', 'cta'] },
    { id: 'sorular', baslik: 'Sorular', bolumler: ['sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { karneHero, asiKarnesi, hizmetOzet },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, waGenel), ikon: icons.whatsapp, etiket: 'WhatsApp', dis: true },
    { href: mapsHref(d), ikon: icons.pin, etiket: 'Yol tarifi', dis: true },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
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
