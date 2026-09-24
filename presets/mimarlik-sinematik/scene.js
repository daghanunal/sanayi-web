// Kodla çizilmiş üç katlı konut projesi: arsa, çekme mesafeleri, kat kat yükselen kütleler,
// kesit düzlemi, gün ışığı ve akşam. Aynı model iki kılıkta durur: mavi pafta üzerinde çizgi
// (ozalit) ve malzemesiyle render. Durum dışarıdan `update(state)` ile verilir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const L = (a, b, t) => a + (b - a) * t;

// Ölçüler (metre). Sokak +z yönünde. Zemin y = 0.
export const PLOT = { x0: -12, x1: 12, z0: -9, z1: 9 };
export const SETBACK = { x0: -9, x1: 9, z0: -6, z1: 4 };
export const FLOORS = [
  { id: 'zemin', x0: -7, x1: 5, z0: -5, z1: 3, y: 0, h: 3.3 },
  { id: 'kat1', x0: -5, x1: 8, z0: -4, z1: 3.8, y: 3.3, h: 3.3 },
  { id: 'kat2', x0: -7, x1: 0, z0: -5, z1: 1, y: 6.6, h: 3.0 },
];
export const HMAX = 10.5;

const C = {
  blue: new THREE.Color(0x0d2a4f),
  day: new THREE.Color(0xc9d7e0),
  night: new THREE.Color(0x0a1120),
};

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

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.background = C.blue.clone();
  scene.fog = new THREE.Fog(C.blue.clone(), 60, 140);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 260);
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xdfeaff, 0x6b6250, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const inner = new THREE.PointLight(0xffc98a, 0, 16, 1.4);
  inner.position.set(-3, 2.4, -0.5);
  const inner2 = new THREE.PointLight(0xffc98a, 0, 14, 1.4);
  inner2.position.set(2, 5.6, 0);
  scene.add(inner, inner2);

  // --- Kesit düzlemi --------------------------------------------------------
  const clip = new THREE.Plane(V(0, 0, -1), 50);
  const clips = [clip];

  // --- Malzemeler -----------------------------------------------------------
  const fadeMats = []; // pafta ↔ render geçişinde saydamlığı değişenler
  const std = (o, fade = 0.05) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, transparent: true, opacity: fade, depthWrite: false, clippingPlanes: clips, side: THREE.DoubleSide, ...o });
    m.userData.min = fade;
    m.userData.max = o.opacity ?? 1;
    fadeMats.push(m);
    return m;
  };
  const M = {
    render: std({ color: 0xece8e0, roughness: 0.85 }),
    slab: std({ color: 0xdedad2, roughness: 0.75 }),
    wood: std({ color: 0x9a6a3c, roughness: 0.6 }),
    frame: std({ color: 0x24282c, roughness: 0.5, metalness: 0.5 }),
    stone: std({ color: 0x8c877d, roughness: 0.9 }),
    glass: std({ color: 0x5f7d93, roughness: 0.05, metalness: 0.3, opacity: 0.42, emissive: 0xffb866, emissiveIntensity: 0 }, 0.03),
    fabric: std({ color: 0xe4ddd0, roughness: 0.95 }),
    dark: std({ color: 0x3a3632, roughness: 0.6 }),
    oak: std({ color: 0xb98b58, roughness: 0.55 }),
    rug: std({ color: 0x9aa39a, roughness: 1 }),
    lamp: std({ color: 0x222222, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.4 }),
    cove: std({ color: 0x333333, emissive: 0xffd9a0, emissiveIntensity: 0 }, 0.0),
  };
  const G = {
    lawn: std({ color: 0x8e9f74, roughness: 1, side: THREE.FrontSide, clippingPlanes: [] }, 0),
    pave: std({ color: 0xcbc6bc, roughness: 0.9, clippingPlanes: [] }, 0.04),
    water: std({ color: 0x3f9fc4, roughness: 0.05, metalness: 0.2, clippingPlanes: [], opacity: 0.92, emissive: 0x2a86b0, emissiveIntensity: 0 }, 0.04),
    trunk: std({ color: 0x6a5541, clippingPlanes: [] }, 0.03),
    leaf: std({ color: 0x6f8a58, roughness: 0.9, flatShading: true, clippingPlanes: [] }, 0.04),
    context: std({ color: 0xe6e3dc, roughness: 0.9, clippingPlanes: [] }, 0.02),
  };

  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, clippingPlanes: clips, depthWrite: false });
  const lineSoft = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const ACC = new THREE.Color(0xe9ff70);
  const accLine = new THREE.LineDashedMaterial({ color: ACC, dashSize: 0.6, gapSize: 0.35, transparent: true, opacity: 0, depthWrite: false });
  const accFill = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const accSolid = new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0, depthWrite: false });

  // --- Yardımcılar ------------------------------------------------------------
  const boxGeoCache = new Map();
  const boxGeo = (w, h, d) => {
    const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
    if (!boxGeoCache.has(k)) {
      const g = new THREE.BoxGeometry(w, h, d);
      boxGeoCache.set(k, { g, e: new THREE.EdgesGeometry(g) });
    }
    return boxGeoCache.get(k);
  };
  // Köşe koordinatlarıyla kutu; çizgisi de eklenir
  function box(parent, x0, x1, y0, y1, z0, z1, mat, { lines = lineMat, shadow = true } = {}) {
    const { g, e } = boxGeo(x1 - x0, y1 - y0, z1 - z0);
    const m = new THREE.Mesh(g, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    if (lines) m.add(new THREE.LineSegments(e, lines));
    return m;
  }

  // --- Zemin: ozalit ızgarası + gerçek zemin ----------------------------------
  const gridTex = canvasTex(512, 512, (g, w) => {
    g.clearRect(0, 0, w, w);
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const p = (i / n) * w;
      g.strokeStyle = i % 4 === 0 ? 'rgba(255,255,255,.26)' : 'rgba(255,255,255,.1)';
      g.lineWidth = i % 4 === 0 ? 2 : 1;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, w); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke();
    }
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(10, 10);
  const gridMat = new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: 1, depthWrite: false });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.005;
  grid.renderOrder = -1;
  scene.add(grid);

  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), G.lawn);
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  scene.add(lawn);

  // Arsa sınırı: kalın şerit
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
  const site = new THREE.Group();
  scene.add(site);
  function strip(x0, z0, x1, z1, w, mat, y = 0.02) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    site.add(m);
    return m;
  }
  const P = PLOT;
  [[P.x0, P.z0, P.x1, P.z0], [P.x1, P.z0, P.x1, P.z1], [P.x1, P.z1, P.x0, P.z1], [P.x0, P.z1, P.x0, P.z0]]
    .forEach(([a, b, c, d]) => strip(a, b, c, d, 0.14, stripMat));
  // Köşe işaretleri (parsel köşe taşları)
  for (const [x, z] of [[P.x0, P.z0], [P.x1, P.z0], [P.x1, P.z1], [P.x0, P.z1]]) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), stripMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.03, z);
    site.add(r);
  }
  // Sokak: arsanın önünde
  strip(-40, 12.5, 40, 12.5, 0.08, stripMat);
  strip(-40, 19.5, 40, 19.5, 0.08, stripMat);

  // Çekme mesafesi: kesikli vurgu çizgisi ve açık dolgu
  const S = SETBACK;
  const sbPts = [V(S.x0, 0.04, S.z0), V(S.x1, 0.04, S.z0), V(S.x1, 0.04, S.z1), V(S.x0, 0.04, S.z1), V(S.x0, 0.04, S.z0)];
  const sbLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(sbPts), accLine);
  sbLine.computeLineDistances();
  scene.add(sbLine);
  const sbFill = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, S.z1 - S.z0), accFill);
  sbFill.rotation.x = -Math.PI / 2;
  sbFill.position.set((S.x0 + S.x1) / 2, 0.03, (S.z0 + S.z1) / 2);
  scene.add(sbFill);

  // Yükseklik sınırı (Hmaks): yapılaşma alanının üstünde yatay düzlem
  const hmaxMat = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const hmax = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, S.z1 - S.z0), hmaxMat);
  hmax.rotation.x = -Math.PI / 2;
  hmax.position.set((S.x0 + S.x1) / 2, HMAX, (S.z0 + S.z1) / 2);
  scene.add(hmax);
  const hmaxEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S.x1 - S.x0, HMAX, S.z1 - S.z0)), accLine);
  hmaxEdge.position.set((S.x0 + S.x1) / 2, HMAX / 2, (S.z0 + S.z1) / 2);
  hmaxEdge.computeLineDistances();
  scene.add(hmaxEdge);

  // Kesit düzlemi göstergesi
  const cutW = 22, cutH = 12.5;
  const cutFill = new THREE.Mesh(new THREE.PlaneGeometry(cutW, cutH), accFill.clone());
  const cutEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(cutW, cutH)), accSolid);
  const cut = new THREE.Group();
  cut.add(cutFill, cutEdge);
  cut.position.set(0.5, cutH / 2 - 0.5, 0);
  scene.add(cut);

  // --- Bina ----------------------------------------------------------------------
  const building = new THREE.Group();
  scene.add(building);
  const floorGroups = {};
  const T = 0.25; // duvar ve döşeme kalınlığı

  function floor(f, { frontGlass = true, sideGlass = false }) {
    const g = new THREE.Group();
    g.position.y = f.y;
    building.add(g);
    floorGroups[f.id] = g;
    const { x0, x1, z0, z1, h } = f;
    box(g, x0 - 0.15, x1 + 0.15, 0, T, z0 - 0.15, z1 + 0.15, M.slab); // alt döşeme
    box(g, x0 - 0.15, x1 + 0.15, h - T, h, z0 - 0.15, z1 + 0.15, M.slab); // üst döşeme
    box(g, x0, x0 + T, T, h - T, z0, z1, M.render); // sol duvar
    if (sideGlass) {
      box(g, x1 - T, x1, T, h - T, z0, z0 + 1.2, M.render);
      box(g, x1 - 0.06, x1, T, h - T, z0 + 1.2, z1, M.glass, { shadow: false });
    } else box(g, x1 - T, x1, T, h - T, z0, z1, M.render); // sağ duvar
    box(g, x0 + T, x1 - T, T, h - T, z0, z0 + T, M.render); // arka duvar
    if (frontGlass) {
      box(g, x0 + T, x1 - T, T, h - T, z1 - 0.12, z1 - 0.06, M.glass, { shadow: false });
      const n = Math.round((x1 - x0) / 1.6);
      for (let i = 0; i <= n; i++) {
        const x = L(x0 + T, x1 - T, i / n);
        box(g, x - 0.04, x + 0.04, T, h - T, z1 - 0.16, z1 - 0.04, M.frame, { lines: null });
      }
      // Kattan kata ışık bandı (akşam yanar)
      box(g, x0, x1, h - T - 0.04, h - T, z1 - 0.3, z1 - 0.2, M.cove, { lines: null, shadow: false });
    }
    return g;
  }

  const [F0, F1, F2] = FLOORS;
  const g0 = floor(F0, { sideGlass: true });
  const g1 = floor(F1, {});
  const g2 = floor(F2, {});

  // Zemin kat: iç duvarlar (planda odalar) ve taş kaplı giriş
  box(g0, -2.2, -1.95, T, F0.h - T, F0.z0 + T, -1.2, M.render);
  box(g0, -7 + T, -4.2, T, F0.h - T, -2.2, -1.95, M.render);
  box(g0, 1.5, 1.75, T, F0.h - T, F0.z0 + T, -0.6, M.render);
  box(g0, F0.x0 - 0.4, F0.x0 + 0.05, 0, F0.h, F0.z0 - 0.4, F0.z1 + 0.4, M.stone); // taş duvar
  // Merdiven
  for (let i = 0; i < 11; i++) {
    const y = T + i * 0.29;
    box(g0, -6.7, -5.5, y, y + 0.06, -4.7 + i * 0.26, -4.4 + i * 0.26, M.oak, { lines: i % 2 ? null : lineMat });
  }
  // Mobilya: oturma grubu, sehpa, halı, yemek masası, mutfak adası, sarkıt lamba
  const fz = 0.25;
  box(g0, -6.3, -3.2, fz + 0.001, fz + 0.012, -1.2, 1.9, M.rug, { lines: null, shadow: false });
  box(g0, -6.4, -3.6, fz, fz + 0.42, -1.5, -0.6, M.fabric); // koltuk oturma
  box(g0, -6.4, -3.6, fz, fz + 0.85, -1.6, -1.2, M.fabric); // sırt
  box(g0, -6.4, -5.6, fz, fz + 0.42, -0.6, 1.6, M.fabric); // köşe
  box(g0, -5.0, -3.8, fz, fz + 0.36, 0.2, 1.1, M.oak); // sehpa
  box(g0, -1.2, 1.2, fz + 0.72, fz + 0.77, 0.2, 1.3, M.oak); // yemek masası
  for (const x of [-0.9, 0.9]) box(g0, x - 0.05, x + 0.05, fz, fz + 0.72, 0.7, 0.8, M.dark, { lines: null });
  for (const [x, z] of [[-0.6, -0.2], [0.6, -0.2], [-0.6, 1.7], [0.6, 1.7]]) {
    box(g0, x - 0.22, x + 0.22, fz + 0.42, fz + 0.47, z - 0.22, z + 0.22, M.oak);
    box(g0, x - 0.22, x + 0.22, fz + 0.47, fz + 0.95, z + (z < 0 ? -0.22 : 0.18), z + (z < 0 ? -0.18 : 0.22), M.oak, { lines: null });
  }
  box(g0, 2.3, 4.4, fz, fz + 0.92, -3.2, -2.3, M.oak); // mutfak adası
  box(g0, 2.3, 4.7, fz + 0.92, fz + 0.97, -3.3, -2.2, M.render);
  const lamps = [];
  for (const x of [-0.6, 0, 0.6]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.22, 16), M.lamp);
    l.position.set(x, F0.h - 1.2, 0.75);
    g0.add(l);
    lamps.push(l);
    const cord = box(g0, x - 0.005, x + 0.005, F0.h - 1.1, F0.h - T, 0.745, 0.755, M.dark, { lines: null, shadow: false });
    cord.castShadow = false;
  }
  // Salon bitkisi
  const potGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.45, 12);
  const pot = new THREE.Mesh(potGeo, M.dark);
  pot.position.set(-6.3, fz + 0.22, 2.3);
  g0.add(pot);
  const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), G.leaf);
  plant.position.set(-6.3, fz + 1.0, 2.3);
  plant.scale.y = 1.4;
  g0.add(plant);

  // 1. kat: ahşap panjur (konsol kısmın önünde) ve teras korkuluğu
  for (let x = 1.2; x <= 7.8; x += 0.5) box(g1, x - 0.04, x + 0.04, T, F1.h - T, F1.z1 + 0.12, F1.z1 + 0.4, M.wood, { lines: x > 7 || x < 1.5 ? lineMat : null });
  box(g1, 0, 8, F1.h, F1.h + 1.05, F1.z1 + 0.05, F1.z1 + 0.13, M.glass, { shadow: false });
  box(g1, 8 - 0.08, 8, F1.h, F1.h + 1.05, F1.z0, F1.z1 + 0.13, M.glass, { shadow: false });
  // Yatak odası: yatak
  box(g1, 4.5, 6.8, T, T + 0.5, -3.4, -1.2, M.fabric);
  box(g1, 4.5, 6.8, T, T + 1.0, -3.6, -3.4, M.oak);
  // Dolap, çalışma masası, komodinler
  box(g1, 1.8, 4.0, T, 2.6, -3.75, -3.15, M.oak);
  box(g1, -4.6, -2.4, T + 0.72, T + 0.77, -3.75, -3.05, M.oak);
  box(g1, -3.8, -3.3, T, T + 0.45, -2.8, -2.3, M.dark);
  for (const x of [4.1, 7.2]) box(g1, x - 0.25, x + 0.25, T, T + 0.5, -3.7, -3.2, M.oak, { lines: null });
  box(g1, 4.7, 6.6, T + 0.5, T + 0.62, -1.9, -1.2, M.rug, { lines: null });
  const lamp1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16), M.lamp);
  lamp1.position.set(-3.5, T + 1.1, -3.4);
  g1.add(lamp1);
  box(g1, 1.5, 1.75, T, F1.h - T, F1.z0 + T, -0.4, M.render);
  // 2. kat çatı saçağı
  box(g2, F2.x0 - 0.6, F2.x1 + 1.4, F2.h, F2.h + 0.12, F2.z0 - 0.6, F2.z1 + 1.2, M.slab);

  building.traverse((o) => { if (o.isMesh) o.userData.building = true; });

  // --- Bahçe ---------------------------------------------------------------------
  const garden = new THREE.Group();
  scene.add(garden);
  box(garden, 5, 11, 0, 0.12, -5.5, 4.2, G.pave, { lines: lineSoft }); // teras
  box(garden, -2, 1, 0, 0.1, 3, 9, G.pave, { lines: lineSoft }); // giriş yolu
  box(garden, 6.8, 10.8, 0.02, 0.1, 5, 8.2, G.water, { lines: lineSoft, shadow: false }); // havuz
  box(garden, 6.5, 11.1, 0, 0.14, 4.7, 5, G.pave, { lines: null });
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.2, 8);
  const crownGeo = new THREE.IcosahedronGeometry(1.5, 0);
  const crownEdge = new THREE.EdgesGeometry(crownGeo);
  for (const [x, z, s] of [[-10, -7, 1], [-10.2, 5.8, 1.2], [10, -7.2, 0.9], [-10.8, 8.3, 0.8], [11, -8.2, 0.7], [-10.5, -1, 0.85]]) {
    const t = new THREE.Mesh(trunkGeo, G.trunk);
    t.position.set(x, 1.1 * s, z);
    t.scale.setScalar(s);
    t.castShadow = true;
    const c = new THREE.Mesh(crownGeo, G.leaf);
    c.position.set(x, 2.9 * s, z);
    c.scale.set(s, s * 1.15, s);
    c.rotation.y = x;
    c.castShadow = true;
    c.add(new THREE.LineSegments(crownEdge, lineSoft));
    garden.add(t, c);
  }
  // Komşu yapılar: maket beyazı kütleler
  for (const [x0, x1, h, z0, z1] of [[-30, -16, 9, -8, 6], [16, 28, 12, -9, 3], [-24, -14, 6, -24, -12], [8, 22, 7, -26, -14], [-6, 6, 13, -30, -16], [-44, -30, 12, 26, 38], [34, 48, 10, 28, 40]]) {
    box(garden, x0, x1, 0, h, z0, z1, G.context, { lines: lineSoft });
  }

  // --- Durum ---------------------------------------------------------------------
  const tmp = new THREE.Vector3();
  const look = new THREE.Vector3();
  let W = 1, H = 1;

  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  let lastReal = -1;
  function setReal(r) {
    if (Math.abs(r - lastReal) < 0.002) return;
    lastReal = r;
    for (const m of fadeMats) {
      const o = L(m.userData.min, m.userData.max, r);
      m.opacity = o;
      m.transparent = o < 0.995;
      m.depthWrite = o > 0.5;
      m.visible = o > 0.004;
    }
    renderer.shadowMap.enabled = r > 0.05;
  }

  const bg = new THREE.Color();
  const fps = [];
  let lastNow = 0, lowered = false;

  function update(s, now = performance.now()) {
    // Kamera
    camera.position.copy(s.pos);
    look.copy(s.look);
    camera.lookAt(look);
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }

    // Katlar yükselir: yükseklik 0'a yakınken kat planı gibi görünür
    FLOORS.forEach((f, i) => {
      const g = floorGroups[f.id];
      const v = s.grow[i];
      g.visible = i === 0 || v > 0.004;
      g.scale.y = Math.max(0.004, v);
      g.position.y = i === 0 ? 0 : L(f.y + 1.4, f.y, Math.min(1, v * 1.2));
    });

    // Pafta ↔ render
    const r = s.real, n = s.night;
    setReal(r);
    bg.copy(C.blue).lerp(C.day, r).lerp(C.night, n);
    scene.background.copy(bg);
    scene.fog.color.copy(bg);
    gridMat.opacity = (1 - r) * 1;
    grid.visible = r < 0.99;
    stripMat.opacity = L(0.95, 0.0, r);
    site.visible = r < 0.99;
    lineMat.color.setRGB(L(1, 0.2, r), L(1, 0.22, r), L(1, 0.25, r));
    lineMat.opacity = L(0.9, 0.18, r) * (1 - n * 0.6);
    lineSoft.opacity = L(0.35, 0.08, r) * (1 - n);

    // İmar vurguları
    accLine.opacity = Math.max(s.setback, s.hmax) * 0.95;
    accFill.opacity = s.setback * 0.1;
    sbLine.visible = s.setback > 0.01;
    sbFill.visible = s.setback > 0.01;
    hmaxMat.opacity = s.hmax * 0.16;
    hmax.visible = hmaxEdge.visible = s.hmax > 0.01;
    hmax.position.y = HMAX + (1 - s.hmax) * 6;
    hmaxEdge.scale.y = 1;
    sbLine.material = accLine;

    // Kesit
    clip.constant = s.cut; // z <= cut kalır
    cut.position.z = s.cut;
    cut.visible = s.cutOn > 0.01;
    cutFill.material.opacity = s.cutOn * 0.12;
    accSolid.opacity = s.cutOn;

    // Işık: güneş açısı, akşam
    const a = s.sunA;
    sun.position.set(Math.cos(a) * 26, L(8, 22, Math.sin(Math.min(Math.PI, a + 0.9)) ** 0.7), Math.sin(a) * 18 + 12);
    sun.target.position.set(0, 0, 0);
    sun.intensity = r * (1 - n) * 2.6;
    hemi.intensity = L(1.4, 0.75, r) * (1 - n * 0.8);
    hemi.color.setHSL(L(0.6, 0.6, n), 0.5, L(0.9, 0.5, n));
    scene.environmentIntensity = L(0.35, 0.3, r) * (1 - n * 0.7);
    M.glass.emissiveIntensity = n * 0.9 + s.inside * 0.05;
    M.glass.color.setHex(n > 0.5 ? 0x3a3326 : 0x5f7d93);
    M.lamp.emissiveIntensity = Math.max(s.inside, n) * 3;
    M.cove.emissiveIntensity = n * 4;
    G.water.emissiveIntensity = n * 0.8;
    inner.intensity = (s.inside * 6 + n * 18) * r;
    inner2.intensity = n * 14 * r;
    renderer.toneMappingExposure = L(1, 1.05, n);

    renderer.render(scene, camera);

    // Zayıf cihaz: kare süresi uzarsa çözünürlüğü düşür
    if (lastNow) {
      fps.push(now - lastNow);
      if (fps.length > 50) fps.shift();
      if (!lowered && fps.length === 50) {
        const avg = fps.reduce((x, y) => x + y, 0) / 50;
        if (avg > 26) {
          lowered = true;
          dpr = Math.max(1, dpr - 0.35);
          renderer.setPixelRatio(dpr);
          sun.shadow.mapSize.set(1024, 1024);
          sun.shadow.map?.dispose();
          sun.shadow.map = null;
          resize();
        }
      }
    }
    lastNow = now;
  }

  // Dünya noktası → ekran pikseli (ölçü etiketleri için)
  function toScreen(v) {
    tmp.copy(v).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, behind: tmp.z > 1 };
  }
  const azimuth = () => Math.atan2(camera.position.x - look.x, camera.position.z - look.z);

  return {
    renderer, camera, update, resize, toScreen, azimuth,
    compile: () => renderer.compile(scene, camera),
  };
}
