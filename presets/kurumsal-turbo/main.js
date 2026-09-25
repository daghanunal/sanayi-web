import '../../shared/base.css';
import ana from '../../data/sektor-turbo.json';
import ek from '../../data/kurumsal-turbo.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { hero, karne, sebep, atolye } from './extra.js';
import './style.css';

// "Ölçü Karnesi" yönü: açık adaçayı kâğıt zemin, yarış yeşili paneller, pirinç (ölçü aleti) vurgusu.
// Başlıklar dik ve geniş (Anybody, genişlik ekseni), ölçüler Red Hat Mono, gövde Instrument Sans.
const B = import.meta.env.BASE_URL;
const hizmetGorsel = ['sokulmus-turbo', 'turbin-cark', 'turbo-yakin', 'krom-turbo', 'tezgah-turbo', 'dizel-motor', 'motor-turbo', 'usta-turbo'];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h, i) => (hizmetGorsel[i] ? { ...h, gorsel: `${B}img/kurumsal-turbo/${hizmetGorsel[i]}.jpg` } : h));

kurumsal({
  veri,
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-turbo/eller-turbo.jpg`,
    heroAlt: 'Tezgâh üzerindeki dizel turboyu kontrol eden eller',
    logoAlt: 'Turbo revizyon · Balans · VNT',
    baslikEki: 'Turbo revizyon ve tamiri | Şaşmaz, Ankara',
    teklifEtiketi: 'Turbomu ölçtüreyim',
    hizmetEtiketi: 'Turbo işleri',
    metinBoyutu: true,
    css: {
      zemin: '#e9eee6', yuzey: '#f7f9f4', metin: '#0f1d17', soluk: '#4c5c54', cizgi: 'rgb(15 29 23 / .16)',
      vurgu: '#0c7a50', 'vurgu-metin': '#ffffff', koyu: '#0f2a21', 'koyu-metin': '#e9f1ea', 'koyu-soluk': '#9fb8aa',
      gecis: '#0f2a21',
      'font-baslik': "'Anybody', system-ui, sans-serif", 'font-govde': "'Instrument Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '128%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.96',
      radius: '4px', 'radius-buyuk': '6px',
      h1: 'clamp(40px, 7vw, 116px)', h2: 'clamp(30px, 4.4vw, 60px)',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'karne', 'hizmetOzet', 'sebep', 'rakamlar', 'surec', 'yorumlar', 'atolye', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'karne', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Servisler', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, karne, sebep, atolye },
});
