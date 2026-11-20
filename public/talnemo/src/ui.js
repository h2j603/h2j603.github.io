// 탈네모 프로토타이퍼 UI. 값과 결과만 보여 준다. 조형 판단은 사용자 몫.
import { DEFAULTS, CONTROLS, SHIFT_CASES, shiftCase, pruneUnknown, getPath, setPath, merge, resolvePreset } from './schema.js?v=662cad7';
import { layoutSyllable, layoutJamo } from './layout.js?v=662cad7';
import { contourToPathD } from './outline.js?v=662cad7';
import { CHO, JUNG, JONG, VCLASS, decompose } from './jamo.js?v=662cad7';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const SAMPLE_CHARS = [...'가고과의각곡꿈똠없닭앎핥뷁쀍왜'];
const AXIS_CHARS = [...'각곡꿈없닭'];
const TABS = [['글자', 'chars'], ['문장', 'sentence'], ['이름', 'name'], ['자소', 'jamo'], ['축 단독', 'axis'], ['입력', 'input']];
const LS_KEY = 'talnemo.p.v1';
const VER = new URL(import.meta.url).search; // 배포본은 ?v=<커밋> — 프리셋 JSON도 같은 버전으로 받아 폰 캐시를 피한다

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
    (sel ? s.parts.map((p) => `<path data-slot="${p.slot}" d="${pathOf([p])}" fill="#000" fill-rule="nonzero"/>`).join('')
      : `<path d="${d}" fill="#000" fill-rule="nonzero"/>`) + `</svg></div>`;
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
      out += `<ellipse cx="${k.c[0].toFixed(1)}" cy="${(a - k.c[1]).toFixed(1)}" rx="${(k.d / 2).toFixed(1)}" ry="${((k.dy ?? k.d) / 2).toFixed(1)}" fill="none" stroke="#1F3BFF" stroke-width="1.5"/>`;
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
  const d = state.sel && decompose(state.sel.codePointAt(0)); // 고른 글자의 경우로 위치 막대를 맞춘다
  if (d) state.shiftCase = shiftCase(VCLASS[d.jung]);
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
    if (g === '위치') det.append(...caseRows());
    for (const c of CONTROLS.filter((x) => x.g === g)) {
      const row = ctrlRow(c);
      if (c.shiftCase) row.dataset.case = c.shiftCase;
      det.appendChild(row);
    }
    wrap.appendChild(det);
  }
}

// 위치 묶음: 경우·자리를 골라 그 x·y 막대만 보인다(선택은 화면 상태, 값은 P.shift)
function segRow(label, id, items, onPick) {
  const row = document.createElement('div');
  row.className = 'ctrl';
  const lab = document.createElement('div');
  lab.className = 'lab';
  lab.textContent = label;
  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.id = id;
  for (const [v, name] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.dataset.v = v;
    b.onclick = () => { onPick(v); syncCase(); };
    seg.appendChild(b);
  }
  row.append(lab, seg);
  return row;
}
function caseRows() {
  return [segRow('경우', 'shift-case', SHIFT_CASES, (v) => { state.shiftCase = v; })];
}
function syncCase() {
  const c = state.shiftCase || 'V';
  for (const b of document.querySelectorAll('#shift-case button')) b.classList.toggle('on', b.dataset.v === c);
  for (const r of document.querySelectorAll('#controls [data-case]')) r.hidden = r.dataset.case !== c;
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
  syncCase();
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
  // 고른 글자의 종성을 누르면 바로 끌어 옮긴다(받침 위치 예외 P.shift)
  if (cell.classList.contains('sel') && e.target.dataset?.slot === 'jong') {
    const d = decompose(cell.dataset.ch.codePointAt(0));
    const c = shiftCase(VCLASS[d.jung]);
    const k = `shift.${c}.jong`;
    state.shiftCase = c;
    drag = { part: true, ch: cell.dataset.ch, k, x0: e.clientX, y0: e.clientY,
      vx: getPath(state.P, k + 'X'), vy: getPath(state.P, k + 'Y'),
      upp: 1 / (e.target.ownerSVGElement.getScreenCTM()?.a || 1), active: false, cancelled: false };
    e.preventDefault();
    syncControls();
    return;
  }
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
  if (drag.part) {
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.active && Math.hypot(dx, dy) < 4) return;
    drag.active = true;
    e.preventDefault();
    const c = CONTROLS.find((x) => x.k === drag.k + 'X');
    setPath(state.P, drag.k + 'X', quantize(c, drag.vx + dx * drag.upp));
    setPath(state.P, drag.k + 'Y', quantize(c, drag.vy - dy * drag.upp)); // 화면 아래 = y 감소
    save();
    schedule();
    return;
  }
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
  if (drag.part) {
    const { active, ch } = drag;
    drag = null;
    if (!active) toggleSel(ch);
    return;
  }
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

// 저장은 "프리셋 위에서 바꾼 것"만 남긴다. 프리셋(기본값)이 나중에 바뀌어도 손대지 않은 값은 새 기본값을 따른다
function save() {
  try {
    const base = state.presets[state.presetFile];
    const rec = base ? { base: state.presetFile, d: diff(resolvePreset(base), state.P) || {} } : state.P;
    localStorage.setItem(LS_KEY, JSON.stringify(rec));
  } catch {}
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
    const idx = await (await fetch('presets/index.json' + VER)).json();
    files = Array.isArray(idx.files) ? idx.files : [];
  } catch { files = []; }

  sel.innerHTML = '';
  for (const f of files) {
    let name = f;
    try {
      const j = await (await fetch('presets/' + f + VER)).json();
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
  try { cs = await import('./charsets.js?v=662cad7'); } catch {}
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
      import('./export-ufo.js?v=662cad7'), import('./zip.js?v=662cad7'),
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
    const { buildOTF } = await import('./export-otf.js?v=662cad7');
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
  if (saved && saved.base && state.presets[saved.base]) {
    try { state.presetFile = saved.base; state.P = merge(resolvePreset(state.presets[saved.base]), pruneUnknown(saved.d)); } catch {}
  } else if (saved) {
    try { state.P = resolvePreset(pruneUnknown(saved)); } catch {} // 예전 형식(전체 값)
  } else if (state.presetFile && state.presets[state.presetFile]) {
    try { state.P = resolvePreset(state.presets[state.presetFile]); } catch {}
  }
  buildControls();
  render();
  debugStamp();
}

// ?debug: 실기기 확인용. 실제로 불러온 코드 버전과 ㅁ 관련 값을 화면 구석에 찍는다
function debugStamp() {
  if (!/[?&]debug\b/.test(location.search)) return;
  const v = new URL(import.meta.url).searchParams.get('v') || 'dev';
  const g = layoutSyllable(state.P, '마').parts[0];
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:99;background:#000;color:#fff;font:12px/1.4 monospace;padding:6px 8px;white-space:pre';
  el.textContent = `v ${v}\ncap ${state.P.stroke.cap} · mSquare ${state.P.cons.mSquare}\nㅁ 모서리 원판 ${g.kinds.filter(k => k === 'joint').length}`;
  document.body.appendChild(el);
}

// 뒤로가기 캐시(bfcache)로 되살아난 페이지는 예전 코드를 그대로 쓰므로 새로 불러온다
addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

boot();
