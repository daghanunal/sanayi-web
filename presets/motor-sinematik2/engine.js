// Saplama: tek sahne, tek plan. Parlak bir silindir kapak saplaması kapağa vidalanır,
// sonra lokma anahtar on saplamayı ortadan dışa, çapraz sırayla 90° + 90° sıkar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Sıkma sırası: [x sırası, kenar (-1 ön / +1 arka)]
export const ORDER = [
  [0, -1], [0, 1], [1, 1], [-1, -1], [-1, 1], [1, -1], [2, -1], [-2, 1], [-2, -1], [2, 1],
];
const PX = 1.3;
const ZB = 1.06;
const TOP = 0.42;
const LOOSE = 0.07;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

class Helix extends THREE.Curve {
  constructor(r, y0, y1, turns) {
    super();
    Object.assign(this, { r, y0, y1, turns });
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.r, lerp(this.y0, this.y1, t), Math.sin(a) * this.r);
  }
}

function noiseTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.random() * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  return tex;
}

function boltGeometry(low) {
  const flange = new THREE.CylinderGeometry(0.2, 0.212, 0.045, 40);
  flange.translate(0, 0.0225, 0);
  const hex = new THREE.CylinderGeometry(0.152, 0.158, 0.17, 6);
  hex.translate(0, 0.045 + 0.085, 0);
  const chamfer = new THREE.CylinderGeometry(0.128, 0.152, 0.02, 6);
  chamfer.translate(0, 0.225, 0);
  const shank = new THREE.CylinderGeometry(0.094, 0.094, 1.3, 20);
  shank.translate(0, -0.65, 0);
  const tip = new THREE.CylinderGeometry(0.07, 0.094, 0.05, 20);
  tip.translate(0, -1.325, 0);
  const thread = new THREE.TubeGeometry(new Helix(0.1, -1.3, -0.36, 13), low ? 240 : 420, 0.021, 5, false);
  const geos = [flange, hex, chamfer, shank, tip, thread].map((g) => g.toNonIndexed());
  return mergeGeometries(geos);
}

function lobeGeometry() {
  const s = new THREE.Shape();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 0.12 + 0.075 * Math.pow(Math.max(0, Math.cos(a)), 3);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -0.06);
  g.rotateY(Math.PI / 2); // eksen x
  return g;
}

export function boltHome(i) {
  const [xi, side] = ORDER[i];
  return new THREE.Vector3(xi * PX, TOP, side * ZB);
}

export function createScene(canvas, { low = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  const maxDpr = low ? 1 : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.62;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 5);
  const rim = new THREE.DirectionalLight(0xff3326, 3.2);
  rim.position.set(-6, 2, -6);
  const fill = new THREE.DirectionalLight(0xffe6d8, 0.6);
  fill.position.set(-4, 3, 6);
  scene.add(key, rim, fill);

  // --- Malzemeler -------------------------------------------------------
  const chrome = new THREE.MeshStandardMaterial({ color: 0xeef0f3, metalness: 1, roughness: 0.14 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.3 });
  const bump = noiseTexture();
  const alu = new THREE.MeshStandardMaterial({ color: 0x9da2a8, metalness: 0.85, roughness: 0.5, bumpMap: bump, bumpScale: 0.6 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2a2d, metalness: 0.6, roughness: 0.72, bumpMap: bump, bumpScale: 1.2 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xb66a3c, metalness: 0.9, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.2, roughness: 0.8 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141214, metalness: 0.1, roughness: 0.62 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xff2418, emissive: 0xff1a10, emissiveIntensity: 0.55, roughness: 0.55 });

  // --- Silindir kapak ---------------------------------------------------
  const head = new THREE.Group();
  scene.add(head);
  const block = new THREE.Mesh(new RoundedBoxGeometry(6.9, 0.84, 2.9, 2, 0.09), alu);
  head.add(block);
  const lower = new THREE.Mesh(new RoundedBoxGeometry(6.9, 1.7, 2.9, 2, 0.05), iron);
  lower.position.y = -0.42 - 0.03 - 0.85;
  const gasket = new THREE.Mesh(new THREE.BoxGeometry(6.94, 0.035, 2.94), copper);
  gasket.position.y = -0.435;
  head.add(lower, gasket);

  // Kapak rayı
  const railGeo = [];
  const r1 = new THREE.BoxGeometry(6.7, 0.07, 0.1);
  for (const z of [-1.37, 1.37]) railGeo.push(r1.clone().translate(0, TOP + 0.035, z));
  const r2 = new THREE.BoxGeometry(0.1, 0.07, 2.84);
  for (const x of [-3.4, 3.4]) railGeo.push(r2.clone().translate(x, TOP + 0.035, 0));
  head.add(new THREE.Mesh(mergeGeometries(railGeo), alu));

  // Saplama yuvaları
  const bossGeo = [];
  for (let i = 0; i < 10; i++) {
    const p = boltHome(i);
    bossGeo.push(new THREE.CylinderGeometry(0.25, 0.28, 0.05, 28).translate(p.x, TOP + 0.02, p.z));
  }
  head.add(new THREE.Mesh(mergeGeometries(bossGeo), alu));

  // Buji kuyuları
  const wellGeo = [];
  const wellIn = [];
  for (const x of [-1.95, -0.65, 0.65, 1.95]) {
    wellGeo.push(new THREE.CylinderGeometry(0.17, 0.19, 0.16, 28, 1, true).translate(x, TOP + 0.08, 0));
    wellIn.push(new THREE.CircleGeometry(0.165, 28).rotateX(-Math.PI / 2).translate(x, TOP + 0.02, 0));
  }
  const wellMat = alu.clone();
  wellMat.side = THREE.DoubleSide;
  head.add(new THREE.Mesh(mergeGeometries(wellGeo), wellMat), new THREE.Mesh(mergeGeometries(wellIn), dark));

  // Eksantrikler
  const cams = [];
  const lobeG = lobeGeometry();
  for (const z of [-0.52, 0.52]) {
    const cam = new THREE.Group();
    cam.position.set(0, TOP + 0.2, z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 7.2, 20).rotateZ(Math.PI / 2), steel);
    cam.add(shaft);
    let k = 0;
    for (const x of [-1.95, -0.65, 0.65, 1.95]) {
      for (const dx of [-0.3, 0.3]) {
        const lobe = new THREE.Mesh(lobeG, steel);
        lobe.position.x = x + dx;
        lobe.rotation.x = k * 1.7 + (z > 0 ? 0.8 : 0);
        cam.add(lobe);
        k++;
      }
    }
    // Dişli
    const gear = new THREE.Group();
    gear.position.x = -3.72;
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 40).rotateZ(Math.PI / 2), steel));
    const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.09, 0.07), steel, 32);
    const m = new THREE.Matrix4();
    for (let t = 0; t < 32; t++) {
      const a = (t / 32) * Math.PI * 2;
      m.makeRotationX(a).setPosition(0, Math.cos(a) * 0.53, Math.sin(a) * 0.53);
      teeth.setMatrixAt(t, m);
    }
    gear.add(teeth);
    gear.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.13, 6).rotateZ(Math.PI / 2), chrome));
    cam.add(gear);
    head.add(cam);
    cams.push(cam);
  }
  // Yatak kapakları
  const capGeo = [];
  for (const z of [-0.52, 0.52]) {
    for (const x of [-2.6, -1.3, 0, 1.3, 2.6]) {
      capGeo.push(new RoundedBoxGeometry(0.2, 0.2, 0.34, 1, 0.03).translate(x, TOP + 0.24, z));
    }
  }
  head.add(new THREE.Mesh(mergeGeometries(capGeo), alu));

  // --- Saplamalar -----------------------------------------------------
  const boltGeo = boltGeometry(low);
  const stripeGeo = new THREE.BoxGeometry(0.34, 0.012, 0.05).translate(0.17, 0, 0);
  const bolts = [];
  for (let i = 0; i < 10; i++) {
    const tilt = new THREE.Group(); // ilk saplama kahraman: eğim ve konum bu grupta
    const spin = new THREE.Group();
    const mesh = new THREE.Mesh(boltGeo, chrome);
    const stripe = new THREE.Mesh(stripeGeo, paint);
    stripe.position.set(-0.17, 0.237, 0);
    stripe.scale.x = 0.001;
    spin.add(mesh, stripe);
    tilt.add(spin);
    scene.add(tilt);
    bolts.push({ tilt, spin, stripe, home: boltHome(i) });
  }

  // --- Lokma anahtar ---------------------------------------------------
  const tool = new THREE.Group();
  const toolSpin = new THREE.Group();
  tool.add(toolSpin);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 36), chrome);
  socket.position.y = 0.12;
  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.5, 16), chrome);
  ext.position.y = 0.29 + 0.75;
  const ratchet = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 32), chrome);
  ratchet.position.y = 1.86;
  const bar = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.1, 0.18, 2, 0.04), chrome);
  bar.position.set(0.66, 1.86, 0);
  const grip = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.15, 0.24, 2, 0.07), rubber);
  grip.position.set(1.62, 1.86, 0);
  const gripStripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.25), paint);
  gripStripe.position.set(1.2, 1.86, 0);
  toolSpin.add(socket, ext, ratchet, bar, grip, gripStripe);
  scene.add(tool);

  // --- Kamera kareleri ---------------------------------------------------
  // { t: hedef, d: uzaklık, az: yatay açı, el: yükseklik (derece) }
  const HB = new THREE.Vector3(0, 3.6, 0.4);
  let mobile = innerWidth < 760;
  const frames = () => {
    mobile = innerWidth < 760;
    const aspect = innerWidth / innerHeight;
    return {
      hero: mobile
        ? { t: new THREE.Vector3(HB.x, HB.y - 0.95, HB.z), d: 6.6, az: 0, el: 4 }
        : { t: new THREE.Vector3(HB.x - 1.85, HB.y - 0.05, HB.z), d: 6.4, az: 0, el: 4 },
      serv: mobile
        ? { t: new THREE.Vector3(0.2, -0.7, 0), d: 13.5, az: 58, el: 30 }
        : { t: new THREE.Vector3(-3.4, -0.3, 0.4), d: 13.5, az: 40, el: 28 },
      seq: mobile
        ? { t: new THREE.Vector3(1.45, 0, 0), d: 21.5, az: 90, el: 74 }
        : { t: new THREE.Vector3(-3.1, -0.3, 0.2), d: Math.max(15.5, 21 - aspect * 3.2), az: 0, el: 60 },
      stats: mobile
        ? { t: new THREE.Vector3(0.4, 0.35, 0), d: 6.2, az: -62, el: 9 }
        : { t: new THREE.Vector3(0.6, -0.2, 0), d: 6.4, az: -68, el: 8 },
      fin: mobile
        ? { t: new THREE.Vector3(0, -1.6, 0), d: 13, az: 30, el: 30 }
        : { t: new THREE.Vector3(-4.6, -0.9, 0), d: 15, az: 30, el: 26 },
    };
  };
  let F = frames();

  const mix = (a, b, t) => ({
    t: a.t.clone().lerp(b.t, t),
    d: lerp(a.d, b.d, t),
    az: lerp(a.az, b.az, t),
    el: lerp(a.el, b.el, t),
  });

  const DEG = Math.PI / 180;
  function place(f) {
    const az = f.az * DEG;
    const el = f.el * DEG;
    camera.position.set(
      f.t.x + f.d * Math.cos(el) * Math.sin(az),
      f.t.y + f.d * Math.sin(el),
      f.t.z + f.d * Math.cos(el) * Math.cos(az)
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(f.t);
  }

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    F = frames();
  }
  resize();
  addEventListener('resize', resize);

  // Durum: main.js kaydırmaya göre doldurur
  const S = { land: 0, serv: 0, seqIn: 0, seq: 0, statsIn: 0, fin: 0, finIn: 0, visible: 1, intro: 1 };
  const hud = { bolt: 0, angle: 0, done: 0, labels: [] };
  const v = new THREE.Vector3();
  const prevPos = new THREE.Vector3();
  const curPos = new THREE.Vector3();
  const heroTiltZ = () => (mobile ? -0.95 : -0.42);

  let frameCb = null;
  let beforeCb = null;
  let t0 = performance.now();
  let clock = 0;
  let running = true;

  function update(dt) {
    clock += reduced ? 0 : dt;
    const land = ease(clamp01(S.land));

    // Kamera
    let f = mix(F.hero, F.serv, land);
    f.az += (1 - land) * Math.sin(clock * 0.3) * 3 + S.serv * -12 * (1 - S.seqIn);
    f = mix(f, F.seq, ease(S.seqIn));
    f = mix(f, F.stats, ease(S.statsIn));
    if (S.finIn > 0.001) {
      const g = { ...F.fin, t: F.fin.t.clone() };
      g.az += Math.sin(clock * 0.25) * 8 + S.fin * 24;
      f = mix(F.seq, g, 1);
      f.d = lerp(g.d * 1.25, g.d, ease(S.finIn));
    }
    f.d *= 1 + S.intro * 0.35;
    place(f);

    // Eksantrikler döner
    const camSpin = clock * 0.6 + S.serv * 8;
    cams[0].rotation.x = camSpin;
    cams[1].rotation.x = camSpin + 0.4;

    // Sıkma ilerlemesi
    const s = clamp01(S.seq) * 10;
    const k = Math.min(9, Math.floor(s));
    const fr = s >= 10 ? 1 : s - k;
    const finished = S.seq >= 0.999 || S.finIn > 0.001 || S.statsIn > 0.4;

    // Kahraman saplama (sıra 0): havada döner, kapağa vidalanır
    for (let i = 0; i < 10; i++) {
      const b = bolts[i];
      let turn = 0;
      let depth = LOOSE;
      let stripe = 0;
      if (finished || i < k) {
        turn = Math.PI;
        depth = 0;
        stripe = 1;
      } else if (i === k && S.seq > 0) {
        const r1 = smooth(0.42, 0.6, fr);
        const r2 = smooth(0.67, 0.85, fr);
        turn = (r1 + r2) * (Math.PI / 2);
        depth = LOOSE * (1 - r1);
        stripe = smooth(0.86, 0.96, fr);
      }
      b.spin.rotation.y = -turn + i * 0.37;
      b.stripe.scale.x = Math.max(0.001, stripe);
      if (i === 0) {
        const heroSpin = clock * 0.5 + S.land * 9;
        const tiltZ = heroTiltZ() * (1 - land);
        b.tilt.rotation.set(0.3 * (1 - land), 0, tiltZ);
        const sc = lerp(mobile ? 1.55 : 2.3, 1, land);
        b.tilt.scale.setScalar(sc);
        const bob = (1 - land) * Math.sin(clock * 0.8) * 0.06;
        b.tilt.position.set(
          lerp(HB.x, b.home.x, land),
          lerp(HB.y + bob, b.home.y + depth, land),
          lerp(HB.z, b.home.z, land)
        );
        b.spin.rotation.y += heroSpin * (1 - land) + (1 - land) * 12;
      } else {
        b.tilt.position.set(b.home.x, b.home.y + depth, b.home.z);
      }
    }

    // Lokma anahtar
    const toolIn = smooth(0.35, 1, S.seqIn) * (1 - smooth(0.0, 0.5, S.statsIn)) * (finished ? 1 - smooth(0.96, 1, S.seq) * 0 : 1);
    tool.visible = toolIn > 0.01 && S.finIn < 0.001;
    if (tool.visible) {
      const cur = bolts[k].home;
      const prev = k > 0 ? bolts[k - 1].home : new THREE.Vector3(cur.x - 1.5, 0, cur.z - 2);
      const travel = ease(smooth(0.0, 0.3, fr));
      curPos.copy(prev).lerp(cur, travel);
      const down = smooth(0.3, 0.42, fr) * (1 - smooth(0.86, 1, fr));
      const exitUp = S.seq >= 0.999 ? 1 : 0;
      const liftY = 1.1;
      tool.position.set(curPos.x, TOP + 0.045 + lerp(liftY, 0, down) + (1 - toolIn) * 5 + exitUp * 0, curPos.z);
      const r1 = smooth(0.42, 0.6, fr);
      const r2 = smooth(0.67, 0.85, fr);
      const back = smooth(0.6, 0.67, fr) * (1 - r2); // birinci 90'dan sonra kolu geri alır
      toolSpin.rotation.y = -(r1 * (1 - back) + r2) * (Math.PI / 2) + Math.PI * 0.75 + k * 0.4;
      hud.angle = Math.round((r1 + r2) * 90);
      prevPos.copy(prev);
    }
    hud.bolt = k;
    hud.done = finished ? 10 : k + (fr > 0.86 ? 1 : 0);
    hud.frac = fr;

    // Etiket konumları
    hud.labels.length = 0;
    for (let i = 0; i < 10; i++) {
      v.copy(bolts[i].home);
      v.y += 0.3;
      v.project(camera);
      hud.labels.push([(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]);
    }
  }

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    if (beforeCb) beforeCb(S);
    if (S.visible < 0.01 || document.hidden) return;
    update(dt);
    renderer.render(scene, camera);
    if (frameCb) frameCb(hud, S);
  }
  requestAnimationFrame(loop);

  return {
    state: S,
    onFrame: (cb) => (frameCb = cb),
    onBefore: (cb) => (beforeCb = cb),
    resize,
    stop: () => (running = false),
  };
}
