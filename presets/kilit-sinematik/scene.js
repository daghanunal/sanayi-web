// Kodla çizilmiş kesitli pim tamburlu kilit, anahtar, freze, transponder ve sustalı kumanda.
// Kilit ekseni x boyunca; anahtar +x tarafından girer. Sahne durumu dışarıdan `update(state)` ile verilir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;

// --- Ölçüler ---------------------------------------------------------------
export const PINS = [-1.2, -0.6, 0, 0.6, 1.2];
export const CUTS = [0.2, 0.05, 0.25, 0.1, 0.18]; // kesilmiş diş yükseklikleri (göbek içi y)
export const TIP_IN = -1.5; // anahtar tam girdiğinde uç x
export const TIP_OUT = 3.4; // kesim tezgâhındaki uç x
const BLADE_L = 3.15;
const KEY_BOTTOM = -0.3;
const BLANK_TOP = 0.32;
const SHEAR = 0.5;
const PLUG_R = 0.5;
const SHELL_R = 0.76;
const PLUG_LEN = 3.2;
const CH_TOP = 1.8;
const REST = -0.06;
const PIN_R = 0.085;
const DRIVER_L = 0.34;
const KEYPIN_L = CUTS.map((c) => SHEAR - c);

// Anahtar profili: uç rampası, her pimde düz taban, aralarda tepe.
const TIP = [[0, -0.12], [0.16, 0.3]];
function buildProfile() {
  const pts = [...TIP];
  PINS.forEach((x, i) => {
    const u = x - TIP_IN;
    if (i > 0) {
      const prev = PINS[i - 1] - TIP_IN;
      const peak = Math.min(BLANK_TOP - 0.01, Math.max(CUTS[i], CUTS[i - 1]) + 0.09);
      pts.push([(u + prev) / 2, peak]);
    }
    pts.push([u - 0.055, CUTS[i]], [u + 0.055, CUTS[i]]);
  });
  pts.push([PINS[4] - TIP_IN + 0.2, BLANK_TOP], [BLADE_L, BLANK_TOP]);
  return pts;
}
const PROFILE = buildProfile();
function interp(pts, u) {
  if (u <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (u <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return L(y0, y1, (u - x0) / (x1 - x0 || 1));
    }
  }
  return pts[pts.length - 1][1];
}
const cutTop = (u) => interp(PROFILE, u);
const blankTop = (u) => (u < TIP[1][0] ? interp(TIP, u) : BLANK_TOP);
// Kesim ilerlemesi c (0..1): freze uçtan omza ilerler
export function topAt(u, c) {
  const cu = c * (BLADE_L + 0.1);
  const k = clamp((cu - u) / 0.08);
  return L(blankTop(u), cutTop(u), k);
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

export function createScene(canvas, { lite = false, aa = !lite } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: aa, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xcfc4ff, 0x120c1c, 0.5));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.2);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9f8cff, 1.6);
  rim.position.set(-6, 2, -5);
  scene.add(rim);
  const sparkLight = new THREE.PointLight(0xffa640, 0, 3.5, 1.5);
  scene.add(sparkLight);
  const rfLight = new THREE.PointLight(0x9d8bff, 0, 4, 1.4);
  scene.add(rfLight);

  // --- Malzemeler -------------------------------------------------------------
  const M = {
    brass: new THREE.MeshStandardMaterial({ color: 0xe3ae52, metalness: 1, roughness: 0.28 }),
    brassDark: new THREE.MeshStandardMaterial({ color: 0xa87a33, metalness: 1, roughness: 0.4, side: THREE.DoubleSide }),
    nickel: new THREE.MeshStandardMaterial({ color: 0xd8d9de, metalness: 1, roughness: 0.22 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa0ab, metalness: 1, roughness: 0.35 }),
    spring: new THREE.MeshStandardMaterial({ color: 0xc4c8d0, metalness: 1, roughness: 0.3 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x1a1522, metalness: 0.1, roughness: 0.42, transparent: true }),
    fobShell: new THREE.MeshStandardMaterial({ color: 0x241d33, metalness: 0.15, roughness: 0.35 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x2a2433, roughness: 0.8 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x163f3a, roughness: 0.5, metalness: 0.2 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf0c060, metalness: 1, roughness: 0.25 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xd07a45, metalness: 1, roughness: 0.3, emissive: 0xff8a3a, emissiveIntensity: 0 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x2b2340, roughness: 0.3, emissive: 0x8f7bff, emissiveIntensity: 0 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xcfc6ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35 }),
    xray: new THREE.MeshBasicMaterial({ color: 0x8d7bff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }),
    edge: new THREE.LineBasicMaterial({ color: 0xa998ff, transparent: true, opacity: 0.55 }),
    shear: new THREE.MeshBasicMaterial({ color: 0xb9adff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    ring: new THREE.MeshBasicMaterial({ color: 0xa594ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    wheel: new THREE.MeshStandardMaterial({ color: 0xb8bcc6, metalness: 1, roughness: 0.25 }),
    vise: new THREE.MeshStandardMaterial({ color: 0x2c2638, metalness: 0.6, roughness: 0.45 }),
  };
  const all = new THREE.Group();
  scene.add(all);

  // --- Gövde (x-ışını) ----------------------------------------------------------
  const GAP = 1.9; // ön kesit açıklığı (radyan), kameraya bakar
  const cylX = (r, len, open = true) => {
    const g = new THREE.CylinderGeometry(r, r, len, 64, 1, open, GAP / 2, Math.PI * 2 - GAP);
    g.rotateZ(-Math.PI / 2);
    return g;
  };
  const housing = new THREE.Group();
  all.add(housing);
  const shellG = cylX(SHELL_R, PLUG_LEN + 0.2);
  housing.add(new THREE.Mesh(shellG, M.xray));
  const towerG = new THREE.BoxGeometry(PLUG_LEN + 0.2, CH_TOP - 0.45 + 0.1, 0.62);
  towerG.translate(0, (CH_TOP + 0.45) / 2 + 0.05, 0);
  housing.add(new THREE.Mesh(towerG, M.xray));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(towerG), M.edge);
  housing.add(edges);
  // Gövde halkaları ve bore çizgileri
  const lines = [];
  const ring = (x, r) => {
    for (let i = 0; i < 48; i++) {
      const a0 = GAP / 2 + ((Math.PI * 2 - GAP) * i) / 48, a1 = GAP / 2 + ((Math.PI * 2 - GAP) * (i + 1)) / 48;
      lines.push(x, -r * Math.sin(a0), r * Math.cos(a0), x, -r * Math.sin(a1), r * Math.cos(a1));
    }
  };
  [-(PLUG_LEN + 0.2) / 2, (PLUG_LEN + 0.2) / 2].forEach((x) => { ring(x, SHELL_R); });
  PINS.forEach((x) => {
    for (const s of [-1, 1]) lines.push(x + s * (PIN_R + 0.02), SHELL_R - 0.1, 0.31, x + s * (PIN_R + 0.02), CH_TOP, 0.31);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  housing.add(new THREE.LineSegments(lg, M.edge));

  // Kesme hattı ışığı
  const shearMesh = new THREE.Mesh(new THREE.PlaneGeometry(PLUG_LEN + 0.6, 0.022), M.shear);
  shearMesh.position.set(0, SHEAR, 0.32);
  housing.add(shearMesh);
  const shearGlow = new THREE.Mesh(new THREE.PlaneGeometry(PLUG_LEN + 1.2, 0.22), new THREE.MeshBasicMaterial({
    map: canvasTex(8, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(185,170,255,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }),
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  shearGlow.position.copy(shearMesh.position);
  housing.add(shearGlow);

  // Anten halkası (immobilizer bobini) kilit yüzünde
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 12, 64), M.copper);
  coil.rotation.y = Math.PI / 2;
  coil.position.x = PLUG_LEN / 2 + 0.16;
  all.add(coil);
  const faceG = new THREE.RingGeometry(0.2, SHELL_R, 64);
  const face = new THREE.Mesh(faceG, M.brassDark);
  face.rotation.y = Math.PI / 2;
  face.position.x = PLUG_LEN / 2 + 0.1;
  all.add(face);

  // --- Göbek (döner) ---------------------------------------------------------------
  const plug = new THREE.Group();
  all.add(plug);
  plug.add(new THREE.Mesh(cylX(PLUG_R, PLUG_LEN), M.brass));
  const inner = new THREE.Mesh(cylX(PLUG_R - 0.07, PLUG_LEN), M.brassDark);
  plug.add(inner);
  // Kesit yüzleri (göbek et kalınlığı)
  for (const a of [GAP / 2, -GAP / 2]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(PLUG_LEN, 0.07), M.brassDark);
    const rm = PLUG_R - 0.035;
    s.position.set(0, -rm * Math.sin(a), rm * Math.cos(a));
    s.rotation.x = a + Math.PI / 2;
    plug.add(s);
  }
  // Ön kapak halkası
  const cap = new THREE.Mesh(new THREE.RingGeometry(0.14, PLUG_R, 48), M.brass);
  cap.rotation.y = Math.PI / 2;
  cap.position.x = PLUG_LEN / 2 + 0.11;
  plug.add(cap);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.13), new THREE.MeshBasicMaterial({ color: 0x0b0710 }));
  slot.position.x = PLUG_LEN / 2 + 0.115;
  plug.add(slot);

  // Pimler: alt pim göbekle döner, üst pim ve yay gövdede kalır
  const keyPins = [], drivers = [], springs = [];
  const springGeo = (() => {
    const pts = [];
    const turns = 9;
    for (let i = 0; i <= turns * 24; i++) {
      const t = i / (turns * 24);
      const a = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.07, t, Math.sin(a) * 0.07));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.013, 5, false);
  })();
  PINS.forEach((x, i) => {
    const len = KEYPIN_L[i];
    const g = new THREE.CylinderGeometry(PIN_R, PIN_R, len - 0.06, 20);
    g.translate(0, (len - 0.06) / 2 + 0.06, 0);
    const tip = new THREE.CylinderGeometry(PIN_R, 0.02, 0.06, 20);
    tip.translate(0, 0.03, 0);
    const kp = new THREE.Group();
    kp.add(new THREE.Mesh(g, M.brass), new THREE.Mesh(tip, M.brass));
    kp.position.x = x;
    plug.add(kp);
    keyPins.push(kp);
    const dg = new THREE.CylinderGeometry(PIN_R, PIN_R, DRIVER_L, 20);
    dg.translate(0, DRIVER_L / 2, 0);
    const dr = new THREE.Mesh(dg, M.steel);
    dr.position.x = x;
    housing.add(dr);
    drivers.push(dr);
    const sp = new THREE.Mesh(springGeo, M.spring);
    sp.position.x = x;
    housing.add(sp);
    springs.push(sp);
  });

  // --- Anahtar -----------------------------------------------------------------------
  const N = 120;
  function bladeGeometry() {
    const sh = new THREE.Shape();
    sh.moveTo(0.1, KEY_BOTTOM);
    sh.lineTo(BLADE_L, KEY_BOTTOM);
    for (let i = N; i >= 0; i--) {
      const u = (BLADE_L * i) / N;
      sh.lineTo(u, cutTop(u));
    }
    sh.lineTo(0, -0.12);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -0.05);
    return g;
  }
  function makeBlade(mat) {
    const g = bladeGeometry();
    const pos = g.attributes.position;
    const top = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i), y = pos.getY(i);
      top[i] = y > KEY_BOTTOM + 0.01 && Math.abs(y - cutTop(u)) < 1e-4 ? 1 : 0;
    }
    const mesh = new THREE.Mesh(g, mat);
    let lastC = -1;
    mesh.userData.setCut = (c) => {
      if (Math.abs(c - lastC) < 0.002) return;
      lastC = c;
      for (let i = 0; i < pos.count; i++) if (top[i]) pos.setY(i, topAt(pos.getX(i), c));
      pos.needsUpdate = true;
      g.computeVertexNormals();
    };
    return mesh;
  }
  const keyG = new THREE.Group();
  plug.add(keyG);
  const blade = makeBlade(M.nickel);
  keyG.add(blade);
  // Oluk (bıçak üstünde frezeli kanal)
  const groove = new THREE.Mesh(new THREE.BoxGeometry(BLADE_L - 0.4, 0.07, 0.11), M.steel);
  groove.position.set(BLADE_L / 2 + 0.2, -0.17, 0);
  keyG.add(groove);
  const shoulder = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.86, 0.14, 2, 0.03), M.nickel);
  shoulder.position.set(BLADE_L + 0.05, 0.02, 0);
  keyG.add(shoulder);
  const headG = new RoundedBoxGeometry(1.05, 1.25, 0.26, 4, 0.12);
  const head = new THREE.Mesh(headG, M.plastic);
  head.position.set(BLADE_L + 0.6, 0.02, 0);
  keyG.add(head);
  const hole = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 32), M.nickel);
  hole.position.set(BLADE_L + 0.92, 0.02, 0);
  keyG.add(hole);
  // Transponder: cam kapsül + bobin
  const tp = new THREE.Group();
  tp.position.set(BLADE_L + 0.5, 0.05, 0);
  const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.34, 6, 16), M.glass);
  capsule.rotation.z = Math.PI / 2;
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), M.chip);
  chip.position.x = -0.1;
  const tcoil = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), M.copper);
  tcoil.rotation.z = Math.PI / 2;
  tcoil.position.x = 0.08;
  tp.add(capsule, chip, tcoil);
  tp.scale.setScalar(1.7);
  keyG.add(tp);

  // --- Kesim tezgâhı: freze + mengene + kıvılcım ------------------------------------------
  const bench = new THREE.Group();
  all.add(bench);
  const wheelShape = new THREE.Shape();
  const T = 40;
  for (let i = 0; i <= T * 2; i++) {
    const a = (i / (T * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.5 : 0.56;
    if (i === 0) wheelShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else wheelShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole2 = new THREE.Path();
  hole2.absarc(0, 0, 0.12, 0, Math.PI * 2, true);
  wheelShape.holes.push(hole2);
  const wheelG = new THREE.ExtrudeGeometry(wheelShape, { depth: 0.08, bevelEnabled: false });
  wheelG.translate(0, 0, -0.04);
  const wheel = new THREE.Mesh(wheelG, M.wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 24), M.vise);
  hub.rotation.x = Math.PI / 2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.6, 0.2), M.vise);
  arm.position.set(0, 0.95, -0.2);
  const wheelG2 = new THREE.Group();
  wheelG2.add(wheel, hub, arm);
  bench.add(wheelG2);
  const bed = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.18, 1.2, 2, 0.05), M.vise);
  bench.add(bed);

  // Kıvılcım
  const SP = lite ? 90 : 180;
  const spPos = new Float32Array(SP * 3), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spMat = new THREE.PointsMaterial({
    size: 0.06, color: 0xffb455, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    map: canvasTex(32, 32, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.35, 'rgba(255,180,80,0.9)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }),
  });
  const sparks = new THREE.Points(spGeo, spMat);
  sparks.frustumCulled = false;
  all.add(sparks);
  for (let i = 0; i < SP; i++) spPos[i * 3 + 1] = -99;
  let spNext = 0;

  // --- RF halkaları ---------------------------------------------------------------------
  const rings = [];
  const ringG = new THREE.RingGeometry(0.58, 0.62, 64);
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(ringG, M.ring.clone());
    r.rotation.y = Math.PI / 2;
    all.add(r);
    rings.push(r);
  }

  // --- Sustalı kumanda ------------------------------------------------------------------
  const fob = new THREE.Group();
  fob.position.set(-5.6, 0.2, 0.2);
  all.add(fob);
  const shellTop = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.9, 0.18, 4, 0.08), M.fobShell);
  const shellBot = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.9, 0.18, 4, 0.08), M.fobShell);
  const pcb = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.55, 0.04), M.pcb);
  pcb.add(board);
  const ic = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.05), M.chip);
  ic.position.set(0.1, 0.25, 0.04);
  pcb.add(ic);
  for (let i = 0; i < 3; i++) {
    const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), M.gold);
    sw.rotation.x = Math.PI / 2;
    sw.position.set(-0.2 + i * 0.2, -0.3, 0.04);
    pcb.add(sw);
  }
  const ant = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 40), M.gold);
  ant.position.set(0, 0.55, 0.03);
  pcb.add(ant);
  const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40), M.nickel);
  battery.rotation.x = Math.PI / 2;
  const btns = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.24, 0.08, 3, 0.05), M.rubber);
    b.position.set(-0.26 + i * 0.26, -0.3, 0);
    btns.add(b);
  }
  const fobBlade = makeBlade(M.nickel);
  fobBlade.userData.setCut(1);
  const fobBladeG = new THREE.Group(); // menteşe
  fobBlade.scale.setScalar(0.5);
  fobBlade.rotation.z = Math.PI / 2; // uç yukarı
  fobBlade.position.set(0.1, -0.1, 0);
  fobBladeG.add(fobBlade);
  fobBladeG.position.set(0.25, 0.9, 0);
  fob.add(shellTop, shellBot, pcb, battery, btns, fobBladeG);
  const arcs = [];
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(0.5 + i * 0.28, 0.018, 6, 40, Math.PI * 0.55), M.ring.clone());
    a.rotation.z = Math.PI / 2 - Math.PI * 0.275;
    a.position.set(0, 1.05, 0);
    fob.add(a);
    arcs.push(a);
  }

  // --- Durum --------------------------------------------------------------------
  const size = { w: 1, h: 1 };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    size.w = w; size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const tmp = new THREE.Vector3();
  let lastNow = performance.now();
  let slow = 0;
  function pinBottom(x, tipX, c, inPlug) {
    if (!inPlug) return REST;
    const u = x - tipX;
    if (u < 0 || u > BLADE_L) return REST;
    return Math.max(REST, topAt(u, c));
  }

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const time = now / 1000;

    camera.position.copy(s.pos);
    camera.lookAt(s.look);
    if (Math.abs(camera.fov - s.fov) > 0.01) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    if (s.shift) camera.setViewOffset(size.w, size.h, 0, size.h * s.shift, size.w, size.h);
    else camera.clearViewOffset();

    // Anahtar ve kesim
    blade.userData.setCut(s.cut);
    keyG.position.set(s.tipX, 0, 0);
    plug.rotation.x = s.turn;
    const inPlug = s.tipX < PLUG_LEN / 2 + 0.3;
    PINS.forEach((x, i) => {
      const b = pinBottom(x, s.tipX, s.cut, inPlug);
      keyPins[i].position.y = b;
      const dTop = b + KEYPIN_L[i];
      // Göbek dönünce üst pim kesme hattında kalır
      const dy = Math.max(SHEAR, dTop);
      drivers[i].position.y = dy;
      const sb = dy + DRIVER_L;
      springs[i].position.y = sb;
      springs[i].scale.y = Math.max(0.05, CH_TOP - sb);
    });
    shearMesh.material.opacity = s.shear;
    shearGlow.material.opacity = s.shear * 0.55;

    // Tezgâh
    bench.visible = s.bench > 0.01;
    if (bench.visible) {
      const cu = s.cut * (BLADE_L + 0.1);
      const top = topAt(clamp(cu, 0, BLADE_L), s.cut);
      wheelG2.position.set(TIP_OUT + clamp(cu, 0.1, BLADE_L), top + 0.54 + (1 - s.bench) * 1.5, 0);
      wheel.rotation.z -= dt * (s.cutting ? 38 : 4);
      bed.position.set(TIP_OUT + 1.8, -0.72 - (1 - s.bench) * 0.8, 0);
      if (s.cutting) {
        const n = lite ? 2 : 4;
        for (let k = 0; k < n; k++) {
          const i = spNext++ % SP;
          spPos[i * 3] = wheelG2.position.x + 0.05; spPos[i * 3 + 1] = top; spPos[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
          spVel[i * 3] = 1.5 + Math.random() * 3.5; spVel[i * 3 + 1] = Math.random() * 2.6 - 0.4; spVel[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
          spLife[i] = 0.35 + Math.random() * 0.5;
        }
      }
      sparkLight.position.set(wheelG2.position.x, top + 0.1, 0.3);
      sparkLight.intensity = s.cutting ? 3 + Math.random() * 2 : 0;
    } else sparkLight.intensity = 0;
    let alive = false;
    for (let i = 0; i < SP; i++) {
      if (spLife[i] <= 0) continue;
      alive = true;
      spLife[i] -= dt;
      spVel[i * 3 + 1] -= 9 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
      if (spLife[i] <= 0) spPos[i * 3 + 1] = -99;
    }
    sparks.visible = alive;
    if (alive) spGeo.attributes.position.needsUpdate = true;

    // Transponder
    M.plastic.opacity = L(1, 0.32, s.xray);
    M.plastic.color.setRGB(L(0.1, 0.35, s.xray), L(0.08, 0.3, s.xray), L(0.13, 0.6, s.xray));
    M.plastic.depthWrite = s.xray < 0.5;
    M.chip.emissiveIntensity = s.xray * 0.6 + s.rf * (2 + Math.sin(time * 12) * 0.8);
    M.copper.emissiveIntensity = s.rf * 0.35;
    head.getWorldPosition(tmp);
    rfLight.position.copy(tmp).add(new THREE.Vector3(0, 0.4, 0.4));
    rfLight.intensity = s.rf * 2.5;
    rings.forEach((r, i) => {
      const t = (time * 0.7 + i / rings.length) % 1;
      r.visible = s.rf > 0.01;
      r.position.set(coil.position.x + t * 1.6, 0, 0);
      r.scale.setScalar(1 + t * 0.9);
      r.material.opacity = s.rf * (1 - t) * 0.7;
    });

    // Kumanda
    fob.visible = s.fob > 0.001;
    if (fob.visible) {
      fob.scale.setScalar(Math.max(0.001, s.fob));
      const e = s.explode;
      fob.rotation.set(L(-0.25, -0.35, e) + Math.sin(time * 0.5) * 0.04, L(0.35, 0.75, e) + Math.sin(time * 0.3) * 0.08, L(0.15, 0.08, e));
      shellBot.position.z = -0.1 - e * 0.55;
      battery.position.z = 0.0 - e * 0.25;
      battery.position.y = 0.25;
      pcb.position.z = 0.02 + e * 0.15;
      shellTop.position.z = 0.1 + e * 0.75;
      btns.position.z = 0.22 + e * 1.0;
      fobBladeG.rotation.z = L(-Math.PI * 0.5, 0, s.flip);
      fobBladeG.position.z = e * 0.2;
      btns.children[0].position.z = s.press * -0.04;
      arcs.forEach((a, i) => {
        const t = (time * 1.4 + i / 3) % 1;
        a.material.opacity = s.press * (1 - t) * 0.9;
        a.scale.setScalar(1 + t * 0.6);
        a.visible = s.press > 0.01;
      });
    }

    scene.environmentIntensity = s.env ?? 0.85;
    const t0 = performance.now();
    renderer.render(scene, camera);
    // Zayıf cihazda çözünürlüğü düşür
    const cost = performance.now() - t0;
    slow = slow * 0.95 + (cost > 14 ? 1 : 0) * 0.05;
    if (slow > 0.6 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      resize();
      slow = 0;
    }
  }

  function compile() {
    renderer.compile(scene, camera);
  }
  return { update, resize, compile, renderer };
}
