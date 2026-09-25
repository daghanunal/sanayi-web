// Sektör modülleri (kurumsal-ekspertiz, "Askı etiketi"):
// (1) hero: dev büyük harfli başlık + şasi fotoğrafına asılı sarı kontrol kartı. Kart iple sallanarak gelir,
//     satırlar kalemle tek tek işaretlenir, sonunda "kontrol edildi" mührü basılır. Altta kayan kontrol şeridi.
// (2) rontgen: yandan araç çizimi üstünde sürüklenen tarama merceği. Mercek altında seçilen katman (kaporta,
//     şasi, motor/OBD, yürüyen aksam) görünür; geçtiği kontrol noktaları bulunur ve kartta anlatılır.
// (3) randevu: bugün açık mı + saatler + WhatsApp randevu hazırlayıcı (alıcı/satıcı, marka, yıl) + yaklaşınca harita.
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bugunTarih = () => new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const randevuRota = `iletisim?konu=${encodeURIComponent('Ekspertiz randevusu')}`;

// Kart işaretleri: kalemle atılmış gibi (stroke çizimi).
const ISARET = {
  iyi: '<path d="M4 12.5l5 5L20 6"/>',
  uyari: '<path d="M12 4v10"/><path d="M12 19.2v.4"/>',
  bilgi: '<path d="M5 12h14"/>',
};

// --- (1) Hero ----------------------------------------------------------------------------------
const KART = [
  { ad: 'Boya kalınlığı', sonuc: '2 panel boyalı', tur: 'uyari' },
  { ad: 'Şasi ve podye', sonuc: 'Temiz', tur: 'iyi' },
  { ad: 'OBD tarama', sonuc: '1 silinmiş kod', tur: 'uyari' },
  { ad: 'Motor', sonuc: 'Temiz', tur: 'iyi' },
  { ad: 'Fren, aksam', sonuc: 'Balata %30', tur: 'bilgi' },
  { ad: 'Yol testi', sonuc: 'Temiz', tur: 'iyi' },
];
const SERIT = ['Boya kalınlığı', 'Şasi ve podye', 'OBD arıza taraması', 'Motor ve mekanik', 'Yürüyen aksam', 'Dinamometre', 'Yol testi', 'Fotoğraflı rapor'];

export const hero = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bilgi = [
      ['Kuruluş', `${yilEki(d.isletme.kurulus)} beri`],
      st ? ['Bugün', st.text] : null,
      ['Rapor', 'Aynı gün, basılı ve PDF'],
      ['Telefon', d.iletisim.telefon],
    ].filter(Boolean);
    const serit = SERIT.map((s) => `<span>${esc(s)}</span><i aria-hidden="true"></i>`).join('');
    return `
      <section class="k-hero et-hero" aria-label="Giriş">
        <div class="k-kap et-hero__ic">
          <div class="et-hero__bas">
            <p class="k-hero__ust et-etiket"><span class="et-led ${st?.open ? 'is-acik' : ''}" aria-hidden="true"></span>${esc(h.ust || d.isletme.sektor)}</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
          </div>
          <div class="et-hero__sahne">
            <figure class="et-hero__foto" data-perde>
              <div class="et-hero__foto-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div>
            </figure>
            <span class="et-cubuk" aria-hidden="true"></span>
            <div class="et-aski">
              <article class="et-kart" aria-label="Örnek ekspertiz kontrol kartı">
                <span class="et-ip" aria-hidden="true"></span>
                <span class="et-delik" aria-hidden="true"></span>
                <header class="et-kart__bas">
                  <p class="et-kart__tur">Ekspertiz</p>
                  <p class="et-kart__no">Kontrol kartı · ${bugunTarih()}</p>
                </header>
                <ol class="et-kart__liste">
                  ${KART.map((r) => `<li class="et-sat et-sat--${r.tur}"><span class="et-kutu"><svg viewBox="0 0 24 24" aria-hidden="true">${ISARET[r.tur]}</svg></span><span class="et-sat__ad">${esc(r.ad)}</span><span class="et-sat__sonuc">${esc(r.sonuc)}</span></li>`).join('')}
                </ol>
                <p class="et-kart__alt">${esc(d.isletme.ad)}</p>
                <span class="et-muhur" aria-hidden="true">Kontrol<br>edildi</span>
              </article>
            </div>
          </div>
          <div class="et-hero__alt">
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="#/${randevuRota}" data-rota="${randevuRota}">${esc(h.birincil || 'Randevu alın')} ${ok}</a>
              <a class="k-btn k-btn--ikincil" href="#/${h.ikincilRota || 'hizmetler'}" data-rota="${h.ikincilRota || 'hizmetler'}">${esc(h.ikincil || 'Hizmetler')}</a>
            </div>
          </div>
        </div>
        <div class="k-kap"><dl class="k-hero__bilgi et-hero__bilgi">${bilgi.map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
        <div class="et-serit" aria-hidden="true"><div class="et-serit__ic">${serit}${serit}</div></div>
      </section>`;
  },
  mount(el) {
    const kart = el.querySelector('.et-kart');
    const aski = el.querySelector('.et-aski');
    const satirlar = [...el.querySelectorAll('.et-sat')];
    const muhur = el.querySelector('.et-muhur');
    const serit = el.querySelector('.et-serit');
    const io = new IntersectionObserver(([e]) => {
      el.classList.toggle('is-gorunur', e.isIntersecting);
      if (sallanti) e.isIntersecting ? sallanti.resume() : sallanti.pause();
    });
    io.observe(el);
    let sallanti = null;
    if (reducedMotion) {
      satirlar.forEach((s) => s.classList.add('is-bitti'));
      muhur.classList.add('is-basildi');
      return;
    }
    // Kart ipiyle birlikte askıdan sallanarak gelir; satırlar sırayla işaretlenir, sonunda mühür.
    const tl = gsap.timeline({ delay: 0.55 });
    tl.fromTo(kart, { rotation: -38, y: -60, opacity: 0 }, { rotation: 0, y: 0, opacity: 1, duration: 2.1, ease: 'elastic.out(1, 0.32)' }, 0);
    satirlar.forEach((s, i) => tl.add(() => s.classList.add('is-bitti'), 0.9 + i * 0.26));
    const son = 0.9 + satirlar.length * 0.26 + 0.15;
    tl.fromTo(muhur, { scale: 2.6, opacity: 0, rotation: 6 }, { scale: 1, opacity: 1, rotation: -11, duration: 0.32, ease: 'power4.in', onComplete: () => muhur.classList.add('is-basildi') }, son);
    tl.fromTo(kart, { rotation: 0 }, { rotation: 2.6, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out', immediateRender: false }, son + 0.32);
    tl.add(() => {
      sallanti = gsap.fromTo(kart, { rotation: 0 }, { rotation: 1.8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      if (!el.classList.contains('is-gorunur')) sallanti.pause();
    });
    // Aşağı kaydırınca kart rüzgâr almış gibi hafifçe geriye yatar.
    gsap.to(aski, { rotation: -7, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    if (serit) serit.classList.add('is-hazir');
    ScrollTrigger.refresh();
  },
};

// --- (2) Röntgen: tarama merceği ----------------------------------------------------------------
// viewBox 800 x 300, burun solda. Zemin y=268, ön teker (185,228), arka teker (618,228).
const GOVDE = 'M36 222 L34 190 C34 176 44 168 62 165 L236 150 C262 136 300 106 334 94 C350 88 372 84 396 84 L520 84 C548 84 566 92 588 106 L640 140 L738 148 C756 150 766 160 766 176 L764 220 C764 226 760 228 752 228 L670 228 A52 52 0 0 0 566 228 L237 228 A52 52 0 0 0 133 228 L46 228 C40 228 36 226 36 222 Z';
const CAMLAR = 'M268 146 C292 126 318 106 342 99 L438 97 L438 146 Z M452 97 L516 97 C540 97 556 104 574 116 L606 143 L452 146 Z';
const teker = (x) => `<circle cx="${x}" cy="228" r="40"/><circle cx="${x}" cy="228" r="24" class="rt-jant"/><circle cx="${x}" cy="228" r="5" class="rt-gobek"/>`;

const KATMANLAR = [
  {
    id: 'kaporta', ad: 'Kaporta ve boya', arac: 'Boya kalınlık cihazı, ışık',
    noktalar: [
      { x: 150, y: 160, ad: 'Motor kaputu', metin: 'Her panel birkaç noktadan ölçülür, değer mikron olarak rapora yazılır. Değişmiş kaput fabrika boyalı gelebilir; menteşe cıvatalarında söküm izi aranır.' },
      { x: 345, y: 186, ad: 'Ön kapı', metin: 'Kapı kenarı, fitil altı ve menteşeler kontrol edilir. Lokal boyada aynı panelin noktaları arasında fark çıkar.' },
      { x: 470, y: 88, ad: 'Tavan', metin: 'Tavanda boya ya da dikiş bozukluğu ağır hasarın izidir. Tavan ölçümü atlanmaz, cam fitilleri de incelenir.' },
      { x: 690, y: 170, ad: 'Arka çamurluk', metin: 'Macunlu onarımda değer belirgin yükselir. Işık altında dalga, renk ve parlaklık farkına bakılır.' },
    ],
  },
  {
    id: 'sasi', ad: 'Şasi', arac: 'Lift, el feneri',
    noktalar: [
      { x: 84, y: 205, ad: 'Ön şasi ucu', metin: 'Önden darbe almış araçta ilk bakılan yer. Çekme, kaynak ve ezilme izi lift üstünde aranır.' },
      { x: 300, y: 222, ad: 'Podye', metin: 'Araç lifte kaldırılır, podye boyunca el feneriyle bakılır. Kaynak dikişi, macun ve kabarma rapora geçer.' },
      { x: 445, y: 130, ad: 'Orta direk', metin: 'Direklerde kesme ya da kaynak izi ciddi hasarı gösterir. Kapı fitili aralanarak direk yüzeyi kontrol edilir.' },
      { x: 704, y: 196, ad: 'Bagaj havuzu', metin: 'Arkadan darbenin izi havuzda kalır. Stepne çıkarılır; havuz, arka panel ve şasi uçları incelenir.' },
    ],
  },
  {
    id: 'motor', ad: 'Motor ve OBD', arac: 'Arıza tespit cihazı',
    noktalar: [
      { x: 126, y: 190, ad: 'Motor', metin: 'Motor soğukken çalıştırılır. Üfleme, yağ kaçağı, antifriz durumu, kayış ve bağlantılar kontrol edilir.' },
      { x: 232, y: 196, ad: 'Şanzıman', metin: 'Vites geçişleri dinamometrede ve yolda denenir. Silinmiş şanzıman arızaları taramada ortaya çıkar.' },
      { x: 318, y: 196, ad: 'OBD soketi', metin: 'Motor, şanzıman, ABS, hava yastığı ve konfor modüllerinden kayıtlı ve silinmiş hata kodları okunur.' },
      { x: 92, y: 168, ad: 'Akü ve şarj', metin: 'Akü ve şarj gerilimi ölçülür. Pek çok elektronik arıza zayıf aküyle başlar; değer rapora yazılır.' },
    ],
  },
  {
    id: 'aksam', ad: 'Yürüyen aksam', arac: 'Lift, dinamometre',
    noktalar: [
      { x: 185, y: 228, ad: 'Ön fren', metin: 'Disk ve balata aşınması ölçülür, kalan ömrü yüzde olarak rapora yazılır.' },
      { x: 262, y: 244, ad: 'Rotil ve salıncak', metin: 'Lift üstünde boşluk, burç yırtığı ve aks körükleri tek tek kontrol edilir.' },
      { x: 618, y: 184, ad: 'Amortisör', metin: 'Sızıntı ve yağlanmaya bakılır. Yolda ses, yol tutuş ve savrulma gözlenir.' },
      { x: 618, y: 266, ad: 'Lastikler', metin: 'Dört lastiğin diş derinliği ayrı ölçülür, üretim tarihi okunur ve rapora yazılır.' },
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
            <p class="et-etiket et-etiket--acik">Lift, cihaz ve yol testi</p>
            <h2 class="k-h2" id="rt-baslik" data-bol>İlan fotoğrafının göstermediği yer.</h2>
            <p class="k-lead">Merceği aracın üstünde sürükleyin. Altında ne kontrol ettiğimizi görürsünüz; katmanı değiştirin, başka yere bakın.</p>
          </div>
          <div class="rt__katmanlar" role="tablist" aria-label="Kontrol katmanı">
            ${KATMANLAR.map((k, i) => `<button type="button" role="tab" class="rt__katman" data-k="${k.id}" aria-selected="${i === 1}"><span>${esc(k.ad)}</span><b>${k.noktalar.length}</b></button>`).join('')}
          </div>
          <div class="rt__sahne">
            <div class="rt__cizim">
              <p class="rt__okuma" aria-hidden="true"><span data-arac></span><span data-konum>Mercek</span></p>
              ${aracSvg()}
              <label class="rt__kaydir"><span class="sr-only">Merceği kaydır</span><input type="range" min="60" max="740" step="1" value="400" data-kaydir></label>
            </div>
            <article class="rt__kart" aria-live="polite"></article>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const svg = el.querySelector('.rt-svg');
    const mercek = svg.querySelector('.rt-mercek-rect');
    const kl = svg.querySelector('.rt-kenar__l');
    const kr = svg.querySelector('.rt-kenar__r');
    const tutamak = svg.querySelector('.rt-tutamak');
    const kaydir = el.querySelector('[data-kaydir]');
    const kart = el.querySelector('.rt__kart');
    const aracYazi = el.querySelector('[data-arac]');
    const konum = el.querySelector('[data-konum]');
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
        kart.innerHTML = `<p class="rt__kart-ust">${esc(katman.ad)}</p><h3 class="rt__kart-baslik">Merceği sürükleyin</h3><p class="rt__kart-metin">Bu katmanda ${katman.noktalar.length} kontrol noktası var. Mercek üstünden geçtikçe işaretlenir.</p>`;
        return;
      }
      const mesaj = `Merhaba ${d.isletme.ad}, almayı düşündüğüm bir araç için ekspertiz randevusu istiyorum.`;
      kart.innerHTML = `
        <p class="rt__kart-ust">${esc(katman.ad)} · ${aktif + 1}/${katman.noktalar.length}</p>
        <h3 class="rt__kart-baslik">${esc(n.ad)}</h3>
        <p class="rt__kart-metin">${esc(n.metin)}</p>
        <ul class="rt__noktalar">${katman.noktalar.map((x, i) => `<li><button type="button" data-git="${i}" class="${bulunan.has(i) ? 'is-bulundu' : ''}" aria-current="${i === aktif}">${i + 1}<span>${esc(x.ad)}</span></button></li>`).join('')}</ul>
        <a class="k-btn k-btn--kucuk rt__wa" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Aracımı getireyim</span></a>`;
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
      konum.textContent = `${Math.round((x / 800) * 100)}%`;
      // Mercek altındaki noktalar bulunur; merkeze en yakın bulunan nokta karta gelir.
      let en = -1;
      let enMesafe = Infinity;
      katman.noktalar.forEach((n, i) => {
        const m = Math.abs(n.x - x);
        if (m < W / 2) {
          if (!bulunan.has(i)) {
            bulunan.add(i);
            const g = noktaEl.find((e) => e.dataset.k === katman.id && Number(e.dataset.i) === i);
            g?.classList.add('is-bulundu');
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
        katman.noktalar.forEach((n, i) => { s.x = n.x; ciz(); });
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
      el.classList.add('is-surukledi');
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
    kaydir.addEventListener('input', () => { tw?.kill(); s.x = Number(kaydir.value); ciz(); el.classList.add('is-surukledi'); });

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
  },
};

// --- (3) Randevu: saatler + randevu hazırlayıcı + harita --------------------------------------
export const randevu = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    const bugunSaat = d.saatler[bugun];
    const markalar = d.markalar || [];
    return `
      <section class="k-bolum rv" aria-labelledby="rv-baslik">
        <div class="k-kap rv__ic">
          <div class="rv__sol">
            <p class="et-etiket">Randevu ve konum</p>
            <h2 class="k-h2" id="rv-baslik" data-bol>Alıcı ve satıcıyla aynı saatte buluşalım.</h2>
            <div class="rv__durum ${st.open ? 'is-acik' : ''}">
              <span class="et-led ${st.open ? 'is-acik' : ''}" aria-hidden="true"></span>
              <div><b>${esc(st.text)}</b><small>Bugün ${GUNLER[bugun]}${bugunSaat ? `, ${esc(bugunSaat.replace('-', ' – '))}` : ', kapalı'}</small></div>
            </div>
            <dl class="rv__saatler">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="rv__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn k-btn--kucuk rv__yol" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--kucuk k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="rv__sag">
            <form class="rv__form" aria-label="WhatsApp randevu mesajı hazırla">
              <span class="rv__delik" aria-hidden="true"></span>
              <p class="rv__form-bas">Randevu kartı</p>
              <fieldset class="rv__rol"><legend>Siz</legend>
                <label><input type="radio" name="rol" value="almayı düşündüğüm" checked><span>Alıcıyım</span></label>
                <label><input type="radio" name="rol" value="satacağım"><span>Satıcıyım</span></label>
                <label><input type="radio" name="rol" value="galerimize alacağımız"><span>Galeri</span></label>
              </fieldset>
              <div class="rv__iki">
                <label><span>Marka</span><select name="marka">${markalar.map((m) => `<option>${esc(m)}</option>`).join('')}<option>Diğer</option></select></label>
                <label><span>Model yılı</span><input name="yil" inputmode="numeric" maxlength="4" placeholder="2018"></label>
              </div>
              <label class="rv__gun"><span>Ne zaman</span><select name="gun"><option>Bugün</option><option>Yarın</option><option>Bu hafta içinde</option></select></label>
              <p class="rv__onizleme" data-onizleme></p>
              <a class="k-btn rv__gonder" href="#" target="_blank" rel="noopener" data-gonder>${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
            </form>
            <div class="rv__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const form = el.querySelector('.rv__form');
    const on = el.querySelector('[data-onizleme]');
    const gonder = el.querySelector('[data-gonder]');
    const yaz = () => {
      const f = new FormData(form);
      const yil = String(f.get('yil') || '').replace(/\D/g, '').slice(0, 4);
      const marka = f.get('marka') === 'Diğer' ? '' : `${f.get('marka')} `;
      const metin = `Merhaba ${d.isletme.ad}, ${f.get('rol')} ${yil ? `${yil} model ` : ''}${marka}araç için ${String(f.get('gun')).toLocaleLowerCase('tr-TR')} ekspertiz randevusu istiyorum. Uygun saatiniz var mı?`;
      on.textContent = metin;
      gonder.href = waHref(d, metin);
    };
    form.addEventListener('input', yaz);
    form.addEventListener('change', yaz);
    form.addEventListener('submit', (e) => e.preventDefault());
    yaz();

    const h = el.querySelector('.rv__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};
