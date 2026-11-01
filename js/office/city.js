// Khu phố quanh văn phòng: đường, vỉa hè, vạch qua đường, đèn giao thông, nhà ống, cao ốc, cây, đèn đường,
// ô tô / xe buýt / xe máy chạy theo làn và dừng đèn đỏ, người đi bộ trên vỉa hè.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { W, D } from './layout.js';

const ROAD = 8, WALK = 2.5;
const H_ROADS = [-7, D + 7];           // tâm các đường ngang (z)
const V_ROADS = [-7, W + 7];           // tâm các đường dọc (x)
const X_MIN = -64, X_MAX = W + 68, Z_MIN = -58, Z_MAX = D + 64;
export const CITY_BOUNDS = { x1: X_MIN, x2: X_MAX, z1: Z_MIN, z2: Z_MAX };

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261031);
const rr = (a, b) => a + R() * (b - a);
const rpick = (a) => a[Math.floor(R() * a.length)];

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...o });
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const BOX = new THREE.BoxGeometry(1, 1, 1);

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Mặt tiền: khung cửa sổ tối trên nền sáng (map) + cửa sổ sáng đèn ngẫu nhiên (emissiveMap)
function facadeTextures(seed) {
  const r = rng(seed);
  const map = canvasTex(256, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#3b3f4c';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 64 + 14, y * 64 + 12, 36, 40);
  });
  const glow = canvasTex(256, 256, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      if (r() < 0.42) continue;
      g.fillStyle = rpickR(r, ['#ffd58a', '#ffe7b8', '#fff2d6', '#9fdcff', '#ffc27a', '#ffb0dd']);
      g.fillRect(x * 64 + 14, y * 64 + 12, 36, 40);
    }
  });
  for (const t of [map, glow]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return { map, glow };
}
function rpickR(r, a) { return a[Math.floor(r() * a.length)]; }

const SIGNS = [
  ['CÀ PHÊ', '#ffb86b'], ['PHỞ BÒ', '#ff6b6b'], ['BÁNH MÌ', '#ffd36b'], ['TẠP HOÁ', '#6bffc8'], ['NHÀ THUỐC', '#6bdcff'],
  ['TRÀ SỮA', '#ff7ac8'], ['SPA', '#c3a6ff'], ['IN ẤN', '#7fd3ff'], ['CƠM TẤM', '#ff9a5a'], ['SỬA XE', '#a0ff7a'],
];
const signTextures = SIGNS.map(([text, color]) => canvasTex(256, 64, (g, w, h) => {
  g.fillStyle = '#0d0f17'; g.fillRect(0, 0, w, h);
  g.strokeStyle = color; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = color; g.font = '700 34px "Be Vietnam Pro", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
}));

const glowTex = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,214,150,0.9)'); gr.addColorStop(0.4, 'rgba(255,190,120,0.35)'); gr.addColorStop(1, 'rgba(255,170,100,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

const FACADES = ['#e8d8b0', '#d9a07a', '#9fc3c9', '#e5b8c4', '#c9d6a3', '#f0e2c8', '#a9b8d8', '#d8c3a5', '#b9d4c1', '#e6c79c'];
const TOWERS = ['#3a4256', '#2e3648', '#45506a', '#2a3142', '#4a4458'];
const CAR_COLORS = ['#e8edf5', '#1b1e27', '#c0392b', '#2f6fd1', '#7f8c9a', '#f5f1e6', '#2c3e50', '#8e2e4f', '#2fa38a'];

// ───────────────────────── khối nhà ─────────────────────────
function addBuilding(scene, { x, z, w, d, h, color, front, kind }, facades) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  // xoay để mặt tiền (local +z) hướng ra đường
  g.rotation.y = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[front];
  const f = rpick(facades);
  const map = f.map.clone(), glow = f.glow.clone();
  const fw = front === 'e' || front === 'w' ? d : w; // bề ngang mặt tiền
  const fd = front === 'e' || front === 'w' ? w : d;
  map.repeat.set(Math.max(1, fw / 8.8), Math.max(1, h / 12)); glow.repeat.copy(map.repeat);
  map.needsUpdate = glow.needsUpdate = true;
  const body = new THREE.Mesh(BOX, std(color, { map, emissiveMap: glow, emissive: '#ffffff', emissiveIntensity: kind === 'tower' ? 0.9 : 0.75 }));
  body.scale.set(fw, h, fd); body.position.y = h / 2; body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(BOX, std(kind === 'tower' ? '#1c2130' : '#4a3a33'));
  roof.scale.set(fw + 0.3, 0.35, fd + 0.3); roof.position.y = h + 0.17; g.add(roof);
  if (kind === 'house') {
    // tầng trệt cửa hàng: mái hiên + biển hiệu sáng
    const awn = new THREE.Mesh(BOX, std(rpick(['#c0392b', '#2f6fd1', '#2fa38a', '#e67e22', '#8e44ad', '#d35400'])));
    awn.scale.set(fw - 0.4, 0.12, 1.4); awn.position.set(0, 3.1, fd / 2 + 0.7); awn.rotation.x = 0.18; g.add(awn);
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(fw - 1, 2.4), basic(rpick(['#ffe2a8', '#fff3d9', '#d9f2ff', '#ffd9ec'])));
    shop.position.set(0, 1.35, fd / 2 + 0.02); g.add(shop);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(fw - 0.6, 4.4), 1.1), basic('#ffffff', { map: rpick(signTextures) }));
    sign.position.set(0, 3.9, fd / 2 + 0.05); g.add(sign);
    // ban công các tầng
    for (let y = 6.6; y < h - 1; y += 3) {
      const bal = new THREE.Mesh(BOX, std('#2a2d36'));
      bal.scale.set(fw - 0.8, 0.9, 0.08); bal.position.set(0, y, fd / 2 + 0.6); g.add(bal);
      const slab = new THREE.Mesh(BOX, std('#cfc8bb'));
      slab.scale.set(fw - 0.8, 0.12, 0.65); slab.position.set(0, y - 0.45, fd / 2 + 0.3); g.add(slab);
    }
  } else {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), std('#888'));
    ant.position.set(fw / 4, h + 2, 0); g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), basic('#ff3b5c'));
    tip.position.set(fw / 4, h + 4.1, 0); g.add(tip);
    tip.userData.blink = true;
  }
  scene.add(g);
  return g;
}

function fillBlocks(scene) {
  const facades = [1, 2, 3, 4].map((s) => facadeTextures(s * 977));
  const xs = [[X_MIN, V_ROADS[0] - ROAD / 2], [V_ROADS[0] + ROAD / 2, V_ROADS[1] - ROAD / 2], [V_ROADS[1] + ROAD / 2, X_MAX]];
  const zs = [[Z_MIN, H_ROADS[0] - ROAD / 2], [H_ROADS[0] + ROAD / 2, H_ROADS[1] - ROAD / 2], [H_ROADS[1] + ROAD / 2, Z_MAX]];
  const blinkers = [];
  const parks = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) continue; // khu văn phòng
    const x1 = xs[i][0] + (i > 0 ? WALK : 0), x2 = xs[i][1] - (i < 2 ? WALK : 0);
    const z1 = zs[j][0] + (j > 0 ? WALK : 0), z2 = zs[j][1] - (j < 2 ? WALK : 0);
    const sides = { n: j > 0, s: j < 2, w: i > 0, e: i < 2 };
    const depth = 12;
    // dãy nhà ống dọc theo cạnh giáp đường
    const row = (from, to, place) => {
      let p = from;
      while (p < to - 3.5) {
        const w = Math.min(rr(4, 6.5), to - p);
        if (w < 3.5) break;
        if (R() < 0.08) { p += w; continue; } // khoảng trống / hẻm
        place(p + w / 2, w - 0.15, rr(7, 16));
        p += w;
      }
    };
    if (sides.s) row(x1, x2, (c, w, h) => addBuilding(scene, { x: c, z: z2 - depth / 2, w, d: depth, h, color: rpick(FACADES), front: 's', kind: 'house' }, facades));
    if (sides.n) row(x1, x2, (c, w, h) => addBuilding(scene, { x: c, z: z1 + depth / 2, w, d: depth, h, color: rpick(FACADES), front: 'n', kind: 'house' }, facades));
    const ez1 = z1 + (sides.n ? depth + 1 : 0), ez2 = z2 - (sides.s ? depth + 1 : 0);
    if (sides.e) row(ez1, ez2, (c, w, h) => addBuilding(scene, { x: x2 - depth / 2, z: c, w: depth, d: w, h, color: rpick(FACADES), front: 'e', kind: 'house' }, facades));
    if (sides.w) row(ez1, ez2, (c, w, h) => addBuilding(scene, { x: x1 + depth / 2, z: c, w: depth, d: w, h, color: rpick(FACADES), front: 'w', kind: 'house' }, facades));
    // phần lõi: cao ốc hoặc công viên
    const cx1 = x1 + (sides.w ? depth + 2 : 2), cx2 = x2 - (sides.e ? depth + 2 : 2);
    const cz1 = z1 + (sides.n ? depth + 2 : 2), cz2 = z2 - (sides.s ? depth + 2 : 2);
    if (cx2 - cx1 > 10 && cz2 - cz1 > 10) {
      const nx = Math.max(1, Math.floor((cx2 - cx1) / 17)), nz = Math.max(1, Math.floor((cz2 - cz1) / 17));
      const sx = (cx2 - cx1) / nx, sz = (cz2 - cz1) / nz;
      for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
        const px = cx1 + sx * (a + 0.5), pz = cz1 + sz * (b + 0.5);
        if (R() < 0.3) { parks.push({ x: px, z: pz, w: sx - 2, d: sz - 2 }); continue; }
        const g = addBuilding(scene, { x: px, z: pz, w: Math.min(sx - 3, rr(10, 15)), d: Math.min(sz - 3, rr(10, 15)), h: rr(18, 42), color: rpick(TOWERS), front: 's', kind: 'tower' }, facades);
        g.traverse((o) => { if (o.userData.blink) blinkers.push(o); });
      }
    }
  }
  return { blinkers, parks };
}

// ───────────────────────── mặt đường ─────────────────────────
function buildGround(scene) {
  const base = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN + 120, Z_MAX - Z_MIN + 120), std('#262a35', { roughness: 1 }));
  base.rotation.x = -Math.PI / 2; base.position.set((X_MIN + X_MAX) / 2, -0.04, (Z_MIN + Z_MAX) / 2); base.receiveShadow = true;
  scene.add(base);
  const asphalt = std('#121419', { roughness: 0.95 });
  for (const zc of H_ROADS) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(X_MAX - X_MIN, ROAD), asphalt);
    m.rotation.x = -Math.PI / 2; m.position.set((X_MIN + X_MAX) / 2, -0.03, zc); m.receiveShadow = true; scene.add(m);
  }
  for (const xc of V_ROADS) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, Z_MAX - Z_MIN), asphalt);
    m.rotation.x = -Math.PI / 2; m.position.set(xc, -0.029, (Z_MIN + Z_MAX) / 2); m.receiveShadow = true; scene.add(m);
  }
  // vỉa hè quanh khu văn phòng (sáng hơn chút) + bồn cỏ
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(W + 2 * (V_ROADS[0] * -1 - ROAD / 2), D + 2 * (H_ROADS[0] * -1 - ROAD / 2)), std('#2e3340', { roughness: 1 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(W / 2, -0.035, D / 2); plaza.receiveShadow = true; scene.add(plaza);

  const inX = (x) => V_ROADS.some((c) => Math.abs(x - c) < ROAD / 2 + 0.5);
  const inZ = (z) => H_ROADS.some((c) => Math.abs(z - c) < ROAD / 2 + 0.5);
  // vạch giữa đường
  const dash = [];
  for (const zc of H_ROADS) for (let x = X_MIN + 1; x < X_MAX; x += 4) if (!inX(x) && !inX(x + 2)) dash.push([x + 1, zc, 0]);
  for (const xc of V_ROADS) for (let z = Z_MIN + 1; z < Z_MAX; z += 4) if (!inZ(z) && !inZ(z + 2)) dash.push([xc, z + 1, Math.PI / 2]);
  const dg = new THREE.PlaneGeometry(2, 0.16); dg.rotateX(-Math.PI / 2);
  const dm = new THREE.InstancedMesh(dg, basic('#e8c860'), dash.length);
  const o = new THREE.Object3D();
  dash.forEach(([x, z, r], i) => { o.position.set(x, -0.02, z); o.rotation.set(0, r, 0); o.updateMatrix(); dm.setMatrixAt(i, o.matrix); });
  scene.add(dm);
  // vạch qua đường
  const zebra = [];
  for (const xc of V_ROADS) for (const zc of H_ROADS) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 8; k++) zebra.push([xc + s * (ROAD / 2 + 1.4), zc - ROAD / 2 + 0.5 + k, 0]); // qua đường ngang
      for (let k = 0; k < 8; k++) zebra.push([xc - ROAD / 2 + 0.5 + k, zc + s * (ROAD / 2 + 1.4), Math.PI / 2]); // qua đường dọc
    }
  }
  const zg = new THREE.PlaneGeometry(2.2, 0.5); zg.rotateX(-Math.PI / 2);
  const zm = new THREE.InstancedMesh(zg, basic('#d9dce4'), zebra.length);
  zebra.forEach(([x, z, r], i) => { o.position.set(x, -0.02, z); o.rotation.set(0, r, 0); o.updateMatrix(); zm.setMatrixAt(i, o.matrix); });
  scene.add(zm);
  // vạch dừng
  const stops = [];
  for (const xc of V_ROADS) for (const zc of H_ROADS) {
    stops.push([xc - ROAD / 2 - 3.2, zc + ROAD / 4, ROAD / 2, 0.25], [xc + ROAD / 2 + 3.2, zc - ROAD / 4, ROAD / 2, 0.25]);
    stops.push([xc - ROAD / 4, zc - ROAD / 2 - 3.2, 0.25, ROAD / 2], [xc + ROAD / 4, zc + ROAD / 2 + 3.2, 0.25, ROAD / 2]);
  }
  for (const [x, z, w, d] of stops) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d, w), basic('#d9dce4'));
    m.rotation.x = -Math.PI / 2; m.position.set(x, -0.019, z); scene.add(m);
  }
  return { inX, inZ };
}

// ───────────────────────── cây, đèn đường ─────────────────────────
function buildStreetFurniture(scene, { inX, inZ }, parks) {
  const trees = [], lamps = [];
  const edge = ROAD / 2;
  for (const zc of H_ROADS) for (const s of [-1, 1]) {
    for (let x = X_MIN + 4; x < X_MAX - 4; x += 9) {
      if (inX(x) || inX(x - 4) || inX(x + 4)) continue;
      const near = Math.abs(x - W / 2) < W / 2 + 4 && ((s < 0 && zc > D) || (s > 0 && zc < 0)); // vỉa hè sát văn phòng
      if (!(zc > D && s < 0 && Math.abs(x - W / 2) < 6)) trees.push([x, zc + s * (edge + 1.9)]);
      if (Math.round((x - X_MIN) / 9) % 2 === 0 || near) lamps.push([x + 4.5, zc + s * (edge + 0.6), s > 0 ? Math.PI : 0, 'h']);
    }
  }
  for (const xc of V_ROADS) for (const s of [-1, 1]) {
    for (let z = Z_MIN + 4; z < Z_MAX - 4; z += 9) {
      if (inZ(z) || inZ(z - 4) || inZ(z + 4)) continue;
      trees.push([xc + s * (edge + 1.9), z]);
      if (Math.round((z - Z_MIN) / 9) % 2 === 0) lamps.push([xc + s * (edge + 0.6), z + 4.5, s > 0 ? -Math.PI / 2 : Math.PI / 2, 'v']);
    }
  }
  for (const p of parks) {
    const n = Math.floor((p.w * p.d) / 40);
    for (let k = 0; k < n; k++) trees.push([p.x + rr(-p.w / 2, p.w / 2), p.z + rr(-p.d / 2, p.d / 2)]);
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), std('#183522', { roughness: 1 }));
    lawn.rotation.x = -Math.PI / 2; lawn.position.set(p.x, -0.025, p.z); scene.add(lawn);
  }
  for (let i = trees.length - 1; i >= 0; i--) { const [x, z] = trees[i]; if (x > -3.5 && x < W + 3.5 && z > -3.5 && z < D + 3.5) trees.splice(i, 1); }
  const o = new THREE.Object3D();
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 2.2, 6), std('#4a3424'), trees.length);
  const crownG = new THREE.IcosahedronGeometry(1.5, 0);
  const crown = new THREE.InstancedMesh(crownG, std('#ffffff', { roughness: 0.9, flatShading: true }), trees.length);
  const greens = ['#1f6b45', '#2a8a57', '#25774c', '#3a9a63', '#1b5e3c'].map((c) => new THREE.Color(c));
  trees.forEach(([x, z], i) => {
    const s = rr(0.8, 1.25);
    o.position.set(x, 1.1 * s, z); o.rotation.set(0, 0, 0); o.scale.set(s, s, s); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
    o.position.set(x, 2.9 * s, z); o.rotation.set(0, R() * 3, 0); o.scale.set(s, s * rr(1, 1.3), s); o.updateMatrix(); crown.setMatrixAt(i, o.matrix);
    crown.setColorAt(i, greens[i % greens.length]);
  });
  crown.castShadow = true;
  scene.add(trunk, crown);
  // đèn đường: cột + cần + bóng sáng + quầng sáng dưới đất
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.11, 5.6, 6), std('#2b2f3a', { metalness: 0.5 }), lamps.length);
  const armG = new THREE.BoxGeometry(0.08, 0.08, 1.6); armG.translate(0, 0, 0.8);
  const arm = new THREE.InstancedMesh(armG, std('#2b2f3a'), lamps.length);
  const bulb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), basic('#ffe2a8'), lamps.length);
  const pool = new THREE.InstancedMesh((() => { const g = new THREE.PlaneGeometry(7, 7); g.rotateX(-Math.PI / 2); return g; })(),
    basic('#ffffff', { map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }), lamps.length);
  lamps.forEach(([x, z, rot], i) => {
    o.scale.set(1, 1, 1); o.rotation.set(0, 0, 0);
    o.position.set(x, 2.8, z); o.updateMatrix(); pole.setMatrixAt(i, o.matrix);
    o.position.set(x, 5.55, z); o.rotation.set(0, rot, 0); o.updateMatrix(); arm.setMatrixAt(i, o.matrix);
    const dx = Math.sin(rot) * 1.5, dz = Math.cos(rot) * 1.5;
    o.position.set(x + dx, 5.5, z + dz); o.updateMatrix(); bulb.setMatrixAt(i, o.matrix);
    o.position.set(x + dx, -0.01, z + dz); o.rotation.set(0, 0, 0); o.updateMatrix(); pool.setMatrixAt(i, o.matrix);
  });
  scene.add(pole, arm, bulb, pool);
}

// ───────────────────────── đèn giao thông ─────────────────────────
const CYCLE = 22; // giây
export function signal(axis, t) {
  const p = t % CYCLE;
  if (axis === 'x') return p < 9 ? 'green' : p < 11 ? 'yellow' : 'red';
  return p >= 11 && p < 20 ? 'green' : p >= 20 ? 'yellow' : 'red';
}

function buildTrafficLights(scene) {
  const mats = {};
  for (const axis of ['x', 'z']) {
    mats[axis] = {
      red: std('#3a0d12', { emissive: '#ff2b3c', emissiveIntensity: 0 }),
      yellow: std('#3a2a0d', { emissive: '#ffbf2b', emissiveIntensity: 0 }),
      green: std('#0d3a20', { emissive: '#2bff8a', emissiveIntensity: 0 }),
    };
  }
  const poleM = std('#1c1f28', { metalness: 0.5 });
  const lens = new THREE.SphereGeometry(0.16, 10, 8);
  for (const xc of V_ROADS) for (const zc of H_ROADS) {
    const o = ROAD / 2 + 0.9;
    // [x, z, trục điều khiển, hướng mặt đèn]
    const posts = [[xc - o, zc + o, 'x', -Math.PI / 2], [xc + o, zc - o, 'x', Math.PI / 2], [xc + o, zc + o, 'z', 0], [xc - o, zc - o, 'z', Math.PI]];
    for (const [x, z, axis, rot] of posts) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.6, 8), poleM); pole.position.y = 1.8; g.add(pole);
      const head = new THREE.Mesh(BOX, poleM); head.scale.set(0.5, 1.3, 0.42); head.position.y = 3.95; g.add(head);
      ['red', 'yellow', 'green'].forEach((k, i) => {
        const l = new THREE.Mesh(lens, mats[axis][k]); l.position.set(0, 4.35 - i * 0.4, 0.22); g.add(l);
      });
    }
  }
  return (t) => {
    for (const axis of ['x', 'z']) {
      const s = signal(axis, t);
      for (const k of ['red', 'yellow', 'green']) mats[axis][k].emissiveIntensity = k === s ? 3 : 0.05;
    }
  };
}

// ───────────────────────── phương tiện ─────────────────────────
function makeCar(color, taxi) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(BOX, std(color, { metalness: 0.35, roughness: 0.4 })); body.scale.set(4.1, 0.75, 1.85); body.position.y = 0.72; g.add(body);
  const cab = new THREE.Mesh(BOX, std('#141822', { metalness: 0.6, roughness: 0.2 })); cab.scale.set(2.2, 0.7, 1.65); cab.position.set(-0.25, 1.42, 0); g.add(cab);
  const top = new THREE.Mesh(BOX, std(color, { metalness: 0.35, roughness: 0.4 })); top.scale.set(1.9, 0.08, 1.6); top.position.set(-0.25, 1.8, 0); g.add(top);
  if (taxi) { const s = new THREE.Mesh(BOX, basic('#fff1a8')); s.scale.set(0.5, 0.22, 0.7); s.position.set(-0.25, 1.95, 0); g.add(s); }
  addWheels(g, [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]], 0.36);
  addLights(g, 2.06, 0.7, 0.62);
  return { mesh: g, len: 4.3, vmax: rr(6.5, 8.5) };
}

function makeBus() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(BOX, std(rpick(['#2fa38a', '#2f6fd1', '#d35400']), { roughness: 0.5 })); body.scale.set(10, 2.4, 2.4); body.position.y = 1.65; g.add(body);
  const win = new THREE.Mesh(BOX, std('#10131a', { emissive: '#ffe2a8', emissiveIntensity: 0.45 })); win.scale.set(9.2, 0.8, 2.42); win.position.set(0.2, 2.1, 0); g.add(win);
  addWheels(g, [[3.4, 1.15], [-3.4, 1.15], [3.4, -1.15], [-3.4, -1.15]], 0.5);
  addLights(g, 5.01, 0.9, 0.8);
  return { mesh: g, len: 10.2, vmax: rr(5, 6) };
}

const RIDER = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#9b59b6', '#2ecc71', '#e67e22'];
function makeScooter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(BOX, std(rpick(['#c0392b', '#ecf0f1', '#2c3e50', '#2f6fd1', '#e67e22']), { metalness: 0.3, roughness: 0.4 }));
  body.scale.set(1.5, 0.45, 0.42); body.position.y = 0.55; g.add(body);
  addWheels(g, [[0.62, 0], [-0.62, 0]], 0.28, 0.14);
  const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 8), std(rpick(RIDER))); rider.position.set(-0.15, 1.25, 0); rider.rotation.z = -0.2; g.add(rider);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), std(rpick(['#f1c40f', '#ecf0f1', '#e74c3c', '#1abc9c', '#ff7ac8']), { roughness: 0.3 })); helmet.position.set(0, 1.78, 0); g.add(helmet);
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), basic('#fff6d6')); hl.position.set(0.8, 0.85, 0); g.add(hl);
  const tl = new THREE.Mesh(BOX, basic('#ff2b3c')); tl.scale.set(0.05, 0.08, 0.2); tl.position.set(-0.78, 0.75, 0); g.add(tl);
  const beam = beamMesh(1.4); beam.position.x = 2; g.add(beam);
  return { mesh: g, len: 1.9, vmax: rr(5.5, 7.5) };
}

function addWheels(g, pos, r, w = 0.28) {
  const geo = new THREE.CylinderGeometry(r, r, w, 12); geo.rotateX(Math.PI / 2);
  const m = std('#0b0c10');
  for (const [x, z] of pos) { const wh = new THREE.Mesh(geo, m); wh.position.set(x, r, z); g.add(wh); }
}

function addLights(g, x, y, z) {
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(BOX, basic('#fff6d6')); h.scale.set(0.06, 0.16, 0.36); h.position.set(x, y, s * z); g.add(h);
    const t = new THREE.Mesh(BOX, basic('#ff2b3c')); t.scale.set(0.06, 0.14, 0.32); t.position.set(-x, y, s * z); g.add(t);
  }
  const beam = beamMesh(2.6); beam.position.x = x + 2.4; g.add(beam);
}

function beamMesh(size) {
  const g = new THREE.PlaneGeometry(size * 2.2, size * 1.6); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, basic('#fff1c8', { map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
  m.position.y = 0.02;
  return m;
}

function buildTraffic(scene) {
  const lanes = [];
  for (const zc of H_ROADS) {
    lanes.push({ axis: 'x', dir: 1, fixed: zc + 1.7, cross: V_ROADS, from: X_MIN - 8, to: X_MAX + 8, kind: 'car' });
    lanes.push({ axis: 'x', dir: -1, fixed: zc - 1.7, cross: V_ROADS, from: X_MIN - 8, to: X_MAX + 8, kind: 'car' });
    lanes.push({ axis: 'x', dir: 1, fixed: zc + 3.2, cross: V_ROADS, from: X_MIN - 8, to: X_MAX + 8, kind: 'bike' });
    lanes.push({ axis: 'x', dir: -1, fixed: zc - 3.2, cross: V_ROADS, from: X_MIN - 8, to: X_MAX + 8, kind: 'bike' });
  }
  for (const xc of V_ROADS) {
    lanes.push({ axis: 'z', dir: 1, fixed: xc - 1.7, cross: H_ROADS, from: Z_MIN - 8, to: Z_MAX + 8, kind: 'car' });
    lanes.push({ axis: 'z', dir: -1, fixed: xc + 1.7, cross: H_ROADS, from: Z_MIN - 8, to: Z_MAX + 8, kind: 'car' });
    lanes.push({ axis: 'z', dir: 1, fixed: xc - 3.2, cross: H_ROADS, from: Z_MIN - 8, to: Z_MAX + 8, kind: 'bike' });
    lanes.push({ axis: 'z', dir: -1, fixed: xc + 3.2, cross: H_ROADS, from: Z_MIN - 8, to: Z_MAX + 8, kind: 'bike' });
  }
  for (const lane of lanes) {
    const n = lane.kind === 'car' ? 3 : 3;
    lane.vehicles = [];
    const span = lane.to - lane.from;
    for (let k = 0; k < n; k++) {
      const v = lane.kind === 'bike' ? makeScooter() : R() < 0.14 ? makeBus() : makeCar(rpick(CAR_COLORS), R() < 0.2);
      v.s = lane.from + span * ((k + rr(0, 0.6)) / n);
      v.v = v.vmax * 0.6;
      v.mesh.rotation.y = lane.axis === 'x' ? (lane.dir > 0 ? 0 : Math.PI) : (lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      scene.add(v.mesh);
      lane.vehicles.push(v);
    }
  }
  const stopGap = ROAD / 2 + 3.4;
  return (dt, t) => {
    for (const lane of lanes) {
      const dir = lane.dir, vs = lane.vehicles;
      vs.sort((a, b) => (b.s - a.s) * dir);
      const light = signal(lane.axis, t);
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i];
        const front = v.s + (dir * v.len) / 2;
        let target = v.vmax;
        // dừng đèn đỏ / vàng ở vạch dừng gần nhất phía trước
        if (light !== 'green') {
          for (const c of lane.cross) {
            const stop = c - dir * stopGap;
            const d = (stop - front) * dir;
            if (d > -0.3 && d < 16 && !(light === 'yellow' && d < 3)) target = Math.min(target, Math.max(0, d - 0.3) * 0.9);
          }
        }
        // giữ khoảng cách với xe phía trước
        if (i > 0) {
          const lead = vs[i - 1];
          const gap = (lead.s - v.s) * dir - (lead.len + v.len) / 2;
          target = Math.min(target, Math.max(0, gap - 1.8) * 1.1);
        }
        const acc = target > v.v ? 3.5 : 9;
        v.v += Math.max(-acc * dt, Math.min(acc * dt, target - v.v));
        v.s += dir * v.v * dt;
        if ((v.s - (dir > 0 ? lane.to : lane.from)) * dir > 0) {
          // ra khỏi bản đồ → quay lại đầu làn (phía sau xe cuối cùng)
          const tail = vs[vs.length - 1];
          const start = dir > 0 ? lane.from : lane.to;
          v.s = tail && tail !== v ? Math.min(start * dir, (tail.s - dir * (tail.len + 6)) * dir) * dir : start;
          v.v = v.vmax * 0.5;
        }
        const bob = lane.kind === 'bike' ? Math.sin(t * 9 + i) * 0.015 : 0;
        if (lane.axis === 'x') v.mesh.position.set(v.s, bob, lane.fixed);
        else v.mesh.position.set(lane.fixed, bob, v.s);
      }
    }
  };
}

// ───────────────────────── người đi bộ + xe máy đậu ─────────────────────────
function buildSidewalkLife(scene) {
  const loop = { x1: -1.9, z1: -1.9, x2: W + 1.9, z2: D + 1.9 };
  const per = 2 * (loop.x2 - loop.x1 + loop.z2 - loop.z1);
  const at = (p) => {
    p = ((p % per) + per) % per;
    const w = loop.x2 - loop.x1, d = loop.z2 - loop.z1;
    if (p < w) return [loop.x1 + p, loop.z1, 0];
    if ((p -= w) < d) return [loop.x2, loop.z1 + p, -Math.PI / 2];
    if ((p -= d) < w) return [loop.x2 - p, loop.z2, Math.PI];
    p -= w; return [loop.x1, loop.z2 - p, Math.PI / 2];
  };
  const walkers = [];
  for (let k = 0; k < 9; k++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 8), std(rpick(RIDER))); body.position.y = 1.05; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), std(rpick(['#f1c9a5', '#d9a57c', '#c9946b']))); head.position.y = 1.6; g.add(head);
    if (R() < 0.4) { const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.18, 14), std('#e8d7a8')); hat.position.y = 1.76; g.add(hat); } // nón lá
    const legs = [];
    for (const s of [-0.09, 0.09]) {
      const hip = new THREE.Group(); hip.position.set(0, 0.72, s); g.add(hip);
      const leg = new THREE.Mesh(BOX, std('#1b1f2c')); leg.scale.set(0.12, 0.7, 0.12); leg.position.y = -0.35; hip.add(leg);
      legs.push(hip);
    }
    scene.add(g);
    walkers.push({ g, legs, p: rr(0, per), v: rr(0.9, 1.4) * (R() < 0.5 ? 1 : -1), side: rr(-0.25, 0.25) });
  }
  // xe máy đậu trước cửa văn phòng
  for (let k = 0; k < 9; k++) {
    const s = makeScooter();
    s.mesh.children.forEach((c) => { if (c.geometry && c.geometry.type === 'CapsuleGeometry') c.visible = false; });
    s.mesh.children.filter((c) => c.geometry && c.geometry.type === 'SphereGeometry').forEach((c) => { c.visible = false; });
    s.mesh.children.filter((c) => c.material && c.material.blending === THREE.AdditiveBlending).forEach((c) => { c.visible = false; });
    s.mesh.position.set(W / 2 - 13 + k * 1.1, 0, D + 2.55); s.mesh.rotation.y = 0.55;
    scene.add(s.mesh);
  }
  return (dt, t) => {
    for (const w of walkers) {
      w.p += w.v * dt;
      const [x, z, rot] = at(w.p);
      const nx = Math.sin(rot + Math.PI / 2), nz = Math.cos(rot + Math.PI / 2);
      w.g.position.set(x + nx * w.side, Math.abs(Math.sin(t * 6 + w.side * 10)) * 0.03, z + nz * w.side);
      w.g.rotation.y = rot + (w.v < 0 ? Math.PI : 0);
      const sw = Math.sin(t * 6 + w.side * 10) * 0.5;
      w.legs[0].rotation.z = sw; w.legs[1].rotation.z = -sw;
    }
  };
}

// Dây đèn trang trí trên tường bao văn phòng
function buildStringLights(scene) {
  const pts = [];
  const add = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(len / 0.7);
    for (let i = 0; i <= n; i++) {
      const t = i / n, sag = Math.sin(((i % 6) / 6) * Math.PI) * -0.12;
      pts.push([x1 + (x2 - x1) * t, 0.85 + sag, z1 + (z2 - z1) * t]);
    }
  };
  const e = -0.15;
  add(e, e, W - e, e); add(W - e, e, W - e, D - e); add(W - e, D - e, e, D - e); add(e, D - e, e, e);
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), basic('#ffffff'), pts.length);
  const o = new THREE.Object3D();
  const cols = ['#ffd58a', '#ffd58a', '#ff7ac8', '#ffd58a', '#7fd3ff'].map((c) => new THREE.Color(c));
  pts.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, cols[i % cols.length]); });
  scene.add(m);
  return m;
}

function buildEntrance(scene, logoTexture) {
  // cổng chính phía nam + biển hiệu DEFFI ADS VIỆT
  const g = new THREE.Group(); g.position.set(W / 2, 0, D + 0.9); scene.add(g);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(BOX, std('#1c2130')); p.scale.set(0.35, 3.2, 0.35); p.position.set(s * 3.2, 1.6, 0); g.add(p);
  }
  const beam = new THREE.Mesh(BOX, std('#10131d')); beam.scale.set(7.2, 1.3, 0.4); beam.position.y = 3.6; g.add(beam);
  if (logoTexture) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), basic('#ffffff', { map: logoTexture, transparent: true }));
    sign.position.set(0, 3.6, 0.21); g.add(sign);
  }
  const stripe = new THREE.Mesh(BOX, basic('#ff7ac8')); stripe.scale.set(7.2, 0.05, 0.42); stripe.position.y = 2.93; g.add(stripe);
  const glow = new THREE.PointLight('#ff7ac8', 10, 9, 2); glow.position.set(0, 2.6, 1.2); g.add(glow);
}

// Cột điện + dây điện võng chằng chịt dọc vỉa hè
function buildPowerLines(scene, { inX, inZ }) {
  const poles = [];
  const edge = ROAD / 2 + 1.25;
  for (const zc of H_ROADS) for (const s of [-1, 1]) {
    const row = [];
    for (let x = X_MIN + 6 + (s > 0 ? 7 : 0); x < X_MAX - 4; x += 15) if (!inX(x) && !inX(x - 3) && !inX(x + 3)) row.push([x, zc + s * edge]);
    poles.push(row);
  }
  for (const xc of V_ROADS) for (const s of [-1, 1]) {
    const row = [];
    for (let z = Z_MIN + 6 + (s > 0 ? 7 : 0); z < Z_MAX - 4; z += 15) if (!inZ(z) && !inZ(z - 3) && !inZ(z + 3)) row.push([xc + s * edge, z]);
    poles.push(row);
  }
  // không dựng cột điện sát khu văn phòng
  const nearOffice = ([x, z]) => x > -4 && x < W + 4 && z > -4 && z < D + 4;
  for (let i = 0; i < poles.length; i++) poles[i] = poles[i].filter((p) => !nearOffice(p));
  const all = poles.flat();
  const pm = std('#4a4d55', { roughness: 0.9 });
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.17, 7.6, 6), pm, all.length);
  const bar = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), pm, all.length * 2);
  const coil = new THREE.InstancedMesh(new THREE.TorusGeometry(0.32, 0.12, 6, 12), std('#15161a'), all.length);
  const o = new THREE.Object3D();
  all.forEach(([x, z], i) => {
    o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    o.position.set(x, 3.8, z); o.updateMatrix(); pole.setMatrixAt(i, o.matrix);
    const alongX = H_ROADS.some((c) => Math.abs(z - c) < ROAD);
    o.rotation.set(0, alongX ? Math.PI / 2 : 0, 0);
    o.position.set(x, 6.9, z); o.updateMatrix(); bar.setMatrixAt(i * 2, o.matrix);
    o.position.set(x, 6.3, z); o.updateMatrix(); bar.setMatrixAt(i * 2 + 1, o.matrix);
    o.rotation.set(Math.PI / 2, 0, 0); o.scale.set(1, 1, 0.7 + R() * 0.6);
    o.position.set(x, 5.6 + R() * 0.6, z); o.updateMatrix(); coil.setMatrixAt(i, o.matrix);
  });
  scene.add(pole, bar, coil);
  const seg = [];
  const span = (a, b, ya, yb, sag) => {
    const n = 10;
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const p = [a[0] + (b[0] - a[0]) * t, ya + (yb - ya) * t - Math.sin(t * Math.PI) * sag, a[1] + (b[1] - a[1]) * t];
      if (prev) seg.push(...prev, ...p);
      prev = p;
    }
  };
  for (const row of poles) for (let i = 1; i < row.length; i++) {
    const a = row[i - 1], b = row[i];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 20) continue;
    for (let w = 0; w < 5; w++) {
      const off = (w - 2) * 0.28;
      const alongX = Math.abs(a[1] - b[1]) < 0.1;
      const aa = alongX ? [a[0], a[1] + off] : [a[0] + off, a[1]], bb = alongX ? [b[0], b[1] + off] : [b[0] + off, b[1]];
      span(aa, bb, w < 3 ? 6.9 : 6.3, w < 3 ? 6.9 : 6.3, 0.5 + R() * 0.7);
    }
    // dây kéo vào nhà
    if (R() < 0.6) {
      const alongX = Math.abs(a[1] - b[1]) < 0.1;
      const dir = alongX ? Math.sign(a[1] - H_ROADS.reduce((m, c) => (Math.abs(a[1] - c) < Math.abs(a[1] - m) ? c : m))) : Math.sign(a[0] - V_ROADS.reduce((m, c) => (Math.abs(a[0] - c) < Math.abs(a[0] - m) ? c : m)));
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const house = alongX ? [mid[0] + (R() - 0.5) * 6, mid[1] + dir * 4.2] : [mid[0] + dir * 4.2, mid[1] + (R() - 0.5) * 6];
      if (!nearOffice(house)) span(a, house, 6.3, 5.2, 0.4);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#0a0b0e' })));
}

/** Dựng toàn bộ khu phố; trả về hàm update(dt, t) để chạy xe, người, đèn. */
export function buildCity(scene, { logoTexture } = {}) {
  const roads = buildGround(scene);
  const { blinkers, parks } = fillBlocks(scene);
  buildStreetFurniture(scene, roads, parks);
  const lights = buildTrafficLights(scene);
  const traffic = buildTraffic(scene);
  const life = buildSidewalkLife(scene);
  buildPowerLines(scene, roads);
  buildEntrance(scene, logoTexture);
  return {
    update(dt, t) {
      lights(t);
      traffic(dt, t);
      life(dt, t);
      const on = Math.sin(t * 3) > 0;
      for (const b of blinkers) b.visible = on;
    },
  };
}
