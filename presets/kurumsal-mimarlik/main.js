import '../../shared/base.css';
import ana from '../../data/sektor-mimarlik.json';
import ek from '../../data/kurumsal-mimarlik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, icons } from '../../shared/core.js';
import { paftaHero, paftaListe, imarHesap, olcuBand, ikonGonye, sifirla } from './extra.js';
import './style.css';

// "Pafta" yönü: site bir proje dosyası gibi. Soğuk beton grisi zemin, grafit kalem, ultramarin çizgi,
// işaretleme kalemi sarısı. Geniş Archivo başlık, IBM Plex gövde, Plex Mono ölçü yazısı.
// Motifler: aks balonları, ölçü çizgisi, antet (proje künyesi), pafta numarası.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const g = (x) => `/img/kurumsal-mimarlik/${x}.jpg`;
const yerel = (p) => p.replace('/img/sektor-mimarlik/', '/img/kurumsal-mimarlik/');

// Veri dosyasındaki hizmet sırasıyla: pafta kodu, kısa metin, teslim edilenler.
const EK = [
  ['K-01', 'Müstakil ev, villa, apartman. Arsanın yönü ve eğimiyle kurulan plan.', [['Teslim', 'Avan proje + 3D'], ['Başlangıç', 'Yer ziyareti']]],
  ['T-02', 'Ofis, mağaza, depo. Otopark ve yangın kaçışı ilk eskizde.', [['Teslim', 'Avan + yönetmelik kontrolü'], ['Başlangıç', 'İmar durumu']]],
  ['R-03', 'Belediyeye giden dosya; düzeltme notlarını biz işleriz.', [['Teslim', 'Mimari proje + vaziyet'], ['Takip', 'Onaya kadar']]],
  ['U-04', 'Şantiyenin okuyacağı ölçülü plan, kesit ve detay.', [['Teslim', 'Plan · kesit · detay'], ['Koordinasyon', 'Statik ve tesisat']]],
  ['İ-05', 'Mutfak, banyo, dolap, aydınlatma; malzeme tek dosyada.', [['Teslim', 'Çizim + malzeme listesi'], ['Ölçü', 'Yerinde alınır']]],
  ['S-06', 'Rölöve, restitüsyon, restorasyon; kurul dosyası.', [['Teslim', 'Rölöve + proje'], ['Süreç', 'Koruma kurulu']]],
  ['G-07', 'Gün ışığı ve akşam render, iç mekân görseli, maket.', [['Teslim', 'Render + isteğe maket'], ['Revizyon', 'Onaya kadar']]],
  ['D-08', 'Duvar kaldırma, mutfak açma, çatı katı, balkon.', [['Teslim', 'Rölöve + tadilat projesi'], ['Başvuru', 'Belediye']]],
];

const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => {
  const [kod, kisa, detay] = EK[i] || ['X-00', '', []];
  return { ...h, kod, kisa, detay, gorsel: yerel(h.gorsel), etiket: 'Süre' };
});
veri.galeri = ana.galeri.map((x) => ({ ...x, src: yerel(x.src) }));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: 'Etimesgut',
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-mimarlik/villa.jpg`,
    heroAlt: 'Ahşap ve taş kaplamalı modern müstakil ev',
    logoAlt: 'Mimarlık · İç mimarlık',
    baslikEki: 'Mimarlık ofisi | Etimesgut, Ankara',
    teklifEtiketi: 'Ön görüşme',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
    altNot: 'Proje ücretini yer ziyaretinden sonra, işe başlamadan yazılı olarak söyleriz.',
    css: {
      zemin: '#e3e6e3', yuzey: '#d5dad6', metin: '#15191b', soluk: '#525a5d', cizgi: 'rgb(21 25 27 / .17)',
      vurgu: '#2f3cf5', 'vurgu-metin': '#ffffff', koyu: '#121618', 'koyu-metin': '#e3e6e3', 'koyu-soluk': '#8f999b',
      gecis: '#2f3cf5',
      'font-baslik': "'Archivo', 'Arial Black', sans-serif", 'font-govde': "'IBM Plex Sans', system-ui, sans-serif",
      'baslik-agirlik': '780', 'baslik-genislik': '118%', 'baslik-harf': '-0.025em', 'baslik-satir': '0.98',
      radius: '2px', 'radius-buyuk': '4px',
      h1: 'clamp(40px, 6.6vw, 112px)', h2: 'clamp(32px, 4.6vw, 66px)', h3: 'clamp(21px, 1.9vw, 26px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['sifirla', 'paftaHero', 'ozet', 'hizmetOzet', 'olcuBand', 'imarHesap', 'surec', 'yorumlar', 'markalar', 'cta'] },
    { id: 'ofis', baslik: 'Ofis', bolumler: ['sifirla', 'hakkimizda', 'vizyon', 'kalite', 'galeri', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['sifirla', 'hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'imar', baslik: 'İmar Hesabı', bolumler: ['sifirla', 'imarHesap', 'sss', 'cta'] },
    { id: 'projeler', baslik: 'Projeler', bolumler: ['sifirla', 'galeri', 'yorumlar', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['sifirla', 'iletisim'] },
  ],
  ekstralar: { sifirla, paftaHero, hizmetOzet: paftaListe, imarHesap, olcuBand },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, `Merhaba ${d.isletme.ad}, bir proje için ön görüşme yapmak istiyorum.`), ikon: icons.whatsapp, etiket: 'WhatsApp', dis: true },
    { href: '#/imar', ikon: ikonGonye, etiket: 'İmar', rota: 'imar' },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    additionalType: 'https://schema.org/Architect',
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
