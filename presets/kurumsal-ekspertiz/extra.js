// Sektör modülleri (kurumsal-ekspertiz, "Ölçüm föyü"):
// (1) hero: başlık + şasi fotoğrafının üstünde canlı "rapor föyü". Satırlar sırayla ölçülür, sonuç rozetleri düşer.
// (2) boyaHaritasi: açılmış araç şeması. Senaryo seç → ölçüm ucu panel panel gezer, her panel mikron değeri ve
//     renk koduyla dolar (orijinal / lokal / boyalı / değişen / plastik). Panele dokun → değer, anlamı, ölçek.
// (3) randevu: bugün açık mı + saatler + WhatsApp randevu hazırlayıcı (marka, yıl, alıcı/satıcı) + yaklaşınca harita.
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const tik = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const bugunTarih = () => new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// --- (1) Hero ----------------------------------------------------------------------------------
const RAPOR = [
  { ad: 'Boya kalınlığı', alt: '13 panel, mikron', sonuc: '2 panel boyalı', tur: 'uyari' },
  { ad: 'Şasi, podye, direkler', alt: 'Lift üstünde', sonuc: 'Temiz', tur: 'iyi' },
  { ad: 'OBD arıza taraması', alt: 'Motor, şanzıman, ABS, airbag', sonuc: '1 silinmiş kod', tur: 'uyari' },
  { ad: 'Motor ve mekanik', alt: 'Soğuk çalıştırma', sonuc: 'Temiz', tur: 'iyi' },
  { ad: 'Yürüyen aksam, fren', alt: 'Balata, disk, lastik', sonuc: 'Ön balata %30', tur: 'bilgi' },
  { ad: 'Dinamometre, yol testi', alt: 'Yük altında', sonuc: 'Temiz', tur: 'iyi' },
];

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
    return `
      <section class="k-hero ge-hero" aria-label="Giriş">
        <div class="k-kap ge-hero__ic">
          <div class="ge-hero__metin">
            <p class="k-hero__ust ge-etiket"><span class="ge-led ${st?.open ? 'is-acik' : ''}" aria-hidden="true"></span>${esc(h.ust || d.isletme.sektor)}</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="#/iletisim?konu=${encodeURIComponent('Ekspertiz randevusu')}" data-rota="iletisim?konu=${encodeURIComponent('Ekspertiz randevusu')}">${esc(h.birincil || 'Randevu alın')} ${ok}</a>
              <a class="k-btn k-btn--ikincil" href="#/${h.ikincilRota || 'hizmetler'}" data-rota="${h.ikincilRota || 'hizmetler'}">${esc(h.ikincil || 'Hizmetler')}</a>
            </div>
          </div>
          <div class="ge-hero__sahne">
            <figure class="ge-hero__foto" data-perde>
              <div class="ge-hero__foto-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div>
              <span class="ge-tarama" aria-hidden="true"></span>
              <span class="ge-nisan ge-nisan--1" aria-hidden="true"></span>
              <span class="ge-nisan ge-nisan--2" aria-hidden="true"></span>
            </figure>
            <article class="ge-rapor" aria-label="Örnek ekspertiz raporu">
              <header class="ge-rapor__bas">
                <div><p class="ge-rapor__tur">Ekspertiz raporu</p><p class="ge-rapor__no">Örnek · ${bugunTarih()}</p></div>
                <p class="ge-rapor__yuzde"><b data-yuzde>0</b>%</p>
              </header>
              <span class="ge-rapor__bar" aria-hidden="true"><i></i></span>
              <ol class="ge-rapor__liste">
                ${RAPOR.map((r) => `<li class="ge-satir"><span class="ge-satir__tik">${tik}</span><span class="ge-satir__ad">${esc(r.ad)}<small>${esc(r.alt)}</small></span><span class="ge-rozet ge-rozet--${r.tur}">${esc(r.sonuc)}</span></li>`).join('')}
              </ol>
              <p class="ge-rapor__alt"><span data-durum>Ölçülüyor</span><span>${esc(d.isletme.ad)}</span></p>
            </article>
          </div>
        </div>
        <div class="k-kap"><dl class="k-hero__bilgi ge-hero__bilgi">${bilgi.map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
      </section>`;
  },
  mount(el) {
    const satirlar = [...el.querySelectorAll('.ge-satir')];
    const bar = el.querySelector('.ge-rapor__bar i');
    const yuzde = el.querySelector('[data-yuzde]');
    const durum = el.querySelector('[data-durum]');
    const rapor = el.querySelector('.ge-rapor');
    const bitir = () => {
      durum.textContent = 'Rapor hazır';
      rapor.classList.add('is-hazir');
    };
    if (reducedMotion) {
      satirlar.forEach((s) => s.classList.add('is-bitti'));
      gsap.set(bar, { scaleX: 1 });
      yuzde.textContent = '100';
      bitir();
      return;
    }
    const o = { v: 0 };
    const tl = gsap.timeline({ delay: 1.2 });
    tl.from(rapor, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0);
    satirlar.forEach((s, i) => {
      const t = 0.7 + i * 0.42;
      tl.add(() => s.classList.add('is-olcum'), t);
      tl.add(() => { s.classList.remove('is-olcum'); s.classList.add('is-bitti'); }, t + 0.36);
      tl.fromTo(s.querySelector('.ge-rozet'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.4)', immediateRender: false }, t + 0.36);
    });
    const son = 0.7 + satirlar.length * 0.42;
    tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: son - 0.5, ease: 'none' }, 0.5);
    tl.to(o, { v: 100, duration: son - 0.5, ease: 'none', onUpdate: () => (yuzde.textContent = Math.round(o.v)) }, 0.5);
    tl.add(bitir, son);
    // Tarama çizgisi yalnızca hero görünürken koşsun.
    const foto = el.querySelector('.ge-hero__foto');
    const io = new IntersectionObserver(([e]) => foto.classList.toggle('is-calisiyor', e.isIntersecting));
    io.observe(foto);
  },
};

// --- (2) Boya haritası -------------------------------------------------------------------------
// Açılmış araç şeması, burun yukarıda. viewBox 340 x 560. Yan paneller dışarı katlanmış (rapor şeması gibi).
const PANELLER = [
  { id: 'onTampon', ad: 'Ön tampon', kisa: 'Ön tampon', x: 64, y: 14, w: 212, h: 38, r: 18, plastik: true },
  { id: 'kaput', ad: 'Motor kaputu', kisa: 'Kaput', x: 110, y: 58, w: 120, h: 120, r: 12 },
  { id: 'solOnCam', ad: 'Sol ön çamurluk', kisa: 'Sol ön çam.', x: 20, y: 58, w: 84, h: 112, r: 12 },
  { id: 'sagOnCam', ad: 'Sağ ön çamurluk', kisa: 'Sağ ön çam.', x: 236, y: 58, w: 84, h: 112, r: 12 },
  { id: 'solOnKapi', ad: 'Sol ön kapı', kisa: 'Sol ön kapı', x: 20, y: 176, w: 84, h: 116, r: 8 },
  { id: 'sagOnKapi', ad: 'Sağ ön kapı', kisa: 'Sağ ön kapı', x: 236, y: 176, w: 84, h: 116, r: 8 },
  { id: 'tavan', ad: 'Tavan', kisa: 'Tavan', x: 110, y: 224, w: 120, h: 154, r: 10 },
  { id: 'solArkaKapi', ad: 'Sol arka kapı', kisa: 'Sol arka kapı', x: 20, y: 298, w: 84, h: 104, r: 8 },
  { id: 'sagArkaKapi', ad: 'Sağ arka kapı', kisa: 'Sağ arka kapı', x: 236, y: 298, w: 84, h: 104, r: 8 },
  { id: 'solArkaCam', ad: 'Sol arka çamurluk', kisa: 'Sol arka çam.', x: 20, y: 408, w: 84, h: 96, r: 12 },
  { id: 'sagArkaCam', ad: 'Sağ arka çamurluk', kisa: 'Sağ arka çam.', x: 236, y: 408, w: 84, h: 96, r: 12 },
  { id: 'bagaj', ad: 'Bagaj kapağı', kisa: 'Bagaj', x: 110, y: 420, w: 120, h: 84, r: 12 },
  { id: 'arkaTampon', ad: 'Arka tampon', kisa: 'Arka tampon', x: 64, y: 510, w: 212, h: 36, r: 18, plastik: true },
];
// Ölçüm sırası: ölçüm ucu araç çevresinde döner gibi.
const SIRA = ['onTampon', 'kaput', 'sagOnCam', 'sagOnKapi', 'sagArkaKapi', 'sagArkaCam', 'arkaTampon', 'bagaj', 'solArkaCam', 'solArkaKapi', 'solOnKapi', 'solOnCam', 'tavan'];

const DURUM = {
  o: { ad: 'Orijinal', anlam: 'Fabrika boyası. Metal panellerde fabrika boyası kabaca 80-160 µm arasında ölçülür; noktalar arası fark küçüktür.' },
  l: { ad: 'Lokal boyalı', anlam: 'Parçanın yalnızca bir bölümü boyanmış; genelde çizik ya da küçük göçük onarımı. Aynı panelde ölçüm noktaları arasında fark çıkar.' },
  b: { ad: 'Boyalı', anlam: 'Parça komple boyanmış, değer fabrika seviyesinin belirgin üstünde. 400 µm üstü çoğu zaman altında macun olduğunu gösterir; ışıkla dalga aranır.' },
  d: { ad: 'Değişen', anlam: 'Parça sökülüp yenisi takılmış. Yeni parça fabrika boyalı gelebilir, bu yüzden cihaz tek başına yetmez: cıvata başı, conta ve kaynak noktalarından anlaşılır.' },
  p: { ad: 'Plastik', anlam: 'Plastik parçada boya kalınlık cihazı doğru ölçmez. Işık altında renk, parlaklık ve doku farkına; bağlantı tırnaklarına bakılır.' },
};

// Senaryolar: [panel id] → [durum, µm]. Yazılmayan metal paneller orijinal.
const SENARYOLAR = [
  {
    id: 'tertemiz', ad: '“Tertemiz” denilen',
    not: 'İlanda “hatasız” yazıyordu. Arka sol taraf boyalı çıktı; bagaj havuzuna lift üstünde ayrıca bakılır.',
    veri: { solArkaCam: ['b', 268], solArkaKapi: ['l', 176], bagaj: ['l', 192] },
  },
  {
    id: 'ondarbe', ad: 'Önden vurmuş',
    not: 'Kaput değişmiş, fabrika boyalı geldiği için değeri normal. Şasi uçları ve podye lift üstünde kontrol edilir.',
    veri: { kaput: ['d', 118], sagOnCam: ['b', 312], solOnCam: ['l', 198], onTampon: ['p', 0] },
  },
  {
    id: 'temiz', ad: 'Gerçekten temiz',
    not: 'Bütün metal panellerde fabrika değeri. Tamponlar ışık altında kontrol edildi, fark yok.',
    veri: {},
  },
];

const olcumUret = (senaryo) => {
  // Orijinal paneller için sabit, "gerçekçi" değerler (her yenilemede aynı).
  const taban = [104, 121, 98, 132, 117, 109, 126, 101, 138, 113, 119, 95, 128];
  const out = {};
  PANELLER.forEach((p, i) => {
    const v = senaryo.veri[p.id];
    out[p.id] = v ? { durum: v[0], um: v[1] } : p.plastik ? { durum: 'p', um: 0 } : { durum: 'o', um: taban[i] };
  });
  return out;
};

const aracSvg = () => `
  <svg class="bh-svg" viewBox="0 0 340 560" role="group" aria-label="Açılmış araç şeması, panellere dokunun">
    <defs>
      <pattern id="bh-tarali" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#e4e2ec"/><line x1="0" y1="0" x2="0" y2="7" stroke="#c9c5d8" stroke-width="3"/></pattern>
    </defs>
    <g class="bh-teker" aria-hidden="true">
      <rect x="4" y="84" width="11" height="62" rx="5"/><rect x="325" y="84" width="11" height="62" rx="5"/>
      <rect x="4" y="422" width="11" height="62" rx="5"/><rect x="325" y="422" width="11" height="62" rx="5"/>
    </g>
    <g class="bh-cam" aria-hidden="true">
      <path d="M118 186 H222 L228 218 H112 Z"/><path d="M112 384 H228 L222 414 H118 Z"/>
      <path d="M104 182 L96 196 L104 200 Z"/><path d="M236 182 L244 196 L236 200 Z"/>
    </g>
    ${PANELLER.map((p) => {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const yatay = p.h < 44;
      return `<g class="bh-p is-bos" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.ad)}">
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.r}"/>
        <text class="bh-p__ad" x="${cx}" y="${yatay ? cy - 1 : cy - 12}">${esc(p.kisa)}</text>
        <text class="bh-p__um" x="${cx}" y="${yatay ? cy + 12 : cy + 10}">–</text>
      </g>`;
    }).join('')}
    <g class="bh-uc" aria-hidden="true"><circle r="15"/><circle class="bh-uc__ic" r="4"/><path d="M-24 0 H-17 M17 0 H24 M0 -24 V-17 M0 17 V24"/></g>
  </svg>`;

export const boyaHaritasi = {
  render(d) {
    return `
      <section class="k-bolum bh" aria-labelledby="bh-baslik">
        <div class="k-kap">
          <div class="bh__bas">
            <p class="ge-etiket">Boya kalınlığı raporu</p>
            <h2 class="k-h2" id="bh-baslik" data-bol>Her panel ayrı ölçülür, her değer rapora yazılır.</h2>
            <p class="k-lead">Bir aracı seçin; ölçüm ucunun panel panel gezişini izleyin. Sonra istediğiniz parçaya dokunun, değerin ne anlama geldiğini görün.</p>
          </div>
          <div class="bh__ic">
            <div class="bh__sol">
              <div class="bh__cipler" role="group" aria-label="Örnek araç seçin">
                ${SENARYOLAR.map((s, i) => `<button type="button" class="bh__cip" data-s="${s.id}" aria-pressed="${i === 0}">${esc(s.ad)}</button>`).join('')}
              </div>
              <figure class="bh__cizim">
                <div class="bh__cizim-ust" aria-hidden="true"><span>Ön</span><span class="bh__okuma" data-okuma>Ölçüm bekleniyor</span></div>
                ${aracSvg()}
                <div class="bh__cizim-ust bh__cizim-ust--alt" aria-hidden="true"><span>Arka</span><span class="bh__birim">µm = mikron</span></div>
              </figure>
            </div>
            <div class="bh__sag">
              <ul class="bh__lejant" aria-label="Renk kodları">
                ${['o', 'l', 'b', 'd', 'p'].map((k) => `<li class="bh__lej bh__lej--${k}"><i></i><span>${DURUM[k].ad}</span><b data-say="${k}">0</b></li>`).join('')}
              </ul>
              <article class="bh__kart" aria-live="polite"></article>
              <div class="bh__olcek" aria-hidden="true">
                <div class="bh__olcek-bar"><span class="bh__olcek-uc" data-olcek></span></div>
                <div class="bh__olcek-rakam"><span>0</span><span>100</span><span>200</span><span>300</span><span>400+ µm</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const svg = el.querySelector('.bh-svg');
    const kart = el.querySelector('.bh__kart');
    const uc = el.querySelector('.bh-uc');
    const okuma = el.querySelector('[data-okuma]');
    const olcek = el.querySelector('[data-olcek]');
    const cipler = [...el.querySelectorAll('.bh__cip')];
    const gruplar = Object.fromEntries([...svg.querySelectorAll('.bh-p')].map((g) => [g.dataset.id, g]));
    let senaryo = SENARYOLAR[0];
    let olcum = olcumUret(senaryo);
    let secili = null;
    let tl = null;
    let basladi = false;

    const umYaz = (id) => {
      const o = olcum[id];
      return o.durum === 'p' ? 'plastik' : `${o.um} µm`;
    };
    const paneliBoya = (id) => {
      const g = gruplar[id];
      g.classList.remove('is-bos', 'is-o', 'is-l', 'is-b', 'is-d', 'is-p');
      g.classList.add(`is-${olcum[id].durum}`);
      g.querySelector('.bh-p__um').textContent = umYaz(id);
    };
    const sayilar = () => {
      const say = { o: 0, l: 0, b: 0, d: 0, p: 0 };
      Object.values(olcum).forEach((o) => say[o.durum]++);
      el.querySelectorAll('[data-say]').forEach((b) => {
        b.textContent = say[b.dataset.say];
        b.parentElement.classList.toggle('is-sifir', !say[b.dataset.say]);
      });
      return say;
    };
    const olcekKoy = (um) => {
      const x = Math.min(um, 420) / 420;
      gsap.to(olcek, { left: `${x * 100}%`, opacity: um ? 1 : 0, duration: 0.5, ease: 'power3.out' });
    };

    const ozetKart = () => {
      const say = sayilar();
      const sorunlu = Object.entries(olcum).filter(([, o]) => o.durum === 'l' || o.durum === 'b' || o.durum === 'd');
      const mesaj = `Merhaba ${d.isletme.ad}, almayı düşündüğüm bir araç için ekspertiz randevusu istiyorum. Marka/model/yıl: `;
      kart.innerHTML = `
        <p class="bh__kart-ust">Örnek araç</p>
        <h3 class="bh__kart-baslik">${esc(senaryo.ad)}</h3>
        <p class="bh__kart-ozet"><b>${say.o}</b> orijinal${say.l ? `, <b>${say.l}</b> lokal boyalı` : ''}${say.b ? `, <b>${say.b}</b> boyalı` : ''}${say.d ? `, <b>${say.d}</b> değişen` : ''}</p>
        <p class="bh__kart-not">${esc(senaryo.not)}</p>
        ${sorunlu.length ? `<ul class="bh__kart-liste">${sorunlu.map(([id, o]) => `<li><button type="button" data-ac="${id}"><i class="bh__nokta bh__nokta--${o.durum}"></i>${esc(PANELLER.find((p) => p.id === id).ad)}<b>${o.durum === 'p' ? 'plastik' : `${o.um} µm`}</b></button></li>`).join('')}</ul>` : ''}
        <a class="k-btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Aracımı ölçtürmek istiyorum</span></a>`;
      olcekKoy(0);
    };
    const panelKart = (id) => {
      const p = PANELLER.find((x) => x.id === id);
      const o = olcum[id];
      kart.innerHTML = `
        <p class="bh__kart-ust">Panel</p>
        <h3 class="bh__kart-baslik">${esc(p.ad)}</h3>
        <p class="bh__kart-deger"><span class="bh__nokta bh__nokta--${o.durum}"></span>${o.durum === 'p' ? 'Ölçülmez' : `${o.um}<small>µm</small>`}<em>${esc(DURUM[o.durum].ad)}</em></p>
        <p class="bh__kart-not">${esc(DURUM[o.durum].anlam)}</p>
        <button type="button" class="bh__geri">Araç özetine dön</button>`;
      olcekKoy(o.um);
    };
    const kartGoster = () => {
      if (secili) panelKart(secili);
      else ozetKart();
      Object.entries(gruplar).forEach(([id, g]) => g.classList.toggle('is-secili', id === secili));
      if (!reducedMotion) gsap.fromTo(kart.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.035, ease: 'power2.out', overwrite: true });
    };

    const merkez = (id) => {
      const p = PANELLER.find((x) => x.id === id);
      return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    };
    const tara = (hiz = 1) => {
      tl?.kill();
      secili = null;
      Object.values(gruplar).forEach((g) => {
        g.classList.remove('is-o', 'is-l', 'is-b', 'is-d', 'is-p', 'is-secili');
        g.classList.add('is-bos');
        g.querySelector('.bh-p__um').textContent = '–';
      });
      if (reducedMotion) {
        SIRA.forEach(paneliBoya);
        okuma.textContent = 'Ölçüm tamam';
        kartGoster();
        return;
      }
      el.classList.add('is-olcuyor');
      kart.classList.add('is-bekliyor');
      const adim = 0.2 * hiz;
      const ilk = merkez(SIRA[0]);
      tl = gsap.timeline({
        onComplete: () => {
          el.classList.remove('is-olcuyor');
          kart.classList.remove('is-bekliyor');
          okuma.textContent = 'Ölçüm tamam';
          gsap.to(uc, { opacity: 0, scale: 0.6, duration: 0.3, transformOrigin: 'center' });
          kartGoster();
        },
      });
      tl.set(uc, { x: ilk.x, y: ilk.y - 40, opacity: 0, scale: 1 })
        .to(uc, { y: ilk.y, opacity: 1, duration: 0.3, ease: 'power2.out' });
      SIRA.forEach((id, i) => {
        const m = merkez(id);
        if (i) tl.to(uc, { x: m.x, y: m.y, duration: adim, ease: 'power2.inOut' });
        tl.add(() => {
          paneliBoya(id);
          okuma.textContent = `${PANELLER.find((p) => p.id === id).kisa}: ${umYaz(id)}`;
        });
        tl.fromTo(gruplar[id].querySelector('rect'), { scale: 0.94 }, { scale: 1, duration: 0.3, ease: 'back.out(3)', svgOrigin: `${m.x} ${m.y}` }, '<');
        tl.to({}, { duration: adim * 0.35 });
      });
      sayilar();
    };

    cipler.forEach((c) =>
      c.addEventListener('click', () => {
        senaryo = SENARYOLAR.find((s) => s.id === c.dataset.s);
        olcum = olcumUret(senaryo);
        cipler.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        basladi = true;
        tara(0.55);
      })
    );
    const panelAc = (id) => {
      if (tl?.isActive()) {
        tl.progress(1);
      }
      secili = id;
      kartGoster();
    };
    Object.entries(gruplar).forEach(([id, g]) => {
      g.addEventListener('click', () => panelAc(id));
      g.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), panelAc(id)));
    });
    kart.addEventListener('click', (e) => {
      const ac = e.target.closest('[data-ac]');
      if (ac) panelAc(ac.dataset.ac);
      if (e.target.closest('.bh__geri')) {
        secili = null;
        kartGoster();
      }
    });

    // İlk durum: kart özeti hazır dursun, ölçüm görünür olunca başlasın.
    ozetKart();
    sayilar();
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || basladi) return;
      basladi = true;
      io.disconnect();
      tara(1);
    }, { threshold: 0.35 });
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
            <p class="ge-etiket ge-etiket--acik">Randevu ve konum</p>
            <h2 class="k-h2" id="rv-baslik" data-bol>Alıcı ve satıcıyla aynı saatte buluşalım.</h2>
            <div class="rv__durum ${st.open ? 'is-acik' : ''}">
              <span class="ge-led ${st.open ? 'is-acik' : ''}" aria-hidden="true"></span>
              <div><b>${esc(st.text)}</b><small>Bugün ${GUNLER[bugun]}${bugunSaat ? `, ${esc(bugunSaat.replace('-', ' – '))}` : ', kapalı'}</small></div>
            </div>
            <dl class="rv__saatler">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="rv__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn k-btn--kucuk" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--kucuk k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="rv__sag">
            <form class="rv__form" aria-label="WhatsApp randevu mesajı hazırla">
              <p class="rv__form-bas">Randevu mesajınız</p>
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
