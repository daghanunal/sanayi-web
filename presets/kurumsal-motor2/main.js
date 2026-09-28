import '../../shared/base.css';
import ana from '../../data/garaj.json';
import ek from '../../data/kurumsal-motor2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { isEmri, mesai } from './extra.js';
import './style.css';

// "İş emri" yönü: kopya kâğıdı sarısı, karbon mavisi mürekkep, kaşe kırmızısı.
// Ana sayfada saatler "mesai kartı" modülünde (konum yerine); arıza kabul formu kendi sayfasında.
const B = import.meta.env.BASE_URL;
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'bolunmus',
    kunye: true,
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-motor2/kapak.jpg`,
    heroAlt: 'Eldivenli usta silindir kapağındaki supap mekanizması üzerinde çalışıyor',
    logoAlt: 'Motor, şanzıman ve mekanik',
    baslikEki: 'Motor ve mekanik onarım | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#f4ecc4', yuzey: '#f2d9d1', metin: '#1d2775', soluk: '#4b538f', cizgi: 'rgb(29 39 117 / .2)',
      vurgu: '#d42a2f', 'vurgu-metin': '#fff7e6', koyu: '#141a52', 'koyu-metin': '#f4ecc4', 'koyu-soluk': '#a9afd9',
      gecis: '#d42a2f',
      'font-baslik': "'Bricolage Grotesque', system-ui, sans-serif", 'font-govde': "'Onest', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '78%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.92',
      radius: '3px', 'radius-buyuk': '4px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'mesai', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'galeri', 'kariyer', 'cta'] },
    { id: 'ariza-kaydi', baslik: 'Arıza Kaydı', bolumler: ['isEmri', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Şirket Araçları', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { isEmri, mesai },
});
