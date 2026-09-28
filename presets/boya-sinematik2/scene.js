// Yansıma 3D sahnesi: boya standına kıskaçla tutturulmuş gerçek bir ön çamurluk sacı.
// Işık: lib3d `studio` HDRI'sine bindirilmiş PDR zebra ışık tahtası (yansıyan siyah-beyaz bantlar),
// yumuşak PCF gölge, AgX ton eşleme. Boya: metalik pullu bukalemun baz + vernik (clearcoat, portakal kabuğu).
// Hikâye: dolu göçükleri → boyasız göçük düzeltme → kaza göçüğü + ölçü ızgarası → zımpara (çıplak sac,
// macun, kademeli kenar) → astar → maskeleme bandı → boya → renk eşleme → hare/hologram → pasta → seramik damlaları.
// Dışarıya tek bir durum nesnesi `S` açar.
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { manifest, pickQuality, LIB3D_URL } from '../../shared/lib3d.js';

export const PW = 3.4; // çamurluk boyu (sahne birimi; 1 birim ≈ 30 cm)
export const PH = 2.0;
const XL = -PW / 2;
const XR = PW / 2;
const Y0 = 0.22; // karakter çizgisi
export const ARCH = { x: 0.55, y: -1.15, r: 0.85 }; // teker davlumbazı
const SILL = -1.0; // arka alt kenar (marşpiyel hizası)
const FRONT_B = -0.86; // ön alt kenar (tampon hizası)
const FLOOR = -1.95;

// Çamurluk yüzeyi: yatayda kavisli, karakter çizgisinde kırılır (üstü geriye yatar).
function surf(x, y, out = new THREE.Vector3()) {
  const dy = y - Y0;
  const k = dy > 0 ? 0.62 : 0.1;
  const z = -0.15 * x * x - k * dy * dy + 0.04 * x * dy - 0.05 * Math.max(0, dy);
  return out.set(x, y, z);
}
// Dış hat: üstte kaput çizgisi (önde far köşesine yuvarlanır), altta davlumbaz kesiği.
function yTop(x) {
  const u = (x - XL) / PW;
  let y = 1.0 - 0.07 * u * u;
  const c = (x - 1.4) / 0.3;
  if (c > 0) y -= 0.3 * c * c;
  return y;
}
function yBot(x) {
  const base = x > ARCH.x ? FRONT_B : SILL;
  const dx = x - ARCH.x;
  if (Math.abs(dx) < ARCH.r) return Math.max(base, ARCH.y + Math.sqrt(ARCH.r * ARCH.r - dx * dx));
  return base;
}
const inside = (x, y, m = 0) => x > XL + m && x < XR - m && y > yBot(x) + m && y < yTop(x) - m;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
function tangents(x, y, tx, ty) {
  const e = 0.002;
  surf(x + e, y, _a); surf(x - e, y, _b); tx.subVectors(_a, _b).normalize();
  surf(x, y + e, _a); surf(x, y - e, _b); ty.subVectors(_a, _b).normalize();
}
function surfNormal(x, y, out) {
  const tx = new THREE.Vector3();
  const ty = new THREE.Vector3();
  tangents(x, y, tx, ty);
  return out.crossVectors(tx, ty).normalize();
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Onarım bölgesi (kaza göçüğü, zımpara, astar, bant, boya hepsi burada)
export const CRASH = { x: -0.85, y: 0.08, s: 0.46, d: 0.15 };
const TAPE = { hx: 0.64, hy: 0.56, band: 0.085 }; // bant çerçevesi (yarı genişlik/yükseklik), bant eni ≈ 25 mm
const R = [0.25, 0.29, 0.315, 0.335, 0.36, 0.43]; // macun | çıplak sac | kataforez | baz | vernik kenarı | mat zımpara

export const PINS = [
  { x: CRASH.x, y: CRASH.y, mm: 6.4 },
  { x: -1.35, y: -0.5, mm: 2.1 },
  { x: 0.3, y: 0.55, mm: 3.8 },
];

// Dolu göçükleri (sabit tohum, her açılışta aynı yer)
const HAIL = (() => {
  const r = rng(11);
  const out = [];
  let guard = 0;
  while (out.length < 12 && guard++ < 5000) {
    const x = (r() - 0.5) * PW * 0.84;
    const y = (r() - 0.5) * PH * 0.8 + 0.12;
    if (!inside(x, y, 0.2) || out.some((o) => Math.hypot(o.x - x, o.y - y) < 0.4)) continue;
    out.push({ x, y, s: 0.075 + r() * 0.05, d: 0.03 + r() * 0.02, t: out.length / 12, p: r() });
  }
  out.sort((a, b) => a.p - b.p).forEach((o, i) => (o.p = i / out.length));
  return out;
})();
const NDENT = HAIL.length + 1;

const DENT_GLSL = /* glsl */ `
uniform vec4 uDents[${NDENT}];
float dentH(vec2 p, out vec2 g) {
  float h = 0.0; g = vec2(0.0);
  for (int i = 0; i < ${NDENT}; i++) {
    vec4 d = uDents[i];
    if (d.w < 0.0001) continue;
    vec2 q = p - d.xy;
    float e = exp(-dot(q, q) * d.z);
    h -= d.w * e;
    g += d.w * e * 2.0 * d.z * q;
  }
  return h;
}`;

const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float sdRoundRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec3 flipC(vec3 A, vec3 B, vec3 C, float fac) {
  vec3 f = mix(B, A, smoothstep(0.42, 0.97, fac));
  return mix(f, C, pow(1.0 - fac, 2.4) * 0.85);
}`;

function panelGeometry(NX, NY) {
  const n = (NX + 1) * (NY + 1);
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const tx = new Float32Array(n * 3);
  const ty = new Float32Array(n * 3);
  const p = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i <= NX; i++) {
    const x = XL + (PW * i) / NX;
    const yb = yBot(x);
    const yt = yTop(x);
    for (let j = 0; j <= NY; j++, k++) {
      const y = yb + ((yt - yb) * j) / NY;
      surf(x, y, p);
      tangents(x, y, a, b);
      c.crossVectors(a, b).normalize();
      p.toArray(pos, k * 3);
      c.toArray(nor, k * 3);
      a.toArray(tx, k * 3);
      b.toArray(ty, k * 3);
      uv[k * 2] = x / PW + 0.5;
      uv[k * 2 + 1] = y / PH + 0.5;
    }
  }
  const idx = [];
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const A = i * (NY + 1) + j;
      const B = (i + 1) * (NY + 1) + j;
      idx.push(A, B, A + 1, B, B + 1, A + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aTx', new THREE.BufferAttribute(tx, 3));
  g.setAttribute('aTy', new THREE.BufferAttribute(ty, 3));
  g.setIndex(idx);
  return g;
}

// Dış hat boyunca kıvrılmış kenar (sac kenarı 90° içe kıvrılır: gerçek parça kalınlığı ve kenar ışığı)
function outlineLoop(step) {
  const pts = [];
  const n = Math.ceil(PW / step);
  for (let i = 0; i <= n; i++) { const x = XL + (PW * i) / n; pts.push([x, yTop(x), 0]); } // üst, arkadan öne
  const fr = [yTop(XR), yBot(XR)];
  const nf = Math.ceil((fr[0] - fr[1]) / step);
  for (let i = 1; i < nf; i++) pts.push([XR, fr[0] + ((fr[1] - fr[0]) * i) / nf, 0]);
  const nb = Math.ceil((PW * 1.6) / step);
  for (let i = 0; i <= nb; i++) {
    const x = XR - (PW * i) / nb;
    const onArch = Math.abs(x - ARCH.x) < ARCH.r && yBot(x) > (x > ARCH.x ? FRONT_B : SILL) + 1e-4;
    pts.push([x, yBot(x), onArch ? 1 : 0]);
  }
  const rr = [yBot(XL), yTop(XL)];
  const nr = Math.ceil((rr[1] - rr[0]) / step);
  for (let i = 1; i < nr; i++) pts.push([XL, rr[0] + ((rr[1] - rr[0]) * i) / nr, 0]);
  return pts;
}
function flangeGeometry(low) {
  const loop = outlineLoop(low ? 0.03 : 0.018);
  // davlumbazda sık örnek (dik bölümler)
  const N = loop.length;
  const PROF = low ? 5 : 8;
  const rb = 0.014;
  const pos = [];
  const p = new THREE.Vector3();
  const nn = new THREE.Vector3();
  const tx = new THREE.Vector3();
  const ty = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const o = new THREE.Vector3();
  const rows = [];
  for (let i = 0; i < N; i++) {
    const [x, y, arch] = loop[i];
    const [x0, y0] = loop[(i - 1 + N) % N];
    const [x1, y1] = loop[(i + 1) % N];
    surf(x, y, p);
    tangents(x, y, tx, ty);
    nn.crossVectors(tx, ty).normalize();
    // yüzey içinde kenara teğet ve dışa bakan yön
    tan.copy(tx).multiplyScalar(x1 - x0).addScaledVector(ty, y1 - y0).normalize();
    o.crossVectors(tan, nn).normalize(); // döngü saat yönünde (üst: arkadan öne) → dışa
    const Lr = arch ? 0.075 : 0.045;
    const row = [];
    for (let k = 0; k <= PROF; k++) {
      const a = (k / PROF) * (Math.PI / 2);
      row.push(p.clone().addScaledVector(o, rb * Math.sin(a)).addScaledVector(nn, -rb * (1 - Math.cos(a))));
    }
    row.push(p.clone().addScaledVector(o, rb).addScaledVector(nn, -rb - Lr));
    rows.push(row);
  }
  const M = rows[0].length;
  const idx = [];
  for (const row of rows) for (const v of row) pos.push(v.x, v.y, v.z);
  for (let i = 0; i < N; i++) {
    const i1 = (i + 1) % N;
    for (let k = 0; k < M - 1; k++) {
      const a = i * M + k, b = i1 * M + k, c = i1 * M + k + 1, d = i * M + k + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // sarım yönü: ilk dörtgen dışa (yüzey normali yönüne) bakmalı
  const nA = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, 0);
  const [x0, y0] = loop[0];
  if (nA.dot(surfNormal(x0, y0, new THREE.Vector3())) < 0) {
    const ii = g.index.array;
    for (let t = 0; t < ii.length; t += 3) { const s = ii[t + 1]; ii[t + 1] = ii[t + 2]; ii[t + 2] = s; }
    g.computeVertexNormals();
  }
  return g;
}

// Metalik pul: rastgele eğik mikro normaller (mipmap uzakta düzleştirir, yakında parıldar)
function flakeTexture(size) {
  const d = new Uint8Array(size * size * 4);
  const r = rng(7);
  for (let i = 0; i < size * size; i++) {
    const on = r() < 0.55;
    const ax = on ? (r() - 0.5) * 1.6 : 0;
    const ay = on ? (r() - 0.5) * 1.6 : 0;
    d[i * 4] = Math.round((ax * 0.5 + 0.5) * 255);
    d[i * 4 + 1] = Math.round((ay * 0.5 + 0.5) * 255);
    d[i * 4 + 2] = 255;
    d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function makePaint(U, { flange = false } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.62, roughness: 0.36,
    clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide,
  });
  mat.customProgramCacheKey = () => (flange ? 'boya-flange' : 'boya-panel');
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    const defs = flange ? '#define FLANGE\n' : '';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `${defs}#include <common>
        varying vec2 vP;
        #ifndef FLANGE
          attribute vec3 aTx; attribute vec3 aTy;
          varying vec3 vTxV; varying vec3 vTyV;
          ${DENT_GLSL}
        #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position); vP = position.xy;
        #ifndef FLANGE
          vTxV = normalize(normalMatrix * aTx); vTyV = normalize(normalMatrix * aTy);
          { vec2 dG; transformed += normal * dentH(position.xy, dG); }
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `${defs}#include <common>
        varying vec2 vP;
        uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform vec3 uOffA; uniform vec3 uOffB;
        uniform vec2 uC; uniform float uPatch; uniform float uPrimer; uniform float uTape; uniform float uPaint;
        uniform float uMatch; uniform float uHaze; uniform float uSwirl; uniform vec2 uSwirlC;
        uniform sampler2D uFlake; uniform float uFlakeK; uniform float uFlakeAmt; uniform float uPeel;
        ${NOISE_GLSL}
        #ifndef FLANGE
          varying vec3 vTxV; varying vec3 vTyV;
          ${DENT_GLSL}
        #endif
        float lCC = 1.0; float lCCR = 0.03;`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        #ifndef FLANGE
        {
          vec2 dg; dentH(vP, dg);
          vec3 pn = normalize(normal - faceDirection * (dg.x * vTxV + dg.y * vTyV));
          // portakal kabuğu: vernikte hafif dalga (yansıyan bantlar kusursuz cam gibi durmasın)
          vec2 q = vP * 26.0; float e = 0.35;
          float n0 = vnoise(q); float nx = vnoise(q + vec2(e, 0.0)); float ny = vnoise(q + vec2(0.0, e));
          vec3 peel = ((nx - n0) * vTxV + (ny - n0) * vTyV) * uPeel * faceDirection;
          normal = pn; nonPerturbedNormal = normalize(pn - peel);
        }
        #endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 lCol; float lR = roughnessFactor; float lM = metalnessFactor; lCC = 1.0; lCCR = clearcoatRoughness;
        {
          vec3 vd = normalize(vViewPosition);
          float fac = clamp(abs(dot(nonPerturbedNormal, vd)), 0.0, 1.0);
          vec3 flip = flipC(uColA, uColB, uColC, fac);
          lCol = flip;
          #ifndef FLANGE
          if (!gl_FrontFacing) {
            lCol = vec3(0.16, 0.17, 0.18); lR = 0.62; lM = 0.0; lCC = 0.0; // iç yüz: kataforez astarı
          } else {
            vec3 fl = texture2D(uFlake, vP * uFlakeK).xyz * 2.0 - 1.0;
            normal = normalize(normal + (fl.x * vTxV + fl.y * vTyV) * uFlakeAmt);
            vec2 pq = vP - uC;
            float grain = hash12(floor(vP * 900.0));
            if (uPatch > 0.001) {
              float pa = atan(pq.y, pq.x);
              float pd = length(pq) * (1.0 + 0.07 * sin(pa * 3.0 + 0.7) + 0.04 * sin(pa * 7.0 + 2.1)) + (vnoise(vP * 9.0) - 0.5) * 0.03;
              float s = pd / max(uPatch, 0.001);
              float aa = fwidth(s) * 1.2 + 0.002;
              // DA zımpara izleri: iki yönde ince çizik
              vec2 rq = mat2(0.8, 0.6, -0.6, 0.8) * vP;
              float scr = max(vnoise(rq * vec2(70.0, 3.0)), vnoise(vP.yx * vec2(64.0, 3.5) + 7.0));
              scr = smoothstep(0.62, 0.95, scr);
              float w;
              w = 1.0 - smoothstep(${R[5].toFixed(3)} - aa, ${R[5].toFixed(3)} + aa, s); // mat zımpara (P800)
              lCol = mix(lCol, flip * 0.72 + 0.1, w * 0.85); lR = mix(lR, 0.58, w); lCC = mix(lCC, 0.0, w);
              w = 1.0 - smoothstep(${R[4].toFixed(3)} - aa, ${R[4].toFixed(3)} + aa, s); // vernik kenarı (beyazımsı)
              lCol = mix(lCol, flip * 0.45 + 0.3, w); lR = mix(lR, 0.72, w);
              w = 1.0 - smoothstep(${R[3].toFixed(3)} - aa, ${R[3].toFixed(3)} + aa, s); // baz boya
              lCol = mix(lCol, flip * 0.85, w); lR = mix(lR, 0.62, w);
              w = 1.0 - smoothstep(${R[2].toFixed(3)} - aa, ${R[2].toFixed(3)} + aa, s); // kataforez
              lCol = mix(lCol, vec3(0.13, 0.135, 0.15), w); lM = mix(lM, 0.0, w); lR = mix(lR, 0.6, w);
              w = 1.0 - smoothstep(${R[1].toFixed(3)} - aa, ${R[1].toFixed(3)} + aa, s); // çıplak sac
              lCol = mix(lCol, vec3(0.62, 0.63, 0.65) * (0.88 + scr * 0.24), w); lM = mix(lM, 1.0, w); lR = mix(lR, 0.24 + scr * 0.2, w);
              w = 1.0 - smoothstep(${R[0].toFixed(3)} - aa, ${R[0].toFixed(3)} + aa, s); // zımparalanmış macun
              float pit = step(0.985, hash12(floor(vP * 260.0)));
              lCol = mix(lCol, vec3(0.63, 0.58, 0.5) * (0.93 + grain * 0.09 - pit * 0.25 - scr * 0.05), w); lM = mix(lM, 0.0, w); lR = mix(lR, 0.82, w);
            }
            if (uPrimer > 0.001) {
              float pd = length(pq) + (vnoise(vP * 7.0) - 0.5) * 0.04;
              float cov = clamp((uPrimer * 1.7 - vnoise(vP * 16.0) * 0.55 - (pd / ${R[5].toFixed(3)}) * 0.55) / 0.12, 0.0, 1.0);
              float area = 1.0 - smoothstep(${(R[5] - 0.02).toFixed(3)}, ${(R[5] + 0.06).toFixed(3)}, pd); // kenarda püskürtme sisi
              float wp = cov * area;
              lCol = mix(lCol, vec3(0.5, 0.51, 0.52) * (0.95 + grain * 0.07), wp);
              lM = mix(lM, 0.0, wp); lR = mix(lR, 0.8, wp); lCC = mix(lCC, 0.0, wp);
            }
            float dR = sdRoundRect(pq, vec2(${TAPE.hx.toFixed(3)}, ${TAPE.hy.toFixed(3)}), 0.03);
            float painted = 0.0;
            if (uPaint > 0.001) {
              float cov = clamp((uPaint * 1.6 - vnoise(vP * 11.0) * 0.5 - length(pq / vec2(${TAPE.hx.toFixed(3)}, ${TAPE.hy.toFixed(3)})) * 0.6) / 0.1, 0.0, 1.0);
              painted = cov * (1.0 - smoothstep(-${(TAPE.band * 0.35).toFixed(3)} - 0.003, -${(TAPE.band * 0.35).toFixed(3)} + 0.003, dR));
              vec3 off = flipC(uOffA, uOffB, uColC, fac);
              lCol = mix(lCol, mix(off, flip, uMatch), painted);
              lM = mix(lM, metalnessFactor, painted); lR = mix(lR, roughnessFactor, painted); lCC = mix(lCC, 1.0, painted);
            }
            if (uTape > 0.001) {
              float band = step(dR, 0.0) * step(-${TAPE.band.toFixed(3)}, dR);
              float t = (atan(pq.y, pq.x) + 3.14159) / 6.28318;
              float laid = step(t, uTape * 1.02);
              float wt = band * laid;
              float horiz = step(abs(pq.x) / ${TAPE.hx.toFixed(3)}, abs(pq.y) / ${TAPE.hy.toFixed(3)});
              float crepe = vnoise(horiz > 0.5 ? vec2(vP.x * 140.0, vP.y * 6.0) : vec2(vP.y * 140.0, vP.x * 6.0));
              float edge = min(abs(dR), abs(dR + ${TAPE.band.toFixed(3)}));
              vec3 tape = vec3(0.8, 0.73, 0.55) * (0.9 + crepe * 0.12) * mix(0.78, 1.0, smoothstep(0.0, 0.004, edge));
              vec3 tapeCol = mix(tape, mix(flipC(uOffA, uOffB, uColC, fac), flip, uMatch) * 0.9, painted * 0.9);
              lCol = mix(lCol, tapeCol, wt);
              lM = mix(lM, 0.0, wt); lR = mix(lR, mix(0.86, 0.5, painted), wt); lCC = mix(lCC, 0.0, wt);
              // bandın dış kenarında ince gölge (kalınlık)
              float sh = laid * (1.0 - smoothstep(0.0, 0.007, dR)) * step(0.0, dR);
              lCol *= 1.0 - sh * 0.35;
            }
          }
          #endif
          lCCR = mix(lCCR, 0.34, uHaze);
          lCol += vec3(0.035) * uHaze;
        }
        diffuseColor.rgb = lCol;
        roughnessFactor = lR;
        metalnessFactor = lM;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        #ifndef FLANGE
        if (uSwirl > 0.001 && gl_FrontFacing) {
          vec2 sp = vP - uSwirlC;
          float r = length(sp);
          float a = atan(sp.y, sp.x);
          float br = step(0.4, hash12(vec2(floor(a * 22.0 + r * 30.0), 3.0)));
          float rings = pow(abs(sin(r * 120.0 + sin(a * 5.0 + r * 9.0) * 0.8)), 40.0) * br;
          float arc = pow(max(0.0, cos(a * 2.0 - 0.6)), 3.0);
          float fall = exp(-r * r * 1.6) * smoothstep(0.03, 0.2, r);
          vec3 rb = 0.6 + 0.4 * cos(6.2831 * (a / 6.2831 + vec3(0.0, 0.33, 0.67)));
          totalEmissiveRadiance += mix(vec3(1.0), rb, 0.55) * rings * fall * (0.05 + arc) * uSwirl * 0.9;
        }
        #endif`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.clearcoat = lCC;
        material.clearcoatRoughness = max(lCCR, 0.0525);`);
  };
  return mat;
}

// --- Ortam: studio HDRI + PDR zebra ışık tahtası ----------------------------------------------
async function buildEnv(renderer, q) {
  let src = null;
  try {
    const m = await manifest();
    const e = m.envs.studio;
    const file = (e[q] || e.hi).file;
    src = await new HDRLoader().setDataType(THREE.FloatType).loadAsync(LIB3D_URL + file);
  } catch (err) {
    console.warn('boya: HDRI yüklenemedi, düz ortam kullanılıyor', err);
  }
  const W = 1024;
  const H = 512;
  const out = new Uint16Array(W * H * 4);
  const sd = src && src.image.data;
  const sw = src ? src.image.width : 0;
  const shh = src ? src.image.height : 0;
  const toH = THREE.DataUtils.toHalfFloat;
  const EL0 = (-6 * Math.PI) / 180;
  const EL1 = (64 * Math.PI) / 180;
  const AZW = (78 * Math.PI) / 180;
  const NST = 17;
  const px = Math.PI / H;
  const sample = (u, v, ch) => {
    // bilinear örnek (kaynak 512 ya da 1024 genişlik)
    const x = u * sw - 0.5;
    const y = v * shh - 0.5;
    const x0 = Math.floor(x), y0 = Math.max(0, Math.min(shh - 1, Math.floor(y)));
    const y1 = Math.min(shh - 1, y0 + 1);
    const fx = x - x0, fy = Math.min(1, Math.max(0, y - y0));
    const xa = ((x0 % sw) + sw) % sw, xb = (xa + 1) % sw;
    const g = (xx, yy) => sd[(yy * sw + xx) * 4 + ch];
    return (g(xa, y0) * (1 - fx) + g(xb, y0) * fx) * (1 - fy) + (g(xa, y1) * (1 - fx) + g(xb, y1) * fx) * fy;
  };
  const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let r = 0; r < H; r++) {
    const v = (r + 0.5) / H; // satır 0 = tepe (flipY)
    const el = (0.5 - v) * Math.PI;
    const inEl = sm(EL0 - 0.03, EL0, el) * (1 - sm(EL1, EL1 + 0.03, el));
    const ph = (el - EL0) / ((EL1 - EL0) / NST);
    const f = ph - Math.floor(ph);
    const aaW = (px / ((EL1 - EL0) / NST)) * 0.8;
    const white = sm(-aaW, aaW, f) * (1 - sm(0.52 - aaW, 0.52 + aaW, f));
    for (let c = 0; c < W; c++) {
      const u = (c + 0.5) / W;
      let dAz = (u - 0.5) * 2 * Math.PI - Math.PI / 2; // +Z (kameraya bakan yön) = u 0.75
      dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
      const mask = inEl * (1 - sm(AZW - 0.04, AZW, Math.abs(dAz)));
      const o = (r * W + c) * 4;
      let R0 = 0.55, G0 = 0.56, B0 = 0.58;
      if (sd) {
        R0 = sample(u, v, 0); G0 = sample(u, v, 1); B0 = sample(u, v, 2);
      } else {
        const t = 0.35 + 0.65 * Math.max(0, Math.sin(el));
        R0 = G0 = B0 = t;
      }
      const edgeFall = 0.82 + 0.18 * Math.cos(dAz * 0.9);
      const val = white * 2.6 * edgeFall + (1 - white) * 0.012;
      out[o] = toH(R0 * (1 - mask) + val * mask);
      out[o + 1] = toH(G0 * (1 - mask) + val * 1.0 * mask);
      out[o + 2] = toH(B0 * (1 - mask) + val * 1.03 * mask);
      out[o + 3] = toH(1);
    }
  }
  if (src) src.dispose();
  const tex = new THREE.DataTexture(out, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.flipY = true;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return env;
}

// --- Boya standı: boru gövde, tripod ayak, tekerlek, kıskaçlar ----------------------------------
function tube(a, b, r, seg = 14) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
function ball(p, r, seg = 12) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg >> 1));
  g.translate(p.x, p.y, p.z);
  return g;
}
function buildStand(low) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const seg = low ? 10 : 16;
  const ZS = -0.92;
  const steel = [];
  const rubber = [];
  const zinc = [];
  const hub = V(0, FLOOR + 0.16, ZS);
  steel.push(tube(hub, V(0, 0.34, ZS), 0.034, seg));
  steel.push(tube(V(-1.15, 0.34, ZS), V(1.15, 0.34, ZS), 0.028, seg));
  steel.push(ball(V(0, 0.34, ZS), 0.045, seg));
  for (const sx of [-1, 1]) {
    const x = sx * 1.15;
    const yt = yTop(x);
    const ze = surf(x, yt).z;
    const top = V(x, yt + 0.12, ZS);
    steel.push(tube(V(x, 0.34, ZS), top, 0.022, seg), ball(V(x, 0.34, ZS), 0.034, seg), ball(top, 0.026, seg));
    const tip = V(x, yt + 0.12, ze - 0.012);
    steel.push(tube(top, tip, 0.018, seg), ball(tip, 0.021, seg));
    zinc.push(tube(tip, V(x, yt + 0.028, ze - 0.012), 0.011, seg));
    rubber.push(ball(V(x, yt + 0.022, ze - 0.012), 0.024, seg));
  }
  // alt destek: sacın arkasına lastik pabuç
  const zl = surf(0, -0.55).z;
  steel.push(tube(V(0, -0.55, ZS), V(0, -0.55, zl - 0.05), 0.022, seg), ball(V(0, -0.55, ZS), 0.036, seg));
  const pad = new THREE.CylinderGeometry(0.075, 0.075, 0.03, seg * 2);
  pad.rotateX(Math.PI / 2);
  pad.translate(0, -0.55, zl - 0.035);
  rubber.push(pad);
  // tripod ayak + teker
  steel.push(ball(hub, 0.05, seg));
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    const fx = Math.cos(a) * 0.95;
    const fz = ZS + Math.sin(a) * 0.95;
    const foot = V(fx, FLOOR + 0.1, fz);
    steel.push(tube(hub, foot, 0.026, seg), ball(foot, 0.03, seg));
    zinc.push(tube(foot, V(fx, FLOOR + 0.065, fz), 0.014, seg));
    const wheel = new THREE.CylinderGeometry(0.052, 0.052, 0.032, seg * 2);
    wheel.rotateZ(Math.PI / 2);
    wheel.rotateY(a);
    wheel.translate(fx, FLOOR + 0.052, fz);
    rubber.push(wheel);
  }
  const g = new THREE.Group();
  const mk = (arr, mat) => {
    const m = new THREE.Mesh(mergeGeometries(arr.map((x) => (x.index ? x.toNonIndexed() : x))), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  mk(steel, new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.42, metalness: 0.35 }));
  mk(rubber, new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.82, metalness: 0 }));
  mk(zinc, new THREE.MeshStandardMaterial({ color: '#b9bec4', roughness: 0.32, metalness: 1 }));
  return g;
}

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Kamera kareleri: panel etrafında (yaw, pitch), mesafe, hedef
export const VIEWS = {
  hero: { yaw: -0.38, pitch: 0.16, dist: 6.4, tx: 0, ty: -0.1, roll: 0.0 },
  dolu: { yaw: 0.05, pitch: 0.5, dist: 5.6, tx: 0, ty: 0.1, roll: 0 },
  pdr: { yaw: -0.22, pitch: 0.12, dist: 4.9, tx: -0.1, ty: 0.12, roll: 0 },
  kaza: { yaw: 0.3, pitch: 0.16, dist: 5.2, tx: -0.2, ty: 0.0, roll: 0 },
  renk: { yaw: 0.22, pitch: 0.1, dist: 4.0, tx: -0.7, ty: 0.05, roll: 0 },
  pasta: { yaw: -0.25, pitch: 0.2, dist: 4.8, tx: -0.2, ty: 0.25, roll: 0 },
  seramik: { yaw: 0.0, pitch: 0.4, dist: 5.2, tx: 0, ty: 0.1, roll: 0 },
  final: { yaw: 0.5, pitch: 0.14, dist: 6.6, tx: 0, ty: -0.15, roll: 0 },
};

export function createWorld(canvas, { phone, low }) {
  const q = pickQuality();
  const lo = q === 'lo' || low;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, low ? 1 : lo ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  scene.environmentIntensity = 1.0;

  const S = {
    yaw: 0, pitch: 0, dist: 6, tx: 0, ty: 0,
    spin: 0, // panelin kendi ekseninde dönüşü
    envRot: 0, // zebra bantlarının akışı
    hit: 0, // dolu: 0..1 (göçükler sırayla oluşur)
    pop: 0, // boyasız göçük: 0..1 (sırayla çıkar)
    crash: 0, // kaza göçüğü derinliği 0..1
    wire: 0, // ölçü ızgarası görünürlüğü
    patch: 0, // zımpara: çıplak sac + macun + kademeli kenar
    primer: 0, // astar
    tape: 0, // maskeleme bandı
    paint: 0, // bant içine boya
    match: 0, // renk eşleşmesi
    haze: 0, // vernik bulanıklığı
    swirl: 0, // hologram/hare
    beads: 0, // seramik damlaları
    sheet: 0, // damlaların akıp gitmesi
    offX: 0, // ekran kaydırma (masaüstünde paneli sağa almak için) -1..1
    offY: 0,
  };

  // --- Işık ve zemin ---------------------------------------------------------------------
  const key = new THREE.DirectionalLight(0xfff6ee, 1.3);
  key.position.set(-2.6, 7.5, 4.2);
  key.target.position.set(0, FLOOR, -0.4);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.radius = lo ? 3 : 5;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 2, far: 18 });
  scene.add(key, key.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: 0x14161c, opacity: 0.26 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = FLOOR;
  ground.receiveShadow = true;
  scene.add(ground);
  // yere temas gölgesi (standın altı)
  {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(12,14,20,.42)');
    g.addColorStop(0.5, 'rgba(12,14,20,.14)');
    g.addColorStop(1, 'rgba(12,14,20,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(0, FLOOR + 0.002, -0.6);
    scene.add(blob);
  }

  // --- Panel malzemesi -------------------------------------------------------------------
  const flake = flakeTexture(lo ? 128 : 256);
  const U = {
    uDents: { value: Array.from({ length: NDENT }, () => new THREE.Vector4()) },
    uColA: { value: new THREE.Color('#2a0bd6') }, // yüz: derin mor
    uColB: { value: new THREE.Color('#00a58d') }, // yan: petrol yeşili
    uColC: { value: new THREE.Color('#f0a216') }, // sıyırma: altın
    uOffA: { value: new THREE.Color('#5a1296') }, // tutmayan karışım: kırmızıya kaçan mor
    uOffB: { value: new THREE.Color('#1c6f9a') }, // ve maviye kaçan petrol
    uC: { value: new THREE.Vector2(CRASH.x, CRASH.y) },
    uPatch: { value: 0 },
    uPrimer: { value: 0 },
    uTape: { value: 0 },
    uPaint: { value: 0 },
    uMatch: { value: 0 },
    uHaze: { value: 0 },
    uSwirl: { value: 0 },
    uSwirlC: { value: new THREE.Vector2(-0.25, 0.45) },
    uFlake: { value: flake },
    uFlakeK: { value: lo ? 2.6 : 2.2 },
    uFlakeAmt: { value: 0.22 },
    uPeel: { value: 0.012 },
  };
  const mat = makePaint(U);
  const flangeMat = makePaint(U, { flange: true });

  const geo = panelGeometry(lo ? 170 : 260, lo ? 100 : 150);
  const panel = new THREE.Mesh(geo, mat);
  panel.castShadow = true;
  panel.receiveShadow = true;
  const flange = new THREE.Mesh(flangeGeometry(lo), flangeMat);
  flange.castShadow = true;
  const rig = new THREE.Group();
  rig.add(panel, flange, buildStand(lo));
  scene.add(rig);

  // --- Ölçü ızgarası (aynı göçük hesabıyla, yüzeye yapışık lazer çizgileri) ------------------
  const wireUni = { uDents: U.uDents, uWire: { value: 0 } };
  const wireMat = new THREE.ShaderMaterial({
    uniforms: wireUni,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${DENT_GLSL}
      attribute vec3 aN;
      varying vec2 vP;
      void main() {
        vec2 g; float h = dentH(position.xy, g);
        vP = position.xy;
        vec3 p = position + aN * (h + 0.005);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uWire;
      varying vec2 vP;
      void main() {
        float edge = smoothstep(1.75, 1.2, abs(vP.x)) * smoothstep(1.05, 0.7, abs(vP.y));
        gl_FragColor = vec4(0.25, 1.0, 0.82, uWire * (0.3 + 0.55 * edge));
      }`,
  });
  {
    const pts = [];
    const nrm = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const add = (x, y) => {
      surf(x, y, p);
      surfNormal(x, y, n);
      pts.push(p.x, p.y, p.z);
      nrm.push(n.x, n.y, n.z);
    };
    const seg = (x0, y0, x1, y1) => {
      if (!inside(x0, y0, 0.012) || !inside(x1, y1, 0.012)) return;
      add(x0, y0);
      add(x1, y1);
    };
    const NX = 26;
    const NY = 16;
    const RES = 70;
    for (let i = 1; i < NX; i++) {
      const x = XL + (PW * i) / NX;
      for (let j = 0; j < RES; j++) seg(x, -PH / 2 + (PH * j) / RES, x, -PH / 2 + (PH * (j + 1)) / RES);
    }
    for (let i = 1; i < NY; i++) {
      const y = -PH / 2 + (PH * i) / NY;
      for (let j = 0; j < RES; j++) seg(XL + (PW * j) / RES, y, XL + (PW * (j + 1)) / RES, y);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    lg.setAttribute('aN', new THREE.Float32BufferAttribute(nrm, 3));
    const wire = new THREE.LineSegments(lg, wireMat);
    wire.renderOrder = 2;
    rig.add(wire);
  }

  // --- Dolu taneleri (buz) ----------------------------------------------------------------
  const iceMat = lo
    ? new THREE.MeshPhysicalMaterial({ color: '#e6f1ff', roughness: 0.12, metalness: 0, transparent: true, opacity: 0.85, ior: 1.31 })
    : new THREE.MeshPhysicalMaterial({ color: '#f2f8ff', roughness: 0.18, metalness: 0, transmission: 0.85, thickness: 0.06, ior: 1.31 });
  const ice = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 2), iceMat, HAIL.length);
  ice.frustumCulled = false;
  ice.castShadow = true;
  rig.add(ice);

  // --- Seramik damlaları (su) ---------------------------------------------------------------
  const NB = lo ? 90 : 170;
  const beadMat = lo
    ? new THREE.MeshPhysicalMaterial({ color: '#dfe6ee', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.55, ior: 1.33, specularIntensity: 1, clearcoat: 1 })
    : new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, metalness: 0, transmission: 1, thickness: 0.035, ior: 1.33 });
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, lo ? 12 : 18, lo ? 6 : 9, 0, Math.PI * 2, 0, Math.PI / 2), beadMat, NB);
  beads.frustumCulled = false;
  rig.add(beads);
  const BEADS = (() => {
    const r = rng(5);
    const out = [];
    let guard = 0;
    while (out.length < NB && guard++ < 20000) {
      const x = (r() - 0.5) * PW * 0.96;
      const y = (r() - 0.5) * PH * 0.96;
      if (!inside(x, y, 0.03)) continue;
      out.push({ x, y, r: 0.02 + Math.pow(r(), 2.0) * 0.055, t: r() * 0.7, v: 0.5 + r() * 0.9 });
    }
    return out;
  })();

  const m4 = new THREE.Matrix4();
  const qq = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pv = new THREE.Vector3();
  const nv = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  let iceDirty = true;
  let beadDirty = true;
  function updateInstances() {
    const hailOn = S.hit > 0 && S.hit < 1;
    if (hailOn || iceDirty) {
      iceDirty = hailOn;
      for (let i = 0; i < HAIL.length; i++) {
        const h = HAIL[i];
        const k = (S.hit - h.t * 0.85) / 0.07; // 0 = çarpma anı
        if (!hailOn || k < -1.6 || k > 1.2) {
          ice.setMatrixAt(i, ZERO);
          continue;
        }
        surf(h.x, h.y, pv);
        surfNormal(h.x, h.y, nv);
        const off = k < 0 ? -k * 2.4 : k * 0.9; // düşüş, sonra sekme
        pv.addScaledVector(nv, off + 0.045);
        if (k > 0) pv.x += k * 0.35;
        const s = k > 0 ? Math.max(0, 1 - k) : 1;
        m4.makeScale(s, s, s).setPosition(pv);
        ice.setMatrixAt(i, m4);
      }
      ice.instanceMatrix.needsUpdate = true;
    }
    const on = S.beads > 0.001;
    if (on || beadDirty) {
      beadDirty = on;
      beads.visible = on;
      for (let i = 0; i < BEADS.length; i++) {
        const b = BEADS[i];
        if (!on) {
          beads.setMatrixAt(i, ZERO);
          continue;
        }
        const grow = smooth(b.t, b.t + 0.3, S.beads);
        const y = b.y - S.sheet * S.sheet * b.v * 3.2;
        const fade = inside(b.x, y, b.r * 0.6) ? smooth(yBot(b.x) - 0.02, yBot(b.x) + 0.25, y) : 0;
        const s = b.r * grow * fade;
        if (s < 0.0005) {
          beads.setMatrixAt(i, ZERO);
          continue;
        }
        surf(b.x, y, pv);
        surfNormal(b.x, y, nv);
        qq.setFromUnitVectors(up, nv);
        const stretch = 1 + S.sheet * 1.2;
        sc.set(s, s * 0.6, s * stretch);
        m4.compose(pv, qq, sc);
        beads.setMatrixAt(i, m4);
      }
      beads.instanceMatrix.needsUpdate = true;
    }
  }

  function updateDents() {
    const u = U.uDents.value;
    HAIL.forEach((h, i) => {
      const made = smooth(h.t * 0.85, h.t * 0.85 + 0.035, S.hit);
      const gone = smooth(h.p * 0.82, h.p * 0.82 + 0.12, S.pop);
      u[i].set(h.x, h.y, 1 / (h.s * h.s), h.d * made * (1 - gone));
    });
    u[HAIL.length].set(CRASH.x, CRASH.y, 1 / (CRASH.s * CRASH.s), CRASH.d * S.crash);
  }

  // --- Ortam (asenkron) -------------------------------------------------------------------
  let ready = false;
  const whenReady = buildEnv(renderer, lo ? 'lo' : 'hi')
    .then((env) => {
      scene.environment = env;
    })
    .catch((e) => console.warn('boya: ortam kurulamadı', e))
    .then(async () => {
      try {
        await renderer.compileAsync(scene, camera);
      } catch (_) {}
      ready = true;
    });

  // --- Görünüm --------------------------------------------------------------------------
  let W = 1;
  let H = 1;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  // Telefonda göçük itme karesi metnin üstüne taşmasın: biraz geri çekil
  const V = phone
    ? { ...VIEWS, hero: { ...VIEWS.hero, dist: 8.4 }, seramik: { ...VIEWS.seramik, dist: 8.4 }, pdr: { ...VIEWS.pdr, dist: 6.0, pitch: 0.28 }, renk: { ...VIEWS.renk, dist: 3.3, tx: -0.8 } }
    : VIEWS;
  const cur = { ...VIEWS.hero };
  const goal = { ...VIEWS.hero };
  function view(name, t = 1, from) {
    const a = V[from || name];
    const b = V[name];
    for (const k in b) goal[k] = lerp(a[k], b[k], t);
  }
  function snap() {
    Object.assign(cur, goal);
  }

  const tgt = new THREE.Vector3();
  function place() {
    for (const k in goal) cur[k] += (goal[k] - cur[k]) * 0.12;
    const aspect = W / H;
    const fit = aspect < 1 ? Math.min(2.8, 1.12 / aspect) : aspect < 1.3 ? 1.7 : 1.42;
    const d = cur.dist * fit;
    tgt.set(cur.tx, cur.ty, 0);
    camera.position.set(
      tgt.x + Math.sin(cur.yaw) * Math.cos(cur.pitch) * d,
      tgt.y + Math.sin(cur.pitch) * d,
      tgt.z + Math.cos(cur.yaw) * Math.cos(cur.pitch) * d,
    );
    camera.lookAt(tgt);
    camera.setViewOffset(W, H, -S.offX * W * 0.25, -S.offY * H * 0.25, W, H);
    rig.rotation.y = S.spin;
    scene.environmentRotation.set(S.envRot, 0, 0);
  }

  function render() {
    updateDents();
    updateInstances();
    U.uPatch.value = S.patch;
    U.uPrimer.value = S.primer;
    U.uTape.value = S.tape;
    U.uPaint.value = S.paint;
    U.uMatch.value = S.match;
    U.uHaze.value = S.haze;
    U.uSwirl.value = S.swirl;
    wireUni.uWire.value = S.wire;
    place();
    renderer.render(scene, camera);
  }

  // Panel üzerindeki bir noktanın ekran konumu (ölçü etiketleri için)
  const pj = new THREE.Vector3();
  const nj = new THREE.Vector3();
  function project(x, y, lift = 0) {
    surf(x, y, pj);
    surfNormal(x, y, nj);
    pj.addScaledVector(nj, lift);
    rig.localToWorld(pj);
    pj.project(camera);
    return { x: (pj.x * 0.5 + 0.5) * W, y: (-pj.y * 0.5 + 0.5) * H };
  }

  return { S, render, resize, view, snap, project, HAIL, whenReady, isReady: () => ready, quality: lo ? 'lo' : 'hi' };
}
