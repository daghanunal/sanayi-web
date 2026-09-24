import '../../shared/base.css';
import ana from '../../data/sektor-sanziman.json';
import ek from '../../data/kurumsal-sanziman.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { hero, kayit, tipler, atolye } from './extra.js';
import './style.css';

// "Gösterge kehribarı" yönü: eski vites göstergelerinin kehribar ışığı, patlıcan-siyahı paneller, gösterge ekranının nokta vuruşlu harfleri.
// Başlıklar Geologica (ağır), gövde Figtree, ölçü etiketleri Martian Mono, vites göstergesi Doto.
const B = import.meta.env.BASE_URL;
const hizmetGorsel = ['tamir', 'dsg-kol', 'dislilar', 'yag', 'mekatronik', 'teshis', 'kesit', 'usta-tablet'];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h, i) => (hizmetGorsel[i] ? { ...h, gorsel: `${B}img/kurumsal-sanziman/${hizmetGorsel[i]}.jpg` } : h));

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-sanziman/kesit.jpg`,
    heroAlt: 'Kesiti açılmış otomatik şanzıman',
    logoAlt: 'Otomatik · DSG · CVT',
    baslikEki: 'Otomatik şanzıman, DSG ve CVT tamiri | Şaşmaz, Ankara',
    teklifEtiketi: 'Şanzımanımı baktırayım',
    hizmetEtiketi: 'Şanzıman işleri',
    css: {
      zemin: '#f2eff3', yuzey: '#e6e0e8', metin: '#1c0a18', soluk: '#5d4f5b', cizgi: 'rgb(28 10 24 / .14)',
      vurgu: '#ff9a1f', 'vurgu-metin': '#1c0a18', koyu: '#1c0a18', 'koyu-metin': '#f4eef3', 'koyu-soluk': '#b3a1b0',
      gecis: 'linear-gradient(180deg, #1c0a18 0 70%, #ff9a1f 70% 86%, #ffd490 86%)',
      'font-baslik': "'Geologica', system-ui, sans-serif", 'font-govde': "'Figtree', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.98',
      radius: '6px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'kayit', 'tipler', 'hizmetOzet', 'rakamlar', 'surec', 'yorumlar', 'atolye', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['kayit', 'hizmetler', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Servis ve Filo', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, kayit, tipler, atolye },
});
