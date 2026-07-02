// 커튼 = About 서랍 — 별도 버튼 없이 줄무늬 띠(.stripe-top)를 드래그해 연다.
//
// 아래로 땡기면 커튼이 손가락을 따라 내려오고 About 패널이 떠오른다. 위로
// 땡기면(천 드래그업) / 천 탭 / ESC 로 닫힌다. 손을 떼면 진행률·속도로 열림·
// 닫힘을 정하고, 드래그 속도를 그대로 실어 감쇠 코사인 스프링(파동함수)이
// 살짝 오버슈트하며 안착한다 — "찰진" 감각.
//
// 시각(커튼 높이·패널 페이드)은 JS가 inline으로 전부 구동(CSS 트랜지션 끔).
// .open 클래스는 커서/시맨틱 상태 플래그로만 남긴다.

var stripe = null;
var drawer = null; // .about-drawer (천 레이어)

var BASE = 72;     // 닫힘 높이(px) — measureBase()가 실제 줄 높이×2로 갱신
var BASE_ROWS = 2; // 닫힘 = 타일 2줄 (stripe.js STRIPE_BASE_ROWS와 짝)
var pos = 72;      // 현재 커튼 높이(px)
var vel = 0;       // 스프링 속도(px/s) — 드래그 릴리스 속도를 이어받는다
var target = 72;   // 스프링 목표
var open = false;
var entered = false; // 커튼이 다 내려와 패널이 등장했는가
var dragging = false;
var raf = 0;

// 스프링 — 느릿하게(낮은 k) + 약한 감쇠(ζ≈0.67)로 한 번 분명히 오버슈트.
var STIFFNESS = 110; // k  (낮출수록 느림)
var DAMPING = 14;    // c  (임계감쇠 2√k≈21보다 작아 underdamped)

// 닫힘 높이 = 실제 렌더된 줄 높이 × 2 (정밀값). offsetHeight는 정수로 반올림돼
// 루트 폰트에 따라 진짜 2줄 높이(예: 71.6px)를 72로 올려버려 3번째 줄 sliver가
// 새게 만든다 — getBoundingClientRect로 소수까지 잡아 딱 2줄에 맞춘다.
function measureBase() {
  var row = stripe && stripe.querySelector('.stripe-row');
  if (row) BASE = row.getBoundingClientRect().height * BASE_ROWS;
  else if (stripe) BASE = stripe.offsetHeight || BASE;
}
function hClosed() { return BASE; }
function hOpen() { return window.innerHeight; }

function progress() {
  var p = (pos - hClosed()) / (hOpen() - hClosed());
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

// 패널 등장 래치 — 커튼이 화면을 다 덮은 뒤에만 .entered (CSS 등장 애니메이션).
function setEntered(v) {
  if (entered === v) return;
  entered = v;
  drawer.classList.toggle('entered', v);
}

// pos → 시각. 커튼 높이만 따라가고, 패널은 풀 도달 후 .entered로 별도 등장.
// (드래그 진행률에 묶인 반투명 페이드는 폐지 — 내려오는 동안 패널은 숨김.)
function render() {
  stripe.style.height = pos + 'px';
  // 드래그 중엔 래치 금지 — 안 그러면 onDown에서 끈 패널을 즉시 되살린다.
  if (open && !entered && !dragging && pos >= hOpen() - 0.5) setEntered(true);
  drawer.style.visibility = entered ? 'visible' : 'hidden';
  drawer.style.pointerEvents = (entered && !dragging) ? 'auto' : 'none';
}

// 감쇠 스프링 적분(semi-implicit Euler) — target으로 진동 수렴.
function springStep(now) {
  var dt = (now - springStep._last) / 1000;
  springStep._last = now;
  if (!(dt > 0)) dt = 0.016;
  if (dt > 0.032) dt = 0.032; // 큰 프레임 간격 방지
  var a = -STIFFNESS * (pos - target) - DAMPING * vel;
  vel += a * dt;
  pos += vel * dt;
  render();
  if (Math.abs(pos - target) < 0.4 && Math.abs(vel) < 8) {
    pos = target; vel = 0; raf = 0;
    // 정착 — 최종 높이는 CSS가 맡는다: 닫힘 .stripe-top(4.5rem=딱 2줄, sliver 없음),
    // 열림 .open(100dvh, iOS 주소창 등 동적 뷰포트에 자동 대응). 인라인 px 스냅샷을
    // 지워 열던 순간의 innerHeight에 고정되지 않게 한다(아래가 안 덮이던 버그 해소).
    stripe.style.height = '';
    if (open && !dragging) setEntered(true);
    drawer.style.visibility = entered ? 'visible' : 'hidden';
    drawer.style.pointerEvents = (entered && !dragging) ? 'auto' : 'none';
    return;
  }
  raf = requestAnimationFrame(springStep);
}

function springTo(t) {
  target = t;
  open = (t === hOpen());
  if (!raf) {
    springStep._last = performance.now();
    raf = requestAnimationFrame(springStep);
  }
}

// 외부/탭/키보드용 — 정지 상태에서 스프링으로 열고 닫음.
export function toggleDrawer(force) {
  if (!stripe) return;
  var wantOpen = typeof force === 'boolean' ? force : !open;
  vel = 0;
  if (!wantOpen) setEntered(false); // 닫힐 땐 패널 즉시 숨기고 커튼만 올라감
  stripe.classList.toggle('open', wantOpen);
  springTo(wantOpen ? hOpen() : hClosed());
}

// ── 드래그 ──────────────────────────────────────────────────
var startY = 0, startPos = 0, moved = 0, downT = 0, startOpen = false;
var lastY = 0, lastT = 0, vTrack = 0;

function onDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  // 열림 상태: 패널(스크롤/링크) 위에서 시작하면 드래그 안 함 — 천만 잡는다
  if (open && e.target.closest('.drawer-panel')) return;
  dragging = true;
  setEntered(false); // 드래그 동안엔 커튼만 움직이고 패널은 숨김
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  vel = 0;
  // 정착 상태에선 CSS가 높이를 구동 중이므로 실제 렌더 높이로 pos 동기화(드래그 점프 방지)
  pos = stripe.getBoundingClientRect().height;
  startY = lastY = e.clientY;
  startPos = pos;
  startOpen = open;
  moved = 0;
  downT = lastT = performance.now();
  vTrack = 0;
  stripe.classList.add('grabbing');
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  // 드래그 동안만 전역 move/up 부착 (비-passive를 상시 두지 않아 스크롤 보호)
  document.addEventListener('pointermove', onMove, { passive: false });
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  render();
  e.preventDefault();
}

function onMove(e) {
  if (!dragging) return;
  var y = e.clientY;
  var dy = y - startY;
  var p = startPos + dy;
  var lo = hClosed(), hi = hOpen();
  // 경계 밖은 고무줄 저항
  if (p < lo) p = lo - (lo - p) * 0.3;
  else if (p > hi) p = hi + (p - hi) * 0.3;
  pos = p;
  moved = Math.max(moved, Math.abs(dy));
  var now = performance.now();
  var dt = now - lastT;
  if (dt > 0) {
    var v = (y - lastY) / dt * 1000; // px/s
    vTrack = vTrack * 0.6 + v * 0.4; // 약간 평활화
  }
  lastY = y; lastT = now;
  render();
  e.preventDefault();
}

function onUp() {
  if (!dragging) return;
  dragging = false;
  document.removeEventListener('pointermove', onMove, { passive: false });
  document.removeEventListener('pointerup', onUp);
  document.removeEventListener('pointercancel', onUp);
  stripe.classList.remove('grabbing');
  // 거의 안 움직였으면 탭 → 토글
  if (moved < 8 && performance.now() - downT < 300) {
    toggleDrawer(!open);
    return;
  }
  var pr = progress();
  var goOpen;
  if (vTrack > 600) goOpen = true;        // 아래로 플릭 → 열기
  else if (vTrack < -300) goOpen = false; // 위로 살짝만 플릭해도 → 닫기(민감)
  else if (startOpen) goOpen = pr > 0.9;  // 열림에서 시작: 살짝만 올려도 닫힘
  else goOpen = pr > 0.4;                 // 닫힘에서 시작: 평소 임계
  if (!goOpen) setEntered(false);         // 드래그-닫기도 패널 확실히 숨김
  vel = Math.max(-4000, Math.min(4000, vTrack)); // 플릭 속도 실어 찰지게
  stripe.classList.toggle('open', goOpen);
  springTo(goOpen ? hOpen() : hClosed());
}

export function initDrawer() {
  stripe = document.querySelector('.stripe-top');
  drawer = document.querySelector('.about-drawer');
  if (!stripe || !drawer) return;

  // JS가 시각을 전담 — CSS 트랜지션 끄고 실제 닫힘 높이 측정(줄 높이×2).
  measureBase();
  pos = target = BASE;
  stripe.style.transition = 'none';
  drawer.style.transition = 'none';
  drawer.style.opacity = '1'; // 레이어는 불투명 고정 — 패널이 자체 등장으로 드러남
  // 정착 높이는 CSS가 맡는다(닫힘 4.5rem / 열림 100dvh). 인라인 px는 드래그·스프링
  // '중'에만 쓰고 쉴 땐 비워 둔다 → 동적 뷰포트(iOS)에도 커튼이 항상 꽉 덮인다.
  stripe.style.height = '';
  drawer.style.visibility = 'hidden';
  drawer.style.pointerEvents = 'none';

  // 닫힘=띠, 열림=천 에서 드래그 시작 (move/up은 onDown이 드래그 동안만 부착)
  stripe.addEventListener('pointerdown', onDown);
  drawer.addEventListener('pointerdown', onDown);

  // 키보드 — 띠 포커스에서 Enter/Space 토글, ESC 닫기
  stripe.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrawer(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) toggleDrawer(false);
  });

  // 리사이즈 — 열린 상태면 새 높이에 맞춤
  window.addEventListener('resize', function () {
    if (dragging) return;
    if (open) { pos = target = hOpen(); }
    else { measureBase(); pos = target = BASE; }
    // 정착(raf=0) 상태면 인라인 높이를 안 건드린다 — CSS(4.5rem/100dvh)가 최종 높이라
    // iOS 주소창 등 동적 뷰포트에 자동 대응. 애니메이션 중이면 스프링이 새 target으로 이어감.
  });
}
