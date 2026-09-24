import '../../shared/base.css';
import ana from '../../data/pist.json';
import ek from '../../data/kurumsal-lastik.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { ebatOkuyucu } from './extra.js';
import './style.css';

// pist.json'daki "kurulus" gibi metin değerli istatistikleri motorun beklediği biçime çevir.
const v = derinBirlestir(ana, ek);
v.istatistikler = (v.istatistikler || []).map((s) => (typeof s.deger === 'string' ? { ...s, deger: 0, kurulustanHesapla: true } : s));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/pist/lastik-yakin.jpg`,
    heroAlt: 'Yakından lastik diş deseni',
    logoAlt: 'Lastik, jant, rot-balans, filo',
    baslikEki: 'Lastik, jant ve rot-balans | Şaşmaz, Ankara',
    teklifEtiketi: 'Filo teklifi',
    css: {
      zemin: '#f3f3f0', yuzey: '#e5e5e0', metin: '#111213', soluk: '#55575b', cizgi: 'rgb(17 18 19 / .16)',
      vurgu: '#ffc800', 'vurgu-metin': '#111213', koyu: '#141517', 'koyu-metin': '#f3f3f0', 'koyu-soluk': '#9c9ea3',
      gecis: 'repeating-linear-gradient(-45deg, #ffc800 0 34px, #141517 34px 68px)',
      'font-baslik': "'Archivo', system-ui, sans-serif", 'font-govde': "'Archivo', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '122%', 'baslik-harf': '-0.02em', 'baslik-satir': '0.92', radius: '6px', 'radius-buyuk': '6px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'rakamlar', 'ebatOkuyucu', 'ozet', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'markalar', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Filo ve Otel', bolumler: ['anlasmalar', 'cta'] },
    { id: 'ebat-rehberi', baslik: 'Ebat Rehberi', bolumler: ['ebatOkuyucu', 'sss', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { ebatOkuyucu },
});
