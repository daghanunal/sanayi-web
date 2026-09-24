// Karne sayfaları: her sayfa iki tuvale çizilir.
//  base: kâğıt, güvenlik deseni, başlıklar, fotoğraflar (opak)
//  ink : hekimin mavi tükenmez kalemle yazdıkları (yalnızca alfa kullanılır, kaydırdıkça "yazılır")
// Mantıksal ölçü 1000 x 1400; tuval çözünürlüğü dışarıdan verilir.

export const PW = 1000, PH = 1400;
export const C = {
  paper: '#f7f2e4', paper2: '#efe7d2', line: '#cfc4ea', lilac: '#8f7ff0', indigo: '#1b1450',
  mint: '#43d6b0', mintDk: '#1f9c7e', pink: '#e2306c', ink: '#2743a8', red: '#d8323c', mute: '#6d6689',
};
const F = {
  disp: (s) => `${s}px "Lilita One", "Parkinsans", sans-serif`,
  body: (s, w = 500) => `${w} ${s}px "Parkinsans", system-ui, sans-serif`,
  hand: (s, w = 400) => `${w} ${s}px "Kalam", cursive`,
  mono: (s, w = 400) => `${w} ${s}px "Courier Prime", ui-monospace, monospace`,
};

const up = (s) => s.toLocaleUpperCase('tr');

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
function scribbleCircle(x, cx, cy, rx, ry) {
  x.save();
  x.strokeStyle = '#fff'; x.lineWidth = 6; x.lineCap = 'round';
  x.beginPath();
  for (let i = 0; i <= 80; i++) {
    const a = -0.4 + (i / 80) * Math.PI * 2.15;
    const k = 1 + Math.sin(i * 0.7) * 0.02 + i * 0.0006;
    const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
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
  x.fillStyle = C.indigo; x.font = F.disp(78);
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

export function buildPages(d, img, res, onStep) {
  const pages = [];
  const layout = { stamps: [], tags: {} };
  const add = (fn) => { const [bc, b] = mk(res); const [kc, k] = mk(res); fn(b, k); pages.push({ base: bc, ink: kc }); onStep?.(pages.length); };
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
    b.font = F.disp(118); b.fillText('SAĞLIK', PW / 2, 960); b.fillText('KARNESİ', PW / 2, 1080);
    b.fillStyle = 'rgba(27,20,80,.9)'; rr(b, 90, 1160, PW - 180, 130, 22); b.fill();
    b.fillStyle = '#f5e7b8'; b.font = F.disp(Math.min(62, 1500 / Math.max(10, d.isletme.ad.length)));
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
    field(b, k, 'Hizmette', 970, `${yil}'den beri`, 530, 400);
    b.fillStyle = C.mute; b.font = F.body(30, 500);
    wrap(b, 'Muayene, aşı ve tahliller bu karneye ve klinik kaydına birlikte işlenir.', 70, 1150, PW - 140, 42, 3);
    drawPaw(b, 880, 1290, 70, 'rgba(143,127,240,.35)');
    layout.tags.karne = [0.25, 0.72];
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

  // 3: Aşı takvimi (mühürler buraya basılır)
  add((b, k) => {
    paper(b, d, 3, 3);
    const h = byId.asi;
    heading(b, '03', h.sure, h.baslik);
    const top = 380;
    b.fillStyle = C.indigo; rr(b, 70, top, PW - 140, 70, 14); b.fill();
    b.fillStyle = '#f5e7b8'; b.font = F.mono(26, 700);
    b.fillText('AŞI', 96, top + 46); b.fillText('TARİH', 400, top + 46); b.fillText('MÜHÜR', 690, top + 46);
    d.asiSatirlari.forEach((t, i) => {
      const py = top + 90 + i * 220;
      b.fillStyle = i % 2 ? 'rgba(179,166,255,.12)' : 'rgba(67,214,176,.10)';
      b.fillRect(70, py, PW - 140, 210);
      b.strokeStyle = C.line; b.lineWidth = 2; b.strokeRect(70, py, PW - 140, 210);
      b.beginPath(); b.moveTo(370, py); b.lineTo(370, py + 210); b.moveTo(640, py); b.lineTo(640, py + 210); b.stroke();
      b.fillStyle = C.indigo; b.font = F.body(36, 700); wrap(b, t, 96, py + 90, 250, 44, 2);
      hand(k, ['Muayene ile', 'Hekim yazar', 'Her yıl'][i] ?? '', 390, py + 100, 40, -0.03);
      hand(k, '__ / __ / ____', 390, py + 160, 36, 0);
      layout.stamps.push({ side: 3, u: 0.775, v: 1 - (py + 105) / 1400, r: 0.14, cell: i % 3, rot: [-0.3, 0.22, -0.08][i] });
    });
    b.fillStyle = C.mute; b.font = F.body(28, 500);
    wrap(b, 'Aşıdan önce kısa bir muayene yapılır; sonraki tarih karneye yazılır.', 70, 1180, PW - 140, 40, 3);
    layout.tags.asi = [0.77, 0.6];
  });

  // 4: Hatırlatma
  add((b, k) => {
    paper(b, d, 4, 4);
    heading(b, '04', 'WhatsApp hatırlatma', 'Sonraki aşı');
    b.fillStyle = C.mute; b.font = F.mono(26, 700); b.fillText('TARİH', 90, 400);
    hand(k, 'Günü gelince', 90, 500, 74, -0.04);
    hand(k, 'haber verilecek!', 110, 590, 74, -0.04);
    scribbleCircle(k, 420, 520, 380, 130);
    // Telefon balonu
    b.save(); b.translate(150, 720);
    b.fillStyle = '#1b1450'; rr(b, 0, 0, 700, 520, 44); b.fill();
    b.fillStyle = '#2a2168'; rr(b, 24, 24, 652, 80, 22); b.fill();
    b.fillStyle = C.mint; b.beginPath(); b.arc(78, 64, 26, 0, Math.PI * 2); b.fill();
    drawPaw(b, 78, 66, 30, '#1b1450');
    b.fillStyle = '#fff'; b.font = F.body(30, 700); b.fillText(d.isletme.ad.slice(0, 26), 120, 74);
    b.fillStyle = '#e8fff7'; rr(b, 40, 140, 540, 220, 26); b.fill();
    b.fillStyle = C.indigo; b.font = F.body(32, 600);
    wrap(b, 'Merhaba, dostunuzun aşı günü yaklaştı. Size uygun saati yazar mısınız?', 70, 200, 480, 44, 4);
    b.fillStyle = '#43d6b0'; rr(b, 250, 390, 330, 90, 26); b.fill();
    b.fillStyle = C.indigo; b.font = F.body(32, 700); b.fillText('Yarın 10:30 olur', 280, 447);
    b.restore();
    layout.tags.hatirlatma = [0.5, 0.35];
  });

  // 5: Laboratuvar
  add((b, k) => {
    paper(b, d, 5, 5);
    const h = byId.laboratuvar;
    heading(b, '05', h.sure, 'Tahlil');
    photo(b, img.kan, 90, 360, 360, 470, -0.03);
    const bars = [['Hemogram', 0.72], ['Biyokimya', 0.58], ['Karaciğer', 0.64], ['Böbrek', 0.5]];
    bars.forEach(([t, v], i) => {
      const py = 400 + i * 108;
      b.fillStyle = C.indigo; b.font = F.body(30, 700); b.fillText(t, 520, py);
      b.fillStyle = 'rgba(27,20,80,.1)'; rr(b, 520, py + 18, 380, 26, 13); b.fill();
      b.fillStyle = i % 2 ? C.lilac : C.mint; rr(b, 520, py + 18, 380 * v, 26, 13); b.fill();
    });
    b.fillStyle = C.mute; b.font = F.mono(24, 700); b.fillText('KLİNİKTEKİ CİHAZDA', 520, 850);
    field(b, k, 'Sonuç', 930, 'Aynı ziyarette', 70, PW - 140, 58);
    field(b, k, 'Dış laboratuvar', 1060, "WhatsApp'tan iletilir", 70, PW - 140, 50);
    hand(k, 'Değerler ekranda gösterildi.', 80, 1290, 44, -0.02);
    layout.tags.laboratuvar = [0.25, 0.6];
  });

  // 6: Kısırlaştırma
  add((b, k) => {
    paper(b, d, 6, 6);
    const h = byId.kisirlastirma;
    heading(b, '06', 'Yarım gün', h.baslik);
    const steps = d.kisirAdimlari;
    const x0 = 170;
    b.strokeStyle = C.lilac; b.lineWidth = 6; b.setLineDash([2, 16]); b.lineCap = 'round';
    b.beginPath(); b.moveTo(x0, 420); b.lineTo(x0, 420 + (steps.length - 1) * 150); b.stroke(); b.setLineDash([]);
    steps.forEach((t, i) => {
      const py = 420 + i * 150;
      b.fillStyle = i === 2 ? C.pink : C.indigo; b.beginPath(); b.arc(x0, py, 40, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#fff'; b.font = F.disp(40); b.textAlign = 'center'; b.fillText(String(i + 1), x0, py + 14); b.textAlign = 'left';
      b.fillStyle = C.indigo; b.font = F.body(42, 700); b.fillText(t, 250, py + 14);
      tick(k, 880, py - 4, 44);
    });
    hand(k, 'Evde bakım notu yazılı verildi.', 80, 1230, 46, -0.02);
    underline(k, 80, 700, 1248);
    layout.tags.kisirlastirma = [0.5, 0.52];
  });

  // 7: Diş taşı
  add((b, k) => {
    paper(b, d, 7, 7);
    const h = byId.dis;
    heading(b, '07', h.sure, h.baslik);
    photo(b, img.agiz, 90, 360, 820, 380, 0.012);
    // Köpek diş şeması (üst çene yayı)
    const cx = 500, cy = 1190;
    b.strokeStyle = C.line; b.lineWidth = 3;
    b.beginPath(); b.ellipse(cx, cy, 360, 300, 0, Math.PI, Math.PI * 2); b.stroke();
    for (let i = 0; i < 20; i++) {
      const a = Math.PI + (i + 0.5) / 20 * Math.PI;
      const px = cx + Math.cos(a) * 360, py = cy + Math.sin(a) * 300;
      const big = i === 3 || i === 16;
      b.fillStyle = '#fff'; b.strokeStyle = C.indigo; b.lineWidth = 3;
      b.beginPath(); b.ellipse(px, py, big ? 22 : 16, big ? 30 : 20, a + Math.PI / 2, 0, Math.PI * 2); b.fill(); b.stroke();
      if ([6, 7, 12, 13].includes(i)) { k.fillStyle = '#fff'; k.beginPath(); k.arc(px, py, 12, 0, Math.PI * 2); k.fill(); }
    }
    b.fillStyle = C.mute; b.font = F.mono(24, 700); b.textAlign = 'center'; b.fillText('ÜST ÇENE', cx, cy - 40); b.textAlign = 'left';
    hand(k, 'Ağız muayenesi yapıldı.', 110, 830, 50, -0.03);
    hand(k, 'Temizlik sedasyon altında.', 110, 910, 50, -0.03);
    layout.tags.dis = [0.5, 0.25];
  });

  // 8: Bakım
  add((b, k) => {
    paper(b, d, 8, 8);
    const h = byId.bakim;
    heading(b, '08', h.sure, 'Bakım');
    photo(b, img.sefkat, 540, 360, 360, 480, 0.04);
    d.bakimListesi.forEach((t, i) => {
      const py = 390 + i * 120;
      box(b, 80, py, 50);
      b.fillStyle = C.indigo; b.font = F.body(34, 600); wrap(b, t, 150, py + 38, 340, 40, 2);
      tick(k, 104, py + 24, 42);
    });
    field(b, k, 'Yaşlı ve huzursuz dostlar', 930, 'Acele etmeden, birkaç aşamada', 70, PW - 140, 46);
    hand(k, 'Hiç zorlamadan.', 90, 1200, 60, -0.04);
    drawPaw(b, 820, 1210, 110, 'rgba(67,214,176,.45)');
    layout.tags.bakim = [0.72, 0.62];
  });

  // 9: Acil
  add((b, k) => {
    paper(b, d, 9, 9);
    b.fillStyle = C.red; rr(b, 70, 140, PW - 140, 470, 34); b.fill();
    b.fillStyle = '#fff'; b.font = F.mono(30, 700); b.fillText('09 · ACİL DURUM', 110, 215);
    b.font = F.disp(104); b.fillText('Önce arayın.', 110, 340);
    b.font = F.disp(Math.min(96, 1250 / Math.max(8, d.iletisim.telefon.length))); b.fillText(d.iletisim.telefon, 110, 480);
    b.font = F.body(30, 600); b.fillText('Hekimimiz telefonda ilk yapılacakları söyler.', 110, 560);
    d.acilListesi.forEach((t, i) => {
      const py = 700 + i * 104;
      b.fillStyle = C.red; b.beginPath(); b.arc(100, py - 12, 14, 0, Math.PI * 2); b.fill();
      b.fillStyle = C.indigo; b.font = F.body(42, 700); b.fillText(t, 140, py);
    });
    hand(k, 'Yola çıkmadan önce ara!', 90, 1290, 58, -0.03);
    underline(k, 90, 700, 1306);
    layout.tags.acil = [0.5, 0.84];
  });

  // 10: Randevu (arka kapak içi)
  add((b, k) => {
    paper(b, d, 10, 10);
    heading(b, '10', 'Randevu', 'Sıradaki sayfa');
    b.fillStyle = C.mute; b.font = F.mono(24, 700); b.fillText('ÇALIŞMA SAATLERİ', 70, 390);
    const g = d.__saatler || [];
    g.forEach(([gun, saat], i) => {
      const py = 460 + i * 86;
      b.fillStyle = C.indigo; b.font = F.body(36, 700); b.fillText(gun, 70, py);
      b.textAlign = 'right'; b.fillStyle = saat === 'Kapalı' ? C.red : C.mintDk; b.fillText(saat, PW - 70, py); b.textAlign = 'left';
      b.fillStyle = C.line; b.fillRect(70, py + 26, PW - 140, 2);
    });
    const yy = 460 + g.length * 86 + 60;
    field(b, k, 'Telefon', yy, d.iletisim.telefon, 70, PW - 140, 60);
    b.fillStyle = C.mute; b.font = F.mono(24, 700); b.fillText('ADRES', 70, yy + 170);
    b.fillStyle = C.indigo; b.font = F.body(32, 600); wrap(b, d.iletisim.adres, 70, yy + 220, PW - 140, 44, 3);
    hand(k, 'Görüşmek üzere!', 540, 1310, 56, -0.05);
    layout.tags.randevu = [0.5, 0.5];
  });

  return { pages, layout };
}

// Mühür atlası: 3 hücre (aşı yapıldı, tekrar, yıllık)
export function stampAtlas(res = 384) {
  const c = document.createElement('canvas');
  c.width = res * 3; c.height = res;
  const x = c.getContext('2d');
  const labels = [['AŞI', 'YAPILDI'], ['TEKRAR', 'DOZU'], ['YILLIK', 'KONTROL']];
  labels.forEach(([a, b2], i) => {
    x.save();
    x.translate(res * i + res / 2, res / 2);
    const s = res / 400;
    x.scale(s, s);
    x.strokeStyle = '#fff'; x.fillStyle = '#fff';
    x.lineWidth = 14; x.beginPath(); x.arc(0, 0, 180, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 150, 0, Math.PI * 2); x.stroke();
    x.font = F.disp(64); x.textAlign = 'center'; x.fillText(a, 0, -40);
    x.font = F.mono(40, 700); x.fillText(b2, 0, 100);
    drawPaw(x, 0, 30, 60, '#fff');
    // yıldızlar
    for (const sx of [-110, 110]) { x.beginPath(); x.arc(sx, 30, 9, 0, Math.PI * 2); x.fill(); }
    x.restore();
  });
  // eskitme: rastgele boşluklar
  x.globalCompositeOperation = 'destination-out';
  let r = 777;
  for (let i = 0; i < 1400; i++) {
    r = (r * 16807) % 2147483647;
    x.globalAlpha = 0.3 + (r % 100) / 160;
    x.beginPath(); x.arc(r % c.width, (r >> 4) % c.height, 1 + (r % 5), 0, Math.PI * 2); x.fill();
  }
  return c;
}

export function pawSprite(res = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = res;
  const x = c.getContext('2d');
  drawPaw(x, res / 2, res / 2 + 4, res * 0.78, '#fff');
  return c;
}
