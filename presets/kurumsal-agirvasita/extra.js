// Sektöre özel modül: 7/24 yol yardım bandı + filo bakım sözleşmesi teklif formu.
// Araç sayısı, tipler, markalar, yıllık km ve kullanım → tahmini yıllık bakım yükü + WhatsApp teklif mesajı.
import { esc, waHref, telHref, icons, gsap, reducedMotion } from '../../shared/core.js';

const TIPLER = ['Çekici', 'Kamyon', 'Kamyonet', 'Otobüs', 'Midibüs'];
const KMLER = [
  { id: 50000, ad: '50 bin' },
  { id: 100000, ad: '100 bin' },
  { id: 150000, ad: '150 bin' },
  { id: 200000, ad: '200 bin +' },
];
// Aralıklar genel tahmindir; gerçek değer aracın üretici değerine göre belirlenir.
const KULLANIM = [
  { id: 'uzun', ad: 'Şehirlerarası nakliye', aralik: 50000 },
  { id: 'sehir', ad: 'Şehir içi dağıtım', aralik: 30000 },
  { id: 'servis', ad: 'Personel / öğrenci servisi', aralik: 25000 },
  { id: 'santiye', ad: 'Şantiye ve hafriyat', aralik: 20000 },
];
const KAPSAM = [
  ['Periyodik bakım', true],
  ['Havalı fren kontrolü', true],
  ['AdBlue ve SCR', false],
  ['Takograf', false],
  ['Körük ve dingil', false],
  ['Yol yardım önceliği', true],
];
const nf = new Intl.NumberFormat('tr-TR');
const kamyon = '<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M1 3h18v11H1zM19 7h6l5 4v3H19z"/><circle cx="7" cy="16" r="2.6"/><circle cx="24" cy="16" r="2.6"/></svg>';

const cip = (tur, ad, liste, secili) =>
  `<div class="fs__secim">${liste.map((x) => {
    const [deger, etiket] = typeof x === 'object' ? [x.id, x.ad] : [x, x];
    return `<label><input type="${tur}" name="${ad}" value="${esc(deger)}"${secili(deger) ? ' checked' : ''}><span>${esc(etiket)}</span></label>`;
  }).join('')}</div>`;

export const filoSozlesme = {
  render(d) {
    const markalar = d.markalar || [];
    return `
      <section class="k-bolum fs" aria-labelledby="fs-baslik">
        <div class="fs__bant" role="region" aria-label="7/24 yol yardım">
          <div class="k-kap fs__bant-ic">
            <span class="fs__isik" aria-hidden="true"></span>
            <p class="fs__bant-metin"><strong>7/24 yol yardım</strong><span>${esc(d.yolYardim || 'Yol yardım hattımız 7 gün 24 saat açık.')}</span></p>
            <div class="fs__bant-dugme">
              <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
              ${d.iletisim.whatsapp ? `<button type="button" class="k-btn k-btn--ikincil" data-konum>${icons.pin}<span>Konumumu gönder</span></button>` : ''}
            </div>
          </div>
        </div>
        <div class="k-kap">
          <div class="fs__bas">
            <h2 class="k-h2" id="fs-baslik" data-bol>Filo bakım sözleşmesi</h2>
            <p class="k-lead">Filonuzu anlatın; yılda kaç bakım girişi gerektiğini görün, sözleşme teklifini hazır mesajla isteyin.</p>
          </div>
          <div class="fs__ic">
            <form class="fs__form" onsubmit="return false">
              <label class="fs__alan fs__adet">
                <span>Araç sayısı <output data-o="adet">12</output></span>
                <input type="range" name="adet" min="1" max="150" value="12">
              </label>
              <fieldset class="fs__alan"><legend>Araç tipi</legend>${cip('checkbox', 'tip', TIPLER, (x) => x === 'Çekici')}</fieldset>
              ${markalar.length ? `<fieldset class="fs__alan"><legend>Markalar</legend>${cip('checkbox', 'marka', markalar, () => false)}</fieldset>` : ''}
              <fieldset class="fs__alan"><legend>Araç başına yıllık km</legend>${cip('radio', 'km', KMLER, (x) => x === 100000)}</fieldset>
              <fieldset class="fs__alan"><legend>Kullanım</legend>${cip('radio', 'kullanim', KULLANIM, (x) => x === 'uzun')}</fieldset>
              <fieldset class="fs__alan"><legend>Sözleşme kapsamı</legend>${cip('checkbox', 'kapsam', KAPSAM.map(([a]) => a), (x) => KAPSAM.find(([a]) => a === x)[1])}</fieldset>
            </form>
            <div class="fs__sonuc" aria-live="polite">
              <p class="fs__etiket">Tahmini yıllık bakım yükü</p>
              <div class="fs__rakamlar">
                <p><span data-o="toplam">0</span><small>bakım girişi, yılda</small></p>
                <p><span data-o="ay">0</span><small>araç, ayda ortalama</small></p>
              </div>
              <div class="fs__filo" data-o="filo" aria-hidden="true"></div>
              <dl class="fs__ozet" data-o="ozet"></dl>
              <p class="fs__not">Bakım aralığı aracın üretici değerine göre belirlenir; bu hesap genel bir tahmindir.</p>
              <a class="k-btn fs__gonder" target="_blank" rel="noopener">Sözleşme teklifi isteyin</a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.fs__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const gonder = el.querySelector('.fs__gonder');
    const filo = o('filo');
    let oncekiAdet = 0;

    const guncelle = (ilk) => {
      const f = new FormData(form);
      const adet = Number(f.get('adet'));
      const tipler = f.getAll('tip');
      const markalar = f.getAll('marka');
      const km = KMLER.find((x) => String(x.id) === f.get('km'));
      const kul = KULLANIM.find((x) => x.id === f.get('kullanim'));
      const kapsam = f.getAll('kapsam');
      const arac = Math.max(1, Math.ceil(km.id / kul.aralik));
      const toplam = arac * adet;
      const ay = toplam / 12;
      o('adet').textContent = adet;
      o('toplam').textContent = nf.format(toplam);
      o('ay').textContent = ay < 1 ? '1’den az' : nf.format(Math.round(ay));

      // Filo şeridi: her araç bir kamyon; 40'tan sonrası "+N".
      const goster = Math.min(adet, 40);
      if (goster !== oncekiAdet) {
        filo.innerHTML = Array.from({ length: goster }, () => `<i>${kamyon}</i>`).join('') + (adet > 40 ? `<b>+${adet - 40}</b>` : '');
        if (!reducedMotion && !ilk && goster > oncekiAdet) {
          gsap.from([...filo.children].slice(oncekiAdet, goster), { x: -14, opacity: 0, duration: 0.35, stagger: 0.015, ease: 'power2.out' });
        }
        oncekiAdet = goster;
      }

      const satir = [
        ['Araç', `${adet}${tipler.length ? `, ${tipler.join(', ').toLocaleLowerCase('tr')}` : ''}`],
        markalar.length ? ['Marka', markalar.join(', ')] : null,
        ['Yıllık km', `${km.ad} km, araç başına`],
        ['Kullanım', kul.ad],
        ['Bakım', `araç başına yılda ${arac}`],
        kapsam.length ? ['Kapsam', kapsam.join(', ')] : null,
      ].filter(Boolean);
      o('ozet').innerHTML = satir.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('');
      const mesaj = [
        `Merhaba ${d.isletme.ad}, filo bakım sözleşmesi için teklif istiyoruz.`,
        ...satir.map(([a, b]) => `${a}: ${b}`),
        `Tahmini yıllık bakım girişi: ${nf.format(toplam)}`,
      ].join('\n');
      gonder.href = waHref(d, mesaj);
    };
    form.addEventListener('input', () => guncelle(false));
    guncelle(true);

    // Yol yardım: konumu (izin verilirse) mesaja ekleyip WhatsApp'ı aç.
    const konum = el.querySelector('[data-konum]');
    konum?.addEventListener('click', () => {
      const yolla = (ek) => (location.href = waHref(d, `Merhaba ${d.isletme.ad}, yolda kaldım, yol yardım istiyorum.${ek}`));
      const span = konum.querySelector('span');
      if (!navigator.geolocation) return yolla('\nKonumumu bu mesajın ardından gönderiyorum.');
      span.textContent = 'Konum alınıyor';
      navigator.geolocation.getCurrentPosition(
        (p) => { span.textContent = 'Konumumu gönder'; yolla(`\nKonumum: https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`); },
        () => { span.textContent = 'Konumumu gönder'; yolla('\nKonumumu bu mesajın ardından gönderiyorum.'); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  },
};
