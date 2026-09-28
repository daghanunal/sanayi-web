// Halka: yuvarlak geometri üzerine kurulu lastik modülleri.
// tekerHero  → künye (ad, iş, adres, bugün, telefon, Ara / WhatsApp / Yol tarifi) + daire içinde jant fotoğrafı;
//              çevresindeki hizmet adları halkası kaydırdıkça döner.
// halkalar   → yalnız olgular (kuruluştan geçen yıl, haftada açık gün) dolan halka göstergelerde.
// disOlcer   → imza modülü: mevsim seç, diş derinliğini kaydır; kadran, diş kesiti ve karar birlikte değişir.
// otelBolum  → lastik oteli; fotoğraf küçük bir daireden tüm ekrana açılır.
import { esc, waHref, telHref, mapsHref, gunDurumu, kisaAdres, acikGunSayisi, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { rota, ok } from '../_kurumsal/bolumler.js';

const buYil = new Date().getFullYear();
const mm = (x) => x.toFixed(1).replace('.', ',');

// --- Hero ---------------------------------------------------------------------------------

export const tekerHero = {
  render(d, { tema }) {
    const b = d.saatler ? gunDurumu(d.saatler) : null;
    const halkaYazi = 'Lastik · Jant · Rot ayarı · Balans · Lastik oteli · Nitrojen · Patlak tamiri · ';
    const tikler = Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      const r1 = i % 6 ? 283 : 276;
      return `<line x1="${(300 + Math.cos(a) * r1).toFixed(1)}" y1="${(300 + Math.sin(a) * r1).toFixed(1)}" x2="${(300 + Math.cos(a) * 292).toFixed(1)}" y2="${(300 + Math.sin(a) * 292).toFixed(1)}"/>`;
    }).join('');
    return `
      <section class="k-hero k-hero--kunye hl-hero" aria-label="Künye">
        <div class="k-kap hl-hero__ic">
          <div class="hl-hero__metin">
            <h1 class="k-h1 hl-hero__baslik" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="k-lead hl-hero__tanim">${esc(d.isletme.tanim || d.isletme.sektor)}</p>
            <dl class="k-kunye hl-kunye">
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
          <div class="hl-teker">
            <div class="hl-teker__don" aria-hidden="true">
              <svg class="hl-teker__halka" viewBox="0 0 600 600">
                <defs><path id="hl-yol" d="M300,300 m-252,0 a252,252 0 1,1 504,0 a252,252 0 1,1 -504,0"/></defs>
                <g class="hl-tik">${tikler}</g>
                <text><textPath href="#hl-yol" textLength="1575">${esc(halkaYazi.repeat(2))}</textPath></text>
              </svg>
            </div>
            <figure class="hl-teker__foto"><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></figure>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const don = el.querySelector('.hl-teker__don');
    const foto = el.querySelector('.hl-teker__foto');
    // Açılış (~1,4 sn): fotoğraf büyüyerek gelir, yazı halkası dönerek oturur. Fotoğraf dönmez (gerçek fotoğraf).
    gsap.fromTo(foto, { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.1, ease: 'power3.out', delay: 0.1 });
    gsap.fromTo(don, { rotation: 90, autoAlpha: 0 }, { rotation: 0, autoAlpha: 1, duration: 1.4, ease: 'power3.out', delay: 0.15 });
    // Kaydırdıkça yazı halkası döner, fotoğraf hafifçe yaklaşır.
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    tl.to(don, { rotation: -140, ease: 'none' }, 0).to(foto.querySelector('img'), { scale: 1.08, ease: 'none' }, 0);
  },
};

// --- Halka göstergeler ------------------------------------------------------------------------

export const halkalar = {
  render(d) {
    // Yalnız veriden türeyen olgular: kuruluştan geçen yıl (halka dolu) ve haftada açık gün (7 üzerinden).
    const s = [
      { deger: buYil - d.isletme.kurulus, sonek: ' yıl', etiket: "Şaşmaz Oto Sanayi Sitesi'nde", oran: 1 },
      ...(d.saatler ? [{ deger: acikGunSayisi(d.saatler), sonek: ' gün', etiket: 'haftada açık', oran: acikGunSayisi(d.saatler) / 7 }] : []),
    ];
    const C = 2 * Math.PI * 52;
    return `
      <section class="k-bolum hl-halkalar" aria-labelledby="hl-halka-baslik">
        <div class="k-kap">
          <h2 class="sr-only" id="hl-halka-baslik">${esc(d.kurumsal?.halkaBaslik || 'Rakamlar')}</h2>
          <ul class="hl-halkalar__liste">
            ${s
              .map(
                (x) => `<li>
                  <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="hl-iz"/><circle cx="60" cy="60" r="52" class="hl-dolu" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - x.oran)).toFixed(1)}" data-oran="${x.oran}"/></svg>
                  <p class="hl-halka__sayi"><span><span data-sayac="${x.deger}">${x.deger.toLocaleString('tr-TR')}</span>${esc(x.sonek)}</span></p>
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
  yaz: { ad: 'Yaz', sinir: 1.6, degis: 3, izle: 4, not: "Yaz lastiği hava 7°C'nin üstündeyken takılır. Yasal alt sınır 1,6 mm'dir." },
  kis: { ad: 'Kış', sinir: 4, degis: 4.5, izle: 5.5, not: "Kış lastiği hava 7°C'nin altına düşünce takılır, Ankara'da bu genellikle Kasım başıdır. Diş en az 4 mm olmalıdır." },
  dort: { ad: 'Dört mevsim', sinir: 4, degis: 4.5, izle: 5.5, not: 'Üzerinde M+S ya da kar tanesi işareti olan dört mevsim lastiği kışın kış lastiği sayılır. Dişi en az 4 mm olmalıdır.' },
};

function karar(v, m) {
  const M = MEVSIM[m];
  if (v < 1.6) return { sinif: 'kirmizi', baslik: 'Yasal sınırın altında', metin: 'Islak zeminde fren mesafesi çok uzar, bu lastikle trafiğe çıkmak cezalıdır. Lastiğin aynı gün değişmesi gerekir.' };
  if (v < M.sinir) return { sinif: 'kirmizi', baslik: 'Kış için yetersiz', metin: `Kış lastiğinde diş en az 4 mm olmalıdır. ${mm(v)} mm dişle lastik karda ve buzda tutmaz.` };
  if (v < M.degis) return { sinif: 'turuncu', baslik: 'Değişim zamanı', metin: 'Diş yasal sınırın üstünde ama ıslak yolda tutuş belirgin düşer. Lastiğin bu mevsim değişmesi gerekir.' };
  if (v < M.izle) return { sinif: 'sari', baslik: 'Takip gerekir', metin: 'Lastik iş görür. Bir sonraki mevsim değişiminde yeniden ölçülür; tek taraftan yiyorsa rot ayarına bakılır.' };
  return { sinif: 'yesil', baslik: 'Lastik iyi durumda', metin: "Diş derinliği yeterli. Basınç ayda bir kontrol edilir, lastiklerin yeri 10.000 km'de bir değiştirilirse aşınma eşit olur." };
}

const RENK = { kirmizi: '#ff4d5e', turuncu: '#ff8a3d', sari: '#ffc53d', yesil: '#1fc79b' };

export const disOlcer = {
  render(d) {
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
            <h2 class="k-h2" id="hl-olcer-baslik" data-bol>Diş derinliği ölçer</h2>
            <p class="k-lead">Lastik türü seçilip diş derinliği kaydırılınca lastiğin durumu görünür. Diş derinliği dükkânda da ölçülür.</p>
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
              <a class="k-btn hl-olcer__wa" href="#" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan bilgi alın</span></a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
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
      not.textContent = MEVSIM[mevsim].not;
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
            <h2 class="k-h2" id="hl-otel-baslik">Lastik oteli</h2>
            <p class="hl-otel__p">${esc(o.metin)}</p>
            ${o.maddeler ? `<ul class="hl-otel__cip">${o.maddeler.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            ${rota(`iletisim?konu=${encodeURIComponent('Lastik oteli')}`, `Lastik oteli için bilgi alın ${ok}`, 'k-btn hl-otel__btn')}
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
