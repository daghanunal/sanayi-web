import '../../shared/base.css';
import ana from '../../data/devre.json';
import ek from '../../data/kurumsal-elektrik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { arizaKodu, akuTesti } from './extra.js';
import './style.css';

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'bolunmus',
    kunye: true,
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-elektrik/hero.jpg`,
    heroAlt: 'Mavi tulumlu usta elinde arıza tespit tabletiyle kaputu açık aracın motoruna bakıyor',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D akü çizimi temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Oto elektrik ve arıza tespiti',
    baslikEki: 'Oto elektrik ve arıza tespiti | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#f5f7fa', yuzey: '#e7ecf3', metin: '#0b1628', soluk: '#4b586d', cizgi: 'rgb(11 22 40 / .13)',
      vurgu: '#2449ff', 'vurgu-metin': '#ffffff', koyu: '#0a1430', 'koyu-metin': '#e9eef8', 'koyu-soluk': '#95a3c3',
      gecis: 'linear-gradient(180deg, #5ce1ff 0 8px, #2449ff 8px 40px, #0a1430 40px)',
      'font-baslik': "'Space Grotesk', system-ui, sans-serif", 'font-govde': "'Public Sans', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.035em', 'baslik-satir': '1', radius: '10px', 'radius-buyuk': '18px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'akuTesti', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'markalar', 'kariyer', 'cta'] },
    { id: 'ariza-kodu', baslik: 'Arıza Kodu', bolumler: ['arizaKodu', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo', menu: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { arizaKodu, akuTesti },
});
