// Karne sayfaları: her sayfa iki tuvale çizilir.
//  base: kâğıt, güvenlik deseni, başlıklar, fotoğraflar (opak)
//  ink : hekimin mavi tükenmez kalemle yazdıkları (yalnızca alfa kullanılır, kaydırdıkça "yazılır")
// Mantıksal ölçü 1000 x 1400; tuval çözünürlüğü dışarıdan verilir.
import { yilEki } from '../../shared/core.js';

export const PW = 1000, PH = 1400;
export const C = {
  paper: '#f7f2e4', paper2: '#efe7d2', line: '#cfc4ea', lilac: '#8f7ff0', indigo: '#1b1450',
  mint: '#43d6b0', mintDk: '#1f9c7e', pink: '#e2306c', ink: '#2743a8', red: '#d8323c', mute: '#6d6689',
};
const F = {
  disp: (s) => `${s}px "Paytone One", "Parkinsans", sans-serif`,
  body: (s, w = 500) => `${w} ${s}px "Parkinsans", system-ui, sans-serif`,
  hand: (s, w = 400) => `${w} ${s}px "Kalam", cursive`,
  mono: (s, w = 400) => `${w} ${s}px "Courier Prime", ui-monospace, monospace`,
};

const up = (s) => s.toLocaleUpperCase('tr');
// Başlık yazısını verilen genişliğe sığdırır (uzun işletme adı / başlık taşmasın)
function fitDisp(x, t, s, maxW) {
  x.font = F.disp(s);
  const w = x.measureText(t).width;
  if (w > maxW) x.font = F.disp(Math.floor(s * maxW / w));
}

function mk(res) {
  const c = document.createElement('canvas');
  c.width = res; c.height = Math.round(res * 1.4);
  const x = c.getContext('2d');
  x.scale(res / PW, res / PW);
  return [c, x];
}

// Kalemle yazı: hafif eğim ve titreme
function hand(x, text, px, py, size = 52, rot = -0.02) {
  x.save();
  x.translate(px, py); x.rotate(rot);
  x.font = F.hand(size, 700);
  x.fillStyle = '#fff';
  x.fillText(text, 0, 0);
  x.restore();
}
function tick(x, px, py, s = 34) {
  x.save();
  x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(px - s * 0.45, py);
  x.quadraticCurveTo(px - s * 0.2, py + s * 0.25, px - s * 0.08, py + s * 0.42);
  x.quadraticCurveTo(px + s * 0.2, py - s * 0.3, px + s * 0.62, py - s * 0.6);
  x.stroke();
  x.restore();
}
function underline(x, x0, x1, y) {
  x.save();
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.lineCap = 'round';
  x.beginPath(); x.moveTo(x0, y); x.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + 6, x0 + (x1 - x0) * 0.7, y - 7, x1, y + 2); x.stroke();
  x.restore();
}

function rr(x, px, py, w, h, r) {
  x.beginPath(); x.roundRect(px, py, w, h, r);
}

function wrap(x, text, px, py, maxW, lh, maxLines = 99) {
  const words = String(text).split(/\s+/);
  let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const t = line ? `${line} ${words[i]}` : words[i];
    if (x.measureText(t).width > maxW && line) {
      x.fillText(n === maxLines - 1 ? `${line}…` : line, px, py + n * lh);
      n++; line = words[i];
      if (n >= maxLines) return n;
    } else line = t;
  }
  if (line) { x.fillText(line, px, py + n * lh); n++; }
  return n;
}

// Pasaport tipi güvenlik deseni (guilloche)
function guilloche(x, color, alpha, seed = 0) {
  x.save();
  x.globalAlpha = alpha; x.strokeStyle = color; x.lineWidth = 1.6;
  for (let k = 0; k < 26; k++) {
    x.beginPath();
    for (let i = 0; i <= 120; i++) {
      const px = (i / 120) * PW;
      const py = 120 + k * 50 + Math.sin(i * 0.19 + k * 0.5 + seed) * 22 + Math.sin(i * 0.051 + seed * 2) * 30;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  x.restore();
}
function rosette(x, cx, cy, r, color, alpha) {
  x.save();
  x.globalAlpha = alpha; x.strokeStyle = color; x.lineWidth = 1.4;
  for (let k = 0; k < 18; k++) {
    x.beginPath();
    for (let i = 0; i <= 200; i++) {
      const a = (i / 200) * Math.PI * 2;
      const rr2 = r * (0.62 + 0.38 * Math.cos(a * 9 + k * 0.35)) * (0.7 + k * 0.018);
      const px = cx + Math.cos(a + k * 0.09) * rr2, py = cy + Math.sin(a + k * 0.09) * rr2;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  x.restore();
}

export function drawPaw(x, cx, cy, s, color) {
  x.save();
  x.translate(cx, cy); x.scale(s / 100, s / 100);
  x.fillStyle = color;
  x.beginPath(); x.ellipse(0, 18, 30, 25, 0, 0, Math.PI * 2); x.fill();
  for (const [px, py, rx, ry, r] of [[-34, -16, 11, 15, -0.35], [-12, -34, 11, 15, -0.1], [12, -34, 11, 15, 0.1], [34, -16, 11, 15, 0.35]]) {
    x.beginPath(); x.ellipse(px, py, rx, ry, r, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

function paper(x, d, pageNo, seed) {
  x.fillStyle = C.paper; x.fillRect(0, 0, PW, 1400);
  // ince lif dokusu
  x.save(); x.globalAlpha = 0.05; x.fillStyle = '#7a6a40';
  let r = 12345 + seed * 97;
  for (let i = 0; i < 900; i++) {
    r = (r * 16807) % 2147483647;
    const px = (r % 1000), py = ((r >> 3) % 1400);
    x.fillRect(px, py, 2 + (i % 3), 1);
  }
  x.restore();
  guilloche(x, C.lilac, 0.16, seed);
  x.save(); x.strokeStyle = C.line; x.lineWidth = 3; rr(x, 34, 34, PW - 68, 1400 - 68, 26); x.stroke(); x.restore();
  x.fillStyle = C.mute; x.font = F.mono(24, 700);
  x.fillText(up(`Sağlık karnesi · ${d.isletme.ad}`).slice(0, 44), 70, 92);
  x.textAlign = 'right'; x.fillText(`S. ${String(pageNo).padStart(2, '0')}`, PW - 70, 92); x.textAlign = 'left';
  x.fillRect(70, 110, PW - 140, 2);
}

function heading(x, no, kicker, title, y = 190) {
  x.fillStyle = C.indigo; rr(x, 70, y - 50, 116, 64, 18); x.fill();
  x.fillStyle = C.mint; x.font = F.disp(46); x.fillText(no, 90, y + 2);
  x.fillStyle = C.lilac; x.font = F.mono(26, 700); x.fillText(up(kicker), 210, y - 14);
  x.fillStyle = C.indigo; fitDisp(x, title, 74, PW - 150);
  x.fillText(title, 70, y + 104);
}

function photo(x, img, px, py, w, h, rot = 0, tape = true) {
  x.save();
  x.translate(px + w / 2, py + h / 2); x.rotate(rot);
  x.shadowColor = 'rgba(40,30,80,.25)'; x.shadowBlur = 24; x.shadowOffsetY = 10;
  x.fillStyle = '#fff'; x.fillRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28);
  x.shadowColor = 'transparent';
  if (img) {
    const ir = img.naturalWidth / img.naturalHeight, br = w / h;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > br) { sw = sh * br; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / br; sy = (img.naturalHeight - sh) * 0.35; }
    x.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  } else { x.fillStyle = C.paper2; x.fillRect(-w / 2, -h / 2, w, h); }
  if (tape) {
    x.fillStyle = 'rgba(67,214,176,.55)';
    x.save(); x.translate(-w / 2 + 20, -h / 2 - 4); x.rotate(-0.6); x.fillRect(-60, -18, 120, 36); x.restore();
    x.save(); x.translate(w / 2 - 20, -h / 2 - 4); x.rotate(0.6); x.fillRect(-60, -18, 120, 36); x.restore();
  }
  x.restore();
}

function field(b, k, label, py, value, px = 70, w = PW - 140, size = 50) {
  b.fillStyle = C.mute; b.font = F.mono(24, 700); b.fillText(up(label), px, py);
  b.fillStyle = C.line; b.fillRect(px, py + 66, w, 3);
  if (value) hand(k, value, px + 6, py + 54, size, -0.012);
}

function box(b, px, py, s = 44) {
  b.save(); b.strokeStyle = C.indigo; b.lineWidth = 3.5; rr(b, px, py, s, s, 8); b.stroke(); b.restore();
}

// --- Sayfalar -------------------------------------------------------------

// Kapak ve ilk açılan iki sayfa (kimlik, muayene). upto ile daha azı çizilebilir.
export function buildPages(d, img, res, onStep, upto = Infinity) {
  const pages = [];
  const layout = { stamps: [], tags: {} };
  const add = (fn) => { if (pages.length >= upto) return; const [bc, b] = mk(res); const [kc, k] = mk(res); fn(b, k); pages.push({ base: bc, ink: kc }); onStep?.(pages.length); };
  const byId = Object.fromEntries(d.hizmetler.map((h) => [h.id, h]));
  const yil = d.isletme.kurulus;

  // 0: Kapak
  add((b) => {
    const g = b.createLinearGradient(0, 0, PW, 1400);
    g.addColorStop(0, '#4fe0bb'); g.addColorStop(1, '#2fbf98');
    b.fillStyle = g; b.fillRect(0, 0, PW, 1400);
    b.save(); b.globalAlpha = 0.09;
    for (let yy = 0; yy < 14; yy++) for (let xx = 0; xx < 8; xx++) drawPaw(b, 60 + xx * 130 + (yy % 2) * 65, 60 + yy * 110, 38, '#0f4f40');
    b.restore();
    rosette(b, PW / 2, 600, 300, '#ffffff', 0.18);
    b.fillStyle = C.indigo; b.beginPath(); b.arc(PW / 2, 600, 190, 0, Math.PI * 2); b.fill();
    b.strokeStyle = '#f5e7b8'; b.lineWidth = 6; b.beginPath(); b.arc(PW / 2, 600, 168, 0, Math.PI * 2); b.stroke();
    drawPaw(b, PW / 2, 610, 210, '#f5e7b8');
    b.textAlign = 'center';
    b.fillStyle = C.indigo; b.font = F.mono(34, 700); b.fillText('KEDİ · KÖPEK', PW / 2, 190);
    fitDisp(b, 'KARNESİ', 112, PW - 200); b.fillText('SAĞLIK', PW / 2, 960); b.fillText('KARNESİ', PW / 2, 1080);
    b.fillStyle = 'rgba(27,20,80,.9)'; rr(b, 90, 1160, PW - 180, 130, 22); b.fill();
    b.fillStyle = '#f5e7b8'; fitDisp(b, d.isletme.ad, 58, PW - 240);
    b.fillText(d.isletme.ad, PW / 2, 1222);
    b.font = F.mono(26, 700); b.fillStyle = C.mint; b.fillText(`ETİMESGUT · ${yil}`, PW / 2, 1264);
    b.textAlign = 'left';
  });

  // 1: Kimlik (kapak içi)
  add((b, k) => {
    paper(b, d, 1, 1);
    heading(b, '01', 'Kimlik sayfası', 'Bu karne kimin?');
    photo(b, img.kedi, 90, 360, 330, 420, -0.04);
    b.save(); b.translate(600, 560); b.rotate(0.1);
    rosette(b, 0, 0, 170, C.lilac, 0.35); b.restore();
    field(b, k, 'Türü', 380, 'Kedi', 490, 440);
    field(b, k, 'Irkı', 490, 'Tekir', 490, 440);
    field(b, k, 'Karne açılışı', 600, 'İlk muayenede', 490, 440, 44);
    field(b, k, 'Klinik', 850, d.isletme.ad, 70, PW - 140, 48);
    field(b, k, 'Telefon', 970, d.iletisim.telefon, 70, 420);
    field(b, k, 'Hizmette', 970, `${yilEki(yil)} beri`, 530, 400);
    b.fillStyle = C.mute; b.font = F.body(30, 500);
    wrap(b, 'Muayene, aşı ve tahliller bu karneye ve klinik kaydına birlikte işlenir.', 70, 1150, PW - 140, 42, 3);
    drawPaw(b, 880, 1290, 70, 'rgba(143,127,240,.35)');
    layout.tags.karne = [0.7, 0.17];
  });

  // 2: Muayene
  add((b, k) => {
    paper(b, d, 2, 2);
    const h = byId.muayene;
    heading(b, '02', h.sure, h.baslik);
    photo(b, img.steteskop, 90, 360, 820, 400, 0.015);
    const list = d.muayeneListesi;
    list.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const px = 80 + col * 440, py = 850 + row * 108;
      box(b, px, py, 48);
      b.fillStyle = C.indigo; b.font = F.body(38, 600); b.fillText(t, px + 70, py + 38);
      tick(k, px + 22, py + 22, 40);
    });
    hand(k, 'Bulgular anlatıldı.', 90, 1305, 50, -0.03);
    underline(k, 90, 470, 1320);
    layout.tags.muayene = [0.5, 0.42];
  });

  // 3–10: açılış sahnesinde görünmeyen sayfalar çizilmez (karne yalnız ilk açılışta gösterilir).

  return { pages, layout };
}

export function pawSprite(res = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = res;
  const x = c.getContext('2d');
  drawPaw(x, res / 2, res / 2 + 4, res * 0.78, '#fff');
  return c;
}
