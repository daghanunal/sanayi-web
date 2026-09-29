// Kapsül sahnesi: kapsüllerden yapılmış ışıklı "E" tabelası → dağılan girdap → blister paketi.
// setState({ film, intro }) ile sürülür; film 0..1 sayfadaki tanıtım bölümünün ilerlemesidir.
// Gerçekçilik: iki parçalı sert jelatin kapsül (gövde + bir tık geniş kapak, birleşim sırtı), jelatin parlaklığı
// (clearcoat), stüdyo HDRI ışığı, ACES ton eşleme, blisterde ışık geçiren PVC kabarcıklar (yüksek kalitede
// transmission), buruşuk alüminyum folyo (normal haritası) ve arkadaki duvara düşen yumuşak gölge.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { loadEnv } from '../../shared/lib3d.js';

const RED = new THREE.Color('#c8141d');
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Tuval üzerinde "E" çizip ızgaradan nokta örnekler (tabela ışıkları).
function sampleE(cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cols, rows);
  g.fillStyle = '#fff';
  const w = cols, h = rows, s = Math.round(cols * 0.26);
  g.fillRect(0, 0, s, h);
  g.fillRect(0, 0, w, s);
  g.fillRect(0, Math.round(h / 2 - s / 2), Math.round(w * 0.82), s);
  g.fillRect(0, h - s, w, s);
  const data = g.getImageData(0, 0, cols, rows).data;
  const pts = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) if (data[(y * cols + x) * 4] > 128) pts.push([x, y]);
  return pts;
}

// Sert jelatin kapsül: alt gövde (r) + üstte bir tık geniş kapak (r·1.045), birleşimde küçük bir basamak.
// Yarıların ayrımı yerel y'ye göre (SEAM üstü renkli kapak).
const SEAM = -0.022;
function capsuleGeometry(r, seg) {
  const pts = [];
  const hb = 0.1;
  const R = r * 1.045;
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.max(0.0001, r * Math.sin(a)), -hb - r * Math.cos(a)));
  }
  pts.push(new THREE.Vector2(r, SEAM - 0.006));
  pts.push(new THREE.Vector2(r * 1.012, SEAM - 0.002));
  pts.push(new THREE.Vector2(R, SEAM + 0.003));
  pts.push(new THREE.Vector2(R, hb));
  for (let i = 1; i <= 8; i++) {
    const b = (i / 8) * Math.PI * 0.5;
    pts.push(new THREE.Vector2(Math.max(0.0001, R * Math.cos(b)), hb + R * Math.sin(b)));
  }
  return new THREE.LatheGeometry(pts, seg);
}

// Kapsülün kapağı renkli, gövdesi beyaz. Işıklı hâlde renkli yarı parlar.
function capsuleMaterial(hi) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.3, metalness: 0,
    clearcoat: hi ? 1 : 0.6, clearcoatRoughness: 0.12, specularIntensity: 0.6,
  });
  mat.userData.uniforms = { uGlow: { value: 1 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = mat.userData.uniforms.uGlow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vLocalY;\nuniform float uGlow;`)
      .replace(
        '#include <color_fragment>',
        `float side = step(${SEAM.toFixed(3)}, vLocalY);
        #ifdef USE_COLOR
          diffuseColor.rgb = mix(vec3(0.93, 0.93, 0.9), vColor.rgb, side);
        #endif`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifdef USE_COLOR
          totalEmissiveRadiance += vColor.rgb * uGlow * side * 1.1 + vec3(1.0, 0.93, 0.9) * uGlow * (1.0 - side) * 0.3;
        #endif`
      );
  };
  return mat;
}

// Blister folyosu: arka yüz etiketi (eczane adı, "Reçeteniz hazır", tarih).
function foilTexture(name) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#c4c9cf');
  grad.addColorStop(0.5, '#eceef0');
  grad.addColorStop(1, '#b4bac1');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  g.globalAlpha = 0.12;
  g.fillStyle = '#c8141d';
  g.font = '700 34px "Atkinson Hyperlegible Next", sans-serif';
  for (let y = 30; y < 512; y += 64) for (let x = (y / 64) % 2 ? 20 : 52; x < 1024; x += 64) g.fillText('E', x, y);
  g.globalAlpha = 1;
  g.fillStyle = '#fff';
  g.beginPath();
  g.roundRect(64, 150, 150, 150, 26);
  g.fill();
  g.fillStyle = '#c8141d';
  g.font = '800 120px "Atkinson Hyperlegible Next", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('E', 139, 232);
  g.textAlign = 'left';
  g.fillStyle = '#15202b';
  let size = 64;
  g.font = `800 ${size}px "Atkinson Hyperlegible Next", sans-serif`;
  while (g.measureText(name).width > 720 && size > 30) g.font = `800 ${(size -= 2)}px "Atkinson Hyperlegible Next", sans-serif`;
  g.fillText(name, 250, 200);
  g.font = '600 44px "Atkinson Hyperlegible Next", sans-serif';
  g.fillStyle = '#1f7a4d';
  g.fillText('Reçeteniz hazır', 250, 272);
  g.font = '500 30px "Atkinson Hyperlegible Mono", monospace';
  g.fillStyle = '#4a5560';
  g.fillText(new Date().toLocaleDateString('tr-TR'), 250, 330);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Blister ön yüzü: ısıl mühür deseni (ince çapraz tırtıl), cep çevreleri düz, kenarda perfore çizgi.
function sealTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#d5d9dd');
  grad.addColorStop(0.45, '#f1f2f3');
  grad.addColorStop(1, '#c6cbd0');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  g.save();
  g.strokeStyle = 'rgba(70,80,90,0.16)';
  g.lineWidth = 1.2;
  for (let x = -512; x < 1024; x += 7) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 512, 512); g.stroke();
    g.beginPath(); g.moveTo(x + 512, 0); g.lineTo(x, 512); g.stroke();
  }
  g.restore();
  // cepler: pürüzsüz yuvalar
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < 5; k++) {
      const cx = 512 + (k - 2) * 183, cy = r ? 369 : 143;
      const rg = g.createRadialGradient(cx - 20, cy - 18, 8, cx, cy, 100);
      rg.addColorStop(0, '#fbfbfb');
      rg.addColorStop(1, '#cfd4d8');
      g.fillStyle = rg;
      g.beginPath();
      g.roundRect(cx - 90, cy - 50, 180, 100, 50);
      g.fill();
    }
  // ortadaki yırtma çizgisi
  g.strokeStyle = 'rgba(60,70,80,0.35)';
  g.setLineDash([6, 6]);
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 256); g.lineTo(1024, 256); g.stroke();
  for (const x of [329, 512, 695]) { g.beginPath(); g.moveTo(x - 91, 0); g.lineTo(x - 91, 512); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Buruşuk folyo için normal haritası (gürültüden türetilmiş).
function crinkleNormal(size = 256) {
  const h = new Float32Array(size * size);
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // birkaç oktav yumuşatılmış gürültü
  for (const [cell, amp] of [[32, 1], [12, 0.5], [5, 0.22]]) {
    const n = Math.ceil(size / cell) + 2;
    const grid = Array.from({ length: n * n }, rnd);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const gx = x / cell, gy = y / cell;
        const ix = Math.floor(gx), iy = Math.floor(gy);
        const fx = gx - ix, fy = gy - iy;
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = grid[iy * n + ix], b = grid[iy * n + ix + 1], c = grid[(iy + 1) * n + ix], d = grid[(iy + 1) * n + ix + 1];
        h[y * size + x] += amp * lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
      }
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x], dn = h[((y + 1) % size) * size + x];
      const nx = (l - r) * 2.2, ny = (u - dn) * 2.2;
      const inv = 1 / Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = (nx * inv * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
      data[i + 2] = (inv * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1.5);
  tex.needsUpdate = true;
  return tex;
}

// Tabelanın ışık kutusu yüzü: difüzör parlaklığı ortada biraz fazla.
function diffuserTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 150, 20, 128, 160, 220);
  r.addColorStop(0, '#ffffff');
  r.addColorStop(1, '#e6e9ec');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 320);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,90,90,0.9)');
  r.addColorStop(0.35, 'rgba(200,20,29,0.35)');
  r.addColorStop(1, 'rgba(200,20,29,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createPills(canvas, { name, lowEnd, quality = 'hi', still = false }) {
  const hi = quality === 'hi' && !lowEnd;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: hi, alpha: true, powerPreference: 'high-performance' });
  const dprCap = hi ? 1.5 : 1.25;
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomTex;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();
  // Stüdyo HDRI gelince yumuşak yansımalar (kapsül parlaması, folyo) gerçek ışıkla değişir
  loadEnv('studio', renderer, { quality: hi ? 'hi' : 'lo' })
    .then((env) => { scene.environment = env; scene.environmentIntensity = 0.75; if (!running) renderOnce(); })
    .catch(() => {});

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 11);

  const key = new THREE.DirectionalLight(0xfff6ee, 1.6);
  key.position.set(1.6, 3.2, 8);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(hi ? 1024 : 512);
  key.shadow.camera.left = -4.5;
  key.shadow.camera.right = 4.5;
  key.shadow.camera.top = 3.5;
  key.shadow.camera.bottom = -3.5;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 16;
  key.shadow.radius = hi ? 10 : 5;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  const rimL = new THREE.DirectionalLight(0xdfe9ff, 0.7);
  rimL.position.set(-5, 2, -3);
  scene.add(key, rimL, new THREE.AmbientLight(0xffffff, 0.12));

  // Arka duvara düşen yumuşak gölge (yalnızca aydınlık bölümde görünür)
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0, depthWrite: false });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), shadowMat);
  wall.position.z = -0.7;
  wall.receiveShadow = true;
  scene.add(wall);

  // --- Tabela (ışıklı beyaz kutu) ----------------------------------------
  const sign = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, emissive: 0xffffff, emissiveMap: diffuserTexture(), emissiveIntensity: 0.55 });
  const plate = new THREE.Mesh(new RoundedBoxGeometry(3.3, 4.1, 0.34, 4, 0.12), plateMat);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xaab2ba, metalness: 1, roughness: 0.28 });
  const rim = new THREE.Mesh(new RoundedBoxGeometry(3.46, 4.26, 0.26, 4, 0.16), rimMat);
  rim.position.z = -0.06;
  // Duvara bağlayan kol (tabela sokağa dik asılır)
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 12), rimMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-2.5, 1.7, -0.06);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(9, 9, 1);
  glow.position.z = -0.4;
  sign.add(glow, rim, plate, arm);
  scene.add(sign);

  // --- Kapsüller ----------------------------------------------------------
  const ePts = sampleE(9, 12);
  const extra = hi ? 46 : 26;
  const N = ePts.length + extra;
  const capGeo = capsuleGeometry(0.105, hi ? 22 : 12);
  const capMat = capsuleMaterial(hi);
  const caps = new THREE.InstancedMesh(capGeo, capMat, N);
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  caps.castShadow = true;
  const palette = [RED, new THREE.Color('#1f7a4d'), new THREE.Color('#2f5f9e'), new THREE.Color('#e3a21a'), RED, new THREE.Color('#f2efe8')];
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();

  const cells = ePts.map(([x, y]) => new THREE.Vector3((x - 4) * 0.33, (5.5 - y) * 0.33, 0.26));
  const inst = [];
  for (let i = 0; i < N; i++) {
    const inE = i < cells.length;
    const a = rnd() * Math.PI * 2;
    const r = 3.2 + rnd() * 3.5;
    inst.push({
      inE,
      e: inE ? cells[i] : new THREE.Vector3(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.62, -2.5 - rnd() * 4),
      scatter: new THREE.Vector3((rnd() - 0.5) * 16, (rnd() - 0.5) * 11, -2 - rnd() * 6),
      orbitR: 2 + rnd() * 3.6,
      orbitA: rnd() * Math.PI * 2,
      orbitY: (rnd() - 0.5) * 4.5,
      orbitZ: (rnd() - 0.5) * 3,
      spin: new THREE.Vector3(rnd() * 2, rnd() * 2, rnd() * 2),
      delay: rnd(),
      tilt: (rnd() - 0.5) * 0.35,
      color: inE ? RED : palette[Math.floor(rnd() * palette.length)],
    });
    caps.setColorAt(i, inst[i].color);
  }
  caps.instanceColor.needsUpdate = true;
  scene.add(caps);

  // --- Blister paketi ------------------------------------------------------
  const blister = new THREE.Group();
  const crinkle = crinkleNormal(hi ? 256 : 128);
  const cardMat = new THREE.MeshStandardMaterial({ map: sealTexture(), color: 0xa9b0b7, metalness: 0.9, roughness: 0.3, normalMap: crinkle, normalScale: new THREE.Vector2(0.025, 0.025) });
  const card = new THREE.Mesh(new RoundedBoxGeometry(3.8, 1.9, 0.035, 2, 0.012), cardMat);
  card.castShadow = true;
  const backMat = new THREE.MeshStandardMaterial({ map: foilTexture(name), metalness: 0.55, roughness: 0.38, normalMap: crinkle, normalScale: new THREE.Vector2(0.02, 0.02) });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.9), backMat);
  back.rotation.y = Math.PI;
  back.position.z = -0.02;
  // PVC kabarcık: yarım kapsül kubbe
  const bubbleGeo = new THREE.CapsuleGeometry(0.15, 0.24, 6, hi ? 20 : 12);
  const bubbleMat = hi
    ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.05, ior: 1.52, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false });
  const slots = [];
  const bubbles = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 5; c++) {
      const p = new THREE.Vector3((c - 2) * 0.68, r ? -0.42 : 0.42, 0.1);
      slots.push(p);
      const b = new THREE.Mesh(bubbleGeo, bubbleMat);
      b.rotation.z = Math.PI / 2;
      b.position.copy(p);
      b.scale.set(1, 1, 0.62);
      bubbles.push(b);
      blister.add(b);
    }
  blister.add(card, back);
  scene.add(blister);

  // Blistere giren kapsüller: tabeladaki ilk 10 kapsül
  const slotOf = new Map();
  for (let i = 0; i < 10; i++) slotOf.set(Math.floor((i * cells.length) / 10), i);

  // --- Yerleşim --------------------------------------------------------------
  let W = 1, H = 1, desk = true;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    desk = W >= 900;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Masaüstünde sahne sağda (yazı solda), telefonda üstte (kart altta)
    if (desk) camera.setViewOffset(W, H, -W * 0.17, 0, W, H);
    else camera.setViewOffset(W, H, 0, H * 0.25, W, H); // telefonda künye altta, tabela üstte kalır
    camera.updateProjectionMatrix();
  }
  resize();

  const state = { film: 0, intro: 1 };
  const dummy = new THREE.Object3D();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let time = 0;

  function update(dt) {
    time += dt;
    const f = state.film;
    const intro = smooth(0, 1, state.intro);
    const breakT = smooth(0.14, 0.3, f); // tabela dağılır
    const toBlister = smooth(0.52, 0.72, f); // kapsüller blistere
    const flip = smooth(0.76, 0.88, f); // blister döner
    const exit = smooth(0.95, 1, f);
    const fit = desk ? 1 : 0.4;
    const bFit = desk ? 0.76 : Math.min(0.66, (W / H) * 1.35);
    const oFit = desk ? 1 : 0.62;

    // Duvar gölgesi yalnızca aydınlık zeminde
    shadowMat.opacity = 0.075 * smooth(0.2, 0.34, f) * (1 - exit);

    // Tabela: girişte yanar, dağılırken söner ve geri çekilir
    sign.visible = breakT < 0.999;
    const signOn = intro * (1 - breakT);
    plateMat.emissiveIntensity = 0.12 + 0.55 * signOn;
    glow.material.opacity = signOn;
    capMat.userData.uniforms.uGlow.value = 0.18 + 0.82 * signOn;
    sign.position.set(0, lerp(0, 1.5, breakT), lerp(0, -6, breakT));
    sign.rotation.set(Math.sin(time * 0.5) * 0.03, lerp(-0.18, 0.5, breakT) + Math.sin(time * 0.35) * 0.06, 0);
    sign.scale.setScalar(fit);

    // Blister
    blister.visible = toBlister > 0.001;
    const bs = bFit * lerp(0.6, 1, toBlister) * (1 - exit * 0.5);
    blister.scale.setScalar(bs);
    blister.position.set(0, lerp(-3, 0, toBlister) + exit * 3.5, lerp(-2, 0.4, toBlister));
    blister.rotation.set(lerp(-0.55, -0.12, toBlister) + flip * 0.1, lerp(0.35, 0, toBlister) + flip * Math.PI + Math.sin(time * 0.4) * 0.04 * toBlister, 0);
    bubbles.forEach((b, i) => {
      const s = smooth(0.52 + i * 0.012, 0.6 + i * 0.012, f);
      b.scale.set(s, s, 0.62 * s);
      b.visible = s > 0.01;
    });
    blister.updateMatrixWorld();

    for (let i = 0; i < N; i++) {
      const it = inst[i];
      // 1) giriş: dağınıktan tabelaya
      const ki = smooth(it.delay * 0.45, it.delay * 0.45 + 0.55, intro);
      tmp.lerpVectors(it.scatter, it.e, ki);
      if (it.inE) {
        tmp.multiplyScalar(fit);
        tmp.applyEuler(sign.rotation).add(sign.position);
      } else tmp.multiplyScalar(oFit);
      // 2) dağılma: girdap
      const kb = smooth(it.delay * 0.3, it.delay * 0.3 + 0.7, breakT);
      const a = it.orbitA + time * (0.12 + it.delay * 0.1) + f * 5;
      tmp2.set(Math.cos(a) * it.orbitR, it.orbitY + Math.sin(time * 0.6 + i) * 0.15, Math.sin(a) * it.orbitR * 0.6 + it.orbitZ);
      tmp2.multiplyScalar(oFit);
      tmp.lerp(tmp2, kb);
      // 3) blistere giren 10 kapsül, geri kalanı uzaklaşır
      let scale = 1;
      const slot = slotOf.get(i);
      if (slot !== undefined) {
        const ks = smooth(0.52 + slot * 0.014, 0.64 + slot * 0.014, f);
        const target = slots[slot].clone().applyMatrix4(blister.matrixWorld);
        tmp.lerp(target, ks);
        if (ks > 0.99) tmp.copy(target);
        scale = lerp(1, bs * 0.92, ks);
        dummy.position.copy(tmp);
        if (ks > 0.5) {
          dummy.quaternion.copy(blister.quaternion);
          dummy.rotateZ(Math.PI / 2);
        } else {
          const sk = kb * (1 - ks);
          dummy.rotation.set(time * it.spin.x * sk, time * it.spin.y * sk, Math.PI / 2 + it.tilt * (1 - kb) * 0.2);
        }
      } else {
        const away = toBlister;
        tmp.z -= away * 8;
        tmp.y += away * (it.orbitY > 0 ? 3 : -3);
        scale = 1 - smooth(0.6, 0.78, f);
        dummy.position.copy(tmp);
        const spinK = kb;
        dummy.rotation.set(time * it.spin.x * spinK, time * it.spin.y * spinK, Math.PI / 2 + it.tilt * (1 - spinK) + time * it.spin.z * spinK);
      }
      if (!it.inE && ki < 1) scale *= 0.6 + 0.4 * ki;
      if (still && !it.inE) scale = 0; // hareketsiz modda yalnızca tabela
      if (it.inE) scale *= fit * lerp(0.82, 1, kb);
      if (it.inE && kb < 0.01 && (slot === undefined || f < 0.5)) dummy.rotation.set(sign.rotation.x, sign.rotation.y, Math.PI / 4 + it.tilt * 0.15);
      scale *= 1 - exit;
      dummy.scale.setScalar(Math.max(0.0001, scale));
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
  }

  let running = false;
  let last = performance.now();
  let slowFrames = 0;
  function renderOnce() {
    update(0);
    renderer.render(scene, camera);
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Kareler yavaşsa önce gölgeyi, sonra çözünürlüğü düşür
    if (dt > 0.034) {
      if (++slowFrames > 40) {
        if (renderer.shadowMap.enabled && renderer.getPixelRatio() <= 1.25) {
          renderer.shadowMap.enabled = false;
          shadowMat.visible = false;
        } else if (renderer.getPixelRatio() > 1) {
          renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25));
          resize();
        }
        slowFrames = 0;
      }
    } else slowFrames = Math.max(0, slowFrames - 1);
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  return {
    setState(s) {
      Object.assign(state, s);
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    },
    stop() {
      running = false;
    },
    renderOnce,
    resize,
    compile() {
      renderer.compile(scene, camera);
    },
  };
}
