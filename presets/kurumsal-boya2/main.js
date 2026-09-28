import '../../shared/base.css';
import ana from '../../data/showroom.json';
import ek from '../../data/kurumsal-boya2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { mikron } from './extra.js';
import './style.css';

// Hizmetlere kurumsal varyantın kısa metnini, görselini ve ayrıntılarını ekle.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal?.hizmetEk || {};
v.hizmetler = (v.hizmetler || []).map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-boya2/tabanca.jpg`,
    heroAlt: 'Mavi tulumlu usta, boya karışım rafının önünde boya tabancasını hazırlıyor',
    logoAlt: 'Boya · kaporta · ölçüm',
    baslikEki: 'Boya, kaporta ve boya ölçümü | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Ölçüm değerleri ve yorumlar örnektir.",
    css: {
      zemin: '#1b2bd0', yuzey: '#1624b4', metin: '#f3f4fb', soluk: '#c2c8ff', cizgi: 'rgb(243 244 251 / .22)',
      vurgu: '#a6f04a', 'vurgu-metin': '#080c3f', koyu: '#080c3f', 'koyu-metin': '#f3f4fb', 'koyu-soluk': '#9aa2e6',
      gecis: 'linear-gradient(180deg, #a6f04a 0 14%, #f3f4fb 14% 26%, #1b2bd0 26% 74%, #080c3f 74% 100%)',
      'font-baslik': "'Unbounded', 'Arial Black', sans-serif", 'font-govde': "'Albert Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.035em', 'baslik-satir': '1', radius: '2px', 'radius-buyuk': '4px',
      h1: 'clamp(40px, 7.4vw, 124px)', h2: 'clamp(30px, 4.4vw, 64px)', h3: 'clamp(19px, 1.8vw, 24px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'kariyer', 'cta'] },
    { id: 'olcum', baslik: 'Boya Ölçümü', bolumler: ['mikron', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Sigorta ve Şirket', menu: 'Sigorta ve Şirket Araçları', bolumler: ['anlasmalar', 'galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { mikron },
});

// Uzun işletme adı (?ad=...) telefonda başlığa sığsın: sınıf ekle, CSS küçültür.
requestAnimationFrame(() => {
  const ad = document.querySelector('.k-logo__ad')?.textContent.trim() || '';
  document.documentElement.classList.toggle('k-uzun-ad', ad.length > 24);
});
