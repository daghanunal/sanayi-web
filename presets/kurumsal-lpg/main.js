import '../../shared/base.css';
import ana from '../../data/sektor-lpg.json';
import ek from '../../data/kurumsal-lpg.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { giris, hat, tankPulu, uygunluk, mesai, galeri } from './extra.js';
import './style.css';

// "Tüp yeşili": şişe yeşili çift ton fotoğraflar, soluk adaçayı kâğıt zemin, taze yeşil sinyal rengi,
// logoda ve sonuçta tek mavi alev. İmza: gazın yolu (kaydırdıkça dolan hat) ve tank etiketi kadranı.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${import.meta.env.BASE_URL}img/kurumsal-lpg/manometre.jpg`,
    heroAlt: 'Gaz hattındaki basınç göstergeleri',
    logoAlt: 'LPG · Dönüşüm · Muayene',
    baslikEki: 'LPG dönüşüm, bakım ve tank muayenesi | Şaşmaz, Ankara',
    teklifEtiketi: 'Randevu',
    hizmetEtiketi: 'Yaptığımız işler',
    metinBoyutu: true,
    css: {
      zemin: '#e8eee8', yuzey: '#f6f9f5', metin: '#0b221c', soluk: '#4a625a', cizgi: 'rgb(11 34 28 / .16)',
      vurgu: '#1fd17a', 'vurgu-metin': '#062017', koyu: '#0b221c', 'koyu-metin': '#e4f2e8', 'koyu-soluk': '#8fb3a2',
      gecis: '#1fd17a',
      'font-baslik': "'Familjen Grotesk', system-ui, sans-serif", 'font-govde': "'Rethink Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '0.98',
      radius: '999px', 'radius-buyuk': '22px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['giris', 'hat', 'hizmetOzet', 'rakamlar', 'tankPulu', 'yorumlar', 'mesai', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'markalar', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'sss', 'cta'] },
    { id: 'uygunluk', baslik: 'LPG Uygunluk', menu: 'Uygunluk', bolumler: ['uygunluk', 'hat', 'sss', 'cta'] },
    { id: 'tank', baslik: 'Tank Muayenesi', menu: 'Tank', bolumler: ['tankPulu', 'sss', 'cta'] },
    { id: 'filo', baslik: 'Taksi ve Filo', menu: 'Filo', bolumler: ['anlasmalar', 'yorumlar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { giris, hat, tankPulu, uygunluk, mesai, galeri },
  onHazir: sayfaDegisinceBasaDon,
});

// Sayfa değişirken motor yeni içeriği aşağıdaki kaydırma konumunda kurup sonra başa dönüyor; o arada
// "once" tetikleyicileri kurulurken kendini siler ve ScrollTrigger hata atar. İçerik değişmeden hemen
// önce (geçiş perdesi ekranı kaplarken) başa dönüyoruz; motora dokunmadan.
function sayfaDegisinceBasaDon(ctx) {
  const main = document.getElementById('sayfa');
  const ozellik = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (!main || !ozellik?.set) return;
  Object.defineProperty(main, 'innerHTML', {
    configurable: true,
    get() {
      return ozellik.get.call(this);
    },
    set(html) {
      if (window.scrollY > 0) (ctx?.lenis ? ctx.lenis.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0));
      if (window.scrollY > 0) window.scrollTo(0, 0);
      ozellik.set.call(this, html);
    },
  });
}
