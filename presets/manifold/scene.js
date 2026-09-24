// Kodla çizilmiş egzoz hattı: manifold → ön boru → katalitik → DPF → susturucu → uç.
// Kamera bir yol eğrisi boyunca borunun İÇİNDEN geçer; is parçacıkları akar,
// katalitik ve DPF'de temizlenir. Sahne durumu dışarıdan `update(state)` ile verilir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

// Isı rengi (paslanmaz çelik tavlama renkleri): 0 çelik → saman → bronz → mor → mavi
const TINT = [
  [0.0, [0.8, 0.82, 0.84]],
  [0.25, [0.86, 0.71, 0.42]],
  [0.45, [0.69, 0.44, 0.24]],
  [0.65, [0.3, 0.27, 0.46]],
  [0.85, [0.2, 0.32, 0.66]],
  [1.0, [0.4, 0.46, 0.6]],
];
function tint(t) {
  t = clamp(t);
  for (let i = 1; i < TINT.length; i++) {
    const [b, cb] = TINT[i];
    const [a, ca] = TINT[i - 1];
    if (t <= b) {
      const k = (t - a) / (b - a);
      return ca.map((v, j) => v + (cb[j] - v) * k);
    }
  }
  return TINT.at(-1)[1];
}

// Hattın geometrisi (x ekseni boyunca, motor solda)
const PIPE_R = 0.19;
const CANS = [
  { id: 'katalitik', x0: -5.4, x1: -3.6, r: 0.55, cone: 0.26, y: -0.4, sz: 1 },
  { id: 'dpf', x0: -2.8, x1: -0.6, r: 0.62, cone: 0.28, y: -0.4, sz: 1 },
  { id: 'susturucu', x0: 3.0, x1: 5.4, r: 0.86, cone: 0.3, y: 0.1, sz: 0.62 },
];
const MAIN_POINTS = [
  V(-9.4, 2.05, 0.5), V(-9.05, 1.6, 0.38), V(-8.7, 1.25, 0.15), V(-8.35, 0.95, 0),
  V(-7.9, 0.4, 0), V(-7.3, -0.15, 0), V(-6.6, -0.38, 0), V(-5.8, -0.4, 0),
  V(-5.4, -0.4, 0), V(-4.5, -0.4, 0), V(-3.6, -0.4, 0), V(-3.2, -0.4, 0),
  V(-2.8, -0.4, 0), V(-1.7, -0.4, 0), V(-0.6, -0.4, 0), V(-0.2, -0.4, 0),
  V(0.7, -0.25, 0.2), V(1.5, 0.08, 0.28), V(2.2, 0.1, 0.1), V(2.6, 0.1, 0),
  V(3.0, 0.1, 0), V(4.2, 0.1, 0), V(5.4, 0.1, 0), V(5.8, 0.1, 0),
  V(6.6, 0.05, 0.12), V(7.4, 0.0, 0.25), V(8.2, 0.0, 0.3),
];
const COLLECTOR = V(-8.35, 0.95, 0);

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.FogExp2(0x1a140f, 0.0);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 80);
  scene.add(camera);
  const headlamp = new THREE.PointLight(0xfff1dc, 0, 6, 1.6);
  camera.add(headlamp);
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x1b1410, 0.55));
  const key = new THREE.DirectionalLight(0xffe2b8, 1.4);
  key.position.set(-4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6f8dff, 1.1);
  rim.position.set(6, 2, -6);
  scene.add(rim);

  // --- Yol eğrisi ve örnek tablosu ----------------------------------------
  const curve = new THREE.CatmullRomCurve3(MAIN_POINTS, false, 'centripetal');
  const SAMPLES = 1600;
  const table = { p: [], t: [], n: [], b: [], r: new Float32Array(SAMPLES + 1) };
  const frames = curve.computeFrenetFrames(SAMPLES, false);
  for (let i = 0; i <= SAMPLES; i++) {
    const p = curve.getPointAt(i / SAMPLES);
    table.p.push(p);
    table.t.push(frames.tangents[i]);
    table.n.push(frames.normals[i]);
    table.b.push(frames.binormals[i]);
    let r = PIPE_R;
    for (const c of CANS) {
      if (p.x > c.x0 && p.x < c.x1) {
        const k = Math.min(p.x - c.x0, c.x1 - p.x) / c.cone;
        r = PIPE_R + (c.r - PIPE_R) * smooth(clamp(k));
      }
    }
    table.r[i] = r;
  }
  const uAtX = (x) => {
    let best = 0;
    for (let i = 0; i <= SAMPLES; i++) if (Math.abs(table.p[i].x - x) < Math.abs(table.p[best].x - x)) best = i;
    return best / SAMPLES;
  };
  const sample = (u) => {
    const i = Math.round(clamp(u) * SAMPLES);
    return { p: table.p[i], t: table.t[i], n: table.n[i], b: table.b[i], r: table.r[i] };
  };

  // --- Malzemeler ----------------------------------------------------------
  const steel = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, metalness: 1, roughness: 0.32, side: THREE.DoubleSide,
    envMapIntensity: 1.15,
  });
  const hot = new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, metalness: 1, roughness: 0.38, side: THREE.DoubleSide,
    emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 0,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e23, metalness: 0.6, roughness: 0.55 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  // Tüp geometrisine boyuna ısı rengi yaz (heatFn: 0..1 konum → 0..1 ısı)
  function paint(geo, tubular, radial, heatFn) {
    const count = geo.attributes.position.count;
    const col = new Float32Array(count * 3);
    for (let i = 0; i <= tubular; i++) {
      const c = tint(heatFn(i / tubular));
      for (let j = 0; j <= radial; j++) {
        const k = (i * (radial + 1) + j) * 3;
        col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  // Kaynak yerlerine ısı bandı: bağlantı noktalarına yakınlık
  const JOINTS = [COLLECTOR.x, ...CANS.flatMap((c) => [c.x0, c.x1]), 7.6];
  const weldHeat = (x) => {
    let h = 0;
    for (const jx of JOINTS) h = Math.max(h, 1 - Math.abs(x - jx) / 0.22);
    return clamp(h) * 0.75;
  };

  const group = new THREE.Group();
  scene.add(group);
  const radialSeg = lite ? 14 : 22;

  // Boru parçaları (kutuların içi boş kalsın diye kutu aralıkları atlanır)
  const gaps = CANS.map((c) => [uAtX(c.x0) + 0.001, uAtX(c.x1) - 0.001]);
  const uCollector = uAtX(COLLECTOR.x);
  const pipeRanges = [];
  let start = 0;
  for (const [a, b] of gaps) {
    pipeRanges.push([start, a]);
    start = b;
  }
  pipeRanges.push([start, 1]);
  for (const [u0, u1] of pipeRanges) {
    const pts = [];
    const n = Math.max(8, Math.round((u1 - u0) * 120));
    for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(u0 + ((u1 - u0) * i) / n));
    const sub = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tubular = Math.max(12, Math.round((u1 - u0) * (lite ? 260 : 460)));
    const geo = new THREE.TubeGeometry(sub, tubular, PIPE_R, radialSeg, false);
    const isHot = u0 === 0;
    paint(geo, tubular, radialSeg, (t) => {
      const u = u0 + (u1 - u0) * t;
      const x = curve.getPointAt(u).x;
      const manifoldHeat = isHot ? 1 - clamp((u - uCollector * 0.3) / (uCollector * 2.4)) : 0;
      return Math.max(weldHeat(x), manifoldHeat * 0.95);
    });
    group.add(new THREE.Mesh(geo, isHot ? hot : steel));
  }

  // Diğer üç manifold kolu (ısı renkli)
  for (let k = 1; k <= 3; k++) {
    const x = -9.4 + k * 0.42;
    const pts = [V(x, 2.05, 0.5), V(x + (-8.9 - x) * 0.25, 1.6, 0.4), V(-8.55 + k * 0.05, 1.22, 0.14), COLLECTOR.clone()];
    const sub = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tubular = 40;
    const geo = new THREE.TubeGeometry(sub, tubular, 0.16, radialSeg, false);
    paint(geo, tubular, radialSeg, (t) => 0.55 + t * 0.4);
    group.add(new THREE.Mesh(geo, hot));
  }
  // Manifold ağızları: içleri kor gibi parlar (motor tarafı)
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (let k = 0; k <= 3; k++) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(k ? 0.15 : 0.18, 24), emberMat);
    e.position.set(-9.4 + k * 0.42, 2.05, 0.5);
    e.rotation.x = -Math.PI / 2;
    group.add(e);
    if (!k) e.visible = false; // kamera buradan girer
  }


  // Kutular (katalitik, DPF, susturucu): torna profili, x eksenine yatırılır
  const canMeshes = {};
  for (const c of CANS) {
    const L = c.x1 - c.x0;
    const prof = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * L;
      const k = Math.min(y, L - y) / c.cone;
      prof.push(new THREE.Vector2(PIPE_R + (c.r - PIPE_R) * smooth(clamp(k)), y - L / 2));
    }
    const geo = new THREE.LatheGeometry(prof, lite ? 28 : 44);
    // Renk: uçlarda kaynak bandı
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + L / 2;
      const h = clamp(1 - Math.min(y, L - y) / 0.2) * 0.7;
      const cc = tint(h);
      col.set(cc, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, steel);
    m.rotation.z = -Math.PI / 2;
    m.scale.set(1, 1, c.sz);
    m.position.set((c.x0 + c.x1) / 2, c.y, 0);
    group.add(m);
    canMeshes[c.id] = m;
  }

  // Petek (katalitik ve DPF): altıgen hücre shader'ı
  const honeyMat = (kind) =>
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uKind: { value: kind }, uSoot: { value: 1 }, uClean: { value: 0 }, uTime: { value: 0 },
        uGlow: { value: 0 }, uAlpha: { value: 1 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uKind, uSoot, uClean, uTime, uGlow, uAlpha;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        vec4 hex(vec2 p){
          vec2 s = vec2(1.0, 1.7320508);
          vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
          vec4 h4 = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
          return dot(h4.xy, h4.xy) < dot(h4.zw, h4.zw) ? vec4(h4.xy, hc.xy) : vec4(h4.zw, hc.zw + 9.73);
        }
        void main(){
          vec2 c = vUv - 0.5; float r = length(c) * 2.0;
          if (r > 1.0) discard;
          vec4 hx = hex(c * 34.0);
          vec2 g = abs(hx.xy); float edge = max(dot(g, normalize(vec2(1.0, 1.7320508))), g.x);
          float wall = smoothstep(0.40, 0.47, edge);
          float n = h(hx.zw);
          vec3 ceramic = vec3(0.86, 0.82, 0.74);
          vec3 soot = vec3(0.05, 0.04, 0.035);
          vec3 cell = vec3(0.12, 0.1, 0.09);
          float dirty = step(n, uSoot) * (1.0 - smoothstep(uClean * 1.25 - 0.12, uClean * 1.25, r));
          vec3 wallCol = ceramic;
          if (uKind < 0.5) { // katalitik: platin/paladyum parıltısı
            float sh = pow(max(0.0, sin(n * 40.0 + uTime * 2.4)), 16.0) * uGlow;
            wallCol = mix(ceramic * 0.8, vec3(0.93, 0.9, 0.84), sh);
            cell = mix(vec3(0.16, 0.1, 0.06), vec3(1.0, 0.55, 0.18), uGlow * 0.55 * (0.6 + 0.4 * sin(uTime * 3.0 + n * 6.0)));
          } else { // DPF: is dolu hücreler temizlenir
            cell = mix(vec3(0.2, 0.18, 0.16), soot, dirty);
            wallCol = mix(ceramic, vec3(0.16, 0.14, 0.12), dirty * 0.85);
          }
          vec3 col = mix(cell, wallCol, wall);
          float rimDark = smoothstep(0.82, 1.0, r);
          col *= 1.0 - rimDark * 0.6;
          gl_FragColor = vec4(col, uAlpha);
        }`,
    });
  const honey = {};
  for (const [id, kind] of [['katalitik', 0], ['dpf', 1]]) {
    const c = CANS.find((x) => x.id === id);
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(c.r * 0.985, 64), honeyMat(kind));
    mesh.rotation.y = -Math.PI / 2;
    mesh.position.set((c.x0 + c.x1) / 2, c.y, 0);
    mesh.renderOrder = 2;
    group.add(mesh);
    honey[id] = mesh;
  }

  // Susturucu içi delikli bölmeler
  const baffleMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uAlpha: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uAlpha;
      void main(){
        vec2 c = vUv - 0.5; float r = length(c) * 2.0; if (r > 1.0) discard;
        vec2 g = fract(vUv * 22.0) - 0.5; float hole = step(length(g), 0.28);
        if (r < 0.26) hole = 1.0;
        if (hole > 0.5) discard;
        vec3 col = mix(vec3(0.58, 0.6, 0.63), vec3(0.32, 0.33, 0.36), r);
        gl_FragColor = vec4(col, uAlpha);
      }`,
  });
  const mufC = CANS[2];
  const baffles = [];
  for (const bx of [3.7, 4.7]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(mufC.r * 0.97, 48), baffleMat);
    m.rotation.y = -Math.PI / 2;
    m.scale.set(mufC.sz, 1, 1);
    m.position.set(bx, mufC.y, 0);
    group.add(m);
    baffles.push(m);
  }

  // Egzoz ucu (krom, geniş ağız)
  const tip = sample(1);
  const tipGeo = new THREE.LatheGeometry(
    [new THREE.Vector2(PIPE_R * 0.98, -0.02), new THREE.Vector2(0.24, 0.12), new THREE.Vector2(0.27, 0.5), new THREE.Vector2(0.25, 0.52)],
    lite ? 28 : 44
  );
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 1, roughness: 0.12, side: THREE.DoubleSide });
  const tipMesh = new THREE.Mesh(tipGeo, chrome);
  tipMesh.position.copy(tip.p).addScaledVector(tip.t, -0.3);
  tipMesh.quaternion.setFromUnitVectors(V(0, 1, 0), tip.t);
  group.add(tipMesh);

  // Askılar
  for (const x of [-6.2, -0.1, 6.4]) {
    const s = sample(uAtX(x));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 8, 20), rubber);
    ring.position.copy(s.p);
    ring.lookAt(s.p.clone().add(s.t));
    group.add(ring);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), dark);
    rod.position.copy(s.p).add(V(0, 0.65, 0));
    group.add(rod);
  }

  // --- Akış parçacıkları (borunun içinde) ----------------------------------
  const N = lite ? 520 : 1300;
  const flowU = new Float32Array(N);
  const flowA = new Float32Array(N);
  const flowR = new Float32Array(N);
  const flowS = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    flowU[i] = Math.random();
    flowA[i] = Math.random() * Math.PI * 2;
    flowR[i] = Math.sqrt(Math.random()) * 0.85;
    flowS[i] = 0.6 + Math.random() * 0.8;
  }
  const flowGeo = new THREE.BufferGeometry();
  const flowPos = new Float32Array(N * 3);
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  flowGeo.setAttribute('aU', new THREE.BufferAttribute(flowU, 1));
  const puff = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const flowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uMap: { value: puff }, uCatU: { value: 0.3 }, uDpfU: { value: 0.5 },
      uCat: { value: 0 }, uDpf: { value: 0 }, uSize: { value: 14 * dpr }, uAlpha: { value: 1 },
    },
    vertexShader: `
      attribute float aU; varying float vU;
      uniform float uSize;
      void main(){
        vU = aU;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize / max(0.05, -mv.z);
      }`,
    fragmentShader: `
      varying float vU; uniform sampler2D uMap; uniform float uCatU, uDpfU, uCat, uDpf, uAlpha;
      void main(){
        float a = texture2D(uMap, gl_PointCoord).a;
        // Katalitikten önce kahverengi-siyah is, sonra gri, DPF'den sonra neredeyse görünmez buhar
        float afterCat = step(uCatU, vU) * uCat;
        float afterDpf = step(uDpfU, vU) * uDpf;
        vec3 soot = vec3(0.09, 0.07, 0.05);
        vec3 grey = vec3(0.42, 0.4, 0.38);
        vec3 vapor = vec3(0.92, 0.95, 1.0);
        vec3 col = mix(soot, grey, afterCat);
        col = mix(col, vapor, afterDpf);
        float op = mix(0.55, 0.32, afterCat);
        op = mix(op, 0.08, afterDpf);
        gl_FragColor = vec4(col, a * op * uAlpha);
      }`,
  });
  const flow = new THREE.Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  scene.add(flow);

  // --- Uçtan çıkan duman (dışarıdan görünen) -------------------------------
  const PN = lite ? 110 : 220;
  const plumeGeo = new THREE.BufferGeometry();
  const plumePos = new Float32Array(PN * 3);
  const plumeAge = new Float32Array(PN);
  const plumeSeed = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    plumeAge[i] = Math.random();
    plumeSeed.set([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], i * 3);
  }
  plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));
  plumeGeo.setAttribute('aAge', new THREE.BufferAttribute(plumeAge, 1));
  const plumeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: puff }, uDirt: { value: 1 }, uSize: { value: 120 * dpr }, uAlpha: { value: 1 } },
    vertexShader: `
      attribute float aAge; varying float vAge; uniform float uSize;
      void main(){
        vAge = aAge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.25 + aAge * 1.3) / max(0.1, -mv.z);
      }`,
    fragmentShader: `
      varying float vAge; uniform sampler2D uMap; uniform float uDirt, uAlpha;
      void main(){
        float a = texture2D(uMap, gl_PointCoord).a;
        vec3 col = mix(vec3(0.9, 0.93, 0.97), vec3(0.08, 0.07, 0.06), uDirt);
        float op = (1.0 - vAge) * mix(0.18, 0.5, uDirt);
        gl_FragColor = vec4(col, a * op * uAlpha);
      }`,
  });
  const plume = new THREE.Points(plumeGeo, plumeMat);
  plume.frustumCulled = false;
  scene.add(plume);

  // --- Durum ve güncelleme -------------------------------------------------
  const uCatCenter = uAtX(-4.5);
  const uDpfCenter = uAtX(-1.7);
  flowMat.uniforms.uCatU.value = uCatCenter;
  flowMat.uniforms.uDpfU.value = uDpfCenter;

  const tmp = V(0, 0, 0);
  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    flowMat.uniforms.uSize.value = 14 * dpr * (height / 900);
    plumeMat.uniforms.uSize.value = 120 * dpr * (height / 900);
  }
  resize();

  let slowFrames = 0;
  let last = performance.now();
  const fwd = V(0, 0, 0);

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(s.look);
    headlamp.intensity = s.inside * (0.35 + s.clean * 0.5) * (1 - s.heatInside);

    // ACES yüksek yoğunlukta turuncuyu pembeye çeker: içeride düşük ve doygun tut
    hot.emissiveIntensity = s.heat * 0.5 * (1 - s.inside) + s.heatInside * 0.7;
    hot.emissive.setRGB(1, 0.3 - s.heatInside * 0.14, 0.06 - s.heatInside * 0.05);
    // Sahne ortam ışığı (malzeme envMapIntensity scene.environment'ta etkisiz)
    scene.environmentIntensity = 1.1 * (1 - s.inside * 0.55) * (1 - s.heatInside * 0.9);
    scene.fog.color.setRGB(0.05 + 0.03 * s.heatInside, 0.045 + 0.01 * s.heatInside, 0.04);
    scene.fog.density = s.fog;

    for (const id of ['katalitik', 'dpf']) {
      const u = honey[id].material.uniforms;
      u.uTime.value = t;
      u.uAlpha.value = s.honeyAlpha[id];
    }
    honey.katalitik.material.uniforms.uGlow.value = s.cat;
    honey.dpf.material.uniforms.uClean.value = s.dpf;
    baffleMat.uniforms.uAlpha.value = s.baffleAlpha;

    // Akış: parçacıklar ileri akar
    flowMat.uniforms.uCat.value = s.cat;
    flowMat.uniforms.uDpf.value = s.dpf;
    flowMat.uniforms.uAlpha.value = s.flowAlpha;
    flow.visible = s.flowAlpha > 0.01;
    if (flow.visible) {
      const speed = (0.035 + s.speed * 0.25) * dt;
      for (let i = 0; i < N; i++) {
        let u = flowU[i] + speed * flowS[i];
        if (u > 1) u -= 1;
        flowU[i] = u;
        const sm = sample(u);
        const a = flowA[i] + t * 0.6 * flowS[i];
        const rr = flowR[i] * sm.r;
        tmp.copy(sm.p).addScaledVector(sm.n, Math.cos(a) * rr).addScaledVector(sm.b, Math.sin(a) * rr * (sm.p.x > 3 && sm.p.x < 5.4 ? mufC.sz : 1));
        flowPos[i * 3] = tmp.x; flowPos[i * 3 + 1] = tmp.y; flowPos[i * 3 + 2] = tmp.z;
      }
      flowGeo.attributes.position.needsUpdate = true;
      flowGeo.attributes.aU.needsUpdate = true;
    }

    // Uç dumanı
    plumeMat.uniforms.uDirt.value = s.plumeDirt;
    plumeMat.uniforms.uAlpha.value = s.plumeAlpha;
    plume.visible = s.plumeAlpha > 0.01;
    if (plume.visible) {
      fwd.copy(tip.t);
      for (let i = 0; i < PN; i++) {
        let age = plumeAge[i] + dt * 0.45;
        if (age > 1) age -= 1;
        plumeAge[i] = age;
        const k = i * 3;
        const spread = 0.12 + age * 0.9;
        plumePos[k] = tip.p.x + fwd.x * age * 3.2 + plumeSeed[k] * spread;
        plumePos[k + 1] = tip.p.y + fwd.y * age * 3.2 + plumeSeed[k + 1] * spread + age * age * 0.9;
        plumePos[k + 2] = tip.p.z + fwd.z * age * 3.2 + plumeSeed[k + 2] * spread;
      }
      plumeGeo.attributes.position.needsUpdate = true;
      plumeGeo.attributes.aAge.needsUpdate = true;
    }

    group.rotation.y = s.spin;
    flow.rotation.y = s.spin;
    plume.rotation.y = s.spin;

    renderer.render(scene, camera);

    // Uyarlanır kalite: yavaş kareler birikirse çözünürlüğü düşür
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
    renderer, camera, update, resize, sample, uAtX, scene, mats: { steel, hot },
    compile: () => renderer.compile(scene, camera),
    stations: {
      inlet: 0, collector: uCollector, cat: uCatCenter, dpf: uDpfCenter,
      muffler: uAtX(4.2), baffle1: uAtX(3.7), tip: 1,
      catIn: uAtX(-5.4), dpfIn: uAtX(-2.8), mufIn: uAtX(3.0),
    },
    tip,
  };
}
