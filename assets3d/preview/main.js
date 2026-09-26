// lib3d önizleme: her varlığı HDRI içinde döner tablada gösterir; patlatılmış görünüm, kalite, ortam, boya.
// URL: ?asset=car&q=hi&env=workshop&explode=0.5&spin=0&az=35&el=12&dist=1&bg=1&ui=0&variant=fabric
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadAsset, loadEnv, manifest } from '../../shared/lib3d.js';

const P = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);
if (P.get('ui') === '0') document.body.classList.add('noui');

const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = Number(P.get('exp') || 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d0e10');
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.45 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const state = {
  asset: P.get('asset') || 'car',
  q: P.get('q') || 'hi',
  env: P.get('env') || 'workshop',
  bg: P.get('bg') !== '0',
  spin: P.get('spin') !== '0',
  explode: Number(P.get('explode') || 0),
};
let cur = null;
let pivot = new THREE.Group();
scene.add(pivot);
let fitR = 1;
let token = 0;

const PAINTS = ['#b8bcc2', '#15171a', '#f2f2ef', '#8e1b1f', '#1f3f6e', '#56606b', '#c96a1b', '#2f4a3a'];

async function applyEnv() {
  const tex = await loadEnv(state.env, renderer, { quality: state.q });
  scene.environment = tex;
  scene.background = state.bg ? tex : new THREE.Color('#0d0e10');
  scene.backgroundBlurriness = 0.35;
  scene.backgroundIntensity = 0.8;
  $('#bg').classList.toggle('on', state.bg);
}

function frame(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  fitR = Math.max(size.x, size.y, size.z) * 0.5;
  const az = THREE.MathUtils.degToRad(Number(P.get('az') ?? 35));
  const el = THREE.MathUtils.degToRad(Number(P.get('el') ?? 14));
  const vh = THREE.MathUtils.degToRad(camera.fov / 2);
  const hh = Math.atan(Math.tan(vh) * camera.aspect);
  const d = (fitR / Math.tan(Math.min(vh, hh))) * 1.25 * Number(P.get('dist') || 1);
  const target = new THREE.Vector3(0, size.y * 0.45, 0);
  camera.position.set(target.x + d * Math.cos(el) * Math.sin(az), target.y + d * Math.sin(el), target.z + d * Math.cos(el) * Math.cos(az));
  camera.near = d / 100;
  camera.far = d * 20;
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();
  ground.scale.setScalar(fitR * 12);
  sun.position.set(fitR * 1.5, fitR * 5, fitR * 2.2);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -fitR * 2.2;
  sc.right = sc.top = fitR * 2.2;
  sc.near = 0.01;
  sc.far = fitR * 12;
  sc.updateProjectionMatrix();
}

async function applyAsset() {
  const my = ++token;
  window.__ready = false;
  $('#load').textContent = 'yükleniyor…';
  const t0 = performance.now();
  const a = await loadAsset(state.asset, { quality: state.q, renderer, onProgress: (f) => ($('#load').textContent = `yükleniyor ${Math.round(f * 100)}%`) });
  if (my !== token) return a.dispose();
  if (cur) cur.dispose();
  cur = a;
  pivot.rotation.set(0, 0, 0);
  pivot.add(a.scene);
  frame(a.scene);
  a.explode(state.explode);
  const noGround = state.asset === 'garage' || state.asset === 'studio';
  ground.visible = !noGround;
  $('#exwrap').style.display = a.hasExplode ? '' : 'none';
  $('#paintwrap').style.display = a.materials.paint ? '' : 'none';
  const vars = Object.keys(a.materials).filter((n) => n.startsWith('upholstery_'));
  $('#varwrap').style.display = vars.length ? '' : 'none';
  $('#variants').innerHTML = vars.map((v) => `<button data-v="${v}">${v.replace('upholstery_', '')}</button>`).join('');
  if (P.get('variant')) setVariant('upholstery_' + P.get('variant'));
  if (P.get('paint') && a.materials.paint) a.materials.paint.color.set('#' + P.get('paint'));
  let tris = 0;
  a.scene.traverse((o) => o.isMesh && (tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3));
  const f = a.info[state.q] || {};
  $('#stats').textContent = `${state.asset} / ${state.q}\n${((f.bytes || 0) / 1024).toFixed(0)} KB · ${Math.round(tris).toLocaleString()} üçgen\nyükleme ${Math.round(performance.now() - t0)} ms\n${a.info.desc}`;
  const names = [];
  a.scene.traverse((o) => {
    if (o === a.scene) return;
    let d = 0;
    for (let p = o.parent; p && p !== a.scene; p = p.parent) d++;
    if (o.name) names.push('  '.repeat(d) + o.name + (o.userData.explode ? ' ⇢' : ''));
  });
  $('#nodes').textContent = names.join('\n');
  $('#load').textContent = '';
  if (typeof applyLights === 'function') applyLights();
  let n = 0;
  const wait = () => (++n > 12 ? (window.__ready = true) : requestAnimationFrame(wait));
  requestAnimationFrame(wait);
}

function setVariant(name) {
  if (!cur) return;
  const v = name.replace('upholstery_', '');
  cur.setVariant('upholstery', v);
  cur.setVariant('insert', v);
  document.querySelectorAll('#variants button').forEach((b) => b.classList.toggle('on', b.dataset.v === name));
}

// UI
const m = await manifest();
$('#asset').innerHTML = Object.keys(m.assets).map((k) => `<option value="${k}">${k}</option>`).join('');
$('#asset').value = state.asset;
$('#env').innerHTML = Object.keys(m.envs).map((k) => `<option value="${k}">${k} — ${m.envs[k].desc}</option>`).join('');
$('#env').value = state.env;
$('#paint').innerHTML = PAINTS.map((c) => `<button style="background:${c}" data-c="${c}"></button>`).join('');
$('#explode').value = state.explode;
const syncQ = () => document.querySelectorAll('#qrow button').forEach((b) => b.classList.toggle('on', b.dataset.q === state.q));
syncQ();
$('#spin').classList.toggle('on', state.spin);
$('#asset').onchange = (e) => ((state.asset = e.target.value), applyAsset());
$('#env').onchange = (e) => ((state.env = e.target.value), applyEnv());
$('#qrow').onclick = (e) => e.target.dataset.q && ((state.q = e.target.dataset.q), syncQ(), applyAsset(), applyEnv());
$('#bg').onclick = () => ((state.bg = !state.bg), applyEnv());
let lightsOn = P.get('lights') === '1';
const applyLights = () => {
  $('#lights').classList.toggle('on', lightsOn);
  if (!cur) return;
  for (const [n, m] of Object.entries(cur.materials)) {
    if (!n.startsWith('light_') || !m.emissive) continue;
    m.userData.baseEI ??= m.emissiveIntensity;
    m.emissiveIntensity = lightsOn ? Math.max(4, m.userData.baseEI * 6) : m.userData.baseEI;
  }
};
$('#lights').onclick = () => ((lightsOn = !lightsOn), applyLights());
$('#spin').onclick = () => ((state.spin = !state.spin), $('#spin').classList.toggle('on', state.spin));
$('#explode').oninput = (e) => ((state.explode = Number(e.target.value)), cur && cur.explode(state.explode));
$('#paint').onclick = (e) => e.target.dataset.c && cur && cur.materials.paint && cur.materials.paint.color.set(e.target.dataset.c);
$('#variants').onclick = (e) => e.target.dataset.v && setVariant(e.target.dataset.v);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.spin) pivot.rotation.y += dt * 0.35;
  if (cur && state.spin) {
    for (const k of ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR', 'wheel_R1L', 'wheel_R1R', 'spin', 'compressor_wheel', 'turbine_wheel', 'shaft', 'turntable', 'crankshaft', 'pulley', 'clutch_plate']) {
      const o = cur.nodes[k];
      if (!o) continue;
      if (k === 'turntable') o.rotation.y += dt * 0.4;
      else if (k.startsWith('wheel') || k === 'spin') continue; // cur.roll() below
      else o.rotation.x += dt * 6.0;
    }
  }
  if (cur && state.spin) cur.roll(dt * 0.8);
  controls.update();
  renderer.render(scene, camera);
});

await applyEnv();
await applyAsset();
window.__lib3d = { state, get cur() { return cur; }, renderer, scene, camera };
