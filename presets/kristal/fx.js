// Kristal efektleri: manyetik butonlar, imleç, hızlı şeritler (Voltaj'dan uyarlandı).
import { gsap } from '../../shared/core.js';

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
