// Sektöre özel modül: sigorta / kasko hasar dosyası. Dört adımlı süreç göstergesi (ekspertiz → onay → onarım → teslim)
// ve araç üstten görünüşünde hasarlı bölgeyi işaretleyip WhatsApp'tan fotoğraf gönderme akışı.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const ADIMLAR = [
  {
    baslik: 'Ekspertiz', sure: '1-3 iş günü',
    biz: 'Aracı kabul eder, hasarı fotoğraflarız. Sigorta ihbarını ve eksper randevusunu sizin adınıza biz alırız.',
    siz: 'Kaza tespit tutanağı, ruhsat ve ehliyet fotoğrafı.',
  },
  {
    baslik: 'Onay', sure: '1-5 iş günü',
    biz: 'Eksperle birlikte parça ve işçilik listesini çıkarırız. Onay gelmeden işe başlamaz, durumu size yazarız.',
    siz: 'Poliçe numaranız. Muafiyet varsa baştan söyleriz.',
  },
  {
    baslik: 'Onarım', sure: 'Hasara göre 2-10 gün',
    biz: 'Kaporta ölçüyle düzeltilir, boya fırınlı kabinde yapılır. Ara aşamaları fotoğrafla size göndeririz.',
    siz: 'Hiçbir şey. Merak ettiğinizde arayın ya da yazın.',
  },
  {
    baslik: 'Teslim', sure: 'Aynı gün',
    biz: 'Gün ışığı lambası altında son kontrol, yıkama ve fotoğraflı iş raporuyla teslim. Dosya kapanışını biz takip ederiz.',
    siz: 'Aracı teslim alırken bizimle bir tur dönüp bakın.',
  },
];

const TURLER = ['Kasko', 'Karşı tarafın trafik sigortası', 'Ücretli onarım', 'Emin değilim'];

// Araç üstten görünüş (burnu yukarıda). [id, ad, svg şekli]
const BOLGELER = [
  ['on-tampon', 'Ön tampon', '<rect x="44" y="8" width="112" height="26" rx="13"/>'],
  ['kaput', 'Kaput', '<path d="M50 40h100l6 78H44z"/>'],
  ['sol-on', 'Sol ön çamurluk', '<rect x="16" y="44" width="24" height="84" rx="10"/>'],
  ['sag-on', 'Sağ ön çamurluk', '<rect x="160" y="44" width="24" height="84" rx="10"/>'],
  ['sol-kapi', 'Sol kapılar', '<rect x="16" y="136" width="24" height="132" rx="10"/>'],
  ['sag-kapi', 'Sağ kapılar', '<rect x="160" y="136" width="24" height="132" rx="10"/>'],
  ['tavan', 'Tavan', '<rect x="52" y="152" width="96" height="108" rx="14"/>'],
  ['sol-arka', 'Sol arka çamurluk', '<rect x="16" y="276" width="24" height="76" rx="10"/>'],
  ['sag-arka', 'Sağ arka çamurluk', '<rect x="160" y="276" width="24" height="76" rx="10"/>'],
  ['bagaj', 'Bagaj', '<path d="M46 292h108l-4 58H50z"/>'],
  ['arka-tampon', 'Arka tampon', '<rect x="44" y="358" width="112" height="26" rx="13"/>'],
];

const KARELER = ['Aracın 45 derece açıdan genel görünümü', 'Hasarın yakından fotoğrafı', 'Plaka görünecek şekilde bir kare', 'Kilometre göstergesi'];

export const hasarDosyasi = {
  render() {
    return `
      <section class="k-bolum hd" aria-labelledby="hd-baslik">
        <div class="k-kap">
          <div class="hd__bas">
            <p class="hd__etiket">Sigorta ve kasko hasarı</p>
            <h2 class="k-h2" id="hd-baslik" data-bol>Dosyanız dört adımda kapanır</h2>
            <p class="k-lead">Kaza sonrası evrak ve eksper işini siz değil, biz takip ederiz. Hangi adımda ne olduğunu her zaman bilirsiniz.</p>
          </div>

          <div class="hd__surec">
            <ol class="hd__adimlar" role="tablist" aria-label="Hasar süreci adımları">
              ${ADIMLAR.map((a, i) => `<li role="presentation"><button type="button" role="tab" id="hd-tab-${i}" aria-controls="hd-panel" aria-selected="${i === 0}" data-adim="${i}"><span class="hd__no">${i + 1}</span><span class="hd__ad">${esc(a.baslik)}</span></button></li>`).join('')}
            </ol>
            <div class="hd__ray" aria-hidden="true"><span class="hd__dolu"></span></div>
            <div class="hd__panel" id="hd-panel" role="tabpanel" aria-live="polite"></div>
          </div>

          <div class="hd__gonder">
            <div class="hd__arac">
              <p class="hd__soru">Hasar nerede? <span>Araçta dokunarak işaretleyin</span></p>
              <svg class="hd__svg" viewBox="0 0 200 392" role="group" aria-label="Araç üstten görünüş, hasarlı bölgeyi seçin">
                <rect class="hd__govde" x="30" y="4" width="140" height="384" rx="46"/>
                <path class="hd__cam" d="M56 124h88l-6 22H62z"/><path class="hd__cam" d="M60 266h80l4 20H56z"/>
                ${BOLGELER.map(([id, ad, sekil]) => `<g class="hd__bolge" data-bolge="${id}" role="checkbox" aria-checked="false" tabindex="0" aria-label="${esc(ad)}">${sekil}</g>`).join('')}
              </svg>
            </div>
            <form class="hd__form" onsubmit="return false">
              <fieldset><legend class="hd__soru">Dosya türü</legend>
                <div class="hd__secim">${TURLER.map((t, i) => `<label><input type="radio" name="tur" value="${esc(t)}"${i === 0 ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>
              </fieldset>
              <label class="hd__alan"><span class="hd__soru">Araç <span>marka, model, yıl</span></span><input name="arac" autocomplete="off" placeholder="Örn. 2019 Passat"></label>
              <p class="hd__secilen" aria-live="polite">Bölge seçilmedi</p>
              <div class="hd__kareler">
                <p class="hd__soru">Göndereceğiniz dört kare</p>
                <ol>${KARELER.map((k) => `<li>${esc(k)}</li>`).join('')}</ol>
              </div>
              <a class="k-btn hd__wa" target="_blank" rel="noopener">WhatsApp'tan fotoğraf gönderin</a>
              <p class="hd__not">Mesaj hazır açılır; fotoğrafları aynı sohbete ekleyin. Aynı gün fiyat ve süre bildiririz.</p>
            </form>
          </div>
        </div>
      </section>`;
  },

  mount(el, d) {
    const panel = el.querySelector('.hd__panel');
    const dolu = el.querySelector('.hd__dolu');
    const sekmeler = [...el.querySelectorAll('[data-adim]')];
    const adimGoster = (i, ilk) => {
      const a = ADIMLAR[i];
      sekmeler.forEach((b, j) => {
        b.setAttribute('aria-selected', j === i);
        b.classList.toggle('is-gecti', j < i);
      });
      panel.setAttribute('aria-labelledby', `hd-tab-${i}`);
      panel.innerHTML = `
        <div class="hd__sure"><span>Adım ${i + 1} / ${ADIMLAR.length}</span><strong>${esc(a.sure)}</strong></div>
        <div><h3>Biz ne yapıyoruz</h3><p>${esc(a.biz)}</p></div>
        <div><h3>Sizden ne gerekiyor</h3><p>${esc(a.siz)}</p></div>`;
      const oran = i / (ADIMLAR.length - 1);
      if (reducedMotion || ilk) gsap.set(dolu, { scaleX: oran });
      else {
        gsap.to(dolu, { scaleX: oran, duration: 0.7, ease: 'power3.inOut' });
        gsap.fromTo(panel.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out' });
      }
    };
    sekmeler.forEach((b, i) => b.addEventListener('click', () => adimGoster(i, false)));
    el.querySelector('.hd__adimlar').addEventListener('keydown', (e) => {
      const i = sekmeler.indexOf(document.activeElement);
      if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + sekmeler.length) % sekmeler.length;
      sekmeler[j].focus();
      adimGoster(j, false);
    });
    adimGoster(0, true);
    // Bölüm görünür olunca ray bir kez baştan sona dolup ilk adıma döner: sürecin tamamı bir bakışta.
    if (!reducedMotion) {
      gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.hd__surec'), start: 'top 75%', once: true } })
        .fromTo(dolu, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.inOut' })
        .fromTo(sekmeler.map((b) => b.querySelector('.hd__no')), { scale: 0.6 }, { scale: 1, duration: 0.4, stagger: 0.28, ease: 'back.out(3)' }, 0)
        .to(dolu, { scaleX: 0, duration: 0.6, ease: 'power2.inOut' }, '+=0.2');
    }

    // Hasar bölgesi seçimi + WhatsApp mesajı
    const form = el.querySelector('.hd__form');
    const secilen = el.querySelector('.hd__secilen');
    const wa = el.querySelector('.hd__wa');
    const bolgeler = [...el.querySelectorAll('[data-bolge]')];
    const guncelle = () => {
      const f = new FormData(form);
      const secili = bolgeler.filter((g) => g.getAttribute('aria-checked') === 'true').map((g) => g.getAttribute('aria-label'));
      secilen.textContent = secili.length ? `Seçilen: ${secili.join(', ')}` : 'Bölge seçilmedi';
      const arac = String(f.get('arac') || '').trim();
      const mesaj = [
        `Merhaba ${d.isletme.ad}, hasar için fiyat ve süre öğrenmek istiyorum.`,
        `Dosya türü: ${f.get('tur')}`,
        `Hasarlı bölge: ${secili.length ? secili.join(', ') : 'belirtmedim'}`,
        arac ? `Araç: ${arac}` : '',
        'Fotoğrafları bu mesajın ardından gönderiyorum.',
      ].filter(Boolean).join('\n');
      wa.href = waHref(d, mesaj);
    };
    const degistir = (g) => {
      const acik = g.getAttribute('aria-checked') !== 'true';
      g.setAttribute('aria-checked', acik);
      if (acik && !reducedMotion) gsap.fromTo(g, { opacity: 0.35 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      guncelle();
    };
    bolgeler.forEach((g) => {
      g.addEventListener('click', () => degistir(g));
      g.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          degistir(g);
        }
      });
    });
    form.addEventListener('input', guncelle);
    guncelle();
  },
};
