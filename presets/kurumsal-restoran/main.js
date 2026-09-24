import '../../shared/base.css';
import ana from '../../data/sektor-restoran.json';
import ek from '../../data/kurumsal-restoran.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, mapsHref, icons } from '../../shared/core.js';
import { kemerHero, menuPano, masaKur, ocakSaati, sis, hizmetler } from './extra.js';
import './style.css';

// "Çini sofra" yönü: sırlı çini beyazı zemin, İznik laciverdi, pul biber kırmızısı.
// Tekrarlanan motif: kemer (fotoğraflar kemer pencerede), çini şerit, köz üstünde şiş.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const g = (x) => `/img/kurumsal-restoran/${x}.jpg`;
// Veri dosyasındaki hizmet sırasıyla: grup, fotoğraf, kısa metin, ayrıntı.
const EK = [
  ['ocak', 'ocak', 'Tezgâhta oturun, şiş gözünüzün önünde közde döner.', [['Yer', 'Ocak tezgâhı'], ['Hafta sonu', 'Önceden yazın']]],
  ['ocak', 'kor-adana', 'Zırh kıyması, kuyruk yağı, pul biber. Acılı ya da acısız.', [['Yanında', 'Közleme · lavaş'], ['Acı', 'Siz seçersiniz']]],
  ['ocak', 'kor-sis', 'Kuzu şiş, tavuk şiş, kanat, pirzola. Sütte dinlenmiş.', [['Dinlenme', '1 gün'], ['Pişme', 'Siz söyleyin']]],
  ['sofra', 'meze-masa', 'Haydari, ezme, patlıcan, humus; her sabah yeniden.', [['Çeşit', 'Günde 12'], ['Yapılış', 'Sabah']]],
  ['sofra', 'firin', 'Taş fırında ince hamur; kebap gelene kadar ara sıcak.', [['Fırın', 'Taş fırın'], ['Hamur', 'Günlük']]],
  ['hizmet', 'servis', 'Lavaş ayrı, közleme ayrı; eve ıslanmadan varır.', [['Sipariş', 'WhatsApp · telefon'], ['Paket', 'Ayrı kaplarda']]],
  ['hizmet', 'sofra', 'Arka salonda 40 kişiye kadar uzun masa, sabit menü.', [['Kapasite', '40 kişi'], ['Hesap', 'Tek adisyon']]],
  ['hizmet', 'meze-bakir', 'Nişan, doğum günü, askerden gelen; saat ve menü önceden.', [['Önceden', '3-5 gün'], ['Düzen', 'Birlikte belirlenir']]],
  ['hizmet', 'salon', 'Kişi sayısını ve saati yazın, masanızı ayıralım.', [['Kanal', 'WhatsApp · telefon'], ['Hafta sonu', 'Erken dolar']]],
];
const masaIkon = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="7" width="12" height="10" rx="2"/><path d="M9 3.5h6M9 20.5h6M2.5 10v4M21.5 10v4"/></svg>`;
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => {
  const [grup, foto, kisa, detay] = EK[i] || ['hizmet', 'salon', '', []];
  return { ...h, grup, gorsel: g(foto), kisa, detay, etiket: grup === 'hizmet' ? 'Ne zaman' : 'Masaya gelişi' };
});
veri.kurumsal.hakkimizda.gorsel = g('salon');

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-restoran/ocak.jpg`,
    heroAlt: 'Uzun ocakbaşında şişleri çeviren ustalar',
    logoAlt: 'Ocakbaşı · Kebap · Meze',
    baslikEki: 'Ocakbaşı ve kebap | Etimesgut, Ankara',
    teklifEtiketi: 'Masa ayırtın',
    hizmetEtiketi: 'Menü',
    metinBoyutu: true,
    altNot: 'Güncel fiyatlar için arayın; grup menülerinde fiyatı rezervasyon onaylanmadan söyleriz.',
    css: {
      zemin: '#f2f4f5', yuzey: '#e2e8ec', metin: '#112244', soluk: '#4a5874', cizgi: 'rgb(17 34 68 / .14)',
      vurgu: '#d8361f', 'vurgu-metin': '#ffffff', koyu: '#112244', 'koyu-metin': '#f2f4f5', 'koyu-soluk': '#9fb0cc',
      gecis: '#112244',
      'font-baslik': "'Anton', 'Impact', sans-serif", 'font-govde': "'Be Vietnam Pro', system-ui, sans-serif",
      'baslik-agirlik': '400', 'baslik-harf': '0.005em', 'baslik-satir': '0.98',
      radius: '10px', 'radius-buyuk': '18px',
      h1: 'clamp(46px, 7.4vw, 124px)', h2: 'clamp(36px, 5vw, 72px)', h3: 'clamp(22px, 2.1vw, 28px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['kemerHero', 'menuPano', 'rakamlar', 'masaKur', 'sis', 'yorumlar', 'ocakSaati', 'cta'] },
    { id: 'ocagimiz', baslik: 'Ocağımız', bolumler: ['hakkimizda', 'surec', 'vizyon', 'kalite', 'galeri', 'cta'] },
    { id: 'menu', baslik: 'Menü', bolumler: ['hizmetler', 'sis', 'sss', 'cta'] },
    { id: 'rezervasyon', baslik: 'Rezervasyon', menu: 'Rezervasyon & Grup', bolumler: ['masaKur', 'anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { kemerHero, menuPano, masaKur, ocakSaati, sis, hizmetler },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, `Merhaba ${d.isletme.ad}, paket sipariş vermek istiyorum.`), ikon: icons.whatsapp, etiket: 'Sipariş', dis: true },
    { href: '#/rezervasyon', ikon: masaIkon, etiket: 'Masa', rota: 'rezervasyon' },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    servesCuisine: 'Türk mutfağı, kebap, ızgara',
    acceptsReservations: true,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
    ...(d.puan && { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet } }),
  }),
});
