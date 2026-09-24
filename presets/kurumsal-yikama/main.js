import '../../shared/base.css';
import ana from '../../data/sektor-yikama.json';
import ek from '../../data/kurumsal-yikama.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { parlat, kopuk, planla, filo, saat } from './extra.js';
import './style.css';
import { gsap, reducedMotion } from '../../shared/core.js';

// "Sedef" yönü: inci-lila zemin, patlıcan moru koyu, köpük pembesi vurgu; sedef yanardönerliği (pembe → lila → buz mavisi)
// yalnızca "temiz" anlarında. İmza: hero'da parmakla silinen kirli fotoğraf + aracın üstünden işaretlenen yıkama planı.
const KISA = [
  'Köpüklü dış, kapı içleri, torpido, konsol, ızgaralar.',
  'Kumaş vakumla yıkanır, deri beslenir.',
  'Tavan sarkıtmadan; halı, paspas, bagaj dahil.',
  'Aksam kapatılır, soğuk motor, düşük basınç.',
  'Kılcal çizik ve matlığa makine, sonra cila.',
  'Fren tozu çözülür, jant içleri fırçalanır.',
  'Ön yıkama, köpük, durulama, mikrofiber kurulama.',
  'Şirket araçlarına sabit gün ve saatte yıkama.',
];
const DETAY = [
  [['Süre', '3-4 saat'], ['Kapsam', 'İç ve dış, bagaj dahil']],
  [['Kumaş', 'Vakumlu yıkama'], ['Deri', 'Temizlik ve bakım kremi']],
  [['Tavan', 'Az nemle, sarkıtmadan'], ['Teslim', 'Kurutulmuş olarak']],
  [['Önce', 'Elektrik aksamı kapatılır'], ['Sonra', 'Plastiklere koruyucu']],
  [['Süre', '1 gün'], ['Koruma', 'Plastik ve lastik bantlanır']],
  [['Jant', 'Jant temizleyici ve fırça'], ['Lastik', 'Parlatıcı']],
  [['Süre', 'Yaklaşık 20 dk'], ['Kurulama', 'Mikrofiber bez']],
  [['Sıklık', 'Haftalık ya da aylık'], ['Kayıt', 'Araç bazında liste']],
];
const G = ['kopuk.jpg', 'koltuk.jpg', 'supurge.jpg', 'yakin-yikama.jpg', 'pasta.jpg', 'jant.jpg', 'kopuk-jant.jpg', 'yikama-garaj.jpg'];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, kisa: KISA[i], gorsel: h.gorsel || `/img/sektor-yikama/${G[i]}`, detay: DETAY[i] || [] }));

// Motor, sayfa değişiminde yeni ScrollTrigger'ları eski (derin) kaydırma konumunda kuruyor; mobilde bu, "once" tetikleyicileri
// kurulurken silip ScrollTrigger'ı hataya düşürüyor. Perde ekranı kapladığı anda, içerik değişmeden hemen önce başa dön.
addEventListener('hashchange', () => {
  if (reducedMotion) return;
  gsap.delayedCall(0.4, () => (window.__lenis ? window.__lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0)));
});

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-yikama/ic-4x5.jpg`,
    heroAlt: 'Detaylı temizlikten çıkmış, parlayan araç içi',
    logoAlt: 'Oto yıkama · Detay · Filo',
    baslikEki: 'Oto yıkama ve detaylı temizlik | Şaşmaz, Ankara',
    teklifEtiketi: 'Yıkama isteyin',
    hizmetEtiketi: 'Yıkamadan cilaya, yaptığımız işler',
    metinBoyutu: true,
    css: {
      zemin: '#f5f3fa', yuzey: '#ebe6f4', metin: '#1c1030', soluk: '#5e5372', cizgi: 'rgb(28 16 48 / .13)',
      vurgu: '#ff4f93', 'vurgu-metin': '#1c1030', koyu: '#1c1030', 'koyu-metin': '#f3eefb', 'koyu-soluk': '#a99cc0',
      gecis: '#ff4f93',
      'font-baslik': "'Parkinsans', system-ui, sans-serif", 'font-govde': "'Wix Madefor Text', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.035em', 'baslik-satir': '1.02',
      radius: '14px', 'radius-buyuk': '28px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['parlat', 'kopuk', 'hizmetOzet', 'planla', 'yorumlar', 'rakamlar', 'saat', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'ozet', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'planla', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo Yıkama', bolumler: ['filo', 'anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { parlat, kopuk, planla, filo, saat },
});
