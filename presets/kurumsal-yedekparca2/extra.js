// Sektöre özel modül: patlatılmış ön teker çizimi ("Şekil 1").
// Kaydırdıkça toplu duran teker grubu parça parça açılır, ölçü ve kılavuz çizgileri çizilir, numaralar belirir.
// Numaraya ya da parçanın kendisine dokunulunca parça kartı açılır; parçalar listeye eklenir ve liste WhatsApp'a gider.
import { esc, waHref, telHref, openStatus, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { yilEki } from '../_kurumsal/bolumler.js';

gsap.registerPlugin(DrawSVGPlugin);

// Yay sarımları: ön yarım kalın, arka yarım ince.
function yay(x0, x1, y0, n, h) {
  let on = '', arka = '';
  for (let i = 0; i < n; i++) {
    const y = y0 + i * h;
    on += `M${x0},${y} Q${(x0 + x1) / 2},${y + h * 0.95} ${x1},${y + h * 0.5} `;
    arka += `M${x1},${y + h * 0.5} Q${(x0 + x1) / 2},${y + h * 0.05} ${x0},${y + h} `;
  }
  return `<path class="pv-ince" d="${arka}"/><path class="pv-kalin" d="${on}"/>`;
}
const cevre = (cx, cy, rx, ry, n, r0 = -90) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((r0 + (360 / n) * k) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

// Her parça: çizim (patlatılmış konumda), toplu hâldeki kayması (dx, dy), kılavuz çizgisi [x1,y1,x2,y2] ve numara yeri.
const PARCALAR = [
  {
    id: 'disk', ad: 'Fren diski', grup: 'Fren', not: 'Havalı ya da düz; ön ve arka takım halinde verilir.', dx: 250, dy: 0, k: [150, 300, 92, 150],
    svg: `<ellipse class="pv-f2" cx="188" cy="400" rx="52" ry="170"/><path class="pv-c" d="M170,230H188M170,570H188"/>
      <ellipse class="pv-f" cx="170" cy="400" rx="52" ry="170"/><ellipse class="pv-i" cx="170" cy="400" rx="37" ry="120"/>
      ${cevre(170, 400, 44, 145, 14).map(([x, y]) => `<ellipse class="pv-f2" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.2" ry="5.5"/>`).join('')}
      <ellipse class="pv-f" cx="164" cy="400" rx="22" ry="70"/><ellipse class="pv-f2" cx="160" cy="400" rx="8" ry="26"/>
      ${cevre(164, 400, 14.5, 46, 5).map(([x, y]) => `<ellipse class="pv-f2" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="7"/>`).join('')}`,
  },
  {
    id: 'balata', ad: 'Balata takımı', grup: 'Fren', not: 'Ön ya da arka, dört parça takım; fişli ve fişsiz seçenek.', dx: 185, dy: 82, k: [235, 128, 200, 64],
    svg: `<rect class="pv-f" x="228" y="128" width="14" height="64" rx="4"/><rect class="pv-f2" x="236" y="133" width="6" height="54" rx="2"/>
      <g transform="translate(-27 0)"><rect class="pv-f" x="285" y="128" width="14" height="64" rx="4"/><rect class="pv-f2" x="285" y="133" width="6" height="54" rx="2"/></g>`,
  },
  {
    id: 'kaliper', ad: 'Kaliper', grup: 'Fren', not: 'Sağ ve sol ayrı; tamir takımı ya da komple.', dx: 125, dy: 92, k: [330, 110, 372, 50],
    svg: `<path class="pv-f" d="M252,110h96a12,12 0 0 1 12,12v44a12,12 0 0 1-12,12h-18v-16h-60v16h-18a12,12 0 0 1-12-12v-44a12,12 0 0 1 12-12z"/>
      <ellipse class="pv-i" cx="300" cy="138" rx="24" ry="13"/><ellipse class="pv-f2" cx="300" cy="138" rx="12" ry="6"/>
      <path class="pv-kalin" d="M338,110l6-14"/><circle class="pv-f2" cx="258" cy="168" r="4"/><circle class="pv-f2" cx="342" cy="168" r="4"/>`,
  },
  {
    id: 'abs', ad: 'ABS sensörü', grup: 'Fren', not: 'Ön ve arka, sağ ve sol ayrı; soket tipine göre eşleştirilir.', dx: -20, dy: 40, k: [544, 158, 500, 110],
    svg: `<path class="pv-c" d="M481,262C481,230 520,236 530,210C538,190 520,180 540,168"/>
      <rect class="pv-f" x="470" y="262" width="22" height="34" rx="4"/><rect class="pv-f2" x="476" y="296" width="10" height="16" rx="2"/>
      <rect class="pv-f" x="534" y="154" width="18" height="15" rx="3"/>`,
  },
  {
    id: 'porya', ad: 'Teker göbeği (porya)', grup: 'Süspansiyon', not: 'Rulmanlı ya da rulmansız; bijon sayısına göre.', dx: 95, dy: 0, k: [365, 442, 330, 612],
    svg: `<ellipse class="pv-f2" cx="338" cy="400" rx="24" ry="76"/><path class="pv-c" d="M330,324H338M330,476H338"/>
      <path class="pv-f" d="M338,358H392A13,42 0 0 1 392,442H338Z"/><ellipse class="pv-f" cx="392" cy="400" rx="13" ry="42"/><ellipse class="pv-f2" cx="392" cy="400" rx="6" ry="20"/>
      <ellipse class="pv-f" cx="330" cy="400" rx="24" ry="76"/><ellipse class="pv-i" cx="330" cy="400" rx="12" ry="36"/>
      ${cevre(330, 400, 17, 54, 5).map(([x, y]) => `<path class="pv-civata" d="M${x.toFixed(1)},${y.toFixed(1)}h-28"/>`).join('')}`,
  },
  {
    id: 'rulman', ad: 'Porya rulmanı', grup: 'Süspansiyon', not: 'ABS halkalı ya da halkasız; ölçüsü şasiden bakılır.', dx: 20, dy: 0, k: [445, 446, 450, 624],
    svg: `<ellipse class="pv-f2" cx="454" cy="400" rx="15" ry="46"/><path class="pv-c" d="M440,354H454M440,446H454"/>
      <ellipse class="pv-f" cx="440" cy="400" rx="15" ry="46"/><ellipse class="pv-bilye" cx="440" cy="400" rx="12.5" ry="38.5"/>
      <ellipse class="pv-f2" cx="440" cy="400" rx="9.5" ry="30"/>`,
  },
  {
    id: 'akson', ad: 'Aks taşıyıcı (akson)', grup: 'Süspansiyon', not: 'Sağ ve sol ayrı; ABS yuvasına göre eşleştirilir.', dx: -105, dy: 0, k: [542, 500, 530, 646],
    svg: `<path class="pv-f" d="M606,450L680,470C690,474 690,488 680,490L604,488Z"/><circle class="pv-f2" cx="676" cy="480" r="5"/>
      <path class="pv-f" d="M550,240C548,232 596,232 598,240L612,320C620,360 620,440 608,480L600,556C598,566 556,566 552,556L538,480C528,440 528,360 536,320Z"/>
      <ellipse class="pv-f2" cx="574" cy="400" rx="20" ry="52"/><ellipse class="pv-f" cx="572" cy="400" rx="11" ry="30"/>
      <circle class="pv-f2" cx="574" cy="258" r="7"/><circle class="pv-f2" cx="576" cy="540" r="7"/>`,
  },
  {
    id: 'amortisor', ad: 'Amortisör', grup: 'Süspansiyon', not: 'Yağlı ya da gazlı; ön takım halinde değişmesi önerilir.', dx: -195, dy: -17, k: [650, 200, 598, 160],
    svg: `<rect class="pv-f" x="661" y="60" width="8" height="76"/><rect class="pv-f" x="650" y="132" width="30" height="118" rx="5"/>
      <ellipse class="pv-f2" cx="665" cy="150" rx="26" ry="7"/><circle class="pv-f" cx="665" cy="52" r="12"/><circle class="pv-f2" cx="665" cy="52" r="5"/>
      <circle class="pv-f" cx="665" cy="262" r="11"/><circle class="pv-f2" cx="665" cy="262" r="5"/>`,
  },
  {
    id: 'yay', ad: 'Helezon yay', grup: 'Süspansiyon', not: 'Motor ve donanıma göre değişir; çift olarak verilir.', dx: -275, dy: 15, k: [760, 232, 762, 300],
    svg: yay(722, 770, 70, 7, 22),
  },
  {
    id: 'salincak', ad: 'Salıncak ve rotil', grup: 'Süspansiyon', not: 'Burçlu ya da burçsuz; rotil ayrı da verilir.', dx: -92, dy: -20, k: [650, 628, 640, 690],
    svg: `<path class="pv-f" d="M560,590L728,552C742,550 750,556 752,566L772,640C774,652 766,660 754,658L572,606C560,604 556,596 560,590Z"/>
      <path class="pv-i" d="M612,592L716,570L736,628Z"/>
      <circle class="pv-f2" cx="740" cy="562" r="16"/><circle class="pv-f" cx="740" cy="562" r="7"/>
      <circle class="pv-f2" cx="760" cy="646" r="16"/><circle class="pv-f" cx="760" cy="646" r="7"/>
      <rect class="pv-f" x="557" y="548" width="10" height="30"/><path class="pv-f2" d="M553,548l4-8h10l4,8z"/><circle class="pv-f" cx="562" cy="592" r="16"/>`,
  },
];

const oku = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const iki = (n) => String(n).padStart(2, '0');

function grupBilgi(d, p) {
  const h = (d.hizmetler || []).find((x) => x.baslik?.startsWith(p.grup));
  if (!h) return '';
  const nf = new Intl.NumberFormat('tr-TR');
  return [h.baslik, h.raf ? `Raf ${h.raf}` : '', h.stok ? `${nf.format(h.stok)} kalem stokta` : ''].filter(Boolean).join(' · ');
}

export const patlatma = {
  render(d) {
    const ana = !location.hash || /^#\/?(anasayfa)?(\?|$)/.test(location.hash);
    const st = d.saatler ? openStatus(d.saatler) : null;
    const tes = d.teslimat?.[0];
    const baslik = ana
      ? `<p class="pv__kicker">Parçanın adını bilmeseniz de olur.</p><h1 class="k-h1 pv__baslik" data-bol>Gösterin, bulalım.</h1>`
      : `<h2 class="k-h2 pv__baslik" data-bol>Parçanın yerine dokunun</h2>`;
    return `
      <section class="pv${ana ? ' pv--ana' : ''}" aria-label="Patlatılmış ön teker çizimi">
        <div class="pv__sahne">
          <div class="k-kap pv__ic">
            <div class="pv__metin">
              <p class="pv__ust"><span>Şekil 1</span>Şaşmaz'da ${esc(yilEki(d.isletme.kurulus))} beri</p>
              ${baslik}
              <div class="pv__alt">
                <p class="k-lead">Çizimde parçanın yerine dokunun, listeye ekleyin, WhatsApp'tan gönderin. Orijinal ve muadil fiyatını tek mesajda yazarız.</p>
                <div class="k-butonlar">
                  <a class="k-btn" href="#/iletisim" data-rota="iletisim">Parça sorun ${oku}</a>
                  <a class="k-btn k-btn--ikincil pv__tel" href="${telHref(d)}">${esc(d.iletisim.telefon)}</a>
                </div>
                <dl class="pv__bilgi">
                  ${st ? `<div><dt>Bugün</dt><dd class="${st.open ? 'is-acik' : ''}">${esc(st.text)}</dd></div>` : ''}
                  ${tes ? `<div><dt>${esc(tes.yer)}</dt><dd>${esc(tes.sure)}</dd></div>` : ''}
                </dl>
              </div>
            </div>
            <div class="pv__cizim">
              <svg class="pv__svg" viewBox="0 0 800 720" role="img" aria-label="Ön teker grubunun patlatılmış çizimi: fren diski, balata, kaliper, ABS sensörü, teker göbeği, rulman, aks taşıyıcı, amortisör, helezon yay, salıncak">
                <g class="pv__govde">
                  <g class="pv__olcu" aria-hidden="true">
                    <path class="pv-eksen" d="M30,400H640"/>
                    <path class="pv-olcu" d="M70,230V570M62,230H100M62,570H100M64,242L70,230L76,242M64,558L70,570L76,558"/>
                    <text class="pv-yazi" x="58" y="410" transform="rotate(-90 58 410)" text-anchor="middle">Ø 280</text>
                    <text class="pv-yazi pv-yazi--kucuk" x="646" y="405">A–A</text>
                  </g>
                  ${PARCALAR.map((p, i) => `<g class="pv-parca" data-i="${i}" data-dx="${p.dx}" data-dy="${p.dy}">${p.svg}</g>`).join('')}
                  <g class="pv__kilavuz" aria-hidden="true">
                    ${PARCALAR.map((p, i) => `<path class="pv-kil" data-i="${i}" d="M${p.k[0]},${p.k[1]}L${p.k[2]},${p.k[3]}"/>`).join('')}
                  </g>
                  ${PARCALAR.map(
                    (p, i) => `<g class="pv-no" data-i="${i}" role="button" tabindex="0" aria-label="${iki(i + 1)} ${esc(p.ad)}">
                      <circle class="pv-no__alan" cx="${p.k[2]}" cy="${p.k[3]}" r="38"/>
                      <circle class="pv-no__daire" cx="${p.k[2]}" cy="${p.k[3]}" r="22"/>
                      <text x="${p.k[2]}" y="${p.k[3] + 7}" text-anchor="middle">${i + 1}</text>
                    </g>`
                  ).join('')}
                </g>
              </svg>
              <div class="pv__panel">
                <div class="pv__kart" aria-live="polite">
                  <p class="pv__ipucu">Numaraya ya da parçaya dokunun</p>
                  <div class="pv__secili" hidden>
                    <p class="pv__kod"><b data-o="no"></b><span data-o="grup"></span></p>
                    <p class="pv__ad" data-o="ad"></p>
                    <p class="pv__not" data-o="not"></p>
                  </div>
                  <div class="pv__dugmeler">
                    <button type="button" class="pv__ok" data-yon="-1" aria-label="Önceki parça"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                    <button type="button" class="pv__ekle" disabled>Listeye ekle</button>
                    <button type="button" class="pv__ok" data-yon="1" aria-label="Sonraki parça"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                  </div>
                </div>
                <a class="pv__liste" target="_blank" rel="noopener" aria-disabled="true">
                  <span class="pv__sayi" data-o="sayi">0</span>
                  <span class="pv__liste-metin" data-o="liste">Listeniz boş</span>
                  <span class="pv__gonder">WhatsApp'la sor ${oku}</span>
                </a>
              </div>
            </div>
          </div>
          <p class="pv__antet" aria-hidden="true"><span>Ön teker grubu · Patlatılmış görünüm</span><span>Ölçek 1:5</span><span>Sayfa 1/1</span></p>
        </div>
      </section>`;
  },

  mount(el, d) {
    const svg = el.querySelector('.pv__svg');
    const parcalar = [...el.querySelectorAll('.pv-parca')];
    const numaralar = [...el.querySelectorAll('.pv-no')];
    const kilavuz = [...el.querySelectorAll('.pv-kil')];
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const ipucu = el.querySelector('.pv__ipucu');
    const secili = el.querySelector('.pv__secili');
    const ekle = el.querySelector('.pv__ekle');
    const listeA = el.querySelector('.pv__liste');
    const liste = new Set();
    let aktif = -1;

    const listeGuncelle = () => {
      const adlar = [...liste].sort((a, b) => a - b).map((i) => PARCALAR[i].ad);
      o('sayi').textContent = adlar.length;
      o('liste').textContent = adlar.length ? adlar.join(', ') : 'Listeniz boş';
      listeA.classList.toggle('is-dolu', adlar.length > 0);
      listeA.setAttribute('aria-disabled', adlar.length ? 'false' : 'true');
      const mesaj = [
        `Merhaba ${d.isletme.ad}, şu parçaların fiyatını öğrenmek istiyorum:`,
        ...adlar.map((a, i) => `${i + 1}. ${a}`),
        'Aracım ve şasi numaram: ',
      ].join('\n');
      if (adlar.length) listeA.href = waHref(d, mesaj);
      else listeA.removeAttribute('href');
      numaralar.forEach((n, i) => n.classList.toggle('is-listede', liste.has(i)));
      if (aktif > -1) ekle.textContent = liste.has(aktif) ? 'Listeden çıkar' : 'Listeye ekle';
      ekle.classList.toggle('is-listede', aktif > -1 && liste.has(aktif));
    };

    const sec = (i) => {
      aktif = (i + PARCALAR.length) % PARCALAR.length;
      const p = PARCALAR[aktif];
      svg.classList.add('is-secimli');
      parcalar.forEach((g, j) => g.classList.toggle('is-aktif', j === aktif));
      numaralar.forEach((g, j) => g.classList.toggle('is-aktif', j === aktif));
      kilavuz.forEach((g, j) => g.classList.toggle('is-aktif', j === aktif));
      ipucu.hidden = true;
      secili.hidden = false;
      o('no').textContent = iki(aktif + 1);
      o('grup').textContent = grupBilgi(d, p) || p.grup;
      o('ad').textContent = p.ad;
      o('not').textContent = p.not;
      ekle.disabled = false;
      listeGuncelle();
      if (!reducedMotion) gsap.fromTo(secili, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
    };

    [...parcalar, ...numaralar].forEach((g) => {
      g.addEventListener('click', () => sec(Number(g.dataset.i)));
    });
    numaralar.forEach((g) =>
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sec(Number(g.dataset.i)); }
      })
    );
    el.querySelectorAll('.pv__ok').forEach((b) => b.addEventListener('click', () => sec(aktif < 0 ? 0 : aktif + Number(b.dataset.yon))));
    ekle.addEventListener('click', () => {
      if (aktif < 0) return;
      liste.has(aktif) ? liste.delete(aktif) : liste.add(aktif);
      listeGuncelle();
      if (!reducedMotion) gsap.fromTo(o('sayi'), { scale: 1.5 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    });
    listeA.addEventListener('click', (e) => { if (!liste.size) e.preventDefault(); });
    listeGuncelle();

    if (reducedMotion) { el.classList.add('is-durgun'); return; }

    // Kaydırma filmi: toplu → patlatılmış → ölçüler ve numaralar.
    const mobil = matchMedia('(max-width: 899px)').matches;
    const alt = el.querySelector('.pv__alt');
    const panel = el.querySelector('.pv__panel');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
    });
    tl.fromTo('.pv__govde', { scale: 1.12, x: -40, transformOrigin: '50% 50%' }, { scale: 1, x: 0, duration: 0.5 }, 0.05);
    parcalar.forEach((g, i) => {
      tl.fromTo(g, { x: Number(g.dataset.dx), y: Number(g.dataset.dy) }, { x: 0, y: 0, duration: 0.45, ease: 'power2.inOut' }, 0.08 + (i % 5) * 0.02);
    });
    gsap.set('.pv-eksen, .pv-olcu', { drawSVG: '0%' });
    gsap.set(kilavuz, { drawSVG: '0%' });
    gsap.set(numaralar, { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
    gsap.set(['.pv-yazi', '.pv__antet'], { opacity: 0 });
    gsap.set(panel, { y: 30, opacity: 0 });
    tl.to('.pv-eksen, .pv-olcu', { drawSVG: '100%', duration: 0.25 }, 0.4)
      .to('.pv-yazi', { opacity: 1, duration: 0.1 }, 0.55)
      .to(kilavuz, { drawSVG: '100%', duration: 0.12, stagger: 0.015 }, 0.55)
      .to(numaralar, { scale: 1, opacity: 1, duration: 0.1, stagger: 0.015, ease: 'back.out(2)' }, 0.6)
      .to(panel, { y: 0, opacity: 1, duration: 0.12 }, 0.72)
      .to('.pv__antet', { opacity: 1, duration: 0.1 }, 0.75)
      .to({}, { duration: 0.12 }, 0.88);
    if (!mobil) tl.to(alt, { opacity: 0, y: -20, duration: 0.12, ease: 'power1.in' }, 0.58);
    if (mobil) {
      const kicker = el.querySelector('.pv__kicker');
      const kh = () => (kicker ? kicker.offsetHeight + 6 : 0);
      tl.to(alt, { opacity: 0, y: -24, duration: 0.18, ease: 'power1.in' }, 0.04)
        .to(el.querySelector('.pv__baslik'), { y: () => -kh(), scale: 0.64, transformOrigin: '0% 0%', duration: 0.3, ease: 'power2.inOut' }, 0.12)
        .to('.pv__cizim', { y: () => -alt.offsetHeight - kh() - el.querySelector('.pv__baslik').offsetHeight * 0.36, duration: 0.3, ease: 'power2.inOut' }, 0.12);
      if (kicker) tl.to(kicker, { opacity: 0, duration: 0.12 }, 0.04);
    }
    // Panel görünmeden dokunulamasın.
    ScrollTrigger.create({
      trigger: el, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => el.classList.toggle('is-acik', s.progress > 0.7),
    });
  },
};
