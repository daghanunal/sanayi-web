import '../../shared/base.css';
import ana from '../../data/garaj.json';
import ek from '../../data/kurumsal-motor2.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { isEmri, mesai, serit } from './extra.js';
import './style.css';

// "İş emri" yönü: kopya kâğıdı sarısı, karbon mavisi mürekkep, kaşe kırmızısı.
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/garaj/revizyon.jpg`,
    heroAlt: 'Revizyon sehpasındaki motorun başında çalışan usta',
    logoAlt: 'Motor · Mekanik · Şanzıman',
    baslikEki: 'Motor ve mekanik servis | Şaşmaz, Ankara',
    teklifEtiketi: 'İş emri açın',
    css: {
      zemin: '#f4ecc4', yuzey: '#f2d9d1', metin: '#1d2775', soluk: '#4b538f', cizgi: 'rgb(29 39 117 / .2)',
      vurgu: '#d42a2f', 'vurgu-metin': '#fff7e6', koyu: '#141a52', 'koyu-metin': '#f4ecc4', 'koyu-soluk': '#a9afd9',
      gecis: '#d42a2f',
      'font-baslik': "'Bricolage Grotesque', system-ui, sans-serif", 'font-govde': "'Onest', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '78%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.92',
      radius: '3px', 'radius-buyuk': '4px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'serit', 'isEmri', 'hizmetOzet', 'rakamlar', 'surec', 'yorumlar', 'mesai', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Şirket Araçları', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { isEmri, mesai, serit },
});
