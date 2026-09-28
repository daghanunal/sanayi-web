import '../../shared/base.css';
import ana from '../../data/sektor-lpg.json';
import ek from '../../data/kurumsal-lpg.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { giris, hat, uygunluk, galeri } from './extra.js';
import './style.css';

// "Tüp yeşili": şişe yeşili çift ton fotoğraflar, soluk adaçayı kâğıt zemin, taze yeşil sinyal rengi,
// logoda tek mavi alev. Künyede yeşil çift ton fotoğraf ve dönen pul; Hizmetler'de LPG sisteminin parçaları.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    kunye: true,
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-lpg/manometre.jpg`,
    heroAlt: 'Gaz hattındaki basınç göstergeleri',
    logoAlt: 'LPG dönüşüm ve bakım',
    baslikEki: 'LPG dönüşüm, bakım ve ayar | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    altNot: "Pexels'ten alınan fotoğraflar ve 3D parça görseli temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#e8eee8', yuzey: '#f6f9f5', metin: '#0b221c', soluk: '#4a625a', cizgi: 'rgb(11 34 28 / .16)',
      vurgu: '#1fd17a', 'vurgu-metin': '#062017', koyu: '#0b221c', 'koyu-metin': '#e4f2e8', 'koyu-soluk': '#8fb3a2',
      gecis: '#1fd17a',
      'font-baslik': "'Familjen Grotesk', system-ui, sans-serif", 'font-govde': "'Rethink Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.98',
      radius: '999px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['giris', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'hat', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'uygunluk', baslik: 'LPG uygunluğu', menu: 'Uygunluk', bolumler: ['uygunluk', 'cta'] },
    { id: 'filo', baslik: 'Taksi ve filo araçları', menu: 'Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { giris, hat, uygunluk, galeri },
});
