// Sektör modülleri — "Karnauba" yönü.
// parlat: hero; kontrol lambası altında siyah kaput. Lamba gezdikçe kılcal çizikler halka halka parlar,
//         pasta pedi geçince ayna gibi kalır.
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

// --- Hero: kontrol lambası ------------------------------------------------------------------
// Siyah kaput tuvalde çizilir. Boyadaki binlerce kılcal çizik yalnızca lambaya dik (teğet) duruyorsa ışığı yakalar;
// bu yüzden lamba gezdikçe etrafında halka halka "hare" görünür. "Pasta-cila" düğmesi pedi panel üzerinde gezdirir,
// pedin geçtiği yerde çizikler ve mat tül kalkar, geriye tek bir keskin lamba yansıması kalır.

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
      <section class="lh" aria-label="Giriş">
        <div class="k-kap lh__ic">
          <div class="lh__metin">
            <p class="lh__ust">${esc(ust)}</p>
            <h1 class="k-h1 lh__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead lh__lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar lh__btn">
              ${rota('iletisim', `${esc(h.birincil || 'Bize yazın')} ${ok}`)}
              ${rota(h.ikincilRota || 'hizmetler', esc(h.ikincil || 'Hizmetlerimiz'), 'k-btn k-btn--ikincil')}
            </div>
          </div>
          <figure class="lh__panel" aria-label="Kontrol lambası altında siyah kaput: pasta öncesi hareler, sonrası ayna yüzey">
            <canvas class="lh__cv" aria-hidden="true"></canvas>
            <div class="lh__hud" aria-hidden="true">
              <span class="lh__led"></span>
              <span>Kontrol lambası</span>
              <b data-durum>Hare, kılcal çizik</b>
            </div>
            <div class="lh__alt">
              <div class="lh__olcer" aria-hidden="true">
                <span>Mat</span><i><em data-dolu></em></i><span>Ayna</span>
              </div>
              <button type="button" class="lh__dugme" data-dugme>Pasta-cila at</button>
            </div>
            <figcaption class="lh__not" data-not>Lambayı parmağınızla gezdirin</figcaption>
          </figure>
        </div>
        <div class="k-kap"><dl class="lh__bilgi">${bilgi}</dl></div>
      </section>`;
  },
  mount(el) {
    const panel = el.querySelector('.lh__panel');
    const cv = panel.querySelector('canvas');
    const c = cv.getContext('2d');
    const durumEl = panel.querySelector('[data-durum]');
    const doluEl = panel.querySelector('[data-dolu]');
    const dugme = panel.querySelector('[data-dugme]');
    const notEl = panel.querySelector('[data-not]');
    const zayif = (navigator.hardwareConcurrency || 8) <= 4;
    const N = zayif ? 2600 : 4200;
    const sx = new Float32Array(N), sy = new Float32Array(N), dx = new Float32Array(N), dy = new Float32Array(N), sl = new Float32Array(N);
    const canli = new Uint8Array(N);
    let W = 0, H = 0, dpr = 1, zemin = null, sonGenislik = 0;
    let lx = 0, ly = 0, hx = 0, hy = 0, elde = false, sonDokunus = -9;
    let kalan = N, pasta = null, t0 = performance.now(), gorunur = false, rafId = 0, otomatik = null;

    function cizikler() {
      const rnd = tohum(7);
      for (let i = 0; i < N; i++) {
        sx[i] = rnd(); sy[i] = rnd();
        const a = rnd() * Math.PI;
        dx[i] = Math.cos(a); dy[i] = Math.sin(a);
        sl[i] = 0.4 + rnd() * rnd() * 1.8;
        canli[i] = 1;
      }
      kalan = N;
    }

    // Boya: koyu petrol-siyah degrade, garaj floresanlarının yumuşak yansıması, metalik pul, köşe gölgesi.
    function boya() {
      zemin = document.createElement('canvas');
      zemin.width = cv.width; zemin.height = cv.height;
      const z = zemin.getContext('2d');
      z.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = z.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, '#1d2927'); g.addColorStop(0.45, '#0b1312'); g.addColorStop(1, '#040706');
      z.fillStyle = g; z.fillRect(0, 0, W, H);
      const serit = (x0, y0, x1, y1, gen, a) => {
        z.lineCap = 'round';
        for (let k = 5; k >= 1; k--) {
          z.strokeStyle = `rgb(220 235 230 / ${a / (k * 1.6)})`; z.lineWidth = gen * k;
          z.beginPath(); z.moveTo(x0, y0); z.lineTo(x1, y1); z.stroke();
        }
      };
      serit(-W * 0.1, H * 0.18, W * 1.1, H * 0.02, 5, 0.22);
      serit(-W * 0.1, H * 0.34, W * 1.1, H * 0.2, 3, 0.12);
      // Kaput kıvrımı
      z.strokeStyle = 'rgb(255 255 255 / .07)'; z.lineWidth = 1.2;
      z.beginPath(); z.moveTo(-10, H * 0.78); z.bezierCurveTo(W * 0.3, H * 0.66, W * 0.7, H * 0.7, W + 10, H * 0.58); z.stroke();
      z.strokeStyle = 'rgb(0 0 0 / .5)'; z.lineWidth = 3;
      z.beginPath(); z.moveTo(-10, H * 0.785 + 3); z.bezierCurveTo(W * 0.3, H * 0.665 + 3, W * 0.7, H * 0.705 + 3, W + 10, H * 0.585 + 3); z.stroke();
      const rnd = tohum(3);
      for (let i = 0; i < (W * H) / 90; i++) {
        z.fillStyle = `rgb(200 220 214 / ${0.03 + rnd() * 0.09})`;
        z.fillRect(rnd() * W, rnd() * H, 1, 1);
      }
      const v = z.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgb(0 0 0 / 0)'); v.addColorStop(1, 'rgb(0 0 0 / .55)');
      z.fillStyle = v; z.fillRect(0, 0, W, H);
    }

    function olc() {
      const r = panel.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      W = r.width; H = r.height;
      dpr = Math.min(1.5, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      boya();
      if (!lx) { lx = W * 0.62; ly = H * 0.42; hx = lx; hy = ly; }
      sonGenislik = W;
      return true;
    }

    function ciz(t) {
      c.drawImage(zemin, 0, 0, W, H);
      const m = Math.min(W, H);
      const oran = kalan / N;
      // Mat tül: çizikli boyada ışık yayılır; temizlendikçe daralır.
      const tul = c.createRadialGradient(lx, ly, 0, lx, ly, m * (0.28 + oran * 0.3));
      tul.addColorStop(0, `rgb(255 244 222 / ${0.1 + oran * 0.22})`);
      tul.addColorStop(1, 'rgb(255 244 222 / 0)');
      c.fillStyle = tul; c.fillRect(0, 0, W, H);
      // Çizikler: lambaya teğet duranlar parlar.
      const R = m * 0.62, R2 = R * R, dus = m * 0.21, L = Math.max(4.5, m * 0.013);
      const kova = [[], [], []];
      for (let i = 0; i < N; i++) {
        if (!canli[i]) continue;
        const x = sx[i] * W, y = sy[i] * H, vx = x - lx, vy = y - ly, d2 = vx * vx + vy * vy;
        if (d2 > R2 || d2 < 60) continue;
        const d = Math.sqrt(d2);
        const nokta = Math.abs((vx * dx[i] + vy * dy[i]) / d);
        if (nokta > 0.14) continue;
        const a = (1 - nokta / 0.14) * Math.exp(-d / dus) * (1 + 18 / d);
        if (a < 0.05) continue;
        kova[a > 0.5 ? 2 : a > 0.22 ? 1 : 0].push(i);
      }
      c.lineCap = 'round';
      const alfa = [0.3, 0.6, 0.95];
      for (let k = 0; k < 3; k++) {
        if (!kova[k].length) continue;
        c.strokeStyle = `rgb(255 250 238 / ${alfa[k]})`; c.lineWidth = k === 2 ? 1.1 : 0.8;
        c.beginPath();
        for (const i of kova[k]) {
          const x = sx[i] * W, y = sy[i] * H, l = L * sl[i];
          c.moveTo(x - dx[i] * l, y - dy[i] * l); c.lineTo(x + dx[i] * l, y + dy[i] * l);
        }
        c.stroke();
      }
      // Cilalı boya: floresan yansımaları keskinleşir.
      if (oran < 0.999) {
        c.strokeStyle = `rgb(240 250 246 / ${(1 - oran) * 0.55})`; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(-W * 0.1, H * 0.18); c.lineTo(W * 1.1, H * 0.02); c.stroke();
        c.lineWidth = 0.9; c.beginPath(); c.moveTo(-W * 0.1, H * 0.34); c.lineTo(W * 1.1, H * 0.2); c.stroke();
      }
      // Lamba yansıması: halka LED + sıcak hale.
      const hale = c.createRadialGradient(lx, ly, 0, lx, ly, m * 0.16);
      hale.addColorStop(0, 'rgb(255 214 140 / .55)'); hale.addColorStop(0.25, 'rgb(242 165 22 / .2)'); hale.addColorStop(1, 'rgb(242 165 22 / 0)');
      c.fillStyle = hale; c.beginPath(); c.arc(lx, ly, m * 0.16, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(lx, ly, m * 0.028, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgb(255 250 240 / .9)'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(lx, ly, m * 0.05, 0, Math.PI * 2); c.stroke();
      // Pasta pedi
      if (pasta) {
        const pr = m * 0.15;
        c.save(); c.translate(pasta.x, pasta.y);
        c.fillStyle = 'rgb(242 165 22 / .16)'; c.beginPath(); c.arc(0, 0, pr, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgb(255 205 110 / .95)'; c.lineWidth = 3; c.stroke();
        c.rotate(t * 0.02);
        c.strokeStyle = 'rgb(255 205 110 / .5)'; c.lineWidth = 1.4;
        for (let k = 0; k < 6; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(pr * 0.25, 0); c.lineTo(pr * 0.85, 0); c.stroke(); }
        c.fillStyle = '#0b1312'; c.beginPath(); c.arc(0, 0, pr * 0.2, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    }

    function sil(px, py) {
      const pr = Math.min(W, H) * 0.15, pr2 = pr * pr;
      for (let i = 0; i < N; i++) {
        if (!canli[i]) continue;
        const vx = sx[i] * W - px, vy = sy[i] * H - py;
        if (vx * vx + vy * vy < pr2) { canli[i] = 0; kalan--; }
      }
    }

    function durum() {
      const p = 1 - kalan / N;
      doluEl.style.transform = `scaleX(${0.06 + p * 0.94})`;
      durumEl.textContent = p > 0.97 ? 'Ayna gibi' : p > 0.05 ? 'Pasta atılıyor' : 'Hare, kılcal çizik';
      panel.classList.toggle('is-ayna', p > 0.97);
    }

    function pastaAt() {
      if (pasta) return;
      if (kalan < N * 0.03) { cizikler(); durum(); dugme.textContent = 'Pasta-cila at'; notEl.textContent = 'Lambayı parmağınızla gezdirin'; if (reducedMotion) ciz(0); return; }
      if (reducedMotion) { canli.fill(0); kalan = 0; durum(); ciz(0); dugme.textContent = 'Çizikleri geri getir'; return; }
      clearTimeout(otomatik);
      const yol = { s: 0 };
      pasta = { x: -W * 0.2, y: H * 0.2 };
      dugme.disabled = true;
      const SIRA = 4;
      gsap.to(yol, {
        s: 1, duration: 2.6, ease: 'none',
        onUpdate() {
          const u = yol.s * SIRA, r = Math.min(SIRA - 1, Math.floor(u)), f = u - r;
          const git = r % 2 === 0 ? f : 1 - f;
          pasta.x = -W * 0.05 + git * W * 1.1;
          pasta.y = H * (0.14 + (r / (SIRA - 1)) * 0.72) + Math.sin(f * Math.PI * 6) * H * 0.02;
          sil(pasta.x, pasta.y);
          durum();
        },
        onComplete() {
          canli.fill(0); kalan = 0; durum();
          pasta = null; dugme.disabled = false;
          dugme.textContent = 'Çizikleri geri getir';
          notEl.textContent = 'Teslimde kaputa lambayla birlikte bakarız';
        },
      });
    }
    dugme.addEventListener('click', pastaAt);

    // Parmak / fare: lambayı taşır. Dikey kaydırma sayfaya kalır (touch-action: pan-y).
    const konum = (e) => { const r = cv.getBoundingClientRect(); hx = e.clientX - r.left; hy = e.clientY - r.top; };
    cv.addEventListener('pointerdown', (e) => { elde = true; konum(e); sonDokunus = performance.now(); panel.classList.add('is-dokundu'); });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || elde) { konum(e); sonDokunus = performance.now(); panel.classList.add('is-dokundu'); }
    });
    const birak = () => (elde = false);
    cv.addEventListener('pointerup', birak);
    cv.addEventListener('pointercancel', birak);
    cv.addEventListener('pointerleave', birak);

    function kare(now) {
      rafId = 0;
      if (!gorunur || document.hidden) return;
      const t = (now - t0) / 1000;
      if (now - sonDokunus > 2600) {
        hx = W * (0.5 + 0.3 * Math.sin(t * 0.55));
        hy = H * (0.44 + 0.2 * Math.sin(t * 0.83 + 1.2));
      }
      const k = now - sonDokunus < 2600 ? 0.35 : 0.06;
      lx += (hx - lx) * k; ly += (hy - ly) * k;
      ciz(now);
      rafId = requestAnimationFrame(kare);
    }
    const baslat = () => { if (!rafId && gorunur && !reducedMotion) rafId = requestAnimationFrame(kare); };

    cizikler();
    if (!olc()) return;
    durum();
    ciz(0);
    if (reducedMotion) return;

    gsap.fromTo(panel, { clipPath: 'inset(8% 8% 8% 8% round 40px)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', opacity: 1, duration: 1.2, ease: 'power3.out', delay: 0.15, clearProps: 'clipPath' });
    const io = new IntersectionObserver((e) => { gorunur = e[0].isIntersecting; baslat(); }, { threshold: 0.05 });
    io.observe(panel);
    const gor = () => baslat();
    document.addEventListener('visibilitychange', gor);
    // Bakan hiç dokunmasa da bir kez görsün: birkaç saniye hare, sonra ped geçer.
    otomatik = setTimeout(() => { if (el.isConnected && !panel.classList.contains('is-dokundu')) pastaAt(); }, 4200);
    const ro = new ResizeObserver(() => {
      const w = panel.getBoundingClientRect().width;
      if (Math.abs(w - sonGenislik) > 2 && olc()) ciz(0);
    });
    ro.observe(panel);
    return () => { io.disconnect(); ro.disconnect(); clearTimeout(otomatik); cancelAnimationFrame(rafId); rafId = 0; gorunur = false; document.removeEventListener('visibilitychange', gor); };
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
      <linearGradient id="pl-mum" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffe08a"/><stop offset=".45" stop-color="#f2a516"/><stop offset=".8" stop-color="#7fd6c2"/><stop offset="1" stop-color="#fff4d6"/>
      </linearGradient>
      <clipPath id="pl-govde"><path d="M78 36 C44 38 30 72 30 125 C30 178 44 212 78 214 L378 214 C420 212 440 178 440 125 C440 72 420 38 378 36 Z"/></clipPath>
    </defs>
    <g class="pl__zon" data-zon="jant" tabindex="0" role="button" aria-label="Jantlar">
      <rect x="92" y="18" width="62" height="26" rx="10"/><rect x="92" y="206" width="62" height="26" rx="10"/>
      <rect x="326" y="18" width="62" height="26" rx="10"/><rect x="326" y="206" width="62" height="26" rx="10"/>
    </g>
    <path class="pl__zon pl__govde" data-zon="kaporta" tabindex="0" role="button" aria-label="Kaporta" d="M78 36 C44 38 30 72 30 125 C30 178 44 212 78 214 L378 214 C420 212 440 178 440 125 C440 72 420 38 378 36 Z"/>
    <path class="pl__cila" d="M78 36 C44 38 30 72 30 125 C30 178 44 212 78 214 L378 214 C420 212 440 178 440 125 C440 72 420 38 378 36 Z" fill="url(#pl-mum)"/>
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
