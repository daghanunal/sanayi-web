// Tav Rengi — sektör modülleri:
// (1) tavRengi: kaydırdıkça ısınan krank mili. Sarmış yatağın muylularda bıraktığı saman → bronz → mor → mavi izleri
//     ve her renkte atölyenin ne yaptığı. Skala düğmeleriyle de gezilir.
// (2) isFisi: getirilecek parçaları işaretleyin → yapılacak işler, tolerans, süre ve "yanınızda getirin" listesi olan iş fişi;
//     WhatsApp'a hazır mesaj.
// (3) mesai: ana sayfada saatler, canlı açık/kapalı, yol tarifi.
// (4) serit: hero altındaki tolerans şeridi.
import { esc, waHref, telHref, mapsHref, openStatus, groupedHours, icons, gsap, ScrollTrigger, reducedMotion } from '../../shared/core.js';

const CELIK = [200, 204, 210];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const karis = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

// --- Krank mili çizimi (4 silindir: 5 ana muylu, 4 kol muylusu) ---------------------------
function krankSvg() {
  const ana = [80, 290, 500, 710, 920];
  const kol = [[185, 70], [395, 190], [605, 190], [815, 70]];
  const govde = [];
  const muylu = [];
  // ön uç ve volan flanşı
  govde.push(`<rect x="0" y="113" width="40" height="34" rx="4" class="tv-g"/>`, `<rect x="6" y="119" width="28" height="4" class="tv-parlak"/>`);
  govde.push(`<rect x="965" y="44" width="34" height="172" rx="6" class="tv-g"/>`, `<rect x="971" y="52" width="6" height="156" class="tv-parlak"/>`);
  kol.forEach(([x, y]) => {
    const karsi = 130 + (130 - y) * 0.95;
    for (const wx of [x - 60, x + 30]) {
      const ust = Math.min(y, 130) - 46;
      const alt = Math.max(y, 130) + 46;
      govde.push(`<ellipse cx="${wx + 15}" cy="${karsi}" rx="17" ry="50" class="tv-g tv-g--koyu"/>`);
      govde.push(`<rect x="${wx}" y="${ust}" width="30" height="${alt - ust}" rx="15" class="tv-g"/>`);
    }
  });
  let i = 0;
  ana.forEach((x) => muylu.push({ x: x - 45, y: 100, w: 90, i: i++, tip: 'ana' }));
  kol.forEach(([x, y]) => muylu.push({ x: x - 30, y: y - 30, w: 60, i: i++, tip: 'kol' }));
  const m = muylu
    .map((j) => `<g class="tv-m" data-j="${j.i}" data-tip="${j.tip}">
        <rect x="${j.x}" y="${j.y}" width="${j.w}" height="60" rx="3" fill="url(#tv-cilali)"/>
        <rect x="${j.x}" y="${j.y}" width="${j.w}" height="60" rx="3" class="tv-iz" fill="rgb(200 204 210)" opacity="0"/>
        <rect x="${j.x}" y="${j.y + 12}" width="${j.w}" height="5" class="tv-parlak"/>
        <rect x="${j.x}" y="${j.y + 46}" width="${j.w}" height="2" class="tv-golge"/>
      </g>`)
    .join('');
  return `
    <svg viewBox="0 0 1000 260" role="img" aria-label="Dört silindirli krank mili çizimi; muylular ısıya göre renk alıyor">
      <defs>
        <linearGradient id="tv-cilali" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8d939b"/><stop offset=".22" stop-color="#eef1f4"/><stop offset=".5" stop-color="#b3b9c0"/>
          <stop offset=".78" stop-color="#e3e7eb"/><stop offset="1" stop-color="#6f757d"/>
        </linearGradient>
        <linearGradient id="tv-dokum" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7c838c"/><stop offset=".45" stop-color="#454a51"/><stop offset="1" stop-color="#23262b"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="130" x2="1000" y2="130" class="tv-eksen"/>
      ${govde.join('')}
      ${m}
    </svg>`;
}

export const tavRengi = {
  render(d) {
    const s = d.tavSkala;
    if (!s?.length) return '';
    return `
      <section class="k-bolum tv" aria-labelledby="tv-baslik">
        <div class="k-kap">
          <div class="tv__bas">
            <p class="tv__ust">Isı izi okuma</p>
            <h2 class="k-h2" id="tv-baslik" data-bol>Krank renk verdiyse yatak sarmıştır.</h2>
            <p class="k-lead">Yağ kesilince muylu ısınır, çelik saman sarısından maviye döner. Kaydırın, izin nasıl yayıldığını görün; her rengin tezgâhta ne demek olduğunu yazdık.</p>
          </div>
        </div>
        <div class="tv__sahne">
          <div class="tv__krank">${krankSvg()}</div>
          <div class="tv__okuma" aria-live="polite">
            <span class="tv__derece"><b data-o="derece">20</b><small>°C</small></span>
            <span class="tv__ad" data-o="ad">Temiz çelik</span>
          </div>
        </div>
        <div class="k-kap">
          <div class="tv__skala" role="group" aria-label="Isı renkleri">
            ${s.map((x, i) => `<button type="button" class="tv__dur" data-i="${i}" style="--r:${esc(x.renk)}"><i></i><span>${esc(x.ad)}</span><em>~${esc(x.derece)} °C</em></button>`).join('')}
            <span class="tv__imlec" aria-hidden="true"></span>
          </div>
          <p class="tv__metin" data-o="metin">Muylu ölçüsünde, iz yok. Standart kontrolden sonra işe devam.</p>
          <p class="tv__dip">Sıcaklıklar yaklaşıktır; renk yağa, süreye ve malzemeye göre değişir. Karar her zaman ölçü ve çatlak kontrolüyle verilir.</p>
        </div>
      </section>`;
  },
  mount(el, d) {
    const s = d.tavSkala;
    const renkler = s.map((x) => hex(x.renk));
    const muylular = [...el.querySelectorAll('.tv-m')].map((g) => ({ iz: g.querySelector('.tv-iz'), j: Number(g.dataset.j) }));
    // Sarma merkezi: 2. kol muylusu (j=6). Isı komşulara azalarak yayılır.
    const X = [80, 290, 500, 710, 920, 185, 395, 605, 815];
    const merkez = 395;
    const o = (k) => el.querySelector(`[data-o="${k}"]`);
    const imlec = el.querySelector('.tv__imlec');
    const durlar = [...el.querySelectorAll('.tv__dur')];
    let sonAsama = -2;

    // ısı 0..1 → renk (0: çelik, sonra skala durakları)
    const renk = (h) => {
      if (h <= 0) return { c: CELIK, a: 0 };
      const t = h * s.length; // 0..n
      const i = Math.min(s.length - 1, Math.floor(t));
      const f = t - i;
      const a = i === 0 ? Math.min(1, f * 1.6) : 1;
      const c = i === 0 ? renkler[0] : karis(renkler[i - 1], renkler[i], Math.min(1, f * 1.8));
      return { c, a };
    };

    const ciz = (p) => {
      muylular.forEach(({ iz, j }) => {
        const uzak = Math.abs(X[j] - merkez) / 520;
        const h = Math.max(0, Math.min(1, p * 1.25 - uzak * 0.95));
        const { c, a } = renk(h);
        iz.setAttribute('fill', rgb(c));
        iz.setAttribute('opacity', (a * 0.9).toFixed(3));
      });
      const asama = p <= 0.02 ? -1 : Math.min(s.length - 1, Math.floor(Math.min(0.999, p * 1.25) * s.length));
      const derece = p <= 0.02 ? 20 : Math.round(20 + (s[s.length - 1].derece - 20) * Math.min(1, p * 1.25) ** 0.6);
      o('derece').textContent = derece;
      imlec.style.left = `${Math.min(100, p * 1.25 * 100)}%`;
      if (asama !== sonAsama) {
        sonAsama = asama;
        o('ad').textContent = asama < 0 ? 'Temiz çelik' : s[asama].ad;
        o('metin').textContent = asama < 0 ? 'Muylu ölçüsünde, iz yok. Standart kontrolden sonra işe devam.' : s[asama].metin;
        el.style.setProperty('--tv-renk', asama < 0 ? '#c8ccd2' : s[asama].renk);
        durlar.forEach((b, i) => b.classList.toggle('is-aktif', i === asama));
      }
    };

    const durum = { p: 0 };
    const guncelle = () => ciz(durum.p);
    let st = null;
    if (reducedMotion) {
      durum.p = 0.62;
      guncelle();
    } else {
      st = ScrollTrigger.create({
        trigger: el.querySelector('.tv__sahne'),
        start: 'top 78%',
        end: 'bottom 22%',
        scrub: 0.6,
        onUpdate: (self) => {
          if (!durum.elle) { durum.p = self.progress; guncelle(); }
        },
      });
      guncelle();
    }
    durlar.forEach((b, i) =>
      b.addEventListener('click', () => {
        const hedef = ((i + 0.5) / s.length) / 1.25;
        durum.elle = true;
        if (reducedMotion) { durum.p = hedef; guncelle(); return; }
        gsap.to(durum, { p: hedef, duration: 0.7, ease: 'power3.out', onUpdate: guncelle, onComplete: () => { setTimeout(() => (durum.elle = false), 1200); } });
      })
    );
  },
};

// --- İş fişi ------------------------------------------------------------------------------
export const isFisi = {
  render(d) {
    const p = d.parcalar;
    if (!p?.length) return '';
    const bugun = new Date();
    const tarih = bugun.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `
      <section class="k-bolum fs" aria-labelledby="fs-baslik">
        <div class="k-kap">
          <div class="fs__bas">
            <p class="tv__ust">İş fişi</p>
            <h2 class="k-h2" id="fs-baslik" data-bol>Ne getiriyorsunuz? Fişi birlikte yazalım.</h2>
            <p class="k-lead">Parçaları işaretleyin. Yapılacak işler, çalıştığımız tolerans, ortalama süre ve yanınızda getirmeniz gerekenler fişe düşer. Fişi WhatsApp'tan gönderin, sıranızı ayıralım.</p>
          </div>
          <div class="fs__ic">
            <form class="fs__form" onsubmit="return false">
              <fieldset>
                <legend>Parçalar</legend>
                <div class="fs__parcalar">
                  ${p.map((x, i) => `<label class="fs__parca"><input type="checkbox" name="p" value="${esc(x.id)}"${i === 0 ? ' checked' : ''}><span class="fs__no">${String(i + 1).padStart(2, '0')}</span><span class="fs__ad">${esc(x.ad)}</span><span class="fs__tik" aria-hidden="true"></span></label>`).join('')}
                </div>
              </fieldset>
              <label class="fs__motor"><span>Motor ya da araç <span class="k-soluk">(isteğe bağlı)</span></span><input name="motor" placeholder="ör. 1.6 dizel, 2014 Doblo" autocomplete="off"></label>
            </form>
            <article class="fs__fis" aria-live="polite" aria-label="İş fişi önizlemesi">
              <header class="fs__fis-bas">
                <span class="fs__fis-ad">${esc(d.isletme.ad)}</span>
                <span class="fs__fis-tarih">${tarih}</span>
              </header>
              <p class="fs__fis-baslik">İş fişi <em data-f="adet">1 parça</em></p>
              <p class="fs__fis-motor" data-f="motor" hidden></p>
              <ol class="fs__satirlar" data-f="satirlar"></ol>
              <div class="fs__getir"><p>Yanınızda getirin</p><ul data-f="getir"></ul></div>
              <p class="fs__fiyat">Fiyat: parça ölçülünce, işe başlamadan söylenir.</p>
              <div class="fs__serit" aria-hidden="true"></div>
              <div class="fs__butonlar">
                <a class="k-btn fs__gonder" target="_blank" rel="noopener">${icons.whatsapp}<span>Fişi WhatsApp'tan gönder</span></a>
                <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
              </div>
            </article>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const hiz = Object.fromEntries((d.hizmetler || []).map((h) => [h.baslik, h]));
    const form = el.querySelector('.fs__form');
    const f = (k) => el.querySelector(`[data-f="${k}"]`);
    const gonder = el.querySelector('.fs__gonder');
    const guncelle = (anim) => {
      const secili = [...form.querySelectorAll('input[name="p"]:checked')].map((i) => d.parcalar.find((x) => x.id === i.value));
      const motor = form.elements.motor.value.trim();
      f('adet').textContent = secili.length ? `${secili.length} parça` : 'boş';
      f('motor').hidden = !motor;
      f('motor').textContent = motor ? `Motor: ${motor}` : '';
      f('satirlar').innerHTML = secili.length
        ? secili
            .map(
              (x) => `<li><p class="fs__satir-ad">${esc(x.ad)}</p><ul>${x.isler
                .map((ad) => {
                  const h = hiz[ad] || {};
                  return `<li><span>${esc(ad)}</span><b>${esc(h.tolerans || '')}</b><em>${esc(h.sureHam || '')}</em></li>`;
                })
                .join('')}</ul></li>`
            )
            .join('')
        : '<li class="fs__bos">Soldan en az bir parça işaretleyin.</li>';
      const getir = [...new Set(secili.flatMap((x) => x.getir))];
      f('getir').innerHTML = (getir.length ? getir : ['Parçanın kendisi']).map((g) => `<li>${esc(g)}</li>`).join('');
      const mesaj = [
        `Merhaba ${d.isletme.ad}, iş getirmek istiyorum.`,
        motor ? `Motor: ${motor}` : '',
        ...secili.map((x) => `- ${x.ad}: ${x.isler.join(', ')}`),
        'Ne zaman getirebilirim?',
      ].filter(Boolean).join('\n');
      gonder.href = waHref(d, mesaj);
      if (anim && !reducedMotion) gsap.from(f('satirlar').children, { x: -14, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' });
    };
    form.addEventListener('change', () => guncelle(true));
    form.elements.motor.addEventListener('input', () => guncelle(false));
    guncelle(false);
    if (!reducedMotion) {
      gsap.from(el.querySelector('.fs__fis'), {
        clipPath: 'inset(0 0 100% 0)', y: -20, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el.querySelector('.fs__fis'), start: 'top 82%', toggleActions: 'play none none none' },
      });
    }
  },
};

// --- Mesai --------------------------------------------------------------------------------
export const mesai = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    return `
      <section class="k-bolum ms" aria-labelledby="ms-baslik">
        <div class="k-kap ms__ic">
          <div>
            <p class="tv__ust">Atölye saatleri</p>
            <h2 class="k-h2" id="ms-baslik" data-bol>Tezgâh bu saatlerde döner.</h2>
            <p class="ms__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
            <p class="ms__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="#/iletisim" data-rota="iletisim">Harita ve form</a>
            </div>
          </div>
          <dl class="ms__saatler" data-sira>
            ${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
          </dl>
        </div>
      </section>`;
  },
};

// --- Tolerans şeridi ----------------------------------------------------------------------
export const serit = {
  render(d) {
    const h = (d.hizmetler || []).filter((x) => x.tolerans);
    if (!h.length) return '';
    const bir = h.map((x) => `<span>${esc(x.baslik)}</span><b>${esc(x.tolerans)}</b>`).join('');
    return `<div class="sr" aria-hidden="true"><div class="sr__ic"><div class="sr__grup">${bir}</div><div class="sr__grup">${bir}</div></div></div>`;
  },
};
