// Gerçekçi parçalar: lib3d varlıklarından (motor v2, jant/fren) ilgili düğümler kopyalanıp
// raftan çıkan parça olarak kullanılır. Kodla çizilmiş parça hemen görünür; GLB gelince yerini bunlar alır.
import * as THREE from 'three';
import { loadAsset } from '../../shared/lib3d.js';

// kategori (data: hizmetler[].parca) → hangi varlığın hangi düğümleri
const PICK = {
  disk: { asset: 'wheel', nodes: ['disc', 'caliper'], tilt: [0, 0.35, 0] },
  filtre: { asset: 'engine', nodes: ['oil_filter'], tilt: [0.35, 0, 0.2] },
  triger: { asset: 'engine', nodes: ['timing_belt', 'cam_pulley_intake', 'cam_pulley_exhaust', 'crank_pulley', 'tensioner'], tilt: [0, 0.5, 0] },
  debriyaj: { asset: 'engine', nodes: ['flywheel'], tilt: [0, 0.6, 0.2] },
  buji: { asset: 'engine', nodes: ['coil_1', 'coil_2'], tilt: [0, 0, -0.25] },
  piston: { asset: 'engine', nodes: ['piston_1', 'conrod_1'], tilt: [0, 0, 0.15] },
};

function extract(asset, names, size, tilt) {
  asset.scene.updateMatrixWorld(true);
  const g = new THREE.Group();
  for (const n of names) {
    const src = asset.nodes[n];
    if (!src) continue;
    const c = src.clone(true);
    src.matrixWorld.decompose(c.position, c.quaternion, c.scale);
    g.add(c);
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
      o.receiveShadow = false;
    }
  });
  return wrap;
}

/** kinds: ['disk','filtre',...] → Promise<Record<kind, THREE.Group>> */
export async function loadRealParts(kinds, { quality, renderer }) {
  const need = new Set(kinds.map((k) => PICK[k]?.asset).filter(Boolean));
  const assets = {};
  await Promise.all([...need].map(async (name) => {
    try {
      assets[name] = await loadAsset(name, { quality, renderer, version: name === 'engine' ? 2 : undefined });
    } catch (e) {
      console.warn('lib3d', name, e);
    }
  }));
  const out = {};
  for (const k of kinds) {
    const p = PICK[k];
    if (!p || !assets[p.asset]) continue;
    const part = extract(assets[p.asset], p.nodes, k === 'triger' ? 0.72 : k === 'filtre' ? 0.46 : 0.64, p.tilt);
    if (part) out[k] = part;
  }
  return out;
}
