// Sektöre özel modül: filo bakım planlayıcı. Araç sayısı, tip ve yıllık km → bakım takvimi + WhatsApp teklif mesajı.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const TIPLER = [
  { id: 'binek', ad: 'Binek', aralik: 15000 },
  { id: 'ticari', ad: 'Hafif ticari', aralik: 15000 },
  { id: 'minibus', ad: 'Minibüs, midibüs', aralik: 10000 },
];
const KMLER = [15000, 30000, 50000, 80000];
const TABLO = [
  ['Motor yağı ve yağ filtresi', '10.000-15.000 km ya da yılda bir'],
  ['Fren, rotil ve yürüyen aksam kontrolü', 'Her bakımda'],
  ['Hava, polen ve yakıt filtresi', '15.000-30.000 km'],
  ['Buji ve ateşleme kontrolü', '30.000-60.000 km'],
  ['Triger ya da zincir seti', 'Üretici değerine göre, genelde 60.000-120.000 km'],
  ['Şanzıman yağı ve debriyaj kontrolü', '60.000 km civarı'],
];
const nf = new Intl.NumberFormat('tr-TR');

export const filoPlan = {
  render() {
    return `
      <section class="k-bolum filo" aria-labelledby="filo-baslik">
        <div class="k-kap">
          <div class="filo__bas">
            <h2 class="k-h2" id="filo-baslik" data-bol>Filonuzun bakım takvimi</h2>
            <p class="k-lead">Araç sayınızı ve yıllık kilometrenizi seçin; bir yılda kaç bakım randevusu gerektiğini görün, teklif talebinizi hazır mesajla gönderin.</p>
          </div>
          <div class="filo__ic">
            <form class="filo__form" onsubmit="return false">
              <label class="filo__alan">
                <span>Araç sayısı <output data-o="adet">10</output></span>
                <input type="range" name="adet" min="2" max="100" value="10">
              </label>
              <fieldset class="filo__alan"><legend>Araç tipi</legend>
                <div class="filo__secim">${TIPLER.map((t, i) => `<label><input type="radio" name="tip" value="${t.id}"${i === 1 ? ' checked' : ''}><span>${t.ad}</span></label>`).join('')}</div>
              </fieldset>
              <fieldset class="filo__alan"><legend>Araç başına yıllık km</legend>
                <div class="filo__secim">${KMLER.map((k, i) => `<label><input type="radio" name="km" value="${k}"${i === 1 ? ' checked' : ''}><span>${nf.format(k)}</span></label>`).join('')}</div>
              </fieldset>
            </form>
            <div class="filo__sonuc">
              <div class="filo__rakamlar">
                <p><span data-o="arac">2</span><small>bakım, araç başına yılda</small></p>
                <p><span data-o="toplam">20</span><small>randevu, filo için yılda</small></p>
              </div>
              <div class="filo__cubuk" aria-hidden="true"><span class="filo__dolu"></span><div class="filo__noktalar"></div><span class="filo__bas-km">0 km</span><span class="filo__son-km" data-o="kmyazi">30.000 km</span></div>
              <a class="k-btn filo__gonder" target="_blank" rel="noopener">Bu plan için teklif isteyin</a>
            </div>
          </div>
          <table class="filo__tablo">
            <caption>Tipik bakım aralıkları. Aracınızın üretici değerleri esas alınır.</caption>
            <thead><tr><th scope="col">İş</th><th scope="col">Aralık</th></tr></thead>
            <tbody>${TABLO.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.filo__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const noktalar = el.querySelector('.filo__noktalar');
    const gonder = el.querySelector('.filo__gonder');
    const guncelle = (ilk) => {
      const f = new FormData(form);
      const adet = Number(f.get('adet'));
      const tip = TIPLER.find((t) => t.id === f.get('tip'));
      const km = Number(f.get('km'));
      const bakim = Math.max(1, Math.ceil(km / tip.aralik));
      o('adet').textContent = adet;
      o('arac').textContent = bakim;
      o('toplam').textContent = nf.format(bakim * adet);
      o('kmyazi').textContent = `${nf.format(km)} km`;
      noktalar.innerHTML = Array.from({ length: bakim }, (_, i) => `<span style="left:${((i + 1) / bakim) * 100}%"><em>${nf.format(Math.round(((i + 1) * km) / bakim / 1000))} bin</em></span>`).join('');
      if (!reducedMotion && !ilk) {
        gsap.fromTo(noktalar.children, { scale: 0 }, { scale: 1, duration: 0.45, stagger: 0.05, ease: 'back.out(2)' });
        gsap.fromTo(el.querySelector('.filo__dolu'), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power3.out' });
      }
      const mesaj = `Merhaba ${d.isletme.ad}, filo bakım anlaşması için teklif istiyoruz.\nAraç sayısı: ${adet}\nAraç tipi: ${tip.ad}\nAraç başına yıllık km: ${nf.format(km)}\nTahmini bakım: araç başına yılda ${bakim}, toplam ${bakim * adet} randevu.`;
      gonder.href = waHref(d, mesaj);
    };
    form.addEventListener('input', () => guncelle(false));
    guncelle(true);
  },
};
