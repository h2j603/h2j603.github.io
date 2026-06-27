// 하이퍼링크 점멸 — 사인 파동 드라이버. "wave는 그냥 하나의 숫자"라
// opacity에 꽂는다(map(sin, -1..1, LO..HI)). 전 pill이 같은 위상으로
// 동기화돼 함께 숨쉰다(PHASE_STEP=0). 구 CSS @keyframes link-blink 대체.
// 호버 링크는 또렷하게 고정, 모션 줄이기 선호 시 루프를 돌리지 않는다.

var SEL = '.intro a:not(.memo-source), .drawer-panel a, .about-overlay a, ' +
          '.work-card .card-body a, .work-card .card-link, .webring a, ' +
          '.link-list .tag-chip'; // 컬렉션 태그도 하이퍼링크처럼 점멸

// 느린 박자(2.8s)로 깊게(opacity 0.2~1) 동기 호흡.
var PERIOD = 2.8;          // s — 한 호흡(밝음→어두움→밝음)
var LO = 0.2, HI = 1;      // opacity 진폭 (깊은 펄스)
var PHASE_STEP = 0;        // rad — 0이면 전원 동기(>0이면 흐르는 파동)
var OMEGA = (Math.PI * 2) / PERIOD;

var els = [];
var running = false;

// pill 목록 재수집 — 작품 카드 펼침/접힘으로 DOM이 바뀔 때 accordion이 호출.
// 문서 순서로 다시 인덱싱하므로 파동의 공간 일관성(위→아래 흐름)이 유지된다.
export function rescanWave() {
  els = Array.prototype.slice.call(document.querySelectorAll(SEL));
}

export function initWave() {
  // 모션 줄이기 선호 — 파동 끔, opacity 기본(1)으로 둠 (링크 식별은 pill이 담당)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  rescanWave();
  running = true;
  requestAnimationFrame(tick);
}

function tick(now) {
  if (!running) return;
  var t = now / 1000;
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    // 호버 중인 링크는 파동에서 빼고 또렷하게 (구 :hover { animation:none }와 동일)
    if (el.matches(':hover')) { el.style.opacity = '1'; continue; }
    var w = Math.sin(t * OMEGA - i * PHASE_STEP);     // -1..1
    el.style.opacity = (LO + (w * 0.5 + 0.5) * (HI - LO)).toFixed(3);
  }
  requestAnimationFrame(tick); // 탭이 백그라운드면 자동 멈춤
}
