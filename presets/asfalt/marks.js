// Asfalt: yol çizgisi, lastik izi ve tabela SVG'leri. Hepsi saf SVG/canvas, WebGL yok.

// Üstten görünen araç. Burun yukarı bakar. viewBox 44×92.
export function car({ body = '#e9e7e1', glass = '#1b1d20', id = 'car' } = {}) {
  return `
  <svg class="car" viewBox="0 0 44 92" aria-hidden="true" data-car="${id}">
    <defs>
      <radialGradient id="${id}-beam" cx="50%" cy="100%" r="100%">
        <stop offset="0" stop-color="#fff6d8" stop-opacity=".55"/>
        <stop offset="1" stop-color="#fff6d8" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path class="car__beam" d="M6 6 L-14 -70 L58 -70 L38 6 Z" fill="url(#${id}-beam)"/>
    <rect x="1" y="13" width="7" height="15" rx="2" fill="#0d0e10"/>
    <rect x="36" y="13" width="7" height="15" rx="2" fill="#0d0e10"/>
    <rect x="1" y="62" width="7" height="15" rx="2" fill="#0d0e10"/>
    <rect x="36" y="62" width="7" height="15" rx="2" fill="#0d0e10"/>
    <path d="M9 4 Q22 0 35 4 Q40 6 40 14 L40 80 Q40 89 32 90 L12 90 Q4 89 4 80 L4 14 Q4 6 9 4 Z" fill="${body}"/>
    <path d="M9 26 Q22 21 35 26 L33 38 Q22 35 11 38 Z" fill="${glass}"/>
    <path d="M11 66 Q22 69 33 66 L34 75 Q22 78 10 75 Z" fill="${glass}"/>
    <rect x="11" y="40" width="22" height="24" rx="3" fill="${body}" opacity=".92"/>
    <path d="M9 40 L10 64 M35 40 L34 64" stroke="${glass}" stroke-width="1.6" opacity=".7"/>
    <rect x="8" y="3" width="7" height="3" rx="1.5" fill="#fff6d8"/>
    <rect x="29" y="3" width="7" height="3" rx="1.5" fill="#fff6d8"/>
    <rect class="car__stop" x="7" y="87" width="8" height="3" rx="1.5" fill="#7a1310"/>
    <rect class="car__stop" x="29" y="87" width="8" height="3" rx="1.5" fill="#7a1310"/>
  </svg>`;
}

// Lastik diş desenleri: <pattern> tanımları. Genişlik 60 birim, dikey tekrar.
const DESEN = {
  yaz: {
    h: 14,
    body: `
      <rect x="0" y="0" width="9" height="10" rx="1"/>
      <rect x="13" y="0" width="9" height="14"/>
      <rect x="26" y="0" width="8" height="14"/>
      <rect x="38" y="0" width="9" height="14"/>
      <rect x="51" y="4" width="9" height="10" rx="1"/>`,
  },
  kis: {
    h: 18,
    body: `
      <path d="M1 0 L27 9 L27 17 L1 8 Z"/>
      <path d="M59 0 L33 9 L33 17 L59 8 Z"/>
      <path d="M4 3 l3 1 -2 1 3 1 M12 6 l3 1 -2 1 3 1 M20 8 l3 1 -2 1 3 1 M40 8 l-3 1 2 1 -3 1 M48 6 l-3 1 2 1 -3 1 M56 3 l-3 1 2 1 -3 1" fill="none" style="stroke:var(--sipe)" stroke-width="1"/>`,
  },
  dortmevsim: {
    h: 16,
    body: `
      <rect x="27" y="0" width="6" height="16"/>
      <path d="M0 1 L23 8 L23 15 L0 8 Z"/>
      <path d="M60 1 L37 8 L37 15 L60 8 Z"/>
      <path d="M8 5 l6 2 M44 7 l6 -2" fill="none" style="stroke:var(--sipe)" stroke-width="1.2"/>`,
  },
};

export function treadDefs(prefix = 'tr') {
  return Object.entries(DESEN)
    .map(
      ([id, p]) => `
      <pattern id="${prefix}-${id}" width="60" height="${p.h}" patternUnits="userSpaceOnUse">
        <g fill="currentColor">${p.body}</g>
      </pattern>`
    )
    .join('');
}

// Dikey lastik izi şeridi (60 birim genişlik, yükseklik parametreli).
export function track(id, h, prefix = 'tr') {
  return `<rect x="0" y="0" width="60" height="${h}" fill="url(#${prefix}-${id})"/>`;
}

// Yol oku işaretleri: düz, sağa, sola. Uzun, yola boyanmış gibi. viewBox 60×220.
export function arrow(kind = 'duz') {
  const paths = {
    duz: 'M22 220 L22 70 L4 70 L30 0 L56 70 L38 70 L38 220 Z',
    sag: 'M18 220 L18 96 Q18 66 44 60 L44 42 L60 70 L44 98 L44 80 Q34 84 34 100 L34 220 Z',
    sol: 'M42 220 L42 96 Q42 66 16 60 L16 42 L0 70 L16 98 L16 80 Q26 84 26 100 L26 220 Z',
  };
  return `<svg class="arrow" viewBox="0 0 60 220" aria-hidden="true"><path d="${paths[kind]}" fill="currentColor"/></svg>`;
}

// Hız sınırı tabelası (süre için). Kırmızı halka, beyaz zemin.
export function speedSign(ust, alt = '') {
  return `
  <span class="sign" aria-hidden="true">
    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#f4f2ec"/><circle cx="50" cy="50" r="40" fill="none" stroke="var(--sinyal)" stroke-width="11"/></svg>
    <b>${ust}</b>${alt ? `<small>${alt}</small>` : ''}
  </span>`;
}

// Direksiyon simidi (balans titreşimi için).
export const steering = `
  <svg class="steer" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="9"/>
    <circle cx="50" cy="50" r="11" fill="currentColor"/>
    <path d="M10 46 Q50 36 90 46 L90 54 Q62 52 56 58 L54 90 L46 90 L44 58 Q38 52 10 54 Z" fill="currentColor"/>
  </svg>`;

// --- Dokular (bir kez üretilir, CSS arka planı/maskesi olur) ----------------

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

// Asfalt: koyu zemin üzerinde agrega taneleri.
export function asphaltTexture() {
  const [c, g] = canvas(240);
  g.fillStyle = '#2a2c2f';
  g.fillRect(0, 0, 240, 240);
  for (let i = 0; i < 5200; i++) {
    const v = 30 + Math.random() * 60;
    g.fillStyle = `rgba(${v},${v + 2},${v + 5},${0.35 + Math.random() * 0.4})`;
    const s = Math.random() < 0.85 ? 1 : 2;
    g.fillRect(Math.random() * 240, Math.random() * 240, s, s);
  }
  for (let i = 0; i < 260; i++) {
    const v = 95 + Math.random() * 50;
    g.fillStyle = `rgba(${v},${v},${v - 4},${0.25 + Math.random() * 0.3})`;
    g.beginPath();
    g.arc(Math.random() * 240, Math.random() * 240, 0.6 + Math.random() * 1.2, 0, 7);
    g.fill();
  }
  return c.toDataURL('image/png');
}

// Aşınmış boya maskesi: beyaz, üzerinde küçük boşluklar.
export function wornMask() {
  const [c, g] = canvas(220);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 220, 220);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 650; i++) {
    g.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.4})`;
    g.beginPath();
    g.arc(Math.random() * 220, Math.random() * 220, 0.4 + Math.random() * 1.1, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 14; i++) {
    g.fillStyle = 'rgba(0,0,0,.1)';
    g.beginPath();
    g.ellipse(Math.random() * 220, Math.random() * 220, 6 + Math.random() * 16, 2 + Math.random() * 5, Math.random() * 3, 0, 7);
    g.fill();
  }
  return c.toDataURL('image/png');
}
