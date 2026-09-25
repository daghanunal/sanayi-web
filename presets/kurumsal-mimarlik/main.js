import '../../shared/base.css';
import ana from '../../data/sektor-mimarlik.json';
import ek from '../../data/kurumsal-mimarlik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, icons } from '../../shared/core.js';
import { gunesHero, katKesit, imarHesap, ikonGonye, sifirla } from './extra.js';
import './style.css';

// "Gün Işığı" yönü: mimarlık ofisi güneşle, ışıkla ve kütleyle anlatılır. Adaçayı sıva zemin, orman yeşili
// koyu yüzeyler, öğle güneşi kehribarı vurgu. Syne başlık, Figtree gövde, JetBrains Mono okumalar.
// İmza: hero'da gün ışığı etüdü (saat kaydırıcısıyla oda ışığı değişir); hizmetler bir yapı kesiti; imar hesabı.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const yerel = (p) => p.replace('/img/sektor-mimarlik/', '/img/kurumsal-mimarlik/');

// Veri dosyasındaki hizmet sırasıyla: kısa metin, teslim edilenler.
const EK = [
  ['Müstakil ev, villa, apartman. Arsanın yönü ve eğimiyle kurulan plan.', [['Teslim', 'Avan proje + 3D'], ['Başlangıç', 'Yer ziyareti']]],
  ['Ofis, mağaza, depo. Otopark ve yangın kaçışı ilk eskizde.', [['Teslim', 'Avan + yönetmelik kontrolü'], ['Başlangıç', 'İmar durumu']]],
  ['Belediyeye giden dosya; düzeltme notlarını biz işleriz.', [['Teslim', 'Mimari proje + vaziyet'], ['Takip', 'Onaya kadar']]],
  ['Şantiyenin okuyacağı ölçülü plan, kesit ve detay.', [['Teslim', 'Plan · kesit · detay'], ['Koordinasyon', 'Statik ve tesisat']]],
  ['Mutfak, banyo, dolap, aydınlatma; malzeme tek dosyada.', [['Teslim', 'Çizim + malzeme listesi'], ['Ölçü', 'Yerinde alınır']]],
  ['Rölöve, restitüsyon, restorasyon; kurul dosyası.', [['Teslim', 'Rölöve + proje'], ['Süreç', 'Koruma kurulu']]],
  ['Gün ışığı ve akşam render, iç mekân görseli, maket.', [['Teslim', 'Render + isteğe maket'], ['Revizyon', 'Onaya kadar']]],
  ['Duvar kaldırma, mutfak açma, çatı katı, balkon.', [['Teslim', 'Rölöve + tadilat projesi'], ['Başvuru', 'Belediye']]],
];

const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => {
  const [kisa, detay] = EK[i] || ['', []];
  return { ...h, kisa, detay, gorsel: yerel(h.gorsel), etiket: 'Süre' };
});
veri.galeri = ana.galeri.map((x) => ({ ...x, src: yerel(x.src) }));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: 'Etimesgut',
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-mimarlik/ic-mekan.jpg`,
    heroAlt: 'Tül perdeli yüksek pencereden ışık alan, beyaz koltuklu yüksek tavanlı salon',
    logoAlt: 'Mimarlık · İç mimarlık',
    baslikEki: 'Mimarlık ofisi | Etimesgut, Ankara',
    teklifEtiketi: 'Ön görüşme',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
    altNot: 'Proje ücretini yer ziyaretinden sonra, işe başlamadan yazılı olarak söyleriz.',
    css: {
      zemin: '#e3e7de', yuzey: '#d3dacc', metin: '#16201b', soluk: '#526058', cizgi: 'rgb(22 32 27 / .15)',
      vurgu: '#f2a30f', 'vurgu-metin': '#16201b', koyu: '#14221b', 'koyu-metin': '#e8ece3', 'koyu-soluk': '#95a69b',
      gecis: '#f2a30f',
      'font-baslik': "'Syne', 'Arial Black', sans-serif", 'font-govde': "'Figtree', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '100%', 'baslik-harf': '-0.03em', 'baslik-satir': '0.98',
      radius: '999px', 'radius-buyuk': '22px',
      h1: 'clamp(42px, 6.4vw, 108px)', h2: 'clamp(32px, 4.4vw, 64px)', h3: 'clamp(20px, 1.8vw, 25px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['sifirla', 'gunesHero', 'ozet', 'hizmetOzet', 'rakamlar', 'imarHesap', 'surec', 'yorumlar', 'markalar', 'cta'] },
    { id: 'ofis', baslik: 'Ofis', bolumler: ['sifirla', 'hakkimizda', 'vizyon', 'kalite', 'galeri', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['sifirla', 'hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'imar', baslik: 'İmar Hesabı', bolumler: ['sifirla', 'imarHesap', 'sss', 'cta'] },
    { id: 'projeler', baslik: 'Projeler', bolumler: ['sifirla', 'galeri', 'yorumlar', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['sifirla', 'iletisim'] },
  ],
  ekstralar: { sifirla, gunesHero, hizmetOzet: katKesit, imarHesap },
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
