// Scroll'la dönen sıralı dört silindirli motor: krank mili, biyeller, pistonlar ve
// ateşleme sırasına (1-3-4-2) göre kızaran piston tepeleri. Tamamen prosedürel.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const R = 0.3; // krank yarıçapı (strok / 2)
const L = 1.0; // biyel boyu
const PITCH = 1.05; // silindirler arası mesafe
const CYL = [-1.5, -0.5, 0.5, 1.5].map((i) => i * PITCH);
const PHASE = [0, Math.PI, Math.PI, 0]; // 1 ve 4 birlikte, 2 ve 3 birlikte
const FIRE = [0, 3 * Math.PI, Math.PI, 2 * Math.PI]; // 720° çevrimde ateşleme anları (1-3-4-2)

function webGeometry() {
  // Krank kolu: bir ucu muylu, diğer ucu karşı ağırlık. Şekil düzleminde +x yönü muyluya bakar.
  const s = new THREE.Shape();
  s.moveTo(0, 0.2);
  s.lineTo(R, 0.17);
  s.absarc(R, 0, 0.17, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(0, -0.2);
  const a0 = -(Math.PI / 2 + 0.45);
  s.lineTo(0.42 * Math.cos(a0), 0.42 * Math.sin(a0));
  s.absarc(0, 0, 0.42, a0, -(3 * Math.PI) / 2 + 0.45, true);
  s.lineTo(0, 0.2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 24,
  });
  g.translate(0, 0, -0.05);
  g.rotateY(Math.PI / 2); // şekil x'i → dünya -z, ekstrüzyon → dünya x
  return g;
}

export function createEngine(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  // Işıklar: soğuk anahtar ışık, arkadan erimiş metal turuncusu kontur ışığı.
  const key = new THREE.DirectionalLight(0xdfe8ff, 2.2);
  key.position.set(3, 5, 6);
  const rim = new THREE.DirectionalLight(0xff5b14, 7);
  rim.position.set(-4, 3, -6);
  const under = new THREE.PointLight(0xff8a2a, 6, 8, 1.6);
  under.position.set(0, -1.6, 1.4);
  scene.add(key, rim, under, new THREE.AmbientLight(0x404650, 0.6));

  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.26 });
  const forged = new THREE.MeshStandardMaterial({ color: 0x6d737b, metalness: 1, roughness: 0.38 });
  const polished = new THREE.MeshStandardMaterial({ color: 0xd4d8de, metalness: 1, roughness: 0.12 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.8, roughness: 0.5 });

  const engine = new THREE.Group();
  scene.add(engine);

  // --- Krank mili ---
  const crank = new THREE.Group();
  engine.add(crank);
  const web = webGeometry();
  const journal = new THREE.CylinderGeometry(0.14, 0.14, 1, 32);
  journal.rotateZ(Math.PI / 2);

  // Ana muylular (silindirlerin arasında ve iki uçta)
  for (let i = 0; i <= 4; i++) {
    const m = new THREE.Mesh(journal, polished);
    m.scale.x = i === 0 || i === 4 ? 0.5 : 0.62;
    m.position.x = (i - 2) * PITCH + (i === 0 ? -0.1 : i === 4 ? 0.1 : 0);
    crank.add(m);
  }
  // Uçlar: kasnak ve volan
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 48), forged);
  pulley.rotation.z = Math.PI / 2;
  pulley.position.x = -2 * PITCH - 0.42;
  const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 64), forged);
  flywheel.rotation.z = Math.PI / 2;
  flywheel.position.x = 2 * PITCH + 0.42;
  const teeth = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 8, 96), steel);
  teeth.rotation.y = Math.PI / 2;
  teeth.position.x = flywheel.position.x;
  crank.add(pulley, flywheel, teeth);

  const pinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.34, 32);
  pinGeo.rotateZ(Math.PI / 2);
  CYL.forEach((x, i) => {
    const phi = PHASE[i];
    const pin = new THREE.Mesh(pinGeo, polished);
    pin.position.set(x, R * Math.cos(phi), R * Math.sin(phi));
    crank.add(pin);
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(web, forged);
      w.position.x = x + side * 0.24;
      w.rotation.x = phi + Math.PI / 2;
      crank.add(w);
    }
  });

  // --- Biyeller ve pistonlar ---
  const rodGeo = new THREE.CylinderGeometry(0.055, 0.075, 1, 16);
  const bigEnd = new THREE.TorusGeometry(0.15, 0.05, 12, 32);
  bigEnd.rotateY(Math.PI / 2);
  const smallEnd = new THREE.TorusGeometry(0.08, 0.04, 10, 24);
  smallEnd.rotateY(Math.PI / 2);
  const pistonGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.46, 48);
  const crownGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 48);
  const segGeo = new THREE.TorusGeometry(0.382, 0.012, 6, 48);
  segGeo.rotateX(Math.PI / 2);
  const linerGeo = new THREE.CylinderGeometry(0.41, 0.41, 1.25, 48, 1, true);
  const linerMat = new THREE.MeshStandardMaterial({
    color: 0x8b939c, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.1,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const headRingGeo = new THREE.TorusGeometry(0.41, 0.012, 6, 64);
  headRingGeo.rotateX(Math.PI / 2);
  const headRingMat = new THREE.MeshBasicMaterial({ color: 0xff7a2e, transparent: true, opacity: 0.55 });

  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,220,160,1)');
    grd.addColorStop(0.25, 'rgba(255,120,40,.8)');
    grd.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const cylinders = CYL.map((x) => {
    const rod = new THREE.Group();
    const shaft = new THREE.Mesh(rodGeo, steel);
    const be = new THREE.Mesh(bigEnd, forged);
    const se = new THREE.Mesh(smallEnd, forged);
    shaft.position.y = L / 2;
    se.position.y = L;
    rod.add(shaft, be, se);

    const piston = new THREE.Group();
    const body = new THREE.Mesh(pistonGeo, steel);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xb9bec5, metalness: 1, roughness: 0.3, emissive: 0xff4a0a, emissiveIntensity: 0,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.24;
    piston.add(body, crown);
    for (const y of [0.16, 0.1, 0.04]) {
      const s = new THREE.Mesh(segGeo, ringMat);
      s.position.y = y;
      piston.add(s);
    }
    const topY = R + L + 0.5; // piston ÜÖN'de iken tepesinin biraz üstü
    const liner = new THREE.Mesh(linerGeo, linerMat);
    liner.position.set(x, topY - 0.55, 0);
    const headRing = new THREE.Mesh(headRingGeo, headRingMat);
    headRing.position.set(x, topY + 0.06, 0);

    const flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0,
    }));
    flash.scale.setScalar(1.6);
    flash.position.set(x, topY + 0.02, 0);

    engine.add(rod, piston, liner, headRing, flash);
    return { x, rod, piston, crownMat, flash, headRing };
  });

  // Kıvılcım partikülleri: ateşlenen silindirin üstünden saçılır.
  const SPARKS = 90;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    color: 0xffa04a, size: 0.035, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  sparkLife.fill(0);
  for (let i = 0; i < SPARKS; i++) sparkPos[i * 3 + 1] = -99;
  engine.add(sparks);
  let sparkCursor = 0;
  const emit = (x, y, n) => {
    for (let k = 0; k < n; k++) {
      const i = sparkCursor++ % SPARKS;
      sparkPos.set([x + (Math.random() - 0.5) * 0.5, y, (Math.random() - 0.5) * 0.5], i * 3);
      sparkVel.set([(Math.random() - 0.5) * 1.6, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 1.6], i * 3);
      sparkLife[i] = 0.6 + Math.random() * 0.5;
    }
  };

  engine.position.y = -0.95;

  // --- Durum ---
  let theta = 0; // toplam krank açısı
  let progress = 0; // pin'li bölümdeki scroll ilerlemesi 0..1
  let rpm = 850;
  let running = false;
  let raf = 0;
  let last = performance.now();
  const firedAt = new Float32Array(4).fill(-1);

  function pose() {
    const t = theta;
    crank.rotation.x = t;
    const cycle = ((t % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
    cylinders.forEach((c, i) => {
      const a = t + PHASE[i];
      const pinY = R * Math.cos(a);
      const pinZ = R * Math.sin(a);
      const py = pinY + Math.sqrt(L * L - pinZ * pinZ);
      c.piston.position.set(c.x, py, 0);
      c.rod.position.set(c.x, pinY, pinZ);
      c.rod.rotation.x = Math.atan2(-pinZ, py - pinY);
      // Ateşlemeden sonra geçen açı (0..4π)
      const since = (((cycle - FIRE[i]) % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI);
      const heat = Math.exp(-since * 1.6);
      c.crownMat.emissiveIntensity = heat * 3.2;
      c.flash.material.opacity = heat * 0.95;
      c.headRing.material.opacity = 0.35 + heat * 0.65;
      if (since < 0.6 && firedAt[i] !== Math.floor((t - FIRE[i]) / (4 * Math.PI))) {
        firedAt[i] = Math.floor((t - FIRE[i]) / (4 * Math.PI));
        if (!reducedMotion) emit(c.x, R + L + 0.55, 6 + Math.min(10, (rpm - 850) / 400));
      }
    });
  }

  // Kamera yolu: yakından tek silindir → tüm motor → üst çeyrek görünüm.
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  const look = new THREE.Vector3();
  function placeCamera() {
    const portrait = camera.aspect < 0.9;
    const p = progress;
    const e = p * p * (3 - 2 * p);
    const dist = portrait ? 10.5 : 7.4;
    // Açı: yandan başla, 3/4'e dön
    const yaw = THREE.MathUtils.lerp(portrait ? 0.95 : 0.55, portrait ? 0.35 : -0.35, e);
    const pitch = THREE.MathUtils.lerp(0.12, 0.42, e);
    const d = THREE.MathUtils.lerp(dist * (portrait ? 0.78 : 0.72), dist, Math.min(1, e * 1.6));
    camFrom.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d + 0.2, Math.cos(yaw) * Math.cos(pitch) * d);
    look.set(THREE.MathUtils.lerp(portrait ? 0.4 : 1.3, 0, Math.min(1, e * 1.4)), portrait ? -0.75 : 0.15, 0);
    camTo.copy(camFrom);
    camera.position.copy(camTo);
    camera.lookAt(look);
    engine.rotation.y = portrait ? THREE.MathUtils.lerp(-0.15, -0.5, e) : 0;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 40 : 32;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Rölanti ~ 850 dev/dak; scroll hızıyla devir yükselir. Görsel hız gerçeğin çok altında tutulur.
    theta += dt * (rpm / 60) * 2 * Math.PI * 0.12;
    pose();
    for (let i = 0; i < SPARKS; i++) {
      if (sparkLife[i] <= 0) continue;
      sparkLife[i] -= dt;
      sparkVel[i * 3 + 1] -= 4.5 * dt;
      sparkPos[i * 3] += sparkVel[i * 3] * dt;
      sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      if (sparkLife[i] <= 0) sparkPos[i * 3 + 1] = -99;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    placeCamera();
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    setProgress(p) { progress = p; if (!running) { placeCamera(); renderer.render(scene, camera); } },
    setRpm(v) { rpm = v; },
    get rpm() { return rpm; },
    start() {
      if (running || reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    renderOnce() { theta = 0.9; pose(); placeCamera(); renderer.render(scene, camera); },
  };
}
