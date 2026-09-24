// Karne sahnesi: masada duran bir sağlık karnesi. Kapak ve yapraklar kaydırmaya bağlı olarak
// kıvrılarak çevrilir, mühür iner, kalem yazısı satır satır belirir, sonda bir kedi karnenin
// üstünden yürüyüp gider. Durum dışarıdan `render(state)` ile verilir; kurgu main.js'te.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const W = 1, H = 1.4;
const TH = 0.022; // kapak kalınlığı
const GAP = 0.0036; // yapraklar arası
const NLEAF = 4;
const S = NLEAF * GAP + 0.003;
const ZA = TH + S / 2; // cilt ekseni yüksekliği
const TOP = TH + S; // yaprak yığınının üstü

const PAGE_VERT = /* glsl */ `
uniform float uAngle; uniform float uCurl; uniform float uDz; uniform float uBend; uniform float uW;
varying vec2 vUv; varying vec3 vN; varying vec3 vWP;
void main(){
  vUv = uv;
  vec3 p = position; vec3 n = normal;
  if (uBend > 0.5) {
    float t = clamp(p.x / uW, 0.0, 1.0);
    // Yay boyunca açı değişir: sırt önde, serbest kenar geride kalır (uzunluk korunur)
    float bx = 0.0, bz = 0.0;
    const int N = 14;
    float ds = p.x / float(N);
    float a = uAngle;
    for (int i = 0; i < N; i++) {
      float s = (float(i) + 0.5) / float(N) * t;
      a = clamp(uAngle - uCurl * s * s * 1.6 + uCurl * s * 0.35, 0.0, 3.14159);
      bx += cos(a) * ds; bz += sin(a) * ds;
    }
    p = vec3(bx, p.y, bz + uDz * cos(uAngle));
    n = vec3(-sin(a), 0.0, cos(a));
  }
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PAGE_FRAG = /* glsl */ `
uniform sampler2D uFront; uniform sampler2D uBack; uniform sampler2D uStamp;
uniform float uInkF; uniform float uInkB; uniform vec3 uInkCol; uniform vec3 uStampCol;
uniform vec4 uSt[4]; uniform vec4 uStB[4];
uniform float uShadow; uniform float uGlow; uniform float uTime; uniform float uGutter;
varying vec2 vUv; varying vec3 vN; varying vec3 vWP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
void main(){
  bool fr = gl_FrontFacing;
  vec2 uv = fr ? vUv : vec2(1.0 - vUv.x, vUv.y);
  vec2 tuv = vec2(uv.x, 1.0 - uv.y);
  vec4 t = fr ? texture2D(uFront, tuv) : texture2D(uBack, tuv);
  vec3 col = t.rgb;
  // Kalem yazısı: satır satır, soldan sağa
  float ink = fr ? uInkF : uInkB;
  float rows = 24.0;
  float iv = 1.0 - uv.y;
  float prog = (floor(iv * rows) + uv.x) / rows;
  float m = smoothstep(prog - 0.012, prog + 0.004, ink * 1.03);
  col = mix(col, uInkCol, t.a * m * 0.92);
  // Mühürler
  float sideId = fr ? 0.0 : 1.0;
  for (int i = 0; i < 4; i++) {
    vec4 s = uSt[i]; vec4 sb = uStB[i];
    if (s.w <= 0.0 || abs(sb.x - sideId) > 0.5) continue;
    vec2 l = (uv - s.xy) * vec2(1.0, 1.4) / s.z;
    float c = cos(sb.z), sn = sin(sb.z);
    l = mat2(c, -sn, sn, c) * l;
    float sc = mix(1.35, 1.0, clamp(s.w * 3.0, 0.0, 1.0));
    l *= sc;
    if (abs(l.x) < 1.0 && abs(l.y) < 1.0) {
      float a = texture2D(uStamp, vec2((sb.y + l.x * 0.5 + 0.5) / 3.0, l.y * 0.5 + 0.5)).a;
      float grain = 0.75 + 0.25 * h21(floor(uv * 400.0));
      col = mix(col, uStampCol, a * grain * 0.86 * clamp(s.w * 2.0, 0.0, 1.0));
    }
  }
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWP);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(vec3(-0.35, 1.0, 0.55));
  float dif = max(dot(N, L), 0.0);
  float light = 0.52 + 0.55 * dif;
  // Cilt boşluğu gölgesi
  float gut = mix(1.0 - 0.28 * uGutter, 1.0, smoothstep(0.0, 0.16, vUv.x));
  light *= gut * (1.0 - uShadow * 0.35 * (1.0 - vUv.x * 0.6));
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(N, H), 0.0), 60.0) * 0.12;
  col = col * light + sp;
  col += vec3(1.0, 0.18, 0.25) * uGlow * (0.5 + 0.5 * sin(uTime * 5.0)) * 0.18;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const DESK_VERT = /* glsl */ `
varying vec3 vP;
void main(){ vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`;
const DESK_FRAG = /* glsl */ `
uniform vec4 uBox; uniform float uLift; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying vec3 vP;
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 p = vP.xz;
  float r = length(p * vec2(0.8, 1.0));
  vec3 col = mix(uA, uB, smoothstep(0.0, 4.2, r));
  col = mix(col, uC, smoothstep(3.5, 9.0, r));
  // Kumaş dokusu
  float fab = sin(p.x * 180.0) * sin(p.y * 180.0) * 0.5 + 0.5;
  col *= 0.97 + fab * 0.03 + (h21(floor(p * 260.0)) - 0.5) * 0.03;
  // Karnenin yumuşak gölgesi
  vec2 c = uBox.xy; vec2 b = uBox.zw;
  float blur = 0.05 + uLift * 0.6;
  float d = sdBox(p - c - vec2(0.03, 0.05), b, 0.04);
  float sh = 1.0 - smoothstep(-blur, blur * 2.2, d);
  col *= 1.0 - sh * mix(0.62, 0.25, clamp(uLift * 1.5, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const DUST_VERT = /* glsl */ `
uniform float uTime; uniform float uPx; attribute float aS;
varying float vA;
void main(){
  vec3 p = position;
  p.y += mod(uTime * 0.03 * (0.5 + aS) + aS * 10.0, 2.4) - 0.2;
  p.x += sin(uTime * 0.3 + aS * 30.0) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (0.8 + aS * 1.6) / -mv.z;
  vA = (0.12 + aS * 0.3) * smoothstep(-0.2, 0.3, p.y) * (1.0 - smoothstep(1.7, 2.2, p.y));
}`;
const DUST_FRAG = /* glsl */ `
varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.92, 0.8), vA * smoothstep(0.5, 0.0, d)); }`;

export function createScene(canvas, { lite }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  const DPR = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor('#0e0b24');
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  const key = new THREE.DirectionalLight('#fff3e0', 2.2);
  key.position.set(-1.5, 4, 2.5);
  scene.add(key, new THREE.AmbientLight('#8b7cff', 0.35));

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);

  // Masa
  const deskMat = new THREE.ShaderMaterial({
    vertexShader: DESK_VERT, fragmentShader: DESK_FRAG,
    uniforms: {
      uBox: { value: new THREE.Vector4(0, 0, 0.5, 0.7) }, uLift: { value: 0 }, uTime: { value: 0 },
      uA: { value: new THREE.Color('#3a2f86') }, uB: { value: new THREE.Color('#1b1548') }, uC: { value: new THREE.Color('#0e0b24') },
    },
  });
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), deskMat);
  desk.rotation.x = -Math.PI / 2;
  desk.position.y = -0.002;
  scene.add(desk);

  // Toz
  const NDUST = lite ? 70 : 160;
  const dg = new THREE.BufferGeometry();
  const dp = new Float32Array(NDUST * 3), ds = new Float32Array(NDUST);
  for (let i = 0; i < NDUST; i++) {
    dp[i * 3] = (Math.random() - 0.5) * 4.5; dp[i * 3 + 1] = 0; dp[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
    ds[i] = Math.random();
  }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 40 } },
  });
  scene.add(new THREE.Points(dg, dustMat));

  // Karne: holder (kahraman pozu) → book (masaya yatık, yerel XY düzlemi)
  const holder = new THREE.Group();
  const book = new THREE.Group();
  book.rotation.x = -Math.PI / 2;
  holder.add(book);
  scene.add(holder);

  const coverMat = new THREE.MeshStandardMaterial({ color: '#35c9a2', roughness: 0.55, metalness: 0 });
  const back = new THREE.Mesh(new RoundedBoxGeometry(W + 0.03, H + 0.03, TH, 2, 0.008), coverMat);
  back.position.set(W / 2 + 0.005, 0, TH / 2);
  book.add(back);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(TH * 0.9, TH * 0.9, H + 0.03, 12, 1), coverMat);
  spine.position.set(0, 0, ZA);
  book.add(spine);

  const stampTex = { value: null };
  const inkCol = new THREE.Color('#2238a6');
  const stampCol = new THREE.Color('#e2306c');
  const blank = new THREE.DataTexture(new Uint8Array([247, 242, 228, 0]), 1, 1);
  blank.needsUpdate = true;

  function pageMat(bend) {
    return new THREE.ShaderMaterial({
      vertexShader: PAGE_VERT, fragmentShader: PAGE_FRAG, side: THREE.DoubleSide,
      uniforms: {
        uAngle: { value: 0 }, uCurl: { value: 0 }, uDz: { value: 0 }, uBend: { value: bend ? 1 : 0 }, uW: { value: W },
        uFront: { value: blank }, uBack: { value: blank }, uStamp: stampTex,
        uInkF: { value: 0 }, uInkB: { value: 0 }, uInkCol: { value: inkCol }, uStampCol: { value: stampCol },
        uSt: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0.1, 0)) },
        uStB: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(9, 0, 0, 0)) },
        uShadow: { value: 0 }, uGlow: { value: 0 }, uTime: { value: 0 }, uGutter: { value: 1 },
      },
    });
  }

  // Kapak: sert levha, iki yüzü ayrı düzlem
  const coverPivot = new THREE.Group();
  coverPivot.position.set(0, 0, ZA);
  book.add(coverPivot);
  const cz = TOP + TH / 2 - ZA;
  const coverBox = new THREE.Mesh(new RoundedBoxGeometry(W + 0.03, H + 0.03, TH, 2, 0.008), coverMat);
  coverBox.position.set(W / 2 + 0.005, 0, cz);
  coverPivot.add(coverBox);
  const cMat = pageMat(false);
  cMat.uniforms.uGutter.value = 0;
  const planeG = new THREE.PlaneGeometry(W, H, 1, 1).translate(W / 2, 0, 0);
  const cTop = new THREE.Mesh(planeG, cMat);
  cTop.position.set(0.005, 0, cz + TH / 2 + 0.0008);
  const cBot = new THREE.Mesh(planeG, cMat);
  cBot.position.set(0.005, 0, cz - TH / 2 - 0.0008);
  coverPivot.add(cTop, cBot);

  // Yapraklar
  const leafG = new THREE.PlaneGeometry(W, H, lite ? 26 : 40, 1).translate(W / 2, 0, 0);
  const leaves = [];
  for (let k = 1; k <= NLEAF; k++) {
    const m = pageMat(true);
    const zR = TH + GAP * (NLEAF - k + 1);
    m.uniforms.uDz.value = zR - ZA;
    const mesh = new THREE.Mesh(leafG, m);
    mesh.position.z = ZA;
    mesh.renderOrder = 1;
    book.add(mesh);
    leaves.push(mesh);
  }
  // Arka kapak içi (10. sayfa)
  const bMat = pageMat(false);
  bMat.uniforms.uGutter.value = 0.7;
  const bPage = new THREE.Mesh(planeG, bMat);
  bPage.position.set(0, 0, TH + 0.0012);
  book.add(bPage);

  // Mühür aleti
  const stamp = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#b8743e', roughness: 0.45 });
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = t * 0.36;
    const r = 0.036 + 0.018 * Math.sin(t * Math.PI * 0.9) + (t > 0.78 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.12) ** 2)) * 0.055 : 0);
    pts.push(new THREE.Vector2(Math.max(0.004, r), y));
  }
  pts.push(new THREE.Vector2(0.001, 0.372));
  const handle = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), wood);
  handle.position.y = 0.06;
  const baseM = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#1b1450', roughness: 0.35, metalness: 0.3 }));
  baseM.position.y = 0.035;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.012, 40), new THREE.MeshStandardMaterial({ color: '#e2306c', roughness: 0.8 }));
  pad.position.y = 0.006;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 10, 28), new THREE.MeshStandardMaterial({ color: '#e8d6a0', roughness: 0.25, metalness: 0.8 }));
  collar.rotation.x = Math.PI / 2; collar.position.y = 0.075;
  stamp.add(handle, baseM, pad, collar);
  stamp.visible = false;
  scene.add(stamp);

  // Pati izleri
  const NPAW = 14;
  const pawMat = new THREE.MeshBasicMaterial({ color: '#2a1f78', transparent: true, depthWrite: false, opacity: 0.78 });
  const paws = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.1), pawMat, NPAW);
  paws.renderOrder = 3;
  const pawPath = [];
  for (let i = 0; i < NPAW; i++) {
    const t = i / (NPAW - 1);
    const px = -0.85 + t * 1.7;
    const py = -0.55 + t * 0.95 + Math.sin(t * 5) * 0.06;
    const side = i % 2 ? 1 : -1;
    const ang = Math.atan2(0.95, 1.7) - Math.PI / 2 + Math.cos(t * 5) * 0.15;
    pawPath.push({ x: px + Math.cos(ang) * side * 0.045, y: py + Math.sin(ang) * side * 0.045, a: ang });
  }
  const pawM = new THREE.Matrix4(), pawQ = new THREE.Quaternion(), pawS = new THREE.Vector3(), pawP = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  book.add(paws);
  paws.visible = false;

  // --- Doku yükleme ------------------------------------------------------
  const SIDE_MAT = []; // side -> [mat, 'uFront'|'uBack']
  SIDE_MAT[0] = [cMat, 'uFront']; SIDE_MAT[1] = [cMat, 'uBack'];
  for (let k = 1; k <= NLEAF; k++) { SIDE_MAT[k * 2] = [leaves[k - 1].material, 'uFront']; SIDE_MAT[k * 2 + 1] = [leaves[k - 1].material, 'uBack']; }
  SIDE_MAT[10] = [bMat, 'uFront'];
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  function setPage(side, { base, ink }) {
    const w = base.width, h = base.height;
    const bd = base.getContext('2d').getImageData(0, 0, w, h);
    const kd = ink.getContext('2d').getImageData(0, 0, w, h).data;
    const a = bd.data;
    for (let i = 3; i < a.length; i += 4) a[i] = kd[i];
    const tex = new THREE.DataTexture(a, w, h, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, maxAniso);
    tex.needsUpdate = true;
    const [m, u] = SIDE_MAT[side];
    m.uniforms[u].value = tex;
    renderer.initTexture(tex);
  }
  function setStampAtlas(c) {
    const t = new THREE.CanvasTexture(c);
    t.generateMipmaps = true;
    stampTex.value = t;
  }
  function setPaw(c) {
    const t = new THREE.CanvasTexture(c);
    pawMat.map = t; pawMat.needsUpdate = true;
  }

  let stampDefs = [];
  function setStamps(defs) {
    stampDefs = defs;
    const m = leaves[0].material; // 3. sayfa: 1. yaprağın arkası
    defs.slice(0, 4).forEach((s, i) => {
      m.uniforms.uSt.value[i].set(s.u, s.v, s.r, 0);
      m.uniforms.uStB.value[i].set(s.side % 2, s.cell, s.rot, 0);
    });
  }

  // Görüntü → sayfa noktası (düz durumda) yerel koordinatı
  function sideLocal(side, iu, iv, out = new THREE.Vector3()) {
    const y = (0.5 - iv) * H;
    if (side % 2) {
      const k = (side - 1) / 2; // 0 = kapak içi
      const z = k === 0 ? TH + 0.001 : 2 * ZA - (TH + GAP * (NLEAF - k + 1));
      out.set(-(1 - iu) * W, y, z + 0.001);
    } else {
      const k = side / 2;
      const z = side === 10 ? TH + 0.0012 : side === 0 ? TOP + TH : TH + GAP * (NLEAF - k + 1);
      out.set(iu * W + 0.005, y, z + 0.001);
    }
    return out;
  }

  // --- Boyut --------------------------------------------------------------
  let vw = 1, vh = 1;
  function resize() {
    vw = innerWidth; vh = innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    dustMat.uniforms.uPx.value = vh * DPR * 0.02;
    camera.updateProjectionMatrix();
    viewSX = NaN;
  }

  const tmp = new THREE.Vector3();
  const target = new THREE.Vector3();
  let viewSX = NaN, viewSY = 0;
  resize();

  function render(s, time) {
    // Kahraman pozu
    holder.position.set(s.bx, s.by, s.bz);
    holder.rotation.set(s.rx, s.ry, s.rz, 'YXZ');
    // Kapak ve yapraklar
    coverPivot.rotation.y = -s.flip[0] * Math.PI;
    for (let k = 0; k < NLEAF; k++) {
      const f = s.flip[k + 1];
      const u = leaves[k].material.uniforms;
      u.uAngle.value = sm(f) * Math.PI;
      u.uCurl.value = Math.sin(f * Math.PI) * s.curl;
      u.uTime.value = time;
      // Çevrilen yaprağın altındaki sayfaya düşen gölge
      const next = k + 1 < NLEAF ? leaves[k + 1].material.uniforms : bMat.uniforms;
      next.uShadow.value = Math.sin(f * Math.PI) * 0.9;
    }
    cMat.uniforms.uTime.value = time;
    // Kalem yazıları
    for (let i = 0; i <= 10; i++) {
      const [m, u] = SIDE_MAT[i];
      m.uniforms[u === 'uFront' ? 'uInkF' : 'uInkB'].value = s.ink[i] ?? 0;
    }
    leaves[3].material.uniforms.uGlow.value = s.glow;
    // Mühürler
    const lm = leaves[0].material.uniforms;
    stampDefs.slice(0, 4).forEach((_, i) => (lm.uSt.value[i].w = s.stamps[i] ?? 0));
    // Mühür aleti
    stamp.visible = s.tool > 0.001;
    if (stamp.visible) {
      const d = stampDefs[Math.min(stampDefs.length - 1, Math.max(0, Math.floor(s.toolAt)))] || stampDefs[0];
      const d2 = stampDefs[Math.min(stampDefs.length - 1, Math.floor(s.toolAt) + 1)] || d;
      const f = s.toolAt - Math.floor(s.toolAt);
      const a = sideLocal(d.side, d.u, 1 - d.v, new THREE.Vector3());
      const b = sideLocal(d2.side, d2.u, 1 - d2.v, tmp);
      a.lerp(b, sm(f));
      a.z += s.toolH + 0.003;
      book.localToWorld(a);
      stamp.position.copy(a);
      stamp.position.y += (1 - s.tool) * 1.2;
      stamp.rotation.set(s.toolTilt, 0.4, s.toolTilt * 0.5);
    }
    // Pati izleri
    paws.visible = s.paws > 0.001;
    if (paws.visible) {
      for (let i = 0; i < NPAW; i++) {
        const pp = pawPath[i];
        const v = Math.min(1, Math.max(0, s.paws * (NPAW + 3) - i));
        pawP.set(pp.x, pp.y, pp.x < 0 ? TH + S - GAP + 0.003 : TH + 0.004);
        pawQ.setFromAxisAngle(zAxis, pp.a);
        const sc = v <= 0 ? 0.0001 : (0.6 + 0.4 * v) * (i % 2 ? 0.92 : 1);
        pawS.set(sc, sc, sc);
        pawM.compose(pawP, pawQ, pawS);
        paws.setMatrixAt(i, pawM);
      }
      paws.instanceMatrix.needsUpdate = true;
      pawMat.opacity = 0.78 * Math.min(1, s.paws * 6);
    }
    // Masa gölgesi
    const open = s.flip[0];
    const L = s.bx + (-W * sm(open)) * 1, R = s.bx + W;
    deskMat.uniforms.uBox.value.set((L + R) / 2 + 0.005, s.bz, (R - L) / 2 + 0.015, H / 2 + 0.015);
    deskMat.uniforms.uLift.value = s.by;
    deskMat.uniforms.uTime.value = time;
    dustMat.uniforms.uTime.value = time;

    // Kamera
    target.set(s.tx, s.ty, s.tz);
    camera.position.set(
      target.x + Math.sin(s.az) * Math.cos(s.el) * s.dist,
      target.y + Math.sin(s.el) * s.dist,
      target.z + Math.cos(s.az) * Math.cos(s.el) * s.dist,
    );
    camera.lookAt(target);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    if (s.sx !== viewSX || s.sy !== viewSY) {
      viewSX = s.sx; viewSY = s.sy;
      camera.setViewOffset(vw, vh, -s.sx * vw, -s.sy * vh, vw, vh);
    }
    renderer.render(scene, camera);
  }

  function project(side, iu, iv) {
    const p = sideLocal(side, iu, iv, new THREE.Vector3());
    book.localToWorld(p);
    p.project(camera);
    return { x: (p.x * 0.5 + 0.5) * vw, y: (-p.y * 0.5 + 0.5) * vh, behind: p.z > 1 };
  }

  function dispose() { renderer.dispose(); }
  return { render, resize, setPage, setStampAtlas, setPaw, setStamps, project, dispose, renderer };
}

function sm(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
