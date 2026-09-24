// Kodla çizilmiş gece yolu: sodyum lambalı çevre yolu, emniyet şeridinde dörtlüleri yanan bir otomobil
// ve tepe lambası dönen kayar kasalı çekici. Kasa eğilip geriye kayar, vinç otomobili kasaya çeker.
// Sahne durumu dışarıdan `update(state)` ile verilir; kamera ve kurgu main.js'te.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Yol x ekseni boyunca. Araçlar +x yönüne bakar. Emniyet şeridi z ≈ +3.2.
export const ROAD = { z0: -6.2, z1: 4.6, shoulder: 3.25, lane: 1.2, len: 520 };
export const CAR_X = 0;
export const TRUCK_STOP = 8.9; // çekicinin durduğu yer (x)

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

function glowTex(inner = 'rgba(255,190,90,1)', outer = 'rgba(255,140,30,0)') {
  return canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, inner);
    gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)'));
    gr.addColorStop(1, outer);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
}

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.2 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const NIGHT = new THREE.Color(0x0a1230);
  scene.fog = new THREE.Fog(0x0e1634, 30, 150);

  // Gökyüzü: üstte lacivert, ufukta şehir ışığının turuncu sisi
  const sky = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#04071a');
    gr.addColorStop(0.5, '#0b1437');
    gr.addColorStop(0.78, '#2a2440');
    gr.addColorStop(0.9, '#6a3b2a');
    gr.addColorStop(1, '#0e1634');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 16),
    new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(skyMesh);
  scene.background = NIGHT;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.18;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0x5467a8, 0x100c10, 0.9));
  const moon = new THREE.DirectionalLight(0x9fb2ff, 0.7);
  moon.position.set(-20, 30, -30);
  scene.add(moon);
  // Sahnenin üstündeki sodyum lamba: turuncu anahtar ışık
  const sodium = new THREE.PointLight(0xffa24a, 60, 40, 1.6);
  sodium.position.set(3.5, 9, -3.5);
  scene.add(sodium);
  // Yükleme sırasında ekibin çalışma projektörü
  const work = new THREE.SpotLight(0xfff1dc, 0, 22, 0.75, 0.6, 1.2);
  work.position.set(-2, 6, 7);
  work.target.position.set(4, 0, 3);
  scene.add(work, work.target);

  // --- Malzemeler -----------------------------------------------------------
  const M = {
    asphalt: null,
    ground: new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 1 }),
    cab: new THREE.MeshStandardMaterial({ color: 0xffb21e, roughness: 0.32, metalness: 0.15 }),
    cabDark: new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.5, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x5b6270, roughness: 0.42, metalness: 0.75 }),
    deck: null,
    rubber: new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xa9b0ba, roughness: 0.3, metalness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0b1224, roughness: 0.08, metalness: 0.6, emissive: 0x1a2644, emissiveIntensity: 0.4 }),
    car: new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.28, metalness: 0.35 }),
    head: new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0xfff4de, emissiveIntensity: 2.4, roughness: 0.1 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x3a0a0e, emissive: 0xff2a1e, emissiveIntensity: 1.2, roughness: 0.2 }),
    amber: new THREE.MeshStandardMaterial({ color: 0x5a3208, emissive: 0xff9a14, emissiveIntensity: 0, roughness: 0.2 }),
    beacon: new THREE.MeshStandardMaterial({ color: 0x6a3a00, emissive: 0xffa010, emissiveIntensity: 2, roughness: 0.2, transparent: true, opacity: 0.95 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x8b93a0, roughness: 0.35, metalness: 0.9 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.6, metalness: 0.5 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffc27a }),
    strap: new THREE.MeshStandardMaterial({ color: 0xff7a00, roughness: 0.7, emissive: 0x401800 }),
    cable: new THREE.LineBasicMaterial({ color: 0xd8dde6 }),
    chevron: null,
  };

  // Asfalt: şerit çizgileri, kenar çizgisi, emniyet şeridi. u = yol boyunca (12 m tekrar), v = enine
  const W = ROAD.z1 - ROAD.z0;
  const vOf = (z) => (z - ROAD.z0) / W;
  const asphaltTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#1a1d24';
    g.fillRect(0, 0, w, h);
    // Doku: ince tanecik
    for (let i = 0; i < 5000; i++) {
      const s = Math.random();
      g.fillStyle = `rgba(${s > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + Math.random() * 0.05})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    const line = (z, dash, thick = 5, col = '#e9e4d6') => {
      const y = (1 - vOf(z)) * h;
      g.fillStyle = col;
      if (!dash) g.fillRect(0, y - thick / 2, w, thick);
      else for (let x = 0; x < w; x += 128) g.fillRect(x + 10, y - thick / 2, 64, thick);
    };
    line(ROAD.z1 - 1.9, false, 6);          // sağ kenar çizgisi (emniyet şeridi başı)
    line(-0.5, true, 5);                     // şerit ayrımı
    line(-3.6, false, 4, '#f0c24a');         // orta refüj sarısı
    line(ROAD.z0 + 0.25, false, 5);
    // Emniyet şeridi: çapraz taralı
    g.save();
    g.globalAlpha = 0.07;
    g.fillStyle = '#fff';
    const y0 = (1 - vOf(ROAD.z1)) * h, y1 = (1 - vOf(ROAD.z1 - 1.9)) * h;
    g.fillRect(0, y0, w, y1 - y0);
    g.restore();
  });
  asphaltTex.wrapS = THREE.RepeatWrapping;
  asphaltTex.repeat.set(ROAD.len / 12, 1);
  M.asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.78, metalness: 0.05 });

  // Kasa sacı: baklava desenli
  const deckTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#3a404b';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.18)';
    g.lineWidth = 3;
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) {
      g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 6, y + 10); g.stroke();
    }
  });
  deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
  deckTex.repeat.set(6, 2.4);
  M.deck = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.45, metalness: 0.7 });

  // Arka ikaz levhası: sarı-lacivert şerit
  const chevTex = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#ffb21e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#0c1633';
    for (let x = -h; x < w + h; x += 48) {
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill();
    }
  });
  M.chevron = new THREE.MeshStandardMaterial({ map: chevTex, roughness: 0.3, emissive: 0xffffff, emissiveMap: chevTex, emissiveIntensity: 0.25 });

  // --- Çevre ------------------------------------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 400), M.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD.len, W), M.asphalt);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, (ROAD.z0 + ROAD.z1) / 2);
  scene.add(road);

  // Bariyer: uzun ray + direkler
  const railZ = ROAD.z1 + 0.35;
  const railMesh = new THREE.Mesh(new THREE.BoxGeometry(ROAD.len, 0.32, 0.06), M.rail);
  railMesh.position.set(0, 0.62, railZ);
  scene.add(railMesh);
  const postGeo = new THREE.BoxGeometry(0.1, 0.75, 0.1);
  const POSTS = Math.floor(ROAD.len / 4);
  const posts = new THREE.InstancedMesh(postGeo, M.pole, POSTS);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < POSTS; i++) {
    mtx.makeTranslation(-ROAD.len / 2 + i * 4, 0.37, railZ + 0.08);
    posts.setMatrixAt(i, mtx);
  }
  scene.add(posts);

  // Sodyum lambalar: refüjde direk, iki kol, iki lamba; yolda ışık havuzu
  const LAMPS = Math.floor(ROAD.len / 32);
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.14, 10, 6);
  poleGeo.translate(0, 5, 0);
  const armGeo = new THREE.BoxGeometry(0.08, 0.08, 6.4);
  const headGeo = new THREE.BoxGeometry(0.7, 0.14, 0.34);
  const polesI = new THREE.InstancedMesh(poleGeo, M.pole, LAMPS);
  const armsI = new THREE.InstancedMesh(armGeo, M.pole, LAMPS);
  const headsI = new THREE.InstancedMesh(headGeo, M.lamp, LAMPS * 2);
  const poolTex = glowTex('rgba(255,170,80,0.9)', 'rgba(255,140,40,0)');
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 });
  const poolsI = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, LAMPS * 2);
  const haloMat = new THREE.SpriteMaterial({ map: glowTex('rgba(255,200,120,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 });
  const halos = new THREE.Group();
  const mz = -3.6;
  for (let i = 0; i < LAMPS; i++) {
    const x = -ROAD.len / 2 + 12 + i * 32;
    mtx.makeTranslation(x, 0, mz); polesI.setMatrixAt(i, mtx);
    mtx.makeTranslation(x, 9.9, mz); armsI.setMatrixAt(i, mtx);
    for (const [k, dz] of [[0, -3.0], [1, 3.0]]) {
      mtx.makeTranslation(x, 9.8, mz + dz); headsI.setMatrixAt(i * 2 + k, mtx);
      const s = new THREE.Matrix4().makeScale(13, 1, 11);
      s.setPosition(x, 0.02 + k * 0.001, mz + dz * 1.15);
      poolsI.setMatrixAt(i * 2 + k, s);
      const h = new THREE.Sprite(haloMat);
      h.position.set(x, 9.65, mz + dz);
      h.scale.setScalar(3.2);
      halos.add(h);
    }
  }
  scene.add(polesI, armsI, headsI, poolsI, halos);

  // Uzak şehir: ışık noktaları ve Atakule silueti
  const cityN = lite ? 900 : 1600;
  const cityPos = new Float32Array(cityN * 3);
  const cityCol = new Float32Array(cityN * 3);
  const cA = new THREE.Color(0xffb86b), cB = new THREE.Color(0xfff0d8), cC = new THREE.Color(0x9fb8ff);
  for (let i = 0; i < cityN; i++) {
    const x = (Math.random() - 0.5) * 520;
    const zz = -90 - Math.random() * 110;
    const hgt = Math.random() ** 3 * 14 + Math.max(0, 8 - Math.abs(x - 40) / 12) * Math.random();
    cityPos.set([x, hgt, zz], i * 3);
    const c = Math.random() < 0.6 ? cA : Math.random() < 0.8 ? cB : cC;
    cityCol.set([c.r, c.g, c.b], i * 3);
  }
  const cityGeo = new THREE.BufferGeometry();
  cityGeo.setAttribute('position', new THREE.BufferAttribute(cityPos, 3));
  cityGeo.setAttribute('color', new THREE.BufferAttribute(cityCol, 3));
  const city = new THREE.Points(cityGeo, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: true, vertexColors: true, fog: false, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(city);
  const silMat = new THREE.MeshBasicMaterial({ color: 0x070b1c, fog: false });
  const ataku = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 34, 10), silMat);
  shaft.position.y = 17;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12), silMat);
  ball.position.y = 36;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.14, 6, 32), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 36;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false }));
  tip.position.y = 44;
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 5, 6), silMat);
  spire.position.y = 41.5;
  ataku.add(shaft, ball, ring, spire, tip);
  ataku.position.set(70, 0, -170);
  scene.add(ataku);
  // Şehir siluet bandı
  const skyline = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const w = 4 + Math.random() * 10, h = 3 + Math.random() ** 2 * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), silMat);
    b.position.set(-260 + i * 7.6 + Math.random() * 4, h / 2, -205 - Math.random() * 20);
    skyline.add(b);
  }
  scene.add(skyline);

  // --- Tekerlek ----------------------------------------------------------------
  const wheelGeo = new THREE.CylinderGeometry(1, 1, 1, 22).rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.62, 0.62, 1.04, 12).rotateX(Math.PI / 2);
  function wheel(r, w) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(wheelGeo, M.rubber);
    t.scale.set(r, r, w);
    const rm = new THREE.Mesh(rimGeo, M.rim);
    rm.scale.set(r, r, w);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(r * 1.1, r * 0.16, w * 1.06), M.cabDark);
    g.add(t, rm, spoke);
    return g;
  }

  // --- Otomobil (sedan, beyaz) ------------------------------------------------
  const car = new THREE.Group();
  const carBody = new THREE.Group();
  car.add(carBody);
  const CAR_R = 0.33;
  const lower = new THREE.Mesh(new RoundedBoxGeometry(4.35, 0.62, 1.8, 3, 0.2), M.car);
  lower.position.y = CAR_R + 0.34;
  // Kabin: cam kuşak + boyalı tavan + eğimli kaput/bagaj geçişi
  const upper = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.5, 1.6, 3, 0.14), M.glass);
  upper.position.set(-0.25, CAR_R + 0.86, 0);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.1, 1.56, 2, 0.04), M.car);
  roof.position.set(-0.3, CAR_R + 1.13, 0);
  const pillarGeo = new THREE.BoxGeometry(0.1, 0.5, 1.62);
  const pA = new THREE.Mesh(pillarGeo, M.car);
  pA.position.set(0.1, CAR_R + 0.86, 0);
  const pC = new THREE.Mesh(pillarGeo, M.car);
  pC.position.set(-1.2, CAR_R + 0.86, 0);
  const winG = new THREE.Group();
  carBody.add(lower, upper, roof, pA, pC);
  const carWheels = [];
  for (const x of [1.35, -1.35]) for (const z of [0.78, -0.78]) {
    const w = wheel(CAR_R, 0.24);
    w.position.set(x, CAR_R, z);
    car.add(w);
    carWheels.push(w);
  }
  const hazards = [];
  for (const z of [0.66, -0.66]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.34), M.head);
    hl.position.set(2.18, CAR_R + 0.42, z);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.42), M.tail);
    tl.position.set(-2.18, CAR_R + 0.46, z);
    const af = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), M.amber);
    af.position.set(2.18, CAR_R + 0.42, z * 1.28);
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.16), M.amber);
    ar.position.set(-2.18, CAR_R + 0.46, z * 1.28);
    carBody.add(hl, tl, af, ar);
    hazards.push(af, ar);
  }
  // Dörtlü parıltıları
  const flareMat = new THREE.SpriteMaterial({ map: glowTex('rgba(255,170,40,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const flares = [];
  for (const [x, z] of [[2.25, 0.86], [2.25, -0.86], [-2.25, 0.86], [-2.25, -0.86]]) {
    const f = new THREE.Sprite(flareMat);
    f.position.set(x, CAR_R + 0.44, z);
    f.scale.setScalar(1.3);
    carBody.add(f);
    flares.push(f);
  }
  const hazardLight = new THREE.PointLight(0xff9a1a, 0, 9, 1.6);
  hazardLight.position.set(0, 1.2, 0);
  car.add(hazardLight);
  car.position.set(CAR_X, 0, ROAD.shoulder);
  scene.add(car);

  // Reflektör üçgeni (arabanın gerisinde)
  const triShape = new THREE.Shape();
  triShape.moveTo(-0.3, 0); triShape.lineTo(0.3, 0); triShape.lineTo(0, 0.52); triShape.lineTo(-0.3, 0);
  const triHole = new THREE.Path();
  triHole.moveTo(-0.18, 0.07); triHole.lineTo(0.18, 0.07); triHole.lineTo(0, 0.38); triHole.lineTo(-0.18, 0.07);
  triShape.holes.push(triHole);
  const triMat = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 0.9, side: THREE.DoubleSide });
  const tri = new THREE.Mesh(new THREE.ShapeGeometry(triShape), triMat);
  tri.rotation.y = -Math.PI / 2;
  tri.position.set(CAR_X - 9, 0.02, ROAD.shoulder - 0.2);
  scene.add(tri);

  // --- Çekici (kayar kasa) -----------------------------------------------------
  const truck = new THREE.Group();
  const TR = 0.5;
  // Şasi
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.28, 0.95), M.cabDark);
  chassis.position.set(0.1, 0.86, 0);
  truck.add(chassis);
  // Kabin
  const cab = new THREE.Group();
  const cabBox = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.9, 2.36, 3, 0.16), M.cab);
  cabBox.position.set(3.05, 1.92, 0);
  const cabLow = new THREE.Mesh(new RoundedBoxGeometry(2.05, 0.7, 2.4, 2, 0.12), M.cab);
  cabLow.position.set(3.12, 1.05, 0);
  const wind = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 2.1), M.glass);
  wind.position.set(4.01, 2.28, 0);
  const sideWinL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.04), M.glass);
  sideWinL.position.set(3.25, 2.3, 1.19);
  const sideWinR = sideWinL.clone();
  sideWinR.position.z = -1.19;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.5), M.cabDark);
  grille.position.set(4.02, 1.45, 0);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 2.4), M.steel);
  bumper.position.set(4.12, 0.78, 0);
  cab.add(cabBox, cabLow, wind, sideWinL, sideWinR, grille, bumper);
  // Kapıda şerit
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 2.38), M.chevron);
  stripe.position.set(3.0, 1.55, 0);
  cab.add(stripe);
  // Farlar
  for (const z of [0.85, -0.85]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.4), M.head);
    h.position.set(4.06, 1.25, z);
    cab.add(h);
  }
  // Tepe lambası (ışık çubuğu)
  const bar = new THREE.Group();
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.8), M.cabDark);
  const barLens = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.18, 1.7, 2, 0.06), M.beacon);
  barLens.position.y = 0.12;
  bar.add(barBase, barLens);
  bar.position.set(3.3, 2.92, 0);
  cab.add(bar);
  const beamTex = canvasTex(256, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(255,170,40,0.9)');
    gr.addColorStop(1, 'rgba(255,140,20,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, h * 0.42); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h * 0.58); g.fill();
  });
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.55, fog: false });
  const rot = new THREE.Group();
  rot.position.set(3.3, 3.08, 0);
  for (const [a, zz] of [[0, 0.55], [Math.PI, -0.55]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.4), beamMat);
    p.geometry.translate(2.75, 0, 0);
    const holder = new THREE.Group();
    holder.rotation.y = a;
    holder.position.z = zz;
    holder.add(p);
    const p2 = p.clone();
    p2.rotation.x = Math.PI / 2;
    holder.add(p2);
    rot.add(holder);
  }
  cab.add(rot);
  const beaconGlow = [];
  for (const z of [0.55, -0.55]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,180,50,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.set(3.3, 3.06, z);
    s.scale.setScalar(1.6);
    cab.add(s);
    beaconGlow.push(s);
  }
  const beaconLight = new THREE.PointLight(0xffa21a, 0, 16, 1.4);
  beaconLight.position.set(3.3, 3.4, 0);
  cab.add(beaconLight);
  // Far ışığı: gerçek spot + yolda havuz
  const headSpot = new THREE.SpotLight(0xfff1d8, 40, 40, 0.5, 0.5, 1.3);
  headSpot.position.set(4.2, 1.3, 0);
  headSpot.target.position.set(16, 0, 0);
  cab.add(headSpot, headSpot.target);
  const hpool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,245,225,0.8)', 'rgba(255,240,220,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  hpool.scale.set(12, 1, 5.5);
  hpool.position.set(10, 0.03, 0);
  cab.add(hpool);
  truck.add(cab);
  // Arka stop lambaları
  for (const z of [1.05, -1.05]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.3), M.tail);
    t.position.set(-3.72, 0.78, z);
    truck.add(t);
  }
  const under = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 2.3), M.chevron);
  under.position.set(-3.74, 0.6, 0);
  truck.add(under);

  // Tekerlekler
  const truckWheels = [];
  for (const x of [3.05, -1.55, -2.6]) for (const z of [0.98, -0.98]) {
    const w = wheel(TR, 0.36);
    w.position.set(x, TR, z);
    truck.add(w);
    truckWheels.push(w);
  }
  // Çamurluklar
  for (const x of [-2.08]) for (const z of [1.0, -1.0]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.5), M.cabDark);
    f.position.set(x, 1.08, z);
    truck.add(f);
  }

  // Kasa: pivot şasinin arkasında. Kasa yerel koordinatı: x ∈ [-0.6 - kay, 5.6 - kay]
  const BED_L = 6.1, BED_BACK = 0.55;
  const bedPivot = new THREE.Group();
  bedPivot.position.set(-3.1, 1.08, 0);
  truck.add(bedPivot);
  const bed = new THREE.Group();
  bedPivot.add(bed);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(BED_L, 0.1, 2.36), M.deck);
  deck.position.set(BED_L / 2 - BED_BACK, 0.12, 0);
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(BED_L, 0.22, 0.08), M.steel);
  sideL.position.set(BED_L / 2 - BED_BACK, 0.12, 1.2);
  const sideR = sideL.clone();
  sideR.position.z = -1.2;
  const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(BED_L - 0.4, 0.1, 0.02), M.chevron);
  sideStripe.position.set(BED_L / 2 - BED_BACK, 0.12, 1.25);
  const sideStripe2 = sideStripe.clone();
  sideStripe2.position.z = -1.25;
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 2.36), M.steel);
  headboard.position.set(BED_L - BED_BACK - 0.06, 0.6, 0);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2.3), M.steel);
  tail.position.set(-BED_BACK - 0.15, 0.08, 0);
  tail.rotation.z = 0.25;
  bed.add(deck, sideL, sideR, sideStripe, sideStripe2, headboard, tail);
  // Vinç tamburu kasanın başında
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 12).rotateX(Math.PI / 2), M.steel);
  drum.position.set(BED_L - BED_BACK - 0.3, 0.32, 0);
  bed.add(drum);
  const DECK_Y = 0.17; // kasa yüzeyi, kasa yerelinde
  const CAR_ON_BED = 2.3; // yüklü otomobilin merkezi, kasa yerelinde
  // Hidrolik pistonlar (görsel)
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), M.rim);
  truck.add(piston);

  // Kayış ve zincirler (yükleme sonunda görünür)
  const straps = [];
  for (const x of [1.35, -1.35]) for (const z of [0.78, -0.78]) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(CAR_R + 0.03, 0.035, 6, 20, Math.PI * 0.9), M.strap);
    s.position.set(x, CAR_R, z + Math.sign(z) * 0.14);
    s.rotation.z = Math.PI * 0.55;
    s.visible = false;
    car.add(s);
    straps.push(s);
  }

  // Vinç halatı
  const cableGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(1, 0, 0)]);
  const cable = new THREE.Line(cableGeo, M.cable);
  cable.frustumCulled = false;
  scene.add(cable);

  truck.position.set(TRUCK_STOP, 0, ROAD.shoulder);
  scene.add(truck);

  // Fotoğraf flaşı
  const flash = new THREE.PointLight(0xffffff, 0, 14, 1.2);
  scene.add(flash);

  // --- Durum ------------------------------------------------------------------
  let last = performance.now();
  let slowFrames = 0;
  let beaconA = 0;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  // s: { pos, look, fov, truckX, truckZ, truckYaw, speed, tilt (0..1), slide (0..1), winch (0..1),
  //      loaded (0..1), hazard, beacon, work, flash, flashPos, carX, straps }
  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(s.look);

    // Çekici konumu
    truck.position.set(s.truckX, 0, s.truckZ);
    truck.rotation.y = s.truckYaw || 0;
    for (const w of truckWheels) w.rotation.z -= s.speed * dt * 2.4;

    // Kasa: eğilir ve geriye kayar
    const theta = s.tilt * 0.335;
    bedPivot.rotation.z = theta;
    bed.position.x = -s.slide * 2.35;
    // Piston: şasiden eğilen kasanın altına (çekici yerelinde)
    const pA = tmp.set(-0.9, 0.95, 0);
    const pB = tmp2.set(bedPivot.position.x + 2.2 * Math.cos(theta), bedPivot.position.y + 2.2 * Math.sin(theta) - 0.02, 0);
    piston.position.copy(pA).add(pB).multiplyScalar(0.5);
    const dir = pB.sub(pA);
    piston.scale.set(1, Math.max(0.05, dir.length()), 1);
    piston.quaternion.setFromUnitVectors(UP, dir.normalize());
    piston.visible = s.tilt > 0.02;

    // Otomobil: vinç onu kasaya doğru çeker; her teker rampa çizgisinin yüksekliğine oturur
    const offX = bed.position.x;
    const finalX = () => bedPivot.localToWorld(tmp.set(CAR_ON_BED + offX, DECK_Y, 0)).x;
    if (s.loaded > 0) {
      const onBed = bedPivot.localToWorld(tmp.set(CAR_ON_BED + offX, DECK_Y, 0));
      car.position.copy(onBed);
      car.rotation.set(0, truck.rotation.y, bedPivot.rotation.z);
    } else if (s.winch > 0) {
      const P0 = bedPivot.localToWorld(tmp.set(-BED_BACK + offX, DECK_Y, 0));
      const tan = Math.tan(theta);
      const top = bedPivot.localToWorld(tmp2.set(BED_L - BED_BACK + offX, DECK_Y, 0));
      const h = (x) => (x < P0.x - 0.35 ? 0 : x > top.x ? top.y : Math.max(0, P0.y + (x - P0.x) * tan));
      const cx = THREE.MathUtils.lerp(s.carX ?? CAR_X, finalX(), s.winch);
      const hf = h(cx + 1.35), hr = h(cx - 1.35);
      car.position.set(cx, (hf + hr) / 2, truck.position.z);
      car.rotation.set(0, 0, Math.atan2(hf - hr, 2.7));
    } else {
      car.position.set(s.carX ?? CAR_X, 0, ROAD.shoulder);
      car.rotation.set(0, 0, 0);
    }
    for (const w of carWheels) w.rotation.z -= (s.carSpin || 0) * dt * 3;
    for (const st of straps) st.visible = s.straps > 0.5;

    // Halat: tamburdan otomobilin önüne
    const showCable = s.winch > 0 && s.loaded <= 0;
    cable.visible = showCable;
    if (showCable) {
      const a = bed.localToWorld(V(BED_L - BED_BACK - 0.3, 0.32, 0));
      const b = car.localToWorld(V(2.15, CAR_R + 0.1, 0));
      const arr = cable.geometry.attributes.position.array;
      arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
      cable.geometry.attributes.position.needsUpdate = true;
    }

    // Dörtlüler
    const blink = Math.sin(t * Math.PI * 2 * 0.9) > 0 ? 1 : 0;
    const hz = blink * s.hazard;
    M.amber.emissiveIntensity = hz * 4;
    flareMat.opacity = hz * 0.95;
    hazardLight.intensity = hz * 6;

    // Tepe lambası döner
    beaconA += dt * 7 * s.beacon;
    rot.rotation.y = beaconA;
    rot.visible = s.beacon > 0.01;
    const bp = 0.5 + 0.5 * Math.sin(beaconA * 2);
    M.beacon.emissiveIntensity = 0.4 + s.beacon * (1.5 + bp * 2.5);
    beamMat.opacity = s.beacon * 0.32;
    for (const g of beaconGlow) g.material.opacity = s.beacon * (0.35 + bp * 0.65);
    beaconLight.intensity = s.beacon * (4 + bp * 16);

    work.intensity = s.work * 80;
    work.position.set(s.truckX - 6, 6.5, ROAD.shoulder + 6);
    work.target.position.set(s.truckX - 5, 0.3, ROAD.shoulder);

    flash.intensity = s.flash * 90;
    if (s.flashPos) flash.position.copy(s.flashPos);

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.85) {
      dpr = Math.max(0.85, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, update, resize,
    compile: () => renderer.compile(scene, camera),
    car, truck,
  };
}
