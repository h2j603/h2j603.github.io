// 안쪽 모서리 둥글리기(필렛): 획이 만나거나(교차부) 꺾이는(ㄱ·ㄴ·ㅁ 속) 안쪽 모서리에 원호 조각을 덧놓는다.
// 획 윤곽은 그대로 두고, 모서리 C · 접점 T1 · 원호 · 접점 T2 로 된 조각만 더한다(채움이 겹쳐도 결과는 합집합).
// 좌표는 배치 좌표(y-아래).
import { segWidth } from './outline.js?v=2d2dd1b';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

function seg(a, b, stroke) {
  const d = sub(b, a), len = Math.hypot(...d);
  const u = mul(d, 1 / len);
  return { a, b, u, n: [-u[1], u[0]], len, h: segWidth(stroke, d[0], d[1]) / 2 };
}

// 점이 획(선분 + 굵기) 안쪽에 있는가. 끝은 평평하다고 본다(둥근 끝·각진 끝 차이는 모서리 판정에 영향 없음)
function inside(p, s, eps) {
  const v = sub(p, s.a), t = dot(v, s.u), d = Math.abs(dot(v, s.n));
  return t > eps && t < s.len - eps && d < s.h - eps;
}

// lines: 획 단위 점열 배열. r: 반지름(유닛)
export function filletPatches(lines, stroke, r) {
  if (!(r > 0)) return [];
  const segs = [];
  lines.forEach((pts, gi) => { for (let i = 0; i < pts.length - 1; i++) segs.push({ ...seg(pts[i], pts[i + 1], stroke), gi }); });
  const out = [], eps = 0.5;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s1 = segs[i], s2 = segs[j];
    const den = cross(s1.u, s2.u);
    if (Math.abs(den) < 1e-6) continue; // 평행
    for (const k1 of [1, -1]) for (const k2 of [1, -1]) {
      // 두 획의 테두리 직선 교점 = 후보 모서리 C
      const p1 = add(s1.a, mul(s1.n, k1 * s1.h)), p2 = add(s2.a, mul(s2.n, k2 * s2.h));
      const t = cross(sub(p2, p1), s2.u) / den;
      const C = add(p1, mul(s1.u, t));
      // C 가 두 획 중심선 구간 안에 있어야 한다(끝 너머는 모서리가 아니라 바깥 윤곽)
      const t1 = dot(sub(C, s1.a), s1.u), t2 = dot(sub(C, s2.a), s2.u);
      if (t1 < -eps || t1 > s1.len + eps || t2 < -eps || t2 > s2.len + eps) continue;
      // 테두리를 따라 상대 획에서 멀어지는 방향 = 열린 공간 쪽 접선
      const e1 = mul(s1.u, Math.sign(dot(s1.u, mul(s2.n, k2))) || 1);
      const e2 = mul(s2.u, Math.sign(dot(s2.u, mul(s1.n, k1))) || 1);
      // 열린 공간이 실제로 비어 있는가(다른 획 속 모서리 제외)
      const probe = add(C, mul(add(e1, e2), 1.5));
      if (segs.some(s => inside(probe, s, 0)) || segs.some(s => s !== s1 && s !== s2 && inside(C, s, eps))) continue;
      // 접선 사이 각 φ, 접점 거리 = r / tan(φ/2). 획 남은 길이를 넘지 않게 자른다
      const phi = Math.acos(Math.max(-1, Math.min(1, dot(e1, e2))));
      if (phi < 1e-3 || phi > Math.PI - 1e-3) continue;
      const room1 = dot(e1, s1.u) > 0 ? s1.len - t1 : t1, room2 = dot(e2, s2.u) > 0 ? s2.len - t2 : t2;
      // 테두리를 따라가다 다른 획에 닿으면 그 거리의 절반까지만(맞은편 조각과 나눠 써서 실틈이 안 남게)
      const others = segs.filter(s => s !== s1 && s !== s2);
      const clear = e => { for (let x = 2; x <= r * 3; x += 2) if (others.some(s => inside(add(C, mul(e, x)), s, 0.5))) return x / 2; return Infinity; };
      const d = Math.min(r / Math.tan(phi / 2), r * 1.5, room1, room2, clear(e1), clear(e2)); // 예각에선 접점이 멀리 가므로 r×1.5 에서 끊는다
      if (d < 1) continue;
      const rr = d * Math.tan(phi / 2);
      const T1 = add(C, mul(e1, d)), T2 = add(C, mul(e2, d));
      const L = (4 / 3) * Math.tan((Math.PI - phi) / 4) * rr; // 원호 근사 핸들
      const C0 = sub(C, mul(add(e1, e2), 2)); // 꼭짓점을 획 속으로 2유닛 물려 화면 안티앨리어싱 실금 방지
      out.push([['M', C0[0], C0[1]], ['L', T1[0], T1[1]],
        ['C', T1[0] - e1[0] * L, T1[1] - e1[1] * L, T2[0] - e2[0] * L, T2[1] - e2[1] * L, T2[0], T2[1]], ['Z']]);
    }
  }
  return out;
}
