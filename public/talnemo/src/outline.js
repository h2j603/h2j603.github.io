// 골격(중심선) → 외곽선. 좌표는 y-아래 방향(로컬), 단위는 폰트 유닛.
// 외곽선 = 윤곽(contour) 목록. 윤곽 = 명령 목록: ['M',x,y] ['L',x,y] ['C',x1,y1,x2,y2,x,y] ['Z']
// 획끼리 겹친 채로 둔다(겹침 정리는 Glyphs Remove Overlap / 빌드 단계 몫).

const K = 0.5522847498;

// 획 굵기: 대비 0이면 균일. 대비 c는 가로획만 가늘게 한다.
export function segWidth(stroke, dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  const horiz = Math.abs(dx) / len; // 1 = 가로
  return stroke.weight * (1 - (stroke.contrast || 0) * horiz * horiz);
}

function lineIntersect(p, d, q, e) {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

// 한쪽 오프셋 점열. side=+1 왼쪽(진행방향 기준), -1 오른쪽
function offsetSide(pts, hw, side, closed, miterLimit) {
  const n = pts.length;
  const segs = [];
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const d = [dx / L, dy / L];
    const nn = [-d[1] * side, d[0] * side];
    segs.push({ a, b, d, nn, h: hw[i] });
  }
  const out = [];
  const joint = (s0, s1, p) => {
    const p0 = [s0.a[0] + s0.nn[0] * s0.h, s0.a[1] + s0.nn[1] * s0.h];
    const p1 = [s1.a[0] + s1.nn[0] * s1.h, s1.a[1] + s1.nn[1] * s1.h];
    const x = lineIntersect(p0, s0.d, p1, s1.d);
    const lim = miterLimit * Math.max(s0.h, s1.h);
    if (x && Math.hypot(x[0] - p[0], x[1] - p[1]) <= lim) return [x];
    // 베벨
    return [[p[0] + s0.nn[0] * s0.h, p[1] + s0.nn[1] * s0.h], [p[0] + s1.nn[0] * s1.h, p[1] + s1.nn[1] * s1.h]];
  };
  if (closed) {
    for (let i = 0; i < m; i++) out.push(...joint(segs[(i - 1 + m) % m], segs[i], pts[i]));
  } else {
    const s0 = segs[0];
    out.push([pts[0][0] + s0.nn[0] * s0.h, pts[0][1] + s0.nn[1] * s0.h]);
    for (let i = 1; i < m; i++) out.push(...joint(segs[i - 1], segs[i], pts[i]));
    const sl = segs[m - 1];
    out.push([pts[n - 1][0] + sl.nn[0] * sl.h, pts[n - 1][1] + sl.nn[1] * sl.h]);
  }
  return { out, segs };
}

function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

// y-아래 좌표에서 area>0 은 화면상 시계방향. 폰트(y-위)로 뒤집으면 반시계 = 바깥 윤곽.
function polyToContour(poly, wantPositive) {
  const a = signedArea(poly);
  const p = (a > 0) === wantPositive ? poly : poly.slice().reverse();
  const c = [['M', p[0][0], p[0][1]]];
  for (let i = 1; i < p.length; i++) c.push(['L', p[i][0], p[i][1]]);
  c.push(['Z']);
  return c;
}

function arcCmds(cx, cy, r, a0, a1) {
  // a0→a1 을 90도 이하 조각으로 나눈 3차 베지어
  const cmds = [];
  const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9));
  const da = (a1 - a0) / steps;
  const k = (4 / 3) * Math.tan(da / 4);
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + da * i, t1 = t0 + da;
    const p0 = [cx + r * Math.cos(t0), cy + r * Math.sin(t0)];
    const p3 = [cx + r * Math.cos(t1), cy + r * Math.sin(t1)];
    cmds.push(['C',
      p0[0] - k * r * Math.sin(t0), p0[1] + k * r * Math.cos(t0),
      p3[0] + k * r * Math.sin(t1), p3[1] - k * r * Math.cos(t1),
      p3[0], p3[1]]);
  }
  return cmds;
}

// 열린 획 하나 → 윤곽 하나
export function strokeOpen(pts, stroke) {
  const cap = stroke.cap || 'square';
  const ml = stroke.miterLimit || 4;
  const hw = [];
  for (let i = 0; i < pts.length - 1; i++)
    hw.push(segWidth(stroke, pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) / 2);
  let P = pts.map(p => p.slice());
  if (cap === 'square') {
    const ext = (a, b, h) => {
      const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1;
      return [a[0] + dx / L * h, a[1] + dy / L * h];
    };
    P[0] = ext(P[0], P[1], hw[0]);
    P[P.length - 1] = ext(P[P.length - 1], P[P.length - 2], hw[hw.length - 1]);
  }
  const L = offsetSide(P, hw, 1, false, ml).out;
  const R = offsetSide(P, hw, -1, false, ml).out.reverse();
  if (cap !== 'round') return polyToContour([...L, ...R], true);
  // 둥근 끝: 왼쪽 → 끝 반원 → 오른쪽 → 시작 반원
  const n = P.length;
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const e = ang(P[n - 2], P[n - 1]);
  const s = ang(P[0], P[1]);
  // 왼쪽(+1 side) 은 진행방향 기준 nn=[-dy,dx] → 각도 e+90°
  const c = [['M', L[0][0], L[0][1]]];
  for (let i = 1; i < L.length; i++) c.push(['L', L[i][0], L[i][1]]);
  c.push(...arcCmds(P[n - 1][0], P[n - 1][1], hw[hw.length - 1], e + Math.PI / 2, e - Math.PI / 2));
  for (let i = 1; i < R.length; i++) c.push(['L', R[i][0], R[i][1]]);
  c.push(...arcCmds(P[0][0], P[0][1], hw[0], s - Math.PI / 2, s - Math.PI * 1.5));
  c.push(['Z']);
  return orient(c, true);
}

// 닫힌 획(ㅁ) → 바깥·안쪽 윤곽 둘
export function strokeClosed(pts, stroke) {
  const ml = stroke.miterLimit || 4;
  const n = pts.length;
  const hw = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    hw.push(segWidth(stroke, b[0] - a[0], b[1] - a[1]) / 2);
  }
  const A = offsetSide(pts, hw, 1, true, ml).out;
  const B = offsetSide(pts, hw, -1, true, ml).out;
  const [outer, inner] = Math.abs(signedArea(A)) > Math.abs(signedArea(B)) ? [A, B] : [B, A];
  return [polyToContour(outer, true), polyToContour(inner, false)];
}

// 원(ㅇ·ㅎ) → 고리. 대비가 있어도 원은 균일(정원 조건).
export function strokeCircle(cx, cy, r, stroke, ry = r) {
  const h = stroke.weight / 2;
  // ry ≠ r 이면 타원: 단위원을 x·y 따로 늘인다(획 굵기는 가로·세로 끝에서 정확)
  const ring = (rx, rY, positive) => {
    const sc = (x, y) => [cx + (x - cx) * rx, cy + (y - cy) * rY];
    const c = [['M', cx + rx, cy], ...arcCmds(cx, cy, 1, 0, Math.PI * 2).map(k => {
      const o = [k[0]]; for (let i = 1; i < k.length; i += 2) o.push(...sc(k[i], k[i + 1])); return o;
    }), ['Z']];
    return orient(c, positive);
  };
  const out = [ring(r + h, ry + h, true)];
  if (Math.min(r, ry) - h > 1) out.push(ring(r - h, ry - h, false));
  return out;
}

// 명령 윤곽의 방향을 점열 근사로 판정해 맞춘다
function orient(c, wantPositive) {
  const pts = [];
  for (const k of c) if (k[0] !== 'Z') pts.push([k[k.length - 2], k[k.length - 1]]);
  if ((signedArea(pts) > 0) === wantPositive) return c;
  return reverseContour(c);
}

export function reverseContour(c) {
  const body = c.filter(k => k[0] !== 'Z');
  const pts = body.map(k => [k[k.length - 2], k[k.length - 1]]);
  const out = [['M', pts[pts.length - 1][0], pts[pts.length - 1][1]]];
  for (let i = body.length - 1; i >= 1; i--) {
    const k = body[i], prev = pts[i - 1];
    if (k[0] === 'C') out.push(['C', k[3], k[4], k[1], k[2], prev[0], prev[1]]);
    else out.push(['L', prev[0], prev[1]]);
  }
  out.push(['Z']);
  return out;
}

export function mapContour(c, f) {
  return c.map(k => {
    if (k[0] === 'Z') return k;
    const o = [k[0]];
    for (let i = 1; i < k.length; i += 2) { const [x, y] = f(k[i], k[i + 1]); o.push(x, y); }
    return o;
  });
}

export function contourToPathD(c, f = (x, y) => [x, y]) {
  return c.map(k => {
    if (k[0] === 'Z') return 'Z';
    const p = [];
    for (let i = 1; i < k.length; i += 2) { const [x, y] = f(k[i], k[i + 1]); p.push(x.toFixed(1), y.toFixed(1)); }
    return k[0] + p.join(' ');
  }).join('');
}
