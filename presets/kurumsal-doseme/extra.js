// Sektöre özel modül: filo koltuk yenileme teklif formu.
// Araç tipi, adet, koltuk sayısı, malzeme ve kapsam → koltuk planı (üstten görünüş), tahmini süre, WhatsApp teklif mesajı.
// Fiyat yazılmaz; süre, atölyenin "bir hafta sonunda kırk koltuk" kapasitesinden kabaca hesaplanır.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const TIPLER = [
  { id: 'servis', ad: 'Servis aracı', not: 'Sprinter, Crafter tipi', koltuk: 16, sol: 2, sag: 1 },
  { id: 'minibus', ad: 'Minibüs, midibüs', not: '27 kişiye kadar', koltuk: 27, sol: 2, sag: 2 },
  { id: 'otobus', ad: 'Otobüs', not: 'Şehirler arası, şehir içi', koltuk: 46, sol: 2, sag: 2 },
];
const MALZEMELER = [
  { id: 'suni', ad: 'Suni deri', not: 'Silinir, servis için en pratik', cls: 'm-suni' },
  { id: 'kumas', ad: 'Otobüs kumaşı', not: 'Desenli, nefes alır', cls: 'm-kumas' },
  { id: 'kombin', ad: 'Kumaş + suni deri', not: 'Oturak kumaş, yanaklar deri', cls: 'm-kombin' },
];
const KAPSAM = [
  { id: 'kilif', ad: 'Kılıf yenileme', gunluk: 20 },
  { id: 'sunger', ad: 'Kılıf ve sünger', gunluk: 14 },
];
const secim = (ad, list, sec) =>
  list.map((x) => `<label><input type="radio" name="${ad}" value="${x.id}"${x.id === sec ? ' checked' : ''}><span><b>${esc(x.ad)}</b>${x.not ? `<small>${esc(x.not)}</small>` : ''}</span></label>`).join('');

export const filoKoltuk = {
  render() {
    return `
      <section class="k-bolum fk" aria-labelledby="fk-baslik">
        <div class="k-kap">
          <div class="fk__bas">
            <p class="fk__ust">Filo koltuk yenileme</p>
            <h2 class="k-h2" id="fk-baslik" data-bol>Filonuzun koltuklarını planlayalım</h2>
            <p class="k-lead">Araç tipini, sayısını ve malzemeyi seçin. Kaç koltuk yenileneceğini ve işin kabaca kaç hafta sonu süreceğini görün, teklif talebinizi hazır mesajla gönderin.</p>
          </div>
          <div class="fk__ic">
            <form class="fk__form" onsubmit="return false">
              <fieldset class="fk__alan"><legend>Araç tipi</legend><div class="fk__secim fk__secim--kart">${secim('tip', TIPLER, 'servis')}</div></fieldset>
              <div class="fk__iki">
                <label class="fk__alan"><span class="fk__etiket">Araç sayısı <output data-o="adet">6</output></span>
                  <input type="range" name="adet" min="1" max="40" value="6"></label>
                <div class="fk__alan"><span class="fk__etiket" id="fk-koltuk-e">Araç başına yolcu koltuğu</span>
                  <div class="fk__sayac" role="group" aria-labelledby="fk-koltuk-e">
                    <button type="button" data-k="-1" aria-label="Bir azalt">−</button>
                    <input name="koltuk" inputmode="numeric" value="16" aria-labelledby="fk-koltuk-e">
                    <button type="button" data-k="1" aria-label="Bir artır">+</button>
                  </div>
                </div>
              </div>
              <fieldset class="fk__alan"><legend>Malzeme</legend><div class="fk__secim">${secim('malzeme', MALZEMELER, 'suni')}</div></fieldset>
              <fieldset class="fk__alan"><legend>Kapsam</legend><div class="fk__secim">${secim('kapsam', KAPSAM, 'kilif')}</div></fieldset>
              <label class="fk__onay"><input type="checkbox" name="haftasonu" checked><span>Hafta sonu çalışın, araçlar hafta içi yolda kalsın</span></label>
            </form>
            <div class="fk__sonuc">
              <div class="fk__plan" aria-hidden="true">
                <div class="fk__arac"><span class="fk__on"></span><div class="fk__koltuklar"></div></div>
                <p class="fk__carpi">× <span data-o="adet2">6</span></p>
              </div>
              <div class="fk__ozet">
                <dl class="fk__rakam">
                  <div><dt>Yenilenecek koltuk</dt><dd data-o="toplam">102</dd></div>
                  <div><dt>Tahmini süre</dt><dd data-o="sure">3</dd><dd class="fk__birim" data-o="birim">hafta sonu</dd></div>
                </dl>
                <p class="fk__not" data-o="aciklama"></p>
                <a class="k-btn fk__gonder" target="_blank" rel="noopener">Bu plan için teklif isteyin</a>
                <p class="fk__kucuk">Kesin süreyi ve fiyatı bir aracı görüp yazılı veririz. Şoför koltuğu hesaba dahildir.</p>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.fk__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const koltuklar = el.querySelector('.fk__koltuklar');
    const kInput = form.elements.koltuk;
    const gonder = el.querySelector('.fk__gonder');
    let sonTip = 'servis';
    let onceki = '';

    const sinirla = (n) => Math.min(60, Math.max(6, Math.round(Number(n) || 0)));

    const planCiz = (tip, n, malzeme) => {
      const kol = tip.sol + tip.sag;
      const arka = kol + 1; // arka sıra koridoru da kapatır
      const on = Math.max(0, n - arka);
      const hucre = [];
      // Şoför sırası: şoför + kapı boşluğu
      hucre.push('<span class="fk__k is-sofor" title="Şoför"></span>');
      for (let i = 1; i < kol + 1; i++) hucre.push('<i></i>');
      let kalan = on;
      while (kalan > 0) {
        for (let c = 0; c < kol + 1; c++) {
          if (c === tip.sol) { hucre.push('<i></i>'); continue; }
          hucre.push(kalan-- > 0 ? '<span class="fk__k"></span>' : '<i></i>');
        }
      }
      for (let c = 0; c < arka && c < n; c++) hucre.push('<span class="fk__k"></span>');
      koltuklar.style.setProperty('--kol', kol + 1);
      koltuklar.className = `fk__koltuklar ${malzeme.cls}`;
      koltuklar.innerHTML = hucre.join('');
    };

    const guncelle = (ilk) => {
      const f = new FormData(form);
      const tip = TIPLER.find((t) => t.id === f.get('tip'));
      if (tip.id !== sonTip) {
        kInput.value = tip.koltuk;
        sonTip = tip.id;
      }
      const n = sinirla(kInput.value);
      if (document.activeElement !== kInput) kInput.value = n;
      const adet = Number(f.get('adet'));
      const malzeme = MALZEMELER.find((m) => m.id === f.get('malzeme'));
      const kapsam = KAPSAM.find((k) => k.id === f.get('kapsam'));
      const haftasonu = !!f.get('haftasonu');
      const toplam = adet * (n + 1);
      const gun = Math.max(1, Math.ceil(toplam / kapsam.gunluk));
      const sure = haftasonu ? Math.ceil(gun / 2) : gun;
      o('adet').textContent = adet;
      o('adet2').textContent = adet;
      o('toplam').textContent = toplam.toLocaleString('tr-TR');
      o('sure').textContent = sure;
      o('birim').textContent = haftasonu ? 'hafta sonu' : 'iş günü';
      o('aciklama').textContent = haftasonu
        ? `Cuma akşamı teslim alır, pazartesi sabahı teslim ederiz. Her hafta sonu yaklaşık ${kapsam.gunluk * 2} koltuk.`
        : `Araçları parti parti alırız; günde yaklaşık ${kapsam.gunluk} koltuk.`;

      const imza = `${tip.id}-${n}-${malzeme.id}`;
      if (imza !== onceki) {
        planCiz(tip, n, malzeme);
        if (!reducedMotion && !ilk) gsap.fromTo(koltuklar.querySelectorAll('.fk__k'), { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, stagger: { each: 0.012, from: 'start' }, ease: 'back.out(2.2)' });
        onceki = imza;
      }
      const mesaj = [
        `Merhaba ${d.isletme.ad}, filo koltuk yenileme için teklif istiyoruz.`,
        `Araç tipi: ${tip.ad}`,
        `Araç sayısı: ${adet}`,
        `Araç başına koltuk: ${n}+1`,
        `Malzeme: ${malzeme.ad}`,
        `Kapsam: ${kapsam.ad}`,
        `Çalışma: ${haftasonu ? 'Hafta sonu' : 'Hafta içi'}`,
        `Toplam: ${toplam} koltuk`,
      ].join('\n');
      gonder.href = waHref(d, mesaj);
    };

    el.querySelectorAll('[data-k]').forEach((b) =>
      b.addEventListener('click', () => {
        kInput.value = sinirla(Number(kInput.value) + Number(b.dataset.k));
        guncelle(false);
      })
    );
    kInput.addEventListener('change', () => { kInput.value = sinirla(kInput.value); guncelle(false); });
    form.addEventListener('input', () => guncelle(false));
    guncelle(true);
  },
};
