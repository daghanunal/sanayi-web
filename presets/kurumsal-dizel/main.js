import '../../shared/base.css';
import ana from '../../data/sektor-dizel.json';
import ek from '../../data/kurumsal-dizel.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { hero, tezgah, hizmetOzet, atolye } from './extra.js';
import './style.css';

// "Menzür" yönü: milimetrik ölçüm kâğıdı zemin, derin petrol paneller, dizel yakıtı kehribarı.
// Başlıklar dar Instrument Sans, bütün ölçü ve etiketler JetBrains Mono. İmza: enjektör test tezgâhının menzür tüpleri.
const B = import.meta.env.BASE_URL;
const hizmetGorsel = ['manometre', 'dijital-olcum', 'motor-ustu', 'parca-tepsisi', 'komparator', 'silindir-kapak', 'kamyon-bakim', 'eksantrik'];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h, i) => (hizmetGorsel[i] ? { ...h, gorsel: `${B}img/sektor-dizel/${hizmetGorsel[i]}.jpg` } : h));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-dizel/dizel-boru.jpg`,
    heroAlt: 'Karanlıkta boruların üstünde asılı paslı "Diesel" levhası',
    logoAlt: 'Enjektör · Pompa · Tezgâh',
    baslikEki: 'Dizel enjektör ve pompa | Şaşmaz, Ankara',
    teklifEtiketi: 'Enjektörümü ölçtüreyim',
    hizmetEtiketi: 'Tezgâhtaki işler',
    metinBoyutu: true,
    css: {
      zemin: '#e8edee', yuzey: '#f6f8f8', metin: '#0c1d22', soluk: '#4d5f64', cizgi: 'rgb(12 29 34 / .16)',
      vurgu: '#f0a202', 'vurgu-metin': '#0c1d22', koyu: '#0b2a2f', 'koyu-metin': '#e6f0ef', 'koyu-soluk': '#8fb0b0',
      gecis: 'repeating-linear-gradient(90deg, #0b2a2f 0 22px, #0e3339 22px 23px)',
      'font-baslik': "'Instrument Sans', 'Arial Narrow', sans-serif", 'font-govde': "'Instrument Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '78%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.96',
      radius: '4px', 'radius-buyuk': '8px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'tezgah', 'hizmetOzet', 'rakamlar', 'surec', 'yorumlar', 'atolye', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Servisler', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, tezgah, hizmetOzet, atolye },
});
