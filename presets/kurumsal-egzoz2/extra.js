// Ozalit: egzoz hattının mavi baskı teknik resmi. Modüller:
//  pafta   — ana sayfa girişi: yan görünüş çizimi (açılışta çizilir, gaz akar, mobilde kamera hat boyunca gezer) + antet
//  parcalar— parça listesi: her parçanın detay çizimi, belirtisi, işi ve süresi
//  duman   — duman rengi seçici: uçtan çıkan dumanın rengine göre ne anlama geldiği
//  olcu    — ölçüm föyü: önce/sonra anahtarı, değerler sayarak iner, KALDI damgası GEÇTİ olur
//  mesai   — açık mı, saatler, adres ve yaklaşınca yüklenen harita
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { yilEki } from '../_kurumsal/bolumler.js';

gsap.registerPlugin(DrawSVGPlugin);

const buyuk = (s) => String(s ?? '').toLocaleUpperCase('tr-TR');
const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// --- Çizim ------------------------------------------------------------------------------
// viewBox 0 0 1240 400; boru ekseni y=240. Parça grupları data-p ile yolculuk id'lerine bağlanır.
const PARCA = {
  manifold: { kutu: '168 128 132 150', balon: [236, 186], kisa: 'Manifold' },
  katalitik: { kutu: '326 190 148 100', balon: [400, 212], kisa: 'Katalitik' },
  dpf: { kutu: '488 188 164 104', balon: [570, 206], kisa: 'DPF' },
  susturucu: { kutu: '706 176 258 128', balon: [835, 190], kisa: 'Susturucu' },
  uc: { kutu: '1062 190 170 100', balon: [1117, 216], kisa: 'Egzoz ucu' },
};
const BALON_X = { manifold: 250, katalitik: 400, dpf: 570, susturucu: 835, uc: 1110 };

function boru(x1, x2) {
  return `<path class="pz-c" d="M${x1} 228H${x2}M${x1} 252H${x2}"/>`;
}

function cizim(pfx, { balonlar = true, olcu = true, gaz = true, duman = true } = {}) {
  const petek = [];
  for (let x = 366; x <= 434; x += 9) petek.push(`M${x} 216V264`);
  const filtre = [];
  for (let x = 530; x <= 610; x += 10) filtre.push(`M${x} 210L${x + 10} 270`);
  const balon = balonlar
    ? Object.entries(PARCA)
        .map(([id, p], i) => {
          const bx = BALON_X[id];
          const [px, py] = p.balon;
          return `<g class="pz-balon" data-b="${id}">
            <path class="pz-c pz-ince" d="M${bx} 92L${px} ${py}"/>
            <circle class="pz-nokta" cx="${px}" cy="${py}" r="4"/>
            <circle class="pz-c" cx="${bx}" cy="70" r="20"/>
            <text class="pz-no" x="${bx}" y="77">${i + 1}</text>
            <text class="pz-etiket" x="${bx}" y="34">${buyuk(p.kisa)}</text>
          </g>`;
        })
        .join('')
    : '';
  return `
    <defs>
      <marker id="${pfx}-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0 1L10 5L0 9Z" fill="currentColor"/></marker>
    </defs>
    <g class="pz-motor">
      <rect class="pz-c" x="40" y="110" width="150" height="190" rx="6"/>
      <path class="pz-c pz-ince" d="M40 150H190M40 262H190M70 110V96H160V110M60 300Q115 330 170 300"/>
      <path class="pz-c pz-ince" d="M62 172V240M86 172V240M110 172V240M134 172V240M158 172V240"/>
      <text class="pz-kucuk" x="115" y="210">MOTOR</text>
    </g>
    <g class="pz-p" data-p="manifold">
      <path class="pz-c" d="M190 160C236 160 244 222 276 234M190 184C230 184 240 226 276 238M190 208C226 208 244 234 276 242M190 232C224 232 250 244 276 246"/>
      <rect class="pz-c" x="276" y="220" width="10" height="40"/>
    </g>
    <path class="pz-c" d="M286 228H300M286 252H300"/>
    <path class="pz-c pz-ince" d="M300 226L304 254L308 226L312 254L316 226L320 254L324 226L328 254L332 226"/>
    ${boru(332, 340)}
    <g class="pz-p" data-p="katalitik">
      <path class="pz-c" d="M340 240L360 212H440L460 240L440 268H360Z"/>
      <path class="pz-c pz-ince" d="${petek.join('')}"/>
    </g>
    ${boru(460, 500)}
    <g class="pz-p" data-p="dpf">
      <path class="pz-c" d="M500 240L522 204H618L640 240L618 276H522Z"/>
      <path class="pz-c pz-ince" d="${filtre.join('')}"/>
      <circle class="pz-c pz-ince" cx="532" cy="192" r="6"/><path class="pz-c pz-ince" d="M532 198V204"/>
      <circle class="pz-c pz-ince" cx="608" cy="192" r="6"/><path class="pz-c pz-ince" d="M608 198V204"/>
    </g>
    ${boru(640, 720)}
    <g class="pz-p" data-p="susturucu">
      <rect class="pz-c" x="720" y="190" width="230" height="100" rx="46"/>
      <path class="pz-c pz-ince" d="M790 196V284M860 192V288M910 196V284"/>
      <path class="pz-c pz-ince pz-delik" d="M740 240H930"/>
    </g>
    ${boru(950, 1085)}
    <g class="pz-p" data-p="uc">
      <path class="pz-c" d="M1085 226L1150 212V268L1085 254Z"/>
      <ellipse class="pz-c" cx="1150" cy="240" rx="7" ry="28"/>
    </g>
    <g class="pz-aski">
      <path class="pz-c pz-ince" d="M480 128V228M690 128V228M1010 128V228M470 128H490M680 128H700M1000 128H1020"/>
      <circle class="pz-c pz-ince" cx="480" cy="170" r="8"/><circle class="pz-c pz-ince" cx="690" cy="170" r="8"/><circle class="pz-c pz-ince" cx="1010" cy="170" r="8"/>
    </g>
    <path class="pz-eksen" d="M196 240H1200"/>
    ${gaz ? `<path class="pz-gaz" d="M190 184C230 184 240 226 276 240H1160"/>` : ''}
    ${duman ? `<g class="pz-duman"><circle cx="1178" cy="236" r="10"/><circle cx="1196" cy="226" r="15"/><circle cx="1218" cy="240" r="19"/></g>` : ''}
    ${balon}
    ${
      olcu
        ? `<g class="pz-olcu">
            <path class="pz-c pz-ince" d="M40 306V360M1150 272V360"/>
            <path class="pz-c pz-ince" d="M40 346H520M670 346H1150" marker-start="url(#${pfx}-ok)" marker-end="url(#${pfx}-ok)"/>
            <text class="pz-kucuk" x="595" y="352">MOTORDAN UCA</text>
            <text class="pz-kucuk pz-sol" x="40" y="392">YAN GÖRÜNÜŞ · ÖLÇEKSİZ</text>
          </g>`
        : ''
    }`;
}

const svg = (pfx, kutu, secenek, sinif = 'pz-cizim') =>
  `<svg class="${sinif}" viewBox="${kutu}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${cizim(pfx, secenek)}</svg>`;

const kaydir = (lenis, hedef) => {
  if (lenis) lenis.scrollTo(hedef, { offset: -70 });
  else hedef.scrollIntoView({ behavior: 'smooth' });
};

// --- pafta: giriş --------------------------------------------------------------------------
export const pafta = {
  render(d, ctx) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const antet = [
      ['Firma', d.isletme.ad],
      ['İş', d.isletme.sektor],
      ['Telefon', d.iletisim.telefon, telHref(d)],
      ['Bugün', st?.text],
      ['Kuruluş', d.isletme.kurulus ? `${yilEki(d.isletme.kurulus)} beri` : ''],
      ['Pafta', 'EGZ-01 · Rev. ' + new Date().getFullYear()],
    ].filter(([, v]) => v);
    return `
      <section class="k-hero pz-hero" aria-label="Giriş">
        <div class="k-kap pz-hero__ic">
          <p class="pz-ust"><span class="pz-ust__kod">EGZ-01</span><span>${esc(d.isletme.sektor)}</span><span>Şaşmaz'da ${esc(d.isletme.kurulus ? yilEki(d.isletme.kurulus) : '')} beri</span></p>
          <h1 class="k-h1 pz-baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
          <figure class="pz-sahne">
            <div class="pz-kaydir">${svg('ph', '0 0 1240 400', {})}</div>
            <figcaption><span>Egzoz hattı, yan görünüş</span><span class="pz-sahne__ipucu" aria-hidden="true">Hat boyunca kayıyor</span></figcaption>
          </figure>
          <div class="pz-hero__metin">
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="#/iletisim" data-rota="iletisim">${esc(h.birincil || 'Randevu')} ${ok}</a>
              <button type="button" class="k-btn k-btn--ikincil" data-git=".pz-parcalar">${esc(h.ikincil || 'Parça listesi')}</button>
            </div>
          </div>
          <figure class="pz-foto" data-perde><img src="${ctx.tema.heroGorsel}" alt="${esc(ctx.tema.heroAlt || '')}" fetchpriority="high"><figcaption>Şekil 1 · Lift kontrolü</figcaption></figure>
        </div>
        <div class="k-kap">
          <dl class="pz-antet">${antet
            .map(([e, v, href]) => `<div><dt>${esc(e)}</dt><dd>${href ? `<a href="${href}">${esc(v)}</a>` : esc(v)}</dd></div>`)
            .join('')}</dl>
        </div>
      </section>`;
  },
  mount(el, d, ctx) {
    el.querySelector('[data-git]')?.addEventListener('click', (e) => {
      const hedef = document.querySelector(e.currentTarget.dataset.git);
      if (hedef) kaydir(ctx.lenis, hedef);
    });
    if (reducedMotion) return;
    const sahne = el.querySelector('.pz-sahne');
    const ciz = sahne.querySelectorAll('.pz-c');
    const gaz = sahne.querySelector('.pz-gaz');
    const duman = sahne.querySelectorAll('.pz-duman circle');
    const balon = sahne.querySelectorAll('.pz-balon');
    const tl = gsap.timeline({ delay: 0.35 });
    tl.from(ciz, { drawSVG: 0, duration: 1.3, stagger: 0.012, ease: 'power2.inOut' })
      .from(balon, { opacity: 0, y: 10, duration: 0.4, stagger: 0.08 }, '-=0.5')
      .from(el.querySelectorAll('.pz-antet > div'), { opacity: 0, y: 12, duration: 0.4, stagger: 0.05 }, '-=0.6');

    // Döngüler: gaz akışı, duman, mobilde kamera. Ekran dışında durur.
    const donguler = [];
    if (gaz) donguler.push(gsap.fromTo(gaz, { strokeDashoffset: 0 }, { strokeDashoffset: -80, duration: 1.1, ease: 'none', repeat: -1 }));
    duman.forEach((c, i) =>
      donguler.push(
        gsap.fromTo(c, { opacity: 0, x: -10, scale: 0.5, svgOrigin: '1178 236' }, { opacity: 0.9, x: 20 + i * 6, scale: 1.25, duration: 1.8, ease: 'sine.out', repeat: -1, delay: i * 0.6, yoyo: false })
      )
    );
    if (innerWidth < 900) {
      const k = sahne.querySelector('.pz-kaydir');
      donguler.push(gsap.fromTo(k, { xPercent: 0 }, { xPercent: -(1 - 100 / 230) * 100, duration: 9, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 1.6, repeatDelay: 0.8 }));
    }
    ScrollTrigger.create({
      trigger: sahne,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (s) => donguler.forEach((t) => (s.isActive ? t.resume() : t.pause())),
    });
  },
};

// --- parcalar: parça listesi ------------------------------------------------------------
export const parcalar = {
  render(d) {
    const y = d.yolculuk || [];
    if (!y.length) return '';
    const sure = (b) => d.hizmetler?.find((h) => h.baslik === b)?.sure;
    return `
      <section class="k-bolum pz-parcalar" aria-labelledby="pz-parca-bas">
        <div class="k-kap">
          <div class="pz-bas">
            <p class="pz-etiket-ust">Parça listesi · ${y.length} kalem</p>
            <h2 class="k-h2" id="pz-parca-bas" data-bol>Hattın her parçasına tek tek bakarız.</h2>
            <p class="k-lead">Sorun hangi parçadaysa yalnızca onu onarırız. Belirtiyi okuyun, parçayı bulun, fotoğrafını ya da sesini WhatsApp'tan gönderin.</p>
          </div>
          <ol class="pz-liste">
            ${y
              .map((p, i) => {
                const part = PARCA[p.id];
                const mesaj = `Merhaba ${d.isletme.ad}, aracımın ${p.durak.toLocaleLowerCase('tr-TR')} tarafına baktırmak istiyorum.`;
                return `<li class="pz-kalem" data-k="${esc(p.id)}">
                  <div class="pz-kalem__cizim">
                    ${part ? svg(`pk${i}`, part.kutu, { balonlar: false, olcu: false, gaz: false, duman: p.id === 'uc' }, 'pz-cizim pz-cizim--detay') : ''}
                    <span class="pz-kalem__no" aria-hidden="true">${i + 1}</span>
                    <span class="pz-kalem__detay">Detay ${String.fromCharCode(65 + i)}</span>
                  </div>
                  <div class="pz-kalem__metin">
                    <p class="pz-kalem__ad">${esc(p.durak)}</p>
                    <h3 class="k-h3">${esc(p.baslik)}</h3>
                    <p>${esc(p.metin)}</p>
                  </div>
                  <dl class="pz-kalem__meta">
                    ${p.hizmet ? `<div><dt>İş</dt><dd>${esc(p.hizmet)}</dd></div>` : ''}
                    ${sure(p.hizmet) ? `<div><dt>Süre</dt><dd>${esc(sure(p.hizmet))}</dd></div>` : ''}
                    <div class="pz-kalem__git"><a href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu parça için yazın</span></a></div>
                  </dl>
                </li>`;
              })
              .join('')}
          </ol>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    el.querySelectorAll('.pz-kalem').forEach((li) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 82%', once: true } });
      tl.from(li.querySelectorAll('.pz-c'), { drawSVG: 0, duration: 0.9, stagger: 0.02, ease: 'power2.inOut' })
        .from(li.querySelector('.pz-kalem__no'), { scale: 0, duration: 0.45, ease: 'back.out(2)' }, 0.2)
        .from(li.querySelectorAll('.pz-kalem__metin > *, .pz-kalem__meta > div'), { y: 14, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.1);
    });
  },
};

// --- duman: duman rengi seçici ----------------------------------------------------------
const DUMAN = [
  { id: 'siyah', ad: 'Siyah', renk: '#11141c', baslik: 'Fazla yakıt yanıyor.', metin: 'Tıkanan hava filtresi, enjektör ya da dolan DPF ve katalitik siyah duman yaptırır. Dizelde muayenedeki duman değeri çoğu zaman buradan kalır. Önce ölçeriz; sorun egzoz tarafındaysa aynı gün çözeriz, motor tarafındaysa açıkça söyleriz.', is: 'DPF temizleme' },
  { id: 'mavi', ad: 'Mavi-gri', renk: '#8fa9e8', baslik: 'Motor yağ yakıyor.', metin: 'Mavi-gri duman çoğu zaman segman, subap lastiği ya da turbodan gelir; egzozdan değil motordan kaynaklanır. Ölçümle teyit eder, doğru ustaya yönlendiririz. Yağ yakan araç zamanla katalitiği de tıkar, onu da kontrol ederiz.', is: 'Katalitik konvertör' },
  { id: 'beyaz', ad: 'Beyaz', renk: '#ffffff', baslik: 'Su buharı ya da antifriz.', metin: 'Soğuk sabahlarda çıkan ince beyaz buhar normaldir, motor ısınınca kaybolur. Motor ısındıktan sonra da yoğun, tatlı kokulu beyaz duman sürüyorsa conta arızası olabilir. Kontrol eder, sebebini söyleriz.', is: 'Egzoz emisyon hazırlığı' },
  { id: 'yok', ad: 'Görünmüyor', renk: 'transparent', baslik: 'Görünürde sorun yok.', metin: 'Duman görünmemesi değerlerin sınırın altında olduğu anlamına gelmez. Muayeneden önce kısa bir gaz ölçümüyle emin olun; sonucu önünüzde okuruz.', is: 'Egzoz emisyon hazırlığı' },
];

export const duman = {
  render() {
    return `
      <section class="k-bolum pz-dm" aria-labelledby="pz-dm-bas">
        <div class="k-kap pz-dm__ic">
          <div class="pz-dm__sol">
            <p class="pz-etiket-ust">Kontrol 1 · Gözle</p>
            <h2 class="k-h2" id="pz-dm-bas" data-bol>Uçtan çıkan duman ne diyor?</h2>
            <p class="k-lead">Aracı çalıştırın, egzoz ucuna bakın. Gördüğünüz rengi seçin.</p>
            <div class="pz-dm__secim" role="radiogroup" aria-label="Duman rengi">
              ${DUMAN.map((x, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-dm="${x.id}" style="--dm:${x.renk}"><span class="pz-dm__ornek" aria-hidden="true"></span>${esc(x.ad)}</button>`).join('')}
            </div>
          </div>
          <div class="pz-dm__sag">
            <div class="pz-dm__sahne" aria-hidden="true">
              <svg viewBox="0 0 520 240" class="pz-cizim">
                <path class="pz-c" d="M0 104H150M0 136H150"/>
                <path class="pz-c" d="M150 98L250 80V160L150 142Z"/>
                <ellipse class="pz-c" cx="250" cy="120" rx="10" ry="40"/>
                <path class="pz-eksen" d="M0 120H500"/>
                <g class="pz-dm__bulut">${Array.from({ length: 9 }, (_, i) => `<circle cx="262" cy="120" r="${16 + (i % 3) * 6}"/>`).join('')}</g>
              </svg>
            </div>
            <div class="pz-dm__sonuc" aria-live="polite">
              <p class="pz-dm__baslik"></p>
              <p class="pz-dm__metin"></p>
              <a class="k-btn pz-dm__wa" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu dumanı bize sorun</span></a>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const dugmeler = el.querySelectorAll('[data-dm]');
    const bulut = el.querySelectorAll('.pz-dm__bulut circle');
    const b = el.querySelector('.pz-dm__baslik');
    const m = el.querySelector('.pz-dm__metin');
    const wa = el.querySelector('.pz-dm__wa');
    const sahne = el.querySelector('.pz-dm__sahne');

    // Duman döngüsü: her halka uçtan çıkar, büyür, sağa ve yukarı savrulur. Ekran dışında durur.
    const donguler = reducedMotion
      ? []
      : [...bulut].map((c, i) => {
          const tl = gsap.timeline({ repeat: -1, delay: (i * 2.8) / bulut.length });
          tl.fromTo(c, { x: 0, y: 0, scale: 0.3, svgOrigin: '262 120' }, { x: 190 + (i % 3) * 30, y: -30 - (i % 4) * 14, scale: 2 + (i % 3) * 0.5, duration: 2.8, ease: 'sine.out' }, 0)
            .fromTo(c, { opacity: 0 }, { opacity: 0.85, duration: 0.4, ease: 'none' }, 0)
            .to(c, { opacity: 0, duration: 2.4, ease: 'power1.in' }, 0.4);
          return tl;
        });
    if (reducedMotion) bulut.forEach((c, i) => gsap.set(c, { x: 40 + i * 22, y: -i * 5, scale: 1 + i * 0.12, opacity: 0.55, svgOrigin: '262 120' }));
    if (donguler.length)
      ScrollTrigger.create({ trigger: sahne, start: 'top bottom', end: 'bottom top', onToggle: (s) => donguler.forEach((t) => (s.isActive ? t.resume() : t.pause())) });

    const sec = (id, ilk) => {
      const x = DUMAN.find((y) => y.id === id);
      dugmeler.forEach((btn) => btn.setAttribute('aria-checked', btn.dataset.dm === id));
      sahne.style.setProperty('--duman', x.renk);
      sahne.dataset.dm = id;
      b.textContent = x.baslik;
      m.textContent = x.metin;
      wa.href = waHref(
        d,
        id === 'yok'
          ? `Merhaba ${d.isletme.ad}, muayeneden önce egzoz gaz ölçümü yaptırmak istiyorum.`
          : `Merhaba ${d.isletme.ad}, aracımın egzozundan ${x.ad.toLocaleLowerCase('tr-TR')} duman çıkıyor. Bakabilir misiniz?`
      );
      if (!ilk && !reducedMotion) gsap.fromTo([b, m], { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power2.out' });
    };
    dugmeler.forEach((btn) => btn.addEventListener('click', () => sec(btn.dataset.dm)));
    el.querySelector('.pz-dm__secim').addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const liste = [...dugmeler];
      const i = liste.findIndex((x) => x.getAttribute('aria-checked') === 'true');
      const j = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + liste.length) % liste.length;
      liste[j].focus();
      sec(liste[j].dataset.dm);
    });
    sec('siyah', true);
  },
};

// --- olcu: ölçüm föyü --------------------------------------------------------------------
export const olcu = {
  render(d) {
    const o = d.muayene?.olcumler || [];
    if (!o.length) return '';
    return `
      <section class="k-bolum pz-olcu-b" aria-labelledby="pz-olcu-bas">
        <div class="k-kap">
          <div class="pz-olcu-b__bas">
            <div>
              <p class="pz-etiket-ust">Kontrol 2 · Cihazla</p>
              <h2 class="k-h2" id="pz-olcu-bas" data-bol>Önce ve sonra, aynı cihazla.</h2>
            </div>
            <div class="pz-anahtar" role="group" aria-label="Ölçüm zamanı">
              <button type="button" data-z="once" aria-pressed="true">İşten önce</button>
              <button type="button" data-z="sonra" aria-pressed="false">İşten sonra</button>
            </div>
          </div>
          <div class="pz-foy">
            <div class="pz-foy__ust" aria-hidden="true"><span>Değer</span><span>Okunan</span><span>Sınır</span><span>Sonuç</span></div>
            <ul>
              ${o
                .map((x) => {
                  const tavan = Math.max(x.once, x.sinir) * 1.1;
                  return `<li class="pz-foy__satir" data-once="${x.once}" data-sonra="${x.sonra}" data-sinir="${x.sinir}">
                    <span class="pz-foy__ad">${esc(x.ad)}<small>${esc(x.birim)}</small></span>
                    <span class="pz-foy__deger"><b>${nf.format(x.once)}</b></span>
                    <span class="pz-foy__sinir">≤ ${nf.format(x.sinir)}</span>
                    <span class="pz-foy__damga" data-durum="kaldi">KALDI</span>
                    <span class="pz-foy__cubuk" style="--s:${(x.sinir / tavan).toFixed(3)}"><i style="--o:${(x.once / tavan).toFixed(3)}"></i></span>
                  </li>`;
                })
                .join('')}
            </ul>
            <p class="pz-foy__not">Temsili ölçüm. Sınır değerler aracın yaşına ve yakıt tipine göre değişir; sizin aracınızın değerlerini önünüzde okuruz.</p>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const satirlar = [...el.querySelectorAll('.pz-foy__satir')];
    const dugmeler = el.querySelectorAll('[data-z]');
    let z = 'once';
    const uygula = (hedef, anlik) => {
      z = hedef;
      dugmeler.forEach((b) => b.setAttribute('aria-pressed', b.dataset.z === hedef));
      satirlar.forEach((li, i) => {
        const deger = Number(li.dataset[hedef]);
        const sinir = Number(li.dataset.sinir);
        const tavan = Math.max(Number(li.dataset.once), sinir) * 1.1;
        const b = li.querySelector('b');
        const damga = li.querySelector('.pz-foy__damga');
        const cubuk = li.querySelector('i');
        const gecti = deger <= sinir;
        const bitir = () => {
          damga.textContent = gecti ? 'GEÇTİ' : 'KALDI';
          damga.dataset.durum = gecti ? 'gecti' : 'kaldi';
          li.dataset.durum = damga.dataset.durum;
        };
        if (anlik || reducedMotion) {
          b.textContent = nf.format(deger);
          cubuk.style.setProperty('--o', (deger / tavan).toFixed(3));
          bitir();
          return;
        }
        const s = { v: Number(b.textContent.replace(/\./g, '').replace(',', '.')) };
        gsap.to(s, { v: deger, duration: 1.2, delay: i * 0.12, ease: 'power2.out', onUpdate: () => (b.textContent = nf.format(Math.round(s.v * 10) / 10)) });
        gsap.to(cubuk, { '--o': (deger / tavan).toFixed(3), duration: 1.2, delay: i * 0.12, ease: 'power2.out' });
        gsap.timeline({ delay: 1 + i * 0.12 })
          .to(damga, { scale: 1.6, opacity: 0, rotation: -14, duration: 0.18, ease: 'power2.in' })
          .add(bitir)
          .fromTo(damga, { scale: 1.8, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.35, ease: 'back.out(2.5)' });
      });
    };
    dugmeler.forEach((b) => b.addEventListener('click', () => b.dataset.z !== z && uygula(b.dataset.z)));
    uygula('once', true);
    // Görünce kendiliğinden "sonra"ya geçer.
    ScrollTrigger.create({ trigger: el.querySelector('.pz-foy'), start: 'top 70%', once: true, onEnter: () => z === 'once' && uygula('sonra', false) });
  },
};

// --- mesai: açık mı, saatler, konum ------------------------------------------------------
export const mesai = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    return `
      <section class="k-bolum pz-mesai" aria-labelledby="pz-mesai-bas">
        <div class="k-kap pz-mesai__ic">
          <div>
            <p class="pz-etiket-ust">Konum ve saatler</p>
            <h2 class="k-h2" id="pz-mesai-bas" data-bol>Atölye şu an açık mı?</h2>
            <p class="pz-durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <dl class="pz-saat">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${g}</dt><dd>${s}</dd></div>`).join('')}</dl>
            <p class="pz-adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="pz-harita" data-q="1"><span>Harita yaklaşınca yüklenir</span></div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const kutu = el.querySelector('.pz-harita');
    const io = new IntersectionObserver(
      (e) => {
        if (!e[0].isIntersecting) return;
        kutu.innerHTML = `<iframe title="Konum haritası" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        io.disconnect();
      },
      { rootMargin: '300px' }
    );
    io.observe(kutu);
  },
};

// --- galeri: motorun galerisi yerine "şekil" levhaları ------------------------------------
// Motor sürümündeki perde zaman çizelgeleri, sayfanın altından başka sayfaya geçerken ScrollTrigger
// yenilemesinde hata veriyordu; burada görünürlük IntersectionObserver + CSS geçişiyle.
export const galeri = {
  render(d) {
    const g = d.kurumsal?.galeri || d.galeri;
    if (!g?.length) return '';
    return `
      <section class="k-bolum pz-galeri">
        <div class="k-kap">
          <p class="pz-etiket-ust">Şekiller · ${g.length} levha</p>
          <h2 class="k-h2" data-bol>${esc(d.kurumsal?.galeriBaslik || 'Atölyeden')}</h2>
          <ul class="pz-galeri__liste">
            ${g
              .map(
                (x, i) => `<li class="pz-levha"><figure><div class="pz-levha__foto"><img src="${x.src}" alt="${esc(x.alt)}" loading="lazy"></div>
                  <figcaption><span>Şekil ${i + 1}</span>${esc(x.alt)}</figcaption></figure></li>`
              )
              .join('')}
          </ul>
        </div>
      </section>`;
  },
  mount(el) {
    const levhalar = el.querySelectorAll('.pz-levha');
    if (reducedMotion || !('IntersectionObserver' in window)) return levhalar.forEach((l) => l.classList.add('is-gorunur'));
    el.classList.add('pz-galeri--hareket');
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('is-gorunur'), io.unobserve(e.target))),
      { rootMargin: '0px 0px -12% 0px' }
    );
    levhalar.forEach((l) => io.observe(l));
  },
};
