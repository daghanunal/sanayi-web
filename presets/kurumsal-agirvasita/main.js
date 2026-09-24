import '../../shared/base.css';
import ana from '../../data/tonaj.json';
import ek from '../../data/kurumsal-agirvasita.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { filoSozlesme } from './extra.js';
import './style.css';

// Ana veriyi motorun şemasına uydur: "kurulus" değerli istatistik kuruluştan hesaplansın,
// hizmetlere kurumsal ekler (görsel, detay) başlığa göre eklensin.
const v = derinBirlestir(ana, ek);
v.istatistikler = v.istatistikler.map((s) => (s.deger === 'kurulus' ? { ...s, deger: 0, kurulustanHesapla: true } : s));
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/tonaj/kaput.jpg`,
    heroAlt: 'Ustamız iş lambasıyla kamyonun kaputu altında çalışıyor',
    logoAlt: 'Ağır vasıta ve filo servisi',
    baslikEki: 'Ağır vasıta ve filo servisi | Şaşmaz, Ankara',
    teklifEtiketi: 'Sözleşme teklifi',
    css: {
      zemin: '#121416', yuzey: '#1c1f22', metin: '#eeece6', soluk: '#a2a7ad', cizgi: 'rgb(238 236 230 / .13)',
      vurgu: '#f5b700', 'vurgu-metin': '#121416', koyu: '#0a0b0c', 'koyu-metin': '#eeece6', 'koyu-soluk': '#90969c',
      gecis: '#0a0b0c',
      'font-baslik': "'Big Shoulders Display', 'Arial Narrow', sans-serif", 'font-govde': "'Barlow', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-harf': '0.005em', 'baslik-satir': '0.9', radius: '0px', 'radius-buyuk': '0px',
      h1: 'clamp(52px, 8vw, 128px)', h2: 'clamp(40px, 5.4vw, 80px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'rakamlar', 'hizmetOzet', 'filoSozlesme', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'markalar', 'cta'] },
    { id: 'filo', baslik: 'Filo Sözleşmesi', menu: 'Filo Sözleşmesi', bolumler: ['filoSozlesme', 'anlasmalar', 'cta'] },
    { id: 'sss', baslik: 'Sorular', bolumler: ['sss', 'yorumlar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { filoSozlesme },
});
