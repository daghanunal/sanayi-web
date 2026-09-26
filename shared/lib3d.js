// lib3d: ortak foto-gerçekçi 3D varlık kütüphanesi (public/lib3d/, kaynak: assets3d/).
// Kullanım (ayrıntı ve düğüm adları: assets3d/README.md):
//   import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';
//   const q = pickQuality();                                   // 'hi' | 'lo'
//   scene.environment = await loadEnv('workshop', renderer, { quality: q });
//   const car = await loadAsset('car', { quality: q, renderer });
//   scene.add(car.scene);
//   car.roll(speed * dt);                                      // tekerlekleri d metre ileri (+X) yuvarla
//   car.materials.paint.color.set('#8a1c1c');                  // boya rengi
//   car.explode(0.6);                                          // patlatılmış görünüm (varsa)
//   seat.setVariant('upholstery', 'alcantara');                // malzeme varyantı (döşeme)
//   car.dispose();
// Tüm yollar import.meta.env.BASE_URL üzerinden kurulur (/sanayi-web/ altında da çalışır).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const BASE = (import.meta.env && import.meta.env.BASE_URL) || '/';
export const LIB3D_URL = BASE + 'lib3d/';

let manifestP = null;
/** manifest.json (dosya adları, boyutlar, düğüm adları); bir kez indirilir. */
export function manifest() {
  if (!manifestP) {
    manifestP = fetch(LIB3D_URL + 'manifest.json').then((r) => {
      if (!r.ok) throw new Error('lib3d manifest ' + r.status);
      return r.json();
    });
  }
  return manifestP;
}

/** Telefon / zayıf cihaz → 'lo', diğerleri 'hi'. ?q=hi|lo URL parametresi her şeyi ezer. */
export function pickQuality() {
  try {
    const u = new URLSearchParams(location.search).get('q');
    if (u === 'hi' || u === 'lo') return u;
  } catch (_) {}
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const small = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 820px)').matches;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const weak = (nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4);
  const save = nav.connection && (nav.connection.saveData || /(^|-)2g$/.test(nav.connection.effectiveType || ''));
  return small || coarse || weak || save ? 'lo' : 'hi';
}

let loader = null;
function gltfLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

/**
 * Bir varlığı yükler.
 * @param {string} name  manifest'teki ad: 'car', 'engine', 'wheel', 'seat', 'truck', 'turbo', 'exhaust', 'garage', ...
 * @param {{quality?: 'hi'|'lo', renderer?: THREE.WebGLRenderer, shadows?: boolean, onProgress?: (f:number)=>void}} opts
 * @returns {Promise<{scene: THREE.Group, nodes: Record<string, THREE.Object3D>, materials: Record<string, THREE.Material>,
 *   explode: (t:number)=>void, hasExplode: boolean, info: object, dispose: ()=>void}>}
 */
export async function loadAsset(name, opts = {}) {
  const m = await manifest();
  const a = m.assets[name];
  if (!a) throw new Error('lib3d: bilinmeyen varlık ' + name);
  const q = opts.quality || pickQuality();
  const file = (a[q] || a.hi || a.lo).file;
  const gltf = await gltfLoader().loadAsync(LIB3D_URL + file, (e) => {
    if (opts.onProgress && e.total) opts.onProgress(e.loaded / e.total);
  });
  const root = gltf.scene;
  root.name = root.name || name;
  const nodes = {};
  const materials = {};
  const textures = new Set();
  const maxAniso = opts.renderer ? opts.renderer.capabilities.getMaxAnisotropy() : 1;
  root.traverse((o) => {
    if (o.name && !nodes[o.name]) nodes[o.name] = o;
    if (o.userData && o.userData.swatch) o.visible = false; // malzeme varyantı taşıyan gizli örnekler
    if (o.isMesh) {
      if (opts.shadows !== false) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!mat) continue;
        if (mat.name && !materials[mat.name]) materials[mat.name] = mat;
        for (const k in mat) {
          const v = mat[k];
          if (v && v.isTexture) {
            v.anisotropy = Math.min(8, maxAniso);
            textures.add(v);
          }
        }
      }
    }
  });
  // patlatılmış görünüm: extras.explode = [x,y,z] (varlık uzayında metre) → ebeveyn uzayına çevrilir
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const ex = [];
  root.traverse((o) => {
    const v = o.userData && o.userData.explode;
    if (!Array.isArray(v) || (v[0] === 0 && v[1] === 0 && v[2] === 0)) return;
    const dir = new THREE.Vector3().fromArray(v);
    if (o.parent && o.parent !== root) {
      const pm = new THREE.Matrix4().multiplyMatrices(rootInv, o.parent.matrixWorld);
      const q3 = new THREE.Quaternion();
      pm.decompose(new THREE.Vector3(), q3, new THREE.Vector3());
      dir.applyQuaternion(q3.invert());
    }
    ex.push({ o, base: o.position.clone(), dir, order: o.userData.explode_order || 0 });
  });
  const explode = (t) => {
    for (const e of ex) e.o.position.copy(e.base).addScaledVector(e.dir, t);
  };
  if (opts.renderer && opts.renderer.compileAsync && opts.compile !== false) {
    // shader derlemesini ilk kareden önce yap (takılma olmasın); hata olursa sessiz geç
    try {
      await opts.renderer.compileAsync(root, new THREE.PerspectiveCamera());
    } catch (_) {}
  }
  const dispose = () => {
    root.removeFromParent();
    root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    for (const mat of Object.values(materials)) mat.dispose();
    for (const t of textures) t.dispose();
  };
  // malzeme varyantı: 'upholstery_leather' → setVariant('upholstery', 'fabric') → 'upholstery_fabric'
  const variants = {};
  for (const n of Object.keys(materials)) {
    const i = n.indexOf('_');
    if (i > 0) (variants[n.slice(0, i)] ||= []).push(n.slice(i + 1));
  }
  const setVariant = (slot, variant) => {
    const m = materials[slot + '_' + variant];
    if (!m) return false;
    root.traverse((o) => {
      if (!o.isMesh || (o.userData && o.userData.swatch)) return;
      if (Array.isArray(o.material)) o.material = o.material.map((x) => (x && x.name.startsWith(slot + '_') ? m : x));
      else if (o.material && o.material.name.startsWith(slot + '_')) o.material = m;
    });
    return true;
  };
  // tekerlekler: wheel_* (ve tek teker varlığında 'spin') düğümleri kendi Z ekseninde döner. Sol taraftaki
  // tekerlerin Z'si ters baktığı için yön işareti ve yarıçap yüklemede ölçülür; roll(d) aracı d metre +X'e yuvarlar.
  const wheels = [];
  root.traverse((o) => {
    if (!/^wheel_/.test(o.name) && !(o.name === 'spin' && nodes.tyre)) return;
    const z = new THREE.Vector3(0, 0, 1).transformDirection(new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld));
    const box = new THREE.Box3().setFromObject(o);
    const r = Math.max(0.05, (box.max.y - box.min.y) / 2);
    wheels.push({ o, s: z.z >= 0 ? 1 : -1, r });
  });
  const roll = (d) => {
    for (const w of wheels) w.o.rotation.z -= (w.s * d) / w.r;
  };
  return { scene: root, nodes, materials, variants, setVariant, explode, roll, wheels, hasExplode: ex.length > 0, info: a, quality: q, dispose };
}

const envCache = new WeakMap();
/**
 * Poly Haven CC0 HDRI → PMREM ortam dokusu (scene.environment / scene.background).
 * @param {string} name 'workshop' | 'garage' | 'dusk' | 'night' | 'studio'
 * @param {THREE.WebGLRenderer} renderer
 * @param {{quality?: 'hi'|'lo'}} opts
 */
export async function loadEnv(name, renderer, opts = {}) {
  const m = await manifest();
  const e = m.envs[name];
  if (!e) throw new Error('lib3d: bilinmeyen ortam ' + name);
  const q = opts.quality || pickQuality();
  const file = (e[q] || e.hi).file;
  let per = envCache.get(renderer);
  if (!per) envCache.set(renderer, (per = new Map()));
  if (!per.has(file)) {
    per.set(
      file,
      new HDRLoader().loadAsync(LIB3D_URL + file).then((hdr) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const tex = pmrem.fromEquirectangular(hdr).texture;
        tex.name = 'lib3d-env-' + name;
        hdr.dispose();
        pmrem.dispose();
        return tex;
      })
    );
  }
  return per.get(file);
}

/** Yardımcı: varlığı yere oturt ve ortala (bbox tabanı y=0). */
export function groundAndCenter(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box.min.y;
  return box;
}
