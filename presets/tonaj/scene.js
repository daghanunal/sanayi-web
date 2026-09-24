// Kodla çizilmiş 6x4 çekici: öne yatan kabin, şasi, motor → şanzıman → şaft → çift diferansiyel,
// havalı fren hatları, körükler, AdBlue/SCR, beşinci teker. Gece yolu, farlar ve dörtlüler.
// Sahne durumu dışarıdan `update(state)` ile verilir; kamera ve vurgular main.js'te kurgulanır.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Ölçüler (metre). Araç x ekseni boyunca, ön +x yönünde; zemin y = 0.
export const AKS = { on: 2.3, arka1: -1.45, arka2: -2.8 };
const WHEEL_R = 0.52;
const CAB = { x0: 1.55, x1: 3.4, y0: 1.05, h: 2.85, w: 2.45 };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Kırmızı-beyaz reflektif çapraz şerit (arka ikaz levhası)
function chevronTex() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#f4f2ec';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d3202f';
    for (let x = -h; x < w + h; x += 48) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 24, h);
      g.lineTo(x + 24 + h, 0);
      g.lineTo(x + h, 0);
      g.fill();
    }
  });
}

export function createScene(canvas, { lite = false, name = '' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  scene.fog = new THREE.Fog(0x080b10, 16, 46);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 120);
  scene.add(camera);
  // Sürünge lambası: kamera altına girince ustanın el feneri gibi yanar
  const workLamp = new THREE.PointLight(0xffe0b0, 0, 6, 1.6);
  workLamp.position.set(0, -0.15, 0.2);
  camera.add(workLamp);

  scene.add(new THREE.HemisphereLight(0x6f82ad, 0x0a0b0f, 0.55));
  const moon = new THREE.DirectionalLight(0xa9bcff, 0.9);
  moon.position.set(-6, 10, -5);
  scene.add(moon);
  const key = new THREE.DirectionalLight(0xffe7cc, 1.25);
  key.position.set(9, 6, 8);
  scene.add(key);
  const under = new THREE.PointLight(0xfff2dd, 0, 9, 1.4); // altta atölye ışığı
  under.position.set(0, 0.25, 0);
  scene.add(under);

  // --- Malzemeler -----------------------------------------------------------
  const M = {
    paint: new THREE.MeshStandardMaterial({ color: 0xf1f0eb, roughness: 0.26, metalness: 0.05 }),
    glass: null, sideGlass: null,
    seam: new THREE.MeshStandardMaterial({ color: 0x9a9993, roughness: 0.6 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.55, metalness: 0.45 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x80868d, roughness: 0.34, metalness: 0.9 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe1e5e8, roughness: 0.1, metalness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.22, metalness: 1 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 0.92, metalness: 0 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xb4b9bf, roughness: 0.32, metalness: 0.85 }),
    grille: new THREE.MeshStandardMaterial({ color: 0x0f1114, roughness: 0.5, metalness: 0.6 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc41a2b, roughness: 0.4, metalness: 0.1 }),
    chevron: new THREE.MeshStandardMaterial({ map: chevronTex(), roughness: 0.35, metalness: 0 }),
    head: new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0xfff3dc, emissiveIntensity: 0, roughness: 0.1 }),
    amber: new THREE.MeshStandardMaterial({ color: 0x5a3208, emissive: 0xff8a14, emissiveIntensity: 0, roughness: 0.2 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x3a0a0e, emissive: 0xff1e2a, emissiveIntensity: 0.6, roughness: 0.2 }),
  };
  M.chevron.map.wrapS = THREE.RepeatWrapping;
  // Cam: koyu füme, yukarıdan aşağı degrade ve çapraz yansıma şeritleri; ortamı kendi envMap'iyle yansıtır
  const envTex = scene.environment;
  const glassTex = (interior) => canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#4a5668');
    gr.addColorStop(0.35, '#1d242e');
    gr.addColorStop(1, '#0c0f14');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    if (interior) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(w * 0.12, h * 0.42, w * 0.34, h * 0.6); // koltuk sırtı
      g.fillRect(w * 0.08, h * 0.3, w * 0.22, h * 0.14); // koltuk başlığı
      g.beginPath(); g.arc(w * 0.82, h * 0.72, w * 0.2, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke(); // direksiyon
    }
    g.fillStyle = 'rgba(255,255,255,.14)';
    g.beginPath(); g.moveTo(w * 0.55, 0); g.lineTo(w * 0.72, 0); g.lineTo(w * 0.32, h); g.lineTo(w * 0.15, h); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.moveTo(w * 0.8, 0); g.lineTo(w * 0.86, 0); g.lineTo(w * 0.5, h); g.lineTo(w * 0.44, h); g.fill();
  });
  const mkGlass = (interior) => new THREE.MeshPhysicalMaterial({
    map: glassTex(interior), roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03,
    envMap: envTex, envMapIntensity: 1.6, emissive: 0x6a7c96, emissiveIntensity: 0.05,
  });
  M.glass = mkGlass(false);
  M.sideGlass = mkGlass(true);
  // Metaller nötr çelik: ortam yansıması kendi envMap'leriyle, sahne ışığı soğuk kalmasın
  for (const k of ['metal', 'chrome', 'alu', 'rim']) {
    M[k].envMap = envTex;
    M[k].envMapIntensity = 0.9;
  }

  // Vurgulanabilir parça grupları: her grubun kendi malzeme kopyası olur
  const HL = new THREE.Color(0xff3b30);
  const groups = { motor: [], sanziman: [], diferansiyel: [], fren: [], adblue: [], korug: [] };
  const matGroup = new Map();
  const own = (id, base) => {
    const m = base.clone();
    groups[id].push(m);
    matGroup.set(m, id);
    return m;
  };
  const edgeMats = Object.fromEntries(Object.keys(groups).map((id) => [id, new THREE.LineBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0, depthTest: false })]));
  const edgeLines = Object.fromEntries(Object.keys(groups).map((id) => [id, []]));

  const truck = new THREE.Group();
  scene.add(truck);
  const body = new THREE.Group(); // körüklerle yükselen kısım
  truck.add(body);
  const axles = new THREE.Group();
  truck.add(axles);

  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cylX = (r0, r1, len, seg = 20) => new THREE.CylinderGeometry(r0, r1, len, seg).rotateZ(Math.PI / 2); // eksen x (r0 -x ucu)
  const cylZ = (r, len, seg = 20) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
  const seg = lite ? 18 : 28;

  // --- Şasi ---------------------------------------------------------------
  for (const z of [-0.43, 0.43]) add(body, box(6.95, 0.28, 0.08), M.frame, -0.25, 0.98, z);
  for (const x of [2.9, 1.2, 0.1, -1.0, -2.1, -3.45]) add(body, box(0.1, 0.2, 0.8), M.frame, x, 0.98, 0);
  // Arka ikaz levhası ve stoplar
  add(body, box(0.06, 0.2, 2.3), M.chevron, -3.66, 0.8, 0);
  for (const z of [-0.95, 0.95]) add(body, box(0.05, 0.14, 0.34), M.tail, -3.7, 1.02, z);
  // Çamurluklar
  for (const z of [-0.95, 0.95]) {
    add(body, box(2.3, 0.04, 0.72), M.frame, -2.12, 1.2, z);
    add(body, box(0.04, 0.3, 0.72), M.chevron, -3.28, 1.05, z);
  }

  // --- Motor, şanzıman, şaft --------------------------------------------------
  const mMotor = own('motor', M.metal);
  const motor = new THREE.Group();
  motor.position.set(2.4, 1.05, 0);
  body.add(motor);
  add(motor, new RoundedBoxGeometry(1.15, 0.72, 0.72, 2, 0.06), mMotor, 0, 0, 0);
  add(motor, box(1.05, 0.14, 0.5), own('motor', M.red), 0, 0.43, 0); // külbütör kapağı
  add(motor, new THREE.SphereGeometry(0.17, 16, 12), own('motor', M.alu), -0.25, 0.25, 0.46); // turbo
  add(motor, cylX(0.2, 0.2, 0.12, seg), mMotor, 0.62, -0.05, 0); // kasnak
  add(motor, box(0.9, 0.2, 0.66), own('motor', M.frame), 0, -0.45, 0); // karter

  const mGear = own('sanziman', M.alu);
  add(body, cylX(0.19, 0.28, 0.85, seg), mGear, 1.4, 0.88, 0);
  add(body, cylX(0.3, 0.3, 0.1, seg), mGear, 1.82, 0.88, 0);

  const mProp = own('diferansiyel', M.metal);
  const props = [];
  const makeProp = (x0, x1, y0, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.Group();
    g.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    g.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    body.add(g);
    const spin = new THREE.Group();
    g.add(spin);
    add(spin, new THREE.CylinderGeometry(0.055, 0.055, len, 14).rotateZ(Math.PI / 2), mProp, 0, 0, 0);
    // Flanşlar ve kanatlar: dönüş görünsün
    for (const s of [-1, 1]) {
      add(spin, cylX(0.1, 0.1, 0.05, 14), own('diferansiyel', M.frame), (s * len) / 2, 0, 0);
      add(spin, box(0.08, 0.2, 0.04), own('diferansiyel', M.chrome), (s * (len / 2 - 0.08)), 0, 0);
    }
    add(spin, box(0.3, 0.02, 0.14), own('diferansiyel', M.red), 0, 0.06, 0);
    props.push(spin);
  };
  makeProp(0.97, AKS.arka1 + 0.3, 0.86, 0.56);
  makeProp(AKS.arka1 - 0.3, AKS.arka2 + 0.3, 0.56, 0.56);

  // --- Tanklar ---------------------------------------------------------------
  add(body, cylX(0.33, 0.33, 1.3, seg), M.alu, 0.75, 0.78, 0.9);
  for (const x of [0.3, 1.2]) add(body, new THREE.TorusGeometry(0.335, 0.02, 6, seg).rotateY(Math.PI / 2), M.frame, x, 0.78, 0.9);
  const mAd = own('adblue', M.paint);
  add(body, cylX(0.2, 0.2, 0.55, seg), mAd, 1.12, 0.78, -0.9);
  add(body, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), own('adblue', new THREE.MeshStandardMaterial({ color: 0x1f5fd6, roughness: 0.4 })), 1.12, 1.0, -0.9);
  add(body, new RoundedBoxGeometry(0.95, 0.52, 0.56, 2, 0.05), own('adblue', M.alu), 0.25, 0.8, -0.9); // SCR
  add(body, box(0.5, 0.42, 0.5), M.frame, -0.45, 0.82, 0.9); // akü kutusu
  // Egzoz bacası
  add(body, new THREE.CylinderGeometry(0.075, 0.075, 2.5, 16), M.chrome, 1.42, 2.35, -1.02);

  // Hava tankları (fren)
  const mTank = own('fren', M.frame);
  const tanks = [V(-0.55, 0.72, 0.66), V(-0.55, 0.72, -0.66), V(-1.9, 0.78, 0.0)];
  for (const p of tanks) add(body, cylX(0.12, 0.12, 0.8, 16), mTank, p.x, p.y, p.z);

  // Beşinci teker
  add(body, new THREE.CylinderGeometry(0.52, 0.52, 0.07, seg), M.frame, -2.15, 1.18, 0);
  add(body, box(0.5, 0.075, 0.18), M.metal, -2.45, 1.19, 0);

  // --- Kabin (öne yatar) ----------------------------------------------------
  const cabPivot = new THREE.Group();
  cabPivot.position.set(CAB.x1, CAB.y0, 0);
  body.add(cabPivot);
  const cab = new THREE.Group();
  cab.position.set(-(CAB.x1 - CAB.x0) / 2, CAB.h / 2, 0);
  cabPivot.add(cab);
  const cw = CAB.x1 - CAB.x0;
  // Kabin gövdesi: yan profil çıkarılıp yuvarlatılır (eğik ön cam, pahlı köşeler)
  const hw = cw / 2, hh = CAB.h / 2, R = 0.14;
  const prof = new THREE.Shape();
  prof.moveTo(-hw, -hh);
  prof.lineTo(hw - 0.02, -hh);
  prof.quadraticCurveTo(hw + 0.04, -hh, hw + 0.04, -hh + 0.1);
  prof.lineTo(hw + 0.02, 0.12);
  prof.lineTo(hw - 0.16, hh - 0.2); // eğik ön cam
  prof.quadraticCurveTo(hw - 0.2, hh, hw - 0.4, hh);
  prof.lineTo(-hw + R, hh);
  prof.quadraticCurveTo(-hw, hh, -hw, hh - R);
  prof.lineTo(-hw, -hh);
  const bev = 0.1;
  const shell = new THREE.ExtrudeGeometry(prof, { depth: CAB.w - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.6, bevelSegments: lite ? 2 : 4, curveSegments: 8 });
  shell.translate(0, 0, -(CAB.w - bev * 2) / 2);
  add(cab, shell, M.paint, 0, 0, 0);

  // Ön cam: eğik yüzeye oturur; A direkleri ve silecekler
  const wsA = V(hw + 0.02, 0.12, 0), wsB = V(hw - 0.16, hh - 0.2, 0);
  const wsLen = wsA.distanceTo(wsB);
  const wsAng = Math.atan2(wsB.y - wsA.y, wsB.x - wsA.x) - Math.PI / 2;
  const ws = new THREE.Group();
  ws.position.set((wsA.x + wsB.x) / 2 + bev * 0.62, (wsA.y + wsB.y) / 2, 0);
  ws.rotation.z = wsAng;
  cab.add(ws);
  add(ws, box(0.03, wsLen - 0.08, CAB.w - 0.34), M.glass, 0, 0, 0);
  for (const sd of [-1, 1]) add(ws, box(0.05, wsLen, 0.12), M.frame, 0.005, 0, sd * (CAB.w / 2 - 0.12)); // A direkleri
  add(ws, box(0.05, 0.06, CAB.w - 0.3), M.frame, 0.005, -wsLen / 2 + 0.03, 0);
  for (const sd of [-0.45, 0.45]) {
    const wp = add(ws, box(0.025, 0.035, 0.85), M.frame, 0.03, -wsLen / 2 + 0.16, sd);
    wp.rotation.x = sd > 0 ? 0.5 : -0.5;
  }
  // Yan camlar (içi hafifçe görünür) ve kapı hattı
  for (const sd of [-1, 1]) {
    const z = sd * (CAB.w / 2 + 0.002);
    add(cab, box(0.82, 0.8, 0.02), M.sideGlass, 0.32, 0.62, z);
    add(cab, box(0.86, 0.05, 0.024), M.frame, 0.32, 0.2, z); // cam alt çıtası
    add(cab, box(0.02, 2.05, 0.022), M.seam, 0.76, -0.08, z); // kapı arka hattı
    add(cab, box(0.02, 1.3, 0.022), M.seam, -0.12, -0.45, z);
    add(cab, box(0.16, 0.035, 0.03), M.chrome, -0.02, 0.05, z * 1.004); // kapı kolu
    // Yan rüzgârlık (kabin arkasında, kasaya doğru)
    const def = add(cab, box(0.42, CAB.h * 0.72, 0.03), M.paint, -hw - 0.12, 0.12, sd * (CAB.w / 2 - 0.04));
    def.rotation.y = sd * 0.18;
  }
  // Tavan rüzgârlığı
  const roof = new THREE.Shape();
  roof.moveTo(hw - 0.45, 0);
  roof.quadraticCurveTo(-0.1, 0.62, -hw + 0.05, 0.64);
  roof.lineTo(-hw + 0.05, 0);
  roof.lineTo(hw - 0.45, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roof, { depth: CAB.w - 0.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 10 });
  roofGeo.translate(0, 0, -(CAB.w - 0.5) / 2);
  add(cab, roofGeo, M.paint, 0, hh, 0);
  // Tavan lambaları
  for (let i = -2; i <= 2; i++) add(cab, box(0.06, 0.05, 0.1), M.amber, hw - 0.38, hh + 0.08, i * 0.28);
  // Izgara: çerçeve ve yatay çıtalar, altında logo yuvası
  add(cab, new RoundedBoxGeometry(0.06, 0.95, 1.75, 2, 0.03), M.grille, hw + 0.08, -0.62, 0);
  for (let i = 0; i < 7; i++) add(cab, box(0.04, 0.05, 1.62), i % 2 ? M.frame : M.chrome, hw + 0.115, -1.0 + i * 0.13, 0);
  add(cab, box(0.03, 0.12, 0.5), M.chrome, hw + 0.12, -0.08, 0);
  // Güneşlik: üzerinde işletme adı yazar
  const visorCanvas = document.createElement('canvas');
  visorCanvas.width = 1024;
  visorCanvas.height = 128;
  const visorTex = new THREE.CanvasTexture(visorCanvas);
  visorTex.colorSpace = THREE.SRGBColorSpace;
  visorTex.anisotropy = 4;
  const visorMat = new THREE.MeshStandardMaterial({ map: visorTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: visorTex, emissiveIntensity: 0.25 });
  const visor = add(cab, box(0.03, 0.26, 2.3), [visorMat, M.paint, M.paint, M.paint, M.paint, M.paint], cw / 2 + 0.06, 1.34, 0);
  visor.rotation.z = -0.35;
  function drawName(text) {
    const g = visorCanvas.getContext('2d');
    g.fillStyle = '#16181c';
    g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#f4f2ec';
    const label = (text || '').toLocaleUpperCase('tr');
    let size = 84;
    g.font = `${size}px 'Alfa Slab One', Georgia, serif`;
    while (g.measureText(label).width > 960 && size > 30) g.font = `${(size -= 4)}px 'Alfa Slab One', Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 512, 70);
    visorTex.needsUpdate = true;
  }
  drawName(name);
  // Aynalar: kol üzerinde, ana ayna ve geniş açı
  for (const s of [-1, 1]) {
    const arm = add(cab, box(0.05, 0.05, 0.42), M.frame, hw - 0.12, 1.02, s * (CAB.w / 2 + 0.2));
    arm.rotation.x = s * -0.3;
    add(cab, box(0.05, 0.05, 0.3), M.frame, hw - 0.12, 0.32, s * (CAB.w / 2 + 0.16));
    add(cab, new RoundedBoxGeometry(0.1, 0.62, 0.25, 2, 0.03), M.frame, hw - 0.1, 0.66, s * (CAB.w / 2 + 0.42));
    add(cab, box(0.02, 0.56, 0.2), M.chrome, hw - 0.16, 0.66, s * (CAB.w / 2 + 0.42));
    add(cab, new RoundedBoxGeometry(0.08, 0.26, 0.2, 2, 0.03), M.frame, hw - 0.08, 1.2, s * (CAB.w / 2 + 0.34));
  }
  // Dörtlüler (kabin yanı)
  const amberMeshes = [];
  for (const s of [-1, 1]) amberMeshes.push(add(cab, box(0.16, 0.08, 0.03), M.amber, cw / 2 - 0.3, -0.95, s * (CAB.w / 2 + 0.01)));
  // Kabin altı reflektif şerit
  for (const s of [-1, 1]) add(cab, box(cw - 0.3, 0.06, 0.02), M.chevron, 0, -1.28, s * (CAB.w / 2 + 0.006));
  // Basamaklar: kabin altında merdiven, tutamak
  for (const s of [-1, 1]) {
    for (const y of [0.32, 0.62]) add(body, box(0.5, 0.045, 0.26), M.metal, 2.62, y, s * 1.06);
    add(body, box(0.04, 0.5, 0.2), M.frame, 2.36, 0.48, s * 1.06);
    add(body, box(0.04, 0.5, 0.2), M.frame, 2.88, 0.48, s * 1.06);
    add(cab, box(0.03, 0.9, 0.03), M.chrome, 0.72, -0.35, s * (CAB.w / 2 + 0.05));
  }

  // Tampon, farlar
  add(body, new RoundedBoxGeometry(0.3, 0.42, 2.5, 2, 0.05), M.frame, 3.36, 0.93, 0);
  const headMeshes = [];
  for (const s of [-1, 1]) {
    headMeshes.push(add(body, box(0.04, 0.16, 0.42), M.head, 3.52, 0.98, s * 0.85));
    amberMeshes.push(add(body, box(0.04, 0.1, 0.14), M.amber, 3.52, 0.98, s * 1.16));
  }
  for (const z of [-0.95, 0.95]) amberMeshes.push(add(body, box(0.04, 0.1, 0.14), M.amber, -3.71, 1.02, z * 1.17));

  // --- Akslar, tekerler ------------------------------------------------------
  // Lastik kesiti: iç çap 0.33, dış 0.52, yuvarlatılmış omuzlar
  const tw = 0.15;
  const tp = [new THREE.Vector2(0.33, -tw)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    tp.push(new THREE.Vector2(WHEEL_R - 0.05 + Math.cos(a) * 0.05, -tw + 0.05 + Math.sin(a) * 0.05));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    tp.push(new THREE.Vector2(WHEEL_R - 0.05 + Math.cos(a) * 0.05, tw - 0.05 + Math.sin(a) * 0.05));
  }
  tp.push(new THREE.Vector2(0.33, tw));
  const tyreGeo = new THREE.LatheGeometry(tp, lite ? 28 : 44).rotateX(Math.PI / 2);
  const rimGeo = cylZ(0.34, 0.26, lite ? 20 : 28);
  const hubGeo = cylZ(0.13, 0.1, 16);
  const nutGeo = cylZ(0.022, 0.05, 6);
  const wheels = [];
  function wheel(x, z, side, twin) {
    const g = new THREE.Group();
    g.position.set(x, WHEEL_R, z);
    axles.add(g);
    add(g, tyreGeo, M.rubber, 0, 0, 0);
    add(g, rimGeo, M.rim, 0, 0, 0);
    add(g, hubGeo, M.chrome, 0, 0, side * 0.1);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      add(g, nutGeo, M.chrome, Math.cos(a) * 0.19, Math.sin(a) * 0.19, side * 0.12);
    }
    if (twin) {
      add(g, tyreGeo, M.rubber, 0, 0, -side * 0.34);
      add(g, rimGeo, M.rim, 0, 0, -side * 0.34);
    }
    wheels.push(g);
    return g;
  }
  for (const s of [-1, 1]) wheel(AKS.on, s * 1.03, s, false);
  for (const ax of [AKS.arka1, AKS.arka2]) for (const s of [-1, 1]) wheel(ax, s * 1.1, s, true);

  add(axles, box(0.14, 0.14, 2.0), M.frame, AKS.on, WHEEL_R, 0);
  const mDiff = own('diferansiyel', M.metal);
  for (const ax of [AKS.arka1, AKS.arka2]) {
    add(axles, cylZ(0.09, 2.0, 14), mDiff, ax, WHEEL_R, 0);
    const d = add(axles, new THREE.SphereGeometry(0.27, 20, 14), mDiff, ax, WHEEL_R, 0);
    d.scale.set(1, 1, 0.8);
    add(axles, cylX(0.12, 0.08, 0.26, 14), mDiff, ax + 0.26, WHEEL_R + 0.02, 0);
  }

  // Körükler (havalı süspansiyon)
  const bellowProfile = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    bellowProfile.push(new THREE.Vector2(0.13 + Math.abs(Math.sin(t * Math.PI * 3)) * 0.035, t * 0.32));
  }
  const bellowGeo = new THREE.LatheGeometry(bellowProfile, 18);
  const mBellow = own('korug', M.rubber);
  const bellows = [];
  for (const ax of [AKS.arka1, AKS.arka2]) {
    for (const s of [-1, 1]) {
      const b = add(axles, bellowGeo, mBellow, ax - 0.52, 0.52, s * 0.47);
      bellows.push(b);
      add(axles, box(0.95, 0.07, 0.12), own('korug', M.frame), ax - 0.2, 0.5, s * 0.47);
    }
  }

  // Fren körükleri ve hava hatları
  const chambers = [];
  const cGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 14).rotateX(Math.PI / 2);
  const mCham = own('fren', M.frame);
  for (const w of wheels) {
    const side = Math.sign(w.position.z);
    const p = V(w.position.x + 0.22, WHEEL_R + 0.12, side * 0.6);
    add(axles, cGeo, mCham, p.x, p.y, p.z);
    chambers.push(p);
  }
  const pulseMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uPulse;
      void main(){
        float w = fract(vUv.x * 3.0 - uTime * 0.9);
        float p = smoothstep(0.0, 0.08, w) * smoothstep(0.3, 0.08, w);
        vec3 base = vec3(0.45, 0.05, 0.07);
        vec3 col = base + vec3(1.0, 0.85, 0.8) * p * uPulse * 1.6 + vec3(0.6,0.08,0.1) * uPulse * 0.4;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const lines = new THREE.Group();
  truck.add(lines);
  for (const c of chambers) {
    const t = c.x > 0 ? tanks[1] : c.x > -2 ? tanks[0] : tanks[2];
    const pts = [
      V(t.x, t.y + 0.1, t.z * 0.9),
      V((t.x + c.x) / 2, 0.9, c.z * 0.75),
      V(c.x, c.y + 0.2, c.z * 0.95),
      c.clone(),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    add(lines, new THREE.TubeGeometry(curve, 24, 0.018, 6), pulseMat, 0, 0, 0);
  }

  // Vurgu çizgileri: grubun her parçasına kenar çizgisi (yalnızca vurgulanınca çizilir)
  truck.updateMatrixWorld(true);
  truck.traverse((o) => {
    if (!o.isMesh || !matGroup.has(o.material)) return;
    const id = matGroup.get(o.material);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), edgeMats[id]);
    l.renderOrder = 5;
    l.visible = false;
    o.add(l);
    edgeLines[id].push(l);
  });

  // --- Zemin, yol, ışık konileri, üçgen --------------------------------------
  const asphalt = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#16181b';
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() * 26) | 0;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n + 2;
    }
    g.putImageData(img, 0, 0);
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(16, 16);
  const ground = add(scene, new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.85, metalness: 0.05 }), 0, 0, 0, -Math.PI / 2);
  ground.renderOrder = -1;
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.5, emissive: 0x222222 });
  add(scene, new THREE.PlaneGeometry(90, 0.14), lineMat, 0, 0.005, -2.1, -Math.PI / 2);
  const dashGeo = new THREE.PlaneGeometry(3, 0.14);
  for (let x = -42; x < 42; x += 7) add(scene, dashGeo, lineMat, x, 0.005, 3.4, -Math.PI / 2);

  // Gölge lekesi
  const blob = canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,0.85)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });
  const shadow = add(scene, new THREE.PlaneGeometry(8.6, 3.4), new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }), 0, 0.01, 0, -Math.PI / 2);
  shadow.renderOrder = 1;

  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float uAlpha; void main(){ float a = pow(vUv.y, 1.8) * uAlpha * 0.22; gl_FragColor = vec4(1.0, 0.95, 0.84, a); }',
  });
  const beams = [];
  for (const s of [-1, 1]) {
    const b = add(scene, new THREE.CylinderGeometry(0.12, 2.1, 12, 24, 1, true), beamMat, 3.55 + 6, 0.98, s * 0.85, 0, 0, Math.PI / 2);
    b.rotation.z = Math.PI / 2;
    b.rotation.y = s * -0.04;
    beams.push(b);
  }
  const pool = add(scene, new THREE.PlaneGeometry(12, 5), new THREE.MeshBasicMaterial({ map: blob, color: 0xfff1d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 9.5, 0.02, 0, -Math.PI / 2);

  // İkaz üçgeni (yol yardım)
  const tri = new THREE.Shape();
  tri.moveTo(-0.3, 0); tri.lineTo(0.3, 0); tri.lineTo(0, 0.52); tri.lineTo(-0.3, 0);
  const hole = new THREE.Path();
  hole.moveTo(-0.2, 0.06); hole.lineTo(0.2, 0.06); hole.lineTo(0, 0.4); hole.lineTo(-0.2, 0.06);
  tri.holes.push(hole);
  const triMat = new THREE.MeshStandardMaterial({ color: 0xd3202f, emissive: 0xff2a2a, emissiveIntensity: 0.2, side: THREE.DoubleSide });
  const warn = add(scene, new THREE.ShapeGeometry(tri), triMat, -7.2, 0.02, 0.2, 0, Math.PI / 2 - 0.25, 0);
  warn.rotation.set(-0.12, Math.PI / 2 - 0.3, 0);

  const hazardL = new THREE.PointLight(0xff8a14, 0, 7, 1.6);
  hazardL.position.set(3.7, 1.2, 0);
  scene.add(hazardL);
  const hazardR = new THREE.PointLight(0xff8a14, 0, 7, 1.6);
  hazardR.position.set(-3.9, 1.1, 0);
  scene.add(hazardR);

  // --- Boyut ve güncelleme ----------------------------------------------------
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
  let propAngle = 0;

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(s.look);

    workLamp.intensity = s.workLamp * 2.2;
    under.intensity = s.underLight * 7;
    cabPivot.rotation.z = -s.cabTilt;

    // Körükler: k = 1 normal, <1 inik
    for (const b of bellows) b.scale.y = s.bellow;
    body.position.y = (s.bellow - 1) * 0.32 * 0.9;

    // Şaft dönüşü
    propAngle += dt * s.spin * 18;
    for (const p of props) p.rotation.x = propAngle;

    // Vurgu: kırmızı kenar çizgisi ve hafif iç ışıma
    for (const [id, mats] of Object.entries(groups)) {
      const k = s.highlight === id ? s.hlAmount : 0;
      const pulse = 0.75 + 0.25 * Math.sin(t * 6);
      for (const m of mats) {
        m.emissive.copy(HL);
        m.emissiveIntensity = k * 0.02 * pulse;
      }
      edgeMats[id].opacity = k * (0.55 + 0.35 * pulse);
      for (const l of edgeLines[id]) l.visible = k > 0.01;
    }
    pulseMat.uniforms.uTime.value = t;
    pulseMat.uniforms.uPulse.value = s.pulse;

    // Farlar ve dörtlüler
    M.head.emissiveIntensity = 0.2 + s.headlights * 3.2;
    beamMat.uniforms.uAlpha.value = s.headlights;
    pool.material.opacity = s.headlights * 0.5;
    for (const b of beams) b.visible = s.headlights > 0.01;
    const blink = s.hazard > 0 ? (Math.sin(t * Math.PI * 2 * 0.85) > 0 ? 1 : 0) : 0;
    M.amber.emissiveIntensity = blink * s.hazard * 3.5;
    hazardL.intensity = blink * s.hazard * 5;
    hazardR.intensity = blink * s.hazard * 5;
    warn.visible = s.hazard > 0.01;
    triMat.emissiveIntensity = 0.2 + s.hazard * 0.5;
    scene.environmentIntensity = s.env ?? 0.4;

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.9) {
      dpr = Math.max(0.9, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, update, resize, drawName,
    compile: () => renderer.compile(scene, camera),
    points: {
      motor: V(2.4, 1.1, 0), sanziman: V(1.4, 0.88, 0), diferansiyel: V(AKS.arka1, WHEEL_R, 0),
      diff2: V(AKS.arka2, WHEEL_R, 0), fren: V(-0.55, 0.72, 0.66), adblue: V(0.7, 0.8, -0.9), korug: V(AKS.arka1 - 0.52, 0.66, 0.47),
    },
  };
}
