// Tonaj sahnesi: gece yol kenarında duran lib3d çekici (öne yatan kabin, çift arka teker). Kütüphane
// kasasının altı boş olduğu için şanzıman, şaft, diferansiyel kapağı, fren körükleri, hava hatları ve
// süspansiyon körükleri burada modellenir; motor kütüphanedeki dizel motorun büyütülmüş hâlidir.
// Işık: "night" HDRI (sodyum lambalı sokak), üstte sıcak sokak lambası spotu (yumuşak gölge), soğuk ay
// konturu. Sahne durumu dışarıdan `update(state)` ile verilir; kamera ve vurgular main.js'te kurgulanır.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Kütüphane çekicisi: ön +x, ön aks x +1.85, arka aks x −1.85, teker yarıçapı ≈ 0.537, şasi rayları z ±0.43.
export const AKS = { on: 1.85, arka: -1.85 };
const WR = 0.537;
const BODY_NODES = ['chassis', 'cab', 'fifth_wheel', 'fuel_tank', 'adblue_tank', 'battery_box', 'air_tanks'];

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

// Asfalt: taneli koyu yüzey + ince çatlak ve yağ lekeleri; aynı doku pürüzlülük haritası olarak da kullanılır
function asphaltTex(size) {
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = '#1a1c1f';
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = Math.random();
      const n = r > 0.985 ? 60 : r > 0.9 ? 26 : (r * 18) | 0;
      d[i] += n; d[i + 1] += n; d[i + 2] += n + 1;
    }
    g.putImageData(img, 0, 0);
    g.globalAlpha = 0.22;
    for (let k = 0; k < 7; k++) {
      const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, '#050506');
      gr.addColorStop(1, 'rgba(5,5,6,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  });
}

function radialTex(stops, size = 128) {
  return canvasTex(size, size, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
}

export function createScene(canvas, { name = '' } = {}) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lo ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x080b10, 14, 40);
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 120);
  scene.add(camera);
  // Sürünge lambası: kamera aracın altına girince ustanın el feneri gibi yanar
  const workLamp = new THREE.PointLight(0xffe2b8, 0, 5, 1.6);
  workLamp.position.set(0.1, -0.1, 0.2);
  camera.add(workLamp);

  // Sokak lambası (sıcak sodyum, yumuşak gölge) + soğuk ay konturu + zayıf gök dolgusu
  const key = new THREE.SpotLight(0xffc488, 160, 30, 0.72, 0.7, 1.6);
  key.position.set(2.5, 9.5, 5.5);
  key.target.position.set(0, 0.8, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.shadow.camera.near = 3;
  key.shadow.camera.far = 22;
  const rim = new THREE.DirectionalLight(0x8fa8ff, 1.1);
  rim.position.set(-8, 6, -7);
  const fill = new THREE.HemisphereLight(0x5a6d94, 0x0b0c10, 0.35);
  const under = new THREE.PointLight(0xfff0dc, 0, 7, 1.4); // şasi altında atölye ışığı
  under.position.set(0, 0.28, 0);
  scene.add(key, key.target, rim, fill, under);

  // --- Zemin: asfalt, şerit çizgileri, lamba havuzu --------------------------
  const aTex = asphaltTex(lo ? 256 : 512);
  aTex.wrapS = aTex.wrapT = THREE.RepeatWrapping;
  aTex.repeat.set(18, 18);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ map: aTex, roughness: 0.82, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.6 });
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(90, 0.15), lineMat);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(0, 0.004, -2.2);
  edge.receiveShadow = true;
  scene.add(edge);
  const dashGeo = new THREE.PlaneGeometry(3, 0.14);
  for (let x = -42; x < 42; x += 7.5) {
    const m = new THREE.Mesh(dashGeo, lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.004, 3.5);
    m.receiveShadow = true;
    scene.add(m);
  }
  const poolTex = radialTex([[0, 'rgba(255,196,130,0.5)'], [0.5, 'rgba(255,170,100,0.14)'], [1, 'rgba(255,160,90,0)']]);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(1.2, 0.006, 1.5);
  scene.add(pool);

  // Far huzmesi (hacim hissi) ve yola düşen ışık
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vUv; uniform float uAlpha; void main(){ float a = pow(vUv.y, 2.2) * uAlpha * 0.16; gl_FragColor = vec4(1.0, 0.95, 0.85, a); }',
  });
  const beams = [];
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 2.2, 13, 24, 1, true), beamMat);
    b.rotation.z = Math.PI / 2;
    b.position.set(3.3 + 6.5, 0.8, s * 0.95);
    b.rotation.y = s * -0.04;
    scene.add(b);
    beams.push(b);
  }
  const headPool = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 5.5),
    new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(255,244,220,0.8)'], [1, 'rgba(255,240,210,0)']]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  headPool.rotation.x = -Math.PI / 2;
  headPool.position.set(9.6, 0.01, 0);
  scene.add(headPool);
  const headSpot = new THREE.SpotLight(0xfff1dc, 0, 22, 0.42, 0.6, 1.4);
  headSpot.position.set(3.3, 0.8, 0);
  headSpot.target.position.set(12, 0, 0);
  scene.add(headSpot, headSpot.target);

  // İkaz üçgeni (yol yardım finali)
  const tri = new THREE.Shape();
  tri.moveTo(-0.3, 0); tri.lineTo(0.3, 0); tri.lineTo(0, 0.52); tri.lineTo(-0.3, 0);
  const hole = new THREE.Path();
  hole.moveTo(-0.2, 0.06); hole.lineTo(0.2, 0.06); hole.lineTo(0, 0.4); hole.lineTo(-0.2, 0.06);
  tri.holes.push(hole);
  const triMat = new THREE.MeshStandardMaterial({ color: 0xd3202f, emissive: 0xff2a2a, emissiveIntensity: 0.3, roughness: 0.4, side: THREE.DoubleSide });
  const warn = new THREE.Mesh(new THREE.ShapeGeometry(tri), triMat);
  warn.position.set(-7.4, 0.02, 0.3);
  warn.rotation.set(-0.12, Math.PI / 2 - 0.3, 0);
  warn.castShadow = true;
  scene.add(warn);
  const hazardL = new THREE.PointLight(0xff8a14, 0, 7, 1.6);
  hazardL.position.set(3.5, 1.1, 0);
  const hazardR = new THREE.PointLight(0xff8a14, 0, 7, 1.6);
  hazardR.position.set(-3.0, 1.0, 0);
  scene.add(hazardL, hazardR);

  // --- Vurgu grupları ---------------------------------------------------------
  const HL = new THREE.Color(0xff3b30);
  const groups = { motor: [], sanziman: [], diferansiyel: [], fren: [], adblue: [], korug: [] };
  const edgeMats = {};
  const edgeLines = {};
  for (const id of Object.keys(groups)) {
    edgeMats[id] = new THREE.LineBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0, depthTest: false });
    edgeLines[id] = [];
  }
  const own = (id, base) => {
    const m = base.clone();
    groups[id].push(m);
    return m;
  };
  // kütüphane düğümünün malzemelerini bu gruba özel kopyala (başka düğümler etkilenmesin)
  const adopt = (id, node, edges = false) => {
    node.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map((m) => own(id, m)) : own(id, o.material);
      if (edges && o.geometry.attributes.position.count < 6000) edgesOf(id, o);
    });
  };
  const edgesOf = (id, mesh) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), edgeMats[id]);
    l.renderOrder = 5;
    l.visible = false;
    mesh.add(l);
    edgeLines[id].push(l);
  };

  // --- Kendi parçalar için malzemeler -----------------------------------------
  const M = {
    castAlu: new THREE.MeshStandardMaterial({ color: 0xa9adb1, roughness: 0.48, metalness: 0.85 }),
    castIron: new THREE.MeshStandardMaterial({ color: 0x3b3e42, roughness: 0.62, metalness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.3, metalness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.55, metalness: 0.35 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.88, metalness: 0 }),
    red: new THREE.MeshStandardMaterial({ color: 0xa3131f, roughness: 0.45, metalness: 0.2 }),
  };

  const rig = new THREE.Group(); // tüm araç
  scene.add(rig);
  const extra = new THREE.Group(); // kasaya bağlı kendi parçalarımız (körükle birlikte iner-kalkar)
  const axleExtra = new THREE.Group(); // aksa bağlı parçalar (yerinde kalır)
  rig.add(extra, axleExtra);

  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const seg = lo ? 20 : 32;
  const cylX = (r0, r1, len, s = seg) => new THREE.CylinderGeometry(r1, r0, len, s).rotateZ(Math.PI / 2); // r0: −x ucu
  const cylZ = (r, len, s = seg) => new THREE.CylinderGeometry(r, r, len, s).rotateX(Math.PI / 2);

  // Şaft: şanzıman çıkışı → diferansiyel pimi; flanşlar ve istavrozlar dönsün
  const props = [];
  const mP = own('diferansiyel', M.steel), mP2 = own('diferansiyel', M.black);
  const makeProp = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.Group();
    g.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    g.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    extra.add(g);
    const spin = new THREE.Group();
    g.add(spin);
    const tube = add(spin, cylX(0.052, 0.052, len - 0.18, 16), mP, 0, 0, 0);
    for (const s of [-1, 1]) {
      add(spin, cylX(0.085, 0.085, 0.05, 16), mP2, (s * len) / 2, 0, 0);
      add(spin, new THREE.BoxGeometry(0.05, 0.17, 0.04), mP2, s * (len / 2 - 0.07), 0, 0);
      add(spin, new THREE.BoxGeometry(0.05, 0.04, 0.17), mP2, s * (len / 2 - 0.07), 0, 0);
    }
    add(spin, new THREE.BoxGeometry(0.24, 0.018, 0.12), own('diferansiyel', M.red), 0.1, 0.055, 0); // dönüş görünsün
    edgesOf('diferansiyel', tube);
    props.push(spin);
  };
  makeProp(0.64, 0.8, AKS.arka + 0.34, WR + 0.03);

  // Diferansiyel kapağı (arka aks ortasında)
  const mD = own('diferansiyel', M.castIron);
  const diff = add(axleExtra, new THREE.SphereGeometry(0.25, seg, 16), mD, AKS.arka, WR, 0);
  diff.scale.set(0.95, 1, 0.78);
  add(axleExtra, cylX(0.07, 0.12, 0.3, 16), mD, AKS.arka + 0.26, WR + 0.02, 0);
  const cover = add(axleExtra, new THREE.CylinderGeometry(0.19, 0.19, 0.06, seg).rotateZ(Math.PI / 2), mD, AKS.arka - 0.22, WR, 0);
  edgesOf('diferansiyel', diff);
  edgesOf('diferansiyel', cover);

  // Süspansiyon körükleri (arka aks gerisinde, aks kolu ile şasi arasında)
  const bp = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    bp.push(new THREE.Vector2(0.12 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.035, t * 0.3));
  }
  const bellowGeo = new THREE.LatheGeometry(bp, lo ? 16 : 24);
  const mB = own('korug', M.rubber), mBa = own('korug', M.black);
  const bellows = [];
  for (const s of [-1, 1]) {
    const b = add(axleExtra, bellowGeo, mB, AKS.arka - 0.5, 0.58, s * 0.43);
    bellows.push(b);
    edgesOf('korug', b);
    add(axleExtra, new THREE.BoxGeometry(0.95, 0.06, 0.1), mBa, AKS.arka - 0.18, 0.55, s * 0.43); // aks kolu
    add(extra, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 20), mBa, AKS.arka - 0.5, 0.9, s * 0.43); // üst tabla
  }

  // Fren körükleri (her tekerde) ve hava hatları
  const mC = own('fren', M.black);
  const chambers = [];
  for (const [x, zs] of [[AKS.on, 0.62], [AKS.arka, 0.5]]) {
    for (const s of [-1, 1]) {
      const p = V(x + 0.24, WR + 0.12, s * zs);
      const c = add(axleExtra, cylZ(0.085, 0.15, 16), mC, p.x, p.y, p.z);
      add(axleExtra, cylZ(0.02, 0.12, 8), own('fren', M.steel), p.x, p.y, p.z - s * 0.12);
      if (s > 0) edgesOf('fren', c);
      chambers.push(p);
    }
  }
  const pulseMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uPulse;
      void main(){
        float w = fract(vUv.x * 3.0 - uTime * 0.9);
        float p = smoothstep(0.0, 0.08, w) * smoothstep(0.3, 0.08, w);
        vec3 base = vec3(0.30, 0.05, 0.06);
        vec3 col = base + vec3(1.0, 0.8, 0.7) * p * uPulse * 1.5 + vec3(0.5,0.06,0.08) * uPulse * 0.5;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const tankOut = [V(-1.25, 0.9, 0.62), V(-1.25, 0.9, 0.7)];
  for (const c of chambers) {
    const t = tankOut[c.z > 0 ? 0 : 1];
    const pts = [t.clone(), V((t.x + c.x) / 2, 0.98, c.z * 0.55), V(c.x, c.y + 0.22, c.z * 0.85), c.clone()];
    add(extra, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.014, 6), pulseMat, 0, 0, 0);
  }

  // Kabin güneşliği ışıklı tabela: işletme adı
  const visorCanvas = document.createElement('canvas');
  visorCanvas.width = 1024;
  visorCanvas.height = 128;
  const visorTex = new THREE.CanvasTexture(visorCanvas);
  visorTex.colorSpace = THREE.SRGBColorSpace;
  visorTex.anisotropy = 8;
  const visorMat = new THREE.MeshStandardMaterial({ map: visorTex, emissive: 0xffffff, emissiveMap: visorTex, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1 });
  const visor = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.22), visorMat);
  function drawName(text) {
    const g = visorCanvas.getContext('2d');
    g.fillStyle = '#111317';
    g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#f4f2ec';
    const label = (text || '').toLocaleUpperCase('tr');
    let size = 80;
    g.font = `${size}px 'Alfa Slab One', Georgia, serif`;
    while (g.measureText(label).width > 940 && size > 30) g.font = `${(size -= 4)}px 'Alfa Slab One', Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 512, 70);
    visorTex.needsUpdate = true;
  }
  drawName(name);

  // --- Varlıklar ---------------------------------------------------------------
  let T = null, E = null, ready = false;
  const bodyBase = {};
  const lampMats = {};
  const readyP = (async () => {
    const [env, truck, engine, gearbox] = await Promise.all([
      loadEnv('night', renderer, { quality: q }),
      loadAsset('truck', { quality: q, renderer }),
      loadAsset('engine_diesel', { quality: q, renderer }),
      loadAsset('gearbox', { quality: q, renderer }),
    ]);
    scene.environment = env;
    T = truck;
    E = engine;
    rig.add(T.scene);
    rig.updateMatrixWorld(true);
    const N = T.nodes, Mt = T.materials;
    // Boya: sıcak beyaz, parlak; kasa siyahı biraz yarı mat
    if (Mt.paint) { Mt.paint.color.set(0xf0eee8); Mt.paint.roughness = 0.24; }
    if (Mt.chassis_black) Mt.chassis_black.roughness = 0.62;
    for (const n of BODY_NODES) if (N[n]) bodyBase[n] = N[n].position.y;
    lampMats.head = Mt.light_head;
    lampMats.amber = Mt.light_amber;
    lampMats.tail = Mt.light_tail;
    if (lampMats.tail) lampMats.tail.emissiveIntensity = 1.2;
    adopt('fren', N.air_tanks, true);
    adopt('adblue', N.adblue_tank, true);
    // Motor: kabin altında boyuna, krank x ekseninde, ön +x. 1,7 kat: ağır vasıta ölçüsü
    E.scene.scale.setScalar(1.7);
    E.scene.position.set(2.05, 0.5, -0.05);
    N.chassis.add(E.scene);
    adopt('motor', E.scene);
    // Şanzıman: motorun volanına bağlı (kütüphane kutusu, aynı ölçekte), çıkışı şafta
    const G = gearbox.scene;
    G.scale.setScalar(1.7);
    G.position.set(2.05 - 0.33 * 1.7, 0.5 + (0.175 - 0.302) * 1.7, -0.05);
    N.chassis.add(G);
    adopt('sanziman', G);
    for (const n of ['case_clutch', 'case_gear']) gearbox.nodes[n]?.traverse((o) => { if (o.isMesh) edgesOf('sanziman', o); });
    E.scene.traverse((o) => { if (o.isMesh && (o.name.includes('block') || o.name.includes('valve_cover') || o.name.includes('oil_pan'))) edgesOf('motor', o); });
    // Kendi parçalarımız kasayla birlikte hareket etsin
    N.chassis.add(extra);
    extra.position.set(0, -N.chassis.position.y, 0);
    // Güneşlik tabelası: ön cam üstü, kabinle birlikte yatar
    N.cab.add(visor);
    const cabInv = new THREE.Matrix4().copy(N.cab.matrixWorld).invert();
    visor.position.copy(V(3.215, 3.18, 0).applyMatrix4(cabInv));
    visor.rotation.y = Math.PI / 2;
    visor.rotation.x = -0.12;
    ready = true;
  })();

  // --- Boyut ve güncelleme ----------------------------------------------------------
  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();

  let last = performance.now();
  let slowFrames = 0;
  let propAngle = 0;

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(s.look);
    // telefonda bakılan parça ekranın üst kısmına kayar (kart altta kalır)
    const sh = s.sh || 0;
    if (sh > 0.001) camera.setViewOffset(width, height, 0, sh * height, width, height);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();

    workLamp.intensity = s.workLamp * 2.4;
    under.intensity = s.underLight * 6;
    scene.environmentIntensity = s.env ?? 0.45;

    if (ready) {
      const N = T.nodes;
      N.cab.rotation.z = -s.cabTilt;
      // Körük: 1 normal, < 1 inik → kasa (ve bağlı parçalar) iner
      const drop = (s.bellow - 1) * 0.16;
      for (const n of BODY_NODES) if (N[n] && n !== 'chassis') N[n].position.y = bodyBase[n] + drop;
      N.chassis.position.y = bodyBase.chassis + drop;
      for (const b of bellows) b.scale.y = 1 + drop / 0.3;
      const blink = s.hazard > 0 ? (Math.sin(t * Math.PI * 2 * 0.85) > 0 ? 1 : 0) : 0;
      if (lampMats.head) lampMats.head.emissiveIntensity = 0.3 + s.headlights * 5;
      if (lampMats.amber) lampMats.amber.emissiveIntensity = 0.2 + blink * s.hazard * 6;
      hazardL.intensity = blink * s.hazard * 5;
      hazardR.intensity = blink * s.hazard * 5;
    }

    propAngle += dt * s.spin * 18;
    for (const p of props) p.rotation.x = propAngle;

    // Vurgu: kırmızı ışıma + kenar çizgisi
    const pulse = 0.75 + 0.25 * Math.sin(t * 6);
    for (const [id, mats] of Object.entries(groups)) {
      const k = s.highlight === id ? s.hlAmount : 0;
      for (const m of mats) {
        if (!m.emissive) continue;
        m.emissive.copy(HL);
        m.emissiveIntensity = k * 0.1 * pulse;
      }
      edgeMats[id].opacity = k * (0.5 + 0.35 * pulse);
      for (const l of edgeLines[id]) l.visible = k > 0.01;
    }
    pulseMat.uniforms.uTime.value = t;
    pulseMat.uniforms.uPulse.value = s.pulse;

    beamMat.uniforms.uAlpha.value = s.headlights;
    for (const b of beams) b.visible = s.headlights > 0.01;
    headPool.material.opacity = s.headlights * 0.5;
    headSpot.intensity = s.headlights * 40;
    warn.visible = s.hazard > 0.01;
    triMat.emissiveIntensity = 0.2 + s.hazard * 0.6;

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.9) {
      dpr = Math.max(0.9, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, update, resize, drawName, readyP,
    isReady: () => ready,
    compile: () => renderer.compile(scene, camera),
  };
}
