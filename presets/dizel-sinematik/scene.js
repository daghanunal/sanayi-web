// Pülverize: kaydırmayla oynatılan enjektör filmi.
// Tek sahne, dört durak: A) enjektör havada püskürtür, B) parça parça açılır,
// C) dört enjektör test tezgâhında menzürlere püskürtür, D) tamir edilen enjektörün kodu okunur.
// Dışarıya: createScene(canvas, opts) → { setProgress(p), state, anchors, project(v3), resize(), start(), stop(), render(), warm() }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- dokular

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Gövdedeki lazer yazısı: parça numarası, düzeltme kodu, matris kod
function etchTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(28,30,32,.92)';
    g.font = '600 34px monospace';
    g.fillText('0 445 110 293', 150, 74);
    g.font = '500 26px monospace';
    g.fillText('IMA  5A7C 3F91', 150, 118);
    g.fillText('D2  0,82  19/07', 150, 156);
    // matris kod
    const s = 9, x0 = 22, y0 = 44;
    for (let y = 0; y < 13; y++) {
      for (let x = 0; x < 13; x++) {
        const edge = x === 0 || y === 12 || (y === 0 && x % 2 === 0) || (x === 12 && y % 2 === 0);
        if (edge || Math.random() < 0.46) g.fillRect(x0 + x * s, y0 + y * s, s - 1, s - 1);
      }
    }
    g.strokeStyle = 'rgba(28,30,32,.6)';
    g.lineWidth = 2;
    g.strokeRect(12, 30, w - 24, 176);
  });
}

// Menzür bölüntüsü: 0-80 arası çizgiler ve rakamlar (ön yüz)
function gradTex() {
  return canvasTex(256, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(230,240,245,.85)';
    g.font = '600 34px monospace';
    for (let i = 0; i <= 80; i += 2) {
      const y = h - 24 - (i / 80) * (h - 60);
      const maj = i % 10 === 0;
      g.fillRect(maj ? 70 : 100, y - 1.5, maj ? 116 : 56, 3);
      if (maj && i > 0) g.fillText(String(i), 192, y + 12);
    }
  });
}

// Zemin: ortası amber, kenarı karanlık
function floorTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(92,62,24,1)');
    gr.addColorStop(0.35, 'rgba(30,26,20,1)');
    gr.addColorStop(1, 'rgba(11,13,12,1)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

function glowTex() {
  return canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,236,200,1)');
    gr.addColorStop(0.25, 'rgba(255,170,60,.5)');
    gr.addColorStop(1, 'rgba(255,140,30,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
}

function backdropTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#0b0d0c';
    g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.5, w * 0.5);
    gr.addColorStop(0, 'rgba(70,52,28,1)');
    gr.addColorStop(0.45, 'rgba(26,24,20,1)');
    gr.addColorStop(1, 'rgba(11,13,12,1)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

// ---------------------------------------------------------------- enjektör

// Profil noktaları [yarıçap, y] → LatheGeometry
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function injectorKit(low) {
  const seg = low ? 32 : 56;
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc3c8cd, metalness: 1, roughness: 0.26 }),
    bright: new THREE.MeshStandardMaterial({ color: 0xe4e6e8, metalness: 1, roughness: 0.12 }),
    oxide: new THREE.MeshStandardMaterial({ color: 0x3d4146, metalness: 0.9, roughness: 0.42 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x17191b, metalness: 0, roughness: 0.5 }),
    tip: new THREE.MeshStandardMaterial({ color: 0xb49a78, metalness: 1, roughness: 0.2 }), // ısıdan saman rengi
    pin: new THREE.MeshStandardMaterial({ color: 0xd9b25a, metalness: 1, roughness: 0.3 }),
  };
  const etch = etchTex();
  const G = {
    // bobin: plastik kapak + çelik kapak somunu (altıgen)
    cap: lathe([[0, 1.0], [0.2, 1.0], [0.25, 0.985], [0.27, 0.95], [0.27, 0.88], [0.255, 0.87], [0.255, 0.85], [0.27, 0.84], [0.27, 0.76], [0.24, 0.73], [0.24, 0.72], [0, 0.72]], seg),
    capNut: new THREE.CylinderGeometry(0.29, 0.29, 0.1, 6, 1),
    sok: new THREE.BoxGeometry(0.2, 0.2, 0.3),
    sokPlug: new THREE.BoxGeometry(0.3, 0.16, 0.2),
    pins: new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6),
    // valf grubu: yuva + bilye
    valve: lathe([[0, 0.56], [0.13, 0.56], [0.14, 0.575], [0.14, 0.64], [0.1, 0.66], [0.1, 0.68], [0, 0.68]], seg),
    ball: new THREE.SphereGeometry(0.035, 16, 12),
    // gövde
    body: lathe([[0, 0.64], [0.19, 0.64], [0.2, 0.63], [0.2, 0.5], [0.235, 0.49], [0.24, 0.44], [0.24, 0.36], [0.2, 0.35], [0.2, -0.3], [0.19, -0.35], [0, -0.35]], seg),
    stub: new THREE.CylinderGeometry(0.065, 0.075, 0.42, 20),
    stubNut: new THREE.CylinderGeometry(0.1, 0.1, 0.1, 6),
    ret: new THREE.CylinderGeometry(0.035, 0.035, 0.14, 14),
    etch: new THREE.CylinderGeometry(0.2025, 0.2025, 0.44, 24, 1, true, -0.62, 1.24),
    // meme somunu
    nut: lathe([[0, -0.35], [0.205, -0.35], [0.21, -0.37], [0.21, -0.6], [0.19, -0.66], [0.16, -0.7], [0.15, -0.72], [0, -0.72]], seg),
    // meme
    nozzle: lathe([[0, -0.72], [0.14, -0.72], [0.14, -0.79], [0.1, -0.81], [0.078, -0.83], [0.075, -1.1], [0.066, -1.14], [0.045, -1.175], [0.02, -1.195], [0, -1.2]], seg),
    // iğne
    needle: lathe([[0, -0.44], [0.032, -0.44], [0.032, -1.0], [0.026, -1.04], [0.02, -1.07], [0.003, -1.12], [0, -1.12]], 20),
    // bobin telleri (kesik görünmesin diye sadece patlatınca görünür küçük halka)
    coil: new THREE.TorusGeometry(0.15, 0.03, 8, 32),
  };
  G.stub.rotateX(-Math.PI / 3); // arkaya ve yukarı
  G.stubNut.rotateX(-Math.PI / 3);
  G.ret.rotateZ(Math.PI / 2);
  G.pins.rotateZ(Math.PI / 2);
  G.coil.rotateX(Math.PI / 2);
  const etchMat = new THREE.MeshStandardMaterial({ map: etch, transparent: true, metalness: 0.4, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  return { M, G, etchMat };
}

function buildInjector(kit, hero = false) {
  const { M, G } = kit;
  const root = new THREE.Group();
  const part = (name, meshes) => {
    const g = new THREE.Group();
    g.name = name;
    meshes.forEach((m) => g.add(m));
    root.add(g);
    return g;
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };

  // 0 bobin + soket
  const capNut = mesh(G.capNut, M.steel, 0, 0.69, 0);
  capNut.rotation.y = Math.PI / 6;
  const bobin = part('bobin', [
    mesh(G.cap, M.plastic),
    capNut,
    mesh(G.sok, M.plastic, 0.02, 1.09, 0),
    mesh(G.sokPlug, M.plastic, 0.2, 1.1, 0),
    mesh(G.pins, M.pin, 0.37, 1.12, 0.04),
    mesh(G.pins, M.pin, 0.37, 1.12, -0.04),
    mesh(G.coil, M.pin, 0, 0.74, 0),
  ]);
  // 1 valf grubu
  const valf = part('valf', [mesh(G.valve, M.bright), mesh(G.ball, M.bright, 0, 0.7, 0)]);
  // 2 gövde
  const etchMat = hero ? kit.etchMat.clone() : kit.etchMat;
  const etch = mesh(G.etch, etchMat, 0, 0.02, 0);
  const govde = part('govde', [
    mesh(G.body, M.steel),
    mesh(G.stub, M.steel, 0, 0.52, -0.21),
    mesh(G.stubNut, M.steel, 0, 0.64, -0.41),
    mesh(G.ret, M.oxide, 0.24, 0.56, 0),
    etch,
  ]);
  // 3 meme somunu
  const somun = part('somun', [mesh(G.nut, M.oxide)]);
  // 4 meme
  const meme = part('meme', [mesh(G.nozzle, M.tip)]);
  // 5 iğne
  const igne = part('igne', [mesh(G.needle, M.bright)]);

  const parts = [bobin, valf, govde, somun, meme, igne];
  // patlatılmış görünüşte dikey kaydırma
  const EXPL = [1.02, 0.56, 0, -0.56, -1.02, -1.92];
  // her parçanın yerel merkezi (etiket için)
  const CENTER = [0.9, 0.62, 0.15, -0.53, -0.95, -0.78];
  const tip = new THREE.Object3D();
  tip.position.set(0, -1.2, 0);
  meme.add(tip);
  return {
    root, parts, tip, etch, etchMat,
    explode(e) {
      parts.forEach((p, i) => {
        p.position.y = EXPL[i] * e;
        p.rotation.y = (i % 2 ? -1 : 1) * e * 0.5 * (i / 5);
      });
      igne.visible = e > 0.02;
      valf.visible = e > 0.02;
      bobin.children[6].visible = e > 0.02;
    },
    centerOf(i, out) {
      out.set(0, CENTER[i], 0);
      return parts[i].localToWorld(out);
    },
  };
}

// ---------------------------------------------------------------- püskürtme parçacıkları

function makeSpray(N, low) {
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const t = new Float32Array(N).fill(1);
  const life = new Float32Array(N).fill(1);
  const size = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const aT = new THREE.BufferAttribute(t, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('aT', aT);
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  for (let i = 0; i < N; i++) {
    size[i] = 0.5 + Math.random() * 1.1;
    pos[i * 3 + 1] = -999;
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 1 }, uAmber: { value: new THREE.Color(0xf5a524) }, uOp: { value: low ? 0.8 : 0.62 } },
    vertexShader: /* glsl */ `
      attribute float aT; attribute float aSize; uniform float uPx; varying float vT;
      void main() {
        vT = aT;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aT >= 1.0 ? 0.0 : aSize * uPx * (1.6 + aT * 9.0) * (4.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uAmber; uniform float uOp; varying float vT;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(1.0, 0.97, 0.9), uAmber, smoothstep(0.0, 0.55, vT));
        c = mix(c, vec3(0.55, 0.62, 0.66), smoothstep(0.5, 1.0, vT));
        gl_FragColor = vec4(c, a * pow(1.0 - vT, 1.6) * uOp);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let head = 0;
  const HOLES = 7;
  const dir = new THREE.Vector3();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  return {
    points, mat,
    // tip: dünya konumu, axis: memenin baktığı yön (birim), k: ölçek
    emit(n, tip, axis, k = 1, cone = 0.72) {
      // axis'e dik iki vektör
      tmpA.set(1, 0, 0);
      if (Math.abs(axis.x) > 0.9) tmpA.set(0, 0, 1);
      tmpB.crossVectors(axis, tmpA).normalize();
      tmpA.crossVectors(tmpB, axis).normalize();
      for (let j = 0; j < n; j++) {
        const i = head;
        head = (head + 1) % N;
        const h = Math.floor(Math.random() * HOLES);
        const ang = (h / HOLES) * TAU + (Math.random() - 0.5) * 0.12;
        const c = cone + (Math.random() - 0.5) * 0.16;
        dir.copy(axis).multiplyScalar(Math.cos(c))
          .addScaledVector(tmpA, Math.sin(c) * Math.cos(ang))
          .addScaledVector(tmpB, Math.sin(c) * Math.sin(ang));
        const sp = (3.2 + Math.random() * 3.4) * k;
        pos[i * 3] = tip.x; pos[i * 3 + 1] = tip.y; pos[i * 3 + 2] = tip.z;
        vel[i * 3] = dir.x * sp; vel[i * 3 + 1] = dir.y * sp; vel[i * 3 + 2] = dir.z * sp;
        t[i] = 0;
        life[i] = (0.35 + Math.random() * 0.5) * (0.7 + k * 0.3);
      }
    },
    update(dt, drag = 5.2, floorY = -99) {
      const f = Math.exp(-drag * dt);
      for (let i = 0; i < N; i++) {
        if (t[i] >= 1) continue;
        t[i] = Math.min(1, t[i] + dt / life[i]);
        const o = i * 3;
        vel[o] *= f; vel[o + 1] = vel[o + 1] * f - 0.9 * dt; vel[o + 2] *= f;
        pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
        if (pos[o + 1] < floorY) { pos[o + 1] = floorY; vel[o + 1] = 0; }
      }
      aPos.needsUpdate = true;
      aT.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- sahne

export function createScene(canvas, { low = false, reduced = false, phone = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x0b0d0c, 1);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  scene.fog = new THREE.Fog(0x0b0d0c, 14, 34);

  const camera = new THREE.PerspectiveCamera(phone ? 38 : 32, 1, 0.05, 80);

  // ışıklar
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(3, 5, 5);
  const rim = new THREE.DirectionalLight(0xffa233, 3.2);
  rim.position.set(-4, 2, -4);
  const fill = new THREE.DirectionalLight(0x9cc4e0, 0.6);
  fill.position.set(-3, -2, 4);
  scene.add(key, rim, fill);
  const tipLight = new THREE.PointLight(0xffa640, 0, 3.2, 1.6);
  scene.add(tipLight);

  // arka plan ve zemin
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: backdropTex(), fog: false, depthWrite: false }));
  backdrop.position.set(0, 1, -12);
  scene.add(backdrop);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ map: floorTex(), metalness: 0.2, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.38;
  scene.add(floor);

  // ---------------- enjektörler
  const kit = injectorKit(low);
  const SP = phone ? 0.8 : 1.0; // tezgâhta aralık
  const SLOTS = [-1.5, -0.5, 0.5, 1.5].map((x) => x * SP);
  const HERO = 2; // arızalı çıkan, tamir edilip kodlanan
  const BENCH_S = phone ? 0.46 : 0.5;
  const TUBE_TOP = 0.5, TUBE_BOT = -1.12, TUBE_H = TUBE_TOP - TUBE_BOT;
  const INJ_Y = TUBE_TOP + 0.06 + 1.2 * BENCH_S;
  const injs = SLOTS.map((_, i) => buildInjector(kit, i === HERO));
  injs.forEach((j) => scene.add(j.root));
  const hero = injs[HERO];

  // ---------------- tezgâh
  const bench = new THREE.Group();
  scene.add(bench);
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2a2e31, metalness: 0.8, roughness: 0.45 });
  const W = SP * 4 + 0.5;
  const base = new THREE.Mesh(new THREE.BoxGeometry(W, 0.24, 0.7), benchMat);
  base.position.y = TUBE_BOT - 0.12;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, 0.55), benchMat);
  plate.position.y = TUBE_TOP + 0.03;
  const postGeo = new THREE.BoxGeometry(0.09, TUBE_H + 0.1, 0.09);
  const postL = new THREE.Mesh(postGeo, benchMat);
  postL.position.set(-W / 2 + 0.06, (TUBE_TOP + TUBE_BOT) / 2, -0.22);
  const postR = postL.clone();
  postR.position.x = W / 2 - 0.06;
  bench.add(base, plate, postL, postR);
  // common rail: arkadan geçen boru ve her enjektöre giden hatlar
  const railY = INJ_Y + 0.64 * BENCH_S + 0.06, railZ = -0.41 * BENCH_S - 0.06;
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, W - 0.2, 24), kit.M.steel);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, railY + 0.02, railZ - 0.12);
  bench.add(rail);
  const pipeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10);
  SLOTS.forEach((x) => {
    const p = new THREE.Mesh(pipeGeo, kit.M.steel);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, railY, railZ - 0.03);
    bench.add(p);
  });
  // menzürler
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd8e6ec, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const gradMat = new THREE.MeshBasicMaterial({ map: gradTex(), transparent: true, depthWrite: false, opacity: 0.9 });
  const fuelMat = new THREE.MeshStandardMaterial({ color: 0xe0921e, emissive: 0x6a3a00, metalness: 0, roughness: 0.18, transparent: true, opacity: 0.82 });
  const badMat = fuelMat.clone();
  const R = phone ? 0.15 : 0.17;
  const glassGeo = new THREE.CylinderGeometry(R, R, TUBE_H, 28, 1, true);
  const gradGeo = new THREE.CylinderGeometry(R + 0.004, R + 0.004, TUBE_H * 0.96, 20, 1, true, -0.7, 1.4);
  const fuelGeo = new THREE.CylinderGeometry(R * 0.86, R * 0.86, 1, 24, 1);
  fuelGeo.translate(0, 0.5, 0);
  const tubes = SLOTS.map((x, i) => {
    const g = new THREE.Mesh(glassGeo, glassMat);
    g.position.set(x, (TUBE_TOP + TUBE_BOT) / 2, 0);
    const gr = new THREE.Mesh(gradGeo, gradMat);
    gr.position.copy(g.position);
    const f = new THREE.Mesh(fuelGeo, i === HERO ? badMat : fuelMat);
    f.position.set(x, TUBE_BOT + 0.02, 0);
    f.scale.y = 0.001;
    bench.add(f, g, gr);
    return f;
  });

  // püskürtme
  const spray = makeSpray(low ? 1400 : 3000, low);
  scene.add(spray.points);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glow.scale.set(1.2, 1.2, 1);
  scene.add(glow);

  // kodlama taraması: gövde etrafında ince amber bant
  const scanMat = new THREE.MeshBasicMaterial({ color: 0xffb640, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const scan = new THREE.Mesh(new THREE.CylinderGeometry(0.207, 0.207, 0.014, 32, 1, true, -0.7, 1.4), scanMat);
  hero.parts[2].add(scan);

  // ---------------- durum
  const S = {
    p: 0,
    explode: 0,
    bench: 0,
    fill: 0,      // 0-1: menzürler dolar
    redo: 0,      // 0-1: 3. menzür boşalıp doğru değerle dolar
    code: 0,      // 0-1: kodlama taraması
    finale: 0,
    levels: [56.2, 55.8, 68.9, 56.5],
    fixed: 56.0,
  };
  function setProgress(p) {
    S.p = p;
    S.explode = smooth(0.12, 0.25, p) * (1 - smooth(0.33, 0.42, p));
    S.bench = smooth(0.38, 0.5, p);
    S.fill = smooth(0.5, 0.63, p);
    S.redo = smooth(0.68, 0.8, p);
    S.code = smooth(0.72, 0.84, p);
    S.finale = smooth(0.87, 0.96, p);
  }

  // ---------------- kamera durakları [p, konum, hedef]
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const hx = SLOTS[HERO];
  const KEYS = phone
    ? [
        [0.0, V(0.3, -0.9, 8.4), V(0, -1.3, 0)],
        [0.1, V(0.6, -1.0, 8.8), V(0, -1.35, 0)],
        [0.22, V(1.6, -1.2, 17), V(0.72, -1.85, 0)],
        [0.36, V(1.3, -1.0, 17.2), V(0.72, -1.85, 0)],
        [0.5, V(0, 1.6, 11.2), V(0, -1.35, 0)],
        [0.64, V(0.3, 1.2, 10.6), V(0, -1.2, 0)],
        [0.74, V(hx + 0.3, INJ_Y + 0.3, 2.4), V(hx, INJ_Y + 0.02, 0)],
        [0.84, V(hx + 0.15, INJ_Y + 0.2, 2.2), V(hx, INJ_Y - 0.02, 0)],
        [0.95, V(-0.4, 2.6, 12.5), V(0, -1.0, 0)],
        [1.0, V(-0.6, 2.8, 12.8), V(0, -1.0, 0)],
      ]
    : [
        [0.0, V(-1.0, 0.1, 5.6), V(-0.95, -0.05, 0)],
        [0.1, V(-0.6, 0.0, 6.0), V(-1.0, -0.1, 0)],
        [0.22, V(-2.4, 0.2, 10.4), V(-1.9, -0.35, 0)],
        [0.36, V(-2.0, 0.4, 10.6), V(-1.9, -0.35, 0)],
        [0.5, V(-1.6, 1.6, 7.6), V(-1.35, 0.05, 0)],
        [0.64, V(-1.2, 1.3, 7.2), V(-1.25, 0.05, 0)],
        [0.74, V(hx + 0.05, INJ_Y + 0.25, 2.2), V(hx - 0.42, INJ_Y - 0.12, 0)],
        [0.84, V(hx - 0.1, INJ_Y + 0.1, 2.0), V(hx - 0.42, INJ_Y - 0.12, 0)],
        [0.95, V(-1.6, 2.4, 8.6), V(-1.2, 0.0, 0)],
        [1.0, V(-1.8, 2.6, 8.8), V(-1.2, 0.0, 0)],
      ];
  const camAt = (p) => {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, a0, t0] = KEYS[i], [p1, a1, t1] = KEYS[i + 1];
    const k = smooth(p0, p1, p);
    return { pos: a0.clone().lerp(a1, k), tgt: t0.clone().lerp(t1, k) };
  };

  // ---------------- boyut
  const size = { w: 1, h: 1 };
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    spray.mat.uniforms.uPx.value = renderer.getPixelRatio() * (h / 800);
  }
  const tmp = new THREE.Vector3();
  function project(v) {
    tmp.copy(v).project(camera);
    return { x: (tmp.x + 1) * 0.5 * size.w, y: (1 - tmp.y) * 0.5 * size.h, z: tmp.z };
  }
  // DOM etiketleri için dünya noktaları
  const anchors = {
    part: (i) => hero.centerOf(i, new THREE.Vector3()),
    tubeTop: (i) => new THREE.Vector3(SLOTS[i], TUBE_TOP + 0.12, 0),
    tubeLevel: (i) => {
      const f = tubes[i];
      return new THREE.Vector3(SLOTS[i] + R + 0.02, f.position.y + f.scale.y, 0);
    },
    tubeBottom: (i) => new THREE.Vector3(SLOTS[i], TUBE_BOT - 0.3, 0.35),
    etch: () => hero.parts[2].localToWorld(new THREE.Vector3(0, 0.02, 0.21)),
  };

  // ---------------- döngü
  const clock = new THREE.Clock();
  let running = false, raf = 0, t = 0;
  let camPos = null, camTgt = null;
  const onFrame = [];
  const pulse = SLOTS.map((_, i) => ({ t: i * 0.13, pilot: false, main: 0 }));
  const axisDown = new THREE.Vector3(0, -1, 0);
  const tipW = new THREE.Vector3();
  const heroScale = 1;

  function step(dt) {
    t += dt;
    const { pos, tgt } = camAt(S.p);
    if (!camPos || dt === 0) {
      camPos = pos.clone();
      camTgt = tgt.clone();
    } else {
      const k = 1 - Math.pow(0.002, dt);
      camPos.lerp(pos, k);
      camTgt.lerp(tgt, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    const b = S.bench;
    // kahraman enjektör: havadan tezgâha
    const sway = Math.sin(t * 0.45) * 0.55 + 0.35;
    const heroRot = lerp(lerp(sway, -0.55, smooth(0.1, 0.2, S.p)), 0.0, b);
    hero.root.rotation.y = heroRot;
    hero.root.rotation.z = lerp(Math.sin(t * 0.3) * 0.04, 0, b);
    hero.root.position.set(lerp(0, hx, b), lerp(Math.sin(t * 0.8) * 0.04, INJ_Y, b), 0);
    hero.root.scale.setScalar(lerp(heroScale, BENCH_S, b));
    hero.explode(S.explode);
    // diğer üçü yukarıdan iner
    injs.forEach((j, i) => {
      if (i === HERO) return;
      j.root.visible = b > 0.01;
      const k = smooth(0.1 + i * 0.12, 0.7 + i * 0.1, b);
      j.root.position.set(SLOTS[i], INJ_Y + (1 - k) * 4.5, 0);
      j.root.scale.setScalar(BENCH_S);
      j.root.rotation.y = (1 - k) * 2.2;
      j.explode(0);
    });
    bench.visible = b > 0.01;
    bench.position.y = (1 - smooth(0, 0.8, b)) * -4;
    floor.visible = camera.position.y > floor.position.y + 0.6;

    // menzür seviyeleri
    const bad = lerp(S.levels[HERO], 0, smooth(0, 0.35, S.redo));
    tubes.forEach((f, i) => {
      let v = S.levels[i] * S.fill;
      if (i === HERO) v = S.redo < 0.35 ? bad * S.fill : S.fixed * smooth(0.45, 1, S.redo);
      f.scale.y = Math.max(0.001, (v / 80) * (TUBE_H - 0.1));
      f.visible = v > 0.05;
    });
    const hot = S.redo < 0.35;
    badMat.color.setHex(hot && S.fill > 0.6 ? 0xe2552e : 0xe0921e);
    badMat.emissive.setHex(hot && S.fill > 0.6 ? 0x5a1400 : 0x6a3a00);

    // püskürtme: hangi enjektör, ne zaman
    let glowAmt = 0;
    const heroFree = b < 0.05 && S.explode < 0.02;
    const benchFire = (S.p > 0.5 && S.p < 0.64) || (S.p > 0.79 && S.p < 0.84) || S.finale > 0.02;
    if (!reduced) {
      injs.forEach((j, i) => {
        let on = false, k = 1, cone = 0.72;
        if (i === HERO && heroFree) { on = true; k = 1; cone = 0.95; }
        else if (b > 0.98 && benchFire) {
          on = i === HERO ? true : S.p < 0.66 || S.finale > 0.02;
          k = 0.42; cone = 0.34;
        }
        const P = pulse[i];
        if (!on) { P.t = i * 0.13; return; }
        P.t += dt;
        const cyc = i === HERO && heroFree ? 0.9 : 0.42;
        if (P.t > cyc) { P.t -= cyc; P.pilot = false; P.main = 0; }
        j.tip.getWorldPosition(tipW);
        axisDown.set(0, -1, 0).applyQuaternion(j.root.quaternion).normalize();
        const n = low ? 0.55 : 1;
        if (!P.pilot && P.t > 0.0) { spray.emit(Math.round(26 * n), tipW, axisDown, k * 0.55, cone); P.pilot = true; }
        if (P.t > 0.09 && P.t < 0.22) { spray.emit(Math.round(46 * n), tipW, axisDown, k, cone); if (i === HERO) glowAmt = 1; }
        if (i === HERO) {
          glow.position.copy(tipW);
          tipLight.position.copy(tipW);
        }
      });
    }
    spray.update(dt, 5.2, TUBE_BOT + 0.05 - (1 - b) * 20);
    glow.material.opacity += ((glowAmt ? 0.9 : 0) - glow.material.opacity) * Math.min(1, dt * 18);
    glow.scale.setScalar(lerp(1.3, 0.55, b));
    tipLight.intensity = glow.material.opacity * 3.5;

    // kodlama: bant gövdeyi tarar, yazı ısınır
    const c = S.code;
    scanMat.opacity = c > 0.01 && c < 0.99 ? 0.95 : 0;
    scan.position.y = lerp(-0.2, 0.24, (Math.sin(t * 3.2) * 0.5 + 0.5));
    hero.etchMat.emissive = hero.etchMat.emissive || new THREE.Color();
    hero.etchMat.emissive.setHex(0xff9d2a);
    hero.etchMat.emissiveIntensity = c > 0.01 ? (c < 0.99 ? 0.35 + Math.sin(t * 9) * 0.2 : 0.55) : 0;

    for (const f of onFrame) f(dt);
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    step(Math.min(clock.getDelta(), 1 / 20));
  }

  // görünmezken durdur
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running) { clock.getDelta(); loop(); }
  });

  resize();
  setProgress(0);
  return {
    setProgress, state: S, anchors, project, resize, onFrame, renderer,
    slots: SLOTS.length, hero: HERO,
    start() {
      if (running) return;
      running = true;
      clock.getDelta();
      loop();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    render() { step(0); },
    warm() {
      renderer.compile(scene, camera);
      step(0);
    },
  };
}
