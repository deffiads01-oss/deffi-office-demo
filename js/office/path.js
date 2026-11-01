// Tìm đường A* trên lưới + làm mượt đường đi (string pulling) để nhân vật không đi xuyên bàn ghế, tường.
import { W, D, obstacles } from './layout.js';

const CELL = 0.25, RADIUS = 0.32;
const GW = Math.ceil(W / CELL), GD = Math.ceil(D / CELL);
const blocked = new Uint8Array(GW * GD);

for (const o of obstacles()) {
  const i1 = Math.max(0, Math.floor((o.x1 - RADIUS) / CELL)), i2 = Math.min(GW - 1, Math.floor((o.x2 + RADIUS) / CELL));
  const j1 = Math.max(0, Math.floor((o.z1 - RADIUS) / CELL)), j2 = Math.min(GD - 1, Math.floor((o.z2 + RADIUS) / CELL));
  for (let j = j1; j <= j2; j++) for (let i = i1; i <= i2; i++) blocked[j * GW + i] = 1;
}

const toCell = (x, z) => [Math.min(GW - 1, Math.max(0, Math.floor(x / CELL))), Math.min(GD - 1, Math.max(0, Math.floor(z / CELL)))];
const center = (i, j) => ({ x: (i + 0.5) * CELL, z: (j + 0.5) * CELL });
const free = (i, j) => i >= 0 && j >= 0 && i < GW && j < GD && !blocked[j * GW + i];

export function isFree(x, z) { const [i, j] = toCell(x, z); return free(i, j); }

function nearestFree(i, j) {
  if (free(i, j)) return [i, j];
  for (let r = 1; r < 24; r++) {
    let best = null, bd = 1e9;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !free(i + di, j + dj)) continue;
      const d = di * di + dj * dj;
      if (d < bd) { bd = d; best = [i + di, j + dj]; }
    }
    if (best) return best;
  }
  return [i, j];
}

// Kiểm tra đoạn thẳng có đi qua ô bị chặn không
function lineFree(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), steps = Math.ceil(len / (CELL * 0.5));
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (!isFree(a.x + dx * t, a.z + dz * t)) return false;
  }
  return true;
}

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

const G = new Float32Array(GW * GD), FROM = new Int32Array(GW * GD), STAMP = new Uint32Array(GW * GD);
let stamp = 0;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

/** Trả về mảng điểm {x,z} từ vị trí hiện tại đến đích; điểm cuối là đích chính xác (ví dụ ghế ngồi). */
export function findPath(from, to) {
  const [si, sj] = nearestFree(...toCell(from.x, from.z));
  const [ti, tj] = nearestFree(...toCell(to.x, to.z));
  stamp++;
  const start = sj * GW + si, goal = tj * GW + ti;
  const heap = new Heap();
  G[start] = 0; FROM[start] = -1; STAMP[start] = stamp;
  heap.push({ k: start, f: 0 });
  let found = start === goal;
  while (heap.size && !found) {
    const { k } = heap.pop();
    const i = k % GW, j = (k / GW) | 0;
    for (const [di, dj, c] of DIRS) {
      const ni = i + di, nj = j + dj;
      if (!free(ni, nj)) continue;
      if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue; // không cắt góc
      const nk = nj * GW + ni, g = G[k] + c;
      if (STAMP[nk] === stamp && G[nk] <= g) continue;
      STAMP[nk] = stamp; G[nk] = g; FROM[nk] = k;
      if (nk === goal) { found = true; break; }
      heap.push({ k: nk, f: g + Math.hypot(ti - ni, tj - nj) });
    }
  }
  if (!found) return [{ x: to.x, z: to.z }];
  const cells = [];
  for (let k = goal; k !== -1; k = FROM[k]) cells.push(center(k % GW, (k / GW) | 0));
  cells.reverse();
  // String pulling: bỏ các điểm trung gian khi có đường thẳng không vướng
  const pts = [{ x: from.x, z: from.z }];
  let anchor = isFree(from.x, from.z) ? pts[0] : cells[0];
  if (anchor !== pts[0]) pts.push(anchor);
  for (let n = 1; n < cells.length; n++) {
    if (!lineFree(anchor, cells[n])) { anchor = cells[n - 1]; pts.push(anchor); }
  }
  const last = cells[cells.length - 1];
  if (pts[pts.length - 1] !== last) pts.push(last);
  pts.push({ x: to.x, z: to.z });
  // bỏ điểm trùng
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) > 0.05).slice(1);
}
