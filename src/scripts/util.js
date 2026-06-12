// 공용 유틸 — 뷰포트 판정 + 컬럼 스크롤 글라이드.

export function isMobileView() {
  return window.matchMedia('(max-width: 600px)').matches;
}

// 펼친 행/메모가 안착하는 화면 기준선 — 상단 ~22%
export function anchorY() {
  return Math.max(110, Math.round(window.innerHeight * 0.22));
}

// 컬럼 스크롤 글라이드 — 목표 한계(scrollHeight)를 매 프레임 재계산
// (패널 삽입으로 스크롤 공간이 변해도 끝까지 따라간다). 컬럼별 raf 분리.
export function glideScrollBy(el, delta, dur) {
  if (!el) return;
  cancelAnimationFrame(el._glideRaf || 0);
  var startTop = el.scrollTop;
  var t0 = performance.now();
  function ease(t) { // easeInOutQuad
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function step(now) {
    var t = Math.min(1, (now - t0) / dur);
    var max = el.scrollHeight - el.clientHeight;
    var target = Math.max(0, Math.min(startTop + delta, max));
    el.scrollTop = startTop + (target - startTop) * ease(t);
    if (t < 1) el._glideRaf = requestAnimationFrame(step);
  }
  el._glideRaf = requestAnimationFrame(step);
}
