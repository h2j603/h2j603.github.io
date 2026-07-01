// 인덱스 페이지 인터랙션 진입점 — 모듈별 init을 순서대로.
// (구 index.astro 인라인 450줄 단일 클로저를 기능별 모듈로 분리)
import { initStripe, initDividers } from './stripe.js';
import { initDrawer, toggleDrawer } from './drawer.js';
import { initAbout } from './about.js';
import { initGuestbook } from './guestbook.js';
import { initMosaic, replayMosaic } from './mosaic.js';
import { initAccordion, accClose, applyHash } from './accordion.js';
import { initLang } from './lang.js';
import { initText } from './text.js';
import { initMemos } from './memos.js';
import { initLinkFilter } from './link-filter.js';
import { initClock } from './clock.js';
import { initWave } from './wave.js';
import { initPalette } from './palette.js';
import { initImageSkel } from './image-skel.js';
import { initIframeLoad } from './iframe-load.js';

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
  initAbout();      // 'Hyuk Jang' → 가운데 About 오버레이
  initGuestbook();  // 커튼 = 방명록 (구글 시트)
  initLang();
  initAccordion();
  initMemos();
  initLinkFilter();
  initClock();
  initText();
  initMosaic();
  initHomeLinks();
  initWave(); // 하이퍼링크 점멸 — 사인 파동(흐르는 위상)
  initPalette(); // 테마 팔레트 — 1분마다 순환
  initImageSkel(); // 작품 이미지 스켈레톤 — 로드 전 펄스 → 로드 시 크로스페이드
  initIframeLoad(); // web 미리보기 iframe — 근접 지연로드 + 오리진 preconnect

}
