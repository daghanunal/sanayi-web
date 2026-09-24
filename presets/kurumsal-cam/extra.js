// Sektöre özel modül: kasko hasar başvurusu. Dört adım (hasar, poliçe, fotoğraf, onay ve montaj) →
// özet + WhatsApp başvuru mesajı. Yanda seçilen camı gösteren araç (üstten görünüş) çizimi.
import { esc, waHref, gsap, reducedMotion } from '../../shared/core.js';

const CAM = [
  { id: 'on', ad: 'Ön cam' },
  { id: 'yan', ad: 'Yan cam' },
  { id: 'arka', ad: 'Arka cam' },
  { id: 'tavan', ad: 'Sunroof / tavan' },
];
const HASAR = [
  { id: 'tas', ad: 'Taş izi' },
  { id: 'catlak', ad: 'Çatlak' },
  { id: 'kirik', ad: 'Kırık' },
];
const POLICE = [
  { id: 'kasko', ad: 'Kaskom var', not: 'Poliçenizde cam teminatı ve muafiyet olup olmadığını biz kontrol ederiz. Onay gelmeden işe başlamayız.' },
  { id: 'trafik', ad: 'Karşı tarafın trafik sigortası', not: 'Kusurlu taraf belliyse hasar karşı tarafın trafik sigortasından istenebilir. Tutanak ya da kaza bilgisini de gönderin.' },
  { id: 'yok', ad: 'Sigorta yok, kendim ödeyeceğim', not: 'Fotoğrafa bakıp tamir ya da değişim fiyatını baştan söyleriz.' },
];
const FOTO = [
  'Hasarın yakın planı (yanına bozuk para koyun)',
  'Camın tamamı, biraz uzaktan',
  'Ruhsatın ön yüzü',
  'Ön camda: camın üst kısmındaki etiket ve kod',
];
const KAMERA = [
  { id: 'var', ad: 'Var' },
  { id: 'yok', ad: 'Yok' },
  { id: 'bilmiyorum', ad: 'Bilmiyorum' },
];
const GUN = [
  { id: 'bugun', ad: 'Bugün' },
  { id: 'yarin', ad: 'Yarın' },
  { id: 'hafta', ad: 'Bu hafta' },
];
const SAAT = [
  { id: 'sabah', ad: 'Sabah' },
  { id: 'ogle', ad: 'Öğleden sonra' },
];
const ADIMLAR = ['Hasar', 'Poliçe', 'Fotoğraf', 'Onay ve montaj'];

function ipucu(cam, hasar) {
  if (hasar === 'kirik') return 'Kırık cam değişir. Cam stokta ise aynı gün takılır.';
  if (cam === 'on' && hasar === 'tas') return 'Bozuk para boyunu geçmiyorsa çoğu zaman reçineyle kapanır; cam değişmez.';
  if (cam === 'on' && hasar === 'catlak') return 'Çatlak kenara ulaştıysa değişim gerekir. Kısa çatlakları fotoğrafına bakıp söyleriz.';
  return 'Yan, arka ve tavan camlarında tamir çoğu zaman mümkün olmaz; fotoğrafına bakıp söyleriz.';
}

const secim = (ad, liste, varsayilan) =>
  `<div class="kb__secim">${liste.map((x) => `<label><input type="radio" name="${ad}" value="${x.id}"${x.id === varsayilan ? ' checked' : ''}><span>${esc(x.ad)}</span></label>`).join('')}</div>`;

// Üstten araç: gövde, ön cam, tavan, arka cam, yan camlar.
const arac = `
  <svg class="kb__arac" viewBox="0 0 200 380" aria-hidden="true">
    <defs><linearGradient id="kb-parlak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <rect x="22" y="8" width="156" height="364" rx="58" class="kb__govde"/>
    <path data-cam="on" d="M44 112 Q100 84 156 112 L146 150 Q100 136 54 150 Z"/>
    <rect data-cam="tavan" x="62" y="170" width="76" height="62" rx="10"/>
    <path data-cam="arka" d="M56 262 Q100 272 144 262 L152 298 Q100 316 48 298 Z"/>
    <path data-cam="yan" d="M36 160 L46 156 L46 250 L36 254 Z M164 160 L154 156 L154 250 L164 254 Z"/>
    <clipPath id="kb-on-kes"><path d="M44 112 Q100 84 156 112 L146 150 Q100 136 54 150 Z"/></clipPath>
    <g clip-path="url(#kb-on-kes)"><g class="kb__parlak"><rect x="-10" y="80" width="46" height="80" fill="url(#kb-parlak)" transform="skewX(-20)"/></g></g>
    <circle class="kb__iz" cx="118" cy="126" r="5"/>
  </svg>`;

export const hasarBasvuru = {
  render() {
    return `
      <section class="k-bolum kb" aria-labelledby="kb-baslik">
        <div class="k-kap">
          <div class="kb__bas">
            <h2 class="k-h2" id="kb-baslik" data-bol>Kasko başvurusu, dört adımda</h2>
            <p class="k-lead">Camı ve hasarı seçin, poliçenizi belirtin, fotoğrafları hazırlayın. Başvuru mesajınız hazır olsun; dosyayı biz açalım, onayı biz takip edelim.</p>
          </div>
          <div class="kb__ic">
            <div class="kb__panel">
              <ol class="kb__adimlar" aria-label="Başvuru adımları">
                ${ADIMLAR.map((a, i) => `<li><button type="button" data-git="${i}"${i === 0 ? ' aria-current="step"' : ''}><span>${i + 1}</span>${esc(a)}</button></li>`).join('')}
              </ol>
              <div class="kb__ray" aria-hidden="true"><span></span></div>
              <form class="kb__form" onsubmit="return false">
                <div class="kb__adim" data-adim="0">
                  <fieldset><legend>Hangi cam?</legend>${secim('cam', CAM, 'on')}</fieldset>
                  <fieldset><legend>Hasar ne?</legend>${secim('hasar', HASAR, 'tas')}</fieldset>
                  <p class="kb__not" data-o="ipucu"></p>
                </div>
                <div class="kb__adim" data-adim="1" hidden>
                  <fieldset><legend>Poliçe</legend>${secim('police', POLICE, 'kasko')}</fieldset>
                  <div class="kb__iki">
                    <label class="kb__metin"><span>Plaka <small>(isteğe bağlı)</small></span><input name="plaka" autocomplete="off" autocapitalize="characters" maxlength="12" placeholder="06 ABC 123"></label>
                    <label class="kb__metin"><span>Sigorta şirketi <small>(isteğe bağlı)</small></span><input name="sirket" autocomplete="off" maxlength="40"></label>
                  </div>
                  <p class="kb__not" data-o="police"></p>
                </div>
                <div class="kb__adim" data-adim="2" hidden>
                  <fieldset><legend>Hazırlamanız gereken fotoğraflar</legend>
                    <ul class="kb__foto">${FOTO.map((f, i) => `<li><label><input type="checkbox" name="foto" value="${i}"><span class="kb__tik" aria-hidden="true"></span><span>${esc(f)}</span></label></li>`).join('')}</ul>
                  </fieldset>
                  <fieldset data-o="kamera"><legend>Dikiz aynasının arkasında kamera var mı?</legend>${secim('kamera', KAMERA, 'bilmiyorum')}
                    <p class="kb__not">Kamera varsa cam değişiminden sonra ADAS kalibrasyonu yaparız; şerit takip ve acil fren doğru çalışsın.</p>
                  </fieldset>
                </div>
                <div class="kb__adim" data-adim="3" hidden>
                  <fieldset><legend>Ne zaman gelmek istersiniz?</legend>${secim('gun', GUN, 'yarin')}</fieldset>
                  <fieldset><legend>Saat</legend>${secim('saat', SAAT, 'sabah')}</fieldset>
                  <dl class="kb__ozet" data-o="ozet"></dl>
                </div>
                <div class="kb__alt">
                  <button type="button" class="k-btn k-btn--ikincil" data-geri>Geri</button>
                  <button type="button" class="k-btn" data-ileri>Devam</button>
                  <a class="k-btn kb__gonder" target="_blank" rel="noopener" hidden>Başvuruyu WhatsApp'tan gönder</a>
                </div>
                <p class="kb__son" data-o="son" hidden>Mesajı gönderdikten sonra fotoğrafları aynı sohbete ekleyin.</p>
              </form>
            </div>
            <figure class="kb__gorsel">
              ${arac}
              <figcaption><span data-o="secilen"></span><small data-o="adimAd"></small></figcaption>
            </figure>
          </div>
        </div>
      </section>`;
  },
  mount(el, d, ctx) {
    const form = el.querySelector('.kb__form');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const adimlar = [...el.querySelectorAll('.kb__adim')];
    const dugmeler = [...el.querySelectorAll('[data-git]')];
    const geri = el.querySelector('[data-geri]');
    const ileri = el.querySelector('[data-ileri]');
    const gonder = el.querySelector('.kb__gonder');
    const ray = el.querySelector('.kb__ray span');
    let aktif = 0;

    const deger = () => {
      const f = new FormData(form);
      const bul = (liste, ad) => liste.find((x) => x.id === f.get(ad));
      return {
        cam: bul(CAM, 'cam'), hasar: bul(HASAR, 'hasar'), police: bul(POLICE, 'police'),
        kamera: bul(KAMERA, 'kamera'), gun: bul(GUN, 'gun'), saat: bul(SAAT, 'saat'),
        plaka: (f.get('plaka') || '').trim().toLocaleUpperCase('tr'), sirket: (f.get('sirket') || '').trim(),
        foto: f.getAll('foto').length,
      };
    };

    const guncelle = () => {
      const v = deger();
      o('ipucu').textContent = ipucu(v.cam.id, v.hasar.id);
      o('police').textContent = v.police.not;
      o('kamera').hidden = v.cam.id !== 'on';
      el.querySelectorAll('[data-cam]').forEach((p) => p.classList.toggle('is-secili', p.dataset.cam === v.cam.id));
      el.querySelector('.kb__iz').style.opacity = v.cam.id === 'on' ? 1 : 0;
      o('secilen').textContent = `${v.cam.ad}, ${v.hasar.ad.toLocaleLowerCase('tr')}`;
      const satir = [
        ['Cam', `${v.cam.ad}, ${v.hasar.ad.toLocaleLowerCase('tr')}`],
        ['Poliçe', `${v.police.ad}${v.sirket ? ` (${v.sirket})` : ''}`],
        v.plaka ? ['Plaka', v.plaka] : null,
        v.cam.id === 'on' ? ['Kamera', v.kamera.ad] : null,
        ['Randevu', `${v.gun.ad}, ${v.saat.ad.toLocaleLowerCase('tr')}`],
        ['Fotoğraf', `${v.foto} / ${FOTO.length} hazır`],
      ].filter(Boolean);
      o('ozet').innerHTML = satir.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('');
      const mesaj = [
        `Merhaba ${d.isletme.ad}, cam hasarı için başvuru yapmak istiyorum.`,
        ...satir.filter(([a]) => a !== 'Fotoğraf').map(([a, b]) => `${a}: ${b}`),
        'Fotoğrafları bu mesajın ardından gönderiyorum.',
      ].join('\n');
      gonder.href = waHref(d, mesaj);
    };

    const git = (n) => {
      const once = aktif;
      aktif = Math.max(0, Math.min(ADIMLAR.length - 1, n));
      adimlar.forEach((a, i) => (a.hidden = i !== aktif));
      dugmeler.forEach((b, i) => {
        b.toggleAttribute('aria-current', i === aktif);
        if (i === aktif) b.setAttribute('aria-current', 'step');
        b.classList.toggle('is-tamam', i < aktif);
      });
      geri.style.visibility = aktif === 0 ? 'hidden' : 'visible';
      const son = aktif === ADIMLAR.length - 1;
      ileri.hidden = son;
      gonder.hidden = !son;
      o('son').hidden = !son;
      o('adimAd').textContent = `Adım ${aktif + 1} / ${ADIMLAR.length}: ${ADIMLAR[aktif]}`;
      // Mobilde panelin üstü ekran dışında kaldıysa adım başına kaydır.
      const panel = el.querySelector('.kb__panel');
      if (once !== aktif && panel.getBoundingClientRect().top < 70) {
        ctx?.lenis ? ctx.lenis.scrollTo(panel, { offset: -84, duration: 0.6 }) : panel.scrollIntoView({ block: 'start' });
      }
      const oran = aktif / (ADIMLAR.length - 1);
      if (reducedMotion || once === aktif) gsap.set(ray, { scaleX: oran });
      else {
        gsap.to(ray, { scaleX: oran, duration: 0.6, ease: 'power3.inOut' });
        gsap.fromTo(adimlar[aktif], { x: aktif > once ? 28 : -28, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
      }
    };

    form.addEventListener('input', guncelle);
    ileri.addEventListener('click', () => git(aktif + 1));
    geri.addEventListener('click', () => git(aktif - 1));
    dugmeler.forEach((b, i) => b.addEventListener('click', () => git(i)));
    guncelle();
    git(0);

    // Araç çizimi görünce: seçili cam ışıyarak dolar, parlama camın üstünden geçer.
    if (!reducedMotion) {
      const svg = el.querySelector('.kb__arac');
      gsap.fromTo(svg.querySelector('.kb__parlak'), { x: -60 }, { x: 230, duration: 2.4, ease: 'power2.inOut', repeat: -1, repeatDelay: 2.6, scrollTrigger: { trigger: svg, start: 'top 90%', toggleActions: 'play pause resume pause' } });
    }
  },
};
