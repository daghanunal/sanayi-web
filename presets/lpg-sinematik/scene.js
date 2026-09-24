// Mavi Hat: gazın yolculuğu. Açılışta mavi alev halkası söner ve simit tanka dönüşür; kamera
// sonra gazı tanktan çok valfe, bakır hatla regülatöre (sıvı → gaz), enjektör rampasına
// (1-3-4-2 sırasıyla) ve silindirde mavi yanmaya kadar izler. Hepsi prosedürel three.js.
// Durum dışarıdan `render(state)` ile verilir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const POS = {
  tank: new THREE.Vector3(0, 0, 0),
  valve: new THREE.Vector3(0.7, 0.3, 0.12),
  reg: new THREE.Vector3(3.6, 0.55, -0.6),
  rail: new THREE.Vector3(6.85, 0.95, -0.4),
  cyl: new THREE.Vector3(11.6, 0.1, -0.3),
};
const INJ_X = [6.3, 6.67, 7.04, 7.41];
const ORDER = [0, 2, 3, 1]; // 1-3-4-2

// --- Alev dili (nokta sprite) ---------------------------------------------------
const flameVert = /* glsl */ `
  attribute vec4 aSeed;      // x: açı, y: rastgele, z: katman, w: boy
  uniform float uTime, uScale, uR, uPower, uMaxPx, uLen;
  varying float vRot, vLayer, vFl;
  void main() {
    float a = aSeed.x;
    vec3 base = vec3(cos(a) * uR, 0.0, sin(a) * uR);
    vec3 dir = vec3(cos(a), 0.0, sin(a));
    float fl = 0.78 + 0.22 * sin(uTime * (11.0 + aSeed.y * 7.0) + aSeed.y * 40.0) + 0.12 * sin(uTime * 23.0 + aSeed.y * 13.0);
    float len = uLen * aSeed.w * fl * uPower;
    vec3 c = base + dir * len * 0.5;
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    vec4 mvt = modelViewMatrix * vec4(c + dir * 0.1, 1.0);
    vec4 p0 = projectionMatrix * mv;
    vec4 p1 = projectionMatrix * mvt;
    vec2 sd = p1.xy / p1.w - p0.xy / p0.w;
    vRot = atan(sd.y, sd.x);
    gl_Position = p0;
    float px = (len + 0.1) * 1.15 * uScale / max(0.2, -mv.z);
    gl_PointSize = min(px, uMaxPx) * step(0.01, uPower);
    vLayer = aSeed.z;
    vFl = fl;
  }
`;
const flameFrag = /* glsl */ `
  uniform vec3 uCore, uMid, uEdge;
  uniform float uAlpha, uAmber;
  varying float vRot, vLayer, vFl;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    q.y = -q.y;
    float c = cos(-vRot), s = sin(-vRot);
    vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c); // r.x: alev yönü
    float t = (r.x + 1.0) * 0.5;                       // 0 dip → 1 uç
    float w = 0.4 * pow(max(0.0, 1.0 - t), 0.55) * smoothstep(0.0, 0.22, t + 0.04);
    float d = abs(r.y) / max(w, 0.001);
    float body = (1.0 - smoothstep(0.55, 1.0, d)) * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.82, 1.0, t));
    if (body < 0.01) discard;
    float core = (1.0 - smoothstep(0.0, 0.45, d)) * (1.0 - smoothstep(0.1, 0.5, t));
    vec3 col = mix(uEdge, uMid, body);
    col = mix(col, uCore, core);
    col = mix(col, vec3(1.0, 0.62, 0.18), uAmber * smoothstep(0.55, 0.95, t));
    float a = body * uAlpha * mix(0.55, 1.0, vLayer);
    gl_FragColor = vec4(col * a, a);
  }
`;

// --- Gaz akışı --------------------------------------------------------------------
const flowVert = /* glsl */ `
  attribute float aPhase;
  attribute float aRnd;
  uniform float uScale, uMaxPx, uSize;
  varying float vPhase, vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float s = mix(0.032, 0.12, aPhase) * (0.7 + aRnd * 0.6) * uSize;
    gl_PointSize = min(s * uScale / max(0.2, -mv.z), uMaxPx);
    vPhase = aPhase;
    vA = 0.55 + aRnd * 0.45;
  }
`;
const flowFrag = /* glsl */ `
  uniform vec3 uLiquid, uGas;
  uniform float uAlpha;
  varying float vPhase, vA;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float r = dot(q, q);
    if (r > 1.0) discard;
    float soft = mix(1.0 - smoothstep(0.4, 1.0, r), exp(-r * 3.0), vPhase);
    vec3 col = mix(uLiquid, uGas, vPhase);
    float a = soft * vA * uAlpha * mix(1.0, 0.75, vPhase);
    gl_FragColor = vec4(col, a);
  }
`;

function glowTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4d7bff, 3);
  rim.position.set(-4, 2, -5);
  scene.add(rim);
  const flash = new THREE.PointLight(0x4a8dff, 0, 3.5, 2);
  scene.add(flash);

  const glowTex = glowTexture();
  const mat = {
    paint: new THREE.MeshStandardMaterial({ color: 0xe9eef3, metalness: 0.35, roughness: 0.32, transparent: true }),
    band: new THREE.MeshStandardMaterial({ color: 0x2447ff, metalness: 0.2, roughness: 0.4, transparent: true }),
    seam: new THREE.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.8, roughness: 0.3, transparent: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.28 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc8733f, metalness: 1, roughness: 0.3 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x14161c, metalness: 0, roughness: 0.7 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x2f55ff, metalness: 0.75, roughness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb9c2cc, metalness: 1, roughness: 0.22 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b2030, metalness: 0.6, roughness: 0.45 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fd6ff, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    dial: new THREE.MeshBasicMaterial({ color: 0xf6f8fb }),
    needle: new THREE.MeshBasicMaterial({ color: 0xff8a1e }),
    injOn: [],
  };
  const seg = lite ? 0.6 : 1;

  // --- Tank + alev halkası (aynı grup: dikken alev, yatınca tank) ---
  const ring = new THREE.Group();
  scene.add(ring);
  const R = 1, r = 0.38;
  const tank = new THREE.Group();
  ring.add(tank);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(R, r, Math.round(28 * seg), Math.round(96 * seg)), mat.paint);
  torus.rotation.x = Math.PI / 2;
  tank.add(torus);
  const lab = document.createElement('canvas');
  lab.width = 256; lab.height = 96;
  { const g = lab.getContext('2d'); g.fillStyle = '#2447ff'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#fff';
    g.font = '900 58px sans-serif'; g.textBaseline = 'middle'; g.fillText('LPG', 18, 50);
    for (let i = 0; i < 4; i++) g.fillRect(150 + i * 24, 20, 12, 56); }
  const labTex = new THREE.CanvasTexture(lab);
  labTex.colorSpace = THREE.SRGBColorSpace;
  mat.band.map = labTex; mat.band.color.set(0xffffff);
  const bandM = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), mat.band);
  bandM.position.set(-1.0, r + 0.004, 0.0);
  bandM.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  tank.add(bandM);
  // kaynak dikişi (dış çevre) ve bağlantı ayakları
  const seam = new THREE.Mesh(new THREE.TorusGeometry(R + r - 0.005, 0.018, 6, Math.round(120 * seg)), mat.seam);
  seam.rotation.x = Math.PI / 2;
  tank.add(seam);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.6;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.12), mat.seam);
    foot.position.set(Math.cos(a) * (R + r * 0.8), -r * 0.78, Math.sin(a) * (R + r * 0.8));
    foot.rotation.y = -a;
    tank.add(foot);
  }
  // çok valf
  const valve = new THREE.Group();
  valve.position.copy(POS.valve);
  valve.rotation.z = 0.5;
  tank.add(valve);
  const vBase = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 24), mat.brass);
  valve.add(vBase);
  const vBody = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.14, 0.2, 2, 0.03), mat.brass);
  vBody.position.y = 0.12;
  valve.add(vBody);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 28), mat.dial);
  dial.position.set(-0.05, 0.2, 0.02);
  valve.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.085), mat.needle);
  needle.position.set(-0.05, 0.22, 0.02);
  valve.add(needle);
  const vOut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), mat.brass);
  vOut.rotation.z = Math.PI / 2;
  vOut.position.set(0.2, 0.12, 0);
  valve.add(vOut);
  const tankParts = [mat.paint, mat.band, mat.seam];

  // alev
  const FN = lite ? 40 : 52;
  const fSeed = new Float32Array(FN * 3 * 4);
  let fi = 0;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < FN; i++) {
      fSeed[fi++] = (i / FN) * Math.PI * 2 + layer * (Math.PI / FN);
      fSeed[fi++] = Math.random();
      fSeed[fi++] = layer / 2;
      fSeed[fi++] = [1.15, 0.7, 0.38][layer] * (0.85 + Math.random() * 0.3);
    }
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FN * 3 * 3), 3));
  fGeo.setAttribute('aSeed', new THREE.BufferAttribute(fSeed, 4));
  const FU = {
    uTime: { value: 0 }, uScale: { value: 400 }, uR: { value: R + r * 0.55 }, uPower: { value: 1 }, uMaxPx: { value: 400 }, uLen: { value: 0.55 },
    uCore: { value: new THREE.Color(0.85, 0.97, 1) }, uMid: { value: new THREE.Color(0.2, 0.42, 1) }, uEdge: { value: new THREE.Color(0.18, 0.05, 0.55) },
    uAlpha: { value: 1 }, uAmber: { value: 0 },
  };
  const flames = new THREE.Points(fGeo, new THREE.ShaderMaterial({
    uniforms: FU, vertexShader: flameVert, fragmentShader: flameFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  flames.frustumCulled = false;
  flames.renderOrder = 4;
  ring.add(flames);
  const halo = new THREE.Mesh(new THREE.RingGeometry(R * 0.7, R * 2.1, 64), new THREE.MeshBasicMaterial({
    map: glowTex, color: 0x2a52ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  // halka dokusu: radyal; RingGeometry uv'si düz olduğundan basit bir disk kullanıyoruz
  halo.geometry = new THREE.CircleGeometry(R * 2.3, 48);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.02;
  ring.add(halo);

  // --- Hatlar ---
  const hose1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.95, 0.47, 0.12), new THREE.Vector3(1.25, 0.62, 0.2), new THREE.Vector3(1.9, 0.9, 0.25),
    new THREE.Vector3(2.7, 0.75, 0.05), new THREE.Vector3(3.15, 0.56, -0.45), new THREE.Vector3(3.32, 0.55, -0.6),
  ]);
  const hose2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.95, 0.62, -0.6), new THREE.Vector3(4.5, 0.8, -0.5), new THREE.Vector3(5.3, 1.25, -0.3),
    new THREE.Vector3(5.85, 1.05, -0.4), new THREE.Vector3(6.05, 0.95, -0.4),
  ]);
  const hose1M = new THREE.Mesh(new THREE.TubeGeometry(hose1, Math.round(90 * seg), 0.028, 8), mat.copper);
  scene.add(hose1M);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(hose2, Math.round(80 * seg), 0.055, 10), mat.rubber));

  // --- Regülatör ---
  const reg = new THREE.Group();
  reg.position.copy(POS.reg);
  scene.add(reg);
  const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.36, 40), mat.alu);
  rBody.rotation.x = Math.PI / 2;
  reg.add(rBody);
  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.025, 40), mat.alu);
    fin.rotation.x = Math.PI / 2;
    fin.position.z = -0.14 + i * 0.07;
    reg.add(fin);
  }
  const rCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 32), mat.steel);
  rCap.rotation.x = Math.PI / 2;
  rCap.position.z = 0.22;
  reg.add(rCap);
  const rIn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), mat.brass);
  rIn.rotation.z = Math.PI / 2;
  rIn.position.set(-0.36, 0, 0);
  reg.add(rIn);
  const rOut = rIn.clone();
  rOut.position.set(0.36, 0.06, 0);
  reg.add(rOut);
  // motor suyu hortumları
  for (const sx of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.12, -0.3, 0), new THREE.Vector3(sx * 0.2, -0.6, 0.1), new THREE.Vector3(sx * 0.45, -0.85, 0.3), new THREE.Vector3(sx * 0.8, -0.95, 0.4),
    ]);
    reg.add(new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.045, 8), mat.rubber));
  }
  const regGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fe0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  regGlow.scale.set(1.8, 1.8, 1);
  reg.add(regGlow);

  // --- Enjektör rampası ---
  const rail = new THREE.Group();
  scene.add(rail);
  const railBar = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.16, 0.2, 3, 0.04), mat.alu);
  railBar.position.set(6.85, 0.98, -0.4);
  rail.add(railBar);
  const injGlow = [];
  const injTip = [];
  INJ_X.forEach((x) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x151823, metalness: 0.4, roughness: 0.4, emissive: 0x3aa0ff, emissiveIntensity: 0 });
    mat.injOn.push(m);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 20), m);
    body.position.set(x, 0.75, -0.4);
    rail.add(body);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 20), mat.dark);
    coil.position.set(x, 0.82, -0.4);
    rail.add(coil);
    const nip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 10), mat.brass);
    nip.position.set(x, 0.56, -0.4);
    rail.add(nip);
    const hose = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.5, -0.4), new THREE.Vector3(x, 0.35, -0.3), new THREE.Vector3(x, 0.2, -0.18),
    ]);
    rail.add(new THREE.Mesh(new THREE.TubeGeometry(hose, 12, 0.022, 6), mat.rubber));
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6fd8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.position.set(x, 0.15, -0.16);
    g.scale.set(0.5, 0.5, 1);
    rail.add(g);
    injGlow.push(g);
    injTip.push(new THREE.Vector3(x, 0.17, -0.16));
  });
  // emme manifoldu ve blok
  const mani = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.34, 0.5, 3, 0.08), mat.dark);
  mani.position.set(6.85, -0.02, -0.25);
  rail.add(mani);
  const block = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.7, 1.0, 3, 0.1), mat.dark);
  block.position.set(6.85, -0.55, -0.55);
  rail.add(block);

  // --- Silindir kesiti ---
  const cyl = new THREE.Group();
  cyl.position.copy(POS.cyl);
  scene.add(cyl);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 40, 1, true), mat.glass);
  cyl.add(wall);
  for (const y of [-0.65, 0.65]) {
    const rr = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 6, 48), mat.steel);
    rr.rotation.x = Math.PI / 2;
    rr.position.y = y;
    cyl.add(rr);
  }
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.28, 40), mat.dark);
  head.position.y = 0.8;
  cyl.add(head);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 12), mat.steel);
  plug.position.set(0, 1.05, 0);
  cyl.add(plug);
  const plugCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), new THREE.MeshStandardMaterial({ color: 0xf1f3f6, roughness: 0.3 }));
  plugCap.position.set(0, 1.3, 0);
  cyl.add(plugCap);
  const dinj = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 12), mat.brass);
  dinj.position.set(0.32, 1.0, 0.1);
  dinj.rotation.z = -0.5;
  cyl.add(dinj);
  const piston = new THREE.Group();
  cyl.add(piston);
  const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.42, 40), mat.steel);
  piston.add(pBody);
  for (let i = 0; i < 3; i++) {
    const pr = new THREE.Mesh(new THREE.TorusGeometry(0.445, 0.01, 4, 40), mat.dark);
    pr.rotation.x = Math.PI / 2;
    pr.position.y = 0.16 - i * 0.05;
    piston.add(pr);
  }
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.08), mat.steel);
  rod.position.y = -0.6;
  piston.add(rod);
  // yanma: silindir içinde dairesel alev (küçük halka) + ışık
  const burnU = {
    ...FU, uR: { value: 0.05 }, uPower: { value: 0 }, uLen: { value: 0.42 }, uAlpha: { value: 1 }, uAmber: { value: 0 },
    uTime: FU.uTime, uScale: FU.uScale, uMaxPx: FU.uMaxPx,
  };
  const burn = new THREE.Points(fGeo, new THREE.ShaderMaterial({
    uniforms: burnU, vertexShader: flameVert, fragmentShader: flameFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  burn.frustumCulled = false;
  burn.renderOrder = 5;
  burn.position.y = 0.52;
  cyl.add(burn);
  const burnGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x4a7dff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  burnGlow.scale.set(1.8, 1.4, 1);
  burnGlow.position.y = 0.45;
  cyl.add(burnGlow);

  // --- Gaz akışı: tek eğri üzerinde parçacıklar ---
  const LUT_N = 480;
  const lut = new Float32Array(LUT_N * 3);
  const regU = 0.47; // eğri üzerindeki regülatör konumu
  {
    const pts = [];
    const n1 = Math.round(LUT_N * 0.44), n2 = Math.round(LUT_N * 0.06), n3 = Math.round(LUT_N * 0.3), n4 = LUT_N - n1 - n2 - n3;
    for (let i = 0; i < n1; i++) pts.push(hose1.getPointAt(i / n1));
    for (let i = 0; i < n2; i++) pts.push(new THREE.Vector3().lerpVectors(new THREE.Vector3(3.32, 0.55, -0.6), new THREE.Vector3(3.95, 0.62, -0.6), i / n2));
    for (let i = 0; i < n3; i++) pts.push(hose2.getPointAt(i / n3));
    for (let i = 0; i < n4; i++) pts.push(new THREE.Vector3(6.05 + (1.45 * i) / (n4 - 1), 0.98, -0.4));
    pts.forEach((p, i) => p.toArray(lut, i * 3));
  }
  const PN = lite ? 380 : 700;
  const pPos = new Float32Array(PN * 3);
  const pPhase = new Float32Array(PN);
  const pRnd = new Float32Array(PN);
  const pOff = new Float32Array(PN * 3);
  const pU = new Float32Array(PN);
  for (let i = 0; i < PN; i++) {
    pU[i] = Math.random();
    pRnd[i] = Math.random();
    pOff[i * 3] = (Math.random() - 0.5);
    pOff[i * 3 + 1] = (Math.random() - 0.5);
    pOff[i * 3 + 2] = (Math.random() - 0.5);
  }
  const pGeo = new THREE.BufferGeometry();
  const pAttr = new THREE.BufferAttribute(pPos, 3);
  pAttr.setUsage(THREE.DynamicDrawUsage);
  const phAttr = new THREE.BufferAttribute(pPhase, 1);
  phAttr.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('position', pAttr);
  pGeo.setAttribute('aPhase', phAttr);
  pGeo.setAttribute('aRnd', new THREE.BufferAttribute(pRnd, 1));
  const PU = {
    uScale: FU.uScale, uMaxPx: FU.uMaxPx, uSize: { value: 1 }, uAlpha: { value: 0 },
    uLiquid: { value: new THREE.Color(0.06, 0.16, 0.95) }, uGas: { value: new THREE.Color(0.92, 0.99, 1) },
  };
  const flow = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    uniforms: PU, vertexShader: flowVert, fragmentShader: flowFrag, transparent: true, depthWrite: false, depthTest: false,
  }));
  flow.frustumCulled = false;
  flow.renderOrder = 6;
  scene.add(flow);

  // --- Boyut ---
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    FU.uScale.value = camera.projectionMatrix.elements[5] * H * dpr * 0.5;
    FU.uMaxPx.value = H * dpr * 0.5;
  }
  resize();

  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const off = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let lastTime = 0;

  function render(s) {
    const portrait = W / H < 0.85;
    const time = s.time;
    const dt = Math.min(0.05, Math.max(0, time - lastTime));
    lastTime = time;

    // kamera: bakış noktası + ofset; dikeyde uzaklaş ve nesneyi yukarı taşı
    look.set(...s.look);
    off.set(...(portrait ? s.pcam : s.cam)).sub(look);
    off.multiplyScalar(portrait ? s.pd : 1);
    // hafif nefes
    off.x += Math.sin(time * 0.35) * 0.08;
    off.y += Math.cos(time * 0.3) * 0.05;
    cam.copy(look).add(off);
    right.copy(off).cross(up).normalize(); // kameradan bakınca sol
    if (portrait) look.y -= s.fy * off.length() * 0.1;
    else look.addScaledVector(right, s.fx * off.length() * 0.1);
    camera.position.copy(cam);
    camera.lookAt(look);

    // halka: dik (alev) → yatık (tank)
    const flat = s.flat;
    ring.rotation.x = (1 - flat) * (Math.PI / 2);
    ring.rotation.y = (1 - flat) * 0.0 + time * 0.05 * (1 - flat);
    const ta = s.tank;
    tankParts.forEach((m) => { m.opacity = ta; m.transparent = ta < 0.999; m.depthWrite = ta > 0.5; });
    tank.visible = ta > 0.01;
    hose1M.visible = ta > 0.6;
    tank.scale.setScalar(0.85 + 0.15 * ta);
    needle.rotation.x = -0.6 + s.fill * 1.6;

    FU.uTime.value = time;
    FU.uPower.value = s.flame;
    FU.uAlpha.value = Math.min(1, s.flame * 1.4);
    flames.visible = s.flame > 0.01;
    halo.material.opacity = s.flame * 0.55;

    // akış
    const fa = s.flow;
    PU.uAlpha.value = fa;
    flow.visible = fa > 0.01;
    if (flow.visible) {
      const speed = s.speed;
      for (let i = 0; i < PN; i++) {
        let u = pU[i] + dt * speed * (0.8 + pRnd[i] * 0.4) * (pU[i] < regU ? 0.55 : 1.35);
        if (u >= 1) u -= 1;
        pU[i] = u;
        const f = u * (LUT_N - 1);
        const k = Math.floor(f), t = f - k, k2 = Math.min(LUT_N - 1, k + 1);
        const ph = Math.min(1, Math.max(0, (u - regU + 0.02) / 0.06));
        const spread = 0.018 + ph * 0.09;
        for (let a = 0; a < 3; a++) {
          pPos[i * 3 + a] = lut[k * 3 + a] + (lut[k2 * 3 + a] - lut[k * 3 + a]) * t + pOff[i * 3 + a] * spread;
        }
        pPhase[i] = ph;
      }
      pAttr.needsUpdate = true;
      phAttr.needsUpdate = true;
    }
    regGlow.material.opacity = s.regGlow * (0.55 + 0.15 * Math.sin(time * 2.4));

    // enjektörler 1-3-4-2
    const period = 0.62;
    const cyc = (time / period) % 1;
    const slot = Math.floor(cyc * 4);
    const local = (cyc * 4) % 1;
    const pulse = Math.max(0, 1 - local * 2.2);
    let firing = -1;
    INJ_X.forEach((_, i) => {
      const on = ORDER[slot] === i ? pulse : 0;
      if (on > 0) firing = i;
      mat.injOn[i].emissiveIntensity = on * 3 * s.inj;
      injGlow[i].material.opacity = on * s.inj;
      injGlow[i].scale.setScalar(0.3 + on * 0.5);
    });
    s.firing = s.inj > 0.3 ? firing : -1;

    // silindir: piston ve yanma
    const crank = time * 2.2;
    const py = Math.cos(crank);
    piston.position.y = -0.2 + py * 0.26;
    const tdc = Math.pow(Math.max(0, Math.cos(crank)), 6); // üst ölü noktada parlama
    const bk = (0.18 + 0.82 * tdc) * s.burn;
    mat.glass.opacity = 0.14 + tdc * s.burn * 0.3;
    burnU.uPower.value = bk;
    burnU.uAlpha.value = Math.min(1, bk * 1.4);
    burnU.uAmber.value = s.amber;
    burn.position.y = 0.36 + py * 0.08;
    burn.visible = s.burn > 0.01;
    burnGlow.material.opacity = tdc * s.burn * 0.9;
    burnGlow.material.color.setRGB(0.29 + s.amber * 0.6, 0.49, 1 - s.amber * 0.6);
    flash.position.set(POS.cyl.x, POS.cyl.y + 0.45, POS.cyl.z);
    flash.intensity = tdc * s.burn * 6;

    rim.intensity = s.rim;
    scene.environmentIntensity = s.env;
    renderer.render(scene, camera);
  }

  function setQuality(low) {
    dpr = Math.min(devicePixelRatio || 1, low ? 1 : lite ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    resize();
  }

  return { render, resize, setQuality };
}
