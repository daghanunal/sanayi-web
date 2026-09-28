import '../../shared/base.css';
import ana from '../../data/sektor-klima.json';
import ek from '../../data/kurumsal-klima.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { termal, menfez, gaz } from './extra.js';
import './style.css';

// "Termal kamera" yönü: lavanta beyazı zemin, gece mürdümü, termal mor vurgu; termal renk skalası
// (mor → mavi → camgöbeği → sarı → turuncu) yalnızca çizgilerde ve ön kontrol sayfasında.
// Künye: menfez fotoğrafının üstünde sürüklenebilir termal katman.
const B = import.meta.env.BASE_URL;
const G = (f) => `/img/sektor-klima/${f}`;
const GORSEL = ['motor-kontrol.jpg', 'kaput-acik.jpg', 'motor-dikey.jpg', 'motor-bolmesi.jpg', 'konsol-sb.jpg', 'orta-konsol.jpg', 'klima-paneli.jpg', 'teshis.jpg'];
const DETAY = [
  [['Gaz', 'R134a, R1234yf'], ['Dolumdan önce', 'Vakum ve kaçak kontrolü']],
  [['Yöntem', 'Azot basıncı, UV boya']],
  [['Değişimde', 'Sistem yıkanır']],
  [['Birlikte', 'Kurutucu filtre yenilenir']],
  [['Seçenek', 'Aktif karbonlu filtre']],
  [['Uygulama', 'Köpük ya da buhar']],
  [['Cihaz', 'Arıza tespit cihazı']],
  [['Kontrol', 'Fan motoru, röle, sigorta']],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, gorsel: G(GORSEL[i % GORSEL.length]), detay: DETAY[i] || [] }));
veri.galeri = ana.galeri.filter((g) => /atolye|teshis|klima-paneli|lift|motor-kontrol|orta-konsol/.test(g.src));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    kunye: true,
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-klima/menfez.jpg`,
    heroAlt: 'Araç içindeki yuvarlak klima üfleme ağzı',
    logoAlt: 'Oto klima servisi',
    baslikEki: 'Oto klima servisi | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir; termal tonlar görsel efekttir, ölçüm değildir. Yorumlar örnektir.",
    css: {
      zemin: '#f1f1f6', yuzey: '#e4e3ee', metin: '#110f24', soluk: '#4f4c66', cizgi: 'rgb(17 15 36 / .14)',
      vurgu: '#5b3bd6', 'vurgu-metin': '#ffffff', koyu: '#0e0c26', 'koyu-metin': '#ecebf7', 'koyu-soluk': '#a19dc8',
      gecis: '#0e0c26',
      'font-baslik': "'Sora', system-ui, sans-serif", 'font-govde': "'Rubik', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.035em', 'baslik-satir': '1',
      radius: '12px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['termal', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'gaz', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'on-kontrol', baslik: 'Ön kontrol', bolumler: ['menfez', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve ticari araçlar', menu: 'Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { termal, menfez, gaz },
});
