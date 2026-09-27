// Girdap sahnesi: kütüphanedeki gerçekçi turbo (lib3d `turbo`; kompresör +x soğuk taraf, türbin −x
// sıcak taraf) karanlık bir stüdyoda. Işık: "studio" HDRI (yumuşak kutu yansımaları), soğuk mavi ve kor
// turuncu kontur ışıkları, gölge düşüren üst tepe ışığı, kenarlara doğru kaybolan koyu zemin.
// Kütüphanede olmayanlar burada: VNT kanat halkası, balans halkaları, hız bulanıklığı diski, hava akışı.
// Sahne durumu dışarıdan `update(state)` ile verilir; bu dosya yalnızca çizer.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const S = 13; // varlık metre → sahne birimi (turbo ≈ 3,6 birim boy)
const AXIS_Y = 0.1515; // mil ekseninin varlık içindeki yüksekliği

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Döküm yüzeyi (lo varlıkta doku yok, yalnız köşe rengi var): nesne uzayında gürültü ile kum döküm
// pürüzü, pürüzlülük dalgası, isteğe bağlı pas lekesi ve ısınınca lekeli kor parıltısı.
const NOISE = `
  float h31(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
    return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ return .5*vn(p)+.25*vn(p*2.03)+.125*vn(p*4.01)+.0625*vn(p*8.07); }`;
function castify(m, { grain = 0, rust = 0, mottle = 0, tint = 1 } = {}) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCastP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCastP = mat3(modelMatrix) * transformed;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vCastP;${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float cG = vn(vCastP*38.), cM = fbm(vCastP*2.2);
        ${grain ? `diffuseColor.rgb *= mix(${(1 - 0.22 * tint).toFixed(2)}, 1.06, cG*.6+cM*.4);` : ''}
        ${rust ? `float cR = smoothstep(.45,.7,fbm(vCastP*3.1+7.));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.24,.11,.05), cR*${rust.toFixed(2)});` : ''}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        ${grain ? 'roughnessFactor = clamp(roughnessFactor + (cG-.5)*.22 + (cM-.5)*.2, .08, 1.);' : ''}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        ${grain ? `{ float hh = cG*${(grain * 0.004).toFixed(4)} + cM*${(grain * 0.01).toFixed(4)};
          vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
          float dhx = dFdx(hh), dhy = dFdy(hh);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          normal = normalize(abs(det)*normal - sign(det)*(dhx*r1 + dhy*r2)); }` : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${mottle ? 'totalEmissiveRadiance *= .25 + 1.6*pow(fbm(vCastP*2.6+3.), 2.);' : ''}`);
  };
  m.customProgramCacheKey = () => `cast${grain}${rust}${mottle}${tint}`;
  m.needsUpdate = true;
}

export function createScene(canvas, { lite = false } = {}) {
  const q = pickQuality();
  const lo = q === 'lo' || lite;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lo ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.75;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);

  // --- Işıklar -----------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0xa9c8ea, 0x120c09, 0.25));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.1);
  key.position.set(1.5, 9, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -7;
  key.shadow.camera.right = key.shadow.camera.top = 7;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 6;
  scene.add(key);
  const cold = new THREE.DirectionalLight(0x8fd4ff, 2.4);
  cold.position.set(7, 2.5, 3);
  scene.add(cold);
  const warm = new THREE.DirectionalLight(0xffa066, 1.6);
  warm.position.set(-7, 3.5, 2);
  scene.add(warm);
  const ember = new THREE.PointLight(0xff5a1a, 0, 7, 1.6);
  scene.add(ember);

  const root = new THREE.Group();
  scene.add(root);

  // --- Zemin: koyu, hafif parlak, kenarlara doğru kaybolur; gölgeyi alır ---------
  const floorAlpha = canvasTex(256, 256, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(0.45, '#9a9a9a');
    gr.addColorStop(1, '#000');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  }, false);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0c1119, roughness: 0.42, metalness: 0.2, transparent: true, alphaMap: floorAlpha, depthWrite: false }),
  );
  floor.position.y = -2.75;
  floor.receiveShadow = true;
  root.add(floor);
  const shadowOnly = new THREE.Mesh(new THREE.CircleGeometry(7, 48).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.55, transparent: true, depthWrite: false }));
  shadowOnly.position.y = -2.74;
  shadowOnly.receiveShadow = true;
  root.add(shadowOnly);

  // --- Turbo (lib3d) ----------------------------------------------------------------
  const rig = new THREE.Group(); // mil ekseni orijinde, x boyunca
  rig.scale.setScalar(S);
  root.add(rig);
  let A = null, ready = false;
  const parts = {}; // ad → { node, base, dir }
  const oilMats = [];
  const labelPts = {};
  let hotMat = null, inconel = null;

  // --- VNT kanat halkası (kütüphanede yok): türbin çarkının çevresinde 11 kanat ------------
  const vntG = new THREE.Group();
  root.add(vntG);
  const vaneMat = new THREE.MeshStandardMaterial({ color: 0xb7c0ca, metalness: 1, roughness: 0.28, emissive: 0x2a8fd0, emissiveIntensity: 0 });
  const ringMatSteel = new THREE.MeshStandardMaterial({ color: 0x3b4048, metalness: 0.9, roughness: 0.45, side: THREE.DoubleSide });
  const vanes = [];
  const NV = 11;
  // Kanat: ince kanat profili (ön kenar kalın, arka kenar ince), eksen boyunca uzanır
  const vs = new THREE.Shape();
  vs.moveTo(-0.13, 0);
  vs.bezierCurveTo(-0.12, 0.035, 0.02, 0.03, 0.14, 0.004);
  vs.lineTo(0.14, -0.004);
  vs.bezierCurveTo(0.02, -0.012, -0.12, -0.02, -0.13, 0);
  const vaneGeo = new THREE.ExtrudeGeometry(vs, { depth: 0.2, bevelEnabled: false, curveSegments: 6 });
  vaneGeo.translate(0, 0, -0.1);
  vaneGeo.rotateY(Math.PI / 2); // kalınlık yönü → x (eksen)
  for (let i = 0; i < NV; i++) {
    const a = (i / NV) * TAU;
    const piv = new THREE.Group();
    piv.position.set(0, 0.62 * Math.cos(a), 0.62 * Math.sin(a));
    piv.rotation.x = a;
    const v = new THREE.Mesh(vaneGeo, vaneMat);
    v.castShadow = true;
    piv.add(v);
    vntG.add(piv);
    vanes.push(v);
  }
  const nozzle = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.86, 64).rotateY(Math.PI / 2), ringMatSteel);
  nozzle.position.x = 0.12;
  const nozzleRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.025, 8, 64).rotateY(Math.PI / 2), ringMatSteel);
  nozzleRim.position.x = 0.12;
  vntG.add(nozzle, nozzleRim);

  // --- Balans halkaları ve hız bulanıklığı -------------------------------------------------
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.008, 6, 96).rotateY(Math.PI / 2), ringMat);
  const ringC2 = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.005, 6, 96).rotateY(Math.PI / 2), ringMat);
  const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.008, 6, 96).rotateY(Math.PI / 2), ringMat);
  root.add(ringC, ringC2, ringT);

  const blurMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uAlpha; uniform float uTime;
      void main(){ vec2 p = vUv*2.-1.; float r = length(p); if (r>1.) discard;
        float a = atan(p.y,p.x);
        float streak = .5+.5*sin(a*6.+uTime*3.+r*9.);
        float body = smoothstep(1.,.86,r)*smoothstep(.1,.28,r);
        vec3 c = mix(vec3(.7,.76,.84), vec3(.95,.98,1.), streak*.6);
        gl_FragColor = vec4(c, body*(.5+.25*streak)*uAlpha); }`,
  });
  const blurDisc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48).rotateY(Math.PI / 2), blurMat);
  root.add(blurDisc);

  // --- Hava akışı: soğuk emme (+x), sıcak egzoz (−x) --------------------------------------
  function flowPoints(n, hot) {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) seed[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.boundingSphere = new THREE.Sphere(V(0, 0, 0), 20);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPhase: { value: 0 }, uAlpha: { value: 0 }, uOff: { value: 0 }, uSize: { value: 30 } },
      vertexShader: `attribute vec3 aSeed; uniform float uPhase; uniform float uOff; uniform float uSize; varying float vL; varying float vS;
        void main(){ float life = fract(aSeed.x + uPhase*(.6+.8*aSeed.y)); vL = life; vS = aSeed.z; vec3 p;
        ${hot
          ? 'float x = -1.75 + uOff - life*4.0; float r = (.1+aSeed.y*.3) + life*life*1.3; float a = aSeed.z*6.2832 - life*2.;'
          : 'float x = 5.0 + uOff - pow(life,1.3)*3.4; float r = mix(.35+aSeed.y*1.3, .06+aSeed.y*.36, pow(life,.8)); float a = aSeed.z*6.2832 + life*4.2;'}
        p = vec3(x, r*cos(a), r*sin(a));
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = uSize*(${hot ? '.6+life*1.8' : '.5+aSeed.y*.7'})/ -mv.z;
        gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uAlpha; varying float vL; varying float vS;
        void main(){ vec2 c = gl_PointCoord-.5; float d = length(c); if(d>.5) discard;
        float soft = smoothstep(.5,.0,d);
        ${hot
          ? 'vec3 col = mix(vec3(1.,.86,.55), vec3(1.,.33,.06), smoothstep(0.,.5,vL)); float a = soft*smoothstep(0.,.08,vL)*smoothstep(1.,.35,vL)*.5;'
          : 'vec3 col = mix(vec3(.55,.85,1.), vec3(.9,.97,1.), vS); float a = soft*smoothstep(0.,.2,vL)*smoothstep(1.,.85,vL)*.55;'}
        gl_FragColor = vec4(col, a*uAlpha); }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }
  // Soğuk akış kompresör girişine (+x, eksen), sıcak akış türbin çıkışına (−x) — varlığa göre kaydırılır
  const coldFlow = flowPoints(lo ? 240 : 560, false);
  const hotFlow = flowPoints(lo ? 180 : 420, true);
  root.add(coldFlow, hotFlow);

  // --- Varlıkları yükle --------------------------------------------------------------------
  const readyP = (async () => {
    const [env, turbo] = await Promise.all([
      loadEnv('studio', renderer, { quality: q }),
      loadAsset('turbo', { quality: q, renderer }),
    ]);
    scene.environment = env;
    A = turbo;
    A.scene.position.set(-0.0012, -AXIS_Y, 0.0011);
    rig.add(A.scene);
    const N = A.nodes, M = A.materials;
    for (const n of ['compressor_housing', 'turbine_housing', 'compressor_wheel', 'turbine_wheel', 'shaft', 'actuator', 'oil_feed', 'oil_drain', 'center_housing']) {
      const e = A.explodeData[n];
      const node = N[n];
      parts[n] = { node, base: node.position.clone(), dir: e ? e.dir.clone() : V(0, 0, 0), q0: node.quaternion.clone() };
    }
    // Malzemeler. lo varlıkta doku yok: döküm pürüzü, pas ve kor lekesi gölgelendiricide üretilir.
    hotMat = M.cast_iron_hot || M.cast_iron;
    if (hotMat) {
      hotMat.emissive = new THREE.Color(0xff3c0c);
      hotMat.emissiveIntensity = 0;
    }
    if (lo) {
      if (M.cast_alu) { M.cast_alu.color.set(0xb4b7ba); M.cast_alu.roughness = 0.55; castify(M.cast_alu, { grain: 1 }); }
      if (M.cast_iron) { M.cast_iron.roughness = 0.62; castify(M.cast_iron, { grain: 1, tint: 1.3 }); }
      if (M.cast_iron_hot) { M.cast_iron_hot.color.set(0x4a403b); castify(M.cast_iron_hot, { grain: 1.2, rust: 0.85, mottle: 1, tint: 1.3 }); }
    } else if (hotMat) castify(hotMat, { mottle: 1 });
    inconel = M.inconel;
    if (inconel) { inconel.emissive = new THREE.Color(0xff6a20); inconel.emissiveIntensity = 0; }
    // Yağ hattı: kendi kopya malzemeleri (başka parçalar parlamasın)
    for (const n of ['oil_feed', 'oil_drain']) {
      N[n].traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0x000000);
        oilMats.push(o.material);
      });
    }
    // Etiket noktaları: parçanın kendi kutusunun merkezi (düğüm yerel uzayında saklanır)
    rig.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const pick = { kg: ['compressor_housing', 0, -0.35, 0], kc: ['compressor_wheel', 0, 0.2, 0], yg: ['center_housing', 0, -0.25, 0], tc: ['turbine_wheel', 0, 0.2, 0], tg: ['turbine_housing', 0, -0.4, 0] };
    for (const [id, [n, fx, fy, fz]] of Object.entries(pick)) {
      box.setFromObject(N[n]);
      const c = box.getCenter(V(0, 0, 0));
      const sz = box.getSize(V(0, 0, 0));
      c.x += fx * sz.x; c.y += fy * sz.y; c.z += fz * sz.z;
      labelPts[id] = { node: N[n], local: N[n].worldToLocal(c) };
    }
    ready = true;
  })();

  // --- Boyut --------------------------------------------------------------------------------
  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const sz = 70 * dpr * (height / 900);
    coldFlow.material.uniforms.uSize.value = sz;
    hotFlow.material.uniforms.uSize.value = sz * 1.6;
  }
  resize();

  // --- Kare ------------------------------------------------------------------------------------
  let last = performance.now();
  let slowFrames = 0;
  let angle = 0, phaseC = 0, phaseH = 0, oilPhase = 0;
  const qx = new THREE.Quaternion();
  const X = V(1, 0, 0);
  const tmp = V(0, 0, 0);
  const place = (n, ex, dx = 0, dy = 0, dz = 0) => {
    const p = parts[n];
    if (!p) return;
    // yerel birim (metre) cinsinden: taban + patlatma yönü × ex + ek uzaklaştırma
    p.node.position.copy(p.base).addScaledVector(p.dir, ex);
    p.node.position.x += dx; p.node.position.y += dy; p.node.position.z += dz;
  };
  const oilDirty = new THREE.Color(0x3a1d06), oilClean = new THREE.Color(0xffa024), oilTmp = new THREE.Color();

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(s.look);
    const sh = s.sh || 0; // telefonda turbo ekranın üst kısmına kayar
    if (sh > 0.001) camera.setViewOffset(width, height, 0, sh * height, width, height);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();

    const ex = s.explode, far = s.far;
    const w = Math.min(s.spin, 9.5); // gerçek açı hızı sınırlı; fazlası bulanıklık diskine
    angle += w * dt;
    const wob = s.wobble;
    const wy = wob * 0.004 * Math.sin(t * 11), wz = wob * 0.004 * Math.cos(t * 11);

    if (ready) {
      // Patlatma: kütüphane yönleri; "far" gövdeleri kadrajdan çıkarır (balans ve VNT yakın planı)
      place('compressor_housing', ex, far * 0.7, far * 0.03);
      place('turbine_housing', ex, -far * 0.7, far * 0.03);
      place('actuator', ex, -far * 0.6, 0, far * 0.2);
      place('oil_feed', ex * 0.8 + far * 0.4);
      place('oil_drain', ex * 0.8 + far * 0.3);
      place('center_housing', 0, 0, -ex * 0.004);
      place('compressor_wheel', ex, 0, wy, wz);
      place('shaft', ex * 0.9, 0, wy * 0.4, wz * 0.4);
      place('turbine_wheel', ex, 0, -wy * 0.6, -wz * 0.6);
      A.nodes.compressor_housing.visible = A.nodes.turbine_housing.visible = far < 0.98;
      A.nodes.actuator.visible = far < 0.98;
      qx.setFromAxisAngle(X, angle);
      for (const n of ['compressor_wheel', 'shaft', 'turbine_wheel']) parts[n].node.quaternion.copy(parts[n].q0).multiply(qx);

      // Isı
      if (hotMat) hotMat.emissiveIntensity = s.heat * (lo ? 0.6 : 0.45);
      if (inconel) inconel.emissiveIntensity = s.heat * 0.5;
      // Yağ: kirli kahveden temiz amber akışa, nabız gibi
      oilPhase += dt * (1.2 + s.oilClean * 3.5);
      const pulse = 0.55 + 0.45 * Math.sin(oilPhase * 2.2);
      oilTmp.copy(oilDirty).lerp(oilClean, s.oilClean).multiplyScalar(s.oil * pulse * (0.6 + s.oilClean * 1.6));
      for (const m of oilMats) m.emissive.copy(oilTmp);
    }

    // Dünya konumları (sahne birimi)
    const cwX = ready ? (parts.compressor_wheel.node.position.x - 0.0012) * S : 1.1 + ex * 0.7;
    const twX = ready ? (parts.turbine_wheel.node.position.x - 0.0012) * S : -0.9 - ex * 0.65;
    const chX = ready ? (parts.compressor_housing.node.position.x - 0.0012) * S : 1.05;
    const thX = ready ? (parts.turbine_housing.node.position.x - 0.0012) * S : -1.1;
    blurDisc.position.set(cwX + 0.45, wy * S, wz * S);
    blurMat.uniforms.uAlpha.value = clamp((s.spin - 8) / 10);
    blurMat.uniforms.uTime.value = t * 7;

    // Balans halkaları
    ringMat.opacity = s.balance * 0.8;
    for (const [m, x, k] of [[ringC, cwX + 0.1, 1], [ringC2, cwX + 0.35, 1.4], [ringT, twX, 1]]) {
      m.visible = s.balance > 0.01;
      m.position.set(x, Math.sin(t * 11) * wob * 0.05 * k, Math.cos(t * 11) * wob * 0.05 * k);
      m.rotation.y = wob * 0.1 * k * Math.sin(t * 11);
      m.rotation.z = wob * 0.1 * k * Math.cos(t * 11);
    }

    // VNT: 0 kapalı (teğet), 1 açık (radyale yakın)
    vntG.position.x = twX - 0.1 - s.vntShow * 0.35;
    vntG.scale.setScalar(0.001 + 0.999 * s.vntShow);
    vntG.visible = s.vntShow > 0.01;
    const vAng = 0.3 + s.vnt * 0.95;
    for (const v of vanes) v.rotation.x = vAng;
    vaneMat.emissiveIntensity = s.vntShow * 0.1;

    ember.intensity = s.heat * 7;
    ember.position.set(thX - 1.2, 0.3, 1.4);
    scene.environmentIntensity = 0.62 + s.cool * 0.2;

    // Akış
    phaseC += dt * s.flowSpeed * 0.35;
    phaseH += dt * s.flowSpeed * 0.45;
    coldFlow.material.uniforms.uPhase.value = phaseC;
    hotFlow.material.uniforms.uPhase.value = phaseH;
    coldFlow.material.uniforms.uAlpha.value = s.flow;
    hotFlow.material.uniforms.uAlpha.value = s.flow * (0.3 + s.heat * 0.7);
    coldFlow.material.uniforms.uOff.value = chX - 1.05;
    hotFlow.material.uniforms.uOff.value = thX + 1.1;
    coldFlow.visible = hotFlow.visible = s.flow > 0.01;

    root.rotation.y = s.turn || 0;
    renderer.render(scene, camera);

    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.85) {
      dpr = Math.max(0.85, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  const proj = V(0, 0, 0);
  function project(id) {
    const L = labelPts[id];
    if (!L) return { x: -999, y: -999, z: 2 };
    L.node.updateWorldMatrix(true, false);
    proj.copy(L.local).applyMatrix4(L.node.matrixWorld).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * width, y: (-proj.y * 0.5 + 0.5) * height, z: proj.z };
  }

  return {
    renderer, camera, scene, update, resize, project, readyP,
    isReady: () => ready,
    compile: () => renderer.compile(scene, camera),
  };
}
