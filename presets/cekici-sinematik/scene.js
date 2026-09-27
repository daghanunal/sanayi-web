// Gece yolu, foto-gerçekçi araçlarla: sodyum lambalı çevre yolu (kodla), lib3d `truck` + `tow_bed`
// (kayar kasalı çekici) ve lib3d `car` (emniyet şeridinde dörtlüleri yanan hatchback), `night` HDRI.
// Kasa eğilip geriye kayar, vinç otomobili kasaya çeker. Sahne durumu dışarıdan `update(state)` ile verilir.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Yol x ekseni boyunca. Araçlar +x yönüne bakar. Emniyet şeridi z ≈ +3.2.
export const ROAD = { z0: -6.2, z1: 4.6, shoulder: 3.25, lane: 1.2, len: 520 };
export const CAR_X = 0;
export const TRUCK_STOP = 11.4; // çekicinin durduğu yer (x)

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
  const q = lite ? 'lo' : pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  scene.environmentIntensity = 0.3;

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
  road.receiveShadow = true;
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


  // --- Işık: sahne başındaki sodyum lamba gölge düşürür; yükleme projektörü ------------
  const shadowSpot = new THREE.SpotLight(0xffb060, 0, 40, 0.7, 0.6, 1.2);
  shadowSpot.position.set(5, 13, -3.6);
  shadowSpot.target.position.set(5, 0, 3);
  shadowSpot.castShadow = !lite;
  shadowSpot.shadow.mapSize.set(1024, 1024);
  shadowSpot.shadow.bias = -0.0005;
  shadowSpot.shadow.normalBias = 0.03;
  scene.add(shadowSpot, shadowSpot.target);
  const flash = new THREE.PointLight(0xffffff, 0, 14, 1.2);
  scene.add(flash);

  // Temas gölgesi (araçların altında yumuşak leke)
  const blobTex = canvasTex(128, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.8)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const blob = (lx, lz) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    m.position.y = 0.015;
    return m;
  };

  // --- Çekici: lib3d truck + tow_bed aynı çerçevede ------------------------------------
  const rig = new THREE.Group();
  rig.position.set(-200, 0, ROAD.shoulder);
  scene.add(rig);
  const rigBlob = blob(8.2, 3.0);
  rigBlob.position.x = -0.6;
  rig.add(rigBlob);

  // Tepe lambası (kabin tavanında ışık çubuğu + dönen huzmeler)
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x6a3a00, emissive: 0xffa010, emissiveIntensity: 2, roughness: 0.2 });
  const bar = new THREE.Group();
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 1.8), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5, metalness: 0.5 }));
  const barLens = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 1.7), beaconMat);
  barLens.position.y = 0.1;
  bar.add(barBase, barLens);
  rig.add(bar);
  const beamTex = canvasTex(256, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, 'rgba(255,170,40,0.9)');
    gr.addColorStop(1, 'rgba(255,140,20,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, h * 0.42); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(0, h * 0.58); g.fill();
  });
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.4, fog: false });
  const rot = new THREE.Group();
  for (const [a, zz] of [[0, 0.55], [Math.PI, -0.55]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.3), beamMat);
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
  rig.add(rot);
  const beaconGlow = [];
  for (const z of [0.55, -0.55]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,180,50,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(1.5);
    s.userData.z = z;
    rig.add(s);
    beaconGlow.push(s);
  }
  const beaconLight = new THREE.PointLight(0xffa21a, 0, 16, 1.4);
  rig.add(beaconLight);
  const placeBeacon = (x, y) => {
    bar.position.set(x, y, 0);
    rot.position.set(x, y + 0.14, 0);
    beaconGlow.forEach((s) => s.position.set(x, y + 0.12, s.userData.z));
    beaconLight.position.set(x, y + 0.5, 0);
  };
  placeBeacon(2.2, 3.8);
  // Far: gerçek spot + yolda ışık havuzu
  const headSpot = new THREE.SpotLight(0xfff1d8, 45, 42, 0.5, 0.5, 1.3);
  headSpot.position.set(3.4, 1.0, 0);
  headSpot.target.position.set(16, 0, 0);
  rig.add(headSpot, headSpot.target);
  const hpool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,245,225,0.8)', 'rgba(255,240,220,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  hpool.scale.set(12, 1, 5.5);
  hpool.position.set(10, 0.03, 0);
  rig.add(hpool);

  // --- Otomobil: lib3d car, emniyet şeridinde --------------------------------------------
  const carG = new THREE.Group();
  carG.position.set(CAR_X, 0, ROAD.shoulder);
  scene.add(carG);
  const carBlob = blob(4.8, 2.3);
  carG.add(carBlob);
  const flareMat = new THREE.SpriteMaterial({ map: glowTex('rgba(255,170,40,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  const flares = [];
  for (const [x, z] of [[2.12, 0.72], [2.12, -0.72], [-2.08, 0.7], [-2.08, -0.7]]) {
    const f = new THREE.Sprite(flareMat);
    f.position.set(x, 0.72, z);
    f.scale.setScalar(1.1);
    carG.add(f);
    flares.push(f);
  }
  const hazardLight = new THREE.PointLight(0xff9a1a, 0, 9, 1.6);
  hazardLight.position.set(0, 1.2, 0);
  carG.add(hazardLight);

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

  // Kayışlar (yükleme sonunda tekerleri sabitler) ve vinç halatı
  const strapMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, roughness: 0.7, emissive: 0x401800 });
  const straps = [];
  const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xd8dde6 }));
  cable.frustumCulled = false;
  cable.visible = false;
  scene.add(cable);

  // --- Varlıklar ------------------------------------------------------------------------
  let TK = null, BED = null, CAR = null;
  const deck = { y: 0.082, rear: -1.74, front: 3.46, x0: 0 };
  let carAxle = 1.32, carFront = 2.17, xOn = 0.9;
  const ready = Promise.all([
    loadEnv('night', renderer, { quality: q }).then((env) => { scene.environment = env; }).catch(() => {}),
    loadAsset('truck', { quality: q, renderer, shadows: !lite }),
    loadAsset('tow_bed', { quality: q, renderer, shadows: !lite }),
    loadAsset('car', { quality: q, renderer, shadows: !lite }),
  ]).then(([, tk, bed, car]) => {
    TK = tk; BED = bed; CAR = car;
    rig.add(tk.scene, bed.scene);
    if (tk.nodes.fifth_wheel) tk.nodes.fifth_wheel.visible = false;
    // kabin: vurgu kehribarı; kasa: lacivert, kenarında turuncu-beyaz reflektör şerit
    tk.materials.paint.color.set('#f2a516');
    tk.materials.paint.roughness = 0.34;
    tk.materials.paint.metalness = 0.2;
    bed.materials.paint.color.set('#1a2750');
    for (const m of [tk.materials.light_head, bed.materials.light_head]) if (m?.emissive) { m.emissive.set('#fff3dc'); m.emissiveIntensity = 3; }
    for (const m of [tk.materials.light_tail, bed.materials.light_tail]) if (m?.emissive) m.emissiveIntensity = 1.4;
    car.materials.paint.color.set('#9b2226');
    car.materials.paint.metalness = 0.45;
    car.materials.paint.roughness = 0.3;
    if (car.materials.light_tail?.emissive) car.materials.light_tail.emissiveIntensity = 0.9;
    carG.add(car.scene);
    // kabin tavanı: tepe lambası tam üstüne otursun
    const cabBox = new THREE.Box3().setFromObject(tk.nodes.cab || tk.scene);
    placeBeacon((cabBox.min.x + cabBox.max.x) / 2 + 0.1, cabBox.max.y + 0.02);
    // kasa ölçüleri (kök kimlikte, kasa düz): güverte üstü y 1.328, kasa x +0.80 … −4.40
    rig.updateMatrixWorld(true);
    const n = bed.nodes;
    const sp = n.bed_slide.getWorldPosition(V(0, 0, 0)).sub(rig.position);
    deck.y = 1.328 - sp.y;
    deck.rear = -4.4 - sp.x;
    deck.front = 0.8 - sp.x;
    deck.x0 = n.bed_slide.position.x;
    carG.updateMatrixWorld(true);
    const wfl = car.nodes.wheel_FL ? car.nodes.wheel_FL.getWorldPosition(V(0, 0, 0)).sub(carG.position) : V(1.32, 0.3, 0.75);
    carAxle = Math.abs(wfl.x);
    const cb = new THREE.Box3().setFromObject(car.scene);
    carFront = cb.max.x - carG.position.x;
    xOn = deck.front - 0.45 - carFront;
    // kayışlar: tekerlerin önünde ve arkasında, kasa üstünde
    for (const ax of [carAxle, -carAxle]) for (const z of [0.76, -0.76]) for (const o of [-0.34, 0.34]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.2), strapMat);
      st.position.set(xOn + ax + o, deck.y + 0.012, z);
      st.visible = false;
      n.bed_slide.add(st);
      straps.push(st);
    }
  });

  // --- Durum ------------------------------------------------------------------
  let last = performance.now();
  let slowFrames = 0;
  let beaconA = 0;
  let lastTruckX = null, lastCarX = null;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const qTmp = new THREE.Quaternion();

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  function bedPose(tilt, slide, ramps) {
    const n = BED.nodes;
    const th = tilt * 0.22;
    n.bed_tilt.rotation.z = th;
    n.bed_slide.position.x = deck.x0 - slide * 2.8;
    for (const k of ['L', 'R']) {
      if (n['ramp_' + k]) n['ramp_' + k].rotation.z = (-Math.PI + th) * ramps;
      const ram = n['ram_' + k], anc = n['ram_anchor_' + k];
      if (!ram || !anc) continue;
      const pv = n.bed_tilt.position, c = Math.cos(th), s = Math.sin(th), a0 = anc.position;
      const ax = pv.x + a0.x * c - a0.y * s, ay = pv.y + a0.x * s + a0.y * c;
      ram.rotation.set(0, 0, Math.atan2(ay - ram.position.y, ax - ram.position.x));
      const rod = n['ram_' + k + '_rod'];
      if (rod) rod.position.x = Math.hypot(ax - ram.position.x, ay - ram.position.y) - (ram.userData.rod_rest || 0);
    }
    return th;
  }

  // s: { pos, look, fov, truckX, speed, tilt, slide, ramps, winch (0..1), loaded, hazard, beacon, work, flash, flashPos, carX, straps }
  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(s.look);

    rig.position.set(s.truckX, 0, ROAD.shoulder);
    if (TK) {
      if (lastTruckX != null) TK.roll(clamp(s.truckX - lastTruckX, -3, 3));
      lastTruckX = s.truckX;
      const th = bedPose(s.tilt || 0, s.slide || 0, s.ramps ?? s.slide ?? 0);
      rig.updateMatrixWorld(true);
      const slideN = BED.nodes.bed_slide;
      // otomobil
      if (s.loaded > 0) {
        carG.position.copy(slideN.localToWorld(tmp.set(xOn, deck.y, 0)));
        slideN.getWorldQuaternion(qTmp);
        carG.quaternion.copy(qTmp);
        carBlob.visible = false;
      } else if (s.winch > 0) {
        const A = slideN.localToWorld(tmp.set(deck.rear, deck.y, 0));
        const B = slideN.localToWorld(tmp2.set(xOn, deck.y, 0));
        const tan = Math.tan(th);
        const rampRun = Math.sqrt(Math.max(0.01, 1.6 * 1.6 - A.y * A.y));
        const foot = A.x - rampRun;
        const h = (x) => (x <= foot ? 0 : x < A.x ? (A.y * (x - foot)) / rampRun : A.y + (x - A.x) * tan);
        const cx = THREE.MathUtils.lerp(s.carX ?? CAR_X, B.x, s.winch);
        const hf = h(cx + carAxle), hr = h(cx - carAxle);
        carG.position.set(cx, (hf + hr) / 2, ROAD.shoulder);
        carG.rotation.set(0, 0, Math.atan2(hf - hr, 2 * carAxle));
        carBlob.visible = hr < 0.05;
      } else {
        carG.position.set(s.carX ?? CAR_X, 0, ROAD.shoulder);
        carG.rotation.set(0, 0, 0);
        carBlob.visible = true;
      }
      if (CAR && s.loaded <= 0) {
        if (lastCarX != null) CAR.roll(clamp(carG.position.x - lastCarX, -1, 1));
        lastCarX = carG.position.x;
      }
      straps.forEach((st) => (st.visible = s.straps > 0.5));
      // halat: tamburdan otomobilin önüne
      const showCable = s.winch > 0 && s.loaded <= 0 && BED.nodes.winch_drum;
      cable.visible = !!showCable;
      if (showCable) {
        const a = BED.nodes.winch_drum.getWorldPosition(tmp);
        const b = carG.localToWorld(tmp2.set(carFront - 0.05, 0.3, 0));
        const arr = cable.geometry.attributes.position.array;
        arr[0] = a.x; arr[1] = a.y; arr[2] = a.z; arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
        cable.geometry.attributes.position.needsUpdate = true;
        BED.nodes.winch_drum.rotation.z += (s.winching || 0) * dt * 6;
      }
      if (BED.materials.light_amber?.emissive) BED.materials.light_amber.emissiveIntensity = (s.beacon || 0) * (Math.sin(t * 9) > 0 ? 4 : 0.4);
    }

    // Dörtlüler
    const blink = Math.sin(t * Math.PI * 2 * 0.9) > 0 ? 1 : 0;
    const hz = blink * (s.hazard || 0);
    flareMat.opacity = hz * 0.95;
    hazardLight.intensity = hz * 6;

    // Tepe lambası döner
    beaconA += dt * 7 * (s.beacon || 0);
    rot.rotation.y = beaconA;
    rot.visible = (s.beacon || 0) > 0.01;
    const bp = 0.5 + 0.5 * Math.sin(beaconA * 2);
    beaconMat.emissiveIntensity = 0.4 + (s.beacon || 0) * (1.5 + bp * 2.5);
    beamMat.opacity = (s.beacon || 0) * 0.3;
    for (const g of beaconGlow) g.material.opacity = (s.beacon || 0) * (0.35 + bp * 0.65);
    beaconLight.intensity = (s.beacon || 0) * (4 + bp * 16);

    shadowSpot.intensity = 70;
    work.intensity = (s.work || 0) * 80;
    work.position.set(TRUCK_STOP - 6, 6.5, ROAD.shoulder + 6);
    work.target.position.set(TRUCK_STOP - 5, 0.3, ROAD.shoulder);

    flash.intensity = (s.flash || 0) * 90;
    if (s.flashPos) flash.position.copy(s.flashPos);

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40) {
      if (dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); resize(); }
      else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; shadowSpot.castShadow = false; }
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, update, resize, ready,
    compile: () => renderer.compile(scene, camera),
  };
}
