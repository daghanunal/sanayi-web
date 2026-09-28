import '../../shared/base.css';
import ana from '../../data/mikron.json';
import ek from '../../data/kurumsal-rektifiye2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';
import { gsap, reducedMotion } from '../../shared/core.js';
import { tavRengi, isFisi } from './extra.js';
import './style.css';

// "Tav Rengi" yönü: honlanmış çelik grisi zemin, geniş (expanded) grotesk başlıklar, çeliğin ısı renkleri
// (saman → bronz → mor → mavi) tek imza. Açık, soğuk, ölçü kâğıdı temizliğinde bir kurumsal site.
const B = import.meta.env.BASE_URL;
const v = derinBirlestir(ana, ek);
const GORSEL = {
  'Silindir honlama': `${B}img/kurumsal-rektifiye2/kesit-3d.jpg`,
  'Supap ve yuva işleri': `${B}img/kurumsal-rektifiye2/kafa.jpg`,
  'Torna ve freze işleri': `${B}img/kurumsal-rektifiye2/talas.jpg`,
  'Biyel ve yatak yuvası': `${B}img/kurumsal-rektifiye2/disli.jpg`,
};
v.hizmetler = v.hizmetler.map((h) => ({ ...h, gorsel: GORSEL[h.baslik] }));
v.galeri = [
  { src: `${B}img/kurumsal-rektifiye2/talas.jpg`, alt: 'Freze ucunun altından sıçrayan talaş' },
  ...(v.galeri || []),
  { src: `${B}img/kurumsal-rektifiye2/kesit-3d.jpg`, alt: 'Kesit: çapraz hon izli silindirler (temsilî 3D görsel)' },
  { src: `${B}img/kurumsal-rektifiye2/kafa.jpg`, alt: 'Tezgâhta bekleyen eksantrik milleri ve silindir kapağı' },
];

// Hero: motorun "yazı" künyesi; fotoğraf bandının üstünden tav renginde ısı şeridi geçer, adın üstünden bir kez ısı dalgası.
const hero = {
  render(d, ctx, s) {
    return BOLUMLER.hero.render(d, ctx, s).replace('</figure>', '<div class="tr-tav" aria-hidden="true"></div></figure>');
  },
  mount(el) {
    if (reducedMotion) return;
    const b = el.querySelector('.k-hero__baslik');
    requestAnimationFrame(() => {
      const satirlar = b?.querySelectorAll('.k-satir');
      if (b) gsap.fromTo(satirlar?.length ? satirlar : b, { '--tp': '110%' }, { '--tp': '-40%', duration: 2.4, stagger: 0.12, delay: 0.6, ease: 'power2.inOut' });
    });
    const tav = el.querySelector('.tr-tav');
    if (tav) {
      gsap.fromTo(tav, { xPercent: -100 }, {
        xPercent: 100, ease: 'none',
        scrollTrigger: { trigger: el.querySelector('.k-hero__gorsel'), start: 'top 90%', end: 'bottom top', scrub: true },
      });
    }
  },
};

kurumsal({
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-rektifiye2/talas.jpg`,
    heroAlt: 'Freze ucunun altından sıçrayan çelik talaş',
    altNot: "Pexels'ten alınan fotoğraflar ve 3D görseller temsilîdir. Yorumlar örnektir.",
    logoAlt: 'Motor rektifiye ve torna',
    baslikEki: 'Motor rektifiye ve torna | Şaşmaz, Ankara',
    teklifEtiketi: 'İletişim',
    css: {
      zemin: '#e4e7ea', yuzey: '#f3f4f6', metin: '#0f1216', soluk: '#525962', cizgi: 'rgb(15 18 22 / .14)',
      vurgu: '#5a2d91', 'vurgu-metin': '#ffffff', koyu: '#0e1014', 'koyu-metin': '#e9ebee', 'koyu-soluk': '#8f96a0',
      gecis: '#0e1014',
      'font-baslik': "'Anybody', system-ui, sans-serif", 'font-govde': "'Hanken Grotesk', system-ui, sans-serif",
      'baslik-agirlik': '800', 'baslik-genislik': '122%', 'baslik-harf': '-0.035em', 'baslik-satir': '1',
      radius: '2px', 'radius-buyuk': '2px', govde: '17px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'tavRengi', 'surec', 'cta'] },
    { id: 'hakkinda', baslik: 'Hakkında', bolumler: ['hakkimizda', 'markalar', 'galeri', 'cta'] },
    { id: 'is-fisi', baslik: 'İş fişi', bolumler: ['isFisi', 'sss', 'cta'] },
    { id: 'servisler', baslik: 'Usta ve servisler', bolumler: ['anlasmalar', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hero, tavRengi, isFisi },
});
