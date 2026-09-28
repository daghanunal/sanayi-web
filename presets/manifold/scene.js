// Manifold sahnesi (künye + Hizmetler): lib3d gerçekçi egzoz hattı (manifold → katalitik → DPF → susturucu → uç),
// karanlık stüdyoda havada asılı; garaj HDRI yansımaları, sıcak üst spot + soğuk kontur, yumuşak gölge.
// Durak yakın planlarında parça hattan hafifçe çıkar, yanında kesit dilimi belirir (katalitik peteği,
// DPF'nin temizlenen hücreleri, susturucu bölmesi). Uçtan çıkan duman kirliden temize döner.
// Durum dışarıdan `update(state)` ile verilir; sahne kendi başına kamera kararı vermez.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const LIFT = 0.34; // hat yerden bu kadar yüksekte asılı

function radialTex(stops, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grd.addColorStop(o, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const HONEY_FRAG = `
  varying vec2 vUv; uniform float uKind, uSoot, uClean, uTime, uGlow, uAlpha;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  vec4 hex(vec2 p){
    vec2 s = vec2(1.0, 1.7320508);
    vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h4 = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
    return dot(h4.xy, h4.xy) < dot(h4.zw, h4.zw) ? vec4(h4.xy, hc.xy) : vec4(h4.zw, hc.zw + 9.73);
  }
  void main(){
    vec2 c = vUv - 0.5; float r = length(c) * 2.0;
    if (r > 1.0) discard;
    vec4 hx = hex(c * 26.0);
    vec2 g = abs(hx.xy); float edge = max(dot(g, normalize(vec2(1.0, 1.7320508))), g.x);
    float wall = smoothstep(0.39, 0.46, edge);
    float n = h(hx.zw);
    vec3 ceramic = vec3(0.80, 0.76, 0.68);
    vec3 cell = vec3(0.11, 0.09, 0.08);
    if (uKind < 0.5) { // katalitik: değerli metal kaplı petek, çalışırken kor gibi ısınır
      float sh = pow(max(0.0, sin(n * 40.0 + uTime * 2.4)), 14.0) * uGlow;
      ceramic = mix(ceramic * 0.82, vec3(0.95, 0.92, 0.86), sh);
      cell = mix(vec3(0.14, 0.09, 0.06), vec3(0.95, 0.46, 0.14), uGlow * 0.5 * (0.6 + 0.4 * sin(uTime * 3.0 + n * 6.0)));
    } else { // DPF: is dolu hücreler merkezden dışa temizlenir
      float dirty = step(n, uSoot) * (1.0 - smoothstep(uClean * 1.3 - 0.14, uClean * 1.3, r));
      cell = mix(vec3(0.24, 0.21, 0.18), vec3(0.03, 0.025, 0.02), dirty);
      ceramic = mix(ceramic, vec3(0.13, 0.11, 0.10), dirty * 0.85);
    }
    vec3 col = mix(cell, ceramic, wall);
    col *= 1.0 - smoothstep(0.8, 1.0, r) * 0.55;
    gl_FragColor = vec4(col, uAlpha);
    #include <colorspace_fragment>
  }`;

const BAFFLE_FRAG = `
  varying vec2 vUv; uniform float uAlpha;
  void main(){
    vec2 c = vUv - 0.5; float r = length(c) * 2.0; if (r > 1.0) discard;
    vec2 g = fract(vUv * 17.0) - 0.5; float hole = step(length(g), 0.26);
    if (abs(c.x) < 0.13 && abs(c.y) < 0.13) hole = 1.0;
    if (r < 0.2 && abs(c.x - 0.28) < 0.1) hole = 1.0;
    if (hole > 0.5) discard;
    vec3 col = mix(vec3(0.62, 0.64, 0.67), vec3(0.3, 0.31, 0.34), r);
    gl_FragColor = vec4(col, uAlpha);
    #include <colorspace_fragment>
  }`;
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

export function createScene(canvas) {
  const q = pickQuality();
  const lo = q === 'lo';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = Math.min(devicePixelRatio || 1, lo ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.02, 40);
  scene.add(camera);

  // Işık: tavandan sıcak spot (gölge), arkadan soğuk mavi kontur, manifold kızarınca turuncu yansıma
  const key = new THREE.SpotLight(0xffe2bf, 90, 12, 0.62, 0.85, 2);
  key.position.set(0.6, 3.6, 2.3);
  key.target.position.set(0, LIFT, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 4;
  key.shadow.camera.near = 1.2;
  key.shadow.camera.far = 8;
  const rim = new THREE.DirectionalLight(0x86a4ff, 1.4);
  rim.position.set(-2.5, 2.2, -4);
  const fill = new THREE.HemisphereLight(0xb8c6e0, 0x120e0b, 0.25);
  const heatLight = new THREE.PointLight(0xff5a1a, 0, 1.6, 2);
  scene.add(key, key.target, rim, fill, heatLight);

  // Zemin: yalnız gölgeyi ve spotun sıcak havuzunu taşır (tuval saydam, arka plan CSS'te)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 4.2),
    new THREE.MeshBasicMaterial({
      map: radialTex([[0, 'rgba(255,214,160,0.34)'], [0.45, 'rgba(255,190,130,0.12)'], [1, 'rgba(255,180,120,0)']]),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.002;
  scene.add(pool);

  const rig = new THREE.Group();
  rig.rotation.y = Math.PI; // motor solda, uç sağda (hikâye soldan sağa okunur)
  rig.position.y = LIFT;
  scene.add(rig);

  // --- Kesit dilimleri ------------------------------------------------------
  const honeyMat = (kind) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: VERT, fragmentShader: HONEY_FRAG,
    uniforms: { uKind: { value: kind }, uSoot: { value: 0.92 }, uClean: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0 }, uAlpha: { value: 0 } },
  });
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.32, transparent: true, opacity: 0, side: THREE.DoubleSide });
  function makeSlice(faceMat, r) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CircleGeometry(r, 64), faceMat);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, r * 0.28, 64, 1, true), shellMat);
    band.rotation.x = Math.PI / 2;
    band.position.z = -r * 0.14;
    face.renderOrder = 3;
    g.add(face, band);
    g.visible = false;
    scene.add(g);
    return { g, face, mat: faceMat };
  }
  const slices = {
    catalyst: makeSlice(honeyMat(0), 0.1),
    dpf: makeSlice(honeyMat(1), 0.105),
    muffler: makeSlice(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: VERT, fragmentShader: BAFFLE_FRAG, uniforms: { uAlpha: { value: 0 } } }), 0.13),
  };

  // --- Uç dumanı ------------------------------------------------------------
  const puff = radialTex([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']], 64);
  const PN = lo ? 70 : 140;
  const plumeGeo = new THREE.BufferGeometry();
  const plumePos = new Float32Array(PN * 3);
  const plumeAge = new Float32Array(PN);
  const plumeSeed = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    plumeAge[i] = Math.random();
    plumeSeed.set([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], i * 3);
  }
  plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePos, 3));
  plumeGeo.setAttribute('aAge', new THREE.BufferAttribute(plumeAge, 1));
  const plumeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: puff }, uDirt: { value: 1 }, uSize: { value: 100 }, uAlpha: { value: 1 } },
    vertexShader: `
      attribute float aAge; varying float vAge; uniform float uSize;
      void main(){
        vAge = aAge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.2 + aAge * 1.4) / max(0.05, -mv.z);
      }`,
    fragmentShader: `
      varying float vAge; uniform sampler2D uMap; uniform float uDirt, uAlpha;
      void main(){
        float a = texture2D(uMap, gl_PointCoord).a;
        vec3 col = mix(vec3(0.86, 0.9, 0.95), vec3(0.07, 0.06, 0.05), uDirt);
        float op = (1.0 - vAge) * smoothstep(0.0, 0.08, vAge) * mix(0.16, 0.5, uDirt);
        gl_FragColor = vec4(col, a * op * uAlpha);
      }`,
  });
  const plume = new THREE.Points(plumeGeo, plumeMat);
  plume.frustumCulled = false;
  scene.add(plume);

  // --- Spot ışığında süzülen toz -------------------------------------------
  const DN = lo ? 40 : 90;
  const dustPos = new Float32Array(DN * 3);
  const dustSeed = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dustPos.set([(Math.random() - 0.5) * 5, Math.random() * 2.4, (Math.random() - 0.5) * 2.6], i * 3);
    dustSeed[i] = Math.random() * 10;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: puff, size: 0.012, sizeAttenuation: true, color: 0xffd9a8, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  // --- Varlık yükleme -------------------------------------------------------
  let A = null;
  const parts = {}; // ad → { node, base, dir }
  const focusInfo = {}; // ad → { c: Vector3 (dünya), s: sayı }
  const tip = { p: new THREE.Vector3(1.96, LIFT + 0.05, -0.25), t: new THREE.Vector3(1, 0, 0) };
  let heatMat = null;
  let ready = false;

  const readyP = (async () => {
    const [env, asset] = await Promise.all([
      loadEnv('garage', renderer, { quality: q }),
      loadAsset('exhaust', { quality: q, renderer }),
    ]);
    scene.environment = env;
    A = asset;
    rig.add(A.scene);
    // Patlatma uçları: explode(1) → uç, explode(0) → taban (parça başına ayrı oynatmak için)
    const names = ['manifold', 'flex', 'downpipe', 'catalyst', 'dpf', 'midpipe', 'resonator', 'muffler', 'tailpipe', 'hangers'];
    const bases = names.map((n) => A.nodes[n] && A.nodes[n].position.clone());
    A.explode(1);
    const ends = names.map((n) => A.nodes[n] && A.nodes[n].position.clone());
    A.explode(0);
    names.forEach((n, i) => {
      if (!A.nodes[n]) return;
      parts[n] = { node: A.nodes[n], base: bases[i], dir: ends[i].clone().sub(bases[i]) };
    });
    rig.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const n of ['manifold', 'catalyst', 'dpf', 'muffler', 'tailpipe', 'exhaust']) {
      const node = A.nodes[n];
      if (!node) continue;
      box.setFromObject(node);
      const size = box.getSize(new THREE.Vector3());
      focusInfo[n] = { c: box.getCenter(new THREE.Vector3()), s: Math.max(size.x, size.y, size.z), box: box.clone() };
    }
    const chrome = A.nodes.tailpipe_2 || A.nodes.tailpipe;
    if (chrome) {
      box.setFromObject(chrome);
      const c = box.getCenter(new THREE.Vector3());
      tip.p.set(box.max.x + 0.005, c.y, c.z);
    }
    // Malzeme ince ayarı
    const M = A.materials;
    heatMat = M.steel_heat || null;
    if (heatMat) {
      heatMat.emissive = new THREE.Color(0xff4410);
      heatMat.emissiveIntensity = 0;
      if (heatMat.map) heatMat.emissiveMap = heatMat.map;
    }
    if (M.stainless) M.stainless.roughness = 0.24;
    if (M.chrome) M.chrome.roughness = 0.05;
    heatLight.position.copy(focusInfo.manifold ? focusInfo.manifold.c : new THREE.Vector3(-1.8, LIFT + 0.3, 0)).add(new THREE.Vector3(0, 0.1, 0.25));
    ready = true;
  })();

  let width = 1, height = 1;
  function resize() {
    width = canvas.clientWidth || innerWidth;
    height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    plumeMat.uniforms.uSize.value = 150 * dpr * (height / 900);
  }
  resize();

  let slowFrames = 0;
  let last = performance.now();
  const tmp = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camR = new THREE.Vector3(), camU = new THREE.Vector3();

  function update(s, now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    camera.position.copy(s.pos);
    if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(s.look);
    camera.updateMatrixWorld();
    camPos.copy(camera.position);

    if (ready) {
      // Parça çıkışları (patlatma vektörünün bir kısmı kadar)
      for (const [n, p] of Object.entries(parts)) {
        const k = (s.ex && s.ex[n]) || 0;
        p.node.position.copy(p.base).addScaledVector(p.dir, k);
      }
      if (heatMat) heatMat.emissiveIntensity = s.heat * s.heat * 0.28;
      heatLight.intensity = s.heat * 1.6;

      // Kesit dilimleri: parçanın önüne (kameraya doğru) kayar, kameraya döner
      shellMat.opacity = Math.max(...Object.keys(slices).map((n) => clamp(s.slice[n] || 0)));
      for (const [n, sl] of Object.entries(slices)) {
        const a = clamp(s.slice[n] || 0);
        sl.g.visible = a > 0.01;
        if (!sl.g.visible) continue;
        const f = focusInfo[n];
        const k = s.ex && s.ex[n] ? s.ex[n] : 0;
        const p = parts[n];
        tmp.copy(f.c);
        if (p) tmp.add(p.dir.clone().applyQuaternion(rig.quaternion).multiplyScalar(k));
        // kamera uzayında kaydır: masaüstünde parçanın solu-üstü (ekran ortasına doğru), telefonda sol-üstü
        const [ox, oy] = s.sliceOff || [-0.16, 0.1];
        camR.setFromMatrixColumn(camera.matrixWorld, 0);
        camU.setFromMatrixColumn(camera.matrixWorld, 1);
        sl.g.position.copy(tmp).addScaledVector(camR, ox * (0.6 + 0.4 * a)).addScaledVector(camU, oy * (0.6 + 0.4 * a));
        sl.g.lookAt(camPos);
        sl.g.scale.setScalar((s.sliceScale || 0.8) * (0.7 + 0.3 * a));
        sl.mat.uniforms.uAlpha.value = a;
      }
      const hc = slices.catalyst.mat.uniforms;
      hc.uTime.value = t;
      hc.uGlow.value = s.cat;
      slices.dpf.mat.uniforms.uClean.value = s.dpf;
    }

    // Uç dumanı
    plumeMat.uniforms.uDirt.value = s.plumeDirt;
    plumeMat.uniforms.uAlpha.value = s.plumeAlpha;
    plume.visible = s.plumeAlpha > 0.01;
    if (plume.visible) {
      const speed = 0.42 + s.speed * 0.3;
      for (let i = 0; i < PN; i++) {
        let age = plumeAge[i] + dt * speed;
        if (age > 1) age -= 1;
        plumeAge[i] = age;
        const k = i * 3;
        const spread = 0.015 + age * 0.3;
        plumePos[k] = tip.p.x + age * 1.25 + plumeSeed[k] * spread;
        plumePos[k + 1] = tip.p.y + plumeSeed[k + 1] * spread + age * age * 0.32;
        plumePos[k + 2] = tip.p.z + plumeSeed[k + 2] * spread;
      }
      plumeGeo.attributes.position.needsUpdate = true;
      plumeGeo.attributes.aAge.needsUpdate = true;
    }

    // Toz: yavaş yükselip salınır
    for (let i = 0; i < DN; i++) {
      const k = i * 3;
      dustPos[k + 1] += dt * 0.03;
      if (dustPos[k + 1] > 2.4) dustPos[k + 1] = 0;
      dustPos[k] += Math.sin(t * 0.3 + dustSeed[i]) * dt * 0.02;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);

    // Uyarlanır kalite: yavaş kareler birikirse çözünürlüğü düşür
    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.9) {
      dpr = Math.max(0.9, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  return {
    renderer, camera, scene, update, resize, readyP, tip,
    isReady: () => ready,
    focus: (n) => focusInfo[n],
    compile: () => renderer.compile(scene, camera),
  };
}
