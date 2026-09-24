// Kodla çizilmiş orta sınıf sedan, ekspertiz bölmesinde: tarama kapısı, iki direkli lift,
// dinamometre merdaneleri, OBD kablo ağı. Gövde tek bir shader ile panel panel ayrılır;
// boya kalınlığı sınıfı her panelde renk olarak görünür.
// Sahne durumu dışarıdan `update(state)` ile verilir; kurgu main.js'te.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// Ölçüler (metre). Ön +x, sağ +z, zemin y = 0.
export const CAR = { len: 4.5, wheelX: 1.38, wheelR: 0.33, track: 0.76 };
const BG = 0x0b0c12;

// Hermite eğrisi: [x, y] noktaları (x artan)
function curve(pts) {
  const n = pts.length;
  const m = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    return (b[1] - a[1]) / (b[0] - a[0] || 1);
  });
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (x > pts[i + 1][0]) i++;
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const h = x1 - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[i + 1];
  };
}

const topY = curve([
  [-2.25, 0.6], [-2.2, 0.84], [-2.08, 0.96], [-1.85, 1.0], [-1.5, 1.02], [-1.22, 1.16], [-0.85, 1.37],
  [-0.4, 1.43], [0.15, 1.42], [0.45, 1.32], [0.92, 0.97], [1.2, 0.9], [1.8, 0.83], [2.1, 0.74], [2.25, 0.5],
]);
const botY = curve([[-2.25, 0.44], [-2.1, 0.34], [-1.8, 0.3], [1.9, 0.29], [2.15, 0.34], [2.25, 0.42]]);
export const beltY = (x) => 0.92 - x * 0.02;
const halfW = (x) => 0.9 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / 2.262, 4)), 1 / 4);

// Tek yan kesit çizgisi: alt ortadan üst ortaya, (z, y)
function halfContour(x, K) {
  const b = botY(x), t = Math.max(topY(x), b + 0.05), W = Math.max(halfW(x), 0.02);
  const be = Math.min(beltY(x), t - 0.001);
  const cab = smooth(0.0, 0.22, t - be);
  const r1 = Math.min(0.13, (be - b) * 0.4, W * 0.4);
  const wr = W * (1 - 0.26 * cab);
  const r2 = Math.min(0.11, W * 0.3, (t - b) * 0.3);
  const P = [];
  const arc = (cx, cy, r, a0, a1, n = 6) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  P.push([0, b]);
  arc(W - r1, b + r1, r1, -Math.PI / 2, 0);
  const yShoulder = Math.max(be, b + r1 + 0.01);
  P.push([W, yShoulder]);
  if (cab > 0.02) {
    P.push([W * (1 - 0.03 * cab), yShoulder + 0.02 * cab]);
    // Cam hattı içeri eğilerek tavana çıkar
    const topCorner = [wr - r2, t - r2];
    arc(topCorner[0], topCorner[1], r2, -0.25, Math.PI / 2);
  } else {
    arc(W - r2, t - r2, r2, 0, Math.PI / 2);
  }
  P.push([0, t + 0.012 * cab]);
  // yay uzunluğuna göre K noktaya yeniden örnekle
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const out = [];
  for (let k = 0; k < K; k++) {
    const s = (k / (K - 1)) * L.at(-1);
    let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    const f = (s - L[i - 1]) / (L[i] - L[i - 1] || 1);
    out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]);
  }
  return out;
}

function archTop(x) {
  let y = -1;
  for (const xc of [CAR.wheelX, -CAR.wheelX]) {
    const dx = x - xc;
    if (Math.abs(dx) < 0.43) y = Math.max(y, 0.33 + Math.sqrt(0.43 * 0.43 - dx * dx));
  }
  return y;
}

function bodyGeometry(N = 150, K = 34) {
  const xs = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    // uçlarda sık örnekle
    xs.push(-2.25 + 4.5 * (0.5 - 0.5 * Math.cos(u * Math.PI)));
  }
  const rings = xs.map((x) => halfContour(x, K));
  // uçları kapat: iki ek halka, merkeze doğru küçülür
  const cap = (x, ring, s, dx) => {
    const cy = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    return { x: x + dx, ring: ring.map(([z, y]) => [z * s, cy + (y - cy) * s]) };
  };
  const all = [
    cap(xs[0], rings[0], 0, -0.012), cap(xs[0], rings[0], 0.62, -0.008),
    ...xs.map((x, i) => ({ x, ring: rings[i] })),
    cap(xs.at(-1), rings.at(-1), 0.62, 0.008), cap(xs.at(-1), rings.at(-1), 0, 0.012),
  ];
  const pos = [];
  const idx = [];
  const R = all.length;
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let r = 0; r < R; r++) {
      const { x, ring } = all[r];
      const at = archTop(x);
      for (let k = 0; k < K; k++) {
        let [z, y] = ring[k];
        if (at > 0 && z > 0.6 && y < at && r > 1 && r < R - 2) y = at;
        pos.push(x, y, z * side);
      }
    }
    for (let r = 0; r < R - 1; r++) {
      for (let k = 0; k < K - 1; k++) {
        const a = base + r * K + k, b = a + 1, c = a + K, e = c + 1;
        if (side > 0) idx.push(a, c, b, b, c, e);
        else idx.push(a, b, c, b, e, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const BODY_FRAG_HEAD = /* glsl */ `
uniform float uScan, uScanOn, uHeat, uXray, uTime, uReport, uHot;
uniform float uCls[13];
uniform vec3 uPaint, uC0, uC1, uC2, uC3, uMint;
varying vec3 vObj;
varying vec3 vON;
float beltY(float x){ return 0.92 - x * 0.02; }
// -1 alt, -2 cam, -3 far, -4 stop, -5 ızgara, 0..12 panel
float panelId(vec3 p, vec3 n){
  float x = p.x, y = p.y, az = abs(p.z);
  bool R = p.z > 0.0;
  if (n.y < -0.55 && y < 0.5) return -1.0;
  if (x > 1.9 && y > 0.63 && y < 0.75 && az > 0.4 && az < 0.84 && n.x > 0.15) return -3.0;
  if (x < -2.0 && y > 0.78 && y < 0.9 && az > 0.42 && n.x < -0.1) return -4.0;
  if (x > 2.02 && az < 0.4 && y > 0.43 && y < 0.64) return -5.0;
  if (x > 1.97 && n.y < 0.6) return 0.0;
  if (x < -2.02 && n.y < 0.6) return 12.0;
  float be = beltY(x);
  if (x > 0.93) return (n.y > 0.62 && az < 0.76) ? 1.0 : (R ? 3.0 : 2.0);
  if (x < -1.4) {
    if (n.y > 0.62 && az < 0.74 && y > 0.9) return 11.0;
    if (y > be + 0.02 && x > -1.62) return -2.0;
    return R ? 9.0 : 8.0;
  }
  if (y > be + 0.015) {
    if (n.y > 0.8) return 10.0;
    // direkler
    float anx = abs(n.x), anz = abs(n.z);
    if (anz > 0.35 && anz < 0.8 && anx > 0.35) return 10.0;
    if (anz > 0.6 && x > -0.08 && x < 0.02) return 10.0;
    return -2.0;
  }
  if (x > -0.05) return R ? 5.0 : 4.0;
  if (x > -0.98) return R ? 7.0 : 6.0;
  return R ? 9.0 : 8.0;
}
vec3 clsColor(float c){
  return c < 0.5 ? uC0 : c < 1.5 ? uC1 : c < 2.5 ? uC2 : uC3;
}
`;

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(BG, 1);
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(BG, 9, 30);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
  scene.add(camera);
  const torch = new THREE.SpotLight(0xfff1dc, 0, 7, 0.5, 0.6, 1.4); // el feneri: altta kameradan
  torch.position.set(0.15, -0.1, 0);
  camera.add(torch);
  camera.add(torch.target);
  torch.target.position.set(0, 0, -2);

  scene.add(new THREE.HemisphereLight(0x8fa0c8, 0x101014, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 8, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9bdcff, 0.9);
  rim.position.set(-6, 3, -6);
  scene.add(rim);
  const gateLight = new THREE.PointLight(0x5cffc4, 0, 5, 1.5);
  scene.add(gateLight);

  // --- Zemin: ekspertiz bölmesi çizgileri -----------------------------------
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#16171d';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(255,255,255,0.05)';
    g.lineWidth = 2;
    for (let i = 0; i <= 16; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 6);
  floorTex.anisotropy = 4;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshLambertMaterial({ map: floorTex }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  // Bölme şeritleri (sarı değil: nane yeşili ve beyaz)
  const bayMat = new THREE.MeshBasicMaterial({ color: 0x2b2d36 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a8f74 });
  for (const z of [-1.9, 1.9]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.06), lineMat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(0, 0.002, z);
    scene.add(l);
  }
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), new THREE.MeshBasicMaterial({ color: 0x050507 }));
  pit.rotation.x = -Math.PI / 2;
  const pits = new THREE.Group();
  for (const x of [CAR.wheelX, -CAR.wheelX]) {
    const p = pit.clone();
    p.position.set(x, 0.003, 0);
    pits.add(p);
  }
  scene.add(pits);
  void bayMat;

  // Tavan lambaları (boyada yansır)
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff });
  const strips = new THREE.Group();
  for (const z of [-1.2, 0, 1.2]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.04, 0.12), stripMat);
    s.position.set(0, 3.6, z);
    strips.add(s);
  }
  scene.add(strips);

  // Kontak gölgesi
  const shadowTex = canvasTex(256, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)');
    gr.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  scene.add(shadow);

  // --- Araç ---------------------------------------------------------------
  const car = new THREE.Group();
  scene.add(car);

  const U = {
    uScan: { value: 4 }, uScanOn: { value: 0 }, uHeat: { value: 0 }, uXray: { value: 0 },
    uTime: { value: 0 }, uReport: { value: 0 }, uHot: { value: 0 },
    uCls: { value: new Array(13).fill(0) },
    uPaint: { value: new THREE.Color(0x3a4356) },
    uC0: { value: new THREE.Color(0x1ed69b) }, uC1: { value: new THREE.Color(0xffb627) },
    uC2: { value: new THREE.Color(0xff5a36) }, uC3: { value: new THREE.Color(0xe0368f) },
    uMint: { value: new THREE.Color(0x5cffc4) },
  };
  const bodyMat = lite
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.35, transparent: true })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true });
  bodyMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying vec3 vON;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvON = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + BODY_FRAG_HEAD)
      .replace('#include <color_fragment>', /* glsl */ `
        #include <color_fragment>
        vec3 on = normalize(vON);
        float pid = panelId(vObj, on);
        float isGlass = pid == -2.0 ? 1.0 : 0.0;
        float isUnder = pid == -1.0 ? 1.0 : 0.0;
        float cls = 0.0;
        for (int i = 0; i < 13; i++) { if (float(i) == pid) cls = uCls[i]; }
        vec3 hc = clsColor(cls);
        float isPanel = pid >= 0.0 ? 1.0 : 0.0;
        float reveal = isPanel * max(uHeat * step(uScan, vObj.x), uReport);
        vec3 base = mix(uPaint, hc * 0.9, reveal * 0.9);
        // panel boşlukları
        float x = vObj.x, y = vObj.y, az = abs(vObj.z);
        float be = beltY(x);
        float gap = 0.0;
        float side = (1.0 - abs(on.y)) * step(y, be + 0.01);
        gap += side * (1.0 - smoothstep(0.0035, 0.007, abs(x - 0.93)));
        gap += side * (1.0 - smoothstep(0.0035, 0.007, abs(x + 0.05)));
        gap += side * (1.0 - smoothstep(0.0035, 0.007, abs(x + 0.98))) * step(0.5, y);
        gap += (1.0 - smoothstep(0.003, 0.007, abs(x - 1.97))) * step(on.y, 0.6);
        gap += (1.0 - smoothstep(0.003, 0.007, abs(x + 2.02))) * step(on.y, 0.6);
        gap += (1.0 - smoothstep(0.004, 0.009, abs(az - 0.755))) * step(0.93, x) * step(0.35, on.y);
        gap += (1.0 - smoothstep(0.004, 0.009, abs(az - 0.74))) * step(x, -1.4) * step(0.35, on.y) * step(0.9, y);
        // kapı kolları
        float handle = step(abs(y - (be - 0.08)), 0.014) * (step(abs(x - 0.38), 0.07) + step(abs(x + 0.58), 0.07)) * step(0.7, abs(on.z));
        // alt çizgi (marşpiyel)
        float sill = step(abs(y - 0.4), 0.004) * step(0.7, abs(on.z)) * step(abs(x), 0.95);
        base *= 1.0 - clamp(gap, 0.0, 1.0) * 0.85;
        base = mix(base, vec3(0.05), clamp(handle, 0.0, 1.0) * 0.7 + sill * 0.4);
        base = mix(base, vec3(0.004, 0.005, 0.008), isGlass);
        base = mix(base, vec3(0.035), isUnder);
        if (pid == -5.0) base = vec3(0.015);
        if (pid == -3.0) base = vec3(0.9, 0.95, 1.0);
        if (pid == -4.0) base = vec3(0.5, 0.02, 0.03);
        diffuseColor.rgb = base;
        float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normalize(vNormal))), 2.2);
        diffuseColor.a = mix(1.0, 0.05 + fres * 0.55, uXray);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.18, isGlass);
        roughnessFactor = mix(roughnessFactor, 0.8, isUnder);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.0, max(isGlass, reveal * 0.8));`)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += hc * reveal * 0.32;
        float band = exp(-abs(vObj.x - uScan) * 38.0) * uScanOn;
        float cont = step(uScan, vObj.x) * (1.0 - smoothstep(0.0, 0.55, vObj.x - uScan)) * uScanOn;
        float iso = smoothstep(0.92, 1.0, fract(vObj.y * 34.0)) * cont;
        totalEmissiveRadiance += uMint * (band * 1.6 + iso * 0.35) * (1.0 - isUnder);
        if (pid == -3.0) totalEmissiveRadiance += vec3(1.2, 1.25, 1.3);
        if (pid == -4.0) totalEmissiveRadiance += vec3(0.9, 0.02, 0.04);
        float xl = smoothstep(0.9, 1.0, fract(vObj.x * 9.0)) + smoothstep(0.93, 1.0, fract(vObj.y * 14.0));
        totalEmissiveRadiance += uMint * uXray * (fres * 0.9 + xl * 0.12);`);
  };
  const body = new THREE.Mesh(bodyGeometry(lite ? 110 : 150, lite ? 28 : 34), bodyMat);
  body.renderOrder = 2;
  car.add(body);

  // Tekerlekler
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.25, metalness: 0.9 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.5, metalness: 0.8 });
  const tireProfile = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    tireProfile.push(new THREE.Vector2(0.27 + Math.cos(a) * 0.065 + (Math.cos(a) > 0 ? 0.0 : 0), Math.sin(a) * 0.105));
  }
  const tireGeo = new THREE.LatheGeometry(tireProfile, lite ? 28 : 40);
  tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.16, lite ? 24 : 36, 1, true);
  rimGeo.rotateX(Math.PI / 2);
  const faceGeo = new THREE.CircleGeometry(0.21, lite ? 24 : 36);
  const spokeGeo = new THREE.BoxGeometry(0.05, 0.2, 0.03);
  const wheels = [];
  for (const x of [CAR.wheelX, -CAR.wheelX]) {
    for (const s of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(x, CAR.wheelR, s * CAR.track);
      const spin = new THREE.Group();
      w.add(spin);
      spin.add(new THREE.Mesh(tireGeo, tireMat));
      spin.add(new THREE.Mesh(rimGeo, rimMat));
      const face = new THREE.Mesh(faceGeo, discMat);
      face.position.z = s * 0.04;
      if (s < 0) face.rotation.y = Math.PI;
      spin.add(face);
      for (let k = 0; k < 5; k++) {
        const sp = new THREE.Mesh(spokeGeo, rimMat);
        sp.position.z = s * 0.075;
        const a = (k / 5) * Math.PI * 2;
        sp.position.x = Math.sin(a) * 0.1;
        sp.position.y = Math.cos(a) * 0.1;
        sp.rotation.z = -a;
        spin.add(sp);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), rimMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = s * 0.085;
      spin.add(hub);
      car.add(w);
      wheels.push(spin);
    }
  }

  // Alt takım: şasi kolları, traversler, egzoz, depo
  const under = new THREE.Group();
  car.add(under);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.6, metalness: 0.6 });
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.45, metalness: 0.85 });
  const box = (w, h, dd, x, y, z, m = chassisMat) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m);
    b.position.set(x, y, z);
    under.add(b);
    return b;
  };
  for (const z of [-0.47, 0.47]) box(3.9, 0.07, 0.1, 0, 0.245, z);
  for (const x of [1.75, 0.6, -0.6, -1.75]) box(0.08, 0.06, 0.94, x, 0.24, 0);
  for (const z of [-0.8, 0.8]) box(1.9, 0.08, 0.1, -0.05, 0.27, z); // podyeler
  box(0.55, 0.12, 0.7, 1.35, 0.22, 0); // motor karteri
  box(0.7, 0.14, 0.62, -0.95, 0.24, 0.05); // depo
  for (const x of [CAR.wheelX, -CAR.wheelX]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), exhaustMat);
    a.rotation.x = Math.PI / 2;
    a.position.set(x, 0.33, 0);
    under.add(a);
  }
  const exPath = new THREE.CatmullRomCurve3([V(1.55, 0.3, -0.12), V(1.1, 0.2, -0.15), V(0.2, 0.2, -0.2), V(-1.5, 0.21, -0.3), V(-2.15, 0.25, -0.42)]);
  under.add(new THREE.Mesh(new THREE.TubeGeometry(exPath, 40, 0.028, 8), exhaustMat));
  box(0.5, 0.11, 0.2, -1.75, 0.24, -0.35, exhaustMat);
  box(0.3, 0.09, 0.16, 0.1, 0.2, -0.2, exhaustMat);

  // İnceleme noktaları (şasi bölümü)
  const HOT = [V(1.95, 0.25, 0.47), V(0.1, 0.25, 0.85), V(-1.7, 0.25, 0.47), V(-2.0, 0.32, 0)];
  const hotMat = new THREE.MeshBasicMaterial({ color: 0x5cffc4, transparent: true, depthTest: false, depthWrite: false });
  const hotGeo = new THREE.RingGeometry(0.07, 0.085, 36);
  const dotGeo = new THREE.CircleGeometry(0.022, 16);
  const hots = HOT.map((p) => {
    const g = new THREE.Group();
    const m = hotMat.clone();
    g.add(new THREE.Mesh(hotGeo, m), new THREE.Mesh(dotGeo, m));
    g.position.copy(p);
    g.renderOrder = 9;
    g.children.forEach((c) => (c.renderOrder = 9));
    g.visible = false;
    car.add(g);
    return { g, m };
  });

  // OBD: beyinler ve kablo ağı (röntgen kipinde görünür)
  const xray = new THREE.Group();
  car.add(xray);
  const modMat = new THREE.MeshBasicMaterial({ color: 0x5cffc4, transparent: true, opacity: 0.9, depthWrite: false });
  const MODS = [V(1.65, 0.75, -0.35), V(1.05, 0.5, 0.25), V(1.75, 0.72, 0.45), V(0.2, 0.62, 0), V(-0.4, 0.95, -0.35)];
  const PORT = V(0.62, 0.6, -0.45);
  const modBoxes = MODS.map((p, i) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.1, 0.16, 2, 0.02), modMat.clone());
    b.position.copy(p);
    b.renderOrder = 5;
    xray.add(b);
    return b;
  });
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, depthWrite: false }));
  port.position.copy(PORT);
  xray.add(port);
  const wireU = { uTime: U.uTime, uOn: { value: 0 } };
  const wireMat = new THREE.ShaderMaterial({
    uniforms: wireU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform float uTime, uOn; varying vec2 vUv;
      void main(){ float f = fract(vUv.x * 2.0 - uTime * 0.9); float p = smoothstep(0.82, 1.0, f);
      vec3 c = mix(vec3(0.15,0.8,0.6), vec3(1.0,0.75,0.2), p);
      gl_FragColor = vec4(c * (0.35 + p * 1.8), uOn * (0.45 + p)); }`,
  });
  MODS.forEach((p) => {
    const mid = PORT.clone().lerp(p, 0.5);
    mid.y += 0.12;
    const c = new THREE.CatmullRomCurve3([PORT.clone(), mid, p.clone()]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.008, 5), wireMat);
    t.renderOrder = 6;
    xray.add(t);
  });
  xray.visible = false;

  // --- Tarama kapısı ----------------------------------------------------------
  const gate = new THREE.Group();
  scene.add(gate);
  const GW = 1.2, GH = 1.95, GR = 0.14;
  const gp = new THREE.Shape();
  gp.moveTo(-GW + GR, 0);
  gp.lineTo(GW - GR, 0);
  gp.quadraticCurveTo(GW, 0, GW, GR);
  gp.lineTo(GW, GH - GR);
  gp.quadraticCurveTo(GW, GH, GW - GR, GH);
  gp.lineTo(-GW + GR, GH);
  gp.quadraticCurveTo(-GW, GH, -GW, GH - GR);
  gp.lineTo(-GW, GR);
  gp.quadraticCurveTo(-GW, 0, -GW + GR, 0);
  const gPts = gp.getSpacedPoints(80).map((p) => V(0, p.y, p.x));
  const gCurve = new THREE.CatmullRomCurve3(gPts, true);
  const gateMat = new THREE.MeshBasicMaterial({ color: 0x7dffd0, transparent: true });
  gate.add(new THREE.Mesh(new THREE.TubeGeometry(gCurve, 160, 0.022, 6, true), gateMat));
  const sheetTex = canvasTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(120,255,210,0.0)');
    gr.addColorStop(0.5, 'rgba(120,255,210,0.55)');
    gr.addColorStop(1, 'rgba(120,255,210,0.15)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const sheetMat = new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, GH), sheetMat);
  sheet.rotation.y = Math.PI / 2;
  sheet.position.y = GH / 2;
  gate.add(sheet);
  // zemin izi
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.05, GW * 2), new THREE.MeshBasicMaterial({ color: 0x7dffd0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  trail.rotation.x = -Math.PI / 2;
  trail.position.y = 0.006;
  gate.add(trail);

  // --- Lift -------------------------------------------------------------
  const liftMat = new THREE.MeshStandardMaterial({ color: 0x3b3f4a, roughness: 0.5, metalness: 0.6 });
  const liftAccent = new THREE.MeshStandardMaterial({ color: 0x1ed69b, roughness: 0.45, metalness: 0.2, emissive: 0x0b3a2a });
  const lift = new THREE.Group();
  scene.add(lift);
  const arms = new THREE.Group();
  const nearPost = [];
  for (const z of [-1.42, 1.42]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.9, 0.26), liftMat);
    post.position.set(-0.1, 1.45, z);
    lift.add(post);
    if (z > 0) nearPost.push(post);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.27), liftAccent);
    stripe.position.set(0.02, 1.4, z);
    lift.add(stripe);
    if (z > 0) nearPost.push(stripe);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.5), liftMat);
    foot.position.set(-0.1, 0.02, z);
    lift.add(foot);
    for (const x of [0.95, -1.0]) {
      const len = Math.hypot(x + 0.1, Math.abs(z) - 0.55);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.1), liftMat);
      arm.position.set((x - 0.1) / 2, 0, (z + Math.sign(z) * 0.55) / 2);
      arm.rotation.y = -Math.atan2(Math.sign(z) * 0.55 - z, x + 0.1);
      arms.add(arm);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 14), liftAccent);
      pad.position.set(x, 0.05, Math.sign(z) * 0.55);
      arms.add(pad);
    }
  }
  lift.add(arms);

  // --- Dinamometre merdaneleri ------------------------------------------------
  const rollers = new THREE.Group();
  scene.add(rollers);
  const rollMat = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.3, metalness: 0.9 });
  const rollGeo = new THREE.CylinderGeometry(0.17, 0.17, 2.0, 24);
  rollGeo.rotateX(Math.PI / 2);
  const rolls = [];
  for (const xc of [CAR.wheelX, -CAR.wheelX]) {
    for (const o of [-0.27, 0.27]) {
      const r = new THREE.Mesh(rollGeo, rollMat);
      r.position.set(xc + o, -0.09, 0);
      rollers.add(r);
      rolls.push(r);
    }
  }
  // şerit ışık: yük altında kırmızılaşır
  const loadMat = new THREE.MeshBasicMaterial({ color: 0x1ed69b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const xc of [CAR.wheelX, -CAR.wheelX]) {
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.03), loadMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(xc, 0.007, s * 1.06);
      rollers.add(l);
    }
  }

  // --- Boyut ve güncelleme ------------------------------------------------------
  let W = 1, H = 1;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  const _look = new THREE.Vector3();
  let spinA = 0, rollA = 0;
  let lastNow = performance.now();
  let slowFrames = 0, frames = 0;
  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const t = now / 1000;
    U.uTime.value = t;

    camera.position.copy(s.pos);
    if (s.up) camera.up.copy(s.up).normalize();
    else camera.up.set(0, 1, 0);
    const sx = s.shiftX || 0, sy = s.shiftY || 0;
    if (sx || sy) camera.setViewOffset(W, H, -sx * W, sy * H, W, H);
    else if (camera.view?.enabled) camera.clearViewOffset();
    _look.copy(s.look);
    camera.lookAt(_look);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();

    // Tarama
    U.uScan.value = s.scan;
    U.uScanOn.value = s.scanOn;
    U.uHeat.value = s.heat;
    U.uReport.value = s.report;
    gate.position.x = s.scan;
    gate.visible = s.gate > 0.01;
    gateMat.opacity = s.gate;
    sheetMat.opacity = 0.22 * s.gate;
    trail.material.opacity = s.gate;
    gateLight.position.set(s.scan, 1.2, 0);
    gateLight.intensity = s.gate * 6;

    // Lift: direkler yalnız şasi bölümünde zeminden yükselir
    lift.visible = s.posts > 0.01;
    lift.scale.y = Math.max(0.001, s.posts);
    strips.visible = camera.position.y < 2.2;
    nearPost.forEach((m) => (m.visible = !s.hideNearPost));
    const ly = s.lift * 1.55;
    car.position.y = ly;
    arms.position.y = Math.max(0.03, ly + 0.24);
    shadow.material.opacity = 1 - s.lift * 0.8;
    shadow.scale.setScalar(1 + s.lift * 0.4);
    torch.intensity = s.torch * 9;

    // Röntgen
    U.uXray.value = s.xray;
    bodyMat.depthWrite = s.xray < 0.02;
    xray.visible = s.xray > 0.01;
    wireU.uOn.value = s.xray;
    modBoxes.forEach((b, i) => {
      const hit = s.obdHit === i;
      b.material.opacity = s.xray * (hit ? 1 : 0.55);
      b.material.color.setHex(hit ? 0xffb627 : 0x5cffc4);
      b.scale.setScalar(hit ? 1.25 + Math.sin(t * 8) * 0.05 : 1);
    });
    port.material.opacity = s.xray;
    tireMat.opacity = 1;

    // İnceleme noktaları
    hots.forEach(({ g, m }, i) => {
      const a = s.hots?.[i] ?? 0;
      g.visible = a > 0.01;
      if (!g.visible) return;
      g.quaternion.copy(camera.quaternion);
      const pulse = 1 + Math.sin(t * 5 + i) * 0.12;
      g.scale.setScalar((0.6 + a * 0.6) * pulse);
      m.opacity = a;
      m.color.setHex(s.hotBad === i && a > 0.9 ? 0xffb627 : 0x5cffc4);
    });

    // Dinamo
    rollers.visible = s.dyno > 0.01;
    pits.visible = s.dyno > 0.01;
    rollers.position.y = (1 - s.dyno) * -0.3;
    const speed = s.spin; // rad/s
    spinA -= speed * dt;
    rollA += speed * dt * (CAR.wheelR / 0.17);
    wheels.forEach((w) => (w.rotation.z = spinA));
    rolls.forEach((r) => (r.rotation.z = rollA));
    loadMat.color.setHSL(0.44 - s.load * 0.44, 0.9, 0.5);
    loadMat.opacity = s.dyno;
    car.position.y += s.dyno * Math.sin(t * 60) * 0.0015 * s.load;

    scene.environmentIntensity = s.env ?? 0.55;
    key.intensity = 1.6 * (1 - s.xray * 0.6);
    renderer.render(scene, camera);

    // zayıf cihazda çözünürlüğü düşür
    frames++;
    if (dt > 0.034) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 40 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(dpr);
        resize();
      }
      frames = 0;
      slowFrames = 0;
    }
  }

  function setPanels(list) {
    list.forEach((p, i) => (U.uCls.value[i] = p.sinif));
  }

  return {
    renderer, camera, update, resize, setPanels,
    compile: () => renderer.compile(scene, camera),
  };
}
