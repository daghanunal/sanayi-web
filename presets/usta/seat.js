// Koltuk tasarlama: ön görünüş SVG koltuk, malzeme / renk / iplik / desen seçimi.

export const MALZEMELER = [
  { id: 'deri', ad: 'Hakiki deri', parlaklik: 0.26, doku: 'grain' },
  { id: 'alcantara', ad: 'Alcantara', parlaklik: 0.05, doku: 'suede' },
  { id: 'kumas', ad: 'Kumaş', parlaklik: 0.08, doku: 'weave' },
];

export const RENKLER = [
  { id: 'siyah', ad: 'Siyah', hex: '#1f1b19' },
  { id: 'konyak', ad: 'Konyak', hex: '#8c4a20' },
  { id: 'bordo', ad: 'Bordo', hex: '#5e1b21' },
  { id: 'taba', ad: 'Taba', hex: '#b27a41' },
  { id: 'fume', ad: 'Füme', hex: '#4b4c50' },
  { id: 'bej', ad: 'Bej', hex: '#c9b28f' },
];

export const IPLIKLER = [
  { id: 'sari', ad: 'Sarı', hex: '#f0c649' },
  { id: 'kirmizi', ad: 'Kırmızı', hex: '#d2362c' },
  { id: 'beyaz', ad: 'Beyaz', hex: '#f1ece2' },
  { id: 'ton', ad: 'Ton sür ton', hex: null },
];

export const DESENLER = [
  { id: 'kapitone', ad: 'Kapitone' },
  { id: 'dilim', ad: 'Dikey dilim' },
  { id: 'duz', ad: 'Düz' },
];

// Renk yardımcıları
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export function shade(hex, amt) {
  const rgb = hexToRgb(hex);
  return rgbToHex(rgb.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
}

// Koltuk parçaları (viewBox 0 0 400 560)
const P = {
  headrest: 'M142,22 Q200,10 258,22 Q282,28 282,58 L280,92 Q278,112 254,114 L146,114 Q122,112 120,92 L118,58 Q118,28 142,22 Z',
  back: 'M92,128 Q200,114 308,128 Q342,133 346,172 L354,358 Q355,388 326,390 L74,390 Q45,388 46,358 L54,172 Q58,133 92,128 Z',
  backInsert: 'M140,146 Q200,138 260,146 Q272,148 273,162 L281,356 Q281,368 268,368 L132,368 Q119,368 119,356 L127,162 Q128,148 140,146 Z',
  cushion: 'M44,396 L356,396 Q380,398 378,424 L372,500 Q368,534 334,536 L66,536 Q32,534 28,500 L22,424 Q20,398 44,396 Z',
  cushionInsert: 'M122,406 L278,406 Q290,406 291,418 L297,510 Q298,522 285,522 L115,522 Q102,522 103,510 L109,418 Q110,406 122,406 Z',
};

const NS = 'http://www.w3.org/2000/svg';

function lines(kind, box, step) {
  const [x0, y0, x1, y1] = box;
  const out = [];
  if (kind === 'dilim') {
    for (let x = x0 + step; x < x1; x += step) out.push(`M${x},${y0} L${x},${y1}`);
  } else if (kind === 'kapitone') {
    const w = x1 - x0;
    const h = y1 - y0;
    for (let s = -h; s < w + h; s += step) {
      out.push(`M${x0 + s},${y0} L${x0 + s + h},${y1}`);
      out.push(`M${x0 + s},${y1} L${x0 + s + h},${y0}`);
    }
  }
  return out.join(' ');
}

export function seatSVG() {
  return `
<svg class="seat" viewBox="0 0 400 560" role="img" aria-label="Seçtiğiniz malzeme ve renklerle koltuk önizlemesi">
  <defs>
    <clipPath id="clip-seat"><path d="${P.headrest}"/><path d="${P.back}"/><path d="${P.cushion}"/></clipPath>
    <clipPath id="clip-back-in"><path d="${P.backInsert}"/></clipPath>
    <clipPath id="clip-cush-in"><path d="${P.cushionInsert}"/></clipPath>
    <filter id="f-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="4"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.05"/>
    </filter>
    <filter id="f-suede" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="9"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.9 0.72"/>
    </filter>
    <pattern id="p-weave" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M0,1.5 H6 M0,4.5 H6" stroke="#000" stroke-opacity=".28" stroke-width="1.2"/>
      <path d="M1.5,0 V6 M4.5,0 V6" stroke="#fff" stroke-opacity=".10" stroke-width="1"/>
    </pattern>
    <linearGradient id="g-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".9"/>
      <stop offset=".38" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".7" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".25"/>
    </linearGradient>
    <radialGradient id="g-shadow" cx=".5" cy=".45" r=".62">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".55"/>
    </radialGradient>
    <linearGradient id="g-chrome" x1="0" x2="1">
      <stop offset="0" stop-color="#6b6f75"/><stop offset=".5" stop-color="#e6e8eb"/><stop offset="1" stop-color="#595c61"/>
    </linearGradient>
  </defs>
  <ellipse cx="200" cy="548" rx="178" ry="10" fill="#000" opacity=".45"/>
  <rect x="158" y="108" width="9" height="26" rx="3" fill="url(#g-chrome)"/>
  <rect x="233" y="108" width="9" height="26" rx="3" fill="url(#g-chrome)"/>

  <g class="seat__base">
    <path class="p-bolster" d="${P.back}"/>
    <path class="p-bolster p-bolster--low" d="${P.cushion}"/>
    <path class="p-main" d="${P.headrest}"/>
    <path class="p-main" d="${P.backInsert}"/>
    <path class="p-main" d="${P.cushionInsert}"/>
  </g>

  <g class="seat__pattern" data-desen="dilim">
    <g clip-path="url(#clip-back-in)"><path class="groove" d="${lines('dilim', [119, 140, 281, 370], 27)}"/><path class="thread" d="${lines('dilim', [119, 140, 281, 370], 27)}"/></g>
    <g clip-path="url(#clip-cush-in)"><path class="groove" d="${lines('dilim', [102, 404, 298, 524], 28)}"/><path class="thread" d="${lines('dilim', [102, 404, 298, 524], 28)}"/></g>
  </g>
  <g class="seat__pattern" data-desen="kapitone">
    <g clip-path="url(#clip-back-in)"><path class="groove" d="${lines('kapitone', [119, 140, 281, 370], 38)}"/><path class="thread" d="${lines('kapitone', [119, 140, 281, 370], 38)}"/></g>
    <g clip-path="url(#clip-cush-in)"><path class="groove" d="${lines('kapitone', [102, 404, 298, 524], 38)}"/><path class="thread" d="${lines('kapitone', [102, 404, 298, 524], 38)}"/></g>
  </g>

  <g clip-path="url(#clip-seat)" class="seat__texture">
    <rect class="tex tex--grain" width="400" height="560" filter="url(#f-grain)"/>
    <rect class="tex tex--suede" width="400" height="560" filter="url(#f-suede)"/>
    <rect class="tex tex--weave" width="400" height="560" fill="url(#p-weave)"/>
    <rect class="sheen" width="400" height="560" fill="url(#g-sheen)"/>
    <rect width="400" height="560" fill="url(#g-shadow)"/>
  </g>

  <g class="seat__seams">
    <path class="groove" d="${P.backInsert}"/><path class="thread" d="${P.backInsert}"/>
    <path class="groove" d="${P.cushionInsert}"/><path class="thread" d="${P.cushionInsert}"/>
    <path class="thread thread--edge" d="M128,34 Q200,22 272,34"/>
  </g>
</svg>`;
}

export function applySeat(svg, { malzeme, renk, iplik, desen }) {
  const m = MALZEMELER.find((x) => x.id === malzeme);
  const c = RENKLER.find((x) => x.id === renk).hex;
  const t = IPLIKLER.find((x) => x.id === iplik).hex ?? shade(c, c === '#1f1b19' ? 0.22 : -0.28);
  svg.style.setProperty('--main', c);
  svg.style.setProperty('--bolster', shade(c, -0.22));
  svg.style.setProperty('--bolster-low', shade(c, -0.14));
  svg.style.setProperty('--groove', shade(c, -0.5));
  svg.style.setProperty('--thread', t);
  svg.style.setProperty('--sheen', m.parlaklik);
  svg.dataset.doku = m.doku;
  svg.dataset.desen = desen;
}
