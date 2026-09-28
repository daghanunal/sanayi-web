// Fotogerçekçi teker: lib3d wheel varlığının Cycles render katmanları (bkz. render.sh).
// Tekerin ekseninden, eksene göre simetrik ışıkla render edildiği için görüntüyü CSS ile döndürmek
// gerçek bir dönüşle aynı sonucu verir. Katmanlar (alttan üste): disk (döner), kaliper (sabit),
// lastik + jant (döner), yanak yazısı (döner, canvas: metin DOM'da değil), sabit ışık parlaması.
// Hızlanınca her dönen katmanın hareket bulanıklığı olan kopyası görünür.
import { asset } from '../../shared/core.js';
import geo from './render.json';

const src = (n) => asset(`/img/pist/r-wheel-${n}.webp`);

function img(cls, name, eager) {
  return `<img class="${cls}" src="${src(name)}" alt="" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} draggable="false">`;
}

// Yanak yazısı: kabartma kauçuk harfler gibi (koyu zemin üstünde hafif açık, üstten ince ışık)
function drawSidewall(canvas, text, font) {
  const S = canvas.width;
  const c = canvas.getContext('2d');
  const k = S / geo.size;
  const rIn = geo.side_in * k, rOut = geo.side_out * k;
  const r = (rIn + rOut) / 2 - (rOut - rIn) * 0.02;
  const size = (rOut - rIn) * 0.36;
  c.clearRect(0, 0, S, S);
  c.translate(S / 2, S / 2);
  c.font = `900 ${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const track = size * 0.14;
  const widths = [...text].map((ch) => c.measureText(ch).width + track);
  const total = widths.reduce((a, b) => a + b, 0);
  // iki kez yaz (karşılıklı), yay uzunluğu çevreyi aşarsa küçült
  const arc = Math.min(total / r, Math.PI * 0.92);
  const scale = arc / (total / r);
  for (const start of [-Math.PI / 2 - arc / 2, Math.PI / 2 - arc / 2]) {
    let a = start;
    [...text].forEach((ch, i) => {
      const w = (widths[i] * scale) / r;
      a += w / 2;
      c.save();
      c.rotate(a + Math.PI / 2);
      c.translate(0, -r);
      c.scale(scale, scale);
      c.fillStyle = 'rgba(0,0,0,.55)';
      c.fillText(ch, 0, size * 0.04);
      c.fillStyle = 'rgba(214,218,224,.26)';
      c.fillText(ch, 0, 0);
      c.restore();
      a += w / 2;
    });
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
}

export function createWheel(el, { sidewall, eager = false, font = "'Big Shoulders', 'Arial Narrow', sans-serif" }) {
  el.classList.add('wheel');
  el.innerHTML = `
    <div class="wheel__spin">${img('wheel__sharp', 'back', eager)}${img('wheel__blur', 'back-blur')}</div>
    ${img('wheel__caliper', 'caliper', eager)}
    <div class="wheel__spin">${img('wheel__sharp', 'front', eager)}${img('wheel__blur', 'front-blur')}<canvas class="wheel__text" width="1024" height="1024"></canvas></div>
    <i class="wheel__sheen"></i>`;
  const spinning = [...el.querySelectorAll('.wheel__spin')];
  const blurs = [...el.querySelectorAll('.wheel__blur')];
  const sharps = [...el.querySelectorAll('.wheel__sharp')];
  const canvas = el.querySelector('canvas');
  const paint = () => drawSidewall(canvas, sidewall, font);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(paint);
  let lastB = -1;
  return {
    el,
    set(angle, speed = 0) {
      const t = `rotate(${angle.toFixed(2)}deg)`;
      for (const s of spinning) s.style.transform = t;
      const b = Math.round(Math.min(speed, 1) * 40) / 40;
      if (b !== lastB) {
        lastB = b;
        for (const x of blurs) x.style.opacity = b;
        for (const x of sharps) x.style.opacity = 1 - b * 0.85;
      }
    },
  };
}
