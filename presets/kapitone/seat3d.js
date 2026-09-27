// Kapitone: kütüphanedeki gerçekçi koltuk (lib3d 'seat') loş bir döşeme atölyesinde.
// Hikâye durumları (main.js verir): söküm → iskelet çizgileri → sünger dolar → deri giydirilir →
// dikiş iner → ısıtma. Hepsi kopya geometri + dünya-Y kırpma düzlemleriyle, gölgeli sıcak spot ışıkta.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const REST_RECLINE = 0.2967; // GLB'deki sırtlık açısı (rad)

export const DEFAULT_STATE = {
  frame: 0, explode: 0, foam: 1, wrap: 1, stitch: 1, heat: 0, recline: 0, head: 0,
  theta: 0.7, phi: 0.12, dist: 3.1, tx: 0, ty: 0.62, tz: 0,
  spin: 0, sx: 0, sy: 0, dim: 1, turn: 0, cfg: 0,
};

function foamMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xd8c27a, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFoamP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFoamP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vFoamP;
        float fH(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float pore = fH(vFoamP * 420.0) * 0.6 + fH(vFoamP * 170.0) * 0.4;
        diffuseColor.rgb *= 0.74 + 0.3 * pore;`);
  };
  return m;
}

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createSeat(canvas) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lo, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  let dpr = Math.min(window.devicePixelRatio || 1, lo ? 1.25 : 1.5);

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.22;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);

  // Işık: sıcak tek anahtar spot (gölgeli), arkadan bakır kenar, çok az dolgu.
  const key = new THREE.SpotLight(0xffd4ae, 62, 0, 0.5, 0.65, 2);
  key.position.set(1.7, 3.4, 2.3);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 12;
  key.shadow.camera.near = 1.5;
  key.shadow.camera.far = 7;
  key.target.position.set(0, 0.5, 0);
  const rim = new THREE.DirectionalLight(0xff8a4a, 2.4);
  rim.position.set(-2.6, 1.8, -2.2);
  const top = new THREE.DirectionalLight(0xffe2c4, 0.5);
  top.position.set(0, 4, 0.6);
  const heatLight = new THREE.PointLight(0xff5a1a, 0, 1.6, 2);
  heatLight.position.set(0, 0.62, 0.35);
  scene.add(key, key.target, rim, top, heatLight);

  // Zemin: gölge alıcı + spotun zemindeki ışık havuzu + finalde döner tabla
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.62 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 64),
    new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(255,170,95,0.34)'], [0.45, 'rgba(160,70,30,0.14)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.002;
  const turntable = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.8, 0.05, lo ? 48 : 96),
    new THREE.MeshStandardMaterial({ color: 0x1a110d, roughness: 0.42, metalness: 0.35 })
  );
  disc.position.y = -0.026;
  disc.receiveShadow = true;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd9a24a, transparent: true, opacity: 0 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.795, 0.006, 8, lo ? 64 : 128), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.002;
  turntable.add(disc, ring);
  scene.add(ground, pool, turntable);

  // Koltuk tutucu: +X'e bakan varlığı kameraya (+Z) çevirir
  const holder = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.add(holder);
  scene.add(spinner);

  const target = { ...DEFAULT_STATE };
  const cur = { ...DEFAULT_STATE };
  const extra = { intro: 0, restitch: 1, userYaw: 0, autoYaw: 0 };
  let active = true;
  let dragging = false;
  let width = 1, height = 1;
  let asset = null;
  let dirty = 30;
  const look = new THREE.Vector3();

  // Kırpma düzlemleri (dünya Y): deri y ≥ wrapY, sünger y ≤ foamY, dikiş y ≥ stitchY
  const wrapPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
  const foamPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const stitchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
  const matFoam = foamMaterial();
  matFoam.clippingPlanes = [foamPlane];
  matFoam.clipShadows = true;
  matFoam.shadowSide = THREE.FrontSide;
  const matEdge = new THREE.LineBasicMaterial({ color: 0xe7a33a, transparent: true, opacity: 0, depthWrite: false });
  const edges = [];
  const foams = [];
  let softMats = [];
  let insertMats = [];
  let stitchNodes = [];
  let yTop = 1.25, yBot = 0;
  let restHead = 0.74;
  let backrest = null, headrest = null;

  const ready = (async () => {
    const [env, a] = await Promise.all([
      loadEnv('garage', renderer, { quality: q }),
      loadAsset('seat', { quality: q, renderer, compile: false }),
    ]);
    scene.environment = env;
    asset = a;
    const root = a.scene;
    root.rotation.y = -Math.PI / 2;
    holder.add(root);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.x -= c.x;
    root.position.z -= c.z;
    root.position.y -= box.min.y;
    root.updateMatrixWorld(true);
    yTop = box.max.y - box.min.y + 0.02;
    yBot = -0.01;

    backrest = a.nodes.backrest;
    headrest = a.nodes.headrest;
    restHead = headrest ? headrest.position.y : 0.74;

    // Yumuşak parçalar: tabandaki kasa ve raylar hariç her şey
    const baseNode = a.nodes.base;
    const isHard = (o) => {
      for (let p = o; p; p = p.parent) if (p === baseNode || p.name === 'variants' || p.name === 'headrest_posts') return true;
      return false;
    };
    // Plastik kabuk ve kasa koyu kalsın: sıcak spotta turuncuya kaçmasın
    a.materials.shell.color.set('#3a302b');
    if (a.materials.railmetal) a.materials.railmetal.color.set('#55504c');
    const shellSoft = a.materials.shell.clone();
    shellSoft.name = 'shellsoft';
    const soft = [];
    root.traverse((o) => {
      if (!o.isMesh || isHard(o)) return;
      soft.push(o);
      if (Array.isArray(o.material)) o.material = o.material.map((m) => (m && m.name === 'shell' ? shellSoft : m));
    });
    stitchNodes = [a.nodes.stitching_back, a.nodes.stitching_cushion].filter(Boolean);

    const matsByName = a.materials;
    softMats = [
      ...Object.values(matsByName).filter((m) => /^(upholstery|insert)_/.test(m.name)),
      matsByName.underside, shellSoft,
    ].filter(Boolean);
    for (const m of softMats) { m.clippingPlanes = [wrapPlane]; m.clipShadows = true; }
    if (matsByName.stitch) {
      matsByName.stitch.clippingPlanes = [wrapPlane, stitchPlane];
      matsByName.stitch.clipShadows = true;
      matsByName.stitch.emissive = new THREE.Color(0xe7a33a);
      matsByName.stitch.emissiveIntensity = 0;
    }
    insertMats = Object.values(matsByName).filter((m) => /^insert_/.test(m.name));
    for (const m of insertMats) {
      m.emissive = new THREE.Color(0xff5a1a);
      m.emissiveIntensity = 0;
    }

    for (const o of soft) {
      if (/^stitching/.test(o.name)) continue;
      // Sünger: aynı geometri, biraz içeride, tek malzeme
      const f = new THREE.Mesh(o.geometry, matFoam);
      f.scale.setScalar(0.992);
      f.castShadow = true;
      f.receiveShadow = true;
      o.add(f);
      foams.push(f);
      // İskelet/kalıp çizgileri
      const eg = new THREE.EdgesGeometry(o.geometry, 28);
      const l = new THREE.LineSegments(eg, matEdge);
      l.frustumCulled = false;
      o.add(l);
      edges.push({ l, n: eg.attributes.position.count });
    }
    // Taban kasası da çizgilerle vurgulanır
    root.traverse((o) => {
      if (!o.isMesh || !isHard(o) || o.name.startsWith('swatch')) return;
      const eg = new THREE.EdgesGeometry(o.geometry, 32);
      const l = new THREE.LineSegments(eg, matEdge);
      l.frustumCulled = false;
      o.add(l);
      edges.push({ l, n: eg.attributes.position.count });
    });

    a.explode(0);
    resize();
    apply(1, 0);
    // Tüm katmanlar görünürken derle; ilk kaydırmada takılma olmasın
    const planes = [wrapPlane.constant, foamPlane.constant, stitchPlane.constant];
    wrapPlane.constant = foamPlane.constant = stitchPlane.constant = 10;
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    } catch (_) {}
    [wrapPlane.constant, foamPlane.constant, stitchPlane.constant] = planes;
    dirty = 60;
    renderer.render(scene, camera);
  })();

  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = Math.max(dirty, 3);
  }
  resize();
  window.addEventListener('resize', resize);

  let lastStateSum = 0;
  function apply(dt, time) {
    const k = 1 - Math.exp(-dt * 6.5);
    let delta = 0;
    for (const key in target) {
      const d = target[key] - cur[key];
      cur[key] += d * k;
      delta += Math.abs(d);
    }

    if (asset) {
      asset.explode(cur.explode);
      if (backrest) backrest.rotation.z = REST_RECLINE + cur.recline * 0.28;
      if (headrest) headrest.position.y = restHead + cur.head * 0.07;

      // Patlatılmış parçalar tepeden ~0,3 m taşar: düzlemler bu payla süpürür
      const span = yTop + 0.3 * clamp(cur.explode * 2, 0, 1) - yBot;
      const wrap = clamp(cur.wrap, 0, 1);
      // wrap = 1 → deri tam; 0 → deri yok (deri yukarıdan aşağı giydirilir)
      const wrapY = wrap >= 0.999 ? -10 : wrap <= 0.001 ? 10 : yBot + (1 - wrap) * span;
      wrapPlane.constant = -wrapY;
      const foamY = cur.foam >= 0.999 ? 10 : yBot + clamp(cur.foam, 0, 1) * span;
      const fc = Math.min(foamY, wrap >= 0.999 ? -10 : wrapY + 0.004);
      foamPlane.constant = fc;
      const foamVisible = cur.foam > 0.002 && wrap < 0.999;
      foams.forEach((f) => (f.visible = foamVisible));
      const st = Math.min(clamp(cur.stitch, 0, 1), extra.restitch);
      const stitchY = st >= 0.999 ? -10 : st <= 0.001 ? 10 : yTop - st * (yTop - yBot);
      stitchPlane.constant = -stitchY;
      stitchNodes.forEach((n) => (n.visible = st > 0.002 && n.userData.hide !== true));
      const sm = asset.materials.stitch;
      if (sm) sm.emissiveIntensity = st > 0.002 && st < 0.999 ? 0.9 : 0;

      const fr = clamp(cur.frame, 0, 1) * clamp(extra.intro * 1.2, 0, 1);
      matEdge.opacity = fr * 0.9;
      edges.forEach((e) => {
        e.l.visible = fr > 0.01;
        if (e.l.visible) e.l.geometry.setDrawRange(0, Math.floor(e.n * clamp(fr * 1.15, 0, 1) / 2) * 2);
      });

      const h = clamp(cur.heat, 0, 1);
      const pulse = 0.82 + 0.18 * Math.sin(time * 3.2);
      insertMats.forEach((m) => (m.emissiveIntensity = h * 0.55 * pulse));
      heatLight.intensity = h * 2.2 * pulse;
    }

    // Döner tabla
    turntable.visible = cur.turn > 0.01;
    turntable.scale.set(1, Math.max(0.001, cur.turn), 1);
    ringMat.opacity = cur.turn * 0.9;
    extra.autoYaw += dt * 0.4 * cur.turn;
    if (cur.turn < 0.02) {
      const nearest = Math.round(extra.autoYaw / TAU) * TAU;
      extra.autoYaw += (nearest - extra.autoYaw) * k;
    }
    if (cur.cfg < 0.5 && !dragging) extra.userYaw *= 1 - k * 0.5;
    spinner.rotation.y = cur.spin + extra.userYaw + extra.autoYaw;
    turntable.rotation.y = spinner.rotation.y;

    // Kamera: yörünge + ekran kaydırma
    const portrait = width / height < 1;
    const fit = portrait ? Math.max(1, 0.8 / (width / height)) : 1;
    const dist = cur.dist * fit;
    look.set(cur.tx, cur.ty, cur.tz);
    camera.position.set(
      look.x + dist * Math.cos(cur.phi) * Math.sin(cur.theta),
      look.y + dist * Math.sin(cur.phi),
      look.z + dist * Math.cos(cur.phi) * Math.cos(cur.theta)
    );
    camera.lookAt(look);
    camera.setViewOffset(width, height, -cur.sx * width, -cur.sy * height, width, height);
    const intro = extra.intro;
    renderer.toneMappingExposure = (0.2 + 0.85 * cur.dim) * (0.15 + 0.85 * intro);
    key.intensity = 62 * (0.3 + 0.7 * intro);

    const sum = delta + Math.abs(cur.turn) + (dragging ? 1 : 0) + (cur.heat > 0.01 ? 1 : 0) + Math.abs(intro - lastStateSum);
    lastStateSum = intro;
    return sum;
  }

  let last = performance.now();
  let slow = 0, frames = 0;

  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!active) return;
    const moving = apply(dt, now / 1000);
    // Sahne durgunsa çizme (pil ve akıcılık)
    if (moving < 0.0004 && dirty <= 0) return;
    if (dirty > 0) dirty--;
    renderer.render(scene, camera);
    frames++;
    if (dt > 0.028) slow++;
    if (frames >= 45) {
      if (slow > 18 && dpr > 0.8) {
        dpr = Math.max(0.8, dpr - 0.2);
        resize();
      }
      frames = 0;
      slow = 0;
    }
  }

  // Yapılandırıcı: { upholstery, insert, color, tone, thread, plain }
  function setConfig(c, gsap, dur = 0.8) {
    if (!asset) return;
    asset.setVariant('upholstery', c.upholstery);
    asset.setVariant('insert', c.insert);
    const col = new THREE.Color(c.color).multiplyScalar(c.tone);
    for (const m of Object.values(asset.materials)) {
      if (!/^(upholstery|insert)_/.test(m.name)) continue;
      if (gsap && dur) gsap.to(m.color, { r: col.r, g: col.g, b: col.b, duration: dur, ease: 'power2.out' });
      else m.color.copy(col);
    }
    const th = new THREE.Color(c.thread);
    const sm = asset.materials.stitch;
    if (sm) {
      if (gsap && dur) gsap.to(sm.color, { r: th.r, g: th.g, b: th.b, duration: dur });
      else sm.color.copy(th);
      sm.emissive.copy(th);
    }
    stitchNodes.forEach((n) => (n.userData.hide = !!c.plain));
    dirty = Math.max(dirty, Math.round(dur * 60) + 10);
  }

  return {
    target, cur, extra, renderer, ready,
    frame,
    setConfig,
    renderOnce() { apply(1, performance.now() / 1000); renderer.render(scene, camera); },
    setActive(v) {
      if (v && !active) { last = performance.now(); dirty = Math.max(dirty, 2); }
      active = v;
    },
    setDragging(v) { dragging = v; },
    poke(n = 20) { dirty = Math.max(dirty, n); },
  };
}
