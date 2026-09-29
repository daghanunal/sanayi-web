// Sektör modülleri (kurumsal-eczane, "Kurumsal Nöbet"):
// (1) etiket: eczacının kutunun üstüne yazdığı kullanım etiketi. Zaman (sabah/öğle/akşam/gece), aç-tok ve süre
//     seçilir; kutudaki el yazısı etiket ve 24 saatlik gün şeridi değişir. Örnek etikettir; dozu hekim belirler.
// (2) nobetBilgi: nöbetçi eczane bağlantısı ve "Örnek" etiketli nöbet takvimi. Saatler ve adres motorun `konum`
//     bölümünde; bu modül saat göstermez.
import { esc, waHref, icons, gsap, reducedMotion } from '../../shared/core.js';

// --- (1) Kutu etiketi --------------------------------------------------------------------------
const ZAMAN = [
  { id: 'sabah', ad: 'Sabah', saat: 8 },
  { id: 'ogle', ad: 'Öğle', saat: 13 },
  { id: 'aksam', ad: 'Akşam', saat: 19 },
  { id: 'gece', ad: 'Gece', saat: 23 },
];
const ACLIK = [
  { id: 'tok', ad: 'Tok karnına' },
  { id: 'ac', ad: 'Aç karnına' },
  { id: 'fark', ad: 'Fark etmez' },
];
const SURE = [
  { id: '5', ad: '5 gün' },
  { id: '10', ad: '10 gün' },
  { id: 'surekli', ad: 'Sürekli' },
];

const cip = (grup, o, on, tip = 'radio') =>
  `<button type="button" class="ec-cip" data-grup="${grup}" data-id="${o.id}" role="${tip === 'radio' ? 'radio' : 'checkbox'}" aria-checked="${on}">${esc(o.ad)}</button>`;

export const etiket = {
  render(d) {
    return `
      <section class="k-bolum ec-etiket" aria-labelledby="ec-etiket-baslik">
        <div class="k-kap">
          <div class="ec-etiket__bas">
            <h2 class="k-h2" id="ec-etiket-baslik" data-bol>İlaç kutusu etiketi</h2>
            <p class="k-lead">İlacın kullanım saatleri ve aç-tok bilgisi teslim sırasında kutunun üstüne yazılır. Aşağıda örnek bir etiket var.</p>
          </div>
          <div class="ec-etiket__ic">
            <form class="ec-panel" aria-label="Örnek etiket seçenekleri" onsubmit="return false">
              <fieldset>
                <legend>Günün hangi saatleri</legend>
                <div class="ec-ciper">${ZAMAN.map((z) => cip('zaman', z, z.id === 'sabah' || z.id === 'aksam', 'check')).join('')}</div>
              </fieldset>
              <fieldset>
                <legend>Yemekle</legend>
                <div class="ec-ciper" role="radiogroup" aria-label="Yemekle">${ACLIK.map((a, i) => cip('aclik', a, i === 0)).join('')}</div>
              </fieldset>
              <fieldset>
                <legend>Ne kadar süre</legend>
                <div class="ec-ciper" role="radiogroup" aria-label="Süre">${SURE.map((s, i) => cip('sure', s, i === 1)).join('')}</div>
              </fieldset>
              <a class="k-btn ec-wa" data-ec-wa href="${waHref(d, 'Merhaba, ilacım için hatırlatma istiyorum.')}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bitmeden hatırlatma</span></a>
            </form>
            <figure class="ec-sahne" aria-live="polite">
              <div class="ec-kutu" aria-hidden="true">
                <div class="ec-kutu__ust"></div>
                <div class="ec-kutu__yuz">
                  <span class="ec-kutu__cizgi"></span><span class="ec-kutu__cizgi ec-kutu__cizgi--k"></span>
                  <span class="ec-kutu__bant"></span>
                </div>
                <div class="ec-yapiskan" data-ec-yapiskan>
                  <p class="ec-yapiskan__satir" data-ec-satir1>Sabah 1 · Akşam 1</p>
                  <p class="ec-yapiskan__satir ec-yapiskan__satir--k" data-ec-satir2>tok karnına · 10 gün</p>
                  <span class="ec-yapiskan__imza"></span>
                </div>
              </div>
              <div class="ec-gun" aria-hidden="true">
                <div class="ec-gun__serit">
                  ${Array.from({ length: 5 }, (_, i) => `<span class="ec-gun__saat" style="--x:${(i * 6) / 24}">${String(i * 6).padStart(2, '0')}</span>`).join('')}
                  ${ZAMAN.map((z) => `<i class="ec-gun__doz" data-doz="${z.id}" style="--x:${z.saat / 24}"></i>`).join('')}
                </div>
              </div>
              <figcaption class="ec-sahne__not"><span class="ec-rozet">Örnek etiket</span> Doz ve süre hekimin reçetesine göre yazılır.</figcaption>
            </figure>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const secim = { zaman: new Set(['sabah', 'aksam']), aclik: 'tok', sure: '10' };
    const s1 = el.querySelector('[data-ec-satir1]');
    const s2 = el.querySelector('[data-ec-satir2]');
    const yap = el.querySelector('[data-ec-yapiskan]');
    const wa = el.querySelector('[data-ec-wa]');
    const cizim = () => {
      const z = ZAMAN.filter((x) => secim.zaman.has(x.id));
      const satir1 = z.length ? z.map((x) => `${x.ad} 1`).join(' · ') : 'Gerektiğinde';
      const ac = ACLIK.find((x) => x.id === secim.aclik).ad.toLocaleLowerCase('tr-TR');
      const sure = SURE.find((x) => x.id === secim.sure).ad.toLocaleLowerCase('tr-TR');
      s1.textContent = satir1;
      s2.textContent = `${ac} · ${sure}`;
      el.querySelectorAll('[data-doz]').forEach((i) => i.classList.toggle('is-on', secim.zaman.has(i.dataset.doz)));
      el.querySelectorAll('.ec-cip').forEach((b) => {
        const g = b.dataset.grup;
        const on = g === 'zaman' ? secim.zaman.has(b.dataset.id) : secim[g] === b.dataset.id;
        b.setAttribute('aria-checked', String(on));
      });
      wa.href = waHref(d, `Merhaba, "${satir1}, ${ac}, ${sure}" kullandığım ilacım için bitmeden hatırlatma istiyorum.`);
      if (!reducedMotion) gsap.fromTo(yap, { rotate: -5, scale: 0.96 }, { rotate: -2.5, scale: 1, duration: 0.45, ease: 'back.out(2.4)' });
    };
    el.querySelectorAll('.ec-cip').forEach((b) =>
      b.addEventListener('click', () => {
        const g = b.dataset.grup;
        if (g === 'zaman') {
          secim.zaman.has(b.dataset.id) ? secim.zaman.delete(b.dataset.id) : secim.zaman.add(b.dataset.id);
        } else secim[g] = b.dataset.id;
        cizim();
      })
    );
    cizim();
  },
};

// --- (2) Nöbet bilgisi ------------------------------------------------------------------------
function takvim(d) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const gunSay = new Date(y, m + 1, 0).getDate();
  const bas = (new Date(y, m, 1).getDay() + 6) % 7;
  const nobet = d.nobet?.ornekGunler || [];
  const ay = now.toLocaleDateString('tr-TR', { month: 'long' });
  const h = [];
  for (let i = 0; i < bas; i++) h.push('<li class="is-bos"></li>');
  for (let g = 1; g <= gunSay; g++) {
    const c = [nobet.includes(g) ? 'is-nobet' : '', g === now.getDate() ? 'is-bugun' : ''].filter(Boolean).join(' ');
    h.push(`<li${c ? ` class="${c}"` : ''}>${g}</li>`);
  }
  return `
    <figure class="ec-takvim">
      <figcaption><b>${esc(ay[0].toLocaleUpperCase('tr-TR') + ay.slice(1))} nöbet günleri</b><span class="ec-rozet">Örnek</span></figcaption>
      <ol class="ec-takvim__gun" aria-hidden="true">${['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((g) => `<li>${g}</li>`).join('')}</ol>
      <ol class="ec-takvim__ay" aria-hidden="true">${h.join('')}</ol>
      <p class="ec-takvim__not">Örnek görünüm. Nöbet günleri her ay oda çizelgesiyle belirlenir.</p>
    </figure>`;
}

export const nobetBilgi = {
  render(d) {
    const n = d.nobet || {};
    const kaynak = n.kaynak || 'Ankara Eczacı Odası';
    return `
      <section class="k-bolum nobet" aria-labelledby="nobet-baslik">
        <div class="k-kap nobet__ic">
          <div class="nobet__durum is-kapali">
            <h2 class="nobet__baslik" id="nobet-baslik">Nöbetçi eczane</h2>
            <p class="nobet__metin">Eczane kapalıyken ilaç gerekirse o gece nöbet tutan eczaneler ${esc(kaynak)}'nın güncel listesinden bulunur. Nöbetçi olunan geceler eczanenin kapısında da yazar.</p>
            <a class="k-btn nobet__btn" href="${esc(n.url || 'https://www.aeo.org.tr/nobetci-eczaneler')}" target="_blank" rel="noopener">Bu gece nöbetçi eczaneler</a>
          </div>
          <div class="nobet__gece">
            ${takvim(d)}
          </div>
        </div>
      </section>`;
  },
};
