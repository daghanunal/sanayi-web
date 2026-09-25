import '../../shared/base.css';
import ana from '../../data/sektor-yikama.json';
import ek from '../../data/kurumsal-yikama.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { yilEki } from '../_kurumsal/bolumler.js';
import { parlat, kopuk, planla, filo, saat } from './extra.js';
import './style.css';
import { gsap, reducedMotion } from '../../shared/core.js';

// "Karnauba" yönü: serin buz beyazı zemin, derin petrol-siyah koyu, karnauba cilası amberi vurgu, su yeşili ikincil.
// İmza: hero'da kontrol lambası altında siyah kaput (lamba gezdikçe hareler görünür, pasta pedi geçince ayna olur)
// + aracın kuşbakışı çiziminden yıkama planı + filo takvimi.
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
// ?kurulus= verilirse metinlerdeki "2015'ten" de ona uysun.
const kYil = Number(new URLSearchParams(location.search).get('kurulus')) || ana.isletme.kurulus;
const veri = JSON.parse(JSON.stringify(derinBirlestir(ana, ek)).replaceAll(`${yilEki(ana.isletme.kurulus)} beri`, `${yilEki(kYil)} beri`));
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
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
        logoAlt: 'Oto yıkama · Detay · Filo',
    baslikEki: 'Oto yıkama ve detaylı temizlik | Şaşmaz, Ankara',
    teklifEtiketi: 'Yıkama isteyin',
    hizmetEtiketi: 'Yıkamadan cilaya, yaptığımız işler',
    metinBoyutu: true,
    css: {
      zemin: '#eef2f0', yuzey: '#e1e8e5', metin: '#0c1f1c', soluk: '#4d5f5a', cizgi: 'rgb(12 31 28 / .13)',
      vurgu: '#f2a516', 'vurgu-metin': '#0c1f1c', koyu: '#0b1a18', 'koyu-metin': '#edf3f0', 'koyu-soluk': '#93a8a1',
      gecis: '#f2a516',
      'font-baslik': "'Funnel Display', system-ui, sans-serif", 'font-govde': "'Host Grotesk', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.03em', 'baslik-satir': '1.02',
      radius: '10px', 'radius-buyuk': '22px',
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
