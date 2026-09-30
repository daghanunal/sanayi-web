import '../../shared/base.css';
import ana from '../../data/sektor-mimarlik.json';
import ek from '../../data/kurumsal-mimarlik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, icons } from '../../shared/core.js';
import { gunesHero, katKesit, imarHesap, ikonGonye } from './extra.js';
import './style.css';

// "Gün Işığı" yönü: mimarlık ofisi güneşle, ışıkla ve kütleyle anlatılır. Adaçayı sıva zemin, orman yeşili
// koyu yüzeyler, öğle güneşi kehribarı vurgu. Syne başlık, Figtree gövde, JetBrains Mono okumalar.
// Künyenin yanında gün ışığı etüdü (saat kaydırıcısıyla oda ışığı değişir); hizmet özeti bir yapı kesiti; imar ön hesabı.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const yerel = (p) => p.replace('/img/sektor-mimarlik/', '/img/kurumsal-mimarlik/');

// Hizmet sayfasındaki ayrıntılar (hizmet kimliğine göre).
const DETAY = {
  konut: [['Teslim', 'Avan proje ve 3D görsel'], ['Başlangıç', 'Yer ziyareti']],
  ticari: [['Teslim', 'Avan proje ve yönetmelik kontrolü'], ['Başlangıç', 'İmar durumu']],
  ic: [['Teslim', 'Çizimler ve malzeme listesi'], ['Ölçü', 'Yerinde alınır']],
  ruhsat: [['Teslim', 'Mimari proje ve vaziyet planı'], ['Takip', 'Onaya kadar']],
  uygulama: [['Teslim', 'Plan, kesit ve detaylar'], ['Koordinasyon', 'Statik ve tesisat']],
  takip: [['Ziyaret', 'Kaba inşaat ve ince işler'], ['Kontrol', 'Çizime uygunluk']],
  tadilat: [['Teslim', 'Rölöve ve tadilat projesi'], ['Başvuru', 'Belediye']],
  restorasyon: [['Teslim', 'Rölöve ve restorasyon projesi'], ['Süreç', 'Koruma kurulu']],
  gorsel: [['Teslim', 'Render, istenirse maket'], ['Değişiklik', 'Onaya kadar']],
};

const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h) => ({ ...h, detay: DETAY[h.id] || [], gorsel: yerel(h.gorsel), etiket: 'Süre' }));
veri.galeri = ana.galeri.map((x) => ({ ...x, src: yerel(x.src) }));
const waGenel = veri.waMesaj || 'Merhaba, proje için görüşme randevusu almak istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir ("aracım için"): ofisin metniyle değiştirilir.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href*="wa.me"]');
  if (a && a.href.includes('arac%C4%B1m')) a.href = waHref(veri, waGenel);
}, true);

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Etimesgut'ta",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-mimarlik/ic-mekan.jpg`,
    heroAlt: 'Tül perdeli yüksek pencereden ışık alan, beyaz koltuklu yüksek tavanlı salon',
    logoAlt: 'Mimarlık ofisi',
    baslikEki: 'Mimarlık ofisi | Etimesgut, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
    altNot: 'Proje görselleri ve fotoğraflar temsilîdir (Pexels). Yorumlar örnektir.',
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
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['gunesHero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'cta'] },
    { id: 'imar', baslik: 'İmar ön hesabı', menu: 'İmar hesabı', bolumler: ['imarHesap', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { gunesHero, hizmetOzet: katKesit, imarHesap },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, waGenel), ikon: icons.whatsapp, etiket: 'WhatsApp', dis: true },
    { href: '#/imar', ikon: ikonGonye, etiket: 'İmar', rota: 'imar' },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    additionalType: 'https://schema.org/Architect',
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
