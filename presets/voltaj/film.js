// Scroll'a bağlı "film": sahne parametreleri scroll konumunun parça parça fonksiyonudur.
// Her bölüm (segment) bir ScrollTrigger aralığında a → b değerlerini verir. Bölümler
// arasındaki boşluklarda değerler yumuşak geçişle bir sonraki bölümün başlangıcına akar.
import { ScrollTrigger } from '../../shared/core.js';

const smooth = (t) => t * t * (3 - 2 * t);

export function createFilm() {
  const segments = [];
  let keys = {};

  function add({ trigger, start = 'top bottom', end = 'bottom top', a = {}, b = a, ease = 'smooth', pin }) {
    const st = ScrollTrigger.create({ trigger, start, end, pin, pinSpacing: pin ? true : undefined });
    segments.push({ st, a, b, ease });
    return st;
  }

  function rebuild() {
    keys = {};
    for (const s of segments) {
      const y0 = s.st.start;
      const y1 = s.st.end;
      for (const [p, v] of Object.entries(s.a)) (keys[p] ??= []).push({ y: y0, v, ease: s.ease, inSeg: true });
      for (const [p, v] of Object.entries(s.b)) (keys[p] ??= []).push({ y: y1, v, ease: 'smooth', inSeg: false });
    }
    for (const list of Object.values(keys)) list.sort((m, n) => m.y - n.y);
  }

  function sample(p, y) {
    const list = keys[p];
    if (!list?.length) return undefined;
    if (y <= list[0].y) return list[0].v;
    const last = list[list.length - 1];
    if (y >= last.y) return last.v;
    let i = 0;
    while (list[i + 1].y < y) i++;
    const k0 = list[i];
    const k1 = list[i + 1];
    const span = k1.y - k0.y;
    let t = span > 0 ? (y - k0.y) / span : 1;
    t = k0.ease === 'linear' ? t : smooth(t);
    return k0.v + (k1.v - k0.v) * t;
  }

  function apply(target, y) {
    for (const p of Object.keys(keys)) {
      const v = sample(p, y);
      if (v !== undefined) target[p] = v;
    }
  }

  ScrollTrigger.addEventListener('refresh', rebuild);
  return { add, rebuild, apply, sample };
}
