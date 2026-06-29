// 텍스트 후처리 — @멘션 표시.
// (구 .ko/.en 섞어짜기 baseline 래핑은 단일 폰트(Heitz) 전환으로 폐기 —
//  한글·라틴이 같은 폰트라 baseline이 같아 보정이 필요 없다.)

// 인물 링크 표기 — Are.na 본문에 [@이름](url)로 적으면 @로 식별해 갈색 pill
// (.mention)로 구분하고, 표시 텍스트에선 선두 @를 떼 '이름'만 남긴다. 일반
// 링크는 보라 pill 그대로 — 색만 다르고 아이콘은 없다.
function markMentions() {
  var sel = '.intro a, .about-overlay a, .work-card .card-body a, .work-card .card-link';
  document.querySelectorAll(sel).forEach(function (a) {
    var t = (a.textContent || '').trim();
    if (t.charAt(0) !== '@') return;
    a.classList.add('mention');
    a.textContent = t.replace(/^@\s*/, ''); // 표시용 @ 제거 (이름만)
  });
}

export function initText() {
  markMentions();
}
