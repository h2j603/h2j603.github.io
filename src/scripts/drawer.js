// 커튼 = About 서랍.
// 띠(.stripe-top)를 클릭하면 커튼이 전면(100dvh)으로 내려오고, 그 위에
// 어바웃·연락처 패널(.about-drawer, 형제 레이어)이 인쇄된다.
// 닫기: 천(패널 밖) 클릭 / ✕ / ESC. 상태는 .open 클래스 하나.

var stripeTopEl = null;
var curtainTabEl = null;

function drawerOpen() {
  return stripeTopEl && stripeTopEl.classList.contains('open');
}

export function toggleDrawer(force) {
  if (!stripeTopEl) return;
  var open = typeof force === 'boolean' ? force : !drawerOpen();
  stripeTopEl.classList.toggle('open', open);
  // about 탭은 상시 노출 — 화살표만 방향 반전 (↓ 열기 / ↑ 닫기)
  if (curtainTabEl) curtainTabEl.textContent = open ? 'About ↑' : 'About ↓';
}

export function initDrawer() {
  stripeTopEl = document.querySelector('.stripe-top');
  curtainTabEl = document.querySelector('.curtain-tab');
  if (stripeTopEl) {
    // 닫힌 띠 클릭 = 열기. (열린 상태에선 서랍 레이어가 클릭을 받는다)
    stripeTopEl.addEventListener('click', function () { toggleDrawer(); });
  }
  if (curtainTabEl) {
    curtainTabEl.addEventListener('click', function () { toggleDrawer(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawerOpen()) toggleDrawer(false);
  });
  var drawerEl = document.querySelector('.about-drawer');
  if (drawerEl) {
    drawerEl.addEventListener('click', function (e) {
      // 패널 밖(천 위) 클릭 → 닫기
      if (!e.target.closest('.drawer-panel')) toggleDrawer(false);
    });
  }
}
