import '../../shared/base.css';
import ana from '../../data/showroom.json';
import ek from '../../data/kurumsal-boya.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { hasarDosyasi } from './extra.js';
import './style.css';

// showroom.json'daki "kurulustan" gibi metin değerli istatistikleri motorun beklediği biçime çevir.
const v = derinBirlestir(ana, ek);
v.istatistikler = (v.istatistikler || []).map((s) => (typeof s.deger === 'string' ? { ...s, deger: 0, kurulustanHesapla: true } : s));

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'tam',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/showroom/hero.jpg`,
    heroAlt: 'Stüdyo ışığında parlayan siyah otomobil',
    logoAlt: 'Boya, kaporta ve detaylı bakım',
    baslikEki: 'Boya, kaporta ve detaylı bakım | Şaşmaz, Ankara',
    teklifEtiketi: 'Hasar fotoğrafı gönder',
    css: {
      zemin: '#0d0e10', yuzey: '#17181b', metin: '#ecebe6', soluk: '#a09f9a', cizgi: 'rgb(236 235 230 / .13)',
      vurgu: '#d8c29a', 'vurgu-metin': '#141414', koyu: '#060607', 'koyu-metin': '#ecebe6', 'koyu-soluk': '#8f8e8a',
      gecis: 'linear-gradient(100deg, #0d0e10 0%, #26272b 38%, #efe2c6 50%, #26272b 62%, #0d0e10 100%)',
      'font-baslik': "'Instrument Serif', Georgia, serif", 'font-govde': "'Manrope', system-ui, sans-serif",
      'baslik-agirlik': '400', 'baslik-harf': '-0.01em', 'baslik-satir': '0.98', radius: '12px', 'radius-buyuk': '26px',
      h2: 'clamp(38px, 5vw, 72px)', h3: 'clamp(22px, 2.2vw, 30px)',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'hasarDosyasi', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'kariyer', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'kurumsal-musteriler', baslik: 'Hasar ve Sigorta', bolumler: ['hasarDosyasi', 'anlasmalar', 'sss', 'cta'] },
    { id: 'islerimiz', baslik: 'İşlerimiz', bolumler: ['galeri', 'yorumlar', 'markalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hasarDosyasi },
});
