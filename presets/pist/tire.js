// Yan görünüşten lastik + jant. Dönen katmanlar ayrı <svg> olarak üretilir ki
// dönüş GPU'da (CSS transform) yapılsın ve telefonda akıcı kalsın.
// Katmanlar (alttan üste): göbek/barrel, fren diski (döner), kaliper (sabit),
// jant kolları (döner), hareket bulanıklığı (döner, hızla görünür), lastik (döner).

const NS = 'http://www.w3.org/2000/svg';
const VB = 'viewBox="-500 -500 1000 1000"';

let uid = 0;

function svg(cls, inner) {
  return `<svg class="wheel__layer ${cls}" ${VB} aria-hidden="true" focusable="false">${inner}</svg>`;
}

function spokes(id) {
  // 5 çift kol. Her kol göbekten jant dudağına incelen bir şekil.
  const one = `<path d="M-26 -62 C-30 -140 -40 -220 -50 -300 L-14 -304 C-10 -220 -6 -150 -4 -64 Z" />
               <path d="M26 -62 C30 -140 40 -220 50 -300 L14 -304 C10 -220 6 -150 4 -64 Z" />`;
  const hl = `<path d="M-22 -70 C-26 -140 -34 -215 -42 -292 L-34 -293 C-27 -215 -20 -140 -16 -70 Z" />`;
  let arms = '';
  let lights = '';
  for (let i = 0; i < 5; i++) {
    arms += `<g transform="rotate(${i * 72})">${one}</g>`;
    lights += `<g transform="rotate(${i * 72})">${hl}</g>`;
  }
  return `
    <defs>
      <linearGradient id="sp${id}" x1="0" y1="-1" x2="0" y2="1">
        <stop offset="0" stop-color="#6d7178"/><stop offset=".5" stop-color="#3b3e44"/><stop offset="1" stop-color="#23252a"/>
      </linearGradient>
      <radialGradient id="cap${id}"><stop offset="0" stop-color="#4a4d53"/><stop offset="1" stop-color="#1e1f23"/></radialGradient>
    </defs>
    <g fill="url(#sp${id})">${arms}</g>
    <g fill="#9aa0a8" opacity=".55">${lights}</g>
    <circle r="78" fill="#2b2d32" stroke="#5a5e65" stroke-width="4"/>
    ${[0, 1, 2, 3, 4].map((i) => {
      const a = (i * 72 + 36) * (Math.PI / 180);
      return `<g transform="translate(${(Math.sin(a) * 48).toFixed(1)} ${(-Math.cos(a) * 48).toFixed(1)})">
        <polygon points="0,-13 11,-6.5 11,6.5 0,13 -11,6.5 -11,-6.5" fill="#b9bec5"/><circle r="5" fill="#6b6f76"/></g>`;
    }).join('')}
    <circle r="28" fill="url(#cap${id})" stroke="var(--sari)" stroke-width="3"/>`;
}

function tire(id, sidewall) {
  // Diş blokları: dış çevrede 64 blok, iki sıra kaydırmalı.
  let tread = '';
  const n = 64;
  for (let i = 0; i < n; i++) {
    const r = (i * 360) / n;
    tread += `<rect x="-11" y="-492" width="22" height="30" rx="3" transform="rotate(${r})"/>`;
    tread += `<rect x="-6" y="-470" width="12" height="16" rx="2" transform="rotate(${r + 180 / n})"/>`;
  }
  const text = `${sidewall}  ◆  `.repeat(2);
  return `
    <defs>
      <radialGradient id="rb${id}" r=".5">
        <stop offset=".64" stop-color="#101113"/>
        <stop offset=".72" stop-color="#26272b"/>
        <stop offset=".86" stop-color="#1b1c1f"/>
        <stop offset=".95" stop-color="#0d0d0f"/>
      </radialGradient>
      <path id="sw${id}" d="M0 -392 A392 392 0 1 1 -0.1 -392"/>
    </defs>
    <circle r="410" fill="none" stroke="url(#rb${id})" stroke-width="160"/>
    <g fill="#08080a">${tread}</g>
    <circle r="338" fill="none" stroke="var(--sari)" stroke-width="7"/>
    <circle r="452" fill="none" stroke="#2c2d31" stroke-width="2"/>
    <text class="wheel__sidewall" font-size="44" letter-spacing="7" fill="var(--sari)">
      <textPath href="#sw${id}" startOffset="0">${text}</textPath>
    </text>`;
}

function blur(id) {
  // Hızlanınca görünen dönüş izi: kolların hafif açılı kopyaları.
  const s = spokes(`${id}b`);
  return [-9, -5, 5, 9].map((a) => `<g transform="rotate(${a})" opacity=".22">${s}</g>`).join('') +
    `<circle r="300" fill="none" stroke="#8b9098" stroke-opacity=".12" stroke-width="140"/>`;
}

export function createWheel(el, { sidewall }) {
  const id = ++uid;
  const safe = sidewall.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' })[c]);
  el.classList.add('wheel');
  el.innerHTML = [
    svg('wheel__barrel', `
      <circle r="336" fill="#1a1b1e"/>
      <circle r="324" fill="none" stroke="#8d929a" stroke-width="16"/>
      <circle r="300" fill="#141517"/>`),
    svg('wheel__disc wheel__spin', `
      <circle r="230" fill="#4b4d51"/>
      <circle r="230" fill="none" stroke="#2e3034" stroke-width="10"/>
      ${Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180;
        const r = i % 2 ? 185 : 160;
        return `<circle cx="${(Math.sin(a) * r).toFixed(1)}" cy="${(-Math.cos(a) * r).toFixed(1)}" r="6" fill="#2a2b2f"/>`;
      }).join('')}
      <circle r="110" fill="#2a2c30"/>`),
    svg('wheel__caliper', `
      <path d="M150 -150 A212 212 0 0 1 150 150 L118 118 A168 168 0 0 0 118 -118 Z" fill="var(--sari)" transform="rotate(-8)"/>
      <path d="M160 -120 A200 200 0 0 1 160 120" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5" transform="rotate(-8)"/>`),
    svg('wheel__blur wheel__spin', blur(id)),
    svg('wheel__spokes wheel__spin', spokes(id)),
    svg('wheel__tire wheel__spin', tire(id, safe)),
  ].join('');
  const spinning = [...el.querySelectorAll('.wheel__spin')];
  const blurLayer = el.querySelector('.wheel__blur');
  return {
    el,
    set(angle, speed = 0) {
      const t = `rotate(${angle.toFixed(2)}deg)`;
      for (const s of spinning) s.style.transform = t;
      blurLayer.style.opacity = Math.min(speed, 1).toFixed(3);
    },
  };
}

export { NS };
