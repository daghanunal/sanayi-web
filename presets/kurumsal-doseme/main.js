import '../../shared/base.css';
import ana from '../../data/usta.json';
import ek from '../../data/kurumsal-doseme.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { filoKoltuk } from './extra.js';
import './style.css';

const v = derinBirlestir(ana, ek);

// ?kurulus= motorda yalnızca isletme.kurulus'u değiştirir; tarihçeyi burada süzeriz:
// ilk kayıt kuruluş yılı olur, ondan önceki ya da aynı yıldaki kayıtlar düşer.
const pk = Number(new URLSearchParams(location.search).get('kurulus'));
const kurulus = pk || v.isletme.kurulus;
v.tarihce = v.tarihce
  .map((t, i) => ({ ...t, yil: i === 0 ? kurulus : t.yil }))
  .filter((t, i) => i === 0 || t.yil === null || t.yil > kurulus)
  .map((t) => ({ ...t, yil: t.yil ?? 'Bugün' }));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/usta/t-2003.jpg`,
    heroAlt: 'Yeniden döşenmiş deri servis aracı koltukları',
    logoAlt: 'Oto döşeme · filo koltuk yenileme',
    baslikEki: 'Oto döşeme ve filo koltuk yenileme | Şaşmaz, Ankara',
    teklifEtiketi: 'Teklif isteyin',
    hizmetEtiketi: 'Hizmetlerimiz',
    css: {
      zemin: '#f6efe5', yuzey: '#ecdfcd', metin: '#2a1515', soluk: '#6d5750', cizgi: 'rgb(42 21 21 / .15)',
      vurgu: '#6e1b27', 'vurgu-metin': '#fbf1e4', koyu: '#231012', 'koyu-metin': '#f3e5d3', 'koyu-soluk': '#bba292',
      gecis: '#6e1b27',
      'font-baslik': "'Fraunces', Georgia, serif", 'font-govde': "'Figtree', system-ui, sans-serif",
      'baslik-agirlik': '500', 'baslik-harf': '-0.022em', 'baslik-satir': '1.0', radius: '999px', 'radius-buyuk': '26px',
      h2: 'clamp(32px, 4.4vw, 60px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'anlasmaOzet', 'filoKoltuk', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'tarihce', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'filo', baslik: 'Filo ve Kurumsal', bolumler: ['filoKoltuk', 'anlasmalar', 'sss', 'cta'] },
    { id: 'referanslar', baslik: 'Referanslar', bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { filoKoltuk },
});
