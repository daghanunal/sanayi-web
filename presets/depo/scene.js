// Kalıcı WebGL sahnesi: sonsuz yedek parça deposu.
// main.js her karede hangi bölümde olunduğunu (id) ve bölüm ilerlemesini (0-1) verir;
// sahne kamerayı, raftan çıkan kutuları, parçaları, katalog dizilimini ve final kolisini ona göre kurar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPart, partMaterials } from './parts.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t) => 1 - Math.pow(1 - t, 3);
const L = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Raf ölçüleri
const BAY = 2.8;
const BAYS = 34;
const Z0 = 9;
const RACK_IN = 1.9; // koridora bakan raf yüzü
const RACK_OUT = 3.0;
const LEVELS = [0.12, 1.12, 2.12, 3.12];
const STOP_GAP = 7.4;
const stopZ = (i) => -3 - i * STOP_GAP;
const FEAT_LEVEL = 1;

// --- Dokular ---------------------------------------------------------------

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

function kraft(g, w, h, base = '#b98a55') {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // karton lifleri
  for (let i = 0; i < w * h * 0.03; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '70,45,20' : '235,200,150'},${Math.random() * 0.12})`;
    g.fillRect(x, y, Math.random() * 6 + 1, 1);
  }
  // oluklu mukavva izleri
  g.fillStyle = 'rgba(60,38,16,.05)';
  for (let x = 0; x < w; x += 7) g.fillRect(x, 0, 2, h);
}

function barcode(g, x, y, w, h, seed = 1) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  g.fillStyle = '#16171a';
  let cx = x;
  while (cx < x + w) {
    const bw = 1 + Math.floor(rnd() * 3.2);
    if (rnd() > 0.42) g.fillRect(cx, y, bw, h);
    cx += bw + 1;
  }
}

function boxTexture(variant) {
  return canvasTex(256, 256, (g, w, h) => {
    kraft(g, w, h, ['#b98a55', '#c29663', '#aa7e4c', '#c9a06d'][variant]);
    // bant
    g.fillStyle = 'rgba(150,110,60,.5)';
    g.fillRect(0, 0, w, 26);
    // etiket
    const lx = 40 + variant * 12;
    const ly = 90 + (variant % 2) * 30;
    g.fillStyle = '#f3efe3';
    g.fillRect(lx, ly, 150, 86);
    barcode(g, lx + 10, ly + 12, 130, 34, variant + 3);
    g.fillStyle = '#16171a';
    g.font = '600 15px monospace';
    g.fillText(`${'ABCDEF'[variant]}-${String(10 + variant * 7).padStart(2, '0')}  ${1200 + variant * 311}`, lx + 10, ly + 66);
    // ok işareti
    g.strokeStyle = 'rgba(30,20,10,.55)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(212, 200);
    g.lineTo(212, 170);
    g.moveTo(202, 180);
    g.lineTo(212, 170);
    g.lineTo(222, 180);
    g.stroke();
  });
}

function floorTexture() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#2a2d31';
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() * 18) | 0;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // x: -4..4 → 0..512. Sarı koridor çizgileri x=±1.65
    const px = (x) => ((x + 4) / 8) * w;
    g.fillStyle = '#e8b917';
    g.fillRect(px(-1.7), 0, 7, h);
    g.fillRect(px(1.63), 0, 7, h);
    // orta kesikli çizgi
    g.fillStyle = 'rgba(240,236,226,.5)';
    g.fillRect(px(-0.03), 0, 4, h * 0.45);
    // derz
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, h - 2, w, 2);
  });
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 30);
  return t;
}

function featLabel(stop, idx) {
  return canvasTex(512, 340, (g, w, h) => {
    kraft(g, w, h);
    g.fillStyle = '#f3efe3';
    g.fillRect(60, 70, 392, 210);
    g.fillStyle = '#ee6a24';
    g.fillRect(60, 70, 392, 44);
    g.fillStyle = '#16171a';
    g.font = '700 26px sans-serif';
    g.fillText(`RAF ${stop.raf}`, 76, 101);
    g.font = '700 30px sans-serif';
    g.fillText(stop.baslik.toLocaleUpperCase('tr').slice(0, 22), 76, 154);
    barcode(g, 76, 172, 250, 70, idx + 11);
    g.font = '600 20px monospace';
    g.fillText(`${String(idx + 1).padStart(2, '0')}/${String(stop.stok).padStart(5, '0')}`, 340, 212);
  });
}

function shipLabelCanvas() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 420;
  return c;
}
function drawShipLabel(c, { ad, tel }) {
  const g = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  g.fillStyle = '#f3efe3';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#16171a';
  g.lineWidth = 6;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#16171a';
  g.font = '600 24px sans-serif';
  g.fillText('GÖNDEREN', 34, 52);
  g.font = '800 44px sans-serif';
  const name = ad.toLocaleUpperCase('tr');
  const size = Math.min(44, Math.floor(560 / (name.length * 0.62)));
  g.font = `800 ${size}px sans-serif`;
  g.fillText(name, 34, 104);
  g.font = '600 30px sans-serif';
  g.fillText(tel, 34, 146);
  g.fillRect(34, 170, w - 68, 4);
  g.font = '600 24px sans-serif';
  g.fillText('ALICI', 34, 210);
  g.font = '800 38px sans-serif';
  g.fillText('SİZİN DÜKKÂNINIZ', 34, 256);
  barcode(g, 34, 290, 380, 90, 77);
  g.fillStyle = '#ee6a24';
  g.fillRect(440, 290, 166, 90);
  g.fillStyle = '#16171a';
  g.font = '800 34px sans-serif';
  g.fillText('BUGÜN', 460, 350);
}

// --- Sahne -----------------------------------------------------------------

export function createStage(canvas, { stops, ad, tel, lite, weak }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const maxDpr = weak ? 1.1 : lite ? 1.35 : 1.5;
  let dpr = Math.min(devicePixelRatio, maxDpr);
  renderer.setPixelRatio(dpr);

  const FOG = 0x15191e;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.Fog(FOG, 5, lite ? 30 : 38);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0xb7c4d2, 0x3a2c1e, 0.9));
  const head = new THREE.PointLight(0xffe2b8, 26, 0, 1.6);
  scene.add(head);
  const ahead = new THREE.PointLight(0xffe9c8, 34, 0, 1.6);
  scene.add(ahead);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-2, 3, 2);
  camera.add(key);
  key.target.position.set(0, 0, -3);
  camera.add(key.target);

  // Zemin
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 110),
    new THREE.MeshLambertMaterial({ map: floorTexture() })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, Z0 - 55);
  scene.add(floor);

  // Raf dikmeleri ve kirişleri
  const rackMat = new THREE.MeshLambertMaterial({ color: 0x2b5e93 });
  const beamMat = new THREE.MeshLambertMaterial({ color: 0xee6a24 });
  const upGeo = new THREE.BoxGeometry(0.08, 4.4, 0.08);
  const beamGeo = new THREE.BoxGeometry(0.06, 0.12, BAY);
  const ups = new THREE.InstancedMesh(upGeo, rackMat, (BAYS + 1) * 4);
  const beams = new THREE.InstancedMesh(beamGeo, beamMat, BAYS * LEVELS.length * 4);
  const m4 = new THREE.Matrix4();
  let ui = 0;
  let bi = 0;
  for (let k = 0; k <= BAYS; k++) {
    const z = Z0 - k * BAY;
    for (const s of [1, -1]) {
      for (const x of [RACK_IN, RACK_OUT]) {
        m4.makeTranslation(s * x, 2.2, z);
        ups.setMatrixAt(ui++, m4);
      }
    }
    if (k === BAYS) break;
    for (const y of LEVELS) {
      for (const s of [1, -1]) {
        for (const x of [RACK_IN, RACK_OUT]) {
          m4.makeTranslation(s * x, y, z - BAY / 2);
          beams.setMatrixAt(bi++, m4);
        }
      }
    }
  }
  scene.add(ups, beams);

  // Rafta kutular: 4 doku çeşidi → 4 instanced mesh
  const boxMats = [0, 1, 2, 3].map((v) => new THREE.MeshLambertMaterial({ map: boxTexture(v) }));
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const buckets = [[], [], [], []];
  const featSlots = stops.map((_, i) => stopZ(i));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < BAYS; k++) {
    const zStart = Z0 - k * BAY;
    for (const [li, y] of LEVELS.entries()) {
      for (const s of [1, -1]) {
        let z = zStart - 0.08;
        while (z > zStart - BAY + 0.4) {
          const bw = 0.45 + rnd() * 0.5;
          const bh = 0.32 + rnd() * (li === 3 ? 0.7 : 0.5);
          const bd = 0.6 + rnd() * 0.4;
          const cz = z - bw / 2;
          z -= bw + 0.04 + rnd() * 0.06;
          if (cz < zStart - BAY + 0.1) break;
          if (s === 1 && li === FEAT_LEVEL && featSlots.some((fz) => Math.abs(cz - fz) < 0.75)) continue;
          if (rnd() < 0.08) continue;
          const mat = new THREE.Matrix4().compose(
            V(s * (RACK_IN + 0.08 + bd / 2), y + 0.06 + bh / 2, cz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rnd() - 0.5) * 0.06 + (s < 0 ? Math.PI : 0), 0)),
            V(bd, bh, bw)
          );
          buckets[(rnd() * 4) | 0].push(mat);
        }
      }
    }
  }
  buckets.forEach((list, v) => {
    const im = new THREE.InstancedMesh(unit, boxMats[v], list.length);
    list.forEach((mat, i) => im.setMatrixAt(i, mat));
    scene.add(im);
  });

  // Tavan ışıkları
  const strip = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 0.05, 2.4),
    new THREE.MeshBasicMaterial({ color: 0xfff1d6, fog: true }),
    18
  );
  for (let i = 0; i < 18; i++) {
    m4.makeTranslation(0, 5.2, Z0 - 2 - i * 5.6);
    strip.setMatrixAt(i, m4);
  }
  scene.add(strip);

  // --- Öne çıkan kutular ve parçalar -----------------------------------------
  const M = partMaterials();
  for (const mat of Object.values(M)) if (mat.isMeshStandardMaterial) mat.envMap = envTex;
  const kraftInner = new THREE.MeshLambertMaterial({ color: 0x8e6a40, side: THREE.DoubleSide });
  const kraftOuter = new THREE.MeshLambertMaterial({ map: boxTexture(1), side: THREE.DoubleSide });
  const BW = 0.8; // z
  const BH = 0.52;
  const BD = 0.78; // x

  function makeBox(labelTex, size = [BD, BH, BW]) {
    const [d, h, w] = size;
    const g = new THREE.Group();
    const plane = (pw, ph, mat) => new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    const bottom = plane(d, w, kraftInner);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -h / 2;
    const face = new THREE.MeshLambertMaterial({ map: labelTex, side: THREE.DoubleSide });
    const front = plane(w, h, face); // koridora bakan yüz (-x)
    front.rotation.y = -Math.PI / 2;
    front.position.x = -d / 2;
    const back = plane(w, h, kraftOuter);
    back.rotation.y = Math.PI / 2;
    back.position.x = d / 2;
    const left = plane(d, h, kraftOuter);
    left.position.z = w / 2;
    const right = plane(d, h, kraftOuter);
    right.position.z = -w / 2;
    right.rotation.y = Math.PI;
    g.add(bottom, front, back, left, right);
    const flaps = [1, -1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(0, h / 2, (s * w) / 2);
      const f = plane(d, w / 2, kraftOuter);
      f.rotation.x = -Math.PI / 2;
      f.position.z = (-s * w) / 4;
      pivot.add(f);
      g.add(pivot);
      return { pivot, s };
    });
    return { g, flaps, size };
  }

  const feats = stops.map((stop, i) => {
    const b = makeBox(featLabel(stop, i));
    const home = V(RACK_IN + 0.1 + BD / 2, LEVELS[FEAT_LEVEL] + 0.06 + BH / 2, stopZ(i));
    b.g.position.copy(home);
    scene.add(b.g);
    const part = createPart(stop.parca, M, lite);
    const holder = new THREE.Group();
    holder.add(part);
    holder.visible = false;
    scene.add(holder);
    return { ...b, home, part: holder, inner: part };
  });

  // Katalog dizilimi
  function gridPos(i, portrait) {
    const n = feats.length;
    const base = stopZ(n - 1) - 8.5;
    if (portrait) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const last = i === n - 1 && n % 2 === 1;
      return V(last ? 0 : col ? 0.48 : -0.48, 2.95 - row * 0.72, base);
    }
    const row = i < 4 ? 0 : 1;
    const inRow = row ? 3 : 4;
    const j = row ? i - 4 : i;
    return V((j - (inRow - 1) / 2) * 0.95, row ? 1.02 : 1.95, base);
  }

  // Final kolisi
  const shipCanvas = shipLabelCanvas();
  drawShipLabel(shipCanvas, { ad, tel });
  const shipTex = new THREE.CanvasTexture(shipCanvas);
  shipTex.colorSpace = THREE.SRGBColorSpace;
  shipTex.anisotropy = 4;
  const ship = makeBox(boxTexture(2), [0.95, 0.66, 1.2]);
  ship.g.rotation.y = Math.PI / 2; // etiketli yüz kameraya
  const shipRoot = new THREE.Group();
  shipRoot.add(ship.g);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.41),
    new THREE.MeshLambertMaterial({ map: shipTex, transparent: true })
  );
  label.position.set(0.12, 0.02, 0.476);
  shipRoot.add(label);
  const tapeMat = new THREE.MeshLambertMaterial({ color: 0xee6a24 });
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 1.0), tapeMat);
  tape.position.set(0, 0.335, 0);
  tape.geometry.translate(0, 0, 0.5);
  tape.position.z = -0.5;
  shipRoot.add(tape);
  const tapeFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.004), tapeMat);
  tapeFront.geometry.translate(0, -0.09, 0);
  tapeFront.position.set(0, 0.335, 0.479);
  shipRoot.add(tapeFront);
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 1.2), new THREE.MeshLambertMaterial({ color: 0x9c7446 }));
  pallet.position.y = -0.4;
  shipRoot.add(pallet);
  shipRoot.position.set(0, 0.53, 2.4);
  shipRoot.visible = false;
  scene.add(shipRoot);

  // --- Kamera ve durum ---------------------------------------------------------
  let W = 1;
  let H = 1;
  let portrait = false;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    portrait = W / H < 0.9;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = portrait ? 64 : 48;
    camera.updateProjectionMatrix();
  }
  resize();

  const camPos = V(0, 1.6, 6);
  const camTgt = V(0, 1.5, -10);
  const wantPos = camPos.clone();
  const wantTgt = camTgt.clone();
  let viewY = 0;
  let wantViewY = 0;
  let vel = 0;
  let clock = 0;
  let chapter = 'hero';
  let prog = 0;

  function stopPose(i, into) {
    const z = stopZ(i);
    if (portrait) {
      into.pos.set(0.15, 1.55, z + 2.9);
      into.tgt.set(0.85, 1.5, z - 0.1);
    } else {
      into.pos.set(-0.75, 1.62, z + 2.5);
      into.tgt.set(0.95, 1.42, z - 0.2);
    }
    return into;
  }
  const A = { pos: V(0, 0, 0), tgt: V(0, 0, 0) };
  const B = { pos: V(0, 0, 0), tgt: V(0, 0, 0) };

  function poseHero(p) {
    feats.forEach((_, k) => resetFeat(k));
    const t = io(p);
    wantPos.set(Math.sin(clock * 0.3) * 0.06, 1.62, L(6.2, 3.4, t));
    wantTgt.set(0, 1.5, -12);
    wantViewY = portrait ? 0.12 : 0;
  }

  function featState(i, q) {
    const f = feats[i];
    const slide = io(seg(q, 0.12, 0.34)) * (1 - io(seg(q, 0.9, 1)));
    const open = io(seg(q, 0.3, 0.44)) * (1 - io(seg(q, 0.84, 0.95)));
    const rise = io(seg(q, 0.4, 0.62)) * (1 - io(seg(q, 0.8, 0.92)));
    f.g.position.set(L(f.home.x, 0.95, slide), f.home.y, f.home.z);
    f.g.rotation.y = Math.sin(slide * Math.PI) * -0.12;
    for (const { pivot, s } of f.flaps) pivot.rotation.x = s * open * 1.75;
    const top = V(f.g.position.x, f.home.y, f.home.z);
    const shown = portrait ? V(0.42, f.home.y + 0.2, f.home.z + 1.15) : V(0.2, f.home.y + 0.2, f.home.z + 1.0);
    f.part.position.lerpVectors(top, shown, rise);
    const sc = L(0.5, portrait ? 0.7 : 0.88, rise);
    f.part.scale.setScalar(sc);
    f.part.visible = rise > 0.01;
    f.part.rotation.y = clock * 0.6 + q * 5;
    f.part.rotation.x = Math.sin(clock * 0.8 + i) * 0.12;
    return rise;
  }

  function resetFeat(i) {
    const f = feats[i];
    f.g.position.copy(f.home);
    f.g.rotation.y = 0;
    for (const { pivot } of f.flaps) pivot.rotation.x = 0;
    f.part.visible = false;
  }

  function poseRaf(p) {
    const n = feats.length;
    const x = p * n;
    const i = Math.min(n - 1, Math.floor(x));
    const q = x - i;
    feats.forEach((_, k) => k !== i && resetFeat(k));
    featState(i, q);
    // kamera: durak başında bir önceki duraktan gelir
    stopPose(i, B);
    if (i === 0) {
      A.pos.set(0, 1.62, 3.4);
      A.tgt.set(0, 1.5, -12);
    } else stopPose(i - 1, A);
    const travel = io(seg(q, 0, 0.16));
    wantPos.lerpVectors(A.pos, B.pos, travel);
    wantTgt.lerpVectors(A.tgt, B.tgt, travel);
    // hafif ileri kayma
    wantPos.z -= q * 0.25;
    wantViewY = portrait ? 0.14 : 0;
    return { i, q };
  }

  function poseKatalog(p) {
    const n = feats.length;
    feats.forEach((f, i) => {
      f.g.position.copy(f.home);
      for (const { pivot } of f.flaps) pivot.rotation.x = 0;
      const t = io(seg(p, 0.04 + i * 0.035, 0.4 + i * 0.035));
      const from = V(f.home.x - 0.05, f.home.y + 0.1, f.home.z);
      const to = gridPos(i, portrait);
      f.part.position.lerpVectors(from, to, t);
      f.part.position.y += Math.sin(t * Math.PI) * 0.9;
      f.part.scale.setScalar(L(0.5, portrait ? 0.68 : 0.78, t));
      f.part.visible = t > 0.001;
      f.part.rotation.y = clock * 0.5 + i * 0.9;
      f.part.rotation.x = 0.15;
    });
    stopPose(n - 1, A);
    const base = stopZ(n - 1) - 8.5;
    B.pos.set(0, portrait ? 1.95 : 1.55, base + (portrait ? 3.7 : 3.3));
    B.tgt.set(0, portrait ? 1.85 : 1.5, base);
    const t = io(seg(p, 0, 0.35));
    wantPos.lerpVectors(A.pos, B.pos, t);
    wantTgt.lerpVectors(A.tgt, B.tgt, t);
    wantPos.z += Math.sin(p * Math.PI) * 0.2;
    wantViewY = portrait ? L(0.14, -0.1, t) : L(0, -0.09, t);
  }

  function poseFinal(p) {
    feats.forEach((_, k) => resetFeat(k));
    shipRoot.visible = true;
    const close = io(seg(p, 0.08, 0.36));
    for (const { pivot, s } of ship.flaps) pivot.rotation.x = s * (1 - close) * 2.2;
    const tp = io(seg(p, 0.36, 0.56));
    tape.scale.z = Math.max(0.001, tp);
    tape.visible = tapeFront.visible = tp > 0.01;
    tapeFront.scale.y = Math.max(0.001, io(seg(p, 0.5, 0.6)));
    const st = out(seg(p, 0.56, 0.7));
    label.scale.setScalar(L(1.35, 1, st));
    label.material.opacity = st;
    shipRoot.rotation.y = L(-0.9, 0.18, io(seg(p, 0, 0.7))) + Math.sin(clock * 0.4) * 0.05;
    if (portrait) {
      wantPos.set(0, 1.75, 7.6);
      wantTgt.set(0, 0.62, 2.4);
    } else {
      wantPos.set(-0.5, 1.5, 5.1);
      wantTgt.set(0.55, 0.85, 2.4);
    }
    wantViewY = portrait ? 0.07 : 0;
  }

  let catalogLabels = null;
  const proj = V(0, 0, 0);
  function projectParts() {
    if (!catalogLabels) return;
    for (let i = 0; i < feats.length; i++) {
      proj.copy(feats[i].part.position);
      proj.y += portrait ? -0.33 : -0.42;
      proj.project(camera);
      const x = (proj.x * 0.5 + 0.5) * W;
      const y = (-proj.y * 0.5 + 0.5) * H;
      catalogLabels[i]?.(x, y);
    }
  }

  let active = true;
  let raf = 0;
  let last = performance.now();
  let slowFrames = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!active || document.hidden) return;
    clock += dt;
    shipRoot.visible = false;
    if (chapter === 'hero') poseHero(prog);
    else if (chapter === 'raf') poseRaf(prog);
    else if (chapter === 'katalog') poseKatalog(prog);
    else if (chapter === 'final') poseFinal(prog);
    const k = 1 - Math.pow(0.0015, dt);
    camPos.lerp(wantPos, k);
    camTgt.lerp(wantTgt, k);
    viewY = L(viewY, wantViewY, k);
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    camera.rotation.z += clamp(vel * 0.0006, -0.03, 0.03);
    camera.setViewOffset(W, H, 0, viewY * H, W, H);
    head.position.set(camPos.x + 0.4, 3.2, camPos.z - 1.5);
    ahead.position.set(0.3, 3.6, camPos.z - 9);
    renderer.render(scene, camera);
    projectParts();
    // yavaş cihazda çözünürlüğü düşür
    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.9) {
      dpr = Math.max(0.9, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }
  raf = requestAnimationFrame(frame);

  return {
    set(id, p) {
      chapter = id;
      prog = p;
    },
    setVelocity(v) {
      vel = v;
    },
    setActive(v) {
      active = v;
    },
    onCatalog(setters) {
      catalogLabels = setters;
    },
    setShip(info) {
      drawShipLabel(shipCanvas, info);
      shipTex.needsUpdate = true;
    },
    snap() {
      camPos.copy(wantPos);
      camTgt.copy(wantTgt);
    },
    get portrait() {
      return portrait;
    },
    resize,
    renderOnce() {
      frame(performance.now());
    },
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}
