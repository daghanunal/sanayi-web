import '../../shared/base.css';
import ana from '../../data/pist.json';
import ek from '../../data/kurumsal-lastik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { ebatOkuyucu, tekerKatman } from './extra.js';
import './style.css';

// pist.json'daki "kurulus" gibi metin değerli istatistikleri motorun beklediği biçime çevir.
const v = derinBirlestir(ana, ek);
v.istatistikler = (v.istatistikler || []).map((s) => (typeof s.deger === 'string' ? { ...s, deger: 0, kurulustanHesapla: true } : s));

const B = import.meta.env.BASE_URL;
// Petrol: kurumsal filo lastik merkezi. Soğuk kırık beyaz zemin, petrol mavisi-yeşili vurgu, koyu petrol yüzeyler;
// geniş (wdth 122) büyük harf Archivo başlıklar, dev yazı hero + geniş fotoğraf bandı.
kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-lastik/hero-lift.jpg`,
    heroAlt: 'Lifte kaldırılmış aracın yanında usta, sökülen tekeri taşıyor',
    logoAlt: 'Lastik, jant, rot-balans, filo',
    baslikEki: 'Lastik, jant ve rot-balans | Şaşmaz, Ankara',
    teklifEtiketi: 'Filo teklifi',
    altNot: 'Fotoğraflar: Pexels. 3D görseller temsilîdir.',
    css: {
      zemin: '#f2f5f5', yuzey: '#e1e9ea', metin: '#0c1a1d', soluk: '#4a5b5f', cizgi: 'rgb(12 26 29 / .15)',
      vurgu: '#0d6574', 'vurgu-metin': '#ffffff', koyu: '#0a1e23', 'koyu-metin': '#e8f0f0', 'koyu-soluk': '#9db1b4',
      gecis: 'repeating-linear-gradient(90deg, #0d6574 0 58px, #0b5a67 58px 60px, #0d6574 60px 118px, #0a1e23 118px 120px)',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Archivo', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '122%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.92', radius: '6px', 'radius-buyuk': '6px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'rakamlar', 'tekerKatman', 'ebatOkuyucu', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'tekerKatman', 'surec', 'markalar', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve Otel', bolumler: ['anlasmalar', 'cta'] },
    { id: 'ebat-rehberi', baslik: 'Ebat Rehberi', bolumler: ['ebatOkuyucu', 'sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { ebatOkuyucu, tekerKatman },
});
