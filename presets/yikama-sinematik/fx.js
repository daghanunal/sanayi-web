// Köpük efektleri: manyetik butonlar, hıza duyarlı şeritler, köpük dolup patlayan açılış.
import { gsap } from '../../shared/core.js';

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

// Scroll hızına tepki veren sonsuz şerit. İçerik iki kez tekrarlanmış olmalı.
export function velocityMarquee(track, { speed = 40, dir = 1, lenis }) {
  let x = 0;
  let skew = 0;
  const setX = gsap.quickSetter(track, 'x', 'px');
  const setSkew = gsap.quickSetter(track, 'skewX', 'deg');
  let on = false;
  new IntersectionObserver(([e]) => (on = e.isIntersecting)).observe(track);
  gsap.ticker.add((_, dt) => {
    if (!on) return;
    const v = lenis?.velocity ?? 0;
    const w = track.scrollWidth / 2;
    x -= dir * (speed + Math.abs(v) * 12) * (dt / 1000) * (v < 0 ? -1 : 1);
    if (w > 0) x = ((x % w) + w) % w - w;
    skew += (Math.max(-10, Math.min(10, v * 0.8)) - skew) * 0.1;
    setX(x);
    setSkew(-skew * dir);
  });
}

// Açılış: alttan üç renk köpük kabarır, ekranı doldurur, dükkan adı belirir, köpük patlar.
export function runIntro(el, cv, label) {
  document.documentElement.classList.add('is-intro');
  const w = innerWidth;
  const h = innerHeight;
  const r = Math.min(devicePixelRatio || 1, 1.5);
  cv.width = w * r;
  cv.height = h * r;
  const x = cv.getContext('2d');
  x.scale(r, r);

  const PAL = [
    ['#ff8fbd', '#ff5c9d'],
    ['#8fdcff', '#3ec5ff'],
    ['#fff0a0', '#ffd83a'],
    ['#ffffff', '#d9d4ff'],
  ];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cell = Math.max(46, Math.min(w, h) * 0.12);
  const bubbles = [];
  for (let gy = -0.5; gy < h / cell + 1; gy++) {
    for (let gx = -0.5; gx < w / cell + 1; gx++) {
      const tx = (gx + (gy % 2 ? 0.5 : 0) + (rand() - 0.5) * 0.5) * cell;
      const ty = (gy + (rand() - 0.5) * 0.5) * cell;
      const rad = cell * (0.55 + rand() * 0.45);
      const delay = (1 - ty / h) * 0.55 + rand() * 0.22;
      const cx = tx - w / 2;
      const cy = ty - h * 0.42;
      bubbles.push({ tx, ty, rad, delay, col: PAL[Math.floor(rand() * 4)], pop: Math.hypot(cx, cy) / Math.hypot(w, h), k: 0, s: 1, a: 1 });
    }
  }
  // küçük kabarcıklar
  for (let i = 0; i < bubbles.length * 0.5; i++) {
    bubbles.push({ tx: rand() * w, ty: rand() * h, rad: cell * (0.12 + rand() * 0.2), delay: 0.3 + rand() * 0.6, col: PAL[3], pop: rand(), k: 0, s: 1, a: 1 });
  }

  // yazı ölçüsü
  let size = Math.min(w * 0.15, 150);
  const font = (s) => `600 ${s}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
  x.font = font(size);
  const words = label.split(' ');
  let lines = [label];
  if (x.measureText(label).width > w * 0.84 && words.length > 1) {
    let best = 1;
    for (let i = 1; i < words.length; i++) {
      const diff = (k) => Math.abs(words.slice(0, k).join(' ').length - words.slice(k).join(' ').length);
      if (diff(i) < diff(best)) best = i;
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  const widest = Math.max(...lines.map((l) => x.measureText(l).width));
  size *= Math.min(1, (w * 0.84) / widest);

  const st = { bg: 1, text: 0, pop: 0 };
  const draw = () => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = `rgba(16,12,46,${st.bg})`;
    x.fillRect(0, 0, w, h);
    for (const b of bubbles) {
      if (b.k <= 0 || b.a <= 0.01) continue;
      const y = b.ty + (1 - b.k) * (h - b.ty + b.rad * 2 + 80);
      const rad = b.rad * b.s * (0.6 + 0.4 * b.k);
      x.globalAlpha = b.a;
      const g = x.createRadialGradient(b.tx - rad * 0.35, y - rad * 0.35, rad * 0.1, b.tx, y, rad);
      g.addColorStop(0, b.col[0]);
      g.addColorStop(1, b.col[1]);
      x.fillStyle = g;
      x.beginPath();
      x.arc(b.tx, y, rad, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,.55)';
      x.lineWidth = 1.5;
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,.75)';
      x.beginPath();
      x.ellipse(b.tx - rad * 0.38, y - rad * 0.42, rad * 0.2, rad * 0.11, -0.7, 0, Math.PI * 2);
      x.fill();
      if (b.s > 1.02) {
        // patlama çizgileri
        x.strokeStyle = `rgba(255,255,255,${b.a})`;
        x.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const an = (i / 6) * Math.PI * 2 + b.rad;
          const r0 = rad * 1.05;
          const r1 = rad * (1.05 + (b.s - 1) * 1.6);
          x.beginPath();
          x.moveTo(b.tx + Math.cos(an) * r0, y + Math.sin(an) * r0);
          x.lineTo(b.tx + Math.cos(an) * r1, y + Math.sin(an) * r1);
          x.stroke();
        }
      }
    }
    x.globalAlpha = 1;
    if (st.text > 0) {
      x.save();
      x.globalAlpha = st.text;
      x.font = font(size);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const lh = size * 1.0;
      const top = h * 0.42 - ((lines.length - 1) * lh) / 2;
      x.translate(w / 2, h * 0.42);
      const sc = 0.85 + 0.15 * st.text;
      x.scale(sc, sc);
      x.translate(-w / 2, -h * 0.42);
      x.lineJoin = 'round';
      x.lineWidth = size * 0.16;
      x.strokeStyle = '#100c2e';
      lines.forEach((l, i) => x.strokeText(l, w / 2, top + i * lh));
      x.fillStyle = '#ffffff';
      lines.forEach((l, i) => x.fillText(l, w / 2, top + i * lh));
      x.restore();
    }
  };

  let done = false;
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onUpdate: draw });
    const finish = () => {
      if (done) return;
      done = true;
      tl.kill();
      gsap.to(el, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          el.remove();
          document.documentElement.classList.remove('is-intro');
        },
      });
      resolve();
    };
    el.addEventListener('pointerdown', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
    bubbles.forEach((b) => tl.to(b, { k: 1, duration: 0.75, ease: 'back.out(1.4)' }, b.delay));
    tl.to(st, { text: 1, duration: 0.45, ease: 'power2.out' }, 0.75);
    bubbles.forEach((b) => tl.to(b, { s: 1.3, a: 0, duration: 0.28, ease: 'power1.out' }, 1.75 + b.pop * 0.55));
    tl.to(st, { bg: 0, duration: 0.5, ease: 'power1.inOut' }, 1.85);
    tl.to(st, { text: 0, duration: 0.3 }, 2.05);
    tl.call(finish, null, 2.45);
  });
}
