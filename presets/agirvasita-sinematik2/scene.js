// Gece seferi: otoyolda giden kodla çizilmiş çekici + dorse, sodyum lambalar, yeşil otoyol
// tabelaları (portal). Sayfa kaydıkça yol akar; her bölümün portalı aracın üstünden geçer.
// Sonda araç emniyet şeridine çeker, dörtlüler yanar, yol yardım aracı tepe lambasıyla gelir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const LANE = 3.6;
const WHEEL_R = 0.52;
const POST_GAP = 36; // lamba direkleri arası
const SEG = 16; // yol dokusunun tekrar boyu
const ROAD_LEN = 420;
const GREEN = '#0b7a4b';
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
    g.font = '800 40px Overpass, sans-serif';
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
  g.font = `900 ${size}px Overpass, sans-serif`;
  while (g.measureText(main).width > w - 120 && size > 60) {
    size -= 6;
    g.font = `900 ${size}px Overpass, sans-serif`;
  }
  g.fillText(main, 52, tab ? 150 + size * 0.72 : h * 0.5 + size * 0.3);
  if (sub) {
    g.font = '600 46px Overpass, sans-serif';
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
  g.fillStyle = '#e9ebe6';
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 48) {
    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(x, 0, 3, h);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(x + 3, 0, 2, h);
  }
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, 'rgba(255,255,255,0.15)');
  grd.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // yeşil kuşak
  g.fillStyle = '#0b7a4b';
  g.fillRect(0, h * 0.72, w, h * 0.12);
  g.fillStyle = '#ffc42e';
  g.fillRect(0, h * 0.84, w, h * 0.025);
  if (name) {
    let size = 190;
    g.font = `900 ${size}px Overpass, sans-serif`;
    while (g.measureText(name).width > w * 0.8 && size > 60) { size -= 8; g.font = `900 ${size}px Overpass, sans-serif`; }
    g.fillStyle = '#0b7a4b';
    g.fillText(name, w * 0.06, h * 0.5);
    g.font = '700 64px Overpass, sans-serif';
    g.fillStyle = '#1b2a2e';
    g.fillText(`AĞIR VASITA SERVİSİ · YOL YARDIM ${tel}`, w * 0.06 + 6, h * 0.64);
  }
}

function makeTruck({ cab = 0x1f5e57, trailer = 0xe9ebe6, lite = false, tape = 0xffb423, sideTex = null } = {}) {
  const root = new THREE.Group();
  const cabM = makeMat(cab, { metalness: 0.55, roughness: 0.32 });
  const darkM = makeMat(0x121416, { roughness: 0.8 });
  const chromeM = makeMat(0xc9cdd0, { metalness: 1, roughness: 0.22 });
  const glassM = makeMat(0x0b1418, { metalness: 0.9, roughness: 0.08 });
  const trailerM = makeMat(trailer, { roughness: 0.62 });
  const tireM = makeMat(0x0d0e0f, { roughness: 0.95 });
  const hubM = makeMat(0x9aa0a4, { metalness: 0.8, roughness: 0.35 });
  const headM = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
  const tailM = new THREE.MeshBasicMaterial({ color: 0xff2a1f });
  const markerM = new THREE.MeshBasicMaterial({ color: 0xffa21a });
  const tapeM = new THREE.MeshBasicMaterial({ color: tape });
  const tapeRedM = new THREE.MeshBasicMaterial({ color: 0xd8261c });
  const hazardM = new THREE.MeshBasicMaterial({ color: 0x4a2a05 });
  const box = (w, h, d, m, x, y, z, parent = root) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // Kabin
  const cabG = new THREE.Group();
  root.add(cabG);
  box(2.5, 2.75, 2.3, cabM, 0, 2.45, -7.35, cabG);
  // kabin üstü rüzgarlık (eğik)
  const spoiler = box(2.44, 0.7, 1.8, cabM, 0, 4.05, -6.9, cabG);
  spoiler.rotation.x = -0.18;
  const wsTex = canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w * 0.3, h);
    gr.addColorStop(0, '#2c4b54'); gr.addColorStop(0.45, '#0c171b'); gr.addColorStop(1, '#16262b');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,190,110,0.35)'; g.fillRect(20, h - 22, w - 40, 6); // gösterge ışığı
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(w * 0.55, 0); g.lineTo(w * 0.75, 0); g.lineTo(w * 0.45, h); g.lineTo(w * 0.25, h); g.fill();
  });
  box(2.36, 1.02, 0.06, new THREE.MeshStandardMaterial({ map: wsTex, metalness: 0.5, roughness: 0.15 }), 0, 3.1, -8.52, cabG);
  box(2.5, 0.22, 0.4, cabM, 0, 3.72, -8.58, cabG); // güneşlik
  box(0.06, 1.1, 0.06, darkM, 0, 3.1, -8.56, cabG);
  // ızgara
  const grilleT = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#0d0f10'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#6c7377';
    for (let y = 8; y < h; y += 16) g.fillRect(6, y, w - 12, 5);
  });
  box(1.7, 1.05, 0.08, new THREE.MeshStandardMaterial({ map: grilleT, metalness: 0.6, roughness: 0.4 }), 0, 1.95, -8.52, cabG);
  box(2.56, 0.46, 0.4, darkM, 0, 0.98, -8.45, cabG); // tampon
  box(0.5, 0.2, 0.06, headM, -0.95, 1.36, -8.66, cabG);
  box(0.5, 0.2, 0.06, headM, 0.95, 1.36, -8.66, cabG);
  // tavan LED bar
  for (let i = 0; i < 6; i++) box(0.18, 0.1, 0.1, headM, -0.8 + i * 0.32, 4.28, -7.72, cabG);
  // aynalar
  for (const s of [-1, 1]) {
    box(0.08, 0.08, 0.5, chromeM, s * 1.38, 3.1, -8.2, cabG);
    box(0.12, 0.62, 0.26, darkM, s * 1.48, 2.95, -8.4, cabG);
  }
  // sinyal/dörtlü lambalar (köşeler)
  const hazards = [];
  for (const s of [-1, 1]) hazards.push(box(0.14, 0.14, 0.14, hazardM, s * 1.24, 1.36, -8.56, cabG));
  // yakıt depoları
  for (const s of [-1, 1]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, lite ? 12 : 20), chromeM);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(s * 1.05, 0.95, -5.1);
    root.add(tank);
  }
  // şasi
  box(0.95, 0.3, 8.4, darkM, 0, 0.9, -4.4);
  box(2.1, 0.12, 1.2, darkM, 0, 1.12, -2.6); // beşinci teker

  // Dorse
  const rearTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#dcdfd9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9aa0a0'; g.fillRect(w / 2 - 2, 0, 4, h);
    for (const x of [0.22, 0.4, 0.6, 0.78]) { g.fillStyle = '#7d8486'; g.fillRect(w * x - 3, 0, 6, h); g.fillStyle = '#5a6163'; g.fillRect(w * x - 8, h * 0.55, 16, 10); }
    g.fillStyle = '#b9bdb8'; for (const y of [0.12, 0.5, 0.88]) g.fillRect(0, h * y, w, 5);
  });
  const sideM = sideTex ? new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.6 }) : trailerM;
  const trailerBox = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.85, 13.4), [
    sideM, sideM, trailerM, trailerM, new THREE.MeshStandardMaterial({ map: rearTex, roughness: 0.6 }), trailerM,
  ]);
  trailerBox.position.set(0, 2.78, 2.1);
  root.add(trailerBox);
  box(2.4, 0.26, 13.2, darkM, 0, 1.22, 2.1);
  // kontur bantları (reflektif)
  for (const s of [-1, 1]) {
    box(0.02, 0.08, 13.3, tapeM, s * 1.285, 1.46, 2.1);
    box(0.02, 0.08, 13.3, tapeM, s * 1.285, 4.12, 2.1);
    box(0.02, 2.66, 0.08, tapeM, s * 1.285, 2.78, -4.52);
    box(0.02, 2.66, 0.08, tapeM, s * 1.285, 2.78, 8.72);
    for (let z = -3.6; z < 8.6; z += 2.2) box(0.04, 0.09, 0.14, markerM, s * 1.29, 1.2, z);
  }
  // arka: kırmızı bant, stop lambaları
  box(2.5, 0.08, 0.02, tapeRedM, 0, 4.12, 8.81);
  box(2.5, 0.08, 0.02, tapeRedM, 0, 1.5, 8.81);
  box(0.06, 2.5, 0.02, tapeRedM, -1.22, 2.78, 8.81);
  box(0.06, 2.5, 0.02, tapeRedM, 1.22, 2.78, 8.81);
  for (const s of [-1, 1]) {
    box(0.42, 0.18, 0.06, tailM, s * 0.9, 1.05, 8.82);
    hazards.push(box(0.16, 0.16, 0.06, hazardM, s * 0.46, 1.05, 8.82));
    hazards.push(box(0.04, 0.12, 0.3, hazardM, s * 1.29, 1.2, -3.8));
  }
  box(2.5, 0.12, 0.2, darkM, 0, 0.8, 8.7); // alt bariyer

  // Tekerlekler
  const wheelG = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.34, lite ? 14 : 22);
  wheelG.rotateZ(Math.PI / 2);
  const hubG = new THREE.CylinderGeometry(0.26, 0.26, 0.36, 10);
  hubG.rotateZ(Math.PI / 2);
  const wheels = [];
  const axles = [
    [-7.1, false], [-3.4, true], [-2.05, true], [4.3, true], [5.65, true], [7.0, true],
  ];
  for (const [z, dual] of axles) {
    for (const s of [-1, 1]) {
      const offs = dual ? [0.92, 1.18] : [1.08];
      for (const o of offs) {
        const w = new THREE.Mesh(wheelG, tireM);
        w.position.set(s * o, WHEEL_R, z);
        root.add(w);
        wheels.push(w);
        if (o === offs.at(-1)) {
          const hb = new THREE.Mesh(hubG, hubM);
          hb.position.set(s * (o + 0.01), WHEEL_R, z);
          root.add(hb);
          wheels.push(hb);
        }
      }
    }
  }
  return { root, wheels, hazards, hazardM, cabG };
}

// Yol yardım aracı (kamyonet) + turuncu tepe lambası
function drawVanSide(g, w, h, { tel = '' }) {
  g.fillStyle = '#eef0ea';
  g.fillRect(0, 0, w, h);
  // kabin camı (ön tarafta, dokunun solu = aracın önü)
  g.fillStyle = '#0b1418';
  g.beginPath();
  g.roundRect(24, 40, w * 0.2, h * 0.34, 14);
  g.fill();
  // yan cam şeridi
  g.fillRect(w * 0.27, 40, w * 0.68, h * 0.2);
  // yeşil bant + turuncu ince çizgi
  g.fillStyle = GREEN;
  g.fillRect(0, h * 0.5, w, h * 0.2);
  g.fillStyle = '#ff9a1f';
  g.fillRect(0, h * 0.72, w, h * 0.035);
  g.fillStyle = '#f2f4ee';
  g.textBaseline = 'middle';
  g.font = '900 84px Overpass, sans-serif';
  g.fillText('YOL YARDIM 7/24', w * 0.06, h * 0.605);
  g.fillStyle = '#10181a';
  g.font = '800 54px Overpass, sans-serif';
  g.fillText(tel, w * 0.06, h * 0.86);
}
function drawVanRear(g, w, h) {
  g.fillStyle = '#eef0ea';
  g.fillRect(0, 0, w, h);
  // arka kapı camları
  g.fillStyle = '#0b1418';
  g.fillRect(w * 0.08, h * 0.08, w * 0.39, h * 0.28);
  g.fillRect(w * 0.53, h * 0.08, w * 0.39, h * 0.28);
  // kırmızı-sarı reflektif şevron
  g.save();
  g.beginPath();
  g.rect(0, h * 0.5, w, h * 0.5);
  g.clip();
  g.fillStyle = '#ffc42e';
  g.fillRect(0, h * 0.5, w, h * 0.5);
  g.fillStyle = '#d8261c';
  for (let x = -h; x < w + h; x += 90) {
    g.beginPath();
    g.moveTo(x, h); g.lineTo(x + 45, h); g.lineTo(x + 45 + h * 0.5, h * 0.5); g.lineTo(x + h * 0.5, h * 0.5);
    g.fill();
  }
  g.restore();
  // kapı arası çizgi
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(w * 0.497, 0, 4, h);
  g.fillStyle = '#10181a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 64px Overpass, sans-serif';
  g.fillText('YOL YARDIM', w / 2, h * 0.43);
  g.textAlign = 'left';
}
function makeVan(tel = '') {
  const g = new THREE.Group();
  const white = makeMat(0xeef0ea, { roughness: 0.4, metalness: 0.2 });
  const dark = makeMat(0x111315, { roughness: 0.8 });
  const glass = makeMat(0x0b1418, { metalness: 0.9, roughness: 0.1 });
  const add = (w, h, d, m, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  add(2.0, 1.9, 4.2, white, 0, 1.55, 0.4);
  add(2.0, 1.2, 1.4, white, 0, 1.2, -2.3);
  add(1.9, 0.62, 0.05, glass, 0, 2.0, -1.62).rotation.x = -0.5;
  add(2.1, 0.3, 0.3, dark, 0, 0.62, -3.0);
  add(2.1, 0.28, 0.26, dark, 0, 0.62, 2.6);
  // yan ve arka giydirme
  const sideTex = canvasTex(1024, 512, (c, w, h) => drawVanSide(c, w, h, { tel }));
  const rearTex = canvasTex(512, 512, (c, w, h) => drawVanRear(c, w, h));
  const sideM = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.45, metalness: 0.1 });
  const rearM = new THREE.MeshStandardMaterial({ map: rearTex, roughness: 0.45, metalness: 0.1 });
  // yalnız sol yüz (kameraya bakan taraf)
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.9), sideM);
  side.position.set(-1.012, 1.55, 0.4);
  side.rotation.y = -Math.PI / 2;
  g.add(side);
  add(0.02, 0.3, 1.38, new THREE.MeshBasicMaterial({ color: 0x0b7a4b }), -1.005, 1.2, -2.3);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.9), rearM);
  rear.position.set(0, 1.55, 2.512);
  g.add(rear);
  const head = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
  add(0.36, 0.16, 0.05, head, -0.66, 1.1, -3.02);
  add(0.36, 0.16, 0.05, head, 0.66, 1.1, -3.02);
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2a18 });
  add(0.14, 0.42, 0.04, tail, -0.9, 1.05, 2.53);
  add(0.14, 0.42, 0.04, tail, 0.9, 1.05, 2.53);
  const beaconM = new THREE.MeshBasicMaterial({ color: 0xffa21a });
  add(1.3, 0.08, 0.36, dark, 0, 2.52, -0.6);
  const beacon = add(1.1, 0.16, 0.3, beaconM, 0, 2.62, -0.6);
  const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 14);
  wg.rotateZ(Math.PI / 2);
  const tm = makeMat(0x0d0e0f, { roughness: 0.95 });
  for (const z of [-1.9, 1.8]) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wg, tm);
    w.position.set(s * 0.92, 0.38, z);
    g.add(w);
  }
  const redraw = () => {
    drawVanSide(sideTex.image.getContext('2d'), 1024, 512, { tel }); sideTex.needsUpdate = true;
    drawVanRear(rearTex.image.getContext('2d'), 512, 512); rearTex.needsUpdate = true;
  };
  return { root: g, beacon, beaconM, redraw };
}

export function createScene(canvas, { lite = false, signs = [], finalSign = null, name = '', tel = '' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const dpr = Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  const FOG = new THREE.Color(0x0f2127);
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
          vec3 top = vec3(0.020,0.045,0.070);
          vec3 mid = vec3(0.060,0.130,0.150);
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
    mk(380, 46, 0x0b1a1f, 1.3);
    mk(300, 26, 0x071114, 4.1);
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
  const groundM = new THREE.MeshStandardMaterial({ color: 0x0c1714, roughness: 1 });
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

  // Tır
  const sideTex = canvasTex(2048, 512, (c, w, h) => drawTrailerSide(c, w, h, { name, tel }));
  const truck = makeTruck({ lite, sideTex });
  scene.add(truck.root);
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
    new THREE.MeshBasicMaterial({ map: beamTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 })
  );
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(0, 0.03, -19);
  truck.root.add(beam);
  const coneM = new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 16, 16, 1, true), coneM);
    cone.rotation.x = Math.PI / 2 - 0.05;
    cone.position.set(s * 0.95, 1.1, -16.6);
    truck.root.add(cone);
  }
  // far parlaması
  const flareM = new THREE.SpriteMaterial({ map: carGlow, color: 0xfff3dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 });
  for (const s of [-0.95, 0.95]) {
    const f = new THREE.Sprite(flareM);
    f.scale.set(1.8, 1.8, 1);
    f.position.set(s, 1.36, -8.75);
    truck.root.add(f);
  }
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Sprite(flareM);
    f.scale.set(0.7, 0.7, 1);
    f.position.set(-0.8 + i * 0.32, 4.28, -7.85);
    truck.root.add(f);
  }
  const headLight = new THREE.PointLight(0xfff0d8, 30, 24, 1.4);
  headLight.position.set(0, 2, -12);
  truck.root.add(headLight);

  // Konvoy (filo bölümü için)
  const convoy = [];
  const cc = lite ? [[0x9c2f22, -3.6, -26]] : [[0x9c2f22, -3.6, -26], [0x273746, 0, 30]];
  for (const [col, x, z] of cc) {
    const t = makeTruck({ cab: col, trailer: 0xd7d9d4, lite: true });
    t.root.position.set(x, 0, z);
    t.root.visible = false;
    scene.add(t.root);
    convoy.push(t);
  }

  // Yol yardım aracı
  const van = makeVan(tel);
  van.root.position.set(3.3, 0, 60);
  van.root.visible = false;
  scene.add(van.root);
  const beaconLight = new THREE.PointLight(0xffa21a, 0, 16, 1.5);
  beaconLight.position.set(0, 3.2, -0.6);
  van.root.add(beaconLight);

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
    for (const w of truck.wheels) w.rotation.x -= dTravel / WHEEL_R;

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
    truck.hazardM.color.setHex(blink ? 0xffa21a : 0x4a2a05);
    van.root.visible = f > 0.3;
    if (van.root.visible) {
      const vz = 70 - smoothstep01(Math.min(1, (f - 0.3) / 0.6)) * 52;
      van.root.position.set(3.4, 0, vz);
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 9);
      van.beaconM.color.setRGB(1, 0.45 + pulse * 0.25, 0.05 + pulse * 0.1);
      beaconLight.intensity = 10 + pulse * 30;
    }
    for (const c of convoy) c.root.visible = s.convoy > 0.01;
    if (s.convoy > 0.01) {
      convoy[0].root.position.z = -26 - (1 - s.convoy) * 40;
      if (convoy[1]) convoy[1].root.position.z = 32 + (1 - s.convoy) * 40;
      for (const c of convoy) for (const w of c.wheels) w.rotation.x -= dTravel / WHEEL_R;
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

  return { update, render, resize, redrawSigns, snap, camera, renderer, setCam: (c) => { camPos.set(c[0], c[1], c[2]); camLook.set(c[3], c[4], c[5]); } };
}
