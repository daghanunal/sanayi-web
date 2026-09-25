// Kurumsal diş kliniği — "Diş haritası" yönü.
// arkHero:     kemer pencereli fotoğraf; üst çenenin 16 dişi pencerenin üstüne dizilir, biri pembe yanar.
// disHaritasi: imza modülü. Yetişkin (FDI 11–48) / çocuk (51–85) çene haritası; dişe dokun, şikâyeti seç,
//              randevu mesajı hazır (WhatsApp / Ara). Teşhis koymaz; "muayenede neye bakarız" der.
// hizmetler:   motor bölümü, yalnızca "teklif" dilini randevu diline çevirir.
import { esc, telHref, waHref, openStatus, icons, gsap, reducedMotion } from '../../shared/core.js';
import { BOLUMLER, yilEki } from '../_kurumsal/bolumler.js';

const ok = `<svg class="k-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const rota = (id, metin, cls = 'k-btn') => `<a class="${cls}" href="#/${id}" data-rota="${id}">${metin}</a>`;
const R = Math.PI / 180;

// --- Diş verisi --------------------------------------------------------------------------

// Genişlik / derinlik (mm, yaklaşık) ve ad: 1 orta kesici … 8 yirmilik.
const YETISKIN = [
  { w: 8.6, h: 7, ad: 'orta kesici diş', tip: 'kesici' },
  { w: 6.8, h: 6.6, ad: 'yan kesici diş', tip: 'kesici' },
  { w: 7.6, h: 8.2, ad: 'köpek dişi', tip: 'kopek' },
  { w: 7.1, h: 9.2, ad: '1. küçük azı', tip: 'kucuk' },
  { w: 6.8, h: 9.2, ad: '2. küçük azı', tip: 'kucuk' },
  { w: 10.2, h: 11, ad: '1. büyük azı', tip: 'buyuk' },
  { w: 9.4, h: 10.6, ad: '2. büyük azı', tip: 'buyuk' },
  { w: 8.8, h: 10, ad: 'yirmilik diş', tip: 'buyuk' },
];
const COCUK = [
  { w: 6.4, h: 5.4, ad: 'süt orta kesici', tip: 'kesici' },
  { w: 5.4, h: 5.2, ad: 'süt yan kesici', tip: 'kesici' },
  { w: 6.4, h: 6.4, ad: 'süt köpek dişi', tip: 'kopek' },
  { w: 7.4, h: 8.2, ad: 'süt 1. azı', tip: 'buyuk' },
  { w: 9.2, h: 9.4, ad: 'süt 2. azı', tip: 'buyuk' },
];
// FDI bölgeleri: hastanın sağı ekranda soldadır.
const BOLGE = { 1: 'Sağ üst', 2: 'Sol üst', 3: 'Sol alt', 4: 'Sağ alt', 5: 'Sağ üst', 6: 'Sol üst', 7: 'Sol alt', 8: 'Sağ alt' };

// Dişleri bir elips yayı boyunca dizer. merkez açı (derece), yön +1/-1, yay açıklığı.
function yay({ cx, cy, rx, ry, bas, yon, acik, set, bolge, olcek }) {
  const top = set.reduce((a, t) => a + t.w, 0);
  let birikim = 0;
  return set.map((t, i) => {
    const f = (birikim + t.w / 2) / top;
    birikim += t.w;
    const a = (bas + yon * f * acik) * R;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    // Teğet yönü (elipste türev) → dişin genişliği yaya paralel.
    const rot = (Math.atan2(ry * Math.cos(a), -rx * Math.sin(a)) * 180) / Math.PI;
    const nl = Math.hypot(Math.cos(a) * ry, Math.sin(a) * rx);
    const [nx, ny] = [(Math.cos(a) * ry) / nl, (Math.sin(a) * rx) / nl];
    return { ...t, x, y, rot, nx, ny, w: t.w * olcek * 0.9, h: t.h * olcek, fdi: `${bolge}${i + 1}`, bolge, sira: i };
  });
}

export function cene(cocuk) {
  const set = cocuk ? COCUK : YETISKIN;
  const o = cocuk ? 5.2 : 3.75;
  const acik = cocuk ? 84 : 88;
  const [b1, b2, b3, b4] = cocuk ? [5, 6, 7, 8] : [1, 2, 3, 4];
  const ust = { cx: 200, cy: 190, rx: cocuk ? 138 : 162, ry: cocuk ? 130 : 152, set, olcek: o, acik };
  const alt = { cx: 200, cy: 240, rx: cocuk ? 130 : 152, ry: cocuk ? 124 : 142, set, olcek: o, acik };
  return [
    ...yay({ ...ust, bas: 270, yon: -1, bolge: b1 }),
    ...yay({ ...ust, bas: 270, yon: 1, bolge: b2 }),
    ...yay({ ...alt, bas: 90, yon: -1, bolge: b3 }),
    ...yay({ ...alt, bas: 90, yon: 1, bolge: b4 }),
  ];
}

const disAdi = (t) => `${BOLGE[t.bolge]} ${t.ad}`;

// Oklüzal (çiğneyen yüz) görünümünde tek diş: yuvarlatılmış gövde + tipine göre oluk çizgisi.
function disSekli(t, cls = 'dh__dis') {
  const w = t.w, h = t.h, r = Math.min(w, h) * (t.tip === 'kesici' ? 0.46 : 0.4);
  let oluk = '';
  if (t.tip === 'buyuk') oluk = `<path class="dh__oluk" d="M${-w * 0.28} 0H${w * 0.28}M0 ${-h * 0.26}V${h * 0.26}"/>`;
  else if (t.tip === 'kucuk') oluk = `<path class="dh__oluk" d="M${-w * 0.24} 0H${w * 0.24}"/>`;
  else if (t.tip === 'kopek') oluk = `<circle class="dh__oluk" r="${w * 0.08}"/>`;
  // Konum dış grupta (SVG transform özniteliği), GSAP yalnızca içteki grubu ölçekler.
  return `<g transform="translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.rot.toFixed(1)})"><g class="${cls}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}"/>${oluk}</g></g>`;
}

// --- Şikâyetler -------------------------------------------------------------------------
// "bak": muayenede neye bakarız (teşhis değil). "ilgili": hizmet id'leri.
const SIKAYET = [
  { id: 'agri', ad: 'Ağrıyor', cumle: 'ağrı var', bak: 'Ağrının çürükten mi, sinirden mi, diş etinden mi geldiğini muayene ve röntgenle ayırırız. Görmeden bir şey söylemeyiz.', ilgili: ['muayene', 'dolgu', 'kanal'] },
  { id: 'hassas', ad: 'Sıcak-soğuk hassasiyeti', cumle: 'sıcak-soğuk hassasiyeti var', bak: 'Diş yüzeyinde aşınma, çürük ya da çekilmiş diş eti olup olmadığına bakarız.', ilgili: ['muayene', 'dolgu', 'temizlik'] },
  { id: 'kirik', ad: 'Kırıldı / çatladı', cumle: 'kırılma ya da çatlak var', bak: 'Kırığın ne kadar derine indiğini röntgenle görürüz; dişi korumak için hangi seçeneklerin olduğunu anlatırız.', ilgili: ['dolgu', 'kanal', 'protez'] },
  { id: 'dolgu', ad: 'Dolgu düştü', cumle: 'dolgu düştü', bak: 'Dolgunun altında yeni çürük olup olmadığını kontrol eder, dişi yeniden kapatmak için seçenekleri konuşuruz.', ilgili: ['dolgu', 'muayene'] },
  { id: 'dis-eti', ad: 'Diş eti kanıyor / şişti', cumle: 'diş eti kanaması ya da şişlik var', bak: 'Diş taşı, diş eti cebi ve apse ihtimaline bakarız. Şişlik yüzünüze yayılıyorsa beklemeden arayın.', ilgili: ['temizlik', 'muayene'] },
  { id: 'eksik', ad: 'Diş eksik', cumle: 'diş eksikliği var', bak: 'Boşluğun çevresindeki dişlere ve kemiğe röntgenle bakar, implant, köprü ya da protez seçeneklerini anlatırız.', ilgili: ['implant', 'protez'] },
  { id: 'sallaniyor', ad: 'Sallanıyor', cumle: 'sallanma var', bak: 'Diş etinin ve kemiğin durumuna bakarız. Çocuklarda süt dişinin sallanması çoğu zaman değişimin habercisidir.', ilgili: ['muayene', 'temizlik', 'cocuk'] },
  { id: 'capraz', ad: 'Çapraşık / kapanış', cumle: 'çapraşıklık ya da kapanış sorunu var', bak: 'Dişlerin dizilişini ve çenelerin kapanışını değerlendirir, tel ve şeffaf plak seçeneklerini anlatırız.', ilgili: ['ortodonti', 'muayene'] },
  { id: 'kontrol', ad: 'Sadece kontrol', cumle: 'kontrol ettirmek istiyorum', bak: 'Genel ağız muayenesi yapar, gerekiyorsa röntgen çeker ve diş taşı durumunu söyleriz.', ilgili: ['muayene', 'temizlik'] },
];

// Seçilen dişleri okunur bir cümleye çevirir: "sol alt 1. büyük azı (36) ve sağ üst köpek dişi (13)".
function dislerCumle(liste) {
  const p = liste.map((t) => `${disAdi(t).toLocaleLowerCase('tr-TR')} (${t.fdi})`);
  if (p.length <= 1) return p.join('');
  return `${p.slice(0, -1).join(', ')} ve ${p.at(-1)}`;
}

function mesajYaz(d, disler, sikayetler, cocuk) {
  // "Sadece kontrol" bir şikâyet değil; cümleye eklenmez, genel kontrol mesajına düşer.
  const s = sikayetler.filter((x) => x !== 'kontrol').map((x) => SIKAYET.find((y) => y.id === x)).filter(Boolean);
  const ne = s.map((x) => x.cumle).join(', ');
  const cok = disler.length > 1;
  // Yetişkin: "… dişimde / dişlerime"; çocuk: "Çocuğumun … dişinde / dişlerine".
  const ek = (hal) => (cocuk ? (cok ? `dişlerin${hal}` : `dişin${hal}`) : cok ? `dişlerim${hal}` : `dişim${hal}`);
  const kim = cocuk ? 'çocuğumun ' : '';
  let govde;
  if (disler.length && ne) govde = `${kim}${dislerCumle(disler)} ${ek('de')} ${ne}.`;
  else if (disler.length) govde = `${kim}${dislerCumle(disler)} ${ek('e')} baktırmak istiyorum.`;
  else if (ne) govde = `${cocuk ? 'çocuğumun dişlerinde' : 'dişlerimde'} ${ne}.`;
  else return `Merhaba ${d.isletme.ad}, ${cocuk ? 'çocuğum için ' : ''}genel diş kontrolü randevusu almak istiyorum.`;
  return `Merhaba ${d.isletme.ad}, ${govde} Muayene için randevu almak istiyorum.`;
}

// --- Hero --------------------------------------------------------------------------------

export const arkHero = {
  render(d, { tema }) {
    const h = d.kurumsal?.hero || {};
    const st = d.saatler ? openStatus(d.saatler) : null;
    // Kemer: 460 birimlik kutuda pencere yarıçapı 170, diş halkası 200; üst yarım daire boyunca 16 diş.
    const disler = [
      ...yay({ cx: 230, cy: 232, rx: 200, ry: 200, bas: 270, yon: -1, acik: 86, set: YETISKIN, bolge: 1, olcek: 4 }),
      ...yay({ cx: 230, cy: 232, rx: 200, ry: 200, bas: 270, yon: 1, acik: 86, set: YETISKIN, bolge: 2, olcek: 4 }),
    ];
    const bilgi = [
      ['Kuruluş', String(d.isletme.kurulus)],
      st ? ['Bugün', st.text] : null,
      ['Randevu', d.iletisim.telefon],
    ]
      .filter(Boolean)
      .map(([e, v]) => `<div><dt>${esc(e)}</dt><dd>${esc(v)}</dd></div>`)
      .join('');
    return `
      <section class="k-hero ah" aria-label="Giriş">
        <div class="k-kap k-hero__ic">
          <div class="k-hero__metin">
            <p class="k-hero__ust"><span class="ah__rozet">${esc(d.isletme.sektor)}</span> ${esc(tema.yer)} ${esc(yilEki(d.isletme.kurulus))} beri</p>
            <h1 class="k-h1 k-hero__baslik" data-bol>${esc(h.baslik || d.isletme.slogan)}</h1>
            <p class="k-lead">${esc(h.metin || d.isletme.hakkinda)}</p>
            <div class="k-butonlar">
              ${rota('iletisim', `${esc(h.birincil || 'Randevu isteyin')} ${ok}`)}
              ${rota(h.ikincilRota || 'dis-haritasi', `<span class="ah__mini" aria-hidden="true"></span>${esc(h.ikincil || 'Diş haritası')}`, 'k-btn k-btn--ikincil')}
            </div>
          </div>
          <div class="ah__kemer">
            <svg class="ah__disler" viewBox="0 0 460 250" aria-hidden="true">${disler.map((t) => disSekli(t, `ah__dis${t.fdi === '16' ? ' is-yan' : ''}`)).join('')}</svg>
            <figure class="ah__pencere" data-perde><div class="ah__pencere-ic" data-paralaks><img src="${tema.heroGorsel}" alt="${esc(tema.heroAlt || '')}" fetchpriority="high"></div></figure>
            <a class="ah__etiket" href="#/dis-haritasi" data-rota="dis-haritasi"><b>16</b><span>Sağ üst 1. büyük azı<small>Dişinizi haritada işaretleyin</small></span></a>
          </div>
        </div>
        <div class="k-kap"><dl class="k-hero__bilgi">${bilgi}</dl></div>
      </section>`;
  },
  mount(el) {
    if (reducedMotion) return;
    const disler = el.querySelectorAll('.ah__dis');
    // Ortadan (kesicilerden) dışa doğru dizilsin: 11/21 önce, 18/28 en son.
    const sirali = [...disler].sort((a, b) => Math.abs(7.5 - [...disler].indexOf(a)) - Math.abs(7.5 - [...disler].indexOf(b)));
    gsap.set(disler, { transformBox: 'fill-box', transformOrigin: '50% 50%' });
    const tl = gsap.timeline({ delay: 0.55 });
    tl.from(sirali, { scale: 0, opacity: 0, duration: 0.5, stagger: 0.045, ease: 'back.out(2.4)' })
      .from(el.querySelector('.ah__etiket'), { y: 18, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.25');
  },
};

// --- İmza: diş haritası -----------------------------------------------------------------

export const disHaritasi = {
  render(d) {
    const tek = (d.hizmetler || []).reduce((m, h) => ((m[h.id] = h), m), {});
    return `
      <section class="k-bolum dh" aria-labelledby="dh-baslik">
        <div class="k-kap">
          <div class="dh__bas">
            <p class="dh__ust"><span></span>Diş haritası</p>
            <h2 class="k-h2" id="dh-baslik" data-bol>Hangi dişiniz? Dokunun, gerisini biz yazalım.</h2>
            <p class="k-lead">Dişi işaretleyin, ne olduğunu seçin; randevu mesajınız hazır olsun. Harita teşhis koymaz, ne olduğunu muayenede birlikte görürüz.</p>
          </div>
          <div class="dh__ic">
            <div class="dh__harita">
              <div class="dh__mod" role="group" aria-label="Diş takımı">
                <button type="button" aria-pressed="true" data-mod="yetiskin">Yetişkin</button>
                <button type="button" aria-pressed="false" data-mod="cocuk">Çocuk <small>süt dişleri</small></button>
              </div>
              <div class="dh__svg-kutu">
                <svg class="dh__svg" viewBox="0 0 400 430" role="group" aria-label="Çene haritası: dişe dokunarak seçin">
                  <g class="dh__rehber" aria-hidden="true">
                    <text x="6" y="14">SAĞ</text><text x="394" y="14" text-anchor="end">SOL</text>
                  </g>
                  <g class="dh__odak" aria-hidden="true">
                    <text class="dh__odak-no" x="200" y="210" text-anchor="middle">32</text>
                    <text class="dh__odak-ad" x="200" y="240" text-anchor="middle">diş · birine dokunun</text>
                  </g>
                  <g class="dh__disler"></g>
                </svg>
              </div>
              <button type="button" class="dh__devam" hidden><span class="dh__devam-n">0</span><span>diş seçildi · şikâyeti seçin</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
              <p class="dh__ipucu">Ekranda sol taraf sizin sağınızdır; aynaya bakar gibi değil, karşınızdaki hekim gibi görürsünüz.</p>
            </div>
            <div class="dh__panel">
              <div class="dh__adim">
                <p class="dh__adim-no">1</p>
                <div>
                  <h3 class="k-h3">Seçilen dişler</h3>
                  <ul class="dh__secili" aria-live="polite"><li class="dh__bos">Henüz diş seçmediniz. Emin değilseniz boş bırakın.</li></ul>
                </div>
              </div>
              <div class="dh__adim">
                <p class="dh__adim-no">2</p>
                <div>
                  <h3 class="k-h3">Ne oluyor?</h3>
                  <div class="dh__cipler" role="group" aria-label="Şikâyet">
                    ${SIKAYET.map((s) => `<button type="button" class="dh__cip" aria-pressed="false" data-sikayet="${s.id}">${esc(s.ad)}</button>`).join('')}
                  </div>
                </div>
              </div>
              <div class="dh__bak" hidden>
                <p class="dh__bak-bas">Muayenede neye bakarız</p>
                <p class="dh__bak-metin"></p>
                <ul class="dh__ilgili"></ul>
              </div>
              <div class="dh__mesaj">
                <p class="dh__mesaj-bas">Randevu mesajınız</p>
                <blockquote class="dh__balon"></blockquote>
                <div class="k-butonlar">
                  <a class="k-btn dh__wa" href="${waHref(d, mesajYaz(d, [], [], false))}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp'tan gönder</span></a>
                  <a class="k-btn k-btn--ikincil" href="${telHref(d)}">${icons.phone}<span>Arayın</span></a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <script type="application/json" class="dh__veri">${JSON.stringify(Object.fromEntries(Object.entries(tek).map(([k, h]) => [k, esc(h.baslik)]))).replace(/</g, '\\u003c')}</script>
      </section>`;
  },
  mount(el, d, ctx) {
    const g = el.querySelector('.dh__disler');
    const devam = el.querySelector('.dh__devam');
    const panel = el.querySelector('.dh__panel');
    devam.addEventListener('click', () => (ctx?.lenis ? ctx.lenis.scrollTo(panel, { offset: -84 }) : panel.scrollIntoView({ behavior: 'smooth' })));
    const svg = el.querySelector('.dh__svg');
    const odakNo = el.querySelector('.dh__odak-no');
    const odakAd = el.querySelector('.dh__odak-ad');
    const seciliUl = el.querySelector('.dh__secili');
    const bak = el.querySelector('.dh__bak');
    const balon = el.querySelector('.dh__balon');
    const wa = el.querySelector('.dh__wa');
    const hizmetAd = JSON.parse(el.querySelector('.dh__veri').textContent);
    const durum = { cocuk: false, disler: new Map(), sikayet: [] };
    let liste = [];

    const odak = (t) => {
      const n = durum.disler.size;
      odakNo.textContent = t ? t.fdi : n ? String(n) : String(liste.length);
      odakAd.textContent = t ? disAdi(t) : n ? 'diş seçildi' : 'diş · birine dokunun';
    };

    const ciz = (animasyon) => {
      liste = cene(durum.cocuk);
      g.innerHTML = liste
        .map((t, i) => {
          const sekil = disSekli(t, 'dh__govde');
          const secili = durum.disler.has(t.fdi);
          return `<g class="dh__dis${secili ? ' is-secili' : ''}" data-i="${i}" tabindex="0" role="button" aria-pressed="${secili}" aria-label="${esc(`${t.fdi}, ${disAdi(t)}`)}">${sekil}<text class="dh__no" x="${(t.x + t.nx * (t.h / 2 + 10)).toFixed(1)}" y="${(t.y + t.ny * (t.h / 2 + 10)).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${t.fdi}</text></g>`;
        })
        .join('');
      if (animasyon && !reducedMotion) {
        const govdeler = g.querySelectorAll('.dh__govde');
        gsap.set(govdeler, { transformBox: 'fill-box', transformOrigin: '50% 50%' });
        const n = liste.length / 4;
        gsap.from(govdeler, { scale: 0, opacity: 0, duration: 0.45, ease: 'back.out(2)', stagger: (i) => (i % n) * 0.04 + Math.floor(i / n) * 0.02 });
      }
    };

    const guncelle = () => {
      const disler = [...durum.disler.values()];
      devam.hidden = !disler.length;
      devam.querySelector('.dh__devam-n').textContent = disler.length;
      seciliUl.innerHTML = disler.length
        ? disler
            .map((t) => `<li><button type="button" data-kaldir="${t.fdi}" aria-label="${esc(`${t.fdi} dişini kaldır`)}"><b>${t.fdi}</b>${esc(disAdi(t))}<span aria-hidden="true">×</span></button></li>`)
            .join('')
        : `<li class="dh__bos">Henüz diş seçmediniz. Emin değilseniz boş bırakın.</li>`;
      // Yirmilik seçildiyse çekim tedavisini de öner.
      const son = durum.sikayet.at(-1);
      const s = SIKAYET.find((x) => x.id === son);
      if (s) {
        let ilgili = [...s.ilgili];
        if (disler.some((t) => t.ad.startsWith('yirmilik'))) ilgili = ['cekim', ...ilgili.filter((x) => x !== 'cekim')];
        if (durum.cocuk && !ilgili.includes('cocuk')) ilgili.unshift('cocuk');
        bak.hidden = false;
        bak.querySelector('.dh__bak-metin').textContent = s.bak;
        bak.querySelector('.dh__ilgili').innerHTML = ilgili
          .filter((x) => hizmetAd[x])
          .slice(0, 3)
          .map((x) => `<li><a href="#/hizmetler" data-rota="hizmetler">${hizmetAd[x]} ${ok}</a></li>`)
          .join('');
      } else bak.hidden = true;
      const m = mesajYaz(d, disler, durum.sikayet, durum.cocuk);
      balon.textContent = m;
      wa.href = waHref(d, m);
      odak(null);
    };

    const sec = (i) => {
      const t = liste[i];
      if (!t) return;
      const gEl = g.querySelector(`[data-i="${i}"]`);
      if (durum.disler.has(t.fdi)) durum.disler.delete(t.fdi);
      else durum.disler.set(t.fdi, t);
      const secili = durum.disler.has(t.fdi);
      gEl.classList.toggle('is-secili', secili);
      gEl.setAttribute('aria-pressed', secili);
      if (secili && !reducedMotion) {
        const govde = gEl.querySelector('.dh__govde');
        gsap.set(govde, { transformBox: 'fill-box', transformOrigin: '50% 50%' });
        gsap.fromTo(govde, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.5)' });
      }
      guncelle();
      odak(t);
    };

    g.addEventListener('click', (e) => {
      const t = e.target.closest('.dh__dis');
      if (t) sec(Number(t.dataset.i));
    });
    g.addEventListener('keydown', (e) => {
      const t = e.target.closest('.dh__dis');
      if (t && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        sec(Number(t.dataset.i));
      }
    });
    const ustte = (e) => {
      const t = e.target.closest?.('.dh__dis');
      if (t) odak(liste[Number(t.dataset.i)]);
    };
    g.addEventListener('pointerover', ustte);
    g.addEventListener('focusin', ustte);
    svg.addEventListener('pointerleave', () => odak(null));

    seciliUl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-kaldir]');
      if (!b) return;
      durum.disler.delete(b.dataset.kaldir);
      const i = liste.findIndex((t) => t.fdi === b.dataset.kaldir);
      const gEl = g.querySelector(`[data-i="${i}"]`);
      gEl?.classList.remove('is-secili');
      gEl?.setAttribute('aria-pressed', 'false');
      guncelle();
    });

    el.querySelectorAll('.dh__cip').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.sikayet;
        const var_ = durum.sikayet.includes(id);
        durum.sikayet = var_ ? durum.sikayet.filter((x) => x !== id) : [...durum.sikayet, id];
        b.setAttribute('aria-pressed', !var_);
        guncelle();
      })
    );

    el.querySelectorAll('[data-mod]').forEach((b) =>
      b.addEventListener('click', () => {
        const cocuk = b.dataset.mod === 'cocuk';
        if (cocuk === durum.cocuk) return;
        durum.cocuk = cocuk;
        durum.disler.clear();
        el.querySelectorAll('[data-mod]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        el.classList.toggle('is-cocuk', cocuk);
        ciz(true);
        guncelle();
      })
    );

    ciz(false);
    guncelle();
    if (!reducedMotion) {
      const govdeler = g.querySelectorAll('.dh__govde');
      gsap.set(govdeler, { transformBox: 'fill-box', transformOrigin: '50% 50%' });
      gsap.from(govdeler, {
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'back.out(2)',
        stagger: (i) => (i % 8) * 0.05 + Math.floor(i / 8) * 0.03,
        scrollTrigger: { trigger: svg, start: 'top 80%', once: true },
      });
    }
  },
};

// --- Motor bölümü: tedaviler (teklif → randevu dili) ---------------------------------------

export const hizmetler = {
  render(d, ctx, sorgu) {
    return BOLUMLER.hizmetler.render(d, ctx, sorgu).replaceAll('Bu hizmet için teklif isteyin', 'Bu tedavi için randevu isteyin');
  },
};

export const ozet = {
  render(d, ctx, sorgu) {
    return BOLUMLER.ozet.render(d, ctx, sorgu).replace('>Kurumsal <', '>Kliniğimizi tanıyın <');
  },
};
