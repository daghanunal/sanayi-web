// Kaput açılış sahnesi: karanlık atölyede koyu bordo bir hatchback'in önü (lib3d `car`), kaputun
// altında motor (lib3d `engine` v2). Açılışta kaput kalkar, sıcak iş lambası yanar ve yüksek
// pencereden gelen ışık süzmesi aracın üstünden bir kez geçer. Sonra sahne yalnız kaydırmayla
// (künye ekrandayken) hafifçe motora yaklaşır; künye ekrandan çıkınca çizim tamamen durur.
// Araç kendi çerçevesinde: ön +X, sağ yan +Z, zemin y = 0.
import * as THREE from 'three';
import { loadAsset, loadEnv } from '../../shared/lib3d.js';

const BG = new THREE.Color('#0f0b08');
const WARM = new THREE.Color('#ffb35c');

// Kamera durakları: bakılan nokta (look), yatay açı (az; 0 = aracın tam önü, + = sağ yan), yükseklik (el), uzaklık.
export const SHOTS = {
  start: { lx: 1.75, ly: 0.62, lz: 0.05, az: 0.82, el: 0.1, dist: 3.4 },
  open: { lx: 1.38, ly: 0.66, lz: 0.0, az: 0.58, el: 0.46, dist: 3.9 },
  push: { lx: 1.36, ly: 0.6, lz: 0.0, az: 0.42, el: 0.78, dist: 2.9 },
};

const shaftFrag = /* glsl */ `
  uniform float uA;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    across = pow(across, 2.2);
    float along = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    gl_FragColor = vec4(uColor * across * along * uA * 0.34, 1.0);
    #include <colorspace_fragment>
  }`;
const shaftVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function createScene(canvas, { quality: q }) {
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lo, powerPreference: 'high-performance' });
  renderer.setClearColor(BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lo;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const dprCap = lo ? 1.5 : 1.75;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 6, 16);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

  // --- Işık: sıcak iş lambası (motorun üstünde), pencereden soğuk kontur, çok kısık ortam.
  const lamp = new THREE.SpotLight(WARM, 0, 7, 0.62, 0.85, 1.6);
  lamp.position.set(2.05, 2.05, 0.55);
  lamp.target.position.set(1.4, 0.45, 0);
  lamp.castShadow = !lo;
  lamp.shadow.mapSize.setScalar(1024);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.02;
  scene.add(lamp, lamp.target);
  const bulb = new THREE.PointLight(WARM, 0, 2.4, 2);
  bulb.position.set(1.95, 1.45, 0.45);
  scene.add(bulb);
  const win = new THREE.DirectionalLight('#b8c8d6', 0.0);
  win.position.set(-3, 5, -4);
  scene.add(win);
  const kick = new THREE.DirectionalLight('#ffcf98', 0.25);
  kick.position.set(5, 1.2, 3);
  scene.add(kick);

  // --- Zemin: sıcak beton, lamba havuzunu taşır.
  const floorTex = (() => {
    const s = lo ? 256 : 512;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = '#2a241d';
    g.fillRect(0, 0, s, s);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < s * 8; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,235,210'},${0.02 + r() * 0.05})`;
      g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 8);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ map: floorTex, color: '#8a7a68', roughness: 0.86, metalness: 0, envMapIntensity: 0.25 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- Arka duvarda yüksek pencere (ışık süzmesinin kaynağı), sisle yumuşar.
  const windowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      g.fillStyle = `rgba(255,${214 + j * 8},${170 + j * 14},${0.75 - j * 0.12})`;
      g.fillRect(8 + i * 41, 8 + j * 40, 35, 34);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const windowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.1),
    new THREE.MeshBasicMaterial({ map: windowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: true })
  );
  windowMesh.position.set(-2.5, 3.4, -5.2);
  windowMesh.rotation.y = 0.35;
  scene.add(windowMesh);

  // --- Işık süzmesi: pencereden araca inen iki geniş hacim bandı (eklemeli).
  const shaftMat = new THREE.ShaderMaterial({
    vertexShader: shaftVert, fragmentShader: shaftFrag,
    uniforms: { uA: { value: 0 }, uColor: { value: new THREE.Color('#ffd9a6') } },
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  });
  // Bantlar pencereden araca uzanır; her karede kendi ekseni etrafında kameraya döner (hacim hissi).
  const shafts = [];
  for (const [w, off, k] of [[1.5, 0, 1], [0.8, 0.95, 0.55], [0.5, -0.8, 0.4]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shaftMat.clone());
    m.material.uniforms.uA = { value: 0 };
    m.userData = { w, off, k };
    scene.add(m);
    shafts.push(m);
  }
  const SRC = new THREE.Vector3(-2.4, 4.6, -3.6);
  const _t = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Vector3(), _z = new THREE.Vector3(), _x = new THREE.Vector3();
  const _basis = new THREE.Matrix4();
  function placeShafts(sweep) {
    for (const m of shafts) {
      const { w, off } = m.userData;
      _t.set(-0.4 + sweep * 2.6 + off, 0, 0.5 + off * 0.3);
      const src = _m.copy(SRC).add(_x.set(off * 0.6, 0, off * 0.2));
      _d.subVectors(_t, src);
      const len = _d.length();
      _d.normalize();
      const mid = src.clone().addScaledVector(_d, len / 2);
      _z.subVectors(camera.position, mid);
      _z.addScaledVector(_d, -_z.dot(_d)).normalize();
      _x.crossVectors(_d, _z).normalize();
      _basis.makeBasis(_x, _d, _z);
      m.quaternion.setFromRotationMatrix(_basis);
      m.position.copy(mid);
      m.scale.set(w, len * 1.1, 1);
    }
  }

  // Toz: ışığın içinde asılı zerreler (yalnız masaüstü).
  let dust = null;
  if (!lo) {
    const n = 420;
    const pos = new Float32Array(n * 3);
    let seed = 11;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -0.6 + r() * 3.6;
      pos[i * 3 + 1] = 0.2 + r() * 2.6;
      pos[i * 3 + 2] = -1.6 + r() * 2.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe2b8', size: 0.012, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(dust);
  }

  // Temas gölgesi (telefonda gölge haritası yok)
  const contact = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(32, 64, 3, 32, 64, 32);
    rg.addColorStop(0, 'rgba(0,0,0,.9)');
    rg.addColorStop(0.6, 'rgba(0,0,0,.55)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 2, 0, -64);
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.PI / 2;
    m.position.y = 0.003;
    return m;
  })();
  scene.add(contact);

  // --- Durum
  const S = { ...SHOTS.start, hood: 0, lamp: 0, shaft: 0, sweep: 0, sx: 0, sy: 0 };
  let carA = null;
  let W = 1, H = 1;
  let dirty = true;

  const ready = (async () => {
    const [env, car, eng, rad, bat] = await Promise.all([
      loadEnv('workshop', renderer, { quality: q }),
      loadAsset('car', { quality: q, renderer }),
      loadAsset('engine', { version: 2, quality: q, renderer }),
      loadAsset('radiator', { quality: q, renderer }),
      loadAsset('battery', { quality: q, renderer }),
    ]);
    scene.environment = env;
    scene.environmentIntensity = 0.22;
    carA = car;
    const M = car.materials;
    if (M.paint) {
      M.paint.color.set('#3a1613');
      M.paint.metalness = 0.3;
      M.paint.roughness = 0.34;
      M.paint.map = null;
      M.paint.normalMap = null;
      if ('clearcoat' in M.paint) {
        M.paint.clearcoat = 1;
        M.paint.clearcoatRoughness = 0.1;
        M.paint.clearcoatNormalMap = null;
      }
      M.paint.needsUpdate = true;
    }
    if (M.rim_paint) M.rim_paint.color.set('#3a342d');
    if (M.light_head) { M.light_head.emissive.set('#ffe9c8'); M.light_head.emissiveIntensity = 0.05; }
    car.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material && o.material.name) || '';
      if (/glass|interior|seat|dash|lamp|light|reflector|plate/.test(n)) o.castShadow = false;
      o.receiveShadow = /paint|trim|plastic/.test(n);
    });
    scene.add(car.scene);
    // Enine motor, kaputun altında
    const e = eng.scene;
    e.scale.setScalar(0.98);
    e.rotation.y = Math.PI / 2;
    e.position.set(1.36, 0.24, -0.08);
    e.traverse((o) => { if (o.isMesh) { o.castShadow = !lo; o.receiveShadow = true; } });
    scene.add(e);
    // Radyatör ön panelin arkasında, akü sağ çamurluk tarafında.
    rad.scene.scale.setScalar(0.95);
    rad.scene.position.set(1.93, 0.3, 0.0);
    scene.add(rad.scene);
    bat.scene.position.set(1.62, 0.5, 0.5);
    bat.scene.rotation.y = Math.PI / 2;
    scene.add(bat.scene);
    // Motor bölmesi: taban, iç çamurluklar ve torpido altı perdesi (tekerlek ve boşluk görünmesin).
    const bayMat = new THREE.MeshStandardMaterial({ color: '#0c0a08', roughness: 0.85, metalness: 0.1 });
    const box = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), bayMat); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); };
    box(1.05, 0.04, 1.34, 1.5, 0.28, 0);
    box(1.0, 0.5, 0.05, 1.45, 0.58, 0.7);
    box(1.0, 0.5, 0.05, 1.45, 0.58, -0.7);
    box(0.05, 0.62, 1.36, 0.98, 0.6, 0);
    // Torpido önü plenum kapağı: ön camın dibinden kaput menteşe hattına kadar siyah plastik panel.
    // Gövdenin kaput boşluğundaki dişli kenarını ve arkadan görünen torpidoyu örter.
    const plenumMat = (M.plastic_black || M.trim_black || bayMat).clone();
    plenumMat.color.multiplyScalar(0.8);
    const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.025, 1.56), plenumMat);
    plenum.position.set(1.04, 0.992, 0);
    plenum.rotation.z = -0.1;
    plenum.receiveShadow = true;
    scene.add(plenum);
    box(0.3, 0.035, 1.5, 1.02, 0.925, 0);
    try { await renderer.compileAsync(scene, camera); } catch (_) {}
    dirty = true;
  })();

  const look = new THREE.Vector3();
  function apply() {
    look.set(S.lx, S.ly, S.lz);
    const cosE = Math.cos(S.el);
    const aspect = W / H;
    const fit = aspect < 1.2 ? Math.pow(1.2 / aspect, 0.6) : 1;
    const d = S.dist * fit;
    camera.position.set(look.x + d * cosE * Math.cos(S.az), look.y + d * Math.sin(S.el), look.z + d * cosE * Math.sin(S.az));
    camera.lookAt(look);
    const ax = Math.abs(S.sx), ay = Math.abs(S.sy);
    const fw = W * (1 + 2 * ax), fh = H * (1 + 2 * ay);
    camera.setViewOffset(fw, fh, S.sx > 0 ? 2 * W * ax : 0, S.sy > 0 ? 2 * H * ay : 0, W, H);
    camera.aspect = fw / fh;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(32) / 2) * (fh / H)));
    camera.updateProjectionMatrix();

    if (carA?.nodes.hood) carA.nodes.hood.rotation.z = 0.92 * S.hood;
    lamp.intensity = 26 * S.lamp;
    bulb.intensity = 1.6 * S.lamp;
    win.intensity = 0.55 * S.shaft;
    windowMesh.material.opacity = 0.5 * S.shaft;
    for (const m of shafts) m.material.uniforms.uA.value = S.shaft * m.userData.k;
    placeShafts(S.sweep);
    if (dust) dust.material.opacity = 0.55 * S.shaft;
  }

  function resize(w, h) {
    W = Math.max(1, w); H = Math.max(1, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(W, H, false);
    dirty = true;
  }
  function frame() {
    if (!dirty) return false;
    dirty = false;
    apply();
    renderer.render(scene, camera);
    return true;
  }
  return { S, ready, resize, frame, invalidate: () => (dirty = true) };
}
