import '../../shared/base.css';
import ana from '../../data/sektor-sanziman.json';
import ek from '../../data/kurumsal-sanziman.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { hero, kayit, tipler } from './extra.js';
import './style.css';

// "Gösterge kehribarı" yönü: eski vites göstergelerinin kehribar ışığı, patlıcan-siyahı paneller, gösterge ekranının nokta vuruşlu harfleri.
// Başlıklar Geologica (ağır), gövde Figtree, ölçü etiketleri Martian Mono, gösterge rakamları Doto.
const B = import.meta.env.BASE_URL;
// Hizmet görselleri başlığa göre (veri sırası değişse de doğru görsel)
const GORSEL = [
  [/tespit/i, 'teshis'], [/revizyon/i, 'tamir'], [/dsg/i, 'dsg-kol'], [/cvt/i, 'dislilar'], [/manuel/i, 'vites-kolu'],
  [/mekatronik/i, 'mekatronik'], [/tork/i, 'kesit'], [/yağ/i, 'yag'], [/beyin/i, 'usta-tablet'],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h) => {
  const g = GORSEL.find(([re]) => re.test(h.baslik));
  return g ? { ...h, gorsel: `${B}img/kurumsal-sanziman/${g[1]}.jpg` } : h;
});

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-sanziman/kesit.jpg`,
    heroAlt: 'Kesiti açılmış otomatik şanzıman',
    logoAlt: 'Otomatik · DSG · CVT · Manuel',
    baslikEki: 'Otomatik, DSG, CVT ve manuel şanzıman tamiri | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#f2eff3', yuzey: '#e6e0e8', metin: '#1c0a18', soluk: '#5a4c58', cizgi: 'rgb(28 10 24 / .14)',
      vurgu: '#ff9a1f', 'vurgu-metin': '#1c0a18', koyu: '#1c0a18', 'koyu-metin': '#f4eef3', 'koyu-soluk': '#b8a6b5',
      gecis: 'linear-gradient(180deg, #1c0a18 0 70%, #ff9a1f 70% 86%, #ffd490 86%)',
      'font-baslik': "'Geologica', system-ui, sans-serif", 'font-govde': "'Figtree', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.98',
      radius: '6px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'tipler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'galeri', 'kariyer', 'cta'] },
    { id: 'sikayet', baslik: 'Şikâyete göre', menu: 'Şikâyetler', bolumler: ['kayit', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Servisler ve filolar', menu: 'Servis ve Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hero, kayit, tipler },
});
