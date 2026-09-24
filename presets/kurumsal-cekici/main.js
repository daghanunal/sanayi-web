import '../../shared/base.css';
import ana from '../../data/sektor-cekici.json';
import ek from '../../data/kurumsal-cekici.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { telHref, icons } from '../../shared/core.js';
import { hero, serit, cagri, nobet, iletisim, cta } from './extra.js';
import './style.css';

// "Reflektör" yönü: gece laciverti paneller, reflektif yelek sarı-yeşili (hi-vis) vurgu, tepe lambası kehribarı.
// Karayolu levhası gibi dar ve dik başlıklar (Barlow Condensed), levha etiketleri Barlow Semi Condensed.
const B = import.meta.env.BASE_URL;
const hizmetGorsel = ['cekici-yukleme', 'aku-takviye', 'yolda-lastik', 'vinc-kurtarma', 'arac-tasima', 'agir-kurtarma', 'zincir-sabitleme', 'yolda-kalan'];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h, i) => (hizmetGorsel[i] ? { ...h, gorsel: `${B}img/sektor-cekici/${hizmetGorsel[i]}.jpg` } : h));

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'dan",
    heroGorsel: `${B}img/sektor-cekici/cekici-sehir.jpg`,
    heroAlt: 'Şehir içinde ilerleyen turuncu kayar kasalı çekici',
    logoAlt: '7/24 Çekici · Yol Yardım',
    baslikEki: '7/24 çekici ve yol yardım | Şaşmaz, Ankara',
    teklifEtiketi: 'Çekici çağır',
    hizmetEtiketi: 'Yol yardım',
    css: {
      zemin: '#eef1f4', yuzey: '#e1e6ec', metin: '#0b1424', soluk: '#4a566b', cizgi: 'rgb(11 20 36 / .14)',
      vurgu: '#c8f031', 'vurgu-metin': '#0b1424', koyu: '#0d2a66', 'koyu-metin': '#eef2f8', 'koyu-soluk': '#a9b8d8',
      gecis: 'repeating-linear-gradient(-45deg, #0b1a33 0 34px, #c8f031 34px 68px)',
      'font-baslik': "'Barlow Condensed', system-ui, sans-serif", 'font-govde': "'Barlow', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.005em', 'baslik-satir': '0.94',
      radius: '8px', 'radius-buyuk': '16px',
      h1: 'clamp(52px, 8vw, 128px)', h2: 'clamp(36px, 5vw, 68px)',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['hero', 'serit', 'cagri', 'hizmetOzet', 'rakamlar', 'ozet', 'surec', 'yorumlar', 'nobet', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'cagri', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Sigorta', bolumler: ['anlasmalar', 'cta'] }
    : s.id === 'referanslar' ? { ...s, baslik: 'Yoldan', bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] }
    : s
  ),
  ekstralar: { hero, serit, cagri, nobet, iletisim, cta },
  // Çekicide ilk düğme her zaman "Ara": ortada, vurgulu.
  aksiyon: (d) => [
    { href: d.iletisim.whatsapp ? `https://wa.me/${d.iletisim.whatsapp}?text=${encodeURIComponent(`Merhaba ${d.isletme.ad}, yolda kaldım. Konumum: `)}` : '#/iletisim', ikon: icons.pin, etiket: 'Konum at', dis: !!d.iletisim.whatsapp },
    { href: telHref(d), ikon: icons.phone, etiket: 'Çekici çağır' },
    { href: '#/iletisim', ikon: icons.whatsapp, etiket: 'Yazın', rota: 'iletisim' },
  ],
});
