import '../../shared/base.css';
import ana from '../../data/devre.json';
import ek from '../../data/kurumsal-elektrik2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { farPerdesi, bugun } from './extra.js';
import './style.css';

// "Huzme" yönü: halojen sarısı zemin, patlıcan moru mürekkep, kısa farın 15 derecelik kesme çizgisi
// bütün sitenin kesit çizgisi. Funnel Display + Funnel Sans + Geist Mono.
const B = import.meta.env.BASE_URL;
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-elektrik2/gece-yol.jpg`,
    heroAlt: 'Gece otoyolda far ve stop lambalarının bıraktığı ışık izleri',
    logoAlt: 'Oto elektrik · Far · Akü · Beyin',
    baslikEki: 'Oto elektrik, far ve akü | Şaşmaz, Ankara',
    teklifEtiketi: 'Randevu isteyin',
    css: {
      zemin: '#ffd21a', yuzey: '#fff0a3', metin: '#1f0a26', soluk: '#553a4c', cizgi: 'rgb(31 10 38 / .2)',
      vurgu: '#1f0a26', 'vurgu-metin': '#ffd21a', koyu: '#1c0822', 'koyu-metin': '#fff3c4', 'koyu-soluk': '#c9aec6',
      gecis: 'linear-gradient(90deg, #1c0822 0 62%, #ffd21a 62% 68%, #fffbe6 68%)',
      'font-baslik': "'Funnel Display', system-ui, sans-serif", 'font-govde': "'Funnel Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-harf': '-0.018em', 'baslik-satir': '0.94',
      radius: '999px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'farPerdesi', 'rakamlar', 'ozet', 'surec', 'yorumlar', 'bugun', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'markalar', 'cta'] },
    { id: 'far-ayari', baslik: 'Far Ayarı', bolumler: ['farPerdesi', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo', menu: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { farPerdesi, bugun },
});
