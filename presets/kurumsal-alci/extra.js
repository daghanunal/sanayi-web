// Sektöre özel modüller (üretici): künye (merkez + fabrikalar), ürün seçimi + teknik föy penceresi, fabrikalar
// haritası. Veriler alcibay.com ürün föylerinden ve firma sayfasından.
import { esc, gsap, reducedMotion, icons } from '../../shared/core.js';
import { tanimMetni } from '../_kurumsal/bolumler.js';

// "Yenice / Tarsus / Mersin" → "Tarsus", "Bala / Ankara" → "Bala"
const ilce = (il) => { const p = il.split('/').map((x) => x.trim()); return p.length > 2 ? p[1] : p[0]; };

export const urunBul = {
  render(d) {
    const isler = d.isler || [];
    if (!isler.length) return '';
    return `
      <section class="k-bolum ub" aria-labelledby="ub-baslik">
        <div class="k-kap">
          <div class="ub__bas">
            <h2 class="k-h2" id="ub-baslik" data-bol>Ürün seçimi</h2>
            <p class="k-lead">Yapılacak iş seçilince uygun ürün ve teknik değerleri görünür.</p>
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
          <p class="ub__oneri">Uygun ürün</p>
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
          ${u.teknik?.length ? `<table class="ub__tablo"><tbody>${u.teknik.map(([a, v]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : '<p>Teknik değerleri için merkez aranabilir.</p>'}
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

// --- Künye: firmanın adı, ne ürettiği, merkez, fabrikalar ve telefon. Motorun künyesiyle aynı düzen
// (k-hero k-hero--kunye); üreticinin saat bilgisi yayımlanmadığı için "Bugün" satırı yerine fabrikalar yazılır.
export const hero = {
  render(d, { tema }) {
    const K = d.konumlar || [];
    const m = K.find((x) => x.id === 'merkez') || K[0];
    const fab = K.filter((x) => x.kapasite);
    const tel = d.iletisim.telefon;
    const harita = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.iletisim.mapsQuery || d.iletisim.adres)}`;
    return `
      <section class="k-hero k-hero--kunye" aria-label="Künye">
        <div class="k-kap k-hero__ic">
          <div class="k-hero__metin">
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="k-lead k-hero__tanim">${esc(tanimMetni(d))}</p>
            <dl class="k-kunye">
              <div><dt>Merkez</dt><dd>${esc(m ? `${m.adres}, ${m.il}` : d.iletisim.adres)}</dd></div>
              ${fab.length ? `<div><dt>Fabrikalar</dt><dd>${fab.map((x) => esc(x.il.split(' / ').slice(-2).join(' / '))).join(' · ')}</dd></div>` : ''}
              <div><dt>Telefon</dt><dd><a href="tel:${tel.replace(/[^\d+]/g, '')}">${esc(tel)}</a></dd></div>
            </dl>
            <div class="k-butonlar">
              <a class="k-btn" href="tel:${tel.replace(/[^\d+]/g, '')}">${icons.phone}<span>Ara</span></a>
              <a class="k-btn k-btn--ikincil" href="#/urunler" data-rota="urunler"><span>Ürünler</span></a>
              <a class="k-btn k-btn--ikincil" href="${harita}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            </div>
          </div>
          <figure class="k-hero__gorsel" data-perde><div class="k-hero__gorsel-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div><span class="ka-temsili">3D görsel · temsilî</span></figure>
        </div>
      </section>`;
  },
};

// --- Fabrikalar: harita + kapasite (alcibay.com'da yayımlanan günlük kapasiteler) --------------------------
export const fabrikalar = {
  render(d) {
    const h = d.harita;
    const K = d.konumlar || [];
    if (!h || !K.length) return '';
    const fab = K.filter((x) => x.kapasite);
    const max = Math.max(...fab.map((x) => x.kapasite));
    const m = K.find((x) => x.id === 'merkez') || K[0];
    const [b, t] = fab;
    return `
      <section class="k-bolum ka-fab" aria-labelledby="ka-fab-baslik">
        <div class="k-kap">
          <div class="ka-fab__bas">
            <h2 class="k-h2" id="ka-fab-baslik" data-bol>Merkez ve fabrikalar</h2>
          </div>
          <div class="ka-fab__ic">
            <figure class="ka-harita">
              <svg viewBox="${h.viewBox}" role="img" aria-label="Türkiye haritasında merkez ve fabrikalar">
                <path class="ka-harita__tr" d="${h.path}"/>
                ${b && t ? `<path class="ka-harita__yol" d="M${b.xy[0]} ${b.xy[1]} Q ${b.xy[0] + 150} ${(b.xy[1] + t.xy[1]) / 2 - 30} ${t.xy[0]} ${t.xy[1]}"/>` : ''}
                ${K.map((x) => `<g class="ka-harita__nokta ${x.kapasite ? 'is-fab' : ''}" transform="translate(${x.xy[0]} ${x.xy[1]})">${x.kapasite ? '<circle class="ka-harita__dalga" r="22"/>' : ''}<circle r="${x.kapasite ? 10 : 7}"/></g>`).join('')}
                <text class="ka-harita__lb" x="${m.xy[0] - 18}" y="${m.xy[1] - 18}" text-anchor="end">Merkez</text>
                ${fab.map((x) => `<text class="ka-harita__lb" x="${x.xy[0] + 24}" y="${x.xy[1] + 8}">${esc(ilce(x.il))}</text>`).join('')}
              </svg>
            </figure>
            <ul class="ka-fab__liste">
              ${fab.map((x) => `
                <li>
                  <div class="ka-fab__ust"><h3 class="k-h3">${esc(x.ad)}</h3><span>${esc(x.il)}</span></div>
                  <p class="ka-fab__deger"><b data-sayac="${x.kapasite}">${x.kapasite.toLocaleString('tr-TR')}</b> ton/gün${x.acilis ? ` · ${x.acilis}'den beri` : ''}</p>
                  <span class="ka-fab__bar" style="--w:${(x.kapasite / max) * 100}%"></span>
                  ${x.not ? `<p class="ka-fab__not">${esc(x.not)}</p>` : ''}
                </li>`).join('')}
            </ul>
          </div>
          <p class="ka-kaynak">Kapasiteler firmanın kendi sitesinde yayımlanan günlük üretim kapasiteleridir.</p>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.fromTo(el.querySelector('.ka-harita__tr'), { strokeDashoffset: 6000, strokeDasharray: 6000, fillOpacity: 0 }, {
      strokeDashoffset: 0, fillOpacity: 1, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: el, start: 'top 75%', toggleActions: 'play none none none' },
    });
    gsap.fromTo(el.querySelectorAll('.ka-fab__bar'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.15, ease: 'power3.out', transformOrigin: 'left', scrollTrigger: { trigger: el, start: 'top 70%', toggleActions: 'play none none none' } });
  },
};
