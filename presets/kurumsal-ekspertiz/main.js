import '../../shared/base.css';
import ana from '../../data/sektor-ekspertiz.json';
import ek from '../../data/kurumsal-ekspertiz.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';
import { gsap } from '../../shared/core.js';
import { hero, rontgen, randevu } from './extra.js';
import './style.css';

// "Askı etiketi" yönü: ekspertiz sonrası aynaya asılan sarı kontrol kartı.
// Lacivert gövde, etiket sarısı vurgu, bulgu kırmızısı ve temiz yeşili yalnızca işaretlerde.
// Başlıklar Sofia Sans Extra Condensed (büyük harf, afiş gibi), gövde Plus Jakarta Sans, kart satırları Fragment Mono.
const B = import.meta.env.BASE_URL;
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h) =>
  h.gorsel ? { ...h, gorsel: h.gorsel.replace('/img/sektor-ekspertiz/', `${B}img/kurumsal-ekspertiz/`) } : h
);

// Sayfa değişince eski sayfa sökülürken kaydırmayı başa al. Motor yeni sayfanın `once` tetikleyicilerini
// eski kaydırma konumunda kurunca ScrollTrigger kendi listesini gezerken tetikleyici siliyor ve
// "reading 'end'" hatası atıyordu. Temizlik her sayfada bulunan son bölüme (cta / iletisim) bağlanır.
const basaDon = (b) => ({
  ...b,
  mount(...a) {
    b.mount?.(...a);
    gsap.context(() => () => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true, force: true }) : scrollTo(0, 0)));
  },
});

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-ekspertiz/sasi-alt.jpg`,
    heroAlt: 'El feneriyle aracın alt şasisini inceleyen usta',
    logoAlt: 'Oto ekspertiz · Şaşmaz',
    baslikEki: 'Oto ekspertiz | Şaşmaz, Ankara',
    teklifEtiketi: 'Randevu alın',
    hizmetEtiketi: 'Ekspertiz',
    css: {
      zemin: '#efece4', yuzey: '#ffffff', metin: '#0d1a30', soluk: '#525c74', cizgi: 'rgb(13 26 48 / .15)',
      vurgu: '#ffbd12', 'vurgu-metin': '#0d1a30', koyu: '#0d1a30', 'koyu-metin': '#f2efe7', 'koyu-soluk': '#9ba7c1',
      gecis: 'linear-gradient(180deg, #0d1a30 0 84%, #ffbd12 84%)',
      'font-baslik': "'Sofia Sans Extra Condensed', 'Arial Narrow', system-ui, sans-serif",
      'font-govde': "'Plus Jakarta Sans', system-ui, sans-serif",
      'baslik-agirlik': '900', 'baslik-genislik': '100%', 'baslik-harf': '-0.005em', 'baslik-satir': '0.86',
      radius: '6px', 'radius-buyuk': '14px',
      h1: 'clamp(58px, 8.6vw, 138px)', h2: 'clamp(46px, 5.8vw, 88px)', h3: 'clamp(24px, 2.2vw, 30px)',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'rontgen', 'hizmetOzet', 'rakamlar', 'surec', 'yorumlar', 'randevu', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'rontgen', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Galeri ve Filo', bolumler: ['anlasmalar', 'cta'] }
    : s.id === 'referanslar' ? { ...s, bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, rontgen, randevu, cta: basaDon(BOLUMLER.cta), iletisim: basaDon(BOLUMLER.iletisim) },
});
