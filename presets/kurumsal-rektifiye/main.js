import '../../shared/base.css';
import ana from '../../data/mikron.json';
import ek from '../../data/kurumsal-rektifiye.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { olcuSecici } from './extra.js';
import './style.css';

// Kurumsal Ölçü: koyu grafit atölye, kumpas sarısı, pah kırılmış köşeler, cetvel taksimatlı ayırıcılar.
// Sektör modülü: büyütme ölçüsü hesabı (standart çap + ölçülen çap → inilecek ilk büyütme ölçüsü ve piston sınıfı).
const B = import.meta.env.BASE_URL;
kurumsal({
  veri: derinBirlestir(ana, ek),
  tema: {
    hero: 'tam',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-rektifiye/krank-3d.jpg`,
    heroAlt: 'Taşlanmış muyluları parlayan krank mili (temsilî 3D görsel)',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D krank görseli temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Motor rektifiye ve torna',
    baslikEki: 'Motor rektifiye ve torna | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#101316', yuzey: '#1a1f24', metin: '#e8ebee', soluk: '#9aa3ab', cizgi: 'rgb(232 235 238 / .13)',
      vurgu: '#f4c542', 'vurgu-metin': '#121417', koyu: '#08090b', 'koyu-metin': '#e8ebee', 'koyu-soluk': '#8b949c',
      gecis: '#f4c542',
      'font-baslik': "'Chakra Petch', system-ui, sans-serif", 'font-govde': "'Barlow', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.01em', 'baslik-satir': '1.0', radius: '0px', 'radius-buyuk': '0px',
      govde: '18px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'markalar', 'galeri', 'cta'] },
    { id: 'olcu', baslik: 'Büyütme ölçüsü', bolumler: ['olcuSecici', 'sss', 'cta'] },
    { id: 'servisler', baslik: 'Usta ve servisler', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { olcuSecici },
});
