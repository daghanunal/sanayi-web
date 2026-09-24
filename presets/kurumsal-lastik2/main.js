import '../../shared/base.css';
import ana from '../../data/pist.json';
import ek from '../../data/kurumsal-lastik2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { tekerHero, halkalar, disOlcer, otelBolum } from './extra.js';
import './style.css';

// Halka: yuvarlak geometri. Buz mavisi zemin, çivit mürekkep, mor vurgu; her şey daire ve hap biçiminde.
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
    heroGorsel: `${B}img/pist/jant-sari.jpg`,
    heroAlt: 'Koyu alaşım jant ve sarı fren kaliperi',
    logoAlt: 'Lastik · jant · rot-balans',
    baslikEki: 'Lastik, jant ve rot-balans | Şaşmaz, Ankara',
    teklifEtiketi: 'Randevu al',
    hizmetEtiketi: 'Hizmetler',
    css: {
      zemin: '#eef0f7', yuzey: '#e0e3f0', metin: '#12113a', soluk: '#555879', cizgi: 'rgb(18 17 58 / .13)',
      vurgu: '#5a3cf0', 'vurgu-metin': '#ffffff', koyu: '#141238', 'koyu-metin': '#eef0f7', 'koyu-soluk': '#a5a7cc',
      gecis: 'repeating-radial-gradient(circle at 50% 50%, #5a3cf0 0 46px, #141238 46px 92px)',
      'font-baslik': "'Unbounded', system-ui, sans-serif", 'font-govde': "'Manrope', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-genislik': '100%', 'baslik-harf': '-0.035em', 'baslik-satir': '1.02',
      radius: '999px', 'radius-buyuk': '32px', h1: 'clamp(38px, 5.6vw, 88px)', h2: 'clamp(28px, 3.6vw, 52px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['tekerHero', 'hizmetOzet', 'halkalar', 'disOlcer', 'otelBolum', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'markalar', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo', bolumler: ['anlasmalar', 'otelBolum', 'cta'] },
    { id: 'dis-olcer', baslik: 'Diş Ölçer', bolumler: ['disOlcer', 'sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { tekerHero, halkalar, disOlcer, otelBolum },
});
