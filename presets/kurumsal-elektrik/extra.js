// Sektöre özel modül: arıza kodu sorgulama. Kod yazılır → sade Türkçe anlamı, aciliyeti, kodun yapısı
// (sistem / genel-özel / alt sistem) ve "bize getirin" WhatsApp mesajı. Liste: devre.json arizaKodlari + kodSozluk.
import { esc, waHref, telHref, icons, gsap, reducedMotion } from '../../shared/core.js';

const SISTEM = { P: 'Motor ve şanzıman', B: 'Gövde ve kabin', C: 'Şasi: fren, direksiyon, süspansiyon', U: 'Beyinler arası haberleşme' };
const P_ALT = { 0: 'Yakıt, hava ve emisyon', 1: 'Yakıt ve hava ölçümü', 2: 'Yakıt ve hava ölçümü (enjektör)', 3: 'Ateşleme sistemi', 4: 'Emisyon kontrolü', 5: 'Hız ve rölanti kontrolü', 6: 'Motor beyni ve çıkışları', 7: 'Şanzıman', 8: 'Şanzıman', 9: 'Şanzıman' };
const ACILIYET = {
  hemen: ['Hemen ilgilenin', 'Aracı zorlamayın, bizi arayın.'],
  yakinda: ['Birkaç gün içinde getirin', 'Araç çoğu zaman yürür ama arıza büyüyebilir.'],
  izle: ['Acil değil', 'İlk fırsatta bakalım, sürüşü genelde etkilemez.'],
};
const SIK = ['P0420', 'P0300', 'P0171', 'P0562', 'U0100', 'P2002'];

const lamba = `<svg viewBox="0 0 64 44" aria-hidden="true"><path d="M14 10h8V6h14v4h6l5 6h5v-4h4v20h-4v-4h-5l-6 8H22l-5-6h-3v4H8V12h6z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/></svg>`;

function yapi(kod) {
  const [h, ikinci, ucuncu] = kod;
  const ozel = ikinci === '1' || (ikinci === '3' && h !== 'U');
  return [
    [h, 'Sistem', SISTEM[h]],
    [ikinci, 'Tür', ikinci === '0' || ikinci === '2' ? 'Genel kod, tüm markalarda aynı anlam' : ozel ? 'Üreticiye özel kod' : 'Genel ya da üreticiye özel'],
    [ucuncu, 'Alt sistem', h === 'P' ? P_ALT[ucuncu] || 'Motor alt sistemi' : 'Sisteme göre değişir'],
    [kod.slice(3), 'Hata no', 'Arızanın hangi devre ya da parça olduğu'],
  ];
}

export const arizaKodu = {
  render(d) {
    return `
      <section class="k-bolum ak" aria-labelledby="ak-baslik">
        <div class="k-kap">
          <div class="ak__bas">
            <p class="ak__etiket"><span class="ak__nokta"></span>Arıza kodu sorgulama</p>
            <h2 class="k-h2" id="ak-baslik" data-bol>Lamba yandı, cihaz bir kod verdi. Ne demek?</h2>
            <p class="k-lead">Kodu yazın; hangi sistemde, ne kadar acil ve ne olabileceğini sade Türkçeyle görün. Listemizde ${new Set([...(d.arizaKodlari || []), ...(d.kodSozluk || [])].map((x) => x.kod)).size} yaygın kod var.</p>
          </div>
          <div class="ak__ic">
            <div class="ak__sol">
              <label class="ak__giris"><span>Hata kodu</span><input name="kod" value="P0420" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="ak-ipucu"></label>
              <p class="ak__ipucu" id="ak-ipucu">Bir harf ve dört karakter: P0420, U0100 gibi.</p>
              <div class="ak__oneri" aria-label="Kod önerileri"></div>
              <ol class="ak__yapi" aria-label="Kodun yapısı"></ol>
            </div>
            <div class="ak__sonuc" aria-live="polite"></div>
          </div>
        </div>
      </section>`;
  },

  mount(el, d) {
    const liste = [...(d.arizaKodlari || []).map((x) => ({ ...x, aciliyet: x.aciliyet || (/U0100|P0300/.test(x.kod) ? 'hemen' : 'yakinda') })), ...(d.kodSozluk || [])];
    const tablo = new Map();
    for (const x of liste) tablo.set(x.kod, { ...tablo.get(x.kod), ...x });
    const giris = el.querySelector('input[name="kod"]');
    const oneri = el.querySelector('.ak__oneri');
    const yapiEl = el.querySelector('.ak__yapi');
    const sonuc = el.querySelector('.ak__sonuc');
    let onceki = '';

    const onerileriYaz = (q) => {
      const eslesen = q ? [...tablo.keys()].filter((k) => k.startsWith(q) && k !== q).slice(0, 6) : [];
      const goster = eslesen.length ? eslesen : SIK.filter((k) => tablo.has(k) && k !== q);
      oneri.innerHTML = `<span>${eslesen.length ? 'Eşleşenler' : 'Sık gelenler'}</span>${goster.map((k) => `<button type="button" data-kod="${k}">${k}</button>`).join('')}`;
    };

    const goster = (ilk) => {
      const q = giris.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      if (giris.value !== q) giris.value = q;
      onerileriYaz(q);
      const gecerli = /^[PBCU][0-3][0-9A-F]{3}$/.test(q);
      if (!gecerli) {
        yapiEl.innerHTML = '';
        sonuc.dataset.aciliyet = '';
        sonuc.innerHTML = `<div class="ak__bos">${lamba}<p>${q.length < 5 ? 'Kodu tamamlayın.' : 'Bu bir arıza kodu gibi görünmüyor.'} Kod P, B, C ya da U harfiyle başlar, ardından dört karakter gelir.</p></div>`;
        onceki = '';
        return;
      }
      if (q === onceki) return;
      onceki = q;
      yapiEl.innerHTML = yapi(q).map(([p, ad, acik]) => `<li><strong>${esc(p)}</strong><span>${esc(ad)}</span><small>${esc(acik)}</small></li>`).join('');
      const x = tablo.get(q);
      const a = ACILIYET[x?.aciliyet] || null;
      sonuc.dataset.aciliyet = x?.aciliyet || 'bilinmiyor';
      const mesaj = `Merhaba ${d.isletme.ad}, aracımda ${q} arıza kodu var${x ? ` (${x.anlam})` : ''}. Arıza tespiti için ne zaman gelebilirim?\nAraç: `;
      sonuc.innerHTML = `
        <div class="ak__ust">
          <span class="ak__lamba">${lamba}</span>
          <div><p class="ak__kod">${esc(q)}</p><p class="ak__sistem">${esc(SISTEM[q[0]])}</p></div>
        </div>
        ${x ? `<h3 class="ak__anlam">${esc(x.anlam)}</h3>` : `<h3 class="ak__anlam">Bu kod listemizde yok</h3>`}
        ${a ? `<p class="ak__aciliyet"><strong>${a[0]}.</strong> ${a[1]}</p>` : ''}
        <p class="ak__not">${esc(x?.not || (q[1] === '1' ? 'Üreticiye özel kod: anlamı markaya göre değişir. Cihazla okuyup markanızın tablosundan bakalım.' : 'Kodu cihazla okuyup canlı veriyle asıl sebebi bulalım.'))}</p>
        ${x?.cozum ? `<p class="ak__cozum"><span>Atölyemizde son çözüm</span>${esc(x.cozum)}</p>` : ''}
        <div class="k-butonlar">
          <a class="k-btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu kodla bize yazın</span></a>
          <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>Arayın</span></a>
        </div>
        <p class="ak__uyari">Kod arızanın hangi sistemde olduğunu söyler, sebebini değil. Kesin teşhis cihaz ve ölçümle yapılır.</p>`;
      if (!reducedMotion && !ilk) {
        gsap.fromTo(sonuc.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
        gsap.fromTo(yapiEl.children, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' });
      }
    };

    giris.addEventListener('input', () => goster(false));
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-kod]');
      if (!b) return;
      giris.value = b.dataset.kod;
      goster(false);
    });
    goster(true);
  },
};
