// Servis: aydınlık, geniş servis holü (lib3d `garage`, büyütülmüş ve beyaza boyanmış) içinde liftteki
// lib3d `car_sedan`. Aracın sistemleri gerçek varlıklarla yerinde durur: motor (engine v2) ve şanzıman
// kaput altında, radyatör ve klima kompresörü önde, akü köşede, egzoz hattı altta, sağ ön tekerde
// ayrı `wheel` varlığı (fren) ve kodla çizilen amortisör + salıncak. Her durakta ilgili parça yerinden
// çıkar ya da patlatılır. Sahne durumu dışarıdan `P` ile verilir; kurgu main.js'te.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const HALL = 1.55; // hol ölçeği: garaj varlığı büyütülür, lift ve eşyalar gerçek boyda kalır
const ACCENT = new THREE.Color('#2f7bff');

// Sahne durumu (sayılar; main.js ara değerleri bunlarla kurar)
export const DEFAULTS = {
  tx: 0, ty: 0.7, tz: 0, az: 0.55, el: 0.12, dist: 6, fov: 38, sx: 0, sy: 0,
  lift: 0, hood: 0, door: 0, lights: 0,
  engUp: 0, engEx: 0, engTurn: 0, timing: 0, gbOut: 0, gbEx: 0,
  wheelOut: 0, wheelEx: 0, wheelSpin: 0, wheelSpinW: 0, wheelX: 0, strut: 0,
  exhDrop: 0, exhEx: 0, batUp: 0, batEx: 0, acUp: 0, acEx: 0, acSpin: 0,
  radOut: 0, radEx: 0, fanSpin: 0, oil: 0, dash: 0, hl: 0, tags: 0, follow: 1,
};

// Bir kutunun içinde kalan üçgenleri atar (dünya uzayında, ağırlık merkezine göre)
function cullRegion(root, min, max) {
  const v = V();
  root?.traverse((o) => {
    if (!o.isMesh || !o.geometry.index) return;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index.array;
    const keep = [];
    for (let i = 0; i < idx.length; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(pos, idx[i + k]).applyMatrix4(o.matrixWorld);
        cx += v.x; cy += v.y; cz += v.z;
      }
      cx /= 3; cy /= 3; cz /= 3;
      const inside = cx > min.x && cx < max.x && cy > min.y && cy < max.y && cz > min.z && cz < max.z;
      if (!inside) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    if (keep.length < idx.length) o.geometry.setIndex(keep);
  });
}

export function createWorld(canvas, { phone = false } = {}) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lo, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = !lo;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lo ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  const BG = new THREE.Color('#e4e8ec');
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 14, 30);
  scene.environmentIntensity = 0.95;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 80);

  // Işık: tavandan geniş, yumuşak gün ışığı; masaüstünde tek gölgeli anahtar ışık
  const hemi = new THREE.HemisphereLight(0xf4f7fb, 0xb9c0c8, 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(1.2, 9, 3.2);
  key.castShadow = !lo;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4, bottom: -4, near: 2, far: 16 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xdfe9ff, 0.55);
  rim.position.set(-5, 3.5, -3);
  scene.add(rim);


  const rig = new THREE.Group(); // araç + içindeki sistemler; lift ile yükselir
  scene.add(rig);

  // Aracın altında yumuşak temas gölgesi (telefonda gölge haritası yok)
  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(20,26,34,.55)');
    gr.addColorStop(0.6, 'rgba(20,26,34,.22)');
    gr.addColorStop(1, 'rgba(20,26,34,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  blob.renderOrder = 1;
  scene.add(blob);

  // --- Kodla: amortisör, helezon yay, salıncak, aks taşıyıcı ---------------------------
  const strut = new THREE.Group();
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.7, roughness: 0.38 });
  const matChrome = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.12 });
  const matSpring = new THREE.MeshStandardMaterial({ color: 0x2f7bff, metalness: 0.35, roughness: 0.32 });
  const matArm = new THREE.MeshStandardMaterial({ color: 0x1d2127, metalness: 0.55, roughness: 0.5 });
  {
    const seg = lo ? 12 : 24;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, seg), matSteel);
    body.position.y = 0.2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 12), matChrome);
    rod.position.y = 0.46;
    const seatLo = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, seg), matSteel);
    seatLo.position.y = 0.25;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.035, seg), matArm);
    top.position.y = 0.57;
    // helezon yay
    const turns = 5.5, r = 0.066, h0 = 0.26, h1 = 0.55;
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * turns * Math.PI * 2;
      pts.push(V(Math.cos(a) * r, h0 + (h1 - h0) * (i / 120), Math.sin(a) * r));
    }
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), lo ? 160 : 320, 0.0105, lo ? 6 : 10, false), matSpring);
    spring.name = 'spring';
    // aks taşıyıcı (porya) ve salıncak
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.06), matArm);
    knuckle.position.set(0, 0, 0.04);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.46), matArm);
    arm.position.set(0.02, -0.12, -0.2);
    arm.rotation.x = 0.08;
    arm.name = 'arm';
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), matChrome);
    joint.position.set(0.02, -0.11, 0.03);
    strut.add(body, rod, seatLo, top, spring, knuckle, arm, joint);
    strut.traverse((o) => { if (o.isMesh) { o.castShadow = !lo; o.receiveShadow = !lo; } });
    body.name = 'damper';
  }

  // --- Varlıklar ------------------------------------------------------------------------
  const A = {}; // yüklenen varlıklar
  const H = {}; // tutucular (araç uzayında dinlenme konumu + hareket)
  const REST = {};
  let G = null, C = null;
  const M = { bay: null, wheelFR: V(1.375, 0.32, 0.78), wheelR: 0.317, headL: V(2.2, 0.7, -0.6), headR: V(2.2, 0.7, 0.6) };

  // varlığı yere oturt ve ortala; tutucu grubun kökü = taban ortası
  function mount(a, { rotY = 0, scale = 1 } = {}) {
    const holder = new THREE.Group();
    const inner = a.scene;
    inner.rotation.y = rotY;
    inner.scale.setScalar(scale);
    holder.add(inner);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    const c = box.getCenter(V());
    inner.position.set(-c.x, -box.min.y, -c.z);
    holder.userData.size = box.getSize(V());
    return holder;
  }

  const envP = loadEnv('workshop', renderer, { quality: q }).then((env) => { scene.environment = env; }).catch(() => {});

  const hallP = loadAsset('garage', { quality: q, renderer }).then((g) => {
    G = g;
    const s = g.scene;
    s.scale.setScalar(HALL);
    scene.add(s);
    const N = g.nodes;
    // lift ve eşyalar gerçek boyda: büyütmeyi geri al
    for (const n of ['lift', 'toolbox_1', 'toolbox_2', 'toolbox_3', 'workbench', 'props']) {
      if (!N[n]) continue;
      N[n].scale.multiplyScalar(1 / HALL);
      // lift ve eşyalar yerde kalsın: yükseklik geri alınır; lift ve dolaplar araca yakın kalır, tezgâh duvarla gider
      if (n === 'lift') N[n].position.multiplyScalar(1 / HALL);
      else N[n].position.y /= HALL;
    }
    // kompresör, hortum ve duvara asılı eşyalar (büyük holde duvardan uzakta kalırdı) gizlenir;
    // zemindeki yağ lekeleri aydınlık holde kirli durur
    s.traverse((o) => {
      if (!o.isMesh) return;
      if (/^props_(2|3|5|8|9|10|15)$/.test(o.name)) o.visible = false;
      if (o.material?.name === 'oil_black' && !/^props/.test(o.name)) o.visible = false;
    });
    // ön sağ köşedeki kompresör grubu kameranın yolunda: o bölgedeki üçgenler atılır
    s.updateMatrixWorld(true);
    cullRegion(N.props, V(2.7, -0.1, -1.4), V(4.8, 1.4, 3.4));
    cullRegion(N.props, V(-5, -0.1, 2.3), V(5, 1.4, 5)); // uçları gizlenen dubaların tabanları
    if (N.front) N.front.visible = false;
    const Mt = g.materials;
    // modern hol: düz beyaz duvar, açık gri epoksi zemin, mavi lift, grafit dolaplar
    if (Mt.wall) { Mt.wall.map = null; Mt.wall.normalMap = null; Mt.wall.color.set('#f3f5f7'); Mt.wall.roughness = 0.85; Mt.wall.needsUpdate = true; }
    if (Mt.wall_ext) { Mt.wall_ext.map = null; Mt.wall_ext.color.set('#eef1f4'); Mt.wall_ext.needsUpdate = true; }
    if (Mt.wall_lower) { Mt.wall_lower.map = null; Mt.wall_lower.normalMap = null; Mt.wall_lower.color.set('#c9d0d8'); Mt.wall_lower.needsUpdate = true; }
    if (Mt.stripe_red) Mt.stripe_red.color.set('#2f7bff');
    if (Mt.paint_red) { Mt.paint_red.color.set('#2f6fe6'); Mt.paint_red.metalness = 0.35; Mt.paint_red.roughness = 0.38; }
    if (Mt.paint_blue) Mt.paint_blue.color.set('#3a4452');
    if (Mt.line_yellow) { Mt.line_yellow.color.set('#f4f6f8'); Mt.line_yellow.polygonOffset = true; Mt.line_yellow.polygonOffsetFactor = -2; }
    if (Mt.floor) { Mt.floor.map = null; Mt.floor.color.set('#c2c9d1'); Mt.floor.roughness = 0.7; Mt.floor.metalness = 0; Mt.floor.needsUpdate = true; }
    if (Mt.oil_black) Mt.oil_black.color.set('#aab2bb');
    if (Mt.roof_sheet) Mt.roof_sheet.color.set('#e9edf1');
    if (Mt.light_panel) { Mt.light_panel.emissive?.set('#ffffff'); Mt.light_panel.emissiveIntensity = 3; }
    if (Mt.window) { Mt.window.emissive?.set('#dfeaf7'); Mt.window.emissiveIntensity = 1.4; }
    s.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = !lo && !/floor|roof|walls|lights/.test(o.parent?.name + o.name);
      o.receiveShadow = !lo;
    });
  });

  const carP = loadAsset('car_sedan', { quality: q, renderer }).then((c) => {
    C = c;
    rig.add(c.scene);
    const Mt = c.materials;
    // grafit metalik boya: beyaz holde ve mavi liftte net okunur
    Mt.paint.color.set('#2c323a');
    Mt.paint.metalness = 0.55;
    Mt.paint.roughness = 0.28;
    if ('clearcoat' in Mt.paint) { Mt.paint.clearcoat = 1; Mt.paint.clearcoatRoughness = 0.06; }
    if (Mt.caliper_paint) Mt.caliper_paint.color.set('#2f7bff');
    c.scene.updateMatrixWorld(true);
    const hood = new THREE.Box3().setFromObject(c.nodes.hood);
    M.bay = hood;
    if (c.nodes.wheel_FR) {
      c.nodes.wheel_FR.getWorldPosition(M.wheelFR);
      const wb = new THREE.Box3().setFromObject(c.nodes.wheel_FR);
      M.wheelR = (wb.max.y - wb.min.y) / 2;
    }
    if (c.nodes.lights_front) {
      const lb = new THREE.Box3().setFromObject(c.nodes.lights_front);
      M.headL.set(lb.max.x - 0.08, (lb.min.y + lb.max.y) / 2, lb.min.z + 0.12);
      M.headR.set(lb.max.x - 0.08, (lb.min.y + lb.max.y) / 2, lb.max.z - 0.12);
    }
    // amortisör sağ ön teker arkasında
    strut.position.set(M.wheelFR.x, M.wheelFR.y, M.wheelFR.z - 0.16);
    strut.scale.setScalar(0.82);
    rig.add(strut);
    // lambalar kapalıyken sönük
    if (Mt.light_head) Mt.light_head.emissiveIntensity = 0.4;
  });

  // Parçalar: künyeden sonra, araçla holden sonra iner (ad değişkenle verilir: ön yüklemeye girmez)
  const PARTS = [
    ['engine', { version: 2 }],
    ['gearbox', {}],
    ['wheel', {}],
    ['radiator', {}],
    ['battery', {}],
    ['ac_compressor', {}],
    ['exhaust', {}],
  ];
  let partsReady = false;
  const ready = Promise.all([envP, hallP, carP]);
  const partsP = ready.then(async () => {
    for (const [name, o] of PARTS) {
      try {
        A[name] = await loadAsset(name, { quality: q, renderer, ...o });
      } catch (e) {
        console.warn('servis: parça yüklenemedi', name, e);
      }
    }
    placeParts();
    partsReady = true;
  });

  // Mavi vurgu: odaktaki parçanın malzemeleri kopyalanır, kopyanın ışıması artırılır
  const focusSets = new Map(); // anahtar → mesh listesi
  const hlMats = new Map(); // mesh → { orig, hl }
  function meshesOf(obj) {
    const out = [];
    obj?.traverse((o) => { if (o.isMesh) out.push(o); });
    return out;
  }
  function regFocus(key, objs) {
    focusSets.set(key, objs.filter(Boolean).flatMap(meshesOf));
  }
  const tagObj = new Map(); // anahtar → { obj, local } etiket noktası

  function regTag(key, obj, offset = V()) {
    if (!obj) return;
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(V()).add(offset);
    tagObj.set(key, { obj, local: obj.worldToLocal(c.clone()) });
  }

  function placeParts() {
    const bay = M.bay || new THREE.Box3(V(0.95, 0.75, -0.75), V(2.3, 1.0, 0.75));
    const bx0 = bay.min.x, bx1 = bay.max.x;
    const top = bay.min.y + 0.08; // kaputun altı (kaput öne doğru alçalır, motor arkada durur)
    const base = 0.15;
    const e = A.engine, gb = A.gearbox, w = A.wheel, rad = A.radiator, bat = A.battery, ac = A.ac_compressor, ex = A.exhaust;

    // Güç aktarma grubu (motor + şanzıman): enine, triger sağda (+Z), şanzıman solda
    const pt = new THREE.Group();
    H.pt = pt;
    REST.pt = V(bx0 + (bx1 - bx0) * 0.46, base, 0.02);
    rig.add(pt);
    if (e) {
      const h = mount(e, { rotY: -Math.PI / 2, scale: 1 });
      const sz = h.userData.size;
      if (sz.y > top - base) h.scale.setScalar((top - base) / sz.y);
      h.position.set(0, 0, 0.14);
      pt.add(h);
      H.engine = h;
      // tüm düğümlerin patlatma verisi
      regFocus('engine', [e.scene]);
      regFocus('oil_filter', [e.nodes.oil_filter, e.nodes.dipstick, e.nodes.oil_pan]);
      regFocus('timing', [e.nodes.timing_belt, e.nodes.tensioner, e.nodes.cam_pulley_intake, e.nodes.cam_pulley_exhaust]);
      regFocus('coils', ['coil_1', 'coil_2', 'coil_3', 'coil_4'].map((n) => e.nodes[n]));
      regTag('engine', e.nodes.valve_cover || e.scene, V(0, 0.06, 0));
      regTag('oil_filter', e.nodes.oil_filter);
      regTag('dipstick', e.nodes.dipstick);
      regTag('oil_pan', e.nodes.oil_pan);
      regTag('timing', e.nodes.timing_belt);
      regTag('tensioner', e.nodes.tensioner);
      regTag('coils', e.nodes.coil_2);
      regTag('fuel_rail', e.nodes.fuel_rail);
      regTag('alternator', e.nodes.alternator);
    }
    if (gb) {
      const h = mount(gb, { rotY: -Math.PI / 2, scale: 0.92 });
      h.position.set(0, 0.02, -0.46);
      pt.add(h);
      H.gb = h;
      REST.gb = h.position.clone();
      regFocus('gearbox', [gb.scene]);
      regFocus('clutch', [gb.nodes.release_bearing, gb.nodes.case_clutch]);
      regTag('gearbox', gb.nodes.case_gear || gb.scene);
      regTag('gears', gb.nodes.gear_3_in || gb.nodes.input_shaft);
      regTag('clutch', gb.nodes.release_bearing);
    }
    // Radyatör: burnun arkasında, göbek +X'e bakar
    if (rad) {
      const h = mount(rad, { scale: 0.92 });
      REST.rad = V(bx1 - 0.2, 0.2, 0);
      rig.add(h);
      H.rad = h;
      regFocus('radiator', [rad.scene]);
      regTag('radiator', rad.nodes.core);
      regTag('fan', rad.nodes.fan);
      regTag('rad_cap', rad.nodes.cap);
    }
    // Akü: sol arka köşe
    if (bat) {
      const h = mount(bat, { rotY: Math.PI / 2 });
      REST.bat = V(bx0 + 0.3, 0.5, -0.5);
      rig.add(h);
      H.bat = h;
      regFocus('battery', [bat.scene]);
      regTag('battery', bat.nodes.lid || bat.scene);
      regTag('terminal', bat.nodes.terminal_pos);
    }
    // Klima kompresörü: motorun önünde, altta
    if (ac) {
      const h = mount(ac, { rotY: -Math.PI / 2, scale: 1.1 });
      REST.ac = V(bx1 - 0.52, 0.26, 0.38);
      rig.add(h);
      H.ac = h;
      regFocus('ac', [ac.scene]);
      regTag('ac', ac.nodes.body || ac.scene);
      regTag('ac_clutch', ac.nodes.clutch_plate || ac.nodes.pulley);
    }
    // Egzoz hattı: motor ucu +X, aracın altında
    if (ex) {
      const h = mount(ex, { scale: 0.98 });
      const len = h.userData.size.x;
      REST.exh = V(bx0 + 0.55 - len / 2, 0.1, 0.16);
      rig.add(h);
      H.exh = h;
      regFocus('exhaust', [ex.scene]);
      regTag('muffler', ex.nodes.muffler);
      regTag('catalyst', ex.nodes.catalyst);
      regTag('flex', ex.nodes.flex);
      regTag('dpf', ex.nodes.dpf);
      regTag('tailpipe', ex.nodes.tailpipe);
    }
    // Teker: sağ ön tekerin yerinde; takılıyken aracın kendi tekeri görünür
    if (w) {
      const h = new THREE.Group();
      w.scene.scale.setScalar(M.wheelR / 0.317);
      h.add(w.scene);
      REST.wheel = M.wheelFR.clone();
      rig.add(h);
      H.wheel = h;
      regFocus('brake', [w.nodes.disc, w.nodes.caliper]);
      regFocus('tyre', [w.nodes.tyre]);
      regTag('disc', w.nodes.disc);
      regTag('caliper', w.nodes.caliper);
      regTag('tyre', w.nodes.tyre, V(0, M.wheelR * 0.8, 0));
      regTag('rim', w.nodes.rim);
    }
    regFocus('strut', [strut]);
    regTag('damper', strut.getObjectByName('damper'));
    regTag('spring', strut.getObjectByName('spring'));
    regTag('arm', strut.getObjectByName('arm'));
    if (C) {
      regTag('head', C.nodes.lights_front, V(0.05, 0, 0.45));
      regTag('dash', C.nodes.interior, V(0.55, 0.1, 0));
      regFocus('head', [C.nodes.lights_front]);
    }
    for (const [k, v] of Object.entries(REST)) if (H[k]) H[k].position.copy(v);
    apply(P);
  }

  // --- Durum → sahne -------------------------------------------------------------------
  const P = { ...DEFAULTS };
  let focusKeys = [];
  const lastHl = new Map();

  function setFocus(keys) {
    focusKeys = keys || [];
  }

  function applyHighlight(amount) {
    const want = new Set();
    for (const k of focusKeys) for (const m of focusSets.get(k) || []) want.add(m);
    for (const [m, rec] of hlMats) {
      if (!want.has(m) && m.material === rec.hl) m.material = rec.orig;
    }
    if (amount < 0.01) {
      for (const [m, rec] of hlMats) if (m.material === rec.hl) m.material = rec.orig;
      return;
    }
    for (const m of want) {
      let rec = hlMats.get(m);
      if (!rec) {
        const orig = m.material;
        if (Array.isArray(orig)) continue;
        const hl = orig.clone();
        if (!hl.emissive) continue;
        hl.emissive = ACCENT.clone();
        rec = { orig, hl };
        hlMats.set(m, rec);
      }
      m.material = rec.hl;
      rec.hl.emissiveIntensity = 0.32 * amount;
    }
  }

  const _o = V();
  function apply(s) {
    // lift: araç, kollar temas ettikten sonra kalkar
    const liftH = s.lift * 1.75;
    rig.position.y = Math.max(0, liftH - 0.06);
    if (G?.nodes.lift_carriage) G.nodes.lift_carriage.position.y = liftH / 1; // lift gerçek boyda (ölçek geri alındı)
    blob.material.opacity = clamp(1 - rig.position.y / 1.2) * 0.9 + 0.1;
    blob.scale.setScalar(1 + rig.position.y * 0.25);

    if (C) {
      const N = C.nodes;
      if (N.hood) N.hood.rotation.z = 0.95 * s.hood;
      if (N.door_FR) N.door_FR.rotation.y = 1.1 * s.door;
      const wheelOff = s.wheelOut > 0.002 && H.wheel;
      if (N.wheel_FR) N.wheel_FR.visible = !wheelOff;
      if (N.caliper_FR) N.caliper_FR.visible = !wheelOff;
      if (C.materials.light_head) C.materials.light_head.emissiveIntensity = 0.4 + s.lights * 7;
      const dm = C.materials.dash;
      if (dm?.emissive) { dm.emissive.copy(ACCENT); dm.emissiveIntensity = 0.18 * s.dash; }
    }

    if (!partsReady) return;
    // güç aktarma: yukarı ve öne çıkar, döner
    if (H.pt) {
      const u = s.engUp;
      H.pt.position.copy(REST.pt).add(_o.set(0.42 * u, 0.95 * u, 0.1 * u));
      H.pt.rotation.y = s.engTurn;
    }
    if (A.engine) {
      const ex = A.engine.explodeData;
      for (const n in ex) {
        const d = ex[n];
        let k = s.engEx * 0.9;
        if (/timing_cover/.test(n)) k += s.timing * 1.2;
        if (/oil_filter/.test(n)) k += s.oil * 0.9;
        if (/dipstick/.test(n)) k += s.oil * 0.25;
        d.node.position.copy(d.base).addScaledVector(d.dir, k);
      }
    }
    if (H.gb) {
      H.gb.position.copy(REST.gb).add(_o.set(0, 0.05 * s.gbOut, -0.42 * s.gbOut));
      A.gearbox.explode(s.gbEx * 0.8);
      A.gearbox.spin(s.gbEx * 5);
    }
    if (H.rad) {
      H.rad.position.copy(REST.rad).add(_o.set(0.95 * s.radOut, 0.45 * s.radOut, 0));
      A.radiator.explode(s.radEx);
      A.radiator.spin(s.fanSpin);
    }
    if (H.bat) {
      H.bat.position.copy(REST.bat).add(_o.set(0.25 * s.batUp, 0.5 * s.batUp, -0.8 * s.batUp));
      H.bat.rotation.y = 0.6 * s.batUp;
      A.battery.explode(s.batEx);
    }
    if (H.ac) {
      H.ac.position.copy(REST.ac).add(_o.set(0.55 * s.acUp, 0.6 * s.acUp, 0.35 * s.acUp));
      H.ac.rotation.y = 0.6 * s.acUp;
      A.ac_compressor.explode(s.acEx);
      A.ac_compressor.spin(s.acSpin);
    }
    if (H.exh) {
      H.exh.position.copy(REST.exh).add(_o.set(0, -0.32 * s.exhDrop, 0.05 * s.exhDrop));
      A.exhaust.explode(s.exhEx * 0.9);
    }
    if (H.wheel) {
      H.wheel.visible = s.wheelOut > 0.002;
      H.wheel.position.copy(REST.wheel).add(_o.set(0.05 * s.wheelOut + 1.1 * s.wheelX, 0.02 * s.wheelOut - 0.1 * s.wheelX, 0.75 * s.wheelOut));
      A.wheel.explode(s.wheelEx);
      // teker bütün olarak göbek ekseninde döner (v1 varlığında 'spin' düğümünün orijini göbekte değil);
      // dönerken kaliper gizlenir: lastik balans makinesindeymiş gibi
      H.wheel.rotation.z = -s.wheelSpin;
      if (A.wheel.nodes.caliper) A.wheel.nodes.caliper.visible = s.wheelSpinW < 0.5;
    }
    strut.position.z = M.wheelFR.z - 0.16 + 0.3 * s.strut;
    strut.position.y = M.wheelFR.y - 0.06 + 0.1 * s.strut;
    applyHighlight(s.hl);
  }

  // --- Kamera ---------------------------------------------------------------------------
  let W = 1, Hh = 1;
  function resize(w = innerWidth, h = innerHeight) {
    W = w;
    Hh = h;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    camera.updateProjectionMatrix();
  }
  resize();

  const _t = V();
  function placeCamera(s) {
    _t.set(s.tx, s.ty + rig.position.y * (s.follow ?? 1), s.tz);
    const ce = Math.cos(s.el);
    camera.position.set(_t.x + Math.sin(s.az) * ce * s.dist, _t.y + Math.sin(s.el) * s.dist, _t.z + Math.cos(s.az) * ce * s.dist);
    camera.fov = s.fov;
    camera.lookAt(_t);
    if (s.sx || s.sy) camera.setViewOffset(W, Hh, -s.sx * W, s.sy * Hh, W, Hh);
    else if (camera.view?.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix();
    // tavan ve eşyalar kadrajı kapatmasın
    if (G) {
      if (G.nodes.props) G.nodes.props.visible = camera.position.z > -2;
    }
  }

  const _p = V();
  function project(key) {
    const t = tagObj.get(key);
    if (!t || !t.obj.visible) return null;
    let o = t.obj;
    while (o) { if (!o.visible) return null; o = o.parent; }
    _p.copy(t.local);
    t.obj.localToWorld(_p);
    _p.project(camera);
    if (_p.z > 1) return null;
    return { x: (_p.x * 0.5 + 0.5) * W, y: (-_p.y * 0.5 + 0.5) * Hh };
  }

  // yavaş cihaz: çözünürlük ve gölge düşer
  let frames = 0, slow = 0, lastT = performance.now();
  function render() {
    apply(P);
    placeCamera(P);
    renderer.render(scene, camera);
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;
    if (dt < 200) {
      frames++;
      if (dt > 30) slow++;
      if (frames >= 60) {
        if (slow > 30) {
          if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; key.castShadow = false; }
          else if (dpr > 0.9) { dpr = Math.max(0.85, dpr - 0.25); renderer.setPixelRatio(dpr); resize(W, Hh); }
        }
        frames = 0;
        slow = 0;
      }
    }
  }

  return {
    debug: { M, H, A, REST, get C() { return C; }, get G() { return G; } },
    P, ready, partsP, render, resize, project, setFocus, renderer, camera, quality: q,
    get partsReady() { return partsReady; },
  };
}
