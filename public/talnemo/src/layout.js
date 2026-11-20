// 배치 규칙: (초성, 중성, 종성) → 자리마다 상자·골격 → 외곽선.
// 계산은 y-아래 로컬 좌표, 마지막에 폰트 좌표(y-위)로 바꾼다.
import { STROKES, SIMPLE, PAIR, SQUARE_JAMO, VCLASS, COMPOUND, verticalVowel, horizontalVowel, decompose } from './jamo.js?v=2d2dd1b';
import { strokeOpen, strokeClosed, strokeCircle, mapContour, reverseContour } from './outline.js?v=2d2dd1b';
import { filletPatches } from './fillet.js?v=2d2dd1b';

const DBL = 'ㅐㅒㅔㅖㅙㅞ'; // 두 기둥 모음: vowel.dblThin 이 기둥(세로획) 가로 너비만 줄인다
const isVert = (q) => q.t === 'line' && q.pts.length === 2 && Math.abs(q.pts[0][0] - q.pts[1][0]) < 1e-6;

// 종성 y 고정 기준(로컬 y-아래): 이 글자의 모음과 무관하게 '알'의 받침 자리 = 초성 아래끝 · 세로 기둥 아래끝 중 아래
function fixedJongRef(P, pl, choBox) {
  const V = P.vowel, wt = P.stroke.weight, hw = wt / 2;
  const choB = choBox.y + choBox.h, vB = pl.vY + V.stem + wt;
  return Math.max(choB, vB); // 기준 = '알'(세로모음) 받침 자리. ㅜ 꼭지는 기준에 넣지 않는다(11/20 혁님: 알과 같은 위치)
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lerp = (a, b, t) => a + (b - a) * t;

function matchRule(r, ctx) {
  const w = r.when || {};
  if ('jong' in w && w.jong !== !!ctx.jong) return false;
  if (w.vclass && w.vclass !== ctx.vclass) return false;
  for (const k of ['cho', 'jung']) if (w[k] && !w[k].includes(ctx[k])) return false;
  if (w.jongJamo && !(ctx.jong && w.jongJamo.includes(ctx.jong))) return false;
  return true;
}

// 받침 5갈래(김주성체 구조): 세로 / 가로·홑기둥 / 가로·겹기둥 / 섞임·홑기둥 / 섞임·겹기둥.
// 홑/겹의 실제 소속은 원문에 없어 꼭지·기둥이 둘인 모음을 겹으로 임시 분류했다

function slotMods(P, ctx) {
  const m = { cho: {}, jung: {}, jong: {}, place: {} };
  for (const r of P.rules || []) if (matchRule(r, ctx)) {
    if (r.slot) Object.assign(m[r.slot], r);
    if (r.place) Object.assign(m.place, r.place);   // 배치 규칙을 조건부로 덮어쓴다(예: 겹기둥이면 jongX 바꿈)
  }
  return m;
}

// 자음 상자 크기
function consSize(P, ch, slot, mod) {
  const sw = slot === 'jong' ? P.jong.scaleW : 1, sh = slot === 'jong' ? P.jong.scaleH : 1;
  let w = P.cons.w * sw, h = P.cons.h * sh;
  // 획수 기반 크기: 1획 = strokeMin 배, 4획 = 1배, 사이는 직선 보간. ㅇ은 예외(자기 기준을 따름)
  if (ch !== 'ㅇ' && P.cons.strokeMin !== 1) {
    const n = PAIR[ch] ? Math.max(...PAIR[ch].split('').map(c => STROKES[c])) : STROKES[ch];
    const f = P.cons.strokeMin + (1 - P.cons.strokeMin) * (Math.min(n, 4) - 1) / 3;
    if (P.cons.strokeAxis !== 'h') w *= f;
    if (P.cons.strokeAxis !== 'w') h *= f;
  }
  if (PAIR[ch]) w *= P.cons.pairW;
  else if (SQUARE_JAMO.has(ch) && !(ch === 'ㅁ' && P.cons.mSquare === false)) {
    // 한 변 기준: 자리·자소별 지정(same 이면 공통 기준 cons.squareRef). bar = 가로모음 가로줄 잉크 폭
    let ref = P.cons.squareRef;
    const own = slot === 'jong' ? P.jong.squareRef : ch === 'ㅇ' ? P.cons.ngCho : P.cons.mCho;
    if (own && own !== 'same') ref = own;
    const s = ref === 'w' ? w : ref === 'min' ? Math.min(w, h) : ref === 'bar' ? P.vowel.bar + P.stroke.weight : h;
    // ㅇ 정원 깨기: 높이는 기준 그대로, 폭은 다른 자음 폭
    w = ch === 'ㅇ' && P.cons.ngRound === false ? P.cons.w * sw : s; h = s;
  }
  w *= mod.scaleW ?? 1; h *= mod.scaleH ?? 1;
  return { w, h };
}

// 자음 골격: 정규화 프리미티브를 상자에 매핑(획 굵기만큼 안쪽으로)
function consPrims(P, ch, box) {
  const hw = P.stroke.weight / 2;
  if (PAIR[ch]) {
    const [a, b] = PAIR[ch].split('');
    const g = P.cons.pairGap;
    const half = (box.w - g) / 2;
    return [
      ...consPrims(P, a, { x: box.x, y: box.y, w: half, h: box.h }),
      ...consPrims(P, b, { x: box.x + half + g, y: box.y, w: half, h: box.h }),
    ];
  }
  const X = u => box.x + hw + u * Math.max(0, box.w - 2 * hw);
  const Y = v => box.y + hw + v * Math.max(0, box.h - 2 * hw);
  // ㅁ 정사각형 규칙을 끄면 다른 자음처럼 상자 비율을 따르는 닫힌 사각 획
  const src = ch === 'ㅁ' && P.cons.mSquare === false ? [{ t: 'line', pts: [[.5, 0], [1, 0], [1, 1], [0, 1], [0, 0], [.5, 0]] }] : SIMPLE[ch];
  return src.map(p => p.t === 'line'
    ? { t: 'line', pts: p.pts.map(([u, v]) => [X(u), Y(v)]) }
    : { t: p.t, va: p.va, box: [X(p.box[0]), Y(p.box[1]), X(p.box[2]), Y(p.box[3])] });
}

function shiftPrims(prims, dx, dy) {
  return prims.map(p => p.t === 'line'
    ? { t: 'line', pts: p.pts.map(([x, y]) => [x + dx, y + dy]) }
    : { t: p.t, va: p.va, box: [p.box[0] + dx, p.box[1] + dy, p.box[2] + dx, p.box[3] + dy] });
}

function primsBounds(prims, hw) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const p of prims) {
    if (p.t === 'line') p.pts.forEach(([x, y]) => add(x, y));
    else { add(p.box[0], p.box[1]); add(p.box[2], p.box[3]); }
  }
  return { x: x0 - hw, y: y0 - hw, w: x1 - x0 + 2 * hw, h: y1 - y0 + 2 * hw };
}

// 정사각형·정원: 상자 안 최대 정사각형/원을 가운데에 둔다
function inscribed(b, va) {
  const w = b[2] - b[0], h = b[3] - b[1], s = Math.min(w, h);
  const cx = (b[0] + b[2]) / 2, cy = va === 'bottom' ? b[3] - s / 2 : (b[1] + b[3]) / 2;
  return { cx, cy, s, set: { w, h } };
}

export function layoutSyllable(P, char, opt = {}) {
  const d = typeof char === 'string' ? decompose(char.codePointAt(0)) : char;
  if (!d) return null;
  const { cho, jung, jong } = d;
  const vclass = VCLASS[jung];
  const ctx = { cho, jung, jong, vclass };
  const mods = slotMods(P, ctx);
  const wt = P.stroke.weight, hw = wt / 2;
  const pl = { ...P.place, ...mods.place }, V = P.vowel;
  const parts = [];

  // 초성
  const cs = consSize(P, cho, 'cho', mods.cho);
  const choBox = { x: mods.cho.dx || 0, y: mods.cho.dy || 0, ...cs };

  // 중성
  let upperBottom = choBox.y + choBox.h;
  let stemPart = null;          // 기둥이 있는 세로 부분(받침까지 늘임 대상)
  let stemX = null;
  const up = V.stemUp || 0;     // 기둥 위로 늘림: 위끝만 올라가고 아래끝·곁줄기 자리는 그대로
  const vOpts = (stem) => ({ stem: stem + up, branch: V.branch, branchY: V.branchY + up, branchGap: V.branchGap, dbl: V.dbl });
  const hOpts = { bar: V.bar, tick: V.tick, tickX: V.tickX, tickGap: V.tickGap };
  const jm = mods.jung;
  const jungPrims = [];

  if (vclass === 'V') {
    const vv = verticalVowel(jung, vOpts(jm.stem ?? V.stem));
    // ㅓㅕㅔㅖ: 기둥을 왼쪽으로 들여 곁줄기가 초성 쪽 빈자리를 쓴다(곁줄기 길이만큼 들이면 어 너비 = 이 너비)
    const inB = 'ㅓㅕㅔㅖ'.includes(jung) ? Math.min(pl.branchIn || 0, V.branch) : 0;
    const ox = choBox.x + choBox.w + pl.gapCV + hw + (jm.dx || 0) - inB;
    const oy = pl.vY - up + hw + (jm.dy || 0);
    stemPart = { prims: shiftPrims(vv.prims, ox, oy), kind: 'V' };
    jungPrims.push(stemPart);
    stemX = ox;
  } else {
    const hName = vclass === 'H' ? jung : COMPOUND[jung][0];
    const hv = horizontalVowel(hName, hOpts);
    let barX = 0;
    if (pl.hAlign === 'center') {
      const d = (hv.w + wt - choBox.w) / 2;
      if (d > 0) choBox.x += d; else barX = -d;
    }
    const oy0 = choBox.y + choBox.h + pl.gapCH + hw + (jm.dy || 0);
    // ㅡ: 가로줄 아래끝을 '아'(같은 초성+세로모음)의 아랫단에 맞춘다. 초성과 겹치지 않게 가로줄 굵기만큼은 띄운다
    const euY = () => {
      const vBottom = Math.max(choBox.y + choBox.h, pl.vY + V.stem + wt);
      return Math.max(vBottom - hw, choBox.y + choBox.h + wt) + (jm.dy || 0);
    };
    // 가로줄 높이 고정: ㅗㅛㅜㅠ(섞임 포함)도 가로줄을 ㅡ 가로줄 높이에 둔다. 꼭지만 위·아래로 뻗는다(ㅏㅓㅣ 기둥 고정과 같은 생각)
    const oyOf = (name) => {
      const eu = pl.euBase === 'stem' ? euY() : oy0;             // ㅡ 의 가로줄 y(로컬 y-아래)
      if (pl.hBarY === 'fixed') return eu - ('ㅗㅛ'.includes(name) ? V.tick : 0); // ㅗㅛ 는 꼭지가 위라 가로줄이 로컬 y = tick
      return name === 'ㅡ' ? eu : oy0;
    };
    const oy = oyOf(hName);

    const hp = shiftPrims(hv.prims, barX + hw + (jm.dx || 0), oy);
    jungPrims.push({ prims: hp, kind: 'H' });
    upperBottom = oy + hv.h + hw;
    if (vclass === 'C') {
      const vName = COMPOUND[jung][1];
      let stem = jm.stem ?? V.stem;
      const top = pl.vY - up;
      if (pl.compoundStem === 'bar') stem = Math.max(stem, upperBottom - top - wt - up);
      const vv = verticalVowel(vName, vOpts(stem));
      // 섞임의 세로 부분 = 홀로 쓴 세로모음과 같은 자리(와의 ㅏ = 아의 ㅏ, 궈의 ㅓ = 거의 ㅓ). 가로줄 끝은 기준에 넣지 않는다
      const inBc = 'ㅓㅔ'.includes(vName) ? Math.min(pl.branchIn || 0, V.branch) : 0;
      const ox = choBox.x + choBox.w + pl.gapCV + hw - inBc;
      stemPart = { prims: shiftPrims(vv.prims, ox, top + hw), kind: 'V' };
      jungPrims.push(stemPart);
      stemX = ox;
    }
  }
  const jungAll = jungPrims.flatMap(j => j.prims);

  // 종성
  let jongBox = null;
  if (jong) {
    const js = consSize(P, jong, 'jong', mods.jong);
    const right = Math.max(choBox.x + choBox.w, primsBounds(jungAll, hw).x + primsBounds(jungAll, hw).w);
    let x = choBox.x;
    if (pl.jongX === 'center') x = (right - js.w) / 2;
    else if (pl.jongX === 'stem' && stemX != null) x = stemX + hw - js.w;
    else if (pl.jongX === 'right') x = right - js.w;
    else if (pl.jongX === 'lastStem') {
      // 들숨 방식: 받침 오른끝 = 마지막 기둥 오른끝(곁줄기 제외). 기둥 없는 가로모음은 right 와 같다
      const xs = stemPart ? stemPart.prims.filter(isVert).map(q => q.pts[0][0]) : [];
      x = (xs.length ? Math.max(...xs) + hw : right) - js.w;
    }
    else if (pl.jongX === 'vowel') {
      // 홀자 정중앙 아래. 겹받침은 앞 자소를 중앙에 두고 뒤 자소가 오른쪽으로 나간다
      const jb = primsBounds(jungAll, hw);
      const cxv = jb.x + jb.w / 2;
      const anchorW = PAIR[jong] && pl.pairOverhang ? (js.w - P.cons.pairGap) / 2 : js.w;
      x = cxv - anchorW / 2;
    }
    // 종성 y: cho = 초성·가로모음 아래 / vowel = 이 글자 모음 전체 아래 / fixed = 모음 길이와 무관한 고정 자리
    //   fixed: 세로·가로·섞임 모두 '알'의 받침 자리. ㅡ 가 짧다고 올라오지 않고, ㅜ 꼭지가 길다고 내려가지 않는다
    const jbot = primsBounds(jungAll, hw).y + primsBounds(jungAll, hw).h;
    const baseY = pl.jongY === 'vowel' ? Math.max(upperBottom, jbot)
      : pl.jongY === 'fixed' ? fixedJongRef(P, pl, choBox)
      : upperBottom;
    jongBox = { x: x + (mods.jong.dx || 0), y: baseY + pl.gapVJ + (mods.jong.dy || 0), ...js };
    // 기둥을 종성 아래끝까지
    if (pl.stemSpanJong && stemPart) {
      const target = jongBox.y + jongBox.h - hw;
      stemPart.prims = stemPart.prims.map(p => {
        const [a, b] = [p.pts[0], p.pts[p.pts.length - 1]];
        const vertical = p.pts.length === 2 && Math.abs(a[0] - b[0]) < 1e-6;
        if (!vertical) return p;
        const ys = [a[1], b[1]];
        return { t: 'line', pts: [[a[0], Math.min(...ys)], [a[0], Math.max(Math.max(...ys), target)]] };
      });
    }
  }

  const rawParts = [
    { slot: 'cho', jamo: cho, prims: consPrims(P, cho, choBox), setBox: choBox },
    { slot: 'jung', jamo: jung, prims: jungPrims.flatMap(j => j.kind === 'V' && DBL.includes(jung) && P.vowel.dblThin
      ? j.prims.map(q => isVert(q) ? { ...q, thin: true } : q) : j.prims) },
  ];
  if (jong) rawParts.push({ slot: 'jong', jamo: jong, prims: consPrims(P, jong, jongBox), setBox: jongBox });

  // 받침 위치 예외(P.shift): 받침 있는 글자의 종성만 평행이동. 로컬 좌표는 y-아래라 Y 부호를 뒤집는다
  const sh = jong && P.shift?.[vclass === 'H' ? 'H' : 'V']; // 섞임 = 세로 쪽(책: 맘과 같은 받침 자리)
  const jp = sh && rawParts.find((p) => p.slot === 'jong');
  if (jp && (sh.jongX || sh.jongY)) {
    const dx = sh.jongX || 0, dy = -(sh.jongY || 0);
    jp.prims = shiftPrims(jp.prims, dx, dy);
    jp.setBox = { ...jp.setBox, x: jp.setBox.x + dx, y: jp.setBox.y + dy };
  }

  // 자연 크기 경계
  let bb = null;
  for (const p of rawParts) {
    const b = primsBounds(p.prims, hw);
    bb = bb ? { x0: Math.min(bb.x0, b.x), y0: Math.min(bb.y0, b.y), x1: Math.max(bb.x1, b.x + b.w), y1: Math.max(bb.y1, b.y + b.h) } : { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  }
  // 기둥 위로 늘림은 정렬 기준에서 뺀다: 늘린 만큼 초성 위로 솟고, 글자 나머지는 제자리
  if (up && stemPart) {
    const tops = rawParts.map((p) => {
      const t = primsBounds(p.prims, hw).y;
      return p.slot === 'jung' && Math.abs(t - (pl.vY - up + (jm.dy || 0))) < 1e-6 ? t + up : t;
    });
    bb.y0 = Math.min(...tops);
  }
  const natW = bb.x1 - bb.x0, natH = bb.y1 - bb.y0;

  // 탈네모 축: fit 0 = 맞춤 틀 안으로 비균등 축소/확대, 1 = 자연 크기
  const fit = opt.fit ?? P.frame.fit;
  const sx = lerp(P.frame.fitBox / natW, 1, fit), sy = lerp(P.frame.fitBox / natH, 1, fit);
  const T = (x, y) => [(x - bb.x0) * sx, (y - bb.y0) * sy];

  const exp = opt.noExp ? { jitter: 0, rotate: 0, seed: 1 } : P.exp;
  const r = rng((exp.seed * 7919) ^ (typeof char === 'string' ? char.codePointAt(0) : 0));
  const constraints = [];

  const ov = 2 * (P.cons.ngOver || 0); // ㅇ·ㅎ 원 시각 보정: 위아래로 각각 ngOver 만큼 넘친다(정렬 기준에는 안 들어감)
  const outParts = rawParts.map((p, i) => {
    const jx = (r() * 2 - 1) * exp.jitter, jy = (r() * 2 - 1) * exp.jitter;
    const ang = (r() * 2 - 1) * exp.rotate * Math.PI / 180;
    // 회전 중심: 자리 상자 가운데
    const pb = primsBounds(p.prims, hw);
    const [cx, cy] = T(pb.x + pb.w / 2, pb.y + pb.h / 2);
    const rot = (x, y) => {
      const dx = x - cx, dy = y - cy, c = Math.cos(ang), s = Math.sin(ang);
      return [cx + dx * c - dy * s + jx, cy + dx * s + dy * c + jy];
    };
    const prims = p.prims.map(q => {
      if (q.t === 'line') return { t: 'line', pts: q.pts.map(([x, y]) => rot(...T(x, y))), ...(q.thin ? { thin: true } : {}) };
      // 정원·정사각형: 상자를 비균등 변환한 뒤 내접 도형으로 다시 그린다. 회전은 받지 않고 이동만 받는다
      const [x0, y0] = T(q.box[0], q.box[1]), [x1, y1] = T(q.box[2], q.box[3]);
      const ell = q.t === 'circle' && /[ㅇㅎㄶㅀ]/.test(p.jamo) && P.cons.ngRound === false; // ㅎ의 원도 ㅇ처럼 상자 폭에 맞춘 타원
      const ins = inscribed([x0, y0, x1, y1], q.va);
      if (ell) {
        const [ncx, ncy] = rot(ins.cx, ins.cy);
        return { t: 'circle', cx: ncx, cy: ncy, s: x1 - x0, sy: y1 - y0 + ov };
      }
      const [ncx, ncy] = rot(ins.cx, ins.cy);
      const changed = Math.abs(ins.set.w - ins.set.h) > 0.5 || (q.t === 'square' && Math.abs(ang) > 1e-6);
      if (changed) constraints.push({ slot: p.slot, jamo: p.jamo, shape: q.t, set: { w: +ins.set.w.toFixed(1), h: +ins.set.h.toFixed(1), rotate: +(ang * 180 / Math.PI).toFixed(2) }, drawn: { side: +ins.s.toFixed(1), rotate: 0 } });
      return q.t === 'circle' && ov ? { t: 'circle', cx: ncx, cy: ncy, s: ins.s, sy: ins.s + ov } : { t: q.t, cx: ncx, cy: ncy, s: ins.s };
    });
    return { slot: p.slot, jamo: p.jamo, prims };
  });

  // 정렬·폭
  const W = natW * sx, H = natH * sy;
  const F = P.font;
  const oy = P.frame.align === 'center' ? (F.frameH - H) / 2 : P.frame.align === 'bottom' ? F.frameH - H : 0;
  const advance = P.frame.width === 'fixed' ? P.frame.fixedAdvance
    : P.frame.width === 'group' ? P.frame.groupW[vclass] : Math.round(W + 2 * F.sidebearing);
  const ox = P.frame.width === 'fixed' ? (advance - W) / 2 : F.sidebearing;
  const toFont = (x, y) => [x + ox, F.frameTop - (y + oy)];

  for (const p of outParts) {
    const stroke = P.stroke, hw = stroke.weight / 2;
    const cs = [], kinds = [];
    const add = (k, list) => { for (const c of list) { cs.push(c); kinds.push(k); } };
    for (const q of p.prims) {
      if (q.thin) {
        // 이중모음 기둥: 가로 너비만 줄인다. 끝 덧댐(굵기/2)이 줄어든 만큼 끝점을 늘려 기둥 길이는 그대로
        const tw = stroke.weight * (1 - P.vowel.dblThin), ext = stroke.cap === 'butt' ? 0 : (stroke.weight - tw) / 2;
        const [a, b] = q.pts, dir = Math.sign(b[1] - a[1]) || 1;
        add('line', [strokeOpen([[a[0], a[1] - dir * ext], [b[0], b[1] + dir * ext]], { ...stroke, weight: tw, cap: stroke.cap === 'round' ? 'round' : stroke.cap, miterLimit: 1 })]);
      }
      else if (q.t === 'line') {
        if (stroke.cap === 'round') {
          // 둥근 끝이면 꺾임도 둥글게: 꺾인 자리는 베벨로 자르고 지름 = 굵기인 원판을 덧놓는다(뾰족한 ㅅ 꼭짓점이 잘리거나 튀지 않음)
          add('line', [strokeOpen(q.pts, { ...stroke, miterLimit: 1 })]);
          for (let i = 1; i < q.pts.length - 1; i++) add('joint', strokeCircle(q.pts[i][0], q.pts[i][1], hw / 2, { ...stroke, weight: hw }));
        } else add('line', [strokeOpen(q.pts, stroke)]);
      }
      else if (q.t === 'circle' && p.jamo === 'ㅇ' && (p.slot === 'jong' && P.jong.ngShape !== 'same' ? P.jong.ngShape : P.cons.ngShape) === 'dot') {
        // 점 ㅇ: 속이 찬 정원. 지름 = (상자 한 변) × ngDot
        const D = (Math.min(q.s, q.sy ?? q.s) + wt) * P.cons.ngDot;
        add('dot', strokeCircle(q.cx, q.cy, D / 4, { ...stroke, weight: D / 2 }));
      }
      else if (q.t === 'circle') add('circle', strokeCircle(q.cx, q.cy, q.s / 2, stroke, (q.sy ?? q.s) / 2));
      else if (stroke.cap === 'round') {
        // 둥근 끝이면 ㅁ 정사각형도 예외 없이 모서리를 둥글게: 위 가운데에서 출발하는 닫힌 획 + 모서리 원판
        const a = q.s / 2, x0 = q.cx - a, x1 = q.cx + a, y0 = q.cy - a, y1 = q.cy + a;
        const loop = [[q.cx, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0], [q.cx, y0]];
        add('line', [strokeOpen(loop, { ...stroke, contrast: 0, miterLimit: 1 })]);
        for (let i = 1; i < loop.length - 1; i++) add('joint', strokeCircle(loop[i][0], loop[i][1], hw / 2, { ...stroke, weight: hw }));
      }
      else {
        const a = q.s / 2;
        add('square', strokeClosed([[q.cx - a, q.cy - a], [q.cx + a, q.cy - a], [q.cx + a, q.cy + a], [q.cx - a, q.cy + a]], { ...stroke, contrast: 0 }));
      }
    }
    // 교차부 둥글리기: 서로 다른 직선 획이 만나는 안쪽 모서리에 원호 조각
    // 안쪽 모서리 둥글리기: 교차부 + 꺾임(ㅁ 정사각형은 닫힌 점열로 넘긴다)
    const filletLines = p.prims.flatMap(q => q.t === 'line' ? [q.pts]
      : q.t === 'square' ? [(a => [[q.cx, q.cy - a], [q.cx + a, q.cy - a], [q.cx + a, q.cy + a], [q.cx - a, q.cy + a], [q.cx - a, q.cy - a], [q.cx, q.cy - a]])(q.s / 2)] : []);
    add('fillet', filletPatches(filletLines, stroke, stroke.fillet));
    // y 를 뒤집으면 감는 방향도 뒤집히므로 되돌린다: 바깥 = 반시계(PostScript·UFO 관례), 구멍 = 시계
    p.contours = cs.map((c, i) => {
      const m = reverseContour(mapContour(c, toFont));
      return kinds[i] === 'fillet' && signedArea(m) < 0 ? reverseContour(m) : m; // 조각은 늘 바깥(반시계)
    });
    p.kinds = kinds; // 윤곽마다 line | circle | square — 내보내기 합집합 대상 구분용
    // 골격(중심선), 폰트 좌표. line: 점열 / circle·square: 중심·지름(한 변) — 획 굵기 중심 기준
    p.skeleton = p.prims.map(q => q.t === 'line'
      ? { t: 'line', pts: q.pts.map(([x, y]) => toFont(x, y)) }
      : { t: q.t, c: toFont(q.cx, q.cy), d: q.s, ...(q.sy != null ? { dy: q.sy } : {}) });
    const b = primsBoundsDrawn(p.prims, hw);
    p.origin = toFont(b.x, b.y + b.h).map(v => Math.round(v)); // 왼쪽 아래(폰트 좌표)
  }

  return {
    char: typeof char === 'string' ? char : null, cho, jung, jong, vclass, advance, parts: outParts,
    info: { natW: Math.round(natW), natH: Math.round(natH), scaleX: +sx.toFixed(3), scaleY: +sy.toFixed(3), constraints },
  };
}

function signedArea(c) {
  const pts = c.filter(k => k[0] !== 'Z').map(k => [k[k.length - 2], k[k.length - 1]]);
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

function primsBoundsDrawn(prims, hw) {
  const flat = prims.map(q => q.t === 'line' ? q : { t: 'line', pts: [[q.cx - q.s / 2, q.cy - (q.sy ?? q.s) / 2], [q.cx + q.s / 2, q.cy + (q.sy ?? q.s) / 2]] });
  return primsBounds(flat, hw);
}

// 자소 낱자 그리기용 기준 맥락(자연 크기·실험 끔)
export const CANON = { cho: c => ({ cho: c, jung: 'ㅏ', jong: null }), jung: v => ({ cho: 'ㅇ', jung: v, jong: null }), jong: j => ({ cho: 'ㄱ', jung: 'ㅏ', jong: j }) };
export function layoutJamo(P, slot, ch) {
  const s = layoutSyllable(P, CANON[slot](ch), { fit: 1, noExp: true });
  return s.parts.find(p => p.slot === slot);
}
