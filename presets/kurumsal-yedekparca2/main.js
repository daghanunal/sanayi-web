import '../../shared/base.css';
import ana from '../../data/depo.json';
import ek from '../../data/kurumsal-yedekparca2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { icons } from '../../shared/core.js';
import { patlatma } from './extra.js';
import './style.css';

// Hizmetler ortak veriden gelir (parça satışı, şasiyle bulma, sipariş, teslim, cari hesap).
// Sektör modülü: patlatılmış ön teker çizimi (Parça Bul sayfası), parça seçilip WhatsApp'tan sorulur.
const v = derinBirlestir(ana, ek);
const B = import.meta.env.BASE_URL;

const hedef = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg>';

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-yedekparca2/parca-tepsisi.jpg`,
    heroAlt: 'Tezgâhta tepsiye dizilmiş motor parçaları',
    logoAlt: 'Orijinal ve muadil yedek parça',
    baslikEki: 'Oto yedek parça | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    altNot: "Pexels'ten alınan fotoğraflar ve çizimler temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#d7eadc', yuzey: '#c5dfcd', metin: '#0c2a2a', soluk: '#3d5c57', cizgi: 'rgb(12 42 42 / .2)',
      vurgu: '#ff4a1c', 'vurgu-metin': '#0c2a2a', koyu: '#0c2a2a', 'koyu-metin': '#d7eadc', 'koyu-soluk': '#8db3a5',
      gecis: '#ff4a1c',
      'font-baslik': "'Syne', system-ui, sans-serif", 'font-govde': "'Schibsted Grotesk', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.98',
      radius: '3px', 'radius-buyuk': '6px',
      h1: 'clamp(40px, 5vw, 80px)', h2: 'clamp(32px, 4.4vw, 62px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'galeri', 'cta'] },
    { id: 'parca', baslik: 'Parça Bul', bolumler: ['patlatma', 'sss', 'cta'] },
    { id: 'servis', baslik: 'Servis ve Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { patlatma },
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
    { href: '#/parca', rota: 'parca', ikon: hedef, etiket: 'Parça bul' },
    { href: `https://wa.me/${d.iletisim.whatsapp}`, dis: true, ikon: icons.whatsapp, etiket: 'WhatsApp' },
  ],
});
