import '../../shared/base.css';
import ana from '../../data/bakim.json';
import ek from '../../data/kurumsal-bakim.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { kabulHero, grupKartlari, hizmetGruplari, bakimHesap, randevuAdim } from './extra.js';
import './style.css';

// Servis Merkezi: bayi servisi düzeninde çok sayfalı kurumsal site. Lacivert ve beyaz, amber durum işaretleri,
// Red Hat ailesi. Künyede "servis kabul" panosu; Hizmetler'de dört grubun kendi sayfası (?grup=…);
// Periyodik bakım sayfasında bakım kartı hesaplayıcısı; Randevu sayfasında iş → gün → saat adımları.
const B = import.meta.env.BASE_URL;
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'bolunmus',
    kunye: true,
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-bakim/hero.jpg`,
    heroAlt: 'Aydınlık serviste liftlerde bakımdaki araçlar',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Genel bakım ve onarım',
    baslikEki: 'Genel bakım ve onarım | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#f5f7fa', yuzey: '#e8edf3', metin: '#0b1a2b', soluk: '#4a5868', cizgi: 'rgb(11 26 43 / .12)',
      vurgu: '#0f4c81', 'vurgu-metin': '#ffffff', koyu: '#091c30', 'koyu-metin': '#e7eef6', 'koyu-soluk': '#9aabbf',
      gecis: 'linear-gradient(180deg, #f2a900 0 6px, #0f4c81 6px)',
      'font-baslik': "'Red Hat Display', system-ui, sans-serif", 'font-govde': "'Red Hat Text', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.025em', 'baslik-satir': '1.02', radius: '4px', 'radius-buyuk': '8px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['kabulHero', 'grupKartlari', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetGruplari', 'surec', 'cta'] },
    { id: 'periyodik-bakim', baslik: 'Periyodik bakım', menu: 'Periyodik Bakım', bolumler: ['bakimHesap', 'sss', 'cta'] },
    { id: 'randevu', baslik: 'Randevu', bolumler: ['randevuAdim'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { kabulHero, grupKartlari, hizmetGruplari, bakimHesap, randevuAdim },
});
