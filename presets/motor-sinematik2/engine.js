// Saplama: tek sahne, tek plan. Parlak bir silindir kapak saplaması kapağa vidalanır,
// sonra lokma anahtar on saplamayı ortadan dışa, çapraz sırayla 90° + 90° sıkar.
// Motor: lib3d `engine` varlığı (külbütör kapağı ve bobinler sökülmüş, eksantrikler açıkta),
// `workshop` HDRI ile aydınlık atölye ışığı; kırmızı fon üzerinde ürün çekimi gibi yumuşak gölge.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

// Sıkma sırası: [x sırası, kenar (-1 ön / +1 arka)]
export const ORDER = [
  [0, -1], [0, 1], [1, 1], [-1, -1], [-1, 1], [1, -1], [2, -1], [-2, 1], [-2, -1], [2, 1],
];
// Varlık metre cinsinden; sahne birimi = 1/15 m (eski prosedürel kapakla aynı ölçek).
const SC = 15;
const POCKET_Y = 0.452; // kapak cebinin tabanı (varlık uzayı): saplamalar buraya oturur
const PX = 0.088 * SC; // silindir araları
const ZB = 0.092 * SC; // eksantrik ile cep duvarı arası
const TOP = 0.42;
const LOOSE = 0.07;
const ENGINE_Y = TOP - POCKET_Y * SC; // motorun sahnedeki tabanı

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

export function boltHome(i) {
  const [xi, side] = ORDER[i];
  return new THREE.Vector3(xi * PX, TOP, side * ZB);
}

export function createScene(canvas, { reduced = false } = {}) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lo ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.95;
  loadEnv('workshop', renderer, { quality: q }).then((env) => (scene.environment = env)).catch(() => {});

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);

  // Işık: tepe-önden geniş softbox gibi anahtar (yumuşak gölge), arkadan kırmızı kontur
  const key = new THREE.DirectionalLight(0xfff4ea, 2.4);
  key.position.set(-5, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  const rim = new THREE.DirectionalLight(0xff3326, 2.2);
  rim.position.set(6, 3, -8);
  scene.add(key, key.target, rim);

  // Zemin: yalnız gölgeyi taşır, fon rengi (kırmızı/gece) CSS'ten gelir
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = ENGINE_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Malzemeler -------------------------------------------------------
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe9ebee, metalness: 1, roughness: 0.16 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141214, metalness: 0.05, roughness: 0.58 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xff2418, emissive: 0xff1a10, emissiveIntensity: 0.35, roughness: 0.55 });

  // --- Motor (lib3d) ----------------------------------------------------
  const cams = [];
  const head = new THREE.Group();
  head.position.y = ENGINE_Y;
  head.scale.setScalar(SC);
  scene.add(head);
  loadAsset('engine', { quality: q, renderer })
    .then((E) => {
      // Kapak işi: külbütör kapağı, bobinler ve yakıt rampası sökülmüş
      for (const n of ['valve_cover', 'coil_1', 'coil_2', 'coil_3', 'coil_4']) if (E.nodes[n]) E.nodes[n].visible = false;
      cams.push(E.nodes.camshaft_intake, E.nodes.camshaft_exhaust);
      head.add(E.scene);
      canvas.classList.add('is-ready');
    })
    .catch((e) => {
      console.warn('motor yüklenemedi', e);
      canvas.classList.add('is-ready'); // saplama ve anahtar yine de görünsün
    });

  // --- Saplamalar -----------------------------------------------------
  const boltGeo = boltGeometry(lo);
  const stripeGeo = new THREE.BoxGeometry(0.34, 0.012, 0.05).translate(0.17, 0, 0);
  const bolts = [];
  for (let i = 0; i < 10; i++) {
    const tilt = new THREE.Group(); // ilk saplama kahraman: eğim ve konum bu grupta
    const spin = new THREE.Group();
    const mesh = new THREE.Mesh(boltGeo, chrome);
    mesh.castShadow = true;
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
  toolSpin.traverse((o) => o.isMesh && (o.castShadow = true));
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
        ? { t: new THREE.Vector3(HB.x, HB.y - 1.85, HB.z), d: 9, az: 0, el: 4 } // künye uzun: saplama üst bantta, altı kırmızı perdeyle örtülür
        : { t: new THREE.Vector3(HB.x - 1.85, HB.y - 0.05, HB.z), d: 6.4, az: 0, el: 4 },
      serv: mobile
        ? { t: new THREE.Vector3(0.2, -2.4, 0), d: 27, az: 52, el: 24 }
        : { t: new THREE.Vector3(-5.2, -2.0, 0.4), d: 23, az: 40, el: 22 },
      seq: mobile
        ? { t: new THREE.Vector3(1.45, 0, 0), d: 21.5, az: 90, el: 74 }
        : { t: new THREE.Vector3(-3.6, -0.4, 1.9), d: Math.max(17, 23 - aspect * 3.2), az: 0, el: 70 },
      // Sıra bitti: saplama sırası boyunca alçaktan bakış, on boya çizgisi yan yana
      stats: mobile
        ? { t: new THREE.Vector3(-0.6, 0.2, 0), d: 9.5, az: 62, el: 20 }
        : { t: new THREE.Vector3(-1.4, 0.1, -0.2), d: 8.6, az: 64, el: 17 },
      fin: mobile
        ? { t: new THREE.Vector3(0, -2.6, 0), d: 27, az: 30, el: 24 }
        : { t: new THREE.Vector3(-6.4, -2.2, 0), d: 25, az: 30, el: 22 },
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
  // Kısa telefonlarda (360×740) kahraman saplama başlığın üstüne binmesin: biraz yukarıda ve küçük
  const shortPhone = () => mobile && innerHeight < 800;

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
    const camSpin = clock * 0.4 + S.serv * 8;
    if (cams[0]) {
      cams[0].rotation.x = camSpin;
      cams[1].rotation.x = camSpin + 0.4;
    }

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
        const sc = lerp(mobile ? (shortPhone() ? 1.4 : 1.55) : 2.3, 1, land);
        const lift = shortPhone() ? 0.45 * (1 - land) : 0;
        b.tilt.scale.setScalar(sc);
        const bob = (1 - land) * Math.sin(clock * 0.8) * 0.06;
        b.tilt.position.set(
          lerp(HB.x, b.home.x, land),
          lerp(HB.y + bob + lift, b.home.y + depth, land),
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
