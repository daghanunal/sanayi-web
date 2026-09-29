import '../../shared/base.css';
import ana from '../../data/sektor-ekspertiz.json';
import ek from '../../data/kurumsal-ekspertiz.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { etiketHero, rontgen } from './extra.js';
import './style.css';

// "Askı etiketi" yönü: ekspertiz sonrası aynaya asılan sarı kontrol kartı. Künye bu kartın üstünde.
// Lacivert gövde, etiket sarısı vurgu. Başlıklar Sofia Sans Extra Condensed (dar ve ağır), gövde Plus Jakarta Sans,
// kart satırları Fragment Mono. Hizmetler sayfasında tarama merceği (rontgen) kalır.
const B = import.meta.env.BASE_URL;
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h) =>
  h.gorsel ? { ...h, gorsel: h.gorsel.replace('/img/sektor-ekspertiz/', `${B}img/kurumsal-ekspertiz/`) } : h
);

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-ekspertiz/sasi-alt.jpg`,
    heroAlt: 'El feneriyle aracın alt şasisini inceleyen usta',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    logoAlt: 'İkinci el araç ekspertizi',
    baslikEki: 'Oto ekspertiz | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Ekspertiz',
    css: {
      zemin: '#efece4', yuzey: '#ffffff', metin: '#0d1a30', soluk: '#525c74', cizgi: 'rgb(13 26 48 / .15)',
      vurgu: '#ffbd12', 'vurgu-metin': '#0d1a30', koyu: '#0d1a30', 'koyu-metin': '#f2efe7', 'koyu-soluk': '#9ba7c1',
      gecis: 'linear-gradient(180deg, #0d1a30 0 84%, #ffbd12 84%)',
      'font-baslik': "'Sofia Sans Extra Condensed', 'Arial Narrow', system-ui, sans-serif",
      'font-govde': "'Plus Jakarta Sans', system-ui, sans-serif",
      'baslik-agirlik': '900', 'baslik-genislik': '100%', 'baslik-harf': '-0.005em', 'baslik-satir': '0.9',
      radius: '6px', 'radius-buyuk': '14px',
      h1: 'clamp(58px, 8.2vw, 132px)', h2: 'clamp(46px, 5.6vw, 84px)', h3: 'clamp(24px, 2.2vw, 30px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['etiketHero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'rontgen', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Galeri ve filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { etiketHero, rontgen },
});
