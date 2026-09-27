// Voltaj 3D dünyası: gece muayene rampasında gerçek bir hatchback (lib3d `car`, markasız) ve
// kaputun altında gerçek motor + akü (lib3d `engine`, `battery`). Tarama perdesi aracın önünden
// arkasına geçer: perdenin arkası PBR boya ve cam, önü röntgen (fresnel kabuk). Röntgende elektrik
// tesisatı, bileşen noktaları ve arızalar görünür; devre kapanınca farlar ve stoplar yanar.
// Dünya koordinatları: ön -z, arka +z, sol -x, yukarı +y, zemin y = 0 (araç 4,3 × 1,48 m).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadAsset, pickQuality } from '../../shared/lib3d.js';

const C = {
  ink: new THREE.Color('#04060b'),
  xray: new THREE.Color('#7fd8ff'),
  arc: new THREE.Color('#b9a8ff'),
  current: new THREE.Color('#fff2b8'),
  fault: new THREE.Color('#ff2e4d'),
  ok: new THREE.Color('#2bffa0'),
  lamp: new THREE.Color('#ffe6b0'),
  brake: new THREE.Color('#ff2436'),
};

// Elektrik sistemindeki bileşenler (dünya koordinatları; motor bölmesi önde, z ≈ -1,0 … -2,0).
export const NODES = {
  bat: { p: [-0.5, 0.74, -1.62], size: 1.3 },
  fuse: { p: [0.5, 0.72, -1.5], size: 0.9 },
  klima: { p: [0.24, 0.42, -1.74], size: 0.9 },
  hlL: { p: [-0.64, 0.72, -2.0], size: 0.9 },
  hlR: { p: [0.64, 0.72, -2.0], size: 0.9 },
  absFL: { p: [-0.74, 0.32, -1.3], size: 0.6 },
  absFR: { p: [0.74, 0.32, -1.3], size: 0.6 },
  coils: { p: [0.02, 0.8, -1.36], size: 1.1 },
  maf: { p: [-0.22, 0.66, -1.66], size: 0.9 },
  alt: { p: [0.2, 0.5, -1.58], size: 1.1 },
  starter: { p: [-0.22, 0.4, -1.16], size: 0.9 },
  ecu: { p: [0.36, 0.8, -0.94], size: 1.2 },
  dash: { p: [-0.38, 1.0, -0.62], size: 0.9 },
  obd: { p: [-0.42, 0.52, -0.46], size: 0.7 },
  hv: { p: [0, 0.36, 0.56], size: 1.4 },
  absRL: { p: [-0.74, 0.32, 1.34], size: 0.6 },
  absRR: { p: [0.74, 0.32, 1.34], size: 0.6 },
  tlL: { p: [-0.7, 0.93, 2.0], size: 0.7 },
  tlR: { p: [0.7, 0.93, 2.0], size: 0.7 },
};

const EDGES = [
  ['bat', 'fuse'], ['fuse', 'hlR'], ['bat', 'hlL'], ['fuse', 'klima'], ['bat', 'absFL'], ['fuse', 'absFR'],
  ['fuse', 'ecu'], ['ecu', 'dash'], ['dash', 'obd'], ['ecu', 'coils'], ['ecu', 'maf'], ['bat', 'starter'],
  ['alt', 'bat'], ['ecu', 'hv'], ['hv', 'absRL'], ['hv', 'absRR'], ['hv', 'tlL'], ['hv', 'tlR'],
  ['obd', 'hv'], ['alt', 'klima'],
];

const FLOOR_Y = 0.24; // tesisatın döşeme altından geçtiği yükseklik

const glowTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.18, 'rgba(255,255,255,.75)');
  r.addColorStop(0.45, 'rgba(255,255,255,.18)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

// --- Röntgen kabuğu: perdenin önünde (z < tarama) fresnel çizgili, eklemeli -------------------

const xrayVert = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 w = modelMatrix * p;
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const xrayFrag = /* glsl */ `
  uniform float uScan;
  uniform float uXray;
  uniform vec3 uColor;
  uniform vec3 uArc;
  uniform float uDim;
  uniform float uGain;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    if (vWorld.z > uScan) discard;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vNormal);
    float f = pow(1.0 - abs(dot(N, V)), 2.4);
    float lines = smoothstep(0.88, 1.0, abs(fract(vWorld.y * 24.0) - 0.5) * 2.0);
    float band = exp(-abs(vWorld.z - uScan) * 40.0);
    vec3 col = uColor * (f * 0.16 + 0.004 + lines * f * 0.09) * uXray * uGain;
    col += uArc * band * f * 0.14;
    col *= 1.0 - uDim * 0.8;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// --- Tesisat: hat boyunca akan akım darbeleri ------------------------------------------------

const wireVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wireFrag = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uFlow;
  uniform float uLen;
  uniform float uDim;
  uniform vec3 uBase;
  uniform vec3 uPulse;
  varying vec2 vUv;
  void main() {
    float t = vUv.x;
    if (t > uReveal) discard;
    float d = fract(t * uLen * 1.6 - uTime * (0.6 + uFlow * 1.6));
    float pulse = pow(d, 10.0) * (0.35 + uFlow);
    float tip = smoothstep(0.04, 0.0, uReveal - t) * step(uReveal, 0.999);
    vec3 col = uBase * 0.45 + uPulse * (pulse * 2.2 + tip * 3.0);
    col *= 1.0 - uDim * 0.75;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// --- Far huzmesi -----------------------------------------------------------------------------

const beamVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const beamFrag = /* glsl */ `
  uniform float uPower;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 V = normalize(cameraPosition - vW);
    float soft = pow(abs(dot(normalize(vN), V)), 1.4);
    float along = pow(vUv.y, 2.2);
    gl_FragColor = vec4(uColor * along * soft * uPower * 0.22, 1.0);
    #include <colorspace_fragment>
  }
`;

// --- Zemin ızgarası (gerçek zeminin üstünde, eklemeli) -----------------------------------------

const gridVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const gridFrag = /* glsl */ `
  uniform float uScan;
  uniform float uGrid;
  uniform float uPower;
  uniform float uBeam;
  uniform float uDim;
  uniform vec3 uLine;
  uniform vec3 uArc;
  uniform vec3 uLamp;
  varying vec3 vWorld;
  float grid(vec2 p, float s) {
    vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    vec2 p = vWorld.xz;
    float r = length(p * vec2(1.0, 0.7));
    float fade = smoothstep(9.0, 1.8, r);
    // aracın altı boş kalsın: gölge okunsun
    float clear = smoothstep(0.85, 1.7, length(p / vec2(1.0, 2.3)));
    float g = grid(p, 0.5) * 0.5 + grid(p, 2.5) * 0.6;
    vec3 col = uLine * g * fade * clear * 0.14 * uGrid;
    float scan = exp(-abs(vWorld.z - uScan) * 9.0) * smoothstep(3.2, 0.6, abs(vWorld.x));
    col += uArc * scan * 0.5 * step(-2.7, uScan) * step(uScan, 2.7);
    float under = smoothstep(1.7, 0.4, length(p / vec2(1.2, 2.4)));
    col += uLine * under * uPower * 0.18;
    float pool = smoothstep(2.8, 0.0, length((p - vec2(0.0, -4.6)) / vec2(1.8, 2.5)));
    col += uLamp * pool * max(uPower, uBeam) * 0.14;
    col *= 1.0 - uDim * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createWorld(canvas, { lowTier = false } = {}) {
  const q = lowTier ? 'lo' : pickQuality();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowTier, powerPreference: 'high-performance' });
  renderer.setClearColor(C.ink, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const dprCap = lowTier ? 1.25 : 1.5;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.ink, 9, 24);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);
  const car = new THREE.Group();
  scene.add(car);

  const U = {
    uScan: { value: -3 },
    uXray: { value: 1 },
    uDim: { value: 0 },
    uTime: { value: 0 },
    uPower: { value: 0 },
    uBeam: { value: 0 },
    uGrid: { value: 1 },
    uArcCol: { value: C.arc },
  };

  // --- Işık: tavandaki muayene lambası (gölge), arkadan buz mavisi kontur, tarama perdesinin
  // mor ışığı, devre kapanınca far ışığı. Ortam: nötr, yumuşak kutulu oda (RoomEnvironment),
  // kısık. Gece HDRI'sinin sodyum lambaları boyayı bronza, stüdyo HDRI'sinin tavanı vernikte
  // lekeye çeviriyordu.
  const KEY = 150;
  const ENV = 0.5;
  const RIM = 0.9;
  const RIM2 = 0.4;
  const key = new THREE.SpotLight('#dfe8ff', KEY, 0, 0.6, 0.9, 2);
  key.position.set(1.5, 5.4, -0.2);
  key.target.position.set(0, 0, -0.1);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(q === 'lo' ? 512 : 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 9;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight('#7fd8ff', RIM);
  rim.position.set(-4, 2.2, 5.5);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight('#9ab8ff', RIM2);
  rim2.position.set(5, 1.5, -4.5);
  scene.add(rim2);

  const scanLight = new THREE.PointLight('#b9a8ff', 0, 3.2, 2);
  scene.add(scanLight);

  const headLight = new THREE.SpotLight('#ffe6b0', 0, 12, 0.5, 0.7, 1.6);
  headLight.position.set(0, 0.7, -2.1);
  headLight.target.position.set(0, 0, -6);
  scene.add(headLight, headLight.target);

  // Zemin: koyu epoksi, lambanın havuzunu ve aracın gölgesini taşır; üstünde ızgara.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    // Oda ortamı sıyırma açısında zemini griye boyamasın: yansıma kısık.
    new THREE.MeshStandardMaterial({ color: '#161e2a', roughness: 0.66, metalness: 0.0, envMapIntensity: 0.12 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Temas gölgesi: tekerlerin ve gövdenin altında yumuşak kararma (aracı zemine oturtur).
  const contact = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 64, 4, 32, 64, 32);
    r.addColorStop(0, 'rgba(0,0,0,0.92)');
    r.addColorStop(0.55, 'rgba(0,0,0,0.7)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 2, 0, -64);
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 128);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 5.8),
      new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 1, fog: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.002;
    m.renderOrder = 0;
    return m;
  })();
  scene.add(contact);

  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({
      vertexShader: gridVert,
      fragmentShader: gridFrag,
      uniforms: {
        uScan: U.uScan, uGrid: U.uGrid, uPower: U.uPower, uBeam: U.uBeam, uDim: U.uDim,
        uLine: { value: C.xray }, uArc: { value: C.arc }, uLamp: { value: C.lamp },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.003;
  grid.renderOrder = 1;
  scene.add(grid);

  // Tarama perdesi (araç kesitinde parlayan ışık)
  const scanPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 1.9),
    new THREE.ShaderMaterial({
      vertexShader: wireVert,
      fragmentShader: /* glsl */ `
        uniform vec3 uArc; uniform float uA; varying vec2 vUv;
        void main() {
          float e = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(1.0, 0.4, vUv.y);
          gl_FragColor = vec4(uArc * e * 0.06 * uA, 1.0);
          #include <colorspace_fragment>
        }`,
      uniforms: { uArc: { value: C.arc }, uA: { value: 0 } },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  scanPlane.position.y = 0.95;
  scanPlane.renderOrder = 4;
  scene.add(scanPlane);

  // --- Tesisat hatları
  const wires = new THREE.Group();
  car.add(wires);
  const wireMats = [];
  const v3 = (a) => new THREE.Vector3(...a);
  for (const [a, b] of EDGES) {
    const A = v3(NODES[a].p);
    const B = v3(NODES[b].p);
    const pts = [A, new THREE.Vector3(A.x * 0.8, FLOOR_Y, A.z), new THREE.Vector3(B.x * 0.8, FLOOR_Y, B.z), B];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const len = curve.getLength();
    const mat = new THREE.ShaderMaterial({
      vertexShader: wireVert,
      fragmentShader: wireFrag,
      uniforms: {
        uTime: U.uTime, uDim: U.uDim,
        uReveal: { value: 0 }, uFlow: { value: 0 }, uLen: { value: len },
        uBase: { value: C.xray }, uPulse: { value: C.current },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const segs = Math.max(24, Math.round(len * 26));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.011, lowTier ? 4 : 6, false), mat);
    mesh.renderOrder = 5;
    wires.add(mesh);
    wireMats.push({ mat, z0: Math.min(A.z, B.z), z1: Math.max(A.z, B.z) });
  }

  // --- Bileşen noktaları
  const nodes = {};
  const coreGeo = new THREE.IcosahedronGeometry(0.032, 1);
  for (const [name, n] of Object.entries(NODES)) {
    const pos = v3(n.p);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: C.current.clone(), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
    core.position.copy(pos);
    core.scale.setScalar(n.size);
    core.renderOrder = 6;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: C.xray.clone(), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.position.copy(pos);
    halo.renderOrder = 6;
    car.add(core, halo);
    nodes[name] = { pos, core, halo, size: n.size, state: 'normal', focus: 0, reveal: 0, blink: Math.random() * 6 };
  }

  // --- Far huzmeleri
  const beams = [];
  for (const side of [-1, 1]) {
    const h = 3.4;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, h, lowTier ? 18 : 28, 1, true),
      new THREE.ShaderMaterial({
        vertexShader: beamVert,
        fragmentShader: beamFrag,
        uniforms: { uPower: { value: 0 }, uColor: { value: C.lamp } },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    beam.rotation.x = Math.PI / 2 + 0.07;
    beam.position.set(side * 0.64, 0.66, -2.05 - h / 2);
    beam.renderOrder = 7;
    car.add(beam);
    beams.push(beam);
  }

  const dashGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: C.xray.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  dashGlow.position.set(-0.38, 1.02, -0.6);
  dashGlow.scale.setScalar(0.7);
  car.add(dashGlow);

  // --- PBR malzemeleri tarama perdesiyle kes: perdenin önü (z < tarama) atılır, perde çizgisi yanar.
  const patched = new WeakSet();
  function patch(mat) {
    if (!mat || patched.has(mat)) return;
    patched.add(mat);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uScan = U.uScan;
      sh.uniforms.uDim = U.uDim;
      sh.uniforms.uArcCol = U.uArcCol;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vXW;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 xw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            xw = instanceMatrix * xw;
          #endif
          vXW = (modelMatrix * xw).xyz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vXW;\nuniform float uScan;\nuniform float uDim;\nuniform vec3 uArcCol;')
        .replace('void main() {', 'void main() {\n  if (vXW.z < uScan) discard;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uArcCol * exp(-abs(vXW.z - uScan) * 28.0) * 1.4;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  gl_FragColor.rgb *= 1.0 - uDim * 0.85;');
    };
    mat.customProgramCacheKey = () => 'voltaj-scan';
  }

  const xrayMats = [];
  const makeXray = (color, gain) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: xrayVert, fragmentShader: xrayFrag,
      uniforms: { uScan: U.uScan, uXray: U.uXray, uDim: U.uDim, uColor: { value: new THREE.Color(color) }, uArc: { value: C.arc }, uGain: { value: gain } },
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide, fog: false,
    });
    xrayMats.push(m);
    return m;
  };
  const xrayBody = makeXray('#1f9dff', 1);
  const xrayCore = makeXray('#5fd0ff', 1.5); // motor ve akü röntgende daha yoğun

  // Her mesh'e röntgen ikizi ekle (aynı geometri). minSize: küçük vidaları atla (çizim çağrısı).
  function xrayify(root, mat, { minSize = 0, skip } = {}) {
    const meshes = [];
    root.traverse((o) => o.isMesh && meshes.push(o));
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    for (const o of meshes) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) patch(m);
      if (skip?.(o)) continue;
      if (minSize) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.copy(o.geometry.boundingBox).getSize(size);
        if (Math.max(size.x, size.y, size.z) < minSize) continue;
      }
      let x;
      if (o.isInstancedMesh) {
        x = new THREE.InstancedMesh(o.geometry, mat, o.count);
        x.instanceMatrix = o.instanceMatrix;
      } else {
        x = new THREE.Mesh(o.geometry, mat);
      }
      x.renderOrder = 3;
      x.castShadow = false;
      x.receiveShadow = false;
      x.frustumCulled = o.frustumCulled;
      o.add(x);
    }
  }

  let carAsset = null;
  let loaded = false;
  const lamps = { head: null, tail: null };

  async function load(onProgress) {
    const [carA, engA, batA] = await Promise.all([
      loadAsset('car', { quality: q, renderer, onProgress }),
      loadAsset('engine', { quality: q, renderer, shadows: false }),
      loadAsset('battery', { quality: q, renderer, shadows: false }),
    ]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    // Sahne ortam şiddeti malzemenin kendi değerini ezer; zemin kendi (kısık) değerini kullansın.
    ground.material.envMap = scene.environment;
    scene.environmentIntensity = ENV;

    carAsset = carA;
    const model = carA.scene;
    model.rotation.y = Math.PI / 2; // varlık +X'e bakar → ön -z
    car.add(model);

    const M = carA.materials;
    // Grafit metalik boya, vernikli; perde geçerken buz mavisi konturlar üstünden kayar.
    if (M.paint) {
      M.paint.color.set('#0e1a2c');
      M.paint.metalness = 0.25;
      M.paint.roughness = 0.3;
      if (M.paint.map) M.paint.map = null;
      // Pul/portakal kabuğu normali tavan lambasının altında dolu vurmuş gibi görünüyordu.
      M.paint.normalMap = null;
      M.paint.clearcoatNormalMap = null;
      if ('clearcoat' in M.paint) {
        M.paint.clearcoat = 1;
        M.paint.clearcoatRoughness = 0.12;
      }
    }
    if (M.light_head) {
      M.light_head.emissive.set('#fff1d6');
      M.light_head.emissiveIntensity = 0.2;
      lamps.head = M.light_head;
    }
    if (M.light_tail) {
      M.light_tail.emissive.set('#ff2436');
      M.light_tail.emissiveIntensity = 0.25;
      lamps.tail = M.light_tail;
    }
    // Gölgeyi yalnız gövde, kapılar ve tekerlekler düşürsün (iç kabin ve camlar gereksiz çağrı).
    model.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material && o.material.name) || '';
      if (/glass|interior|seat|dash|lamp|light|reflector|plate/.test(n)) o.castShadow = false;
      o.receiveShadow = false;
    });
    xrayify(model, xrayBody, { minSize: q === 'lo' ? 0.08 : 0.03 });

    // Kaputun altı: enine motor ve akü (kaput açılınca ve röntgende görünür).
    const eng = engA.scene;
    eng.scale.setScalar(0.88);
    eng.position.set(0.02, 0.27, -1.36);
    car.add(eng);
    xrayify(eng, xrayCore, { minSize: q === 'lo' ? 0.12 : 0.06 });

    const bat = batA.scene;
    bat.position.set(-0.5, 0.52, -1.62);
    bat.rotation.y = Math.PI / 2;
    car.add(bat);
    xrayify(bat, xrayCore, { minSize: 0.05 });

    try {
      await renderer.compileAsync(scene, camera);
    } catch (_) {}
    loaded = true;
  }

  // --- Durum -----------------------------------------------------------------------------------
  const P = {
    tx: 0, ty: 0.55, tz: 0, az: 2.35, el: 0.12, dist: 6.2, fov: 35, sx: 0, sy: 0,
    scan: -3, xray: 1, harness: 0, flow: 0, dim: 0, power: 0, beam: 0, grid: 1, hood: 0,
  };
  let focusName = null;
  let W = 1;
  let H = 1;

  function resize(w, h) {
    W = w;
    H = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
  }

  function applyCamera() {
    const cosE = Math.cos(P.el);
    camera.position.set(
      P.tx + P.dist * cosE * Math.sin(P.az),
      P.ty + P.dist * Math.sin(P.el),
      P.tz + P.dist * cosE * Math.cos(P.az)
    );
    camera.lookAt(P.tx, P.ty, P.tz);
    // Hedefi ekranda kaydır: sx>0 sağa, sy>0 aşağı.
    const ax = Math.abs(P.sx);
    const ay = Math.abs(P.sy);
    const fw = W * (1 + 2 * ax);
    const fh = H * (1 + 2 * ay);
    const ox = P.sx > 0 ? 0 : 2 * W * ax;
    const oy = P.sy > 0 ? 0 : 2 * H * ay;
    camera.setViewOffset(fw, fh, ox, oy, W, H);
    camera.aspect = fw / fh;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(P.fov) / 2) * (fh / H)));
    camera.updateProjectionMatrix();
  }

  const tmpColor = new THREE.Color();
  let faults = {};

  function update(dt, time) {
    U.uTime.value = time;
    U.uScan.value = P.scan;
    U.uXray.value = P.xray;
    U.uDim.value = P.dim;
    U.uPower.value = P.power;
    U.uBeam.value = P.beam;
    U.uGrid.value = P.grid;

    const scanning = P.scan > -2.6 && P.scan < 2.6;
    scanPlane.position.z = P.scan;
    scanPlane.material.uniforms.uA.value = scanning ? 1 - P.dim : 0;
    scanLight.position.set(0, 1.25, P.scan);
    scanLight.intensity = scanning ? 3.2 * (1 - P.dim) : 0;

    // Ortam ve lamba, sahne karardıkça kısılır (yorumlar, markalar).
    const lit = 1 - P.dim * 0.85;
    scene.environmentIntensity = ENV * lit;
    ground.material.envMapIntensity = 0.12 * lit;
    key.intensity = KEY * lit;
    rim.intensity = RIM * lit;
    rim2.intensity = RIM2 * lit;

    if (carAsset) {
      const hood = carAsset.nodes.hood;
      if (hood) hood.rotation.z = 0.92 * P.hood;
    }
    const lampPower = Math.max(P.power, P.beam);
    if (lamps.head) lamps.head.emissiveIntensity = 0.2 + lampPower * 9;
    if (lamps.tail) lamps.tail.emissiveIntensity = 0.25 + P.power * 5;
    headLight.intensity = lampPower * 9 * lit;

    for (const w of wireMats) {
      const byScan = THREE.MathUtils.clamp((P.scan - w.z0) / Math.max(0.3, w.z1 - w.z0), 0, 1);
      w.mat.uniforms.uReveal.value = Math.max(byScan * 0.999, P.harness);
      w.mat.uniforms.uFlow.value = P.flow;
    }

    const blinkOn = (n) => 0.55 + 0.45 * Math.sign(Math.sin(time * 7 + n.blink));
    for (const [name, n] of Object.entries(nodes)) {
      const revealTarget = P.scan > n.pos.z - 0.05 || P.harness > 0.5 ? 1 : 0;
      n.reveal += (revealTarget - n.reveal) * Math.min(1, dt * 8);
      n.state = faults[name] ?? 'normal';
      const targetFocus = focusName ? (focusName.includes(name) ? 1 : -1) : 0;
      n.focus += (targetFocus - n.focus) * Math.min(1, dt * 5);
      let col = C.xray;
      let intensity = 0.8;
      if (n.state === 'fault') {
        col = C.fault;
        intensity = 1.3 * blinkOn(n);
      } else if (n.state === 'ok') {
        col = C.ok;
        intensity = 1.1;
      }
      const focusBoost = 1 + Math.max(0, n.focus) * 0.7 - Math.max(0, -n.focus) * 0.6;
      const a = n.reveal * (1 - P.dim * 0.8);
      tmpColor.copy(col);
      n.halo.material.color.copy(tmpColor);
      n.halo.material.opacity = a * intensity * 0.9 * focusBoost;
      n.halo.scale.setScalar(0.3 * n.size * (1 + Math.max(0, n.focus) * 0.7) * (n.state === 'fault' ? 1.3 : 1));
      n.core.material.color.copy(n.state === 'normal' ? C.current : col);
      n.core.material.opacity = a;
      n.core.scale.setScalar(n.size * (1 + Math.max(0, n.focus) * 0.6));
    }

    for (const b of beams) b.material.uniforms.uPower.value = lampPower;
    dashGlow.material.opacity = P.power * 0.8;
  }

  function render() {
    applyCamera();
    renderer.render(scene, camera);
  }

  const proj = new THREE.Vector3();
  function project(name) {
    const n = nodes[name];
    proj.copy(n.pos);
    car.localToWorld(proj);
    proj.project(camera);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * H, visible: proj.z < 1 && n.reveal > 0.5 };
  }

  return {
    P,
    load,
    resize,
    update,
    render,
    project,
    setFaults: (f) => (faults = f),
    setFocus: (names) => (focusName = names),
    get loaded() {
      return loaded;
    },
    renderer,
    scene,
  };
}
