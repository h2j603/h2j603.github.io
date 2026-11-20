// UFO 3 내보내기. 브라우저·Node 공용(fs 없음): {상대경로: 문자열} 만 낸다.
import { mergeContours } from './merge.js?v=c6a6458';
// 자소 글리프 = 로컬 좌표 외곽선 / 음절 글리프 = 자소 컴포넌트 조합.
import { CHO, JUNG, JONG, glyphName, jamoUnicode } from './jamo.js?v=c6a6458';
import { layoutSyllable, layoutJamo } from './layout.js?v=c6a6458';

const K = 0.5522847498; // 4점 원의 베지어 계수

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function plistValue(v, ind) {
  const pad = '  '.repeat(ind);
  if (Array.isArray(v)) return pad + '<array>\n' + v.map(x => plistValue(x, ind + 1)).join('') + pad + '</array>\n';
  if (v && typeof v === 'object') {
    return pad + '<dict>\n'
      + Object.entries(v).map(([k, x]) => pad + '  <key>' + esc(k) + '</key>\n' + plistValue(x, ind + 1)).join('')
      + pad + '</dict>\n';
  }
  if (typeof v === 'number') {
    const t = Number.isInteger(v) ? 'integer' : 'real';
    return pad + '<' + t + '>' + v + '</' + t + '>\n';
  }
  if (typeof v === 'boolean') return pad + '<' + v + '/>\n';
  return pad + '<string>' + esc(v) + '</string>\n';
}

function plist(obj) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
    + '<plist version="1.0">\n' + plistValue(obj, 0) + '</plist>\n';
}

// UFO 글리프 파일명: 대문자 뒤에 _ (fontTools userNameToFileName 규칙). '.' 는 그대로
export function glifFileName(name) {
  let s = '';
  for (const ch of name) s += ch !== ch.toLowerCase() ? ch + '_' : ch;
  return s + '.glif';
}

// 자소 part → 로컬 좌표(정수) 외곽선 + 외곽 너비 반올림
export function localPart(part, pc) {
  const [ox, oy] = part.origin;
  const src = pc && part.kinds ? mergeContours(part.contours, part.kinds, pc) : part.contours;
  const contours = src.map(c => c.map(k => {
    if (k[0] === 'Z') return k;
    const o = [k[0]];
    for (let i = 1; i < k.length; i += 2) o.push(Math.round(k[i] - ox), Math.round(k[i + 1] - oy));
    return o;
  }));
  let x0 = Infinity, x1 = -Infinity;
  for (const c of contours) for (const k of c) {
    if (k[0] === 'Z') continue;
    for (let i = 1; i < k.length; i += 2) { x0 = Math.min(x0, k[i]); x1 = Math.max(x1, k[i]); }
  }
  return { contours, advance: Number.isFinite(x0) ? x1 - x0 : 0 };
}

function localSkeleton(part) {
  const [ox, oy] = part.origin;
  return part.skeleton.map(q => q.t === 'line'
    ? { t: 'line', pts: q.pts.map(([x, y]) => [Math.round(x - ox), Math.round(y - oy)]) }
    : { t: q.t, c: [Math.round(q.c[0] - ox), Math.round(q.c[1] - oy)], d: Math.round(q.d) });
}

const shapeKey = contours => JSON.stringify(contours);

// 명령 윤곽 → glif 점 목록. 닫힌 윤곽은 M 점을 끝으로 돌려 중복을 없앤다
function contourPoints(c, closed) {
  const m = c[0];
  const segs = [];
  for (let i = 1; i < c.length; i++) {
    const k = c[i];
    if (k[0] === 'L') segs.push({ type: 'line', offs: [], on: [k[1], k[2]] });
    else if (k[0] === 'C') segs.push({ type: 'curve', offs: [[k[1], k[2]], [k[3], k[4]]], on: [k[5], k[6]] });
    else break;
  }
  const start = [m[1], m[2]];
  if (!closed) {
    const pts = [{ x: start[0], y: start[1], type: 'move' }];
    for (const s of segs) {
      for (const o of s.offs) pts.push({ x: o[0], y: o[1], type: 'offcurve' });
      pts.push({ x: s.on[0], y: s.on[1], type: s.type });
    }
    return pts;
  }
  const last = segs.length ? segs[segs.length - 1] : { on: start, type: 'line', offs: [] };
  const pts = [];
  if (last.on[0] === start[0] && last.on[1] === start[1]) {
    // 마지막 구간이 시작점으로 돌아온다: 그 구간 점을 앞으로 옮겨 시작점 중복을 없앤다
    for (const o of last.offs) pts.push({ x: o[0], y: o[1], type: 'offcurve' });
    pts.push({ x: start[0], y: start[1], type: last.type });
    for (const s of segs.slice(0, -1)) {
      for (const o of s.offs) pts.push({ x: o[0], y: o[1], type: 'offcurve' });
      pts.push({ x: s.on[0], y: s.on[1], type: s.type });
    }
  } else {
    pts.push({ x: start[0], y: start[1], type: 'line' });
    for (const s of segs) {
      for (const o of s.offs) pts.push({ x: o[0], y: o[1], type: 'offcurve' });
      pts.push({ x: s.on[0], y: s.on[1], type: s.type });
    }
  }
  return pts;
}

// 골격 → 배경 레이어 점 목록
function skeletonPoints(part) {
  return localSkeleton(part).map(q => {
    if (q.t === 'line') return { closed: false, pts: q.pts.map(([x, y], i) => ({ x, y, type: i ? 'line' : 'move' })) };
    const [cx, cy] = q.c, r = q.d / 2, k = r * K;
    if (q.t === 'circle') {
      const rv = (q.dy ?? q.d) / 2, kv = rv * K; // 타원이면 세로 반지름이 다르다
      return { closed: true, pts: [
        { x: cx, y: cy + rv, type: 'curve' },
        { x: cx - k, y: cy + rv, type: 'offcurve' }, { x: cx - r, y: cy + kv, type: 'offcurve' }, { x: cx - r, y: cy, type: 'curve' },
        { x: cx - r, y: cy - kv, type: 'offcurve' }, { x: cx - k, y: cy - rv, type: 'offcurve' }, { x: cx, y: cy - rv, type: 'curve' },
        { x: cx + k, y: cy - rv, type: 'offcurve' }, { x: cx + r, y: cy - kv, type: 'offcurve' }, { x: cx + r, y: cy, type: 'curve' },
        { x: cx + r, y: cy + kv, type: 'offcurve' }, { x: cx + k, y: cy + rv, type: 'offcurve' },
      ] };
    }
    return { closed: true, pts: [
      { x: cx - r, y: cy - r, type: 'line' }, { x: cx + r, y: cy - r, type: 'line' },
      { x: cx + r, y: cy + r, type: 'line' }, { x: cx - r, y: cy + r, type: 'line' },
    ] };
  }).map(sk => ({ closed: sk.closed, pts: sk.pts.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), type: p.type })) }));
}

function glif({ name, advance, unicode, contours, components, skeleton }) {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n<glyph name="' + esc(name) + '" format="2">\n';
  s += '  <advance width="' + advance + '"/>\n';
  if (unicode != null) s += '  <unicode hex="' + unicode.toString(16).toUpperCase().padStart(4, '0') + '"/>\n';
  const shapes = [];
  for (const c of components || []) {
    shapes.push('    <component base="' + esc(c.base) + '" xOffset="' + c.x + '" yOffset="' + c.y + '"/>\n');
  }
  for (const c of contours || []) {
    shapes.push('    <contour>\n' + contourPoints(c, true)
      .map(p => '      <point x="' + p.x + '" y="' + p.y + '" type="' + p.type + '"/>\n').join('') + '    </contour>\n');
  }
  for (const sk of skeleton || []) {
    shapes.push('    <contour>\n' + sk.pts
      .map(p => '      <point x="' + p.x + '" y="' + p.y + '" type="' + p.type + '"/>\n').join('') + '    </contour>\n');
  }
  if (shapes.length) s += '  <outline>\n' + shapes.join('') + '  </outline>\n';
  return s + '</glyph>\n';
}

const uniName = ch => 'uni' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');

export function buildUFO(P, chars, pc) {
  const id = P.meta.id;
  const root = id + '.ufo/';
  const files = {};

  // 자소 67개(초성·중성·종성)
  const jamos = [];
  for (const [slot, list] of [['cho', CHO], ['jung', JUNG], ['jong', JONG]]) {
    for (const ch of list) {
      const part = layoutJamo(P, slot, ch);
      const { contours, advance } = localPart(part, pc);
      jamos.push({ name: glyphName(slot, ch), slot, ch, unicode: jamoUnicode(slot, ch), contours, advance, skeleton: skeletonPoints(part) });
    }
  }
  const baseOf = new Map(jamos.map(r => [r.slot + '|' + r.ch, r]));

  // 음절: 자소 로컬 외곽선이 기준과 다르면 변형 글리프
  const variants = [];
  const variantOf = new Map();
  const vCount = new Map();
  const syllables = [];
  const seen = new Set();
  for (const ch of chars) {
    const g = layoutSyllable(P, ch);
    if (!g) continue;
    const name = uniName(ch);
    if (seen.has(name)) continue;
    seen.add(name);
    const comps = g.parts.map(part => {
      const base = baseOf.get(part.slot + '|' + part.jamo);
      const { contours, advance } = localPart(part, pc);
      if (shapeKey(contours) === shapeKey(base.contours)) return { base: base.name, x: part.origin[0], y: part.origin[1] };
      const vk = base.name + '|' + shapeKey(contours);
      let vname = variantOf.get(vk);
      if (!vname) {
        vname = base.name + '.v' + ((vCount.get(base.name) || 0) + 1);
        vCount.set(base.name, vCount.get(base.name) + 1);
        variantOf.set(vk, vname);
        variants.push({ name: vname, contours, advance, skeleton: skeletonPoints(part) });
      }
      return { base: vname, x: part.origin[0], y: part.origin[1] };
    });
    syllables.push({ name, unicode: ch.codePointAt(0), advance: g.advance, components: comps });
  }

  files[root + 'metainfo.plist'] = plist({ creator: 'talnemo-font', formatVersion: 3 });
  files[root + 'fontinfo.plist'] = plist({
    familyName: 'Talnemo', styleName: id,
    unitsPerEm: P.font.upm, ascender: P.font.ascender, descender: P.font.descender,
  });
  files[root + 'layercontents.plist'] = plist([['public.default', 'glyphs'], ['public.background', 'glyphs.public.background']]);
  files[root + 'lib.plist'] = plist({
    'public.glyphOrder': [...jamos.map(r => r.name), ...variants.map(r => r.name), ...syllables.map(r => r.name)],
  });

  const contents = {}, bgContents = {};
  for (const r of [...jamos, ...variants]) {
    const fn = glifFileName(r.name);
    contents[r.name] = fn;
    bgContents[r.name] = fn;
    files[root + 'glyphs/' + fn] = glif({ name: r.name, advance: r.advance, unicode: r.unicode, contours: r.contours });
    files[root + 'glyphs.public.background/' + fn] = glif({ name: r.name, advance: r.advance, skeleton: r.skeleton });
  }
  for (const s of syllables) {
    const fn = glifFileName(s.name);
    contents[s.name] = fn;
    files[root + 'glyphs/' + fn] = glif({ name: s.name, advance: s.advance, unicode: s.unicode, components: s.components });
  }
  files[root + 'glyphs/contents.plist'] = plist(contents);
  files[root + 'glyphs.public.background/contents.plist'] = plist(bgContents);
  return files;
}
