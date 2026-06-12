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

// ── 세로 구분선 디바이스 픽셀 스냅 ─────────────────────────────
// % 위치는 분수 픽셀에 떨어져 1px 선이 두 픽셀에 번진다. CSS 정수만으론
// 윈도우 배율(125%/150% = DPR 1.25/1.5)에서 여전히 분수 디바이스 픽셀이
// 되므로, 디바이스 픽셀 격자(×dpr 반올림 ÷dpr)에 스냅해 두께를 통일.
var DIVIDER_POS = { d1: 0.2, d5: 0.26, d3: 0.32, d4: 0.68, d2: 0.8 };

function snapDividers() {
  var dpr = window.devicePixelRatio || 1;
  Object.keys(DIVIDER_POS).forEach(function (k) {
    var x = Math.round(window.innerWidth * DIVIDER_POS[k] * dpr) / dpr;
    document
      .querySelectorAll('.col-divider.' + k + ', .col-divider-top.' + k)
      .forEach(function (el) { el.style.left = x + 'px'; });
  });
}

export function initDividers() {
  window.addEventListener('resize', snapDividers);
  snapDividers();
}
