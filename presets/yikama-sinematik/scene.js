// Köpük 3D sahnesi: gece yıkama bölmesi, neon kemerler, ıslak zemin yansıması.
// Araç (Blender'da SDF ile üretildi) tozlu gelir → basınçlı su → üç renk köpük → durulama →
// jant → iç temizlik (röntgen) → pasta-cila → filo kuyruğu kemerlerden geçer.
// Araç yerel koordinatları: ön +x, yukarı +y, en ±z (gövde ±0.96, boy ±2.15, tavan ~1.45).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const BASE = import.meta.env.BASE_URL;
const WX = 1.34;
const WY = 0.34;
const WZ = 0.8;
const FLEET = 6;
const FLEET_GAP = 5.4;

const PINK = new THREE.Color('#ff5c9d');
const BLUE = new THREE.Color('#3ec5ff');
const LEMON = new THREE.Color('#ffe45c');

// --- GLSL yardımcıları ---------------------------------------------------------------------
const NOISE = /* glsl */ `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  float cells(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 1.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y);
      vec2 o = vec2(h3(vec3(i + g, 1.0)), h3(vec3(i + g, 7.0))); vec2 r = g + o - f; d = min(d, dot(r, r)); }
    return sqrt(d); }
`;

// Gövde malzemesi: cam, trim, far ve kapı çizgileri konumdan; kir, köpük, su, çizik, parıltı uniform'dan.
function bodyMaterial(U, { fleet = false } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: fleet ? '#eef1f7' : '#101a3c',
    metalness: fleet ? 0.1 : 0.55,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLp; varying vec3 vLn; ${fleet ? 'attribute float aDirt; varying float vDirt;' : ''}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vLn = objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLp = position; ${fleet ? 'vDirt = aDirt;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uDirt, uRinse, uFoam, uWet, uSwirl, uPolish, uGleam, uGleamAmt, uTime, uLights;
        varying vec3 vLp; varying vec3 vLn; ${fleet ? 'varying float vDirt;' : ''}
        ${NOISE}
        float gRough, gClear, gMetal, gCCR; vec3 gEmis;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 p = vLp; vec3 n = normalize(vLn);
        float up = p.y; float side = abs(n.z);
        float ax = abs(p.x); float az = abs(p.z);
        // camlar
        float sideWin = smoothstep(1.0, 1.025, up) * (1.0 - smoothstep(1.34, 1.365, up)) * smoothstep(0.5, 0.62, side)
          * smoothstep(-1.82, -1.78, p.x) * (1.0 - smoothstep(0.86, 0.9, p.x - (up - 1.0) * 0.9)) * smoothstep(0.06, 0.075, abs(p.x + 0.42));
        float wind = smoothstep(1.02, 1.05, up) * smoothstep(0.3, 0.4, n.x) * (1.0 - smoothstep(0.42, 0.52, side));
        float rear = smoothstep(1.02, 1.05, up) * smoothstep(0.35, 0.45, -n.x) * (1.0 - smoothstep(0.42, 0.52, side));
        float glass = clamp(sideWin + wind + rear, 0.0, 1.0);
        // alt trim (tampon altı, marşpiyel)
        float trim = 1.0 - smoothstep(0.3, 0.32, up);
        // farlar ve stoplar
        float head = smoothstep(1.95, 2.0, p.x) * smoothstep(0.7, 0.72, up) * (1.0 - smoothstep(0.84, 0.86, up)) * smoothstep(0.42, 0.45, az) * (1.0 - smoothstep(0.8, 0.83, az));
        float tail = smoothstep(1.96, 2.02, -p.x) * smoothstep(0.84, 0.86, up) * (1.0 - smoothstep(0.98, 1.0, up)) * smoothstep(0.5, 0.53, az);
        float grille = smoothstep(2.02, 2.06, p.x) * smoothstep(0.44, 0.46, up) * (1.0 - smoothstep(0.62, 0.64, up)) * (1.0 - smoothstep(0.5, 0.53, az));
        grille *= 0.6 + 0.4 * step(0.5, fract(up * 38.0));
        // kapı çizgileri
        float seam = 0.0;
        float onSide = smoothstep(0.55, 0.7, side) * smoothstep(0.34, 0.36, up) * (1.0 - smoothstep(1.0, 1.02, up));
        seam += 1.0 - smoothstep(0.004, 0.009, abs(p.x - 0.93 + (up - 0.35) * 0.05));
        seam += 1.0 - smoothstep(0.004, 0.009, abs(p.x + 0.42));
        seam += 1.0 - smoothstep(0.004, 0.009, abs(p.x + 1.62 - (up - 0.35) * 0.08));
        seam = clamp(seam, 0.0, 1.0) * onSide * (1.0 - glass);
        float handle = onSide * (1.0 - smoothstep(0.05, 0.06, abs(up - 0.86))) * (1.0 - smoothstep(0.06, 0.07, min(abs(p.x - 0.62), abs(p.x + 0.72))));

        // kir: altta ve arkada daha yoğun, çamur sıçrakları
        float dn = fbm(p * vec3(2.2, 3.1, 2.2));
        float low = 1.0 - smoothstep(0.2, 1.3, up);
        float film = 0.3 + 0.35 * low - glass * 0.15;
        float dirtM = film + smoothstep(0.45, 0.75, dn * 0.8 + low * 0.45 - p.x * 0.04) * 0.4;
        float splat = smoothstep(0.62, 0.72, vn(p * 7.0 + 2.0)) * low;
        dirtM = clamp(max(dirtM, splat), 0.0, 0.96);
        ${fleet ? 'float dirtAmt = vDirt; float rinsed = 0.0;' : `float dirtAmt = uDirt;
        float edge = uRinse + (vn(vec3(p.y * 3.0, p.z * 3.0, uTime * 0.6)) - 0.5) * 0.35;
        float rinsed = smoothstep(edge - 0.06, edge + 0.06, p.x);`}
        dirtM *= dirtAmt * (1.0 - rinsed);

        // köpük: topak topak büyür, üç renk
        vec2 q = side > 0.6 ? p.xy : (abs(n.y) > 0.6 ? p.xz : p.zy);
        float fnz = fbm(p * 1.7 + 3.1);
        float foamM = 0.0;
        vec3 foamCol = vec3(1.0);
        ${fleet ? '' : `
        foamM = smoothstep(0.0, 0.06, uFoam * 1.35 - fnz - (1.0 - up) * 0.1) * (1.0 - rinsed);
        float tri = fbm(p * 0.8 + 5.0);
        vec3 fc = mix(mix(vec3(1.0, 0.56, 0.75), vec3(0.5, 0.84, 1.0), smoothstep(0.4, 0.47, tri)), vec3(1.0, 0.92, 0.55), smoothstep(0.55, 0.62, tri));
        float bub = cells(q * 26.0);
        float bub2 = cells(q * 61.0 + 4.0);
        foamCol = mix(fc, vec3(1.0), 0.08 + 0.35 * smoothstep(0.25, 0.6, bub)) * (0.82 + 0.18 * smoothstep(0.1, 0.4, bub2));`}

        // su damlaları ve kılcal çizikler
        float beads = (1.0 - smoothstep(0.1, 0.2, cells(q * 34.0))) * ${fleet ? '0.0' : 'uWet * rinsed'};
        float topS = smoothstep(0.5, 0.8, n.y) + smoothstep(0.5, 0.8, side) * 0.6;
        vec2 cq = q * 1.6; vec2 ci = floor(cq);
        vec2 cc = ci + vec2(h3(vec3(ci, 3.0)), h3(vec3(ci, 9.0)));
        float rr = length(cq - cc);
        float swirl = smoothstep(0.55, 0.95, sin(rr * 260.0 + h3(vec3(ci, 5.0)) * 40.0)) * (1.0 - smoothstep(0.4, 0.9, rr));
        ${fleet ? 'swirl = 0.0;' : 'swirl *= uSwirl * topS * (1.0 - smoothstep(uPolish - 0.08, uPolish + 0.08, p.x));'}

        vec3 paint = diffuseColor.rgb;
        vec3 c = paint;
        c = mix(c, vec3(0.012, 0.016, 0.03), glass);
        c = mix(c, vec3(0.03, 0.03, 0.04), max(trim, grille));
        c = mix(c, vec3(0.9, 0.9, 0.95), head * 0.4);
        c = mix(c, vec3(0.5, 0.02, 0.04), tail);
        c = mix(c, c * 0.25, seam);
        c = mix(c, vec3(0.5), handle * 0.35);
        c += swirl * 0.14;
        vec3 dirtCol = mix(vec3(0.36, 0.3, 0.22), vec3(0.6, 0.53, 0.42), smoothstep(0.3, 0.7, dn) * (1.0 - splat)) * (0.88 + 0.24 * vn(p * 30.0));
        c = mix(c, dirtCol, dirtM);
        c = mix(c, foamCol, foamM);
        c += beads * 0.05;
        diffuseColor.rgb = c;

        float clean = (1.0 - dirtM) * (1.0 - foamM);
        gRough = mix(mix(0.3, 0.04, glass), 0.6, max(trim, grille));
        gRough = mix(gRough, 0.95, dirtM);
        gRough = mix(gRough, 0.5, foamM);
        gRough = mix(gRough, 0.55, swirl * 0.6);
        gRough = mix(gRough, 0.05, beads);
        gClear = clean * (1.0 - max(trim, grille)) * (1.0 - swirl * 0.4);
        gCCR = 0.04 + swirl * 0.3;
        gMetal = ${fleet ? '0.1' : '0.55'} * (1.0 - glass) * clean * (1.0 - max(trim, grille)) * (1.0 - tail) * (1.0 - head);
        float gb = exp(-pow((p.x + p.y * 0.5 - uGleam) * 5.0, 2.0));
        gEmis = vec3(0.95, 0.97, 1.0) * head * (0.5 + 2.5 * uLights) * (1.0 - dirtM * 0.7)
              + vec3(1.0, 0.05, 0.1) * tail * (0.4 + 1.2 * uLights)
              + vec3(0.85, 0.9, 1.0) * gb * uGleamAmt * clean * 0.55 * (0.3 + 0.7 * topS)
              + foamCol * foamM * 0.06;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = gRough;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = gMetal;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += gEmis;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.clearcoat *= gClear; material.clearcoatRoughness = gCCR;`);
  };
  m.customProgramCacheKey = () => (fleet ? 'kopuk-fleet' : 'kopuk-body');
  return m;
}

// Röntgen: gövde saydamlaşır, kenarları camgöbeği parlar.
function xrayMaterial(U) {
  return new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vLp;
      void main(){ vLp = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uXray, uScan; varying vec3 vN; varying vec3 vV; varying vec3 vLp;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float band = exp(-pow((vLp.x - uScan) * 7.0, 2.0));
        float grid = step(0.94, fract(vLp.x * 6.0)) + step(0.94, fract(vLp.y * 6.0));
        vec3 c = vec3(0.24, 0.77, 1.0) * (0.05 + f * 0.9 + grid * 0.05) + vec3(1.0, 0.36, 0.62) * band * 0.5;
        gl_FragColor = vec4(c * uXray, 1.0); }`,
  });
}

function seatMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: '#d7d3e6', roughness: 0.85 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uScan, uXray; varying vec3 vLp; ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float st = smoothstep(0.5, 0.62, fbm(vLp * 5.0)) ;
        float cleaned = smoothstep(uScan - 0.05, uScan + 0.05, vLp.x);
        vec3 dirty = mix(vec3(0.5, 0.45, 0.4), vec3(0.28, 0.22, 0.16), st);
        diffuseColor.rgb = mix(dirty, diffuseColor.rgb, cleaned);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float bd = exp(-pow((vLp.x - uScan) * 9.0, 2.0));
        totalEmissiveRadiance += vec3(0.24, 0.77, 1.0) * bd * 0.9 + vec3(0.1, 0.12, 0.2) * cleaned * 0.4;`);
  };
  m.customProgramCacheKey = () => 'kopuk-seat';
  return m;
}

function rimMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: '#d9dde6', metalness: 0.9, roughness: 0.22 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uDust; varying vec3 vLp; ${NOISE} float gD;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        gD = uDust * smoothstep(0.3, 0.6, fbm(vLp * 14.0) + 0.25);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.15, 0.1), gD);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, gD);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.1, gD);`);
  };
  m.customProgramCacheKey = () => 'kopuk-rim';
  return m;
}

// --- Parçacıklar --------------------------------------------------------------------------
function sprayPoints(U, count) {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uSpray, uSprayX, uPR; attribute vec4 aSeed; varying float vA;
      void main(){
        float life = fract(uTime * 1.4 + aSeed.x);
        float s = aSeed.y < 0.5 ? -1.0 : 1.0;
        vec3 o = vec3(uSprayX + (aSeed.z - 0.5) * 0.3, 0.25 + aSeed.w * 1.75, s * 1.72);
        vec3 v = vec3((aSeed.z - 0.5) * 1.2, (aSeed.w - 0.65) * 1.1, -s * 3.4);
        vec3 pos = o + v * life + vec3(0.0, -2.2, 0.0) * life * life;
        float hit = step(abs(pos.z), 0.98);
        pos.z = s * max(abs(pos.z), 0.97 + aSeed.x * 0.08);
        pos.x += hit * (aSeed.z - 0.5) * 0.6 * life;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vA = uSpray * (1.0 - life) * smoothstep(0.0, 0.08, life) * (0.6 + 0.4 * hit);
        gl_PointSize = uPR * (0.07 + aSeed.x * 0.14) * (1.0 + hit * 0.6) / -mv.z;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c);
      float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(vec3(0.75, 0.92, 1.0) * a, a); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

function foamFlakes(U, count) {
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4);
  const col = new Float32Array(count * 3);
  const pal = [PINK, BLUE, LEMON, new THREE.Color('#ffffff')];
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
    const c = pal[i % 4].clone().lerp(new THREE.Color('#ffffff'), 0.35);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime, uFall, uPR; attribute vec4 aSeed; attribute vec3 aCol; varying float vA; varying vec3 vC;
      void main(){
        float life = fract(uTime * (0.25 + aSeed.w * 0.2) + aSeed.x);
        vec3 pos = vec3((aSeed.y - 0.5) * 4.6, 2.55 - life * 2.3, (aSeed.z - 0.5) * 2.2);
        pos.x += sin(uTime * 2.0 + aSeed.x * 20.0) * 0.06;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vA = uFall * smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.8, 1.0, life));
        vC = aCol;
        gl_PointSize = uPR * (0.22 + aSeed.w * 0.36) / -mv.z;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c);
      float ring = smoothstep(0.5, 0.42, d) * (0.55 + 0.45 * smoothstep(0.2, 0.45, d));
      float hl = smoothstep(0.14, 0.0, length(c - vec2(-0.14, -0.14)));
      float a = ring * vA * 0.85; if (a < 0.01) discard; gl_FragColor = vec4(mix(vC, vec3(1.0), hl), a); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

function rinseCurtain(U) {
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uCurtain; varying vec2 vUv; ${NOISE}
      void main(){ float s = vn(vec3(vUv.x * 70.0, vUv.y * 3.0 + uTime * 5.0, 0.0));
        float streak = smoothstep(0.55, 0.95, s);
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.1, vUv.y);
        float a = (streak * 0.55 + 0.06) * edge * uCurtain;
        gl_FragColor = vec4(vec3(0.7, 0.9, 1.0) * a, a); }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.6), m);
  mesh.rotation.y = Math.PI / 2;
  mesh.position.y = 1.3;
  return mesh;
}

// --- Yıkama bölmesi ------------------------------------------------------------------------
function roundedRectPath(w, h, r) {
  const pts = [];
  const add = (cx, cy, a0) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector3(0, cy + Math.sin(a) * r, cx + Math.cos(a) * r));
    }
  };
  pts.push(new THREE.Vector3(0, 0, w / 2));
  add(w / 2 - r, h - r, 0);
  add(-w / 2 + r, h - r, Math.PI / 2);
  pts.push(new THREE.Vector3(0, 0, -w / 2));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
}

function neonTexture(label) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const x = c.getContext('2d');
  const draw = () => {
    x.clearRect(0, 0, c.width, c.height);
    const txt = label.toLocaleUpperCase('tr-TR');
    let size = 240;
    x.font = `600 ${size}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
    const w = x.measureText(txt).width;
    size *= Math.min(1, 1860 / w);
    x.font = `600 ${size}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.shadowColor = '#ff5c9d';
    x.shadowBlur = 60;
    x.fillStyle = '#ff8fbd';
    x.fillText(txt, 1024, 270);
    x.shadowBlur = 18;
    x.fillStyle = '#ffe1ee';
    x.fillText(txt, 1024, 270);
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.redraw = (l) => {
    label = l;
    draw();
  };
  draw();
  return tex;
}

function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#16123a';
  x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(160,150,255,.16)';
  x.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Ortam haritası: karanlık bölme, tavanda beyaz, yanlarda pembe ve mavi LED bantlar
function envScene() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: '#0a0822', side: THREE.BackSide })));
  const strip = (color, w, h, d, x, y, z, k = 1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) }));
    m.position.set(x, y, z);
    s.add(m);
  };
  for (let i = -2; i <= 2; i++) strip('#ffffff', 12, 0.2, 0.5, 0, 6, i * 2.2, 3.2);
  strip('#ff5c9d', 16, 0.5, 0.2, 0, 2.2, 7, 2.2);
  strip('#3ec5ff', 16, 0.5, 0.2, 0, 2.2, -7, 2.2);
  strip('#ffe45c', 0.2, 1.8, 10, -9, 1.5, 0, 1.6);
  strip('#ffffff', 0.2, 3, 8, 9, 3, 0, 1.4);
  strip('#1d1850', 30, 0.1, 30, 0, -0.5, 0, 1);
  return s;
}

// --- Dünya -------------------------------------------------------------------------------
export function createWorld(canvas, { name, phone, low, onReady }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, low ? 1 : phone ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const BG = new THREE.Color('#100c2e');
  renderer.setClearColor(BG);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 14, 42);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 90);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene(), 0.02).texture;
  scene.environmentIntensity = 1.0;
  const hemi = new THREE.HemisphereLight('#b9b4ff', '#140f30', 0.6);
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(3, 7, 4);
  scene.add(hemi, key);

  // Tek durum nesnesi: main.js her karede sıfırlar ve sahneye göre yazar.
  const S = {
    dirt: 1, rinse: 4, foam: 0, wet: 0, swirl: 0, polish: 3, gleam: -4, gleamAmt: 0, lights: 0,
    spray: 0, sprayX: 0, fall: 0, curtain: 0, dust: 1, tireShine: 0, spin: 0,
    xray: 0, scan: 2.4, polisher: 0, polishPath: 0, spinAngle: 0, fleet: 0, fleetP: 0, carY: 0, neon: 1, arch: 1,
  };

  const U = {
    uDirt: { value: 1 }, uRinse: { value: 4 }, uFoam: { value: 0 }, uWet: { value: 0 }, uSwirl: { value: 0 },
    uPolish: { value: 3 }, uGleam: { value: -4 }, uGleamAmt: { value: 0 }, uTime: { value: 0 }, uLights: { value: 0 },
    uSpray: { value: 0 }, uSprayX: { value: 0 }, uPR: { value: dpr * innerHeight * 0.5 }, uFall: { value: 0 },
    uCurtain: { value: 0 }, uDust: { value: 1 }, uXray: { value: 0 }, uScan: { value: 2.4 },
  };
  const UF = { ...U }; // filo: aynı uniform'lar, kir örnek başına

  // Zemin: ıslak, yarı saydam; altında aynalanmış sahne
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#120e33', roughness: 0.18, metalness: 0.3, transparent: true, opacity: low ? 1 : 0.84, map: tileTexture(),
  });
  floorMat.map.repeat.set(20, 20);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const world = new THREE.Group(); // aynalanacak her şey
  scene.add(world);
  const mirror = new THREE.Group();
  mirror.scale.y = -1;
  if (!low) scene.add(mirror);

  // Arka duvar + neon ad
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: '#150f3c', roughness: 0.7 }));
  wall.position.set(0, 6, -6.5);
  scene.add(wall);
  const neonTex = neonTexture(name);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false, depthWrite: false }));
  neon.position.set(0, 3.25, -6.45);
  scene.add(neon);
  // duvar LED'leri
  const ledMat = (c, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  for (let i = -6; i <= 6; i++) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 5.2, 0.05), ledMat(i % 3 === 0 ? '#3ec5ff' : '#6b5cff', 1.2));
    led.position.set(i * 2.6, 2.6, -6.4);
    if (Math.abs(i) > 1) scene.add(led);
  }

  // Kemerler: araç üzerinden geçen neon çerçeveler
  const arches = new THREE.Group();
  const archCols = ['#3ec5ff', '#ff5c9d', '#ffe45c', '#ffffff'];
  const archX = [-3.3, -1.1, 1.1, 3.3];
  const tube = new THREE.TubeGeometry(roundedRectPath(4.4, 2.9, 0.6), 60, 0.035, 8, false);
  const archMats = archCols.map((c) => ledMat(c, 2.2));
  archX.forEach((x, i) => {
    const g = new THREE.Group();
    g.position.x = x;
    g.add(new THREE.Mesh(tube, archMats[i]));
    arches.add(g);
  });
  world.add(arches);

  // Araç
  const car = new THREE.Group();
  world.add(car);
  const bodyMat = bodyMaterial(U);
  const xrayMat = xrayMaterial(U);
  const seatMat = seatMaterial(U);
  const rimMat = rimMaterial(U);
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.85, metalness: 0 });
  const fleetMat = bodyMaterial(UF, { fleet: true });

  let body = null;
  let interior = null;
  const wheels = [];
  const mirrorBodies = [];
  let fleetBody = null;
  let fleetMirror = null;
  let fleetTires = null;
  let fleetRims = null;
  let fleetDirt = null;
  let heights = null;
  let ready = false;

  // Pasta makinesi
  const polisher = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 28), new THREE.MeshStandardMaterial({ color: '#ffd23a', roughness: 0.8 }));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.14, 24), new THREE.MeshStandardMaterial({ color: '#23233a', metalness: 0.4, roughness: 0.4 }));
  head.position.y = 0.1;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.08), head.material);
  handle.position.set(-0.18, 0.2, 0);
  polisher.add(pad, head, handle);
  polisher.visible = false;
  world.add(polisher);

  // Parçacıklar
  const spray = sprayPoints(U, low ? 700 : phone ? 1300 : 2400);
  const flakes = foamFlakes(U, low ? 220 : phone ? 380 : 650);
  const curtain = rinseCurtain(U);
  world.add(spray, flakes, curtain);

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(BASE + 'draco/');
  loader.setDRACOLoader(draco);
  loader.load(BASE + 'img/yikama-sinematik/araba.glb', (gltf) => {
    const geo = {};
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        o.updateWorldMatrix(true, false);
        const g = o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        geo[o.name] = g;
      }
    });
    body = new THREE.Mesh(geo.Body, bodyMat);
    interior = new THREE.Mesh(geo.Interior, seatMat);
    interior.visible = false;
    car.add(body, interior);
    const mkWheel = () => {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(geo.Tire, tireMat), new THREE.Mesh(geo.Rim, rimMat));
      return w;
    };
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const holder = new THREE.Group();
      holder.position.set(sx * WX, WY, sz * WZ);
      if (sz > 0) holder.rotation.y = Math.PI; // jant yüzü dışarı baksın
      const w = mkWheel();
      holder.add(w);
      car.add(holder);
      wheels.push({ w, sz });
    }
    // ayna kopyası
    const mc = new THREE.Group();
    const mb = new THREE.Mesh(geo.Body, bodyMat);
    mirrorBodies.push(mb);
    mc.add(mb);
    for (const { w } of wheels) {
      const h = w.parent.clone();
      mc.add(h);
    }
    mirror.add(mc);
    mirror.userData.car = mc;
    mirror.add(arches.clone());

    // Filo: aynı gövde, beyaz, örnek başına kir
    const fg = geo.Body.clone();
    fleetDirt = new THREE.InstancedBufferAttribute(new Float32Array(FLEET).fill(1), 1);
    fg.setAttribute('aDirt', fleetDirt);
    fleetBody = new THREE.InstancedMesh(fg, fleetMat, FLEET);
    fleetTires = new THREE.InstancedMesh(geo.Tire, tireMat, FLEET * 4);
    fleetRims = new THREE.InstancedMesh(geo.Rim, rimMat, FLEET * 4);
    [fleetBody, fleetTires, fleetRims].forEach((m) => { m.visible = false; m.frustumCulled = false; world.add(m); });
    if (!low && !phone) {
      fleetMirror = new THREE.InstancedMesh(fg, fleetMat, FLEET);
      fleetMirror.instanceMatrix = fleetBody.instanceMatrix;
      fleetMirror.visible = false;
      fleetMirror.frustumCulled = false;
      mirror.add(fleetMirror);
    }

    // Kaput üst yüzeyinin yüksekliği (pasta makinesi için)
    const ray = new THREE.Raycaster();
    heights = [];
    for (let i = 0; i <= 40; i++) {
      const x = 0.6 + (i / 40) * 1.6;
      ray.set(new THREE.Vector3(x, 3, 0.25), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(body)[0];
      heights.push(hit ? hit.point.y : 0.95);
    }
    // Tüm programları baştan derle: sahne geçişlerinde takılma olmasın
    body.material = xrayMat;
    interior.visible = true;
    [fleetBody, fleetTires, fleetRims].forEach((m) => (m.visible = true));
    polisher.visible = true;
    renderer.compile(scene, camera);
    body.material = bodyMat;
    renderer.compile(scene, camera);
    interior.visible = false;
    [fleetBody, fleetTires, fleetRims].forEach((m) => (m.visible = false));
    polisher.visible = false;
    ready = true;
    onReady?.();
  });

  // --- Kamera görünümleri: hedef + küresel konum ------------------------------------------
  const deg = Math.PI / 180;
  const V = (t, az, el, dist, fov, sx = 0, sy = 0) => ({ t: new THREE.Vector3(...t), az: az * deg, el: el * deg, dist, fov, sx, sy });
  const DESK = {
    hero: V([0, 0.75, 0], 36, 9, 10.5, 30, -0.16, 0),
    kir: V([-0.2, 0.6, 0], 74, 5, 7.2, 30, -0.17, 0.02),
    kopuk: V([0, 0.9, 0], 128, 16, 10, 30, -0.16, 0),
    durulama: V([0, 0.8, 0], 52, 20, 9.6, 30, -0.16, 0),
    jant: V([WX, 0.36, WZ], 62, 6, 2.5, 34, -0.12, 0),
    ic: V([-0.3, 0.7, 0], 76, 50, 8.4, 30, -0.14, 0),
    cila: V([1.35, 0.98, 0.1], 18, 50, 3.9, 34, -0.12, 0),
    filo: V([-8, 0.4, 0], 38, 26, 17, 32, -0.12, 0),
    final: V([0, 0.9, 0], 24, 7, 10.5, 30, 0, 0.1),
  };
  const PHONE = {
    hero: V([0, 0.72, 0], 30, 12, 12.5, 40, 0, 0.2),
    kir: V([-0.2, 0.62, 0], 58, 8, 9.8, 40, 0, 0.21),
    kopuk: V([0, 0.9, 0], 140, 18, 11.5, 40, 0, 0.21),
    durulama: V([0, 0.8, 0], 38, 22, 11.5, 40, 0, 0.21),
    jant: V([WX, 0.36, WZ], 58, 8, 3.1, 42, 0, 0.2),
    ic: V([-0.3, 0.6, 0], 90, 58, 14, 40, 0, 0.1),
    cila: V([1.4, 0.98, 0.1], 14, 55, 4.8, 42, 0, 0.2),
    filo: V([-9, 0.4, 0], 16, 30, 20, 42, 0, 0.2),
    final: V([0, 0.72, 0], 30, 12, 12.5, 40, 0, 0.24),
  };
  let VIEWS = phone ? PHONE : DESK;

  const cur = { t: new THREE.Vector3(0, 0.7, 0), az: 0.6, el: 0.15, dist: 10, fov: 32, sx: 0, sy: 0 };
  const goal = { ...cur, t: cur.t.clone() };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      mouse.x = e.clientX / innerWidth - 0.5;
      mouse.y = e.clientY / innerHeight - 0.5;
    });
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function view(name, t = 1, from) {
    const b = VIEWS[name];
    const a = from ? VIEWS[from] : b;
    goal.t.lerpVectors(a.t, b.t, t);
    for (const k of ['az', 'el', 'dist', 'fov', 'sx', 'sy']) goal[k] = lerp(a[k], b[k], t);
  }
  function orbit(daz = 0, del = 0, ddist = 0) {
    goal.az += daz * deg;
    goal.el += del * deg;
    goal.dist += ddist;
  }
  function snap() {
    cur.t.copy(goal.t);
    for (const k of ['az', 'el', 'dist', 'fov', 'sx', 'sy']) cur[k] = goal[k];
  }

  let W = 1;
  let H = 1;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    U.uPR.value = dpr * H * 0.5;
    const nowPhone = W < 900;
    VIEWS = nowPhone ? PHONE : DESK;
  }
  resize();

  const clock = new THREE.Clock();
  let time = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const yAxisFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

  function applyFleet(show) {
    if (!fleetBody) return;
    fleetBody.visible = fleetTires.visible = fleetRims.visible = show;
    if (fleetMirror) fleetMirror.visible = show;
    if (!show) return;
    const shift = S.fleetP * FLEET_GAP * (FLEET - 1) + 1.5;
    for (let i = 0; i < FLEET; i++) {
      const x = -i * FLEET_GAP + shift - FLEET_GAP * 0.5 - 4;
      pos.set(x, 0, 0);
      m4.compose(pos, q.identity(), one);
      fleetBody.setMatrixAt(i, m4);
      fleetDirt.array[i] = 1 - smoothstep(-2.2, 2.4, x);
      const roll = -x / 0.335;
      let k = 0;
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const wq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sz > 0 ? -roll : roll);
        const base = sz > 0 ? yAxisFlip.clone().multiply(wq) : wq;
        pos.set(x + sx * WX, WY, sz * WZ);
        m4.compose(pos, base, one);
        fleetTires.setMatrixAt(i * 4 + k, m4);
        fleetRims.setMatrixAt(i * 4 + k, m4);
        k++;
      }
    }
    fleetBody.instanceMatrix.needsUpdate = true;
    fleetTires.instanceMatrix.needsUpdate = true;
    fleetRims.instanceMatrix.needsUpdate = true;
    fleetDirt.needsUpdate = true;
  }
  function smoothstep(a, b, v) {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function render() {
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    // kamera yumuşak takip
    const k = 1 - Math.pow(0.0015, dt);
    cur.t.lerp(goal.t, k);
    for (const key2 of ['az', 'el', 'dist', 'fov', 'sx', 'sy']) cur[key2] += (goal[key2] - cur[key2]) * k;
    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;
    const az = cur.az + mouse.sx * 0.12;
    const el = Math.max(0.02, cur.el - mouse.sy * 0.06);
    camera.position.set(
      cur.t.x + Math.cos(az) * Math.cos(el) * cur.dist,
      cur.t.y + Math.sin(el) * cur.dist,
      cur.t.z + Math.sin(az) * Math.cos(el) * cur.dist,
    );
    camera.fov = cur.fov;
    camera.lookAt(cur.t);
    camera.setViewOffset(W, H, cur.sx * W, cur.sy * H, W, H);
    camera.updateProjectionMatrix();

    // uniform'lar
    U.uTime.value = time;
    U.uDirt.value = S.dirt;
    U.uRinse.value = S.rinse;
    U.uFoam.value = S.foam;
    U.uWet.value = S.wet;
    U.uSwirl.value = S.swirl;
    U.uPolish.value = S.polish;
    U.uGleam.value = S.gleam;
    U.uGleamAmt.value = S.gleamAmt;
    U.uLights.value = S.lights;
    U.uSpray.value = S.spray;
    U.uSprayX.value = S.sprayX;
    U.uFall.value = S.fall;
    U.uCurtain.value = S.curtain;
    U.uDust.value = S.dust;
    U.uXray.value = S.xray;
    U.uScan.value = S.scan;
    spray.visible = S.spray > 0.01;
    flakes.visible = S.fall > 0.01;
    curtain.visible = S.curtain > 0.01;
    curtain.position.x = S.rinse;
    tireMat.roughness = 0.85 - S.tireShine * 0.6;
    neon.material.opacity = S.neon;
    arches.visible = S.arch > 0.01;

    if (body) {
      const x = S.xray > 0.01;
      body.material = x ? xrayMat : bodyMat;
      interior.visible = x;
      car.visible = S.fleet < 0.5;
      if (mirror.userData.car) mirror.userData.car.visible = car.visible && !x;
      car.position.y = S.carY;
      for (const { w, sz } of wheels) w.rotation.z = (sz > 0 ? 1 : -1) * S.spinAngle;
      polisher.visible = S.polisher > 0.01;
      if (polisher.visible && heights) {
        const px = 2.05 - S.polishPath * 1.4;
        const zz = Math.sin(S.polishPath * 18) * 0.42;
        const idx = Math.min(40, Math.max(0, Math.round(((px - 0.6) / 1.6) * 40)));
        polisher.rotation.z = -0.25;
        polisher.position.set(px, heights[idx] + 0.03 + (1 - S.polisher) * 0.6, zz);
        pad.rotation.y = time * 30;
      }
      applyFleet(S.fleet > 0.5);
    }
    renderer.render(scene, camera);
  }

  return {
    S,
    view,
    orbit,
    snap,
    render,
    resize,
    get ready() { return ready; },
    project(x, y, z) {
      pos.set(x, y, z).project(camera);
      return { x: (pos.x * 0.5 + 0.5) * W, y: (-pos.y * 0.5 + 0.5) * H, behind: pos.z > 1 };
    },
    setName(n) { neonTex.userData.redraw(n); },
  };
}
