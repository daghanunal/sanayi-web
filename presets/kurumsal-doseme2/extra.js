// Sektör modülleri — "Pepita" yönü:
// (1) icMekan: aracın üstten görünüşü; parçaya dokun, sorununu seç, iş listesi + tahmini süre WhatsApp'a hazır mesaj.
// (2) pepita: kaydırdıkça karo karo örülen pepita (kaz ayağı) alanı ve üstünde dönen "sorun → çözüm" etiketi.
// (3) mesai: kumaş etiketi biçiminde çalışma saatleri, canlı açık/kapalı, yol tarifi, yaklaşınca yüklenen harita.
import { esc, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';

// --- (1) İç mekân haritası -------------------------------------------------------------

const S = {
  yirtik: 'Yırtık',
  cokme: 'Çökme',
  sarkma: 'Sarkma',
  kabarma: 'Kabarma',
  leke: 'Leke ya da solma',
  asinma: 'Aşınma',
  isitma: 'Isıtma istiyorum',
  bastan: 'Baştan yenilensin',
};
const KOLTUK = ['yirtik', 'cokme', 'leke', 'isitma', 'bastan'];
const KAPI = ['yirtik', 'kabarma', 'leke', 'bastan'];
const PARCALAR = [
  { id: 'surucu', ad: 'Sürücü koltuğu', hizmet: 'Koltuk döşeme', gun: 0.8, sorun: KOLTUK },
  { id: 'yolcu', ad: 'Yolcu koltuğu', hizmet: 'Koltuk döşeme', gun: 0.8, sorun: KOLTUK },
  { id: 'arka', ad: 'Arka koltuk', hizmet: 'Koltuk döşeme', gun: 0.8, sorun: KOLTUK },
  { id: 'direksiyon', ad: 'Direksiyon', hizmet: 'Direksiyon kaplama', gun: 0.4, sorun: ['asinma', 'yirtik', 'bastan'] },
  { id: 'tavan', ad: 'Tavan', hizmet: 'Tavan döşeme', gun: 1, sorun: ['sarkma', 'leke', 'bastan'] },
  { id: 'kapi-os', ad: 'Sol ön kapı', hizmet: 'Kapı döşemesi', gun: 0.35, sorun: KAPI },
  { id: 'kapi-og', ad: 'Sağ ön kapı', hizmet: 'Kapı döşemesi', gun: 0.35, sorun: KAPI },
  { id: 'kapi-as', ad: 'Sol arka kapı', hizmet: 'Kapı döşemesi', gun: 0.35, sorun: KAPI },
  { id: 'kapi-ag', ad: 'Sağ arka kapı', hizmet: 'Kapı döşemesi', gun: 0.35, sorun: KAPI },
];
const MALZEME = ['Karar vermedim', 'Hakiki deri', 'Suni deri', 'Kumaş', 'Alcantara'];
const P = Object.fromEntries(PARCALAR.map((p) => [p.id, p]));

// Üstten görünüş (viewBox 0 0 260 520). Her parça: görünen şekil + geniş dokunma alanı.
const koltuk = (id, x, y, w, h) => `
  <g class="im-p" data-p="${id}" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(P[id].ad)}">
    <rect class="im-hit" x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" />
    <rect class="im-s" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" />
    <rect class="im-d" x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h * 0.62}" rx="9" />
    <path class="im-d" d="M${x + 7} ${y + h * 0.78}h${w - 14}" />
    <rect class="im-d" x="${x + w / 2 - 12}" y="${y + h - 10}" width="24" height="7" rx="3" />
  </g>`;
const kapi = (id, x, y, h) => `
  <g class="im-p" data-p="${id}" role="button" tabindex="0" aria-pressed="false" aria-label="${esc(P[id].ad)}">
    <rect class="im-hit" x="${x - 9}" y="${y - 4}" width="34" height="${h + 8}" />
    <rect class="im-s" x="${x}" y="${y}" width="16" height="${h}" rx="6" />
    <path class="im-d" d="M${x + 8} ${y + 14}v${h - 28}" />
  </g>`;

const ARAC_SVG = `
  <svg class="im-arac" viewBox="0 0 260 520" aria-label="Aracın üstten görünüşü; parçalara dokunarak seçin">
    <defs>
      <pattern id="im-pepita" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 0h4v1h-4zM6 0h2v1h-2zM0 1h4v1h-4zM5 1h2v1h-2zM0 2h6v1h-6zM0 3h5v1h-5zM7 3h1v1h-1zM0 4h2v1h-2zM0 5h1v1h-1zM3 5h1v1h-1zM2 6h2v1h-2zM1 7h2v1h-2z" transform="scale(1.5)" />
      </pattern>
    </defs>
    <path class="im-govde" d="M130 14c-52 0-92 22-98 70l-4 60v250l6 70c4 32 40 44 96 44s92-12 96-44l6-70V144l-4-60c-6-48-46-70-98-70z" />
    <path class="im-ayna" d="M18 170l14-8v22zM242 170l-14-8v22z" />
    <path class="im-cam" d="M66 112c40-12 88-12 128 0l-10 40c-36-8-72-8-108 0z" />
    <path class="im-cam" d="M76 420c36 7 72 7 108 0l8 30c-40 10-84 10-124 0z" />
    <g class="im-p im-p--tavan" data-p="tavan" role="button" tabindex="0" aria-pressed="false" aria-label="Tavan">
      <rect class="im-hit im-hit--cizgi" x="50" y="158" width="160" height="254" rx="30" />
      <rect class="im-s" x="50" y="158" width="160" height="254" rx="30" />
    </g>
    <g class="im-p" data-p="direksiyon" role="button" tabindex="0" aria-pressed="false" aria-label="Direksiyon">
      <circle class="im-hit" cx="92" cy="176" r="24" />
      <circle class="im-s" cx="92" cy="176" r="15" />
      <path class="im-d" d="M77 176h30M92 176v15" />
    </g>
    ${koltuk('surucu', 64, 200, 56, 88)}
    ${koltuk('yolcu', 140, 200, 56, 88)}
    <rect class="im-konsol" x="124" y="204" width="12" height="84" rx="5" />
    ${koltuk('arka', 64, 310, 132, 82)}
    ${kapi('kapi-os', 30, 186, 110)}
    ${kapi('kapi-og', 214, 186, 110)}
    ${kapi('kapi-as', 30, 304, 96)}
    ${kapi('kapi-ag', 214, 304, 96)}
    <text class="im-yon" x="130" y="40">ÖN</text>
  </svg>`;

const SURE = (t) => {
  if (!t) return '—';
  if (t <= 0.5) return 'Aynı gün';
  const hi = Math.ceil(t);
  const lo = Math.max(1, Math.floor(t));
  return lo === hi ? `${hi} gün` : `${lo}-${hi} gün`;
};

export const icMekan = {
  render() {
    return `
      <section class="k-bolum im" aria-labelledby="im-baslik">
        <div class="k-kap">
          <div class="im__bas">
            <p class="pp-ust"><span class="pp-ust__kare" aria-hidden="true"></span>İç mekân haritası</p>
            <h2 class="k-h2" id="im-baslik" data-bol>Neresi dert? Dokunun, gösterin.</h2>
            <p class="k-lead">Aracın üstten görünüşünde sorunlu parçaya dokunun, ne olduğunu seçin. İş listesi ve tahmini süre kendiliğinden çıkar; tek tuşla bize gönderin.</p>
          </div>
          <div class="im__ic">
            <div class="im__sahne">
              ${ARAC_SVG}
              <p class="im__ipucu" aria-hidden="true">Parçaya dokunun</p>
            </div>
            <div class="im__panel">
              <div class="im__duzen" aria-live="polite">
                <p class="im__bos">Bir parça seçin. Koltuk, tavan, kapı ya da direksiyon.</p>
              </div>
              <fieldset class="im__malzeme">
                <legend>Malzeme tercihi</legend>
                <div>${MALZEME.map((m, i) => `<label><input type="radio" name="im-malzeme" value="${esc(m)}"${i === 0 ? ' checked' : ''}><span>${esc(m)}</span></label>`).join('')}</div>
              </fieldset>
              <div class="im__fis">
                <div class="im__fis-bas"><strong>İş listesi</strong><span data-o="adet">0 parça</span></div>
                <ol class="im__liste" data-o="liste"></ol>
                <dl class="im__toplam">
                  <div><dt>Tahmini süre</dt><dd data-o="sure">—</dd></div>
                  <div><dt>Fiyat</dt><dd class="im__fiyat">Aracı görünce yazılı</dd></div>
                </dl>
                <a class="k-btn im__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Bu listeyi gönder</span></a>
                <p class="im__kucuk">Süre, atölyedeki ortalama işçiliğe göre kabaca hesaplanır. Kesin günü ve fiyatı aracı gördükten sonra yazılı veririz.</p>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const secim = new Map([
      ['surucu', new Set(['yirtik'])],
      ['tavan', new Set(['sarkma'])],
    ]);
    let aktif = 'surucu';
    const svg = el.querySelector('.im-arac');
    const duzen = el.querySelector('.im__duzen');
    const liste = el.querySelector('[data-o="liste"]');
    const gonder = el.querySelector('.im__gonder');
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const malzeme = () => el.querySelector('input[name="im-malzeme"]:checked')?.value || MALZEME[0];

    const ciz = () => {
      svg.querySelectorAll('.im-p').forEach((g) => {
        const id = g.dataset.p;
        g.classList.toggle('is-secili', secim.has(id));
        g.classList.toggle('is-aktif', id === aktif);
        g.setAttribute('aria-pressed', secim.has(id));
      });
      // Düzenleyici: aktif parçanın sorunları
      const p = P[aktif];
      if (p && secim.has(aktif)) {
        const s = secim.get(aktif);
        duzen.innerHTML = `
          <div class="im__duzen-bas"><p class="im__parca">${esc(p.ad)}</p><button type="button" class="im__cikar" data-cikar>Listeden çıkar</button></div>
          <p class="im__soru">Ne oldu?</p>
          <div class="im__cipler">${p.sorun.map((k) => `<button type="button" class="im-cip" data-s="${k}" aria-pressed="${s.has(k)}">${esc(S[k])}</button>`).join('')}</div>`;
      } else {
        duzen.innerHTML = `<p class="im__bos">Bir parça seçin. Koltuk, tavan, kapı ya da direksiyon.</p>`;
      }
      // Liste ve toplam
      let t = 0;
      const satirlar = [];
      for (const [id, s] of secim) {
        const x = P[id];
        let g = x.gun;
        if (s.has('cokme')) g += 0.3;
        if (s.has('isitma')) g += 0.4;
        if (s.has('bastan')) g += 0.2;
        t += g;
        satirlar.push({ id, x, sorun: [...s].map((k) => S[k]) });
      }
      liste.innerHTML = satirlar
        .map((r, i) => `<li data-git="${r.id}" class="${r.id === aktif ? 'is-aktif' : ''}"><span class="im__no">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(r.x.ad)}</b><small>${esc(r.sorun.join(', ') || 'Bakılsın')} · ${esc(r.x.hizmet)}</small></span></li>`)
        .join('') || '<li class="im__liste-bos">Henüz parça yok</li>';
      o('adet').textContent = `${secim.size} parça`;
      o('sure').textContent = SURE(t);
      const mesaj = [
        `Merhaba ${d.isletme.ad}, aracımın iç döşemesi için fiyat almak istiyorum.`,
        ...satirlar.map((r, i) => `${i + 1}. ${r.x.ad}: ${r.sorun.join(', ') || 'bakılsın'}`),
        `Malzeme: ${malzeme()}`,
        `Tahmini süre (sitedeki hesap): ${SURE(t)}`,
      ].join('\n');
      gonder.href = waHref(d, mesaj);
      gonder.classList.toggle('is-pasif', !secim.size);
    };

    const ipucu = el.querySelector('.im__ipucu');
    const sec = (id) => {
      ipucu?.classList.add('is-gizli');
      if (!secim.has(id)) secim.set(id, new Set([P[id].sorun[0]]));
      aktif = id;
      ciz();
      if (!reducedMotion) {
        const g = svg.querySelector(`[data-p="${id}"] .im-s`);
        gsap.fromTo(g, { scale: 0.86, transformOrigin: 'center', transformBox: 'fill-box' }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        gsap.from(duzen.querySelectorAll('.im-cip'), { y: 10, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power2.out' });
      }
    };

    svg.addEventListener('click', (e) => {
      const g = e.target.closest('.im-p');
      if (g) sec(g.dataset.p);
    });
    svg.addEventListener('keydown', (e) => {
      const g = e.target.closest('.im-p');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        sec(g.dataset.p);
      }
    });
    duzen.addEventListener('click', (e) => {
      const c = e.target.closest('[data-s]');
      if (c) {
        const s = secim.get(aktif);
        s.has(c.dataset.s) ? s.delete(c.dataset.s) : s.add(c.dataset.s);
        ciz();
      }
      if (e.target.closest('[data-cikar]')) {
        secim.delete(aktif);
        aktif = [...secim.keys()].at(-1) || null;
        ciz();
      }
    });
    liste.addEventListener('click', (e) => {
      const li = e.target.closest('[data-git]');
      if (li) sec(li.dataset.git);
    });
    el.querySelector('.im__malzeme').addEventListener('change', ciz);
    ciz();

    if (!reducedMotion) {
      const parcalar = svg.querySelectorAll('.im-p:not(.im-p--tavan) .im-s');
      gsap.from(parcalar, {
        scale: 0.3, opacity: 0, transformOrigin: 'center', transformBox: 'fill-box', duration: 0.6, stagger: 0.05, ease: 'back.out(2)',
        scrollTrigger: { trigger: svg, start: 'top 80%', once: true },
      });
      gsap.from(svg.querySelector('.im-govde'), { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
    }
  },
};

// --- (2) Pepita alanı ------------------------------------------------------------------

const CUMLELER = [
  ['Yırtıldıysa', 'dikeriz.'],
  ['Çöktüyse', 'doldururuz.'],
  ['Sarktıysa', 'gereriz.'],
  ['Solduysa', 'yenileriz.'],
];

export const pepita = {
  render() {
    return `
      <section class="pp" aria-label="Döşemede ne yapıyoruz">
        <div class="pp__alan" aria-hidden="true"></div>
        <div class="pp__etiket">
          <p class="pp__kucuk">Şaşmaz · el dikişi</p>
          <p class="pp__cumle" aria-live="off">
            ${CUMLELER.map(([a, b], i) => `<span class="pp__satir${i === 0 ? ' is-on' : ''}"><span>${esc(a)}</span> <em>${esc(b)}</em></span>`).join('')}
          </p>
        </div>
      </section>`;
  },
  mount(el) {
    const alan = el.querySelector('.pp__alan');
    const kur = () => {
      const b = alan.getBoundingClientRect();
      const hucre = innerWidth < 700 ? 56 : 72;
      const sut = Math.ceil(b.width / hucre);
      const sat = Math.ceil(b.height / hucre);
      alan.style.setProperty('--h', `${hucre}px`);
      alan.style.gridTemplateColumns = `repeat(${sut}, ${hucre}px)`;
      alan.innerHTML = '<i></i>'.repeat(sut * sat);
    };
    kur();
    const satirlar = [...el.querySelectorAll('.pp__satir')];
    if (reducedMotion) return;

    gsap.fromTo(
      alan.children,
      { scale: 0, rotation: -90 },
      {
        scale: 1, rotation: 0, ease: 'power2.out',
        stagger: { each: 0.02, from: 'center', grid: 'auto' },
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'center 55%', scrub: 0.6 },
      }
    );
    gsap.fromTo(el.querySelector('.pp__etiket'), { rotation: -9, y: 60 }, {
      rotation: -3, y: -20, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });

    // Cümleler sırayla döner; bölüm ekrandayken.
    let i = 0;
    const dongu = gsap.timeline({ repeat: -1, paused: true });
    satirlar.forEach((_, k) => {
      dongu.add(() => {
        const eski = satirlar[i];
        i = (k + 1) % satirlar.length;
        const yeni = satirlar[i];
        gsap.to(eski, { yPercent: -110, opacity: 0, duration: 0.45, ease: 'power3.in', onComplete: () => eski.classList.remove('is-on') });
        yeni.classList.add('is-on');
        gsap.fromTo(yeni, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, delay: 0.35, ease: 'power3.out' });
      }, k * 2.4 + 2.4);
    });
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? dongu.play() : dongu.pause()));
    io.observe(el);
  },
};

// --- (3) Mesai etiketi ----------------------------------------------------------------

export const mesai = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    return `
      <section class="k-bolum ms" aria-labelledby="ms-baslik">
        <div class="k-kap ms__ic">
          <div class="ms__etiket">
            <p class="ms__ad">${esc(d.isletme.ad)}</p>
            <p class="ms__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <h2 class="ms__baslik" id="ms-baslik">Çalışma saatleri</h2>
            <dl class="ms__saat">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="ms__bugun">Bugün ${esc(GUNLER[bugun])}</p>
            <p class="ms__alt">El dikişi · Şaşmaz · Ankara</p>
          </div>
          <div class="ms__yer">
            <p class="pp-ust"><span class="pp-ust__kare" aria-hidden="true"></span>Atölye</p>
            <p class="ms__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="#/iletisim" data-rota="iletisim">İletişim sayfası</a>
            </div>
            <div class="ms__harita" data-src="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    const kutu = el.querySelector('.ms__harita');
    if (!kutu) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      kutu.innerHTML = `<iframe title="Konum haritası" src="${kutu.dataset.src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(kutu);
  },
};
