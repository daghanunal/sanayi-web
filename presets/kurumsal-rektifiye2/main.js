import '../../shared/base.css';
import ana from '../../data/mikron.json';
import ek from '../../data/kurumsal-rektifiye2.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';
import { esc, gsap, reducedMotion } from '../../shared/core.js';
import { tavRengi, isFisi, mesai, serit } from './extra.js';
import './style.css';

// "Tav Rengi" yönü: honlanmış çelik grisi zemin, geniş (expanded) grotesk başlıklar, çeliğin ısı renkleri
// (saman → bronz → mor → mavi) tek imza. Açık, soğuk, ölçü kâğıdı temizliğinde bir kurumsal site.
const B = import.meta.env.BASE_URL;
const v = derinBirlestir(ana, ek);
const GORSEL = {
  'Supap ve yuva işleme': `${B}img/kurumsal-rektifiye2/kafa.jpg`,
  'Torna ve freze işleri': `${B}img/kurumsal-rektifiye2/talas.jpg`,
  'Biyel ve yatak yuvası': `${B}img/kurumsal-rektifiye2/disli.jpg`,
};
v.hizmetler = v.hizmetler.map((h) => ({
  ...h,
  sureHam: h.sure,
  detay: [['Tolerans', h.tolerans], ['Ortalama süre', h.sure]].filter(([, x]) => x),
  sure: null,
  kisa: h.aciklama.split('. ')[0].replace(/\.$/, '') + '.',
  gorsel: GORSEL[h.baslik],
}));
// Paylaşılan veride iki yorumun sahibi uydurma işletme adı; adı yerine rolü yazalım.
const ROL = { 'Oto Kardeşler Motor': ['Motor ustası', 'Şaşmaz'], 'Yücel Oto': ['Servis', 'Etimesgut'] };
v.yorumlar = (v.yorumlar || []).map((y) => (ROL[y.ad] ? { ...y, ad: ROL[y.ad][0], arac: ROL[y.ad][1] } : y));
v.galeri = [
  { src: `${B}img/kurumsal-rektifiye2/talas.jpg`, alt: 'Freze ucunun altından sıçrayan talaş' },
  ...(v.galeri || []),
  { src: `${B}img/kurumsal-rektifiye2/kafa.jpg`, alt: 'Tezgâhta bekleyen eksantrik miller ve silindir kapağı' },
];

// Hero: motorun "yazı" hero'su + fotoğraf bandının üstüne ölçü çizgisi + altına tolerans şeridi.
const r = v.rapor;
const hero = {
  render(d, ctx, s) {
    let html = BOLUMLER.hero.render(d, ctx, s);
    const olcu = r
      ? `<div class="tr-olcu" aria-hidden="true">
          <svg viewBox="0 0 400 60" preserveAspectRatio="none"><path class="tr-olcu__c" d="M2 30H398M2 12V48M398 12V48M2 30l14-7M2 30l14 7M398 30l-14-7M398 30l-14 7"/></svg>
          <span class="tr-olcu__d">Ø ${esc(r.silindirler[0].olcu)} <small>mm</small></span>
          <span class="tr-olcu__e">Ovalite ${esc(r.silindirler[0].ovalite)} mm<span class="tr-olcu__s"> · ${esc(r.olcuSinifi)}</span></span>
        </div>`
      : '';
    html = html.replace('</figure>', `<div class="tr-tav" aria-hidden="true"></div>${olcu}</figure>`);
    return html.replace(/<\/section>\s*$/, `${serit.render(d)}</section>`);
  },
  mount(el) {
    if (reducedMotion) return;
    const b = el.querySelector('.k-hero__baslik');
    // Başlıktan bir kez ısı dalgası geçer (satırlar SplitText'le ayrıldıktan sonra).
    requestAnimationFrame(() => {
      const satirlar = b.querySelectorAll('.k-satir');
      gsap.fromTo(satirlar.length ? satirlar : b, { '--tp': '110%' }, { '--tp': '-40%', duration: 2.4, stagger: 0.12, delay: 0.6, ease: 'power2.inOut' });
    });
    const olcu = el.querySelector('.tr-olcu__c');
    if (olcu) {
      gsap.fromTo(olcu, { strokeDasharray: 900, strokeDashoffset: 900 }, { strokeDashoffset: 0, duration: 1.6, delay: 1, ease: 'power2.inOut' });
      gsap.from(el.querySelectorAll('.tr-olcu span'), { opacity: 0, y: 10, duration: 0.6, delay: 1.6, stagger: 0.1 });
    }
    gsap.fromTo(el.querySelector('.tr-tav'), { xPercent: -100 }, {
      xPercent: 100, ease: 'none',
      scrollTrigger: { trigger: el.querySelector('.k-hero__gorsel'), start: 'top 90%', end: 'bottom top', scrub: true },
    });
  },
};

// Motor, yeni sayfanın ScrollTrigger'larını eski sayfanın kaydırma konumunda kurup sonra başa sarıyor; derinden
// gelince "once" tetikleyicileri kendini silip hata veriyor. Perde kapanırken (0,42 sn) biz önce başa alalım.
let motor = null;
addEventListener('hashchange', () => {
  if (reducedMotion || !motor) return;
  gsap.delayedCall(0.4, () => (motor.lenis ? motor.lenis.scrollTo(0, { immediate: true, force: true }) : scrollTo(0, 0)));
});

kurumsal({
  onHazir: (c) => (motor = c),
  veri: v,
  tema: {
    hero: 'yazi',
    gecis: 'yan',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/kurumsal-rektifiye2/talas.jpg`,
    heroAlt: 'Freze ucunun altından sıçrayan çelik talaş',
    logoAlt: 'Rektifiye · Torna · Ölçü',
    baslikEki: 'Motor rektifiye ve torna | Şaşmaz, Ankara',
    teklifEtiketi: 'İş fişi',
    hizmetEtiketi: 'Tezgâhtaki işler',
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
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'tavRengi', 'rakamlar', 'isFisi', 'yorumlar', 'mesai', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'markalar', 'sss', 'cta'] },
    { id: 'servisler', baslik: 'Ustalara ve Servislere', menu: 'Servislere', bolumler: ['anlasmalar', 'surec', 'cta'] },
    { id: 'is-fisi', baslik: 'İş Fişi', bolumler: ['isFisi', 'tavRengi', 'galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hero, tavRengi, isFisi, mesai },
});
