// Kodla modellenmiş yedi parça. Her biri yaklaşık 1 birimlik kutuya sığar, merkezi orijindedir.
// Stüdyo çekimi gibi görünsünler diye krom, fırçalanmış çelik, boyalı döküm ve seramik kullanılır.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const V2 = (x, y) => new THREE.Vector2(x, y);

export function createMaterials() {
  const S = (color, metalness, roughness, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  return {
    krom: S(0xf4f5f9, 1, 0.07),
    celik: S(0xc8ccd4, 1, 0.26),
    dokum: S(0x8b8f99, 0.9, 0.46),
    koyu: S(0x2a2233, 0.55, 0.32),
    kaucuk: S(0x221d29, 0.05, 0.78),
    balata: S(0x4b4452, 0.15, 0.88),
    seramik: S(0xf7f4ef, 0, 0.2),
    bakir: S(0xd9925c, 1, 0.24),
    mor: S(0x5b2bff, 0.35, 0.22),
    delik: new THREE.MeshBasicMaterial({ color: 0x0c0a10 }),
  };
}

const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg);

function circlePath(r, n, cx = 0, cy = 0, rev = false) {
  const p = new THREE.Path();
  for (let i = 0; i <= n; i++) {
    const a = (rev ? -1 : 1) * (i / n) * TAU;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i ? p.lineTo(x, y) : p.moveTo(x, y);
  }
  return p;
}

function circleShape(r, n) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(r, 0);
  }
  return s;
}

function helix(radius, height, turns, tube, seg, radial = 8) {
  class H extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * turns * TAU;
      return target.set(Math.cos(a) * radius, -height / 2 + t * height, Math.sin(a) * radius);
    }
  }
  return new THREE.TubeGeometry(new H(), seg, tube, radial, false);
}

// --- 1. Fren diski + kaliper ------------------------------------------------------
function disk(M, q) {
  const g = new THREE.Group();
  const s = circleShape(0.5, q.c);
  s.holes.push(circlePath(0.27, q.c, 0, 0, true));
  // delikli yüzey
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const r = [0.34, 0.4, 0.45][i % 3];
    s.holes.push(circlePath(0.017, 10, Math.cos(a) * r, Math.sin(a) * r, true));
  }
  const ring = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: q.c }),
    M.celik
  );
  ring.position.z = -0.035;
  g.add(ring);
  // şapka (göbek)
  const hs = circleShape(0.28, q.c);
  hs.holes.push(circlePath(0.075, 32, 0, 0, true));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    hs.holes.push(circlePath(0.024, 12, Math.cos(a) * 0.16, Math.sin(a) * 0.16, true));
  }
  const hat = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hs, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: q.c }),
    M.dokum
  );
  hat.position.z = -0.03;
  g.add(hat);
  // kaliper: yay biçimli blok
  const cs = new THREE.Shape();
  const a0 = 0.35, a1 = 1.35, r0 = 0.33, r1 = 0.58, n = 24;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    i ? cs.lineTo(Math.cos(a) * r1, Math.sin(a) * r1) : cs.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    cs.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
  }
  const cal = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cs, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 4, curveSegments: 24 }),
    M.mor
  );
  cal.position.z = -0.1;
  g.add(cal);
  // kaliper cıvataları
  for (const a of [0.5, 1.2]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 6), M.krom);
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.155);
    g.add(b);
  }
  g.rotation.set(-0.15, 0.5, 0);
  return g;
}

// --- 2. Yağ filtresi ------------------------------------------------------------
function filtre(M, q) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    lathe([[0, 0.34], [0.2, 0.34], [0.27, 0.32], [0.3, 0.28], [0.3, -0.22], [0.29, -0.26], [0.0, -0.26]], q.c),
    M.koyu
  );
  g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.303, 0.303, 0.2, q.c, 1, true), M.seramik);
  band.position.y = 0.03;
  g.add(band);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.305, 0.035, q.c, 1, true), M.mor);
  stripe.position.y = 0.03;
  g.add(stripe);
  // tırtıllı tutma halkası
  const grip = new THREE.CylinderGeometry(0.31, 0.31, 0.09, 96, 1);
  const p = grip.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    if (r > 0.01) {
      const k = 1 + 0.035 * Math.cos(a * 24);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
  }
  grip.computeVertexNormals();
  const gm = new THREE.Mesh(grip, M.koyu);
  gm.position.y = 0.25;
  g.add(gm);
  // taban plakası
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.035, q.c), M.celik);
  base.position.y = -0.275;
  g.add(base);
  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 8, q.c), M.kaucuk);
  seal.rotation.x = Math.PI / 2;
  seal.position.y = -0.295;
  g.add(seal);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 24), M.krom);
  thread.position.y = -0.3;
  g.add(thread);
  g.rotation.set(0.5, 0, -0.25);
  g.scale.setScalar(1.25);
  return g;
}

// --- 3. Amortisör + yay ---------------------------------------------------------
function amortisor(M, q) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.62, q.c), M.koyu);
  body.position.y = -0.22;
  g.add(body);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 24), M.krom);
  rod.position.y = 0.28;
  g.add(rod);
  const spring = new THREE.Mesh(helix(0.19, 0.78, 6, 0.028, q.h, q.r), M.mor);
  spring.position.y = 0.06;
  g.add(spring);
  const seat = new THREE.Mesh(lathe([[0.09, 0], [0.24, 0], [0.25, 0.02], [0.1, 0.04]], q.c), M.celik);
  seat.position.y = -0.36;
  g.add(seat);
  const top = new THREE.Mesh(lathe([[0.03, 0.08], [0.2, 0.06], [0.26, 0.02], [0.25, -0.02], [0.04, -0.02]], q.c), M.dokum);
  top.position.y = 0.48;
  g.add(top);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.025, 10, 24), M.celik);
  eye.position.y = -0.58;
  g.add(eye);
  g.rotation.set(0.1, 0, 0.35);
  g.scale.setScalar(1.05);
  return g;
}

// --- 4. Triger seti -------------------------------------------------------------
function hull(pts) {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const v of p) {
    while (lo.length >= 2 && cross(lo.at(-2), lo.at(-1), v) <= 0) lo.pop();
    lo.push(v);
  }
  for (const v of p.reverse()) {
    while (up.length >= 2 && cross(up.at(-2), up.at(-1), v) <= 0) up.pop();
    up.push(v);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function gear(r, teeth, depth, bevel = 0.01) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr = i % 4 < 2 ? r : r * 0.93;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(rr, 0);
  }
  s.holes.push(circlePath(r * 0.3, 24, 0, 0, true));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    s.holes.push(circlePath(r * 0.16, 16, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, true));
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
}

function triger(M, q) {
  const g = new THREE.Group();
  const c1 = V2(0, 0.24), r1 = 0.3;
  const c2 = V2(0.02, -0.36), r2 = 0.17;
  const ring = (r) => {
    const pts = [];
    for (const [c, rr] of [[c1, r1 + r], [c2, r2 + r]])
      for (let i = 0; i < 64; i++) pts.push(V2(c.x + Math.cos((i / 64) * TAU) * rr, c.y + Math.sin((i / 64) * TAU) * rr));
    return hull(pts);
  };
  const outer = ring(0.045);
  const inner = ring(0.005);
  const s = new THREE.Shape(outer);
  s.holes.push(new THREE.Path(inner.slice().reverse()));
  const belt = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: false }), M.kaucuk);
  belt.position.z = -0.065;
  g.add(belt);
  const g1 = new THREE.Mesh(gear(r1, 30, 0.1), M.celik);
  g1.position.set(c1.x, c1.y, -0.05);
  g.add(g1);
  const g2 = new THREE.Mesh(gear(r2, 18, 0.1), M.celik);
  g2.position.set(c2.x, c2.y, -0.05);
  g.add(g2);
  for (const [c, r] of [[c1, 0.07], [c2, 0.05]]) {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.16, 6), M.krom);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(c.x, c.y, 0.02);
    g.add(hub);
  }
  // gergi rulmanı
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, q.c), M.mor);
  t.rotation.x = Math.PI / 2;
  t.position.set(0.4, -0.1, 0);
  g.add(t);
  const tc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 16), M.krom);
  tc.rotation.x = Math.PI / 2;
  tc.position.set(0.4, -0.1, 0);
  g.add(tc);
  g.rotation.set(-0.1, 0.45, 0);
  g.scale.setScalar(1.15);
  return g;
}

// --- 5. Debriyaj diski ------------------------------------------------------------
function debriyaj(M, q) {
  const g = new THREE.Group();
  const fs = circleShape(0.5, q.c);
  fs.holes.push(circlePath(0.3, q.c, 0, 0, true));
  const fric = new THREE.Mesh(
    new THREE.ExtrudeGeometry(fs, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: q.c }),
    M.balata
  );
  fric.position.z = -0.03;
  g.add(fric);
  // perçinler
  const riv = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), M.bakir, 16);
  const m = new THREE.Matrix4();
  const rx = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const r = i % 2 ? 0.36 : 0.44;
    m.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, 0.042).multiply(rx);
    riv.setMatrixAt(i, m);
  }
  g.add(riv);
  // çelik göbek plakası (pencereli)
  const ps = circleShape(0.31, q.c);
  ps.holes.push(circlePath(0.08, 24, 0, 0, true));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const h = new THREE.Path();
    const cx = Math.cos(a) * 0.19, cy = Math.sin(a) * 0.19;
    const tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
    const L = 0.07, W = 0.035;
    h.moveTo(cx - tx * L - nx * W, cy - ty * L - ny * W);
    h.lineTo(cx - tx * L + nx * W, cy - ty * L + ny * W);
    h.lineTo(cx + tx * L + nx * W, cy + ty * L + ny * W);
    h.lineTo(cx + tx * L - nx * W, cy + ty * L - ny * W);
    ps.holes.push(h);
  }
  const plate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ps, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: q.c }),
    M.celik
  );
  plate.position.z = 0.02;
  g.add(plate);
  // yaylar (pencerelerde)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const sp = new THREE.Mesh(helix(0.026, 0.13, 5, 0.008, 60, 6), M.mor);
    sp.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0.05);
    sp.rotation.z = a;
    g.add(sp);
  }
  const hub = new THREE.Mesh(lathe([[0.04, 0.12], [0.1, 0.12], [0.11, 0.1], [0.11, -0.06], [0.04, -0.06]], 32), M.krom);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.rotation.set(-0.2, -0.5, 0);
  return g;
}

// --- 6. Buji ----------------------------------------------------------------------
function buji(M, q) {
  const g = new THREE.Group();
  const cer = [[0, 0.6], [0.045, 0.6], [0.05, 0.56], [0.06, 0.55]];
  for (let i = 0; i < 5; i++) {
    const y = 0.5 - i * 0.055;
    cer.push([0.085, y], [0.07, y - 0.028]);
  }
  cer.push([0.1, 0.2], [0.1, 0.12], [0, 0.12]);
  g.add(new THREE.Mesh(lathe(cer, q.c), M.seramik));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.03, q.c, 1, true), M.mor);
  band.position.y = 0.17;
  g.add(band);
  const term = new THREE.Mesh(lathe([[0, 0.72], [0.035, 0.72], [0.045, 0.69], [0.03, 0.66], [0.02, 0.6], [0, 0.6]], 24), M.krom);
  g.add(term);
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.13, 6), M.krom);
  hex.position.y = 0.05;
  g.add(hex);
  const shell = new THREE.Mesh(lathe([[0.1, -0.01], [0.13, -0.02], [0.13, -0.05], [0.09, -0.06]], q.c), M.krom);
  g.add(shell);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.26, 24), M.celik);
  core.position.y = -0.19;
  g.add(core);
  const th = new THREE.Mesh(helix(0.08, 0.22, 11, 0.012, q.h, 6), M.celik);
  th.position.y = -0.19;
  g.add(th);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 12), M.seramik);
  tip.position.y = -0.35;
  g.add(tip);
  const el = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), M.celik);
  el.position.set(0.06, -0.38, 0);
  g.add(el);
  const el2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), M.celik);
  el2.position.set(0.03, -0.42, 0);
  g.add(el2);
  g.position.y = -0.12;
  const w = new THREE.Group();
  w.add(g);
  w.rotation.set(0.15, 0, -0.55);
  w.scale.setScalar(1.3);
  return w;
}

// --- 7. Piston + biyel -----------------------------------------------------------
function piston(M, q) {
  const g = new THREE.Group();
  const prof = [[0, 0.26], [0.2, 0.25], [0.26, 0.24], [0.27, 0.22]];
  for (const y of [0.19, 0.14, 0.09]) prof.push([0.27, y + 0.015], [0.255, y + 0.012], [0.255, y - 0.012], [0.27, y - 0.015]);
  prof.push([0.27, -0.12], [0.26, -0.14], [0.22, -0.14]);
  const crown = new THREE.Mesh(lathe(prof, q.c), M.celik);
  g.add(crown);
  const dish = new THREE.Mesh(new THREE.CircleGeometry(0.17, q.c), M.dokum);
  dish.rotation.x = -Math.PI / 2;
  dish.position.y = 0.2605;
  g.add(dish);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.58, 24), M.krom);
  pin.rotation.z = Math.PI / 2;
  pin.position.y = -0.04;
  g.add(pin);
  // biyel
  const rs = new THREE.Shape();
  rs.moveTo(-0.07, 0);
  rs.lineTo(-0.045, -0.45);
  rs.absarc(0, -0.62, 0.17, Math.PI * 0.72, Math.PI * 2.28, false);
  rs.lineTo(0.07, 0);
  rs.absarc(0, 0, 0.1, 0, Math.PI, false);
  rs.holes.push(circlePath(0.1, 32, 0, -0.62, true));
  rs.holes.push(circlePath(0.06, 24, 0, 0, true));
  const rod = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rs, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 24 }),
    M.dokum
  );
  rod.position.set(0, -0.04, -0.045);
  g.add(rod);
  const brg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 32, 1, true), M.bakir);
  brg.material.side = THREE.DoubleSide;
  brg.rotation.x = Math.PI / 2;
  brg.position.set(0, -0.66, 0.005);
  g.add(brg);
  g.position.y = 0.2;
  const w = new THREE.Group();
  w.add(g);
  w.rotation.set(0.25, 0.4, 0.12);
  w.scale.setScalar(1.05);
  return w;
}

const BUILDERS = { disk, filtre, amortisor, triger, debriyaj, buji, piston };

export function createPart(kind, M, lite) {
  const q = lite ? { c: 48, h: 220, r: 6 } : { c: 72, h: 360, r: 8 };
  const make = BUILDERS[kind] ?? disk;
  const inner = make(M, q);
  const g = new THREE.Group();
  g.add(inner);
  return g;
}
