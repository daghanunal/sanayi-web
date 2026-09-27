// Bobin: kaydırmayla sarılan bakır bobin sahnesi.
// Tek sahne: sarma tezgâhının miline takılı makara (disk disk saç paketli nüve, yalıtım kâğıdı,
// pahlı bakalit flanşlar, kalaylı pabuçlar), üzerine katman katman sarılan emaye bakır tel,
// besleme teli, bobinin manyetik alan çizgileri ve bu çizgilerde akan parçacıklar.
// Işık: lib3d `studio` HDRI (softbox yansımaları), ACES ton eşleme, yumuşak PCF gölge; telefonda 'lo'.
// Dışarıya: createCoil(canvas, opts) → { S, ready, start(), stop(), resize(), warm(), snap() }
import * as THREE from 'three';
import { loadEnv, pickQuality } from '../../shared/lib3d.js';

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

// Tekrarlanabilir gürültü (her yüklemede aynı doku)
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Pahlı disk profili (LatheGeometry, Y ekseni): iç delik → pahlı dış kenar
function flangeProfile(rIn, rOut, th, ch) {
  const h = th / 2;
  return [
    new THREE.Vector2(rIn, -h),
    new THREE.Vector2(rOut - ch, -h),
    new THREE.Vector2(rOut - ch * 0.3, -h + ch * 0.3),
    new THREE.Vector2(rOut, -h + ch),
    new THREE.Vector2(rOut, h - ch),
    new THREE.Vector2(rOut - ch * 0.3, h - ch * 0.3),
    new THREE.Vector2(rOut - ch, h),
    new THREE.Vector2(rIn, h),
  ];
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
  const q = pickQuality();
  const lo = low || q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const ENV = 0.95;
  scene.environmentIntensity = ENV;
  // softbox yansımaları telin üst sırtına ve flanş pahına düşsün
  scene.environmentRotation.set(0.25, 0.9, 0);
  scene.fog = new THREE.Fog(0x071816, 7, 16);

  // Yedek ışık: HDRI inmezse metal kararmasın
  const hemi = new THREE.HemisphereLight(0xffe8d6, 0x0b2a24, 0);
  let hemiOn = 0;
  scene.add(hemi);
  const ready = loadEnv('studio', renderer, { quality: lo ? 'lo' : 'hi' })
    .then((env) => {
      scene.environment = env;
    })
    .catch(() => {
      hemiOn = 1.6;
    });

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);

  // Işıklar: sıcak üst anahtar (yumuşak gölge) + patina yeşili arka kontur
  const key = new THREE.DirectionalLight(0xffe4c8, 2.1);
  key.position.set(2.2, 6, 3.4);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.radius = lo ? 3 : 5;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.025;
  Object.assign(key.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 1, far: 16 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x5fe0c0, 2.8);
  rim.position.set(-3, 1.5, -4);
  scene.add(rim);
  const glow = new THREE.PointLight(0xff8a3a, 0, 6, 1.6);
  glow.position.set(0, 0, 1.6);
  scene.add(glow);

  // Zemin: yalnız gölgeyi taşır (tezgâh yüzeyi); renk CSS fonundan gelir
  const GROUND_Y = -1.62;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.42, color: 0x010605 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  const rig = new THREE.Group(); // bobini ekrana göre kaydırmak için
  scene.add(rig);
  const coil = new THREE.Group();
  rig.add(coil);
  const shade = (m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // --- Nüve: disk disk saç paketi (yan yüzde ince halkalar, her saç biraz farklı ton)
  const R = rng(7);
  const lamTex = canvasTex(64, 1024, (g, w, h) => {
    for (let y = 0; y < h; y += 6) {
      const v = 118 + R() * 46;
      const b = R() < 0.18 ? 16 : 6; // bazı saçlarda mavimsi oksit
      g.fillStyle = `rgb(${v - 4},${v + 2},${v + b})`;
      g.fillRect(0, y, w, 5);
      g.fillStyle = 'rgb(38,40,42)'; // saç arası yalıtım çizgisi
      g.fillRect(0, y + 5, w, 1);
    }
    g.globalAlpha = 0.08;
    for (let i = 0; i < 400; i++) {
      g.fillStyle = R() < 0.5 ? '#000' : '#fff';
      g.fillRect(R() * w, R() * h, 1 + R() * 3, 1);
    }
  });
  const lamBump = lamTex.clone();
  lamBump.colorSpace = THREE.NoColorSpace;
  lamBump.needsUpdate = true;
  const steel = new THREE.MeshStandardMaterial({
    color: 0xb9c0c4, map: lamTex, bumpMap: lamBump, bumpScale: 1.2, metalness: 1, roughness: 0.34,
  });
  const core = shade(new THREE.Mesh(new THREE.CylinderGeometry(CORE_R, CORE_R, CORE_L + 0.5, lo ? 48 : 72, 1, true), steel));
  core.rotation.z = Math.PI / 2;
  coil.add(core);
  // nüve alnı: tek saçın yüzü, lekeli mavi-gri oksit
  const faceTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, '#6c7479');
    gr.addColorStop(1, '#4d565c');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // torna izi: ince eş merkezli halkalar + hafif mavi oksit lekesi
    for (let r = 12; r < w / 2; r += 1.5) {
      g.strokeStyle = `rgba(${R() < 0.5 ? '40,46,52' : '170,176,180'},${0.05 + R() * 0.06})`;
      g.beginPath();
      g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      g.stroke();
    }
    const ox = g.createRadialGradient(w * 0.3, h * 0.35, 4, w * 0.3, h * 0.35, w * 0.5);
    ox.addColorStop(0, 'rgba(70,96,140,.22)');
    ox.addColorStop(1, 'rgba(70,96,140,0)');
    g.fillStyle = ox;
    g.fillRect(0, 0, w, h);
  });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.9, roughness: 0.42 });

  // --- Mil (sarma tezgâhı) + somun + pul
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 1, roughness: 0.12 });
  const zinc = new THREE.MeshStandardMaterial({ color: 0xc9ccc4, metalness: 1, roughness: 0.3 });
  const shaft = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, CORE_L + 2.4, 32), chrome));
  shaft.rotation.z = Math.PI / 2;
  coil.add(shaft);
  const nutGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.13, 6);
  const washerGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.025, 40);

  // --- Flanşlar: pahlı, cilalı fenolik bakalit
  const bakTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a1d12';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${R() < 0.5 ? '20,8,4' : '92,50,30'},${0.06 + R() * 0.1})`;
      g.fillRect(R() * w, R() * h, 1 + R() * 4, 1 + R() * 2);
    }
  });
  const bakalit = new THREE.MeshPhysicalMaterial({
    color: 0x8a5a44, map: bakTex, metalness: 0, roughness: 0.42, clearcoat: 0.8, clearcoatRoughness: 0.18,
  });
  const flangeGeo = new THREE.LatheGeometry(flangeProfile(CORE_R, 1.18, 0.09, 0.028), lo ? 64 : 112);
  for (const sx of [-1, 1]) {
    const f = shade(new THREE.Mesh(flangeGeo, bakalit));
    f.rotation.z = Math.PI / 2;
    f.position.x = sx * (CORE_L / 2 + 0.045);
    coil.add(f);
    const face = new THREE.Mesh(new THREE.RingGeometry(0.105, CORE_R, 48), faceMat);
    face.position.x = sx * (CORE_L / 2 + 0.25 + 0.001);
    face.rotation.y = sx * Math.PI / 2;
    coil.add(face);
    const washer = shade(new THREE.Mesh(washerGeo, zinc));
    washer.rotation.z = Math.PI / 2;
    washer.position.x = sx * (CORE_L / 2 + 0.265);
    coil.add(washer);
    const nut = shade(new THREE.Mesh(nutGeo, zinc));
    nut.rotation.z = Math.PI / 2;
    nut.position.x = sx * (CORE_L / 2 + 0.345);
    coil.add(nut);
  }

  // --- Yalıtım kâğıdı: sargının altında, tel sarıldıkça örtülür
  const paperTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#a07a48';
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.18;
    for (let i = 0; i < 1600; i++) {
      g.strokeStyle = R() < 0.5 ? '#8a6a3c' : '#e8cf9c';
      g.beginPath();
      const x = R() * w, y = R() * h;
      g.moveTo(x, y);
      g.lineTo(x + 3 + R() * 12, y + (R() - 0.5) * 3);
      g.stroke();
    }
  });
  const paper = shade(new THREE.Mesh(
    new THREE.CylinderGeometry(CORE_R + 0.008, CORE_R + 0.008, CORE_L, lo ? 48 : 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x6a4e30, map: paperTex, roughness: 0.9, metalness: 0 })
  ));
  paper.rotation.z = Math.PI / 2;
  coil.add(paper);

  // --- Sargı teli: emaye bakır (metal + şeffaf vernik katmanı), her sarımda hafif ton farkı
  const curve = new WindingCurve();
  const segPerTurn = lo ? 24 : 32;
  const segments = curve.total * segPerTurn;
  const radial = lo ? 6 : 10;
  const wireGeo = new THREE.TubeGeometry(curve, segments, WIRE, radial, false);
  const idxPerSeg = radial * 6;
  const wireMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8875a, metalness: 1, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.07, emissive: 0x000000,
  });
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
        varying float vAlong; uniform float uTime, uPulse, uHeat, uFault, uHead;
        float turnHash(float n){ return fract(sin(n * 12.9898) * 43758.5453); }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float tn = turnHash(floor(vAlong * ${(TURNS * LAYERS).toFixed(1)}));
        diffuseColor.rgb *= 0.95 + 0.08 * tn;`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor *= 0.94 + 0.14 * tn;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // akım darbeleri: telin boyunca akan sıcak ışık
        float k = fract(vAlong * 9.0 - uTime * 0.35);
        float pulse = smoothstep(0.0, 0.012, k) * (1.0 - smoothstep(0.012, 0.05, k));
        vec3 hot = vec3(1.0, 0.36, 0.08);
        totalEmissiveRadiance += hot * pulse * uPulse * 1.5;
        // ısınma: tüm sargı kor gibi
        totalEmissiveRadiance += vec3(1.0, 0.32, 0.08) * uHeat * (0.55 + 0.3 * sin(vAlong * 180.0 + uTime * 3.0));
        // arıza: bir bölgede kırmızı sıcak nokta
        float spot = exp(-pow((vAlong - 0.62) * 40.0, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.08, 0.05) * spot * uFault * (0.7 + 0.3 * sin(uTime * 14.0));
        // sarılan telin ucu parlar
        float tip = exp(-pow((vAlong - uHead) * 1400.0, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.42, 0.14) * tip * 1.4;`
      );
  };
  const wire = shade(new THREE.Mesh(wireGeo, wireMat));
  coil.add(wire);

  // --- Besleme teli (ucu takip eden düz tel)
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(WIRE * 0.9, WIRE * 0.9, 1, 10, 1, true), wireMat);
  feed.castShadow = true;
  rig.add(feed);
  const feedFrom = new THREE.Vector3(0, 6, 1.2);
  const head = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // --- Terminal pabuçları: kalaylı bakır
  const lugMat = new THREE.MeshStandardMaterial({ color: 0xd2cdc2, metalness: 1, roughness: 0.28 });
  for (const sx of [-1, 1]) {
    const x = sx * (CORE_L / 2 + 0.045);
    const lug = shade(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.2), lugMat));
    lug.position.set(x, 1.3, 0);
    coil.add(lug);
    const ring = shade(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.026, 12, 28), lugMat));
    ring.position.set(x, 1.53, 0);
    ring.rotation.y = Math.PI / 2;
    coil.add(ring);
  }

  // --- Alan çizgileri
  const scales = lo ? [1.9, 2.8, 4.0] : [1.7, 2.35, 3.1, 4.2];
  const phis = lo ? 8 : 12;
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
  const PN = lo ? 260 : 620;
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
  const DN = lo ? 160 : 360;
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
    px = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(px);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    dotMat.uniforms.uPx.value = px * (H / 900) * 1.4 + 0.4;
    dustMat.uniforms.uPx.value = dotMat.uniforms.uPx.value;
  }

  let lastT = performance.now();
  const delta = () => {
    const n = performance.now();
    const d = (n - lastT) / 1000;
    lastT = n;
    return d;
  };
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
    scene.environmentIntensity = ENV * C.dim;
    hemi.intensity = hemiOn * C.dim;
    key.intensity = 2.1 * C.dim;
    rim.intensity = 2.8 * C.dim;

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
    step(Math.min(delta(), 1 / 20));
  }

  resize();
  return {
    S,
    ready,
    resize,
    start() {
      if (running) return;
      running = true;
      delta();
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
