import '../../shared/base.css';
import ana from '../../data/showroom.json';
import ek from '../../data/kurumsal-boya.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { hasarDosyasi, sonKontrol } from './extra.js';
import './style.css';

const v = derinBirlestir(ana, ek);

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-boya/hero.jpg`,
    heroAlt: 'Karanlıkta parlayan siyah otomobilin çift farı ve cilalı kaputu',
    logoAlt: 'Boya, kaporta ve detaylı bakım',
    baslikEki: 'Boya, kaporta ve detaylı bakım | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#0d0e10', yuzey: '#17181b', metin: '#ecebe6', soluk: '#a09f9a', cizgi: 'rgb(236 235 230 / .13)',
      vurgu: '#d8c29a', 'vurgu-metin': '#141414', koyu: '#060607', 'koyu-metin': '#ecebe6', 'koyu-soluk': '#8f8e8a',
      gecis: 'linear-gradient(100deg, #0d0e10 0%, #26272b 38%, #efe2c6 50%, #26272b 62%, #0d0e10 100%)',
      'font-baslik': "'Instrument Serif', Georgia, serif", 'font-govde': "'Manrope', system-ui, sans-serif",
      'baslik-agirlik': '400', 'baslik-harf': '-0.01em', 'baslik-satir': '0.98', radius: '12px', 'radius-buyuk': '26px',
      h2: 'clamp(38px, 5vw, 72px)', h3: 'clamp(22px, 2.2vw, 30px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'sonKontrol', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'kariyer', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Hasar ve Sigorta', bolumler: ['hasarDosyasi', 'anlasmalar', 'sss', 'cta'] },
    { id: 'galeri', baslik: 'Galeri', bolumler: ['galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hasarDosyasi, sonKontrol },
});

// Uzun işletme adı (?ad=...) telefonda başlığa sığsın: sınıf ekle, CSS küçültür.
requestAnimationFrame(() => {
  const ad = document.querySelector('.k-logo__ad')?.textContent.trim() || '';
  document.documentElement.classList.toggle('k-uzun-ad', ad.length > 24);
});
