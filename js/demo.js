// Trang xem demo công khai: chỉ văn phòng 3D, không cần đăng nhập, không có chat / dự án.
import { h, clear, avatar, chip } from './ui.js';

// Dự án MẪU chỉ để minh hoạ trên trang demo — khách hàng và số liệu đều là giả, không lấy từ database.
// Gắn người theo vị trí bàn (desk_slot) để vẫn đúng khi giám đốc đổi tên nhân viên.
const SAMPLE_PROJECTS = [
  { name: 'Chiến dịch Tết — Cà phê Mộc Sơn', status: 'in_progress', progress: 64, deadline: '20/01', team: ['mkt-1', 'mkt-2', 'design-1'],
    brief: 'Facebook + TikTok Ads mùa Tết, 3 bộ quảng cáo, ngân sách thử nghiệm 30 triệu.' },
  { name: 'Google Ads tìm kiếm — Nha khoa Ánh Dương', status: 'pending_review', progress: 100, deadline: '05/11', team: ['mkt-3'],
    brief: 'Bộ từ khoá niềm răng / implant, 4 nhóm quảng cáo, báo cáo đề xuất giá thầu.' },
  { name: 'Gắn tracking GA4 + Pixel — Shop Lá Xanh', status: 'approved', progress: 100, deadline: '28/10', team: ['tech-1'],
    brief: 'Theo dõi chuyển đổi mua hàng, thêm giỏ hàng; checklist kiểm tra sự kiện.' },
  { name: 'Video TikTok ra mắt — Trà sữa Mây', status: 'changes_requested', progress: 80, deadline: '12/11', team: ['design-2', 'mkt-3'],
    brief: '3 video 15 giây, phụ đề tiếng Việt, logo góc phải. Giám đốc yêu cầu đổi nhạc nền.' },
  { name: 'Tự động hoá báo cáo Ads hằng ngày', status: 'in_progress', progress: 40, deadline: '30/11', team: ['tech-2', 'mkt-1'],
    brief: 'Gom số liệu các tài khoản quảng cáo vào một bảng, gửi tóm tắt mỗi sáng.' },
  { name: 'Bộ banner Black Friday — Thời trang Nâu', status: 'waiting_coordination', progress: 55, deadline: '15/11', team: ['design-1', 'mkt-2'],
    brief: '12 kích thước banner, chờ khách gửi ảnh sản phẩm mới.' },
  { name: 'Đối soát chi phí quảng cáo tháng 10', status: 'pending_review', progress: 100, deadline: '03/11', team: ['acc-1'],
    brief: 'Bảng chi phí theo khách hàng, chênh lệch so với hoá đơn nền tảng 0,4%.' },
  { name: 'Kế hoạch ngân sách quý I', status: 'not_started', progress: 0, deadline: '10/12', team: ['bgd-assistant', 'acc-1'],
    brief: 'Tổng hợp ngân sách dự kiến theo khách hàng và kênh quảng cáo.' },
];

const app = document.getElementById('app');
// Bản tĩnh (GitHub Pages, xuất bằng scripts/build_demo.py) đọc ảnh chụp dữ liệu thay vì gọi API.
const STATIC = 'static' in document.body.dataset;
let office, STATES, employees = [], selected = null;
const byId = new Map();

async function load() {
  const res = await fetch(STATIC ? './demo-data.json' : '/api/demo/office', { credentials: 'omit' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || 'Không tải được dữ liệu');
  return data;
}

async function boot() {
  let data;
  try { data = await load(); } catch (ex) {
    clear(app, h('div', { class: 'demo-off' }, h('h2', {}, 'DEFFI ADS VIỆT'), h('p', {}, ex.message),
      STATIC ? null : h('a', { class: 'btn primary', href: '/' }, 'Đăng nhập')));
    return;
  }
  const canvasBox = h('div', { class: 'office-canvas' });
  const legend = h('ul', { class: 'legend' });
  const strip = h('div', { class: 'staff-strip', role: 'list' });
  const panel = h('aside', { class: 'profile-panel', hidden: true, 'aria-live': 'polite' });
  clear(app, canvasBox,
    h('div', { class: 'hud hud-tl' },
      h('div', { class: 'hud-title' }, h('b', {}, 'VĂN PHÒNG DEFFI ADS VIỆT'), h('span', { class: 'demo-pill' }, 'Xem demo')),
      legend,
      h('p', { class: 'sim-note' }, 'Kéo để xoay góc nhìn, cuộn để phóng to. Bấm vào một nhân vật để xem họ đang làm gì. Di chuyển của nhân vật là mô phỏng.')),
    h('div', { class: 'hud hud-tr' },
      h('button', { class: 'btn ghost sm', title: 'Xoay trái 90°', 'aria-label': 'Xoay trái', onclick: () => office.rotate(-1) }, '⟲'),
      h('button', { class: 'btn ghost sm', title: 'Xoay phải 90°', 'aria-label': 'Xoay phải', onclick: () => office.rotate(1) }, '⟳'),
      h('button', { class: 'btn ghost sm', onclick: () => office.overview() }, '⤢ Toàn cảnh'),
      h('button', { class: 'btn sm', onclick: () => { office.select(null); showProjects(panel); } }, '📁 Dự án'),
      STATIC ? null : h('a', { class: 'btn sm primary', href: '/' }, 'Đăng nhập')),
    strip, panel);

  try {
    const mod = await import('./office/office3d.js');
    STATES = mod.STATES;
    office = new mod.Office(canvasBox, { onSelect: (id) => { selected = id; if (id || panelMode === 'person') renderPanel(panel); } });
  } catch (err) {
    console.error(err);
    app.append(h('div', { class: 'office-fallback' }, h('h3', {}, 'Không tải được đồ hoạ 3D'),
      h('p', {}, 'Trình duyệt chưa bật WebGL hoặc không kết nối được thư viện three.js.')));
    return;
  }
  apply(data, strip);
  setInterval(() => { updateLegend(legend, strip); if (selected) renderState(); }, 1000);
  if (!STATIC) setInterval(async () => { try { apply(await load(), strip); } catch { /* giữ dữ liệu cũ */ } }, 20000);
}

function apply(data, strip) {
  const first = !employees.length;
  employees = data.employees;
  for (const e of employees) byId.set(e.employee_id, e);
  office.setEmployees(employees);
  office.setMeetings(data.meetings || []);
  if (first) {
    for (const e of employees) {
      strip.appendChild(h('button', { class: 'strip-item', role: 'listitem', title: e.full_name + ' — ' + e.title, onclick: () => office.focus(e.employee_id) },
        avatar(e.full_name, e.avatar_color, 34, e.online), h('span', {}, e.full_name.split(' ').pop())));
    }
  }
}

function updateLegend(legend, strip) {
  const counts = {};
  for (const s of office.snapshot()) counts[s.state] = (counts[s.state] || 0) + 1;
  clear(legend, Object.entries(STATES).map(([k, s]) => h('li', { style: { '--c': s.color }, class: counts[k] ? '' : 'zero' },
    h('span', {}, s.icon), h('span', {}, s.label.replace('Đang ', '')), h('b', {}, counts[k] || 0))));
  for (const [i, e] of employees.entries()) {
    const dot = strip.children[i] && strip.children[i].querySelector('.presence');
    if (dot) dot.classList.toggle('on', !!e.online);
  }
}

const bySlot = (slot) => employees.find((e) => e.desk_slot === slot);
const teamOf = (p) => p.team.map(bySlot).filter(Boolean);
const sampleNote = () => h('p', { class: 'demo-note' }, 'Dự án mẫu để minh hoạ — khách hàng và số liệu là giả.');

function projectRow(p, panel) {
  return h('button', { class: 'mini-project', onclick: () => showProject(p, panel) },
    h('span', { class: 'mp-name' }, p.name), chip(p.status),
    h('span', { class: 'bar' }, h('i', { style: { width: p.progress + '%' } })));
}

let panelMode = null;
function showProjects(panel) {
  panelMode = 'projects';
  stateBox = null;
  panel.hidden = false;
  const counts = {};
  for (const p of SAMPLE_PROJECTS) counts[p.status] = (counts[p.status] || 0) + 1;
  clear(panel,
    h('button', { class: 'icon-btn close', 'aria-label': 'Đóng', onclick: () => { panelMode = null; panel.hidden = true; } }, '✕'),
    h('h3', {}, '📁 Dự án'), sampleNote(),
    h('div', { class: 'demo-kpis' },
      h('div', {}, h('b', {}, SAMPLE_PROJECTS.length), h('small', {}, 'dự án')),
      h('div', {}, h('b', {}, (counts.in_progress || 0) + (counts.waiting_coordination || 0) + (counts.changes_requested || 0)), h('small', {}, 'đang làm')),
      h('div', {}, h('b', {}, counts.pending_review || 0), h('small', {}, 'chờ duyệt'))),
    h('div', { class: 'stack sm' }, SAMPLE_PROJECTS.map((p) => projectRow(p, panel))));
}

function showProject(p, panel) {
  panelMode = 'project';
  stateBox = null;
  office.select(null);
  panel.hidden = false;
  const steps = [['Giao việc', true], ['Thực hiện', p.progress > 0], ['Gửi giám đốc duyệt', ['pending_review', 'changes_requested', 'approved', 'completed'].includes(p.status)],
    [p.status === 'changes_requested' ? 'Yêu cầu chỉnh sửa' : 'Giám đốc phê duyệt', ['approved', 'completed', 'changes_requested'].includes(p.status)]];
  clear(panel,
    h('button', { class: 'icon-btn close', 'aria-label': 'Đóng', onclick: () => { panelMode = null; panel.hidden = true; } }, '✕'),
    h('button', { class: 'btn ghost sm', onclick: () => showProjects(panel) }, '← Tất cả dự án'),
    h('h3', { class: 'demo-pname' }, p.name), sampleNote(),
    h('div', { class: 'row' }, chip(p.status), h('span', { class: 'muted' }, 'Hạn ' + p.deadline)),
    h('div', { class: 'demo-progress' }, h('span', { class: 'bar' }, h('i', { style: { width: p.progress + '%' } })), h('b', {}, p.progress + '%')),
    h('p', {}, p.brief),
    h('h4', {}, 'Quy trình duyệt'),
    h('ol', { class: 'demo-steps' }, steps.map(([t, done]) => h('li', { class: done ? 'done' : '' }, t))),
    h('h4', {}, 'Nhân sự'),
    h('div', { class: 'stack sm' }, teamOf(p).map((e) => h('button', { class: 'check demo-person', onclick: () => { office.select(e.employee_id); office.focus(e.employee_id); } },
      avatar(e.full_name, e.avatar_color, 26, e.online), h('span', {}, e.full_name, h('small', { class: 'muted' }, ' · ' + e.title)),
      e.is_ai ? h('span', { class: 'ai-pill sm' }, '🤖 AI') : null))));
}

let stateBox = null;
function renderPanel(panel) {
  const e = selected && byId.get(selected);
  panelMode = e ? 'person' : null;
  panel.hidden = !e;
  if (!e) return;
  stateBox = h('div', { class: 'sim-state' });
  const mine = SAMPLE_PROJECTS.filter((p) => p.team.includes(e.desk_slot));
  clear(panel,
    h('button', { class: 'icon-btn close', 'aria-label': 'Đóng', onclick: () => office.select(null) }, '✕'),
    h('div', { class: 'pp-head' }, avatar(e.full_name, e.avatar_color, 52, e.online),
      h('div', {}, h('h3', {}, e.full_name), h('div', { class: 'muted' }, e.title),
        h('span', { class: 'dept-pill', style: { '--c': e.dept_color } }, e.dept_name), ' ',
        e.is_ai ? h('span', { class: 'ai-pill' }, '🤖 Nhân viên AI') : null)),
    h('h4', {}, 'Đang làm gì (mô phỏng)'), stateBox,
    h('h4', {}, 'Dự án (mẫu)'),
    h('div', { class: 'stack sm' }, mine.length ? mine.map((p) => projectRow(p, panel)) : h('p', { class: 'muted' }, e.role === 'director' ? 'Duyệt các dự án nhân viên gửi lên.' : 'Chưa có dự án mẫu.')),
    h('div', { class: 'pp-actions' }, h('button', { class: 'btn ghost', onclick: () => office.focus(e.employee_id) }, '🎥 Theo dõi')));
  renderState();
}

function renderState() {
  const s = stateBox && office.snapshot().find((x) => x.employee_id === selected);
  if (!s) return;
  const st = STATES[s.state];
  clear(stateBox, h('span', { class: 'state-pill', style: { '--c': st.color } }, st.icon + ' ' + st.label), h('span', { class: 'muted' }, s.label));
}

boot();
