// Nội thất văn phòng kiểu "nhà búp bê" isometric: sàn gỗ/caro/thảm, tường bao cao có cửa sổ & dây đèn
// (tự hạ thấp khi quay về phía camera), bàn làm việc chi tiết, đèn thả, kệ sách, sofa, bàn bi-a…
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  W, D, WALL_H, WALLS, ROOMS, DESKS, seatOf, MEETING_TABLE, MEETING_SEATS, PANTRY, LOUNGE, PLANTS, CABINETS,
  FURNITURE, PENDANTS,
} from './layout.js';

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...opts });
}
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const BOX = new THREE.BoxGeometry(1, 1, 1);
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function box(parent, w, h, d, m, x = 0, y = 0, z = 0, shadow = true) {
  const b = new THREE.Mesh(BOX, m);
  b.scale.set(w, h, d); b.position.set(x, y, z);
  b.castShadow = shadow; b.receiveShadow = true;
  parent.add(b);
  return b;
}

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

export function textTexture(text, { color = '#e9ecf5', size = 64, bg = null, w = 1024, h = 128 } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = `700 ${size}px Unbounded, "Be Vietnam Pro", sans-serif`;
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

export function logoTexture() {
  return canvasTex(1024, 256, (g) => {
    const grad = g.createLinearGradient(20, 230, 200, 20);
    grad.addColorStop(0, '#7fd3ff'); grad.addColorStop(1, '#ff7ac8');
    g.save(); g.translate(28, 28); g.scale(2, 2);
    g.strokeStyle = grad; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
    g.translate(-2, 0);
    g.stroke(new Path2D('M24 16 V84 H46 A34 34 0 0 0 63 20.6'));
    g.stroke(new Path2D('M24 16 H36'));
    g.fillStyle = '#ff7ac8'; g.beginPath(); g.arc(48, 16, 5.5, 0, Math.PI * 2); g.fill();
    g.restore();
    const tg = g.createLinearGradient(260, 0, 1000, 0);
    tg.addColorStop(0, '#e9ecf5'); tg.addColorStop(1, '#ffd1ec');
    g.fillStyle = tg; g.font = '700 92px Unbounded, "Be Vietnam Pro", sans-serif'; g.textBaseline = 'middle';
    g.fillText('DEFFI', 262, 104);
    g.font = '500 52px "Be Vietnam Pro", sans-serif'; g.fillStyle = '#9fdcff';
    g.fillText('ADS VIỆT', 266, 186);
  });
}

// ───────────────────────── vật liệu sàn ─────────────────────────
function woodTex(base, dark) {
  return canvasTex(512, 512, (g, w, h) => {
    const ph = 32;
    for (let y = 0; y < h; y += ph) {
      let x = -((y / ph) % 3) * 70;
      while (x < w) {
        const len = 140 + rnd() * 120;
        const l = 0.88 + rnd() * 0.2;
        g.fillStyle = shade(base, l); g.fillRect(x, y, len, ph);
        g.fillStyle = 'rgba(0,0,0,0.05)';
        for (let k = 0; k < 4; k++) g.fillRect(x, y + 4 + rnd() * (ph - 8), len, 1);
        g.fillStyle = dark; g.fillRect(x, y, 2, ph);
        x += len;
      }
      g.fillStyle = dark; g.fillRect(0, y, w, 2);
    }
  }, [W / 8, D / 8]);
}
function checkerTex(a, b) {
  return canvasTex(256, 256, (g) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64); }
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
  }, [1, 1]);
}
function carpetTex(base) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 3;
    for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
  }, [1, 1]);
}
function tileTex(base) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, [1, 1]);
}
function rugTex(color) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,230,200,0.55)'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
    g.lineWidth = 2; g.strokeRect(28, 28, w - 56, h - 56);
    g.fillStyle = 'rgba(255,230,200,0.25)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2, h / 2, 18 + i * 14, 0, Math.PI * 2); g.lineWidth = 2; g.stroke(); }
  });
}
function shade(hex, l) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * l)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function floors(s) {
  const base = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat('#ffffff', { map: woodTex('#b98a5e', '#7a5434'), roughness: 0.6 }));
  base.rotation.x = -Math.PI / 2; base.position.set(W / 2, 0, D / 2); base.receiveShadow = true; s.add(base);
  const special = {
    bgd: () => woodTex('#6e4630', '#3d2618'),
    meeting: () => carpetTex('#34405a'),
    reception: () => tileTex('#e6e1d8'),
    pantry: () => checkerTex('#f1ede6', '#2b2e38'),
  };
  for (const r of ROOMS) {
    const w = r.x2 - r.x1, d = r.z2 - r.z1;
    const make = special[r.id];
    if (make) {
      const t = make();
      if (t.wrapS !== THREE.RepeatWrapping) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      t.repeat.set(r.id === 'pantry' ? w / 1.6 : r.id === 'bgd' ? w / 8 : w / 3, r.id === 'pantry' ? d / 1.6 : r.id === 'bgd' ? d / 8 : d / 3);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat('#ffffff', { map: t, roughness: r.id === 'reception' ? 0.35 : 0.8 }));
      f.rotation.x = -Math.PI / 2; f.position.set(r.x1 + w / 2, 0.003, r.z1 + d / 2); f.receiveShadow = true; s.add(f);
    }
    // biển tên khu vực: tấm nhỏ đặt trên sàn
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.5), basic('#ffffff', { map: textTexture(r.name, { color: r.color, size: 50, bg: 'rgba(10,12,20,0.78)' }), transparent: true }));
    plate.rotation.x = -Math.PI / 2; plate.position.set(r.x1 + w / 2, 0.012, r.z2 - 0.45); s.add(plate);
  }
  // viền móng toà nhà
  const plinth = mat('#3a3f4c');
  box(s, W + 0.6, 0.25, 0.3, plinth, W / 2, -0.11, -0.15, false);
  box(s, W + 0.6, 0.25, 0.3, plinth, W / 2, -0.11, D + 0.15, false);
  box(s, 0.3, 0.25, D, plinth, -0.15, -0.11, D / 2, false);
  box(s, 0.3, 0.25, D, plinth, W + 0.15, -0.11, D / 2, false);
}

// ───────────────────────── tường ─────────────────────────
function walls(s) {
  const cut = [];
  const decor = {}; // nhóm đồ treo tường theo cạnh: n, s, w, e
  const wallM = mat('#e8e2d6', { roughness: 0.9 });
  const capM = mat('#3a3f4c');
  const paneM = mat('#0f1a2c', { emissive: '#3d6f9e', emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.3 });
  const frameM = mat('#2a2e38');
  const bulbGeo = new THREE.SphereGeometry(0.06, 6, 4);
  const bulbCols = ['#ffd58a', '#ffd58a', '#ff7ac8', '#ffd58a', '#7fd3ff'].map((c) => new THREE.Color(c));
  for (const [x1, z1, x2, z2, kind] of WALLS) {
    const len = Math.hypot(x2 - x1, z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const alongX = Math.abs(z2 - z1) < 0.01;
    if (kind === 'outer') {
      const side = alongX ? (cz < 1 ? 'n' : 's') : (cx < 1 ? 'w' : 'e');
      const n = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[side];
      const g = new THREE.Group(); s.add(g);
      const T = 0.3;
      const wall = box(g, alongX ? len + T : T, 1, alongX ? T : len + T, wallM, cx, 0.5, cz);
      const top = new THREE.Group(); g.add(top);
      box(top, alongX ? len + T + 0.04 : T + 0.06, 0.12, alongX ? T + 0.06 : len + T + 0.04, capM, cx, 0.06, cz, false);
      // dây đèn võng dọc đỉnh tường
      const pts = [];
      const nb = Math.floor(len / 0.55);
      for (let i = 0; i <= nb; i++) {
        const t = i / nb, sag = -Math.sin(((i % 7) / 7) * Math.PI) * 0.16;
        const px = alongX ? x1 + (x2 - x1) * t : cx + n[0] * 0.2;
        const pz = alongX ? cz + n[1] * 0.2 : z1 + (z2 - z1) * t;
        pts.push([px, -0.12 + sag, pz]);
      }
      const bulbs = new THREE.InstancedMesh(bulbGeo, basic('#ffffff'), pts.length);
      const o = new THREE.Object3D();
      pts.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); bulbs.setMatrixAt(i, o.matrix); bulbs.setColorAt(i, bulbCols[i % bulbCols.length]); });
      top.add(bulbs);
      // cửa sổ (ẩn khi tường hạ)
      const win = new THREE.Group(); g.add(win);
      const skip = (p) => (side === 'n' && ((p > 19.2 && p < 26.8) || [9, 19, 27].some((v) => Math.abs(p - v) < 1.1)))
        || ((side === 'w' || side === 'e') && Math.abs(p - 8) < 1.1);
      const start = alongX ? Math.min(x1, x2) : Math.min(z1, z2), end = alongX ? Math.max(x1, x2) : Math.max(z1, z2);
      for (let p = start + 1.8; p < end - 1.2; p += 3.1) {
        if (skip(p)) continue;
        const wx = alongX ? p : cx, wz = alongX ? cz : p;
        box(win, alongX ? 1.7 : T + 0.04, 1.35, alongX ? T + 0.04 : 1.7, paneM, wx, 1.85, wz, false);
        box(win, alongX ? 1.86 : T + 0.08, 0.08, alongX ? T + 0.08 : 1.86, frameM, wx, 1.13, wz, false);
        box(win, alongX ? 1.86 : T + 0.08, 0.08, alongX ? T + 0.08 : 1.86, frameM, wx, 2.56, wz, false);
        box(win, alongX ? 0.05 : T + 0.06, 1.35, alongX ? T + 0.06 : 0.05, frameM, wx, 1.85, wz, false);
      }
      const dec = new THREE.Group(); g.add(dec);
      decor[side] = (decor[side] || []).concat(dec);
      cut.push({ wall, top, win, dec, n, h: WALL_H, full: WALL_H, low: 0.45 });
    } else {
      // vách kính: chân tường thấp + kính mờ + khung
      const ang = Math.atan2(z2 - z1, x2 - x1);
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = -ang; s.add(g);
      box(g, len, 0.95, 0.14, mat('#d9d3c7'), 0, 0.475, 0);
      const glass = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false });
      const gl = new THREE.Mesh(BOX, glass); gl.scale.set(len, 1.25, 0.04); gl.position.y = 1.6; g.add(gl);
      box(g, len, 0.06, 0.1, capM, 0, 2.24, 0, false);
      for (let p = -len / 2; p <= len / 2 + 0.01; p += Math.max(1.2, len / Math.ceil(len / 1.6))) box(g, 0.05, 1.3, 0.08, capM, p, 1.6, 0, false);
    }
  }
  return { cut, decor };
}

function addDecor(decor, side, fn) {
  const g = decor[side] && decor[side][0];
  if (g) fn(g);
}

function wallDecor(decor) {
  // logo lễ tân trên tường bắc
  addDecor(decor, 'n', (g) => {
    box(g, 6.6, 2.5, 0.12, mat('#10131d'), 23, 1.55, 0.22);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), basic('#ffffff', { map: logoTexture(), transparent: true }));
    logo.position.set(23, 1.75, 0.29); g.add(logo);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.05), basic('#ff7ac8')); strip.position.set(23, 0.36, 0.29); g.add(strip);
    // tranh trong phòng giám đốc
    const art = [['#ff7ac8', '#7fd3ff'], ['#ffb86b', '#6bffc8'], ['#c3a6ff', '#ff7ac8']];
    art.forEach(([a, b], i) => {
      const t = canvasTex(128, 160, (c, w, h) => {
        const gr = c.createLinearGradient(0, h, w, 0); gr.addColorStop(0, a); gr.addColorStop(1, b);
        c.fillStyle = '#f4efe6'; c.fillRect(0, 0, w, h); c.fillStyle = gr; c.fillRect(12, 12, w - 24, h - 24);
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(w / 2, h / 2, 24, 0, Math.PI * 2); c.fill();
      });
      box(g, 0.9, 1.1, 0.05, mat('#2a2e38'), 2.6 + i * 1.6, 1.8, 0.18, false);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), mat('#ffffff', { map: t })); p.position.set(2.6 + i * 1.6, 1.8, 0.21); g.add(p);
    });
    // bảng trắng phòng họp
    box(g, 3.4, 1.3, 0.06, mat('#f7f7f4', { roughness: 0.3 }), 14, 1.75, 0.2, false);
    const scrib = canvasTex(512, 196, (c, w, h) => {
      c.fillStyle = '#f7f7f4'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#2f6fd1'; c.lineWidth = 4; c.font = '600 28px "Be Vietnam Pro"'; c.fillStyle = '#2f6fd1';
      c.fillText('KẾ HOẠCH Q4', 24, 42); c.fillStyle = '#d0335f'; c.fillText('ROAS ↑ 3.2x', 300, 42);
      c.beginPath(); c.moveTo(30, 170); c.lineTo(120, 130); c.lineTo(200, 145); c.lineTo(300, 80); c.lineTo(420, 60); c.stroke();
      c.strokeStyle = '#2fa38a'; c.strokeRect(330, 100, 140, 70);
    });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.2), mat('#ffffff', { map: scrib })); sp.position.set(14, 1.75, 0.235); g.add(sp);
    // tủ bếp treo + menu pantry
    box(g, 6.5, 0.7, 0.4, mat('#f1ede6'), 31.2, 2.3, 0.35, false);
    const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), basic('#ffffff', { map: textTexture('☕ COFFEE · TRÀ', { color: '#ffb86b', size: 70, bg: '#1a1d26' }) }));
    menu.position.set(29.0, 1.55, 0.18); g.add(menu);
  });
  addDecor(decor, 'w', (g) => {
    // bảng ghim + đồng hồ khu Marketing / Kế toán
    box(g, 0.05, 1.0, 2.2, mat('#b88a5a'), 0.18, 1.7, 14.5, false);
    for (let i = 0; i < 8; i++) {
      const c = ['#fff27a', '#ff9ec8', '#9fdcff', '#b4ff9e'][i % 4];
      box(g, 0.02, 0.22, 0.22, mat(c), 0.22, 1.45 + (i % 2) * 0.4, 13.7 + Math.floor(i / 2) * 0.5, false);
    }
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), mat('#f4efe6')); clock.rotation.z = Math.PI / 2; clock.position.set(0.2, 2.3, 20.6); g.add(clock);
    box(g, 0.03, 0.02, 0.2, mat('#111'), 0.24, 2.33, 20.66, false);
  });
}

// ───────────────────────── bàn làm việc ─────────────────────────
function desks(s) {
  const deskTop = mat('#efe8dc', { roughness: 0.5 });
  const deskLeg = mat('#2a2f40', { metalness: 0.5, roughness: 0.4 });
  const screenColors = ['#7fd3ff', '#ff7ac8', '#6bffc8', '#ffb86b', '#c3a6ff'];
  let n = 0;
  for (const slot in DESKS) {
    const d = DESKS[slot], w = d.big ? 2.2 : 1.6, dep = d.big ? 1 : 0.8;
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); s.add(g);
    box(g, w, 0.05, dep, d.big ? mat('#4a2e22', { roughness: 0.4 }) : deskTop, 0, 0.75, 0);
    if (d.big) box(g, w - 0.1, 0.7, 0.05, mat('#3a2418'), 0, 0.38, (d.face === 'n' ? -1 : 1) * (dep / 2 - 0.05));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.05, 0.75, 0.05, deskLeg, lx * (w / 2 - 0.06), 0.375, lz * (dep / 2 - 0.06), false);
    const facing = d.face === 'n' ? -1 : 1;
    const sc = screenColors[n % screenColors.length];
    const monitors = slot.startsWith('tech') || slot.startsWith('design') ? [-0.38, 0.38] : [0];
    for (const mx of monitors) {
      const mon = new THREE.Group(); mon.position.set(mx, 0.78, facing * (dep / 2 - 0.16)); g.add(mon);
      if (monitors.length > 1) mon.rotation.y = -mx * 0.5 * facing;
      box(mon, 0.06, 0.22, 0.06, deskLeg, 0, 0.11, 0, false);
      box(mon, 0.7, 0.42, 0.04, mat('#0d0f16'), 0, 0.42, 0);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), mat('#0b0e16', { emissive: sc, emissiveIntensity: 0.65 }));
      screen.position.set(0, 0.42, -facing * 0.021); if (facing > 0) screen.rotation.y = Math.PI; mon.add(screen);
    }
    box(g, 0.42, 0.02, 0.14, mat('#1a1d28'), 0, 0.785, -facing * 0.12, false);
    box(g, 0.08, 0.02, 0.12, mat('#1a1d28'), 0.32, 0.785, -facing * 0.12, false);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 10), mat(sc)); mug.position.set(w / 2 - 0.18, 0.82, -facing * 0.12); g.add(mug);
    // đèn bàn
    const lampX = -w / 2 + 0.18;
    box(g, 0.14, 0.02, 0.14, mat('#1a1d28'), lampX, 0.785, facing * 0.2, false);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), mat('#1a1d28')); arm.position.set(lampX, 0.99, facing * 0.2); arm.rotation.x = -facing * 0.35; g.add(arm);
    const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 12, 1, true), mat('#ffb86b', { emissive: '#ffcf8a', emissiveIntensity: 0.9, side: THREE.DoubleSide }));
    shadeM.position.set(lampX, 1.2, facing * 0.12); g.add(shadeM);
    // giấy tờ, cây nhỏ
    box(g, 0.24, 0.015, 0.32, mat('#f8f8f4'), w / 2 - 0.42, 0.78, facing * 0.12, false);
    if (n % 2 === 0) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 10), mat('#d9d3c7')); pot.position.set(w / 2 - 0.12, 0.83, facing * 0.26); g.add(pot);
      const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mat('#3a9a63', { flatShading: true })); lf.position.set(w / 2 - 0.12, 0.95, facing * 0.26); g.add(lf);
    }
    if (d.big) {
      box(g, 0.34, 0.02, 0.24, mat('#c8ccd4', { metalness: 0.6 }), -0.5, 0.79, -facing * 0.15, false);
      const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), basic('#ffffff', { map: textTexture('GIÁM ĐỐC', { color: '#ffd58a', size: 60, bg: '#1a1d26', w: 512, h: 100 }) }));
      nameplate.position.set(0.5, 0.86, facing * 0.42); if (facing < 0) nameplate.rotation.y = Math.PI; g.add(nameplate);
    }
    n++;
    const seat = seatOf(slot);
    chair(s, seat.x, seat.z, seat.rot, mat(d.big ? '#1c1c22' : ['#2b3044', '#36405e', '#3b2f4f'][n % 3]), d.big);
  }
}

export function chair(s, x, z, rot, m, big) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; s.add(g);
  box(g, big ? 0.62 : 0.5, 0.09, 0.5, m, 0, 0.46, 0);
  box(g, big ? 0.62 : 0.5, big ? 0.8 : 0.58, 0.07, m, 0, big ? 0.9 : 0.8, -0.25);
  const metal = mat('#15171e', { metalness: 0.6, roughness: 0.4 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), metal); post.position.y = 0.22; g.add(post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = new THREE.Mesh(BOX, metal); leg.scale.set(0.04, 0.03, 0.28); leg.position.set(Math.sin(a) * 0.13, 0.04, Math.cos(a) * 0.13); leg.rotation.y = a; g.add(leg);
  }
  if (big) { for (const sx of [-1, 1]) box(g, 0.06, 0.06, 0.4, m, sx * 0.31, 0.68, 0, false); }
  return g;
}

// ───────────────────────── phòng họp, pantry ─────────────────────────
function rooms(s) {
  const mt = MEETING_TABLE;
  box(s, mt.w, 0.07, mt.d, mat('#5a3a28', { roughness: 0.35 }), mt.x, 0.74, mt.z);
  box(s, mt.w - 1.2, 0.68, 0.4, mat('#2a2f40'), mt.x, 0.36, mt.z);
  for (const st of MEETING_SEATS) chair(s, st.x, st.z, st.rot, mat('#e8e2d6'));
  for (let i = 0; i < 4; i++) {
    box(s, 0.3, 0.01, 0.22, mat('#f8f8f4'), mt.x - 1.8 + i * 1.2, 0.78, mt.z + (i % 2 ? 0.4 : -0.4), false);
  }
  const tv = new THREE.Group(); tv.position.set(19 - 0.14, 1.6, 3.6); tv.rotation.y = -Math.PI / 2; s.add(tv);
  box(tv, 2.6, 1.45, 0.07, mat('#0b0d14'), 0, 0, 0);
  const tvTex = canvasTex(512, 288, (c, w, h) => {
    c.fillStyle = '#0d1424'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7fd3ff'; c.font = '700 26px "Be Vietnam Pro"'; c.fillText('DASHBOARD CHIẾN DỊCH', 24, 44);
    const vals = [40, 70, 55, 90, 120, 100, 150];
    vals.forEach((v, i) => { const gr = c.createLinearGradient(0, h, 0, h - v); gr.addColorStop(0, '#7fd3ff'); gr.addColorStop(1, '#ff7ac8'); c.fillStyle = gr; c.fillRect(40 + i * 62, h - 30 - v, 40, v); });
  });
  const tvs = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.35), basic('#ffffff', { map: tvTex })); tvs.position.z = 0.04; tv.add(tvs);
  // pantry: quầy bếp, máy pha cà phê, tủ lạnh, lò vi sóng, bàn đứng
  const pc = PANTRY.counter;
  box(s, pc.w, 0.92, pc.d, mat('#f1ede6'), pc.x, 0.46, pc.z);
  box(s, pc.w + 0.04, 0.05, pc.d + 0.06, mat('#2b2e38', { roughness: 0.3 }), pc.x, 0.95, pc.z);
  for (let i = 0; i < 8; i++) box(s, 0.9, 0.82, 0.02, mat('#e3ddd2'), pc.x - pc.w / 2 + 0.55 + i * 1.0, 0.45, pc.z + pc.d / 2 + 0.01, false);
  box(s, 0.5, 0.55, 0.42, mat('#111', { metalness: 0.6, roughness: 0.3 }), 31.5, 1.25, 0.65);
  box(s, 0.18, 0.05, 0.01, basic('#ffb86b'), 31.5, 1.38, 0.87, false);
  box(s, 0.55, 0.32, 0.38, mat('#d9dde6', { metalness: 0.4 }), 33.6, 1.14, 0.62);
  box(s, 0.32, 0.22, 0.01, mat('#111', { emissive: '#6bffc8', emissiveIntensity: 0.3 }), 33.55, 1.14, 0.82, false);
  box(s, 0.8, 1.95, 0.7, mat('#d9dde6', { metalness: 0.35, roughness: 0.3 }), 35.4, 0.98, 0.62);
  box(s, 0.03, 0.6, 0.03, mat('#888'), 35.1, 1.3, 0.99, false);
  for (let i = 0; i < 5; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 10), mat(['#ff7ac8', '#7fd3ff', '#ffb86b', '#f4efe6', '#6bffc8'][i]));
    cup.position.set(28.6 + i * 0.16, 1.02, 0.55); s.add(cup);
  }
  const ht = new THREE.Mesh(new THREE.CylinderGeometry(PANTRY.table.r, PANTRY.table.r, 0.05, 28), mat('#f1ede6', { roughness: 0.3 }));
  ht.position.set(PANTRY.table.x, 1.05, PANTRY.table.z); ht.castShadow = true; s.add(ht);
  const htl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 1.05, 12), mat('#2a2f40')); htl.position.set(PANTRY.table.x, 0.52, PANTRY.table.z); s.add(htl);
  // lounge: sofa lớn + bàn trà
  const so = LOUNGE.sofa, sm = mat('#d35fa6', { roughness: 0.95 });
  box(s, so.w, 0.42, so.d, sm, so.x, 0.24, so.z);
  box(s, so.w, 0.55, 0.25, sm, so.x, 0.68, so.z + 0.38);
  for (const sx of [-1, 1]) box(s, 0.22, 0.58, so.d, sm, so.x + sx * (so.w / 2 - 0.11), 0.42, so.z);
  for (let i = 0; i < 3; i++) box(s, so.w / 3 - 0.12, 0.12, so.d - 0.35, mat('#e77bbd', { roughness: 1 }), so.x - so.w / 3 + i * (so.w / 3), 0.5, so.z - 0.05, false);
  box(s, LOUNGE.table.w, 0.06, LOUNGE.table.d, mat('#5a3a28'), LOUNGE.table.x, 0.42, LOUNGE.table.z);
  box(s, LOUNGE.table.w - 0.2, 0.38, LOUNGE.table.d - 0.2, mat('#2a2f40'), LOUNGE.table.x, 0.2, LOUNGE.table.z);
  for (const c of CABINETS) {
    box(s, c.w, 1.3, c.d, mat('#5b6273'), c.x, 0.65, c.z);
    for (let i = 0; i < 3; i++) box(s, c.w + 0.02, 0.02, c.d - 0.1, mat('#2a2f40'), c.x, 0.3 + i * 0.42, c.z, false);
  }
}

// ───────────────────────── đồ nội thất theo danh sách ─────────────────────────
const BOOK = ['#c0392b', '#2f6fd1', '#f1c40f', '#2fa38a', '#8e44ad', '#e67e22', '#ecf0f1', '#34495e'];
const builders = {
  bookshelf(g, f) {
    const wood = mat('#6e4630');
    const h = 2.1;
    box(g, f.w, h, 0.05, wood, 0, h / 2, -f.d / 2 + 0.025);
    for (const sx of [-1, 1]) box(g, 0.05, h, f.d, wood, sx * (f.w / 2 - 0.025), h / 2, 0);
    for (let i = 0; i <= 4; i++) box(g, f.w, 0.04, f.d, wood, 0, 0.04 + i * 0.5, 0, false);
    for (let i = 0; i < 4; i++) {
      let x = -f.w / 2 + 0.08;
      while (x < f.w / 2 - 0.12) {
        const bw = 0.05 + rnd() * 0.05, bh = 0.28 + rnd() * 0.14;
        if (rnd() < 0.12) { x += 0.15; continue; }
        box(g, bw, bh, f.d * 0.7, mat(BOOK[Math.floor(rnd() * BOOK.length)]), x + bw / 2, 0.06 + i * 0.5 + bh / 2, 0.02, false);
        x += bw + 0.008;
      }
    }
  },
  sofa(g, f) {
    const m = mat(f.color || '#4a5a7a', { roughness: 0.95 });
    box(g, f.w, 0.4, f.d, m, 0, 0.24, 0);
    box(g, f.w, 0.5, 0.22, m, 0, 0.66, -f.d / 2 + 0.11);
    for (const sx of [-1, 1]) box(g, 0.2, 0.55, f.d, m, sx * (f.w / 2 - 0.1), 0.4, 0);
    box(g, 0.4, 0.3, 0.12, mat('#ffd58a'), -f.w / 4, 0.62, -f.d / 2 + 0.3, false);
  },
  coffeetable(g, f) {
    box(g, f.w, 0.05, f.d, mat('#5a3a28', { roughness: 0.35 }), 0, 0.42, 0);
    for (const sx of [-1, 1]) box(g, 0.05, 0.4, f.d - 0.1, mat('#2a2f40'), sx * (f.w / 2 - 0.08), 0.2, 0, false);
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.18, 10), mat('#f4efe6')); vase.position.set(0.2, 0.54, 0); g.add(vase);
  },
  floorlamp(g) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), mat('#1a1d28')); pole.position.y = 0.8; g.add(pole);
    box(g, 0.32, 0.03, 0.32, mat('#1a1d28'), 0, 0.02, 0, false);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 16, 1, true), mat('#f4e3c4', { emissive: '#ffcf8a', emissiveIntensity: 1.1, side: THREE.DoubleSide }));
    sh.position.y = 1.65; g.add(sh);
  },
  rug(g, f) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.d), mat('#ffffff', { map: rugTex(f.color), roughness: 1 }));
    r.rotation.x = -Math.PI / 2; r.position.y = 0.008; r.receiveShadow = true; g.add(r);
  },
  credenza(g, f) {
    box(g, f.w, 0.75, f.d, mat('#5a3a28'), 0, 0.375, 0);
    for (let i = 0; i < 3; i++) box(g, f.w / 3 - 0.06, 0.6, 0.02, mat('#6e4630'), -f.w / 3 + i * (f.w / 3), 0.38, f.d / 2 + 0.01, false);
    const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), mat('#3a9a63', { flatShading: true })); pl.position.set(f.w / 2 - 0.3, 0.95, 0); g.add(pl);
  },
  watercooler(g) {
    box(g, 0.4, 0.95, 0.4, mat('#e8e8ee'), 0, 0.475, 0);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 16), mat('#7fc8ff', { transparent: true, opacity: 0.6, roughness: 0.1 }));
    b.position.y = 1.17; g.add(b);
  },
  roundtable(g) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), mat('#f1ede6')); top.position.y = 0.74; top.castShadow = true; g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 0.72, 10), mat('#2a2f40')); leg.position.y = 0.36; g.add(leg);
    for (const sx of [-1, 1]) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), mat('#ffb86b')); st.position.set(sx * 0.62, 0.48, 0); g.add(st);
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.12, 0.46, 8), mat('#2a2f40')); sl.position.set(sx * 0.62, 0.23, 0); g.add(sl);
    }
  },
  whiteboard(g, f) {
    for (const sx of [-1, 1]) box(g, 0.05, 1.7, 0.05, mat('#888'), sx * (f.w / 2 - 0.05), 0.85, 0, false);
    box(g, f.w, 1.0, 0.04, mat('#f7f7f4', { roughness: 0.3 }), 0, 1.25, 0);
    const t = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#f7f7f4'; c.fillRect(0, 0, w, h);
      c.font = '700 18px "Be Vietnam Pro"'; c.fillStyle = '#d0335f'; c.fillText('FUNNEL ADS', 14, 26);
      c.strokeStyle = '#2f6fd1'; c.lineWidth = 3;
      [[20, 200], [40, 160], [60, 120], [80, 80]].forEach(([y, wd]) => c.strokeRect((w - wd) / 2, 30 + y, wd, 16));
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(f.w - 0.1, 0.9), mat('#ffffff', { map: t })); p.position.set(0, 1.25, 0.025); g.add(p);
  },
  rack(g, f) {
    box(g, f.w, 1.9, f.d, mat('#14161d', { metalness: 0.5 }), 0, 0.95, 0);
    g.userData.leds = [];
    for (let i = 0; i < 7; i++) {
      box(g, f.w - 0.08, 0.2, 0.02, mat('#22252f'), 0, 0.3 + i * 0.23, f.d / 2 + 0.01, false);
      for (let k = 0; k < 3; k++) {
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), basic(['#6bffc8', '#7fd3ff', '#ffb86b'][k]));
        led.position.set(-f.w / 2 + 0.12 + k * 0.06, 0.3 + i * 0.23, f.d / 2 + 0.03); g.add(led); g.userData.leds.push(led);
      }
    }
  },
  printer(g, f) {
    box(g, f.w, 0.75, f.d, mat('#d9dde6'), 0, 0.375, 0);
    box(g, f.w - 0.1, 0.06, f.d - 0.15, mat('#2a2f40'), 0, 0.78, 0, false);
    box(g, 0.3, 0.02, 0.22, mat('#ffffff'), 0, 0.81, 0.05, false);
  },
  studio(g) {
    // chân máy quay + đèn softbox cho Video Editor
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), mat('#1a1d28'));
      leg.position.set(Math.sin(a) * 0.22, 0.72, Math.cos(a) * 0.22); leg.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); g.add(leg);
    }
    box(g, 0.24, 0.18, 0.34, mat('#111'), 0, 1.5, 0);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12), mat('#222')); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.5, 0.24); g.add(lens);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6), mat('#1a1d28')); pole.position.set(0.55, 0.9, -0.3); g.add(pole);
    box(g, 0.6, 0.6, 0.1, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1.2 }), 0.55, 1.85, -0.3, false);
  },
  safe(g, f) {
    box(g, f.w, 0.8, f.d, mat('#3a3f4c', { metalness: 0.5 }), 0, 0.4, 0);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), mat('#c8ccd4', { metalness: 0.8 })); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.5, f.d / 2 + 0.02); g.add(dial);
  },
  pooltable(g, f) {
    box(g, f.w, 0.12, f.d, mat('#5a3a28'), 0, 0.78, 0);
    box(g, f.w - 0.2, 0.02, f.d - 0.2, mat('#1e7a46', { roughness: 1 }), 0, 0.85, 0, false);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.14, 0.72, 0.14, mat('#3d2618'), sx * (f.w / 2 - 0.15), 0.36, sz * (f.d / 2 - 0.15), false);
    const cols = ['#f4efe6', '#f1c40f', '#c0392b', '#2f6fd1', '#111', '#e67e22', '#8e44ad'];
    cols.forEach((c, i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(c, { roughness: 0.2 }));
      b.position.set(i === 0 ? -0.7 : 0.3 + (i % 3) * 0.1, 0.91, i === 0 ? 0 : ((i % 2) - 0.5) * 0.12 * Math.ceil(i / 2)); g.add(b);
    });
    const cue = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.4, 6), mat('#c8a273')); cue.rotation.z = Math.PI / 2; cue.position.set(0, 0.93, 0.5); g.add(cue);
  },
  beanbag(g, f) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), mat(f.color || '#ffb86b', { roughness: 1 }));
    b.scale.set(1, 0.6, 1); b.position.y = 0.27; b.castShadow = true; g.add(b);
  },
};

function furniture(s) {
  const leds = [];
  for (const f of FURNITURE) {
    const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = f.rot || 0; s.add(g);
    builders[f.type](g, f);
    if (g.userData.leds) leds.push(...g.userData.leds);
  }
  return leds;
}

function plants(s) {
  const pot = mat('#e8e2d6'), pot2 = mat('#3a3f4c');
  const leafA = mat('#2f9e6a', { roughness: 0.9, flatShading: true }), leafB = mat('#46c088', { roughness: 0.9, flatShading: true });
  PLANTS.forEach(([x, z], i) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.46, 14), i % 2 ? pot : pot2); p.position.set(x, 0.23, z); p.castShadow = true; s.add(p);
    if (i % 3 === 0) {
      // lưỡi hổ
      for (let k = 0; k < 6; k++) {
        const l = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.9 + rnd() * 0.4, 4), k % 2 ? leafA : leafB);
        l.position.set(x + Math.sin(k) * 0.08, 0.9, z + Math.cos(k) * 0.08); l.rotation.set(Math.cos(k) * 0.2, 0, Math.sin(k) * 0.2); l.castShadow = true; s.add(l);
      }
    } else {
      for (let k = 0; k < 5; k++) {
        const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 + rnd() * 0.1, 0), k % 2 ? leafA : leafB);
        l.scale.set(1.2, 0.7, 1.2);
        l.position.set(x + Math.sin(k * 1.3) * 0.18, 0.62 + k * 0.17, z + Math.cos(k * 1.3) * 0.18); l.castShadow = true; s.add(l);
      }
    }
  });
}

function pendants(s) {
  const cord = mat('#111');
  const shadeM = mat('#1c1f28', { metalness: 0.4, roughness: 0.4 });
  const glow = mat('#fff1d0', { emissive: '#ffd58a', emissiveIntensity: 2 });
  for (const [x, z, lit] of PENDANTS) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 4), cord); c.position.set(x, 3.0, z); s.add(c);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.26, 16, 1, true), shadeM); sh.position.set(x, 2.5, z); s.add(sh);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), glow); bulb.position.set(x, 2.38, z); s.add(bulb);
    if (lit) { const l = new THREE.PointLight('#ffd9a0', 9, 8, 2); l.position.set(x, 2.25, z); s.add(l); }
  }
}

/** Dựng toàn bộ nội thất; trả về update(t, camDirX, camDirZ) để hạ/nâng tường và nháy đèn LED. */
export function buildInterior(scene) {
  floors(scene);
  const { cut, decor } = walls(scene);
  wallDecor(decor);
  desks(scene);
  rooms(scene);
  const leds = furniture(scene);
  plants(scene);
  pendants(scene);
  return {
    update(t, dx, dz, dt) {
      for (const c of cut) {
        const facing = c.n[0] * dx + c.n[1] * dz > 0.25;
        const goal = facing ? c.low : c.full;
        c.h += (goal - c.h) * Math.min(1, dt * 6);
        c.wall.scale.y = c.h; c.wall.position.y = c.h / 2;
        c.top.position.y = c.h;
        const tall = c.h > 2.6;
        c.win.visible = tall; c.dec.visible = tall;
      }
      leds.forEach((l, i) => { l.visible = Math.sin(t * (3 + (i % 5)) + i) > -0.3; });
    },
  };
}
