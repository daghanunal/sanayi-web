import '../../shared/base.css';
import ana from '../../data/eczane.json';
import ek from '../../data/kurumsal-eczane.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { waHref } from '../../shared/core.js';
import { etiket, nobetBilgi } from './extra.js';
import './style.css';

const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const veri = derinBirlestir(ana, ek);

// Çekirdeğin varsayılan WhatsApp metni oto sanayi içindir ("aracım için"): eczane metniyle değiştirilir.
// (Motor ve çekirdekte veriden okunan bir WhatsApp metni alanı yok; rapor edildi.)
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href*="wa.me"]');
  if (a && a.href.includes('arac%C4%B1m')) a.href = waHref(veri, veri.waMesaj || 'Merhaba, bilgi almak istiyorum.');
}, true);

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'yan',
    yer: "Şaşmaz Mahallesi'nde",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-eczane/recete-masa-3d.jpg`,
    heroAlt: 'Lacivert masada örnek e-reçete çıktısı, ilaç kutuları, blister ve krem tüpü (3D görsel)',
    logoAlt: 'Eczane',
    baslikEki: 'Eczane | Etimesgut, Ankara',
    teklifEtiketi: 'İletişim',
    hizmetEtiketi: 'Hizmetler',
    metinBoyutu: true,
    altNot: 'Fotoğraflar temsilîdir (Pexels). 3D görseller temsilîdir. Yorumlar ve nöbet takvimi örnektir. Sitedeki bilgiler tanıtım amaçlıdır; ilaç kullanımıyla ilgili kararlar için hekime ve eczacıya danışılmalıdır.',
    // "Kurumsal Nöbet" yönü: serin porselen zemin, eczane lacivert-mavisi, kırmızı yalnızca "E" işaretinde ve nöbette.
    css: {
      zemin: '#f5f7fa', yuzey: '#e8edf4', metin: '#0e1a2b', soluk: '#46546a', cizgi: 'rgb(14 26 43 / .15)',
      vurgu: '#1f4f8f', 'vurgu-metin': '#ffffff', koyu: '#0d2240', 'koyu-metin': '#eef2f8', 'koyu-soluk': '#a8b7cc',
      gecis: 'linear-gradient(90deg, #0d2240 0 70%, #c8102e 70% 100%)',
      'font-baslik': "'Manrope', system-ui, sans-serif", 'font-govde': "'Atkinson Hyperlegible', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.025em', 'baslik-satir': '1.02', radius: '12px', 'radius-buyuk': '20px',
      govde: '18px', h2: 'clamp(30px, 4vw, 54px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'nobetBilgi', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'etiket', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'cta'] },
    { id: 'kurumlar', baslik: 'Kurumlar', bolumler: ['anlasmalar', 'cta'] },
    { id: 'sss', baslik: 'Sorular', bolumler: ['sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim', 'nobetBilgi'] },
  ],
  ekstralar: { etiket, nobetBilgi },
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    name: d.isletme.ad,
    description: d.isletme.tanim,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
  }),
});
