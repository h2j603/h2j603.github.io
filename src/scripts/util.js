// 공용 유틸 — 뷰포트 판정 + 컬럼 스크롤 글라이드.

export function isMobileView() {
  return window.matchMedia('(max-width: 600px)').matches;
}

// 펼친 행/메모가 안착하는 화면 기준선 — 상단 ~22%
export function anchorY() {
  return Math.max(110, Math.round(window.innerHeight * 0.22));
}

// 아코디언 펼침 — 높이를 0→측정값으로 감쇠 스프링(파동)으로 키운다. 느릿한
// 박자(낮은 k)에 거의 임계감쇠(ζ≈0.99)라 바운스 없이 천천히 미끄러지듯 안착,
// 끝나면 height auto로 되돌려 콘텐츠 변동(이미지 로드 등)에 자연스럽게 따라간다.
// 닫기는 호출측이 instant로 처리. reduced-motion이면 애니메이션 없이 즉시 펼침.
export function springOpen(el, opts) {
  if (!el) return;
  cancelAnimationFrame(el._spuRaf || 0);
  el._spuRaf = 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.style.height = ''; el.style.overflow = '';
    return;
  }
  opts = opts || {};
  el.style.height = 'auto';
  var target = el.scrollHeight; // 목표 높이 측정
  if (target <= 0) { el.style.height = ''; return; }
  // 속도 정규화 — 지속시간을 높이에 맞춰 키워(클램프) 길이에 자연스러운 속도로
  // 열린다. 고정 stiffness는 거리와 무관히 비슷한 시간에 끝나, 짧은 카드는 굼뜨고
  // 긴 카드는 휙 열려 보였음. 느리고 부드러운 호흡 — 짧은 카드 ~1.95s · 긴 카드 ~3.75s.
  var ZETA = 0.92;                                         // 감쇠비 — 부드러운 안착(미세 생기)
  var dur = Math.min(3.75, Math.max(1.95, target / 333));  // 길이 비례, 1.95~3.75s 클램프(직전比 25%↓)
  var omega = 8.5 / (ZETA * dur);                          // 안착 시간 ≈ dur 범위
  var k = opts.stiffness != null ? opts.stiffness : omega * omega;
  var c = opts.damping != null ? opts.damping : 2 * ZETA * omega;
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

// 가로 슬라이드 스프링 — translateX를 from(px)→0으로 감쇠 스프링(파동)으로
// 되돌린다. 모바일 섹션 페이지 넘김(슬라이드인·제자리 복귀)에 쓴다. opts.fade면
// 거리 비례로 opacity도 0→1. reduced-motion이면 즉시 정착. onDone 콜백 지원.
export function springX(el, from, opts, onDone) {
  if (!el) return;
  cancelAnimationFrame(el._sxRaf || 0);
  el._sxRaf = 0;
  el.style.transition = ''; // 프레임별 transform이 CSS 트랜지션과 겹치지 않게
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.style.transform = ''; el.style.opacity = '';
    if (onDone) onDone();
    return;
  }
  opts = opts || {};
  var k = opts.stiffness || 240, c = opts.damping || 20;
  var fade = !!opts.fade, ref = Math.abs(from) || 1;
  var pos = from, vel = opts.v0 || 0, last = performance.now();
  function step(now) {
    var dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 0.016; if (dt > 0.032) dt = 0.032;
    var a = -k * pos - c * vel; // 목표 0
    vel += a * dt; pos += vel * dt;
    if (Math.abs(pos) < 0.4 && Math.abs(vel) < 12) {
      el.style.transform = ''; if (fade) el.style.opacity = '';
      el._sxRaf = 0; if (onDone) onDone();
      return;
    }
    el.style.transform = 'translateX(' + pos.toFixed(1) + 'px)';
    if (fade) el.style.opacity = String(Math.max(0, Math.min(1, 1 - Math.abs(pos) / ref)));
    el._sxRaf = requestAnimationFrame(step);
  }
  el._sxRaf = requestAnimationFrame(step);
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
