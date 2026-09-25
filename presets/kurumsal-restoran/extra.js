// Kurumsal restoran — "Çini sofra" yönü.
// kemerHero: dev Anton başlık, üç kemer pencerede ocak / köz / meze; kemerlerin altında köz kıvılcımları,
//            en altta sayfayı boydan boya geçen bir şiş (kaydırdıkça kayar).
// menuPano:  lacivert çini çerçeveli menü panosu. Fiyat yok; her satırda "masaya geliş süresi". Masaüstünde
//            satırın üstüne gelince kemer biçimli fotoğraf imleci takip eder.
// masaKur:   imza modülü. Yer (tezgâh / salon / arka salon / paket), kişi, gün, saat, sebep seçilir; yukarıdan
//            bakılan sofra planı canlı kurulur (sandalye, tabak, meze kâseleri), yanında el yazısı adisyon
//            WhatsApp mesajına dönüşür.
// ocakSaati: "Ocak şu an yanıyor / sönük" canlı durum, gruplu saatler, yaklaşınca yüklenen harita.
// sis:       bölümler arası şiş ayracı.
import { esc, telHref, waHref, mapsHref, mapsEmbed, openStatus, groupedHours, icons, gsap, reducedMotion, GUNLER } from '../../shared/core.js';
import { BOLUMLER, yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const img = (p) => `${import.meta.env.BASE_URL}img/kurumsal-restoran/${p}.jpg`;
const alev = `<svg class="alev" viewBox="0 0 24 32" aria-hidden="true"><path d="M12 1c1 6 8 9 8 18a8 8 0 0 1-16 0c0-4 2-6 3-8 .5 3 2 4 3 4-1-5 1-10 2-14z"/><path class="alev__ic" d="M12 14c.6 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1.6-4 .3 1.4 1 2 1.6 2-.4-2.5.3-5 .8-7z"/></svg>`;

// Şiş: çelik şiş üstünde et, biber, domates, soğan sırası. Genişliği viewBox'a göre tekrarlanır.
function sisSvg(uzunluk = 1600, cls = '') {
  const parca = [];
  let x = 90;
  const sira = ['et', 'et', 'biber', 'et', 'domates', 'et', 'sogan', 'et', 'et', 'biber'];
  let i = 0;
  while (x < uzunluk - 60) {
    const t = sira[i++ % sira.length];
    if (t === 'et') { parca.push(`<rect class="sis__et" x="${x}" y="13" width="46" height="30" rx="13"/><path class="sis__iz" d="M${x + 14} 17l-6 22M${x + 27} 17l-6 22M${x + 40} 19l-5 18"/>`); x += 50; }
    else if (t === 'biber') { parca.push(`<rect class="sis__biber" x="${x}" y="17" width="30" height="22" rx="9"/>`); x += 34; }
    else if (t === 'domates') { parca.push(`<circle class="sis__domates" cx="${x + 16}" cy="28" r="16"/>`); x += 36; }
    else { parca.push(`<rect class="sis__sogan" x="${x}" y="15" width="14" height="26" rx="6"/>`); x += 18; }
  }
  return `<svg class="sis ${cls}" width="${Math.round(uzunluk * 0.82)}" height="46" viewBox="0 0 ${uzunluk} 56" preserveAspectRatio="xMinYMid slice" aria-hidden="true">
    <rect class="sis__sap" x="0" y="20" width="70" height="16" rx="4"/>
    <line class="sis__demir" x1="60" y1="28" x2="${uzunluk}" y2="28"/>
    ${parca.join('')}
  </svg>`;
}

// --- Hero --------------------------------------------------------------------------------

export const kemerHero = {
  render(d) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    const bilgi = [
      ['Ocak', d.isletme.kurulus ? `${yilEki(d.isletme.kurulus)} beri` : 'Etimesgut'],
      st ? ['Bugün', st.text] : null,
      ['Paket sipariş', d.iletisim.telefon],
    ]
      .filter(Boolean)
      .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
      .join('');
    const kivilcim = Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
    return `
      <section class="k-hero kh" aria-label="Giriş">
        <div class="k-kap kh__ic">
          <div class="kh__metin">
            <p class="kh__ust"><span class="kh__durum ${st?.open ? 'is-acik' : ''}">${alev}${esc(st ? (st.open ? 'Ocak yanıyor' : 'Ocak sönük') : d.isletme.sektor)}</span><span>${esc(d.isletme.sektor)}</span></p>
            <h1 class="k-h1 kh__ad${d.isletme.ad.length > 16 ? ' kh__ad--uzun' : ''}" data-bol>${esc(d.isletme.ad)}</h1>
            <p class="kh__slogan">${esc(d.isletme.slogan)}</p>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('rezervasyon', `${esc(h.birincil || 'Masa ayırtın')} ${ok}`)}
              ${rota(h.ikincilRota || 'menu', esc(h.ikincil || 'Menü'), 'k-btn k-btn--ikincil')}
            </div>
          </div>
          <div class="kh__kemerler" aria-hidden="true">
            <figure class="kh__kemer kh__kemer--yan"><div class="kh__foto" data-kh-y="1.4"><img src="${img('kor-adana')}" alt=""></div></figure>
            <figure class="kh__kemer kh__kemer--orta"><div class="kh__foto" data-kh-y="0.6"><img src="${img('ocak')}" alt="" fetchpriority="high"></div></figure>
            <figure class="kh__kemer kh__kemer--yan kh__kemer--sag"><div class="kh__foto" data-kh-y="1.8"><img src="${img('meze-masa')}" alt=""></div></figure>
            <div class="kh__kivilcim">${kivilcim}</div>
            <span class="kh__cini"></span>
          </div>
        </div>
        <div class="kh__sis">${sisSvg(2200)}</div>
        <div class="k-kap"><dl class="k-hero__bilgi">${bilgi}</dl></div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const kemer = el.querySelectorAll('.kh__kemer');
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(kemer, { clipPath: 'inset(100% 0 0 0 round 999px 999px 0 0)' }, { clipPath: 'inset(0% 0 0 0 round 999px 999px 0 0)', duration: 1.15, stagger: 0.14, ease: 'power3.inOut' })
      .from(el.querySelectorAll('.kh__foto img'), { scale: 1.3, duration: 1.5, stagger: 0.14, ease: 'power3.out' }, 0)
      .from(el.querySelector('.kh__cini'), { scaleX: 0, duration: 0.9, ease: 'power3.inOut' }, 0.5)
      .from(el.querySelector('.kh__slogan'), { opacity: 0, rotate: -6, y: 12, duration: 0.7, ease: 'back.out(2)' }, 0.9)
      .from(el.querySelector('.kh__sis .sis'), { xPercent: -60, opacity: 0, duration: 1.3, ease: 'power3.out' }, 0.5);
    el.querySelectorAll('[data-kh-y]').forEach((f) =>
      gsap.to(f, { yPercent: -7 * Number(f.dataset.khY), ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
    );
    gsap.to(el.querySelector('.kh__sis .sis'), { x: -220, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } });
    // Kıvılcımlar yalnızca hero görünürken uçsun.
    const kv = el.querySelector('.kh__kivilcim');
    const io = new IntersectionObserver(([e]) => kv.classList.toggle('is-dur', !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  },
};

// --- Menü panosu -------------------------------------------------------------------------

const GRUP_AD = { ocak: 'Ocaktan', sofra: 'Sofraya', hizmet: 'Siparişe ve davete' };

export const menuPano = {
  render(d) {
    const list = d.hizmetler || [];
    if (!list.length) return '';
    const gruplar = ['ocak', 'sofra', 'hizmet']
      .map((g) => [g, list.filter((h) => (h.grup || 'hizmet') === g)])
      .filter(([, l]) => l.length);
    return `
      <section class="k-bolum mp">
        <div class="k-kap">
          <div class="mp__pano">
            <header class="mp__bas">
              <p class="mp__ust">Menü panosu · her gün</p>
              <h2 class="k-h2" data-bol>${esc(d.kurumsal?.hizmetOzetBaslik || 'Ocaktan çıkanlar')}</h2>
              <p class="mp__not">Panoda fiyat yok, süre var: siparişten masaya kaç dakika. Güncel fiyatı telefonda ya da masada söyleriz.</p>
            </header>
            <div class="mp__gruplar">
              ${gruplar
                .map(
                  ([g, l]) => `<div class="mp__grup">
                    <h3 class="mp__grup-ad"><span>${esc(GRUP_AD[g])}</span></h3>
                    <ul data-sira>
                      ${l
                        .map(
                          (h) => `<li><a href="#/menu" data-rota="menu" data-foto="${esc(h.gorsel || '')}">
                            ${h.gorsel ? `<span class="mp__foto"><img src="${esc(h.gorsel)}" alt="" loading="lazy"></span>` : ''}
                            <span class="mp__satir"><span class="mp__ad">${esc(h.baslik)}</span><span class="mp__nokta"></span><span class="mp__sure">${esc(h.sure || '')}</span></span>
                            <span class="mp__kisa">${esc(h.kisa || h.aciklama)}</span>
                          </a></li>`
                        )
                        .join('')}
                    </ul>
                  </div>`
                )
                .join('')}
            </div>
            <div class="mp__alt">
              ${rota('menu', `Menünün tamamı ${ok}`, 'k-btn mp__btn')}
              <a class="k-btn k-btn--ikincil mp__btn2" href="${waHref(d, `Merhaba ${d.isletme.ad}, paket sipariş vermek istiyorum.`)}" target="_blank" rel="noopener">${icons.whatsapp}<span>Paket sipariş</span></a>
            </div>
          </div>
          <div class="mp__onizleme" aria-hidden="true"><img alt=""></div>
        </div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion || !matchMedia('(hover: hover) and (min-width: 900px)').matches) return;
    const on = el.querySelector('.mp__onizleme');
    const resim = on.querySelector('img');
    const x = gsap.quickTo(on, 'x', { duration: 0.45, ease: 'power3.out' });
    const y = gsap.quickTo(on, 'y', { duration: 0.45, ease: 'power3.out' });
    const kap = el.querySelector('.k-kap');
    el.querySelectorAll('[data-foto]').forEach((a) => {
      a.addEventListener('pointerenter', () => {
        if (!a.dataset.foto) return;
        if (resim.getAttribute('src') !== a.dataset.foto) resim.src = a.dataset.foto;
        gsap.to(on, { opacity: 1, scale: 1, rotate: -4, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      });
      a.addEventListener('pointerleave', () => gsap.to(on, { opacity: 0, scale: 0.8, rotate: 0, duration: 0.3, overwrite: 'auto' }));
    });
    el.addEventListener('pointermove', (e) => {
      const r = kap.getBoundingClientRect();
      x(e.clientX - r.left + 26);
      y(e.clientY - r.top - 120);
    });
  },
};

// --- Sofra kur (imza) --------------------------------------------------------------------

const YERLER = [
  { id: 'tezgah', ad: 'Ocak tezgâhı', alt: '1-10 kişi', min: 1, max: 10, bas: 2 },
  { id: 'salon', ad: 'Salon', alt: '2-16 kişi', min: 2, max: 16, bas: 4 },
  { id: 'arka', ad: 'Arka salon', alt: '10-40 kişi', min: 10, max: 40, bas: 18 },
  { id: 'paket', ad: 'Paket sipariş', alt: '1-30 kişilik', min: 1, max: 30, bas: 3 },
];
const SEBEPLER = ['Öğle yemeği', 'Aile yemeği', 'İş yemeği', 'Davet / organizasyon'];
const TESLIM = ['Eve', 'İş yerine', 'Gelip alacağım'];
const KISA_GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const dk = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
const saatYaz = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function gunler(saatler) {
  const bugun = new Date();
  const out = [];
  for (let i = 0; i < 8 && out.length < 7; i++) {
    const t = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() + i);
    const s = saatler?.[t.getDay()];
    if (!s) continue;
    const [ac, kapa] = s.split('-').map(dk);
    let bas = Math.ceil(ac / 60) * 60;
    if (i === 0) bas = Math.max(bas, Math.ceil((bugun.getHours() * 60 + bugun.getMinutes() + 45) / 30) * 30);
    const slot = [];
    for (let m = bas; m <= kapa - 60; m += 30) slot.push(saatYaz(m));
    if (!slot.length) continue;
    out.push({ t, i, slot, kisa: i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : KISA_GUN[t.getDay()], no: t.getDate(), uzun: `${GUNLER[t.getDay()]} ${t.getDate()} ${AY[t.getMonth()]}` });
  }
  return out;
}

// Yukarıdan sofra planı. viewBox 440 x 300. Her koltuk/tabak data-n taşır (yeni eklenenler canlanır).
function plan(yer, n) {
  const W = 440;
  const koltuk = (x, y, i, yon = 0) => `<g class="p-yer" data-n="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect class="p-koltuk" x="-11" y="-11" width="22" height="22" rx="7" transform="rotate(${yon})"/></g>`;
  const tabak = (x, y, i) => `<g class="p-yer" data-n="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="p-tabak" r="9.5"/><circle class="p-tabak-ic" r="5.5"/></g>`;
  const meze = (x, y, i) => `<circle class="p-meze p-meze--${i % 3}" data-n="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/>`;
  const yay = (a, b, k) => (k === 1 ? [(a + b) / 2] : Array.from({ length: k }, (_, i) => a + ((b - a) * i) / (k - 1)));
  let s = '';
  if (yer === 'tezgah') {
    s += `<rect class="p-ocak" x="24" y="22" width="${W - 48}" height="54" rx="8"/>`;
    for (let i = 0; i < 26; i++) s += `<circle class="p-kor" style="--d:${(i * 0.37) % 2}s" cx="${40 + i * 14.4}" cy="${40 + ((i * 7) % 3) * 9}" r="${4 + (i % 3)}"/>`;
    for (let i = 0; i < 7; i++) s += `<line class="p-sis" x1="${56 + i * 50}" y1="16" x2="${56 + i * 50}" y2="82"/>`;
    s += `<rect class="p-tezgah" x="18" y="92" width="${W - 36}" height="44" rx="6"/>`;
    s += `<text class="p-yazi" x="${W / 2}" y="12" text-anchor="middle">OCAK · MEŞE KÖMÜRÜ</text>`;
    const ara = Math.min(40, (W - 92) / Math.max(n - 1, 1));
    const xs = yay(W / 2 - (ara * (n - 1)) / 2, W / 2 + (ara * (n - 1)) / 2, Math.max(n, 1));
    xs.forEach((x, i) => { s += tabak(x, 114, i); s += koltuk(x, 168, i); });
    s += `<text class="p-yazi" x="${W / 2}" y="222" text-anchor="middle">şiş közden doğrudan tabağa</text>`;
  } else if (yer === 'salon') {
    const masa = Math.ceil(n / 4);
    const kol = Math.min(masa, 2);
    const sat = Math.ceil(masa / kol);
    const mw = 96, mh = 64;
    const gx = W / kol, gy = 250 / sat;
    let kalan = n, sayac = 0;
    for (let m = 0; m < masa; m++) {
      const cx = gx * (m % kol) + gx / 2, cy = 26 + gy * Math.floor(m / kol) + gy / 2;
      const bu = Math.min(4, kalan); kalan -= bu;
      s += `<rect class="p-masa" x="${cx - mw / 2}" y="${cy - mh / 2}" width="${mw}" height="${mh}" rx="8"/>`;
      const yerler = [[-24, -1], [24, -1], [-24, 1], [24, 1]].slice(0, bu);
      yerler.forEach(([dx, sy]) => {
        s += tabak(cx + dx, cy + sy * 16, sayac);
        s += koltuk(cx + dx, cy + sy * (mh / 2 + 16), sayac++);
      });
      s += meze(cx - 7, cy, m * 2) + meze(cx + 7, cy, m * 2 + 1);
    }
  } else if (yer === 'arka') {
    const iki = n > 20;
    const masalar = iki ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
    let sayac = 0, mz = 0;
    masalar.forEach((k, mi) => {
      const cy = iki ? (mi === 0 ? 84 : 212) : 150;
      const x1 = 34, x2 = W - 34, h = 42;
      s += `<rect class="p-masa" x="${x1}" y="${cy - h / 2}" width="${x2 - x1}" height="${h}" rx="8"/>`;
      const ust = Math.ceil(k / 2), alt = k - ust;
      yay(x1 + 20, x2 - 20, ust).forEach((x) => { s += tabak(x, cy - 10, sayac); s += koltuk(x, cy - h / 2 - 16, sayac++); });
      if (alt) yay(x1 + 20, x2 - 20, alt).forEach((x) => { s += tabak(x, cy + 10, sayac); s += koltuk(x, cy + h / 2 + 16, sayac++); });
      const mk = Math.max(2, Math.ceil(k / 3));
      yay(x1 + 34, x2 - 34, mk).forEach((x) => (s += meze(x, cy, mz++)));
    });
  } else {
    const kutu = Math.min(12, Math.ceil(n / 2));
    const kol = Math.min(kutu, 4), sat = Math.ceil(kutu / kol);
    const bw = 84, bh = 56, gx = Math.min(W / kol, 100), gy = Math.min(230 / Math.max(sat, 1), 72), ox = (W - gx * kol) / 2, oy = (230 - gy * sat) / 2;
    for (let i = 0; i < kutu; i++) {
      const cx = ox + gx * (i % kol) + gx / 2, cy = 34 + oy + gy * Math.floor(i / kol) + gy / 2;
      s += `<g class="p-yer" data-n="${i}" transform="translate(${cx} ${cy})">
        <rect class="p-kutu" x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="7"/>
        <rect class="p-kutu-kapak" x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="14" rx="7"/>
        <text class="p-kutu-yazi" y="12" text-anchor="middle">${i % 3 === 2 ? 'LAVAŞ' : i % 3 === 1 ? 'KÖZLEME' : 'KEBAP'}</text>
      </g>`;
    }
    s += `<text class="p-yazi" x="${W / 2}" y="292" text-anchor="middle">lavaş ayrı · közleme ayrı · ıslanmadan varır</text>`;
  }
  return s;
}

export const masaKur = {
  render(d) {
    const g = gunler(d.saatler);
    if (!g.length) return '';
    return `
      <section class="k-bolum mk" id="masa-kur">
        <div class="k-kap">
          <div class="mk__bas">
            <p class="mk__ust">Rezervasyon · paket · grup</p>
            <h2 class="k-h2" data-bol>Sofranızı buradan kurun</h2>
            <p class="k-lead">Nerede oturacağınızı, kaç kişi olduğunuzu ve saati seçin. Masa planı önünüzde kurulsun, adisyonu biz WhatsApp'a hazırlayalım.</p>
          </div>
          <div class="mk__ic">
            <div class="mk__secim">
              <fieldset class="mk__alan"><legend>Nerede?</legend>
                <div class="mk__yerler">${YERLER.map((y, i) => `<button type="button" class="mk__yer" data-yer="${y.id}" aria-pressed="${i === 0}"><b>${y.ad}</b><span>${y.alt}</span></button>`).join('')}</div>
              </fieldset>
              <fieldset class="mk__alan"><legend><span data-kisi-etiket>Kaç kişi?</span></legend>
                <div class="mk__kisi">
                  <button type="button" class="mk__adim" data-adim="-1" aria-label="Bir kişi azalt">−</button>
                  <output class="mk__sayi" aria-live="polite"><span data-kisi>4</span><small>kişi</small></output>
                  <button type="button" class="mk__adim" data-adim="1" aria-label="Bir kişi ekle">+</button>
                  <input class="mk__kaydir" type="range" min="1" max="10" value="2" aria-label="Kişi sayısı">
                </div>
              </fieldset>
              <fieldset class="mk__alan"><legend>Hangi gün?</legend>
                <div class="mk__gunler" data-lenis-prevent>${g.map((x, i) => `<button type="button" class="mk__gun" data-gun="${i}" aria-pressed="${i === 0}"><span>${x.kisa}</span><b>${x.no}</b></button>`).join('')}</div>
              </fieldset>
              <fieldset class="mk__alan"><legend>Saat</legend><div class="mk__saatler" data-lenis-prevent></div></fieldset>
              <fieldset class="mk__alan"><legend data-sebep-etiket>Ne için?</legend><div class="mk__sebepler"></div></fieldset>
            </div>
            <div class="mk__sahne">
              <div class="mk__plan">
                <p class="mk__plan-bas"><span data-plan-ad>Ocak tezgâhı</span><span data-plan-sayi></span></p>
                <svg viewBox="0 0 440 300" role="img" aria-label="Seçtiğiniz masanın yukarıdan görünüşü"><defs>
                  <pattern id="mk-cini" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" class="p-zemin"/><path class="p-desen" d="M20 4 L36 20 L20 36 L4 20 Z M20 12 L28 20 L20 28 L12 20 Z"/></pattern>
                </defs><rect width="440" height="300" fill="url(#mk-cini)"/><g data-plan></g></svg>
              </div>
              <div class="mk__adisyon">
                <p class="mk__adisyon-bas"><span>${esc(d.isletme.ad)}</span><span>Adisyon</span></p>
                <ul class="mk__satirlar" data-adisyon></ul>
                <label class="mk__not"><span>Not</span><input type="text" maxlength="120" placeholder="Acısız iki porsiyon, çocuk sandalyesi…" data-not></label>
                <p class="mk__ipucu" data-ipucu hidden></p>
                <div class="mk__butonlar">
                  <a class="k-btn mk__gonder" href="#" target="_blank" rel="noopener" data-wa>${icons.whatsapp}<span data-wa-yazi>WhatsApp'tan ayırtın</span></a>
                  <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>Arayın</span></a>
                </div>
                <span class="mk__muhur" aria-hidden="true">Ocak hazır</span>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const g = gunler(d.saatler);
    if (!g.length) return;
    const $ = (s) => el.querySelector(s);
    const durum = { yer: 'tezgah', kisi: 4, gun: 0, saat: null, sebep: SEBEPLER[1] };
    const onceki = { yer: null, kisi: 0 };
    const kaydir = $('.mk__kaydir');
    const planG = $('[data-plan]');

    const saatleriKur = () => {
      const slot = g[durum.gun].slot;
      if (!slot.includes(durum.saat)) durum.saat = slot.find((s) => s >= '19:30') || slot[Math.floor(slot.length / 2)];
      $('.mk__saatler').innerHTML = slot.map((s) => `<button type="button" class="mk__saat" data-saat="${s}" aria-pressed="${s === durum.saat}">${s}</button>`).join('');
    };
    const sebepleriKur = () => {
      const paket = durum.yer === 'paket';
      const l = paket ? TESLIM : SEBEPLER;
      if (!l.includes(durum.sebep)) durum.sebep = l[0];
      $('[data-sebep-etiket]').textContent = paket ? 'Nereye?' : 'Ne için?';
      $('.mk__sebepler').innerHTML = l.map((s) => `<button type="button" class="mk__sebep" data-sebep="${esc(s)}" aria-pressed="${s === durum.sebep}">${esc(s)}</button>`).join('');
    };

    function ciz() {
      const y = YERLER.find((x) => x.id === durum.yer);
      durum.kisi = Math.min(y.max, Math.max(y.min, durum.kisi));
      kaydir.min = y.min; kaydir.max = y.max; kaydir.value = durum.kisi;
      kaydir.style.setProperty('--dolu', `${((durum.kisi - y.min) / (y.max - y.min)) * 100}%`);
      $('[data-kisi]').textContent = durum.kisi;
      $('[data-kisi-etiket]').textContent = durum.yer === 'paket' ? 'Kaç kişilik?' : 'Kaç kişi?';
      $('[data-plan-ad]').textContent = y.ad;
      $('[data-plan-sayi]').textContent = `${durum.kisi} ${durum.yer === 'paket' ? 'kişilik paket' : 'kişi'}`;
      el.querySelectorAll('[data-yer]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.yer === durum.yer));
      el.querySelectorAll('[data-adim]').forEach((b) => (b.disabled = b.dataset.adim === '1' ? durum.kisi >= y.max : durum.kisi <= y.min));

      const yeniYer = onceki.yer !== durum.yer;
      planG.innerHTML = `<g data-icerik>${plan(durum.yer, durum.kisi)}</g>`;
      // Az kişide plan küçük kalmasın: içeriği çerçeveye sığacak kadar yakınlaştır.
      const ic = planG.firstElementChild;
      let bb = null;
      try { bb = ic.getBBox(); } catch {}
      if (bb && bb.width) {
        const olcek = Math.min(1.9, 400 / bb.width, 262 / bb.height);
        const tx = 220 - (bb.x + bb.width / 2) * olcek, ty = 150 - (bb.y + bb.height / 2) * olcek;
        const hedef = `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${olcek.toFixed(3)})`;
        const eski = planG.getAttribute('data-t');
        if (reducedMotion || !eski) planG.setAttribute('transform', hedef);
        else gsap.fromTo(planG, { attr: { transform: eski } }, { attr: { transform: hedef }, duration: 0.5, ease: 'power3.out' });
        planG.setAttribute('data-t', hedef);
      }
      if (!reducedMotion) {
        const yeni = [...planG.querySelectorAll('[data-n]')].filter((x) => yeniYer || Number(x.dataset.n) >= onceki.kisi);
        if (yeniYer) gsap.from(planG.querySelectorAll('.p-ocak, .p-tezgah, .p-masa, .p-kor, .p-sis, .p-yazi'), { opacity: 0, y: -10, duration: 0.4, stagger: 0.01, ease: 'power2.out' });
        if (yeni.length) gsap.from(yeni, { scale: 0, transformOrigin: 'center', duration: 0.45, stagger: Math.min(0.03, 0.5 / yeni.length), ease: 'back.out(2.4)', delay: yeniYer ? 0.15 : 0 });
      }
      onceki.yer = durum.yer; onceki.kisi = durum.kisi;

      // Adisyon
      const gun = g[durum.gun];
      const paket = durum.yer === 'paket';
      const satir = [
        ['Yer', y.ad],
        [paket ? 'Porsiyon' : 'Kişi', `${durum.kisi} ${paket ? 'kişilik' : 'kişi'}`],
        ['Gün', gun.uzun],
        [paket ? 'Teslim' : 'Saat', durum.saat],
        [paket ? 'Nereye' : 'Sebep', durum.sebep],
      ];
      $('[data-adisyon]').innerHTML = satir.map(([a, b]) => `<li><span>${esc(a)}</span><b>${esc(b)}</b></li>`).join('');
      const not = $('[data-not]').value.trim();
      const mesaj = [
        `Merhaba ${d.isletme.ad}, ${paket ? 'paket sipariş vermek' : 'rezervasyon yapmak'} istiyorum.`,
        ...satir.map(([a, b]) => `${a}: ${b}`),
        not ? `Not: ${not}` : '',
      ].filter(Boolean).join('\n');
      $('[data-wa]').href = waHref(d, mesaj);
      $('[data-wa-yazi]').textContent = paket ? "WhatsApp'tan sipariş verin" : "WhatsApp'tan ayırtın";

      // İpucu
      const gunFark = gun.i;
      const hs = gun.t.getDay() === 5 || gun.t.getDay() === 6;
      let ipucu = '';
      if (!paket && durum.sebep === 'Davet / organizasyon' && gunFark < 3) ipucu = 'Davetleri 3-5 gün önceden konuşmak iyi olur. Yine de yazın, bakalım.';
      else if (durum.yer === 'arka' && gunFark < 1) ipucu = 'Arka salon için 1-2 gün önceden haber verirseniz sofra kurulu bekler.';
      else if (durum.yer === 'arka' && durum.kisi >= 40) ipucu = '40 kişiden kalabalıksanız arayın, birlikte bakalım.';
      else if (durum.yer === 'tezgah' && hs && durum.saat >= '19:00') ipucu = 'Cuma ve cumartesi akşamı tezgâh erken dolar; iyi ki önceden yazıyorsunuz.';
      else if (durum.yer === 'salon' && durum.kisi >= 16) ipucu = 'Daha kalabalıksanız arka salonu seçin.';
      else if (paket && durum.sebep !== 'Gelip alacağım') ipucu = 'Adresinizi WhatsApp mesajına ekleyin; kaç dakikada varacağını hemen söyleriz.';
      const ip = $('[data-ipucu]');
      ip.hidden = !ipucu; ip.textContent = ipucu;
      const muhur = $('.mk__muhur');
      if (!reducedMotion) gsap.fromTo(muhur, { scale: 1.6, opacity: 0, rotate: -30 }, { scale: 1, opacity: 1, rotate: -12, duration: 0.35, ease: 'power4.in', overwrite: true });
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      if (b.dataset.yer) {
        const y = YERLER.find((x) => x.id === b.dataset.yer);
        if (durum.yer !== y.id) durum.kisi = Math.min(y.max, Math.max(y.min, y.id === 'arka' || durum.yer === 'arka' ? y.bas : durum.kisi));
        durum.yer = y.id;
        sebepleriKur();
      } else if (b.dataset.adim) durum.kisi += Number(b.dataset.adim);
      else if (b.dataset.gun) {
        durum.gun = Number(b.dataset.gun);
        el.querySelectorAll('[data-gun]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        saatleriKur();
      } else if (b.dataset.saat) {
        durum.saat = b.dataset.saat;
        el.querySelectorAll('[data-saat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      } else if (b.dataset.sebep) {
        durum.sebep = b.dataset.sebep;
        el.querySelectorAll('[data-sebep]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      } else return;
      ciz();
    });
    kaydir.addEventListener('input', () => { durum.kisi = Number(kaydir.value); ciz(); });
    $('[data-not]').addEventListener('input', () => {
      const not = $('[data-not]').value.trim();
      const a = $('[data-wa]');
      const u = new URL(a.href);
      const m = (u.searchParams.get('text') || '').split('\n').filter((x) => !x.startsWith('Not: '));
      if (not) m.push(`Not: ${not}`);
      a.href = waHref(d, m.join('\n'));
    });

    saatleriKur();
    sebepleriKur();
    ciz();

    if (!reducedMotion) {
      gsap.from(el.querySelector('.mk__adisyon'), { y: 50, rotate: 4, opacity: 0, duration: 0.9, ease: 'back.out(1.3)', scrollTrigger: { trigger: el.querySelector('.mk__sahne'), start: 'top 80%', once: true } });
      gsap.from(el.querySelectorAll('.mk__alan'), { y: 26, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power2.out', scrollTrigger: { trigger: el.querySelector('.mk__secim'), start: 'top 85%', once: true } });
    }
  },
};

// --- Ocak saati: canlı durum + saatler + harita ---------------------------------------------

export const ocakSaati = {
  render(d) {
    if (!d.saatler) return '';
    const st = openStatus(d.saatler);
    const bugun = new Date().getDay();
    return `
      <section class="k-bolum os">
        <div class="k-kap os__ic">
          <div class="os__durum ${st.open ? 'is-acik' : ''}">
            <div class="os__alev">${alev}</div>
            <p class="os__ust">Şu an</p>
            <h2 class="k-h2" data-bol>${st.open ? 'Ocak yanıyor' : 'Ocak sönük'}</h2>
            <p class="os__metin">${esc(st.text)}${/^bugün/i.test(st.text) ? '' : `. Bugün ${esc(GUNLER[bugun])}`}.</p>
            <dl class="os__saatler">${groupedHours(d.saatler).map(([gun, s]) => `<div><dt>${esc(gun)}</dt><dd>${esc(s)}</dd></div>`).join('')}</dl>
          </div>
          <div class="os__konum">
            <p class="os__ust">Adres</p>
            <p class="os__adres">${esc(d.iletisim.adres)}</p>
            <div class="k-butonlar">
              <a class="k-btn" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
              <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
            </div>
            <div class="os__harita" data-harita><p>Harita yaklaşınca yüklenir</p></div>
          </div>
        </div>
      </section>`;
  },
  mount(el, d) {
    const kutu = el.querySelector('[data-harita]');
    const io = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      kutu.innerHTML = `<iframe title="Konum haritası" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
      io.disconnect();
    }, { rootMargin: '300px' });
    io.observe(kutu);
    return () => io.disconnect();
  },
};

// --- Şiş ayracı --------------------------------------------------------------------------

export const sis = {
  render() {
    return `<div class="sis-ayrac" aria-hidden="true">${sisSvg(2400)}</div>`;
  },
  mount(el) {
    if (reducedMotion) return;
    gsap.fromTo(el.querySelector('.sis'), { x: -60 }, { x: -520, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  },
};

// --- Menü sayfası: motor bölümü, "teklif" yerine sipariş dili -----------------------------------

export const hizmetler = {
  render(d, ctx, sorgu) {
    return BOLUMLER.hizmetler.render(d, ctx, sorgu).replaceAll('Bu hizmet için teklif isteyin', 'Bunun için yazın');
  },
};
