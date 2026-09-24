import '../../shared/base.css';
import ana from '../../data/manifold.json';
import ek from '../../data/kurumsal-egzoz.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { muayeneHazirlik } from './extra.js';
import './style.css';

// Ana veriyi motorun şemasına uydur: "kurulus" değerli istatistik kuruluştan hesaplansın,
// hizmetlere kurumsal ekler (kısa metin, görsel, detay) başlığa göre eklensin.
const v = derinBirlestir(ana, ek);
v.istatistikler = v.istatistikler.map((s) => (s.deger === 'kurulus' ? { ...s, deger: 0, kurulustanHesapla: true } : s));
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/manifold/cift-uc.jpg`,
    heroAlt: 'Paslanmaz çift egzoz ucu yakın plan',
    logoAlt: 'Egzoz, DPF ve emisyon',
    baslikEki: 'Egzoz, DPF ve emisyon | Şaşmaz, Ankara',
    teklifEtiketi: 'Ölçüm randevusu',
    css: {
      zemin: '#efebe6', yuzey: '#e3ddd5', metin: '#1a1512', soluk: '#5f554c', cizgi: 'rgb(26 21 18 / .14)',
      vurgu: '#b83d12', 'vurgu-metin': '#fff6ee', koyu: '#1a1411', 'koyu-metin': '#f1e8de', 'koyu-soluk': '#ab9b8c',
      gecis: '#b83d12',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Archivo', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '125%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.94',
      radius: '999px', 'radius-buyuk': '28px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'muayeneHazirlik', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'muayene', baslik: 'Muayene Hazırlığı', menu: 'Muayene', bolumler: ['muayeneHazirlik', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve Kurumsal', menu: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { muayeneHazirlik },
});
