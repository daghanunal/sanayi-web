import '../../shared/base.css';
import ana from '../../data/sektor-yikama.json';
import ek from '../../data/kurumsal-yikama.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { parlat, planla, filo, saat } from './extra.js';
import './style.css';

// "Karnauba" yönü: serin buz beyazı zemin, derin petrol-siyah koyu, karnauba cilası amberi vurgu, su yeşili ikincil.
// İmza: künyenin yanında kontrol lambası altında siyah kaput (lamba gezdikçe hareler görünür, pasta pedi bir kez geçince
// ayna olur) + aracın kuşbakışı çiziminden yıkama planı + filo takvimi.
const B = import.meta.env.BASE_URL;
// Hizmet görseli ve ayrıntıları başlığa göre (veri sırası değişse de doğru eşleşir)
const EK = [
  [/iç-dış/i, 'kopuk.jpg', [['Kapsam', 'Dış köpüklü yıkama, iç süpürge ve cam'], ['Kurulama', 'Mikrofiber bez']]],
  [/detaylı/i, 'ic-mekan.jpg', [['Kapsam', 'Kapı içleri, torpido, konsol, bagaj'], ['Izgaralar', 'Fırça ve buharla']]],
  [/koltuk/i, 'koltuk.jpg', [['Kumaş', 'Vakumlu makineyle yıkama'], ['Deri', 'Temizlik ve bakım kremi']]],
  [/tavan|halı/i, 'supurge.jpg', [['Tavan', 'Az nemle, sarkıtmadan'], ['Halı ve paspas', 'Yıkanıp kurutulur']]],
  [/motor/i, 'yakin-yikama.jpg', [['Koruma', 'Elektrik aksamı kapatılır'], ['Basınç', 'Düşük, motor soğukken']]],
  [/pasta|cila/i, 'pasta.jpg', [['Kapsam', 'Kılcal çizik ve matlaşma'], ['Koruma', 'Plastik ve lastik bantlanır']]],
  [/jant|lastik/i, 'jant.jpg', [['Jant', 'Jant temizleyici ve fırça'], ['Lastik', 'Parlatıcı']]],
  [/filo/i, 'yikama-garaj.jpg', [['Sıklık', 'Haftalık ya da aylık'], ['Kayıt', 'Araç bazında liste']]],
];
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h) => {
  const e = EK.find(([re]) => re.test(h.baslik));
  return e ? { ...h, gorsel: h.gorsel || `${B}img/sektor-yikama/${e[1]}`, detay: e[2] } : h;
});

kurumsal({
  veri,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    logoAlt: 'Oto yıkama · Detaylı temizlik · Filo',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    baslikEki: 'Oto yıkama ve detaylı temizlik | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    metinBoyutu: true,
    css: {
      zemin: '#eef2f0', yuzey: '#e1e8e5', metin: '#0c1f1c', soluk: '#4a5c57', cizgi: 'rgb(12 31 28 / .13)',
      vurgu: '#f2a516', 'vurgu-metin': '#0c1f1c', koyu: '#0b1a18', 'koyu-metin': '#edf3f0', 'koyu-soluk': '#9aaea7',
      gecis: '#f2a516',
      'font-baslik': "'Funnel Display', system-ui, sans-serif", 'font-govde': "'Host Grotesk', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.03em', 'baslik-satir': '1.02',
      radius: '10px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['parlat', 'hizmetOzet', 'ozet', 'rakamlar', 'saat', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'planla', 'surec', 'sss', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'galeri', 'kariyer', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo yıkama', menu: 'Filo', bolumler: ['filo', 'anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { parlat, planla, filo, saat },
});
