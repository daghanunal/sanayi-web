// Ortak çekirdek: veri yükleme, akıcı scroll, iletişim linkleri, açık/kapalı durumu,
// mobil aksiyon çubuğu ve SEO meta. Her preset bunu kullanır; görünümü preset belirler.
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
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
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

// saatler: 7 elemanlı dizi, 0 = Pazar. Her eleman "08:30-19:00" ya da null (kapalı).
export function openStatus(saatler, now = new Date()) {
  const bugun = saatler[now.getDay()];
  const dakika = now.getHours() * 60 + now.getMinutes();
  if (bugun) {
    const [ac, kapa] = bugun.split('-');
    if (dakika >= toMin(ac) && dakika < toMin(kapa)) {
      return { open: true, text: `Şu an açık, ${kapa}'da kapanıyor` };
    }
    if (dakika < toMin(ac)) return { open: false, text: `Bugün ${ac}'da açılıyor` };
  }
  for (let i = 1; i <= 7; i++) {
    const gun = (now.getDay() + i) % 7;
    if (saatler[gun]) {
      const ac = saatler[gun].split('-')[0];
      return { open: false, text: `${i === 1 ? 'Yarın' : GUNLER[gun]} ${ac}'da açılıyor` };
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
  return bar;
}

// --- SEO -----------------------------------------------------------------

export function applyMeta(d) {
  const { isletme, iletisim } = d;
  document.title = `${isletme.ad} | ${isletme.sektor} | Şaşmaz, Ankara`;
  const desc = `${isletme.ad}: ${isletme.slogan} ${iletisim.adres}. Telefon: ${iletisim.telefon}`;
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
    description: isletme.slogan,
    telephone: iletisim.telefon,
    foundingDate: String(isletme.kurulus),
    address: {
      '@type': 'PostalAddress',
      streetAddress: iletisim.adres,
      addressLocality: 'Etimesgut',
      addressRegion: 'Ankara',
      addressCountry: 'TR',
    },
    ...(d.puan && {
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
  return bar;
}

export function boot(base) {
  const d = loadData(base);
  applyMeta(d);
  if (vitrinModu()) mountVitrinBar();
  else mountActionBar(d);
  return d;
}

export { gsap, ScrollTrigger };
