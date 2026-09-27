// Ekspertiz bölmesi, foto-gerçekçi: lib3d `garage` (iki direkli lift, dolaplar, tavan tüpleri) içinde
// lib3d `car_sedan`. Boya kalınlığı sınıfı panel panel boyaya işlenir (tek shader, araç uzayında panel
// sınırları yüklemede ölçülür). Tarama kapısı, dinamometre merdaneleri ve teşhis cihazı bu dosyada
// kodla kurulur. Sahne durumu dışarıdan `render(state)` ile verilir; kurgu main.js'te.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Paneller: shader'daki sıra (data.paneller id'leriyle eşlenir)
export const PANEL_IDS = [
  'on-tampon', 'kaput', 'sol-on-camurluk', 'sag-on-camurluk', 'sol-on-kapi', 'sag-on-kapi',
  'sol-arka-kapi', 'sag-arka-kapi', 'sol-arka-camurluk', 'sag-arka-camurluk', 'tavan', 'bagaj', 'arka-tampon',
];
const BG = 0x07080c;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createScene(canvas, { lite = false, phone = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.environmentIntensity = 0.45;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
  scene.add(camera);

  // --- Işık: tavan tüplerinin altından serin anahtar ışık + yumuşak dolgu ---------------
  const hemi = new THREE.HemisphereLight(0xc9d6ea, 0x15161a, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xf2f6ff, 2.2);
  key.position.set(1.5, 6, 2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
  const sc = key.shadow.camera;
  sc.left = -4; sc.right = 4; sc.top = 3.5; sc.bottom = -3.5; sc.near = 1; sc.far = 12;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 0.5);
  fill.position.set(-4, 2.5, 5);
  scene.add(fill);
  const gateLight = new THREE.PointLight(0x5cffc4, 0, 4.5, 1.6);
  scene.add(gateLight);
  const torch = new THREE.SpotLight(0xfff1dc, 0, 6, 0.42, 0.55, 1.3); // el feneri: şasi bölümünde kameradan
  torch.position.set(0.12, -0.08, 0);
  camera.add(torch, torch.target);
  torch.target.position.set(0, 0, -2);

  const world = new THREE.Group();
  scene.add(world);
  const carRig = new THREE.Group(); // araç + alt takım + inceleme noktaları
  world.add(carRig);

  // --- Boya kalınlığı shader'ı ------------------------------------------------------
  const U = {
    uCarInv: { value: new THREE.Matrix4() },
    uPC: { value: PANEL_IDS.map(() => new THREE.Color(0xffffff)) },
    uHeat: { value: 0 }, uScan: { value: 10 }, uScanOn: { value: 0 },
    uBx: { value: new THREE.Vector4(0.9, -0.05, -1.0, 0.95) }, // ön kapı ön, kapı arası, arka kapı arka, kaput arka
    uBy: { value: new THREE.Vector4(-1.55, 1.75, -1.75, 0.7) }, // bagaj ön, ön tampon x, arka tampon x, kaput/bagaj yarı genişliği
    uBz: { value: new THREE.Vector4(0.62, 0.66, 1.34, 0) }, // ön tampon üst y, arka tampon üst y, tavan y
  };
  function heatInject(mat) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uCarInv;\nvarying vec3 vCarP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarP = (uCarInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', /* glsl */ `#include <common>
          varying vec3 vCarP;
          uniform vec3 uPC[13];
          uniform float uHeat, uScan, uScanOn;
          uniform vec4 uBx, uBy, uBz;
          int panelId(vec3 p) {
            float az = abs(p.z);
            bool right = p.z > 0.0;
            if (p.y > uBz.z && az < 0.7) return 10;
            if (p.x > uBy.y && p.y < uBz.x) return 0;
            if (p.x < uBy.z && p.y < uBz.y) return 12;
            if (p.x > uBx.w && az < uBy.w && p.y > uBz.x) return 1;
            if (p.x < uBy.x && az < uBy.w && p.y > uBz.y) return 11;
            if (p.x > uBx.x) return right ? 3 : 2;
            if (p.x > uBx.y) return right ? 5 : 4;
            if (p.x > uBx.z) return right ? 7 : 6;
            return right ? 9 : 8;
          }`)
        .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
          vec3 hPc = uPC[panelId(vCarP)];
          float hRev = smoothstep(uScan - 0.04, uScan + 0.04, vCarP.x) * uHeat;
          diffuseColor.rgb = mix(diffuseColor.rgb, hPc * 0.92, hRev * 0.86);`)
        .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
          float hBand = exp(-pow((vCarP.x - uScan) * 13.0, 2.0)) * uScanOn;
          totalEmissiveRadiance += vec3(0.32, 1.0, 0.76) * hBand * 1.3 + hPc * hRev * 0.07;`);
    };
    mat.customProgramCacheKey = () => 'eks-heat-v1';
    mat.needsUpdate = true;
  }

  // --- Tarama kapısı (kodla): alüminyum kemer + nane lazer perdesi -------------------------
  const gate = new THREE.Group();
  world.add(gate);
  const alu = new THREE.MeshStandardMaterial({ color: 0xc3c8cf, metalness: 0.85, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.4, roughness: 0.6 });
  const GW = 1.22, GH = 2.02;
  for (const z of [-GW, GW]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, GH, 0.09), alu);
    post.position.set(0, GH / 2, z);
    post.castShadow = true;
    gate.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.24), dark);
    foot.position.set(0, 0.02, z);
    gate.add(foot);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, GW * 2 + 0.14), alu);
  beam.position.y = GH;
  beam.castShadow = true;
  gate.add(beam);
  const laserMat = new THREE.MeshBasicMaterial({ color: 0x7dffd0, transparent: true, toneMapped: false });
  const laserBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, GW * 2 - 0.1), laserMat);
  laserBar.position.set(0, GH - 0.085, 0);
  gate.add(laserBar);
  for (const z of [-GW + 0.075, GW - 0.075]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, GH - 0.2, 0.03), laserMat);
    s.position.set(0, (GH - 0.2) / 2 + 0.05, z);
    gate.add(s);
  }
  const sheetTex = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(125,255,208,0.7)');
    gr.addColorStop(0.7, 'rgba(125,255,208,0.18)');
    gr.addColorStop(1, 'rgba(125,255,208,0.05)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const sheetMat = new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2 - 0.1, GH - 0.1), sheetMat);
  sheet.rotation.y = Math.PI / 2;
  sheet.position.y = (GH - 0.1) / 2;
  gate.add(sheet);
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.04, GW * 2), new THREE.MeshBasicMaterial({ color: 0x7dffd0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  trail.rotation.x = -Math.PI / 2;
  trail.position.y = 0.012;
  gate.add(trail);

  // --- Dinamometre: zeminden yükselen merdane platformu ---------------------------------
  const dyno = new THREE.Group();
  world.add(dyno);
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: 0.75, roughness: 0.42 });
  const plate = new THREE.MeshStandardMaterial({ color: 0x5d636c, metalness: 0.8, roughness: 0.5 });
  const rollMat = new THREE.MeshStandardMaterial({ color: 0xaeb4bb, metalness: 0.95, roughness: 0.22 });
  const rollGeo = new THREE.CylinderGeometry(0.17, 0.17, 2.0, lite ? 20 : 36);
  rollGeo.rotateX(Math.PI / 2);
  const knurl = canvasTex(256, 16, (g, w, h) => {
    g.fillStyle = '#b8bec5';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#6e747b';
    for (let i = 0; i < w; i += 8) g.fillRect(i, 0, 3, h);
  });
  knurl.wrapS = knurl.wrapT = THREE.RepeatWrapping;
  rollMat.map = knurl;
  const rolls = [];
  const loadMat = new THREE.MeshBasicMaterial({ color: 0x1ed69b, toneMapped: false });
  const DY = 0.1; // platform üstü
  const WX = [1.38, -1.37];
  WX.forEach((xc) => {
    const box = new THREE.Group();
    // çerçeve: dört kenar (ortası merdanelere açık)
    const L = 1.25, Wd = 2.36;
    [[0, -Wd / 2 + 0.09, L, 0.18], [0, Wd / 2 - 0.09, L, 0.18]].forEach(([x, z, lx, lz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(lx, DY, lz), plate);
      m.position.set(x, DY / 2, z);
      m.receiveShadow = true;
      box.add(m);
    });
    [[-L / 2 + 0.08], [L / 2 - 0.08]].forEach(([x]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, DY, Wd), plate);
      m.position.set(x, DY / 2, 0);
      m.receiveShadow = true;
      box.add(m);
    });
    const pit = new THREE.Mesh(new THREE.BoxGeometry(L - 0.3, 0.02, Wd - 0.34), new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.9 }));
    pit.position.y = 0.012;
    box.add(pit);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.1, DY * 0.8, Wd - 0.34), steel);
    mid.position.y = DY * 0.4;
    box.add(mid);
    for (const o of [-0.27, 0.27]) {
      const r = new THREE.Mesh(rollGeo, rollMat);
      r.position.set(o, DY - 0.089 - 0.0, 0);
      r.castShadow = false;
      r.receiveShadow = true;
      box.add(r);
      rolls.push(r);
    }
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.012, 0.02), loadMat);
      l.position.set(0, DY + 0.006, s * (Wd / 2 - 0.02));
      box.add(l);
    }
    box.position.x = xc;
    dyno.add(box);
  });

  // --- Teşhis cihazı: ayaklı tablet + OBD kablosu ------------------------------------------
  const obd = new THREE.Group();
  world.add(obd);
  const standM = new THREE.MeshStandardMaterial({ color: 0x24272d, metalness: 0.6, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 28), standM);
  base.position.y = 0.02;
  obd.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 12), alu);
  pole.position.y = 0.58;
  obd.add(pole);
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 256;
  screenCanvas.height = 176;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const tablet = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.025), new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.3, roughness: 0.5 }));
  tablet.add(shell);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.21), screenMat);
  screen.position.z = 0.0135;
  tablet.add(screen);
  tablet.position.y = 1.2;
  tablet.rotation.x = -0.35;
  obd.add(tablet);
  obd.position.set(1.35, 0, -1.95);
  obd.rotation.y = 2.06;
  obd.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.55 });
  let cable = null;
  const cableGlow = new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, opacity: 0, toneMapped: false });
  let glowTube = null;
  function buildCable() {
    const a = new THREE.Vector3(0, 1.1, 0.05).applyMatrix4(obd.matrixWorld);
    const pts = [a, V(a.x - 0.05, 0.55, a.z + 0.15), V(0.75, 0.08, -1.25), V(0.72, 0.12, -1.0), V(0.62, 0.5, -0.62)];
    const curve = new THREE.CatmullRomCurve3(pts);
    cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.008, 6), cableMat);
    glowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 6), cableGlow);
    obd.parent.add(cable, glowTube);
  }
  function drawScreen(n, total, hitIdx, t) {
    const g = screenCanvas.getContext('2d');
    const w = screenCanvas.width, h = screenCanvas.height;
    g.fillStyle = '#0b0d12';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1ed69b';
    g.font = '600 15px monospace';
    g.fillText('OBD TARAMASI', 14, 26);
    g.fillStyle = '#6b7280';
    g.fillText(`${n}/${total}`, w - 50, 26);
    for (let i = 0; i < total; i++) {
      const y = 44 + i * 24;
      g.fillStyle = i < n ? (i === hitIdx || (hitIdx < 0 && false) ? '#3a2a0a' : '#15201b') : '#14161c';
      g.fillRect(14, y, w - 28, 18);
      if (i < n) {
        g.fillStyle = i === hitIdx ? '#ffb627' : '#1ed69b';
        g.fillRect(14, y, 5, 18);
      }
    }
    const sx = ((t * 0.6) % 1) * (w - 28);
    g.fillStyle = 'rgba(125,255,208,0.35)';
    g.fillRect(14 + sx, 40, 2, h - 50);
    screenTex.needsUpdate = true;
  }

  // --- Alt takım (lift üstünde görünür): şasi kolları, alt çerçeve, arka aks, egzoz, depo -------------
  const under = new THREE.Group();
  carRig.add(under);
  const um = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.5, roughness: 0.62 });
  const ug = new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.8, roughness: 0.38 });
  const pan = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.02, 1.46), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.85 }));
  pan.position.set(-0.15, 0.27, 0);
  under.add(pan);
  for (const z of [-0.46, 0.46]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.09, 0.08), um);
    rail.position.set(0.05, 0.21, z);
    under.add(rail);
  }
  const sub = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 1.2), um);
  sub.position.set(1.3, 0.19, 0);
  under.add(sub);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35, 12), ug);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(-1.37, 0.25, 0);
  under.add(axle);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.86), um);
  tank.position.set(-0.85, 0.2, 0.08);
  under.add(tank);
  const exPath = new THREE.CatmullRomCurve3([V(1.0, 0.3, -0.18), V(0.6, 0.17, -0.22), V(-0.6, 0.17, -0.3), V(-1.5, 0.19, -0.36), V(-2.3, 0.22, -0.5)]);
  under.add(new THREE.Mesh(new THREE.TubeGeometry(exPath, 40, 0.028, 8), ug));
  const muff = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 16), ug);
  muff.rotation.z = Math.PI / 2;
  muff.position.set(-1.85, 0.2, -0.42);
  under.add(muff);
  under.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });

  // --- İnceleme noktaları (şasi) ---------------------------------------------------------
  const ringTex = canvasTex(128, 128, (g, w) => {
    g.strokeStyle = '#fff';
    g.lineWidth = 7;
    g.beginPath(); g.arc(w / 2, w / 2, 50, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(w / 2, w / 2, 16, 0, Math.PI * 2); g.fill();
  });
  const HOTS = [V(1.62, 0.2, 0.42), V(0.1, 0.14, 0.86), V(-1.62, 0.22, -0.42), V(-2.0, 0.36, 0.1)];
  const hots = HOTS.map((p) => {
    const m = new THREE.SpriteMaterial({ map: ringTex, color: 0x5cffc4, transparent: true, depthTest: false, toneMapped: false });
    const s = new THREE.Sprite(m);
    s.position.copy(p);
    s.scale.setScalar(0.2);
    s.renderOrder = 5;
    carRig.add(s);
    return s;
  });

  // --- Varlıklar ---------------------------------------------------------------------
  const q = lite ? 'lo' : pickQuality();
  let A = null, G = null;
  let carRoot = null;
  let paintMats = [];
  const ready = Promise.all([
    loadEnv('garage', renderer, { quality: q }).then((env) => { scene.environment = env; }).catch(() => {}),
    loadAsset('garage', { quality: q, renderer }).then((g) => {
      G = g;
      world.add(g.scene);
      const M = g.materials;
      // kırmızı lift ve dolaplar grafit, şerit nane, sarı bölme çizgisi beyaz: ekspertiz bölmesi
      if (M.paint_red) { M.paint_red.color.set('#2d3139'); M.paint_red.metalness = 0.55; M.paint_red.roughness = 0.42; }
      if (M.stripe_red) M.stripe_red.color.set('#1ed69b');
      if (M.line_yellow) M.line_yellow.color.set('#dfe5ea');
      if (M.window) { M.window.color?.set('#0b1220'); if (M.window.emissive) M.window.emissive.set('#0a1424'); }
      if (M.wall) M.wall.color.multiplyScalar(0.62);
      if (M.wall_lower) M.wall_lower.color.set('#1b2026');
      if (M.floor) { M.floor.color.multiplyScalar(0.7); M.floor.roughness = Math.min(M.floor.roughness ?? 0.5, 0.42); }
      g.scene.traverse((o) => { if (o.isMesh && !/floor/.test(o.name)) o.castShadow = !lite; });
    }),
    loadAsset('car_sedan', { quality: q, renderer }).then((c) => {
      A = c;
      carRoot = c.scene;
      carRig.add(carRoot);
      const M = c.materials;
      // inci beyazı: ısı haritası renkleri üzerinde net okunur
      M.paint.color.set('#e4e7ea');
      M.paint.metalness = 0.18;
      M.paint.roughness = 0.3;
      if ('clearcoat' in M.paint) { M.paint.clearcoat = 1; M.paint.clearcoatRoughness = 0.08; }
      paintMats = [M.paint];
      heatInject(M.paint);
      // panel sınırlarını ölç (araç uzayı = dünya; kök kimlikte)
      carRoot.updateMatrixWorld(true);
      const box = (n) => (c.nodes[n] ? new THREE.Box3().setFromObject(c.nodes[n]) : null);
      const fr = box('door_FR'), rr = box('door_RR'), hood = box('hood'), trunk = box('trunk');
      const wf = c.nodes.wheel_FR ? c.nodes.wheel_FR.getWorldPosition(V(0, 0, 0)) : V(1.38, 0.32, 0.8);
      const wr = c.nodes.wheel_RR ? c.nodes.wheel_RR.getWorldPosition(V(0, 0, 0)) : V(-1.37, 0.32, 0.8);
      if (fr && rr) U.uBx.value.set(fr.max.x - 0.01, (fr.min.x + rr.max.x) / 2, rr.min.x + 0.01, hood ? hood.min.x + 0.02 : 0.95);
      const hz = hood ? Math.max(Math.abs(hood.min.z), hood.max.z) - 0.03 : 0.7;
      U.uBy.value.set(trunk ? trunk.max.x - 0.02 : -1.55, wf.x + 0.42, wr.x - 0.42, hz);
      U.uBz.value.set(hood ? hood.min.y - 0.01 : 0.62, trunk ? trunk.min.y - 0.03 : 0.66, fr ? fr.max.y + 0.005 : 1.34, 0);
      WX[0] = wf.x;
      WX[1] = wr.x;
      dyno.children.forEach((b, i) => (b.position.x = WX[i]));
    }),
  ]).then(() => {
    world.updateMatrixWorld(true);
    buildCable();
  });

  // --- Boyut ------------------------------------------------------------------------------
  let W = 1, H = 1;
  function resize() {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  function setPanels(list, classes) {
    PANEL_IDS.forEach((id, i) => {
      const p = list.find((x) => x.id === id);
      const c = p ? classes[p.sinif]?.renk : null;
      U.uPC.value[i].set(c || '#e4e7ea');
      if (c) U.uPC.value[i].convertSRGBToLinear();
    });
  }

  const _v = new THREE.Vector3();
  function project(p) {
    _v.copy(p).applyMatrix4(carRig.matrixWorld).project(camera);
    return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, behind: _v.z > 1 };
  }

  let lastNow = performance.now(), lastScreen = 0;
  let slow = 0, frames = 0;
  function render(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    camera.up.set(0, 1, 0);
    if (s.up) camera.up.copy(s.up).normalize();
    camera.fov = s.fov;
    const sx = s.shiftX || 0, sy = s.shiftY || 0;
    if (sx || sy) camera.setViewOffset(W, H, -sx * W, sy * H, W, H);
    else if (camera.view?.enabled) camera.clearViewOffset();
    camera.lookAt(s.look);
    camera.updateProjectionMatrix();

    // araç yüksekliği: lift ya da dinamo platformu
    const liftH = (s.lift || 0) * 1.62;
    const dy = s.dyno || 0;
    carRig.position.y = Math.max(0, liftH - 0.06) + dy * DY + (s.load || 0) * Math.sin(t * 55) * 0.0012;
    if (G) {
      if (G.nodes.lift_carriage) G.nodes.lift_carriage.position.y = liftH;
      if (G.nodes.arms) G.nodes.arms.visible = dy < 0.02;
      if (G.nodes.roof) G.nodes.roof.visible = !s.topDown;
      if (G.nodes.lights) G.nodes.lights.visible = !s.topDown;
      // lift direkleri yalnız şasi durağında zeminden yükselir (diğer duraklarda aracın önünü kesmesin)
      if (G.nodes.lift) {
        const pv = s.posts || 0;
        G.nodes.lift.visible = pv > 0.01 && !s.topDown;
        G.nodes.lift.scale.y = Math.max(0.001, pv);
      }
      // arka duvar önündeki eşyalar (yağ kabı vb.) arkadan bakarken kadrajı kapatmasın
      if (G.nodes.props) G.nodes.props.visible = camera.position.z > -1.2;
    }
    carRig.updateMatrixWorld(true);
    if (carRoot) U.uCarInv.value.copy(carRoot.matrixWorld).invert();

    // boya
    U.uHeat.value = s.heat || 0;
    U.uScan.value = s.scan ?? 10;
    U.uScanOn.value = s.scanOn || 0;
    gate.visible = (s.gate || 0) > 0.01;
    gate.position.x = clamp(s.scan ?? 10, -3.2, 3.2);
    laserMat.opacity = s.gate || 0;
    sheetMat.opacity = 0.26 * (s.scanOn || 0);
    trail.material.opacity = s.scanOn || 0;
    gateLight.position.set(gate.position.x, 1.2, 0.2);
    gateLight.intensity = (s.scanOn || 0) * 5;

    // şasi
    torch.intensity = (s.torch || 0) * 45;
    hots.forEach((h, i) => {
      const a = s.hots?.[i] ?? 0;
      h.visible = a > 0.01;
      if (!h.visible) return;
      h.material.opacity = a;
      h.material.color.setHex(s.hotBad === i ? 0xffb627 : 0x5cffc4);
      h.scale.setScalar((0.12 + a * 0.1) * (1 + Math.sin(t * 5 + i) * 0.1));
    });

    // arıza: kapı ve kaput açılır, cihaz bağlanır
    const o = s.obd || 0;
    if (A) {
      if (A.nodes.door_FL) A.nodes.door_FL.rotation.y = -1.05 * o;
      if (A.nodes.hood) A.nodes.hood.rotation.z = 0.85 * (s.hood || 0);
    }
    obd.visible = o > 0.01;
    if (cable) { cable.visible = obd.visible; glowTube.visible = obd.visible; }
    cableGlow.opacity = (s.obdLink || 0) * (0.35 + 0.35 * Math.sin(t * 6));
    if (obd.visible && now - lastScreen > 120) {
      lastScreen = now;
      drawScreen(s.obdN || 0, s.obdTotal || 5, s.obdHit ?? -1, t);
    }

    // dinamo
    dyno.visible = dy > 0.01;
    dyno.position.y = (dy - 1) * (DY + 0.02);
    const v = s.speed || 0; // m/s
    if (A && v) A.roll(v * dt);
    rolls.forEach((r) => (r.rotation.z += (v * dt) / 0.17));
    loadMat.color.setHSL(0.44 - (s.load || 0) * 0.44, 0.85, 0.5);

    scene.environmentIntensity = s.env ?? 0.45;
    key.intensity = 2.2 * (s.keyK ?? 1);
    renderer.render(scene, camera);

    // yavaş cihaz: çözünürlük ve gölge düşer
    frames++;
    if (dt > 0.034) slow++;
    if (frames === 90) {
      if (slow > 40) {
        if (dpr > 1) { dpr = 1; renderer.setPixelRatio(dpr); resize(); }
        else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; key.castShadow = false; }
      }
      frames = 0;
      slow = 0;
    }
  }

  return {
    renderer, camera, ready, render, resize, setPanels, project, U,
    compile: () => renderer.compile(scene, camera),
  };
}
