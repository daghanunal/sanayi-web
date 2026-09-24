import '../../shared/base.css';
import ana from '../../data/sektor-radyator.json';
import ek from '../../data/kurumsal-radyator.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { petek, devre, vasita, atolye } from './extra.js';
import './style.css';

// "Bakır petek" yönü: çelik grisi zemin, kurşun-arduvaz paneller, bakır-pirinç radyatör bakırı vurgu.
// Sıcak/soğuk yalnızca ölçüm anlarında: hararet kırmızısı → bakır → soğuk su mavisi. Başlıklar Kanit, ölçüler Roboto Mono.
const S = (f) => `/img/sektor-radyator/${f}`;
const K = (f) => `/img/kurumsal-radyator/${f}`;
const GORSEL = [S('tezgah.jpg'), K('radyator-on.jpg'), S('kaynak.jpg'), S('kaput-alti.jpg'), K('eller-motor.jpg'), S('teshis.jpg'), S('motor-bolmesi.jpg'), S('tir-motor.jpg'), K('antifriz-dolum.jpg')];
const KISA = [
  'Delik, çatlak, sızıntı; lehim ya da tank ve conta.',
  'Kurtarmayan radyatöre uygun yenisi, havası alınarak.',
  'Kireç ve tortuya kimyasal banyo; gerekirse yeni petek.',
  'Fan motoru, röle ve müşir; devreye giriş ölçülür.',
  'Açılmayan termostat, su kaçıran devirdaim pompası.',
  'Basınç ve kapak testi; sebep belli olmadan parça yok.',
  'Taş yemiş kondenser; vakum ve gaz dolumuyla.',
  'Kamyon, çekici, otobüs, iş makinesi; intercooler.',
  'Yıkama, doğru oranda antifriz, donma ölçümü.',
];
const DETAY = [
  [['Test', 'Su havuzunda basınç'], ['Yöntem', 'Lehim · tank · conta']],
  [['Sonra', 'Hava alma, antifriz'], ['Önce', 'Neden değiştiği gösterilir']],
  [['Yöntem', 'Kimyasal banyo'], ['Çürükse', 'Yeni petek örülür']],
  [['Ölçülen', 'Devreye giriş sıcaklığı'], ['Bakılan', 'Motor · röle · müşir']],
  [['Birlikte', 'Hortum ve kelepçeler']],
  [['Testler', 'Basınç · kapak · conta']],
  [['Sonra', 'Vakum ve gaz dolumu']],
  [['Ayrı ayrı', 'Petek · tank · intercooler']],
  [['Kış öncesi', 'Donma derecesi ölçülür']],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, kisa: KISA[i], gorsel: GORSEL[i], detay: DETAY[i] || [] }));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-radyator/radyator-on.jpg`,
    heroAlt: 'Aracın ön tarafında radyatör peteği',
    logoAlt: 'Radyatör · Petek · Soğutma',
    baslikEki: 'Radyatör ve soğutma sistemleri | Şaşmaz, Ankara',
    teklifEtiketi: 'Arızayı yazın',
    hizmetEtiketi: 'Soğutmada yaptığımız işler',
    metinBoyutu: true,
    css: {
      zemin: '#eef0f1', yuzey: '#e0e4e6', metin: '#15191c', soluk: '#525b61', cizgi: 'rgb(21 25 28 / .14)',
      vurgu: '#c4561a', 'vurgu-metin': '#ffffff', koyu: '#1b2429', 'koyu-metin': '#eef1f2', 'koyu-soluk': '#9aa6ad',
      gecis: 'linear-gradient(180deg, #d8361f 0 7%, #c4561a 7% 14%, #1b2429 14% 88%, #6db3d8 88%)',
      'font-baslik': "'Kanit', system-ui, sans-serif", 'font-govde': "'Be Vietnam Pro', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.012em', 'baslik-satir': '1.02',
      radius: '8px', 'radius-buyuk': '16px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['petek', 'hizmetOzet', 'rakamlar', 'devre', 'vasita', 'surec', 'yorumlar', 'atolye', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'devre', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Ağır Vasıta', menu: 'Filo ve Ağır Vasıta', bolumler: ['vasita', 'anlasmalar', 'cta'] }
    : s.id === 'iletisim' ? { ...s, bolumler: ['iletisim'] }
    : s
  ),
  ekstralar: { petek, devre, vasita, atolye },
});
