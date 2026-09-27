import '../../shared/base.css';
import ana from '../../data/sektor-klima.json';
import ek from '../../data/kurumsal-klima.json';
import { kurumsal, derinBirlestir, VARSAYILAN_SAYFALAR } from '../_kurumsal/engine.js';
import { termal, serit, menfez, gaz, saat } from './extra.js';
import './style.css';

// "Termal kamera" yönü: sis beyazı zemin, gece laciverdi, buz camgöbeği vurgu; termal renk skalası
// (mor → mavi → camgöbeği → sarı → turuncu) yalnızca ölçüm anlarında. Hero: normal/termal karşılaştırma.
const G = (f) => `/img/sektor-klima/${f}`;
const GORSEL = ['motor-kontrol.jpg', 'kaput-acik.jpg', 'motor-dikey.jpg', 'motor-bolmesi.jpg', 'konsol-sb.jpg', 'orta-konsol.jpg', 'klima-paneli.jpg', 'teshis.jpg'];
const KISA = [
  'Vakum, tartılı dolum; R134a ve R1234yf.',
  'Azot ve UV boyayla kaçağın yerini buluruz.',
  'Kavrama, rulman, valf; gerekirse değişim.',
  'Delinmiş kondenser, evaporatör, kurutucu.',
  'Koku, zayıf üfleme ve buğunun ilacı.',
  'Küf ve rutubet kokusuna köpük ya da buhar.',
  'Panel, sensör, klape ve fan arızaları.',
  'Trafikte ısınıyorsa fan ve röle.',
];
const DETAY = [
  [['Gaz', 'R134a · R1234yf'], ['Önce', 'Vakum ve kaçak kontrolü']],
  [['Yöntem', 'Azot basıncı, UV boya'], ['Sonuç', 'Kaçağın yeri size gösterilir']],
  [['Önce', 'Kavrama ve valf kontrolü'], ['Değişimde', 'Sistem yıkanır']],
  [['Birlikte', 'Kurutucu filtre yenilenir'], ['Sonra', 'Vakum ve tartılı dolum']],
  [['Seçenek', 'Aktif karbonlu filtre']],
  [['Uygulama', 'Köpük ya da buhar']],
  [['Teşhis', 'Arıza tespit cihazı'], ['Bakılanlar', 'Panel, sensör, klape']],
  [['Kontrol', 'Fan motoru, röle, sigorta']],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h, i) => ({ ...h, kisa: KISA[i], gorsel: G(GORSEL[i % GORSEL.length]), detay: DETAY[i] || [] }));

kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-klima/menfez.jpg`,
    heroAlt: 'Araç içindeki yuvarlak klima üfleme ağzı',
    logoAlt: 'Oto klima · Gaz · Kaçak testi',
    baslikEki: 'Oto klima servisi | Şaşmaz, Ankara',
    teklifEtiketi: 'Arızayı yazın',
    hizmetEtiketi: 'Klimada yaptığımız işler',
    metinBoyutu: true,
    altNot: 'Fotoğraflar temsilîdir (Pexels); termal tonlar görsel efekttir, gerçek ölçüm değildir. Yorumlar örnektir.',
    css: {
      zemin: '#f1f1f6', yuzey: '#e4e3ee', metin: '#110f24', soluk: '#4f4c66', cizgi: 'rgb(17 15 36 / .14)',
      vurgu: '#5b3bd6', 'vurgu-metin': '#ffffff', koyu: '#0e0c26', 'koyu-metin': '#ecebf7', 'koyu-soluk': '#a19dc8',
      gecis: '#0e0c26',
      'font-baslik': "'Sora', system-ui, sans-serif", 'font-govde': "'Rubik', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.035em', 'baslik-satir': '1',
      radius: '12px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: VARSAYILAN_SAYFALAR.map((s) =>
    s.id === 'anasayfa' ? { ...s, bolumler: ['termal', 'serit', 'menfez', 'hizmetOzet', 'rakamlar', 'gaz', 'yorumlar', 'saat', 'cta'] }
    : s.id === 'kurumsal' ? { ...s, bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] }
    : s.id === 'hizmetler' ? { ...s, bolumler: ['hizmetler', 'gaz', 'surec', 'sss', 'cta'] }
    : s.id === 'kurumsal-musteriler' ? { ...s, baslik: 'Filo ve Ticari', bolumler: ['anlasmalar', 'cta'] }
    : s
  ),
  ekstralar: { termal, serit, menfez, gaz, saat },
});
