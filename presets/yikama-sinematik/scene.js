// Köpük 3D sahnesi: gece yıkama bölmesi, neon kemerler, ıslak zemin yansıması.
// Araç (lib3d car_sedan, gerçekçi sedan) tozlu gelir → basınçlı su → üç renk köpük → durulama →
// jant → iç temizlik (röntgen) → pasta-cila → filo kuyruğu kemerlerden geçer. Işık: garaj HDRI'si + neon
// LED bantlardan kurulmuş ortam, tavandan yumuşak gölge.
// Araç koordinatları: ön +x, yukarı +y, en ±z (gövde ±0,9, boy −2,38…2,34, tavan ~1,48).
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { loadAsset, pickQuality, manifest, LIB3D_URL } from '../../shared/lib3d.js';

const BASE = import.meta.env.BASE_URL;
const WX = 1.375;
const WY = 0.34;
const WZ = 0.8;
const FLEET = 6;
const FLEET_GAP = 5.4;

const PINK = new THREE.Color('#ff5c9d');
const BLUE = new THREE.Color('#27e3f0');
const LEMON = new THREE.Color('#7dffb4');

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

// Kir / köpük / su / çizik / parıltı: lib3d sedanın kendi malzemelerine (boya, cam, plastik) eklenir.
// Konum aracın yerel çerçevesinde: dünya konumu − uOrigin (filo kopyalarının her biri kendi uOrigin'ini taşır).
// kind: 'paint' (her şey), 'glass' (kir filmi, köpük, damla), 'trim' (kir + köpük)
function grime(m, U, kind, key) {
  const paint = kind === 'paint', glass = kind === 'glass';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWp; varying vec3 vWn;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uDirt, uRinse, uFoam, uWet, uSwirl, uPolish, uGleam, uGleamAmt, uTime; uniform vec3 uOrigin;
        varying vec3 vWp; varying vec3 vWn;
        ${NOISE}
        float gDirt, gFoam, gBeads, gSwirl, gClean; vec3 gEmis;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 p = vWp - uOrigin; vec3 n = normalize(vWn);
        float up = p.y; float side = abs(n.z);
        // kir: altta ve arkada daha yoğun, çamur sıçrakları
        float dn = fbm(p * vec3(2.2, 3.1, 2.2));
        float low = 1.0 - smoothstep(0.2, 1.3, up);
        // ince toz filmi her yerde, altta ve arkada kalın kir; boya yer yer görünür kalır
        float dirtM = 0.16 + 0.42 * low + smoothstep(0.5, 0.8, dn * 0.8 + low * 0.45 - p.x * 0.04) * 0.36;
        float splat = smoothstep(0.62, 0.72, vn(p * 7.0 + 2.0)) * low;
        dirtM = clamp(max(dirtM, splat), 0.0, 0.92) * ${glass ? '0.45' : '1.0'};
        float edge = uRinse + (vn(vec3(p.y * 3.0, p.z * 3.0, uTime * 0.6)) - 0.5) * 0.35;
        float rinsed = smoothstep(edge - 0.06, edge + 0.06, p.x);
        dirtM *= uDirt * (1.0 - rinsed);
        // köpük: topak topak büyür, üç renk (pembe, mavi, limon)
        vec2 q = side > 0.6 ? p.xy : (abs(n.y) > 0.6 ? p.xz : p.zy);
        float fnz = fbm(p * 1.7 + 3.1);
        float foamM = smoothstep(0.0, 0.06, uFoam * 1.35 - fnz - (1.0 - up) * 0.1) * (1.0 - rinsed);
        float tri = fbm(p * 0.8 + 5.0);
        vec3 fc = mix(mix(vec3(1.0, 0.5, 0.72), vec3(0.5, 0.84, 1.0), smoothstep(0.4, 0.47, tri)), vec3(1.0, 0.92, 0.55), smoothstep(0.55, 0.62, tri));
        float bub = cells(q * 26.0);
        float bub2 = cells(q * 61.0 + 4.0);
        vec3 foamCol = mix(fc, vec3(1.0), 0.08 + 0.35 * smoothstep(0.25, 0.6, bub)) * (0.82 + 0.18 * smoothstep(0.1, 0.4, bub2));
        // su damlaları
        float beads = (1.0 - smoothstep(0.1, 0.2, cells(q * 34.0))) * uWet * rinsed * ${kind === 'trim' ? '0.4' : '1.0'};
        // kılcal çizikler (yalnız boya): pasta makinesi geçtiği yerde kaybolur
        float topS = smoothstep(0.5, 0.8, n.y) + smoothstep(0.5, 0.8, side) * 0.6;
        float swirl = 0.0;
        ${paint ? `vec2 cq = q * 1.6; vec2 ci = floor(cq);
        vec2 cc = ci + vec2(h3(vec3(ci, 3.0)), h3(vec3(ci, 9.0)));
        float rr = length(cq - cc);
        swirl = smoothstep(0.55, 0.95, sin(rr * 260.0 + h3(vec3(ci, 5.0)) * 40.0)) * (1.0 - smoothstep(0.4, 0.9, rr));
        swirl *= uSwirl * topS * (1.0 - smoothstep(uPolish - 0.08, uPolish + 0.08, p.x));` : ''}
        vec3 dirtCol = mix(vec3(0.36, 0.3, 0.22), vec3(0.6, 0.53, 0.42), smoothstep(0.3, 0.7, dn) * (1.0 - splat)) * (0.88 + 0.24 * vn(p * 30.0));
        vec3 c = diffuseColor.rgb + swirl * 0.14;
        c = mix(c, dirtCol, dirtM);
        c = mix(c, foamCol, foamM);
        c += beads * 0.05;
        diffuseColor.rgb = c;
        ${glass ? 'diffuseColor.a = max(diffuseColor.a, max(dirtM * 0.9, foamM));' : ''}
        gDirt = dirtM; gFoam = foamM; gBeads = beads; gSwirl = swirl; gClean = (1.0 - dirtM) * (1.0 - foamM);
        float gb = exp(-pow((p.x + p.y * 0.5 - uGleam) * 5.0, 2.0));
        gEmis = ${paint ? 'vec3(0.85, 0.9, 1.0) * gb * uGleamAmt * gClean * 0.5 * (0.3 + 0.7 * topS) +' : ''} foamCol * foamM * 0.06;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, gDirt);
        roughnessFactor = mix(roughnessFactor, 0.5, gFoam);
        roughnessFactor = mix(roughnessFactor, 0.55, gSwirl * 0.6);
        roughnessFactor = mix(roughnessFactor, 0.05, gBeads);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor *= gClean;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += gEmis;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat *= gClean * (1.0 - gSwirl * 0.4); material.clearcoatRoughness = max(material.clearcoatRoughness, gSwirl * 0.3);
        #endif`);
  };
  m.customProgramCacheKey = () => 'kopuk-' + key;
  m.needsUpdate = true;
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

// Koltuk / döşeme: röntgen taraması geçtikçe lekeli kumaş temizlenir (yalnız röntgen açıkken kirli görünür)
function seatInject(m, U, key) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uScan, uXray; uniform vec3 uOrigin; varying vec3 vWp; ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 lp = vWp - uOrigin;
        float st = smoothstep(0.5, 0.62, fbm(lp * 5.0));
        float cleaned = smoothstep(uScan - 0.05, uScan + 0.05, lp.x);
        vec3 dirty = mix(vec3(0.5, 0.45, 0.4), vec3(0.28, 0.22, 0.16), st);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(dirty, diffuseColor.rgb, cleaned), uXray);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float bd = exp(-pow((lp.x - uScan) * 9.0, 2.0));
        totalEmissiveRadiance += (vec3(0.24, 0.77, 1.0) * bd * 0.9 + vec3(0.1, 0.12, 0.2) * cleaned * 0.4) * uXray;`);
  };
  m.customProgramCacheKey = () => 'kopuk-seat-' + key;
  m.needsUpdate = true;
}

// Jant: fren tozu (uDust) fırçalandıkça kaybolur
function rimInject(m, U, key) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uDust; varying vec3 vLp; ${NOISE} float gD;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        gD = uDust * smoothstep(0.3, 0.6, fbm(vLp * 40.0) + 0.25);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.15, 0.1), gD);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, gD);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.1, gD);`);
  };
  m.customProgramCacheKey = () => 'kopuk-rim-' + key;
  m.needsUpdate = true;
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
    x.font = `600 ${size}px "Bricolage Grotesque", "Arial Rounded MT Bold", sans-serif`;
    const w = x.measureText(txt).width;
    size *= Math.min(1, 1860 / w);
    x.font = `600 ${size}px "Bricolage Grotesque", "Arial Rounded MT Bold", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.shadowColor = '#ff5c9d';
    x.shadowBlur = 60;
    x.fillStyle = '#ff9cc4';
    x.fillText(txt, 1024, 270);
    x.shadowBlur = 18;
    x.fillStyle = '#ffe3ef';
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
  x.fillStyle = '#062127';
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

// Ortam haritası: karanlık bölme, tavanda beyaz, yanlarda mandalina ve camgöbeği LED bantlar
// hdr verilirse arka küre garaj HDRI'sidir (kısılmış), LED bantlar onun önünde
function envScene(hdr) {
  const s = new THREE.Scene();
  const skyMat = hdr
    ? new THREE.MeshBasicMaterial({ map: hdr, color: new THREE.Color(0.42, 0.5, 0.52), side: THREE.BackSide })
    : new THREE.MeshBasicMaterial({ color: '#020e11', side: THREE.BackSide });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), skyMat));
  const strip = (color, w, h, d, x, y, z, k = 1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) }));
    m.position.set(x, y, z);
    s.add(m);
  };
  for (let i = -2; i <= 2; i++) strip('#ffffff', 12, 0.2, 0.5, 0, 6, i * 2.2, 3.2);
  strip('#ff5c9d', 16, 0.5, 0.2, 0, 2.2, 7, 2.2);
  strip('#27e3f0', 16, 0.5, 0.2, 0, 2.2, -7, 2.2);
  strip('#7dffb4', 0.2, 1.8, 10, -9, 1.5, 0, 1.6);
  strip('#ffffff', 0.2, 3, 8, 9, 3, 0, 1.4);
  strip('#07303a', 30, 0.1, 30, 0, -0.5, 0, 1);
  return s;
}

// --- Dünya -------------------------------------------------------------------------------
export function createWorld(canvas, { name, phone, low, onReady }) {
  const q = pickQuality();
  const lo = low || q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, low ? 1 : phone ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const BG = new THREE.Color('#04191e');
  renderer.setClearColor(BG);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 14, 42);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 90);
  // Ortam: önce yalnız LED bantlı karanlık bölme; garaj HDRI'si gelince onun önüne kurulur (gerçek yansıma + neon)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene(), 0.02).texture;
  scene.environmentIntensity = 1.0;
  manifest().then((m) => {
    const e = m.envs.garage;
    return new HDRLoader().loadAsync(LIB3D_URL + (e[q] || e.hi).file);
  }).then((hdr) => {
    hdr.mapping = THREE.UVMapping;
    const old = scene.environment;
    scene.environment = pmrem.fromScene(envScene(hdr), 0.02).texture;
    old.dispose();
    hdr.dispose();
  }).catch(() => {});
  const hemi = new THREE.HemisphereLight('#9fe8ec', '#041d22', 0.35);
  // Tavan ışığı: yumuşak gölge (araç zemine otursun)
  const key = new THREE.DirectionalLight('#ffffff', 1.5);
  key.position.set(2.5, 8, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 10;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 2, far: 16 });
  scene.add(hemi, key, key.target);

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
    uOrigin: { value: new THREE.Vector3() },
  };

  // Zemin: ıslak, yarı saydam; altında aynalanmış sahne; tavan ışığının gölgesini alır
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#041b21', roughness: 0.18, metalness: 0.3, transparent: true, opacity: low ? 1 : 0.84, map: tileTexture(),
  });
  floorMat.map.repeat.set(20, 20);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const world = new THREE.Group(); // aynalanacak her şey
  scene.add(world);
  const mirror = new THREE.Group();
  mirror.scale.y = -1;
  const useMirror = !low && !phone;
  if (useMirror) scene.add(mirror);

  // Arka duvar + neon ad
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: '#05222a', roughness: 0.7 }));
  wall.position.set(0, 6, -6.5);
  scene.add(wall);
  const neonTex = neonTexture(name);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false, depthWrite: false }));
  neon.position.set(0, 3.25, -6.45);
  scene.add(neon);
  // duvar LED'leri
  const ledMat = (c, k = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  for (let i = -6; i <= 6; i++) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 5.2, 0.05), ledMat(i % 3 === 0 ? '#27e3f0' : '#1fa9c9', 1.2));
    led.position.set(i * 2.6, 2.6, -6.4);
    if (Math.abs(i) > 1) scene.add(led);
  }

  // Kemerler: araç üzerinden geçen neon çerçeveler
  const arches = new THREE.Group();
  const archCols = ['#27e3f0', '#ff5c9d', '#7dffb4', '#ffffff'];
  const archX = [-3.3, -1.1, 1.1, 3.3];
  const tube = new THREE.TubeGeometry(roundedRectPath(4.6, 2.9, 0.6), 60, 0.035, 8, false);
  const archMats = archCols.map((c) => ledMat(c, 2.2));
  archX.forEach((x, i) => {
    const g = new THREE.Group();
    g.position.x = x;
    g.add(new THREE.Mesh(tube, archMats[i]));
    arches.add(g);
  });
  world.add(arches);

  // Araç: lib3d sedan (gerçekçi gövde, cam, jant, iç döşeme); kir ve köpük onun malzemelerine eklenir
  const car = new THREE.Group();
  world.add(car);
  const xrayMat = xrayMaterial(U);
  let A = null;
  let interior = null;
  const xrayMeshes = []; // [mesh, özgün malzeme]
  let mirrorCar = null;
  let fleet = [];
  let heights = null;
  let ready = false;
  let rolled = 0;
  let tyreMats = [];
  let lamps = {};

  // Pasta makinesi
  const polisher = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 28), new THREE.MeshStandardMaterial({ color: '#5cf5a0', roughness: 0.8 }));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.14, 24), new THREE.MeshStandardMaterial({ color: '#23233a', metalness: 0.4, roughness: 0.4 }));
  head.position.y = 0.1;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.08), head.material);
  handle.position.set(-0.18, 0.2, 0);
  polisher.add(pad, head, handle);
  polisher.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  polisher.visible = false;
  world.add(polisher);

  // Parçacıklar
  const spray = sprayPoints(U, low ? 700 : phone ? 1300 : 2400);
  const flakes = foamFlakes(U, low ? 220 : phone ? 380 : 650);
  const curtain = rinseCurtain(U);
  world.add(spray, flakes, curtain);

  const TRIM = ['trim_black', 'plastic_black', 'grille', 'arch_liner', 'lamp_glass', 'tail_lens', 'plate', 'chrome'];
  loadAsset('car_sedan', { quality: q, renderer }).then((asset) => {
    A = asset;
    const root = A.scene;
    car.add(root);
    const Mt = A.materials;
    // Koyu gece mavisi metalik boya: temizlenince neon kemerleri yansıtır
    Mt.paint.color.set('#0c2c3a');
    Mt.paint.metalness = 0.6;
    Mt.paint.roughness = 0.3;
    if ('clearcoat' in Mt.paint) { Mt.paint.clearcoat = 1; Mt.paint.clearcoatRoughness = 0.05; }
    grime(Mt.paint, U, 'paint', 'paint');
    if (Mt.glass) grime(Mt.glass, U, 'glass', 'glass');
    for (const n of TRIM) if (Mt[n]) grime(Mt[n], U, 'trim', n);
    for (const n of ['rim_face', 'rim_paint']) if (Mt[n]) rimInject(Mt[n], U, n);
    for (const n of ['seat', 'interior', 'dash']) if (Mt[n]) seatInject(Mt[n], U, n);
    tyreMats = ['tyre_side', 'tyre_tread'].map((n) => Mt[n]).filter(Boolean);
    lamps = { head: Mt.light_head, tail: Mt.light_tail };
    interior = A.nodes.interior;
    // Röntgen: tekerlek ve iç döşeme dışındaki her şey camgöbeği kabuğa döner
    root.traverse((o) => {
      if (!o.isMesh) return;
      let p = o, skip = false;
      while (p && p !== root) { if (p === interior || /^(wheel|steer|hub)_/.test(p.name)) { skip = true; break; } p = p.parent; }
      if (!skip) xrayMeshes.push([o, o.material]);
    });
    // Zemin aynası (masaüstü): aynı geometri ve malzemeler, gölge düşürmez
    if (useMirror) {
      mirrorCar = root.clone(true);
      mirrorCar.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      mirror.add(mirrorCar);
      mirror.add(arches.clone());
    }
    // Filo: beyaz sedanlar sırayla kemerlerden geçer; her birinin kendi kir miktarı ve konumu
    const FN = phone || low ? 4 : FLEET;
    for (let i = 0; i < FN; i++) {
      const c = root.clone(true);
      const Ui = { ...U, uDirt: { value: 1 }, uOrigin: { value: new THREE.Vector3() }, uRinse: { value: 4 }, uFoam: { value: 0 }, uSwirl: { value: 0 }, uWet: { value: 0 }, uGleamAmt: { value: 0 } };
      const pm = Mt.paint.clone();
      pm.color.set('#eef1f5');
      pm.metalness = 0.15;
      grime(pm, Ui, 'paint', 'fleet');
      c.traverse((o) => {
        if (!o.isMesh) return;
        if (o.material === Mt.paint) o.material = pm;
        if (lo) o.castShadow = false;
      });
      c.visible = false;
      world.add(c);
      fleet.push({ c, Ui });
    }
    // Kaput üst yüzeyinin yüksekliği (pasta makinesi için)
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    heights = [];
    const hood = A.nodes.hood || root;
    for (let i = 0; i <= 40; i++) {
      const x = 0.6 + (i / 40) * 1.6;
      ray.set(new THREE.Vector3(x, 3, 0.25), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(hood, true)[0] || ray.intersectObject(root, true)[0];
      heights.push(hit ? hit.point.y : 0.95);
    }
    // Tüm programları baştan derle: sahne geçişlerinde takılma olmasın
    for (const [m] of xrayMeshes) m.material = xrayMat;
    fleet.forEach((f) => (f.c.visible = true));
    polisher.visible = true;
    renderer.compile(scene, camera);
    for (const [m, orig] of xrayMeshes) m.material = orig;
    renderer.compile(scene, camera);
    fleet.forEach((f) => (f.c.visible = false));
    polisher.visible = false;
    ready = true;
    onReady?.();
  }).catch((e) => console.warn('araç modeli yüklenemedi', e));

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

  const timer = new THREE.Timer();
  let time = 0;
  const pos = new THREE.Vector3();

  function applyFleet(show) {
    for (const f of fleet) f.c.visible = show;
    if (!show) return;
    const n = fleet.length;
    const shift = S.fleetP * FLEET_GAP * (n - 1) + 1.5;
    fleet.forEach((f, i) => {
      const x = -i * FLEET_GAP + shift - FLEET_GAP * 0.5 - 4;
      f.c.position.set(x, 0, 0);
      f.Ui.uOrigin.value.set(x, 0, 0);
      f.Ui.uDirt.value = 1 - smoothstep(-2.2, 2.4, x);
    });
  }
  function smoothstep(a, b, v) {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  let xrayOn = false;
  function render() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
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
    // gölge kamerası bakılan yeri izler (filo sahnesinde araçlar uzakta)
    key.target.position.set(cur.t.x, 0, 0);
    key.position.set(cur.t.x + 2.5, 8, 3.5);

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
    U.uOrigin.value.set(0, S.carY, 0);
    spray.visible = S.spray > 0.01;
    flakes.visible = S.fall > 0.01;
    curtain.visible = S.curtain > 0.01;
    curtain.position.x = S.rinse;
    for (const m of tyreMats) m.roughness = 0.85 - S.tireShine * 0.55;
    neon.material.opacity = S.neon;
    arches.visible = S.arch > 0.01;

    if (A) {
      const x = S.xray > 0.01;
      if (x !== xrayOn) {
        xrayOn = x;
        for (const [m, orig] of xrayMeshes) m.material = x ? xrayMat : orig;
      }
      if (lamps.head) lamps.head.emissiveIntensity = 0.4 + 2.6 * S.lights;
      if (lamps.tail) lamps.tail.emissiveIntensity = 0.5 + 1.5 * S.lights;
      car.visible = S.fleet < 0.5;
      if (mirrorCar) mirrorCar.visible = car.visible && !x;
      car.position.y = S.carY;
      // tekerlekler: açı farkı kadar ileri yuvarla (roll metre alır)
      const d = (S.spinAngle - rolled) * 0.33;
      if (Math.abs(d) > 1e-5) { A.roll(d); rolled = S.spinAngle; }
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
