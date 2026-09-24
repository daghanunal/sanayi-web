// Katalog tarzı teknik parça çizimleri (SVG, 120×120). Çizgiler DrawSVG ile çizilir.
// Her parça: gövde çizgileri (.ln) + ince yardımcı çizgiler (.aux) + vurgu (.acc).

const bolts = (cx, cy, r, n, br) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return `<circle class="ln" cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="${br}"/>`;
  }).join('');

const radial = (cx, cy, r1, r2, n, off = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + off;
    return `<line class="aux" x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}"/>`;
  }).join('');

const zigzag = (x, y1, y2, w, turns) => {
  const h = (y2 - y1) / turns;
  let d = `M${x - w} ${y1}`;
  for (let i = 0; i < turns; i++) d += ` L${x + w} ${y1 + h * (i + 0.5)} L${x - w} ${y1 + h * (i + 1)}`;
  return `<path class="ln" d="${d}"/>`;
};

export const PARTS = {
  disk: `
    <circle class="ln" cx="56" cy="62" r="44"/>
    <circle class="aux" cx="56" cy="62" r="38"/>
    <circle class="ln" cx="56" cy="62" r="20"/>
    <circle class="ln" cx="56" cy="62" r="7"/>
    ${bolts(56, 62, 13.5, 5, 2.4)}
    ${radial(56, 62, 24, 36, 18, 0.1)}
    <path class="ln acc" d="M88 22 C104 34 110 52 106 72 L96 70 C99 55 94 41 82 31 Z"/>
    <line class="aux" x1="98" y1="44" x2="112" y2="38"/>`,

  filtre: `
    <ellipse class="ln" cx="60" cy="26" rx="30" ry="9"/>
    <ellipse class="aux" cx="60" cy="26" rx="12" ry="3.6"/>
    <path class="ln" d="M30 26 V96 C30 104 90 104 90 96 V26"/>
    ${Array.from({ length: 9 }, (_, i) => `<line class="aux" x1="${36 + i * 6}" y1="40" x2="${36 + i * 6}" y2="${92 + (i > 4 ? 8 - i : i) * 0.6}"/>`).join('')}
    <path class="ln acc" d="M30 34 C30 42 90 42 90 34"/>
    <path class="ln" d="M30 88 C30 96 90 96 90 88"/>`,

  amortisor: `
    <rect class="ln" x="50" y="10" width="20" height="8" rx="2"/>
    <line class="ln" x1="60" y1="18" x2="60" y2="50"/>
    <rect class="ln" x="48" y="50" width="24" height="52" rx="3"/>
    <rect class="ln" x="52" y="102" width="16" height="8" rx="2"/>
    <circle class="aux" cx="60" cy="106" r="2"/>
    <ellipse class="ln acc" cx="60" cy="26" rx="20" ry="4"/>
    ${zigzag(60, 30, 86, 18, 6).replace('class="ln"', 'class="ln acc"')}
    <ellipse class="ln acc" cx="60" cy="88" rx="20" ry="4"/>`,

  triger: `
    <circle class="ln" cx="34" cy="34" r="16"/><circle class="aux" cx="34" cy="34" r="5"/>
    <circle class="ln" cx="86" cy="34" r="16"/><circle class="aux" cx="86" cy="34" r="5"/>
    <circle class="ln" cx="60" cy="96" r="12"/><circle class="aux" cx="60" cy="96" r="4"/>
    <circle class="ln" cx="88" cy="72" r="7"/>
    ${radial(34, 34, 11, 16, 12)}${radial(86, 34, 11, 16, 12)}
    <path class="ln acc" d="M18 34 A16 16 0 0 1 34 18 L86 18 A16 16 0 0 1 102 34 L95 72 A7 7 0 0 1 90 79 L70 104 A12 12 0 0 1 48 100 L18 38 Z"/>`,

  debriyaj: `
    <circle class="ln" cx="60" cy="60" r="46"/>
    <circle class="aux" cx="60" cy="60" r="40"/>
    <circle class="ln" cx="60" cy="60" r="24"/>
    <circle class="ln acc" cx="60" cy="60" r="10"/>
    ${Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const x = 60 + Math.cos(a) * 17, y = 60 + Math.sin(a) * 17;
      return `<rect class="ln" x="${(x - 4).toFixed(1)}" y="${(y - 2.5).toFixed(1)}" width="8" height="5" rx="1" transform="rotate(${(a * 180) / Math.PI} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }).join('')}
    ${radial(60, 60, 28, 40, 24)}
    ${bolts(60, 60, 43, 8, 1.6)}`,

  buji: `
    <rect class="ln" x="54" y="6" width="12" height="10" rx="2"/>
    <path class="ln" d="M52 16 H68 L70 44 H50 Z"/>
    ${Array.from({ length: 4 }, (_, i) => `<line class="aux" x1="${51}" y1="${22 + i * 5.5}" x2="${69}" y2="${22 + i * 5.5}"/>`).join('')}
    <path class="ln acc" d="M44 44 H76 V60 H44 Z"/>
    <line class="aux" x1="52" y1="44" x2="52" y2="60"/><line class="aux" x1="68" y1="44" x2="68" y2="60"/>
    <rect class="ln" x="50" y="60" width="20" height="4"/>
    <path class="ln" d="M52 64 V96 H68 V64"/>
    ${Array.from({ length: 7 }, (_, i) => `<line class="aux" x1="52" y1="${68 + i * 4}" x2="68" y2="${66 + i * 4}"/>`).join('')}
    <line class="ln" x1="60" y1="96" x2="60" y2="104"/>
    <path class="ln acc" d="M66 96 V108 H58"/>`,

  piston: `
    <path class="ln" d="M30 20 H90 V58 C90 64 84 66 80 66 H40 C36 66 30 64 30 58 Z"/>
    <line class="ln acc" x1="30" y1="28" x2="90" y2="28"/>
    <line class="ln acc" x1="30" y1="34" x2="90" y2="34"/>
    <line class="ln acc" x1="30" y1="40" x2="90" y2="40"/>
    <circle class="ln" cx="60" cy="52" r="7"/>
    <circle class="aux" cx="60" cy="52" r="3"/>
    <path class="ln" d="M53 56 L48 96 H72 L67 56"/>
    <circle class="ln" cx="60" cy="102" r="13"/>
    <circle class="aux" cx="60" cy="102" r="8"/>
    <line class="aux" x1="44" y1="102" x2="76" y2="102"/>`,
};

export const partSvg = (key, cls = '') =>
  `<svg class="part ${cls}" viewBox="0 0 120 120" aria-hidden="true" fill="none">${PARTS[key] ?? PARTS.disk}</svg>`;
