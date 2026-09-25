import '../../shared/base.css';
import ana from '../../data/sektor-veteriner.json';
import ek from '../../data/kurumsal-veteriner.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, mapsHref, icons, gsap, reducedMotion } from '../../shared/core.js';
import { karneHero, asiKarnesi, hizmetler, hizmetOzet, ozet } from './extra.js';
import './style.css';

// "Pati karnesi" yönü: pudra pembesi zemin, derin petrol yeşili, hardal mühür.
// Tekrarlanan motif: aşı karnesi sayfası (mono yazı, delikli kenar) ve yuvarlak klinik mühürü.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KISA = {
  muayene: 'Ateş, kalp, akciğer, göz, kulak ve deri. Bulguları sonunda anlatırız.',
  asi: 'Karneyi biz tutar, günü gelince WhatsApp’tan hatırlatırız.',
  kisirlastirma: 'Önce tahlil ve anestezi görüşmesi, aynı gün eve.',
  dis: 'Ağız muayenesi, sonra sedasyon altında ultrasonik temizlik.',
  laboratuvar: 'Hemogram ve biyokimya klinikte, sonuç 30-45 dakikada.',
  ultrason: 'Karın içi organlar ve gebelik takibi, ekranda birlikte.',
  bakim: 'Tırnak, kulak, tüy düğümü ve parazit kontrolü.',
  acil: 'Zehirlenme, kanama, nefes darlığı: yola çıkmadan arayın.',
};
const DETAY = {
  muayene: [['Getirin', 'Eski karne, tahliller'], ['Sonunda', 'Bulgular tek tek']],
  asi: [['Önce', 'Kısa muayene'], ['Sonra', 'Tarih karneye']],
  kisirlastirma: [['Önce', 'Kan tahlili'], ['Kontrol', '10 gün sonra']],
  dis: [['Önce', 'Ağız muayenesi'], ['Yöntem', 'Ultrasonik']],
  laboratuvar: [['Klinikte', 'Hemogram · biyokimya'], ['Dış test', 'Sonuç WhatsApp’tan']],
  acil: [['İlk adım', 'Telefonla arayın'], ['Biz', 'Hazırlık yaparız']],
};
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h) => ({ ...h, kisa: KISA[h.id], detay: DETAY[h.id] || [] }));

// Sayfa geçişi: perde ekranı kapattığı anda kaydırmayı başa al. Aksi halde yeni sayfanın tek seferlik
// tetikleri sayfanın dibinde kurulup kendini silerken ScrollTrigger yenilemesi hata veriyor.
let lenis = null;
addEventListener('hashchange', () => {
  if (reducedMotion) return;
  gsap.delayedCall(0.415, () => (lenis ? lenis.scrollTo(0, { immediate: true, force: true }) : scrollTo(0, 0)));
});

kurumsal({
  veri,
  onHazir: (ctx) => (lenis = ctx.lenis),
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: "Etimesgut'ta",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-veteriner/kopek.jpg`,
    heroAlt: 'Terrier köpek yandan portre',
    logoAlt: 'Muayene · Aşı · Laboratuvar',
    baslikEki: 'Veteriner kliniği | Etimesgut, Ankara',
    teklifEtiketi: 'Randevu alın',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
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
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['karneHero', 'hizmetOzet', 'asiKarnesi', 'rakamlar', 'ozet', 'yorumlar', 'markalar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kliniğimiz', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'asi-karnesi', baslik: 'Aşı karnesi', bolumler: ['asiKarnesi', 'surec', 'cta'] },
    { id: 'sorular', baslik: 'Sorular', bolumler: ['sss', 'yorumlar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { karneHero, asiKarnesi, hizmetler, hizmetOzet, ozet },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, `Merhaba ${d.isletme.ad}, randevu almak istiyorum.`), ikon: icons.whatsapp, etiket: 'WhatsApp', dis: true },
    { href: mapsHref(d), ikon: icons.pin, etiket: 'Yol tarifi', dis: true },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
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
