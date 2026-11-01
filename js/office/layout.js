// Mặt bằng văn phòng DEFFI ADS VIỆT (đơn vị: mét). x: 0→36 (trái→phải), z: 0→24 (trên→dưới).
export const W = 36, D = 24;

// Tường: [x1, z1, x2, z2, kiểu] — 'outer' (tường bao cao, tự hạ khi quay về phía camera) | 'glass' (vách kính)
export const WALL_H = 3.2;
export const WALLS = [
  [0, 0, 36, 0, 'outer'], [0, 24, 16.6, 24, 'outer'], [19.4, 24, 36, 24, 'outer'], [0, 0, 0, 24, 'outer'], [36, 0, 36, 24, 'outer'],
  // Phòng giám đốc x0–9, z0–8, cửa ở tường nam x 6.4–8
  [9, 0, 9, 8, 'glass'], [0, 8, 6.4, 8, 'glass'], [8, 8, 9, 8, 'glass'],
  // Phòng họp x9–19, z0–8, cửa x 10.2–11.8 và x 16.4–18
  [19, 0, 19, 8, 'glass'], [9, 8, 10.2, 8, 'glass'], [11.8, 8, 16.4, 8, 'glass'], [18, 8, 19, 8, 'glass'],
  // Pantry x27–36, z0–8, cửa x 27.8–30.2
  [27, 0, 27, 8, 'glass'], [27, 8, 27.8, 8, 'glass'], [30.2, 8, 36, 8, 'glass'],
];

export const ROOMS = [
  { id: 'bgd', name: 'PHÒNG GIÁM ĐỐC', x1: 0, z1: 0, x2: 9, z2: 8, color: '#ff7ac8' },
  { id: 'meeting', name: 'PHÒNG HỌP', x1: 9, z1: 0, x2: 19, z2: 8, color: '#7fd3ff' },
  { id: 'reception', name: 'LỄ TÂN · TRỢ LÝ', x1: 19, z1: 0, x2: 27, z2: 8, color: '#ff7ac8' },
  { id: 'pantry', name: 'PANTRY · CÀ PHÊ', x1: 27, z1: 0, x2: 36, z2: 8, color: '#ffb86b' },
  { id: 'mkt', name: 'MARKETING ADS', x1: 1, z1: 11.5, x2: 13, z2: 18, color: '#7fd3ff' },
  { id: 'tech', name: 'KỸ THUẬT', x1: 13.6, z1: 11.5, x2: 22.4, z2: 18, color: '#6bffc8' },
  { id: 'design', name: 'DESIGN & EDIT', x1: 23, z1: 11.5, x2: 33.5, z2: 18, color: '#ffb86b' },
  { id: 'acc', name: 'KẾ TOÁN', x1: 1, z1: 19, x2: 10, z2: 23.5, color: '#c3a6ff' },
  { id: 'lounge', name: 'LOUNGE', x1: 23, z1: 19, x2: 35, z2: 23.5, color: '#6bffc8' },
];

// Bàn làm việc: face = hướng người ngồi nhìn ('n' nhìn lên -z, 's' nhìn xuống +z)
export const DESKS = {
  'bgd-director': { x: 4.5, z: 4.2, face: 's', big: true },
  'bgd-assistant': { x: 23, z: 3.6, face: 's' },
  'mkt-1': { x: 3.5, z: 14, face: 'n' },
  'mkt-2': { x: 7, z: 14, face: 'n' },
  'mkt-3': { x: 10.5, z: 14, face: 'n' },
  'tech-1': { x: 16.2, z: 14, face: 'n' },
  'tech-2': { x: 19.8, z: 14, face: 'n' },
  'design-1': { x: 25.6, z: 14, face: 'n' },
  'design-2': { x: 29.2, z: 14, face: 'n' },
  'acc-1': { x: 4.5, z: 20.6, face: 'n' },
};

export function seatOf(slot) {
  const d = DESKS[slot];
  const dz = d.face === 'n' ? 0.78 : -0.78;
  return { x: d.x, z: d.z + dz, rot: d.face === 'n' ? Math.PI : 0 };
}

// Điểm đứng khi đồng nghiệp ghé bàn trao đổi
export function visitOf(slot, side = 1) {
  const d = DESKS[slot];
  const dz = d.face === 'n' ? 1.35 : -1.35;
  const x = d.x + side * 1.05, z = d.z + dz;
  const s = seatOf(slot);
  return { x, z, lookAt: { x: s.x, z: s.z } };
}

// Phòng họp: bàn dài + 8 ghế
export const MEETING_TABLE = { x: 14, z: 3.6, w: 5.2, d: 1.7 };
export const MEETING_SEATS = [
  { x: 12.2, z: 2.25, rot: 0 }, { x: 14, z: 2.25, rot: 0 }, { x: 15.8, z: 2.25, rot: 0 },
  { x: 12.2, z: 4.95, rot: Math.PI }, { x: 14, z: 4.95, rot: Math.PI }, { x: 15.8, z: 4.95, rot: Math.PI },
  { x: 10.75, z: 3.6, rot: Math.PI / 2 }, { x: 17.25, z: 3.6, rot: -Math.PI / 2 },
];

export const PANTRY = {
  counter: { x: 31.5, z: 0.75, w: 8, d: 0.9 },
  table: { x: 31.5, z: 4.6, r: 0.55 },
  spots: [
    { x: 29.2, z: 1.75, lookAt: { x: 29.2, z: 0 } }, { x: 33.6, z: 1.75, lookAt: { x: 33.6, z: 0 } },
    { x: 30.6, z: 4.6, lookAt: { x: 31.5, z: 4.6 } }, { x: 32.4, z: 4.6, lookAt: { x: 31.5, z: 4.6 } },
    { x: 31.5, z: 3.7, lookAt: { x: 31.5, z: 4.6 } }, { x: 31.5, z: 5.5, lookAt: { x: 31.5, z: 4.6 } },
  ],
};

export const LOUNGE = {
  sofa: { x: 29, z: 22.6, w: 4.4, d: 1 },
  table: { x: 29, z: 21, w: 1.8, d: 0.8 },
  spots: [
    { x: 26.4, z: 21, lookAt: { x: 29, z: 21 } }, { x: 31.6, z: 21, lookAt: { x: 29, z: 21 } },
    { x: 28.2, z: 19.8, lookAt: { x: 29, z: 21 } },
  ],
};

// Điểm đi dạo: cửa sổ, cây xanh, bảng tin
export const WANDER = [
  { x: 2, z: 10, lookAt: { x: 0, z: 10 } }, { x: 21, z: 10, lookAt: { x: 21, z: 12 } },
  { x: 34.5, z: 10.5, lookAt: { x: 36, z: 10.5 } }, { x: 34.5, z: 16, lookAt: { x: 36, z: 16 } },
  { x: 14, z: 21.5, lookAt: { x: 16.5, z: 21.4 } }, { x: 19, z: 21.5, lookAt: { x: 16.5, z: 21.4 } },
  { x: 23, z: 6.5, lookAt: { x: 23, z: 8 } },
];

export const PLANTS = [
  [0.7, 0.7], [8.3, 0.7], [19.6, 0.7], [26.4, 0.7], [26.4, 7.3], [0.7, 23.3], [12.3, 23.3], [22.6, 23.3],
  [35.3, 23.3], [35.3, 8.7], [12.7, 11.8], [22.7, 11.8], [33.8, 11.8], [9.6, 19.3],
];

export const CABINETS = [{ x: 8.8, z: 21.8, w: 0.6, d: 1.6 }];

// Nội thất: w = bề ngang mặt trước, d = chiều sâu (trước khi xoay), rot = hướng mặt trước (0 → +z).
// walk: true → không chặn đường (thảm, đồ treo tường).
const R90 = Math.PI / 2;
export const FURNITURE = [
  // Phòng giám đốc
  { type: 'bookshelf', x: 0.4, z: 3.6, w: 2.6, d: 0.45, rot: R90 },
  { type: 'sofa', x: 7.75, z: 2.5, w: 2.0, d: 0.85, rot: -R90, color: '#5a3550' },
  { type: 'coffeetable', x: 6.6, z: 2.5, w: 1.0, d: 0.6, rot: R90 },
  { type: 'floorlamp', x: 8.4, z: 7.3, w: 0.4, d: 0.4 },
  { type: 'rug', x: 4.5, z: 4.6, w: 4.6, d: 3.6, color: '#6b2d4f', walk: true },
  // Phòng họp
  { type: 'credenza', x: 14, z: 0.45, w: 3.2, d: 0.5, rot: 0 },
  // Lễ tân
  { type: 'sofa', x: 20.2, z: 5.4, w: 2.2, d: 0.85, rot: R90, color: '#2f6f8f' },
  { type: 'watercooler', x: 26.3, z: 3.8, w: 0.45, d: 0.45 },
  { type: 'rug', x: 23, z: 5.6, w: 3.4, d: 2.2, color: '#22465c', walk: true },
  // Pantry
  { type: 'roundtable', x: 34.3, z: 6.3, w: 1.5, d: 1.1 },
  // Khu làm việc
  { type: 'whiteboard', x: 7, z: 11.95, w: 2.2, d: 0.3, rot: 0 },
  { type: 'rack', x: 14.25, z: 12.5, w: 0.7, d: 0.9, rot: 0 },
  { type: 'printer', x: 12.3, z: 17.3, w: 0.7, d: 0.6, rot: -R90 },
  { type: 'studio', x: 32.7, z: 16.6, w: 1.0, d: 1.0, rot: -R90 },
  { type: 'safe', x: 2.2, z: 23.3, w: 0.7, d: 0.6, rot: Math.PI },
  // Giải trí
  { type: 'pooltable', x: 16.5, z: 21.4, w: 2.6, d: 1.4, rot: 0 },
  { type: 'bookshelf', x: 20.9, z: 23.5, w: 2.6, d: 0.45, rot: Math.PI },
  { type: 'beanbag', x: 24.6, z: 22.6, w: 0.9, d: 0.9, color: '#ffb86b' },
  { type: 'beanbag', x: 33.9, z: 22.6, w: 0.9, d: 0.9, color: '#7fd3ff' },
  { type: 'floorlamp', x: 35.3, z: 19.5, w: 0.4, d: 0.4 },
  { type: 'rug', x: 29, z: 21.6, w: 5.2, d: 3.2, color: '#3b2a55', walk: true },
];

// Đèn thả trần (một số có nguồn sáng thật)
export const PENDANTS = [
  [4.5, 4.2, 1], [14, 3.6, 1], [23, 3.4, 0], [31.5, 4.6, 1], [5.2, 14.2, 1], [10.5, 14.2, 0], [18, 14.2, 1],
  [27.4, 14.2, 1], [4.5, 20.8, 1], [16.5, 21.4, 1], [29, 21.2, 0],
];

export function footprint(f) {
  const turned = Math.abs(Math.sin(f.rot || 0)) > 0.5;
  return { w: turned ? f.d : f.w, d: turned ? f.w : f.d };
}

// Hình chữ nhật vật cản để dựng lưới tìm đường
export function obstacles() {
  const r = [];
  const box = (x, z, w, d) => r.push({ x1: x - w / 2, z1: z - d / 2, x2: x + w / 2, z2: z + d / 2 });
  for (const k in DESKS) {
    const d = DESKS[k];
    box(d.x, d.z, d.big ? 2.2 : 1.6, d.big ? 1 : 0.8);
  }
  box(MEETING_TABLE.x, MEETING_TABLE.z, MEETING_TABLE.w, MEETING_TABLE.d);
  box(PANTRY.counter.x, PANTRY.counter.z, PANTRY.counter.w, PANTRY.counter.d);
  box(PANTRY.table.x, PANTRY.table.z, PANTRY.table.r * 2, PANTRY.table.r * 2);
  box(LOUNGE.sofa.x, LOUNGE.sofa.z, LOUNGE.sofa.w, LOUNGE.sofa.d);
  box(LOUNGE.table.x, LOUNGE.table.z, LOUNGE.table.w, LOUNGE.table.d);
  for (const c of CABINETS) box(c.x, c.z, c.w, c.d);
  for (const f of FURNITURE) if (!f.walk) { const fp = footprint(f); box(f.x, f.z, fp.w, fp.d); }
  for (const [x, z] of PLANTS) box(x, z, 0.6, 0.6);
  for (const [x1, z1, x2, z2] of WALLS) {
    r.push({ x1: Math.min(x1, x2) - 0.08, z1: Math.min(z1, z2) - 0.08, x2: Math.max(x1, x2) + 0.08, z2: Math.max(z1, z2) + 0.08 });
  }
  return r;
}
