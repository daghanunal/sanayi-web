import '../../shared/base.css';
import ana from '../../data/usta.json';
import ek from '../../data/kurumsal-doseme.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { filoKoltuk, katmanlar, ldVerisi } from './extra.js';
import './style.css';

const v = derinBirlestir(ana, ek);

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/usta/t-2003.jpg`,
    heroAlt: 'Yeniden döşenmiş deri servis aracı koltukları',
    logoAlt: 'Oto döşeme · filo koltuk yenileme',
    kunye: true,
    altNot: "Pexels'ten alınan fotoğraflar ve 3D koltuk çizimi temsilîdir. Yorumlar örnektir.",
    baslikEki: 'Oto döşeme ve filo koltuk yenileme | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#f3f0e9', yuzey: '#e6e2d7', metin: '#15202e', soluk: '#515c6b', cizgi: 'rgb(21 32 46 / .16)',
      vurgu: '#1e3354', 'vurgu-metin': '#f3f0e9', koyu: '#101b2c', 'koyu-metin': '#ece7db', 'koyu-soluk': '#a9b2be',
      gecis: '#1e3354',
      'font-baslik': "'Fraunces', Georgia, serif", 'font-govde': "'Figtree', system-ui, sans-serif",
      'baslik-agirlik': '500', 'baslik-harf': '-0.022em', 'baslik-satir': '1.0', radius: '999px', 'radius-buyuk': '26px',
      h2: 'clamp(32px, 4.4vw, 60px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'katmanlar', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve kurumsal araçlar', menu: 'Filo', bolumler: ['filoKoltuk', 'anlasmalar', 'sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { filoKoltuk, katmanlar },
  ld: ldVerisi,
});
