import '../../shared/base.css';
import ana from '../../data/usta.json';
import ek from '../../data/kurumsal-doseme2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icMekan, pepita, mesai } from './extra.js';
import './style.css';

// "Pepita" yönü: safran zemin, patlıcan mürekkebi, ahududu vurgu; kaz ayağı deseni ve tırtıklı makas kenarları.
const v = derinBirlestir(ana, ek);

// ?kurulus= yalnızca isletme.kurulus'u değiştirir; tarihçeyi burada süzeriz:
// ilk kayıt kuruluş yılı olur, ondan önceki ya da aynı yıldaki kayıtlar düşer.
const pk = Number(new URLSearchParams(location.search).get('kurulus'));
const kurulus = pk || v.isletme.kurulus;
v.tarihce = v.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus)
  .map((t) => ({ ...t, yil: t.yil ?? 'Bugün' }));

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
    baslikEki: 'Oto döşeme: koltuk, tavan, kapı, direksiyon | Şaşmaz, Ankara',
    teklifEtiketi: 'Teklif isteyin',
    hizmetEtiketi: 'Hizmetler',
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
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'pepita', 'ozet', 'icMekan', 'hizmetOzet', 'rakamlar', 'yorumlar', 'mesai', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'tarihce', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'ic-mekan', baslik: 'Aracımı İşaretle', bolumler: ['icMekan', 'surec', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve Sigorta', bolumler: ['anlasmalar', 'cta'] },
    { id: 'referanslar', baslik: 'Referanslar', bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { icMekan, pepita, mesai },
});
