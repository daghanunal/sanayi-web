// Gerçekçi vitrin parçaları: lib3d varlıklarından (motor v2, jant/fren) düğümler kopyalanır.
// Depo tasarımından farklı olarak burada "Motor parçaları" kaidede bütün bir motor bloğu, fren kaliperi
// ve yağ filtresi markanın mor boyasıyla (stüdyo vitrini) gösterilir.
import * as THREE from 'three';
import { loadAsset } from '../../shared/lib3d.js';

const PICK = {
  disk: { asset: 'wheel', nodes: ['disc', 'caliper'], tilt: [0, -0.5, 0] },
  filtre: { asset: 'engine', nodes: ['oil_filter'], tilt: [0.25, 0, 0.15], size: 0.72 },
  triger: { asset: 'engine', nodes: ['timing_belt', 'cam_pulley_intake', 'cam_pulley_exhaust', 'crank_pulley', 'tensioner'], tilt: [0, 0.35, 0] },
  debriyaj: { asset: 'engine', nodes: ['flywheel'], tilt: [0, -2.2, 0.15], size: 0.95 },
  buji: { asset: 'engine', nodes: ['coil_1'], tilt: [0, 0, 0], size: 0.8 },
  piston: { asset: 'engine', nodes: null, tilt: [0, -0.6, 0], size: 1.05 },
};

function extract(asset, names, size, tilt) {
  asset.scene.updateMatrixWorld(true);
  const g = new THREE.Group();
  if (!names) {
    g.add(asset.scene);
  } else {
    for (const n of names) {
      const src = asset.nodes[n];
      if (!src) continue;
      const c = src.clone(true);
      src.matrixWorld.decompose(c.position, c.quaternion, c.scale);
      g.add(c);
    }
  }
  if (!g.children.length) return null;
  g.rotation.set(tilt[0], tilt[1], tilt[2]);
  g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g);
  const s = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const inner = new THREE.Group();
  inner.add(g);
  g.position.sub(c);
  const wrap = new THREE.Group();
  wrap.add(inner);
  wrap.scale.setScalar(size / Math.max(s.x, s.y, s.z));
  wrap.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return wrap;
}

export async function loadRealParts(kinds, { quality, renderer, accent = 0x5b2bff }) {
  const need = new Set(kinds.map((k) => PICK[k]?.asset).filter(Boolean));
  const assets = {};
  await Promise.all([...need].map(async (name) => {
    try {
      assets[name] = await loadAsset(name, { quality, renderer, version: name === 'engine' ? 2 : undefined });
    } catch (e) {
      console.warn('lib3d', name, e);
    }
  }));
  // marka rengi: kaliper ve filtre boyası mor
  const cal = assets.wheel?.materials.caliper_paint;
  if (cal) cal.color.set(accent);
  const fil = assets.engine?.materials.filter_paint;
  if (fil) fil.color.set(accent);
  const out = {};
  // motorun bütününü kullanmadan önce parça kopyalarını al (bütün motor sahneye taşınır)
  const order = [...kinds].sort((a, b) => (a === 'piston') - (b === 'piston'));
  for (const k of order) {
    const p = PICK[k];
    if (!p || !assets[p.asset]) continue;
    const part = extract(assets[p.asset], p.nodes, p.size ?? 1, p.tilt);
    if (part) out[k] = part;
  }
  return out;
}
