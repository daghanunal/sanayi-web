// Sektöre özel modül: şasi numarasıyla parça sorgu.
// 17 haneli şasi numarası (VIN) → hane hane doğrulama, üretici ve model yılı ön bilgisi, parça grubu seçimi → WhatsApp mesajı.
// Çözümleme yalnızca ön bilgidir; kesin eşleştirmeyi depo kataloğla yapar (metinde de böyle söylenir).
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

// Sık görülen üretici kodları (WMI, ilk 3 hane). Bilinmeyen kodda yalnızca bölge gösterilir.
const WMI = {
  VF1: 'Renault', VF3: 'Peugeot', VF7: 'Citroën', VR3: 'Peugeot', VR7: 'Citroën', UU1: 'Dacia', ZFA: 'Fiat', NM4: 'Fiat (Tofaş)',
  WVW: 'Volkswagen', WV1: 'Volkswagen Ticari', WV2: 'Volkswagen Ticari', WAU: 'Audi', WBA: 'BMW', WDB: 'Mercedes-Benz', WDD: 'Mercedes-Benz',
  W1K: 'Mercedes-Benz', WDF: 'Mercedes-Benz Ticari', W0L: 'Opel', W0V: 'Opel', WF0: 'Ford', NM0: 'Ford (Otosan)', TMB: 'Škoda',
  VSS: 'SEAT', NMT: 'Toyota (Türkiye)', VNK: 'Toyota', JTD: 'Toyota', KMH: 'Hyundai', NLH: 'Hyundai (Assan)', KNA: 'Kia', KNE: 'Kia',
  JHM: 'Honda', NLA: 'Honda (Türkiye)', SJN: 'Nissan', JN1: 'Nissan', VNV: 'Nissan', ZAR: 'Alfa Romeo',
};
const BOLGE = [
  [/^[W]/, 'Almanya'], [/^V[F-R]/, 'Fransa'], [/^V[S-W]/, 'İspanya'], [/^Z/, 'İtalya'], [/^N[L-R]/, 'Türkiye'], [/^U/, 'Romanya'],
  [/^T[J-P]/, 'Çekya'], [/^S[A-M]/, 'İngiltere'], [/^J/, 'Japonya'], [/^K[L-R]/, 'Güney Kore'], [/^[1-5]/, 'Kuzey Amerika'],
];
const YIL_HARF = 'ABCDEFGHJKLMNPRSTVWXY';
const GRUPLAR = [
  { id: 1, ad: '1-3', etiket: 'Üretici' },
  { id: 2, ad: '4-9', etiket: 'Araç tanımı' },
  { id: 3, ad: '10', etiket: 'Model yılı' },
  { id: 4, ad: '11', etiket: 'Fabrika' },
  { id: 5, ad: '12-17', etiket: 'Seri no' },
];
const grupNo = (i) => (i < 3 ? 1 : i < 9 ? 2 : i === 9 ? 3 : i === 10 ? 4 : 5);

function modelYili(c) {
  const buYil = new Date().getFullYear();
  let y = null;
  if (/[1-9]/.test(c)) y = 2000 + Number(c);
  else if (YIL_HARF.includes(c)) y = 2010 + YIL_HARF.indexOf(c);
  if (y && y > buYil + 1) y -= 30;
  return y;
}

// I, O, Q şasi numarasında kullanılmaz; yazarken karışanları düzeltir, ne düzelttiğini söyler.
function temizle(s) {
  const notlar = [];
  let t = s.toUpperCase().replace(/[\s-]/g, '');
  if (/[OQ]/.test(t)) { t = t.replace(/[OQ]/g, '0'); notlar.push('O ve Q harflerini 0 (sıfır) yaptık'); }
  if (/I/.test(t)) { t = t.replace(/I/g, '1'); notlar.push('I harfini 1 yaptık'); }
  return { t: t.replace(/[^A-Z0-9]/g, '').slice(0, 17), notlar };
}

export const sasiSorgu = {
  render(d) {
    const gruplar = (d.hizmetler || []).map((h) => h.baslik);
    return `
      <section class="k-bolum ss" aria-labelledby="ss-baslik">
        <div class="k-kap">
          <div class="ss__kart">
            <div class="ss__bas">
              <p class="ss__ust"><span>VIN</span> Şasi numarasıyla sorgu</p>
              <h2 class="k-h2" id="ss-baslik" data-bol>Parçanın adını bilmeniz gerekmez</h2>
              <p class="k-lead">Ruhsattaki 17 haneli şasi numarasını yazın, hangi parçayı aradığınızı seçin. Numaradan aracı ve donanımını çıkarır, orijinal ve muadil fiyatını tek mesajda yazarız.</p>
            </div>
            <form class="ss__form" novalidate>
              <label class="ss__giris">
                <span class="ss__etiket">Şasi numarası <output data-o="sayi">0/17</output></span>
                <input name="vin" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24" placeholder="Örn. VF1RFB00X12345678" aria-describedby="ss-durum">
              </label>
              <div class="ss__haneler" aria-hidden="true">
                ${Array.from({ length: 17 }, (_, i) => `<span class="g${grupNo(i)}"></span>`).join('')}
              </div>
              <ul class="ss__gruplar" aria-hidden="true">${GRUPLAR.map((g) => `<li class="g${g.id}"><b>${g.ad}</b> ${g.etiket}</li>`).join('')}</ul>
              <p class="ss__durum" id="ss-durum" role="status" aria-live="polite"></p>
              <dl class="ss__cozum">
                <div><dt>Üretici</dt><dd data-o="uretici">—</dd></div>
                <div><dt>Model yılı</dt><dd data-o="yil">—</dd></div>
                <div><dt>Seri no</dt><dd data-o="seri">—</dd></div>
              </dl>
              <fieldset class="ss__alan"><legend>Hangi parça?</legend>
                <div class="ss__cipler">${gruplar.map((g) => `<label><input type="checkbox" name="grup" value="${esc(g)}"><span>${esc(g)}</span></label>`).join('')}</div>
              </fieldset>
              <label class="ss__alan"><span class="ss__etiket">Parça ya da arıza <span class="k-soluk">(isteğe bağlı)</span></span>
                <input name="not" placeholder="Örn. ön balata ve disk, sağ ön amortisör"></label>
              <fieldset class="ss__alan"><legend>Tercih</legend>
                <div class="ss__cipler ss__cipler--tek">
                  <label><input type="radio" name="tercih" value="Orijinal ve muadil" checked><span>İkisinin de fiyatı</span></label>
                  <label><input type="radio" name="tercih" value="Orijinal"><span>Orijinal</span></label>
                  <label><input type="radio" name="tercih" value="Muadil"><span>Muadil</span></label>
                </div>
              </fieldset>
              <p class="ss__hata" role="alert" hidden></p>
              <div class="k-butonlar">
                <button type="submit" class="k-btn ss__gonder">Parçayı sorun</button>
                <a class="k-btn k-btn--ikincil" data-foto target="_blank" rel="noopener">Ruhsat fotoğrafı göndereceğim</a>
              </div>
            </form>
          </div>
          ${d.teslimat?.length ? `
          <div class="ss__teslim">
            <p class="ss__teslim-baslik">Teslim süreleri</p>
            <ul data-sira>${d.teslimat.map((t) => `<li><span>${esc(t.yer)}</span><strong>${esc(t.sure)}</strong><small>${esc(t.not)}</small></li>`).join('')}</ul>
          </div>` : ''}
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.ss__form');
    const input = form.elements.vin;
    const haneler = [...el.querySelectorAll('.ss__haneler span')];
    const durum = el.querySelector('.ss__durum');
    const hata = el.querySelector('.ss__hata');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    el.querySelector('[data-foto]').href = waHref(d, `Merhaba ${d.isletme.ad}, parça sormak istiyorum. Ruhsat fotoğrafını gönderiyorum.`);
    let onceki = 0;

    const cozumle = () => {
      const { t, notlar } = temizle(input.value);
      if (input.value !== t) {
        const p = input.selectionStart;
        input.value = t;
        try { input.setSelectionRange(Math.min(p, t.length), Math.min(p, t.length)); } catch {}
      }
      haneler.forEach((h, i) => {
        h.textContent = t[i] || '';
        h.classList.toggle('is-dolu', i < t.length);
      });
      if (!reducedMotion && t.length > onceki && haneler[t.length - 1]) {
        gsap.fromTo(haneler[t.length - 1], { yPercent: -40, scale: 1.3 }, { yPercent: 0, scale: 1, duration: 0.3, ease: 'back.out(3)' });
      }
      onceki = t.length;
      o('sayi').textContent = `${t.length}/17`;
      const wmi = t.slice(0, 3);
      const bolge = BOLGE.find(([r]) => r.test(wmi))?.[1];
      o('uretici').textContent = t.length >= 3 ? WMI[wmi] || (bolge ? `${bolge} üretimi` : 'Katalogdan bakılacak') : '—';
      const yil = t.length >= 10 ? modelYili(t[9]) : null;
      o('yil').textContent = t.length >= 10 ? (yil ? `${yil} (tahmini)` : 'Katalogdan bakılacak') : '—';
      o('seri').textContent = t.length === 17 ? t.slice(11) : '—';
      form.classList.toggle('is-tamam', t.length === 17);
      durum.textContent =
        t.length === 17 ? `Numara tam. ${notlar.join(', ')}${notlar.length ? '. ' : ''}Parça grubunu seçip gönderin.`
        : t.length ? `${17 - t.length} hane kaldı.${notlar.length ? ` ${notlar.join(', ')}.` : ''}`
        : 'I, O ve Q harfleri şasi numarasında bulunmaz; yazarsanız düzeltiriz.';
      return t;
    };

    input.addEventListener('input', () => { hata.hidden = true; cozumle(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = cozumle();
      const f = new FormData(form);
      const gruplar = f.getAll('grup');
      const not = (f.get('not') || '').trim();
      const sorun = [];
      if (t.length !== 17) sorun.push(`şasi numarası 17 hane olmalı (şu an ${t.length})`);
      if (!gruplar.length && !not) sorun.push('en az bir parça grubu seçin ya da parçayı yazın');
      if (sorun.length) {
        hata.hidden = false;
        hata.textContent = `Göndermeden önce: ${sorun.join('; ')}.`;
        if (t.length !== 17) input.focus();
        return;
      }
      const mesaj = [
        `Merhaba ${d.isletme.ad}, parça fiyatı istiyorum.`,
        `Şasi no: ${t}`,
        o('uretici').textContent !== '—' ? `Araç: ${o('uretici').textContent}${o('yil').textContent !== '—' ? `, ${o('yil').textContent}` : ''}` : '',
        gruplar.length ? `Parça grubu: ${gruplar.join(', ')}` : '',
        not ? `Parça: ${not}` : '',
        `Tercih: ${f.get('tercih')}`,
      ].filter(Boolean).join('\n');
      window.open(waHref(d, mesaj), '_blank', 'noopener');
      durum.textContent = 'WhatsApp açıldı. Mesajı gönderdiğinizde fiyatı yazıyoruz.';
    });
    cozumle();
  },
};
