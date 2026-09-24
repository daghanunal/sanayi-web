// Prizma: oto cam sahnesi. Karanlıkta asılı duran kavisli bir ön cam, içinden geçen beyaz ışık
// ve camdan çıkan tayf. Cam üç katmana ayrılır, taş çarpar, çatlak yayılır, reçine doldurur,
// film ışığı keser, ADAS kamerası yola ızgara düşürür. Her şey prosedürel, doku dosyası yok.
import * as THREE from 'three';

export const SPECTRUM = ['#ff3b5c', '#ff8a3d', '#ffd84d', '#6dff8f', '#3dd6ff', '#5b6cff', '#b45cff'];

// Camın 2B ölçüleri (yerel birim)
const HB = 1.6; // alt yarı genişlik
const HT = 1.26; // üst yarı genişlik
const HH = 0.8; // yarı yükseklik
const bendZ = (x, y) => -0.34 * (x / HB) ** 2 - 0.05 * (y / HH) ** 2;

const GLSL_SD = /* glsl */ `
  float sdTrap(vec2 p) {
    float r = 0.12;
    float t = clamp((p.y + ${HH.toFixed(3)}) / ${(2 * HH).toFixed(3)}, 0.0, 1.0);
    float hw = mix(${HB.toFixed(3)}, ${HT.toFixed(3)}, t) - r;
    float slope = ${((HB - HT) / (2 * HH)).toFixed(4)};
    float dx = (abs(p.x) - hw) / sqrt(1.0 + slope * slope);
    float dy = abs(p.y) - (${HH.toFixed(3)} - r);
    vec2 q = vec2(dx, dy);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  vec3 pal(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
  }
`;

function makeRng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function radialTexture(stops, size = 128, ring = false) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  if (ring) {
    x.globalCompositeOperation = 'destination-out';
    const h = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.36);
    h.addColorStop(0, 'rgba(0,0,0,1)');
    h.addColorStop(0.8, 'rgba(0,0,0,1)');
    h.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = h;
    x.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(canvas, { phone, low }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: false, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, low ? 1 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x07060d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0xcfc8ff, 0x1a1020, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-3, 4, 5);
  scene.add(sun);

  const S = {
    beam: 0, spec: 0, specDim: 0, uvCut: 0, split: 0, stone: 0, stoneOut: 0, crack: 0, resin: 0,
    uv: 0, ring: 0, tint: 0, adas: 0, adasErr: 1, gleam: -2, gleamAmt: 0, spin: 0, glow: 1, dust: 1,
    iri: 1, hue: 0, rake: 0,
  };

  // --- Arka plan: ekranı kaplayan tek üçgen ---------------------------------------------
  const bgU = { uGlow: { value: new THREE.Vector2(0.62, 0.5) }, uAmt: { value: 1 }, uHue: { value: 0 }, uAspect: { value: 1 }, uTint: { value: 0 } };
  const bg = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      depthTest: false,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: /* glsl */ `
        varying vec2 vUv; uniform vec2 uGlow; uniform float uAmt, uHue, uAspect, uTint;
        ${GLSL_SD}
        void main() {
          vec2 p = vUv - uGlow; p.x *= uAspect;
          float r = length(p);
          vec3 base = vec3(0.027, 0.023, 0.051);
          vec3 glow = mix(vec3(0.20, 0.10, 0.42), pal(0.62 + uHue) * 0.35, 0.35);
          float g = exp(-r * r * 3.2) * uAmt * (1.0 - uTint * 0.6);
          vec3 col = base + glow * g * 0.55;
          // hafif yatay tayf bandı
          float band = exp(-pow((vUv.y - uGlow.y + (vUv.x - uGlow.x) * 0.35) * 7.0, 2.0)) * 0.05 * uAmt;
          col += pal(vUv.x * 0.8 + uHue) * band;
          col *= 1.0 - smoothstep(0.55, 1.25, length((vUv - 0.5) * vec2(uAspect, 1.0))) * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  // --- Cam grubu -----------------------------------------------------------------------
  const rig = new THREE.Group(); // eğim
  const pane = new THREE.Group(); // salınım
  rig.add(pane);
  scene.add(rig);
  rig.rotation.x = -0.3;

  const geo = new THREE.PlaneGeometry(2 * HB + 0.1, 2 * HH + 0.1, phone || low ? 36 : 56, 16);
  {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, bendZ(p.getX(i), p.getY(i)));
    geo.computeVertexNormals();
  }

  const glassMat = (base, iri, extra = {}) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uGleam: { value: -2 }, uGleamAmt: { value: 0 }, uTint: { value: 0 },
        uAlpha: { value: 1 }, uHue: { value: 0 }, uIri: { value: iri }, uBase: { value: new THREE.Color(base) },
        uFrit: { value: 1 }, ...extra,
      },
      vertexShader: /* glsl */ `
        varying vec2 vL; varying vec3 vN; varying vec3 vV;
        void main() {
          vL = position.xy;
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vL; varying vec3 vN; varying vec3 vV;
        uniform float uTime, uGleam, uGleamAmt, uTint, uAlpha, uHue, uIri, uFrit;
        uniform vec3 uBase;
        ${GLSL_SD}
        void main() {
          float sd = sdTrap(vL);
          if (sd > 0.0) discard;
          float ndv = abs(dot(normalize(vN), normalize(vV)));
          float fres = pow(1.0 - ndv, 2.2);
          vec3 iri = pal(ndv * 1.3 + vL.x * 0.16 + vL.y * 0.22 + uTime * 0.035 + uHue);
          float rim = smoothstep(-0.035, 0.0, sd);
          float sweep = exp(-pow((vL.x + vL.y * 0.7 - uGleam) * 3.2, 2.0)) * uGleamAmt;
          vec3 col = uBase + iri * (0.16 + fres * 0.9) * uIri + vec3(sweep * 0.9) + rim * (0.55 + iri * 0.6);
          float a = 0.07 + fres * 0.32 + sweep * 0.45 + rim * 0.75;
          col = mix(col, vec3(0.03, 0.025, 0.05) + iri * fres * 0.25, uTint * 0.75);
          a = mix(a, 0.86 + rim * 0.14, uTint * 0.9);
          // kenardaki siyah seramik bant ve nokta geçişi
          float band = smoothstep(-0.075, -0.065, sd);
          vec2 g = fract(vL * 34.0) - 0.5;
          float dots = step(length(g), smoothstep(-0.17, -0.075, sd) * 0.5);
          float frit = max(band, dots) * (1.0 - rim) * uFrit;
          col = mix(col, vec3(0.012, 0.01, 0.02), frit * 0.94);
          a = max(a, frit * 0.9);
          gl_FragColor = vec4(col, a * uAlpha);
        }`,
    });

  const outerMat = glassMat('#0b0a18', 1);
  const pvbMat = glassMat('#2a0f38', 0.55, {});
  const innerMat = glassMat('#0b0a18', 0.8);
  pvbMat.uniforms.uFrit.value = 0;
  const outer = new THREE.Mesh(geo, outerMat);
  const pvb = new THREE.Mesh(geo, pvbMat);
  const inner = new THREE.Mesh(geo, innerMat);
  inner.renderOrder = 1;
  pvb.renderOrder = 2;
  outer.renderOrder = 3;
  pane.add(inner, pvb, outer);

  // Kenar ışığı: camın çevresini dolaşan ince tüp
  const edgePts = [];
  {
    const N = 160;
    // yuvarlatılmış yamuk çevresi: köşeleri yaklaşıkla örnekle
    const corners = [
      [-HB, -HH], [HB, -HH], [HT, HH], [-HT, HH],
    ];
    const r = 0.12;
    const path = new THREE.Shape();
    const inset = (a, b, c) => {
      // b köşesi için a->b ve b->c yönlerinde r kadar geri çekilmiş noktalar
      const v1 = new THREE.Vector2(a[0] - b[0], a[1] - b[1]).normalize().multiplyScalar(r);
      const v2 = new THREE.Vector2(c[0] - b[0], c[1] - b[1]).normalize().multiplyScalar(r);
      return [new THREE.Vector2(b[0] + v1.x, b[1] + v1.y), new THREE.Vector2(b[0] + v2.x, b[1] + v2.y)];
    };
    for (let i = 0; i < 4; i++) {
      const a = corners[(i + 3) % 4];
      const b = corners[i];
      const c = corners[(i + 1) % 4];
      const [p1, p2] = inset(a, b, c);
      if (i === 0) path.moveTo(p1.x, p1.y);
      else path.lineTo(p1.x, p1.y);
      path.quadraticCurveTo(b[0], b[1], p2.x, p2.y);
    }
    path.closePath();
    path.getSpacedPoints(N).forEach((p) => edgePts.push(new THREE.Vector3(p.x, p.y, bendZ(p.x, p.y) + 0.004)));
  }
  const edgeCurve = new THREE.CatmullRomCurve3(edgePts, true);
  const edgeGeo = new THREE.TubeGeometry(edgeCurve, phone ? 180 : 260, phone ? 0.011 : 0.008, 5, true);
  const edgeU = { uTime: { value: 0 }, uAmt: { value: 1 }, uHue: { value: 0 } };
  const edge = new THREE.Mesh(edgeGeo, new THREE.ShaderMaterial({
    uniforms: edgeU,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      varying float vU; uniform float uTime, uAmt, uHue;
      ${GLSL_SD}
      void main() {
        vec3 c = pal(vU * 2.0 - uTime * 0.08 + uHue);
        float run = 0.35 + 0.65 * pow(0.5 + 0.5 * sin((vU - uTime * 0.05) * 6.28318 * 2.0), 6.0);
        gl_FragColor = vec4(c * run * uAmt * 1.1, 1.0);
      }`,
  }));
  edge.renderOrder = 4;
  outer.add(edge);

  // --- Işık: gelen beyaz ışın ve camdan çıkan tayf --------------------------------------
  const H = new THREE.Vector3(-0.38, 0.14, bendZ(-0.38, 0.14));
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const beamMat = (color, mode) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAmt: { value: 0 }, uMode: { value: mode }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      uniform vec3 uColor; uniform float uAmt, uMode, uTime;
      void main() {
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        float core = pow(ndv, 2.4);
        float along = uMode < 0.5 ? smoothstep(0.0, 0.55, vUv.y) : pow(1.0 - vUv.y, 1.4) * smoothstep(0.0, 0.03, vUv.y);
        float shimmer = 0.85 + 0.15 * sin(vUv.y * 40.0 - uTime * 3.0);
        vec3 c = mix(uColor, vec3(1.0), pow(ndv, 10.0) * 0.7);
        gl_FragColor = vec4(c * core * along * uAmt * shimmer, 1.0);
      }`,
  });
  const placeBeam = (mesh, from, to, radius) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.scale.set(radius, len, radius);
  };
  const inDir = new THREE.Vector3(-1.7, 0.85, 0.75).normalize();
  const beamIn = new THREE.Mesh(beamGeo, beamMat('#ffffff', 0));
  placeBeam(beamIn, H.clone().addScaledVector(inDir, 6), H, phone ? 0.05 : 0.042);
  beamIn.renderOrder = 0;
  pane.add(beamIn);
  const outBase = new THREE.Vector3(1.0, -0.42, -1.5).normalize();
  const spreadAxis = new THREE.Vector3().crossVectors(outBase, new THREE.Vector3(0, 1, 0)).normalize();
  const specBeams = SPECTRUM.map((col, i) => {
    const m = new THREE.Mesh(beamGeo, beamMat(col, 1));
    const dir = outBase.clone().applyAxisAngle(spreadAxis, (i - 3) * 0.075);
    placeBeam(m, H, H.clone().addScaledVector(dir, 9), phone ? 0.075 : 0.06);
    m.renderOrder = 0;
    pane.add(m);
    return m;
  });

  // Işığın cama değdiği yerdeki parlama
  const flareTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,.75)'], [0.35, 'rgba(190,170,255,.18)'], [1, 'rgba(0,0,0,0)']]);
  const ringTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.8, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']], 128, true);
  const sprite = (tex, color = 0xffffff) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    s.renderOrder = 6;
    return s;
  };
  const flare = sprite(flareTex);
  flare.position.copy(H);
  pane.add(flare);

  // --- Çatlak --------------------------------------------------------------------------
  const C = new THREE.Vector2(0.46, -0.02);
  const crackPos = [];
  const crackD = [];
  {
    const rnd = makeRng(11);
    const MAX = 0.52;
    const push = (a, b, da, db) => {
      crackPos.push(a.x, a.y, bendZ(a.x, a.y) + 0.007, b.x, b.y, bendZ(b.x, b.y) + 0.007);
      crackD.push(da / MAX, db / MAX);
    };
    const arm = (start, ang, len, d0, depth) => {
      const steps = 9;
      let p = start.clone();
      let a = ang;
      let d = d0;
      for (let s = 0; s < steps; s++) {
        a += (rnd() - 0.5) * 0.55;
        const l = len / steps;
        const q = new THREE.Vector2(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
        push(p, q, d, d + l);
        d += l;
        p = q;
        if (depth < 2 && rnd() < 0.22) arm(p, a + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.5), (len - l * s) * 0.5, d, depth + 1);
      }
    };
    const arms = 12;
    for (let i = 0; i < arms; i++) arm(C.clone(), (i / arms) * Math.PI * 2 + rnd() * 0.35, 0.16 + rnd() * 0.3, 0.012, 0);
    // örümcek ağı halkaları
    [0.035, 0.08, 0.13].forEach((r, k) => {
      const n = 18 + k * 6;
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.35 + k * 0.15) continue;
        const a1 = (i / n) * Math.PI * 2;
        const a2 = ((i + 1) / n) * Math.PI * 2;
        const rr = r * (0.9 + rnd() * 0.2);
        push(new THREE.Vector2(C.x + Math.cos(a1) * rr, C.y + Math.sin(a1) * rr), new THREE.Vector2(C.x + Math.cos(a2) * rr, C.y + Math.sin(a2) * rr), rr, rr);
      }
    });
  }
  const crackGeo = new THREE.BufferGeometry();
  crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackPos, 3));
  crackGeo.setAttribute('aD', new THREE.Float32BufferAttribute(crackD, 1));
  const crackU = { uCrack: { value: 0 }, uResin: { value: 0 }, uTime: { value: 0 } };
  const crack = new THREE.LineSegments(crackGeo, new THREE.ShaderMaterial({
    uniforms: crackU,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float aD; varying float vD; void main(){ vD = aD; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */ `
      varying float vD; uniform float uCrack, uResin, uTime;
      ${GLSL_SD}
      void main() {
        if (vD > uCrack) discard;
        float head = smoothstep(uCrack - 0.08, uCrack, vD);
        vec3 c = mix(vec3(0.92, 0.95, 1.0), pal(vD * 1.5 + 0.1), 0.35) + head * 0.6;
        float filled = smoothstep(uResin - 0.06, uResin, vD);
        float a = mix(0.32, 1.0, filled);
        c = mix(vec3(0.62, 0.45, 1.0), c, filled);
        gl_FragColor = vec4(c * a, 1.0);
      }`,
  }));
  crack.renderOrder = 5;
  outer.add(crack);
  const cSurf = new THREE.Vector3(C.x, C.y, bendZ(C.x, C.y) + 0.01);
  const impactGlow = sprite(flareTex);
  impactGlow.position.copy(cSurf);
  outer.add(impactGlow);
  const ring = sprite(ringTex, 0xd8ccff);
  ring.position.copy(cSurf);
  outer.add(ring);
  const uvGlow = sprite(flareTex, 0x8a5cff);
  uvGlow.position.copy(cSurf).z += 0.12;
  outer.add(uvGlow);
  // UV lamba: camın üstünde küçük silindir
  const lamp = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 20), new THREE.MeshStandardMaterial({ color: 0x1b1824, roughness: 0.4, metalness: 0.6 }));
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.05, 20), new THREE.MeshBasicMaterial({ color: 0xb49cff }));
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.02;
    lamp.add(body, tip);
  }
  lamp.position.copy(cSurf).z += 0.06;
  lamp.rotation.set(-0.55, 0.7, 0);
  outer.add(lamp);

  // --- Taş -----------------------------------------------------------------------------
  const stoneGeo = new THREE.IcosahedronGeometry(0.055, 1);
  {
    const p = stoneGeo.attributes.position;
    const rnd = makeRng(5);
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(k)) seen.set(k, 0.75 + rnd() * 0.5);
      const f = seen.get(k);
      p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.8, p.getZ(i) * f);
    }
    stoneGeo.computeVertexNormals();
  }
  const stone = new THREE.Mesh(stoneGeo, new THREE.MeshStandardMaterial({ color: 0x8c8494, roughness: 0.85, flatShading: true }));
  pane.add(stone);
  const stoneFrom = new THREE.Vector3(-2.6, 2.4, 7);
  const stoneMid = new THREE.Vector3(-0.6, 1.0, 3.2);
  const stoneCurve = new THREE.QuadraticBezierCurve3(stoneFrom, stoneMid, cSurf.clone().add(new THREE.Vector3(0, 0, 0.05)));
  const stoneAway = new THREE.Vector3(1.6, -1.6, 2.4);

  // --- ADAS: kamera, yol ızgarası, hedef --------------------------------------------------
  const adas = new THREE.Group();
  scene.add(adas);
  const lensLocal = new THREE.Vector3(0, 0.56, bendZ(0, 0.56) - 0.07);
  const cam = new THREE.Group();
  {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: 0x15131d, roughness: 0.5, metalness: 0.4 }));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshBasicMaterial({ color: 0x3dd6ff }));
    lens.position.z = 0.072;
    cam.add(box, lens);
  }
  cam.position.copy(lensLocal);
  pane.add(cam);
  const lensGlow = sprite(flareTex, 0x3dd6ff);
  lensGlow.position.copy(lensLocal).z += 0.08;
  lensGlow.scale.setScalar(0.25);
  pane.add(lensGlow);

  const GY = -1.35;
  const gridPos = [];
  for (let x = -3; x <= 3.001; x += 0.5) gridPos.push(x, GY, 0.2, x, GY, 7);
  for (let z = 0.5; z <= 7.001; z += 0.5) gridPos.push(-3, GY, z, 3, GY, z);
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPos, 3));
  const lineMat = (color, fade = true) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAmt: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 uColor; uniform float uAmt;
      void main(){ float f = ${fade ? '(1.0 - smoothstep(2.0, 7.0, vP.z)) * (1.0 - smoothstep(1.8, 3.0, abs(vP.x)))' : '1.0'}; gl_FragColor = vec4(uColor * f * uAmt, 1.0); }`,
  });
  const grid = new THREE.LineSegments(gridGeo, lineMat('#6b5cff'));
  adas.add(grid);
  const TZ = 3.4;
  const target = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uAmt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uAmt;
      void main(){ vec2 g = floor(vUv * vec2(6.0, 4.0)); float c = mod(g.x + g.y, 2.0);
        vec3 col = mix(vec3(0.06,0.05,0.1), vec3(0.93,0.92,1.0), c);
        float b = step(0.02, vUv.x) * step(vUv.x, 0.98) * step(0.03, vUv.y) * step(vUv.y, 0.97);
        gl_FragColor = vec4(mix(vec3(1.0), col, b), 0.92 * uAmt); }`,
  }));
  target.rotation.x = -Math.PI / 2;
  target.position.set(0, GY + 0.005, TZ);
  adas.add(target);
  const fr = new Float32Array(8 * 2 * 3);
  const frGeo = new THREE.BufferGeometry();
  frGeo.setAttribute('position', new THREE.BufferAttribute(fr, 3));
  const frMat = lineMat('#ff4d8d', false);
  const frustum = new THREE.LineSegments(frGeo, frMat);
  frustum.frustumCulled = false;
  adas.add(frustum);
  const okCol = new THREE.Color('#3dd6ff');
  const badCol = new THREE.Color('#ff4d8d');

  // --- Toz -----------------------------------------------------------------------------
  const NP = low ? 120 : phone ? 220 : 380;
  const dustPos = new Float32Array(NP * 3);
  const dustSeed = new Float32Array(NP);
  {
    const rnd = makeRng(29);
    for (let i = 0; i < NP; i++) {
      dustPos[i * 3] = (rnd() - 0.5) * 9;
      dustPos[i * 3 + 1] = (rnd() - 0.5) * 5;
      dustPos[i * 3 + 2] = (rnd() - 0.5) * 7 - 1;
      dustSeed[i] = rnd();
    }
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aS', new THREE.BufferAttribute(dustSeed, 1));
  const dustU = { uTime: { value: 0 }, uAmt: { value: 1 }, uScale: { value: 1 } };
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustU,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aS; uniform float uTime, uScale; varying float vA; varying float vS;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.2 + aS * 30.0) * 0.25;
        p.x += cos(uTime * 0.15 + aS * 20.0) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.2 + aS * 3.2) * uScale / -mv.z;
        vA = 0.25 + 0.75 * abs(sin(uTime * 0.6 + aS * 50.0));
        vS = aS;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vS; uniform float uAmt;
      ${GLSL_SD}
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * uAmt;
        gl_FragColor = vec4(mix(vec3(1.0), pal(vS), 0.45) * a * 0.5, 1.0);
      }`,
  }));
  scene.add(dust);

  // --- Kamera planları -------------------------------------------------------------------
  const V = (cam, look, rake = -0.3) => ({ cam: new THREE.Vector3(...cam), look: new THREE.Vector3(...look), rake });
  const views = {
    hero: V([0.9, 0.35, 5.8], [0.05, -0.05, 0]),
    katman: V([4.2, 1.5, 3.0], [0.1, -0.05, -0.3], -0.22),
    tas: V([-0.9, 0.55, 4.4], [0.2, 0, 0]),
    tasYakin: V([0.8, 0.28, 2.1], [0.46, -0.05, -0.1]),
    recine: V([1.25, 0.75, 2.6], [0.4, -0.08, -0.1]),
    film: V([-1.6, 0.8, 5.4], [0.5, -0.35, -1.0]),
    adas: V([3.6, 2.6, 7.2], [0, -0.9, 1.6], -0.3),
    final: V([-0.4, 0.2, 6.2], [0.1, 0, -0.4]),
  };
  const cur = { cam: views.hero.cam.clone(), look: views.hero.look.clone(), rake: -0.3 };
  const goal = { cam: views.hero.cam.clone(), look: views.hero.look.clone(), rake: -0.3 };

  let W = 1;
  let Hh = 1;
  let distMul = 1;
  function resize() {
    W = innerWidth;
    Hh = innerHeight;
    renderer.setSize(W, Hh, false);
    const aspect = W / Hh;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 52 : 35;
    // telefonda camın ekrana sığması için kamerayı geri çek
    const want = 0.4; // yatay yarı açının tanjantı
    distMul = Math.min(2.4, Math.max(1, want / (Math.tan((camera.fov * Math.PI) / 360) * aspect)));
    if (aspect < 1) {
      camera.setViewOffset(W, Hh, 0, Hh * 0.16, W, Hh);
      bgU.uGlow.value.set(0.5, 0.64);
    } else {
      camera.setViewOffset(W, Hh, -W * 0.17, 0, W, Hh);
      bgU.uGlow.value.set(0.66, 0.5);
    }
    bgU.uAspect.value = aspect;
    camera.updateProjectionMatrix();
    dustU.uScale.value = (Hh * dpr) / 150;
  }
  resize();

  const tmp = new THREE.Vector3();
  function view(name, t = 1, from) {
    const a = views[from] || views[name];
    const b = views[name];
    goal.cam.lerpVectors(a.cam, b.cam, t);
    goal.look.lerpVectors(a.look, b.look, t);
    goal.rake = a.rake + (b.rake - a.rake) * t;
  }
  function snap() {
    cur.cam.copy(goal.cam);
    cur.look.copy(goal.look);
    cur.rake = goal.rake;
  }

  let pointerX = 0;
  let pointerY = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      pointerX = e.clientX / innerWidth - 0.5;
      pointerY = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  const clock = new THREE.Clock();
  let frames = 0;
  let slow = 0;
  let lastT = performance.now();
  const corners = [[-0.75, -0.5], [0.75, -0.5], [0.75, 0.5], [-0.75, 0.5]];
  const lensW = new THREE.Vector3();

  function render() {
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;
    // zayıf cihazda çözünürlüğü bir kez düşür
    if (frames < 240) {
      frames++;
      if (dt > 26) slow++;
      if (frames === 90 && slow > 40 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(dpr);
        resize();
      }
    }
    const t = clock.getElapsedTime();
    const k = 0.12;
    cur.cam.lerp(goal.cam, k);
    cur.look.lerp(goal.look, k);
    cur.rake += (goal.rake - cur.rake) * k;

    tmp.subVectors(cur.cam, cur.look).multiplyScalar(distMul).add(cur.look);
    tmp.x += pointerX * 0.35;
    tmp.y -= pointerY * 0.2;
    camera.position.copy(tmp);
    camera.lookAt(cur.look);

    rig.rotation.x = cur.rake;
    pane.rotation.y = Math.sin(t * 0.3) * 0.05 + S.spin;
    pane.rotation.z = Math.sin(t * 0.23) * 0.012;

    const hue = S.hue + t * 0.01;
    [outerMat, pvbMat, innerMat].forEach((m) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uGleam.value = S.gleam;
      m.uniforms.uGleamAmt.value = S.gleamAmt;
      m.uniforms.uHue.value = hue;
      m.uniforms.uIri.value = m === pvbMat ? 0.55 : S.iri;
    });
    outerMat.uniforms.uTint.value = S.tint;
    innerMat.uniforms.uTint.value = S.tint * 0.4;
    const sp = S.split;
    outer.position.z = 0.42 * sp;
    inner.position.z = -0.42 * sp;
    pvb.position.z = 0;
    pvbMat.uniforms.uAlpha.value = sp;
    innerMat.uniforms.uAlpha.value = 0.35 + 0.65 * sp;
    edgeU.uTime.value = t;
    edgeU.uHue.value = hue;
    edgeU.uAmt.value = 0.55 + 0.45 * S.beam;

    // ışın
    beamIn.material.uniforms.uAmt.value = S.beam * 0.9;
    beamIn.visible = S.beam > 0.001;
    const out = S.spec * (1 - S.specDim * 0.72);
    specBeams.forEach((m, i) => {
      let a = out;
      if (i === 6) a *= 1 - S.uvCut;
      m.material.uniforms.uAmt.value = a * 1.35;
      m.material.uniforms.uTime.value = t;
      m.visible = a > 0.001;
    });
    beamIn.material.uniforms.uTime.value = t;
    flare.material.opacity = Math.max(S.beam, S.spec) * (0.85 + Math.sin(t * 3) * 0.08);
    flare.scale.setScalar(phone ? 0.9 : 0.75);
    flare.visible = flare.material.opacity > 0.01;

    // çatlak ve reçine
    crackU.uCrack.value = S.crack * 1.02;
    crackU.uResin.value = S.resin * 1.1;
    crack.visible = S.crack > 0.001;
    impactGlow.material.opacity = S.ring * 1.2;
    impactGlow.scale.setScalar(0.25 + S.ring * 0.6);
    impactGlow.visible = S.ring > 0.01;
    ring.material.opacity = S.ring * 0.8;
    ring.scale.setScalar(0.05 + (1 - S.ring) * 1.2);
    ring.visible = S.ring > 0.01;
    uvGlow.material.opacity = S.uv * (0.8 + Math.sin(t * 9) * 0.2);
    uvGlow.scale.setScalar(0.5 + S.uv * 0.25);
    uvGlow.visible = S.uv > 0.01;
    lamp.visible = S.uv > 0.01 || S.resin > 0.01 && S.resin < 0.999;
    lamp.position.z = cSurf.z + 0.06 + (1 - Math.min(1, (S.uv + (S.resin > 0 && S.resin < 1 ? 1 : 0)))) * 0.4;

    // taş
    if (S.stone > 0 && S.stone < 1) {
      stone.visible = true;
      stoneCurve.getPoint(S.stone, stone.position);
      stone.rotation.set(t * 4, t * 3, 0);
      stone.scale.setScalar(1);
    } else if (S.stoneOut > 0 && S.stoneOut < 1) {
      stone.visible = true;
      stone.position.copy(cSurf).addScaledVector(stoneAway, S.stoneOut);
      stone.position.z += S.stoneOut * 0.4;
      stone.rotation.set(t * 6, t * 5, 0);
    } else stone.visible = false;

    // ADAS
    const aOn = S.adas;
    adas.visible = aOn > 0.001;
    cam.visible = aOn > 0.001;
    lensGlow.visible = aOn > 0.001;
    lensGlow.material.opacity = aOn;
    if (adas.visible) {
      grid.material.uniforms.uAmt.value = aOn * 0.6;
      target.material.uniforms.uAmt.value = aOn;
      cam.scale.setScalar(aOn);
      pane.updateMatrixWorld();
      lensW.copy(lensLocal).setZ(lensLocal.z + 0.08);
      pane.localToWorld(lensW);
      const err = S.adasErr;
      const yaw = err * 0.32;
      const off = err * 0.45;
      const cs = Math.cos(yaw);
      const sn = Math.sin(yaw);
      const pts = corners.map(([x, z]) => {
        const rx = x * cs - z * sn + off;
        const rz = x * sn + z * cs + TZ + err * 0.25;
        return [rx, GY + 0.01, rz];
      });
      let o = 0;
      const put = (a, b) => {
        fr.set(a, o);
        fr.set(b, o + 3);
        o += 6;
      };
      const L = [lensW.x, lensW.y, lensW.z];
      pts.forEach((p) => put(L, p));
      pts.forEach((p, i) => put(p, pts[(i + 1) % 4]));
      frGeo.attributes.position.needsUpdate = true;
      frMat.uniforms.uColor.value.copy(badCol).lerp(okCol, 1 - err);
      frMat.uniforms.uAmt.value = aOn;
    }

    dustU.uTime.value = t;
    dustU.uAmt.value = S.dust;
    bgU.uAmt.value = S.glow;
    bgU.uHue.value = hue;
    bgU.uTint.value = S.tint;

    renderer.render(scene, camera);
  }

  // katman etiketleri için ekran konumu
  const proj = new THREE.Vector3();
  function project(which) {
    const m = which === 'outer' ? outer : which === 'pvb' ? pvb : inner;
    const y = which === 'outer' ? 0.45 : which === 'pvb' ? 0 : -0.45;
    const x = 1.62 - (y + 0.8) * 0.2;
    proj.set(x, y, bendZ(x, y));
    m.updateMatrixWorld();
    m.localToWorld(proj);
    proj.project(camera);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (-proj.y * 0.5 + 0.5) * Hh, z: proj.z };
  }

  return { S, render, resize, view, snap, project };
}
