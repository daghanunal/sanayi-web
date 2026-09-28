// Gece seferi: otoyolda giden lib3d çekici + 13,6 m tenteli dorse (kütüphane varlıkları), sodyum
// lambalar, "night" HDRI yansımaları, aya bağlı yumuşak gölge, yeşil otoyol tabelaları (portal). Sayfa kaydıkça yol akar; her bölümün portalı aracın üstünden geçer.
// Sonda araç emniyet şeridine çeker, dörtlüler yanar, yol yardım aracı tepe lambasıyla gelir.
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality } from '../../shared/lib3d.js';

const LANE = 3.6;
const WHEEL_R = 0.52;
const POST_GAP = 36; // lamba direkleri arası
const SEG = 16; // yol dokusunun tekrar boyu
const ROAD_LEN = 420;
const GREEN = '#0b7a4b';
const AMBER = '#ffac4a';
const NAVY = '#101c2c';
const smoothstep01 = (t) => t * t * (3 - 2 * t);

function canvasTex(w, h, draw, { repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function radialTex(inner = 'rgba(255,255,255,1)', size = 128) {
  return canvasTex(size, size, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

// Asfalt: 11 m genişlik (x: -6 → 5), 16 m boy. Sol kenar çizgisi, kesik şerit, sağ kenar ve banket.
function roadTex() {
  return canvasTex(512, 512, (g, w, h) => {
    const X = (m) => ((m + 6) / 11) * w;
    g.fillStyle = '#17191b';
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() * 26) | 0;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // banket biraz daha açık
    g.fillStyle = 'rgba(80,80,76,0.35)';
    g.fillRect(X(1.9), 0, X(5) - X(1.9), h);
    // tekerlek izleri
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (const c of [-3.6, 0]) for (const o of [-0.95, 0.95]) g.fillRect(X(c + o - 0.3), 0, X(0.6) - X(0), h);
    g.fillStyle = '#e9e6da';
    g.fillRect(X(-5.5), 0, X(0.16) - X(0), h);
    g.fillRect(X(1.8), 0, X(0.2) - X(0), h);
    g.fillRect(X(-1.88), 0, X(0.15) - X(0), h * (6 / 16));
    // banket titreşim çizgileri
    g.fillStyle = 'rgba(233,230,218,0.35)';
    for (let y = 0; y < h; y += 16) g.fillRect(X(2.05), y, X(0.35) - X(0), 5);
  }, { repeat: true });
}

// Yeşil otoyol tabelası. İçerik: sol üstte çıkış sekmesi, büyük başlık, alt satır.
export function drawSign(g, w, h, { tab = '', main = '', sub = '', arrow = 'down' }) {
  g.fillStyle = GREEN;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f2f4ee';
  g.lineWidth = 10;
  const r = 26;
  g.beginPath();
  g.roundRect(14, 14, w - 28, h - 28, r);
  g.stroke();
  g.fillStyle = '#f2f4ee';
  g.textBaseline = 'alphabetic';
  if (tab) {
    g.font = "800 40px 'Saira Semi Condensed', sans-serif";
    const tw = g.measureText(tab).width + 40;
    g.fillStyle = '#ffc42e';
    g.beginPath();
    g.roundRect(44, 40, tw, 62, 10);
    g.fill();
    g.fillStyle = '#10181a';
    g.fillText(tab, 64, 86);
    g.fillStyle = '#f2f4ee';
  }
  // Başlık: sığana kadar küçült
  let size = 150;
  g.font = `900 ${size}px 'Saira Semi Condensed', sans-serif`;
  while (g.measureText(main).width > w - 120 && size > 60) {
    size -= 6;
    g.font = `900 ${size}px 'Saira Semi Condensed', sans-serif`;
  }
  g.fillText(main, 52, tab ? 150 + size * 0.72 : h * 0.5 + size * 0.3);
  if (sub) {
    g.font = "600 46px 'Saira Semi Condensed', sans-serif";
    g.globalAlpha = 0.92;
    g.fillText(sub, 56, h - 58);
    g.globalAlpha = 1;
  }
  // şerit okları
  if (arrow === 'down') {
    g.save();
    g.translate(w - 90, h - 110);
    g.beginPath();
    g.moveTo(-14, -56); g.lineTo(14, -56); g.lineTo(14, 0); g.lineTo(34, 0); g.lineTo(0, 40); g.lineTo(-34, 0); g.lineTo(-14, 0);
    g.closePath();
    g.fill();
    g.restore();
  } else if (arrow === 'exit') {
    g.save();
    g.translate(w - 100, h - 120);
    g.rotate(Math.PI / 4);
    g.beginPath();
    g.moveTo(-14, 30); g.lineTo(14, 30); g.lineTo(14, -20); g.lineTo(34, -20); g.lineTo(0, -60); g.lineTo(-34, -20); g.lineTo(-14, -20);
    g.closePath();
    g.fill();
    g.restore();
  }
}

function makeMat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...o });
}

// --- Çekici + dorse -----------------------------------------------------------------------
// Araç -z yönüne bakar. Ön tampon z ≈ -8.6, dorse arkası z ≈ 8.8. Zemin y = 0.
export function drawTrailerSide(g, w, h, { name = '', tel = '' } = {}) {
  // tente üstüne basılan çıkartma: zemin saydam (tentenin kıvrımları görünür)
  g.clearRect(0, 0, w, h);
  g.fillStyle = NAVY;
  g.fillRect(0, h * 0.74, w, h * 0.12);
  g.fillStyle = AMBER;
  g.fillRect(0, h * 0.86, w, h * 0.025);
  if (name) {
    let size = 190;
    g.font = `900 ${size}px 'Saira Semi Condensed', sans-serif`;
    while (g.measureText(name).width > w * 0.8 && size > 60) { size -= 8; g.font = `900 ${size}px 'Saira Semi Condensed', sans-serif`; }
    g.fillStyle = NAVY;
    g.fillText(name, w * 0.06, h * 0.52);
    g.font = "700 60px 'Saira Semi Condensed', sans-serif";
    g.fillStyle = '#1b2a2e';
    g.fillText(`ŞAŞMAZ OTO SANAYİ SİTESİ · ${tel}`, w * 0.06 + 6, h * 0.66);
  }
}

// Yol yardım aracı (kamyonet) + turuncu tepe lambası
function drawVanSide(g, w, h, { tel = '' }) {
  // panelvan yan çıkartması (saydam zemin): yeşil bant + turuncu çizgi + yazı
  g.clearRect(0, 0, w, h);
  g.fillStyle = GREEN;
  g.fillRect(0, h * 0.3, w, h * 0.34);
  g.fillStyle = '#ff9a1f';
  g.fillRect(0, h * 0.66, w, h * 0.05);
  g.fillStyle = '#f2f4ee';
  g.textBaseline = 'middle';
  g.font = "900 96px 'Saira Semi Condensed', sans-serif";
  g.fillText('YOL YARDIM 7/24', w * 0.05, h * 0.475);
  g.fillStyle = '#10181a';
  g.font = "800 64px 'Saira Semi Condensed', sans-serif";
  g.fillText(tel, w * 0.05, h * 0.84);
}

// Kütüphane varlığının kopyası: boya malzemesi ayrı (renk farkı), tekerlekler kendi başına döner
function cloneRig(asset, color) {
  const root = asset.scene.clone(true);
  const paint = asset.materials.paint ? asset.materials.paint.clone() : null;
  if (paint && color != null) paint.color.set(color);
  const info = Object.fromEntries(asset.wheels.map((w) => [w.o.name, w]));
  const wheels = [];
  root.traverse((o) => {
    if (o.isMesh && paint) {
      if (Array.isArray(o.material)) o.material = o.material.map((m) => (m.name === 'paint' ? paint : m));
      else if (o.material.name === 'paint') o.material = paint;
    }
    if (info[o.name]) wheels.push({ o, s: info[o.name].s, r: info[o.name].r });
  });
  return { root, roll: (d) => { for (const w of wheels) w.o.rotation.z -= (w.s * d) / w.r; } };
}

export function createScene(canvas, { lite = false, signs = [], finalSign = null, name = '', tel = '' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  scene.environmentIntensity = 0.32;
  const FOG = new THREE.Color(0x0d1624);
  scene.fog = new THREE.Fog(FOG, 30, 190);
  scene.background = FOG;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);

  // Gökyüzü: üstte gece mavisi, ufukta sodyum şehir ışığı
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(480, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uGlow: { value: 1 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; uniform float uGlow;
        void main(){
          float h = vP.y;
          vec3 top = vec3(0.018,0.030,0.070);
          vec3 mid = vec3(0.060,0.090,0.160);
          vec3 glow = vec3(0.85,0.46,0.20);
          vec3 c = mix(mid, top, smoothstep(0.02, 0.45, h));
          float band = exp(-pow(max(h, 0.0) * 9.0, 1.4)) * (0.55 + 0.45 * smoothstep(-0.2, 0.9, -vP.z));
          c = mix(c, glow, band * 0.55 * uGlow);
          if (h < 0.0) c = mix(vec3(0.05,0.10,0.11), vec3(0.02,0.04,0.05), clamp(-h*4.0,0.0,1.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // Yıldızlar
  {
    const n = lite ? 260 : 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = 0.12 + Math.random() * 1.2;
      pos.set([Math.cos(th) * Math.sin(ph) * 440, Math.cos(ph) * 440, Math.sin(th) * Math.sin(ph) * 440], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe3e8, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })));
  }

  // Uzak tepeler (kamerayla birlikte gider)
  const hills = new THREE.Group();
  scene.add(hills);
  {
    const mk = (radius, height, color, seed) => {
      const seg = 96;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const hgt = height * (0.35 + 0.35 * Math.sin(a * 3 + seed) * Math.sin(a * 7.3 + seed * 2) + 0.3 * Math.abs(Math.sin(a * 13.1 + seed)));
        pos.push(Math.cos(a) * radius, -2, Math.sin(a) * radius, Math.cos(a) * radius, hgt, Math.sin(a) * radius);
        if (i < seg) {
          const k = i * 2;
          idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      hills.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false })));
    };
    mk(380, 46, 0x0b1320, 1.3);
    mk(300, 26, 0x070c16, 4.1);
  }

  // Işıklar
  scene.add(new THREE.HemisphereLight(0x4c6f7a, 0x0a0f10, 0.9));
  const moon = new THREE.DirectionalLight(0xa8c4d4, 1.1);
  moon.position.set(-30, 40, -20);
  scene.add(moon);

  // Yol ve çevresi: "world" sabit, "flow" grubu yol boyunca kayar (mod POST_GAP)
  const world = new THREE.Group();
  scene.add(world);
  const flow = new THREE.Group();
  world.add(flow);

  const rTex = roadTex();
  rTex.repeat.set(1, ROAD_LEN / SEG);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(11, ROAD_LEN), new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.82, metalness: 0.05 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(-0.5, 0, -ROAD_LEN / 2 + 60);
  road.receiveShadow = true;
  world.add(road);
  // karşı yön
  const road2 = road.clone();
  road2.material = road.material.clone();
  road2.material.map = rTex.clone();
  road2.material.map.needsUpdate = true;
  road2.rotation.z = Math.PI;
  road2.position.x = -13.6;
  world.add(road2);
  // toprak/çim şeritleri
  const groundM = new THREE.MeshStandardMaterial({ color: 0x0c111a, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, ROAD_LEN), groundM);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.03, -ROAD_LEN / 2 + 60);
  world.add(ground);
  // orta refüj (beton New Jersey)
  const concrete = makeMat(0x8b8e88, { roughness: 0.9 });
  const median = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, ROAD_LEN), concrete);
  median.position.set(-7.05, 0.42, -ROAD_LEN / 2 + 60);
  world.add(median);
  // sağ bariyer
  const railM = makeMat(0xaeb4b6, { metalness: 0.8, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, ROAD_LEN), railM);
  rail.position.set(5.05, 0.75, -ROAD_LEN / 2 + 60);
  world.add(rail);
  {
    const n = Math.ceil(ROAD_LEN / 4);
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), railM, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) post.setMatrixAt(i, m.makeTranslation(5.14, 0.4, 60 - i * 4 - 2));
    flow.add(post);
    const refl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffb423 }), Math.ceil(n / 3));
    for (let i = 0; i < n / 3; i++) refl.setMatrixAt(i, m.makeTranslation(4.99, 0.78, 60 - i * 12 - 2));
    flow.add(refl);
    // refüj reflektörleri (beyaz)
    const refl2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xdfe8ea }), Math.ceil(n / 3));
    for (let i = 0; i < n / 3; i++) refl2.setMatrixAt(i, m.makeTranslation(-6.68, 0.7, 60 - i * 12 - 8));
    flow.add(refl2);
  }

  // Lamba direkleri (refüjde, çift kollu) + ışık havuzları
  const sodium = 0xffa34a;
  const glowTex = radialTex('rgba(255,190,110,1)');
  const poolTex = radialTex('rgba(255,160,70,0.9)');
  const posts = []; // kameraya çok yaklaşan direk saydamlaşır (kadrajı kapatmasın)
  {
    const n = Math.ceil(ROAD_LEN / POST_GAP) + 1;
    const poleM = makeMat(0x5b6164, { metalness: 0.7, roughness: 0.4 });
    const poleG = new THREE.CylinderGeometry(0.12, 0.18, 11, 8);
    const armG = new THREE.BoxGeometry(3.2, 0.12, 0.14);
    const headG = new THREE.BoxGeometry(0.8, 0.14, 0.34);
    const headM = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
    const glowM = new THREE.SpriteMaterial({ map: glowTex, color: sodium, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
    const poolM = new THREE.MeshBasicMaterial({ map: poolTex, color: sodium, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.32 });
    const poolG = new THREE.PlaneGeometry(14, 16);
    poolG.rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const z = 60 - i * POST_GAP;
      const pm = poleM.clone();
      pm.transparent = true;
      const pole = new THREE.Mesh(poleG, pm);
      pole.position.set(-7.05, 5.5, z);
      flow.add(pole);
      const post = { z, pm, meshes: [pole] };
      posts.push(post);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(armG, pm);
        post.meshes.push(arm);
        arm.position.set(-7.05 + s * 1.6, 10.9, z);
        flow.add(arm);
        const head = new THREE.Mesh(headG, headM);
        head.position.set(-7.05 + s * 3.0, 10.78, z);
        flow.add(head);
        const glow = new THREE.Sprite(glowM);
        glow.scale.set(4.5, 4.5, 1);
        glow.position.set(-7.05 + s * 3.0, 10.6, z);
        flow.add(glow);
        const pool = new THREE.Mesh(poolG, poolM);
        pool.position.set(-7.05 + s * 4.2, 0.02, z);
        flow.add(pool);
      }
    }
  }
  // Geçen lambaların araca vuran ışığı
  const lampA = new THREE.PointLight(sodium, lite ? 60 : 80, 26, 1.6);
  lampA.position.set(-4.5, 10.2, 0);
  const lampB = lampA.clone();
  lampB.position.z = -POST_GAP;
  flow.add(lampA, lampB);

  // Karşıdan gelen araç farları ve öndeki stop lambaları
  const carGlow = radialTex('rgba(255,255,255,1)', 64);
  const oncoming = [];
  {
    const hm = new THREE.SpriteMaterial({ map: carGlow, color: 0xfff1d6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const tm = new THREE.SpriteMaterial({ map: carGlow, color: 0xff3020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const count = lite ? 5 : 8;
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      for (const s of [-0.7, 0.7]) {
        const sp = new THREE.Sprite(hm);
        sp.scale.set(1.1, 1.1, 1);
        sp.position.set(s, 0.8, 0);
        g.add(sp);
      }
      g.userData = { lane: i % 2 ? -10 : -13.4, z: -300 + i * (360 / count), v: 22 + (i % 3) * 5 };
      world.add(g);
      oncoming.push(g);
    }
    // aynı yönde önde giden araçlar (stoplar)
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      for (const s of [-0.75, 0.75]) {
        const sp = new THREE.Sprite(tm);
        sp.scale.set(0.8, 0.8, 1);
        sp.position.set(s, 1, 0);
        g.add(sp);
      }
      g.userData = { lane: -3.6, z: -60 - i * 70, v: 3 + i, ahead: true };
      world.add(g);
      oncoming.push(g);
    }
  }

  // Tır: lib3d çekici + dorse. Varlıklar +x'e bakar; sahnede araç −z yönüne gider (rig y ekseninde 90° döner).
  const truck = { root: new THREE.Group(), T: null, R: null, amber: [], ready: false };
  scene.add(truck.root);
  const rig = new THREE.Group();
  rig.rotation.y = Math.PI / 2;
  rig.position.z = -5.3; // ön tampon z ≈ −8.6, dorse arkası z ≈ +8.65
  truck.root.add(rig);
  const sideTex = canvasTex(2048, 512, (c, w, h) => drawTrailerSide(c, w, h, { name, tel }));
  // far ışığı: yola düşen havuz + hafif koni
  const beamTex = canvasTex(128, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.95, 4, w / 2, h * 0.7, h * 0.75);
    gr.addColorStop(0, 'rgba(255,245,220,1)');
    gr.addColorStop(0.5, 'rgba(255,235,200,0.35)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const beam = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 22),
    new THREE.MeshBasicMaterial({ map: beamTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 })
  );
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0, 0.03, -19.2);
  truck.root.add(beam);
  const coneM = new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const sd of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 16, 16, 1, true), coneM);
    cone.rotation.x = Math.PI / 2 - 0.05;
    cone.position.set(sd * 0.95, 0.75, -16.6);
    truck.root.add(cone);
  }
  const flareM = new THREE.SpriteMaterial({ map: carGlow, color: 0xfff3dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
  for (const sd of [-0.95, 0.95]) {
    const f = new THREE.Sprite(flareM);
    f.scale.set(1.5, 1.5, 1);
    f.position.set(sd, 0.74, -8.66);
    truck.root.add(f);
  }
  const headLight = new THREE.SpotLight(0xfff0d8, 60, 30, 0.5, 0.6, 1.3);
  headLight.position.set(0, 0.9, -8.8);
  headLight.target.position.set(0, 0, -24);
  truck.root.add(headLight, headLight.target);

  // Ay: araca bağlı yumuşak gölge (yol akarken gölge araçla birlikte kalır)
  const shadowSun = new THREE.DirectionalLight(0xa9c2d8, 0.9);
  shadowSun.position.set(-9, 16, -6);
  shadowSun.target.position.set(0, 0, 0);
  shadowSun.castShadow = true;
  shadowSun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  const sc = shadowSun.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 13; sc.bottom = -13; sc.near = 2; sc.far = 40;
  shadowSun.shadow.bias = -0.0005;
  shadowSun.shadow.normalBias = 0.03;
  shadowSun.shadow.radius = 4;
  truck.root.add(shadowSun, shadowSun.target);

  // Konvoy (filo bölümü için) ve yol yardım aracı: varlıklar yüklenince kurulur
  const convoy = [];
  const cc = []; // konvoy yalnız eski filo bölümündeydi
  const van = { root: new THREE.Group(), beaconM: new THREE.MeshStandardMaterial({ color: 0x3a2206, emissive: 0xffa21a, emissiveIntensity: 0, roughness: 0.3 }), redraw: () => {} };
  van.root.position.set(3.3, 0, 60);
  van.root.visible = false;
  scene.add(van.root);
  const beaconLight = new THREE.PointLight(0xffa21a, 0, 16, 1.5);
  beaconLight.position.set(0, 2.6, 0);
  van.root.add(beaconLight);
  const vanTex = canvasTex(1024, 512, (c, w, h) => drawVanSide(c, w, h, { tel }));
  van.redraw = () => { drawVanSide(vanTex.image.getContext('2d'), 1024, 512, { tel }); vanTex.needsUpdate = true; };

  const q = pickQuality();
  const readyP = (async () => {
    const [env, T, R] = await Promise.all([
      loadEnv('night', renderer, { quality: q }),
      loadAsset('truck', { quality: q, renderer }),
      loadAsset('trailer', { quality: q, renderer }),
    ]);
    scene.environment = env;
    truck.T = T;
    truck.R = R;
    // kabin kırık beyaz; dorse şasisi gece mavisi, tente kırık beyaz
    T.materials.paint.color.set(0xd8d4c8);
    T.materials.paint.metalness = 0.45;
    T.materials.paint.roughness = 0.3;
    if (R.materials.paint) R.materials.paint.color.set(0x2a3442);
    if (R.materials.curtain) R.materials.curtain.color.set(0xeceee8);
    rig.add(T.scene, R.scene);
    R.scene.position.set(-1.5, 0, 0);
    R.nodes.landing_legs.position.y = 0.3;
    for (const a of [T, R]) {
      if (a.materials.light_amber) truck.amber.push(a.materials.light_amber);
      if (a.materials.light_tail) a.materials.light_tail.emissiveIntensity = 2.2;
    }
    T.materials.light_head.emissiveIntensity = 6;
    // tente çıkartması: iki yanda
    const decalM = new THREE.MeshStandardMaterial({ map: sideTex, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const sd of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(12.2, 3.05), decalM);
      pl.position.set(-5.7, 2.62, sd * 1.325);
      if (sd < 0) pl.rotation.y = Math.PI;
      pl.receiveShadow = true;
      R.scene.add(pl);
    }
    // konvoy: aynı varlıkların kopyaları, farklı kabin rengi
    for (const [col, x, z] of cc) {
      const g = new THREE.Group();
      const r2 = new THREE.Group();
      r2.rotation.y = Math.PI / 2;
      r2.position.z = -5.3;
      g.add(r2);
      const ct = cloneRig(T, col), cr = cloneRig(R, null);
      cr.root.position.set(-1.5, 0, 0);
      r2.add(ct.root, cr.root);
      g.position.set(x, 0, z);
      g.visible = false;
      scene.add(g);
      convoy.push({ root: g, roll: (d) => { ct.roll(d); cr.roll(d); } });
    }
    truck.ready = true;
  })();

  // Portallar (tabelalar)
  const gantryPostM = makeMat(0x7d8488, { metalness: 0.7, roughness: 0.4 });
  const postG = new THREE.BoxGeometry(0.42, 7.6, 0.42);
  const beamG = new THREE.BoxGeometry(12.4, 0.5, 0.5);
  const signLightTex = radialTex('rgba(255,250,235,1)', 64);
  const gantries = signs.map((s) => {
    const g = new THREE.Group();
    const p1 = new THREE.Mesh(postG, gantryPostM);
    p1.position.set(-6.4, 3.8, 0);
    const p2 = p1.clone();
    p2.position.x = 5.4;
    const b1 = new THREE.Mesh(beamG, gantryPostM);
    b1.position.set(-0.5, 7.2, 0.3);
    const b2 = b1.clone();
    b2.position.y = 5.2;
    g.add(p1, p2, b1, b2);
    const tex = canvasTex(1024, 512, (c, w, h) => drawSign(c, w, h, s));
    tex.userData = s;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 4.2), new THREE.MeshBasicMaterial({ map: tex, color: 0xdfe6e2 }));
    sign.position.set(-1.8, 6.3, 0.62);
    g.add(sign);
    // tabela aydınlatma lambaları
    for (const x of [-4.6, -1.8, 1.0]) {
      const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: signLightTex, color: 0xfff4dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
      l.scale.set(0.9, 0.9, 1);
      l.position.set(x, 8.2, 0.9);
      g.add(l);
    }
    g.visible = false;
    world.add(g);
    return { g, tex, sign, data: s };
  });

  // Emniyet şeridindeki çıkış tabelası (final)
  let exitSign = null;
  if (finalSign) {
    const g = new THREE.Group();
    const tex = canvasTex(1024, 640, (c, w, h) => drawSign(c, w, h, { ...finalSign, arrow: 'exit' }));
    tex.userData = { ...finalSign, arrow: 'exit' };
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.5), new THREE.MeshBasicMaterial({ map: tex, color: 0xdfe6e2 }));
    panel.position.set(0, 4.6, 0);
    g.add(panel);
    for (const x of [-2, 2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.6, 0.16), gantryPostM);
      p.position.set(x, 2.3, -0.1);
      g.add(p);
    }
    g.position.set(7.2, 0, -30);
    g.rotation.y = -0.35;
    world.add(g);
    exitSign = { g, tex };
  }

  // Tabelaları font yüklendikten sonra yeniden çiz
  function redrawSigns() {
    const all = [...gantries.map((x) => x.tex), exitSign?.tex].filter(Boolean);
    van.redraw();
    { const c = sideTex.image; drawTrailerSide(c.getContext('2d'), c.width, c.height, { name, tel }); sideTex.needsUpdate = true; }
    for (const t of all) {
      const c = t.image;
      drawSign(c.getContext('2d'), c.width, c.height, t.userData);
      t.needsUpdate = true;
    }
  }

  // --- durum -----------------------------------------------------------------------------
  const camPos = new THREE.Vector3(-6, 2, -18);
  const camLook = new THREE.Vector3(0, 2, -4);
  let W = 1, H = 1;

  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();

  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  let flowZ = 0;
  let lastTravel = 0;
  function update(s, dt) {
    // s: { travel, cam:[px,py,pz,lx,ly,lz], fov, final, convoy, time }
    const travel = s.travel;
    const dTravel = travel - lastTravel;
    lastTravel = travel;
    flowZ = travel;
    flow.position.z = ((flowZ % POST_GAP) + POST_GAP) % POST_GAP;
    rTex.offset.y = (flowZ / SEG) % 1;
    road2.material.map.offset.y = (-flowZ / SEG) % 1;
    if (truck.ready) { truck.T.roll(dTravel); truck.R.roll(dTravel); }

    // karşı yön
    for (const o of oncoming) {
      const u = o.userData;
      if (u.ahead) {
        // öndeki araçlar: bizden biraz yavaş, yavaşça yaklaşır; son sahnede gizli
        u.z += dTravel * 0.12;
        if (u.z > -24) u.z -= 220;
        o.position.set(u.lane, 0, u.z);
        o.visible = s.final < 0.5;
      } else {
        u.z += dTravel + u.v * dt;
        if (u.z > 70) u.z -= 380;
        o.position.set(u.lane, 0, u.z);
      }
    }

    // Portallar
    for (const gt of gantries) {
      const z = -(gt.data.d - s.gantryTravel);
      gt.g.visible = z > -260 && z < 70;
      gt.g.position.z = z;
    }
    if (exitSign) {
      exitSign.g.visible = s.final > 0.02;
    }

    // Son sahne: emniyet şeridine çekiş
    const f = s.final;
    const e = f * f * (3 - 2 * f);
    truck.root.position.x = e * 3.3;
    truck.root.rotation.y = -Math.sin(Math.min(1, f * 1.6) * Math.PI) * 0.06;
    const blink = f > 0.35 && Math.sin(s.time * 7) > 0;
    for (const m of truck.amber) m.emissiveIntensity = blink ? 7 : 0.15;
    van.root.visible = f > 0.3;
    if (van.root.visible) {
      const vz = 70 - smoothstep01(Math.min(1, (f - 0.3) / 0.6)) * 52;
      if (van.roll && van.lastZ != null) van.roll(van.lastZ - vz);
      van.lastZ = vz;
      van.root.position.set(3.4, 0, vz);
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 9);
      van.beaconM.emissiveIntensity = 1 + pulse * 5;
      beaconLight.intensity = 10 + pulse * 30;
    }
    for (const c of convoy) c.root.visible = s.convoy > 0.01;
    if (s.convoy > 0.01) {
      convoy[0].root.position.z = -26 - (1 - s.convoy) * 40;
      if (convoy[1]) convoy[1].root.position.z = 32 + (1 - s.convoy) * 40;
      for (const c of convoy) c.roll(dTravel);
    }

    // Kamera (yumuşak takip)
    const k = Math.min(1, 1 - Math.pow(0.0015, dt));
    camPos.lerp(tmpA.set(s.cam[0], s.cam[1], s.cam[2]), k);
    camLook.lerp(tmpB.set(s.cam[3], s.cam[4], s.cam[5]), k);
    camera.position.copy(camPos);
    camera.position.x += s.px || 0;
    camera.position.y += s.py || 0;
    camera.lookAt(camLook);
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov += (s.fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
    for (const p of posts) {
      const wz = p.z + flow.position.z;
      const dist = Math.hypot(camera.position.x + 7.05, camera.position.z - wz);
      const o = Math.min(1, Math.max(0, (dist - 5) / 9));
      p.pm.opacity = o;
      p.pm.depthWrite = o > 0.99;
      for (const m of p.meshes) m.visible = o > 0.02;
    }
    hills.position.set(camera.position.x, 0, camera.position.z);
    sky.position.copy(camera.position);
  }

  function snap() {
    // ilk karede lerp olmadan yerine otur
    camPos.copy(camera.position);
  }

  function render() {
    renderer.render(scene, camera);
  }

  return { update, render, resize, redrawSigns, snap, camera, renderer, readyP, isReady: () => truck.ready, setCam: (c) => { camPos.set(c[0], c[1], c[2]); camLook.set(c[3], c[4], c[5]); } };
}
