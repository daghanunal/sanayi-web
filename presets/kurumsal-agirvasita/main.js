import '../../shared/base.css';
import ana from '../../data/tonaj.json';
import ek from '../../data/kurumsal-agirvasita.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { filoSozlesme } from './extra.js';
import './style.css';

// Kurumsal Filo Servis: gece asfaltı zemin, ikaz sarısı, dar Big Shoulders başlıklar, pah kırılmış köşeler.
// Sektör modülü: filo bakım sözleşmesi hesabı (araç sayısı, tip, yıllık km, kullanım → yıllık bakım girişi) ve
// hazır WhatsApp mesajı. Hizmetlere başlığa göre görsel ve kısa detay eklenir.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/tonaj/kaput.jpg`,
    heroAlt: 'İş lambasıyla kamyon motoruna bakılıyor',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Ağır vasıta ve filo servisi',
    baslikEki: 'Ağır vasıta ve filo servisi | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#121416', yuzey: '#1c1f22', metin: '#eeece6', soluk: '#a2a7ad', cizgi: 'rgb(238 236 230 / .13)',
      vurgu: '#f5b700', 'vurgu-metin': '#121416', koyu: '#0a0b0c', 'koyu-metin': '#eeece6', 'koyu-soluk': '#90969c',
      gecis: '#0a0b0c',
      'font-baslik': "'Big Shoulders Display', 'Arial Narrow', sans-serif", 'font-govde': "'Barlow', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-harf': '0.005em', 'baslik-satir': '0.95', radius: '0px', 'radius-buyuk': '0px',
      h1: 'clamp(52px, 7.4vw, 120px)', h2: 'clamp(40px, 5.2vw, 78px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'kariyer', 'cta'] },
    { id: 'filo', baslik: 'Filo bakımı', menu: 'Filo bakımı', bolumler: ['filoSozlesme', 'anlasmalar', 'sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { filoSozlesme },
});
