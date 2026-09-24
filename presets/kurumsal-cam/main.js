import '../../shared/base.css';
import ana from '../../data/kristal.json';
import ek from '../../data/kurumsal-cam.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { hasarBasvuru } from './extra.js';
import './style.css';

// Hizmetlere kurumsal ekler (kısa metin, görsel, detay) başlığa göre eklenir.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'tam',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kristal/damla.jpg`,
    heroAlt: 'Yağmur damlaları ve ön camdan görünen trafik ışıkları',
    logoAlt: 'Oto cam, kasko ve kalibrasyon',
    baslikEki: 'Oto cam ve kasko | Şaşmaz, Ankara',
    teklifEtiketi: 'Kasko başvurusu',
    css: {
      zemin: '#f1f5f6', yuzey: '#e1eaee', metin: '#0a1b23', soluk: '#4a5f69', cizgi: 'rgb(10 27 35 / .13)',
      vurgu: '#0b6e99', 'vurgu-metin': '#ffffff', koyu: '#07212c', 'koyu-metin': '#e6f1f5', 'koyu-soluk': '#8fabb7',
      gecis: '#bfe3f0',
      'font-baslik': "'Instrument Serif', Georgia, serif", 'font-govde': "'Instrument Sans', system-ui, sans-serif",
      'baslik-agirlik': '400', 'baslik-harf': '-0.012em', 'baslik-satir': '1',
      radius: '10px', 'radius-buyuk': '26px',
      h1: 'clamp(46px, 7vw, 112px)', h2: 'clamp(36px, 4.8vw, 68px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'hasarBasvuru', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'kasko', baslik: 'Kasko Başvurusu', menu: 'Kasko', bolumler: ['hasarBasvuru', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Kurumsal Müşteriler', menu: 'Kurumsal Müşteriler', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hasarBasvuru },
});
