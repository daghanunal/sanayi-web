// Kodla çizilmiş oto klima devresi: kompresör → kondenser (+fan) → kurutucu → genleşme valfi →
// evaporatör (+polen filtresi, üfleyici) → kompresör. Borular "termal kamera" gibi renklenir:
// sıcak yüksek basınç tarafı turuncu-kırmızı, valften sonra buz mavisi. Gaz tanecikleri boruda akar.
// Sahne durumu dışarıdan `update(state)` ile verilir; kamera ve kurgu main.js'tedir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Petek (kanatçık) dokusu: ince dikey lamellar, arada yatay boru izleri
const finTex = (base, line) => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.fillStyle = line;
  for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1.4, h);
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let x = 2; x < w; x += 4) g.fillRect(x, 0, 1, h);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,255,255,.18)');
  gr.addColorStop(0.5, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,.18)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
});

// Kavrama plakası: üç böbrek yarığı, döndüğü belli olsun
const clutchTex = () => canvasTex(256, 256, (g, w, h) => {
  const c = w / 2;
  const gr = g.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c);
  gr.addColorStop(0, '#f2f4f5');
  gr.addColorStop(1, '#8e959b');
  g.fillStyle = gr;
  g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#22272b';
  for (let i = 0; i < 3; i++) {
    const a0 = (i / 3) * Math.PI * 2 + 0.25;
    g.beginPath();
    g.arc(c, c, c * 0.78, a0, a0 + 1.35);
    g.arc(c, c, c * 0.56, a0 + 1.35, a0, true);
    g.fill();
  }
  g.fillStyle = '#ff5424';
  g.beginPath(); g.arc(c, c * 0.3, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#5b6368';
  g.beginPath(); g.arc(c, c, c * 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c9ced2';
  g.beginPath(); g.arc(c, c, c * 0.09, 0, Math.PI * 2); g.fill();
});

// Polen filtresi: katlanmış kâğıt. Kirli olanı kahverengi lekeli
const filterTex = (dirty) => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = dirty ? '#9b8663' : '#f4f1e6';
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) {
    const gr = g.createLinearGradient(x, 0, x + 16, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.28)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.25)');
    gr.addColorStop(1, 'rgba(0,0,0,.28)');
    g.fillStyle = gr;
    g.fillRect(x, 0, 16, h);
  }
  if (dirty) {
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${50 + Math.random() * 30},${40 + Math.random() * 20},20,${0.08 + Math.random() * 0.18})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 6 + Math.random() * 26, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.strokeStyle = dirty ? '#5e4d33' : '#2b8fb0';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
});

const glowTex = () => canvasTex(128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, w);
});

const shadowTex = () => canvasTex(256, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(10,30,50,.34)');
  gr.addColorStop(0.6, 'rgba(10,30,50,.1)');
  gr.addColorStop(1, 'rgba(10,30,50,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
});

// Sıcaklık renkleri
const C_HOT = new THREE.Color('#ff2e12');
const C_WARM = new THREE.Color('#ffa21f');
const C_ICE = new THREE.Color('#5fe3ff');
const C_COOL = new THREE.Color('#2f6bff');
const C_UV = new THREE.Color('#6a3cff');
const C_FAULT = new THREE.Color('#d9a078'); // soğutmayan devre: soğuk taraf ılık kalır

const dotVert = /* glsl */ `
  attribute vec3 color;
  attribute float alpha;
  uniform float uSize;
  uniform float uPR;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPR * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const dotFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uSoft;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float a = mix(1.0, smoothstep(0.5, 0.0, r), uSoft) * vAlpha;
    if (a < 0.02) discard;
    vec3 col = vColor + (1.0 - smoothstep(0.0, 0.22, length(c - vec2(-0.12, -0.12)))) * 0.45;
    gl_FragColor = vec4(col, a);
  }`;

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8aa2b4, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1e0, 1.6);
  key.position.set(5, 8, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe6ff, 0.8);
  rim.position.set(-6, 3, -6);
  scene.add(rim);
  // UV lambası: kaçak testinde kameranın yanında yanar
  const uvLamp = new THREE.PointLight(0x8a4dff, 0, 7, 1.2);
  uvLamp.position.set(0.4, 0.3, 0.2);
  camera.add(uvLamp);

  const M = {
    alu: new THREE.MeshStandardMaterial({ color: 0xd7dde2, roughness: 0.28, metalness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x5d666d, roughness: 0.4, metalness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1d2328, roughness: 0.6, metalness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: 0x14181b, roughness: 0.75, metalness: 0.1 }),
    paint: new THREE.MeshStandardMaterial({ color: 0x24465e, roughness: 0.35, metalness: 0.2 }),
    condFin: new THREE.MeshStandardMaterial({ map: finTex('#6f7b83', '#2b3238'), roughness: 0.55, metalness: 0.6 }),
    evapFin: new THREE.MeshStandardMaterial({ map: finTex('#a9b5bc', '#4d5a62'), roughness: 0.45, metalness: 0.5, emissive: 0xdff6ff, emissiveIntensity: 0 }),
    capBlue: new THREE.MeshStandardMaterial({ color: 0x1f6fff, roughness: 0.35, metalness: 0.1 }),
    capRed: new THREE.MeshStandardMaterial({ color: 0xff3b1f, roughness: 0.35, metalness: 0.1 }),
    clutch: new THREE.MeshStandardMaterial({ map: clutchTex(), roughness: 0.3, metalness: 0.7 }),
    blade: new THREE.MeshStandardMaterial({ color: 0x1b2024, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide }),
  };

  // Vurgulanan parça grupları: kendi malzeme kopyaları olur
  const HL = new THREE.Color(0x19c6ff);
  const groups = { kompresor: [], kondenser: [], kacak: [], dolum: [], evaporator: [], filtre: [] };
  const own = (id, base) => {
    const m = base.clone();
    groups[id].push(m);
    return m;
  };

  const rig = new THREE.Group();
  scene.add(rig);
  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  const seg = lite ? 20 : 32;
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cylY = (r0, r1, h, s = seg) => new THREE.CylinderGeometry(r0, r1, h, s);
  const cylZ = (r, len, s = seg) => new THREE.CylinderGeometry(r, r, len, s).rotateX(Math.PI / 2);
  const cylX = (r, len, s = seg) => new THREE.CylinderGeometry(r, r, len, s).rotateZ(Math.PI / 2);

  // --- Kompresör -------------------------------------------------------------
  const COMP = V(-2.6, -0.95, 0.3);
  const comp = new THREE.Group();
  comp.position.copy(COMP);
  rig.add(comp);
  const mComp = own('kompresor', M.alu);
  add(comp, cylZ(0.44, 0.9), mComp, 0, 0, -0.05);
  add(comp, cylZ(0.47, 0.06), own('kompresor', M.steel), 0, 0, 0.36);
  add(comp, cylZ(0.47, 0.06), own('kompresor', M.steel), 0, 0, -0.46);
  for (let i = 0; i < 5; i++) add(comp, cylZ(0.452, 0.025), own('kompresor', M.steel), 0, 0, -0.35 + i * 0.16);
  add(comp, cylZ(0.3, 0.2), mComp, 0, 0, 0.48); // burun
  // Kulaklar
  for (const [x, y] of [[0.52, 0.2], [-0.52, 0.2], [0.5, -0.32], [-0.5, -0.32]]) {
    add(comp, box(0.2, 0.14, 0.18), own('kompresor', M.steel), x, y, -0.3);
  }
  // Kasnak: dişli kanal izi
  const pulley = new THREE.Group();
  pulley.position.set(0, 0, 0.66);
  comp.add(pulley);
  add(pulley, cylZ(0.43, 0.2), own('kompresor', M.dark), 0, 0, 0);
  for (let i = 0; i < 6; i++) add(pulley, new THREE.TorusGeometry(0.433, 0.012, 6, seg), own('kompresor', M.steel), 0, 0, -0.08 + i * 0.032);
  const spokes = new THREE.Group();
  pulley.add(spokes);
  for (let i = 0; i < 6; i++) add(spokes, box(0.05, 0.36, 0.02), M.steel, 0, 0, 0.101, 0, 0, (i / 6) * Math.PI).position.set(0, 0, 0.101);
  // Kavrama plakası (kavrama tutmazsa kasnak döner, plaka durur)
  const plate = add(comp, new THREE.CircleGeometry(0.32, seg), own('kompresor', M.clutch), 0, 0, 0.79);
  add(comp, cylZ(0.32, 0.03), own('kompresor', M.steel), 0, 0, 0.775);
  // Emme ve basma ağızları
  add(comp, cylY(0.07, 0.07, 0.22), M.steel, 0.15, 0.5, 0);
  add(comp, cylY(0.07, 0.07, 0.22), M.steel, -0.15, 0.5, 0);
  add(comp, box(0.5, 0.1, 0.24), M.steel, 0, 0.44, 0);

  // --- Kondenser + fan ----------------------------------------------------------
  const COND = { x0: -1.3, x1: 2.1, y0: 0.35, y1: 2.25, z: -0.42 };
  const condW = COND.x1 - COND.x0 + 0.1, condH = COND.y1 - COND.y0;
  const condCx = (COND.x0 + COND.x1) / 2, condCy = (COND.y0 + COND.y1) / 2;
  const mFin = own('kondenser', M.condFin);
  mFin.map.repeat.set(3, 1);
  mFin.map.wrapS = THREE.RepeatWrapping;
  add(rig, box(condW, condH, 0.09), mFin, condCx, condCy, COND.z);
  for (const x of [COND.x0 - 0.1, COND.x1 + 0.1]) {
    add(rig, cylY(0.085, 0.085, condH + 0.12), own('kondenser', M.alu), x, condCy, COND.z);
    add(rig, cylY(0.1, 0.1, 0.05), own('kondenser', M.steel), x, COND.y1 + 0.08, COND.z);
    add(rig, cylY(0.1, 0.1, 0.05), own('kondenser', M.steel), x, COND.y0 - 0.08, COND.z);
  }
  add(rig, box(condW + 0.3, 0.05, 0.14), own('kondenser', M.dark), condCx, COND.y1 + 0.12, COND.z);
  add(rig, box(condW + 0.3, 0.05, 0.14), own('kondenser', M.dark), condCx, COND.y0 - 0.12, COND.z);
  const fan = new THREE.Group();
  fan.position.set(condCx - 0.1, condCy, COND.z - 0.3);
  rig.add(fan);
  add(fan, new THREE.TorusGeometry(0.8, 0.05, 8, seg * 2), own('kondenser', M.black), 0, 0, 0);
  add(fan, cylZ(0.82, 0.22, seg * 2).translate(0, 0, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1f23, roughness: 0.7, side: THREE.BackSide }), 0, 0, 0);
  add(fan, cylZ(0.16, 0.2), M.dark, 0, 0, -0.05);
  add(fan, cylZ(0.2, 0.3), M.black, 0, 0, -0.28); // motor
  const blades = new THREE.Group();
  fan.add(blades);
  const bladeGeo = new THREE.PlaneGeometry(0.62, 0.26);
  bladeGeo.translate(0.44, 0, 0);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(bladeGeo, M.blade);
    b.rotation.set(0.55, 0, (i / 7) * Math.PI * 2, 'ZXY');
    const piv = new THREE.Group();
    piv.rotation.z = (i / 7) * Math.PI * 2;
    b.rotation.set(0.55, 0, 0);
    piv.add(b);
    blades.add(piv);
  }
  add(fan, box(1.8, 0.05, 0.05), M.black, 0, 0, 0.08);
  add(fan, box(0.05, 1.8, 0.05), M.black, 0, 0, 0.08);

  // --- Kurutucu ve genleşme valfi ---------------------------------------------------
  const DRIER = V(2.62, 0.05, 0.2);
  add(rig, cylY(0.13, 0.13, 0.72), own('kacak', M.paint), DRIER.x, DRIER.y, DRIER.z);
  add(rig, cylY(0.1, 0.13, 0.1), own('kacak', M.steel), DRIER.x, DRIER.y + 0.41, DRIER.z);
  add(rig, box(0.06, 0.4, 0.3), M.steel, DRIER.x - 0.15, DRIER.y, DRIER.z); // kelepçe
  const VALVE = V(2.12, -1.18, 0.62);
  const mValve = own('evaporator', M.alu);
  add(rig, box(0.26, 0.26, 0.2), mValve, VALVE.x, VALVE.y, VALVE.z);
  add(rig, cylY(0.07, 0.07, 0.12), M.dark, VALVE.x, VALVE.y + 0.18, VALVE.z);

  // --- Evaporatör, filtre, üfleyici ----------------------------------------------------
  const EVAP = { x0: -0.15, x1: 1.35, y0: -1.72, y1: -0.98, z: 0.9 };
  const evW = EVAP.x1 - EVAP.x0 + 0.1, evH = EVAP.y1 - EVAP.y0;
  const evCx = (EVAP.x0 + EVAP.x1) / 2, evCy = (EVAP.y0 + EVAP.y1) / 2;
  const mEvap = own('evaporator', M.evapFin);
  mEvap.map.repeat.set(1.5, 1);
  add(rig, box(evW, evH, 0.16), mEvap, evCx, evCy, EVAP.z);
  for (const x of [EVAP.x0 - 0.1, EVAP.x1 + 0.1]) add(rig, box(0.1, evH + 0.08, 0.2), own('evaporator', M.alu), x, evCy, EVAP.z);
  // Evaporatör kasası (torpido arkası)
  add(rig, box(evW + 0.5, 0.06, 0.95), own('filtre', M.dark), evCx, EVAP.y1 + 0.12, EVAP.z - 0.35);
  add(rig, box(evW + 0.5, 0.06, 0.95), own('filtre', M.dark), evCx, EVAP.y0 - 0.12, EVAP.z - 0.35);
  // Filtre
  const filter = new THREE.Group();
  const FILTER_Y = evCy;
  filter.position.set(evCx, FILTER_Y, EVAP.z - 0.24);
  rig.add(filter);
  const texDirty = filterTex(true), texClean = filterTex(false);
  const mFilter = own('filtre', new THREE.MeshStandardMaterial({ map: texDirty, roughness: 0.85, metalness: 0 }));
  add(filter, box(evW - 0.02, evH - 0.02, 0.06), mFilter, 0, 0, 0);
  // Üfleyici: sincap kafesi
  const blower = new THREE.Group();
  blower.position.set(evCx, evCy, EVAP.z - 0.62);
  rig.add(blower);
  add(blower, cylX(0.3, evW - 0.2), new THREE.MeshStandardMaterial({ color: 0x2a3136, roughness: 0.55, metalness: 0.3 }), 0, 0, 0);
  const cage = new THREE.Group();
  blower.add(cage);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    add(cage, box(evW - 0.25, 0.03, 0.09), M.black, 0, Math.sin(a) * 0.31, Math.cos(a) * 0.31, a + 0.4);
  }

  // --- Devre yolu ------------------------------------------------------------------
  const P = [];
  const pt = (x, y, z) => P.push(V(x, y, z));
  // Kompresör basma ağzından yukarı
  pt(-2.45, -0.5, 0.3); pt(-2.45, -0.1, 0.3); pt(-2.3, 0.35, 0.05);
  const HIGH_PORT = V(-2.1, 0.62, -0.08);
  pt(-2.1, 0.62, -0.08); pt(-1.75, 1.6, -0.3); pt(-1.5, 2.08, -0.33);
  // Kondenser kıvrımı: 5 geçiş, yukarıdan aşağı
  const cz = COND.z + 0.1;
  const passes = [2.1, 1.7, 1.3, 0.9, 0.5];
  const markCondIn = P.length;
  passes.forEach((y, i) => {
    const [a, b] = i % 2 ? [COND.x1, COND.x0] : [COND.x0, COND.x1];
    const dir = Math.sign(b - a);
    pt(a, y, cz); pt(a + dir * 0.35, y, cz); pt(b - dir * 0.35, y, cz); pt(b, y, cz);
    if (i < passes.length - 1) pt(b + dir * 0.14, y - 0.2, cz);
  });
  const markCondOut = P.length - 1;
  const LEAK = V(2.38, 0.42, -0.2);
  pt(2.38, 0.42, -0.2); pt(2.58, 0.6, 0.12); pt(DRIER.x, 0.52, DRIER.z);
  pt(DRIER.x, 0.1, DRIER.z); pt(DRIER.x, -0.36, DRIER.z); pt(2.52, -0.9, 0.45);
  const markValve = P.length;
  pt(VALVE.x, VALVE.y + 0.02, VALVE.z); pt(1.7, -1.1, 1.0);
  // Evaporatör kıvrımı: 3 geçiş
  const ez = EVAP.z + 0.12;
  const epasses = [-1.12, -1.35, -1.58];
  epasses.forEach((y, i) => {
    const [a, b] = i % 2 ? [EVAP.x0, EVAP.x1] : [EVAP.x1, EVAP.x0];
    const dir = Math.sign(b - a);
    pt(a, y, ez); pt(a + dir * 0.3, y, ez); pt(b - dir * 0.3, y, ez); pt(b, y, ez);
    if (i < epasses.length - 1) pt(b + dir * 0.1, y - 0.115, ez);
  });
  const markEvapOut = P.length - 1;
  pt(-0.55, -1.62, 0.95); pt(-1.2, -1.45, 0.85);
  const LOW_PORT = V(-1.62, -1.25, 0.72);
  pt(-1.62, -1.25, 0.72); pt(-2.2, -0.75, 0.55); pt(-2.75, -0.3, 0.35); pt(-2.75, -0.5, 0.3);

  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const NS = 2400;
  const LUT = curve.getSpacedPoints(NS);
  const nearest = (p) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < LUT.length; i++) {
      const d = LUT[i].distanceToSquared(p);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi / NS;
  };
  const U = {
    condIn: nearest(P[markCondIn]), condOut: nearest(P[markCondOut]),
    valve: nearest(P[markValve]), evapOut: nearest(P[markEvapOut]),
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const colorAt = (u, heat, out) => {
    if (u < U.condIn) return out.copy(C_HOT);
    if (u < U.condOut) return out.copy(C_HOT).lerp(C_WARM, smooth((u - U.condIn) / (U.condOut - U.condIn)));
    if (u < U.valve) return out.copy(C_WARM);
    if (u < U.evapOut) out.copy(C_ICE).lerp(C_COOL, smooth((u - U.valve) / (U.evapOut - U.valve)) * 0.6);
    else out.copy(C_COOL).lerp(C_ICE, 0.25);
    return out.lerp(C_FAULT, heat);
  };

  // Borular: yarı saydam, termal renkli
  const TUBE_SEG = lite ? 700 : 1100;
  const RAD = 8;
  const tubeGeo = new THREE.TubeGeometry(curve, TUBE_SEG, 0.05, RAD, false);
  const tubeCol = new Float32Array(tubeGeo.attributes.position.count * 3);
  tubeGeo.setAttribute('color', new THREE.BufferAttribute(tubeCol, 3));
  const tubeMat = new THREE.MeshStandardMaterial({
    vertexColors: true, transparent: true, opacity: 0.5, roughness: 0.15, metalness: 0.1, depthWrite: false,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.renderOrder = 2;
  rig.add(tube);
  const tmpC = new THREE.Color();
  let tubeHeat = -1;
  function paintTube(heat) {
    for (let i = 0; i <= TUBE_SEG; i++) {
      colorAt(i / TUBE_SEG, heat, tmpC);
      for (let j = 0; j <= RAD; j++) {
        const k = (i * (RAD + 1) + j) * 3;
        tubeCol[k] = tmpC.r; tubeCol[k + 1] = tmpC.g; tubeCol[k + 2] = tmpC.b;
      }
    }
    tubeGeo.attributes.color.needsUpdate = true;
    tubeHeat = heat;
  }
  // Rakorlar
  for (const p of [P[markCondIn], P[markCondOut], P[markValve], LOW_PORT, HIGH_PORT]) {
    add(rig, new THREE.SphereGeometry(0.075, 14, 10), M.steel, p.x, p.y, p.z);
  }

  // Servis ağızları: mavi kapak alçak, kırmızı kapak yüksek basınç
  const mPort = own('dolum', M.steel);
  add(rig, cylY(0.05, 0.05, 0.2), mPort, LOW_PORT.x, LOW_PORT.y + 0.12, LOW_PORT.z);
  add(rig, cylY(0.075, 0.075, 0.1), own('dolum', M.capBlue), LOW_PORT.x, LOW_PORT.y + 0.25, LOW_PORT.z);
  add(rig, cylY(0.05, 0.05, 0.2), mPort, HIGH_PORT.x, HIGH_PORT.y + 0.12, HIGH_PORT.z);
  add(rig, cylY(0.075, 0.075, 0.1), own('dolum', M.capRed), HIGH_PORT.x, HIGH_PORT.y + 0.25, HIGH_PORT.z);
  // Manifold hortumları: dolumda yukarıdan iner
  const hoseCurve = (p, dx) => new THREE.CatmullRomCurve3([
    V(p.x + dx, 4.2, p.z + 1.2), V(p.x + dx * 0.6, 2.4, p.z + 1.0), V(p.x + dx * 0.2, p.y + 0.9, p.z + 0.35), V(p.x, p.y + 0.34, p.z),
  ]);
  const hoses = [
    [hoseCurve(LOW_PORT, 0.6), 0x1f6fff],
    [hoseCurve(HIGH_PORT, -0.5), 0xff3b1f],
  ].map(([c, col]) => {
    const g = new THREE.TubeGeometry(c, 90, 0.045, 8, false);
    const m = add(rig, g, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0 }), 0, 0, 0);
    m.visible = false;
    return m;
  });
  const hoseIdx = hoses[0].geometry.index.count;

  // Kaçak noktası: UV altında sarı-yeşil parlar
  const glow = glowTex();
  const leakMat = new THREE.SpriteMaterial({ map: glow, color: 0xc8ff2e, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const leak = new THREE.Sprite(leakMat);
  leak.position.copy(LEAK);
  leak.scale.setScalar(0.7);
  leak.renderOrder = 5;
  rig.add(leak);
  const leakCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xf4ffb0, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  leakCore.position.copy(LEAK);
  leakCore.scale.setScalar(0.22);
  leakCore.renderOrder = 6;
  rig.add(leakCore);
  // Kaçağın çevresine sıçramış boya lekeleri
  const splats = new THREE.Group();
  rig.add(splats);
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xb6ff1a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(LEAK.x + (Math.random() - 0.5) * 0.36, LEAK.y + (Math.random() - 0.6) * 0.3, LEAK.z + 0.06);
    s.scale.setScalar(0.06 + Math.random() * 0.1);
    splats.add(s);
  }

  // Gölge
  const shadow = add(rig, new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }), 0, -2.05, 0.2, -Math.PI / 2);
  shadow.renderOrder = 0;

  // --- Gaz tanecikleri ---------------------------------------------------------------
  const N = lite ? 300 : 560;
  const dotPos = new Float32Array(N * 3);
  const dotCol = new Float32Array(N * 3);
  const dotA = new Float32Array(N).fill(1);
  const offs = new Float32Array(N);
  const jit = [];
  const GOLD = 0.6180339887;
  for (let i = 0; i < N; i++) {
    offs[i] = (i * GOLD) % 1;
    jit.push(V((Math.random() - 0.5) * 0.045, (Math.random() - 0.5) * 0.045, (Math.random() - 0.5) * 0.045));
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  dotGeo.setAttribute('color', new THREE.BufferAttribute(dotCol, 3));
  dotGeo.setAttribute('alpha', new THREE.BufferAttribute(dotA, 1));
  const dotMat = new THREE.ShaderMaterial({
    vertexShader: dotVert, fragmentShader: dotFrag,
    uniforms: { uSize: { value: 0.1 }, uPR: { value: dpr }, uSoft: { value: 0 } },
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  dots.renderOrder = 1;
  rig.add(dots);

  // Kabine üflenen soğuk hava
  const NA = lite ? 110 : 220;
  const airPos = new Float32Array(NA * 3);
  const airCol = new Float32Array(NA * 3);
  const airA = new Float32Array(NA);
  const airSeed = [];
  for (let i = 0; i < NA; i++) {
    airSeed.push({ x: EVAP.x0 + Math.random() * (EVAP.x1 - EVAP.x0), y: EVAP.y0 + Math.random() * evH, ph: Math.random(), sp: 0.6 + Math.random() * 0.6, sx: (Math.random() - 0.5) * 1.2, sy: (Math.random() - 0.3) * 0.8 });
    const c = new THREE.Color().copy(C_ICE).lerp(new THREE.Color(1, 1, 1), Math.random() * 0.7);
    airCol[i * 3] = c.r; airCol[i * 3 + 1] = c.g; airCol[i * 3 + 2] = c.b;
  }
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(airPos, 3));
  airGeo.setAttribute('color', new THREE.BufferAttribute(airCol, 3));
  airGeo.setAttribute('alpha', new THREE.BufferAttribute(airA, 1));
  const airMat = new THREE.ShaderMaterial({
    vertexShader: dotVert, fragmentShader: dotFrag, transparent: true, depthWrite: false,
    uniforms: { uSize: { value: 0.16 }, uPR: { value: dpr }, uSoft: { value: 1 } },
  });
  const air = new THREE.Points(airGeo, airMat);
  air.frustumCulled = false;
  air.renderOrder = 3;
  rig.add(air);

  // --- Boyut ve güncelleme ----------------------------------------------------------------
  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();

  let last = performance.now();
  let slowFrames = 0;
  let phase = 0, pulleyA = 0, plateA = 0, fanA = 0, cageA = 0;
  let filterSwapped = false;
  const tmpV = new THREE.Vector3();

  function update(s, now = performance.now()) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(s.look);

    // Mekanik dönüşler
    pulleyA += dt * 14;
    plateA += dt * 14 * s.clutch;
    pulley.rotation.z = -pulleyA;
    plate.rotation.z = -plateA;
    fanA += dt * 22 * s.fan;
    blades.rotation.z = fanA;
    cageA += dt * 16 * (0.3 + s.air);
    cage.rotation.x = cageA;

    // Termal boyama
    if (Math.abs(s.heat - tubeHeat) > 0.015) paintTube(s.heat);
    tubeMat.opacity = 0.5 * (1 - s.uv * 0.7);

    // Gaz akışı
    phase = (phase + dt * 0.035 * s.flow) % 1;
    const count = Math.max(1, Math.floor(N * clamp(s.charge)));
    for (let i = 0; i < count; i++) {
      const u = (((offs[i] + phase) % 1) + 1) % 1;
      const f = u * NS;
      const i0 = Math.floor(f), k = f - i0;
      const a = LUT[i0], b = LUT[Math.min(NS, i0 + 1)];
      const j = jit[i];
      dotPos[i * 3] = a.x + (b.x - a.x) * k + j.x;
      dotPos[i * 3 + 1] = a.y + (b.y - a.y) * k + j.y;
      dotPos[i * 3 + 2] = a.z + (b.z - a.z) * k + j.z;
      colorAt(u, s.heat, tmpC);
      if (s.uv > 0) tmpC.lerp(C_UV, s.uv * 0.6);
      dotCol[i * 3] = tmpC.r; dotCol[i * 3 + 1] = tmpC.g; dotCol[i * 3 + 2] = tmpC.b;
    }
    dotGeo.setDrawRange(0, count);
    dotGeo.attributes.position.needsUpdate = true;
    dotGeo.attributes.color.needsUpdate = true;

    // Soğuk hava
    air.visible = s.air > 0.01;
    if (air.visible) {
      for (let i = 0; i < NA; i++) {
        const a = airSeed[i];
        const q = (a.ph + t * 0.35 * a.sp) % 1;
        airPos[i * 3] = a.x + a.sx * q * q;
        airPos[i * 3 + 1] = a.y + a.sy * q + Math.sin(t * 2 + i) * 0.03;
        airPos[i * 3 + 2] = EVAP.z + 0.15 + q * 3.2;
        airA[i] = Math.sin(q * Math.PI) * 0.75 * s.air;
      }
      airGeo.attributes.position.needsUpdate = true;
      airGeo.attributes.alpha.needsUpdate = true;
    }

    // Hortumlar
    const hq = clamp(s.hoses);
    for (const h of hoses) {
      h.visible = hq > 0.01;
      h.geometry.setDrawRange(0, Math.floor((hoseIdx * hq) / 6) * 6);
    }

    // Filtre değişimi: yukarı kayar, temizi iner
    const fq = clamp(s.filter);
    filter.position.y = FILTER_Y + Math.sin(fq * Math.PI) * 1.25;
    const swap = fq > 0.5;
    if (swap !== filterSwapped) {
      mFilter.map = swap ? texClean : texDirty;
      mFilter.needsUpdate = true;
      filterSwapped = swap;
    }

    // UV modu
    const uv = clamp(s.uv);
    hemi.intensity = 0.9 * (1 - uv * 0.85);
    key.intensity = 1.6 * (1 - uv * 0.9);
    rim.intensity = 0.8 * (1 - uv * 0.6);
    uvLamp.intensity = uv * 9;
    scene.environmentIntensity = (s.env ?? 0.9) * (1 - uv * 0.8);
    const lk = clamp(s.leak) * (0.8 + 0.2 * Math.sin(t * 7));
    leakMat.opacity = lk;
    leakCore.material.opacity = lk;
    leak.scale.setScalar(0.55 + 0.25 * Math.sin(t * 3.5) * lk);
    splats.children.forEach((sp, i) => (sp.material.opacity = clamp(s.leak) * (0.55 + 0.35 * Math.sin(t * 4 + i))));

    // Vurgu
    for (const [id, mats] of Object.entries(groups)) {
      const k = s.highlight === id ? s.hlAmount : 0;
      const pulse = 0.7 + 0.3 * Math.sin(t * 5);
      for (const m of mats) {
        if (id === 'evaporator' && m === mEvap) {
          m.emissive.set(0xdff6ff);
          m.emissiveIntensity = s.frost * 0.55 + k * 0.08 * pulse;
          continue;
        }
        m.emissive.copy(HL);
        m.emissiveIntensity = k * 0.16 * pulse;
      }
    }

    // Hafif süzülme
    rig.rotation.y = Math.sin(t * 0.25) * 0.03 * (s.float ?? 1);
    rig.position.y = Math.sin(t * 0.6) * 0.03 * (s.float ?? 1);

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.9) {
      dpr = Math.max(0.9, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      dotMat.uniforms.uPR.value = dpr;
      airMat.uniforms.uPR.value = dpr;
      resize();
      slowFrames = 0;
    }
  }

  // Ekranda bir noktanın yeri (etiketler için)
  function project(p, out = { x: 0, y: 0, vis: false }) {
    tmpV.copy(p).applyMatrix4(rig.matrixWorld).project(camera);
    out.x = (tmpV.x * 0.5 + 0.5) * width;
    out.y = (-tmpV.y * 0.5 + 0.5) * height;
    out.vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
    return out;
  }

  paintTube(1);
  return {
    renderer, camera, update, resize, project,
    compile: () => renderer.compile(scene, camera),
    points: {
      kompresor: V(COMP.x, COMP.y + 0.1, COMP.z + 0.8),
      kondenser: V(condCx + 0.6, condCy + 0.3, COND.z + 0.1),
      kacak: LEAK.clone(),
      dolum: LOW_PORT.clone().add(V(0, 0.28, 0)),
      evaporator: V(evCx + 0.3, evCy, EVAP.z + 0.15),
      filtre: V(evCx - 0.3, evCy + 0.4, EVAP.z - 0.24),
      valve: VALVE.clone(),
    },
  };
}
