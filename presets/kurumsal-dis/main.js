import '../../shared/base.css';
import ana from '../../data/sektor-dis.json';
import ek from '../../data/kurumsal-dis.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { arkHero, disHaritasi, hizmetler, ozet } from './extra.js';
import './style.css';

// "Diş haritası" yönü: porselen buz beyazı zemin, derin çivit, diş eti pembesi vurgu.
// Kemer (dental ark) motifi: hero penceresi, diş halkası, harita. Fotoğraflar yumuşak kemer içinde.
const GUN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KISA = {
  muayene: 'Dişler, diş eti ve çene eklemi; gerekirse röntgen.',
  temizlik: 'Diş taşı ve renklenme, ardından cila.',
  dolgu: 'Diş renginde kompozit, ısırma kontrolüyle.',
  kanal: 'Lokal anesteziyle, çoğu dişte tek seans.',
  implant: 'Röntgenle değerlendirme, aşamalı tedavi.',
  protez: 'Ölçü, prova, rahat edene kadar ayar.',
  ortodonti: 'Tel ya da şeffaf plak seçenekleri.',
  cocuk: 'Aletleri önce tanıtırız, acele etmeyiz.',
  cekim: 'Önce röntgen, sonra yazılı bakım notu.',
};
const DETAY = {
  muayene: [['Gerekirse', 'Röntgen'], ['Sonra', 'Plan birlikte konuşulur']],
  kanal: [['Anestezi', 'Lokal'], ['Seans', 'Çoğu dişte tek']],
  implant: [['Önce', 'Kemik değerlendirmesi'], ['Aşama', 'Kaynaşma, sonra üst yapı']],
  ortodonti: [['Seçenek', 'Tel · şeffaf plak'], ['Takip', 'Düzenli kontrol']],
  cocuk: [['Koruma', 'Fissür örtücü · flor'], ['İlk ziyaret', 'Tanışma']],
  cekim: [['Önce', 'Röntgen'], ['Ertesi gün', 'Telefonla ararız']],
};
const veri = derinBirlestir(ana, ek);
veri.hizmetler = ana.hizmetler.map((h) => ({ ...h, kisa: KISA[h.id], detay: DETAY[h.id] || [] }));

const ctx = kurumsal({
  veri,
  tema: {
    hero: 'bolunmus',
    gecis: 'perde',
    yer: "Etimesgut'ta",
    heroGorsel: `${import.meta.env.BASE_URL}img/sektor-dis/hekim.jpg`,
    heroAlt: 'Hekim, koltuktaki hastayı muayene ederken',
    logoAlt: 'Muayene · Tedavi · Çocuk',
    baslikEki: 'Diş kliniği | Etimesgut, Ankara',
    teklifEtiketi: 'Randevu al',
    hizmetEtiketi: 'Tedaviler',
    metinBoyutu: true,
    css: {
      zemin: '#eef1f8', yuzey: '#e0e5f2', metin: '#131838', soluk: '#4d5378', cizgi: 'rgb(19 24 56 / .14)',
      vurgu: '#de3d66', 'vurgu-metin': '#ffffff', koyu: '#171b45', 'koyu-metin': '#eef0fb', 'koyu-soluk': '#a6abd2',
      gecis: '#171b45',
      'font-baslik': "'Livvic', system-ui, sans-serif", 'font-govde': "'Nunito Sans', system-ui, sans-serif",
      'baslik-agirlik': '700', 'baslik-harf': '-0.03em', 'baslik-satir': '1.02',
      radius: '16px', 'radius-buyuk': '30px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['arkHero', 'hizmetOzet', 'disHaritasi', 'rakamlar', 'ozet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kliniğimiz', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'galeri', 'cta'] },
    { id: 'hizmetler', baslik: 'Tedaviler', bolumler: ['hizmetler', 'surec', 'cta'] },
    { id: 'dis-haritasi', baslik: 'Diş haritası', bolumler: ['disHaritasi', 'surec', 'cta'] },
    { id: 'sorular', baslik: 'Sorular', bolumler: ['sss', 'yorumlar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { arkHero, disHaritasi, hizmetler, ozet },
  ld: (d) => ({
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: d.isletme.ad,
    description: d.isletme.slogan,
    telephone: d.iletisim.telefon,
    foundingDate: String(d.isletme.kurulus),
    address: { '@type': 'PostalAddress', streetAddress: d.iletisim.adres, addressLocality: 'Etimesgut', addressRegion: 'Ankara', addressCountry: 'TR' },
    openingHoursSpecification: d.saatler
      .map((s, i) => (s ? { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${GUN[i]}`, opens: s.split('-')[0], closes: s.split('-')[1] } : null))
      .filter(Boolean),
    ...(d.puan && { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet } }),
  }),
});

// Motor, yeni sayfanın ScrollTrigger'larını eski kaydırma konumundayken kurar ve ancak sonra başa
// sarar. Sayfanın altından başka sayfaya geçince "once" tetikleyicileri kurulurken kendini silip
// ScrollTrigger'ı hataya düşürüyordu. Sayfa içeriği yazılmadan hemen önce (perde kapalıyken) başa sarıyoruz.
const sayfa = document.getElementById('sayfa');
const yaz = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty(sayfa, 'innerHTML', {
  configurable: true,
  get() { return yaz.get.call(this); },
  set(v) {
    if (ctx?.lenis) ctx.lenis.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    yaz.set.call(this, v);
  },
});
