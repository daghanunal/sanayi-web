// Kapsül sahnesi: kapsüllerden yapılmış ışıklı "E" tabelası → dağılan girdap → blister paketi.
// setState({ film, intro }) ile sürülür; film 0..1 sayfadaki tanıtım bölümünün ilerlemesidir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const RED = new THREE.Color('#d8141f');
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Tuval üzerinde "E" çizip ızgaradan nokta örnekler (tabela ışıkları).
function sampleE(cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, cols, rows);
  g.fillStyle = '#fff';
  const w = cols, h = rows, s = Math.round(cols * 0.26);
  g.fillRect(0, 0, s, h);
  g.fillRect(0, 0, w, s);
  g.fillRect(0, Math.round(h / 2 - s / 2), Math.round(w * 0.82), s);
  g.fillRect(0, h - s, w, s);
  const data = g.getImageData(0, 0, cols, rows).data;
  const pts = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) if (data[(y * cols + x) * 4] > 128) pts.push([x, y]);
  return pts;
}

// Kapsülün yarısı renkli, yarısı beyaz. Işıklı hâlde renkli yarı parlar.
function capsuleMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.0 });
  mat.userData.uniforms = { uGlow: { value: 1 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = mat.userData.uniforms.uGlow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalY = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLocalY;\nuniform float uGlow;')
      .replace(
        '#include <color_fragment>',
        `float side = step(0.0, vLocalY);
        #ifdef USE_COLOR
          diffuseColor.rgb = mix(vec3(0.95, 0.95, 0.93), vColor.rgb, side);
        #endif`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifdef USE_COLOR
          totalEmissiveRadiance += vColor.rgb * uGlow * side * 1.25 + vec3(1.0, 0.92, 0.9) * uGlow * (1.0 - side) * 0.35;
        #endif`
      );
  };
  return mat;
}

function foilTexture(name) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#c9ced4');
  grad.addColorStop(0.5, '#eef0f2');
  grad.addColorStop(1, '#b9bfc6');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  // Folyo üzerindeki tekrar eden küçük E baskısı
  g.globalAlpha = 0.13;
  g.fillStyle = '#d8141f';
  g.font = '700 34px "Atkinson Hyperlegible Next", sans-serif';
  for (let y = 30; y < 512; y += 64) for (let x = (y / 64) % 2 ? 20 : 52; x < 1024; x += 64) g.fillText('E', x, y);
  g.globalAlpha = 1;
  // Kırmızı E rozeti
  g.fillStyle = '#fff';
  g.beginPath();
  g.roundRect(64, 150, 150, 150, 26);
  g.fill();
  g.fillStyle = '#d8141f';
  g.font = '800 120px "Atkinson Hyperlegible Next", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('E', 139, 232);
  g.textAlign = 'left';
  g.fillStyle = '#15202b';
  g.font = '800 64px "Atkinson Hyperlegible Next", sans-serif';
  let size = 64;
  while (g.measureText(name).width > 720 && size > 30) g.font = `800 ${(size -= 2)}px "Atkinson Hyperlegible Next", sans-serif`;
  g.fillText(name, 250, 200);
  g.font = '600 44px "Atkinson Hyperlegible Next", sans-serif';
  g.fillStyle = '#1f7a4d';
  g.fillText('Reçeteniz hazır', 250, 272);
  g.font = '500 30px "Atkinson Hyperlegible Mono", monospace';
  g.fillStyle = '#4a5560';
  g.fillText(new Date().toLocaleDateString('tr-TR'), 250, 330);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,90,90,0.9)');
  r.addColorStop(0.35, 'rgba(216,20,31,0.35)');
  r.addColorStop(1, 'rgba(216,20,31,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createPills(canvas, { name, lowEnd, still = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, alpha: true, powerPreference: 'high-performance' });
  const dprCap = lowEnd ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 11);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 6);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

  // --- Tabela (ışıklı beyaz kutu) ----------------------------------------
  const sign = new THREE.Group();
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.55 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(3.3, 4.1, 0.34), plateMat);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, metalness: 1, roughness: 0.3 });
  const rim = new THREE.Mesh(new THREE.BoxGeometry(3.42, 4.22, 0.28), rimMat);
  rim.position.z = -0.04;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(9, 9, 1);
  glow.position.z = -0.4;
  sign.add(glow, rim, plate);
  scene.add(sign);

  // --- Kapsüller ----------------------------------------------------------
  const ePts = sampleE(9, 12);
  const extra = lowEnd ? 26 : 46;
  const N = ePts.length + extra;
  const capGeo = new THREE.CapsuleGeometry(0.105, 0.2, 4, lowEnd ? 10 : 14);
  const capMat = capsuleMaterial();
  const caps = new THREE.InstancedMesh(capGeo, capMat, N);
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const palette = [RED, new THREE.Color('#1f7a4d'), new THREE.Color('#2f5f9e'), new THREE.Color('#e3a21a'), RED];
  const rnd = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();

  const cells = ePts.map(([x, y]) => new THREE.Vector3((x - 4) * 0.33, (5.5 - y) * 0.33, 0.26));
  const inst = [];
  for (let i = 0; i < N; i++) {
    const inE = i < cells.length;
    const a = rnd() * Math.PI * 2;
    const r = 3.2 + rnd() * 3.5;
    inst.push({
      inE,
      e: inE ? cells[i] : new THREE.Vector3(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.62, -2.5 - rnd() * 4),
      scatter: new THREE.Vector3((rnd() - 0.5) * 16, (rnd() - 0.5) * 11, -2 - rnd() * 6),
      orbitR: 2 + rnd() * 3.6,
      orbitA: rnd() * Math.PI * 2,
      orbitY: (rnd() - 0.5) * 4.5,
      orbitZ: (rnd() - 0.5) * 3,
      spin: new THREE.Vector3(rnd() * 2, rnd() * 2, rnd() * 2),
      delay: rnd(),
      tilt: (rnd() - 0.5) * 0.35,
      color: inE ? RED : palette[Math.floor(rnd() * palette.length)],
    });
    caps.setColorAt(i, inst[i].color);
  }
  caps.instanceColor.needsUpdate = true;
  scene.add(caps);

  // --- Blister paketi ------------------------------------------------------
  const blister = new THREE.Group();
  const cardMat = new THREE.MeshStandardMaterial({ color: 0x8f98a2, metalness: 0.9, roughness: 0.26, envMap: envTex, envMapIntensity: 0.09 });
  const card = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.9, 0.035), cardMat);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.9), new THREE.MeshBasicMaterial({ map: foilTexture(name), toneMapped: false }));
  back.rotation.y = Math.PI;
  back.position.z = -0.02;
  const bubbleGeo = new THREE.CapsuleGeometry(0.15, 0.24, 4, 14);
  const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false });
  const slots = [];
  const bubbles = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 5; c++) {
      const p = new THREE.Vector3((c - 2) * 0.68, r ? -0.42 : 0.42, 0.1);
      slots.push(p);
      const b = new THREE.Mesh(bubbleGeo, bubbleMat);
      b.rotation.z = Math.PI / 2;
      b.position.copy(p);
      b.scale.set(1, 1, 0.62);
      bubbles.push(b);
      blister.add(b);
    }
  blister.add(card, back);
  scene.add(blister);

  // Blistere giren kapsüller: tabeladaki ilk 10 kapsül
  const slotOf = new Map();
  for (let i = 0; i < 10; i++) slotOf.set(Math.floor((i * cells.length) / 10), i);

  // --- Yerleşim --------------------------------------------------------------
  let W = 1, H = 1, desk = true;
  function resize() {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    desk = W >= 900;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Masaüstünde sahne sağda (yazı solda), telefonda üstte (yazı altta)
    if (desk) camera.setViewOffset(W, H, -W * 0.17, 0, W, H);
    else camera.setViewOffset(W, H, 0, H * 0.22, W, H);
    camera.updateProjectionMatrix();
  }
  resize();

  const state = { film: 0, intro: 1 };
  const dummy = new THREE.Object3D();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let time = 0;

  function update(dt) {
    time += dt;
    const f = state.film;
    const intro = smooth(0, 1, state.intro);
    const breakT = smooth(0.14, 0.3, f); // tabela dağılır
    const toBlister = smooth(0.52, 0.72, f); // kapsüller blistere
    const flip = smooth(0.76, 0.88, f); // blister döner
    const exit = smooth(0.93, 1, f);
    // Telefonda tabela ekranın üst üçte birine, blister genişliğe sığar
    const fit = desk ? 1 : 0.52;
    const bFit = desk ? 0.76 : Math.min(0.66, (W / H) * 1.35);
    const oFit = desk ? 1 : 0.62;

    // Tabela: girişte yanar, dağılırken söner ve geri çekilir
    sign.visible = breakT < 0.999;
    const signOn = intro * (1 - breakT);
    plateMat.emissiveIntensity = 0.12 + 0.5 * signOn;
    glow.material.opacity = signOn;
    capMat.userData.uniforms.uGlow.value = 0.2 + 0.8 * signOn;
    sign.position.set(0, lerp(0, 1.5, breakT), lerp(0, -6, breakT));
    sign.rotation.set(Math.sin(time * 0.5) * 0.03, lerp(-0.18, 0.5, breakT) + Math.sin(time * 0.35) * 0.06, 0);
    sign.scale.setScalar(fit);

    // Blister
    blister.visible = toBlister > 0.001;
    const bs = bFit * lerp(0.6, 1, toBlister) * (1 - exit * 0.5);
    blister.scale.setScalar(bs);
    blister.position.set(0, lerp(-3, 0, toBlister) + exit * 3.5, lerp(-2, 0.4, toBlister));
    blister.rotation.set(lerp(-0.55, -0.12, toBlister) + flip * 0.1, lerp(0.35, 0, toBlister) + flip * Math.PI, 0);
    bubbles.forEach((b, i) => {
      const s = smooth(0.52 + i * 0.012, 0.6 + i * 0.012, f);
      b.scale.set(s, s, 0.62 * s);
    });
    blister.updateMatrixWorld();

    for (let i = 0; i < N; i++) {
      const it = inst[i];
      // 1) giriş: dağınıktan tabelaya
      const ki = smooth(it.delay * 0.45, it.delay * 0.45 + 0.55, intro);
      tmp.lerpVectors(it.scatter, it.e, ki);
      if (it.inE) {
        tmp.multiplyScalar(fit);
        tmp.applyEuler(sign.rotation).add(sign.position);
      } else tmp.multiplyScalar(oFit);
      // 2) dağılma: girdap
      const kb = smooth(it.delay * 0.3, it.delay * 0.3 + 0.7, breakT);
      const a = it.orbitA + time * (0.12 + it.delay * 0.1) + f * 5;
      tmp2.set(Math.cos(a) * it.orbitR, it.orbitY + Math.sin(time * 0.6 + i) * 0.15, Math.sin(a) * it.orbitR * 0.6 + it.orbitZ);
      tmp2.multiplyScalar(oFit);
      tmp.lerp(tmp2, kb);
      // 3) blistere giren 10 kapsül, geri kalanı uzaklaşır
      let scale = 1;
      const slot = slotOf.get(i);
      if (slot !== undefined) {
        const ks = smooth(0.52 + slot * 0.014, 0.64 + slot * 0.014, f);
        const target = slots[slot].clone().applyMatrix4(blister.matrixWorld);
        tmp.lerp(target, ks);
        if (ks > 0.99) tmp.copy(target);
        scale = lerp(1, bs * 0.92, ks);
        dummy.position.copy(tmp);
        if (ks > 0.5) {
          dummy.quaternion.copy(blister.quaternion);
          dummy.rotateZ(Math.PI / 2);
        } else {
          const sk = kb * (1 - ks);
          dummy.rotation.set(time * it.spin.x * sk, time * it.spin.y * sk, Math.PI / 2 + it.tilt * (1 - kb) * 0.2);
        }
      } else {
        const away = toBlister;
        tmp.z -= away * 8;
        tmp.y += away * (it.orbitY > 0 ? 3 : -3);
        scale = 1 - smooth(0.6, 0.78, f);
        dummy.position.copy(tmp);
        const spinK = kb;
        dummy.rotation.set(time * it.spin.x * spinK, time * it.spin.y * spinK, Math.PI / 2 + it.tilt * (1 - spinK) + time * it.spin.z * spinK);
      }
      if (!it.inE && ki < 1) scale *= 0.6 + 0.4 * ki;
      if (still && !it.inE) scale = 0; // hareketsiz modda yalnızca tabela
      if (it.inE) scale *= fit * lerp(0.82, 1, kb);
      if (it.inE && kb < 0.01 && (slot === undefined || f < 0.5)) dummy.rotation.set(sign.rotation.x, sign.rotation.y, Math.PI / 4 + it.tilt * 0.15);
      scale *= 1 - exit;
      dummy.scale.setScalar(Math.max(0.0001, scale));
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
  }

  let running = false;
  let last = performance.now();
  let slowFrames = 0;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // Kareler yavaşsa çözünürlüğü düşür
    if (dt > 0.034) {
      if (++slowFrames > 40 && renderer.getPixelRatio() > 1) {
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25));
        resize();
        slowFrames = 0;
      }
    } else slowFrames = Math.max(0, slowFrames - 1);
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  return {
    setState(s) {
      Object.assign(state, s);
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    },
    stop() {
      running = false;
    },
    renderOnce() {
      update(0);
      renderer.render(scene, camera);
    },
    resize,
    compile() {
      renderer.compile(scene, camera);
    },
  };
}
