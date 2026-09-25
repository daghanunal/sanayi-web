// Kalıcı WebGL sahnesi: stüdyo fonunda bir kaide ve etrafında dönen yedi parça.
// main.js her karede film zamanını (T) verir: 0-1 giriş, 1-2 döner vitrin, 2-3 şasi, 3-4 rakamlar,
// 4-5 teslimat, 6-7 final. Sahne her şeyi T'den ve saatten deterministik olarak hesaplar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createMaterials, createPart } from './parts.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const sm = (t) => t * t * (3 - 2 * t);
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t) => 1 - Math.pow(1 - t, 3);
const L = (a, b, t) => a + (b - a) * t;

function shadowTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(20,10,35,.55)');
  r.addColorStop(0.5, 'rgba(20,10,35,.22)');
  r.addColorStop(1, 'rgba(20,10,35,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kamera durakları: [T, konum, hedef]
const CAM = [
  [0.0, [0, 1.5, 7.4], [0, 0.75, 0]],
  [0.85, [0, 2.3, 6.4], [0, 0.8, 0]],
  [1.0, [0, 1.75, 5.3], [0, 0.78, 0]],
  [1.95, [0, 1.75, 5.3], [0, 0.78, 0]],
  [2.12, [0, 2.9, 6.6], [0, 0.55, 0]],
  [2.92, [0, 2.3, 6.0], [0, 0.7, 0]],
  [3.0, [0, 1.3, 6.4], [0, 1.2, 0]],
  [3.84, [0, 4.9, 6.4], [0, 4.6, 0]],
  [4.0, [0, 10.5, 1.6], [0, 0, 0]],
  [5.0, [0, 10.5, 1.2], [0, 0, 0]],
  [6.0, [0, 6.5, 8.5], [0, 1.2, 0]],
  [6.75, [0, 1.8, 6.9], [0, 0.72, 0]],
  [7.0, [0, 1.8, 6.9], [0, 0.72, 0]],
];

export function createStage(canvas, { kinds, lite }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lite, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9b8ff, 1.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5a8a, 0.5));

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  // Kaide
  const pedMat = new THREE.MeshStandardMaterial({ color: 0xcfc3f2, roughness: 0.55, metalness: 0 });
  const pedestal = new THREE.Group();
  const prof = [[0, -6], [0.98, -6], [0.98, -0.07], [0.965, -0.02], [0.93, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  pedestal.add(new THREE.Mesh(new THREE.LatheGeometry(prof, lite ? 64 : 96), pedMat));
  const M = createMaterials();
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.014, 8, lite ? 80 : 128), M.krom);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.012;
  pedestal.add(lip);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  pedestal.add(shadow);
  scene.add(pedestal);

  // Teslimat halkaları
  const RINGS = [1.45, 2.2, 3.0, 3.85];
  const ringMat = RINGS.map(() => new THREE.MeshBasicMaterial({ color: 0x241536, transparent: true, opacity: 0, depthWrite: false }));
  const rings = RINGS.map((r, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.012, r + 0.012, 160), ringMat[i]);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.01;
    m.visible = false;
    scene.add(m);
    return m;
  });
  const dashGeo = new THREE.CircleGeometry(0.07, 20);
  const pinMat = new THREE.MeshBasicMaterial({ color: 0x5b2bff });
  const centerPin = new THREE.Mesh(dashGeo, pinMat);
  centerPin.rotation.x = -Math.PI / 2;
  centerPin.position.y = 0.02;
  centerPin.scale.setScalar(2);
  scene.add(centerPin);

  // Parçalar
  const N = kinds.length;
  const parts = kinds.map((k, i) => {
    const holder = new THREE.Group();
    const spin = new THREE.Group();
    spin.add(createPart(k, M, lite));
    holder.add(spin);
    scene.add(holder);
    return { holder, spin, phase: i * 1.7 };
  });

  let W = 1, H = 1, aspect = 1, mobile = false;
  function setSize(w, h) {
    W = w;
    H = h;
    aspect = w / h;
    mobile = aspect < 0.8;
    renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.25 : 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = mobile ? 48 : 36;
    camera.updateProjectionMatrix();
  }

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tgt = new THREE.Vector3();
  function camAt(T) {
    let i = 0;
    while (i < CAM.length - 2 && T > CAM[i + 1][0]) i++;
    const [t0, p0, g0] = CAM[i];
    const [t1, p1, g1] = CAM[i + 1];
    const e = io(seg(T, t0, t1));
    tmpA.set(L(p0[0], p1[0], e), L(p0[1], p1[1], e), L(p0[2], p1[2], e));
    tgt.set(L(g0[0], g1[0], e), L(g0[1], g1[1], e), L(g0[2], g1[2], e));
  }

  const tint = new THREE.Color();
  function setTint(hex) {
    tint.set(hex);
    // kaideyi fondan biraz koyu ve doygun yap
    const hsl = {};
    tint.getHSL(hsl);
    pedMat.color.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), hsl.l * 0.86);
  }

  const P = new THREE.Vector3();
  let intro = 1;
  // shift: görüntüyü kaydır (masaüstünde kaide sağa, mobilde yukarı)
  function update(T, time, { active = 0, activeF = 0, shiftX = 0, shiftY = 0, introP = 1 } = {}) {
    intro = introP;
    const ie = out(introP);

    const wTotem = sm(seg(T, 2.86, 3.0)) * (1 - sm(seg(T, 3.84, 3.98)));
    const wDel = T < 5.5 ? sm(seg(T, 3.86, 4.0)) : 0;

    // --- Kamera
    camAt(T);
    // dar ekranda uzaklaş (teslimat halkaları ekrana sığsın)
    const far = mobile ? 1.18 + 0.62 * wDel : 1;
    tmpB.copy(tmpA).sub(tgt).multiplyScalar(far).add(tgt);
    camera.position.copy(tmpB);
    camera.lookAt(tgt);
    if (shiftX || shiftY) camera.setViewOffset(W, H, -shiftX * W, shiftY * H, W, H);
    else camera.clearViewOffset();

    // --- Halka parametreleri
    const Rh = mobile ? 1.5 : 2.3;
    let R = Rh, y = mobile ? 1.42 : 0.52, s = mobile ? 0.72 : 0.7;
    let A = time * 0.16 + T * 1.6;
    // vitrin: halka alçalır, küçülür
    const vIn = sm(seg(T, 0.8, 1.0));
    R = L(R, mobile ? 1.55 : 1.75, vIn);
    y = L(y, 0.18, vIn);
    s = L(s, mobile ? 0.36 : 0.42, vIn);
    A += activeF * (TAU / N);
    // şasi: hızlı dönüş, sonra durur
    const spinUp = out(seg(T, 2.05, 2.55));
    A += spinUp * TAU * 2.25;
    const sIn = sm(seg(T, 1.95, 2.15));
    y = L(y, 0.55, sIn);
    s = L(s, mobile ? 0.5 : 0.56, sIn);
    // final
    if (T >= 5.5) {
      const f = io(seg(T, 6.0, 6.7));
      R = L(mobile ? 4 : 5.5, mobile ? 1.45 : 2.05, f);
      y = L(3.5, 0.62, f);
      s = mobile ? 0.58 : 0.62;
      A = time * 0.22 + (1 - f) * 4;
    }
    // giriş
    R = L(R * 3.2, R, ie);
    y += (1 - ie) * 2.6;
    A += (1 - ie) * 3.2;


    for (let k = 0; k < N; k++) {
      const pt = parts[k];
      const a = A + (k / N) * TAU;
      P.set(Math.sin(a) * R, y + Math.sin(time * 1.1 + pt.phase) * 0.05, Math.cos(a) * R);
      let sc = s;
      let spinY = time * 0.5 + pt.phase;

      // rakamlar: parçalar üst üste dizilip bir sütun olur
      if (wTotem > 0) {
        const tx = mobile ? 1.15 : 1.55;
        const ty = 0.95 + k * 0.62;
        const tz = mobile ? -0.8 : 0;
        P.set(L(P.x, tx + Math.sin(time * 0.7 + k) * 0.05, wTotem), L(P.y, ty, wTotem), L(P.z, tz, wTotem));
        sc = L(sc, mobile ? 0.5 : 0.55, wTotem);
        spinY += wTotem * (k % 2 ? -1 : 1) * time * 0.3;
      }
      // teslimat: her parça bir halkada kurye gibi döner
      if (wDel > 0) {
        const j = k % 4;
        const r = RINGS[j];
        const appear = out(seg(T, 4.12 + j * 0.16, 4.3 + j * 0.16));
        const ang = time * (0.5 - j * 0.09) + k * 2.1;
        const dx = Math.cos(ang) * r, dz = Math.sin(ang) * r;
        P.set(L(P.x, dx, wDel), L(P.y, 0.3, wDel), L(P.z, dz, wDel));
        sc = L(sc, (mobile ? 0.62 : 0.5) * (0.2 + 0.8 * appear), wDel);
      }
      // kaideye çıkan parça
      let w = 0;
      if (T > 0.8 && T < 2.2) {
        w = clamp(1 - Math.abs(activeF - k)) * sm(seg(T, 0.86, 1.0)) * (1 - sm(seg(T, 1.94, 2.0)));
      }
      if (k === 0) w = Math.max(w, sm(seg(T, 2.5, 2.64)) * (1 - sm(seg(T, 2.84, 2.95))));
      if (T >= 5.5 && k === 0) w = Math.max(w, sm(seg(T, 6.4, 6.8)));
      if (w > 0) {
        const lift = Math.sin(w * Math.PI) * 0.7;
        const top = 0.95 + Math.sin(time * 1.3) * 0.04;
        P.set(L(P.x, 0, w), L(P.y, top, w) + lift, L(P.z, 0, w));
        sc = L(sc, mobile ? 1.25 : 1.4, io(w));
        spinY = L(spinY, time * 0.45 + Math.sin(time * 0.6) * 0.3, w);
      }
      pt.holder.position.copy(P);
      pt.holder.scale.setScalar(sc * (0.25 + 0.75 * ie));
      pt.spin.rotation.y = spinY;
    }

    // --- Kaide ve halkalar
    pedestal.position.y = -(1 - ie) * 3 - wTotem * 4.5;
    let occ = 0;
    for (let k = 0; k < N; k++) {
      const h = parts[k].holder.position;
      if (Math.hypot(h.x, h.z) < 0.6) occ = Math.max(occ, clamp(1.6 - h.y) * clamp(1.4 - Math.hypot(h.x, h.z) * 2));
    }
    shadow.material.opacity = occ * 0.9;
    shadow.visible = occ > 0.01;
    const ringsOn = wDel > 0.01;
    rings.forEach((m, j) => {
      m.visible = ringsOn;
      if (ringsOn) {
        const ap = out(seg(T, 4.1 + j * 0.16, 4.3 + j * 0.16));
        m.scale.setScalar(0.4 + 0.6 * ap);
        ringMat[j].opacity = 0.55 * ap * wDel;
      }
    });
    centerPin.visible = ringsOn;
    renderer.render(scene, camera);
  }

  return { setSize, update, setTint, renderer };
}
