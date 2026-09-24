import '../../shared/base.css';
import ana from '../../data/garaj.json';
import ek from '../../data/kurumsal-motor.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { filoPlan } from './extra.js';
import './style.css';

kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/garaj/lift.jpg`,
    heroAlt: 'Lift üzerindeki aracın altında çalışan usta',
    logoAlt: 'Motor, şanzıman ve filo servisi',
    baslikEki: 'Motor ve filo servisi | Şaşmaz, Ankara',
    teklifEtiketi: 'Filo teklifi',
    css: {
      zemin: '#f1f0eb', yuzey: '#e4e3dc', metin: '#121614', soluk: '#555d59', cizgi: 'rgb(18 22 20 / .15)',
      vurgu: '#0f5a45', 'vurgu-metin': '#f3f0e4', koyu: '#0d1411', 'koyu-metin': '#e8e5da', 'koyu-soluk': '#93a09a',
      gecis: '#0f5a45',
      'font-baslik': "'IBM Plex Sans Condensed', system-ui, sans-serif", 'font-govde': "'IBM Plex Sans', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.015em', 'baslik-satir': '0.98', radius: '2px', 'radius-buyuk': '3px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'filoPlan', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'anlasmaOzet', 'filoPlan', 'yorumlar', 'cta'] }
    : s
  ),
  ekstralar: { filoPlan },
});
