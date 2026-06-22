// 기본 화면 모자이크 (stripe-mosaic 도구로 만든 단일 SVG → 셀 그리드) 낙하 인트로.
// 모바일은 CSS가 .default-state를 숨기므로 애니메이션이 돌지 않는다.

var defaultEl = null;

// 모자이크 셀이 오른쪽 위 → 왼쪽 아래 대각선 순서로 떨어짐.
// 100% 순차는 아니고 일부 셀은 예외 (random jitter).
// opts(모두 선택): dur=한 셀 낙하시간(초), spread=대각선 wave 최대 delay(초),
//   jitter=랜덤 흔들림, stragProb/stragMax=늦게 떨어지는 셀 비율/최대 delay,
//   ease=타이밍 함수. 기본값 = 데스크탑 장식용. 전체 애니메이션 소요(ms) 반환.
function triggerMosaicFall(opts) {
  if (!defaultEl) return 0;
  opts = opts || {};
  var dur = opts.dur != null ? opts.dur : 2.6;
  var spread = opts.spread != null ? opts.spread : 12;
  var jitter = opts.jitter != null ? opts.jitter : 1.7;
  var stragProb = opts.stragProb != null ? opts.stragProb : 0.12;
  var stragMax = opts.stragMax != null ? opts.stragMax : 13;
  var ease = opts.ease || 'cubic-bezier(0.95, 0, 1, 0.45)';
  var cells = defaultEl.querySelectorAll('.stripe-mosaic > div');
  var maxRow = 1, maxCol = 1;
  var positions = [];
  cells.forEach(function (d) {
    delete d.dataset.fast;
    delete d.dataset.skip;
    var ga = (d.style.gridArea || '').replace(/\s/g, '');
    var parts = ga.split('/');
    var row = parseInt(parts[0], 10) || 1;
    var col = parseInt(parts[1], 10) || 1;
    positions.push({ d: d, row: row, col: col });
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  });
  var maxProgress = (maxCol - 1) + (maxRow - 1);
  var maxDelay = 0;
  positions.forEach(function (p) {
    p.d.style.animation = 'none';
    void p.d.offsetWidth; // reflow
    p.d.style.animation = 'cell-drop ' + dur.toFixed(3) + 's ' + ease + ' forwards';
    // 우상 → 좌하 대각선 진행도 (0~1)
    var progress = ((maxCol - p.col) + (p.row - 1)) / maxProgress;
    var delay;
    if (Math.random() < stragProb) {
      delay = Math.random() * stragMax;
    } else {
      delay = progress * spread + (Math.random() - 0.5) * jitter;
    }
    if (delay < 0) delay = 0;
    if (delay > maxDelay) maxDelay = delay;
    p.d.style.animationDelay = delay.toFixed(3) + 's';
  });
  defaultEl.dataset.falling = '1';
  return (maxDelay + dur) * 1000;
}

function mosaicOpts() {
  return window.matchMedia('(max-width: 600px)').matches
    ? { dur: 1.8, spread: 2, jitter: 0.8, stragProb: 0.06, stragMax: 2 }
    : { dur: 1.8, spread: 2.2, jitter: 0.8, stragProb: 0.06, stragMax: 2.5 };
}

// 다시 떨어지기 — home 클릭 등에서 호출
export function replayMosaic() {
  if (!defaultEl) return;
  // 모션 줄이기 — 낙하 인트로 생략. 모자이크는 콘텐츠를 덮으므로(떨어져 사라지는
  // 연출) 그냥 숨겨 콘텐츠를 바로 노출한다.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    defaultEl.hidden = true;
    return;
  }
  defaultEl.hidden = false;
  triggerMosaicFall(mosaicOpts());
}

// 모자이크 인트로 — 진입 즉시 낙하 (클릭 트리거는 잘 안 먹어서 폐기,
// 마우스 근접 낙하도 폐기 — 매 로드마다 한 번 떨어지고 끝).
export function initMosaic() {
  defaultEl = document.getElementById('__default');
  replayMosaic();
}
