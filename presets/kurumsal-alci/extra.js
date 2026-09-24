// Sektöre özel modül: "Ne yapacaksınız?" ürün seçici + teknik föy penceresi. Veriler alcibay.com ürün föylerinden.
import { esc, gsap, reducedMotion } from '../../shared/core.js';

export const urunBul = {
  render(d) {
    const isler = d.isler || [];
    if (!isler.length) return '';
    return `
      <section class="k-bolum ub" aria-labelledby="ub-baslik">
        <div class="k-kap">
          <div class="ub__bas">
            <h2 class="k-h2" id="ub-baslik" data-bol>Ne yapacaksınız?</h2>
            <p class="k-lead">İşi seçin; doğru ürünü, sarfiyatını ve uygulama süresini görün.</p>
          </div>
          <div class="ub__ic">
            <div class="ub__isler" role="radiogroup" aria-label="Yapılacak iş">
              ${isler.map((x, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-is="${esc(x.id)}">${esc(x.soru)}</button>`).join('')}
            </div>
            <div class="ub__sonuc" aria-live="polite"></div>
          </div>
        </div>
        <dialog class="k-dialog ub__foy" aria-labelledby="ub-foy-baslik"><div class="k-dialog__ic" data-lenis-prevent></div></dialog>
      </section>`;
  },
  mount(el, d) {
    const sonuc = el.querySelector('.ub__sonuc');
    const foy = el.querySelector('.ub__foy');
    const urun = (id) => d.urunler.find((u) => u.id === id);
    const panel = (id) => d.paneller?.find((p) => p.id === id);
    const goster = (isId, ilk) => {
      const is = d.isler.find((x) => x.id === isId);
      const u = urun(is.urun);
      const p = !u && panel(is.urun);
      const ad = u ? u.ad : p ? `${p.ad}: ${p.tanim}` : is.urun;
      const gorsel = u ? u.torba : p?.gorsel;
      const anahtar = u ? u.anahtar : p ? [['Standart', p.standart], ['Kullanım', p.alanlar]] : [];
      sonuc.innerHTML = `
        <figure class="ub__gorsel ${u ? 'is-torba' : ''}" style="--c:${u?.renk || '#9aa0a3'}">${gorsel ? `<img src="${gorsel}" alt="${esc(ad)}">` : ''}</figure>
        <div class="ub__metin">
          <p class="ub__oneri">Önerimiz</p>
          <h3 class="k-h3">${esc(ad)}</h3>
          <p>${esc(is.not || u?.kisa || p?.metin || '')}</p>
          ${anahtar.length ? `<dl class="k-detay">${anahtar.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}
          ${u ? `<button type="button" class="k-btn k-btn--ikincil k-btn--kucuk" data-foy="${u.id}">Teknik föyü aç</button>` : ''}
        </div>`;
      if (!reducedMotion && !ilk) {
        gsap.fromTo(sonuc.querySelector('.ub__gorsel'), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'power3.out' });
        gsap.fromTo(sonuc.querySelector('.ub__metin'), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
      }
    };
    el.querySelectorAll('[data-is]').forEach((b) =>
      b.addEventListener('click', () => {
        el.querySelectorAll('[data-is]').forEach((x) => x.setAttribute('aria-checked', x === b));
        goster(b.dataset.is, false);
      })
    );
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-foy]');
      if (b) {
        const u = urun(b.dataset.foy);
        foy.querySelector('.k-dialog__ic').innerHTML = `
          <h2 id="ub-foy-baslik">${esc(u.ad)}</h2>
          <p>${esc(u.kisa)}</p>
          ${u.teknik?.length ? `<table class="ub__tablo"><tbody>${u.teknik.map(([a, v]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : '<p>Teknik değerler için arayın.</p>'}
          ${u.kullanim?.length ? `<h3 class="k-h3">Uygulama</h3><ol class="ub__adim">${u.kullanim.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
          ${u.dikkat?.length ? `<h3 class="k-h3">Dikkat</h3><ul class="k-maddeler">${u.dikkat.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <button type="button" class="k-btn" data-kapat-foy>Kapat</button>`;
        foy.showModal();
      }
      if (e.target === foy || e.target.closest('[data-kapat-foy]')) foy.close();
    });
    goster(d.isler[0].id, true);
  },
};
