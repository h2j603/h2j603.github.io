// 텍스트 후처리 — @멘션 표시.
// (구 .ko/.en 섞어짜기 baseline 래핑은 단일 폰트(Heitz) 전환으로 폐기 —
//  한글·라틴이 같은 폰트라 baseline이 같아 보정이 필요 없다.)

// @로 시작하는 링크 텍스트 → mention 클래스 (인물 아이콘 + 갈색)
function markMentions() {
  var sel = '.intro a, .work-card .card-body a, .work-card .card-link';
  document.querySelectorAll(sel).forEach(function (a) {
    var t = (a.textContent || '').trim();
    if (t.charAt(0) === '@') a.classList.add('mention');
  });
}

export function initText() {
  markMentions();
}
