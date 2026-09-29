import '../../shared/base.css';
import ana from '../../data/sektor-cekici.json';
import ek from '../../data/kurumsal-cekici.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, mapsHref, icons } from '../../shared/core.js';
import { hero, konum, iletisim, cta } from './extra.js';
import './style.css';

// "Reflektör" yönü: gece laciverti paneller, reflektif yelek sarı-yeşili (hi-vis) vurgu, tepe lambası kehribarı.
// Karayolu levhası gibi dar başlıklar (Barlow Condensed), küçük etiketler Barlow Semi Condensed.
const B = import.meta.env.BASE_URL;
const veri = derinBirlestir(ana, ek);
veri.hizmetler = (ana.hizmetler || []).map((h) => (h.gorsel ? { ...h, gorsel: h.gorsel.replace('/img/sektor-cekici/', `${B}img/sektor-cekici/`) } : h));
// Stok çekici fotoğrafı (üzerinde üretici ve firma yazısı okunuyordu) yerine lib3d'den Cycles render'ı
// (presets/kurumsal-cekici/render_cycles.py): kayar kasalı çekici üstünde binek araç, alacakaranlıkta.
const HERO_3D = `${B}img/kurumsal-cekici/hero-3d.webp`;
const HERO_ALT = 'Alacakaranlıkta ıslak yolda, kasasında kırmızı bir otomobil taşıyan beyaz kayar kasalı çekici (temsilî 3D görsel)';

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: HERO_3D,
    heroGorselDar: `${B}img/kurumsal-cekici/hero-3d-dar.webp`,
    heroAlt: HERO_ALT,
    altNot: "3D görseller ve Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Çekici ve yol yardım',
    baslikEki: 'Çekici ve yol yardım | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Yol yardım',
    css: {
      zemin: '#eef1f4', yuzey: '#e1e6ec', metin: '#0b1424', soluk: '#4a566b', cizgi: 'rgb(11 20 36 / .14)',
      vurgu: '#c8f031', 'vurgu-metin': '#0b1424', koyu: '#0d2a66', 'koyu-metin': '#eef2f8', 'koyu-soluk': '#a9b8d8',
      gecis: 'repeating-linear-gradient(-45deg, #0b1a33 0 34px, #c8f031 34px 68px)',
      'font-baslik': "'Barlow Condensed', system-ui, sans-serif", 'font-govde': "'Barlow', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.005em', 'baslik-satir': '0.96',
      radius: '8px', 'radius-buyuk': '16px',
      h1: 'clamp(56px, 8vw, 128px)', h2: 'clamp(38px, 5vw, 70px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve sigorta', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hero, konum, iletisim, cta },
  // Çekicide alt çubuğun ortası her zaman "Ara".
  aksiyon: (d) => [
    { href: d.iletisim.whatsapp ? `https://wa.me/${d.iletisim.whatsapp}?text=${encodeURIComponent(`Merhaba ${d.isletme.ad}, yolda kaldım. Çekici ya da yol yardım için bilgi almak istiyorum.`)}` : '#/iletisim', ikon: icons.whatsapp, etiket: 'WhatsApp', dis: !!d.iletisim.whatsapp },
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: mapsHref(d), ikon: icons.pin, etiket: 'Yol tarifi', dis: true },
  ],
});
