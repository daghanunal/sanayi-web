// Garaj hero: lib3d'nin gerçekçi 1.6 L sıralı dört motoru (public/lib3d/engine-*), atölye HDRI'si ile
// aydınlatılır. Rölantide krank, eksantrikler ve pistonlar gerçek kinematikle döner (ateşleme sırası
// 1-3-4-2); scroll ilerledikçe motor parça parça açılır (patlatılmış görünüm) ve kamera etrafında döner.
// Telefonda 'lo' kalite, DPR ≤ 1.5, ekran dışında render durur.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

// Kinematik (assets3d/README.md → engine): krank ekseni y = 0.160, r = 0.0418, L = 0.140
const CRANK_Y = 0.16;
const R = 0.0418;
const L = 0.14;
const PHASE = [0, Math.PI, Math.PI, 0];
const pinY = (a) => CRANK_Y + R * Math.cos(a) + Math.sqrt(L * L - (R * Math.sin(a)) ** 2);
const EXPLODE_MAX = 0.62; // tam açılım çok uzun bir yığın: bu kadarı ekranda okunur kalır
const LIFT = 0.44; // karter aşağı açılırken yere girmesin diye motor bu kadar yükselir (× açılım)

export function createEngine(canvas, { reducedMotion = false } = {}) {
  const quality = pickQuality();
  const lo = quality === 'lo';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lo, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.hidden = true;
    const noop = () => {};
    return { ready: Promise.resolve(false), setProgress: noop, setRpm: noop, start: noop, stop: noop, renderOnce: noop };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lo ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !lo;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environmentIntensity = 1.05;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);

  // Işık: HDRI ortam ışığının üstüne sıcak bir tepe ışığı (gölge verir) ve arkadan kızgın metal
  // turuncusu kontur. Kontur, garaj kimliğinin rengi.
  const key = new THREE.DirectionalLight(0xfff6ea, 1.5);
  key.position.set(0.9, 2.2, 1.1);
  key.castShadow = !lo; // telefonda gölge haritası yok: temas gölgesi yeter (akne ve maliyet yok)
  key.shadow.mapSize.setScalar(lo ? 512 : 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -0.9;
  key.shadow.camera.right = key.shadow.camera.top = 0.9;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 5;
  key.shadow.bias = -0.0015;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0xff5a17, 3.4);
  rim.position.set(-1.6, 0.9, -1.4);
  const under = new THREE.PointLight(0xff7a2a, 0.35, 1.6, 1.5);
  under.position.set(0.1, 0.05, 0.55);
  scene.add(key, key.target, rim, under);

  // Zemin: yalnız gölgeyi alan şeffaf düzlem + yumuşak temas gölgesi
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.5 }));
  ground.visible = !lo;
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,.75)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.0),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.001;
  scene.add(ground, blob);

  const rig = new THREE.Group(); // motor + açılım kaldırması
  scene.add(rig);

  let asset = null;
  let pistons = [];
  let rods = [];
  let crank = null;
  let cams = [];
  let theta = 0.9;
  let progress = 0;
  let rpm = 850;
  let running = false;
  let visible = true;
  let raf = 0;
  let last = performance.now();
  let t0 = performance.now();

  const ready = (async () => {
    const [env, eng] = await Promise.all([
      loadEnv('garage', renderer, { quality: 'lo' }),
      loadAsset('engine', { quality, renderer, shadows: true }),
    ]);
    scene.environment = env;
    asset = eng;
    rig.add(eng.scene);
    if (lo) eng.scene.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = false; });
    const n = eng.nodes;
    crank = n.crankshaft;
    cams = [n.camshaft_intake, n.camshaft_exhaust].filter(Boolean);
    pistons = [1, 2, 3, 4].map((i) => n[`piston_${i}`]);
    rods = [1, 2, 3, 4].map((i) => n[`conrod_${i}`]);
    resize();
    return true;
  })().catch((e) => {
    console.warn('garaj motoru yüklenemedi', e);
    canvas.hidden = true;
    return false;
  });

  const ease = (x) => x * x * (3 - 2 * x);
  function pose() {
    if (!asset) return;
    const e = ease(Math.min(1, Math.max(0, (progress - 0.18) / 0.62))) * EXPLODE_MAX;
    asset.explode(e); // tabanları yazar; kinematik bunun üstüne eklenir
    rig.position.y = LIFT * e;
    if (crank) crank.rotation.x = theta;
    for (const c of cams) c.rotation.x = theta / 2;
    for (let i = 0; i < 4; i++) {
      const a = theta + PHASE[i];
      if (pistons[i]) pistons[i].position.y += pinY(a) - pinY(PHASE[i]);
      if (rods[i]) rods[i].rotation.x = -Math.asin((R * Math.sin(a)) / L);
    }
    // takozlar üzerinde hafif sarsıntı: devirle artar
    const shake = reducedMotion ? 0 : (0.0009 + (rpm - 850) / 6000 * 0.0018) * (1 - e);
    rig.rotation.x = Math.sin(theta * 2) * shake;
    rig.position.x = Math.sin(theta * 4 + 1.3) * shake * 0.25;
    ground.material.opacity = 0.5 * (1 - e * 0.6);
    blob.material.opacity = 1 - e * 1.2;
  }

  const look = new THREE.Vector3();
  function placeCamera() {
    const portrait = camera.aspect < 0.9;
    const p = ease(progress);
    const e = ease(Math.min(1, Math.max(0, (progress - 0.18) / 0.62)));
    const idle = reducedMotion ? 0 : Math.sin((performance.now() - t0) / 4200) * 0.05;
    const yaw = THREE.MathUtils.lerp(portrait ? 0.95 : 0.78, portrait ? -0.55 : -0.62, p) + idle;
    const pitch = THREE.MathUtils.lerp(0.2, 0.36, p);
    // yığın büyüdükçe kamera geri çekilir; telefonda motor üst yarıda, metin altta
    const dist = (portrait ? 2.8 : 2.6) * (1 + e * (portrait ? 0.58 : 0.55));
    const cy = 0.3 + e * (portrait ? 0.4 : 0.36);
    look.set(portrait ? 0.0 : THREE.MathUtils.lerp(-0.5, -0.26, p), cy - (portrait ? 0.2 * (1 + e * 0.8) : 0.02), 0);
    camera.position.set(
      look.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      look.y + Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camera.lookAt(look);
  }

  function render() {
    pose();
    placeCamera();
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 34 : 28;
    camera.updateProjectionMatrix();
    if (!running && asset) render();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // görsel devir gerçeğin çok altında (rölanti 850 d/d → yavaş, okunur dönüş)
    theta += dt * (rpm / 60) * 2 * Math.PI * 0.1;
    render();
    if (running) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);

  return {
    ready,
    setProgress(p) {
      progress = p;
      if (!running && asset && visible) render();
    },
    setRpm(v) { rpm = v; },
    start() {
      visible = true;
      if (running || reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      visible = false;
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce() { ready.then(() => render()); },
  };
}
