// Kurumsal motor: tek sayfalık (hash yönlendirmeli) kurumsal site.
// Varyant: kurumsal({ veri, tema, sayfalar, ekstralar, ld, aksiyon }) çağırır; gerisi burada.
// Ayrıntılar: ./README.md
import './base.css';
import { boot, initSmoothScroll, reducedMotion, vitrinModu, icons, gsap, ScrollTrigger, autoHideHeader, setBarMesaj } from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { BOLUMLER, sayfaBasligi, yilEki, tanimMetni, duz } from './bolumler.js';

gsap.registerPlugin(SplitText);

// Varsayılan bilgi mimarisi (İÇERİK-BRIEF akışı: künye → hizmetler → hakkında → saatler ve konum →
// örnek yorumlar → iletişim). Varyant `sayfalar` ile tamamen ya da kısmen değiştirir. Sayfa id'leri
// eski varyantların `VARSAYILAN_SAYFALAR.map(s => s.id === 'kurumsal' ? …)` kalıbı bozulmasın diye aynı.
export const VARSAYILAN_SAYFALAR = [
  { id: 'anasayfa', baslik: 'Ana Sayfa', bolumler: ['hero', 'hizmetOzet', 'ozet', 'rakamlar', 'konum', 'yorumlar', 'cta'] },
  { id: 'hizmetler', baslik: 'Hizmetler', bolumler: ['hizmetler', 'surec', 'cta'] },
  { id: 'kurumsal', baslik: 'Hakkında', bolumler: ['hakkimizda', 'bilgiler', 'kalite', 'tarihce', 'markalar', 'cta'] },
  { id: 'kurumsal-musteriler', baslik: 'Kurumsal Müşteriler', bolumler: ['anlasmalar', 'cta'] },
  { id: 'referanslar', baslik: 'Galeri', bolumler: ['galeri', 'markalar', 'cta'] },
  { id: 'iletisim', baslik: 'İletişim', bolumler: ['iletisim'] },
];

// "Çalışma saatleri ve konum" ana sayfada varsayılan: sayfa listesinde `konum` yoksa ana sayfaya,
// "Örnek yorumlar"dan (yoksa CTA'dan) önce eklenir. Eklenmez: `tema.konum: false`; veride `saatler` yok
// (saatsiz veride `konum` sayfa listesine açıkça yazılır); `konum` başka bir sayfada; ana sayfada `iletisim`
// var; ana sayfada saatleri zaten gösteren bir varyant modülü var (modül `konumYerine: true` der ya da kodu
// `saatler` verisini okur: mesai, saat, bugün, nöbet…). Hero modülleri sayılmaz (künye bugünkü durumu
// gösterir, saat tablosu değildir): ana sayfanın ilk bölümü ve adı "hero" ile biten modüller (hero, kabulHero…).
// `konumYerine: false` modülün saatleri okusa da sayılmamasını açıkça ister.
const heroMu = (id, i) => i === 0 || /hero$/i.test(id);
function konumEkle(sayfalar, bolumler, tema, d) {
  if (tema.konum === false || !sayfalar.length || !d.saatler) return sayfalar;
  if (sayfalar.some((s) => s.bolumler.includes('konum'))) return sayfalar;
  const [ana, ...diger] = sayfalar;
  if (ana.bolumler.includes('iletisim')) return sayfalar;
  const saatModulu = ana.bolumler.some((id, i) => {
    const b = bolumler[id];
    if (!b || b === BOLUMLER[id]) return false;
    if (b.konumYerine === true) return true;
    if (b.konumYerine === false || heroMu(id, i)) return false;
    return /saatler/.test(`${b.render}${b.mount || ''}`);
  });
  if (saatModulu) return sayfalar;
  const liste = [...ana.bolumler];
  const i = [liste.indexOf('yorumlar'), liste.indexOf('cta')].find((x) => x >= 0) ?? liste.length;
  liste.splice(i, 0, 'konum');
  return [{ ...ana, bolumler: liste }, ...diger];
}

// Verisi olmayan sayfa menüye girmez: ana sayfa ve iletişim dışında, CTA dışındaki bütün motor bölümleri
// boş dönüyorsa (ör. eski veride yalnız misyon/vizyon kalmış bir sayfa). Varyant modülü olan sayfa kalır.
function bosSayfalariAyikla(sayfalar, bolumler, d, ctx) {
  const bos = new URLSearchParams();
  return sayfalar.filter((s, i) => {
    if (i === 0 || s.bolumler.includes('iletisim')) return true;
    return s.bolumler.some((id) => {
      if (id === 'cta') return false;
      const b = bolumler[id];
      if (!b) return false;
      if (b !== BOLUMLER[id]) return true;
      try { return !!b.render(d, ctx, bos); } catch { return true; }
    });
  });
}

export function derinBirlestir(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b === undefined ? a : b;
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = derinBirlestir(a?.[k], v);
  return out;
}

const depo = {
  al(k) { try { return localStorage.getItem(k); } catch { return null; } },
  koy(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// Tema → :root CSS değişkenleri. Anahtarlar README'de.
function temayiUygula(tema) {
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(tema.css || {})) r.setProperty(`--k-${k}`, v);
  document.documentElement.dataset.hero = tema.hero || 'bolunmus';
  document.documentElement.dataset.gecis = tema.gecis || 'perde';
  if (tema.metinBoyutu && depo.al('k-metin') === 'buyuk') document.documentElement.classList.add('k-buyuk');
}

export function kurumsal({ veri, tema = {}, sayfalar = VARSAYILAN_SAYFALAR, ekstralar = {}, ld, aksiyon, onHazir }) {
  temayiUygula(tema);
  const d = boot(veri);
  const bolumler = { ...BOLUMLER, ...ekstralar };
  const ctx = { d, tema, sayfalar, git, reducedMotion };
  sayfalar = konumEkle(sayfalar, bolumler, tema, d);
  ctx.sayfalar = sayfalar;
  sayfalar = bosSayfalariAyikla(sayfalar, bolumler, d, ctx);
  ctx.sayfalar = sayfalar;

  // JSON-LD: çekirdeğin AutoRepair kaydını varyantın türüyle değiştir.
  if (ld) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    const kayit = ld(d);
    s.textContent = JSON.stringify(kayit);
    document.head.append(s);
    // Verinin `schemaTur`'u yoksa türü `ld`'den al: oto dışı türde (Pharmacy, Dentist…) WhatsApp varsayılan metni
    // tarafsız olur (künye düğmesi ve alt çubuk). `waMesaj` varsa o kullanılır; `aksiyon` çubuğu aşağıda yine ezer.
    if (!d.schemaTur && kayit?.['@type']) {
      d.schemaTur = kayit['@type'];
      setBarMesaj(null);
    }
  }
  if (tema.baslikEki) document.title = `${d.isletme.ad} | ${tema.baslikEki}`;
  // Meta açıklama çekirdekte (applyMeta) künyeden kurulur: ad, tanım (yoksa sektör), adres, telefon. Slogan okunmaz.

  // Özel alt çubuk (ör. WhatsApp'ı olmayan üretici). Vitrin modunda dokunma.
  if (aksiyon && !vitrinModu()) {
    const bar = document.querySelector('.action-bar');
    if (bar) bar.innerHTML = aksiyon(d).map((b, i) => `<a href="${b.href}" class="action-bar__btn${i === 1 ? ' action-bar__btn--main' : ''}"${b.dis ? ' target="_blank" rel="noopener"' : ''}${b.rota ? ` data-rota="${b.rota}"` : ''}>${b.ikon}<span>${b.etiket}</span></a>`).join('');
  }

  iskeletKur(ctx);
  const lenis = initSmoothScroll();
  ctx.lenis = lenis;
  cerezBandi();

  // Rota bağlantıları: çekirdeğin "#..." tıklama dinleyicisinden önce yakala (seçici hatası vermesin).
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('[data-rota]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      menuKapat(ctx, false);
      git(a.dataset.rota);
    },
    true
  );
  addEventListener('hashchange', () => sayfaGoster(rotaCoz(), true));

  let aktif = null;
  let gecisVar = false;

  function git(rota) {
    const hedef = `#/${rota}`;
    if (location.hash === hedef) {
      lenis ? lenis.scrollTo(0) : scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.hash = hedef; // hashchange → sayfaGoster
  }

  function rotaCoz() {
    const [yol, sorgu] = location.hash.replace(/^#\/?/, '').split('?');
    const s = sayfalar.find((x) => x.id === yol) || sayfalar[0];
    return { sayfa: s, sorgu: new URLSearchParams(sorgu || '') };
  }

  const main = document.getElementById('sayfa');

  function sayfaIciniKur({ sayfa, sorgu }) {
    aktif?.ctx.revert();
    const ilk = sayfa.id === sayfalar[0].id;
    main.innerHTML =
      (ilk ? '' : sayfaBasligi(sayfa, d, ctx)) +
      sayfa.bolumler
        .map((id) => {
          const b = bolumler[id];
          if (!b) return '';
          const html = b.render(d, ctx, sorgu);
          return html ? `<div class="k-blok" data-bolum="${id}">${html}</div>` : '';
        })
        .join('');
    main.dataset.sayfa = sayfa.id;
    document.body.classList.toggle('k-ana', ilk);
    document.querySelectorAll('.k-nav a[data-rota], .k-menu a[data-rota]').forEach((a) => {
      if (a.dataset.rota === sayfa.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = ilk ? `${d.isletme.ad} | ${tema.baslikEki || d.isletme.sektor}` : `${sayfa.baslik} | ${d.isletme.ad}`;
    const gctx = gsap.context(() => {
      main.querySelectorAll('.k-blok').forEach((el) => bolumler[el.dataset.bolum]?.mount?.(el, d, ctx, sorgu));
      if (!reducedMotion) hareketler(main, ilk);
    }, main);
    aktif = { ctx: gctx, sayfa };
    ScrollTrigger.refresh();
  }

  function sayfaGoster(r, gecisli) {
    if (gecisVar) return;
    // Önce başa dön, sonra kur: yeni sayfanın "once" tetikleyicileri eski kaydırma konumunda
    // oluşturulursa hemen kendini siler ve ScrollTrigger.refresh döngüsü çöker.
    const basaDon = () => (lenis ? lenis.scrollTo(0, { immediate: true, force: true }) : scrollTo(0, 0));
    if (!gecisli || reducedMotion) {
      basaDon();
      sayfaIciniKur(r);
      return;
    }
    gecisVar = true;
    const perde = document.querySelector('.k-gecis');
    const yatay = document.documentElement.dataset.gecis === 'yan';
    const eksen = yatay ? 'scaleX' : 'scaleY';
    gsap
      .timeline({ onComplete: () => (gecisVar = false) })
      .set(perde, { visibility: 'visible', transformOrigin: yatay ? 'left center' : 'center bottom' })
      .fromTo(perde, { [eksen]: 0 }, { [eksen]: 1, duration: 0.42, ease: 'power3.in' })
      .add(() => {
        basaDon();
        sayfaIciniKur(r);
        gsap.set(perde, { transformOrigin: yatay ? 'right center' : 'center top' });
      })
      .to(perde, { [eksen]: 0, duration: 0.5, ease: 'power3.out' })
      .set(perde, { visibility: 'hidden' });
  }

  // Başlık çubuğu: aşağı inince küçülür.
  const ust = document.querySelector('.k-ust');
  const kucult = (y) => ust.classList.toggle('is-kucuk', y > 40);
  lenis ? lenis.on('scroll', ({ scroll }) => kucult(scroll)) : addEventListener('scroll', () => kucult(scrollY), { passive: true });
  // Telefon sözleşmesi (docs/phone-contract.md): telefonda başlık aşağı kaydırınca saklanır, yukarı
  // kaydırınca döner; --header-h çapa hedeflerini ve varyantların yapışkan öğelerini hizalar.
  // Masaüstünde başlık sabit kalır (çekirdek --header-h'yi kendisi ölçer).
  const telefon = matchMedia('(max-width: 899px)');
  let gizleDur = null;
  const basligiAyarla = () => {
    gizleDur?.();
    gizleDur = telefon.matches ? autoHideHeader(ust, { offset: 140 }) : null;
    if (!gizleDur) document.documentElement.style.setProperty('--header-h', `${ust.offsetHeight}px`);
  };
  basligiAyarla();
  telefon.addEventListener?.('change', basligiAyarla);

  // Üst menü sığıyor mu? (iPad yatay 1180/1024 px ve uzun etiketli varyantlar.) Bağlantılar tek satırda kalır;
  // sığmazsa önce telefon numarası simgeye iner, yine sığmazsa burger'a dönülür. Ölçüm, öğeler doğal
  // genişliklerindeyken (html.k-olc: flex: none) yapılır, aynı karede sınıf kalkar; titreme olmaz.
  const navSigdir = () => {
    const kok = document.documentElement;
    const ic = ust.querySelector('.k-ust__ic');
    kok.classList.remove('k-dar', 'k-dar1');
    if (matchMedia('(max-width: 1080px)').matches || !ic) return; // CSS zaten burger'da
    const tasar = () => {
      kok.classList.add('k-olc');
      const t = ic.scrollWidth > ic.clientWidth + 1;
      kok.classList.remove('k-olc');
      return t;
    };
    if (tasar()) {
      kok.classList.add('k-dar1');
      if (tasar()) kok.classList.replace('k-dar1', 'k-dar');
    }
    if (!kok.classList.contains('k-dar')) menuKapat(ctx, false); // burger görünmüyorsa açık menü kalmasın
  };
  let navKare = 0;
  const navYenile = () => { cancelAnimationFrame(navKare); navKare = requestAnimationFrame(navSigdir); };
  navSigdir();
  document.fonts?.ready.then(navYenile);
  addEventListener('resize', navYenile);
  document.querySelector('.k-metin-dugme')?.addEventListener('click', navYenile);

  sayfaGoster(rotaCoz(), false);
  if (!reducedMotion) acilis();
  onHazir?.(ctx);
  return ctx;
}

// --- İskelet: üst menü, mobil menü, footer, geçiş perdesi, KVKK penceresi -----------------

function iskeletKur(ctx) {
  const { d, tema, sayfalar } = ctx;
  const logo = tema.logo
    ? `<img class="k-logo__img" src="${tema.logo}" alt="${esc(d.isletme.ad)}">${tema.logoAcik ? `<img class="k-logo__img k-logo__img--acik" src="${tema.logoAcik}" alt="">` : ''}`
    : `<span class="k-logo__ad">${esc(d.isletme.ad)}</span>${tema.logoAlt ? `<span class="k-logo__alt">${tema.logoAlt}</span>` : ''}`;
  const menuLinkleri = sayfalar
    .map((s) => `<li><a href="#/${s.id}" data-rota="${s.id}">${s.menu || s.baslik}</a></li>`)
    .join('');
  const tel = `tel:${(d.iletisim.telefon || '').replace(/[^\d+]/g, '')}`;
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<a class="k-atla" href="#sayfa" onclick="event.preventDefault();document.getElementById('sayfa').focus()">İçeriğe geç</a>
    <header class="k-ust">
      <div class="k-ust__ic">
        <a class="k-logo" href="#/${sayfalar[0].id}" data-rota="${sayfalar[0].id}" aria-label="${esc(d.isletme.ad)} ana sayfa">${logo}</a>
        <nav class="k-nav" aria-label="Ana menü"><ul>${menuLinkleri}</ul></nav>
        <div class="k-ust__sag">
          ${tema.metinBoyutu ? `<button type="button" class="k-metin-dugme" aria-pressed="false" aria-label="Yazı boyutunu büyüt">A<span>A</span></button>` : ''}
          <a class="k-ust__tel" href="${tel}">${icons.phone}<span>${esc(d.iletisim.telefon)}</span></a>
          <a class="k-btn k-btn--kucuk k-ust__teklif" href="#/iletisim" data-rota="iletisim">${tema.teklifEtiketi || 'İletişim'}</a>
          <button type="button" class="k-burger" aria-expanded="false" aria-controls="k-menu" aria-label="Menüyü aç"><span></span><span></span></button>
        </div>
      </div>
    </header>
    <div class="k-menu" id="k-menu" hidden data-lenis-prevent>
      <nav aria-label="Mobil menü"><ul>${menuLinkleri}</ul></nav>
      <div class="k-menu__alt">
        <a href="${tel}" class="k-menu__tel">${esc(d.iletisim.telefon)}</a>
        <p>${esc(d.iletisim.adres)}</p>
      </div>
    </div>`
  );
  document.body.insertAdjacentHTML(
    'beforeend',
    `<footer class="k-alt">${altBilgi(ctx)}</footer>
    <div class="k-gecis" aria-hidden="true"></div>
    <dialog class="k-dialog" id="k-kvkk" aria-labelledby="k-kvkk-baslik">
      <div class="k-dialog__ic" data-lenis-prevent>
        <h2 id="k-kvkk-baslik">Kişisel verilerin korunması</h2>
        ${kvkkMetni(d, tema)}
        <button type="button" class="k-btn" data-kapat>Kapat</button>
      </div>
    </dialog>`
  );

  const burger = document.querySelector('.k-burger');
  burger.addEventListener('click', (e) => {
    if (burger.getAttribute('aria-expanded') !== 'true') return menuAc(ctx);
    // Parmakla kapatınca odak başlıkta kalmasın: autoHideHeader odak başlıktayken başlığı hiç saklamaz.
    const klavye = e.detail === 0;
    menuKapat(ctx, klavye);
    if (!klavye) burger.blur();
  });
  addEventListener('keydown', (e) => e.key === 'Escape' && menuKapat(ctx, true));

  const dlg = document.getElementById('k-kvkk');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-kvkk]')) {
      e.preventDefault();
      dlg.showModal();
    }
    if (e.target === dlg || e.target.closest('[data-kapat]')) dlg.close();
  });

  const md = document.querySelector('.k-metin-dugme');
  if (md) {
    const guncelle = () => md.setAttribute('aria-pressed', document.documentElement.classList.contains('k-buyuk'));
    guncelle();
    md.addEventListener('click', () => {
      const b = document.documentElement.classList.toggle('k-buyuk');
      depo.koy('k-metin', b ? 'buyuk' : 'normal');
      guncelle();
      ScrollTrigger.refresh();
    });
  }
}

function menuAc(ctx) {
  const m = document.querySelector('.k-menu');
  const b = document.querySelector('.k-burger');
  m.hidden = false;
  b.setAttribute('aria-expanded', 'true');
  b.setAttribute('aria-label', 'Menüyü kapat');
  document.documentElement.classList.add('k-menu-acik');
  // Menü açıkken arka sayfa kaymaz ve odak/dokunma almaz (başlık ve alt çubuk erişilebilir kalır).
  ctx.lenis?.stop();
  arkaPlan(true);
  requestAnimationFrame(() => m.querySelector('a')?.focus({ preventScroll: true }));
  if (!reducedMotion) {
    gsap.fromTo(m, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.45, ease: 'power3.out' });
    gsap.fromTo(m.querySelectorAll('li'), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.5, delay: 0.12, ease: 'power3.out' });
  }
}

// odakGeri: klavyeyle kapatınca odak menü düğmesine döner (erişilebilirlik); dokunarak kapatınca ya da
// menüden bir sayfaya gidince odak başlıkta bırakılmaz, yoksa telefonda başlık bir daha saklanmaz.
function menuKapat(ctx, odakGeri = true) {
  const m = document.querySelector('.k-menu');
  if (!m || m.hidden) return;
  const b = document.querySelector('.k-burger');
  b.setAttribute('aria-expanded', 'false');
  b.setAttribute('aria-label', 'Menüyü aç');
  document.documentElement.classList.remove('k-menu-acik');
  ctx.lenis?.start();
  arkaPlan(false);
  m.hidden = true;
  if (m.contains(document.activeElement)) {
    if (odakGeri) b.focus({ preventScroll: true });
    else document.activeElement.blur();
  }
}

function arkaPlan(kilit) {
  for (const el of [document.getElementById('sayfa'), document.querySelector('.k-alt')]) {
    if (el) el.inert = kilit;
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function altBilgi({ d, tema, sayfalar }) {
  const yil = new Date().getFullYear();
  const hiz = (d.hizmetler || []).slice(0, 5).map((h) => `<li><a href="#/hizmetler" data-rota="hizmetler">${esc(h.baslik)}</a></li>`).join('');
  return `
    <div class="k-alt__ic">
      <div class="k-alt__kurum">
        <p class="k-alt__ad">${esc(d.isletme.unvan || d.isletme.ad)}</p>
        ${tanimMetni(d) ? `<p>${esc(tanimMetni(d))}</p>` : ''}
        ${d.isletme.kurulus ? `<p class="k-alt__kurulus">${yilEki(d.isletme.kurulus)} beri</p>` : ''}
      </div>
      <nav aria-label="Alt menü"><p class="k-alt__baslik">Sayfalar</p><ul>${sayfalar.map((s) => `<li><a href="#/${s.id}" data-rota="${s.id}">${s.menu || s.baslik}</a></li>`).join('')}</ul></nav>
      ${hiz ? `<div><p class="k-alt__baslik">${esc(duz(tema.hizmetEtiketi, 'Hizmetler'))}</p><ul>${hiz}</ul></div>` : ''}
      <div><p class="k-alt__baslik">İletişim</p>
        <ul>
          <li><a href="tel:${(d.iletisim.telefon || '').replace(/[^\d+]/g, '')}">${esc(d.iletisim.telefon)}</a></li>
          ${d.iletisim.eposta ? `<li><a href="mailto:${esc(d.iletisim.eposta)}">${esc(d.iletisim.eposta)}</a></li>` : ''}
          <li>${esc(d.iletisim.adres)}</li>
        </ul>
      </div>
    </div>
    <div class="k-alt__yasal">
      <p>© ${yil} ${esc(d.isletme.unvan || d.isletme.ad)}. Tüm hakları saklıdır.</p>
      <p><a href="#" data-kvkk>KVKK aydınlatma metni</a> <a href="#" data-kvkk>Çerez politikası</a></p>
      ${tema.altNot ? `<p class="k-alt__not">${tema.altNot}</p>` : ''}
    </div>`;
}

// Öznesiz bilgi cümleleri; veri sorumlusu en altta adıyla ve adresiyle yazılır.
function kvkkMetni(d, tema = {}) {
  const k = d.kurumsal?.kvkk;
  if (k?.paragraflar) return k.paragraflar.map((p) => `<p>${esc(p)}</p>`).join('');
  const ad = esc(d.isletme.unvan || d.isletme.ad);
  const kayit = tema.metinBoyutu ? 'çerez notunun kapatılıp kapatılmadığı ve seçilen yazı boyutu' : 'çerez notunun kapatılıp kapatılmadığı';
  return `
    <p>İletişim formundan ya da WhatsApp'tan gönderilen ad, telefon, e-posta ve mesaj bilgileri yalnız talebe cevap vermek için kullanılır.</p>
    <p>Bu bilgiler 6698 sayılı Kişisel Verilerin Korunması Kanunu'na uygun olarak saklanır, yasal bir zorunluluk olmadıkça başkalarıyla paylaşılmaz. Kanunun 11. maddesindeki haklar için ${esc(d.iletisim.telefon)} numarasından ya da işletmenin adresinden başvurulabilir.</p>
    <p>Sitede reklam ya da takip çerezi yoktur. Tarayıcıda yalnız ${kayit} saklanır. Harita açılınca Google Haritalar kendi çerezlerini kullanabilir.</p>
    <p class="k-soluk">Veri sorumlusu: ${ad}, ${esc(d.iletisim.adres)}</p>`;
}

// Çerez notu. Telefon sözleşmesi: alt çubukla üst üste binmez. Telefonda footer'ın başında akışta
// duran ince bir şerittir (sabit katman değil); masaüstünde (alt çubuk yok) sağ altta küçük bir kart.
// "Tamam" tercihi localStorage'da kalır; vitrin modunda hiç gösterilmez.
function cerezBandi() {
  if (depo.al('k-cerez') === 'tamam' || vitrinModu()) return;
  const b = document.createElement('div');
  b.className = 'k-cerez';
  b.setAttribute('role', 'region');
  b.setAttribute('aria-label', 'Çerez bildirimi');
  b.innerHTML = `<p>Sitede takip çerezi yoktur. Harita açılınca Google kendi çerezlerini kullanabilir. <a href="#" data-kvkk>Ayrıntılar</a></p><button type="button" class="k-btn k-btn--kucuk">Tamam</button>`;
  b.querySelector('button').addEventListener('click', () => {
    depo.koy('k-cerez', 'tamam');
    b.remove();
    ScrollTrigger.refresh();
  });
  const alt = document.querySelector('.k-alt');
  alt ? alt.prepend(b) : document.body.append(b);
}

// --- Hareket -----------------------------------------------------------------------------

function acilis() {
  // İç kutu hareket eder: .k-ust'ün transform'u autoHideHeader'a kalır.
  const ic = document.querySelector('.k-ust__ic');
  gsap.from(ic, { yPercent: -100, autoAlpha: 0, duration: 0.7, ease: 'power3.out', delay: 0.1, clearProps: 'transform,opacity,visibility' });
}

// Tetikleyiciler `once: true` değil `toggleActions: 'play none none none'`: sayfa zaten tetikleyicinin
// ötesine kaydırılmışken (fonts.ready'den önce kaydırma, rota değişimi) oluşan `once` tetikleyicisi
// refresh() içinde kendini siler ve sonraki tetikleyici "reading 'end'" hatası verir. Görünüm aynı: bir kez oynar,
// geri sarılmaz; tetikleyiciler sayfa değişince gsap.context ile temizlenir.
function hareketler(kok, ilk) {
  // Başlıklar: satır maskesiyle yükselir. İ noktası kesilmesin diye maskeye üst pay (base.css).
  kok.querySelectorAll('[data-bol]').forEach((el) => {
    const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'k-satir' });
    const hero = el.closest('.k-hero, .k-sb');
    gsap.from(s.lines, {
      yPercent: 105,
      duration: hero ? 1 : 0.8,
      stagger: 0.08,
      ease: 'power4.out',
      delay: hero ? (ilk ? 0.35 : 0.15) : 0,
      scrollTrigger: hero ? undefined : { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });
  // Görseller: perde gibi açılır, içindeki fotoğraf hafif küçülerek oturur.
  kok.querySelectorAll('[data-perde]').forEach((el) => {
    const img = el.querySelector('img');
    const hero = el.closest('.k-hero, .k-sb');
    const tl = gsap.timeline(hero ? { delay: 0.2 } : { scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } });
    tl.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut' });
    if (img) tl.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0);
  });
  // Ayırıcı çizgiler soldan çizilir.
  kok.querySelectorAll('[data-cizgi]').forEach((el) =>
    gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 1, ease: 'power3.inOut', scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' } })
  );
  // Sayaçlar.
  kok.querySelectorAll('[data-sayac]').forEach((el) => {
    const hedef = Number(el.dataset.sayac);
    const o = { v: 0 };
    gsap.to(o, {
      v: hedef,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
      onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('tr-TR')),
    });
  });
  // Satır listeleri: sırayla, küçük bir kayma ile (kartlar değil, liste satırları).
  kok.querySelectorAll('[data-sira]').forEach((liste) =>
    gsap.from(liste.children, { y: 24, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: liste, start: 'top 85%', toggleActions: 'play none none none' } })
  );
  // Hero görseli kaydırdıkça yavaşça geri çekilir.
  kok.querySelectorAll('[data-paralaks]').forEach((el) =>
    gsap.to(el, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true } })
  );
}
