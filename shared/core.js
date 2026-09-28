// Ortak çekirdek: veri yükleme, akıcı scroll, iletişim linkleri, açık/kapalı durumu,
// mobil aksiyon çubuğu ve SEO meta. Her preset bunu kullanır; görünümü preset belirler.
//
// Künye yardımcıları (içerik brief'i; presetler kendi kopyasını yazmaz):
//   saatBicim("08:30-19:00")  → "08.30–19.00"
//   saatListesi(d.saatler)    → [["Pazartesi–Cuma", "08.30–19.00"], …, ["Pazar", "Kapalı"]]
//   gunDurumu(d.saatler)      → { open, durum, saat, metin, kunye }
//                               metin: "Şu an açık · Bugün 08.30–19.00" / "Bugün kapalı · Yarın 08.30'da açılır"
//                               kunye: aynısı "Bugün " öneki olmadan (künyede "Bugün" etiketi zaten var)
//   kisaAdres(d.iletisim.adres) → sondaki "İlçe/İl" atılır: "Şaşmaz Oto Sanayi Sitesi, 4. Cadde No: 38"
//   acikGunSayisi(d.saatler)  → 6
//   yilEki(2001)              → "2001'den"   (`${yilEki(kurulus)} beri`)
//   saatEki("17:00")          → "'de"        (openStatus da bunu kullanır)
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Sahada demo gösterirken URL ile kişiselleştirme:
//   ?ad=Yıldız%20Oto&tel=05321234567&wa=905321234567&slogan=...&kurulus=1994
const OVERRIDES = {
  ad: (d, v) => (d.isletme.ad = v),
  slogan: (d, v) => (d.isletme.slogan = v),
  kurulus: (d, v) => (d.isletme.kurulus = Number(v) || d.isletme.kurulus),
  tel: (d, v) => (d.iletisim.telefon = v),
  wa: (d, v) => (d.iletisim.whatsapp = v.replace(/\D/g, '')),
  adres: (d, v) => (d.iletisim.adres = v),
};

// Veri dosyalarındaki kökten yollar (/img/..., /models/...) site alt klasörde yayınlanınca
// (GitHub Pages: /<repo>/) kırılmasın diye BASE_URL ile başlatılır.
const BASE = import.meta.env.BASE_URL;
export const asset = (p) =>
  typeof p === 'string' && /^\/(img|models|draco|onizleme)\//.test(p) ? BASE + p.slice(1) : p;
const withBase = (v) =>
  Array.isArray(v) ? v.map(withBase)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withBase(x)]))
  : asset(v);

export function loadData(base) {
  const data = withBase(structuredClone(base));
  const params = new URLSearchParams(location.search);
  for (const [key, apply] of Object.entries(OVERRIDES)) {
    const v = params.get(key);
    if (v) apply(data, v.trim());
  }
  return data;
}

export function initSmoothScroll(options = {}) {
  if (reducedMotion) return null;
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, ...options });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis; // scripts/shoot.mjs kullanır
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    let target = null;
    try { target = document.querySelector(a.getAttribute('href')); } catch { return; }
    if (target) {
      e.preventDefault();
      // Hedef başlık sabit üst çubuğun altında kalmasın: scroll-margin-top (varsayılanı --header-h).
      lenis.scrollTo(target, { offset: -topOffsetFor(target) });
    }
  });
  return lenis;
}

// URL parametrelerinden gelen metin innerHTML'e girmeden önce kaçırılmalı.
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- Linkler -------------------------------------------------------------

export const telHref = (d) => `tel:${d.iletisim.telefon.replace(/[^\d+]/g, '')}`;

export const waHref = (d, mesaj) =>
  `https://wa.me/${d.iletisim.whatsapp}?text=${encodeURIComponent(
    mesaj ?? `Merhaba ${d.isletme.ad}, aracım için bilgi almak istiyorum.`
  )}`;

export const mapsHref = (d) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.iletisim.mapsQuery || d.iletisim.adres)}`;

export const mapsEmbed = (d) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(d.iletisim.mapsQuery || d.iletisim.adres)}&z=15&hl=tr&output=embed`;

// --- Çalışma saatleri ----------------------------------------------------

export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Sayıya ek: okunuşun son sözcüğüne göre ünlü uyumu ve sertleşme.
// bulunma: "17:00'de", "08:30'da", "15:45'te"; ayrılma: "2001'den", "1996'dan", "1994'ten".
const SAYI_SON = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLUK = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
function sonSozcuk(n) {
  if (n % 10) return SAYI_SON[n % 10];
  if (n % 100) return ONLUK[Math.floor(n / 10) % 10];
  if (n % 1000) return 'yüz';
  return n ? 'bin' : 'sıfır';
}
function sayiEki(w, ayrilma) {
  const unlu = [...w].reverse().find((c) => 'aeıioöuü'.includes(c));
  const ince = 'eiöü'.includes(unlu);
  const sert = /[çfhkpsşt]$/.test(w);
  return `'${sert ? 't' : 'd'}${ince ? 'e' : 'a'}${ayrilma ? 'n' : ''}`;
}
export function saatEki(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return sayiEki(sonSozcuk(m || h), false);
}
// 2001 → "2001'den" (sayıyla birlikte döner: `${yilEki(d.isletme.kurulus)} beri`).
export const yilEki = (n) => `${n}${sayiEki(sonSozcuk(Number(n)), true)}`;

// saatler: 7 elemanlı dizi, 0 = Pazar. Her eleman "08:30-19:00" ya da null (kapalı).
export function openStatus(saatler, now = new Date()) {
  const bugun = saatler[now.getDay()];
  const dakika = now.getHours() * 60 + now.getMinutes();
  if (bugun) {
    const [ac, kapa] = bugun.split('-');
    if (dakika >= toMin(ac) && dakika < toMin(kapa)) {
      return { open: true, text: `Şu an açık, ${kapa}${saatEki(kapa)} kapanıyor` };
    }
    if (dakika < toMin(ac)) return { open: false, text: `Bugün ${ac}${saatEki(ac)} açılıyor` };
  }
  for (let i = 1; i <= 7; i++) {
    const gun = (now.getDay() + i) % 7;
    if (saatler[gun]) {
      const ac = saatler[gun].split('-')[0];
      return { open: false, text: `${i === 1 ? 'Yarın' : GUNLER[gun]} ${ac}${saatEki(ac)} açılıyor` };
    }
  }
  return { open: false, text: 'Kapalı' };
}

// Ardışık aynı saatleri gruplar: [["Pazartesi – Cuma", "08:30-19:00"], ["Pazar", null]]
export function groupedHours(saatler) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups = [];
  for (const g of order) {
    const last = groups.at(-1);
    if (last && last.value === saatler[g]) last.days.push(g);
    else groups.push({ days: [g], value: saatler[g] });
  }
  return groups.map(({ days, value }) => [
    days.length > 1 ? `${GUNLER[days[0]]} – ${GUNLER[days.at(-1)]}` : GUNLER[days[0]],
    value ? value.replace('-', ' – ') : 'Kapalı',
  ]);
}

// --- Künye (içerik brief'i: .shots/ICERIK-BRIEF.md) ---------------------------------------
// Saat biçimi "08.30–19.00", ek okunuşa göre (08.30'da, 17.00'de). openStatus/groupedHours eski
// biçimi (08:30 – 19:00) kullanan presetler için aynen kalır.

// "08:30-19:00" → "08.30–19.00"; tek saat de olur: "08:30" → "08.30".
export const saatBicim = (s) => String(s).replace(/:/g, '.').replace(/\s*[-–]\s*/, '–');

// groupedHours'un künye biçimi: [["Pazartesi–Cuma", "08.30–19.00"], ["Pazar", "Kapalı"]]
export const saatListesi = (saatler) =>
  groupedHours(saatler).map(([g, s]) => [g.replace(' – ', '–'), s === 'Kapalı' ? s : saatBicim(s)]);

// Bugünkü durum, künye satırı için iki parça:
//   { open, durum: 'Şu an açık' | 'Şu an kapalı' | 'Bugün kapalı' | 'Kapalı',
//     saat: 'Bugün 08.30–19.00' | "Yarın 08.30'da açılır" | "Pazartesi 08.30'da açılır" | '',
//     metin: 'Şu an açık · Bugün 08.30–19.00'   (saatler ve iletişim bölümü),
//     kunye: 'Şu an açık · 08.30–19.00' }        (künyede "Bugün" etiketinin yanı)
export function gunDurumu(saatler, now = new Date()) {
  const g = now.getDay();
  const bugun = saatler[g];
  const simdi = now.getHours() * 60 + now.getMinutes();
  const sonuc = (open, durum, saat) => ({
    open, durum, saat,
    metin: saat ? `${durum} · ${saat}` : durum,
    kunye: saat ? `${durum} · ${saat.replace(/^Bugün /, '')}` : durum,
  });
  if (bugun) {
    const [ac, kapa] = bugun.split('-');
    if (simdi >= toMin(ac) && simdi < toMin(kapa)) return sonuc(true, 'Şu an açık', `Bugün ${saatBicim(bugun)}`);
    if (simdi < toMin(ac)) return sonuc(false, 'Şu an kapalı', `Bugün ${saatBicim(bugun)}`);
  }
  for (let i = 1; i <= 7; i++) {
    const s = saatler[(g + i) % 7];
    if (!s) continue;
    const ac = s.split('-')[0];
    return sonuc(false, bugun ? 'Şu an kapalı' : 'Bugün kapalı', `${i === 1 ? 'Yarın' : GUNLER[(g + i) % 7]} ${saatBicim(ac)}${saatEki(ac)} açılır`);
  }
  return sonuc(false, 'Kapalı', '');
}

// "Şaşmaz Oto Sanayi Sitesi, 4. Cadde No: 38, Etimesgut/Ankara" → "Şaşmaz Oto Sanayi Sitesi, 4. Cadde No: 38"
export const kisaAdres = (a) => String(a || '').replace(/,\s*[^,]+\/\s*[^,]+$/, '');

// Haftada açık gün sayısı (rakam blokları yalnız veriden türeyen olguları gösterir).
export const acikGunSayisi = (saatler) => (saatler || []).filter(Boolean).length;

// --- İkonlar -------------------------------------------------------------

export const icons = {
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7A11.8 11.8 0 0 0 24 12a11.7 11.7 0 0 0-3.6-8.4z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>`,
};

// --- Mobil aksiyon çubuğu -----------------------------------------------
// Renkleri preset CSS değişkenleriyle ayarlar: --bar-bg, --bar-fg, --bar-accent, --bar-accent-fg

export function mountActionBar(d) {
  const bar = document.createElement('nav');
  bar.className = 'action-bar';
  bar.setAttribute('aria-label', 'Hızlı iletişim');
  bar.innerHTML = `
    <a href="${telHref(d)}" class="action-bar__btn">${icons.phone}<span>Ara</span></a>
    <a href="${waHref(d)}" class="action-bar__btn action-bar__btn--main" target="_blank" rel="noopener">${icons.whatsapp}<span>WhatsApp</span></a>
    <a href="${mapsHref(d)}" class="action-bar__btn" target="_blank" rel="noopener">${icons.pin}<span>Yol tarifi</span></a>`;
  document.body.append(bar);
  markBar('action');
  tuckWhenDuplicated(bar);
  return bar;
}

// Aynı üç düğme (Ara + Yol tarifi) sayfada zaten görünüyorsa (künye, iletişim bölümü) alt çubuk saklanır;
// o grup ekrandan çıkınca geri gelir. Presetin işaretlemesi gerekmez: tel: ve harita bağlantısı taşıyan
// ortak kapsayıcı aranır. Kapatmak: <html data-bar-tuck="off">.
function tuckWhenDuplicated(bar) {
  if (typeof IntersectionObserver === 'undefined' || root.dataset.barTuck === 'off') return;
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    root.toggleAttribute('data-bar-tucked', visible.size > 0);
  }, { threshold: 0.6 });
  const seen = new WeakSet();
  const scan = () => {
    for (const tel of document.querySelectorAll('a[href^="tel:"]')) {
      if (bar.contains(tel)) continue;
      let box = tel.parentElement;
      for (let i = 0; i < 3 && box && box !== document.body; i++, box = box.parentElement) {
        if (box.querySelector('a[href*="google.com/maps"], a[href*="maps.apple"], a[href*="maps.google"]')) break;
      }
      if (!box || box === document.body || seen.has(box)) continue;
      if (!box.querySelector('a[href*="maps"]')) continue;
      seen.add(box);
      io.observe(box);
    }
  };
  requestAnimationFrame(scan);
  setTimeout(scan, 1200); // geç çizilen bölümler (kurumsal sayfa geçişleri dahil)
  addEventListener('hashchange', () => setTimeout(scan, 300));
}

// --- Telefon sözleşmesi --------------------------------------------------
// Ayrıntılar ve örnekler: docs/phone-contract.md
//  * Tek üst öğe (başlık), tek alt öğe (alt çubuk YA DA hikâye kartı), hiçbir şey içeriği örtmez.
//  * CSS değişkenleri (html üzerinde):
//      --bar-h       alt çubuğun yüksekliği (yoksa 0)
//      --bar-reserve sayfa sonunda çubuğa ayrılan sabit boşluk (body padding-bottom bunu kullanır)
//      --bar-space   yüzen kartların alttan bırakması gereken boşluk; hikâye modunda küçülür
//      --header-h       sabit üst başlığın yüksekliği (otomatik ölçülür; scroll-margin varsayılanı)
//  * html[data-phone-bar="action|vitrin"], html[data-phone-story] (hikâye modu açıkken) kancaları.
//  * Hikâye modu: pinli bir sahne ekranı kaplarken alt çubuk aşağı kayar (yukarı kaydırınca döner).
//    Otomatik algılanır (GSAP pin / ekran boyu sticky sahne); preset ayrıca
//    <section data-pinned> ya da <body data-pinned> ile ya da setStoryMode(true) ile bildirebilir.
//    Otomatiği kapatmak: <html data-phone-story-auto="off"> ya da setStoryMode(false).

const root = document.documentElement;

function markBar(kind) {
  root.dataset.phoneBar = kind;
  const bar = document.querySelector(kind === 'vitrin' ? '.vitrin-bar' : '.action-bar');
  if (!bar || typeof ResizeObserver === 'undefined') return;
  // Preset çubuğu yeniden biçimlendirirse gerçek yüksekliği ölç (masaüstünde gizliyse 0).
  new ResizeObserver(() => {
    const h = bar.offsetHeight;
    if (h) root.style.setProperty('--bar-h', `${h}px`);
    else root.style.removeProperty('--bar-h');
  }).observe(bar);
}

// Sabit/yapışkan üst başlığın alt kenarı (px). Tam ekran sahneler ve yarım ekrandan büyükler sayılmaz.
export function topObstruction() {
  const vw = innerWidth, vh = innerHeight;
  let bottom = 0;
  for (const x of [vw / 2, 24, vw - 24]) {
    for (const el of document.elementsFromPoint(x, 2)) {
      for (let e = el; e && e !== document.body && e !== root; e = e.parentElement) {
        const pos = getComputedStyle(e).position;
        if (pos !== 'fixed' && pos !== 'sticky') continue;
        const r = e.getBoundingClientRect();
        if (r.top <= 2 && r.height < vh * 0.35 && r.width >= vw * 0.5) bottom = Math.max(bottom, r.bottom);
        break;
      }
    }
  }
  return Math.round(bottom);
}

function topOffsetFor(target) {
  const m = parseFloat(getComputedStyle(target).scrollMarginTop);
  return m > 0 ? m : topObstruction();
}

function measureTop() {
  const h = topObstruction();
  if (h) root.style.setProperty('--header-h', `${h}px`);
}

// Hikâye modu --------------------------------------------------------------
let storyForced = null; // true/false: preset zorladı; null: otomatik
let stages = [];        // { el, box } — el ekranı kaplayan sahne, box onu taşıyan (pin-spacer / ebeveyn)
let storyOn = false, peek = false, lastY = 0, travel = 0, storyTick = 0;

// setStoryMode(true)  → alt çubuk gizli (pinli hikâye başladı)
// setStoryMode(false) → hiçbir zaman gizleme (otomatiği de kapatır)
// setStoryMode(null)  → otomatiğe dön
export function setStoryMode(on) {
  storyForced = on == null || on === 'auto' ? null : !!on;
  updateStory();
}

// Bir bölümü pinli hikâye olarak bildir: ekranı kapladığı sürece hikâye modu açık.
export function storyZone(el) {
  el?.setAttribute('data-pinned', '');
  updateStory();
}

function findStages() {
  const vh = innerHeight, out = [];
  // GSAP pinleri (pinSpacing: false dahil): başlangıç/bitiş doğrudan ScrollTrigger'dan.
  for (const st of ScrollTrigger.getAll()) {
    if (st.pin && st.end - st.start >= vh * 0.5) out.push({ el: st.pin, st });
  }
  // Ekran boyu position: sticky sahneler (ebeveyni en az yarım ekran daha uzun).
  for (const el of document.body.getElementsByTagName('*')) {
    if (el.offsetHeight < vh * 0.85 || !el.parentElement) continue;
    if (getComputedStyle(el).position !== 'sticky') continue;
    if (el.parentElement.offsetHeight - el.offsetHeight >= vh * 0.5) out.push({ el, box: el.parentElement });
  }
  stages = out;
}

function stageActive() {
  const vh = innerHeight, y = scrollY;
  if (document.body.hasAttribute('data-pinned') || root.hasAttribute('data-pinned')) return true;
  for (const el of document.querySelectorAll('[data-pinned]')) {
    const r = el.getBoundingClientRect();
    if (r.top <= 1 && r.bottom >= vh - 1) return true;
  }
  if (root.dataset.phoneStoryAuto === 'off') return false;
  // Sahneye çeyrek ekran girilmiş ve bitişine en az 0,1 ekran var: ilk ekran (hero) ve
  // bölüm sonu çubuklu kalır, arası hikâye.
  for (const s of stages) {
    if (s.st) {
      if (!s.st.isActive || y < s.st.start + vh * 0.25 || y > s.st.end - vh * 0.1) continue;
      const r = s.el.getBoundingClientRect();
      // Tam ekran sahne ya da alt çubuk bölgesine inen pinli kart
      if ((r.height >= vh * 0.85 && r.top <= 1 && r.bottom >= vh - 1) || (r.bottom >= vh - 200 && r.top < vh)) return true;
      continue;
    }
    const b = s.box.getBoundingClientRect();
    if (b.top > -vh * 0.25 || b.bottom < vh * 1.1) continue;
    const r = s.el.getBoundingClientRect();
    if (r.top <= 1 && r.bottom >= vh - 1) return true;
  }
  return false;
}

function updateStory() {
  const on = storyForced ?? stageActive();
  if (on !== storyOn) { storyOn = on; peek = false; travel = 0; }
  const hide = storyOn && !peek;
  if (hide) root.setAttribute('data-phone-story', '');
  else root.removeAttribute('data-phone-story');
}

function onStoryScroll() {
  if (storyTick) return;
  storyTick = requestAnimationFrame(() => {
    storyTick = 0;
    const y = scrollY, dy = y - lastY;
    lastY = y;
    // Hikâye sırasında yukarı kaydırmak çubuğu geri getirir, aşağı devam etmek yine saklar.
    travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
    if (storyOn && travel < -40) peek = true;
    if (storyOn && travel > 40) peek = false;
    updateStory();
  });
}

function initPhoneContract() {
  if (initPhoneContract.done) return;
  initPhoneContract.done = true;
  let rt = 0;
  const refresh = () => { findStages(); measureTop(); updateStory(); };
  const later = () => { clearTimeout(rt); rt = setTimeout(refresh, 250); };
  addEventListener('scroll', onStoryScroll, { passive: true });
  addEventListener('resize', later, { passive: true });
  addEventListener('load', () => setTimeout(refresh, 600), { once: true });
  ScrollTrigger.addEventListener('refresh', later);
  setTimeout(refresh, 1500);
}

// Aşağı kaydırınca başlığı saklar, yukarı kaydırınca gösterir. --header-h'yi günceller.
// autoHideHeader(el, { offset: 80, tolerance: 8 }) → durdurmak için dönen fonksiyonu çağır.
export function autoHideHeader(el, { offset = 80, tolerance = 8 } = {}) {
  if (!el) return () => {};
  el.setAttribute('data-autohide', '');
  let last = scrollY, raf = 0;
  // Başlık gizliyken boyut değişse bile --header-h 0 kalmalı; yoksa çapalar boşluğa iner.
  const set = () => {
    if (el.hasAttribute('data-autohide-hidden')) return;
    root.style.setProperty('--header-h', `${el.offsetHeight}px`);
  };
  set();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
  ro?.observe(el);
  const tick = () => {
    raf = 0;
    const y = scrollY, dy = y - last;
    if (Math.abs(dy) < tolerance) return;
    const hide = dy > 0 && y > offset && !el.contains(document.activeElement);
    el.toggleAttribute('data-autohide-hidden', hide);
    root.style.setProperty('--header-h', hide ? '0px' : `${el.offsetHeight}px`);
    last = y;
  };
  const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', on, { passive: true });
  return () => {
    removeEventListener('scroll', on);
    ro?.disconnect();
    el.removeAttribute('data-autohide');
    el.removeAttribute('data-autohide-hidden');
  };
}

// --- SEO -----------------------------------------------------------------

export function applyMeta(d) {
  const { isletme, iletisim } = d;
  document.title = `${isletme.ad} | ${isletme.sektor} | Şaşmaz, Ankara`;
  // Slogan kullanılmaz (içerik kuralları): tanım → sektör. Eski verilerde slogan kalmış olsa da okunmaz.
  const tanim = isletme.tanim || isletme.sektor;
  const desc = `${isletme.ad}: ${tanim}. ${iletisim.adres}. Telefon: ${iletisim.telefon}`;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.append(meta);
  }
  meta.content = desc;

  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: isletme.ad,
    description: tanim,
    telephone: iletisim.telefon,
    foundingDate: String(isletme.kurulus),
    address: {
      '@type': 'PostalAddress',
      streetAddress: iletisim.adres,
      addressLocality: 'Etimesgut',
      addressRegion: 'Ankara',
      addressCountry: 'TR',
    },
    // Demo yorumları örnektir; arama motoruna gerçek puan (aggregateRating) olarak yazılmaz.
    // Müşteriye özel sitede gerçek puan kaynağı eklenince burada `d.puan.gercek` ile açılabilir.
    ...(d.puan?.gercek && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: d.puan.ortalama, reviewCount: d.puan.adet },
    }),
  });
  document.head.append(ld);
}

// Tek çağrıyla ortak kurulum. Preset kendi render'ını bundan sonra yapar.
// --- Vitrin modu ---------------------------------------------------------
// Usta demoyu vitrin sayfasından açtığında (?vitrin=1) alttaki iletişim çubuğunun yerine
// "Diğer tasarımlar / Bunu istiyorum" çubuğu çıkar. Seçim vitrine geri döner.

export const vitrinModu = () => new URLSearchParams(location.search).has('vitrin');

export function mountVitrinBar() {
  const params = new URLSearchParams(location.search);
  const preset = location.pathname.match(/presets\/([^/]+)/)?.[1] ?? '';
  const geri = new URLSearchParams();
  for (const k of ['ad', 'tel', 'sektor']) if (params.get(k)) geri.set(k, params.get(k));
  const sec = new URLSearchParams(geri);
  sec.set('sec', preset);
  const url = (q) => `${BASE}vitrin/?${q}`;
  const bar = document.createElement('nav');
  bar.className = 'vitrin-bar';
  bar.setAttribute('aria-label', 'Tasarım seçimi');
  bar.innerHTML = `
    <a href="${esc(url(geri))}" class="vitrin-bar__geri">Diğer tasarımlar</a>
    <a href="${esc(url(sec))}" class="vitrin-bar__sec">Bunu istiyorum</a>`;
  document.body.append(bar);
  document.documentElement.classList.add('is-vitrin');
  markBar('vitrin');
  return bar;
}

export function boot(base) {
  const d = loadData(base);
  applyMeta(d);
  if (vitrinModu()) mountVitrinBar();
  else mountActionBar(d);
  initPhoneContract();
  return d;
}

export { gsap, ScrollTrigger };
