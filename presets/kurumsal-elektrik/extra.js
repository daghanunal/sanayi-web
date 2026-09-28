// Sektöre özel modül: arıza kodu sorgulama. Kod yazılır → sade Türkçe anlamı, aciliyeti, kodun yapısı
// (sistem / genel-özel / alt sistem) ve hazır WhatsApp mesajı. Liste: kodSozluk.
import { esc, waHref, telHref, icons, gsap, reducedMotion } from '../../shared/core.js';

const SISTEM = { P: 'Motor ve şanzıman', B: 'Gövde ve kabin', C: 'Şasi (fren, direksiyon, süspansiyon)', U: 'Beyinler arası haberleşme' };
const P_ALT = { 0: 'Yakıt, hava ve emisyon', 1: 'Yakıt ve hava ölçümü', 2: 'Yakıt ve hava ölçümü (enjektör)', 3: 'Ateşleme sistemi', 4: 'Emisyon kontrolü', 5: 'Hız ve rölanti kontrolü', 6: 'Motor beyni ve çıkışları', 7: 'Şanzıman', 8: 'Şanzıman', 9: 'Şanzıman' };
const ACILIYET = {
  hemen: ['Hemen bakılmalı', 'Araç zorlanmamalı.'],
  yakinda: ['Birkaç gün içinde bakılmalı', 'Araç çoğu zaman yürür ama arıza büyüyebilir.'],
  izle: ['Acil değil', 'Sürüşü genelde etkilemez; ilk bakımda kontrol edilir.'],
};
const SIK = ['P0420', 'P0300', 'P0171', 'P0562', 'U0100', 'P2002'];

const lamba = `<svg viewBox="0 0 64 44" aria-hidden="true"><path d="M14 10h8V6h14v4h6l5 6h5v-4h4v20h-4v-4h-5l-6 8H22l-5-6h-3v4H8V12h6z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/></svg>`;

function yapi(kod) {
  const [h, ikinci, ucuncu] = kod;
  const ozel = ikinci === '1' || (ikinci === '3' && h !== 'U');
  return [
    [h, 'Sistem', SISTEM[h]],
    [ikinci, 'Tür', ikinci === '0' || ikinci === '2' ? 'Genel kod, her markada aynı anlama gelir' : ozel ? 'Üreticiye özel kod' : 'Genel ya da üreticiye özel'],
    [ucuncu, 'Alt sistem', h === 'P' ? P_ALT[ucuncu] || 'Motor alt sistemi' : 'Sisteme göre değişir'],
    [kod.slice(3), 'Hata no', 'Arızalı devreyi ya da parçayı gösterir'],
  ];
}

export const arizaKodu = {
  render(d) {
    return `
      <section class="k-bolum ak" aria-labelledby="ak-baslik">
        <div class="k-kap">
          <div class="ak__bas">
            <h2 class="k-h2" id="ak-baslik" data-bol>Arıza kodu sorgulama</h2>
            <p class="k-lead">Kod yazılınca hangi sisteme ait olduğu, ne anlama geldiği ve ne kadar acil olduğu görünür. Listede ${new Set([...(d.arizaKodlari || []), ...(d.kodSozluk || [])].map((x) => x.kod)).size} yaygın kod var.</p>
          </div>
          <div class="ak__ic">
            <div class="ak__sol">
              <label class="ak__giris"><span>Hata kodu</span><input name="kod" value="P0420" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="ak-ipucu"></label>
              <p class="ak__ipucu" id="ak-ipucu">P0420 ya da U0100 gibi, bir harf ve dört karakterden oluşur.</p>
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
        sonuc.innerHTML = `<div class="ak__bos">${lamba}<p>${q.length < 5 ? 'Kodu tamamlayın.' : 'Yazılan kod, arıza kodu biçiminde değil.'} Kod P, B, C ya da U harfiyle başlar, ardından dört karakter gelir.</p></div>`;
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
        ${x ? `<h3 class="ak__anlam">${esc(x.anlam)}</h3>` : `<h3 class="ak__anlam">Bu kod listede yok</h3>`}
        ${a ? `<p class="ak__aciliyet"><strong>${a[0]}.</strong> ${a[1]}</p>` : ''}
        <p class="ak__not">${esc(x?.not || (q[1] === '1' ? 'Üreticiye özel bir kod. Anlamı markadan markaya değişir, markanın kendi listesinden bakılır.' : 'Asıl sebep cihazla okunan canlı veri ve ölçümle bulunur.'))}</p>
        <div class="k-butonlar">
          <a class="k-btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Kodu WhatsApp'la gönder</span></a>
          <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
        </div>
        <p class="ak__uyari">Kod yalnızca arızanın hangi sistemde olduğunu gösterir. Sebep cihazla ve ölçüm yapılarak bulunur.</p>`;
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

// Sektör imzası 2: akü ve şarj ölçümü. Üç ölçüm anı (motor kapalı / marş anında / motor çalışırken) seçilir,
// voltmetrede okunan değer kaydırılır; skala bölgeleri ve sade Türkçe yorum canlı güncellenir. Değerler 12 V
// kurşun asit akü için yaklaşık başvuru değerleridir; görsel lib3d akünün temsilî Cycles çizimidir.
const OLCUMLER = {
  kapali: {
    ad: 'Motor kapalı', ne: 'Araç en az bir saat durduktan sonra kutup başlarından ölçülür.', min: 11, max: 13, adim: 0.05, ilk: 12.3,
    bolge: [[11, 12, 'kirmizi'], [12, 12.4, 'sari'], [12.4, 13, 'yesil']],
    yorum: (v) => v >= 12.6 ? ['yesil', 'Akü dolu.', 'Marş sorunu varsa sebep akü değil; marş motoru, kablo ya da şase kontrol edilir.']
      : v >= 12.4 ? ['yesil', 'Yaklaşık %75 dolu.', 'Akü kullanılabilir. Kısa yolda kullanılan araçta akü tam dolmayabilir, motor çalışırken de ölçmek gerekir.']
      : v >= 12.2 ? ['sari', 'Yarı yarıya boş.', 'Şarj edilip yük testine alınır. Soğuk sabahta marş zorlanabilir.']
      : v >= 12.0 ? ['sari', 'Yaklaşık %25 dolu.', 'Kış sabahı araç marş basmayabilir. Akü şarj edilip test edilir, araç dururken kaçak akım da ölçülür.']
      : ['kirmizi', 'Akü boş ya da hücre arızalı.', 'Şarj edilse bile tutmayabilir. Sorunun aküde mi şarjda mı olduğu test cihazıyla anlaşılır.'],
  },
  mars: {
    ad: 'Marş anında', ne: 'Marşa basıldığında voltajın düştüğü en alt değer okunur.', min: 8, max: 12, adim: 0.05, ilk: 10.2,
    bolge: [[8, 9.6, 'kirmizi'], [9.6, 10.5, 'sari'], [10.5, 12, 'yesil']],
    yorum: (v) => v >= 10.5 ? ['yesil', 'Akü marşı rahat çeviriyor.', 'Marş sırasında voltaj yeterince yüksek kalıyor.']
      : v >= 9.6 ? ['sari', 'Akü sınırda.', 'Yazın çalışır, soğukta zorlanır. Akü yük testine alınır, marş kabloları kontrol edilir.']
      : ['kirmizi', 'Akü zayıf ya da marş fazla akım çekiyor.', 'Akü yük testine alınır, marş motorunun çektiği akım ölçülür.'],
  },
  calisiyor: {
    ad: 'Motor çalışırken', ne: 'Rölantide, far ve klima hem açıkken hem kapalıyken ölçülür.', min: 12, max: 15.6, adim: 0.05, ilk: 14.1,
    bolge: [[12, 13.2, 'kirmizi'], [13.2, 13.8, 'sari'], [13.8, 14.7, 'yesil'], [14.7, 15.6, 'kirmizi']],
    yorum: (v) => v > 14.7 ? ['kirmizi', 'Dinamo fazla şarj ediyor.', 'Konjektör (regülatör) voltajı tutmuyor. Akü kaynar, ampuller ve beyinler zarar görebilir; beklemeden bakılmalı.']
      : v >= 13.8 ? ['yesil', 'Şarj normal.', 'Dinamo aküyü dolduruyor. Akü yine de boşalıyorsa araç dururken kaçak akım ölçülür.']
      : v >= 13.2 ? ['sari', 'Şarj düşük.', 'Voltaj yük altında düşüyorsa sebep kayış, kömür ya da konjektör olabilir. Far ve klima açıkken tekrar ölçülür.']
      : ['kirmizi', 'Şarj yok.', 'Araç yalnız aküyle çalışıyor, akü bir süre sonra biter. Dinamo, kömür, konjektör ve şarj kablosu kontrol edilir.'],
  },
};

export const akuTesti = {
  render(d) {
    const img = `${import.meta.env.BASE_URL}img/kurumsal-elektrik/aku-3d.jpg`;
    const sekmeler = Object.entries(OLCUMLER).map(([k, o], i) => `<button type="button" class="at__sekme" data-olcum="${k}" aria-pressed="${i === 0}">${esc(o.ad)}</button>`).join('');
    return `
      <section class="k-bolum at" aria-labelledby="at-baslik">
        <div class="k-kap at__ic">
          <div class="at__metin">
            <h2 class="k-h2" id="at-baslik" data-bol>Akü ve şarj ölçümü</h2>
            <p class="k-lead">Akü, marş ve şarj sisteminin durumu üç ayrı ölçümle anlaşılır. Ölçüm anı seçilip voltmetre değeri kaydırılınca okunan değerin anlamı görünür.</p>
            <div class="at__sekmeler" role="group" aria-label="Ölçüm anı">${sekmeler}</div>
            <div class="at__olcer">
              <p class="at__ne"></p>
              <p class="at__deger" aria-live="polite"><output class="at__v">12,30</output><span>V</span></p>
              <div class="at__skala" aria-hidden="true"><div class="at__bolgeler"></div></div>
              <label class="at__kaydir"><span class="sr-only">Voltmetrede okunan değer</span><input type="range" aria-describedby="at-yorum"></label>
              <p class="at__uclar" aria-hidden="true"><span class="at__min"></span><span class="at__max"></span></p>
            </div>
            <div class="at__yorum" id="at-yorum" aria-live="polite"><strong></strong><p></p></div>
            <div class="k-butonlar">
              <a class="k-btn" href="${waHref(d, `Merhaba ${d.isletme.ad}, akü ve şarj kontrolü için ne zaman gelebilirim?\nAraç: `)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Akü kontrolü için WhatsApp</span></a>
            </div>
            <p class="at__not">Değerler 12 voltluk kurşun asit akü için yaklaşıktır. Akünün durumu kesin olarak yük testiyle anlaşılır.</p>
          </div>
          <figure class="at__gorsel" data-perde>
            <img src="${img}" alt="Kapağı kaldırılmış 12 voltluk akü ve kutup başı kablolarının temsilî 3D çizimi" loading="lazy" width="1200" height="1200">
            <figcaption>Temsilî 3D çizim</figcaption>
          </figure>
        </div>
      </section>`;
  },

  mount(el) {
    const kok = el.querySelector('.at');
    const giris = el.querySelector('.at__kaydir input');
    const vEl = el.querySelector('.at__v');
    const ne = el.querySelector('.at__ne');
    const bolgeler = el.querySelector('.at__bolgeler');
    const yorum = el.querySelector('.at__yorum');
    const minEl = el.querySelector('.at__min');
    const maxEl = el.querySelector('.at__max');
    const sekmeler = el.querySelectorAll('[data-olcum]');
    let o = OLCUMLER.kapali;
    let son = '';
    const virgul = (n) => n.toFixed(2).replace('.', ',');
    const yuzde = (v) => ((v - o.min) / (o.max - o.min)) * 100;

    const ciz = (animasyon) => {
      const v = Number(giris.value);
      vEl.textContent = virgul(v);
      giris.setAttribute('aria-valuetext', `${virgul(v)} volt`);
      const [renk, bas, metin] = o.yorum(v);
      kok.dataset.durum = renk;
      if (bas + metin !== son) {
        son = bas + metin;
        yorum.querySelector('strong').textContent = bas;
        yorum.querySelector('p').textContent = metin;
        if (animasyon && !reducedMotion) gsap.fromTo(yorum, { y: 6, autoAlpha: 0.4 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
      }
    };

    const sec = (k) => {
      o = OLCUMLER[k];
      sekmeler.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.olcum === k)));
      Object.assign(giris, { min: o.min, max: o.max, step: o.adim });
      giris.value = o.ilk;
      ne.textContent = o.ne;
      minEl.textContent = `${virgul(o.min).replace(',00', '')} V`;
      maxEl.textContent = `${virgul(o.max).replace(',00', '')} V`;
      bolgeler.innerHTML = o.bolge.map(([a, b, r]) => `<i data-r="${r}" style="left:${yuzde(a)}%;width:${yuzde(b) - yuzde(a)}%"></i>`).join('');
      son = '';
      ciz(true);
    };

    giris.addEventListener('input', () => ciz(true));
    sekmeler.forEach((b) => b.addEventListener('click', () => sec(b.dataset.olcum)));
    sec('kapali');
  },
};
