import '../../shared/base.css';
import ana from '../../data/sektor-ekspertiz.json';
import ek from '../../data/kurumsal-ekspertiz.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { hero, boyaHaritasi, randevu } from './extra.js';
import './style.css';

// "Ölçüm föyü" yönü: lavanta-gri rapor kâğıdı, mürekkep moru paneller, "geçti" yeşili vurgu.
// Boya raporunun renk kodları (orijinal / lokal / boyalı / değişen) sitenin ikinci paleti.
// Başlıklar Host Grotesk, ölçü ve rapor satırları Azeret Mono.
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
    logoAlt: 'Boya · Şasi · OBD · Yol testi',
    baslikEki: 'Oto ekspertiz | Şaşmaz, Ankara',
    teklifEtiketi: 'Randevu alın',
    hizmetEtiketi: 'Ekspertiz',
    css: {
      zemin: '#eeedf3', yuzey: '#fbfbfe', metin: '#1a1530', soluk: '#595470', cizgi: 'rgb(26 21 48 / .14)',
      vurgu: '#17c28f', 'vurgu-metin': '#06261b', koyu: '#1d1636', 'koyu-metin': '#efedf7', 'koyu-soluk': '#aaa4c6',
      gecis: 'linear-gradient(180deg, #1d1636 0 70%, #17c28f 70% 78%, #ffc53d 78% 86%, #4d7cff 86% 93%, #ff5d4a 93%)',
      'font-baslik': "'Host Grotesk', system-ui, sans-serif", 'font-govde': "'Host Grotesk', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.96',
      radius: '12px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'boyaHaritasi', 'hizmetOzet', 'rakamlar', 'surec', 'yorumlar', 'randevu', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'boyaHaritasi', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Galeri ve Filo', bolumler: ['anlasmalar', 'cta'] }
    : s.id === 'referanslar' ? { ...s, bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, boyaHaritasi, randevu },
});
