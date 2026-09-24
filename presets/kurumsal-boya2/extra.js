// Sektöre özel modül: boya kalınlık ölçümü. Yandan görünüşlü teknik çizim araç; bölüm ekrana girince
// ölçüm probu panelleri tek tek gezer, her panelde mikron değeri sayar ve panel ekspertiz renk koduyla boyanır.
// Seçilen panelin boya katmanları (kataforez, astar, baz, vernik, varsa macun ve yeni boya) kesit olarak çizilir.
import { esc, waHref, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';

// [id, ad, mikron (null = plastik, cihaz ölçmez), svg şekli]
const PANELLER = [
  ['arka-tampon', 'Arka tampon', null, 'M18 110 L62 102 L62 170 L26 170 Q12 142 18 110 Z'],
  ['bagaj', 'Bagaj kapağı', 121, 'M40 92 L176 86 L182 100 L46 104 Z'],
  ['arka-camurluk', 'Arka çamurluk', 176, 'M62 108 L200 100 L200 170 L184 170 A44 44 0 0 0 96 170 L62 170 Z'],
  ['arka-kapi', 'Arka kapı', 412, 'M204 100 L318 100 L318 176 L204 176 Z'],
  ['on-kapi', 'Ön kapı', 134, 'M322 100 L428 100 L428 176 L322 176 Z'],
  ['tavan', 'Tavan', 109, 'M206 56 L232 40 L382 40 L408 56 L392 60 L222 60 Z'],
  ['on-camurluk', 'Ön çamurluk', 238, 'M432 104 L546 112 L546 170 L516 170 A44 44 0 0 0 432 170 Z'],
  ['kaput', 'Kaput', 127, 'M430 88 L560 98 L586 110 L546 112 L432 102 Z'],
  ['on-tampon', 'Ön tampon', null, 'M548 114 L584 116 Q596 142 590 170 L548 170 Z'],
];

const DURUM = {
  orijinal: { ad: 'Fabrika boyası', aralik: '160 µm altı', yorum: 'Kataforez, astar, baz boya ve vernik fabrikadan geldiği gibi. Pasta yapılabilir; vernik payı yeterli.' },
  boyali: { ad: 'Boyanmış', aralik: '160-300 µm', yorum: 'Fabrika katlarının üstüne tamir astarı ve yeni boya gelmiş. Renk ve parlaklık tutuyorsa sorun değil; ekspertizde boyalı görünür.' },
  macun: { ad: 'Macun + boya', aralik: '300 µm üstü', yorum: 'Boyanın altında macun var; panel daha önce göçük düzeltilip boyanmış. Alım-satımda mutlaka sorulur; gerekirse sökülüp bakılır.' },
  plastik: { ad: 'Plastik parça', aralik: 'Ölçülmez', yorum: 'Tampon plastiktir, cihaz metal olmayan yüzeyde doğru okumaz. Burada gün ışığı lambasıyla renk ve parlaklık farkına bakarız.' },
};
const durumu = (um) => (um == null ? 'plastik' : um <= 160 ? 'orijinal' : um <= 300 ? 'boyali' : 'macun');

// Katman kesiti: 7 sabit yuva, yüksekliği sıfır olan görünmez.
const KATMANLAR = [
  ['kataforez', 'Kataforez'],
  ['astar', 'Fabrika astarı'],
  ['baz', 'Baz boya'],
  ['vernik', 'Vernik'],
  ['macun', 'Macun'],
  ['tamir', 'Tamir astarı'],
  ['yeni', 'Yeni boya + vernik'],
];
function katmanlar(um, durum) {
  const k = { kataforez: 0, astar: 0, baz: 0, vernik: 0, macun: 0, tamir: 0, yeni: 0 };
  if (durum === 'plastik') return k;
  const fabrika = Math.min(um, 110);
  k.kataforez = Math.round(fabrika * 0.2);
  k.astar = Math.round(fabrika * 0.25);
  k.baz = Math.round(fabrika * 0.17);
  k.vernik = fabrika - k.kataforez - k.astar - k.baz;
  if (durum === 'orijinal') { k.vernik += um - fabrika; return k; }
  let kalan = um - fabrika;
  if (durum === 'macun') { k.yeni = 60; k.tamir = 30; k.macun = kalan - 90; return k; }
  k.tamir = Math.round(kalan * 0.35);
  k.yeni = kalan - k.tamir;
  return k;
}

const OLCEK = 500; // ölçek çubuğu üst sınırı (µm)

export const mikron = {
  render() {
    return `
      <section class="k-bolum mk" aria-labelledby="mk-baslik">
        <div class="k-kap">
          <div class="mk__bas">
            <p class="mk__etiket"><span>Boya kalınlık ölçümü</span><span>Örnek araç</span></p>
            <h2 class="k-h2" id="mk-baslik" data-bol>Her panelin bir kalınlığı var</h2>
            <p class="k-lead">Fabrika boyası genelde 90 ile 160 mikron arasıdır. Üstünü görürsek o panel boyanmıştır, çok üstünü görürsek altında macun vardır. Pastaya da boyaya da bu ölçüyle başlarız.</p>
          </div>

          <div class="mk__izgara">
            <div class="mk__arac">
              <div class="mk__cizim">
                <svg class="mk__svg" viewBox="0 0 600 214" role="group" aria-label="Aracın yandan görünüşü, ölçülen paneller">
                  <g class="mk__olcu" aria-hidden="true">
                    <path d="M18 200 H590 M18 194 V206 M590 194 V206 M140 196 V204 M474 196 V204"/>
                  </g>
                  <path class="mk__cam" d="M184 92 L232 48 L312 48 L312 94 Z"/>
                  <path class="mk__cam" d="M318 94 L318 48 L378 48 L426 90 Z"/>
                  ${PANELLER.map(([id, ad, , d]) => `<g class="mk__p" data-p="${id}" data-d="yok" role="button" tabindex="0" aria-label="${esc(ad)}"><path d="${d}"/></g>`).join('')}
                  <g class="mk__teker" aria-hidden="true"><circle cx="140" cy="170" r="34"/><circle cx="140" cy="170" r="14"/><circle cx="474" cy="170" r="34"/><circle cx="474" cy="170" r="14"/></g>
                  <g class="mk__yazilar" aria-hidden="true">${PANELLER.map(([id]) => `<text data-y="${id}"></text>`).join('')}</g>
                  <g class="mk__prob" aria-hidden="true"><circle r="15"/><circle r="4"/><path d="M-24 0H-9M9 0H24M0 -24V-9M0 9V24"/></g>
                </svg>
              </div>
              <div class="mk__cipler" role="group" aria-label="Panel seçin">
                ${PANELLER.map(([id, ad]) => `<button type="button" data-c="${id}" data-d="yok" aria-pressed="false"><span>${esc(ad)}</span><b>—</b></button>`).join('')}
              </div>
            </div>

            <div class="mk__okuma" aria-live="polite">
              <div class="mk__ekran">
                <p class="mk__panel-ad">Ölçüm bekleniyor</p>
                <p class="mk__deger"><span class="mk__sayi">000</span><span class="mk__birim">µm</span></p>
                <p class="mk__durum" data-d="yok">—</p>
                <div class="mk__olcek" aria-hidden="true">
                  <span class="mk__bolge" style="--a:0;--b:${160 / OLCEK}"></span>
                  <span class="mk__bolge" style="--a:${160 / OLCEK};--b:${300 / OLCEK}"></span>
                  <span class="mk__bolge" style="--a:${300 / OLCEK};--b:1"></span>
                  <span class="mk__ibre"></span>
                  <span class="mk__etk" style="--a:0">0</span><span class="mk__etk" style="--a:${160 / OLCEK}">160</span><span class="mk__etk" style="--a:${300 / OLCEK}">300</span><span class="mk__etk" style="--a:1">500</span>
                </div>
              </div>
              <div class="mk__kesit">
                <div class="mk__yigin" aria-hidden="true">
                  ${KATMANLAR.map(([id]) => `<span data-k="${id}"></span>`).join('')}
                  <span class="mk__sac">Sac</span>
                </div>
                <ul class="mk__katlar">
                  ${KATMANLAR.map(([id, ad]) => `<li data-l="${id}"><i></i><span>${esc(ad)}</span><b>0 µm</b></li>`).join('')}
                </ul>
              </div>
              <p class="mk__yorum">Bölüm ekrana girince cihaz panelleri tek tek ölçer. Sonra istediğiniz panele dokunun.</p>
            </div>
          </div>

          <div class="mk__alt">
            <ul class="mk__lejant">
              ${Object.entries(DURUM).map(([id, x]) => `<li data-d="${id}"><i></i><span>${esc(x.ad)}</span><small>${esc(x.aralik)}</small></li>`).join('')}
            </ul>
            <div class="mk__cta">
              <button type="button" class="k-btn k-btn--ikincil mk__tekrar">Tekrar ölç</button>
              <a class="k-btn mk__wa" target="_blank" rel="noopener">Aracımı ölçtürmek istiyorum</a>
            </div>
          </div>
          <p class="mk__not">Değerler örnek bir aracın ölçümüdür. Sizin aracınızda her panel ayrı ölçülür, döküm size verilir.</p>
        </div>
      </section>`;
  },

  mount(el, d) {
    const svg = el.querySelector('.mk__svg');
    const prob = el.querySelector('.mk__prob');
    const sayi = el.querySelector('.mk__sayi');
    const birim = el.querySelector('.mk__birim');
    const panelAd = el.querySelector('.mk__panel-ad');
    const durumEl = el.querySelector('.mk__durum');
    const ibre = el.querySelector('.mk__ibre');
    const yorum = el.querySelector('.mk__yorum');
    const wa = el.querySelector('.mk__wa');
    const yuva = Object.fromEntries(KATMANLAR.map(([id]) => [id, el.querySelector(`[data-k="${id}"]`)]));
    const satir = Object.fromEntries(KATMANLAR.map(([id]) => [id, el.querySelector(`[data-l="${id}"]`)]));
    const g = Object.fromEntries(PANELLER.map(([id]) => [id, el.querySelector(`[data-p="${id}"]`)]));
    const cip = Object.fromEntries(PANELLER.map(([id]) => [id, el.querySelector(`[data-c="${id}"]`)]));
    const yazi = Object.fromEntries(PANELLER.map(([id]) => [id, el.querySelector(`[data-y="${id}"]`)]));
    const merkez = {};
    PANELLER.forEach(([id]) => {
      const b = g[id].getBBox();
      merkez[id] = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      yazi[id].setAttribute('x', merkez[id].x);
      yazi[id].setAttribute('y', merkez[id].y + 6);
    });
    yazi.tavan.setAttribute('y', 34);
    yazi.kaput.setAttribute('y', 84);
    yazi.bagaj.setAttribute('y', 80);

    wa.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımın boya kalınlık ölçümü için randevu almak istiyorum.`);

    const sayac = { v: 0 };
    let sayTw;
    const sayiYaz = (v) => (sayi.textContent = String(Math.round(v)).padStart(3, '0'));

    function isaretle(id) {
      const [, , um] = PANELLER.find((p) => p[0] === id);
      const du = durumu(um);
      g[id].dataset.d = du;
      cip[id].dataset.d = du;
      cip[id].querySelector('b').textContent = um == null ? 'PL' : um;
      yazi[id].textContent = um == null ? 'PL' : um;
    }

    function goster(id, hizli) {
      const [, ad, um] = PANELLER.find((p) => p[0] === id);
      const du = durumu(um);
      PANELLER.forEach(([x]) => {
        g[x].classList.toggle('is-secili', x === id);
        cip[x].setAttribute('aria-pressed', x === id);
      });
      panelAd.textContent = ad;
      durumEl.textContent = DURUM[du].ad;
      durumEl.dataset.d = du;
      el.querySelector('.mk__ekran').dataset.d = du;
      yorum.textContent = DURUM[du].yorum;
      sayTw?.kill();
      if (um == null) {
        sayi.textContent = 'PL';
        birim.textContent = 'plastik';
      } else {
        birim.textContent = 'µm';
        if (hizli || reducedMotion) { sayac.v = um; sayiYaz(um); }
        else sayTw = gsap.to(sayac, { v: um, duration: 0.55, ease: 'power2.out', onUpdate: () => sayiYaz(sayac.v) });
      }
      ibre.style.setProperty('--x', um == null ? 0 : Math.min(um / OLCEK, 1));
      ibre.hidden = um == null;
      const k = katmanlar(um ?? 0, du);
      const top = Object.values(k).reduce((a, b) => a + b, 0);
      KATMANLAR.forEach(([kid]) => {
        yuva[kid].style.flexBasis = `${(k[kid] / OLCEK) * 100}%`;
        satir[kid].hidden = !k[kid];
        satir[kid].querySelector('b').textContent = `${k[kid]} µm`;
      });
      el.querySelector('.mk__kesit').dataset.bos = top ? 'false' : 'true';
    }

    PANELLER.forEach(([id]) => {
      const sec = () => { tara?.kill(); PANELLER.forEach(([x]) => isaretle(x)); gsap.to(prob, { x: merkez[id].x, y: merkez[id].y, duration: reducedMotion ? 0 : 0.35, ease: 'power2.out' }); goster(id); };
      g[id].addEventListener('click', sec);
      g[id].addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sec(); } });
      cip[id].addEventListener('click', sec);
    });

    // Tarama: prob sırayla panelleri gezer.
    let tara;
    const SIRA = ['on-tampon', 'kaput', 'on-camurluk', 'on-kapi', 'tavan', 'arka-kapi', 'arka-camurluk', 'bagaj', 'arka-tampon'];
    function sifirla() {
      PANELLER.forEach(([id]) => {
        g[id].dataset.d = 'yok';
        cip[id].dataset.d = 'yok';
        cip[id].querySelector('b').textContent = '—';
        yazi[id].textContent = '';
      });
    }
    function taramaBaslat() {
      tara?.kill();
      sifirla();
      gsap.set(prob, { x: 620, y: 150, opacity: 1 });
      tara = gsap.timeline({ onComplete: () => goster('arka-kapi', true) });
      SIRA.forEach((id) => {
        tara.to(prob, { x: merkez[id].x, y: merkez[id].y, duration: 0.24, ease: 'power2.inOut' })
          .add(() => { isaretle(id); goster(id); })
          .fromTo(g[id].querySelector('path'), { opacity: 0.35 }, { opacity: 1, duration: 0.2 }, '<')
          .to({}, { duration: 0.12 });
      });
      tara.to(prob, { x: merkez['arka-kapi'].x, y: merkez['arka-kapi'].y, duration: 0.4, ease: 'power2.inOut' });
    }

    el.querySelector('.mk__tekrar').addEventListener('click', () => (reducedMotion ? null : taramaBaslat()));

    if (reducedMotion) {
      PANELLER.forEach(([id]) => isaretle(id));
      gsap.set(prob, { x: merkez['arka-kapi'].x, y: merkez['arka-kapi'].y });
      goster('arka-kapi', true);
      return;
    }
    gsap.set(prob, { x: 620, y: 150, opacity: 0 });
    goster('kaput', true);
    sifirla();
    panelAd.textContent = 'Ölçüm bekleniyor';
    durumEl.textContent = '—';
    durumEl.dataset.d = 'yok';
    sayi.textContent = '000';
    PANELLER.forEach(([id]) => g[id].classList.remove('is-secili'));
    ScrollTrigger.create({ trigger: svg, start: 'top 70%', once: true, onEnter: taramaBaslat });
  },
};
