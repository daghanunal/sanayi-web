// Silindir: karanlık atölyede tek spot ışığın altında duran gerçekçi dört silindirli motor
// (lib3d `engine` varlığı, `garage` HDRI). Scroll ile parça parça açılır, silindir 1'in içine
// dalınır (dört zaman), finalde kontak: devir kırmızı çizgiye çıkar, egzoz manifoldu kor gibi kızarır.
// Sahne durumu main.js'teki ScrollTrigger'lar tarafından `state` üzerinden sürülür.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

// Krank-biyel (assets3d/README.md): krank ekseni y=0.160, r=0.0418, L=0.140, faz [0, π, π, 0]
const CRANK_Y = 0.16;
const R = 0.0418;
const L = 0.14;
const PHASE = [0, Math.PI, Math.PI, 0];
const FIRE = [0, 3 * Math.PI, Math.PI, 2 * Math.PI]; // ateşleme sırası 1-3-4-2
const CYL_X = [0.132, 0.044, -0.044, -0.132];
const BORE = 0.039;
const DECK = 0.374;
const ROD_OFF = 0.0798; // biyel düğümü pim noktasının bu kadar altında
const TAU = Math.PI * 2;
const EXP = 1.2; // patlatma mesafesi çarpanı
const LIFT = 0.56; // patlatınca motor havaya kalkar (karter zemine gömülmesin)

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;
const pistonY = (a) => CRANK_Y + R * Math.cos(a) + Math.sqrt(L * L - (R * Math.sin(a)) ** 2);

// Tur durakları: odaklanılan düğüm (patlatılmış halde), kamera yönü ve uzaklığı (metre).
export const STOPS = {
  rotating: { node: 'piston_2', dir: [0.15, 0.5, 1], dist: 1.1, label: 'Piston, segman, biyel, krank' },
  head: { node: 'head', dir: [0.3, 0.9, 1], dist: 1.1, label: 'Silindir kapağı, supaplar, eksantrik' },
  belt: { node: 'timing_belt', dir: [1, 0.35, 0.5], dist: 1.0, label: 'Triger kayışı, gergi, kasnaklar' },
  clutch: { node: 'flywheel', dir: [-1, 0.32, 0.12], dist: 1.0, label: 'Volan ve krank arkası' },
  oilpan: { node: 'oil_filter', dir: [0.25, 0.55, 1], dist: 0.95, label: 'Karter ve yağ filtresi' },
  overview: { node: 'block', dir: [0.6, 0.4, 1], dist: 2.1, label: 'Motor ve aktarma organları' },
  injectors: { node: 'fuel_rail', dir: [0.3, 0.7, -1], dist: 0.95, label: 'Enjektörler, yakıt rampası' },
  pump: { node: 'coolant_hose', dir: [-0.9, 0.5, 0.8], dist: 0.95, label: 'Su hortumu ve soğutma devresi' },
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

// Patlatma sırası: üstten alta, dıştan içe (gecikme, 0..0.45)
const DELAY = [
  [/^valve_cover/, 0], [/^coil_/, 0.02], [/^timing_cover/, 0.04], [/^accessory_belt|^dipstick/, 0.08],
  [/^camshaft_/, 0.08], [/^fuel_rail|^coolant_hose/, 0.11], [/^timing_belt|^cam_pulley/, 0.13],
  [/^head$/, 0.15], [/^tensioner|^alternator/, 0.16], [/^intake_manifold|^exhaust_manifold/, 0.19],
  [/^injector_/, 0.21], [/^head_gasket/, 0.22], [/^piston_/, 0.27], [/^oil_filter|^starter|^mount_/, 0.3],
  [/^crankshaft/, 0.34], [/^crank_pulley|^flywheel/, 0.37], [/^oil_pan/, 0.4],
];
// Dalışta yukarıda kalan (silindirin üstü açık kalsın diye) parçalar
const KEEP_UP = /^(valve_cover|coil_|camshaft_|cam_pulley|head$|head_gasket|fuel_rail|injector_)/;

// --- Dokular --------------------------------------------------------------

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Beton zemin: lekeler, yağ izleri, ince kum dokusu (renk + pürüzlülük)
function concrete(size) {
  const rnd = mulberry(7);
  const blot = (g, w, h, n, rMin, rMax, col) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = rMin + rnd() * (rMax - rMin);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, col);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };
  const color = canvasTex(size, size, (g, w, h) => {
    g.fillStyle = '#403d3a';
    g.fillRect(0, 0, w, h);
    blot(g, w, h, 60, w * 0.05, w * 0.22, 'rgba(30,28,26,.18)');
    blot(g, w, h, 40, w * 0.04, w * 0.16, 'rgba(120,114,106,.12)');
    blot(g, w, h, 7, w * 0.03, w * 0.1, 'rgba(12,10,8,.45)'); // yağ lekesi
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rnd() - 0.5) * 26;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // derz çizgisi
    g.strokeStyle = 'rgba(20,18,16,.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, h * 0.62);
    g.lineTo(w, h * 0.62);
    g.stroke();
  });
  const rough = canvasTex(size / 2, size / 2, (g, w, h) => {
    g.fillStyle = '#d0d0d0';
    g.fillRect(0, 0, w, h);
    blot(g, w, h, 10, w * 0.04, w * 0.12, 'rgba(40,40,40,.7)'); // yağ lekeleri parlak
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rnd() - 0.5) * 40;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  }, false);
  for (const t of [color, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.2, 2.2);
  }
  return { color, rough };
}

function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const discTex = (inner = 0.35) =>
  canvasTex(64, 64, (g) => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(inner, 'rgba(255,255,255,.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  });

// Bokeh: arka plandaki atölye lambaları, odak dışı yumuşak halkalar
const bokehTex = () =>
  canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,255,255,.55)');
    grd.addColorStop(0.78, 'rgba(255,255,255,.7)');
    grd.addColorStop(0.9, 'rgba(255,255,255,.95)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

// --- Alev / ısı shader'ları ---------------------------------------------------

const NOISE = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`;

// Yanma: bujiden (merkez) yayılan alev cephesi
const fireMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 }, uFront: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAmt, uFront; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float a = atan(p.y, p.x);
        float n = fbm(vec2(a * 3.0, r * 5.0 - uTime * 6.0)) + 0.6 * fbm(p * 12.0 + uTime * 2.5);
        float front = uFront * 1.25 + (n - 0.55) * 0.35;
        float body = smoothstep(front, front - 0.35, r) * mix(1.0, 0.3, uFront) * (0.35 + n * 0.8);
        float edge = smoothstep(0.18, 0.0, abs(r - front)) * 0.9;
        float f = clamp(body * (0.55 + n * 0.6) + edge, 0.0, 1.4);
        vec3 col = mix(vec3(0.95, 0.22, 0.03), vec3(1.0, 0.66, 0.22), clamp(f, 0.0, 1.0));
        col = mix(col, vec3(1.0, 0.96, 0.85), smoothstep(0.95, 1.3, f));
        col = mix(col, vec3(0.3, 0.5, 1.0), smoothstep(0.35, 0.0, r) * 0.55 * (1.0 - uFront));
        float fade = smoothstep(1.0, 0.92, r);
        float streak = 0.6 + 0.4 * fbm(vec2(a * 6.0 + uTime, r * 10.0 - uTime * 7.0));
        gl_FragColor = vec4(col * f * streak * uAmt * 1.25 * fade, f * uAmt * fade);
      }`,
  });

// Isı titremesi: sahneyi bir hedefe çizip gürültüyle kaydırarak geri basar (yalnız 'hi').
function createHaze(renderer) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 0, type: THREE.HalfFloatType });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: rt.texture }, uTime: { value: 0 }, uAmt: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMap; uniform float uTime, uAmt; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 q = vUv * vec2(6.0, 10.0) + vec2(0.0, -uTime * 2.2);
        vec2 off = vec2(fbm(q) - 0.5, fbm(q + 7.3) - 0.5) * 0.022 * uAmt;
        gl_FragColor = texture2D(tMap, vUv + off);
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
  };
}

// --- Motor ----------------------------------------------------------------

export function createEngine(canvas, { reducedMotion = false } = {}) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lo ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const BG = new THREE.Color('#0c0b0d');
  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.FogExp2(BG, 0.34);
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.004, 40);

  // Işık: tavandan tek sıcak spot (anahtar), arkadan kor turuncusu kontur, soğuk dolgu HDRI'dan.
  const key = new THREE.SpotLight(0xffe0bd, 62, 7, 0.38, 0.9, 2);
  key.position.set(0.7, 2.7, 1.0);
  key.target.position.set(0, 0.25, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 12;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 5;
  const rim = new THREE.SpotLight(0xff6a2c, 20, 6, 0.55, 0.9, 2);
  rim.position.set(-1.3, 1.0, -1.6);
  rim.target.position.set(0, 0.3, 0);
  const kick = new THREE.DirectionalLight(0x9db8ff, 0.35); // pencereden soğuk yan ışık
  kick.position.set(-3, 1.5, 2);
  const fireLight = new THREE.PointLight(0xff6a1a, 0, 0.35, 2);
  const boreLight = new THREE.SpotLight(0xfff0dc, 0, 1.2, 0.16, 0.6, 2); // silindirin içine düşen atölye ışığı
  boreLight.position.set(CYL_X[0] + 0.02, DECK + 0.6, 0.05);
  boreLight.target.position.set(CYL_X[0], 0.25, 0);
  scene.add(boreLight.target);
  const bounce = new THREE.PointLight(0xd8cfc4, 0, 0.16, 2); // piston tepesinden gömleğe sekme ışığı
  scene.add(bounce);
  const glow = new THREE.PointLight(0xff4a12, 0, 1.6, 2); // kızaran manifoldun zemine vurması
  glow.position.set(0, 0.2, 0.42);
  scene.add(key, key.target, rim, rim.target, kick, fireLight, boreLight, glow);

  // Zemin: beton, spot dairesinin dışında karanlığa kaybolur
  const tex = concrete(lo ? 512 : 1024);
  const floorMat = new THREE.MeshStandardMaterial({
    map: tex.color, roughnessMap: tex.rough, roughness: 0.9, metalness: 0, envMapIntensity: 0.18,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // Temas gölgesi: karterin zemine oturduğu yerde yumuşak kararma (AO)
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.9),
    new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, depthWrite: false, opacity: 0.85,
      alphaMap: canvasTex(128, 128, (g) => {
        const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
        grd.addColorStop(0, '#fff');
        grd.addColorStop(0.45, '#888');
        grd.addColorStop(1, '#000');
        g.fillStyle = grd;
        g.fillRect(0, 0, 128, 128);
      }, false),
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(-0.02, 0.001, -0.01);
  scene.add(contact);
  const rig = new THREE.Group();
  scene.add(rig);

  // Arka plan: odak dışı atölye lambaları (bokeh) ve spot ışığında süzülen toz
  const bokeh = new THREE.Group();
  {
    const rnd = mulberry(11);
    const map = bokehTex();
    const cols = [0xffc58a, 0xffe7c8, 0x9fc4ff, 0xff8a4a, 0xfff2dd];
    for (let i = 0; i < (lo ? 14 : 22); i++) {
      const m = new THREE.SpriteMaterial({ map, color: cols[i % cols.length], transparent: true, opacity: 0.1 + rnd() * 0.16, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const s = new THREE.Sprite(m);
      const a = -2.2 + rnd() * 2.6; // arkada yay boyunca
      const r = 4.5 + rnd() * 3;
      s.position.set(Math.sin(a) * r, 0.5 + rnd() * 2.6, Math.cos(a) * r * -1);
      s.scale.setScalar(0.25 + rnd() * 0.55);
      bokeh.add(s);
    }
    // uzun floresan: yatay iki soğuk bant
    for (let i = 0; i < 3; i++) {
      const m = new THREE.SpriteMaterial({ map: discTex(0.6), color: 0xdfe9ff, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const s = new THREE.Sprite(m);
      s.position.set(-3 + i * 3, 3.2, -6.5);
      s.scale.set(2.4, 0.22, 1);
      bokeh.add(s);
    }
  }
  scene.add(bokeh);

  const DUST = lo ? 70 : 150;
  const dustSeed = new Float32Array(DUST * 4);
  const dustPos = new Float32Array(DUST * 3);
  {
    const rnd = mulberry(5);
    for (let i = 0; i < DUST; i++) dustSeed.set([rnd() * 2 - 1, rnd(), rnd() * 2 - 1, rnd()], i * 4);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.006, map: discTex(), color: 0xffe2c0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  // Yanma odası: alev diski, sis/duman partikülleri
  const fireMat = fireMaterial();
  const fireDisc = new THREE.Mesh(new THREE.CircleGeometry(BORE - 0.0005, 48), fireMat);
  fireDisc.rotation.x = -Math.PI / 2;
  fireDisc.visible = false;
  scene.add(fireDisc);

  const MIST = lo ? 180 : 320;
  const mistSeed = new Float32Array(MIST * 3);
  const mistPos = new Float32Array(MIST * 3);
  const mistCol = new Float32Array(MIST * 3);
  {
    const rnd = mulberry(3);
    for (let i = 0; i < MIST; i++) {
      const a = rnd() * TAU;
      const r = Math.sqrt(rnd()) * (BORE - 0.004);
      mistSeed.set([Math.cos(a) * r, rnd(), Math.sin(a) * r], i * 3);
    }
  }
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  mistGeo.setAttribute('color', new THREE.BufferAttribute(mistCol, 3));
  const mistMat = new THREE.PointsMaterial({
    size: 0.004, map: discTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
  });
  const mist = new THREE.Points(mistGeo, mistMat);
  mist.visible = false;
  mist.frustumCulled = false;
  scene.add(mist);

  const haze = lo ? null : createHaze(renderer);

  // --- Durum (main.js yazar) ---
  const state = {
    hero: 0, explode: 0, tourIn: 0, tour: 0, dive: 0, stroke: 0, re: false,
    finaleIn: 0, ignite: 0, velocity: 0, pointer: { x: 0, y: 0 }, intro: 1, covered: false, dim: 0,
  };
  let stopKeys = ['overview'];
  let stops = [STOPS.overview];

  // --- Varlık ---
  let E = null; // lib3d engine
  const parts = []; // { o, base, end, delay, up }
  const focus = {}; // düğüm adı → patlatılmış haldeki merkez (dünya)
  let pistons = [];
  let heatMat = null;
  let crownMat = null;
  const heatU = { value: 0 };
  const liftU = { value: 0 };
  let ready = false;
  let resolveReady;
  const readyP = new Promise((r) => (resolveReady = r));

  async function load() {
    const [env, asset] = await Promise.all([
      loadEnv('garage', renderer, { quality: q }),
      loadAsset('engine', { quality: q, renderer }),
    ]);
    scene.environment = env;
    E = asset;
    rig.add(E.scene);
    // Patlatma uçları: lib3d explode(1) → uç konum, explode(0) → taban
    const ex = [];
    E.scene.traverse((o) => {
      const v = o.userData && o.userData.explode;
      if (Array.isArray(v) && (v[0] || v[1] || v[2])) ex.push(o);
    });
    E.explode(1);
    const ends = ex.map((o) => o.position.clone());
    E.explode(0);
    ex.forEach((o, i) => {
      const base = o.position.clone();
      const end = base.clone().lerp(ends[i], EXP);
      const d = DELAY.find(([re]) => re.test(o.name));
      parts.push({ o, base, end, delay: d ? d[1] : 0.2, up: KEEP_UP.test(o.name) });
    });
    // Tur odakları: tam patlatılmış halde düğüm merkezleri
    poseParts(1, 0);
    rig.position.y = LIFT;
    rig.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const s of Object.values(STOPS)) {
      const n = E.nodes[s.node];
      if (n) focus[s.node] = box.setFromObject(n).getCenter(new THREE.Vector3());
    }
    poseParts(0, 0);
    rig.position.y = 0;
    pistons = [1, 2, 3, 4].map((i) => ({ p: E.nodes['piston_' + i], rod: E.nodes['conrod_' + i] }));
    // Malzeme ince ayarı: gerçek döküm/çelik tepkisi
    const M = E.materials;
    if (M.bore) {
      // Silindir gömleği: honlama çapraz izleri (dünya konumundan, UV gerektirmez)
      M.bore.roughness = 0.38;
      M.bore.metalness = 0.55;
      M.bore.color.set('#7f8286');
      M.bore.onBeforeCompile = (sh) => {
        sh.uniforms.uLift = liftU;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vBoreP; varying float vBoreV;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBoreP = (modelMatrix * vec4(position, 1.0)).xyz;\nvBoreV = 1.0 - abs(normalize(mat3(modelMatrix) * objectNormal).y);');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uLift; varying vec3 vBoreP; varying float vBoreV;')
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
            vec3 bp = vBoreP - vec3(0.0, uLift, 0.0);
            float bcx = (floor(bp.x / 0.088) + 0.5) * 0.088;
            float arc = atan(bp.z, bp.x - bcx) * 0.039;
            float pA = (arc + bp.y * 0.55) * 14000.0;
            float pB = (arc - bp.y * 0.55) * 14000.0 + 1.7;
            float aa = clamp(1.0 - max(fwidth(pA), fwidth(pB)) / 2.5, 0.0, 1.0);
            float hA = pow(0.5 + 0.5 * cos(pA), 4.0) * aa;
            float hB = pow(0.5 + 0.5 * cos(pB), 4.0) * aa;
            float near = 1.0 - smoothstep(0.08, 0.35, length(vViewPosition));
            float inBore = smoothstep(0.036, 0.0385, length(bp.xz - vec2(bcx, 0.0))) * (1.0 - smoothstep(0.0395, 0.041, length(bp.xz - vec2(bcx, 0.0))));
            float hatch = (hA + hB) * near * smoothstep(0.7, 0.95, vBoreV) * inBore;
            roughnessFactor = clamp(roughnessFactor + hatch * 0.18, 0.0, 1.0);
            diffuseColor.rgb *= 1.0 - hatch * 0.14;`
          );
      };
      M.bore.customProgramCacheKey = () => 'silindir-bore';
      M.bore.needsUpdate = true;
    }
    crownMat = M.piston_crown;
    if (crownMat) {
      crownMat.emissive = new THREE.Color(0xff4a0a);
      crownMat.emissiveIntensity = 0;
    }
    // Egzoz manifoldu: kontakta porttan kollektöre doğru kızarır (yerel y'ye göre)
    heatMat = M.exhaust_steel;
    if (heatMat) {
      heatMat.onBeforeCompile = (sh) => {
        sh.uniforms.uHeat = heatU;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vHeatY;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeatY = (modelMatrix * vec4(position, 1.0)).y;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uHeat; varying float vHeatY;')
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            float hy = smoothstep(0.17, 0.45, vHeatY);
            float h = uHeat * (0.35 + 0.65 * hy);
            vec3 hot = mix(vec3(0.55, 0.05, 0.0), vec3(1.0, 0.32, 0.04), clamp(h * 1.2, 0.0, 1.0));
            hot = mix(hot, vec3(1.0, 0.6, 0.28), smoothstep(0.9, 1.0, h) * 0.6);
            totalEmissiveRadiance += hot * h * h * 1.7;`
          );
      };
      heatMat.customProgramCacheKey = () => 'silindir-heat';
      heatMat.needsUpdate = true;
    }
    try {
      await renderer.compileAsync(scene, camera);
    } catch (_) {}
    ready = true;
    canvas.classList.add('is-ready');
    resolveReady();
  }
  load().catch((e) => {
    console.warn('silindir: motor yüklenemedi', e);
    canvas.classList.add('is-failed');
  });

  // --- Kamera kurgusu ---
  const cam = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fov: 30, sx: 0, sy: 0 });
  const A = cam();
  const B = cam();
  const C = cam();
  const OUT = cam();
  const pA = cam();
  const pB = cam();
  const pC = cam();
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
  const kd = (wide = false) => (portrait ? (wide ? 1.75 : 1.5) : 1);
  const orbit = (out, look, dir, dist, fov, sx, sy) => {
    tmpDir.set(...dir).normalize();
    out.look.set(...look);
    out.pos.copy(out.look).addScaledVector(tmpDir, dist * kd(true));
    out.up.set(0, 1, 0);
    out.fov = portrait ? fov + 8 : fov;
    out.sx = portrait ? 0 : sx;
    out.sy = portrait ? sy : 0;
    return out;
  };

  let time = 0;
  function heroCam(out) {
    const a = (portrait ? 0.78 : 0.62) + Math.sin(time * 0.11) * 0.1 + state.pointer.x * 0.1;
    const dir = [Math.sin(a), 0.2 + state.pointer.y * 0.04 + state.hero * 0.22, Math.cos(a)];
    return orbit(out, [0, 0.34 + state.hero * 0.05, 0], dir, (portrait ? 1.55 : 1.72) + state.intro * 0.9 - state.hero * 0.12, 30, 0.24, 0.2);
  }
  function overviewCam(out) {
    return orbit(out, [0, 0.36 + LIFT, 0], [0.62, 0.3, 1], portrait ? 1.6 : 2.25, 32, 0.16, 0.12);
  }
  function tourCam(t, out) {
    const n = stops.length;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    const e = smooth((f - 0.22) / 0.56);
    const a = stops[i];
    const b = stops[Math.min(n - 1, i + 1)];
    const fa = focus[a.node] || tmpV.set(0, 0.35, 0);
    const fb = focus[b.node] || fa;
    out.look.lerpVectors(fa, fb, e);
    tmpDir.set(...a.dir).normalize();
    const d2 = new THREE.Vector3(...b.dir).normalize();
    tmpDir.lerp(d2, e);
    tmpDir.y += Math.sin(e * Math.PI) * 0.5;
    tmpDir.x += Math.sin(time * 0.3) * 0.03;
    tmpDir.normalize();
    const dist = lerp(a.dist, b.dist, e) + Math.sin(e * Math.PI) * 0.6;
    out.pos.copy(out.look).addScaledVector(tmpDir, dist * kd());
    out.up.set(0, 1, 0);
    out.fov = portrait ? 40 : 32;
    out.sx = portrait ? 0 : 0.17;
    out.sy = portrait ? 0.16 : 0;
    return out;
  }
  // Dalış: silindir 1'in üstüne yaklaş → tam tepeden bak → deliğin içine in.
  function diveCam(d, from, out) {
    const x = CYL_X[0];
    pA.pos.set(x + 0.09, DECK + 0.24, portrait ? 0.4 : 0.34);
    pA.look.set(x, DECK - 0.02, 0);
    pA.up.set(0, 1, 0);
    pA.fov = portrait ? 46 : 38;
    pA.sx = 0;
    pA.sy = 0;
    pB.pos.set(x, DECK + 0.2, 0.002);
    pB.look.set(x, DECK - 0.1, 0);
    pB.up.set(0, 0, -1);
    pB.fov = portrait ? 50 : 44;
    pB.sx = 0;
    pB.sy = 0;
    pC.pos.set(x, DECK + 0.045, 0.0004);
    pC.look.set(x, 0.2, 0);
    pC.up.set(0, 0, -1);
    pC.fov = portrait ? 74 : 64;
    pC.sx = 0;
    pC.sy = 0;
    if (d < 0.45) return lerpCam(from, pA, smooth(d / 0.45), out);
    if (d < 0.75) return lerpCam(pA, pB, smooth((d - 0.45) / 0.3), out);
    return lerpCam(pB, pC, smooth((d - 0.75) / 0.25), out);
  }
  function bgCam(out) {
    const a = 0.7 + Math.sin(time * 0.07) * 0.32 + state.pointer.x * 0.08;
    return orbit(out, [0, 0.3, 0], [Math.sin(a), 0.34 + state.pointer.y * 0.05, Math.cos(a)], 1.65, 30, 0.24, 0.2);
  }
  function finaleCam(out) {
    // Egzoz tarafı, alçak açı: kızaran manifold ve zemine vuran kor ışığı
    const a = 0.32 + Math.sin(time * 0.1) * 0.05;
    return orbit(out, [0, 0.28, 0.12], [Math.sin(a), 0.16, Math.cos(a)], (portrait ? 1.05 : 1.45) - state.ignite * 0.18, 30, 0.2, 0.26);
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
    // Ateşleme ve kontakta sarsıntı (el kamerası hissi)
    const shake = state.re ? state.ignite * state.ignite * 0.006 : fireAmt * 0.0025;
    const hand = 0.0015;
    OUT.pos.x += Math.sin(time * 1.3) * hand + (Math.random() - 0.5) * shake;
    OUT.pos.y += Math.sin(time * 1.7 + 1) * hand * 0.7 + (Math.random() - 0.5) * shake;
    OUT.pos.z += (Math.random() - 0.5) * shake;
    camera.position.copy(OUT.pos);
    camera.up.copy(OUT.up);
    camera.lookAt(OUT.look);
    camera.fov = OUT.fov;
    camera.setViewOffset(viewW, viewH, -OUT.sx * viewW, OUT.sy * viewH, viewW, viewH);
  }

  // --- Poz ---
  let theta = 0;
  let thetaBase = null;
  let rpm = 850;
  let fireAmt = 0;
  let explodeAmt = 0;

  function poseParts(ex, back) {
    for (const pt of parts) {
      let e = smooth((ex - pt.delay) / 0.55);
      if (!pt.up) e *= 1 - back;
      pt.e = e;
      pt.o.position.lerpVectors(pt.base, pt.end, e);
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
      theta += dt * (rpm / 60) * TAU * (reducedMotion ? 0 : 0.1);
    }
    E.nodes.crankshaft.rotation.x = theta;
    E.nodes.camshaft_intake.rotation.x = theta / 2;
    E.nodes.camshaft_exhaust.rotation.x = theta / 2;
    // Pistonlar kranka bağlıyken hareket eder; patlatılınca yavaşça durur
    const conn = 1 - explodeAmt;
    pistons.forEach(({ p, rod }, i) => {
      const a = theta + PHASE[i];
      const dy = (pistonY(a) - pistonY(PHASE[i])) * conn;
      p.position.y += dy;
      const beta = -Math.asin((R * Math.sin(a)) / L) * conn;
      rod.rotation.x = beta;
      rod.position.set(0, -ROD_OFF * Math.cos(beta), -ROD_OFF * Math.sin(beta));
    });
    // Kontak: silindir sırasına göre piston tepeleri ısınır
    if (crownMat) {
      let heat = 0;
      if (strokeMode) {
        const s = state.stroke;
        heat = s < 1 ? 0 : s < 2 ? (s - 1) * 0.025 : s < 3 ? 0.025 * (1 - (s - 2)) + fireAmt * 0.12 : 0;
      }
      crownMat.emissiveIntensity = heat * 2.5;
    }
  }

  function poseCombustion() {
    const inside = !state.re && state.dive > 0.7;
    const s = state.stroke;
    fireAmt = inside && s >= 1.94 && s < 3 ? Math.exp(-Math.max(0, s - 2.05) * 2.6) * smooth((s - 1.94) / 0.08) * (1 - smooth((s - 2.75) / 0.25)) : 0;
    const p1 = pistons[0].p;
    const crownY = p1.position.y + 0.0285; // tepe yüzeyi
    fireDisc.visible = fireAmt > 0.01;
    if (fireDisc.visible) {
      fireDisc.position.set(CYL_X[0], crownY + 0.0015, 0);
      fireMat.uniforms.uAmt.value = fireAmt;
      fireMat.uniforms.uTime.value = time;
      fireMat.uniforms.uFront.value = smooth((s - 1.95) / 0.55);
    }
    fireLight.position.set(CYL_X[0], crownY + 0.02, 0);
    fireLight.intensity = fireAmt * 0.7;
    const inF = state.re ? 0 : smooth((state.dive - 0.3) / 0.45);
    scene.environmentIntensity = lerp(0.32, 0.5, inF);
    renderer.toneMappingExposure = lerp(1, 0.72, inF);
    key.intensity = 55 * (1 - inF * 0.85);
    rim.intensity = 28 * (1 - inF * 0.7);
    boreLight.intensity = inF * 0.3 * (1 - fireAmt * 0.6);
    bounce.position.set(CYL_X[0], crownY + 0.012, 0);
    bounce.intensity = inside ? 0.018 : 0;

    const intakeA = inside ? (s < 1 ? smooth(s / 0.15) : s < 2 ? 1 : 0) : 0;
    const smokeA = inside && s > 2.4 ? smooth((s - 2.4) / 0.4) * (1 - smooth((s - 3.85) / 0.15)) : 0;
    mist.visible = intakeA > 0 || smokeA > 0;
    if (mist.visible) {
      const top = DECK + 0.03;
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
          r = 0.75 + h * 0.4;
          cr = cg = cb = 0.14 + h0 * 0.08;
        } else {
          h = compress ? h0 : (h0 - time * 0.55 + 10) % 1;
          const warm = compress ? s - 1 : 0;
          cr = lerp(0.42, 1.0, warm);
          cg = lerp(0.66, 0.5, warm);
          cb = lerp(1.0, 0.18, warm);
        }
        // girdap: emmede partiküller dönerek iner
        const sw = smokeA > 0 ? 0 : time * 1.6 * (1 - h);
        const cs = Math.cos(sw);
        const sn = Math.sin(sw);
        mistPos[i * 3] = CYL_X[0] + (sx * cs - sz * sn) * r;
        mistPos[i * 3 + 1] = crownY + 0.002 + h * (top - crownY);
        mistPos[i * 3 + 2] = (sx * sn + sz * cs) * r;
        mistCol[i * 3] = cr;
        mistCol[i * 3 + 1] = cg;
        mistCol[i * 3 + 2] = cb;
      }
      mistGeo.attributes.position.needsUpdate = true;
      mistGeo.attributes.color.needsUpdate = true;
      mistMat.opacity = Math.max(intakeA * 0.38, smokeA * 0.45);
      mistMat.size = smokeA > 0 ? 0.004 : 0.0016;
      mistMat.blending = smokeA > 0 ? THREE.NormalBlending : THREE.AdditiveBlending;
    }
  }

  function poseFinale() {
    const ig = state.re ? state.ignite : 0;
    heatU.value = smooth((ig - 0.25) / 0.6);
    const pulse = 0.85 + Math.sin(time * 31) * 0.08 + Math.random() * 0.07;
    glow.intensity = heatU.value * 2.2 * pulse;
    // Kontakta atölye ışığı hafifçe titrer (voltaj düşümü)
    if (ig > 0.05 && ig < 0.3) key.intensity *= 0.82 + Math.random() * 0.18;
  }

  function poseDust(dt) {
    for (let i = 0; i < DUST; i++) {
      const s = i * 4;
      const t = (dustSeed[s + 1] + time * 0.012 * (0.5 + dustSeed[s + 3])) % 1;
      // spot konisi içinde, yukarıdan aşağı yavaşça süzülür
      const y = 1.6 - t * 1.5;
      const spread = 0.15 + (1.6 - y) * 0.22;
      dustPos[i * 3] = 0.35 + dustSeed[s] * spread + Math.sin(time * 0.3 + i) * 0.02;
      dustPos[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = 0.45 + dustSeed[s + 2] * spread + Math.cos(time * 0.25 + i) * 0.02;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = 0.5 * (state.re ? 1 : 1 - smooth(state.dive / 0.4));
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
      const s = stops[Math.min(i, stops.length - 1)];
      fp.copy(focus[s.node] || tmpV.set(0, 0.35, 0)).project(camera);
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
    if (!ready) return;
    time += dt;
    let target = 850 + Math.min(3800, Math.abs(state.velocity) * 90);
    if (state.re && state.ignite > 0) target = lerp(target, 7000, smooth(state.ignite)) + Math.sin(time * 18) * 120 * state.ignite;
    rpm += (target - rpm) * Math.min(1, dt * (target > rpm ? 5 : 2));
    const ex = state.re ? 0 : state.explode;
    const back = state.re ? 1 : smooth(state.dive / 0.45);
    explodeAmt = Math.max(smooth(ex / 0.5) * (1 - back), 0);
    const lift = smooth(ex / 0.7) * (1 - back);
    rig.position.y = LIFT * lift;
    liftU.value = rig.position.y;
    key.target.position.y = 0.25 + LIFT * lift * 0.8;
    contact.material.opacity = 0.85 * (1 - lift);
    poseParts(ex, back);
    poseCrank(dt);
    poseCombustion();
    poseFinale();
    poseDust(dt);
    // Rölanti titreşimi
    E.scene.position.y = Math.sin(time * 41) * 0.0006 * (rpm / 3000) * (1 - explodeAmt);
    E.scene.rotation.x = Math.sin(time * 23) * 0.0012 * (rpm / 4000) * (1 - explodeAmt);
    computeCamera();
    camera.updateProjectionMatrix();
    const hazeAmt = !state.re && state.dive > 0.7 ? Math.max(fireAmt, state.stroke > 2.4 ? 0.3 : 0) : state.re ? heatU.value * 0.6 : 0;
    if (haze && hazeAmt > 0.02) haze.render(scene, camera, hazeAmt, time);
    else renderer.render(scene, camera);
    projectCallout();
    onFrame?.(projected, rpm);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    if (state.covered || document.hidden) {
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
    ready: readyP,
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
      readyP.then(() => render(0.016));
    },
    resize,
  };
}
