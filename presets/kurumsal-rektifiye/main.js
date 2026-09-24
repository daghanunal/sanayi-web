import '../../shared/base.css';
import ana from '../../data/mikron.json';
import ek from '../../data/kurumsal-rektifiye.json';
import { kurumsal, derinBirlestir } from '../_kurumsal/engine.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';
import { esc } from '../../shared/core.js';
import { olcuSecici } from './extra.js';
import './style.css';

const v = derinBirlestir(ana, ek);
// Hizmetlerin tolerans alanı motorun "detay" kutucuklarına.
v.hizmetler = v.hizmetler.map((h) => ({ ...h, detay: h.tolerans ? [['Tolerans', h.tolerans], ['Süre', h.sure]] : undefined, sure: null, kisa: h.aciklama.split('. ')[0].replace(/\.$/, '') + '.' }));

// Tam ekran hero'ya ölçü göstergesi ekler (motorun hero'su değişmez, yalnızca sonuna bir katman eklenir).
const r = v.rapor;
const hero = {
  render(d, ctx, s) {
    const html = BOLUMLER.hero.render(d, ctx, s);
    const okuma = r ? `
      <div class="rk-okuma" aria-hidden="true">
        <span class="rk-okuma__e">Silindir 1 · son ölçü</span>
        <span class="rk-okuma__d"><i>Ø</i>${esc(r.silindirler[0].olcu)}<small>mm</small></span>
        <span class="rk-okuma__cetvel"></span>
        <span class="rk-okuma__e">Tolerans ±0,005 mm · ovalite ${esc(r.silindirler[0].ovalite)}</span>
      </div>` : '';
    return html.replace(/<\/section>\s*$/, `${okuma}</section>`);
  },
};

const B = import.meta.env.BASE_URL;
kurumsal({
  veri: v,
  tema: {
    hero: 'tam',
    gecis: 'perde',
    yer: "Şaşmaz'da",
    heroGorsel: `${B}img/mikron/torna.jpg`,
    heroAlt: 'Atölyede torna tezgâhı ve ayna',
    logoAlt: 'Motor rektifiye · torna',
    baslikEki: 'Motor rektifiye ve torna | Şaşmaz, Ankara',
    teklifEtiketi: 'İş gönderin',
    css: {
      zemin: '#101316', yuzey: '#1a1f24', metin: '#e8ebee', soluk: '#9aa3ab', cizgi: 'rgb(232 235 238 / .13)',
      vurgu: '#f4c542', 'vurgu-metin': '#121417', koyu: '#08090b', 'koyu-metin': '#e8ebee', 'koyu-soluk': '#8b949c',
      gecis: '#f4c542',
      'font-baslik': "'Chakra Petch', system-ui, sans-serif", 'font-govde': "'Barlow', system-ui, sans-serif",
      'baslik-agirlik': '600', 'baslik-harf': '-0.01em', 'baslik-satir': '1.0', radius: '0px', 'radius-buyuk': '0px',
      govde: '18px',
    },
  },
  sayfalar: [
    { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'ozet', 'hizmetOzet', 'rakamlar', 'olcuSecici', 'anlasmaOzet', 'yorumlar', 'cta'] },
    { id: 'kurumsal', baslik: 'Kurumsal', bolumler: ['hakkimizda', 'vizyon', 'kalite', 'cta'] },
    { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'markalar', 'cta'] },
    { id: 'servisler', baslik: 'Usta ve Servislere', menu: 'Servislere', bolumler: ['anlasmalar', 'surec', 'sss', 'cta'] },
    { id: 'olcu', baslik: 'Ölçü ve Rapor', bolumler: ['olcuSecici', 'galeri', 'cta'] },
    { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
  ],
  ekstralar: { hero, olcuSecici },
});
