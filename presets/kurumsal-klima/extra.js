// Sektör modülleri — "Termal kamera" yönü.
// termal: hero; menfez fotoğrafının üstünde sürüklenebilir termal görüntü + ölçüm göstergesi (açılışta 24 → 6 °C).
// serit:  hero altı kayan şerit (yalnızca CSS transform).
// menfez: imza bölümü; "menfezden kaç derece geliyor?" kaydırıcısı → bölümün rengi termal skalada değişir,
//         olası sebep + bakılacaklar + WhatsApp'a hazır mesaj.
// gaz:    R134a / R1234yf ve manifold manometreleri (ibreler kaydırınca oturur).
// saat:   çalışma saatleri, canlı açık/kapalı, yol tarifi, yaklaşınca yüklenen harita.
import { esc, telHref, waHref, mapsHref, mapsEmbed, openStatus, GUNLER, icons, gsap, reducedMotion, asset } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const virgul = (n) => n.toFixed(1).replace('.', ',');

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

// --- Hero ----------------------------------------------------------------------------------

export const termal = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const ust = `${d.isletme.sektor.split(':')[0]}. ${tema.yer} ${yilEki(d.isletme.kurulus)} beri.`;
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bilgi = [['Kuruluş', String(d.isletme.kurulus)], st ? ['Bugün', st.text] : null, ['Gaz', 'R134a · R1234yf'], ['Telefon', d.iletisim.telefon]]
      .filter(Boolean)
      .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
      .join('');
    return `
      <section class="k-hero th" aria-label="Giriş">
        <div class="k-kap k-hero__ic">
          <div class="k-hero__metin">
            <p class="k-hero__ust"><span class="th__nokta" aria-hidden="true"></span>${esc(ust)}</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(h.birincil || 'Bize yazın')} ${ok}`)}
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <figure class="k-hero__gorsel th__kare" data-perde style="--x:0%">
            <div class="k-hero__gorsel-ic" data-paralaks>
              <img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high">
              <img class="th__termal" src="${asset('/img/kurumsal-klima/menfez-termal.jpg')}" alt="" aria-hidden="true">
              <span class="th__nisan" aria-hidden="true"></span>
            </div>
            <div class="th__hud" aria-hidden="true">
              <span class="th__etiket"><i></i>Termal</span>
              <span class="th__okuma"><small>Menfez</small><b data-derece>24,0</b><em>°C</em></span>
              <span class="th__skala"><i>40</i><i>0</i></span>
            </div>
            <button class="th__tut" type="button" aria-label="Termal görüntüyü kaydırın"><span></span></button>
            <figcaption class="th__not">Termal görüntüyü parmağınızla kaydırın</figcaption>
          </figure>
        </div>
        <div class="k-kap"><dl class="k-hero__bilgi">${bilgi}</dl></div>
      </section>`;
  },
  mount(el) {
    const kare = el.querySelector('.th__kare');
    const tut = el.querySelector('.th__tut');
    const derece = el.querySelector('[data-derece]');
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
      derece.textContent = '6,4';
      return;
    }
    // Perde açılırken termal katman da ilk fotoğrafla aynı ölçekte otursun.
    gsap.fromTo(termalImg, { scale: 1.18 }, { scale: 1, duration: 1.4, ease: 'power3.out', delay: 0.2 });
    const o = { t: 24 };
    gsap.timeline({ delay: 1.1 })
      .to(konum, { x: 58, duration: 1.4, ease: 'power3.inOut', onUpdate: uygula })
      .to(o, { t: 6.4, duration: 2.2, ease: 'power2.out', onUpdate: () => (derece.textContent = virgul(o.t)) }, 0.2);
  },
};

// --- Kayan şerit ----------------------------------------------------------------------------

const SERIT = ['Vakum', 'Kaçak testi', 'R134a', 'R1234yf', 'Kompresör', 'Kondenser', 'Polen filtresi', 'Dezenfeksiyon', 'Klima paneli', 'Fan rölesi'];
export const serit = {
  render() {
    const grup = SERIT.map((a) => `<span>${esc(a)}</span>`).join('');
    return `
      <div class="sr" aria-label="Baktığımız işler: ${esc(SERIT.join(', '))}">
        <div class="sr__akis" aria-hidden="true">${grup}${grup}</div>
      </div>`;
  },
};

// --- İmza: menfez termometresi -------------------------------------------------------------

const DURUMLAR = [
  {
    ust: 8, ad: 'Soğutma yerinde',
    metin: 'Sağlıklı bir oto klimada menfezden çıkan hava çoğu zaman 4 ile 8 °C arasında ölçülür. Gaz ve kompresör tarafı büyük ihtimalle iyi.',
    bak: ['Polen filtresinin durumu', 'Evaporatörde koku ve küf'], hizmet: 'Polen filtresi ve dezenfeksiyon',
  },
  {
    ust: 13, ad: 'Soğutma zayıflamış',
    metin: 'Klima çalışıyor ama eskisi kadar soğutmuyor. Gaz azalmış, kondenser kirlenmiş ya da fan yetmiyor olabilir.',
    bak: ['Alçak ve yüksek taraf basınçları', 'Kondenser yüzeyi ve fan', 'Küçük bir kaçak'], hizmet: 'Basınç ölçümü ve kaçak testi',
  },
  {
    ust: 20, ad: 'Gaz büyük ölçüde gitmiş olabilir',
    metin: 'Hava serin bile değilse sistemde gaz kalmamış ya da kompresör devreye girmiyor olabilir. Gazı basmadan önce kaçağı bulmak gerekir.',
    bak: ['Azotla basınç testi, UV boya', 'Kompresör kavraması', 'Kondenser ve hortum bağlantıları'], hizmet: 'Kaçak testi, ardından tartılı dolum',
  },
  {
    ust: 99, ad: 'Klima soğutmuyor',
    metin: 'Menfezden dış hava gibi ya da ılık hava geliyorsa kompresör hiç çalışmıyor ya da klape sıcak havayı karıştırıyor olabilir.',
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
            <p class="mf__etiket"><span></span>1 dakikalık ön kontrol</p>
            <h2 class="k-h2" id="mf-baslik" data-bol>Elinizi menfeze tutun. Kaç derece geliyor?</h2>
            <p class="k-lead">Klimayı en soğukta, fanı ortada açın; birkaç dakika bekleyin. Hissettiğiniz sıcaklığı seçin, ilk nereye bakacağımızı söyleyelim.</p>
          </div>
          <div class="mf__ic">
            <div class="mf__olcum">
              <div class="mf__menfez">
                ${menfezSvg}
                <div class="mf__hava" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
              </div>
              <p class="mf__derece" aria-live="polite"><b data-o="derece">12</b><span>°C</span></p>
              <label class="mf__kaydir">
                <span class="mf__kaydir-ad">Menfezden gelen hava</span>
                <input type="range" min="${MIN}" max="${MAX}" step="1" value="12" name="derece" aria-label="Menfezden gelen havanın sıcaklığı, derece">
                <span class="mf__uclar" aria-hidden="true"><span>Buz gibi</span><span>Serin</span><span>Ilık</span><span>Sıcak</span></span>
              </label>
            </div>
            <div class="mf__sonuc">
              <p class="mf__durum-ust">Olası durum</p>
              <h3 class="mf__durum" data-o="ad"></h3>
              <p class="mf__metin" data-o="metin"></p>
              <p class="mf__alt">Ustamızın ilk bakacağı yerler</p>
              <ol class="mf__bak" data-o="bak"></ol>
              <fieldset class="mf__ekler">
                <legend>Başka bir şey var mı?</legend>
                ${EKLER.map((e) => `<label><input type="checkbox" value="${e.id}"><span>${esc(e.ad)}</span></label>`).join('')}
              </fieldset>
              <a class="k-btn mf__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu bilgiyle bize yazın</span></a>
              <p class="mf__not">Bu bir ön fikirdir; kesin sebebi basınç ölçümü ve kaçak testiyle buluruz. Fiyatı işe başlamadan söyleriz.</p>
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
        `Menfezden gelen hava: yaklaşık ${v} °C (${durum.ad.toLowerCase()})`,
        ekler.length ? `Ayrıca: ${ekler.map((e) => e.ad.toLowerCase()).join(', ')}` : '',
        'Ne zaman getirebilirim?',
      ].filter(Boolean).join('\n');
      gonder.href = waHref(d, mesaj);
    };
    giris.addEventListener('input', () => guncelle(false));
    kutular.forEach((k) => k.addEventListener('change', () => guncelle(false)));
    guncelle(true);

    if (reducedMotion) return;
    // Kaydırınca: kanatlar açılır, sıcaklık 24'ten 12'ye iner (klima çalışmaya başlamış gibi).
    const kanat = el.querySelectorAll('.mf__kanat rect');
    const v = { d: 24 };
    giris.value = 24;
    guncelle(true);
    gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.mf__olcum'), start: 'top 72%', once: true } })
      .from(el.querySelector('.mf__svg'), { rotate: -90, scale: 0.7, opacity: 0, duration: 1, ease: 'power3.out', transformOrigin: '50% 50%' })
      .from(kanat, { scaleY: 0.15, transformOrigin: '50% 50%', transformBox: 'fill-box', duration: 0.6, stagger: 0.06, ease: 'back.out(2)' }, '-=0.5')
      .to(v, { d: 12, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { giris.value = Math.round(v.d); guncelle(false); } }, '-=0.2');
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
              <p class="mf__etiket"><span></span>Gaz dolumu</p>
              <h2 class="k-h2" id="gz-baslik" data-bol>Önce ölçer, sonra tartarak doldururuz.</h2>
              <p class="k-lead">Manifold manometresi klimanın iki tarafını aynı anda gösterir: alçak taraf evaporatörde, yüksek taraf kondenserde ne olduğunu söyler. Basınçlara bakmadan gaz basmayız.</p>
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
                <li>Gaz, etiketteki miktara göre gram gram tartılır.</li>
                <li>Kompresör yağı da kontrol edilip tamamlanır.</li>
              </ul>
            </article>
            <article class="gz__tup is-yeni">
              <p class="gz__kod">R1234yf</p>
              <p class="gz__kim">Yeni araçların çoğunda</p>
              <ul class="k-maddeler">
                <li>Kendine özel dolum cihazı ve bağlantı ağzı ister.</li>
                <li>R134a ile karıştırılmaz, yerine konmaz.</li>
                <li>Gazı ya da parçası geç gelecekse önceden haber veririz.</li>
              </ul>
            </article>
          </div>
          <p class="k-not">Aracınızın hangi gazı kullandığı kaputun altındaki klima etiketinde yazar. Göremezseniz plakayla arayın, birlikte bakalım.</p>
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
    const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.gz__kadranlar'), start: 'top 78%', once: true } });
    yaylar.forEach((y) => tl.fromTo(y, { strokeDasharray: '0 100' }, { strokeDasharray: '100 100', duration: 1.1, ease: 'power2.inOut' }, 0));
    ibreler.forEach((g, i) => tl.to(g, { rotation: hedef[i], duration: 1.6, ease: 'elastic.out(1, 0.45)' }, 0.3 + i * 0.15));
    // Yüksek tarafta hafif titreme: kompresör çalışıyor.
    tl.to(ibreler[1], { rotation: `+=2.5`, duration: 0.09, yoyo: true, repeat: 7, ease: 'sine.inOut' });
  },
};

// --- Saatler ve konum ----------------------------------------------------------------------

export const saat = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    return `
      <section class="k-bolum st" aria-labelledby="st-baslik">
        <div class="k-kap st__ic">
          <div class="st__sol">
            <p class="mf__etiket"><span></span>Çalışma saatleri</p>
            <h2 class="k-h2" id="st-baslik" data-bol>Şaşmaz'da, 4. Cadde üzerindeyiz.</h2>
            <p class="st__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <p class="st__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="st__kart">
            <ol class="st__gunler" data-sira>
              ${[1, 2, 3, 4, 5, 6, 0]
                .map((g) => {
                  const s = d.saatler[g];
                  return `<li class="${g === bugun ? 'is-bugun' : ''}${s ? '' : ' is-kapali'}"><span>${GUNLER[g]}</span><b>${s ? esc(s.replace('-', ' – ')) : 'Kapalı'}</b></li>`;
                })
                .join('')}
            </ol>
            <div class="st__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yükleniyor</p></div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.st__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
    return () => io.disconnect();
  },
};
