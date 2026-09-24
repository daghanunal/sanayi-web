// Kodla modellenmiş yedek parçalar. Her biri ~0,6 birim boyunda, merkezi orijinde bir Group döner.
import * as THREE from 'three';

const TAU = Math.PI * 2;

export function partMaterials() {
  return {
    celik: new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 1, roughness: 0.32 }),
    dokum: new THREE.MeshStandardMaterial({ color: 0x6f7378, metalness: 0.85, roughness: 0.55 }),
    krom: new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 1, roughness: 0.12 }),
    siyah: new THREE.MeshStandardMaterial({ color: 0x141517, metalness: 0.3, roughness: 0.55 }),
    kauçuk: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0, roughness: 0.85 }),
    balata: new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 0.1, roughness: 0.95 }),
    turuncu: new THREE.MeshStandardMaterial({ color: 0xee6a24, metalness: 0.2, roughness: 0.38 }),
    mavi: new THREE.MeshStandardMaterial({ color: 0x2b5e93, metalness: 0.25, roughness: 0.36 }),
    seramik: new THREE.MeshStandardMaterial({ color: 0xf1ede4, metalness: 0, roughness: 0.25 }),
    bakir: new THREE.MeshStandardMaterial({ color: 0xc27a44, metalness: 1, roughness: 0.3 }),
    delik: new THREE.MeshBasicMaterial({ color: 0x07080a }),
  };
}

const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function disk(M, seg) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, seg), M.celik);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.12, seg), M.dokum);
  hat.rotation.x = Math.PI / 2;
  hat.position.z = 0.07;
  g.add(hat);
  const bore = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), M.delik);
  bore.position.z = 0.131;
  g.add(bore);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), M.delik);
    h.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.131);
    g.add(h);
  }
  // delikli sürtünme yüzeyi
  const hole = new THREE.CircleGeometry(0.011, 10);
  const n = 30;
  const holes = new THREE.InstancedMesh(hole, M.delik, n * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = i % 2 ? 0.25 : 0.29;
    for (const side of [1, -1]) {
      m.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, side * 0.0255);
      if (side < 0) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      holes.setMatrixAt(i * 2 + (side < 0), m);
    }
  }
  g.add(holes);
  // balata çifti
  for (const side of [1, -1]) {
    const pad = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.08, 0.018), M.turuncu);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.065, 0.022), M.balata);
    fr.position.z = -side * 0.02;
    pad.add(back, fr);
    pad.position.set(0, 0.3, side * 0.075);
    g.add(pad);
  }
  return g;
}

function filtre(M, seg) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    lathe([[0, -0.2], [0.15, -0.2], [0.17, -0.18], [0.17, 0.12], [0.16, 0.15], [0.14, 0.16], [0, 0.16]], seg),
    M.mavi
  );
  g.add(body);
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.171, 0.006, 6, seg), M.mavi);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = -0.14 + i * 0.02;
    g.add(rib);
  }
  const plate = new THREE.Mesh(lathe([[0.05, 0.16], [0.15, 0.16], [0.15, 0.175], [0.05, 0.175]], seg), M.celik);
  g.add(plate);
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, seg), M.kauçuk);
  gasket.rotation.x = Math.PI / 2;
  gasket.position.y = 0.18;
  g.add(gasket);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20, 1, true), M.celik);
  thread.position.y = 0.185;
  g.add(thread);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), M.delik);
    h.rotation.x = -Math.PI / 2;
    h.position.set(Math.cos(a) * 0.08, 0.1765, Math.sin(a) * 0.08);
    g.add(h);
  }
  g.rotation.x = 0.35;
  return g;
}

function amortisor(M, seg) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, seg), M.siyah);
  body.position.y = -0.1;
  g.add(body);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 16), M.krom);
  rod.position.y = 0.24;
  g.add(rod);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 20), M.siyah);
  eye.position.y = -0.34;
  g.add(eye);
  for (const [y, r] of [[-0.02, 0.12], [0.3, 0.12]]) {
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, seg), M.dokum);
    seat.position.y = y;
    g.add(seat);
  }
  const turns = 5.5;
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const a = t * turns * TAU;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.1, -0.005 + t * 0.29, Math.sin(a) * 0.1));
  }
  const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.014, 8), M.turuncu);
  g.add(spring);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 6), M.kauçuk);
  top.position.y = 0.36;
  g.add(top);
  g.rotation.z = 0.25;
  return g;
}

// Kayış: yol boyunca düz bir şerit (yüzey), iki yüzlü
function beltGeometry(path, width, samples = 200) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAt(i / samples);
    pos.push(p.x, p.y, -width / 2, p.x, p.y, width / 2);
    if (i < samples) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function triger(M, seg) {
  const g = new THREE.Group();
  const pulleys = [
    [0, 0.2, 0.12],
    [0, -0.2, 0.08],
    [0.16, -0.02, 0.045],
  ];
  for (const [x, y, r] of pulleys) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, seg), M.celik);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, y, 0);
    g.add(p);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, 0.09, 20), M.dokum);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, y, 0);
    g.add(hub);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.012, 0.008, seg), M.dokum);
    flange.rotation.x = Math.PI / 2;
    flange.position.set(x, y, 0.038);
    g.add(flange);
  }
  // kayış yolu: kasnakların çevresinden
  const pts = [];
  const around = (cx, cy, r, a0, a1, n) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
    }
  };
  const e = 0.012;
  around(0, 0.2, 0.12 + e, Math.PI * 0.05, Math.PI * 1.0, 24);
  around(0, -0.2, 0.08 + e, Math.PI * 1.0, Math.PI * 1.95, 18);
  around(0.16, -0.02, 0.045 + e, Math.PI * 1.55, Math.PI * 2.45, 10);
  const path = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const beltMat = M.kauçuk.clone();
  beltMat.side = THREE.DoubleSide;
  g.add(new THREE.Mesh(beltGeometry(path, 0.06), beltMat));
  g.rotation.y = 0.5;
  g.scale.setScalar(1.25);
  return g;
}

function debriyaj(M, seg) {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(
    lathe([[0.07, 0.04], [0.3, 0.04], [0.31, 0.02], [0.31, -0.02], [0.28, -0.03], [0.08, -0.03]], seg),
    M.celik
  );
  cover.rotation.x = Math.PI / 2;
  g.add(cover);
  // diyafram yay parmakları
  const finger = new THREE.BoxGeometry(0.018, 0.13, 0.008);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const f = new THREE.Mesh(finger, M.dokum);
    f.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.05);
    f.rotation.z = a - Math.PI / 2;
    g.add(f);
  }
  const disc = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.02, seg), M.balata);
  plate.rotation.x = Math.PI / 2;
  disc.add(plate);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 24), M.celik);
  hub.rotation.x = Math.PI / 2;
  disc.add(hub);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 12), M.turuncu);
    s.rotation.z = a;
    s.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.012);
    disc.add(s);
  }
  disc.position.z = -0.16;
  g.add(disc);
  const bearing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 10, 24), M.krom);
  bearing.position.z = 0.16;
  g.add(bearing);
  g.rotation.y = 0.7;
  return g;
}

function buji(M, seg) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0, 0.3], [0.03, 0.3], [0.035, 0.28], [0.03, 0.25], [0.03, 0.24], [0, 0.24]], 20), M.celik));
  // seramik gövde, kaburgalı
  const ins = [[0.03, 0.24]];
  for (let i = 0; i < 5; i++) {
    const y = 0.23 - i * 0.03;
    ins.push([0.05, y], [0.042, y - 0.015]);
  }
  ins.push([0.055, 0.07], [0.06, 0.06]);
  g.add(new THREE.Mesh(lathe(ins, seg), M.seramik));
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 6), M.celik);
  hex.position.y = 0.02;
  g.add(hex);
  const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, seg), M.bakir);
  washer.position.y = -0.022;
  g.add(washer);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, seg), M.dokum);
  thread.position.y = -0.1;
  g.add(thread);
  for (let i = 0; i < 9; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.051, 0.005, 5, seg), M.celik);
    r.rotation.x = Math.PI / 2;
    r.position.y = -0.04 - i * 0.014;
    g.add(r);
  }
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), M.bakir);
  tip.position.y = -0.19;
  g.add(tip);
  const el = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.014), M.celik);
  el.position.set(0.03, -0.195, 0);
  g.add(el);
  g.rotation.z = -0.5;
  g.scale.setScalar(1.35);
  return g;
}

function piston(M, seg) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0, 0.17], [0.17, 0.17], [0.175, 0.16], [0.175, -0.2], [0.165, -0.2], [0.16, -0.19], [0, -0.19]], seg), M.dokum));
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.176, 0.006, 6, seg), M.krom);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.14 - i * 0.03;
    g.add(ring);
  }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.37, 24), M.krom);
  pin.rotation.z = Math.PI / 2;
  pin.position.y = -0.07;
  g.add(pin);
  // biyel
  const rod = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.04), M.celik);
  rod.position.y = -0.27;
  g.add(rod);
  const big = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 10, 28), M.celik);
  big.position.y = -0.45;
  g.add(big);
  g.scale.setScalar(0.95);
  g.position.y = 0.08;
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.rotation.z = 0.15;
  return wrap;
}

const BUILDERS = { disk, filtre, amortisor, triger, debriyaj, buji, piston };

export function createPart(kind, M, lite) {
  const seg = lite ? 28 : 48;
  return (BUILDERS[kind] ?? filtre)(M, seg);
}
