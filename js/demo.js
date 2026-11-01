// Trang xem demo công khai: văn phòng 3D + dự án, chat MẪU và kịch bản giao việc mô phỏng.
// Không cần đăng nhập, không đọc dữ liệu thật ngoài danh sách nhân vật đã lọc.
import { h, clear, avatar, chip, toast } from './ui.js';
import { SAMPLE_PROJECTS, SAMPLE_CHATS, NEW_JOBS } from './demo-samples.js';

const app = document.getElementById('app');
// Bản tĩnh (GitHub Pages, xuất bằng scripts/build_demo.py) đọc ảnh chụp dữ liệu thay vì gọi API.
const STATIC = 'static' in document.body.dataset;
let office, STATES, employees = [], selected = null, panel, feedList, chatBtn;
const byId = new Map();
const projects = SAMPLE_PROJECTS.map((p) => ({ ...p }));
const chats = [];

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
  panel = h('aside', { class: 'profile-panel', hidden: true, 'aria-live': 'polite' });
  feedList = h('ul', { class: 'demo-feed' });
  chatBtn = h('button', { class: 'btn sm', onclick: () => { office.select(null); showChats(); } }, '💬 Chat');
  clear(app, canvasBox,
    h('div', { class: 'hud hud-tl' },
      h('div', { class: 'hud-title' }, h('b', {}, 'VĂN PHÒNG DEFFI ADS VIỆT'), h('span', { class: 'demo-pill' }, 'Xem demo')),
      legend, feedList,
      h('p', { class: 'sim-note' }, 'Kéo để xoay, cuộn để phóng to, bấm vào nhân vật để xem họ làm gì. Dự án, tin nhắn và việc được giao là MẪU để minh hoạ.')),
    h('div', { class: 'hud hud-tr' },
      h('button', { class: 'btn ghost sm demo-cam', title: 'Xoay trái 90°', 'aria-label': 'Xoay trái', onclick: () => office.rotate(-1) }, '⟲'),
      h('button', { class: 'btn ghost sm demo-cam', title: 'Xoay phải 90°', 'aria-label': 'Xoay phải', onclick: () => office.rotate(1) }, '⟳'),
      h('button', { class: 'btn ghost sm demo-cam', onclick: () => office.overview() }, '⤢ Toàn cảnh'),
      h('button', { class: 'btn sm primary', onclick: () => startJob(true) }, '▶ Giao việc thử'),
      h('button', { class: 'btn sm', onclick: () => { office.select(null); showProjects(); } }, '📁 Dự án'),
      chatBtn,
      STATIC ? null : h('a', { class: 'btn sm ghost', href: '/' }, 'Đăng nhập')),
    strip, panel);

  try {
    const mod = await import('./office/office3d.js');
    STATES = mod.STATES;
    office = new mod.Office(canvasBox, { onSelect: (id) => { selected = id; if (id || panelMode === 'person') renderPerson(); } });
  } catch (err) {
    console.error(err);
    app.append(h('div', { class: 'office-fallback' }, h('h3', {}, 'Không tải được đồ hoạ 3D'),
      h('p', {}, 'Trình duyệt chưa bật WebGL hoặc không kết nối được thư viện three.js.')));
    return;
  }
  apply(data, strip);
  seedChats();
  setInterval(() => { updateLegend(legend, strip); if (selected) renderState(); }, 1000);
  if (!STATIC) setInterval(async () => { try { apply(await load(), strip); } catch { /* giữ dữ liệu cũ */ } }, 20000);
  setTimeout(() => startJob(false), 6000);
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
const director = () => bySlot('bgd-director') || employees.find((e) => e.role === 'director');
const teamOf = (p) => p.team.map(bySlot).filter(Boolean);
const short = (e) => e.full_name.split(' ').pop();
const sampleNote = (what = 'Dự án') => h('p', { class: 'demo-note' }, what + ' mẫu để minh hoạ — khách hàng và nội dung là giả.');
const hhmm = (d) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const closeBtn = () => h('button', { class: 'icon-btn close', 'aria-label': 'Đóng', onclick: () => { panelMode = null; panel.hidden = true; } }, '✕');

// ───────────── chat mẫu ─────────────
function seedChats() {
  const now = Date.now();
  for (const c of SAMPLE_CHATS) {
    chats.push({ ...c, unread: 0, messages: c.messages.map((m) => ({ ...m, at: new Date(now - m.ago * 60000) })).filter((m) => bySlot(m.from)) });
  }
}

function postMessage(convId, fromSlot, text, extra = {}) {
  const from = bySlot(fromSlot);
  const conv = chats.find((c) => c.id === convId);
  if (!from || !conv) return;
  conv.messages.push({ from: fromSlot, text, at: new Date(), ...extra });
  const open = panelMode === 'chat' && openChat === convId;
  if (!open) conv.unread++;
  // Người nhận nhấp nháy trong văn phòng; tin nhắn riêng có thể khiến người gửi đi sang bàn người nhận
  const to = conv.type === 'direct' ? conv.members.filter((s) => s !== fromSlot).map(bySlot).filter(Boolean) : employees.filter((e) => e !== from);
  office.handleOfficeEvent({ kind: 'message', employee_ids: to.map((e) => e.employee_id), from_employee_id: from.employee_id, direct: conv.type === 'direct' });
  if (open || panelMode === 'chats') refreshPanel();
  updateChatBadge();
}

function directConv(a, b) {
  const id = 'dm-' + [a, b].sort().join('-');
  let c = chats.find((x) => x.id === id);
  if (!c) {
    c = { id, type: 'direct', members: [a, b], name: short(bySlot(a)) + ' ↔ ' + short(bySlot(b)), unread: 0, messages: [] };
    chats.push(c);
  }
  return c.id;
}

function updateChatBadge() {
  const n = chats.reduce((s, c) => s + c.unread, 0);
  chatBtn.textContent = n ? '💬 Chat (' + n + ')' : '💬 Chat';
}

let openChat = null;
function showChats() {
  panelMode = 'chats';
  stateBox = null;
  panel.hidden = false;
  const sorted = chats.filter((c) => c.messages.length).sort((a, b) => last(b).at - last(a).at);
  clear(panel, closeBtn(), h('h3', {}, '💬 DEFFI CHAT'), sampleNote('Tin nhắn'),
    h('div', { class: 'stack sm' }, sorted.map((c) => {
      const m = last(c), who = bySlot(m.from);
      return h('button', { class: 'conv demo-conv' + (c.unread ? ' unread' : ''), onclick: () => showChat(c.id) },
        c.type === 'direct' ? avatar(who.full_name, who.avatar_color, 34) : h('span', { class: 'demo-group-ic' }, '#'),
        h('span', { class: 'conv-main' },
          h('span', { class: 'conv-top' }, h('b', {}, c.name), h('small', {}, hhmm(m.at))),
          h('span', { class: 'conv-last' }, short(who) + ': ' + (m.project ? '📁 ' : m.file ? '📎 ' : '') + m.text)),
        c.unread ? h('span', { class: 'demo-unread' }, c.unread) : null);
    })));
}
const last = (c) => c.messages[c.messages.length - 1] || { at: new Date(0), from: 'bgd-director', text: '' };

function showChat(id) {
  const c = chats.find((x) => x.id === id);
  panelMode = 'chat'; openChat = id; c.unread = 0; updateChatBadge();
  stateBox = null;
  panel.hidden = false;
  const list = h('div', { class: 'demo-msgs' }, c.messages.map((m, i) => {
    const e = bySlot(m.from), prev = c.messages[i - 1];
    const compact = prev && prev.from === m.from && m.at - prev.at < 5 * 60000;
    return h('div', { class: 'msg' + (compact ? ' compact' : '') },
      compact ? h('span', { class: 'msg-av' }) : h('button', { class: 'msg-av demo-av', title: 'Xem trong văn phòng 3D', onclick: () => office.focus(e.employee_id) }, avatar(e.full_name, e.avatar_color, 30)),
      h('div', { class: 'msg-col' },
        compact ? null : h('div', { class: 'msg-meta' }, h('span', { class: 'msg-name' }, e.full_name), e.is_ai ? h('span', { class: 'ai-pill sm' }, '🤖 AI') : null, h('time', {}, hhmm(m.at))),
        h('div', { class: 'bubble' },
          m.project ? h('div', { class: 'demo-pcard' }, '📁 ', h('b', {}, m.project), m.status ? chip(m.status) : null) : null,
          h('span', {}, m.text),
          m.file ? h('span', { class: 'file-chip' }, '📎 ' + m.file) : null)));
  }));
  clear(panel, closeBtn(),
    h('button', { class: 'btn ghost sm', onclick: () => showChats() }, '← Tất cả hội thoại'),
    h('h3', { class: 'demo-pname' }, (c.type === 'group' ? '# ' : '') + c.name), sampleNote('Tin nhắn'),
    list, h('p', { class: 'demo-readonly' }, '✓✓ Đã xem · Bản demo chỉ xem, không gửi được tin nhắn'));
  list.scrollTop = list.scrollHeight;
}

// ───────────── kịch bản giao việc ─────────────
let jobIdx = 0, running = false, autoTimer = null;
function feed(text, tone) {
  feedList.prepend(h('li', {}, h('time', {}, hhmm(new Date())), ' ', text));
  while (feedList.children.length > 4) feedList.lastChild.remove();
  if (tone) toast(text, tone);
}

function startJob(manual) {
  if (running) { if (manual) toast('Đang có một việc được giao — mở 💬 Chat hoặc 📁 Dự án để theo dõi', 'info'); return; }
  clearTimeout(autoTimer);
  const job = NEW_JOBS[jobIdx++ % NEW_JOBS.length];
  const dir = director(), lead = bySlot(job.team[0]), mate = bySlot(job.team[1]);
  if (!dir || !lead || !mate) return;
  running = true;
  const deadline = new Date(Date.now() + job.days * 86400000);
  const p = { name: job.name, brief: job.brief, team: job.team, status: 'not_started', progress: 0,
    deadline: deadline.getDate() + '/' + (deadline.getMonth() + 1), live: true };
  projects.unshift(p);
  const ids = (...es) => es.map((e) => e.employee_id);
  const update = (patch) => { Object.assign(p, patch); if (['projects', 'project', 'person'].includes(panelMode)) refreshPanel(); };
  const dm = directConv(job.team[0], job.team[1]);
  const steps = [
    [0, () => {
      feed('Giám đốc giao «' + job.name + '» cho ' + short(lead) + ' và ' + short(mate), 'pink');
      postMessage(job.group, 'bgd-director', 'Giao dự án mới cho ' + short(lead) + ' (chính) và ' + short(mate) + ': ' + job.brief + ' Hạn ' + p.deadline + '.',
        { project: job.name, status: 'not_started' });
      office.handleOfficeEvent({ kind: 'meeting', meeting_id: 'demo-' + jobIdx, title: 'Họp giao việc', employee_ids: ids(dir, lead, mate), duration_min: 0.8 });
      update({});
    }],
    [55, () => {
      feed(short(lead) + ' nhận việc và bắt đầu làm');
      office.handleOfficeEvent({ kind: 'assigned', employee_ids: ids(lead, mate), label: 'Nhận dự án mới' });
      for (const e of [lead, mate]) if (e.is_ai) office.handleOfficeEvent({ kind: 'working', employee_ids: [e.employee_id], ai: true, label: '🤖 Đang làm: ' + job.name.slice(0, 40) });
      postMessage(job.group, job.team[0], job.ack);
      update({ status: 'in_progress', progress: 15 });
    }],
    [70, () => {
      feed(short(lead) + ' nhắn ' + short(mate) + ' để phối hợp');
      postMessage(dm, job.team[0], job.ask);
      update({ progress: 35 });
    }],
    [88, () => { postMessage(dm, job.team[1], job.reply); update({ progress: 60 }); }],
    [108, () => {
      postMessage(job.group, job.team[0], job.deliver, { file: job.file });
      update({ progress: 100 });
    }],
    [116, () => {
      feed(short(lead) + ' gửi giám đốc duyệt «' + job.name + '»', 'warn');
      postMessage(job.group, job.team[0], 'Em gửi giám đốc duyệt ạ.', { project: job.name, status: 'pending_review' });
      office.handleOfficeEvent({ kind: 'waiting', employee_ids: ids(lead, mate), label: 'Chờ giám đốc duyệt' });
      office.handleOfficeEvent({ kind: 'reviewing', employee_ids: ids(dir), label: 'Đang xem: ' + job.name.slice(0, 30) });
      update({ status: 'pending_review' });
    }],
    [140, () => {
      feed('Giám đốc đã PHÊ DUYỆT «' + job.name + '»', 'success');
      postMessage(job.group, 'bgd-director', job.approve, { project: job.name, status: 'approved' });
      office.handleOfficeEvent({ kind: 'working', employee_ids: ids(lead, mate), label: 'Dự án được duyệt' });
      update({ status: 'approved' });
      running = false;
      autoTimer = setTimeout(() => startJob(false), 45000);
    }],
  ];
  for (const [sec, fn] of steps) setTimeout(fn, sec * 1000);
}

// ───────────── dự án & nhân vật ─────────────
let panelMode = null, openProject = null;
function refreshPanel() {
  if (panelMode === 'projects') showProjects();
  else if (panelMode === 'project') showProject(openProject);
  else if (panelMode === 'chats') showChats();
  else if (panelMode === 'chat') showChat(openChat);
  else if (panelMode === 'person') renderPerson();
}

function projectRow(p) {
  return h('button', { class: 'mini-project' + (p.live ? ' demo-live' : ''), onclick: () => showProject(p) },
    h('span', { class: 'mp-name' }, p.live ? '🆕 ' : '', p.name), chip(p.status),
    h('span', { class: 'bar' }, h('i', { style: { width: p.progress + '%' } })));
}

function showProjects() {
  panelMode = 'projects';
  stateBox = null;
  panel.hidden = false;
  const counts = {};
  for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;
  clear(panel, closeBtn(), h('h3', {}, '📁 Dự án'), sampleNote(),
    h('div', { class: 'demo-kpis' },
      h('div', {}, h('b', {}, projects.length), h('small', {}, 'dự án')),
      h('div', {}, h('b', {}, (counts.not_started || 0) + (counts.in_progress || 0) + (counts.waiting_coordination || 0) + (counts.changes_requested || 0)), h('small', {}, 'đang làm')),
      h('div', {}, h('b', {}, counts.pending_review || 0), h('small', {}, 'chờ duyệt'))),
    h('div', { class: 'stack sm' }, projects.map(projectRow)));
}

function showProject(p) {
  panelMode = 'project'; openProject = p;
  stateBox = null;
  if (selected) office.select(null);
  panel.hidden = false;
  const steps = [['Giám đốc giao việc', true], ['Nhân viên thực hiện', p.progress > 0], ['Gửi giám đốc duyệt', ['pending_review', 'changes_requested', 'approved', 'completed'].includes(p.status)],
    [p.status === 'changes_requested' ? 'Yêu cầu chỉnh sửa' : 'Giám đốc phê duyệt', ['approved', 'completed', 'changes_requested'].includes(p.status)]];
  const talk = chats.flatMap((c) => c.messages.filter((m) => m.project === p.name).map((m) => ({ ...m, conv: c })));
  clear(panel, closeBtn(),
    h('button', { class: 'btn ghost sm', onclick: () => showProjects() }, '← Tất cả dự án'),
    h('h3', { class: 'demo-pname' }, p.name), sampleNote(),
    h('div', { class: 'row' }, chip(p.status), h('span', { class: 'muted' }, 'Hạn ' + p.deadline)),
    h('div', { class: 'demo-progress' }, h('span', { class: 'bar' }, h('i', { style: { width: p.progress + '%' } })), h('b', {}, p.progress + '%')),
    h('p', {}, p.brief),
    h('h4', {}, 'Quy trình duyệt'),
    h('ol', { class: 'demo-steps' }, steps.map(([t, done]) => h('li', { class: done ? 'done' : '' }, t))),
    h('h4', {}, 'Nhân sự'),
    h('div', { class: 'stack sm' }, teamOf(p).map((e) => h('button', { class: 'check demo-person', onclick: () => { office.select(e.employee_id); office.focus(e.employee_id); } },
      avatar(e.full_name, e.avatar_color, 26, e.online), h('span', {}, e.full_name, h('small', { class: 'muted' }, ' · ' + e.title)),
      e.is_ai ? h('span', { class: 'ai-pill sm' }, '🤖 AI') : null))),
    talk.length ? h('h4', {}, 'Trao đổi trong chat') : null,
    talk.length ? h('div', { class: 'stack sm' }, talk.map((m) => h('button', { class: 'check demo-person', onclick: () => showChat(m.conv.id) },
      h('span', {}, h('b', {}, short(bySlot(m.from))), ' · ', m.text, h('small', { class: 'muted' }, ' — #' + m.conv.name))))) : null);
}

let stateBox = null;
function renderPerson() {
  const e = selected && byId.get(selected);
  panelMode = e ? 'person' : null;
  panel.hidden = !e;
  if (!e) return;
  stateBox = h('div', { class: 'sim-state' });
  const mine = projects.filter((p) => p.team.includes(e.desk_slot));
  clear(panel,
    h('button', { class: 'icon-btn close', 'aria-label': 'Đóng', onclick: () => office.select(null) }, '✕'),
    h('div', { class: 'pp-head' }, avatar(e.full_name, e.avatar_color, 52, e.online),
      h('div', {}, h('h3', {}, e.full_name), h('div', { class: 'muted' }, e.title),
        h('span', { class: 'dept-pill', style: { '--c': e.dept_color } }, e.dept_name), ' ',
        e.is_ai ? h('span', { class: 'ai-pill' }, '🤖 Nhân viên AI') : null)),
    h('h4', {}, 'Đang làm gì (mô phỏng)'), stateBox,
    h('h4', {}, 'Dự án (mẫu)'),
    h('div', { class: 'stack sm' }, mine.length ? mine.map(projectRow) : h('p', { class: 'muted' }, e.role === 'director' ? 'Giao việc và duyệt các dự án nhân viên gửi lên.' : 'Chưa có dự án mẫu.')),
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
