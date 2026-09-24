import '../../shared/base.css';
import ana from '../../data/showroom.json';
import ek from '../../data/kurumsal-boya2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { mikron } from './extra.js';
import './style.css';

// showroom.json'daki "kurulustan" istatistiğini motorun beklediği biçime çevir; hizmetlere kısa metin ekle.
const v = derinBirlestir(ana, ek);
v.istatistikler = (v.istatistikler || []).map((s) => (typeof s.deger === 'string' ? { ...s, deger: 0, kurulustanHesapla: true } : s));
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
    teklifEtiketi: 'Ölçüm randevusu',
    hizmetEtiketi: 'Hizmetler',
    css: {
      zemin: '#1b2bd0', yuzey: '#1624b4', metin: '#f3f4fb', soluk: '#c2c8ff', cizgi: 'rgb(243 244 251 / .22)',
      vurgu: '#ff6a2a', 'vurgu-metin': '#080c3f', koyu: '#080c3f', 'koyu-metin': '#f3f4fb', 'koyu-soluk': '#9aa2e6',
      gecis: 'linear-gradient(180deg, #ff6a2a 0 14%, #f3f4fb 14% 26%, #1b2bd0 26% 74%, #080c3f 74% 100%)',
      'font-baslik': "'Unbounded', 'Arial Black', sans-serif", 'font-govde': "'Albert Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.035em', 'baslik-satir': '1', radius: '2px', 'radius-buyuk': '4px',
      h1: 'clamp(40px, 7.4vw, 124px)', h2: 'clamp(30px, 4.4vw, 64px)', h3: 'clamp(19px, 1.8vw, 24px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'mikron', 'hizmetOzet', 'rakamlar', 'yorumlar', 'anlasmaOzet', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'olcum', baslik: 'Boya Ölçümü', bolumler: ['mikron', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Sigorta ve Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'islerimiz', baslik: 'İşlerimiz', bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { mikron },
});
