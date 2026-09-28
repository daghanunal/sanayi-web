// Teker: lib3d `wheel` varlığı (225/45 R17, diş blokları, iki renk alaşım jant, havalandırmalı disk,
// 4 pistonlu kaliper). Sahne birimi: lastik dış yarıçapı ≈ 1 (varlık 0,317 m → ölçek S).
// Bu dosya varlığın üstüne drift'e özgü katmanları ekler:
//  - yanak yazısı (işletme adı, ebat) lastik yanağına gölgelendiricide basılır (?ad= ile değişir),
//  - kış dişi: lamelli bloklar yazlık dişin üstünden dalga hâlinde çıkar,
//  - balans ağırlıkları, kızgın fren diski, jant/kaliper boyası, parça parça açılma.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { loadAsset } from '../../shared/lib3d.js';
import { RIM_FINISHES, CALIPER_COLORS } from './finishes.js';

const TAU = Math.PI * 2;
const R_ASSET = 0.317; // varlıkta lastik dış yarıçapı (m)
export const S = 1 / R_ASSET;

// Yanak yazısı dokusu: lastik yanağı ağının yerel XY düzlemine (birim = 0,317 m) birebir oturur.
function sidewallTexture(ad, olcu, since) {
  const P = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = P;
  const g = c.getContext('2d');
  const scale = P / 2; // yerel birim → piksel
  g.translate(P / 2, P / 2);
  const ring = (text, radius, size, color, startDeg, weight = 800, track = 0.08) => {
    g.save();
    g.font = `${weight} ${size}px Anybody, 'Arial Narrow', sans-serif`;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const r = radius * scale;
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width + size * track);
    const total = widths.reduce((a, b) => a + b, 0);
    let a = (startDeg * Math.PI) / 180 - total / r / 2;
    for (let i = 0; i < chars.length; i++) {
      a += widths[i] / r / 2;
      g.save();
      g.rotate(a);
      g.translate(0, -r);
      g.fillText(chars[i], 0, 0);
      g.restore();
      a += widths[i] / r / 2;
    }
    g.restore();
  };
  const name = ad.toLocaleUpperCase('tr');
  const size = name.length > 24 ? 34 : name.length > 16 ? 42 : 50;
  ring(name, 0.852, size, '#ffcf00', 0);
  ring(name, 0.852, size, '#ffcf00', 180);
  ring(`${olcu}  ·  ŞAŞMAZ  ·  ${since}`, 0.852, 24, '#8d9097', 90, 700, 0.12);
  ring('TUBELESS  ·  M+S  ·  ANKARA', 0.852, 24, '#8d9097', 270, 700, 0.12);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Kış bloklarının lamel (sipe) kabartma dokusu
function sipeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 2.5;
  for (let x = 9; x < 64; x += 12) {
    g.beginPath();
    for (let y = 0; y <= 64; y += 8) g.lineTo(x + (y % 16 ? 2.5 : -2.5), y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function createWheel({ renderer, quality = 'hi', ad, olcu = '225/45 R17', since = '' }) {
  const lo = quality === 'lo';
  const A = await loadAsset('wheel', { quality, renderer });
  const root = new THREE.Group(); // konum + genel eğim (sahne yazar)
  const scaled = new THREE.Group();
  scaled.scale.setScalar(S);
  scaled.add(A.scene);
  root.add(scaled);
  const N = A.nodes;
  const M = A.materials;
  const spin = N.spin;

  // --- Malzemeler ---
  // Yanak: işletme adı sarı, ebat yazıları gri; yalnız yan yüzlere (normal ±Z) basılır.
  const swTex = sidewallTexture(ad, olcu, since);
  if (M.tyre_side) {
    M.tyre_side.onBeforeCompile = (sh) => {
      sh.uniforms.uSw = { value: swTex };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSwP; varying vec3 vSwN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSwP = position; vSwN = objectNormal;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uSw; varying vec3 vSwP; varying vec3 vSwN;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          {
            vec2 suv = vSwP.xy * 0.5 + 0.5;
            if (vSwP.z < 0.0) suv.x = 1.0 - suv.x;
            float face = smoothstep(0.45, 0.8, abs(normalize(vSwN).z));
            vec4 tx = texture2D(uSw, suv);
            diffuseColor.rgb = mix(diffuseColor.rgb, tx.rgb * 0.9, tx.a * face);
          }`
        );
    };
    M.tyre_side.customProgramCacheKey = () => 'drift-sidewall';
    M.tyre_side.needsUpdate = true;
  }
  // Kızgın disk: sürtünme yüzü kendi dokusuyla kor gibi parlar
  const heatColor = new THREE.Color('#ff4a0e');
  if (M.disc_face) {
    M.disc_face.emissive = heatColor.clone();
    M.disc_face.emissiveMap = M.disc_face.map || null;
    M.disc_face.emissiveIntensity = 0;
    M.disc_face.needsUpdate = true;
  }
  if (M.disc_hat) {
    M.disc_hat.emissive = new THREE.Color('#ff3a08');
    M.disc_hat.emissiveIntensity = 0;
  }
  const rubberBase = M.tyre_tread ? M.tyre_tread.color.clone() : new THREE.Color('#ffffff');
  const rubberCold = new THREE.Color('#dfe7f2');

  // --- Parça parça açılma: lib3d explode(1)/explode(0) ile uç konumlar ---
  const parts = { lastik: N.tyre, jant: N.rim, bijon: N.lugs, disk: N.disc, kaliper: N.caliper, sibop: N.valve };
  const base = new Map();
  for (const n of Object.values(parts)) if (n) base.set(n, n.position.clone());
  const EXP = 0.8;

  // Etiket bağlantı noktaları (varlık uzayı, metre): her parçanın kameraya bakan bir noktası
  const pol = (deg, r, z) => new THREE.Vector3(Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r, z);
  const anchors = {
    lastik: pol(38, 0.3, 0.085),
    jant: pol(152, 0.16, 0.085),
    bijon: pol(90, 0.056, 0.1),
    disk: pol(222, 0.135, 0.02),
    kaliper: new THREE.Vector3(-0.111, 0.086, 0.03),
    sibop: new THREE.Vector3(0.172, 0.056, 0.09),
  };

  // --- Kış dişi: lamelli bloklar (sahne birimi; spin içinde 1/S ölçekli grupta) ---
  const treadGroup = new THREE.Group();
  treadGroup.scale.setScalar(1 / S);
  spin.add(treadGroup);
  const sipe = sipeTexture();
  sipe.repeat.set(1, 1);
  const winterMat = new THREE.MeshStandardMaterial({
    color: '#26282d', roughness: 0.86, metalness: 0, bumpMap: sipe, bumpScale: 1.4,
  });
  const cols = lo ? 54 : 72;
  const ribs = [-0.255, -0.128, 0, 0.128, 0.255];
  const blockGeo = lo ? new THREE.BoxGeometry(0.07, 0.05, 0.1) : new RoundedBoxGeometry(0.07, 0.05, 0.1, 2, 0.008);
  blockGeo.translate(0, 0.025, 0);
  const winter = new THREE.InstancedMesh(blockGeo, winterMat, cols * ribs.length);
  winter.castShadow = true;
  winter.receiveShadow = true;
  winter.frustumCulled = false;
  const tread = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < ribs.length; j++) {
      const a = ((i + (j % 2 ? 0.5 : 0)) / cols) * TAU;
      tread.push({ a, z: ribs[j], yaw: (ribs[j] === 0 ? (i % 2 ? 1 : -1) * 0.2 : Math.sign(ribs[j]) * 0.42) });
    }
  }
  treadGroup.add(winter);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const treadR = 0.968;
  let treadMix = -1;
  function setTread(mix) {
    if (Math.abs(mix - treadMix) < 0.002) return;
    treadMix = mix;
    winter.visible = mix > 0.001;
    if (M.tyre_tread) M.tyre_tread.color.copy(rubberBase).lerp(rubberCold, mix * 0.35);
    if (!winter.visible) return;
    for (let i = 0; i < tread.length; i++) {
      const b = tread[i];
      // Dalga: bloklar teker çevresinde sırayla çıkar
      const local = THREE.MathUtils.clamp(mix * 1.6 - ((b.a / TAU + 0.25) % 1) * 0.6, 0, 1);
      const h = local < 0.001 ? 0.0001 : local;
      pos.set(Math.cos(b.a) * treadR, Math.sin(b.a) * treadR, b.z);
      e.set(0, 0, b.a - Math.PI / 2);
      q.setFromEuler(e);
      q.multiply(qy.setFromAxisAngle(Y, b.yaw));
      scl.set(1, h, 1);
      winter.setMatrixAt(i, m4.compose(pos, q, scl));
    }
    winter.instanceMatrix.needsUpdate = true;
  }
  setTread(0);

  // --- Balans ağırlıkları (jant iç bandına yapışık) ---
  const wMat = new THREE.MeshStandardMaterial({ color: '#b9bdc4', metalness: 0.9, roughness: 0.35 });
  const wGeo = new THREE.BoxGeometry(0.075, 0.02, 0.04);
  const weightItems = [];
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(wGeo, wMat);
    const a = 1.95 + i * 0.085;
    w.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, -0.04);
    w.rotation.z = a - Math.PI / 2;
    w.userData.home = w.position.clone();
    w.castShadow = true;
    treadGroup.add(w);
    weightItems.push(w);
  }
  function setWeights(t) {
    weightItems.forEach((w, i) => {
      const local = THREE.MathUtils.clamp(t * 1.4 - i * 0.1, 0, 1);
      const k = 1 - Math.pow(1 - local, 3);
      w.visible = local > 0;
      w.position.copy(w.userData.home).multiplyScalar(1 + (1 - k) * 0.5);
      w.position.z = -0.04 + (1 - k) * 0.7;
    });
  }
  setWeights(0);

  let lastExp = -1;
  function setExplode(t) {
    if (Math.abs(t - lastExp) < 0.0005) return;
    lastExp = t;
    A.explode(THREE.MathUtils.smootherstep(t, 0, 1) * EXP);
  }

  function setRim(key) {
    const f = RIM_FINISHES[key];
    if (!f) return;
    const p = M.rim_paint;
    if (p) {
      p.color.set(f.color);
      p.metalness = f.metalness;
      p.roughness = f.roughness;
    }
    const fc = M.rim_face;
    if (fc) {
      if (!fc.userData.orig) fc.userData.orig = { color: fc.color.clone(), metalness: fc.metalness, roughness: fc.roughness };
      const o = f.face || fc.userData.orig;
      fc.color.set(o.color);
      fc.metalness = o.metalness;
      fc.roughness = o.roughness;
    }
  }
  function setCaliper(key) {
    const c = CALIPER_COLORS[key];
    if (c && M.caliper_paint) {
      M.caliper_paint.color.set(c.color);
      M.caliper_paint.roughness = key === 'siyah' ? 0.45 : 0.3;
    }
  }
  function setHeat(h) {
    if (M.disc_face) M.disc_face.emissiveIntensity = h * 3.2;
    if (M.disc_hat) M.disc_hat.emissiveIntensity = h * 0.25;
  }

  const tmp = new THREE.Vector3();
  // Parçanın etiket noktası (dünya). Parçanın açılma ofsetini izler, tekerin dönüşünü izlemez.
  function anchor(id, out = new THREE.Vector3()) {
    const n = parts[id];
    const a = anchors[id];
    if (!n || !a) return null;
    out.copy(a).add(tmp.copy(n.position).sub(base.get(n)));
    return out.applyMatrix4(A.scene.matrixWorld);
  }

  return {
    root, spin, asset: A, materials: M, setExplode, setTread, setWeights, setRim, setCaliper, setHeat, anchor,
    ids: Object.keys(parts), dispose: () => A.dispose(),
  };
}
