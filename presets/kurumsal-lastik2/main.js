import '../../shared/base.css';
import ana from '../../data/pist.json';
import ek from '../../data/kurumsal-lastik2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { tekerHero, halkalar, disOlcer, otelBolum } from './extra.js';
import './style.css';

// Halka: yuvarlak geometri. Buz mavisi zemin, çivit mürekkep, mor vurgu; her şey daire ve hap biçiminde.
// Künye kendi modülünde (tekerHero): ad, iş, adres, bugün, telefon + halka içinde jant fotoğrafı.
const v = derinBirlestir(ana, ek);
const hek = v.kurumsal.hizmetEk || {};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, ...(hek[h.baslik] || {}) }));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-lastik2/jant-yuz.jpg`,
    heroAlt: 'Karşıdan çift renkli alaşım jant ve lastik',
    logoAlt: 'Lastik, jant ve rot-balans',
    baslikEki: 'Lastik, jant ve rot-balans | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    altNot: "Pexels'ten alınan fotoğraflar temsilîdir. Yorumlar örnektir.",
    css: {
      zemin: '#eef0f7', yuzey: '#e0e3f0', metin: '#12113a', soluk: '#555879', cizgi: 'rgb(18 17 58 / .13)',
      vurgu: '#5a3cf0', 'vurgu-metin': '#ffffff', koyu: '#141238', 'koyu-metin': '#eef0f7', 'koyu-soluk': '#a5a7cc',
      gecis: 'repeating-radial-gradient(circle at 50% 50%, #5a3cf0 0 46px, #141238 46px 92px)',
      'font-baslik': "'Unbounded', system-ui, sans-serif", 'font-govde': "'Manrope', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '1.07',
      radius: '999px', 'radius-buyuk': '32px', h1: 'clamp(38px, 5.2vw, 80px)', h2: 'clamp(28px, 3.6vw, 52px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['tekerHero', 'hizmetOzet', 'ozet', 'halkalar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'markalar', 'galeri', 'kariyer', 'cta'] },
    { id: 'dis-olcer', baslik: 'Diş Ölçer', bolumler: ['disOlcer', 'sss', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Şirket Araçları', menu: 'Şirket Araçları ve Otel', bolumler: ['anlasmalar', 'otelBolum', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { tekerHero, halkalar, disOlcer, otelBolum },
});
