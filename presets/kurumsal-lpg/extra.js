// "Tüp yeşili": LPG sisteminin parçalarını ve uygunluğu anlatan kurumsal site. Modüller:
//  giris     — künye (k-hero--kunye): ad, iş, adres, bugün, telefon; yeşil çift ton fotoğraf ve dönen pul
//              (içinde kuruluştan geçen yıl)
//  hat       — gazın yolu: tanktan motora yedi parça; kaydırdıkça hat dolar
//  uygunluk  — motor tipi seç → uygun sistem ve süre; tank tipi (simit/silindir) bagaj çizimi
//  galeri    — temsilî kareler (görünür oldukça açılır)
import { esc, waHref, telHref, mapsHref, gunDurumu, kisaAdres, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';

const buYil = new Date().getFullYear();
const ALEV = `<svg class="ml-alev" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="mlAlevG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1d4dff"/><stop offset=".6" stop-color="#4f8bff"/><stop offset="1" stop-color="#b9d4ff"/></linearGradient></defs><path d="M24 3c3 8 13 13 13 25a13 13 0 0 1-26 0c0-7 4-10 6-15 1 4 3 7 6 7-2-6-1-12 1-17z" fill="url(#mlAlevG)"/><path d="M24 24c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 .6 2 1.6 3 3 3-.8-2.6-.6-4.6 0-7z" fill="#e8f0ff" opacity=".9"/></svg>`;

// --- giris: künye ------------------------------------------------------------------------
export const giris = {
  render(d) {
    const b = d.saatler ? gunDurumu(d.saatler) : null;
    const yil = buYil - d.isletme.kurulus;
    const halka = `LPG · DÖNÜŞÜM · BAKIM · AYAR · ${d.isletme.kurulus} · `;
    return `
      <section class="k-hero k-hero--kunye ml-giris" aria-label="Künye">
        <div class="k-kap ml-giris__ic">
          <div class="k-hero__metin ml-giris__metin">
            <h1 class="k-h1 k-hero__baslik ml-giris__baslik" data-bol>${esc(d.isletme.ad)}</h1>
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
          <div class="ml-giris__sahne">
            <figure class="ml-giris__foto" data-perde><div class="ml-giris__foto-ic" data-paralaks><img src="${import.meta.env.BASE_URL}img/kurumsal-lpg/manometre.jpg" alt="Gaz hattındaki basınç göstergeleri" fetchpriority="high"></div></figure>
            <div class="ml-pul" aria-hidden="true">
              <svg viewBox="0 0 200 200" class="ml-pul__halka"><defs><path id="mlPulYol" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs><text><textPath href="#mlPulYol" textLength="486" lengthAdjust="spacing">${esc(halka)}</textPath></text></svg>
              <div class="ml-pul__ic">${ALEV}<strong>${yil}</strong><span>yıl</span></div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.fromTo(el.querySelector('.ml-pul'), { scale: 0.4, rotate: -90, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1, delay: 0.5, ease: 'back.out(1.6)' });
    gsap.to(el.querySelector('.ml-pul__halka'), { rotate: 360, duration: 26, repeat: -1, ease: 'none' });
  },
};

// --- hat: gazın yolu ----------------------------------------------------------------------
const IKON = {
  tank: '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="7"/><path d="M24 7v4M24 37v4M7 24h4M37 24h4"/>',
  valf: '<rect x="10" y="18" width="28" height="18" rx="3"/><circle cx="24" cy="27" r="5"/><path d="M24 27l3-3M16 18v-6h16v6"/>',
  boru: '<path d="M4 30c6 0 6-12 12-12s6 12 12 12 6-12 12-12h4"/><path d="M4 36h40" stroke-dasharray="2 4"/>',
  regulator: '<rect x="12" y="12" width="24" height="24" rx="12"/><path d="M6 20h6M6 28h6M36 24h8M18 20h12M18 24h12M18 28h12"/>',
  filtre: '<rect x="15" y="8" width="18" height="32" rx="4"/><path d="M15 16h18M15 32h18M24 4v4M24 40v4"/>',
  enjektor: '<path d="M6 12h36"/><path d="M11 12v12l2 6 2-6V12M21 12v12l2 6 2-6V12M31 12v12l2 6 2-6V12"/><path d="M13 36v4M23 36v4M33 36v4" stroke-dasharray="1 3"/>',
  beyin: '<rect x="12" y="12" width="24" height="24" rx="2"/><rect x="18" y="18" width="12" height="12"/><path d="M16 6v6M24 6v6M32 6v6M16 36v6M24 36v6M32 36v6M6 16h6M6 24h6M6 32h6M36 16h6M36 24h6M36 32h6"/>',
};
const HAT = [
  ['tank', 'Tank', 'Simit ya da silindir tank. LPG burada sıvı hâlde, basınç altında durur. Etiketinde üretim ve son kullanım tarihi yazar.'],
  ['valf', 'Çok valf', 'Tankın üstündeki valf bloğu. Doldurma, seviye göstergesi ve emniyet valfleri bu blokta bulunur.'],
  ['boru', 'Gaz hattı', 'Sıvı gazı tanktan motor bölmesine taşır. Hat aracın altından geçirilip sabitlenir.'],
  ['regulator', 'Regülatör', 'Motor suyuyla ısınıp sıvı gazı buhara çevirir, basıncını düşürür. Motor bu yüzden soğukken benzinle çalışır.'],
  ['filtre', 'Buhar filtresi', 'Gazdaki kiri enjektörlere varmadan tutar. LPG bakımında değiştirilir.'],
  ['enjektor', 'Enjektörler', 'Sıralı sistemde her silindirin ayrı gaz enjektörü vardır.'],
  ['beyin', 'Elektronik ünite', 'Benzin enjektörlerinin sinyalini okuyup gaz enjektörlerini sürer. Ayar bu ünitede bilgisayarla yapılır.'],
];

export const hat = {
  render() {
    return `
      <section class="k-bolum ml-hat" aria-labelledby="ml-hat-b">
        <div class="k-kap ml-hat__ic">
          <div class="ml-hat__yan">
            <p class="ml-etiket">7 parça</p>
            <h2 class="k-h2" id="ml-hat-b" data-bol>LPG sisteminin parçaları</h2>
            <p class="k-lead">Sıralı enjeksiyonlu bir LPG sisteminde gaz tanktan motora bu yedi parçadan geçer.</p>
            <figure class="ml-hat__foto"><img src="${import.meta.env.BASE_URL}img/kurumsal-lpg/kit-ustten-3d.jpg" alt="Sıralı enjeksiyon LPG sisteminin parçaları üstten: simit tank ve çok valf, regülatör, filtre, enjektör rampası, elektronik ünite" width="1000" height="1000" loading="lazy"><figcaption>Temsilî 3D görsel. Parça seçimi araca göre değişir.</figcaption></figure>
          </div>
          <div class="ml-hat__govde">
          <span class="ml-hat__boru" aria-hidden="true"><span class="ml-hat__dolgu"></span><span class="ml-hat__bas"></span></span>
          <ol class="ml-hat__liste">
            ${HAT.map(
              ([ik, ad, metin], i) => `<li class="ml-parca">
                <span class="ml-parca__ikon"><svg viewBox="0 0 48 48" aria-hidden="true">${IKON[ik]}</svg></span>
                <div><span class="ml-parca__no">${String(i + 1).padStart(2, '0')}</span><h3>${ad}</h3><p>${metin}</p></div>
              </li>`
            ).join('')}
            <li class="ml-parca ml-parca--alev">
              <span class="ml-parca__ikon">${ALEV}</span>
              <div><span class="ml-parca__no">Ayar</span><h3>Bilgisayarla ayar ve yol testi</h3><p>İlk ayar bilgisayarla yapılır, araç yolda farklı devirlerde denenir.</p></div>
            </li>
          </ol>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const liste = el.querySelector('.ml-hat__liste');
    const parcalar = el.querySelectorAll('.ml-parca');
    if (reducedMotion) {
      el.classList.add('is-bitti');
      return parcalar.forEach((p) => p.classList.add('is-dolu'));
    }
    const dolgu = el.querySelector('.ml-hat__dolgu');
    const bas = el.querySelector('.ml-hat__bas');
    const boru = el.querySelector('.ml-hat__boru');
    gsap.set(dolgu, { scaleY: 0, transformOrigin: 'top center' });
    ScrollTrigger.create({
      trigger: liste,
      start: 'top 65%',
      end: 'bottom 65%',
      scrub: 0.4,
      onUpdate: (s) => {
        gsap.set(dolgu, { scaleY: s.progress });
        gsap.set(bas, { y: s.progress * boru.offsetHeight });
        el.classList.toggle('is-bitti', s.progress > 0.985);
      },
    });
    parcalar.forEach((p) =>
      ScrollTrigger.create({ trigger: p, start: 'top 66%', onEnter: () => p.classList.add('is-dolu'), onLeaveBack: () => p.classList.remove('is-dolu') }),
    );
  },
};

// --- uygunluk: motor tipi seçici ---------------------------------------------------------
const MOTOR = [
  { id: 'mpi', ad: 'Çok noktalı enjeksiyon', alt: 'Çoğu benzinli araç', karar: 'Uygun', cls: 'is-olur', sistem: 'Sıralı enjeksiyon LPG sistemi', sure: '1–2 gün', metin: 'En sık yapılan dönüşüm. Her silindire ayrı gaz enjektörü takılır.' },
  { id: 'di', ad: 'Direkt enjeksiyon', alt: 'TSI, TFSI, GDI, EcoBoost', karar: 'İncelemeden sonra', cls: 'is-inceleme', sistem: 'Direkt enjeksiyonlu motorlar için yapılmış sistem', sure: '2–3 gün', metin: 'Uygunluk motor koduna göre belirlenir. Motor uygun değilse araç sahibine baştan söylenir.' },
  { id: 'eski', ad: 'Eski LPG sistemi var', alt: 'Karbüratörlü ya da ilk nesil', karar: 'Yenilenir', cls: 'is-olur', sistem: 'Sıralı enjeksiyona yenileme', sure: '1 gün', metin: 'Tank ve hatlar sağlamsa ve kullanım süresi dolmamışsa yeniden kullanılır.' },
  { id: 'dizel', ad: 'Dizel motor', alt: 'Motorinli araçlar', karar: 'Yapılmaz', cls: 'is-yok', sistem: '-', sure: '-', metin: 'Dizel araçlara LPG dönüşümü yapılmaz.' },
];
const EVRAK = ['Tadilat projesi', 'Montaj belgesi', "LPG'nin ruhsata işlenmesi"];

export const uygunluk = {
  render(d, ctx, sorgu) {
    const secili = MOTOR.find((m) => m.id === sorgu?.get('motor')) || MOTOR[0];
    return `
      <section class="k-bolum ml-uyg" aria-labelledby="ml-uyg-b">
        <div class="k-kap">
          <div class="ml-uyg__bas">
            <p class="ml-etiket">1 · Motor tipi</p>
            <h2 class="k-h2" id="ml-uyg-b" data-bol>Motor tipine göre uygunluk</h2>
            <p class="k-lead">Motor tipi araç ruhsatında ve motor kodunda yazar. Kesin karar araç görüldükten sonra verilir.</p>
          </div>
          <div class="ml-uyg__ic">
            <div class="ml-uyg__secenek" role="radiogroup" aria-label="Motor tipi">
              ${MOTOR.map((m) => `<button type="button" role="radio" aria-checked="${m.id === secili.id}" data-motor="${m.id}"><strong>${m.ad}</strong><span>${m.alt}</span></button>`).join('')}
            </div>
            <article class="ml-uyg__kart" aria-live="polite">
              <p class="ml-uyg__karar"><i></i><span></span></p>
              <dl class="ml-uyg__dl">
                <div><dt>Sistem</dt><dd data-alan="sistem"></dd></div>
                <div><dt>Montaj süresi</dt><dd data-alan="sure"></dd></div>
              </dl>
              <p class="ml-uyg__metin"></p>
              <div class="ml-uyg__evrak">
                <p class="ml-etiket">Dönüşümden sonraki evrak</p>
                <ol>${EVRAK.map((e) => `<li>${e}</li>`).join('')}</ol>
                <p class="ml-uyg__not">Dönüşümden sonra LPG'nin ruhsata işlenmesi gerekir. Gereken belgeler ve başvuru sırası araç sahibine anlatılır.</p>
              </div>
              <a class="k-btn ml-uyg__wa" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan bilgi alın</span></a>
            </article>
          </div>

          <div class="ml-bagaj">
            <div class="ml-bagaj__metin">
              <p class="ml-etiket">2 · Tank tipi</p>
              <h3 class="k-h3">Simit tank ve silindir tank</h3>
              <div class="ml-bagaj__dugmeler" role="radiogroup" aria-label="Tank tipi">
                <button type="button" role="radio" aria-checked="true" data-tank="simit">Simit tank</button>
                <button type="button" role="radio" aria-checked="false" data-tank="silindir">Silindir tank</button>
              </div>
              <p class="ml-bagaj__aciklama" data-tank-metin="simit">Stepne yuvasının içine oturur, bagaj tabanı düz kalır. Stepnenin yerine lastik tamir kiti konur.</p>
              <p class="ml-bagaj__aciklama" data-tank-metin="silindir" hidden>Bagajda arka koltuk tarafına kayışlarla sabitlenir. Genellikle simit tanktan daha fazla gaz alır, stepne yerinde kalır.</p>
            </div>
            <svg class="ml-bagaj__cizim" viewBox="0 0 360 300" aria-hidden="true">
              <path class="ml-bagaj__kasa" d="M60 290V120c0-40 20-70 60-78l20-4h80l20 4c40 8 60 38 60 78v170"/>
              <path class="ml-bagaj__koltuk" d="M78 150h204"/>
              <rect class="ml-bagaj__alan" x="78" y="160" width="204" height="110" rx="10"/>
              <g class="ml-bagaj__simit"><circle cx="180" cy="220" r="44"/><circle cx="180" cy="220" r="17"/><circle class="ml-bagaj__valf" cx="180" cy="192" r="6"/></g>
              <g class="ml-bagaj__silindir"><rect x="92" y="168" width="176" height="44" rx="22"/><path d="M118 168v44M242 168v44"/><circle class="ml-bagaj__valf" cx="248" cy="190" r="6"/></g>
              <text x="180" y="112" class="ml-bagaj__yazi">ARKA KOLTUK</text>
              <text x="180" y="288" class="ml-bagaj__yazi">BAGAJ KAPAĞI</text>
            </svg>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const kart = el.querySelector('.ml-uyg__kart');
    const dugmeler = el.querySelectorAll('[data-motor]');
    const sec = (id, anim) => {
      const m = MOTOR.find((x) => x.id === id);
      dugmeler.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.motor === id)));
      kart.className = `ml-uyg__kart ${m.cls}`;
      kart.querySelector('.ml-uyg__karar span').textContent = m.karar;
      kart.querySelector('[data-alan=sistem]').textContent = m.sistem;
      kart.querySelector('[data-alan=sure]').textContent = m.sure;
      kart.querySelector('.ml-uyg__metin').textContent = m.metin;
      kart.querySelector('.ml-uyg__evrak').hidden = m.id === 'dizel';
      kart.querySelector('.ml-uyg__wa').href = waHref(d, `Merhaba ${d.isletme.ad}, aracımın motoru: ${m.ad}. Marka/model/yıl: `);
      if (anim && !reducedMotion) gsap.fromTo(kart.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
    };
    const ilk = [...dugmeler].find((b) => b.getAttribute('aria-checked') === 'true')?.dataset.motor || 'mpi';
    sec(ilk, false);
    dugmeler.forEach((b) => b.addEventListener('click', () => sec(b.dataset.motor, true)));

    const cizim = el.querySelector('.ml-bagaj__cizim');
    const tDug = el.querySelectorAll('[data-tank]');
    const tSec = (t) => {
      cizim.dataset.tip = t;
      tDug.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tank === t)));
      el.querySelectorAll('[data-tank-metin]').forEach((p) => (p.hidden = p.dataset.tankMetin !== t));
    };
    tSec('simit');
    tDug.forEach((b) => b.addEventListener('click', () => tSec(b.dataset.tank)));
  },
};

// --- galeri -------------------------------------------------------------------------------
export const galeri = {
  render(d) {
    const g = d.kurumsal?.galeri || d.galeri;
    if (!g?.length) return '';
    return `
      <section class="k-bolum ml-galeri">
        <div class="k-kap">
          <h2 class="k-h2" data-bol>${esc(d.kurumsal?.galeriBaslik || 'LPG işleri')}</h2>
          <ul class="ml-galeri__liste">
            ${g.map((x, i) => `<li class="ml-kare"><figure><div class="ml-kare__foto"><img src="${x.src}" alt="${esc(x.alt)}" loading="lazy"></div><figcaption><b>${String(i + 1).padStart(2, '0')}</b>${esc(x.alt)}</figcaption></figure></li>`).join('')}
          </ul>
        </div>
      </section>`;
  },
  mount(el) {
    const kareler = el.querySelectorAll('.ml-kare');
    if (reducedMotion || !('IntersectionObserver' in window)) return kareler.forEach((l) => l.classList.add('is-gorunur'));
    el.classList.add('ml-galeri--hareket');
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('is-gorunur'), io.unobserve(e.target))), { rootMargin: '0px 0px -10% 0px' });
    kareler.forEach((l) => io.observe(l));
  },
};
