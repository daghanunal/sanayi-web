import '../../shared/base.css';
import ana from '../../data/depo.json';
import ek from '../../data/kurumsal-yedekparca.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { sasiSorgu } from './extra.js';
import './style.css';

// Hizmetler ortak veriden gelir (parça satışı, şasiyle bulma, sipariş, teslim, cari hesap).
// Hizmet kartlarında stüdyo çekimi gibi 3D parça görselleri (Cycles; temsilî). Parça grupları
// şasi sorgu modülünde seçilir.
const v = derinBirlestir(ana, ek);
const B = import.meta.env.BASE_URL;
const GORSEL = { disk: 'fren', filtre: 'filtre', amortisor: 'amortisor', triger: 'triger', debriyaj: 'volan', buji: 'bobin', piston: 'piston' };
v.hizmetler = v.hizmetler.map((h) => ({
  ...h,
  gorsel: GORSEL[h.parca] ? `${B}img/kurumsal-yedekparca/3d-${GORSEL[h.parca]}.jpg` : undefined,
}));

const ara = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/depo/raf.jpg`,
    heroAlt: 'Tavana kadar dolu raflar arasında uzanan depo koridoru',
    logoAlt: 'Orijinal ve muadil yedek parça',
    baslikEki: 'Oto yedek parça | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D parça görselleri temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#f1f3f6', yuzey: '#e2e7ee', metin: '#0b1526', soluk: '#4e5a6c', cizgi: 'rgb(11 21 38 / .13)',
      vurgu: '#1f3fd1', 'vurgu-metin': '#ffffff', koyu: '#0a1122', 'koyu-metin': '#e8edf5', 'koyu-soluk': '#95a1b5',
      gecis: '#ffd23f',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Public Sans', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '118%', 'baslik-harf': '-0.03em', 'baslik-satir': '0.96', radius: '8px', 'radius-buyuk': '16px',
      h2: 'clamp(30px, 4vw, 54px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'cta'] },
    { id: 'sorgu', baslik: 'Şasi ile Sorgu', bolumler: ['sasiSorgu', 'sss'] },
    { id: 'servis', baslik: 'Servis ve Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { sasiSorgu },
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
  }),
  aksiyon: (d) => [
    { href: `tel:${d.iletisim.telefon.replace(/[^\d+]/g, '')}`, ikon: icons.phone, etiket: 'Ara' },
    { href: '#/sorgu', rota: 'sorgu', ikon: ara, etiket: 'Şasi ile sor' },
    { href: `https://wa.me/${d.iletisim.whatsapp}`, dis: true, ikon: icons.whatsapp, etiket: 'WhatsApp' },
  ],
});
