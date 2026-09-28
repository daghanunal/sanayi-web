import '../../shared/base.css';
import ana from '../../data/manifold.json';
import ek from '../../data/kurumsal-egzoz.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { belirtiler, hat } from './extra.js';
import './style.css';

// Hizmetlere kurumsal ekler (görsel, detay) başlığa göre eklenir.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    kunye: true,
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/manifold/cift-uc.jpg`,
    heroAlt: 'Paslanmaz çift egzoz ucu yakın plan',
    logoAlt: 'Egzoz, DPF ve katalitik',
    baslikEki: 'Egzoz, DPF ve katalitik konvertör | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D egzoz hattı çizimi temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#efebe6', yuzey: '#e3ddd5', metin: '#1a1512', soluk: '#5f554c', cizgi: 'rgb(26 21 18 / .14)',
      vurgu: '#7a2b5c', 'vurgu-metin': '#fff4fa', koyu: '#1c1419', 'koyu-metin': '#f3e9ee', 'koyu-soluk': '#b3a2ac',
      gecis: '#7a2b5c',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Archivo', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '125%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.94',
      radius: '999px', 'radius-buyuk': '28px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'hat', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'belirtiler', baslik: 'Arıza belirtileri', menu: 'Belirtiler', bolumler: ['belirtiler', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve kurumsal araçlar', menu: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { belirtiler, hat },
});
