// Sektör modülleri:
// (1) hero: patlıcan-siyahı giriş, kesiti açılmış şanzıman fotoğrafında parça notları, P-R-N-D göstergesi
//     (açılışta P'den D'ye geçer, kaydırdıkça vites numarası 1'den 6'ya çıkar).
// (2) kayit: "vites kaydı" ekranı. Şanzıman tipini ve şikâyeti seçin → devir eğrisi o arızanın izine dönüşür,
//     arızanın çıktığı yer işaretlenir; yanında sebep, önce bakılanlar ve ilgili hizmet. Oynatma çizgisi
//     yalnızca ekran görünürken döner.
// (3) tipler: klasik / DSG / CVT, her biri için küçük çalışan şema (yalnızca görünürken).
// (4) atolye: bugün açık mı, saatler, adres, yaklaşınca yüklenen harita.
import { esc, telHref, mapsHref, mapsEmbed, openStatus, groupedHours, GUNLER, icons, gsap, reducedMotion } from '../../shared/core.js';
import { yilEki, ok } from '../_kurumsal/bolumler.js';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

const k = (d) => d.kurumsal || {};
const rotaLink = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const gorunurken = (el, fn, margin = '60px') => {
  const io = new IntersectionObserver(([e]) => fn(e.isIntersecting), { rootMargin: margin });
  io.observe(el);
  return io;
};

// --- (1) Hero ---------------------------------------------------------------------------------
const NOTLAR = [
  { x: 17, y: 47, ad: 'Tork konvertörü' },
  { x: 56, y: 33, ad: 'Kavramalar ve planet dişliler' },
  { x: 55, y: 73, ad: 'Valf gövdesi' },
];
const VITES = ['P', 'R', 'N', 'D'];

export const hero = {
  render(d, { tema }) {
    const h = k(d).hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bilgi = [
      ['Kuruluş', String(d.isletme.kurulus || '')],
      st ? ['Bugün', st.text] : null,
      ['Telefon', d.iletisim.telefon],
    ].filter((x) => x && x[1]);
    return `
      <section class="sz-hero" aria-label="Giriş">
        <div class="k-kap sz-hero__ic">
          <div class="sz-hero__metin">
            <p class="sz-etiket sz-etiket--acik"><span class="sz-led" aria-hidden="true"></span>${esc(d.isletme.sektor)} · ${tema.yer ? `${esc(tema.yer)} ` : ''}${d.isletme.kurulus ? `${yilEki(d.isletme.kurulus)} beri` : ''}</p>
            <h1 class="k-h1 sz-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead sz-hero__lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rotaLink('iletisim', `${esc(h.birincil || 'Teklif isteyin')} ${ok}`)}
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="sz-hero__sahne">
            <figure class="sz-kesit" data-perde>
              <img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high" width="1700" height="1133">
              <ul class="sz-kesit__notlar" aria-hidden="true">
                ${NOTLAR.map((n, i) => `<li style="--x:${n.x}%;--y:${n.y}%" class="${n.x > 50 ? 'is-sag' : ''}"><i></i><span><b>0${i + 1}</b>${esc(n.ad)}</span></li>`).join('')}
              </ul>
            </figure>
            <div class="sz-prnd" aria-hidden="true">
              <ol>${VITES.map((v) => `<li data-v="${v}">${v}</li>`).join('')}</ol>
              <p class="sz-prnd__ekran"><span data-vites>P</span><small data-vites-alt>vites</small></p>
            </div>
          </div>
        </div>
        ${bilgi.length ? `<div class="k-kap"><dl class="sz-hero__bilgi">${bilgi.map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>` : ''}
      </section>`;
  },
  mount(el) {
    const harfler = [...el.querySelectorAll('.sz-prnd li')];
    const ekran = el.querySelector('[data-vites]');
    const alt = el.querySelector('[data-vites-alt]');
    const sec = (v) => harfler.forEach((h) => h.classList.toggle('is-aktif', h.dataset.v === v));
    const notlar = el.querySelectorAll('.sz-kesit__notlar li');
    if (reducedMotion) {
      sec('D');
      ekran.textContent = 'D1';
      return;
    }
    sec('P');
    const tl = gsap.timeline({ delay: 1.2 });
    ['R', 'N', 'D'].forEach((v, i) => tl.add(() => { sec(v); ekran.textContent = v; }, i * 0.38));
    tl.add(() => { ekran.textContent = 'D1'; alt.textContent = 'sürüş'; }, 1.3);
    gsap.from(notlar, { opacity: 0, scale: 0.6, duration: 0.5, stagger: 0.15, delay: 1.5, ease: 'back.out(2)' });
    // Kaydırdıkça vites numarası yükselir: D1 → D6.
    let son = 1;
    gsap.to({}, {
      scrollTrigger: {
        trigger: el, start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (st) => {
          const g = Math.min(6, 1 + Math.floor(st.progress * 6));
          if (g !== son && tl.progress() === 1) { son = g; ekran.textContent = `D${g}`; }
        },
      },
    });
  },
};

// --- (2) Vites kaydı ekranı ---------------------------------------------------------------------
const TIPLER = [
  { id: 'klasik', ad: 'Tork konvertörlü' },
  { id: 'dsg', ad: 'DSG / çift kavrama' },
  { id: 'cvt', ad: 'CVT' },
];

const SIKAYETLER = [
  {
    id: 'vuruntu', ad: 'Vites vuruyor', iz: 'Geçişte devir sert düşüp dalgalanıyor: tekme gibi hissedilir.',
    sebep: {
      klasik: 'Geçiş basıncını ayarlayan solenoidler ya da yorulmuş yağ. Basınç sert geldiği için vites oturmuyor, çarpıyor.',
      dsg: 'Mekatronikte basınç ya da konum sensörü, bozulmuş kavrama adaptasyonu. Kavramalar birbirine devrederken çakışıyor.',
      cvt: 'Yağ basıncındaki dalgalanma ya da kasnakta tutunamayan kayış. Hızlanırken ani bir vurma olarak hissedilir.',
    },
    bakilan: ['Arıza kaydı ve adaptasyon değerleri', 'Yağın rengi, kokusu ve seviyesi', 'Solenoid ve basınç değerleri'],
    hizmet: { klasik: 4, dsg: 4, cvt: 2 },
  },
  {
    id: 'kayma', ad: 'Devir fırlıyor', iz: 'Vites geçerken devir düşeceğine yükseliyor; araç o anda çekmiyor.',
    sebep: {
      klasik: 'Aşınmış kavrama balataları ya da düşük hat basıncı. Vites geçerken kavrama tutmuyor, motor boşa bağırıyor.',
      dsg: 'Kavrama setinde aşınma; kavrama tam kapanmadığı için devir kaçıyor.',
      cvt: 'Kayış ya da kasnak aşınması, basınç kaybı. Gaz verince devir çıkıyor ama hız gelmiyor.',
    },
    bakilan: ['Yağ seviyesi ve yağda balata tozu', 'Canlı veride giriş ve çıkış devri farkı', 'Hat basıncı ölçümü'],
    hizmet: { klasik: 0, dsg: 1, cvt: 2 },
  },
  {
    id: 'titreme', ad: 'Kalkışta titriyor', iz: 'İlk metrelerde devir dalgalanıyor; araç sarsılarak kalkıyor.',
    sebep: {
      klasik: 'Tork konvertörünün kilitleme kavraması ya da motor ve şanzıman takozları.',
      dsg: 'Kuru kavramada aşınma ya da yağlanma, bozulmuş kalkış adaptasyonu. DSG’de en sık gelen şikâyet.',
      cvt: 'Kalkış kavraması ya da yorulmuş yağ. Yağ değişimiyle geçmiyorsa içeriye bakmak gerekir.',
    },
    bakilan: ['Kalkış adaptasyon değerleri', 'Motor ve şanzıman takozları', 'Kavrama ya da tork konvertörü'],
    hizmet: { klasik: 6, dsg: 1, cvt: 2 },
  },
  {
    id: 'gecikme', ad: 'Geç vites atıyor', iz: 'D’ye alınca bir an bekliyor, vitesi olması gerekenden yüksek devirde atıyor.',
    sebep: {
      klasik: 'Düşük yağ seviyesi, tıkalı filtre ya da valf gövdesinde takılan bir valf.',
      dsg: 'Beyin yazılımı ya da bozulmuş öğrenme değerleri; mekatronikte basınç kaybı.',
      cvt: 'Yağ basıncı, hız sensörü ya da yazılım. Çoğu zaman önce yağa ve sensörlere bakılır.',
    },
    bakilan: ['Yağ seviyesi, sıcakken ölçülür', 'Filtre ve karter', 'Yazılım sürümü ve öğrenme değerleri'],
    hizmet: { klasik: 3, dsg: 5, cvt: 3 },
  },
  {
    id: 'ugultu', ad: 'Uğultu var', iz: 'Devir normal ama hızlandıkça artan bir vınlama, uğultu geliyor.',
    sebep: {
      klasik: 'Planet dişli ya da rulman aşınması, tork konvertörü rulmanı.',
      dsg: 'Çift kavrama rulmanı ya da dişli yatakları.',
      cvt: 'Kayış ve kasnak aşınması; CVT’de en sık gelen şikâyet.',
    },
    bakilan: ['Sesin hangi hızda çıktığı, yolda', 'Yağda metal talaşı', 'Rulman ve yataklar'],
    hizmet: { klasik: 0, dsg: 1, cvt: 2 },
  },
  {
    id: 'emniyet', ad: 'Tek viteste kaldı', iz: 'Arıza lambası yandı, şanzıman bir viteste kilitlendi; devir yükseliyor, vites değişmiyor.',
    sebep: {
      klasik: 'Beyin şanzımanı korumaya almış: sensör, solenoid ya da kablo arızası.',
      dsg: 'Mekatronik arızası; çoğu zaman basınç sensörü ya da valf gövdesi.',
      cvt: 'Hararet, hız sensörü ya da basınç arızası; beyin koruma moduna geçiyor.',
    },
    bakilan: ['Arıza kodları ve donmuş veriler', 'Soket ve kablo tesisatı', 'Mekatronik ya da valf gövdesi'],
    hizmet: { klasik: 4, dsg: 4, cvt: 5 },
  },
];

// Devir izi. t: 0..1 zaman, dönüş: {r: devir, g: vites etiketi}.
const N = 150;
let X0 = 46, X1 = 784, W = 800;
const Y0 = 272, Y1 = 22, RMAX = 6500;
const olcu = () => {
  const dar = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 640px)').matches;
  W = dar ? 440 : 800; X0 = dar ? 30 : 46; X1 = W - 12;
};
const px = (t) => X0 + t * (X1 - X0);
const py = (r) => Y0 - (Math.max(0, Math.min(RMAX, r)) / RMAX) * (Y0 - Y1);
const ORAN = [4.1, 2.4, 1.55, 1.15, 0.86, 0.68];
const titre = (i) => (i % 2 ? 1 : -1) * (0.55 + 0.45 * (((i * 9301 + 49297) % 233280) / 233280));
const kolay = (x) => 1 - Math.pow(1 - x, 1.6);

function iz(tip, sik) {
  const out = [];
  let isaret = null;
  if (tip === 'cvt') {
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      let bas = 0.02;
      if (sik === 'gecikme') bas = 0.1;
      const u = Math.max(0, t - bas);
      let r = t < bas ? 850 : 850 + 1850 * kolay(Math.min(1, u / 0.16)) + 350 * u;
      if (sik === 'kayma' && t > 0.42 && t < 0.62) r += 1500 * Math.sin(((t - 0.42) / 0.2) * Math.PI);
      if (sik === 'vuruntu' && t > 0.4 && t < 0.5) r -= 1100 * Math.exp(-(t - 0.4) * 45) * Math.cos((t - 0.4) * 170);
      if (sik === 'titreme' && t < 0.16) r += 260 * Math.sin(t * 150) * (1 - t / 0.16);
      if (sik === 'ugultu' && t > 0.5 && t < 0.92) r += 190 * titre(i) * Math.sin(((t - 0.5) / 0.42) * Math.PI);
      if (sik === 'emniyet') r = Math.min(r, 2100 + 400 * t);
      out.push({ r, g: 'D' });
    }
    const m = { vuruntu: 0.42, kayma: 0.52, titreme: 0.06, gecikme: 0.06, ugultu: 0.72, emniyet: 0.6 }[sik];
    isaret = m;
  } else {
    // Vites geçiş anları (t) ve her viteste tavan devir.
    let gecis = tip === 'dsg' ? [0.13, 0.28, 0.45, 0.62, 0.8] : [0.14, 0.3, 0.47, 0.64, 0.82];
    const tavan = [3300, 3200, 3100, 3000, 2900, 2800];
    const sure = tip === 'dsg' ? 0.006 : 0.024; // geçiş yumuşaklığı: tork konvertörü yuvarlar, DSG keser
    let bas = 0;
    if (sik === 'gecikme') {
      bas = 0.07;
      gecis = [0.22, 0.37, 0.52, 0.67, 0.84];
      tavan[0] = 4900; tavan[1] = 4300;
    }
    const kilit = sik === 'emniyet' ? 2 : 9; // 3. viteste kalır
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      let v = 0;
      while (v < gecis.length && t >= gecis[v] && v < kilit) v++;
      const b = v === 0 ? bas : gecis[v - 1];
      const son = v < gecis.length && v < kilit ? gecis[v] : 1;
      const alt = v === 0 ? 850 : tavan[v - 1] * (ORAN[v] / ORAN[v - 1]);
      let tav = tavan[v];
      if (v === kilit) tav = 5600;
      const u = t < b ? 0 : Math.min(1, (t - b) / (son - b));
      let r = v === 0 && t < bas ? 850 : alt + (tav - alt) * (v === kilit ? kolay(u) : u);
      // Önceki vitesten yumuşak geçiş
      if (v > 0 && t - b < sure) {
        const onceki = tavan[v - 1];
        const s = (t - b) / sure;
        r = onceki + (r - onceki) * (0.5 - 0.5 * Math.cos(Math.PI * s));
      }
      if (sik === 'vuruntu' && v === 2 && t - gecis[1] < 0.07) r -= 1100 * Math.exp(-(t - gecis[1]) * 45) * Math.cos((t - gecis[1]) * 170);
      if (sik === 'kayma' && ((v === 2 && t - gecis[1] < 0.06) || (v === 1 && gecis[1] - t < 0.03))) {
        const s = v === 1 ? (t - (gecis[1] - 0.03)) / 0.09 : (t - gecis[1] + 0.03) / 0.09;
        r += 1400 * Math.sin(Math.max(0, Math.min(1, s)) * Math.PI);
      }
      if (sik === 'titreme' && t < 0.13) r += 280 * Math.sin(t * 160) * (1 - t / 0.13);
      if (sik === 'ugultu' && t > 0.5 && t < 0.94) r += 190 * titre(i) * Math.sin(((t - 0.5) / 0.44) * Math.PI);
      if (v === kilit && t > 0.6) r = Math.min(r, 5200 + 60 * Math.sin(t * 300));
      out.push({ r, g: `D${v + 1}` });
    }
    isaret = { vuruntu: gecis[1] + 0.012, kayma: gecis[1], titreme: 0.06, gecikme: 0.12, ugultu: 0.72, emniyet: 0.66, normal: null }[sik];
  }
  return { noktalar: out, isaret };
}

const yol = (noktalar) => noktalar.map((p, i) => `${i ? 'L' : 'M'}${px(i / (N - 1)).toFixed(1)} ${py(p.r).toFixed(1)}`).join('');

const izgara = () => {
  const s = [];
  for (let r = 0; r <= 6000; r += 1000) s.push(`<line x1="${X0}" x2="${X1}" y1="${py(r).toFixed(1)}" y2="${py(r).toFixed(1)}"/><text x="${X0 - 8}" y="${(py(r) + 4).toFixed(1)}">${r / 1000}</text>`);
  for (let t = 0; t <= 1.001; t += 0.1) s.push(`<line class="d" x1="${px(t).toFixed(1)}" x2="${px(t).toFixed(1)}" y1="${Y1}" y2="${Y0}"/>`);
  return s.join('');
};

export const kayit = {
  render(d) {
    olcu();
    return `
      <section class="k-bolum sz-kayit" aria-labelledby="sz-kayit-baslik">
        <div class="k-kap">
          <div class="sz-kayit__bas">
            <p class="sz-etiket"><span class="sz-led" aria-hidden="true"></span>Vites kaydı</p>
            <h2 class="k-h2" id="sz-kayit-baslik" data-bol>Şikâyetinizi seçin, kayıtta nerede bozulduğunu görün.</h2>
            <p class="k-lead">Teşhis cihazını bağladığımızda ilk baktığımız şey devir ve vites kaydıdır. Her arıza bu çizgide kendine özgü bir iz bırakır.</p>
          </div>
          <div class="sz-kayit__ic">
            <div class="sz-ekran">
              <div class="sz-ekran__ust">
                <div class="sz-sekme" role="radiogroup" aria-label="Şanzıman tipi">
                  ${TIPLER.map((t, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-tip="${t.id}">${esc(t.ad)}</button>`).join('')}
                </div>
                <p class="sz-ekran__oku" aria-hidden="true"><span data-oku-vites>D1</span><small><b data-oku-devir>850</b> d/d</small></p>
              </div>
              <svg class="sz-ekran__svg" viewBox="0 0 ${W} 300" role="img" aria-labelledby="sz-svg-baslik">
                <title id="sz-svg-baslik">Zamana göre motor devri ve vites geçişleri</title>
                <defs>
                  <linearGradient id="sz-dolgu" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffa62b" stop-opacity=".3"/><stop offset="1" stop-color="#ffa62b" stop-opacity="0"/></linearGradient>
                </defs>
                <g class="sz-izgara">${izgara()}</g>
                <text class="sz-eksen" x="${X0}" y="14">devir × 1000</text>
                <text class="sz-eksen sz-eksen--sag" x="${X1}" y="292">zaman →</text>
                <path class="sz-dolgu" d=""/>
                <path class="sz-cizgi" d=""/>
                <path class="sz-saglam" d=""/>
                <g class="sz-isaret"><circle r="15" class="h"/><circle r="5"/></g>
                <g class="sz-oynat"><line y1="${Y1}" y2="${Y0}"/><circle r="4.5" class="n"/></g>
              </svg>
              <div class="sz-ekran__alt">
                <span><i class="sz-lej sz-lej--s"></i>Sağlam şanzıman</span>
                <span><i class="sz-lej sz-lej--a"></i>Şikâyetli kayıt</span>
              </div>
            </div>
            <div class="sz-kayit__yan">
              <p class="sz-alt-etiket">Şikâyet</p>
              <div class="sz-cipler" role="radiogroup" aria-label="Şikâyet">
                ${SIKAYETLER.map((s, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-sik="${s.id}">${esc(s.ad)}</button>`).join('')}
              </div>
              <div class="sz-sonuc" aria-live="polite"></div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const svg = el.querySelector('.sz-ekran__svg');
    const cizgi = svg.querySelector('.sz-cizgi');
    const dolgu = svg.querySelector('.sz-dolgu');
    const saglam = svg.querySelector('.sz-saglam');
    const isaret = svg.querySelector('.sz-isaret');
    const oynat = svg.querySelector('.sz-oynat');
    const oynatNokta = oynat.querySelector('.n');
    const okuV = el.querySelector('[data-oku-vites]');
    const okuD = el.querySelector('[data-oku-devir]');
    const sonuc = el.querySelector('.sz-sonuc');
    const sekmeler = [...el.querySelectorAll('[data-tip]')];
    const cipler = [...el.querySelectorAll('[data-sik]')];
    let tip = 'klasik';
    let sik = 'vuruntu';
    let aktif = null;
    const dolguYol = (p) => `${p}L${X1} ${Y0}L${X0} ${Y0}Z`;

    const yazSonuc = () => {
      const s = SIKAYETLER.find((x) => x.id === sik);
      const h = d.hizmetler?.[s.hizmet[tip]];
      const tipAd = TIPLER.find((x) => x.id === tip).ad;
      const konu = `${s.ad} (${tipAd})`;
      sonuc.innerHTML = `
        <p class="sz-sonuc__iz">${esc(s.iz)}</p>
        <h3 class="k-h3">Genelde sebebi</h3>
        <p>${esc(s.sebep[tip])}</p>
        <h3 class="k-h3">Önce baktıklarımız</h3>
        <ol class="sz-sonuc__liste">${s.bakilan.map((b) => `<li>${esc(b)}</li>`).join('')}</ol>
        ${h ? `<p class="sz-sonuc__hizmet"><span>İlgili iş</span><b>${esc(h.baslik)}</b>${h.sure ? `<small>Ortalama ${esc(h.sure)}</small>` : ''}</p>` : ''}
        <a class="k-link" href="#/iletisim?konu=${encodeURIComponent(konu)}" data-rota="iletisim?konu=${encodeURIComponent(konu)}">Bu şikâyetle yazın ${ok}</a>
        <p class="sz-sonuc__not">Kesin sebebi arıza kaydını okuyup aracı denedikten sonra söyleriz. Fiyatı işe başlamadan konuşuruz.</p>`;
      if (!reducedMotion) gsap.from(sonuc.children, { y: 12, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out' });
    };

    const ciz = (anim) => {
      const a = iz(tip, sik);
      const s = iz(tip, 'normal');
      aktif = a;
      const p = yol(a.noktalar);
      const ps = yol(s.noktalar);
      const ix = a.isaret != null ? Math.round(a.isaret * (N - 1)) : null;
      const mx = ix != null ? px(ix / (N - 1)) : -50;
      const my = ix != null ? py(a.noktalar[ix].r) : -50;
      if (anim && !reducedMotion) {
        gsap.to(cizgi, { attr: { d: p }, duration: 0.8, ease: 'power3.inOut' });
        gsap.to(dolgu, { attr: { d: dolguYol(p) }, duration: 0.8, ease: 'power3.inOut' });
        gsap.to(saglam, { attr: { d: ps }, duration: 0.8, ease: 'power3.inOut' });
        gsap.to(isaret, { x: mx, y: my, duration: 0.8, ease: 'power3.inOut' });
      } else {
        cizgi.setAttribute('d', p);
        dolgu.setAttribute('d', dolguYol(p));
        saglam.setAttribute('d', ps);
        gsap.set(isaret, { x: mx, y: my });
      }
      yazSonuc();
    };

    sekmeler.forEach((b) => b.addEventListener('click', () => {
      tip = b.dataset.tip;
      sekmeler.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      ciz(true);
    }));
    cipler.forEach((b) => b.addEventListener('click', () => {
      sik = b.dataset.sik;
      cipler.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      ciz(true);
    }));
    ciz(false);

    // Oynatma çizgisi: kayıt üzerinde soldan sağa gezer, göstergeye o anki vitesi ve devri yazar.
    const o = { t: 0 };
    let sonG = '', sonR = -1;
    const guncelle = () => {
      if (!aktif) return;
      const f = o.t * (N - 1);
      const i = Math.min(N - 2, Math.floor(f));
      const r = aktif.noktalar[i].r + (aktif.noktalar[i + 1].r - aktif.noktalar[i].r) * (f - i);
      const x = px(o.t);
      oynat.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
      oynatNokta.setAttribute('cy', py(r).toFixed(1));
      const g = aktif.noktalar[i].g;
      const rr = Math.round(r / 50) * 50;
      if (g !== sonG) { okuV.textContent = g; sonG = g; }
      if (rr !== sonR) { okuD.textContent = String(rr); sonR = rr; }
    };
    if (reducedMotion) {
      o.t = 0.5;
      guncelle();
    } else {
      const dongu = gsap.to(o, { t: 1, duration: 6.5, ease: 'none', repeat: -1, paused: true, onUpdate: guncelle });
      gorunurken(svg, (v) => (v ? dongu.play() : dongu.pause()));
      gsap.from(cizgi, { drawSVG: 0, duration: 1.6, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset', scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
      gsap.from([dolgu, saglam], { opacity: 0, duration: 1, delay: 0.9, scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
    }
  },
};

// --- (3) Şanzıman tipleri ----------------------------------------------------------------------
const disli = (cx, cy, r, dis, cls = '') => {
  const c = 2 * Math.PI * r;
  return `<circle class="dis ${cls}" cx="${cx}" cy="${cy}" r="${r}" stroke-dasharray="${(c / dis / 2).toFixed(2)} ${(c / dis / 2).toFixed(2)}"/>`;
};
const SEMALAR = {
  klasik: () => `
    <svg viewBox="0 0 160 160" aria-hidden="true">
      ${disli(80, 80, 62, 40, 'halka')}
      <circle class="cer" cx="80" cy="80" r="56"/>
      <g class="don don--tasiyici">
        ${[0, 120, 240].map((a) => { const x = 80 + 33 * Math.cos((a * Math.PI) / 180); const y = 80 + 33 * Math.sin((a * Math.PI) / 180); return `<g>${disli(x.toFixed(1), y.toFixed(1), 17, 12)}<circle class="mil" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/></g>`; }).join('')}
      </g>
      <g class="don don--gunes">${disli(80, 80, 15, 12, 'vurgu')}</g>
      <circle class="mil mil--v" cx="80" cy="80" r="4"/>
    </svg>`,
  dsg: () => `
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <circle class="kav kav--a" cx="80" cy="80" r="62"/>
      <circle class="kav kav--b" cx="80" cy="80" r="38"/>
      <circle class="cer" cx="80" cy="80" r="50"/>
      <circle class="mil mil--v" cx="80" cy="80" r="8"/>
      <text x="80" y="21.5" class="kav-y kav-y--a">1·3·5·7</text>
      <text x="80" y="45.5" class="kav-y kav-y--b">2·4·6·R</text>
    </svg>`,
  cvt: () => `
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <path class="kayis" d=""/>
      <circle class="kas kas--a" cx="44" cy="80" r="16"/>
      <circle class="kas kas--b" cx="116" cy="80" r="30"/>
      <circle class="mil mil--v" cx="44" cy="80" r="4"/>
      <circle class="mil" cx="116" cy="80" r="4"/>
    </svg>`,
};
const TIP_METIN = [
  { id: 'klasik', ad: 'Tork konvertörlü', alt: 'Klasik otomatik', nasil: 'Motorla şanzıman arasında yağla güç aktaran tork konvertörü, içeride planet dişli setleri ve kavrama paketleri.', sik: 'Geç ya da sert vites, devir kaçırma, hararet.', hizmet: 0 },
  { id: 'dsg', ad: 'DSG / çift kavrama', alt: 'DSG, Powershift, EDC', nasil: 'Biri tek, biri çift vitesleri taşıyan iki kavrama. Mekatronik ünite hangisinin kapanacağına karar verir.', sik: 'Kalkışta titreme, vites geçerken vuruntu, arıza lambası.', hizmet: 1 },
  { id: 'cvt', ad: 'CVT', alt: 'Kademesiz şanzıman', nasil: 'Vites yok; çapı değişen iki kasnak ve aralarındaki çelik kayış oranı sürekli ayarlar.', sik: 'Uğultu, çekiş kaybı, gaz verince devir çıkıp hız gelmemesi.', hizmet: 2 },
];

export const tipler = {
  render(d) {
    return `
      <section class="k-bolum sz-tipler" aria-labelledby="sz-tipler-baslik">
        <div class="k-kap">
          <div class="k-bolum__bas">
            <h2 class="k-h2" id="sz-tipler-baslik" data-bol>Üç ayrı şanzıman, üç ayrı dert.</h2>
            <p class="sz-tipler__not">Hepsiyle her gün uğraşıyoruz. Hangisi olduğunu bilmiyorsanız ruhsattaki modelden ya da vites kolundan biz bakarız.</p>
          </div>
          <ul class="sz-tipler__liste" data-sira>
            ${TIP_METIN.map((t, i) => {
              const h = d.hizmetler?.[t.hizmet];
              return `<li class="sz-tip sz-tip--${t.id}">
                <div class="sz-tip__sema">${SEMALAR[t.id]()}<span class="sz-tip__no">0${i + 1}</span></div>
                <div class="sz-tip__govde">
                  <p class="sz-alt-etiket">${esc(t.alt)}</p>
                  <h3 class="k-h3">${esc(t.ad)}</h3>
                  <p>${esc(t.nasil)}</p>
                  <p class="sz-tip__sik"><span>Sık şikâyet</span>${esc(t.sik)}</p>
                  ${h ? `<a class="k-link" href="#/hizmetler" data-rota="hizmetler">${esc(h.baslik)} ${ok}</a>` : ''}
                </div>
              </li>`;
            }).join('')}
          </ul>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const liste = el.querySelector('.sz-tipler__liste');
    const tl = gsap.timeline({ paused: true, repeat: -1 });
    // Planet dişli
    tl.to(el.querySelectorAll('.don--gunes'), { rotation: 360, svgOrigin: '80 80', duration: 4, ease: 'none' }, 0);
    tl.to(el.querySelectorAll('.don--tasiyici'), { rotation: 120, svgOrigin: '80 80', duration: 4, ease: 'none' }, 0);
    // Çift kavrama: iki kavrama sırayla kapanır
    const a = el.querySelectorAll('.kav--a, .kav-y--a');
    const b = el.querySelectorAll('.kav--b, .kav-y--b');
    tl.fromTo(a, { opacity: 1 }, { opacity: 0.25, duration: 0.25, repeat: 1, yoyo: true, repeatDelay: 1.5 }, 0.8);
    tl.fromTo(b, { opacity: 0.25 }, { opacity: 1, duration: 0.25, repeat: 1, yoyo: true, repeatDelay: 1.5 }, 0.8);
    // CVT: kasnak çapları yer değiştirir, kayış onlara uyar
    const kA = el.querySelector('.kas--a');
    const kB = el.querySelector('.kas--b');
    const kayis = el.querySelector('.kayis');
    const c = { a: 16, b: 30 };
    const kayisCiz = () => {
      const ra = c.a + 3, rb = c.b + 3;
      kayis.setAttribute('d', `M44 ${80 - ra}L116 ${80 - rb}A${rb} ${rb} 0 0 1 116 ${80 + rb}L44 ${80 + ra}A${ra} ${ra} 0 0 1 44 ${80 - ra}Z`);
      kA.setAttribute('r', c.a.toFixed(2));
      kB.setAttribute('r', c.b.toFixed(2));
    };
    kayisCiz();
    tl.to(c, { a: 30, b: 16, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: 1, onUpdate: kayisCiz }, 0);
    gorunurken(liste, (v) => (v ? tl.play() : tl.pause()));
  },
};

// --- (4) Atölye: saatler + konum -----------------------------------------------------------------
export const atolye = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    const bugunSaat = d.saatler[bugun];
    return `
      <section class="k-bolum sz-atolye" aria-labelledby="sz-atolye-baslik">
        <div class="k-kap sz-atolye__ic">
          <div>
            <p class="sz-etiket"><span class="sz-led ${st.open ? 'is-acik' : 'is-kapali'}" aria-hidden="true"></span>Atölye</p>
            <h2 class="k-h2" id="sz-atolye-baslik" data-bol>Aracı getirin, beklerken okuyalım.</h2>
            <div class="sz-durum ${st.open ? 'is-acik' : ''}">
              <b>${esc(st.text)}</b>
              <small>Bugün ${GUNLER[bugun]}${bugunSaat ? `, ${esc(bugunSaat.replace('-', ' – '))}` : ', kapalı'}</small>
            </div>
            <dl class="sz-saatler">${groupedHours(d.saatler).map(([g, s]) => `<div><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
            <p class="sz-adres">${icons.pin}<span>${esc(d.iletisim.adres)}</span></p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
          </div>
          <div class="sz-harita" data-q="${esc(mapsEmbed(d))}"><p>Harita yaklaşınca yüklenir</p></div>
        </div>
      </section>`;
  },
  mount(el) {
    const h = el.querySelector('.sz-harita');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      h.innerHTML = `<iframe title="Konum haritası" src="${h.dataset.q}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(h);
  },
};
