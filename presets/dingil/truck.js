// Yandan çekici + tenteli dorse (SVG). Dorsenin brandasında işletme adı yazar.
// Araç sağa bakar; tekerler ayrı gruplar (data-wheel) olarak döndürülür.

const WHEELS = [
  // [cx, cy] — dorse üçlü dingil, çekici çift arka + ön
  [150, 238], [228, 238], [306, 238],
  [880, 238], [956, 238], [1112, 238],
];
export const WHEEL_R = 34;

const wheel = ([cx, cy], i) => `
  <g data-wheel="${i}">
    <circle cx="${cx}" cy="${cy}" r="${WHEEL_R}" fill="#18191b"/>
    <circle cx="${cx}" cy="${cy}" r="${WHEEL_R - 6}" fill="none" stroke="#2c2e31" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="19" fill="#b9bdc2"/>
    <circle cx="${cx}" cy="${cy}" r="12" fill="#8d9298"/>
    ${[0, 60, 120, 180, 240, 300]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        return `<circle cx="${(cx + Math.cos(r) * 15).toFixed(1)}" cy="${(cy + Math.sin(r) * 15).toFixed(1)}" r="2.4" fill="#e4e6e8"/>`;
      })
      .join('')}
    <rect x="${cx - 2}" y="${cy - 17}" width="4" height="7" fill="#e4e6e8"/>
    <circle cx="${cx}" cy="${cy}" r="4" fill="#3a3d41"/>
  </g>`;

// Branda kayış çizgileri
const straps = Array.from({ length: 25 }, (_, i) => 40 + i * 38)
  .map((x) => `<line x1="${x}" y1="52" x2="${x}" y2="200" stroke="rgb(255 255 255 / .12)" stroke-width="2"/>`)
  .join('');

// Arka tampon ve şasi altında kırmızı-beyaz reflektör şerit
const tape = (x, y, w) =>
  Array.from({ length: Math.floor(w / 24) }, (_, i) =>
    `<rect x="${x + i * 24}" y="${y}" width="12" height="7" fill="${i % 2 ? '#f5f3ee' : '#d4202c'}"/>`
  ).join('');

export function truckSVG(ad) {
  return `
<svg class="truck" viewBox="0 0 1200 290" role="img" aria-label="${ad} yazılı tenteli tır">
  <defs>
    <linearGradient id="dg-branda" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a63a8"/><stop offset="1" stop-color="#173f73"/>
    </linearGradient>
    <linearGradient id="dg-cab" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f6f2"/><stop offset="1" stop-color="#d9d7d0"/>
    </linearGradient>
    <radialGradient id="dg-far" cx="0" cy="0.5" r="1">
      <stop offset="0" stop-color="#fff6d8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- gölge -->
  <ellipse cx="620" cy="272" rx="600" ry="10" fill="rgb(0 0 0 / .22)"/>

  <!-- dorse -->
  <rect x="24" y="40" width="966" height="170" rx="3" fill="url(#dg-branda)"/>
  <rect x="24" y="40" width="966" height="12" fill="#12335e"/>
  ${straps}
  <text data-curtain x="507" y="152" text-anchor="middle" fill="#f6f4ee"
    font-family="'League Gothic', 'Arial Narrow', sans-serif" font-size="118" letter-spacing="2"></text>
  <rect x="24" y="200" width="966" height="18" fill="#26282b"/>
  ${tape(30, 206, 954)}
  <rect x="724" y="218" width="10" height="40" fill="#3a3d41"/>
  <rect x="712" y="254" width="34" height="6" fill="#3a3d41"/>
  <rect x="112" y="216" width="232" height="10" fill="#26282b"/>

  <!-- çekici şasisi, yakıt deposu -->
  <rect x="840" y="210" width="310" height="14" fill="#26282b"/>
  <rect x="996" y="192" width="78" height="32" rx="12" fill="#b9bdc2"/>
  <rect x="996" y="198" width="78" height="4" fill="#9aa0a6"/>

  <!-- kabin -->
  <path d="M1018 28 h110 q24 0 28 22 l10 118 q2 22 -20 22 h-128 z" fill="url(#dg-cab)"/>
  <path d="M1030 44 h92 q14 0 16 12 l6 50 h-114 z" fill="#27394d"/>
  <path d="M1036 50 h40 l-10 50 h-30 z" fill="rgb(255 255 255 / .14)"/>
  <rect x="1018" y="120" width="126" height="6" fill="#c8c5bd"/>
  <rect x="1010" y="18" width="130" height="14" rx="4" fill="#e9e7e1"/>
  <rect x="1150" y="140" width="18" height="12" rx="2" fill="#ffd98a" data-far/>
  <rect x="1150" y="158" width="14" height="10" rx="2" fill="#ffb627" data-hazard/>
  <rect x="1012" y="150" width="10" height="10" rx="2" fill="#ffb627" data-hazard/>
  <rect x="1062" y="126" width="54" height="36" rx="2" fill="#1e2023"/>
  ${Array.from({ length: 5 }, (_, i) => `<rect x="1066" y="${130 + i * 6}" width="46" height="2" fill="#3a3d41"/>`).join('')}
  <rect x="1122" y="176" width="44" height="18" rx="3" fill="#2c2e31"/>
  <rect x="992" y="54" width="10" height="44" rx="3" fill="#2c2e31"/>

  <!-- dorse arka stop, sarı ikaz -->
  <rect x="22" y="196" width="10" height="16" fill="#d4202c" data-hazard/>

  ${WHEELS.map(wheel).join('')}

  <!-- far huzmesi -->
  <path d="M1168 146 L1200 118 L1200 190 Z" fill="url(#dg-far)" opacity=".55" data-beam/>
</svg>`;
}

export const wheelCenters = WHEELS;
