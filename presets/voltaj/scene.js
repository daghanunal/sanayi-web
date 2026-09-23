// Voltaj 3D dünyası: aracın röntgeni, elektrik tesisatı, arıza noktaları, farlar.
// Araç yerel koordinatları: ön -z, arka +z, genişlik ±1.13, yükseklik 0..1.24.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const C = {
  ink: new THREE.Color('#04060b'),
  xray: new THREE.Color('#7fd8ff'),
  body: new THREE.Color('#0a1019'),
  arc: new THREE.Color('#b9a8ff'),
  current: new THREE.Color('#fff2b8'),
  fault: new THREE.Color('#ff2e4d'),
  ok: new THREE.Color('#2bffa0'),
  lamp: new THREE.Color('#ffe6b0'),
  brake: new THREE.Color('#ff2436'),
};

// Elektrik sistemindeki bileşenler (araç koordinatlarında).
export const NODES = {
  bat: { p: [0.42, 0.48, -1.72], size: 1.3 },
  fuse: { p: [-0.4, 0.52, -1.6], size: 0.9 },
  klima: { p: [0.08, 0.4, -1.98], size: 0.9 },
  hlL: { p: [-0.62, 0.62, -1.86], size: 0.9 },
  hlR: { p: [0.62, 0.62, -1.86], size: 0.9 },
  absFL: { p: [-0.78, 0.36, -1.15], size: 0.6 },
  absFR: { p: [0.78, 0.36, -1.15], size: 0.6 },
  ecu: { p: [0.05, 0.52, -0.78], size: 1.2 },
  obd: { p: [-0.28, 0.36, -0.55], size: 0.7 },
  dash: { p: [-0.35, 0.82, -0.48], size: 0.9 },
  hv: { p: [0, 0.3, 0.12], size: 1.4 },
  maf: { p: [0.32, 0.74, 0.95], size: 0.9 },
  coils: { p: [0, 0.8, 1.32], size: 1.1 },
  starter: { p: [0.3, 0.3, 1.3], size: 0.9 },
  alt: { p: [-0.36, 0.46, 1.62], size: 1.1 },
  absRL: { p: [-0.78, 0.36, 1.5], size: 0.6 },
  absRR: { p: [0.78, 0.36, 1.5], size: 0.6 },
  tlL: { p: [-0.65, 0.88, 2.08], size: 0.7 },
  tlR: { p: [0.65, 0.88, 2.08], size: 0.7 },
};

const EDGES = [
  ['bat', 'fuse'], ['fuse', 'hlL'], ['bat', 'hlR'], ['fuse', 'klima'], ['fuse', 'absFL'], ['bat', 'absFR'],
  ['fuse', 'ecu'], ['ecu', 'dash'], ['ecu', 'obd'], ['ecu', 'hv'], ['hv', 'coils'], ['ecu', 'maf'],
  ['hv', 'alt'], ['bat', 'starter'], ['maf', 'coils'], ['coils', 'tlL'], ['coils', 'tlR'],
  ['alt', 'absRL'], ['starter', 'absRR'], ['alt', 'starter'],
];

const FLOOR_Y = 0.26;

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

// --- Araç gövdesi: taranmamış kısım koyu silüet, taranmış kısım röntgen --------------

const shellVert = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const solidFrag = /* glsl */ `
  uniform float uScan;
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform vec3 uArc;
  uniform float uDim;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    if (vWorld.z < uScan) discard;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vNormal);
    float f = pow(1.0 - abs(dot(N, V)), 3.0);
    float key = max(dot(N, normalize(vec3(-0.4, 1.0, -0.3))), 0.0);
    vec3 col = uBody * (0.55 + key * 0.9) + uRim * f * 0.55;
    float band = exp(-abs(vWorld.z - uScan) * 36.0);
    col += uArc * band * 0.9;
    col *= 1.0 - uDim * 0.85;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const xrayFrag = /* glsl */ `
  uniform float uScan;
  uniform float uXray;
  uniform vec3 uColor;
  uniform vec3 uArc;
  uniform float uDim;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    if (vWorld.z > uScan) discard;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vNormal);
    float f = pow(1.0 - abs(dot(N, V)), 2.2);
    float lines = smoothstep(0.86, 1.0, abs(fract(vWorld.y * 22.0) - 0.5) * 2.0);
    float band = exp(-abs(vWorld.z - uScan) * 40.0);
    vec3 col = uColor * (f * 0.14 + 0.004 + lines * f * 0.1) * uXray;
    col += uArc * band * f * 0.12;
    col *= 1.0 - uDim * 0.8;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// --- Tesisat: hat boyunca akan akım darbeleri ------------------------------------------

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

// --- Far huzmesi -----------------------------------------------------------------------

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
    gl_FragColor = vec4(uColor * along * soft * uPower * 0.3, 1.0);
    #include <colorspace_fragment>
  }
`;

// --- Zemin: ızgara, tarama çizgisi, far aydınlığı --------------------------------------

const floorFrag = /* glsl */ `
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
    float fade = smoothstep(9.0, 1.5, r);
    float g = grid(p, 0.5) * 0.55 + grid(p, 2.5) * 0.6;
    vec3 col = uLine * g * fade * 0.16 * uGrid;
    float scan = exp(-abs(vWorld.z - uScan) * 9.0) * smoothstep(3.0, 0.5, abs(vWorld.x));
    col += uArc * scan * 0.55 * step(-2.6, uScan) * step(uScan, 2.6);
    float under = smoothstep(1.6, 0.0, length(p / vec2(1.25, 2.4)));
    col += uLine * under * uPower * 0.45;
    float pool = smoothstep(2.6, 0.0, length((p - vec2(0.0, -4.4)) / vec2(1.7, 2.4)));
    col += uLamp * pool * max(uPower, uBeam) * 0.5;
    col *= 1.0 - uDim * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createWorld(canvas, { lowTier = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowTier, powerPreference: 'high-performance' });
  renderer.setClearColor(C.ink, 1);
  const dprCap = lowTier ? 1.25 : 1.5;

  const scene = new THREE.Scene();
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
  };

  // Zemin
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShaderMaterial({
      vertexShader: shellVert,
      fragmentShader: floorFrag,
      uniforms: {
        uScan: U.uScan, uGrid: U.uGrid, uPower: U.uPower, uBeam: U.uBeam, uDim: U.uDim,
        uLine: { value: C.xray }, uArc: { value: C.arc }, uLamp: { value: C.lamp },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  // Tarama düzlemi (araç kesitinde parlayan ışık perdesi)
  const scanPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.7),
    new THREE.ShaderMaterial({
      vertexShader: wireVert,
      fragmentShader: /* glsl */ `
        uniform vec3 uArc; uniform float uA; varying vec2 vUv;
        void main() {
          float e = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(1.0, 0.4, vUv.y);
          gl_FragColor = vec4(uArc * e * 0.07 * uA, 1.0);
          #include <colorspace_fragment>
        }`,
      uniforms: { uArc: { value: C.arc }, uA: { value: 0 } },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  scanPlane.rotation.y = 0;
  scanPlane.position.y = 0.85;
  scene.add(scanPlane);

  // Tesisat hatları
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
    wires.add(mesh);
    // Hattın başlangıcı araçta ne kadar geride: tarama geçince açılır.
    wireMats.push({ mat, z0: Math.min(A.z, B.z), z1: Math.max(A.z, B.z) });
  }

  // Bileşen noktaları
  const nodes = {};
  const coreGeo = new THREE.IcosahedronGeometry(0.035, 1);
  for (const [name, n] of Object.entries(NODES)) {
    const pos = v3(n.p);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: C.current.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.position.copy(pos);
    core.scale.setScalar(n.size);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: C.xray.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.copy(pos);
    car.add(core, halo);
    nodes[name] = { pos, core, halo, size: n.size, state: 'normal', focus: 0, reveal: 0, blink: Math.random() * 6 };
  }

  // Farlar ve huzmeler
  const beams = [];
  for (const side of [-1, 1]) {
    const h = 3.4;
    const geo = new THREE.ConeGeometry(0.95, h, lowTier ? 18 : 28, 1, true);
    const beam = new THREE.Mesh(
      geo,
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
    beam.rotation.x = Math.PI / 2 + 0.06;
    beam.position.set(side * 0.62, 0.55, -1.86 - h / 2);
    car.add(beam);
    beams.push(beam);
  }

  const dashGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: C.xray.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  dashGlow.position.set(-0.35, 0.86, -0.45);
  dashGlow.scale.setScalar(0.9);
  car.add(dashGlow);

  const glowOverlays = [];
  let loaded = false;

  function load(onProgress) {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(import.meta.env.BASE_URL + 'draco/');
    loader.setDRACOLoader(draco);
    return new Promise((resolve, reject) => {
      loader.load(
        import.meta.env.BASE_URL + 'models/ferrari.glb',
        (gltf) => {
          const model = gltf.scene;
          const uniformsSolid = { uScan: U.uScan, uDim: U.uDim, uBody: { value: C.body }, uRim: { value: C.xray }, uArc: { value: C.arc } };
          const uniformsX = { uScan: U.uScan, uXray: U.uXray, uDim: U.uDim, uColor: { value: new THREE.Color('#1f9dff') }, uArc: { value: C.arc } };
          const solidMat = new THREE.ShaderMaterial({ vertexShader: shellVert, fragmentShader: solidFrag, uniforms: uniformsSolid });
          const xrayMat = new THREE.ShaderMaterial({
            vertexShader: shellVert, fragmentShader: xrayFrag, uniforms: uniformsX,
            blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
          });
          const interior = /^(interior|leather|carpet|trim|steering|carbon|blue)/;
          const meshes = [];
          model.traverse((o) => {
            if (o.isMesh) meshes.push(o);
          });
          for (const o of meshes) {
            // Telefonda iç mekânı atla: silüette görünmez, röntgende en ağır kısım.
            if (lowTier && interior.test(o.name)) {
              o.visible = false;
              continue;
            }
            o.material = solidMat;
            const x = new THREE.Mesh(o.geometry, xrayMat);
            x.renderOrder = 2;
            o.add(x);
            if (['leds', 'lights', 'brakes', 'lights_red'].includes(o.name)) {
              const col = o.name === 'leds' || o.name === 'lights' ? C.lamp : C.brake;
              const glow = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
              glow.renderOrder = 3;
              o.add(glow);
              glowOverlays.push(glow);
            }
          }
          car.add(model);
          loaded = true;
          draco.dispose();
          resolve();
        },
        (e) => e.total && onProgress?.(e.loaded / e.total),
        reject
      );
    });
  }

  // --- Durum ---------------------------------------------------------------------------
  const P = {
    tx: 0, ty: 0.5, tz: 0, az: 2.35, el: 0.12, dist: 6.2, fov: 35, sx: 0, sy: 0,
    scan: -3, xray: 1, harness: 0, flow: 0, dim: 0, power: 0, beam: 0, grid: 1,
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
    // Frustum sanal tam boyuta göre hesaplanır; görünen dikey açı P.fov kalsın.
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

    scanPlane.position.z = P.scan;
    scanPlane.material.uniforms.uA.value = P.scan > -2.5 && P.scan < 2.5 ? 1 - P.dim : 0;

    for (const w of wireMats) {
      // Tarama hattın önünden geçtikçe hat çizilir; harness 1 olunca tamamı açık.
      const byScan = THREE.MathUtils.clamp((P.scan - w.z0) / Math.max(0.3, w.z1 - w.z0), 0, 1);
      w.mat.uniforms.uReveal.value = Math.max(byScan * 0.999, P.harness);
      w.mat.uniforms.uFlow.value = P.flow;
    }

    const blinkOn = (n) => 0.55 + 0.45 * Math.sign(Math.sin(time * 7 + n.blink));
    for (const [name, n] of Object.entries(nodes)) {
      const revealTarget = P.scan > n.pos.z - 0.05 || P.harness > 0.5 ? 1 : 0;
      n.reveal += (revealTarget - n.reveal) * Math.min(1, dt * 8);
      const f = faults[name];
      n.state = f ?? 'normal';
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

    const beamPower = Math.max(P.power, P.beam);
    for (const b of beams) b.material.uniforms.uPower.value = beamPower;
    for (const g of glowOverlays) g.material.opacity = P.power * 0.9;
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
  };
}
