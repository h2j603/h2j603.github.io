// 탈네모 프로토타이퍼 UI. 값과 결과만 보여 준다. 조형 판단은 사용자 몫.
import { DEFAULTS, CONTROLS, getPath, setPath, merge, resolvePreset } from './schema.js';
import { layoutSyllable, layoutJamo } from './layout.js';
import { contourToPathD } from './outline.js';
import { CHO, JUNG, JONG } from './jamo.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const SAMPLE_CHARS = [...'가고과의각곡꿈똠없닭앎핥뷁쀍왜'];
const AXIS_CHARS = [...'각곡꿈없닭'];
const TABS = [['글자', 'chars'], ['문장', 'sentence'], ['이름', 'name'], ['자소', 'jamo'], ['축 단독', 'axis'], ['입력', 'input']];
const LS_KEY = 'talnemo.p.v1';

const state = {
  P: merge(DEFAULTS, {}),
  tab: 'chars',
  sel: null,
  axisKey: 'stroke.weight',
  typed: '',
  presets: {},
  presetFile: null,
};

/* ── 좌표·경로 ───────────────────────────────────────── */

const asc = () => state.P.font.ascender;
const toSVG = (x, y) => [x, state.P.font.ascender - y];

function pathOf(parts) {
  let d = '';
  for (const p of parts) for (const c of p.contours || []) d += contourToPathD(c, toSVG);
  return d;
}

function contourBounds(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of contours) for (const k of c) {
    if (k[0] === 'Z') continue;
    for (let i = 1; i < k.length; i += 2) {
      const [x, y] = toSVG(k[i], k[i + 1]);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { x0, y0, x1, y1 };
}

/* ── 표본 그리기 ─────────────────────────────────────── */

function guidesHTML(x0, x1) {
  const F = state.P.font;
  const yTop = F.ascender - F.frameTop;
  const yBot = F.ascender - (F.frameTop - F.frameH);
  const ln = (y) => `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="#C4C7C1" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  return ln(yTop) + ln(yBot);
}

function glyphHTML(P, ch, { guides = true } = {}) {
  let s;
  try { s = layoutSyllable(P, ch); } catch { return ''; }
  if (!s) return '';
  const b = contourBounds(s.parts.flatMap((p) => p.contours));
  const x0 = Math.min(0, b.x0 - 20);
  const x1 = Math.max(s.advance, b.x1 + 20);
  const w = Math.max(1, x1 - x0);
  const d = pathOf(s.parts);
  const sel = P === state.P && state.sel === ch ? ' sel' : '';
  return `<div class="cell${sel}" data-ch="${ch}">` +
    `<svg class="glyph" viewBox="${x0} 0 ${w} 1000" aria-label="${ch}">` +
    (guides ? guidesHTML(x0, x1) : '') +
    `<path d="${d}" fill="#000" fill-rule="nonzero"/></svg></div>`;
}

function jamoCellHTML(P, slot, ch) {
  let part;
  try { part = layoutJamo(P, slot, ch); } catch { return ''; }
  if (!part) return '';
  const d = pathOf([part]);
  // 자소 자기 외곽에 맞춰 자르되, 높이는 모두 같은 값(700)이라 배율이 같다
  const b = contourBounds(part.contours);
  const vb = `${b.x0 - 40} ${b.y0 - 40} ${b.x1 - b.x0 + 80} 700`;
  return `<div class="cell jamo"><svg class="glyph" viewBox="${vb}" aria-label="${ch}">` +
    `<path d="${d}" fill="#000" fill-rule="nonzero"/></svg></div>`;
}

function lineHTML(chars, P = state.P, guides = true) {
  const out = [...chars].map((ch) => {
    if (ch === ' ') return '<span class="space"></span>';
    if (ch === '\n') return '<span class="brk"></span>';
    return ch.trim() ? glyphHTML(P, ch, { guides }) : '';
  }).join('');
  return `<div class="line">${out}</div>`;
}

function sampleHTML() {
  const P = state.P;
  switch (state.tab) {
    case 'chars':
      return lineHTML(SAMPLE_CHARS);
    case 'sentence':
      return lineHTML('다람쥐 헌 쳇바퀴에 타고파', P);
    case 'name':
      return lineHTML('세벌식 탈네모꼴', P);
    case 'jamo': {
      const row = (slot, list) => `<div class="line">${list.map((ch) => jamoCellHTML(P, slot, ch)).join('')}</div>`;
      return row('cho', CHO) + row('jung', JUNG) + row('jong', JONG);
    }
    case 'axis': {
      const c = CONTROLS.find((x) => x.k === state.axisKey && x.min != null);
      if (!c) return '';
      const vals = [0, 0.25, 0.5, 0.75, 1].map((t) => quantize(c, c.min + (c.max - c.min) * t));
      return vals.map((v) => {
        const Q = structuredClone(P);
        setPath(Q, c.k, v);
        return `<div class="line"><span class="k num">${fmt(c, v)}</span>${AXIS_CHARS.map((ch) => glyphHTML(Q, ch)).join('')}</div>`;
      }).join('');
    }
    case 'input':
      return state.typed.trim() ? lineHTML(state.typed) : '';
  }
  return '';
}

/* ── 인스펙터 ────────────────────────────────────────── */

function skeletonHTML(parts) {
  const a = asc();
  let out = '';
  for (const p of parts) for (const k of p.skeleton || []) {
    if (k.t === 'line') {
      const pts = k.pts.map(([x, y]) => `${x.toFixed(1)},${(a - y).toFixed(1)}`).join(' ');
      out += `<polyline points="${pts}" fill="none" stroke="#1F3BFF" stroke-width="1.5"/>`;
    } else if (k.t === 'circle') {
      out += `<circle cx="${k.c[0].toFixed(1)}" cy="${(a - k.c[1]).toFixed(1)}" r="${(k.d / 2).toFixed(1)}" fill="none" stroke="#1F3BFF" stroke-width="1.5"/>`;
    } else if (k.t === 'square') {
      const x = k.c[0] - k.d / 2, y = a - k.c[1] - k.d / 2;
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${k.d.toFixed(1)}" height="${k.d.toFixed(1)}" fill="none" stroke="#1F3BFF" stroke-width="1.5"/>`;
    }
  }
  return out;
}

function constraintHTML(parts, constraints) {
  const a = asc();
  let out = '';
  for (const c of constraints) {
    const part = parts.find((p) => p.slot === c.slot);
    const sk = (part?.skeleton || []).find((k) => k.t === c.shape);
    if (!sk) continue;
    const [cx, cy] = [sk.c[0], a - sk.c[1]];
    out += `<rect x="${(cx - c.set.w / 2).toFixed(1)}" y="${(cy - c.set.h / 2).toFixed(1)}" width="${c.set.w}" height="${c.set.h}" fill="none" stroke="#1F3BFF" stroke-width="1" stroke-dasharray="6 6" opacity=".7"/>`;
    const side = c.drawn.side;
    out += `<rect x="${(cx - side / 2).toFixed(1)}" y="${(cy - side / 2).toFixed(1)}" width="${side}" height="${side}" fill="none" stroke="#1F3BFF" stroke-width="1.5"/>`;
  }
  return out;
}

function renderInspector() {
  const el = $('#inspector');
  if (!state.sel) { el.hidden = true; el.innerHTML = ''; return; }
  let s;
  try { s = layoutSyllable(state.P, state.sel); } catch { s = null; }
  if (!s) { el.hidden = true; el.innerHTML = ''; return; }

  const b = contourBounds(s.parts.flatMap((p) => p.contours));
  const pad = 60;
  const vb = `${(b.x0 - pad).toFixed(1)} ${(b.y0 - pad).toFixed(1)} ${(b.x1 - b.x0 + pad * 2).toFixed(1)} ${(b.y1 - b.y0 + pad * 2).toFixed(1)}`;
  const d = pathOf(s.parts);

  const rows = [];
  for (const c of s.info.constraints) {
    rows.push([
      c.jamo,
      `${c.set.w}×${c.set.h} · ${c.set.rotate || 0}°`,
      `${c.drawn.side} · ${c.drawn.rotate || 0}°`,
    ]);
  }
  rows.push(['글자 폭', '—', String(s.advance)]);
  rows.push(['배율', '—', `${s.info.scaleX} × ${s.info.scaleY}`]);
  rows.push(['자연 크기', '—', `${s.info.natW} × ${s.info.natH}`]);

  el.hidden = false;
  el.innerHTML =
    `<svg class="insp-svg" viewBox="${vb}" aria-label="${s.char || ''}">` +
      `<path d="${d}" fill="#000" fill-rule="nonzero"/>` +
      skeletonHTML(s.parts) +
      constraintHTML(s.parts, s.info.constraints) +
    `</svg>` +
    `<div class="cmp">` +
      `<span class="h"></span><span class="h">지정</span><span class="h">자동</span>` +
      rows.map((r) => `<span>${r[0]}</span><span class="v">${r[1]}</span><span class="v">${r[2]}</span>`).join('') +
    `</div>`;
}

/* ── 렌더 ───────────────────────────────────────────── */

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; render(); });
}

function render() {
  $('#sample').innerHTML = sampleHTML();
  for (const b of document.querySelectorAll('#tabs button'))
    b.classList.toggle('on', b.dataset.tab === state.tab);
  syncControls();
  renderInspector();
}

function toggleSel(ch) {
  state.sel = state.sel === ch ? null : ch;
  schedule();
}

/* ── 컨트롤 ─────────────────────────────────────────── */

const els = new Map();
const decimals = (c) => ((String(c.step ?? 1).split('.')[1] || '').length);
function fmt(c, v) { return Number(v).toFixed(decimals(c)); }
function quantize(c, v) {
  const s = c.step || 1;
  return clamp(Math.round(v / s) * s, c.min, c.max);
}

function setValue(k, v) {
  const c = CONTROLS.find((x) => x.k === k);
  if (!c) return;
  if (c.min != null) { v = quantize(c, v); state.axisKey = k; }
  else if (c.opts && !c.opts.some((o) => String(o) === String(v))) return;
  else if (c.opts) v = c.opts.find((o) => String(o) === String(v));
  setPath(state.P, k, v);
  save();
  schedule();
}

function buildControls() {
  els.clear();
  const wrap = $('#controls');
  wrap.innerHTML = '';
  const groups = [...new Set(CONTROLS.map((c) => c.g))];
  for (const g of groups) {
    const det = document.createElement('details');
    det.open = g !== '실험';
    const sum = document.createElement('summary');
    sum.textContent = g;
    det.appendChild(sum);
    for (const c of CONTROLS.filter((x) => x.g === g)) det.appendChild(ctrlRow(c));
    wrap.appendChild(det);
  }
}

function ctrlRow(c) {
  const row = document.createElement('div');
  row.className = 'ctrl';
  if (c.opts) {
    const lab = document.createElement('div');
    lab.className = 'lab';
    lab.textContent = c.label;
    const seg = document.createElement('div');
    seg.className = 'seg';
    for (const o of c.opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = String(o);
      b.dataset.v = String(o);
      b.onclick = () => { setValue(c.k, o); syncControls(); };
      seg.appendChild(b);
    }
    row.append(lab, seg);
    els.set(c.k, { seg });
  } else {
    const lab = document.createElement('div');
    lab.className = 'lab';
    lab.textContent = c.label;
    const num = document.createElement('input');
    num.type = 'number';
    num.inputMode = 'decimal';
    num.step = String(c.step);
    num.min = String(c.min);
    num.max = String(c.max);
    num.setAttribute('aria-label', c.label + ' 값');
    num.onchange = () => {
      const v = Number(num.value);
      if (Number.isFinite(v)) setValue(c.k, v);
      syncControls();
    };
    const rng = document.createElement('input');
    rng.type = 'range';
    rng.min = String(c.min);
    rng.max = String(c.max);
    rng.step = String(c.step);
    rng.setAttribute('aria-label', c.label);
    rng.oninput = () => setValue(c.k, Number(rng.value));
    row.append(lab, num, rng);
    els.set(c.k, { rng, num, c });
  }
  return row;
}

function syncControls() {
  for (const [k, e] of els) {
    const v = getPath(state.P, k);
    if (e.seg) {
      for (const b of e.seg.children) b.classList.toggle('on', b.dataset.v === String(v));
    } else {
      if (document.activeElement !== e.rng) e.rng.value = v;
      if (document.activeElement !== e.num) e.num.value = fmt(e.c, v);
    }
  }
}

/* ── 드래그 ─────────────────────────────────────────── */

let drag = null;
document.addEventListener('touchmove', (e) => { if (drag?.active) e.preventDefault(); }, { passive: false });

function onDown(e) {
  if (e.button > 0) return;
  const cell = e.target.closest?.('.cell');
  if (!cell || !cell.dataset.ch) return;
  drag = {
    ch: cell.dataset.ch, x0: e.clientX, y0: e.clientY,
    lastX: e.clientX, lastY: e.clientY,
    active: false, cancelled: false, timer: 0,
  };
  drag.timer = setTimeout(() => {
    if (!drag || drag.cancelled) return;
    drag.active = true;
    drag.ax = drag.lastX; drag.ay = drag.lastY;
    drag.w0 = state.P.stroke.weight;
    drag.f0 = state.P.frame.fit;
    document.body.classList.add('dragging');
  }, 300);
}

function onMove(e) {
  if (!drag) return;
  drag.lastX = e.clientX; drag.lastY = e.clientY;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
      drag.cancelled = true;
      clearTimeout(drag.timer);
    }
    return;
  }
  e.preventDefault();
  const dx = e.clientX - drag.ax;
  const dy = e.clientY - drag.ay;
  setPath(state.P, 'stroke.weight', quantize({ min: 10, max: 180, step: 1 }, drag.w0 + dx * 0.5));
  state.axisKey = 'stroke.weight';
  setPath(state.P, 'frame.fit', quantize({ min: 0, max: 1, step: 0.01 }, drag.f0 - dy * 0.004));
  save();
  schedule();
}

function onUp() {
  if (!drag) return;
  clearTimeout(drag.timer);
  const wasActive = drag.active;
  const ch = drag.ch, cancelled = drag.cancelled;
  drag = null;
  document.body.classList.remove('dragging');
  if (wasActive) schedule();
  else if (!cancelled) toggleSel(ch);
}

/* ── 축 값 직접 입력 ────────────────────────────────── */

function candidates(name) {
  const full = CONTROLS.filter((c) => c.k === name);
  if (full.length) return full;
  const short = CONTROLS.filter((c) => c.k.split('.').pop() === name);
  return short.length === 1 ? short : [];
}

function applyToken(key, raw) {
  const cs = candidates(key);
  if (cs.length !== 1) return false;
  const c = cs[0];
  if (c.opts) {
    const o = c.opts.find((x) => String(x) === raw);
    if (o === undefined) return false;
    setValue(c.k, o);
    return true;
  }
  const v = Number(raw);
  if (!Number.isFinite(v)) return false;
  setValue(c.k, v);
  return true;
}

function applyAxisLine(text) {
  const toks = text.trim().split(/\s+/).filter(Boolean);
  let n = 0;
  for (let i = 0; i + 1 < toks.length; i += 2) if (applyToken(toks[i], toks[i + 1])) n++;
  if (n) syncControls();
}

/* ── 프리셋·저장 ────────────────────────────────────── */

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state.P)); } catch {}
}

function loadSaved() {
  try {
    const t = localStorage.getItem(LS_KEY);
    return t ? JSON.parse(t) : null;
  } catch { return null; }
}

async function loadPresets() {
  const sel = $('#preset');
  let files = [];
  try {
    const idx = await (await fetch('presets/index.json')).json();
    files = Array.isArray(idx.files) ? idx.files : [];
  } catch { files = []; }

  sel.innerHTML = '';
  for (const f of files) {
    let name = f;
    try {
      const j = await (await fetch('presets/' + f)).json();
      state.presets[f] = j;
      name = j.meta?.name || f;
    } catch {}
    const o = document.createElement('option');
    o.value = f;
    o.textContent = name;
    sel.appendChild(o);
  }
  state.presetFile = files[0] || null;
  if (state.presetFile) sel.value = state.presetFile;
}

function applyPreset(file) {
  const raw = state.presets[file];
  if (!raw) return;
  try {
    state.P = resolvePreset(raw);
    state.axisKey = state.axisKey || 'stroke.weight';
    save();
    buildControls();
    render();
  } catch (e) {
    console.error(e);
  }
}

/* ── 내보내기 ───────────────────────────────────────── */

const FALLBACK_SAMPLE = SAMPLE_CHARS;
const listOf = (x) => (typeof x === 'string' ? [...x] : x);

async function resolveChars() {
  const mode = $('#range').value;
  let cs = null;
  try { cs = await import('./charsets.js'); } catch {}
  if (mode === '11172') {
    if (cs?.all11172) return listOf(typeof cs.all11172 === 'function' ? cs.all11172() : cs.all11172);
    const out = [];
    for (let i = 0; i < 11172; i++) out.push(String.fromCharCode(0xAC00 + i));
    return out;
  }
  if (mode === 'sample') return cs?.SAMPLE ? listOf(cs.SAMPLE) : FALLBACK_SAMPLE;
  try {
    const r = await fetch('data/ks2350.txt');
    if (r.ok) {
      const chars = [...(await r.text())].filter((ch) => ch.trim());
      if (chars.length) return chars;
    }
  } catch {}
  return cs?.SAMPLE ? listOf(cs.SAMPLE) : FALLBACK_SAMPLE;
}

function status(msg) { $('#exstatus').textContent = msg || ''; }

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

async function doUFO() {
  try {
    status('만드는 중');
    const chars = await resolveChars();
    const [{ buildUFO }, { makeZip }] = await Promise.all([
      import('./export-ufo.js'), import('./zip.js'),
    ]);
    const out = await buildUFO(state.P, chars, window.polygonClipping);
    const blob = out instanceof Blob ? out : await makeZip(out);
    download(blob instanceof Blob ? blob : new Blob([blob]), `${state.P.meta.id}.ufo.zip`);
    status('');
  } catch (e) {
    status('UFO 실패: ' + (e?.message || e));
  }
}

async function doOTF() {
  try {
    status('만드는 중');
    if (!window.opentype) throw new Error('opentype 없음');
    const chars = await resolveChars();
    const { buildOTF } = await import('./export-otf.js');
    const out = await buildOTF(window.opentype, state.P, chars, window.polygonClipping);
    download(out instanceof Blob ? out : new Blob([out]), `${state.P.meta.id}.otf`);
    status('');
  } catch (e) {
    status('OTF 실패: ' + (e?.message || e));
  }
}

function diff(base, cur) {
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (isObj(base) && isObj(cur)) {
    const o = {};
    for (const k of Object.keys(cur)) {
      if (!(k in base)) { o[k] = structuredClone(cur[k]); continue; }
      const d = diff(base[k], cur[k]);
      if (d !== undefined) o[k] = d;
    }
    return Object.keys(o).length ? o : undefined;
  }
  return JSON.stringify(base) === JSON.stringify(cur) ? undefined : structuredClone(cur);
}

function doJSON() {
  const d = diff(DEFAULTS, state.P) || {};
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  download(blob, `${state.P.meta.id}.json`);
}

// 바꾼 값만 한 줄 JSON 으로 클립보드에 복사(텔레그램에 붙여 넣기용)
async function doCopy(e) {
  const btn = e.currentTarget;
  const d = diff(DEFAULTS, state.P) || {};
  delete d.meta; // 설명문은 빼고 값만
  const text = JSON.stringify(d);
  try { await navigator.clipboard.writeText(text); }
  catch { window.prompt('길게 눌러 복사', text); return; }
  btn.textContent = '복사됨';
  setTimeout(() => { btn.textContent = '값 복사'; }, 1500);
}

/* ── 초기화 ─────────────────────────────────────────── */

function buildTabs() {
  const nav = $('#tabs');
  nav.innerHTML = '';
  for (const [label, key] of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.tab = key;
    b.onclick = () => { state.tab = key; render(); };
    nav.appendChild(b);
  }
}

function bind() {
  $('#sample').addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  $('#sample').addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); });

  $('#axisline').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyAxisLine(e.currentTarget.value);
  });

  const typing = $('#typing');
  typing.value = state.typed;
  typing.addEventListener('input', () => {
    state.typed = typing.value.slice(0, 400);
    if (state.typed) state.tab = 'input'; // 치기 시작하면 입력 탭으로
    schedule();
  });

  // 글자 크기(표본 표시 크기만, 글꼴 값 아님). 이 브라우저에 기억
  const gs = $('#gsize'), gv = $('#gsizeval');
  const setG = (v) => { $('#sample').style.setProperty('--g', v + 'px'); gs.value = v; gv.textContent = v + 'px'; };
  let g0 = 0; try { g0 = +localStorage.getItem('talnemo.gsize') || 0; } catch {}
  setG(g0 || parseInt(getComputedStyle($('#sample')).getPropertyValue('--g')) || 96);
  gs.addEventListener('input', () => { setG(+gs.value); try { localStorage.setItem('talnemo.gsize', gs.value); } catch {} });

  $('#preset').addEventListener('change', (e) => applyPreset(e.currentTarget.value));
  $('#reset').addEventListener('click', () => { if (state.presetFile) applyPreset(state.presetFile); });
  $('#ufo').addEventListener('click', doUFO);
  $('#otf').addEventListener('click', doOTF);
  $('#json').addEventListener('click', doJSON);
  $('#copy').addEventListener('click', doCopy);
}

async function boot() {
  buildTabs();
  bind();
  await loadPresets();

  const saved = loadSaved();
  if (saved) {
    try { state.P = resolvePreset(saved); } catch {}
  } else if (state.presetFile && state.presets[state.presetFile]) {
    try { state.P = resolvePreset(state.presets[state.presetFile]); } catch {}
  }
  buildControls();
  render();
}

boot();
