// Kütüphanedeki gerçekçi radyatör (lib3d `radiator`: panjurlu kanatçıklı petek, nervürlü plastik tanklar, fan
// davlumbazı) zincirle asılı, 3,35 kat büyütülmüş; test havuzu, kabarcıklar ve antifriz akışı burada çizilir.
// Havuz: dalgalanan su yüzeyi (üstten ve alttan farklı görünür), kostikli taban, kaçaktan
// yükselen kabarcıklar, kapaktan buhar, lehim kıvılcımı ve borularda akan pembe antifriz.
// Sahne durumu dışarıdan `update(state)` ile verilir; kamera ve kurgu main.js'tedir.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const L = (a, b, t) => a + (b - a) * t;

// Ölçüler (metre, sahne ölçeği). Petek x boyunca, borular yatay; su yüzeyi y = 0.
const SR = 3.35; // varlık metre → sahne
export const CORE = { w: 0.657 * SR, h: 0.427 * SR, d: 0.044 * SR, rows: 34 };
const TANK = { w: 0.064 * SR, h: 0.48 * SR, d: 0.046 * SR };
// Kaçak: sol tankın alt contası; kapak sağ tankın üstünde. Varlık yüklenince düğümlerden düzeltilir.
export const LEAK = V(-CORE.w / 2 - 0.05, -0.6, 0.1);
export const CAP = V(0.3475 * SR, TANK.h / 2 + 0.05, 0);
const POOL = { w: 6.4, d: 4.2, depth: 2.7 };

const PINK = new THREE.Color(0xff3d7f);
const SKY = new THREE.Color(0x100a1d);
const DEEP = new THREE.Color(0x05323b);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Havuz tabanındaki ışık ağı: iki dalga katmanının kesişimi
function causticTex() {
  const S = 256;
  return canvasTex(S, S, (g) => {
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = (x / S) * Math.PI * 2, v = (y / S) * Math.PI * 2;
        let a = Math.sin(u * 3 + Math.sin(v * 2) * 1.6) + Math.sin(v * 4 + Math.sin(u * 3) * 1.3);
        a += Math.sin((u + v) * 5 + Math.sin(u * 2 - v) * 1.1) * 0.6;
        const c = Math.pow(1 - Math.min(1, Math.abs(a) / 1.1), 5);
        const i = (y * S + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255 * c;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

function softDot() {
  return canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });
}

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const q = pickQuality();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = SKY.clone();
  scene.environmentIntensity = 0.5;
  scene.fog = new THREE.Fog(SKY.clone(), 8, 28);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 80);
  scene.add(camera);

  // --- Işıklar ----------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0x9a8cc4, 0x0b1216, 0.5);
  scene.add(hemi);
  const lamp = new THREE.SpotLight(0xfff0dc, 60, 14, 0.62, 0.55, 1.6); // tavandaki atölye lambası
  lamp.position.set(0.6, 5.2, 1.6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  lamp.shadow.bias = -0.0006;
  lamp.shadow.normalBias = 0.03;
  lamp.shadow.radius = 6;
  lamp.shadow.camera.near = 1;
  lamp.shadow.camera.far = 14;
  scene.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight(0xff7aa6, 1.1); // arkadan pembe kontur
  rim.position.set(-4, 2.5, -5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8fe8ee, 0.35);
  fill.position.set(5, 1, 4);
  scene.add(fill);
  const water = new THREE.PointLight(0x5fe0e6, 0, 7, 1.4); // su altında kamerayla gelen dolgu
  camera.add(water);
  water.position.set(0.3, 0.4, 0);
  const sparkLight = new THREE.PointLight(0xffb070, 0, 3, 1.5);
  scene.add(sparkLight);

  // --- Malzemeler -------------------------------------------------------------
  const M = {
    fin: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide }),
    tube: new THREE.MeshStandardMaterial({ color: 0xdadde2, metalness: 0.9, roughness: 0.28, emissive: PINK.clone(), emissiveIntensity: 0 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xbfc4ca, metalness: 0.95, roughness: 0.25 }),
    tank: new THREE.MeshStandardMaterial({ color: 0x16131b, metalness: 0.0, roughness: 0.48 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0f0f11, metalness: 0, roughness: 0.85 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: 1, roughness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x4a4f57, metalness: 0.8, roughness: 0.45 }),
    clamp: new THREE.MeshStandardMaterial({ color: 0xff3d7f, metalness: 0.3, roughness: 0.35 }),
    fan: new THREE.MeshStandardMaterial({ color: 0x1b1a20, metalness: 0.05, roughness: 0.55, side: THREE.DoubleSide }),
  };
  const CLEAN = new THREE.Color(0xd6d9dd), CLEAN_CORE = new THREE.Color(0xc9ccd1), DIRTY = new THREE.Color(0x5e4526);

  // --- Radyatör -----------------------------------------------------------------
  const rad = new THREE.Group(); // asılı gövde: y ile havuza iner
  const body = new THREE.Group(); // ölçek ve dönüş
  rad.add(body);
  scene.add(rad);

  const step = CORE.h / CORE.rows;
  const tm = new THREE.Matrix4();
  // Zincirler: tank üstlerinden tavana
  for (const sx of [-1, 1]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 7, 6), M.steel);
    chain.position.set(sx * (CORE.w / 2 - 0.12), CORE.h / 2 + 3.62, 0);
    body.add(chain);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 14), M.steel);
    hook.position.set(sx * (CORE.w / 2 - 0.12), CORE.h / 2 + 0.14, 0);
    body.add(hook);
  }
  // Kütüphane radyatörü: ön yüz +z (kameraya), fan davlumbazı arkada; petek merkezi gövdenin orijininde
  const rig = new THREE.Group();
  // z aynası: kapaklı tank sağa, kaçak veren tank sola gelir (three negatif ölçekte yüz yönünü düzeltir)
  rig.scale.set(SR, SR, -SR);
  rig.rotation.y = -Math.PI / 2;
  body.add(rig);
  let R = null, ready = false;
  const fanParts = {};
  const coreMats = [];
  let finMat = null;
  const readyP = (async () => {
    const [env, asset] = await Promise.all([loadEnv('garage', renderer, { quality: q }), loadAsset('radiator', { quality: q, renderer })]);
    scene.environment = env;
    R = asset;
    rig.add(R.scene);
    // petek merkezi (varlıkta x .074, y .252) orijine
    R.scene.position.set(-0.074, -0.252, 0);
    const N = R.nodes, Mt = R.materials;
    N.condenser.visible = false; // klima kondenseri bu işte ayrı
    for (const n of ['shroud', 'fan', 'fan_motor']) {
      const e = R.explodeData[n];
      fanParts[n] = { node: N[n], base: N[n].position.clone(), dir: e ? e.dir.clone() : V(-0.4, 0, 0) };
      N[n].visible = false;
    }
    if (Mt.tank_plastic) { Mt.tank_plastic.color.set(0x1a1620); Mt.tank_plastic.roughness = 0.5; }
    if (Mt.cap_black) { Mt.cap_black.color.set(0xff3d7f); Mt.cap_black.roughness = 0.35; }
    for (const k of ['alu_core', 'alu_header']) if (Mt[k]) { Mt[k].emissive = PINK.clone(); Mt[k].emissiveIntensity = 0; coreMats.push(Mt[k]); }
    finMat = Mt.fin || Mt.condenser_face || null;
    R.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // kaçak ve kapak noktaları: gerçek düğümlerden (aynadan sonra sol tank = tank_L, kapak sağda)
    rad.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(N.tank_L);
    const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
    LEAK.copy(V((box.min.x + box.max.x) / 2, box.min.y + 0.12, box.max.z)).applyMatrix4(inv);
    const cb = new THREE.Box3().setFromObject(N.cap);
    CAP.copy(cb.getCenter(V(0, 0, 0))).applyMatrix4(inv);
    ready = true;
  })();

  // Tank üstünde işletme adı (yazı fontu yüklenince çizilir)
  const nameMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, toneMapped: false, opacity: 0.85 });
  const namePlate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), nameMat);
  namePlate.rotation.z = Math.PI / 2;
  namePlate.position.set(-0.3475 * SR, 0.0, 0.1);
  namePlate.visible = false;
  body.add(namePlate);
  function drawName(name) {
    const tex = canvasTex(1024, 104, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      let size = 64;
      g.font = `${size}px 'Gasoek One', sans-serif`;
      const label = name.toLocaleUpperCase('tr');
      while (g.measureText(label).width > w - 40 && size > 20) g.font = `${(size -= 2)}px 'Gasoek One', sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, w / 2, h / 2 + 4);
    });
    nameMat.map?.dispose();
    nameMat.map = tex;
    nameMat.needsUpdate = true;
    namePlate.visible = true;
  }

  // Borularda akan antifriz: her boruda kuyruklu pembe darbeler
  const PER = lite ? 12 : 16;
  const flowN = CORE.rows * PER;
  const fRow = new Float32Array(flowN), fPhase = new Float32Array(flowN), fTail = new Float32Array(flowN), fRank = new Float32Array(flowN);
  const ranks = [...Array(CORE.rows).keys()].sort((a, b) => ((a * 37) % 17) - ((b * 37) % 17) || a - b);
  const rankOf = new Array(CORE.rows);
  ranks.forEach((row, i) => (rankOf[row] = i / CORE.rows));
  for (let r = 0, k = 0; r < CORE.rows; r++) {
    const base = (r * 0.618) % 1;
    for (let j = 0; j < PER; j++, k++) {
      const pulse = j < PER / 2 ? 0 : 0.5;
      const t = (j % Math.ceil(PER / 2)) / Math.ceil(PER / 2);
      fRow[k] = r;
      fPhase[k] = base + pulse - t * 0.09;
      fTail[k] = 1 - t;
      fRank[k] = rankOf[r];
    }
  }
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flowN * 3), 3));
  flowGeo.setAttribute('aRow', new THREE.BufferAttribute(fRow, 1));
  flowGeo.setAttribute('aPhase', new THREE.BufferAttribute(fPhase, 1));
  flowGeo.setAttribute('aTail', new THREE.BufferAttribute(fTail, 1));
  flowGeo.setAttribute('aRank', new THREE.BufferAttribute(fRank, 1));
  flowGeo.boundingSphere = new THREE.Sphere(V(0, 0, 0), 2);
  const flowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFlow: { value: 0 }, uAmt: { value: 0 }, uScale: { value: 400 }, uColor: { value: PINK.clone() } },
    vertexShader: /* glsl */ `
      attribute float aRow, aPhase, aTail, aRank;
      uniform float uTime, uFlow, uAmt, uScale;
      varying float vA;
      void main() {
        float x = -${(CORE.w / 2).toFixed(3)} + fract(aPhase + uTime * 0.22) * ${CORE.w.toFixed(3)};
        float y = -${(CORE.h / 2).toFixed(4)} + (aRow + 0.5) * ${step.toFixed(5)};
        vec4 mv = modelViewMatrix * vec4(x, y, ${(CORE.d / 2 + 0.006).toFixed(3)}, 1.0);
        float on = step(aRank, uFlow - 0.001);
        vA = uAmt * on * aTail;
        gl_PointSize = (0.006 + 0.016 * aTail) * uScale / -mv.z * step(0.001, vA);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        gl_FragColor = vec4(uColor * (1.3 + a), a * vA);
      }`,
  });
  const flow = new THREE.Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  body.add(flow);

  // Fan: kütüphane radyatörünün davlumbazı, fanı ve motoru petek arkasından kayarak gelir (update'te)
  let fanAngle = 0;

  // --- Havuz --------------------------------------------------------------------
  const caus = causticTex();
  caus.colorSpace = THREE.NoColorSpace;
  caus.wrapS = caus.wrapT = THREE.RepeatWrapping;
  caus.repeat.set(3, 2);
  const caus2 = caus.clone();
  caus2.repeat.set(2.2, 1.6);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f3a40, roughness: 0.8, metalness: 0.1, side: THREE.BackSide });
  const floorMat = new THREE.MeshBasicMaterial({ color: 0x2b8f95, map: caus, side: THREE.BackSide });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const poolBox = new THREE.Mesh(new THREE.BoxGeometry(POOL.w, POOL.depth, POOL.d), [wallMat, wallMat, hidden, floorMat, wallMat, wallMat]);
  poolBox.position.y = -POOL.depth / 2;
  scene.add(poolBox);
  const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(POOL.w - 0.02, POOL.d - 0.02), new THREE.MeshBasicMaterial({ map: caus2, color: 0x3fd6d8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  floor2.rotation.x = -Math.PI / 2;
  floor2.position.y = -POOL.depth + 0.01;
  scene.add(floor2);
  // çelik kenar
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x5d636d, metalness: 0.85, roughness: 0.38 });
  const beam = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), rimMat);
    m.position.set(x, 0.03, z);
    scene.add(m);
  };
  beam(POOL.w + 0.2, 0.1, 0, POOL.d / 2 + 0.05);
  beam(POOL.w + 0.2, 0.1, 0, -POOL.d / 2 - 0.05);
  beam(0.1, POOL.d, POOL.w / 2 + 0.05, 0);
  beam(0.1, POOL.d, -POOL.w / 2 - 0.05, 0);
  // atölye zemini (havuz boşluklu)
  const fl = new THREE.Shape();
  fl.moveTo(-30, -30); fl.lineTo(30, -30); fl.lineTo(30, 30); fl.lineTo(-30, 30); fl.lineTo(-30, -30);
  const flHole = new THREE.Path();
  flHole.moveTo(-POOL.w / 2 - 0.1, -POOL.d / 2 - 0.1); flHole.lineTo(-POOL.w / 2 - 0.1, POOL.d / 2 + 0.1);
  flHole.lineTo(POOL.w / 2 + 0.1, POOL.d / 2 + 0.1); flHole.lineTo(POOL.w / 2 + 0.1, -POOL.d / 2 - 0.1);
  fl.holes.push(flHole);
  const ground = new THREE.Mesh(new THREE.ShapeGeometry(fl), new THREE.MeshStandardMaterial({ color: 0x1a1622, roughness: 0.9, metalness: 0 }));
  ground.receiveShadow = true;
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.075;
  scene.add(ground);
  // sarı-siyah kenar şeridi
  const hazard = canvasTex(256, 16, (g, w, h) => {
    g.fillStyle = '#141216'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffcf33';
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
  hazard.wrapS = THREE.RepeatWrapping;
  hazard.repeat.set(10, 1);
  const hzMat = new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.6 });
  for (const [w, x, z, ry] of [[POOL.w + 0.2, 0, POOL.d / 2 + 0.2, 0], [POOL.w + 0.2, 0, -POOL.d / 2 - 0.2, 0], [POOL.d + 0.6, POOL.w / 2 + 0.2, 0, Math.PI / 2], [POOL.d + 0.6, -POOL.w / 2 - 0.2, 0, Math.PI / 2]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), hzMat);
    s.rotation.set(-Math.PI / 2, 0, ry);
    s.position.set(x, 0.078, z);
    scene.add(s);
  }

  // Su yüzeyi: üstten koyu ve yansımalı, alttan parlak Snell penceresi
  const surfUni = {
    uTime: { value: 0 }, uRip: { value: new THREE.Vector4(0, 0, -99, 0) }, uRip2: { value: new THREE.Vector4(0, 0, -99, 0) },
    uLamp: { value: lamp.position.clone() }, uPink: { value: PINK.clone() }, uGlow: { value: 0 },
  };
  const surf = new THREE.Mesh(
    new THREE.PlaneGeometry(POOL.w, POOL.d, lite ? 90 : 150, lite ? 60 : 100),
    new THREE.ShaderMaterial({
      uniforms: surfUni, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec4 uRip, uRip2;
        varying vec3 vW; varying vec3 vN;
        float ring(vec2 p, vec4 R) {
          float dt = uTime - R.z;
          if (dt < 0.0 || dt > 6.0) return 0.0;
          float r = length(p - R.xy);
          return sin(r * 16.0 - dt * 10.0) * exp(-dt * 0.8) * exp(-abs(r - dt * 0.7) * 3.0) * R.w;
        }
        float h(vec2 p) {
          float a = sin(p.x * 1.6 + uTime * 0.8) * 0.010 + sin(p.y * 2.2 - uTime * 1.05) * 0.008 + sin((p.x + p.y) * 4.3 + uTime * 1.7) * 0.004;
          return a + (ring(p, uRip) + ring(p, uRip2)) * 0.035;
        }
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vec2 p = w.xz;
          float e = 0.02;
          float hx = h(p + vec2(e, 0.0)) - h(p - vec2(e, 0.0));
          float hz = h(p + vec2(0.0, e)) - h(p - vec2(0.0, e));
          vN = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
          w.y += h(p);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLamp, uPink; uniform float uGlow;
        varying vec3 vW; varying vec3 vN;
        void main() {
          vec3 V = normalize(cameraPosition - vW);
          vec3 N = normalize(vN);
          vec3 col; float a;
          if (cameraPosition.y > vW.y) {
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            vec3 R = reflect(-V, N);
            float spec = pow(max(dot(R, normalize(uLamp - vW)), 0.0), 220.0) * 2.4;
            float sheen = pow(max(dot(R, normalize(vec3(-4.0, 2.5, -5.0))), 0.0), 30.0) * 0.5;
            float spec2 = pow(max(dot(R, normalize(uLamp - vW)), 0.0), 24.0) * 0.18;
            col = mix(vec3(0.012, 0.07, 0.085), vec3(0.06, 0.11, 0.15), fres) + (spec + spec2) * vec3(0.85, 1.0, 0.98) + sheen * uPink * 0.35;
            col += uPink * uGlow * 0.05;
            a = mix(0.72, 0.96, fres);
          } else {
            vec3 Nd = -N;
            float c = max(dot(Nd, V), 0.0);
            float win = smoothstep(0.62, 0.95, c);
            col = mix(vec3(0.04, 0.24, 0.27), vec3(0.62, 0.92, 0.9), win);
            col += vec3(1.0) * pow(win, 12.0) * 0.4;
            a = 0.96;
          }
          float edge = smoothstep(0.0, 0.25, min(${(POOL.w / 2).toFixed(2)} - abs(vW.x), ${(POOL.d / 2).toFixed(2)} - abs(vW.z)));
          gl_FragColor = vec4(col, a * edge);
          #include <colorspace_fragment>
        }`,
    }),
  );
  surf.rotation.x = -Math.PI / 2;
  surf.renderOrder = 2;
  scene.add(surf);

  // Kabarcıklar
  const BN = lite ? 70 : 110;
  const bubbleMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
        float rimv = pow(f, 2.2);
        float hl = pow(max(dot(normalize(vN), normalize(vec3(-0.4, 0.7, 0.6))), 0.0), 40.0);
        vec3 col = mix(vec3(0.55, 0.95, 0.95), vec3(1.0), hl);
        gl_FragColor = vec4(col, rimv * 0.9 + hl * 0.9 + 0.04);
      }`,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), bubbleMat, BN);
  bubbles.frustumCulled = false;
  bubbles.renderOrder = 3;
  scene.add(bubbles);
  const B = Array.from({ length: BN }, () => ({ alive: false, p: V(0, 0, 0), v: 0, s: 0, ph: Math.random() * 6.28 }));
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < BN; i++) bubbles.setMatrixAt(i, zero);
  let spawnAcc = 0;

  // Buhar (kapaktan) ve lehim kıvılcımı
  const dot = softDot();
  const SN = 40;
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SN * 3), 3));
  const steamMat = new THREE.PointsMaterial({ map: dot, size: 0.34, transparent: true, depthWrite: false, opacity: 0, color: 0xe9e2f2, sizeAttenuation: true });
  const steam = new THREE.Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  scene.add(steam);
  const steamLife = Float32Array.from({ length: SN }, (_, i) => i / SN);
  const KN = 70;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(KN * 3), 3));
  const sparkMat = new THREE.PointsMaterial({ map: dot, size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc27a, opacity: 0 });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const K = Array.from({ length: KN }, (_, i) => ({ t: i / KN, v: V(0, 0, 0) }));

  // --- Güncelleme ---------------------------------------------------------------
  const tmpV = V(0, 0, 0), tmpQ = new THREE.Quaternion(), tmpS = V(1, 1, 1);
  const leakW = V(0, 0, 0), capW = V(0, 0, 0);
  const bgCol = new THREE.Color();
  let lastTime = 0;
  let prevRadY = null;
  let ripSlot = 0;
  let lastFov = 0;
  let slowFrames = 0, frames = 0;

  function ripple(x, z, t, amp) {
    const u = ripSlot++ % 2 ? surfUni.uRip2 : surfUni.uRip;
    u.value.set(x, z, t, amp);
  }

  function update(s, now = performance.now()) {
    const time = now / 1000;
    const dt = Math.min(0.05, lastTime ? time - lastTime : 0.016);
    lastTime = time;

    camera.position.copy(s.pos);
    camera.lookAt(s.look);
    if (Math.abs(s.fov - lastFov) > 0.01) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
      lastFov = s.fov;
    }

    rad.position.set(0, s.radY, 0);
    body.rotation.set(s.tilt || 0, s.yaw, 0);
    body.scale.setScalar(s.scale);
    // gövde yüzeyi geçerken halka dalga
    const bottom = s.radY - (TANK.h / 2) * s.scale, top = s.radY + (TANK.h / 2) * s.scale;
    if (prevRadY !== null) {
      const pb = prevRadY - (TANK.h / 2) * s.scale, pt = prevRadY + (TANK.h / 2) * s.scale;
      if ((pb > 0 && bottom <= 0) || (pt > 0 && top <= 0) || (pb < 0 && bottom >= 0) || (pt < 0 && top >= 0)) ripple(0, 0, time, 1);
    }
    prevRadY = s.radY;
    surfUni.uTime.value = time;
    surfUni.uGlow.value = s.hot;

    // Su altı
    const under = clamp((0.03 - camera.position.y) / 0.06);
    bgCol.copy(SKY).lerp(DEEP, under);
    scene.background.copy(bgCol);
    scene.fog.color.copy(bgCol);
    scene.fog.near = L(8, 0.4, under);
    scene.fog.far = L(28, 7.5, under);
    water.intensity = under * 2.2;
    hemi.intensity = L(0.5, 0.9, under);
    hemi.color.setHex(under > 0.5 ? 0x62d6d8 : 0x9a8cc4);
    lamp.intensity = s.lamp * 60;
    caus.offset.set(time * 0.03, time * 0.02);
    caus2.offset.set(-time * 0.025, time * 0.035);

    // Isı ve kir
    for (const m of coreMats) m.emissiveIntensity = s.hot * (0.35 + 0.18 * Math.sin(time * 5));
    if (finMat) {
      finMat.color.copy(CLEAN).lerp(DIRTY, 1 - s.clean);
      finMat.roughness = L(0.45, 0.8, 1 - s.clean);
    }
    for (const m of coreMats) m.color.copy(CLEAN_CORE).lerp(DIRTY, (1 - s.clean) * 0.7);
    flowMat.uniforms.uTime.value = time;
    flowMat.uniforms.uFlow.value = s.flow;
    flowMat.uniforms.uAmt.value = s.flowAmt;
    flowMat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));

    // Fan
    if (ready) {
      const on = s.fan > 0.001;
      for (const p of Object.values(fanParts)) {
        p.node.visible = on;
        p.node.position.copy(p.base).addScaledVector(p.dir, (1 - s.fan) * 1.6);
      }
      if (on) {
        fanAngle += s.fanSpin * dt * 26;
        R.spin(fanAngle);
      }
    }

    rad.updateMatrixWorld(true);
    leakW.copy(LEAK).applyMatrix4(body.matrixWorld);
    capW.set(CAP.x, CAP.y + 0.06, CAP.z).applyMatrix4(body.matrixWorld);

    // Kabarcıklar: kaçak su altındayken
    const leakOn = s.leak * (leakW.y < -0.03 ? 1 : 0);
    spawnAcc += leakOn * dt * (lite ? 34 : 50);
    for (let i = 0; i < BN; i++) {
      const b = B[i];
      if (!b.alive && spawnAcc >= 1) {
        spawnAcc -= 1;
        b.alive = true;
        b.p.copy(leakW);
        b.p.x += (Math.random() - 0.5) * 0.02;
        b.s = 0.016 + Math.random() * Math.random() * 0.05;
        b.v = 0.25 + b.s * 12 + Math.random() * 0.15;
      }
      if (!b.alive) continue;
      b.ph += dt * 7;
      b.p.y += b.v * dt;
      b.p.x += Math.sin(b.ph) * 0.12 * dt;
      b.p.z += Math.cos(b.ph * 0.8) * 0.12 * dt + 0.02 * dt;
      if (b.p.y > -0.01) {
        b.alive = false;
        bubbles.setMatrixAt(i, zero);
        continue;
      }
      const sq = 1 + Math.sin(b.ph * 1.3) * 0.12;
      tmpS.set(b.s * sq, b.s / sq, b.s * sq);
      tm.compose(b.p, tmpQ, tmpS);
      bubbles.setMatrixAt(i, tm);
    }
    spawnAcc = Math.min(spawnAcc, 3);
    bubbles.instanceMatrix.needsUpdate = true;

    // Buhar
    const steamOn = s.steam * (capW.y > 0.1 ? 1 : 0);
    steamMat.opacity = steamOn * 0.32;
    steam.visible = steamOn > 0.01;
    if (steam.visible) {
      const pa = steamGeo.attributes.position;
      for (let i = 0; i < SN; i++) {
        steamLife[i] = (steamLife[i] + dt * 0.55) % 1;
        const l = steamLife[i];
        pa.setXYZ(i, capW.x + Math.sin(i * 12.9 + l * 3) * 0.12 * l - l * 0.2, capW.y + l * 1.1, capW.z + Math.cos(i * 7.3) * 0.12 * l);
      }
      pa.needsUpdate = true;
    }

    // Kıvılcım
    sparkMat.opacity = s.spark;
    sparks.visible = s.spark > 0.01;
    sparkLight.position.copy(leakW).add(tmpV.set(0.05, 0.05, 0.15));
    sparkLight.intensity = s.spark * (2 + Math.random() * 5);
    if (sparks.visible) {
      const pa = sparkGeo.attributes.position;
      for (let i = 0; i < KN; i++) {
        const k = K[i];
        k.t += dt * 2.4;
        if (k.t >= 1) {
          k.t -= 1;
          k.v.set((Math.random() - 0.3) * 1.2, Math.random() * 1.1, 0.4 + Math.random() * 0.9);
        }
        const t = k.t * 0.5;
        pa.setXYZ(i, leakW.x + k.v.x * t, leakW.y + k.v.y * t - 2.2 * t * t, leakW.z + k.v.z * t);
      }
      pa.needsUpdate = true;
    }

    renderer.render(scene, camera);
    // Zayıf cihaz: kareler uzun sürüyorsa çözünürlüğü düşür
    frames++;
    if (dt > 0.028) slowFrames++;
    if (frames === 90) {
      if (slowFrames > 45 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(dpr);
        resize();
      }
      frames = 0;
      slowFrames = 0;
    }
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const proj = V(0, 0, 0);
  function screenOf(which) {
    proj.copy(which === 'cap' ? capW : leakW).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * innerWidth, y: (-proj.y * 0.5 + 0.5) * innerHeight, behind: proj.z > 1 };
  }

  function compile() {
    renderer.compile(scene, camera);
  }

  return { update, resize, compile, drawName, screenOf, renderer, readyP, isReady: () => ready, ripple: (x, z, amp = 0.6) => ripple(x, z, lastTime, amp) };
}
