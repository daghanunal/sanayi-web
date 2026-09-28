// Tav: torna sahnesi. Sayfada yalnız açılışta kullanılır: ilerleme 0 → 0,55 zamanla bir kez oynar
// (ham çubuk aynada döner, kalem ilerler, tav renkli talaş kıvrılır, profil kademelenir), sonra parça döner.
// Aşağıdaki C (taşlama) ve D (talaş tüneli) aşamaları ilerleme 0,58'in üstündedir; sayfa oraya gitmez.
// Dışarıya: createScene(canvas, opts) → { setProgress(p), setFinal(t|null), start(), stop(), resize(), renderOnce() }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { loadEnv } from '../../shared/lib3d.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Tav renkleri: taze talaş saman sarısı, ısındıkça bronz, mor, mavi
const TAV = ['#f3dc9a', '#dcaa48', '#b8672f', '#8a3fb8', '#5a3fd0', '#2f66d8', '#9aaac4'];
function tavColor(f, out) {
  const n = TAV.length - 1;
  const x = clamp01(f) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const a = new THREE.Color(TAV[i]);
  const b = new THREE.Color(TAV[i + 1]);
  return out.copy(a).lerp(b, x - i);
}

function canvasTex(w, h, draw, srgb = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createScene(canvas, { phone = false, low = false, sabitKamera = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1;
  pmrem.dispose();
  // aydınlık atölye HDRI'si: tornalanan çelikte tavan ışığı yansımaları
  let envBase = 1;
  loadEnv('workshop', renderer, { quality: phone || low ? 'lo' : 'hi' })
    .then((tex) => {
      scene.environment = tex;
      scene.environmentRotation.set(0, -0.6, 0);
      envBase = 1.3;
    })
    .catch(() => {});

  const camera = new THREE.PerspectiveCamera(phone ? 44 : 30, 1, 0.03, 220);
  const UP_ANGLE = phone ? 0.95 : 0; // telefonda mil çapraz dursun, dikey ekranı doldursun

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 20 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9d6ff, 0.8);
  rim.position.set(-5, 2, -4);
  scene.add(rim);
  const hot = new THREE.PointLight(0xff9a3c, 0, 6, 1.6);
  scene.add(hot);

  const world = new THREE.Group();
  scene.add(world);

  // ---------------------------------------------------------------- iş parçası (profilden üretilen torna yüzeyi)
  const NX = low ? 120 : 170;
  const NS = low ? 44 : 64;
  const X0 = -2.7, X1 = 3.0;
  const RAW = 1.0, TURN = 0.94;
  const vcount = NX * (NS + 1);
  const pos = new Float32Array(vcount * 3);
  const nor = new Float32Array(vcount * 3);
  const col = new Float32Array(vcount * 3);
  const uv = new Float32Array(vcount * 2);
  const cs = [], sn = [];
  for (let j = 0; j <= NS; j++) {
    const a = (j / NS) * Math.PI * 2;
    cs.push(Math.cos(a));
    sn.push(Math.sin(a));
  }
  const noise = new Float32Array(vcount);
  for (let i = 0; i < vcount; i++) noise[i] = Math.random();
  const idx = [];
  for (let i = 0; i < NX - 1; i++) {
    for (let j = 0; j < NS; j++) {
      const a = i * (NS + 1) + j, b = a + NS + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j <= NS; j++) {
      const k = i * (NS + 1) + j;
      uv[k * 2] = i / (NX - 1);
      uv[k * 2 + 1] = j / NS;
    }
  }
  const partGeo = new THREE.BufferGeometry();
  partGeo.setIndex(idx);
  partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  partGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  partGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  partGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // İlerleme izi: eksen boyunca ince çizgiler (pürüzlülük haritası)
  const feedMarks = canvasTex(1024, 4, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = 150 + 70 * Math.sin(x * 1.9) + Math.random() * 30;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, 0, 1, h);
    }
  });
  feedMarks.repeat.set(3, 1);
  const partMat = new THREE.MeshStandardMaterial({
    vertexColors: true, metalness: 1, roughness: 0.34, roughnessMap: feedMarks,
  });
  const part = new THREE.Mesh(partGeo, partMat);
  world.add(part);

  // Numune profili: flanş, yatak yeri, kanal, oturma yeri, diş, pah
  function stepped(x) {
    if (x < -1.42) return 0.94;
    if (x < -1.36) return lerp(0.94, 0.64, (x + 1.42) / 0.06);
    if (x < -0.32) return 0.62;
    if (x < -0.14) return 0.5;
    if (x < -0.08) return lerp(0.5, 0.76, (x + 0.14) / 0.06);
    if (x < 1.18) return 0.76;
    if (x < 1.3) return lerp(0.76, 0.56, (x - 1.18) / 0.12);
    if (x < 2.35) {
      const ph = ((x - 1.3) / 0.11) % 1;
      return 0.5 + 0.06 * (1 - Math.abs(ph * 2 - 1)); // diş
    }
    if (x < 2.5) return lerp(0.53, 0.4, (x - 2.35) / 0.15);
    if (x < 2.62) return 0.4;
    return 0;
  }

  const rArr = new Float32Array(NX);
  const cScale = new THREE.Color('#3b3a3f');
  const cScale2 = new THREE.Color('#5a4a3c');
  const cBright = new THREE.Color('#e9ecf1');
  const tmpC = new THREE.Color();
  let lastFeed = -1, lastProf = -1;
  function updatePart(feed, prof) {
    if (Math.abs(feed - lastFeed) < 1e-4 && Math.abs(prof - lastProf) < 1e-4) return;
    lastFeed = feed;
    lastProf = prof;
    const toolX = lerp(X1 + 0.06, -2.3, feed);
    const turned = new Float32Array(NX);
    for (let i = 0; i < NX; i++) {
      const x = X0 + ((X1 - X0) * i) / (NX - 1);
      const t = smooth(toolX - 0.015, toolX + 0.035, x);
      turned[i] = t;
      let r = lerp(RAW, TURN, t);
      r = lerp(r, stepped(x), prof);
      if (i === NX - 1) r = 0;
      rArr[i] = r;
    }
    const dx = (X1 - X0) / (NX - 1);
    for (let i = 0; i < NX; i++) {
      const x = X0 + dx * i;
      const r = rArr[i];
      const d = (rArr[Math.min(NX - 1, i + 1)] - rArr[Math.max(0, i - 1)]) / (dx * (i === 0 || i === NX - 1 ? 1 : 2));
      const inv = 1 / Math.sqrt(1 + d * d);
      const bright = Math.max(turned[i], prof);
      for (let j = 0; j <= NS; j++) {
        const k = i * (NS + 1) + j;
        pos[k * 3] = x;
        pos[k * 3 + 1] = r * cs[j];
        pos[k * 3 + 2] = r * sn[j];
        nor[k * 3] = -d * inv;
        nor[k * 3 + 1] = cs[j] * inv;
        nor[k * 3 + 2] = sn[j] * inv;
        const nz = noise[k];
        tmpC.copy(cScale).lerp(cScale2, nz * nz).multiplyScalar(0.7 + nz * 0.5).lerp(cBright, bright);
        col[k * 3] = tmpC.r;
        col[k * 3 + 1] = tmpC.g;
        col[k * 3 + 2] = tmpC.b;
      }
    }
    partGeo.attributes.position.needsUpdate = true;
    partGeo.attributes.normal.needsUpdate = true;
    partGeo.attributes.color.needsUpdate = true;
    partGeo.computeBoundingSphere();
  }

  // ---------------------------------------------------------------- torna: ayna, fener mili, kızak
  // Emaye boyalı döküm, taşlanmış kızak yolları, üç ayaklı ayna (kademeli ayaklar, anahtar yuvaları),
  // kalemlik ve eşkenar dörtgen karbür uç.
  const castTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#808080';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 110 + Math.random() * 60;
      g.fillStyle = `rgba(${v},${v},${v},.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
  castTex.repeat.set(3, 3);
  const enamel = new THREE.MeshStandardMaterial({ color: '#d5d9df', metalness: 0.1, roughness: 0.38, roughnessMap: castTex });
  const enamelLight = new THREE.Color('#d5d9df'), enamelNight = new THREE.Color('#34343f');
  const enamelDark = new THREE.MeshStandardMaterial({ color: '#2a2d35', metalness: 0.35, roughness: 0.45 });
  const steelDark = new THREE.MeshStandardMaterial({ color: '#6c7079', metalness: 1, roughness: 0.3 });
  const ground = new THREE.MeshStandardMaterial({ color: '#c3c7cf', metalness: 1, roughness: 0.16 });
  const chuck = new THREE.Group();
  {
    // ayna gövdesi: arka flanş, gövde, pahlar, ön yüz girintisi (x ekseni boyunca döndürülmüş profil)
    const prof = [
      [0.0, -3.62], [1.05, -3.62], [1.1, -3.56], [1.1, -3.4], [1.52, -3.34], [1.6, -3.26], [1.6, -2.84],
      [1.54, -2.76], [1.3, -2.74], [1.26, -2.72], [0.46, -2.72], [0.42, -2.76], [0.0, -2.76],
    ].map(([r, x]) => new THREE.Vector2(r, x));
    const g = new THREE.LatheGeometry(prof, low ? 48 : 96);
    g.rotateZ(-Math.PI / 2);
    const bodyM = new THREE.MeshStandardMaterial({ color: '#8a9099', metalness: 1, roughness: 0.34 });
    chuck.add(new THREE.Mesh(g, bodyM));
    // ön yüzde ayak kanalları ve anahtar yuvaları
    const jawMat = new THREE.MeshStandardMaterial({ color: '#b9bec7', metalness: 1, roughness: 0.24 });
    const slotMat = new THREE.MeshStandardMaterial({ color: '#3b3f47', metalness: 0.8, roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const jaw = new THREE.Group();
      // kademeli ayak: üç basamak (iç yüz parçayı r = 1,0'da sıkar)
      for (const [x0, x1, y0, y1] of [[-2.72, -2.3, 1.0, 1.26], [-2.72, -2.44, 1.26, 1.44], [-2.72, -2.57, 1.44, 1.58]]) {
        const m = new THREE.Mesh(new RoundedBoxGeometry(x1 - x0, y1 - y0 + 0.01, 0.3, 2, 0.02), jawMat);
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
        jaw.add(m);
      }
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.1, 0.42), slotMat);
      slot.position.set(-2.715, 1.05, 0);
      jaw.add(slot);
      jaw.rotation.x = a;
      chuck.add(jaw);
      const key = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), slotMat);
      key.rotation.z = Math.PI / 2;
      key.position.set(-2.72, Math.cos(a + Math.PI / 3) * 1.1, Math.sin(a + Math.PI / 3) * 1.1);
      chuck.add(key);
    }
  }
  world.add(chuck);
  const head = new THREE.Mesh(new RoundedBoxGeometry(2.4, 4.2, 3.4, 3, 0.16), enamel);
  head.position.set(-4.95, -0.3, -0.2);
  world.add(head);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.3, 48), steelDark);
  nose.rotation.z = Math.PI / 2;
  nose.position.x = -3.72;
  world.add(nose);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.5, 1.2, 1, 0.02), enamelDark);
  plate.position.set(-3.74, 1.2, 0.9);
  world.add(plate);
  const bed = new THREE.Mesh(new RoundedBoxGeometry(12, 0.7, 2.2, 2, 0.08), enamel);
  bed.position.set(0.5, -2.35, -0.3);
  world.add(bed);
  const bedWay = new THREE.Mesh(new THREE.BoxGeometry(12, 0.12, 0.3), ground);
  bedWay.position.set(0.5, -1.94, 0.55);
  world.add(bedWay);
  const bedWay2 = bedWay.clone();
  bedWay2.position.z = -1.1;
  world.add(bedWay2);
  const vWay = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 12, 4, 1), ground);
  vWay.rotation.z = Math.PI / 2;
  vWay.rotation.x = Math.PI / 4;
  vWay.position.set(0.5, -1.98, -0.25);
  world.add(vWay);

  // Kalem: kalemlik bloğu, sap, eşkenar dörtgen (80°) TiN kaplı karbür uç
  const tool = new THREE.Group();
  const post = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.7, 0.62, 2, 0.04), enamelDark);
  post.position.set(0.28, 1.95, -0.3);
  tool.add(post);
  const holder = new THREE.Mesh(new RoundedBoxGeometry(0.3, 1.6, 0.34, 2, 0.03), steelDark);
  holder.position.set(0.12, 0.86, -0.12);
  holder.rotation.x = -0.18;
  tool.add(holder);
  const rh = new THREE.Shape();
  const A = (40 * Math.PI) / 180, L = 0.2;
  rh.moveTo(L * Math.cos(A), 0);
  rh.lineTo(0, L * Math.sin(A));
  rh.lineTo(-L * Math.cos(A), 0);
  rh.lineTo(0, -L * Math.sin(A));
  rh.closePath();
  const insGeo = new THREE.ExtrudeGeometry(rh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  insGeo.translate(0, 0, -0.03);
  const insert = new THREE.Mesh(insGeo, new THREE.MeshStandardMaterial({ color: '#d8a93f', metalness: 1, roughness: 0.22 }));
  insert.rotation.x = Math.PI / 2;
  insert.rotation.z = -0.6;
  insert.position.set(0.14, 0.1, 0);
  tool.add(insert);
  const clamp = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.08, 0.2, 1, 0.02), steelDark);
  clamp.position.set(0.14, 0.16, 0);
  tool.add(clamp);
  world.add(tool);

  // ---------------------------------------------------------------- talaş şeridi
  const CN = low ? 380 : 640;
  const chipPos = new Float32Array(CN * 2 * 3);
  const chipNor = new Float32Array(CN * 2 * 3);
  const chipCol = new Float32Array(CN * 2 * 3);
  const chipIdx = [];
  for (let k = 0; k < CN - 1; k++) {
    const a = k * 2;
    chipIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  for (let k = 0; k < CN; k++) {
    tavColor(Math.pow(k / CN, 0.8), tmpC);
    for (let s = 0; s < 2; s++) {
      const o = (k * 2 + s) * 3;
      chipCol[o] = tmpC.r;
      chipCol[o + 1] = tmpC.g;
      chipCol[o + 2] = tmpC.b;
    }
  }
  const chipGeo = new THREE.BufferGeometry();
  chipGeo.setIndex(chipIdx);
  chipGeo.setAttribute('position', new THREE.BufferAttribute(chipPos, 3));
  chipGeo.setAttribute('normal', new THREE.BufferAttribute(chipNor, 3));
  chipGeo.setAttribute('color', new THREE.BufferAttribute(chipCol, 3));
  chipGeo.boundingSphere = new THREE.Sphere(V(0, 0, 0), 30);
  const chipMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
  const chip = new THREE.Mesh(chipGeo, chipMat);
  chip.frustumCulled = false;
  world.add(chip);
  const chipAxis = V(0.28, 0.82, 0.5).normalize();
  const cb1 = new THREE.Vector3().crossVectors(chipAxis, V(1, 0, 0)).normalize();
  const cb2 = new THREE.Vector3().crossVectors(chipAxis, cb1).normalize();
  const tipW = new THREE.Vector3();
  function updateChip(tip, n, phase) {
    const RHO = 0.24, DT = 0.17, PITCH = 0.021, W = 0.05;
    const c0 = Math.cos(phase), s0 = Math.sin(phase);
    for (let k = 0; k < n; k++) {
      const th = phase - k * DT;
      const ramp = Math.min(1, k / 16);
      const rho = RHO * ramp * (1 + k * 0.0006);
      const c = Math.cos(th), s = Math.sin(th);
      const along = k * DT * PITCH;
      const rx = c * cb1.x + s * cb2.x, ry = c * cb1.y + s * cb2.y, rz = c * cb1.z + s * cb2.z;
      const ox = rho * rx - RHO * ramp * (c0 * cb1.x + s0 * cb2.x);
      const oy = rho * ry - RHO * ramp * (c0 * cb1.y + s0 * cb2.y);
      const oz = rho * rz - RHO * ramp * (c0 * cb1.z + s0 * cb2.z);
      const cx = tip.x + chipAxis.x * along + ox;
      const cy = tip.y + chipAxis.y * along + oy;
      const cz = tip.z + chipAxis.z * along + oz;
      const w = W * (0.4 + 0.6 * ramp);
      for (let sd = 0; sd < 2; sd++) {
        const sg = sd ? 1 : -1;
        const o = (k * 2 + sd) * 3;
        chipPos[o] = cx + chipAxis.x * w * sg;
        chipPos[o + 1] = cy + chipAxis.y * w * sg;
        chipPos[o + 2] = cz + chipAxis.z * w * sg;
        chipNor[o] = rx;
        chipNor[o + 1] = ry;
        chipNor[o + 2] = rz;
      }
    }
    chipGeo.setDrawRange(0, Math.max(0, n - 1) * 6);
    chipGeo.attributes.position.needsUpdate = true;
    chipGeo.attributes.normal.needsUpdate = true;
  }

  // ---------------------------------------------------------------- taşlama taşı + kıvılcım
  const grit = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7d7478';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const v = 60 + Math.random() * 150;
      g.fillStyle = `rgba(${v},${v - 14},${v - 8},.9)`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  }, true);
  const wheelR = 2.3;
  const wheel = new THREE.Group();
  const wheelMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(wheelR, wheelR, 0.62, 72, 1),
    [new THREE.MeshStandardMaterial({ map: grit, roughness: 1, metalness: 0 }), new THREE.MeshStandardMaterial({ map: grit, color: '#b9a9b0', roughness: 0.95, metalness: 0 }), new THREE.MeshStandardMaterial({ map: grit, color: '#b9a9b0', roughness: 0.95, metalness: 0 })]
  );
  wheelMesh.rotation.z = Math.PI / 2;
  wheel.add(wheelMesh);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(wheelR + 0.25, wheelR + 0.25, 0.9, 48, 1, true, 0, Math.PI), enamel);
  guard.material = enamel.clone();
  guard.material.side = THREE.DoubleSide;
  guard.rotation.z = Math.PI / 2;
  guard.rotation.y = Math.PI;
  wheel.add(guard);
  world.add(wheel);
  const WHEEL_X = -0.85;

  const SN = low ? 200 : 420;
  const spPos = new Float32Array(SN * 3);
  const spCol = new Float32Array(SN * 3);
  const spVel = new Float32Array(SN * 3);
  const spAge = new Float32Array(SN);
  const spLife = new Float32Array(SN);
  for (let i = 0; i < SN; i++) {
    spAge[i] = Math.random();
    spLife[i] = 0.35 + Math.random() * 0.55;
  }
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  spGeo.boundingSphere = new THREE.Sphere(V(0, 0, 0), 30);
  const dot = canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
  const spMat = new THREE.PointsMaterial({
    size: phone ? 0.12 : 0.1, map: dot, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const sparks = new THREE.Points(spGeo, spMat);
  sparks.frustumCulled = false;
  world.add(sparks);
  const sparkOrigin = V(WHEEL_X, -0.1, -0.6);
  const hotC = new THREE.Color('#fff1c4');
  const warmC = new THREE.Color('#ff7a1c');
  function respawn(i) {
    const o = i * 3;
    spPos[o] = sparkOrigin.x + (Math.random() - 0.5) * 0.55;
    spPos[o + 1] = sparkOrigin.y;
    spPos[o + 2] = sparkOrigin.z;
    spVel[o] = (Math.random() - 0.5) * 2.4;
    spVel[o + 1] = -1.2 - Math.random() * 2.8;
    spVel[o + 2] = 2.2 + Math.random() * 3.6;
    spAge[i] = 0;
    spLife[i] = 0.3 + Math.random() * 0.6;
  }
  function updateSparks(dt, amt) {
    for (let i = 0; i < SN; i++) {
      spAge[i] += dt;
      if (spAge[i] > spLife[i]) {
        if (Math.random() < amt) respawn(i);
        else {
          spCol[i * 3] = spCol[i * 3 + 1] = spCol[i * 3 + 2] = 0;
          continue;
        }
      }
      const o = i * 3;
      spVel[o + 1] -= 9 * dt;
      spPos[o] += spVel[o] * dt;
      spPos[o + 1] += spVel[o + 1] * dt;
      spPos[o + 2] += spVel[o + 2] * dt;
      const f = spAge[i] / spLife[i];
      tmpC.copy(hotC).lerp(warmC, Math.min(1, f * 1.6)).multiplyScalar((1 - f * f) * 2.2);
      spCol[o] = tmpC.r;
      spCol[o + 1] = tmpC.g;
      spCol[o + 2] = tmpC.b;
    }
    spGeo.attributes.position.needsUpdate = true;
    spGeo.attributes.color.needsUpdate = true;
  }

  // ---------------------------------------------------------------- talaş tüneli
  const T0 = V(0, 0, -120);
  const tunnel = new THREE.Group();
  tunnel.position.copy(T0);
  {
    const TURNS = low ? 20 : 28, PER = low ? 36 : 56, N = TURNS * PER;
    const R = 1.25, PITCH = 0.95, W = 0.34;
    const p = new Float32Array(N * 2 * 3), nn = new Float32Array(N * 2 * 3), cc = new Float32Array(N * 2 * 3);
    const ii = [];
    for (let k = 0; k < N; k++) {
      const th = (k / PER) * Math.PI * 2;
      const z = -(k / PER) * PITCH;
      const c = Math.cos(th), s = Math.sin(th);
      const rr = R * (1 + 0.06 * Math.sin(k * 0.05));
      tavColor((Math.sin(k / N * Math.PI * 3.2 - 1.2) + 1) / 2, tmpC);
      for (let sd = 0; sd < 2; sd++) {
        const o = (k * 2 + sd) * 3;
        const tilt = sd ? W : -W;
        p[o] = c * rr;
        p[o + 1] = s * rr;
        p[o + 2] = z + tilt;
        nn[o] = -c;
        nn[o + 1] = -s;
        nn[o + 2] = 0;
        cc[o] = tmpC.r;
        cc[o + 1] = tmpC.g;
        cc[o + 2] = tmpC.b;
      }
      if (k < N - 1) {
        const a = k * 2;
        ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setIndex(ii);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.18, side: THREE.DoubleSide }));
    tunnel.add(m);
    tunnel.userData.len = TURNS * PITCH;
  }
  const tunLight = new THREE.PointLight(0xffe2b0, 0, 9, 1.2);
  tunnel.add(tunLight);
  scene.add(tunnel);
  tunnel.visible = false;

  world.traverse((o) => {
    if (o.isMesh && o !== chip) {
      o.castShadow = o !== bed;
      o.receiveShadow = true;
    }
  });
  part.castShadow = true;

  // ---------------------------------------------------------------- kamera anahtarları
  const K = phone
    ? {
        hero: [V(1.6, 2.6, 15.5), V(-0.6, -0.4, 0)],
        grind: [V(2.4, 1.3, 3.6), V(-0.9, -0.2, -0.6)],
        prof: [V(0.6, 1.4, 9.8), V(0.25, 0, 0)],
      }
    : {
        hero: [V(7.2, 2.6, 8.6), V(0.2, -0.3, 0)],
        grind: [V(2.2, 1.1, 3.0), V(-0.95, -0.2, -0.6)],
        prof: [V(-0.4, 1.3, 8.4), V(-0.9, 0, 0)],
      };
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  const tp = new THREE.Vector3(), tt = new THREE.Vector3();
  const upBase = V(Math.sin(UP_ANGLE), Math.cos(UP_ANGLE), 0);

  // ---------------------------------------------------------------- durum
  let target = 0, cur = 0, finalT = null, finalCur = 0;
  let running = false, raf = 0, last = performance.now(), time = 0;
  let spin = 0, chipPhase = 0;
  let vw = 1, vh = 1, lastOx = -9, lastOy = -9;

  function frame(dt) {
    time += dt;
    cur += (target - cur) * Math.min(1, dt * 5);
    const p = cur;
    const fin = finalT !== null;
    if (fin) finalCur += (finalT - finalCur) * Math.min(1, dt * 4);

    const feed = fin ? 1 : smooth(0.13, 0.4, p);
    const prof = fin ? 1 : smooth(0.44, 0.58, p);
    const dark = fin ? 1 : smooth(0.58, 0.65, p);
    const grind = fin ? 0 : smooth(0.6, 0.67, p) * (1 - smooth(0.78, 0.82, p));
    const polish = fin ? 1 : smooth(0.64, 0.78, p);
    const tun = fin ? 0 : smooth(0.81, 1, p);
    const inTunnel = !fin && p > 0.8;

    // dönüş
    const rpm = 2.4 + feed * 1.6 + grind * 2;
    spin += dt * rpm;
    part.rotation.x = spin;
    chuck.rotation.x = spin;
    wheelMesh.rotation.y -= dt * 9 * grind;

    updatePart(feed, prof);
    partMat.roughness = lerp(0.36, 0.06, polish);
    scene.environmentIntensity = lerp(envBase, 0.5, dark);
    enamel.color.copy(enamelLight).lerp(enamelNight, dark);
    key.intensity = lerp(1.6, 0.35, dark);
    rim.intensity = lerp(0.8, 1.6, dark);

    // kalem: iler, sonra kalk ve çekil
    const toolX = lerp(X1 + 0.06, -2.3, feed);
    const retract = fin ? 1 : smooth(0.4, 0.47, p);
    tool.position.set(toolX, TURN + retract * 3.2, retract * -1.5);
    tool.visible = !fin && retract < 0.999;
    const chipN = Math.floor(CN * Math.min(1, smooth(0.13, 0.3, p) * 1.05));
    chip.visible = tool.visible && chipN > 2;
    if (chip.visible) {
      chipPhase += dt * rpm * 1.6;
      tipW.set(toolX + 0.08, TURN + 0.05 + retract * 3.2, 0.1 + retract * -1.5);
      updateChip(tipW, chipN, chipPhase);
    }

    // taş
    const wIn = fin ? 0 : smooth(0.58, 0.66, p) * (1 - smooth(0.79, 0.83, p));
    wheel.visible = wIn > 0.001;
    wheel.position.set(WHEEL_X, 0, lerp(-9, -(0.62 + wheelR + 0.005), wIn));
    sparks.visible = grind > 0.02;
    if (sparks.visible) updateSparks(Math.min(dt, 0.05), grind);
    hot.intensity = grind * 5;
    hot.position.set(WHEEL_X, 0.1, 0.4);

    // kamera
    if (fin) {
      const a = -0.75 + finalCur * 1.1 + time * 0.06;
      const R = phone ? 10.5 : 8.2;
      camPos.set(Math.sin(a) * R + 0.2, 1.4 + finalCur * 0.4, Math.cos(a) * R);
      camTgt.set(phone ? 0.3 : 0.9, phone ? -0.6 : -0.1, 0);
      camera.up.copy(upBase);
    } else if (inTunnel) {
      const L = tunnel.userData.len;
      const z = lerp(2.5, -L + 3, tun);
      camPos.set(T0.x + Math.sin(time * 0.5) * 0.12, T0.y + Math.cos(time * 0.4) * 0.1, T0.z + z);
      camTgt.set(T0.x + Math.sin(tun * 5) * 0.3, T0.y + Math.cos(tun * 4) * 0.2, T0.z + z - 5);
      const roll = tun * Math.PI * 1.2 + UP_ANGLE;
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      tunLight.position.set(0, 0, z - 2.5);
      tunLight.intensity = 14;
    } else {
      // kahraman → kalem takibi → profil → taşlama
      // sabitKamera: künyede kamera açılış kadrajında kalır, iş parçası kadrajın içinde işlenir.
      const w1 = sabitKamera ? 0 : smooth(0.1, 0.2, p) * (1 - smooth(0.38, 0.46, p));
      const w2 = sabitKamera ? 0 : smooth(0.38, 0.46, p);
      const w3 = sabitKamera ? 0 : smooth(0.55, 0.64, p);
      const follow = phone
        ? [V(toolX + 1.6, 2.6, 5.4), V(toolX - 0.2, 0.9, 0)]
        : [V(toolX + 1.5, 2.1, 4.0), V(toolX - 0.6, 0.75, 0)];
      camPos.copy(K.hero[0]);
      camTgt.copy(K.hero[1]);
      camPos.lerp(follow[0], w1);
      camTgt.lerp(follow[1], w1);
      tp.copy(K.prof[0]).applyAxisAngle(V(0, 1, 0), Math.sin(p * 9) * 0.12);
      camPos.lerp(tp, w2 * (1 - w3));
      camTgt.lerp(K.prof[1], w2 * (1 - w3));
      camPos.lerp(K.grind[0], w3);
      camTgt.lerp(K.grind[1], w3);
      // nefes
      camPos.y += Math.sin(time * 0.6) * 0.04;
      camera.up.copy(upBase);
    }
    // kadraj kaydırma: masaüstünde nesne sağda (yazı solda), telefonda yazının karşı tarafında
    let ox = 0, oy = 0;
    if (!phone) {
      ox = fin ? 0.16 : inTunnel ? 0.12 * (1 - tun) : sabitKamera ? 0.36 : lerp(0.36, 0.2, smooth(0.1, 0.2, p));
    } else {
      // Telefonda künye ekranın altında: parça üst yarıda durur.
      oy = fin ? -0.12 : inTunnel ? 0 : -0.24;
    }
    if (Math.abs(ox - lastOx) > 1e-4 || Math.abs(oy - lastOy) > 1e-4) {
      lastOx = ox;
      lastOy = oy;
      camera.setViewOffset(vw, vh, -ox * vw, -oy * vh, vw, vh);
    }
    world.visible = !inTunnel;
    tunnel.visible = inTunnel;
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(dt);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    vw = w;
    vh = h;
    lastOx = lastOy = -9;
    camera.fov = w / h < 0.8 ? 44 : 30;
    camera.updateProjectionMatrix();
  }
  resize();
  updatePart(0, 0);

  return {
    setProgress(p) {
      target = p;
    },
    jump(p) {
      target = cur = p;
    },
    setFinal(t) {
      if (t === null) {
        finalT = null;
        return;
      }
      if (finalT === null) finalCur = t;
      finalT = t;
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce() {
      cur = target;
      frame(0.016);
    },
    resize,
  };
}
