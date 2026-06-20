// 공용 유틸 — 뷰포트 판정 + 컬럼 스크롤 글라이드.

export function isMobileView() {
  return window.matchMedia('(max-width: 600px)').matches;
}

// 펼친 행/메모가 안착하는 화면 기준선 — 상단 ~22%
export function anchorY() {
  return Math.max(110, Math.round(window.innerHeight * 0.22));
}

// 아코디언 펼침 — 높이를 0→측정값으로 감쇠 스프링(파동)으로 키운다. 약한
// 감쇠(ζ≈0.63)로 한 번 살짝 오버슈트하고 안착("찰짐"), 끝나면 height auto로
// 되돌려 콘텐츠 변동(이미지 로드 등)에 자연스럽게 따라간다. 닫기는 호출측이
// instant로 처리. reduced-motion이면 애니메이션 없이 즉시 펼침.
export function springOpen(el, opts) {
  if (!el) return;
  cancelAnimationFrame(el._spuRaf || 0);
  el._spuRaf = 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.style.height = ''; el.style.overflow = '';
    return;
  }
  opts = opts || {};
  var k = opts.stiffness || 160;
  var c = opts.damping || 16;
  el.style.height = 'auto';
  var target = el.scrollHeight; // 목표 높이 측정
  if (target <= 0) { el.style.height = ''; return; }
  el.style.overflow = 'hidden';
  el.style.height = '0px';
  var pos = 0, vel = 0, last = performance.now();
  function step(now) {
    var dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 0.016; if (dt > 0.032) dt = 0.032;
    var a = -k * (pos - target) - c * vel;
    vel += a * dt; pos += vel * dt;
    if (Math.abs(pos - target) < 0.5 && Math.abs(vel) < 10) {
      el.style.height = ''; el.style.overflow = ''; // auto 복귀
      el._spuRaf = 0;
      return;
    }
    el.style.height = (pos < 0 ? 0 : pos) + 'px';
    el._spuRaf = requestAnimationFrame(step);
  }
  el._spuRaf = requestAnimationFrame(step);
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
