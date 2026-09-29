// Sektör modülleri (kurumsal-ekspertiz, "Askı etiketi"):
// (1) etiketHero: künye. Ekspertiz sonrası aynaya asılan sarı kart burada işletmenin künyesini taşır
//     (adres, bugün, telefon). Kart açılışta ipiyle bir kez sallanarak gelir (~1,2 sn).
// (2) rontgen: yandan araç çizimi üstünde sürüklenen tarama merceği. Mercek altında seçilen katman (kaporta,
//     şasi, motor ve OBD, yürüyen aksam) görünür; geçtiği kontrol noktası kartta anlatılır. Hizmetler sayfasında.
import { esc, waHref, telHref, mapsHref, gunDurumu, kisaAdres, icons, gsap, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

// --- (1) Künye: askı etiketi ---------------------------------------------------------------------

export const etiketHero = {
  render(d, { tema }) {
    const b = d.saatler ? gunDurumu(d.saatler) : null;
    return `
      <section class="k-hero k-hero--kunye et-hero" aria-label="Künye">
        <div class="k-kap et-hero__ic">
          <div class="k-hero__metin et-hero__bas">
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="k-lead k-hero__tanim">${esc(d.isletme.tanim || d.isletme.sektor)}</p>
          </div>
          <div class="et-hero__sahne">
            <figure class="et-hero__foto" data-perde>
              <div class="et-hero__foto-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div>
            </figure>
            <span class="et-cubuk" aria-hidden="true"></span>
            <div class="et-aski">
              <article class="et-kart">
                <span class="et-delik" aria-hidden="true"></span>
                <p class="et-kart__tur">Künye</p>
                <dl class="k-kunye et-kunye">
                  <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
                  ${b ? `<div><dt>Bugün</dt><dd><span class="k-durum ${b.open ? 'is-acik' : ''}"><span></span>${esc(b.kunye)}</span></dd></div>` : ''}
                  <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
                </dl>
                <p class="et-kart__alt">Şaşmaz Oto Sanayi Sitesi · ${esc(yilEki(d.isletme.kurulus))} beri</p>
              </article>
            </div>
          </div>
          <div class="k-butonlar et-hero__alt">
            <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
            ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d, `Merhaba ${d.isletme.ad}, bir araç için ekspertiz randevusu almak istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>` : ''}
            <a class="k-btn k-btn--ikincil" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    // Kart ipiyle birlikte askıdan bir kez sallanarak gelir; kaydırmaya bağlı hareket yok.
    gsap.fromTo(el.querySelector('.et-kart'),
      { rotation: -16, y: -24, autoAlpha: 0 },
      { rotation: 0, y: 0, autoAlpha: 1, duration: 1.2, ease: 'elastic.out(1, 0.45)', delay: 0.3, clearProps: 'transform,opacity,visibility' });
  },
};

// --- (2) Röntgen: tarama merceği ----------------------------------------------------------------
// viewBox 800 x 300, burun solda. Zemin y=268, ön teker (185,228), arka teker (618,228).
const GOVDE = 'M36 222 L34 190 C34 176 44 168 62 165 L236 150 C262 136 300 106 334 94 C350 88 372 84 396 84 L520 84 C548 84 566 92 588 106 L640 140 L738 148 C756 150 766 160 766 176 L764 220 C764 226 760 228 752 228 L670 228 A52 52 0 0 0 566 228 L237 228 A52 52 0 0 0 133 228 L46 228 C40 228 36 226 36 222 Z';
const CAMLAR = 'M268 146 C292 126 318 106 342 99 L438 97 L438 146 Z M452 97 L516 97 C540 97 556 104 574 116 L606 143 L452 146 Z';
const teker = (x) => `<circle cx="${x}" cy="228" r="40"/><circle cx="${x}" cy="228" r="24" class="rt-jant"/><circle cx="${x}" cy="228" r="5" class="rt-gobek"/>`;

const KATMANLAR = [
  {
    id: 'kaporta', ad: 'Kaporta ve boya', arac: 'Boya kalınlık ölçer, ışık',
    noktalar: [
      { x: 150, y: 160, ad: 'Motor kaputu', metin: 'Her parça birkaç noktadan ölçülür, değer mikron olarak rapora yazılır. Değişen kaput fabrika boyalı gelebilir; bu yüzden menteşe cıvatalarında söküm izine de bakılır.' },
      { x: 345, y: 186, ad: 'Ön kapı', metin: 'Kapı kenarı, fitil altı ve menteşeler kontrol edilir. Lokal boyada aynı parçanın noktaları arasında fark çıkar.' },
      { x: 470, y: 88, ad: 'Tavan', metin: 'Tavandaki boya ya da dikiş bozukluğu ağır bir hasarın izi olabilir. Tavan da ölçülür, cam fitilleri incelenir.' },
      { x: 690, y: 170, ad: 'Arka çamurluk', metin: 'Macunlu onarımda ölçülen değer belirgin yükselir. Işık altında dalga, renk ve parlaklık farkına bakılır.' },
    ],
  },
  {
    id: 'sasi', ad: 'Şasi', arac: 'Lift, el feneri',
    noktalar: [
      { x: 84, y: 205, ad: 'Ön şasi ucu', metin: 'Önden darbe almış araçta ilk bakılan yerdir. Çekme, kaynak ve ezilme izi lift üstünde aranır.' },
      { x: 300, y: 222, ad: 'Podye', metin: 'Araç lifte kaldırılıp podye boyunca el feneriyle bakılır. Kaynak dikişi, macun ve kabarma rapora yazılır.' },
      { x: 445, y: 130, ad: 'Orta direk', metin: 'Direklerdeki kesme ya da kaynak izi ciddi bir hasarı gösterir. Kapı fitili aralanarak direk yüzeyi kontrol edilir.' },
      { x: 704, y: 196, ad: 'Bagaj havuzu', metin: 'Arkadan alınan darbenin izi havuzda kalır. Stepne çıkarılıp havuz, arka panel ve şasi uçları incelenir.' },
    ],
  },
  {
    id: 'motor', ad: 'Motor ve OBD', arac: 'Arıza tespit cihazı',
    noktalar: [
      { x: 126, y: 190, ad: 'Motor', metin: 'Motor soğukken çalıştırılır. Üflemeye, yağ kaçağına, antifrize, kayışlara ve bağlantılara bakılır.' },
      { x: 232, y: 196, ad: 'Şanzıman', metin: 'Vites geçişleri dinamometrede ve yolda denenir. Silinmiş şanzıman arızaları taramada ortaya çıkar.' },
      { x: 318, y: 196, ad: 'OBD soketi', metin: 'Motor, şanzıman, ABS, hava yastığı ve konfor beyinlerindeki kayıtlı ve silinmiş hata kodları okunur.' },
      { x: 92, y: 168, ad: 'Akü ve şarj', metin: 'Akü ve şarj voltajı ölçülür. Elektronik arızaların çoğu zayıf aküyle başladığı için değer rapora yazılır.' },
    ],
  },
  {
    id: 'aksam', ad: 'Yürüyen aksam', arac: 'Lift, dinamometre',
    noktalar: [
      { x: 185, y: 228, ad: 'Ön fren', metin: 'Disk ve balata aşınması ölçülür, sonuç rapora yazılır.' },
      { x: 262, y: 244, ad: 'Rotil ve salıncak', metin: 'Lift üstünde boşluklara, burç yırtıklarına ve aks körüklerine tek tek bakılır.' },
      { x: 618, y: 184, ad: 'Amortisör', metin: 'Sızıntıya ve yağlanmaya bakılır. Yol testinde ses, yol tutuş ve savrulma dinlenir.' },
      { x: 618, y: 266, ad: 'Lastikler', metin: 'Dört lastiğin diş derinliği ayrı ölçülür, üretim tarihi okunup rapora yazılır.' },
    ],
  },
];

const icCizim = () => `
  <g class="rt-ic">
    <g class="rt-k rt-k--kaporta">
      <path d="M62 165 L236 150 L240 226 L140 226 C136 196 112 176 62 176 Z"/>
      <path d="M250 150 L446 144 L446 226 L250 226 Z"/>
      <path d="M446 144 L612 142 L620 190 C600 180 576 184 566 226 L446 226 Z"/>
      <path d="M396 84 L520 84"/>
      <path d="M640 140 L738 148 C756 150 766 160 766 176 L764 190 L664 190 Z"/>
    </g>
    <g class="rt-k rt-k--sasi">
      <path d="M44 206 L150 202 M150 212 L660 212 M660 204 L756 198"/>
      <path d="M150 202 L150 212 M660 204 L660 212"/>
      <path d="M232 204 L232 220 M330 206 L330 220 M446 206 L446 220 M560 206 L560 220"/>
      <path d="M237 222 L566 222" class="rt-kalin"/>
      <path d="M268 146 L342 99 M446 97 L446 212 M574 116 L610 146"/>
      <ellipse cx="704" cy="196" rx="36" ry="12"/>
    </g>
    <g class="rt-k rt-k--motor">
      <rect x="70" y="170" width="112" height="44" rx="6"/>
      <circle cx="94" cy="192" r="8"/><circle cx="116" cy="192" r="8"/><circle cx="138" cy="192" r="8"/><circle cx="160" cy="192" r="8"/>
      <path d="M190 180 L262 186 L256 210 L196 212 Z"/>
      <rect x="306" y="190" width="24" height="12" rx="2"/>
      <path d="M306 196 C262 170 214 160 182 176" class="rt-kablo"/>
      <rect x="76" y="156" width="34" height="18" rx="3"/>
    </g>
    <g class="rt-k rt-k--aksam">
      <circle cx="185" cy="228" r="27"/><circle cx="618" cy="228" r="27"/>
      <path d="M170 204 A27 27 0 0 1 200 204" class="rt-kalin"/><path d="M603 204 A27 27 0 0 1 633 204" class="rt-kalin"/>
      <path d="M185 196 l-9 -4 l18 -6 l-18 -6 l18 -6 l-9 -4 M618 196 l-9 -4 l18 -6 l-18 -6 l18 -6 l-9 -4"/>
      <path d="M205 236 L300 244 M598 236 L520 240"/>
      <path d="M240 250 L700 246" class="rt-kablo"/><rect x="646" y="238" width="60" height="16" rx="7"/>
    </g>
  </g>`;

const aracSvg = () => `
  <svg class="rt-svg" viewBox="16 52 768 226" role="img" aria-label="Yandan araç çizimi ve tarama merceği">
    <defs>
      <clipPath id="rt-mercek"><rect class="rt-mercek-rect" x="310" y="52" width="180" height="226"/></clipPath>
      <pattern id="rt-izgara" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgb(255 189 18 / .14)" stroke-width="1"/></pattern>
      <linearGradient id="rt-boya" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f5ef"/><stop offset=".62" stop-color="#dcd8cc"/><stop offset="1" stop-color="#bdb8aa"/></linearGradient>
    </defs>
    <line class="rt-zemin" x1="0" y1="268" x2="800" y2="268"/>
    <g class="rt-dis">
      <path d="${GOVDE}" class="rt-govde"/>
      <path d="${CAMLAR}" class="rt-cam"/>
      <path d="M240 150 L640 142 M446 146 L446 226 M250 152 C244 180 244 206 246 226 M612 143 C618 170 620 196 618 206" class="rt-cizgi"/>
      <path d="M44 176 L82 171 L86 181 L46 186 Z" class="rt-far"/><path d="M748 156 L764 162 L764 180 L744 176 Z" class="rt-stop"/>
      <rect x="392" y="162" width="26" height="6" rx="3" class="rt-kol"/><rect x="560" y="160" width="26" height="6" rx="3" class="rt-kol"/>
      <path d="M262 146 L252 132 L274 132 L282 142 Z" class="rt-ayna"/>
      <g class="rt-teker">${teker(185)}${teker(618)}</g>
    </g>
    <g clip-path="url(#rt-mercek)">
      <rect x="0" y="0" width="800" height="300" class="rt-rontgen-zemin"/>
      <rect x="0" y="0" width="800" height="300" fill="url(#rt-izgara)"/>
      <path d="${GOVDE}" class="rt-hayalet"/>
      <g class="rt-hayalet-teker">${teker(185)}${teker(618)}</g>
      ${icCizim()}
    </g>
    <g class="rt-kenar" aria-hidden="true">
      <line class="rt-kenar__l" x1="310" y1="52" x2="310" y2="278"/><line class="rt-kenar__r" x1="490" y1="52" x2="490" y2="278"/>
      <g class="rt-tutamak"><rect x="-26" y="-2" width="52" height="24" rx="12"/><path d="M-10 10 l-6 0 M-12 6 l-4 4 l4 4 M10 10 l6 0 M12 6 l4 4 l-4 4"/></g>
    </g>
    <g class="rt-noktalar">
      ${KATMANLAR.map((k) => k.noktalar.map((n, i) => `<g class="rt-nokta" data-k="${k.id}" data-i="${i}" transform="translate(${n.x} ${n.y})"><circle r="15" class="rt-nokta__hale"/><circle r="11"/><text y="4.5">${i + 1}</text></g>`).join('')).join('')}
    </g>
  </svg>`;

export const rontgen = {
  render() {
    return `
      <section class="k-bolum rt" aria-labelledby="rt-baslik">
        <div class="k-kap">
          <div class="rt__bas">
            <h2 class="k-h2" id="rt-baslik" data-bol>Kontrol noktaları</h2>
            <p class="k-lead">Mercek sürüklendikçe altındaki katman görünür. Katman değişince başka bir bölümün kontrol noktaları açılır.</p>
          </div>
          <div class="rt__katmanlar" role="tablist" aria-label="Kontrol katmanı">
            ${KATMANLAR.map((k, i) => `<button type="button" role="tab" class="rt__katman" data-k="${k.id}" aria-selected="${i === 1}"><span>${esc(k.ad)}</span><b>${k.noktalar.length}</b></button>`).join('')}
          </div>
          <div class="rt__sahne">
            <div class="rt__cizim">
              <p class="rt__okuma" aria-hidden="true"><span data-arac></span></p>
              ${aracSvg()}
              <label class="rt__kaydir"><span class="sr-only">Merceği kaydır</span><input type="range" min="60" max="740" step="1" value="400" data-kaydir></label>
            </div>
            <article class="rt__kart" aria-live="polite"></article>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const svg = el.querySelector('.rt-svg');
    const mercek = svg.querySelector('.rt-mercek-rect');
    const kl = svg.querySelector('.rt-kenar__l');
    const kr = svg.querySelector('.rt-kenar__r');
    const tutamak = svg.querySelector('.rt-tutamak');
    const kaydir = el.querySelector('[data-kaydir]');
    const kart = el.querySelector('.rt__kart');
    const aracYazi = el.querySelector('[data-arac]');
    const sekmeler = [...el.querySelectorAll('.rt__katman')];
    const noktaEl = [...svg.querySelectorAll('.rt-nokta')];
    const W = 180;
    const s = { x: 400 };
    let katman = KATMANLAR[1];
    let bulunan = new Set();
    let aktif = -1;
    let tw = null;
    let basladi = false;

    const kartYaz = () => {
      const n = katman.noktalar[aktif];
      if (!n) {
        kart.innerHTML = `<p class="rt__kart-ust">${esc(katman.arac)}</p><h3 class="rt__kart-baslik">${esc(katman.ad)}</h3><p class="rt__kart-metin">Bu katmanda ${katman.noktalar.length} kontrol noktası var. Mercek üstünden geçtikçe işaretlenir.</p>`;
        return;
      }
      kart.innerHTML = `
        <p class="rt__kart-ust">${esc(katman.ad)} · ${aktif + 1}/${katman.noktalar.length}</p>
        <h3 class="rt__kart-baslik">${esc(n.ad)}</h3>
        <p class="rt__kart-metin">${esc(n.metin)}</p>
        <ul class="rt__noktalar">${katman.noktalar.map((x, i) => `<li><button type="button" data-git="${i}" class="${bulunan.has(i) ? 'is-bulundu' : ''}" aria-current="${i === aktif}">${i + 1}<span>${esc(x.ad)}</span></button></li>`).join('')}</ul>`;
      if (!reducedMotion) gsap.fromTo(kart.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.03, ease: 'power2.out', overwrite: true });
    };

    const ciz = () => {
      const x = Math.max(W / 2 - 40, Math.min(800 - W / 2 + 40, s.x));
      const sol = x - W / 2;
      mercek.setAttribute('x', sol);
      kl.setAttribute('x1', sol); kl.setAttribute('x2', sol);
      kr.setAttribute('x1', sol + W); kr.setAttribute('x2', sol + W);
      tutamak.setAttribute('transform', `translate(${x} 56)`);
      if (document.activeElement !== kaydir) kaydir.value = Math.round(x);
      // Mercek altındaki noktalar bulunur; merkeze en yakın bulunan nokta karta gelir.
      let en = -1;
      let enMesafe = Infinity;
      katman.noktalar.forEach((n, i) => {
        const m = Math.abs(n.x - x);
        if (m < W / 2) {
          if (!bulunan.has(i)) {
            bulunan.add(i);
            noktaEl.find((e) => e.dataset.k === katman.id && Number(e.dataset.i) === i)?.classList.add('is-bulundu');
          }
          if (m < enMesafe) { enMesafe = m; en = i; }
        }
      });
      noktaEl.forEach((g) => g.classList.toggle('is-aktif', g.dataset.k === katman.id && Number(g.dataset.i) === en));
      if (en !== -1 && en !== aktif) { aktif = en; kartYaz(); }
    };

    const katmanKur = (k) => {
      katman = k;
      bulunan = new Set();
      aktif = -1;
      svg.dataset.katman = k.id;
      aracYazi.textContent = k.arac;
      sekmeler.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === k.id)));
      noktaEl.forEach((g) => g.classList.remove('is-bulundu', 'is-aktif'));
      kartYaz();
    };

    const git = (x, sure = 0.7) => {
      tw?.kill();
      if (reducedMotion) { s.x = x; ciz(); return; }
      tw = gsap.to(s, { x, duration: sure, ease: 'power3.inOut', onUpdate: ciz });
    };
    const tara = () => {
      tw?.kill();
      if (reducedMotion) {
        katman.noktalar.forEach((n) => { s.x = n.x; ciz(); });
        s.x = katman.noktalar[0].x; aktif = -1; ciz();
        return;
      }
      tw = gsap.timeline()
        .to(s, { x: 60, duration: 0.5, ease: 'power2.inOut', onUpdate: ciz })
        .to(s, { x: 740, duration: 2.4, ease: 'power1.inOut', onUpdate: ciz })
        .to(s, { x: katman.noktalar[0].x, duration: 0.9, ease: 'power3.inOut', onUpdate: ciz, onComplete: () => { aktif = -1; ciz(); } });
    };

    // Sürükleme: yatay hareket merceği taşır, dikey kaydırma sayfada kalır (touch-action: pan-y).
    let surukle = false;
    const svgX = (e) => {
      const r = svg.getBoundingClientRect();
      return 16 + ((e.clientX - r.left) / r.width) * 768;
    };
    svg.addEventListener('pointerdown', (e) => {
      surukle = true;
      tw?.kill();
      svg.setPointerCapture?.(e.pointerId);
      git(svgX(e), 0.35);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!surukle) return;
      tw?.kill();
      s.x = svgX(e);
      ciz();
    });
    const birak = () => (surukle = false);
    svg.addEventListener('pointerup', birak);
    svg.addEventListener('pointercancel', birak);
    kaydir.addEventListener('input', () => { tw?.kill(); s.x = Number(kaydir.value); ciz(); });

    sekmeler.forEach((b) => b.addEventListener('click', () => {
      katmanKur(KATMANLAR.find((k) => k.id === b.dataset.k));
      tara();
    }));
    kart.addEventListener('click', (e) => {
      const b = e.target.closest('[data-git]');
      if (!b) return;
      git(katman.noktalar[Number(b.dataset.git)].x);
    });

    katmanKur(katman);
    ciz();
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || basladi) return;
      basladi = true;
      io.disconnect();
      tara();
    }, { threshold: 0.45 });
    io.observe(svg);
    return () => { io.disconnect(); tw?.kill(); };
  },
};
