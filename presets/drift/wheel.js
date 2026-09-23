// Kodla modellenmiş teker: lastik (yaz/kış diş blokları), yanak yazısı, çok kollu jant,
// delikli fren diski, kaliper, bijonlar, sibop ve balans ağırlıkları.
// Aks Z ekseni boyunca; teker +Z yönüne (kameraya) bakar. Dış yarıçap ~1.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

export const RIM_FINISHES = {
  grafit: { ad: 'Grafit', color: '#2c2f35', metalness: 0.85, roughness: 0.38 },
  parlakGumus: { ad: 'Gümüş', color: '#c9ccd1', metalness: 0.95, roughness: 0.22 },
  parlakSiyah: { ad: 'Parlak siyah', color: '#101113', metalness: 0.7, roughness: 0.12 },
  fume: { ad: 'Füme', color: '#50555d', metalness: 0.92, roughness: 0.32 },
  bronz: { ad: 'Bronz', color: '#8c6a3c', metalness: 0.95, roughness: 0.3 },
  matSiyah: { ad: 'Mat siyah', color: '#1b1b1d', metalness: 0.35, roughness: 0.72 },
};
export const CALIPER_COLORS = {
  sari: { ad: 'Sarı', color: '#ffd000' },
  kirmizi: { ad: 'Kırmızı', color: '#e0261b' },
  mavi: { ad: 'Mavi', color: '#1f6fe0' },
  siyah: { ad: 'Siyah', color: '#161616' },
};

// Tire yanağı: işletme adı + ebat, dairesel yazı
function sidewallTexture(ad, olcu, since) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const scale = S / 2 / 0.97; // dünya birimi → piksel
  g.translate(S / 2, S / 2);

  const ring = (text, radius, size, color, startDeg, weight = 800) => {
    g.save();
    g.font = `${weight} ${size}px Anybody, 'Arial Narrow', sans-serif`;
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const r = radius * scale;
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width + size * 0.08);
    const total = widths.reduce((a, b) => a + b, 0);
    let a = (startDeg * Math.PI) / 180 - total / r / 2;
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i];
      a += w / r / 2;
      g.save();
      g.rotate(a);
      g.translate(0, -r);
      g.fillText(chars[i], 0, 0);
      g.restore();
      a += w / r / 2;
    }
    g.restore();
  };

  const name = ad.toLocaleUpperCase('tr');
  const nameSize = name.length > 22 ? 44 : name.length > 16 ? 52 : 60;
  ring(name, 0.855, nameSize, '#ffd000', 0);
  ring(name, 0.855, nameSize, '#ffd000', 180);
  ring(`${olcu}  •  ŞAŞMAZ  •  ${since}`, 0.855, 30, '#6d6f74', 90, 700);
  ring(`TUBELESS  •  M+S  •  ANKARA`, 0.855, 30, '#6d6f74', 270, 700);
  // Kabartma çizgileri
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.lineWidth = 3;
  for (const r of [0.79, 0.925]) {
    g.beginPath();
    g.arc(0, 0, r * scale, 0, TAU);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Kış bloklarındaki lamel (sipe) dokusu
function sipeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#23262c';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#08090b';
  g.lineWidth = 3;
  for (let x = 10; x < 64; x += 14) {
    g.beginPath();
    for (let y = 0; y <= 64; y += 8) g.lineTo(x + (y % 16 ? 3 : -3), y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// İndekssiz bir geometrinin gruplarını ayrı geometrilere böler (ön yüz / yan yüz)
function splitGroups(geo) {
  return geo.groups.map(({ start, count }) => {
    const g = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const size = attr.itemSize;
      g.setAttribute(name, new THREE.BufferAttribute(attr.array.slice(start * size, (start + count) * size), size));
    }
    return g;
  });
}

function lathe(points, segments) {
  const g = new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  g.rotateX(Math.PI / 2); // lathe Y ekseni → aks Z ekseni
  return g;
}

export function createWheel({ ad, olcu = '225/45 R17', since = '', lowEnd = false }) {
  const seg = lowEnd ? 64 : 96;
  const root = new THREE.Group(); // konum + genel eğim
  const spin = new THREE.Group(); // aks etrafında döner
  root.add(spin);

  const rubber = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.86, metalness: 0 });
  const rubberBlock = new THREE.MeshStandardMaterial({ color: '#1b1b1e', roughness: 0.8, metalness: 0 });
  const winterBlock = new THREE.MeshStandardMaterial({ color: '#ffffff', map: sipeTexture(), roughness: 0.78 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.95, roughness: 0.22 });
  // Elmas kesim yüz: boyadan bağımsız parlak işlenmiş alüminyum
  const machined = new THREE.MeshStandardMaterial({ color: '#eef0f3', metalness: 1, roughness: 0.14 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e8eaee', metalness: 1, roughness: 0.12 });
  // Isı: sürtünme halkasında yoğun, merkeze doğru sönük
  const heatMap = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, '#000');
    grd.addColorStop(0.5, '#000');
    grd.addColorStop(0.72, '#fff');
    grd.addColorStop(0.9, '#b0b0b0');
    grd.addColorStop(1, '#000');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const discMat = new THREE.MeshStandardMaterial({
    color: '#6f7278', metalness: 0.85, roughness: 0.38, emissive: new THREE.Color('#ff3d0a'), emissiveIntensity: 0,
  });
  const discFaceMat = discMat.clone();
  discFaceMat.emissiveMap = heatMap;
  const darkMat = new THREE.MeshBasicMaterial({ color: '#0a0a0b' });
  const caliperMat = new THREE.MeshStandardMaterial({ color: '#ffd000', metalness: 0.1, roughness: 0.28 });

  // --- Lastik gövdesi (kesit profili, r / z) ---
  const tireProfile = [
    [0.69, -0.2], [0.72, -0.215], [0.78, -0.228], [0.86, -0.232], [0.93, -0.222], [0.965, -0.2],
    [0.982, -0.17], [0.985, 0], [0.982, 0.17], [0.965, 0.2], [0.93, 0.222], [0.86, 0.232],
    [0.78, 0.228], [0.72, 0.215], [0.69, 0.2],
  ];
  const tire = new THREE.Mesh(lathe(tireProfile, seg), rubber);
  const parts = { tire: new THREE.Group(), rim: new THREE.Group(), disc: new THREE.Group(), nuts: new THREE.Group() };
  parts.tire.add(tire);

  // Yanak yazısı (iki yüz)
  const swTex = sidewallTexture(ad, olcu, since);
  const swMat = new THREE.MeshStandardMaterial({
    map: swTex, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const ringGeo = new THREE.RingGeometry(0.7, 0.97, seg, 1);
  // RingGeometry UV'si düzlemsel (dış yarıçapa göre) → dokuyla birebir
  const swFront = new THREE.Mesh(ringGeo, swMat);
  swFront.position.z = 0.234;
  const swBack = new THREE.Mesh(ringGeo, swMat);
  swBack.position.z = -0.234;
  swBack.rotation.y = Math.PI;
  parts.tire.add(swFront, swBack);

  // --- Diş blokları: yaz ve kış iki ayrı InstancedMesh, biri batarken diğeri çıkar ---
  const makeTread = (cols, ribs, bw, bl, mat, vShape) => {
    const geo = new THREE.BoxGeometry(bl, 0.05, bw);
    geo.translate(0, 0.025, 0); // taban yarıçapta, blok dışa doğru büyür
    const mesh = new THREE.InstancedMesh(geo, mat, cols * ribs.length);
    const base = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < ribs.length; j++) {
        const offset = j % 2 ? 0.5 : 0;
        const a = ((i + offset) / cols) * TAU;
        const yaw = vShape ? (ribs[j] > 0 ? 1 : -1) * 0.38 : (j % 2 ? 0.12 : -0.12);
        base.push({ a, z: ribs[j], yaw });
      }
    }
    mesh.userData.base = base;
    return mesh;
  };
  const treadR = 0.968;
  const yaz = makeTread(lowEnd ? 46 : 58, [-0.155, -0.055, 0.055, 0.155], 0.078, 0.085, rubberBlock, false);
  const kis = makeTread(lowEnd ? 56 : 72, [-0.165, -0.085, 0, 0.085, 0.165], 0.066, 0.06, winterBlock, true);
  parts.tire.add(yaz, kis);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  function layoutTread(mesh, amount, wavePhase) {
    const base = mesh.userData.base;
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      // Dalga: blokların çıkışı teker çevresinde sırayla ilerler
      const local = THREE.MathUtils.clamp(amount * 1.6 - ((b.a / TAU + wavePhase) % 1) * 0.6, 0, 1);
      const h = local < 0.001 ? 0.0001 : local;
      pos.set(Math.cos(b.a) * treadR, Math.sin(b.a) * treadR, b.z);
      e.set(0, 0, b.a - Math.PI / 2);
      q.setFromEuler(e);
      const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
      q.multiply(qy);
      scl.set(1, h, 1);
      m4.compose(pos, q, scl);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = amount > 0.001;
  }
  let treadMix = -1;
  function setTread(mix) {
    if (Math.abs(mix - treadMix) < 0.002) return;
    treadMix = mix;
    layoutTread(yaz, 1 - mix, 0);
    layoutTread(kis, mix, 0.5);
    // Hamur rengi: kışa geçerken hafif soğuk ton
    rubber.color.set('#141416').lerp(new THREE.Color('#141821'), mix);
  }
  setTread(0);

  // --- Jant ---
  const barrel = new THREE.Mesh(
    lathe([[0.705, 0.215], [0.69, 0.2], [0.655, 0.19], [0.62, 0.15], [0.6, 0.05], [0.6, -0.15], [0.64, -0.19], [0.7, -0.21]], seg),
    rimMat
  );
  barrel.material.side = THREE.DoubleSide;
  // Kollar: 5 çift kol (10), tek geometriye birleştirilir
  const spokeShape = new THREE.Shape();
  spokeShape.moveTo(0.12, -0.045);
  spokeShape.lineTo(0.625, -0.03);
  spokeShape.lineTo(0.625, 0.03);
  spokeShape.lineTo(0.12, 0.045);
  spokeShape.closePath();
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, {
    depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2,
  });
  const spokeFaces = [];
  const spokeSides = [];
  for (let i = 0; i < 5; i++) {
    for (const off of [-0.2, 0.2]) {
      const gg = spokeGeo.clone();
      // Konkav görünüm: kollar dışa doğru hafif öne gelir
      gg.rotateY(-0.1);
      gg.rotateZ((i / 5) * TAU + off);
      gg.translate(0, 0, 0.1);
      const [face, side] = splitGroups(gg);
      spokeFaces.push(face);
      spokeSides.push(side);
    }
  }
  const spokeMesh = new THREE.Mesh(mergeGeometries(spokeFaces), machined);
  const spokeSideMesh = new THREE.Mesh(mergeGeometries(spokeSides), rimMat);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.08, 40).rotateX(Math.PI / 2), rimMat);
  hub.position.z = 0.13;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 32).rotateX(Math.PI / 2), darkMat);
  cap.position.z = 0.175;
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.007, 8, 40), caliperMat);
  capRing.position.z = 0.19;
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), chrome);
  valve.position.set(0.63, 0, 0.14);
  valve.rotation.z = Math.PI / 2;
  parts.rim.add(barrel, spokeMesh, spokeSideMesh, hub, cap, capRing, valve);

  // Bijonlar
  const nutGeos = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + TAU / 10;
    const gg = new THREE.CylinderGeometry(0.024, 0.024, 0.05, 6).rotateX(Math.PI / 2);
    gg.translate(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.19);
    nutGeos.push(gg);
  }
  parts.nuts.add(new THREE.Mesh(mergeGeometries(nutGeos), chrome));

  // --- Fren diski ---
  const disc = new THREE.Mesh(lathe([[0.2, 0.026], [0.52, 0.026], [0.52, -0.026], [0.2, -0.026]], seg), discMat);
  disc.material.side = THREE.DoubleSide;
  const discFace = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.52, seg, 1), discFaceMat);
  discFace.position.z = 0.0265;
  const holes = [];
  for (let ring = 0; ring < 3; ring++) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + ring * 0.18;
      const r = 0.3 + ring * 0.07;
      const hg = new THREE.CircleGeometry(0.013, 10);
      hg.translate(Math.cos(a) * r, Math.sin(a) * r, 0.028);
      holes.push(hg);
    }
  }
  const holeMesh = new THREE.Mesh(mergeGeometries(holes), darkMat);
  const discHat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 40, 1, true).rotateX(Math.PI / 2), discMat);
  discHat.position.z = 0.04;
  parts.disc.add(disc, discFace, holeMesh, discHat);

  // --- Kaliper (dönmez) ---
  const cs = new THREE.Shape();
  const a0 = 0.25, a1 = 0.95;
  cs.absarc(0, 0, 0.585, a0, a1, false);
  cs.absarc(0, 0, 0.415, a1, a0, true);
  cs.closePath();
  const caliperGeo = new THREE.ExtrudeGeometry(cs, {
    depth: 0.15, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 18,
  });
  caliperGeo.translate(0, 0, -0.075);
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  const caliperGroup = new THREE.Group();
  caliperGroup.add(caliper);

  // Balans ağırlıkları (jant iç bandına yapışık)
  const weights = new THREE.Group();
  const wGeo = new THREE.BoxGeometry(0.07, 0.018, 0.035);
  const wMat = new THREE.MeshStandardMaterial({ color: '#b9bdc4', metalness: 0.9, roughness: 0.35 });
  const weightItems = [];
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(wGeo, wMat);
    const a = 1.9 + i * 0.09;
    w.position.set(Math.cos(a) * 0.59, Math.sin(a) * 0.59, -0.08);
    w.rotation.z = a - Math.PI / 2;
    w.userData.home = w.position.clone();
    w.userData.a = a;
    weights.add(w);
    weightItems.push(w);
  }
  parts.rim.add(weights);

  spin.add(parts.tire, parts.rim, parts.disc, parts.nuts);
  root.add(caliperGroup);

  // Parça etiketleri için yerel bağlantı noktaları
  const anchors = {
    lastik: new THREE.Vector3(0.7, 0.72, 0),
    jant: new THREE.Vector3(-0.42, 0.3, 0.2),
    bijon: new THREE.Vector3(0.1, 0.05, 0.22),
    disk: new THREE.Vector3(-0.35, -0.28, 0),
    kaliper: new THREE.Vector3(0.4, 0.4, 0),
    sibop: new THREE.Vector3(0.63, 0, 0.16),
  };

  function setExplode(t) {
    const k = THREE.MathUtils.smootherstep(t, 0, 1);
    parts.nuts.position.z = k * 1.55;
    parts.rim.position.z = k * 0.85;
    parts.tire.position.z = k * -0.05;
    parts.disc.position.z = k * -0.75;
    caliperGroup.position.set(k * 0.18, k * 0.22, k * -0.95);
    parts.tire.scale.setScalar(1 + k * 0.04);
  }

  function setWeights(t) {
    // 0: ağırlıklar dışarıda (görünmez), 1: yerine oturmuş
    weightItems.forEach((w, i) => {
      const local = THREE.MathUtils.clamp(t * 1.4 - i * 0.1, 0, 1);
      const k = 1 - Math.pow(1 - local, 3);
      w.visible = local > 0;
      w.position.copy(w.userData.home).multiplyScalar(1 + (1 - k) * 0.5);
      w.position.z = -0.08 + (1 - k) * 0.6;
    });
  }
  setWeights(0);

  function setRim(key) {
    const f = RIM_FINISHES[key];
    rimMat.color.set(f.color);
    rimMat.metalness = f.metalness;
    rimMat.roughness = f.roughness;
  }
  function setCaliper(key) {
    caliperMat.color.set(CALIPER_COLORS[key].color);
  }
  function setHeat(h) {
    discMat.emissiveIntensity = h * 0.35;
    discFaceMat.emissiveIntensity = h * 2.4;
  }

  return { root, spin, parts, caliper: caliperGroup, anchors, setExplode, setTread, setWeights, setRim, setCaliper, setHeat };
}
