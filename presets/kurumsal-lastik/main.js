import '../../shared/base.css';
import ana from '../../data/pist.json';
import ek from '../../data/kurumsal-lastik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { ebatOkuyucu, tekerKatman } from './extra.js';
import './style.css';

const B = import.meta.env.BASE_URL;
// Petrol: filo lastik merkezi. Soğuk kırık beyaz zemin, petrol mavisi-yeşili vurgu, koyu petrol yüzeyler;
// geniş (wdth 122) Archivo başlıklar, künye + geniş fotoğraf bandı. Sektör modülleri: ebat okuyucu, teker katmanları.
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-lastik/hero-lift.jpg`,
    heroAlt: 'Lifte kaldırılmış aracın yanında usta, sökülen tekeri taşıyor',
    logoAlt: 'Lastik, jant ve rot-balans',
    baslikEki: 'Lastik, jant ve rot-balans | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D teker çizimi temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#f2f5f5', yuzey: '#e1e9ea', metin: '#0c1a1d', soluk: '#4a5b5f', cizgi: 'rgb(12 26 29 / .15)',
      vurgu: '#0d6574', 'vurgu-metin': '#ffffff', koyu: '#0a1e23', 'koyu-metin': '#e8f0f0', 'koyu-soluk': '#9db1b4',
      gecis: 'repeating-linear-gradient(90deg, #0d6574 0 58px, #0b5a67 58px 60px, #0d6574 60px 118px, #0a1e23 118px 120px)',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Archivo', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '122%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.95', radius: '6px', 'radius-buyuk': '6px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'tekerKatman', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'galeri', 'kariyer', 'cta'] },
    { id: 'ebat-rehberi', baslik: 'Ebat Rehberi', bolumler: ['ebatOkuyucu', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo', menu: 'Filo ve Lastik Oteli', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { ebatOkuyucu, tekerKatman },
});
