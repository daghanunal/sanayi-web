// Sektöre özel modül: büyütme ölçüsü seçici + ölçü raporu örneği.
// STD çap ve ölçülen en büyük çap → aşınma, işleme payı sonrası inilecek ilk büyütme ölçüsü (STD/+0,25/…), ya da gömlek.
// Yanında teslimde verilen ölçü raporunun örneği (data: rapor). Sonuç WhatsApp mesajına dönüşür.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const PAY = 0.05; // aşınmanın üstüne bırakılan temiz işleme payı (mm)
const HON_SINIRI = 0.02; // bu kadar aşınmada STD ölçüde hafif hon yeterli sayılır
const sayi = (s) => parseFloat(String(s).replace(',', '.'));
const sapmaStil = (um) => {
  const v = Math.max(-5, Math.min(5, um)) * 10; // ±5 µm → ±50%
  return v >= 0 ? `left:50%;width:${Math.max(v, 3)}%;transform-origin:left` : `left:${50 + v}%;width:${-v}%;transform-origin:right`;
};
const yaz = (n, h = 2) => n.toLocaleString('tr-TR', { minimumFractionDigits: h, maximumFractionDigits: 3 });

export const olcuSecici = {
  render(d) {
    const ol = d.olculer || [];
    if (!ol.length) return '';
    const r = d.rapor;
    const nom = r ? sayi(r.nominal) : 0;
    return `
      <section class="k-bolum os" aria-labelledby="os-baslik">
        <div class="k-kap">
          <div class="os__bas">
            <p class="os__ust">Büyütme ölçüsü</p>
            <h2 class="k-h2" id="os-baslik" data-bol>Silindiriniz hangi ölçüye iner?</h2>
            <p class="k-lead">Standart çapı ve ölçtüğünüz en büyük çapı yazın. Aşınmanın üstüne ${yaz(PAY)} mm temiz işleme payı bırakarak inilecek ilk ölçüyü ve piston sınıfını görün.</p>
          </div>
          <div class="os__ic">
            <div class="os__panel">
              <form class="os__form" novalidate onsubmit="return false">
                <label><span>Standart (STD) çap</span><span class="os__girdi"><input name="std" inputmode="decimal" value="${yaz(ol[0].cap)}"><em>mm</em></span></label>
                <label><span>Ölçülen en büyük çap</span><span class="os__girdi"><input name="olcu" inputmode="decimal" value="${yaz(ol[0].cap + 0.09)}"><em>mm</em></span></label>
              </form>
              <div class="os__skala" aria-hidden="true">
                <div class="os__cubuk"><span class="os__asinma"></span><span class="os__pay"></span><span class="os__imlec"></span></div>
                <div class="os__isaretler"></div>
              </div>
              <div class="os__sonuc" role="status" aria-live="polite">
                <p class="os__etiket">Önerilen ölçü</p>
                <p class="os__ad" data-o="ad">+0,25</p>
                <dl class="os__degerler">
                  <div><dt>Aşınma</dt><dd data-o="asinma">0,09 mm</dd></div>
                  <div><dt>İşlenecek çap</dt><dd data-o="cap">75,25 mm</dd></div>
                  <div><dt>Piston</dt><dd data-o="piston">+0,25</dd></div>
                </dl>
                <p class="os__not" data-o="not"></p>
                <a class="k-btn os__gonder" target="_blank" rel="noopener">Bu ölçüyle iş gönderin</a>
              </div>
            </div>
            ${r ? `
            <article class="os__rapor" aria-label="Ölçü raporu örneği">
              <header class="os__rapor-bas"><span>Ölçü raporu</span><span class="os__damga">Örnek</span></header>
              <dl class="os__rapor-ust">
                <div><dt>Motor</dt><dd>${esc(r.is)}</dd></div>
                <div><dt>Ölçü sınıfı</dt><dd>${esc(r.olcuSinifi)}</dd></div>
                <div><dt>Nominal</dt><dd>Ø ${esc(r.nominal)} mm</dd></div>
              </dl>
              <table class="os__tablo">
                <thead><tr><th scope="col">Sil.</th><th scope="col">Çap (mm)</th><th scope="col">Sapma</th><th scope="col">Ovalite</th></tr></thead>
                <tbody>${r.silindirler.map((s) => {
                  const um = Math.round((sayi(s.olcu) - nom) * 1000);
                  return `<tr><th scope="row">${esc(s.no)}</th><td>${esc(s.olcu)}</td><td><span class="os__sapma"><i style="${sapmaStil(um)}"></i></span><b>${um > 0 ? '+' : ''}${um} µm</b></td><td>${esc(s.ovalite)}</td></tr>`;
                }).join('')}</tbody>
              </table>
              <p class="os__tol">Tolerans bandı ±5 µm</p>
              <dl class="os__rapor-alt">
                <div><dt>Krank</dt><dd>${esc(r.krank)}</dd></div>
                <div><dt>Planya</dt><dd>${esc(r.planya)}</dd></div>
              </dl>
              <footer>Rapor parçayla birlikte elden verilir. Değerler örnektir.</footer>
            </article>` : ''}
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const ol = d.olculer;
    const ofsetler = ol.map((x) => +(x.cap - ol[0].cap).toFixed(3));
    const ARALIK = ofsetler[ofsetler.length - 1] + 0.15;
    const form = el.querySelector('.os__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const isaretler = el.querySelector('.os__isaretler');
    const imlec = el.querySelector('.os__imlec');
    const asinmaCubuk = el.querySelector('.os__asinma');
    const payCubuk = el.querySelector('.os__pay');
    const gonder = el.querySelector('.os__gonder');
    const yuzde = (mm) => `${Math.max(0, Math.min(100, (mm / ARALIK) * 100))}%`;
    isaretler.innerHTML = ol.map((x, i) => `<span style="left:${yuzde(ofsetler[i])}" data-i="${i}"><em>${esc(x.piston)}</em></span>`).join('');

    const guncelle = (ilk) => {
      const std = sayi(form.elements.std.value);
      const olcu = sayi(form.elements.olcu.value);
      const gecerli = std > 20 && std < 200 && olcu > 0;
      const asinma = gecerli ? +(olcu - std).toFixed(3) : NaN;
      let secim = -1;
      let not = '';
      if (!gecerli) not = 'Çapları milimetre olarak yazın, ör. 75,00 ve 75,09.';
      else if (asinma < 0) not = 'Ölçülen çap standarttan küçük görünüyor; ölçüyü ve STD değerini kontrol edin.';
      else if (asinma <= HON_SINIRI) { secim = 0; not = 'Aşınma çok az. STD ölçüde hafif hon ve yeni segman çoğu zaman yeterli; ovaliteye bakıp karar veririz.'; }
      else {
        secim = ofsetler.findIndex((f, i) => i > 0 && std + f >= olcu + PAY - 1e-9);
        not = secim > 0 ? `Aşınmanın üstüne ${yaz(PAY)} mm temiz pay kalıyor. Pistonu bu sınıfta sipariş edin, honu pistona göre açarız.` : '';
      }
      const gomlek = gecerli && asinma > 0 && secim === -1;
      if (gomlek) not = 'Son büyütme ölçüsü de yetmiyor. Bu blokta gömlek çakıp STD ölçüye dönmek gerekir.';
      const x = secim >= 0 ? ol[secim] : null;
      o('ad').textContent = x ? (secim === 0 ? 'STD' : x.piston) : gomlek ? 'Gömlek' : '—';
      o('asinma').textContent = gecerli ? `${yaz(Math.max(0, asinma))} mm` : '—';
      o('cap').textContent = x ? `${yaz(std + ofsetler[secim])} mm` : gomlek ? `${yaz(std)} mm (gömlekle)` : '—';
      o('piston').textContent = x ? x.piston : gomlek ? 'STD' : '—';
      o('not').textContent = not;
      el.querySelectorAll('.os__isaretler span').forEach((s) => s.classList.toggle('is-secili', Number(s.dataset.i) === secim));
      el.classList.toggle('is-gomlek', gomlek);
      const a = gecerli ? Math.max(0, asinma) : 0;
      const hedef = { left: yuzde(a) };
      if (reducedMotion || ilk) {
        gsap.set(imlec, hedef);
      } else gsap.to(imlec, { ...hedef, duration: 0.5, ease: 'power3.out', overwrite: true });
      asinmaCubuk.style.width = yuzde(a);
      payCubuk.style.left = yuzde(a);
      payCubuk.style.width = gecerli && asinma > HON_SINIRI ? yuzde(PAY) : '0%';
      const mesaj = [
        `Merhaba ${d.isletme.ad}, silindir işi göndermek istiyorum.`,
        gecerli ? `STD çap: ${yaz(std)} mm` : '',
        gecerli ? `Ölçülen en büyük çap: ${yaz(olcu)} mm` : '',
        x || gomlek ? `Ön seçim: ${o('ad').textContent} (${o('cap').textContent})` : '',
        'Ölçüyü atölyede teyit eder misiniz?',
      ].filter(Boolean).join('\n');
      gonder.href = waHref(d, mesaj);
    };
    form.addEventListener('input', () => guncelle(false));
    guncelle(true);

    // Rapor sapma çubukları kaydırınca yerine oturur.
    if (!reducedMotion) {
      gsap.from(el.querySelectorAll('.os__sapma i'), {
        scaleX: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: el.querySelector('.os__rapor') || el, start: 'top 80%', once: true },
      });
    }
  },
};
