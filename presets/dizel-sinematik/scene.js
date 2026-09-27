// Pülverize: kaydırmayla oynatılan enjektör filmi.
// Tek sahne, dört durak: A) enjektör havada püskürtür, B) parça parça açılır,
// C) dört enjektör test tezgâhında menzürlere püskürtür, D) tamir edilen enjektörün kodu okunur.
// Dışarıya: createScene(canvas, opts) → { setProgress(p), state, anchors, project(v3), resize(), start(), stop(), render(), warm() }
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- dokular

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Gövdedeki lazer yazısı: düzeltme kodu ve matris kod (parça numarası yok)
function etchTex() {
  return canvasTex(512, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(24,26,28,.9)';
    g.font = '600 30px monospace';
    g.fillText('IMA  5A7C 3F91', 150, 62);
    g.font = '500 24px monospace';
    g.fillText('D2  0,82', 150, 104);
    const s = 8, x0 = 24, y0 = 24;
    for (let y = 0; y < 13; y++) {
      for (let x = 0; x < 13; x++) {
        const edge = x === 0 || y === 12 || (y === 0 && x % 2 === 0) || (x === 12 && y % 2 === 0);
        if (edge || Math.random() < 0.46) g.fillRect(x0 + x * s, y0 + y * s, s - 1, s - 1);
      }
    }
  });
}

// Menzür bölüntüsü: 0-80 arası çizgiler ve rakamlar (ön yüz)
function gradTex() {
  return canvasTex(256, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(230,240,245,.85)';
    g.font = '600 34px monospace';
    for (let i = 0; i <= 80; i += 2) {
      const y = h - 24 - (i / 80) * (h - 60);
      const maj = i % 10 === 0;
      g.fillRect(maj ? 70 : 100, y - 1.5, maj ? 116 : 56, 3);
      if (maj && i > 0) g.fillText(String(i), 192, y + 12);
    }
  });
}

// Zemin: ortası amber, kenarı karanlık
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(92,62,24,1)');
    gr.addColorStop(0.35, 'rgba(30,26,20,1)');
    gr.addColorStop(1, 'rgba(11,13,12,1)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

function glowTex() {
  return canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,236,200,1)');
    gr.addColorStop(0.25, 'rgba(255,170,60,.5)');
    gr.addColorStop(1, 'rgba(255,140,30,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
}

function backdropTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0b0d0c';
    g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.5, w * 0.5);
    gr.addColorStop(0, 'rgba(70,52,28,1)');
    gr.addColorStop(0.45, 'rgba(26,24,20,1)');
    gr.addColorStop(1, 'rgba(11,13,12,1)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

// ---------------------------------------------------------------- enjektör

// Kütüphane enjektörü (lib3d `injector`, 0,167 m, ucu y = 0'da, giriş +x'e): K kat büyütülür, ucu yerel y = −1,2'de.
// Kahramanın ön yarıları (*_front) sökümde 180° döndürülüp yana konur: iki yarının da kesit yüzü kameraya bakar.
const K = 14.4;
const TIP_Y = 0.0018; // püskürtme delikleri
const LABEL_NODES = ['coil_back', 'valve_piece_back', 'body_back', 'nozzle_nut_back', 'nozzle_back', 'needle'];

function buildInjector(asset, hero, etchMat, scanMat) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(K);
  rig.position.y = -1.2;
  root.add(rig);
  const model = hero ? asset.scene : asset.scene.clone(true);
  rig.add(model);
  const byName = {};
  model.traverse((o) => { if (o.name) byName[o.name] = o; });
  const tip = new THREE.Object3D();
  tip.position.set(0, TIP_Y, 0);
  rig.add(tip);
  const inj = byName.injector || model;
  // gövdedeki kod yazısı ve kodlama taraması (−x yüzü: tezgâhta kameraya bakar)
  let etch = null, scan = null;
  if (hero) {
    etch = new THREE.Mesh(new THREE.CylinderGeometry(0.01135, 0.01135, 0.022, 32, 1, true, -Math.PI / 2 - 0.85 + 0.35, 1.7), etchMat);
    etch.position.y = 0.088;
    inj.add(etch);
    scan = new THREE.Mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.0009, 40, 1, true), scanMat);
    inj.add(scan);
  }
  const base = {};
  if (hero) for (const [n, e] of Object.entries(asset.explodeData)) base[n] = { node: e.node, p: e.base.clone(), dir: e.dir.clone(), q: e.node.quaternion.clone() };
  const fronts = hero ? Object.keys(base).filter((n) => n.endsWith('_front')) : [];
  const qTurn = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const center = new THREE.Vector3();
  const box = new THREE.Box3();
  const labelLocal = LABEL_NODES.map((n) => {
    const o = byName[n];
    if (!o) return null;
    model.updateMatrixWorld(true);
    box.setFromObject(o);
    return { o, local: o.worldToLocal(box.getCenter(new THREE.Vector3())) };
  });
  return {
    root, tip, etch, scan, nodes: byName,
    // e: dikey açılma, cut: ön yarılar yana (0…1)
    explode(e, cut = e) {
      if (!hero) return;
      for (const [n, b] of Object.entries(base)) {
        const front = n.endsWith('_front');
        const back = n.endsWith('_back');
        b.node.position.copy(b.p);
        // yalnız dikey bileşen (yarılar ±z'de ayrılmasın), biraz abartılı
        b.node.position.y += b.dir.y * e * 1.3;
        if (!front && !back) b.node.position.x += b.dir.x * e;
        if (front) {
          b.node.position.x += 0.075 * cut;
          qTurn.setFromAxisAngle(Y, Math.PI * cut);
          b.node.quaternion.copy(b.q).premultiply(qTurn);
        }
      }
      if (byName.o_ring) byName.o_ring.visible = cut < 0.1;
      if (etch) etch.visible = e < 0.02;
    },
    centerOf(i, out) {
      const L = labelLocal[i];
      if (!L) return out.set(0, 0, 0);
      return out.copy(L.local).applyMatrix4(L.o.matrixWorld);
    },
    fronts,
  };
}

// ---------------------------------------------------------------- püskürtme parçacıkları

function makeSpray(N, low) {
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const t = new Float32Array(N).fill(1);
  const life = new Float32Array(N).fill(1);
  const size = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aT = new THREE.BufferAttribute(t, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('aT', aT);
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  for (let i = 0; i < N; i++) {
    size[i] = 0.5 + Math.random() * 1.1;
    pos[i * 3 + 1] = -999;
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 1 }, uAmber: { value: new THREE.Color(0xf5a524) }, uOp: { value: low ? 0.8 : 0.62 } },
    vertexShader: /* glsl */ `
      attribute float aT; attribute float aSize; uniform float uPx; varying float vT;
      void main() {
        vT = aT;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aT >= 1.0 ? 0.0 : aSize * uPx * (1.6 + aT * 9.0) * (4.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uAmber; uniform float uOp; varying float vT;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(1.0, 0.97, 0.9), uAmber, smoothstep(0.0, 0.55, vT));
        c = mix(c, vec3(0.55, 0.62, 0.66), smoothstep(0.5, 1.0, vT));
        gl_FragColor = vec4(c, a * pow(1.0 - vT, 1.6) * uOp);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let head = 0;
  const HOLES = 7;
  const dir = new THREE.Vector3();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  return {
    points, mat,
    // tip: dünya konumu, axis: memenin baktığı yön (birim), k: ölçek
    emit(n, tip, axis, k = 1, cone = 0.72) {
      // axis'e dik iki vektör
      tmpA.set(1, 0, 0);
      if (Math.abs(axis.x) > 0.9) tmpA.set(0, 0, 1);
      tmpB.crossVectors(axis, tmpA).normalize();
      tmpA.crossVectors(tmpB, axis).normalize();
      for (let j = 0; j < n; j++) {
        const i = head;
        head = (head + 1) % N;
        const h = Math.floor(Math.random() * HOLES);
        const ang = (h / HOLES) * TAU + (Math.random() - 0.5) * 0.12;
        const c = cone + (Math.random() - 0.5) * 0.16;
        dir.copy(axis).multiplyScalar(Math.cos(c))
          .addScaledVector(tmpA, Math.sin(c) * Math.cos(ang))
          .addScaledVector(tmpB, Math.sin(c) * Math.sin(ang));
        const sp = (3.2 + Math.random() * 3.4) * k;
        pos[i * 3] = tip.x; pos[i * 3 + 1] = tip.y; pos[i * 3 + 2] = tip.z;
        vel[i * 3] = dir.x * sp; vel[i * 3 + 1] = dir.y * sp; vel[i * 3 + 2] = dir.z * sp;
        t[i] = 0;
        life[i] = (0.35 + Math.random() * 0.5) * (0.7 + k * 0.3);
      }
    },
    update(dt, drag = 5.2, floorY = -99) {
      const f = Math.exp(-drag * dt);
      for (let i = 0; i < N; i++) {
        if (t[i] >= 1) continue;
        t[i] = Math.min(1, t[i] + dt / life[i]);
        const o = i * 3;
        vel[o] *= f; vel[o + 1] = vel[o + 1] * f - 0.9 * dt; vel[o + 2] *= f;
        pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
        if (pos[o + 1] < floorY) { pos[o + 1] = floorY; vel[o + 1] = 0; }
      }
      aPos.needsUpdate = true;
      aT.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- sahne

export function createScene(canvas, { low = false, reduced = false, phone = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x0b0d0c, 1);

  const q = pickQuality();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0x0b0d0c, 14, 34);

  const camera = new THREE.PerspectiveCamera(phone ? 38 : 32, 1, 0.05, 80);

  // ışıklar
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0xffa233, 3.2);
  rim.position.set(-4, 2, -4);
  const fill = new THREE.DirectionalLight(0x9cc4e0, 0.6);
  fill.position.set(-3, -2, 4);
  scene.add(key, rim, fill);
  const tipLight = new THREE.PointLight(0xffa640, 0, 3.2, 1.6);
  scene.add(tipLight);

  // arka plan ve zemin
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: backdropTex(), fog: false, depthWrite: false }));
  backdrop.position.set(0, 1, -12);
  scene.add(backdrop);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ map: floorTex(), metalness: 0.2, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.38;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------------- enjektörler (lib3d; yüklenince kurulur)
  const steel = new THREE.MeshStandardMaterial({ color: 0xc3c8cd, metalness: 1, roughness: 0.26 });
  const etchMat = new THREE.MeshStandardMaterial({ map: etchTex(), transparent: true, metalness: 0.4, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, emissive: 0xff9d2a, emissiveIntensity: 0 });
  const scanMat = new THREE.MeshBasicMaterial({ color: 0xffb640, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const SP = phone ? 0.8 : 1.0; // tezgâhta aralık
  const SLOTS = [-1.5, -0.5, 0.5, 1.5].map((x) => x * SP);
  const HERO = 2; // arızalı çıkan, tamir edilip kodlanan
  const BENCH_S = phone ? 0.46 : 0.5;
  const TUBE_TOP = 0.5, TUBE_BOT = -1.12, TUBE_H = TUBE_TOP - TUBE_BOT;
  const INJ_Y = TUBE_TOP + 0.06 + 1.2 * BENCH_S;
  const injs = [];
  let hero = null, injFuel = null, needleBase = 0, ready = false;
  const readyP = (async () => {
    const [env, asset] = await Promise.all([loadEnv('workshop', renderer, { quality: q }), loadAsset('injector', { quality: q, renderer })]);
    scene.environment = env;
    injFuel = asset.materials.fuel;
    if (injFuel) { injFuel.color.set(0xf5a524); injFuel.emissive = new THREE.Color(0xf59a14); injFuel.emissiveIntensity = 0.6; }
    if (asset.materials.cut_face) asset.materials.cut_face.color.set(0x8d949b);
    SLOTS.forEach((_, i) => {
      const j = buildInjector(asset, i === HERO, etchMat, scanMat);
      scene.add(j.root);
      injs.push(j);
    });
    hero = injs[HERO];
    needleBase = hero.nodes.needle ? hero.nodes.needle.position.y : 0;
    ready = true;
  })();

  // ---------------- tezgâh
  const bench = new THREE.Group();
  scene.add(bench);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2a2e31, metalness: 0.8, roughness: 0.45 });
  const W = SP * 4 + 0.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, 0.7), benchMat);
  base.position.y = TUBE_BOT - 0.12;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, 0.55), benchMat);
  plate.position.y = TUBE_TOP + 0.03;
  const postGeo = new THREE.BoxGeometry(0.09, TUBE_H + 0.1, 0.09);
  const postL = new THREE.Mesh(postGeo, benchMat);
  postL.position.set(-W / 2 + 0.06, (TUBE_TOP + TUBE_BOT) / 2, -0.22);
  const postR = postL.clone();
  postR.position.x = W / 2 - 0.06;
  bench.add(base, plate, postL, postR);
  // common rail: arkadan geçen boru ve her enjektöre giden hatlar
  const railY = INJ_Y + (0.112 * K - 1.2) * BENCH_S, railZ = -0.034 * K * BENCH_S - 0.1;
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, W - 0.2, 24), steel);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, railY + 0.02, railZ - 0.12);
  bench.add(rail);
  const pipeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10);
  SLOTS.forEach((x) => {
    const p = new THREE.Mesh(pipeGeo, steel);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, railY, railZ - 0.03);
    bench.add(p);
  });
  // menzürler
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd8e6ec, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const gradMat = new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, depthWrite: false, opacity: 0.9 });
  const fuelMat = new THREE.MeshStandardMaterial({ color: 0xe0921e, emissive: 0x6a3a00, metalness: 0, roughness: 0.18, transparent: true, opacity: 0.82 });
  const badMat = fuelMat.clone();
  const R = phone ? 0.15 : 0.17;
  const glassGeo = new THREE.CylinderGeometry(R, R, TUBE_H, 28, 1, true);
  const gradGeo = new THREE.CylinderGeometry(R + 0.004, R + 0.004, TUBE_H * 0.96, 20, 1, true, -0.7, 1.4);
  const fuelGeo = new THREE.CylinderGeometry(R * 0.86, R * 0.86, 1, 24, 1);
  fuelGeo.translate(0, 0.5, 0);
  const tubes = SLOTS.map((x, i) => {
    const g = new THREE.Mesh(glassGeo, glassMat);
    g.position.set(x, (TUBE_TOP + TUBE_BOT) / 2, 0);
    const gr = new THREE.Mesh(gradGeo, gradMat);
    gr.position.copy(g.position);
    const f = new THREE.Mesh(fuelGeo, i === HERO ? badMat : fuelMat);
    f.position.set(x, TUBE_BOT + 0.02, 0);
    f.scale.y = 0.001;
    bench.add(f, g, gr);
    return f;
  });

  // püskürtme
  const spray = makeSpray(low ? 1400 : 3000, low);
  scene.add(spray.points);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(1.2, 1.2, 1);
  scene.add(glow);

  // kodlama taraması: gövde etrafında ince amber bant

  // ---------------- durum
  const S = {
    p: 0,
    explode: 0,
    bench: 0,
    fill: 0,      // 0-1: menzürler dolar
    redo: 0,      // 0-1: 3. menzür boşalıp doğru değerle dolar
    code: 0,      // 0-1: kodlama taraması
    finale: 0,
    levels: [56.2, 55.8, 68.9, 56.5],
    fixed: 56.0,
  };
  function setProgress(p) {
    S.p = p;
    S.explode = smooth(0.12, 0.25, p) * (1 - smooth(0.33, 0.42, p));
    S.bench = smooth(0.38, 0.5, p);
    S.fill = smooth(0.5, 0.63, p);
    S.redo = smooth(0.68, 0.8, p);
    S.code = smooth(0.72, 0.84, p);
    S.finale = smooth(0.87, 0.96, p);
  }

  // ---------------- kamera durakları [p, konum, hedef]
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const hx = SLOTS[HERO];
  const KEYS = phone
    ? [
        [0.0, V(0.0, -0.6, 10.6), V(-0.45, -1.45, 0)],
        [0.1, V(0.3, -0.7, 11.0), V(-0.4, -1.5, 0)],
        [0.22, V(1.4, -1.0, 19.5), V(0.55, -2.3, 0)],
        [0.36, V(1.2, -0.8, 19.7), V(0.55, -2.3, 0)],
        [0.5, V(0, 1.6, 11.2), V(0, -1.35, 0)],
        [0.64, V(0.3, 1.2, 10.6), V(0, -1.2, 0)],
        [0.74, V(hx + 0.3, INJ_Y + 0.3, 2.4), V(hx, INJ_Y + 0.02, 0)],
        [0.84, V(hx + 0.15, INJ_Y + 0.2, 2.2), V(hx, INJ_Y - 0.02, 0)],
        [0.95, V(-0.4, 2.6, 12.5), V(0, -1.0, 0)],
        [1.0, V(-0.6, 2.8, 12.8), V(0, -1.0, 0)],
      ]
    : [
        [0.0, V(-1.0, 0.1, 5.6), V(-0.95, -0.05, 0)],
        [0.1, V(-0.6, 0.0, 6.0), V(-1.0, -0.1, 0)],
        [0.22, V(-1.9, 0.7, 9.4), V(-1.45, 0.1, 0)],
        [0.36, V(-1.6, 0.9, 9.6), V(-1.45, 0.1, 0)],
        [0.5, V(-1.6, 1.6, 7.6), V(-1.35, 0.05, 0)],
        [0.64, V(-1.2, 1.3, 7.2), V(-1.25, 0.05, 0)],
        [0.74, V(hx + 0.05, INJ_Y + 0.25, 2.2), V(hx - 0.42, INJ_Y - 0.12, 0)],
        [0.84, V(hx - 0.1, INJ_Y + 0.1, 2.0), V(hx - 0.42, INJ_Y - 0.12, 0)],
        [0.95, V(-1.6, 2.4, 8.6), V(-1.2, 0.0, 0)],
        [1.0, V(-1.8, 2.6, 8.8), V(-1.2, 0.0, 0)],
      ];
  const camAt = (p) => {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, a0, t0] = KEYS[i], [p1, a1, t1] = KEYS[i + 1];
    const k = smooth(p0, p1, p);
    return { pos: a0.clone().lerp(a1, k), tgt: t0.clone().lerp(t1, k) };
  };

  // ---------------- boyut
  const size = { w: 1, h: 1 };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    spray.mat.uniforms.uPx.value = renderer.getPixelRatio() * (h / 800);
  }
  const tmp = new THREE.Vector3();
  function project(v) {
    tmp.copy(v).project(camera);
    return { x: (tmp.x + 1) * 0.5 * size.w, y: (1 - tmp.y) * 0.5 * size.h, z: tmp.z };
  }
  // DOM etiketleri için dünya noktaları
  const anchors = {
    part: (i) => (hero ? hero.centerOf(i, new THREE.Vector3()) : new THREE.Vector3(0, -99, 0)),
    tubeTop: (i) => new THREE.Vector3(SLOTS[i], TUBE_TOP + 0.12, 0),
    tubeLevel: (i) => {
      const f = tubes[i];
      return new THREE.Vector3(SLOTS[i] + R + 0.02, f.position.y + f.scale.y, 0);
    },
    tubeBottom: (i) => new THREE.Vector3(SLOTS[i], TUBE_BOT - 0.3, 0.35),
    tubeUpper: (i) => new THREE.Vector3(SLOTS[i], TUBE_TOP - 0.42, 0.3),
    etch: () => (hero ? hero.etch.localToWorld(new THREE.Vector3(-0.0114, 0, 0)) : new THREE.Vector3()),
  };

  // ---------------- döngü
  const clock = { last: performance.now(), getDelta() { const n = performance.now(); const d = (n - this.last) / 1000; this.last = n; return d; } };
  let running = false, raf = 0, t = 0;
  let camPos = null, camTgt = null;
  const onFrame = [];
  const pulse = SLOTS.map((_, i) => ({ t: i * 0.13, pilot: false, main: 0 }));
  const axisDown = new THREE.Vector3(0, -1, 0);
  const tipW = new THREE.Vector3();
  const heroScale = 1;

  function step(dt) {
    t += dt;
    const { pos, tgt } = camAt(S.p);
    if (!camPos || dt === 0) {
      camPos = pos.clone();
      camTgt = tgt.clone();
    } else {
      const k = 1 - Math.pow(0.002, dt);
      camPos.lerp(pos, k);
      camTgt.lerp(tgt, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    const b = S.bench;
    if (!ready) {
      spray.update(dt);
      for (const f of onFrame) f(dt);
      renderer.render(scene, camera);
      return;
    }
    // kahraman enjektör: havadan tezgâha. Sökümde kesit yüzü kameraya döner, tezgâhta giriş raile bakar.
    const sway = Math.sin(t * 0.45) * 0.55 + 0.35;
    const heroRot = lerp(lerp(sway, 0.1, smooth(0.1, 0.2, S.p)), Math.PI / 2, b);
    hero.root.rotation.y = heroRot;
    hero.root.rotation.z = lerp(Math.sin(t * 0.3) * 0.04, 0, b);
    hero.root.position.set(lerp(0, hx, b), lerp(Math.sin(t * 0.8) * 0.04, INJ_Y, b), 0);
    hero.root.scale.setScalar(lerp(heroScale, BENCH_S, b));
    hero.explode(S.explode);
    // diğer üçü yukarıdan iner
    injs.forEach((j, i) => {
      if (i === HERO) return;
      j.root.visible = b > 0.01;
      const k = smooth(0.1 + i * 0.12, 0.7 + i * 0.1, b);
      j.root.position.set(SLOTS[i], INJ_Y + (1 - k) * 4.5, 0);
      j.root.scale.setScalar(BENCH_S);
      j.root.rotation.y = Math.PI / 2 + (1 - k) * 2.2;
    });
    bench.visible = b > 0.01;
    bench.position.y = (1 - smooth(0, 0.8, b)) * -4;
    floor.visible = camera.position.y > floor.position.y + 0.6;

    // menzür seviyeleri
    const bad = lerp(S.levels[HERO], 0, smooth(0, 0.35, S.redo));
    tubes.forEach((f, i) => {
      let v = S.levels[i] * S.fill;
      if (i === HERO) v = S.redo < 0.35 ? bad * S.fill : S.fixed * smooth(0.45, 1, S.redo);
      f.scale.y = Math.max(0.001, (v / 80) * (TUBE_H - 0.1));
      f.visible = v > 0.05;
    });
    const hot = S.redo < 0.35;
    badMat.color.setHex(hot && S.fill > 0.6 ? 0xe2552e : 0xe0921e);
    badMat.emissive.setHex(hot && S.fill > 0.6 ? 0x5a1400 : 0x6a3a00);

    // püskürtme: hangi enjektör, ne zaman
    let glowAmt = 0, liftAmt = 0;
    const heroFree = b < 0.05 && S.explode < 0.02;
    const benchFire = (S.p > 0.5 && S.p < 0.64) || (S.p > 0.79 && S.p < 0.84) || S.finale > 0.02;
    if (!reduced) {
      injs.forEach((j, i) => {
        let on = false, k = 1, cone = 0.72;
        if (i === HERO && heroFree) { on = true; k = 1; cone = 0.95; }
        else if (b > 0.98 && benchFire) {
          on = i === HERO ? true : S.p < 0.66 || S.finale > 0.02;
          k = 0.42; cone = 0.34;
        }
        const P = pulse[i];
        if (!on) { P.t = i * 0.13; return; }
        P.t += dt;
        const cyc = i === HERO && heroFree ? 0.9 : 0.42;
        if (P.t > cyc) { P.t -= cyc; P.pilot = false; P.main = 0; }
        j.tip.getWorldPosition(tipW);
        axisDown.set(0, -1, 0).applyQuaternion(j.root.quaternion).normalize();
        const n = low ? 0.55 : 1;
        if (!P.pilot && P.t > 0.0) { spray.emit(Math.round(26 * n), tipW, axisDown, k * 0.55, cone); P.pilot = true; }
        if (P.t > 0.09 && P.t < 0.22) { spray.emit(Math.round(46 * n), tipW, axisDown, k, cone); if (i === HERO) glowAmt = 1; }
        if (i === HERO) liftAmt = P.t > 0.07 && P.t < 0.24 ? 1 : 0;
        if (i === HERO) {
          glow.position.copy(tipW);
          tipLight.position.copy(tipW);
        }
      });
    }
    spray.update(dt, 5.2, TUBE_BOT + 0.05 - (1 - b) * 20);
    glow.material.opacity += ((glowAmt ? 0.9 : 0) - glow.material.opacity) * Math.min(1, dt * 18);
    glow.scale.setScalar(lerp(1.3, 0.55, b));
    tipLight.intensity = glow.material.opacity * 3.5;

    // iğne kalkar (gerçek strok 0,25 mm; okunur olsun diye 6 kat), yakıt kanalı parlar
    if (hero.nodes.needle) {
      const nl = hero.nodes.needle;
      const target = needleBase + liftAmt * 0.0015;
      nl.position.y += (target - nl.position.y) * Math.min(1, dt * 30);
    }
    if (injFuel) injFuel.emissiveIntensity = 0.45 + glow.material.opacity * 1.4 + S.explode * 0.5;

    // kodlama: bant gövdeyi tarar, yazı ısınır
    const c = S.code;
    scanMat.opacity = c > 0.01 && c < 0.99 ? 0.95 : 0;
    if (hero.scan) hero.scan.position.y = lerp(0.04, 0.125, Math.sin(t * 3.2) * 0.5 + 0.5);
    etchMat.emissiveIntensity = c > 0.01 ? (c < 0.99 ? 0.35 + Math.sin(t * 9) * 0.2 : 0.55) : 0;

    for (const f of onFrame) f(dt);
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    step(Math.min(clock.getDelta(), 1 / 20));
  }

  // görünmezken durdur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running) { clock.getDelta(); loop(); }
  });

  resize();
  setProgress(0);
  return {
    setProgress, state: S, anchors, project, resize, onFrame, renderer, readyP, isReady: () => ready,
    slots: SLOTS.length, hero: HERO,
    start() {
      if (running) return;
      running = true;
      clock.getDelta();
      loop();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    render() { step(0); },
    warm() {
      renderer.compile(scene, camera);
      step(0);
    },
  };
}
