import '../../shared/base.css';
import ana from '../../data/bakim.json';
import ek from '../../data/kurumsal-bakim2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { planHero, filoBant, filoPlani, aracKaydi } from './extra.js';
import './style.css';

// Bakım Planı: kurumsal aile, filo ve şirket araçları odağı. Planlama çizelgesi dili: beyaz kâğıt üstünde ince
// ızgara, orman yeşili, Geist ve Geist Mono. Künyede dev ad ve çizelge satırı gibi künye; Filo planı sayfasında
// 12 aylık bakım takvimi; Araç kaydı sayfasında kayıt düzeni ve plakayla kayıt isteği.
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'yazi',
    kunye: true,
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-bakim2/filo.jpg`,
    heroAlt: 'Park alanında iki beyaz hafif ticari araç',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Filo ve şirket araçları',
    baslikEki: 'Genel bakım, filo ve şirket araçları | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    css: {
      zemin: '#fbfbf8', yuzey: '#eef2ea', metin: '#14201a', soluk: '#55635a', cizgi: 'rgb(20 32 26 / .13)',
      vurgu: '#3a7d44', 'vurgu-metin': '#ffffff', koyu: '#12241a', 'koyu-metin': '#e9f0ea', 'koyu-soluk': '#9fb3a5',
      gecis: 'repeating-linear-gradient(90deg, #3a7d44 0 calc(100% / 12 - 2px), #2d6536 calc(100% / 12 - 2px) calc(100% / 12))',
      'font-baslik': "'Geist', system-ui, sans-serif", 'font-govde': "'Geist', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.04em', 'baslik-satir': '0.98', radius: '2px', 'radius-buyuk': '6px',
      h1: 'clamp(44px, 8.4vw, 132px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['planHero', 'filoBant', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'filo-plani', baslik: 'Filo bakım planı', menu: 'Filo Planı', bolumler: ['filoPlani', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Kurumsal müşteriler', menu: 'Kurumsal', bolumler: ['anlasmalar', 'sss', 'cta'] },
    { id: 'arac-kaydi', baslik: 'Araç kaydı', menu: 'Araç Kaydı', bolumler: ['aracKaydi', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { planHero, filoBant, filoPlani, aracKaydi },
});
