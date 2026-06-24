// 좌측 메모 아코디언 — 블록 전체가 토글 단위, 한 번에 하나만.
import { isMobileView, anchorY, glideScrollBy, springOpen } from './util.js';

export function initMemos() {
  var leftEl = document.querySelector('.three-col .left');
  var threeCol = document.querySelector('.three-col');
  document.querySelectorAll('.memo').forEach(function (memo) {
    function toggle() {
      var wasOpen = memo.classList.contains('open');
      document.querySelectorAll('.memo.open').forEach(function (m) {
        m.classList.remove('open');
      });
      if (!wasOpen) {
        memo.classList.add('open');
        springOpen(memo.querySelector('.memo-body')); // 파동 높이 펼침
        if (!isMobileView()) {
          // 표와 같은 시점 이동 — 펼친 메모를 화면 상단 기준선(anchorY)으로
          glideScrollBy(leftEl, memo.getBoundingClientRect().top - anchorY(), 500);
        } else {
          // 모바일 — 표 행과 같은 어법: 펼친 메모가 보이게 부드럽게 스크롤
          memo.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
      // 데스크탑 — 메모가 열려 있으면 좌·중 폭을 40/40으로 넓히고(memo-wide),
      // 닫히면 원복. (포트폴리오 행을 열면 accordion.js가 이 클래스를 제거)
      if (threeCol) threeCol.classList.toggle('memo-wide', !isMobileView() && !wasOpen);
    }
    memo.addEventListener('click', toggle);
    // role="button" tabindex="0"라 키보드 활성화도 지원 (Enter/Space).
    // Space 기본 스크롤 방지. (drawer 핸들과 같은 어법)
    memo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}
