import '../../shared/base.css';
import ana from '../../data/garaj.json';
import ek from '../../data/kurumsal-motor.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { filoPlan, revizyon } from './extra.js';
import './style.css';

// "Kurumsal Filo" yönü: çam yeşili, IBM Plex, köşesi keskin kutular. Künye + filo sayfası + revizyon kesiti.
const B = import.meta.env.BASE_URL;
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'bolunmus',
    kunye: true,
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-motor/filo-hava.jpg`,
    heroAlt: 'Sıra sıra park etmiş hafif ticari araçlar, yukarıdan',
    logoAlt: 'Motor, şanzıman ve filo bakımı',
    baslikEki: 'Motor, şanzıman ve filo bakımı | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D motor çizimi temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#f1f0eb', yuzey: '#e4e3dc', metin: '#121614', soluk: '#555d59', cizgi: 'rgb(18 22 20 / .15)',
      vurgu: '#0f5a45', 'vurgu-metin': '#f3f0e4', koyu: '#0d1411', 'koyu-metin': '#e8e5da', 'koyu-soluk': '#93a09a',
      gecis: '#0f5a45',
      'font-baslik': "'IBM Plex Sans Condensed', system-ui, sans-serif", 'font-govde': "'IBM Plex Sans', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.015em', 'baslik-satir': '0.98', radius: '2px', 'radius-buyuk': '3px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'revizyon', 'surec', 'cta'] },
    { id: 'kurumsal', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'kariyer', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve Kurumsal', bolumler: ['anlasmalar', 'filoPlan', 'galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { filoPlan, revizyon },
});
