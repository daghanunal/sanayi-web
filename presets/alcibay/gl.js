// Tek WebGL tuvali, iki sahne:
//  - "toz": alçı tozu bulutu. Açılışta merkezden patlar, kaydırınca çöküp düz bir duvar yüzeyine oturur.
//  - "duvar": tuğla → perlitli sıva → saten perdah → boyaya hazır. Katmanlar mala darbeleriyle açılır.
import * as THREE from 'three';

const TOZ_VS = /* glsl */ `
  attribute vec4 aSeed;
  attribute vec2 aGrid;
  attribute float aPuff;
  uniform float uTime, uBurst, uSettle, uCell, uDpr, uGrain, uPuffSize;
  uniform vec2 uView;
  uniform vec3 uPointer;
  varying float vA, vT, vPuff, vShade;

  void main() {
    float W = uView.x, H = uView.y;
    float t = uTime;
    float ph = fract(aSeed.w + t * (0.018 + aSeed.x * 0.02) * (aPuff > 0.5 ? 0.7 : 1.0));
    float rise = sqrt(ph);
    float y = mix(-0.62 * H, 0.58 * H, ph);
    float spread = mix(0.08 * W, 0.62 * W, rise);
    float ang = aSeed.y * 6.2831;
    float rad = pow(aSeed.z, 0.7);
    vec3 c = vec3(cos(ang) * rad * spread, y, sin(ang) * rad * spread * 0.45);
    c.x += sin(t * 0.35 + y * 1.3 + aSeed.w * 12.0) * 0.18 * rise;
    c.x += sin(y * 0.9 - t * 0.2) * 0.35 * rise;
    c.y += sin(t * 0.5 + aSeed.y * 20.0) * 0.06;
    float b = 1.0 - pow(1.0 - uBurst, 3.0);
    vec3 origin = vec3((aSeed.y - 0.5) * 0.4, -0.62 * H, 0.0);
    c = mix(origin, c, b);
    vec2 d = c.xy - uPointer.xy;
    c.xy += normalize(d + 1e-4) * smoothstep(1.2, 0.0, length(d)) * 0.7;

    vec3 g = vec3((aGrid.x - 0.5) * W * 1.04, (aGrid.y - 0.5) * H * 1.04, 0.0);
    float delay = (1.0 - aGrid.y) * 0.45 + aSeed.w * 0.1;
    float k = clamp((uSettle - delay) / 0.43, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    float kk = aPuff > 0.5 ? 0.0 : k;
    vec3 p = mix(c, g, kk);
    vT = kk;
    vPuff = aPuff;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = 6.0 / -mv.z;
    float grain = uGrain * (0.5 + aSeed.x * 1.3) * depth;
    float puff = uPuffSize * (0.45 + rise * 1.2) * (0.6 + aSeed.x) * depth;
    float size = aPuff > 0.5 ? puff : mix(grain, uCell * 1.5, kk);
    gl_PointSize = size * uDpr;
    float life = sin(ph * 3.14159);
    float fadeSettle = aPuff > 0.5 ? (1.0 - smoothstep(0.0, 0.5, uSettle)) : 1.0;
    float alpha = aPuff > 0.5 ? 0.05 * life : mix(0.35 + aSeed.z * 0.45, 0.0, smoothstep(0.7, 1.0, kk)) * mix(life, 1.0, kk);
    vA = alpha * b * fadeSettle;
    vShade = 0.84 + aSeed.y * 0.16;
  }
`;

const TOZ_FS = /* glsl */ `
  uniform vec3 uColor;
  varying float vA, vT, vPuff, vShade;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r2 = dot(q, q) * 4.0;
    float a = vPuff > 0.5 ? exp(-r2 * 3.0) : smoothstep(1.0, 0.2, r2);
    a *= vA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * vShade, a);
  }
`;

const ZEMIN_FS = /* glsl */ `
  uniform float uSettle, uBurst, uTime;
  uniform vec3 uDark, uWall;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  void main() {
    float delay = (1.0 - vUv.y) * 0.45 + noise(vUv * vec2(7.0, 3.0)) * 0.1;
    float k = smoothstep(delay + 0.18, delay + 0.43, uSettle);
    vec3 dark = uDark * (1.0 + 0.35 * uBurst * exp(-pow(distance(vUv, vec2(0.5, 0.05)) * 1.6, 2.0)));
    gl_FragColor = vec4(mix(dark, uWall, k), 1.0);
  }
`;

const DUVAR_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const DUVAR_FS = /* glsl */ `
  precision highp float;
  uniform sampler2D tBrick, tRough, tFine;
  uniform vec2 uRes, uBrickSize, uRoughSize, uFineSize;
  uniform float uP1, uP2, uP3, uLight, uTime;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  vec2 cover(vec2 uv, vec2 img) {
    float rs = uRes.x / uRes.y, ri = img.x / img.y;
    vec2 sc = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
    return (uv - 0.5) * sc + 0.5;
  }

  float reveal(vec2 uv, float p, float seed) {
    float rows = 5.0;
    float band = floor(uv.y * rows);
    float dir = mod(band, 2.0) < 1.0 ? uv.x : 1.0 - uv.x;
    float arc = sin(fract(uv.y * rows) * 3.14159) * 0.06;
    float front = (band / rows) * 0.18 + dir * 0.82 + arc + (fbm(uv * vec2(9.0, 14.0) + seed) - 0.5) * 0.16;
    float edge = p * 1.3 - 0.15;
    return smoothstep(front - 0.015, front + 0.015, edge);
  }
  float frontGlow(vec2 uv, float p, float seed) {
    float a = reveal(uv, p, seed);
    return a * (1.0 - a) * 4.0;
  }

  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec2 uv = vUv;
    vec3 brick = texture2D(tBrick, cover(uv, uBrickSize)).rgb;
    vec3 roughT = texture2D(tRough, cover(uv, uRoughSize) * 1.0).rgb;
    vec3 fineT = texture2D(tFine, cover(uv, uFineSize)).rgb;

    float asp = uRes.x / uRes.y;
    float glow = exp(-pow((uv.x - uLight) * asp * 1.6, 2.0));

    float rl = lum(roughT);
    float rdx = dFdx(rl), rdy = dFdy(rl);
    vec3 siva = vec3(0.84, 0.85, 0.835) * (0.84 + rl * 0.2);
    siva *= 1.0 + clamp(rdx * -3.0 + rdy * 1.5, -0.25, 0.25);

    float fl = lum(fineT);
    float fdx = dFdx(fl);
    vec3 perdah = vec3(0.915, 0.925, 0.915) * (0.96 + fl * 0.05);
    perdah *= 1.0 + clamp(fdx * -1.2, -0.06, 0.06);

    vec3 hazir = vec3(0.933, 0.941, 0.933);

    float m1 = reveal(uv, uP1, 1.7);
    float m2 = reveal(uv, uP2, 5.3);
    float m3 = smoothstep(0.0, 1.0, uP3);

    vec3 col = brick;
    float wet1 = frontGlow(uv, uP1, 1.7);
    col = mix(col, siva * (1.0 - wet1 * 0.14), m1);
    float wet2 = frontGlow(uv, uP2, 5.3);
    col = mix(col, perdah * (1.0 - wet2 * 0.07), m2);
    col = mix(col, hazir, m3);

    col += (wet1 * m1 + wet2 * m2) * vec3(0.05);
    col += glow * 0.05 * m3;
    float vig = 0.1 * (1.0 - m3 * 0.8);
    col *= 1.0 - vig * pow(distance(uv, vec2(0.5)) * 1.4, 2.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createGL(canvas, { lowEnd, urls }) {
  const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.15 : 1.5);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  // ShaderMaterial çıktısı renk yönetimine girmez: sRGB değerleri doğrudan verilir
  const hex = (h) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
  const GRAFIT = hex('#1d2022');
  const ALCI = hex('#eef0ee');
  THREE.ColorManagement.enabled = false;

  // --- Toz sahnesi ---
  const tozScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  const mobile = window.innerWidth < 760;
  const N = lowEnd ? 7000 : mobile ? 12000 : 22000;
  const PUFFS = lowEnd ? 260 : mobile ? 420 : 700;
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(N * 4);
  const grid = new Float32Array(N * 2);
  const pos = new Float32Array(N * 3);
  const puffs = new Float32Array(N);
  for (let i = 0; i < PUFFS; i++) puffs[Math.floor((i / PUFFS) * N)] = 1;
  let cols = 1;
  function layoutGrid(aspect) {
    cols = Math.max(8, Math.round(Math.sqrt(N * aspect)));
    const rows = Math.ceil(N / cols);
    for (let i = 0; i < N; i++) {
      const x = i % cols, y = Math.floor(i / cols);
      grid[i * 2] = (x + 0.5) / cols;
      grid[i * 2 + 1] = 1 - (y + 0.5) / rows;
    }
    geo.attributes.aGrid && (geo.attributes.aGrid.needsUpdate = true);
    return rows;
  }
  for (let i = 0; i < N; i++) {
    // Küresel-ish dağılım, merkeze yoğun
    const r = Math.cbrt(Math.random());
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    seeds[i * 4] = 0.5 + 0.5 * r * Math.sin(ph) * Math.cos(th);
    seeds[i * 4 + 1] = 0.5 + 0.5 * r * Math.sin(ph) * Math.sin(th);
    seeds[i * 4 + 2] = 0.5 + 0.5 * r * Math.cos(ph);
    seeds[i * 4 + 3] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2));
  geo.setAttribute('aPuff', new THREE.BufferAttribute(puffs, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

  const tozU = {
    uTime: { value: 0 }, uBurst: { value: 0 }, uSettle: { value: 0 },
    uGrain: { value: mobile ? 2.2 : 2.6 }, uPuffSize: { value: mobile ? 90 : 150 }, uCell: { value: 4 }, uDpr: { value: dpr },
    uView: { value: new THREE.Vector2(4, 3) }, uPointer: { value: new THREE.Vector3(99, 99, 0) },
    uColor: { value: hex('#f6f7f4') },
  };
  const toz = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: TOZ_VS, fragmentShader: TOZ_FS, uniforms: tozU,
    transparent: true, depthWrite: false, depthTest: false,
  }));
  tozScene.add(toz);

  // Tozun arkasındaki zemin: koyu fondan, toz oturdukça satır satır duvar rengine
  const zeminScene = new THREE.Scene();
  const zeminU = { uSettle: tozU.uSettle, uBurst: tozU.uBurst, uTime: tozU.uTime, uDark: { value: GRAFIT.clone() }, uWall: { value: ALCI.clone() } };
  zeminScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: ZEMIN_FS, uniforms: zeminU, depthTest: false, depthWrite: false,
  })));

  // --- Duvar sahnesi ---
  const duvarScene = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const loader = new THREE.TextureLoader();
  const duvarU = {
    tBrick: { value: null }, tRough: { value: null }, tFine: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uBrickSize: { value: new THREE.Vector2(1600, 1066) },
    uRoughSize: { value: new THREE.Vector2(1600, 1155) },
    uFineSize: { value: new THREE.Vector2(1066, 1600) },
    uP1: { value: 1 }, uP2: { value: 1 }, uP3: { value: 1 }, uLight: { value: 0.2 }, uTime: { value: 0 },
  };
  let loaded = 0;
  const onTex = () => { loaded++; };
  for (const [k, u, sizeKey] of [['tBrick', urls.brick, 'uBrickSize'], ['tRough', urls.rough, 'uRoughSize'], ['tFine', urls.fine, 'uFineSize']]) {
    const t = loader.load(u, (tex) => {
      duvarU[sizeKey].value.set(tex.image.width, tex.image.height);
      onTex();
    });
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 4;
    duvarU[k].value = t;
  }
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: DUVAR_VS, fragmentShader: DUVAR_FS, uniforms: duvarU, depthTest: false,
  }));
  duvarScene.add(quad);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    tozU.uView.value.set(vh * camera.aspect, vh);
    const rows = layoutGrid(w / h);
    tozU.uCell.value = h / rows;
    duvarU.uRes.value.set(w, h);
  }
  resize();

  const state = { mode: 'toz', time: 0, settle: 0, burst: 0 };
  function render(dt) {
    state.time += dt;
    if (state.mode === 'toz') {
      tozU.uTime.value = state.time;
      tozU.uBurst.value = state.burst;
      tozU.uSettle.value = state.settle;
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(zeminScene, ortho);
      if (state.settle < 0.999) renderer.render(tozScene, camera);
      renderer.autoClear = true;
    } else if (state.mode === 'duvar') {
      duvarU.uTime.value = state.time;
      renderer.render(duvarScene, ortho);
    }
  }

  // İmleç konumunu z=0 düzlemine çevir
  function pointer(x, y) {
    const v = tozU.uView.value;
    tozU.uPointer.value.set((x / window.innerWidth - 0.5) * v.x, -(y / window.innerHeight - 0.5) * v.y, 0);
  }

  return {
    state, render, resize, pointer, renderer,
    wall: duvarU,
    ready: () => loaded >= 3,
    setMode(m) { state.mode = m; },
  };
}
