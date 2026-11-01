// Văn phòng 3D DEFFI ADS VIỆT: dựng cảnh, nhân vật tự hoạt động, camera, chọn nhân vật.
// Lưu ý: hoạt động của nhân vật là MÔ PHỎNG hành vi văn phòng; trạng thái công việc thật lấy từ API dự án.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { W, D, DESKS, seatOf, visitOf, MEETING_SEATS, PANTRY, LOUNGE, WANDER } from './layout.js';
import { buildInterior, logoTexture } from './interior.js';
import { findPath } from './path.js';
import { buildCity, CITY_BOUNDS } from './city.js';

export const STATES = {
  working: { label: 'Đang làm việc', icon: '💻', color: '#7fd3ff' },
  walking: { label: 'Đang di chuyển', icon: '🚶', color: '#e9ecf5' },
  talking: { label: 'Đang trao đổi', icon: '💬', color: '#ff7ac8' },
  meeting: { label: 'Đang họp', icon: '👥', color: '#c3a6ff' },
  resting: { label: 'Nghỉ ngơi', icon: '☕', color: '#ffb86b' },
  waiting: { label: 'Đang chờ', icon: '⏳', color: '#f5d76e' },
  reviewing: { label: 'Đang xem xét', icon: '📄', color: '#6bffc8' },
};

const SPEED = 1.35;
const SKINS = ['#f1c9a5', '#e8b98f', '#d9a57c', '#f4d2b4', '#c9946b'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...opts });
}

// ───────────────────────── nhân vật ─────────────────────────
function buildCharacter(emp) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shirt = mat(emp.avatar_color, { roughness: 0.6 });
  const pants = mat('#1b1f2c');
  const skin = mat(SKINS[emp.employee_id % SKINS.length], { roughness: 0.55 });
  const hairM = mat(emp.hair_color || '#2b1d14', { roughness: 0.9 });
  const shoe = mat('#0c0d12');

  const legs = [];
  for (const sx of [-0.11, 0.11]) {
    const hip = new THREE.Group(); hip.position.set(sx, 0.86, 0); body.add(hip);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), pants); thigh.position.y = -0.21; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.3, 4, 8), pants); shin.position.y = -0.2; knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.22), shoe); foot.position.set(0, -0.4, 0.04); knee.add(foot);
    legs.push({ hip, knee });
  }
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.36, 6, 12), shirt);
  torso.scale.set(1, 1, 0.72); torso.position.y = 1.16; body.add(torso);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10), skin); collar.position.y = 1.5; body.add(collar);
  const headPivot = new THREE.Group(); headPivot.position.y = 1.54; body.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), skin); head.position.y = 0.17; head.scale.set(1, 1.08, 1); headPivot.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.172, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  hair.position.set(0, 0.2, -0.012); hair.rotation.x = -0.25; headPivot.add(hair);
  for (const sx of [-0.055, 0.055]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat('#111')); eye.position.set(sx, 0.19, 0.145); headPivot.add(eye);
  }
  const arms = [];
  for (const sx of [-0.29, 0.29]) {
    const sh = new THREE.Group(); sh.position.set(sx, 1.42, 0); body.add(sh);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 4, 8), shirt); upper.position.y = -0.15; sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.31; sh.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.22, 4, 8), skin); fore.position.y = -0.14; elbow.add(fore);
    arms.push({ sh, elbow });
  }
  // Đạo cụ: cốc cà phê, tài liệu
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.1, 12), mat('#f4efe6'));
  cup.position.set(0, -0.3, 0.05); cup.visible = false; arms[1].elbow.add(cup);
  const doc = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.22), mat('#f6f7fb', { emissive: '#30343f' }));
  doc.position.set(0.29, -0.32, 0.12); doc.visible = false; arms[0].elbow.add(doc);
  // Vòng sáng dưới chân khi được chọn
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 40), new THREE.MeshBasicMaterial({ color: '#ff7ac8', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.visible = false; root.add(ring);
  // Vùng click
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.95; root.add(hit);
  root.traverse((o) => { if (o.isMesh && o !== ring && o !== hit) { o.castShadow = true; } });
  return { root, body, legs, arms, headPivot, cup, doc, ring, hit };
}

class Agent {
  constructor(office, emp) {
    this.office = office;
    this.emp = emp;
    this.parts = buildCharacter(emp);
    this.seat = seatOf(emp.desk_slot);
    this.pos = { x: this.seat.x, z: this.seat.z };
    this.rot = this.seat.rot;
    this.path = [];
    this.state = 'working';
    this.sitting = true;
    this.activity = { type: 'desk', state: 'working', label: 'Làm việc tại bàn', until: performance.now() / 1000 + rand(4, 25) };
    this.phase = Math.random() * 10;
    this.talkUntil = 0;
    this.talkWith = null;
    this.badge = 0;
    this.pulseUntil = 0;
    office.scene.add(this.parts.root);
    this.parts.hit.userData.agent = this;
    this.tag = document.createElement('button');
    this.tag.className = 'char-tag';
    this.tag.type = 'button';
    this.tag.addEventListener('click', () => office.select(this.emp.employee_id));
    office.tagLayer.appendChild(this.tag);
    this.renderTag(true);
  }

  get schedule() {
    return Object.assign({ focus: 0.6, social: 0.2, coffee: 0.12, walk: 0.08 }, this.emp.schedule || {});
  }

  displayState() {
    const t = this.office.clock;
    if (this.path.length) return 'walking';
    if (this.talkUntil > t && this.activity.type === 'desk') return 'talking';
    return this.activity.state;
  }

  label() {
    const st = this.displayState();
    if (this.aiLabel && this.aiUntil > this.office.clock && !this.path.length) return this.aiLabel;
    if (st === 'walking') return this.activity.goal || 'Đang di chuyển';
    if (st === 'talking' && this.talkWith) return 'Trao đổi với ' + this.talkWith.emp.full_name.split(' ').pop();
    return this.activity.label || STATES[st].label;
  }

  renderTag(force) {
    const st = this.displayState();
    const key = st + '|' + this.label() + '|' + this.badge + '|' + (this.pulseUntil > this.office.clock) + '|' + this.emp.online;
    if (!force && key === this.tagKey) return;
    this.tagKey = key;
    const s = STATES[st];
    const first = this.emp.full_name.split(' ').slice(-1)[0];
    this.tag.style.setProperty('--state', s.color);
    this.tag.classList.toggle('pulse', this.pulseUntil > this.office.clock);
    this.tag.innerHTML = '';
    const icon = document.createElement('span'); icon.className = 'ct-icon'; icon.textContent = s.icon;
    const name = document.createElement('span'); name.className = 'ct-name'; name.textContent = (this.emp.is_ai ? '🤖 ' : '') + first;
    const dot = document.createElement('i'); dot.className = 'ct-dot' + (this.emp.online ? ' on' : '');
    this.tag.append(dot, icon, name);
    if (this.badge > 0 || this.pulseUntil > this.office.clock) {
      const b = document.createElement('span'); b.className = 'ct-badge';
      b.textContent = this.badge > 0 ? (this.badge > 9 ? '9+' : String(this.badge)) : '✉';
      this.tag.appendChild(b);
    }
    this.tag.title = this.emp.full_name + ' — ' + this.label();
  }

  goTo(target, goal, onArrive) {
    this.sitting = false;
    this.path = findPath(this.pos, target);
    this.activity.goal = goal;
    this.arrive = onArrive;
  }

  // ── lựa chọn hoạt động kế tiếp (lịch cá nhân + công việc thật) ──
  planNext() {
    const o = this.office, t = o.clock, e = this.emp;
    const meeting = o.meetingFor(e.employee_id);
    if (meeting) return this.startMeeting(meeting);
    const atDesk = this.activity.type === 'desk';
    if (!atDesk) return this.startDesk();
    const s = this.schedule;
    let focus = s.focus * (e.active_projects > 0 ? 1.35 : 0.9);
    if (e.role === 'director' && e.reviews_waiting > 0) focus *= 1.3;
    const roll = Math.random() * (focus + s.social + s.coffee + s.walk);
    if (roll < focus) return this.startDesk();
    if (roll < focus + s.social) {
      const buddy = o.pickBuddy(this);
      if (buddy) return this.startVisit(buddy, rand(10, 20));
      return this.startDesk();
    }
    if (roll < focus + s.social + s.coffee) return this.startCoffee();
    return Math.random() < 0.5 ? this.startWander() : this.startLounge();
  }

  startDesk(forced) {
    const e = this.emp;
    let state = 'working', label = 'Làm việc tại bàn', dur = rand(30, 75);
    if (forced) ({ state, label, dur } = Object.assign({ state, label, dur }, forced));
    else if (e.role === 'director' && e.reviews_waiting > 0 && Math.random() < 0.55) {
      state = 'reviewing'; label = 'Xem bàn giao chờ duyệt';
    } else if (e.in_review > 0 && Math.random() < 0.3) {
      state = 'waiting'; label = 'Chờ giám đốc duyệt'; dur = rand(12, 25);
    } else if (e.waiting > 0 && Math.random() < 0.3) {
      state = 'waiting'; label = 'Chờ phối hợp'; dur = rand(12, 25);
    } else if (e.active_projects > 0) {
      label = 'Làm dự án (' + e.active_projects + ')';
    }
    this.office.release(this);
    this.activity = { type: 'desk', state, label, until: Infinity };
    const sit = () => { this.sitting = true; this.faceTo = this.seat.rot; this.activity.until = this.office.clock + dur; };
    if (Math.hypot(this.pos.x - this.seat.x, this.pos.z - this.seat.z) < 0.15) sit();
    else this.goTo(this.seat, 'Về bàn làm việc', sit);
  }

  startVisit(buddy, dur, label) {
    this.office.release(this);
    const side = Math.random() < 0.5 ? 1 : -1;
    const spot = visitOf(buddy.emp.desk_slot, side);
    const name = buddy.emp.full_name.split(' ').pop();
    this.activity = { type: 'visit', state: 'talking', label: label || 'Trao đổi với ' + name, until: Infinity, buddy };
    this.goTo(spot, 'Đến chỗ ' + name, () => {
      this.faceTo = Math.atan2(spot.lookAt.x - this.pos.x, spot.lookAt.z - this.pos.z);
      const t = this.office.clock;
      if (buddy.activity.type === 'desk' && !buddy.path.length) {
        buddy.talkUntil = t + dur; buddy.talkWith = this;
        this.activity.until = t + dur;
        this.talkWith = buddy;
      } else {
        // Đồng nghiệp không có ở bàn → đợi một chút rồi quay về
        this.activity.state = 'waiting'; this.activity.label = 'Đợi ' + name + ' quay lại';
        this.activity.until = t + rand(4, 8);
      }
    });
  }

  startCoffee() {
    const spot = this.office.reserve(this, 'pantry', PANTRY.spots);
    if (!spot) return this.startLounge();
    this.activity = { type: 'coffee', state: 'resting', label: 'Uống cà phê', until: Infinity };
    this.goTo(spot, 'Đi pha cà phê', () => {
      this.faceTo = Math.atan2(spot.lookAt.x - spot.x, spot.lookAt.z - spot.z);
      this.activity.until = this.office.clock + rand(16, 30);
    });
  }

  startLounge() {
    const spot = this.office.reserve(this, 'lounge', LOUNGE.spots);
    if (!spot) return this.startWander();
    this.activity = { type: 'lounge', state: 'resting', label: 'Nghỉ ngơi ở lounge', until: Infinity };
    this.goTo(spot, 'Ra lounge nghỉ', () => {
      this.faceTo = Math.atan2(spot.lookAt.x - spot.x, spot.lookAt.z - spot.z);
      this.activity.until = this.office.clock + rand(14, 24);
    });
  }

  startWander() {
    const spot = this.office.reserve(this, 'wander', WANDER);
    if (!spot) return this.startDesk();
    this.activity = { type: 'wander', state: 'resting', label: 'Thư giãn, ngắm cảnh', until: Infinity };
    this.goTo(spot, 'Đi lại cho đỡ mỏi', () => {
      this.faceTo = Math.atan2(spot.lookAt.x - spot.x, spot.lookAt.z - spot.z);
      this.activity.until = this.office.clock + rand(6, 12);
    });
  }

  startMeeting(m) {
    const seat = this.office.reserve(this, 'meeting', MEETING_SEATS);
    if (!seat) return this.startDesk();
    this.activity = { type: 'meeting', state: 'meeting', label: 'Họp: ' + m.title, until: Infinity, meetingId: m.id };
    this.goTo(seat, 'Đến phòng họp', () => {
      this.sitting = true; this.faceTo = seat.rot;
      this.activity.until = m.endsAt;
    });
  }

  interrupt(fn) {
    if (this.activity.type === 'meeting' && this.office.meetingFor(this.emp.employee_id)) return false;
    this.talkUntil = 0;
    fn();
    return true;
  }

  update(dt) {
    const t = this.office.clock;
    const p = this.parts;
    // di chuyển theo đường đi
    if (this.path.length) {
      const target = this.path[0];
      const dx = target.x - this.pos.x, dz = target.z - this.pos.z, dist = Math.hypot(dx, dz);
      const step = SPEED * dt;
      if (dist <= step) {
        this.pos.x = target.x; this.pos.z = target.z; this.path.shift();
        if (!this.path.length && this.arrive) { const a = this.arrive; this.arrive = null; a(); }
      } else {
        this.pos.x += (dx / dist) * step; this.pos.z += (dz / dist) * step;
        this.faceTo = Math.atan2(dx, dz);
      }
    } else if (t >= this.activity.until) {
      this.planNext();
    }
    if (this.talkWith && this.talkUntil < t && this.activity.type === 'desk') this.talkWith = null;
    // quay mặt mượt
    if (this.faceTo !== undefined) {
      let d = this.faceTo - this.rot;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.rot += d * Math.min(1, dt * 8);
    }
    if (this.talkUntil > t && this.talkWith && this.activity.type === 'desk' && this.sitting) {
      // xoay nhẹ về phía người đến trao đổi
      const w = this.talkWith.pos;
      const want = Math.atan2(w.x - this.pos.x, w.z - this.pos.z);
      let d = want - this.rot; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.rot += Math.max(-0.6, Math.min(0.6, d)) * Math.min(1, dt * 3) * 0.5;
    }
    p.root.position.set(this.pos.x, 0, this.pos.z);
    p.root.rotation.y = this.rot;
    this.animate(t, dt);
    this.renderTag();
  }

  animate(t, dt) {
    const p = this.parts, st = this.displayState(), ph = t * 7 + this.phase;
    const [lL, lR] = p.legs, [aL, aR] = p.arms;
    const lerp = (obj, key, v, k = 10) => { obj[key] += (v - obj[key]) * Math.min(1, dt * k); };
    p.cup.visible = st === 'resting' && this.activity.type === 'coffee';
    p.doc.visible = st === 'reviewing';
    let bodyY = 0, hipL = 0, hipR = 0, kneeL = 0, kneeR = 0, shL = 0, shR = 0, elL = 0, elR = 0, headX = 0, headY = 0;
    if (st === 'walking') {
      const s = Math.sin(ph * 1.25);
      hipL = s * 0.55; hipR = -s * 0.55; kneeL = Math.max(0, -s) * 0.7; kneeR = Math.max(0, s) * 0.7;
      shL = -s * 0.5; shR = s * 0.5; elL = -0.25; elR = -0.25; bodyY = Math.abs(Math.cos(ph * 1.25)) * 0.035;
    } else if (this.sitting) {
      bodyY = -0.37; hipL = hipR = -Math.PI / 2; kneeL = kneeR = Math.PI / 2;
      if (st === 'working') {
        shL = -0.75 + Math.sin(ph * 2.2) * 0.04; shR = -0.75 + Math.cos(ph * 2.6) * 0.04; elL = elR = -0.75;
        headX = 0.12;
      } else if (st === 'reviewing') {
        shL = shR = -0.9; elL = elR = -0.6; headX = 0.28 + Math.sin(t * 0.7) * 0.05;
      } else if (st === 'talking' || st === 'meeting') {
        const g = Math.sin(t * 2.3 + this.phase);
        shR = -0.5 + g * 0.25; elR = -0.9; shL = -0.35; elL = -0.6; headY = Math.sin(t * 0.8 + this.phase) * 0.25;
        headX = Math.sin(t * 3.1) * 0.05;
      } else if (st === 'waiting') {
        shL = shR = -0.3; elL = elR = -0.9; headY = Math.sin(t * 0.6 + this.phase) * 0.5;
      }
    } else {
      // đứng
      const breathe = Math.sin(t * 1.6 + this.phase) * 0.012;
      bodyY = breathe;
      if (st === 'talking') {
        const g = Math.sin(t * 2.4 + this.phase);
        shR = -0.45 + g * 0.3; elR = -0.8 + g * 0.2; shL = 0.05; headX = Math.sin(t * 3) * 0.06;
      } else if (st === 'resting' && this.activity.type === 'coffee') {
        const sip = (Math.sin(t * 0.9 + this.phase) + 1) / 2;
        shR = -0.35 - sip * 0.55; elR = -1.4 - sip * 0.6; headX = -sip * 0.12;
      } else if (st === 'waiting') {
        headY = Math.sin(t * 0.7 + this.phase) * 0.6; shL = shR = 0.08;
      } else {
        headY = Math.sin(t * 0.4 + this.phase) * 0.35; shL = 0.05; shR = 0.05;
      }
    }
    lerp(p.body.position, 'y', bodyY, 12);
    lerp(lL.hip.rotation, 'x', hipL); lerp(lR.hip.rotation, 'x', hipR);
    lerp(lL.knee.rotation, 'x', kneeL); lerp(lR.knee.rotation, 'x', kneeR);
    lerp(aL.sh.rotation, 'x', shL); lerp(aR.sh.rotation, 'x', shR);
    lerp(aL.elbow.rotation, 'x', elL); lerp(aR.elbow.rotation, 'x', elR);
    lerp(p.headPivot.rotation, 'x', headX, 4); lerp(p.headPivot.rotation, 'y', headY, 3);
  }
}

// ───────────────────────── camera isometric ─────────────────────────
// OrthographicCamera: radius = chiều cao khung nhìn (mét). Kéo chuột để xoay, chuột phải/Shift để kéo,
// cuộn để phóng to/thu nhỏ.
class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.target = new THREE.Vector3(W / 2, 0, D / 2);
    this.radius = 40; this.theta = Math.PI / 4; this.phi = 0.96; this.aspect = 1;
    this.goal = null; this.follow = null; this.thetaGoal = null;
    let mode = null, lx = 0, ly = 0, pinch = 0;
    const pointers = new Map();
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      mode = e.button === 2 || e.shiftKey ? 'pan' : 'rotate';
      lx = e.clientX; ly = e.clientY; this.moved = 0;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); mode = 'pinch'; }
    });
    dom.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.moved > 4) { this.goal = null; this.follow = null; this.thetaGoal = null; }
      if (mode === 'pinch' && pointers.size === 2) {
        const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.radius = THREE.MathUtils.clamp(this.radius * (pinch / d), 8, 130); pinch = d; return;
      }
      if (mode === 'rotate') {
        this.theta -= dx * 0.006; this.phi = THREE.MathUtils.clamp(this.phi - dy * 0.004, 0.45, 1.25);
      } else if (mode === 'pan') {
        const s = this.radius / Math.max(1, dom.clientHeight);
        const c = Math.cos(this.theta), sn = Math.sin(this.theta);
        this.target.x -= (dx * c + (dy * sn) / Math.cos(this.phi - 0.2)) * s;
        this.target.z -= (-dx * sn + (dy * c) / Math.cos(this.phi - 0.2)) * s;
        this.clampTarget();
      }
    });
    const up = (e) => { pointers.delete(e.pointerId); if (!pointers.size) mode = null; };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => {
      e.preventDefault(); this.goal = null;
      this.radius = THREE.MathUtils.clamp(this.radius * (1 + Math.sign(e.deltaY) * 0.1), 8, 130);
    }, { passive: false });
  }
  clampTarget() {
    this.target.x = THREE.MathUtils.clamp(this.target.x, CITY_BOUNDS.x1 + 15, CITY_BOUNDS.x2 - 15);
    this.target.z = THREE.MathUtils.clamp(this.target.z, CITY_BOUNDS.z1 + 15, CITY_BOUNDS.z2 - 15);
  }
  flyTo(x, z, radius = 14, follow = null) {
    this.goal = { x, z, radius }; this.follow = follow;
  }
  rotateStep(dir) {
    const base = this.thetaGoal ?? this.theta;
    this.thetaGoal = Math.round((base - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4 + dir * (Math.PI / 2);
  }
  update(dt) {
    if (this.follow) { this.goal = this.goal || { radius: this.radius }; this.goal.x = this.follow.pos.x; this.goal.z = this.follow.pos.z; }
    const k = Math.min(1, dt * 3);
    if (this.goal) {
      this.target.x += (this.goal.x - this.target.x) * k;
      this.target.z += (this.goal.z - this.target.z) * k;
      this.radius += (this.goal.radius - this.radius) * k;
      if (!this.follow && Math.abs(this.goal.x - this.target.x) < 0.02 && Math.abs(this.goal.radius - this.radius) < 0.05) this.goal = null;
    }
    if (this.thetaGoal !== null) {
      this.theta += (this.thetaGoal - this.theta) * Math.min(1, dt * 5);
      if (Math.abs(this.thetaGoal - this.theta) < 0.002) { this.theta = this.thetaGoal; this.thetaGoal = null; }
    }
    const cam = this.camera, h = this.radius / 2, w = h * this.aspect;
    if (cam.top !== h || cam.right !== w) {
      cam.left = -w; cam.right = w; cam.top = h; cam.bottom = -h; cam.updateProjectionMatrix();
    }
    const dist = 160, sp = Math.sin(this.phi);
    cam.position.set(this.target.x + dist * sp * Math.sin(this.theta), dist * Math.cos(this.phi), this.target.z + dist * sp * Math.cos(this.theta));
    cam.lookAt(this.target.x, 0.6, this.target.z);
  }
}

// ───────────────────────── văn phòng ─────────────────────────
export class Office {
  constructor(container, { onSelect } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.agents = new Map();
    this.reservations = new Map();
    this.meetings = [];
    this.clock = performance.now() / 1000;
    this.visible = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.tagLayer = document.createElement('div');
    this.tagLayer.className = 'tag-layer';
    container.appendChild(this.tagLayer);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07080d');
    this.camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 1, 400);
    this.rig = new CameraRig(this.camera, renderer.domElement);
    this.buildWorld();
    this.city = buildCity(this.scene, { logoTexture: logoTexture() });

    this.raycaster = new THREE.Raycaster();
    renderer.domElement.addEventListener('click', (e) => {
      if (this.rig.moved > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const hits = this.raycaster.intersectObjects([...this.agents.values()].map((a) => a.parts.hit), false);
      if (hits.length) this.select(hits[0].object.userData.agent.emp.employee_id);
      else this.select(null);
    });
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.last = performance.now();
    const loop = () => {
      requestAnimationFrame(loop);
      const nowMs = performance.now();
      const dt = Math.min(0.1, (nowMs - this.last) / 1000);
      this.last = nowMs;
      this.clock = nowMs / 1000;
      for (const a of this.agents.values()) a.update(dt);
      if (!this.visible) return;
      this.city.update(dt, this.clock);
      this.rig.update(dt);
      this.interior.update(this.clock, Math.sin(this.rig.theta), Math.cos(this.rig.theta), dt);
      this.renderer.render(this.scene, this.camera);
      this.placeTags();
    };
    loop();
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.rig.aspect = w / h;
    if (!this.sized) { this.rig.radius = w < 700 ? 52 : 34; this.sized = true; }
  }

  setVisible(v) { this.visible = v; if (v) this.resize(); }

  buildWorld() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#c9dcff', '#3a2a24', 1.05));
    const sun = new THREE.DirectionalLight('#fff1dc', 1.6);
    sun.position.set(W / 2 + 18, 34, D / 2 + 10);
    sun.target.position.set(W / 2, 0, D / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 90 });
    sun.shadow.bias = -0.0004;
    s.add(sun, sun.target);
    const pink = new THREE.PointLight('#ff7ac8', 10, 10, 2); pink.position.set(23, 2.4, 1.6); s.add(pink);
    this.interior = buildInterior(s);
  }

  rotate(dir) { this.rig.rotateStep(dir); }

  // ── dữ liệu ──
  setEmployees(list) {
    for (const e of list) {
      const a = this.agents.get(e.employee_id);
      if (a) { Object.assign(a.emp, e); a.renderTag(true); continue; }
      if (!e.active || !DESKS[e.desk_slot]) continue;
      this.agents.set(e.employee_id, new Agent(this, { ...e }));
    }
  }

  setPresence(employeeId, online) {
    const a = this.agents.get(employeeId);
    if (a) { a.emp.online = online; a.renderTag(true); }
  }

  setMeetings(meetings) {
    this.meetings = meetings.map((m) => ({
      id: m.id, title: m.title, participants: m.participants,
      endsAt: this.clock + Math.max(5, (Date.parse(m.ends_at) - Date.now()) / 1000),
    }));
    for (const m of this.meetings) for (const eid of m.participants) {
      const a = this.agents.get(eid);
      if (a && a.activity.type !== 'meeting') a.interrupt(() => a.startMeeting(m));
    }
  }

  meetingFor(eid) {
    return this.meetings.find((m) => m.endsAt > this.clock && m.participants.includes(eid));
  }

  reserve(agent, pool, spots) {
    this.release(agent);
    const taken = new Set([...this.reservations.entries()].filter(([a, r]) => a !== agent && r.pool === pool).map(([, r]) => r.spot));
    const free = spots.filter((s) => !taken.has(s));
    if (!free.length) return null;
    const spot = pick(free);
    this.reservations.set(agent, { pool, spot });
    return spot;
  }

  release(agent) { this.reservations.delete(agent); }

  pickBuddy(agent) {
    const all = [...this.agents.values()].filter((b) => b !== agent && b.activity.type === 'desk' && !b.path.length);
    if (!all.length) return null;
    const same = all.filter((b) => b.emp.department_id === agent.emp.department_id);
    return pick(same.length && Math.random() < 0.7 ? same : all);
  }

  /** Sự kiện thật từ backend (dự án, tin nhắn, họp) điều khiển hành vi nhân vật. */
  handleOfficeEvent(ev) {
    const t = this.clock;
    if (ev.kind === 'meeting') {
      const m = { id: ev.meeting_id, title: ev.title, participants: ev.employee_ids, endsAt: t + ev.duration_min * 60 };
      this.meetings.push(m);
      for (const eid of ev.employee_ids) { const a = this.agents.get(eid); if (a) { a.talkUntil = 0; a.startMeeting(m); } }
      return;
    }
    if (ev.kind === 'message') {
      for (const eid of ev.employee_ids) { const a = this.agents.get(eid); if (a) a.pulseUntil = t + 10; }
      const from = this.agents.get(ev.from_employee_id);
      if (ev.direct && from && ev.employee_ids.length === 1 && Math.random() < 0.6) {
        const to = this.agents.get(ev.employee_ids[0]);
        if (to && to.activity.type === 'desk' && from.activity.type !== 'visit') {
          from.interrupt(() => from.startVisit(to, rand(12, 20), 'Trao đổi trực tiếp với ' + to.emp.full_name.split(' ').pop()));
        }
      }
      return;
    }
    for (const eid of ev.employee_ids || []) {
      const a = this.agents.get(eid);
      if (!a) continue;
      if (ev.ai) {
        // Nhân viên AI đang thật sự xử lý việc (gọi Claude): hiện nhãn đến khi xong
        const busy = ev.label && ev.label.startsWith('🤖');
        a.aiLabel = busy ? ev.label : null; a.aiUntil = busy ? t + 900 : 0;
        if (ev.kind === 'talking') { a.aiLabel = ev.label; a.aiUntil = t + 20; continue; }
        if (!busy) continue;
      }
      if (ev.kind === 'assigned' || ev.kind === 'working') {
        a.interrupt(() => a.startDesk({ state: 'working', label: ev.label || 'Làm việc', dur: rand(40, 70) }));
      } else if (ev.kind === 'waiting') {
        a.interrupt(() => a.startDesk({ state: 'waiting', label: ev.label || 'Đang chờ', dur: rand(20, 35) }));
      } else if (ev.kind === 'reviewing') {
        a.interrupt(() => a.startDesk({ state: 'reviewing', label: ev.label || 'Đang xem xét', dur: rand(30, 50) }));
      }
    }
  }

  pulse(employeeIds) {
    for (const eid of employeeIds) { const a = this.agents.get(eid); if (a) a.pulseUntil = this.clock + 10; }
  }

  setBadge(employeeId, count) {
    const a = this.agents.get(employeeId);
    if (a) { a.badge = count; a.renderTag(true); }
  }

  select(employeeId) {
    for (const a of this.agents.values()) a.parts.ring.visible = a.emp.employee_id === employeeId;
    this.selected = employeeId;
    if (this.onSelect) this.onSelect(employeeId);
  }

  focus(employeeId) {
    const a = this.agents.get(employeeId);
    if (!a) return;
    this.rig.flyTo(a.pos.x, a.pos.z, 13, a);
    this.select(employeeId);
  }

  overview() { this.rig.follow = null; this.rig.flyTo(W / 2, D / 2, this.container.clientWidth < 700 ? 52 : 34); }

  snapshot() {
    return [...this.agents.values()].map((a) => ({
      employee_id: a.emp.employee_id, state: a.displayState(), label: a.label(),
    }));
  }

  placeTags() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    for (const a of this.agents.values()) {
      v.set(a.pos.x, (a.sitting && !a.path.length ? 1.62 : 2.0) + a.parts.body.position.y * 0.2, a.pos.z).project(this.camera);
      const hidden = v.z > 1;
      a.tag.style.display = hidden ? 'none' : '';
      a.tag.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      a.tag.style.zIndex = String(1000 - Math.round(v.z * 500));
    }
  }
}
