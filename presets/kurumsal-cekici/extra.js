// Sektör modülleri (kurumsal-cekici, "Reflektör" yönü):
// (1) hero: künye. Tam ekran görsel (lib3d Cycles render'ı; telefonda dikey kadraj), dönen tepe lambası; ad, tanım,
//     Adres / Bugün / Telefon, Ara / WhatsApp / Yol tarifi.
// (2) konum, iletisim: motor bölümleri; saatler her gün 00:00–24:00 ise saat satırı "Her gün 24 saat" yazılır.
// (3) cta: dev telefon numarası; birincil düğme arama.
import { esc, waHref, telHref, mapsHref, kisaAdres, gunDurumu, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';

const k = (d) => d.kurumsal || {};
const surekli = (d) => (d.saatler || []).length === 7 && d.saatler.every((s) => s === '00:00-24:00');
const waMesaj = (d) => `Merhaba ${d.isletme.ad}, yolda kaldım. Çekici ya da yol yardım için bilgi almak istiyorum.`;
const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// --- (1) Künye ------------------------------------------------------------------------------

export const hero = {
  render(d, { tema }) {
    const b = surekli(d) ? { open: true, kunye: 'Şu an açık · 24 saat' } : d.saatler ? gunDurumu(d.saatler) : null;
    return `
      <section class="k-hero k-hero--kunye hz-hero" aria-label="Künye">
        <figure class="k-hero__gorsel" data-perde><div class="k-hero__gorsel-ic" data-paralaks><picture>${tema.heroGorselDar ? `<source media="(max-width: 760px)" srcset="${tema.heroGorselDar}">` : ''}<img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></picture></div></figure>
        <div class="k-kap k-hero__ic">
          <div class="k-hero__metin">
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="k-lead k-hero__tanim"><span class="hz-lamba" aria-hidden="true"><i></i></span>${esc(d.isletme.tanim || d.isletme.sektor)}</p>
            <dl class="k-kunye">
              <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
              ${b ? `<div><dt>Bugün</dt><dd><span class="k-durum ${b.open ? 'is-acik' : ''}"><span></span>${esc(b.kunye)}</span></dd></div>` : ''}
              <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
            </dl>
            <div class="k-butonlar">
              <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
              ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d, waMesaj(d))}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
              <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.from(el.querySelectorAll('.k-hero__tanim, .k-kunye > div, .k-butonlar'), { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', delay: 0.5, clearProps: 'all' });
  },
};

// --- (2) Saatler: her gün 24 saat --------------------------------------------------------------

function saatDuzelt(el, d) {
  if (!surekli(d)) return;
  el.querySelectorAll('.k-saatler .k-durum, .k-durum').forEach((p) => { if (p.closest('.k-saatler')) p.innerHTML = '<span></span>Şu an açık · Her gün 24 saat'; });
  el.querySelectorAll('.k-saatler dl').forEach((dl) => (dl.innerHTML = '<div><dt>Her gün</dt><dd>24 saat</dd></div>'));
}
export const konum = {
  render: (...a) => BOLUMLER.konum.render(...a),
  mount(el, d, ...a) { BOLUMLER.konum.mount?.(el, d, ...a); saatDuzelt(el, d); },
};
export const iletisim = {
  render: (...a) => BOLUMLER.iletisim.render(...a),
  mount(el, d, ...a) { BOLUMLER.iletisim.mount?.(el, d, ...a); saatDuzelt(el, d); },
};

// --- (3) Son bölüm: dev telefon numarası -------------------------------------------------------

export const cta = {
  render(d) {
    const c = k(d).cta || {};
    return `
      <section class="k-bolum hz-cta">
        <div class="k-kap">
          <h2 class="k-h2 hz-cta__baslik" data-bol>${esc(c.baslik || 'İletişim')}</h2>
          <a class="hz-cta__tel" href="${telHref(d)}"><span class="hz-cta__ikon">${icons.phone}</span><span>${esc(d.iletisim.telefon)}</span></a>
          <p class="k-lead">${esc(c.metin || '')}</p>
          <div class="k-butonlar">
            ${d.iletisim.whatsapp ? `<a class="k-btn" href="${waHref(d, waMesaj(d))}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
            <a class="k-btn k-btn--ikincil" href="#/iletisim" data-rota="iletisim">${esc(c.buton || 'İletişim formu')} ${ok}</a>
          </div>
        </div>
      </section>`;
  },
};
