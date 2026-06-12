// 인덱스 페이지 인터랙션 진입점 — 모듈별 init을 순서대로.
// (구 index.astro 인라인 450줄 단일 클로저를 기능별 모듈로 분리)
import { initStripe, initDividers } from './stripe.js';
import { initDrawer, toggleDrawer } from './drawer.js';
import { initMosaic, replayMosaic } from './mosaic.js';
import { initAccordion, accClose, applyHash } from './accordion.js';
import { initLang } from './lang.js';
import { initText } from './text.js';
import { initMemos } from './memos.js';
import { initLinkFilter } from './link-filter.js';
import { initClock } from './clock.js';

// hyuk.xyz 텍스트 클릭 → 홈(작품 선택 해제) + 모자이크 다시 떨어지기 시작.
// 홈 링크가 About 서랍 안에 있으므로 서랍도 닫는다.
// (drawer·accordion·mosaic 세 모듈에 걸친 배선이라 진입점에 둔다)
function initHomeLinks() {
  document.querySelectorAll('[data-home]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      toggleDrawer(false);
      accClose();
      if (location.hash) {
        history.pushState(null, '', location.pathname);
      }
      applyHash();
      replayMosaic();
    });
  });
}

export function initSite() {
  initStripe();
  initDividers();
  initDrawer();
  initLang();
  initAccordion();
  initMemos();
  initLinkFilter();
  initClock();
  initText();
  initMosaic();
  initHomeLinks();
}
