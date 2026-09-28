import '../../shared/base.css';
import ana from '../../data/sektor-kilit.json';
import ek from '../../data/kurumsal-kilit.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { silindir, anahtarBul } from './extra.js';
import './style.css';

// "Diş kodu" yönü: nikel gri zemin, gece petrolü koyu, transponder camgöbeği vurgu.
// Künyenin yanında pimli silindir kesiti: açılışta anahtar bir kez girer, pimler kesme hattına oturur, göbek döner.
const G = (f) => `/img/kurumsal-kilit/${f}`;
const GORSEL = ['yedek-anahtar.jpg', 'anahtarlar.jpg', 'kodlama.jpg', 'akilli-anahtar.jpg', 'start-stop.jpg', 'kapi-kilidi.jpg', 'kontak.jpg', 'silindir-parcalari.jpg', 'kilit-silindiri.jpg'];
const DETAY = [
  [['Kesim', 'Aracın kilidine göre'], ['Çipliyse', 'Araca tanıtılır']],
  [['Belge', 'Ruhsat ve kimlik'], ['Kayıp anahtar', 'Araçtan silinir']],
  [['Cihaz', 'Arıza tespit cihazı'], ['Bakılanlar', 'Çip, anten, ünite']],
  [['Tip', 'Sustalı, anahtarsız çalıştırma'], ['Teslimde', 'Bütün tuşlar denenir']],
  [['Aktarılan', 'Elektronik kart']],
  [['Belge', 'Ruhsat ve kimlik']],
  [['Önce', 'Temizlik ve pin değişimi'], ['Gerekirse', 'Kontak yenilenir']],
  [['Onarım', 'Kilit göbeği'], ['Uyum', 'Mevcut anahtara']],
  [['Yer', 'Kontak ya da kapı kilidi'], ['Sonra', 'Yeni anahtar kesilir']],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, gorsel: G(GORSEL[i % GORSEL.length]), detay: DETAY[i] || [] }));
veri.galeri = ana.galeri.map((g) => ({ ...g, src: g.src.replace('/sektor-kilit/', '/kurumsal-kilit/') }));

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    kunye: true,
    gecis: 'yan',
    yer: "Şaşmaz'da",
    logoAlt: 'Oto kilit ve anahtar',
    baslikEki: 'Oto kilit ve anahtar | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    altNot: "Pexels'ten alınan fotoğraflar ve silindir çizimi temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#e9ece8', yuzey: '#dde2dd', metin: '#0d1417', soluk: '#4e5a5c', cizgi: 'rgb(13 20 23 / .15)',
      vurgu: '#007f79', 'vurgu-metin': '#f2fbf9', koyu: '#0a1a1c', 'koyu-metin': '#e6efec', 'koyu-soluk': '#8ea6a3',
      gecis: '#00c2b3',
      'font-baslik': "'Bai Jamjuree', system-ui, sans-serif", 'font-govde': "'Karla', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.02em', 'baslik-satir': '1.02',
      radius: '4px', 'radius-buyuk': '14px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['silindir', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'anahtarBul', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Galeri, filo ve servisler', menu: 'Filo', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { silindir, anahtarBul },
});
