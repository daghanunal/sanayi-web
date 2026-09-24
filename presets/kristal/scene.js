// Kristal 3D sahnesi: sürücü koltuğundan ön cama bakış.
// Gerçek kırılma (transmission) yapan kavisli cam, seramik kenar baskısı ve güneşlik bandı,
// taş izi → çatlak → reçine → UV, cam değişimi, cam filmi, yağmur + silecek, ADAS kalibrasyonu.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Cam ölçüleri (dünya birimi) ve biçimi
const GW = 3.6;
const GH = 1.55;
const CURVE = 0.3; // kenarlara doğru sürücüye yaklaşan kavis
const TAPER = 0.84; // üst kenar alttan dar
const RAKE = 0.42; // camın yatıklığı (üstü sürücüye yakın)
const ASPECT = GW / GH;

export const IMPACT = { u: 0.6, v: 0.47 };

function glassPoint(u, v, out = new THREE.Vector3()) {
  const t = TAPER + (1 - TAPER) * (1 - v);
  const x = (u - 0.5) * GW * t;
  const y = (v - 0.5) * GH;
  const nx = x / (GW / 2);
  return out.set(x, y, CURVE * nx * nx);
}

function glassGeometry(segX, segY) {
  const g = new THREE.PlaneGeometry(1, 1, segX, segY);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    glassPoint(uv.getX(i), uv.getY(i), p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  return g;
}

// Tohumlu rastgele: çatlak her açılışta aynı olsun.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function radialSprite(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(canvas, { name, phone, low }) {
  const narrow = innerWidth / innerHeight < 0.8;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, low ? 1 : phone ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.transmissionResolutionScale = low ? 0.6 : phone ? 0.85 : 1;
  renderer.setClearColor('#dfe8ee');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight('#eaf4ff', '#2a3035', 1.2);
  const sunLight = new THREE.DirectionalLight('#fff4e0', 2.2);
  sunLight.position.set(3, 4, -6);
  scene.add(hemi, sunLight);

  // --- Arka plan: gökyüzü, bozkır tepeleri, yol, gökyüzünde dükkan adı ---------------
  const BW = phone || low ? 1024 : 2048;
  const BH = BW / 2;
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = BW;
  bgCanvas.height = BH;
  const SUN = narrow ? { x: 0.56, y: 0.2 } : { x: 0.66, y: 0.24 };
  // Gökyüzü yazısı ayrı kanvasta: yakın planlarda söndürülebilsin, ayna ve üst çubukla çakışmasın.
  // Dikey bant: aynanın altı ile tepelerin üstü arası.
  const NAME = narrow ? { w: 0.2, top: 0.4, bottom: 0.53 } : { w: 0.36, top: 0.35, bottom: 0.535 };
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = BW;
  nameCanvas.height = BH;
  function drawName(label) {
    const x = nameCanvas.getContext('2d');
    x.clearRect(0, 0, BW, BH);
    const words = label.toLocaleUpperCase('tr-TR').split(/\s+/).filter(Boolean);
    let lines = [words.join(' ')];
    if (lines[0].length > (narrow ? 8 : 13) && words.length > 1) {
      let best = 1;
      let diff = Infinity;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' ').length;
        const b = words.slice(i).join(' ').length;
        if (Math.abs(a - b) < diff) {
          diff = Math.abs(a - b);
          best = i;
        }
      }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    }
    const band = (NAME.bottom - NAME.top) * BH;
    let size = band / (lines.length * 0.98);
    x.font = `800 ${size}px Geologica, "Arial Black", sans-serif`;
    const widest = Math.max(...lines.map((l) => x.measureText(l).width));
    size *= Math.min(1, (BW * NAME.w) / widest);
    x.font = `800 ${size}px Geologica, "Arial Black", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.fillStyle = 'rgba(10,30,40,.96)';
    const block = lines.length * size * 0.98;
    const first = NAME.top * BH + (band - block) / 2 + size * 0.82;
    lines.forEach((l, i) => x.fillText(l, BW * 0.47, first + i * size * 0.98));
    nameTex.needsUpdate = true;
  }
  function drawBackdrop() {
    const x = bgCanvas.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, BH * 0.62);
    sky.addColorStop(0, '#9fbdd0');
    sky.addColorStop(0.55, '#cddde6');
    sky.addColorStop(1, '#eef2f2');
    x.fillStyle = sky;
    x.fillRect(0, 0, BW, BH);
    // güneş
    const sg = x.createRadialGradient(SUN.x * BW, SUN.y * BH, 0, SUN.x * BW, SUN.y * BH, BW * 0.12);
    sg.addColorStop(0, 'rgba(255,252,240,1)');
    sg.addColorStop(0.18, 'rgba(255,246,222,.9)');
    sg.addColorStop(1, 'rgba(255,246,222,0)');
    x.fillStyle = sg;
    x.fillRect(0, 0, BW, BH);
    // bozkır tepeleri
    const hz = BH * 0.62;
    x.fillStyle = '#b3c3cc';
    x.beginPath();
    x.moveTo(0, hz);
    for (let i = 0; i <= 24; i++) {
      const px = (i / 24) * BW;
      x.lineTo(px, hz - BH * (0.035 + 0.03 * Math.sin(i * 0.9) + 0.02 * Math.sin(i * 2.3)));
    }
    x.lineTo(BW, hz);
    x.fill();
    // zemin
    const ground = x.createLinearGradient(0, hz, 0, BH);
    ground.addColorStop(0, '#c9c3b2');
    ground.addColorStop(1, '#a59e8b');
    x.fillStyle = ground;
    x.fillRect(0, hz, BW, BH - hz);
    // yol
    const vx = BW * 0.47;
    x.fillStyle = '#5c6166';
    x.beginPath();
    x.moveTo(vx - BW * 0.006, hz);
    x.lineTo(vx + BW * 0.006, hz);
    x.lineTo(vx + BW * 0.36, BH);
    x.lineTo(vx - BW * 0.36, BH);
    x.fill();
    x.strokeStyle = '#f2f0e8';
    x.lineWidth = BW * 0.004;
    x.setLineDash([BW * 0.02, BW * 0.025]);
    x.beginPath();
    x.moveTo(vx, hz);
    x.lineTo(vx, BH);
    x.stroke();
    x.setLineDash([]);
    bgTex.needsUpdate = true;
  }
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  bgTex.anisotropy = 4;
  const nameTex = new THREE.CanvasTexture(nameCanvas);
  nameTex.colorSpace = THREE.SRGBColorSpace;
  nameTex.anisotropy = 4;
  // Opak kalsın ki camın kırılma geçişine girsin; yazı gölge yoğunluğuyla karışır.
  const bgMat = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { map: { value: bgTex }, nameMap: { value: nameTex }, uName: { value: 1 }, uDim: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D map; uniform sampler2D nameMap; uniform float uName; uniform float uDim; varying vec2 vUv;
      void main(){ vec4 c = texture2D(map, vUv); vec4 n = texture2D(nameMap, vUv);
        c.rgb = mix(c.rgb, n.rgb, n.a * uName) * uDim; gl_FragColor = vec4(c.rgb, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const BDW = 20;
  const BDH = 10;
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(BDW, BDH), bgMat);
  backdrop.position.set(0.3, 1.2, -9);
  scene.add(backdrop);
  drawBackdrop();
  drawName(name);
  document.fonts?.ready.then(() => drawName(name));

  // güneş parlaması (arka planın önünde, camın arkasında)
  const glare = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: radialSprite('rgba(255,250,235,1)', 'rgba(255,250,235,0)'), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55 })
  );
  glare.position.set(0.3 + (SUN.x - 0.5) * BDW, 1.2 + (0.5 - SUN.y) * BDH, -8.8);
  glare.scale.set(5, 5, 1);
  scene.add(glare);

  // --- Cam ------------------------------------------------------------------------------
  const glassGroup = new THREE.Group();
  glassGroup.rotation.x = RAKE;
  glassGroup.position.set(0, 0.1, 0);
  scene.add(glassGroup);

  const geo = glassGeometry(low ? 40 : 64, low ? 16 : 24);

  // Yağmur damlaları normal haritası
  const NW = phone || low ? 512 : 1024;
  const NH = Math.round(NW / ASPECT);
  const rainCanvas = document.createElement('canvas');
  rainCanvas.width = NW;
  rainCanvas.height = NH;
  const rainCtx = rainCanvas.getContext('2d');
  rainCtx.fillStyle = 'rgb(128,128,255)';
  rainCtx.fillRect(0, 0, NW, NH);
  const rainTex = new THREE.CanvasTexture(rainCanvas);
  rainTex.colorSpace = THREE.NoColorSpace;

  const dropSprite = (() => {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    const img = x.createImageData(s, s);
    for (let j = 0; j < s; j++) {
      for (let i = 0; i < s; i++) {
        const dx = (i + 0.5) / (s / 2) - 1;
        const dy = (j + 0.5) / (s / 2) - 1;
        const r2 = dx * dx + dy * dy;
        const k = (j * s + i) * 4;
        if (r2 >= 1) {
          img.data[k + 3] = 0;
          continue;
        }
        const nz = Math.sqrt(1 - r2);
        img.data[k] = (dx * 0.5 + 0.5) * 255;
        img.data[k + 1] = (-dy * 0.5 + 0.5) * 255;
        img.data[k + 2] = (nz * 0.5 + 0.5) * 255;
        img.data[k + 3] = Math.min(1, (1 - r2) * 6) * 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  })();

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 0.45,
    ior: 1.52,
    attenuationColor: new THREE.Color('#c4e8de'),
    attenuationDistance: 2.4,
    specularIntensity: 1,
    envMapIntensity: 1.1,
    normalMap: rainTex,
    normalScale: new THREE.Vector2(0, 0),
  });
  // Camın arkasındaki saydam nesneler (ADAS görüş alanı, güneş) görünsün diye derinlik yazmaz.
  glassMat.depthWrite = false;
  const glass = new THREE.Mesh(geo, glassMat);
  glassGroup.add(glass);

  // Cam filmi: camın hemen önünde koyu katman
  const filmMat = new THREE.MeshBasicMaterial({ color: '#06161b', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const film = new THREE.Mesh(geo, filmMat);
  film.renderOrder = 1;
  film.visible = false; // ön cama film yok; film sahnesi yan camda
  film.position.z = 0.004;
  glassGroup.add(film);

  // Kenar baskısı, güneşlik bandı, ayna ayağı ve çatlak: tek kanvas katmanı
  const OW = phone || low ? 1024 : 2048;
  const OH = Math.round(OW / ASPECT);
  const ovCanvas = document.createElement('canvas');
  ovCanvas.width = OW;
  ovCanvas.height = OH;
  const ovTex = new THREE.CanvasTexture(ovCanvas);
  ovTex.colorSpace = THREE.SRGBColorSpace;
  ovTex.anisotropy = 4;
  const overlay = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ovTex, transparent: true, depthWrite: false, toneMapped: false }));
  overlay.renderOrder = 2;
  overlay.position.z = 0.008;
  glassGroup.add(overlay);

  // Çatlak modeli (uv uzayında, en-boy düzeltmeli)
  const crack = (() => {
    const r = rng(1906);
    const legs = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5;
      const len = 0.03 + r() * 0.075;
      const pts = [[0, 0]];
      let ang = a;
      const seg = 7;
      for (let s = 1; s <= seg; s++) {
        ang += (r() - 0.5) * 0.5;
        const d = (len * s) / seg;
        pts.push([Math.cos(ang) * d, Math.sin(ang) * d]);
      }
      legs.push({ pts, delay: r() * 0.35 });
    }
    // uzun çatlak: sağa ve sola kenarlara doğru dalgalı
    const long = [];
    for (const dir of [1, -1]) {
      const pts = [[0, 0]];
      let x = 0;
      let y = 0;
      let ang = dir > 0 ? 0.12 : Math.PI - 0.25;
      const reach = dir > 0 ? 0.44 : 0.52;
      const steps = 40;
      for (let s = 1; s <= steps; s++) {
        ang += (r() - 0.5) * 0.22 + (dir > 0 ? -0.004 : 0.006);
        x += Math.cos(ang) * (reach / steps);
        y += Math.sin(ang) * (reach / steps) * 0.7;
        pts.push([x, y]);
      }
      long.push(pts);
    }
    return { legs, long };
  })();

  const ovState = { crack: -1, resin: -1, long: -1, uv: -1 };
  function drawOverlay(c, resin, longP) {
    const x = ovCanvas.getContext('2d');
    x.clearRect(0, 0, OW, OH);
    // güneşlik bandı (üst)
    const band = x.createLinearGradient(0, 0, 0, OH * 0.2);
    band.addColorStop(0, 'rgba(14,78,92,.78)');
    band.addColorStop(0.55, 'rgba(14,78,92,.35)');
    band.addColorStop(1, 'rgba(14,78,92,0)');
    x.fillStyle = band;
    x.fillRect(0, 0, OW, OH * 0.2);
    // seramik kenar baskısı: siyah bant + içe doğru seyrelen noktalar
    const b = OH * 0.045;
    x.fillStyle = '#0b1114';
    x.fillRect(0, 0, OW, b * 0.9);
    x.fillRect(0, OH - b, OW, b);
    x.fillRect(0, 0, b * 1.1, OH);
    x.fillRect(OW - b * 1.1, 0, b * 1.1, OH);
    const dot = OH * 0.008;
    for (let row = 0; row < 5; row++) {
      const rad = dot * (1 - row / 5.5);
      const off = b + dot * 1.4 + row * dot * 2.3;
      for (let px = off; px < OW - off; px += dot * 2.3) {
        x.beginPath();
        x.arc(px, OH - off, rad, 0, Math.PI * 2);
        x.fill();
      }
      for (let py = off; py < OH - off; py += dot * 2.3) {
        x.beginPath();
        x.arc(off, py, rad, 0, Math.PI * 2);
        x.arc(OW - off, py, rad, 0, Math.PI * 2);
        x.fill();
      }
    }
    // ayna ayağı ve ADAS kamera yuvası (üst orta)
    const mw = OW * 0.1;
    x.beginPath();
    x.moveTo(OW / 2 - mw, 0);
    x.lineTo(OW / 2 + mw, 0);
    x.lineTo(OW / 2 + mw * 0.55, OH * 0.16);
    x.lineTo(OW / 2 - mw * 0.55, OH * 0.16);
    x.closePath();
    x.fill();
    for (let row = 0; row < 4; row++) {
      const rad = dot * (0.9 - row / 5);
      const yy = OH * 0.16 + dot * 1.6 + row * dot * 2.2;
      for (let px = OW / 2 - mw * 0.55; px < OW / 2 + mw * 0.55; px += dot * 2.2) {
        x.beginPath();
        x.arc(px, yy, rad, 0, Math.PI * 2);
        x.fill();
      }
    }
    // çatlak
    if (c > 0) {
      const alpha = 1 - resin * 0.93;
      const cx = IMPACT.u * OW;
      const cy = (1 - IMPACT.v) * OH;
      const sx = OW;
      const sy = OW; // en-boy düzeltmesi: uv x ve y aynı ölçekte
      const strokePath = (pts, t, w) => {
        const n = Math.max(1, Math.floor(t * (pts.length - 1)));
        x.beginPath();
        x.moveTo(cx + pts[0][0] * sx, cy - pts[0][1] * sy);
        for (let i = 1; i <= n; i++) x.lineTo(cx + pts[i][0] * sx, cy - pts[i][1] * sy);
        x.lineWidth = w;
        x.stroke();
      };
      x.lineJoin = 'round';
      x.lineCap = 'round';
      const lw = OW / 1024;
      for (const pass of [
        { color: `rgba(8,22,28,${0.55 * alpha})`, w: 2.6 * lw },
        { color: `rgba(255,255,255,${0.95 * alpha})`, w: 1.1 * lw },
      ]) {
        x.strokeStyle = pass.color;
        for (const leg of crack.legs) {
          const t = Math.min(1, Math.max(0, (c - leg.delay) / (1 - leg.delay)));
          if (t > 0) strokePath(leg.pts, t, pass.w);
        }
        if (longP > 0) for (const pts of crack.long) strokePath(pts, longP, pass.w * 1.15);
      }
      // darbe noktası: "boğa gözü"
      const eye = OW * 0.009 * Math.min(1, c * 3);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, eye * 1.8);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
      g.addColorStop(0.45, `rgba(210,232,236,${0.6 * alpha})`);
      g.addColorStop(1, 'rgba(210,232,236,0)');
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, eye * 1.8, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = `rgba(8,22,28,${0.5 * alpha})`;
      x.lineWidth = 1.2 * lw;
      x.beginPath();
      x.arc(cx, cy, eye, 0, Math.PI * 2);
      x.stroke();
    }
    ovTex.needsUpdate = true;
  }

  // Parlama bandı (değişim sonrası ve final)
  const gleamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uPos: { value: -1 }, uAmt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uPos; uniform float uAmt;
      void main(){ float d = (vUv.x * 0.8 + vUv.y * 0.35) - uPos; float band = exp(-d*d*180.0) + 0.35*exp(-d*d*20.0);
      gl_FragColor = vec4(1.0, 1.0, 1.0, band * uAmt * 0.7); }`,
  });
  const gleam = new THREE.Mesh(geo, gleamMat);
  gleam.renderOrder = 3;
  gleam.position.z = 0.012;
  glassGroup.add(gleam);

  // --- Araç içi çerçeve ---------------------------------------------------------------
  // Camın kenarından dışa uzanan tek parça yüzey: altta torpido, yanlarda direk, üstte tavan döşemesi.
  // Cam hareket etse de sabit kalır; değişen cam tavanın arkasına kayar.
  const cabinMat = new THREE.MeshStandardMaterial({ color: '#10171b', roughness: 0.75, metalness: 0.1 });
  const frame = (() => {
    const us = [-1.6, -1.1, -0.7, -0.4, -0.2, -0.08, 0];
    const vs = [-1.4, -0.9, -0.5, -0.25, -0.1, 0];
    for (let i = 1; i <= 16; i++) us.push(i / 16);
    for (let i = 1; i <= 8; i++) vs.push(i / 8);
    us.push(1.08, 1.2, 1.4, 1.7, 2.1, 2.6);
    vs.push(1.1, 1.3, 1.6, 2.0, 2.6);
    const pos = [];
    const col = [];
    const idx = [];
    const dark = new THREE.Color('#10171b');
    const trim = new THREE.Color('#5d666b');
    const p = new THREE.Vector3();
    for (const v of vs) for (const u of us) {
      glassPoint(u, v, p);
      // kenardan uzaklaştıkça sürücüye doğru kıvrılsın (direk ve tavan önde dursun)
      const out = Math.max(0, -u, u - 1, -v * 0.3, v - 1);
      p.z += 0.012 + out * 0.35;
      pos.push(p.x, p.y, p.z);
      const c = v > 1 ? trim : dark;
      col.push(c.r, c.g, c.b);
    }
    const nu = us.length;
    for (let j = 0; j < vs.length - 1; j++) for (let i = 0; i < nu - 1; i++) {
      const cu = (us[i] + us[i + 1]) / 2;
      const cv = (vs[j] + vs[j + 1]) / 2;
      if (cu > 0 && cu < 1 && cv > 0 && cv < 1) continue; // camın yeri boş
      const a = j * nu + i;
      idx.push(a, a + 1, a + nu, a + 1, a + nu + 1, a + nu);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide }));
    m.rotation.x = RAKE;
    m.position.set(0, 0.1, 0);
    return m;
  })();
  scene.add(frame);

  // dikiz aynası (tavana bağlı, sabit)
  const mirror = new THREE.Group();
  const mirrorBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 6, 16), cabinMat);
  mirrorBody.rotation.z = Math.PI / 2;
  mirrorBody.scale.set(1, 1, 0.45);
  const mirrorFace = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.05, 0.32, 6, 16),
    new THREE.MeshStandardMaterial({ color: '#8f9ba1', metalness: 1, roughness: 0.14 })
  );
  mirrorFace.rotation.z = Math.PI / 2;
  mirrorFace.scale.set(1, 1, 0.1);
  mirrorFace.position.z = 0.025;
  mirror.add(mirrorBody, mirrorFace);
  const mp = glassPoint(0.5, 0.9);
  mirror.scale.setScalar(narrow ? 0.62 : 0.8);
  mirror.position.set(mp.x, mp.y - 0.06, mp.z + 0.16);
  const mirrorPivot = new THREE.Group();
  mirrorPivot.rotation.x = RAKE;
  mirrorPivot.position.set(0, 0.1, 0);
  mirror.rotation.x = -RAKE;
  mirrorPivot.add(mirror);
  scene.add(mirrorPivot);

  // --- Silecekler (camın dışında) -------------------------------------------------------
  const wiperMat = new THREE.MeshStandardMaterial({ color: '#0d1114', roughness: 0.6, metalness: 0.3 });
  const WIPERS = [
    { pu: 0.16, len: 0.46 },
    { pu: 0.56, len: 0.42 },
  ];
  const wipers = WIPERS.map((w) => {
    const pivot = new THREE.Group();
    const p = glassPoint(w.pu, 0.03);
    pivot.position.set(p.x, p.y, p.z - 0.05);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(w.len * GW, 0.025, 0.02), wiperMat);
    blade.position.x = (w.len * GW) / 2;
    pivot.add(blade);
    glassGroup.add(pivot);
    return pivot;
  });

  // --- Taş, kırıntılar, reçine aparatı, UV lamba ---------------------------------------
  const impactLocal = glassPoint(IMPACT.u, IMPACT.v);
  const stoneGeo = new THREE.IcosahedronGeometry(0.07, 1);
  {
    const p = stoneGeo.attributes.position;
    const r = rng(7);
    for (let i = 0; i < p.count; i++) {
      const k = 0.75 + r() * 0.5;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * (0.8 + r() * 0.3), p.getZ(i) * k);
    }
    stoneGeo.computeVertexNormals();
  }
  const stone = new THREE.Mesh(stoneGeo, new THREE.MeshStandardMaterial({ color: '#8b857c', roughness: 0.95 }));
  stone.visible = false;
  glassGroup.add(stone);

  const chipCount = 26;
  const chipGeo = new THREE.BufferGeometry();
  const chipPos = new Float32Array(chipCount * 3);
  const chipDir = [];
  {
    const r = rng(11);
    for (let i = 0; i < chipCount; i++) {
      const a = r() * Math.PI * 2;
      const s = 0.1 + r() * 0.35;
      chipDir.push([Math.cos(a) * s, Math.sin(a) * s, 0.25 + r() * 0.5]);
    }
  }
  chipGeo.setAttribute('position', new THREE.BufferAttribute(chipPos, 3));
  const chips = new THREE.Points(chipGeo, new THREE.PointsMaterial({ color: '#ffffff', size: phone ? 0.018 : 0.012, transparent: true, depthWrite: false }));
  chips.visible = false;
  glassGroup.add(chips);

  // Reçine aparatı: cama vantuzla oturan halka ve dışa uzanan enjektör
  const tool = new THREE.Group();
  const toolMetal = new THREE.MeshStandardMaterial({ color: '#c9ced2', roughness: 0.3, metalness: 0.9 });
  const toolDark = new THREE.MeshStandardMaterial({ color: '#23292d', roughness: 0.5, metalness: 0.2 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 10, 40), toolDark);
  ring.position.z = -0.012;
  const injector = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 20), toolMetal);
  injector.rotation.x = Math.PI / 2;
  injector.position.z = -0.15;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 20), toolDark);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = -0.29;
  tool.add(ring, injector, cap);
  tool.position.copy(impactLocal);
  tool.visible = false;
  glassGroup.add(tool);

  const uvMat = new THREE.SpriteMaterial({ map: radialSprite('rgba(150,120,255,1)', 'rgba(109,76,255,0)'), transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const uvGlow = new THREE.Sprite(uvMat);
  uvGlow.position.copy(impactLocal).add(new THREE.Vector3(0, 0, 0.03));
  uvGlow.scale.set(0.6, 0.6, 1);
  uvGlow.renderOrder = 4;
  glassGroup.add(uvGlow);

  // --- ADAS: kamera görüş alanı ve kalibrasyon panosu -----------------------------------
  const target = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 320;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f0';
    x.fillRect(0, 0, 512, 320);
    const n = 8;
    const m = 5;
    const cw = 400 / n;
    const ch = 250 / m;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) if ((i + j) % 2 === 0) {
      x.fillStyle = '#0b1820';
      x.fillRect(56 + i * cw, 35 + j * ch, cw, ch);
    }
    x.strokeStyle = '#d23a2a';
    x.lineWidth = 4;
    x.beginPath();
    x.arc(256, 160, 30, 0, Math.PI * 2);
    x.moveTo(256, 110);
    x.lineTo(256, 210);
    x.moveTo(206, 160);
    x.lineTo(306, 160);
    x.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const board = new THREE.Group();
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.375), new THREE.MeshBasicMaterial({ map: target, toneMapped: false }));
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), toolDark);
  stand.position.y = -1.3;
  board.add(boardMesh, stand);
  board.position.set(0, -3, -4.2);
  scene.add(board);

  const moduleWorld = new THREE.Vector3();
  const fovMat = new THREE.MeshBasicMaterial({ color: '#2b8c7e', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const fovGeo = new THREE.ConeGeometry(1, 1, 4, 1, true);
  fovGeo.rotateY(Math.PI / 4);
  fovGeo.translate(0, -0.5, 0);
  fovGeo.rotateX(-Math.PI / 2); // uç orijinde, taban +z yönünde (lookAt +z'yi hedefe çevirir)
  const fov = new THREE.Mesh(fovGeo, fovMat);
  const fovEdges = new THREE.LineSegments(new THREE.EdgesGeometry(fovGeo), new THREE.LineBasicMaterial({ color: '#2b8c7e', transparent: true, opacity: 0.8, toneMapped: false }));
  fov.add(fovEdges);
  fov.visible = false;
  scene.add(fov);

  // --- Yan cam (film sahnesi): kapı camı silueti --------------------------------------
  const sideWin = new THREE.Group();
  const winShape = new THREE.Shape();
  winShape.moveTo(-0.85, -0.45);
  winShape.lineTo(0.85, -0.45);
  winShape.lineTo(0.85, 0.2);
  winShape.quadraticCurveTo(0.8, 0.45, 0.45, 0.47);
  winShape.lineTo(-0.35, 0.47);
  winShape.quadraticCurveTo(-0.7, 0.4, -0.85, 0.05);
  winShape.closePath();
  const winGeo = new THREE.ShapeGeometry(winShape, 24);
  const winFilmMat = new THREE.MeshBasicMaterial({ color: '#06161b', transparent: true, opacity: 0.05, depthWrite: false, toneMapped: false });
  const winFilm = new THREE.Mesh(winGeo, winFilmMat);
  const sheenTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 256, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.38, 'rgba(255,255,255,0)');
    g.addColorStop(0.46, 'rgba(255,255,255,.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,.08)');
    g.addColorStop(0.62, 'rgba(255,255,255,.18)');
    g.addColorStop(0.7, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  winGeo.computeBoundingBox();
  {
    // ShapeGeometry uv'leri dünya koordinatı; 0..1'e çek
    const bb = winGeo.boundingBox;
    const uvA = winGeo.attributes.uv;
    const pA = winGeo.attributes.position;
    for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (pA.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pA.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  }
  const winSheen = new THREE.Mesh(winGeo, new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, depthWrite: false, toneMapped: false }));
  winSheen.position.z = 0.002;
  const winFrame = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(winShape.getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0.004))),
    new THREE.LineBasicMaterial({ color: '#0b1114', toneMapped: false })
  );
  const winRubber = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(winShape.getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0)), true), 80, 0.014, 6, true),
    cabinMat
  );
  winFilm.renderOrder = 5;
  winSheen.renderOrder = 6;
  sideWin.add(winFilm, winSheen, winRubber);
  sideWin.rotation.y = -0.35;
  sideWin.visible = false;
  scene.add(sideWin);

  // --- Durum ve kamera ------------------------------------------------------------------
  const S = {
    crack: 0, resin: 0, long: 0, stone: 0, uv: 0, tool: 0, name: 1,
    glassY: 0, film: 0, side: 0, rain: 0, rainP: 0, wiper: 0, adas: 0, adasErr: 1, gleam: -1, gleamAmt: 0, dim: 0,
  };
  const cam = { pos: new THREE.Vector3(0, 0, 3.4), look: new THREE.Vector3(0, 0.1, -2) };
  const camNow = { pos: cam.pos.clone(), look: cam.look.clone() };
  let shake = 0;
  let aspect = 1;

  // Yağmur damlaları: doğum zamanı ve konumu (0..1 sahne ilerlemesi)
  const drops = (() => {
    const r = rng(33);
    const n = low ? 90 : phone ? 150 : 260;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const u = 0.04 + r() * 0.92;
      const v = 0.05 + r() * 0.88;
      arr.push({ u, v, r: 0.004 + r() * r() * 0.014, t0: Math.pow(r(), 1.3) * 0.62 });
    }
    return arr;
  })();
  const W0 = 0.36;
  const W1 = 0.47;
  const W2 = 0.58;
  const A0 = 0.14;
  const A1 = 2.0;
  function wiperAngle(p) {
    if (p <= W0 || p >= W2) return A0;
    if (p < W1) return A0 + (A1 - A0) * ((p - W0) / (W1 - W0));
    return A1 - (A1 - A0) * ((p - W1) / (W2 - W1));
  }
  // Damla açısı ve uzaklığı her silecek için (en-boy düzeltmeli uv uzayında)
  for (const dr of drops) {
    dr.hit = WIPERS.map((w) => {
      const dx = (dr.u - w.pu) * ASPECT;
      const dy = dr.v - 0.03;
      const ang = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      if (dist > w.len * ASPECT || ang < A0 || ang > A1) return null;
      return {
        up: W0 + ((ang - A0) / (A1 - A0)) * (W1 - W0),
        down: W1 + ((A1 - ang) / (A1 - A0)) * (W2 - W1),
      };
    }).find(Boolean);
  }
  let rainSig = '';
  function drawRain(p) {
    let sig = '';
    const vis = [];
    for (let i = 0; i < drops.length; i++) {
      const dr = drops[i];
      let on = p > dr.t0;
      if (on && dr.hit) {
        if (dr.t0 < dr.hit.up && p >= dr.hit.up) on = false;
        if (dr.t0 < dr.hit.down && p >= dr.hit.down) on = false;
      }
      if (on) vis.push(dr);
      sig += on ? '1' : '0';
    }
    if (sig === rainSig) return;
    rainSig = sig;
    rainCtx.fillStyle = 'rgb(128,128,255)';
    rainCtx.fillRect(0, 0, NW, NH);
    for (const dr of vis) {
      const rx = dr.r * NW;
      const ry = rx * 1.15;
      rainCtx.drawImage(dropSprite, dr.u * NW - rx, (1 - dr.v) * NH - ry, rx * 2, ry * 2);
    }
    rainTex.needsUpdate = true;
  }

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 64 : aspect < 1.3 ? 56 : 50;
    camera.updateProjectionMatrix();
  }
  resize();

  // Görünüm anahtarları. Telefonda cam ekranın üst kısmında kalsın diye geri çekilir ve aşağı bakılır.
  const VIEWS = {
    hero: { pos: [0, 0.0, 2.6], look: [0, 0.1, -3] },
    tas: { pos: [0.28, 0.04, 2.1], look: [0.33, 0.08, -3] },
    tasYakin: { pos: [0.34, 0.06, 1.35], look: [0.34, 0.07, -3] },
    recine: { pos: [0.34, 0.06, 1.25], look: [0.34, 0.07, -3] },
    kasko: { pos: [0, 0.02, 3.2], look: [0, 0.14, -3] },
    film: { pos: [-0.1, 0.02, 2.9], look: [0.15, 0.16, -3] },
    yagmur: { pos: [0, 0.02, 2.9], look: [0, 0.08, -3] },
    adas: { pos: [0, 0.22, 2.0], look: [0, 0.5, -5] },
    final: { pos: [0.08, 0.02, 3.0], look: [0.04, 0.12, -3] },
  };
  function view(name, t = 1, from) {
    const a = VIEWS[from ?? name];
    const b = VIEWS[name];
    const lerp = (i, k) => a[k][i] + (b[k][i] - a[k][i]) * t;
    cam.pos.set(lerp(0, 'pos'), lerp(1, 'pos'), lerp(2, 'pos'));
    cam.look.set(lerp(0, 'look'), lerp(1, 'look'), lerp(2, 'look'));
    if (aspect < 0.8) {
      cam.pos.z *= 1.22;
      cam.look.y -= 1.25;
      cam.look.x = cam.pos.x + (cam.look.x - cam.pos.x) * 0.5;
    } else if (aspect < 1.3) {
      cam.pos.z *= 1.1;
      cam.look.y -= 0.8;
    }
  }
  view('hero');
  camNow.pos.copy(cam.pos);
  camNow.look.copy(cam.look);

  let lastOv = '';
  function update(dt) {
    // kamera
    const k = 1 - Math.exp(-dt * 4.5);
    camNow.pos.lerp(cam.pos, k);
    camNow.look.lerp(cam.look, k);
    camera.position.copy(camNow.pos);
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.05;
      camera.position.y += (Math.random() - 0.5) * shake * 0.05;
      shake *= Math.exp(-dt * 7);
    }
    camera.lookAt(camNow.look);

    // cam konumu (değişim animasyonu)
    glassGroup.position.y = 0.1 + S.glassY * 2.6;
    glassGroup.position.z = -S.glassY * 0.6;

    // katman
    const ovKey = `${S.crack.toFixed(3)}|${S.resin.toFixed(3)}|${S.long.toFixed(3)}`;
    if (ovKey !== lastOv) {
      lastOv = ovKey;
      drawOverlay(S.crack, S.resin, S.long);
    }

    // taş
    stone.visible = S.stone > 0 && S.stone < 1;
    if (stone.visible) {
      const t = S.stone;
      tmp.set(impactLocal.x + 1.2, impactLocal.y - 2.0, impactLocal.z - 6);
      tmp2.copy(impactLocal).add(new THREE.Vector3(0, 0, -0.05));
      stone.position.lerpVectors(tmp, tmp2, t * t * (3 - 2 * t));
      stone.rotation.set(t * 9, t * 7, t * 4);
    }
    chips.visible = S.crack > 0 && S.crack < 0.35;
    if (chips.visible) {
      const t = S.crack / 0.35;
      for (let i = 0; i < chipCount; i++) {
        const [dx, dy, dz] = chipDir[i];
        chipPos[i * 3] = impactLocal.x + dx * t;
        chipPos[i * 3 + 1] = impactLocal.y + dy * t - t * t * 0.3;
        chipPos[i * 3 + 2] = impactLocal.z + 0.02 + dz * t;
      }
      chipGeo.attributes.position.needsUpdate = true;
      chips.material.opacity = 1 - t;
    }

    // reçine aparatı
    tool.visible = S.tool > 0.001;
    tool.position.set(impactLocal.x, impactLocal.y + (1 - S.tool) * 1.6, impactLocal.z - 0.02);
    uvMat.opacity = S.uv * 0.9;
    uvGlow.scale.setScalar(0.35 + S.uv * 0.5);

    // film, parlama, güneş
    filmMat.opacity = 0;
    gleamMat.uniforms.uPos.value = S.gleam;
    gleamMat.uniforms.uAmt.value = S.gleamAmt;
    glare.material.opacity = 0.55 * (1 - S.dim * 0.8);
    bgMat.uniforms.uDim.value = 1 - S.dim * 0.35;
    bgMat.uniforms.uName.value = S.name;
    hemi.intensity = 1.2 - S.dim * 0.5;

    // yan cam: kameranın önüne kayar
    sideWin.visible = S.side > 0.001;
    if (sideWin.visible) {
      const n = aspect < 0.8;
      tmp.set(0, 0, -1).applyQuaternion(camera.quaternion);
      sideWin.position.copy(camera.position).addScaledVector(tmp, n ? 2.6 : 2.2);
      tmp2.set(1, 0, 0).applyQuaternion(camera.quaternion);
      sideWin.position.addScaledVector(tmp2, (n ? 0 : 0.55) + (1 - S.side) * 3.2);
      tmp2.set(0, 1, 0).applyQuaternion(camera.quaternion);
      sideWin.position.addScaledVector(tmp2, n ? 0.35 : 0.1);
      sideWin.quaternion.copy(camera.quaternion);
      sideWin.rotateY(-0.3);
      sideWin.scale.setScalar(n ? 0.62 : 1);
      winFilmMat.opacity = 0.04 + S.film * 0.9;
    }

    // yağmur ve silecek
    glassMat.normalScale.set(S.rain * 0.9, S.rain * 0.9);
    if (S.rain > 0.001) drawRain(S.rainP);
    const ang = wiperAngle(S.rainP);
    wipers.forEach((w) => (w.rotation.z = ang));

    // ADAS
    board.position.y = -3 + S.adas * 3.3;
    fov.visible = S.adas > 0.02;
    if (fov.visible) {
      glassPoint(0.5, 0.86, moduleWorld);
      glassGroup.localToWorld(moduleWorld);
      moduleWorld.z -= 0.05;
      fov.position.copy(moduleWorld);
      tmp.copy(board.position);
      const dist = moduleWorld.distanceTo(tmp);
      fov.lookAt(tmp.x + S.adasErr * 0.9, tmp.y - S.adasErr * 0.35, tmp.z);
      fov.scale.set(0.8 * dist * 0.35, 0.5 * dist * 0.35, dist);
      const c = S.adasErr > 0.08 ? '#d98a1f' : '#2b8c7e';
      fovMat.color.set(c);
      fovEdges.material.color.set(c);
      fovMat.opacity = 0.3 * Math.min(1, S.adas * 3);
      fovEdges.material.opacity = Math.min(1, S.adas * 3);
    }
  }

  let last = performance.now();
  let slowFrames = 0;
  function render(now = performance.now()) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    // uyarlanabilir çözünürlük
    if (dt > 0.034) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && dpr > 0.8) {
      dpr = Math.max(0.8, dpr - 0.2);
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }

  // Ekranda nerede? (etiketler ve efektler için)
  function impactScreen() {
    tmp.copy(impactLocal);
    glassGroup.localToWorld(tmp);
    tmp.project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight };
  }

  return {
    S,
    view,
    render,
    resize,
    impactScreen,
    hit: () => (shake = 1),
    setName: (n) => drawName(n),
    compile: () => renderer.compile(scene, camera),
    snap: () => {
      camNow.pos.copy(cam.pos);
      camNow.look.copy(cam.look);
    },
  };
}
