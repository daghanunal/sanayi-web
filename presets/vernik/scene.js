// Vernik 3D sahnesi: karanlık, fırınlı boya kabini. Kahraman: lib3d `car` (markasız 5 kapılı hatchback,
// +X'e bakar). Işık: `garage` HDRI + kabin tavan/yan tüpleri (PMREM), tepeden yumuşak PCF gölge,
// masaüstünde aynalı zemin yansıması. Hikâye: astar → boya süpürmesi (kapı açılır, kapı içi de boyanır)
// → vernik (yansıma netleşir) → seramik damlaları → PPF filmi + farlar → döner tabla → araç kabinden çıkar.
// Dışarıya tek bir `state` nesnesi açar; GSAP bu nesnenin alanlarını scroll ile tween'ler.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const PRIMER = new THREE.Color('#5b5e62');
const FRONT = 2.17; // araç uzayında ön tampon (x)
const REAR = -2.125;
const BASE_YAW = Math.PI / 2; // araç +X'e bakar; sahnede önü -Z'ye dönük dursun (kamera pozları buna göre)
const TAU = Math.PI * 2;
// Aynalı yansımada da hareket eden düğümler (her karede kopyaya aktarılır)
const MOVING = ['door_FL', 'door_FR', 'hood', 'tailgate', 'steer_FL', 'steer_FR', 'wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'];

export function createScene(canvas, { reduced = false } = {}) {
  const q = pickQuality();
  const lo = q === 'lo';
  // Aynalı zemin (araba iki kez çizilir): masaüstünde her zaman, telefonda yalnız güçlü cihazda
  const nav = navigator;
  const mirrorOk = !lo || ((nav.hardwareConcurrency || 4) >= 6 && !(nav.deviceMemory && nav.deviceMemory <= 4));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lo ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // koyu kabinde kırmızı doygun kalsın (AgX soldurur)
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const INK = new THREE.Color('#050607');
  scene.background = INK;
  scene.fog = new THREE.Fog(INK, 10, 26);
  scene.environmentIntensity = 0.05;

  const camera = new THREE.PerspectiveCamera(lo ? 34 : 32, 1, 0.1, 80);

  // --- Durum (GSAP bunu tween'ler) ----------------------------------------
  const state = {
    px: -4.6, py: 1.1, pz: -5.6, tx: 0, ty: 0.6, tz: 0, // kamera
    tubes: 0, // kabin ışıkları 0..1
    sweep: 0, // astar → boya
    spray: 0, // tabanca partikülleri
    gloss: 0, // vernik: 0 = mat boya, 1 = ayna
    envRot: 0,
    beads: 0, // seramik damlaları
    sheet: 0, // damlaların akıp gitmesi
    film: 0, // PPF süpürmesi
    head: 0, // farlar
    door: 0, // sol ön kapı (0 kapalı, 1 açık): kapı içi de boyanır
    drive: 0, // araç kendi ekseninde ileri kayar (metre); tekerlekler döner
    steer: 0, // ön tekerlek açısı (radyan)
    spin: 0, // döner tabla hızı
    swap: 1, // renk değişim süpürmesi (1 = tamamlandı)
    viewY: 0,
    viewX: 0,
    fitCar: 0, // dikey ekranda arabayı çerçeveye tam sığdır (0 = yakın plan, serbest)
    rTop: 0.1, // dikey ekranda arabanın kalacağı bant (ekran yüksekliğinin oranı)
    rBot: 0.42,
    fit: 1,
    fitK: 1,
  };

  // --- Ortam: garage HDRI + kabin tüpleri → PMREM ---------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#020203');
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(5.5) });
  const ceil = new THREE.BoxGeometry(0.5, 0.06, 9);
  for (let i = -2; i <= 2; i++) {
    const s = new THREE.Mesh(ceil, tubeMat);
    s.position.set(i * 1.3, 4.3, 0);
    envScene.add(s);
  }
  const side = new THREE.BoxGeometry(0.07, 0.22, 9);
  for (const x of [-5, 5]) {
    for (const y of [1.1, 2.5]) {
      const s = new THREE.Mesh(side, tubeMat);
      s.position.set(x, y, 0);
      envScene.add(s);
    }
  }
  const endPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe8f2').multiplyScalar(1.1), side: THREE.DoubleSide })
  );
  endPanel.position.set(0, 1.7, -7);
  envScene.add(endPanel);
  const floorEnv = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: '#0b0c0e' }));
  floorEnv.rotation.x = -Math.PI / 2;
  envScene.add(floorEnv);
  let envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  function rebuildEnv(hdri) {
    envScene.background = hdri;
    envScene.backgroundIntensity = 0.32;
    const next = pmrem.fromScene(envScene, 0.015);
    scene.environment = next.texture;
    envRT.dispose();
    envRT = next;
  }

  // --- Kabin: zemin, görünür tüpler, anahtar ışık ----------------------------
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#050607', roughness: mirrorOk ? 0.34 : 0.3, metalness: 0,
    transparent: mirrorOk, opacity: mirrorOk ? 0.84 : 1,
    envMapIntensity: mirrorOk ? 0.8 : 0.4, // bulanık ortam yansıması zemini griye boğmasın
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 72), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = 1;
  scene.add(floor);

  // Kabin duvarındaki dikey lamba armatürleri: sisle kaybolan derinlik. Kamera ile araba arasına
  // düşeni söner (dikey ekranda kamera uzaklaşınca halkanın dışına çıkabiliyor).
  const fixtures = [];
  {
    const R = 9.5;
    const N = 14;
    const geo = new THREE.BoxGeometry(0.05, 5.2, 0.05); // zeminin altına da uzanır: aynalı zeminde yansıması
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + 0.12;
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9f1ff').multiplyScalar(1.4), transparent: true, opacity: 0, fog: true });
      const f = new THREE.Mesh(geo, m);
      f.position.set(Math.cos(a) * R, 0.2, Math.sin(a) * R);
      f.renderOrder = 0;
      scene.add(f);
      fixtures.push(f);
    }
  }

  const key = new THREE.DirectionalLight('#f4f7ff', 0);
  key.position.set(0.8, 9, -1.2);
  key.castShadow = true;
  key.shadow.mapSize.set(lo ? 1024 : 2048, lo ? 1024 : 2048);
  key.shadow.radius = lo ? 4 : 6;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 4, far: 14 });
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#9fb4ff', 0);
  fill.position.set(-6, 2.2, 4);
  scene.add(fill);

  // --- Döner tabla ve araç kökü ---------------------------------------------
  const rig = new THREE.Group(); // döner tabla (y ekseni)
  rig.rotation.y = BASE_YAW;
  scene.add(rig);
  const carRoot = new THREE.Group(); // araç uzayı: +X ileri
  rig.add(carRoot);

  // Temas gölgesi: yumuşak AO lekesi (PCF gölgesinin altında, lastik izlerini oturtur)
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(5.3, 2.7),
    new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.92 })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(0.02, 0.004, 0);
  blob.renderOrder = 2;
  carRoot.add(blob);

  // --- Boya malzemesi (astar → boya süpürmesi, renk değişimi) -------------
  const carInv = new THREE.Matrix4();
  const paint = {
    uSweep: { value: 0 },
    uSwap: { value: 1 },
    uOld: { value: new THREE.Color('#7a0911') },
    uNew: { value: new THREE.Color('#7a0911') },
    uPrimer: { value: PRIMER.clone() },
    uGloss: { value: 0 },
    uSpan: { value: new THREE.Vector2(FRONT, REAR) },
    uCarInv: { value: carInv },
    uTime: { value: 0 },
  };
  const paintChunks = (shader) => {
    Object.assign(shader.uniforms, paint);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        uniform float uSweep, uSwap, uGloss, uTime;
        uniform vec3 uOld, uNew, uPrimer;
        uniform vec2 uSpan;
        uniform mat4 uCarInv;
        float vHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(vHash(i), vHash(i+vec3(1,0,0)), f.x), mix(vHash(i+vec3(0,1,0)), vHash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(vHash(i+vec3(0,0,1)), vHash(i+vec3(1,0,1)), f.x), mix(vHash(i+vec3(0,1,1)), vHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float vPaint; float vEdge;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 cp = (uCarInv * vec4(vWPos, 1.0)).xyz;
        cp.y = abs(cp.y); // aynalı kopya
        float s = (uSpan.x - cp.x) / (uSpan.x - uSpan.y); // 0 = ön tampon, 1 = arka
        float n = vNoise(cp * 7.0) * 0.06 + vNoise(cp * 31.0) * 0.02 + cp.y * 0.05;
        float sw = uSweep * 1.14 - 0.07;
        vPaint = smoothstep(sw + 0.012, sw - 0.012, s + n - 0.04);
        vEdge = smoothstep(0.05, 0.0, abs(s + n - 0.04 - sw)) * step(0.001, uSweep) * step(uSweep, 0.999);
        float sp = uSwap * 1.14 - 0.07;
        float swapM = smoothstep(sp + 0.012, sp - 0.012, s + n - 0.04);
        vec3 painted = mix(uOld, uNew, swapM);
        diffuseColor.rgb = mix(uPrimer, painted, vPaint) * diffuseColor.rgb; // taban beyaz: yalnız AO köşe rengi kalır`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.62, mix(0.42, 0.3, uGloss), vPaint);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(0.0, metalnessFactor, vPaint);`
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        material.clearcoat = vPaint * mix(0.55, 1.0, uGloss);
        material.clearcoatRoughness = mix(0.26, 0.02, uGloss);`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uNew * vEdge * 1.4;`
      );
  };

  // --- Tabanca partikülleri (araç uzayında) --------------------------------
  const P = lo ? 240 : 480;
  const pGeo = new THREE.BufferGeometry();
  const seeds = new Float32Array(P * 4);
  for (let i = 0; i < P * 4; i++) seeds[i] = Math.random();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P * 3), 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const sprayU = {
    uTime: paint.uTime,
    uAmount: { value: 0 },
    uNozzle: { value: new THREE.Vector3(0, 0.85, -1.8) },
    uColor: paint.uNew,
    uSize: { value: 26 * renderer.getPixelRatio() },
  };
  const sprayMat = new THREE.ShaderMaterial({
    uniforms: sprayU,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute vec4 seed; uniform float uTime, uAmount, uSize; uniform vec3 uNozzle;
      varying float vA;
      void main(){
        float life = fract(uTime * (0.9 + seed.w * 0.8) + seed.x);
        vec3 dir = normalize(vec3((seed.z - 0.5) * 1.1, (seed.y - 0.5) * 0.9, 1.0)); // sol yandan gövdeye (+Z)
        vec3 p = uNozzle + dir * life * (0.8 + seed.w * 0.5);
        p.y -= life * life * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.25 + life) * (0.4 + seed.y) / -mv.z;
        vA = uAmount * (1.0 - life) * smoothstep(0.0, 0.08, life);
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA;
        gl_FragColor = vec4(uColor * 2.4 + 0.015, a * 0.7);
        #include <colorspace_fragment>
      }`,
  });
  const spray = new THREE.Points(pGeo, sprayMat);
  spray.frustumCulled = false;
  spray.visible = false;
  carRoot.add(spray);

  // --- Seramik damlaları (araç uzayında) -----------------------------------
  const DROPS = lo ? 110 : 200;
  const dropMat = new THREE.MeshPhysicalMaterial({
    color: '#b8c6d4', metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, transparent: true, opacity: 0.3, ior: 1.33,
  });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, lo ? 10 : 14, lo ? 7 : 10), dropMat, DROPS);
  drops.count = 0;
  drops.frustumCulled = false;
  drops.visible = false;
  carRoot.add(drops);
  const dropData = [];
  const m4 = new THREE.Matrix4();
  const qt = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  // --- PPF filmi: gövdenin şişirilmiş kopyası, yanardöner süpürme kenarı ------
  const filmU = { uFilm: { value: 0 }, uSpan: paint.uSpan, uCarInv: paint.uCarInv };
  const filmMat = new THREE.ShaderMaterial({
    uniforms: filmU,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vWPos; varying vec3 vN; varying vec3 vView;
      void main(){
        vec3 p = position + normal * 0.004;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWPos = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uFilm; uniform vec2 uSpan; uniform mat4 uCarInv;
      varying vec3 vWPos; varying vec3 vN; varying vec3 vView;
      void main(){
        vec3 cp = (uCarInv * vec4(vWPos, 1.0)).xyz;
        float s = (uSpan.x - cp.x) / (uSpan.x - uSpan.y);
        float f = uFilm * 0.42; // ön tampon, kaput, çamurluklar
        float on = step(s, f);
        float edge = smoothstep(0.012, 0.0, abs(s - f)) * step(0.001, uFilm) * step(uFilm, 0.999);
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 3.0);
        vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres * 1.4 + cp.y * 0.6 + vec3(0.0, 0.33, 0.67)));
        vec3 col = irid * fres * 0.14 * on + mix(vec3(0.8, 0.92, 1.0), irid, 0.35) * edge * 1.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const filmMeshes = [];

  // --- Far parlamaları -------------------------------------------------------
  const glowTex = makeGlowTexture();
  const headGlows = [];

  // --- Araba -------------------------------------------------------------------
  let car = null;
  let mirror = null;
  const mirrorPairs = [];
  let paintMat = null;
  let lampHead = null;
  let lampTail = null;
  const carBox = new THREE.Box3(new THREE.Vector3(REAR, 0, -0.95), new THREE.Vector3(FRONT, 1.48, 0.95));
  const carCenter = new THREE.Vector3((FRONT + REAR) / 2, 0.66, 0);
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  let fitDelta = 0;
  let ready = false;

  async function load(progressCb = () => {}) {
    let fCar = 0;
    let fEnv = 0;
    const report = () => progressCb(fCar * 0.55 + fEnv * 0.45);
    const envP = loadEnv('garage', renderer, { quality: q })
      .then((t) => {
        fEnv = 1;
        report();
        return t;
      })
      .catch((e) => {
        console.warn('HDRI yüklenemedi', e);
        fEnv = 1;
        return null;
      });
    const carP = loadAsset('car', {
      quality: q,
      renderer,
      onProgress: (f) => {
        fCar = Math.min(0.98, f);
        report();
      },
    });
    const [hdri, asset] = await Promise.all([envP, carP]);
    fCar = 1;
    report();
    if (hdri) rebuildEnv(hdri);
    setupCar(asset);
    try {
      await renderer.compileAsync(scene, camera);
    } catch (_) {}
    ready = true;
  }

  function setupCar(asset) {
    car = asset;
    const root = car.scene;
    carRoot.add(root);

    // Boya: GLB'deki clearcoat boyadan türeyen, süpürme/renk değişimi yapan malzeme
    const src = car.materials.paint;
    paintMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0.45, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.03,
      vertexColors: !!src.vertexColors, normalMap: src.normalMap || null, envMapIntensity: 1,
    });
    if (src.normalMap) paintMat.normalScale.copy(src.normalScale);
    paintMat.name = 'paint';
    paintMat.onBeforeCompile = paintChunks;
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => (m === src ? paintMat : m));
      else if (o.material === src) o.material = paintMat;
    });
    src.dispose();

    lampHead = car.materials.light_head;
    lampTail = car.materials.light_tail;
    // Boş plaka yerine yazılı TR plakası (karanlık kabinde bembeyaz dikdörtgen ucuz duruyor)
    const plate = car.materials.plate_face;
    if (plate) {
      plate.map?.dispose();
      plate.map = makePlateTexture(renderer);
      plate.color.set('#c9cacc');
      plate.needsUpdate = true;
    }
    if (lampHead) lampHead.userData.base = lampHead.emissiveIntensity;
    if (lampTail) lampTail.userData.base = lampTail.emissiveIntensity;

    // PPF filmi: boyalı ön paneller
    for (const n of ['body', 'hood_panel', 'door_FL_panel', 'door_FR_panel']) {
      const node = car.nodes[n];
      if (!node) continue;
      node.traverse((o) => {
        if (!o.isMesh) return;
        const hasPaint = Array.isArray(o.material) ? o.material.includes(paintMat) : o.material === paintMat;
        if (!hasPaint) return;
        const fm = new THREE.Mesh(o.geometry, filmMat);
        fm.renderOrder = 4;
        fm.visible = false;
        fm.castShadow = false;
        fm.receiveShadow = false;
        o.add(fm);
        filmMeshes.push(fm);
      });
    }

    // Far parlamaları: ön lamba grubunun iki ucu
    root.updateMatrixWorld(true);
    const lf = car.nodes.lights_front;
    if (lf) {
      const lb = new THREE.Box3().setFromObject(lf);
      const inv = new THREE.Matrix4().copy(carRoot.matrixWorld).invert();
      lb.applyMatrix4(inv);
      for (const sz of [-1, 1]) {
        const g = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glowTex, color: '#dfeaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false })
        );
        g.position.set(lb.max.x + 0.02, lb.min.y + (lb.max.y - lb.min.y) * 0.55, sz * (lb.max.z - 0.2));
        g.scale.setScalar(0.55);
        g.renderOrder = 5;
        carRoot.add(g);
        headGlows.push(g);
      }
    }

    // Yarı saydam zeminin altında gerçek aynalı yansıma
    if (mirrorOk) {
      mirror = root.clone(true);
      mirror.scale.y = -1;
      mirror.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false;
          o.receiveShadow = false;
          if (o.material === filmMat) o.visible = false;
        }
        if (o.name && MOVING.includes(o.name)) {
          const a = car.nodes[o.name];
          if (a) mirrorPairs.push([a, o]);
        }
      });
      carRoot.add(mirror);
    }

    placeDrops();
  }

  // Damlaları kaput, tavan ve bagaj üstüne yerleştir (aşağı doğru ışın, araç uzayında).
  function placeDrops() {
    const targets = [];
    for (const n of ['body', 'hood_panel', 'tailgate_panel']) {
      const node = car.nodes[n];
      if (node) node.traverse((o) => o.isMesh && o.material !== filmMat && targets.push(o));
    }
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const inv = new THREE.Matrix4();
    const tries = DROPS * 3;
    let i = 0;
    const step = () => {
      carRoot.updateMatrixWorld(true);
      inv.copy(carRoot.matrixWorld).invert();
      const end = Math.min(i + 20, tries);
      for (; i < end && dropData.length < DROPS; i++) {
        const x = THREE.MathUtils.lerp(REAR + 0.35, FRONT - 0.25, Math.random());
        const z = THREE.MathUtils.lerp(-0.72, 0.72, Math.random());
        const o = new THREE.Vector3(x, 3, z).applyMatrix4(carRoot.matrixWorld);
        const d = down.clone().transformDirection(carRoot.matrixWorld);
        ray.set(o, d);
        const hit = ray.intersectObjects(targets, false)[0];
        if (!hit || !hit.face) continue;
        const mat = Array.isArray(hit.object.material) ? hit.object.material[hit.face.materialIndex] : hit.object.material;
        if (mat !== paintMat) continue;
        const p = hit.point.clone().applyMatrix4(inv);
        const nrm = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(inv);
        if (nrm.y < 0) nrm.negate();
        if (nrm.y < 0.55) continue;
        dropData.push({ p, n: nrm, r: 0.007 + Math.random() ** 2 * 0.02, k: Math.random(), side: Math.sign(z) || 1 });
      }
      drops.count = dropData.length;
      if (i < tries && dropData.length < DROPS) (window.requestIdleCallback || setTimeout)(step);
    };
    step();
  }

  // --- Boyut ---------------------------------------------------------------
  let W = 0;
  let H = 0;
  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    if (w === W && Math.abs(h - H) < 140) return; // adres çubuğu gidip gelince
    W = w;
    H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    state.fit = w / h < 1 ? Math.min(2.4, 1.02 / (w / h)) : w / h < 1.3 ? 1.28 : 1;
    state.viewY = w / h < 1 ? 0.11 : 0;
    state.viewX = w / h >= 1.2 ? -0.16 : 0;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // --- Döngü ----------------------------------------------------------------
  const timer = new THREE.Timer();
  const target = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  let running = false;
  let paused = document.hidden;
  let lastDrive = 0;
  let yaw = 0;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) timer.update();
  });

  function frame() {
    if (paused) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    paint.uTime.value = t;

    // Döner tabla
    yaw += dt * 0.32 * state.spin;
    if (state.spin < 0.01 && Math.abs(yaw) > 0.0001) {
      const goal = Math.round(yaw / TAU) * TAU; // film bölümüne dönünce en yakın tam tura otur
      yaw += (goal - yaw) * Math.min(1, dt * 3);
    }
    rig.rotation.y = BASE_YAW + yaw;

    // Araç hareketi: ileri kayma → tekerlekler döner; döner tablada tekerlekler de döner
    carRoot.position.x = state.drive;
    if (car) {
      const dd = state.drive - lastDrive;
      lastDrive = state.drive;
      car.roll(dd);
      const n = car.nodes;
      if (n.steer_FL) n.steer_FL.rotation.y = state.steer;
      if (n.steer_FR) n.steer_FR.rotation.y = state.steer;
      if (n.door_FL) n.door_FL.rotation.y = -1.05 * state.door;
      for (const [a, b] of mirrorPairs) {
        b.position.copy(a.position);
        b.quaternion.copy(a.quaternion);
      }
    }
    rig.updateMatrixWorld(true);
    carInv.copy(carRoot.matrixWorld).invert();

    // Kamera
    target.set(state.tx, state.ty, state.tz);
    const portrait = W / H < 1;
    if (portrait && state.fitCar > 0.001) fitPortrait(dt);
    else {
      scene.fog.near = 10;
      scene.fog.far = 26;
      camera.position.set(state.px, state.py, state.pz).sub(target).multiplyScalar(1 + (state.fit - 1) * state.fitK).add(target);
      camera.lookAt(target);
      if (state.viewY || state.viewX) camera.setViewOffset(W, H, W * state.viewX, H * state.viewY, W, H);
      else camera.clearViewOffset();
    }

    // Işıklar: kabin tüpleri yanınca ortam, anahtar ışık ve armatürler birlikte gelir
    const tub = state.tubes;
    scene.environmentIntensity = 0.03 + tub * (0.9 + state.gloss * 0.35);
    scene.environmentRotation.y = state.envRot;
    key.intensity = tub * 0.9;
    fill.intensity = tub * 0.35;
    renderer.toneMappingExposure = 0.5 + tub * 0.45;
    floorMat.opacity = mirrorOk ? 0.86 : 1;

    // Armatürler: kameradan bakınca arabanın önüne düşeni söndür
    const camD = tmpA.copy(target).sub(camera.position);
    const len = camD.length();
    camD.divideScalar(len);
    for (const f of fixtures) {
      const along = tmpB.copy(f.position).sub(camera.position).dot(camD) / len;
      const k = THREE.MathUtils.smoothstep(along, 1.05, 1.45);
      f.material.opacity = tub * k * 0.5;
      f.visible = f.material.opacity > 0.01;
    }

    paint.uSweep.value = state.sweep;
    paint.uGloss.value = state.gloss;
    paint.uSwap.value = state.swap;
    filmU.uFilm.value = state.film;

    // Tabanca: süpürme cephesinde, arabanın sol yanında (araç uzayı -Z)
    const s = state.sweep < 0.999 ? state.sweep : state.swap;
    const xf = THREE.MathUtils.lerp(FRONT, REAR, s);
    sprayU.uNozzle.value.set(xf, 0.78 + Math.sin(t * 7) * 0.05, -1.75);
    sprayU.uAmount.value = state.spray;
    spray.visible = state.spray > 0.01;

    // Farlar
    if (lampHead) lampHead.emissiveIntensity = (lampHead.userData.base || 1) * (0.35 + tub * 0.65) + state.head * 5;
    if (lampTail) lampTail.emissiveIntensity = (lampTail.userData.base || 1) + state.head * 2.5;
    for (const g of headGlows) g.material.opacity = state.head * (0.62 + Math.sin(t * 30) * 0.02);

    // Damlalar
    if (state.beads > 0.001 && dropData.length) {
      drops.visible = true;
      dropMat.opacity = 0.32 * (1 - state.sheet * 0.9);
      for (let i = 0; i < dropData.length; i++) {
        const dd = dropData[i];
        const g = THREE.MathUtils.clamp(state.beads * 1.6 - dd.k * 0.6, 0, 1);
        const sh = THREE.MathUtils.clamp(state.sheet * 1.5 - dd.k * 0.5, 0, 1);
        v3.copy(dd.p);
        v3.z += dd.side * sh * sh * 1.2;
        v3.y -= sh * sh * sh * 1.1;
        const r = dd.r * g * (1 - sh * 0.4);
        qt.setFromUnitVectors(UP, dd.n);
        sc.set(r * (1 + sh * 2.5), r * 0.6, r);
        m4.compose(v3, qt, sc);
        drops.setMatrixAt(i, m4);
      }
      drops.instanceMatrix.needsUpdate = true;
    } else drops.visible = false;

    const filmOn = state.film > 0.001 && state.film < 1.2;
    for (const fm of filmMeshes) fm.visible = filmOn;

    renderer.render(scene, camera);
  }

  // Dikey ekran: arabanın kutusunu [rTop, rBot] bandına sığdır. Kamera bakış ekseni boyunca
  // ileri/geri gider, bant merkezi view offset ile kaydırılır.
  const tmp = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  function fitPortrait(dt) {
    const k = state.fitCar;
    // kadraj aracın durma yerine göre (final: araç uzaktan gelip bu kadraja oturur)
    tgt.set(state.tx, state.ty, state.tz).lerp(tmp.copy(carCenter).applyMatrix4(rig.matrixWorld), k);
    const base = tmp.set(state.px, state.py, state.pz).sub(target);
    const d0 = base.length() * (1 + (state.fit - 1) * state.fitK);
    base.normalize();
    camera.position.copy(tgt).addScaledVector(base, d0);
    camera.lookAt(tgt);
    camera.updateMatrixWorld();

    const { min, max } = carBox;
    const spinning = state.spin > 0.01;
    let i = 0;
    if (spinning) {
      // döner tablada sabit boy: kameraya hizalı, yarı genişliği arabanın yarı boyu kadar kare
      const R = (max.x - min.x) / 2;
      const c = tmpA.copy(carCenter).applyMatrix4(rig.matrixWorld);
      right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      fwd.set(-right.z, 0, right.x);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [min.y, max.y]) {
        corners[i++].set(c.x, y, c.z).addScaledVector(right, sx * R).addScaledVector(fwd, sz * 0.45 * R)
          .applyMatrix4(camera.matrixWorldInverse);
      }
    } else {
      for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) {
        corners[i++].set(x ? max.x : min.x, y ? max.y : min.y, z ? max.z : min.z)
          .applyMatrix4(rig.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      }
    }
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    const half = state.rBot - state.rTop;
    const wFill = spinning ? 0.92 : 0.98;
    let need = -Infinity;
    for (const c of corners) {
      const depth = -c.z;
      need = Math.max(need, Math.abs(c.x) / (tanH * wFill) - depth, Math.abs(c.y) / (tanV * half * 0.96) - depth);
    }
    fitDelta += (need - fitDelta) * Math.min(1, dt * 10 || 1);
    camera.position.addScaledVector(base, fitDelta * k);
    const dist = camera.position.distanceTo(tgt);
    scene.fog.near = Math.max(10, dist + 3);
    scene.fog.far = Math.max(26, dist + 16);
    const centerNdc = 1 - (state.rTop + state.rBot);
    const offY = THREE.MathUtils.lerp(H * state.viewY, (centerNdc * H) / 2, k);
    camera.setViewOffset(W, H, 0, offY, W, H);
  }

  function setActive(on) {
    if (on === running) return;
    running = on;
    if (on) timer.update();
    renderer.setAnimationLoop(on ? frame : null);
  }

  function setPaint(hex, { instant = false } = {}) {
    paint.uOld.value.copy(instant ? new THREE.Color(hex) : paint.uNew.value);
    paint.uNew.value.set(hex);
  }

  return {
    state, load, setActive, setPaint, resize, renderOnce: frame, quality: q,
    get ready() { return ready; },
    get active() { return running; },
  };
}

function makePlateTexture(renderer) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 224;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f2';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#123f9e';
  g.fillRect(0, 0, 92, c.height);
  g.fillStyle = '#fff';
  g.font = '700 46px Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('TR', 46, 190);
  g.fillStyle = '#111';
  g.font = '700 150px "Arial Narrow", Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('06 PK 2008', 92 + (c.width - 92) / 2, c.height / 2 + 8);
  g.lineWidth = 10;
  g.strokeStyle = '#111';
  g.strokeRect(5, 5, c.width - 10, c.height - 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false; // glTF UV düzeni
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,.42)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Aracın altındaki yumuşak temas gölgesi (dikdörtgen, kenarları eriyen)
function blobTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 256; x++) {
      const u = Math.abs((x + 0.5) / 128 - 1);
      const v = Math.abs((y + 0.5) / 64 - 1);
      const dx = Math.max(0, u - 0.72) / 0.28;
      const dy = Math.max(0, v - 0.6) / 0.4;
      const d = Math.min(1, Math.hypot(dx, dy));
      const a = Math.pow(1 - d, 1.8) * 0.85;
      const i = (y * 256 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
