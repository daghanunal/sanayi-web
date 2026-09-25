// Kurumsal mimarlık — "Gün Işığı" yönü.
// gunesHero:  imza anı. Beyaz, yüksek tavanlı bir salon fotoğrafı bir gün ışığı etüdüne dönüşür: üstte güneşin
//             yay çizdiği gök yarım dairesi, altında saat kaydırıcısı. Sayfa açılınca güneş sabah 06:00'dan
//             öğleden sonraya yürür; oda sabah turuncusundan öğle beyazına, akşam kızıllığına ve alacakaranlık
//             mavisine geçer, gölge yönü ve boyu güneşle döner. Kaydırıcıyla ya da fotoğrafta parmakla sürükleyerek
//             günün her saatini deneyebilirsiniz. Okumalar: saat, güneş yüksekliği, yön, gölge boyu.
// katKesit:   hizmet özeti bir yapı kesiti gibi: her hizmet bir kat, solunda kot (+21,00 … ±0,00), içinde
//             pencereden görünen küçük fotoğraf; altta taralı zemin.
// imarHesap:  TAKS/KAKS ile izometrik kütle; kütle güneşe göre zemine gölge düşürür.
import { esc, telHref, waHref, openStatus, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const sayi = (n, b = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: b, maximumFractionDigits: b });

export const ikonGunes = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2 20h20M12 4v3M4.9 8.9l2.1 2.1M19.1 8.9 17 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
export const ikonGonye = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V3l18 18z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 17v-5l5 5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

// --- Güneş modeli ------------------------------------------------------------------------
// f: 0 = 06:00, 1 = 20:00. Basit yaz günü yayı; tepe noktası 62°.
const SAAT0 = 6, SAAT1 = 20;
const karis = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const YON = [[0, 'K'], [45, 'KD'], [90, 'D'], [135, 'GD'], [180, 'G'], [225, 'GB'], [270, 'B'], [315, 'KB'], [360, 'K']];
export function gunes(f) {
  const yuk = Math.sin(Math.PI * f); // 0..1
  const derece = yuk * 62;
  const az = 75 + f * 210; // doğudan batıya
  const yon = YON.reduce((a, b) => (Math.abs(b[0] - az) < Math.abs(a[0] - az) ? b : a))[1];
  const golge = derece > 4 ? 1 / Math.tan((derece * Math.PI) / 180) : null;
  const dk = Math.round((SAAT0 + f * (SAAT1 - SAAT0)) * 60);
  const saat = `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;
  return { f, yuk, derece, az, yon, golge, saat };
}

// --- Hero --------------------------------------------------------------------------------

export const gunesHero = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const saatler = [6, 9, 12, 15, 18];
    const tik = saatler
      .map((s) => {
        const th = Math.PI * (1 - (s - SAAT0) / (SAAT1 - SAAT0));
        const x = 200 + 176 * Math.cos(th), y = 112 - 96 * Math.sin(th);
        const x2 = 200 + 188 * Math.cos(th), y2 = 112 - 106 * Math.sin(th);
        return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/><text x="${(200 + 158 * Math.cos(th)).toFixed(1)}" y="${(104 - 76 * Math.sin(th)).toFixed(1)}">${String(s).padStart(2, '0')}</text>`;
      })
      .join('');
    return `
      <section class="k-hero gh" aria-label="Giriş">
        <div class="k-kap gh__ic">
          <div class="gh__metin">
            <p class="gh__ust"><span class="gh__ust-isaret" aria-hidden="true"></span>${esc(d.isletme.sektor)} · ${esc(tema.yer || 'Etimesgut')}${d.isletme.kurulus ? ` · ${esc(yilEki(d.isletme.kurulus))} beri` : ''}</p>
            <h1 class="k-h1 gh__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead gh__lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `<span>${esc(h.birincil || 'Ön görüşme isteyin')}</span>${ok}`)}
              ${rota(h.ikincilRota || 'imar', `${ikonGonye}<span>${esc(h.ikincil || 'İmar ön hesabı')}</span>`, 'k-btn k-btn--ikincil')}
            </div>
            <ul class="gh__bilgi">
              ${st ? `<li class="gh__durum${st.open ? ' is-acik' : ''}"><i aria-hidden="true"></i>${esc(st.text)}</li>` : ''}
              <li><a href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a></li>
            </ul>
          </div>
          <div class="gh__etut">
            <div class="gh__gok" aria-hidden="true">
              <svg viewBox="0 0 400 124">
                <path class="gh__yay" d="M24 112 A176 96 0 0 1 376 112"/>
                <path class="gh__yay gh__yay--dolu" d="M24 112 A176 96 0 0 1 376 112" pathLength="1"/>
                <g class="gh__tik">${tik}</g>
                <line class="gh__ufuk" x1="0" y1="112" x2="400" y2="112"/>
                <g class="gh__gunes"><circle r="15" class="gh__hale"/><circle r="8.5"/></g>
              </svg>
            </div>
            <figure class="gh__foto">
              <div class="gh__foto-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high" draggable="false"></div>
              <span class="gh__renk" aria-hidden="true"></span>
              <span class="gh__golge" aria-hidden="true"></span>
              <span class="gh__isik" aria-hidden="true"></span>
              <span class="gh__huzme" aria-hidden="true"></span>
              <span class="gh__gece" aria-hidden="true"></span>
              <figcaption class="gh__okuma" aria-live="off">
                <span class="gh__etiket">Gün ışığı etüdü</span>
                <b class="gh__saat" data-g="saat">06:00</b>
              </figcaption>
              <span class="gh__ipucu" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Günü sürükleyin</span>
            </figure>
            <div class="gh__kontrol">
              <label class="gh__kaydir"><span class="sr-only">Saat</span>
                <input type="range" min="0" max="1" step="0.002" value="0.02" data-g="aralik" aria-valuetext="06:00">
              </label>
              <dl class="gh__degerler">
                <div><dt>Güneş</dt><dd data-g="derece">0°</dd></div>
                <div><dt>Yön</dt><dd data-g="yon">D</dd></div>
                <div><dt>Gölge boyu</dt><dd data-g="golge">uzun</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const foto = el.querySelector('.gh__foto');
    const aralik = el.querySelector('[data-g="aralik"]');
    const gunesG = el.querySelector('.gh__gunes');
    const dolu = el.querySelector('.gh__yay--dolu');
    const q = (k) => el.querySelector(`[data-g="${k}"]`);
    const renk = [
      [255, 178, 110], // şafak
      [255, 253, 246], // öğle
      [255, 160, 52], // gün batımı: altın saat
      [84, 104, 170], // alacakaranlık
    ];
    const durum = { f: Number(aralik.value) };

    function uygula(f) {
      const g = gunes(f);
      // Gök yayında güneşin yeri
      const th = Math.PI * (1 - f);
      gunesG.setAttribute('transform', `translate(${(200 + 176 * Math.cos(th)).toFixed(1)} ${(112 - 96 * Math.sin(th)).toFixed(1)})`);
      dolu.style.strokeDashoffset = String(1 - f);
      // Oda ışığı: sabah ve akşam sıcak, öğle nötr, gün batımından sonra mavi.
      const sicak = Math.pow(1 - g.yuk, 0.85);
      let c = karis(renk[1], f < 0.5 ? renk[0] : renk[2], sicak);
      if (f > 0.86) c = karis(c, renk[3], Math.min(1, (f - 0.86) / 0.12));
      if (f < 0.05) c = karis(c, renk[3], (0.05 - f) / 0.05 * 0.6);
      const s = foto.style;
      s.setProperty('--g-renk', `rgb(${c.join(' ')})`);
      s.setProperty('--g-aci', `${(90 + f * 180).toFixed(1)}deg`);
      s.setProperty('--g-golge', (0.12 + sicak * 0.5).toFixed(3));
      s.setProperty('--g-x', `${((1 - f) * 100).toFixed(1)}%`);
      s.setProperty('--g-y', `${(92 - g.yuk * 80).toFixed(1)}%`);
      s.setProperty('--g-isik', ((0.2 + sicak * 0.55) * Math.min(1, g.derece / 12)).toFixed(3));
      const gece = Math.max(0, f - 0.9) / 0.1 * 0.45 + Math.max(0, 0.04 - f) / 0.04 * 0.35;
      s.setProperty('--g-gece', gece.toFixed(3));
      // Pencereden giren ışık huzmesi: alçak güneşte belirgin, gece yok.
      const huzme = g.derece > 3 ? 0.18 + sicak * 0.5 : Math.max(0, g.derece / 3) * 0.18;
      s.setProperty('--g-huzme', huzme.toFixed(3));
      s.setProperty('--g-hx', `${(f * 100).toFixed(1)}%`);
      el.style.setProperty('--g-yuk', g.yuk.toFixed(3));
      q('saat').textContent = g.saat;
      q('derece').textContent = `${Math.round(g.derece)}°`;
      q('yon').textContent = g.yon;
      q('golge').textContent = g.golge == null ? 'çok uzun' : g.golge > 6 ? 'çok uzun' : `${sayi(g.golge, 1)} × boy`;
      aralik.setAttribute('aria-valuetext', g.saat);
      aralik.style.setProperty('--dolu', `${(f * 100).toFixed(1)}%`);
    }

    let tl;
    const dur = () => { if (tl) { tl.kill(); tl = null; } };
    aralik.addEventListener('input', () => { dur(); durum.f = Number(aralik.value); uygula(durum.f); });

    // Fotoğrafta yatay sürükleme saati değiştirir; dikey kaydırma serbest (touch-action: pan-y).
    let basX = null, basF = 0;
    foto.addEventListener('pointerdown', (e) => {
      dur(); basX = e.clientX; basF = durum.f;
      foto.classList.add('is-surukle');
      try { foto.setPointerCapture(e.pointerId); } catch {}
    });
    foto.addEventListener('pointermove', (e) => {
      if (basX == null) return;
      const w = foto.getBoundingClientRect().width;
      durum.f = Math.max(0, Math.min(1, basF + (e.clientX - basX) / (w * 1.1)));
      aralik.value = durum.f;
      uygula(durum.f);
    });
    const birak = () => { basX = null; foto.classList.remove('is-surukle'); };
    foto.addEventListener('pointerup', birak);
    foto.addEventListener('pointercancel', birak);

    if (reducedMotion) { durum.f = 0.58; aralik.value = durum.f; uygula(durum.f); return; }
    uygula(durum.f);
    // Açılış: güneş doğar, öğleyi geçip öğleden sonra durur; ipucu yanıp söner.
    tl = gsap.timeline({ delay: 0.35 });
    tl.fromTo(el.querySelector('.gh__gok svg'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0)
      .fromTo(foto, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.0, ease: 'power3.inOut', clearProps: 'clipPath' }, 0)
      .fromTo(el.querySelectorAll('.gh__degerler > div, .gh__kaydir'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' }, 0.5)
      .to(durum, { f: 0.8, duration: 3.6, ease: 'power2.inOut', onUpdate: () => { aralik.value = durum.f; uygula(durum.f); } }, 0.7)
      .fromTo(el.querySelector('.gh__ipucu'), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5 }, 3.4);
  },
};

// --- Kat kesiti (hizmet özeti) -----------------------------------------------------------

export const katKesit = {
  render(d) {
    const list = d.hizmetler || [];
    if (!list.length) return '';
    const n = list.length;
    const kot = (i) => {
      const v = (n - 1 - i) * 3;
      return v === 0 ? '±0,00' : `+${sayi(v, 2)}`;
    };
    return `
      <section class="k-bolum kk">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <div>
              <p class="kk__ust">Yapı kesiti · ${n} kat</p>
              <h2 class="k-h2" data-bol>${esc(d.kurumsal?.hizmetOzetBaslik || 'Hizmetlerimiz')}</h2>
            </div>
            ${rota('hizmetler', `Tüm hizmetler ${ok}`, 'k-link')}
          </div>
          <div class="kk__bina">
            <div class="kk__cati" aria-hidden="true"><span></span></div>
            <ol class="kk__katlar" data-sira>
              ${list
                .map(
                  (h, i) => `<li><a class="kk__kat" href="#/hizmetler" data-rota="hizmetler">
                    <span class="kk__kot">${kot(i)}</span>
                    ${h.gorsel ? `<span class="kk__pencere" aria-hidden="true"><img src="${esc(h.gorsel)}" alt="" loading="lazy"></span>` : '<span class="kk__pencere" aria-hidden="true"></span>'}
                    <span class="kk__metin"><span class="kk__ad">${esc(h.baslik)}</span><span class="kk__kisa">${esc(h.kisa || h.aciklama)}</span></span>
                    <span class="kk__sure">${esc(h.sure || '')}</span>
                  </a></li>`
                )
                .join('')}
            </ol>
            <div class="kk__zemin" aria-hidden="true"><span>Zemin</span></div>
          </div>
          <p class="kk__not">Hangi çizimlerin teslim edileceği ve fiyat, yer ziyaretinden sonra işe başlamadan yazılı verilir.</p>
        </div>
      </section>`;
  },
};

// --- İmar ön hesabı ----------------------------------------------------------------------

const HAZIR = [
  { ad: 'Müstakil ev', arsa: 500, taks: 0.3, kaks: 0.6 },
  { ad: 'Villa', arsa: 1000, taks: 0.2, kaks: 0.4 },
  { ad: 'Apartman', arsa: 800, taks: 0.35, kaks: 1.4 },
  { ad: 'Ticari / ofis', arsa: 1200, taks: 0.5, kaks: 2.0 },
];

export const imarHesap = {
  render(d, ctx) {
    const ana = location.hash.replace(/^#\/?/, '').split('?')[0] !== 'imar';
    return `
      <section class="k-bolum ih" id="imar-hesabi">
        <div class="k-kap">
          ${ana ? `<div class="k-bolum__bas ih__bas">
            <div>
              <p class="ih__ust">İmar ön hesabı</p>
              <h2 class="k-h2" data-bol>Arsanıza ne sığar?</h2>
            </div>
            <p class="ih__giris">Üç değer girin, kütle yükselsin. Kesin değerleri imar durum belgesinden birlikte okuruz.</p>
          </div>` : ''}
          <div class="ih__masa">
            <div class="ih__cizim">
              <div class="ih__cizim-ust"><span>İzometrik kütle</span><span data-ih="olcek">Ölçeksiz</span></div>
              <svg class="ih__svg" viewBox="0 0 420 360" role="img" aria-label="Arsa ve bina kütlesinin izometrik çizimi"><g data-ih="svg"></g></svg>
              <div class="ih__lejant"><span><i class="ih__l-arsa"></i>Arsa</span><span><i class="ih__l-taban"></i>Taban alanı</span><span><i class="ih__l-kat"></i>Katlar</span></div>
            </div>
            <div class="ih__panel">
              <div class="ih__hazir" role="group" aria-label="Hazır örnekler">
                ${HAZIR.map((h, i) => `<button type="button" data-hazir="${i}"${i === 2 ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(h.ad)}</button>`).join('')}
              </div>
              <label class="ih__alan"><span class="ih__etiket">Arsa alanı <output data-ih="arsa-o"></output></span>
                <input type="range" min="150" max="3000" step="10" value="800" data-ih="arsa" aria-describedby="ih-arsa-n">
                <span class="ih__not" id="ih-arsa-n">Tapudaki yüzölçümü (m²)</span></label>
              <label class="ih__alan"><span class="ih__etiket">TAKS <output data-ih="taks-o"></output></span>
                <input type="range" min="0.10" max="0.60" step="0.05" value="0.35" data-ih="taks" aria-describedby="ih-taks-n">
                <span class="ih__not" id="ih-taks-n">Taban alanı katsayısı: arsanın ne kadarına oturulur</span></label>
              <label class="ih__alan"><span class="ih__etiket">KAKS / emsal <output data-ih="kaks-o"></output></span>
                <input type="range" min="0.20" max="3.00" step="0.05" value="1.40" data-ih="kaks" aria-describedby="ih-kaks-n">
                <span class="ih__not" id="ih-kaks-n">Kat alanı katsayısı: toplam ne kadar inşaat yapılır</span></label>
              <dl class="ih__sonuc">
                <div><dt>Taban alanı</dt><dd><span data-ih="taban">0</span><small>m²</small></dd></div>
                <div><dt>Toplam inşaat alanı</dt><dd><span data-ih="toplam">0</span><small>m²</small></dd></div>
                <div><dt>Yaklaşık kat</dt><dd><span data-ih="kat">0</span><small data-ih="kat-ek">kat</small></dd></div>
                <div><dt>Yaklaşık yükseklik</dt><dd><span data-ih="yukseklik">0</span><small>m</small></dd></div>
              </dl>
              <p class="ih__uyari">Ön hesaptır. Bodrum kat, çatı arası, balkon ve emsal dışı alanlar yönetmeliğe göre ayrıca hesaplanır; kesin değer imar durum belgesindedir.</p>
              <div class="k-butonlar">
                <a class="k-btn" data-ih="wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu arsayı konuşalım</span></a>
                <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const q = (k) => el.querySelector(`[data-ih="${k}"]`);
    const girdi = { arsa: q('arsa'), taks: q('taks'), kaks: q('kaks') };
    const g = q('svg');
    let oncekiKat = 0;

    // İzometrik izdüşüm: x sağa-aşağı, y sola-aşağı, z yukarı.
    const C = Math.cos(Math.PI / 6), S = 0.5;
    const OX = 210, OY = 150;
    const P = (x, y, z) => `${(OX + (x - y) * C).toFixed(1)},${(OY + (x + y) * S - z).toFixed(1)}`;
    const kutu = (x0, y0, w, dd, z0, h, cls, attr = '') => {
      const x1 = x0 + w, y1 = y0 + dd, z1 = z0 + h;
      return `<g class="${cls}" ${attr}>
        <polygon class="ih__yan-sol" points="${P(x0, y1, z0)} ${P(x1, y1, z0)} ${P(x1, y1, z1)} ${P(x0, y1, z1)}"/>
        <polygon class="ih__yan-sag" points="${P(x1, y0, z0)} ${P(x1, y1, z0)} ${P(x1, y1, z1)} ${P(x1, y0, z1)}"/>
        <polygon class="ih__ust-yuz" points="${P(x0, y0, z1)} ${P(x1, y0, z1)} ${P(x1, y1, z1)} ${P(x0, y1, z1)}"/>
      </g>`;
    };

    function hesapla() {
      const arsa = Number(girdi.arsa.value);
      const taks = Number(girdi.taks.value);
      const kaks = Math.max(Number(girdi.kaks.value), 0.0001);
      const taban = arsa * Math.min(taks, kaks);
      const toplam = arsa * kaks;
      const katHam = toplam / (arsa * taks);
      const tamKat = Math.max(1, Math.floor(katHam + 1e-6));
      const kesir = katHam - tamKat;
      const katSayisi = kesir > 0.05 ? tamKat + 1 : tamKat;
      return { arsa, taks, kaks, taban, toplam, katHam, tamKat, kesir: kesir > 0.05 ? kesir : 0, katSayisi };
    }

    function ciz(r) {
      // Arsa kenarı sabit çizim birimi; alan büyüdükçe ölçek yazısı değişir.
      const A = 200;
      const oran = Math.sqrt(Math.min(r.taks, r.kaks));
      const w = A * oran;
      const kenar = Math.sqrt(r.arsa);
      const ofs = (A - w) / 2;
      const katH = Math.min(22, 175 / Math.max(r.katSayisi, 1));
      let s = '';
      // Arsa plakası + kot çizgileri + çekme mesafesi kesik çizgisi.
      s += `<polygon class="ih__arsa" points="${P(0, 0, 0)} ${P(A, 0, 0)} ${P(A, A, 0)} ${P(0, A, 0)}"/>`;
      for (let i = 1; i < 8; i++) s += `<line class="ih__izgara" x1="${P((A / 8) * i, 0, 0).split(',')[0]}" y1="${P((A / 8) * i, 0, 0).split(',')[1]}" x2="${P((A / 8) * i, A, 0).split(',')[0]}" y2="${P((A / 8) * i, A, 0).split(',')[1]}"/>`;
      s += `<polygon class="ih__cekme" points="${P(14, 14, 0)} ${P(A - 14, 14, 0)} ${P(A - 14, A - 14, 0)} ${P(14, A - 14, 0)}"/>`;
      // Öğleden sonra güneşi: kütlenin gölgesi zemine sol-öne düşer.
      const L = r.katSayisi * katH * 0.55;
      const a = -0.35 * L, b = 0.95 * L, x0 = ofs, y0 = ofs, x1 = ofs + w, y1 = ofs + w;
      s += `<polygon class="ih__golge" points="${P(x1, y0, 0)} ${P(x1, y1, 0)} ${P(x1 + a, y1 + b, 0)} ${P(x0 + a, y1 + b, 0)} ${P(x0 + a, y0 + b, 0)} ${P(x0, y0, 0)}"/>`;
      s += `<polygon class="ih__taban" points="${P(ofs, ofs, 0)} ${P(ofs + w, ofs, 0)} ${P(ofs + w, ofs + w, 0)} ${P(ofs, ofs + w, 0)}"/>`;
      // Katlar: tam katlar aynı, kesirli son kat çatı katı gibi geri çekilir.
      for (let k = 0; k < r.katSayisi; k++) {
        const son = k === r.tamKat && r.kesir;
        const ww = son ? w * Math.sqrt(r.kesir) : w;
        const o = ofs + (w - ww) / 2;
        s += kutu(o, o, ww, ww, k * katH, katH - 1.2, `ih__kat${son ? ' ih__kat--cati' : ''}`, `data-k="${k}"`);
      }
      // Ölçü yazıları.
      const sol = P(0, A, 0).split(',').map(Number);
      const on = P(A, A, 0).split(',').map(Number);
      s += `<text class="ih__yazi" x="${(sol[0] + on[0]) / 2 - 6}" y="${(sol[1] + on[1]) / 2 + 22}" transform="rotate(30 ${(sol[0] + on[0]) / 2} ${(sol[1] + on[1]) / 2 + 22})">≈ ${sayi(kenar, 1)} m</text>`;
      const tepe = P(ofs + w, ofs, r.katSayisi * katH).split(',').map(Number);
      s += `<line class="ih__kot" x1="${tepe[0] + 8}" y1="${tepe[1]}" x2="${tepe[0] + 40}" y2="${tepe[1]}"/><text class="ih__yazi ih__yazi--kot" x="${tepe[0] + 44}" y="${tepe[1] + 4}">+${sayi(r.katSayisi * 3, 1)}</text>`;
      g.innerHTML = s;
      if (!reducedMotion && r.katSayisi > oncekiKat) {
        const yeni = [...g.querySelectorAll('.ih__kat')].slice(oncekiKat);
        gsap.fromTo(yeni, { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out' });
      }
      oncekiKat = r.katSayisi;
    }

    function guncelle() {
      const r = hesapla();
      q('arsa-o').textContent = `${sayi(r.arsa)} m²`;
      q('taks-o').textContent = sayi(r.taks, 2);
      q('kaks-o').textContent = sayi(r.kaks, 2);
      q('taban').textContent = sayi(r.taban);
      q('toplam').textContent = sayi(r.toplam);
      q('kat').textContent = r.kesir ? `${r.tamKat}+1` : String(r.tamKat);
      q('kat-ek').textContent = r.kesir ? 'kat (son kat geri çekme)' : 'kat';
      q('yukseklik').textContent = sayi(r.katSayisi * 3, 1);
      q('olcek').textContent = `Arsa kenarı ≈ ${sayi(Math.sqrt(r.arsa), 1)} m`;
      for (const k of ['arsa', 'taks', 'kaks']) {
        const i = girdi[k];
        i.style.setProperty('--dolu', `${((i.value - i.min) / (i.max - i.min)) * 100}%`);
      }
      const mesaj = `Merhaba ${d.isletme.ad}, arsam için ön görüşme yapmak istiyorum.\nArsa alanı: ${sayi(r.arsa)} m²\nTAKS: ${sayi(r.taks, 2)} · KAKS: ${sayi(r.kaks, 2)}\nSitedeki ön hesap: taban ${sayi(r.taban)} m², toplam ${sayi(r.toplam)} m², yaklaşık ${q('kat').textContent} kat.`;
      q('wa').href = waHref(d, mesaj);
      ciz(r);
    }

    Object.values(girdi).forEach((i) =>
      i.addEventListener('input', () => {
        el.querySelectorAll('[data-hazir]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        guncelle();
      })
    );
    el.querySelectorAll('[data-hazir]').forEach((b) =>
      b.addEventListener('click', () => {
        const h = HAZIR[Number(b.dataset.hazir)];
        el.querySelectorAll('[data-hazir]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        oncekiKat = 0;
        girdi.arsa.value = h.arsa;
        girdi.taks.value = h.taks;
        girdi.kaks.value = h.kaks;
        guncelle();
      })
    );

    // İlk çizim: bölüm görünür olduğunda katlar sırayla yükselir.
    oncekiKat = 0;
    if (reducedMotion) { guncelle(); return; }
    guncelle();
    const katlar = g.querySelectorAll('.ih__kat');
    gsap.set(katlar, { opacity: 0, y: -30 });
    ScrollTrigger.create({
      trigger: el.querySelector('.ih__cizim'),
      start: 'top 75%',
      once: true,
      onEnter: () => gsap.to(g.querySelectorAll('.ih__kat'), { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: 'power3.out' }),
    });
  },
};

// --- Sayfa başı sıfırlama ----------------------------------------------------------------
// Motor yeni sayfanın "once" tetikleyicilerini kaydırma henüz eski sayfanın dibindeyken kuruyor; hepsi aynı anda
// tetiklenip kendini silince ScrollTrigger.refresh döngüsü hata veriyor. Her sayfanın ilk bloğu olarak kaydırmayı
// tetikleyiciler kurulmadan önce en üste alır.
export const sifirla = {
  render() { return '<span class="pf-sifir" aria-hidden="true"></span>'; },
  mount(el, d, ctx) {
    if (ctx.lenis) ctx.lenis.scrollTo(0, { immediate: true, force: true });
    else scrollTo(0, 0);
    if (window.scrollY) scrollTo(0, 0);
  },
};
