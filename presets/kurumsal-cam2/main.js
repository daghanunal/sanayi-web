import '../../shared/base.css';
import ana from '../../data/kristal.json';
import ek from '../../data/kurumsal-cam2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { camKodu } from './extra.js';
import './style.css';

// "Polarize" yönü: soğuk lavanta-gri zemin, gece indigosu mürekkep, elektrik moru vurgu ve polarize ışıkta
// lamine camın gerilim deseni gibi yanardöner halkalar. Geniş, kalın Mona Sans; kodlar Reddit Mono.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kristal/yapistirma.jpg`,
    heroAlt: 'Yeni ön camın kenarına yapıştırıcı çekiliyor',
    logoAlt: 'Oto cam, taş izi ve kalibrasyon',
    baslikEki: 'Oto cam, taş izi ve kalibrasyon | Şaşmaz, Ankara',
    altNot: 'Fotoğraflar temsilîdir (Pexels). Yorumlar örnektir.',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#eceef5', yuzey: '#dfe2ee', metin: '#0f1030', soluk: '#555a7c', cizgi: 'rgb(15 16 48 / .14)',
      vurgu: '#5b36f2', 'vurgu-metin': '#ffffff', koyu: '#0f1030', 'koyu-metin': '#eceef5', 'koyu-soluk': '#a0a5cc',
      gecis: '#0f1030',
      'font-baslik': "'Mona Sans', system-ui, sans-serif", 'font-govde': "'Mona Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '118%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.94',
      radius: '2px', 'radius-buyuk': '4px',
      h1: 'clamp(42px, 7.6vw, 128px)', h2: 'clamp(32px, 4.6vw, 66px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'cam-kodu', baslik: 'Cam Kodu', bolumler: ['camKodu', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve Kurumsal', menu: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { camKodu },
});
