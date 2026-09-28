// Sektör modülleri: "Termal kamera" yönü.
// termal: künye (k-hero--kunye); menfez fotoğrafının üstünde sürüklenebilir termal görüntü.
// menfez: "Ön kontrol" sayfası; üfleme sıcaklığı kaydırıcısı bölümün rengini termal skalada değiştirir,
//         olası sebebi ve bakılacak yerleri gösterir, WhatsApp'a hazır mesaj yazar.
// gaz:    R134a / R1234yf ve manifold manometresi (çizim; ibreler örnek konumdadır, ölçüm değildir).
import { esc, telHref, waHref, mapsHref, gunDurumu, kisaAdres, icons, gsap, reducedMotion, asset } from '../../shared/core.js';


// Termal skala (soğuk → sıcak), görsellerdeki renk eşlemesiyle aynı duraklar.
const SKALA = [[0, [60, 20, 140]], [0.28, [20, 110, 230]], [0.5, [0, 190, 200]], [0.72, [250, 215, 70]], [0.88, [255, 120, 30]], [1, [240, 60, 40]]];
function skalaRenk(t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < SKALA.length; i++) {
    const [b, cb] = SKALA[i];
    const [a, ca] = SKALA[i - 1];
    if (t <= b) {
      const f = (t - a) / (b - a);
      return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * f)).join(' ')})`;
    }
  }
  return 'rgb(240 60 40)';
}

// --- Künye ----------------------------------------------------------------------------------
// Motorun künye düzeni (k-hero--kunye); görsel tarafında menfez fotoğrafı ve üstünde sürüklenebilir termal katman.

export const termal = {
  render(d, { tema }) {
    const b = d.saatler ? gunDurumu(d.saatler) : null;
    return `
      <section class="k-hero k-hero--kunye th" aria-label="Künye">
        <div class="k-kap k-hero__ic">
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
          <figure class="k-hero__gorsel th__kare" data-perde style="--x:0%">
            <div class="k-hero__gorsel-ic" data-paralaks>
              <img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high">
              <img class="th__termal" src="${asset('/img/kurumsal-klima/menfez-termal.jpg')}" alt="" aria-hidden="true">
            </div>
            <button class="th__tut" type="button" aria-label="Normal ve termal görüntü arasındaki çizgiyi kaydır"><span></span></button>
          </figure>
        </div>
      </section>`;
  },
  mount(el) {
    const kare = el.querySelector('.th__kare');
    const tut = el.querySelector('.th__tut');
    const termalImg = el.querySelector('.th__termal');
    const konum = { x: 0 };
    const uygula = () => kare.style.setProperty('--x', `${konum.x}%`);

    const sur = (e) => {
      const r = kare.getBoundingClientRect();
      konum.x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
      uygula();
    };
    tut.addEventListener('pointerdown', (e) => {
      gsap.killTweensOf(konum);
      kare.classList.add('is-surukle');
      tut.setPointerCapture(e.pointerId);
      const hareket = (ev) => sur(ev);
      const bitir = () => {
        kare.classList.remove('is-surukle');
        tut.removeEventListener('pointermove', hareket);
      };
      tut.addEventListener('pointermove', hareket);
      tut.addEventListener('pointerup', bitir, { once: true });
      tut.addEventListener('pointercancel', bitir, { once: true });
    });
    tut.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      konum.x = Math.min(100, Math.max(0, konum.x + (e.key === 'ArrowRight' ? 8 : -8)));
      uygula();
    });

    if (reducedMotion) {
      konum.x = 55;
      uygula();
      return;
    }
    // Açılışta termal katman bir kez yarıya kadar açılır.
    gsap.fromTo(termalImg, { scale: 1.18 }, { scale: 1, duration: 1.4, ease: 'power3.out', delay: 0.2 });
    gsap.to(konum, { x: 56, duration: 1.2, ease: 'power3.inOut', delay: 0.9, onUpdate: uygula });
  },
};

// --- İmza: menfez termometresi -------------------------------------------------------------

const DURUMLAR = [
  {
    ust: 8, ad: 'Soğutma yerinde',
    metin: 'Klima gazı ve kompresör tarafı büyük ihtimalle iyi durumda. Koku ya da zayıf üfleme varsa filtreye ve evaporatöre bakılır.',
    bak: ['Polen filtresinin durumu', 'Evaporatörde koku ve küf'], hizmet: 'Polen filtresi ve dezenfeksiyon',
  },
  {
    ust: 13, ad: 'Soğutma zayıflamış',
    metin: 'Klima çalışıyor ama eskisi kadar soğutmuyor. Gaz azalmış, kondenser kirlenmiş ya da fan yetersiz kalıyor olabilir.',
    bak: ['Alçak ve yüksek taraf basınçları', 'Kondenser yüzeyi ve fan', 'Küçük bir kaçak'], hizmet: 'Basınç ölçümü ve kaçak testi',
  },
  {
    ust: 20, ad: 'Gaz büyük ölçüde gitmiş olabilir',
    metin: 'Hava serin bile gelmiyorsa sistemde gaz kalmamış ya da kompresör devreye girmiyor olabilir. Gaz doldurulmadan önce kaçak aranır.',
    bak: ['Azotla basınç testi, UV boya', 'Kompresör kavraması', 'Kondenser ve hortum bağlantıları'], hizmet: 'Kaçak testi, ardından tartılı dolum',
  },
  {
    ust: 99, ad: 'Klima soğutmuyor',
    metin: 'Üfleme ağzından dış hava gibi ılık hava geliyorsa kompresör hiç çalışmıyor ya da klape sıcak havayı karıştırıyor olabilir.',
    bak: ['Kavrama, röle ve sigorta', 'Basınç ve sıcaklık sensörleri', 'Klape motoru ve klima paneli hata kaydı'], hizmet: 'Elektronik arıza tespiti',
  },
];
const EKLER = [
  { id: 'koku', ad: 'Kötü koku geliyor', bak: 'Polen filtresi ve evaporatör dezenfeksiyonu' },
  { id: 'bugu', ad: 'Camlar buğulanıyor', bak: 'Polen filtresi ve evaporatör su tahliyesi' },
  { id: 'trafik', ad: 'Trafikte duruşta ısınıyor', bak: 'Kondenser fanı ve fan rölesi' },
  { id: 'ses', ad: 'Açınca ses geliyor', bak: 'Kompresör rulmanı ve kavrama' },
  { id: 'yaz', ad: 'Gaz her yaz bitiyor', bak: 'Azotla kaçak testi, UV boya' },
];
const MIN = 3, MAX = 30;

const menfezSvg = `
  <svg class="mf__svg" viewBox="0 0 240 240" aria-hidden="true">
    <circle cx="120" cy="120" r="116" class="mf__dis" />
    <circle cx="120" cy="120" r="100" class="mf__halka" />
    <circle cx="120" cy="120" r="88" class="mf__cekirdek" />
    <g class="mf__kanat">${[-52, -26, 0, 26, 52].map((y) => `<rect x="44" y="${116 + y}" width="152" height="9" rx="4.5" />`).join('')}</g>
    <rect x="98" y="113" width="44" height="14" rx="7" class="mf__dugme" />
  </svg>`;

export const menfez = {
  render(d) {
    return `
      <section class="k-bolum mf" aria-labelledby="mf-baslik" style="--renk: rgb(20 110 230); --t: .2">
        <div class="mf__isik" aria-hidden="true"></div>
        <div class="k-kap">
          <div class="mf__bas">
            <h2 class="k-h2" id="mf-baslik" data-bol>Üfleme sıcaklığına göre ön kontrol</h2>
            <p class="k-lead">Klima en soğukta, fan ortada birkaç dakika çalıştıktan sonra üfleme ağzından gelen havanın sıcaklığı seçilir. Olası sebep ve ilk bakılacak yerler aşağıda görünür.</p>
          </div>
          <div class="mf__ic">
            <div class="mf__olcum">
              <div class="mf__menfez">
                ${menfezSvg}
                <div class="mf__hava" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
              </div>
              <p class="mf__derece" aria-live="polite"><b data-o="derece">12</b><span>°C</span></p>
              <label class="mf__kaydir">
                <span class="mf__kaydir-ad">Üfleme ağzından gelen hava</span>
                <input type="range" min="${MIN}" max="${MAX}" step="1" value="12" name="derece" aria-label="Üfleme ağzından gelen havanın sıcaklığı, derece">
                <span class="mf__uclar" aria-hidden="true"><span>Buz gibi</span><span>Serin</span><span>Ilık</span><span>Sıcak</span></span>
              </label>
            </div>
            <div class="mf__sonuc">
              <p class="mf__durum-ust">Olası durum</p>
              <h3 class="mf__durum" data-o="ad"></h3>
              <p class="mf__metin" data-o="metin"></p>
              <p class="mf__alt">İlk bakılacak yerler</p>
              <ol class="mf__bak" data-o="bak"></ol>
              <fieldset class="mf__ekler">
                <legend>Başka belirtiler</legend>
                ${EKLER.map((e) => `<label><input type="checkbox" value="${e.id}"><span>${esc(e.ad)}</span></label>`).join('')}
              </fieldset>
              <a class="k-btn mf__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu bilgiyle WhatsApp'tan yazın</span></a>
              <p class="mf__not">Bu yalnızca bir ön fikirdir. Kesin sebep basınç ölçümü ve kaçak testiyle bulunur.</p>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const giris = el.querySelector('input[type=range]');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const gonder = el.querySelector('.mf__gonder');
    const kutular = [...el.querySelectorAll('.mf__ekler input')];
    let sonDurum = null;

    const guncelle = (ilk) => {
      const v = Number(giris.value);
      const t = (v - MIN) / (MAX - MIN);
      el.style.setProperty('--renk', skalaRenk(t));
      el.style.setProperty('--t', t.toFixed(3));
      giris.style.setProperty('--p', `${t * 100}%`);
      o('derece').textContent = v;
      const durum = DURUMLAR.find((x) => v <= x.ust);
      const ekler = EKLER.filter((e) => kutular.find((k) => k.value === e.id)?.checked);
      const liste = [...durum.bak, ...ekler.map((e) => e.bak)];
      if (durum !== sonDurum) {
        o('ad').textContent = durum.ad;
        o('metin').textContent = durum.metin;
        if (!ilk && !reducedMotion) gsap.fromTo([o('ad'), o('metin')], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
        sonDurum = durum;
      }
      o('bak').innerHTML = liste.map((x) => `<li>${esc(x)}</li>`).join('');
      const mesaj = [
        `Merhaba ${d.isletme.ad}, aracımın kliması için yazıyorum.`,
        `Üfleme ağzından gelen hava: yaklaşık ${v} °C (${durum.ad.toLocaleLowerCase('tr-TR')})`,
        ekler.length ? `Ayrıca: ${ekler.map((e) => e.ad.toLocaleLowerCase('tr-TR')).join(', ')}` : '',
        'Ne zaman getirebilirim?',
      ].filter(Boolean).join('\n');
      gonder.href = waHref(d, mesaj);
    };
    giris.addEventListener('input', () => guncelle(false));
    kutular.forEach((k) => k.addEventListener('change', () => guncelle(false)));
    guncelle(true);

    if (reducedMotion) return;
    // Sayfa açılınca menfez bir kez döner, kanatlar açılır (sayfanın ilk bölümü; kaydırmaya bağlı değil).
    const kanat = el.querySelectorAll('.mf__kanat rect');
    gsap.timeline({ delay: 0.3 })
      .from(el.querySelector('.mf__svg'), { rotate: -90, scale: 0.7, autoAlpha: 0, duration: 1, ease: 'power3.out', transformOrigin: '50% 50%' })
      .from(kanat, { scaleY: 0.15, transformOrigin: '50% 50%', transformBox: 'fill-box', duration: 0.6, stagger: 0.06, ease: 'back.out(2)' }, '-=0.5');
  },
};

// --- Gaz ve manometre ----------------------------------------------------------------------

const kadran = (sinif, ad, olcek, bolmeler) => `
  <figure class="gz__kadran ${sinif}">
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="94" class="gz__kasa" />
      <circle cx="100" cy="100" r="82" class="gz__yuz" />
      <path class="gz__yay" d="M 42 158 A 82 82 0 1 1 158 158" pathLength="100" />
      ${Array.from({ length: 21 }, (_, i) => {
        const a = (-225 + i * 13.5) * (Math.PI / 180);
        const r1 = i % 5 ? 70 : 64;
        return `<line x1="${(100 + Math.cos(a) * r1).toFixed(1)}" y1="${(100 + Math.sin(a) * r1).toFixed(1)}" x2="${(100 + Math.cos(a) * 76).toFixed(1)}" y2="${(100 + Math.sin(a) * 76).toFixed(1)}" class="${i % 5 ? '' : 'is-kalin'}" />`;
      }).join('')}
      ${bolmeler.map((b, i) => {
        const a = (-225 + i * 67.5) * (Math.PI / 180);
        return `<text x="${(100 + Math.cos(a) * 52).toFixed(1)}" y="${(104 + Math.sin(a) * 52).toFixed(1)}">${b}</text>`;
      }).join('')}
      <text x="100" y="140" class="gz__birim">${olcek}</text>
      <g class="gz__ibre"><path d="M100 104 L97 100 L100 30 L103 100 Z" /><circle cx="100" cy="100" r="8" /></g>
    </svg>
    <figcaption>${ad}</figcaption>
  </figure>`;

export const gaz = {
  render() {
    return `
      <section class="k-bolum gz" aria-labelledby="gz-baslik">
        <div class="k-kap">
          <div class="gz__bas">
            <div>
              <h2 class="k-h2" id="gz-baslik" data-bol>Klima gazı ve basınç ölçümü</h2>
              <p class="k-lead">Manifold manometresi klimanın iki tarafındaki basıncı aynı anda gösterir. Gaz dolumundan önce alçak ve yüksek taraf basınçları ölçülür.</p>
            </div>
            <div class="gz__kadranlar">
              ${kadran('is-alcak', 'Alçak taraf', 'bar', ['0', '3', '6', '9', '12'])}
              ${kadran('is-yuksek', 'Yüksek taraf', 'bar', ['0', '10', '20', '30', '40'])}
            </div>
          </div>
          <div class="gz__tupler">
            <article class="gz__tup">
              <p class="gz__kod">R134a</p>
              <p class="gz__kim">Daha eski model araçların çoğunda</p>
              <ul class="k-maddeler">
                <li>Sistem önce vakumlanır, nem ve hava alınır.</li>
                <li>Gaz, etikette yazan miktara göre tartılarak doldurulur.</li>
                <li>Kompresör yağı kontrol edilip eksikse tamamlanır.</li>
              </ul>
            </article>
            <article class="gz__tup is-yeni">
              <p class="gz__kod">R1234yf</p>
              <p class="gz__kim">Yeni araçların çoğunda</p>
              <ul class="k-maddeler">
                <li>Kendi dolum cihazıyla ve kendi bağlantı ağzından doldurulur.</li>
                <li>R134a ile karıştırılmaz, onun yerine de kullanılmaz.</li>
                <li>Gaz ya da parça siparişle gelecekse araç sahibine önceden haber verilir.</li>
              </ul>
            </article>
          </div>
          <p class="k-not">Aracın hangi gazı kullandığı kaputun altındaki klima etiketinde yazar.</p>
        </div>
      </section>`;
  },
  mount(el) {
    const ibreler = el.querySelectorAll('.gz__ibre');
    const yaylar = el.querySelectorAll('.gz__yay');
    // Çalışır durumdaki bir sistem gibi: alçak taraf düşük, yüksek taraf yukarıda (örnek konum, ölçü değil).
    const hedef = [-89, -34]; // ibre dönüşü (derece): yukarı bakan ibre 0, kadranın başı -135
    if (reducedMotion) {
      ibreler.forEach((g, i) => g.setAttribute('transform', `rotate(${hedef[i]} 100 100)`));
      return;
    }
    ibreler.forEach((g) => gsap.set(g, { rotation: -135, svgOrigin: '100 100' }));
    const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.gz__kadranlar'), start: 'top 78%', toggleActions: 'play none none none' } });
    yaylar.forEach((y) => tl.fromTo(y, { strokeDasharray: '0 100' }, { strokeDasharray: '100 100', duration: 1.1, ease: 'power2.inOut' }, 0));
    ibreler.forEach((g, i) => tl.to(g, { rotation: hedef[i], duration: 1.6, ease: 'elastic.out(1, 0.45)' }, 0.3 + i * 0.15));
    // Yüksek tarafta hafif titreme: kompresör çalışıyor.
    tl.to(ibreler[1], { rotation: `+=2.5`, duration: 0.09, yoyo: true, repeat: 7, ease: 'sine.inOut' });
  },
};
