// Krank mili teknik resmi (yan görünüş). Tek SVG; animasyon için sınıflara ayrılmış katmanlar:
// .ol  parça dış hatları (DrawSVG)     .cl  eksen çizgileri (soldan açılır)
// .dim ölçü çizgileri (DrawSVG)        .arr ok uçları, .dt ölçü yazıları, .sym yüzey işaretleri (belirir)
// Ölçü değerleri temsilîdir; çizimin altında not var.

const CY = 200; // ana eksen
const MAIN_R = 34;
const PIN_R = 28;
const OFFSET = 58; // strok / 2 (çizim birimi)
const DIRS = [-1, 1, 1, -1]; // 4 silindir: 1 ve 4 yukarıda, 2 ve 3 aşağıda

const rect = (x, y, w, h, cls = 'ol', rx = 0) =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} />`;
const line = (x1, y1, x2, y2, cls = 'dim') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
// Ok ucu: (x,y) ucun konumu, açı derece cinsinden (0 = sağa bakar)
const arrow = (x, y, deg) =>
  `<path class="arr" d="M0 0 L-11 -3.6 L-11 3.6 Z" transform="translate(${x} ${y}) rotate(${deg})" />`;
const text = (x, y, s, cls = 'dt', anchor = 'middle', rot = 0) =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`;

// Yüzey pürüzlülüğü işareti (√ biçimli) ve Ra değeri
const finish = (x, y, ra) =>
  `<g class="sym" transform="translate(${x} ${y})"><path d="M0 0 L7 12 L20 -14 H40" /><text x="22" y="-18" class="dt dt--s">Ra ${ra}</text></g>`;

export function crankSVG() {
  const parts = [];
  const pins = [];
  const mains = [];

  // Ön uç (kasnak tarafı) ve 1. ana muylu
  parts.push(rect(60, CY - 22, 60, 44));
  parts.push(`<path class="ol" d="M78 ${CY - 22} v-6 h24 v6" />`); // kama yuvası
  mains.push({ x: 120, w: 50 });

  let x0 = 170;
  DIRS.forEach((dir) => {
    const pinY = CY + dir * OFFSET;
    // Kol (web) + karşı ağırlık: pimin ters tarafına taşar
    const top = dir < 0 ? pinY - 40 : CY - 74;
    const bot = dir < 0 ? CY + 74 : pinY + 40;
    parts.push(rect(x0, top, 18, bot - top, 'ol', 7));
    pins.push({ x: x0 + 18, w: 48, y: pinY });
    parts.push(rect(x0 + 66, top, 18, bot - top, 'ol', 7));
    mains.push({ x: x0 + 84, w: 50 });
    x0 += 134;
  });

  // Volan flanşı ve arka uç
  parts.push(rect(x0, CY - 72, 34, 144, 'ol', 3));
  parts.push(rect(x0 + 34, CY - 30, 28, 60));
  const end = x0 + 62;

  mains.forEach((m) => parts.push(rect(m.x, CY - MAIN_R, m.w, MAIN_R * 2)));
  pins.forEach((p) => parts.push(rect(p.x, p.y - PIN_R, p.w, PIN_R * 2)));

  // Eksen çizgileri: ana eksen ve her pimin ekseni
  const axes = [line(40, CY, end + 24, CY, 'cl')];
  pins.forEach((p) => axes.push(line(p.x - 8, p.y, p.x + p.w + 8, p.y, 'cl cl--s')));

  // --- Ölçüler ---
  const dims = [];
  const arrs = [];
  const txt = [];

  // Ana muylu çapı (2. muylu), sol alta çıkış çizgisiyle
  const m2 = mains[1];
  const mx = m2.x + m2.w / 2;
  dims.push(line(mx, CY - MAIN_R, mx, CY + MAIN_R));
  arrs.push(arrow(mx, CY - MAIN_R, -90), arrow(mx, CY + MAIN_R, 90));
  dims.push(line(mx, CY + MAIN_R, mx - 26, CY + 118), line(mx - 26, CY + 118, mx - 176, CY + 118));
  txt.push(text(mx - 172, CY + 112, 'Ø54,000', 'dt', 'start'));
  txt.push(text(mx - 94, CY + 112, '−0,005', 'dt dt--tol', 'start'));

  // Kol muylu çapı (1. pim, yukarıda), yukarı çıkış çizgisiyle
  const p1 = pins[0];
  const px = p1.x + p1.w / 2;
  dims.push(line(px, p1.y - PIN_R, px, p1.y + PIN_R));
  arrs.push(arrow(px, p1.y - PIN_R, -90), arrow(px, p1.y + PIN_R, 90));
  dims.push(line(px, p1.y - PIN_R, px + 30, 58), line(px + 30, 58, px + 156, 58));
  txt.push(text(px + 34, 52, 'Ø48,000', 'dt', 'start'));
  txt.push(text(px + 112, 52, '−0,005', 'dt dt--tol', 'start'));

  // Strok: 4. pim ekseni ile ana eksen arası (sağda dikey ölçü)
  const p4 = pins[3];
  const sx = p4.x + p4.w + 30;
  dims.push(line(p4.x + p4.w + 10, p4.y, sx + 10, p4.y), line(sx, p4.y, sx, CY));
  arrs.push(arrow(sx, p4.y, -90), arrow(sx, CY, 90));
  txt.push(text(sx - 8, (p4.y + CY) / 2 + 4, 'R 40,5', 'dt', 'end'));

  // Toplam boy (altta)
  const ly = CY + 150;
  dims.push(line(60, CY + 26, 60, ly + 10), line(end, CY + 34, end, ly + 10), line(60, ly, end, ly));
  arrs.push(arrow(60, ly, 180), arrow(end, ly, 0));
  txt.push(text((60 + end) / 2, ly - 8, 'L = 468,0 ±0,2'));

  // Yüzey işaretleri ve detay dairesi
  const sym = [
    finish(mains[2].x + 6, CY - MAIN_R - 6, '0,2'),
    finish(pins[2].x + 4, pins[2].y + PIN_R + 30, '0,2'),
    `<g class="sym"><circle cx="${mains[0].x + mains[0].w / 2}" cy="${CY}" r="50" class="det" /><text x="${mains[0].x - 12}" y="${CY - 50}" class="dt dt--det">A</text></g>`,
  ];

  return `<svg class="crank" viewBox="20 20 800 380" role="img" aria-label="Dört silindirli krank milinin ölçülendirilmiş yan görünüşü">
    <g class="crank__parts">${parts.join('')}</g>
    <g class="crank__axes">${axes.join('')}</g>
    <g class="crank__dims">${dims.join('')}</g>
    <g class="crank__arrs">${arrs.join('')}</g>
    <g class="crank__syms">${sym.join('')}</g>
    <g class="crank__txt">${txt.join('')}</g>
  </svg>`;
}

// Telefonda çizimin sol yarısını (ön uç + iki kol) büyük gösteririz.
export const VIEWBOX = { wide: '20 20 800 380', narrow: '36 26 470 360' };

// Süreç bölümü: zincir ölçülendirme (|—1—|—2—|—3—|—4—|)
export function chainSVG(n) {
  const w = 1000;
  const seg = (w - 40) / n;
  let s = line(20, 20, w - 20, 20, 'dim chain__line');
  for (let i = 0; i <= n; i++) {
    const x = 20 + i * seg;
    s += line(x, 6, x, 34, 'dim chain__tick');
  }
  return s;
}
