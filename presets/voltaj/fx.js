// Voltaj efektleri: şimşek arkı, metin karıştırma, manyetik butonlar, imleç, hızlı şeritler.
import { gsap } from '../../shared/core.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// Orta nokta kaydırmalı şimşek yolu
function boltPath(x1, y1, x2, y2, rough, depth = 6) {
  let pts = [[x1, y1], [x2, y2]];
  let amp = Math.hypot(x2 - x1, y2 - y1) * rough;
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const off = (Math.random() - 0.5) * amp;
      next.push([mx + (-(by - ay) / len) * off, my + ((bx - ax) / len) * off], pts[i + 1]);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

const toD = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');

export function createArcLayer(svg, flash) {
  const layers = ['arc-halo', 'arc-mid', 'arc-core'].map((cls) => {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('class', cls);
    svg.append(p);
    return p;
  });
  const branch = document.createElementNS(SVGNS, 'path');
  branch.setAttribute('class', 'arc-mid');
  svg.append(branch);
  let timer = null;

  // Ekranın iki noktası arasında kısa, titreyen bir ark çakar.
  function strike(x1, y1, x2, y2, { duration = 420, rough = 0.22, flashAmount = 0.35 } = {}) {
    clearInterval(timer);
    svg.style.opacity = 1;
    const draw = () => {
      const pts = boltPath(x1, y1, x2, y2, rough);
      const d = toD(pts);
      layers.forEach((l) => l.setAttribute('d', d));
      const from = pts[Math.floor(pts.length * (0.3 + Math.random() * 0.4))];
      const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - 0.5) * 1.6;
      const len = Math.hypot(x2 - x1, y2 - y1) * 0.25;
      branch.setAttribute('d', toD(boltPath(from[0], from[1], from[0] + Math.cos(ang) * len, from[1] + Math.sin(ang) * len, 0.3, 4)));
    };
    draw();
    timer = setInterval(draw, 45);
    if (flash) gsap.fromTo(flash, { opacity: flashAmount }, { opacity: 0, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(svg, { opacity: 1 }, { opacity: 0, duration: 0.18, delay: duration / 1000, ease: 'none', onComplete: () => clearInterval(timer) });
  }
  return { strike };
}

// Metni karışık karakterlerden hedef metne çözerek yazar.
const GLYPHS = '01<>/\\#%&*+=?⚡ABCDEFPU';
export function scramble(el, text, { duration = 0.9, delay = 0 } = {}) {
  const obj = { p: 0 };
  return gsap.to(obj, {
    p: 1,
    duration,
    delay,
    ease: 'none',
    onUpdate() {
      const n = Math.floor(obj.p * text.length);
      let out = text.slice(0, n);
      for (let i = n; i < text.length; i++) out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
    },
    onComplete() {
      el.textContent = text;
    },
  });
}

// Butonu imlece doğru çeker.
export function magnetic(el, strength = 0.35) {
  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  });
  el.addEventListener('pointerleave', () => {
    xTo(0);
    yTo(0);
  });
}

// Masaüstünde özel imleç: nokta + gecikmeli halka, tıklanabilir öğelerde büyür.
export function initCursor() {
  if (!matchMedia('(pointer: fine)').matches) return;
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(ring, dot);
  document.documentElement.classList.add('has-cursor');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
    const hot = e.target.closest?.('a, button, [data-hot]');
    ring.classList.toggle('is-hot', !!hot);
  });
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
}

// Scroll hızına tepki veren sonsuz şerit. İçerik iki kez tekrarlanmış olmalı.
export function velocityMarquee(track, { speed = 40, dir = 1, lenis }) {
  let x = 0;
  let skew = 0;
  const setX = gsap.quickSetter(track, 'x', 'px');
  const setSkew = gsap.quickSetter(track, 'skewX', 'deg');
  gsap.ticker.add((_, dt) => {
    const v = lenis?.velocity ?? 0;
    const w = track.scrollWidth / 2;
    x -= dir * (speed + Math.abs(v) * 14) * (dt / 1000) * (v < 0 ? -1 : 1);
    if (w > 0) x = ((x % w) + w) % w - w;
    skew += (Math.max(-12, Math.min(12, v * 0.9)) - skew) * 0.1;
    setX(x);
    setSkew(-skew * dir);
  });
}
