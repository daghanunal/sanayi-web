// Kalıcı WebGL sahnesi: gece pisti. lib3d teker (+ gece HDRI'si), ıslak asfalt ve eski patinaj izleri,
// uzakta sodyum lambaları, lastik dumanı, kar, lastik oteli rafları, hız tüneli, fren izi.
// main.js her karede bir "poz" verir; sahne ona göre kamerayı ve efektleri ayarlar.
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { manifest, LIB3D_URL, pickQuality } from '../../shared/lib3d.js';
import { createWheel } from './wheel.js';

const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function softSprite(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', mid = null) {
  return canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, inner);
    if (mid) grd.addColorStop(0.35, mid);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
}

// Asfalt: agrega taneleri, yağ lekeleri; pürüzlülük haritasında ıslak (parlak) yamalar
function asphalt(size) {
  const r = rng(7);
  const color = canvasTex(size, size, (g, w, h) => {
    g.fillStyle = '#1c1d20';
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() * 22) | 0;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n + 2;
    }
    g.putImageData(img, 0, 0);
    // agrega: açık gri taneler
    for (let i = 0; i < size * 3; i++) {
      const v = 70 + r() * 70;
      g.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + r() * 0.35})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6);
    }
    // lekeler
    for (let i = 0; i < 7; i++) {
      const x = r() * w, y = r() * h, rad = size * (0.05 + r() * 0.12);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(6,6,8,.45)');
      grd.addColorStop(1, 'rgba(6,6,8,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
  const rough = canvasTex(size / 2, size / 2, (g, w, h) => {
    g.fillStyle = '#d8d8d8';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const x = r() * w, y = r() * h, rad = w * (0.18 + r() * 0.22);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(150,150,150,.7)');
      grd.addColorStop(1, 'rgba(150,150,150,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, false);
  for (const t of [color, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.anisotropy = 8;
  }
  return { color, rough };
}

// Eski patinaj izleri (donut): yarı saydam koyu yaylar, iz içinde diş çizgileri
function donutMarks(size) {
  const r = rng(21);
  return canvasTex(size, size, (g, w) => {
    g.translate(w / 2, w / 2);
    const s = w / 10; // 10 birimlik düzlem
    const arcs = [
      [0.4, -0.3, 2.6, 0.2, 4.6], [-1.2, 0.8, 2.1, 2.6, 5.9], [1.8, 1.2, 1.7, 3.4, 6.1],
      [-0.2, -1.6, 3.2, 3.9, 5.3], [2.4, -2.2, 1.4, 0.4, 3.0],
    ];
    for (const [cx, cy, rad, a0, a1] of arcs) {
      for (let k = 0; k < 2; k++) {
        const rr = (rad + k * 0.52) * s;
        g.lineWidth = 0.2 * s;
        g.strokeStyle = `rgba(4,4,5,${0.28 + r() * 0.18})`;
        g.beginPath();
        g.arc(cx * s, cy * s, rr, a0, a1);
        g.stroke();
        g.lineWidth = 0.012 * s;
        g.strokeStyle = 'rgba(0,0,0,.25)';
        for (const o of [-0.06, 0.06]) {
          g.beginPath();
          g.arc(cx * s, cy * s, rr + o * s, a0, a1);
          g.stroke();
        }
      }
    }
  }, false);
}

function skidTexture() {
  const r = rng(3);
  return canvasTex(512, 64, (g) => {
    for (let x = 0; x < 512; x++) {
      const fade = Math.min(1, x / 60) * (0.55 + r() * 0.25);
      g.fillStyle = `rgba(5,5,6,${fade})`;
      g.fillRect(x, 8 + r() * 2, 1, 48 - r() * 4);
    }
    g.globalCompositeOperation = 'destination-out';
    for (let y = 14; y < 56; y += 7) {
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(0, y, 512, 1.5);
    }
  });
}

// Otel rafları için gerçek oranlı lastik kesiti (225/45: geniş sırt, alçak yanak)
function stackTyreGeometry(seg) {
  const pts = [
    [0.27, 0.12], [0.27, -0.12], [0.3, -0.148], [0.37, -0.156], [0.43, -0.15], [0.455, -0.128],
    [0.463, -0.075], [0.466, 0], [0.463, 0.075], [0.455, 0.128], [0.43, 0.15], [0.37, 0.156], [0.3, 0.148], [0.27, 0.12],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, seg);
}

// Gece HDRI'si (lib3d 'night', sodyum lambalı sokak), drift'e göre soğutulur: renk doygunluğu
// düşürülür, maviye çekilir. Böylece siyah jant bronz, lastik kahverengi görünmez; sarı yalnız vurgu kalır.
async function nightEnv(renderer, quality) {
  const m = await manifest();
  const e = m.envs.night;
  const file = (e[quality] || e.hi).file;
  const hdr = await new HDRLoader().setDataType(THREE.FloatType).loadAsync(LIB3D_URL + file);
  const a = hdr.image.data;
  for (let i = 0; i < a.length; i += 4) {
    const l = a[i] * 0.2126 + a[i + 1] * 0.7152 + a[i + 2] * 0.0722;
    a[i] = (l + (a[i] - l) * 0.22) * 0.92;
    a[i + 1] = (l + (a[i + 1] - l) * 0.22) * 0.98;
    a[i + 2] = (l + (a[i + 2] - l) * 0.22) * 1.12;
  }
  hdr.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();
  return tex;
}

export async function createStage(canvas, { ad, olcu, since }) {
  const quality = pickQuality();
  const lo = quality === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const maxDpr = lo ? 1.25 : 1.5;
  let dpr = Math.min(devicePixelRatio, maxDpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 120);

  // Işıklar: soğuk anahtar ışık (gölgeli), arkadan sarı kontur, fren ısısı, zayıf dolgu
  const key = new THREE.DirectionalLight('#d6e0ff', 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 12;
  Object.assign(key.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 16 });
  key.shadow.camera.updateProjectionMatrix();
  const keyOff = new THREE.Vector3(2.6, 5.2, 3.6);
  const back = new THREE.SpotLight('#ffb800', 22, 12, 0.3, 0.8, 1.6);
  back.position.set(-3.0, 2.2, -3.4);
  const heatLight = new THREE.PointLight('#ff5a1a', 0, 3.2, 1.8);
  heatLight.position.set(0, 0.05, 0.05);
  const fill = new THREE.HemisphereLight('#8090b0', '#140f0a', 0.35);
  const amber = new THREE.PointLight('#ffc400', 0.9, 6, 2); // önden alçak sarı (drift sarısı)
  amber.position.set(2.4, 0.1, 2.4);
  scene.add(key, key.target, back, back.target, heatLight, fill, amber);

  // --- Zemin: ıslak asfalt + eski izler + temas gölgesi ---
  const asp = asphalt(lo ? 512 : 1024);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asp.color, roughnessMap: asp.rough, color: '#8a8c92', roughness: 0.9, metalness: 0,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.0;
  ground.receiveShadow = true;
  scene.add(ground);
  const marks = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
      color: '#050506', roughness: 0.6, transparent: true, alphaMap: donutMarks(lo ? 512 : 1024), depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    })
  );
  marks.rotation.x = -Math.PI / 2;
  marks.rotation.z = 0.4;
  marks.position.set(-0.6, -0.999, -0.8);
  marks.receiveShadow = true;
  scene.add(marks);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.8),
    new THREE.MeshBasicMaterial({ map: softSprite('rgba(0,0,0,.9)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.5)'), transparent: true, depthWrite: false })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -0.997;
  scene.add(contact);

  const skid = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.62),
    new THREE.MeshBasicMaterial({ map: skidTexture(), transparent: true, depthWrite: false, opacity: 0.9 })
  );
  skid.rotation.x = -Math.PI / 2;
  skid.position.y = -0.995;
  skid.visible = false;
  scene.add(skid);

  // --- Uzakta sodyum lambaları ve bokeh ---
  const bokeh = new THREE.Group();
  {
    const r = rng(11);
    const map = softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 'rgba(255,255,255,.55)');
    const cols = ['#ffb35a', '#ffc983', '#ff9a3c', '#d9e6ff', '#ffb35a'];
    for (let i = 0; i < (lo ? 12 : 20); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map, color: cols[i % cols.length], transparent: true, opacity: 0.12 + r() * 0.22,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
      const a = r() * TAU;
      const rad = 13 + r() * 7;
      s.position.set(Math.cos(a) * rad, 0.2 + r() * 3.6, Math.sin(a) * rad);
      s.scale.setScalar(0.5 + r() * 1.1);
      bokeh.add(s);
    }
  }
  scene.add(bokeh);

  // --- Disk ısı parlaması (jant kollarının arasından görünür) ---
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softSprite('rgba(255,120,40,1)', 'rgba(255,60,0,0)'), blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0,
  }));
  glow.scale.setScalar(1.35);

  // --- Lastik dumanı ---
  const SMOKE = lo ? 120 : 240;
  const smokeGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SMOKE * 3);
  const sSize = new Float32Array(SMOKE);
  const sAlpha = new Float32Array(SMOKE);
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute('size', new THREE.BufferAttribute(sSize, 1));
  smokeGeo.setAttribute('alpha', new THREE.BufferAttribute(sAlpha, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 300 }, uColor: { value: new THREE.Color('#cfcbc4') }, uWarm: { value: new THREE.Color('#ffb870') }, uHeat: { value: 0 } },
    vertexShader: `
      attribute float size; attribute float alpha; varying float vA; varying float vH; uniform float uScale;
      void main() {
        vA = alpha;
        vH = clamp(1.0 - (position.y + 1.0) * 0.9, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA; varying float vH; uniform vec3 uColor; uniform vec3 uWarm; uniform float uHeat;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(uColor, uWarm, vH * uHeat * 0.55);
        gl_FragColor = vec4(c, a * a * vA);
      }`,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = 2;
  scene.add(smoke);
  const smokeLife = new Float32Array(SMOKE).fill(-1);
  const smokeVel = new Float32Array(SMOKE * 3);
  let smokeCursor = 0;
  let smokeAcc = 0;

  // --- Kar ---
  const SNOW = lo ? 160 : 320;
  const snowGeo = new THREE.BufferGeometry();
  const nPos = new Float32Array(SNOW * 3);
  {
    const r = rng(5);
    for (let i = 0; i < SNOW; i++) {
      nPos[i * 3] = (r() - 0.5) * 5;
      nPos[i * 3 + 1] = r() * 4 - 1.5;
      nPos[i * 3 + 2] = (r() - 0.5) * 4;
    }
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  const snowMat = new THREE.PointsMaterial({
    map: softSprite(), size: 0.045, transparent: true, depthWrite: false, opacity: 0, color: '#e8f4ff',
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  // --- Lastik oteli: iki yanda raf koridoru ---
  const otel = new THREE.Group();
  otel.visible = false;
  scene.add(otel);
  const STEP = lo ? 2.2 : 1.5;
  const COUNT = Math.floor(38 / STEP);
  const stacks = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < COUNT; i++) {
      for (const shelfY of [-0.95, 0.75]) {
        stacks.push({ x: side * 2.1, z: -4 - i * STEP, y: shelfY, h: 3 + ((i * 7 + (side > 0 ? 3 : 0)) % 3) });
      }
    }
  }
  const tiresTotal = stacks.reduce((a, s) => a + s.h, 0);
  const stackTire = new THREE.InstancedMesh(
    stackTyreGeometry(lo ? 22 : 32),
    new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.78, metalness: 0 }),
    tiresTotal
  );
  {
    const r = rng(9);
    let k = 0;
    const m = new THREE.Matrix4();
    for (const s of stacks) {
      for (let j = 0; j < s.h; j++) {
        m.makeRotationY(r() * TAU);
        m.setPosition(s.x + (r() - 0.5) * 0.04, s.y + 0.18 + j * 0.315, s.z);
        stackTire.setMatrixAt(k++, m);
      }
    }
  }
  otel.add(stackTire);
  const frameMat = new THREE.MeshStandardMaterial({ color: '#ffc400', roughness: 0.5, metalness: 0.3 });
  const postCount = Math.ceil(COUNT / 2) + 1;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 3.6, 0.07), frameMat, postCount * 4);
  {
    let k = 0;
    const m = new THREE.Matrix4();
    for (const side of [-1, 1]) {
      for (let i = 0; i < postCount; i++) {
        const z = -4 + STEP * 0.5 - i * STEP * 2;
        for (const dx of [-0.45, 0.45]) posts.setMatrixAt(k++, m.makeTranslation(side * 2.1 + dx, 0.6, z));
      }
    }
  }
  otel.add(posts);
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.7 }), 4);
  {
    let k = 0;
    const m = new THREE.Matrix4();
    for (const side of [-1, 1]) for (const y of [-0.97, 0.73]) boards.setMatrixAt(k++, m.makeTranslation(side * 2.1, y, -22));
  }
  otel.add(boards);
  const tags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ color: '#ffe46b' }), stacks.length);
  {
    const m = new THREE.Matrix4();
    stacks.forEach((s, i) => {
      m.makeRotationY(s.x > 0 ? -Math.PI / 2 : Math.PI / 2);
      m.setPosition(s.x - Math.sign(s.x) * 0.5, s.y + 0.2, s.z);
      tags.setMatrixAt(i, m);
    });
  }
  otel.add(tags);
  const strips = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 2.2), new THREE.MeshBasicMaterial({ color: '#fff4d6' }), COUNT);
  {
    const m = new THREE.Matrix4();
    for (let i = 0; i < COUNT; i++) {
      m.makeRotationX(Math.PI / 2);
      m.setPosition(0, 2.6, -4 - i * STEP * 1.2);
      strips.setMatrixAt(i, m);
    }
  }
  otel.add(strips);
  const otelFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 50), new THREE.MeshStandardMaterial({ color: '#202126', roughness: 0.35, metalness: 0.2 }));
  otelFloor.rotation.x = -Math.PI / 2;
  otelFloor.position.set(0, -1, -22);
  otel.add(otelFloor);
  const laneLine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 50), new THREE.MeshBasicMaterial({ color: '#ffc400' }));
  laneLine.rotation.x = -Math.PI / 2;
  laneLine.position.set(0, -0.99, -22);
  otel.add(laneLine);

  // --- Hız tüneli ---
  const TUN = lo ? 140 : 260;
  const tunnel = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.018, 0.018, 1),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    TUN
  );
  const tunData = [];
  {
    const r = rng(13);
    const yellowC = new THREE.Color('#ffc400');
    const whiteC = new THREE.Color('#dfe8ff');
    const hotC = new THREE.Color('#ff5a1f');
    for (let i = 0; i < TUN; i++) {
      tunData.push({ a: r() * TAU, r: 1.2 + r() * 2.6, z: -r() * 60, len: 0.6 + r() * 2.4 });
      tunnel.setColorAt(i, i % 5 === 0 ? yellowC : i % 11 === 0 ? hotC : whiteC);
    }
  }
  tunnel.visible = false;
  tunnel.frustumCulled = false;
  scene.add(tunnel);

  // --- Varlıklar: gece HDRI'si + teker ---
  const [env, wheel] = await Promise.all([
    nightEnv(renderer, quality),
    createWheel({ renderer, quality, ad, olcu, since }),
  ]);
  scene.environment = env;
  scene.add(wheel.root);
  wheel.root.add(glow, heatLight);
  glow.position.set(0, 0, 0.02);

  // --- Durum ---
  const tmpV = new THREE.Vector3();
  const camPos = new THREE.Vector3(0, 0, 6);
  const camTarget = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  let width = 1, height = 1;
  let spinAngle = 0;
  let viewOffset = [0, 0];
  let tunnelZ = 0;

  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    smokeMat.uniforms.uScale.value = height * dpr * 0.24;
    applyViewOffset();
  }
  function applyViewOffset() {
    const [ox, oy] = viewOffset;
    camera.setViewOffset(width, height, -ox * width, -oy * height, width, height);
  }

  // Performans: kare süresi uzunsa çözünürlüğü düşür
  let frameAcc = 0, frameN = 0;
  function adapt(dt) {
    if (!dt) return;
    frameAcc += dt;
    frameN++;
    if (frameN >= 40) {
      const avg = frameAcc / frameN;
      if (avg > 1 / 38 && dpr > 0.75) {
        dpr = Math.max(0.75, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        resize();
      }
      frameAcc = 0;
      frameN = 0;
    }
  }

  const sr = rng(17);
  function emitSmoke(amount, dt, origin) {
    smokeAcc += amount * dt * (lo ? 60 : 115);
    while (smokeAcc > 1) {
      smokeAcc -= 1;
      const i = smokeCursor;
      smokeCursor = (smokeCursor + 1) % SMOKE;
      smokeLife[i] = 0;
      sPos[i * 3] = origin.x + (sr() - 0.5) * 0.3;
      sPos[i * 3 + 1] = origin.y + sr() * 0.05;
      sPos[i * 3 + 2] = origin.z + (sr() - 0.5) * 0.5;
      smokeVel[i * 3] = -(0.8 + sr() * 1.6);
      smokeVel[i * 3 + 1] = 0.22 + sr() * 0.55;
      smokeVel[i * 3 + 2] = (sr() - 0.5) * 0.9;
    }
  }
  function updateSmoke(dt) {
    let any = false;
    for (let i = 0; i < SMOKE; i++) {
      if (smokeLife[i] < 0) {
        sAlpha[i] = 0;
        continue;
      }
      any = true;
      smokeLife[i] += dt / 2.8;
      const life = smokeLife[i];
      if (life >= 1) {
        smokeLife[i] = -1;
        sAlpha[i] = 0;
        continue;
      }
      smokeVel[i * 3] *= 1 - dt * 0.9;
      smokeVel[i * 3 + 1] *= 1 - dt * 0.4;
      sPos[i * 3] += smokeVel[i * 3] * dt;
      sPos[i * 3 + 1] += smokeVel[i * 3 + 1] * dt;
      sPos[i * 3 + 2] += smokeVel[i * 3 + 2] * dt;
      sSize[i] = 0.7 + life * 3.8;
      sAlpha[i] = Math.sin(Math.min(1, life * 4) * Math.PI * 0.5) * (1 - life) * 0.34;
    }
    if (any || smoke.visible) {
      smokeGeo.attributes.position.needsUpdate = true;
      smokeGeo.attributes.size.needsUpdate = true;
      smokeGeo.attributes.alpha.needsUpdate = true;
    }
    smoke.visible = any;
  }

  function updateSnow(amount, dt) {
    snow.visible = amount > 0.01;
    snowMat.opacity = amount * 0.9;
    if (!snow.visible) return;
    const t = performance.now() * 0.0005;
    for (let i = 0; i < SNOW; i++) {
      nPos[i * 3 + 1] -= dt * (0.25 + (i % 7) * 0.05);
      nPos[i * 3] += Math.sin(t + i) * dt * 0.08;
      if (nPos[i * 3 + 1] < -1) nPos[i * 3 + 1] = 2.5;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  function updateTunnel(amount, speed, dt) {
    tunnel.visible = amount > 0.01;
    if (!tunnel.visible) return;
    tunnelZ += dt * speed;
    tunnel.material.opacity = amount;
    for (let i = 0; i < TUN; i++) {
      const t = tunData[i];
      const z = ((((t.z + tunnelZ) % 60) + 60) % 60) - 55;
      m4.makeScale(1, 1, t.len * (1 + speed * 0.12));
      m4.setPosition(Math.cos(t.a) * t.r, Math.sin(t.a) * t.r, z);
      tunnel.setMatrixAt(i, m4);
    }
    tunnel.instanceMatrix.needsUpdate = true;
  }

  let labelEls = null;
  const project = (v) => {
    tmpV.copy(v).project(camera);
    return [(tmpV.x * 0.5 + 0.5) * width, (-tmpV.y * 0.5 + 0.5) * height, tmpV.z];
  };
  // Sis rengi ton eşlemeden geçer: bu değerler ekranda sayfa zeminine (#121316) oturur
  const FOG = { wheel: ['#232428', 7, 17], otel: ['#1f2024', 6, 26], tunnel: ['#232428', 200, 400] };
  const fog = new THREE.Fog('#232428', 7, 17);
  scene.fog = fog;

  function render(p, dt) {
    adapt(dt);
    // Kamera: dikey ekranda uzaklaş
    const portrait = width / height < 0.8;
    const fit = portrait ? p.fitPortrait ?? 1.75 : 1;
    camTarget.fromArray(p.target);
    camPos.fromArray(p.cam).sub(camTarget).multiplyScalar(fit).add(camTarget);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.rotation.z += p.roll ?? 0;
    const off = portrait ? p.offPortrait ?? [0, 0.14] : p.off ?? [0, 0];
    if (off[0] !== viewOffset[0] || off[1] !== viewOffset[1]) {
      viewOffset = off;
      applyViewOffset();
    }

    const showWheel = p.mode !== 'otel' && p.mode !== 'tunnel';
    wheel.root.visible = showWheel;
    ground.visible = marks.visible = contact.visible = bokeh.visible = showWheel;
    otel.visible = p.mode === 'otel';
    // Tek sis nesnesi (sis açılıp kapanınca gölgelendiriciler yeniden derlenmesin)
    const fs = p.mode === 'otel' ? FOG.otel : p.mode === 'tunnel' ? FOG.tunnel : FOG.wheel;
    fog.color.set(fs[0]);
    fog.near = fs[1];
    fog.far = fs[2];

    const tread = p.tread ?? 0;
    wheel.root.position.set(p.wheelX ?? 0, (p.wheelY ?? 0) + tread * 0.02, 0);
    wheel.root.rotation.set(p.tiltX ?? 0, p.yaw ?? 0, 0);
    spinAngle += (p.spin ?? 0) * dt;
    const angle = p.rollAngle != null ? p.rollAngle : spinAngle;
    wheel.spin.rotation.z = -angle;
    const wob = p.wobble ?? 0;
    if (wob > 0) {
      wheel.spin.rotation.x = Math.sin(angle) * wob * 0.09;
      wheel.spin.rotation.y = Math.cos(angle) * wob * 0.09;
      wheel.root.position.y += Math.sin(angle * 2) * wob * 0.02;
    } else {
      wheel.spin.rotation.x = wheel.spin.rotation.y = 0;
    }
    wheel.setExplode(p.explode ?? 0);
    wheel.setTread(tread);
    wheel.setWeights(p.weights ?? 0);
    const heat = p.heat ?? 0;
    wheel.setHeat(heat);
    glow.material.opacity = heat * 0.5;
    heatLight.intensity = heat * 9;
    smokeMat.uniforms.uHeat.value = heat;

    // Işıklar tekeri izler (final: teker düşer ve çıkar)
    const wx = wheel.root.position.x, wy = Math.max(0, wheel.root.position.y);
    key.target.position.set(wx, -0.6, 0);
    key.position.set(wx + keyOff.x, keyOff.y, keyOff.z);
    back.target.position.set(wx, 0.3, 0);
    contact.position.x = wx;
    contact.material.opacity = Math.max(0, 1 - wy * 0.6);

    if ((p.smoke ?? 0) > 0 && showWheel) {
      tmpV.set(wx + 0.25, -0.95, 0);
      emitSmoke(p.smoke, dt, tmpV);
    }
    updateSmoke(dt);
    updateSnow(p.snow ?? 0, dt);
    updateTunnel(p.tunnel ?? 0, p.tunnelSpeed ?? 8, dt);

    const sk = p.skid ?? 0;
    skid.visible = sk > 0.001 && showWheel;
    if (skid.visible) {
      const len = sk * (p.skidLen ?? 6);
      skid.scale.x = Math.max(0.01, len);
      skid.position.x = (p.skidFrom ?? 0) - len / 2;
      skid.material.opacity = Math.min(1, sk * 3) * 0.9;
    }

    renderer.render(scene, camera);

    // Parça etiketleri: parçanın noktası ekrana izdüşürülür
    if (p.labels && labelEls) {
      const placed = [];
      for (const [id, el] of labelEls) {
        if (!wheel.anchor(id, tmpV)) continue;
        let [x, y] = project(tmpV);
        x = Math.min(width - 14, Math.max(14, x));
        const left = x > width * 0.6;
        el.classList.toggle('is-left', left);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const box = el.lastElementChild;
        const w = box.offsetWidth, h = box.offsetHeight;
        if (w && h) placed.push({ box, y, l: left ? x - 20 - w : x + 20, r: left ? x - 20 : x + 20 + w, h });
      }
      // Kutular birbirinin üstüne binmesin (iPad yatayda jant/bijon): alttakini aşağı it
      placed.sort((a, b) => a.y - b.y);
      placed.forEach((a, i) => {
        let top = a.y - 16;
        for (let j = 0; j < i; j++) {
          const b = placed[j];
          if (a.l < b.r && a.r > b.l && top < b.top + b.h + 6) top = b.top + b.h + 6;
        }
        a.top = top;
        a.box.style.top = `${(top - a.y).toFixed(1)}px`;
      });
    }
  }

  resize();
  return {
    renderer, scene, camera, wheel, render, resize, quality,
    setLabels: (map) => (labelEls = map),
    get dpr() { return dpr; },
  };
}
