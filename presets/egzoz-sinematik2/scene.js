// Duman Dili (yalnız künye): gerçekçi bir sedanın (lib3d car_sedan) arka tamponu, altına lib3d egzoz hattı takılı,
// çift uç arkadan alçak açıdan. Stop lambaları yanık, gece HDRI yansımaları, zemine yumuşak gölge.
// Uçlardan çıkan duman tamamen GPU'da (vertex shader) hesaplanır: açılışta kısa bir patlama, sonra rölanti.
// Durum dışarıdan `render(state)` ile.
// Sahne birimi: gerçek ölçü × K (eski kadraj ve duman parametreleri bu ölçekte ayarlı).
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const TIP_Y = -0.42;
const TIP_X = 0.55;

function puffTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * s * 0.26;
    const x = s / 2 + Math.cos(a) * r;
    const y = s / 2 + Math.sin(a) * r;
    const rad = s * (0.06 + rnd() * 0.16);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(255,255,255,${0.12 + rnd() * 0.16})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
  }
  // kenarları yumuşat
  const img = g.getImageData(0, 0, s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (x - s / 2) / (s / 2), dy = (y - s / 2) / (s / 2);
    const f = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    const i = (y * s + x) * 4 + 3;
    img.data[i] = Math.min(255, img.data[i] * Math.min(1, f * 2.2) * 1.5);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const smokeVert = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime, uPush, uSpread, uSize, uScale, uCount, uLife, uRise, uWind, uBurst, uMaxPx;
  uniform vec3 uTipL, uTipR;
  varying float vAlpha, vRot, vShade;
  void main() {
    float life = uLife * (0.75 + aSeed.y * 0.5);
    float a = fract(uTime / life + aSeed.x);
    vec3 em = aSeed.w < 0.5 ? uTipL : uTipR;
    float ph = aSeed.y * 6.2831;
    vec3 p = em;
    float push = uPush * (1.0 + uBurst * 2.5);
    p.z += a * push * (1.25 - 0.45 * a);
    p.y += a * a * uRise;
    p.x += a * a * uWind + (em.x > 0.0 ? 1.0 : -1.0) * a * 0.25 * uSpread;
    vec2 r = (vec2(aSeed.y, aSeed.z) - 0.5) * 2.0;
    p.xy += r * a * (0.55 + uBurst * 2.0) * uSpread;
    p += vec3(sin(a * 5.0 + ph + uTime * 0.6), cos(a * 4.0 + ph * 1.3 + uTime * 0.5), sin(a * 3.0 + ph * 2.0)) * a * 0.35 * uSpread;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.1 + a * 1.05 * (0.6 + aSeed.z * 0.8)) * uSize * (1.0 + uBurst * 1.8);
    float px = size * uScale / max(0.2, -mv.z);
    gl_PointSize = min(px, uMaxPx);
    float alive = step(fract(aSeed.x * 7.13 + aSeed.z * 3.7), uCount);
    float fade = smoothstep(0.0, 0.07, a) * (1.0 - smoothstep(0.45, 1.0, a));
    float near = smoothstep(1.2, 3.5, -mv.z);
    vAlpha = fade * near * alive * (0.3 + 0.5 * aSeed.z);
    if (vAlpha < 0.002) gl_PointSize = 0.0;
    vRot = ph + a * (aSeed.z - 0.5) * 3.0;
    vShade = a;
  }
`;
const smokeFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uColor, uColor2;
  uniform float uDensity;
  varying float vAlpha, vRot, vShade;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    uv = mat2(c, -s, s, c) * uv + 0.5;
    float t = texture2D(uTex, uv).a;
    float light = clamp(1.0 - gl_PointCoord.y, 0.0, 1.0);
    vec3 col = mix(uColor2, uColor, clamp(vShade * 1.4, 0.0, 1.0));
    col *= 0.82 + 0.3 * light;
    float al = t * vAlpha * uDensity;
    if (al < 0.003) discard;
    gl_FragColor = vec4(col, al);
  }
`;

const ringVert = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uT, uTime, uScale, uMaxPx;
  uniform vec3 uOrigin;
  varying float vAlpha;
  void main() {
    float ang = aSeed.x * 6.2831;
    float R = 0.26 + uT * 1.9;
    float minor = 0.07 + uT * 0.22;
    float sw = aSeed.y * 6.2831 + uTime * 2.2 + uT * 9.0;
    vec3 c = uOrigin + vec3(0.0, uT * 0.7, uT * 5.2);
    float rr = R + cos(sw) * minor * aSeed.z;
    vec3 p = c + vec3(cos(ang) * rr, sin(ang) * rr, sin(sw) * minor * aSeed.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min((0.18 + uT * 0.45) * uScale / max(0.2, -mv.z), uMaxPx);
    vAlpha = smoothstep(0.0, 0.06, uT) * (1.0 - smoothstep(0.7, 1.0, uT)) * smoothstep(0.5, 1.8, -mv.z);
  }
`;
const ringFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vAlpha;
  void main() {
    float t = texture2D(uTex, gl_PointCoord).a;
    float al = t * vAlpha * uAlpha * 0.55;
    if (al < 0.003) discard;
    gl_FragColor = vec4(uColor, al);
  }
`;

export function createScene(canvas) {
  const q = pickQuality();
  const lite = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.75;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

  const K = 6; // sahne birimi / metre
  const key = new THREE.DirectionalLight(0xfff1e2, 2.4);
  key.position.set(4, 12, 9);
  key.target.position.set(0, -1.5, -4);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const rim = new THREE.PointLight(0xff3b5c, 18, 12, 1.6);
  rim.position.set(-2.5, 1.2, 1.8);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 0.3));

  // Zemin: yalnız gölge (arka plan CSS'teki afiş rengi)
  const GROUND = TIP_Y - 0.225 * K;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.26 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = GROUND;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- Araç: sedan arkası + egzoz hattı; arka +z'ye bakar, uçların ortası (0, TIP_Y, 0) ---
  const car = new THREE.Group();
  const bob = new THREE.Group(); // render() sallar; car kendi kaydırmasını korur
  bob.add(car);
  scene.add(bob);
  const rigCar = new THREE.Group();
  rigCar.scale.setScalar(K);
  rigCar.rotation.y = Math.PI / 2;
  car.add(rigCar);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const tipsWorld = [new THREE.Vector3(-0.55, TIP_Y, 0), new THREE.Vector3(0.55, TIP_Y, 0)];
  let ready = false;
  const readyP = (async () => {
    const [env, body, ex] = await Promise.all([
      loadEnv('studio', renderer, { quality: q }),
      loadAsset('car_sedan', { quality: q, renderer }),
      loadAsset('exhaust', { quality: q, renderer }),
    ]);
    scene.environment = env;
    const M = body.materials;
    if (M.paint) { M.paint.color.set('#3b4048'); M.paint.roughness = 0.26; M.paint.metalness = 0.75; }
    if (M.light_tail) { M.light_tail.emissive.set('#d0101f'); M.light_tail.emissiveIntensity = 1.1; }
    rigCar.add(body.scene);
    // egzoz: ucu tampon çizgisinin hemen içinde, gövdenin altında
    const exRoot = ex.scene;
    const tp = ex.nodes.tailpipe;
    // ikinci uç: susturucunun öbür ucuna aynalı kopya (çift çıkış)
    if (tp) {
      const twin = tp.clone(true);
      twin.position.z -= 0.19;
      tp.parent.add(twin);
    }
    exRoot.position.set(-2.375 + 1.958 + 0.07, 0.17, 0);
    rigCar.add(exRoot);
    scene.updateMatrixWorld(true);
    // uçların gerçek konumu → sahneyi uçların ortası (0, TIP_Y, 0) olacak şekilde kaydır
    const boxes = [];
    exRoot.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'chrome') boxes.push(new THREE.Box3().setFromObject(o)); });
    const cs = boxes.map((b) => b.getCenter(new THREE.Vector3()));
    const zs = boxes.map((b) => b.max.z);
    if (cs.length >= 2) {
      const mid = cs[0].clone().add(cs[1]).multiplyScalar(0.5);
      car.position.sub(new THREE.Vector3(mid.x, mid.y - TIP_Y, Math.max(...zs)));
      scene.updateMatrixWorld(true);
      cs.sort((a, b) => a.x - b.x).forEach((c, i) => tipsWorld[i].copy(c).add(car.position).setZ(0));
    }
    floor.position.y = GROUND;
    const bb = new THREE.Box3().setFromObject(body.scene);
    floor.position.y = bb.min.y + 0.002;
    // uçların içinde kor (DPF bölümünde yanar)
    for (const tw of tipsWorld) {
      const g = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), glowMat);
      g.position.copy(tw).add(new THREE.Vector3(0, 0, -0.35));
      scene.add(g);
    }
    U.uTipL.value.copy(tipsWorld[0]).setZ(0.05);
    U.uTipR.value.copy(tipsWorld[1]).setZ(0.05);
    RU.uOrigin.value.copy(tipsWorld[1]).setZ(0.1);
    ready = true;
  })();

  // --- Duman ---
  const tex = puffTexture();
  const N = lite ? 700 : 1600;
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = i % 2 ? 0.25 : 0.75;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  sGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const U = {
    uTime: { value: 0 }, uPush: { value: 2.4 }, uSpread: { value: 1 }, uSize: { value: 1 },
    uScale: { value: 400 }, uCount: { value: 1 }, uLife: { value: 3.4 }, uRise: { value: 1.2 },
    uWind: { value: 0.3 }, uBurst: { value: 0 }, uMaxPx: { value: 400 },
    uTipL: { value: new THREE.Vector3(-TIP_X, TIP_Y, 0.05) }, uTipR: { value: new THREE.Vector3(TIP_X, TIP_Y, 0.05) },
    uTex: { value: tex }, uColor: { value: new THREE.Color(0.9, 0.9, 0.9) }, uColor2: { value: new THREE.Color(0.9, 0.9, 0.9) },
    uDensity: { value: 0.5 },
  };
  const smoke = new THREE.Points(sGeo, new THREE.ShaderMaterial({
    uniforms: U, vertexShader: smokeVert, fragmentShader: smokeFrag,
    transparent: true, depthWrite: false, depthTest: true,
  }));
  smoke.frustumCulled = false;
  smoke.renderOrder = 2;
  scene.add(smoke);

  // --- Duman halkası ---
  const RN = 1; // halka kullanılmıyor (final sahnesi kaldırıldı); gölge yapı olarak kalır
  const rs = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) {
    rs[i * 3] = i / RN + Math.random() * 0.004;
    rs[i * 3 + 1] = Math.random();
    rs[i * 3 + 2] = Math.sqrt(Math.random());
  }
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 3), 3));
  rGeo.setAttribute('aSeed', new THREE.BufferAttribute(rs, 3));
  const RU = {
    uT: { value: 0 }, uTime: { value: 0 }, uScale: U.uScale, uMaxPx: U.uMaxPx,
    uOrigin: { value: new THREE.Vector3(TIP_X, TIP_Y, 0.1) }, uTex: { value: tex },
    uColor: { value: new THREE.Color(0.95, 0.95, 0.95) }, uAlpha: { value: 0 },
  };
  const ring = new THREE.Points(rGeo, new THREE.ShaderMaterial({
    uniforms: RU, vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false,
  }));
  ring.frustumCulled = false;
  ring.renderOrder = 3;
  scene.add(ring);

  // --- Boyut ---
  let W = 1, H = 1, compact = false;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Kısa/dar yatay ekranda (iPad yatay) araç biraz uzaklaşır ve kadrajın sağ üstüne kayar:
    // sol üstte gösterge, sol altta dev kelime, sağ altta bölüm kartı var.
    compact = W >= 900 && W / H >= 1 && (H <= 880 || W / H <= 1.45);
    if (compact) camera.setViewOffset(W, H, -W * 0.15, H * 0.12, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    U.uScale.value = camera.projectionMatrix.elements[5] * H * dpr * 0.5;
    U.uMaxPx.value = H * dpr * (lite ? 0.45 : 0.6);
  }
  resize();

  const target = new THREE.Vector3();
  const tmpC = new THREE.Color();

  function render(s) {
    const portrait = W / H < 0.85;
    const dist = s.dist * (portrait ? 3.7 : compact ? 4.1 : 3.2);
    const az = s.az, el = s.el;
    target.set(s.lookX * (portrait ? 0.3 : 0.5) + (portrait ? 0 : compact ? 0.5 : 1.9), s.lookY + (portrait ? -1.3 : 0.5), 0);
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(target);
    camera.position.y += s.shiftY || 0; // kadrajı kaydır (yazıya yer aç)
    bob.rotation.z = s.roll || 0;
    bob.position.y = s.carY || 0;

    U.uTime.value = s.time;
    U.uPush.value = s.push;
    U.uSpread.value = s.spread;
    U.uSize.value = s.size;
    U.uCount.value = s.count;
    U.uRise.value = s.rise;
    U.uWind.value = s.wind;
    U.uBurst.value = s.burst;
    U.uDensity.value = s.density;
    U.uColor.value.setRGB(...s.smoke);
    U.uColor2.value.setRGB(...(s.smoke2 || s.smoke));
    rim.color.setRGB(...s.rim);
    rim.intensity = s.rimI ?? 18;
    glowMat.opacity = s.glow || 0;
    tmpC.setRGB(...s.rim);

    RU.uT.value = s.ring;
    RU.uAlpha.value = s.ringAlpha;
    RU.uTime.value = s.time;
    ring.visible = s.ringAlpha > 0.01;
    smoke.visible = s.density > 0.005;

    renderer.render(scene, camera);
  }

  function setQuality(low) {
    dpr = Math.min(devicePixelRatio || 1, low ? 1 : lite ? 1.25 : 1.5);
    renderer.setPixelRatio(dpr);
    resize();
  }

  return { render, resize, setQuality, readyP, isReady: () => ready };
}
