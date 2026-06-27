// 줄무늬 띠 + 세로 구분선 디바이스 픽셀 스냅.

// 줄무늬 띠 — viewport 폭에 따라 셀 개수, 높이에 따라 줄 수 동적 계산.
// 줄은 화면 전체(100vh)를 덮을 만큼 미리 만들어 두고 stripe-top의
// height(72px ↔ 100vh, CSS transition)로만 노출량을 조절한다 —
// 호버 시 타일 크기·비율 변형 없이 줄이 늘어나며 커튼처럼 내려온다.
var CELL_HEIGHT = 36; // 타일 확대 24→36 (커튼이 너무 촘촘했음). CSS .stripe-row height와 짝
var CELL_RATIO = 0.5; // width / height — 0.5면 세로가 가로의 2배 길쭉
var STRIPE_BASE_ROWS = 2; // 기본 노출 2줄 = 72px (CSS .stripe-top height와 짝)

function buildStripe() {
  var stripe = document.querySelector('.stripe-top');
  if (!stripe) return;
  var desired = CELL_HEIGHT * CELL_RATIO;
  var N = Math.max(2, Math.round(window.innerWidth / desired));
  var pct = 100 / N;
  var ROWS = Math.max(STRIPE_BASE_ROWS, Math.ceil(window.innerHeight / CELL_HEIGHT));
  stripe.innerHTML = '';
  for (var rowIdx = 0; rowIdx < ROWS; rowIdx++) {
    var row = document.createElement('div');
    row.className = 'stripe-row';
    row.style.setProperty('--cell-w', pct + '%');
    for (var i = 0; i < N; i++) {
      var cell = document.createElement('div');
      var rowEven = rowIdx % 2 === 0;
      var evenCol = i % 2 === 0;
      // row 짝수(0,2,...): 짝수 col = purple. row 홀수(1,3,...): 짝수 col = brown.
      // → 줄 수와 무관하게 위·아래·위·아래 패턴 유지.
      cell.className = 'cell ' + ((evenCol === rowEven) ? 'purple' : 'brown');
      row.appendChild(cell);
    }
    stripe.appendChild(row);
  }
}

export function initStripe() {
  var stripeResizeT = null;
  window.addEventListener('resize', function () {
    clearTimeout(stripeResizeT);
    stripeResizeT = setTimeout(buildStripe, 100);
  });
  buildStripe();
}

// ── 세로 구분선 d1·d2 — 드래그로 3컬럼 크기 조절 + 디바이스 픽셀 스냅 ──────
// 두 경계 위치(0~1): 좌|중 = splitA, 중|우 = splitB. 컬럼 폭(CSS 변수)·세로선이
// 이 두 값에서 파생된다. 선 위치는 % 그대로 두면 분수 디바이스 픽셀에 떨어져
// 1px 선이 번지므로(특히 배율 125/150%), px로 ×dpr 반올림 ÷dpr 스냅해 인라인 부여.
// 드래그 위치는 저장하지 않는다 — 새로고침하면 항상 기본 비율로 되돌아간다.
var DEFAULT_A = 0.2, DEFAULT_B = 0.8;
var MIN_SIDE = 0.12;   // 좌·우 컬럼 최소 폭
var MIN_CENTER = 0.32; // 중앙(작품 표) 최소 폭
var splitA = DEFAULT_A, splitB = DEFAULT_B;

function clampSplits() {
  // 좌: [MIN_SIDE, 1-MIN_SIDE-MIN_CENTER] / 우: [좌+MIN_CENTER, 1-MIN_SIDE]
  splitA = Math.min(Math.max(splitA, MIN_SIDE), 1 - MIN_SIDE - MIN_CENTER);
  splitB = Math.min(Math.max(splitB, splitA + MIN_CENTER), 1 - MIN_SIDE);
}

function snapDividers() {
  var dpr = window.devicePixelRatio || 1;
  var pos = { d1: splitA, d2: splitB };
  Object.keys(pos).forEach(function (k) {
    var x = Math.round(window.innerWidth * pos[k] * dpr) / dpr;
    document.querySelectorAll('.col-divider.' + k).forEach(function (el) { el.style.left = x + 'px'; });
  });
}

function applySplit() {
  clampSplits();
  var root = document.querySelector('.three-col');
  if (root) {
    root.style.setProperty('--split-a', (splitA * 100) + '%');
    root.style.setProperty('--split-b', (splitB * 100) + '%');
  }
  snapDividers();
}

function initDrag() {
  document.querySelectorAll('.col-divider.d1, .col-divider.d2').forEach(function (el) {
    var key = el.classList.contains('d1') ? 'a' : 'b';
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      document.body.style.userSelect = 'none';
      function move(ev) {
        var frac = ev.clientX / window.innerWidth;
        if (key === 'a') splitA = frac; else splitB = frac;
        applySplit();
      }
      function up() {
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  });
}

export function initDividers() {
  applySplit(); // 항상 기본 비율로 시작 (저장 안 함)
  initDrag();
  window.addEventListener('resize', snapDividers); // 폭(%)은 자동 스케일, 선 px만 재스냅
}
