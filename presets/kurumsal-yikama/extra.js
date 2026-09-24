// Sektör modülleri — "Sedef" yönü.
// parlat: hero; tozlu araç içi fotoğrafı. Açılışta bir silecek bir şerit temizler, kalanını ziyaretçi parmağıyla siler.
//         Temizlenen oran göstergede, bitince sedef ışıltısı geçer.
// kopuk:  hero altı kayan şerit (yalnızca CSS transform).
// planla: imza bölümü; aracın kuşbakışı çiziminde yerlere dokunarak yıkama planı → süre ve WhatsApp'a hazır mesaj.
// filo:   filo yıkama planlayıcı; araç sayısı, sıklık, gün ve saat → bu ayın takvimi.
// saat:   çalışma saatleri, canlı açık/kapalı, yol tarifi, yaklaşınca yüklenen harita.
import { esc, telHref, waHref, mapsHref, mapsEmbed, openStatus, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const etiket = (metin) => `<p class="sd-etiket"><span aria-hidden="true"><i></i><i></i><i></i></span>${esc(metin)}</p>`;

// Sabit tohumlu rastgele: kir her açılışta aynı görünsün.
function tohum(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Görününce bir kez çalıştır (ScrollTrigger "once" sayfa değişiminde sorun çıkarıyor; IO yeterli).
function gorununce(el, fn, esik = 0.25) {
  const io = new IntersectionObserver((e) => {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    if (el.isConnected) fn();
  }, { threshold: esik });
  io.observe(el);
}

// --- Hero: parmakla silinen kir ------------------------------------------------------------

export const parlat = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const ust = `${d.isletme.sektor}. ${tema.yer} ${yilEki(d.isletme.kurulus)} beri.`;
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bilgi = [['Kuruluş', String(d.isletme.kurulus)], st ? ['Bugün', st.text] : null, ['Hızlı dış yıkama', 'Yaklaşık 20 dk'], ['Telefon', d.iletisim.telefon]]
      .filter(Boolean)
      .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
      .join('');
    return `
      <section class="k-hero pr" aria-label="Giriş">
        <div class="pr__sedef" aria-hidden="true"></div>
        <div class="k-kap k-hero__ic">
          <div class="k-hero__metin">
            <p class="k-hero__ust">${esc(ust)}</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(h.birincil || 'Bize yazın')} ${ok}`)}
              ${rota(h.ikincilRota || 'hizmetler', esc(h.ikincil || 'Hizmetlerimiz'), 'k-btn k-btn--ikincil')}
            </div>
          </div>
          <figure class="k-hero__gorsel pr__kare">
            <div class="pr__ic">
              <img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high">
              <canvas class="pr__kir" aria-hidden="true"></canvas>
            </div>
            <span class="pr__isilti" aria-hidden="true"></span>
            <span class="pr__silecek" aria-hidden="true"><i></i></span>
            <div class="pr__hud" aria-hidden="true">
              <span class="pr__olcer">
                <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="pr__olcer-iz"/><circle cx="22" cy="22" r="18" class="pr__olcer-dolu" pathLength="100"/></svg>
                <b data-yuzde>0</b>
              </span>
              <span class="pr__durum" data-durum>tozlu</span>
            </div>
            <button type="button" class="pr__yeniden" hidden>Yeniden tozlandır</button>
            <figcaption class="pr__not"><span class="pr__parmak" aria-hidden="true"></span><span data-not>Tozlu fotoğrafı parmağınızla silin</span></figcaption>
          </figure>
        </div>
        <div class="k-kap"><dl class="k-hero__bilgi">${bilgi}</dl></div>
      </section>`;
  },
  mount(el) {
    const kare = el.querySelector('.pr__kare');
    const img = kare.querySelector('img');
    const cv = kare.querySelector('canvas');
    const c = cv.getContext('2d');
    const silecek = kare.querySelector('.pr__silecek');
    const yuzdeEl = kare.querySelector('[data-yuzde]');
    const durumEl = kare.querySelector('[data-durum]');
    const notEl = kare.querySelector('[data-not]');
    const dolu = kare.querySelector('.pr__olcer-dolu');
    const yeniden = kare.querySelector('.pr__yeniden');
    const GX = 26, GY = 26;
    const izgara = new Uint8Array(GX * GY);
    let W = 0, H = 0, R = 26, isaretli = 0, bitti = false, hazir = false, sonGenislik = 0;
    let gosterilen = 0;

    function kirle() {
      const r = kare.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return false;
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.max(20, Math.min(W, H) * 0.075);
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      // Rengi çek, toprak tonuna boğ, üstüne toz tülü.
      c.globalCompositeOperation = 'saturation'; c.fillStyle = 'rgb(128 128 128 / .8)'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'multiply'; c.fillStyle = '#b8a384'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgb(196 178 150 / .42)'; c.fillRect(0, 0, W, H);
      const rnd = tohum(11);
      for (let i = 0; i < 60; i++) {
        const x = rnd() * W, y = rnd() * H, rr = 12 + rnd() * Math.min(W, H) * 0.16;
        const g = c.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, `rgb(112 92 66 / ${0.18 + rnd() * 0.28})`);
        g.addColorStop(1, 'rgb(112 92 66 / 0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
      }
      // Kuruyan su damlası izleri: açık halkalar.
      for (let i = 0; i < 90; i++) {
        const x = rnd() * W, y = rnd() * H, rr = 2 + rnd() * 7;
        c.strokeStyle = `rgb(235 222 200 / ${0.25 + rnd() * 0.3})`; c.lineWidth = 0.8 + rnd();
        c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.stroke();
      }
      for (let i = 0; i < 420; i++) {
        c.fillStyle = `rgb(64 50 36 / ${0.25 + rnd() * 0.45})`;
        c.beginPath(); c.arc(rnd() * W, rnd() * H, 0.5 + rnd() * 1.8, 0, Math.PI * 2); c.fill();
      }
      // Akıntı izleri.
      for (let i = 0; i < 26; i++) {
        const x = rnd() * W, y = rnd() * H * 0.6, l = 40 + rnd() * H * 0.4, w = 2 + rnd() * 5;
        const g = c.createLinearGradient(0, y, 0, y + l);
        g.addColorStop(0, 'rgb(92 74 54 / .38)'); g.addColorStop(1, 'rgb(92 74 54 / 0)');
        c.fillStyle = g; c.fillRect(x, y, w, l);
      }
      izgara.fill(0); isaretli = 0; bitti = false; gosterilen = 0;
      cv.style.opacity = 1;
      kare.classList.remove('is-temiz');
      yeniden.hidden = true;
      notEl.textContent = 'Tozlu fotoğrafı parmağınızla silin';
      goster(0);
      sonGenislik = W;
      return true;
    }

    function isaretle(x, y, rr) {
      const cw = W / GX, ch = H / GY;
      const x0 = Math.max(0, Math.floor((x - rr) / cw)), x1 = Math.min(GX - 1, Math.floor((x + rr) / cw));
      const y0 = Math.max(0, Math.floor((y - rr) / ch)), y1 = Math.min(GY - 1, Math.floor((y + rr) / ch));
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
        const cx = (i + 0.5) * cw - x, cy = (j + 0.5) * ch - y;
        if (cx * cx + cy * cy <= rr * rr && !izgara[j * GX + i]) { izgara[j * GX + i] = 1; isaretli++; }
      }
    }

    function goster(oran) {
      const p = Math.round(oran * 100);
      if (p === gosterilen && oran) return;
      gosterilen = p;
      yuzdeEl.textContent = p;
      dolu.style.strokeDasharray = `${p} 100`;
      durumEl.textContent = p >= 88 ? 'ışıl ışıl' : p >= 45 ? 'parlıyor' : p > 4 ? 'siliniyor' : 'tozlu';
    }

    function ilerle() {
      const oran = isaretli / izgara.length;
      goster(oran);
      if (!bitti && oran >= 0.86) tamamla();
    }

    function tamamla() {
      bitti = true;
      goster(1);
      notEl.textContent = 'Teslimde de böyle görürsünüz';
      kare.classList.add('is-temiz');
      if (reducedMotion) { cv.style.opacity = 0; yeniden.hidden = false; return; }
      gsap.to(cv, { opacity: 0, duration: 0.7, ease: 'power2.out' });
      gsap.fromTo(kare.querySelector('.pr__isilti'), { xPercent: -120, opacity: 1 }, { xPercent: 120, duration: 1.3, ease: 'power2.inOut', delay: 0.15 });
      gsap.delayedCall(1.2, () => (yeniden.hidden = false));
    }

    // Parmak: yuvarlak, kenarı yumuşak fırça.
    function surt(x0, y0, x1, y1) {
      c.globalCompositeOperation = 'destination-out';
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
      c.strokeStyle = 'rgb(0 0 0 / .35)'; c.lineWidth = R * 2.5; c.stroke();
      c.strokeStyle = '#000'; c.lineWidth = R * 1.8; c.stroke();
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (R * 0.5)));
      for (let k = 0; k <= n; k++) isaretle(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, R * 1.05);
    }

    let son = null;
    const konum = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      if (bitti || !hazir) return;
      gsap.killTweensOf(silecekTur);
      silecek.style.opacity = 0;
      cv.setPointerCapture(e.pointerId);
      son = konum(e);
      surt(...son, ...son);
      kare.classList.add('is-dokundu');
      ilerle();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!son || bitti) return;
      const p = konum(e);
      surt(...son, ...p);
      son = p;
      ilerle();
    });
    const birak = () => (son = null);
    cv.addEventListener('pointerup', birak);
    cv.addEventListener('pointercancel', birak);
    yeniden.addEventListener('click', () => { kirle(); cv.style.opacity = 1; });

    // Silecek: düz lastik; bir önceki konumdan şimdikine dörtgen siler.
    const silecekTur = { t: 0 };
    let onceki = null;
    function bicak(t) {
      const x = -0.08 * W + t * 1.16 * W;
      const y = H * (0.34 + Math.sin(t * Math.PI) * 0.1);
      const L = H * 0.3;
      const a = Math.cos(t * Math.PI) * 0.18; // bıçağın hafif eğimi
      return { x, y, L, a, u: [Math.sin(a) * L / 2, -Math.cos(a) * L / 2] };
    }
    function silecekAdim() {
      const b = bicak(silecekTur.t);
      silecek.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.a}rad)`;
      silecek.style.setProperty('--L', `${b.L}px`);
      if (onceki) {
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000';
        c.beginPath();
        c.moveTo(onceki.x + onceki.u[0], onceki.y + onceki.u[1]);
        c.lineTo(b.x + b.u[0], b.y + b.u[1]);
        c.lineTo(b.x - b.u[0], b.y - b.u[1]);
        c.lineTo(onceki.x - onceki.u[0], onceki.y - onceki.u[1]);
        c.closePath(); c.fill();
        for (let k = -3; k <= 3; k++) isaretle(b.x + (b.u[0] * k) / 3, b.y + (b.u[1] * k) / 3, b.L / 6);
        ilerle();
      }
      onceki = b;
    }

    // Perde: fotoğraf ve kir katmanı birlikte açılır (motorun data-perde'si yalnızca img'yi ölçekler, kir kayardı).
    if (!reducedMotion) {
      gsap.fromTo(kare, { clipPath: 'inset(0% 0% 100% 0% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 32px)', duration: 1.1, ease: 'power3.inOut', delay: 0.2, clearProps: 'clipPath' });
      gsap.fromTo(kare.querySelector('.pr__ic'), { scale: 1.14 }, { scale: 1, duration: 1.4, ease: 'power3.out', delay: 0.2 });
    }

    const baslat = () => {
      if (!kirle()) return;
      hazir = true;
      kare.classList.add('is-hazir');
      if (reducedMotion) return;
      onceki = null;
      gsap.timeline({ delay: 1.15 })
        .set(silecek, { opacity: 1 })
        .fromTo(silecekTur, { t: 0 }, { t: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: silecekAdim })
        .to(silecek, { opacity: 0, duration: 0.25 })
        .add(() => kare.classList.add('is-ipucu'));
    };
    (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => new Promise((r) => img.addEventListener('load', r, { once: true }))))
      .then(baslat);

    const ro = new ResizeObserver(() => {
      if (!hazir) return;
      const w = kare.getBoundingClientRect().width;
      if (Math.abs(w - sonGenislik) > 2) kirle();
    });
    ro.observe(kare);
    return () => ro.disconnect();
  },
};

// --- Kayan şerit ----------------------------------------------------------------------------

const SERIT = ['Köpüklü yıkama', 'Koltuk yıkama', 'Tavan', 'Motor yıkama', 'Pasta', 'Cila', 'Jant', 'Bagaj', 'Torpido', 'Filo yıkama'];
export const kopuk = {
  render() {
    const grup = SERIT.map((a) => `<span>${esc(a)}</span>`).join('');
    return `
      <div class="kp" aria-label="Yaptığımız işler: ${esc(SERIT.join(', '))}">
        <div class="kp__akis" aria-hidden="true">${grup}${grup}</div>
      </div>`;
  },
};

// --- İmza: aracın üstünden yıkama planı ------------------------------------------------------

// hizmet: d.hizmetler sırası; dk: süre hesabı için; bolge: çizimde yanan yerler.
const ISLER = [
  { id: 'dis', ad: 'Dış kir, çamur', hizmet: 6, dk: 20, bolge: ['kaporta', 'cam'] },
  { id: 'jant', ad: 'Jantta fren tozu', hizmet: 5, dk: 30, bolge: ['jant'] },
  { id: 'ic', ad: 'Torpido, konsol', hizmet: 0, dk: 210, bolge: ['konsol', 'kaporta', 'cam'] },
  { id: 'koltuk', ad: 'Koltukta leke, koku', hizmet: 1, gun: true, bolge: ['koltuk'] },
  { id: 'tavan', ad: 'Tavan, halı, bagaj', hizmet: 2, gun: true, bolge: ['taban', 'bagaj'] },
  { id: 'motor', ad: 'Motor bölmesi', hizmet: 3, dk: 45, bolge: ['motor'] },
  { id: 'pasta', ad: 'Matlık, kılcal çizik', hizmet: 4, birGun: true, bolge: ['cila'] },
];
const BOLGE_IS = { kaporta: 'dis', cam: 'dis', jant: 'jant', konsol: 'ic', koltuk: 'koltuk', taban: 'tavan', bagaj: 'tavan', motor: 'motor', cila: 'pasta' };
const ARACLAR = ['Otomobil', 'SUV', 'Hafif ticari'];

const aracSvg = `
  <svg class="pl__svg" viewBox="0 0 470 250" role="group" aria-label="Aracın kuşbakışı çizimi; yerlere dokunarak seçin">
    <defs>
      <linearGradient id="pl-sedef" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff9cc4"/><stop offset=".35" stop-color="#c9b6ff"/><stop offset=".7" stop-color="#9fe6ff"/><stop offset="1" stop-color="#ffe7a8"/>
      </linearGradient>
      <clipPath id="pl-govde"><path d="M78 36 C44 38 30 72 30 125 C30 178 44 212 78 214 L378 214 C420 212 440 178 440 125 C440 72 420 38 378 36 Z"/></clipPath>
    </defs>
    <g class="pl__zon" data-zon="jant" tabindex="0" role="button" aria-label="Jantlar">
      <rect x="92" y="18" width="62" height="26" rx="10"/><rect x="92" y="206" width="62" height="26" rx="10"/>
      <rect x="326" y="18" width="62" height="26" rx="10"/><rect x="326" y="206" width="62" height="26" rx="10"/>
    </g>
    <path class="pl__zon pl__govde" data-zon="kaporta" tabindex="0" role="button" aria-label="Kaporta" d="M78 36 C44 38 30 72 30 125 C30 178 44 212 78 214 L378 214 C420 212 440 178 440 125 C440 72 420 38 378 36 Z"/>
    <path class="pl__cila" d="M78 36 C44 38 30 72 30 125 C30 178 44 212 78 214 L378 214 C420 212 440 178 440 125 C440 72 420 38 378 36 Z" fill="url(#pl-sedef)"/>
    <g clip-path="url(#pl-govde)">
      <path class="pl__zon" data-zon="motor" tabindex="0" role="button" aria-label="Motor bölmesi" d="M338 42 L380 40 C418 44 434 76 434 125 C434 174 418 206 380 210 L338 208 C350 170 350 80 338 42 Z"/>
      <path class="pl__zon" data-zon="bagaj" tabindex="0" role="button" aria-label="Bagaj" d="M36 125 C36 76 50 46 80 42 L120 44 C112 80 112 170 120 206 L80 208 C50 204 36 174 36 125 Z"/>
    </g>
    <g class="pl__zon" data-zon="cam" tabindex="0" role="button" aria-label="Camlar">
      <path d="M298 60 L330 50 C342 86 342 164 330 200 L298 190 C305 156 305 94 298 60 Z"/>
      <path d="M126 62 L150 58 C145 96 145 154 150 192 L126 188 C121 154 121 96 126 62 Z"/>
      <path d="M156 46 L292 46 L286 56 L162 56 Z"/><path d="M156 204 L292 204 L286 194 L162 194 Z"/>
    </g>
    <rect class="pl__zon" data-zon="taban" tabindex="0" role="button" aria-label="Tavan ve taban" x="156" y="60" width="138" height="130" rx="16"/>
    <g class="pl__zon" data-zon="koltuk" tabindex="0" role="button" aria-label="Koltuklar">
      <rect x="236" y="70" width="46" height="44" rx="12"/><rect x="236" y="136" width="46" height="44" rx="12"/>
      <rect x="164" y="70" width="44" height="110" rx="14"/>
    </g>
    <path class="pl__zon" data-zon="konsol" tabindex="0" role="button" aria-label="Torpido ve konsol" d="M286 64 L296 64 L296 186 L286 186 Z M236 118 L286 118 L286 132 L236 132 Z"/>
    <g class="pl__suslu" aria-hidden="true">
      <path d="M404 54 C420 60 428 70 430 84" /><path d="M404 196 C420 190 428 180 430 166" />
      <path d="M40 70 C36 80 34 90 34 100" /><path d="M40 180 C36 170 34 160 34 150" />
      <path d="M292 40 L306 28 L318 32 L306 44 Z" /><path d="M292 210 L306 222 L318 218 L306 206 Z" />
    </g>
    <g class="pl__damla" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<circle r="${2 + (i % 3)}" cx="${60 + ((i * 41) % 360)}" cy="${60 + ((i * 67) % 140)}" style="--i:${i}"/>`).join('')}</g>
  </svg>`;

function sureMetni(secili) {
  if (!secili.length) return ['—', 'Bir yer seçin'];
  if (secili.some((x) => x.birGun)) return ['1 gün', 'Pasta-cila bir gün sürer; aracı sabah bırakın.'];
  if (secili.some((x) => x.gun)) return ['Aynı gün', 'Koltuk ve halılar kurumaya bırakılır, akşam teslim.'];
  const ic = secili.some((x) => x.id === 'ic');
  const dk = secili.reduce((t, x) => t + (ic && x.id === 'dis' ? 0 : x.dk || 0), 0);
  if (dk < 60) return [`${dk} dk`, 'Beklerken çayınızı için.'];
  const s = Math.round(dk / 30) / 2;
  return [`${String(s).replace('.', ',')} saat`, 'Aracı bırakıp işinize bakabilirsiniz.'];
}

export const planla = {
  render(d) {
    if (!d.hizmetler?.length) return '';
    return `
      <section class="k-bolum pl" aria-labelledby="pl-baslik">
        <div class="k-kap">
          <div class="pl__bas">
            ${etiket('Yıkama planı')}
            <h2 class="k-h2" id="pl-baslik" data-bol>Aracın nereye ihtiyacı var? Üstüne dokunun.</h2>
            <p class="k-lead">Kaporta, jant, koltuk, tavan, motor… Temizlenmesini istediğiniz yerleri seçin; ne kadar süreceğini söyleyelim, planı tek dokunuşla bize yazın.</p>
          </div>
          <div class="pl__ic">
            <div class="pl__sahne">
              <div class="pl__arac-tip" role="radiogroup" aria-label="Araç tipi">
                ${ARACLAR.map((a, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-tip="${esc(a)}">${esc(a)}</button>`).join('')}
              </div>
              <div class="pl__cizim">${aracSvg}<p class="pl__ipucu" aria-hidden="true">Çizimde bir yere dokunun</p></div>
              <fieldset class="pl__isler">
                <legend class="k-gizli">Ne var?</legend>
                ${ISLER.map((x) => `<label data-is="${x.id}"><input type="checkbox" value="${x.id}"><span>${esc(x.ad)}</span></label>`).join('')}
              </fieldset>
            </div>
            <aside class="pl__kart" aria-live="polite">
              <p class="pl__kart-ust">Planınız</p>
              <div class="pl__sure"><b data-o="sure">—</b><span data-o="sure-not"></span></div>
              <ol class="pl__liste" data-o="liste"></ol>
              <a class="k-btn pl__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu planla yazın</span></a>
              <p class="pl__not">Fiyatı aracı gördükten sonra, işe başlamadan söyleriz. ${esc(d.garanti || '')}</p>
            </aside>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const kutular = [...el.querySelectorAll('.pl__isler input')];
    const zonlar = [...el.querySelectorAll('[data-zon]')];
    const svg = el.querySelector('.pl__svg');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const gonder = el.querySelector('.pl__gonder');
    const tipler = [...el.querySelectorAll('[data-tip]')];
    let tip = ARACLAR[0];

    const guncelle = (yeni) => {
      const secili = ISLER.filter((x) => kutular.find((k) => k.value === x.id).checked);
      const yanan = new Set(secili.flatMap((x) => x.bolge));
      zonlar.forEach((z) => z.classList.toggle('is-secili', yanan.has(z.dataset.zon)));
      svg.classList.toggle('is-cila', yanan.has('cila'));
      el.classList.toggle('is-bos', !secili.length);
      const [sure, not] = sureMetni(secili);
      o('sure').textContent = sure;
      o('sure-not').textContent = not;
      const ic = secili.some((x) => x.id === 'ic');
      o('liste').innerHTML = secili
        .map((x) => {
          const h = d.hizmetler[x.hizmet];
          const dahil = ic && x.id === 'dis';
          return `<li class="${dahil ? 'is-dahil' : ''}${yeni === x.id ? ' is-yeni' : ''}"><span>${esc(h?.baslik || x.ad)}</span><em>${dahil ? 'detaylıya dahil' : esc(h?.sure || '')}</em></li>`;
        })
        .join('') || '<li class="is-bos"><span>Henüz bir şey seçmediniz</span></li>';
      const mesaj = [
        `Merhaba ${d.isletme.ad}, aracım için yıkama planı:`,
        `Araç: ${tip}`,
        ...secili.map((x) => `- ${d.hizmetler[x.hizmet]?.baslik || x.ad}`),
        `Tahmini süre: ${sure}`,
        'Ne zaman getirebilirim?',
      ].join('\n');
      gonder.href = waHref(d, mesaj);
      gonder.classList.toggle('is-pasif', !secili.length);
      if (yeni && !reducedMotion) {
        const li = o('liste').querySelector('.is-yeni');
        if (li) gsap.fromTo(li, { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
        gsap.fromTo(o('sure'), { scale: 0.92 }, { scale: 1, duration: 0.45, ease: 'back.out(2.5)' });
      }
    };

    const degistir = (id, zorla) => {
      const k = kutular.find((x) => x.value === id);
      if (!k) return;
      k.checked = zorla ?? !k.checked;
      guncelle(k.checked ? id : null);
    };
    kutular.forEach((k) => k.addEventListener('change', () => guncelle(k.checked ? k.value : null)));
    zonlar.forEach((z) => {
      const tik = () => { degistir(BOLGE_IS[z.dataset.zon]); el.classList.add('is-dokundu'); };
      z.addEventListener('click', tik);
      z.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tik(); } });
    });
    tipler.forEach((b) => b.addEventListener('click', () => {
      tip = b.dataset.tip;
      tipler.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      guncelle();
    }));

    guncelle();
    if (reducedMotion) { degistir('dis', true); degistir('jant', true); return; }
    // Kaydırınca çizim oturur, ardından iki iş kendiliğinden işaretlenir.
    const parcalar = svg.querySelectorAll('.pl__govde, [data-zon] rect, [data-zon] path, path[data-zon], rect[data-zon]');
    gsap.set(parcalar, { opacity: 0 });
    gorununce(svg, () => gsap.timeline()
      .fromTo(svg, { x: -60 }, { x: 0, duration: 1.1, ease: 'power3.out' })
      .to(parcalar, { opacity: 1, duration: 0.4, stagger: 0.03, ease: 'power1.out' }, 0.1)
      .add(() => degistir('dis', true), '+=0.1')
      .add(() => degistir('jant', true), '+=0.45'));
  },
};

// --- Filo planlayıcı -----------------------------------------------------------------------

const SIKLIK = [['hafta', 'Her hafta'], ['iki', 'İki haftada bir'], ['ay', 'Ayda bir']];
const GUN_KISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const SAATLER = ['09:00', '13:00', '17:00'];

export const filo = {
  render(d) {
    const ay = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    return `
      <section class="k-bolum fl" aria-labelledby="fl-baslik">
        <div class="k-kap">
          <div class="fl__bas">
            ${etiket('Filo planı')}
            <h2 class="k-h2" id="fl-baslik" data-bol>Araçlarınız sıraya girmesin. Günü birlikte koyalım.</h2>
            <p class="k-lead">Kaç aracınız var, ne sıklıkla yıkansın, hangi gün ve saatte? Seçin, bu ayın planını görün; beğenirseniz planı bize gönderin, teklifimizi yazılı verelim.</p>
          </div>
          <div class="fl__ic">
            <form class="fl__ayar" onsubmit="return false">
              <label class="fl__adet">
                <span class="fl__ad">Araç sayısı</span>
                <span class="fl__adet-deger"><b data-o="adet">6</b> araç</span>
                <input type="range" name="adet" min="1" max="40" value="6" aria-label="Araç sayısı">
              </label>
              <div class="fl__grup" role="radiogroup" aria-label="Sıklık">
                <span class="fl__ad">Sıklık</span>
                <div class="fl__secim">${SIKLIK.map(([v, a], i) => `<button type="button" role="radio" data-siklik="${v}" aria-checked="${i === 0}">${a}</button>`).join('')}</div>
              </div>
              <div class="fl__grup" role="radiogroup" aria-label="Gün">
                <span class="fl__ad">Gün</span>
                <div class="fl__secim fl__secim--gun">${GUN_KISA.map((g, i) => `<button type="button" role="radio" data-gun="${i}" aria-checked="${i === 1}">${g}</button>`).join('')}</div>
              </div>
              <div class="fl__grup" role="radiogroup" aria-label="Saat">
                <span class="fl__ad">Saat</span>
                <div class="fl__secim">${SAATLER.map((s, i) => `<button type="button" role="radio" data-saat="${s}" aria-checked="${i === 0}">${s}</button>`).join('')}</div>
              </div>
              <label class="fl__ic-temizlik"><input type="checkbox" name="ic"><span>Ayda bir de iç temizlik olsun</span></label>
            </form>
            <div class="fl__takvim">
              <div class="fl__takvim-bas"><p class="fl__ay">${esc(ay)}</p><p class="fl__ozet" data-o="ozet"></p></div>
              <div class="fl__gunler" aria-hidden="true">${GUN_KISA.map((g) => `<span>${g}</span>`).join('')}</div>
              <ol class="fl__izgara" data-o="izgara"></ol>
              <dl class="fl__rakam">
                <div><dt>Bu ay yıkama günü</dt><dd data-o="gun">0</dd></div>
                <div><dt>Bu ay araç yıkaması</dt><dd data-o="toplam">0</dd></div>
              </dl>
              <div class="k-butonlar">
                <a class="k-btn fl__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Planı gönderin</span></a>
                <a class="k-btn k-btn--ikincil" href="#/iletisim?konu=Filo%20y%C4%B1kama" data-rota="iletisim?konu=Filo%20y%C4%B1kama">Formla yazın</a>
              </div>
              <p class="fl__not">Hızlı dış yıkama araç başı yaklaşık 20 dakika. Kesin saat ve teklifimizi araç tipine göre yazılı veririz.</p>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const adet = el.querySelector('input[name=adet]');
    const icK = el.querySelector('input[name=ic]');
    const durum = { siklik: 'hafta', gun: 1, saat: SAATLER[0] };
    const bugun = new Date();
    const Y = bugun.getFullYear(), M = bugun.getMonth();
    const gunSayisi = new Date(Y, M + 1, 0).getDate();
    const bosluk = (new Date(Y, M, 1).getDay() + 6) % 7;
    let ilk = true;

    el.querySelectorAll('[role=radiogroup]').forEach((g) => {
      const btnler = [...g.querySelectorAll('button')];
      btnler.forEach((b) => b.addEventListener('click', () => {
        btnler.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        if (b.dataset.siklik) durum.siklik = b.dataset.siklik;
        if (b.dataset.gun) durum.gun = Number(b.dataset.gun);
        if (b.dataset.saat) durum.saat = b.dataset.saat;
        ciz(true);
      }));
    });

    function ciz(animasyon) {
      const n = Number(adet.value);
      o('adet').textContent = n;
      adet.style.setProperty('--p', `${((n - 1) / 39) * 100}%`);
      const hedefGun = (durum.gun + 1) % 7; // Pzt=0 → getDay 1
      const gunler = [];
      for (let g = 1; g <= gunSayisi; g++) if (new Date(Y, M, g).getDay() === hedefGun) gunler.push(g);
      const yikama = durum.siklik === 'hafta' ? gunler : durum.siklik === 'iki' ? gunler.filter((_, i) => i % 2 === 0) : gunler.slice(0, 1);
      const icGun = icK.checked ? yikama[yikama.length - 1] : null;
      const hucre = [];
      for (let i = 0; i < bosluk; i++) hucre.push('<li class="is-bos" aria-hidden="true"></li>');
      for (let g = 1; g <= gunSayisi; g++) {
        const var_ = yikama.includes(g);
        const bugunMu = g === bugun.getDate();
        const kapali = !d.saatler?.[new Date(Y, M, g).getDay()];
        hucre.push(`<li class="${var_ ? 'is-yikama' : ''}${bugunMu ? ' is-bugun' : ''}${kapali ? ' is-kapali' : ''}${g === icGun ? ' is-ic' : ''}${g < bugun.getDate() ? ' is-gecmis' : ''}"><span>${g}</span>${var_ ? `<b>${n}</b>` : ''}</li>`);
      }
      o('izgara').innerHTML = hucre.join('');
      o('gun').textContent = yikama.length;
      o('toplam').textContent = (yikama.length * n).toLocaleString('tr-TR');
      const gunAd = GUNLER[hedefGun];
      const siklikAd = SIKLIK.find(([v]) => v === durum.siklik)[1].toLowerCase();
      o('ozet').textContent = `${siklikAd}, ${gunAd} ${durum.saat} · ${n} araç`;
      const mesaj = [
        `Merhaba ${d.isletme.ad}, şirket araçlarımız için filo yıkama planı:`,
        `Araç sayısı: ${n}`,
        `Sıklık: ${siklikAd}`,
        `Gün ve saat: ${gunAd} ${durum.saat}`,
        icK.checked ? 'Ayda bir iç temizlik de olsun.' : '',
        'Teklifinizi alabilir miyiz?',
      ].filter(Boolean).join('\n');
      el.querySelector('.fl__gonder').href = waHref(d, mesaj);
      if (animasyon && !reducedMotion) {
        gsap.fromTo(o('izgara').querySelectorAll('.is-yikama b'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(3)' });
      }
    }
    adet.addEventListener('input', () => ciz(false));
    adet.addEventListener('change', () => ciz(true));
    icK.addEventListener('change', () => ciz(true));
    ciz(false);
    if (!reducedMotion && ilk) {
      ilk = false;
      gorununce(o('izgara'), () => gsap.timeline()
        .from(o('izgara').children, { opacity: 0, y: 8, duration: 0.3, stagger: 0.012, ease: 'power1.out' })
        .add(() => ciz(true)));
    }
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
            ${etiket('Çalışma saatleri')}
            <h2 class="k-h2" id="st-baslik" data-bol>Haftanın yedi günü açığız.</h2>
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
