// 하이퍼링크 점멸 — 사인 파동 드라이버. "wave는 그냥 하나의 숫자"라
// opacity에 꽂는다(map(sin, -1..1, LO..HI)). pill마다 문서 순서로 위상을
// 어긋내(-i*PHASE_STEP) 파동이 링크들을 가로질러 흐른다. 구 CSS
// @keyframes link-blink 대체 — 위상 오프셋을 동적 콘텐츠에 주기엔 JS가 깔끔.
// 호버 링크는 또렷하게 고정, 모션 줄이기 선호 시 루프를 돌리지 않는다.

var SEL = '.intro a:not(.memo-source), .drawer-panel a, ' +
          '.work-card .card-body a, .work-card .card-link, .webring a';

// 추천값 — 구 blink 박자(1.4s) 유지, opacity 0.45~1 부드러운 호흡,
// pill 간 0.5rad 위상차로 흐르는 파동.
var PERIOD = 1.4;          // s
var LO = 0.45, HI = 1;     // opacity 진폭
var PHASE_STEP = 0.5;      // rad — pill 사이 위상차(흐름의 촘촘함)
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
