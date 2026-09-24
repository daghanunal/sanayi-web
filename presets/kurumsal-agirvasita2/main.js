import '../../shared/base.css';
import ana from '../../data/tonaj.json';
import ek from '../../data/kurumsal-agirvasita2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { tabelaHero, yolYardim, olcumler } from './extra.js';
import './style.css';

// Otoyol: karayolu yön tabelası dili. Otoyol yeşili, reflektif beyaz, asfalt; Overpass (otoyol yazısı soyundan).
// Portal tabela hero'su, etkileşimli mesafe tabelası (yol yardım), yuvarlak levhalarda ölçüm.
const v = derinBirlestir(ana, ek);
v.istatistikler = v.istatistikler.map((s) => (s.deger === 'kurulus' ? { ...s, deger: 0, kurulustanHesapla: true } : s));
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
    heroAlt: 'Gece otoyolda far izleri',
    logoAlt: 'Ağır vasıta servisi · 7/24 yol yardım',
    baslikEki: 'Ağır vasıta servisi ve 7/24 yol yardım | Şaşmaz, Ankara',
    teklifEtiketi: 'Randevu isteyin',
    css: {
      zemin: '#eef1ee', yuzey: '#dfe6e1', metin: '#0c1a14', soluk: '#4b5a52', cizgi: 'rgb(12 26 20 / .14)',
      vurgu: '#00704a', 'vurgu-metin': '#ffffff', koyu: '#101614', 'koyu-metin': '#eef1ee', 'koyu-soluk': '#9aa7a0',
      gecis: 'linear-gradient(90deg, #00704a 0 46%, #fff 46% 46.6%, #00704a 46.6% 53.4%, #fff 53.4% 54%, #00704a 54%)',
      'font-baslik': "'Overpass', 'Arial Narrow', sans-serif", 'font-govde': "'Public Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-harf': '-0.02em', 'baslik-satir': '0.98', radius: '10px', 'radius-buyuk': '16px',
      h1: 'clamp(46px, 7vw, 112px)', h2: 'clamp(34px, 4.6vw, 68px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['tabelaHero', 'ozet', 'hizmetOzet', 'yolYardim', 'rakamlar', 'olcumler', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'olcumler', 'surec', 'markalar', 'cta'] },
    { id: 'yol-yardim', baslik: 'Yol Yardım', bolumler: ['yolYardim', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo', menu: 'Filo', bolumler: ['anlasmalar', 'surec', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { tabelaHero, yolYardim, olcumler },
});
