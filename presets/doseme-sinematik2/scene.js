// Örtü: tek kalıcı WebGL sahnesi. Kobalt boşlukta asılı tek bir kumaş parçası.
// Kumaş rüzgârda dalgalanır; tebeşirle kalıp çizilir, makasla kesilir, pembe iplikle dikilir,
// gerilip dolgulanır; sonra kumaş → alcantara → nappa → kapitone olarak dönüşür.
// Finalde örtü, altındaki çağrıyı açarak uçar. main.js her karede bir "poz" verir.
import * as THREE from 'three';

const W = 3.2;
const H = 4.0;

const COMMON = /* glsl */ `
  // Koltuk sırtı kalıbı: üstte biraz genişleyen, köşeleri yuvarlak panel
  float sdPanel(vec2 p) {
    float hw = mix(0.98, 1.16, smoothstep(-1.7, 1.7, p.y));
    float hh = 1.72;
    float r = 0.5;
    vec2 q = vec2(abs(p.x) - (hw - r), abs(p.y) - (hh - r));
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  // Kalıp çevresinde tepeden saat yönüne 0..1
  float around(vec2 p) {
    return fract(0.25 - atan(p.y, p.x) / 6.2831853);
  }
  // Malzeme geçişi: çapraz bir dikiş cephesi aşağıdan yukarı süpürür
  void matMix(vec2 uv, float m, out float i0, out float i1, out float w, out float front) {
    i0 = floor(clamp(m, 0.0, 2.999));
    i1 = min(i0 + 1.0, 3.0);
    float f = clamp(m - i0, 0.0, 1.0);
    float s = uv.y * 0.72 + uv.x * 0.28;
    float edge = f * 1.3 - 0.15;
    w = smoothstep(s - 0.05, s + 0.05, edge);
    front = (f > 0.001 && f < 0.999) ? exp(-pow((s - edge) / 0.018, 2.0)) : 0.0;
  }
`;

const VERT = /* glsl */ `
  uniform float uTime, uWind, uFold, uPuff, uMat, uFly;
  varying vec2 vP;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vView;
  varying float vZ;
  ${COMMON}

  float quiltAmt(vec2 uv) {
    float i0, i1, w, fr;
    matMix(uv, uMat, i0, i1, w, fr);
    return (i0 > 2.5 ? 1.0 : 0.0) + (i1 > 2.5 && i0 < 2.5 ? w : 0.0);
  }

  vec3 disp(vec2 p, vec2 uv) {
    float t = uTime;
    float hang = 0.25 + 0.75 * smoothstep(2.0, -2.0, p.y);
    float wv = 0.20 * sin(p.x * 1.25 + t * 1.05 + p.y * 0.55)
             + 0.13 * sin(p.y * 2.05 - t * 1.55 + p.x * 0.85)
             + 0.05 * sin(p.x * 3.9 + p.y * 3.1 + t * 2.4);
    float z = uWind * wv * hang;
    z += uFold * 0.11 * sin(p.x * 5.2 + 0.9 * sin(p.y * 0.8 + t * 0.4)) * (0.35 + 0.65 * smoothstep(1.8, -2.0, p.y));
    float d = sdPanel(p);
    float inner = clamp(-d / 0.55, 0.0, 1.0);
    z += uPuff * (0.2 * (1.0 - pow(1.0 - inner, 2.0)) + 0.08 * inner * (1.0 - p.x * p.x * 0.6));
    float qa = quiltAmt(uv) * uPuff;
    if (qa > 0.0) {
      vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p / 0.36;
      vec2 f = fract(q) - 0.5;
      float cell = clamp(1.0 - 2.0 * max(abs(f.x), abs(f.y)), 0.0, 1.0);
      z += qa * 0.075 * sqrt(cell) * smoothstep(-0.14, -0.32, d);
    }
    vec3 pos = vec3(p, z);
    if (uFly > 0.0) {
      float along = (p.x / ${W.toFixed(1)} + 0.5) * 0.55 + (0.5 - p.y / ${H.toFixed(1)}) * 0.45;
      float k = clamp(uFly * 1.9 - (1.0 - along) * 0.9, 0.0, 1.0);
      float ks = k * k * (3.0 - 2.0 * k);
      pos.y += ks * ks * 7.0;
      pos.z += sin(ks * 3.1416) * 1.6;
      pos.x -= ks * 1.4;
      pos.z += 0.35 * sin(p.x * 2.2 + p.y * 1.7 + t * 4.0) * k;
    }
    return pos;
  }

  void main() {
    vec2 p = position.xy;
    vec3 pos = disp(p, uv);
    float e = 0.012;
    vec3 px = disp(p + vec2(e, 0.0), uv + vec2(e / ${W.toFixed(1)}, 0.0));
    vec3 py = disp(p + vec2(0.0, e), uv + vec2(0.0, e / ${H.toFixed(1)}));
    vec3 n = normalize(cross(px - pos, py - pos));
    vP = p;
    vUv = uv;
    vZ = pos.z;
    vN = normalize(normalMatrix * n);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime, uMat, uChalk, uCut, uStitch, uPuff, uDetail, uFreq;
  uniform vec3 uThread, uRim;
  varying vec2 vP;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vView;
  varying float vZ;
  ${COMMON}

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void params(float i, out vec3 base, out float spec, out float shin, out float sheen) {
    if (i < 0.5)      { base = vec3(0.93, 0.89, 0.82); spec = 0.05; shin = 10.0; sheen = 0.35; }
    else if (i < 1.5) { base = vec3(0.25, 0.25, 0.29); spec = 0.03; shin = 6.0;  sheen = 1.05; }
    else if (i < 2.5) { base = vec3(0.66, 0.07, 0.14); spec = 0.55; shin = 55.0; sheen = 0.12; }
    else              { base = vec3(0.075, 0.075, 0.09); spec = 0.7; shin = 70.0; sheen = 0.1; }
  }

  // Mikro yüzey: kabartma yüksekliği
  float micro(float i, vec2 p) {
    if (i < 0.5) {
      vec2 g = p * 70.0;
      float cx = floor(g.x / 3.1416), cy = floor(g.y / 3.1416);
      float alt = mod(cx + cy, 2.0);
      return (mix(abs(sin(g.x)), abs(sin(g.y)), alt) * 0.6 + noise(p * 110.0) * 0.4) * 0.7;
    }
    if (i < 1.5) return noise(p * 120.0) * 0.6 + noise(p * 31.0) * 0.4;
    return noise(p * 60.0) * 0.55 + noise(p * 17.0) * 0.45;
  }

  void main() {
    vec2 p = vP;
    float d = sdPanel(p);
    float a = around(p);

    // Makas: kalıbın dışı, çevre boyunca kesilip düşer
    if (d > 0.0 && a < uCut) discard;

    float i0, i1, w, front;
    matMix(vUv, uMat, i0, i1, w, front);
    vec3 b0, b1; float s0, s1, h0, h1, sh0, sh1;
    params(i0, b0, s0, h0, sh0);
    params(i1, b1, s1, h1, sh1);
    vec3 base = mix(b0, b1, w);
    float spec = mix(s0, s1, w);
    float shin = mix(h0, h1, w);
    float sheen = mix(sh0, sh1, w);
    float isNappa = (i0 > 1.5 && i0 < 2.5 ? 1.0 - w : 0.0) + (i1 > 1.5 && i1 < 2.5 ? w : 0.0);
    float isQuilt = (i0 > 2.5 ? 1.0 : 0.0) + (i1 > 2.5 && i0 < 2.5 ? w : 0.0);

    // Mikro kabartma (ekran uzayı türevleriyle)
    float hgt = mix(micro(i0, p / uFreq), micro(i1, p / uFreq), w);
    float fade = 1.0 - smoothstep(0.02, 0.06, fwidth(p.x / uFreq) * 6.0);
    vec3 N = normalize(vN);
    bool back = !gl_FrontFacing;
    if (back) N = -N;
    N = normalize(N + vec3(-dFdx(hgt), -dFdy(hgt), 0.0) * 0.9 * fade * uDetail);

    vec3 V = normalize(vView);
    vec3 col;
    vec3 L1 = normalize(vec3(-0.7, 0.6, 0.55));
    vec3 L2 = normalize(vec3(0.8, -0.3, 0.55));
    float nv = clamp(dot(N, V), 0.0, 1.0);
    float d1 = (dot(N, L1) + 0.12) / 1.12;
    float d2 = max(dot(N, L2), 0.0);
    vec3 Hh = normalize(L1 + V);
    float sp = pow(max(dot(N, Hh), 0.0), shin) * spec * 1.6;
    float fres = pow(1.0 - nv, 3.0);
    vec3 lin = base * (0.16 + 0.98 * max(d1, 0.0)) + base * vec3(0.62, 0.7, 1.0) * d2 * 0.28;
    lin += vec3(1.0, 0.97, 0.93) * sp;
    lin += mix(base, vec3(1.0), 0.45) * pow(1.0 - nv, 2.0) * sheen * 0.45;
    lin += uRim * fres * 0.55;
    float ao = 0.58 + 0.42 * smoothstep(-0.3, 0.28, vZ);
    col = lin * ao;
    if (back) col *= 0.62;

    // Delikli nappa: ortada delik ızgarası
    if (isNappa > 0.0 && d < -0.34 && abs(p.x) < 0.52 && uPuff > 0.2) {
      vec2 g = fract(p * 15.0) - 0.5;
      float hole = smoothstep(0.2, 0.12, length(g)) * fade;
      col *= 1.0 - 0.75 * hole * isNappa;
    }

    // Kapitone dikişleri: baklava kenarları boyunca kesik iplik
    if (isQuilt > 0.0 && d < -0.2 && uPuff > 0.2) {
      vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p / 0.36;
      vec2 f = fract(q) - 0.5;
      float ex = 0.5 - abs(f.x), ey = 0.5 - abs(f.y);
      float lx = smoothstep(0.03, 0.012, ex) * step(0.45, fract(q.y * 7.0));
      float ly = smoothstep(0.03, 0.012, ey) * step(0.45, fract(q.x * 7.0));
      float crease = smoothstep(0.07, 0.0, min(ex, ey));
      col *= 1.0 - 0.35 * crease * isQuilt;
      col = mix(col, uThread * (0.75 + 0.35 * d1), max(lx, ly) * isQuilt * fade);
    }

    // Tebeşir kalıp çizgisi
    float perim = 10.4;
    if (uChalk > 0.0) {
      float line = smoothstep(0.03, 0.012, abs(d));
      float dash = step(0.38, fract(a * perim / 0.09));
      float on = step(a, uChalk) * (1.0 - smoothstep(0.0, 0.6, uStitch));
      float grain = 0.75 + 0.25 * noise(p * 140.0);
      col = mix(col, vec3(0.16, 0.24, 0.92) * grain, line * dash * on * 0.95);
    }

    // Kesim kenarı: kesilen yerde ince açık çizgi
    if (uCut > 0.0 && uCut < 1.0) {
      float edge = smoothstep(0.03, 0.0, abs(d)) * step(a, uCut);
      col = mix(col, col * 0.55, edge * 0.6);
    }

    // Çift sıra dikiş: pembe iplik, kalıp çevresinden içeride
    if (uStitch > 0.0) {
      float on = step(a, uStitch);
      float t = a * perim / 0.075;
      float dash = smoothstep(0.08, 0.2, fract(t)) * smoothstep(0.78, 0.66, fract(t));
      float l1 = smoothstep(0.024, 0.01, abs(d + 0.085));
      float l2 = smoothstep(0.024, 0.01, abs(d + 0.145));
      float groove = smoothstep(0.03, 0.0, abs(d + 0.112));
      col *= 1.0 - 0.28 * groove * on;
      vec3 th = vec3(0.95, 0.3, 0.6) * (0.62 + 0.5 * max(d1, 0.0)) + vec3(0.25) * sp;
      col = mix(col, th, max(l1, l2) * dash * on * fade);
    }

    // Malzeme cephesi: dönüşen yerde ince pembe ışık
    col += uThread * front * 0.9;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createStage(canvas, { lite = false, weak = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !weak, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  let dpr = Math.min(window.devicePixelRatio || 1, weak ? 1.1 : lite ? 1.35 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const seg = weak ? [80, 100] : lite ? [110, 138] : [150, 188];
  const geo = new THREE.PlaneGeometry(W, H, seg[0], seg[1]);
  const uniforms = {
    uTime: { value: 0 }, uWind: { value: 1 }, uFold: { value: 0.5 }, uPuff: { value: 0 },
    uMat: { value: 0 }, uFly: { value: 0 }, uChalk: { value: 0 }, uCut: { value: 0 },
    uStitch: { value: 0 }, uFreq: { value: 1 }, uDetail: { value: weak ? 0.5 : 1 },
    uThread: { value: new THREE.Color(1.0, 0.52, 0.76) },
    uRim: { value: new THREE.Color(0.32, 0.42, 1.0) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms, side: THREE.DoubleSide,
  });
  const cloth = new THREE.Mesh(geo, mat);
  cloth.frustumCulled = false;
  scene.add(cloth);

  let vw = 1, vh = 1;
  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    vw = vh * camera.aspect;
  }
  resize();

  // Zayıf cihaz: kare süresi uzun kalırsa çözünürlüğü düşür
  let slow = 0;
  function watch(dt) {
    if (dt > 0.034) slow++;
    else slow = Math.max(0, slow - 1);
    if (slow > 40 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slow = 0;
    }
  }

  let time = 0;
  function render(po, dt) {
    time += dt * (po.speed ?? 1);
    watch(dt);
    const scale = Math.min((po.size * vh) / H, ((po.maxW ?? 1) * vw) / W);
    cloth.scale.setScalar(scale);
    cloth.position.set((po.nx * vw) / 2, (po.ny * vh) / 2, 0);
    cloth.rotation.set(po.rx ?? 0, po.ry ?? 0, po.rz ?? 0);
    const u = uniforms;
    u.uTime.value = time;
    u.uWind.value = po.wind ?? 0;
    u.uFold.value = po.fold ?? 0;
    u.uPuff.value = po.puff ?? 0;
    u.uMat.value = po.mat ?? 0;
    u.uFly.value = po.fly ?? 0;
    u.uChalk.value = po.chalk ?? 0;
    u.uCut.value = po.cut ?? 0;
    u.uStitch.value = po.stitch ?? 0;
    u.uFreq.value = po.freq ?? 1;
    renderer.render(scene, camera);
  }

  return { render, resize };
}
