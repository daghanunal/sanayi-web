import '../../shared/base.css';
import ana from '../../data/sektor-turbo.json';
import ek from '../../data/kurumsal-turbo.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { hero, kesit, atolye } from './extra.js';
import './style.css';

// "Isıl renk" yönü: döküm alüminyum zemin, gece çivitmavisi paneller, akkor türbin turuncusu.
// Başlıklar eğik ve ağır (Exo 2), ölçü etiketleri Oxanium, gövde Plus Jakarta Sans.
const B = import.meta.env.BASE_URL;
const hizmetGorsel = ['sokulmus-turbo', 'turbin-cark', 'turbo-yakin', 'krom-turbo', 'eller-turbo', 'dizel-motor', 'motor-turbo', 'usta-turbo'];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h, i) => (hizmetGorsel[i] ? { ...h, gorsel: `${B}img/kurumsal-turbo/${hizmetGorsel[i]}.jpg` } : h));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-turbo/turbin-cark.jpg`,
    heroAlt: 'Gövdesi açılmış turbonun kompresör çarkı',
    logoAlt: 'Turbo · Balans · VNT',
    baslikEki: 'Turbo revizyon ve tamiri | Şaşmaz, Ankara',
    teklifEtiketi: 'Turbomu baktırayım',
    hizmetEtiketi: 'Turbo işleri',
    css: {
      zemin: '#dfe3e7', yuzey: '#eef1f4', metin: '#121521', soluk: '#4b5264', cizgi: 'rgb(18 21 33 / .15)',
      vurgu: '#e8491d', 'vurgu-metin': '#ffffff', koyu: '#17132a', 'koyu-metin': '#eeebf7', 'koyu-soluk': '#a39ec2',
      gecis: 'linear-gradient(90deg, #17132a 0 58%, #6c8cff 58% 64%, #ffb347 64% 72%, #ff6a1f 72% 84%, #e8284a 84%)',
      'font-baslik': "'Exo 2', system-ui, sans-serif", 'font-govde': "'Plus Jakarta Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.015em', 'baslik-satir': '0.98',
      radius: '10px', 'radius-buyuk': '18px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'ozet', 'kesit', 'hizmetOzet', 'rakamlar', 'surec', 'yorumlar', 'atolye', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'kesit', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Servisler', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, kesit, atolye },
});
