// 내보내기용 외곽선 정리: 직선 획끼리만 합집합한다.
// - 직선 획은 다각형이라 합집합 결과가 정확하다. 코너가 그대로 남으므로 베지어 피팅이 필요 없다.
// - 원(ㅇ·ㅎ)·정사각형(ㅁ)은 합집합에 넣지 않고 해석적 윤곽 그대로 덧놓는다(구조 제약 보존).
// - 둥근 끝(곡선이 든 획)도 합집합에 넣지 않는다. 겹침은 Glyphs Remove Overlap 몫.
// polygon-clipping 모듈은 호출하는 쪽이 넘긴다(브라우저 UMD / Node npm 공용).

function isPolygon(c) { return c.every(k => k[0] !== 'C'); }

function toRing(c) {
  const r = c.filter(k => k[0] !== 'Z').map(k => [k[1], k[2]]);
  r.push(r[0]);
  return r;
}

// 같은 직선 위의 중간 점 제거
function simplify(ring) {
  const pts = ring.slice(0, -1);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) > 1e-6 * (1 + Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]))) out.push(b);
  }
  return out;
}

function area(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

function ringToContour(pts) {
  return [['M', pts[0][0], pts[0][1]], ...pts.slice(1).map(p => ['L', p[0], p[1]]), ['Z']];
}

export function mergeContours(contours, kinds, pc) {
  const polys = [], keep = [];
  contours.forEach((c, i) => {
    if (kinds[i] === 'line' && isPolygon(c)) polys.push([toRing(c)]);
    else keep.push(c);
  });
  if (polys.length < 2) return contours;
  const mp = pc.union(...polys);
  // 감는 방향을 원래 획 윤곽에 맞춘다(바깥 = 원래 획과 같은 방향, 구멍 = 반대).
  // polygon-clipping 은 반대로 감아 내놓을 수 있다. 그러면 겹쳐 놓은 원과 상쇄돼 구멍이 생긴다.
  const sign = Math.sign(area(polys[0][0]));
  const merged = [];
  for (const poly of mp) poly.forEach((ring, ri) => {
    let pts = simplify(ring);
    if (pts.length < 3) return;
    const want = ri === 0 ? sign : -sign;
    if (Math.sign(area(pts)) !== want) pts = pts.reverse();
    merged.push(ringToContour(pts));
  });
  return [...merged, ...keep];
}
