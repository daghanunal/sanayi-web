import '../../shared/base.css';
import ana from '../../data/sektor-restoran.json';
import ek from '../../data/kurumsal-restoran.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { telHref, waHref, mapsHref, icons, gsap, reducedMotion } from '../../shared/core.js';
import { kemerHero, menuPano, masaKur, ocakSaati } from './extra.js';
import './style.css';

// "Çini sofra" yönü: sırlı çini beyazı zemin, İznik yeşili, pul biber kırmızısı.
// Tekrarlanan motif: kemer (fotoğraflar kemer pencerede), çini şerit, köz üstünde şiş.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const masaIkon = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="7" width="12" height="10" rx="2"/><path d="M9 3.5h6M9 20.5h6M2.5 10v4M21.5 10v4"/></svg>`;
const veri = derinBirlestir(ana, ek);
// Menü panosunda iki grup: ocaktan çıkanlar ve sofraya gelenler. Süre etiketi "Bekleme".
const OCAK = new Set(['adana', 'urfa', 'sis', 'beyti']);
veri.hizmetler = ana.hizmetler.map((h) => ({ ...h, grup: OCAK.has(h.id) ? 'ocak' : 'sofra', etiket: 'Bekleme' }));
const waGenel = veri.waMesaj || 'Merhaba, masa ayırtmak istiyorum.';

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir ("aracım için"): rezervasyon metniyle değiştirilir.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href*="wa.me"]');
  if (a && a.href.includes('arac%C4%B1m')) a.href = waHref(veri, waGenel);
}, true);

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-restoran/ocak.jpg`,
    heroAlt: 'Uzun ocakbaşında şişleri çeviren ustalar',
    logoAlt: 'Ocakbaşı',
    baslikEki: 'Ocakbaşı ve kebap | Etimesgut, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Menü',
    metinBoyutu: true,
    altNot: 'Güncel fiyatlar için arayın. Fotoğraflar temsilîdir (Pexels). Yorumlar örnektir.',
    css: {
      zemin: '#f0f3ec', yuzey: '#dde7de', metin: '#0d3b33', soluk: '#46605a', cizgi: 'rgb(13 59 51 / .14)',
      vurgu: '#d8361f', 'vurgu-metin': '#ffffff', koyu: '#0d3b33', 'koyu-metin': '#f0f3ec', 'koyu-soluk': '#9fc3b5',
      gecis: '#0d3b33',
      'font-baslik': "'Anton', 'Impact', sans-serif", 'font-govde': "'Be Vietnam Pro', system-ui, sans-serif",
      'baslik-agirlik': '400', 'baslik-harf': '0.005em', 'baslik-satir': '0.98',
      radius: '10px', 'radius-buyuk': '18px',
      h1: 'clamp(46px, 7.4vw, 124px)', h2: 'clamp(36px, 5vw, 72px)', h3: 'clamp(22px, 2.1vw, 28px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['kemerHero', 'menuPano', 'ozet', 'rakamlar', 'ocakSaati', 'yorumlar', 'cta'] },
    { id: 'menu', baslik: 'Menü', bolumler: ['hizmetler', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'cta'] },
    { id: 'rezervasyon', baslik: 'Rezervasyon', bolumler: ['masaKur', 'surec', 'anlasmalar', 'sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { kemerHero, menuPano, masaKur, ocakSaati },
  aksiyon: (d) => [
    { href: telHref(d), ikon: icons.phone, etiket: 'Ara' },
    { href: waHref(d, waGenel), ikon: icons.whatsapp, etiket: 'WhatsApp', dis: true },
    { href: '#/rezervasyon', ikon: masaIkon, etiket: 'Rezervasyon', rota: 'rezervasyon' },
  ],
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    servesCuisine: 'Kebap, ızgara, meze',
    acceptsReservations: true,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  }),
});
