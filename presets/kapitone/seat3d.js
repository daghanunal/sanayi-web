// Prosedürel 3D koltuk: çelik iskelet + yaylar, sünger blokları, deri kaplama (kapitone/dilim
// deseni, dikiş, ısıtma delikleri shader'da), iğne, döner tabla. Durum değerlerini main.js verir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

// Kutu → yuvarlatılmış kenarlı, önü kabarık yastık.
function pillow(w, h, d, { r = 0.03, bulge = 0.02, back = 0, step = 0.02 } = {}) {
  const sx = Math.max(4, Math.ceil(w / step));
  const sy = Math.max(4, Math.ceil(h / step));
  const sz = Math.max(3, Math.ceil(d / step));
  let g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  const pos = g.attributes.position;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const rr = Math.min(r, hx, hy, hz) * 0.999;
  const v = new THREE.Vector3();
  const inner = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    inner.set(clamp(v.x, -hx + rr, hx - rr), clamp(v.y, -hy + rr, hy - rr), clamp(v.z, -hz + rr, hz - rr));
    const n = v.clone().sub(inner);
    if (n.lengthSq() > 1e-12) v.copy(inner).add(n.normalize().multiplyScalar(rr));
    const puff = Math.max(0, 1 - (v.x / hx) ** 2) * Math.max(0, 1 - (v.y / hy) ** 2);
    if (v.z > 0) v.z += bulge * puff * (v.z / hz);
    else v.z += back * puff * (v.z / hz);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}


// Yan destek (bolster): dışı yüksek, içi alçak kama; uçlara doğru incelir.
// side: -1 sol, 1 sağ. Dönüş: geometri ve üst sırt çizgisi (biye için).
function bolster(w, h, d, side, { wedge = 0.07, taperTop = 0.3, taperBot = 0.05, step = 0.02 } = {}) {
  const g = pillow(w, h, d, { r: 0.034, bulge: 0.01, step });
  const pos = g.attributes.position;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const v = new THREE.Vector3();
  const bins = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const o = (v.x / hx) * side; // 1 = dış, -1 = iç
    const yn = v.y / hy;
    const taper = 1 - taperTop * Math.max(0, yn) ** 2 - taperBot * Math.max(0, -yn) ** 2;
    const front = (v.z + hz) / (2 * hz);
    v.z = -hz + (v.z + hz) * taper;
    v.x *= 1 - 0.18 * (1 - taper);
    // İç yüz eğimli ve düz: öne doğru iç kenar alçalır
    v.z -= wedge * ((1 - o) / 2) ** 1.4 * front;
    // Dış sırtta hafif yuvarlak kabarıklık
    v.z += 0.01 * Math.exp(-((o - 0.35) ** 2) / 0.18) * front * taper;
    pos.setXYZ(i, v.x, v.y, v.z);
    if (o > 0.05 && o < 0.8 && front > 0.5 && Math.abs(yn) < 0.97) {
      const k = Math.round(yn * 14);
      const best = bins.get(k);
      if (!best || v.z > best.z) bins.set(k, v.clone());
    }
  }
  g.computeVertexNormals();
  const pts = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([, p]) => p.add(new THREE.Vector3(0, 0, 0.0015)));
  return { geo: g, ridge: new THREE.CatmullRomCurve3(pts, false, 'centripetal') };
}

function zigzag(from, to, n, amp, axis) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const p = from.clone().lerp(to, i / n);
    if (i > 0 && i < n) p[axis] += i % 2 ? amp : -amp;
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
}

function roundedRect(cx, cy, w, h, z, plane = 'xy') {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, c = 0.04;
  const raw = [
    [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
  ];
  const pts = raw.map(([a, b]) => (plane === 'xy' ? new THREE.Vector3(a, b, z) : new THREE.Vector3(a, z, b)));
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.1);
}

// --- Deri shader'ı ---------------------------------------------------------

const GLSL_COMMON = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uThread; uniform float uPattern; uniform float uMat;
  uniform float uStitch; uniform float uWrap; uniform float uHeat; uniform float uTime; uniform float uHem;
  varying vec3 vLocal; varying vec3 vLN; varying float vWorldY;
  float kHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float kNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*f*(f*(f*6.-15.)+10.);
    return mix(mix(kHash(i), kHash(i+vec2(1,0)), f.x), mix(kHash(i+vec2(0,1)), kHash(i+vec2(1,1)), f.x), f.y); }
  // Deri gözenekleri: yumuşak çakıl deseni
  float kPebble(vec2 p){ float n = kNoise(p); return 1.0 - (2.0*n - 1.0)*(2.0*n - 1.0); }
  float kGrainH(vec2 p, float m){
    if (m < 0.5) return kPebble(p * 150.0) * 0.65 + kNoise(p * 330.0) * 0.35;
    if (m < 1.5) return kNoise(p * 520.0);
    vec2 w = abs(fract(p * 260.0) - 0.5);
    return smoothstep(0.1, 0.5, max(w.x, w.y)) * 0.6 + kNoise(p * 90.0) * 0.4;
  }
  vec3 kPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
    vec3 sx = normalize(dFdx(surf_pos)); vec3 sy = normalize(dFdy(surf_pos));
    vec3 r1 = cross(sy, surf_norm); vec3 r2 = cross(surf_norm, sx);
    float det = dot(sx, r1) * faceDir;
    vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
    return normalize(abs(det) * surf_norm - grad);
  }
`;

function leatherMaterial(U, insert) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.52, clearcoat: 0.18, clearcoatRoughness: 0.42,
    sheen: 0.25, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x3a2a24),
  });
  m.defines = insert ? { K_INSERT: 1 } : {};
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal; varying vec3 vLN; varying float vWorldY;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvLocal = position; vLN = normal; vWorldY = (modelMatrix * vec4(position, 1.0)).y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}`)
      .replace('#include <clipping_planes_fragment>', /* glsl */ `#include <clipping_planes_fragment>
        if (vWorldY < uWrap) discard;
        vec2 kp = vLocal.xy;
        float kFront = smoothstep(0.35, 0.8, vLN.z);
        float kE = 0.5; float kAlong = 0.0; float kCell = 1.0;
        #ifdef K_INSERT
          if (uPattern < 0.5) {
            kCell = 0.062;
            vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * kp / kCell;
            vec2 f = fract(q) - 0.5;
            kE = 0.5 - max(abs(f.x), abs(f.y));
            kAlong = abs(f.x) > abs(f.y) ? q.y : q.x;
          } else if (uPattern < 1.5) {
            kCell = 0.058;
            float f = fract(kp.x / kCell + 0.5) - 0.5;
            kE = 0.5 - abs(f);
            kAlong = kp.y / kCell;
          }
          kE = mix(0.5, kE, kFront);
        #endif
        // Dikiş sırası: yukarıdan aşağı, satır satır zikzak
        float kRow = floor((0.3 - kp.y) / 0.04);
        float kX = clamp((kp.x + 0.17) / 0.34, 0.0, 1.0);
        kX = mod(kRow, 2.0) > 0.5 ? 1.0 - kX : kX;
        float kRv = (kRow + kX) / 15.0;
        float kSewn = step(kRv, uStitch);
        float kHead = (1.0 - smoothstep(0.0, 0.0035, abs(kRv - uStitch))) * step(0.001, uStitch) * step(uStitch, 0.999);
        float kHem = 1.0 - smoothstep(0.0, 0.012, vWorldY - uWrap);
      `)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        float kGroove = smoothstep(0.0, 0.16, kE);
        vec3 kBase = uColor;
        #ifdef K_INSERT
          kBase *= mix(0.45, 1.0, mix(1.0, kGroove, kSewn * 0.6 + 0.4));
          float kLine = 1.0 - smoothstep(0.018, 0.034, abs(kE - 0.085));
          float kDash = step(0.42, fract(kAlong * 7.0));
          float kSt = kLine * kDash * kSewn * step(uPattern, 1.5) * kFront;
          kBase = mix(kBase, uThread, kSt);
          // Isıtma delikleri
          vec2 kg = fract(kp / 0.014) - 0.5;
          float kHole = (1.0 - smoothstep(0.14, 0.24, length(kg))) * step(0.14, kE) * kFront * uHeat;
          kBase *= 1.0 - kHole * 0.7;
        #endif
        diffuseColor.rgb = kBase;
      `)
      .replace('#include <roughnessmap_fragment>', /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (kNoise(kp * 40.0) - 0.5) * 0.12 * (1.0 - uMat * 0.4), 0.05, 1.0);
      `)
      .replace('#include <normal_fragment_maps>', /* glsl */ `#include <normal_fragment_maps>
        float kH = 0.0;
        #ifdef K_INSERT
          kH += smoothstep(0.0, 0.3, kE) * 0.004;
        #endif
        // Doku yönü: yan yüzlerde gerilmesin diye baskın eksene göre seç
        vec3 kAn = abs(vLN);
        vec2 kgp = kAn.x > 0.7 ? vLocal.zy : (kAn.y > 0.7 ? vLocal.xz : vLocal.xy);
        float kFreq = uMat < 0.5 ? 330.0 : (uMat < 1.5 ? 520.0 : 260.0);
        float kAmp = uMat < 0.5 ? 0.00011 : (uMat < 1.5 ? 0.00003 : 0.00007);
        // Piksel boyutunu aşan ayrıntıyı söndür: blok/kırpışma olmasın
        float kFw = length(fwidth(kgp)) * kFreq;
        kAmp *= 1.0 - smoothstep(0.25, 0.9, kFw);
        vec2 kDH = vec2(dFdx(kH), dFdy(kH));
        if (kAmp > 0.0) {
          float kEps = 0.35 / kFreq;
          vec2 kGr = vec2(kGrainH(kgp + vec2(kEps, 0.0), uMat) - kGrainH(kgp - vec2(kEps, 0.0), uMat),
                          kGrainH(kgp + vec2(0.0, kEps), uMat) - kGrainH(kgp - vec2(0.0, kEps), uMat)) / (2.0 * kEps);
          kDH += kAmp * vec2(dot(kGr, dFdx(kgp)), dot(kGr, dFdy(kgp)));
        }
        normal = kPerturb(-vViewPosition, normal, kDH, faceDirection);
      `)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += uThread * kHem * uHem * 2.5;
        #ifdef K_INSERT
          totalEmissiveRadiance += uThread * kHead * kSt * 4.0;
          float kPulse = 0.75 + 0.25 * sin(uTime * 3.0);
          totalEmissiveRadiance += vec3(1.0, 0.35, 0.08) * (kHole * 2.2 * kPulse + uHeat * 0.18 * smoothstep(0.05, 0.35, kE) * kFront);
        #endif
      `);
  };
  m.customProgramCacheKey = () => (insert ? 'k-insert' : 'k-plain');
  return m;
}

function foamMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xd9c77e, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFoam;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFoam = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFoam;
        float fH(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float pore = fH(vFoam * 380.0);
        diffuseColor.rgb *= 0.82 + 0.18 * pore;`);
  };
  return m;
}

// --- Sahne -----------------------------------------------------------------

export const DEFAULT_STATE = {
  frame: 1, foam: 0, wrap: 0, stitch: 0, heat: 0,
  theta: 0.7, phi: 0.18, dist: 2.3, tx: 0, ty: 0.42, tz: 0,
  spin: 0, sx: 0, sy: 0, dim: 1, turn: 0, cfg: 0,
};

export function createSeat(canvas, { low = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let dpr = Math.min(window.devicePixelRatio || 1, low ? 1.2 : 1.5);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 40);

  const key = new THREE.DirectionalLight(0xffd6ad, 2.4);
  key.position.set(1.6, 2.6, 2.2);
  const rim = new THREE.DirectionalLight(0xff9c5a, 2.2);
  rim.position.set(-2.2, 1.4, -2.4);
  const fill = new THREE.HemisphereLight(0xffe7d0, 0x1a0f0b, 0.35);
  const spot = new THREE.SpotLight(0xffc98a, 0, 6, 0.42, 0.7, 1.2);
  spot.position.set(0.3, 2.9, 0.9);
  scene.add(key, rim, fill, spot, spot.target);

  const step = low ? 0.032 : 0.02;
  const U = {
    uColor: { value: new THREE.Color('#1f1512') },
    uThread: { value: new THREE.Color('#e7a33a') },
    uPattern: { value: 0 }, uMat: { value: 0 },
    uStitch: { value: 0 }, uWrap: { value: 2 }, uHeat: { value: 0 }, uTime: { value: 0 }, uHem: { value: 1 },
  };
  const matInsert = leatherMaterial(U, true);
  const matPlain = leatherMaterial(U, false);
  const matFoam = foamMaterial();
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.95, roughness: 0.32 });
  const matTrim = new THREE.MeshStandardMaterial({ color: 0x141112, metalness: 0.2, roughness: 0.55 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.12 });

  const root = new THREE.Group();
  const seat = new THREE.Group();
  root.add(seat);
  scene.add(root);

  const leather = [];
  const foams = [];
  const tubes = [];

  function part(parent, geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], foamAxis = 'y', order = 0 } = {}) {
    const holder = new THREE.Group();
    holder.position.set(...pos);
    holder.rotation.set(...rot);
    parent.add(holder);
    const mesh = new THREE.Mesh(geo, mat);
    holder.add(mesh);
    leather.push(mesh);
    const fg = geo.clone();
    fg.scale(0.975, 0.975, 0.96);
    const foam = new THREE.Mesh(fg, matFoam);
    holder.add(foam);
    foams.push({ mesh: foam, axis: foamAxis, order });
    return mesh;
  }

  // Biye: bolster sırtı boyunca ince deri boru
  function piping(mesh, curve) {
    const g = new THREE.TubeGeometry(curve, low ? 24 : 48, 0.0032, low ? 5 : 7, false);
    mesh.add(new THREE.Mesh(g, matPlain));
  }

  // Oturak
  const cushion = new THREE.Group();
  cushion.position.set(0, 0.3, 0.02);
  cushion.rotation.x = 0.07;
  seat.add(cushion);
  const cushionInsert = part(cushion, pillow(0.34, 0.46, 0.1, { r: 0.03, bulge: 0.025, step }), matInsert, {
    rot: [-Math.PI / 2, 0, 0], foamAxis: 'z', order: 0,
  });
  for (const s of [-1, 1]) {
    const b = bolster(0.12, 0.47, 0.14, s, { wedge: 0.055, taperTop: 0.28, taperBot: 0.04, step });
    const m = part(cushion, b.geo, matPlain, {
      pos: [s * 0.226, 0.005, 0.012], rot: [-Math.PI / 2, s * 0.06, 0], foamAxis: 'z', order: 1,
    });
    piping(m, b.ridge);
  }

  // Sırtlık
  const back = new THREE.Group();
  back.position.set(0, 0.33, -0.23);
  back.rotation.x = -0.2;
  seat.add(back);
  const backInsert = part(back, pillow(0.34, 0.56, 0.1, { r: 0.03, bulge: 0.03, step }), matInsert, {
    pos: [0, 0.3, 0], order: 2,
  });
  for (const s of [-1, 1]) {
    const b = bolster(0.12, 0.6, 0.16, s, { wedge: 0.07, taperTop: 0.4, taperBot: 0.06, step });
    const m = part(back, b.geo, matPlain, { pos: [s * 0.228, 0.3, 0.028], rot: [0, -s * 0.1, 0], order: 3 });
    piping(m, b.ridge);
  }
  const head = part(back, pillow(0.27, 0.17, 0.1, { r: 0.045, bulge: 0.02, back: 0.01, step }), matPlain, {
    pos: [0, 0.73, 0.0], order: 4,
  });
  head.parent.rotation.x = 0.06;

  // Arka kabuk, alt plastik, raylar
  const shell = new THREE.Mesh(pillow(0.58, 0.62, 0.05, { r: 0.02, back: 0.02, step: step * 1.4 }), matTrim);
  shell.position.set(0, 0.3, -0.085);
  back.add(shell);
  const base = new THREE.Mesh(pillow(0.58, 0.07, 0.5, { r: 0.02, bulge: 0, step: step * 1.4 }), matTrim);
  base.position.set(0, 0.2, 0.02);
  seat.add(base);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.62), matSteel);
    rail.position.set(s * 0.19, 0.145, 0.03);
    seat.add(rail);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 10), matChrome);
    post.position.set(s * 0.07, 0.62, 0);
    back.add(post);
  }

  // Çelik iskelet ve yaylar (çizilerek görünür)
  const tubeR = 0.0065;
  const addTube = (parent, curve, r = tubeR, segs = 90) => {
    const g = new THREE.TubeGeometry(curve, low ? Math.ceil(segs * 0.6) : segs, r, low ? 5 : 8, curve.closed);
    const mesh = new THREE.Mesh(g, matSteel);
    parent.add(mesh);
    tubes.push({ mesh, count: g.index.count, curve });
  };
  addTube(back, roundedRect(0, 0.31, 0.5, 0.62, -0.045), 0.009, 120);
  for (let i = 0; i < 4; i++) {
    const y = 0.1 + i * 0.13;
    addTube(back, zigzag(new THREE.Vector3(-0.22, y, -0.04), new THREE.Vector3(0.22, y, -0.04), 12, 0.022, 'y'), 0.004, 80);
  }
  addTube(seat, roundedRect(0, 0.02, 0.52, 0.5, 0.27, 'xz'), 0.009, 120);
  for (let i = 0; i < 4; i++) {
    const x = -0.15 + i * 0.1;
    addTube(seat, zigzag(new THREE.Vector3(x, 0.27, -0.2), new THREE.Vector3(x, 0.27, 0.23), 10, 0.022, 'x'), 0.004, 70);
  }
  const sparks = tubes.map(() => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffb05a }));
    s.visible = false;
    return s;
  });
  tubes.forEach((t, i) => t.mesh.parent.add(sparks[i]));

  // İğne (sırtlığın önünde, dikiş başını takip eder)
  const needle = new THREE.Group();
  const nBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.1, 8), matChrome);
  nBody.position.y = 0.05;
  const nTip = new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.018, 8), matChrome);
  nTip.rotation.x = Math.PI;
  nTip.position.y = -0.009;
  needle.add(nBody, nTip);
  needle.rotation.x = Math.PI / 2 + 0.15;
  needle.scale.setScalar(0.9);
  backInsert.add(needle);

  // Döner tabla ve zemin gölgesi
  const turntable = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.64, 0.05, 72), new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 0.35, metalness: 0.4 }));
  disc.position.y = 0.105;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe7a33a, transparent: true, opacity: 0 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.635, 0.004, 8, 120), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.13;
  turntable.add(disc, ring);
  scene.add(turntable);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grd = sctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.75)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grd;
  sctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.11;
  scene.add(shadow);

  // Koltuk dünya yüksekliği (deri örtme sınırı için)
  const box = new THREE.Box3().setFromObject(seat);
  const wrapTop = box.max.y + 0.03;
  const wrapBottom = box.min.y - 0.02;

  // --- Durum ---------------------------------------------------------------
  const target = { ...DEFAULT_STATE };
  const cur = { ...DEFAULT_STATE };
  const extra = { intro: 0, restitch: 1, userYaw: 0, autoYaw: 0 };
  let active = true;
  let width = 1, height = 1;
  const look = new THREE.Vector3();

  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  let slow = 0, frames = 0;

  function apply(dt, time) {
    const k = 1 - Math.exp(-dt * 7);
    for (const key in target) cur[key] += (target[key] - cur[key]) * k;

    // İskelet çizimi
    const fr = Math.min(cur.frame, extra.intro);
    tubes.forEach((t, i) => {
      const p = clamp(fr * 1.25 - (i % 5) * 0.06, 0, 1);
      t.mesh.visible = p > 0.001 && cur.wrap < 0.985;
      t.mesh.geometry.setDrawRange(0, Math.floor((t.count * p) / 3) * 3);
      const sp = sparks[i];
      sp.visible = p > 0.01 && p < 0.99;
      if (sp.visible) sp.position.copy(t.curve.getPointAt(p));
    });

    // Sünger düşüşü
    const n = 5;
    foams.forEach((f) => {
      const t = clamp(cur.foam * (1 + n * 0.22) - f.order * 0.22, 0, 1);
      f.mesh.visible = t > 0.001 && cur.wrap < 0.995;
      const drop = (1 - t * t) * 0.9;
      const sq = t > 0.8 ? Math.sin(((t - 0.8) / 0.2) * Math.PI) * 0.22 : 0;
      f.mesh.position.set(0, 0, 0);
      f.mesh.scale.set(1 + sq * 0.4, 1 + sq * 0.4, 1 + sq * 0.4);
      if (f.axis === 'z') {
        f.mesh.position.z = drop;
        f.mesh.scale.z = 1 - sq;
      } else {
        f.mesh.position.y = drop;
        f.mesh.scale.y = 1 - sq;
      }
    });

    // Deri, dikiş, ısıtma
    U.uWrap.value = THREE.MathUtils.lerp(wrapTop, wrapBottom, clamp(cur.wrap, 0, 1));
    U.uHem.value = cur.wrap > 0.002 && cur.wrap < 0.998 ? 1 : 0;
    const st = Math.min(cur.stitch, extra.restitch);
    U.uStitch.value = st;
    U.uHeat.value = cur.heat;
    U.uTime.value = time;
    leather.forEach((m) => (m.visible = cur.wrap > 0.002));

    // İğne
    if (Math.abs(st - lastStitch) > 0.00005) stitchHold = 0.25;
    else stitchHold = Math.max(0, stitchHold - dt);
    lastStitch = st;
    const showNeedle = stitchHold > 0 && st > 0.003 && st < 0.995 && cur.wrap > 0.9;
    needle.visible = showNeedle;
    if (showNeedle) {
      const r = st * 15;
      const row = Math.floor(r);
      const xf = r - row;
      const x = row % 2 ? 0.17 - xf * 0.34 : -0.17 + xf * 0.34;
      const y = 0.3 - (row + 0.5) * 0.04;
      needle.position.set(x, y, 0.05 + Math.abs(Math.sin(time * 22)) * 0.025);
    }

    // Döner tabla, spot
    turntable.visible = cur.turn > 0.01;
    turntable.scale.set(1, Math.max(0.001, cur.turn), 1);
    ringMat.opacity = cur.turn;
    spot.intensity = cur.turn * 42;
    spot.target.position.set(0, 0.4, 0);
    scene.environmentIntensity = 0.35 + 0.25 * cur.dim;

    extra.autoYaw += dt * 0.45 * cur.turn;
    if (cur.turn < 0.02) {
      const nearest = Math.round(extra.autoYaw / TAU) * TAU;
      extra.autoYaw += (nearest - extra.autoYaw) * k;
    }
    if (cur.cfg < 0.5 && !dragging) extra.userYaw *= 1 - k * 0.5;
    seat.rotation.y = cur.spin + extra.userYaw + extra.autoYaw;
    shadow.rotation.z = seat.rotation.y;

    // Kamera
    const portrait = width / height < 1;
    const fit = portrait ? Math.max(1, 0.78 / (width / height)) : 1;
    const dist = cur.dist * fit;
    look.set(cur.tx, cur.ty, cur.tz);
    camera.position.set(
      look.x + dist * Math.cos(cur.phi) * Math.sin(cur.theta),
      look.y + dist * Math.sin(cur.phi),
      look.z + dist * Math.cos(cur.phi) * Math.cos(cur.theta)
    );
    camera.lookAt(look);
    camera.setViewOffset(width, height, -cur.sx * width, -cur.sy * height, width, height);
    renderer.toneMappingExposure = 0.25 + 0.85 * cur.dim;
  }

  let dragging = false;
  let lastStitch = 0, stitchHold = 0;

  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!active) return;
    apply(dt, now / 1000);
    renderer.render(scene, camera);
    // Uyarlanabilir çözünürlük
    frames++;
    if (dt > 0.026) slow++;
    if (frames >= 45) {
      if (slow > 18 && dpr > 0.75) {
        dpr = Math.max(0.75, dpr - 0.25);
        resize();
      }
      frames = 0;
      slow = 0;
    }
  }

  async function compile() {
    // Tüm parçalar görünürken derle; ilk scroll'da takılma olmasın
    const vis = [];
    scene.traverse((o) => { vis.push([o, o.visible]); o.visible = true; });
    U.uWrap.value = -5;
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    renderer.render(scene, camera);
    vis.forEach(([o, v]) => (o.visible = v));
  }

  return {
    target, cur, extra, U, renderer,
    ready: compile(),
    frame,
    renderOnce() { apply(1, performance.now() / 1000); renderer.render(scene, camera); },
    setActive(v) {
      if (v && !active) last = performance.now();
      active = v;
    },
    setDragging(v) { dragging = v; },
    setMaterial(props) {
      for (const m of [matInsert, matPlain]) Object.assign(m, props);
    },
    matInsert, matPlain,
  };
}
