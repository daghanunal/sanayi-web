// Vitrin: ustanın QR ile kendi telefonunda açtığı sayfa.
// Akış: sektör seç (ya da ara) → o sektörün tasarımlarını kaydırarak gez → beğen / karşılaştır
//       → "Bunu istiyorum" → adı ve telefonuyla WhatsApp'tan gönder.
// Durum URL'de: ?ad=&tel=&sektor=&sec=  (kişisel QR ad/tel/sektörü doldurur)
//               &grup=ozel (oto sanayi dışı işler)  &aile=<grup> (aile süzgeci)  &kiyas=1 (beğenilenler)
// Her şey katalogdan gelir: yeni tasarım eklenince (ve HAZIR_OLMAYAN'dan çıkınca) kendiliğinden görünür.
import {
  hazirPresetler, SEKTORLER, OZEL_SEKTORLER, GRUP_SIRASI, SATIS_WHATSAPP, presetById, toWhatsapp, zayifCihaz,
} from '../shared/katalog.js';
import { AILE, aileAdi, samanlik, eslesir } from './ortak.js';

const app = document.getElementById('app');
const tepsi = document.getElementById('tepsi');
const BASE = import.meta.env.BASE_URL;
const zayif = zayifCihaz();
const HAZIR = hazirPresetler();

const ozelMi = (id) => OZEL_SEKTORLER.some((k) => k.id === id);
const sektorBul = (id) => SEKTORLER.find((k) => k.id === id) || OZEL_SEKTORLER.find((k) => k.id === id);

// Normal cihazda sinematik önce, zayıf cihazda en hafifi önce. Bilinmeyen aileler sona.
const SIRA = [...(zayif ? [...GRUP_SIRASI].reverse() : GRUP_SIRASI), 'ozel'];
const sira = (g) => (SIRA.includes(g) ? SIRA.indexOf(g) : SIRA.length);
const tasarimlari = (sektor) => HAZIR.filter((p) => p.sektor === sektor).sort((a, b) => sira(a.grup) - sira(b.grup));

const tanim = (p) => AILE[p.grup]?.[1] || p.icin;

// --- Yardımcılar -------------------------------------------------------------------------------
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const state = () => {
  const p = new URLSearchParams(location.search);
  const g = (k) => p.get(k)?.trim() || '';
  return { ad: g('ad'), tel: g('tel'), sektor: g('sektor'), sec: g('sec'), grup: g('grup'), aile: g('aile'), kiyas: g('kiyas') };
};

function url(changes) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(changes)) v ? p.set(k, v) : p.delete(k);
  return `?${p}`;
}
function go(changes, { replace = false } = {}) {
  history[replace ? 'replaceState' : 'pushState'](null, '', url(changes));
  render();
  if (!replace) scrollTo({ top: 0 });
}

function presetUrl(id, s) {
  const p = new URLSearchParams({ vitrin: '1' });
  if (s.ad) p.set('ad', s.ad);
  if (s.tel) {
    p.set('tel', s.tel);
    p.set('wa', toWhatsapp(s.tel));
  }
  p.set('sektor', presetById(id).sektor);
  return `${BASE}presets/${id}/?${p}`;
}
const shot = (id) => `${BASE}onizleme/${id}.jpg`;

// Beğenilenler: yalnız bu telefonda (localStorage), olmazsa oturum boyunca bellekte.
const BEGENI = 'vitrin-begeni';
let begeniler = (() => {
  try { return JSON.parse(localStorage.getItem(BEGENI)) || []; } catch { return []; }
})().filter((id) => HAZIR.some((p) => p.id === id));
function begen(id) {
  begeniler = begeniler.includes(id) ? begeniler.filter((x) => x !== id) : [...begeniler, id].slice(-6);
  try { localStorage.setItem(BEGENI, JSON.stringify(begeniler)); } catch {}
}

const IKON = {
  ara: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  kalp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.5 1.1 4.6 2.7C13.1 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4Z"/></svg>',
  ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  geri: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  oynat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z"/></svg>',
};

// --- Ekranlar ----------------------------------------------------------------------------------

function sektorEkrani(s) {
  const ozel = s.grup === 'ozel';
  const liste = ozel ? OZEL_SEKTORLER : SEKTORLER;
  const satirlar = liste.map((k) => {
    const n = tasarimlari(k.id).length;
    return `
      <li data-ara="${esc(samanlik(k).join(' '))}" ${n ? '' : 'data-bos hidden'}>
        <button type="button" class="sektor${n ? '' : ' sektor--bos'}" data-sektor="${n ? k.id : 'hepsi'}">
          <span class="sektor__ad">${esc(k.ad)}</span>
          <span class="sektor__ornek">${n ? esc(k.ornek || [...new Set(tasarimlari(k.id).map((p) => p.ad))].join(', ')) : 'Tasarımları hazırlanıyor. Şimdilik benzerlerine bakın.'}</span>
          <span class="sektor__sayi">${n ? `${n} tasarım` : 'Benzerleri'}${IKON.ok}</span>
        </button>
      </li>`;
  });
  return `
    <header class="v__head">
      <h1>${s.ad ? `${esc(s.ad)},<br>siteniz hazır.` : ozel ? 'İşletmenizin sitesi hazır.' : 'Dükkanınızın sitesi hazır.'}</h1>
      <p>Ne iş yapıyorsunuz? Seçin, size uygun tasarımları gösterelim.</p>
    </header>
    <label class="ara">
      ${IKON.ara}
      <span class="gizli">Sektör ara</span>
      <input type="search" id="ara" placeholder="${ozel ? 'Ara: eczane, diş, restoran' : 'Ara: lastik, klima, boya'}"
        autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
    </label>
    <ul class="sektorler" id="sektorler">${satirlar.join('')}</ul>
    <div class="bulunamadi" id="bulunamadi" hidden>
      <p>Bu adla bir sektör bulamadık.</p>
      <button type="button" class="btn btn--ikincil" data-sektor="hepsi">Bütün tasarımlara bakın</button>
    </div>
    <div class="v__alt">
      <button type="button" class="v__link" data-sektor="hepsi">Bütün tasarımları gör</button>
      <button type="button" class="v__link" data-grup="${ozel ? '' : 'ozel'}">${
        ozel ? 'Oto sanayi işleri' : 'Oto sanayi dışı işler (eczane, klinik, restoran…)'
      }</button>
    </div>`;
}

function kart(p, s, { kucuk = false, sektorAdi = false } = {}) {
  const fav = begeniler.includes(p.id);
  return `
    <li class="kart${kucuk ? ' kart--kucuk' : ''}" style="--c:${esc(p.renk)}" data-id="${esc(p.id)}">
      <div class="kart__medya">
        <a class="kart__gor" href="${esc(presetUrl(p.id, s))}" aria-label="${esc(p.ad)}: tam ekran gör">
          <img src="${shot(p.id)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">
          <span class="kart__yedek" aria-hidden="true">${esc(p.ad)}</span>
        </a>
        <span class="kart__aile">${esc(aileAdi(p.grup))}</span>
        <button type="button" class="kalp" data-fav="${esc(p.id)}" aria-pressed="${fav}">
          ${IKON.kalp}<span>${fav ? 'Beğendim' : 'Beğen'}</span>
        </button>
        ${klipIzni ? '' : `<button type="button" class="kart__klip" data-klip>${IKON.oynat}<span>Önizle</span></button>`}
      </div>
      <div class="kart__alt">
        <h3>${esc(p.ad)}${sektorAdi ? ` <small>${esc(sektorBul(p.sektor)?.ad || '')}</small>` : ''}</h3>
        <p>${esc(tanim(p))}</p>
        <div class="kart__butonlar">
          <a class="btn btn--ikincil" href="${esc(presetUrl(p.id, s))}">Tam ekran gör</a>
          <button type="button" class="btn" data-sec="${esc(p.id)}">Bunu istiyorum</button>
        </div>
      </div>
    </li>`;
}

// Aile süzgeci: yalnız listede olan aileler, sayılarıyla.
function aileler(liste, s) {
  const var_ = [...new Set(liste.map((p) => p.grup))].sort((a, b) => sira(a) - sira(b));
  if (var_.length < 2) return '';
  const cip = (id, ad, n) =>
    `<button type="button" class="cip" data-aile="${id}" aria-pressed="${(s.aile || '') === id}">${ad} <span>${n}</span></button>`;
  return `<div class="cipler" role="group" aria-label="Tasarım türü">${cip('', 'Tümü', liste.length)}${var_
    .map((g) => cip(g, aileAdi(g), liste.filter((p) => p.grup === g).length)).join('')}</div>`;
}

function serit(liste, s, secenek = {}) {
  return `
    <div class="serit" data-serit>
      <ul class="kartlar${secenek.kucuk ? ' kartlar--kucuk' : ''}">${liste.map((p) => kart(p, s, secenek)).join('')}</ul>
      ${liste.length > 1 ? `
      <div class="serit__nav">
        <button type="button" class="serit__ok" data-kay="-1" aria-label="Önceki tasarım">${IKON.geri}</button>
        <span class="serit__sayac" aria-live="polite"><b>1</b> / ${liste.length}</span>
        <button type="button" class="serit__ok" data-kay="1" aria-label="Sonraki tasarım">${IKON.ok}</button>
      </div>` : ''}
    </div>`;
}

function tasarimEkrani(s) {
  let sektor = sektorBul(s.sektor);
  // Kişisel QR tasarımı henüz olmayan bir sektörü açtıysa: bütün tasarımlar, bir notla.
  const eksik = sektor && !tasarimlari(sektor.id).length ? sektor : null;
  if (eksik) sektor = null;
  const ozel = sektor || eksik ? ozelMi((sektor || eksik).id) : s.grup === 'ozel';
  const tum = sektor ? tasarimlari(sektor.id) : HAZIR.filter((p) => ozelMi(p.sektor) === ozel);
  const liste = tum.filter((p) => !s.aile || p.grup === s.aile);
  const geri = `<button type="button" class="v__geri" data-sektor="" data-grup="${ozel ? 'ozel' : ''}">${IKON.geri}Sektörü değiştir</button>`;
  const adNotu = s.ad ? ` Tam ekranda <strong>${esc(s.ad)}</strong> adıyla açılır.` : '';

  if (!sektor) {
    // Bütün tasarımlar: sektör sektör, her biri yana kayan şerit.
    const gruplar = (ozel ? OZEL_SEKTORLER : SEKTORLER)
      .map((k) => [k, liste.filter((p) => p.sektor === k.id).sort((a, b) => sira(a.grup) - sira(b.grup))])
      .filter(([, l]) => l.length);
    return `
      <header class="v__head v__head--kucuk">${geri}
        <h1>Bütün tasarımlar</h1>
        <p>${tum.length} tasarım.<span class="mobil"> Her sırayı yana kaydırın.</span>${adNotu}</p>
        ${eksik ? `<p class="v__not">${esc(eksik.ad)} için tasarımlar hazırlanıyor. Beğendiğinizi seçin, sizin işinize göre uyarlarız.</p>` : ''}
      </header>
      ${aileler(tum, s)}
      ${gruplar.map(([k, l]) => `<section class="blok"><h2>${esc(k.ad)}</h2>${serit(l, s, { kucuk: true })}</section>`).join('')}`;
  }

  return `
    <header class="v__head v__head--kucuk">${geri}
      <h1>${esc(sektor.ad)}</h1>
      <p>${tum.length} tasarım. <span class="mobil">Yana kaydırın, </span>beğendiğinizi seçin.${adNotu}</p>
      ${zayif && tum.length > 1 ? '<p class="v__not">Telefonunuzda en akıcı çalışan tasarımı başa koyduk.</p>' : ''}
    </header>
    ${aileler(tum, s)}
    ${liste.length ? serit(liste, s) : '<p class="v__bos">Bu türde tasarım yok.</p>'}
    <p class="v__ipucu">Tam ekranda sayfayı aşağı kaydırın, asıl gösteri orada.</p>
    <div class="v__alt">
      <button type="button" class="v__link" data-sektor="hepsi">Başka sektörlerin tasarımlarına da bakın</button>
    </div>`;
}

function kiyasEkrani(s) {
  const liste = begeniler.map(presetById).filter(Boolean);
  return `
    <header class="v__head v__head--kucuk">
      <button type="button" class="v__geri" data-kiyas="">${IKON.geri}Tasarımlara dön</button>
      <h1>Beğendikleriniz</h1>
      <p>${liste.length ? 'Yan yana bakın, birini seçin.' : 'Henüz bir tasarım beğenmediniz. Kalbe dokunarak ekleyin.'}</p>
    </header>
    ${liste.length ? `<ul class="kiyas">${liste.map((p) => kart(p, s, { kucuk: true, sektorAdi: true })).join('')}</ul>` : ''}`;
}

function secimEkrani(s) {
  const p = presetById(s.sec);
  return `
    <header class="v__head v__head--kucuk">
      <button type="button" class="v__geri" data-sec="">${IKON.geri}Tasarımlara dön</button>
      <h1>Seçiminiz: ${esc(p.ad)}</h1>
      <p>${esc(sektorBul(p.sektor)?.ad || '')} · ${esc(aileAdi(p.grup))}</p>
    </header>
    <div class="secim">
      <img class="secim__gorsel" src="${shot(p.id)}" alt="${esc(p.ad)} tasarımı" onerror="this.hidden=true">
      <form class="form" id="form" autocomplete="on">
        <label>Dükkanınızın adı
          <input name="ad" value="${esc(s.ad)}" placeholder="Örn. Yıldız Oto Elektrik" autocomplete="organization" required>
        </label>
        <label>Telefonunuz
          <input name="tel" type="tel" inputmode="tel" value="${esc(s.tel)}" placeholder="0532 123 45 67" autocomplete="tel" required>
        </label>
        <button type="submit" class="btn btn--wa">Seçimimi WhatsApp'tan gönder</button>
        <button type="button" class="btn btn--ikincil" data-onizle>Önce kendi adımla göster</button>
        <p class="form__not">Fiyat ve detaylar için sizi arayacağız. Seçim yapmak sizi hiçbir şeye bağlamaz.</p>
      </form>
    </div>`;
}

function tesekkurEkrani(s) {
  const p = presetById(s.sec);
  return `
    <header class="v__head">
      <h1>Teşekkürler${s.ad ? `, ${esc(s.ad)}` : ''}.</h1>
      <p>${esc(p.ad)} tasarımını seçtiniz. WhatsApp'ta mesajı gönderdiyseniz en kısa sürede sizi arayacağız.</p>
    </header>
    <div class="tesekkur">
      <a class="btn" href="${esc(presetUrl(p.id, s))}">Sitemi bir daha göster</a>
      <button type="button" class="v__link" data-sec="">Başka bir tasarıma bak</button>
    </div>`;
}

// --- Önizleme klipleri: yalnız iyi bağlantıda ve yalnız ekrandaki kartta oynar --------------------
const klipIzni = (() => {
  const c = navigator.connection;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (matchMedia('(prefers-reduced-data: reduce)').matches) return false;
  if (c?.saveData) return false;
  if (c && /2g|3g/.test(c.effectiveType || '')) return false;
  if (c?.downlink && c.downlink < 1) return false; // Mbit/s tahmini
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  return true;
})();

function oynat(gor) {
  if (gor.dataset.klip === 'yok') return;
  let v = gor.querySelector('video');
  if (!v) {
    const id = gor.closest('[data-id]').dataset.id;
    v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto' });
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.innerHTML = `<source src="${BASE}onizleme/${id}.webm" type="video/webm"><source src="${BASE}onizleme/${id}.mp4" type="video/mp4">`;
    v.lastElementChild.addEventListener('error', () => {
      gor.dataset.klip = 'yok';
      v.remove();
    });
    v.addEventListener('playing', () => gor.classList.add('oynuyor'));
    gor.append(v);
  }
  v.play().catch(() => {});
}
function durdur(gor) {
  gor.querySelector('video')?.pause();
}
const izleyici = 'IntersectionObserver' in window
  ? new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const gor = e.target;
          if (!klipIzni && !gor.dataset.izin) continue;
          e.isIntersecting && e.intersectionRatio >= 0.6 ? oynat(gor) : durdur(gor);
        }
      },
      { threshold: [0, 0.6] }
    )
  : null;

// Şerit sayacı: hangi kart ortada.
function seritBagla(el) {
  const ul = el.querySelector('.kartlar');
  const sayac = el.querySelector('.serit__sayac b');
  if (!sayac) return;
  const adim = () => ul.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(ul).columnGap || 0);
  ul.addEventListener('scroll', () => {
    const i = Math.round(ul.scrollLeft / adim());
    sayac.textContent = Math.min(ul.children.length, i + 1);
  }, { passive: true });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-kay]');
    if (b) ul.scrollBy({ left: adim() * Number(b.dataset.kay), behavior: 'smooth' });
  });
}

function aramaBagla() {
  const input = document.getElementById('ara');
  if (!input) return;
  const satirlar = [...document.querySelectorAll('#sektorler > li')].map((li) => [li, li.dataset.ara.split(' ')]);
  const bos = document.getElementById('bulunamadi');
  const suz = () => {
    const q = input.value;
    let n = 0;
    for (const [li, kelimeler] of satirlar) {
      const goster = q.trim() ? eslesir(kelimeler, q) : !li.hasAttribute('data-bos');
      li.hidden = !goster;
      if (goster) n++;
    }
    bos.hidden = n > 0;
  };
  input.addEventListener('input', suz);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const acik = satirlar.filter(([li]) => !li.hidden);
    if (acik.length === 1) acik[0][0].querySelector('button').click();
    else input.blur();
  });
}

// Alttaki beğeni tepsisi.
function tepsiCiz(s) {
  const n = begeniler.length;
  const goster = n > 0 && !s.sec && !s.kiyas;
  tepsi.hidden = !goster;
  document.body.classList.toggle('tepsili', goster);
  if (goster)
    tepsi.innerHTML = `
      <span class="tepsi__sayi">${IKON.kalp}${n} beğeni</span>
      <button type="button" class="btn" data-kiyas="1">${n > 1 ? 'Karşılaştır' : 'Beğendiklerim'}</button>`;
}

let gonderildi = false;

function render() {
  const s = state();
  if (s.sec && !presetById(s.sec)) s.sec = '';
  if (s.sektor && s.sektor !== 'hepsi' && !sektorBul(s.sektor)) s.sektor = '';
  izleyici?.disconnect();
  app.innerHTML = s.sec
    ? gonderildi ? tesekkurEkrani(s) : secimEkrani(s)
    : s.kiyas ? kiyasEkrani(s)
    : s.sektor ? tasarimEkrani(s) : sektorEkrani(s);
  document.title = s.ad ? `${s.ad}: siteniz hazır` : 'Dükkanınızın sitesi hazır';
  app.querySelectorAll('.kart__gor').forEach((g) => izleyici?.observe(g));
  app.querySelectorAll('[data-serit]').forEach(seritBagla);
  aramaBagla();
  tepsiCiz(s);
}

// Formdaki ad/telefonu URL'ye yaz (geri dönüldüğünde ve önizlemede kaybolmasın).
function formuKaydet() {
  const f = new FormData(document.getElementById('form'));
  const v = { ad: f.get('ad').trim(), tel: f.get('tel').trim() };
  history.replaceState(null, '', url(v));
  return { ...state(), ...v };
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-sektor], [data-sec], [data-grup], [data-onizle], [data-fav], [data-aile], [data-kiyas], [data-klip]');
  if (!t) return;
  if (t.hasAttribute('data-fav')) {
    begen(t.dataset.fav);
    const on = begeniler.includes(t.dataset.fav);
    const s = state();
    if (s.kiyas && !on) return render();
    t.setAttribute('aria-pressed', on);
    t.querySelector('span').textContent = on ? 'Beğendim' : 'Beğen';
    return tepsiCiz(s);
  }
  if (t.hasAttribute('data-klip')) {
    const gor = t.parentElement.querySelector('.kart__gor');
    gor.dataset.izin = '1';
    t.remove();
    return oynat(gor);
  }
  if (t.hasAttribute('data-aile')) return go({ aile: t.dataset.aile }, { replace: true });
  if (t.hasAttribute('data-kiyas')) return go({ kiyas: t.dataset.kiyas, sec: '' });
  if (t.hasAttribute('data-sektor')) {
    const ch = { sektor: t.dataset.sektor, sec: '', aile: '', kiyas: '' };
    if (t.hasAttribute('data-grup')) ch.grup = t.dataset.grup;
    return go(ch);
  }
  if (t.hasAttribute('data-grup')) return go({ grup: t.dataset.grup, sektor: '', aile: '' });
  if (t.hasAttribute('data-sec')) {
    gonderildi = false;
    return go({ sec: t.dataset.sec });
  }
  if (t.hasAttribute('data-onizle')) {
    const s = formuKaydet();
    location.href = presetUrl(s.sec, s);
  }
});

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const s = formuKaydet();
  const p = presetById(s.sec);
  const sektor = sektorBul(p.sektor);
  const mesaj = [
    `Merhaba, sitem için ${p.ad} tasarımını seçtim.`,
    `Dükkan: ${s.ad}`,
    `Sektör: ${sektor?.ad || p.sektor}`,
    `Telefon: ${s.tel}`,
  ].join('\n');
  window.open(`https://wa.me/${SATIS_WHATSAPP}?text=${encodeURIComponent(mesaj)}`, '_blank', 'noopener');
  gonderildi = true;
  render();
  scrollTo({ top: 0 });
});

addEventListener('popstate', () => {
  gonderildi = false;
  render();
});

render();
