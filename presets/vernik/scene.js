// Vernik 3D sahnesi: boya kabini, araba, astar→boya süpürmesi, vernik, seramik damlaları, PPF.
// Dışarıya tek bir `state` nesnesi açar; GSAP bu nesnenin alanlarını scroll ile tween'ler.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const PRIMER = new THREE.Color('#5d6064');
// Telefonda dışarıdan seçilmeyen iç detaylar çizilmez (~87 bin üçgen)
const HIDDEN_ON_PHONE = /^(interior_light|steering_.*|carbon_fibre_trim|carpet|metal|blue)$/;

export function createScene(canvas, { lowPower = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, powerPreference: 'high-performance', alpha: false,
  });
  const dprCap = lowPower ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const INK = new THREE.Color('#050607');
  scene.background = INK;
  scene.fog = new THREE.Fog(INK, 9, 22);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  // --- Durum (GSAP bunu tween'ler) ----------------------------------------
  const state = {
    px: -4.6, py: 1.1, pz: -5.6, tx: 0, ty: 0.55, tz: 0, // kamera
    tubes: 0, // kabin ışıkları 0..1
    sweep: 0, // astar → boya
    spray: 0, // tabanca partikülleri
    gloss: 0, // vernik: 0 = mat boya, 1 = ayna
    envRot: 0,
    beads: 0, // seramik damlaları
    sheet: 0, // damlaların akıp gitmesi
    film: 0, // PPF süpürmesi
    head: 0, // farlar
    spin: 0, // döner tabla hızı
    swap: 1, // renk değişim süpürmesi (1 = tamamlandı)
    viewY: 0, // mobilde arabayı yukarı almak için görüntü kaydırma
    viewX: 0, // masaüstünde arabayı sağa almak için
    fitCar: 0, // dikey ekranda arabayı çerçeveye tam sığdır (0 = yakın plan, serbest)
    rTop: 0.1, // dikey ekranda arabanın kalacağı bant (ekran yüksekliğinin oranı)
    rBot: 0.42,
    fit: 1,
    fitK: 1, // yakın planlarda mobil uzaklaştırmayı azaltır
  };

  // --- Ortam (yansımalar): kabin tüpleri ----------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#020203');
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(6) });
  const stripGeo = new THREE.BoxGeometry(0.35, 0.08, 9);
  for (let i = -2; i <= 2; i++) {
    const s = new THREE.Mesh(stripGeo, stripMat);
    s.position.set(i * 1.25, 4.2, 0);
    envScene.add(s);
  }
  const sideGeo = new THREE.BoxGeometry(0.06, 0.25, 9);
  for (const x of [-5, 5]) {
    for (const y of [1.2, 2.6]) {
      const s = new THREE.Mesh(sideGeo, stripMat);
      s.position.set(x, y, 0);
      envScene.add(s);
    }
  }
  const warm = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 1.4),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe8f2').multiplyScalar(1.2), side: THREE.DoubleSide })
  );
  warm.position.set(0, 1.6, -7);
  envScene.add(warm);
  const floorEnv = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: '#0c0d0f' }));
  floorEnv.rotation.x = -Math.PI / 2;
  envScene.add(floorEnv);
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;

  // --- Kabin: zemin ve tavan tüpleri -------------------------------------
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(16, 64),
    // Masaüstünde altındaki aynalı araba bu yarı saydam zeminden görünür
    new THREE.MeshBasicMaterial({ color: '#050607', transparent: true, opacity: lowPower ? 1 : 0.78 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = 1;
  scene.add(floor);

  const glowTex = makeGlowTexture();
  scene.add(new THREE.HemisphereLight('#9aa7b4', '#050505', 0.25));
  const key = new THREE.DirectionalLight('#ffffff', 0);
  key.position.set(-3, 6, -2);
  scene.add(key);

  // --- Boya malzemesi (astar → boya süpürmesi, renk değişimi) -------------
  const paint = {
    uSweep: { value: 0 },
    uSwap: { value: 1 },
    uOld: { value: new THREE.Color('#8e0b14') },
    uNew: { value: new THREE.Color('#8e0b14') },
    uPrimer: { value: PRIMER.clone() },
    uGloss: { value: 0 },
    uZ: { value: new THREE.Vector2(-2.4, 2.4) }, // ön ve arka z
    uTime: { value: 0 },
  };
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.3, envMapIntensity: 1,
  });
  bodyMat.onBeforeCompile = (shader) => {
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
        uniform vec2 uZ;
        float vHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float vNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(vHash(i), vHash(i+vec3(1,0,0)), f.x), mix(vHash(i+vec3(0,1,0)), vHash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(vHash(i+vec3(0,0,1)), vHash(i+vec3(1,0,1)), f.x), mix(vHash(i+vec3(0,1,1)), vHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float vPaint; float vEdge;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float s = (vWPos.z - uZ.x) / (uZ.y - uZ.x);
        float n = vNoise(vWPos * 7.0) * 0.06 + vNoise(vWPos * 31.0) * 0.02;
        float sw = uSweep * 1.12 - 0.06;
        vPaint = smoothstep(sw + 0.012, sw - 0.012, s + n - 0.04);
        vEdge = smoothstep(0.05, 0.0, abs(s + n - 0.04 - sw)) * step(0.001, uSweep) * step(uSweep, 0.999);
        float sp = uSwap * 1.12 - 0.06;
        float swapM = smoothstep(sp + 0.012, sp - 0.012, s + n - 0.04);
        vec3 painted = mix(uOld, uNew, swapM);
        diffuseColor.rgb = mix(uPrimer, painted, vPaint);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.46, mix(0.42, 0.16, uGloss), vPaint);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(0.0, metalnessFactor, vPaint);`
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        material.clearcoat = vPaint * mix(0.35, 1.0, uGloss);
        material.clearcoatRoughness = mix(0.35, 0.015, uGloss);`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uNew * vEdge * 1.6;`
      );
  };

  const chromeMat = new THREE.MeshStandardMaterial({ color: '#e8ecf0', metalness: 1, roughness: 0.12 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 1, roughness: 0.22 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b0d10', metalness: 0.2, roughness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 1.6,
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: '#dfe7ee', metalness: 0.6, roughness: 0.1, emissive: new THREE.Color('#eaf3ff'), emissiveIntensity: 0,
  });

  // --- Araba --------------------------------------------------------------
  const car = new THREE.Group();
  scene.add(car);
  let carReflect = null;
  let bodyMesh = null;
  const wheels = [];
  const carBox = new THREE.Box3(new THREE.Vector3(-1.1, 0, -2.3), new THREE.Vector3(1.1, 1.25, 2.3));
  const carCenter = new THREE.Vector3(0, 0.6, 0);
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  let fitDelta = 0;
  const headGlows = [];

  // PPF filmi: gövdenin biraz şişirilmiş kopyası, yanardöner kenar çizgisi
  const filmUniforms = { uFilm: { value: 0 }, uZ: paint.uZ, uTime: paint.uTime };
  const filmMat = new THREE.ShaderMaterial({
    uniforms: filmUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vWPos; varying vec3 vN; varying vec3 vView;
      void main(){
        vec3 p = position + normal * 0.006;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWPos = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uFilm, uTime; uniform vec2 uZ;
      varying vec3 vWPos; varying vec3 vN; varying vec3 vView;
      void main(){
        float s = (vWPos.z - uZ.x) / (uZ.y - uZ.x);
        float f = uFilm * 0.62; // filmi ön yarıya uygula
        float on = step(s, f);
        float edge = smoothstep(0.012, 0.0, abs(s - f)) * step(0.001, uFilm) * step(uFilm, 0.999);
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), 3.0);
        vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres * 1.4 + vWPos.y * 0.6 + vec3(0.0, 0.33, 0.67)));
        vec3 col = irid * fres * 0.12 * on + mix(vec3(0.8,0.92,1.0), irid, 0.35) * edge * 1.1;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  let filmMesh = null;

  // --- Tabanca partikülleri ------------------------------------------------
  const P = lowPower ? 260 : 520;
  const pGeo = new THREE.BufferGeometry();
  const seeds = new Float32Array(P * 4);
  for (let i = 0; i < P * 4; i++) seeds[i] = Math.random();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P * 3), 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  const sprayU = {
    uTime: paint.uTime,
    uAmount: { value: 0 },
    uNozzle: { value: new THREE.Vector3(-1.7, 0.85, 0) },
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
        vec3 dir = normalize(vec3(1.0, (seed.y - 0.5) * 0.9, (seed.z - 0.5) * 1.1));
        vec3 p = uNozzle + dir * life * (0.9 + seed.w * 0.6);
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
  scene.add(spray);

  // --- Seramik damlaları ---------------------------------------------------
  const DROPS = lowPower ? 110 : 190;
  const dropMat = new THREE.MeshStandardMaterial({
    color: '#ffffff', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.5, envMapIntensity: 2.6,
  });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), dropMat, DROPS);
  drops.count = 0;
  drops.frustumCulled = false;
  scene.add(drops);
  const dropData = []; // {p: Vector3, r, side}
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  // --- Yükleme ------------------------------------------------------------
  const manager = new THREE.LoadingManager();
  let onProgress = () => {};
  manager.onProgress = (_, loaded, total) => onProgress(loaded / total);

  function load(progressCb) {
    if (progressCb) onProgress = progressCb;
    const draco = new DRACOLoader(manager);
    draco.setDecoderPath(import.meta.env.BASE_URL + 'draco/');
    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(draco);
    const aoTex = new THREE.TextureLoader(manager).load(import.meta.env.BASE_URL + 'models/ferrari_ao.png');

    return new Promise((resolve, reject) => {
      loader.load(
        import.meta.env.BASE_URL + 'models/ferrari.glb',
        (gltf) => {
          const model = gltf.scene.children[0];
          model.traverse((o) => {
            if (!o.isMesh) return;
            const n = o.name;
            if (lowPower && HIDDEN_ON_PHONE.test(n)) {
              o.visible = false;
              return;
            }
            if (n === 'body') {
              o.material = bodyMat;
              bodyMesh = o;
            } else if (n.startsWith('rim_') || n === 'trim') o.material = rimMat;
            else if (n === 'chrome' || n === 'nuts') o.material = chromeMat;
            else if (n === 'glass') o.material = glassMat;
            else if (n === 'lights' || n === 'leds') o.material = lampMat;
          });
          for (const w of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) wheels.push(model.getObjectByName(w));

          const shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
            new THREE.MeshBasicMaterial({
              map: aoTex, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true, premultipliedAlpha: true,
            })
          );
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = 0.006;
          shadow.renderOrder = 3;
          car.add(model, shadow);

          // Gövde uzunluğu (süpürme ekseni)
          car.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(bodyMesh);
          paint.uZ.value.set(box.min.z, box.max.z);

          // PPF filmi
          filmMesh = new THREE.Mesh(bodyMesh.geometry, filmMat);
          filmMesh.matrixAutoUpdate = false;
          filmMesh.renderOrder = 4;
          bodyMesh.add(filmMesh);

          // Far parlamaları
          const lb = new THREE.Box3().setFromObject(model.getObjectByName('lights'));
          for (const sx of [-1, 1]) {
            const g = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: glowTex, color: '#dfeaff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
              })
            );
            g.position.set(sx * (lb.max.x - 0.22), lb.min.y + (lb.max.y - lb.min.y) * 0.6, lb.min.z + 0.1);
            g.scale.setScalar(1.1);
            car.add(g);
            headGlows.push(g);
          }

          // Masaüstünde zeminde gerçek (aynalı) yansıma
          if (!lowPower) {
            carReflect = model.clone();
            carReflect.scale.y = -1;
            carReflect.traverse((o) => {
              if (o.isMesh && o.material === filmMat) o.visible = false;
            });
            car.add(carReflect);
          }

          placeDrops(box);
          // Gövde kutusu + tekerlekler yere kadar (bazı iç parçaların kutuları döndürülmüş, onları katmıyoruz)
          carBox.copy(box);
          carBox.min.y = 0;
          carBox.getCenter(carCenter);
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  // Damlaları kaput, tavan ve bagaj üstüne yerleştir (aşağı doğru ışın atarak).
  function placeDrops(box) {
    const ray = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const tries = DROPS * 3;
    let i = 0;
    const step = () => {
      const end = Math.min(i + 24, tries);
      for (; i < end && dropData.length < DROPS; i++) {
        const x = THREE.MathUtils.lerp(box.min.x + 0.25, box.max.x - 0.25, Math.random());
        const z = THREE.MathUtils.lerp(box.min.z + 0.25, box.max.z - 0.35, Math.random());
        ray.set(new THREE.Vector3(x, 3, z), down);
        const hit = ray.intersectObject(bodyMesh, false)[0];
        if (!hit || !hit.face) continue;
        const nrm = hit.face.normal.clone().transformDirection(bodyMesh.matrixWorld);
        if (nrm.y < 0) nrm.negate();
        if (nrm.y < 0.55) continue;
        dropData.push({
          p: hit.point.clone(),
          n: nrm,
          r: 0.012 + Math.random() ** 2 * 0.03,
          k: Math.random(),
          side: Math.sign(x) || 1,
        });
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
    // Mobilde adres çubuğu gidip gelince küçük yükseklik değişimlerini yok say
    if (w === W && Math.abs(h - H) < 140) return;
    W = w;
    H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    state.fit = w / h < 1 ? Math.min(2.5, 1.05 / (w / h)) : w / h < 1.3 ? 1.3 : 1;
    state.viewY = w / h < 1 ? 0.11 : 0;
    state.viewX = w / h >= 1.2 ? -0.15 : 0;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // --- Döngü ----------------------------------------------------------------
  const timer = new THREE.Timer();
  const target = new THREE.Vector3();
  let running = false;
  let paused = document.hidden;
  let flicker = 0;
  document.addEventListener('visibilitychange', () => (paused = document.hidden));

  function frame() {
    if (paused) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    paint.uTime.value = t;

    // Kamera
    target.set(state.tx, state.ty, state.tz);
    const portrait = W / H < 1;
    if (portrait && state.fitCar > 0.001) fitPortrait(dt);
    else {
      scene.fog.near = 9;
      scene.fog.far = 22;
      camera.position.set(state.px, state.py, state.pz).sub(target).multiplyScalar(1 + (state.fit - 1) * state.fitK).add(target);
      camera.lookAt(target);
      if (state.viewY || state.viewX) camera.setViewOffset(W, H, W * state.viewX, H * state.viewY, W, H);
      else camera.clearViewOffset();
    }

    // Işıklar
    const tub = state.tubes;
    bodyMat.envMapIntensity = 0.08 + tub * (0.75 + state.gloss * 0.55);
    rimMat.envMapIntensity = chromeMat.envMapIntensity = 0.1 + tub * 1.1;
    glassMat.envMapIntensity = 0.1 + tub * 1.6;
    dropMat.envMapIntensity = 0.3 + tub * 2.4;
    key.intensity = tub * 0.6;
    scene.environmentRotation.y = state.envRot;
    renderer.toneMappingExposure = 0.45 + tub * 0.6;

    paint.uSweep.value = state.sweep;
    paint.uGloss.value = state.gloss;
    paint.uSwap.value = state.swap;
    filmUniforms.uFilm.value = state.film;

    // Tabanca: süpürme cephesinde, arabanın sol yanında
    const zf = THREE.MathUtils.lerp(paint.uZ.value.x, paint.uZ.value.y, state.sweep < 0.999 ? state.sweep : state.swap);
    sprayU.uNozzle.value.set(-1.85, 0.8 + Math.sin(t * 7) * 0.05, zf);
    sprayU.uAmount.value = state.spray;
    spray.visible = state.spray > 0.01;

    // Farlar
    lampMat.emissiveIntensity = state.head * 2.4;
    for (const g of headGlows) g.material.opacity = state.head * (0.75 + Math.sin(t * 30) * 0.02);

    // Döner tabla
    car.rotation.y += dt * 0.32 * state.spin;
    if (state.spin < 0.01 && Math.abs(car.rotation.y) > 0.0001) {
      // Film bölümüne dönünce arabayı en yakın tam tura yumuşakça oturt
      const goal = Math.round(car.rotation.y / (Math.PI * 2)) * Math.PI * 2;
      car.rotation.y += (goal - car.rotation.y) * Math.min(1, dt * 3);
    }
    for (const w of wheels) if (w) w.rotation.x -= dt * 2.2 * state.spin;

    // Damlalar
    if (state.beads > 0.001 && dropData.length) {
      drops.visible = true;
      dropMat.opacity = 0.55 * (1 - state.sheet * 0.9);
      const cr = Math.cos(car.rotation.y);
      const sr = Math.sin(car.rotation.y);
      for (let i = 0; i < dropData.length; i++) {
        const dd = dropData[i];
        const g = THREE.MathUtils.clamp(state.beads * 1.6 - dd.k * 0.6, 0, 1);
        const sh = THREE.MathUtils.clamp(state.sheet * 1.5 - dd.k * 0.5, 0, 1);
        v3.copy(dd.p);
        v3.x += dd.side * sh * sh * 1.4;
        v3.y -= sh * sh * sh * 1.2;
        // arabanın dönüşüne uy
        const x = v3.x * cr + v3.z * sr;
        const z = -v3.x * sr + v3.z * cr;
        v3.x = x;
        v3.z = z;
        const r = dd.r * g * (1 - sh * 0.4);
        q.setFromUnitVectors(UP, dd.n);
        sc.set(r * (1 + sh * 2.5), r * 0.62, r);
        m4.compose(v3, q, sc);
        drops.setMatrixAt(i, m4);
      }
      drops.instanceMatrix.needsUpdate = true;
    } else drops.visible = false;

    if (filmMesh) filmMesh.visible = state.film > 0.001 && state.film < 1.2;

    renderer.render(scene, camera);
  }

  // Dikey ekran: arabanın kutusunu [rTop, rBot] bandına kenar payıyla sığdır.
  // Kamera kendi bakış ekseni boyunca ileri/geri gider, bant merkezi view offset ile kaydırılır.
  const tmp = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const right = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  function fitPortrait(dt) {
    const k = state.fitCar;
    tgt.set(state.tx, state.ty, state.tz).lerp(tmp.copy(carCenter).applyMatrix4(car.matrixWorld), k);
    const base = tmp.set(state.px, state.py, state.pz).sub(target);
    const d0 = base.length() * (1 + (state.fit - 1) * state.fitK);
    base.normalize();
    camera.position.copy(tgt).addScaledVector(base, d0);
    camera.lookAt(tgt);
    camera.updateMatrixWorld();

    // Gövde kutusunun 8 köşesi ekrana izdüşürülür. Döner tablada sabit boy için kutu yerine
    // kameraya göre hizalı, yarı genişliği arabanın yan boyu kadar olan bir kare kullanılır.
    const { min, max } = carBox;
    const spinning = state.spin > 0.01;
    let i = 0;
    if (spinning) {
      const R = Math.max(max.z - min.z, max.x - min.x) / 2;
      right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      fwd.set(-right.z, 0, right.x);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [min.y, max.y]) {
        corners[i++].copy(car.position).setY(y).addScaledVector(right, sx * R).addScaledVector(fwd, sz * (max.x - min.x) / 2)
          .applyMatrix4(camera.matrixWorldInverse);
      }
    } else {
      for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) {
        corners[i++].set(x ? max.x : min.x, y ? max.y : min.y, z ? max.z : min.z)
          .applyMatrix4(car.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      }
    }
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    const half = (state.rBot - state.rTop); // NDC yarı-yükseklik
    // Kutu köşeleri 3/4 açıda gövdeden geniş düşer; bu yüzden sabit kutuda biraz daha doldur
    const wFill = spinning ? 0.9 : 1.0;
    let need = -Infinity;
    for (const c of corners) {
      const depth = -c.z;
      need = Math.max(need, Math.abs(c.x) / (tanH * wFill) - depth, Math.abs(c.y) / (tanV * half * 0.96) - depth);
    }
    // Kaydırma animasyonuyla yumuşak takip; döner tablada ani sıçrama olmasın
    fitDelta += (need - fitDelta) * Math.min(1, dt * 10 || 1);
    camera.position.addScaledVector(base, fitDelta * k);
    // Uzaklaşınca sis arabayı yutmasın: sisi kameranın arabaya uzaklığına göre kaydır
    const dist = camera.position.distanceTo(tgt);
    scene.fog.near = Math.max(9, dist + 2.5);
    scene.fog.far = Math.max(22, dist + 14);
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

  return { state, load, setActive, setPaint, resize, renderOnce: frame };
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
