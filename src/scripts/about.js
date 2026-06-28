// About — 'Hyuk Jang' 버튼이 가운데(작품 표) 위에 About 오버레이를 덮는다.
// 다시 누르거나 ESC로 닫는다. (예전 커튼 서랍 → 가운데 오버레이로 이동)

function overlay() { return document.getElementById('aboutOverlay'); }
function toggleBtn() { return document.querySelector('.about-toggle'); }

// 닫힘 = 이름(About 열기), 열림 = 도메인(돌아가기). 두 상태가 다른 라벨.
var CLOSED_LABEL = 'Hyuk Jang';
var OPEN_LABEL = 'hyuk.xyz';

function setOpen(open) {
  var ov = overlay(), btn = toggleBtn();
  if (!ov) return;
  ov.hidden = !open;
  if (btn) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? OPEN_LABEL : CLOSED_LABEL;
    btn.classList.toggle('is-back', open); // 상태별 스타일 훅
  }
}

export function closeAbout() { setOpen(false); }

export function initAbout() {
  var btn = toggleBtn(), ov = overlay();
  if (!btn || !ov) return;
  btn.addEventListener('click', function () {
    setOpen(ov.hidden); // 닫혀 있으면(hidden) 연다
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !ov.hidden) setOpen(false);
  });
}
