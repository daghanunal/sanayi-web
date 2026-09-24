// Kurumsal mimarlık — "Pafta" yönü.
// paftaHero:  site bir proje paftası gibi açılır. Aks balonları (A-D / 1-3) ve kesik aks çizgileri, fotoğrafın
//             çevresinde ölçü çizgileri çizilir; fotoğraf önce kurşun kalem eskizi olarak görünür, tarama çizgisi
//             geçtikçe gerçek yapıya dönüşür. Altta antet (proje künyesi): müellif, ölçek, tarih, pafta, bugünkü durum.
//             Masaüstünde imleç, koordinat okuyan bir artı imlecine dönüşür.
// paftaListe: hizmet özeti bir çizim listesi gibi: pafta kodu, başlık, süre; üzerine gelince küçük fotoğraf.
// olcuBand:   rakamlar ölçü çizgisi olarak: iki uçta kesme işareti, ortada değer.
// imarHesap:  imza modülü. Arsa alanı, TAKS, KAKS kaydırıcıları; izometrik kütle canlı yükselir (kat kat),
//             taban alanı, toplam inşaat alanı, kat sayısı, yaklaşık yükseklik; sonuç WhatsApp mesajına dönüşür.
import { esc, telHref, waHref, openStatus, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const img = (p) => `${import.meta.env.BASE_URL}img/kurumsal-mimarlik/${p}.jpg`;
const sayi = (n, b = 0) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: b, maximumFractionDigits: b });

export const ikonGonye = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V3l18 18z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 17v-5l5 5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 8h2M3 12h3M3 16h2" stroke="currentColor" stroke-width="1.6"/></svg>`;

// --- Hero --------------------------------------------------------------------------------

export const paftaHero = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bugun = new Date();
    const tarih = `${String(bugun.getDate()).padStart(2, '0')}.${String(bugun.getMonth() + 1).padStart(2, '0')}.${bugun.getFullYear()}`;
    const antet = [
      ['Müellif', d.isletme.ad, 'ph__antet-genis'],
      ['Proje', 'Sizin eviniz, işyeriniz'],
      ['Ölçek', '1/100'],
      ['Tarih', tarih],
      ['Pafta', 'A-01'],
      ['Ofis', st ? st.text : 'Etimesgut', 'ph__antet-durum' + (st?.open ? ' is-acik' : '')],
    ];
    const akslar = ['A', 'B', 'C', 'D'];
    return `
      <section class="k-hero ph" aria-label="Giriş">
        <div class="k-kap ph__pafta">
          <span class="ph__kose ph__kose--1" aria-hidden="true"></span><span class="ph__kose ph__kose--2" aria-hidden="true"></span>
          <div class="ph__ic">
            <div class="ph__bas">
              <p class="ph__ust"><span class="ph__kod">A-01</span><span>${esc(d.isletme.sektor)}<span class="ph__yer"> · ${esc(tema.yer || 'Etimesgut')}</span>${d.isletme.kurulus ? ` · ${esc(yilEki(d.isletme.kurulus))} beri` : ''}</span></p>
              <h1 class="k-h1 ph__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            </div>
            <div class="ph__cizim">
              <div class="ph__olcu ph__olcu--yatay" aria-hidden="true"><span class="ph__olcu-cizgi"></span><span class="ph__olcu-yazi">18,60</span></div>
              <div class="ph__olcu ph__olcu--dikey" aria-hidden="true"><span class="ph__olcu-cizgi"></span><span class="ph__olcu-yazi">12,40</span></div>
              <figure class="ph__cerceve" style="--p:100%">
                <div class="ph__foto" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div>
                <div class="ph__eskiz" aria-hidden="true" data-paralaks><img src="${tema.heroGorsel}" alt=""></div>
                <div class="ph__akslar" aria-hidden="true">${akslar.map((a, i) => `<span class="ph__aks" style="--x:${12 + i * 25.3}%"><b>${a}</b></span>`).join('')}</div>
                <div class="ph__akslar ph__akslar--y" aria-hidden="true">${[1, 2, 3].map((a, i) => `<span class="ph__aks ph__aks--y" style="--y:${22 + i * 28}%"><b>${a}</b></span>`).join('')}</div>
                <span class="ph__etiket ph__etiket--eskiz" aria-hidden="true">Eskiz</span><span class="ph__etiket ph__etiket--yapi" aria-hidden="true">Yapı</span>
                <span class="ph__tarama" aria-hidden="true"><span class="ph__tutamak"><svg viewBox="0 0 24 24"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg></span></span>
                <span class="ph__kuzey" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M20 5l7 22-7-5-7 5z" fill="currentColor"/></svg><b>K</b></span>
              </figure>
              <p class="ph__ipucu" aria-hidden="true">Çizgiyi sürükleyin: eskizden yapıya</p>
            </div>
            <div class="ph__alt">
              <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
              <div class="k-butonlar">
                ${rota('iletisim', `${esc(h.birincil || 'Ön görüşme isteyin')} ${ok}`)}
                ${rota(h.ikincilRota || 'imar', `${ikonGonye}<span>${esc(h.ikincil || 'İmar ön hesabı')}</span>`, 'k-btn k-btn--ikincil')}
              </div>
            </div>
          </div>
          <dl class="ph__antet">
            ${antet.map(([e, v, c]) => `<div class="${c || ''}"><dt>${esc(e)}</dt><dd>${c?.startsWith('ph__antet-durum') ? '<i></i>' : ''}${esc(v)}</dd></div>`).join('')}
            <div class="ph__antet-tel"><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
          </dl>
        </div>
        <div class="ph__arti" aria-hidden="true"><span class="ph__arti-x"></span><span class="ph__arti-y"></span><span class="ph__arti-yazi">x 00,00 · y 00,00</span></div>
      </section>`;
  },
  mount(el) {
    const cerceve = el.querySelector('.ph__cerceve');
    const tarama = el.querySelector('.ph__tarama');
    const DURAK = 34; // intro sonunda eskizin kapladığı yüzde
    // Karşılaştırma çizgisi: çerçevede yatay sürükleme, dikey kaydırma serbest (touch-action: pan-y).
    let surukle = false;
    const konum = (e) => {
      const r = cerceve.getBoundingClientRect();
      const p = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      if (gsap.isTweening(cerceve)) {
        gsap.killTweensOf(cerceve);
        gsap.set(cerceve, { clearProps: 'clipPath' });
        tarama.style.opacity = 1;
      }
      cerceve.style.setProperty('--p', `${p}%`);
    };
    cerceve.addEventListener('pointerdown', (e) => {
      surukle = true;
      cerceve.classList.add('is-surukle');
      try { cerceve.setPointerCapture(e.pointerId); } catch {}
      if (e.pointerType === 'mouse') konum(e);
    });
    cerceve.addEventListener('pointermove', (e) => surukle && konum(e));
    const birak = () => { surukle = false; cerceve.classList.remove('is-surukle'); };
    cerceve.addEventListener('pointerup', birak);
    cerceve.addEventListener('pointercancel', birak);
    if (reducedMotion) {
      cerceve.style.setProperty('--p', `${DURAK}%`);
      tarama.style.opacity = 1;
      return;
    }
    const tl = gsap.timeline({ delay: 0.25 });
    tl.fromTo(cerceve, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' })
      .fromTo(el.querySelectorAll('.ph__aks'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(2.4)' }, 0.55)
      .fromTo(el.querySelector('.ph__olcu--yatay .ph__olcu-cizgi'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power2.inOut' }, 0.7)
      .fromTo(el.querySelector('.ph__olcu--dikey .ph__olcu-cizgi'), { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: 'power2.inOut' }, 0.8)
      .fromTo(el.querySelectorAll('.ph__olcu-yazi'), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.1 }, 1.3)
      // Eskizden yapıya: tarama çizgisi sağa geçer, arkasında gerçek yapı kalır; sonra geri gelip durur.
      .fromTo(tarama, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 1.4)
      .fromTo(cerceve, { '--p': '100%' }, { '--p': '0%', duration: 1.3, ease: 'power2.inOut', immediateRender: false }, 1.5)
      .fromTo(cerceve, { '--p': '0%' }, { '--p': `${DURAK}%`, duration: 0.9, ease: 'power3.out', immediateRender: false }, 2.85)
      .fromTo(el.querySelectorAll('.ph__etiket, .ph__ipucu'), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08 }, 3.2)
      .fromTo(el.querySelectorAll('.ph__antet > div'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.6)
      .fromTo(el.querySelector('.ph__kuzey'), { rotate: -120, opacity: 0 }, { rotate: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 1);

    // Masaüstü: artı imleci + koordinat okuma.
    if (!matchMedia('(pointer: fine) and (min-width: 900px)').matches) return;
    const arti = el.querySelector('.ph__arti');
    const yazi = el.querySelector('.ph__arti-yazi');
    let hx = 0, hy = 0, bekliyor = false;
    const ciz = () => {
      bekliyor = false;
      arti.style.setProperty('--ax', `${hx}px`);
      arti.style.setProperty('--ay', `${hy}px`);
      yazi.textContent = `x ${sayi(hx / 50, 2)} · y ${sayi(hy / 50, 2)}`;
    };
    const hareket = (e) => {
      const r = el.getBoundingClientRect();
      hx = e.clientX - r.left;
      hy = e.clientY - r.top;
      if (!bekliyor) { bekliyor = true; requestAnimationFrame(ciz); }
    };
    el.addEventListener('pointermove', hareket);
    el.addEventListener('pointerenter', () => el.classList.add('is-arti'));
    el.addEventListener('pointerleave', () => el.classList.remove('is-arti'));
  },
};

// --- Pafta listesi (hizmet özeti) --------------------------------------------------------

export const paftaListe = {
  render(d) {
    const list = d.hizmetler || [];
    if (!list.length) return '';
    return `
      <section class="k-bolum pl">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <h2 class="k-h2" data-bol>${esc(d.kurumsal?.hizmetOzetBaslik || 'Hizmetlerimiz')}</h2>
            ${rota('hizmetler', `Tüm hizmetler ${ok}`, 'k-link')}
          </div>
          <div class="pl__tablo" role="list">
            <div class="pl__bas" aria-hidden="true"><span>Pafta</span><span>İş</span><span>Kapsam</span><span>Süre</span></div>
            <div data-sira>
            ${list
              .map(
                (h, i) => `<a class="pl__satir" role="listitem" href="#/hizmetler" data-rota="hizmetler" style="--i:${i}">
                  <span class="pl__kod">${esc(h.kod || String(i + 1).padStart(2, '0'))}</span>
                  <span class="pl__ad">${esc(h.baslik)}</span>
                  <span class="pl__kisa">${esc(h.kisa || h.aciklama)}</span>
                  <span class="pl__sure">${esc(h.sure || '')}</span>
                  ${h.gorsel ? `<span class="pl__foto" aria-hidden="true"><img src="${esc(h.gorsel)}" alt="" loading="lazy"></span>` : ''}
                </a>`
              )
              .join('')}
            </div>
          </div>
          <p class="pl__not">Teslim edilecek paftaların listesi ve fiyat, yer ziyaretinden sonra işe başlamadan yazılı verilir.</p>
        </div>
      </section>`;
  },
};

// --- Ölçü bandı (rakamlar) ---------------------------------------------------------------

export const olcuBand = {
  render(d) {
    const buYil = new Date().getFullYear();
    const s = (d.istatistikler || []).map((x) => ({
      ...x,
      deger: (x.kurulustanHesapla || /yıldır/.test(x.etiket)) && d.isletme.kurulus ? buYil - d.isletme.kurulus : x.deger,
    }));
    if (!s.length) return '';
    return `
      <section class="k-bolum ob">
        <div class="k-kap">
          <p class="ob__ust"><span>Ölçüler</span><span>Birim: adet, m², yıl</span></p>
          <dl class="ob__liste">
            ${s
              .map(
                (x) => `<div class="ob__olcu">
                  <dd><span data-sayac="${x.deger}">${x.deger.toLocaleString('tr-TR')}</span><small>${esc(x.sonek || '')}</small></dd>
                  <span class="ob__cizgi" data-cizgi aria-hidden="true"></span>
                  <dt>${esc(x.etiket)}</dt>
                </div>`
              )
              .join('')}
          </dl>
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
              <p class="ih__ust"><span class="ph__kod">A-02</span>İmar ön hesabı</p>
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
