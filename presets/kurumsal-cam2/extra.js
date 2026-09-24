// Sektör modülleri ("Polarize" yönü):
// (1) lens     — hero fotoğrafının üstünde gezen polarize filtre; camdaki gerilim desenini gökkuşağı halkalarıyla gösterir.
// (2) camKodu  — imza modülü: camın köşesindeki damgayı parça parça okur (üretici, lamine/temperli, E onayı, DOT, AS1,
//                tarih noktaları) ve tarih kodu çözücü: noktaları ve rakamı seçin, camın üretim ayı çıksın; araç yılıyla kıyas.
// (3) ziyaret  — çalışma saatleri, canlı açık/kapalı, adres, yol tarifi, yaklaşınca yüklenen harita.
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const buYil = new Date().getFullYear();

// --- 1. Polarize lens -------------------------------------------------------------------

export const lens = {
  render() {
    return '<div class="pz-isaret" aria-hidden="true"></div>';
  },
  mount(el) {
    const fig = document.querySelector('.k-hero__gorsel');
    if (!fig || fig.querySelector('.pz')) return;
    fig.insertAdjacentHTML(
      'beforeend',
      `<div class="pz" aria-hidden="true">
        <div class="pz__lens"><div class="pz__desen"></div><div class="pz__halka"></div></div>
        <p class="pz__etiket"><span>Polarize filtre</span> camdaki gerilim</p>
      </div>`
    );
    const lensEl = fig.querySelector('.pz__lens');
    const desen = fig.querySelector('.pz__desen');
    if (reducedMotion) return;
    const x = gsap.quickTo(lensEl, 'x', { duration: 0.9, ease: 'power3.out' });
    const y = gsap.quickTo(lensEl, 'y', { duration: 0.9, ease: 'power3.out' });
    const donus = gsap.to(desen, { rotate: 360, duration: 26, ease: 'none', repeat: -1 });
    // Dokunmatikte kendiliğinden gezinir; farede imleci izler.
    const kendi = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut', duration: 3.2 } });
    const yerlestir = () => {
      const r = fig.getBoundingClientRect();
      const l = lensEl.offsetWidth;
      kendi.clear()
        .fromTo(lensEl, { x: r.width * 0.12, y: r.height * 0.18 }, { x: r.width * 0.62 - l / 2, y: r.height * 0.52 - l / 2 })
        .to(lensEl, { x: r.width * 0.78 - l / 2, y: r.height * 0.1 });
    };
    yerlestir();
    const fare = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fare) {
      fig.addEventListener('pointerenter', () => kendi.pause());
      fig.addEventListener('pointermove', (e) => {
        const r = fig.getBoundingClientRect();
        const l = lensEl.offsetWidth / 2;
        x(e.clientX - r.left - l);
        y(e.clientY - r.top - l);
      });
      fig.addEventListener('pointerleave', () => kendi.play());
    }
    // Ekran dışında dur.
    ScrollTrigger.create({
      trigger: fig, start: 'top bottom', end: 'bottom top',
      onToggle: (s) => { s.isActive ? (donus.play(), kendi.play()) : (donus.pause(), kendi.pause()); },
    });
    addEventListener('resize', yerlestir, { passive: true });
  },
};

// --- 2. Cam kodu ------------------------------------------------------------------------

const PARCALAR = [
  { id: 'uretici', ad: 'Üretici işareti', metin: 'Camı kimin ürettiğini gösterir. Köşede aracın kendi markasının logosu da varsa cam çoğu zaman fabrikadan takılan orijinal camdır; yalnızca cam üreticisinin işareti varsa muadil cam olabilir.', neden: 'Değişimde orijinal mi muadil mi istediğinizi buna göre konuşuruz.' },
  { id: 'cins', ad: 'Lamine ya da temperli', metin: 'LAMINATED yazıyorsa iki cam arasında ince bir film var demektir; kırılınca dağılmaz, örümcek ağı gibi çatlar. Ön cam her zaman lamine olur. TEMPERED yazan cam kırılınca küçük, küt parçalara ayrılır; yan ve arka camlarda kullanılır.', neden: 'Taş izi tamiri yalnızca lamine camda yapılır.' },
  { id: 'onay', ad: 'E işareti ve onay no', metin: 'Daire içindeki E, camın Avrupa (BM R43) güvenlik onayını aldığını gösterir. Yanındaki sayı onayı veren ülkedir: E1 Almanya, E2 Fransa, E3 İtalya, E4 Hollanda gibi. Altındaki uzun numara o camın onay numarasıdır.', neden: 'Onay işareti olmayan cam muayenede sorun çıkarabilir.' },
  { id: 'dot', ad: 'DOT kodu', metin: 'ABD için verilen üretici kodudur; camın hangi fabrikadan çıktığını gösterir. Her camda bulunmayabilir.', neden: 'Aynı modelin farklı fabrika camlarını ayırt ederken bakarız.' },
  { id: 'as', ad: 'AS1, AS2 sınıfı', metin: 'Işık geçirgenliği sınıfıdır. AS1 yazan cam en az yüzde 70 ışık geçirir ve ön cam olarak kullanılabilir. AS2 ve AS3 daha koyu camlardır, arka ve yan camlarda görülür.', neden: 'Cam filmi seçerken camın kendi koyuluğunu da hesaba katarız.' },
  { id: 'tarih', ad: 'Üretim tarihi noktaları', metin: 'Rakam, üretim yılının son hanesidir. Noktalar ayı gösterir: çoğu üreticide rakamdan önceki noktalar yılın ilk yarısını, sonraki noktalar ikinci yarısını anlatır. Nokta sayısı arttıkça ay başa yaklaşır.', neden: 'Tarih aracın model yılından sonraysa cam değişmiş olabilir. Aşağıda deneyin.' },
];

function ayBul(yer, adet) {
  // Rakamdan önce n nokta → 7 - n. ay (6 nokta Ocak, 1 nokta Haziran); sonra n nokta → 13 - n. ay (6 nokta Temmuz, 1 nokta Aralık).
  return yer === 'once' ? 7 - adet : 13 - adet;
}
function yilBul(rakam) {
  let y = buYil - ((buYil - rakam) % 10 + 10) % 10;
  return y;
}
const noktalar = (n) => '<i></i>'.repeat(n);

export const camKodu = {
  render(d, ctx) {
    const yillar = Array.from({ length: 16 }, (_, i) => buYil - i);
    return `
      <section class="k-bolum ck" aria-labelledby="ck-baslik">
        <div class="k-kap">
          <div class="ck__bas">
            <p class="ck__etiket"><span>Cam kimliği</span><span>06 alan</span></p>
            <h2 class="k-h2" id="ck-baslik" data-bol>Camın köşesine bakın. Her şey orada yazar.</h2>
            <p class="k-lead">Ön camın alt köşesindeki küçük damga; camın cinsini, onayını, üreticisini ve yaşını söyler. Bir satıra dokunun, ne anlama geldiğini okuyun.</p>
          </div>
          <div class="ck__ic">
            <div class="ck__cam">
              <div class="ck__frit" aria-hidden="true"></div>
              <div class="ck__damga" role="group" aria-label="Örnek cam damgası">
                <button type="button" class="ck__p ck__p--uretici" data-p="0" aria-label="${esc(PARCALAR[0].ad)}"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 35 11.5v17L20 37 5 28.5v-17z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M13 25 20 13l7 12z" fill="currentColor"/></svg><span>CAM ÜRETİCİSİ</span></button>
                <button type="button" class="ck__p ck__p--cins" data-p="1" aria-label="${esc(PARCALAR[1].ad)}">LAMINATED</button>
                <button type="button" class="ck__p ck__p--onay" data-p="2" aria-label="${esc(PARCALAR[2].ad)}"><b>E1</b><span>43R-00 1234</span></button>
                <span class="ck__satir">
                  <button type="button" class="ck__p ck__p--dot" data-p="3" aria-label="${esc(PARCALAR[3].ad)}">DOT 000 M000</button>
                  <button type="button" class="ck__p ck__p--as" data-p="4" aria-label="${esc(PARCALAR[4].ad)}">AS1</button>
                </span>
                <button type="button" class="ck__p ck__p--tarih" data-p="5" aria-label="${esc(PARCALAR[5].ad)}"><span class="ck__nokta" data-dm="once">${noktalar(3)}</span><b data-dm="rakam">9</b><span class="ck__nokta" data-dm="sonra"></span></button>
              </div>
              <div class="ck__tarama" aria-hidden="true"></div>
              <p class="ck__not">Örnek damga. Yerleşim üreticiye göre değişir.</p>
            </div>
            <div class="ck__panel" aria-live="polite">
              <ol class="ck__sekme" role="tablist" aria-label="Damga alanları">
                ${PARCALAR.map((p, i) => `<li><button type="button" role="tab" data-p="${i}" aria-selected="${i === 0}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(p.ad)}</button></li>`).join('')}
              </ol>
              <div class="ck__acik">
                <p class="ck__no" data-o="no">01</p>
                <h3 class="k-h3" data-o="ad"></h3>
                <p data-o="metin"></p>
                <p class="ck__neden" data-o="neden"></p>
              </div>
            </div>
          </div>

          <div class="ck__coz" aria-labelledby="ck-coz-baslik">
            <div class="ck__coz-bas">
              <h3 class="k-h3" id="ck-coz-baslik">Camınız hangi ay üretilmiş?</h3>
              <p class="k-soluk">Camınızdaki rakamı ve noktaları seçin. İkinci el araç alırken çok işe yarar.</p>
            </div>
            <div class="ck__coz-ic">
              <fieldset class="ck__alan">
                <legend>1 · Rakam (yılın son hanesi)</legend>
                <div class="ck__rakamlar">${Array.from({ length: 10 }, (_, i) => `<label><input type="radio" name="rakam" value="${i}"${i === (buYil - 4) % 10 ? ' checked' : ''}><span>${i}</span></label>`).join('')}</div>
              </fieldset>
              <fieldset class="ck__alan">
                <legend>2 · Noktalar rakamın</legend>
                <div class="ck__yer">
                  <label><input type="radio" name="yer" value="once" checked><span>Önünde</span></label>
                  <label><input type="radio" name="yer" value="sonra"><span>Arkasında</span></label>
                </div>
                <div class="ck__adet" role="group" aria-label="Nokta sayısı">
                  ${Array.from({ length: 6 }, (_, i) => `<label><input type="radio" name="adet" value="${i + 1}"${i === 2 ? ' checked' : ''}><span aria-hidden="true"><i></i></span><em class="sr-only">${i + 1} nokta</em></label>`).join('')}
                </div>
              </fieldset>
              <fieldset class="ck__alan">
                <legend>3 · Aracınızın model yılı</legend>
                <select name="arac" aria-label="Aracın model yılı">${yillar.map((y, i) => `<option${i === 4 ? ' selected' : ''}>${y}</option>`).join('')}</select>
              </fieldset>
              <output class="ck__sonuc">
                <span class="ck__onizleme" data-o="onizleme" aria-hidden="true"></span>
                <span class="ck__tarih"><small>Cam üretimi</small><strong data-o="tarih"></strong></span>
                <span class="ck__hukum" data-o="hukum"></span>
                <a class="k-btn ck__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Camın fotoğrafını gönderin</span></a>
              </output>
            </div>
            <p class="ck__dipnot">Çoğu üretici tarihi böyle yazar; bazı markalar farklı işaret kullanır. Emin olmak için fotoğrafı gönderin, biz bakalım.</p>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const sekmeler = [...el.querySelectorAll('.ck__sekme button')];
    const parcalar = [...el.querySelectorAll('.ck__p')];
    const acik = el.querySelector('.ck__acik');
    const tarama = el.querySelector('.ck__tarama');
    let aktif = -1;

    const sec = (i, animasyon = true) => {
      if (i === aktif) return;
      aktif = i;
      const p = PARCALAR[i];
      sekmeler.forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
      parcalar.forEach((b) => b.classList.toggle('is-aktif', Number(b.dataset.p) === i));
      o('no').textContent = String(i + 1).padStart(2, '0');
      o('ad').textContent = p.ad;
      o('metin').textContent = p.metin;
      o('neden').textContent = p.neden;
      if (!reducedMotion && animasyon) {
        gsap.fromTo(acik.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out', overwrite: true });
        const hedef = parcalar.find((b) => Number(b.dataset.p) === i);
        const cam = el.querySelector('.ck__cam');
        const y = hedef.getBoundingClientRect().top - cam.getBoundingClientRect().top + hedef.offsetHeight / 2;
        gsap.fromTo(tarama, { y: 0, opacity: 1 }, { y, duration: 0.5, ease: 'power2.inOut' });
        gsap.to(tarama, { opacity: 0, duration: 0.4, delay: 0.55 });
      }
    };
    [...sekmeler, ...parcalar].forEach((b) => b.addEventListener('click', () => { durdur(); sec(Number(b.dataset.p)); }));
    sec(0, false);

    // İlk görünüşte damga satır satır "basılır", sonra alanlar sırayla gezilir (dokununca durur).
    let gezinti = null;
    const durdur = () => { gezinti?.kill(); gezinti = null; };
    if (!reducedMotion) {
      const damgaSatir = el.querySelectorAll('.ck__damga > *');
      gsap.set(damgaSatir, { clipPath: 'inset(0 100% 0 0)' });
      ScrollTrigger.create({
        trigger: el.querySelector('.ck__cam'), start: 'top 72%', once: true,
        onEnter: () => {
          gsap.to(damgaSatir, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, stagger: 0.14, ease: 'steps(14)' });
          let i = 0;
          gezinti = gsap.delayedCall(2.4, function dongu() {
            i = (i + 1) % PARCALAR.length;
            sec(i);
            gezinti = gsap.delayedCall(3.6, dongu);
          });
        },
      });
      ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onLeave: durdur, onLeaveBack: durdur });
    }

    // Tarih kodu çözücü
    const form = el.querySelector('.ck__coz-ic');
    const gonder = el.querySelector('.ck__gonder');
    const dmOnce = el.querySelector('[data-dm="once"]');
    const dmSonra = el.querySelector('[data-dm="sonra"]');
    const dmRakam = el.querySelector('[data-dm="rakam"]');
    const cozDegeri = () => {
      const v = (n) => form.querySelector(`[name="${n}"]:checked`)?.value;
      return { rakam: Number(v('rakam')), yer: v('yer'), adet: Number(v('adet')), arac: Number(form.querySelector('[name="arac"]').value) };
    };
    const coz = (anim) => {
      const s = cozDegeri();
      const ay = ayBul(s.yer, s.adet);
      const yil = yilBul(s.rakam);
      const kod = s.yer === 'once' ? `${'•'.repeat(s.adet)} ${s.rakam}` : `${s.rakam} ${'•'.repeat(s.adet)}`;
      o('onizleme').innerHTML = s.yer === 'once'
        ? `<span>${noktalar(s.adet)}</span><b>${s.rakam}</b>`
        : `<b>${s.rakam}</b><span>${noktalar(s.adet)}</span>`;
      dmOnce.innerHTML = s.yer === 'once' ? noktalar(s.adet) : '';
      dmSonra.innerHTML = s.yer === 'sonra' ? noktalar(s.adet) : '';
      dmRakam.textContent = s.rakam;
      o('tarih').textContent = `${AYLAR[ay - 1]} ${yil}`;
      let hukum, sinif;
      if (yil > s.arac) { hukum = `Cam, aracın model yılından (${s.arac}) sonra üretilmiş. Cam değişmiş olabilir; satıcıya sorun.`; sinif = 'is-uyari'; }
      else if (yil < s.arac - 1) { hukum = `Cam, model yılından epey önce üretilmiş görünüyor. Rakam 10 yıl önceyi de gösterebilir; fotoğrafla birlikte bakalım.`; sinif = 'is-soru'; }
      else { hukum = `Tarih, ${s.arac} model araçla uyumlu. Cam büyük ihtimalle fabrika çıkışı.`; sinif = 'is-tamam'; }
      const h = o('hukum');
      h.textContent = hukum;
      h.className = `ck__hukum ${sinif}`;
      gonder.href = waHref(d, `Merhaba ${d.isletme.ad}, camımın köşesinde "${kod}" yazıyor (${AYLAR[ay - 1]} ${yil} çıktı), araç ${s.arac} model. Fotoğrafını gönderiyorum, bakar mısınız?`);
      if (anim && !reducedMotion) gsap.fromTo(o('tarih'), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    };
    form.addEventListener('input', () => coz(true));
    form.addEventListener('change', () => coz(true));
    coz(false);
  },
};

// --- 3. Ziyaret -------------------------------------------------------------------------

export const ziyaret = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    return `
      <section class="k-bolum zy" aria-labelledby="zy-baslik">
        <div class="k-kap zy__ic">
          <div class="zy__sol">
            <p class="ck__etiket"><span>Konum</span><span>Etimesgut</span></p>
            <h2 class="k-h2" id="zy-baslik" data-bol>Aracı getirin, camın başında konuşalım.</h2>
            <p class="zy__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <dl class="zy__saat">
              ${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
            </dl>
            <p class="k-soluk zy__bugun">Bugün ${GUNLER[bugun]}</p>
            <p class="zy__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="zy__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.zy__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};
