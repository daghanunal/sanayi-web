// Sektör modülleri ("Ölçü Karnesi"):
// (1) hero: motorun künyesi + altında kaydırdıkça kayan mikrometre cetveli (süs; değer göstermez)
// (2) karne: revizyon karnesine yazılan ölçüler ve her birinin neyi gösterdiği (değer yok, liste)
// (3) sebep: turboyu bozan dört sebep ve her birinde kontrol edilen yer
import { esc, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';

const k = (d) => d.kurumsal || {};

// --- (1) Künye + cetvel ----------------------------------------------------------------------
const cetvel = () => {
  const cizgi = [];
  for (let i = 0; i <= 240; i++) {
    const x = i * 10;
    const boy = i % 10 === 0 ? 26 : i % 5 === 0 ? 17 : 10;
    cizgi.push(`<line x1="${x}" y1="0" x2="${x}" y2="${boy}"/>`);
    if (i % 10 === 0) cizgi.push(`<text x="${x + 4}" y="38">${i / 10}</text>`);
  }
  return `<div class="tk-cetvel" aria-hidden="true"><svg viewBox="0 0 2400 44" preserveAspectRatio="xMinYMin meet"><g>${cizgi.join('')}</g></svg><span class="tk-cetvel__ok"></span></div>`;
};

export const hero = {
  render(d, ctx, sorgu) {
    const html = BOLUMLER.hero.render(d, ctx, sorgu);
    const yer = '<figure class="k-hero__gorsel"';
    return html.includes(yer) ? html.replace(yer, `${cetvel()}${yer}`) : html;
  },
  mount(el, d, ctx, sorgu) {
    BOLUMLER.hero.mount?.(el, d, ctx, sorgu);
    const g = el.querySelector('.tk-cetvel g');
    if (reducedMotion || !g) return;
    gsap.fromTo(g, { x: 0 }, {
      x: -420, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.5 },
    });
  },
};

// --- (2) Revizyon karnesi: ölçülenler --------------------------------------------------------
export const karne = {
  render(d) {
    const x = k(d).karne;
    if (!x?.olculer?.length) return '';
    return `
      <section class="k-bolum tk-karne" aria-labelledby="tk-karne-b">
        <div class="k-kap tk-karne__ic">
          <div class="tk-karne__sol">
            <h2 class="k-h2" id="tk-karne-b" data-bol>${esc(x.baslik || 'Revizyon karnesi')}</h2>
            ${x.metin ? `<p class="k-lead">${esc(x.metin)}</p>` : ''}
          </div>
          <article class="tk-kart">
            <header class="tk-kart__bas">
              <div><b>${esc(d.isletme.ad)}</b><span>Turbo revizyon karnesi</span></div>
            </header>
            <ol class="tk-kart__liste" data-sira>
              ${x.olculer.map(([ad, not]) => `<li class="tk-s"><span class="tk-s__ad">${esc(ad)}</span><span class="tk-s__not">${esc(not)}</span></li>`).join('')}
            </ol>
            ${x.not ? `<footer class="tk-kart__alt"><p>${esc(x.not)}</p></footer>` : ''}
          </article>
        </div>
      </section>`;
  },
};

// --- (3) Turboyu bozan sebepler --------------------------------------------------------------
export const sebep = {
  render(d) {
    const s = k(d).sebep;
    if (!s?.liste?.length) return '';
    return `
      <section class="k-bolum tk-sebep" aria-labelledby="tk-sebep-b">
        <div class="k-kap">
          <div class="tk-sebep__bas">
            <h2 class="k-h2" id="tk-sebep-b" data-bol>${esc(s.baslik || 'Turboyu bozan sebepler')}</h2>
            ${s.metin ? `<p class="k-lead">${esc(s.metin)}</p>` : ''}
          </div>
          <ol class="tk-sebep__liste" data-sira>
            ${s.liste.map((x, i) => `
              <li>
                <span class="tk-sebep__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                <h3 class="k-h3">${esc(x.baslik)}</h3>
                <p>${esc(x.metin)}</p>
                ${x.kontrol ? `<p class="tk-sebep__bak"><span>Kontrol edilen yer</span>${esc(x.kontrol)}</p>` : ''}
              </li>`).join('')}
          </ol>
        </div>
      </section>`;
  },
};
