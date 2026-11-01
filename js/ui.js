// Tiện ích dựng giao diện (không dùng innerHTML với dữ liệu người dùng để tránh XSS).
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, val);
        else el.style[p] = val;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el, ...children) { el.replaceChildren(); append(el, children); return el; }

export const STATUS = {
  not_started: { label: 'Chưa bắt đầu', tone: 'mute' },
  in_progress: { label: 'Đang thực hiện', tone: 'blue' },
  waiting_coordination: { label: 'Đang chờ phối hợp', tone: 'yellow' },
  pending_review: { label: 'Chờ giám đốc duyệt', tone: 'pink' },
  changes_requested: { label: 'Yêu cầu chỉnh sửa', tone: 'orange' },
  approved: { label: 'Đã phê duyệt', tone: 'green' },
  completed: { label: 'Hoàn thành', tone: 'green' },
};
export const PRIORITY = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn cấp' };

export const chip = (status) => h('span', { class: 'chip tone-' + (STATUS[status] || {}).tone }, (STATUS[status] || {}).label || status);
export const prioChip = (p) => h('span', { class: 'prio prio-' + p }, PRIORITY[p] || p);

export function initials(name) {
  const parts = (name || '?').trim().split(/\s+/);
  return (parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

function isDark(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110;
}

export function avatar(name, color, size = 32, online) {
  return h('span', { class: 'avatar', style: { '--c': color || '#7fd3ff', color: isDark(color) ? '#e9ecf5' : '#0a0b10', width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.38) + 'px' }, title: name },
    initials(name), online === undefined ? null : h('i', { class: 'presence' + (online ? ' on' : '') }));
}

const pad = (n) => String(n).padStart(2, '0');
export function fmtTime(iso) {
  const d = new Date(iso);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
}
export function fmtDateTime(iso) { return fmtDate(iso) + ' ' + fmtTime(iso); }
export function relTime(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return Math.floor(s / 60) + ' phút trước';
  if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
  return fmtDate(iso);
}
export function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

let toastBox;
export function toast(msg, tone = 'info', action) {
  if (!toastBox) { toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(toastBox); }
  const t = h('div', { class: 'toast tone-' + tone }, h('span', {}, msg), action ? h('button', { class: 'link', onclick: () => { action.fn(); t.remove(); } }, action.label) : null);
  toastBox.appendChild(t);
  setTimeout(() => t.classList.add('out'), 5200);
  setTimeout(() => t.remove(), 5600);
}

export function modal(title, body, { wide } = {}) {
  const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const wrap = h('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === wrap) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', {}, h('h3', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Đóng', onclick: close }, '✕')),
      body));
  document.body.appendChild(wrap);
  document.addEventListener('keydown', esc);
  const first = wrap.querySelector('input, textarea, select');
  if (first) setTimeout(() => first.focus(), 30);
  return close;
}

export function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input, hint ? h('small', {}, hint) : null);
}

export function fileIcon(mime) {
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.startsWith('image/')) return '🖼';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('zip')) return '🗜';
  return '📄';
}

export function attachmentChip(a) {
  const link = h('a', { class: 'file-chip', href: '/api/attachments/' + a.id + '?download=1', target: '_blank', rel: 'noopener' },
    h('span', {}, fileIcon(a.mime)), h('span', { class: 'fc-name' }, a.filename), h('small', {}, fmtSize(a.size)));
  const previewable = /^(text|image|video|audio)\//.test(a.mime);
  if (!previewable) return link;
  return h('span', { class: 'file-pair' }, link, h('button', { type: 'button', class: 'btn ghost sm', title: 'Xem nhanh', onclick: () => previewAttachment(a) }, '👁 Xem'));
}

async function previewAttachment(a) {
  const url = '/api/attachments/' + a.id;
  let body;
  if (a.mime === 'image/svg+xml') {
    body = h('div', { class: 'svg-preview' }, h('img', { src: url, alt: a.filename }));
  } else if (a.mime.startsWith('image/')) {
    body = h('div', { class: 'media-preview' }, h('img', { src: url, alt: a.filename }));
  } else if (a.mime.startsWith('video/')) {
    body = h('div', { class: 'media-preview' }, h('video', { src: url, controls: true, autoplay: true, playsinline: true }));
  } else if (a.mime.startsWith('audio/')) {
    body = h('audio', { src: url, controls: true, autoplay: true, style: { width: '100%' } });
  } else {
    const res = await fetch(url, { credentials: 'same-origin' });
    const text = await res.text();
    body = a.mime === 'text/csv' ? csvTable(text) : h('pre', { class: 'doc-preview' }, text);
  }
  modal(a.filename, h('div', { class: 'stack' }, body, h('a', { class: 'btn ghost sm', href: url + '?download=1' }, '⬇ Tải về')), { wide: true });
}

function csvTable(text) {
  const rows = text.trim().split(/\r?\n/).slice(0, 300).map((line) => {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  });
  return h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
    h('thead', {}, h('tr', {}, (rows[0] || []).map((c) => h('th', {}, c)))),
    h('tbody', {}, rows.slice(1).map((r) => h('tr', {}, r.map((c) => h('td', {}, c)))))));
}

// Ô chọn file: trả về { el, ids(): Promise<number[]>, reset() }
export function filePicker(uploadFn, label = 'Đính kèm file') {
  const list = h('div', { class: 'file-list' });
  const items = [];
  const input = h('input', { type: 'file', multiple: true, hidden: true, onchange: () => {
    for (const f of input.files) {
      const it = { file: f, id: null, el: h('span', { class: 'file-chip pending' }, fileIcon(f.type || ''), ' ', f.name) };
      it.promise = uploadFn(f).then((a) => { it.id = a.id; it.el.classList.remove('pending'); return a.id; })
        .catch((e) => { it.el.classList.add('error'); it.el.title = e.message; toast('Không tải được ' + f.name + ': ' + e.message, 'error'); return null; });
      items.push(it); list.appendChild(it.el);
    }
    input.value = '';
  } });
  const el = h('div', { class: 'file-picker' }, h('button', { type: 'button', class: 'btn ghost sm', 'aria-label': label, title: label, onclick: () => input.click() }, '📎', h('span', { class: 'fp-label' }, label)), input, list);
  return {
    el,
    async ids() { return (await Promise.all(items.map((i) => i.promise))).filter(Boolean); },
    reset() { items.length = 0; list.replaceChildren(); },
    get count() { return items.length; },
  };
}
