// Kar İzi: tek kalıcı WebGL sahnesi. Karlı, sonsuz beyaz bir stüdyo; ortada kışlık bir lastik.
// main.js her karede bir "poz" verir (kamera, lastik konumu, aşınma, iz uzunluğu, otel yığını).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
export const SNOW_BG = '#e7ebf0';
const INK = '#14171c';
const ORANGE = '#ff4d00';

// Lastik ölçüleri (dış yarıçap ~1)
const R_RIM = 0.64;
const R_TREAD = 0.935;
const HALF_W = 0.315;
const BLOCK_H = 0.052;

function softSprite(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kar zemini: hafif pütürlü beyaz
function snowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f1f4f7';
  g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 14) | 0;
    img.data[i] -= n;
    img.data[i + 1] -= n;
    img.data[i + 2] -= n * 0.6;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(16, 16);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kardaki lastik izi: V desenli, yönlü kış deseni. Yatay döşenir (x = iz boyu).
function printTexture() {
  const W = 256, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  // bastırılmış kar tabanı
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, 'rgba(160,176,196,0)');
  base.addColorStop(0.07, 'rgba(140,156,178,.7)');
  base.addColorStop(0.5, 'rgba(150,164,186,.78)');
  base.addColorStop(0.93, 'rgba(140,156,178,.7)');
  base.addColorStop(1, 'rgba(160,176,196,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // bloklar: 2 tekrar/doku
  const pitch = W / 3;
  for (let k = -1; k < 4; k++) {
    const x0 = k * pitch;
    for (const side of [-1, 1]) {
      for (const [a, w, skew] of [[0.13, 0.2, 0.55], [0.36, 0.2, 0.3]]) {
        const cy = H / 2 + side * a * H;
        const hh = w * H * 0.5;
        const len = pitch * 0.62;
        const sk = skew * hh * 2 * side;
        g.beginPath();
        g.moveTo(x0 - sk, cy - hh);
        g.lineTo(x0 + len - sk, cy - hh);
        g.lineTo(x0 + len + sk, cy + hh);
        g.lineTo(x0 + sk, cy + hh);
        g.closePath();
        g.fillStyle = 'rgba(70,84,106,.9)';
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)';
        g.lineWidth = 2;
        g.stroke();
        // lameller
        g.strokeStyle = 'rgba(210,220,232,.7)';
        g.lineWidth = 1.2;
        for (let s = 1; s < 4; s++) {
          const t = s / 4;
          g.beginPath();
          g.moveTo(x0 + len * t - sk, cy - hh + 2);
          g.lineTo(x0 + len * t + sk, cy + hh - 2);
          g.stroke();
        }
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Yanak yazısı: işletme adı üstte, ölçü altta, kar tanesi sembolü
function sidewallTexture(ad, olcu, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2;
  const toPx = (r) => (r / 0.93) * cx; // ring dış yarıçapı 0.93
  const arcText = (text, r, center, fontPx, dir) => {
    g.font = `${fontPx}px "Dela Gothic One", sans-serif`;
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width + fontPx * 0.08);
    const total = widths.reduce((a, b) => a + b, 0);
    const R = toPx(r);
    let ang = center - (dir * total) / R / 2;
    for (let i = 0; i < chars.length; i++) {
      const a = ang + (dir * widths[i]) / R / 2;
      g.save();
      g.translate(cx + Math.cos(a) * R, cx + Math.sin(a) * R);
      g.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      g.fillText(chars[i], -widths[i] / 2 + fontPx * 0.04, fontPx * 0.36);
      g.restore();
      ang += (dir * widths[i]) / R;
    }
  };
  g.fillStyle = '#4a505b';
  const name = ad.toLocaleUpperCase('tr');
  const fs = Math.min(size * 0.058, (toPx(0.815) * Math.PI * 0.9) / Math.max(8, [...name].length) / 0.9);
  arcText(name, 0.815, -Math.PI / 2, fs, 1);
  arcText(olcu, 0.815, Math.PI / 2, size * 0.042, -1);
  // turuncu ince şerit
  g.strokeStyle = ORANGE;
  g.lineWidth = size * 0.006;
  g.beginPath();
  g.arc(cx, cx, toPx(0.735), 0, TAU);
  g.stroke();
  // yan işaretler: dağ + kar tanesi
  g.fillStyle = '#4a505b';
  for (const a of [0, Math.PI]) {
    g.save();
    g.translate(cx + Math.cos(a) * toPx(0.815), cx + Math.sin(a) * toPx(0.815));
    g.rotate(a + Math.PI / 2);
    const s = size * 0.03;
    g.beginPath();
    g.moveTo(-s * 1.2, s * 0.8);
    g.lineTo(-s * 0.2, -s);
    g.lineTo(s * 0.3, -s * 0.1);
    g.lineTo(s * 0.6, -s * 0.5);
    g.lineTo(s * 1.3, s * 0.8);
    g.closePath();
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function sipeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#000';
  g.lineWidth = 2.5;
  for (let x = 10; x < 64; x += 16) {
    g.beginPath();
    for (let y = 0; y <= 64; y += 8) g.lineTo(x + ((y / 8) % 2 ? 3 : -3), y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

// --- Lastik + jant --------------------------------------------------------------------

function createTire({ ad, olcu, lite }) {
  const root = new THREE.Group(); // konum + yön (yaw)
  const spin = new THREE.Group(); // dönme (eksen Z)
  root.add(spin);

  const rubber = new THREE.MeshStandardMaterial({ color: '#1b1e23', roughness: 0.82, metalness: 0 });

  // Karkas: kesit profili döndürülür
  const prof = [];
  const P = [
    [R_RIM - 0.01, -0.27], [R_RIM + 0.03, -0.3], [0.72, -0.318], [0.8, -0.325], [0.86, -0.322],
    [0.9, -0.31], [0.925, -0.29], [R_TREAD, -0.26],
  ];
  for (const [r, y] of P) prof.push(new THREE.Vector2(r, y));
  for (let i = P.length - 1; i >= 0; i--) prof.push(new THREE.Vector2(P[i][0], -P[i][1]));
  const carcassGeo = new THREE.LatheGeometry(prof, lite ? 64 : 96);
  carcassGeo.rotateX(Math.PI / 2);
  const carcass = new THREE.Mesh(carcassGeo, rubber);
  spin.add(carcass);

  // Yanak yazısı (iki taraf)
  const swTex = sidewallTexture(ad, olcu, lite ? 1024 : 1536);
  const swMat = new THREE.MeshStandardMaterial({
    map: swTex, transparent: true, roughness: 0.7, metalness: 0, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  });
  const swGeo = new THREE.RingGeometry(0.69, 0.93, lite ? 64 : 96, 1);
  // RingGeometry UV'si kare düzlem: doku doğrudan oturur
  const sw1 = new THREE.Mesh(swGeo, swMat);
  sw1.position.z = 0.3265;
  const sw2 = sw1.clone();
  sw2.rotation.y = Math.PI;
  sw2.position.z = -0.3265;
  spin.add(sw1, sw2);

  // Diş blokları: yönlü V desen, lamelli
  const N = lite ? 46 : 54;
  const layout = [
    // axial merkez, eksenel genişlik, V açısı
    [0.068, 0.118, 0.5],
    [0.206, 0.136, 0.2],
  ];
  const blockGeo = new RoundedBoxGeometry(1, 1, 1, 1, 0.12);
  const sipe = sipeTexture();
  const blockMat = new THREE.MeshStandardMaterial({ color: '#1d2025', roughness: 0.78, metalness: 0, bumpMap: sipe, bumpScale: 1.2 });
  const count = N * layout.length * 2;
  const blocks = new THREE.InstancedMesh(blockGeo, blockMat, count);
  const pitchArc = (TAU * R_TREAD) / N;
  const specs = [];
  for (let k = 0; k < N; k++) {
    const th = (k / N) * TAU;
    for (const side of [-1, 1]) {
      for (const [a, w, beta] of layout) {
        specs.push({ th: th + (a < 0.1 ? 0 : pitchArc * 0.12 / R_TREAD), a: a * side, w, beta: beta * side, len: pitchArc * 0.8 });
      }
    }
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const basis = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const tAxis = new THREE.Vector3();
  const nAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const yUp = new THREE.Vector3(0, 1, 0);
  let lastWear = -1;
  function setWear(w) {
    // w: 0 yeni, 1 tamamen aşınmış
    if (Math.abs(w - lastWear) < 0.002) return;
    lastWear = w;
    const h = BLOCK_H * (1 - 0.88 * w);
    specs.forEach((s, i) => {
      nAxis.set(Math.cos(s.th), Math.sin(s.th), 0);
      tAxis.set(-Math.sin(s.th), Math.cos(s.th), 0);
      basis.makeBasis(tAxis, nAxis, zAxis);
      q.setFromRotationMatrix(basis);
      qb.setFromAxisAngle(yUp, s.beta);
      q.multiply(qb);
      pos.copy(nAxis).multiplyScalar(R_TREAD - 0.01 + h / 2);
      pos.z = s.a;
      scl.set(s.len, h + 0.01, s.w);
      m4.compose(pos, q, scl);
      blocks.setMatrixAt(i, m4);
    });
    blocks.instanceMatrix.needsUpdate = true;
  }
  setWear(0);
  spin.add(blocks);

  // Aşınma göstergesi (TWI): turuncu ince çizgi diş tabanında, sadece aşınınca görünür
  const twi = new THREE.Mesh(
    new THREE.CylinderGeometry(R_TREAD + 0.004, R_TREAD + 0.004, 0.018, lite ? 64 : 96, 1, true),
    new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0 })
  );
  twi.rotation.x = Math.PI / 2;
  spin.add(twi);

  // Jant: 6 kollu döküm
  const rimGroup = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, 0, R_RIM - 0.005, 0, TAU, false);
  const SPOKES = 6;
  for (let i = 0; i < SPOKES; i++) {
    const a0 = (i / SPOKES) * TAU + 0.2;
    const a1 = ((i + 1) / SPOKES) * TAU - 0.2;
    const hole = new THREE.Path();
    const r0 = 0.2, r1 = 0.55;
    hole.moveTo(Math.cos(a0 + 0.12) * r0, Math.sin(a0 + 0.12) * r0);
    hole.absarc(0, 0, r1, a0, a1, false);
    hole.lineTo(Math.cos(a1 - 0.12) * r0, Math.sin(a1 - 0.12) * r0);
    hole.absarc(0, 0, r0, a1 - 0.12, a0 + 0.12, true);
    shape.holes.push(hole);
  }
  const rimMat = new THREE.MeshStandardMaterial({ color: '#d9dde3', metalness: 1, roughness: 0.28 });
  const face = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: lite ? 20 : 32 }),
    rimMat
  );
  face.position.z = 0.17;
  rimGroup.add(face);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(R_RIM - 0.01, R_RIM - 0.01, 0.52, lite ? 48 : 72, 1, true),
    new THREE.MeshStandardMaterial({ color: '#8e949d', metalness: 1, roughness: 0.4, side: THREE.DoubleSide })
  );
  barrel.rotation.x = Math.PI / 2;
  rimGroup.add(barrel);
  // arkadaki fren diski ve göbek
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.47, 0.04, 48),
    new THREE.MeshStandardMaterial({ color: '#4c5057', metalness: 0.9, roughness: 0.45 })
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.z = 0.02;
  rimGroup.add(disc);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 36), rimMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.19;
  rimGroup.add(hub);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.03, 32),
    new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.35, metalness: 0.1 })
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.26;
  rimGroup.add(cap);
  const nutGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 6);
  const nutMat = new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const n = new THREE.Mesh(nutGeo, nutMat);
    n.rotation.x = Math.PI / 2;
    n.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0.25);
    rimGroup.add(n);
  }
  // sibop
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), new THREE.MeshStandardMaterial({ color: ORANGE }));
  valve.position.set(0, R_RIM - 0.05, 0.2);
  valve.rotation.x = -0.6;
  rimGroup.add(valve);
  spin.add(rimGroup);

  return { root, spin, setWear, twi, rubber };
}

// Otel için basit lastik (diş yok, tek parça)
function simpleTireGeo(lite) {
  const pts = [];
  const P = [[0.6, -0.27], [0.64, -0.3], [0.8, -0.32], [0.9, -0.3], [0.97, -0.25], [0.99, -0.12]];
  for (const [r, y] of P) pts.push(new THREE.Vector2(r, y));
  for (let i = P.length - 1; i >= 0; i--) pts.push(new THREE.Vector2(P[i][0], -P[i][1]));
  pts.push(new THREE.Vector2(0.6, -0.27));
  return new THREE.LatheGeometry(pts, lite ? 36 : 56);
}

// --- Sahne ------------------------------------------------------------------------------

export function createStage(canvas, { ad, olcu, lite, weak, stations }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(SNOW_BG, 1);
  const maxDpr = weak ? 1 : 1.5;
  let dpr = Math.min(devicePixelRatio, maxDpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SNOW_BG, 7, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);

  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(-3, 6, 4);
  const back = new THREE.DirectionalLight('#cfe0ff', 1.6);
  back.position.set(3, 2, -5);
  const hemi = new THREE.HemisphereLight('#f4f7fb', '#9aa6b5', 0.9);
  const warm = new THREE.PointLight(ORANGE, 0, 5, 1.6);
  warm.position.set(1.4, -0.6, 1.4);
  scene.add(key, back, hemi, warm);

  // Zemin
  const groundMat = new THREE.MeshStandardMaterial({ map: snowTexture(), color: '#ffffff', roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.0;
  scene.add(ground);

  // Temas gölgesi
  const shadowMat = new THREE.MeshBasicMaterial({
    map: softSprite('rgba(40,52,70,.55)', 'rgba(40,52,70,0)'), transparent: true, depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.2), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.994;
  scene.add(shadow);

  // Lastik
  const tire = createTire({ ad, olcu, lite });
  scene.add(tire.root);

  // Kardaki iz: başlangıç noktasından lastiğe kadar uzar
  const TRAIL_START = stations.start;
  const TILE = 0.62 * 1.4; // bir doku tekrarı dünya biriminde
  const printTex = printTexture();
  const trailMat = new THREE.MeshStandardMaterial({ map: printTex, transparent: true, depthWrite: false, roughness: 1, metalness: 0 });
  const trailGeo = new THREE.PlaneGeometry(1, 0.64);
  trailGeo.translate(0.5, 0, 0);
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(TRAIL_START, -0.993, 0);
  trail.visible = false;
  scene.add(trail);
  // final izi (ayrı, sahnenin ortasından sağa)
  const trail2 = new THREE.Mesh(trailGeo, trailMat.clone());
  trail2.material.map = printTex.clone();
  trail2.material.map.needsUpdate = true;
  trail2.rotation.x = -Math.PI / 2;
  trail2.position.set(0, -0.993, 0);
  trail2.visible = false;
  scene.add(trail2);

  // Kar direkleri: her hizmet için bir istasyon (turuncu-beyaz şeritli)
  const poles = new THREE.Group();
  const poleTex = (() => {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 64;
    const g = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#ffffff' : ORANGE;
      g.fillRect(0, i * 8, 8, 8);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  })();
  const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.3, 10);
  const poleMat = new THREE.MeshStandardMaterial({ map: poleTex, roughness: 0.5 });
  stations.xs.forEach((x) => {
    const p = new THREE.Mesh(poleGeo, poleMat);
    p.position.set(x, -0.35, 0.72);
    p.rotation.z = 0.04;
    poles.add(p);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), shadowMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x + 0.12, -0.992, 0.75);
    poles.add(s);
  });
  poles.visible = false;
  scene.add(poles);

  // Lastik oteli: plakalı etiketli yığınlar
  const otel = new THREE.Group();
  otel.visible = false;
  scene.add(otel);
  const STACKS = lite ? [[-1.05, 0], [0, -0.6], [1.05, 0], [-0.5, -1.9], [0.6, -2.1]] : [[-2.1, 0.2], [-1.05, -0.3], [0, 0], [1.05, -0.4], [2.1, 0.1], [-1.6, -2.2], [0.5, -2.4], [1.7, -2.0]];
  const PER = 6;
  const sGeo = simpleTireGeo(lite);
  sGeo.rotateX(0); // eksen Y: yatık lastik
  const sScale = 0.46;
  const otelTires = new THREE.InstancedMesh(sGeo, tire.rubber, STACKS.length * PER);
  const tagMat = new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.6, side: THREE.DoubleSide });
  const tagGeo = new THREE.PlaneGeometry(0.16, 0.07);
  const tags = new THREE.InstancedMesh(tagGeo, tagMat, STACKS.length * PER);
  otelTires.frustumCulled = false;
  tags.frustumCulled = false;
  otel.add(otelTires, tags);
  const otelSpecs = [];
  STACKS.forEach(([x, z], si) => {
    for (let j = 0; j < PER; j++) {
      otelSpecs.push({ x, z, j, rot: (si * 1.7 + j * 0.9) % TAU, delay: (j * STACKS.length + si) / (STACKS.length * PER) });
    }
  });
  const oM = new THREE.Matrix4();
  const oQ = new THREE.Quaternion();
  const oE = new THREE.Euler();
  const oP = new THREE.Vector3();
  const oS = new THREE.Vector3(sScale, sScale, sScale);
  const one = new THREE.Vector3(1, 1, 1);
  const bounce = (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  };
  let lastOtel = -1;
  function setOtel(p) {
    if (Math.abs(p - lastOtel) < 0.001) return;
    lastOtel = p;
    const h = 0.6 * sScale; // yığın adımı
    otelSpecs.forEach((s, i) => {
      const t = Math.min(1, Math.max(0, (p - s.delay * 0.7) / 0.3));
      const yRest = -1 + h / 2 + s.j * h;
      const y = t <= 0 ? 30 : yRest + (1 - bounce(t)) * 5;
      const wob = (1 - t) * 0.3;
      oE.set(wob * Math.sin(i), s.rot, wob * Math.cos(i));
      oQ.setFromEuler(oE);
      oP.set(s.x, y, s.z);
      oM.compose(oP, oQ, oS);
      otelTires.setMatrixAt(i, oM);
      // etiket: lastiğin yanağına dik, dışa bakan
      const ang = s.rot;
      oP.set(s.x + Math.sin(ang) * 0.99 * sScale, y, s.z + Math.cos(ang) * 0.99 * sScale);
      oE.set(0, ang, 0);
      oQ.setFromEuler(oE);
      oM.compose(oP, oQ, one);
      tags.setMatrixAt(i, oM);
    });
    otelTires.instanceMatrix.needsUpdate = true;
    tags.instanceMatrix.needsUpdate = true;
  }

  // Yağan kar
  const SNOW = lite ? 260 : 520;
  const snowGeo = new THREE.BufferGeometry();
  const nPos = new Float32Array(SNOW * 3);
  const nSeed = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    nPos[i * 3] = (Math.random() - 0.5) * 9;
    nPos[i * 3 + 1] = Math.random() * 5 - 1;
    nPos[i * 3 + 2] = (Math.random() - 0.5) * 7;
    nSeed[i] = Math.random();
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  const snowMat = new THREE.PointsMaterial({
    map: softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), size: 0.05, transparent: true, depthWrite: false, opacity: 0.9, color: '#ffffff',
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  // Kar pofuduğu (lastik yere düşünce)
  const PUFF = lite ? 70 : 140;
  const puffGeo = new THREE.BufferGeometry();
  const pfPos = new Float32Array(PUFF * 3);
  const pfVel = new Float32Array(PUFF * 3);
  puffGeo.setAttribute('position', new THREE.BufferAttribute(pfPos, 3));
  const puffMat = new THREE.PointsMaterial({
    map: softSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), size: 0.16, transparent: true, depthWrite: false, opacity: 0, color: '#ffffff',
  });
  const puff = new THREE.Points(puffGeo, puffMat);
  puff.frustumCulled = false;
  scene.add(puff);
  let puffT = 99;
  function firePuff(x) {
    puffT = 0;
    for (let i = 0; i < PUFF; i++) {
      const a = Math.random() * TAU;
      const s = 0.8 + Math.random() * 2.2;
      pfPos[i * 3] = x + Math.cos(a) * 0.5;
      pfPos[i * 3 + 1] = -0.95;
      pfPos[i * 3 + 2] = Math.sin(a) * 0.3;
      pfVel[i * 3] = Math.cos(a) * s;
      pfVel[i * 3 + 1] = 1 + Math.random() * 2.4;
      pfVel[i * 3 + 2] = Math.sin(a) * s * 0.6;
    }
  }

  // --- Boyut ---
  let width = 1, height = 1;
  let ox = 0, oy = 0;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyOffset();
  }
  function applyOffset() {
    camera.setViewOffset(width, height, -ox * width, -oy * height, width, height);
  }
  resize();

  // Performans: kare süresi yüksekse çözünürlüğü düşür
  let frameAcc = 0, frameN = 0;
  function adapt(dt) {
    frameAcc += dt;
    frameN++;
    if (frameN >= 40) {
      const avg = frameAcc / frameN;
      if (avg > 1 / 40 && dpr > 0.75) {
        dpr = Math.max(0.75, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        resize();
      }
      frameAcc = 0;
      frameN = 0;
    }
  }

  const tmpV = new THREE.Vector3();
  const look = new THREE.Vector3();
  let spinAngle = 0;
  let rollBase = 0;
  let rolling = false;
  let snowT = 0;
  let wasOnGround = true;

  function render(po, dt) {
    const portrait = height > width;
    const fit = portrait ? po.fitP ?? 1.45 : 1;
    // kamera: portrede geri çekil
    const tx = po.target[0], ty = po.target[1], tz = po.target[2];
    camera.position.set(
      tx + (po.cam[0] - tx) * fit,
      ty + (po.cam[1] - ty) * fit,
      tz + (po.cam[2] - tz) * fit
    );
    look.set(tx, ty, tz);
    camera.lookAt(look);
    const off = portrait ? po.offP ?? [0, 0] : po.off ?? [0, 0];
    if (off[0] !== ox || off[1] !== oy) {
      ox = off[0];
      oy = off[1];
      applyOffset();
    }

    const isOtel = po.mode === 'otel';
    otel.visible = isOtel;
    tire.root.visible = !isOtel;
    shadow.visible = !isOtel;
    if (isOtel) setOtel(po.otel ?? 0);

    // lastik
    const x = po.tireX ?? 0;
    const y = po.tireY ?? 0;
    tire.root.position.set(x, y, po.tireZ ?? 0);
    tire.root.rotation.y = po.yaw ?? 0;
    tire.root.rotation.z = po.lean ?? 0;
    if (po.rollAngle != null) {
      if (!rolling) rollBase = spinAngle - po.rollAngle;
      rolling = true;
      spinAngle = rollBase + po.rollAngle;
    } else {
      rolling = false;
      spinAngle += (po.spin ?? 0) * dt;
    }
    tire.spin.rotation.z = spinAngle;
    tire.setWear(po.wear ?? 0);
    tire.twi.material.opacity = Math.max(0, ((po.wear ?? 0) - 0.55) / 0.45);
    warm.intensity = po.warm ?? 0;
    warm.position.set(x + 1.4, -0.6, 1.4);

    // gölge
    const lift = Math.max(0, y);
    shadow.position.x = x;
    shadow.position.z = po.tireZ ?? 0;
    const ss = 1 / (1 + lift * 0.6);
    shadow.scale.set(ss, ss, 1);
    shadowMat.opacity = ss;

    // düşüş anı
    const onGround = y < 0.05;
    if (onGround && !wasOnGround && po.puffOk) firePuff(x);
    wasOnGround = onGround;

    // izler
    const tr = po.trail ?? 0;
    trail.visible = tr > 0.01;
    if (trail.visible) {
      trail.scale.x = tr;
      printTex.repeat.x = tr / TILE;
    }
    const tr2 = po.trail2 ?? 0;
    trail2.visible = tr2 > 0.01;
    if (trail2.visible) {
      trail2.position.x = po.trail2From ?? 0;
      trail2.scale.x = tr2;
      trail2.material.map.repeat.x = tr2 / TILE;
    }
    poles.visible = !!po.poles;

    // kar
    snowT += dt;
    snowMat.opacity = po.snow ?? 0.8;
    snow.visible = snowMat.opacity > 0.02;
    if (snow.visible) {
      const base = look;
      for (let i = 0; i < SNOW; i++) {
        const k = i * 3;
        nPos[k + 1] -= dt * (0.25 + nSeed[i] * 0.35) * (po.snowSpeed ?? 1);
        nPos[k] += Math.sin(snowT * 0.7 + nSeed[i] * 20) * dt * 0.12;
        if (nPos[k + 1] < -1) {
          nPos[k + 1] = 4;
          nPos[k] = base.x + (Math.random() - 0.5) * 9;
          nPos[k + 2] = base.z + (Math.random() - 0.5) * 7;
        }
        // kameradan uzaklaşan taneyi takip ettir
        if (nPos[k] < base.x - 5) nPos[k] += 10;
        else if (nPos[k] > base.x + 5) nPos[k] -= 10;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    // pofuduk
    if (puffT < 1.6) {
      puffT += dt;
      for (let i = 0; i < PUFF; i++) {
        const k = i * 3;
        pfVel[k + 1] -= 4.5 * dt;
        pfVel[k] *= 0.97;
        pfVel[k + 2] *= 0.97;
        pfPos[k] += pfVel[k] * dt;
        pfPos[k + 1] = Math.max(-0.98, pfPos[k + 1] + pfVel[k + 1] * dt);
        pfPos[k + 2] += pfVel[k + 2] * dt;
      }
      puffGeo.attributes.position.needsUpdate = true;
      puffMat.opacity = Math.max(0, 0.95 * (1 - puffT / 1.6));
      puff.visible = true;
    } else puff.visible = false;

    renderer.render(scene, camera);
    if (dt > 0) adapt(dt);
  }

  // dünya noktasını ekran koordinatına çevir (etiketler için)
  function project(x, y, z) {
    tmpV.set(x, y, z).project(camera);
    return [(tmpV.x * 0.5 + 0.5) * width, (-tmpV.y * 0.5 + 0.5) * height, tmpV.z];
  }

  return { render, resize, project, renderer };
}
