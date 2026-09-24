// Yedi segmentli gösterge (SVG). Sönük segmentler görünür kalır, yananlar sarı parlar.
//   segHTML('0000', { cls })  → <svg> dizesi
//   segSet(svg, '4,9')         → rakamları günceller (virgül/nokta bir önceki hanenin noktasını yakar)

const SEG = {
  a: '8,4 52,4 46,10 14,10',
  b: '54,6 54,48 48,44 48,12',
  c: '54,52 54,94 48,88 48,56',
  d: '8,96 52,96 46,90 14,90',
  e: '6,52 6,94 12,88 12,56',
  f: '6,6 6,48 12,44 12,12',
  g: '9,50 14,46 46,46 51,50 46,54 14,54',
};

const MAP = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd',
  6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '',
};

const W = 66; // hane genişliği (viewBox birimi)

function digitSVG(i) {
  const x = i * W;
  const segs = Object.entries(SEG)
    .map(([k, pts]) => `<polygon data-s="${k}" points="${pts}" />`)
    .join('');
  return `<g class="seg__d" transform="translate(${x} 0) skewX(-6)">${segs}<circle class="seg__dp" cx="60" cy="94" r="4" /></g>`;
}

export function segHTML(len, { cls = '', label = '' } = {}) {
  const n = typeof len === 'number' ? len : String(len).replace(/[.,]/g, '').length;
  return `<svg class="seg ${cls}" viewBox="-4 0 ${n * W + 4} 100" role="img" aria-label="${label}">${Array.from({ length: n }, (_, i) => digitSVG(i)).join('')}</svg>`;
}

// value: "18400", "4,9", " 25" — sağa yaslanır.
export function segSet(svg, value) {
  const digits = [...svg.querySelectorAll('.seg__d')];
  const chars = [];
  for (const ch of String(value)) {
    if ((ch === ',' || ch === '.') && chars.length) chars[chars.length - 1].dp = true;
    else chars.push({ ch, dp: false });
  }
  while (chars.length < digits.length) chars.unshift({ ch: ' ', dp: false });
  const tail = chars.slice(-digits.length);
  digits.forEach((g, i) => {
    const on = MAP[tail[i].ch] ?? '';
    for (const p of g.querySelectorAll('polygon')) p.classList.toggle('on', on.includes(p.dataset.s));
    g.querySelector('.seg__dp').classList.toggle('on', tail[i].dp);
  });
}
