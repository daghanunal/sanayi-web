import '../../shared/base.css';
import ana from '../../data/sektor-kilit.json';
import ek from '../../data/kurumsal-kilit.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { silindir, serit, anahtarBul, kapida, saat } from './extra.js';
import './style.css';

// "Diş kodu" yönü: nikel gri zemin, gece petrolü koyu, transponder camgöbeği vurgu.
// İmza: hero'da pimli silindir kesiti. Anahtar girer, pimler dişlere göre yükselir, kesme hattı hizalanır, kilit döner.
const G = (f) => `/img/kurumsal-kilit/${f}`;
const GORSEL = ['yedek-anahtar.jpg', 'anahtarlar.jpg', 'kodlama.jpg', 'akilli-anahtar.jpg', 'start-stop.jpg', 'kapi-acma.jpg', 'kontak.jpg', 'kapi-kilidi.jpg', 'silindir-parcalari.jpg'];
const KISA = [
  'Bıçak kilidinize göre kesilir, çip araca tanıtılır.',
  'Kilitten ya da şase numarasından yeni anahtar.',
  '"Anahtar tanınmadı" ve marş basmama arızası.',
  'Kumandalı, sustalı ve anahtarsız çalıştırma.',
  'Kart yeni kaba aktarılır, kodlama gerekmez.',
  'Zorlamadan açma; ruhsat ve kimlik kontrolüyle.',
  'Dönmeyen, takılan kontak; pin ve silindir.',
  'Açılmayan kapı, sıkışan bagaj, merkezi kilit.',
  'Kilide zarar vermeden çıkarılır, yenisi kesilir.',
];
const DETAY = [
  [['Kesim', 'Kilidinize göre'], ['Çipliyse', 'Araca tanıtılır']],
  [['Kaynak', 'Kilit ya da şase no'], ['Eski anahtar', 'Sistemden silinir']],
  [['Teşhis', 'Arıza tespit cihazı'], ['Bakılanlar', 'Çip, anten, ünite']],
  [['Tip', 'Sustalı, keyless'], ['Teslimde', 'Tüm tuşlar denenir']],
  [['Aktarılan', 'Elektronik kart'], ['Kodlama', 'Gerekmez']],
  [['Yöntem', 'Özel açma aletleri'], ['Şart', 'Ruhsat ve kimlik']],
  [['Önce', 'Temizlik ve pin'], ['Gerekirse', 'Kontak yenilenir']],
  [['Onarım', 'Kilit göbeği'], ['Uyum', 'Mevcut anahtarınıza']],
  [['Yer', 'Kontak ya da kapı'], ['Sonra', 'Yeni anahtar kesilir']],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, kisa: KISA[i], gorsel: G(GORSEL[i % GORSEL.length]), detay: DETAY[i] || [] }));
veri.galeri = ana.galeri.map((g) => ({ ...g, src: g.src.replace('/sektor-kilit/', '/kurumsal-kilit/') }));

// Sayfa değişiminde yeni içerik, eski sayfanın kaydırma konumundayken kuruluyordu; geçmiş "once" tetikleyicileri
// kurulum sırasında kendini silip ScrollTrigger'ı çökertiyordu. Perde kapalıyken içerik yazılmadan hemen önce başa dön.
const kok = document.getElementById('sayfa');
const ih = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty(kok, 'innerHTML', {
  configurable: true,
  get() { return ih.get.call(this); },
  set(v) {
    if (scrollY > 0) scrollTo({ top: 0, behavior: 'instant' });
    ih.set.call(this, v);
  },
});

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    logoAlt: 'Oto kilit · Anahtar · İmmobilizer',
    baslikEki: 'Oto kilit ve anahtar | Şaşmaz, Ankara',
    teklifEtiketi: 'Anahtarınızı yazın',
    hizmetEtiketi: 'Kilit ve anahtar işleri',
    metinBoyutu: true,
    css: {
      zemin: '#e9ece8', yuzey: '#dde2dd', metin: '#0d1417', soluk: '#4e5a5c', cizgi: 'rgb(13 20 23 / .15)',
      vurgu: '#007f79', 'vurgu-metin': '#f2fbf9', koyu: '#0a1a1c', 'koyu-metin': '#e6efec', 'koyu-soluk': '#8ea6a3',
      gecis: '#00c2b3',
      'font-baslik': "'Bai Jamjuree', system-ui, sans-serif", 'font-govde': "'Karla', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.02em', 'baslik-satir': '1.02',
      radius: '4px', 'radius-buyuk': '14px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['silindir', 'serit', 'anahtarBul', 'hizmetOzet', 'rakamlar', 'kapida', 'yorumlar', 'saat', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'anahtarBul', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Galeri ve Filo', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { silindir, serit, anahtarBul, kapida, saat },
});
