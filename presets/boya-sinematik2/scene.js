// Yansıma 3D sahnesi: bukalemun boyalı kavisli numune panel, üstünde zebra ışık tahtasının yansıması.
// Dolu göçükleri → boyasız göçük düzeltme → kaza göçüğü + ölçü ızgarası → astar yaması → renk eşleme
// → hare/hologram → pasta → seramik damlaları. Dışarıya tek bir durum nesnesi `S` açar.
import * as THREE from 'three';

export const PW = 3.4; // panel genişliği (dünya birimi)
export const PH = 2.0;
const Y0 = 0.22; // karakter çizgisi (kırım) yüksekliği

// Panel yüzeyi: yatayda kavisli, karakter çizgisinin üstü daha dik kırılır.
function surf(x, y, out = new THREE.Vector3()) {
  const dy = y - Y0;
  const k = dy > 0 ? 0.62 : 0.1;
  const z = -0.15 * x * x - k * dy * dy + 0.04 * x * dy;
  return out.set(x, y, z);
}
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

export const ARCH = { x: 0.95, y: -1.12, r: 0.66 };
const inArch = (x, y, pad = 0) => Math.hypot(x - ARCH.x, y - ARCH.y) < ARCH.r + pad;

// Dolu göçükleri (sabit tohum, her açılışta aynı yer)
const HAIL = (() => {
  const r = rng(11);
  const out = [];
  while (out.length < 12) {
    const x = (r() - 0.5) * PW * 0.8;
    const y = (r() - 0.5) * PH * 0.72 + 0.1;
    if (inArch(x, y, 0.18) || out.some((o) => Math.hypot(o.x - x, o.y - y) < 0.42)) continue;
    out.push({ x, y, s: 0.075 + r() * 0.05, d: 0.032 + r() * 0.02, t: out.length / 12, p: r() });
  }
  out.sort((a, b) => a.p - b.p).forEach((o, i) => (o.p = i / 12));
  return out;
})();
export const CRASH = { x: -0.25, y: -0.3, s: 0.5, d: 0.16 };
export const PINS = [
  { x: -0.25, y: -0.3, mm: 6.4 },
  { x: -0.95, y: -0.52, mm: 2.1 },
  { x: 1.2, y: 0.42, mm: 3.8 },
];
const NDENT = HAIL.length + 1;

const DENT_GLSL = /* glsl */ `
uniform vec4 uDents[${NDENT}];
varying vec2 vP;
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

function panelGeometry(sx, sy) {
  const g = new THREE.PlaneGeometry(PW, PH, sx, sy);
  const pos = g.attributes.position;
  const n = pos.count;
  const tx = new Float32Array(n * 3);
  const ty = new Float32Array(n * 3);
  const p = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    surf(x, y, p);
    pos.setXYZ(i, p.x, p.y, p.z);
    tangents(x, y, a, b);
    a.toArray(tx, i * 3);
    b.toArray(ty, i * 3);
  }
  g.setAttribute('aTx', new THREE.BufferAttribute(tx, 3));
  g.setAttribute('aTy', new THREE.BufferAttribute(ty, 3));
  g.computeVertexNormals();
  return g;
}

// Zebra ışık tahtası: eşdikdörtgen ortam dokusu, yatay siyah-beyaz bantlar
function stripeEnv(w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = w / 2;
  const x = c.getContext('2d');
  const H = c.height;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e4e6ea');
  g.addColorStop(0.55, '#c9ccd3');
  g.addColorStop(0.72, '#7d808a');
  g.addColorStop(1, '#2b2d33');
  x.fillStyle = g;
  x.fillRect(0, 0, w, H);
  // bantlar: enlem ~ +62° ile −12° arası
  const top = H * 0.155;
  const bot = H * 0.72;
  const n = 19;
  const step = (bot - top) / n;
  for (let i = 0; i < n; i++) {
    const y0 = top + i * step;
    x.fillStyle = '#ffffff';
    x.fillRect(0, y0, w, step * 0.52);
    x.fillStyle = '#07070a';
    x.fillRect(0, y0 + step * 0.52, w, step * 0.48);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(10,10,20,.55)');
  g.addColorStop(0.55, 'rgba(10,10,20,.18)');
  g.addColorStop(1, 'rgba(10,10,20,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Kamera kareleri: panel etrafında (yaw, pitch), mesafe, hedef, panel dönüşü
export const VIEWS = {
  hero: { yaw: -0.38, pitch: 0.2, dist: 6.4, tx: 0, ty: 0.05, roll: 0.0 },
  dolu: { yaw: 0.05, pitch: 0.55, dist: 5.6, tx: 0, ty: 0.15, roll: 0 },
  pdr: { yaw: -0.22, pitch: 0.12, dist: 4.9, tx: -0.1, ty: 0.12, roll: 0 },
  kaza: { yaw: 0.32, pitch: 0.18, dist: 5.4, tx: 0.3, ty: -0.2, roll: 0 },
  renk: { yaw: 0.2, pitch: 0.08, dist: 4.6, tx: -0.25, ty: -0.2, roll: 0 },
  pasta: { yaw: -0.25, pitch: 0.22, dist: 4.8, tx: -0.3, ty: 0.2, roll: 0 },
  seramik: { yaw: 0.0, pitch: 0.42, dist: 5.2, tx: 0, ty: 0.1, roll: 0 },
  final: { yaw: 0.5, pitch: 0.16, dist: 6.2, tx: 0, ty: 0.05, roll: 0 },
};

export function createWorld(canvas, { phone, low }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, low ? 1 : phone ? 1.3 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = stripeEnv(low ? 1024 : 2048);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();
  scene.environmentIntensity = 1.15;

  const S = {
    yaw: 0, pitch: 0, dist: 6, tx: 0, ty: 0, // kamera (view() doldurur)
    spin: 0, // panelin kendi ekseninde dönüşü
    envRot: 0, // zebra bantlarının akışı
    hit: 0, // dolu: 0..1 (göçükler sırayla oluşur)
    pop: 0, // boyasız göçük: 0..1 (sırayla çıkar)
    crash: 0, // kaza göçüğü derinliği 0..1
    wire: 0, // ölçü ızgarası görünürlüğü
    patch: 0, // astar yaması (0 yok, 1 var)
    paint: 0, // yamaya boya
    match: 0, // renk eşleşmesi
    haze: 0, // vernik bulanıklığı
    swirl: 0, // hologram/hare
    beads: 0, // seramik damlaları
    sheet: 0, // damlaların akıp gitmesi
    offX: 0, // ekran kaydırma (masaüstünde paneli sağa almak için) -1..1
    offY: 0,
  };

  // --- Panel malzemesi ------------------------------------------------------------------
  const uniforms = {
    uDents: { value: Array.from({ length: NDENT }, () => new THREE.Vector4()) },
    uColA: { value: new THREE.Color('#3a14ff') }, // yüz: derin mor
    uColB: { value: new THREE.Color('#00b89c') }, // yan: petrol yeşili
    uColC: { value: new THREE.Color('#ffb21e') }, // sıyırma: altın
    uOff: { value: new THREE.Color('#7340c0') },
    uPatch: { value: new THREE.Vector4(CRASH.x, CRASH.y, 0.62, 0) },
    uPaint: { value: 0 },
    uMatch: { value: 0 },
    uHaze: { value: 0 },
    uSwirl: { value: 0 },
    uSwirlC: { value: new THREE.Vector2(-0.35, 0.35) },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.55, roughness: 0.32,
    clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec3 aTx;\nattribute vec3 aTy;\n${DENT_GLSL}`)
      .replace('#include <beginnormal_vertex>', `
        vec2 dG; float dH = dentH(position.xy, dG);
        vec3 objectNormal = normalize(normal - dG.x * aTx - dG.y * aTy);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = position + normal * dH; vP = position.xy;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vP;
        uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform vec3 uOff;
        uniform vec4 uPatch; uniform float uPaint; uniform float uMatch; uniform float uHaze;
        uniform float uSwirl; uniform vec2 uSwirlC;
        float primerK = 0.0;
        float archD(vec2 p) { return length(p - vec2(${ARCH.x.toFixed(3)}, ${ARCH.y.toFixed(3)})) - ${ARCH.r.toFixed(3)}; }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (archD(vP) < 0.0) discard;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 vd = normalize(vViewPosition);
          float fac = clamp(abs(dot(normal, vd)), 0.0, 1.0);
          vec3 flip = mix(uColB, uColA, smoothstep(0.5, 0.98, fac));
          flip = mix(flip, uColC, pow(1.0 - fac, 2.6) * 0.9);
          float pd = length(vP - uPatch.xy) + sin(vP.x * 7.0 + 1.3) * sin(vP.y * 9.0) * 0.06;
          float pm = (1.0 - smoothstep(uPatch.z - 0.05, uPatch.z + 0.05, pd)) * uPatch.w;
          vec3 pc = mix(vec3(0.46, 0.47, 0.49), mix(uOff, flip, uMatch), uPaint);
          diffuseColor.rgb = mix(flip, pc, pm);
          primerK = pm * (1.0 - uPaint);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float ex = ${(PW/2).toFixed(3)} - abs(vP.x);
          float ey = ${(PH/2).toFixed(3)} - abs(vP.y);
          float rim = 1.0 - smoothstep(0.004, 0.018, min(min(ex, ey), archD(vP)));
          totalEmissiveRadiance += vec3(0.95, 0.96, 1.0) * rim * 0.55;
        }
        if (uSwirl > 0.001) {
          vec2 sp = vP - uSwirlC;
          float r = length(sp);
          float a = atan(sp.y, sp.x);
          float rings = pow(abs(sin(r * 45.0 + sin(a * 7.0 + r * 13.0) * 3.0)), 40.0);
          float arc = pow(max(0.0, cos(a * 2.0 - 0.6)), 2.0);
          float fall = exp(-r * r * 1.4) * smoothstep(0.03, 0.2, r);
          vec3 rb = 0.55 + 0.45 * cos(6.2831 * (a / 6.2831 + vec3(0.0, 0.33, 0.67)));
          totalEmissiveRadiance += mix(vec3(1.0), rb, 0.6) * rings * fall * (0.08 + arc) * uSwirl * 1.5;
        }`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.roughness = mix(material.roughness, 0.9, primerK);
        material.clearcoat = mix(material.clearcoat, 0.0, primerK);
        material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.42, uHaze);`);
  };

  const phoneSeg = phone || low;
  const geo = panelGeometry(phoneSeg ? 170 : 240, phoneSeg ? 100 : 140);
  const panel = new THREE.Mesh(geo, mat);
  const rig = new THREE.Group();
  rig.add(panel);
  scene.add(rig);

  // Gölge lekesi
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(PW * 1.5, PH * 0.9),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0, -PH / 2 - 0.35, -0.5);
  scene.add(blob);

  // --- Ölçü ızgarası (aynı göçük hesabıyla çizgi) ---------------------------------------
  const wireUni = { uDents: uniforms.uDents, uWire: { value: 0 } };
  const wireMat = new THREE.ShaderMaterial({
    uniforms: wireUni,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${DENT_GLSL}
      attribute vec3 aN;
      void main() {
        vec2 g; float h = dentH(position.xy, g);
        vP = position.xy;
        vec3 p = position + aN * (h + 0.006);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uWire;
      varying vec2 vP;
      void main() {
        if (length(vP - vec2(${ARCH.x.toFixed(3)}, ${ARCH.y.toFixed(3)})) < ${ARCH.r.toFixed(3)}) discard;
        float edge = smoothstep(1.75, 1.2, abs(vP.x)) * smoothstep(1.05, 0.7, abs(vP.y));
        gl_FragColor = vec4(0.36, 1.0, 0.86, uWire * (0.35 + 0.65 * edge));
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
    const NX = 24;
    const NY = 14;
    const RES = 60;
    for (let i = 0; i <= NX; i++) {
      const x = -PW / 2 + (PW * i) / NX;
      for (let j = 0; j < RES; j++) {
        add(x, -PH / 2 + (PH * j) / RES);
        add(x, -PH / 2 + (PH * (j + 1)) / RES);
      }
    }
    for (let i = 0; i <= NY; i++) {
      const y = -PH / 2 + (PH * i) / NY;
      for (let j = 0; j < RES; j++) {
        add(-PW / 2 + (PW * j) / RES, y);
        add(-PW / 2 + (PW * (j + 1)) / RES, y);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    lg.setAttribute('aN', new THREE.Float32BufferAttribute(nrm, 3));
    const wire = new THREE.LineSegments(lg, wireMat);
    wire.renderOrder = 2;
    rig.add(wire);
  }

  // --- Dolu taneleri --------------------------------------------------------------------
  const iceMat = new THREE.MeshPhysicalMaterial({ color: '#eef6ff', roughness: 0.08, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.92 });
  const ice = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.045, 2), iceMat, HAIL.length);
  ice.frustumCulled = false;
  rig.add(ice);

  // --- Seramik damlaları ----------------------------------------------------------------
  const NB = low ? 70 : phone ? 110 : 180;
  const beadMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.0, metalness: 0.0, clearcoat: 1, transmission: 0, transparent: true, opacity: 0.82,
  });
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), beadMat, NB);
  beads.frustumCulled = false;
  rig.add(beads);
  const BEADS = (() => {
    const r = rng(5);
    return Array.from({ length: NB }, () => ({
      x: (r() - 0.5) * PW * 0.94,
      y: (r() - 0.5) * PH * 0.94,
      r: 0.022 + Math.pow(r(), 2.0) * 0.06,
      t: r() * 0.7,
      v: 0.5 + r() * 0.9,
    }));
  })();

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pv = new THREE.Vector3();
  const nv = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  function updateInstances() {
    // dolu
    for (let i = 0; i < HAIL.length; i++) {
      const h = HAIL[i];
      const k = (S.hit - h.t * 0.85) / 0.07; // 0 = çarpma anı
      if (k < -1.6 || k > 1.2 || S.hit <= 0 || S.hit >= 1) {
        ice.setMatrixAt(i, ZERO);
        continue;
      }
      surf(h.x, h.y, pv);
      surfNormal(h.x, h.y, nv);
      const off = k < 0 ? -k * 2.4 : k * 0.9; // düşüş, sonra sekme
      pv.addScaledVector(nv, off + 0.04);
      if (k > 0) pv.x += k * 0.35;
      const s = k > 0 ? Math.max(0, 1 - k) : 1;
      m4.makeScale(s, s, s).setPosition(pv);
      ice.setMatrixAt(i, m4);
    }
    ice.instanceMatrix.needsUpdate = true;
    // damlalar
    const on = S.beads > 0.001;
    for (let i = 0; i < NB; i++) {
      const b = BEADS[i];
      if (!on) {
        beads.setMatrixAt(i, ZERO);
        continue;
      }
      const grow = smooth(b.t, b.t + 0.3, S.beads);
      const y = b.y - S.sheet * S.sheet * b.v * 3.2;
      const fade = smooth(-PH / 2 - 0.02, -PH / 2 + 0.25, y);
      const s = inArch(b.x, y, b.r) ? 0 : b.r * grow * fade;
      if (s < 0.0005) {
        beads.setMatrixAt(i, ZERO);
        continue;
      }
      surf(b.x, y, pv);
      surfNormal(b.x, y, nv);
      q.setFromUnitVectors(up, nv);
      const stretch = 1 + S.sheet * 1.2;
      sc.set(s, s * 0.65, s * stretch);
      m4.compose(pv, q, sc);
      beads.setMatrixAt(i, m4);
    }
    beads.instanceMatrix.needsUpdate = true;
  }

  function updateDents() {
    const u = uniforms.uDents.value;
    HAIL.forEach((h, i) => {
      const made = smooth(h.t * 0.85, h.t * 0.85 + 0.035, S.hit);
      const gone = smooth(h.p * 0.82, h.p * 0.82 + 0.12, S.pop);
      u[i].set(h.x, h.y, 1 / (h.s * h.s), h.d * made * (1 - gone));
    });
    u[HAIL.length].set(CRASH.x, CRASH.y, 1 / (CRASH.s * CRASH.s), CRASH.d * S.crash);
  }

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

  const cur = { ...VIEWS.hero };
  const goal = { ...VIEWS.hero };
  function view(name, t = 1, from) {
    const a = VIEWS[from || name];
    const b = VIEWS[name];
    for (const k in b) goal[k] = lerp(a[k], b[k], t);
  }
  function snap() {
    Object.assign(cur, goal);
  }

  const tgt = new THREE.Vector3();
  function place() {
    for (const k in goal) cur[k] += (goal[k] - cur[k]) * 0.12;
    const aspect = W / H;
    // Dikey ekranda paneli sığdır
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
    uniforms.uPatch.value.w = S.patch;
    uniforms.uPaint.value = S.paint;
    uniforms.uMatch.value = S.match;
    uniforms.uHaze.value = S.haze;
    uniforms.uSwirl.value = S.swirl;
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

  return { S, render, resize, view, snap, project, HAIL };
}
