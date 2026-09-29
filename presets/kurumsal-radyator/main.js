import '../../shared/base.css';
import ana from '../../data/sektor-radyator.json';
import ek from '../../data/kurumsal-radyator.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { petek, devre, vasita } from './extra.js';
import './style.css';

// "Bakır petek" yönü: çelik grisi zemin, kurşun-arduvaz paneller, bakır-pirinç radyatör bakırı vurgu.
// Sıcak/soğuk yalnızca ölçüm anlarında: hararet kırmızısı → bakır → soğuk su mavisi. Başlıklar Kanit, ölçüler Roboto Mono.
const S = (f) => `/img/sektor-radyator/${f}`;
const K = (f) => `/img/kurumsal-radyator/${f}`;
const GORSEL = [S('tezgah.jpg'), K('bakir-petek-3d.jpg'), S('kaynak.jpg'), S('kaput-alti.jpg'), K('eller-motor.jpg'), S('teshis.jpg'), S('motor-bolmesi.jpg'), S('tir-motor.jpg'), K('antifriz-dolum.jpg')];
const DETAY = [
  [['Test', 'Su havuzunda basınç'], ['Yöntem', 'Lehim · tank · conta']],
  [['Sonra', 'Hava alma, antifriz']],
  [['Yöntem', 'Kimyasal banyo'], ['Çürükse', 'Yeni petek örülür']],
  [['Ölçülen', 'Devreye giriş sıcaklığı'], ['Bakılan', 'Motor · röle · müşir']],
  [['Birlikte', 'Hortum ve kelepçeler']],
  [['Testler', 'Basınç · kapak · conta']],
  [['Sonra', 'Vakum ve gaz dolumu']],
  [['Ayrı ayrı', 'Petek · tank · intercooler']],
  [['Kış öncesi', 'Donma derecesi ölçülür']],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, gorsel: GORSEL[i], detay: DETAY[i] || [] }));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-radyator/radyator-on.jpg`,
    heroAlt: 'Aracın ön tarafında radyatör peteği',
    logoAlt: 'Radyatör ve soğutma sistemi',
    baslikEki: 'Radyatör ve soğutma sistemleri | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    altNot: "Pexels'ten alınan fotoğraflar ve 3D radyatör görseli temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#eef0f1', yuzey: '#e0e4e6', metin: '#15191c', soluk: '#525b61', cizgi: 'rgb(21 25 28 / .14)',
      vurgu: '#c4561a', 'vurgu-metin': '#ffffff', koyu: '#1b2429', 'koyu-metin': '#eef1f2', 'koyu-soluk': '#9aa6ad',
      gecis: 'linear-gradient(180deg, #d8361f 0 7%, #c4561a 7% 14%, #1b2429 14% 88%, #6db3d8 88%)',
      'font-baslik': "'Kanit', system-ui, sans-serif", 'font-govde': "'Be Vietnam Pro', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.012em', 'baslik-satir': '1.02',
      radius: '8px', 'radius-buyuk': '16px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['petek', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'hararet', baslik: 'Hararet haritası', menu: 'Hararet', bolumler: ['devre', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve ağır vasıta', menu: 'Filolar', bolumler: ['vasita', 'anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { petek, devre, vasita },
});
