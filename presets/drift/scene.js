// Kalıcı WebGL sahnesi: teker, lastik dumanı, kar, lastik oteli rafları, hız tüneli, fren izi.
// main.js her karede bir "poz" verir; sahne ona göre kamerayı ve efektleri ayarlar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createWheel } from './wheel.js';

const TAU = Math.PI * 2;

function softSprite(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
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

// Asfalt + iz dokusu
function asphaltTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1b1e';
  g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 26) | 0;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n + 2;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skidTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d');
  for (let x = 0; x < 512; x++) {
    const fade = Math.min(1, x / 60) * (0.55 + Math.random() * 0.25);
    g.fillStyle = `rgba(5,5,6,${fade})`;
    g.fillRect(x, 8 + Math.random() * 2, 1, 48 - Math.random() * 4);
  }
  // dış izler
  g.globalCompositeOperation = 'destination-out';
  for (let y = 14; y < 56; y += 7) {
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, y, 512, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createStage(canvas, { ad, olcu, since, lite, weak }) {
  const lowEnd = lite;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const maxDpr = weak ? 1 : 1.5;
  let dpr = Math.min(devicePixelRatio, maxDpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 120);

  // Işıklar: soğuk anahtar ışık + sıcak kontra ışık (fren ısısı)
  const key = new THREE.DirectionalLight('#dfe6ff', 2.2);
  key.position.set(3, 4, 5);
  const rim = new THREE.PointLight('#ff6a1a', 0, 6, 1.6);
  rim.position.set(-1.6, 0.4, -1.2);
  const fill = new THREE.HemisphereLight('#9aa7c0', '#1a1410', 0.5);
  const yellow = new THREE.PointLight('#ffc400', 1.4, 8, 1.8);
  yellow.position.set(2.4, -0.4, 1.6);
  scene.add(key, rim, fill, yellow);

  // --- Teker ---
  const wheel = createWheel({ ad, olcu, since, lowEnd });
  scene.add(wheel.root);

  // Disk ısı parlaması
  const glowTex = softSprite('rgba(255,120,40,1)', 'rgba(255,60,0,0)');
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0,
  }));
  glow.scale.setScalar(1.6);
  glow.position.z = -0.05;
  wheel.root.add(glow);

  // --- Zemin ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(), color: '#6d6f75', roughness: 0.62, metalness: 0.15 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.0;
  scene.add(ground);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.1),
    new THREE.MeshBasicMaterial({ map: softSprite('rgba(0,0,0,.85)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.995;
  scene.add(shadow);

  const skid = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 0.46),
    new THREE.MeshBasicMaterial({ map: skidTexture(), transparent: true, depthWrite: false, opacity: 0.9 })
  );
  skid.rotation.x = -Math.PI / 2;
  skid.position.y = -0.992;
  skid.visible = false;
  scene.add(skid);

  // --- Lastik dumanı ---
  const SMOKE = lowEnd ? 110 : 220;
  const smokeGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SMOKE * 3);
  const sSize = new Float32Array(SMOKE);
  const sAlpha = new Float32Array(SMOKE);
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute('size', new THREE.BufferAttribute(sSize, 1));
  smokeGeo.setAttribute('alpha', new THREE.BufferAttribute(sAlpha, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 300 }, uColor: { value: new THREE.Color('#d9d6d0') } },
    vertexShader: `
      attribute float size; attribute float alpha; varying float vA; uniform float uScale;
      void main() {
        vA = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA; uniform vec3 uColor;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * a * vA);
      }`,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  scene.add(smoke);
  const smokeLife = new Float32Array(SMOKE).fill(-1);
  const smokeVel = new Float32Array(SMOKE * 3);
  let smokeCursor = 0;
  let smokeAcc = 0;

  // --- Kar ---
  const SNOW = lowEnd ? 160 : 320;
  const snowGeo = new THREE.BufferGeometry();
  const nPos = new Float32Array(SNOW * 3);
  for (let i = 0; i < SNOW; i++) {
    nPos[i * 3] = (Math.random() - 0.5) * 5;
    nPos[i * 3 + 1] = Math.random() * 4 - 1.5;
    nPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  const snowMat = new THREE.PointsMaterial({
    map: softSprite(), size: 0.045, transparent: true, depthWrite: false, opacity: 0, color: '#e8f4ff',
  });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  // --- Lastik oteli: iki yanda raf koridoru ---
  const otel = new THREE.Group();
  otel.visible = false;
  scene.add(otel);
  const STEP = lowEnd ? 2.2 : 1.5;
  const COUNT = Math.floor(38 / STEP);
  const stacks = [];
  for (let side of [-1, 1]) {
    for (let i = 0; i < COUNT; i++) {
      for (const shelfY of [-0.95, 0.75]) {
        stacks.push({ x: side * 2.1, z: -4 - i * STEP, y: shelfY, h: 3 + ((i * 7 + (side > 0 ? 3 : 0)) % 3) });
      }
    }
  }
  const tiresTotal = stacks.reduce((a, s) => a + s.h, 0);
  const stackTire = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.34, 0.13, lowEnd ? 6 : 8, lowEnd ? 16 : 22).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.8 }),
    tiresTotal
  );
  let k = 0;
  const m = new THREE.Matrix4();
  for (const s of stacks) {
    for (let j = 0; j < s.h; j++) {
      m.makeRotationY(Math.random() * TAU);
      m.setPosition(s.x + (Math.random() - 0.5) * 0.04, s.y + 0.14 + j * 0.27, s.z);
      stackTire.setMatrixAt(k++, m);
    }
  }
  otel.add(stackTire);
  // Raf dikmeleri ve rafları (sarı çelik)
  const frameMat = new THREE.MeshStandardMaterial({ color: '#ffd000', roughness: 0.5, metalness: 0.3 });
  const postCount = Math.ceil(COUNT / 2) + 1;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 3.6, 0.07), frameMat, postCount * 4);
  k = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < postCount; i++) {
      const z = -4 + STEP * 0.5 - i * STEP * 2;
      for (const dx of [-0.45, 0.45]) {
        m.makeTranslation(side * 2.1 + dx, 0.6, z);
        posts.setMatrixAt(k++, m);
      }
    }
  }
  otel.add(posts);
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.7 }), 4);
  k = 0;
  for (const side of [-1, 1]) {
    for (const y of [-0.97, 0.73]) {
      m.makeTranslation(side * 2.1, y, -22);
      boards.setMatrixAt(k++, m);
    }
  }
  otel.add(boards);
  // Plaka etiketleri: her yığında küçük sarı etiket
  const tags = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.22, 0.08),
    new THREE.MeshBasicMaterial({ color: '#ffe46b' }),
    stacks.length
  );
  stacks.forEach((s, i) => {
    m.makeRotationY(s.x > 0 ? -Math.PI / 2 : Math.PI / 2);
    m.setPosition(s.x - Math.sign(s.x) * 0.5, s.y + 0.2, s.z);
    tags.setMatrixAt(i, m);
  });
  otel.add(tags);
  // Tavan ışık bantları
  const strips = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.16, 2.2),
    new THREE.MeshBasicMaterial({ color: '#fff4d6' }),
    COUNT
  );
  for (let i = 0; i < COUNT; i++) {
    m.makeRotationX(Math.PI / 2);
    m.setPosition(0, 2.6, -4 - i * STEP * 1.2);
    strips.setMatrixAt(i, m);
  }
  otel.add(strips);
  const otelFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 50), new THREE.MeshStandardMaterial({ color: '#202126', roughness: 0.35, metalness: 0.2 }));
  otelFloor.rotation.x = -Math.PI / 2;
  otelFloor.position.set(0, -1, -22);
  otel.add(otelFloor);
  const laneLine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 50), new THREE.MeshBasicMaterial({ color: '#ffd000' }));
  laneLine.rotation.x = -Math.PI / 2;
  laneLine.position.set(0, -0.99, -22);
  otel.add(laneLine);

  // --- Hız tüneli ---
  const TUN = lowEnd ? 140 : 260;
  const tunnel = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.018, 0.018, 1),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    TUN
  );
  const tunData = [];
  const yellowC = new THREE.Color('#ffd000');
  const whiteC = new THREE.Color('#dfe8ff');
  const hotC = new THREE.Color('#ff5a1f');
  for (let i = 0; i < TUN; i++) {
    const a = Math.random() * TAU;
    const r = 1.2 + Math.random() * 2.6;
    tunData.push({ a, r, z: -Math.random() * 60, len: 0.6 + Math.random() * 2.4 });
    tunnel.setColorAt(i, i % 5 === 0 ? yellowC : i % 11 === 0 ? hotC : whiteC);
  }
  tunnel.visible = false;
  tunnel.frustumCulled = false;
  scene.add(tunnel);

  // --- Durum ---
  const tmpV = new THREE.Vector3();
  const camPos = new THREE.Vector3(0, 0, 6);
  const camTarget = new THREE.Vector3();
  let width = 1, height = 1;
  let spinAngle = 0;
  let viewOffset = [0, 0];
  let tunnelZ = 0;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyViewOffset();
  }
  function applyViewOffset() {
    const [ox, oy] = viewOffset;
    camera.setViewOffset(width, height, -ox * width, -oy * height, width, height);
  }

  // Performans: kare süresi yüksekse çözünürlüğü düşür
  let frameAcc = 0, frameN = 0;
  function adapt(dt) {
    frameAcc += dt;
    frameN++;
    if (frameN >= 40) {
      const avg = frameAcc / frameN;
      if (avg > 1 / 38 && dpr > 0.75) {
        dpr = Math.max(0.75, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        resize();
      }
      frameAcc = 0;
      frameN = 0;
    }
  }

  function emitSmoke(amount, dt, origin) {
    smokeAcc += amount * dt * (lowEnd ? 55 : 110);
    while (smokeAcc > 1) {
      smokeAcc -= 1;
      const i = smokeCursor;
      smokeCursor = (smokeCursor + 1) % SMOKE;
      smokeLife[i] = 0;
      sPos[i * 3] = origin.x + (Math.random() - 0.5) * 0.2;
      sPos[i * 3 + 1] = origin.y + Math.random() * 0.05;
      sPos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.4;
      smokeVel[i * 3] = -(0.8 + Math.random() * 1.6);
      smokeVel[i * 3 + 1] = 0.25 + Math.random() * 0.6;
      smokeVel[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    }
  }
  function updateSmoke(dt) {
    let any = false;
    for (let i = 0; i < SMOKE; i++) {
      if (smokeLife[i] < 0) {
        sAlpha[i] = 0;
        continue;
      }
      any = true;
      smokeLife[i] += dt / 2.6;
      const life = smokeLife[i];
      if (life >= 1) {
        smokeLife[i] = -1;
        sAlpha[i] = 0;
        continue;
      }
      smokeVel[i * 3] *= 1 - dt * 0.9;
      smokeVel[i * 3 + 1] *= 1 - dt * 0.4;
      sPos[i * 3] += smokeVel[i * 3] * dt;
      sPos[i * 3 + 1] += smokeVel[i * 3 + 1] * dt;
      sPos[i * 3 + 2] += smokeVel[i * 3 + 2] * dt;
      sSize[i] = 0.7 + life * 3.6;
      sAlpha[i] = Math.sin(Math.min(1, life * 4) * Math.PI * 0.5) * (1 - life) * 0.32;
    }
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.size.needsUpdate = true;
    smokeGeo.attributes.alpha.needsUpdate = true;
    smoke.visible = any;
  }

  function updateSnow(amount, dt) {
    snow.visible = amount > 0.01;
    snowMat.opacity = amount * 0.9;
    if (!snow.visible) return;
    for (let i = 0; i < SNOW; i++) {
      nPos[i * 3 + 1] -= dt * (0.25 + (i % 7) * 0.05);
      nPos[i * 3] += Math.sin(performance.now() * 0.0005 + i) * dt * 0.08;
      if (nPos[i * 3 + 1] < -1) nPos[i * 3 + 1] = 2.5;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }

  function updateTunnel(amount, speed, dt) {
    tunnel.visible = amount > 0.01;
    if (!tunnel.visible) return;
    tunnelZ += dt * speed;
    tunnel.material.opacity = amount;
    for (let i = 0; i < TUN; i++) {
      const t = tunData[i];
      const z = ((((t.z + tunnelZ) % 60) + 60) % 60) - 55;
      const stretch = t.len * (1 + speed * 0.12);
      m.makeScale(1, 1, stretch);
      m.setPosition(Math.cos(t.a) * t.r, Math.sin(t.a) * t.r, z);
      tunnel.setMatrixAt(i, m);
    }
    tunnel.instanceMatrix.needsUpdate = true;
  }

  // Poz uygulama
  let labelEls = null;
  const project = (v) => {
    tmpV.copy(v).project(camera);
    return [(tmpV.x * 0.5 + 0.5) * width, (-tmpV.y * 0.5 + 0.5) * height, tmpV.z];
  };

  function render(p, dt) {
    adapt(dt);
    // Kamera: mobil dikey ekranda uzaklaş
    const portrait = width / height < 0.8;
    const fit = portrait ? p.fitPortrait ?? 1.75 : 1;
    camTarget.fromArray(p.target);
    camPos.fromArray(p.cam).sub(camTarget).multiplyScalar(fit).add(camTarget);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    camera.rotation.z += p.roll ?? 0;
    const off = portrait ? p.offPortrait ?? [0, 0.14] : p.off ?? [0, 0];
    if (off[0] !== viewOffset[0] || off[1] !== viewOffset[1]) {
      viewOffset = off;
      applyViewOffset();
    }

    // Teker
    const showWheel = p.mode !== 'otel' && p.mode !== 'tunnel';
    wheel.root.visible = showWheel;
    ground.visible = showWheel;
    shadow.visible = showWheel;
    otel.visible = p.mode === 'otel';
    scene.fog = p.mode === 'otel' ? otelFog : p.mode === 'tunnel' ? null : wheelFog;

    wheel.root.position.set(p.wheelX ?? 0, p.wheelY ?? 0, 0);
    wheel.root.rotation.set(p.tiltX ?? 0, p.yaw ?? 0, 0);
    spinAngle += (p.spin ?? 0) * dt;
    const angle = p.rollAngle != null ? p.rollAngle : spinAngle;
    wheel.spin.rotation.z = -angle;
    // Balans yalpası
    const wob = p.wobble ?? 0;
    if (wob > 0) {
      wheel.spin.rotation.x = Math.sin(angle) * wob * 0.09;
      wheel.spin.rotation.y = Math.cos(angle) * wob * 0.09;
      wheel.root.position.y += Math.sin(angle * 2) * wob * 0.02;
    } else {
      wheel.spin.rotation.x = wheel.spin.rotation.y = 0;
    }
    wheel.setExplode(p.explode ?? 0);
    wheel.setTread(p.tread ?? 0);
    wheel.setWeights(p.weights ?? 0);
    wheel.setHeat(p.heat ?? 0);
    glow.material.opacity = (p.heat ?? 0) * 0.85;
    rim.intensity = (p.heat ?? 0) * 6;
    shadow.position.x = wheel.root.position.x;
    shadow.scale.setScalar(1 - Math.min(0.6, Math.max(0, wheel.root.position.y) * 0.25));

    // Duman: temas noktasından
    if ((p.smoke ?? 0) > 0 && showWheel) {
      tmpV.set(wheel.root.position.x + 0.2, -0.95, 0);
      emitSmoke(p.smoke, dt, tmpV);
    }
    updateSmoke(dt);
    updateSnow(p.snow ?? 0, dt);
    updateTunnel(p.tunnel ?? 0, p.tunnelSpeed ?? 8, dt);

    // Fren izi
    const sk = p.skid ?? 0;
    skid.visible = sk > 0.001 && showWheel;
    if (skid.visible) {
      const len = sk * (p.skidLen ?? 6);
      skid.scale.x = Math.max(0.01, len);
      skid.position.x = (p.skidFrom ?? 0) - len / 2;
      skid.material.opacity = Math.min(1, sk * 3) * 0.9;
    }

    renderer.render(scene, camera);

    // Parça etiketleri
    if (p.labels && labelEls) {
      for (const [id, el] of labelEls) {
        const part = wheel.anchors[id];
        if (!part) continue;
        // Etiket parçanın patlatma ofsetini izler ama tekerin dönüşünü izlemez
        const obj = id === 'lastik' ? wheel.parts.tire : id === 'jant' || id === 'sibop' ? wheel.parts.rim
          : id === 'bijon' ? wheel.parts.nuts : id === 'disk' ? wheel.parts.disc : wheel.caliper;
        tmpV.copy(part).add(obj.position).applyMatrix4(wheel.root.matrixWorld);
        let [x, y] = project(tmpV);
        x = Math.min(width - 14, Math.max(14, x));
        el.classList.toggle('is-left', x > width * 0.6);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
    }
  }
  const otelFog = new THREE.Fog('#0f1013', 6, 26);
  const wheelFog = new THREE.Fog('#121316', 6.5, 15);

  resize();
  return {
    renderer, scene, camera, wheel, render, resize,
    setLabels: (map) => (labelEls = map),
    get dpr() { return dpr; },
  };
}
