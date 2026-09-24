// Kodla çizilmiş "patlatılmış şanzıman hattı": planet dişli seti, kesitli tork konvertörü,
// mekatronik valf gövdesi, DSG çift kavrama ve CVT kasnak-kayış. Hepsi X ekseni üzerinde dizili.
// Dişliler gerçek diş sayılarıyla birbirine geçer (güneş 18, uydu 12, çember 42).
// Sahne durumu dışarıdan `update(state)` ile verilir; kamera kurgusu main.js'te.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;

export const ISTASYON = { planet: 0, tork: 14, meka: 28, dsg: 42, cvt: 56 };
export const PETROL = 0x0a1a1f;

// --- Dişli profilleri ---------------------------------------------------------
// Basit trapez diş: kök, yan, uç. Diş açısal ortası a0'da.
function toothPoints(N, rp, m, internal = false) {
  const p = TAU / N;
  const rTip = internal ? rp - m : rp + m;
  const rRoot = internal ? rp + 1.25 * m : rp - 1.25 * m;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = i * p;
    const prof = [
      [-0.5, rRoot], [-0.3, rRoot], [-0.14, rTip], [0.14, rTip], [0.3, rRoot],
    ];
    for (const [f, r] of prof) pts.push(new THREE.Vector2(Math.cos(a + f * p) * r, Math.sin(a + f * p) * r));
  }
  return pts;
}
function circlePath(r, seg = 48, cw = false) {
  const path = new THREE.Path();
  for (let i = 0; i <= seg; i++) {
    const a = (cw ? -1 : 1) * (i / seg) * TAU;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? path.lineTo(x, y) : path.moveTo(x, y);
  }
  return path;
}
function gearGeo(N, rp, m, depth, holeR = 0, extraHoles = null) {
  const shape = new THREE.Shape(toothPoints(N, rp, m));
  if (holeR) shape.holes.push(circlePath(holeR, 40, true));
  if (extraHoles) {
    for (const [x, y, r] of extraHoles) {
      const h = new THREE.Path();
      h.absarc(x, y, r, 0, TAU, true);
      shape.holes.push(h);
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 1, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}
function ringGearGeo(N, rp, m, rOut, depth) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOut, 0, TAU, false);
  const inner = new THREE.Path(toothPoints(N, rp, m, true).reverse());
  shape.holes.push(inner);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 1, curveSegments: 64 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}
// Kalın halka (kavrama diski): dikdörtgen profili Y ekseni etrafında döndürülür, sonra Z'ye yatırılır
function discGeo(r0, r1, t, seg = 56, teeth = 0, outerTeeth = true) {
  let g;
  if (teeth) {
    // Dişli kenarlı disk (çelik disklerde dış, balatalarda iç kanal dişi)
    const shape = new THREE.Shape();
    const N = teeth;
    const pts = [];
    for (let i = 0; i < N * 4; i++) {
      const a = (i / (N * 4)) * TAU;
      const hi = (i % 4) < 2;
      const r = outerTeeth ? (hi ? r1 : r1 - 0.05) : r1;
      pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    shape.setFromPoints(pts);
    const hole = [];
    for (let i = 0; i < N * 4; i++) {
      const a = -(i / (N * 4)) * TAU;
      const hi = (i % 4) < 2;
      const r = !outerTeeth ? (hi ? r0 : r0 + 0.05) : r0;
      hole.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
    }
    shape.holes.push(new THREE.Path(hole));
    g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
  } else {
    const prof = [V(r0, -t / 2), V(r1, -t / 2), V(r1, t / 2), V(r0, t / 2), V(r0, -t / 2)].map((v) => new THREE.Vector2(v.x, v.y));
    g = new THREE.LatheGeometry(prof, seg);
    g.rotateX(Math.PI / 2);
  }
  g.computeVertexNormals();
  return g;
}

// Yağ akış çizgisi: tüp boyunca kayan nabız
function flowMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uColor: { value: new THREE.Color(color) }, uRep: { value: 5 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime, uOn, uRep; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float f = fract(vUv.x * uRep - uTime * 0.9);
        float pulse = smoothstep(0.0, 0.18, f) * (1.0 - smoothstep(0.35, 0.6, f));
        vec3 base = uColor * 0.16;
        vec3 c = mix(base, uColor * 2.2, pulse * uOn) + uColor * 0.25 * uOn;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(PETROL, 9, 26);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 120);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0x9fc6c9, 0x081215, 0.55));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(8, 9, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2e4d, 2.4); // ATF kırmızısı kontur ışığı
  rim.position.set(-7, 3, -8);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x7fd4d0, 0.6);
  fill.position.set(-4, -5, 6);
  scene.add(fill);
  // Etkin istasyonun yanında gezen kırmızı nokta ışık
  const glow = new THREE.PointLight(0xff2e4d, 0, 7, 1.5);
  scene.add(glow);

  // --- Malzemeler -------------------------------------------------------------
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc3c9cc, roughness: 0.26, metalness: 1 }),
    steel2: new THREE.MeshStandardMaterial({ color: 0x8a959a, roughness: 0.38, metalness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a4549, roughness: 0.5, metalness: 0.85 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd4ad62, roughness: 0.28, metalness: 1 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc46a3c, roughness: 0.32, metalness: 1 }),
    friction: new THREE.MeshStandardMaterial({ color: 0x4a3326, roughness: 0.92, metalness: 0, emissive: 0xff2e4d, emissiveIntensity: 0 }),
    frictionB: new THREE.MeshStandardMaterial({ color: 0x4a3326, roughness: 0.92, metalness: 0, emissive: 0xff2e4d, emissiveIntensity: 0 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x9aa4a6, roughness: 0.55, metalness: 0.8 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x121719, roughness: 0.6, metalness: 0.1 }),
    ruby: new THREE.MeshStandardMaterial({ color: 0x3a0610, roughness: 0.3, metalness: 0.2, emissive: 0xff2e4d, emissiveIntensity: 0.6 }),
    shell: new THREE.MeshStandardMaterial({ color: 0xb3bcbf, roughness: 0.3, metalness: 1, side: THREE.DoubleSide }),
    shellIn: new THREE.MeshStandardMaterial({ color: 0x6d2a31, roughness: 0.45, metalness: 0.7, side: THREE.DoubleSide }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x0e3b36, roughness: 0.55, metalness: 0.2 }),
  };
  for (const m of Object.values(M)) m.side = THREE.DoubleSide;
  const units = {};

  // ===== 1. Planet dişli seti ==================================================
  const ZS = 18, ZP = 12, ZR = 42, MOD = 0.1;
  const RS = (ZS * MOD) / 2, RPL = (ZP * MOD) / 2, RR = (ZR * MOD) / 2; // 0.9, 0.6, 2.1
  const RC = RS + RPL; // uydu merkezleri 1.5
  const planet = new THREE.Group();
  planet.position.x = ISTASYON.planet;
  planet.rotation.y = Math.PI / 2; // yerel z → dünya x
  scene.add(planet);
  units.planet = planet;

  const sun = new THREE.Mesh(gearGeo(ZS, RS, MOD, 0.5, 0.26), M.brass);
  planet.add(sun);
  const sunShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 28).rotateX(Math.PI / 2), M.steel);
  sunShaft.position.z = 1.4;
  planet.add(sunShaft);
  const planets = [];
  const planetGeo = gearGeo(ZP, RPL, MOD, 0.46, 0.14);
  for (let i = 0; i < 3; i++) {
    const phi = (i / 3) * TAU;
    const pivot = new THREE.Group(); // uydu yuvası: taşıyıcıyla birlikte
    const g = new THREE.Mesh(planetGeo, M.steel);
    pivot.add(g);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 16).rotateX(Math.PI / 2), M.dark);
    pivot.add(pin);
    planet.add(pivot);
    planets.push({ phi, pivot, g });
  }
  const ring = new THREE.Mesh(ringGearGeo(ZR, RR, MOD, RR + 0.34, 0.56), M.steel2);
  planet.add(ring);
  // Taşıyıcı: üç kollu plaka, arkada
  const carrierShape = new THREE.Shape();
  carrierShape.absarc(0, 0, RC + 0.34, 0, TAU, false);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 3;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.34, 0, TAU, true);
    carrierShape.holes.push(h);
  }
  carrierShape.holes.push(circlePath(0.3, 32, true));
  const carrierGeo = new THREE.ExtrudeGeometry(carrierShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 20 });
  const carrier = new THREE.Mesh(carrierGeo, M.dark);
  carrier.position.z = -0.5;
  planet.add(carrier);
  const carrierShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 3.4, 28, 1, true).rotateX(Math.PI / 2), M.steel2);
  carrierShaft.position.z = -2.1;
  planet.add(carrierShaft);
  // Balata paketi: çemberin dışında, arkada ince diskler
  const packGeoA = discGeo(RR + 0.42, RR + 0.78, 0.05, 64);
  const planetPack = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(packGeoA, i % 2 ? M.steel : M.friction);
    m.position.z = -0.9 - i * 0.1;
    planet.add(m);
    planetPack.push(m);
  }

  // ===== 2. Tork konvertörü (kesitli) ==========================================
  const tork = new THREE.Group();
  tork.position.x = ISTASYON.tork;
  tork.rotation.y = Math.PI / 2;
  scene.add(tork);
  units.tork = tork;
  const TR = 1.35, Tr = 0.62; // torus yarıçapı, kesit yarıçapı
  const halfProfile = (upper) => {
    const pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = (i / 18) * Math.PI; // dıştan üstten içe
      pts.push(new THREE.Vector2(TR + Tr * Math.cos(t), (upper ? 1 : -1) * Tr * Math.sin(t)));
    }
    pts.push(new THREE.Vector2(0.32, 0)); // göbeğe kapanış
    return upper ? pts : pts.reverse();
  };
  const cut = 0.72; // görünen kısım (kesit)
  const mkShell = (upper, mat) => {
    const g = new THREE.LatheGeometry(halfProfile(upper), lite ? 40 : 64, -Math.PI * 0.31, TAU * cut);
    g.rotateX(Math.PI / 2);
    return new THREE.Mesh(g, mat);
  };
  const pump = new THREE.Group();
  const turbine = new THREE.Group();
  const pumpShell = mkShell(true, M.shell);
  const turbShell = mkShell(false, M.shell);
  pump.add(pumpShell);
  turbine.add(turbShell);
  // Kanatlar: yarım torusun içinde ışınsal ince plakalar
  const bladeGeo = new THREE.BoxGeometry(Tr * 1.5, 0.018, Tr * 0.78);
  const nBl = lite ? 22 : 30;
  const pumpBl = new THREE.InstancedMesh(bladeGeo, M.brass, nBl);
  const turbBl = new THREE.InstancedMesh(bladeGeo, M.steel2, nBl);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < nBl; i++) {
    const a = (i / nBl) * TAU;
    for (const [mesh, zs] of [[pumpBl, 1], [turbBl, -1]]) {
      dummy.position.set(Math.cos(a) * TR, Math.sin(a) * TR, zs * Tr * 0.4);
      dummy.rotation.set(0, 0, a);
      dummy.rotateX(zs * 0.35);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
  }
  pump.add(pumpBl);
  turbine.add(turbBl);
  // Stator: ortada, eğik kanatlı küçük çark
  const stator = new THREE.Group();
  const statorHub = new THREE.Mesh(discGeo(0.34, 0.62, 0.2, 40), M.dark);
  stator.add(statorHub);
  const stBlGeo = new THREE.BoxGeometry(0.34, 0.03, 0.24);
  const stBl = new THREE.InstancedMesh(stBlGeo, M.ruby, 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    dummy.position.set(Math.cos(a) * 0.78, Math.sin(a) * 0.78, 0);
    dummy.rotation.set(0, 0, a);
    dummy.rotateX(0.7);
    dummy.updateMatrix();
    stBl.setMatrixAt(i, dummy.matrix);
  }
  stator.add(stBl);
  // Ön kapak (motora bağlanan) ve kilitleme kavraması diski
  const cover = new THREE.Mesh(discGeo(0.3, TR + Tr + 0.04, 0.08, 64), M.steel2);
  cover.position.z = Tr + 0.34;
  const lockDisc = new THREE.Mesh(discGeo(0.9, TR + Tr - 0.08, 0.06, 64), M.frictionB);
  lockDisc.position.z = Tr + 0.18;
  const lugs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12).rotateX(Math.PI / 2), M.brass, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    dummy.position.set(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    lugs.setMatrixAt(i, dummy.matrix);
  }
  cover.add(lugs);
  pump.add(cover);
  tork.add(pump, turbine, stator, lockDisc);
  const torkShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 20).rotateX(Math.PI / 2), M.steel);
  tork.add(torkShaft);

  // ===== 3. Mekatronik: valf gövdesi + solenoidler + beyin =======================
  const meka = new THREE.Group();
  meka.position.set(ISTASYON.meka, -0.2, 0);
  meka.rotation.set(0.5, 0.25, 0);
  scene.add(meka);
  units.meka = meka;
  const body = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.42, 2.4, 2, 0.06), M.alu);
  meka.add(body);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.06, 2.3, 1, 0.02), M.dark);
  plate.position.y = 0.24;
  meka.add(plate);
  // Kanallar: Manhattan yolları, yüzey üstünde akış tüpleri
  const flowMat = flowMaterial(0xff2e4d);
  const chanPaths = [
    [[-1.5, -0.9], [-0.6, -0.9], [-0.6, -0.2], [0.4, -0.2], [0.4, 0.6], [1.4, 0.6]],
    [[-1.5, 0.2], [-1.0, 0.2], [-1.0, 0.9], [0.1, 0.9], [0.1, 0.3], [1.0, 0.3], [1.0, -0.8], [1.5, -0.8]],
    [[-1.2, -0.4], [-0.2, -0.4], [-0.2, -1.0], [0.8, -1.0], [0.8, -0.4], [1.2, -0.4]],
    [[-1.5, 0.6], [-0.4, 0.6], [-0.4, 0.2], [-0.05, 0.2]],
    [[0.7, 1.0], [0.7, 0.65], [1.5, 0.65]],
  ];
  for (const p of chanPaths) {
    const pts = [];
    p.forEach(([x, z], i) => {
      pts.push(V(x, 0.29, z));
      if (i < p.length - 1) {
        const [x2, z2] = p[i + 1];
        pts.push(V(L(x, x2, 0.5), 0.29, L(z, z2, 0.5)));
      }
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.02);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.045, 6, false), flowMat);
    meka.add(tube);
  }
  // Solenoidler: arka kenarda sıra
  const solenoids = [];
  const coilGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.46, 20);
  const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.14, 16);
  const tipGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.08, 12);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Group();
    const coil = new THREE.Mesh(coilGeo, M.copper);
    const cap = new THREE.Mesh(capGeo, M.steel);
    cap.position.y = 0.3;
    const tip = new THREE.Mesh(tipGeo, M.ruby.clone());
    tip.position.y = 0.4;
    s.add(coil, cap, tip);
    s.position.set(-1.35 + i * 0.54, 0.52, -0.98);
    meka.add(s);
    solenoids.push({ s, tip });
  }
  // Beyin (TCU): siyah kapak, üstünde kart
  const tcu = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.22, 0.9, 2, 0.05), M.plastic);
  tcu.position.set(0.95, 0.4, 0.6);
  meka.add(tcu);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.66), M.pcb);
  board.position.set(0.95, 0.53, 0.6);
  meka.add(board);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), M.plastic);
  chip.position.set(0.8, 0.56, 0.6);
  meka.add(chip);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), M.ruby.clone());
  led.position.set(1.3, 0.57, 0.4);
  meka.add(led);
  const conn = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.2, 0.3, 1, 0.04), M.plastic);
  conn.position.set(1.72, 0.42, 0.6);
  meka.add(conn);

  // ===== 4. DSG çift kavrama ===================================================
  const dsg = new THREE.Group();
  dsg.position.x = ISTASYON.dsg;
  dsg.rotation.y = Math.PI / 2;
  scene.add(dsg);
  units.dsg = dsg;
  const drumGeo = new THREE.CylinderGeometry(1.62, 1.62, 1.3, lite ? 40 : 64, 1, true, -Math.PI * 0.3, TAU * 0.7).rotateX(Math.PI / 2);
  const drum = new THREE.Mesh(drumGeo, M.shell);
  dsg.add(drum);
  const drumBack = new THREE.Mesh(discGeo(0.34, 1.62, 0.08, 64), M.steel2);
  drumBack.position.z = -0.7;
  dsg.add(drumBack);
  const k1 = [], k2 = [];
  const k1F = discGeo(1.0, 1.5, 0.05, 56), k1S = discGeo(1.02, 1.54, 0.04, 56, 16, true);
  const k2F = discGeo(0.42, 0.88, 0.05, 48), k2S = discGeo(0.4, 0.9, 0.04, 48, 12, false);
  const fricK1 = M.friction.clone(), fricK2 = M.friction.clone();
  for (let i = 0; i < 9; i++) {
    const a = new THREE.Mesh(i % 2 ? k1S : k1F, i % 2 ? M.steel : fricK1);
    const b = new THREE.Mesh(i % 2 ? k2S : k2F, i % 2 ? M.steel : fricK2);
    dsg.add(a, b);
    k1.push(a);
    k2.push(b);
  }
  const piston1 = new THREE.Mesh(discGeo(0.98, 1.56, 0.1, 56), M.brass);
  const piston2 = new THREE.Mesh(discGeo(0.38, 0.92, 0.1, 48), M.brass);
  dsg.add(piston1, piston2);
  // Eş merkezli iki giriş mili ve üzerlerinde vites dişlileri
  const shaftOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.2, 24, 1, true).rotateX(Math.PI / 2), M.steel2);
  shaftOuter.position.z = -2.2;
  const shaftInner = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.4, 20).rotateX(Math.PI / 2), M.steel);
  shaftInner.position.z = -3.1;
  dsg.add(shaftOuter, shaftInner);
  const dsgGears = [];
  const gSpec = [[22, -1.6, 'o'], [16, -2.3, 'o'], [26, -3.2, 'i'], [19, -4.0, 'i'], [14, -4.7, 'i']];
  for (const [n, z, which] of gSpec) {
    const gm = new THREE.Mesh(gearGeo(n, n * 0.03, 0.06, 0.24, which === 'o' ? 0.3 : 0.16), which === 'o' ? M.steel : M.brass);
    gm.position.z = z;
    dsg.add(gm);
    dsgGears.push({ gm, which, n });
  }

  // ===== 5. CVT: iki kasnak ve itme kayışı =======================================
  const cvt = new THREE.Group();
  cvt.position.x = ISTASYON.cvt;
  cvt.rotation.y = Math.PI / 2;
  scene.add(cvt);
  units.cvt = cvt;
  const CD = 2.7; // mil arası
  const RH = 0.28, RMAX = 1.28, TANA = 0.2, BW = 0.46; // göbek, sac yarıçapı, konik eğim, kayış genişliği
  const sheaveProfile = [
    [RH, 0], [RMAX, (RMAX - RH) * TANA], [RMAX + 0.02, (RMAX - RH) * TANA + 0.1], [RH + 0.25, 0.42], [RH, 0.48],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const sheaveGeo = new THREE.LatheGeometry(sheaveProfile, lite ? 48 : 72);
  sheaveGeo.rotateX(Math.PI / 2); // lathe y → +z; yüz merkez düzleme bakar
  const mkPulley = (y) => {
    const g = new THREE.Group();
    g.position.y = y;
    const a = new THREE.Mesh(sheaveGeo, M.steel);
    const b = new THREE.Mesh(sheaveGeo, M.steel);
    b.scale.z = -1;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 18).rotateX(Math.PI / 2), M.steel2);
    g.add(a, b, shaft);
    cvt.add(g);
    return { g, a, b };
  };
  const pu1 = mkPulley(CD / 2), pu2 = mkPulley(-CD / 2);
  const nEl = lite ? 110 : 150;
  const elGeo = new THREE.BoxGeometry(0.05, 0.13, BW);
  const belt = new THREE.InstancedMesh(elGeo, M.brass, nEl);
  belt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cvt.add(belt);
  const beltLen = (r1, r2) => {
    const b = Math.asin((r1 - r2) / CD);
    return Math.PI * (r1 + r2) + 2 * b * (r1 - r2) + 2 * Math.sqrt(CD * CD - (r1 - r2) ** 2);
  };
  const L0 = beltLen(0.8, 0.8);
  const solveR2 = (r1) => {
    let lo = 0.2, hi = 1.4;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (beltLen(r1, mid) > L0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  };
  function beltPoint(s, r1, r2, out) {
    // s ∈ [0,1): üst kasnakta sağ teğetten saat yönü tersine
    const b = Math.asin((r1 - r2) / CD);
    const ls = Math.sqrt(CD * CD - (r1 - r2) ** 2);
    const a1 = r1 * (Math.PI + 2 * b), a2 = r2 * (Math.PI - 2 * b);
    const tot = a1 + a2 + 2 * ls;
    let d = s * tot;
    const c1y = CD / 2, c2y = -CD / 2;
    if (d < a1) {
      const th = -b + d / r1;
      out.set(Math.cos(th) * r1, c1y + Math.sin(th) * r1, th + Math.PI / 2);
      return;
    }
    d -= a1;
    if (d < ls) {
      const th = Math.PI + b;
      const p1x = Math.cos(th) * r1, p1y = c1y + Math.sin(th) * r1;
      const p2x = Math.cos(th) * r2, p2y = c2y + Math.sin(th) * r2;
      const k = d / ls;
      out.set(L(p1x, p2x, k), L(p1y, p2y, k), Math.atan2(p2y - p1y, p2x - p1x));
      return;
    }
    d -= ls;
    if (d < a2) {
      const th = Math.PI + b + d / r2;
      out.set(Math.cos(th) * r2, c2y + Math.sin(th) * r2, th + Math.PI / 2);
      return;
    }
    d -= a2;
    const th = -b;
    const p1x = Math.cos(th) * r2, p1y = c2y + Math.sin(th) * r2;
    const p2x = Math.cos(th) * r1, p2y = c1y + Math.sin(th) * r1;
    const k = d / ls;
    out.set(L(p1x, p2x, k), L(p1y, p2y, k), Math.atan2(p2y - p1y, p2x - p1x));
  }

  // ===== 6. Yağ: bütün hattı dolaşan kırmızı parçacıklar ==========================
  const OX = 14 / 9; // yol noktaları 9 birim aralığa göre yazıldı
  const oilPath = new THREE.CatmullRomCurve3([
    [-3.2, -2.4, 1.2], [-1, 2.6, 2.4], [4.5, 2.4, -2], [9, -2.2, 2.2], [13.5, 2.2, 1.8], [18, 1.6, -1.4],
    [22.5, -2.0, 2], [27, 2.4, 2.2], [31.5, -2.2, -1.8], [36, 2.6, 2.2], [39.5, -1.8, 0.8], [33, -3.2, -2.4],
    [20, -3.4, -2.8], [6, -3.0, -2.6],
  ].map(([x, y, z]) => V(x * OX, y, z)), true, 'catmullrom', 0.4);
  const LUT = oilPath.getSpacedPoints(900);
  const nOil = lite ? 360 : 720;
  const oilPos = new Float32Array(nOil * 3);
  const oilSeed = new Float32Array(nOil * 4);
  for (let i = 0; i < nOil; i++) {
    oilSeed[i * 4] = Math.random();
    oilSeed[i * 4 + 1] = (Math.random() - 0.5) * 0.5;
    oilSeed[i * 4 + 2] = (Math.random() - 0.5) * 0.5;
    oilSeed[i * 4 + 3] = 0.6 + Math.random() * 0.8;
  }
  const oilGeo = new THREE.BufferGeometry();
  oilGeo.setAttribute('position', new THREE.BufferAttribute(oilPos, 3).setUsage(THREE.DynamicDrawUsage));
  const oilMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uOn: { value: 0 }, uSize: { value: 150 * dpr } },
    vertexShader: `uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOn; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vec3(1.0, 0.18, 0.3) * a * uOn, a * uOn); }`,
  });
  const oil = new THREE.Points(oilGeo, oilMat);
  oil.frustumCulled = false;
  scene.add(oil);

  // --- Boyut ve güncelleme ------------------------------------------------------
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
  let sunA = 0, torkA = 0, turbA = 0, dsgA = 0, cvtA = 0, beltS = 0, oilS = 0;
  const bp = V(0, 0, 0);
  const IDS = ['planet', 'tork', 'meka', 'dsg', 'cvt'];

  // s: { pos, look, fov, k:{planet,tork,meka,dsg,cvt,yag}, q:{...}, spin, assemble, env, oil }
  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const k = s.k, q = s.q;

    camera.position.copy(s.pos);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(s.look);

    // Uzaktaki istasyonları çizme
    // Uzaklaşan istasyon kendi merkezine doğru küçülerek çekilir
    for (const id of IDS) {
      const dx = Math.abs(units[id].position.x - s.look.x);
      const f = s.overview ? 1 : 1 - clamp((dx - 9) / 3.5);
      const e = f * f * (3 - 2 * f);
      units[id].visible = e > 0.01;
      units[id].scale.setScalar(Math.max(0.001, e));
    }

    // Kırmızı nokta ışık etkin istasyonu izler
    let gx = 0, gk = 0;
    for (const id of IDS) { gx += ISTASYON[id] * k[id]; gk += k[id]; }
    if (gk > 0.001) glow.position.set(gx / gk + 1.6, 1.6, 2.2);
    glow.intensity = gk * 14;

    // 1. Planet
    const spin = s.spin;
    if (units.planet.visible) {
      const as = s.assemble;
      sunA += dt * spin * 2.4;
      sun.rotation.z = sunA;
      sun.position.z = (1 - as) * 1.7;
      sunShaft.position.z = 1.4 + (1 - as) * 1.7;
      for (const pl of planets) {
        const out = (1 - as) * 0.5;
        pl.pivot.position.set(Math.cos(pl.phi) * (RC + out), Math.sin(pl.phi) * (RC + out), (1 - as) * 0.85);
        // Faz: taşıyıcı sabit, uydu -ZS/ZP oranında döner ve dişler güneşle geçer
        pl.g.rotation.z = pl.phi + Math.PI + (pl.phi - sunA) * (ZS / ZP) + Math.PI / ZP;
      }
      ring.rotation.z = -sunA * (ZS / ZR);
      ring.position.z = -(1 - as) * 0.9;
      carrier.position.z = -0.5 - (1 - as) * 1.6;
      planetPack.forEach((m, i) => (m.position.z = -0.95 - i * L(0.28, 0.075, as) - (1 - as) * 1.2));
      M.friction.emissiveIntensity = k.planet * (0.25 + 0.2 * Math.sin(t * 5)) + k.yag * 0.2;
      units.planet.rotation.x = Math.sin(t * 0.25) * 0.05;
    }

    // 2. Tork konvertörü: açılır, pompa döner; kilitlemede türbin aynı hıza gelir
    if (units.tork.visible) {
      const open = q.torkOpen;
      pump.position.z = open * 0.55;
      turbine.position.z = -open * 0.55;
      stator.position.z = 0;
      lockDisc.position.z = Tr + 0.18 + open * 0.55 - q.torkLock * 0.1;
      torkA += dt * (1.2 + spin * 1.4);
      const slip = L(0.55, 1, q.torkLock);
      turbA += dt * (1.2 + spin * 1.4) * slip;
      pump.rotation.z = torkA;
      turbine.rotation.z = turbA;
      lockDisc.rotation.z = turbA;
      stator.rotation.z = Math.sin(t * 0.8) * 0.05;
      M.frictionB.emissiveIntensity = q.torkLock * k.tork * 0.9;
    }

    // 3. Mekatronik: kanallar akar, solenoidler sırayla tıklar
    flowMat.uniforms.uTime.value = t;
    flowMat.uniforms.uOn.value = Math.max(k.meka * (0.35 + q.meka * 0.65), k.yag * 0.6);
    if (units.meka.visible) {
      solenoids.forEach(({ s: sol, tip }, i) => {
        const beat = Math.max(0, Math.sin(t * 3.2 - i * 0.9));
        const on = beat > 0.75 ? 1 : 0;
        tip.material.emissiveIntensity = 0.2 + on * 2.8 * k.meka;
        sol.position.y = 0.52 + on * 0.03 * k.meka;
      });
      led.material.emissiveIntensity = (Math.sin(t * 9) > 0 ? 3 : 0.3) * (1 - q.meka) + q.meka * 0.3;
      led.material.emissive.setHex(q.meka > 0.6 ? 0x42f5b0 : 0xff2e4d);
      units.meka.rotation.y = 0.25 + Math.sin(t * 0.3) * 0.06;
    }

    // 4. DSG: tek vitesler K1 (dış), çiftler K2 (iç)
    if (units.dsg.visible) {
      const e1 = q.dsgK1, e2 = 1 - q.dsgK1;
      const gap1 = L(0.13, 0.058, e1), gap2 = L(0.13, 0.058, e2);
      k1.forEach((m, i) => (m.position.z = 0.44 - i * gap1));
      k2.forEach((m, i) => (m.position.z = 0.44 - i * gap2));
      piston1.position.z = 0.44 - 9 * gap1 - 0.02;
      piston2.position.z = 0.44 - 9 * gap2 - 0.02;
      fricK1.emissiveIntensity = e1 * (0.5 + k.dsg * 0.8);
      fricK2.emissiveIntensity = e2 * (0.5 + k.dsg * 0.8);
      dsgA += dt * (1.5 + spin * 2);
      drumBack.rotation.z = dsgA;
      k1.forEach((m) => (m.rotation.z = dsgA * (e1 > 0.5 ? 1 : 0.6)));
      k2.forEach((m) => (m.rotation.z = dsgA * (e2 > 0.5 ? 1 : 0.6)));
      for (const g of dsgGears) g.gm.rotation.z = dsgA * (g.which === 'o' ? L(0.3, 1, e2) : L(0.3, 1, e1)) * (20 / g.n);
    }

    // 5. CVT: oran değişir, kayış tırmanır
    if (units.cvt.visible) {
      const r1 = L(0.5, 1.12, q.cvt);
      const r2 = solveR2(r1);
      const off = (r) => BW / 2 - (r - RH) * TANA + 0.005;
      pu1.a.position.z = off(r1); pu1.b.position.z = -off(r1);
      pu2.a.position.z = off(r2); pu2.b.position.z = -off(r2);
      cvtA += dt * (1.4 + spin * 1.6);
      pu1.g.rotation.z = cvtA;
      pu2.g.rotation.z = cvtA * (r1 / r2);
      beltS = (beltS + dt * (1.4 + spin * 1.6) * r1 / L0) % 1;
      for (let i = 0; i < nEl; i++) {
        beltPoint((i / nEl + beltS) % 1, r1, r2, bp);
        dummy.position.set(bp.x, bp.y, 0);
        dummy.rotation.set(0, 0, bp.z);
        dummy.updateMatrix();
        belt.setMatrixAt(i, dummy.matrix);
      }
      belt.instanceMatrix.needsUpdate = true;
    }

    // 6. Yağ parçacıkları
    const oOn = s.oil;
    oilMat.uniforms.uOn.value = oOn;
    oil.visible = oOn > 0.01;
    if (oil.visible) {
      oilS += dt * 0.012 * (1 + spin);
      const n = LUT.length - 1;
      for (let i = 0; i < nOil; i++) {
        const u = (oilSeed[i * 4] + oilS * oilSeed[i * 4 + 3]) % 1;
        const f = u * n, j = Math.floor(f), w = f - j;
        const A = LUT[j], B = LUT[(j + 1) % n];
        oilPos[i * 3] = L(A.x, B.x, w);
        oilPos[i * 3 + 1] = L(A.y, B.y, w) + oilSeed[i * 4 + 1] + Math.sin(t * 2 + i) * 0.03;
        oilPos[i * 3 + 2] = L(A.z, B.z, w) + oilSeed[i * 4 + 2];
      }
      oilGeo.attributes.position.needsUpdate = true;
    }

    scene.fog.near = s.fogNear ?? 9;
    scene.fog.far = s.fogFar ?? 26;
    scene.environmentIntensity = s.env ?? 0.55;
    rim.intensity = s.rim ?? 2.4;

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.9) {
      dpr = Math.max(0.9, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      oilMat.uniforms.uSize.value = 150 * dpr;
      resize();
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, update, resize,
    ratio: (q) => { const r1 = L(0.5, 1.12, q); return solveR2(r1) / r1; },
    compile: () => renderer.compile(scene, camera),
  };
}
