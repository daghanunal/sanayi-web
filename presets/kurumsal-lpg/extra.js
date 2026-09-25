// "Tüp yeşili": LPG'nin yolunu, tank etiketini ve evrak düzenini anlatan kurumsal site. Modüller:
//  giris     — ana sayfa girişi: dev başlık, yeşil çift ton fotoğraf, dönen tank pulu, canlı durum
//  hat       — gazın yolu: tanktan motora yedi parça; kaydırdıkça hat dolar, en sonda alev yanar
//  tankPulu  — tank yaşı kadranı: üretim yılını seçin, son kullanım ve muayene durumunu görün
//  uygunluk  — motor tipi seç → uygun sistem, süre, evrak; tank tipi (simit/silindir) bagaj çizimi
//  mesai     — açık mı, saatler, adres, yaklaşınca yüklenen harita
//  galeri    — atölyeden kareler (görünür oldukça açılır)
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const buYil = new Date().getFullYear();
const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const ALEV = `<svg class="ml-alev" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="mlAlevG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1d4dff"/><stop offset=".6" stop-color="#4f8bff"/><stop offset="1" stop-color="#b9d4ff"/></linearGradient></defs><path d="M24 3c3 8 13 13 13 25a13 13 0 0 1-26 0c0-7 4-10 6-15 1 4 3 7 6 7-2-6-1-12 1-17z" fill="url(#mlAlevG)"/><path d="M24 24c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 .6 2 1.6 3 3 3-.8-2.6-.6-4.6 0-7z" fill="#e8f0ff" opacity=".9"/></svg>`;

// --- giris --------------------------------------------------------------------------------
export const giris = {
  render(d) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const yil = buYil - d.isletme.kurulus;
    const halka = `LPG · ŞAŞMAZ · ${d.isletme.kurulus} · TANK · HAT · AYAR · EVRAK · `;
    return `
      <section class="ml-giris" aria-label="Giriş">
        <div class="k-kap ml-giris__ic">
          <div class="ml-giris__metin">
          <p class="ml-ust"><span class="ml-ust__kod">LPG</span><span>${esc(String(d.isletme.sektor).replace(/^LPG\s+/i, ''))}</span><span>Şaşmaz'da ${esc(yilEki(d.isletme.kurulus))} beri</span></p>
          <h1 class="k-h1 ml-giris__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
          <div class="ml-giris__alt">
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `Randevu isteyin ${ok}`)}
              ${rota('uygunluk', 'Aracıma olur mu?', 'k-btn k-btn--ikincil')}
            </div>
          </div>
          </div>
        <div class="ml-giris__sahne">
          <figure class="ml-giris__foto" data-perde><div class="ml-giris__foto-ic" data-paralaks><img src="${import.meta.env.BASE_URL}img/kurumsal-lpg/manometre.jpg" alt="Gaz hattındaki basınç göstergeleri" fetchpriority="high"></div></figure>
          <div class="ml-pul" aria-hidden="true">
            <svg viewBox="0 0 200 200" class="ml-pul__halka"><defs><path id="mlPulYol" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs><text><textPath href="#mlPulYol" textLength="486" lengthAdjust="spacing">${esc(halka)}</textPath></text></svg>
            <div class="ml-pul__ic">${ALEV}<strong>${yil}</strong><span>yıl</span></div>
          </div>
          <dl class="ml-giris__bilgi">
            ${st ? `<div class="${st.open ? 'is-acik' : ''}"><dt>Bugün</dt><dd><i></i>${esc(st.text)}</dd></div>` : ''}
            <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
            <div><dt>Adres</dt><dd>${esc(d.iletisim.adres)}</dd></div>
          </dl>
        </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.fromTo(el.querySelector('.ml-pul'), { scale: 0.4, rotate: -90, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 1.2, delay: 0.7, ease: 'back.out(1.6)' });
    gsap.from(el.querySelectorAll('.ml-ust > span, .ml-giris__bilgi > div'), { y: 14, opacity: 0, duration: 0.6, stagger: 0.07, delay: 0.3, ease: 'power2.out' });
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
  ['valf', 'Çok valf', 'Tankın üstündeki güvenlik bloğu. Dolumu yüzde seksende keser, fazla akışı durdurur, seviyeyi gösterir.'],
  ['boru', 'Gaz hattı', 'Sıvı gazı tanktan motor bölmesine taşır. Araç altından, sabitlenerek ve sürtünmeyecek şekilde geçirilir.'],
  ['regulator', 'Regülatör', 'Motor suyuyla ısınır; sıvı gazı buhara çevirip basıncını düşürür. Soğuk havada ilk çalıştırma bu yüzden benzinledir.'],
  ['filtre', 'Buhar filtresi', 'Gazdaki kiri enjektöre varmadan tutar. Bakımda değişen parçaların başında gelir.'],
  ['enjektor', 'Enjektörler', 'Sıralı sistemde her silindire ayrı enjektör. Gaz tam zamanında, tam miktarda verilir.'],
  ['beyin', 'Beyin', 'Benzin beyninin sinyallerini okuyup gaz enjektörlerini sürer. Ayar burada, bilgisayarla yapılır.'],
];

export const hat = {
  render() {
    return `
      <section class="k-bolum ml-hat" aria-labelledby="ml-hat-b">
        <div class="k-kap ml-hat__ic">
          <div class="ml-hat__yan">
            <p class="ml-etiket">Gazın yolu · 7 parça</p>
            <h2 class="k-h2" id="ml-hat-b" data-bol>Tanktan silindire, her parça yerli yerinde.</h2>
            <p class="k-lead">Dönüşüm bir kutu takmak değil; yedi parçanın doğru sırayla, doğru yere oturması. Aşağı kaydırın, gazın izlediği yolu görün.</p>
            <figure class="ml-hat__foto"><img src="${import.meta.env.BASE_URL}img/kurumsal-lpg/eller.jpg" alt="Emme manifoldu çevresinde enjektör bağlantıları sıkılıyor" loading="lazy"></figure>
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
              <div><span class="ml-parca__no">Sonuç</span><h3>Motor benzindeki gibi çeker</h3><p>Ayar yolda, farklı devirlerde denenerek bitirilir. Geçişi siz hissetmezsiniz.</p></div>
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
      ScrollTrigger.create({ trigger: p, start: 'top 66%', onEnter: () => p.classList.add('is-dolu'), onLeaveBack: () => p.classList.remove('is-dolu') })
    );
  },
};

// --- tankPulu: tank yaşı kadranı -----------------------------------------------------------
const OMUR = 10;
function yay(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(((a - 90) * Math.PI) / 180), cy + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function tankDurum(uretim) {
  const yas = buYil - uretim;
  const son = uretim + OMUR;
  const kalan = son - buYil;
  if (kalan <= 0) return { yas, son, kalan, cls: 'is-bitik', etiket: 'Süresi dolmuş', metin: `Tankın kullanım süresi ${son} yılında dolmuş görünüyor. Muayeneye girmeden önce tankı değiştirmek gerekir; stok varsa aynı gün değiştiririz.` };
  if (kalan <= 2) return { yas, son, kalan, cls: 'is-yakin', etiket: `${kalan} yılı kaldı`, metin: `Süre ${son} yılında doluyor. Bir sonraki muayeneden önce tankı ve çok valfi kontrol ettirin, değişim zamanını birlikte planlayalım.` };
  return { yas, son, kalan, cls: 'is-rahat', etiket: `${kalan} yılı var`, metin: `Tank ${son} yılına kadar kullanılabilir görünüyor. Yine de her muayene öncesi bağlantıları ve çok valfi kaçak testinden geçirmek iyi olur.` };
}

export const tankPulu = {
  render(d) {
    const min = buYil - 13;
    const bas = buYil - 6;
    const seg = Array.from({ length: OMUR }, (_, i) => `<path class="ml-kadran__dilim" data-i="${i}" d="${yay(160, 160, 128, i * 36 + 3, i * 36 + 33)}"/>`).join('');
    const cent = Array.from({ length: 60 }, (_, i) => {
      const a = ((i * 6 - 90) * Math.PI) / 180;
      const r1 = i % 6 === 0 ? 100 : 105;
      return `<line x1="${(160 + r1 * Math.cos(a)).toFixed(1)}" y1="${(160 + r1 * Math.sin(a)).toFixed(1)}" x2="${(160 + 110 * Math.cos(a)).toFixed(1)}" y2="${(160 + 110 * Math.sin(a)).toFixed(1)}"/>`;
    }).join('');
    return `
      <section class="k-bolum ml-tank" aria-labelledby="ml-tank-b">
        <div class="k-kap ml-tank__ic">
          <div class="ml-tank__metin">
            <p class="ml-etiket">Tank etiketi · periyodik muayene</p>
            <h2 class="k-h2" id="ml-tank-b" data-bol>Tankınızın kaç yılı kaldı?</h2>
            <p class="k-lead">Tankın üstündeki etikette üretim tarihi yazar. Yılı seçin; kadran kullanım süresini ve muayene öncesi yapılacakları göstersin.</p>
            <label class="ml-tank__secim">
              <span>Tank üretim yılı</span>
              <span class="ml-tank__yil-sat"><button type="button" class="ml-tank__adim" data-adim="-1" aria-label="Bir yıl geri">−</button><output class="ml-tank__yil">${bas}</output><button type="button" class="ml-tank__adim" data-adim="1" aria-label="Bir yıl ileri">+</button></span>
              <input type="range" min="${min}" max="${buYil}" value="${bas}" step="1" aria-label="Tank üretim yılı">
              <span class="ml-tank__uc"><span>${min}</span><span>${buYil}</span></span>
            </label>
          </div>
          <div class="ml-tank__kadran">
            <svg viewBox="0 0 320 320" class="ml-kadran" role="img" aria-label="Tank kullanım süresi kadranı">
              <circle cx="160" cy="160" r="150" class="ml-kadran__zemin"/>
              <g class="ml-kadran__cent">${cent}</g>
              <g class="ml-kadran__dilimler">${seg}</g>
            </svg>
            <div class="ml-kadran__orta" aria-live="polite">
              <span class="ml-kadran__ust">Tank yaşı</span>
              <strong class="ml-kadran__yas">0</strong>
              <span class="ml-kadran__son">Son kullanım <b></b></span>
            </div>
            <span class="ml-kadran__durum"></span>
          </div>
          <div class="ml-tank__sonuc">
            <p class="ml-tank__yorum"></p>
            <ul class="ml-tank__liste">
              <li>Tank etiketi ve son kullanım tarihi</li>
              <li>Çok valf, dolum ağzı ve seviye göstergesi</li>
              <li>Hat ve regülatör bağlantılarında kaçak testi</li>
              <li>Tank bağlantı kayışları ve sabitleme</li>
            </ul>
            <a class="k-btn ml-tank__wa" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Tank kontrolü için yazın</span></a>
            <p class="ml-tank__not">Kesin tarih tankın etiketinde yazar. Araç tanklarının çoğunda kullanım süresi üretimden itibaren ${OMUR} yıldır; tankınızı görünce net söyleriz.</p>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const input = el.querySelector('input[type=range]');
    const yilEl = el.querySelector('.ml-tank__yil');
    const yasEl = el.querySelector('.ml-kadran__yas');
    const sonEl = el.querySelector('.ml-kadran__son b');
    const durumEl = el.querySelector('.ml-kadran__durum');
    const yorum = el.querySelector('.ml-tank__yorum');
    const wa = el.querySelector('.ml-tank__wa');
    const dilimler = el.querySelectorAll('.ml-kadran__dilim');
    const kok = el.querySelector('.ml-tank__ic');
    const sayac = { v: 0 };
    let ilk = true;
    const guncelle = () => {
      const u = Number(input.value);
      const s = tankDurum(u);
      yilEl.textContent = u;
      sonEl.textContent = s.son;
      durumEl.textContent = s.etiket;
      yorum.textContent = s.metin;
      kok.classList.remove('is-rahat', 'is-yakin', 'is-bitik');
      kok.classList.add(s.cls);
      dilimler.forEach((p, i) => p.classList.toggle('is-dolu', i < s.yas));
      input.style.setProperty('--ilerleme', `${((u - input.min) / (input.max - input.min)) * 100}%`);
      wa.href = waHref(d, `Merhaba ${d.isletme.ad}, aracımdaki LPG tankı ${u} üretimi. Muayeneden önce kontrol için randevu almak istiyorum.`);
      if (reducedMotion || ilk) {
        yasEl.textContent = Math.max(0, s.yas);
      } else {
        gsap.to(sayac, { v: Math.max(0, s.yas), duration: 0.45, ease: 'power2.out', overwrite: true, onUpdate: () => (yasEl.textContent = Math.round(sayac.v)) });
      }
      sayac.v = ilk ? Math.max(0, s.yas) : sayac.v;
    };
    input.addEventListener('input', guncelle);
    el.querySelectorAll('[data-adim]').forEach((b) =>
      b.addEventListener('click', () => {
        input.value = Number(input.value) + Number(b.dataset.adim);
        guncelle();
      })
    );
    guncelle();
    ilk = false;
    if (!reducedMotion) {
      // Kadran ilk görününce dilimler sırayla yanar.
      gsap.from(dilimler, { opacity: 0, scale: 0.85, transformOrigin: '160px 160px', duration: 0.5, stagger: 0.06, ease: 'back.out(2)', scrollTrigger: { trigger: el.querySelector('.ml-kadran'), start: 'top 80%', once: true } });
    }
  },
};

// --- uygunluk: motor tipi seçici ---------------------------------------------------------
const MOTOR = [
  { id: 'mpi', ad: 'Çok noktalı enjeksiyon', alt: 'Çoğu benzinli araç', karar: 'Olur', cls: 'is-olur', sistem: 'Sıralı enjeksiyon LPG sistemi', sure: '1-2 gün', metin: 'En yaygın dönüşüm. Her silindire ayrı gaz enjektörü takılır, araç benzindeki gibi çeker.' },
  { id: 'di', ad: 'Direkt enjeksiyon', alt: 'TSI, TFSI, GDI, EcoBoost', karar: 'İncelemeyle olur', cls: 'is-inceleme', sistem: 'Direkt enjeksiyona özel LPG sistemi', sure: '2-3 gün', metin: 'Benzin enjektörlerini koruyan yapıyla kurulur. Motor koduna bakıp uygunluğu önceden söyleriz.' },
  { id: 'eski', ad: 'Eski LPG sistemi var', alt: 'Karbüratörlü ya da ilk nesil', karar: 'Yenileriz', cls: 'is-olur', sistem: 'Sıralı enjeksiyona yenileme', sure: '1 gün', metin: 'Sağlam kalan tank ve hatlar mümkünse yeniden kullanılır, eksik parçalar yenilenir.' },
  { id: 'dizel', ad: 'Dizel motor', alt: 'Mazotlu araçlar', karar: 'Yapmıyoruz', cls: 'is-yok', sistem: '-', sure: '-', metin: 'Dizel araçlara LPG dönüşümü yapmıyoruz. Aracınız benzinliyse diğer seçeneklere bakın.' },
];
const EVRAK = ['Tadilat projesi', 'Montaj belgesi', 'Ruhsata LPG işlenmesi', 'Kullanım ve bakım bilgisi'];

export const uygunluk = {
  render(d, ctx, sorgu) {
    const secili = MOTOR.find((m) => m.id === sorgu?.get('motor')) || MOTOR[0];
    return `
      <section class="k-bolum ml-uyg" aria-labelledby="ml-uyg-b">
        <div class="k-kap">
          <div class="ml-uyg__bas">
            <p class="ml-etiket">1 · Motor tipi</p>
            <h2 class="k-h2" id="ml-uyg-b" data-bol>Aracınızın motoru hangisi?</h2>
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
                <p class="ml-etiket">Teslimde elinizde olacak</p>
                <ol>${EVRAK.map((e) => `<li>${e}</li>`).join('')}</ol>
              </div>
              <a class="k-btn ml-uyg__wa" href="${waHref(d)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Aracımı yazayım</span></a>
            </article>
          </div>

          <div class="ml-bagaj">
            <div class="ml-bagaj__metin">
              <p class="ml-etiket">2 · Tank tipi</p>
              <h3 class="k-h3">Bagaj mı, stepne yuvası mı?</h3>
              <div class="ml-bagaj__dugmeler" role="radiogroup" aria-label="Tank tipi">
                <button type="button" role="radio" aria-checked="true" data-tank="simit">Simit tank</button>
                <button type="button" role="radio" aria-checked="false" data-tank="silindir">Silindir tank</button>
              </div>
              <p class="ml-bagaj__aciklama" data-tank-metin="simit">Stepnenin yerine, yuvanın içine oturur. Bagaj tabanı düz kalır, hacim kaybı olmaz. Stepne yerine lastik tamir kiti kullanılır.</p>
              <p class="ml-bagaj__aciklama" data-tank-metin="silindir" hidden>Bagajın arka koltuk tarafına, kayışlarla sabitlenir. Daha fazla gaz alır, uzun yol yapan ve stepnesinden vazgeçmek istemeyenler için.</p>
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

const mesaiBaslik = (adres = '') => {
  const c = adres.match(/(\d+\.\s*(?:Cadde|Sokak|Blok))/i);
  return c ? `Şaşmaz, ${c[1]}.` : 'Şaşmaz Oto Sanayi.';
};

// --- mesai --------------------------------------------------------------------------------
export const mesai = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    return `
      <section class="k-bolum ml-mesai" aria-labelledby="ml-mesai-b">
        <div class="k-kap ml-mesai__ic">
          <div>
            <p class="ml-etiket">Atölye</p>
            <h2 class="k-h2" id="ml-mesai-b" data-bol>${esc(mesaiBaslik(d.iletisim.adres))}</h2>
            <p class="ml-durum ${st.open ? 'is-acik' : ''}"><i></i>${esc(st.text)}</p>
            <dl class="ml-saat">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
            <p class="ml-adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="ml-harita"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const kutu = el.querySelector('.ml-harita');
    const io = new IntersectionObserver(
      (e) => {
        if (!e[0].isIntersecting) return;
        kutu.innerHTML = `<iframe title="Konum haritası" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        io.disconnect();
      },
      { rootMargin: '300px' }
    );
    io.observe(kutu);
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
          <p class="ml-etiket">Atölyeden · ${g.length} kare</p>
          <h2 class="k-h2" data-bol>${esc(d.kurumsal?.galeriBaslik || 'Atölyeden')}</h2>
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
