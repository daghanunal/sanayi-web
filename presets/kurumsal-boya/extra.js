// Sektöre özel modül: sigorta / kasko hasar dosyası. Dört adımlı süreç göstergesi (ekspertiz → onay → onarım → teslim)
// ve araç üstten görünüşünde hasarlı bölgeyi işaretleyip WhatsApp'tan fotoğraf gönderme akışı. Metinler öznesiz.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const ADIMLAR = [
  {
    baslik: 'Ekspertiz', sure: '1–3 iş günü',
    is: 'Araç kabul edilir, hasar fotoğraflanır. Sigorta ihbarı ve eksper randevusu için yardımcı olunur.',
    gerek: 'Kaza tespit tutanağı, ruhsat ve ehliyet fotoğrafı.',
  },
  {
    baslik: 'Onay', sure: '1–5 iş günü',
    is: 'Eksperle parça ve işçilik listesi çıkarılır. Sigorta onayı gelmeden işe başlanmaz.',
    gerek: 'Poliçe numarası. Muafiyet varsa işe başlamadan söylenir.',
  },
  {
    baslik: 'Onarım', sure: 'Hasara göre 2–10 gün',
    is: "Kaporta ölçülerek düzeltilir, boya fırınlı kabinde atılır. Ara aşamaların fotoğrafları WhatsApp'tan gönderilir.",
    gerek: 'Bu aşamada bir şey gerekmez.',
  },
  {
    baslik: 'Teslim', sure: 'Aynı gün',
    is: 'Araç gün ışığı lambasının altında kontrol edilir, yıkanıp teslim edilir.',
    gerek: 'Teslim sırasında aracın birlikte gözden geçirilmesi.',
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
            <p class="hd__etiket">Kasko ve trafik sigortası</p>
            <h2 class="k-h2" id="hd-baslik" data-bol>Hasar dosyası</h2>
            <p class="k-lead">Sigorta dosyalı onarım dört adımda ilerler. Süreler dosyaya ve sigorta şirketine göre değişir.</p>
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
              <p class="hd__soru">Hasarlı bölge <span>Araç üzerinde dokunarak işaretlenir</span></p>
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
              <label class="hd__alan"><span class="hd__soru">Araç <span>marka, model, yıl</span></span><input name="arac" autocomplete="off" placeholder="Örneğin 2019 Passat"></label>
              <p class="hd__secilen" aria-live="polite">Bölge seçilmedi</p>
              <div class="hd__kareler">
                <p class="hd__soru">Gönderilecek dört fotoğraf</p>
                <ol>${KARELER.map((k) => `<li>${esc(k)}</li>`).join('')}</ol>
              </div>
              <a class="k-btn hd__wa" target="_blank" rel="noopener">WhatsApp'tan gönder</a>
              <p class="hd__not">Mesaj hazır açılır, fotoğraflar aynı sohbete eklenir. Fiyat ve süre WhatsApp'tan bildirilir.</p>
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
        <div><h3>Yapılan iş</h3><p>${esc(a.is)}</p></div>
        <div><h3>Gerekenler</h3><p>${esc(a.gerek)}</p></div>`;
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

// Sektör imzası: "son kontrol". Kütüphanedeki otomobilin (lib3d car) şampanya metalik Cycles render'ı, gün ışığı
// lambalarının yansıması gövde boyunca akıyor; kaydırdıkça lamba ışığı görselin üstünden geçer. Görsel temsilîdir.
const KONTROLLER = [
  ['Renk tonu', 'Boyanan panel yandaki panelle gün ışığında karşılaştırılır.'],
  ['Yüzey ve parlaklık', 'Lambanın yansımasının panel boyunca düz akıp akmadığına bakılır. Portakal kabuğu, akıntı ya da toz pastayla alınır.'],
  ['Kenar ve aralıklar', 'Söküp takılan çıta, fitil ve kapı aralıkları kontrol edilir. Bant izi ve boya taşması temizlenir.'],
  ['Boya kalınlığı', 'Boya kalınlığı panel panel ölçülüp kaydedilir.'],
];
const okSvg = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const sonKontrol = {
  render() {
    const img = `${import.meta.env.BASE_URL}img/kurumsal-boya/kontrol-3d.jpg`;
    const konu = encodeURIComponent('Hasar / sigorta dosyası');
    return `
      <section class="k-bolum sk" aria-labelledby="sk-baslik">
        <div class="k-kap sk__ic">
          <figure class="sk__gorsel" data-perde>
            <img src="${img}" alt="Gün ışığı lambalarının altında şampanya renkli otomobilin temsilî 3D çizimi" loading="lazy" width="1600" height="1200">
            <span class="sk__isik" aria-hidden="true"></span>
            <figcaption>Temsilî 3D çizim</figcaption>
          </figure>
          <div class="sk__metin">
            <p class="sk__ust">Teslimden önce</p>
            <h2 class="k-h2" id="sk-baslik" data-bol>Gün ışığında <em>son kontrol</em></h2>
            <p class="k-lead">Kabinden çıkan araç teslimden önce gün ışığı lambasının altında dört açıdan kontrol edilir.</p>
            <ol class="sk__liste" data-sira>
              ${KONTROLLER.map(([a, b], i) => `<li><span class="sk__no">${['i', 'ii', 'iii', 'iv'][i]}</span><div><h3>${esc(a)}</h3><p>${esc(b)}</p></div></li>`).join('')}
            </ol>
            <a class="k-link sk__link" href="#/iletisim?konu=${konu}" data-rota="iletisim?konu=${konu}">Hasar için bilgi alın ${okSvg}</a>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const isik = el.querySelector('.sk__isik');
    gsap.fromTo(isik, { xPercent: -120 }, {
      xPercent: 220, ease: 'none',
      scrollTrigger: { trigger: el.querySelector('.sk__gorsel'), start: 'top 85%', end: 'bottom 15%', scrub: 0.6 },
    });
  },
};
