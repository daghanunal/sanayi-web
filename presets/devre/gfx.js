// Devre presetinin çizimleri: gösterge paneli ikonları, kadranlar, 7 segment ekran, bıçak sigorta.

const S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';

// Gösterge paneli uyarı lambaları. ariza: true olanlar kontak testinden sonra yanık kalır.
export const LAMBALAR = [
  {
    id: 'motor', ad: 'Motor arıza lambası', renk: 'amber', ariza: true,
    svg: `<path ${S} d="M7 21h4v-4h7v-4h11v4h5l4 5h2v-3h4v14h-4v-3h-2l-4 5H17l-4-4h-2v4H7z"/>`,
  },
  {
    id: 'aku', ad: 'Şarj uyarı lambası', renk: 'red', ariza: true,
    svg: `<rect ${S} x="6" y="14" width="36" height="24" rx="2"/><path ${S} d="M11 14v-4h7v4M30 14v-4h7v4M12 26h7M29 26h7M32.5 22.5v7"/>`,
  },
  {
    id: 'abs', ad: 'ABS uyarı lambası', renk: 'amber', ariza: true,
    svg: `<circle ${S} cx="24" cy="24" r="13"/><path ${S} d="M7 14a18 18 0 0 0 0 20M41 14a18 18 0 0 1 0 20"/><text x="24" y="28" text-anchor="middle" font-size="10.5" font-weight="800" fill="currentColor" font-family="Archivo, sans-serif">ABS</text>`,
  },
  {
    id: 'yag', ad: 'Yağ basıncı lambası', renk: 'red',
    svg: `<path ${S} d="M5 20h7l3-3h11l4 3 12-5-9 14H13l-3-5H5zM20 17v-4M16 13h8"/><path fill="currentColor" d="M42 30c0 2.2-1.3 3.6-2.8 3.6S36.4 32.2 36.4 30c0-1.8 2.8-5 2.8-5s2.8 3.2 2.8 5z"/>`,
  },
  {
    id: 'fren', ad: 'Fren uyarı lambası', renk: 'red',
    svg: `<circle ${S} cx="24" cy="24" r="13"/><path ${S} d="M7 14a18 18 0 0 0 0 20M41 14a18 18 0 0 1 0 20M24 16v10"/><circle fill="currentColor" cx="24" cy="31.5" r="2"/>`,
  },
  {
    id: 'hararet', ad: 'Hararet lambası', renk: 'red',
    svg: `<path ${S} d="M24 7v19M28 11h5M28 16h5M28 21h5"/><circle ${S} cx="24" cy="30" r="4.5"/><path ${S} d="M7 40c3-2.5 5.5 2.5 8.5 0s5.5 2.5 8.5 0 5.5 2.5 8.5 0 5.5 2.5 8.5 0"/>`,
  },
  {
    id: 'lastik', ad: 'Lastik basıncı lambası', renk: 'amber',
    svg: `<path ${S} d="M13 11c-5 6-5 20 0 26h22c5-6 5-20 0-26M11 41h26M24 17v10"/><circle fill="currentColor" cx="24" cy="31.5" r="2"/>`,
  },
  {
    id: 'hava', ad: 'Hava yastığı lambası', renk: 'red',
    svg: `<circle ${S} cx="16" cy="10" r="3.5"/><path ${S} d="M14 17l-2 13h10l5 10M12 24h8"/><circle ${S} cx="33" cy="22" r="7.5"/>`,
  },
];

export const lambaHTML = (l) =>
  `<li class="lamp lamp--${l.renk}" data-lamp="${l.id}"${l.ariza ? ' data-fault' : ''}>
     <svg viewBox="0 0 48 48" role="img" aria-label="${l.ad}">${l.svg}</svg>
   </li>`;

// Kadran: 240°'lik yay, çentikler ve ibre. max: en büyük değer, adim: çentik aralığı.
export function kadranHTML({ id, max, adim, birim, etiket }) {
  const cx = 100, cy = 100, r = 84;
  const start = -210, sweep = 240;
  const pt = (deg, rr) => {
    const a = (deg * Math.PI) / 180;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  let ticks = '';
  let labels = '';
  const n = max / adim;
  for (let i = 0; i <= n * 2; i++) {
    const deg = start + (sweep * i) / (n * 2);
    const major = i % 2 === 0;
    const [x1, y1] = pt(deg, r);
    const [x2, y2] = pt(deg, major ? r - 12 : r - 6);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${major ? 'maj' : 'min'}"/>`;
    if (major) {
      const [lx, ly] = pt(deg, r - 24);
      labels += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}">${(i / 2) * adim}</text>`;
    }
  }
  const [ax, ay] = pt(start, r + 6);
  const [bx, by] = pt(start + sweep, r + 6);
  const [rx1, ry1] = pt(start + sweep * 0.8, r + 6);
  return `<svg class="dial" id="${id}" viewBox="0 0 200 200" aria-hidden="true">
    <path class="dial__arc" d="M${ax} ${ay} A${r + 6} ${r + 6} 0 1 1 ${bx} ${by}"/>
    <path class="dial__red" d="M${rx1} ${ry1} A${r + 6} ${r + 6} 0 0 1 ${bx} ${by}"/>
    <g class="dial__ticks">${ticks}</g>
    <g class="dial__labels">${labels}</g>
    <text class="dial__unit" x="100" y="150">${birim}</text>
    <text class="dial__name" x="100" y="166">${etiket}</text>
    <g class="dial__needle" data-needle><path d="M100 104 L178 100 L100 96 Z"/></g>
    <circle class="dial__hub" cx="100" cy="100" r="9"/>
  </svg>`;
}
export const KADRAN_BASLANGIC = -210; // ibrenin 0 açısı (sağa bakan ibre için)
export const KADRAN_SUPURME = 240;

// 7 segment rakam (multimetre ekranı).
const SEG = {
  a: [9, 3, 22, 6], b: [31, 9, 6, 24], c: [31, 37, 6, 24], d: [9, 61, 22, 6],
  e: [3, 37, 6, 24], f: [3, 9, 6, 24], g: [9, 32, 22, 6],
};
const DIGIT = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd',
  6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': '',
};
export function segHTML(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<svg class="seg" viewBox="0 0 40 70" aria-hidden="true"><g transform="skewX(-7) translate(5 0)">${Object.entries(SEG)
      .map(([k, [x, y, w, h]]) => `<rect data-s="${k}" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`)
      .join('')}</g></svg>`;
  }
  return out;
}
export function segSet(el, value, width) {
  const str = String(Math.round(value)).padStart(width, ' ').slice(-width);
  el.querySelectorAll('.seg').forEach((svg, i) => {
    const on = DIGIT[str[i]] ?? '';
    svg.querySelectorAll('rect').forEach((r) => r.classList.toggle('on', on.includes(r.dataset.s)));
  });
}

// Bıçak sigorta. Renkler gerçek amper renk kodlarından.
export const SIGORTA_RENK = { 5: '#c8a878', 7.5: '#7a4a2a', 10: '#d9342b', 15: '#2f6fd6', 20: '#f2c230', 25: '#e8e8e2', 30: '#3aa45c' };
export function sigortaHTML(amper) {
  const c = SIGORTA_RENK[amper] || '#d9342b';
  const light = amper === 20 || amper === 25 || amper === 5;
  return `<svg class="fuse" viewBox="0 0 60 84" aria-hidden="true">
    <rect x="12" y="46" width="11" height="34" rx="1.5" class="fuse__leg"/>
    <rect x="37" y="46" width="11" height="34" rx="1.5" class="fuse__leg"/>
    <path d="M6 8a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v36a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="${c}"/>
    <rect x="12" y="10" width="36" height="16" rx="3" fill="#fff" opacity=".18"/>
    <text x="30" y="40" text-anchor="middle" fill="${light ? '#1a2230' : '#fff'}">${String(amper).replace('.', ',')}</text>
  </svg>`;
}
