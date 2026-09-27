import veri from '../../data/depo.json';
import '../../shared/base.css';
import './style.css';
import {
  boot, initSmoothScroll, reducedMotion, telHref, waHref, mapsHref, mapsEmbed, setStoryMode,
  openStatus, groupedHours, icons, esc, gsap, ScrollTrigger,
} from '../../shared/core.js';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { pickQuality } from '../../shared/lib3d.js';

gsap.registerPlugin(SplitText, Flip, DrawSVGPlugin, MotionPathPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

// Örnek puan yapısal veriye (JSON-LD aggregateRating) girmesin: boot'tan önce ayır, sonra geri ekle.
const { puan: ornekPuan, ...veriLd } = veri;
const d = boot(veriLd);
d.puan = ornekPuan;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const nf = (n) => Math.round(n).toLocaleString('tr-TR');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const upper = (s) => s.toLocaleUpperCase('tr');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const lite = weak || innerWidth < 700;
const yil = new Date().getFullYear() - d.isletme.kurulus;

// "2003'ten", "1998'den", "2010'dan"
function ablative(n) {
  const units = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return `${n}'${u ? units[u] : t ? tens[t] : 'den'}`;
}

// --- İçerik --------------------------------------------------------------------

const binds = {
  ad: d.isletme.ad, slogan: d.isletme.slogan, telefon: d.iletisim.telefon, adres: d.iletisim.adres, garanti: d.garanti,
};
$$('[data-bind]').forEach((el) => (el.textContent = binds[el.dataset.bind] ?? ''));
$$('[data-tel]').forEach((a) => (a.href = telHref(d)));
$$('[data-wa]').forEach((a) => (a.href = waHref(d, `Merhaba ${d.isletme.ad}, bir parça için fiyat ve stok sormak istiyorum.`)));
$$('[data-maps]').forEach((a) => (a.href = mapsHref(d)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icons[el.dataset.icon]));
$('.top__brand').setAttribute('aria-label', `${d.isletme.ad}, sayfa başı`);
$('[data-since-code]').textContent = `${ablative(d.isletme.kurulus)} beri`;

// Barkod çubukları (isimden türetilmiş, her dükkâna özel)
function bars(seedText, n = 46) {
  let s = [...seedText].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => `<i style="--w:${1 + Math.floor(rnd() * 3.4)}"></i>`).join('');
}
$$('[data-bars]').forEach((el) => (el.innerHTML = bars(d.isletme.ad)));

// Hero başlık: kelime başına satır
const heroTitle = $('[data-hero-title]');
// Kelimeleri iki-üç dengeli satıra topla
const words = d.isletme.ad.split(/\s+/);
const maxLine = Math.max(...words.map((w) => [...w].length), innerWidth < 700 ? 9 : Math.ceil([...d.isletme.ad].length / 2) + 1);
const lines = words.reduce((acc, w) => {
  const lastLine = acc.at(-1);
  if (lastLine && [...`${lastLine} ${w}`].length <= maxLine) acc[acc.length - 1] = `${lastLine} ${w}`;
  else acc.push(w);
  return acc;
}, []);
heroTitle.innerHTML = lines.map((w) => `<span class="line"><span class="line__in">${esc(upper(w))}</span></span>`).join('');
heroTitle.style.setProperty('--len', Math.max(...lines.map((w) => [...w].length)));
heroTitle.setAttribute('aria-label', d.isletme.ad);

const stokStat = d.istatistikler.find((s) => /parça/.test(s.etiket)) ?? d.istatistikler[1];
$('[data-hero-stock-label]').textContent = stokStat.etiket;

const status = openStatus(d.saatler);
$$('[data-status]').forEach((el) => {
  el.textContent = status.open ? 'Açık' : 'Kapalı';
  el.title = status.text;
  el.classList.toggle('is-open', status.open);
});
$('[data-status-big]').textContent = status.text;

// Raf kartları
const stops = d.hizmetler;
document.documentElement.style.setProperty('--n', stops.length);
$('[data-rail]').innerHTML = stops.map((s, i) => `<li data-rail-i="${i}"><span>${esc(s.raf)}</span><i></i></li>`).join('');
const cardHtml = (s, i) => `
  <article class="shelfcard" data-card="${i}">
    <p class="shelfcard__code"><span>Raf</span><b data-scr="${esc(s.raf)}">${esc(s.raf)}</b><span class="shelfcard__n">${String(i + 1).padStart(2, '0')}/${String(stops.length).padStart(2, '0')}</span></p>
    <h3 class="shelfcard__title">${esc(s.baslik)}</h3>
    <p class="shelfcard__desc">${esc(s.aciklama)}</p>
    <ul class="shelfcard__list">${s.ornekler.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    <p class="shelfcard__stok"><b data-stok="${s.stok}">0</b> kalem rafta</p>
    <a class="shelfcard__ask" target="_blank" rel="noopener" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ${s.baslik.toLocaleLowerCase('tr')} için parça soracağım. Şasi numaram: `))}">${icons.whatsapp}<span>Bu raftan parça sor</span></a>
  </article>`;

// Raf sahneleri: kategoriler en fazla 3'lü gruplara bölünür (her sahne ≤ 3 ekran pinli).
// Sahne ilerlemesi genel raf ilerlemesine (from → to, durak cinsinden) çevrilir; aradaki koridor
// tabelası akışta kayar ve kameranın bir sonraki durağa yürüyüşünü taşır.
{
  const n = stops.length;
  const k = Math.max(1, Math.ceil(n / 3));
  const chunks = [];
  for (let c = 0, a = 0; c < k; c++) {
    const size = Math.ceil((n - a) / (k - c));
    chunks.push([a, a + size]);
    a += size;
  }
  let html = '';
  chunks.forEach(([a, b], ci) => {
    const from = ci === 0 ? 0 : a + 0.12;
    const to = ci === chunks.length - 1 ? n : b - 0.08;
    html += `
    <section class="ch ch--raf" data-ch="raf" data-from="${from}" data-to="${to}" style="--span:${(to - from).toFixed(2)}"${ci === 0 ? ' id="kategoriler"' : ''} aria-label="Parça kategorileri, ${ci + 1}. koridor">
      <div class="ch__pin"><div class="shelfcards">${stops.slice(a, b).map((s, j) => cardHtml(s, a + j)).join('')}</div></div>
    </section>`;
    if (ci < chunks.length - 1) {
      const [na, nb] = chunks[ci + 1];
      html += `
    <div class="aisle" data-ch="raf" data-flow data-from="${to}" data-to="${na + 0.12}">
      <div class="aisle__sign">
        <p class="aisle__k"><span>Koridor</span><b>${ci + 2}</b></p>
        <ul class="aisle__list">${stops.slice(na, nb).map((s) => `<li><b>${esc(s.raf)}</b>${esc(s.baslik)}</li>`).join('')}</ul>
      </div>
    </div>`;
    }
  });
  $('[data-raf-scenes]').innerHTML = html;
}

// Katalog
$('[data-katalog-title]').textContent = `${nf(stokStat.deger)} çeşit parça, tek çatı altında.`;
$('[data-katalog-sub]').textContent = 'Rafta olmayanı aynı gün tedarik ediyoruz.';

// Süreç adımları (gerçek sıra)
$('[data-steps]').innerHTML = d.surec.map((s, i) => `
  <li class="step" data-step="${i}"><span class="step__n">${i + 1}</span><div><b>${esc(s.baslik)}</b><p>${esc(s.aciklama)}</p></div></li>`).join('');

// Teslimat
$('[data-tiers]').innerHTML = d.teslimat.map((t) => `
  <li><b>${esc(t.yer)}</b><span class="tiers__sure">${esc(t.sure)}</span><span class="tiers__not">${esc(t.not)}</span></li>`).join('');

// Harita blokları
{
  const xs = [0, 150, 232, 372, 514, 600];
  const ys = [0, 112, 238, 356, 420];
  let html = '';
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x = xs[i] + 11, y = ys[j] + 11, w = xs[i + 1] - xs[i] - 22, h = ys[j + 1] - ys[j] - 22;
      if (w < 10 || h < 10) continue;
      const cls = i === 0 && j === 2 ? 'is-depo' : i === 3 && j === 0 ? 'is-hedef' : '';
      html += `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" />`;
      // dükkân sıraları
      for (let k = 1; k < Math.floor(w / 26); k++) html += `<line x1="${x + k * 26}" y1="${y + 6}" x2="${x + k * 26}" y2="${y + 18}" />`;
    }
  }
  $('[data-blocks]').innerHTML = html;
}

// Hakkında: kelime kelime aydınlanan metin
$('[data-hakkinda]').innerHTML = d.isletme.hakkinda.split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(' ');

// Rakamlar
const stats = d.istatistikler.map((s) => ({ ...s, deger: s.deger === 'kurulus' ? yil : s.deger }));
$('[data-stats]').innerHTML = stats.map((s) => `
  <li class="stat"><p class="stat__num"><b data-num="${s.deger}">0</b><span>${esc(s.sonek)}</span></p><p class="stat__lbl">${esc(s.etiket)}</p></li>`).join('');

// Marka duvarı
$('[data-wall]').innerHTML = d.markalar.map((m, i) => `
  <li class="wtag"><span class="wtag__code">${String.fromCharCode(65 + (i % 6))}-${String(10 + i * 3).padStart(2, '0')}</span><b>${esc(m)}</b><span class="wtag__bars">${bars(m, 22)}</span></li>`).join('');
{
  const chunk = `<span class="marquee__chunk">${d.parcaMarkalari.map((m) => `<span>${esc(m)}</span>`).join('')}</span>`;
  $('[data-marquee]').innerHTML = `<div class="marquee__inner">${chunk}${chunk}</div>`;
}

// Galeri
$('[data-galeri]').innerHTML = d.galeri.map((g, i) => `
  <figure class="gph"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="1200" height="1600"><figcaption><span>${String(i + 1).padStart(2, '0')}</span>${esc(g.alt)}</figcaption></figure>`).join('');

// Yorumlar
$('[data-puan]').textContent = d.puan.ortalama.toLocaleString('tr-TR', { minimumFractionDigits: 1 });
$('[data-stars]').innerHTML = icons.star.repeat(5);
$('[data-puan-adet]').textContent = 'Örnek yorumlar · 5 üzerinden örnek puan';
$('[data-yorumlar]').innerHTML = d.yorumlar.map((y) => `
  <figure class="rev">
    <p class="rev__stars" aria-label="${y.puan} yıldız">${icons.star.repeat(y.puan)}</p>
    <blockquote>${esc(y.metin)}</blockquote>
    <figcaption><b>${esc(y.ad)}</b><span>${esc(y.arac)}</span></figcaption>
  </figure>`).join('');

$('[data-hours]').innerHTML = groupedHours(d.saatler).map(([g, h]) => `<dt>${g}</dt><dd>${h}</dd>`).join('');
$('[data-year]').textContent = `© ${new Date().getFullYear()} ${d.isletme.ad}. Fotoğraflar: Pexels. 3D görseller temsilîdir. Yorumlar örnektir.`;

// --- Yardımcılar ------------------------------------------------------------------

const GLYPHS = 'ABCDEFGHJKLMNPRSTUVYZ0123456789-';
function scramble(el, text = el.dataset.scr, duration = 0.6) {
  const chars = [...text];
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration, ease: 'none',
    onUpdate() {
      const n = Math.floor(o.p * chars.length);
      el.textContent = chars.map((c, i) => (i < n || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    },
    onComplete() { el.textContent = text; },
  });
}

// --- Şasi no okuyucu ---------------------------------------------------------------

const WMI = {
  VF1: 'Renault', VF3: 'Peugeot', VR3: 'Peugeot', VF7: 'Citroën', UU1: 'Dacia', WVW: 'Volkswagen',
  WV1: 'Volkswagen Ticari', WV2: 'Volkswagen Ticari', WAU: 'Audi', WBA: 'BMW', WDD: 'Mercedes-Benz',
  WDB: 'Mercedes-Benz', W0L: 'Opel', ZFA: 'Fiat', NM0: 'Ford Otosan', WF0: 'Ford', NMT: 'Toyota Türkiye',
  JTD: 'Toyota', TMB: 'Škoda', VSS: 'Seat', KMH: 'Hyundai', NLH: 'Hyundai Assan', KNA: 'Kia',
  JHM: 'Honda', SJN: 'Nissan', YV1: 'Volvo',
};
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY';
function modelYear(c) {
  const now = new Date().getFullYear() + 1;
  let y;
  if (/[1-9]/.test(c)) y = 2000 + Number(c);
  else {
    const i = YEAR_CODES.indexOf(c);
    if (i < 0) return null;
    y = 2010 + i;
  }
  while (y > now) y -= 30;
  return y;
}

function vinTool() {
  const form = $('[data-vin]');
  const input = $('[data-vin-input]');
  const count = $('[data-vin-count]');
  const laser = $('[data-vin-laser]');
  const result = $('[data-vin-result]');
  const chips = $('[data-vin-chips]');
  const steps = $$('[data-step]');
  const cats = [...stops.map((s) => s.baslik), 'Emin değilim'];
  chips.innerHTML = cats.map((c) => `<button type="button" class="chip" aria-pressed="false">${esc(c)}</button>`).join('');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  });
  const clean = () => {
    const v = upper(input.value).replace(/[^A-Z0-9]/g, '').replace(/[IOQ]/g, (c) => (c === 'I' ? '1' : '0')).slice(0, 17);
    if (v !== input.value) input.value = v;
    count.textContent = `${v.length}/17`;
    count.classList.toggle('is-full', v.length === 17);
    return v;
  };
  input.addEventListener('input', clean);
  $('[data-vin-demo]').addEventListener('click', () => {
    input.value = '';
    const demo = 'VF1RFB00XG6543210';
    gsap.to({ n: 0 }, {
      n: demo.length, duration: 0.8, ease: 'none',
      onUpdate() { input.value = demo.slice(0, Math.round(this.targets()[0].n)); clean(); },
    });
  });
  const light = (n) => steps.forEach((s, i) => s.classList.toggle('is-on', i < n));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = clean();
    const secilen = $$('.chip[aria-pressed="true"]', chips).map((b) => b.textContent);
    result.hidden = false;
    if (v.length !== 17) {
      gsap.fromTo(form.querySelector('.vin__doc'), { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      result.innerHTML = `
        <p class="vin__warn">Şasi numarası 17 hanedir, şu an ${v.length} hane var. Numara elinizde değilse ruhsatın fotoğrafını gönderin, biz okuruz.</p>
        <a class="btn btn--wa" target="_blank" rel="noopener" href="${esc(waHref(d, `Merhaba ${d.isletme.ad}, ruhsat fotoğrafımı gönderiyorum, parça soracağım.`))}">${icons.whatsapp}Ruhsat fotoğrafı gönder</a>`;
      return;
    }
    const marka = WMI[v.slice(0, 3)];
    const y = modelYear(v[9]);
    const rows = [
      ['Üretici kodu', `${v.slice(0, 3)}${marka ? `, ${marka}` : ''}`],
      ['Model yılı', y ? String(y) : 'Ustamız bakacak'],
      ['Sıra numarası', v.slice(11)],
    ];
    const parca = secilen.length ? secilen.join(', ') : 'parça';
    const mesaj = `Merhaba ${d.isletme.ad}, şasi numaram ${v}${marka ? ` (${marka}${y ? `, ${y}` : ''})` : ''}. ${parca} için orijinal ve muadil fiyat alabilir miyim?`;
    result.innerHTML = `
      <dl class="vin__rows">${rows.map(([k, val]) => `<div><dt>${k}</dt><dd data-scr="${esc(val)}">${esc(val)}</dd></div>`).join('')}</dl>
      <p class="vin__next">Numara okundu. Parçayı ustamız katalogdan eşleştirip fiyatı yazacak.</p>
      <a class="btn btn--wa btn--big" target="_blank" rel="noopener" href="${esc(waHref(d, mesaj))}">${icons.whatsapp}Fiyatı WhatsApp'tan iste</a>`;
    light(1);
    if (reducedMotion) {
      light(2);
      return;
    }
    const tl = gsap.timeline();
    tl.fromTo(laser, { xPercent: -100, opacity: 1 }, { xPercent: 1700, duration: 0.9, ease: 'power1.inOut' })
      .set(laser, { opacity: 0 });
    $$('[data-scr]', result).forEach((el, i) => tl.add(scramble(el, el.dataset.scr, 0.5), 0.5 + i * 0.25));
    tl.fromTo($$('.vin__rows > div, .vin__next, .btn', result), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.4 }, 0.4);
    tl.call(() => light(2), [], 1.4);
  });
}
vinTool();

// --- Sahne ------------------------------------------------------------------------

let stage = null;
const canvas = $('[data-stage]');
async function makeStage() {
  const { createStage } = await import('./scene.js');
  stage = createStage(canvas, { stops, ad: d.isletme.ad, tel: d.iletisim.telefon, lite, weak, quality: pickQuality() });
  addEventListener('resize', () => stage.resize());
}

// Bölüm durumu: ekranda hangi 3D bölüm var ve içindeki ilerlemesi
const chapters = $$('[data-ch]').map((el) => ({ el, id: el.dataset.ch }));
const cards = $$('[data-card]');
const railItems = $$('[data-rail-i]');
let lastCard = -1;
let finalSplit = null;
let finalShown = false;

function chapterProgress(el) {
  const r = el.getBoundingClientRect();
  if (el.hasAttribute('data-flow')) return clamp((innerHeight * 0.5 - r.top) / r.height);
  const span = r.height - innerHeight;
  return clamp(-r.top / span);
}
const rail = $('[data-rail]');

function uiRaf(p) {
  const n = stops.length;
  const x = p * n;
  const i = Math.min(n - 1, Math.floor(x));
  const q = x - i;
  cards.forEach((c, k) => {
    let o = 0;
    let y = 30;
    if (k === i) {
      const a = seg(q, 0.3, 0.42);
      const b = 1 - seg(q, 0.84, 0.94);
      o = Math.min(a, b);
      y = (1 - a) * 30 - (1 - b) * 20;
    }
    c.style.opacity = o;
    c.style.transform = `translate3d(0, ${y}px, 0)`;
    c.style.visibility = o > 0.01 ? 'visible' : 'hidden';
    if (k === i) {
      const st = c.querySelector('[data-stok]');
      st.textContent = nf(Number(st.dataset.stok) * seg(q, 0.35, 0.7));
    }
  });
  if (i !== lastCard && q > 0.3) {
    lastCard = i;
    scramble(cards[i].querySelector('[data-scr]'));
  }
  railItems.forEach((li, k) => {
    li.classList.toggle('is-on', k === i);
    li.classList.toggle('is-done', k < i);
    li.style.setProperty('--f', k < i ? 1 : k === i ? q : 0);
  });
}

function uiKatalog(p) {
  const head = $('.katalog__head');
  const h = seg(p, 0.38, 0.55);
  head.style.opacity = h;
  head.style.transform = `translate3d(0, ${(1 - h) * 24}px, 0)`;
}

function uiFinal(p) {
  const show = p > 0.62;
  if (show !== finalShown) {
    finalShown = show;
    const f = $('.final');
    if (show) {
      f.classList.add('is-on');
      if (finalSplit) gsap.fromTo(finalSplit.chars, { yPercent: 110 }, { yPercent: 0, stagger: 0.015, duration: 0.6, ease: 'power3.out' });
    } else f.classList.remove('is-on');
  }
}

let velocity = 0;
function frame() {
  if (!stage) return;
  let current = null;
  let anyVisible = false;
  for (const c of chapters) {
    const r = c.el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) anyVisible = true;
    if (r.top <= innerHeight * 0.5 && r.bottom > innerHeight * 0.5) current = c;
    if (c.id === 'final' && r.top < innerHeight && r.bottom > 0 && !current) current = c;
  }
  stage.setActive(anyVisible);
  canvas.classList.toggle('is-off', !anyVisible);
  if (!current) return;
  let p = chapterProgress(current.el);
  if (current.id === 'raf') {
    const from = Number(current.el.dataset.from);
    const to = Number(current.el.dataset.to);
    p = (from + p * (to - from)) / stops.length;
  }
  rail.classList.toggle('is-on', current.id === 'raf');
  stage.set(current.id, p);
  stage.setVelocity(velocity);
  if (current.id === 'raf') uiRaf(p);
  else cards.forEach((c) => (c.style.visibility = 'hidden'));
  if (current.id === 'katalog') uiKatalog(p);
  if (current.id === 'final') uiFinal(p);
}

// --- Kaydırma sahneleri (DOM) --------------------------------------------------------

function setupScroll() {
  // Raf sahneleri ve aradaki koridor tabelaları tek hikâye: alt çubuk baştan sona saklı, kart çubuğun yerine iner.
  // Final sahnesi de baştan sona hikâye: başlık ve alt çubuk çekilir, sahnenin kendi CTA'ları kalır.
  ScrollTrigger.create({
    trigger: '.ch--final', start: 'top top', end: 'bottom bottom',
    onToggle: (st) => setStoryMode(st.isActive ? true : null),
  });
  const rafs = $$('.ch--raf');
  ScrollTrigger.create({
    trigger: rafs[0], start: 'top+=25% top', endTrigger: rafs.at(-1), end: 'bottom bottom',
    onToggle: (st) => setStoryMode(st.isActive ? true : null),
  });

  // hero: başlık yukarı ve dağılarak çıkar
  gsap.to('.hero', {
    yPercent: -12, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.ch--hero', start: 'top top', end: '55% top', scrub: true },
  });
  gsap.to('.hero__stock, .hint', {
    opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.ch--hero', start: '10% top', end: '35% top', scrub: true },
  });

  // teslimat rotası
  const van = $('[data-van]');
  const timer = $('[data-timer]');
  gsap.set(van, { xPercent: 0 });
  const rtl = gsap.timeline({
    scrollTrigger: { trigger: '[data-rota]', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
  });
  rtl.fromTo('[data-route]', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 1 }, 0)
    .to(van, { motionPath: { path: '[data-route]', align: '[data-route]', alignOrigin: [0.5, 0.5], autoRotate: true }, ease: 'none', duration: 1 }, 0)
    .fromTo({ t: 0 }, { t: 0 }, { t: 45, ease: 'none', duration: 1, onUpdate() { timer.textContent = String(Math.round(this.targets()[0].t)).padStart(2, '0'); } }, 0)
    .to('[data-hedef]', { scale: 1.35, transformOrigin: 'center', duration: 0.08, yoyo: true, repeat: 1 }, 0.95);

  // hakkında metni kelime kelime
  gsap.fromTo('.hakkinda__text .w', { opacity: 0.16 }, {
    opacity: 1, stagger: 0.05, ease: 'none',
    scrollTrigger: { trigger: '.hakkinda__text', start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
  // rakamlar
  $$('[data-num]').forEach((el) => {
    const to = Number(el.dataset.num);
    gsap.fromTo({ v: 0 }, { v: 0 }, {
      v: to, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate() { el.textContent = nf(this.targets()[0].v); },
    });
  });
  // stencil numaraları yazılırken genişlik (stencil boyası iz bırakır)
  gsap.fromTo('.stat', { clipPath: 'inset(0 100% 0 0)' }, {
    clipPath: 'inset(0 0% 0 0)', stagger: 0.12, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.stats', start: 'top 85%', once: true },
  });

  // marka duvarı: etiketler rafa yapışır
  gsap.fromTo('.wtag', { rotateX: -85, opacity: 0, transformOrigin: 'top center' }, {
    rotateX: 0, opacity: 1, stagger: { each: 0.035, from: 'random' }, duration: 0.6, ease: 'back.out(1.6)',
    scrollTrigger: { trigger: '.wall', start: 'top 80%', once: true },
  });

  // galeri: yatay ray
  const track = $('[data-galeri]');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
  gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth + 32), ease: 'none',
    scrollTrigger: { trigger: '.galeri', start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true },
  });
  $$('.gph img').forEach((img) => {
    gsap.fromTo(img, { xPercent: -6 }, {
      xPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.galeri', start: 'top top', end: 'bottom bottom', scrub: true },
    });
  });
  });

  // yorumlar: hızla kayan satır
  gsap.fromTo('[data-yorumlar]', { x: 0 }, {
    x: () => -Math.max(0, $('[data-yorumlar]').scrollWidth - innerWidth + 32), ease: 'none',
    scrollTrigger: { trigger: '.yorumlar', start: 'top 80%', end: 'bottom 20%', scrub: 0.8, invalidateOnRefresh: true },
  });

  // harita yaklaşınca
  ScrollTrigger.create({
    trigger: '.ziyaret', start: 'top 160%', once: true,
    onEnter() {
      $('[data-map-slot]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    },
  });

  // header
  ScrollTrigger.create({
    trigger: '.ch--raf', start: 'top 10%',
    onToggle: (self) => $('[data-top]').classList.toggle('is-solid', self.isActive || self.progress > 0),
    end: () => document.documentElement.scrollHeight,
  });
}

// hız: marquee ve kamera eğimi
function velocityFx(lenis) {
  const inner = $('.marquee__inner');
  let x = 0;
  gsap.ticker.add((_, dt) => {
    velocity = lenis ? lenis.velocity : 0;
    const speed = 0.05 + Math.min(2.5, Math.abs(velocity) * 0.06);
    x -= speed * dt * 0.06 * 60;
    const w = inner.scrollWidth / 2 || 1;
    if (x < -w) x += w;
    inner.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(-velocity * 0.25, -12, 12)}deg)`;
  });
}

// --- Açılış ------------------------------------------------------------------------

const intro = $('[data-intro]');
function runIntro() {
  return new Promise((resolve) => {
    const nameEl = $('[data-intro-name]');
    const pct = $('[data-intro-pct]');
    let done = false;
    const prog = { v: 0 };
    const finish = () => {
      if (done) return;
      done = true;
      tl.kill();
      pct.textContent = '100';
      nameEl.textContent = d.isletme.ad;
      const introTag = $('[data-intro-tag]');
      const heroTag = $('[data-hero-tag]');
      const state = Flip.getState(introTag);
      heroTag.style.visibility = 'hidden';
      // etiket hero'daki yerine uçar
      const r1 = introTag.getBoundingClientRect();
      const r2 = heroTag.getBoundingClientRect();
      gsap.set(introTag, { transformOrigin: '0 0' });
      // perde hemen dokunulmaz olur: etiket uçarken alttaki butonlara dokunulabilir
      intro.style.pointerEvents = 'none';
      gsap.timeline({ onComplete: () => { heroTag.style.visibility = ''; intro.remove(); } })
        .to(intro.querySelector('.intro__skip'), { autoAlpha: 0, duration: 0.15 }, 0)
        .to(intro, { backgroundColor: 'rgba(21,25,30,0)', duration: 0.5, ease: 'power2.inOut' }, 0.05)
        .to(introTag, {
          x: r2.left - r1.left, y: r2.top - r1.top, scaleX: r2.width / r1.width, scaleY: r2.height / r1.height,
          rotate: -2, duration: 0.6, ease: 'power3.inOut',
        }, 0.02);
      resolve();
      void state;
    };
    const tl = gsap.timeline({ onComplete: finish });
    tl.fromTo('.tag--intro .tag__bars i', { scaleY: 0 }, { scaleY: 1, stagger: 0.008, duration: 0.25, ease: 'power2.out' }, 0)
      .fromTo('[data-laser]', { top: '8%' }, { top: '92%', duration: 0.45, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 0.15)
      .add(scramble(nameEl, d.isletme.ad, 0.8), 0.25)
      .to(prog, { v: 100, duration: 1.15, ease: 'power1.inOut', onUpdate: () => (pct.textContent = String(Math.round(prog.v)).padStart(3, '0')) }, 0)
      .to('.tag--intro', { boxShadow: '0 0 0 3px #ee6a24, 0 30px 80px rgba(0,0,0,.5)', duration: 0.1, yoyo: true, repeat: 1 }, 1.15);
    // dokunma, kaydırma ya da tuşla hemen geçilir
    for (const ev of ['pointerdown', 'wheel', 'touchstart', 'keydown']) addEventListener(ev, finish, { once: true, passive: true });
    setTimeout(finish, 1400);
  });
}

function heroIn() {
  const split = new SplitText('.hero__title .line__in', { type: 'chars' });
  gsap.fromTo(split.chars, { yPercent: 115 }, { yPercent: 0, stagger: 0.02, duration: 0.8, ease: 'power4.out' });
  gsap.fromTo('.hero__slogan, .hero__cta, .hero__stock, .hint', { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, delay: 0.3 });
  const st = $('[data-hero-stock]');
  gsap.fromTo({ v: 0 }, { v: 0 }, { v: stokStat.deger, duration: 1.8, delay: 0.3, ease: 'power2.out', onUpdate() { st.textContent = `${nf(this.targets()[0].v)}${stokStat.sonek}`; } });
}

// --- Mikro etkileşimler --------------------------------------------------------------

function cursorAndMagnets() {
  if (!finePointer) return;
  document.body.classList.add('has-cursor');
  const cur = $('[data-cursor]');
  const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  document.addEventListener('pointerover', (e) => cur.classList.toggle('is-link', !!e.target.closest('a, button, input')));
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.3);
      y((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    el.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

// --- Başlat ------------------------------------------------------------------------

(async () => {
  if (reducedMotion) {
    document.documentElement.classList.add('rm');
    document.body.classList.remove('is-loading');
    intro.remove();
    await makeStage();
    stage.set('hero', 0.4);
    stage.snap();
    stage.renderOnce();
    stage.setActive(false);
    $('[data-hero-stock]').textContent = `${nf(stokStat.deger)}${stokStat.sonek}`;
    $$('[data-num]').forEach((el) => (el.textContent = nf(Number(el.dataset.num))));
    $$('[data-stok]').forEach((el) => (el.textContent = nf(Number(el.dataset.stok))));
    ScrollTrigger.create({
      trigger: '.ziyaret', start: 'top 160%', once: true,
      onEnter() {
        $('[data-map-slot]').innerHTML = `<iframe title="${esc(d.isletme.ad)} konumu" src="${mapsEmbed(d)}" loading="lazy"></iframe>`;
      },
    });
    return;
  }
  const lenis = initSmoothScroll();
  lenis?.stop();
  scrollTo(0, 0);
  cursorAndMagnets();
  const stageReady = makeStage();
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 400))]);
  await runIntro();
  await stageReady;
  finalSplit = new SplitText('[data-final-title]', { type: 'chars,words' });
  document.body.classList.remove('is-loading');
  lenis?.start();
  gsap.ticker.add(frame);
  velocityFx(lenis);
  heroIn();
  setupScroll();
  ScrollTrigger.refresh();
})();
