// Sektör modülleri (kurumsal-radyator, "Bakır petek" yönü):
// (1) petek: künye. Metnin yanında radyatörün önden teknik çizimi; açılışta fan devreye girer, su tüplerde
//     akmaya başlar, sıcak kırmızı soğuk maviye döner (süs; sayısal okuma yok). Akış ve fan CSS transform
//     animasyonu; ekran dışında durur.
// (2) devre: "Hararet haritası". Şikâyet seçilince soğutma devresi şemasında önce bakılacak parçalar numaralanır,
//     ibre bölgesi ve sebepler listelenir, ilgili hizmet için hazır konu ile iletişime gider.
// (3) vasita: binek ve ağır vasıta için iki büyük fotoğraf panosu.
import { esc, telHref, waHref, mapsHref, gunDurumu, kisaAdres, icons, gsap, reducedMotion } from '../../shared/core.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const konu = (k) => `iletisim?konu=${encodeURIComponent(k)}`;
const B = import.meta.env.BASE_URL;

// Görünmezken CSS döngülerini durdur.
function gorunurken(el, sinif = 'is-gizli') {
  const io = new IntersectionObserver((e) => el.classList.toggle(sinif, !e[0].isIntersecting), { rootMargin: '80px' });
  io.observe(el);
  return io;
}

// --- (1) Hero: radyatör çizimi --------------------------------------------------------------------
const TUP = 22;
const radyatorSvg = () => {
  const tuplar = Array.from({ length: TUP }, (_, i) => `<rect x="${48 + i * 20}" y="88" width="8" height="228" rx="2"/>`).join('');
  return `
  <svg class="pk-svg" viewBox="-40 0 600 400" aria-hidden="true">
    <defs>
      <linearGradient id="pk-su" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e2502a"/><stop offset=".45" stop-color="#c98a52"/><stop offset="1" stop-color="#6db3d8"/>
      </linearGradient>
      <pattern id="pk-fin" x="56" y="0" width="20" height="7" patternUnits="userSpaceOnUse">
        <path d="M0 0 L12 3.5 L0 7" fill="none" stroke="currentColor" stroke-width="1" opacity=".42"/>
      </pattern>
      <pattern id="pk-damla" x="48" y="0" width="20" height="32" patternUnits="userSpaceOnUse">
        <rect width="8" height="12" rx="3" fill="#fff" opacity=".26"/>
      </pattern>
      <clipPath id="pk-tup">${tuplar}</clipPath>
    </defs>
    <!-- hortumlar -->
    <path class="pk-hortum" d="M480 50 C532 50 540 20 560 18"/>
    <path class="pk-hortum pk-hortum--s" d="M40 346 C-10 346 -14 376 -40 380"/>
    <path class="pk-hortum__akis pk-hortum__akis--sicak" d="M560 18 C540 20 532 50 480 50"/>
    <path class="pk-hortum__akis pk-hortum__akis--soguk" d="M40 346 C-10 346 -14 376 -40 380"/>
    <!-- yan saclar -->
    <rect class="pk-sac" x="28" y="70" width="12" height="266" rx="3"/>
    <rect class="pk-sac" x="480" y="70" width="12" height="266" rx="3"/>
    <!-- çekirdek -->
    <rect class="pk-cekirdek" x="40" y="84" width="440" height="236"/>
    <rect x="40" y="84" width="440" height="236" fill="url(#pk-fin)"/>
    <g class="pk-tuplar" fill="url(#pk-su)">${tuplar}</g>
    <g class="pk-sicak" fill="#d8361f">${tuplar}</g>
    <g clip-path="url(#pk-tup)"><g class="pk-akis"><rect x="40" y="24" width="440" height="360" fill="url(#pk-damla)"/></g></g>
    <!-- tanklar -->
    <rect class="pk-tank" x="36" y="28" width="448" height="56" rx="12"/>
    <rect class="pk-tank" x="36" y="318" width="448" height="56" rx="12"/>
    <g class="pk-civata">${[70, 170, 270, 370, 450].map((x) => `<circle cx="${x}" cy="44" r="3.4"/><circle cx="${x}" cy="358" r="3.4"/>`).join('')}</g>
    <rect class="pk-tank" x="392" y="8" width="36" height="22" rx="3"/>
    <rect class="pk-kapak" x="384" y="2" width="52" height="11" rx="4"/>
    <circle class="pk-kapak" cx="110" cy="386" r="7"/>
    <!-- etiketler -->
    <g class="pk-etiket">
      <text x="500" y="84">Sıcak su</text>
      <text x="-36" y="326">Soğuk su</text>
    </g>
  </svg>`;
};

const fanSvg = `<svg viewBox="-24 -24 48 48" aria-hidden="true"><circle r="22" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5"/>${[0, 72, 144, 216, 288]
  .map((a) => `<path d="M0 -3 C 6 -8 14 -8 18 -2 C 12 0 6 1 0 3 Z" transform="rotate(${a})" fill="currentColor"/>`)
  .join('')}<circle r="4" fill="currentColor"/></svg>`;

export const petek = {
  render(d) {
    const b = d.saatler ? gunDurumu(d.saatler) : null;
    return `
      <section class="k-hero k-hero--kunye pk" aria-label="Künye">
        <div class="k-kap k-hero__ic pk__ic">
          <div class="k-hero__metin">
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="k-lead k-hero__tanim">${esc(d.isletme.tanim || d.isletme.sektor)}</p>
            <dl class="k-kunye">
              <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
              ${b ? `<div><dt>Bugün</dt><dd><span class="k-durum ${b.open ? 'is-acik' : ''}"><span></span>${esc(b.kunye)}</span></dd></div>` : ''}
              <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
            </dl>
            <div class="k-butonlar">
              <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
              ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
              <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
            </div>
          </div>
          <figure class="pk-panel is-hararet" aria-label="Radyatörün önden çizimi: sıcak su üst tanktan girer, peteklerden inerken soğur">
            <div class="pk-panel__ust">
              <span>Soğutma devresi</span>
              <span class="pk-fan" data-fan>${fanSvg}<em>Fan</em></span>
            </div>
            ${radyatorSvg()}
            <img class="pk-foto" src="${B}img/sektor-radyator/hararet-gostergesi.jpg" alt="Gösterge panelinde hararet göstergesi" fetchpriority="high">
          </figure>
        </div>
      </section>`;
  },
  mount(el) {
    const panel = el.querySelector('.pk-panel');
    const sicak = el.querySelector('.pk-sicak');
    gorunurken(panel);
    if (reducedMotion) {
      panel.classList.add('is-fan', 'is-akis');
      panel.classList.remove('is-hararet');
      sicak.style.opacity = '0';
      return;
    }
    // Açılış (~2 sn, bir kez): fan devreye girer, su akmaya başlar, sıcak kırmızı söner.
    gsap.timeline({ delay: 0.9 })
      .add(() => panel.classList.add('is-fan'))
      .add(() => panel.classList.add('is-akis'), 0.4)
      .fromTo(sicak, { opacity: 1 }, { opacity: 0, duration: 2, ease: 'power2.inOut' }, 0.3)
      .add(() => panel.classList.remove('is-hararet'), 1.4)
      .fromTo(el.querySelector('.pk-foto'), { yPercent: 30, opacity: 0, rotation: 6 }, { yPercent: 0, opacity: 1, rotation: -4, duration: 1, ease: 'back.out(1.6)' }, 0);
    gsap.from(panel, { clipPath: 'inset(0 0 100% 0 round 16px)', duration: 1.1, ease: 'power3.inOut', delay: 0.2 });
  },
};

// --- (2) Hararet haritası --------------------------------------------------------------------------
const PARCA = {
  radyator: { ad: 'Radyatör peteği', no: [120, 200] },
  kapak: { ad: 'Radyatör kapağı', no: [214, 38] },
  fan: { ad: 'Fan, fan rölesi ve müşir', no: [262, 128] },
  termostat: { ad: 'Termostat', no: [470, 72] },
  ustHortum: { ad: 'Üst hortum ve kelepçe', no: [320, 64] },
  altHortum: { ad: 'Alt hortum ve kelepçe', no: [300, 352] },
  pompa: { ad: 'Devirdaim pompası', no: [410, 350] },
  genlesme: { ad: 'Genleşme kabı ve seviye', no: [640, 28] },
  conta: { ad: 'Silindir kapak contası', no: [535, 150] },
  kalorifer: { ad: 'Kalorifer peteği', no: [712, 130] },
};

const SIKAYET = [
  { id: 'trafik', ad: 'Trafikte ısınıyor, yolda düzeliyor', bolge: 78, hizmet: 'Fan ve fan müşiri',
    p: [['fan', 'Araç dururken radyatörden havayı fan geçirir. Fan, rölesi ya da müşiri çalışmıyorsa hız düşünce ibre çıkar.'],
      ['radyator', 'Önü böcek, toz ve yaprakla kapanmış petek, fan çalışsa da havayı geçirmez.'],
      ['kapak', 'Basınç tutmayan kapak suyu daha düşük sıcaklıkta kaynatır.']] },
  { id: 'yol', ad: 'Yolda, yokuşta ya da yükte ısınıyor', bolge: 84, hizmet: 'Petek temizliği ve değişimi',
    p: [['radyator', 'Kireç ve tortuyla içten tıkanmış petek, yüke binen motorun ısısını atamaz.'],
      ['termostat', 'Tam açılmayan termostat suyun radyatöre geçişini kısar.'],
      ['pompa', 'Kanadı yenmiş devirdaim pompası suyu yavaş döndürür.']] },
  { id: 'damla', ad: 'Su eksiltiyor, altında leke var', bolge: 66, hizmet: 'Radyatör tamiri',
    p: [['altHortum', 'Sertleşip çatlamış hortum ya da gevşemiş kelepçe damlatır; en ucuz ihtimal budur.'],
      ['radyator', 'Delik petek ya da plastik tank ile conta arasından sızıntı.'],
      ['pompa', 'Salmastrası biten devirdaim pompası altından su bırakır.'],
      ['ustHortum', 'Üst hortum sıcakta genişler; kelepçe ağzı sızdırabilir.']] },
  { id: 'gizli', ad: 'Su eksiltiyor ama damlatmıyor', bolge: 72, hizmet: 'Hararet arıza tespiti',
    p: [['conta', 'Conta yandıysa su yanma odasına ya da yağa karışır; egzozdan beyaz duman, yağ kapağında köpük.'],
      ['kapak', 'Basınç tutmayan kapak suyu buhar olarak dışarı atar.'],
      ['kalorifer', 'Kalorifer peteği kaçırıyorsa torpido altı nemlenir, camlar buğulanır.']] },
  { id: 'soguk', ad: 'Kalorifer soğuk, ibre hep aşağıda', bolge: 18, hizmet: 'Termostat ve devirdaim',
    p: [['termostat', 'Açık kalan termostat motoru çalışma sıcaklığına çıkarmaz; yakıt da artar.'],
      ['genlesme', 'Eksik su ya da sistemde kalan hava kaloriferi soğuk bırakır.'],
      ['kalorifer', 'İçten tıkanmış kalorifer peteği sıcak suyu geçirmez.']] },
  { id: 'fokur', ad: 'Genleşme kabı fokurduyor, taşıyor', bolge: 90, hizmet: 'Hararet arıza tespiti',
    p: [['conta', 'Yanmış contadan soğutma suyuna kaçan basınç kaba kabarcık olarak gelir.'],
      ['kapak', 'Kapak basıncı tutmuyorsa su erken kaynar, kaptan taşar.'],
      ['radyator', 'Tıkalı petekte su soğuyamaz; ısınan su kaba geri basar.']] },
  { id: 'agir', ad: 'Kamyon ya da otobüs yükte ısınıyor', bolge: 86, hizmet: 'Ağır vasıta radyatörü',
    p: [['radyator', 'Radyatör ile intercooler arasına dolan kir havayı keser; büyük petek içten de tıkanır.'],
      ['fan', 'Fan kavraması yeterince kavramıyorsa fan motor devrinde dönmez.'],
      ['termostat', 'Termostat tam açılmıyor olabilir; ağır vasıtada çoğu zaman çift termostat vardır.']] },
];

const devreSvg = () => `
  <svg class="dv-svg" viewBox="0 0 760 400" role="img" aria-labelledby="dv-svg-b">
    <title id="dv-svg-b">Soğutma devresi şeması: radyatör, fan, motor, termostat, devirdaim pompası, hortumlar, genleşme kabı ve kalorifer peteği</title>
    <defs>
      <pattern id="dv-izgara" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" stroke-width=".5" opacity=".12"/></pattern>
      <pattern id="dv-fin" width="10" height="8" patternUnits="userSpaceOnUse"><path d="M0 0 L10 4 L0 8" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/></pattern>
    </defs>
    <rect width="760" height="400" fill="url(#dv-izgara)"/>

    <!-- hortumlar ve akış -->
    <g class="dv-p" data-p="ustHortum"><path class="dv-hortum" d="M424 96 C 340 96 300 70 200 84"/></g>
    <g class="dv-p" data-p="altHortum"><path class="dv-hortum" d="M200 316 C 290 316 320 330 390 300"/></g>
    <path class="dv-hortum dv-hortum--ince" d="M650 186 H690 M650 262 H690"/>
    <path class="dv-hortum dv-hortum--ince dv-kesik" d="M600 36 C 420 30 290 22 206 50"/>
    <path class="dv-akis dv-akis--s" d="M424 96 C 340 96 300 70 200 84"/>
    <path class="dv-akis dv-akis--c" d="M200 316 C 290 316 320 330 390 300"/>
    <path class="dv-akis dv-akis--s" d="M650 186 H690"/>
    <path class="dv-akis dv-akis--c" d="M690 262 H650"/>

    <!-- radyatör -->
    <g class="dv-p" data-p="radyator">
      <rect class="dv-g" x="40" y="70" width="160" height="26" rx="6"/>
      <rect class="dv-g" x="40" y="304" width="160" height="26" rx="6"/>
      <rect class="dv-g" x="48" y="96" width="144" height="208"/>
      <rect x="48" y="96" width="144" height="208" fill="url(#dv-fin)"/>
      <text class="dv-yazi" x="120" y="355" text-anchor="middle">RADYATÖR</text>
    </g>
    <g class="dv-p" data-p="kapak"><rect class="dv-g" x="170" y="52" width="26" height="18" rx="3"/></g>

    <!-- fan -->
    <g class="dv-p" data-p="fan">
      <circle class="dv-g" cx="262" cy="200" r="56"/>
      <g class="dv-kanat">${[0, 72, 144, 216, 288].map((a) => `<path d="M262 200 C 270 180 290 168 306 176 C 296 190 280 198 262 200 Z" transform="rotate(${a} 262 200)"/>`).join('')}<circle cx="262" cy="200" r="8"/></g>
      <text class="dv-yazi" x="262" y="284" text-anchor="middle">FAN</text>
    </g>

    <!-- motor -->
    <g class="dv-p" data-p="motor">
      <rect class="dv-g dv-motor" x="424" y="120" width="226" height="190" rx="18"/>
      ${[470, 520, 570, 620].map((x) => `<circle class="dv-g dv-silindir" cx="${x - 8}" cy="236" r="19"/>`).join('')}
      <text class="dv-yazi" x="537" y="296" text-anchor="middle">MOTOR</text>
    </g>
    <g class="dv-p" data-p="conta"><rect class="dv-g dv-conta" x="424" y="164" width="226" height="10" rx="3"/></g>
    <g class="dv-p" data-p="termostat"><circle class="dv-g" cx="440" cy="96" r="17"/><path class="dv-g" d="M432 96 H448 M440 88 V104"/></g>
    <g class="dv-p" data-p="pompa"><circle class="dv-g" cx="410" cy="300" r="22"/><path class="dv-g" d="M410 284 V316 M394 300 H426"/></g>
    <g class="dv-p" data-p="genlesme">
      <rect class="dv-g" x="600" y="14" width="96" height="44" rx="10"/>
      <path class="dv-seviye" d="M606 40 H690"/>
      <text class="dv-yazi" x="648" y="80" text-anchor="middle">GENLEŞME KABI</text>
    </g>
    <g class="dv-p" data-p="kalorifer">
      <rect class="dv-g" x="690" y="150" width="46" height="130" rx="6"/>
      <rect x="696" y="160" width="34" height="110" fill="url(#dv-fin)"/>
      <text class="dv-yazi" x="738" y="302" text-anchor="end">KALORİFER</text>
    </g>

    <!-- numara rozetleri -->
    ${Object.entries(PARCA).map(([id, x]) => `<g class="dv-no" data-no="${id}" transform="translate(${x.no[0]} ${x.no[1]})"><circle r="15"/><text y="5.5" text-anchor="middle"></text></g>`).join('')}
  </svg>`;

export const devre = {
  render(d) {
    const x = d.kurumsal?.hararet || {};
    return `
      <section class="k-bolum dv" id="hararet-haritasi">
        <div class="k-kap">
          <div class="dv__bas">
            <h2 class="k-h2" data-bol>${esc(x.baslik || 'Hararet haritası')}</h2>
            ${x.metin ? `<p class="k-lead">${esc(x.metin)}</p>` : ''}
          </div>
          <div class="dv__secim" role="group" aria-label="Şikâyet" data-lenis-prevent>
            ${SIKAYET.map((s, i) => `<button type="button" class="dv-cip" data-s="${s.id}" aria-pressed="${i === 0}">${esc(s.ad)}</button>`).join('')}
          </div>
          <div class="dv__ic">
            <div class="dv-sema">${devreSvg()}</div>
            <div class="dv-sonuc" aria-live="polite"></div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const not = d.kurumsal?.hararet?.not || '';
    const sema = el.querySelector('.dv-sema');
    const sonuc = el.querySelector('.dv-sonuc');
    gorunurken(sema);
    const goster = (id, anim) => {
      const s = SIKAYET.find((x) => x.id === id) || SIKAYET[0];
      el.querySelectorAll('.dv-cip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === s.id)));
      const sira = s.p.map(([p]) => p);
      el.querySelectorAll('.dv-p').forEach((g) => g.classList.toggle('is-sus', sira.includes(g.dataset.p)));
      el.querySelectorAll('.dv-no').forEach((g) => {
        const i = sira.indexOf(g.dataset.no);
        g.classList.toggle('is-acik', i > -1);
        g.querySelector('text').textContent = i > -1 ? i + 1 : '';
      });
      sema.classList.add('is-secili');
      sema.classList.toggle('is-fan-dur', s.id === 'trafik' || s.id === 'agir');
      const bolge = s.bolge < 35 ? 'Soğuk tarafta' : s.bolge < 75 ? 'Ortada, su eksilince çıkıyor' : 'Hararet tarafında';
      sonuc.innerHTML = `
        <p class="dv-sonuc__ust">Şikâyet</p>
        <h3 class="k-h3">${esc(s.ad)}</h3>
        <div class="dv-ibre">
          <div class="dv-ibre__bar"><i style="left:${s.bolge}%"></i></div>
          <div class="dv-ibre__et"><span>Soğuk</span><span>Normal</span><span>Hararet</span></div>
          <p>İbre genelde: <strong>${bolge}</strong></p>
        </div>
        <p class="dv-sonuc__ust">İlk bakılacak parçalar</p>
        <ol class="dv-liste">
          ${s.p.map(([p, neden], i) => `<li><span class="dv-liste__no">${i + 1}</span><div><strong>${esc(PARCA[p].ad)}</strong><p>${esc(neden)}</p></div></li>`).join('')}
        </ol>
        ${not ? `<p class="dv-not">${esc(not)}</p>` : ''}
        ${rota(konu(s.hizmet === 'Hararet arıza tespiti' ? 'Hararet yapıyor' : s.hizmet), `Bu arıza için bilgi alın ${ok}`, 'k-btn')}`;
      if (anim && !reducedMotion) {
        gsap.fromTo(sonuc.querySelectorAll('.dv-liste li, .dv-ibre'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out' });
        gsap.fromTo(el.querySelectorAll('.dv-no.is-acik'), { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(2.4)' });
      }
    };
    goster(SIKAYET[0].id, false);
    el.querySelectorAll('.dv-cip').forEach((b) => b.addEventListener('click', () => goster(b.dataset.s, true)));
  },
};

// --- (3) Binek ve ağır vasıta ----------------------------------------------------------------------
export const vasita = {
  render(d) {
    const v = d.kurumsal?.vasita;
    if (!v) return '';
    const kart = (x) => `
      <article class="pv-kart">
        <figure data-perde><img src="${x.img}" alt="${esc(x.alt)}" loading="lazy"></figure>
        <div class="pv-kart__ic">
          <p class="pk-etk pk-etk--acik"><span></span>${esc(x.etk)}</p>
          <h3 class="pv-kart__b">${esc(x.baslik)}</h3>
          <p>${esc(x.metin)}</p>
          <ul>${(x.maddeler || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
          ${rota(konu(x.konu), `${esc(x.buton)} ${ok}`, 'k-link pv-kart__link')}
        </div>
      </article>`;
    return `
      <section class="k-bolum pv">
        <div class="k-kap">
          <div class="k-bolum__bas"><h2 class="k-h2" data-bol>${esc(v.baslik || 'Binek ve ağır vasıta')}</h2></div>
          <div class="pv__ic">
            ${kart({ ...v.binek, img: `${B}img/sektor-radyator/teshis.jpg`, alt: 'Usta kaputu açık araçta soğutma sistemini kontrol ediyor', etk: 'Binek ve hafif ticari', konu: 'Radyatör tamiri ve değişimi', buton: 'Bilgi alın' })}
            ${kart({ ...v.agir, img: `${B}img/sektor-radyator/tir-usta.jpg`, alt: 'Loş atölyede çekicinin yanında çalışan usta', etk: 'Ağır vasıta', konu: 'Ağır vasıta radyatörü', buton: 'Bilgi alın' })}
          </div>
        </div>
      </section>`;
  },
};
