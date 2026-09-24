// Sektör modülleri:
// (1) hero: motorun hero'su + fotoğrafın üstünde basınç göstergesi (ibre açılışta 1,8 bar'a çıkar)
// (2) kesit: turbonun kesit çizimi. Şikâyeti seç → bakılacak parçalar yanar; parçaya dokun → ne bozulur, ne yaparız.
//     Hava ve egzoz akışı, yağ hattı ve çark dönüşü yalnızca CSS animasyonu (kompozitörde), ekran dışında durur.
// (3) atolye: bugün açık mı, saatler, adres, yaklaşınca yüklenen harita.
import { esc, waHref, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER } from '../_kurumsal/bolumler.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

// --- (1) Hero + basınç göstergesi -------------------------------------------------------------
const gostergeSvg = () => {
  // 0-2,5 bar, 240 derecelik yay. Merkez (100,100), yarıçap 78.
  const aci = (v) => -210 + (v / 2.5) * 240; // derece, 0 bar = -210 (sol alt)
  const nokta = (v, r) => {
    const a = (aci(v) * Math.PI) / 180;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
  };
  const cizgiler = [];
  for (let i = 0; i <= 25; i++) {
    const v = i / 10;
    const buyuk = i % 5 === 0;
    const [x1, y1] = nokta(v, buyuk ? 64 : 69);
    const [x2, y2] = nokta(v, 76);
    cizgiler.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${buyuk ? 'b' : ''}${v >= 2 ? ' k' : ''}"/>`);
  }
  const rakamlar = [0, 0.5, 1, 1.5, 2, 2.5]
    .map((v) => {
      const [x, y] = nokta(v, 52);
      return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}">${String(v).replace('.', ',')}</text>`;
    })
    .join('');
  const [ax, ay] = nokta(0, 84);
  const [bx, by] = nokta(2.5, 84);
  return `
    <div class="tb-gos" aria-hidden="true">
      <svg viewBox="0 0 200 172">
        <defs><linearGradient id="tb-isi" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#6c8cff"/><stop offset=".55" stop-color="#ffb347"/><stop offset=".8" stop-color="#ff6a1f"/><stop offset="1" stop-color="#e8284a"/></linearGradient></defs>
        <circle cx="100" cy="100" r="92" class="tb-gos__kasa"/>
        <path d="M${ax.toFixed(1)} ${ay.toFixed(1)} A84 84 0 1 1 ${bx.toFixed(1)} ${by.toFixed(1)}" class="tb-gos__yay"/>
        <g class="tb-gos__cizgi">${cizgiler.join('')}</g>
        <g class="tb-gos__rakam">${rakamlar}</g>
        <g class="tb-gos__ibre"><path d="M100 104 L97 100 L100 34 L103 100 Z"/><circle cx="100" cy="100" r="7"/></g>
      </svg>
      <p class="tb-gos__deger"><b data-bar>0,0</b><span>bar</span></p>
    </div>`;
};

export const hero = {
  render(d, ctx, sorgu) {
    const html = BOLUMLER.hero.render(d, ctx, sorgu);
    return html.replace('</figure>', `${gostergeSvg()}</figure>`);
  },
  mount(el) {
    const ibre = el.querySelector('.tb-gos__ibre');
    const deger = el.querySelector('[data-bar]');
    if (!ibre) return;
    const hedef = 1.8;
    const aci = (v) => (v / 2.5) * 240 - 120; // ibre 0 bar'da -120 derece
    if (reducedMotion) {
      gsap.set(ibre, { rotation: aci(hedef), svgOrigin: '100 100' });
      deger.textContent = hedef.toFixed(1).replace('.', ',');
      return;
    }
    const o = { v: 0 };
    const k = { s: 0 };
    const yaz = () => {
      const v = o.v + k.s;
      gsap.set(ibre, { rotation: aci(v), svgOrigin: '100 100' });
      deger.textContent = v.toFixed(1).replace('.', ',');
    };
    yaz();
    gsap.timeline({ delay: 1.1 })
      .to(o, { v: 2.25, duration: 1.1, ease: 'power3.in', onUpdate: yaz })
      .to(o, { v: hedef, duration: 1.4, ease: 'elastic.out(1, 0.35)', onUpdate: yaz });
    // Kaydırdıkça ibre biraz daha yükselir (gaz açılıyor).
    gsap.fromTo(k, { s: 0 }, {
      s: 0.25, ease: 'none', onUpdate: yaz, immediateRender: false,
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
  },
};

// --- (2) Turbo kesiti ---------------------------------------------------------------------------
const PARCALAR = [
  { id: 'kompresor', no: 1, x: 236, y: 250, ad: 'Kompresör çarkı', bozulur: 'Hava filtresinden kaçan toz ya da küçük bir cisim kanatları yer; çark dengesini kaybeder.', belirti: 'Islık, siren sesi, basınç düşüklüğü', yapariz: 'Kanatlar büyüteçle kontrol edilir, çark grubu balans cihazında dengelenir; yenmişse değişir.', hizmet: 1 },
  { id: 'mil', no: 2, x: 400, y: 250, ad: 'Mil ve yataklar', bozulur: 'Yağsız kalan ya da kirli yağla dönen mil yatakları yer; boşluk artar, çark gövdeye sürter.', belirti: 'Mavi duman, yağ yakma, metalik ses', yapariz: 'Eksenel ve radyal boşluk ölçülür. Yatak, segman ve contalar yenilenerek revizyon yapılır.', hizmet: 0 },
  { id: 'turbin', no: 3, x: 552, y: 250, ad: 'Türbin çarkı', bozulur: 'Sıcak egzoz ve kurum çarkı aşındırır; motordan kopan parça kanatları kırabilir.', belirti: 'Çekiş kaybı, titreşim, siyah duman', yapariz: 'Çark ve mil grubu ölçülür, türbin gövdesi temizlenir, çatlak aranır.', hizmet: 0 },
  { id: 'vnt', no: 4, x: 506, y: 140, ad: 'VNT kanatları', bozulur: 'Kısa mesafe ve düşük devir kullanımında kurum bağlar; kanatlar sıkışır, basınç ayarı kaçar.', belirti: 'Gaz verince tekleme, emniyet moduna geçme', yapariz: 'Kanat mekanizması sökülüp temizlenir, serbest hareket ettiği kontrol edilir.', hizmet: 2 },
  { id: 'aktuator', no: 5, x: 688, y: 104, ad: 'Aktüatör', bozulur: 'Vakum ya da elektronik aktüatör konum kaybeder, kolu yanlış yerde tutar.', belirti: 'Arıza lambası, turbo basıncı düşük kaydı', yapariz: 'Aktüatör ve konum sensörü değerlere göre ayarlanır, cihazla test edilir.', hizmet: 2 },
  { id: 'yag', no: 6, x: 400, y: 112, ad: 'Yağ besleme ve dönüş', bozulur: 'Tıkalı dönüş hattı yağı turbonun içinde bırakır; yağ contalardan kaçar ya da turbo yağsız kalır.', belirti: 'Intercooler’da yağ, egzozdan yağ, turbo tekrar tekrar bozulma', yapariz: 'Besleme ve dönüş boruları, banjo cıvataları ve süzgeçler kontrol edilir; tıkalı hat yenilenmeden turbo takılmaz.', hizmet: 4 },
  { id: 'intercooler', no: 7, x: 262, y: 62, ad: 'Intercooler ve hortumlar', bozulur: 'Çatlak intercooler ya da gevşek kelepçe basınçlı havayı dışarı kaçırır.', belirti: 'Islık, güç kaybı, siyah duman', yapariz: 'Intercooler temizlenir, basınç testiyle kaçak aranır; hortum ve kelepçeler kontrol edilir.', hizmet: 3 },
];

const SIKAYETLER = [
  { id: 'islik', ad: 'Islık ya da siren sesi', parca: ['kompresor', 'mil', 'intercooler'] },
  { id: 'cekis', ad: 'Çekişten düştü', parca: ['vnt', 'aktuator', 'intercooler', 'turbin'] },
  { id: 'mavi', ad: 'Mavi duman, yağ yakıyor', parca: ['mil', 'yag'] },
  { id: 'siyah', ad: 'Siyah duman', parca: ['vnt', 'intercooler', 'turbin'] },
  { id: 'yagli', ad: 'Intercooler’dan yağ geliyor', parca: ['yag', 'mil'] },
  { id: 'lamba', ad: 'Arıza lambası, emniyet modu', parca: ['aktuator', 'vnt'] },
];

// Kesit çizimi (viewBox 800x480). Sınıflar: .p-<id> parçayı, .ak-* akışları işaretler.
const kesitSvg = () => `
  <svg class="tk__svg" viewBox="0 0 800 480" role="img" aria-labelledby="tk-svg-baslik">
    <title id="tk-svg-baslik">Turbonun kesit çizimi: solda kompresör, ortada mil ve yataklar, sağda türbin</title>
    <defs>
      <pattern id="tk-izgara" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="currentColor" stroke-width=".5" opacity=".14"/></pattern>
      <clipPath id="tk-kc"><path d="M186 226 C214 222 262 188 300 154 L300 346 C262 312 214 278 186 274 Z"/></clipPath>
      <clipPath id="tk-tc"><path d="M500 160 C530 196 566 220 602 226 L602 274 C566 280 530 304 500 340 Z"/></clipPath>
    </defs>
    <rect width="800" height="480" fill="url(#tk-izgara)"/>

    <!-- Akışlar: soğuk hava (sol), sıcak egzoz (sağ), yağ (orta) -->
    <path class="ak ak-hava" d="M6 250 H176"/>
    <path class="ak ak-hava" d="M262 150 V26"/>
    <path class="ak ak-egzoz" d="M550 470 V360"/>
    <path class="ak ak-egzoz" d="M612 250 H796"/>
    <path class="ak ak-yag" d="M400 20 V192"/>
    <path class="ak ak-yag" d="M400 312 V470"/>

    <!-- Kompresör gövdesi -->
    <g class="p p-kompresor p-intercooler">
      <path class="g" d="M40 196 H150 C160 150 184 116 214 104 C236 96 250 96 262 100 H290 C318 104 330 130 330 160 V340 C330 376 304 398 270 398 C230 398 190 380 164 340 C156 326 152 314 150 304 H40"/>
      <circle class="g i" cx="262" cy="136" r="30"/>
      <circle class="g i" cx="252" cy="366" r="22"/>
    </g>
    <g class="p p-intercooler"><path class="g" d="M232 106 V20 M292 106 V20"/><path class="g kel" d="M226 44 H298 M226 56 H298"/></g>

    <!-- Kompresör çarkı: kanat izleri döner gibi akar -->
    <g class="p p-kompresor">
      <path class="c" d="M186 226 C214 222 262 188 300 154 L300 346 C262 312 214 278 186 274 Z"/>
      <g clip-path="url(#tk-kc)"><g class="kanat kanat-k">${Array.from({ length: 16 }, (_, i) => `<path d="M180 ${130 + i * 28} C230 ${140 + i * 28} 270 ${150 + i * 28} 310 ${170 + i * 28}"/>`).join('')}</g></g>
    </g>

    <!-- Mil -->
    <g class="p p-mil">
      <rect class="mil" x="180" y="244" width="432" height="12" rx="3"/>
    </g>

    <!-- Yatak gövdesi, yataklar -->
    <g class="p p-mil p-yag">
      <path class="g" d="M330 186 H372 V176 H428 V186 H474 V314 H428 V324 H372 V314 H330 Z"/>
      <rect class="g y" x="352" y="228" width="30" height="44" rx="4"/>
      <rect class="g y" x="418" y="228" width="30" height="44" rx="4"/>
    </g>
    <!-- Yağ hattı -->
    <g class="p p-yag">
      <path class="g" d="M388 176 V60 M412 176 V60"/>
      <rect class="g kel" x="378" y="54" width="44" height="16" rx="3"/>
      <path class="g" d="M380 324 V440 M420 324 V440"/>
    </g>

    <!-- Türbin gövdesi -->
    <g class="p p-turbin p-vnt">
      <path class="g" d="M474 150 C490 106 530 92 566 96 C606 100 624 130 626 170 V204 H770 M770 296 H626 V330 C624 366 604 392 578 398 V470 M522 470 V396 C494 384 476 360 474 350 Z"/>
      <circle class="g i" cx="546" cy="134" r="24"/>
    </g>
    <!-- VNT kanatları -->
    <g class="p p-vnt">
      ${[150, 166, 182, 318, 334, 350].map((y) => `<rect class="vnt" x="484" y="${y - 5}" width="30" height="7" rx="2" transform="rotate(${y < 250 ? -28 : 28} 499 ${y})"/>`).join('')}
    </g>
    <!-- Türbin çarkı -->
    <g class="p p-turbin">
      <path class="c c--sicak" d="M500 160 C530 196 566 220 602 226 L602 274 C566 280 530 304 500 340 Z"/>
      <g clip-path="url(#tk-tc)"><g class="kanat kanat-t">${Array.from({ length: 16 }, (_, i) => `<path d="M490 ${130 + i * 28} C530 ${150 + i * 28} 570 ${140 + i * 28} 612 ${130 + i * 28}"/>`).join('')}</g></g>
    </g>
    <!-- Aktüatör -->
    <g class="p p-aktuator">
      <rect class="g" x="640" y="70" width="104" height="64" rx="14"/>
      <path class="g" d="M666 134 L612 176"/>
      <circle class="g" cx="610" cy="178" r="6"/>
      <path class="g kel" d="M656 90 H728 M656 104 H728 M656 118 H728"/>
    </g>

    <!-- Etiketler -->
    <g class="tk__etiket">
      <text x="14" y="236">Hava girişi</text>
      <text x="302" y="30">Intercooler’a</text>
      <text x="446" y="44">Yağ girişi</text>
      <text x="432" y="462">Yağ dönüşü</text>
      <text x="590" y="462">Motordan egzoz</text>
      <text x="656" y="236">Egzoza</text>
    </g>

    <!-- Numaralar -->
    ${PARCALAR.map((p) => `<g class="tk__no" data-p="${p.id}" tabindex="0" role="button" aria-label="${esc(p.no + '. ' + p.ad)}"><circle cx="${p.x}" cy="${p.y}" r="17"/><circle class="halka" cx="${p.x}" cy="${p.y}" r="17"/><text x="${p.x}" y="${p.y}" dominant-baseline="central">${p.no}</text></g>`).join('')}
  </svg>`;

export const kesit = {
  render(d) {
    return `
      <section class="k-bolum tk" aria-labelledby="tk-baslik">
        <div class="k-kap">
          <div class="tk__bas">
            <p class="tb-etiket">Turbonun içi</p>
            <h2 class="k-h2" id="tk-baslik" data-bol>Şikâyeti seçin, turbonun neresine bakacağımızı görün.</h2>
            <p class="k-lead">Turbo tek parça değil. Ses, duman ya da güç kaybı hangi parçadan geliyor olabilir, tezgâhta ilk neyi ölçeriz; numaralara dokunun.</p>
          </div>
          <div class="tk__ic">
            <div class="tk__sol">
              <div class="tk__cipler" role="group" aria-label="Şikâyet seçin">
                ${SIKAYETLER.map((s, i) => `<button type="button" class="tk__cip" data-s="${s.id}" aria-pressed="${i === 0}">${esc(s.ad)}</button>`).join('')}
              </div>
              <figure class="tk__cizim">${kesitSvg()}
                <figcaption class="tk__lejant"><span class="l-hava">Soğuk hava</span><span class="l-egzoz">Sıcak egzoz</span><span class="l-yag">Motor yağı</span></figcaption>
              </figure>
            </div>
            <article class="tk__kart" aria-live="polite"></article>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const svg = el.querySelector('.tk__svg');
    const kart = el.querySelector('.tk__kart');
    const cipler = [...el.querySelectorAll('.tk__cip')];
    const nolar = [...el.querySelectorAll('.tk__no')];
    let sikayet = SIKAYETLER[0];
    let parca = null;

    const isaretle = (ids, secili) => {
      PARCALAR.forEach((p) => svg.querySelectorAll(`.p-${p.id}`).forEach((g) => g.classList.toggle('is-yan', ids.includes(p.id))));
      nolar.forEach((n) => {
        n.classList.toggle('is-yan', ids.includes(n.dataset.p));
        n.classList.toggle('is-secili', n.dataset.p === secili);
      });
    };

    const hizmetSatiri = (p) => {
      const h = d.hizmetler?.[p.hizmet];
      return h ? `<p class="tk__hizmet"><span>İlgili iş</span>${esc(h.baslik)}${h.sure ? ` <b>${esc(h.sure)}</b>` : ''}</p>` : '';
    };

    const goster = () => {
      if (parca) {
        const p = PARCALAR.find((x) => x.id === parca);
        isaretle([p.id], p.id);
        const mesaj = `Merhaba ${d.isletme.ad}, turbomda ${p.ad.toLowerCase()} tarafında sorun olabilir (${p.belirti.toLowerCase()}). Aracım: `;
        kart.innerHTML = `
          <p class="tk__kart-ust"><span class="tk__kart-no">${p.no}</span>Parça</p>
          <h3 class="tk__kart-baslik">${esc(p.ad)}</h3>
          <dl class="tk__dl">
            <div><dt>Nasıl bozulur</dt><dd>${esc(p.bozulur)}</dd></div>
            <div><dt>Belirtisi</dt><dd>${esc(p.belirti)}</dd></div>
            <div><dt>Tezgâhta ne yaparız</dt><dd>${esc(p.yapariz)}</dd></div>
          </dl>
          ${hizmetSatiri(p)}
          <div class="tk__kart-alt">
            <a class="k-btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu parça için yazın</span></a>
            <button type="button" class="tk__geri">Şikâyete dön</button>
          </div>`;
      } else {
        const ids = sikayet.parca;
        isaretle(ids, null);
        const mesaj = `Merhaba ${d.isletme.ad}, aracımda şu şikâyet var: ${sikayet.ad.toLowerCase()}. Turboya bakabilir misiniz? Aracım: `;
        kart.innerHTML = `
          <p class="tk__kart-ust">Şikâyet</p>
          <h3 class="tk__kart-baslik">${esc(sikayet.ad)}</h3>
          <p class="tk__kart-alt-baslik">İlk bakacağımız ${ids.length} yer</p>
          <ol class="tk__sira">
            ${ids
              .map((id) => PARCALAR.find((p) => p.id === id))
              .map((p) => `<li><button type="button" data-ac="${p.id}"><span class="tk__kart-no">${p.no}</span><span><b>${esc(p.ad)}</b><small>${esc(p.yapariz.split('.')[0])}.</small></span></button></li>`)
              .join('')}
          </ol>
          <p class="tk__not">Söküp ölçmeden kesin söylemeyiz; fiyatı ölçümden sonra, işe başlamadan söyleriz.</p>
          <div class="tk__kart-alt">
            <a class="k-btn" href="${waHref(d, mesaj)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu şikâyetle yazın</span></a>
          </div>`;
      }
      if (!reducedMotion) gsap.fromTo(kart.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power2.out', overwrite: true });
    };

    cipler.forEach((c) =>
      c.addEventListener('click', () => {
        sikayet = SIKAYETLER.find((s) => s.id === c.dataset.s);
        parca = null;
        cipler.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        goster();
      })
    );
    const parcaAc = (id) => {
      parca = id;
      goster();
    };
    nolar.forEach((n) => {
      n.addEventListener('click', () => parcaAc(n.dataset.p));
      n.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), parcaAc(n.dataset.p)));
    });
    kart.addEventListener('click', (e) => {
      const ac = e.target.closest('[data-ac]');
      if (ac) parcaAc(ac.dataset.ac);
      if (e.target.closest('.tk__geri')) {
        parca = null;
        goster();
      }
    });
    goster();

    // Akış animasyonları yalnızca görünürken çalışsın.
    const cizim = el.querySelector('.tk__cizim');
    const io = new IntersectionObserver(([e]) => cizim.classList.toggle('is-calisiyor', e.isIntersecting), { rootMargin: '80px' });
    io.observe(cizim);

    if (!reducedMotion) {
      const g = svg.querySelectorAll('.g:not(.i), .c, .mil, .vnt');
      gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 78%', once: true } })
        .from(g, { drawSVG: 0, duration: 1.3, stagger: 0.02, ease: 'power2.inOut' }, 0)
        .from(svg.querySelectorAll('.c, .mil'), { fillOpacity: 0, duration: 0.6 }, 0.9)
        .from(svg.querySelectorAll('.g.i, .ak'), { opacity: 0, duration: 0.6 }, 0.9)
        .from(nolar, { scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.06, ease: 'back.out(2.5)' }, 1.1);
    }
  },
};

// --- (3) Atölye: saatler + konum ---------------------------------------------------------------
export const atolye = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    const bugunSaat = d.saatler[bugun];
    return `
      <section class="k-bolum ta" aria-labelledby="ta-baslik">
        <div class="k-kap ta__ic">
          <div class="ta__sol">
            <p class="tb-etiket">Atölye</p>
            <h2 class="k-h2" id="ta-baslik" data-bol>Turboyu getirin, beklerken sökelim.</h2>
            <div class="ta__lamba ${st.open ? 'is-acik' : ''}">
              <span class="ta__led" aria-hidden="true"></span>
              <div><b>${esc(st.text)}</b><small>Bugün ${GUNLER[bugun]}${bugunSaat ? `, ${esc(bugunSaat.replace('-', ' – '))}` : ', kapalı'}</small></div>
            </div>
            <dl class="ta__saatler">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="ta__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="ta__harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.ta__harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};
