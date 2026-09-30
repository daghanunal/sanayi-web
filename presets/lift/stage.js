// Lift 3D sahnesi: grafit zeminde döner tabla, üstünde tebeşir beyazı hatchback (lib3d `car`).
// Tabla parmakla/fareyle döndürülür; araçtaki noktalara dokununca kamera o parçaya gider, parça
// açık yeşil vurgulanır (far yanar, kaput açılır). Çizim yalnız bir şey değişince yapılır.
// Araç kendi çerçevesinde durur: ön +X, sağ yan +Z, zemin y = 0 (lib3d kuralı).
import * as THREE from 'three';
import { loadAsset, loadEnv } from '../../shared/lib3d.js';
import { gsap } from '../../shared/core.js';

const LIME = new THREE.Color('#c6ff3d');
const BG = new THREE.Color('#10120f');
const TABLA_Y = 0.07;

// Noktalar (aracın yerel çerçevesi). n: yüzey normali (arkada kalan nokta gizlenir).
// cam: tabla açısı (yaw), kamera yüksekliği (el), uzaklık (dist), bakılan nokta (look, yerel).
export const NOKTALAR = {
  motor: { p: [1.62, 0.93, 0.0], n: [0.5, 1, 0.1], cam: { yaw: -0.9, el: 0.62, dist: 5.6, look: [1.3, 0.72, 0] }, hood: 1 },
  aku: { p: [1.72, 0.86, 0.6], n: [0.3, 1, 0.6], cam: { yaw: -0.35, el: 0.72, dist: 4.9, look: [1.5, 0.72, 0.3] }, hood: 1 },
  sogutma: { p: [2.19, 0.42, 0.0], n: [1, 0.05, 0], cam: { yaw: -1.35, el: 0.16, dist: 5.2, look: [1.95, 0.55, 0] } },
  far: { p: [2.02, 0.72, 0.6], n: [1, 0.15, 0.8], cam: { yaw: -0.95, el: 0.14, dist: 4.6, look: [1.85, 0.66, 0.45] } },
  klima: { p: [0.25, 1.14, 0.77], n: [0, 0.35, 1], cam: { yaw: -0.55, el: 0.3, dist: 4.6, look: [0.55, 0.95, 0.3] } },
  fren: { p: [1.32, 0.33, 0.93], n: [0.1, 0, 1], cam: { yaw: -0.12, el: 0.1, dist: 4.1, look: [1.3, 0.42, 0.8] } },
  lastik: { p: [-1.32, 0.5, 0.94], n: [0, 0.25, 1], cam: { yaw: 0.22, el: 0.12, dist: 4.3, look: [-1.3, 0.45, 0.8] } },
  egzoz: { p: [-2.12, 0.28, 0.42], n: [-1, 0, 0.35], cam: { yaw: 1.2, el: 0.08, dist: 4.8, look: [-1.95, 0.38, 0.3] } },
};
export const GENEL = { cam: { yaw: -0.82, el: 0.27, dist: 9.0, look: [0.05, 0.32, 0] } };

// Sonradan yüklenen parçalar (kaput altı, egzoz hattı). Ad değişkenden okunur: vite ön yükleme
// eklentisi yalnız düz yazılmış loadAsset('…') çağrılarını görür, bunlar ilk yüklemeye binmez.
const SONRA = ['engine', 'battery', 'exhaust'];

export function createStage({ canvas, quality: q, reduced = false }) {
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lo, powerPreference: 'high-performance' });
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !lo;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const dprCap = lo ? 1.5 : 1.75;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 11, 26);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);

  // --- Işık: üstten soğuk beyaz ana ışık, arkadan açık yeşil kontur, yumuşak dolgu.
  const key = new THREE.DirectionalLight('#f2f4ee', 2.1);
  key.position.set(2.5, 7, 4.5);
  key.castShadow = !lo;
  key.shadow.mapSize.setScalar(1024);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 2; key.shadow.camera.far = 16;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#d9ff8f', 1.6);
  rim.position.set(-5, 2.6, -6);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight('#e8efe0', 0.5);
  rim2.position.set(6, 1.4, -3);
  scene.add(rim2);
  scene.add(new THREE.HemisphereLight('#dfe6da', '#141611', 0.35));

  // --- Zemin ve döner tabla
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: '#191c17', roughness: 0.94, metalness: 0, envMapIntensity: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const table = new THREE.Group();
  scene.add(table);
  const discTex = (() => {
    const s = lo ? 512 : 1024;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const m = s / 2;
    g.fillStyle = '#232720';
    g.fillRect(0, 0, s, s);
    // ince eş merkezli halkalar (fırçalanmış çelik gibi)
    for (let r = 4; r < m; r += 3) {
      g.strokeStyle = `rgba(255,255,255,${0.012 + ((r * 7919) % 13) / 900})`;
      g.lineWidth = 1;
      g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.stroke();
    }
    // kenar derece çizgileri: her 10°, 30°'de uzun ve açık yeşil
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const big = i % 6 === 0;
      const r0 = m * (big ? 0.9 : 0.93);
      const r1 = m * 0.965;
      g.strokeStyle = big ? 'rgba(198,255,61,.85)' : 'rgba(236,238,230,.28)';
      g.lineWidth = big ? s / 340 : s / 640;
      g.beginPath();
      g.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0);
      g.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.05, TABLA_Y, lo ? 72 : 128),
    [
      new THREE.MeshStandardMaterial({ color: '#2a2e27', roughness: 0.5, metalness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: discTex, roughness: 0.62, metalness: 0.35 }),
      new THREE.MeshStandardMaterial({ color: '#1b1e19' }),
    ]
  );
  disc.position.y = TABLA_Y / 2;
  disc.receiveShadow = true;
  table.add(disc);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.03, 0.013, 6, lo ? 128 : 220),
    new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false, fog: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = TABLA_Y + 0.002;
  table.add(ring);

  // Temas gölgesi: aracı tablaya oturtur (telefonda gölge haritası yok).
  const contact = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 64, 3, 32, 64, 32);
    r.addColorStop(0, 'rgba(0,0,0,.95)');
    r.addColorStop(0.6, 'rgba(0,0,0,.6)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 2, 0, -64);
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 128);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(5.0, 2.45),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.85 })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.PI / 2;
    m.position.y = TABLA_Y + 0.003;
    return m;
  })();
  table.add(contact);

  const carRoot = new THREE.Group();
  carRoot.position.y = TABLA_Y;
  table.add(carRoot);

  // --- Durum
  const S = {
    yaw: GENEL.cam.yaw - 1.4, el: GENEL.cam.el, dist: GENEL.cam.dist,
    lx: GENEL.cam.look[0], ly: GENEL.cam.look[1], lz: GENEL.cam.look[2],
    hood: 0, sx: 0, sy: 0, env: 0.85,
  };
  const HL = {}; // odak → { v: 0..1, mats: [{ m, base, lamp }] }
  let carA = null;
  let dirty = true;
  let W = 1, H = 1;
  const touch = () => (dirty = true);

  const ready = (async () => {
    const [env, car] = await Promise.all([
      loadEnv('studio', renderer, { quality: q }),
      loadAsset('car', { quality: q, renderer }),
    ]);
    scene.environment = env;
    scene.environmentIntensity = S.env;
    carA = car;
    const M = car.materials;
    if (M.paint) {
      M.paint.color.set('#d7d9d0');
      M.paint.metalness = 0.18;
      M.paint.roughness = 0.32;
      M.paint.map = null;
      M.paint.normalMap = null;
      if ('clearcoat' in M.paint) {
        M.paint.clearcoat = 1;
        M.paint.clearcoatRoughness = 0.07;
        M.paint.clearcoatNormalMap = null;
      }
      M.paint.needsUpdate = true;
    }
    if (M.rim_paint) M.rim_paint.color.set('#2c302a');
    if (M.caliper_paint) M.caliper_paint.color.set('#b7ef32');
    if (M.light_head) { M.light_head.emissive.set('#fff4dc'); M.light_head.emissiveIntensity = 0.15; }
    if (M.light_tail) { M.light_tail.emissive.set('#ff2a36'); M.light_tail.emissiveIntensity = 0.2; }
    car.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material && o.material.name) || '';
      if (/glass|interior|seat|dash|lamp|light|reflector|plate/.test(n)) o.castShadow = false;
      o.receiveShadow = false;
    });
    carRoot.add(car.scene);

    // Vurgu malzemeleri. Ön sağ fren ve arka sağ lastik kendi malzeme kopyasını alır (dört teker aynı malzemeyi paylaşır).
    const own = (nodeName) => {
      const out = [];
      car.nodes[nodeName]?.traverse((o) => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
        for (const m of [].concat(o.material)) out.push(m);
      });
      return out;
    };
    const add = (id, mats, opt = {}) => {
      HL[id] = HL[id] || { v: 0, mats: [] };
      for (const m of mats) if (m && m.emissive) HL[id].mats.push({ m, base: m.emissiveIntensity || 0, baseColor: m.emissive.clone(), ...opt });
    };
    add('fren', [...own('caliper_FR'), ...own('disc_FR')]);
    add('lastik', own('tyre_RR'));
    add('sogutma', [M.grille].filter(Boolean));
    add('klima', [M.dash].filter(Boolean));
    add('far', [M.light_head].filter(Boolean), { lamp: 3.2 });
    add('genel', []);
    add('motor', []);
    add('aku', []);
    add('egzoz', []);
    try { await renderer.compileAsync(scene, camera); } catch (_) {}
    dirty = true;
  })();

  // Kaput altı ve egzoz: ilk çizimden sonra, boşta ya da ilk dokunuşta.
  let extrasP = null;
  function loadExtras() {
    if (extrasP) return extrasP;
    extrasP = ready.then(() => Promise.all(SONRA.map((n) => loadAsset(n, { quality: q, renderer, shadows: false })))).then(([eng, bat, exh]) => {
      // Enine motor: krank ekseni aracın enine (Z), kaputun altında.
      const e = eng.scene;
      e.scale.setScalar(0.86);
      e.rotation.y = Math.PI / 2;
      e.position.set(1.4, 0.26, -0.02);
      carRoot.add(e);
      const b = bat.scene;
      b.position.set(1.66, 0.5, 0.47);
      b.rotation.y = Math.PI / 2;
      carRoot.add(b);
      // Egzoz hattı gövdenin altında, ucu arka tamponun altından çıkar.
      const x = exh.scene;
      x.scale.set(0.95, 0.62, 0.9);
      x.position.set(-0.33, 0.1, 0.36);
      carRoot.add(x);
      // Motor bölmesinin tabanı: kaput açılınca zemin görünmesin.
      const tub = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.04, 1.3),
        new THREE.MeshStandardMaterial({ color: '#0c0d0b', roughness: 0.9 })
      );
      tub.position.set(1.5, 0.3, 0);
      carRoot.add(tub);
      const matsOf = (root) => {
        const s = new Set();
        root.traverse((o) => o.isMesh && [].concat(o.material).forEach((m) => s.add(m)));
        return [...s];
      };
      const reg = (id, root) => {
        for (const m of matsOf(root)) if (m.emissive) HL[id].mats.push({ m, base: m.emissiveIntensity || 0, baseColor: m.emissive.clone(), scale: 0.2, tint: 0.42 });
      };
      reg('motor', e);
      reg('aku', b);
      reg('egzoz', x);
      applyHL();
      dirty = true;
    }).catch(() => {});
    return extrasP;
  }
  ready.then(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
    idle(() => loadExtras(), { timeout: 2500 });
  });

  function applyHL() {
    for (const h of Object.values(HL)) {
      for (const it of h.mats) {
        if (it.lamp) {
          it.m.emissiveIntensity = it.base + h.v * it.lamp;
        } else {
          it.m.emissive.copy(it.baseColor).lerp(LIME, h.v * (it.tint ?? 1));
          it.m.emissiveIntensity = it.base + h.v * 0.55 * (it.scale ?? 1);
        }
      }
    }
  }

  // --- Kamera
  const v = new THREE.Vector3();
  const look = new THREE.Vector3();
  function applyCamera() {
    table.rotation.y = S.yaw;
    const aspect = W / H;
    // Dar (dikey) kadrajda araç sığsın diye kamera geri çekilir.
    const fit = aspect < 1.45 ? Math.pow(1.45 / aspect, 0.55) : 1;
    // Kart alttayken (sy) kadraj küçülür: kamera biraz geri çekilir.
    const dist = S.dist * fit * (1 + S.sy * 0.9);
    look.set(S.lx, S.ly, S.lz).applyAxisAngle(THREE.Object3D.DEFAULT_UP, S.yaw);
    look.y += TABLA_Y;
    const cosE = Math.cos(S.el);
    camera.position.set(look.x, look.y + dist * Math.sin(S.el), look.z + dist * cosE);
    camera.lookAt(look);
    // Kadrajı kaydır (kart açıkken araç kartın karşısında durur): sx > 0 sola, sy > 0 yukarı.
    const ax = Math.abs(S.sx), ay = Math.abs(S.sy);
    const fw = W * (1 + 2 * ax), fh = H * (1 + 2 * ay);
    const ox = S.sx > 0 ? 2 * W * ax : 0;
    const oy = S.sy > 0 ? 2 * H * ay : 0;
    camera.setViewOffset(fw, fh, ox, oy, W, H);
    camera.aspect = fw / fh;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(30) / 2) * (fh / H)));
    camera.updateProjectionMatrix();
    scene.environmentIntensity = S.env;
    if (carA?.nodes.hood) carA.nodes.hood.rotation.z = 0.92 * S.hood;
  }

  // --- Noktaların ekran konumu
  const n3 = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  function project(id) {
    const P = NOKTALAR[id];
    v.fromArray(P.p);
    v.y += TABLA_Y;
    v.applyAxisAngle(THREE.Object3D.DEFAULT_UP, S.yaw);
    n3.fromArray(P.n).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, S.yaw);
    toCam.copy(camera.position).sub(v).normalize();
    const facing = n3.dot(toCam);
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, facing, front: v.z < 1 };
  }

  // --- Odak geçişi
  let tw = null;
  let focusId = null;
  const nearYaw = (target) => {
    const TAU = Math.PI * 2;
    let d = ((target - S.yaw) % TAU + TAU * 1.5) % TAU - TAU / 2;
    return S.yaw + d;
  };
  function focus(id, { shift = [0, 0], instant = false } = {}) {
    const def = id && NOKTALAR[id] ? NOKTALAR[id] : GENEL;
    const c = def.cam;
    if (id && id !== focusId) loadExtras();
    focusId = id;
    tw?.kill();
    const to = {
      yaw: nearYaw(c.yaw), el: c.el, dist: c.dist, lx: c.look[0], ly: c.look[1], lz: c.look[2],
      hood: def.hood ? 1 : 0, sx: shift[0], sy: shift[1], env: id && id !== 'genel' ? 0.62 : 0.85,
    };
    for (const [k, h] of Object.entries(HL)) {
      gsap.to(h, { v: k === id ? 1 : 0, duration: instant ? 0 : 0.5, ease: 'power2.out', onUpdate: () => { applyHL(); dirty = true; } });
    }
    if (instant || reduced) {
      Object.assign(S, to);
      dirty = true;
      return;
    }
    tw = gsap.to(S, { ...to, duration: 1.05, ease: 'power2.inOut', onUpdate: touch });
  }
  function setShift(sx, sy, instant = false) {
    if (instant || reduced) { S.sx = sx; S.sy = sy; dirty = true; return; }
    gsap.to(S, { sx, sy, duration: 0.7, ease: 'power2.inOut', onUpdate: touch, overwrite: 'auto' });
  }

  // --- Döndürme (sürükleme + atalet)
  let vel = 0;
  function rotateBy(d) {
    tw?.kill();
    tw = null;
    S.yaw += d;
    dirty = true;
  }
  function fling(v0) { vel = reduced ? 0 : v0; }
  function turn(d) {
    tw?.kill();
    if (reduced) { S.yaw += d; dirty = true; return; }
    tw = gsap.to(S, { yaw: S.yaw + d, duration: 0.6, ease: 'power3.out', onUpdate: touch });
  }
  function intro() {
    S.yaw = reduced ? GENEL.cam.yaw : GENEL.cam.yaw - 1.4;
    dirty = true;
    if (reduced) return;
    tw = gsap.to(S, { yaw: GENEL.cam.yaw, duration: 1.6, ease: 'expo.out', onUpdate: touch });
  }
  function skipIntro() {
    if (tw && tw.vars.duration === 1.6) tw.progress(1);
  }

  function resize(w, h) {
    W = Math.max(1, w); H = Math.max(1, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(W, H, false);
    dirty = true;
  }

  // Kare: yalnız değişiklik varsa çiz. Dönen atalet kendiliğinden söner.
  function frame(dt) {
    if (Math.abs(vel) > 0.0004) {
      S.yaw += vel * dt * 60;
      vel *= Math.exp(-dt * 5.5);
      dirty = true;
    } else vel = 0;
    if (!dirty) return false;
    dirty = false;
    applyCamera();
    renderer.render(scene, camera);
    return true;
  }

  return {
    ready, focus, setShift, rotateBy, fling, turn, intro, skipIntro, resize, frame, project, loadExtras,
    get focusId() { return focusId; },
    get moving() { return !!(tw && tw.isActive()) || Math.abs(vel) > 0.0004; },
    invalidate: touch,
  };
}
