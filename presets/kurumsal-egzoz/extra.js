// Sektöre özel modüller.
//  belirtiler: araçta görülen belirtiler seçilince bakılacak parça, ilgili hizmet ve süresi listelenir;
//              seçimler WhatsApp mesajına eklenir. Puan ya da gösterge yok.
//  hat:        egzoz hattının temsilî 3D çizimi + motordan uca beş parça (d.parcalar).
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const YAKIT = [
  { id: 'benzin', ad: 'Benzin' },
  { id: 'dizel', ad: 'Dizel' },
  { id: 'lpg', ad: 'Benzin ve LPG' },
];
const BELIRTI = [
  { id: 'lamba', ad: 'Motor arıza lambası yanıyor', parca: 'Oksijen sensörü ve katalitik konvertör', hizmet: 'Egzoz gazı ölçümü', neden: 'Arıza kodu okunur. Kod oksijen sensörünü ya da katalitik konvertörü gösteriyorsa egzoz gazı da ölçülür.' },
  { id: 'dpf', ad: 'DPF lambası yanıyor, araç güç düşürüyor', parca: 'DPF', hizmet: 'DPF temizliği', yakit: ['dizel'], neden: 'Filtrenin basınç farkı ölçülür. Filtre doluysa sökülüp yıkanır.' },
  { id: 'duman', ad: 'Egzozdan renkli duman çıkıyor', parca: 'Egzoz ucu ve motor', hizmet: 'Egzoz gazı ölçümü', neden: 'Siyah duman fazla yakıta, mavi duman yağ yakmaya, beyaz duman su ya da antifrize işaret eder. Sebep motordaysa araç sahibine söylenir.' },
  { id: 'ses', ad: 'Egzoz sesi arttı', parca: 'Susturucu', hizmet: 'Susturucu değişimi', neden: 'Susturucu delinmiş ya da bir bağlantı kopmuş olabilir. Hat lifte kontrol edilir.' },
  { id: 'koku', ad: 'Araç içine egzoz kokusu geliyor', parca: 'Manifold ve conta', hizmet: 'Manifold ve conta', neden: 'Manifold çatlamış ya da conta yanmış olabilir. Kaçağın yeri dumanla test edilerek bulunur.' },
  { id: 'cekis', ad: 'Çekiş düştü, araç gaz yemiyor', parca: 'Katalitik konvertör ve DPF', hizmet: 'Katalitik konvertör', neden: 'Tıkanan katalitik konvertör ya da DPF egzozu boğar. Hangisinin tıkalı olduğu geri basınç ölçülerek anlaşılır.' },
  { id: 'tikirti', ad: 'Alttan tıkırtı geliyor, egzoz sallanıyor', parca: 'Askı ve kelepçe', hizmet: 'Askı ve kelepçe', neden: 'Çoğu zaman bir lastik askı kopmuş ya da kelepçe gevşemiştir.' },
];

const secim = (ad, liste, varsayilan) =>
  `<div class="mh__secim">${liste.map((x) => `<label><input type="radio" name="${ad}" value="${x.id}"${x.id === varsayilan ? ' checked' : ''}><span>${esc(x.ad)}</span></label>`).join('')}</div>`;

export const belirtiler = {
  render() {
    return `
      <section class="k-bolum mh" aria-label="Arıza belirtileri">
        <div class="k-kap">
          <div class="mh__ic">
            <form class="mh__form" onsubmit="return false">
              <fieldset class="mh__alan"><legend>Yakıt</legend>${secim('yakit', YAKIT, 'dizel')}</fieldset>
              <fieldset class="mh__alan"><legend>Araçta görülen belirtiler</legend>
                <ul class="mh__belirti">${BELIRTI.map((b) => `<li data-b="${b.id}"><label><input type="checkbox" name="b" value="${b.id}"><span class="mh__kutu" aria-hidden="true"></span><span>${esc(b.ad)}</span></label></li>`).join('')}</ul>
              </fieldset>
            </form>
            <div class="mh__sonuc" aria-live="polite">
              <p class="mh__etiket">Bakılacak parçalar</p>
              <p class="mh__bos" data-o="bos">Belirti seçilince bakılacak parçalar burada görünür.</p>
              <ol class="mh__liste" data-o="liste"></ol>
              <a class="k-btn mh__gonder" target="_blank" rel="noopener">WhatsApp'tan bilgi alın</a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.mh__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const gonder = el.querySelector('.mh__gonder');
    const sure = (baslik) => d.hizmetler?.find((h) => h.baslik === baslik)?.sure;

    const guncelle = (ilk) => {
      const f = new FormData(form);
      const yakit = YAKIT.find((x) => x.id === f.get('yakit'));
      el.querySelectorAll('[data-b]').forEach((li) => {
        const b = BELIRTI.find((x) => x.id === li.dataset.b);
        const uygun = !b.yakit || b.yakit.includes(yakit.id);
        li.hidden = !uygun;
        if (!uygun) li.querySelector('input').checked = false;
      });
      const secili = BELIRTI.filter((b) => new FormData(form).getAll('b').includes(b.id));
      o('bos').hidden = secili.length > 0;
      o('liste').innerHTML = secili
        .map((b) => `<li><span class="mh__is">${esc(b.parca)}${sure(b.hizmet) ? `<small>${esc(sure(b.hizmet))}</small>` : ''}</span><span class="mh__hizmet">${esc(b.hizmet)}</span><span class="mh__neden">${esc(b.neden)}</span></li>`)
        .join('');
      if (!ilk && !reducedMotion && secili.length) {
        gsap.fromTo(o('liste').children, { x: 12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
      }
      const mesaj = [
        `Merhaba ${d.isletme.ad}, aracımın egzozu için bilgi almak istiyorum.`,
        `Yakıt: ${yakit.ad}`,
        secili.length ? `Belirtiler: ${secili.map((b) => b.ad).join('; ')}` : '',
      ].filter(Boolean).join('\n');
      gonder.href = waHref(d, mesaj);
    };
    form.addEventListener('input', () => guncelle(false));
    guncelle(true);
  },
};

// Egzoz hattı: kütüphanedeki egzoz hattının (lib3d exhaust) patlatılmış Cycles render'ı ve beş parça.
const okSvg = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const hat = {
  render(d) {
    const parcalar = d.parcalar || [];
    if (!parcalar.length) return '';
    const h = d.kurumsal?.hat || {};
    const img = `${import.meta.env.BASE_URL}img/kurumsal-egzoz/egzoz-hatti-3d.jpg`;
    const konu = encodeURIComponent('Randevu');
    return `
      <section class="k-bolum eh" aria-labelledby="eh-baslik">
        <div class="k-kap">
          <div class="eh__bas">
            <h2 class="k-h2" id="eh-baslik" data-bol>${esc(h.baslik || 'Egzoz hattı')}</h2>
            ${h.metin ? `<p class="k-lead">${esc(h.metin)}</p>` : ''}
          </div>
          <figure class="eh__gorsel" data-perde>
            <img src="${img}" alt="Manifolddan egzoz ucuna kadar parçalarına ayrılmış egzoz hattının temsilî 3D çizimi" loading="lazy" decoding="async" width="1300" height="669">
            <figcaption>Temsilî 3D çizim</figcaption>
          </figure>
          <ol class="eh__liste" data-sira>
            ${parcalar.map((p, i) => `<li><span class="eh__no">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.ad)}</h3><p>${esc(p.metin)}</p>${p.hizmet ? `<span class="eh__is">${esc(p.hizmet)}</span>` : ''}</li>`).join('')}
          </ol>
          <a class="k-link eh__link" href="#/iletisim?konu=${konu}" data-rota="iletisim?konu=${konu}">Egzoz kontrolü için randevu ${okSvg}</a>
        </div>
      </section>`;
  },
};
