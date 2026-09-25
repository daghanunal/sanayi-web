// Kodla çizilmiş turbo: kompresör gövdesi (soğuk taraf, +x), yatak gövdesi, türbin gövdesi
// (sıcak taraf, -x), mil + iki çark, VNT kanat halkası, yağ besleme/dönüş hattı ve hava akışı.
// Sahne durumu dışarıdan `update(state)` ile verilir; bu dosya yalnızca çizer.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

// Eksen boyunca döndürülmüş lathe: profil [yarıçap, x] çiftleri
function lathe(profile, seg = 48) {
  const g = new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), seg);
  g.rotateZ(-Math.PI / 2); // lathe y ekseni → dünya x ekseni
  return g;
}

// Salyangoz gövde: x = xc düzleminde büyüyen spiral boru + teğet çıkış borusu
function volute({ xc, dir, phi0, R0, R1, r0, r1, out, outR, seg = 72, rad = 20 }) {
  const rings = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const psi = phi0 + dir * u * TAU;
    const R = R0 + (R1 - R0) * u;
    const r = r0 + (r1 - r0) * Math.pow(u, 0.9);
    const c = V(xc, R * Math.cos(psi), R * Math.sin(psi));
    const radial = V(0, Math.cos(psi), Math.sin(psi));
    rings.push({ c, a: radial, b: V(1, 0, 0), r, u: u * 0.8 });
  }
  const end = rings.at(-1);
  const psiE = phi0 + dir * TAU;
  const tan = V(0, -Math.sin(psiE), Math.cos(psiE)).multiplyScalar(dir);
  const n2 = 10;
  for (let i = 1; i <= n2; i++) {
    const k = i / n2;
    const c = end.c.clone().addScaledVector(tan, k * out).addScaledVector(end.a, -k * (end.r - outR) * 0.2);
    rings.push({ c, a: end.a, b: end.b, r: end.r + (outR - end.r) * Math.min(1, k * 2), u: 0.8 + k * 0.2 });
  }
  const pos = [], uv = [], idx = [];
  rings.forEach((ring, i) => {
    for (let j = 0; j <= rad; j++) {
      const al = (j / rad) * TAU;
      const p = ring.c.clone().addScaledVector(ring.a, Math.cos(al) * ring.r).addScaledVector(ring.b, Math.sin(al) * ring.r);
      pos.push(p.x, p.y, p.z);
      uv.push(ring.u, j / rad);
    }
    if (i > 0) {
      for (let j = 0; j < rad; j++) {
        const a = (i - 1) * (rad + 1) + j, b = i * (rad + 1) + j;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, endC: rings.at(-1).c.clone(), tan, endR: outR };
}

// Çark kanadı: s eksen boyunca, t göbekten uca; konum fonksiyonu dışarıdan
function blade(fn, sN = 16, tN = 5, sMax = 1) {
  const pos = [], idx = [];
  for (let i = 0; i <= sN; i++) {
    for (let j = 0; j <= tN; j++) {
      const p = fn((i / sN) * sMax, j / tN);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < sN; i++) {
    for (let j = 0; j < tN; j++) {
      const a = i * (tN + 1) + j, b = (i + 1) * (tN + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function mergeRotated(geo, n, extra = []) {
  // Aynı kanadı eksen etrafında n kez çoğalt (tek draw call)
  const parts = [];
  for (let k = 0; k < n; k++) {
    const c = geo.clone();
    c.rotateX((k / n) * TAU);
    parts.push(c);
  }
  return mergeGeos([...parts, ...extra]);
}
function mergeGeos(list) {
  let total = 0;
  list.forEach((g) => (total += g.attributes.position.count));
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  const idx = [];
  let off = 0;
  for (const g of list) {
    const gi = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
    pos.set(g.attributes.position.array, off * 3);
    nor.set(g.attributes.normal.array, off * 3);
    for (let i = 0; i < gi.length; i++) idx.push(gi[i] + off);
    off += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setIndex(idx);
  return m;
}

// Isı haritası: u=1 ucu (egzoz girişi) daha sıcak, döküm pürüzü
function heatTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 64);
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 64; j++) {
      const u = i / 255;
      const band = 0.4 + 0.6 * Math.sin((j / 63) * Math.PI);
      const n = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(i * 0.21 + Math.sin(j * 0.37) * 3) * Math.sin(j * 0.29 + i * 0.05));
      const h = clamp(Math.pow(clamp((0.1 + u * 0.95) * band * n * 1.25), 1.8));
      const k = (j * 256 + i) * 4;
      img.data[k] = 255 * h;
      img.data[k + 1] = 150 * h * h;
      img.data[k + 2] = 60 * h * h * h;
      img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kum döküm alüminyum pürüzü: pürüzlülük + kabartma haritası
function castTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const px = i % 256, py = (i / 256) | 0;
    const v = 150 + Math.random() * 70 + 25 * Math.sin(px * 0.09 + Math.sin(py * 0.05) * 2) * Math.sin(py * 0.07);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = clamp(v / 255) * 255;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  scene.add(new THREE.HemisphereLight(0xb8d8ff, 0x140d0a, 0.5));
  const cold = new THREE.DirectionalLight(0x9fdcff, 2.2);
  cold.position.set(6, 3, 4);
  scene.add(cold);
  const warm = new THREE.DirectionalLight(0xffb27a, 1.4);
  warm.position.set(-6, 4, 3);
  scene.add(warm);
  const top = new THREE.DirectionalLight(0xffffff, 0.8);
  top.position.set(0, 8, -2);
  scene.add(top);
  const ember = new THREE.PointLight(0xff5a1a, 0, 6, 1.5);
  ember.position.set(-1.6, 0.2, 0.9);
  scene.add(ember);

  // --- Malzemeler -----------------------------------------------------------
  const cast = castTexture();
  const alu = new THREE.MeshStandardMaterial({ color: 0xaeb7c1, metalness: 1, roughness: 0.5, roughnessMap: cast, bumpMap: cast, bumpScale: 0.6, side: THREE.DoubleSide });
  const aluBright = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.2, side: THREE.DoubleSide });
  const heatMap = heatTexture();
  const iron = new THREE.MeshStandardMaterial({
    color: 0x3a3634, metalness: 0.75, roughness: 0.6, side: THREE.DoubleSide,
    emissive: 0xffffff, emissiveMap: heatMap, emissiveIntensity: 0,
  });
  const inconel = new THREE.MeshStandardMaterial({
    color: 0x9a918a, metalness: 1, roughness: 0.3, side: THREE.DoubleSide,
    emissive: 0xff6a20, emissiveIntensity: 0,
  });
  const chra = new THREE.MeshStandardMaterial({ color: 0x6d737c, metalness: 0.85, roughness: 0.48, side: THREE.DoubleSide });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.8, roughness: 0.45 });
  const vaneMat = new THREE.MeshStandardMaterial({ color: 0xa8b4c0, metalness: 1, roughness: 0.25, emissive: 0x2a8fd0, emissiveIntensity: 0 });

  const root = new THREE.Group();
  scene.add(root);

  // --- Rotor: mil + türbin çarkı (bir parça), kompresör çarkı ----------------
  const rotor = new THREE.Group();
  root.add(rotor);
  const rotorT = new THREE.Group();
  const rotorC = new THREE.Group();
  rotor.add(rotorT, rotorC);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.5, 16).rotateZ(Math.PI / 2).translate(0.1, 0, 0), aluBright);
  rotorT.add(shaft);

  const cHub = lathe([[0, 0.46], [0.9, 0.46], [0.93, 0.5], [0.72, 0.55], [0.46, 0.64], [0.31, 0.78], [0.22, 0.97], [0.18, 1.14], [0.12, 1.21], [0, 1.23]], lite ? 36 : 48);
  const cBlade = (sMax) => blade((s, t) => {
    const rh = 0.18 + 0.72 * Math.pow(1 - s, 2.2);
    const rt = 0.95 - 0.37 * Math.pow(s, 0.7);
    const r = rh + (rt - rh) * t;
    const th = 1.2 * s * s - 0.35 * t * Math.pow(1 - s, 3);
    return V(0.5 + 0.7 * s, r * Math.cos(th), r * Math.sin(th));
  }, lite ? 12 : 16, 5, sMax);
  const cFull = cBlade(1);
  const cSplit = cBlade(0.6);
  cSplit.rotateX(TAU / 14);
  const cWheel = new THREE.Mesh(mergeRotated(cFull, 7, []), aluBright);
  const cWheel2 = new THREE.Mesh(mergeRotated(cSplit, 7, []), aluBright);
  const cHubM = new THREE.Mesh(cHub, aluBright);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6).rotateZ(Math.PI / 2).translate(1.28, 0, 0), darkSteel);
  rotorC.add(cWheel, cWheel2, cHubM, nut);

  const tHub = lathe([[0, -0.46], [0.8, -0.46], [0.8, -0.5], [0.52, -0.58], [0.31, -0.74], [0.2, -0.94], [0.16, -1.09], [0, -1.11]], lite ? 36 : 48);
  const tBlade = blade((s, t) => {
    const rh = 0.16 + 0.62 * Math.pow(1 - s, 2);
    const rt = 0.8 - 0.24 * s;
    const r = rh + (rt - rh) * t;
    const th = -0.95 * Math.pow(s, 2.5) * (0.4 + 0.6 * t);
    return V(-0.5 - 0.6 * s, r * Math.cos(th), r * Math.sin(th));
  }, lite ? 10 : 14, 5);
  const tWheel = new THREE.Mesh(mergeRotated(tBlade, 11, []), inconel);
  const tHubM = new THREE.Mesh(tHub, inconel);
  rotorT.add(tWheel, tHubM);

  // Balans halkaları (yalnız balans bölümünde)
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.008, 6, 96).rotateY(Math.PI / 2), ringMat);
  const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.008, 6, 96).rotateY(Math.PI / 2), ringMat);
  const ringC2 = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.005, 6, 96).rotateY(Math.PI / 2), ringMat);
  root.add(ringC, ringT, ringC2);

  // Hız bulanıklığı diski (çark çok hızlı dönerken)
  const blurMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uAlpha; uniform float uTime;
      void main(){ vec2 p = vUv*2.-1.; float r = length(p); if (r>1.) discard;
        float a = atan(p.y,p.x);
        float streak = .5+.5*sin(a*7.+uTime*3.+r*9.);
        float body = smoothstep(1.,.86,r)*smoothstep(.12,.3,r);
        vec3 c = mix(vec3(.72,.8,.88), vec3(.95,.98,1.), streak*.6);
        gl_FragColor = vec4(c, body*(.55+.25*streak)*uAlpha); }`,
  });
  const blurDisc = new THREE.Mesh(new THREE.CircleGeometry(0.97, 48).rotateY(Math.PI / 2), blurMat);
  blurDisc.position.x = 0.9;
  rotorC.add(blurDisc);

  // --- Yatak gövdesi (CHRA), yağ girişi ---------------------------------------
  const center = new THREE.Group();
  root.add(center);
  center.add(new THREE.Mesh(lathe([[0.2, -0.46], [0.74, -0.45], [0.75, -0.36], [0.47, -0.32], [0.4, -0.2], [0.41, 0.18], [0.5, 0.28], [0.8, 0.33], [0.82, 0.45], [0.2, 0.46]], lite ? 36 : 56), chra));
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.32, 20).translate(0, 0.5, 0), chra);
  const drain = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.3).translate(0, -0.5, 0), chra);
  center.add(boss, drain);

  // Yağ hattı: besleme yukarıdan, dönüş aşağı
  const oilMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uClean: { value: 0 }, uGlow: { value: 0 }, uPhase: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; vN = normalMatrix*normal; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float uClean; uniform float uGlow; uniform float uPhase;
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(vV);
        float diff = clamp(dot(n, normalize(vec3(.3,.8,.5))),0.,1.);
        float fres = pow(1.-clamp(dot(n,v),0.,1.),2.);
        float braid = .85+.15*sin(vUv.x*900.+vUv.y*40.);
        vec3 base = vec3(.18,.19,.21)*(.35+.65*diff)*braid + fres*vec3(.35,.4,.45);
        float f = fract(vUv.x*7. - uPhase);
        float pulse = smoothstep(.0,.08,f)*smoothstep(.45,.1,f);
        vec3 dirty = vec3(.22,.12,.04);
        vec3 amber = vec3(1.,.64,.14);
        vec3 oil = mix(dirty, amber, uClean) * (mix(.35, 1.6, uClean)) * pulse;
        gl_FragColor = vec4(base + oil*uGlow + fres*uGlow*uClean*vec3(.5,.3,.05), 1.); }`,
  });
  const feed = new THREE.CatmullRomCurve3([V(0, 0.62, 0), V(0, 1.05, 0), V(0.18, 1.5, -0.25), V(0.7, 1.95, -0.55), V(1.6, 2.2, -0.8), V(2.6, 2.3, -0.9)]);
  const ret = new THREE.CatmullRomCurve3([V(0, -0.55, 0), V(0, -1.0, 0.02), V(-0.12, -1.55, 0.2), V(-0.2, -2.3, 0.3)]);
  const feedM = new THREE.Mesh(new THREE.TubeGeometry(feed, lite ? 60 : 90, 0.06, 10), oilMat);
  const retM = new THREE.Mesh(new THREE.TubeGeometry(ret, 40, 0.1, 12), oilMat);
  const banjo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16).translate(0, 0.7, 0), darkSteel);
  center.add(feedM, retM, banjo);

  // --- Kompresör gövdesi (alüminyum, soğuk taraf) ------------------------------
  const compH = new THREE.Group();
  root.add(compH);
  const cv = volute({ xc: 0.7, dir: 1, phi0: -Math.PI / 2, R0: 1.12, R1: 1.42, r0: 0.1, r1: 0.4, out: 1.05, outR: 0.36, seg: lite ? 54 : 72, rad: lite ? 14 : 20 });
  compH.add(new THREE.Mesh(cv.geo, alu));
  compH.add(new THREE.Mesh(lathe([[1.02, 0.47], [0.98, 0.56], [0.8, 0.66], [0.62, 0.85], [0.58, 1.05], [0.6, 1.3], [0.62, 1.7], [0.67, 1.86], [0.74, 1.92], [0.8, 1.93]], lite ? 40 : 56), alu));
  compH.add(new THREE.Mesh(lathe([[0.8, 1.93], [0.74, 1.98], [0.68, 1.96], [0.7, 1.4], [0.9, 1.05], [1.22, 0.86], [1.5, 0.7]], lite ? 40 : 56), alu));
  compH.add(new THREE.Mesh(lathe([[0.95, 0.46], [1.62, 0.46], [1.6, 0.52]], 56), alu));
  const cFlange = new THREE.Mesh(new THREE.TorusGeometry(cv.endR + 0.02, 0.05, 8, 32), alu);
  cFlange.position.copy(cv.endC);
  cFlange.lookAt(cv.endC.clone().add(cv.tan));
  compH.add(cFlange);

  // --- Türbin gövdesi (döküm demir, sıcak taraf) ---------------------------------
  const turbH = new THREE.Group();
  root.add(turbH);
  const tv = volute({ xc: -0.78, dir: -1, phi0: Math.PI * 1.5, R0: 1.0, R1: 1.28, r0: 0.09, r1: 0.34, out: 0.85, outR: 0.34, seg: lite ? 54 : 72, rad: lite ? 14 : 20 });
  turbH.add(new THREE.Mesh(tv.geo, iron));
  turbH.add(new THREE.Mesh(lathe([[0.84, -0.48], [0.8, -0.62], [0.66, -0.8], [0.57, -1.0], [0.56, -1.5], [0.6, -1.62], [0.8, -1.66], [0.8, -1.76], [0.56, -1.76]], lite ? 40 : 56), iron));
  turbH.add(new THREE.Mesh(lathe([[0.84, -0.46], [1.5, -0.46], [1.48, -0.52]], 56), iron));
  const tFlange = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.12), iron);
  tFlange.position.copy(tv.endC);
  tFlange.lookAt(tv.endC.clone().add(tv.tan));
  turbH.add(tFlange);
  // VNT aktüatörü: gövde üstünde kutu + çubuk
  const act = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 28).rotateZ(Math.PI / 2), darkSteel);
  can.position.set(0.25, 1.35, 0.95);
  const canCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.1, 28).rotateZ(Math.PI / 2), darkSteel);
  canCap.position.set(0.43, 1.35, 0.95);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8).rotateZ(Math.PI / 2), aluBright);
  rod.position.set(-0.3, 1.35, 0.95);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), aluBright);
  lever.position.set(-0.82, 1.18, 0.95);
  act.add(can, canCap, rod, lever);
  turbH.add(act);

  // --- VNT kanat halkası --------------------------------------------------------
  const vntG = new THREE.Group();
  root.add(vntG);
  const vanes = [];
  const NV = 13;
  const vaneGeo = new THREE.BoxGeometry(0.16, 0.035, 0.42);
  for (let i = 0; i < NV; i++) {
    const a = (i / NV) * TAU;
    const piv = new THREE.Group();
    piv.position.set(0, 0.98 * Math.cos(a), 0.98 * Math.sin(a));
    piv.rotation.x = a; // yerel y radyal
    const v = new THREE.Mesh(vaneGeo, vaneMat);
    piv.add(v);
    vntG.add(piv);
    vanes.push(v);
  }
  const nozzle = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.26, 64).rotateY(Math.PI / 2), darkSteel);
  darkSteel.side = THREE.DoubleSide;
  nozzle.position.x = 0.09;
  vntG.add(nozzle);

  // --- Hava akışı: soğuk emme, sıcak egzoz (konum shader'da hesaplanır) -----------------
  function flowPoints(n, hot) {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) seed[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.boundingSphere = new THREE.Sphere(V(0, 0, 0), 20);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPhase: { value: 0 }, uAlpha: { value: 0 }, uOff: { value: 0 }, uSize: { value: 30 } },
      vertexShader: `attribute vec3 aSeed; uniform float uPhase; uniform float uOff; uniform float uSize; varying float vL; varying float vS;
        void main(){ float life = fract(aSeed.x + uPhase*(.6+.8*aSeed.y)); vL = life; vS = aSeed.z; vec3 p;
        ${hot
          ? 'float x = -1.7 + uOff - life*4.2; float r = (.12+aSeed.y*.35) + life*life*1.4; float a = aSeed.z*6.2832 - life*2.;'
          : 'float x = 5.2 + uOff - pow(life,1.3)*3.5; float r = mix(.4+aSeed.y*1.4, .08+aSeed.y*.42, pow(life,.8)); float a = aSeed.z*6.2832 + life*4.2;'}
        p = vec3(x, r*cos(a), r*sin(a));
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = uSize*(${hot ? '.6+life*1.8' : '.5+aSeed.y*.7'})/ -mv.z;
        gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uAlpha; varying float vL; varying float vS;
        void main(){ vec2 c = gl_PointCoord-.5; float d = length(c); if(d>.5) discard;
        float soft = smoothstep(.5,.0,d);
        ${hot
          ? 'vec3 col = mix(vec3(1.,.86,.55), vec3(1.,.33,.06), smoothstep(0.,.5,vL)); float a = soft*smoothstep(0.,.08,vL)*smoothstep(1.,.35,vL)*.55;'
          : 'vec3 col = mix(vec3(.55,.85,1.), vec3(.9,.97,1.), vS); float a = soft*smoothstep(0.,.2,vL)*smoothstep(1.,.85,vL)*.6;'}
        gl_FragColor = vec4(col, a*uAlpha); }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }
  const coldFlow = flowPoints(lite ? 260 : 620, false);
  const hotFlow = flowPoints(lite ? 200 : 460, true);
  root.add(coldFlow, hotFlow);

  // --- Boyut ------------------------------------------------------------------
  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const sz = 70 * dpr * (height / 900);
    coldFlow.material.uniforms.uSize.value = sz;
    hotFlow.material.uniforms.uSize.value = sz * 1.6;
  }
  resize();

  // --- Kare ----------------------------------------------------------------------
  let last = performance.now();
  let slowFrames = 0;
  let angle = 0, phaseC = 0, phaseH = 0, oilPhase = 0;
  const tmp = V(0, 0, 0);

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(s.look);

    // Patlatma: gövdeler ve çarklar eksen boyunca ayrılır
    const ex = s.explode, far = s.far;
    compH.position.x = ex * 2.1 + far * 9;
    turbH.position.x = -ex * 2.1 - far * 9;
    compH.position.y = ex * 0.25 + far * 0.4;
    turbH.position.y = ex * 0.25 + far * 0.4;
    compH.visible = turbH.visible = far < 0.98;
    rotorC.position.x = ex * 0.95;
    rotorT.position.x = -ex * 0.95;
    vntG.position.x = -0.62 - ex * 1.45 - far * 0.2;
    vntG.scale.setScalar(0.001 + 0.999 * s.vntShow);
    vntG.visible = s.vntShow > 0.01;
    center.position.y = -ex * 0.05;

    // Dönüş: gerçek açı hızı sınırlı (stroboskop olmasın), fazlası bulanıklık diskine
    const w = Math.min(s.spin, 9.5);
    angle += w * dt;
    rotorC.rotation.x = angle;
    rotorT.rotation.x = angle;
    blurMat.uniforms.uAlpha.value = clamp((s.spin - 8) / 10);
    blurMat.uniforms.uTime.value = t * 7;

    // Balans: rotor ekseni presesyon yapar, halkalar titreşir
    const wob = s.wobble;
    rotor.rotation.y = wob * 0.07 * Math.sin(t * 11);
    rotor.rotation.z = wob * 0.07 * Math.cos(t * 11);
    ringMat.opacity = s.balance * 0.8;
    const rings = [[ringC, 0.9 + ex * 0.95, 1], [ringC2, 0.95 + ex * 0.95, 1.4], [ringT, -0.75 - ex * 0.95, 1]];
    for (const [m, x, k] of rings) {
      m.visible = s.balance > 0.01;
      m.position.set(x, Math.sin(t * 11) * wob * 0.05 * k, Math.cos(t * 11) * wob * 0.05 * k);
      m.rotation.y = wob * 0.1 * k * Math.sin(t * 11);
      m.rotation.z = wob * 0.1 * k * Math.cos(t * 11);
    }

    // VNT: 0 kapalı (teğet), 1 açık (radyale yakın)
    const vAng = 0.25 + s.vnt * 0.95;
    for (const v of vanes) v.rotation.x = vAng;
    vaneMat.emissiveIntensity = s.vntShow * 0.12;
    act.children[2].position.x = -0.3 - s.vnt * 0.14;
    act.children[3].rotation.x = -0.3 + s.vnt * 0.6;

    // Isı
    iron.emissiveIntensity = s.heat * 1.25;
    inconel.emissiveIntensity = s.heat * 0.55;
    ember.intensity = s.heat * 6;
    ember.position.x = turbH.position.x - 1.4;
    scene.environmentIntensity = 0.85 + s.cool * 0.25;

    // Yağ
    oilPhase += dt * (0.25 + s.oilClean * 1.4);
    oilMat.uniforms.uPhase.value = oilPhase;
    oilMat.uniforms.uClean.value = s.oilClean;
    oilMat.uniforms.uGlow.value = s.oil;

    // Akış
    phaseC += dt * s.flowSpeed * 0.35;
    phaseH += dt * s.flowSpeed * 0.45;
    coldFlow.material.uniforms.uPhase.value = phaseC;
    hotFlow.material.uniforms.uPhase.value = phaseH;
    coldFlow.material.uniforms.uAlpha.value = s.flow;
    hotFlow.material.uniforms.uAlpha.value = s.flow * (0.3 + s.heat * 0.7);
    coldFlow.material.uniforms.uOff.value = compH.position.x;
    hotFlow.material.uniforms.uOff.value = turbH.position.x;
    coldFlow.visible = hotFlow.visible = s.flow > 0.01;

    root.rotation.y = s.turn;

    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.85) {
      dpr = Math.max(0.85, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  // Etiketler için parça merkezleri (dünya koordinatı)
  const anchorsLocal = {
    kg: () => tmp.set(compH.position.x + 1.3, compH.position.y - 1.7, 0.4),
    kc: () => tmp.set(rotorC.position.x + 0.95, 1.2, 0),
    yg: () => tmp.set(0, center.position.y - 1.0, 0.3),
    tc: () => tmp.set(rotorT.position.x - 0.8, 1.05, 0),
    tg: () => tmp.set(turbH.position.x - 1.1, turbH.position.y - 1.75, 0),
  };
  const proj = V(0, 0, 0);
  function project(id) {
    const p = anchorsLocal[id]().applyAxisAngle(V(0, 1, 0), root.rotation.y);
    proj.copy(p).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * width, y: (-proj.y * 0.5 + 0.5) * height, z: proj.z };
  }

  return {
    renderer, camera, scene, update, resize, project,
    compile: () => renderer.compile(scene, camera),
  };
}
