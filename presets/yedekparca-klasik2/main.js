import raw from '../../data/depo.json';
import extra from '../../data/yedekparca-klasik2.json';
import {
  boot, initSmoothScroll, gsap, ScrollTrigger, reducedMotion, esc, asset, autoHideHeader,
  telHref, waHref, mapsHref, mapsEmbed, saatListesi, gunDurumu, kisaAdres, acikGunSayisi, yilEki, icons, GUNLER,
} from '../../shared/core.js';

// Klasik aile: WebGL yok. Kimlik: fren diski. Koyu erik zemin, kemik beyazı yazı, nane yeşili;
// künyede depo fotoğrafı disk açıklığından görünür, her şey daire (yuvarlak parça görselleri, sayı rozetleri).
ScrollTrigger.config({ ignoreMobileResize: true });

const d = boot({ ...raw, ...extra });
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const ad = esc(d.isletme.ad);
const tel = esc(d.iletisim.telefon);
const yas = new Date().getFullYear() - d.isletme.kurulus;
const acikGun = acikGunSayisi(d.saatler);
const st = gunDurumu(d.saatler);
const urunler = d.urunler ?? [];
const wa = (m) => waHref(d, m ?? `Merhaba ${d.isletme.ad}, parça sormak istiyorum.`);
const diskLogo = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="currentColor"/><circle cx="20" cy="20" r="7" fill="var(--erik)"/><g fill="var(--erik)"><circle cx="20" cy="9.5" r="2"/><circle cx="30" cy="16.8" r="2"/><circle cx="26.2" cy="28.5" r="2"/><circle cx="13.8" cy="28.5" r="2"/><circle cx="10" cy="16.8" r="2"/></g></svg>`;

// --- Üst çubuk ---------------------------------------------------------------------

$('#ust').innerHTML = `
  <a class="ust__logo" href="#kunye">${diskLogo}<span>${ad}</span></a>
  <nav class="ust__nav" aria-label="Bölümler"><a href="#hizmetler">Hizmetler</a><a href="#hakkinda">Hakkında</a><a href="#saatler">Saatler ve konum</a><a href="#iletisim">İletişim</a></nav>
  <span class="ust__durum"><i class="${st.open ? 'is-open' : ''}"></i><span>${st.open ? 'Açık' : 'Kapalı'}</span></span>
  <a class="ust__tel" href="${telHref(d)}" aria-label="Ara: ${tel}">${icons.phone}<span class="ust__num">${tel}</span></a>`;

// --- Künye ---------------------------------------------------------------------------

$('#kunye').innerHTML = `
  <div class="hero__sahne">
    <picture>
      <source media="(min-width: 900px)" srcset="${asset('/img/yedekparca-klasik2/koridor-d.jpg')}" width="1920" height="1080" />
      <img class="hero__foto" src="${asset('/img/yedekparca-klasik2/koridor-m.jpg')}" width="1080" height="1440" alt="Uzun depo koridoru, iki yanda tavana kadar dolu raflar" fetchpriority="high" />
    </picture>
    <svg class="hero__maske" aria-hidden="true"><path class="hero__zemin" fill-rule="evenodd"/><path class="hero__cizgi"/><path class="hero__jant"/></svg>
  </div>
  <div class="hero__kunye">
    <h1 class="hero__baslik ${d.isletme.ad.length > 26 ? 'is-uzun' : ''}" id="hero-baslik">${ad}</h1>
    <p class="hero__ne">${esc(d.isletme.tanim)}</p>
    <dl class="kunye">
      <div><dt>Adres</dt><dd>${esc(kisaAdres(d.iletisim.adres))}</dd></div>
      <div><dt>Bugün</dt><dd class="kunye__durum ${st.open ? 'is-open' : ''}"><i></i>${esc(st.kunye)}</dd></div>
      <div><dt>Telefon</dt><dd><a href="${telHref(d)}">${tel}</a></dd></div>
    </dl>
    <div class="hero__btnler">
      <a class="btn btn--nane" href="${telHref(d)}">${icons.phone}<span>Ara</span></a>
      <a class="btn btn--cizgi" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      <a class="btn btn--cizgi" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
    </div>
  </div>`;

// --- Hizmetler ve parça grupları -----------------------------------------------------

$('#hizmetler').innerHTML = `
  <header class="bolum-bas">
    <p class="etiket">01 / 05</p>
    <h2 class="h2" id="hizmet-baslik">Hizmetler</h2>
    <p class="bolum-bas__metin">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın.</p>
  </header>
  <ol class="hizmet-liste">
    ${d.hizmetler.map((h, i) => `
      <li class="hizmet">
        <span class="hizmet__no">${i + 1}</span>
        <div>
          <h3 class="hizmet__ad">${esc(h.baslik)}</h3>
          <p class="hizmet__metin">${esc(h.aciklama)}</p>
        </div>
      </li>`).join('')}
  </ol>
  ${urunler.length ? `
  <header class="bolum-bas bolum-bas--alt">
    <h3 class="h3">Parça grupları</h3>
    <p class="bolum-bas__metin">Binek ve hafif ticari araçlar için. Her grubun orijinali ve muadili bulunur.</p>
  </header>
  <ol class="raf-liste">
    ${urunler.map((u, i) => `
      <li class="raf" style="--i:${i}">
        <div class="raf__foto"><img src="${esc(d.parcaFoto?.[u.parca] ?? d.galeri[0].src)}" alt="" width="400" height="400" loading="lazy" decoding="async" /></div>
        <div class="raf__govde">
          <h4 class="raf__ad">${esc(u.baslik)}</h4>
          <p class="raf__metin">${esc(u.aciklama)}</p>
          <ul class="raf__cip">${(u.ornekler ?? []).map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
        </div>
      </li>`).join('')}
  </ol>` : ''}`;

// --- Hakkında -------------------------------------------------------------------------

$('#hakkinda').innerHTML = `
  <div class="hakkinda__ic">
    <div class="hakkinda__metin">
      <p class="etiket etiket--nane">02 / 05</p>
      <h2 class="h2" id="hakkinda-baslik">Hakkında</h2>
      <p class="hakkinda__giris">${ad} ${esc(yilEki(d.isletme.kurulus))} beri Şaşmaz Oto Sanayi Sitesi'nde. ${esc(d.isletme.hakkinda)}</p>
    </div>
    <dl class="bilgi">
      ${(d.bilgiler ?? []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      ${d.markalar?.length ? `<div><dt>Parça bulunan markalar</dt><dd>${d.markalar.map(esc).join(', ')}</dd></div>` : ''}
    </dl>
  </div>
  <dl class="rakamlar__liste">
    <div class="rakam"><dd><b data-say="${yas}">${yas}</b> yıl</dd><dt>Şaşmaz Oto Sanayi Sitesi'nde</dt></div>
    <div class="rakam"><dd><b data-say="${acikGun}">${acikGun}</b> gün</dd><dt>haftada açık</dt></div>
  </dl>
  <div class="depo__izgara">
    ${(d.depoFoto ?? d.galeri.slice(0, 4)).map((g, i) => `
      <figure class="depo__kare depo__kare--${i + 1}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" width="1200" height="900" loading="lazy" decoding="async" /></figure>`).join('')}
  </div>`;

// --- Çalışma saatleri ve konum --------------------------------------------------------

const bugun = GUNLER[new Date().getDay()];
const bugunMu = (g) => {
  if (g === bugun) return true;
  if (!g.includes('–')) return false;
  const [a, b] = g.split('–').map((x) => GUNLER.indexOf(x));
  const t = new Date().getDay();
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
};
$('#saatler').innerHTML = `
  <div class="iletisim__ic">
    <div class="saat">
      <p class="etiket">03 / 05</p>
      <h2 class="h2" id="saat-baslik">Çalışma saatleri ve konum</h2>
      <p class="durum ${st.open ? 'is-open' : ''}">${esc(st.metin)}</p>
      <dl class="saat__liste">
        ${saatListesi(d.saatler).map(([g, s]) => `<div class="${bugunMu(g) ? 'is-bugun' : ''}"><dt>${esc(g)}</dt><dd>${esc(s)}</dd></div>`).join('')}
      </dl>
    </div>
    <div class="konum">
      <div class="konum__harita" data-harita><span>Harita</span></div>
      <p class="konum__adres">${esc(d.iletisim.adres)}</p>
      <div class="konum__btnler">
        <a class="btn btn--koyu" href="${mapsHref(d)}" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>
        <a class="btn btn--cizgiK" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
      </div>
    </div>
  </div>`;

// --- Örnek yorumlar --------------------------------------------------------------------

const yildiz = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icons.star}</span>`).join('');
$('#yorumlar').innerHTML = `
  <div class="yorumlar__bas">
    <p class="etiket">04 / 05</p>
    <h2 class="h2" id="yorum-baslik">Örnek yorumlar</h2>
    <p class="bolum-bas__metin">Buradaki yorumlar örnektir, yerlerine işletmenin gerçek yorumları konur.</p>
  </div>
  <div class="yorum-serit" tabindex="0" aria-label="Örnek yorumlar, yana kaydırın" data-lenis-prevent-touch>
    ${d.yorumlar.map((y) => `
      <figure class="yorum">
        <div class="yildiz yildiz--kucuk" role="img" aria-label="5 üzerinden ${y.puan}">${yildiz(y.puan)}</div>
        <blockquote>${esc(y.metin)}</blockquote>
        <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac ?? '')}</span></figcaption>
      </figure>`).join('')}
  </div>`;

// --- İletişim --------------------------------------------------------------------------

$('#iletisim').innerHTML = `
  <div class="final__disk" aria-hidden="true"><svg viewBox="0 0 200 200"><path fill-rule="evenodd" fill="currentColor" data-final-disk/></svg></div>
  <div class="final__ic">
    <div class="final__metin">
      <p class="etiket etiket--nane">05 / 05</p>
      <h2 class="final__baslik" id="final-baslik">İletişim</h2>
      <p class="final__alt">Fiyat ve stok bilgisi için arayın ya da WhatsApp'tan yazın.</p>
      <div class="final__btnler">
        <a class="btn btn--nane btn--buyuk" href="${telHref(d)}">${icons.phone}<span>${tel}</span></a>
        <a class="btn btn--cizgi btn--buyuk" href="${wa()}" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
      </div>
      <p class="final__adres">${esc(d.iletisim.adres)}<br>${esc(st.metin)}</p>
    </div>
    <div class="vin" data-vin>
      <label class="vin__etiket" for="vin-girdi">Şasi numarasıyla sorma <span data-vin-sayac>0 / 17</span></label>
      <div class="vin__kutular" aria-hidden="true" data-vin-kutular></div>
      <input class="vin__girdi" id="vin-girdi" maxlength="17" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="Örn. VF1RFB00X12345678" aria-describedby="vin-not" />
      <p class="vin__not" id="vin-not" data-vin-not></p>
      <a class="btn btn--nane btn--genis" data-vin-gonder target="_blank" rel="noopener">${icons.whatsapp}<span data-vin-gonder-metin>Ruhsat fotoğrafını gönder</span></a>
    </div>
  </div>`;

$('#alt').innerHTML = `
  <p class="alt__ad">${ad}</p>
  <p>${esc(d.iletisim.adres)} · <a href="${telHref(d)}">${tel}</a></p>
  <p>© ${new Date().getFullYear()} ${ad}. Fotoğraflar Pexels'ten alınmıştır, temsilîdir. Parça görselleri 3D, temsilîdir. Yorumlar örnektir.</p>`;

// --- Fren diski geometrisi (künye maskesi ve iletişimdeki disk ortak) ------------------

const TAU = Math.PI * 2;
const circle = (x, y, r) => `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0Z`;
const LUG_R = 0.3, LUG = 0.062, HUB = 0.43, BORE = 0.17;
const holes = Array.from({ length: 5 }, (_, k) => [LUG_R, -Math.PI / 2 + (k * TAU) / 5, LUG]);
const dots = [];
[0.58, 0.7, 0.82].forEach((rr, ring) => {
  for (let k = 0; k < 20; k++) dots.push([rr, (k * TAU) / 20 + ring * 0.095, 0.021 + ring * 0.002]);
});
function discPath(cx, cy, R, th) {
  const P = (rr, a) => [cx + Math.cos(a + th) * rr * R, cy + Math.sin(a + th) * rr * R];
  let s = circle(cx, cy, R) + circle(cx, cy, R * HUB) + circle(cx, cy, R * BORE);
  for (const [rr, a, r] of [...holes, ...dots]) { const [x, y] = P(rr, a); s += circle(x, y, R * r); }
  return s;
}
$('[data-final-disk]').setAttribute('d', discPath(100, 100, 96, 0));

const maske = $('.hero__maske');
const zemin = $('.hero__zemin');
const cizgi = $('.hero__cizgi');
const jant = $('.hero__jant');
let geo = null;
function measure() {
  const w = maske.clientWidth || innerWidth;
  const h = maske.clientHeight || innerHeight;
  const mobil = w < 900;
  const R = mobil ? Math.min(w * 0.4, h * 0.42) : Math.min(h * 0.34, w * 0.24);
  geo = { w, h, R, cx: mobil ? w / 2 : w * 0.7, cy: mobil ? h * 0.54 : h * 0.54 };
  maske.setAttribute('viewBox', `0 0 ${w} ${h}`);
}
function drawDisk(th) {
  if (!geo) measure();
  const { w, h, R, cx, cy } = geo;
  zemin.setAttribute('d', `M0 0H${w}V${h}H0Z` + discPath(cx, cy, R, th));
  const rr = R * 1.13;
  cizgi.setAttribute('d', circle(cx, cy, rr));
  cizgi.style.strokeDashoffset = (-th * rr).toFixed(1);
  jant.setAttribute('d', circle(cx, cy, R) + circle(cx, cy, R * HUB));
}
const disk = { th: 0 };
measure();
drawDisk(0);
let rz;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => { measure(); drawDisk(disk.th); }, 120);
});

// --- Şasi numarası --------------------------------------------------------------------

const vinGirdi = $('#vin-girdi');
const gruplar = [[0, 3, 'Üretici'], [3, 9, 'Araç tanımı'], [9, 17, 'Seri no']];
$('[data-vin-kutular]').innerHTML = gruplar.map(([a, b, g]) => `
  <div class="vin__grup" style="--n:${b - a}"><div class="vin__hucreler">${'<span class="vin__hucre"></span>'.repeat(b - a)}</div><small>${esc(g)}</small></div>`).join('');
const hucreler = $$('.vin__hucre');
function vinGuncelle() {
  const temiz = vinGirdi.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const yasak = /[IOQ]/.test(temiz);
  const v = temiz.replace(/[IOQ]/g, '').slice(0, 17);
  if (vinGirdi.value !== v) vinGirdi.value = v;
  hucreler.forEach((c, i) => {
    c.textContent = v[i] ?? '';
    c.classList.toggle('is-dolu', i < v.length);
    c.classList.toggle('is-imlec', i === v.length && document.activeElement === vinGirdi);
  });
  $('[data-vin-sayac]').textContent = `${v.length} / 17`;
  const tam = v.length === 17;
  $('[data-vin]').classList.toggle('is-tam', tam);
  $('[data-vin-not]').textContent = yasak
    ? 'I, O ve Q şasi numarasında bulunmaz; bunlar büyük ihtimalle 1, 0 ya da 9.'
    : tam ? 'Numara tam. WhatsApp mesajına eklenir.' : 'Ruhsattaki 17 haneli numara. I, O ve Q harfleri kullanılmaz.';
  $('[data-vin-gonder-metin]').textContent = tam ? 'Şasi numarasını gönder' : 'Ruhsat fotoğrafını gönder';
  $('[data-vin-gonder]').href = tam
    ? wa(`Merhaba ${d.isletme.ad}, şasi numaram: ${v}. Parça sormak istiyorum.`)
    : wa(`Merhaba ${d.isletme.ad}, ruhsatımın fotoğrafını gönderiyorum. Parça sormak istiyorum.`);
}
['input', 'focus', 'blur'].forEach((ev) => vinGirdi.addEventListener(ev, vinGuncelle));
vinGuncelle();

// --- Harita ---------------------------------------------------------------------------

const harita = $('[data-harita]');
new IntersectionObserver((entries, io) => {
  if (!entries.some((e) => e.isIntersecting)) return;
  io.disconnect();
  harita.innerHTML = `<iframe title="${ad} konumu" src="${esc(mapsEmbed(d))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}, { rootMargin: '600px' }).observe(harita);

// --- Hareket --------------------------------------------------------------------------

const ust = $('#ust');
const kaydi = () => document.documentElement.classList.toggle('is-kaydi', scrollY > 60);
addEventListener('scroll', kaydi, { passive: true });
kaydi();
const phoneMq = matchMedia('(max-width: 899px)');
let unhide = null;
const syncHeader = () => {
  if (phoneMq.matches && !unhide) unhide = autoHideHeader(ust, { offset: 120 });
  else if (!phoneMq.matches && unhide) { unhide(); unhide = null; }
};
syncHeader();
phoneMq.addEventListener('change', syncHeader);

const bir = (trigger, start = 'top 86%') => ({ trigger, start, toggleActions: 'play none none none' });

if (!reducedMotion) {
  initSmoothScroll();
  // Açılış: disk bir bijon döner, fotoğraf yerine oturur, künye satır satır gelir (~1,1 sn, bir kez).
  gsap.fromTo(disk, { th: -TAU / 5 }, { th: 0, duration: 1.1, ease: 'power3.inOut', onUpdate: () => drawDisk(disk.th) });
  gsap.fromTo('.hero__foto', { scale: 1.18, rotate: -4 }, { scale: 1, rotate: 0, duration: 1.3, ease: 'power3.out' });
  gsap.from('.hero__kunye > *', { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', delay: 0.15, clearProps: 'all' });

  $$('.bolum-bas, .hakkinda__metin, .yorumlar__bas, .saat').forEach((el) => {
    gsap.from(el.children, { y: 28, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, clearProps: 'all', scrollTrigger: bir(el, 'top 85%') });
  });
  $$('.hizmet').forEach((el) => {
    gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.6, ease: 'power3.out', clearProps: 'all', scrollTrigger: bir(el, 'top 90%') });
  });
  // Parça grupları: yuvarlak görsel disk gibi dönerek açılır.
  $$('.raf').forEach((el) => {
    const tl = gsap.timeline({ scrollTrigger: bir(el) });
    tl.from($('.raf__foto', el), { clipPath: 'circle(0% at 50% 50%)', rotate: -75, duration: 1, ease: 'power3.out' })
      .from($('.raf__govde', el), { x: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all' }, 0.1);
  });
  $$('[data-say]').forEach((el) => {
    const hedef = Number(el.dataset.say);
    const o = { v: 0 };
    gsap.to(o, { v: hedef, duration: 1.3, ease: 'power2.out', scrollTrigger: bir(el, 'top 92%'), onUpdate: () => (el.textContent = Math.round(o.v)) });
  });
  $$('.depo__kare').forEach((el) => {
    gsap.from(el, { clipPath: 'inset(12% 12% 12% 12% round 999px)', duration: 1.1, ease: 'power3.out', scrollTrigger: bir(el, 'top 90%') });
  });
  gsap.fromTo('.final__disk svg', { rotate: -90 }, {
    rotate: 45, ease: 'none',
    scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
