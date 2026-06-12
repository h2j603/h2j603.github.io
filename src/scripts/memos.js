// 좌측 메모 아코디언 — 블록 전체가 토글 단위, 한 번에 하나만.
import { isMobileView, anchorY, glideScrollBy } from './util.js';

export function initMemos() {
  var leftEl = document.querySelector('.three-col .left');
  document.querySelectorAll('.memo').forEach(function (memo) {
    memo.addEventListener('click', function () {
      var wasOpen = memo.classList.contains('open');
      document.querySelectorAll('.memo.open').forEach(function (m) {
        m.classList.remove('open');
      });
      if (!wasOpen) {
        memo.classList.add('open');
        if (!isMobileView()) {
          // 표와 같은 시점 이동 — 펼친 메모를 화면 상단 기준선(anchorY)으로
          glideScrollBy(leftEl, memo.getBoundingClientRect().top - anchorY(), 500);
        } else {
          // 모바일 — 표 행과 같은 어법: 펼친 메모가 보이게 부드럽게 스크롤
          memo.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    });
  });
}
