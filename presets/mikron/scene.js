// Mikron: kaydırmayla oynatılan tezgâh sahnesi.
// Üç istasyon tek sahnede: A) krank taşlama, B) kesitli blokta honlama, C) kafa planyası.
// Dışarıya: createScene(canvas, opts) → { setProgress(p), anchors, project(v3), resize(), start(), stop(), render() }
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- dokular

function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Taşlanmamış muylu: çevresel çizikler, ısıdan morarma, oyuklar (u = çevre, v = boy)
function scoredMaps(size) {
  const W = size, H = size / 4;
  const color = canvasTex(W, H, (g) => {
    g.fillStyle = '#8d9197';
    g.fillRect(0, 0, W, H);
    // ısı renkleri (saman sarısı, mor)
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 20 + Math.random() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c = Math.random() < 0.5 ? '120,86,40' : '70,62,110';
      gr.addColorStop(0, `rgba(${c},.55)`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // çevresel çizikler (u yönünde yatay çizgiler)
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * H;
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,42,46' : '190,194,200'},${0.15 + Math.random() * 0.4})`;
      g.lineWidth = Math.random() < 0.9 ? 0.6 : 1.6;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y + (Math.random() - 0.5) * 2);
      g.stroke();
    }
    // oyuklar
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(30,30,32,${0.3 + Math.random() * 0.4})`;
      g.beginPath();
      g.ellipse(Math.random() * W, Math.random() * H, 1 + Math.random() * 4, 0.6 + Math.random() * 1.5, 0, 0, 7);
      g.fill();
    }
  });
  const rough = canvasTex(W, H, (g) => {
    g.fillStyle = 'rgb(150,150,150)';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 320; i++) {
      const y = Math.random() * H;
      const v = 90 + Math.random() * 160;
      g.strokeStyle = `rgba(${v},${v},${v},.6)`;
      g.lineWidth = 0.5 + Math.random() * 1.5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
  }, { srgb: false });
  color.wrapS = rough.wrapS = THREE.RepeatWrapping;
  return { color, rough };
}

// Zımpara taşı dokusu
function grainTex(size) {
  return canvasTex(size, size / 4, (g, w, h) => {
    g.fillStyle = '#7b8189';
    g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 70;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n + 6;
    }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}

// Kafa yüzeyi: yanma odaları, supap yuvaları, saplama ve su delikleri (x boy, y en)
function deckFeatures(W, H, chambers, holes) {
  return canvasTex(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    for (const c of chambers) {
      g.fillStyle = '#15171a';
      g.beginPath();
      g.ellipse(c.x * W, c.y * H, c.r * W, c.r * W * 0.92, 0, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(210,214,220,.55)';
      g.lineWidth = 2;
      g.stroke();
      for (const [dx, dy, rr] of [[-0.35, -0.35, 0.34], [0.35, -0.35, 0.34], [-0.35, 0.35, 0.3], [0.35, 0.35, 0.3]]) {
        g.fillStyle = '#2b2f34';
        g.beginPath();
        g.arc((c.x + dx * c.r) * W, (c.y + dy * c.r * 1.1) * H, rr * c.r * W, 0, 7);
        g.fill();
        g.strokeStyle = 'rgba(200,205,210,.7)';
        g.lineWidth = 1.5;
        g.stroke();
      }
    }
    for (const h of holes) {
      g.fillStyle = h.su ? '#1c2a2e' : '#0c0d0f';
      g.beginPath();
      g.arc(h.x * W, h.y * H, h.r * W, 0, 7);
      g.fill();
    }
  });
}

// ---------------------------------------------------------------- malzemeler

function steel(opts = {}) {
  return new THREE.MeshStandardMaterial({ color: 0xa9aeb4, metalness: 1, roughness: 0.32, ...opts });
}

// Taşlanan muylu: uMix 0 → çizikli, 1 → ayna
function journalMaterial(maps) {
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: maps.color, roughnessMap: maps.rough, metalness: 1, roughness: 0.75,
  });
  m.userData.u = { uMix: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMix = m.userData.u.uMix;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uMix;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.97), uMix);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.045, uMix);`
      );
  };
  return m;
}

// Kesitli silindir iç yüzeyi: uHone 0 → bara izi + çizik, 1 → çapraz hon izi
function boreMaterial(r, h) {
  const m = new THREE.MeshStandardMaterial({ color: 0xb4b9bf, metalness: 1, roughness: 0.4, side: THREE.DoubleSide });
  m.userData.u = { uHone: { value: 0 }, uR: { value: r }, uH: { value: h } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vUv2;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vUv2; uniform float uHone, uR, uH;
        float hsh(float n){ return fract(sin(n) * 43758.5453); }
        float lines(float x, float w){ float f = fract(x); return 1.0 - smoothstep(0.0, w, min(f, 1.0 - f)); }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float s = vUv2.x * 3.14159 * uR * 100.0;   // çevre boyunca, mm
        float t = vUv2.y * uH * 100.0;              // boy, mm
        // bara izi: ince çevresel spiral + düşey çizikler
        float bore = lines(t * 1.6 + s * 0.004, 0.12) * 0.5;
        float scuff = lines(s * 0.35 + hsh(floor(s * 0.35)) * 3.0, 0.03) * step(0.6, hsh(floor(s * 0.35) + 7.0));
        // çapraz hon izi (±30°), iki frekans
        float k = 0.577;
        float h1 = lines((t + s * k) * 0.9, 0.08) + lines((t + s * k) * 0.37 + 0.3, 0.05) * 0.6;
        float h2 = lines((t - s * k) * 0.9, 0.08) + lines((t - s * k) * 0.37 + 0.6, 0.05) * 0.6;
        float hone = clamp(h1 + h2, 0.0, 1.0);
        float before = clamp(bore + scuff, 0.0, 1.0);
        float mark = mix(before, hone, uHone);
        roughnessFactor = mix(mix(0.45, 0.22, uHone), 0.7, mark);
        diffuseColor.rgb *= mix(1.0, mix(0.72, 0.6, uHone), mark);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.8, 0.72), (1.0 - uHone) * 0.5);`
      );
  };
  return m;
}

// Teknik resim kesit taraması (45°, layout boyası mavisi)
function hatchMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0x9aa0a7, metalness: 0.85, roughness: 0.45 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float hv = fract((vWp.x + vWp.y) * 7.0);
        float hl = 1.0 - smoothstep(0.0, 0.09, min(hv, 1.0 - hv));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.28, 0.85), hl * 0.85);
        roughnessFactor = mix(roughnessFactor, 0.8, hl);`
      );
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  };
  return m;
}

// Kafa yüzeyi: uCut'ın gerisi (x < uCut) freze izli temiz yüzey, önü contalı/kirli
function deckMaterial(features, L, Wd, Rc, feed) {
  const m = new THREE.MeshStandardMaterial({ color: 0xa8adb3, metalness: 1, roughness: 0.55, map: features, transparent: false });
  m.userData.u = { uCut: { value: -10 }, uL: { value: L }, uW: { value: Wd }, uRc: { value: Rc }, uFeed: { value: feed } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vUv2;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vUv2; uniform float uCut, uL, uW, uRc, uFeed;
        float hs(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hs(i), hs(i+vec2(1,0)), f.x), mix(hs(i+vec2(0,1)), hs(i+vec2(1,1)), f.x), f.y); }`
      )
      .replace(
        '#include <map_fragment>',
        `vec4 feat = texture2D(map, vUv2);
        float x = (vUv2.x - 0.5) * uL, z = (vUv2.y - 0.5) * uW;
        float done = smoothstep(0.02, -0.02, x - uCut);
        // önce: conta kalıntısı, is, pas lekeleri
        float n = vn(vec2(x, z) * 6.0) * 0.6 + vn(vec2(x, z) * 23.0) * 0.4;
        vec3 dirty = mix(vec3(0.2, 0.19, 0.18), vec3(0.34, 0.25, 0.16), smoothstep(0.4, 0.85, n));
        dirty = mix(dirty, vec3(0.06, 0.055, 0.05), smoothstep(0.62, 0.9, vn(vec2(x, z) * 3.0)));
        dirty = mix(dirty, vec3(0.42, 0.4, 0.38), smoothstep(0.8, 0.95, vn(vec2(x, z) * 40.0)) * 0.6);
        // sonra: freze yay izleri
        float ph = (x + sqrt(max(uRc * uRc - z * z, 0.0))) / uFeed;
        float arc = 1.0 - smoothstep(0.0, 0.18, min(fract(ph), 1.0 - fract(ph)));
        vec3 clean = mix(vec3(0.9, 0.92, 0.94), vec3(0.62, 0.65, 0.69), arc * 0.55);
        diffuseColor.rgb = mix(dirty, clean, done);
        diffuseColor.rgb = mix(diffuseColor.rgb, feat.rgb, feat.a);
        float deckRough = mix(mix(0.85, 0.9, n), mix(0.12, 0.3, arc), done);
        deckRough = mix(deckRough, 0.6, feat.a);`
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = deckRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.55, 1.0, done);');
  };
  return m;
}

// ---------------------------------------------------------------- parçacıklar

function particles(count, { size = 5, color = 0xffb35c, additive = true } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const life = new Float32Array(count);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('life', new THREE.BufferAttribute(life, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uSize: { value: size }, uColor: { value: new THREE.Color(color) }, uPx: { value: 1 } },
    vertexShader: `attribute float life; varying float vL; uniform float uSize, uPx;
      void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * uPx * (0.4 + life) * (3.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vL; uniform vec3 uColor;
      void main(){ if (vL <= 0.0) discard; vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d) * vL;
        vec3 col = mix(uColor * vec3(1.0, 0.45, 0.2), mix(uColor, vec3(1.0), 0.55), vL);
        gl_FragColor = vec4(col, a); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const vel = new Float32Array(count * 3);
  let cursor = 0;
  return {
    points, mat,
    emit(n, origin, spread) {
      for (let k = 0; k < n; k++) {
        const i = cursor;
        cursor = (cursor + 1) % count;
        pos[i * 3] = origin.x + (Math.random() - 0.5) * spread.x;
        pos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * spread.y;
        pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * spread.z;
        const v = spread.vel();
        vel[i * 3] = v[0];
        vel[i * 3 + 1] = v[1];
        vel[i * 3 + 2] = v[2];
        life[i] = 0.7 + Math.random() * 0.3;
      }
    },
    update(dt, gravity = -6, decay = 1.6) {
      for (let i = 0; i < count; i++) {
        if (life[i] <= 0) continue;
        vel[i * 3 + 1] += gravity * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        life[i] -= dt * decay;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.life.needsUpdate = true;
    },
    clear() {
      life.fill(0);
      geo.attributes.life.needsUpdate = true;
    },
  };
}

// Kıvılcım izleri: her parçacık kısa, parlak bir çizgi (baş parlak, kuyruk sönük)
function streaks(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 6);
  const col = new Float32Array(count * 6);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  const p = new Float32Array(count * 3), v = new Float32Array(count * 3), life = new Float32Array(count);
  let cur = 0;
  return {
    lines,
    emit(n, o, spread, velFn) {
      for (let k = 0; k < n; k++) {
        const i = cur;
        cur = (cur + 1) % count;
        p[i * 3] = o.x + (Math.random() - 0.5) * spread;
        p[i * 3 + 1] = o.y;
        p[i * 3 + 2] = o.z;
        const vv = velFn();
        v[i * 3] = vv[0]; v[i * 3 + 1] = vv[1]; v[i * 3 + 2] = vv[2];
        life[i] = 0.6 + Math.random() * 0.4;
      }
    },
    update(dt) {
      for (let i = 0; i < count; i++) {
        const j = i * 6;
        if (life[i] <= 0) {
          col[j] = col[j + 1] = col[j + 2] = col[j + 3] = col[j + 4] = col[j + 5] = 0;
          continue;
        }
        v[i * 3 + 1] -= 5.5 * dt;
        p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
        life[i] -= dt * 1.7;
        const tail = 0.05;
        pos[j] = p[i * 3]; pos[j + 1] = p[i * 3 + 1]; pos[j + 2] = p[i * 3 + 2];
        pos[j + 3] = p[i * 3] - v[i * 3] * tail; pos[j + 4] = p[i * 3 + 1] - v[i * 3 + 1] * tail; pos[j + 5] = p[i * 3 + 2] - v[i * 3 + 2] * tail;
        const L = Math.max(0, life[i]);
        col[j] = 1.0 * L * 1.6; col[j + 1] = 0.75 * L * 1.4; col[j + 2] = 0.35 * L;
        col[j + 3] = 0.6 * L * 0.5; col[j + 4] = 0.18 * L * 0.5; col[j + 5] = 0.02;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- A: krank

const J = { mainR: 0.28, rodR: 0.24, throw: 0.42, mainL: 0.3, rodL: 0.26, web: 0.13 };

function webGeometry(seg) {
  const s = new THREE.Shape();
  s.moveTo(J.throw, -0.28);
  s.absarc(J.throw, 0, 0.28, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(0.05, 0.36);
  const a0 = (118 * Math.PI) / 180, a1 = (242 * Math.PI) / 180;
  s.lineTo(0.56 * Math.cos(a0), 0.56 * Math.sin(a0));
  s.absarc(0, 0, 0.56, a0, a1, false);
  s.lineTo(0.05, -0.36);
  s.lineTo(J.throw, -0.28);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: J.web, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 3, curveSegments: seg,
  });
  g.translate(0, 0, -J.web / 2);
  g.rotateY(Math.PI / 2); // şekil (u,v) → (-z, y), ekstrüzyon x boyunca
  return g;
}

function buildCrank(q) {
  const group = new THREE.Group();
  const mat = steel({ roughness: 0.28 });
  const webMat = steel({ color: 0x565c63, roughness: 0.62, metalness: 0.85 });
  const seg = q.low ? 28 : 56;
  const webGeo = webGeometry(q.low ? 10 : 20);
  const maps = scoredMaps(q.low ? 512 : 1024);
  const hero = journalMaterial(maps);
  // dizilim: burun, M1, W, R1, W, M2, W, R2, W, M3 ...
  const throws = [0, Math.PI, Math.PI, 0];
  let x = -2.3;
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, seg), mat);
  snout.rotation.z = Math.PI / 2;
  snout.position.x = x + 0.25;
  group.add(snout);
  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 36), webMat);
  gear.rotation.z = Math.PI / 2;
  gear.position.x = x + 0.15;
  group.add(gear);
  x += 0.5;
  const mains = [];
  const addMain = (heroJournal) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(J.mainR, J.mainR, J.mainL, seg, 1), heroJournal ? hero : mat);
    m.rotation.z = Math.PI / 2;
    m.position.x = x + J.mainL / 2;
    group.add(m);
    mains.push(m);
    x += J.mainL;
  };
  const addWeb = (theta) => {
    const w = new THREE.Mesh(webGeo, webMat);
    w.position.x = x + J.web / 2;
    w.rotation.x = theta;
    group.add(w);
    x += J.web;
  };
  const addRod = (theta) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(J.rodR, J.rodR, J.rodL, seg, 1), mat);
    r.rotation.z = Math.PI / 2;
    const off = new THREE.Vector3(0, 0, -J.throw).applyAxisAngle(new THREE.Vector3(1, 0, 0), theta);
    r.position.set(x + J.rodL / 2, off.y, off.z);
    group.add(r);
    x += J.rodL;
  };
  addMain(false);
  throws.forEach((t, i) => {
    addWeb(t);
    addRod(t);
    addWeb(t);
    addMain(i === 1); // M3 taşlanan muylu
  });
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, seg), mat);
  flange.rotation.z = Math.PI / 2;
  flange.position.x = x + 0.06;
  group.add(flange);
  // merkezle
  const cx = (x + 0.12 - 2.3) / 2;
  group.children.forEach((c) => (c.position.x -= cx));
  const heroX = mains[2].position.x;
  return { group, hero, heroX, length: x + 0.12 + 2.3 };
}

function buildGrinder(q, heroX) {
  const group = new THREE.Group();
  const R = 2.1;
  const wheelTex = grainTex(q.low ? 512 : 1024);
  wheelTex.repeat.set(6, 1);
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, J.mainL * 0.94, q.low ? 64 : 120, 1),
    [
      new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 1, metalness: 0, color: 0xc6ccd4 }),
      new THREE.MeshStandardMaterial({ color: 0x3b4450, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x3b4450, roughness: 0.9 }),
    ]
  );
  wheel.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.5, 32), steel({ color: 0x5b6168, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  const spin = new THREE.Group();
  spin.add(wheel, hub);
  // koruyucu kapak (yarım silindir)
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.46, 48, 1, true, Math.PI * 0.62, Math.PI * 0.75),
    new THREE.MeshStandardMaterial({ color: 0x27336e, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide })
  );
  guard.rotation.z = Math.PI / 2;
  guard.rotation.y = Math.PI;
  group.add(spin);
  guard.visible = false;
  group.position.x = heroX;
  // soğutma nozulu
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.9, 12), steel({ color: 0x3a4048 }));
  nozzle.position.set(heroX, 0.62, -0.35);
  nozzle.rotation.x = 0.7;
  return { group, spin, guard, R, nozzle };
}

// ---------------------------------------------------------------- B: kesitli blok

function buildBlock(q) {
  const group = new THREE.Group();
  const r = 0.375, h = 1.3, pitch = 0.86, n = 4;
  const W = pitch * n + 0.3, D = 1.1, H = 1.75, top = 0.45;
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch);
  const bores = xs.map((bx) => {
    const m = boreMaterial(r, h);
    const g = new THREE.CylinderGeometry(r, r, h, q.low ? 48 : 96, 1, true, Math.PI / 2, Math.PI);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(bx, top - h / 2, 0);
    group.add(mesh);
    return { mesh, mat: m, x: bx };
  });
  // kesit yüzü (z = 0): dikdörtgen eksi silindir boşlukları
  const sec = new THREE.Shape();
  sec.moveTo(-W / 2, top - H);
  sec.lineTo(W / 2, top - H);
  sec.lineTo(W / 2, top);
  for (let i = n - 1; i >= 0; i--) {
    sec.lineTo(xs[i] + r, top);
    sec.lineTo(xs[i] + r, top - h);
    sec.lineTo(xs[i] - r, top - h);
    sec.lineTo(xs[i] - r, top);
  }
  sec.lineTo(-W / 2, top);
  sec.lineTo(-W / 2, top - H);
  const hatch = hatchMaterial();
  const face = new THREE.Mesh(new THREE.ShapeGeometry(sec), hatch);
  group.add(face);
  // üst yüzey (silindir ağızlarıyla)
  const deck = new THREE.Shape();
  deck.moveTo(-W / 2, 0);
  for (const bx of xs) {
    deck.lineTo(bx - r, 0);
    deck.absarc(bx, 0, r, Math.PI, 0, true);
  }
  deck.lineTo(W / 2, 0);
  deck.lineTo(W / 2, D);
  deck.lineTo(-W / 2, D);
  deck.lineTo(-W / 2, 0);
  const deckGeo = new THREE.ShapeGeometry(deck, 40);
  deckGeo.rotateX(-Math.PI / 2);
  const castMat = new THREE.MeshStandardMaterial({ color: 0x6e737a, metalness: 0.8, roughness: 0.62 });
  const deckMesh = new THREE.Mesh(deckGeo, steel({ color: 0x9da3aa, roughness: 0.35 }));
  deckMesh.position.y = top;
  group.add(deckMesh);
  // yan ve alt yüzler
  const side = new THREE.Mesh(new THREE.PlaneGeometry(D, H), castMat);
  side.rotation.y = Math.PI / 2;
  side.position.set(W / 2, top - H / 2, -D / 2);
  const side2 = side.clone();
  side2.rotation.y = -Math.PI / 2;
  side2.position.x = -W / 2;
  group.add(side, side2);
  // bor diplerinde karter tarafı (koyu)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x191b1e, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, top - h, -D / 2);
  group.add(floor);

  // hon başlığı: mil + 4 taş
  const hone = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 16), steel({ color: 0x8e949b }));
  shaft.position.y = 1.2;
  hone.add(shaft);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.38, 24), steel({ color: 0x7b828a, roughness: 0.35 }));
  hone.add(body);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2f5a7a, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.11), stoneMat);
    st.position.set(Math.cos(a) * (r - 0.03), 0, Math.sin(a) * (r - 0.03));
    st.rotation.y = -a;
    hone.add(st);
  }
  group.add(hone);
  return { group, bores, hone, r, h, top, W, D };
}

// ---------------------------------------------------------------- C: kafa

function buildHead(q) {
  const group = new THREE.Group();
  const L = 3.5, Wd = 1.15, T = 0.42, Rc = 0.62, feed = 0.05;
  const chambers = [0, 1, 2, 3].map((i) => ({ x: 0.5 + (i - 1.5) * 0.235, y: 0.5, r: 0.07 }));
  const holes = [];
  for (let i = 0; i < 5; i++) {
    const x = 0.5 + (i - 2) * 0.235;
    holes.push({ x, y: 0.1, r: 0.012 }, { x, y: 0.9, r: 0.012 });
  }
  for (let i = 0; i < 8; i++) holes.push({ x: 0.08 + i * 0.12, y: 0.82, r: 0.008, su: true });
  const feat = deckFeatures(q.low ? 1024 : 2048, q.low ? 340 : 680, chambers, holes);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), deckMaterial(feat, L, Wd, Rc, feed));
  top.rotation.x = -Math.PI / 2;
  top.position.y = T / 2;
  group.add(top);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.7, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(L, T, Wd), [bodyMat, bodyMat, bodyMat, bodyMat, bodyMat, bodyMat]);
  body.position.y = -0.001;
  body.scale.y = 0.995;
  group.add(body);
  // tezgâh tablası
  const bed = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x24282d, metalness: 0.6, roughness: 0.5 }));
  bed.position.y = -T / 2 - 0.1;
  group.add(bed);
  for (let i = -2; i <= 2; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(6, 0.02, 0.08), new THREE.MeshBasicMaterial({ color: 0x0b0c0d }));
    slot.position.set(0, -T / 2 + 0.001, i * 0.42);
    group.add(slot);
  }
  // freze çakısı: disk + 6 uç, dikey mil
  const cutter = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(Rc, Rc * 0.9, 0.14, 64), steel({ color: 0x9aa1a8, roughness: 0.22 }));
  cutter.add(disc);
  const insertMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.3 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ins = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.05), insertMat);
    ins.position.set(Math.cos(a) * (Rc - 0.05), -0.08, Math.sin(a) * (Rc - 0.05));
    ins.rotation.y = -a;
    cutter.add(ins);
  }
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.4, 32), steel({ color: 0x3a4047, roughness: 0.4 }));
  spindle.position.y = 1.26;
  const spinGroup = new THREE.Group();
  spinGroup.add(cutter);
  const head = new THREE.Group();
  head.add(spinGroup, spindle);
  head.position.y = T / 2 + 0.07;
  group.add(head);
  // cetvel (düzlemsellik kontrolü)
  const ruler = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(L * 0.95, 0.07, 0.1), steel({ color: 0x2a2e33, roughness: 0.3 }));
  const edge = new THREE.Mesh(new THREE.BoxGeometry(L * 0.95, 0.012, 0.102), steel({ color: 0xf2f4f6, roughness: 0.08 }));
  edge.position.y = -0.03;
  ruler.add(bar, edge);
  ruler.position.set(0, T / 2 + 0.035, 0.25);
  ruler.rotation.y = 0.06;
  group.add(ruler);
  // sentil: cetvelin altına sokulan ince yaprak
  const feeler = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.004, 0.07), new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 1, roughness: 0.25 }));
  feeler.position.set(0.4, T / 2 + 0.003, 0.62);
  feeler.rotation.y = -1.2;
  group.add(feeler);
  return { group, top, head, spinGroup, cutterR: Rc, L, Wd, T, ruler, feeler };
}

// ---------------------------------------------------------------- sahne

export function createScene(canvas, { low = false, reduced = false } = {}) {
  const q = { low };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  const maxDpr = low ? 1.2 : Math.min(1.5, window.innerWidth < 700 ? 1.3 : 1.5);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1113);
  scene.fog = new THREE.Fog(0x0f1113, 7, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);

  const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0x6f86ff, 2.4);
  rim.position.set(-4, 2, -5);
  const fill = new THREE.HemisphereLight(0xb8c4d8, 0x1a1c20, 0.35);
  scene.add(key, rim, fill);

  // A: krank + taş (x = 0)
  const crank = buildCrank(q);
  scene.add(crank.group);
  const grinder = buildGrinder(q, crank.heroX);
  const WHEEL_IN = -(J.mainR + grinder.R);
  const WHEEL_OUT = WHEEL_IN - 0.9;
  grinder.group.position.z = WHEEL_OUT;
  scene.add(grinder.group, grinder.nozzle);
  const contactLight = new THREE.PointLight(0xff9a3c, 0, 3, 2);
  contactLight.position.set(crank.heroX, 0.15, -J.mainR - 0.05);
  scene.add(contactLight);

  // B: blok (x = 10)
  const BX = 10;
  const block = buildBlock(q);
  block.group.position.x = BX;
  scene.add(block.group);
  const boreLight = new THREE.PointLight(0xdfe7ff, 1.6, 4, 2);
  boreLight.position.set(BX, 0.9, 1.2);
  scene.add(boreLight);

  // C: kafa (x = 20)
  const HX = 20;
  const head = buildHead(q);
  head.group.position.x = HX;
  scene.add(head.group);

  // parçacıklar
  const sparks = particles(low ? 300 : 800, { size: low ? 5.5 : 6, color: 0xffc35a });
  const coolant = particles(low ? 120 : 260, { size: 4, color: 0xcfe6ea, additive: false });
  const chips = particles(low ? 120 : 260, { size: 5, color: 0xd9dde2, additive: false });
  const trails = streaks(low ? 220 : 520);
  scene.add(sparks.points, coolant.points, chips.points, trails.lines);

  // --- kamera kareleri (p: film ilerlemesi 0..1, wide: dar ekranda geri çekilme ağırlığı)
  const hx = crank.heroX;
  const bx2 = BX + block.bores[1].x;
  const K = [
    { p: 0.0, pos: [2.5, 1.55, 3.7], tgt: [-0.75, -0.05, 0], wide: 1 },
    { p: 0.1, pos: [hx + 0.7, 1.45, 2.1], tgt: [hx, 0, -0.3], wide: 0.6 },
    { p: 0.17, pos: [hx + 0.05, 1.08, 1.02], tgt: [hx, -0.02, -0.34], wide: 0.15 },
    { p: 0.34, pos: [hx + 0.03, 0.9, 0.82], tgt: [hx, 0.0, -0.3], wide: 0.1 },
    { p: 0.385, pos: [hx + 1.9, 1.9, 2.7], tgt: [hx - 0.2, 0, -0.3], wide: 1 },
    { p: 0.43, pos: [BX + 2.4, 2.0, 3.6], tgt: [BX, -0.25, -0.3], wide: 1 },
    { p: 0.5, pos: [BX + 1.7, 1.6, 3.3], tgt: [BX - 0.2, -0.2, -0.3], wide: 1 },
    { p: 0.56, pos: [bx2 + 0.95, 0.95, 2.2], tgt: [bx2 + 0.2, -0.2, -0.3], wide: 0.55 },
    { p: 0.72, pos: [bx2 + 1.6, 0.65, 2.3], tgt: [bx2 + 0.7, -0.25, -0.3], wide: 0.6 },
    { p: 0.775, pos: [HX + 2.2, 2.4, 3.3], tgt: [HX, 0, 0], wide: 1 },
    { p: 0.86, pos: [HX + 1.1, 1.7, 2.5], tgt: [HX, 0.1, 0], wide: 0.9 },
    { p: 0.96, pos: [HX + 0.3, 1.3, 2.2], tgt: [HX + 0.1, 0.15, 0], wide: 0.85 },
    { p: 1.0, pos: [HX - 0.5, 1.15, 2.2], tgt: [HX + 0.1, 0.15, 0.1], wide: 0.85 },
  ];
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  let aspect = 1;
  function cameraAt(p) {
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1].p) i++;
    const a = K[i], b = K[i + 1];
    const t = smooth(a.p, b.p, p);
    const pos = tmpA.fromArray(a.pos).lerp(tmpB.fromArray(b.pos), t).clone();
    const tgt = tmpA.fromArray(a.tgt).lerp(tmpB.fromArray(b.tgt), t).clone();
    const wide = lerp(a.wide, b.wide, t);
    // dar ekranda (telefon) hedeften uzaklaş
    const fit = Math.min(2.3, Math.max(1, 1.35 / aspect));
    const scale = 1 + (Math.pow(fit, 0.9) - 1) * wide;
    pos.sub(tgt).multiplyScalar(scale).add(tgt);
    return { pos, tgt };
  }

  // --- sahne durumu
  const S = { p: 0, grind: 0, wheelIn: 0, hone: [0, 0, 0, 0], honeBore: 0, cut: 0, cutterOn: 0, ruler: 0 };
  function setProgress(p) {
    S.p = p;
    S.wheelIn = smooth(0.12, 0.2, p) * (1 - smooth(0.36, 0.41, p));
    S.grind = smooth(0.19, 0.34, p);
    const hp = smooth(0.53, 0.72, p) * 4;
    S.hone = [0, 1, 2, 3].map((i) => Math.min(1, Math.max(0, hp - i)));
    S.honeBore = Math.min(3, Math.floor(hp));
    S.cut = smooth(0.83, 0.95, p);
    S.cutterOn = smooth(0.8, 0.84, p) * (1 - smooth(0.95, 0.975, p));
    S.ruler = smooth(0.95, 0.985, p);
  }

  // --- 3D çapa noktaları (ölçü çizgileri için)
  const anchors = {
    journalA: new THREE.Vector3(hx, J.mainR, 0),
    journalB: new THREE.Vector3(hx, -J.mainR, 0),
    boreA: new THREE.Vector3(bx2 - block.r, block.top - 0.9, 0),
    boreB: new THREE.Vector3(bx2 + block.r, block.top - 0.9, 0),
    deckA: new THREE.Vector3(HX - head.L / 2, head.T / 2, head.Wd / 2),
    deckB: new THREE.Vector3(HX + head.L / 2, head.T / 2, head.Wd / 2),
  };
  const projV = new THREE.Vector3();
  const size = { w: 1, h: 1 };
  function project(v) {
    projV.copy(v).project(camera);
    return { x: (projV.x * 0.5 + 0.5) * size.w, y: (-projV.y * 0.5 + 0.5) * size.h, z: projV.z };
  }

  let viewShift = 0;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    size.w = w;
    size.h = h;
    aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 40 : 34;
    // telefonda konuyu yukarı al (alttaki metin paneline yer aç)
    viewShift = aspect < 0.8 ? h * 0.17 : 0;
    if (viewShift) camera.setViewOffset(w, h, 0, viewShift, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    sparks.mat.uniforms.uPx.value = coolant.mat.uniforms.uPx.value = chips.mat.uniforms.uPx.value = renderer.getPixelRatio() * (h / 800);
  }

  // --- kare döngüsü
  const clock = new THREE.Clock();
  let running = false;
  let raf = 0;
  let camPos = null, camTgt = null;
  const contact = new THREE.Vector3(hx, J.mainR * 0.55, -J.mainR * 0.82);
  let spinA = 0, spinWheel = 0, spinHone = 0, spinCut = 0, t = 0;
  const onFrame = [];

  function step(dt) {
    t += dt;
    const { pos, tgt } = cameraAt(S.p);
    if (!camPos || dt === 0) {
      camPos = pos.clone();
      camTgt = tgt.clone();
    } else {
      const k = 1 - Math.pow(0.0015, dt);
      camPos.lerp(pos, k);
      camTgt.lerp(tgt, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    // A: krank döner, taş yaklaşır ve döner
    const grinding = S.wheelIn > 0.98 && S.grind < 1 && S.p < 0.4;
    spinA += dt * (0.5 + S.wheelIn * 1.2);
    crank.group.rotation.x = -spinA;
    spinWheel += dt * (1 + S.wheelIn * 14);
    grinder.spin.rotation.x = spinWheel;
    grinder.group.position.z = lerp(WHEEL_OUT, WHEEL_IN - 0.004, S.wheelIn);
    crank.hero.userData.u.uMix.value = S.grind;
    const shake = grinding ? (Math.random() - 0.5) * 0.004 : 0;
    crank.group.position.y = shake;
    contactLight.intensity = grinding ? 2.2 + Math.random() * 1.4 : lerp(contactLight.intensity, 0, 0.2);
    if (grinding && !reduced) {
      const n = Math.round((low ? 5 : 12) * (0.5 + Math.random()));
      sparks.emit(n, contact, {
        x: J.mainL * 0.9, y: 0.02, z: 0.02,
        vel: () => [(Math.random() - 0.5) * 1.1, 1.6 + Math.random() * 2.4, 0.6 + Math.random() * 2.2],
      });
      trails.emit(low ? 8 : 18, contact, J.mainL * 0.85, () => [(Math.random() - 0.5) * 1.4, 1.8 + Math.random() * 3.0, 0.8 + Math.random() * 2.6]);
      coolant.emit(low ? 2 : 4, new THREE.Vector3(hx, 0.34, -0.12), {
        x: 0.05, y: 0.02, z: 0.02,
        vel: () => [(Math.random() - 0.5) * 0.2, -0.4 - Math.random() * 0.3, -0.35 - Math.random() * 0.2],
      });
    }
    sparks.update(dt, -5.5, 1.5);
    trails.update(dt);
    coolant.update(dt, -4, 1.2);

    // B: hon başlığı sıradaki silindirde döner ve iner-çıkar
    block.bores.forEach((b, i) => (b.mat.userData.u.uHone.value = S.hone[i]));
    const active = S.p > 0.5 && S.p < 0.74 && S.hone[S.honeBore] < 1;
    const bb = block.bores[S.honeBore];
    const hTarget = active ? block.top - block.h * 0.5 + Math.sin(t * 5.2) * block.h * 0.28 : block.top + 0.9;
    block.hone.position.x = lerp(block.hone.position.x || bb.x, bb.x, 0.12);
    block.hone.position.y = lerp(block.hone.position.y, hTarget, active ? 0.35 : 0.06);
    spinHone += dt * (active ? 9 : 1.5);
    block.hone.rotation.y = spinHone;

    // C: freze çakısı geçer, arkasında temiz yüzey kalır
    const cx = lerp(-head.L / 2 - head.cutterR - 0.2, head.L / 2 + head.cutterR + 0.2, S.cut);
    head.head.position.x = cx;
    head.head.position.y = head.T / 2 + 0.07 + (1 - S.cutterOn) * 0.6;
    head.top.material.userData.u.uCut.value = S.cut <= 0 ? -10 : cx + head.cutterR * 0.2;
    spinCut += dt * (1 + S.cutterOn * 16);
    head.spinGroup.rotation.y = spinCut;
    if (S.cutterOn > 0.9 && S.cut > 0 && S.cut < 1 && !reduced) {
      chips.emit(low ? 2 : 4, new THREE.Vector3(HX + cx + head.cutterR * 0.9, head.T / 2 + 0.03, 0), {
        x: 0.05, y: 0.02, z: head.Wd * 0.8,
        vel: () => [1.2 + Math.random() * 1.5, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.4],
      });
    }
    chips.update(dt, -7, 1.3);
    head.ruler.visible = S.ruler > 0.01;
    head.ruler.position.y = head.T / 2 + 0.035 + (1 - S.ruler) * 0.8;
    const f = Math.min(1, Math.max(0, (S.ruler - 0.55) / 0.45));
    head.feeler.visible = f > 0;
    head.feeler.position.z = 0.62 - f * 0.34;
    head.feeler.position.x = 0.4 + f * 0.12;

    for (const f of onFrame) f();
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    step(Math.min(clock.getDelta(), 1 / 20));
  }

  resize();
  setProgress(0);
  return {
    setProgress,
    state: S,
    anchors,
    project,
    resize,
    onFrame,
    renderer,
    start() {
      if (running) return;
      running = true;
      clock.getDelta();
      loop();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    render() {
      step(0);
    },
    // Açılışta shader'ları derle ki ilk scroll takılmasın
    warm() {
      renderer.compile(scene, camera);
      step(0);
    },
  };
}
