import '../../shared/base.css';
import ana from '../../data/tonaj.json';
import ek from '../../data/kurumsal-agirvasita2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { tabelaHero, yolYardim } from './extra.js';
import './style.css';

// Otoyol: karayolu yön levhası dili. Devlet yolu mavisi, reflektif beyaz, asfalt; Public Sans.
// Künye gece yolunun üstünde asılı köprü levhasıdır; Yol yardım sayfasında mesafe levhasından hazır mesaj.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-agirvasita2/gece-yol.jpg`,
    heroAlt: 'Gece yolda far izleri',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Tır, kamyon ve otobüs servisi',
    baslikEki: 'Ağır vasıta servisi | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#eef1ee', yuzey: '#dfe6e1', metin: '#0c1a14', soluk: '#4b5a52', cizgi: 'rgb(12 26 20 / .14)',
      vurgu: '#1450a3', 'vurgu-metin': '#ffffff', koyu: '#101614', 'koyu-metin': '#eef1ee', 'koyu-soluk': '#9aa7a0',
      gecis: 'linear-gradient(90deg, #1450a3 0 46%, #fff 46% 46.6%, #1450a3 46.6% 53.4%, #fff 53.4% 54%, #1450a3 54%)',
      'font-baslik': "'Public Sans', 'Arial Narrow', sans-serif", 'font-govde': "'Public Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-harf': '-0.02em', 'baslik-satir': '1', radius: '10px', 'radius-buyuk': '16px',
      h1: 'clamp(44px, 6.4vw, 100px)', h2: 'clamp(34px, 4.6vw, 68px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['tabelaHero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'cta'] },
    { id: 'yol-yardim', baslik: 'Yol yardım', bolumler: ['yolYardim', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve kurumlar', menu: 'Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { tabelaHero, yolYardim },
});
