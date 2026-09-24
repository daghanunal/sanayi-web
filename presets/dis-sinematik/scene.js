// Işık Masası sahnesi: Blender'da SDF ile modellenen azı dişi (mine / dentin / pulpa katmanları),
// röntgen taraması, diş taşı temizliği, kompozit dolgu, kanal kesiti, implant ve ortodonti arkı.
// Sahne durumu dışarıdan `update(state)` ile verilir; kurgu main.js'te.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);

const NOISE = /* glsl */ `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

const VERT = /* glsl */ `
varying vec3 vPos; varying vec3 vWN; varying vec3 vView;
void main(){
  vPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWN = normalize(mat3(modelMatrix) * normal);
  vView = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Katman malzemesi: mine/dentin/pulpa/kemik/diş eti aynı gölgelendiriciyi paylaşır.
const FRAG = /* glsl */ `
uniform vec3 uColor; uniform vec3 uCutColor; uniform vec3 uRim; uniform vec3 uGlowColor; uniform vec3 uFillColor;
uniform float uAlpha; uniform float uCut; uniform float uClipBelow; uniform float uScan; uniform float uKind;
uniform float uPlaque; uniform float uClean; uniform float uCavity; uniform float uFill; uniform float uGlow;
uniform float uCanal; uniform float uTime; uniform float uCure; uniform vec3 uCav; uniform float uSpong;
varying vec3 vPos; varying vec3 vWN; varying vec3 vView;
${NOISE}
void main(){
  if (vPos.z > uCut || vPos.y < uClipBelow || vPos.y > uScan) discard;
  vec3 N = normalize(vWN); vec3 V = normalize(vView);
  float nz = vnoise(vPos * 7.0) * 0.6 + vnoise(vPos * 19.0) * 0.4;
  if (!gl_FrontFacing) {
    // Kesit yüzü (kapalı kabuğun içi): düz katman rengi
    vec3 c = uCutColor * (0.9 + nz * 0.16);
    if (uSpong > 0.0) {
      float s = smoothstep(0.52, 0.6, vnoise(vPos * 16.0));
      c = mix(c, c * 0.62, s * uSpong);
    }
    if (uCanal > 0.0) {
      float line = mix(0.48, -1.3, uCanal);
      c = mix(c, uFillColor, step(line, vPos.y));
    }
    c += uGlowColor * uGlow * (0.7 + 0.3 * sin(uTime * 5.0));
    gl_FragColor = vec4(c, uAlpha);
    #include <colorspace_fragment>
    return;
  }
  vec3 base = uColor;
  float pl = 0.0;
  if (uKind < 0.5) {
    base = mix(vec3(0.86, 0.78, 0.6), base, smoothstep(-0.25, 0.08, vPos.y));
    base *= 0.9 + 0.1 * nz;
    // Diş taşı: boyuna ve aralara yığılır, temizlik cephesi üstten aşağı iner
    float band = smoothstep(0.42, 0.02, vPos.y) * smoothstep(-0.32, -0.02, vPos.y);
    pl = smoothstep(0.62, 0.74, nz * 0.7 + band * 0.55) * uPlaque * step(vPos.y, uClean);
    base = mix(base, vec3(0.74, 0.6, 0.36), pl * 0.8);
    float cd = distance(vPos, uCav) + (vnoise(vPos * 22.0) - 0.5) * 0.06;
    float cav = smoothstep(0.15, 0.09, cd) * uCavity;
    vec3 dark = vec3(0.12, 0.07, 0.04);
    base = mix(base, mix(dark, vec3(0.95, 0.96, 1.0), uFill), cav);
    base += vec3(0.25, 0.45, 1.0) * uCure * smoothstep(0.3, 0.05, cd) * 1.4;
  }
  if (uCanal > 0.0) {
    float line = mix(0.48, -1.3, uCanal);
    base = mix(base, uFillColor, step(line, vPos.y));
  }
  vec3 L1 = normalize(vec3(0.55, 0.85, 0.7));
  vec3 L2 = normalize(vec3(-0.8, 0.1, -0.5));
  float wrap = max(0.0, (dot(N, L1) + 0.4) / 1.4);
  float back = max(0.0, dot(N, L2));
  vec3 H = normalize(L1 + V);
  float gloss = uKind < 0.5 ? 1.0 : 0.3;
  float spec = pow(max(dot(N, H), 0.0), 70.0) * 0.55 * gloss * (1.0 - pl);
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  // Mine yarı saydam gibi: ışık kenarda içeri süzülür
  vec3 sss = vec3(1.0, 0.72, 0.55) * pow(max(0.0, 1.0 - dot(N, V)), 1.6) * 0.18 * gloss;
  vec3 col = base * (0.16 + 0.66 * wrap) + base * back * 0.14 + spec + sss + uRim * fr * 0.45;
  col += uGlowColor * uGlow * (0.7 + 0.3 * sin(uTime * 5.0));
  // Tarama çizgisi yakınında parıltı
  float sl = smoothstep(0.06, 0.0, abs(vPos.y - uScan));
  col += vec3(0.55, 0.85, 1.0) * sl * 1.2;
  gl_FragColor = vec4(col, uAlpha);
  #include <colorspace_fragment>
}`;

// Röntgen: yoğunluk kenarda artar, üst üste binen katmanlar toplanır
const XFRAG = /* glsl */ `
uniform vec3 uTint; uniform float uAmt; uniform float uScan; uniform float uCut; uniform vec3 uCav; uniform float uCavity; uniform float uDense;
varying vec3 vPos; varying vec3 vWN; varying vec3 vView;
void main(){
  if (vPos.y < uScan || vPos.z > uCut) discard;
  vec3 N = normalize(vWN); vec3 V = normalize(vView);
  float f = 1.0 - abs(dot(N, V));
  float d = uDense * (0.05 + pow(f, 2.2) * 0.8);
  float cav = smoothstep(0.2, 0.08, distance(vPos, uCav)) * uCavity;
  vec3 c = uTint * d * (1.0 - cav * 0.9);
  vec3 o = c * uAmt; gl_FragColor = vec4(o, clamp(max(o.r, max(o.g, o.b)), 0.0, 1.0));
}`;

function layerMat(o) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      uColor: { value: C(o.color) }, uCutColor: { value: C(o.cut ?? o.color) }, uRim: { value: C(o.rim ?? '#9fd4ff') },
      uGlowColor: { value: C(o.glow ?? '#ff3050') }, uFillColor: { value: C(o.fill ?? '#e98a5c') },
      uAlpha: { value: 1 }, uCut: { value: 9 }, uClipBelow: { value: -9 }, uScan: { value: 9 }, uKind: { value: o.kind ?? 1 },
      uPlaque: { value: 0 }, uClean: { value: 9 }, uCavity: { value: 0 }, uFill: { value: 0 }, uGlow: { value: 0 },
      uCanal: { value: 0 }, uTime: { value: 0 }, uCure: { value: 0 }, uCav: { value: V(0.2, 0.6, 0.2) }, uSpong: { value: o.spong ?? 0 },
    },
  });
}
function xrayMat(dense) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: XFRAG, side: THREE.DoubleSide, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: {
      uTint: { value: C('#bfe4ff') }, uAmt: { value: 0 }, uScan: { value: 9 }, uCut: { value: 9 },
      uCav: { value: V(0.2, 0.6, 0.2) }, uCavity: { value: 0 }, uDense: { value: dense },
    },
  });
}

// Helis dişli titanyum vida (gerçek vida adımı: açıya bağlı yarıçap)
function screwGeometry() {
  const RS = 64, HS = 150, y0 = -1.28, y1 = -0.04, pitch = 0.13;
  const pos = [], idx = [];
  for (let j = 0; j <= HS; j++) {
    const y = y0 + (y1 - y0) * (j / HS);
    const taper = THREE.MathUtils.smoothstep(y, y0, y0 + 0.35);
    for (let i = 0; i <= RS; i++) {
      const a = (i / RS) * Math.PI * 2;
      const ph = ((y + (a / (Math.PI * 2)) * pitch) / pitch) % 1;
      const tri = Math.abs(ph * 2 - 1);
      const core = 0.13 + 0.05 * taper;
      const thread = (y < y1 - 0.08 ? 0.055 : 0) * tri * (0.4 + 0.6 * taper);
      const r = core + thread;
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  for (let j = 0; j < HS; j++) for (let i = 0; i < RS; i++) {
    const a = j * (RS + 1) + i, b = a + RS + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createScene(canvas, { lite = false, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x1a1020, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);

  // --- Arka plan: ünite lambası halkası ve toz ------------------------------
  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uAmt: { value: 1 }, uTime: { value: 0 }, uTint: { value: C('#b9dcff') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uAmt; uniform float uTime; uniform vec3 uTint; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p);
        float ring = exp(-pow((r - 0.72) / 0.022, 2.0)) * 0.55 + exp(-pow((r - 0.72) / 0.14, 2.0)) * 0.12;
        float a = atan(p.y, p.x);
        float leds = 0.82 + 0.18 * smoothstep(0.4, 0.95, abs(sin(a * 24.0)));
        float core = exp(-r * r * 5.0) * 0.14;
        vec3 o = uTint * (ring * leds + core) * uAmt; gl_FragColor = vec4(o, clamp(max(o.r, max(o.g, o.b)), 0.0, 1.0));
      }`,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), haloMat);
  halo.position.set(0, 0.1, -3.2);
  scene.add(halo);

  const DUST = lite ? 180 : 360;
  const dpos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 9;
    dpos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dpos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 1 }, uPx: { value: dpr } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPx; varying float vA;
      void main(){
        vec3 p = position; p.y = mod(p.y + uTime * 0.08 + 3.5, 7.0) - 3.5; p.x += sin(uTime * 0.3 + position.z * 2.0) * 0.1;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uPx * (2.0 + 5.0 * fract(position.x * 7.1)) * (3.0 / -mv.z);
        vA = 0.25 + 0.75 * fract(position.z * 3.7);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAmt; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA * uAmt; gl_FragColor = vec4(vec3(0.75, 0.88, 1.0) * a * 0.5, a * 0.5); }`,
  });
  scene.add(new THREE.Points(dgeo, dustMat));

  // --- Ana diş -------------------------------------------------------------
  const tooth = new THREE.Group();
  scene.add(tooth);
  const toothInner = new THREE.Group();
  toothInner.position.y = 0.22;
  tooth.add(toothInner);

  const M = {
    mine: layerMat({ color: '#f4efe4', cut: '#fbf7ee', kind: 0 }),
    dentin: layerMat({ color: '#e9cf9c', cut: '#e3c285', rim: '#000000' }),
    pulpa: layerMat({ color: '#d6445a', cut: '#c9354c', rim: '#000000', glow: '#ff2a48' }),
    bone: layerMat({ color: '#ead8c2', cut: '#dcc3a3', rim: '#6d86a0', spong: 1 }),
    gum: layerMat({ color: '#e27f8c', cut: '#d6606f', rim: '#ffb7c2' }),
    arch: layerMat({ color: '#f4efe4', kind: 0 }),
    crown: layerMat({ color: '#f7f3ea', kind: 0 }),
    archGum: layerMat({ color: '#e27f8c', rim: '#ffb7c2' }),
  };
  M.arch.uniforms.uClipBelow.value = -0.04;
  M.crown.uniforms.uClipBelow.value = 0.0;
  const X = { mine: xrayMat(1.0), dentin: xrayMat(0.7), pulpa: xrayMat(0.35) };

  const titanium = new THREE.MeshStandardMaterial({ color: 0xc3c8cf, metalness: 1, roughness: 0.28, transparent: true });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.22, transparent: true, opacity: 0 });

  const parts = {};
  const implant = new THREE.Group();
  const arch = new THREE.Group();
  scene.add(implant, arch);
  implant.visible = false;
  arch.visible = false;
  const archTeeth = [];
  const brackets = [];
  let wire = null;
  const cure = new THREE.PointLight(0x4f7bff, 0, 3, 1.5);
  scene.add(cure);

  // Temizlikte kopan taş parçacıkları
  const CHIPS = 90;
  const cpos = new Float32Array(CHIPS * 3), cdir = [];
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  const chipMat = new THREE.PointsMaterial({ color: 0xe8d9a8, size: 0.035, transparent: true, opacity: 0, depthWrite: false });
  const chips = new THREE.Points(cgeo, chipMat);
  toothInner.add(chips);
  for (let i = 0; i < CHIPS; i++) {
    const a = Math.random() * Math.PI * 2;
    cdir.push({ a, y: Math.random(), s: 0.5 + Math.random() });
  }

  // Tarama halkası
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xa9dcff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.008, 8, 96), ringMat);
  ring.rotation.x = Math.PI / 2;
  const discMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uAmt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uAmt; varying vec2 vUv; void main(){ float r = length(vUv * 2.0 - 1.0); float a = smoothstep(1.0, 0.55, r) * smoothstep(0.2, 1.0, r) * 0.35 * uAmt; gl_FragColor = vec4(vec3(0.6, 0.85, 1.0) * a, a); }',
  });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), discMat);
  disc.rotation.x = -Math.PI / 2;
  const scanRig = new THREE.Group();
  scanRig.add(ring, disc);
  toothInner.add(scanRig);

  let ready = false;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(import.meta.env.BASE_URL + 'draco/');
  loader.setDRACOLoader(draco);
  loader.load(import.meta.env.BASE_URL + 'img/dis-sinematik/dis.glb', (gltf) => {
    const geo = {};
    gltf.scene.traverse((o) => { if (o.isMesh) geo[o.name.replace(/[._]\d+$/, '')] = o.geometry; });
    for (const k of ['mine', 'dentin', 'pulpa']) {
      const g = geo[k[0].toUpperCase() + k.slice(1)];
      const m = new THREE.Mesh(g, M[k]);
      m.renderOrder = k === 'mine' ? 3 : k === 'dentin' ? 2 : 1;
      const x = new THREE.Mesh(g, X[k]);
      x.renderOrder = 10;
      toothInner.add(m, x);
      parts[k] = m;
      parts['x' + k] = x;
    }
    // Çürük yeri: kronun ön-üst yüzüne ışın
    const rc = new THREE.Raycaster(V(0.2, 2, 0.26), V(0, -1, 0));
    const hit = rc.intersectObject(parts.mine)[0];
    const cav = hit ? hit.point.clone().sub(toothInner.getWorldPosition(V(0, 0, 0))) : V(0.2, 0.6, 0.26);
    for (const m of [M.mine, X.mine, X.dentin, X.pulpa]) m.uniforms.uCav.value.copy(cav);
    anchors.cavity.copy(cav);
    // Temizlik parçacıkları diş yüzeyine yakın başlar
    buildImplant(geo.Mine);
    buildArch(geo.Mine, geo.Kesici);
    ready = true;
    onReady?.();
  });

  function buildImplant(mineGeo) {
    const bone = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.45, 1.7, 4, 0.28), M.bone);
    bone.position.y = -0.78;
    const gum = new THREE.Mesh(new RoundedBoxGeometry(2.42, 0.34, 1.82, 4, 0.16), M.gum);
    gum.position.y = -0.03;
    // Vidanın boşluğunu kesitte göstermek için koyu kanal
    const screw = new THREE.Mesh(screwGeometry(), titanium);
    const abut = new THREE.Mesh(new THREE.LatheGeometry([
      V(0, -0.06, 0), V(0.14, -0.06, 0), V(0.155, 0.05, 0), V(0.13, 0.12, 0), V(0.1, 0.34, 0), V(0.0, 0.36, 0),
    ].map((v) => new THREE.Vector2(v.x, v.y)), 40), titanium);
    const crown = new THREE.Mesh(mineGeo, M.crown);
    crown.renderOrder = 3;
    implant.add(bone, gum, screw, abut, crown);
    implant.position.y = 0.22;
    Object.assign(parts, { bone, gum, screw, abut, crown });
  }

  function buildArch(mineGeo, incGeo) {
    // Sağdan sola: M2 M1 P2 P1 K I2 I1 | I1 I2 K P1 P2 M1 M2
    const half = [
      { t: 'm', w: 0.5, s: [0.5, 0.46, 0.5] }, { t: 'm', w: 0.54, s: [0.52, 0.48, 0.52] },
      { t: 'p', w: 0.38, s: [0.36, 0.44, 0.44] }, { t: 'p', w: 0.38, s: [0.36, 0.45, 0.44] },
      { t: 'k', w: 0.42, s: [0.58, 0.62, 0.9] }, { t: 'i', w: 0.37, s: [0.55, 0.52, 0.72] }, { t: 'i', w: 0.45, s: [0.72, 0.58, 0.74] },
    ];
    const list = [...half, ...half.slice().reverse()];
    const pts = [V(-1.25, 0, -1.35), V(-1.18, 0, -0.35), V(-0.88, 0, 0.42), V(-0.36, 0, 0.9), V(0.36, 0, 0.9), V(0.88, 0, 0.42), V(1.18, 0, -0.35), V(1.25, 0, -1.35)];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const total = list.reduce((a, b) => a + b.w, 0);
    const len = curve.getLength();
    const gap = (len - total) / (list.length + 1);
    let u = gap;
    const rnd = (i) => Math.sin(i * 91.7 + 3.1) * 0.5 + 0.5;
    list.forEach((tDef, i) => {
      const mid = (u + tDef.w / 2) / len;
      u += tDef.w + gap;
      const p = curve.getPointAt(mid);
      const tan = curve.getTangentAt(mid);
      const n = V(tan.z, 0, -tan.x).normalize(); // dışa bakan
      const mesh = new THREE.Mesh(tDef.t === 'm' || tDef.t === 'p' ? mineGeo : incGeo, M.arch);
      mesh.scale.set(...tDef.s);
      const base = { pos: p.clone(), rot: Math.atan2(n.x, n.z) };
      const k = i - 6.5;
      const mis = {
        dx: (rnd(i) - 0.5) * 0.12, dn: (rnd(i + 7) - 0.5) * (Math.abs(k) < 4 ? 0.34 : 0.14),
        rot: (rnd(i + 13) - 0.5) * (Math.abs(k) < 4 ? 0.9 : 0.35), tilt: (rnd(i + 21) - 0.5) * 0.3, dy: (rnd(i + 3) - 0.5) * 0.08,
      };
      arch.add(mesh);
      // Braket
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), wireMat);
      arch.add(br);
      archTeeth.push({ mesh, base, mis, n, depth: tDef.t === 'm' || tDef.t === 'p' ? tDef.s[2] * 0.47 : tDef.s[2] * 0.2, h: tDef.t === 'm' || tDef.t === 'p' ? 0.17 : 0.24, br });
    });
    const gumGeo = new THREE.TubeGeometry(curve, 80, 0.26, 16, false);
    const archGum = new THREE.Mesh(gumGeo, M.archGum);
    archGum.scale.set(1, 1, 1);
    archGum.position.y = -0.12;
    arch.add(archGum);
    // Tel: arkın dış yüzeyi boyunca
    const wpts = [];
    for (let i = 0; i <= 60; i++) {
      const t = 0.07 + (i / 60) * 0.86;
      const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const n = V(tan.z, 0, -tan.x).normalize();
      wpts.push(p.add(n.multiplyScalar(0.3)).setY(0.19));
    }
    wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wpts), 120, 0.012, 6, false), wireMat);
    arch.add(wire);
    arch.userData.curve = curve;
  }

  const anchors = {
    cavity: V(0.2, 0.6, 0.26),
    mine: V(0.46, 0.42, -0.1), dentin: V(0.26, 0.05, -0.1), pulpa: V(0.02, 0.2, -0.1),
    screw: V(0.2, -0.7, 0), bone: V(-0.8, -1.0, 0),
  };

  // --- Boyut ------------------------------------------------------------------
  let width = 1, height = 1;
  let shiftX = 0, shiftY = 0;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyOffset();
  }
  function applyOffset() {
    // Kompozisyon: diş ekranın sağında (masaüstü) ya da üstünde (telefon) dursun
    camera.setViewOffset(width, height, -shiftX * width, -shiftY * height, width, height);
    camera.updateProjectionMatrix();
  }
  resize();

  const tmp = V(0, 0, 0);
  function project(name, group = toothInner) {
    tmp.copy(anchors[name]);
    group.updateWorldMatrix(true, false);
    tmp.applyMatrix4(group.matrixWorld).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * width, y: (-tmp.y * 0.5 + 0.5) * height, z: tmp.z };
  }

  let last = performance.now();
  let slowFrames = 0;
  const look = V(0, 0, 0);

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    if (s.shiftX !== shiftX || s.shiftY !== shiftY) {
      shiftX = s.shiftX; shiftY = s.shiftY; applyOffset();
    }
    // Kamera: hedef etrafında küresel konum
    const ce = Math.cos(s.camEl);
    camera.position.set(Math.sin(s.camAz) * ce * s.camDist, s.camY + Math.sin(s.camEl) * s.camDist, Math.cos(s.camAz) * ce * s.camDist);
    look.set(0, s.camY, 0);
    camera.lookAt(look);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    halo.lookAt(camera.position);
    haloMat.uniforms.uAmt.value = s.halo;
    haloMat.uniforms.uTime.value = t;
    dustMat.uniforms.uTime.value = t;

    tooth.visible = s.tooth > 0.001;
    tooth.position.y = s.toothY;
    tooth.rotation.set(s.rotX, s.rotY, s.rotZ ?? 0);
    tooth.scale.setScalar(s.toothScale ?? 1);
    for (const k of ['mine', 'dentin', 'pulpa']) {
      const u = M[k].uniforms;
      u.uAlpha.value = s.tooth;
      u.uCut.value = s.cut;
      u.uScan.value = s.scan;
      u.uTime.value = t;
      X[k].uniforms.uScan.value = s.scan;
      X[k].uniforms.uCut.value = s.cut;
      X[k].uniforms.uAmt.value = s.xray * s.tooth;
      X[k].uniforms.uCavity.value = s.cavity * (1 - s.fill);
    }
    if (ready) {
      // Opak katmanlar yalnızca gerektiğinde çizilir
      const inside = s.cut < 1 || s.scan < 1.2;
      parts.dentin.visible = inside;
      parts.pulpa.visible = inside;
      for (const k of ['xmine', 'xdentin', 'xpulpa']) parts[k].visible = s.xray > 0.001 && s.tooth > 0.001;
    }
    const mu = M.mine.uniforms;
    mu.uPlaque.value = s.plaque;
    mu.uClean.value = s.clean;
    mu.uCavity.value = s.cavity;
    mu.uFill.value = s.fill;
    mu.uCure.value = s.cure;
    M.pulpa.uniforms.uGlow.value = s.pulpGlow;
    M.pulpa.uniforms.uCanal.value = s.canal;
    M.dentin.uniforms.uGlow.value = 0;
    cure.intensity = s.cure * 4;
    cure.position.copy(anchors.cavity).add(V(0, 0.6, 0.3)).applyMatrix4(toothInner.matrixWorld);

    // Tarama halkası
    scanRig.position.y = Math.min(s.scan, 1.1);
    ringMat.opacity = s.ring;
    discMat.uniforms.uAmt.value = s.ring;
    scanRig.visible = s.ring > 0.001;

    // Diş taşı parçacıkları
    chips.visible = s.chips > 0.001;
    if (chips.visible) {
      chipMat.opacity = Math.min(1, s.chips * 3) * (1 - s.chips) * 1.6;
      for (let i = 0; i < CHIPS; i++) {
        const c = cdir[i];
        const r = 0.5 + s.chips * c.s * 1.6;
        cpos[i * 3] = Math.cos(c.a + s.chips * 0.6) * r;
        cpos[i * 3 + 1] = L(0.35, -0.2, c.y) - s.chips * s.chips * 0.8 * c.s;
        cpos[i * 3 + 2] = Math.sin(c.a + s.chips * 0.6) * r;
      }
      cgeo.attributes.position.needsUpdate = true;
    }

    // İmplant
    implant.visible = ready && s.implant > 0.001;
    if (implant.visible) {
      const k = s.implantK;
      implant.rotation.set(s.iRotX, s.iRotY, 0);
      const boneIn = sm(seg(k, 0.0, 0.22));
      for (const m of [M.bone, M.gum]) {
        m.uniforms.uAlpha.value = boneIn * s.implant;
        m.uniforms.uCut.value = 0.0;
        m.uniforms.uTime.value = t;
      }
      parts.bone.position.y = -0.78 - (1 - boneIn) * 0.6;
      parts.gum.position.y = -0.03 - (1 - boneIn) * 0.6;
      const sk = sm(seg(k, 0.25, 0.58));
      parts.screw.position.y = (1 - sk) * 1.5;
      parts.screw.rotation.y = -(1 - sk) * 14;
      parts.screw.visible = k > 0.22;
      const ak = sm(seg(k, 0.58, 0.7));
      parts.abut.position.y = (1 - ak) * 1.1;
      parts.abut.visible = k > 0.56;
      const ck = sm(seg(k, 0.7, 0.86));
      parts.crown.position.y = (1 - ck) * 1.4;
      parts.crown.visible = k > 0.68;
      M.crown.uniforms.uAlpha.value = ck * s.implant;
      titanium.opacity = s.implant;
    }

    // Ortodonti arkı
    arch.visible = ready && s.arch > 0.001;
    if (arch.visible) {
      arch.rotation.y = s.archRot;
      arch.position.y = s.archY;
      const a = s.align;
      for (const tt of archTeeth) {
        const { mesh, base, mis, n, br } = tt;
        const off = 1 - a;
        mesh.position.copy(base.pos).addScaledVector(n, mis.dn * off);
        mesh.position.x += mis.dx * off;
        mesh.position.y = mis.dy * off;
        mesh.rotation.set(0, base.rot + mis.rot * off, mis.tilt * off, 'YXZ');
        // Braket dişin dış yüzeyinde
        br.position.copy(mesh.position).addScaledVector(n, tt.depth + 0.03);
        br.position.y = tt.h + mesh.position.y;
        br.rotation.set(0, base.rot + mis.rot * off, 0);
        br.visible = s.brackets > 0.01;
      }
      M.arch.uniforms.uAlpha.value = s.arch;
      M.archGum.uniforms.uAlpha.value = s.arch;
      wireMat.opacity = s.brackets * s.arch;
      wire.visible = s.wire > 0.01;
      wire.scale.setScalar(1);
    }

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.85) {
      dpr = Math.max(0.85, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      dustMat.uniforms.uPx.value = dpr;
      resize();
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, update, resize, project,
    projectImplant: (n) => project(n, implant),
    isReady: () => ready,
    compile: () => renderer.compile(scene, camera),
  };
}

const L = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const sm = (t) => t * t * (3 - 2 * t);
