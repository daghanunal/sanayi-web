import '../../shared/base.css';
import ana from '../../data/sektor-dizel.json';
import ek from '../../data/kurumsal-dizel.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { tezgah, hizmetOzet } from './extra.js';
import './style.css';

// "Menzür" yönü: milimetrik ölçüm kâğıdı zemin, derin petrol paneller, test tezgâhı kobaltı; kehribar yalnızca menzürdeki yakıtta.
// Başlıklar dar Instrument Sans, etiketler JetBrains Mono. İmza: enjektör test tezgâhının menzür tüpleri (Enjektör testi sayfası).
const B = import.meta.env.BASE_URL;
const GORSEL = {
  'Common rail enjektör testi': 'manometre',
  'Enjektör tamiri': 'dijital-olcum',
  'Enjektör kodlama': 'motor-ustu',
  'Yüksek basınç pompası': 'parca-tepsisi',
  'Mekanik pompa ve pompa enjektör': 'komparator',
  'Ağır vasıta dizel': 'kamyon-bakim',
  'Yakıt sistemi temizliği': 'eksantrik',
};
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h) => {
  if (/rail/i.test(h.baslik)) return { ...h, gorsel: `${B}img/kurumsal-dizel/common-rail-3d.jpg` }; // 3D render, temsilî
  return GORSEL[h.baslik] ? { ...h, gorsel: `${B}img/sektor-dizel/${GORSEL[h.baslik]}.jpg` } : h;
});

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-dizel/dizel-boru.jpg`,
    heroAlt: 'Karanlıkta boruların üstünde asılı paslı "Diesel" levhası',
    logoAlt: 'Dizel enjektör ve yakıt pompası',
    baslikEki: 'Dizel enjektör ve pompa | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    altNot: "Pexels'ten alınan fotoğraflar ve 3D motor görseli temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#e8edee', yuzey: '#f6f8f8', metin: '#0c1d22', soluk: '#4d5f64', cizgi: 'rgb(12 29 34 / .16)',
      vurgu: '#2455ff', 'vurgu-metin': '#ffffff', koyu: '#0b2a2f', 'koyu-metin': '#e6f0ef', 'koyu-soluk': '#8fb0b0',
      gecis: 'repeating-linear-gradient(90deg, #0b2a2f 0 22px, #0e3339 22px 23px)',
      'font-baslik': "'Instrument Sans', 'Arial Narrow', sans-serif", 'font-govde': "'Instrument Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '78%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.96',
      radius: '4px', 'radius-buyuk': '8px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'enjektor-testi', baslik: 'Enjektör testi', bolumler: ['tezgah', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve servisler', menu: 'Filolar', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { tezgah, hizmetOzet },
});

// Uzun işletme adı (?ad=) mobilde iki satıra iner; küçülen üst çubuğa sığsın diye alt satırı gizle, adı sıkılaştır.
const uzunAd = () => {
  const ad = document.querySelector('.k-logo__ad');
  if (ad) document.documentElement.classList.toggle('dz-uzun-ad', ad.textContent.trim().length > 16);
};
uzunAd();
requestAnimationFrame(uzunAd);
