// Sektöre özel modül: muayene hazırlık kontrolü. Yakıt + muayene zamanı + belirtiler →
// hazırlık göstergesi, yapılacaklar listesi ve WhatsApp ölçüm randevusu. Altında temsili ölçüm tablosu.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const YAKIT = [
  { id: 'benzin', ad: 'Benzin' },
  { id: 'dizel', ad: 'Dizel' },
  { id: 'lpg', ad: 'Benzin + LPG' },
];
const ZAMAN = [
  { id: 'hafta', ad: 'Bu hafta', not: 'Vakit dar. Ölçümü bugün ya da yarın yapalım; parça gerekirse zaman kalsın.' },
  { id: 'ay', ad: 'Bu ay', not: 'Muayeneden birkaç gün önce gelin; bir sorun çıkarsa onarıma vakit kalır.' },
  { id: 'uzak', ad: '1-3 ay içinde', not: 'Rahat vaktiniz var. Belirti varsa şimdiden baktırmak işi büyümeden çözer.' },
  { id: 'bilmiyorum', ad: 'Tarihi bilmiyorum', not: 'Muayene bitiş tarihi ruhsatınızda ve e-Devlet’te yazar. Gelince birlikte de bakabiliriz.' },
];
const BELIRTI = [
  { id: 'lamba', ad: 'Motor arıza lambası yanıyor', hizmet: 'Egzoz emisyon hazırlığı', puan: 3, neden: 'Arıza lambası yanan araç muayenede sorun çıkarabilir. Önce arıza kodunu okur, sebebini buluruz.' },
  { id: 'dpf', ad: 'DPF lambası yanıyor, araç güç düşürüyor', hizmet: 'DPF temizleme', puan: 3, yakit: ['dizel'], neden: 'Dolu filtre duman değerini yükseltir. Basıncı ölçer, gerekirse söküp yıkarız.' },
  { id: 'duman', ad: 'Egzozdan renkli duman çıkıyor', hizmet: 'Egzoz emisyon hazırlığı', puan: 3, neden: 'Siyah duman yakıt, mavi duman yağ, beyaz duman su demektir. Ölçümle sebebini ayırırız.' },
  { id: 'ses', ad: 'Egzoz sesi arttı', hizmet: 'Susturucu değişimi', puan: 2, neden: 'Delinen susturucu ses sınırını aşabilir. Yalnızca delinen parçayı değiştiririz.' },
  { id: 'koku', ad: 'İçeriye egzoz kokusu geliyor', hizmet: 'Manifold ve conta', puan: 2, neden: 'Çatlak manifold ya da conta kaçağı olabilir. Dumanla kaçak testi yaparız.' },
  { id: 'cekis', ad: 'Çekiş düştü, gaz yemiyor', hizmet: 'Katalitik konvertör', puan: 2, neden: 'Tıkanan katalitik ya da DPF egzozu boğar. Tıkanıklık testiyle ayırırız.' },
  { id: 'tikirti', ad: 'Altta tıkırtı, sallanma var', hizmet: 'Askı ve kelepçe', puan: 1, neden: 'Çoğu zaman kopmuş bir lastik askıdır; kısa bir iş.' },
];
const DURUM = [
  [0, 'Görünürde sorun yok', 'Yine de muayeneden önce gaz ölçümüyle emin olun.'],
  [1, 'Küçük işler var', 'Muayeneden önce kısa bir kontrolle halledilir.'],
  [3, 'Önce ölçtürün', 'Bu belirtilerle muayenede sorun çıkabilir; önce ölçelim.'],
  [6, 'Onarım gerekebilir', 'Muayeneye gitmeden önce aracı getirin; sebebi bulup fiyatı baştan söyleyelim.'],
];
const MAKS = 8;
const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

const secim = (ad, liste, varsayilan) =>
  `<div class="mh__secim">${liste.map((x) => `<label><input type="radio" name="${ad}" value="${x.id}"${x.id === varsayilan ? ' checked' : ''}><span>${esc(x.ad)}</span></label>`).join('')}</div>`;

export const muayeneHazirlik = {
  render(d) {
    const olc = d.muayene?.olcumler || [];
    return `
      <section class="k-bolum mh" aria-labelledby="mh-baslik">
        <div class="k-kap">
          <div class="mh__bas">
            <h2 class="k-h2" id="mh-baslik" data-bol>Muayeneye hazır mısınız?</h2>
            <p class="k-lead">Aracınızda gördüklerinizi işaretleyin; muayenede sorun çıkarabilecek noktaları ve öncesinde yapılacakları görün. Ölçüm randevusunu hazır mesajla isteyin.</p>
          </div>
          <div class="mh__ic">
            <form class="mh__form" onsubmit="return false">
              <fieldset class="mh__alan"><legend>Yakıt</legend>${secim('yakit', YAKIT, 'dizel')}</fieldset>
              <fieldset class="mh__alan"><legend>Muayene zamanı</legend>${secim('zaman', ZAMAN, 'ay')}</fieldset>
              <fieldset class="mh__alan"><legend>Aracınızda neler var?</legend>
                <ul class="mh__belirti">${BELIRTI.map((b) => `<li data-b="${b.id}"><label><input type="checkbox" name="b" value="${b.id}"><span class="mh__kutu" aria-hidden="true"></span><span>${esc(b.ad)}</span></label></li>`).join('')}</ul>
              </fieldset>
            </form>
            <div class="mh__sonuc" aria-live="polite">
              <div class="mh__gosterge">
                <svg viewBox="0 0 220 124" aria-hidden="true">
                  <defs><linearGradient id="mh-isi" x1="0" x2="1"><stop offset="0" stop-color="#6fb38a"/><stop offset=".45" stop-color="#e3a33b"/><stop offset=".75" stop-color="#d9541c"/><stop offset="1" stop-color="#8f2410"/></linearGradient></defs>
                  <path d="M20 112a90 90 0 0 1 180 0" fill="none" stroke="rgb(255 255 255 / .1)" stroke-width="14" stroke-linecap="round"/>
                  <path class="mh__yay" d="M20 112a90 90 0 0 1 180 0" fill="none" stroke="url(#mh-isi)" stroke-width="14" stroke-linecap="round" pathLength="100"/>
                  <g class="mh__ibre"><path d="M110 112 L110 38" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="110" cy="112" r="8" fill="currentColor"/></g>
                </svg>
                <p class="mh__durum"><strong data-o="durum"></strong><span data-o="durumMetin"></span></p>
              </div>
              <div class="mh__yapilacak">
                <p class="mh__etiket">Muayeneden önce</p>
                <ol data-o="liste"></ol>
                <p class="mh__zaman" data-o="zaman"></p>
              </div>
              <a class="k-btn mh__gonder" target="_blank" rel="noopener">Ölçüm randevusu isteyin</a>
            </div>
          </div>
          ${
            olc.length
              ? `<figure class="mh__rapor">
                  <figcaption><span class="mh__etiket">Temsili ölçüm</span><span>İşlem öncesi ve sonrası. Sınır değerler aracın yaşına ve yakıt tipine göre değişir.</span></figcaption>
                  <ul>${olc
                    .map((o) => {
                      const tavan = Math.max(o.once, o.sonra, o.sinir) * 1.08;
                      const p = (x) => ((x / tavan) * 100).toFixed(1);
                      return `<li>
                        <span class="mh__olcad">${esc(o.ad)}</span>
                        <span class="mh__cubuk" style="--sinir:${(o.sinir / tavan).toFixed(3)}">
                          <span class="mh__once" style="width:${p(o.once)}%"><em>${nf.format(o.once)} ${esc(o.birim)}</em></span>
                          <span class="mh__sonra" style="width:${p(o.sonra)}%"><em>${nf.format(o.sonra)}</em></span>
                          <span class="mh__sinir" title="Sınır"></span>
                        </span>
                      </li>`;
                    })
                    .join('')}</ul>
                  <p class="mh__lejant"><span class="is-once"></span>Önce <span class="is-sonra"></span>Sonra <span class="is-sinir"></span>Sınır</p>
                </figure>`
              : ''
          }
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.mh__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const ibre = el.querySelector('.mh__ibre');
    const yay = el.querySelector('.mh__yay');
    const gonder = el.querySelector('.mh__gonder');
    const sure = (baslik) => d.hizmetler?.find((h) => h.baslik === baslik)?.sure;
    gsap.set(ibre, { rotation: -90, svgOrigin: '110 112' });

    const guncelle = (ilk) => {
      const f = new FormData(form);
      const yakit = YAKIT.find((x) => x.id === f.get('yakit'));
      const zaman = ZAMAN.find((x) => x.id === f.get('zaman'));
      el.querySelectorAll('[data-b]').forEach((li) => {
        const b = BELIRTI.find((x) => x.id === li.dataset.b);
        const uygun = !b.yakit || b.yakit.includes(yakit.id);
        li.hidden = !uygun;
        if (!uygun) li.querySelector('input').checked = false;
      });
      const secili = BELIRTI.filter((b) => new FormData(form).getAll('b').includes(b.id));
      const puan = secili.reduce((a, b) => a + b.puan, 0);
      const [, durum, durumMetin] = [...DURUM].reverse().find(([esik]) => puan >= esik);
      o('durum').textContent = durum;
      o('durumMetin').textContent = durumMetin;
      el.querySelector('.mh__sonuc').dataset.seviye = puan >= 6 ? 3 : puan >= 3 ? 2 : puan >= 1 ? 1 : 0;

      // Yapılacaklar: her zaman gaz ölçümü; belirtilere göre hizmetler (tekrarsız).
      const isler = [{ hizmet: 'Egzoz emisyon hazırlığı', neden: 'Gaz ve duman değerlerini önünüzde okuruz; kalacak bir değer varsa sebebini buluruz.' }];
      secili.forEach((b) => {
        const var_ = isler.find((x) => x.hizmet === b.hizmet);
        if (var_) var_.neden = b.neden;
        else isler.push({ hizmet: b.hizmet, neden: b.neden });
      });
      o('liste').innerHTML = isler
        .map((x) => `<li><span class="mh__is">${esc(x.hizmet)}${sure(x.hizmet) ? `<small>${esc(sure(x.hizmet))}</small>` : ''}</span><span class="mh__neden">${esc(x.neden)}</span></li>`)
        .join('');
      o('zaman').textContent = zaman.not;

      const oran = Math.min(puan, MAKS) / MAKS;
      if (reducedMotion || ilk) {
        gsap.set(ibre, { rotation: -90 + oran * 180, svgOrigin: '110 112' });
        yay.style.strokeDasharray = `${Math.max(oran * 100, 0.01)} 200`;
      } else {
        gsap.to(ibre, { rotation: -90 + oran * 180, svgOrigin: '110 112', duration: 0.9, ease: 'elastic.out(1, 0.55)' });
        gsap.to(yay, { strokeDasharray: `${Math.max(oran * 100, 0.01)} 200`, duration: 0.6, ease: 'power2.out' });
        gsap.fromTo(o('liste').children, { x: 12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
      }

      const mesaj = [
        `Merhaba ${d.isletme.ad}, muayene öncesi egzoz ölçümü için randevu istiyorum.`,
        `Yakıt: ${yakit.ad}`,
        `Muayene: ${zaman.ad}`,
        secili.length ? `Gördüklerim: ${secili.map((b) => b.ad).join('; ')}` : 'Belirgin bir sorun görmedim, kontrol ettirmek istiyorum.',
      ].join('\n');
      gonder.href = waHref(d, mesaj);
    };
    form.addEventListener('input', () => guncelle(false));
    guncelle(true);

    // Temsili ölçüm çubukları: görünce "önce" değerinden "sonra"ya iner.
    const rapor = el.querySelector('.mh__rapor');
    if (rapor && !reducedMotion) {
      gsap.from(rapor.querySelectorAll('.mh__once, .mh__sonra'), {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: rapor, start: 'top 82%', once: true },
      });
    }
  },
};
