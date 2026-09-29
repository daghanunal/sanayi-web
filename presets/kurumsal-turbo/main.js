import '../../shared/base.css';
import ana from '../../data/sektor-turbo.json';
import ek from '../../data/kurumsal-turbo.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { hero, karne, sebep } from './extra.js';
import './style.css';

// "Ölçü Karnesi" yönü: açık adaçayı kâğıt zemin, yarış yeşili paneller, pirinç (ölçü aleti) vurgusu.
// Başlıklar dik ve geniş (Anybody, genişlik ekseni), ölçüler Red Hat Mono, gövde Instrument Sans.
const B = import.meta.env.BASE_URL;
const GORSEL = {
  'Turbo revizyonu': 'sokulmus-turbo',
  'Balans ayarı': 'turbin-cark',
  'VNT ve aktüatör ayarı': 'turbo-yakin',
  'Intercooler temizliği ve testi': 'motor-turbo',
  'Turbo yağ hattı': 'tezgah-turbo',
  'Söküm ve montaj': 'usta-turbo',
};
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h) => (GORSEL[h.baslik] ? { ...h, gorsel: `${B}img/kurumsal-turbo/${GORSEL[h.baslik]}.jpg` } : h));

kurumsal({
  veri,
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-turbo/eller-turbo.jpg`,
    heroAlt: 'Tezgâh üzerindeki dizel turboyu kontrol eden eller',
    logoAlt: 'Turbo revizyonu ve tamiri',
    baslikEki: 'Turbo revizyonu ve tamiri | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    altNot: "Pexels'ten alınan fotoğraflar ve 3D turbo görseli temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#e9eee6', yuzey: '#f7f9f4', metin: '#0f1d17', soluk: '#4c5c54', cizgi: 'rgb(15 29 23 / .16)',
      vurgu: '#0c7a50', 'vurgu-metin': '#ffffff', koyu: '#0f2a21', 'koyu-metin': '#e9f1ea', 'koyu-soluk': '#9fb8aa',
      gecis: '#0f2a21',
      'font-baslik': "'Anybody', system-ui, sans-serif", 'font-govde': "'Instrument Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '128%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.96',
      radius: '4px', 'radius-buyuk': '6px',
      h1: 'clamp(40px, 7vw, 116px)', h2: 'clamp(30px, 4.4vw, 60px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'karne', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'turbo-arizalari', baslik: 'Turbo arızaları', bolumler: ['sebep', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve servisler', menu: 'Filolar', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hero, karne, sebep },
});
