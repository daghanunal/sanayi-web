// Bobin: kaydırmayla sarılan bakır bobin sahnesi.
// Tek sahne: gövde (saç paketli nüve + iki flanş), üzerine katman katman sarılan emaye bakır tel,
// besleme teli, bobinin manyetik alan çizgileri ve bu çizgilerde akan parçacıklar.
// Dışarıya: createCoil(canvas, opts) → { S, start(), stop(), resize(), warm() }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---------------------------------------------------------------- bobin geometrisi

const CORE_R = 0.5;
const CORE_L = 2.4;
const WIRE = 0.043; // tel yarıçapı
const LAYERS = 6;
const TURNS = Math.floor(CORE_L / (WIRE * 2.02)); // katman başına sarım

class WindingCurve extends THREE.Curve {
  constructor() {
    super();
    this.total = TURNS * LAYERS;
  }
  getPoint(t, out = new THREE.Vector3()) {
    const u = t * this.total;
    const layer = Math.min(LAYERS - 1, Math.floor(u / TURNS));
    const f = (u - layer * TURNS) / TURNS;
    const half = CORE_L / 2 - WIRE * 1.1;
    const x = layer % 2 === 0 ? lerp(-half, half, f) : lerp(half, -half, f);
    // katman sonunda bir üst katmana yumuşak geçiş
    const rise = clamp01((f - 0.965) / 0.035);
    const r = CORE_R + WIRE + (layer + rise * (layer < LAYERS - 1 ? 1 : 0)) * WIRE * 1.86;
    const a = u * Math.PI * 2;
    return out.set(x, r * Math.cos(a), r * Math.sin(a));
  }
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------- alan çizgileri

// Solenoid dipol alanı: r = s·sin²θ, eksen X. Çizgi, dış yay + nüvenin içinden dönüş.
function fieldLine(s, phi, n) {
  const pts = [];
  const th0 = Math.asin(Math.cbrt(0.28 / s));
  const outer = Math.floor(n * 0.82);
  for (let i = 0; i <= outer; i++) {
    const th = lerp(th0, Math.PI - th0, i / outer);
    const r = s * Math.sin(th) ** 2;
    const ax = r * Math.cos(th);
    const rho = r * Math.sin(th);
    pts.push(new THREE.Vector3(ax, rho * Math.cos(phi), rho * Math.sin(phi)));
  }
  const a = pts[pts.length - 1];
  const b = pts[0];
  const inner = n - outer;
  for (let i = 1; i < inner; i++) pts.push(new THREE.Vector3().lerpVectors(a, b, i / inner));
  pts.push(b.clone());
  return pts;
}

// ---------------------------------------------------------------- sahne

export function createCoil(canvas, { low = false, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  scene.fog = new THREE.Fog(0x071816, 7, 16);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);

  // Işıklar: sıcak üst ışık + patina yeşili arka kontur
  const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5fe0c0, 3.2);
  rim.position.set(-3, 1.5, -4);
  scene.add(rim);
  const glow = new THREE.PointLight(0xff8a3a, 0, 6, 1.6);
  glow.position.set(0, 0, 1.6);
  scene.add(glow);

  const rig = new THREE.Group(); // bobini ekrana göre kaydırmak için
  scene.add(rig);
  const coil = new THREE.Group();
  rig.add(coil);

  // --- Nüve: saç paketi (enine ince çizgiler)
  const lamTex = canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = '#4b5052';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) {
      const v = 60 + Math.random() * 40;
      g.fillStyle = `rgb(${v},${v + 4},${v + 4})`;
      g.fillRect(x, 0, 3, h);
    }
  });
  lamTex.repeat.set(1, 1);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(CORE_R, CORE_R, CORE_L + 0.5, 48, 1, false),
    new THREE.MeshStandardMaterial({ color: 0x9aa2a4, map: lamTex, metalness: 0.9, roughness: 0.45 })
  );
  core.rotation.z = Math.PI / 2;
  coil.add(core);
  // nüve alnı (uçlarda görünen saç kesiti)
  const faceTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3c4143';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,170,172,.5)';
    for (let y = 0; y < h; y += 5) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  });

  // --- Flanşlar: koyu bakalit
  const bakalit = new THREE.MeshStandardMaterial({ color: 0x2a1610, metalness: 0.1, roughness: 0.42 });
  const flangeGeo = new THREE.CylinderGeometry(1.18, 1.18, 0.07, 64);
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(flangeGeo, bakalit);
    f.rotation.z = Math.PI / 2;
    f.position.x = sx * (CORE_L / 2 + 0.035);
    coil.add(f);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(CORE_R * 0.98, 40),
      new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.8, roughness: 0.5 })
    );
    face.position.x = sx * (CORE_L / 2 + 0.25 + 0.001);
    face.rotation.y = sx * Math.PI / 2;
    coil.add(face);
  }

  // --- Sargı teli
  const curve = new WindingCurve();
  const segPerTurn = low ? 18 : 26;
  const segments = curve.total * segPerTurn;
  const radial = low ? 5 : 7;
  const wireGeo = new THREE.TubeGeometry(curve, segments, WIRE, radial, false);
  const idxPerSeg = radial * 6;
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xd07a45, metalness: 1, roughness: 0.26, emissive: 0x000000 });
  const wu = {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uHeat: { value: 0 },
    uFault: { value: 0 },
    uHead: { value: 0 },
  };
  wireMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wu);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vAlong;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAlong = uv.x;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vAlong; uniform float uTime, uPulse, uHeat, uFault, uHead;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // akım darbeleri: telin boyunca akan sıcak ışık
        float k = fract(vAlong * 9.0 - uTime * 0.35);
        float pulse = smoothstep(0.0, 0.02, k) * (1.0 - smoothstep(0.02, 0.09, k));
        vec3 hot = vec3(1.0, 0.55, 0.2);
        totalEmissiveRadiance += hot * pulse * uPulse * 2.4;
        // ısınma: tüm sargı kor gibi
        totalEmissiveRadiance += vec3(1.0, 0.32, 0.08) * uHeat * (0.55 + 0.3 * sin(vAlong * 180.0 + uTime * 3.0));
        // arıza: bir bölgede kırmızı sıcak nokta
        float spot = exp(-pow((vAlong - 0.62) * 40.0, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.08, 0.05) * spot * uFault * (0.7 + 0.3 * sin(uTime * 14.0));
        // sarılan telin ucu parlar
        float tip = exp(-pow((vAlong - uHead) * 260.0, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.7, 0.4) * tip * 1.6;`
      );
  };
  const wire = new THREE.Mesh(wireGeo, wireMat);
  coil.add(wire);

  // --- Besleme teli (ucu takip eden düz tel)
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(WIRE * 0.9, WIRE * 0.9, 1, 8, 1, true), wireMat);
  rig.add(feed);
  const feedFrom = new THREE.Vector3(0, 6, 1.2);
  const head = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // --- Terminal pabuçları
  const lugMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.2), lugMat);
    lug.position.set(sx * (CORE_L / 2 + 0.035), 1.3, 0);
    coil.add(lug);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 20), lugMat);
    ring.position.set(sx * (CORE_L / 2 + 0.035), 1.52, 0);
    ring.rotation.y = Math.PI / 2;
    coil.add(ring);
  }

  // --- Alan çizgileri
  const scales = low ? [1.9, 2.8, 4.0] : [1.7, 2.35, 3.1, 4.2];
  const phis = low ? 8 : 12;
  const N = 140;
  const lines = [];
  const lineMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uChaos: { value: 0 },
      uCalm: { value: new THREE.Color(0x5fe0c0) },
      uBad: { value: new THREE.Color(0xff4a2a) },
    },
    vertexShader: `
      attribute float along; attribute float seed;
      uniform float uTime, uChaos;
      varying float vAlong; varying float vSeed;
      void main(){
        vAlong = along; vSeed = seed;
        vec3 p = position;
        float j = sin(along * 90.0 + uTime * 11.0 + seed * 7.0) * sin(along * 37.0 - uTime * 6.0);
        p += normalize(p + vec3(0.001)) * j * 0.34 * uChaos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uAlpha, uChaos; uniform vec3 uCalm, uBad;
      varying float vAlong; varying float vSeed;
      void main(){
        float dash = smoothstep(0.55, 1.0, fract(vAlong * 14.0 - uTime * 0.5 + vSeed));
        float flick = mix(1.0, step(0.35, fract(sin(floor(uTime * 18.0) + vSeed * 91.0) * 43758.5)), uChaos);
        vec3 c = mix(uCalm, uBad, uChaos);
        gl_FragColor = vec4(c, (0.22 + dash * 0.9) * uAlpha * flick * (1.0 + uChaos * 0.6));
      }`,
  });
  const fieldGroup = new THREE.Group();
  coil.add(fieldGroup);
  scales.forEach((s, si) => {
    for (let k = 0; k < phis; k++) {
      const phi = (k / phis) * Math.PI * 2 + si * 0.21;
      const pts = fieldLine(s, phi, N);
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const along = new Float32Array(pts.length).map((_, i) => i / (pts.length - 1));
      g.setAttribute('along', new THREE.BufferAttribute(along, 1));
      g.setAttribute('seed', new THREE.BufferAttribute(new Float32Array(pts.length).fill(Math.random()), 1));
      fieldGroup.add(new THREE.Line(g, lineMat));
      lines.push(pts);
    }
  });

  // --- Alan çizgilerinde akan parçacıklar (CPU'da örneklenir, sayı az)
  const PN = low ? 260 : 620;
  const pPos = new Float32Array(PN * 3);
  const pData = Array.from({ length: PN }, () => ({
    line: Math.floor(Math.random() * lines.length),
    t: Math.random(),
    v: 0.05 + Math.random() * 0.07,
  }));
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pSize = new Float32Array(PN).map(() => 0.6 + Math.random() * 0.9);
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  const dotMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAlpha: { value: 0 },
      uChaos: { value: 0 },
      uPx: { value: 1 },
      uCalm: { value: new THREE.Color(0x9ff5dc) },
      uBad: { value: new THREE.Color(0xff6a3a) },
    },
    vertexShader: `
      attribute float size; uniform float uPx;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPx * 40.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uAlpha, uChaos; uniform vec3 uCalm, uBad;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(mix(uCalm, uBad, uChaos), a * a * uAlpha);
      }`,
  });
  const dots = new THREE.Points(pGeo, dotMat);
  dots.frustumCulled = false;
  coil.add(dots);

  // --- Havada toz
  const DN = low ? 160 : 360;
  const dPos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 14;
    dPos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(DN).map(() => 0.3 + Math.random() * 0.6), 1));
  const dustMat = dotMat.clone();
  dustMat.uniforms.uCalm.value = new THREE.Color(0xffc9a0);
  dustMat.uniforms.uAlpha.value = 0.35;
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---------------------------------------------------------------- durum
  // Tüm değerleri main.js kaydırmaya göre yazar; sahne her karede yumuşatarak uygular.
  const S = {
    wind: 0, // 0..1 sarım
    field: 0, // alan görünürlüğü
    chaos: 0, // arıza (alan bozuk)
    pulse: 0, // akım darbeleri
    heat: 0, // kor
    fault: 0, // sargıda sıcak nokta
    spin: 0.12, // bobin dönüş hızı
    camR: 7, camYaw: 0.55, camPitch: 0.22, // küresel kamera
    tx: 0, ty: 0, tz: 0, // bakılan nokta
    vx: 0, vy: 0, // bobini ekranda kaydır (ekran oranı)
    roll: 0,
    fov: 34,
    dim: 1,
  };
  const C = { ...S }; // yumuşatılmış kopya
  const SMOOTH = ['field', 'chaos', 'pulse', 'heat', 'fault', 'camR', 'camYaw', 'camPitch', 'tx', 'ty', 'tz', 'vx', 'vy', 'roll', 'fov', 'dim', 'spin'];

  let W = 1, H = 1, px = 1;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    px = Math.min(devicePixelRatio || 1, low ? 1.25 : 1.5);
    renderer.setPixelRatio(px);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    dotMat.uniforms.uPx.value = px * (H / 900) * 1.4 + 0.4;
    dustMat.uniforms.uPx.value = dotMat.uniforms.uPx.value;
  }

  const clock = new THREE.Clock();
  let t = 0;
  let spinA = 0;
  let running = false;
  let raf = 0;

  function step(dt) {
    t += reduced ? dt * 0.3 : dt;
    const k = 1 - Math.pow(0.0015, dt); // kare hızından bağımsız yumuşatma
    for (const p of SMOOTH) C[p] = dt === 0 ? S[p] : lerp(C[p], S[p], k);
    C.wind = dt === 0 ? S.wind : lerp(C.wind, S.wind, 1 - Math.pow(0.0004, dt));

    // Sargı: çizim aralığı
    const w = clamp01(C.wind);
    const segs = Math.max(0, Math.floor(w * segments));
    wireGeo.setDrawRange(0, segs * idxPerSeg);
    wu.uTime.value = t;
    wu.uPulse.value = C.pulse;
    wu.uHeat.value = C.heat;
    wu.uFault.value = C.fault;
    wu.uHead.value = w < 0.999 ? w : -1;

    // Bobin sarma tezgâhındaki gibi döner: telin ucu hep üstte, beslemeye bakar.
    // Sarım bitince yavaş boşta dönüş.
    const u = w * curve.total;
    if (w >= 0.999) spinA += dt * C.spin;
    coil.rotation.x = 0.35 - u * Math.PI * 2 + spinA;
    coil.rotation.z = C.roll;

    // Besleme teli: yukarıdan sargının son noktasına iner
    const showFeed = w > 0.002 && w < 0.998;
    feed.visible = showFeed;
    if (showFeed) {
      curve.getPoint(w, head);
      coil.updateMatrix();
      head.applyMatrix4(coil.matrix);
      tmpV.set(head.x * 0.6, feedFrom.y, feedFrom.z);
      const len = head.distanceTo(tmpV);
      feed.position.lerpVectors(head, tmpV, 0.5);
      feed.scale.set(1, len, 1);
      feed.quaternion.setFromUnitVectors(up, tmpV.sub(head).normalize());
    }

    // Alan
    lineMat.uniforms.uTime.value = t;
    lineMat.uniforms.uAlpha.value = C.field;
    lineMat.uniforms.uChaos.value = C.chaos;
    dotMat.uniforms.uAlpha.value = C.field * 0.95;
    dotMat.uniforms.uChaos.value = C.chaos;
    fieldGroup.visible = dots.visible = C.field > 0.01;
    if (dots.visible) {
      const speed = 1 + C.chaos * 1.5;
      for (let i = 0; i < PN; i++) {
        const q = pData[i];
        q.t = (q.t + dt * q.v * speed) % 1;
        const L = lines[q.line];
        const f = q.t * (L.length - 1);
        const i0 = Math.floor(f);
        const a = L[i0], b = L[Math.min(L.length - 1, i0 + 1)];
        const u = f - i0;
        let x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = a.z + (b.z - a.z) * u;
        if (C.chaos > 0.02) {
          const j = C.chaos * 0.25;
          x += (Math.random() - 0.5) * j;
          y += (Math.random() - 0.5) * j;
          z += (Math.random() - 0.5) * j;
        }
        pPos[i * 3] = x;
        pPos[i * 3 + 1] = y;
        pPos[i * 3 + 2] = z;
      }
      pGeo.attributes.position.needsUpdate = true;
    }

    // Toz yavaşça süzülür
    dust.rotation.y = t * 0.01;
    dust.position.y = Math.sin(t * 0.2) * 0.1;

    // Işık
    glow.intensity = (C.heat * 9 + C.pulse * 1.2 + C.fault * 3) * C.dim;
    glow.color.setHex(C.fault > 0.5 ? 0xff3a20 : 0xff8a3a);
    scene.environmentIntensity = 0.85 * C.dim;
    key.intensity = 2.4 * C.dim;
    rim.intensity = 3.2 * C.dim;

    // Kamera
    const cp = Math.cos(C.camPitch);
    // dikey ekranda yatay görüş dar: bobin sığsın diye kamera geri çekilir
    const fit = Math.max(1, 0.86 / camera.aspect);
    const R = C.camR * fit;
    scene.fog.near = 7 * fit;
    scene.fog.far = 16 * fit;
    camera.position.set(
      C.tx + R * Math.sin(C.camYaw) * cp,
      C.ty + R * Math.sin(C.camPitch),
      C.tz + R * Math.cos(C.camYaw) * cp
    );
    camera.setViewOffset(W, H, -C.vx * W, C.vy * H, W, H);
    camera.lookAt(C.tx, C.ty, C.tz);
    camera.fov = C.fov;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    step(Math.min(clock.getDelta(), 1 / 20));
  }

  resize();
  return {
    S,
    resize,
    start() {
      if (running) return;
      running = true;
      clock.getDelta();
      loop();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    warm() {
      renderer.compile(scene, camera);
      step(0);
    },
    snap() {
      Object.assign(C, S);
    },
  };
}
