// Silindir: patlatılmış görünümlü, scroll'la yönetilen prosedürel dört silindirli motor.
// Blok, kapak, conta, supaplar, eksantrikler, triger sistemi, volan, debriyaj, karter,
// manifoldlar ve enjektörler ayrı gruplar; her biri kendi yönüne uçar.
// Sahne durumu main.js'teki ScrollTrigger'lar tarafından `state` üzerinden sürülür.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const R = 0.3; // krank yarıçapı
const L = 1.0; // biyel boyu
const PITCH = 1.05;
const CYL = [-1.5, -0.5, 0.5, 1.5].map((i) => i * PITCH);
const PHASE = [0, Math.PI, Math.PI, 0];
const FIRE = [0, 3 * Math.PI, Math.PI, 2 * Math.PI]; // 1-3-4-2
const DECK = 1.62;
const BOTTOM = -0.25;
const FRONT_X = -2.45; // triger düzlemi
const TAU = Math.PI * 2;

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;

// Tur durakları: odak noktası (patlatılmış halde), kameranın baktığı yön ve uzaklık.
export const STOPS = {
  rotating: { focus: [0, 0.75, 0], dir: [0.55, -0.1, 1], dist: 6, label: 'Piston, segman, biyel, krank' },
  head: { focus: [0, 3.55, 0], dir: [0.25, 0.6, 1], dist: 5.6, label: 'Silindir kapağı, supaplar, eksantrik' },
  belt: { focus: [FRONT_X - 1.6, 1.25, 0], dir: [-1, 0.25, 0.55], dist: 4.8, label: 'Triger kayışı, gergi, kasnaklar' },
  clutch: { focus: [4.2, 0, 0], dir: [0.9, 0.3, 0.8], dist: 4.6, label: 'Volan, debriyaj balatası, baskı' },
  oilpan: { focus: [0.4, -1.7, 0.7], dir: [0.4, 0.55, 1], dist: 5.2, label: 'Karter ve yağ filtresi' },
  overview: { focus: [0, 1.8, 0], dir: [0.55, 0.3, 1], dist: 12.5, label: 'Motor ve aktarma organları' },
  injectors: { focus: [0, 2.95, 1.8], dir: [0.2, 0.55, 1], dist: 4.4, label: 'Enjektörler, yakıt rampası' },
  pump: { focus: [FRONT_X - 1.6, 1.1, 0.55], dir: [-0.7, 0.3, 0.9], dist: 2.6, label: 'Devirdaim pompası' },
};

export function stopForService(baslik) {
  const t = baslik.toLocaleLowerCase('tr');
  if (/revizyon|piston|segman|krank/.test(t)) return 'rotating';
  if (/kapak|supap|conta/.test(t)) return 'head';
  if (/triger|zincir|kayış/.test(t)) return 'belt';
  if (/şanzıman|debriyaj|volan/.test(t)) return 'clutch';
  if (/yağ|bakım|filtre/.test(t)) return 'oilpan';
  if (/enjekt|yakıt/.test(t)) return 'injectors';
  if (/hararet|soğutma|radyatör|devirdaim/.test(t)) return 'pump';
  return 'overview';
}

// --- Dokular --------------------------------------------------------------

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Honlama izi: silindir duvarındaki çapraz taşlama çizgileri.
const honingTex = () => {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7b8086';
    g.fillRect(0, 0, w, h);
    g.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
      const light = Math.random() > 0.5;
      g.strokeStyle = light ? 'rgba(220,226,232,.18)' : 'rgba(30,32,36,.22)';
      const x = Math.random() * w * 2 - w / 2;
      const dir = i % 2 ? 1 : -1;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + dir * h * 0.58, h);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
};

const beltTex = () => {
  const t = canvasTex(32, 8, (g) => {
    g.fillStyle = '#17171a';
    g.fillRect(0, 0, 32, 8);
    g.fillStyle = '#2d2d31';
    g.fillRect(0, 0, 14, 8);
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.fillRect(0, 0, 2, 8);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(170, 1);
  return t;
};

const glowTex = () =>
  canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,230,180,1)');
    grd.addColorStop(0.25, 'rgba(255,130,40,.8)');
    grd.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

const dotTex = () =>
  canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.4, 'rgba(255,255,255,.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });

// Kapak üstündeki döküm yazı: işletmenin adı (URL ile değişir).
const nameTex = (name) =>
  canvasTex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    let size = 104;
    g.font = `900 ${size}px Anybody, Impact, sans-serif`;
    // Anybody'nin dar kesimini font-stretch ile iste
    g.fontStretch = 'condensed';
    while (g.measureText(name.toLocaleUpperCase('tr')).width > w - 40 && size > 30) {
      size -= 4;
      g.font = `900 ${size}px Anybody, Impact, sans-serif`;
    }
    g.fillStyle = '#e8e6e1';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name.toLocaleUpperCase('tr'), w / 2, h / 2 + 4);
  });

// --- Geometri yardımcıları ---------------------------------------------------

function deckShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.25, -0.62);
  s.lineTo(2.25, -0.62);
  s.lineTo(2.25, 0.62);
  s.lineTo(-2.25, 0.62);
  s.closePath();
  for (const x of CYL) {
    const h = new THREE.Path();
    h.absarc(x, 0, 0.41, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
}

function gearGeometry(r, teeth, depth, tooth = 0.03) {
  const s = new THREE.Shape();
  const n = teeth * 2;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr = i % 2 ? r : r + tooth;
    const a0 = a - Math.PI / n / 2;
    const a1 = a + Math.PI / n / 2;
    if (i === 0) s.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    else s.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    s.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2); // eksen → x
  return g;
}

function webGeometry(segments) {
  const s = new THREE.Shape();
  s.moveTo(0, 0.2);
  s.lineTo(R, 0.17);
  s.absarc(R, 0, 0.17, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(0, -0.2);
  const a0 = -(Math.PI / 2 + 0.45);
  s.lineTo(0.42 * Math.cos(a0), 0.42 * Math.sin(a0));
  s.absarc(0, 0, 0.42, a0, -(3 * Math.PI) / 2 + 0.45, true);
  s.lineTo(0, 0.2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: segments,
  });
  g.translate(0, 0, -0.05);
  g.rotateY(Math.PI / 2);
  return g;
}

function camLobe(phase) {
  const s = new THREE.Shape();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const r = 0.1 + 0.07 * Math.pow(Math.max(0, Math.cos(a)), 3);
    const x = Math.cos(a + phase) * r;
    const y = Math.sin(a + phase) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
  g.translate(0, 0, -0.05);
  g.rotateY(Math.PI / 2);
  return g;
}

// Kasnakları saran kayışın yolu: noktalardan dışbükey zarf.
function beltCurve(circles) {
  const pts = [];
  for (const [z, y, r] of circles) {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      pts.push([z + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  // Uzun düz kenarları eşit aralıklarla doldur, eğri düzgün kalsın.
  const dense = [];
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(len / 0.08));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      dense.push(new THREE.Vector3(0, lerp(a[1], b[1], t), lerp(a[0], b[0], t)));
    }
  }
  return new THREE.CatmullRomCurve3(dense, true, 'centripetal');
}

// --- Alev shader'ı --------------------------------------------------------

const NOISE = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

const fireMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAmt; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);
        float n = fbm(vec2(a * 2.0, r * 3.0 - uTime * 3.5)) + 0.5 * fbm(p * 7.0 + uTime * 1.3);
        float f = smoothstep(1.05, 0.0, r + (n - 0.6) * 0.9 * (1.2 - uAmt));
        vec3 col = mix(vec3(0.9, 0.18, 0.02), vec3(1.0, 0.62, 0.18), f);
        col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.75, 1.0, f));
        // Merkezde mavi alev çekirdeği
        col = mix(col, vec3(0.35, 0.55, 1.0), smoothstep(0.25, 0.0, r) * 0.6 * (1.0 - uAmt * 0.5));
        gl_FragColor = vec4(col * f * uAmt * 1.6, f * uAmt);
      }`,
  });

const exhaustFlameMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAmt; varying vec2 vUv;
      ${NOISE}
      void main(){
        float along = 1.0 - vUv.y;      // 0 = uç, 1 = ağız (ConeGeometry'de uç v=1)
        float n = fbm(vec2(vUv.x * 6.0, along * 4.0 + uTime * 9.0));
        float body = smoothstep(0.0, 0.9, along) * (0.55 + n * 0.9);
        float edge = sin(vUv.x * 3.14159 * 2.0) * 0.5 + 0.5;
        vec3 col = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.85, 0.5), along * along);
        col = mix(col, vec3(0.3, 0.5, 1.0), smoothstep(0.85, 1.0, along) * 0.7);
        float a = body * uAmt * (0.6 + edge * 0.4);
        gl_FragColor = vec4(col * a * 1.4, a);
      }`,
  });

// Isı titremesi: sahneyi bir hedefe çizip gürültüyle kaydırarak geri basar.
function createHaze(renderer) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 0 });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture }, uTime: { value: 0 }, uAmt: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMap; uniform float uTime, uAmt; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 q = vUv * vec2(6.0, 10.0) + vec2(0.0, -uTime * 2.2);
        vec2 off = vec2(fbm(q) - 0.5, fbm(q + 7.3) - 0.5) * 0.028 * uAmt;
        vec4 c = texture2D(tMap, vUv + off);
        gl_FragColor = c;
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();
  return {
    render(mainScene, mainCam, amt, time) {
      renderer.getDrawingBufferSize(size);
      if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
      renderer.setRenderTarget(rt);
      renderer.render(mainScene, mainCam);
      renderer.setRenderTarget(null);
      mat.uniforms.uAmt.value = amt;
      mat.uniforms.uTime.value = time;
      renderer.render(scene, cam);
    },
    dispose() {
      rt.dispose();
      mat.dispose();
    },
  };
}

// --- Motor ----------------------------------------------------------------

export function createEngine(canvas, { name = '', low = false, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: !low, alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);

  const key = new THREE.DirectionalLight(0xdfe8ff, 2.3);
  key.position.set(4, 7, 6);
  const rim = new THREE.DirectionalLight(0xff5b14, 6);
  rim.position.set(-5, 3, -7);
  const fill = new THREE.DirectionalLight(0x6f9bff, 0.7);
  fill.position.set(6, -2, 3);
  const under = new THREE.PointLight(0xff7a26, 5, 9, 1.6);
  under.position.set(0, -1.8, 1.6);
  const boreLight = new THREE.PointLight(0xffd9b0, 0, 2.6, 1.8);
  boreLight.position.set(CYL[0], 1.72, 0.12);
  const fireLight = new THREE.PointLight(0xff6a1a, 0, 4, 1.4);
  fireLight.position.set(CYL[0], 1.7, 0);
  const exhaustLight = new THREE.PointLight(0xff5a14, 0, 6, 1.4);
  scene.add(key, rim, fill, under, boreLight, fireLight, exhaustLight, new THREE.AmbientLight(0x3a4250, 0.55));

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    iron: std({ color: 0x3b3d42, metalness: 0.7, roughness: 0.55 }),
    alu: std({ color: 0xb4b9c0, metalness: 1, roughness: 0.32 }),
    castAlu: std({ color: 0x8e949b, metalness: 0.9, roughness: 0.5 }),
    steel: std({ color: 0x9aa0a8, metalness: 1, roughness: 0.26 }),
    forged: std({ color: 0x6d737b, metalness: 1, roughness: 0.38 }),
    polished: std({ color: 0xd4d8de, metalness: 1, roughness: 0.12 }),
    black: std({ color: 0x18191b, metalness: 0.35, roughness: 0.55 }),
    heat: std({ color: 0x8c6247, metalness: 1, roughness: 0.4 }),
    orange: std({ color: 0xe0581f, metalness: 0.2, roughness: 0.45 }),
    blue: std({ color: 0x3a78ff, metalness: 0.3, roughness: 0.35 }),
    friction: std({ color: 0x4d3f36, metalness: 0.1, roughness: 0.9 }),
    ring: std({ color: 0x2a2c30, metalness: 0.8, roughness: 0.5 }),
    gasket: std({ color: 0x55595f, metalness: 0.8, roughness: 0.5 }),
    liner: std({ map: honingTex(), metalness: 0.85, roughness: 0.32, side: THREE.BackSide }),
    belt: std({ map: beltTex(), metalness: 0.2, roughness: 0.7 }),
  };

  const seg = low ? 24 : 40;
  const engine = new THREE.Group();
  scene.add(engine);

  // Parça grubu: patlatma ofseti, gecikme ve uçarken küçük bir dönüş.
  const parts = [];
  const part = (name, offset, delay, { spin = [0, 0, 0], returns = true } = {}) => {
    const g = new THREE.Group();
    g.name = name;
    g.userData = { offset: new THREE.Vector3(...offset), delay, spin, returns };
    engine.add(g);
    parts.push(g);
    return g;
  };

  // --- Blok ---
  const block = part('block', [0, 0, -2.3], 0.42, { spin: [0, 0.12, 0] });
  {
    const geo = new THREE.ExtrudeGeometry(deckShape(), { depth: DECK - BOTTOM, bevelEnabled: false, curveSegments: seg });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, BOTTOM, 0);
    const ribs = [];
    for (const x of [-2.1, -1.05, 0, 1.05, 2.1]) {
      for (const z of [-0.65, 0.65]) {
        const b = new THREE.BoxGeometry(0.1, DECK - BOTTOM - 0.2, 0.06).toNonIndexed();
        b.translate(x, (DECK + BOTTOM) / 2, z);
        ribs.push(b);
      }
    }
    const top = new THREE.BoxGeometry(4.56, 0.08, 1.3).toNonIndexed();
    top.translate(0, BOTTOM + 0.04, 0);
    block.add(new THREE.Mesh(mergeGeometries([geo, ...ribs, top]), M.iron));
    const linerGeo = new THREE.CylinderGeometry(0.405, 0.405, DECK - BOTTOM - 0.01, seg, 1, true);
    for (const x of CYL) {
      const l = new THREE.Mesh(linerGeo, M.liner);
      l.position.set(x, (DECK + BOTTOM) / 2, 0);
      block.add(l);
    }
  }

  // --- Conta ---
  const gasket = part('gasket', [0, 0.65, 0], 0.16);
  {
    const geo = new THREE.ExtrudeGeometry(deckShape(), { depth: 0.03, bevelEnabled: false, curveSegments: seg });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, DECK, 0);
    gasket.add(new THREE.Mesh(geo, M.gasket));
  }

  // --- Silindir kapağı ---
  const head = part('head', [0, 1.3, 0], 0.12, { returns: false });
  {
    const m = new THREE.Mesh(new RoundedBoxGeometry(4.5, 0.55, 1.24, 3, 0.05), M.alu);
    m.position.y = DECK + 0.03 + 0.275;
    head.add(m);
    // Buji kuyuları
    const well = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16);
    for (const x of CYL) {
      const w = new THREE.Mesh(well, M.black);
      w.position.set(x, DECK + 0.62, 0);
      head.add(w);
    }
  }

  // --- Supaplar ve yaylar ---
  const valves = part('valves', [0, 2.05, 0], 0.08, { returns: false });
  {
    const stems = [];
    const springs = [];
    const helix = new (class extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) {
        const a = t * TAU * 7;
        return out.set(Math.cos(a) * 0.07, t * 0.34, Math.sin(a) * 0.07);
      }
    })();
    const springGeo = new THREE.TubeGeometry(helix, low ? 70 : 110, 0.013, 5, false);
    for (const x of CYL) {
      for (const z of [0.17, -0.17]) {
        const stem = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 10);
        stem.translate(x, 2.08, z);
        const disc = new THREE.CylinderGeometry(0.12, 0.05, 0.05, 24);
        disc.translate(x, 1.69, z);
        stems.push(stem, disc);
        const s = springGeo.clone();
        s.translate(x, 2.1, z);
        springs.push(s);
      }
    }
    valves.add(new THREE.Mesh(mergeGeometries(stems), M.polished), new THREE.Mesh(mergeGeometries(springs), M.forged));
  }

  // --- Eksantrikler ---
  const camsGroup = part('cams', [0, 2.8, 0], 0.04, { returns: false });
  const cams = [0.17, -0.17].map((z, k) => {
    const pieces = [];
    const shaft = new THREE.CylinderGeometry(0.055, 0.055, 4.4, 16);
    shaft.rotateZ(Math.PI / 2);
    pieces.push(shaft.toNonIndexed());
    CYL.forEach((x, i) => {
      const lobe = camLobe(FIRE[i] / 2 + k * 0.6);
      lobe.translate(x, 0, 0);
      pieces.push(lobe);
    });
    const m = new THREE.Mesh(mergeGeometries(pieces), M.polished);
    m.position.set(0, 2.55, z);
    camsGroup.add(m);
    return m;
  });

  // --- Külbütör kapağı + bobinler + döküm yazı ---
  const cover = part('cover', [0, 4.05, 0], 0, { returns: false, spin: [0.1, 0, 0] });
  {
    const m = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.5, 1.12, 4, 0.12), M.black);
    m.position.y = 2.47;
    cover.add(m);
    const ribGeo = new RoundedBoxGeometry(4.0, 0.04, 0.05, 1, 0.02);
    for (const z of [-0.46, 0.46]) {
      const r = new THREE.Mesh(ribGeo, M.castAlu);
      r.position.set(0, 2.73, z);
      cover.add(r);
    }
    const coilGeo = new RoundedBoxGeometry(0.34, 0.16, 0.26, 2, 0.04);
    for (const x of CYL) {
      const c = new THREE.Mesh(coilGeo, M.black);
      c.position.set(x, 2.8, -0.2);
      const plug = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), M.orange);
      plug.position.set(x + 0.1, 2.9, -0.2);
      cover.add(c, plug);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 24), M.orange);
    cap.position.set(1.75, 2.76, 0.28);
    cover.add(cap);
    if (name) {
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1, 0.39),
        new THREE.MeshStandardMaterial({ map: nameTex(name), transparent: true, metalness: 0.9, roughness: 0.28, alphaTest: 0.2 })
      );
      plate.rotation.x = -Math.PI / 2;
      plate.position.set(-0.2, 2.725, 0.26);
      cover.add(plate);
    }
  }

  // --- Krank, biyeller, pistonlar (yerinden oynamaz, hep döner) ---
  const crank = new THREE.Group();
  engine.add(crank);
  {
    const web = webGeometry(low ? 12 : 20);
    const journal = new THREE.CylinderGeometry(0.14, 0.14, 1, 24);
    journal.rotateZ(Math.PI / 2);
    for (let i = 0; i <= 4; i++) {
      const m = new THREE.Mesh(journal, M.polished);
      m.scale.x = i === 0 || i === 4 ? 0.5 : 0.62;
      m.position.x = (i - 2) * PITCH + (i === 0 ? -0.1 : i === 4 ? 0.1 : 0);
      crank.add(m);
    }
    const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.34, 24);
    pinGeo.rotateZ(Math.PI / 2);
    CYL.forEach((x, i) => {
      const phi = PHASE[i];
      const pin = new THREE.Mesh(pinGeo, M.polished);
      pin.position.set(x, R * Math.cos(phi), R * Math.sin(phi));
      crank.add(pin);
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(web, M.forged);
        w.position.x = x + side * 0.24;
        w.rotation.x = phi + Math.PI / 2;
        crank.add(w);
      }
    });
  }

  const rodGeo = new THREE.CylinderGeometry(0.055, 0.075, 1, 12);
  const bigEnd = new THREE.TorusGeometry(0.15, 0.05, 10, 24);
  bigEnd.rotateY(Math.PI / 2);
  const smallEnd = new THREE.TorusGeometry(0.08, 0.04, 8, 20);
  smallEnd.rotateY(Math.PI / 2);
  const pistonGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.46, seg);
  const crownGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.02, seg);
  const segGeo = new THREE.TorusGeometry(0.382, 0.012, 6, seg);
  segGeo.rotateX(Math.PI / 2);

  const cylinders = CYL.map((x) => {
    const rod = new THREE.Group();
    const shaft = new THREE.Mesh(rodGeo, M.steel);
    shaft.position.y = L / 2;
    const se = new THREE.Mesh(smallEnd, M.forged);
    se.position.y = L;
    rod.add(shaft, new THREE.Mesh(bigEnd, M.forged), se);
    const piston = new THREE.Group();
    const crownMat = std({ color: 0x5f5a55, metalness: 0.8, roughness: 0.6, emissive: 0xff4a0a, emissiveIntensity: 0 }); // isli piston tepesi
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.24;
    piston.add(new THREE.Mesh(pistonGeo, M.steel), crown);
    for (const y of [0.16, 0.1, 0.04]) {
      const s = new THREE.Mesh(segGeo, M.ring);
      s.position.y = y;
      piston.add(s);
    }
    engine.add(rod, piston);
    return { x, rod, piston, crownMat };
  });

  // --- Triger sistemi (ön) ---
  const belt = part('belt', [-1.6, 0, 0], 0.28, { spin: [0.15, 0, 0] });
  const pulleys = {};
  {
    const circles = [
      [0, 0, 0.36],
      [0.34, 2.55, 0.31],
      [-0.34, 2.55, 0.31],
      [0.55, 1.1, 0.2],
      [-0.47, 1.3, 0.14],
    ];
    const curve = beltCurve(circles);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, low ? 220 : 360, 0.022, 6, true), M.belt);
    tube.scale.x = 4;
    tube.position.x = FRONT_X;
    belt.add(tube);
    const mk = (r, teeth, y, z, mat, depth = 0.2) => {
      const g = new THREE.Group();
      g.position.set(FRONT_X, y, z);
      g.add(new THREE.Mesh(gearGeometry(r - 0.03, teeth, depth), mat));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, depth + 0.06, 20), M.polished);
      hub.rotation.z = Math.PI / 2;
      g.add(hub);
      belt.add(g);
      return g;
    };
    pulleys.crank = mk(0.34, 22, 0, 0, M.forged);
    pulleys.camA = mk(0.29, 30, 2.55, 0.34, M.forged);
    pulleys.camB = mk(0.29, 30, 2.55, -0.34, M.forged);
    pulleys.pump = mk(0.18, 16, 1.1, 0.55, M.castAlu);
    pulleys.tens = mk(0.12, 1, 1.3, -0.47, M.polished, 0.18);
    // Devirdaim gövdesi
    const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.26, 24), M.castAlu);
    pumpBody.rotation.z = Math.PI / 2;
    pumpBody.position.set(FRONT_X + 0.2, 1.1, 0.55);
    belt.add(pumpBody);
  }

  // --- Volan, debriyaj, baskı (arka) ---
  const flyGroup = part('flywheel', [1.0, 0, 0], 0.3, { spin: [0.2, 0, 0] });
  const flywheel = new THREE.Group();
  flywheel.position.x = 2.45;
  flyGroup.add(flywheel);
  {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 64), M.forged);
    f.rotation.z = Math.PI / 2;
    const teeth = new THREE.Mesh(gearGeometry(0.79, 90, 0.08, 0.025), M.steel);
    const bolts = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), M.polished);
      b.rotation.z = Math.PI / 2;
      const a = (i / 6) * TAU;
      b.position.set(0, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
      bolts.add(b);
    }
    flywheel.add(f, teeth, bolts);
  }
  const clutchGroup = part('clutch', [1.75, 0, 0], 0.33, { spin: [0.3, 0, 0] });
  const clutch = new THREE.Group();
  clutch.position.x = 2.58;
  clutchGroup.add(clutch);
  {
    const ringGeo = new THREE.LatheGeometry(
      [new THREE.Vector2(0.36, -0.025), new THREE.Vector2(0.6, -0.025), new THREE.Vector2(0.6, 0.025), new THREE.Vector2(0.36, 0.025), new THREE.Vector2(0.36, -0.025)],
      seg
    );
    ringGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, seg), M.forged);
    disc.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16), M.polished);
    hub.rotation.z = Math.PI / 2;
    clutch.add(new THREE.Mesh(ringGeo, M.friction), disc, hub);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), M.steel);
      const a = (i / 4) * TAU;
      s.position.set(0.02, Math.cos(a) * 0.24, Math.sin(a) * 0.24);
      s.rotation.x = a;
      clutch.add(s);
    }
  }
  const plateGroup = part('pressure', [2.45, 0, 0], 0.36, { spin: [0.35, 0, 0] });
  const plate = new THREE.Group();
  plate.position.x = 2.72;
  plateGroup.add(plate);
  {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, seg, 1, true), M.steel);
    shell.rotation.z = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.7, seg), M.steel);
    face.rotation.y = Math.PI / 2;
    face.position.x = 0.06;
    const fingers = [];
    for (let i = 0; i < 18; i++) {
      const b = new THREE.BoxGeometry(0.02, 0.3, 0.07);
      b.translate(0, 0.32, 0);
      b.rotateX((i / 18) * TAU);
      fingers.push(b);
    }
    const f = new THREE.Mesh(mergeGeometries(fingers), M.polished);
    f.position.x = 0.08;
    plate.add(shell, face, f);
  }

  // --- Karter ---
  const oilpan = part('oilpan', [0, -1.6, 0], 0.38, { spin: [0, 0, 0.06] });
  {
    const s = new THREE.Shape();
    s.moveTo(-0.64, 0);
    s.lineTo(0.64, 0);
    s.lineTo(0.46, -0.7);
    s.lineTo(-0.46, -0.7);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 4.4, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    g.rotateY(Math.PI / 2);
    g.translate(-2.2, BOTTOM, 0);
    oilpan.add(new THREE.Mesh(g, M.black));
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 6), M.polished);
    plug.position.set(1.2, BOTTOM - 0.73, 0);
    oilpan.add(plug);
  }
  const filter = part('filter', [0, -0.5, 1.3], 0.4, { spin: [0.4, 0, 0] });
  {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.38, 24), M.orange);
    f.rotation.x = Math.PI / 2;
    f.position.set(0.9, 0.2, 0.84);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 24), M.black);
    band.position.set(0.9, 0.2, 0.66);
    filter.add(f, band);
  }

  // --- Egzoz manifoldu (arka yan) ---
  const exhaust = part('exhaust', [0, 0, -1.7], 0.22, { spin: [0, 0, 0.08] });
  const outlet = new THREE.Vector3(0.4, 0.25, -1.75);
  {
    const tubes = [];
    for (const x of CYL) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 1.95, -0.6),
        new THREE.Vector3(x, 1.88, -0.95),
        new THREE.Vector3(lerp(x, 0.4, 0.55), 1.2, -1.12),
        new THREE.Vector3(0.4, 0.62, -1.08),
      ]);
      tubes.push(new THREE.TubeGeometry(c, 28, 0.085, 10, false));
    }
    const coll = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.4, 0.66, -1.08),
      new THREE.Vector3(0.4, 0.3, -1.15),
      new THREE.Vector3(0.4, 0.25, -1.5),
      outlet.clone(),
    ]);
    tubes.push(new THREE.TubeGeometry(coll, 24, 0.13, 14, false));
    exhaust.add(new THREE.Mesh(mergeGeometries(tubes), M.heat));
    const flange = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 24), M.forged);
    flange.position.copy(outlet);
    exhaust.add(flange);
  }
  const flames = [];
  const exMat = exhaustFlameMaterial();
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13 - i * 0.025, 1, 20, 1, true), exMat);
    cone.rotation.x = -Math.PI / 2; // uç -z yönüne
    cone.position.copy(outlet);
    cone.visible = false;
    exhaust.add(cone);
    flames.push(cone);
  }

  // --- Emme manifoldu ve enjektörler (ön yan) ---
  const intake = part('intake', [0, 0.25, 1.55], 0.2, { spin: [0, 0, -0.08] });
  {
    const tubes = [];
    for (const x of CYL) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 1.95, 0.6),
        new THREE.Vector3(x, 2.05, 0.95),
        new THREE.Vector3(x, 1.8, 1.25),
        new THREE.Vector3(x, 1.6, 1.3),
      ]);
      tubes.push(new THREE.TubeGeometry(c, 20, 0.09, 10, false));
    }
    intake.add(new THREE.Mesh(mergeGeometries(tubes), M.castAlu));
    const plenum = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.36, 0.46, 3, 0.14), M.castAlu);
    plenum.position.set(0, 1.5, 1.34);
    const throttle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 24), M.polished);
    throttle.rotation.z = Math.PI / 2;
    throttle.position.set(-2.05, 1.5, 1.34);
    intake.add(plenum, throttle);
  }
  const injectors = part('injectors', [0, 0.9, 1.0], 0.18, { spin: [0.12, 0, 0] });
  {
    for (const x of CYL) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.3, 12), M.polished);
      b.position.set(x, 2.02, 0.8);
      b.rotation.x = -0.5;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), M.blue);
      top.position.set(x, 2.14, 0.87);
      top.rotation.x = -0.5;
      injectors.add(b, top);
    }
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 12), M.steel);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 2.2, 0.92);
    injectors.add(rail);
  }

  // --- Yanma odası: alev diski, sis/duman partikülleri ---
  const fireMat = fireMaterial();
  const fireDisc = new THREE.Mesh(new THREE.CircleGeometry(0.4, 48), fireMat);
  fireDisc.rotation.x = -Math.PI / 2;
  fireDisc.visible = false;
  scene.add(fireDisc);

  const MIST = low ? 90 : 160;
  const mistSeed = new Float32Array(MIST * 3);
  const mistPos = new Float32Array(MIST * 3);
  const mistCol = new Float32Array(MIST * 3);
  for (let i = 0; i < MIST; i++) {
    const a = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * 0.34;
    mistSeed.set([Math.cos(a) * r, Math.random(), Math.sin(a) * r], i * 3);
  }
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  mistGeo.setAttribute('color', new THREE.BufferAttribute(mistCol, 3));
  const mistMat = new THREE.PointsMaterial({
    size: 0.05, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0,
  });
  const mist = new THREE.Points(mistGeo, mistMat);
  mist.visible = false;
  mist.frustumCulled = false;
  scene.add(mist);

  // Kıvılcımlar: finalde egzozdan saçılır.
  const SPARKS = low ? 70 : 140;
  const sparkPos = new Float32Array(SPARKS * 3).fill(-99);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    color: 0xffa04a, size: 0.05, map: dotTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkCursor = 0;
  const emit = (p, n, dir) => {
    for (let k = 0; k < n; k++) {
      const i = sparkCursor++ % SPARKS;
      sparkPos.set([p.x + (Math.random() - 0.5) * 0.1, p.y + (Math.random() - 0.5) * 0.1, p.z], i * 3);
      sparkVel.set([
        dir.x * 3 + (Math.random() - 0.5) * 2.2,
        dir.y * 3 + Math.random() * 1.8,
        dir.z * (3 + Math.random() * 3),
      ], i * 3);
      sparkLife[i] = 0.4 + Math.random() * 0.6;
    }
  };

  // Zemin gölgesi
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 5),
    new THREE.MeshBasicMaterial({
      map: canvasTex(256, 128, (g, w, h) => {
        const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        grd.addColorStop(0, 'rgba(0,0,0,.65)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      }),
      transparent: true, depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.05;
  engine.add(shadow);

  const haze = createHaze(renderer);

  // --- Durum (main.js yazar) ---
  const state = {
    hero: 0, // hero'dan çıkış 0..1
    explode: 0, // 0..1
    tourIn: 0, // tura giriş 0..1
    tour: 0, // 0..n-1
    dive: 0, // 0..1 silindire dalış
    stroke: 0, // 0..4 dört zaman
    re: false, // kepenk kapandı, motor toplandı
    finaleIn: 0, // 0..1
    ignite: 0, // 0..1
    velocity: 0, // scroll hızı
    pointer: { x: 0, y: 0 },
    intro: 1, // 1 → 0 açılış itişi
    covered: false,
    dim: 0,
  };
  let stops = [STOPS.overview];
  let stopKeys = ['overview'];

  // --- Kamera kurgusu ---
  const cam = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fov: 35, sx: 0, sy: 0 });
  const A = cam();
  const B = cam();
  const C = cam();
  const OUT = cam();
  const tmpV = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  const lerpCam = (a, b, t, out) => {
    out.pos.lerpVectors(a.pos, b.pos, t);
    out.look.lerpVectors(a.look, b.look, t);
    out.up.lerpVectors(a.up, b.up, t).normalize();
    out.fov = lerp(a.fov, b.fov, t);
    out.sx = lerp(a.sx, b.sx, t);
    out.sy = lerp(a.sy, b.sy, t);
    return out;
  };
  const copyCam = (a, out) => lerpCam(a, a, 0, out);

  let portrait = false;
  const k = (wide = false) => (portrait ? (wide ? 1.8 : 1.55) : 1);
  const orbit = (out, look, dir, dist, fov, sx, sy) => {
    tmpDir.set(...dir).normalize();
    out.look.set(...look);
    out.pos.copy(out.look).addScaledVector(tmpDir, dist * k(true));
    out.up.set(0, 1, 0);
    out.fov = portrait ? fov + 8 : fov;
    out.sx = portrait ? 0 : sx;
    out.sy = portrait ? sy : 0;
    return out;
  };

  let time = 0;
  function heroCam(out) {
    const a = (portrait ? 0.95 : 0.62) + Math.sin(time * 0.12) * 0.12 + state.pointer.x * 0.12;
    const dir = [Math.sin(a), 0.42 + state.pointer.y * 0.08 + state.hero * 0.2, Math.cos(a)];
    return orbit(out, [0, 1.0 + state.hero * 0.5, 0], dir, (portrait ? 10 : 11.5) + state.intro * 5 - state.hero * 0.8, 33, 0.22, 0.16);
  }
  function overviewCam(out) {
    return orbit(out, [0, 1.6, 0], [0.6, 0.38, 1], portrait ? 11.5 : 13.5, 35, 0.16, 0.12);
  }
  function tourCam(t, out) {
    const n = stops.length;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    const e = smooth((f - 0.22) / 0.56);
    const a = stops[i];
    const b = stops[Math.min(n - 1, i + 1)];
    out.look.set(lerp(a.focus[0], b.focus[0], e), lerp(a.focus[1], b.focus[1], e), lerp(a.focus[2], b.focus[2], e));
    tmpDir.set(...a.dir).normalize();
    tmpV.set(...b.dir).normalize();
    tmpDir.lerp(tmpV, e);
    tmpDir.y += Math.sin(e * Math.PI) * 0.5;
    tmpDir.normalize();
    const dist = lerp(a.dist, b.dist, e) + Math.sin(e * Math.PI) * 3.2;
    // Dururken hafif süzülme
    tmpDir.x += Math.sin(time * 0.3) * 0.03;
    out.pos.copy(out.look).addScaledVector(tmpDir.normalize(), dist * k());
    out.up.set(0, 1, 0);
    out.fov = portrait ? 43 : 35;
    out.sx = portrait ? 0 : 0.17;
    out.sy = portrait ? 0.15 : 0;
    return out;
  }
  // Dalış: önden boşluğa gir → silindirin üstüne → içine.
  function diveCam(d, from, out) {
    const x = CYL[0];
    const pA = cam();
    pA.pos.set(x + 0.2, 2.4, portrait ? 3.4 : 2.8);
    pA.look.set(x, 1.45, 0);
    pA.fov = portrait ? 52 : 42;
    const pB = cam();
    pB.pos.set(x, 2.78, 0.02);
    pB.look.set(x, 0.9, 0);
    pB.up.set(0, 0, -1);
    pB.fov = 52;
    const pC = cam();
    pC.pos.set(x, 1.98, 0.001);
    pC.look.set(x, 0.4, 0);
    pC.up.set(0, 0, -1);
    pC.fov = portrait ? 70 : 62;
    if (d < 0.45) return lerpCam(from, pA, smooth(d / 0.45), out);
    if (d < 0.75) return lerpCam(pA, pB, smooth((d - 0.45) / 0.3), out);
    return lerpCam(pB, pC, smooth((d - 0.75) / 0.25), out);
  }
  function bgCam(out) {
    const a = 0.7 + Math.sin(time * 0.08) * 0.35 + state.pointer.x * 0.1;
    return orbit(out, [0, 0.9, 0], [Math.sin(a), 0.36 + state.pointer.y * 0.06, Math.cos(a)], 9.4, 33, 0.24, 0.2);
  }
  function finaleCam(out) {
    // Egzoz tarafı, alevler görünsün
    const a = -2.35 + Math.sin(time * 0.1) * 0.08;
    return orbit(out, [0.2, 0.9, -0.6], [Math.sin(a), 0.32, Math.cos(a)], 10.5 - state.ignite * 1.6, 34, 0.2, 0.2);
  }

  function computeCamera() {
    if (!state.re) {
      heroCam(A);
      if (state.explode > 0) lerpCam(A, overviewCam(B), smooth(state.explode), A);
      if (state.tourIn > 0) lerpCam(A, tourCam(state.tour, B), smooth(state.tourIn), A);
      if (state.dive > 0) {
        tourCam(stops.length - 1, B);
        diveCam(state.dive, B, C);
        copyCam(C, A);
      }
    } else {
      bgCam(A);
      if (state.finaleIn > 0) lerpCam(A, finaleCam(B), smooth(state.finaleIn), A);
    }
    copyCam(A, OUT);
    // Ateşleme ve kontakta sarsıntı
    const shake = state.re ? state.ignite * state.ignite * 0.05 : fireAmt * 0.02;
    if (shake > 0.001) {
      OUT.pos.x += (Math.random() - 0.5) * shake;
      OUT.pos.y += (Math.random() - 0.5) * shake;
      OUT.pos.z += (Math.random() - 0.5) * shake;
    }
    camera.position.copy(OUT.pos);
    camera.up.copy(OUT.up);
    camera.lookAt(OUT.look);
    if (camera.fov !== OUT.fov) {
      camera.fov = OUT.fov;
    }
    const w = viewW;
    const h = viewH;
    camera.setViewOffset(w, h, -OUT.sx * w, OUT.sy * h, w, h);
  }

  // --- Poz ---
  let theta = 0;
  let thetaBase = null;
  let rpm = 850;
  let fireAmt = 0;
  const firedAt = new Float32Array(4).fill(-1);

  function poseParts() {
    const ex = state.re ? 0 : state.explode;
    const back = state.re ? 1 : smooth(state.dive / 0.45);
    for (const g of parts) {
      const { offset, delay, spin, returns } = g.userData;
      let e = smooth((ex - delay) / 0.58);
      if (returns) e *= 1 - back;
      g.position.copy(offset).multiplyScalar(e);
      const s = Math.sin(e * Math.PI);
      g.rotation.set(spin[0] * s, spin[1] * s, spin[2] * s);
    }
  }

  function poseCrank(dt) {
    const strokeMode = !state.re && state.dive > 0.5;
    if (strokeMode) {
      if (thetaBase === null) thetaBase = Math.round(theta / (4 * Math.PI)) * 4 * Math.PI;
      const target = thetaBase + state.stroke * Math.PI;
      theta += (target - theta) * Math.min(1, dt * 10);
    } else {
      thetaBase = null;
      theta += dt * (rpm / 60) * TAU * 0.12;
    }
    crank.rotation.x = theta;
    const cycle = ((theta % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
    cylinders.forEach((c, i) => {
      const a = theta + PHASE[i];
      const pinY = R * Math.cos(a);
      const pinZ = R * Math.sin(a);
      const py = pinY + Math.sqrt(L * L - pinZ * pinZ);
      c.piston.position.set(c.x, py, 0);
      c.rod.position.set(c.x, pinY, pinZ);
      c.rod.rotation.x = Math.atan2(-pinZ, py - pinY);
      let heat = 0;
      if (state.re && state.ignite > 0.05) {
        const since = (((cycle - FIRE[i]) % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
        heat = Math.exp(-since * 1.6) * state.ignite;
        const cycleNo = Math.floor((theta - FIRE[i]) / (4 * Math.PI));
        if (since < 0.8 && firedAt[i] !== cycleNo) {
          firedAt[i] = cycleNo;
          if (!reducedMotion && state.ignite > 0.25) emit(outletWorld, 3 + Math.round(state.ignite * 8), exDir);
        }
      }
      if (strokeMode && i === 0) {
        // Sıkıştırmada ısınır, ateşlemede kızarır, egzozda soğur
        const s = state.stroke;
        heat = s < 1 ? 0 : s < 2 ? (s - 1) * 0.3 : s < 3 ? 0.3 * (1 - (s - 2)) + fireAmt * 2.4 : 0;
      }
      c.crownMat.emissiveIntensity = heat * 3;
    });
    // Kasnaklar ve volan
    pulleys.crank.rotation.x = theta;
    pulleys.camA.rotation.x = theta / 2;
    pulleys.camB.rotation.x = theta / 2;
    pulleys.pump.rotation.x = theta * 1.4;
    pulleys.tens.rotation.x = theta * 2.6;
    cams[0].rotation.x = theta / 2;
    cams[1].rotation.x = theta / 2;
    M.belt.map.offset.x = (-theta * 0.36 * 170) / (7.8 * 1);
    flywheel.rotation.x = theta;
    clutch.rotation.x = theta;
    plate.rotation.x = theta;
  }

  const outletWorld = new THREE.Vector3();
  const exDir = new THREE.Vector3(0.1, -0.1, -1);

  function poseCombustion() {
    const inside = !state.re && state.dive > 0.7;
    const s = state.stroke;
    // Ateşleme penceresi 2.0 civarı
    fireAmt = inside && s >= 1.94 && s < 3 ? Math.exp(-Math.max(0, s - 2.02) * 3.2) * smooth((s - 1.94) / 0.08) * (1 - smooth((s - 2.7) / 0.3)) : 0;
    const crownY = cylinders[0].piston.position.y + 0.26;
    fireDisc.visible = fireAmt > 0.01;
    if (fireDisc.visible) {
      fireDisc.position.set(CYL[0], crownY + 0.01, 0);
      fireMat.uniforms.uAmt.value = fireAmt;
      fireMat.uniforms.uTime.value = time;
      const sc = 0.8 + fireAmt * 0.2;
      fireDisc.scale.set(sc, sc, sc);
    }
    fireLight.intensity = fireAmt * 14;
    // Silindirin içinde ortam yansımasını kıs, içerisi karanlık ve sıcak kalsın
    const inF = state.re ? 0 : smooth((state.dive - 0.25) / 0.45);
    scene.environmentIntensity = lerp(0.5, 0.05, inF);
    key.intensity = 2.3 * (1 - inF * 0.95);
    fill.intensity = 0.7 * (1 - inF);
    fireLight.position.y = crownY + 0.2;
    boreLight.intensity = inside ? 0.22 : 0;

    // Sis (emme/sıkıştırma) ve duman (egzoz)
    const intakeA = inside ? (s < 1 ? smooth(s / 0.15) : s < 2 ? 1 : 0) : 0;
    const smokeA = inside && s > 2.4 ? smooth((s - 2.4) / 0.4) * (1 - smooth((s - 3.85) / 0.15)) : 0;
    mist.visible = intakeA > 0 || smokeA > 0;
    if (mist.visible) {
      const top = 1.92;
      const compress = s >= 1 && s < 2;
      for (let i = 0; i < MIST; i++) {
        const sx = mistSeed[i * 3];
        const h0 = mistSeed[i * 3 + 1];
        const sz = mistSeed[i * 3 + 2];
        let h;
        let r = 1;
        let cr, cg, cb;
        if (smokeA > 0) {
          h = (h0 + time * 0.45) % 1;
          r = 0.7 + h * 0.5;
          cr = cg = cb = 0.16 + h0 * 0.1;
        } else {
          h = compress ? h0 : (h0 - time * 0.55 + 10) % 1;
          const warm = compress ? s - 1 : 0;
          cr = lerp(0.45, 1.0, warm);
          cg = lerp(0.7, 0.55, warm);
          cb = lerp(1.0, 0.2, warm);
        }
        mistPos[i * 3] = CYL[0] + sx * r;
        mistPos[i * 3 + 1] = crownY + 0.02 + h * (top - crownY);
        mistPos[i * 3 + 2] = sz * r;
        mistCol[i * 3] = cr;
        mistCol[i * 3 + 1] = cg;
        mistCol[i * 3 + 2] = cb;
      }
      mistGeo.attributes.position.needsUpdate = true;
      mistGeo.attributes.color.needsUpdate = true;
      mistMat.opacity = Math.max(intakeA * 0.8, smokeA * 0.5);
      mistMat.size = smokeA > 0 ? 0.07 : 0.04;
      mistMat.blending = smokeA > 0 ? THREE.NormalBlending : THREE.AdditiveBlending;
    }
  }

  function poseFinale(dt) {
    exhaust.updateMatrixWorld();
    outletWorld.copy(outlet).applyMatrix4(exhaust.matrixWorld);
    const ig = state.re ? state.ignite : 0;
    const on = ig > 0.2;
    const pulse = 0.75 + Math.sin(time * 40) * 0.15 + Math.random() * 0.1;
    flames.forEach((f, i) => {
      f.visible = on;
      if (!on) return;
      const len = (0.4 + ig * 1.6) * (1 - i * 0.2) * pulse;
      f.scale.set(1 + ig * 0.6, len, 1 + ig * 0.6);
      f.position.copy(outlet);
      f.position.z -= len / 2;
    });
    exMat.uniforms.uAmt.value = on ? smooth((ig - 0.2) / 0.3) : 0;
    exMat.uniforms.uTime.value = time;
    exhaustLight.position.copy(outletWorld).add(tmpV.set(0, 0.2, -0.6));
    exhaustLight.intensity = on ? ig * 16 * pulse : 0;
    under.intensity = 5 + ig * 6 * pulse;
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      sparkVel[i * 3 + 1] -= 5 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      if (sparkLife[i] <= 0) sparkPos[i * 3 + 1] = -99;
    }
    sparkGeo.attributes.position.needsUpdate = true;
  }

  // --- Ekran konumu: tur etiketinin gösterdiği nokta ---
  const projected = { x: 0, y: 0, stop: 0, alpha: 0 };
  const fp = new THREE.Vector3();
  function projectCallout() {
    const active = !state.re && state.tourIn > 0.6 && state.dive < 0.05;
    const i = Math.round(state.tour);
    const f = Math.abs(state.tour - i);
    projected.alpha = active ? 1 - smooth((f - 0.12) / 0.18) : 0;
    projected.stop = i;
    if (projected.alpha > 0) {
      fp.set(...stops[Math.min(i, stops.length - 1)].focus).project(camera);
      projected.x = (fp.x * 0.5 + 0.5) * viewW;
      projected.y = (-fp.y * 0.5 + 0.5) * viewH;
    }
  }

  // --- Döngü ---
  let viewW = 1;
  let viewH = 1;
  function resize() {
    viewW = canvas.clientWidth || innerWidth;
    viewH = canvas.clientHeight || innerHeight;
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    portrait = camera.aspect < 0.85;
    camera.updateProjectionMatrix();
  }

  let running = false;
  let raf = 0;
  let last = performance.now();
  let skip = false;
  let onFrame = null;

  function render(dt) {
    time += dt;
    // Devir: rölanti + scroll hızı; finalde kontakla kırmızı çizgiye
    let target = 850 + Math.min(3800, Math.abs(state.velocity) * 90);
    if (state.re && state.ignite > 0) target = lerp(target, 7200, smooth(state.ignite)) + Math.sin(time * 18) * 120 * state.ignite;
    rpm += (target - rpm) * Math.min(1, dt * (target > rpm ? 5 : 2));
    poseParts();
    poseCrank(dt);
    poseCombustion();
    poseFinale(dt);
    engine.position.y = Math.sin(time * 38) * 0.004 * (rpm / 3000);
    computeCamera();
    camera.updateProjectionMatrix();
    const hazeAmt = !state.re && state.dive > 0.7 ? Math.max(fireAmt, state.stroke > 2.4 ? 0.35 : 0) : state.re ? state.ignite * 0.5 : 0;
    if (hazeAmt > 0.02 && !low) haze.render(scene, camera, hazeAmt, time);
    else renderer.render(scene, camera);
    projectCallout();
    onFrame?.(projected, rpm);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    if (state.covered) {
      last = now;
      return;
    }
    // Arka plandayken yarım hızda çiz
    if (state.dim > 0.5) {
      skip = !skip;
      if (skip) return;
    }
    last = now;
    render(dt);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    state,
    scene,
    setStops(keys) {
      stopKeys = keys;
      stops = keys.map((k2) => STOPS[k2]);
    },
    get stops() {
      return stopKeys;
    },
    get rpm() {
      return rpm;
    },
    onFrame(fn) {
      onFrame = fn;
    },
    compile() {
      renderer.compile(scene, camera);
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce() {
      render(0.016);
    },
    resize,
  };
}
