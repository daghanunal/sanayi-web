// Kodla çizilmiş ocakbaşı: meşe kömürü yatağı (kendi shader'ıyla kızaran, küllenen kor),
// üstünde enine yatan şişler (Adana, kuşbaşı), yanda közlenen domates ve biber,
// yükselen kıvılcımlar, duman ve damlayan yağın kor üstünde parlaması.
// Sahne durumu dışarıdan `update(state)` ile verilir; kamera kurgusu main.js'te.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const MANGAL = { len: 8.2, w: 1.5, rail: 0.1 };

// Ortak GLSL gürültüsü
const NOISE = /* glsl */ `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vn(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 + 3.7) * 0.15; }
`;

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0806, 7, 22);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 60);

  scene.add(new THREE.HemisphereLight(0x3b3440, 0x0a0504, 0.35));
  const rim = new THREE.DirectionalLight(0x9aa6c8, 0.35); // salondan gelen soğuk ışık
  rim.position.set(-4, 5, -6);
  scene.add(rim);
  // Korun ışığı: şişleri alttan boyar
  const fireLights = [-2.6, 0, 2.6].map((x) => {
    const l = new THREE.PointLight(0xff6a1e, 0, 5.5, 1.5);
    l.position.set(x, 0.05, 0);
    scene.add(l);
    return l;
  });
  const flareLight = new THREE.PointLight(0xffa640, 0, 3, 1.6);
  scene.add(flareLight);

  const U = {
    uTime: { value: 0 }, uHeat: { value: 0 }, uAsh: { value: 0 },
    uFlare: { value: 0 }, uFlareX: { value: 0 }, uGlow: { value: 0 }, uCook: { value: 0 },
  };

  // --- Kömür yatağı ------------------------------------------------------------
  // Kömür parçası: yumuşak gürültüyle ezilmiş, yassı ve köşeli ama kristal gibi değil
  const coalGeo = (() => {
    let g = new THREE.IcosahedronGeometry(1, lite ? 1 : 2);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 3.1 + 1.3) * Math.cos(v.y * 2.7 - 0.4) * Math.sin(v.z * 3.4 + 2.1);
      const c = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)); // kübe yakın: kırık kenarlar
      const r = 0.8 + n * 0.22 + (c - 0.75) * 0.5;
      pos.setXYZ(i, v.x * r * 1.25, v.y * r * 0.72, v.z * r);
    }
    g.computeVertexNormals();
    return g;
  })();
  const coalMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      varying vec3 vW; varying vec3 vN; varying float vSeed; varying vec3 vL;
      void main(){
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz; vL = position; vSeed = aSeed;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uHeat, uAsh, uFlare, uFlareX;
      varying vec3 vW; varying vec3 vN; varying float vSeed; varying vec3 vL;
      ${NOISE}
      vec3 ramp(float h){
        vec3 c = mix(vec3(0.0), vec3(0.55, 0.03, 0.0), smoothstep(0.05, 0.4, h));
        c = mix(c, vec3(1.0, 0.28, 0.02), smoothstep(0.35, 0.72, h));
        c = mix(c, vec3(1.0, 0.72, 0.32), smoothstep(0.7, 1.0, h));
        return c;
      }
      void main(){
        vec3 n = normalize(vN);
        float up = n.y * 0.5 + 0.5;
        float big = fbm(vW * 1.3 + vec3(0.0, uTime * 0.12, vSeed * 9.0));
        float fine = vn(vL * 5.0 + vSeed * 13.0);
        float crack = 1.0 - smoothstep(0.015, 0.06, abs(fine - 0.5));
        float flick = 0.86 + 0.14 * sin(uTime * (2.0 + vSeed * 3.0) + vSeed * 40.0);
        float fl = uFlare * exp(-pow((vW.x - uFlareX) * 1.6, 2.0));
        float hot = smoothstep(0.3, 0.8, big);
        float deep = smoothstep(-0.12, -0.3, vW.y);
        float heat = uHeat * (0.5 + 0.5 * fract(vSeed * 7.31)) * ((0.25 + 0.75 * hot) * (1.0 - up * 0.4) + deep * 0.45) * flick + fl * 0.9;
        heat = clamp(heat, 0.0, 1.0);
        float ash = uAsh * smoothstep(0.45, 0.9, up + (fine - 0.5) * 0.7);
        vec3 base = mix(vec3(0.02, 0.016, 0.014), vec3(0.12, 0.115, 0.11), ash);
        float lit = 0.15 + 0.85 * max(dot(n, normalize(vec3(-0.3, 0.8, 0.5))), 0.0);
        vec3 col = base * lit * 0.6;
        float edge = 1.0 - smoothstep(0.0, 0.7, up);           // yanlara ve alta bakan yüzler daha kızgın
        float vis = mix(0.5 + 0.5 * edge, edge * 0.7 + crack * 0.25, ash);
        vec3 e = ramp(heat * (0.55 + 0.45 * edge));
        col += e * vis * (0.75 + heat * 0.8);
        col += base * vec3(1.0, 0.4, 0.12) * uHeat * 0.3;      // külün üstüne vuran kor ışığı
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const COALS = lite ? 1500 : 2600;
  const coals = new THREE.InstancedMesh(coalGeo, coalMat, COALS);
  const seeds = new Float32Array(COALS);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < COALS; i++) {
    const layer = i < COALS * 0.45 ? 0 : 1;
    const s = 0.042 + Math.pow(Math.random(), 1.6) * 0.07;
    dummy.position.set(
      (Math.random() - 0.5) * (MANGAL.len - 0.35),
      -0.26 + layer * 0.08 + Math.random() * 0.08,
      (Math.random() - 0.5) * (MANGAL.w - 0.3)
    );
    dummy.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    dummy.scale.set(s * (0.8 + Math.random() * 0.5), s, s * (0.8 + Math.random() * 0.5));
    dummy.updateMatrix();
    coals.setMatrixAt(i, dummy.matrix);
    seeds[i] = Math.random();
  }
  coalGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  coals.frustumCulled = false;
  scene.add(coals);

  // Kor ışıması: kömürlerin hemen üstünde toplamalı parıltı
  const glowTex = canvasTex(256, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,150,60,1)');
    gr.addColorStop(0.35, 'rgba(255,90,20,.55)');
    gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(MANGAL.len * 1.25, MANGAL.w * 2.2), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -0.02;
  scene.add(glow);

  // --- Mangal gövdesi --------------------------------------------------------------
  const steel = new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: 0.55, metalness: 0.75 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.35, metalness: 0.9 });
  // Ön sac: hava delikleri korun ışığıyla yanar
  const holeTex = canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    for (let x = 16; x < w; x += 32) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(x, h * 0.38, 5, 0, Math.PI * 2);
      g.fill();
    }
  }, false);
  const frontMat = new THREE.MeshStandardMaterial({
    color: 0x201d1b, roughness: 0.5, metalness: 0.7,
    emissive: 0xe0400a, emissiveMap: holeTex, emissiveIntensity: 0,
  });
  const body = new THREE.Group();
  const wallH = 0.62;
  const mkBox = (w, h, d, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    body.add(b);
    return b;
  };
  mkBox(MANGAL.len, wallH, 0.05, frontMat, 0, 0.06 - wallH / 2, MANGAL.w / 2);
  mkBox(MANGAL.len, wallH + 0.18, 0.05, steel, 0, 0.15 - wallH / 2, -MANGAL.w / 2);
  mkBox(0.05, wallH, MANGAL.w, steel, MANGAL.len / 2, 0.06 - wallH / 2, 0);
  mkBox(0.05, wallH, MANGAL.w, steel, -MANGAL.len / 2, 0.06 - wallH / 2, 0);
  mkBox(MANGAL.len, 0.04, MANGAL.w, steel, 0, 0.06 - wallH, 0);
  // Pirinç kenar ve şiş rayları
  const railGeo = new THREE.CylinderGeometry(0.022, 0.022, MANGAL.len + 0.1, 10);
  for (const z of [MANGAL.w / 2 + 0.01, -MANGAL.w / 2 - 0.01]) {
    const r = new THREE.Mesh(railGeo, brass);
    r.rotation.z = Math.PI / 2;
    r.position.set(0, MANGAL.rail - 0.02, z);
    body.add(r);
  }
  // Tezgâh: mangalın altı ve önü
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8, metalness: 0.1 });
  mkBox(MANGAL.len + 1.8, 2.2, MANGAL.w + 1.6, counterMat, 0, -0.62 - 1.1, 0.2);
  const marble = new THREE.MeshStandardMaterial({ color: 0x3a302a, roughness: 0.35, metalness: 0.05 });
  mkBox(MANGAL.len + 1.8, 0.06, 0.8, marble, 0, 0.06 - wallH + 0.02, MANGAL.w / 2 + 0.44);
  scene.add(body);

  // --- Şişler -------------------------------------------------------------------
  const MEAT_UNI = { uCook: U.uCook, uGlow: U.uGlow, uTime: U.uTime };
  function meatMaterial(raw, cooked, charAmt, rough = 0.62) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0.0 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, MEAT_UNI);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPL;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPL = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nuniform float uCook, uGlow, uTime;\nvarying vec3 vPL;\n${NOISE}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float nn = fbm(vPL * 28.0);
          float speck = step(0.8, vn(vPL * 90.0));
          vec3 raw = vec3(${raw.join(',')}) * (0.85 + nn * 0.3);
          vec3 ck = vec3(${cooked.join(',')}) * (0.7 + nn * 0.6);
          float fat = smoothstep(0.6, 0.72, vn(vPL * vec3(34.0, 12.0, 34.0) + 3.0));
          raw = mix(raw, vec3(0.78, 0.62, 0.55), fat * 0.55);
          ck = mix(ck, vec3(0.42, 0.2, 0.06), fat * 0.5);
          vec3 c = mix(raw, ck, smoothstep(0.0, 0.75, uCook));
          float ch = smoothstep(0.55, 0.8, nn + speck * 0.3) * smoothstep(0.45, 1.0, uCook) * ${charAmt.toFixed(2)};
          c = mix(c, vec3(0.04, 0.02, 0.012), ch);
          c = mix(c, vec3(0.75, 0.1, 0.05), speck * 0.35 * (1.0 - uCook)); // pul biber
          diffuseColor.rgb = c;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec3 wn = inverseTransformDirection(normal, viewMatrix);
          float below = smoothstep(0.1, -0.9, wn.y);
          totalEmissiveRadiance += vec3(0.9, 0.25, 0.04) * uGlow * below * (0.12 + 0.08 * sin(uTime * 7.0 + vPL.z * 30.0));
          totalEmissiveRadiance += vec3(0.9, 0.35, 0.08) * uGlow * uCook * 0.05;`);
    };
    return m;
  }
  const adanaMat = meatMaterial([0.36, 0.075, 0.07], [0.17, 0.06, 0.024], 0.9, 0.6);
  const kusMat = meatMaterial([0.33, 0.06, 0.065], [0.16, 0.055, 0.022], 0.8, 0.55);
  const tavukMat = meatMaterial([0.74, 0.5, 0.4], [0.55, 0.28, 0.08], 0.6, 0.55);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.28, metalness: 1 });
  const pepperG = new THREE.MeshStandardMaterial({ color: 0x2f7a1e, roughness: 0.35 });
  const tomatoM = new THREE.MeshStandardMaterial({ color: 0xc8261a, roughness: 0.3 });
  const onionM = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.45 });

  // Adana: parmakla bastırılmış sırtlar, yassı kesit
  const adanaGeo = (() => {
    const L = 1.05, R = 0.095;
    const g = new THREE.CylinderGeometry(R, R, L, 18, 90, false);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = y / L + 0.5;
      const ridge = 1 + 0.055 * Math.sin(t * Math.PI * 2 * 11 + Math.atan2(z, x) * 0.5);
      const taper = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.18);
      const lump = 1 + 0.05 * Math.sin(t * 37 + x * 20) * Math.cos(z * 30);
      p.setXYZ(i, x * ridge * taper * lump * 1.18, y, z * ridge * taper * lump * 0.8);
    }
    g.computeVertexNormals();
    g.rotateX(Math.PI / 2); // uzunluk z boyunca
    return g;
  })();
  const bladeGeo = new THREE.BoxGeometry(0.075, 0.012, 2.25);
  const handleGeo = new THREE.TorusGeometry(0.075, 0.013, 8, 20);
  const cubeGeo = (() => {
    const g = new RoundedBoxGeometry(0.17, 0.15, 0.15, 3, 0.035);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.12 * Math.sin(x * 41 + y * 23) * Math.cos(z * 37 - x * 11);
      p.setXYZ(i, x * k, y * k, z * (1 + 0.06 * Math.sin(y * 50)));
    }
    g.computeVertexNormals();
    return g;
  })();
  const chunkGeo = new RoundedBoxGeometry(0.03, 0.13, 0.12, 1, 0.012);

  function makeSkewer(type) {
    const g = new THREE.Group();
    const spin = new THREE.Group();
    g.add(spin);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.z = 0.15;
    spin.add(blade);
    const handle = new THREE.Mesh(handleGeo, bladeMat);
    handle.position.set(0, 0, 1.33);
    handle.rotation.y = Math.PI / 2;
    spin.add(handle);
    if (type === 'adana') {
      const m = new THREE.Mesh(adanaGeo, adanaMat);
      spin.add(m);
    } else {
      const mat = type === 'tavuk' ? tavukMat : kusMat;
      for (let i = 0; i < 7; i++) {
        const z = -0.5 + i * 0.165;
        if (type === 'kus' && i % 2 === 1) {
          const c = new THREE.Mesh(chunkGeo, i % 4 === 1 ? pepperG : onionM);
          c.position.z = z;
          c.rotation.z = Math.random() * 0.5;
          spin.add(c);
        } else {
          const c = new THREE.Mesh(cubeGeo, mat);
          c.position.z = z;
          c.rotation.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, Math.random() * 1.2);
          const s = 0.85 + Math.random() * 0.3;
          c.scale.set(s, s * 0.95, 1);
          spin.add(c);
        }
      }
    }
    g.userData.spin = spin;
    scene.add(g);
    return g;
  }
  const LAYOUT = lite
    ? [['adana', -0.95], ['kus', -0.35], ['adana', 0.25], ['tavuk', 0.85], ['adana', 1.45]]
    : [['adana', -1.85], ['kus', -1.25], ['adana', -0.65], ['adana', -0.05], ['tavuk', 0.55], ['kus', 1.15], ['adana', 1.75]];
  const skewers = LAYOUT.map(([type, x], i) => {
    const s = makeSkewer(type);
    s.userData.x = x;
    s.userData.i = i;
    s.userData.phase = Math.random() * 6;
    return s;
  });

  // Közleme: domates ve sivri biber, ızgaranın kenarında
  const koz = [];
  const tomGeo = new THREE.SphereGeometry(0.16, 20, 14);
  const pepGeo = new THREE.CapsuleGeometry(0.055, 0.55, 6, 12);
  const kozPlaces = [[-3.1, 'tom'], [-2.7, 'pep'], [-3.45, 'pep'], [2.8, 'tom'], [3.2, 'pep'], [2.45, 'tom']];
  for (const [x, t] of kozPlaces) {
    const m = new THREE.Mesh(t === 'tom' ? tomGeo : pepGeo, (t === 'tom' ? tomatoM : pepperG).clone());
    m.position.set(x, t === 'tom' ? 0.2 : 0.14, (Math.random() - 0.5) * 0.5);
    if (t === 'tom') m.scale.set(1, 0.82, 1);
    else m.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 0.6);
    m.userData.base = m.material.color.clone();
    scene.add(m);
    koz.push(m);
  }
  // Közleme ızgarası (tel)
  const grill = new THREE.Group();
  const wireGeo = new THREE.CylinderGeometry(0.008, 0.008, MANGAL.w + 0.02, 5);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 11; k++) {
      const w = new THREE.Mesh(wireGeo, steel);
      w.rotation.x = Math.PI / 2;
      w.position.set(side * (2.35 + k * 0.12), 0.05, 0);
      grill.add(w);
    }
  }
  scene.add(grill);

  // --- Kıvılcımlar ------------------------------------------------------------------
  const SPARKS = lite ? 150 : 320;
  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(SPARKS * 3);
  const ss = new Float32Array(SPARKS);
  for (let i = 0; i < SPARKS; i++) {
    sp[i * 3] = (Math.random() - 0.5) * MANGAL.len * 0.95;
    sp[i * 3 + 1] = Math.random();
    sp[i * 3 + 2] = (Math.random() - 0.5) * MANGAL.w * 0.8;
    ss[i] = Math.random();
  }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
  const sparkMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uAmt: { value: 0 }, uFlare: U.uFlare, uFlareX: U.uFlareX, uScale: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime, uAmt, uFlare, uFlareX, uScale;
      varying float vA; varying float vLife;
      void main(){
        float sp = 0.18 + aSeed * 0.35;
        float boost = uFlare * exp(-pow((position.x - uFlareX) * 1.2, 2.0));
        float life = fract(uTime * sp * (1.0 + boost * 2.0) + position.y);
        vec3 p = position;
        p.y = life * (2.4 + aSeed * 1.8) * (0.6 + 0.4 * uAmt + boost);
        p.x += sin(uTime * 1.7 + aSeed * 30.0) * 0.12 * life + life * 0.25 * sin(aSeed * 9.0);
        p.z += cos(uTime * 1.3 + aSeed * 21.0) * 0.1 * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vLife = life;
        vA = (1.0 - life) * smoothstep(0.0, 0.05, life) * clamp(uAmt * step(aSeed, 0.35 + uAmt * 0.65) + boost, 0.0, 1.5);
        gl_PointSize = min((2.6 + aSeed * 4.0) * (1.0 - life * 0.6) * uScale * (4.0 / -mv.z), 9.0 * uScale);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vLife;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        vec3 c = mix(vec3(1.0, 0.85, 0.5), vec3(1.0, 0.25, 0.02), vLife);
        gl_FragColor = vec4(c * 1.6, a);
      }`,
  });
  const sparks = new THREE.Points(sg, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);

  // --- Duman -----------------------------------------------------------------------
  const puffTex = canvasTex(128, 128, (g, w, h) => {
    for (let k = 0; k < 14; k++) {
      const x = w * (0.3 + Math.random() * 0.4), y = h * (0.3 + Math.random() * 0.4), r = w * (0.12 + Math.random() * 0.2);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,.22)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  });
  const PUFFS = lite ? 9 : 16;
  const puffs = [];
  for (let i = 0; i < PUFFS; i++) {
    const m = new THREE.SpriteMaterial({ map: puffTex, color: 0xb8a89c, transparent: true, depthWrite: false, opacity: 0 });
    const s = new THREE.Sprite(m);
    s.userData = { x: (Math.random() - 0.5) * MANGAL.len * 0.8, z: (Math.random() - 0.5) * 0.6, t: Math.random(), sp: 0.07 + Math.random() * 0.06, rot: (Math.random() - 0.5) * 0.4 };
    scene.add(s);
    puffs.push(s);
  }

  // --- Yağ damlaları ---------------------------------------------------------------
  const dropGeo = new THREE.SphereGeometry(0.018, 6, 5);
  const dropMat = new THREE.MeshBasicMaterial({ color: 0xffd08a });
  const drops = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(dropGeo, dropMat);
    m.visible = false;
    m.scale.set(1, 1.6, 1);
    m.userData = { v: 0, active: false };
    scene.add(m);
    return m;
  });
  let dropTimer = 0.4;
  let flare = 0;

  // --- Boyut ve güncelleme -----------------------------------------------------------
  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    sparkMat.uniforms.uScale.value = height / 420 * dpr;
  }
  resize();

  let last = performance.now();
  let slowFrames = 0;
  let spinA = 0;
  const tmp = new THREE.Color();
  const charred = new THREE.Color(0x1a0d08);

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    U.uTime.value = t;

    camera.position.copy(s.pos);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(s.look);

    U.uHeat.value = s.heat;
    U.uAsh.value = s.ash;
    U.uCook.value = s.cook;
    U.uGlow.value = s.heat * s.skewersIn;
    glowMat.opacity = s.heat * 0.45;
    frontMat.emissiveIntensity = s.heat * 0.9;
    const fk = 0.85 + 0.15 * Math.sin(t * 9.1) * Math.sin(t * 3.7);
    fireLights.forEach((l, i) => (l.intensity = s.heat * (3.2 + Math.sin(t * 5 + i * 2) * 0.8) * fk));

    // Şişler: yukarıdan iner, raylara oturur, döner; serviste kalkar
    spinA += dt * s.spin;
    for (const sk of skewers) {
      const { i, x, phase } = sk.userData;
      const k = Math.min(1, Math.max(0, s.skewersIn * 1.6 - i * 0.09));
      const e = 1 - Math.pow(1 - k, 3);
      const out = Math.min(1, Math.max(0, s.skewersOut * 1.5 - (skewers.length - 1 - i) * 0.07));
      const eo = out * out;
      const hv = (s.hover ?? 0) * (0.8 + Math.sin(t * 1.3 + phase) * 0.04);
      sk.position.set(x + (1 - e) * 0.4, MANGAL.rail + 0.02 + (1 - e) * 3.2 + hv + eo * 1.2, eo * 4);
      sk.rotation.x = (1 - e) * 0.35 + (s.hover ?? 0) * Math.sin(t * 0.9 + phase) * 0.04;
      sk.rotation.y = (1 - e) * 0.25;
      sk.visible = k > 0 && eo < 1;
      sk.userData.spin.rotation.z = spinA * (1 + (i % 3) * 0.08) + phase;
    }

    // Közleme kararır
    for (const m of koz) {
      m.material.color.copy(m.userData.base).lerp(charred, s.cook * 0.55);
      m.visible = s.koz > 0.01;
    }

    // Kıvılcım ve duman
    sparkMat.uniforms.uAmt.value = s.sparks;
    for (const p of puffs) {
      const u = p.userData;
      u.t += dt * u.sp * (0.6 + s.smoke);
      if (u.t > 1) {
        u.t -= 1;
        u.x = (Math.random() - 0.5) * MANGAL.len * 0.8;
      }
      p.position.set(u.x + Math.sin(t * 0.3 + u.x) * 0.3 * u.t, 0.2 + u.t * 3.2, u.z - u.t * 0.4);
      const sc = 0.8 + u.t * 2.6;
      p.scale.set(sc, sc, 1);
      p.material.rotation += u.rot * dt;
      const near = Math.min(1, Math.max(0, (p.position.distanceTo(camera.position) - sc * 0.6) / 1.5));
      p.material.opacity = s.smoke * 0.5 * Math.sin(Math.PI * u.t) * near;
    }

    // Yağ damlar, kor parlar
    if (s.drip > 0 && s.skewersIn > 0.95 && s.skewersOut < 0.02) {
      dropTimer -= dt * s.drip;
      if (dropTimer <= 0) {
        dropTimer = 0.35 + Math.random() * 0.6;
        const dr = drops.find((m) => !m.userData.active);
        const sk = skewers[Math.floor(Math.random() * skewers.length)];
        if (dr) {
          dr.position.set(sk.position.x + (Math.random() - 0.5) * 0.06, MANGAL.rail - 0.06, (Math.random() - 0.5) * 0.9);
          dr.userData.v = 0;
          dr.userData.active = true;
          dr.visible = true;
        }
      }
    }
    for (const dr of drops) {
      if (!dr.userData.active) continue;
      dr.userData.v += dt * 6;
      dr.position.y -= dr.userData.v * dt;
      if (dr.position.y < -0.2) {
        dr.userData.active = false;
        dr.visible = false;
        flare = 1;
        U.uFlareX.value = dr.position.x;
        flareLight.position.set(dr.position.x, 0.15, dr.position.z);
      }
    }
    flare *= Math.exp(-dt * 3.2);
    U.uFlare.value = flare * s.heat;
    flareLight.intensity = flare * 6 * s.heat;

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

  return {
    renderer, camera, update, resize,
    compile: () => renderer.compile(scene, camera),
  };
}
