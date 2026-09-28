import '../../shared/base.css';
import ana from '../../data/manifold.json';
import ek from '../../data/kurumsal-egzoz2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { pafta, parcalar, duman, galeri } from './extra.js';
import './style.css';

// "Ozalit" yönü: egzoz hattının mavi baskı (siyanotip) teknik resmi. Kobalt pafta, beyaz çizgi,
// fosforlu sarı işaret kalemi; baskı kâğıdı rengindeki bölümler aradaki "kopya" sayfalar.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    kunye: true,
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-egzoz2/lift-ozalit.jpg`,
    heroAlt: 'Lifte kaldırılmış aracın egzoz hattı kontrol ediliyor',
    logoAlt: 'Egzoz · DPF · Katalitik',
    baslikEki: 'Egzoz, DPF ve katalitik konvertör | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D egzoz hattı çizimi temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#1c3f9e', yuzey: '#2449ad', metin: '#f3f6ff', soluk: '#bccaf2', cizgi: 'rgb(243 246 255 / .24)',
      vurgu: '#ffd43b', 'vurgu-metin': '#0e2162', koyu: '#eef2fb', 'koyu-metin': '#0e2162', 'koyu-soluk': '#4a5b93',
      gecis: '#ffd43b',
      'font-baslik': "'Saira Condensed', system-ui, sans-serif", 'font-govde': "'Saira', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '100%', 'baslik-harf': '-0.005em', 'baslik-satir': '0.9',
      radius: '2px', 'radius-buyuk': '3px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['pafta', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'parcalar', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'duman-rengi', baslik: 'Duman rengi', bolumler: ['duman', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve kurumsal araçlar', menu: 'Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { pafta, parcalar, duman, galeri },
  onHazir() {
    // Pafta çerçevesi: masaüstünde kenarlarda bölge harfleri ve numaraları.
    const c = document.createElement('div');
    c.className = 'pz-cerceve';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = `<div class="pz-cerceve__ust">${'ABCDEF'.split('').map((h) => `<span>${h}</span>`).join('')}</div><div class="pz-cerceve__yan">${[1, 2, 3, 4].map((n) => `<span>${n}</span>`).join('')}</div>`;
    document.body.append(c);
  },
});
