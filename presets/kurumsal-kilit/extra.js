// Sektör modülleri — "Diş kodu" yönü.
// silindir:   hero; pimli kilit silindirinin kesiti. Anahtar girer, pimler dişlere göre yükselip alçalır,
//             bütün pimler kesme hattına oturunca kilit döner ve çip tanınır. Anahtar parmakla sürüklenir.
// serit:      hero altı kayan diş kodu şeridi (yalnızca CSS transform).
// anahtarBul: "anahtarınız hangisi?" seçici → yapılan iş, süre, yanınıza alın, WhatsApp'a hazır mesaj.
// kapida:     kapıda kalan araç + ruhsat/kimlik kontrolü (tikler sırayla çizilir).
// saat:       çalışma saatleri anahtar etiketleri gibi askıda; canlı açık/kapalı, yol tarifi, yaklaşınca harita.
import { esc, asset, telHref, waHref, mapsHref, mapsEmbed, openStatus, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;

// --- Silindir geometrisi (SVG birimleri) -----------------------------------------------------
const PIM_X = [330, 394, 458, 522, 586];
const KESIK = [212, 226, 204, 232, 218]; // anahtar üst kenarının pim altındaki yüksekliği (büyük = derin)
const KESME = 178; // kesme hattı
const SIRT = 200; // kesilmemiş bıçak üst kenarı
const DINLEN = 250; // anahtar yokken pimin indiği yer
const SURUCU = 40; // üst pim boyu
const ODA_UST = 62;
const TAM = 640; // anahtar ucu tam girdiğinde
const BAS = 250; // anahtar ucu yüzeyde
const BOY = PIM_X.map((x, i) => KESIK[i] - KESME); // alt pim boyları
const U = PIM_X.map((x) => TAM - x); // pimlerin anahtar ucundan uzaklığı
const OMUZ = 392;
const KOD = KESIK.map((k) => Math.round((k - SIRT) / 6) + 1); // 1-6 arası diş derinliği kodu

// Anahtar üst kenarı: uçtan (u = 0) başa doğru.
const PROFIL = (() => {
  const p = [[0, 262], [22, SIRT]];
  [...U].reverse().forEach((u, j) => {
    const k = KESIK[PIM_X.length - 1 - j];
    p.push([u - 22, SIRT], [u - 5, k], [u + 5, k], [u + 22, SIRT]);
  });
  p.push([OMUZ, SIRT]);
  return p;
})();
function ustKenar(u) {
  if (u < 0) return Infinity;
  if (u >= OMUZ) return SIRT;
  for (let i = 1; i < PROFIL.length; i++) {
    const [u1, y1] = PROFIL[i];
    const [u0, y0] = PROFIL[i - 1];
    if (u <= u1) return y0 + ((y1 - y0) * (u - u0)) / (u1 - u0 || 1);
  }
  return SIRT;
}
const yay = (ust, alt, x) => {
  const n = 7;
  const h = (alt - ust) / n;
  let d = `M${x} ${ust}`;
  for (let i = 1; i <= n; i++) d += ` L${x + (i % 2 ? 9 : -9)} ${ust + h * (i - 0.5)} L${x} ${ust + h * i}`;
  return d;
};

function silindirSvg() {
  const anahtarYol = `M0 262 ${PROFIL.slice(1).map(([u, y]) => `L${-u} ${y}`).join(' ')} L${-OMUZ} 188 L${-OMUZ - 18} 188 L${-OMUZ - 18} 290 L${-OMUZ} 290 L${-OMUZ} 278 L-10 278 Z`;
  const odalar = PIM_X.map((x) => `<rect x="${x - 14}" y="${ODA_UST - 4}" width="28" height="${196 - ODA_UST + 4}" rx="3"/>`).join('');
  const pimler = PIM_X.map(
    (x, i) => `<g class="sl-pim" data-i="${i}">
      <path class="sl-yay" d="${yay(ODA_UST, 120, x)}"/>
      <rect class="sl-surucu" x="${x - 11}" y="0" width="22" height="${SURUCU}" rx="3"/>
      <path class="sl-alt" d="M${x - 11} 0 h22 v${BOY[i] - 9} l-11 9 l-11 -9 Z"/>
    </g>`
  ).join('');
  const etiketler = PIM_X.map((x, i) => `<text class="sl-no" x="${x}" y="336" text-anchor="middle">${KOD[i]}</text>`).join('');
  return `
  <svg class="sl-svg" viewBox="-40 0 800 356" role="img" aria-label="Pimli kilit silindirinin kesiti: anahtar girince pimler kesme hattına hizalanır ve kilit döner">
    <defs>
      <pattern id="sl-tarama" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" class="sl-govde-dolgu"/><line x1="0" y1="0" x2="0" y2="9" class="sl-tarama-cizgi"/></pattern>
      <linearGradient id="sl-anahtar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f8f6"/><stop offset=".55" stop-color="#c3cdca"/><stop offset="1" stop-color="#8d9a97"/></linearGradient>
      <linearGradient id="sl-alt-pim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#009c90"/><stop offset=".45" stop-color="#3ee6d6"/><stop offset="1" stop-color="#00877d"/></linearGradient>
      <linearGradient id="sl-ust-pim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d8f8c"/><stop offset=".45" stop-color="#dfe7e4"/><stop offset="1" stop-color="#6c7d7a"/></linearGradient>
      <clipPath id="sl-kirp"><rect x="250" y="0" width="480" height="356"/></clipPath>
    </defs>
    <g class="sl-on" transform="translate(76 78)">
      <circle r="44" class="sl-on-dis"/>
      <g class="sl-on-gobek"><circle r="30" class="sl-on-ic"/><rect x="-4" y="-19" width="8" height="38" rx="3" class="sl-on-yuva"/></g>
      <text y="68" text-anchor="middle" class="sl-kucuk">ÖN GÖRÜNÜŞ</text>
    </g>
    <rect x="250" y="40" width="440" height="270" rx="16" fill="url(#sl-tarama)" class="sl-govde"/>
    <rect x="250" y="${KESME}" width="400" height="112" class="sl-gobek"/>
    <rect x="250" y="196" width="398" height="86" class="sl-yuva"/>
    <g class="sl-odalar">${odalar}</g>
    <line class="sl-kesme" x1="250" y1="${KESME}" x2="650" y2="${KESME}"/>
    <line class="sl-kesme" x1="690" y1="${KESME}" x2="704" y2="${KESME}"/><text class="sl-kucuk sl-kesme-yazi" x="708" y="${KESME - 4}">KESME</text><text class="sl-kucuk sl-kesme-yazi" x="708" y="${KESME + 12}">HATTI</text>
    <g class="sl-anahtar" data-anahtar>
      <path d="${anahtarYol}" fill="url(#sl-anahtar)" class="sl-bicak"/>
      <line x1="-40" y1="239" x2="${-OMUZ + 10}" y2="239" class="sl-oluk"/>
      <g transform="translate(${-OMUZ - 18} 0)">
        <rect x="-170" y="146" width="176" height="176" rx="52" class="sl-bas"/>
        <rect x="-116" y="210" width="44" height="46" rx="6" class="sl-cip"/>
        <path d="M-108 222h28M-108 233h28M-108 244h28" class="sl-cip-cizgi"/>
        <g class="sl-dalga"><path d="M-60 214q14 19 0 38"/><path d="M-46 204q24 29 0 58"/><path d="M-32 194q34 39 0 78"/></g>
        <circle cx="-138" cy="234" r="12" class="sl-delik"/>
      </g>
    </g>
    <g class="sl-pimler" clip-path="url(#sl-kirp)">${pimler}</g>
    <rect x="236" y="30" width="16" height="158" rx="4" class="sl-yuz"/>
    <rect x="236" y="288" width="16" height="32" rx="4" class="sl-yuz"/>
    ${etiketler}
  </svg>`;
}

export const silindir = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const ust = `${h.ust || d.isletme.sektor}. ${tema.yer} ${yilEki(d.isletme.kurulus)} beri.`;
    const st = d.saatler ? openStatus(d.saatler) : null;
    const acma = d.hizmetler?.[5]?.sure;
    const bilgi = [['Kuruluş', String(d.isletme.kurulus)], st ? ['Bugün', st.text] : null, acma ? ['Kapı açma', acma] : null, ['Telefon', d.iletisim.telefon]]
      .filter(Boolean)
      .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
      .join('');
    return `
      <section class="k-hero sl" aria-label="Giriş">
        <div class="k-kap k-hero__ic sl__ic">
          <div class="k-hero__metin">
            <p class="k-hero__ust sl__ust"><span class="sl__led" aria-hidden="true"></span>${esc(ust)}</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(h.birincil || 'Bize yazın')} ${ok}`)}
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <figure class="sl__sahne">
            <div class="sl__durum" aria-live="polite"><span class="sl__isik"></span><b data-durum>Anahtar bekleniyor</b><em data-kod>DİŞ KODU ${KOD.join(' · ')}</em></div>
            ${silindirSvg()}
            <div class="sl__kontrol">
              <label class="sl__ray"><span class="sl__ray-yazi">Anahtarı itin</span><input type="range" min="0" max="1000" value="0" data-ray aria-label="Anahtarı kilide itin ya da çekin"></label>
              <button type="button" class="sl__tekrar" data-tekrar>Tekrar tak</button>
            </div>
          </figure>
        </div>
        <div class="k-kap"><dl class="k-hero__bilgi sl__bilgi">${bilgi}</dl></div>
      </section>`;
  },
  mount(el) {
    const svg = el.querySelector('.sl-svg');
    const anahtar = el.querySelector('[data-anahtar]');
    const pimler = [...el.querySelectorAll('.sl-pim')];
    const durum = el.querySelector('[data-durum]');
    const ray = el.querySelector('[data-ray]');
    const gobek = el.querySelector('.sl-on-gobek');
    const sahne = el.querySelector('.sl__sahne');
    const parca = pimler.map((g) => ({ yay: g.querySelector('.sl-yay'), sur: g.querySelector('.sl-surucu'), alt: g.querySelector('.sl-alt'), g }));
    const s = { x: BAS };
    let acik = false;
    let donus = null;

    const ciz = () => {
      anahtar.setAttribute('transform', `translate(${s.x} 0)`);
      let hizali = 0;
      PIM_X.forEach((x, i) => {
        const alt = Math.min(DINLEN, ustKenar(s.x - x));
        const ust = alt - BOY[i];
        const sur = ust - SURUCU;
        parca[i].alt.setAttribute('transform', `translate(0 ${ust.toFixed(1)})`);
        parca[i].sur.setAttribute('y', sur.toFixed(1));
        parca[i].yay.setAttribute('d', yay(ODA_UST, sur, x));
        const h = Math.abs(ust - KESME) < 1.2;
        parca[i].g.classList.toggle('is-hiza', h && s.x > TAM - 30);
        if (h) hizali++;
      });
      ray.value = Math.round(((s.x - BAS) / (TAM - BAS)) * 1000);
      const yeni = hizali === PIM_X.length && s.x >= TAM - 0.5;
      if (yeni !== acik) {
        acik = yeni;
        sahne.classList.toggle('is-acik', acik);
        durum.textContent = acik ? 'Pimler hizada · kilit döndü' : s.x > BAS + 20 ? 'Pimler dişleri okuyor' : 'Anahtar bekleniyor';
        donus?.kill();
        donus = gsap.to(gobek, { rotation: acik ? 90 : 0, svgOrigin: '0 0', duration: reducedMotion ? 0 : 0.7, ease: acik ? 'back.out(1.8)' : 'power2.out' });
      } else if (!acik) {
        durum.textContent = s.x > BAS + 20 ? 'Pimler dişleri okuyor' : 'Anahtar bekleniyor';
      }
    };

    let tw = null;
    const tak = (gecikme = 0) => {
      tw?.kill();
      if (reducedMotion) {
        s.x = TAM;
        ciz();
        return;
      }
      tw = gsap.timeline({ delay: gecikme })
        .to(s, { x: BAS, duration: s.x > BAS ? 0.6 : 0, ease: 'power2.in', onUpdate: ciz })
        .to(s, { x: TAM, duration: 2.8, ease: 'power1.inOut', onUpdate: ciz });
    };
    ciz();
    tak(0.9);

    ray.addEventListener('input', () => {
      tw?.kill();
      s.x = BAS + (ray.value / 1000) * (TAM - BAS);
      ciz();
    });
    el.querySelector('[data-tekrar]').addEventListener('click', () => tak(0));

    // Anahtarı parmakla sürükle.
    let bas = null;
    svg.addEventListener('pointerdown', (e) => {
      tw?.kill();
      const r = svg.getBoundingClientRect();
      bas = { px: e.clientX, x: s.x, olcek: 800 / r.width };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!bas) return;
      s.x = Math.max(BAS, Math.min(TAM, bas.x + (e.clientX - bas.px) * bas.olcek));
      ciz();
    });
    const birak = () => (bas = null);
    svg.addEventListener('pointerup', birak);
    svg.addEventListener('pointercancel', birak);
    return () => tw?.kill();
  },
};

// --- Şerit -----------------------------------------------------------------------------------
export const serit = {
  render(d) {
    const parcalar = (d.hizmetler || []).map((h) => h.baslik);
    const kod = KOD.join('-');
    const bir = parcalar.map((p, i) => `<span>${esc(p)}</span><i aria-hidden="true">${i % 2 ? kod : '◆'}</i>`).join('');
    return `
      <section class="sr" aria-label="Yaptığımız işler">
        <div class="sr__bant"><div class="sr__ic">${bir}</div><div class="sr__ic" aria-hidden="true">${bir}</div></div>
      </section>`;
  },
};

// --- Anahtar bulucu ----------------------------------------------------------------------------
const IKON = {
  duz: `<circle cx="22" cy="24" r="15"/><circle cx="16" cy="24" r="4" class="i-bos"/><path d="M37 20h70l6 4-6 4H98l-4 5-4-5h-6l-4 6-4-6h-6l-3 4-3-4H37z"/>`,
  cipli: `<rect x="4" y="8" width="38" height="32" rx="12"/><rect x="14" y="17" width="12" height="14" rx="2" class="i-bos"/><path d="M42 20h65l6 4-6 4H98l-4 5-4-5h-6l-4 6-4-6h-6l-3 4-3-4H42z"/>`,
  sustali: `<rect x="4" y="6" width="48" height="36" rx="14"/><circle cx="18" cy="17" r="4" class="i-bos"/><circle cx="18" cy="31" r="4" class="i-bos"/><circle cx="34" cy="24" r="4" class="i-bos"/><path d="M52 18l54-12 5 4-3 5-8 2 0 6-5-4-6 2 0 6-5-5-6 2-1 5-4-5-11 3z"/>`,
  akilli: `<rect x="24" y="3" width="72" height="42" rx="18"/><circle cx="44" cy="24" r="5" class="i-bos"/><circle cx="60" cy="24" r="5" class="i-bos"/><circle cx="76" cy="24" r="5" class="i-bos"/>`,
  yok: `<circle cx="22" cy="24" r="15" class="i-kesik"/><path d="M37 20h70l6 4-6 4H37z" class="i-kesik"/><path d="M50 8l32 32M82 8L50 40" class="i-carpi"/>`,
};

export const anahtarBul = {
  render(d) {
    const tipler = d.kurumsal?.anahtarTipleri;
    if (!tipler?.length) return '';
    return `
      <section class="k-bolum ab" aria-labelledby="ab-baslik">
        <div class="k-kap">
          <div class="ab__bas">
            <p class="ab__etiket">Anahtar tipi</p>
            <h2 class="k-h2" id="ab-baslik" data-bol>Anahtarınız hangisi?</h2>
            <p class="k-lead">Seçin; ne yaptığımızı, ne kadar sürdüğünü ve yanınıza ne almanız gerektiğini görün.</p>
          </div>
          <div class="ab__sekmeler" role="tablist" aria-label="Anahtar tipleri">
            ${tipler
              .map(
                (t, i) => `<button type="button" role="tab" class="ab__sekme" id="ab-s-${t.id}" aria-controls="ab-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">
                  <span class="ab__delik" aria-hidden="true"></span>
                  <svg viewBox="0 0 120 48" aria-hidden="true">${IKON[t.id] || IKON.duz}</svg>
                  <span class="ab__ad">${esc(t.ad)}</span>
                  <span class="ab__kisa">${esc(t.kisa)}</span>
                </button>`
              )
              .join('')}
          </div>
          <div class="ab__panel" id="ab-panel" role="tabpanel" aria-labelledby="ab-s-${tipler[0].id}" aria-live="polite">${abPanel(d, 0)}</div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const tipler = d.kurumsal.anahtarTipleri;
    const sekmeler = [...el.querySelectorAll('.ab__sekme')];
    const panel = el.querySelector('.ab__panel');
    let secili = 0;
    const baglaForm = () => {
      const form = panel.querySelector('.ab__form');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const t = tipler[secili];
        const arac = [f.get('marka'), f.get('model')?.trim(), f.get('yil')?.trim()].filter(Boolean).join(' ');
        const metin = `Merhaba ${d.isletme.ad}, ${t.baslik.toLocaleLowerCase('tr')} için bilgi almak istiyorum.${arac ? `\nAraç: ${arac}` : ''}`;
        window.open(waHref(d, metin), '_blank', 'noopener');
      });
    };
    const sec = (i, odak) => {
      if (i === secili) return;
      secili = i;
      sekmeler.forEach((s, j) => {
        s.setAttribute('aria-selected', j === i);
        s.tabIndex = j === i ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', sekmeler[i].id);
      if (odak) sekmeler[i].focus();
      const yaz = () => {
        panel.innerHTML = abPanel(d, i);
        baglaForm();
      };
      if (reducedMotion) return yaz();
      gsap.timeline()
        .to(panel.children, { opacity: 0, y: -10, duration: 0.18, ease: 'power2.in' })
        .add(yaz)
        .fromTo(() => panel.querySelectorAll('.ab__p-sol > *, .ab__is li, .ab__form'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power3.out' });
      gsap.fromTo(sekmeler[i].querySelector('svg'), { rotation: -14 }, { rotation: 0, duration: 0.8, ease: 'elastic.out(1, .4)', transformOrigin: '20% 50%' });
    };
    sekmeler.forEach((s, i) => s.addEventListener('click', () => sec(i)));
    el.querySelector('.ab__sekmeler').addEventListener('keydown', (e) => {
      const yon = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!yon) return;
      e.preventDefault();
      sec((secili + yon + sekmeler.length) % sekmeler.length, true);
    });
    baglaForm();
  },
};

function abPanel(d, i) {
  const t = d.kurumsal.anahtarTipleri[i];
  const isler = (t.hizmetler || []).map((n) => d.hizmetler?.[n]).filter(Boolean);
  const markalar = d.markalar || [];
  return `
    <div class="ab__p-sol">
      <p class="ab__no">${String(i + 1).padStart(2, '0')} / ${String(d.kurumsal.anahtarTipleri.length).padStart(2, '0')}</p>
      <h3 class="k-h3 ab__p-baslik">${esc(t.baslik)}</h3>
      <p class="ab__p-metin">${esc(t.metin)}</p>
      ${t.getirin?.length ? `<p class="ab__alt">Yanınıza alın</p><ul class="ab__getir">${t.getirin.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="ab__p-sag">
      <ul class="ab__is">
        ${isler
          .map(
            (h) => `<li><a href="#/iletisim?konu=${encodeURIComponent(h.baslik)}" data-rota="iletisim?konu=${encodeURIComponent(h.baslik)}">
              <span class="ab__is-ad">${esc(h.baslik)}</span><span class="ab__is-sure">${esc(h.sure || '')}</span>${ok}</a></li>`
          )
          .join('')}
      </ul>
      ${
        d.iletisim.whatsapp
          ? `<form class="ab__form">
              <p class="ab__alt">Aracınızı yazın, WhatsApp'tan soralım</p>
              <div class="ab__alanlar">
                <label><span>Marka</span><select name="marka"><option value="">Seçin</option>${markalar.map((m) => `<option>${esc(m)}</option>`).join('')}<option>Diğer</option></select></label>
                <label><span>Model</span><input name="model" autocomplete="off" placeholder="Clio"></label>
                <label><span>Yıl</span><input name="yil" inputmode="numeric" maxlength="4" placeholder="2015"></label>
              </div>
              <button type="submit" class="k-btn">${icons.whatsapp}<span>WhatsApp'tan sorun</span></button>
            </form>`
          : `<a class="k-btn" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>`
      }
    </div>`;
}

// --- Kapıda kaldınız mı? ----------------------------------------------------------------------
export const kapida = {
  render(d) {
    const h = d.hizmetler?.[5];
    const tik = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>`;
    return `
      <section class="k-bolum kp" aria-labelledby="kp-baslik">
        <div class="k-kap kp__ic">
          <div class="kp__metin">
            <p class="ab__etiket">Kapıda kaldıysanız</p>
            <h2 class="k-h2" id="kp-baslik" data-bol>Anahtar içeride, kapı kilitli mi?</h2>
            <p class="k-lead">${esc(h?.aciklama || 'Kapıyı ve camı zorlamadan, özel açma aletleriyle açarız.')}</p>
            ${h?.sure ? `<p class="kp__sure"><span>Açma süresi</span><b>${esc(h.sure)}</b></p>` : ''}
            <div class="k-butonlar">
              <a class="k-btn" href="${telHref(d)}">${icons.phone}<span>Hemen arayın</span></a>
              ${d.iletisim.whatsapp ? `<a class="k-btn k-btn--ikincil" href="${waHref(d, `Merhaba ${d.isletme.ad}, aracımın anahtarı içeride kaldı. Konumum:`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Konum gönderin</span></a>` : ''}
            </div>
          </div>
          <div class="kp__gorsel">
            <figure data-perde><img src="${asset('/img/kurumsal-kilit/kapi-acma.jpg')}" alt="Araç kapı kilidine takılmış açma aleti" loading="lazy"></figure>
            <div class="kp__kart" role="group" aria-label="Kapıyı açmadan önce yapılan kontrol">
              <p class="kp__kart-bas">Açmadan önce</p>
              <ol>
                <li><span class="kp__tik">${tik}</span><div><b>Ruhsat</b><span>Araç sahibinin adı</span></div></li>
                <li><span class="kp__tik">${tik}</span><div><b>Kimlik</b><span>Ruhsattaki isimle aynı mı</span></div></li>
                <li><span class="kp__tik">${tik}</span><div><b>Eşleşti</b><span>Kapı zorlamadan açılır</span></div></li>
              </ol>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const yollar = el.querySelectorAll('.kp__tik path');
    const satirlar = el.querySelectorAll('.kp__kart li');
    gsap.set(yollar, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(satirlar, { opacity: 0.35 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector('.kp__kart'), start: 'top 80%', once: true } });
    satirlar.forEach((s, i) => {
      tl.to(s, { opacity: 1, duration: 0.25 }, i * 0.55).to(yollar[i], { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, i * 0.55 + 0.1);
    });
    tl.add(() => el.querySelector('.kp__kart').classList.add('is-tamam'));
  },
};

// --- Çalışma saatleri: askıdaki anahtar etiketleri -------------------------------------------
const KISA_GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const saat = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    return `
      <section class="k-bolum st" aria-labelledby="st-baslik">
        <div class="k-kap">
          <div class="st__bas">
            <div>
              <p class="ab__etiket">Çalışma saatleri</p>
              <h2 class="k-h2" id="st-baslik" data-bol>Şaşmaz Oto Sanayi'deyiz.</h2>
            </div>
            <p class="st__durum ${st.open ? 'is-acik' : ''}"><span></span>${esc(st.text)}</p>
          </div>
          <div class="st__ray" aria-hidden="true"></div>
          <ol class="st__etiketler">
            ${[1, 2, 3, 4, 5, 6, 0]
              .map((g, j) => {
                const s = d.saatler[g];
                const [a, k] = s ? s.split('-') : [];
                return `<li class="${g === bugun ? 'is-bugun' : ''}${s ? '' : ' is-kapali'}" style="--r:${[-3, 2, -1, 3, -2, 1, -3][j]}deg">
                  <span class="st__halka" aria-hidden="true"></span>
                  <span class="st__gun"><abbr title="${GUNLER[g]}">${KISA_GUN[g]}</abbr></span>
                  ${s ? `<b>${esc(a)}</b><b>${esc(k)}</b>` : '<b class="st__kapali">Kapalı</b>'}
                  ${g === bugun ? '<em>Bugün</em>' : ''}
                </li>`;
              })
              .join('')}
          </ol>
          <div class="st__alt">
            <div class="st__adres">
              <p>${esc(d.iletisim.adres)}</p>
              <div class="k-butonlar">
                <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
                <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
              </div>
            </div>
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
    if (!reducedMotion) {
      gsap.from(el.querySelectorAll('.st__etiketler li'), {
        yPercent: -40, rotation: (i) => (i % 2 ? 18 : -18), opacity: 0, transformOrigin: '50% 0%',
        duration: 1.1, stagger: 0.07, ease: 'elastic.out(1, .45)',
        scrollTrigger: { trigger: el.querySelector('.st__etiketler'), start: 'top 85%', once: true },
      });
    }
    return () => io.disconnect();
  },
};
