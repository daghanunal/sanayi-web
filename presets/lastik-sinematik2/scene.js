// Kar İzi: tek kalıcı WebGL sahnesi. Karlı, yüksek anahtarlı beyaz stüdyo; ortada kışlık bir lastik.
// Jant, disk ve kaliper lib3d `wheel` varlığından (gümüş jant, turuncu kaliper); lastiğin kendisi burada
// üretilir: yönlü V desenli kış dişi (lamelli bloklar, pah, TWI tümsekleri), kabartma yanak yazısı.
// main.js her karede bir "poz" verir (kamera, lastik konumu, aşınma, iz uzunluğu, otel yığını).
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const TAU = Math.PI * 2;
export const SNOW_BG = '#e9edf2';
const ORANGE = '#ff4d00';

// Lastik: 225/45 R17 (lib3d jantına oturan ölçü). Metre; sahne birimi = dış yarıçap (M ile ölçeklenir).
const SPEC = { Rb: 0.2159, R: 0.3172, SW: 0.225, TW: 0.192, D: 0.0085, RW: 0.19 };
const M = 1 / SPEC.R;
export const TYRE_SIZE = '225/45 R17';

// --- Profil (lib3d build_wheel.tyre_profile ile aynı çizgi; oluk tabanı seviyesinde) ---------------
function tyreProfile(S) {
  const { R, D, TW, SW, Rb, RW } = S;
  const hw = TW / 2, sw = SW / 2, sideH = R - Rb;
  const crown = (a) => R - 0.006 * (a / hw) ** 2 * (SW / 0.225);
  const pts = [];
  for (let k = 0; k <= 6; k++) {
    const a = (hw * k) / 6;
    pts.push([crown(a) - D, a]);
  }
  for (let k = 1; k <= 7; k++) {
    const ang = (k / 7) * (Math.PI / 2);
    pts.push([crown(hw) - D - sideH * 0.2 * (1 - Math.cos(ang)), hw + (sw - hw) * Math.sin(ang) * 0.93]);
  }
  const top = pts.at(-1)[0];
  for (let k = 1; k <= 14; k++) {
    const t = k / 14;
    const rr = top - (top - (Rb + sideH * 0.3)) * t;
    let aa = sw * (0.93 + 0.07 * Math.sin(t * Math.PI * 0.9));
    if (k === 4 || k === 11) aa += 0.0011;
    pts.push([rr, aa]);
  }
  const rp = Rb + sideH * 0.2;
  pts.push([rp + 0.004, sw * 0.975], [rp, sw * 0.99 + 0.002], [rp - 0.006, sw * 0.93], [Rb + 0.018, RW / 2 + 0.006], [Rb + 0.004, RW / 2 - 0.004], [Rb, RW / 2 - 0.012]);
  // omuz bölgesi (a tekdüze artan kısım) için taban yarıçapı
  const mono = pts.slice(0, 14);
  const baseR = (a) => {
    a = Math.abs(a);
    for (let i = 0; i < mono.length - 1; i++) {
      const [r0, a0] = mono[i], [r1, a1] = mono[i + 1];
      if (a >= a0 && a <= a1) return r0 + ((r1 - r0) * (a - a0)) / (a1 - a0);
    }
    return mono.at(-1)[0];
  };
  return { pts, baseR };
}

// --- Dokular -------------------------------------------------------------------------------------
function canvasTex(w, h, draw, { srgb = false, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function softSprite(inner, outer) {
  return canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }, { srgb: true });
}

// Kar: ince taneli gürültü (renk + kabartma)
function snowTextures() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N * N; i++) {
    const n = rnd();
    const v = 236 + n * 19 - (n > 0.985 ? 30 : 0);
    img.data[i * 4] = v - 3;
    img.data[i * 4 + 1] = v - 1;
    img.data[i * 4 + 2] = Math.min(255, v + 3);
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // yumuşak tümsekler
  g.globalAlpha = 0.06;
  for (let i = 0; i < 90; i++) {
    const x = rnd() * N, y = rnd() * N, r = 6 + rnd() * 26;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, rnd() > 0.5 ? '#ffffff' : '#9aa8ba');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(26, 26);
  map.anisotropy = 4;
  return map;
}

// Blok yüzü: zikzak lameller (siyah çizgi = oyuk). Kenarlarda beyaz pay: yan yüzler buradan örneklenir.
function sipeTexture() {
  return canvasTex(128, 128, (g, W, H) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#000';
    g.lineWidth = 3.2;
    g.lineJoin = 'miter';
    for (const u of [0.24, 0.43, 0.62, 0.8]) {
      g.beginPath();
      const x = u * W;
      for (let j = 0; j <= 10; j++) {
        const y = 10 + (j / 10) * (H - 20);
        g.lineTo(x + (j % 2 ? 3.5 : -3.5), y);
      }
      g.stroke();
    }
  });
}

// Yanak: kabartma yazı ve halkalar (bumpMap; beyaz = kabarık). Düzlemsel UV: ±R → 0..1.
function sidewallTexture(ad, size) {
  return canvasTex(size, size, (g, W) => {
    const cx = W / 2;
    const px = (r) => (r / SPEC.R) * cx;
    g.fillStyle = '#7a7a7a';
    g.fillRect(0, 0, W, W);
    // omuz altında ince eşmerkezli çizgiler (dekoratif şerit)
    for (let r = 0.289; r < 0.303; r += 0.0011) {
      g.strokeStyle = Math.round(r * 1e4) % 2 ? '#8c8c8c' : '#6c6c6c';
      g.lineWidth = Math.max(1, px(0.0005));
      g.beginPath();
      g.arc(cx, cx, px(r), 0, TAU);
      g.stroke();
    }
    // jant koruma kenarı üstünde ince tırtıl
    g.strokeStyle = '#949494';
    g.lineWidth = Math.max(1, px(0.0012));
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * TAU;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * px(0.2335), cx + Math.sin(a) * px(0.2335));
      g.lineTo(cx + Math.cos(a) * px(0.2385), cx + Math.sin(a) * px(0.2385));
      g.stroke();
    }
    const arcText = (text, r, center, font, fontPx, dir, track = 0.06) => {
      g.font = `${font} ${fontPx}px ${font.includes('Dela') ? '' : ''}`;
      g.font = font.replace('{px}', `${fontPx}px`);
      const chars = [...text];
      const widths = chars.map((ch) => g.measureText(ch).width + fontPx * track);
      const total = widths.reduce((a, b) => a + b, 0);
      const Rp = px(r);
      let ang = center - (dir * total) / Rp / 2;
      for (let i = 0; i < chars.length; i++) {
        const a = ang + (dir * widths[i]) / Rp / 2;
        g.save();
        g.translate(cx + Math.cos(a) * Rp, cx + Math.sin(a) * Rp);
        g.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
        g.fillText(chars[i], -widths[i] / 2 + (fontPx * track) / 2, fontPx * 0.36);
        g.restore();
        ang += (dir * widths[i]) / Rp;
      }
    };
    g.fillStyle = '#ffffff';
    const name = ad.toLocaleUpperCase('tr');
    const maxArc = px(0.262) * Math.PI * 0.95;
    let fs = px(0.019);
    g.font = `400 ${fs}px "Dela Gothic One", "Arial Black", sans-serif`;
    const w0 = [...name].reduce((a, ch) => a + g.measureText(ch).width + fs * 0.06, 0);
    if (w0 > maxArc) fs *= maxArc / w0;
    arcText(name, 0.263, -Math.PI / 2, '400 {px} "Dela Gothic One", "Arial Black", sans-serif', fs, 1);
    arcText(`${TYRE_SIZE}  M+S`, 0.262, Math.PI / 2, '700 {px} "Funnel Sans", system-ui, sans-serif', px(0.0135), -1, 0.1);
    arcText('KIŞ LASTİĞİ', 0.25, Math.PI / 2 + 0.0, '600 {px} "Funnel Sans", system-ui, sans-serif', px(0.0072), -1, 0.22);
    // 3PMSF: dağ + kar tanesi (her iki yanda)
    for (const a of [0.08, Math.PI - 0.08]) {
      g.save();
      g.translate(cx + Math.cos(a) * px(0.262), cx + Math.sin(a) * px(0.262));
      g.rotate(a + Math.PI / 2);
      const s = px(0.011);
      g.lineWidth = Math.max(1.5, s * 0.14);
      g.strokeStyle = '#fff';
      g.beginPath();
      g.moveTo(-s * 1.5, s * 0.9);
      g.lineTo(-s * 0.5, -s * 0.9);
      g.lineTo(0, -s * 0.1);
      g.lineTo(s * 0.5, -s * 0.8);
      g.lineTo(s * 1.5, s * 0.9);
      g.closePath();
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const b = (k / 3) * Math.PI;
        g.beginPath();
        g.moveTo(-Math.cos(b) * s * 0.42, s * 0.3 - Math.sin(b) * s * 0.42);
        g.lineTo(Math.cos(b) * s * 0.42, s * 0.3 + Math.sin(b) * s * 0.42);
        g.stroke();
      }
      g.restore();
    }
  });
}

// --- Diş deseni: bir adımdaki bloklar (s: çevresel, a: eksenel; metre) ---------------------------
// [a0, a1, eğim (ds/da), adım içi faz, oluk payı]
const ROWS = [
  [0.0035, 0.029, 0.95, 0.0, 0.0042],
  [0.0355, 0.0635, 0.55, 0.38, 0.0046],
  [0.0705, 0.108, 0.1, 0.12, 0.0062],
];

function blockPolys(pitch) {
  const out = [];
  for (const side of [1, -1]) {
    const phase = side > 0 ? 0 : 0.5;
    for (const [a0, a1, k, ph, gap] of ROWS) {
      const len = pitch - gap;
      const s0 = (ph + phase) * pitch;
      const nA = a1 - a0 > 0.03 ? 5 : 2;
      out.push({ side, a0, a1, k, s0, len, nA });
    }
  }
  return out;
}

// Bir adımın blok geometrisi (non-indexed, düz normaller). hgt: 0 taban, 1 tepe (aşınma kaydırması).
function pitchGeometry(pitch, Rt, baseR) {
  const D = SPEC.D, c = 0.0011;
  const pos = [], uv = [], hgt = [];
  const P = (s, a, h) => {
    const th = s / Rt;
    const r = baseR(a) + h;
    return [r * Math.cos(th), r * Math.sin(th), a];
  };
  const tri = (A, B, C, ua, ub, uc, ha, hb, hc) => {
    pos.push(...A, ...B, ...C);
    uv.push(...ua, ...ub, ...uc);
    hgt.push(ha, hb, hc);
  };
  const W = [0.03, 0.5];
  for (const b of blockPolys(pitch)) {
    const { side, a0, a1, k, s0, len, nA } = b;
    // ayak izi: A(a0) → B → (B..C) → C(a1) → D → (D..A); eğim yönü V şeklinde: s = s0 + k·|a - a0|
    const aAt = (t) => side * (a0 + (a1 - a0) * t);
    const poly = [];
    for (let i = 0; i <= nA; i++) poly.push([s0 + len + k * (a1 - a0) * (i / nA), aAt(i / nA), 1, i / nA]);
    for (let i = nA; i >= 0; i--) poly.push([s0 + k * (a1 - a0) * (i / nA), aAt(i / nA), 0, i / nA]);
    const n = poly.length;
    const cs = poly.reduce((m, p) => m + p[0], 0) / n;
    const ca = poly.reduce((m, p) => m + p[1], 0) / n;
    const inset = poly.map(([s, a, u, v]) => {
      const ds = cs - s, da = ca - a, L = Math.hypot(ds, da) || 1;
      return [s + (ds / L) * c * 1.35, a + (da / L) * c * 1.35, u, v];
    });
    const uvOf = (p) => [0.08 + p[2] * 0.84, 0.08 + p[3] * 0.84];
    const L0 = poly.map(([s, a]) => P(s, a, -0.0025));
    const L1 = poly.map(([s, a]) => P(s, a, D - c));
    const L2 = inset.map(([s, a]) => P(s, a, D));
    const h1 = (D - c) / D;
    // sarım: dışa bakan yüzler için yön, eksenel tarafa göre çevrilir
    const flip = side < 0;
    const q = (A, B, C, Dd, ua, ub, uc, ud, ha, hb, hc, hd) => {
      if (!flip) {
        tri(A, B, C, ua, ub, uc, ha, hb, hc);
        tri(A, C, Dd, ua, uc, ud, ha, hc, hd);
      } else {
        tri(A, C, B, ua, uc, ub, ha, hc, hb);
        tri(A, Dd, C, ua, ud, uc, ha, hd, hc);
      }
    };
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      q(L0[i], L0[j], L1[j], L1[i], W, W, W, W, 0, 0, h1, h1);
      q(L1[i], L1[j], L2[j], L2[i], W, W, uvOf(inset[j]), uvOf(inset[i]), h1, h1, 1, 1);
    }
    const C = P(cs, ca, D);
    const cuv = uvOf([0, 0, 0.5, 0.5]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (!flip) tri(L2[i], L2[j], C, uvOf(inset[i]), uvOf(inset[j]), cuv, 1, 1, 1);
      else tri(L2[i], C, L2[j], uvOf(inset[i]), cuv, uvOf(inset[j]), 1, 1, 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('hgt', new THREE.Float32BufferAttribute(hgt, 1));
  g.computeVertexNormals();
  return g;
}

// Kardaki iz: diş deseninden türetilir (bastırılmış kar tabanı + blok izleri). x = iz boyu (3 adım / doku).
function printTexture(pitch) {
  const W = 384, H = 192;
  const span = SPEC.TW / 2 + 0.014;
  return canvasTex(W, H, (g) => {
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, 'rgba(150,166,188,0)');
    base.addColorStop(0.06, 'rgba(150,166,188,.55)');
    base.addColorStop(0.5, 'rgba(160,174,194,.6)');
    base.addColorStop(0.94, 'rgba(150,166,188,.55)');
    base.addColorStop(1, 'rgba(150,166,188,0)');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    const X = (s) => (s / (pitch * 3)) * W;
    const Y = (a) => H / 2 - (a / span) * (H / 2) * 0.96;
    for (let rep = -1; rep < 4; rep++) {
      for (const b of blockPolys(pitch)) {
        const { side, a0, a1, k, s0, len } = b;
        const off = rep * pitch;
        g.beginPath();
        g.moveTo(X(off + s0), Y(side * a0));
        g.lineTo(X(off + s0 + len), Y(side * a0));
        g.lineTo(X(off + s0 + len + k * (a1 - a0)), Y(side * a1));
        g.lineTo(X(off + s0 + k * (a1 - a0)), Y(side * a1));
        g.closePath();
        g.fillStyle = 'rgba(92,108,132,.82)';
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,.5)';
        g.lineWidth = 1.2;
        g.stroke();
        g.strokeStyle = 'rgba(220,228,238,.55)';
        g.lineWidth = 1;
        for (let t = 0.25; t < 0.9; t += 0.19) {
          g.beginPath();
          g.moveTo(X(off + s0 + len * t), Y(side * a0));
          g.lineTo(X(off + s0 + len * t + k * (a1 - a0)), Y(side * a1));
          g.stroke();
        }
      }
    }
  }, { srgb: true });
}

// --- Lastik ----------------------------------------------------------------------------------------
function createTyre({ ad, lo }) {
  const { pts, baseR } = tyreProfile(SPEC);
  const group = new THREE.Group(); // dönen parça (metre)

  // Karkas: profil döndürülür, düzlemsel UV (yanak yazısı)
  const half = pts.map(([r, a]) => new THREE.Vector2(r, a));
  const full = [...half.slice(1).reverse().map((v) => new THREE.Vector2(v.x, -v.y)), ...half];
  const carcassGeo = new THREE.LatheGeometry(full, lo ? 120 : 200);
  carcassGeo.rotateX(Math.PI / 2);
  {
    const p = carcassGeo.attributes.position, uv = carcassGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      uv.setXY(i, 0.5 + ((z >= 0 ? 1 : -1) * x) / (2 * SPEC.R), 0.5 + y / (2 * SPEC.R));
    }
    uv.needsUpdate = true;
  }
  const swTex = sidewallTexture(ad, lo ? 1024 : 2048);
  swTex.anisotropy = 8;
  const side = new THREE.MeshStandardMaterial({
    color: '#1b1c1f', roughness: 0.74, metalness: 0, bumpMap: swTex, bumpScale: lo ? 2.2 : 3.2,
  });
  const carcass = new THREE.Mesh(carcassGeo, side);
  carcass.castShadow = carcass.receiveShadow = true;
  group.add(carcass);

  // Diş: bir adımın blokları, NP kez çoğaltılır
  const Rt = SPEC.R - SPEC.D;
  const NP = lo ? 58 : 70;
  const pitch = (TAU * Rt) / NP;
  const geo = pitchGeometry(pitch, Rt, baseR);
  const wearU = { value: 0 };
  const sipes = sipeTexture();
  sipes.anisotropy = 8;
  const tread = new THREE.MeshStandardMaterial({
    color: '#1d1e21', roughness: 0.9, metalness: 0, bumpMap: sipes, bumpScale: 3.5,
  });
  tread.onBeforeCompile = (sh) => {
    sh.uniforms.uWear = wearU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float hgt;\nuniform float uWear;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 rd = normalize(transformed.xy); transformed.xy -= rd * hgt * uWear; }');
  };
  const blocks = new THREE.InstancedMesh(geo, tread, NP);
  const m4 = new THREE.Matrix4();
  for (let k = 0; k < NP; k++) blocks.setMatrixAt(k, m4.makeRotationZ((k / NP) * TAU));
  blocks.castShadow = blocks.receiveShadow = true;
  group.add(blocks);

  // Aşınma göstergesi (TWI): çevresel oluklarda 1,6 mm'lik tümsekler, 6 noktada
  const twiGeo = new THREE.BoxGeometry(0.0055, 0.012, 1);
  const twiPts = [];
  for (let i = 0; i < 6; i++) for (const a of [0.0322, -0.0322, 0.067, -0.067]) twiPts.push([(i / 6) * TAU + 0.21, a]);
  const twi = new THREE.InstancedMesh(twiGeo, tread, twiPts.length);
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
  twiPts.forEach(([th, a], i) => {
    const r = baseR(a) + 0.0008;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), th);
    pv.set(Math.cos(th) * r, Math.sin(th) * r, a);
    sc.set(1, 0.14, Math.abs(a) < 0.05 ? 0.0055 : 0.006);
    // kutu: x = radyal (1,6 mm), y = çevresel, z = eksenel
    m4.compose(pv, q, new THREE.Vector3(0.0016 / 0.0055, 1, sc.z));
    twi.setMatrixAt(i, m4);
  });
  group.add(twi);

  function setWear(w) {
    wearU.value = w * SPEC.D * 0.81;
    tread.roughness = 0.9 - w * 0.16;
  }
  return { group, setWear, side, tread, NP, pitch };
}

// Otel için hafif lastik: dişler profil oluklarıyla, desen kabartma dokusuyla
function stackTyreGeo(lo) {
  const { pts, baseR } = tyreProfile(SPEC);
  const hw = SPEC.TW / 2 + 0.012;
  const grooves = [[0, 0.0035], [0.029, 0.0355], [0.0635, 0.0705]];
  const inG = (a) => grooves.some(([g0, g1]) => Math.abs(a) >= g0 && Math.abs(a) <= g1);
  const tread = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const a = -hw + (2 * hw * i) / n;
    tread.push(new THREE.Vector2(baseR(a) + (inG(a) ? 0 : SPEC.D), a));
  }
  const sideR = pts.slice(14).map(([r, a]) => new THREE.Vector2(r, a));
  const full = [...sideR.slice().reverse().map((v) => new THREE.Vector2(v.x, -v.y)), ...tread, ...sideR];
  const g = new THREE.LatheGeometry(full, lo ? 40 : 64);
  g.scale(M, M, M);
  return g;
}

// --- Sahne -------------------------------------------------------------------------------------------
export function createStage(canvas, { ad, stations, onReady }) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(SNOW_BG, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const maxDpr = lo ? 1.25 : 1.5;
  let dpr = Math.min(devicePixelRatio || 1, maxDpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SNOW_BG, 9, 30);
  scene.environmentIntensity = 0.9;
  scene.environmentRotation = new THREE.Euler(0, 1.9, 0);
  loadEnv('studio', renderer, { quality: q }).then((env) => (scene.environment = env)).catch(() => {});

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);

  // Işık: soğuk gün ışığı anahtar (yumuşak PCF gölge), gökyüzü dolgusu, arkadan buz mavisi kontur
  const key = new THREE.DirectionalLight('#f4f8ff', 2.3);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.radius = lo ? 3 : 5;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 24 });
  const KEY_OFF = new THREE.Vector3(-3.2, 7.5, 4.2);
  const back = new THREE.DirectionalLight('#cfe0ff', 1.3);
  back.position.set(3, 2.4, -5);
  const hemi = new THREE.HemisphereLight('#eef4fb', '#a9b6c6', 0.55);
  const warm = new THREE.PointLight(ORANGE, 0, 5, 1.6);
  scene.add(key, key.target, back, hemi, warm);

  // Zemin: kar
  const groundMat = new THREE.MeshStandardMaterial({ map: snowTextures(), color: '#ffffff', roughness: 0.96, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Temas gölgesi (lastiğin altında yumuşak kararma)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: softSprite('rgba(40,52,72,.5)', 'rgba(40,52,72,0)'), transparent: true, depthWrite: false,
  });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), shadowMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -0.996;
  scene.add(contact);

  // Lastik + jant
  const root = new THREE.Group();
  const assembly = new THREE.Group();
  assembly.scale.setScalar(M);
  root.add(assembly);
  scene.add(root);
  const tyre = createTyre({ ad, lo });
  assembly.add(tyre.group);
  let wheel = null;
  loadAsset('wheel', { quality: q, renderer })
    .then((W) => {
      wheel = W;
      if (W.nodes.tyre) W.nodes.tyre.visible = false;
      const mt = W.materials;
      // gümüş jant, parlak işlenmiş yüz, turuncu kaliper, açık renk göbek kapağı
      if (mt.rim_paint) {
        mt.rim_paint.color.set('#c9cfd7');
        mt.rim_paint.metalness = 0.8;
        mt.rim_paint.roughness = 0.34;
      }
      // işlenmiş yüz: ayna gibi değil, saten; yakın planda koyu ortamı yansıtıp siyah görünmesin
      if (mt.rim_face) {
        mt.rim_face.color.set('#dfe3e8');
        mt.rim_face.metalness = 0.85;
        mt.rim_face.roughness = 0.26;
      }
      if (mt.caliper_paint) {
        mt.caliper_paint.color.set(ORANGE);
        mt.caliper_paint.roughness = 0.38;
      }
      if (mt.cap_plastic) mt.cap_plastic.color.set('#e6eaef');
      assembly.add(W.scene);
      onReady?.();
    })
    .catch((e) => {
      console.warn('jant yüklenemedi', e);
      onReady?.();
    });

  // Kardaki iz
  const TRAIL_START = stations.start;
  const TILE = tyre.pitch * 3 * M;
  const printTex = printTexture(tyre.pitch);
  printTex.wrapS = THREE.RepeatWrapping;
  printTex.anisotropy = 4;
  const trailMat = new THREE.MeshStandardMaterial({
    map: printTex, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const trailGeo = new THREE.PlaneGeometry(1, (SPEC.TW + 0.03) * M);
  trailGeo.translate(0.5, 0, 0);
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(TRAIL_START, -0.994, 0);
  trail.receiveShadow = true;
  trail.visible = false;
  scene.add(trail);
  const trail2 = new THREE.Mesh(trailGeo, trailMat.clone());
  trail2.material.map = printTex.clone();
  trail2.material.map.needsUpdate = true;
  trail2.rotation.x = -Math.PI / 2;
  trail2.position.set(0, -0.994, 0);
  trail2.receiveShadow = true;
  trail2.visible = false;
  scene.add(trail2);

  // Kar direkleri: her hizmet için bir istasyon (turuncu-beyaz şeritli)
  const poles = new THREE.Group();
  const poleTex = canvasTex(8, 64, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#f4f6f8' : ORANGE;
      g.fillRect(0, i * 8, 8, 8);
    }
  }, { srgb: true });
  poleTex.magFilter = THREE.NearestFilter;
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.034, 1.4, 12);
  const poleMat = new THREE.MeshStandardMaterial({ map: poleTex, roughness: 0.45 });
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, stations.xs.length);
  stations.xs.forEach((x, i) => {
    m4tmp.compose(new THREE.Vector3(x, -0.3, 0.78), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.035)), new THREE.Vector3(1, 1, 1));
    poleMesh.setMatrixAt(i, m4tmp);
  });
  poleMesh.castShadow = true;
  poles.add(poleMesh);
  poles.visible = false;
  scene.add(poles);

  // Lastik oteli: etiketli yığınlar, arkada turuncu kirişli raf
  const otel = new THREE.Group();
  otel.visible = false;
  scene.add(otel);
  const STACKS = lo
    ? [[-1.1, 0.1], [0, -0.5], [1.1, 0.1], [-0.55, -1.8], [0.6, -2.0]]
    : [[-2.2, 0.25], [-1.1, -0.25], [0, 0.05], [1.1, -0.35], [2.2, 0.15], [-1.65, -2.1], [0.55, -2.3], [1.75, -1.95]];
  const PER = 6;
  const sScale = 0.46;
  const sGeo = stackTyreGeo(lo);
  const stackMat = new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.8, metalness: 0 });
  const otelTires = new THREE.InstancedMesh(sGeo, stackMat, STACKS.length * PER);
  otelTires.castShadow = otelTires.receiveShadow = true;
  const tagMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.55, side: THREE.DoubleSide });
  const tags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 0.075), tagMat, STACKS.length * PER);
  otelTires.frustumCulled = false;
  tags.frustumCulled = false;
  otel.add(otelTires, tags);
  // raf: gri dikmeler + turuncu kirişler (depo raflarının klasik rengi)
  {
    const steel = new THREE.MeshStandardMaterial({ color: '#8d96a2', metalness: 0.6, roughness: 0.45 });
    const beam = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.5, metalness: 0.2 });
    const rack = new THREE.Group();
    const upG = new THREE.BoxGeometry(0.07, 3.2, 0.07);
    const bmG = new THREE.BoxGeometry(2.3, 0.1, 0.06);
    for (const bx of [-2.4, 0, 2.4]) for (const bz of [-3.6, -4.4]) {
      const u = new THREE.Mesh(upG, steel);
      u.position.set(bx, 0.6, bz);
      rack.add(u);
    }
    for (const cx of [-1.2, 1.2]) for (const y of [0.05, 1.35]) for (const bz of [-3.6, -4.4]) {
      const b = new THREE.Mesh(bmG, beam);
      b.position.set(cx, y, bz);
      rack.add(b);
    }
    rack.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    otel.add(rack);
  }
  // rafta dik duran lastikler
  const RACK_N = lo ? 10 : 12;
  const rackTires = new THREE.InstancedMesh(sGeo, stackMat, RACK_N * 2);
  rackTires.castShadow = true;
  rackTires.frustumCulled = false;
  otel.add(rackTires);
  const rackSpecs = [];
  for (const [li, y] of [[0, 0.1], [1, 1.4]]) {
    for (let i = 0; i < RACK_N; i++) {
      const x = -2.25 + (i + 0.5) * (4.5 / RACK_N);
      rackSpecs.push({ x, y: y + 0.05 + sScale, z: -4.0, delay: (li * RACK_N + i) / (RACK_N * 2) });
    }
  }

  const otelSpecs = [];
  STACKS.forEach(([x, z], si) => {
    for (let j = 0; j < PER; j++) otelSpecs.push({ x, z, j, rot: (si * 1.7 + j * 0.9) % TAU, delay: (j * STACKS.length + si) / (STACKS.length * PER) });
  });
  const oM = new THREE.Matrix4(), oQ = new THREE.Quaternion(), oE = new THREE.Euler(), oP = new THREE.Vector3();
  const oS = new THREE.Vector3(sScale, sScale, sScale);
  const one = new THREE.Vector3(1, 1, 1);
  const bounce = (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  };
  let lastOtel = -1;
  const halfH = (SPEC.SW / 2) * M * sScale;
  function setOtel(p) {
    if (Math.abs(p - lastOtel) < 0.001) return;
    lastOtel = p;
    const h = SPEC.SW * M * sScale * 1.01;
    otelSpecs.forEach((s, i) => {
      const t = Math.min(1, Math.max(0, (p - s.delay * 0.7) / 0.3));
      const yRest = -1 + halfH + s.j * h;
      const y = t <= 0 ? 30 : yRest + (1 - bounce(t)) * 5;
      const wob = (1 - t) * 0.3;
      // lathe ekseni Y: yatık lastik
      oE.set(wob * Math.sin(i), s.rot, wob * Math.cos(i));
      oQ.setFromEuler(oE);
      oP.set(s.x, y, s.z);
      oM.compose(oP, oQ, oS);
      otelTires.setMatrixAt(i, oM);
      const ang = s.rot;
      oP.set(s.x + Math.sin(ang) * 1.005 * sScale, y, s.z + Math.cos(ang) * 1.005 * sScale);
      oE.set(0, ang, 0);
      oQ.setFromEuler(oE);
      oM.compose(oP, oQ, one);
      tags.setMatrixAt(i, oM);
    });
    rackSpecs.forEach((s, i) => {
      const t = Math.min(1, Math.max(0, (p - 0.1 - s.delay * 0.55) / 0.25));
      const e = 1 - (1 - t) ** 3;
      oE.set(0, 0, Math.PI / 2);
      oQ.setFromEuler(oE);
      oP.set(s.x, s.y, s.z + (1 - e) * 3.5);
      oM.compose(oP, oQ, t <= 0 ? new THREE.Vector3(0.0001, 0.0001, 0.0001) : oS);
      rackTires.setMatrixAt(i, oM);
    });
    otelTires.instanceMatrix.needsUpdate = true;
    tags.instanceMatrix.needsUpdate = true;
    rackTires.instanceMatrix.needsUpdate = true;
  }

  // Yağan kar
  const SNOW = lo ? 240 : 480;
  const snowGeo = new THREE.BufferGeometry();
  const nPos = new Float32Array(SNOW * 3);
  const nSeed = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    nPos[i * 3] = (Math.random() - 0.5) * 9;
    nPos[i * 3 + 1] = Math.random() * 5 - 1;
    nPos[i * 3 + 2] = (Math.random() - 0.5) * 7;
    nSeed[i] = Math.random();
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  const flake = softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
  const snowMat = new THREE.PointsMaterial({ map: flake, size: 0.05, transparent: true, depthWrite: false, opacity: 0.9, color: '#ffffff' });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  // Kar pofuduğu (lastik yere düşünce)
  const PUFF = lo ? 70 : 140;
  const puffGeo = new THREE.BufferGeometry();
  const pfPos = new Float32Array(PUFF * 3);
  const pfVel = new Float32Array(PUFF * 3);
  puffGeo.setAttribute('position', new THREE.BufferAttribute(pfPos, 3));
  const puffMat = new THREE.PointsMaterial({ map: flake, size: 0.16, transparent: true, depthWrite: false, opacity: 0, color: '#ffffff' });
  const puff = new THREE.Points(puffGeo, puffMat);
  puff.frustumCulled = false;
  scene.add(puff);
  let puffT = 99;
  function firePuff(x) {
    puffT = 0;
    for (let i = 0; i < PUFF; i++) {
      const a = Math.random() * TAU;
      const s = 0.8 + Math.random() * 2.2;
      pfPos[i * 3] = x + Math.cos(a) * 0.5;
      pfPos[i * 3 + 1] = -0.95;
      pfPos[i * 3 + 2] = Math.sin(a) * 0.3;
      pfVel[i * 3] = Math.cos(a) * s;
      pfVel[i * 3 + 1] = 1 + Math.random() * 2.4;
      pfVel[i * 3 + 2] = Math.sin(a) * s * 0.6;
    }
  }

  // --- Boyut ---
  let width = 1, height = 1, ox = 0, oy = 0;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyOffset();
  }
  function applyOffset() {
    camera.setViewOffset(width, height, -ox * width, -oy * height, width, height);
  }
  resize();

  // Performans: kare süresi yüksekse çözünürlüğü düşür
  let frameAcc = 0, frameN = 0;
  function adapt(dt) {
    frameAcc += dt;
    frameN++;
    if (frameN >= 45) {
      const avg = frameAcc / frameN;
      if (avg > 1 / 38 && dpr > 0.8) {
        dpr = Math.max(0.8, dpr - 0.2);
        renderer.setPixelRatio(dpr);
        resize();
      }
      frameAcc = 0;
      frameN = 0;
    }
  }

  const tmpV = new THREE.Vector3();
  const look = new THREE.Vector3();
  let spinAngle = 0, rollBase = 0, rolling = false, snowT = 0, wasOnGround = true;

  function render(po, dt) {
    const portrait = height > width;
    const fit = portrait ? po.fitP ?? 1.45 : 1;
    const tx = po.target[0], ty = po.target[1], tz = po.target[2];
    camera.position.set(tx + (po.cam[0] - tx) * fit, ty + (po.cam[1] - ty) * fit, tz + (po.cam[2] - tz) * fit);
    look.set(tx, ty, tz);
    camera.lookAt(look);
    const off = portrait ? po.offP ?? [0, 0] : po.off ?? [0, 0];
    if (off[0] !== ox || off[1] !== oy) {
      ox = off[0];
      oy = off[1];
      applyOffset();
    }

    const isOtel = po.mode === 'otel';
    otel.visible = isOtel;
    root.visible = !isOtel;
    contact.visible = !isOtel;
    if (isOtel) setOtel(po.otel ?? 0);

    const x = po.tireX ?? 0, y = po.tireY ?? 0;
    root.position.set(x, y, po.tireZ ?? 0);
    root.rotation.y = po.yaw ?? 0;
    root.rotation.z = po.lean ?? 0;
    if (po.rollAngle != null) {
      if (!rolling) rollBase = spinAngle - po.rollAngle;
      rolling = true;
      spinAngle = rollBase + po.rollAngle;
    } else {
      rolling = false;
      spinAngle += (po.spin ?? 0) * dt;
    }
    tyre.group.rotation.z = spinAngle;
    if (wheel?.nodes.spin) wheel.nodes.spin.rotation.z = spinAngle;
    tyre.setWear(po.wear ?? 0);
    warm.intensity = po.warm ?? 0;
    warm.position.set(x + 1.4, -0.6, 1.4);

    // gölge kamerası lastiği / sahneyi izler
    const fx = isOtel ? 0 : x;
    key.target.position.set(fx, -1, isOtel ? -1.2 : 0);
    key.position.copy(key.target.position).add(KEY_OFF);

    const lift = Math.max(0, y);
    contact.position.x = x;
    contact.position.z = po.tireZ ?? 0;
    const ss = 1 / (1 + lift * 0.6);
    contact.scale.set(ss, ss, 1);
    shadowMat.opacity = ss;

    const onGround = y < 0.05;
    if (onGround && !wasOnGround && po.puffOk) firePuff(x);
    wasOnGround = onGround;

    const tr = po.trail ?? 0;
    trail.visible = tr > 0.01;
    if (trail.visible) {
      trail.scale.x = tr;
      printTex.repeat.x = tr / TILE;
    }
    const tr2 = po.trail2 ?? 0;
    trail2.visible = tr2 > 0.01;
    if (trail2.visible) {
      trail2.position.x = po.trail2From ?? 0;
      trail2.scale.x = tr2;
      trail2.material.map.repeat.x = tr2 / TILE;
    }
    poles.visible = !!po.poles;

    snowT += dt;
    snowMat.opacity = po.snow ?? 0.8;
    snow.visible = snowMat.opacity > 0.02;
    if (snow.visible && dt > 0) {
      for (let i = 0; i < SNOW; i++) {
        const k = i * 3;
        nPos[k + 1] -= dt * (0.25 + nSeed[i] * 0.35) * (po.snowSpeed ?? 1);
        nPos[k] += Math.sin(snowT * 0.7 + nSeed[i] * 20) * dt * 0.12;
        if (nPos[k + 1] < -1) {
          nPos[k + 1] = 4;
          nPos[k] = look.x + (Math.random() - 0.5) * 9;
          nPos[k + 2] = look.z + (Math.random() - 0.5) * 7;
        }
        if (nPos[k] < look.x - 5) nPos[k] += 10;
        else if (nPos[k] > look.x + 5) nPos[k] -= 10;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    if (puffT < 1.6) {
      puffT += dt;
      for (let i = 0; i < PUFF; i++) {
        const k = i * 3;
        pfVel[k + 1] -= 4.5 * dt;
        pfVel[k] *= 0.97;
        pfVel[k + 2] *= 0.97;
        pfPos[k] += pfVel[k] * dt;
        pfPos[k + 1] = Math.max(-0.98, pfPos[k + 1] + pfVel[k + 1] * dt);
        pfPos[k + 2] += pfVel[k + 2] * dt;
      }
      puffGeo.attributes.position.needsUpdate = true;
      puffMat.opacity = Math.max(0, 0.95 * (1 - puffT / 1.6));
      puff.visible = true;
    } else puff.visible = false;

    renderer.render(scene, camera);
    if (dt > 0) adapt(dt);
  }

  function project(x, y, z) {
    tmpV.set(x, y, z).project(camera);
    return [(tmpV.x * 0.5 + 0.5) * width, (-tmpV.y * 0.5 + 0.5) * height, tmpV.z];
  }

  return { render, resize, project, renderer, quality: q };
}

const m4tmp = new THREE.Matrix4();
