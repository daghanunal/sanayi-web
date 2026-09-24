// Halka: yuvarlak geometri üzerine kurulu lastik modülleri.
// tekerHero  → daire içinde jant fotoğrafı; kaydırdıkça teker yuvarlanır, çevresindeki yazı halkası döner.
// halkalar   → istatistikler dolan halka göstergeler.
// disOlcer   → imza modülü: mevsim seç, diş derinliğini kaydır; kadran, diş kesiti ve karar birlikte değişir.
// otelBolum  → lastik oteli; fotoğraf küçük bir daireden tüm ekrana açılır.
import { esc, waHref, telHref, openStatus, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { rota, ok } from '../_kurumsal/bolumler.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const buYil = new Date().getFullYear();
const mm = (x) => x.toFixed(1).replace('.', ',');

// --- Hero ---------------------------------------------------------------------------------

export const tekerHero = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const halkaYazi = 'LASTİK · JANT · ROT · BALANS · LASTİK OTELİ · NİTROJEN · PATLAK · ';
    const cipler = (d.hizmetler || []).filter((x) => x.sure).slice(0, 3);
    const tikler = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      const r1 = i % 6 ? 283 : 276;
      return `<line x1="${(300 + Math.cos(a) * r1).toFixed(1)}" y1="${(300 + Math.sin(a) * r1).toFixed(1)}" x2="${(300 + Math.cos(a) * 292).toFixed(1)}" y2="${(300 + Math.sin(a) * 292).toFixed(1)}"/>`;
    }).join('');
    const p = d.puan;
    return `
      <section class="k-hero hl-hero" aria-label="Giriş">
        <div class="k-kap hl-hero__ic">
          <div class="hl-hero__metin">
            <p class="hl-durum${st?.open ? ' is-acik' : ''}"><span class="hl-nokta" aria-hidden="true"></span>${esc(st ? st.text : d.isletme.sektor)}</p>
            <h1 class="k-h1 hl-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(h.birincil || 'Randevu isteyin')} ${ok}`)}
              ${rota(h.ikincilRota || 'hizmetler', esc(h.ikincil || 'Hizmetler'), 'k-btn k-btn--ikincil')}
            </div>
          </div>
          <div class="hl-teker">
            <div class="hl-teker__don" aria-hidden="true">
              <svg class="hl-teker__halka" viewBox="0 0 600 600">
                <defs><path id="hl-yol" d="M300,300 m-252,0 a252,252 0 1,1 504,0 a252,252 0 1,1 -504,0"/></defs>
                <g class="hl-tik">${tikler}</g>
                <text><textPath href="#hl-yol" textLength="1575">${esc(halkaYazi.repeat(2))}</textPath></text>
              </svg>
            </div>
            <figure class="hl-teker__foto"><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></figure>
            ${cipler.map((c, i) => `<span class="hl-cip hl-cip--${i}"><strong>${esc(c.sure)}</strong>${esc(c.baslik.split(' ')[0])}</span>`).join('')}
          </div>
        </div>
        <div class="k-kap">
          <dl class="hl-bilgi">
            <div><dt>Şaşmaz'da</dt><dd>${esc(yilEki(d.isletme.kurulus))} beri</dd></div>
            ${p ? `<div><dt>${esc(String(p.adet))} değerlendirme</dt><dd><span class="hl-yildiz">${icons.star}</span>${esc(String(p.ortalama).replace('.', ','))} / 5</dd></div>` : ''}
            <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${esc(d.iletisim.telefon)}</a></dd></div>
          </dl>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const img = el.querySelector('.hl-teker__foto img');
    const don = el.querySelector('.hl-teker__don');
    const foto = el.querySelector('.hl-teker__foto');
        // Açılış: teker yuvarlanarak gelir.
    gsap.fromTo(foto, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.3, ease: 'power3.out', delay: 0.15 });
    gsap.fromTo(img, { rotation: -140 }, { rotation: 0, duration: 1.6, ease: 'power3.out', delay: 0.15 });
    gsap.fromTo(don, { rotation: 90, opacity: 0 }, { rotation: 0, opacity: 1, duration: 1.6, ease: 'power3.out', delay: 0.25 });
    gsap.from(el.querySelectorAll('.hl-cip'), { scale: 0, opacity: 0, duration: 0.7, stagger: 0.12, delay: 0.9, ease: 'back.out(2)' });
    // Kaydırdıkça teker yuvarlanır, halka ters yöne döner.
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    tl.to(img, { rotation: 220, ease: 'none' }, 0).to(don, { rotation: -120, ease: 'none' }, 0);
  },
};

// --- Halka göstergeler ------------------------------------------------------------------------

export const halkalar = {
  render(d) {
    const s = (d.istatistikler || []).map((x) => {
      const yil = x.deger === 'kurulus' || x.kurulustanHesapla || /yıldır/.test(x.etiket);
      const deger = yil ? buYil - d.isletme.kurulus : Number(x.deger) || 0;
      return { ...x, deger, oran: Math.min(1, deger / (x.max || deger || 1)) };
    });
    if (!s.length) return '';
    const C = 2 * Math.PI * 52;
    return `
      <section class="k-bolum hl-halkalar">
        <div class="k-kap">
          <h2 class="k-h2" data-bol>${esc(d.kurumsal?.halkaBaslik || 'Rakamlarla biz')}</h2>
          <ul class="hl-halkalar__liste">
            ${s
              .map(
                (x) => `<li>
                  <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="hl-iz"/><circle cx="60" cy="60" r="52" class="hl-dolu" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - x.oran)).toFixed(1)}" data-oran="${x.oran}"/></svg>
                  <p class="hl-halka__sayi"><span><span data-sayac="${x.deger}">${x.deger.toLocaleString('tr-TR')}</span>${esc(x.sonek || '')}</span></p>
                  <p class="hl-halka__etiket">${esc(x.etiket)}</p>
                </li>`
              )
              .join('')}
          </ul>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const C = 2 * Math.PI * 52;
    el.querySelectorAll('.hl-dolu').forEach((c, i) => {
      gsap.fromTo(c, { strokeDashoffset: C }, { strokeDashoffset: C * (1 - Number(c.dataset.oran)), duration: 1.8, delay: i * 0.12, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
    });
  },
};

// --- Diş ölçer (imza modülü) --------------------------------------------------------------------

const MEVSIM = {
  yaz: { ad: 'Yaz', sinir: 1.6, degis: 3, izle: 4 },
  kis: { ad: 'Kış', sinir: 4, degis: 4.5, izle: 5.5 },
  dort: { ad: 'Dört mevsim', sinir: 4, degis: 4.5, izle: 5.5 },
};

function karar(v, m) {
  const M = MEVSIM[m];
  if (v < 1.6) return { sinif: 'kirmizi', baslik: 'Yasal sınırın altında', metin: 'Bu lastikle yola çıkmayın. Islak zeminde fren mesafesi çok uzar, trafikte ceza sebebidir. Aynı gün değiştirelim.' };
  if (v < M.sinir) return { sinif: 'kirmizi', baslik: 'Kış için yetersiz', metin: `Kış lastiğinde diş en az 4 mm olmalı. ${mm(v)} mm ile karda ve buzda lastik tutmaz; kış gelmeden yenileyelim.` };
  if (v < M.degis) return { sinif: 'turuncu', baslik: 'Değişim zamanı', metin: 'Yasal sınırın üstünde ama ıslak yolda tutuş belirgin düşmüş durumda. Yeni takım için ebadınızı yazın, fiyatı baştan söyleyelim.' };
  if (v < M.izle) return { sinif: 'sari', baslik: 'Takipte kalın', metin: 'Lastik iş görüyor. Bir sonraki mevsim değişiminde tekrar ölçelim; tek taraftan yiyorsa rot ayarına bakalım.' };
  return { sinif: 'yesil', baslik: 'Lastik iyi durumda', metin: 'Diş derinliği yerinde. Basıncı ayda bir kontrol edin, lastiklerin eşit aşınması için 10.000 km\'de bir yer değiştirin.' };
}

const RENK = { kirmizi: '#ff4d5e', turuncu: '#ff8a3d', sari: '#ffc53d', yesil: '#1fc79b' };

export const disOlcer = {
  render(d) {
    const m = d.mevsim || {};
    // Kadran: 0-8 mm, 270 derece yay.
    const A0 = 135, A1 = 405;
    const nokta = (deg, r) => {
      const a = (deg * Math.PI) / 180;
      return [(160 + Math.cos(a) * r).toFixed(1), (160 + Math.sin(a) * r).toFixed(1)];
    };
    const tikler = Array.from({ length: 33 }, (_, i) => {
      const deg = A0 + ((A1 - A0) * i) / 32;
      const [x1, y1] = nokta(deg, i % 4 ? 116 : 108);
      const [x2, y2] = nokta(deg, 124);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${i % 4 ? '' : ' class="uzun"'}/>`;
    }).join('');
    const rakamlar = [0, 2, 4, 6, 8]
      .map((n) => {
        const [x, y] = nokta(A0 + ((A1 - A0) * n) / 8, 90);
        return `<text x="${x}" y="${y}">${n}</text>`;
      })
      .join('');
    return `
      <section class="k-bolum hl-olcer" aria-labelledby="hl-olcer-baslik">
        <div class="k-kap">
          <div class="hl-olcer__bas">
            <p class="hl-etiket">Diş ölçer</p>
            <h2 class="k-h2" id="hl-olcer-baslik" data-bol>Lastiğin kaç milimetre kaldı?</h2>
            <p class="k-lead">Mevsimi seçin, diş derinliğini kaydırın. Ölçeriniz yoksa uğrayın; ölçümü ücretsiz yaparız.</p>
          </div>
          <div class="hl-olcer__ic">
            <div class="hl-olcer__gorsel">
              <svg class="hl-kadran" viewBox="0 0 320 320" aria-hidden="true">
                <path class="hl-kadran__iz" d=""/>
                <g class="hl-kadran__bolge"></g>
                <g class="hl-kadran__tik">${tikler}</g>
                <g class="hl-kadran__rakam">${rakamlar}</g>
                <g class="hl-kadran__ibre"><line x1="160" y1="160" x2="160" y2="52"/><circle cx="160" cy="160" r="14"/><circle cx="160" cy="160" r="5" class="ic"/></g>
              </svg>
              <p class="hl-okuma"><output class="hl-okuma__deger">8,0</output><span>mm</span></p>
              <svg class="hl-kesit" viewBox="0 0 420 150" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
                <text class="hl-kesit__not" x="0" y="12">diş kesiti</text>
                <rect class="hl-kesit__govde" x="0" y="118" width="420" height="32" rx="10"/>
                <g class="hl-kesit__dis"></g>
                <line class="hl-kesit__sinir" x1="0" x2="420" y1="0" y2="0"/>
                <text class="hl-kesit__yazi" x="416" y="0">yasal sınır</text>
              </svg>
            </div>
            <div class="hl-olcer__kontrol">
              <fieldset class="hl-mevsim">
                <legend>Lastik türü</legend>
                ${Object.entries(MEVSIM).map(([k, x], i) => `<label><input type="radio" name="hl-mevsim" value="${k}"${i === 0 ? ' checked' : ''}><span>${x.ad}</span></label>`).join('')}
              </fieldset>
              <label class="hl-kaydir">
                <span class="hl-kaydir__ust"><span>Diş derinliği</span><strong class="hl-kaydir__deger">8,0 mm</strong></span>
                <input type="range" min="0.5" max="8" step="0.1" value="8" aria-label="Diş derinliği, milimetre">
                <span class="hl-kaydir__alt" aria-hidden="true"><span>0,5</span><span>yeni lastik 8</span></span>
              </label>
              <div class="hl-karar" aria-live="polite">
                <p class="hl-karar__baslik"></p>
                <p class="hl-karar__metin"></p>
              </div>
              <p class="hl-mevsim__not"></p>
              <a class="k-btn hl-olcer__wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>Ölçümü WhatsApp'tan yaz</span></a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const m = d.mevsim || {};
    const inp = el.querySelector('input[type=range]');
    const ibre = el.querySelector('.hl-kadran__ibre');
    const okuma = el.querySelector('.hl-okuma__deger');
    const kDeger = el.querySelector('.hl-kaydir__deger');
    const kb = el.querySelector('.hl-karar__baslik');
    const km = el.querySelector('.hl-karar__metin');
    const kutu = el.querySelector('.hl-karar');
    const not = el.querySelector('.hl-mevsim__not');
    const wa = el.querySelector('.hl-olcer__wa');
    const disG = el.querySelector('.hl-kesit__dis');
    const sinir = el.querySelector('.hl-kesit__sinir');
    const sinirY = el.querySelector('.hl-kesit__yazi');
    const bolge = el.querySelector('.hl-kadran__bolge');
    const iz = el.querySelector('.hl-kadran__iz');
    const A0 = 135, A1 = 405;
    const aci = (v) => A0 + ((A1 - A0) * v) / 8;
    const yay = (a, b, r) => {
      const p = (deg) => {
        const t = (deg * Math.PI) / 180;
        return `${(160 + Math.cos(t) * r).toFixed(2)} ${(160 + Math.sin(t) * r).toFixed(2)}`;
      };
      return `M${p(a)} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${p(b)}`;
    };
    iz.setAttribute('d', yay(A0, A1, 136));

    // Diş kesiti: 6 blok, aralarda oluk; blok yüksekliği = derinlik.
    const OLC = 12; // 1 mm = 12 birim
    const TAB = 118;
    const bloklar = [];
    const G = 5, gen = 420 / G;
    let html = '';
    for (let i = 0; i < G; i++) {
      html += `<rect x="${(i * gen + 9).toFixed(1)}" width="${(gen - 18).toFixed(1)}" rx="8"/>`;
    }
    // Aşınma göstergesi (1,6 mm çıkıntı) oluk içinde.
    for (let i = 1; i < G; i++) html += `<rect class="twi" x="${(i * gen - 9).toFixed(1)}" y="${TAB - 1.6 * OLC}" width="18" height="${1.6 * OLC + 2}"/>`;
    disG.innerHTML = html;
    disG.querySelectorAll('rect:not(.twi)').forEach((r) => bloklar.push(r));

    let mevsim = 'yaz';
    let deger = 8;
    let sonBolge = '';

    const bolgeCiz = () => {
      const M = MEVSIM[mevsim];
      const dilim = [
        [0, 1.6, 'kirmizi'],
        [1.6, M.sinir, 'kirmizi'],
        [M.sinir, M.degis, 'turuncu'],
        [M.degis, M.izle, 'sari'],
        [M.izle, 8, 'yesil'],
      ].filter(([a, b]) => b > a);
      const yuzde = (x) => `${(((x - 0.5) / 7.5) * 100).toFixed(1)}%`;
      inp.style.setProperty('--hl-iz', `linear-gradient(90deg, ${dilim.map(([a, b, s]) => `${RENK[s]} ${yuzde(Math.max(a, 0.5))} ${yuzde(b)}`).join(', ')})`);
      bolge.innerHTML = dilim.map(([a, b, s]) => `<path d="${yay(aci(a) + 0.6, aci(b) - 0.6, 136)}" stroke="${RENK[s]}"/>`).join('');
      const y = TAB - M.sinir * OLC;
      sinir.setAttribute('y1', y);
      sinir.setAttribute('y2', y);
      sinirY.setAttribute('y', y - 8);
      sinirY.textContent = `yasal sınır ${mm(M.sinir)} mm`;
      const mv = mevsim === 'yaz' ? m.yaz : m.kis;
      not.textContent = mv ? `${mv.baslik}: ${mv.metin}${mv.zaman ? ` Takma zamanı: ${mv.zaman}.` : ''}` : '';
      if (mevsim === 'dort') not.textContent = 'Dört mevsim lastiği kışın kış lastiği sayılır; üzerinde kar tanesi ya da M+S işareti olmalı ve dişi en az 4 mm olmalı.';
    };

    const ciz = () => {
      const v = deger;
      gsap.set(ibre, { rotation: aci(v) - 270, svgOrigin: '160 160' });
      okuma.textContent = mm(v);
      kDeger.textContent = `${mm(v)} mm`;
      const h = v * OLC;
      bloklar.forEach((r) => {
        r.setAttribute('y', TAB - h);
        r.setAttribute('height', h + 10);
      });
      const k = karar(v, mevsim);
      if (k.sinif + k.baslik !== sonBolge) {
        sonBolge = k.sinif + k.baslik;
        kutu.dataset.durum = k.sinif;
        el.style.setProperty('--hl-durum', RENK[k.sinif]);
        kb.textContent = k.baslik;
        km.textContent = k.metin;
      }
      wa.href = waHref(d, `Merhaba ${d.isletme.ad}, ${MEVSIM[mevsim].ad.toLowerCase()} lastiğimin diş derinliği yaklaşık ${mm(v)} mm. Kontrol ve fiyat için ne zaman gelebilirim?`);
    };

    inp.addEventListener('input', () => {
      tw?.kill();
      deger = Number(inp.value);
      ciz();
    });
    el.querySelectorAll('input[name=hl-mevsim]').forEach((r) =>
      r.addEventListener('change', () => {
        mevsim = r.value;
        sonBolge = '';
        bolgeCiz();
        ciz();
      })
    );
    bolgeCiz();
    ciz();

    // Görünür olunca ibre yeni lastikten aşınmış lastiğe iner.
    let tw = null;
    if (!reducedMotion) {
      const o = { v: 8 };
      tw = gsap.to(o, {
        v: 2.4,
        duration: 2.6,
        ease: 'power2.inOut',
        scrollTrigger: { trigger: el.querySelector('.hl-olcer__ic'), start: 'top 70%', once: true },
        onUpdate: () => {
          deger = Math.round(o.v * 10) / 10;
          inp.value = deger;
          ciz();
        },
      });
    } else {
      deger = 2.4;
      inp.value = deger;
      ciz();
    }
  },
};

// --- Lastik oteli -----------------------------------------------------------------------------

export const otelBolum = {
  render(d) {
    const o = d.otel;
    if (!o) return '';
    return `
      <section class="hl-otel" aria-labelledby="hl-otel-baslik">
        <div class="hl-otel__sahne">
          <figure class="hl-otel__foto"><img src="${o.gorsel}" alt="Lastik deposunda raflar ve üst üste dizili lastikler" loading="lazy"></figure>
          <div class="k-kap hl-otel__metin">
            <p class="hl-etiket hl-etiket--acik">Lastik oteli</p>
            <h2 class="k-h2" id="hl-otel-baslik">Balkon boşalsın, lastik rafta beklesin.</h2>
            <p class="hl-otel__p">${esc(o.metin)}</p>
            ${o.maddeler ? `<ul class="hl-otel__cip">${o.maddeler.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            ${rota(`iletisim?konu=${encodeURIComponent('Lastik oteli')}`, `Yer ayırtın ${ok}`, 'k-btn hl-otel__btn')}
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const foto = el.querySelector('.hl-otel__foto');
    const metin = el.querySelector('.hl-otel__metin');
    gsap
      .timeline({ scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 5%', scrub: 0.5 } })
      .fromTo(foto, { clipPath: 'circle(30% at 50% 40%)' }, { clipPath: 'circle(80% at 50% 40%)', ease: 'none' }, 0)
      .fromTo(foto.querySelector('img'), { scale: 1.25, rotation: -8 }, { scale: 1, rotation: 0, ease: 'none' }, 0);
    gsap.from(metin.children, { y: 30, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: metin, start: 'top 80%', once: true } });
  },
};

export { ScrollTrigger };
