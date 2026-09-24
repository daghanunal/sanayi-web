// Duman Dili: çift krom egzoz ucu arkadan, tampon altından bakış. Uçlardan çıkan duman
// tamamen GPU'da (vertex shader) hesaplanır: renk, yoğunluk, itiş ve yayılma bölüm bölüm değişir.
// Finalde uçtan bir duman halkası kameraya doğru gelir. Durum dışarıdan `render(state)` ile verilir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TIP_Y = -0.42;
const TIP_X = 0.78;
const TIP_R = 0.3;

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

export function createScene(canvas, { lite = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  let dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1.1;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0xff3b5c, 18, 12, 1.6);
  rim.position.set(-2.5, 1.2, 1.8);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 0.35));

  // --- Araç: tampon, difüzör, iki krom uç ---
  const car = new THREE.Group();
  scene.add(car);
  // arka susturucu: fırçalanmış paslanmaz kutu + giriş borusu
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9bdc2, metalness: 1, roughness: 0.32 });
  const muffler = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.7, 1.5, 6, 0.3), steel);
  muffler.position.set(0, TIP_Y, -2.0);
  car.add(muffler);
  const inlet = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.9, TIP_Y + 0.05, -2.6), new THREE.Vector3(-1.0, TIP_Y + 0.1, -3.6),
    new THREE.Vector3(-1.6, TIP_Y + 0.35, -5.2), new THREE.Vector3(-1.8, TIP_Y + 0.5, -8),
  ]), 40, 0.17, 20, false), steel);
  car.add(inlet);
  const hanger = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
  hanger.position.set(1.0, TIP_Y + 0.45, -2.0);
  hanger.rotation.y = Math.PI / 2;
  car.add(hanger);

  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.14, side: THREE.DoubleSide });
  const prof = [];
  const L = 1.35;
  prof.push(new THREE.Vector2(TIP_R * 0.86, -L + 0.1));
  prof.push(new THREE.Vector2(TIP_R * 0.86, -0.05));
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    prof.push(new THREE.Vector2(TIP_R * 0.93 - Math.cos(a) * TIP_R * 0.07, Math.sin(a) * 0.05));
  }
  prof.push(new THREE.Vector2(TIP_R, -0.05));
  prof.push(new THREE.Vector2(TIP_R, -L));
  const tipGeo = new THREE.LatheGeometry(prof, lite ? 40 : 64);
  tipGeo.rotateX(Math.PI / 2);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const tips = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(sx * TIP_X, TIP_Y, 0);
    g.add(new THREE.Mesh(tipGeo, chrome));
    const core = new THREE.Mesh(new THREE.CircleGeometry(TIP_R * 0.86, 32), coreMat);
    core.position.z = -0.55;
    g.add(core);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(TIP_R * 0.84, 32), glowMat);
    glow.position.z = -0.5;
    g.add(glow);
    car.add(g);
    tips.push(g);
  }

  // --- Duman ---
  const tex = puffTexture();
  const N = lite ? 1100 : 2400;
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
  const RN = lite ? 380 : 700;
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
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    U.uScale.value = camera.projectionMatrix.elements[5] * H * dpr * 0.5;
    U.uMaxPx.value = H * dpr * (lite ? 0.45 : 0.6);
  }
  resize();

  const target = new THREE.Vector3();
  const tmpC = new THREE.Color();

  function render(s) {
    const portrait = W / H < 0.85;
    const dist = s.dist * (portrait ? 1.95 : 1.45);
    const az = s.az, el = s.el;
    target.set(s.lookX * (portrait ? 0.3 : 0.5) + (portrait ? 0 : 0.9), s.lookY + (portrait ? -0.55 : 0.1), 0);
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(target);
    camera.position.y += s.shiftY || 0; // kadrajı kaydır (yazıya yer aç)
    car.rotation.z = s.roll || 0;
    car.position.y = s.carY || 0;

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

  return { render, resize, setQuality };
}
