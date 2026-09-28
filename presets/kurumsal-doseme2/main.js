import '../../shared/base.css';
import ana from '../../data/usta.json';
import ek from '../../data/kurumsal-doseme2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icMekan, pepita, mesai, ldVerisi } from './extra.js';
import './style.css';

// "Pepita" yönü: safran zemin, patlıcan mürekkebi, ahududu vurgu; kaz ayağı deseni ve tırtıklı makas kenarları.
// Ana sayfada künyenin altında pepita bandı (hizmet adları döner), saatler için kumaş etiketi (mesai).
const v = derinBirlestir(ana, ek);

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/usta/t-1987.jpg`,
    heroAlt: 'Dikey dikişli kahverengi deri koltuklarıyla klasik bir aracın iç mekânı',
    logoAlt: 'Oto döşeme atölyesi',
    kunye: true,
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    baslikEki: 'Oto döşeme: koltuk, tavan, kapı, direksiyon | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#f2b632', yuzey: '#f7cd5e', metin: '#2b0e2e', soluk: '#5e3a52', cizgi: 'rgb(43 14 46 / .22)',
      vurgu: '#c2185b', 'vurgu-metin': '#fff3d6', koyu: '#2b0e2e', 'koyu-metin': '#fbe3a6', 'koyu-soluk': '#c9a6b8',
      gecis: '#2b0e2e',
      'font-baslik': "'Darker Grotesque', 'Arial Narrow', sans-serif", 'font-govde': "'Wix Madefor Text', system-ui, sans-serif",
      'baslik-agirlik': '900', 'baslik-harf': '-0.012em', 'baslik-satir': '0.84', radius: '0px', 'radius-buyuk': '0px',
      h1: 'clamp(54px, 8.4vw, 136px)', h2: 'clamp(50px, 6.4vw, 108px)', h3: 'clamp(24px, 2.2vw, 30px)', govde: '17.5px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'pepita', 'hizmetOzet', 'ozet', 'rakamlar', 'mesai', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'ic-mekan', baslik: 'İç mekân haritası', menu: 'İç mekân', bolumler: ['icMekan', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo, galeri ve sigorta işleri', menu: 'Filo ve sigorta', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { icMekan, pepita, mesai },
  ld: ldVerisi,
});
